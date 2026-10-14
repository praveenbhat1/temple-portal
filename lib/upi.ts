/**
 * The temple's UPI id, for the open-amount donation link on /donate — server
 * side only, so the VPA lives in exactly one env var.
 *
 * Seva bookings do not use this: they are paid through Razorpay Checkout
 * (lib/razorpay.ts), which tells the server when the money arrives. A plain
 * upi://pay link tells it nothing, which is fine for a donation that needs no
 * confirmation and was the whole problem for a booking that does.
 */

/** Fallback payee name shown in the devotee's UPI app if none is configured. */
const DEFAULT_PAYEE_NAME = "Sri Vinayaka Temple";

/** True when the temple has a UPI id configured for donations. */
export function isUpiConfigured(): boolean {
  return Boolean(process.env.TEMPLE_UPI_ID?.trim());
}

/**
 * Build an open-amount `upi://pay` link for donations.
 *
 * There is no amount and no reference: the devotee decides how much to give,
 * and their UPI app asks them for it.
 *
 * Parameters are encoded by hand rather than with URLSearchParams because the
 * latter encodes a space as `+`, and several UPI apps pass that through
 * literally — the payee name would render as "Sri+Vinayaka+Temple".
 */
export function buildDonationUpiUri(): string {
  const vpa = (process.env.TEMPLE_UPI_ID || "").trim();
  if (!vpa) throw new Error("TEMPLE_UPI_ID is not set");

  const payeeName = (process.env.TEMPLE_UPI_NAME || DEFAULT_PAYEE_NAME).trim();

  const params: [string, string][] = [
    ["pa", vpa],
    ["pn", payeeName],
    ["cu", "INR"],
    ["tn", "Temple Donation"],
  ];

  return `upi://pay?${params.map(([k, v]) => `${k}=${encodeURIComponent(v)}`).join("&")}`;
}

/** The temple's UPI id, for display. Empty string when not configured. */
export function templeUpiId(): string {
  return (process.env.TEMPLE_UPI_ID || "").trim();
}
