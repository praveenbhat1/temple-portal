/**
 * The temple's public contact details — one place, so the footer, the contact
 * page and the policy pages Razorpay reviews can never disagree.
 *
 * There is deliberately no email here. The address the site used to show,
 * info@srivinayakatemple.org, is on a domain nobody has registered, so mail
 * to it went nowhere. Add a real inbox here once the temple has one.
 */
export const TEMPLE_CONTACT = {
  name: "Sunkadakatte Sri Vinayaka Temple",
  address: "Kallianpur Main Road, near Santhekatte, Udupi, Karnataka - 576115",
  phoneDisplay: "+91 6361 929 580",
  phoneHref: "tel:+916361929580",
  /** Office hours for phone queries, as printed on the contact page. */
  phoneHours: "Mon - Sun (9 AM - 6 PM)",
  email: "",
} as const;

/** The temple's WhatsApp community/chat link, when configured. */
export const WHATSAPP_LINK = process.env.NEXT_PUBLIC_WHATSAPP_LINK?.trim() || "";
