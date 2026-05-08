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

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="scroll-smooth" data-scroll-behavior="smooth">
      <body className={`${inter.variable} ${playfair.variable} antialiased bg-cream selection:bg-gold-200`}>
        <Navbar />
        <main className="min-h-screen">
          {children}
        </main>
        <Footer />
      </body>
    </html>
  );
}
