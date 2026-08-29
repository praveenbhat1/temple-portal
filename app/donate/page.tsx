"use client";
import React from "react";
import { Heart, Landmark, Smartphone, Copy, CheckCircle2 } from "lucide-react";
import { PRIMARY_UPI_APPS, SECONDARY_UPI_APPS, detectPlatform, toAppLink, type Platform } from "@/lib/upiApps";
import DivineDivider from "@/components/DivineDivider";
import { TEMPLE_BANK } from "@/lib/templeBank";

export default function DonatePage() {
  const [copied, setCopied] = React.useState<string | null>(null);

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopied(label);
    setTimeout(() => setCopied(null), 2000);
  };

  // Imported rather than repeated — see lib/templeBank.ts for why.
  const bankDetails = TEMPLE_BANK;

  return (
    <div className="bg-cream pt-28 md:pt-32 pb-32 min-h-screen">
      {/* Header */}
      <div className="max-w-4xl mx-auto px-6 text-center mb-16 md:mb-24 animate-fade-in">
        <div className="flex items-center justify-center gap-3 text-saffron-600 mb-6">
          <div className="h-px w-8 bg-saffron-600/30" />
          <Heart size={18} fill="currentColor" />
          <span className="text-[10px] md:text-xs uppercase tracking-[0.3em] font-sans font-bold">Contribution</span>
          <div className="h-px w-8 bg-saffron-600/30" />
        </div>
        <h1 className="text-4xl md:text-5xl lg:text-7xl font-serif text-foreground mb-6">Support the Sanctuary</h1>
        <p className="text-sm md:text-base text-gray-500 font-sans max-w-lg mx-auto px-4 leading-relaxed">
          Your contributions help us maintain the temple premises, conduct daily rituals, and continue our community services like Annadana.
        </p>
      </div>

      <div className="max-w-6xl mx-auto px-6 grid grid-cols-1 lg:grid-cols-2 gap-12 items-start">
        
        {/* Bank Transfer Card */}
        <div className="bg-white rounded-[2.5rem] p-8 md:p-12 shadow-xl border border-saffron-100 relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-8 opacity-[0.03] group-hover:opacity-[0.05] transition-opacity">
            <Landmark size={120} />
          </div>
          
          <h2 className="text-2xl md:text-3xl font-serif text-gray-900 mb-8 flex items-center gap-4">
            <div className="w-12 h-12 bg-saffron-50 rounded-2xl flex items-center justify-center text-saffron-600">
              <Landmark size={24} />
            </div>
            Bank Transfer
          </h2>

          <div className="space-y-6">
            {[
              { label: "Account Name", value: bankDetails.accountName },
              { label: "Account Number", value: bankDetails.accountNumber },
              { label: "Bank Name", value: bankDetails.bankName },
              { label: "IFSC Code", value: bankDetails.ifsc },
            ].map((item, i) => (
              <div key={i} className="flex flex-col gap-1 relative group/item">
                <span className="text-[10px] uppercase tracking-widest font-bold text-gray-400">{item.label}</span>
                <div className="flex items-center justify-between">
                  <span className="text-base md:text-lg text-gray-800 font-medium">{item.value}</span>
                  <button 
                    onClick={() => copyToClipboard(item.value, item.label)}
                    className="p-2 hover:bg-saffron-50 rounded-full text-saffron-600 transition-colors"
                  >
                    {copied === item.label ? <CheckCircle2 size={16} className="text-green-600" /> : <Copy size={16} />}
                  </button>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-10 p-6 bg-saffron-50 rounded-2xl border border-saffron-100">
            <p className="text-xs text-saffron-800 leading-relaxed font-sans">
              <strong>Note:</strong> After making a transfer, please share the transaction screenshot via WhatsApp so we can send you the official acknowledgment.
            </p>
          </div>
        </div>

        {/* UPI / QR Card */}
        <DonateUpiCard copied={copied} onCopy={copyToClipboard} />

      </div>

      <DivineDivider className="my-24 opacity-30" />

      {/* Purpose Section */}
      <div className="max-w-4xl mx-auto px-6 text-center">
        <h3 className="text-2xl font-serif text-gray-900 mb-12">Your Donation Matters</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {[
            { title: "Annadana", desc: "Providing meals to devotees and the needy." },
            { title: "Maintenance", desc: "Upkeep of the sacred premises and heritage." },
            { title: "Utsava", desc: "Organizing festivals and spiritual gatherings." }
          ].map((item, i) => (
            <div key={i} className="p-6 rounded-3xl bg-white border border-saffron-50 hover:border-saffron-200 transition-colors">
              <h4 className="text-saffron-700 font-bold uppercase tracking-widest text-[10px] mb-2">{item.title}</h4>
              <p className="text-gray-500 text-xs leading-relaxed">{item.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}


/**
 * The UPI half of the donate page.
 *
 * Everything here comes from /api/upi/donation, which reads the temple's real
 * TEMPLE_UPI_ID. It used to be hardcoded: a fake VPA ("temple-donations@upi")
 * next to a "QR Coming Soon" placeholder, so the entire UPI column was a dead
 * end that quietly misdirected anyone who trusted it.
 *
 * When UPI isn't configured the card says so plainly rather than showing a
 * payment address that doesn't work.
 */
function DonateUpiCard({
  copied,
  onCopy,
}: {
  copied: string | null;
  onCopy: (text: string, label: string) => void;
}) {
  const [data, setData] = React.useState<{
    configured: boolean;
    vpa?: string;
    upiUri?: string;
    qrDataUrl?: string;
  } | null>(null);

  React.useEffect(() => {
    let alive = true;
    fetch("/api/upi/donation")
      .then((r) => r.json())
      .then((d) => alive && setData(d))
      .catch(() => alive && setData({ configured: false }));
    return () => {
      alive = false;
    };
  }, []);

  // Platform decides which scheme each app button uses; see lib/upiApps.ts.
  const platform = React.useSyncExternalStore(
    subscribeNever,
    getPlatformSnapshot,
    getServerPlatformSnapshot
  );
  const isMobile = platform === "android" || platform === "ios";

  return (
    <div className="bg-foreground text-ivory rounded-[2.5rem] p-8 md:p-12 shadow-2xl relative overflow-hidden flex flex-col items-center text-center">
      <div className="absolute top-0 left-0 w-full h-full bg-[url('/paper-texture.png')] opacity-10 pointer-events-none" />

      <div className="w-16 h-16 bg-saffron-600/20 rounded-2xl flex items-center justify-center text-gold-400 mb-8 relative z-10">
        <Smartphone size={32} />
      </div>

      <h2 className="text-2xl md:text-3xl font-serif text-gold-400 mb-4 relative z-10">UPI Payment</h2>
      <p className="text-ivory/60 text-sm md:text-base mb-10 relative z-10 max-w-sm">
        {isMobile
          ? "Give any amount straight from your UPI app. You choose how much."
          : "Scan with any UPI app to donate. You choose the amount."}
      </p>

      {data === null ? (
        <div className="skeleton skeleton-on-dark w-48 h-48 md:w-56 md:h-56 rounded-2xl relative z-10 mb-8" />
      ) : !data.configured ? (
        <div className="relative z-10 bg-white/5 border border-white/10 rounded-2xl px-6 py-8 max-w-xs">
          <p className="text-ivory/70 text-sm leading-relaxed">
            UPI donations aren&apos;t switched on yet. Please use the bank transfer details
            alongside, or contact the temple office.
          </p>
        </div>
      ) : (
        <>
          {isMobile ? (
            <div className="relative z-10 w-full max-w-xs space-y-3 mb-8">
              {PRIMARY_UPI_APPS.map((app) => (
                <a
                  key={app.id}
                  href={toAppLink(data.upiUri!, app, platform)}
                  className="w-full text-white font-bold py-4 rounded-2xl text-sm flex items-center justify-center gap-3 shadow-lg"
                  style={{ backgroundColor: app.color }}
                >
                  <Smartphone size={18} />
                  Donate with {app.name}
                </a>
              ))}
              <div className="grid grid-cols-2 gap-2">
                {SECONDARY_UPI_APPS.map((app) => (
                  <a
                    key={app.id}
                    href={toAppLink(data.upiUri!, app, platform)}
                    className="bg-white/10 hover:bg-white/15 text-ivory/80 text-[11px] font-bold py-3 rounded-xl transition-colors"
                  >
                    {app.name}
                  </a>
                ))}
                <a
                  href={data.upiUri}
                  className="bg-white/10 hover:bg-white/15 text-ivory/80 text-[11px] font-bold py-3 rounded-xl transition-colors"
                >
                  Any UPI app
                </a>
              </div>
            </div>
          ) : (
            <div className="bg-white p-6 rounded-[2rem] shadow-inner mb-8 relative z-10">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={data.qrDataUrl}
                alt="UPI QR code for donating to the temple"
                width={224}
                height={224}
                className="w-48 h-48 md:w-56 md:h-56 rounded-xl"
              />
            </div>
          )}

          <div className="flex flex-col items-center gap-2 relative z-10">
            <span className="text-[10px] uppercase tracking-widest font-bold text-ivory/40">
              UPI ID / VPA
            </span>
            <div className="flex items-center gap-3">
              <span className="text-lg md:text-xl font-serif text-gold-400 break-all">
                {data.vpa}
              </span>
              <button
                onClick={() => onCopy(data.vpa!, "UPI")}
                className="p-2 hover:bg-white/10 rounded-full text-gold-400 transition-colors shrink-0"
                aria-label="Copy UPI ID"
              >
                {copied === "UPI" ? (
                  <CheckCircle2 size={16} className="text-green-400" />
                ) : (
                  <Copy size={16} />
                )}
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

/** See the identical note in components/UpiPayStep.tsx. */
const subscribeNever = () => () => {};
let cachedPlatform: Platform | null = null;
const getPlatformSnapshot = (): Platform => (cachedPlatform ??= detectPlatform());
const getServerPlatformSnapshot = (): Platform => "other";
