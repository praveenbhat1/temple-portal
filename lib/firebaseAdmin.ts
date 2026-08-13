/**
 * Firebase Admin SDK — server-side only.
 *
 * Never import this from a Client Component; it holds privileged credentials
 * and bypasses Firestore security rules entirely.
 *
 * Credentials come from FIREBASE_SERVICE_ACCOUNT (Firebase Console →
 * Project Settings → Service Accounts → Generate new private key). The value
 * may be either the raw JSON or that JSON base64-encoded — base64 is easier to
 * paste into Vercel because it has no newlines.
 */
import { cert, getApps, initializeApp, type App } from "firebase-admin/app";
import { getFirestore, type Firestore } from "firebase-admin/firestore";
import { getMessaging, type Messaging } from "firebase-admin/messaging";
import { getAuth, type Auth } from "firebase-admin/auth";

const APP_NAME = "svt-admin";

function parseServiceAccount(): Record<string, string> | null {
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT;
  if (!raw || !raw.trim()) return null;

  const text = raw.trim().startsWith("{")
    ? raw
    : Buffer.from(raw, "base64").toString("utf8");

  try {
    const parsed = JSON.parse(text);
    if (!parsed.project_id || !parsed.client_email || !parsed.private_key) {
      throw new Error("missing project_id / client_email / private_key");
    }
    // Vercel's UI turns real newlines into the two characters \ and n.
    parsed.private_key = String(parsed.private_key).replace(/\\n/g, "\n");
    return parsed;
  } catch (err) {
    throw new Error(
      `FIREBASE_SERVICE_ACCOUNT is set but could not be parsed: ${(err as Error).message}`
    );
  }
}

/** True when server-side Firebase features (push, webhooks) are usable. */
export function isAdminConfigured(): boolean {
  try {
    return parseServiceAccount() !== null;
  } catch {
    return false;
  }
}

function adminApp(): App {
  const existing = getApps().find((a) => a.name === APP_NAME);
  if (existing) return existing;

  const serviceAccount = parseServiceAccount();
  if (!serviceAccount) {
    throw new Error(
      "FIREBASE_SERVICE_ACCOUNT is not set — server-side Firebase is unavailable. " +
        "Add it to .env.local and to your Vercel environment variables."
    );
  }

  return initializeApp(
    {
      credential: cert({
        projectId: serviceAccount.project_id,
        clientEmail: serviceAccount.client_email,
        privateKey: serviceAccount.private_key,
      }),
      projectId: serviceAccount.project_id,
    },
    APP_NAME
  );
}

export function adminDb(): Firestore {
  return getFirestore(adminApp());
}

export function adminMessaging(): Messaging {
  return getMessaging(adminApp());
}

export function adminAuth(): Auth {
  return getAuth(adminApp());
}

/**
 * Verify a Firebase ID token from an Authorization: Bearer header and confirm
 * the caller is a temple admin (a document keyed by their email must exist in
 * the `admins` collection).
 *
 * Returns the admin's email, or null when the caller is not an authorised admin.
 */
export async function verifyAdminRequest(req: Request): Promise<string | null> {
  const header = req.headers.get("authorization") || "";
  const match = header.match(/^Bearer\s+(.+)$/i);
  if (!match) return null;

  try {
    const decoded = await adminAuth().verifyIdToken(match[1]);
    const email = decoded.email;
    if (!email) return null;

    const snap = await adminDb().collection("admins").doc(email).get();
    return snap.exists ? email : null;
  } catch (err) {
    console.error("verifyAdminRequest failed:", (err as Error).message);
    return null;
  }
}

// Re-exported so callers can build server timestamps without importing the SDK.
export { FieldValue } from "firebase-admin/firestore";
