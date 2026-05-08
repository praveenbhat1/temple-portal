"use client";
/**
 * NotificationButton – Premium redesign for the hero section.
 */
import { useState } from "react";
import { Bell, CheckCircle2 } from "lucide-react";
import Image from "next/image";
import { requestNotificationPermission } from "@/lib/fcm";

export default function NotificationButton() {
  const [status, setStatus] = useState<"idle" | "loading" | "granted" | "denied">("idle");

  const handleClick = async () => {
    setStatus("loading");
    const token = await requestNotificationPermission();
    setStatus(token ? "granted" : "denied");
  };

  if (status === "granted") {
    return (
      <div className="inline-flex items-center gap-2 text-[10px] md:text-xs font-bold text-gold-400 bg-foreground/10 px-4 py-2 rounded-full border border-gold-400/20 animate-fade-in">
        <CheckCircle2 size={14} /> Connected to Divine Updates
      </div>
    );
  }

  if (status === "denied") {
    return (
      <p className="text-[9px] md:text-[10px] uppercase tracking-widest text-red-300 font-bold opacity-80">
        Notifications disabled
      </p>
    );
  }

  return (
    <button
      onClick={handleClick}
      disabled={status === "loading"}
      className="group relative inline-flex items-center gap-3 text-[10px] md:text-xs font-bold uppercase tracking-[0.2em] text-saffron-600 hover:text-saffron-700 transition-all disabled:opacity-60"
    >
      <div className="w-8 h-8 rounded-full border border-saffron-200 flex items-center justify-center group-hover:bg-saffron-50 transition-colors">
        <Bell size={14} className={status === "loading" ? "animate-bounce" : "group-hover:rotate-12 transition-transform"} />
      </div>
      <span className="border-b border-saffron-200 group-hover:border-saffron-600 pb-0.5 whitespace-nowrap">
        {status === "loading" ? "Invoking updates…" : "Receive Temple Alerts"}
      </span>
      <div className="opacity-0 group-hover:opacity-100 transition-all -translate-y-2 group-hover:translate-y-0 flex items-center shrink-0">
        <Image src="/ganapathi-logo-bw.png" alt="Ganesh" width={14} height={14} />
      </div>
    </button>
  );
}
