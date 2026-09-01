import { NextResponse } from "next/server";
import QRCode from "qrcode";
import { verifyAdminRequest, isAdminConfigured } from "@/lib/firebaseAdmin";
import { isUpiConfigured, templeUpiId } from "@/lib/upi";

/**
 * Builds several variants of the same ₹1 payment link so a failing UPI app can
 * be diagnosed by elimination.
 *
 * When a bank refuses a payment it returns a generic message — "you have
 * exceeded the bank limit for this payment" turns up for causes that have
 * nothing to do with limits. The only reliable way to find out which field the
 * bank objects to is to remove them one at a time and see which link goes
 * through. That is what this produces.
 *
 * Admin-only: it exposes nothing secret (a VPA is a public payment address),
 * but it is a diagnostic tool, not something to leave on a devotee's path.
 */
export async function GET(req: Request) {
  if (!isAdminConfigured()) {
    return NextResponse.json({ error: "Server not configured." }, { status: 503 });
  }
  if (!(await verifyAdminRequest(req))) {
    return NextResponse.json({ error: "Not authorised" }, { status: 403 });
  }
  if (!isUpiConfigured()) {
    return NextResponse.json({ error: "TEMPLE_UPI_ID is not set." }, { status: 503 });
  }

  const vpa = templeUpiId();
  const name = (process.env.TEMPLE_UPI_NAME || "Sri Vinayaka Temple").trim();
  const enc = (pairs: [string, string][]) =>
    "upi://pay?" + pairs.map(([k, v]) => `${k}=${encodeURIComponent(v)}`).join("&");

  const variants = [
    {
      id: "current",
      label: "What the site sends now",
      why: "Payee, name, amount and a note carrying the booking reference.",
      uri: enc([["pa", vpa], ["pn", name], ["am", "1.00"], ["cu", "INR"], ["tn", "Seva SV-TEST01"]]),
    },
    {
      id: "no-name",
      label: "Without the payee name",
      why: "Some banks reject a payee name that doesn't match the one registered against the VPA.",
      uri: enc([["pa", vpa], ["am", "1.00"], ["cu", "INR"], ["tn", "Seva SV-TEST01"]]),
    },
    {
      id: "no-note",
      label: "Without the note",
      why: "Rules out the transaction note being rejected.",
      uri: enc([["pa", vpa], ["pn", name], ["am", "1.00"], ["cu", "INR"]]),
    },
    {
      id: "no-amount",
      label: "Without a fixed amount",
      why: "You type the amount yourself. If only this one works, the bank is refusing pre-filled amounts from a link.",
      uri: enc([["pa", vpa], ["pn", name], ["cu", "INR"]]),
    },
    {
      id: "bare",
      label: "Payee address only",
      why: "The simplest link UPI allows. If even this fails, the problem is the account or the bank, not the link.",
      uri: enc([["pa", vpa]]),
    },
    {
      id: "merchant",
      label: "With merchant fields (the old link)",
      why: "The version that produced the limit error. Included to confirm the diagnosis.",
      uri: enc([
        ["pa", vpa], ["pn", name], ["am", "1.00"], ["cu", "INR"],
        ["tn", "Seva SV-TEST01"], ["mc", "5499"], ["tr", "SVTEST01"],
      ]),
    },
  ];

  const withQr = await Promise.all(
    variants.map(async (v) => ({
      ...v,
      qr: await QRCode.toDataURL(v.uri, { margin: 1, width: 260 }),
    }))
  );

  return NextResponse.json({ vpa, name, variants: withQr });
}
