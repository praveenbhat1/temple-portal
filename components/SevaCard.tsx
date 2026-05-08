"use client";
import React from 'react';
import { Seva, SevaAvailability, getSevaAvailability } from "@/lib/firestore";
import { Calendar, Clock, Lock, CheckCircle2 } from "lucide-react";
import Image from "next/image";

interface Props {
  seva: Seva;
  selected?: boolean;
  onToggle?: (seva: Seva) => void;
}

function fmtDate(iso?: string): string {
  if (!iso) return "";
  return new Date(iso).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function AvailabilityBadge({ availability, seva }: { availability: SevaAvailability; seva: Seva }) {
  if (availability === "basic") return null;

  const configs: Record<
    Exclude<SevaAvailability, "basic">,
    { label: string; cls: string; icon: React.ReactNode; sub?: string }
  > = {
    open: {
      label: "Limited Time",
      cls: "bg-saffron-50 text-saffron-700 border-saffron-100",
      icon: <Clock size={12} />,
      sub: seva.availableTo ? `Closing on ${fmtDate(seva.availableTo)}` : undefined,
    },
    upcoming: {
      label: "Coming Soon",
      cls: "bg-gold-50 text-gold-700 border-gold-100",
      icon: <Calendar size={12} />,
      sub: seva.availableFrom ? `Opens ${fmtDate(seva.availableFrom)}` : undefined,
    },
    closed: {
      label: "Booking Closed",
      cls: "bg-gray-50 text-gray-500 border-gray-100",
      icon: <Lock size={12} />,
      sub: "Window ended",
    },
    inactive: {
      label: "Unavailable",
      cls: "bg-gray-50 text-gray-400 border-gray-100",
      icon: <Lock size={12} />,
      sub: undefined,
    },
    full: {
      label: "Fully Booked",
      cls: "bg-gray-100 text-gray-500 border-gray-200",
      icon: <CheckCircle2 size={12} />,
      sub: "Capacity reached",
    },
  };

  const c = configs[availability];
  return (
    <div className="mt-2">
      <span className={`inline-flex items-center gap-1.5 text-[10px] uppercase tracking-wider font-bold px-3 py-1 rounded-full border ${c.cls}`}>
        {c.icon}
        {c.label}
      </span>
      {c.sub && <p className="text-[11px] text-gray-400 mt-1.5 font-sans italic">{c.sub}</p>}
    </div>
  );
}

export default function SevaCard({ seva, selected, onToggle }: Props) {
  const availability = getSevaAvailability(seva);
  const canBook = availability === "open" || availability === "basic";
  const isSpecial = seva.type === "special";

  return (
    <div 
      onClick={() => canBook && onToggle?.(seva)}
      className={`group relative bg-white border rounded-[2rem] p-6 md:p-8 transition-all duration-500 flex flex-col gap-4 shadow-sm cursor-pointer ${
        selected 
          ? "ring-4 ring-vermillion/20 border-vermillion scale-[1.02]" 
          : "hover:shadow-xl hover:-translate-y-2"
      } ${
        isSpecial 
          ? "border-gold-200/50 bg-gradient-to-br from-white to-gold-50/30" 
          : "border-saffron-100"
      }`}
    >
      {/* Selection Indicator */}
      {selected && (
        <div className="absolute top-4 right-4 bg-vermillion text-white w-6 h-6 rounded-full flex items-center justify-center shadow-lg z-20 animate-in zoom-in duration-300">
          <CheckCircle2 size={16} />
        </div>
      )}
      {/* Handcrafted glow effect for special sevas */}
      {isSpecial && (
        <div className="absolute inset-0 bg-gold-400/5 blur-2xl rounded-[2rem] -z-10 group-hover:bg-gold-400/10 transition-all" />
      )}

      {/* Type indicator */}
      <div className="flex items-center justify-between">
        <span className={`text-[10px] uppercase tracking-[0.2em] font-bold ${isSpecial ? 'text-gold-700' : 'text-saffron-700'}`}>
          {isSpecial ? "Divine Special" : "Sacred Offering"}
        </span>
        {isSpecial && <img src="/ganapathi-logo-bw.png" alt="Ganesh" className="w-5 h-5 opacity-40 object-contain" />}
      </div>

      <div className="flex-1">
        <h3 className="text-xl md:text-2xl font-serif text-gray-900 mb-3 group-hover:text-saffron-700 transition-colors">
          {seva.name}
        </h3>
        <p className="text-xs md:text-sm text-gray-500 leading-relaxed font-sans mb-4">
          {seva.description}
        </p>

        {isSpecial && seva.eventDate && (
          <div className="flex items-center gap-2 text-xs text-saffron-800 font-medium mb-2">
            <Calendar size={14} />
            <span>Event: {fmtDate(seva.eventDate)}</span>
          </div>
        )}

        <AvailabilityBadge availability={availability} seva={seva} />
      </div>

      <div className="pt-6 border-t border-gray-50 flex items-center justify-between mt-auto">
        <div className="flex flex-col">
          <span className="text-[9px] text-gray-400 uppercase tracking-widest mb-1">Dakshina</span>
          <span className="text-xl md:text-2xl font-bold text-gray-900 font-serif">
            ₹{seva.price.toLocaleString("en-IN")}
          </span>
        </div>

        <div
          className={`px-5 md:px-6 py-2 md:py-2.5 rounded-full text-xs font-bold transition-all duration-300 ${
            !canBook
              ? "bg-gray-100 text-gray-400 cursor-not-allowed"
              : selected
              ? "bg-vermillion text-white"
              : "bg-foreground text-ivory group-hover:bg-saffron-700 shadow-lg shadow-gray-200"
          }`}
        >
          {!canBook ? "Locked" : selected ? "Selected" : "Select"}
        </div>
      </div>
    </div>
  );
}
