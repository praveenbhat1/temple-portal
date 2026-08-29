import jsPDF from "jspdf";
import "jspdf-autotable";
import { UserOptions } from "jspdf-autotable";
import { Booking } from "./firestore";
import { TEMPLE_BANK_LINE } from "./templeBank";
import { prettyDate } from "./messages";
import { TEMPLE_LOGO_JPEG } from "./templeLogo";

/** Where the temple actually is. Was two versions out of date on the receipt. */
const TEMPLE_ADDRESS = "Kallianpur Main Road, near Santhekatte, Udupi, Karnataka - 576115";

// Define interface to handle jspdf-autotable plugin types
interface jsPDFWithAutoTable extends jsPDF {
  autoTable: (options: UserOptions) => jsPDF;
  lastAutoTable: {
    finalY: number;
  };
}

/** How the money actually reached the temple, in the devotee's words. */
function paymentMethodLabel(booking: Booking, isSuccess: boolean): string {
  if (!isSuccess) return "Payment was not completed";
  if (booking.razorpayPaymentId) return "Via Razorpay Secure Checkout";
  if (booking.paymentMethod === "upi-manual") return "Via UPI, verified by the temple office";
  return `Received by the temple (${TEMPLE_BANK_LINE})`;
}

/**
 * Generates a premium, temple-style PDF receipt.
 * Designed for print-friendliness and spiritual aesthetic.
 */
