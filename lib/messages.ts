/**
 * Devotee-facing message templates and the click-to-send WhatsApp link.
 *
 * Pure and env-free on purpose, so the admin dashboard (browser) and the
 * automatic sender in lib/notify.ts (server) compose the *same* text. When the
 * temple has no messaging provider configured, an admin taps the WhatsApp
 * button and sends exactly what the automatic path would have sent — the
 * devotee cannot tell the difference.
 */

export interface MessageBooking {
  bookingId: string;
  userName: string;
  totalAmount: number;
  eventDate: string;
  sevas: { name: string; price: number }[];
  upiRef?: string;
}

/** What happened to the booking, which decides which message to send. */
export type MessageKind = "created" | "confirmed" | "rejected" | "reminder";

const TEMPLE_NAME = "Sri Vinayaka Temple, Kallianpur";

function rupees(n: number) {
  return `Rs.${n.toLocaleString("en-IN")}`;
}

/** "Mon, 12 Jul 2027" — a devotee should not have to parse an ISO date. */
export function prettyDate(iso: string): string {
  if (!iso) return "—";
  const date = new Date(`${iso}T00:00:00`);
  if (Number.isNaN(date.getTime())) return iso;
  // en-GB rather than en-IN: both render the same order, but en-IN inserts a
  // second comma ("Sat, 12 Sept, 2026") which reads as a typo.
  return date.toLocaleDateString("en-GB", {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function sevaLines(booking: MessageBooking) {
  return booking.sevas.map((s) => `• ${s.name} — ${rupees(s.price)}`).join("\n");
}

/**
 * Compose the message body for one booking event.
 *
 * Plain text, no markdown: WhatsApp renders *bold* but SMS does not, and the
 * same string goes down both paths.
 */
export function bookingMessage(booking: MessageBooking, kind: MessageKind): string {
  const header = `${TEMPLE_NAME}`;
  const ref = `Booking Ref: ${booking.bookingId}`;
  const when = `Seva Date: ${prettyDate(booking.eventDate)}`;
  const items = sevaLines(booking);
  const total = `Total: ${rupees(booking.totalAmount)}`;

  switch (kind) {
    case "created":
      return [
        header,
        "",
        `Namaskara ${booking.userName},`,
        "We have recorded your seva booking. It will be confirmed once your payment is verified by the temple office.",
        "",
        ref,
        when,
        "",
        items,
        total,
        "",
        "You can track this booking any time using the reference above.",
      ].join("\n");

    case "confirmed":
      // The empty strings here ARE the blank lines. An earlier version ran
      // .filter(Boolean) over this array to drop the optional payment-reference
      // line, which silently stripped every separator too and delivered one
      // unreadable wall of text.
      return [
        header,
        "",
        `Namaskara ${booking.userName},`,
        "Your payment has been received and your seva is CONFIRMED. 🙏",
        "",
        ref,
        when,
        "",
        items,
        total,
        ...(booking.upiRef ? [`Payment Ref: ${booking.upiRef}`] : []),
        "",
        "Your receipt can be downloaded from the Track Seva page on our website.",
        "May Lord Vinayaka bless you and your family.",
      ].join("\n");

    case "rejected":
      return [
        header,
        "",
        `Namaskara ${booking.userName},`,
        "We could not trace a payment against your seva booking, so it has not been confirmed.",
        "",
        ref,
        when,
        total,
        "",
        "If you have already paid, please reply with the UPI reference number and we will verify it.",
      ].join("\n");

    case "reminder":
      return [
        header,
        "",
        `Namaskara ${booking.userName},`,
        `A gentle reminder about your seva on ${prettyDate(booking.eventDate)}.`,
        "",
        ref,
        items,
        "",
        "Please reach the temple a little early. 🙏",
      ].join("\n");
  }
}

/**
 * A wa.me link that opens WhatsApp with the message pre-typed.
 *
 * This is the zero-cost, zero-setup path: no Meta business account, no
 * template approval, no per-message fee. The cost is that a human presses send,
 * so it lives in the admin dashboard rather than in an automatic hook.
 *
 * wa.me wants a bare international number — digits only, no + and no spaces.
 */
export function whatsappLink(phone: string, text: string): string {
  const digits = phone.replace(/\D/g, "");
  return `https://wa.me/${digits}?text=${encodeURIComponent(text)}`;
}

/** `sms:` link, for devotees who aren't on WhatsApp. */
export function smsLink(phone: string, text: string): string {
  const digits = phone.replace(/[^\d+]/g, "");
  // `?&body=` is the form iOS and Android both accept.
  return `sms:${digits}?&body=${encodeURIComponent(text)}`;
}
