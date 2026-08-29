"use client";
/**
 * Admin – Manage Announcements (CRUD).
 */
import { useEffect, useState } from "react";
import {
  subscribeAnnouncements,
  addAnnouncement,
  updateAnnouncement,
  deleteAnnouncement,
  Announcement,
} from "@/lib/firestore";
import { Pencil, Trash2, Plus, X, Bell, BellOff } from "lucide-react";
import { Timestamp } from "firebase/firestore";
import { auth } from "@/lib/firebase";

type FormState = { title: string; description: string; date: string };
const EMPTY: FormState = { title: "", description: "", date: "" };

/**
 * Push the announcement to every subscribed devotee.
 * Returns a short human-readable outcome for the admin, or null on success
 * with nobody subscribed.
 */
async function pushToDevotees(a: { title: string; description: string; id?: string }) {
  const user = auth.currentUser;
  if (!user) throw new Error("You are signed out — please sign in again.");

  const idToken = await user.getIdToken();

  const res = await fetch("/api/notify", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${idToken}` },
    body: JSON.stringify({
      title: a.title,
      body: a.description.slice(0, 240),
      announcementId: a.id || "",
      url: "/announcements",
    }),
  });

  const result = await res.json().catch(() => ({}));

  if (!res.ok) {
    if (result?.reason === "admin_not_configured") {
      throw new Error(
        "Notifications aren't configured on the server yet (FIREBASE_SERVICE_ACCOUNT is missing)."
      );
    }
    throw new Error(result?.error || "Could not send notifications.");
  }

  return result as { sent: number; failed: number; pruned: number; note?: string };
}

function formatDisplayDate(date: Timestamp | string | undefined): string {
  if (!date) return "";
  if (date instanceof Timestamp) return date.toDate().toLocaleDateString("en-IN");
  return new Date(date).toLocaleDateString("en-IN");
}

export default function AdminAnnouncementsPage() {
  const [items, setItems] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<FormState>(EMPTY);
  const [editId, setEditId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [error, setError] = useState("");
  const [notify, setNotify] = useState(true);
  const [notifyStatus, setNotifyStatus] = useState("");

  // Live, so a post appears here and on the public site straight away.
  useEffect(() => {
    return subscribeAnnouncements((data) => {
      setItems(data);
      setLoading(false);
    });
  }, []);

  const openAdd = () => { setForm(EMPTY); setEditId(null); setShowForm(true); setError(""); };

  const openEdit = (a: Announcement) => {
    const dateStr = a.date instanceof Timestamp
      ? a.date.toDate().toISOString().split("T")[0]
      : typeof a.date === "string" ? a.date : "";
    setForm({ title: a.title, description: a.description, date: dateStr });
    setEditId(a.id!);
    setShowForm(true);
    setError("");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title || !form.description || !form.date) {
      setError("Please fill all fields.");
      return;
    }
    setSaving(true);
    setNotifyStatus("");
    try {
      const data = { title: form.title, description: form.description, date: form.date };
      let newId: string | undefined;

      if (editId) {
        await updateAnnouncement(editId, data);
      } else {
        const ref = await addAnnouncement(data);
        newId = ref.id;
      }

      setShowForm(false);
      setEditId(null);
      // The subscription delivers the saved document; no manual reload needed.

      // Notifying is a separate step: a failure here must not make the admin
      // think the announcement itself didn't save.
      if (notify) {
        try {
          const result = await pushToDevotees({ ...data, id: newId });
          setNotifyStatus(
            result.note
              ? result.note
              : `Notification sent to ${result.sent} devotee${result.sent === 1 ? "" : "s"}` +
                  (result.failed ? ` (${result.failed} failed)` : "")
          );
        } catch (err) {
          setNotifyStatus(`Announcement saved, but notification failed: ${(err as Error).message}`);
        }
      }
    } catch (err) {
      const errorObj = err as Error;
      setError(errorObj.message || "Failed to save announcement.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this announcement? This cannot be undone.")) return;
    await deleteAnnouncement(id);
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-extrabold text-gray-800">Announcements</h1>
          <p className="text-sm text-gray-500">Post temple news, events, and festival updates</p>
        </div>
        <button
          onClick={openAdd}
          className="flex items-center gap-2 bg-amber-600 hover:bg-amber-700 text-white text-sm font-semibold px-4 py-2.5 rounded-xl transition-colors"
        >
          <Plus size={16} /> New Announcement
        </button>
      </div>

      {notifyStatus && (
        <div className="mb-6 flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
          <Bell size={16} className="mt-0.5 shrink-0 text-amber-600" />
          <p className="flex-1 text-sm text-amber-900">{notifyStatus}</p>
          <button
            onClick={() => setNotifyStatus("")}
            className="text-amber-400 transition-colors hover:text-amber-700"
            aria-label="Dismiss"
          >
            <X size={16} />
          </button>
        </div>
      )}

      {/* Modal Form */}
      {showForm && (
        <div
          className="fixed inset-0 z-[150] bg-black/40 backdrop-blur-sm flex items-end sm:items-center justify-center sm:p-4"
          onClick={() => setShowForm(false)}
        >
          {/* Same bottom-sheet treatment as the seva form — see the note there
              for why: this dashboard is used from a phone far more than a desk. */}
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-white w-full sm:max-w-lg rounded-t-[1.75rem] sm:rounded-2xl shadow-2xl flex flex-col max-h-[92dvh] sm:max-h-[88vh]"
          >
            <div className="sm:hidden pt-3 pb-1 flex justify-center shrink-0">
              <span className="w-10 h-1 rounded-full bg-gray-300" />
            </div>
            <div className="flex items-center justify-between px-5 sm:px-6 pt-4 sm:pt-6 pb-4 border-b border-gray-100 shrink-0">
              <h2 className="text-lg sm:text-xl font-bold text-gray-800 truncate">{editId ? "Edit Announcement" : "New Announcement"}</h2>
              <button type="button" aria-label="Close" onClick={() => setShowForm(false)} className="p-2 -mr-2 shrink-0"><X size={22} className="text-gray-400 hover:text-gray-600" /></button>
            </div>
            <form onSubmit={handleSubmit} className="flex flex-col min-h-0 flex-1">
              <div className="overflow-y-auto px-5 sm:px-6 py-5 space-y-4 flex-1">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Title *</label>
                <input
                  type="text"
                  required
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  placeholder="e.g. Ganesha Chaturthi Celebrations"
                  className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Description *</label>
                <textarea
                  required
                  rows={4}
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  placeholder="Announcement details..."
                  className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 resize-none"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Event Date *</label>
                <input
                  type="date"
                  required
                  value={form.date}
                  onChange={(e) => setForm({ ...form, date: e.target.value })}
                  className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
                />
              </div>
              {/* Push notification opt-in */}
              <button
                type="button"
                onClick={() => setNotify((n) => !n)}
                className={`w-full flex items-center gap-3 rounded-xl border px-4 py-3 text-left transition-colors ${
                  notify
                    ? "border-amber-300 bg-amber-50"
                    : "border-gray-200 bg-gray-50 hover:bg-gray-100"
                }`}
              >
                <span
                  className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${
                    notify ? "bg-amber-600 text-white" : "bg-gray-200 text-gray-500"
                  }`}
                >
                  {notify ? <Bell size={16} /> : <BellOff size={16} />}
                </span>
                <span className="flex-1">
                  <span className="block text-sm font-semibold text-gray-800">
                    {notify ? "Notify all devotees" : "Don't notify"}
                  </span>
                  <span className="block text-xs text-gray-500">
                    {notify
                      ? "Everyone who enabled temple alerts gets a push notification."
                      : "Post silently — no notification will be sent."}
                  </span>
                </span>
                <span
                  className={`relative h-6 w-11 shrink-0 rounded-full transition-colors ${
                    notify ? "bg-amber-600" : "bg-gray-300"
                  }`}
                >
                  <span
                    className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all ${
                      notify ? "left-[22px]" : "left-0.5"
                    }`}
                  />
                </span>
              </button>

                {error && <p className="text-red-500 text-sm">{error}</p>}
              </div>

              {/* Pinned, so Save stays reachable above a phone keyboard. */}
              <div className="flex gap-3 px-5 sm:px-6 py-4 border-t border-gray-100 shrink-0 rounded-b-[1.75rem] sm:rounded-b-2xl pb-[max(1rem,env(safe-area-inset-bottom))]">
                <button type="button" onClick={() => setShowForm(false)} className="flex-1 border border-gray-200 text-gray-600 hover:bg-gray-50 font-semibold py-2.5 rounded-xl transition-colors text-sm">Cancel</button>
                <button type="submit" disabled={saving} className="flex-1 bg-amber-600 hover:bg-amber-700 disabled:opacity-60 text-white font-semibold py-2.5 rounded-xl transition-colors text-sm">
                  {saving ? "Saving…" : editId ? "Update" : "Post"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* List */}
      {loading ? (
        <div className="flex justify-center py-16"><div className="animate-spin rounded-full h-10 w-10 border-4 border-amber-500 border-t-transparent" /></div>
      ) : items.length === 0 ? (
        <div className="text-center py-16 text-gray-400"><p className="text-4xl mb-3">📭</p><p>No announcements yet.</p></div>
      ) : (
        <div className="space-y-4">
          {items.map((a) => (
            <div key={a.id} className="bg-white border border-gray-100 rounded-2xl p-5 flex items-start justify-between gap-4 hover:shadow-sm transition-shadow">
              <div className="flex-1">
                <p className="text-xs text-amber-600 font-medium mb-1">📅 {formatDisplayDate(a.date)}</p>
                <h3 className="font-bold text-gray-800">{a.title}</h3>
                <p className="text-sm text-gray-500 mt-1 line-clamp-2">{a.description}</p>
              </div>
              <div className="flex gap-2 flex-shrink-0">
                <button onClick={() => openEdit(a)} className="p-2 bg-amber-50 hover:bg-amber-100 text-amber-700 rounded-xl transition-colors" title="Edit"><Pencil size={16} /></button>
                <button onClick={() => handleDelete(a.id!)} className="p-2 bg-red-50 hover:bg-red-100 text-red-600 rounded-xl transition-colors" title="Delete"><Trash2 size={16} /></button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
