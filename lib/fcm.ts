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

const VAPID_KEY = process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY;

export type SubscribeResult =
  | { ok: true; token: string }
  | { ok: false; reason: "unsupported" | "denied" | "no_vapid_key" | "failed"; detail?: string };

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

  if (!VAPID_KEY) {
    // Without the Web Push certificate key, getToken always fails. Previously
    // this surfaced as a silent "Notifications disabled".
    console.error(
      "NEXT_PUBLIC_FIREBASE_VAPID_KEY is not set. Copy it from Firebase Console → " +
        "Project Settings → Cloud Messaging → Web Push certificates."
    );
    return { ok: false, reason: "no_vapid_key" };
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

    const token = await getToken(messaging, {
      vapidKey: VAPID_KEY,
      serviceWorkerRegistration: registration,
    });

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
