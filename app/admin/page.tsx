"use client";
/**
 * Admin dashboard — what needs doing today, and whether the site is healthy.
 *
 * The previous version totalled `totalAmount` across *every* booking and called
 * it revenue, so pending and rejected ones inflated the figure, and then a
 * caption claimed the count was "this month" when it was all-time. Every number
 * here now states exactly what it counts.
 */
import { useEffect, useState } from "react";
import Link from "next/link";
import { auth } from "@/lib/firebase";
import {
  subscribeSevas,
  subscribeAnnouncements,
  subscribeGalleryImages,
  getBookings,
  Booking,
} from "@/lib/firestore";
import {
  ScrollText,
  BookOpen,
  Bell,
  Image as ImageIcon,
  IndianRupee,
  Clock,
  CalendarDays,
  ArrowRight,
  CheckCircle2,
  AlertTriangle,
  Info,
  Loader2,
} from "lucide-react";

interface HealthCheck {
  id: string;
  label: string;
  ok: boolean;
  required: boolean;
  detail: string;
  fix: string;
}

function todayISO() {
  return new Date().toISOString().split("T")[0];
}

/** First day of the current month, as YYYY-MM-DD. */
function monthStartISO() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;
}

export default function AdminDashboard() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [counts, setCounts] = useState({ sevas: 0, announcements: 0, gallery: 0 });
  const [health, setHealth] = useState<{ ok: boolean; headline: string; checks: HealthCheck[] } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Sevas, announcements and gallery are live, so the dashboard counts move
    // as soon as anything is added or removed — including by another admin.
    const stops = [
      subscribeSevas((data) => setCounts((c) => ({ ...c, sevas: data.length }))),
      subscribeAnnouncements((data) =>
        setCounts((c) => ({ ...c, announcements: data.length }))
      ),
      subscribeGalleryImages((data) =>
        setCounts((c) => ({ ...c, gallery: data.length }))
      ),
    ];

    // Bookings stay a one-shot read: the collection grows without bound and
    // an always-open listener on it is the one subscription with a real cost.
    let alive = true;
    getBookings().then((data) => {
      if (!alive) return;
      setBookings(data);
      setLoading(false);
    });

    return () => {
      alive = false;
      stops.forEach((stop) => stop());
    };
  }, []);

  // Health is a separate, authenticated call — it needs an ID token, and it
  // must not hold up the numbers if it fails.
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const user = auth.currentUser;
        if (!user) return;
        const res = await fetch("/api/admin/health", {
          headers: { Authorization: `Bearer ${await user.getIdToken()}` },
        });
        if (!res.ok || !alive) return;
        setHealth(await res.json());
      } catch {
        /* the panel just stays hidden */
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  const today = todayISO();
  const monthStart = monthStartISO();

  const confirmed = bookings.filter((b) => b.paymentStatus === "success");
  const pending = bookings.filter((b) => b.paymentStatus === "pending");

  // Only money the temple has actually seen counts as revenue.
  const revenueThisMonth = confirmed
    .filter((b) => (b.bookingDate || "") >= monthStart)
    .reduce((sum, b) => sum + (b.totalAmount || 0), 0);

  const sevasToday = confirmed.filter((b) => b.eventDate === today);
  const upcoming = confirmed
    .filter((b) => (b.eventDate || "") > today)
    .sort((a, b) => (a.eventDate || "").localeCompare(b.eventDate || ""))
    .slice(0, 6);

  const stats = [
    {
      label: "Awaiting payment",
      value: pending.length,
      caption: pending.length ? "Needs your confirmation" : "Nothing waiting",
      icon: Clock,
      tone: pending.length ? "amber" : "gray",
      href: "/admin/bookings?status=pending",
    },
    {
      label: "Sevas today",
      value: sevasToday.length,
      caption: today,
      icon: CalendarDays,
      tone: "blue",
      href: "/admin/bookings",
    },
    {
      label: "Confirmed this month",
      value: `₹${revenueThisMonth.toLocaleString("en-IN")}`,
      caption: "Verified payments only",
      icon: IndianRupee,
      tone: "green",
      href: "/admin/bookings?status=success",
    },
    {
      label: "Confirmed bookings",
      value: confirmed.length,
      caption: "All time",
      icon: BookOpen,
      tone: "saffron",
      href: "/admin/bookings",
    },
  ] as const;

  if (loading) {
    return (
      <div className="flex justify-center items-center py-40">
        <Loader2 className="w-8 h-8 text-saffron-600 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-2xl md:text-3xl font-serif text-gray-900">Temple Overview</h1>
        <p className="text-sm text-gray-500 mt-1">
          {pending.length > 0
            ? `${pending.length} booking${pending.length > 1 ? "s are" : " is"} waiting for you to confirm payment.`
            : "Everything is confirmed. Nothing needs your attention right now."}
        </p>
      </header>

      {health && !health.ok && <HealthBanner health={health} />}

      {/* ── Stats ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-5">
        {stats.map((stat) => (
          <Link
            key={stat.label}
            href={stat.href}
            className="group bg-white p-5 md:p-6 rounded-2xl border border-gray-200/70 hover:border-saffron-300 hover:shadow-lg hover:shadow-saffron-900/5 transition-all"
          >
            <div className="flex items-start justify-between mb-4">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${TONES[stat.tone]}`}>
                <stat.icon size={19} />
              </div>
              <ArrowRight
                size={15}
                className="text-gray-300 group-hover:text-saffron-500 group-hover:translate-x-0.5 transition-all"
              />
            </div>
            <p className="text-2xl md:text-[27px] font-bold text-gray-900 leading-none tabular-nums">
              {stat.value}
            </p>
            <p className="text-[11px] font-bold uppercase tracking-wider text-gray-500 mt-2">
              {stat.label}
            </p>
            <p className="text-[10px] text-gray-400 mt-0.5">{stat.caption}</p>
          </Link>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* ── The work queue ── */}
        <section className="lg:col-span-2 bg-white rounded-2xl border border-gray-200/70 overflow-hidden">
          <div className="px-6 py-5 border-b border-gray-100 flex items-center justify-between">
            <div>
              <h2 className="font-serif text-lg text-gray-900">Waiting for confirmation</h2>
              <p className="text-[11px] text-gray-400 mt-0.5">
                Match each against the temple&apos;s bank statement, then mark it paid.
              </p>
            </div>
            {pending.length > 0 && (
              <Link
                href="/admin/bookings?status=pending"
                className="text-[11px] font-bold uppercase tracking-wider text-saffron-700 hover:text-saffron-800 whitespace-nowrap"
              >
                Open all
              </Link>
            )}
          </div>

          {pending.length === 0 ? (
            <EmptyState
              icon={<CheckCircle2 size={28} className="text-green-500/60" />}
              title="All caught up"
              body="Every booking has been settled."
            />
          ) : (
            <ul className="divide-y divide-gray-50">
              {pending.slice(0, 6).map((b) => (
                <li key={b.id} className="px-6 py-4 flex items-center gap-4 hover:bg-gray-50/60 transition-colors">
                  <div className="w-9 h-9 rounded-full bg-amber-50 border border-amber-100 flex items-center justify-center text-amber-700 text-sm font-bold shrink-0">
                    {b.userName?.[0]?.toUpperCase() ?? "?"}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-bold text-gray-900 truncate">{b.userName}</p>
                    <p className="text-[11px] text-gray-400 font-mono">{b.bookingId}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-sm font-bold text-gray-900 tabular-nums">
                      ₹{(b.totalAmount || 0).toLocaleString("en-IN")}
                    </p>
                    <p className="text-[10px] text-gray-400">{b.eventDate}</p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* ── Upcoming sevas ── */}
        <section className="bg-white rounded-2xl border border-gray-200/70 overflow-hidden">
          <div className="px-6 py-5 border-b border-gray-100">
            <h2 className="font-serif text-lg text-gray-900">Upcoming sevas</h2>
            <p className="text-[11px] text-gray-400 mt-0.5">Confirmed, by date</p>
          </div>

          {upcoming.length === 0 ? (
            <EmptyState
              icon={<CalendarDays size={26} className="text-gray-300" />}
              title="Nothing scheduled"
              body="Confirmed sevas with a future date appear here."
            />
          ) : (
            <ul className="divide-y divide-gray-50">
              {upcoming.map((b) => (
                <li key={b.id} className="px-6 py-3.5">
                  <p className="text-[11px] font-bold text-saffron-700 tabular-nums">{b.eventDate}</p>
                  <p className="text-sm text-gray-900 truncate mt-0.5">{b.userName}</p>
                  <p className="text-[11px] text-gray-400 truncate">
                    {b.sevas?.map((s) => s.name).join(", ")}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      {/* ── Quick links ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-5">
        {[
          { href: "/admin/sevas", label: "Sevas", desc: `${counts.sevas} on the website`, icon: ScrollText },
          { href: "/admin/announcements", label: "Announcements", desc: `${counts.announcements} posted`, icon: Bell },
          { href: "/admin/gallery", label: "Gallery", desc: `${counts.gallery} photos`, icon: ImageIcon },
          { href: "/admin/bookings", label: "All bookings", desc: `${bookings.length} in total`, icon: BookOpen },
        ].map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="group bg-white border border-gray-200/70 rounded-2xl p-5 hover:border-saffron-300 hover:shadow-lg hover:shadow-saffron-900/5 transition-all"
          >
            <item.icon size={20} className="text-saffron-600 mb-3" />
            <p className="font-bold text-gray-900 text-sm">{item.label}</p>
            <p className="text-[11px] text-gray-400 mt-0.5">{item.desc}</p>
          </Link>
        ))}
      </div>

      {health && health.ok && <HealthDetails health={health} />}
    </div>
  );
}

const TONES: Record<string, string> = {
  amber: "bg-amber-50 text-amber-600",
  blue: "bg-blue-50 text-blue-600",
  green: "bg-green-50 text-green-600",
  saffron: "bg-saffron-50 text-saffron-600",
  gray: "bg-gray-100 text-gray-400",
};

function EmptyState({ icon, title, body }: { icon: React.ReactNode; title: string; body: string }) {
  return (
    <div className="px-6 py-14 text-center">
      <div className="flex justify-center mb-3">{icon}</div>
      <p className="font-serif text-gray-700">{title}</p>
      <p className="text-[11px] text-gray-400 mt-1 max-w-[220px] mx-auto leading-relaxed">{body}</p>
    </div>
  );
}

/**
 * The loud version, shown only when something required is off.
 *
 * This exists because a missing TEMPLE_UPI_ID or FIREBASE_SERVICE_ACCOUNT takes
 * bookings offline site-wide while every page still looks perfectly fine — the
 * devotee just gets "Online booking isn't switched on yet" and the temple has
 * no way to know why.
 */
function HealthBanner({ health }: { health: { headline: string; checks: HealthCheck[] } }) {
  const broken = health.checks.filter((c) => c.required && !c.ok);
  return (
    <div className="bg-red-50 border border-red-200 rounded-2xl p-5 md:p-6">
      <div className="flex items-start gap-3">
        <AlertTriangle size={20} className="text-red-600 shrink-0 mt-0.5" />
        <div className="min-w-0">
          <h2 className="font-bold text-red-900 text-sm">{health.headline}</h2>
          <p className="text-[12px] text-red-800/80 mt-1">
            Devotees cannot complete a booking until this is fixed.
          </p>
          <ul className="mt-4 space-y-3">
            {broken.map((c) => (
              <li key={c.id} className="bg-white/70 border border-red-100 rounded-xl p-4">
                <p className="text-[12px] font-bold text-red-900">{c.label}</p>
                <p className="text-[11px] text-red-800/80 mt-1 leading-relaxed">{c.detail}</p>
                <p className="text-[11px] text-gray-500 mt-2 leading-relaxed">
                  <span className="font-bold">How to fix:</span> {c.fix}
                </p>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}

/** The quiet version — a collapsed list once everything required is green. */
function HealthDetails({ health }: { health: { checks: HealthCheck[] } }) {
  const optionalOff = health.checks.filter((c) => !c.required && !c.ok);
  return (
    <details className="bg-white border border-gray-200/70 rounded-2xl overflow-hidden group">
      <summary className="px-6 py-4 cursor-pointer flex items-center gap-3 text-sm select-none">
        <CheckCircle2 size={17} className="text-green-600 shrink-0" />
        <span className="font-bold text-gray-800">Everything required is working</span>
        {optionalOff.length > 0 && (
          <span className="text-[11px] text-gray-400 font-medium">
            · {optionalOff.length} optional feature{optionalOff.length > 1 ? "s" : ""} off
          </span>
        )}
      </summary>
      <ul className="border-t border-gray-100 divide-y divide-gray-50">
        {health.checks.map((c) => (
          <li key={c.id} className="px-6 py-4 flex items-start gap-3">
            {c.ok ? (
              <CheckCircle2 size={16} className="text-green-600 shrink-0 mt-0.5" />
            ) : (
              <Info size={16} className="text-gray-300 shrink-0 mt-0.5" />
            )}
            <div className="min-w-0">
              <p className="text-[12px] font-bold text-gray-800">{c.label}</p>
              <p className="text-[11px] text-gray-500 mt-0.5 leading-relaxed">{c.detail}</p>
              {!c.ok && <p className="text-[11px] text-gray-400 mt-1.5 leading-relaxed">{c.fix}</p>}
            </div>
          </li>
        ))}
      </ul>
    </details>
  );
}
