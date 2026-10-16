/**
 * Donations — server side only. Shared by the create, verify and webhook
 * routes so a donation is recorded and settled in exactly one way.
 */
import { adminDb, FieldValue } from "./firebaseAdmin";

/** What a donation can be given towards. Kept short; shown on the receipt. */
export const DONATION_PURPOSES = ["General", "Annadana", "Maintenance", "Utsava"] as const;
export type DonationPurpose = (typeof DONATION_PURPOSES)[number];

export const MIN_DONATION = 1;
export const MAX_DONATION = 500000;

export type DonationRecord = {
  donationId: string;
  donorName: string;
  phone: string;
  email: string;
  amount: number;
  purpose: DonationPurpose;
  paymentStatus: "pending" | "success";
  razorpayOrderId: string;
  razorpayPaymentId?: string;
  confirmedBy?: string;
};

/**
 * Mark a pending donation paid, exactly once. The transaction is what lets the
 * checkout handler and the webhook race: whichever is second sees `success`
 * and does nothing.
 */
export async function settleDonation(opts: {
  id: string;
  orderId: string;
  paymentId: string;
  /** Paise actually captured, when known (the webhook knows; checkout does not). */
  amountPaise?: number;
  source: "razorpay" | "razorpay-webhook";
}): Promise<{ ok: boolean; reason?: "not_found" | "order_mismatch" | "amount_mismatch" | "already_settled" }> {
  const ref = adminDb().collection("donations").doc(opts.id);
  return adminDb().runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    if (!snap.exists) return { ok: false, reason: "not_found" as const };
    const d = snap.data() as DonationRecord;
    if (d.razorpayOrderId !== opts.orderId) return { ok: false, reason: "order_mismatch" as const };
    if (opts.amountPaise !== undefined && Math.round(d.amount * 100) !== opts.amountPaise) {
      return { ok: false, reason: "amount_mismatch" as const };
    }
    if (d.paymentStatus !== "pending") return { ok: false, reason: "already_settled" as const };
    tx.update(ref, {
      paymentStatus: "success",
      razorpayPaymentId: opts.paymentId,
      confirmedBy: `auto:${opts.source}`,
      confirmedAt: FieldValue.serverTimestamp(),
    });
    return { ok: true };
  });
}
