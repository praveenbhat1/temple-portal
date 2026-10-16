"use client";
import React, { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { subscribeSevas, createBooking, verifyPayment, Seva, Booking, BookingOrder } from "@/lib/firestore";
import { Calendar, User, Phone, X, ShoppingBag, Download, Mail, Heart, ArrowRight, Smartphone, Clock3, CheckCircle2 } from "lucide-react";
import SevaBoard from "@/components/SevaBoard";
import { ALL_SEVAS } from "@/lib/sevaData";
import Link from "next/link";
import { normalizePhone, isValidIndianPhone } from "@/lib/utils";
import { generateBookingAcknowledgement, generatePremiumReceipt } from "@/lib/receipt";

function todayISO() {
  return new Date().toISOString().split("T")[0];
}

// ─── Razorpay Checkout ────────────────────────────────────────────────────────

type CheckoutResponse = {
  razorpay_payment_id: string;
  razorpay_order_id: string;
  razorpay_signature: string;
};

/** Only the fields we actually pass to Razorpay Checkout. */
interface RazorpayOptions {
  key: string;
  order_id: string;
  name: string;
  description: string;
  handler: (response: CheckoutResponse) => void;
  prefill?: { name?: string; contact?: string; email?: string };
  notes?: Record<string, string>;
  config?: unknown;
  theme?: { color?: string };
  modal?: { ondismiss?: () => void };
}

declare global {
  interface Window {
    Razorpay?: new (options: RazorpayOptions) => {
      open: () => void;
      on: (event: "payment.failed", handler: (r: { error?: { description?: string } }) => void) => void;
    };
  }
}

const RAZORPAY_SRC = "https://checkout.razorpay.com/v1/checkout.js";

/**
 * Resolve once the checkout script is genuinely ready. Using window.Razorpay
 * before the script finished loading is what used to make checkout silently
 * fail to open on a slow connection.
 */
function loadRazorpay(): Promise<void> {
  return new Promise((resolve, reject) => {
    if (window.Razorpay) return resolve();

    const existing = document.getElementById("razorpay-script") as HTMLScriptElement | null;
    const script = existing ?? document.createElement("script");
    script.addEventListener("load", () => (window.Razorpay ? resolve() : reject(new Error("no_global"))), { once: true });
    script.addEventListener("error", () => reject(new Error("script_blocked")), { once: true });
    if (!existing) {
      script.id = "razorpay-script";
      script.src = RAZORPAY_SRC;
      script.async = true;
      document.body.appendChild(script);
    }
    window.setTimeout(() => reject(new Error("script_timeout")), 15000);
  });
}

/**
 * Show only UPI in the checkout — GPay, PhonePe, Paytm, any UPI app, or a QR
 * on desktop. Cards and netbanking are hidden here; switch them off in the
 * Razorpay dashboard too, since this only governs what the checkout displays.
 *
 * With test keys a card is offered as well. Desktop test checkout shows only a
 * UPI QR, which no real app can pay, so without the test card there is no way
 * to complete a payment end to end. Verification is the same for every method.
 */
function checkoutConfig(keyId: string) {
  const testMode = keyId.startsWith("rzp_test_");
  return {
    display: {
      blocks: {
        upi: { name: "Pay with UPI", instruments: [{ method: "upi" }] },
        ...(testMode && { card: { name: "Test card", instruments: [{ method: "card" }] } }),
      },
      sequence: testMode ? ["block.upi", "block.card"] : ["block.upi"],
      preferences: { show_default_blocks: false },
    },
  };
}

// ─── Unified Booking Form ─────────────────────────────────────────────────────

interface BookingFormProps {
  selectedSevas: Seva[];
  /** Today's date (YYYY-MM-DD), captured when the modal was opened. */
  defaultDate: string;
  /** Paid, and the server has verified Razorpay's signature. */
  onPaid: (booking: Booking) => void;
  /** Paid, but the verify call failed — the webhook will settle it. */
  onAwaitingConfirmation: (booking: AwaitingBooking) => void;
}

function BookingForm({ selectedSevas, defaultDate, onPaid, onAwaitingConfirmation }: BookingFormProps) {
  const totalAmount = selectedSevas.reduce((acc, s) => acc + s.price, 0);
  // defaultDate is computed by the caller's click handler, so today's date never
  // has to be read during render or patched in from an effect.
  const [form, setForm] = useState({ userName: "", phone: "", email: "", eventDate: defaultDate });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  /**
   * Set once the pending booking and its order exist. Kept across a dismissed
   * checkout, so "try again" reopens the same order instead of creating a
   * second booking for the same sevas.
   */
  const [order, setOrder] = useState<BookingOrder | null>(null);

  useEffect(() => {
    // Warm the checkout script up front; openCheckout awaits it regardless.
    loadRazorpay().catch(() => {
      /* surfaced on submit instead of on open */
    });
  }, []);

  /** Validate the form, then hand back clean values. */
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
   * Open Razorpay Checkout for an order. `submitting` stays true until the
   * devotee pays or closes the checkout, so the button cannot open two.
   */
  const openCheckout = async (current: BookingOrder, phone: string) => {
    try {
      await loadRazorpay();
    } catch {
      setSubmitting(false);
      setError("The payment window could not load. Check your connection and try again.");
      return;
    }

    const rzp = new window.Razorpay!({
      key: current.razorpayKeyId,
      order_id: current.razorpayOrderId,
      name: "Sri Vinayaka Temple",
      description: `Seva booking ${current.bookingId}`,
      prefill: { name: form.userName, contact: `+91${phone}`, email: form.email.trim() || undefined },
      notes: { bookingId: current.bookingId },
      config: checkoutConfig(current.razorpayKeyId),
      theme: { color: "#9a3412" },
      handler: async (response) => {
        const base = { userName: form.userName, phone, eventDate: form.eventDate };
        try {
          await verifyPayment({ id: current.id, ...response });
          onPaid({
            id: current.id,
            bookingId: current.bookingId,
            ...base,
            email: form.email.trim() || undefined,
            sevas: current.sevas,
            totalAmount: current.totalAmount,
            bookingDate: todayISO(),
            paymentStatus: "success",
            paymentMethod: "razorpay",
            razorpayOrderId: current.razorpayOrderId,
            razorpayPaymentId: response.razorpay_payment_id,
          });
        } catch {
          // The money moved; only our confirmation call failed. The webhook
          // settles it, so tell the devotee it is on its way, not that it failed.
          onAwaitingConfirmation({ order: current, ...base });
        }
      },
      modal: {
        ondismiss: () => {
          setSubmitting(false);
          setError("Payment was not completed. Nothing has been charged — you can try again.");
        },
      },
    });

    // Razorpay shows the failure inside the checkout and lets the devotee
    // retry there; this only keeps the reason for when they close it.
    rzp.on("payment.failed", (r) => {
      if (r.error?.description) console.warn("Razorpay payment failed:", r.error.description);
    });

    rzp.open();
  };

  const handlePay = async (e: React.FormEvent) => {
    e.preventDefault();
    const valid = validate();
    if (!valid) return;

    setSubmitting(true);
    setError("");

    if (order) {
      await openCheckout(order, valid.phone);
      return;
    }

    try {
      const created = await createBooking({
        userName: form.userName,
        phone: valid.phone,
        email: form.email.trim() || undefined,
        sevaIds: selectedSevas.map((s) => s.id!),
        eventDate: form.eventDate,
      });
      setOrder(created);
      await openCheckout(created, valid.phone);
    } catch (err) {
      setSubmitting(false);
      setError((err as Error).message || "Could not start the booking. Please try again.");
    }
  };

  return (
    <div className="flex flex-col lg:grid lg:grid-cols-2 gap-6 md:gap-10">
      {/* Summary Panel */}
      <div className="bg-saffron-50/50 rounded-2xl md:rounded-3xl p-5 md:p-8 border border-saffron-100 h-fit">
        <h3 className="font-serif text-lg md:text-xl text-gray-900 mb-4 md:mb-6 flex items-center gap-2">
          <ShoppingBag size={20} className="text-saffron-600" />
          Offering Summary
        </h3>
        <div className="space-y-3 md:space-y-4 mb-4 md:mb-6">
          {selectedSevas.map(s => (
            <div key={s.id} className="flex justify-between items-start gap-4 text-sm">
              <span className="text-gray-700">{s.name}</span>
              <span className="font-bold text-gray-900 shrink-0">₹{s.price.toLocaleString("en-IN")}</span>
            </div>
          ))}
        </div>
        <div className="pt-4 md:pt-6 border-t border-saffron-200 flex justify-between items-center">
          <span className="text-gray-600 uppercase tracking-widest text-[11px] font-bold">Total Dakshina</span>
          <span className="text-2xl font-bold text-saffron-700 font-serif">₹{totalAmount.toLocaleString("en-IN")}</span>
        </div>
      </div>

      {/* Inputs */}
      <form onSubmit={handlePay} className="space-y-5 md:space-y-6">
        {/* Locked once the booking exists: its order is for these details. */}
        <fieldset disabled={Boolean(order)} className="space-y-5 md:space-y-6 disabled:opacity-70">
          <div>
            <label htmlFor="bk-name" className={LABEL}>Devotee Name</label>
            <div className="relative">
              <User className="absolute left-4 top-1/2 -translate-y-1/2 text-saffron-600/60" size={18} />
              <input
                id="bk-name"
                type="text" required
                autoComplete="name"
                autoCapitalize="words"
                enterKeyHint="next"
                value={form.userName}
                onChange={(e) => {
                  setForm({ ...form, userName: e.target.value });
                  setError("");
                }}
                placeholder="Full name"
                className={`${INPUT} pl-12`}
              />
            </div>
          </div>

          <div>
            <label htmlFor="bk-phone" className={LABEL}>Mobile Number</label>
            <div className="relative">
              <div className="absolute left-4 top-1/2 -translate-y-1/2 flex items-center gap-2 border-r border-saffron-100 pr-3">
                <Phone className="text-saffron-600/60" size={18} />
                <span className="text-sm font-bold text-gray-500">+91</span>
              </div>
              <input
                id="bk-phone"
                type="tel" required
                inputMode="numeric"
                autoComplete="tel-national"
                enterKeyHint="next"
                value={form.phone}
                onChange={(e) => {
                  // Phones autofill and paste "+91 98450 12345"; keep only the
                  // ten digits rather than truncating that to "+91 98450 ".
                  let digits = e.target.value.replace(/\D/g, "");
                  if (digits.length > 10 && digits.startsWith("91")) digits = digits.slice(2);
                  setForm({ ...form, phone: digits.slice(0, 10) });
                  setError("");
                }}
                placeholder="10-digit mobile number"
                className={`${INPUT} pl-[6.5rem]`}
              />
            </div>
          </div>

          <div>
            <label htmlFor="bk-email" className={LABEL}>
              Email Address <span className="normal-case tracking-normal font-medium text-gray-400">(optional)</span>
            </label>
            <div className="relative">
              <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-saffron-600/60" size={18} />
              <input
                id="bk-email"
                type="email"
                autoComplete="email"
                autoCapitalize="none"
                enterKeyHint="next"
                value={form.email}
                onChange={(e) => {
                  setForm({ ...form, email: e.target.value });
                  setError("");
                }}
                placeholder="devotee@example.com"
                className={`${INPUT} pl-12`}
              />
            </div>
          </div>

          <div>
            <label htmlFor="bk-date" className={LABEL}>Preferred Date</label>
            <div className="relative">
              <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 text-saffron-600/60 pointer-events-none" size={18} />
              <input
                id="bk-date"
                type="date" required
                value={form.eventDate}
                onChange={(e) => {
                  setForm({ ...form, eventDate: e.target.value });
                  setError("");
                }}
                min={todayISO()}
                className={`${INPUT} pl-12 appearance-none min-h-[3.25rem]`}
              />
            </div>
          </div>
        </fieldset>

        {error && (
          <p role="alert" className="text-red-600 text-sm font-semibold text-center bg-red-50 border border-red-100 rounded-xl px-4 py-3">
            {error}
          </p>
        )}

        {/* Pinned to the bottom of the sheet on phones, so paying never needs
            a scroll past the keyboard to find. */}
        <div className="sticky bottom-0 -mx-5 px-5 pt-3 pb-[max(1rem,env(safe-area-inset-bottom))] bg-white border-t border-gray-100 md:static md:mx-0 md:p-0 md:border-0">
          <button
            type="submit" disabled={submitting}
            className="w-full bg-saffron-700 hover:bg-saffron-800 active:bg-saffron-800 disabled:opacity-60 text-ivory font-bold py-4 md:py-5 rounded-2xl transition-all shadow-xl shadow-saffron-700/20 text-base md:text-sm flex items-center justify-center gap-3"
          >
            {submitting ? (
              "Waiting for your UPI payment…"
            ) : (
              <>
                <Smartphone size={18} />
                {order ? "Try UPI payment again" : `Pay ₹${totalAmount.toLocaleString("en-IN")} with UPI`}
              </>
            )}
          </button>
          <p className="text-[11px] text-gray-400 text-center mt-2">
            Secure UPI payment by Razorpay · GPay, PhonePe, Paytm and more
          </p>
        </div>
      </form>
    </div>
  );
}

/**
 * 16px on phones on purpose: iOS Safari zooms the whole page into any input
 * whose text is smaller than that, and leaves it zoomed after the keyboard
 * closes — the "everything is the wrong size" feeling on mobile.
 */
const INPUT =
  "w-full bg-white border border-saffron-200/70 rounded-2xl pr-4 py-3.5 md:py-4 text-base md:text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:border-saffron-400 focus:ring-2 focus:ring-saffron-400/20 transition-all shadow-sm";
const LABEL = "text-[11px] uppercase tracking-widest font-bold text-gray-600 mb-2 block px-1";

// ─── Modal wrapper ─────────────────────────────────────────────────────────────

function BookingModal({
  selectedSevas,
  defaultDate,
  onClose,
  onPaid,
  onAwaitingConfirmation,
}: {
  selectedSevas: Seva[];
  defaultDate: string;
  onClose: () => void;
  onPaid: (booking: Booking) => void;
  onAwaitingConfirmation: (booking: AwaitingBooking) => void;
}) {
  // Stop the seva list scrolling underneath the sheet, and let Escape close it.
  useEffect(() => {
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = previous;
      window.removeEventListener("keydown", onKey);
    };
  }, [onClose]);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="booking-title"
      className="fixed inset-0 z-[300] bg-foreground/40 backdrop-blur-sm flex items-end md:items-center justify-center md:p-4 animate-fade-in"
    >
      {/* A full-screen sheet on phones; a centred card from tablet up. */}
      <div className="bg-white w-full max-w-4xl h-[100dvh] md:h-auto md:max-h-[92dvh] md:rounded-[3rem] shadow-2xl flex flex-col overflow-hidden">
        <div className="flex items-center justify-between gap-4 px-5 md:px-10 pt-[max(1rem,env(safe-area-inset-top))] pb-3 md:pt-8 md:pb-6 border-b border-gray-100 md:border-0 shrink-0">
          <div className="md:flex-1 md:text-center">
            <span className="text-[10px] uppercase tracking-[0.3em] font-bold text-saffron-600 block mb-1 md:mb-3">Sacred Booking</span>
            <h2 id="booking-title" className="text-xl md:text-3xl font-serif text-gray-900">Complete Your Offering</h2>
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            className="shrink-0 w-11 h-11 flex items-center justify-center text-gray-500 hover:text-gray-900 hover:bg-gray-100 rounded-full transition-colors"
          >
            <X size={24} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto overscroll-contain px-5 md:px-10 lg:px-12 pt-5 md:pt-0 md:pb-10">
          <BookingForm
            selectedSevas={selectedSevas}
            defaultDate={defaultDate}
            onPaid={onPaid}
            onAwaitingConfirmation={onAwaitingConfirmation}
          />
        </div>
      </div>
    </div>
  );
}

