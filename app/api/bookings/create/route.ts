import { NextResponse } from "next/server";
import QRCode from "qrcode";
import { adminDb, FieldValue, isAdminConfigured } from "@/lib/firebaseAdmin";
import { generateBookingId } from "@/lib/bookingId";
import { buildUpiUri, isUpiConfigured } from "@/lib/upi";
import { ALL_SEVAS } from "@/lib/sevaData";
import { isValidIndianPhone, normalizePhone } from "@/lib/utils";

/**
 * Create a *pending* booking for the manual UPI flow and hand back the UPI
 * intent link the devotee should pay with.
 *
 * Nothing here proves a payment happened — it cannot, because plain UPI has no
 * callback. This route only records the intent to pay. An admin confirms the
 * money actually arrived via /api/bookings/confirm, and only that flips the
 * booking to `success`.
 *
 * The Razorpay routes are untouched and still the path to use once a gateway is
 * back in play; see NEXT_PUBLIC_PAYMENT_MODE.
 */

type SevaLine = { sevaId: string; name: string; price: number };

type CreateBody = {
  userName?: string;
  phone?: string;
  email?: string;
  sevaIds?: string[];
  eventDate?: string;
};

const MAX_SEVAS_PER_BOOKING = 20;

function todayISO() {
  return new Date().toISOString().split("T")[0];
}

export async function POST(req: Request) {
  if (!isUpiConfigured()) {
    return NextResponse.json(
      {
        error: "UPI payment is not set up for this temple yet.",
        reason: "upi_not_configured",
        detail: "TEMPLE_UPI_ID is not set on the server.",
      },
      { status: 503 }
    );
  }

  if (!isAdminConfigured()) {
    return NextResponse.json(
      {
        error: "Bookings cannot be saved right now.",
        reason: "admin_not_configured",
        detail: "FIREBASE_SERVICE_ACCOUNT is not set on the server.",
      },
      { status: 503 }
    );
  }

  let body: CreateBody;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body", reason: "bad_json" }, { status: 400 });
  }

  const userName = (body.userName || "").trim();
  const eventDate = (body.eventDate || "").trim();
  const sevaIds = Array.isArray(body.sevaIds) ? body.sevaIds : [];

  if (!userName || !body.phone || !eventDate || sevaIds.length === 0) {
    return NextResponse.json(
      { error: "Please fill in your name, mobile number, date and at least one seva.", reason: "incomplete" },
      { status: 400 }
    );
  }

  if (sevaIds.length > MAX_SEVAS_PER_BOOKING) {
    return NextResponse.json(
      { error: "Too many sevas in one booking.", reason: "too_many_sevas" },
      { status: 400 }
    );
  }

  if (!isValidIndianPhone(body.phone)) {
    return NextResponse.json(
      { error: "Please enter a valid 10-digit mobile number.", reason: "bad_phone" },
      { status: 400 }
    );
  }

  if (!/^\d{4}-\d{2}-\d{2}$/.test(eventDate) || eventDate < todayISO()) {
    return NextResponse.json(
      { error: "Please choose a date that is not in the past.", reason: "bad_date" },
      { status: 400 }
    );
  }

  try {
    const db = adminDb();

    // Prices are resolved here, never taken from the browser — the amount in
    // the UPI link is what the devotee actually gets charged.
    const resolved = await resolveSevas(db, sevaIds);
    if ("error" in resolved) {
      return NextResponse.json({ error: resolved.error, reason: resolved.reason }, { status: 400 });
    }

    const sevas = resolved.sevas;
    const totalAmount = sevas.reduce((sum, s) => sum + s.price, 0);

    if (totalAmount <= 0) {
      return NextResponse.json(
        { error: "This offering has no payable amount.", reason: "zero_amount" },
        { status: 400 }
      );
    }

    const bookingId = generateBookingId();
    const upiUri = buildUpiUri({ amount: totalAmount, bookingId });

    const booking = {
      bookingId,
      userName,
      phone: normalizePhone(body.phone),
      email: body.email?.trim() || "",
      sevas,
      totalAmount,
      bookingDate: todayISO(),
      eventDate,
      paymentStatus: "pending" as const,
      paymentMethod: "upi-manual" as const,
      source: "upi-intent" as const,
      createdAt: FieldValue.serverTimestamp(),
    };

    const ref = await db.collection("bookings").add(booking);

    // Rendered server-side so the QR library stays out of the client bundle.
    const qrDataUrl = await QRCode.toDataURL(upiUri, { margin: 1, width: 320 });

    return NextResponse.json({
      ok: true,
      id: ref.id,
      bookingId,
      totalAmount,
      sevas,
      upiUri,
      qrDataUrl,
    });
  } catch (err) {
    console.error("Failed to create pending booking:", err);
    return NextResponse.json(
      { error: "Could not start the booking. Please try again.", reason: "write_failed" },
      { status: 500 }
    );
  }
}

type ResolveResult = { sevas: SevaLine[] } | { error: string; reason: string };

/**
 * Turn the ids the browser sent into priced seva lines using the temple's own
 * data: the Firestore `sevas` collection first, then the static board in
 * lib/sevaData.ts. Also rejects anything closed or fully booked, so a stale tab
 * cannot book a seva that has since filled up.
 */
async function resolveSevas(
  db: FirebaseFirestore.Firestore,
  sevaIds: string[]
): Promise<ResolveResult> {
  const unique = Array.from(new Set(sevaIds));
  const lines: SevaLine[] = [];

  for (const id of unique) {
    const snap = await db.collection("sevas").doc(id).get();

    if (snap.exists) {
      const data = snap.data() as {
        name?: string;
        price?: number;
        isActive?: boolean;
        maxBookings?: number;
        currentBookings?: number;
      };

      if (data.isActive === false) {
        return { error: `"${data.name || id}" is not available right now.`, reason: "seva_inactive" };
      }

      if (data.maxBookings && data.maxBookings > 0 && (data.currentBookings || 0) >= data.maxBookings) {
        return { error: `"${data.name || id}" is fully booked.`, reason: "seva_full" };
      }

      lines.push({ sevaId: id, name: data.name || id, price: Number(data.price) || 0 });
      continue;
    }

    const staticSeva = ALL_SEVAS.find((s) => s.id === id);
    if (!staticSeva) {
      return { error: "One of the selected sevas is no longer available.", reason: "unknown_seva" };
    }

    lines.push({ sevaId: id, name: staticSeva.nameEn, price: staticSeva.price });
  }

  return { sevas: lines };
}
