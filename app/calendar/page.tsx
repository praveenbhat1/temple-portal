import type { Metadata } from "next";
import Link from "next/link";
import { CalendarDays, ArrowRight, Moon, Sparkles, Flame } from "lucide-react";
import { ALL_SEVAS } from "@/lib/sevaData";
import { KIND_LABEL, SEVAS_FOR_KIND, upcomingEvents, type CalendarEvent, type CalendarKind } from "@/lib/templeCalendar";

export const metadata: Metadata = {
  title: "Seva Calendar | Sunkadakatte Sri Vinayaka Temple",
  description:
    "Upcoming Sankashta Chaturthi, Vinayaka Chaturthi, Ganesh Chaturthi and Deepavali dates at Sunkadakatte Sri Vinayaka Temple, Udupi — book the seva for the day.",
};

// Re-render hourly so dates that have passed drop off without a redeploy.
export const revalidate = 3600;

const KIND_STYLE: Record<CalendarKind, { chip: string; icon: typeof Moon }> = {
  sankashti: { chip: "bg-indigo-50 text-indigo-800 border-indigo-100", icon: Moon },
  vinayaka: { chip: "bg-saffron-50 text-saffron-800 border-saffron-100", icon: Sparkles },
  "ganesh-chaturthi": { chip: "bg-vermillion/10 text-vermillion border-vermillion/20", icon: Sparkles },
  deepavali: { chip: "bg-amber-50 text-amber-800 border-amber-100", icon: Flame },
};

function parts(iso: string) {
  const d = new Date(`${iso}T00:00:00+05:30`);
  const f = (o: Intl.DateTimeFormatOptions) => new Intl.DateTimeFormat("en-IN", { timeZone: "Asia/Kolkata", ...o }).format(d);
  return { day: f({ day: "numeric" }), weekday: f({ weekday: "short" }), month: f({ month: "long", year: "numeric" }) };
}

export default function CalendarPage() {
  const events = upcomingEvents();
  const next = events.find((e) => e.kind === "sankashti");

  // Group by month for the timeline.
  const months = new Map<string, CalendarEvent[]>();
  for (const e of events) {
    const key = parts(e.date).month;
    months.set(key, [...(months.get(key) ?? []), e]);
  }

  return (
    <div className="bg-cream pt-28 md:pt-32 pb-20 md:pb-28 min-h-screen">
      <div className="max-w-4xl mx-auto px-5 md:px-6 text-center mb-10 md:mb-14">
        <div className="flex items-center justify-center gap-3 text-saffron-600 mb-5">
          <div className="h-px w-8 bg-saffron-600/30" />
          <CalendarDays size={18} />
          <span className="text-[11px] md:text-xs uppercase tracking-[0.3em] font-bold">Sacred Days</span>
          <div className="h-px w-8 bg-saffron-600/30" />
        </div>
        <h1 className="text-4xl md:text-6xl font-serif text-foreground mb-4">Seva Calendar</h1>
        <p className="text-sm md:text-base text-gray-600 max-w-lg mx-auto leading-relaxed">
          Chaturthi and festival days at the temple, computed for Udupi. Pick a day and book the seva for it.
        </p>
      </div>

      {next && (
        <div className="max-w-3xl mx-auto px-4 md:px-6 mb-10">
          <div className="bg-foreground text-ivory rounded-[1.75rem] md:rounded-[2.25rem] p-6 md:p-8 flex flex-col md:flex-row md:items-center gap-5 md:gap-8 shadow-xl">
            <div className="text-center md:text-left shrink-0">
              <p className="text-[11px] uppercase tracking-[0.25em] text-gold-400 font-bold">Next Sankashta Chaturthi</p>
              <p className="font-serif text-4xl md:text-5xl text-ivory mt-2">{parts(next.date).day}</p>
              <p className="text-ivory/70 text-sm">{parts(next.date).weekday} · {parts(next.date).month}</p>
            </div>
            <div className="flex-1 text-center md:text-left">
              <p className="font-serif text-xl text-gold-400">{next.subtitle}</p>
              <p className="text-ivory/70 text-sm mt-1 leading-relaxed">
                Samuhika Gana Homa in the morning and Sankashta Pooja in the evening.
              </p>
            </div>
            <Link
              href={`/sevas?date=${next.date}`}
              className="shrink-0 bg-gold-400 hover:bg-gold-200 text-foreground font-bold px-6 py-3.5 rounded-full flex items-center justify-center gap-2 transition-colors"
            >
              Book for this day <ArrowRight size={17} />
            </Link>
          </div>
        </div>
      )}

      <div className="max-w-3xl mx-auto px-4 md:px-6 space-y-10">
        {[...months.entries()].map(([month, list]) => (
          <section key={month}>
            <h2 className="font-serif text-xl md:text-2xl text-gray-900 mb-4 px-1">{month}</h2>
            <ol className="space-y-3">
              {list.map((e) => {
                const p = parts(e.date);
                const style = KIND_STYLE[e.kind];
                const Icon = style.icon;
                const sevas = SEVAS_FOR_KIND[e.kind]
                  .map((id) => ALL_SEVAS.find((s) => s.id === id))
                  .filter((s): s is (typeof ALL_SEVAS)[number] => Boolean(s));
                return (
                  <li key={e.date + e.title} className="bg-white border border-saffron-100 rounded-2xl p-4 md:p-5 flex gap-4">
                    <div className="w-14 shrink-0 text-center">
                      <p className="font-serif text-3xl text-saffron-700 leading-none">{p.day}</p>
                      <p className="text-[11px] uppercase tracking-widest text-gray-500 font-bold mt-1">{p.weekday}</p>
                    </div>
                    <div className="flex-1 min-w-0">
                      <span className={`inline-flex items-center gap-1.5 text-[11px] font-bold px-2.5 py-1 rounded-full border ${style.chip}`}>
                        <Icon size={12} /> {KIND_LABEL[e.kind]}
                      </span>
                      <p className="font-bold text-gray-900 mt-2 leading-snug">{e.subtitle ?? e.title}</p>
                      <div className="flex flex-wrap gap-2 mt-3">
                        {sevas.map((s) => (
                          <Link
                            key={s.id}
                            href={`/sevas?date=${e.date}&book=${s.id}`}
                            className="text-xs text-gray-700 bg-gray-50 hover:bg-saffron-50 hover:text-saffron-800 border border-gray-200 hover:border-saffron-200 rounded-full px-3 py-1.5 transition-colors"
                          >
                            {s.nameEn}
                          </Link>
                        ))}
                      </div>
                      <Link
                        href={`/sevas?date=${e.date}`}
                        className="inline-flex items-center gap-1.5 mt-3 py-1 text-sm font-bold text-saffron-700 hover:text-saffron-800"
                      >
                        Book for this day <ArrowRight size={15} />
                      </Link>
                    </div>
                  </li>
                );
              })}
            </ol>
          </section>
        ))}
        <p className="text-center text-xs text-gray-500 leading-relaxed px-4">
          Dates follow the panchanga for Udupi. If the temple announces a change, the announcement takes precedence.
        </p>
      </div>
    </div>
  );
}
