"use client";
/**
 * The pay-by-UPI step of a booking.
 *
 * Two things shape this screen. First, almost every devotee here pays with
 * GPay or PhonePe, so those get real buttons rather than being buried in
 * Android's app chooser. Second, plain UPI gives the server no callback at
 * all — the money moves and this site is never told — so the screen's real job
 * is to collect the one thing that makes reconciliation possible: the UPI
 * reference number the devotee's app shows them after paying.
 *
 * That reference is a claim, not a proof. It is stored separately from the one
 * an admin verifies (`devoteeUpiRef` vs `upiRef`) and the booking stays
 * `pending` until a human matches it against the temple's bank statement.
 */
import { useState, useSyncExternalStore } from "react";
import {
  Check,
  CheckCircle2,
  Clock3,
  Copy,
  Loader2,
  QrCode,
  ShieldCheck,
  Smartphone,
} from "lucide-react";
import {
  PRIMARY_UPI_APPS,
  SECONDARY_UPI_APPS,
  detectPlatform,
  toAppLink,
  type Platform,
} from "@/lib/upiApps";
import type { UpiBookingIntent } from "@/lib/firestore";
import BankTransferDetails from "@/components/BankTransferDetails";

/**
 * The platform never changes for the life of the page, so the store never
 * notifies and the snapshot is computed once and cached — returning a fresh
 * value on each call would make React loop.
 */
const subscribeNever = () => () => {};
let cachedPlatform: Platform | null = null;
const getPlatformSnapshot = (): Platform => (cachedPlatform ??= detectPlatform());
const getServerPlatformSnapshot = (): Platform => "other";

/** Tell the server the devotee says they've paid, with their UPI reference. */
async function submitPaymentClaim(intent: UpiBookingIntent, upiRef: string) {
  const res = await fetch("/api/bookings/paid", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ id: intent.id, bookingId: intent.bookingId, upiRef }),
  });

  const result = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(result?.error || "Could not save that. Please try again.");
  return result as { alreadySettled: boolean };
}

