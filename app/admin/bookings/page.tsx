"use client";
/**
 * Admin bookings — the temple's daily work queue.
 *
 * Three jobs, in order of how often they happen:
 *   1. Settle pending UPI bookings. Plain UPI gives the server no callback, so
 *      a human matches each credit in the bank statement against a booking and
 *      marks it paid. The devotee's own UPI reference (if they entered one) is
 *      shown right on the row, which is what makes that match quick.
 *   2. Answer "what sevas are happening on X?" — hence filtering by *event*
 *      date, not just the date the booking was taken.
 *   3. Tell the devotee. If no messaging provider is configured, the WhatsApp
 *      button opens WhatsApp with the message already typed.
 */
import { useEffect, useMemo, useState, Fragment } from "react";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { getBookings, Booking } from "@/lib/firestore";
import { auth } from "@/lib/firebase";
import { generatePremiumReceipt } from "@/lib/receipt";
import { bookingMessage, whatsappLink, prettyDate } from "@/lib/messages";
import {
  Search,
  Calendar,
  Phone,
  CheckCircle2,
  XCircle,
  Clock,
  Download,
  ChevronDown,
  MessageCircle,
  FileSpreadsheet,
  X,
  Loader2,
  Hash,
  IndianRupee,
  Inbox,
} from "lucide-react";

/** Which date field the date filters apply to. */
type DateBasis = "eventDate" | "bookingDate";

/**
 * Settle a pending UPI booking.
 *
 * The write happens in /api/bookings/confirm under the Admin SDK — this only
 * carries the admin's identity and the reference they read off the statement.
 */
