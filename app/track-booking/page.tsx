"use client";
/**
 * Track Booking Page - Retrieve bookings without authentication.
 */
import { useState } from "react";
import { findBookings, Booking } from "@/lib/firestore";
import { Search, Fingerprint, Calendar, IndianRupee, Download, CheckCircle2, XCircle, AlertCircle, Clock3 } from "lucide-react";
import Image from "next/image";
import { generatePremiumReceipt } from "@/lib/receipt";

export default function TrackBookingPage() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Booking[] | null>(null);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState("");

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;
    setSearching(true);
    setSearchError("");
    try {
      const data = await findBookings(query.trim());
      setResults(data);
    } catch (error) {
      // Previously this failed silently and the page just showed nothing.
      console.error("Search error:", error);
      setResults(null);
      setSearchError(
        (error as Error).message || "Could not search bookings right now. Please try again."
      );
    } finally {
      setSearching(false);
    }
  };

  const generateReceipt = (booking: Booking) => {
    const doc = generatePremiumReceipt(booking);
    doc.save(`Receipt_${booking.userName}_${booking.bookingId}.pdf`);
  };

  return (
    <div className="bg-cream pt-28 md:pt-32 pb-16 md:pb-24 min-h-screen">
      {/* Header */}
      <div className="max-w-4xl mx-auto px-6 text-center mb-12 md:mb-16 animate-fade-in">
        <div className="flex items-center justify-center gap-3 text-saffron-600 mb-6">
          <div className="h-px w-8 bg-saffron-600/30" />
          <span className="text-[10px] md:text-xs uppercase tracking-[0.3em] font-sans font-bold">Trace Offerings</span>
          <div className="h-px w-8 bg-saffron-600/30" />
        </div>
        <h1 className="text-4xl md:text-5xl lg:text-7xl font-serif text-foreground mb-6 md:mb-8 text-center">Track Your Seva</h1>
        <p className="text-sm md:text-base text-gray-500 font-sans max-w-lg mx-auto px-4 leading-relaxed">
          Easily retrieve your booking details and download receipts using your phone number or booking ID.
        </p>
      </div>

      <div className="max-w-3xl mx-auto px-6">
        {/* Search Bar */}
        <form onSubmit={handleSearch} className="relative mb-12 animate-fade-in" style={{ animationDelay: '0.2s' }}>
          <div className="bg-white rounded-[2rem] p-2 shadow-xl shadow-saffron-900/5 border border-saffron-100 flex flex-col sm:flex-row gap-2">
            <div className="flex-1 relative">
              <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-saffron-600/40" size={20} />
              <input
                type="text"
                placeholder="Enter Phone Number or Booking ID"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="w-full bg-transparent pl-14 pr-6 py-4 text-sm md:text-base focus:outline-none font-sans"
              />
            </div>
            <button
              type="submit"
              disabled={searching}
              className="bg-saffron-600 hover:bg-saffron-700 text-white px-8 py-4 rounded-[1.5rem] font-bold transition-all flex items-center justify-center gap-2 shadow-lg shadow-saffron-600/20"
            >
              {searching ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                "Search"
              )}
            </button>
          </div>
          <p className="text-[10px] text-gray-400 mt-4 px-4 uppercase tracking-widest font-bold text-center sm:text-left">
            Tip: Use the same phone number used during booking
          </p>

          {searchError && (
            <div className="mt-4 flex items-start gap-3 rounded-2xl border border-red-100 bg-red-50 px-5 py-4">
              <AlertCircle size={18} className="mt-0.5 shrink-0 text-red-500" />
              <p className="text-sm text-red-700">{searchError}</p>
            </div>
          )}
        </form>

        {/* Results Area */}
        <div className="space-y-6 animate-fade-in" style={{ animationDelay: '0.4s' }}>
          {results === null ? (
            <div className="text-center py-20 opacity-20">
              <Image src="/ganapathi-logo.jpg" alt="Ganesh" width={100} height={100} className="mx-auto grayscale" />
            </div>
          ) : results.length === 0 ? (
            <div className="bg-white rounded-[2rem] p-12 text-center border border-saffron-100 shadow-sm">
              <AlertCircle size={48} className="text-gray-300 mx-auto mb-4" />
              <h3 className="font-serif text-xl text-gray-900 mb-2">No Bookings Found</h3>
              <p className="text-sm text-gray-500">We couldn&apos;t find any records for &quot;{query}&quot;. Please double-check the details.</p>
            </div>
          ) : (
            <div className="space-y-6">
              <h3 className="text-xs uppercase tracking-widest font-bold text-saffron-600 px-2">{results.length} Sacred Offering{results.length > 1 ? 's' : ''} Found</h3>
              {results.map((booking) => (
                <div key={booking.id} className="bg-white rounded-[2.5rem] p-6 md:p-8 border border-saffron-100 shadow-sm hover:shadow-md transition-all group">
                  <div className="flex flex-col md:flex-row justify-between gap-6">
                    <div className="space-y-4">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-saffron-50 rounded-2xl flex items-center justify-center text-saffron-600">
                          <Fingerprint size={24} />
                        </div>
                        <div>
                          <p className="text-[10px] uppercase tracking-widest font-bold text-gray-400">Booking ID</p>
                          <p className="text-sm font-mono font-bold text-gray-900 tracking-wider">{booking.bookingId}</p>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                        <div className="flex items-center gap-3">
                          <Calendar size={18} className="text-saffron-600/40" />
                          <div>
                            <p className="text-[9px] uppercase tracking-widest font-bold text-gray-400">Event Date</p>
                            <p className="text-sm font-bold text-gray-800">{booking.eventDate}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <IndianRupee size={18} className="text-saffron-600/40" />
                          <div>
                            <p className="text-[9px] uppercase tracking-widest font-bold text-gray-400">Total Dakshina</p>
                            <p className="text-sm font-bold text-gray-800">₹{booking.totalAmount.toLocaleString("en-IN")}</p>
                          </div>
                        </div>
                      </div>

                      <div className="flex flex-wrap gap-2 pt-2">
                        {booking.sevas.map((s, i) => (
                          <span key={i} className="bg-gray-50 text-gray-600 px-3 py-1 rounded-full text-[10px] font-bold border border-gray-100">
                            {s.name}
                          </span>
                        ))}
                      </div>
                    </div>

                    <div className="flex flex-col justify-between items-end gap-6">
                      {booking.paymentStatus === "success" ? (
                        <span className="inline-flex items-center gap-1.5 bg-green-50 text-green-700 px-4 py-1.5 rounded-full text-[10px] font-bold border border-green-100 uppercase tracking-widest">
                          <CheckCircle2 size={12} /> Confirmed
                        </span>
                      ) : booking.paymentStatus === "pending" ? (
                        <span className="inline-flex items-center gap-1.5 bg-amber-50 text-amber-700 px-4 py-1.5 rounded-full text-[10px] font-bold border border-amber-100 uppercase tracking-widest">
                          <Clock3 size={12} /> Awaiting Confirmation
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 bg-red-50 text-red-700 px-4 py-1.5 rounded-full text-[10px] font-bold border border-red-100 uppercase tracking-widest">
                          <XCircle size={12} /> {booking.paymentStatus}
                        </span>
                      )}

                      {/* A receipt is only meaningful once the temple has
                          confirmed the money actually arrived. */}
                      {booking.paymentStatus === "success" ? (
                        <button
                          onClick={() => generateReceipt(booking)}
                          className="w-full md:w-auto bg-foreground text-ivory px-6 py-3 rounded-2xl text-xs font-bold hover:bg-saffron-700 transition-all shadow-lg flex items-center justify-center gap-2 group"
                        >
                          <Download size={16} className="group-hover:-translate-y-0.5 transition-transform" />
                          Download Receipt
                        </button>
                      ) : booking.paymentStatus === "pending" ? (
                        <p className="text-[11px] text-gray-400 leading-relaxed md:text-right max-w-[220px]">
                          The temple office is verifying your payment. Your receipt will appear
                          here once it is confirmed.
                        </p>
                      ) : null}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
