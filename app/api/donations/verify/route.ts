import { NextResponse } from "next/server";
import { isAdminConfigured } from "@/lib/firebaseAdmin";
import { verifyCheckoutSignature } from "@/lib/razorpay";
import { settleDonation } from "@/lib/donations";
import { check, clientIp, tooManyRequests } from "@/lib/rateLimit";

/**
 * Confirm a donation from the Razorpay Checkout handler. Same trust model as
 * /api/razorpay/verify: only Razorpay's signature, for the order stored on this
 * donation, marks it paid.
 */

const RATE_LIMIT = 20;
const RATE_WINDOW_MS = 10 * 60 * 1000;

export async function POST(req: Request) {
  const limit = await check(`donation-verify:${clientIp(req)}`, RATE_LIMIT, RATE_WINDOW_MS);
  if (!limit.ok) return tooManyRequests(limit, "Too many attempts. Please wait a few minutes and try again.");

  if (!isAdminConfigured()) {
    return NextResponse.json({ error: "Donations cannot be saved right now.", reason: "admin_not_configured" }, { status: 503 });
  }

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body", reason: "bad_json" }, { status: 400 });
  }

  const str = (v: unknown, max = 100) => (typeof v === "string" ? v.trim().slice(0, max) : "");
  const id = str(body.id, 64);
  const orderId = str(body.razorpay_order_id);
  const paymentId = str(body.razorpay_payment_id);
  const signature = str(body.razorpay_signature, 200);

  if (!id || !orderId || !paymentId || !signature) {
    return NextResponse.json({ error: "Missing payment details.", reason: "incomplete" }, { status: 400 });
  }
  if (!verifyCheckoutSignature(orderId, paymentId, signature)) {
    console.error("Razorpay signature mismatch (donation)", { id, orderId, paymentId });
    return NextResponse.json({ error: "This payment could not be verified.", reason: "bad_signature" }, { status: 400 });
  }

  try {
    const result = await settleDonation({ id, orderId, paymentId, source: "razorpay" });
    if (result.ok || result.reason === "already_settled") {
      return NextResponse.json({ ok: true, razorpayPaymentId: paymentId });
    }
    return NextResponse.json({ error: "This payment does not match the donation.", reason: result.reason }, { status: 400 });
  } catch (err) {
    console.error("Failed to settle a verified donation:", err);
    return NextResponse.json(
      { error: "Your payment went through, but the donation could not be recorded yet.", reason: "write_failed" },
      { status: 500 }
    );
  }
}