export default function UpiPayStep({
  intent,
  onPaid,
}: {
  intent: UpiBookingIntent;
  onPaid: () => void;
}) {
  const [copied, setCopied] = useState(false);
  const [upiRef, setUpiRef] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  /** Flips once a payment app has been opened, which unlocks the next step. */
  const [opened, setOpened] = useState(false);
  /**
   * Lets the devotee switch between paying on this device and scanning.
   * null = follow the detected platform.
   *
   * User-agent detection is a good default but never certain, and being shown
   * the wrong one is a dead end: a QR on a phone needs a second phone to scan
   * it, and app buttons on a desktop do nothing. Either way out is one tap.
   */
  const [modeOverride, setModeOverride] = useState<"apps" | "qr" | null>(null);

  /**
   * Which URL scheme each button uses depends on the platform, which can only
   * be read in the browser. useSyncExternalStore is how React wants this asked:
   * the server snapshot is "other" so SSR and the first client render agree,
   * and the real value arrives without a setState-in-effect cascade.
   */
  const platform = useSyncExternalStore(
    subscribeNever,
    getPlatformSnapshot,
    getServerPlatformSnapshot
  );

  const detectedMobile = platform === "android" || platform === "ios";
  const isMobile = modeOverride ? modeOverride === "apps" : detectedMobile;
  const amount = `₹${intent.totalAmount.toLocaleString("en-IN")}`;

  const copyReference = async () => {
    try {
      await navigator.clipboard.writeText(intent.bookingId);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      /* clipboard blocked — the reference is on screen to copy by hand */
    }
  };

  const handleDone = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError("");
    try {
      await submitPaymentClaim(intent, upiRef.trim());
      onPaid();
    } catch (err) {
      setError((err as Error).message);
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-8">
      {/* ── Amount, front and centre ── */}
      <div className="text-center">
        <p className="text-[10px] uppercase tracking-[0.3em] font-bold text-gray-400 mb-2">
          Amount to pay
        </p>
        <p className="text-5xl md:text-6xl font-serif font-bold text-saffron-700 tabular-nums">
          {amount}
        </p>
      </div>

      <div className="flex flex-col lg:grid lg:grid-cols-[1.1fr_1fr] gap-8 lg:gap-10">
        {/* ── Step 1: pay ── */}
        <div className="bg-gradient-to-b from-saffron-50/70 to-white rounded-[2rem] p-6 md:p-8 border border-saffron-100">
          <StepLabel n={1} title={isMobile ? "Pay with your UPI app" : "Scan with your phone"} />

          {isMobile ? (
            <div className="space-y-3">
              {/*
                GPay and PhonePe get full-width branded buttons. On Android
                these resolve to intent:// URLs that fall back to the system
                chooser when the app isn't installed, so a tap is never dead.
              */}
              {PRIMARY_UPI_APPS.map((app) => (
                <a
                  key={app.id}
                  href={toAppLink(intent.upiUri, app, platform)}
                  onClick={() => setOpened(true)}
                  className="w-full text-white font-bold py-4 rounded-2xl transition-transform active:scale-[0.98] text-sm flex items-center justify-center gap-3 shadow-lg"
                  style={{ backgroundColor: app.color, boxShadow: `0 10px 30px -12px ${app.color}` }}
                >
                  <Smartphone size={18} />
                  Pay {amount} with {app.name}
                </a>
              ))}

              <div className="flex items-center gap-3 pt-2">
                <div className="h-px flex-1 bg-saffron-100" />
                <span className="text-[9px] uppercase tracking-[0.2em] font-bold text-gray-400">
                  or
                </span>
                <div className="h-px flex-1 bg-saffron-100" />
              </div>

              <div className="grid grid-cols-2 gap-2">
                {SECONDARY_UPI_APPS.map((app) => (
                  <a
                    key={app.id}
                    href={toAppLink(intent.upiUri, app, platform)}
                    onClick={() => setOpened(true)}
                    className="bg-white border border-saffron-100 text-gray-700 text-[11px] font-bold py-3 rounded-xl hover:border-saffron-300 hover:text-saffron-700 transition-colors text-center"
                  >
                    {app.name}
                  </a>
                ))}
                <a
                  href={intent.upiUri}
                  onClick={() => setOpened(true)}
                  className="bg-white border border-saffron-100 text-gray-700 text-[11px] font-bold py-3 rounded-xl hover:border-saffron-300 hover:text-saffron-700 transition-colors text-center"
                >
                  Any UPI app
                </a>
              </div>
            </div>
          ) : (
            <div className="text-center">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={intent.qrDataUrl}
                alt={`UPI QR code for booking ${intent.bookingId}`}
                width={216}
                height={216}
                className="mx-auto rounded-2xl border border-saffron-100 bg-white p-2 shadow-sm"
              />
              <p className="text-[11px] text-gray-500 mt-4 leading-relaxed max-w-[240px] mx-auto">
                Open GPay, PhonePe or any UPI app on your phone and scan this code. The amount and
                reference are already filled in.
              </p>
            </div>
          )}

          {/* The escape hatch out of whichever mode was chosen. */}
          <button
            type="button"
            onClick={() => setModeOverride(isMobile ? "qr" : "apps")}
            className="w-full mt-5 text-[11px] font-bold uppercase tracking-wider text-saffron-700 hover:text-saffron-800 underline decoration-saffron-200 underline-offset-4"
          >
            {isMobile ? "Show QR code instead" : "Pay with an app on this device"}
          </button>

          <p className="flex items-start gap-2 text-[10px] text-gray-400 leading-relaxed mt-6 pt-5 border-t border-saffron-100/70">
            <ShieldCheck size={13} className="shrink-0 mt-px text-green-600/60" />
            The money goes straight into the temple&apos;s account. This site never sees your UPI PIN
            or card details.
          </p>
        </div>

        {/* ── Step 2: tell us ── */}
        <div className="space-y-5">
          <div>
            <StepLabel n={2} title="Confirm your payment" />

            <label className="text-[10px] uppercase tracking-widest font-bold text-gray-400 mb-2 block px-1">
              Your booking reference
            </label>
            <button
              type="button"
              onClick={copyReference}
              className="w-full bg-white border border-saffron-100 rounded-2xl px-5 py-4 flex items-center justify-between gap-3 hover:border-saffron-300 transition-colors shadow-sm group"
            >
              <span className="font-mono font-bold tracking-widest text-saffron-700 text-lg">
                {intent.bookingId}
              </span>
              <span className="text-gray-400 group-hover:text-saffron-600 transition-colors">
                {copied ? <Check size={18} className="text-green-600" /> : <Copy size={18} />}
              </span>
            </button>
            <p className="text-[11px] text-gray-400 mt-2 px-1 leading-relaxed">
              This travels with your payment, so the temple can match it to your seva. Keep it safe.
            </p>
          </div>

          <form onSubmit={handleDone} className="space-y-4">
            <div>
              <label
                htmlFor="upi-ref"
                className="text-[10px] uppercase tracking-widest font-bold text-gray-400 mb-2 block px-1"
              >
                UPI reference number{" "}
                <span className="text-gray-300 normal-case tracking-normal font-medium">
                  — optional, but confirms you faster
                </span>
              </label>
              <input
                id="upi-ref"
                type="text"
                inputMode="numeric"
                autoComplete="off"
                value={upiRef}
                onChange={(e) => {
                  setUpiRef(e.target.value);
                  setError("");
                }}
                placeholder="e.g. 418273645102"
                maxLength={30}
                className="w-full bg-white border border-saffron-100 rounded-2xl px-5 py-4 text-sm font-mono tracking-wide focus:outline-none focus:ring-2 focus:ring-saffron-400/20 transition-all shadow-sm"
              />
              <p className="text-[11px] text-gray-400 mt-2 px-1 leading-relaxed">
                After paying, your UPI app shows a 12-digit reference (sometimes called UTR or
                transaction ID). Entering it here lets the temple office confirm your seva in
                minutes instead of hours.
              </p>
            </div>

            {error && (
              <p className="text-red-600 text-xs font-bold bg-red-50 border border-red-100 rounded-xl px-4 py-3">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={submitting}
              className="w-full bg-saffron-700 hover:bg-saffron-800 disabled:opacity-60 text-ivory font-bold py-5 rounded-2xl transition-all shadow-xl shadow-saffron-700/20 text-sm flex items-center justify-center gap-3"
            >
              {submitting ? (
                <>
                  <Loader2 size={18} className="animate-spin" />
                  Saving…
                </>
              ) : (
                <>
                  <CheckCircle2 size={18} />
                  I have completed the payment
                </>
              )}
            </button>

            {isMobile && !opened && (
              <p className="text-[11px] text-gray-400 text-center leading-relaxed">
                Pay first using one of the buttons above, then come back to this page.
              </p>
            )}
          </form>

          <div className="bg-amber-50/60 border border-amber-100 rounded-2xl p-5 space-y-2">
            <p className="text-xs font-bold text-amber-900 flex items-center gap-2">
              <Clock3 size={14} />
              Confirmation is not instant
            </p>
            <p className="text-[11px] text-amber-800/80 leading-relaxed">
              The temple office verifies each payment by hand and will confirm your booking
              shortly. You can follow its status any time on the Track Seva page, and you&apos;ll
              get a WhatsApp message once it&apos;s confirmed.
            </p>
          </div>
        </div>
      </div>

      {/* Fallback for devotees who don't use UPI. Either way an admin confirms. */}
      <BankTransferDetails bookingId={intent.bookingId} />
    </div>
  );
}

/** Numbered step heading, so the two halves read as a sequence not a choice. */
function StepLabel({ n, title }: { n: number; title: string }) {
  return (
    <div className="flex items-center gap-3 mb-5">
      <span className="w-6 h-6 rounded-full bg-saffron-700 text-ivory text-[11px] font-bold flex items-center justify-center shrink-0">
        {n}
      </span>
      <h3 className="font-serif text-lg text-gray-900">{title}</h3>
      {n === 1 && <QrCode size={16} className="text-saffron-300 ml-auto hidden lg:block" />}
    </div>
  );
}
