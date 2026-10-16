import { NextResponse } from "next/server";
import { adminDb, FieldValue, isAdminConfigured } from "@/lib/firebaseAdmin";
import { check, clientIp, tooManyRequests } from "@/lib/rateLimit";

/**
 * Store a devotee's FCM token so the temple can push updates to them.
 *
 * The token itself is the document id, which makes re-subscribing idempotent —
 * the old code used addDoc() and so accumulated a duplicate row every single
 * time a devotee clicked "Receive Temple Alerts".
 */
export async function POST(req: Request) {
  // Each call writes a document; without a limit a script could fill the
  // collection and the temple's Firestore bill.
  const limit = await check(`fcm-subscribe:${clientIp(req)}`, 10, 60 * 60 * 1000);
  if (!limit.ok) return tooManyRequests(limit, "Too many attempts. Please try again later.");

  if (!isAdminConfigured()) {
    return NextResponse.json(
      {
        error: "Notifications are not configured on the server.",
        reason: "admin_not_configured",
      },
      { status: 503 }
    );
  }

  let body: { token?: string; userAgent?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const token = typeof body.token === "string" ? body.token.trim() : "";

  // FCM web tokens are long opaque strings; reject obvious junk.
  if (token.length < 50 || token.length > 4096) {
    return NextResponse.json({ error: "Invalid token" }, { status: 400 });
  }

  try {
    await adminDb()
      .collection("fcmTokens")
      .doc(token)
      .set(
        {
          token,
          userAgent: (body.userAgent || "").slice(0, 300),
          subscribedAt: FieldValue.serverTimestamp(),
          active: true,
        },
        { merge: true }
      );

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("Failed to store FCM token:", err);
    // Internal error text stays in the logs, not in the response.
    return NextResponse.json({ error: "Could not subscribe right now." }, { status: 500 });
  }
}
