import { NextResponse } from "next/server";
import { adminDb, FieldValue, isAdminConfigured, verifyAdminRequest } from "@/lib/firebaseAdmin";
import { notifyDevotee } from "@/lib/notify";

/**
 * Settle a pending UPI booking: mark it paid (or rejected) after a temple admin
 * has seen the money land.
 *
 * This is the trust anchor of the manual flow — the devotee's browser never
 * says "I paid" in a way that counts. Only an authenticated admin can move a
 * booking to `success`, and the status flip happens inside a transaction so two
 * admins clicking at once cannot double-count a seva.
 */

type ConfirmBody = {
  id?: string;
  action?: "confirm" | "reject";
  /** UPI/bank reference the admin read off the statement. Optional but useful. */
  upiRef?: string;
};

export async function POST(req: Request) {
  if (!isAdminConfigured()) {
    return NextResponse.json(
      {
        error: "Booking confirmation is not configured on the server.",
        reason: "admin_not_configured",
      },
      { status: 503 }
    );
  }

  const adminEmail = await verifyAdminRequest(req);
  if (!adminEmail) {
    return NextResponse.json(
      { error: "You are not authorised to confirm bookings.", reason: "unauthorised" },
      { status: 403 }
    );
  }

  let body: ConfirmBody;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body", reason: "bad_json" }, { status: 400 });
  }

  const { id, action } = body;
  const upiRef = (body.upiRef || "").trim().slice(0, 60);

  if (!id || (action !== "confirm" && action !== "reject")) {
    return NextResponse.json(
      { error: "Missing booking id or action.", reason: "incomplete" },
      { status: 400 }
    );
  }

  const db = adminDb();
  const ref = db.collection("bookings").doc(id);

  try {
    // The transaction is what makes a double-click harmless: the second attempt
    // sees a non-pending status and bails before any counter moves.
    const settled = await db.runTransaction(async (tx) => {
      const snap = await tx.get(ref);
      if (!snap.exists) throw new HttpError(404, "That booking no longer exists.", "not_found");

      const data = snap.data() as SettledBooking;

      if (data.paymentStatus !== "pending") {
        throw new HttpError(
          409,
          `This booking has already been marked "${data.paymentStatus}".`,
          "already_settled"
        );
      }

      tx.update(ref, {
        paymentStatus: action === "confirm" ? "success" : "failed",
        confirmedBy: adminEmail,
        confirmedAt: FieldValue.serverTimestamp(),
        ...(upiRef ? { upiRef } : {}),
      });

      return data;
    });

    // Counters run after the transaction commits, so they only ever fire for
    // the one caller that actually won the status flip.
    if (action === "confirm") {
      const sevaIds = (settled.sevas || []).map((s) => s.sevaId);
      if (sevaIds.length > 0) await incrementSevaCounts(sevaIds);
    }

    // Tell the devotee. Best-effort on purpose: the money is already reconciled
    // and the status is already written, so a messaging outage must not turn
    // into a 500 that tempts the admin into clicking again.
    const notified = await notifyDevotee(
      settled.phone || "",
      {
        bookingId: settled.bookingId || "",
        userName: settled.userName || "Devotee",
        totalAmount: settled.totalAmount || 0,
        eventDate: settled.eventDate || "",
        sevas: settled.sevas || [],
        upiRef: upiRef || settled.upiRef,
      },
      action === "confirm" ? "confirmed" : "rejected"
    ).catch((err) => {
      console.error("Devotee notification threw:", err);
      return { sent: false as const, channel: "none" as const, detail: (err as Error).message };
    });

    if (!notified.sent && notified.channel !== "none") {
      console.error(`Could not message ${settled.bookingId}:`, notified.detail);
    }

    return NextResponse.json({
      ok: true,
      id,
      paymentStatus: action === "confirm" ? "success" : "failed",
      confirmedBy: adminEmail,
      // The dashboard falls back to a click-to-send WhatsApp link when no
      // provider is configured, so it needs to know which happened.
      notified: notified.sent,
      notifyChannel: notified.channel,
    });
  } catch (err) {
    if (err instanceof HttpError) {
      return NextResponse.json({ error: err.message, reason: err.reason }, { status: err.status });
    }
    console.error("Failed to settle booking:", err);
    return NextResponse.json(
      { error: "Could not update the booking. Please try again.", reason: "write_failed" },
      { status: 500 }
    );
  }
}

/** The fields this route reads back off a booking it has just settled. */
type SettledBooking = {
  paymentStatus?: string;
  bookingId?: string;
  userName?: string;
  phone?: string;
  totalAmount?: number;
  eventDate?: string;
  upiRef?: string;
  sevas?: { sevaId: string; name: string; price: number }[];
};

class HttpError extends Error {
  constructor(readonly status: number, message: string, readonly reason: string) {
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
