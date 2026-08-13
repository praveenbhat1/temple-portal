import { NextResponse } from "next/server";
import Razorpay from "razorpay";
import { generateBookingId } from "@/lib/bookingId";

/** Razorpay rejects anything under ₹1, and we cap to catch tampering. */
const MIN_RUPEES = 1;
const MAX_RUPEES = 500000;

type RazorpayApiError = {
  statusCode?: number;
  error?: { code?: string; description?: string; reason?: string };
};

export async function POST(req: Request) {
  const key_id = process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID;
  const key_secret = process.env.RAZORPAY_KEY_SECRET;

  if (!key_id || !key_secret) {
    console.error("Razorpay keys missing in environment variables");
    return NextResponse.json(
      {
        error: "Payment system not configured",
        reason: "missing_keys",
        detail: "RAZORPAY_KEY_SECRET / NEXT_PUBLIC_RAZORPAY_KEY_ID are not set on the server.",
      },
      { status: 500 }
    );
  }

  let body: { amount?: unknown; currency?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body", reason: "bad_json" }, { status: 400 });
  }

  const amount = Number(body.amount);
  const currency = typeof body.currency === "string" ? body.currency : "INR";
  const bookingId = generateBookingId();

  if (!Number.isFinite(amount) || amount < MIN_RUPEES || amount > MAX_RUPEES) {
    return NextResponse.json(
      {
        error: `Amount must be between ₹${MIN_RUPEES} and ₹${MAX_RUPEES.toLocaleString("en-IN")}.`,
        reason: "bad_amount",
      },
      { status: 400 }
    );
  }

  try {
    const razorpay = new Razorpay({ key_id, key_secret });

    const order = await razorpay.orders.create({
      amount: Math.round(amount * 100), // paise
      currency,
      receipt: bookingId,
    });

    // bookingId travels back so the client can echo it to /verify.
    return NextResponse.json({ ...order, bookingId });
  } catch (err) {
    const apiErr = err as RazorpayApiError;
    const description = apiErr?.error?.description || (err as Error).message || "Unknown error";
    const statusCode = apiErr?.statusCode;

    // A 401 here means the key pair itself is rejected by Razorpay — the single
    // most common cause of "checkout never opens", and previously invisible
    // because every failure collapsed into one generic message.
    const isAuthFailure = statusCode === 401;

    console.error("Razorpay order creation failed:", {
      statusCode,
      code: apiErr?.error?.code,
      description,
      keyIdPrefix: key_id.slice(0, 12),
    });

    return NextResponse.json(
      {
        error: isAuthFailure
          ? "Razorpay rejected the temple's API credentials."
          : "Could not create the payment order.",
        reason: isAuthFailure ? "razorpay_auth_failed" : "razorpay_error",
        detail: description,
        hint: isAuthFailure
          ? "Regenerate the key pair in Razorpay Dashboard → Account & Settings → API Keys, " +
            "then update NEXT_PUBLIC_RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET."
          : undefined,
      },
      { status: isAuthFailure ? 502 : 500 }
    );
  }
}
