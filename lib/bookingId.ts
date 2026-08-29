/**
 * Booking reference generation — server-side only (uses node:crypto).
 *
 * The reference is what a devotee reads out over the phone and what the temple
 * matches against its bank statement, so the shape matters.
 */
import crypto from "crypto";

/** Unambiguous alphabet — no O/0 or I/1, since devotees read these aloud. */
const ID_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

/**
 * Generate the human-facing booking reference (e.g. SV-7KQM4P).
 * Done server-side rather than in the browser so the id is unguessable and the
 * client has no say in it.
 */
export function generateBookingId(): string {
  const bytes = crypto.randomBytes(6);
  let out = "";
  for (const byte of bytes) out += ID_ALPHABET[byte % ID_ALPHABET.length];
  return `SV-${out}`;
}
