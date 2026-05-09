"use client";
import React from 'react';
import Image from 'next/image';
import { SEVA_DATA, SevaGroup, ALL_SEVAS } from "@/lib/sevaData";
import { Seva, getSevaAvailability } from "@/lib/firestore";

interface Props {
  selectedIds: string[];
  onToggle: (id: string, name: string, price: number) => void;
  extraSevas: Seva[];
}

export default function SevaBoard({ selectedIds, onToggle, extraSevas }: Props) {
  // Filter out extraSevas that are already in the static SEVA_DATA to avoid repeats
  const uniqueExtraSevas = extraSevas.filter(es => 
    !ALL_SEVAS.some(as => as.id === es.id || as.nameEn === es.name)
  );

  const dynamicGroup: SevaGroup = {
    titleEn: "SPECIAL OFFERINGS",
    titleKn: "ವಿಶೇಷ ಕೊಡುಗೆಗಳು",
    items: uniqueExtraSevas.map(s => ({
      id: s.id!,
      nameEn: s.name,
      nameKn: s.name, 
      price: s.price,
      noteEn: s.description,
    }))
  };

  // Follow the image order: Dynamic (new) first, then SEVA_DATA (which now has Regular first)
  const allGroups = uniqueExtraSevas.length > 0 ? [dynamicGroup, ...SEVA_DATA] : SEVA_DATA;

  // Create a combined list for lookup (for availability checks)
  const dynamicItemsLookup = extraSevas.map(s => ({
    ...s,
    avail: getSevaAvailability(s)
  }));

  return (
    <div className="max-w-5xl mx-auto bg-white shadow-2xl border border-gray-200 rounded-sm overflow-hidden animate-fade-in">
      {/* Board Header */}
      <div className="bg-gradient-to-r from-vermillion to-saffron-700 p-6 md:p-8 text-center text-ivory border-b-4 border-gold-600">
        <div className="flex items-center justify-center gap-4 mb-2">
          <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center p-1 relative overflow-hidden shadow-sm">
             <img src="/ganapathi-logo.jpg" alt="Logo" className="w-full h-full object-contain p-1" />
          </div>
          <div className="text-left">
            <h1 className="text-xl md:text-2xl font-serif font-bold tracking-wide">Sunkadakatte Shri Vinayaka Temple</h1>
            <p className="text-[10px] md:text-xs uppercase tracking-[0.2em] opacity-80">Kallianpur, Karnataka</p>
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
        {allGroups.map((group, gIdx) => (
          <div key={gIdx}>
            <div className="bg-vermillion text-ivory py-3 px-4 font-serif text-xs font-bold tracking-widest text-center uppercase">
              {group.titleEn} / {group.titleKn}
            </div>
            <div className="divide-y divide-gray-50">
              {group.items.map((item) => {
                const isSelected = selectedIds.includes(item.id);
                const dSeva = dynamicItemsLookup.find(ds => ds.id === item.id);
                const isFull = dSeva?.avail === "full";
                const isUnavailable = dSeva?.avail === "inactive" || dSeva?.avail === "closed" || isFull;

                return (
                  <div 
                    key={item.id}
                    onClick={() => !isUnavailable && onToggle(item.id, item.nameEn, item.price)}
                    className={`p-4 active:bg-saffron-50 transition-colors ${isSelected ? 'bg-saffron-50/70 border-l-4 border-l-vermillion' : ''} ${isUnavailable ? 'opacity-50 grayscale' : ''}`}
                  >
                    <div className="flex justify-between items-start gap-3 mb-2">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h4 className="text-gray-900 font-bold text-sm">{item.nameEn}</h4>
                          {isFull && (
                            <span className="text-[8px] uppercase font-bold px-1.5 py-0.5 rounded-md bg-purple-100 text-purple-700">Sold Out</span>
                          )}
                        </div>
                        <p className="text-saffron-800 font-sans text-xs">{item.nameKn}</p>
                      </div>
                      <span className="font-bold text-gray-900 text-base">₹{item.price.toLocaleString("en-IN")}</span>
                    </div>
                    {item.noteEn && (
                      <p className="text-[10px] text-gray-500 italic leading-relaxed mb-1">
                        {item.noteEn}
                      </p>
                    )}
                    {isSelected && (
                      <div className="flex items-center gap-1.5 mt-2">
                        <div className="w-1.5 h-1.5 rounded-full bg-vermillion" />
                        <span className="text-[9px] uppercase tracking-widest font-bold text-vermillion">Selected for Offering</span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {/* Footer Notes */}
      <div className="p-6 md:p-8 bg-gray-50 border-t border-gray-200 text-[11px] text-gray-500 leading-relaxed space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="space-y-2">
            <h4 className="font-bold text-gray-700 uppercase tracking-wider">Bank Account Details:</h4>
            <p>
              <span className="font-medium text-gray-600">Account Name:</span> Sunkadakatte Sri Vinayaka Temple <br />
              <span className="font-medium text-gray-600">Account No.:</span> 01442200022013 <br />
              <span className="font-medium text-gray-600">Bank:</span> Canara Bank, Kallianpur II (IFSC: CNRB0010144)
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
