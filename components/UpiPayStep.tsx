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
import { useEffect, useState, useSyncExternalStore } from "react";
import {
  Check,
  CheckCircle2,
  Clock3,
  Copy,
  AlertCircle,
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
   * What the devotee says happened, once they are back from the UPI app.
   *
   * null    — not asked yet
   * "paid"  — they say it went through; we ask for the reference
   * "failed"— it did not; they stay on this screen and can retry
   *
   * This exists because plain UPI gives the server no callback: nothing here
   * can observe whether money actually moved. The most this screen can
   * honestly do is ask, make the answer deliberate, and collect the one piece
   * of evidence that lets the temple check — the UPI reference.
   */
  const [outcome, setOutcome] = useState<"paid" | "failed" | null>(null);
  /** Set when the devotee says they cannot find their reference number. */
  const [refUnavailable, setRefUnavailable] = useState(false);
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

  /**
   * A UPI reference (RRN/UTR) is 12 digits at most banks; a few return a
   * longer alphanumeric string. Loose enough not to reject a real one,
   * tight enough that a stray tap or a placeholder does not pass.
   */
  const refLooksValid = /^[A-Za-z0-9]{8,22}$/.test(upiRef.trim());
  const canConfirm = outcome === "paid" && (refUnavailable || refLooksValid);

  /**
   * Ask the question when the devotee comes back to this tab.
   *
   * Switching to the UPI app hides the page; returning shows it again. That
   * moment is the only signal available that the payment attempt is over, so
   * it is where the question belongs — rather than leaving a single
   * "I have paid" button sitting there from the start, which is as easy to
   * press without paying as with.
   */
  useEffect(() => {
    if (!opened || outcome !== null) return;

    const ask = () => {
      if (document.visibilityState === "visible") setOutcome("paid");
    };
    document.addEventListener("visibilitychange", ask);
    return () => document.removeEventListener("visibilitychange", ask);
  }, [opened, outcome]);

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

          {/*
            The question, asked once — not a button sitting there from the
            start. Nothing here can verify the payment, so the design goal is
            that saying "paid" is a deliberate act with evidence attached,
            and that saying "it failed" is an equally easy, obvious way out.
          */}
          {outcome === null ? (
            <div className="bg-white border border-saffron-100 rounded-2xl p-5 shadow-sm space-y-4">
              <p className="text-sm font-bold text-gray-900">Have you completed the payment?</p>
              <p className="text-[11px] text-gray-400 leading-relaxed">
                Pay using one of the options above first. Tell us only once your UPI app has
                confirmed the transfer.
              </p>
              <div className="flex flex-col sm:flex-row gap-3">
                <button
                  type="button"
                  onClick={() => setOutcome("paid")}
                  className="flex-1 bg-saffron-700 hover:bg-saffron-800 text-ivory font-bold py-4 rounded-xl text-sm flex items-center justify-center gap-2 transition-colors"
                >
                  <CheckCircle2 size={17} />
                  Yes, I&apos;ve paid
                </button>
                <button
                  type="button"
                  onClick={() => setOutcome("failed")}
                  className="flex-1 bg-gray-50 hover:bg-gray-100 text-gray-600 border border-gray-200 font-bold py-4 rounded-xl text-sm transition-colors"
                >
                  Not yet / it failed
                </button>
              </div>
            </div>
          ) : outcome === "failed" ? (
            /* The payment did not go through. The booking stays exactly where
               it is — pending, unconfirmed — and the devotee can simply try
               again. Nothing is recorded as paid. */
            <div className="bg-amber-50/70 border border-amber-200 rounded-2xl p-5 space-y-3">
              <p className="text-sm font-bold text-amber-900 flex items-center gap-2">
                <AlertCircle size={16} />
                No payment recorded
              </p>
              <p className="text-[11px] text-amber-800/80 leading-relaxed">
                Your booking <span className="font-mono font-bold">{intent.bookingId}</span> is
                still held and nothing has been charged. Try paying again with the buttons above,
                or use the bank transfer details below. If your bank refused the payment, waiting a
                few minutes and retrying usually works.
              </p>
              <button
                type="button"
                onClick={() => setOutcome(null)}
                className="w-full bg-white hover:bg-amber-50 text-amber-900 border border-amber-200 font-bold py-3 rounded-xl text-xs uppercase tracking-wider transition-colors"
              >
                I&apos;ve paid now
              </button>
            </div>
          ) : (
            <form onSubmit={handleDone} className="space-y-4">
              <div>
                <label
                  htmlFor="upi-ref"
                  className="text-[10px] uppercase tracking-widest font-bold text-gray-400 mb-2 block px-1"
                >
                  UPI reference number
                </label>
                <input
                  id="upi-ref"
                  type="text"
                  inputMode="numeric"
                  autoComplete="off"
                  autoFocus
                  value={upiRef}
                  onChange={(e) => {
                    setUpiRef(e.target.value);
                    setError("");
                    setRefUnavailable(false);
                  }}
                  placeholder="e.g. 418273645102"
                  maxLength={30}
                  className="w-full bg-white border border-saffron-100 rounded-2xl px-5 py-4 text-sm font-mono tracking-wide focus:outline-none focus:ring-2 focus:ring-saffron-400/20 transition-all shadow-sm"
                />
                <p className="text-[11px] text-gray-400 mt-2 px-1 leading-relaxed">
                  Your UPI app shows this after a successful payment — 12 digits, sometimes called
                  UTR or transaction ID. It is what lets the temple match your payment, so your
                  seva is confirmed in minutes rather than hours.
                </p>
                {!refLooksValid && !refUnavailable && (
                  <button
                    type="button"
                    onClick={() => setRefUnavailable(true)}
                    className="text-[11px] font-bold text-gray-400 hover:text-saffron-700 underline decoration-gray-200 underline-offset-4 mt-2 px-1 transition-colors"
                  >
                    I can&apos;t find my reference number
                  </button>
                )}
                {refUnavailable && (
                  <p className="text-[11px] text-amber-800/90 bg-amber-50/70 border border-amber-100 rounded-xl px-4 py-3 mt-2 leading-relaxed">
                    That&apos;s fine — the temple will match your payment by amount and time
                    instead. It may take a little longer to confirm.
                  </p>
                )}
              </div>

              {error && (
                <p className="text-red-600 text-xs font-bold bg-red-50 border border-red-100 rounded-xl px-4 py-3">
                  {error}
                </p>
              )}

              <button
                type="submit"
                disabled={submitting || !canConfirm}
                className="w-full bg-saffron-700 hover:bg-saffron-800 disabled:opacity-40 disabled:cursor-not-allowed text-ivory font-bold py-5 rounded-2xl transition-all shadow-xl shadow-saffron-700/20 text-sm flex items-center justify-center gap-3"
              >
                {submitting ? (
                  <>
                    <Loader2 size={18} className="animate-spin" />
                    Saving…
                  </>
                ) : (
                  <>
                    <CheckCircle2 size={18} />
                    Confirm my payment
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={() => {
                  setOutcome("failed");
                  setUpiRef("");
                  setRefUnavailable(false);
                }}
                className="w-full text-[11px] font-bold uppercase tracking-wider text-gray-400 hover:text-gray-700 py-1 transition-colors"
              >
                Actually, the payment didn&apos;t go through
              </button>
            </form>
          )}

          {isMobile && !opened && outcome === null && (
            <p className="text-[11px] text-gray-400 text-center leading-relaxed">
              Pay first using one of the buttons above, then come back to this page.
            </p>
          )}

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