export const generatePremiumReceipt = (booking: Booking) => {
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const W = doc.internal.pageSize.getWidth();
  const H = doc.internal.pageSize.getHeight();
  const M = 18;

  const SAFFRON: [number, number, number] = [154, 52, 18];
  const GOLD: [number, number, number] = [180, 140, 45];
  const INK: [number, number, number] = [45, 36, 30];
  const MUTED: [number, number, number] = [140, 132, 124];
  const GREEN: [number, number, number] = [22, 101, 52];
  const RED: [number, number, number] = [153, 27, 27];

  const isSuccess = booking.paymentStatus === "success";
  const statusColor = isSuccess ? GREEN : RED;

  // ── Page frame ──────────────────────────────────────────────────────────
  doc.setDrawColor(...GOLD);
  doc.setLineWidth(0.8);
  doc.rect(M - 6, M - 6, W - (M - 6) * 2, H - (M - 6) * 2);
  doc.setLineWidth(0.2);
  doc.rect(M - 4, M - 4, W - (M - 4) * 2, H - (M - 4) * 2);

  let y = M + 6;

  // ── Masthead ────────────────────────────────────────────────────────────
  const LOGO = 17;
  doc.addImage(TEMPLE_LOGO_JPEG, "JPEG", W / 2 - LOGO / 2, y - 2, LOGO, LOGO);
  y += LOGO + 5;

  doc.setFont("times", "bold");
  doc.setFontSize(9);
  doc.setTextColor(...GOLD);
  doc.text("SHREE", W / 2, y, { align: "center" });

  y += 9;
  doc.setFontSize(23);
  doc.setTextColor(...SAFFRON);
  doc.text("SRI VINAYAKA TEMPLE", W / 2, y, { align: "center" });

  y += 6;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.setTextColor(...MUTED);
  doc.text(TEMPLE_ADDRESS, W / 2, y, { align: "center" });

  y += 7;
  doc.setDrawColor(...GOLD);
  doc.setLineWidth(0.4);
  doc.line(W / 2 - 26, y, W / 2 + 26, y);

  // ── Title band, with the payment status as a pill ───────────────────────
  y += 10;
  doc.setFillColor(255, 251, 240);
  doc.setDrawColor(240, 210, 150);
  doc.setLineWidth(0.3);
  doc.roundedRect(M, y - 6, W - M * 2, 17, 2, 2, "FD");

  doc.setFont("times", "bold");
  doc.setFontSize(14);
  doc.setTextColor(...SAFFRON);
  doc.text("SEVA RECEIPT", W / 2, y, { align: "center" });

  // A filled pill rather than a bullet character. "●" is not in the standard
  // PDF font's WinAnsi encoding and rendered as mojibake ("%ï PAID").
  const pillText = isSuccess ? "PAID" : booking.paymentStatus.toUpperCase();
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7.5);
  const pillW = doc.getTextWidth(pillText) + 10;
  doc.setFillColor(...statusColor);
  doc.roundedRect(W / 2 - pillW / 2, y + 2, pillW, 6, 3, 3, "F");
  doc.setTextColor(255, 255, 255);
  doc.text(pillText, W / 2, y + 6.2, { align: "center" });

  // ── Devotee / receipt info ──────────────────────────────────────────────
  y += 22;
  const colR = W / 2 + 4;

  const label = (text: string, x: number, yy: number) => {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(7);
    doc.setTextColor(...MUTED);
    doc.text(text, x, yy);
  };

  label("DEVOTEE", M, y);
  label("RECEIPT REFERENCE", colR, y);
  y += 5.5;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(...INK);
  doc.text(booking.userName.toUpperCase(), M, y);

  doc.setFont("courier", "bold");
  doc.setFontSize(12);
  doc.setTextColor(...SAFFRON);
  doc.text(booking.bookingId, colR, y);

  y += 6;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(...INK);
  doc.text(`Mobile  ${booking.phone}`, M, y);
  doc.setTextColor(...MUTED);
  doc.text(`Issued on  ${prettyDate(booking.bookingDate)}`, colR, y);

  if (booking.email) {
    y += 5;
    doc.setTextColor(...INK);
    doc.text(`Email  ${booking.email}`, M, y);
  }

  // ── Sevas ───────────────────────────────────────────────────────────────
  y += 12;
  const pdf = doc as jsPDFWithAutoTable;
  pdf.autoTable({
    startY: y,
    head: [["SEVA", "AMOUNT"]],
    body: booking.sevas.map((s) => [
      s.name,
      { content: `Rs. ${s.price.toLocaleString("en-IN")}`, styles: { halign: "right" as const } },
    ]),
    theme: "grid",
    headStyles: {
      fillColor: [255, 249, 240],
      textColor: SAFFRON,
      fontStyle: "bold",
      fontSize: 8,
      cellPadding: 3.5,
      lineWidth: 0.2,
      lineColor: [235, 205, 150],
    },
    bodyStyles: {
      fontSize: 9.5,
      cellPadding: 3.5,
      textColor: INK,
      lineWidth: 0.1,
      lineColor: [232, 228, 222],
    },
    alternateRowStyles: { fillColor: [252, 250, 246] },
    columnStyles: { 0: { cellWidth: "auto" }, 1: { cellWidth: 36 } },
    margin: { left: M, right: M },
  });

  y = pdf.lastAutoTable.finalY;

  // ── Total ───────────────────────────────────────────────────────────────
  const barW = 78;
  const barX = W - M - barW;
  doc.setFillColor(...SAFFRON);
  doc.roundedRect(barX, y + 4, barW, 12, 1.5, 1.5, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.setTextColor(255, 245, 230);
  doc.text("TOTAL RECEIVED", barX + 5, y + 11.5);
  doc.setFontSize(12);
  doc.setTextColor(255, 255, 255);
  doc.text(`Rs. ${booking.totalAmount.toLocaleString("en-IN")}`, barX + barW - 5, y + 11.5, {
    align: "right",
  });

  label("SEVA DATE", M, y + 8);
  doc.setFont("times", "bold");
  doc.setFontSize(12);
  doc.setTextColor(...INK);
  doc.text(prettyDate(booking.eventDate), M, y + 15);

  // ── How it was paid ─────────────────────────────────────────────────────
  y += 28;
  label("PAYMENT", M, y);
  y += 6;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(...INK);
  doc.text(paymentMethodLabel(booking, isSuccess), M, y);

  const reference = booking.razorpayPaymentId || booking.upiRef;
  if (reference) {
    y += 5.5;
    doc.setFont("courier", "normal");
    doc.setFontSize(8.5);
    doc.setTextColor(...MUTED);
    doc.text(`Reference  ${reference}`, M, y);
  }
  if (booking.confirmedBy) {
    y += 5;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(...MUTED);
    doc.text("Verified by the temple office.", M, y);
  }

  // ── Footer ──────────────────────────────────────────────────────────────
  const fy = H - M - 12;
  doc.setDrawColor(...GOLD);
  doc.setLineWidth(0.4);
  doc.line(W / 2 - 26, fy - 8, W / 2 + 26, fy - 8);

  doc.setFont("times", "italic");
  doc.setFontSize(10);
  doc.setTextColor(...SAFFRON);
  doc.text("May the blessings of Lord Sri Vinayaka be with you and your family.", W / 2, fy - 2, {
    align: "center",
  });

  doc.setFont("helvetica", "normal");
  doc.setFontSize(7);
  doc.setTextColor(...MUTED);
  doc.text(
    "Electronically generated  ·  no signature required  ·  Sunkadakatte Sri Vinayaka Temple Administration",
    W / 2,
    fy + 4,
    { align: "center" }
  );

  return doc;
};

