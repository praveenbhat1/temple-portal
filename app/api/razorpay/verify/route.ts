import { NextResponse } from "next/server";
import { adminDb, isAdminConfigured } from "@/lib/firebaseAdmin";
import { verifyCheckoutSignature } from "@/lib/razorpay";
import { settleBooking } from "@/lib/settleBooking";
import { check, clientIp, tooManyRequests } from "@/lib/rateLimit";

/**
 * Confirm a booking from the Razorpay Checkout handler.
 *
 * The browser cannot be trusted to say "this payment succeeded", so what it
 * sends is Razorpay's signature over order_id|payment_id. Only a valid
 * signature for the order stored on THIS booking settles it — a signature for
 * some other, cheaper order proves nothing about this one.
 *
 * The webhook settles the same booking if this call never arrives (tab closed,
 * network dropped). Both go through settleBooking, so whichever is second is a
 * harmless no-op.
 */

const RATE_LIMIT = 20;
const RATE_WINDOW_MS = 10 * 60 * 1000;

type VerifyBody = {
  id?: string;
  razorpay_order_id?: string;
  razorpay_payment_id?: string;
  razorpay_signature?: string;
};

export async function POST(req: Request) {
  const limit = await check(`razorpay-verify:${clientIp(req)}`, RATE_LIMIT, RATE_WINDOW_MS);
  if (!limit.ok) {
    return tooManyRequests(limit, "Too many attempts. Please wait a few minutes and try again.");
  }

  if (!isAdminConfigured()) {
    return NextResponse.json(
      { error: "Bookings cannot be saved right now.", reason: "admin_not_configured" },
      { status: 503 }
    );
  }

  let body: VerifyBody;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body", reason: "bad_json" }, { status: 400 });
  }

  const id = typeof body.id === "string" ? body.id.trim().slice(0, 64) : "";
  const orderId = typeof body.razorpay_order_id === "string" ? body.razorpay_order_id : "";
  const paymentId = typeof body.razorpay_payment_id === "string" ? body.razorpay_payment_id : "";
  const signature = typeof body.razorpay_signature === "string" ? body.razorpay_signature : "";

  if (!id || !orderId || !paymentId || !signature) {
    return NextResponse.json({ error: "Missing payment details.", reason: "incomplete" }, { status: 400 });
  }

  if (!verifyCheckoutSignature(orderId, paymentId, signature)) {
    console.error("Razorpay signature mismatch", { id, orderId, paymentId });
    return NextResponse.json(
      { error: "This payment could not be verified.", reason: "bad_signature" },
      { status: 400 }
    );
  }

  try {
    const snap = await adminDb().collection("bookings").doc(id).get();
    const data = snap.data() as { razorpayOrderId?: string; paymentStatus?: string } | undefined;

    if (!snap.exists || data?.razorpayOrderId !== orderId) {
      console.error("Verified payment does not belong to this booking", { id, orderId, paymentId });
      return NextResponse.json(
        { error: "This payment does not match the booking.", reason: "order_mismatch" },
        { status: 400 }
      );
    }

    const result = await settleBooking({
      id,
      action: "confirm",
      by: { kind: "auto", source: "razorpay" },
      fields: { razorpayPaymentId: paymentId },
    });

    // The webhook got there first — the booking is paid, which is all the
    // devotee needs to hear.
    if (!result.ok && result.reason === "already_settled") {
      return NextResponse.json({ ok: true, paymentStatus: data.paymentStatus, duplicate: true });
    }

    if (!result.ok) {
      return NextResponse.json({ error: result.message, reason: result.reason }, { status: 500 });
    }

    return NextResponse.json({ ok: true, paymentStatus: result.status, razorpayPaymentId: paymentId });
  } catch (err) {
    console.error("Failed to settle a verified payment:", err);
    return NextResponse.json(
      {
        error: "Your payment went through, but the booking could not be updated yet.",
        reason: "write_failed",
      },
      { status: 500 }
    );
  }
}
