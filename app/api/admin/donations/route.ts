import { NextResponse } from "next/server";
import { adminDb, isAdminConfigured, verifyAdminRequest } from "@/lib/firebaseAdmin";

/**
 * The donor list for /admin/donations. Read through the Admin SDK behind an
 * admin check, so the `donations` collection stays closed to every client in
 * firestore.rules — no rule change, no rules deploy.
 */
export async function GET(req: Request) {
  if (!isAdminConfigured()) {
    return NextResponse.json({ error: "Not configured", reason: "admin_not_configured" }, { status: 503 });
  }
  const adminEmail = await verifyAdminRequest(req);
  if (!adminEmail) return NextResponse.json({ error: "Not authorised" }, { status: 403 });

  const snap = await adminDb().collection("donations").orderBy("createdAt", "desc").limit(1000).get();
  const donations = snap.docs.map((d) => {
    const x = d.data();
    return {
      id: d.id,
      donationId: x.donationId,
      donorName: x.donorName,
      phone: x.phone,
      email: x.email || "",
      amount: x.amount,
      purpose: x.purpose,
      paymentStatus: x.paymentStatus,
      razorpayPaymentId: x.razorpayPaymentId || "",
      createdAt: x.createdAt?.toMillis?.() ?? null,
    };
  });
  return NextResponse.json({ donations });
}
