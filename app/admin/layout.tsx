"use client";
/**
 * Admin layout – Premium, clean management interface.
 * Strictly protects all /admin routes via Firebase Auth + Firestore 'admins' check.
 */
import { useEffect, useState } from "react";
import { onAuthStateChanged, signOut, User } from "firebase/auth";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { auth } from "@/lib/firebase";
import { checkAdminStatus } from "@/lib/auth";
import {
  LayoutDashboard,
  ScrollText,
  Image as ImageIcon,
  BookOpen,
  LogOut,
  Bell,
  Menu,
} from "lucide-react";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [user, setUser] = useState<User | null>(null);
  const [checking, setChecking] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 50);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (u) => {
      if (!u) {
        // No user logged in, redirect to login
        router.replace("/admin/login");
        setChecking(false);
      } else {
        // User logged in, verify if they are in the 'admins' collection
        const isAuthorized = await checkAdminStatus(u.email);
        if (!isAuthorized) {
          await signOut(auth);
          router.replace("/admin/login");
        } else {
          setUser(u);
        }
        setChecking(false);
      }
    });
    return () => unsub();
  }, [router]);

  const handleSignOut = async () => {
    await signOut(auth);
    router.replace("/admin/login");
  };

  // If checking, show loader
  if (checking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-cream">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-saffron-600 border-t-transparent rounded-full animate-spin" />
          <p className="text-[10px] uppercase tracking-widest font-bold text-saffron-600">Verifying Divine Authority...</p>
        </div>
      </div>
    );
  }

  // If we are on the login page, allow rendering even without a user
  if (pathname === "/admin/login") {
    return <>{children}</>;
  }

  // If not authenticated and not checking, we shouldn't show anything (redirect will happen)
  if (!user) return null;

  const navItems = [
    { href: "/admin", label: "Dashboard", icon: <LayoutDashboard size={18} /> },
    { href: "/admin/sevas", label: "Manage Sevas", icon: <ScrollText size={18} /> },
    { href: "/admin/announcements", label: "Announcements", icon: <Bell size={18} /> },
    { href: "/admin/gallery", label: "Gallery", icon: <ImageIcon size={18} /> },
    { href: "/admin/bookings", label: "Bookings", icon: <BookOpen size={18} /> },
  ];

  return (
    <div className="min-h-screen flex bg-gray-50 font-sans">
      {/* Sidebar */}
      <aside
        className={`fixed bottom-0 left-0 z-50 bg-[#1a1512] text-ivory flex flex-col transform transition-all duration-300 ease-in-out border-r border-white/5 ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        } md:translate-x-0 md:w-64 ${scrolled ? "top-16" : "top-24"}`}
      >
        {/* Brand Section - Hidden on desktop as it's in the Navbar */}
        <div className="px-4 py-8 border-b border-white/5 flex flex-col items-center justify-center transition-all md:hidden h-auto">
          <Link href="/" className="group flex flex-col items-center">
            <div className="bg-white rounded-xl flex items-center justify-center p-1.5 overflow-hidden shadow-2xl transition-all duration-500 w-14 h-14 mb-3">
              <Image src="/logo.png" alt="Ganesh" width={40} height={40} className="object-contain" />
            </div>
            <div className="flex flex-col items-center animate-fade-in">
              <span className="font-serif text-lg font-bold tracking-tight text-gold-400">Sri Vinayaka</span>
              <p className="text-[10px] text-ivory/40 uppercase tracking-[0.3em] font-bold">Admin Portal</p>
            </div>
          </Link>
        </div>

        {/* User Summary */}
        <div className="px-4 py-6 border-b border-white/5 transition-all opacity-100">
          <div className="flex items-center gap-3 bg-white/5 p-3 rounded-2xl">
            <div className="w-10 h-10 rounded-full bg-saffron-600/20 border border-saffron-600/30 flex items-center justify-center text-saffron-500 font-bold flex-shrink-0">
              {user.email?.[0].toUpperCase()}
            </div>
            <div className="min-w-0">
              <p className="text-[10px] font-bold truncate">{user.email}</p>
              <span className="text-[8px] text-gold-400 font-bold uppercase tracking-widest">Authorized</span>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-3 py-6 space-y-2 overflow-y-auto custom-scrollbar">
          {navItems.map(({ href, label, icon }) => {
            const active = pathname === href;
            return (
              <Link
                key={href}
                href={href}
                onClick={() => setSidebarOpen(false)}
                className={`flex items-center gap-4 px-4 py-3 rounded-xl text-sm font-medium transition-all group relative ${
                  active
                    ? "bg-saffron-600 text-white shadow-lg shadow-saffron-900/20"
                    : "text-ivory/60 hover:bg-white/5 hover:text-ivory"
                }`}
              >
                <div className="flex-shrink-0">{icon}</div>
                <span className="animate-fade-in">{label}</span>
              </Link>
            );
          })}
        </nav>

        {/* Footer actions */}
        <div className="px-3 py-6 border-t border-white/5">
          <button
            onClick={handleSignOut}
            className="flex items-center gap-4 w-full px-4 py-3 rounded-xl text-sm font-medium text-red-400 hover:bg-red-400/10 transition-all group relative"
          >
            <div className="flex-shrink-0"><LogOut size={18} /></div>
            <span>Sign Out</span>
          </button>
        </div>
      </aside>

      {/* Mobile Backdrop */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-30 bg-foreground/60 backdrop-blur-sm md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 transition-all duration-300 md:pl-64">
        {/* Sub-Header / Content Title (Optional Breadcrumb style) */}
        {/* Floating Mobile Toggle (Only visible when sidebar closed) */}
        {!sidebarOpen && (
          <button 
            onClick={() => setSidebarOpen(true)}
            className="md:hidden fixed top-24 left-4 z-40 bg-white shadow-lg border border-saffron-100 p-3 rounded-2xl text-saffron-700 animate-fade-in"
          >
            <Menu size={20} />
          </button>
        )}

        <main className="flex-1 p-4 md:p-6 lg:p-10 max-w-7xl">
          <div className="animate-fade-in pt-48 md:pt-40">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
