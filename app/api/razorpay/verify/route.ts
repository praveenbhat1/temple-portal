import { NextResponse } from "next/server";
import crypto from "crypto";
import { adminDb, FieldValue, isAdminConfigured } from "@/lib/firebaseAdmin";

/**
 * Verify a completed Razorpay payment and record the booking.
 *
 * The browser cannot be trusted to say "this payment succeeded", so the
 * booking is written here, server-side, only after the HMAC signature checks
 * out. Firestore rules deny client writes to `bookings` entirely; the Admin
 * SDK used here bypasses them.
 */

type SevaLine = { sevaId: string; name: string; price: number };

type VerifyBody = {
  razorpay_order_id?: string;
  razorpay_payment_id?: string;
  razorpay_signature?: string;
  bookingId?: string;
  userName?: string;
  phone?: string;
  email?: string;
  sevas?: SevaLine[];
  eventDate?: string;
};

function todayISO() {
  return new Date().toISOString().split("T")[0];
}

export async function POST(req: Request) {
  const key_secret = process.env.RAZORPAY_KEY_SECRET;
  if (!key_secret) {
    return NextResponse.json(
      { error: "Payment system not configured", reason: "missing_keys" },
      { status: 500 }
    );
  }

  let body: VerifyBody;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const {
    razorpay_order_id,
    razorpay_payment_id,
    razorpay_signature,
    bookingId,
    userName,
    phone,
    sevas,
    eventDate,
  } = body;

  if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
    return NextResponse.json(
      { error: "Missing payment identifiers", reason: "incomplete" },
      { status: 400 }
    );
  }

  // ── The signature check: HMAC-SHA256 of "order_id|payment_id" ──
  const expected = crypto
    .createHmac("sha256", key_secret)
    .update(`${razorpay_order_id}|${razorpay_payment_id}`)
    .digest("hex");

  const provided = Buffer.from(razorpay_signature, "utf8");
  const computed = Buffer.from(expected, "utf8");
  const signatureValid =
    provided.length === computed.length && crypto.timingSafeEqual(provided, computed);

  if (!signatureValid) {
    console.error("Razorpay signature mismatch", { razorpay_order_id, razorpay_payment_id });
    return NextResponse.json(
      { error: "Payment could not be verified.", reason: "bad_signature" },
      { status: 400 }
    );
  }

  if (!bookingId || !userName || !phone || !Array.isArray(sevas) || sevas.length === 0) {
    return NextResponse.json(
      { error: "Booking details are incomplete.", reason: "incomplete_booking" },
      { status: 400 }
    );
  }

  if (!isAdminConfigured()) {
    // The payment is genuine but we cannot persist it. Say so loudly rather
    // than pretending the booking succeeded.
    console.error("Verified payment but FIREBASE_SERVICE_ACCOUNT is not configured", {
      bookingId,
      razorpay_payment_id,
    });
    return NextResponse.json(
      {
        error: "Payment verified but the booking could not be saved.",
        reason: "admin_not_configured",
        detail: "FIREBASE_SERVICE_ACCOUNT is not set on the server.",
        razorpayPaymentId: razorpay_payment_id,
      },
      { status: 500 }
    );
  }

  // Trust our own seva prices, not the numbers the browser sent.
  const totalAmount = sevas.reduce((sum, s) => sum + Number(s.price || 0), 0);

  try {
    const db = adminDb();

    // Idempotent on payment id, so a retry or a racing webhook cannot create
    // a duplicate booking for the same payment.
    const existing = await db
      .collection("bookings")
      .where("razorpayPaymentId", "==", razorpay_payment_id)
      .limit(1)
      .get();

    if (!existing.empty) {
      const doc = existing.docs[0];
      return NextResponse.json({ ok: true, id: doc.id, ...doc.data(), duplicate: true });
    }

    const booking = {
      bookingId,
      userName,
      phone,
      email: body.email?.trim() || "",
      sevas,
      totalAmount,
      bookingDate: todayISO(),
      eventDate: eventDate || todayISO(),
      paymentStatus: "success" as const,
      razorpayOrderId: razorpay_order_id,
      razorpayPaymentId: razorpay_payment_id,
      source: "checkout" as const,
      createdAt: FieldValue.serverTimestamp(),
    };

    const ref = await db.collection("bookings").add(booking);

    // Bump per-seva counters for sevas that live in Firestore.
    await incrementSevaCounts(sevas.map((s) => s.sevaId));

    return NextResponse.json({ ok: true, id: ref.id, ...booking, createdAt: null });
  } catch (err) {
    console.error("Failed to save verified booking:", err);
    return NextResponse.json(
      {
        error: "Payment verified but the booking could not be saved.",
        reason: "write_failed",
        detail: (err as Error).message,
        razorpayPaymentId: razorpay_payment_id,
      },
      { status: 500 }
    );
  }
}

/** Increment currentBookings for any seva ids that exist in Firestore. */
async function incrementSevaCounts(sevaIds: string[]) {
  const db = adminDb();
  await Promise.all(
    sevaIds.map(async (id) => {
      try {
        const ref = db.collection("sevas").doc(id);
        const snap = await ref.get();
        if (snap.exists) await ref.update({ currentBookings: FieldValue.increment(1) });
      } catch (err) {
        // A counter is not worth failing a confirmed booking over.
        console.error(`Could not increment booking count for seva ${id}:`, err);
      }
    })
  );
}
