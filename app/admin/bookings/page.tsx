"use client";
/**
 * Admin Bookings Management - View and filter seva bookings.
 */
import { useEffect, useState } from "react";
import { getBookings, Booking } from "@/lib/firestore";
import { 
  Search, 
  Filter, 
  Calendar, 
  Phone, 
  IndianRupee, 
  CheckCircle2, 
  XCircle, 
  Clock,
  Download,
  ChevronDown
} from "lucide-react";
import Image from "next/image";
import { generatePremiumReceipt } from "@/lib/receipt";

export default function AdminBookings() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [dateFilter, setDateFilter] = useState("");

  useEffect(() => {
    getBookings().then(setBookings).finally(() => setLoading(false));
  }, []);

  const filteredBookings = bookings.filter(b => {
    const matchesSearch = b.userName.toLowerCase().includes(search.toLowerCase()) || 
                          b.phone.includes(search);
    const matchesStatus = statusFilter === "all" || b.paymentStatus === statusFilter;
    const matchesDate = !dateFilter || b.bookingDate === dateFilter;
    return matchesSearch && matchesStatus && matchesDate;
  });

  const generateReceipt = (booking: Booking) => {
    const doc = generatePremiumReceipt(booking);
    doc.save(`Receipt_${booking.userName}_${booking.bookingId}.pdf`);
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center py-48">
        <div className="w-10 h-10 border-4 border-saffron-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-serif text-gray-900">Seva Bookings</h1>
          <p className="text-sm text-gray-500 mt-1">Track and manage all sacred offerings.</p>
        </div>
        <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-saffron-600 bg-saffron-50 px-4 py-2 rounded-full border border-saffron-100">
          <Clock size={14} /> {filteredBookings.length} Total Bookings
        </div>
      </div>

      {/* Filters Bar */}
      <div className="bg-white p-4 md:p-6 rounded-[2rem] border border-gray-100 shadow-sm flex flex-col lg:flex-row gap-4 items-end">
        <div className="flex-1 w-full">
          <label className="text-[10px] uppercase tracking-widest font-bold text-gray-400 mb-2 block px-1">Search Devotee</label>
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <input
              type="text"
              placeholder="Name or Phone Number..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-gray-50 border border-gray-100 rounded-2xl pl-12 pr-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-saffron-400/20"
            />
          </div>
        </div>

        <div className="w-full lg:w-48">
          <label className="text-[10px] uppercase tracking-widest font-bold text-gray-400 mb-2 block px-1">Status</label>
          <div className="relative">
            <Filter className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full bg-gray-50 border border-gray-100 rounded-2xl pl-12 pr-10 py-3 text-sm appearance-none focus:outline-none focus:ring-2 focus:ring-saffron-400/20"
            >
              <option value="all">All Status</option>
              <option value="success">Success</option>
              <option value="pending">Pending</option>
              <option value="failed">Failed</option>
            </select>
            <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" size={16} />
          </div>
        </div>

        <div className="w-full lg:w-48">
          <label className="text-[10px] uppercase tracking-widest font-bold text-gray-400 mb-2 block px-1">Booking Date</label>
          <div className="relative">
            <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <input
              type="date"
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
              className="w-full bg-gray-50 border border-gray-100 rounded-2xl pl-12 pr-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-saffron-400/20"
            />
          </div>
        </div>
      </div>

      {/* Bookings Table */}
      <div className="bg-white rounded-[2rem] border border-gray-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50/50 text-[10px] uppercase tracking-[0.2em] font-bold text-gray-400 border-b border-gray-100">
                <th className="px-8 py-5">Devotee</th>
                <th className="px-6 py-5">Sevas</th>
                <th className="px-6 py-5">Amount</th>
                <th className="px-6 py-5">Dates</th>
                <th className="px-6 py-5">Status</th>
                <th className="px-8 py-5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filteredBookings.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-8 py-20 text-center text-gray-400">
                    <div className="flex flex-col items-center gap-4">
                      <Image src="/ganapathi-logo.jpg" alt="Ganesh" width={48} height={48} className="opacity-10" />
                      <p className="font-serif text-lg">No bookings found matching your criteria.</p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredBookings.map((booking) => (
                  <tr key={booking.id} className="group hover:bg-gray-50/50 transition-colors">
                    <td className="px-8 py-6">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-full bg-saffron-50 flex items-center justify-center text-saffron-600 font-bold border border-saffron-100">
                          {booking.userName[0].toUpperCase()}
                        </div>
                        <div>
                          <p className="font-bold text-gray-900">{booking.userName}</p>
                          <div className="flex flex-col gap-0.5 mt-1">
                            <p className="text-[10px] text-saffron-600 font-mono font-bold tracking-wider">{booking.bookingId}</p>
                            <p className="text-xs text-gray-400 flex items-center gap-1">
                              <Phone size={12} /> {booking.phone}
                            </p>
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-6">
                      <div className="flex flex-wrap gap-1.5 max-w-[200px]">
                        {booking.sevas.map((s, idx) => (
                          <span key={idx} className="bg-gray-100 text-gray-600 px-2 py-0.5 rounded-md text-[10px] font-medium border border-gray-200">
                            {s.name}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="px-6 py-6">
                      <p className="font-serif font-bold text-gray-900 flex items-center gap-1">
                        <IndianRupee size={14} className="text-gray-400" />
                        {booking.totalAmount.toLocaleString("en-IN")}
                      </p>
                    </td>
                    <td className="px-6 py-6">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 text-[10px] text-gray-400">
                          <span className="w-12 uppercase">Booked:</span>
                          <span className="text-gray-600 font-bold">{booking.bookingDate}</span>
                        </div>
                        <div className="flex items-center gap-2 text-[10px] text-gray-400">
                          <span className="w-12 uppercase">Event:</span>
                          <span className="text-saffron-700 font-bold">{booking.eventDate}</span>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-6">
                      {booking.paymentStatus === "success" ? (
                        <span className="inline-flex items-center gap-1.5 bg-green-50 text-green-700 px-3 py-1 rounded-full text-[10px] font-bold border border-green-100">
                          <CheckCircle2 size={12} /> Success
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 bg-red-50 text-red-700 px-3 py-1 rounded-full text-[10px] font-bold border border-red-100">
                          <XCircle size={12} /> {booking.paymentStatus}
                        </span>
                      )}
                    </td>
                    <td className="px-8 py-6 text-right">
                      <button
                        onClick={() => generateReceipt(booking)}
                        className="text-gray-400 hover:text-saffron-600 transition-colors p-2 hover:bg-saffron-50 rounded-xl"
                        title="Download Receipt"
                      >
                        <Download size={20} />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
