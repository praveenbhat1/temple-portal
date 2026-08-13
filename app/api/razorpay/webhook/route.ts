import { NextResponse } from "next/server";
import crypto from "crypto";
import { adminDb, FieldValue, isAdminConfigured } from "@/lib/firebaseAdmin";

/**
 * Razorpay webhook receiver — the recovery path for payments the browser never
 * reported back (tab closed, network dropped, phone died mid-UPI).
 *
 * Set this up in Razorpay Dashboard → Settings → Webhooks:
 *   URL:    https://<your-domain>/api/razorpay/webhook
 *   Events: payment.captured, payment.failed
 *   Secret: must match RAZORPAY_WEBHOOK_SECRET
 *
 * Without it, a payment whose browser callback never fires is money taken with
 * no record in /admin/bookings.
 */

type RazorpayWebhookPayment = {
  id: string;
  order_id: string;
  amount: number;
  email?: string;
  contact?: string;
  notes?: Record<string, string>;
};

export async function POST(req: Request) {
  const secret = process.env.RAZORPAY_WEBHOOK_SECRET;
  if (!secret) {
    console.error("Razorpay webhook received but RAZORPAY_WEBHOOK_SECRET is not set");
    return NextResponse.json({ error: "Webhook not configured" }, { status: 500 });
  }

  // The signature is over the exact raw bytes, so read the body as text.
  const raw = await req.text();
  const signature = req.headers.get("x-razorpay-signature") || "";

  const expected = crypto.createHmac("sha256", secret).update(raw).digest("hex");
  const a = Buffer.from(signature, "utf8");
  const b = Buffer.from(expected, "utf8");

  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) {
    console.error("Razorpay webhook signature mismatch");
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  let event: { event?: string; payload?: { payment?: { entity?: RazorpayWebhookPayment } } };
  try {
    event = JSON.parse(raw);
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const payment = event.payload?.payment?.entity;
  if (!payment?.id) {
    // Acknowledge anything we don't handle so Razorpay stops retrying.
    return NextResponse.json({ ok: true, ignored: event.event ?? "unknown" });
  }

  if (!isAdminConfigured()) {
    console.error("Razorpay webhook could not be processed — FIREBASE_SERVICE_ACCOUNT unset", {
      paymentId: payment.id,
    });
    return NextResponse.json({ error: "Server not configured" }, { status: 500 });
  }

  const db = adminDb();

  try {
    const existing = await db
      .collection("bookings")
      .where("razorpayPaymentId", "==", payment.id)
      .limit(1)
      .get();

    if (event.event === "payment.failed") {
      if (!existing.empty) {
        await existing.docs[0].ref.update({ paymentStatus: "failed" });
      }
      return NextResponse.json({ ok: true, handled: "payment.failed" });
    }

    if (event.event !== "payment.captured") {
      return NextResponse.json({ ok: true, ignored: event.event });
    }

    if (!existing.empty) {
      // The normal, happy case: /verify already wrote it.
      return NextResponse.json({ ok: true, handled: "already_recorded" });
    }

    // Orphaned payment — reconstruct what we can so the temple has a record.
    await db.collection("bookings").add({
      bookingId: payment.notes?.bookingId || `SV-WH${payment.id.slice(-6).toUpperCase()}`,
      userName: payment.notes?.userName || "Recovered from webhook",
      phone: payment.contact || payment.notes?.phone || "",
      email: payment.email || "",
      sevas: [],
      totalAmount: payment.amount / 100,
      bookingDate: new Date().toISOString().split("T")[0],
      eventDate: payment.notes?.eventDate || new Date().toISOString().split("T")[0],
      paymentStatus: "success" as const,
      razorpayOrderId: payment.order_id,
      razorpayPaymentId: payment.id,
      source: "webhook_recovery" as const,
      needsReview: true,
      createdAt: FieldValue.serverTimestamp(),
    });

    console.warn("Recovered an orphaned Razorpay payment via webhook", { paymentId: payment.id });
    return NextResponse.json({ ok: true, handled: "recovered" });
  } catch (err) {
    console.error("Razorpay webhook processing failed:", err);
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
