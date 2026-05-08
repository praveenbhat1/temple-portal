"use client";
/**
 * Admin Dashboard – Overview and Quick Actions.
 */
import { useEffect, useState } from "react";
import Link from "next/link";
import { getSevas, getBookings, getAnnouncements, getGalleryImages } from "@/lib/firestore";
import { 
  ScrollText, 
  BookOpen, 
  Bell, 
  Image as ImageIcon, 
  TrendingUp, 
  Users, 
  Sparkles 
} from "lucide-react";

export default function AdminDashboard() {
  const [counts, setCounts] = useState({ sevas: 0, bookings: 0, announcements: 0, gallery: 0, revenue: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      getSevas(),
      getBookings(),
      getAnnouncements(),
      getGalleryImages(),
    ]).then(([sevas, bookings, announcements, gallery]) => {
      const totalRevenue = bookings.reduce((acc, b) => acc + (b.totalAmount || 0), 0);
      setCounts({
        sevas: sevas.length,
        bookings: bookings.length,
        announcements: announcements.length,
        gallery: gallery.length,
        revenue: totalRevenue
      });
      setLoading(false);
    });
  }, []);

  const stats = [
    { label: "Active Sevas", value: counts.sevas, icon: <ScrollText size={24} />, color: "text-saffron-600", bg: "bg-saffron-50" },
    { label: "Total Bookings", value: counts.bookings, icon: <BookOpen size={24} />, color: "text-blue-600", bg: "bg-blue-50" },
    { label: "Total Revenue", value: `₹${counts.revenue.toLocaleString("en-IN")}`, icon: <TrendingUp size={24} />, color: "text-green-600", bg: "bg-green-50" },
    { label: "Gallery Photos", value: counts.gallery, icon: <ImageIcon size={24} />, color: "text-purple-600", bg: "bg-purple-50" },
  ];

  if (loading) {
    return (
      <div className="flex justify-center items-center py-48">
        <div className="w-10 h-10 border-4 border-saffron-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-10">
      <div>
        <h1 className="text-3xl font-serif text-gray-900">Temple Overview</h1>
        <p className="text-sm text-gray-500 mt-1">Peace be upon you. Manage the divine portal efficiently.</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, i) => (
          <div key={i} className="bg-white p-6 rounded-[2rem] border border-gray-100 shadow-sm flex items-center gap-5">
            <div className={`w-14 h-14 ${stat.bg} ${stat.color} rounded-2xl flex items-center justify-center shadow-inner`}>
              {stat.icon}
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900 leading-tight">{stat.value}</p>
              <p className="text-xs text-gray-400 font-bold uppercase tracking-widest mt-1">{stat.label}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Quick Actions */}
        <div className="lg:col-span-2 space-y-6">
          <h2 className="text-xl font-serif text-gray-800 flex items-center gap-2">
            <Sparkles size={20} className="text-gold-500" />
            Quick Management
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {[
              { href: "/admin/sevas", label: "Manage Sevas", desc: "Add or update temple offerings", icon: <ScrollText className="text-saffron-600" /> },
              { href: "/admin/announcements", label: "Post Update", desc: "Share news with devotees", icon: <Bell className="text-amber-500" /> },
              { href: "/admin/bookings", label: "View Bookings", desc: "Check recent seva bookings", icon: <BookOpen className="text-blue-500" /> },
              { href: "/admin/gallery", label: "Gallery Photos", desc: "Manage temple visual archives", icon: <ImageIcon className="text-purple-500" /> },
            ].map((action, i) => (
              <Link
                key={i}
                href={action.href}
                className="group bg-white border border-gray-100 rounded-3xl p-6 hover:border-saffron-300 hover:shadow-xl hover:shadow-saffron-900/5 transition-all flex items-center gap-5"
              >
                <div className="w-12 h-12 bg-gray-50 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform">
                  {action.icon}
                </div>
                <div>
                  <h4 className="font-bold text-gray-900 text-sm">{action.label}</h4>
                  <p className="text-[10px] text-gray-400 mt-0.5">{action.desc}</p>
                </div>
              </Link>
            ))}
          </div>
        </div>

        {/* System Health / Info */}
        <div className="bg-foreground text-ivory rounded-[3rem] p-8 md:p-10 relative overflow-hidden flex flex-col justify-between">
          <div className="absolute top-0 left-0 w-full h-full bg-[url('https://www.transparenttextures.com/patterns/natural-paper.png')] opacity-10 pointer-events-none" />
          <div className="relative z-10">
            <div className="w-12 h-12 bg-white/10 rounded-2xl flex items-center justify-center mb-6">
              <Users size={24} className="text-gold-400" />
            </div>
            <h3 className="text-2xl font-serif mb-4">Temple Insights</h3>
            <p className="text-ivory/50 text-sm leading-relaxed mb-6">
              You currently have <span className="text-gold-400 font-bold">{counts.bookings}</span> successful offerings processed this month. Revenue is trending up.
            </p>
          </div>
          <div className="relative z-10 pt-6 border-t border-white/10">
            <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-gold-500">
              <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
              Portal Online
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
