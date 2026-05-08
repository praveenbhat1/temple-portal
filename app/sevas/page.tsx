"use client";
import React, { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import {
  getSevas,
  addBooking,
  Seva,
  Booking,
} from "@/lib/firestore";
import { Calendar, User, Phone, CheckCircle2, X, ShoppingBag, Download, CreditCard, Mail, Heart, ArrowRight } from "lucide-react";
import SevaBoard from "@/components/SevaBoard";
import { ALL_SEVAS } from "@/lib/sevaData";
import Link from "next/link";
import { normalizePhone, isValidIndianPhone } from "@/lib/utils";
import { generatePremiumReceipt } from "@/lib/receipt";

declare global {
  interface Window { 
    Razorpay: new (options: {
      key: string | undefined;
      amount: number;
      currency: string;
      name: string;
      description: string;
      order_id: string;
      handler: (response: { razorpay_payment_id: string }) => void;
      modal: { ondismiss: () => void };
      prefill: { name: string; contact: string; email: string };
      theme: { color: string };
    }) => { open: () => void; on: (event: string, handler: (response: { error: { description: string } }) => void) => void };
  }
}

function todayISO() {
  return new Date().toISOString().split("T")[0];
}

// ─── Unified Booking Form ─────────────────────────────────────────────────────

interface BookingFormProps {
  selectedSevas: Seva[];
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

function BookingForm({ selectedSevas, onSuccess }: BookingFormProps) {
  const totalAmount = selectedSevas.reduce((acc, s) => acc + s.price, 0);
  const [form, setForm] = useState({ userName: "", phone: "", email: "", eventDate: "" });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    // Set initial date only on client to avoid hydration mismatch
    setForm(f => ({ ...f, eventDate: todayISO() }));
    
    if (!document.getElementById("razorpay-script")) {
      const s = document.createElement("script");
      s.id = "razorpay-script";
      s.src = "https://checkout.razorpay.com/v1/checkout.js";
      s.async = true;
      document.body.appendChild(s);
    }
  }, []);

  const handlePay = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!form.userName || !form.phone || !form.eventDate) {
      setError("Please fill all required fields.");
      return;
    }

    if (!isValidIndianPhone(form.phone)) {
      setError("Please enter a valid 10-digit mobile number.");
      return;
    }

    setSubmitting(true);
    setError("");

    const normalizedPhone = normalizePhone(form.phone);
    const shortId = Math.random().toString(36).substring(2, 8).toUpperCase();
    const bookingId = `SV-${shortId}`;

    try {
      // 1. Create Server-Side Order
      const orderRes = await fetch("/api/razorpay/order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount: totalAmount,
          receipt: bookingId,
        }),
      });

      if (!orderRes.ok) {
        const errData = await orderRes.json();
        throw new Error(errData.error || "Failed to create order");
      }

      const order = await orderRes.json();

      const options = {
        key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID as string,
        amount: order.amount,
        currency: order.currency,
        name: "Sri Vinayaka Temple",
        description: `Sacred Offering: ${selectedSevas.length} Sevas`,
        order_id: order.id,
        handler: async (response: { razorpay_payment_id: string }) => {
          const bookingData = {
            bookingId,
            userName: form.userName,
            phone: normalizedPhone,
            email: form.email || undefined,
            sevas: selectedSevas.map(s => ({ sevaId: s.id!, name: s.name, price: s.price })),
            totalAmount,
            bookingDate: todayISO(),
            eventDate: form.eventDate,
            paymentStatus: "success" as const,
            razorpayOrderId: order.id,
            razorpayPaymentId: response.razorpay_payment_id,
          };

          const docRef = await addBooking(bookingData);
          onSuccess({ ...bookingData, id: docRef.id });
          setSubmitting(false);
        },
        modal: { ondismiss: () => setSubmitting(false) },
        prefill: { name: form.userName, contact: form.phone, email: form.email },
        theme: { color: "#c2410c" },
      };

      const rzp = new window.Razorpay(options);
      rzp.on("payment.failed", (response: { error: { description: string } }) => {
        setError(`Payment failed: ${response.error.description}`);
        setSubmitting(false);
      });
      rzp.open();
    } catch (err) {
      const errorObj = err as Error;
      setError(errorObj.message || "An error occurred during payment initiation.");
      setSubmitting(false);
    }
  };

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
      <form onSubmit={handlePay} className="space-y-6">
        <div className="relative">
          <label className="text-[10px] uppercase tracking-widest font-bold text-gray-400 mb-2 block px-1">Devotee Name</label>
          <div className="relative">
            <User className="absolute left-4 top-1/2 -translate-y-1/2 text-saffron-600/50" size={18} />
            <input
              type="text" required
              value={form.userName}
              onChange={(e) => setForm({ ...form, userName: e.target.value })}
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
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
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
              onChange={(e) => setForm({ ...form, email: e.target.value })}
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
              onChange={(e) => setForm({ ...form, eventDate: e.target.value })}
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
          {submitting ? "Processing Payment…" : (
            <>
              <CreditCard size={18} />
              Proceed to Payment
            </>
          )}
        </button>
      </form>
    </div>
  );
}

