"use client";
/**
 * Auth helpers for admin access control.
 * Primary source of truth is the 'admins' collection in Firestore.
 */
import { verifyAdmin } from "./firestore";

/**
 * Check if a given email is an authorised admin via Firestore.
 */
export async function checkAdminStatus(email: string | null | undefined): Promise<boolean> {
  if (!email) return false;
  
  // 1. Check Firestore 'admins' collection
  const isAuthorized = await verifyAdmin(email);
  if (isAuthorized) return true;

  // 2. Fallback to Environment Variables (for initial setup)
  const envAdmins = (process.env.NEXT_PUBLIC_ADMIN_EMAILS || "")
    .split(",")
    .map((e) => e.trim())
    .filter(Boolean);
    
  // Add hardcoded admin for user convenience
  if (email === "praveenbhat46@gmail.com") return true;
    
  return envAdmins.includes(email);
}
