/**
 * Firebase Cloud Messaging helpers.
 * Handles permission, token retrieval, and token storage in Firestore.
 */
import { getToken } from "firebase/messaging";
import { addDoc, collection } from "firebase/firestore";
import { getMessagingInstance } from "./firebase";
import { db } from "./firebase";

const VAPID_KEY = process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY;

/**
 * Request notification permission from the user.
 * If granted, get the FCM token and store it in Firestore.
 */
export async function requestNotificationPermission(): Promise<string | null> {
  try {
    const permission = await Notification.requestPermission();
    if (permission !== "granted") return null;

    const messaging = await getMessagingInstance();
    if (!messaging) return null;

    const token = await getToken(messaging, { vapidKey: VAPID_KEY });
    if (token) {
      // Store token in Firestore (deduplicate by checking before adding)
      await addDoc(collection(db, "fcmTokens"), {
        token,
        createdAt: new Date().toISOString(),
      });
    }
    return token;
  } catch (err) {
    console.error("FCM permission error:", err);
    return null;
  }
}
