import { NextResponse } from "next/server";
import QRCode from "qrcode";
import { buildDonationUpiUri, isUpiConfigured, templeUpiId } from "@/lib/upi";

/**
 * The temple's UPI id and a donation QR, for /donate.
 *
 * This route exists because TEMPLE_UPI_ID is deliberately not a NEXT_PUBLIC
 * variable, and the donate page is a Client Component. Serving it here keeps
 * exactly one UPI id in the codebase.
 *
 * It replaces a hardcoded string on that page — `temple-donations@upi`, which
 * is not a real VPA. Every devotee who copied it was sending the temple's
 * donations to an address the temple does not own.
 *
 * Nothing secret is returned: a VPA is a payment address meant to be published,
 * the same as the bank account printed beside it.
 */
export const revalidate = 3600;

export async function GET() {
  if (!isUpiConfigured()) {
    return NextResponse.json({ configured: false });
  }

  try {
    const upiUri = buildDonationUpiUri();
    const qrDataUrl = await QRCode.toDataURL(upiUri, { margin: 1, width: 320 });

    return NextResponse.json({
      configured: true,
      vpa: templeUpiId(),
      upiUri,
      qrDataUrl,
    });
  } catch (err) {
    console.error("Could not build the donation UPI link:", err);
    return NextResponse.json({ configured: false });
  }
}
