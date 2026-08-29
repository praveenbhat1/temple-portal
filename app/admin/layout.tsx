"use client";
/**
 * Admin shell — the frame every /admin page renders inside.
 *
 * It owns the whole viewport. The public Navbar and Footer opt out of /admin
 * (see components/Navbar.tsx), because when they didn't, this layout had to
 * push its content down with a pt-48 spacer and pin its sidebar to a moving
 * `top` offset that tracked the public header's scroll state. Both hacks are
 * gone: the sidebar is simply `inset-y-0`.
 *
 * Access control here is a convenience, not the security boundary. Every read
 * and write is authorised again on the other side — firestore.rules re-checks
 * the `admins` collection, and the API routes re-check a verified ID token in
 * verifyAdminRequest(). Forcing this component to render admits you to an
 * empty shell.
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
  X,
  ExternalLink,
} from "lucide-react";

const NAV_ITEMS = [
  { href: "/admin", label: "Dashboard", icon: LayoutDashboard },
  { href: "/admin/bookings", label: "Bookings", icon: BookOpen },
  { href: "/admin/sevas", label: "Sevas", icon: ScrollText },
  { href: "/admin/announcements", label: "Announcements", icon: Bell },
  { href: "/admin/gallery", label: "Gallery", icon: ImageIcon },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [user, setUser] = useState<User | null>(null);
  const [checking, setChecking] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const isLoginPage = pathname === "/admin/login";

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (u) => {
      if (!u) {
        setUser(null);
        setChecking(false);
        if (!isLoginPage) router.replace("/admin/login");
        return;
      }

      const isAuthorized = await checkAdminStatus(u.email);
      if (!isAuthorized) {
        await signOut(auth);
        setUser(null);
        setChecking(false);
        if (!isLoginPage) router.replace("/admin/login");
        return;
      }

      setUser(u);
      setChecking(false);
    });
    return () => unsub();
  }, [router, isLoginPage]);

  // The login page is the one /admin route that renders without a session.
  if (isLoginPage) return <>{children}</>;

  if (checking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#faf8f5]">
        <div className="flex flex-col items-center gap-5">
          <div className="w-10 h-10 border-[3px] border-saffron-600 border-t-transparent rounded-full animate-spin" />
          <p className="text-[10px] uppercase tracking-[0.25em] font-bold text-gray-400">
            Verifying access
          </p>
        </div>
      </div>
    );
  }

  // Not signed in — the redirect above is already in flight.
  if (!user) return null;

  return (
    <div className="min-h-screen bg-[#faf8f5] font-sans">
      {/* ── Sidebar ── */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-[264px] bg-[#17120f] text-ivory flex flex-col border-r border-white/[0.06] transform transition-transform duration-300 ease-out md:translate-x-0 ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {/* Brand */}
        <div className="px-5 h-[76px] flex items-center gap-3 border-b border-white/[0.06] shrink-0">
          <div className="bg-white rounded-xl w-10 h-10 flex items-center justify-center p-1 shrink-0 shadow-lg">
            <Image src="/logo.png" alt="" width={30} height={30} className="object-contain" />
          </div>
          <div className="min-w-0">
            <p className="font-serif text-[15px] font-bold text-gold-400 leading-tight truncate">
              Sri Vinayaka
            </p>
            <p className="text-[9px] text-ivory/35 uppercase tracking-[0.22em] font-bold">
              Temple Admin
            </p>
          </div>
          <button
            onClick={() => setSidebarOpen(false)}
            className="md:hidden ml-auto text-ivory/40 hover:text-ivory p-1"
            aria-label="Close menu"
          >
            <X size={20} />
          </button>
        </div>

        {/* Navigation */}
        <nav className="custom-scrollbar-dark flex-1 px-3 py-5 space-y-1 overflow-y-auto">
          {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
            const active = pathname === href;
            return (
              <Link
                key={href}
                href={href}
                // Closed on tap rather than from an effect on `pathname` —
                // otherwise the drawer stays open over the page you just
                // navigated to for a render, and the fix costs a cascading
                // re-render of the whole shell on every navigation.
                onClick={() => setSidebarOpen(false)}
                className={`flex items-center gap-3.5 px-4 py-3 rounded-xl text-sm font-medium transition-colors ${
                  active
                    ? "bg-saffron-600 text-white shadow-lg shadow-saffron-950/30"
                    : "text-ivory/55 hover:bg-white/[0.06] hover:text-ivory"
                }`}
              >
                <Icon size={18} className="shrink-0" />
                {label}
              </Link>
            );
          })}

          <div className="pt-4 mt-4 border-t border-white/[0.06]">
            <Link
              href="/"
              target="_blank"
              onClick={() => setSidebarOpen(false)}
              className="flex items-center gap-3.5 px-4 py-3 rounded-xl text-sm font-medium text-ivory/40 hover:bg-white/[0.06] hover:text-ivory transition-colors"
            >
              <ExternalLink size={18} className="shrink-0" />
              View website
            </Link>
          </div>
        </nav>

        {/* Signed-in admin */}
        <div className="px-3 pb-4 pt-3 border-t border-white/[0.06] shrink-0">
          <div className="flex items-center gap-3 px-3 py-2.5 mb-1">
            <div className="w-9 h-9 rounded-full bg-saffron-600/15 border border-saffron-600/25 flex items-center justify-center text-saffron-500 text-sm font-bold shrink-0">
              {user.email?.[0]?.toUpperCase()}
            </div>
            <div className="min-w-0">
              <p className="text-[11px] font-bold truncate text-ivory/90">{user.email}</p>
              <p className="text-[9px] text-gold-400/70 font-bold uppercase tracking-[0.15em]">
                Administrator
              </p>
            </div>
          </div>
          <button
            onClick={async () => {
              await signOut(auth);
              router.replace("/admin/login");
            }}
            className="flex items-center gap-3.5 w-full px-4 py-2.5 rounded-xl text-sm font-medium text-red-400/80 hover:bg-red-500/10 hover:text-red-400 transition-colors"
          >
            <LogOut size={18} className="shrink-0" />
            Sign out
          </button>
        </div>
      </aside>

      {/* Mobile backdrop */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* ── Content ── */}
      <div className="md:pl-[264px] flex flex-col min-h-screen">
        {/* Mobile top bar — the only header; desktop gets its title from the page */}
        <header className="md:hidden sticky top-0 z-30 h-[60px] px-4 flex items-center gap-3 bg-[#faf8f5]/90 backdrop-blur-md border-b border-gray-200/70">
          <button
            onClick={() => setSidebarOpen(true)}
            className="p-2 -ml-2 text-gray-700"
            aria-label="Open menu"
          >
            <Menu size={22} />
          </button>
          <span className="font-serif text-base text-gray-900">
            {NAV_ITEMS.find((i) => i.href === pathname)?.label ?? "Admin"}
          </span>
        </header>

        <main className="flex-1 px-4 py-6 md:px-8 md:py-10 lg:px-12">
          {/* Deliberately no animate-fade-in here. Every dialog in the admin
              is `position: fixed`, and an animated ancestor with a lingering
              transform silently becomes their containing block. */}
          <div className="max-w-[1400px] mx-auto">{children}</div>
        </main>
      </div>
    </div>
  );
}
