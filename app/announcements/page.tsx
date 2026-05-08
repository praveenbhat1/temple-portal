"use client";
import { useEffect, useState } from "react";
import { getAnnouncements, Announcement } from "@/lib/firestore";
import AnnouncementCard from "@/components/AnnouncementCard";
import Image from "next/image";
import { Bell } from "lucide-react";

export default function AnnouncementsPage() {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      try {
        const data = await getAnnouncements();
        setAnnouncements(data);
      } catch (error) {
        console.error("Error fetching announcements:", error);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);


  return (
    <div className="bg-cream pt-28 md:pt-32 pb-16 md:pb-24 min-h-screen">
      {/* Header */}
      <div className="max-w-4xl mx-auto px-6 text-center mb-16 md:mb-20 animate-fade-in">
        <div className="flex items-center justify-center gap-3 text-saffron-600 mb-6">
          <div className="h-px w-8 bg-saffron-600/30" />
          <Bell size={18} />
          <span className="text-[10px] md:text-xs uppercase tracking-[0.3em] font-sans font-bold">Temple Voice</span>
          <div className="h-px w-8 bg-saffron-600/30" />
        </div>
        <h1 className="text-4xl md:text-5xl lg:text-7xl font-serif text-foreground mb-6 md:mb-8 text-center">Notices & News</h1>
        <p className="text-sm md:text-base text-gray-500 font-sans max-w-lg mx-auto px-4 leading-relaxed">
          Stay updated with the latest events, special puja timings, and temple announcements.
        </p>
      </div>

      <div className="max-w-4xl mx-auto px-4 md:px-6">
        {loading ? (
          <div className="grid grid-cols-1 gap-6 md:gap-8">
            {Array(3).fill(0).map((_, i) => (
              <div key={i} className="bg-white/50 animate-pulse rounded-[2rem] h-48 border border-saffron-100/50" />
            ))}
          </div>
        ) : announcements.length === 0 ? (
          <div className="text-center py-20 bg-white border border-saffron-100 rounded-[2.5rem] md:rounded-[3rem]">
            <Image src="/ganapathi-logo.jpg" alt="Ganesh" width={48} height={48} className="mx-auto mb-4 opacity-20" />
            <p className="font-serif text-lg md:text-xl text-gray-400">All is peaceful. No new notices.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-6 md:gap-8">
            {announcements.map((a, i) => (
              <AnnouncementCard 
                key={a.id} 
                announcement={a} 
                isLatest={i === 0} 
              />
            ))}
          </div>
        )}
      </div>

      {/* Subtle bottom accent */}
      <div className="mt-20 md:mt-24 text-center opacity-5">
        <Image src="/ganapathi-logo.jpg" alt="Ganesh" width={60} height={60} className="mx-auto" />
      </div>
    </div>
  );
}
