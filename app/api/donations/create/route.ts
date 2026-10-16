import { NextResponse } from "next/server";
import { adminDb, FieldValue, isAdminConfigured } from "@/lib/firebaseAdmin";
import { generateDonationId } from "@/lib/bookingId";
import { createOrder, isRazorpayConfigured, razorpayKeyId, RazorpayError } from "@/lib/razorpay";
import { DONATION_PURPOSES, MAX_DONATION, MIN_DONATION, type DonationPurpose } from "@/lib/donations";
import { isValidIndianPhone, normalizePhone } from "@/lib/utils";
import { check, clientIp, tooManyRequests } from "@/lib/rateLimit";

/**
 * Start a donation: record it as `pending` and create the Razorpay order.
 *
 * The amount is the donor's choice, so unlike a seva it does come from the
 * browser — but it is validated here, fixed onto the order, and checked again
 * against the captured amount by the webhook.
 */

const RATE_LIMIT = 6;
const RATE_WINDOW_MS = 10 * 60 * 1000;

type Body = { donorName?: unknown; phone?: unknown; email?: unknown; amount?: unknown; purpose?: unknown };

export async function POST(req: Request) {
  const limit = await check(`donation-create:${clientIp(req)}`, RATE_LIMIT, RATE_WINDOW_MS);
  if (!limit.ok) {
    return tooManyRequests(limit, "Too many attempts from this device. Please wait a few minutes and try again.");
  }

  if (!isRazorpayConfigured() || !isAdminConfigured()) {
    return NextResponse.json(
      { error: "Online donations are not switched on yet.", reason: "payments_not_configured" },
      { status: 503 }
    );
  }

  let body: Body;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body", reason: "bad_json" }, { status: 400 });
  }

  const donorName = (typeof body.donorName === "string" ? body.donorName : "").trim().slice(0, 80);
  const email = (typeof body.email === "string" ? body.email : "").trim().slice(0, 120);
  const phone = typeof body.phone === "string" ? body.phone : "";
  const amount = Number(body.amount);
  const purpose: DonationPurpose = DONATION_PURPOSES.includes(body.purpose as DonationPurpose)
    ? (body.purpose as DonationPurpose)
    : "General";

  if (!donorName) {
    return NextResponse.json({ error: "Please enter your name.", reason: "incomplete" }, { status: 400 });
  }
  if (!isValidIndianPhone(phone)) {
    return NextResponse.json({ error: "Please enter a valid 10-digit mobile number.", reason: "bad_phone" }, { status: 400 });
  }
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) {
    return NextResponse.json({ error: "That email address doesn't look right.", reason: "bad_email" }, { status: 400 });
  }
  // Whole rupees only: a fractional amount is a typo, and it keeps the
  // paise arithmetic exact.
  if (!Number.isInteger(amount) || amount < MIN_DONATION || amount > MAX_DONATION) {
    return NextResponse.json(
      {
        error: `Please enter an amount between ₹${MIN_DONATION} and ₹${MAX_DONATION.toLocaleString("en-IN")}.`,
        reason: "bad_amount",
      },
      { status: 400 }
    );
  }

  try {
    const db = adminDb();
    const donationId = generateDonationId();
    const ref = db.collection("donations").doc();
    const order = await createOrder({
      amount,
      bookingId: donationId,
      // `kind` is how the shared webhook tells a donation from a seva booking.
      notes: { kind: "donation", donationId, donationDocId: ref.id, purpose },
    });

    await ref.set({
      donationId,
      donorName,
      phone: normalizePhone(phone),
      email,
      amount,
      purpose,
      paymentStatus: "pending",
      razorpayOrderId: order.id,
      createdAt: FieldValue.serverTimestamp(),
    });

    return NextResponse.json({
      ok: true,
      id: ref.id,
      donationId,
      amount,
      purpose,
      razorpayOrderId: order.id,
      razorpayKeyId: razorpayKeyId(),
    });
  } catch (err) {
    if (err instanceof RazorpayError) {
      console.error("Razorpay order creation failed (donation):", err.statusCode, err.message);
      return NextResponse.json(
        { error: "Could not start the payment. Please try again in a moment.", reason: "razorpay_error" },
        { status: 502 }
      );
    }
    console.error("Failed to create donation:", err);
    return NextResponse.json({ error: "Could not start the donation. Please try again.", reason: "write_failed" }, { status: 500 });
  }
}
