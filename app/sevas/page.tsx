"use client";
import React, { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import {
  subscribeSevas,
  createUpiBooking,
  Seva,
  Booking,
  UpiBookingIntent,
} from "@/lib/firestore";
import { Calendar, User, Phone, CheckCircle2, X, ShoppingBag, Download, CreditCard, Mail, Heart, ArrowRight, Smartphone, Clock3 } from "lucide-react";
import SevaBoard from "@/components/SevaBoard";
import UpiPayStep from "@/components/UpiPayStep";
import { ALL_SEVAS } from "@/lib/sevaData";
import Link from "next/link";
import { normalizePhone, isValidIndianPhone } from "@/lib/utils";
import { generatePremiumReceipt, generateBookingAcknowledgement } from "@/lib/receipt";

/** Shape of the payload Razorpay hands back on a failed payment. */
type RazorpayFailure = { error?: { description?: string; reason?: string; code?: string } };

/** Only the fields we actually pass to Razorpay Checkout. */
interface RazorpayOptions {
  key: string;
  amount: number;
  currency: string;
  name: string;
  description: string;
  order_id: string;
  notes?: Record<string, string>;
  handler: (response: {
    razorpay_payment_id: string;
    razorpay_order_id: string;
    razorpay_signature: string;
  }) => void | Promise<void>;
  modal?: { ondismiss?: () => void };
  prefill?: { name?: string; contact?: string; email?: string };
  theme?: { color?: string };
}

declare global {
  interface Window {
    Razorpay: new (options: RazorpayOptions) => {
      open: () => void;
      on: (event: "payment.failed", handler: (response: RazorpayFailure) => void) => void;
    };
  }
}

function todayISO() {
  return new Date().toISOString().split("T")[0];
}

/**
 * Which payment path the site is running.
 *
 * "upi"      — devotee pays by UPI intent/QR, a temple admin confirms it by
 *              hand in /admin/bookings. No gateway, no fees, no card support.
 * "razorpay" — the gateway flow below. Set NEXT_PUBLIC_PAYMENT_MODE=razorpay to
 *              switch back to it; nothing about it was removed.
 */
const PAYMENT_MODE: "upi" | "razorpay" =
  process.env.NEXT_PUBLIC_PAYMENT_MODE === "razorpay" ? "razorpay" : "upi";

const RAZORPAY_SRC = "https://checkout.razorpay.com/v1/checkout.js";

/**
 * Resolve once the Razorpay checkout script is genuinely ready.
 *
 * Previously the script was appended and then used immediately, so submitting
 * before it finished loading threw "window.Razorpay is not a constructor" and
 * the checkout never opened.
 */
function loadRazorpay(): Promise<void> {
  return new Promise((resolve, reject) => {
    if (typeof window !== "undefined" && window.Razorpay) return resolve();

    const existing = document.getElementById("razorpay-script") as HTMLScriptElement | null;
    const script = existing ?? document.createElement("script");

    const onLoad = () => (window.Razorpay ? resolve() : reject(new Error("script_no_global")));
    const onError = () => reject(new Error("script_blocked"));

    script.addEventListener("load", onLoad, { once: true });
    script.addEventListener("error", onError, { once: true });

    if (!existing) {
      script.id = "razorpay-script";
      script.src = RAZORPAY_SRC;
      script.async = true;
      document.body.appendChild(script);
    }

    // Don't hang forever if the network swallows it.
    window.setTimeout(() => reject(new Error("script_timeout")), 15000);
  });
}

// ─── Unified Booking Form ─────────────────────────────────────────────────────

interface BookingFormProps {
  selectedSevas: Seva[];
  /** Today's date (YYYY-MM-DD), captured when the modal was opened. */
  defaultDate: string;
  /** Manual UPI flow — the devotee says they have paid, awaiting confirmation. */
  onAwaitingConfirmation: (booking: AwaitingBooking) => void;
  onSuccess: (booking: {
    bookingId: string;
    userName: string;
    phone: string;
    email?: string;
    sevas: { sevaId: string; name: string; price: number }[];
    totalAmount: number;
    bookingDate: string;
    eventDate: string;
    paymentStatus: "success";
    razorpayOrderId: string;
    razorpayPaymentId: string;
    id?: string;
  }) => void;
}

function BookingForm({ selectedSevas, defaultDate, onAwaitingConfirmation, onSuccess }: BookingFormProps) {
  const totalAmount = selectedSevas.reduce((acc, s) => acc + s.price, 0);
  // defaultDate is computed by the caller's click handler, so today's date never
  // has to be read during render or patched in from an effect.
  const [form, setForm] = useState({ userName: "", phone: "", email: "", eventDate: defaultDate });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  /** Set once the pending booking exists and the devotee needs to pay by UPI. */
  const [upiIntent, setUpiIntent] = useState<UpiBookingIntent | null>(null);

  useEffect(() => {
    if (PAYMENT_MODE !== "razorpay") return;
    // Warm the checkout script up front; handlePay awaits it regardless.
    loadRazorpay().catch(() => {
      /* surfaced on submit instead of nagging on open */
    });
  }, []);

  /** Shared front-half of both flows: validate, then hand back clean values. */
  const validate = (): { phone: string } | null => {
    if (!form.userName || !form.phone || !form.eventDate) {
      setError("Please fill all required fields.");
      return null;
    }
    if (!isValidIndianPhone(form.phone)) {
      setError("Please enter a valid 10-digit mobile number.");
      return null;
    }
    return { phone: normalizePhone(form.phone) };
  };

  /**
   * Manual UPI flow: record a pending booking, then show the devotee a QR and
   * an intent link carrying the booking reference. No payment is proven here.
   */
  const handleUpi = async (e: React.FormEvent) => {
    e.preventDefault();
    const valid = validate();
    if (!valid) return;

    setSubmitting(true);
    setError("");

    try {
      const intent = await createUpiBooking({
        userName: form.userName,
        phone: valid.phone,
        email: form.email.trim() || undefined,
        sevaIds: selectedSevas.map((s) => s.id!),
        eventDate: form.eventDate,
      });
      setUpiIntent(intent);
    } catch (err) {
      setError((err as Error).message || "Could not start the booking. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const handlePay = async (e: React.FormEvent) => {
    e.preventDefault();

    const valid = validate();
    if (!valid) return;

    setSubmitting(true);
    setError("");

    const normalizedPhone = valid.phone;
    const sevaLines = selectedSevas.map(s => ({ sevaId: s.id!, name: s.name, price: s.price }));

    try {
      // 1. Make sure the checkout script is actually usable before we need it.
      try {
        await loadRazorpay();
      } catch {
        throw new Error(
          "The payment window could not be loaded. Please check your internet connection " +
            "or disable any ad blocker, then try again."
        );
      }

      const publishableKey = process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID;
      if (!publishableKey) {
        throw new Error("Online payment is not configured for this temple yet.");
      }

      // 2. Create the order server-side.
      const orderRes = await fetch("/api/razorpay/order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount: totalAmount }),
      });

      const order = await orderRes.json().catch(() => ({}));
      // The server owns the booking reference.
      const bookingId: string = order?.bookingId;

      if (!orderRes.ok) {
        // Log everything, show the devotee something actionable.
        console.error("Order creation failed:", order);
        if (order?.reason === "razorpay_auth_failed") {
          throw new Error(
            "Online payment is temporarily unavailable — the temple's payment credentials " +
              "need to be renewed. Please try again later or contact the temple office."
          );
        }
        throw new Error(order?.error || "Could not start the payment. Please try again.");
      }

      // 3. Open checkout.
      const options = {
        key: publishableKey,
        amount: order.amount,
        currency: order.currency,
        name: "Sri Vinayaka Temple",
        description:
          selectedSevas.length === 1
            ? `Seva: ${selectedSevas[0].name}`
            : `Sacred Offering: ${selectedSevas.length} Sevas`,
        order_id: order.id,
        notes: { bookingId, userName: form.userName, phone: normalizedPhone, eventDate: form.eventDate },
        handler: async (response: {
          razorpay_payment_id: string;
          razorpay_order_id: string;
          razorpay_signature: string;
        }) => {
          try {
            // 4. The server verifies the signature and writes the booking.
            const verifyRes = await fetch("/api/razorpay/verify", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                ...response,
                bookingId,
                userName: form.userName,
                phone: normalizedPhone,
                email: form.email.trim() || "",
                sevas: sevaLines,
                eventDate: form.eventDate,
              }),
            });

            const result = await verifyRes.json().catch(() => ({}));

            if (!verifyRes.ok) {
              console.error("Payment verification failed:", result);
              setError(
                result?.reason === "bad_signature"
                  ? "This payment could not be verified. Please contact the temple office with your payment ID: " +
                      response.razorpay_payment_id
                  : "Your payment went through but we could not save the booking. Please keep this " +
                      `payment ID and contact the temple office: ${response.razorpay_payment_id}`
              );
              setSubmitting(false);
              return;
            }

            onSuccess({
              bookingId: result.bookingId ?? bookingId,
              userName: result.userName ?? form.userName,
              phone: result.phone ?? normalizedPhone,
              email: result.email ?? form.email.trim(),
              sevas: result.sevas ?? sevaLines,
              totalAmount: result.totalAmount ?? totalAmount,
              bookingDate: result.bookingDate ?? todayISO(),
              eventDate: result.eventDate ?? form.eventDate,
              paymentStatus: "success",
              razorpayOrderId: response.razorpay_order_id,
              razorpayPaymentId: response.razorpay_payment_id,
              id: result.id,
            });
          } catch (err) {
            console.error("Verification request threw:", err);
            setError(
              "Your payment went through but confirmation failed. Please keep this payment ID " +
                `and contact the temple office: ${response.razorpay_payment_id}`
            );
          } finally {
            setSubmitting(false);
          }
        },
        modal: { ondismiss: () => setSubmitting(false) },
        prefill: { name: form.userName, contact: normalizedPhone, email: form.email },
        theme: { color: "#c2410c" },
      };

      const rzp = new window.Razorpay(options);
      rzp.on("payment.failed", (response: RazorpayFailure) => {
        console.error("Razorpay payment failed:", response.error);
        setError(
          response.error?.description
            ? `Payment failed: ${response.error.description}`
            : "Payment could not be completed. Please try again."
        );
        setSubmitting(false);
      });
      rzp.open();
    } catch (err) {
      const errorObj = err as Error;
      console.error("Payment initiation error:", errorObj);
      setError(errorObj.message || "Payment could not be completed. Please try again.");
      setSubmitting(false);
    }
  };

  // Once the pending booking exists, the form is replaced by the pay-by-UPI
  // step — going back would only orphan the booking that was just created.
  if (upiIntent) {
    return (
      <UpiPayStep
        intent={upiIntent}
        onPaid={() =>
          onAwaitingConfirmation({
            intent: upiIntent,
            userName: form.userName,
            phone: normalizePhone(form.phone),
            eventDate: form.eventDate,
          })
        }
      />
    );
  }

  return (
    <div className="flex flex-col lg:grid lg:grid-cols-2 gap-10">
      {/* Summary Panel */}
      <div className="bg-saffron-50/50 rounded-3xl p-6 md:p-8 border border-saffron-100 h-fit">
        <h3 className="font-serif text-xl text-gray-900 mb-6 flex items-center gap-2">
          <ShoppingBag size={20} className="text-saffron-600" />
          Offering Summary
        </h3>
        <div className="space-y-4 mb-6">
          {selectedSevas.map(s => (
            <div key={s.id} className="flex justify-between items-center text-sm">
              <span className="text-gray-600">{s.name}</span>
              <span className="font-bold text-gray-900">₹{s.price.toLocaleString("en-IN")}</span>
            </div>
          ))}
        </div>
        <div className="pt-6 border-t border-saffron-200 flex justify-between items-center">
          <span className="text-gray-500 uppercase tracking-widest text-[10px] font-bold">Total Dakshina</span>
          <span className="text-2xl font-bold text-saffron-700 font-serif">₹{totalAmount.toLocaleString("en-IN")}</span>
        </div>
      </div>

      {/* Inputs */}
      <form onSubmit={PAYMENT_MODE === "razorpay" ? handlePay : handleUpi} className="space-y-6">
        <div className="relative">
          <label className="text-[10px] uppercase tracking-widest font-bold text-gray-400 mb-2 block px-1">Devotee Name</label>
          <div className="relative">
            <User className="absolute left-4 top-1/2 -translate-y-1/2 text-saffron-600/50" size={18} />
            <input
              type="text" required
              value={form.userName}
              onChange={(e) => {
                setForm({ ...form, userName: e.target.value });
                setError("");
              }}
              placeholder="Full name"
              className="w-full bg-white border border-saffron-100 rounded-2xl pl-12 pr-4 py-4 text-sm focus:outline-none focus:ring-2 focus:ring-saffron-400/20 transition-all shadow-sm"
            />
          </div>
        </div>

        <div className="relative">
          <label className="text-[10px] uppercase tracking-widest font-bold text-gray-400 mb-2 block px-1">Mobile Number</label>
          <div className="relative">
            <div className="absolute left-4 top-1/2 -translate-y-1/2 flex items-center gap-2 border-r border-saffron-100 pr-3">
              <Phone className="text-saffron-600/50" size={18} />
              <span className="text-xs font-bold text-gray-400">+91</span>
            </div>
            <input
              type="tel" required
              value={form.phone}
              onChange={(e) => {
                setForm({ ...form, phone: e.target.value });
                setError("");
              }}
              placeholder="XXXXXXXXXX"
              maxLength={10}
              className="w-full bg-white border border-saffron-100 rounded-2xl pl-24 pr-4 py-4 text-sm focus:outline-none focus:ring-2 focus:ring-saffron-400/20 transition-all shadow-sm"
            />
          </div>
        </div>

        <div className="relative">
          <label className="text-[10px] uppercase tracking-widest font-bold text-gray-400 mb-2 block px-1">Email Address (Optional)</label>
          <div className="relative">
            <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-saffron-600/50" size={18} />
            <input
              type="email"
              value={form.email}
              onChange={(e) => {
                setForm({ ...form, email: e.target.value });
                setError("");
              }}
              placeholder="devotee@example.com"
              className="w-full bg-white border border-saffron-100 rounded-2xl pl-12 pr-4 py-4 text-sm focus:outline-none focus:ring-2 focus:ring-saffron-400/20 transition-all shadow-sm"
            />
          </div>
        </div>

        <div className="relative">
          <label className="text-[10px] uppercase tracking-widest font-bold text-gray-400 mb-2 block px-1">Preferred Date</label>
          <div className="relative">
            <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 text-saffron-600/50" size={18} />
            <input
              type="date" required
              value={form.eventDate}
              onChange={(e) => {
                setForm({ ...form, eventDate: e.target.value });
                setError("");
              }}
              min={todayISO()}
              className="w-full bg-white border border-saffron-100 rounded-2xl pl-12 pr-4 py-4 text-sm focus:outline-none focus:ring-2 focus:ring-saffron-400/20 transition-all shadow-sm"
            />
          </div>
        </div>

        {error && <p className="text-red-500 text-xs font-bold text-center">{error}</p>}

        <button
          type="submit" disabled={submitting}
          className="w-full bg-saffron-700 hover:bg-saffron-800 disabled:opacity-60 text-ivory font-bold py-5 rounded-2xl transition-all shadow-xl shadow-saffron-700/20 text-sm flex items-center justify-center gap-3 group"
        >
          {submitting ? (
            PAYMENT_MODE === "razorpay" ? "Processing Payment…" : "Preparing your UPI payment…"
          ) : PAYMENT_MODE === "razorpay" ? (
            <>
              <CreditCard size={18} />
              Proceed to Payment
            </>
          ) : (
            <>
              <Smartphone size={18} />
              Continue to UPI Payment
            </>
          )}
        </button>
      </form>
    </div>
  );
}

