"use client";
/**
 * Admin – Manage Sevas (CRUD).
 * Unified form for basic and special sevas.
 * Special sevas expose extra date fields; isActive toggle applies to ALL types.
 */
import { useEffect, useState } from "react";
import { getSevas, addSeva, updateSeva, deleteSeva, getSevaAvailability, Seva } from "@/lib/firestore";
import { Pencil, Trash2, Plus, X, Clock } from "lucide-react";

type FormState = Omit<Seva, "id">;

const EMPTY: FormState = {
  name: "",
  description: "",
  price: 0,
  type: "basic",
  isActive: true,
  availableFrom: "",
  availableTo: "",
  eventDate: "",
  maxBookings: 0,
  currentBookings: 0,
};

function fmtDate(iso?: string) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

const AVAIL_COLORS = {
  open:     "bg-green-100 text-green-700",
  upcoming: "bg-blue-100 text-blue-700",
  closed:   "bg-gray-100 text-gray-500",
  inactive: "bg-red-100 text-red-700",
  basic:    "bg-orange-50 text-orange-600",
  full:     "bg-purple-100 text-purple-700",
};
const AVAIL_LABELS = {
  open: "Booking Open",
  upcoming: "Upcoming",
  closed: "Closed",
  inactive: "Inactive",
  basic: "Active",
  full: "Sold Out",
};