// ─── Modal wrapper ─────────────────────────────────────────────────────────────

function BookingModal({ selectedSevas, onClose, onSuccess }: { selectedSevas: Seva[], onClose: () => void, onSuccess: (b: {
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
    <div className="fixed inset-0 z-[100] bg-foreground/40 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in overflow-y-auto">
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

        <BookingForm selectedSevas={selectedSevas} onSuccess={onSuccess} />
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
    <div className="fixed inset-0 z-[110] bg-foreground/40 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
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

// ─── Main page ─────────────────────────────────────────────────────────────────

function SevasContent() {
  const searchParams = useSearchParams();
  const preselect = searchParams.get("book");

  const [extraSevas, setExtraSevas] = useState<Seva[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isBooking, setIsBooking] = useState(false);
  const [completedBooking, setCompletedBooking] = useState<Booking | null>(null);

  useEffect(() => {
    getSevas().then((data) => {
      setExtraSevas(data);
      if (preselect && data.some(s => s.id === preselect)) {
        setSelectedIds([preselect]);
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

  // Merge static sevas with dynamic sevas for calculation
  const allAvailable = [
    ...ALL_SEVAS.map(s => ({ id: s.id, name: s.nameEn, price: s.price })),
    ...extraSevas.map(s => ({ id: s.id!, name: s.name, price: s.price }))
  ];

  const selectedSevas = allAvailable.filter(s => selectedIds.includes(s.id));
  const totalAmount = selectedSevas.reduce((acc, s) => acc + s.price, 0);

  const handleBookingSuccess = async (b: Booking) => {
    setIsBooking(false);
    setCompletedBooking(b);
    setSelectedIds([]);
    
    // Increment booking counts for Firestore sevas
    const dynamicIds = extraSevas.map(s => s.id!);
    const bookedDynamicIds = b.sevas
      .map((s) => s.sevaId)
      .filter((id: string) => dynamicIds.includes(id));
    
    if (bookedDynamicIds.length > 0) {
      const { incrementSevaBookingCount } = await import("@/lib/firestore");
      await incrementSevaBookingCount(bookedDynamicIds);
      // Refresh local state
      const fresh = await getSevas();
      setExtraSevas(fresh);
    }
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
        <div className="fixed bottom-0 left-0 w-full z-40 p-4 md:p-8 animate-in slide-in-from-bottom duration-500">
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
                onClick={() => setIsBooking(true)}
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
      {isBooking && (
        <BookingModal 
          selectedSevas={selectedSevas as unknown as Seva[]} 
          onClose={() => setIsBooking(false)} 
          onSuccess={handleBookingSuccess} 
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
