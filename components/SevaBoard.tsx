"use client";
import React from 'react';
import { Check } from "lucide-react";
import { SEVA_DATA, SevaGroup, ALL_SEVAS } from "@/lib/sevaData";
import { Seva, getSevaAvailability } from "@/lib/firestore";
import { TEMPLE_BANK, TEMPLE_BANK_LINE } from "@/lib/templeBank";

interface Props {
  selectedIds: string[];
  onToggle: (id: string, name: string, price: number) => void;
  extraSevas: Seva[];
}

export default function SevaBoard({ selectedIds, onToggle, extraSevas }: Props) {
  /**
   * Firestore is the source of truth; SEVA_DATA is the printed board it was
   * seeded from and now serves only as a fallback for entries that have no
   * Firestore document.
   *
   * This used to be the other way round by accident. Any Firestore seva whose
   * id or name matched a static one was DISCARDED, so the hardcoded price was
   * always what devotees saw. Editing a price in /admin appeared to do
   * nothing — and worse, it silently did something: the booking total and
   * /api/bookings/create both read Firestore, so the board advertised the old
   * price while the devotee was charged the new one.
   */
  const liveById = new Map(
    extraSevas.filter((s) => s.id).map((s) => [s.id as string, s])
  );

  /** Static board with live Firestore values laid over it, keyed by id. */
  const mergedGroups: SevaGroup[] = SEVA_DATA.map((group) => ({
    ...group,
    items: group.items
      // A seva switched off in the admin disappears from the board.
      .filter((item) => liveById.get(item.id)?.isActive !== false)
      .map((item) => {
        const live = liveById.get(item.id);
        if (!live) return item;
        return {
          ...item,
          nameEn: live.name?.trim() || item.nameEn,
          price: Number.isFinite(live.price) ? live.price : item.price,
          // Description is optional in the admin, so an empty one must not
          // wipe the note the printed board carries.
          noteEn: live.description?.trim() || item.noteEn,
        };
      }),
  })).filter((group) => group.items.length > 0);

  /** Sevas that exist only in Firestore — genuinely new offerings. */
  const staticIds = new Set(ALL_SEVAS.map((s) => s.id));
  const staticNames = new Set(ALL_SEVAS.map((s) => s.nameEn));
  const brandNewSevas = extraSevas.filter(
    (s) =>
      s.id &&
      !staticIds.has(s.id) &&
      !staticNames.has(s.name) &&
      s.isActive !== false
  );

  const dynamicGroup: SevaGroup = {
    titleEn: "SPECIAL OFFERINGS",
    titleKn: "ವಿಶೇಷ ಕೊಡುಗೆಗಳು",
    items: brandNewSevas.map(s => ({
      id: s.id!,
      nameEn: s.name,
      nameKn: s.name, 
      price: s.price,
      noteEn: s.description,
    }))
  };

  const allGroups = brandNewSevas.length > 0 ? [dynamicGroup, ...mergedGroups] : mergedGroups;

  // Availability (sold out / closed / upcoming) for anything Firestore knows.
  const dynamicItemsLookup = extraSevas.map(s => ({
    ...s,
    avail: getSevaAvailability(s)
  }));

  return (
    <div className="max-w-5xl mx-auto bg-white shadow-2xl border border-gray-200 rounded-sm overflow-hidden animate-fade-in">
      {/* Board Header */}
      <div className="bg-gradient-to-r from-vermillion to-saffron-700 px-4 py-5 md:p-8 text-center text-ivory border-b-4 border-gold-600">
        <div className="flex items-center justify-center gap-3 md:gap-4 md:mb-2">
          {/* shrink-0: without it the long title squeezed the logo into a sliver on phones. */}
          <div className="w-11 h-11 md:w-12 md:h-12 shrink-0 bg-white rounded-full flex items-center justify-center p-1 relative overflow-hidden shadow-sm">
             <img src="/ganapathi-logo.jpg" alt="Logo" className="w-full h-full object-contain p-1" />
          </div>
          <div className="text-left min-w-0">
            <h1 className="text-lg md:text-2xl font-serif font-bold tracking-wide leading-snug">Sunkadakatte Shri Vinayaka Temple</h1>
            <p className="text-[10px] md:text-xs uppercase tracking-[0.12em] md:tracking-[0.2em] opacity-80 leading-relaxed mt-0.5">Kallianpur Main Road, near Santhekatte, Udupi, Karnataka - 576115</p>
          </div>
        </div>
      </div>

      {/* Desktop/Tablet Table View */}
      <div className="hidden md:block overflow-x-auto">
        <table className="w-full border-collapse">
          <thead className="bg-saffron-100/50 text-saffron-900 border-b border-saffron-200">
            <tr>
              <th className="py-4 px-4 text-left text-xs font-bold uppercase tracking-wider w-16 border-r border-saffron-200/30">SI.No.</th>
              <th className="py-4 px-6 text-left text-xs font-bold uppercase tracking-wider border-r border-saffron-200/30">
                Seva Name / ಸೇವೆಯ ಹೆಸರು
              </th>
              <th className="py-4 px-6 text-right text-xs font-bold uppercase tracking-wider w-40">Charges / ಶುಲ್ಕ</th>
            </tr>
          </thead>
          
          <tbody className="divide-y divide-gray-100">
            {allGroups.map((group, gIdx) => (
              <React.Fragment key={gIdx}>
                <tr className="bg-vermillion text-ivory">
                  <td colSpan={3} className="py-3 px-6 font-serif text-sm md:text-base font-bold tracking-widest text-center uppercase">
                    {group.titleEn} / {group.titleKn}
                  </td>
                </tr>
                
                {group.items.map((item, iIdx) => {
                  const isSelected = selectedIds.includes(item.id);
                  // Find if it's a dynamic seva to check availability
                  const dSeva = dynamicItemsLookup.find(ds => ds.id === item.id);
                  const isFull = dSeva?.avail === "full";
                  const isUnavailable = dSeva?.avail === "inactive" || dSeva?.avail === "closed" || isFull;

                  return (
                    <tr 
                      key={item.id} 
                      onClick={() => !isUnavailable && onToggle(item.id, item.nameEn, item.price)}
                      className={`group hover:bg-saffron-50/50 transition-colors cursor-pointer ${isSelected ? 'bg-saffron-50' : ''} ${isUnavailable ? 'opacity-50 cursor-not-allowed grayscale' : ''}`}
                    >
                      <td className="py-4 px-4 text-center text-sm text-gray-400 border-r border-gray-100">{iIdx + 1}.</td>
                      <td className="py-4 px-6 border-r border-gray-100">
                        <div className="flex flex-col gap-1">
                          <div className="flex flex-wrap items-baseline gap-2">
                            <span className="text-gray-900 font-medium">{item.nameEn}</span>
                            <span className="text-gray-400 text-xs">/</span>
                            <span className="text-saffron-800 font-sans text-sm">{item.nameKn}</span>
                            {isSelected && (
                              <span className="ml-1 text-[10px] uppercase tracking-wider font-bold px-2 py-0.5 rounded-full bg-vermillion/10 text-vermillion">
                                Selected
                              </span>
                            )}
                            {isFull && (
                              <span className="ml-1 text-[10px] uppercase tracking-wider font-bold px-2 py-0.5 rounded-full bg-purple-100 text-purple-700 border border-purple-200">
                                Sold Out
                              </span>
                            )}
                          </div>
                          {(item.noteEn || item.noteKn) && (
                            <p className="text-[11px] text-gray-500 italic leading-relaxed">
                              {item.noteEn} <br className="md:hidden" />
                              <span className="md:ml-1 text-gray-400 font-sans">{item.noteKn}</span>
                            </p>
                          )}
                        </div>
                      </td>
                      <td className="py-4 px-6 text-right">
                        <span className="font-serif text-lg font-bold text-gray-900">₹{item.price.toLocaleString("en-IN")}</span>
                      </td>
                    </tr>
                  );
                })}
              </React.Fragment>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile Card View */}
      <div className="md:hidden">
        <p className="bg-saffron-50 text-saffron-900 text-xs text-center px-4 py-2.5 border-b border-saffron-100">
          Tap a seva to add it to your booking
        </p>
        {allGroups.map((group, gIdx) => (
          <div key={gIdx}>
            <div className="bg-vermillion text-ivory py-3 px-4 font-serif text-xs font-bold tracking-widest text-center uppercase">
              {group.titleEn} / {group.titleKn}
            </div>
            <div className="divide-y divide-gray-100">
              {group.items.map((item) => {
                const isSelected = selectedIds.includes(item.id);
                const dSeva = dynamicItemsLookup.find(ds => ds.id === item.id);
                const isFull = dSeva?.avail === "full";
                const isUnavailable = dSeva?.avail === "inactive" || dSeva?.avail === "closed" || isFull;

                return (
                  <button
                    type="button"
                    key={item.id}
                    disabled={isUnavailable}
                    aria-pressed={isSelected}
                    onClick={() => onToggle(item.id, item.nameEn, item.price)}
                    className={`w-full text-left flex items-start gap-3 px-4 py-4 transition-colors active:bg-saffron-50 ${isSelected ? "bg-saffron-50/80" : "bg-white"} ${isUnavailable ? "opacity-50 grayscale" : ""}`}
                  >
                    {/* The tick is what tells a devotee these rows can be tapped at all. */}
                    <span
                      aria-hidden
                      className={`mt-0.5 w-6 h-6 shrink-0 rounded-full border-2 flex items-center justify-center transition-colors ${isSelected ? "bg-vermillion border-vermillion text-white" : "border-gray-300 bg-white"}`}
                    >
                      {isSelected && <Check size={14} strokeWidth={3} />}
                    </span>
                    <span className="flex-1 min-w-0">
                      <span className="flex items-start justify-between gap-3">
                        <span className="text-gray-900 font-bold text-[15px] leading-snug">{item.nameEn}</span>
                        <span className="font-bold text-gray-900 text-base shrink-0">₹{item.price.toLocaleString("en-IN")}</span>
                      </span>
                      <span className="block text-saffron-800 font-sans text-sm mt-0.5">{item.nameKn}</span>
                      {item.noteEn && (
                        <span className="block text-xs text-gray-500 italic leading-relaxed mt-1">{item.noteEn}</span>
                      )}
                      {isFull && (
                        <span className="inline-block mt-1.5 text-[10px] uppercase font-bold px-2 py-0.5 rounded-md bg-purple-100 text-purple-700">Sold Out</span>
                      )}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {/* Footer Notes */}
      <div className="p-5 md:p-8 bg-gray-50 border-t border-gray-200 text-xs md:text-[11px] text-gray-600 md:text-gray-500 leading-relaxed space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 md:gap-8">
          <div className="space-y-2">
            <h4 className="font-bold text-gray-700 uppercase tracking-wider">Bank Account Details:</h4>
            <p>
              <span className="font-medium text-gray-600">Account Name:</span> {TEMPLE_BANK.accountName} <br />
              <span className="font-medium text-gray-600">Account No.:</span> {TEMPLE_BANK.accountNumber} <br />
              <span className="font-medium text-gray-600">Bank:</span> {TEMPLE_BANK_LINE} (IFSC: {TEMPLE_BANK.ifsc})
            </p>
          </div>
          <div className="bg-yellow-50 border border-yellow-100 p-4 rounded-xl">
             <p className="text-yellow-800 font-medium mb-1">No charges for &apos;Hannu Kai&apos; (Coconut / Bananas / Flower Offerings)</p>
             <p className="text-yellow-700 opacity-70 italic">However, devotees need to bring the necessary offerings themselves.</p>
          </div>
        </div>
        <p className="text-center italic opacity-60 border-t border-gray-200 pt-4">* The Seva charges mentioned above may be revised from time to time</p>
      </div>
    </div>
  );
}
