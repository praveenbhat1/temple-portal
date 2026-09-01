"use client";
/**
 * UPI link diagnostics.
 *
 * When a devotee's bank refuses a payment it returns a generic message —
 * "you have exceeded the bank limit for this payment" appears for causes that
 * have nothing to do with limits. Guessing from that text is hopeless.
 *
 * This page lays out the same ₹1 payment as several links that differ by one
 * field each. Tapping them in order on a phone finds the field the bank
 * objects to by elimination, in one sitting.
 */
import { useEffect, useState, useSyncExternalStore } from "react";
import { auth } from "@/lib/firebase";
import { detectPlatform, PRIMARY_UPI_APPS, toAppLink, type Platform } from "@/lib/upiApps";
import { AlertCircle, Loader2, Smartphone, CheckCircle2, XCircle } from "lucide-react";

interface Variant {
  id: string;
  label: string;
  why: string;
  uri: string;
  qr: string;
}

/** See the identical note in components/UpiPayStep.tsx. */
const subscribeNever = () => () => {};
let cached: Platform | null = null;
const snap = (): Platform => (cached ??= detectPlatform());
const serverSnap = (): Platform => "other";

export default function UpiTestPage() {
  const [data, setData] = useState<{ vpa: string; name: string; variants: Variant[] } | null>(null);
  const [error, setError] = useState("");
  /** Which variants the admin has marked as working or failing. */
  const [results, setResults] = useState<Record<string, "ok" | "fail">>({});

  const platform = useSyncExternalStore(subscribeNever, snap, serverSnap);
  const isMobile = platform === "android" || platform === "ios";

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const user = auth.currentUser;
        if (!user) return;
        const res = await fetch("/api/upi/diagnose", {
          headers: { Authorization: `Bearer ${await user.getIdToken()}` },
        });
        const body = await res.json();
        if (!alive) return;
        if (!res.ok) setError(body.error || "Could not load the diagnostics.");
        else setData(body);
      } catch (err) {
        if (alive) setError((err as Error).message);
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  const working = data?.variants.filter((v) => results[v.id] === "ok") ?? [];
  const failing = data?.variants.filter((v) => results[v.id] === "fail") ?? [];

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-2xl p-6 text-red-800 text-sm">
        {error}
      </div>
    );
  }

  if (!data) {
    return (
      <div className="flex justify-center py-32">
        <Loader2 className="w-7 h-7 text-saffron-600 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-7">
      <header>
        <h1 className="text-2xl md:text-3xl font-serif text-gray-900">UPI link diagnostics</h1>
        <p className="text-sm text-gray-500 mt-1 max-w-2xl leading-relaxed">
          Each link below pays <b>₹1</b> to <span className="font-mono">{data.vpa}</span> and
          differs from the one above it by a single field. Try them in order on a phone and mark
          what happens — the first one that succeeds tells you which field the bank objects to.
        </p>
      </header>

      {!isMobile && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex gap-3 text-amber-900">
          <AlertCircle size={17} className="shrink-0 mt-0.5" />
          <p className="text-[13px] leading-relaxed">
            Open this page on the phone you pay from — the buttons only work there. On a desktop,
            scan each QR instead.
          </p>
        </div>
      )}

      <div className="space-y-4">
        {data.variants.map((v, i) => {
          const state = results[v.id];
          return (
            <div
              key={v.id}
              className={`bg-white border rounded-2xl p-5 transition-colors ${
                state === "ok"
                  ? "border-green-300 bg-green-50/40"
                  : state === "fail"
                    ? "border-red-200 bg-red-50/30"
                    : "border-gray-200/70"
              }`}
            >
              <div className="flex items-start justify-between gap-4 mb-3">
                <div className="min-w-0">
                  <p className="text-[11px] font-mono font-bold text-saffron-700">
                    {String(i + 1).padStart(2, "0")}
                  </p>
                  <h2 className="font-bold text-gray-900 text-[15px]">{v.label}</h2>
                  <p className="text-[12px] text-gray-500 mt-1 leading-relaxed max-w-xl">{v.why}</p>
                </div>
                {state === "ok" && <CheckCircle2 size={20} className="text-green-600 shrink-0" />}
                {state === "fail" && <XCircle size={20} className="text-red-500 shrink-0" />}
              </div>

              <pre className="text-[10px] bg-gray-50 border border-gray-200 rounded-lg p-3 overflow-x-auto text-gray-600 mb-3">
                {v.uri}
              </pre>

              <div className="flex flex-col sm:flex-row gap-2 mb-3">
                {isMobile ? (
                  <>
                    {PRIMARY_UPI_APPS.map((app) => (
                      <a
                        key={app.id}
                        href={toAppLink(v.uri, app, platform)}
                        className="flex-1 text-white font-bold py-3 rounded-xl text-[13px] flex items-center justify-center gap-2"
                        style={{ backgroundColor: app.color }}
                      >
                        <Smartphone size={15} />
                        {app.name}
                      </a>
                    ))}
                    <a
                      href={v.uri}
                      className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold py-3 rounded-xl text-[13px] text-center"
                    >
                      Any app
                    </a>
                  </>
                ) : (
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img
                    src={v.qr}
                    alt={`QR for ${v.label}`}
                    width={150}
                    height={150}
                    className="rounded-xl border border-gray-200 bg-white p-1"
                  />
                )}
              </div>

              <div className="flex gap-2 pt-3 border-t border-gray-100">
                <button
                  onClick={() => setResults((r) => ({ ...r, [v.id]: "ok" }))}
                  className="flex-1 bg-green-50 hover:bg-green-100 text-green-800 border border-green-200 rounded-lg py-2 text-[11px] font-bold uppercase tracking-wider transition-colors"
                >
                  This one worked
                </button>
                <button
                  onClick={() => setResults((r) => ({ ...r, [v.id]: "fail" }))}
                  className="flex-1 bg-gray-50 hover:bg-gray-100 text-gray-600 border border-gray-200 rounded-lg py-2 text-[11px] font-bold uppercase tracking-wider transition-colors"
                >
                  Failed
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {(working.length > 0 || failing.length > 0) && (
        <div className="bg-foreground text-ivory rounded-2xl p-6">
          <h2 className="font-serif text-lg mb-3">What this tells you</h2>
          {working.length === 0 ? (
            <p className="text-sm text-ivory/70 leading-relaxed">
              Nothing has worked yet. If even <b>Payee address only</b> fails, the problem is the
              account or the bank — not the payment link. Try paying from a different person&apos;s
              phone, or ask the bank why payments to{" "}
              <span className="font-mono">{data.vpa}</span> are being refused.
            </p>
          ) : (
            <p className="text-sm text-ivory/80 leading-relaxed">
              <b className="text-gold-400">{working[0].label}</b> worked. Everything above it in the
              list failed, so the difference between them is what the bank objects to. Tell me which
              one and I&apos;ll change the payment link to match.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
