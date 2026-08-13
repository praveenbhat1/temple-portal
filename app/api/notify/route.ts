import { NextResponse } from "next/server";
import { adminDb, adminMessaging, isAdminConfigured, verifyAdminRequest } from "@/lib/firebaseAdmin";

/**
 * Push a temple update to every subscribed devotee.
 *
 * Admin-only: the caller must send a Firebase ID token as
 * `Authorization: Bearer <token>` and have a document in the `admins`
 * collection keyed by their email. Without this check anyone could spam every
 * devotee who ever enabled notifications.
 *
 * Tokens that FCM reports as dead are pruned so the list doesn't rot.
 */

const MAX_TOKENS_PER_BATCH = 500; // FCM sendEachForMulticast limit

export async function POST(req: Request) {
  if (!isAdminConfigured()) {
    return NextResponse.json(
      { error: "Notifications are not configured on the server.", reason: "admin_not_configured" },
      { status: 503 }
    );
  }

  const adminEmail = await verifyAdminRequest(req);
  if (!adminEmail) {
    return NextResponse.json({ error: "Not authorised" }, { status: 401 });
  }

  let body: { title?: string; body?: string; announcementId?: string; url?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const title = (body.title || "").trim();
  const message = (body.body || "").trim();

  if (!title) {
    return NextResponse.json({ error: "A title is required." }, { status: 400 });
  }

  try {
    const db = adminDb();
    const snap = await db.collection("fcmTokens").where("active", "==", true).get();
    const tokens = snap.docs.map((d) => d.id).filter(Boolean);

    if (tokens.length === 0) {
      return NextResponse.json({ ok: true, sent: 0, failed: 0, note: "No devotees are subscribed yet." });
    }

    const messaging = adminMessaging();
    let sent = 0;
    let failed = 0;
    const deadTokens: string[] = [];

    for (let i = 0; i < tokens.length; i += MAX_TOKENS_PER_BATCH) {
      const batch = tokens.slice(i, i + MAX_TOKENS_PER_BATCH);

      const response = await messaging.sendEachForMulticast({
        tokens: batch,
        notification: { title, body: message },
        // Data is what the service worker reads for tag/click-through.
        data: {
          title,
          body: message,
          announcementId: body.announcementId || "",
          url: body.url || "/announcements",
        },
        webpush: {
          notification: { icon: "/icon-192.png", badge: "/icon-192.png" },
          fcmOptions: { link: body.url || "/announcements" },
        },
      });

      sent += response.successCount;
      failed += response.failureCount;

      response.responses.forEach((r, idx) => {
        if (r.success) return;
        const code = r.error?.code;
        if (
          code === "messaging/registration-token-not-registered" ||
          code === "messaging/invalid-registration-token" ||
          code === "messaging/invalid-argument"
        ) {
          deadTokens.push(batch[idx]);
        } else {
          console.error("FCM send error:", code, r.error?.message);
        }
      });
    }

    // Retire tokens FCM says are gone (uninstalled app, cleared site data…).
    if (deadTokens.length > 0) {
      const writer = db.batch();
      deadTokens.forEach((t) => writer.delete(db.collection("fcmTokens").doc(t)));
      await writer.commit();
    }

    console.log(
      `Temple update pushed by ${adminEmail}: ${sent} delivered, ${failed} failed, ${deadTokens.length} pruned`
    );

    return NextResponse.json({ ok: true, sent, failed, pruned: deadTokens.length });
  } catch (err) {
    console.error("Failed to push temple update:", err);
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
