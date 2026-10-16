/**
 * Sankalpa details — nakshatra, rashi and gotra — that the priest recites for
 * the devotee during larger sevas. Optional, and offered only when a booking
 * contains a seva of SANKALPA_MIN_PRICE or more.
 *
 * Shared by the booking form and /api/bookings/create, so the server accepts
 * exactly the values the dropdowns offer.
 */

/** Sevas at or above this price offer the sankalpa fields. */
export const SANKALPA_MIN_PRICE = 1000;

export const NAKSHATRAS = [
  { en: "Ashwini", kn: "ಅಶ್ವಿನಿ" },
  { en: "Bharani", kn: "ಭರಣಿ" },
  { en: "Krittika", kn: "ಕೃತ್ತಿಕಾ" },
  { en: "Rohini", kn: "ರೋಹಿಣಿ" },
  { en: "Mrigashira", kn: "ಮೃಗಶಿರ" },
  { en: "Ardra", kn: "ಆರ್ದ್ರಾ" },
  { en: "Punarvasu", kn: "ಪುನರ್ವಸು" },
  { en: "Pushya", kn: "ಪುಷ್ಯ" },
  { en: "Ashlesha", kn: "ಆಶ್ಲೇಷ" },
  { en: "Magha", kn: "ಮಘಾ" },
  { en: "Purva Phalguni", kn: "ಪೂರ್ವ ಫಲ್ಗುಣಿ" },
  { en: "Uttara Phalguni", kn: "ಉತ್ತರ ಫಲ್ಗುಣಿ" },
  { en: "Hasta", kn: "ಹಸ್ತ" },
  { en: "Chitra", kn: "ಚಿತ್ರಾ" },
  { en: "Swati", kn: "ಸ್ವಾತಿ" },
  { en: "Vishakha", kn: "ವಿಶಾಖ" },
  { en: "Anuradha", kn: "ಅನುರಾಧ" },
  { en: "Jyeshtha", kn: "ಜ್ಯೇಷ್ಠ" },
  { en: "Mula", kn: "ಮೂಲ" },
  { en: "Purva Ashadha", kn: "ಪೂರ್ವಾಷಾಢ" },
  { en: "Uttara Ashadha", kn: "ಉತ್ತರಾಷಾಢ" },
  { en: "Shravana", kn: "ಶ್ರವಣ" },
  { en: "Dhanishta", kn: "ಧನಿಷ್ಠ" },
  { en: "Shatabhisha", kn: "ಶತಭಿಷ" },
  { en: "Purva Bhadrapada", kn: "ಪೂರ್ವಾಭಾದ್ರ" },
  { en: "Uttara Bhadrapada", kn: "ಉತ್ತರಾಭಾದ್ರ" },
  { en: "Revati", kn: "ರೇವತಿ" },
] as const;

export const RASHIS = [
  { en: "Mesha", kn: "ಮೇಷ" },
  { en: "Vrishabha", kn: "ವೃಷಭ" },
  { en: "Mithuna", kn: "ಮಿಥುನ" },
  { en: "Karka", kn: "ಕರ್ಕಾಟಕ" },
  { en: "Simha", kn: "ಸಿಂಹ" },
  { en: "Kanya", kn: "ಕನ್ಯಾ" },
  { en: "Tula", kn: "ತುಲಾ" },
  { en: "Vrischika", kn: "ವೃಶ್ಚಿಕ" },
  { en: "Dhanu", kn: "ಧನು" },
  { en: "Makara", kn: "ಮಕರ" },
  { en: "Kumbha", kn: "ಕುಂಭ" },
  { en: "Meena", kn: "ಮೀನ" },
] as const;

export function offersSankalpa(sevas: { price: number }[]): boolean {
  return sevas.some((s) => s.price >= SANKALPA_MIN_PRICE);
}

/**
 * Clean what the browser sent: dropdown values must be on the list, gotra is
 * free text but letters only (any script), spaces and dots, 40 characters.
 * Anything else is dropped rather than rejected — these fields are optional.
 */
export function cleanSankalpa(input: { nakshatra?: unknown; rashi?: unknown; gotra?: unknown }) {
  const pick = (v: unknown, list: readonly { en: string }[]) =>
    typeof v === "string" && list.some((x) => x.en === v) ? v : "";
  const gotraRaw = typeof input.gotra === "string" ? input.gotra.trim().slice(0, 40) : "";
  const gotra = /^[\p{L}\p{M} .'-]*$/u.test(gotraRaw) ? gotraRaw : "";
  return { nakshatra: pick(input.nakshatra, NAKSHATRAS), rashi: pick(input.rashi, RASHIS), gotra };
}

/** "Rohini · Vrishabha · Kashyapa" for admin lists and receipts; "" if none. */
export function sankalpaLine(b: { nakshatra?: string; rashi?: string; gotra?: string }): string {
  return [b.nakshatra && `Nakshatra: ${b.nakshatra}`, b.rashi && `Rashi: ${b.rashi}`, b.gotra && `Gotra: ${b.gotra}`]
    .filter(Boolean)
    .join("  ·  ");
}
