/**
 * Firebase client-side initialization.
 * Uses NEXT_PUBLIC_ environment variables (safe for browser).
 */
import { initializeApp, getApps, type FirebaseApp } from "firebase/app";
import { getAuth, type Auth } from "firebase/auth";
import { getFirestore, type Firestore } from "firebase/firestore";
import { getStorage, type FirebaseStorage } from "firebase/storage";
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

/**
 * Initialise once, and only when the config is actually present.
 *
 * When it isn't (e.g. a CI build with no env vars), we export stand-ins so that
 * importing this module can't crash the build. Any real use of them throws a
 * message that names the actual problem instead of failing obscurely deep
 * inside the Firebase SDK.
 */
const app: FirebaseApp | null = isConfigValid
  ? getApps().length
    ? getApps()[0]
    : initializeApp(firebaseConfig)
  : null;

if (!app && typeof window !== "undefined") {
  console.error("Firebase config is missing — check your NEXT_PUBLIC_FIREBASE_* environment variables.");
}

function notConfigured<T>(service: string): T {
  return new Proxy(
    {},
    {
      get() {
        throw new Error(
          `Firebase ${service} was used but Firebase is not configured. ` +
            "Set the NEXT_PUBLIC_FIREBASE_* environment variables."
        );
      },
    }
  ) as T;
}

export const auth = app ? getAuth(app) : notConfigured<Auth>("Auth");
export const db = app ? getFirestore(app) : notConfigured<Firestore>("Firestore");
export const storage = app ? getStorage(app) : notConfigured<FirebaseStorage>("Storage");

/**
 * getMessagingInstance – only call in browser context where FCM is supported.
 */
export const getMessagingInstance = async () => {
  if (typeof window === "undefined" || !app) return null;
  const supported = await isSupported();
  if (!supported) return null;
  return getMessaging(app);
};

export default app;
