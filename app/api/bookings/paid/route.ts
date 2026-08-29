import { NextResponse } from "next/server";
import { adminDb, FieldValue, isAdminConfigured } from "@/lib/firebaseAdmin";
import { check, clientIp, tooManyRequests } from "@/lib/rateLimit";

/**
 * The devotee says they have paid, and hands over the UPI reference number.
 *
 * This is the single biggest thing that makes the gateway-free flow workable.
 * Without it an admin reconciling the day's credits has only an amount and a
 * timestamp to match against; with it they have the exact 12-digit UTR that
 * appears next to the credit in the temple's bank statement.
 *
 * It proves nothing on its own — anyone can type twelve digits — and it is
 * stored under a deliberately separate field (`devoteeUpiRef`, not `upiRef`)
 * so it can never be mistaken for the reference an admin verified. The booking
 * stays `pending` and only /api/bookings/confirm can move it.
 */

const RATE_LIMIT = 10;
const RATE_WINDOW_MS = 10 * 60 * 1000;

type Body = { id?: string; bookingId?: string; upiRef?: string };

export async function POST(req: Request) {
  const limit = check(`booking-paid:${clientIp(req)}`, RATE_LIMIT, RATE_WINDOW_MS);
  if (!limit.ok) {
    return tooManyRequests(limit, "Too many attempts. Please wait a few minutes and try again.");
  }

  if (!isAdminConfigured()) {
    return NextResponse.json(
      { error: "This is not configured on the server.", reason: "admin_not_configured" },
      { status: 503 }
    );
  }

  let body: Body;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body", reason: "bad_json" }, { status: 400 });
  }

  const id = typeof body.id === "string" ? body.id.trim().slice(0, 64) : "";
  const bookingId = typeof body.bookingId === "string" ? body.bookingId.trim().slice(0, 20) : "";
  // UPI/UTR references are alphanumeric; usually 12 digits, sometimes longer
  // with a bank prefix. Anything outside that is a typo, not a reference.
  const upiRef = (typeof body.upiRef === "string" ? body.upiRef : "")
    .trim()
    .replace(/\s+/g, "")
    .slice(0, 30);

  if (!id || !bookingId) {
    return NextResponse.json({ error: "Missing booking reference.", reason: "incomplete" }, { status: 400 });
  }

  if (upiRef && !/^[A-Za-z0-9]{6,30}$/.test(upiRef)) {
    return NextResponse.json(
      {
        error: "That doesn't look like a UPI reference. It is the 12-digit number your UPI app shows after paying.",
        reason: "bad_ref",
      },
      { status: 400 }
    );
  }

  try {
    const ref = adminDb().collection("bookings").doc(id);
    const snap = await ref.get();

    if (!snap.exists) {
      return NextResponse.json({ error: "That booking no longer exists.", reason: "not_found" }, { status: 404 });
    }

    const data = snap.data() as { bookingId?: string; paymentStatus?: string };

    // The document id alone is guessable in principle; requiring the printed
    // reference to match means a caller has to hold both to touch a booking.
    if (data.bookingId !== bookingId) {
      return NextResponse.json({ error: "That booking no longer exists.", reason: "not_found" }, { status: 404 });
    }

    if (data.paymentStatus !== "pending") {
      // Already settled — nothing to record, and saying so plainly stops the
      // devotee wondering whether their message got through.
      return NextResponse.json({ ok: true, alreadySettled: true, paymentStatus: data.paymentStatus });
    }

    await ref.update({
      devoteeMarkedPaidAt: FieldValue.serverTimestamp(),
      ...(upiRef ? { devoteeUpiRef: upiRef } : {}),
    });

    return NextResponse.json({ ok: true, alreadySettled: false });
  } catch (err) {
    console.error("Failed to record devotee payment claim:", err);
    return NextResponse.json(
      { error: "Could not save that. Please try again.", reason: "write_failed" },
      { status: 500 }
    );
  }
}
