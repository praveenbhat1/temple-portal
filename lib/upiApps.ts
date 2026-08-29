/**
 * Per-app UPI deep links — client-safe (no env access, unlike lib/upi.ts).
 *
 * A plain `upi://pay?…` link opens Android's system chooser listing every UPI
 * app installed. That is a fine default but a poor experience: almost every
 * devotee here uses GPay or PhonePe, and the chooser makes them pick from a
 * list of apps they don't use before they can pay. So the two apps people
 * actually have are offered directly and the chooser sits underneath as
 * "any other UPI app".
 *
 * It is also not universal — iOS registers no handler for `upi://` at all, so
 * an iPhone gets nothing from the generic link. Each app's own scheme is the
 * only thing that works there.
 *
 * Every scheme below takes the same query string as `upi://pay`, so a link is
 * just the generic URI with its scheme and path swapped out.
 */

export interface UpiApp {
  id: string;
  name: string;
  /** Scheme + path this app registers on Android, minus the query string. */
  prefix: string;
  /**
   * iOS scheme, where it differs. iOS ignores Android's `tez://` for Google
   * Pay, so the two are listed separately rather than assumed identical.
   */
  iosPrefix?: string;
  /**
   * Android package id. Used to build an `intent://` URL, which routes to the
   * app far more reliably than a bare custom scheme in Chrome — Chrome blocks
   * scheme navigations it considers un-user-initiated, and silently does
   * nothing when the app isn't installed unless an intent fallback is given.
   */
  androidPackage?: string;
  /** Brand colour, for the button. */
  color: string;
}

/**
 * Ordered by how many devotees actually use them, because the first button is
 * the one most people will press without reading.
 */
export const UPI_APPS: UpiApp[] = [
  {
    id: "gpay",
    name: "Google Pay",
    prefix: "tez://upi/pay",
    iosPrefix: "gpay://upi/pay",
    androidPackage: "com.google.android.apps.nbu.paisa.user",
    color: "#1a73e8",
  },
  {
    id: "phonepe",
    name: "PhonePe",
    prefix: "phonepe://pay",
    iosPrefix: "phonepe://pay",
    androidPackage: "com.phonepe.app",
    color: "#5f259f",
  },
  {
    id: "paytm",
    name: "Paytm",
    prefix: "paytmmp://pay",
    iosPrefix: "paytmmp://pay",
    androidPackage: "net.one97.paytm",
    color: "#00b9f1",
  },
];

/** The two apps that get their own large button. */
export const PRIMARY_UPI_APPS = UPI_APPS.filter((a) => a.id === "gpay" || a.id === "phonepe");
/** Everything else, offered as a smaller row underneath. */
export const SECONDARY_UPI_APPS = UPI_APPS.filter((a) => !PRIMARY_UPI_APPS.includes(a));

/** Which mobile platform this browser is on. "other" covers desktop. */
export type Platform = "android" | "ios" | "other";

export function detectPlatform(): Platform {
  if (typeof navigator === "undefined") return "other";
  const ua = navigator.userAgent;
  if (/android/i.test(ua)) return "android";
  // iPadOS 13+ reports as a Mac, so a touch-capable "Mac" is an iPad.
  if (/iPad|iPhone|iPod/.test(ua)) return "ios";
  if (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1) return "ios";
  return "other";
}

/**
 * Retarget a `upi://pay?…` URI at one specific app on this platform.
 *
 * Only the query survives — it already carries the payee, amount and booking
 * reference, and every app parses it identically.
 *
 * On Android this returns an `intent://` URL whose `S.browser_fallback_url`
 * is the generic `upi://` link, so a devotee without that app lands in the
 * system chooser instead of on a dead tap.
 */
export function toAppLink(upiUri: string, app: UpiApp, platform: Platform = "other"): string {
  const query = upiUri.split("?")[1] ?? "";

  if (platform === "android" && app.androidPackage) {
    const fallback = encodeURIComponent(upiUri);
    return (
      `intent://pay?${query}#Intent;scheme=upi;` +
      `package=${app.androidPackage};` +
      `S.browser_fallback_url=${fallback};end`
    );
  }

  const prefix = platform === "ios" ? app.iosPrefix ?? app.prefix : app.prefix;
  return `${prefix}?${query}`;
}
