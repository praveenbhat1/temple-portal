/**
 * Firebase client-side initialization.
 * Uses NEXT_PUBLIC_ environment variables (safe for browser).
 */
import { initializeApp, getApps } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";
import { getMessaging, isSupported } from "firebase/messaging";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

// Check if we have minimum required config
const isConfigValid = !!firebaseConfig.apiKey && !!firebaseConfig.projectId;

// Initialize Firebase only once and only if config is valid
let app;
if (isConfigValid) {
  app = !getApps().length ? initializeApp(firebaseConfig) : getApps()[0];
} else {
  // Mock app for build-time safety (will fail at runtime if still missing)
  app = { name: "[DEFAULT]-MOCK" } as any;
  if (typeof window !== "undefined") {
    console.error("Firebase Config is missing! Please check your environment variables.");
  }
}

export const auth = isConfigValid ? getAuth(app) : ({} as any);
export const db = isConfigValid ? getFirestore(app) : ({} as any);
export const storage = isConfigValid ? getStorage(app) : ({} as any);

/**
 * getMessagingInstance – only call in browser context where FCM is supported.
 */
export const getMessagingInstance = async () => {
  if (typeof window === "undefined" || !isConfigValid) return null;
  const supported = await isSupported();
  if (!supported) return null;
  return getMessaging(app);
};

export default app;
