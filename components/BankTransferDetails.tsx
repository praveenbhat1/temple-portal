"use client";
/**
 * The temple's bank account, laid out for copying.
 *
 * Used as the fallback path for devotees who don't use UPI. A bank transfer
 * carries no booking reference of its own — unlike the UPI link, where it rides
 * along in the transaction note — so when a reference is supplied the panel
 * asks the devotee to put it in the remarks. Without that, the temple office is
 * reconciling a credit against nothing but an amount and a timestamp.
 */
import { useState } from "react";
import { Copy, Check, Landmark } from "lucide-react";
import { TEMPLE_BANK } from "@/lib/templeBank";

export default function BankTransferDetails({ bookingId }: { bookingId?: string }) {
  const [copied, setCopied] = useState<string | null>(null);

  const copy = async (label: string, value: string) => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(label);
      window.setTimeout(() => setCopied(null), 2000);
    } catch {
      /* clipboard blocked — every value is on screen to copy by hand */
    }
  };

  const rows: { label: string; value: string; copyable?: boolean }[] = [
    { label: "Account Name", value: TEMPLE_BANK.accountName },
    { label: "Account Number", value: TEMPLE_BANK.accountNumber, copyable: true },
    { label: "Account Type", value: TEMPLE_BANK.accountType },
    { label: "Bank", value: `${TEMPLE_BANK.bankName}, ${TEMPLE_BANK.branch}` },
    { label: "IFSC Code", value: TEMPLE_BANK.ifsc, copyable: true },
  ];

  return (
    <div className="bg-gray-50/70 border border-gray-100 rounded-3xl p-6 md:p-8">
      <h4 className="font-serif text-lg text-gray-900 mb-1 flex items-center gap-2.5">
        <Landmark size={18} className="text-saffron-600" />
        Prefer a bank transfer?
      </h4>
      <p className="text-[11px] text-gray-400 mb-6 leading-relaxed">
        You can send the amount directly by NEFT, IMPS or RTGS instead of UPI.
      </p>

      <dl className="space-y-3">
        {rows.map((row) => (
          <div
            key={row.label}
            className="flex items-center justify-between gap-4 bg-white border border-gray-100 rounded-2xl px-4 py-3"
          >
            <div className="min-w-0">
              <dt className="text-[9px] uppercase tracking-widest font-bold text-gray-400">
                {row.label}
              </dt>
              <dd
                className={`text-sm text-gray-800 truncate ${
                  row.copyable ? "font-mono font-bold tracking-wide" : "font-medium"
                }`}
              >
                {row.value}
              </dd>
            </div>

            {row.copyable && (
              <button
                type="button"
                onClick={() => copy(row.label, row.value)}
                className="shrink-0 text-gray-300 hover:text-saffron-600 transition-colors p-1.5 hover:bg-saffron-50 rounded-lg"
                title={`Copy ${row.label}`}
                aria-label={`Copy ${row.label}`}
              >
                {copied === row.label ? (
                  <Check size={15} className="text-green-600" />
                ) : (
                  <Copy size={15} />
                )}
              </button>
            )}
          </div>
        ))}
      </dl>

      {bookingId && (
        <p className="text-[11px] text-amber-800/90 bg-amber-50/70 border border-amber-100 rounded-2xl px-4 py-3 mt-5 leading-relaxed">
          Please enter <span className="font-mono font-bold">{bookingId}</span> in the remarks or
          narration of the transfer, so the temple can match your payment to this seva.
        </p>
      )}
    </div>
  );
}
