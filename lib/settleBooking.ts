/**
 * Settling a booking — the one place a payment is marked received.
 *
 * Two callers reach this: an admin pressing "Mark paid" in /admin/bookings,
 * and the automatic reconciler in /api/reconcile. They must behave identically,
 * because the difference between them is only *who decided*, never *what
 * happens*. Keeping the transaction, the seva counters and the devotee's
 * message in one function is what stops the automatic path quietly diverging
 * from the manual one.
 *
 * Server-side only: it writes with the Admin SDK, which bypasses security
 * rules entirely.
 */
import { adminDb, FieldValue } from "./firebaseAdmin";
import { notifyDevotee } from "./notify";

export type SettleAction = "confirm" | "reject";

/** Who decided. Stored on the booking so the record shows its provenance. */
export type SettledBy = { kind: "admin"; email: string } | { kind: "auto"; source: string };

export interface SettleResult {
  ok: boolean;
  status?: "success" | "failed";
  /** Set when the booking could not be settled, for the caller to surface. */
  reason?: "not_found" | "already_settled" | "write_failed";
  message?: string;
  notified?: boolean;
  notifyChannel?: "whatsapp" | "sms" | "none";
  booking?: SettledBooking;
}

export type SettledBooking = {
  paymentStatus?: string;
  bookingId?: string;
  userName?: string;
  phone?: string;
  totalAmount?: number;
  eventDate?: string;
  upiRef?: string;
  devoteeUpiRef?: string;
  sevas?: { sevaId: string; name: string; price: number }[];
};

/**
 * Move a pending booking to success or failed, exactly once.
 *
 * The status flip happens inside a transaction, so two admins clicking at the
 * same moment — or an admin and the reconciler racing — cannot both win and
 * double-count a seva. Everything with side effects (counters, messaging) runs
 * only for the caller that actually won.
 */
export async function settleBooking(opts: {
  id: string;
  action: SettleAction;
  by: SettledBy;
  /** The reference verified against the bank, when there is one. */
  upiRef?: string;
}): Promise<SettleResult> {
  const db = adminDb();
  const ref = db.collection("bookings").doc(opts.id);
  const upiRef = (opts.upiRef || "").trim().slice(0, 60);

  let booking: SettledBooking;

  try {
    booking = await db.runTransaction(async (tx) => {
      const snap = await tx.get(ref);
      if (!snap.exists) throw new SettleError("not_found", "That booking no longer exists.");

      const data = snap.data() as SettledBooking;
      if (data.paymentStatus !== "pending") {
        throw new SettleError(
          "already_settled",
          `This booking has already been marked "${data.paymentStatus}".`
        );
      }

      tx.update(ref, {
        paymentStatus: opts.action === "confirm" ? "success" : "failed",
        confirmedBy: opts.by.kind === "admin" ? opts.by.email : `auto:${opts.by.source}`,
        confirmedAt: FieldValue.serverTimestamp(),
        ...(upiRef ? { upiRef } : {}),
      });

      return data;
    });
  } catch (err) {
    if (err instanceof SettleError) return { ok: false, reason: err.reason, message: err.message };
    console.error("Failed to settle booking:", err);
    return { ok: false, reason: "write_failed", message: "Could not update the booking." };
  }

  // Counters run after the transaction commits, so they fire only for the one
  // caller that won the status flip.
  if (opts.action === "confirm") {
    const sevaIds = (booking.sevas || []).map((s) => s.sevaId);
    if (sevaIds.length > 0) await incrementSevaCounts(sevaIds);
  }

  // Best-effort: the money is reconciled and the status written, so a
  // messaging outage must not turn into a failure the caller might retry.
  const notified = await notifyDevotee(
    booking.phone || "",
    {
      bookingId: booking.bookingId || "",
      userName: booking.userName || "Devotee",
      totalAmount: booking.totalAmount || 0,
      eventDate: booking.eventDate || "",
      sevas: booking.sevas || [],
      upiRef: upiRef || booking.upiRef,
    },
    opts.action === "confirm" ? "confirmed" : "rejected"
  ).catch((err) => {
    console.error("Devotee notification threw:", err);
    return { sent: false as const, channel: "none" as const, detail: (err as Error).message };
  });

  if (!notified.sent && notified.channel !== "none") {
    console.error(`Could not message ${booking.bookingId}:`, notified.detail);
  }

  return {
    ok: true,
    status: opts.action === "confirm" ? "success" : "failed",
    notified: notified.sent,
    notifyChannel: notified.channel,
    booking,
  };
}

class SettleError extends Error {
  constructor(
    readonly reason: "not_found" | "already_settled",
    message: string
  ) {
    super(message);
  }
}

/** Increment currentBookings for any sevas that live in Firestore. */
async function incrementSevaCounts(sevaIds: string[]) {
  const db = adminDb();
  await Promise.all(
    Array.from(new Set(sevaIds)).map(async (id) => {
      try {
        const sevaRef = db.collection("sevas").doc(id);
        const snap = await sevaRef.get();
        if (snap.exists) await sevaRef.update({ currentBookings: FieldValue.increment(1) });
      } catch (err) {
        // A counter is not worth failing a confirmed booking over.
        console.error(`Could not increment booking count for seva ${id}:`, err);
      }
    })
  );
}
