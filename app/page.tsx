"use client";
import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { getSevas, getAnnouncements, Seva, Announcement } from "@/lib/firestore";
import SevaCard from "@/components/SevaCard";
import { ArrowRight, MapPin, Clock } from "lucide-react";
import NotificationButton from "@/components/NotificationButton";
import DivineDivider from "@/components/DivineDivider";

export default function Home() {
  const [sevas, setSevas] = useState<Seva[]>([]);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      try {
        const [sevasData, announcementsData] = await Promise.all([
          getSevas(),
          getAnnouncements()
        ]);
        setSevas(sevasData);
        setAnnouncements(announcementsData);
      } catch (error) {
        console.error("Error fetching homepage data:", error);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  const featuredSevas = sevas.filter(s => s.isActive !== false).slice(0, 3);
  const latestAnnouncement = announcements[0];

  return (
    <div className="flex flex-col gap-0 overflow-x-hidden">
      {/* ── HERO SECTION ── */}
      <section className="relative min-h-[600px] md:min-h-screen flex items-center pt-32 pb-16 bg-cream overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_30%,rgba(212,163,115,0.1),transparent_50%)]" />
        
        <div className="max-w-7xl mx-auto px-6 lg:px-12 grid grid-cols-1 lg:grid-cols-12 gap-12 items-center w-full relative z-10">
          <div className="order-1 lg:order-2 lg:col-span-5 flex justify-center">
            <div className="relative w-full max-w-[400px] aspect-[4/5] rounded-t-full rounded-b-[3rem] overflow-hidden shadow-2xl border-[12px] border-foreground bg-foreground">
              <img 
                src="/original-hero.jpg" 
                alt="Lord Vinayaka" 
                className="w-full h-full object-cover"
              />
              <div className="absolute -top-4 -right-4 w-16 h-16 bg-white rounded-full shadow-lg flex items-center justify-center p-2">
                <img src="/ganapathi-logo.jpg" alt="Ganesh" className="w-8 h-8 object-contain" />
              </div>
            </div>
          </div>
          
          <div className="order-2 lg:order-1 lg:col-span-7 text-center lg:text-left">
            <div className="flex items-center justify-center lg:justify-start gap-3 text-saffron-600 mb-6">
              <div className="h-px w-8 bg-saffron-600/30" />
              <span className="text-[10px] uppercase tracking-[0.4em] font-bold">Divine Sanctuary</span>
              <div className="h-px w-8 bg-saffron-600/30 md:hidden" />
            </div>
            <h1 className="text-5xl md:text-7xl lg:text-[80px] font-serif text-foreground leading-[1.1] mb-8">
              <span className="block opacity-90">Sunkadakatte</span>
              <span className="text-vermillion italic block mt-2">Sri Vinayaka</span>
            </h1>
            <p className="text-base text-gray-600 max-w-lg mx-auto lg:mx-0 mb-12 leading-relaxed">
              Step into a realm of spiritual grace and timeless tradition. Seek the blessings of Lord Ganesha in the heart of Sunkadakatte.
            </p>
            <div className="flex flex-col sm:flex-row gap-5 items-center justify-center lg:justify-start">
              <Link href="/sevas" className="w-full sm:w-auto bg-saffron-700 text-white px-10 py-5 rounded-full font-bold shadow-xl shadow-saffron-700/20 flex items-center justify-center gap-3">
                Book Seva <ArrowRight size={18} />
              </Link>
              <Link href="/about" className="text-foreground font-bold hover:text-saffron-700 transition-colors px-6">
                Explore Temple
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ── INFO BAR ── */}
      <section className="py-12 md:py-16 bg-ivory border-y border-saffron-100/50">
        <div className="max-w-7xl mx-auto px-6 grid grid-cols-1 md:grid-cols-3 gap-10 md:gap-12">
          {[
            { icon: <MapPin size={24} />, title: "Mudutonce, Karnataka", sub: "Sacred Abode" },
            { icon: <Clock size={24} />, title: "6:30 AM – 8:30 PM", sub: "Darshan Timings" },
            { icon: <Image src="/ganapathi-logo.jpg" alt="Ganesh" width={24} height={24} />, title: "Daily Aarti", sub: "Sacred Offerings" }
          ].map((item, i) => (
            <div key={i} className="flex items-center gap-5 group justify-center md:justify-start">
              <div className="w-14 h-14 bg-saffron-50 rounded-2xl flex items-center justify-center text-vermillion group-hover:scale-110 transition-transform shadow-sm">
                {item.icon}
              </div>
              <div>
                <h4 className="font-serif text-lg text-gray-900 leading-none">{item.title}</h4>
                <p className="text-[10px] uppercase tracking-widest text-gray-400 mt-2">{item.sub}</p>
              </div>
            </div>
          ))}
        </div>
      </section>
      
      <DivineDivider className="mt-8" />

      {/* ── FEATURED SEVAS ── */}
      <section className="py-20 md:py-28 bg-cream">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-8 mb-16 md:mb-20">
            <div className="text-center md:text-left">
              <span className="text-saffron-600 text-[10px] font-bold uppercase tracking-[0.4em] mb-4 block">Sacred Offerings</span>
              <h2 className="text-4xl md:text-5xl font-serif text-foreground leading-tight">Temple Sevas</h2>
            </div>
            <Link href="/sevas" className="text-saffron-700 font-bold flex items-center justify-center md:justify-start gap-2 hover:gap-4 transition-all group">
              View All Sevas <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" />
            </Link>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8 md:gap-10">
            {loading ? (
              Array(3).fill(0).map((_, i) => (
                <div key={i} className="bg-white/50 animate-pulse rounded-[2rem] aspect-[4/5] border border-saffron-100/50" />
              ))
            ) : (
              featuredSevas.map((seva) => (
                <SevaCard key={seva.id} seva={seva} />
              ))
            )}
          </div>
        </div>
      </section>

      {/* ── ANNOUNCEMENTS ── */}
      {!loading && latestAnnouncement && (
        <section className="py-20 md:py-28 bg-ivory">
          <div className="max-w-7xl mx-auto px-6">
            <div className="bg-white border border-saffron-100 rounded-[3rem] md:rounded-[4rem] p-8 md:p-16 lg:p-20 flex flex-col lg:flex-row gap-12 lg:gap-16 items-center shadow-xl shadow-gray-100/50">
              <div className="flex-1 text-center lg:text-left">
                <span className="bg-saffron-100 text-saffron-700 px-5 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-widest mb-6 md:mb-8 inline-block">
                  Temple Update
                </span>
                <h2 className="text-3xl md:text-4xl lg:text-5xl font-serif text-foreground mb-6 md:mb-8 leading-tight">
                  {latestAnnouncement.title}
                </h2>
                <p className="text-gray-500 mb-8 md:mb-10 line-clamp-3 md:line-clamp-4 leading-relaxed font-sans text-base md:text-lg">
                  {latestAnnouncement.description}
                </p>
                <Link href="/announcements" className="bg-foreground text-ivory px-10 md:px-12 py-3.5 md:py-4 rounded-full text-sm font-bold hover:bg-saffron-700 transition-all shadow-xl shadow-gray-200 inline-block">
                  Read Announcement
                </Link>
              </div>
              <div className="w-full lg:w-1/3 aspect-square relative rounded-[2.5rem] md:rounded-[3rem] overflow-hidden bg-saffron-50/50 flex items-center justify-center border border-saffron-100">
                <Image src="/ganapathi-logo.jpg" alt="Ganesh" width={120} height={120} className="opacity-20" />
              </div>
            </div>
          </div>
        </section>
      )}

      {/* ── CALL TO ACTION ── */}
      <section className="py-28 md:py-36 relative overflow-hidden bg-foreground text-ivory">
        <div className="absolute top-0 left-0 w-full h-full bg-[url('/paper-texture.png')] opacity-10" />
        <div className="max-w-4xl mx-auto px-6 text-center relative z-10">
          <h2 className="text-4xl md:text-6xl lg:text-7xl font-serif mb-8 md:mb-10 leading-tight">
            Connect with the <br /> <span className="text-gold-400 italic">Sacred</span>
          </h2>
          <p className="text-ivory/50 text-base md:text-xl mb-12 md:mb-16 max-w-2xl mx-auto leading-relaxed">
            Join our WhatsApp community to receive daily darshan, special seva updates, and spiritual guidance directly.
          </p>
          <Link 
            href={process.env.NEXT_PUBLIC_WHATSAPP_LINK || "#"}
            className="w-full sm:w-auto bg-gold-600 hover:bg-gold-500 text-foreground px-10 md:px-16 py-5 md:py-6 rounded-full font-extrabold text-base md:text-lg transition-all shadow-2xl shadow-gold-600/30 inline-block"
          >
            Join WhatsApp Community
          </Link>
        </div>
      </section>
    </div>
  );
}
