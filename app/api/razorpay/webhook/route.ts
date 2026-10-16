import { NextResponse } from "next/server";
import { adminDb, isAdminConfigured } from "@/lib/firebaseAdmin";
import { verifyWebhookSignature } from "@/lib/razorpay";
import { settleBooking } from "@/lib/settleBooking";
import { settleDonation } from "@/lib/donations";

/**
 * Razorpay webhook — the recovery path for payments the browser never
 * reported back (tab closed, network dropped, phone died inside the UPI app).
 *
 * Set this up in Razorpay Dashboard → Account & Settings → Webhooks:
 *   URL:    https://<your-domain>/api/razorpay/webhook
 *   Events: payment.captured
 *   Secret: the same value as RAZORPAY_WEBHOOK_SECRET
 *
 * Without it, a devotee who pays and closes the tab before checkout returns
 * has paid for a booking that stays `pending` until someone notices.
 *
 * payment.failed is deliberately not acted on: Razorpay lets the devotee retry
 * on the same order, so one failed attempt does not mean the booking failed.
 */

type WebhookPayment = {
  id: string;
  order_id?: string;
  amount: number;
  notes?: Record<string, string>;
};

export async function POST(req: Request) {
  if (!process.env.RAZORPAY_WEBHOOK_SECRET?.trim()) {
    console.error("Razorpay webhook received but RAZORPAY_WEBHOOK_SECRET is not set");
    return NextResponse.json({ error: "Webhook not configured" }, { status: 500 });
  }

  // The signature is over the exact raw bytes, so read the body as text.
  const raw = await req.text();
  if (!verifyWebhookSignature(raw, req.headers.get("x-razorpay-signature") || "")) {
    console.error("Razorpay webhook signature mismatch");
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  let event: { event?: string; payload?: { payment?: { entity?: WebhookPayment } } };
  try {
    event = JSON.parse(raw);
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const payment = event.payload?.payment?.entity;
  // Acknowledge anything we don't act on, or Razorpay keeps retrying it.
  if (event.event !== "payment.captured" || !payment?.id || !payment.order_id) {
    return NextResponse.json({ ok: true, ignored: event.event ?? "unknown" });
  }

  if (!isAdminConfigured()) {
    console.error("Razorpay webhook could not be processed — FIREBASE_SERVICE_ACCOUNT unset", {
      paymentId: payment.id,
    });
    // A 5xx makes Razorpay retry later, by which time the server may be fixed.
    return NextResponse.json({ error: "Server not configured" }, { status: 500 });
  }

  // Donations share this webhook; their order notes say so.
  if (payment.notes?.kind === "donation") {
    const id = payment.notes.donationDocId || "";
    try {
      const result = id
        ? await settleDonation({
            id,
            orderId: payment.order_id,
            paymentId: payment.id,
            amountPaise: payment.amount,
            source: "razorpay-webhook",
          })
        : { ok: false, reason: "not_found" as const };
      if (!result.ok && result.reason !== "already_settled") {
        console.error("Captured donation could not be matched — check the Razorpay dashboard", {
          paymentId: payment.id,
          orderId: payment.order_id,
          reason: result.reason,
        });
      }
      return NextResponse.json({ ok: true, handled: result.ok ? "donation_settled" : result.reason });
    } catch (err) {
      console.error("Razorpay webhook (donation) failed:", err);
      return NextResponse.json({ error: (err as Error).message }, { status: 500 });
    }
  }

  try {
    const db = adminDb();

    // notes.bookingDocId is set when the order is created; the query is the
    // fallback for an order whose notes were somehow lost.
    let id = payment.notes?.bookingDocId || "";
    let data: { razorpayOrderId?: string; totalAmount?: number } | undefined;

    if (id) data = (await db.collection("bookings").doc(id).get()).data();
    if (!data || data.razorpayOrderId !== payment.order_id) {
      const found = await db
        .collection("bookings")
        .where("razorpayOrderId", "==", payment.order_id)
        .limit(1)
        .get();
      if (found.empty) {
        console.error("Captured payment matches no booking — check the Razorpay dashboard", {
          paymentId: payment.id,
          orderId: payment.order_id,
        });
        return NextResponse.json({ ok: true, handled: "no_matching_booking" });
      }
      id = found.docs[0].id;
      data = found.docs[0].data();
    }

    // The order amount was fixed server-side, so a mismatch should be
    // impossible. If it ever happens, leave it for a human.
    if (Math.round((data.totalAmount || 0) * 100) !== payment.amount) {
      console.error("Captured amount differs from the booking total", {
        id,
        paymentId: payment.id,
        paid: payment.amount,
        expected: data.totalAmount,
      });
      return NextResponse.json({ ok: true, handled: "amount_mismatch" });
    }

    const result = await settleBooking({
      id,
      action: "confirm",
      by: { kind: "auto", source: "razorpay-webhook" },
      fields: { razorpayPaymentId: payment.id },
    });

    if (!result.ok && result.reason !== "already_settled") {
      return NextResponse.json({ error: result.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true, handled: result.ok ? "settled" : "already_settled" });
  } catch (err) {
    console.error("Razorpay webhook processing failed:", err);
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
