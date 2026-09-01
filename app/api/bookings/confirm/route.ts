import { NextResponse } from "next/server";
import { isAdminConfigured, verifyAdminRequest } from "@/lib/firebaseAdmin";
import { settleBooking } from "@/lib/settleBooking";

/**
 * Settle a pending UPI booking: mark it paid (or rejected) after a temple admin
 * has seen the money land.
 *
 * This is the trust anchor of the manual flow — the devotee's browser never
 * says "I paid" in a way that counts. Only an authenticated admin can move a
 * booking to `success` from here.
 *
 * The write itself lives in lib/settleBooking.ts, shared with the automatic
 * reconciler in /api/reconcile. Both must behave identically: the difference
 * between them is who decided, never what happens.
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
  if (!id || (action !== "confirm" && action !== "reject")) {
    return NextResponse.json(
      { error: "Missing booking id or action.", reason: "incomplete" },
      { status: 400 }
    );
  }

  const result = await settleBooking({
    id,
    action,
    by: { kind: "admin", email: adminEmail },
    upiRef: body.upiRef,
  });

  if (!result.ok) {
    const status =
      result.reason === "not_found" ? 404 : result.reason === "already_settled" ? 409 : 500;
    return NextResponse.json({ error: result.message, reason: result.reason }, { status });
  }

  return NextResponse.json({
    ok: true,
    id,
    paymentStatus: result.status,
    confirmedBy: adminEmail,
    // The dashboard falls back to a click-to-send WhatsApp link when no
    // provider is configured, so it needs to know which happened.
    notified: result.notified,
    notifyChannel: result.notifyChannel,
  });
}