async function settleBooking(id: string, action: "confirm" | "reject", upiRef: string) {
  const user = auth.currentUser;
  if (!user) throw new Error("You are signed out — please sign in again.");

  const res = await fetch("/api/bookings/confirm", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${await user.getIdToken()}`,
    },
    body: JSON.stringify({ id, action, upiRef }),
  });

  const result = await res.json().catch(() => ({}));

  if (!res.ok) {
    if (result?.reason === "admin_not_configured") {
      throw new Error(
        "Booking confirmation isn't configured on the server yet (FIREBASE_SERVICE_ACCOUNT is missing)."
      );
    }
    throw new Error(result?.error || "Could not update the booking.");
  }

  return result as {
    paymentStatus: "success" | "failed";
    notified: boolean;
    notifyChannel: "whatsapp" | "sms" | "none";
  };
}

export default function AdminBookingsPage() {
  return (
    <Suspense fallback={<div className="py-32 flex justify-center"><Loader2 className="w-7 h-7 text-saffron-600 animate-spin" /></div>}>
      <AdminBookings />
    </Suspense>
  );
}

function AdminBookings() {
  const searchParams = useSearchParams();

  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState("");
  // Deep-linked from the dashboard cards, e.g. /admin/bookings?status=pending.
  const [statusFilter, setStatusFilter] = useState(searchParams.get("status") || "all");
  const [dateBasis, setDateBasis] = useState<DateBasis>("eventDate");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [sevaFilter, setSevaFilter] = useState("all");

  /** The booking currently open in the settle dialog. */
  const [settleTarget, setSettleTarget] = useState<{ booking: Booking; action: "confirm" | "reject" } | null>(null);
  const [settling, setSettling] = useState(false);
  const [settleError, setSettleError] = useState("");
  const [toast, setToast] = useState("");

  useEffect(() => {
    let alive = true;
    getBookings()
      .then((data) => alive && setBookings(data))
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => {
    if (!toast) return;
    const t = window.setTimeout(() => setToast(""), 5000);
    return () => window.clearTimeout(t);
  }, [toast]);

  /** Every distinct seva name across all bookings, for the seva dropdown. */
  const sevaNames = useMemo(() => {
    const names = new Set<string>();
    bookings.forEach((b) => b.sevas?.forEach((s) => names.add(s.name)));
    return Array.from(names).sort((a, b) => a.localeCompare(b));
  }, [bookings]);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();

    return bookings.filter((b) => {
      // Booking ID was missing from search before, which is the one thing a
      // devotee reads out over the phone.
      const matchesSearch =
        !term ||
        b.userName?.toLowerCase().includes(term) ||
        b.phone?.includes(term) ||
        b.bookingId?.toLowerCase().includes(term) ||
        b.upiRef?.toLowerCase().includes(term) ||
        b.devoteeUpiRef?.toLowerCase().includes(term);

      const matchesStatus = statusFilter === "all" || b.paymentStatus === statusFilter;

      const basis = (dateBasis === "eventDate" ? b.eventDate : b.bookingDate) || "";
      const matchesFrom = !fromDate || basis >= fromDate;
      const matchesTo = !toDate || basis <= toDate;

      const matchesSeva = sevaFilter === "all" || b.sevas?.some((s) => s.name === sevaFilter);

      return matchesSearch && matchesStatus && matchesFrom && matchesTo && matchesSeva;
    });
  }, [bookings, search, statusFilter, dateBasis, fromDate, toDate, sevaFilter]);

  /** Totals for whatever is currently on screen, not for the whole database. */
  const summary = useMemo(() => {
    const confirmedValue = filtered
      .filter((b) => b.paymentStatus === "success")
      .reduce((sum, b) => sum + (b.totalAmount || 0), 0);
    return {
      count: filtered.length,
      pending: filtered.filter((b) => b.paymentStatus === "pending").length,
      confirmedValue,
    };
  }, [filtered]);

  // Grouped by whichever date the admin is filtering on, so "show me the 12th"
  // produces one clean block rather than rows scattered by booking date.
  const groups = useMemo(() => {
    const map = new Map<string, Booking[]>();
    filtered.forEach((b) => {
      const key = (dateBasis === "eventDate" ? b.eventDate : b.bookingDate) || "Unknown date";
      const list = map.get(key);
      if (list) list.push(b);
      else map.set(key, [b]);
    });
    return Array.from(map.entries()).sort((a, b) => b[0].localeCompare(a[0]));
  }, [filtered, dateBasis]);

  const anyFilterActive =
    Boolean(search || fromDate || toDate) || statusFilter !== "all" || sevaFilter !== "all";

  const resetFilters = () => {
    setSearch("");
    setStatusFilter("all");
    setFromDate("");
    setToDate("");
    setSevaFilter("all");
  };

  const handleSettle = async (upiRef: string) => {
    if (!settleTarget?.booking.id) return;
    const { booking, action } = settleTarget;

    setSettling(true);
    setSettleError("");

    try {
      const result = await settleBooking(booking.id!, action, upiRef);
      setBookings((prev) =>
        prev.map((b) =>
          b.id === booking.id
            ? { ...b, paymentStatus: result.paymentStatus, upiRef: upiRef || b.upiRef }
            : b
        )
      );
      setSettleTarget(null);
      setToast(
        result.notified
          ? `${booking.userName} has been messaged on ${result.notifyChannel === "sms" ? "SMS" : "WhatsApp"}.`
          : `Saved. Use the WhatsApp button on the row to tell ${booking.userName}.`
      );
    } catch (err) {
      setSettleError((err as Error).message);
    } finally {
      setSettling(false);
    }
  };

  /** Download whatever is on screen, for the temple's own records. */
  const exportCsv = () => {
    const header = [
      "Booking ID",
      "Devotee",
      "Phone",
      "Email",
      "Sevas",
      "Amount",
      "Booked on",
      "Seva date",
      "Status",
      "Verified ref",
      "Devotee ref",
    ];

    const rows = filtered.map((b) => [
      b.bookingId,
      b.userName,
      b.phone,
      b.email || "",
      (b.sevas || []).map((s) => s.name).join(" | "),
      String(b.totalAmount ?? ""),
      b.bookingDate || "",
      b.eventDate || "",
      b.paymentStatus,
      b.upiRef || "",
      b.devoteeUpiRef || "",
    ]);

    // Quote every field and double any inner quote — seva names contain commas
    // and slashes, which would otherwise split a row.
    const csv = [header, ...rows]
      .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(","))
      .join("\r\n");

    // The BOM is what makes Excel read the ₹ sign and Kannada names correctly
    // instead of showing mojibake.
    const blob = new Blob([`﻿${csv}`], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `sevas-${new Date().toISOString().split("T")[0]}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center py-40">
        <Loader2 className="w-8 h-8 text-saffron-600 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* ── Header ── */}
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-serif text-gray-900">Seva Bookings</h1>
          <p className="text-sm text-gray-500 mt-1">
            {summary.count} shown
            {summary.pending > 0 && (
              <> · <span className="text-amber-700 font-bold">{summary.pending} awaiting payment</span></>
            )}
            {" · "}
            <span className="text-gray-600">
              ₹{summary.confirmedValue.toLocaleString("en-IN")} confirmed
            </span>
          </p>
        </div>

        <button
          onClick={exportCsv}
          disabled={filtered.length === 0}
          className="flex items-center justify-center gap-2 bg-white border border-gray-200 hover:border-saffron-300 hover:text-saffron-700 disabled:opacity-40 text-gray-700 text-xs font-bold uppercase tracking-wider px-5 py-3 rounded-xl transition-colors"
        >
          <FileSpreadsheet size={15} />
          Export {filtered.length > 0 && `(${filtered.length})`}
        </button>
      </header>

      {toast && (
        <div className="bg-green-50 border border-green-200 text-green-800 text-sm rounded-2xl px-5 py-4 flex items-start gap-3">
          <CheckCircle2 size={17} className="shrink-0 mt-0.5" />
          {toast}
        </div>
      )}

      {/* ── Filters ── */}
      <div className="bg-white p-4 md:p-5 rounded-2xl border border-gray-200/70 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
          <Field label="Search" className="lg:col-span-2">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
            <input
              type="text"
              placeholder="Name, phone, booking ID or UPI reference"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className={`${INPUT} pl-11`}
            />
          </Field>

          <Field label="Status">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className={`${INPUT} pl-4 pr-9 appearance-none cursor-pointer`}
            >
              <option value="all">All statuses</option>
              <option value="pending">Awaiting payment</option>
              <option value="success">Confirmed</option>
              <option value="failed">Rejected</option>
            </select>
            <ChevronDown className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" size={15} />
          </Field>

          <Field label="Seva">
            <select
              value={sevaFilter}
              onChange={(e) => setSevaFilter(e.target.value)}
              className={`${INPUT} pl-4 pr-9 appearance-none cursor-pointer`}
            >
              <option value="all">All sevas</option>
              {sevaNames.map((name) => (
                <option key={name} value={name}>
                  {name}
                </option>
              ))}
            </select>
            <ChevronDown className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" size={15} />
          </Field>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 items-end">
          <Field label="Filter dates by">
            <select
              value={dateBasis}
              onChange={(e) => setDateBasis(e.target.value as DateBasis)}
              className={`${INPUT} pl-4 pr-9 appearance-none cursor-pointer`}
            >
              <option value="eventDate">Seva date</option>
              <option value="bookingDate">Date booked</option>
            </select>
            <ChevronDown className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" size={15} />
          </Field>

          <Field label="From">
            <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
            <input
              type="date"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
              className={`${INPUT} pl-11`}
            />
          </Field>

          <Field label="To">
            <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
            <input
              type="date"
              value={toDate}
              min={fromDate || undefined}
              onChange={(e) => setToDate(e.target.value)}
              className={`${INPUT} pl-11`}
            />
          </Field>

          <div className="flex gap-2">
            <QuickRange label="Today" onClick={() => setRange(0, setFromDate, setToDate)} />
            <QuickRange label="7 days" onClick={() => setRange(7, setFromDate, setToDate)} />
            {anyFilterActive && (
              <button
                onClick={resetFilters}
                className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-gray-400 hover:text-gray-700 px-3 py-3 transition-colors"
              >
                <X size={13} /> Clear
              </button>
            )}
          </div>
        </div>
      </div>

      {settleError && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-2xl px-5 py-4">
          {settleError}
        </div>
      )}

      {/* ── Results ── */}
      {groups.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-200/70 py-24 text-center">
          <Inbox size={34} className="text-gray-200 mx-auto mb-4" />
          <p className="font-serif text-lg text-gray-700">No bookings match these filters</p>
          <p className="text-sm text-gray-400 mt-1">
            {anyFilterActive ? "Try widening the date range or clearing the filters." : "Bookings will appear here as devotees make them."}
          </p>
        </div>
      ) : (
        <>
          {/* Cards on mobile — a six-column table is unusable on a phone, and
              this page gets opened on one constantly. */}
          <div className="lg:hidden space-y-6">
            {groups.map(([date, rows]) => (
              <div key={date}>
                <p className="text-[11px] font-bold uppercase tracking-wider text-saffron-700 mb-2 px-1">
                  {dateBasis === "eventDate" ? "Seva on" : "Booked on"} {prettyDate(date)} · {rows.length}
                </p>
                <div className="space-y-3">
                  {rows.map((b) => (
                    <BookingCard
                      key={b.id}
                      booking={b}
                      onSettle={(action) => setSettleTarget({ booking: b, action })}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>

          {/* Table on desktop */}
          <div className="hidden lg:block bg-white rounded-2xl border border-gray-200/70 overflow-hidden">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50/70 text-[10px] uppercase tracking-[0.15em] font-bold text-gray-400 border-b border-gray-100">
                  <th className="px-6 py-4">Devotee</th>
                  <th className="px-4 py-4">Sevas</th>
                  <th className="px-4 py-4">Amount</th>
                  <th className="px-4 py-4">Dates</th>
                  <th className="px-4 py-4">Status</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {groups.map(([date, rows]) => (
                  <Fragment key={date}>
                    <tr className="bg-saffron-50/40 border-y border-saffron-100/50">
                      <td colSpan={6} className="px-6 py-2.5 text-[11px] font-bold text-saffron-800 tracking-wide">
                        {dateBasis === "eventDate" ? "Seva on" : "Booked on"} {prettyDate(date)}
                        <span className="text-saffron-600/60 font-medium"> · {rows.length} booking{rows.length > 1 ? "s" : ""}</span>
                      </td>
                    </tr>
                    {rows.map((b) => (
                      <BookingRow
                        key={b.id}
                        booking={b}
                        onSettle={(action) => setSettleTarget({ booking: b, action })}
                      />
                    ))}
                  </Fragment>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {settleTarget && (
        <SettleDialog
          booking={settleTarget.booking}
          action={settleTarget.action}
          busy={settling}
          onCancel={() => {
            setSettleTarget(null);
            setSettleError("");
          }}
          onConfirm={handleSettle}
        />
      )}
    </div>
  );
}

// ─── Shared bits ──────────────────────────────────────────────────────────────

const INPUT =
  "w-full bg-gray-50 border border-gray-200 rounded-xl pr-4 py-3 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-saffron-400/25 focus:border-saffron-300 transition-all";

function Field({
  label,
  className = "",
  children,
}: {
  label: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={className}>
      <label className="text-[10px] uppercase tracking-wider font-bold text-gray-400 mb-1.5 block px-1">
        {label}
      </label>
      <div className="relative">{children}</div>
    </div>
  );
}

function QuickRange({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="flex-1 text-[11px] font-bold uppercase tracking-wider text-gray-500 bg-gray-50 hover:bg-saffron-50 hover:text-saffron-700 border border-gray-200 rounded-xl px-3 py-3 transition-colors whitespace-nowrap"
    >
      {label}
    </button>
  );
}

/** Set the date range to today, or today through today + `days`. */
function setRange(
  days: number,
  setFrom: (v: string) => void,
  setTo: (v: string) => void
) {
  const today = new Date();
  const end = new Date();
  end.setDate(end.getDate() + days);
  setFrom(today.toISOString().split("T")[0]);
  setTo(end.toISOString().split("T")[0]);
}

function StatusPill({ status }: { status: Booking["paymentStatus"] }) {
  if (status === "success") {
    return (
      <span className="inline-flex items-center gap-1.5 bg-green-50 text-green-700 px-2.5 py-1 rounded-full text-[10px] font-bold border border-green-100 whitespace-nowrap">
        <CheckCircle2 size={11} /> Confirmed
      </span>
    );
  }
  if (status === "pending") {
    return (
      <span className="inline-flex items-center gap-1.5 bg-amber-50 text-amber-700 px-2.5 py-1 rounded-full text-[10px] font-bold border border-amber-100 whitespace-nowrap">
        <Clock size={11} /> Awaiting payment
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 bg-red-50 text-red-700 px-2.5 py-1 rounded-full text-[10px] font-bold border border-red-100 whitespace-nowrap">
      <XCircle size={11} /> Rejected
    </span>
  );
}

/**
 * Open WhatsApp with the right message already typed.
 *
 * This is the whole no-cost messaging story: no Meta business account, no
 * template approval, no per-message fee. When WHATSAPP_TOKEN *is* configured
 * the server sends confirmations automatically and this stays available for
 * everything else — reminders, chasing a missing payment.
 */
function WhatsAppButton({ booking, compact = false }: { booking: Booking; compact?: boolean }) {
  const kind =
    booking.paymentStatus === "success"
      ? "confirmed"
      : booking.paymentStatus === "failed"
        ? "rejected"
        : "created";

  const href = whatsappLink(
    booking.phone || "",
    bookingMessage(
      {
        bookingId: booking.bookingId,
        userName: booking.userName,
        totalAmount: booking.totalAmount,
        eventDate: booking.eventDate,
        sevas: booking.sevas || [],
        upiRef: booking.upiRef,
      },
      kind
    )
  );

  if (compact) {
    return (
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        title={`WhatsApp ${booking.userName}`}
        className="text-gray-400 hover:text-green-600 transition-colors p-2 hover:bg-green-50 rounded-lg"
      >
        <MessageCircle size={17} />
      </a>
    );
  }

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="flex-1 flex items-center justify-center gap-2 bg-green-50 hover:bg-green-100 text-green-700 border border-green-100 rounded-xl px-4 py-2.5 text-[11px] font-bold uppercase tracking-wider transition-colors"
    >
      <MessageCircle size={14} /> WhatsApp
    </a>
  );
}

function downloadReceipt(booking: Booking) {
  generatePremiumReceipt(booking).save(`Receipt_${booking.bookingId}.pdf`);
}

// ─── Desktop row ──────────────────────────────────────────────────────────────

function BookingRow({
  booking,
  onSettle,
}: {
  booking: Booking;
  onSettle: (action: "confirm" | "reject") => void;
}) {
  return (
    <tr className="hover:bg-gray-50/50 transition-colors">
      <td className="px-6 py-5">
        <div className="flex items-center gap-3.5">
          <div className="w-9 h-9 rounded-full bg-saffron-50 border border-saffron-100 flex items-center justify-center text-saffron-700 text-sm font-bold shrink-0">
            {booking.userName?.[0]?.toUpperCase() ?? "?"}
          </div>
          <div className="min-w-0">
            <p className="font-bold text-gray-900 text-sm truncate">{booking.userName}</p>
            <p className="text-[10px] text-saffron-600 font-mono font-bold tracking-wider">
              {booking.bookingId}
            </p>
            <p className="text-[11px] text-gray-400 flex items-center gap-1 mt-0.5">
              <Phone size={10} /> {booking.phone}
            </p>
          </div>
        </div>
      </td>

      <td className="px-4 py-5">
        <div className="flex flex-wrap gap-1 max-w-[220px]">
          {booking.sevas?.map((s, i) => (
            <span
              key={i}
              className="bg-gray-100 text-gray-600 px-2 py-0.5 rounded text-[10px] font-medium border border-gray-200"
            >
              {s.name}
            </span>
          ))}
        </div>
      </td>

      <td className="px-4 py-5">
        <p className="font-bold text-gray-900 text-sm tabular-nums whitespace-nowrap">
          ₹{(booking.totalAmount || 0).toLocaleString("en-IN")}
        </p>
        <PaymentRef booking={booking} />
      </td>

      <td className="px-4 py-5">
        <p className="text-[11px] text-gray-400">
          Booked <span className="text-gray-600 font-bold tabular-nums">{booking.bookingDate}</span>
        </p>
        <p className="text-[11px] text-gray-400 mt-0.5">
          Seva <span className="text-saffron-700 font-bold tabular-nums">{booking.eventDate}</span>
        </p>
      </td>

      <td className="px-4 py-5">
        <StatusPill status={booking.paymentStatus} />
      </td>

      <td className="px-6 py-5">
        <div className="flex items-center justify-end gap-1.5">
          {booking.paymentStatus === "pending" ? (
            <>
              <button
                onClick={() => onSettle("confirm")}
                className="bg-green-600 hover:bg-green-700 text-white px-3 py-2 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-colors whitespace-nowrap"
              >
                Mark paid
              </button>
              <button
                onClick={() => onSettle("reject")}
                className="bg-gray-50 hover:bg-gray-100 text-gray-500 border border-gray-200 px-3 py-2 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-colors"
              >
                Reject
              </button>
            </>
          ) : booking.paymentStatus === "success" ? (
            <button
              onClick={() => downloadReceipt(booking)}
              title="Download receipt"
              className="text-gray-400 hover:text-saffron-600 transition-colors p-2 hover:bg-saffron-50 rounded-lg"
            >
              <Download size={17} />
            </button>
          ) : null}
          <WhatsAppButton booking={booking} compact />
        </div>
      </td>
    </tr>
  );
}

/**
 * The reference the devotee typed, versus the one an admin verified.
 *
 * Kept visually distinct on purpose: `devoteeUpiRef` is an unverified claim
 * anyone could have typed, `upiRef` is what a human matched against the bank
 * statement. Collapsing them into one line would let a claim read as a proof.
 */
function PaymentRef({ booking }: { booking: Booking }) {
  if (booking.upiRef) {
    return (
      <p className="text-[10px] text-green-700 font-mono mt-1 flex items-center gap-1" title="Verified by the temple office">
        <CheckCircle2 size={9} /> {booking.upiRef}
      </p>
    );
  }
  if (booking.devoteeUpiRef) {
    return (
      <p
        className="text-[10px] text-gray-400 font-mono mt-1 flex items-center gap-1"
        title="Entered by the devotee — not yet verified"
      >
        <Hash size={9} /> {booking.devoteeUpiRef}
      </p>
    );
  }
  return null;
}

// ─── Mobile card ──────────────────────────────────────────────────────────────

function BookingCard({
  booking,
  onSettle,
}: {
  booking: Booking;
  onSettle: (action: "confirm" | "reject") => void;
}) {
  return (
    <div className="bg-white border border-gray-200/70 rounded-2xl p-4 space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="font-bold text-gray-900 text-sm truncate">{booking.userName}</p>
          <p className="text-[10px] text-saffron-600 font-mono font-bold tracking-wider">
            {booking.bookingId}
          </p>
          <a
            href={`tel:${booking.phone}`}
            className="text-[11px] text-gray-500 flex items-center gap-1 mt-1 hover:text-saffron-700"
          >
            <Phone size={10} /> {booking.phone}
          </a>
        </div>
        <StatusPill status={booking.paymentStatus} />
      </div>

      <div className="flex flex-wrap gap-1">
        {booking.sevas?.map((s, i) => (
          <span
            key={i}
            className="bg-gray-100 text-gray-600 px-2 py-0.5 rounded text-[10px] font-medium border border-gray-200"
          >
            {s.name}
          </span>
        ))}
      </div>

      <div className="flex items-center justify-between pt-2 border-t border-gray-100">
        <div>
          <p className="font-bold text-gray-900 flex items-center gap-0.5 tabular-nums">
            <IndianRupee size={13} className="text-gray-400" />
            {(booking.totalAmount || 0).toLocaleString("en-IN")}
          </p>
          <PaymentRef booking={booking} />
        </div>
        <p className="text-[11px] text-gray-400 text-right">
          Seva <span className="text-saffron-700 font-bold tabular-nums">{booking.eventDate}</span>
        </p>
      </div>

      <div className="flex gap-2 pt-1">
        {booking.paymentStatus === "pending" ? (
          <>
            <button
              onClick={() => onSettle("confirm")}
              className="flex-1 bg-green-600 hover:bg-green-700 text-white rounded-xl px-4 py-2.5 text-[11px] font-bold uppercase tracking-wider transition-colors"
            >
              Mark paid
            </button>
            <button
              onClick={() => onSettle("reject")}
              className="bg-gray-50 hover:bg-gray-100 text-gray-500 border border-gray-200 rounded-xl px-4 py-2.5 text-[11px] font-bold uppercase tracking-wider transition-colors"
            >
              Reject
            </button>
          </>
        ) : (
          <>
            <WhatsAppButton booking={booking} />
            {booking.paymentStatus === "success" && (
              <button
                onClick={() => downloadReceipt(booking)}
                className="flex items-center justify-center gap-2 bg-gray-50 hover:bg-gray-100 text-gray-600 border border-gray-200 rounded-xl px-4 py-2.5 text-[11px] font-bold uppercase tracking-wider transition-colors"
              >
                <Download size={14} /> Receipt
              </button>
            )}
          </>
        )}
      </div>
    </div>
  );
}

// ─── Settle dialog ────────────────────────────────────────────────────────────

/**
 * Confirming a payment is not undoable from the UI, so it takes a deliberate
 * second step rather than a single stray click. The step earns its place by
 * doing something useful: capturing the bank reference, which is what a future
 * dispute gets resolved with.
 */
function SettleDialog({
  booking,
  action,
  busy,
  onCancel,
  onConfirm,
}: {
  booking: Booking;
  action: "confirm" | "reject";
  busy: boolean;
  onCancel: () => void;
  onConfirm: (upiRef: string) => void;
}) {
  // Pre-filled with whatever the devotee said they paid with — usually correct,
  // and the admin only has to check it against the statement rather than retype.
  const [upiRef, setUpiRef] = useState(booking.devoteeUpiRef || "");
  const isConfirm = action === "confirm";

  return (
    <div
      className="fixed inset-0 z-[200] bg-black/40 backdrop-blur-sm flex items-end sm:items-center justify-center sm:p-4"
      onClick={busy ? undefined : onCancel}
    >
      {/* Bottom sheet on phones — confirming payments is the job most often
          done standing in the temple office with a phone in hand. */}
      <div
        onClick={(e) => e.stopPropagation()}
        className="bg-white w-full sm:max-w-md rounded-t-[1.75rem] sm:rounded-3xl shadow-2xl p-5 sm:p-8 max-h-[92dvh] overflow-y-auto pb-[max(1.25rem,env(safe-area-inset-bottom))]"
      >
        <div className="sm:hidden -mt-1 mb-4 flex justify-center">
          <span className="w-10 h-1 rounded-full bg-gray-300" />
        </div>
        <div className="flex items-start gap-4 mb-6">
          <div
            className={`w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 ${
              isConfirm ? "bg-green-50 text-green-600" : "bg-red-50 text-red-600"
            }`}
          >
            {isConfirm ? <CheckCircle2 size={22} /> : <XCircle size={22} />}
          </div>
          <div>
            <h2 className="font-serif text-xl text-gray-900">
              {isConfirm ? "Mark this booking paid?" : "Reject this booking?"}
            </h2>
            <p className="text-[12px] text-gray-500 mt-1 leading-relaxed">
              {isConfirm
                ? "Only do this once you have seen the money in the temple's account. This cannot be undone here."
                : "The devotee will be told no payment was traced. They can still send the reference to have it reviewed."}
            </p>
          </div>
        </div>

        <div className="bg-gray-50 rounded-2xl p-4 mb-5 space-y-1.5">
          <Row label="Devotee" value={booking.userName} />
          <Row label="Reference" value={booking.bookingId} mono />
          <Row label="Amount" value={`₹${(booking.totalAmount || 0).toLocaleString("en-IN")}`} />
          <Row label="Seva date" value={prettyDate(booking.eventDate)} />
          {booking.devoteeUpiRef && (
            <Row label="Devotee says they paid with" value={booking.devoteeUpiRef} mono />
          )}
        </div>

        {isConfirm && (
          <div className="mb-6">
            <label
              htmlFor="settle-ref"
              className="text-[10px] uppercase tracking-wider font-bold text-gray-400 mb-1.5 block px-1"
            >
              Bank / UPI reference <span className="text-gray-300">— optional</span>
            </label>
            <input
              id="settle-ref"
              type="text"
              value={upiRef}
              onChange={(e) => setUpiRef(e.target.value)}
              placeholder="The reference next to the credit in your statement"
              maxLength={60}
              className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-saffron-400/25"
            />
            <p className="text-[11px] text-gray-400 mt-1.5 px-1 leading-relaxed">
              Saved on the booking and printed on the devotee&apos;s receipt.
            </p>
          </div>
        )}

        <div className="flex gap-3">
          <button
            onClick={onCancel}
            disabled={busy}
            className="flex-1 bg-gray-50 hover:bg-gray-100 text-gray-600 font-bold py-3.5 rounded-xl text-[11px] uppercase tracking-wider transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={() => onConfirm(upiRef.trim())}
            disabled={busy}
            className={`flex-1 text-white font-bold py-3.5 rounded-xl text-[11px] uppercase tracking-wider transition-colors flex items-center justify-center gap-2 disabled:opacity-60 ${
              isConfirm ? "bg-green-600 hover:bg-green-700" : "bg-red-600 hover:bg-red-700"
            }`}
          >
            {busy && <Loader2 size={14} className="animate-spin" />}
            {busy ? "Saving…" : isConfirm ? "Yes, mark paid" : "Yes, reject"}
          </button>
        </div>
      </div>
    </div>
  );
}

function Row({ label, value, mono = false }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex items-baseline justify-between gap-4 text-[12px]">
      <span className="text-gray-400 shrink-0">{label}</span>
      <span className={`text-gray-800 font-bold text-right truncate ${mono ? "font-mono" : ""}`}>
        {value}
      </span>
    </div>
  );
}
