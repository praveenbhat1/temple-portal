"use client";
import React, { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import Image from "next/image";
import { Menu, X, LayoutDashboard, ArrowLeft } from "lucide-react";
import { auth } from "@/lib/firebase";
import { onAuthStateChanged } from "firebase/auth";
import { checkAdminStatus } from "@/lib/auth";

const NAV_LINKS = [
  { name: "Home", href: "/" },
  { name: "Sevas", href: "/sevas" },
  { name: "Track Seva", href: "/track-booking" },
  { name: "Gallery", href: "/gallery" },
  { name: "Announcements", href: "/announcements" },
  { name: "About", href: "/about" },
  { name: "Contact", href: "/contact" },
];

function AdminShortcut({ scrolled }: { scrolled: boolean }) {
  const [isAdmin, setIsAdmin] = useState(false);
  
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      if (user) {
        const authorized = await checkAdminStatus(user.email);
        setIsAdmin(authorized);
      } else {
        setIsAdmin(false);
      }
    });
    return () => unsub();
  }, []);

  if (!isAdmin) return null;

  return (
    <Link
      href="/admin"
      className={`flex items-center gap-2 px-5 py-2 rounded-full text-xs font-bold uppercase tracking-widest transition-all ${
        scrolled
          ? "bg-saffron-600 text-white shadow-lg shadow-saffron-900/20 hover:bg-saffron-700"
          : "bg-white/10 text-gray-800 hover:bg-white/20 border border-gray-200"
      }`}
    >
      <LayoutDashboard size={14} />
      Dashboard
    </Link>
  );
}

export default function Navbar() {
  const [isOpen, setIsOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 50);
    window.addEventListener("scroll", handleScroll);

    const unsub = onAuthStateChanged(auth, async (user) => {
      if (user) {
        const authorized = await checkAdminStatus(user.email);
        setIsAdmin(authorized);
      } else {
        setIsAdmin(false);
      }
    });

    return () => {
      window.removeEventListener("scroll", handleScroll);
      unsub();
    };
  }, []);

  // Lock body scroll when mobile menu is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);


  return (
    <>
      <nav
      className={`fixed top-0 right-0 left-0 z-[100] transition-all duration-500 ${
        scrolled 
          ? "bg-ivory/95 backdrop-blur-md shadow-sm py-3" 
          : "bg-transparent py-6"
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 md:px-6 flex items-center justify-between">
        {/* Logo with B&W Ganapathi Image */}
        <Link href="/" className="flex items-center gap-3 group">
          <div className="relative w-10 h-10 md:w-12 md:h-12 bg-white rounded-full flex items-center justify-center overflow-hidden shadow-md border border-gray-100 group-hover:scale-110 transition-transform duration-300">
            <Image 
              src="/ganapathi-logo.jpg" 
              alt="Ganapathi Logo" 
              width={40}
              height={40}
              className="object-contain p-1"
              priority
            />
          </div>
          <div className="flex flex-col">
            <span className={`font-serif text-base md:text-lg font-bold leading-none transition-colors ${scrolled ? 'text-vermillion' : 'text-saffron-700'}`}>
              SRI VINAYAKA
            </span>
            <span className={`text-[9px] md:text-[10px] uppercase tracking-[0.2em] font-sans transition-colors ${scrolled ? 'text-gray-500' : 'text-saffron-700/80'}`}>
              Sunkadakatte
            </span>
          </div>
        </Link>

        {/* Desktop Links */}
        <div className="hidden md:flex items-center gap-8">
          {NAV_LINKS.map((link) => {
            const isActive = pathname === link.href;
            return (
              <Link
                key={link.name}
                href={link.href}
                className={`relative text-sm font-medium tracking-wide transition-colors duration-300 hover:text-saffron-600 ${
                  isActive 
                    ? "text-saffron-700" 
                    : scrolled ? "text-gray-600" : "text-gray-800"
                }`}
              >
                {link.name}
                {isActive && (
                  <span className="absolute -bottom-1 left-0 w-full h-0.5 bg-gold-600 rounded-full" />
                )}
              </Link>
            );
          })}
          
          {/* Admin Dashboard Shortcut (Only for authenticated admins) */}
          <AdminShortcut scrolled={scrolled} />
        </div>

        {/* Mobile Toggle */}
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="md:hidden text-saffron-700 hover:text-saffron-800 transition-colors p-2"
        >
          {isOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>

    </nav>

    {/* Mobile Menu Overlay - Moved outside nav for better z-index isolation */}
    <div
      className={`md:hidden fixed inset-0 z-[200] bg-ivory transition-all duration-500 ease-[cubic-bezier(0.23, 1, 0.32, 1)] ${
        isOpen ? "opacity-100 translate-y-0" : "opacity-0 -translate-y-full pointer-events-none"
      }`}
    >
      <div className="absolute inset-0 bg-[url('/paper-texture.png')] opacity-[0.05] pointer-events-none" />
      
      {/* Mobile Header with Back Arrow */}
      <div className="absolute top-0 left-0 right-0 p-6 flex items-center justify-between z-20">
        <button 
          onClick={() => setIsOpen(false)}
          className="flex items-center gap-2 text-saffron-700 font-sans text-sm font-bold uppercase tracking-widest hover:text-saffron-800 transition-colors"
        >
          <ArrowLeft size={20} />
          Back
        </button>
      </div>

      <div className="flex flex-col items-center justify-center h-full gap-4 px-8 relative z-10 pt-20 overflow-y-auto">
        {isAdmin && (
          <Link
            href="/admin"
            onClick={() => setIsOpen(false)}
            className="flex items-center gap-2 px-8 py-3 rounded-full bg-saffron-600 text-ivory text-sm font-bold uppercase tracking-[0.2em] mb-8 shadow-lg shadow-saffron-900/20"
          >
            <LayoutDashboard size={18} />
            Dashboard
          </Link>
        )}

        <div className="flex flex-col items-center gap-2 w-full">
          {NAV_LINKS.map((link) => {
            const isActive = pathname === link.href;
            return (
              <Link
                key={link.name}
                href={link.href}
                onClick={() => setIsOpen(false)}
                className={`w-full text-center py-3 text-xl font-serif tracking-wide transition-all duration-300 ${
                  isActive 
                    ? "text-saffron-700 font-bold" 
                    : "text-gray-900 opacity-90 hover:opacity-100"
                }`}
              >
                {link.name}
                {isActive && (
                  <div className="w-6 h-0.5 bg-gold-600 mx-auto mt-1 rounded-full" />
                )}
              </Link>
            );
          })}
        </div>

        <div className="mt-10 pt-8 border-t border-saffron-100/50 w-full text-center">
          <p className="text-[9px] uppercase tracking-[0.3em] font-bold text-saffron-600/30">
            Sunkadakatte Sri Vinayaka Temple
          </p>
        </div>
      </div>
    </div>
  </>
);
}

