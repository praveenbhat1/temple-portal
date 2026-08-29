import { NextResponse } from "next/server";
import { adminDb, isAdminConfigured } from "@/lib/firebaseAdmin";
import { normalizePhone } from "@/lib/utils";
import { check, clientIp, tooManyRequests } from "@/lib/rateLimit";

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

/**
 * The route is unauthenticated by design — a devotee should not need an account
 * to see their own seva. That makes it the one endpoint someone can grind
 * against, so it is throttled: 12 searches per five minutes is far more than a
 * devotee mistyping their number needs, and far less than an enumeration run.
 */
const RATE_LIMIT = 12;
const RATE_WINDOW_MS = 5 * 60 * 1000;

type BookingRow = Record<string, unknown> & { id: string };

export async function POST(req: Request) {
  const limit = check(`booking-lookup:${clientIp(req)}`, RATE_LIMIT, RATE_WINDOW_MS);
  if (!limit.ok) {
    return tooManyRequests(limit, "Too many searches. Please wait a few minutes and try again.");
  }

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

  const raw = (typeof body.q === "string" ? body.q : "").trim().slice(0, 40);
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
      // Someone searching by reference has not proved they own the booking —
      // a reference can be read off a shared screen or a forwarded message. So
      // the contact details come back masked. Searching by phone (below) does
      // demonstrate knowledge of the number, and returns the record in full.
      return NextResponse.json({ ok: true, bookings: serialise(byId.docs, { mask: true }) });
    }

    // 2. Phone number.
    const phone = normalizePhone(raw);
    if (phone.replace(/\D/g, "").length < 10) {
      return NextResponse.json({ ok: true, bookings: [] });
    }

    // Deliberately no orderBy("createdAt"). It carried two costs for nothing:
    // it required a composite index (phone + createdAt) that had to be built
    // and deployed before Track Seva worked at all, and Firestore's orderBy
    // silently EXCLUDES documents missing the field — so a booking written
    // without a createdAt would be invisible to the devotee who made it.
    // A devotee has a handful of bookings, so sorting the page in memory is
    // both cheaper and correct.
    const byPhone = await db
      .collection("bookings")
      .where("phone", "==", phone)
      .limit(MAX_RESULTS)
      .get();

    const rows = serialise(byPhone.docs, { mask: false }).sort((a, b) =>
      String(b.createdAt ?? "").localeCompare(String(a.createdAt ?? ""))
    );

    return NextResponse.json({ ok: true, bookings: rows });
  } catch (err) {
    console.error("Booking lookup failed:", err);
    return NextResponse.json({ error: "Could not search bookings right now." }, { status: 500 });
  }
}

/** "+919876543210" → "+91 XXXXXX 3210". */
function maskPhone(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  if (digits.length < 4) return "••••";
  return `+91 XXXXXX ${digits.slice(-4)}`;
}

/** "devotee@example.com" → "d••••••@example.com". */
function maskEmail(email: string): string {
  const [user, domain] = email.split("@");
  if (!domain) return "••••";
  return `${user.slice(0, 1)}${"•".repeat(Math.max(3, user.length - 1))}@${domain}`;
}

/**
 * Firestore Timestamps aren't JSON-serialisable; send ISO strings instead.
 * Internal fields (who confirmed it, and when) never leave the server.
 */
function serialise(
  docs: Array<{ id: string; data: () => Record<string, unknown> }>,
  opts: { mask: boolean }
): BookingRow[] {
  return docs.map((d) => {
    const data = d.data();
    const createdAt = data.createdAt as { toDate?: () => Date } | undefined;

    // Who settled the booking and when is the temple's internal record; the
    // devotee's own tracking page has no use for it.
    const safe = { ...data };
    delete safe.confirmedBy;
    delete safe.confirmedAt;
    delete safe.adminNote;

    return {
      ...safe,
      id: d.id,
      phone: opts.mask ? maskPhone(String(data.phone || "")) : data.phone,
      email: opts.mask && data.email ? maskEmail(String(data.email)) : data.email,
      createdAt: createdAt?.toDate ? createdAt.toDate().toISOString() : null,
    };
  });
}
