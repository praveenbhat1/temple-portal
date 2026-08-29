/**
 * Automatic WhatsApp / SMS delivery — server-side only.
 *
 * The temple's default is the free path: an admin taps the WhatsApp button in
 * /admin/bookings and sends the message by hand (see whatsappLink in
 * lib/messages.ts). Nothing here is required for the site to work.
 *
 * When the temple is ready to pay for automatic delivery, setting the env vars
 * below turns it on with no code change. Two providers are supported and tried
 * in order:
 *
 *   1. WhatsApp Cloud API (Meta) — WHATSAPP_TOKEN + WHATSAPP_PHONE_NUMBER_ID.
 *      Free tier covers a small temple. Business-initiated messages must use an
 *      approved template, so WHATSAPP_TEMPLATE_NAME is required too; the
 *      message body is passed as the template's single body parameter.
 *
 *   2. SMS via MSG91 or Fast2SMS — whichever key is present. Slower to set up
 *      (DLT registration in India) but works for devotees without WhatsApp.
 *
 * Delivery is best-effort by design: a failed message must never fail the
 * booking action that triggered it. Every path returns a result instead of
 * throwing, and the caller logs it.
 */
import { bookingMessage, prettyDate, type MessageBooking, type MessageKind } from "./messages";

export interface NotifyResult {
  sent: boolean;
  /** Which path handled it, or why nothing did. */
  channel: "whatsapp" | "sms" | "none";
  detail?: string;
}

const NOT_CONFIGURED: NotifyResult = {
  sent: false,
  channel: "none",
  detail: "No messaging provider is configured — send by hand from the dashboard.",
};

/** True when any automatic channel is usable. */
export function isMessagingConfigured(): boolean {
  return whatsappConfigured() || smsConfigured();
}

function whatsappConfigured(): boolean {
  return Boolean(
    process.env.WHATSAPP_TOKEN?.trim() &&
      process.env.WHATSAPP_PHONE_NUMBER_ID?.trim() &&
      process.env.WHATSAPP_TEMPLATE_NAME?.trim()
  );
}

function smsConfigured(): boolean {
  return Boolean(process.env.MSG91_AUTH_KEY?.trim() || process.env.FAST2SMS_API_KEY?.trim());
}

/** Which channels are live, for the admin System Health panel. */
export function messagingStatus(): { whatsapp: boolean; sms: boolean } {
  return { whatsapp: whatsappConfigured(), sms: smsConfigured() };
}

/**
 * Tell a devotee what happened to their booking.
 *
 * Tries WhatsApp first (richer, and free at this volume), falls back to SMS.
 * Never throws.
 */
export async function notifyDevotee(
  phone: string,
  booking: MessageBooking,
  kind: MessageKind
): Promise<NotifyResult> {
  const text = bookingMessage(booking, kind);

  if (whatsappConfigured()) {
    const result = await sendWhatsApp(phone, templateParams(booking, kind));
    if (result.sent) return result;
    // Fall through to SMS rather than giving up — the reason WhatsApp failed
    // is often "this devotee has no WhatsApp on that number".
    if (smsConfigured()) return sendSms(phone, text);
    return result;
  }

  if (smsConfigured()) return sendSms(phone, text);

  return NOT_CONFIGURED;
}

/**
 * The five values the approved template expects, in order.
 *
 * Discrete fields, NOT one blob. Two hard rules from Meta make that mandatory:
 * a template body cannot consist only of a variable (so a `{{1}}`-only
 * template is rejected at review), and a parameter may not contain newlines,
 * tabs, or runs of spaces (so the composed message would be rejected at send
 * with error 132000). Each value below is a single clean line.
 *
 * The matching template body is documented in .env.example — it must be
 * created and approved in WhatsApp Manager before any of this can send.
 */
function templateParams(booking: MessageBooking, kind: MessageKind): string[] {
  const status: Record<MessageKind, string> = {
    created: "Recorded - awaiting payment verification",
    confirmed: "CONFIRMED - payment received",
    rejected: "Not confirmed - payment not traced",
    reminder: "Confirmed - upcoming seva",
  };

  const sevaNames = booking.sevas.map((s) => s.name).join(", ");

  return [
    booking.userName,
    status[kind],
    booking.bookingId,
    prettyDate(booking.eventDate),
    `${booking.totalAmount.toLocaleString("en-IN")} for ${sevaNames}`,
  ].map(sanitiseParam);
}

/**
 * Make a value safe to send as a template parameter.
 * Meta rejects newlines, tabs and 5+ consecutive spaces outright.
 */
function sanitiseParam(value: string): string {
  return value.replace(/[\r\n\t]+/g, " ").replace(/\s{2,}/g, " ").trim().slice(0, 900);
}

/** WhatsApp Cloud API. Numbers go without the leading +. */
async function sendWhatsApp(phone: string, params: string[]): Promise<NotifyResult> {
  const token = process.env.WHATSAPP_TOKEN!.trim();
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID!.trim();
  const template = process.env.WHATSAPP_TEMPLATE_NAME!.trim();
  const language = process.env.WHATSAPP_TEMPLATE_LANG?.trim() || "en";

  try {
    const res = await fetch(`https://graph.facebook.com/v21.0/${phoneNumberId}/messages`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        to: phone.replace(/\D/g, ""),
        type: "template",
        template: {
          name: template,
          language: { code: language },
          components: [
            {
              type: "body",
              parameters: params.map((text) => ({ type: "text", text })),
            },
          ],
        },
      }),
      signal: AbortSignal.timeout(10_000),
    });

    if (!res.ok) {
      const body = await res.text().catch(() => "");
      return { sent: false, channel: "whatsapp", detail: `HTTP ${res.status} ${body.slice(0, 300)}` };
    }

    return { sent: true, channel: "whatsapp" };
  } catch (err) {
    return { sent: false, channel: "whatsapp", detail: (err as Error).message };
  }
}

/** MSG91 if it is configured, otherwise Fast2SMS. */
async function sendSms(phone: string, text: string): Promise<NotifyResult> {
  const digits = phone.replace(/\D/g, "");

  if (process.env.MSG91_AUTH_KEY?.trim()) {
    try {
      const res = await fetch("https://control.msg91.com/api/v5/flow/", {
        method: "POST",
        headers: {
          authkey: process.env.MSG91_AUTH_KEY.trim(),
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          template_id: process.env.MSG91_TEMPLATE_ID,
          sender: process.env.MSG91_SENDER_ID,
          recipients: [{ mobiles: digits, MESSAGE: text }],
        }),
        signal: AbortSignal.timeout(10_000),
      });
      if (!res.ok) {
        const body = await res.text().catch(() => "");
        return { sent: false, channel: "sms", detail: `MSG91 HTTP ${res.status} ${body.slice(0, 300)}` };
      }
      return { sent: true, channel: "sms" };
    } catch (err) {
      return { sent: false, channel: "sms", detail: (err as Error).message };
    }
  }

  try {
    const res = await fetch("https://www.fast2sms.com/dev/bulkV2", {
      method: "POST",
      headers: {
        authorization: process.env.FAST2SMS_API_KEY!.trim(),
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        route: "q",
        message: text,
        language: "english",
        numbers: digits.replace(/^91/, ""),
      }),
      signal: AbortSignal.timeout(10_000),
    });
    if (!res.ok) {
      const body = await res.text().catch(() => "");
      return { sent: false, channel: "sms", detail: `Fast2SMS HTTP ${res.status} ${body.slice(0, 300)}` };
    }
    return { sent: true, channel: "sms" };
  } catch (err) {
    return { sent: false, channel: "sms", detail: (err as Error).message };
  }
}
