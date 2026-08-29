import React from "react";
import Script from "next/script";
import type { Metadata } from "next";
import { Inter, Playfair_Display } from "next/font/google";
import "./globals.css";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import ScrollReveal from "@/components/ScrollReveal";

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
  title: "Sunkadakatte Sri Vinayaka Temple | Spiritual Grace & Tradition",
  description:
    "Official website of Sunkadakatte Sri Vinayaka Temple. Experience the divine blessings of Lord Ganesha through our handcrafted spiritual experience.",
  keywords: ["Vinayaka Temple", "Sunkadakatte", "Ganesh temple", "online seva booking", "Karnataka temple"],
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
