"use client";
/**
 * Donate online: pick an amount, say what it is for, pay by UPI through
 * Razorpay, get a receipt. Replaces the plain upi://pay QR, which gave the
 * donor no receipt and the temple no record of who gave what.
 */
import { useEffect, useState } from "react";
import Link from "next/link";
import { CheckCircle2, Download, Heart, Phone, Smartphone, User } from "lucide-react";
import { createDonation, verifyDonation, type DonationOrder } from "@/lib/firestore";
import { checkoutConfig, loadRazorpay } from "@/lib/razorpayCheckout";
import { generateDonationReceipt } from "@/lib/receipt";
import { isValidIndianPhone, normalizePhone } from "@/lib/utils";

const PRESETS = [101, 251, 501, 1001, 2501];
const PURPOSES = ["General", "Annadana", "Maintenance", "Utsava"];

const INPUT =
  "w-full bg-white/95 border border-white/10 rounded-2xl pr-4 py-3.5 text-base md:text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-gold-400/50";
const LABEL = "text-[11px] uppercase tracking-widest font-bold text-ivory/70 mb-2 block";

type Receipt = { order: DonationOrder; donorName: string; phone: string; paymentId: string };

export default function DonateForm() {
  const [amount, setAmount] = useState<number | "">(501);
  const [custom, setCustom] = useState(false);
  const [purpose, setPurpose] = useState("General");
  const [donorName, setDonorName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  /** Kept across a dismissed checkout so "try again" reuses the same order. */
  const [order, setOrder] = useState<DonationOrder | null>(null);
  const [receipt, setReceipt] = useState<Receipt | null>(null);
  const [pendingConfirm, setPendingConfirm] = useState(false);

  useEffect(() => {
    loadRazorpay().catch(() => {
      /* surfaced on submit */
    });
  }, []);

  const openCheckout = async (current: DonationOrder, cleanPhone: string) => {
    try {
      await loadRazorpay();
    } catch {
      setBusy(false);
      setError("The payment window could not load. Check your connection and try again.");
      return;
    }
    const rzp = new window.Razorpay!({
      key: current.razorpayKeyId,
      order_id: current.razorpayOrderId,
      name: "Sri Vinayaka Temple",
      description: `Donation · ${current.purpose}`,
      prefill: { name: donorName, contact: `+91${cleanPhone}`, email: email.trim() || undefined },
      notes: { donationId: current.donationId },
      config: checkoutConfig(current.razorpayKeyId),
      theme: { color: "#9a3412" },
      handler: async (response) => {
        try {
          await verifyDonation({ id: current.id, ...response });
          setReceipt({ order: current, donorName, phone: cleanPhone, paymentId: response.razorpay_payment_id });
        } catch {
          // Money moved; the webhook records it. Don't invite a second payment.
          setPendingConfirm(true);
        }
        setBusy(false);
      },
      modal: {
        ondismiss: () => {
          setBusy(false);
          setError("Payment was not completed. Nothing has been charged — you can try again.");
        },
      },
    });
    rzp.on("payment.failed", (r) => {
      if (r.error?.description) console.warn("Razorpay payment failed:", r.error.description);
    });
    rzp.open();
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!donorName.trim()) return setError("Please enter your name.");
    if (!isValidIndianPhone(phone)) return setError("Please enter a valid 10-digit mobile number.");
    if (!amount || amount < 1) return setError("Please choose or enter an amount.");

    const cleanPhone = normalizePhone(phone);
    setBusy(true);
    if (order) return openCheckout(order, cleanPhone);
    try {
      const created = await createDonation({ donorName: donorName.trim(), phone: cleanPhone, email: email.trim() || undefined, amount, purpose });
      setOrder(created);
      await openCheckout(created, cleanPhone);
    } catch (err) {
      setBusy(false);
      setError((err as Error).message);
    }
  };

  if (receipt) {
    return (
      <div className="text-center">
        <div className="w-16 h-16 bg-green-500/15 rounded-full flex items-center justify-center mx-auto mb-5 text-green-400">
          <CheckCircle2 size={34} />
        </div>
        <h3 className="text-2xl font-serif text-gold-400 mb-3">Thank you, {receipt.donorName.split(" ")[0]}</h3>
        <p className="text-ivory/70 text-sm leading-relaxed mb-6">
          Your offering of ₹{receipt.order.amount.toLocaleString("en-IN")} towards {receipt.order.purpose} has been
          received. May Lord Sri Vinayaka bless you.
        </p>
        <p className="font-mono text-gold-400 tracking-widest mb-6">{receipt.order.donationId}</p>
        <button
          onClick={() =>
            generateDonationReceipt({
              donationId: receipt.order.donationId,
              donorName: receipt.donorName,
              phone: receipt.phone,
              amount: receipt.order.amount,
              purpose: receipt.order.purpose,
              razorpayPaymentId: receipt.paymentId,
              date: new Date().toISOString().split("T")[0],
            }).save(`Donation_Receipt_${receipt.order.donationId}.pdf`)
          }
          className="w-full bg-gold-400 hover:bg-gold-200 text-foreground font-bold py-4 rounded-2xl flex items-center justify-center gap-2"
        >
          <Download size={18} /> Download Receipt
        </button>
      </div>
    );
  }

  if (pendingConfirm) {
    return (
      <div className="text-center">
        <h3 className="text-2xl font-serif text-gold-400 mb-3">Confirming your donation</h3>
        <p className="text-ivory/70 text-sm leading-relaxed">
          Your payment went through and is being confirmed — please don&apos;t pay again. Reference{" "}
          <span className="font-mono text-gold-400">{order?.donationId}</span>. For a receipt, contact the temple office
          with this reference.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="space-y-5 text-left">
      <fieldset disabled={Boolean(order)} className="space-y-5 disabled:opacity-70">
        <div>
          <span className={LABEL}>Amount</span>
          <div className="grid grid-cols-3 gap-2">
            {PRESETS.map((p) => (
              <button
                type="button"
                key={p}
                aria-pressed={!custom && amount === p}
                onClick={() => {
                  setCustom(false);
                  setAmount(p);
                  setError("");
                }}
                className={`py-3 rounded-xl text-sm font-bold border transition-colors ${
                  !custom && amount === p
                    ? "bg-gold-400 border-gold-400 text-foreground"
                    : "bg-white/5 border-white/15 text-ivory hover:bg-white/10"
                }`}
              >
                ₹{p.toLocaleString("en-IN")}
              </button>
            ))}
            <button
              type="button"
              aria-pressed={custom}
              onClick={() => {
                setCustom(true);
                setAmount("");
              }}
              className={`py-3 rounded-xl text-sm font-bold border transition-colors ${
                custom ? "bg-gold-400 border-gold-400 text-foreground" : "bg-white/5 border-white/15 text-ivory hover:bg-white/10"
              }`}
            >
              Other
            </button>
          </div>
          {custom && (
            <div className="relative mt-3">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 font-bold">₹</span>
              <input
                type="text"
                inputMode="numeric"
                autoFocus
                aria-label="Donation amount in rupees"
                value={amount}
                onChange={(e) => {
                  const digits = e.target.value.replace(/\D/g, "").slice(0, 6);
                  setAmount(digits ? Number(digits) : "");
                  setError("");
                }}
                placeholder="Enter amount"
                className={`${INPUT} pl-9`}
              />
            </div>
          )}
        </div>

        <div>
          <label htmlFor="dn-purpose" className={LABEL}>Towards</label>
          <select id="dn-purpose" value={purpose} onChange={(e) => setPurpose(e.target.value)} className={`${INPUT} pl-4`}>
            {PURPOSES.map((p) => (
              <option key={p} value={p}>
                {p === "General" ? "General temple fund" : p}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="dn-name" className={LABEL}>Your Name</label>
          <div className="relative">
            <User className="absolute left-4 top-1/2 -translate-y-1/2 text-saffron-600/60" size={18} />
            <input id="dn-name" type="text" autoComplete="name" value={donorName} onChange={(e) => { setDonorName(e.target.value); setError(""); }} placeholder="Full name" className={`${INPUT} pl-12`} />
          </div>
        </div>

        <div>
          <label htmlFor="dn-phone" className={LABEL}>Mobile Number</label>
          <div className="relative">
            <Phone className="absolute left-4 top-1/2 -translate-y-1/2 text-saffron-600/60" size={18} />
            <input
              id="dn-phone"
              type="tel"
              inputMode="numeric"
              autoComplete="tel-national"
              value={phone}
              onChange={(e) => {
                let digits = e.target.value.replace(/\D/g, "");
                if (digits.length > 10 && digits.startsWith("91")) digits = digits.slice(2);
                setPhone(digits.slice(0, 10));
                setError("");
              }}
              placeholder="10-digit mobile number"
              className={`${INPUT} pl-12`}
            />
          </div>
        </div>

        <div>
          <label htmlFor="dn-email" className={LABEL}>
            Email <span className="normal-case tracking-normal font-medium text-ivory/40">(optional)</span>
          </label>
          <input id="dn-email" type="email" autoComplete="email" autoCapitalize="none" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" className={`${INPUT} pl-4`} />
        </div>
      </fieldset>

      {error && (
        <p role="alert" className="text-red-200 text-sm font-semibold text-center bg-red-500/15 border border-red-400/30 rounded-xl px-4 py-3">
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={busy}
        className="w-full bg-gold-400 hover:bg-gold-200 disabled:opacity-60 text-foreground font-bold py-4 rounded-2xl text-base flex items-center justify-center gap-2"
      >
        {busy ? (
          "Waiting for your UPI payment…"
        ) : (
          <>
            {order ? <Smartphone size={18} /> : <Heart size={18} fill="currentColor" />}
            {order ? "Try UPI payment again" : `Donate ${amount ? `₹${amount.toLocaleString("en-IN")}` : ""} with UPI`}
          </>
        )}
      </button>
      <p className="text-[11px] text-ivory/50 text-center leading-relaxed">
        Secure UPI payment by Razorpay. You get a receipt straight away. See our{" "}
        <Link href="/refund-policy" className="underline underline-offset-2">Refund Policy</Link>.
      </p>
    </form>
  );
}
