"use client";
/**
 * Admin access control for the browser.
 *
 * This is a UI gate only — it decides whether to render the dashboard, nothing
 * more. Every privileged action is authorised again on the other side:
 * firestore.rules re-checks /admins for direct writes, and the API routes
 * re-check it against a verified Firebase ID token in verifyAdminRequest().
 * So a devotee who forces this to return true gains a dashboard shell that
 * cannot read or write a single thing.
 *
 * The single source of truth is the `admins` collection, keyed by email.
 * Membership is granted only from the Firebase console — the security rules
 * deny every client write to it.
 */
import { verifyAdmin } from "./firestore";

/**
 * Is this email a temple admin?
 *
 * Deliberately has no fallback list. It previously trusted
 * NEXT_PUBLIC_ADMIN_EMAILS — which ships to every visitor's browser and is
 * trivially editable there — and hardcoded one personal address on top of that.
 * Both admitted people the security rules would then reject on every write,
 * so the dashboard loaded and then silently failed at each save.
 */
export async function checkAdminStatus(email: string | null | undefined): Promise<boolean> {
  if (!email) return false;
  return verifyAdmin(email);
}
