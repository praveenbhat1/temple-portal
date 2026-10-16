import Link from "next/link";
import { TEMPLE_CONTACT, WHATSAPP_LINK } from "@/lib/templeContact";

/**
 * Shared shell for the legal pages Razorpay requires on a live site (privacy,
 * terms, refunds). Plain, readable typography: these are read on a phone by a
 * devotee who wants an answer, and by a Razorpay reviewer checking they exist.
 */
export default function PolicyPage({
  eyebrow,
  title,
  updated,
  children,
}: {
  eyebrow: string;
  title: string;
  /** e.g. "16 October 2026" */
  updated: string;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-cream pt-28 md:pt-32 pb-16 md:pb-24 min-h-screen">
      <div className="max-w-3xl mx-auto px-5 md:px-6">
        <div className="text-center mb-10 md:mb-14">
          <span className="text-[11px] md:text-xs uppercase tracking-[0.3em] font-bold text-saffron-600">{eyebrow}</span>
          <h1 className="text-3xl md:text-5xl font-serif text-foreground mt-4 mb-3">{title}</h1>
          <p className="text-sm text-gray-500">Last updated: {updated}</p>
        </div>

        <article className="bg-white border border-saffron-100 rounded-2xl md:rounded-[2rem] p-6 md:p-12 shadow-sm text-[15px] md:text-base leading-relaxed text-gray-700 space-y-5 [&_h2]:font-serif [&_h2]:text-xl [&_h2]:md:text-2xl [&_h2]:text-gray-900 [&_h2]:pt-4 [&_h2]:mb-1 [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:space-y-2 [&_strong]:text-gray-900">
          {children}

          <h2>Contact us</h2>
          <p>
            {TEMPLE_CONTACT.name}
            <br />
            {TEMPLE_CONTACT.address}
            <br />
            Phone:{" "}
            <a href={TEMPLE_CONTACT.phoneHref} className="text-saffron-700 font-medium underline underline-offset-2">
              {TEMPLE_CONTACT.phoneDisplay}
            </a>{" "}
            ({TEMPLE_CONTACT.phoneHours})
            {TEMPLE_CONTACT.email && (
              <>
                <br />
                Email:{" "}
                <a href={`mailto:${TEMPLE_CONTACT.email}`} className="text-saffron-700 font-medium underline underline-offset-2">
                  {TEMPLE_CONTACT.email}
                </a>
              </>
            )}
            {WHATSAPP_LINK && (
              <>
                <br />
                WhatsApp:{" "}
                <a href={WHATSAPP_LINK} target="_blank" rel="noopener noreferrer" className="text-saffron-700 font-medium underline underline-offset-2">
                  message the temple office
                </a>
              </>
            )}
          </p>
        </article>

        <nav aria-label="Other policies" className="flex flex-wrap justify-center gap-x-6 gap-y-2 mt-8 text-sm text-gray-600">
          <Link href="/privacy-policy" className="py-1.5 hover:text-saffron-700">Privacy Policy</Link>
          <Link href="/terms" className="py-1.5 hover:text-saffron-700">Terms &amp; Conditions</Link>
          <Link href="/refund-policy" className="py-1.5 hover:text-saffron-700">Refund &amp; Cancellation</Link>
        </nav>
      </div>
    </div>
  );
}
