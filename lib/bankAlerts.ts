/**
 * Reading the temple's bank credit alerts — server-side only.
 *
 * Plain UPI never tells this server that money arrived. The bank, however,
 * tells the *temple* — by email, on every credit. Those alerts are the only
 * signal available without a payment gateway, so this reads them over IMAP and
 * turns each into a structured credit the reconciler can match.
 *
 * Two things make that safe enough to act on automatically:
 *
 *   1. The alert comes from the bank to the temple's own mailbox. A devotee
 *      cannot cause one to exist.
 *   2. It carries the UPI reference (RRN/UTR), which is the same number the
 *      devotee's app showed them. Matching those two is what confirms a
 *      payment — not the devotee's word, and not a guess about timing.
 *
 * Parsing bank mail is inherently brittle: wording differs per bank and
 * changes without notice. Everything here fails closed — an alert that cannot
 * be parsed confidently is skipped and reported, never guessed at.
 */
import { ImapFlow } from "imapflow";
import { simpleParser } from "mailparser";

export interface BankCredit {
  /** Rupees credited. */
  amount: number;
  /** UPI reference / RRN / UTR as printed in the alert. */
  utr: string;
  /** When the bank sent the alert. */
  at: Date;
  /** First line of the alert, for the admin to eyeball. */
  excerpt: string;
}

export interface AlertScan {
  configured: boolean;
  scanned: number;
  credits: BankCredit[];
  /** Alerts that looked like credits but could not be parsed. */
  unparsed: string[];
  error?: string;
}

export function isBankAlertsConfigured(): boolean {
  return Boolean(
    process.env.BANK_ALERT_IMAP_HOST?.trim() &&
      process.env.BANK_ALERT_IMAP_USER?.trim() &&
      process.env.BANK_ALERT_IMAP_PASSWORD?.trim()
  );
}

/**
 * A UPI reference is 12 digits at almost every Indian bank. Longer
 * alphanumeric forms exist, so the pattern allows them, but a bare 12-digit
 * run is what these alerts normally carry.
 */
const UTR_PATTERNS: RegExp[] = [
  /UPI[\s/-]*(?:Ref(?:erence)?|RRN)[\s.:No#-]*([A-Za-z0-9]{8,22})/i,
  /(?:RRN|UTR)[\s.:No#-]*([A-Za-z0-9]{8,22})/i,
  /(?:transaction|txn)[\s]*(?:id|ref(?:erence)?)[\s.:No#-]*([A-Za-z0-9]{8,22})/i,
  /\bRef(?:erence)?\s*(?:no\.?|number)?[\s.:#-]*([A-Za-z0-9]{8,22})/i,
  // Last resort: a lone 12-digit number, which is the standard RRN shape.
  /\b(\d{12})\b/,
];

const AMOUNT_PATTERNS: RegExp[] = [
  // "Rs.301.00 credited to your A/c"  — amount before the verb
  /(?:INR|Rs\.?|₹)\s*([\d,]+(?:\.\d{1,2})?)\s*(?:has been\s+)?(?:credited|deposited|received)/i,
  // "credited by Rs.1" / "credited with INR 500" — amount after it. SBI uses
  // "by", ICICI uses "with", so both connectors have to be allowed.
  /credited\s+(?:with|by)?\s*(?:INR|Rs\.?|₹)\s*([\d,]+(?:\.\d{1,2})?)/i,
  /(?:deposited|received)\s+(?:with|by)?\s*(?:INR|Rs\.?|₹)\s*([\d,]+(?:\.\d{1,2})?)/i,
];

/** Only messages that clearly describe an incoming credit are considered. */
function looksLikeCredit(text: string): boolean {
  const t = text.toLowerCase();
  if (/debited|withdrawn|debit alert|spent/.test(t)) return false;
  return /credited|credit alert|received|deposited/.test(t);
}

function firstMatch(text: string, patterns: RegExp[]): string | null {
  for (const re of patterns) {
    const m = text.match(re);
    if (m?.[1]) return m[1];
  }
  return null;
}

/** Turn one alert body into a structured credit, or null if it can't be read. */
export function parseBankAlert(text: string, at: Date): BankCredit | null {
  const flat = text.replace(/\s+/g, " ").trim();
  if (!looksLikeCredit(flat)) return null;

  const rawAmount = firstMatch(flat, AMOUNT_PATTERNS);
  const utr = firstMatch(flat, UTR_PATTERNS);
  if (!rawAmount || !utr) return null;

  const amount = Number(rawAmount.replace(/,/g, ""));
  if (!Number.isFinite(amount) || amount <= 0) return null;

  return { amount, utr: utr.trim(), at, excerpt: flat.slice(0, 220) };
}

/**
 * Fetch recent credit alerts from the configured mailbox.
 *
 * Reads only the last `sinceHours` so a long-running mailbox is never walked
 * end to end, and marks nothing as read — the temple's own view of the inbox
 * is left exactly as it was.
 */
export async function fetchBankCredits(sinceHours = 48): Promise<AlertScan> {
  if (!isBankAlertsConfigured()) {
    return { configured: false, scanned: 0, credits: [], unparsed: [] };
  }

  const client = new ImapFlow({
    host: process.env.BANK_ALERT_IMAP_HOST!.trim(),
    port: Number(process.env.BANK_ALERT_IMAP_PORT || 993),
    secure: true,
    auth: {
      user: process.env.BANK_ALERT_IMAP_USER!.trim(),
      pass: process.env.BANK_ALERT_IMAP_PASSWORD!.trim(),
    },
    logger: false,
  });

  const credits: BankCredit[] = [];
  const unparsed: string[] = [];
  let scanned = 0;

  try {
    await client.connect();
    const mailbox = process.env.BANK_ALERT_MAILBOX?.trim() || "INBOX";
    const lock = await client.getMailboxLock(mailbox);

    try {
      const since = new Date(Date.now() - sinceHours * 3600_000);
      for await (const msg of client.fetch({ since }, { source: true, envelope: true })) {
        scanned++;
        try {
          const parsed = await simpleParser(msg.source as Buffer);
          const body = `${parsed.subject || ""}\n${parsed.text || parsed.html || ""}`;
          const at = parsed.date || msg.envelope?.date || new Date();
          const credit = parseBankAlert(body, at);
          if (credit) credits.push(credit);
          else if (looksLikeCredit(body)) unparsed.push(body.replace(/\s+/g, " ").slice(0, 200));
        } catch {
          /* one unreadable message must not abort the scan */
        }
      }
    } finally {
      lock.release();
    }
  } catch (err) {
    return {
      configured: true,
      scanned,
      credits,
      unparsed,
      error: (err as Error).message,
    };
  } finally {
    try {
      await client.logout();
    } catch {
      /* already closed */
    }
  }

  return { configured: true, scanned, credits, unparsed };
}
