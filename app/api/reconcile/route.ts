import { NextResponse } from "next/server";
import crypto from "crypto";
import { adminDb, isAdminConfigured, verifyAdminRequest } from "@/lib/firebaseAdmin";
import { fetchBankCredits, isBankAlertsConfigured, type BankCredit } from "@/lib/bankAlerts";
import { settleBooking } from "@/lib/settleBooking";

/**
 * Confirm bookings automatically by matching them against the temple's own
 * bank credit alerts.
 *
 * The rule is deliberately strict, and it is the whole reason this can run
 * unattended: a booking is confirmed only when the UPI reference the DEVOTEE
 * typed matches the UPI reference the BANK reported, and the amounts agree to
 * the paisa. Both halves are needed. The devotee's word alone proves nothing,
 * and a bank credit alone cannot say which booking it belongs to.
 *
 * A devotee cannot forge this. They would have to make an alert appear in the
 * temple's mailbox carrying a reference they chose — which requires actually
 * paying, for the right amount.
 *
 * Everything that does not match exactly is left alone for a human. The
 * function's failure mode is doing nothing, never confirming wrongly.
 */

export const maxDuration = 60;

/** How far back to read alerts. Comfortably covers a missed run or two. */
const LOOKBACK_HOURS = 48;

export async function GET(req: Request) {
  return run(req);
}
export async function POST(req: Request) {
  return run(req);
}

async function run(req: Request) {
  if (!(await authorised(req))) {
    return NextResponse.json({ error: "Not authorised" }, { status: 403 });
  }
  if (!isAdminConfigured()) {
    return NextResponse.json(
      { error: "Server database access is not configured.", reason: "admin_not_configured" },
      { status: 503 }
    );
  }
  if (!isBankAlertsConfigured()) {
    return NextResponse.json({
      ok: true,
      configured: false,
      note: "Bank alert reconciliation is not set up. Set BANK_ALERT_IMAP_* to enable it.",
    });
  }

  const scan = await fetchBankCredits(LOOKBACK_HOURS);
  if (scan.error) {
    console.error("Bank alert scan failed:", scan.error);
    return NextResponse.json(
      { ok: false, error: "Could not read the bank mailbox.", detail: scan.error },
      { status: 502 }
    );
  }

  // Only pending bookings can be settled, and there are never many.
  const pendingSnap = await adminDb()
    .collection("bookings")
    .where("paymentStatus", "==", "pending")
    .get();

  const pending = pendingSnap.docs.map((d) => ({
    id: d.id,
    ...(d.data() as { bookingId?: string; devoteeUpiRef?: string; totalAmount?: number }),
  }));

  const confirmed: { bookingId: string; amount: number; utr: string }[] = [];
  const unmatched: { utr: string; amount: number; why: string }[] = [];

  for (const credit of scan.credits) {
    const match = findBooking(pending, credit);

    if (!match.booking) {
      unmatched.push({ utr: credit.utr, amount: credit.amount, why: match.why });
      continue;
    }

    const result = await settleBooking({
      id: match.booking.id,
      action: "confirm",
      by: { kind: "auto", source: "bank-alert" },
      // The bank's own reference, not the devotee's copy of it.
      upiRef: credit.utr,
    });

    if (result.ok) {
      confirmed.push({
        bookingId: match.booking.bookingId || match.booking.id,
        amount: credit.amount,
        utr: credit.utr,
      });
      // Stop the same booking being matched twice within one run.
      const i = pending.findIndex((p) => p.id === match.booking!.id);
      if (i !== -1) pending.splice(i, 1);
    } else {
      unmatched.push({ utr: credit.utr, amount: credit.amount, why: result.reason || "settle_failed" });
    }
  }

  if (confirmed.length > 0) {
    console.log(
      `Reconciled ${confirmed.length} booking(s) from bank alerts:`,
      confirmed.map((c) => `${c.bookingId} Rs.${c.amount}`).join(", ")
    );
  }

  return NextResponse.json({
    ok: true,
    configured: true,
    scannedEmails: scan.scanned,
    creditsFound: scan.credits.length,
    pendingBookings: pendingSnap.size,
    confirmed,
    unmatched,
    // Alerts that read like credits but could not be parsed. If these keep
    // appearing, the bank has changed its wording and the patterns in
    // lib/bankAlerts.ts need a new case.
    unparsedAlerts: scan.unparsed,
  });
}

type PendingBooking = {
  id: string;
  bookingId?: string;
  devoteeUpiRef?: string;
  totalAmount?: number;
};

/**
 * Find the one pending booking a credit belongs to.
 *
 * Matching is on the reference AND the amount. Reference alone would confirm
 * the wrong booking if a devotee mistyped someone else's; amount alone is not
 * remotely unique — two people paying Rs.100 on the same day is ordinary.
 */
function findBooking(
  pending: PendingBooking[],
  credit: BankCredit
): { booking?: PendingBooking; why: string } {
  const utr = credit.utr.trim().toLowerCase();

  // An empty reference must never match. Without this, a credit whose UTR
  // failed to parse would match every booking whose devotee gave no reference
  // ("" === ""), auto-confirming precisely the bookings that must stay manual.
  // parseBankAlert does not currently emit an empty UTR — but this function
  // marks money as received, so it does not rely on that.
  if (utr.length < 6) {
    return { why: "credit has no usable UPI reference" };
  }

  const byRef = pending.filter(
    (b) => (b.devoteeUpiRef || "").trim().toLowerCase() === utr
  );

  if (byRef.length === 0) {
    return { why: "no pending booking carries this UPI reference" };
  }
  if (byRef.length > 1) {
    // Two devotees claiming the same reference: one of them is mistaken.
    return { why: "more than one booking claims this reference — needs a human" };
  }

  const booking = byRef[0];
  if (Math.round((booking.totalAmount || 0) * 100) !== Math.round(credit.amount * 100)) {
    return {
      why: `reference matches ${booking.bookingId} but the amount does not (booking Rs.${booking.totalAmount}, credit Rs.${credit.amount})`,
    };
  }

  return { booking, why: "matched" };
}

/**
 * Two ways in: a signed-in admin pressing "Check for payments now", or the
 * scheduled job presenting RECONCILE_SECRET.
 *
 * The secret is compared in constant time. It is a bearer credential for an
 * endpoint that moves bookings to paid, so leaking it through a timing
 * difference would be a real, if slow, way in.
 */
async function authorised(req: Request): Promise<boolean> {
  const secret = process.env.RECONCILE_SECRET?.trim();
  if (secret) {
    const url = new URL(req.url);
    const supplied =
      req.headers.get("x-reconcile-secret")?.trim() || url.searchParams.get("secret")?.trim() || "";
    if (supplied) {
      const a = Buffer.from(supplied);
      const b = Buffer.from(secret);
      if (a.length === b.length && crypto.timingSafeEqual(a, b)) return true;
    }
  }
  return Boolean(await verifyAdminRequest(req));
}
