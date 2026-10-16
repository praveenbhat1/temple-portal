/**
 * The temple calendar: the days most sevas are booked for.
 *
 * Every date here was checked against Drik Panchang computed for Udupi
 * (13°20′N 74°44′E) on 16 Oct 2026 — Sankashti Chaturthi, Vinayaka Chaturthi
 * and the Diwali puja calendar pages for 2026 and 2027. Sankashti is fixed by
 * moonrise, so a Delhi table can be a day off for Udupi; these are Udupi's.
 *
 * Extend this list before the end of 2027 (same source, same location). The
 * temple's own panchanga wins if it ever disagrees — change the date here.
 */

export type CalendarKind = "sankashti" | "vinayaka" | "ganesh-chaturthi" | "deepavali";

export interface CalendarEvent {
  /** YYYY-MM-DD, Udupi. */
  date: string;
  title: string;
  /** The traditional name of this occurrence, e.g. "Vakratunda Sankashti". */
  subtitle?: string;
  kind: CalendarKind;
}

/** Sevas offered on each kind of day — ids from lib/sevaData.ts. */
export const SEVAS_FOR_KIND: Record<CalendarKind, string[]> = {
  // Samuhika Gana Homa is the Sankashti morning homa; vis-2 is the evening pooja.
  sankashti: ["vis-5", "vis-2", "vis-1", "vis-3", "vis-3m", "vis-3k"],
  vinayaka: ["vis-1", "vis-3", "vis-3m", "vis-3k", "reg-7"],
  "ganesh-chaturthi": ["vis-1", "vis-3", "vis-3m", "vis-3k", "vis-8", "reg-7"],
  deepavali: ["reg-6", "reg-7", "reg-9"],
};

export const KIND_LABEL: Record<CalendarKind, string> = {
  sankashti: "Sankashta Chaturthi",
  vinayaka: "Vinayaka Chaturthi",
  "ganesh-chaturthi": "Ganesh Chaturthi",
  deepavali: "Deepavali",
};

const S = (date: string, subtitle: string): CalendarEvent => ({ date, title: "Sankashta Chaturthi", subtitle, kind: "sankashti" });
const V = (date: string, subtitle: string): CalendarEvent => ({ date, title: "Vinayaka Chaturthi", subtitle, kind: "vinayaka" });

export const TEMPLE_CALENDAR: CalendarEvent[] = [
  // ── 2026 ──
  S("2026-01-06", "Lambodara Sankashti · Angaraki"),
  V("2026-01-22", "Ganesha Jayanti"),
  S("2026-02-05", "Dwijapriya Sankashti"),
  V("2026-02-21", "Dhundhiraja Chaturthi"),
  S("2026-03-06", "Bhalachandra Sankashti"),
  V("2026-03-22", "Vasudeva Chaturthi"),
  S("2026-04-05", "Vikata Sankashti"),
  V("2026-04-20", "Sankarshana Chaturthi"),
  S("2026-05-05", "Ekadanta Sankashti · Angaraki"),
  V("2026-05-19", "Varada Chaturthi"),
  S("2026-06-03", "Vibhuvana Sankashti"),
  V("2026-06-18", "Pradyumna Chaturthi"),
  S("2026-07-03", "Krishnapingala Sankashti"),
  V("2026-07-17", "Aniruddha Chaturthi"),
  S("2026-08-02", "Gajanana Sankashti"),
  V("2026-08-16", "Durva Ganapati Chaturthi"),
  S("2026-08-31", "Heramba Sankashti"),
  { date: "2026-09-14", title: "Ganesh Chaturthi", subtitle: "Siddhivinayaka Chaturthi", kind: "ganesh-chaturthi" },
  S("2026-09-29", "Vighnaraja Sankashti · Angaraki"),
  V("2026-10-14", "Kapardisha Chaturthi"),
  S("2026-10-29", "Vakratunda Sankashti"),
  { date: "2026-11-08", title: "Deepavali", subtitle: "Naraka Chaturdashi · Lakshmi Puja", kind: "deepavali" },
  { date: "2026-11-09", title: "Bali Padyami", subtitle: "Deepavali", kind: "deepavali" },
  V("2026-11-13", "Labh Chaturthi"),
  S("2026-11-27", "Ganadhipa Sankashti"),
  V("2026-12-13", "Krichchhra Chaturthi"),
  S("2026-12-26", "Akhuratha Sankashti"),
  // ── 2027 ──
  V("2027-01-11", "Vighneshvara Chaturthi"),
  S("2027-01-25", "Lambodara Sankashti"),
  V("2027-02-10", "Ganesha Jayanti"),
  S("2027-02-24", "Dwijapriya Sankashti"),
  V("2027-03-12", "Dhundhiraja Chaturthi"),
  S("2027-03-25", "Bhalachandra Sankashti"),
  V("2027-04-10", "Vasudeva Chaturthi"),
  S("2027-04-24", "Vikata Sankashti"),
  V("2027-05-09", "Sankarshana Chaturthi"),
  S("2027-05-23", "Ekadanta Sankashti"),
  V("2027-06-08", "Pradyumna Chaturthi"),
  S("2027-06-22", "Krishnapingala Sankashti · Angaraki"),
  V("2027-07-07", "Aniruddha Chaturthi"),
  S("2027-07-22", "Gajanana Sankashti"),
  V("2027-08-05", "Durva Ganapati Chaturthi"),
  S("2027-08-20", "Heramba Sankashti"),
  { date: "2027-09-04", title: "Ganesh Chaturthi", subtitle: "Siddhivinayaka Chaturthi", kind: "ganesh-chaturthi" },
  S("2027-09-19", "Vighnaraja Sankashti"),
  V("2027-10-03", "Kapardisha Chaturthi"),
  S("2027-10-18", "Vakratunda Sankashti"),
  { date: "2027-10-28", title: "Deepavali", subtitle: "Naraka Chaturdashi", kind: "deepavali" },
  { date: "2027-10-29", title: "Deepavali", subtitle: "Lakshmi Puja", kind: "deepavali" },
  { date: "2027-10-30", title: "Bali Padyami", subtitle: "Deepavali", kind: "deepavali" },
  V("2027-11-02", "Labh Chaturthi"),
  S("2027-11-17", "Ganadhipa Sankashti"),
  V("2027-12-02", "Krichchhra Chaturthi"),
  S("2027-12-16", "Akhuratha Sankashti"),
  V("2027-12-31", "Vighneshvara Chaturthi"),
];

/** Today's date in India, as YYYY-MM-DD — the server may run in UTC. */
export function todayInIndia(now = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata" }).format(now);
}

export function upcomingEvents(from = todayInIndia()): CalendarEvent[] {
  return TEMPLE_CALENDAR.filter((e) => e.date >= from);
}

export function eventOn(date: string): CalendarEvent | undefined {
  return TEMPLE_CALENDAR.find((e) => e.date === date);
}

/**
 * The festival decoration the entrance should wear today, if any:
 * Ganeshotsava runs ten days from Ganesh Chaturthi; Deepavali from Naraka
 * Chaturdashi through Bali Padyami.
 */
export function festivalTheme(today = todayInIndia()): "ganesh" | "deepavali" | null {
  const day = (iso: string) => Date.parse(`${iso}T00:00:00Z`) / 86_400_000;
  const t = day(today);
  for (const e of TEMPLE_CALENDAR) {
    const d = day(e.date);
    if (e.kind === "ganesh-chaturthi" && t >= d && t <= d + 10) return "ganesh";
    if (e.kind === "deepavali" && t >= d && t <= d + 1) return "deepavali";
  }
  return null;
}
