/**
 * Per-app UPI deep links — client-safe (no env access, unlike lib/upi.ts).
 *
 * A plain `upi://pay?…` link is the right default: on Android it opens the
 * system chooser listing every UPI app the devotee has installed. But it is not
 * universal — iOS has no `upi://` handler at all, and a devotee there gets
 * nothing unless the link uses the app's own scheme. So the generic link stays
 * primary and these sit underneath it as a per-app fallback.
 *
 * Every one of these takes the same query string as `upi://pay`, so a link is
 * just the generic URI with its scheme and path swapped out.
 */

export interface UpiApp {
  id: string;
  name: string;
  /** Scheme + path this app registers, minus the query string. */
  prefix: string;
}

export const UPI_APPS: UpiApp[] = [
  { id: "gpay", name: "Google Pay", prefix: "tez://upi/pay" },
  { id: "phonepe", name: "PhonePe", prefix: "phonepe://pay" },
  { id: "paytm", name: "Paytm", prefix: "paytmmp://pay" },
];

/**
 * Retarget a `upi://pay?…` URI at one specific app.
 *
 * Only the query survives — it already carries the payee, amount and booking
 * reference, and every app parses it identically.
 */
export function toAppLink(upiUri: string, app: UpiApp): string {
  const query = upiUri.split("?")[1] ?? "";
  return `${app.prefix}?${query}`;
}