export default function AdminSevasPage() {
  const [sevas, setSevas] = useState<Seva[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<FormState>(EMPTY);
  const [editId, setEditId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [error, setError] = useState("");

  const load = async () => {
    setLoading(true);
    // Force fresh fetch by adding a small delay or ensuring no cache
    const freshSevas = await getSevas();
    setSevas(freshSevas);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const openAdd = () => { setForm(EMPTY); setEditId(null); setShowForm(true); setError(""); };

  const openEdit = (seva: Seva) => {
    setForm({
      name: seva.name,
      description: seva.description,
      price: seva.price,
      type: seva.type,
      isActive: seva.isActive ?? true,
      availableFrom: seva.availableFrom ?? "",
      availableTo: seva.availableTo ?? "",
      eventDate: seva.eventDate ?? "",
      maxBookings: seva.maxBookings ?? 0,
      currentBookings: seva.currentBookings ?? 0,
    });
    setEditId(seva.id!);
    setShowForm(true);
    setError("");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || !form.description || form.price <= 0) {
      setError("Please fill all required fields with valid values.");
      return;
    }
    if (form.type === "special") {
      if (!form.availableFrom || !form.availableTo || !form.eventDate) {
        setError("Special sevas require Booking From, Booking To, and Event Date.");
        return;
      }
    }
    setSaving(true);
    try {
      const payload: Omit<Seva, "id"> = {
        ...form,
        maxBookings: Number(form.maxBookings) || 0,
      };

      if (editId) {
        await updateSeva(editId, payload);
      } else {
        await addSeva(payload);
      }
      setShowForm(false);
      setEditId(null);
      // Small artificial delay to let Firestore sync
      setTimeout(() => { load(); }, 500);
    } catch (err) {
      const errorObj = err as Error;
      setError(errorObj.message || "Failed to save seva.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Delete "${name}"? This cannot be undone.`)) return;
    await deleteSeva(id);
    await load();
  };

  const isSpecial = form.type === "special";

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-extrabold text-gray-800">Manage Sevas</h1>
          <p className="text-sm text-gray-500">Add, edit or remove temple sevas</p>
        </div>
        <button
          onClick={openAdd}
          className="flex items-center gap-2 bg-amber-600 hover:bg-amber-700 text-white text-sm font-semibold px-4 py-2.5 rounded-xl transition-colors"
        >
          <Plus size={16} /> Add Seva
        </button>
      </div>

      {/* ── Modal Form ── */}
      {showForm && (
        <div className="fixed inset-0 z-[150] bg-black/20 backdrop-blur-md flex items-start justify-center p-4 pt-10 md:pt-20 overflow-y-auto">
          <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-lg p-8 relative animate-in fade-in zoom-in duration-300">
            <div className="flex items-center justify-between mb-8">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-saffron-50 rounded-2xl flex items-center justify-center text-saffron-600">
                  <Plus size={20} />
                </div>
                <h2 className="text-2xl font-serif text-gray-900">{editId ? "Edit Seva" : "Add New Seva"}</h2>
              </div>
              <button onClick={() => setShowForm(false)} className="text-gray-400 hover:text-gray-600 p-2 hover:bg-gray-50 rounded-full transition-colors"><X size={24} /></button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-8">
              <div className="space-y-6">
                <div>
                  <label className="text-[10px] uppercase tracking-widest font-bold text-gray-400 mb-2 block px-1">Seva Name *</label>
                  <input
                    type="text" required
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    placeholder="e.g. Ganapathi Homam"
                    className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-6 py-4 text-sm focus:outline-none focus:ring-2 focus:ring-saffron-400/20 transition-all"
                  />
                </div>

                <div>
                  <label className="text-[10px] uppercase tracking-widest font-bold text-gray-400 mb-2 block px-1">Description *</label>
                  <textarea
                    required rows={2}
                    value={form.description}
                    onChange={(e) => setForm({ ...form, description: e.target.value })}
                    placeholder="Brief description of the seva..."
                    className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-6 py-4 text-sm focus:outline-none focus:ring-2 focus:ring-saffron-400/20 transition-all resize-none"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-[10px] uppercase tracking-widest font-bold text-gray-400 mb-2 block px-1">Price (₹) *</label>
                    <input
                      type="number" required min={1}
                      value={form.price || ""}
                      onChange={(e) => setForm({ ...form, price: Number(e.target.value) })}
                      placeholder="0"
                      className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-6 py-4 text-sm focus:outline-none focus:ring-2 focus:ring-saffron-400/20 transition-all"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] uppercase tracking-widest font-bold text-gray-400 mb-2 block px-1">Booking Capacity</label>
                    <div className="relative flex items-center bg-gray-50 border border-gray-100 rounded-2xl px-4 focus-within:ring-2 focus-within:ring-saffron-400/20 transition-all">
                      <input
                        type="number" min={0}
                        value={form.maxBookings || ""}
                        onChange={(e) => setForm({ ...form, maxBookings: Number(e.target.value) })}
                        placeholder="∞"
                        className="w-full bg-transparent py-4 text-sm focus:outline-none"
                      />
                      <span className="text-[8px] font-bold text-gray-400 uppercase tracking-widest ml-2">Limit</span>
                    </div>
                  </div>
                </div>

                <div>
                  <label className="text-[10px] uppercase tracking-widest font-bold text-gray-400 mb-2 block px-1">Seva Type *</label>
                  <select
                    value={form.type}
                    onChange={(e) => setForm({ ...form, type: e.target.value as "basic" | "special" })}
                    className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-6 py-4 text-sm focus:outline-none focus:ring-2 focus:ring-saffron-400/20 transition-all appearance-none cursor-pointer"
                  >
                    <option value="basic">🙏 Basic Seva</option>
                    <option value="special">✨ Special Seva</option>
                  </select>
                </div>
              </div>

              {/* Special Configuration Section */}
              {isSpecial && (
                <div className="bg-saffron-50/50 border border-saffron-100 rounded-[2rem] p-6 space-y-6">
                  <div className="flex items-center gap-2 mb-2">
                    <Clock size={16} className="text-saffron-600" />
                    <span className="text-xs font-bold uppercase tracking-widest text-saffron-800">Booking Schedule</span>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-[9px] uppercase tracking-widest font-bold text-saffron-600/60 mb-2 block px-1">Booking Opens</label>
                      <input
                        type="date" required={isSpecial}
                        value={form.availableFrom ?? ""}
                        onChange={(e) => setForm({ ...form, availableFrom: e.target.value })}
                        className="w-full bg-white border border-saffron-100 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-saffron-400/20 transition-all"
                      />
                    </div>
                    <div>
                      <label className="text-[9px] uppercase tracking-widest font-bold text-saffron-600/60 mb-2 block px-1">Booking Closes</label>
                      <input
                        type="date" required={isSpecial}
                        value={form.availableTo ?? ""}
                        min={form.availableFrom ?? undefined}
                        onChange={(e) => setForm({ ...form, availableTo: e.target.value })}
                        className="w-full bg-white border border-saffron-100 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-saffron-400/20 transition-all"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-[9px] uppercase tracking-widest font-bold text-saffron-600/60 mb-2 block px-1">Seva Performance Date</label>
                    <input
                      type="date" required={isSpecial}
                      value={form.eventDate ?? ""}
                      onChange={(e) => setForm({ ...form, eventDate: e.target.value })}
                      className="w-full bg-white border border-saffron-100 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-saffron-400/20 transition-all"
                    />
                  </div>
                </div>
              )}

              {/* Status Section */}
              <div className="flex items-center justify-between bg-gray-50 border border-gray-100 rounded-2xl px-6 py-4">
                <div>
                  <p className="text-xs font-bold text-gray-900 uppercase tracking-widest">Active Status</p>
                  <p className="text-[10px] text-gray-400 mt-0.5 font-medium">Visible to devotees on the website</p>
                </div>
                <button
                  type="button"
                  onClick={() => setForm({ ...form, isActive: !form.isActive })}
                  className={`relative inline-flex h-7 w-12 items-center rounded-full transition-all focus:outline-none ${
                    form.isActive !== false ? "bg-saffron-600 shadow-lg shadow-saffron-900/20" : "bg-gray-300"
                  }`}
                >
                  <span
                    className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform ${
                      form.isActive !== false ? "translate-x-6" : "translate-x-1"
                    }`}
                  />
                </button>
              </div>

              {error && (
                <div className="bg-red-50 border border-red-100 text-red-600 text-[10px] font-bold px-5 py-4 rounded-2xl flex items-center gap-3">
                  <div className="w-1.5 h-1.5 rounded-full bg-red-600 animate-pulse" />
                  {error}
                </div>
              )}

              <div className="flex gap-4 pt-4 border-t border-gray-50">
                <button type="button" onClick={() => setShowForm(false)} className="flex-1 bg-gray-50 text-gray-500 hover:bg-gray-100 font-bold py-4 rounded-2xl text-[10px] uppercase tracking-[0.2em] transition-all">
                  Discard
                </button>
                <button type="submit" disabled={saving} className="flex-1 bg-foreground text-ivory hover:bg-saffron-700 disabled:opacity-60 font-bold py-4 rounded-2xl text-[10px] uppercase tracking-[0.2em] transition-all shadow-lg shadow-gray-200">
                  {saving ? "Saving…" : editId ? "Commit Changes" : "Create Seva"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Seva List ── */}
      {loading ? (
        <div className="flex justify-center py-16">
          <div className="animate-spin rounded-full h-10 w-10 border-4 border-saffron-500 border-t-transparent" />
        </div>
      ) : sevas.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <p className="text-4xl mb-3">🙏</p>
          <p>No sevas added yet. Click &quot;Add Seva&quot; to get started.</p>
        </div>
      ) : (
        <div className="grid gap-6">
          {sevas.map((seva) => {
            const avail = getSevaAvailability(seva);
            return (
              <div key={seva.id} className="bg-white border border-gray-100 rounded-[2rem] p-6 md:p-8 flex flex-col md:flex-row items-start justify-between gap-6 hover:shadow-xl hover:shadow-saffron-900/5 transition-all">
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-3 mb-3">
                    <span className={`text-[10px] uppercase tracking-widest font-bold px-3 py-1 rounded-full ${seva.type === "special" ? "bg-amber-100 text-amber-700" : "bg-orange-50 text-orange-600"}`}>
                      {seva.type === "special" ? "✨ Special Seva" : "🙏 Basic Seva"}
                    </span>
                    {(avail !== "basic" || seva.isActive === false) && (
                      <span className={`text-[10px] uppercase tracking-widest font-bold px-3 py-1 rounded-full ${AVAIL_COLORS[avail]}`}>
                        {AVAIL_LABELS[avail]}
                      </span>
                    )}
                  </div>

                  <h3 className="text-xl font-serif text-gray-900 mb-2">{seva.name}</h3>
                  <p className="text-sm text-gray-500 leading-relaxed mb-4 line-clamp-2 md:line-clamp-none">{seva.description}</p>
                  
                  <div className="flex flex-wrap items-center gap-6">
                    <p className="text-lg font-bold text-saffron-700 whitespace-nowrap">₹{seva.price.toLocaleString("en-IN")}</p>
                    
                    {/* Booking Limit Progress */}
                    {seva.maxBookings ? (
                      <div className="flex items-center gap-3 border-l border-gray-200 pl-6">
                        <div className="text-[10px] font-bold uppercase tracking-widest text-gray-400">
                          Capacity: <span className="text-gray-900">{seva.currentBookings || 0} / {seva.maxBookings}</span>
                        </div>
                        <div className="w-20 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                          <div 
                            className={`h-full transition-all duration-1000 ${
                              (seva.currentBookings || 0) >= seva.maxBookings ? "bg-purple-500" : "bg-saffron-500"
                            }`}
                            style={{ width: `${Math.min(100, ((seva.currentBookings || 0) / seva.maxBookings) * 100)}%` }}
                          />
                        </div>
                      </div>
                    ) : (
                      <div className="text-[10px] font-bold uppercase tracking-widest text-gray-300 border-l border-gray-200 pl-6 italic">
                        Unlimited Capacity
                      </div>
                    )}

                    {/* Date summary for special sevas */}
                    {seva.type === "special" && (
                      <div className="flex flex-wrap gap-x-4 gap-y-1 text-[10px] font-bold uppercase tracking-widest text-gray-400 border-l border-gray-200 pl-6">
                        {seva.availableFrom && <span>Booking: {fmtDate(seva.availableFrom)} → {fmtDate(seva.availableTo)}</span>}
                        {seva.eventDate && <span className="text-amber-600">Event: {fmtDate(seva.eventDate)}</span>}
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex md:flex-col gap-2 w-full md:w-auto pt-4 md:pt-0 border-t md:border-t-0 md:border-l border-gray-100 md:pl-6">
                  <button 
                    onClick={() => openEdit(seva)} 
                    className="flex-1 md:flex-none flex items-center justify-center gap-2 px-4 py-3 bg-saffron-50 hover:bg-saffron-100 text-saffron-700 rounded-2xl transition-all font-bold text-xs uppercase tracking-widest"
                  >
                    <Pencil size={14} /> Edit
                  </button>
                  <button 
                    onClick={() => handleDelete(seva.id!, seva.name)} 
                    className="flex-1 md:flex-none flex items-center justify-center gap-2 px-4 py-3 bg-red-50 hover:bg-red-100 text-red-600 rounded-2xl transition-all font-bold text-xs uppercase tracking-widest"
                  >
                    <Trash2 size={14} /> Delete
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
