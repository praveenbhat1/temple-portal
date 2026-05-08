"use client";
/**
 * Admin – Manage Announcements (CRUD).
 */
import { useEffect, useState } from "react";
import {
  getAnnouncements,
  addAnnouncement,
  updateAnnouncement,
  deleteAnnouncement,
  Announcement,
} from "@/lib/firestore";
import { Pencil, Trash2, Plus, X } from "lucide-react";
import { Timestamp } from "firebase/firestore";

type FormState = { title: string; description: string; date: string };
const EMPTY: FormState = { title: "", description: "", date: "" };

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

  const load = async () => {
    setLoading(true);
    setItems(await getAnnouncements());
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

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
    try {
      const data = { title: form.title, description: form.description, date: form.date };
      if (editId) {
        await updateAnnouncement(editId, data);
      } else {
        await addAnnouncement(data);
      }
      setShowForm(false);
      setEditId(null);
      await load();
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
    await load();
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

      {/* Modal Form */}
      {showForm && (
        <div className="fixed inset-0 z-[150] bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg p-6">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-xl font-bold text-gray-800">{editId ? "Edit Announcement" : "New Announcement"}</h2>
              <button onClick={() => setShowForm(false)}><X size={22} className="text-gray-400 hover:text-gray-600" /></button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4">
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
              {error && <p className="text-red-500 text-sm">{error}</p>}
              <div className="flex gap-3 pt-2">
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
