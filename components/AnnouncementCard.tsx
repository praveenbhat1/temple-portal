"use client";
import React from 'react';
import { Announcement } from "@/lib/firestore";
import { Timestamp } from "firebase/firestore";
import { Bell } from "lucide-react";
import Image from "next/image";

interface Props {
  announcement: Announcement;
  isLatest?: boolean;
}

function formatDate(date: Timestamp | string | undefined): string {
  if (!date) return "";
  const d = date instanceof Timestamp ? date.toDate() : new Date(date);
  return d.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

export default function AnnouncementCard({ announcement, isLatest }: Props) {
  return (
    <div 
      className={`group relative bg-white border border-saffron-100 rounded-[2rem] md:rounded-[2.5rem] p-6 md:p-8 transition-all duration-500 shadow-sm hover:shadow-xl ${
        isLatest ? "ring-2 ring-saffron-600/10 md:scale-[1.02]" : ""
      }`}
    >
      {isLatest && (
        <div className="absolute -top-3 left-6 md:left-8 bg-saffron-600 text-ivory px-3 md:px-4 py-1 rounded-full text-[9px] md:text-[10px] font-bold uppercase tracking-[0.2em] shadow-lg">
          Latest Update
        </div>
      )}

      <div className="flex items-center justify-between mb-4 md:mb-6">
        <div className="flex items-center gap-3 text-saffron-600">
          <div className="p-2 bg-saffron-50 rounded-xl group-hover:rotate-12 transition-transform">
            <Bell size={18} />
          </div>
          <span className="text-[11px] md:text-xs font-bold font-sans tracking-wide">
            {formatDate(announcement.date)}
          </span>
        </div>
        <img src="/ganapathi-logo.jpg" alt="Ganesh" className="w-4 h-4 opacity-0 group-hover:opacity-20 transition-opacity object-contain" />
      </div>

      <h3 className={`font-serif text-gray-900 mb-3 md:mb-4 leading-tight group-hover:text-saffron-700 transition-colors ${
        isLatest ? "text-2xl md:text-3xl" : "text-lg md:text-xl"
      }`}>
        {announcement.title}
      </h3>
      
      <p className="text-gray-500 text-xs md:text-sm leading-relaxed font-sans line-clamp-3">
        {announcement.description}
      </p>

      {/* Subtle bottom accent */}
      <div className="mt-6 md:mt-8 pt-4 md:pt-6 border-t border-gray-50 flex items-center justify-between">
        <span className="text-[9px] uppercase tracking-widest text-gray-400">Temple Notice</span>
        <div className="h-1.5 w-1.5 rounded-full bg-gold-400" />
      </div>
    </div>
  );
}
