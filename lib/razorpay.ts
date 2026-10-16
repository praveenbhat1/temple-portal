/**
 * Razorpay, server side only — the key secret never leaves this module.
 *
 * Seva payments go through Razorpay Checkout restricted to UPI. Unlike a plain
 * upi://pay link, the gateway tells this server when money actually arrived,
 * so a booking is confirmed by a signature check instead of by a human
 * matching bank statements.
 *
 * Orders are created with a plain fetch rather than the razorpay npm package:
 * it is one endpoint, and the package is a dependency for a single POST.
 */
import crypto from "crypto";

const ORDERS_URL = "https://api.razorpay.com/v1/orders";

/** True when both halves of the API key pair are set. */
export function isRazorpayConfigured(): boolean {
  return Boolean(
    process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID?.trim() && process.env.RAZORPAY_KEY_SECRET?.trim()
  );
}

/** True when the webhook (the recovery path for closed tabs) can be verified. */
export function isRazorpayWebhookConfigured(): boolean {
  return Boolean(process.env.RAZORPAY_WEBHOOK_SECRET?.trim());
}

export function razorpayKeyId(): string {
  return (process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID || "").trim();
}

export class RazorpayError extends Error {
  /** HTTP status Razorpay answered with; 401 means the key pair is wrong. */
  readonly statusCode?: number;

  // Written out rather than as a parameter property so the file also runs
  // under Node's type-stripping test runner.
  constructor(message: string, statusCode?: number) {
    super(message);
    this.statusCode = statusCode;
  }
}

/**
 * Create an order for `amount` rupees.
 *
 * The booking's reference rides along as the receipt and in notes, so it shows
 * beside the payment in the Razorpay dashboard and comes back on the webhook.
 */
export async function createOrder(opts: {
  amount: number;
  bookingId: string;
  notes: Record<string, string>;
}): Promise<{ id: string; amount: number; currency: string }> {
  const keyId = razorpayKeyId();
  const keySecret = (process.env.RAZORPAY_KEY_SECRET || "").trim();
  if (!keyId || !keySecret) throw new RazorpayError("Razorpay keys are not set");

  const res = await fetch(ORDERS_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Basic ${Buffer.from(`${keyId}:${keySecret}`).toString("base64")}`,
    },
    body: JSON.stringify({
      amount: Math.round(opts.amount * 100), // paise
      currency: "INR",
      receipt: opts.bookingId,
      notes: opts.notes,
    }),
    cache: "no-store",
  });

  const body = (await res.json().catch(() => ({}))) as {
    id?: string;
    amount?: number;
    currency?: string;
    error?: { description?: string };
  };

  if (!res.ok || !body.id) {
    throw new RazorpayError(body.error?.description || `HTTP ${res.status}`, res.status);
  }

  return { id: body.id, amount: body.amount ?? 0, currency: body.currency ?? "INR" };
}

/** Constant-time HMAC-SHA256 check, shared by the checkout and webhook paths. */
function hmacMatches(secret: string, payload: string, signature: string): boolean {
  const expected = Buffer.from(
    crypto.createHmac("sha256", secret).update(payload).digest("hex"),
    "utf8"
  );
  const provided = Buffer.from(signature, "utf8");
  return provided.length === expected.length && crypto.timingSafeEqual(provided, expected);
}

/**
 * The checkout handler's proof of payment: HMAC of "order_id|payment_id" under
 * the key secret. Only Razorpay can produce it, so a browser cannot claim a
 * payment it did not make.
 */
export function verifyCheckoutSignature(
  orderId: string,
  paymentId: string,
  signature: string
): boolean {
  const secret = (process.env.RAZORPAY_KEY_SECRET || "").trim();
  if (!secret) return false;
  return hmacMatches(secret, `${orderId}|${paymentId}`, signature);
}

/** Webhook signature: HMAC of the exact raw body under the webhook secret. */
export function verifyWebhookSignature(rawBody: string, signature: string): boolean {
  const secret = (process.env.RAZORPAY_WEBHOOK_SECRET || "").trim();
  if (!secret) return false;
  return hmacMatches(secret, rawBody, signature);
}
