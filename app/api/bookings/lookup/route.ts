import { NextResponse } from "next/server";
import { adminDb, isAdminConfigured } from "@/lib/firebaseAdmin";
import { normalizePhone } from "@/lib/utils";

/**
 * Look up a devotee's own bookings by booking id or phone number.
 *
 * This runs server-side because Firestore rules cannot express "you may read
 * only the rows matching your own filter" — request.query exposes just
 * limit/offset/orderBy, never the filter values. The old rule tried
 * request.query.filters.phone, which always errored, so /track-booking never
 * returned anything.
 */

const MAX_RESULTS = 20;

type BookingRow = Record<string, unknown> & { id: string };

export async function POST(req: Request) {
  if (!isAdminConfigured()) {
    return NextResponse.json(
      { error: "Booking lookup is not configured on the server.", reason: "admin_not_configured" },
      { status: 503 }
    );
  }

  let body: { q?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const raw = (body.q || "").trim();
  if (raw.length < 4) {
    return NextResponse.json(
      { error: "Enter a booking ID or your 10-digit mobile number." },
      { status: 400 }
    );
  }

  try {
    const db = adminDb();

    // 1. Booking id (accepts "SV-AB12CD" or bare "AB12CD").
    const upper = raw.toUpperCase();
    const bookingId = upper.startsWith("SV-") ? upper : `SV-${upper}`;

    const byId = await db
      .collection("bookings")
      .where("bookingId", "==", bookingId)
      .limit(MAX_RESULTS)
      .get();

    if (!byId.empty) {
      return NextResponse.json({ ok: true, bookings: serialise(byId.docs) });
    }

    // 2. Phone number.
    const phone = normalizePhone(raw);
    if (phone.replace(/\D/g, "").length < 10) {
      return NextResponse.json({ ok: true, bookings: [] });
    }

    const byPhone = await db
      .collection("bookings")
      .where("phone", "==", phone)
      .orderBy("createdAt", "desc")
      .limit(MAX_RESULTS)
      .get();

    return NextResponse.json({ ok: true, bookings: serialise(byPhone.docs) });
  } catch (err) {
    console.error("Booking lookup failed:", err);
    return NextResponse.json({ error: "Could not search bookings right now." }, { status: 500 });
  }
}

/** Firestore Timestamps aren't JSON-serialisable; send ISO strings instead. */
function serialise(
  docs: Array<{ id: string; data: () => Record<string, unknown> }>
): BookingRow[] {
  return docs.map((d) => {
    const data = d.data();
    const createdAt = data.createdAt as { toDate?: () => Date } | undefined;
    return {
      ...data,
      id: d.id,
      createdAt: createdAt?.toDate ? createdAt.toDate().toISOString() : null,
    };
  });
}