/**
 * A booking acknowledgement for a payment that has NOT been verified yet.
 *
 * Deliberately not a receipt, and it says so in three places. A devotee who
 * has just paid by UPI wants something to hold — a reference, an amount, what
 * happens next — but handing them a document headed "RECEIPT" for money the
 * temple has not confirmed receiving would be a lie they could reasonably act
 * on, and could present at the temple. So this is titled, worded and coloured
 * as an acknowledgement, and the real receipt only appears once an admin has
 * matched the credit.
 */
export const generateBookingAcknowledgement = (booking: {
  bookingId: string;
  userName: string;
  phone: string;
  sevas: { name: string; price: number }[];
  totalAmount: number;
  eventDate: string;
  bookingDate: string;
}) => {
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const W = doc.internal.pageSize.getWidth();
  const H = doc.internal.pageSize.getHeight();
  const M = 18;

  const SAFFRON: [number, number, number] = [154, 52, 18];
  const GOLD: [number, number, number] = [180, 140, 45];
  const INK: [number, number, number] = [45, 36, 30];
  const MUTED: [number, number, number] = [140, 132, 124];

  // ── Framed page ─────────────────────────────────────────────────────────
  // A double rule around the whole sheet. The old version was a stack of
  // left-aligned lines with no structure, which read as a printout rather
  // than as something a temple hands you.
  doc.setDrawColor(...GOLD);
  doc.setLineWidth(0.8);
  doc.rect(M - 6, M - 6, W - (M - 6) * 2, H - (M - 6) * 2);
  doc.setLineWidth(0.2);
  doc.rect(M - 4, M - 4, W - (M - 4) * 2, H - (M - 4) * 2);

  let y = M + 6;

  // ── Header ──────────────────────────────────────────────────────────────
  // The temple's own mark, centred above the name.
  const LOGO = 17;
  doc.addImage(TEMPLE_LOGO_JPEG, "JPEG", W / 2 - LOGO / 2, y - 2, LOGO, LOGO);
  y += LOGO + 5;

  doc.setFont("times", "bold");
  doc.setFontSize(9);
  doc.setTextColor(...GOLD);
  doc.text("SHREE", W / 2, y, { align: "center" });

  y += 9;
  doc.setFontSize(23);
  doc.setTextColor(...SAFFRON);
  doc.text("SRI VINAYAKA TEMPLE", W / 2, y, { align: "center" });

  y += 6;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.setTextColor(...MUTED);
  doc.text(TEMPLE_ADDRESS, W / 2, y, { align: "center" });

  y += 7;
  doc.setDrawColor(...GOLD);
  doc.setLineWidth(0.4);
  doc.line(W / 2 - 26, y, W / 2 + 26, y);

  // ── Title band ──────────────────────────────────────────────────────────
  y += 10;
  doc.setFillColor(255, 251, 240);
  doc.setDrawColor(240, 210, 150);
  doc.setLineWidth(0.3);
  doc.roundedRect(M, y - 6, W - M * 2, 17, 2, 2, "FD");

  doc.setFont("times", "bold");
  doc.setFontSize(14);
  doc.setTextColor(...SAFFRON);
  doc.text("BOOKING ACKNOWLEDGEMENT", W / 2, y, { align: "center" });

  doc.setFont("helvetica", "bold");
  doc.setFontSize(7.5);
  doc.setTextColor(185, 28, 28);
  doc.text("PAYMENT NOT YET VERIFIED  ·  THIS IS NOT A RECEIPT", W / 2, y + 6, {
    align: "center",
  });

  // ── Devotee / booking, as two aligned columns ───────────────────────────
  y += 22;
  const colR = W / 2 + 4;

  const label = (text: string, x: number, yy: number) => {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(7);
    doc.setTextColor(...MUTED);
    doc.text(text, x, yy);
  };
  const value = (text: string, x: number, yy: number, bold = false) => {
    doc.setFont("helvetica", bold ? "bold" : "normal");
    doc.setFontSize(10);
    doc.setTextColor(...INK);
    doc.text(text, x, yy);
  };

  label("DEVOTEE", M, y);
  label("BOOKING REFERENCE", colR, y);
  y += 5.5;
  value(booking.userName.toUpperCase(), M, y, true);
  doc.setFont("courier", "bold");
  doc.setFontSize(12);
  doc.setTextColor(...SAFFRON);
  doc.text(booking.bookingId, colR, y);

  y += 6;
  value(`Mobile  ${booking.phone}`, M, y);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(...MUTED);
  doc.text(`Booked on  ${prettyDate(booking.bookingDate)}`, colR, y);

  // ── Sevas ───────────────────────────────────────────────────────────────
  y += 12;
  const pdf = doc as jsPDFWithAutoTable;
  pdf.autoTable({
    startY: y,
    head: [["SEVA", "AMOUNT"]],
    body: booking.sevas.map((s) => [
      s.name,
      { content: `Rs. ${s.price.toLocaleString("en-IN")}`, styles: { halign: "right" as const } },
    ]),
    theme: "grid",
    headStyles: {
      fillColor: [255, 249, 240],
      textColor: SAFFRON,
      fontStyle: "bold",
      fontSize: 8,
      cellPadding: 3.5,
      lineWidth: 0.2,
      lineColor: [235, 205, 150],
    },
    bodyStyles: {
      fontSize: 9.5,
      cellPadding: 3.5,
      textColor: INK,
      lineWidth: 0.1,
      lineColor: [232, 228, 222],
    },
    alternateRowStyles: { fillColor: [252, 250, 246] },
    columnStyles: { 0: { cellWidth: "auto" }, 1: { cellWidth: 36 } },
    margin: { left: M, right: M },
  });

  y = pdf.lastAutoTable.finalY;

  // ── Total, as a filled bar rather than a floating line ──────────────────
  const barW = 78;
  const barX = W - M - barW;
  doc.setFillColor(...SAFFRON);
  doc.roundedRect(barX, y + 4, barW, 12, 1.5, 1.5, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.setTextColor(255, 245, 230);
  doc.text("AMOUNT PAYABLE", barX + 5, y + 11.5);
  doc.setFontSize(12);
  doc.setTextColor(255, 255, 255);
  doc.text(`Rs. ${booking.totalAmount.toLocaleString("en-IN")}`, barX + barW - 5, y + 11.5, {
    align: "right",
  });

  // ── Seva date ───────────────────────────────────────────────────────────
  label("SEVA DATE", M, y + 8);
  doc.setFont("times", "bold");
  doc.setFontSize(12);
  doc.setTextColor(...INK);
  doc.text(prettyDate(booking.eventDate), M, y + 15);

  // ── What happens next ───────────────────────────────────────────────────
  y += 26;
  doc.setFillColor(255, 251, 235);
  doc.setDrawColor(250, 225, 160);
  doc.setLineWidth(0.3);
  doc.roundedRect(M, y, W - M * 2, 30, 2, 2, "FD");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.setTextColor(146, 64, 14);
  doc.text("WHAT HAPPENS NEXT", M + 6, y + 8);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.setTextColor(120, 83, 20);
  doc.text(
    doc.splitTextToSize(
      "The temple office checks each payment against its bank statement. Once yours is traced, the seva is confirmed, you receive a message on the mobile number above, and your receipt becomes available on the Track Seva page using this reference.",
      W - M * 2 - 12
    ),
    M + 6,
    y + 14
  );

  // ── Footer ──────────────────────────────────────────────────────────────
  const fy = H - M - 12;
  doc.setDrawColor(...GOLD);
  doc.setLineWidth(0.4);
  doc.line(W / 2 - 26, fy - 8, W / 2 + 26, fy - 8);

  doc.setFont("times", "italic");
  doc.setFontSize(10);
  doc.setTextColor(...SAFFRON);
  doc.text("May the blessings of Lord Sri Vinayaka be with you.", W / 2, fy - 2, {
    align: "center",
  });

  doc.setFont("helvetica", "normal");
  doc.setFontSize(7);
  doc.setTextColor(...MUTED);
  doc.text(
    "Not valid as proof of payment  ·  Sunkadakatte Sri Vinayaka Temple Administration",
    W / 2,
    fy + 4,
    { align: "center" }
  );

  return doc;
};
