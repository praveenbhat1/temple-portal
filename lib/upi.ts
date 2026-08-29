/**
 * UPI intent links for the gateway-free payment flow — server-side only.
 *
 * There is no payment gateway in this path, which means there is also no
 * callback: UPI moves money straight into the temple's bank account and tells
 * this server nothing. That is the whole reason bookings created this way start
 * as `pending` and are settled by a human in /admin/bookings.
 *
 * The one thing that makes reconciliation tractable is the booking reference:
 * it rides along in the `tn` (note) and `tr` (transaction reference) fields, so
 * it shows up next to the credit in the temple's UPI app and bank statement.
 * Without that, an admin would be matching payments by amount and timing alone.
 */

/** Fallback payee name shown in the devotee's UPI app if none is configured. */
const DEFAULT_PAYEE_NAME = "Sri Vinayaka Temple";

/** True when the temple has a UPI id configured and the flow can run. */
export function isUpiConfigured(): boolean {
  return Boolean(process.env.TEMPLE_UPI_ID?.trim());
}

/**
 * Build a `upi://pay` intent URI.
 *
 * Scanning this as a QR or opening it on a phone launches GPay/PhonePe/Paytm
 * with the temple, amount and reference already filled in.
 *
 * Parameters are encoded by hand rather than with URLSearchParams because the
 * latter encodes a space as `+`, and several UPI apps pass that through
 * literally — the payee name would render as "Sri+Vinayaka+Temple".
 */
export function buildUpiUri(opts: { amount: number; bookingId: string }): string {
  const vpa = (process.env.TEMPLE_UPI_ID || "").trim();
  if (!vpa) throw new Error("TEMPLE_UPI_ID is not set");

  const payeeName = (process.env.TEMPLE_UPI_NAME || DEFAULT_PAYEE_NAME).trim();

  const params: [string, string][] = [
    ["pa", vpa],
    ["pn", payeeName],
    ["am", opts.amount.toFixed(2)],
    ["cu", "INR"],
    ["tn", `Seva ${opts.bookingId}`],
    // Some UPI apps reject a reference containing punctuation, so SV-7KQM4P
    // travels as SV7KQM4P here. The readable form is still in `tn`.
    ["tr", opts.bookingId.replace(/-/g, "")],
  ];

  const query = params.map(([k, v]) => `${k}=${encodeURIComponent(v)}`).join("&");
  return `upi://pay?${query}`;
}

/**
 * Build an open-amount `upi://pay` link for donations.
 *
 * Unlike a seva booking there is no amount and no reference: the devotee
 * decides how much to give, and their UPI app asks them for it. Same encoding
 * caveat as buildUpiUri — spaces must not become `+`.
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
