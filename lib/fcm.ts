"use client";
/**
 * Firebase Cloud Messaging helpers — devotee-facing subscription.
 *
 * Flow: register the service worker → ask permission → get an FCM token →
 * hand the token to /api/fcm/subscribe, which stores it with the Admin SDK.
 *
 * The token is deliberately NOT written from the browser: Firestore rules deny
 * client access to `fcmTokens` so the subscriber list can't be read or spammed.
 */
import { getToken, onMessage } from "firebase/messaging";
import { getMessagingInstance } from "./firebase";

/**
 * The temple's own Web Push certificate, if one has been generated.
 *
 * Optional. When it is absent the Firebase SDK falls back to its own built-in
 * VAPID key, which FCM accepts — so push works out of the box. Setting a
 * project-specific key is the recommended hardening step (it ties the
 * subscription to this project alone), not a prerequisite.
 *
 * Requiring it was a mistake: it turned a working feature off and showed
 * devotees "Temple alerts aren't set up yet" on a site that could have sent
 * them perfectly well.
 */
const VAPID_KEY = process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY?.trim();

export type SubscribeResult =
  | { ok: true; token: string }
  | { ok: false; reason: "unsupported" | "denied" | "timeout" | "failed"; detail?: string };

/**
 * How long to wait for a push token before giving up.
 *
 * getToken() ultimately calls PushManager.subscribe(), which talks to the
 * browser's push service — and that can hang indefinitely when the service is
 * unreachable (a restricted network, a locked-down profile, some corporate
 * proxies). Without a ceiling the button sits on "Invoking updates…" forever,
 * which reads as a broken site rather than a feature that could not start.
 */
const TOKEN_TIMEOUT_MS = 20_000;

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return Promise.race([
    promise,
    new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error("timeout")), ms)
    ),
  ]);
}

/** Register (or reuse) the generated FCM service worker. */
async function registerServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (!("serviceWorker" in navigator)) return null;
  try {
    return await navigator.serviceWorker.register("/firebase-messaging-sw.js", { scope: "/" });
  } catch (err) {
    console.error("FCM service worker registration failed:", err);
    return null;
  }
}

/**
 * Ask for notification permission and subscribe this browser to temple updates.
 */
export async function requestNotificationPermission(): Promise<SubscribeResult> {
  if (typeof window === "undefined" || !("Notification" in window)) {
    return { ok: false, reason: "unsupported" };
  }

  try {
    const permission = await Notification.requestPermission();
    if (permission !== "granted") return { ok: false, reason: "denied" };

    const messaging = await getMessagingInstance();
    if (!messaging) return { ok: false, reason: "unsupported" };

    const registration = await registerServiceWorker();
    if (!registration) return { ok: false, reason: "unsupported" };

    // Make sure the worker is active before asking for a token.
    await navigator.serviceWorker.ready;

    // vapidKey is spread in only when configured — passing `undefined`
    // explicitly is not the same as omitting it, and would skip the SDK's
    // default key rather than falling back to it.
    let token: string;
    try {
      token = await withTimeout(
        getToken(messaging, {
          ...(VAPID_KEY ? { vapidKey: VAPID_KEY } : {}),
          serviceWorkerRegistration: registration,
        }),
        TOKEN_TIMEOUT_MS
      );
    } catch (err) {
      if ((err as Error).message === "timeout") {
        console.warn("FCM token request timed out — the browser's push service did not respond.");
        return { ok: false, reason: "timeout" };
      }
      throw err;
    }

    if (!token) return { ok: false, reason: "failed", detail: "no token returned" };

    const res = await fetch("/api/fcm/subscribe", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token, userAgent: navigator.userAgent }),
    });

    if (!res.ok) {
      const detail = await res.json().catch(() => ({}));
      console.error("Could not store FCM token:", detail);
      return { ok: false, reason: "failed", detail: detail?.error };
    }

    return { ok: true, token };
  } catch (err) {
    console.error("FCM subscription error:", err);
    return { ok: false, reason: "failed", detail: (err as Error).message };
  }
}

/** Current permission state without prompting. */
export function notificationPermission(): NotificationPermission | "unsupported" {
  if (typeof window === "undefined" || !("Notification" in window)) return "unsupported";
  return Notification.permission;
}

/**
 * Show updates that arrive while the site is open in the foreground —
 * the service worker only handles background messages.
 */
export async function listenForForegroundMessages(
  onUpdate: (payload: { title: string; body: string }) => void
): Promise<() => void> {
  const messaging = await getMessagingInstance();
  if (!messaging) return () => {};

  return onMessage(messaging, (payload) => {
    const title = payload.notification?.title || payload.data?.title || "Temple Update";
    const body = payload.notification?.body || payload.data?.body || "";
    onUpdate({ title, body });
  });
}
