import React from "react";
import type { Metadata } from "next";
import { Inter, Playfair_Display } from "next/font/google";
import "./globals.css";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

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
  icons: {
    icon: "/logo.png",
    apple: "/logo.png",
  },
};

/**
 * Runs before React hydrates so the homepage is covered from the very first
 * paint when the temple-entrance intro is about to play. Without this the hero
 * flashes for a frame before the doors mount. TempleEntrance removes the class
 * once its own overlay has painted.
 */
const ENTRANCE_PREPAINT = `
try {
  var replay = location.search.indexOf("entrance=replay") !== -1;
  if (location.pathname === "/" &&
      (replay || (!sessionStorage.getItem("svt-entrance-seen") &&
                  !matchMedia("(prefers-reduced-motion: reduce)").matches))) {
    document.documentElement.classList.add("entrance-pending");
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
        <script dangerouslySetInnerHTML={{ __html: ENTRANCE_PREPAINT }} />
        <Navbar />
        <main className="min-h-screen">
          {children}
        </main>
        <Footer />
      </body>
    </html>
  );
}