// ─── Modal wrapper ─────────────────────────────────────────────────────────────

function BookingModal({ selectedSevas, defaultDate, onClose, onAwaitingConfirmation, onSuccess }: { selectedSevas: Seva[], defaultDate: string, onClose: () => void, onAwaitingConfirmation: (booking: AwaitingBooking) => void, onSuccess: (b: {
    bookingId: string;
    userName: string;
    phone: string;
    email?: string;
    sevas: { sevaId: string; name: string; price: number }[];
    totalAmount: number;
    bookingDate: string;
    eventDate: string;
    paymentStatus: "success";
    razorpayOrderId: string;
    razorpayPaymentId: string;
    id?: string;
  }) => void }) {
  return (
    <div className="fixed inset-0 z-[300] bg-foreground/40 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in overflow-y-auto">
      <div className="bg-white rounded-[2.5rem] md:rounded-[3rem] shadow-2xl w-full max-w-4xl p-6 md:p-10 lg:p-12 my-auto relative">
        <button 
          onClick={onClose} 
          className="absolute top-4 md:top-6 right-4 md:right-6 text-gray-400 hover:text-gray-900 transition-colors p-2 hover:bg-gray-50 rounded-full"
        >
          <X size={24} />
        </button>
        
        <div className="mb-8 md:mb-10 text-center">
          <span className="text-[10px] uppercase tracking-[0.3em] font-bold text-saffron-600 block mb-3 md:mb-4">Sacred Booking</span>
          <h2 className="text-2xl md:text-3xl font-serif text-gray-900">Complete Your Offering</h2>
          <div className="w-12 h-0.5 bg-gold-400 mx-auto mt-4" />
        </div>

        <BookingForm
          selectedSevas={selectedSevas}
          defaultDate={defaultDate}
          onAwaitingConfirmation={onAwaitingConfirmation}
          onSuccess={onSuccess}
        />
      </div>
    </div>
  );
}

