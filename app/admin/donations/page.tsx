"use client";
/**
 * Admin donations — who gave what, towards what, with a receipt to reissue
 * and a CSV for the temple's accounts. Read through /api/admin/donations, so
 * the donations collection stays closed to clients in firestore.rules.
 */
import { useEffect, useMemo, useState } from "react";
import { auth } from "@/lib/firebase";
import { generateDonationReceipt } from "@/lib/receipt";
import { Download, FileSpreadsheet, IndianRupee, Loader2, Phone, Search } from "lucide-react";

type Donation = {
  id: string;
  donationId: string;
  donorName: string;
  phone: string;
  email: string;
  amount: number;
  purpose: string;
  paymentStatus: "pending" | "success";
  razorpayPaymentId: string;
  createdAt: number | null;
};

const dateOf = (ms: number | null) => (ms ? new Date(ms).toISOString().split("T")[0] : "");

export default function AdminDonationsPage() {
  const [donations, setDonations] = useState<Donation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");

  useEffect(() => {
    // The layout guards this page, but auth may still be resolving on first paint.
    const unsub = auth.onAuthStateChanged(async (user) => {
      if (!user) return;
      try {
        const res = await fetch("/api/admin/donations", {
          headers: { Authorization: `Bearer ${await user.getIdToken()}` },
        });
        const body = await res.json();
        if (!res.ok) throw new Error(body.error || "Could not load donations.");
        setDonations(body.donations);
      } catch (err) {
        setError((err as Error).message);
      } finally {
        setLoading(false);
      }
    });
    return unsub;
  }, []);

  // Only paid donations are the temple's record; unpaid ones are abandoned checkouts.
  const paid = useMemo(() => {
    const term = search.trim().toLowerCase();
    return donations.filter(
      (d) =>
        d.paymentStatus === "success" &&
        (!term ||
          d.donorName?.toLowerCase().includes(term) ||
          d.phone?.includes(term) ||
          d.donationId?.toLowerCase().includes(term) ||
          d.razorpayPaymentId?.toLowerCase().includes(term))
    );
  }, [donations, search]);

  const total = paid.reduce((sum, d) => sum + (d.amount || 0), 0);

  const exportCsv = () => {
    const header = ["Receipt No.", "Date", "Donor", "Phone", "Email", "Towards", "Amount", "Razorpay payment"];
    const rows = paid.map((d) => [d.donationId, dateOf(d.createdAt), d.donorName, d.phone, d.email, d.purpose, String(d.amount), d.razorpayPaymentId]);
    const csv = [header, ...rows].map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\r\n");
    const url = URL.createObjectURL(new Blob([`﻿${csv}`], { type: "text/csv;charset=utf-8;" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = `donations-${new Date().toISOString().split("T")[0]}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const receipt = (d: Donation) =>
    generateDonationReceipt({
      donationId: d.donationId,
      donorName: d.donorName,
      phone: d.phone,
      amount: d.amount,
      purpose: d.purpose,
      razorpayPaymentId: d.razorpayPaymentId,
      date: dateOf(d.createdAt),
    }).save(`Donation_Receipt_${d.donationId}.pdf`);

  if (loading) {
    return (
      <div className="flex justify-center items-center py-40">
        <Loader2 className="w-8 h-8 text-saffron-600 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-serif text-gray-900">Donations</h1>
          <p className="text-sm text-gray-500 mt-1">
            {paid.length} received · <span className="text-gray-700 font-bold">₹{total.toLocaleString("en-IN")}</span>
          </p>
        </div>
        <button
          onClick={exportCsv}
          disabled={paid.length === 0}
          className="flex items-center justify-center gap-2 bg-white border border-gray-200 hover:border-saffron-300 hover:text-saffron-700 disabled:opacity-40 text-gray-700 text-xs font-bold uppercase tracking-wider px-5 py-3 rounded-xl transition-colors"
        >
          <FileSpreadsheet size={15} /> Export ({paid.length})
        </button>
      </header>

      {error && <p className="bg-red-50 border border-red-100 text-red-700 text-sm rounded-xl px-4 py-3">{error}</p>}

      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Name, phone, receipt no. or payment id"
          className="w-full bg-white border border-gray-200 rounded-xl pl-11 pr-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-saffron-400/25"
        />
      </div>

      {paid.length === 0 ? (
        <div className="bg-white border border-gray-200/70 rounded-2xl py-20 text-center text-gray-400 text-sm">
          No donations yet.
        </div>
      ) : (
        <div className="bg-white border border-gray-200/70 rounded-2xl divide-y divide-gray-100">
          {paid.map((d) => (
            <div key={d.id} className="flex items-center justify-between gap-4 p-4">
              <div className="min-w-0">
                <p className="font-bold text-gray-900 text-sm truncate">{d.donorName}</p>
                <p className="text-[11px] text-saffron-600 font-mono font-bold tracking-wider">{d.donationId}</p>
                <p className="text-[11px] text-gray-500 flex flex-wrap items-center gap-x-3 gap-y-0.5 mt-1">
                  <a href={`tel:${d.phone}`} className="flex items-center gap-1 hover:text-saffron-700">
                    <Phone size={10} /> {d.phone}
                  </a>
                  <span>{d.purpose}</span>
                  <span>{dateOf(d.createdAt)}</span>
                </p>
              </div>
              <div className="flex items-center gap-3 shrink-0">
                <p className="font-bold text-gray-900 flex items-center tabular-nums">
                  <IndianRupee size={13} className="text-gray-400" />
                  {d.amount.toLocaleString("en-IN")}
                </p>
                <button
                  onClick={() => receipt(d)}
                  aria-label={`Download receipt ${d.donationId}`}
                  className="w-10 h-10 flex items-center justify-center rounded-xl border border-gray-200 text-gray-500 hover:text-saffron-700 hover:border-saffron-300"
                >
                  <Download size={16} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
