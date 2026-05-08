import jsPDF from "jspdf";
import "jspdf-autotable";
import { UserOptions } from "jspdf-autotable";
import { Booking } from "./firestore";

// Define interface to handle jspdf-autotable plugin types
interface jsPDFWithAutoTable extends jsPDF {
  autoTable: (options: UserOptions) => jsPDF;
  lastAutoTable: {
    finalY: number;
  };
}

/**
 * Generates a premium, temple-style PDF receipt.
 * Designed for print-friendliness and spiritual aesthetic.
 */
export const generatePremiumReceipt = (booking: Booking) => {
  const doc = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 20;
  let currentY = 25;

  // ─── Header ─────────────────────────────────────────────────────────────
  
  // Temple Name
  doc.setFont("times", "bold");
  doc.setFontSize(24);
  doc.setTextColor(154, 52, 18); // Deep Saffron (#9a3412)
  doc.text("SRI VINAYAKA TEMPLE", pageWidth / 2, currentY, { align: "center" });
  
  currentY += 8;
  
  // Location
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(100);
  doc.text("Sunkadakatte, Mudutonce, Karnataka - 574221", pageWidth / 2, currentY, { align: "center" });
  
  currentY += 12;
  
  // Title
  doc.setFont("times", "bold");
  doc.setFontSize(16);
  doc.setTextColor(180, 83, 9); // Gold-ish Saffron (#b45309)
  doc.text("SEVA RECEIPT", pageWidth / 2, currentY, { align: "center" });
  
  currentY += 6;
  
  // Thin Divider
  doc.setDrawColor(234, 88, 12, 0.2); // Very light saffron
  doc.setLineWidth(0.2);
  doc.line(margin, currentY, pageWidth - margin, currentY);
  
  currentY += 15;

  // ─── Devotee Info ───────────────────────────────────────────────────────
  
  // Left Side
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(150);
  doc.text("DEVOTEE DETAILS", margin, currentY);
  
  currentY += 6;
  doc.setFontSize(11);
  doc.setTextColor(40);
  doc.text(booking.userName.toUpperCase(), margin, currentY);
  
  currentY += 6;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.text(`Mobile: ${booking.phone}`, margin, currentY);
  
  if (booking.email) {
    currentY += 5;
    doc.text(`Email: ${booking.email}`, margin, currentY);
  }

  // Right Side (ID & Date)
  let rightY = currentY - (booking.email ? 17 : 12);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(150);
  doc.text("RECEIPT INFO", pageWidth - margin - 40, rightY);
  
  rightY += 6;
  doc.setFontSize(10);
  doc.setTextColor(40);
  doc.text(`ID: ${booking.bookingId}`, pageWidth - margin - 40, rightY);
  
  rightY += 5;
  doc.text(`Date: ${booking.bookingDate}`, pageWidth - margin - 40, rightY);

  currentY = Math.max(currentY, rightY) + 15;

  // ─── Seva Table ─────────────────────────────────────────────────────────
  
  const tableBody = booking.sevas.map((s) => [
    s.name,
    { content: `Rs. ${s.price.toLocaleString("en-IN")}`, styles: { halign: "right" as const } }
  ]);

  const pdf = doc as jsPDFWithAutoTable;
  pdf.autoTable({
    startY: currentY,
    head: [["SEVA NAME", "AMOUNT"]],
    body: tableBody,
    theme: "plain",
    headStyles: { 
      fillColor: [253, 252, 240], // Ivory
      textColor: [154, 52, 18], // Saffron
      fontStyle: "bold",
      fontSize: 10,
      lineWidth: 0.1,
      lineColor: [234, 88, 12]
    },
    styles: { 
      font: "helvetica",
      fontSize: 10,
      cellPadding: 5
    },
    columnStyles: {
      0: { cellWidth: "auto" },
      1: { cellWidth: 40 }
    },
    margin: { left: margin, right: margin }
  });

  currentY = pdf.lastAutoTable.finalY + 10;

  // ─── Total ──────────────────────────────────────────────────────────────
  
  doc.setDrawColor(234, 88, 12, 0.2);
  doc.line(pageWidth - margin - 60, currentY, pageWidth - margin, currentY);
  
  currentY += 8;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.setTextColor(40);
  doc.text("TOTAL AMOUNT", pageWidth - margin - 60, currentY);
  doc.text(`Rs. ${booking.totalAmount.toLocaleString("en-IN")}`, pageWidth - margin, currentY, { align: "right" });
  
  currentY += 20;

  // ─── Event Info ─────────────────────────────────────────────────────────
  
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(150);
  doc.text("EVENT INFORMATION", margin, currentY);
  
  currentY += 6;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(60);
  doc.text(`Sacred Event Date: ${booking.eventDate}`, margin, currentY);
  
  currentY += 5;
  doc.text(`Booking Recorded On: ${booking.bookingDate}`, margin, currentY);
  
  currentY += 15;

  // ─── Payment Section ────────────────────────────────────────────────────
  
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(150);
  doc.text("PAYMENT INFORMATION", margin, currentY);
  
  currentY += 6;
  doc.setFontSize(10);
  
  const isSuccess = booking.paymentStatus === "success";
  const statusColor = isSuccess ? [22, 101, 52] : [185, 28, 28]; // Green or Red
  doc.setTextColor(statusColor[0], statusColor[1], statusColor[2]);
  doc.text(`● ${booking.paymentStatus.toUpperCase()}`, margin, currentY);
  
  doc.setTextColor(60);
  doc.setFont("helvetica", "normal");
  doc.text(isSuccess ? "Via Razorpay Secure Checkout" : "Transaction could not be completed", margin + 35, currentY);

  if (booking.razorpayPaymentId) {
    currentY += 5;
    doc.setFontSize(8);
    doc.setTextColor(150);
    doc.text(`Transaction ID: ${booking.razorpayPaymentId}`, margin, currentY);
  }

  // ─── Footer ─────────────────────────────────────────────────────────────
  
  currentY = doc.internal.pageSize.getHeight() - 40;
  
  doc.setDrawColor(234, 88, 12, 0.1);
  doc.line(margin, currentY, pageWidth - margin, currentY);
  
  currentY += 10;
  doc.setFont("times", "italic");
  doc.setFontSize(11);
  doc.setTextColor(154, 52, 18);
  doc.text("May the divine blessings of Lord Sri Vinayaka be with you and your family.", pageWidth / 2, currentY, { align: "center" });
  
  currentY += 6;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(150);
  doc.text("This is an electronically generated sacred receipt. No signature is required.", pageWidth / 2, currentY, { align: "center" });
  
  currentY += 5;
  doc.text("Mudutonce Temple Administration", pageWidth / 2, currentY, { align: "center" });

  return doc;
};