// ─── Awaiting-confirmation Component ──────────────────────────────────────────

/** What the awaiting screen needs beyond the order itself. */
export interface AwaitingBooking {
  order: BookingOrder;
  userName: string;
  phone: string;
  eventDate: string;
}

/**
 * Paid, but this browser could not get the payment confirmed — usually a
 * dropped connection right after the UPI app returned. The Razorpay webhook
 * settles the booking on its own, and the devotee is messaged when it does.
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
  const { order } = booking;

  const downloadAcknowledgement = () => {
    generateBookingAcknowledgement({
      bookingId: order.bookingId,
      userName: booking.userName,
      phone: booking.phone,
      sevas: order.sevas,
      totalAmount: order.totalAmount,
      eventDate: booking.eventDate,
      bookingDate: todayISO(),
    }).save(`Booking_${order.bookingId}.pdf`);
  };

  return (
    <div className="fixed inset-0 z-[300] bg-foreground/40 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in overflow-y-auto">
      <div className="bg-white rounded-[2.5rem] md:rounded-[3rem] shadow-2xl w-full max-w-xl p-8 md:p-12 text-center relative my-auto">
        <div className="w-20 h-20 bg-amber-50 rounded-full flex items-center justify-center mx-auto mb-8 text-amber-600">
          <Clock3 size={38} />
        </div>

        <h2 className="text-3xl font-serif text-gray-900 mb-4">Confirming Your Payment</h2>
        <p className="text-gray-500 font-sans leading-relaxed mb-8">
          Thank you, {booking.userName.split(" ")[0]}. Your payment is being confirmed — please
          don&apos;t pay again. You&apos;ll get a message on{" "}
          <span className="text-gray-700 font-medium">{booking.phone}</span> once it&apos;s done.
        </p>

        <div className="bg-saffron-50/60 border border-saffron-100 rounded-2xl px-6 py-5 mb-4">
          <p className="text-[10px] uppercase tracking-widest font-bold text-gray-400 mb-2">
            Booking Reference
          </p>
          <p className="font-mono font-bold tracking-widest text-saffron-700 text-xl">
            {order.bookingId}
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

/** Paid and verified by the server, so this receipt is a real one. */
function SuccessView({ booking, onClose }: { booking: Booking; onClose: () => void }) {
  const download = () => {
    generatePremiumReceipt(booking).save(`Receipt_SriVinayaka_${booking.bookingId}.pdf`);
  };

  return (
    <div className="fixed inset-0 z-[300] bg-foreground/40 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in overflow-y-auto">
      <div className="bg-white rounded-[2.5rem] md:rounded-[3rem] shadow-2xl w-full max-w-xl p-8 md:p-12 text-center relative my-auto">
        <div className="w-20 h-20 bg-green-50 rounded-full flex items-center justify-center mx-auto mb-8 text-green-600">
          <CheckCircle2 size={40} />
        </div>
        <h2 className="text-3xl font-serif text-gray-900 mb-4">Divine Offering Received</h2>
        <p className="text-gray-500 font-sans leading-relaxed mb-8">
          May Lord Sri Vinayaka bless you, {booking.userName.split(" ")[0]}. Your payment is
          confirmed and your seva is booked.
        </p>

        <div className="bg-saffron-50/60 border border-saffron-100 rounded-2xl px-6 py-5 mb-8">
          <p className="text-[10px] uppercase tracking-widest font-bold text-gray-400 mb-2">
            Booking Reference
          </p>
          <p className="font-mono font-bold tracking-widest text-saffron-700 text-xl">
            {booking.bookingId}
          </p>
        </div>

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

// ─── Main page ─────────────────────────────────────────────────────────────────

function SevasContent() {
  const searchParams = useSearchParams();
  const preselect = searchParams.get("book");

  const [extraSevas, setExtraSevas] = useState<Seva[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  // Holds today's date while the booking modal is open, null when it's closed.
  const [bookingDefaultDate, setBookingDefaultDate] = useState<string | null>(null);
  /** Paid and verified — shows the receipt. */
  const [paidBooking, setPaidBooking] = useState<Booking | null>(null);
  /** Paid, but confirmation is still on its way via the webhook. */
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
   * The seva counters are NOT touched here — the server bumps them when it
   * settles the booking, so an unpaid booking can never consume a limited slot.
   */
  const handlePaid = (booking: Booking) => {
    setBookingDefaultDate(null);
    setPaidBooking(booking);
    setSelectedIds([]);
  };

  const handleAwaitingConfirmation = (booking: AwaitingBooking) => {
    setBookingDefaultDate(null);
    setAwaitingBooking(booking);
    setSelectedIds([]);
  };

  return (
    <div className="bg-cream pt-28 md:pt-32 pb-32 md:pb-40 min-h-screen">
      {/* Header */}
      <div className="max-w-4xl mx-auto px-6 text-center mb-10 md:mb-24 animate-fade-in">
        <div className="flex items-center justify-center gap-3 text-saffron-600 mb-6">
          <div className="h-px w-8 bg-saffron-600/30" />
          <span className="text-[10px] md:text-xs uppercase tracking-[0.3em] font-sans font-bold text-center">Offerings</span>
          <div className="h-px w-8 bg-saffron-600/30" />
        </div>
        <h1 className="text-4xl md:text-5xl lg:text-7xl font-serif text-foreground mb-4 md:mb-8">Sacred Sevas</h1>
        <p className="text-sm md:text-base text-gray-600 font-sans max-w-lg mx-auto px-2 leading-relaxed">
          Tap the sevas you wish to offer — choose one or several — then book and pay for them together by UPI.
        </p>
      </div>


      <div className="max-w-7xl mx-auto px-3 md:px-6 pb-16 md:pb-24">
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

      {/* Floating Summary Panel (Cart) — a slim bar flush to the bottom on
          phones, a floating pill from tablet up. */}
      {selectedIds.length > 0 && (
        <div className="fixed bottom-0 inset-x-0 z-40 md:p-8 animate-fade-in">
          <div className="md:max-w-4xl md:mx-auto bg-foreground text-ivory md:rounded-full px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] md:px-10 md:py-4 flex items-center justify-between gap-3 md:gap-4 shadow-[0_-12px_32px_-12px_rgba(0,0,0,0.35)]">
            <div className="flex items-center gap-6 min-w-0">
              <div className="hidden md:flex -space-x-3">
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
              <div className="min-w-0">
                <p className="text-[11px] md:text-xs text-ivory/70 uppercase tracking-widest font-bold whitespace-nowrap">
                  {selectedSevas.length} {selectedSevas.length === 1 ? "Seva" : "Sevas"}
                  <span className="hidden sm:inline"> Selected</span>
                </p>
                <p className="text-lg md:text-lg font-serif text-gold-400 leading-tight">₹{totalAmount.toLocaleString("en-IN")}</p>
              </div>
            </div>

            <div className="flex items-center gap-1 md:gap-4 shrink-0">
              <button
                onClick={() => setSelectedIds([])}
                className="text-[11px] md:text-xs uppercase tracking-widest font-bold text-ivory/60 hover:text-white transition-colors px-3 py-3"
              >
                Clear
              </button>
              <button
                onClick={() => setBookingDefaultDate(todayISO())}
                className="bg-saffron-600 hover:bg-saffron-500 active:bg-saffron-500 text-white px-5 py-3 md:px-10 md:py-4 rounded-full font-bold transition-all shadow-xl shadow-saffron-900/40 flex items-center justify-center gap-2 md:gap-3 whitespace-nowrap group"
              >
                <span className="md:hidden">Book Now</span>
                <span className="hidden md:inline">Proceed to Book</span>
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
          onPaid={handlePaid}
          onAwaitingConfirmation={handleAwaitingConfirmation}
        />
      )}

      {paidBooking && <SuccessView booking={paidBooking} onClose={() => setPaidBooking(null)} />}

      {/* Paid, confirmation still on its way */}
      {awaitingBooking && (
        <AwaitingConfirmationView
          booking={awaitingBooking}
          onClose={() => setAwaitingBooking(null)}
        />
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
