import React from "react";
import Script from "next/script";
import type { Metadata } from "next";
import { Inter, Playfair_Display } from "next/font/google";
import "./globals.css";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import ScrollReveal from "@/components/ScrollReveal";
import { SITE_URL } from "@/lib/siteUrl";
import { TEMPLE_CONTACT } from "@/lib/templeContact";

const inter = Inter({ 
  variable: "--font-inter", 
  subsets: ["latin"],
  display: 'swap',
});

const playfair = Playfair_Display({ 
  variable: "--font-playfair", 
  subsets: ["latin"],
  display: 'swap',
});

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  // The manifest is what lets the site be added to a phone's Home Screen —
  // and on iPhone, web push only works for a site installed that way.
  manifest: "/manifest.json",
  appleWebApp: { capable: true, title: "Vinayaka Temple", statusBarStyle: "default" },
  title: "Sunkadakatte Sri Vinayaka Temple | Spiritual Grace & Tradition",
  description:
    "Official website of Sunkadakatte Sri Vinayaka Temple, Kallianpur Main Road, near Santhekatte, Udupi. Book sevas online, pay by UPI, see darshan timings and temple news.",
  keywords: [
    "Sunkadakatte temple",
    "Sunkadakatte Sri Vinayaka Temple",
    "Vinayaka Temple Udupi",
    "Santhekatte Ganapathi temple",
    "Kallianpur temple",
    "online seva booking",
    "Ganesh temple Udupi",
  ],
  openGraph: {
    type: "website",
    siteName: "Sunkadakatte Sri Vinayaka Temple",
    title: "Sunkadakatte Sri Vinayaka Temple",
    description: "Book sevas online, pay by UPI, and follow temple news and darshan timings.",
    url: "/",
    locale: "en_IN",
    images: [{ url: "/original-hero.jpg", width: 768, height: 1024, alt: "Lord Sri Vinayaka" }],
  },
  // No `icons` block here on purpose. Next's file conventions —
  // app/icon.png and app/apple-icon.png — generate the correct <link> tags
  // with cache-busting hashes, and a manual entry here would override them.
  //
  // public/favicon.ico used to be a 1024x1024 JPEG with an .ico extension
  // (853 KB, and not a valid icon container), which is why browsers fell back
  // to a generic icon. It is now a real 3-size ICO at 9 KB.
};

/**
 * Runs before React hydrates so the homepage is covered from the very first
 * paint when the temple-entrance intro is about to play. Without this the hero
 * flashes for a frame before the doors mount. TempleEntrance removes the class
 * once its own overlay has painted.
 *
 * Delivered through next/script with strategy="beforeInteractive", not a raw
 * <script> element. React only serialises a bare <script> into the SSR HTML —
 * it never executes one encountered while rendering on the client, and warns
 * about exactly that. So on any client-side navigation back to "/" the cover
 * was never applied, which is precisely the case it exists to handle.
 * beforeInteractive is injected into the initial HTML and runs before any
 * Next.js module and before hydration, which is the guarantee this needs.
 */
const ENTRANCE_PREPAINT = `
try {
  var d = document.documentElement;
  var replay = location.search.indexOf("entrance=replay") !== -1;
  if (location.pathname === "/" &&
      (replay || (!sessionStorage.getItem("svt-entrance-seen") &&
                  !matchMedia("(prefers-reduced-motion: reduce)").matches))) {
    d.classList.add("entrance-pending");
    // Safety net. TempleEntrance is normally what lifts this cover, but that
    // makes it a single point of failure over a full-screen black overlay: a
    // hydration error, a chunk that fails to load, or React re-inserting this
    // very script after the component's effect has already run would all
    // leave the homepage permanently blank. A missed animation is a far
    // cheaper failure than an unusable site, so the cover always expires.
    setTimeout(function () { d.classList.remove("entrance-pending"); }, 6000);
  }
} catch (e) {}
`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    // suppressHydrationWarning: the ENTRANCE_PREPAINT script below adds the
    // "entrance-pending" class to <html> before React hydrates, which React
    // would otherwise report as a className mismatch.
    <html
      lang="en"
      className="scroll-smooth"
      data-scroll-behavior="smooth"
      suppressHydrationWarning
    >
      <body className={`${inter.variable} ${playfair.variable} antialiased bg-cream selection:bg-gold-200`}>
        <Script
          id="entrance-prepaint"
          strategy="beforeInteractive"
          dangerouslySetInnerHTML={{ __html: ENTRANCE_PREPAINT }}
        />
        {/* Structured data: lets Google show the temple as a place, with its
            address, phone and opening hours, rather than as a bare link. */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(TEMPLE_JSON_LD) }}
        />
        <ScrollReveal />
        <Navbar />
        <main className="min-h-screen">
          {children}
        </main>
        <Footer />
      </body>
    </html>
  );
}

const TEMPLE_JSON_LD = {
  "@context": "https://schema.org",
  "@type": "HinduTemple",
  name: TEMPLE_CONTACT.name,
  url: SITE_URL,
  telephone: "+916361929580",
  image: `${SITE_URL}/original-hero.jpg`,
  address: {
    "@type": "PostalAddress",
    streetAddress: "Kallianpur Main Road, near Santhekatte",
    addressLocality: "Udupi",
    addressRegion: "Karnataka",
    postalCode: "576115",
    addressCountry: "IN",
  },
  openingHoursSpecification: [
    { "@type": "OpeningHoursSpecification", dayOfWeek: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"], opens: "06:30", closes: "12:30" },
    { "@type": "OpeningHoursSpecification", dayOfWeek: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"], opens: "17:30", closes: "20:30" },
  ],
};