// ─── Success Component ────────────────────────────────────────────────────────

function SuccessView({ booking, onClose }: { booking: Booking, onClose: () => void }) {
  const download = () => {
    const doc = generatePremiumReceipt(booking);
    doc.save(`Receipt_SriVinayaka_${booking.bookingId}.pdf`);
  };

  return (
    <div className="fixed inset-0 z-[300] bg-foreground/40 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
      <div className="bg-white rounded-[2.5rem] md:rounded-[3rem] shadow-2xl w-full max-w-xl p-8 md:p-12 text-center relative">
        <div className="w-20 h-20 bg-green-50 rounded-full flex items-center justify-center mx-auto mb-8 text-green-600">
          <CheckCircle2 size={40} />
        </div>
        <h2 className="text-3xl font-serif text-gray-900 mb-4">Divine Offering Received</h2>
        <p className="text-gray-500 font-sans leading-relaxed mb-10">
          May Lord Sri Vinayaka bless you. Your sevas have been successfully scheduled. You can now download your sacred receipt.
        </p>

        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <button
            onClick={download}
            className="flex-1 bg-saffron-600 hover:bg-saffron-700 text-white px-8 py-4 rounded-full font-bold transition-all flex items-center justify-center gap-2 shadow-lg shadow-saffron-100"
          >
            <Download size={18} />
            Download Receipt
          </button>
          <button
            onClick={onClose}
            className="flex-1 border border-gray-200 text-gray-700 px-8 py-4 rounded-full font-bold hover:bg-gray-50 transition-all"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Awaiting-confirmation Component ──────────────────────────────────────────

/** What the awaiting screen needs beyond the payment intent itself. */
export interface AwaitingBooking {
  intent: UpiBookingIntent;
  userName: string;
  phone: string;
  eventDate: string;
}

/**
 * The end of the manual UPI flow.
 *
 * Deliberately does NOT offer a receipt: no payment has been verified yet, and
 * handing over a receipt for money the temple has not confirmed receiving would
 * be a lie the devotee could reasonably act on. What it offers instead is an
 * acknowledgement PDF that says so on its face — the devotee still gets
 * something to keep, without it being able to pass for proof of payment.
 */
function AwaitingConfirmationView({
  booking,
  onClose,
}: {
  booking: AwaitingBooking;
  onClose: () => void;
}) {
  const { intent } = booking;

  const downloadAcknowledgement = () => {
    generateBookingAcknowledgement({
      bookingId: intent.bookingId,
      userName: booking.userName,
      phone: booking.phone,
      sevas: intent.sevas,
      totalAmount: intent.totalAmount,
      eventDate: booking.eventDate,
      bookingDate: todayISO(),
    }).save(`Booking_${intent.bookingId}.pdf`);
  };

  return (
    <div className="fixed inset-0 z-[300] bg-foreground/40 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in overflow-y-auto">
      <div className="bg-white rounded-[2.5rem] md:rounded-[3rem] shadow-2xl w-full max-w-xl p-8 md:p-12 text-center relative my-auto">
        <div className="w-20 h-20 bg-amber-50 rounded-full flex items-center justify-center mx-auto mb-8 text-amber-600">
          <Clock3 size={38} />
        </div>

        <h2 className="text-3xl font-serif text-gray-900 mb-4">Booking Recorded</h2>
        <p className="text-gray-500 font-sans leading-relaxed mb-8">
          Thank you, {booking.userName.split(" ")[0]}. The temple office will verify your payment
          and confirm this seva shortly — you&apos;ll get a message on{" "}
          <span className="text-gray-700 font-medium">{booking.phone}</span> once it&apos;s done.
        </p>

        <div className="bg-saffron-50/60 border border-saffron-100 rounded-2xl px-6 py-5 mb-4">
          <p className="text-[10px] uppercase tracking-widest font-bold text-gray-400 mb-2">
            Booking Reference
          </p>
          <p className="font-mono font-bold tracking-widest text-saffron-700 text-xl">
            {intent.bookingId}
          </p>
        </div>

        <button
          onClick={downloadAcknowledgement}
          className="text-[11px] font-bold uppercase tracking-widest text-gray-400 hover:text-saffron-700 transition-colors inline-flex items-center gap-2 mb-8"
        >
          <Download size={14} />
          Download booking slip
        </button>

        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link
            href="/track-booking"
            className="flex-1 bg-saffron-600 hover:bg-saffron-700 text-white px-8 py-4 rounded-full font-bold transition-all flex items-center justify-center gap-2 shadow-lg shadow-saffron-100"
          >
            Track This Booking
          </Link>
          <button
            onClick={onClose}
            className="flex-1 border border-gray-200 text-gray-700 px-8 py-4 rounded-full font-bold hover:bg-gray-50 transition-all"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Main page ─────────────────────────────────────────────────────────────────

function SevasContent() {
  const searchParams = useSearchParams();
  const preselect = searchParams.get("book");

  const [extraSevas, setExtraSevas] = useState<Seva[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  // Holds today's date while the booking modal is open, null when it's closed.
  const [bookingDefaultDate, setBookingDefaultDate] = useState<string | null>(null);
  const [completedBooking, setCompletedBooking] = useState<Booking | null>(null);
  /** Manual UPI flow — booking recorded, payment not yet verified. */
  const [awaitingBooking, setAwaitingBooking] = useState<AwaitingBooking | null>(null);

  useEffect(() => {
    // Live, so a price or availability change made in /admin is reflected on
    // this page immediately — including for a devotee who already has it open
    // with sevas in their cart.
    let firstLoad = true;
    return subscribeSevas((data) => {
      setExtraSevas(data);
      // ?book=<id> preselects a seva, but only on the first delivery — doing
      // it on every update would re-select something the devotee removed.
      if (firstLoad) {
        firstLoad = false;
        if (preselect && data.some((s) => s.id === preselect)) {
          setSelectedIds([preselect]);
        }
      }
    });
  }, [preselect]);

  const toggleSeva = (id: string) => {
    setSelectedIds(prev => 
      prev.includes(id) 
        ? prev.filter(i => i !== id) 
        : [...prev, id]
    );
  };

  /**
   * The priced list the cart totals against.
   *
   * Firestore entries are appended after the static ones and the Map keeps the
   * LAST value per id, so a seva edited in /admin wins — the same precedence
   * SevaBoard renders with and /api/bookings/create charges with. All three
   * must agree, or the devotee is quoted one price and charged another.
   */
  const allAvailable = Array.from(
    new Map(
      [
        ...ALL_SEVAS.map(s => ({ id: s.id, name: s.nameEn, price: s.price })),
        ...extraSevas
          .filter(s => s.id && s.isActive !== false)
          .map(s => ({ id: s.id!, name: s.name, price: s.price })),
      ].map(s => [s.id, s])
    ).values()
  );

  const selectedSevas = allAvailable.filter(s => selectedIds.includes(s.id));
  const totalAmount = selectedSevas.reduce((acc, s) => acc + s.price, 0);

  /**
   * Manual UPI flow finished on the devotee's side. The seva counters are NOT
   * touched here — that happens when an admin confirms the payment, so an
   * unpaid booking can never consume a limited slot.
   */
  const handleAwaitingConfirmation = (booking: AwaitingBooking) => {
    setBookingDefaultDate(null);
    setAwaitingBooking(booking);
    setSelectedIds([]);
  };

  const handleBookingSuccess = (b: Booking) => {
    setBookingDefaultDate(null);
    setCompletedBooking(b);
    setSelectedIds([]);
    // Booking counts are incremented server-side; the live subscription above
    // delivers the new numbers on its own, so there is nothing to re-fetch.
  };

  return (
    <div className="bg-cream pt-28 md:pt-32 pb-32 md:pb-40 min-h-screen">
      {/* Header */}
      <div className="max-w-4xl mx-auto px-6 text-center mb-16 md:mb-24 animate-fade-in">
        <div className="flex items-center justify-center gap-3 text-saffron-600 mb-6">
          <div className="h-px w-8 bg-saffron-600/30" />
          <span className="text-[10px] md:text-xs uppercase tracking-[0.3em] font-sans font-bold text-center">Offerings</span>
          <div className="h-px w-8 bg-saffron-600/30" />
        </div>
        <h1 className="text-4xl md:text-5xl lg:text-7xl font-serif text-foreground mb-6 md:mb-8">Sacred Sevas</h1>
        <p className="text-sm md:text-base text-gray-500 font-sans max-w-lg mx-auto px-4 leading-relaxed">
          Choose one or multiple sacred offerings. Your selections will be summarized below for a unified booking experience.
        </p>
      </div>


      <div className="max-w-7xl mx-auto px-4 md:px-6 pb-24">
        <SevaBoard 
          selectedIds={selectedIds}
          extraSevas={extraSevas}
          onToggle={(id) => toggleSeva(id)}
        />
      </div>

      {/* ── DONATION NOTE (Human-Made Premium) ── */}
      <div className="max-w-2xl mx-auto px-6 mb-24 md:mb-32 animate-fade-in text-center">
        <div className="inline-flex flex-col items-center p-8 md:p-10 bg-white border border-saffron-100 rounded-[2rem] shadow-sm hover:shadow-md transition-shadow">
          <Heart size={24} className="text-saffron-600 mb-4 opacity-40" fill="currentColor" />
          <h3 className="text-lg md:text-xl font-serif text-gray-900 mb-3 tracking-tight">Support the Temple</h3>
          <p className="text-gray-500 text-xs md:text-sm font-sans mb-6 max-w-[280px] leading-relaxed mx-auto">
            Your contributions help us maintain the sacred traditions and services of Sri Vinayaka Temple.
          </p>
          <Link 
            href="/donate" 
            className="text-saffron-700 font-bold text-xs uppercase tracking-[0.2em] hover:text-saffron-800 flex items-center gap-2 border-b-2 border-saffron-100 pb-1 hover:border-saffron-300 transition-all"
          >
            Contribute Now
          </Link>
        </div>
      </div>

      {/* Floating Summary Panel (Cart) */}
      {selectedIds.length > 0 && (
        <div className="fixed bottom-0 left-0 w-full z-40 p-4 md:p-8 animate-fade-in">
          <div className="max-w-4xl mx-auto bg-foreground text-ivory rounded-[2.5rem] md:rounded-full p-4 md:p-4 px-8 md:px-10 flex flex-col md:flex-row items-center justify-between gap-4 shadow-[0_-20px_40px_-15px_rgba(0,0,0,0.3)]">
            <div className="flex items-center gap-6">
              <div className="flex -space-x-3">
                {selectedSevas.slice(0, 3).map((s, i) => (
                  <div key={i} className="w-10 h-10 rounded-full bg-saffron-600 border-2 border-foreground flex items-center justify-center text-[10px] font-bold">
                    {s.name[0]}
                  </div>
                ))}
                {selectedSevas.length > 3 && (
                  <div className="w-10 h-10 rounded-full bg-gray-700 border-2 border-foreground flex items-center justify-center text-[10px] font-bold">
                    +{selectedSevas.length - 3}
                  </div>
                )}
              </div>
              <div className="hidden md:block">
                <p className="text-xs text-ivory/60 uppercase tracking-widest font-bold">{selectedSevas.length} Sevas Selected</p>
                <p className="text-lg font-serif text-gold-400">Total: ₹{totalAmount.toLocaleString("en-IN")}</p>
              </div>
            </div>

            <div className="flex items-center gap-4 w-full md:w-auto">
              <button 
                onClick={() => setSelectedIds([])}
                className="text-xs uppercase tracking-widest font-bold text-ivory/40 hover:text-white transition-colors px-4"
              >
                Clear
              </button>
              <button
                onClick={() => setBookingDefaultDate(todayISO())}
                className="flex-1 md:flex-none bg-saffron-600 hover:bg-saffron-500 text-white px-10 py-4 rounded-full font-bold transition-all shadow-xl shadow-saffron-900/40 flex items-center justify-center gap-3 group"
              >
                Proceed to Book
                <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Booking Modal */}
      {bookingDefaultDate && (
        <BookingModal
          selectedSevas={selectedSevas as unknown as Seva[]}
          defaultDate={bookingDefaultDate}
          onClose={() => setBookingDefaultDate(null)}
          onAwaitingConfirmation={handleAwaitingConfirmation}
          onSuccess={handleBookingSuccess}
        />
      )}

      {/* Awaiting Confirmation View (manual UPI) */}
      {awaitingBooking && (
        <AwaitingConfirmationView
          booking={awaitingBooking}
          onClose={() => setAwaitingBooking(null)}
        />
      )}

      {/* Success View */}
      {completedBooking && (
        <SuccessView booking={completedBooking} onClose={() => setCompletedBooking(null)} />
      )}
    </div>
  );
}



export default function SevasPage() {
  return (
    <Suspense>
      <SevasContent />
    </Suspense>
  );
}
