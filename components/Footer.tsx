"use client";
import React from "react";
import Link from "next/link";
import { Phone, MapPin, MessageCircle } from "lucide-react";
import { TEMPLE_CONTACT, WHATSAPP_LINK } from "@/lib/templeContact";

import { usePathname } from "next/navigation";

export default function Footer() {
  const pathname = usePathname();
  if (pathname?.startsWith("/admin")) return null;
  return (
    <footer className="bg-foreground text-ivory pt-16 md:pt-20 pb-10 relative overflow-hidden">
      {/* Decorative texture overlay */}
      <div className="absolute inset-0 opacity-5 pointer-events-none bg-[url('https://www.transparenttextures.com/patterns/dark-matter.png')]" />

      <div className="max-w-7xl mx-auto px-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12 relative z-10">
        {/* Brand */}
        <div className="lg:col-span-1">
          <Link href="/" className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center p-1 overflow-hidden">
              <img src="/ganapathi-logo-bw-sm.png" alt="Ganesh" className="w-8 h-8 object-contain" />
            </div>
            <span className="font-serif text-xl font-bold tracking-tight">Sri Vinayaka</span>
          </Link>
          <p className="text-ivory/60 text-sm leading-relaxed mb-8 max-w-sm">
            A sanctuary of peace and devotion in Sunkadakatte. Experience the timeless grace of Lord Ganesha in a handcrafted spiritual environment.
          </p>
          {/* Only real destinations: the two icons that used to sit here linked
              to "#". Add Instagram/YouTube here once the temple has them. */}
          {WHATSAPP_LINK && (
            <a
              href={WHATSAPP_LINK}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-full border border-ivory/20 px-4 py-2.5 text-sm text-ivory/80 hover:bg-saffron-600 hover:border-saffron-600 hover:text-white transition-all"
            >
              <MessageCircle size={16} /> Join us on WhatsApp
            </a>
          )}
        </div>

        {/* Quick Links */}
        <div>
          <h4 className="font-serif text-lg font-bold mb-6 text-gold-400">Divine Journey</h4>
          <ul className="space-y-4 text-sm text-ivory/60">
            <li><Link href="/sevas" className="inline-block py-1.5 hover:text-saffron-500 transition-colors">Book a Seva</Link></li>
            <li><Link href="/gallery" className="inline-block py-1.5 hover:text-saffron-500 transition-colors">Temple Gallery</Link></li>
            <li><Link href="/about" className="inline-block py-1.5 hover:text-saffron-500 transition-colors">History & Legacy</Link></li>
            <li><Link href="/contact" className="inline-block py-1.5 hover:text-saffron-500 transition-colors">Plan Your Visit</Link></li>
          </ul>
        </div>

        {/* Timings */}
        <div>
          <h4 className="font-serif text-lg font-bold mb-6 text-gold-400">Temple Timings</h4>
          <ul className="space-y-4 text-sm text-ivory/60">
            <li className="flex flex-col gap-1">
              <span className="text-ivory font-medium">Morning Darshan</span>
              <span>6:30 AM – 12:30 PM</span>
            </li>
            <li className="flex flex-col gap-1">
              <span className="text-ivory font-medium">Evening Darshan</span>
              <span>5:30 PM – 8:30 PM</span>
            </li>
          </ul>
        </div>

        {/* Contact */}
        <div>
          <h4 className="font-serif text-lg font-bold mb-6 text-gold-400">Contact Us</h4>
          <ul className="space-y-4 text-sm text-ivory/60">
            <li className="flex items-start gap-3">
              <MapPin size={18} className="text-saffron-600 flex-shrink-0 mt-1" />
              <span>{TEMPLE_CONTACT.address}</span>
            </li>
            <li className="flex items-center gap-3">
              <Phone size={18} className="text-saffron-600 flex-shrink-0" />
              <a href={TEMPLE_CONTACT.phoneHref} className="inline-block py-1.5 hover:text-saffron-500 transition-colors tracking-wide">{TEMPLE_CONTACT.phoneDisplay}</a>
            </li>
          </ul>
        </div>
      </div>

      {/* Bottom Bar */}
      <div className="max-w-7xl mx-auto px-6 mt-16 md:mt-20 pt-8 border-t border-ivory/10 flex flex-col md:flex-row items-center justify-between gap-6 text-[10px] uppercase tracking-widest text-ivory/40 text-center md:text-left">
        <div className="space-y-3">
          <p>© 2026 Sunkadakatte Sri Vinayaka Temple. All Rights Reserved.</p>
          {/* Razorpay requires these to be reachable from every page. */}
          <nav aria-label="Policies" className="flex flex-wrap justify-center md:justify-start gap-x-5 gap-y-1 normal-case tracking-normal text-xs text-ivory/60">
            <Link href="/privacy-policy" className="py-1.5 hover:text-saffron-500 transition-colors">Privacy Policy</Link>
            <Link href="/terms" className="py-1.5 hover:text-saffron-500 transition-colors">Terms &amp; Conditions</Link>
            <Link href="/refund-policy" className="py-1.5 hover:text-saffron-500 transition-colors">Refund &amp; Cancellation</Link>
            <Link href="/contact" className="py-1.5 hover:text-saffron-500 transition-colors">Contact</Link>
          </nav>
        </div>
        <p className="flex items-center gap-2">
          Handcrafted with Devotion <img src="/ganapathi-logo-bw-sm.png" alt="Ganesh" className="w-3 h-3 opacity-40" />
        </p>
      </div>
    </footer>
  );
}
