"use client";
/**
 * NotificationButton – lets a devotee subscribe to temple update pushes.
 */
import { useState, useSyncExternalStore } from "react";
import { Bell, CheckCircle2 } from "lucide-react";
import { notificationPermission, requestNotificationPermission } from "@/lib/fcm";

type State = "idle" | "loading" | "granted" | "denied" | "unavailable";

/**
 * Read the browser's current notification permission.
 *
 * useSyncExternalStore rather than an effect: the permission is external
 * browser state, it must not be read during SSR, and reading it this way avoids
 * the extra render pass a setState-in-effect would cause. Permission only
 * changes as a result of our own prompt, so nothing needs to be subscribed to.
 */
const permissionStore = {
  subscribe: () => () => {},
  getSnapshot: (): State => {
    const permission = notificationPermission();
    if (permission === "unsupported") return "unavailable";
    if (permission === "granted") return "granted";
    if (permission === "denied") return "denied";
    return "idle";
  },
  getServerSnapshot: (): State => "idle",
};

export default function NotificationButton() {
  const initial = useSyncExternalStore(
    permissionStore.subscribe,
    permissionStore.getSnapshot,
    permissionStore.getServerSnapshot
  );

  // null means "no explicit action yet — follow the browser's own state".
  const [override, setOverride] = useState<State | null>(null);
  const state = override ?? initial;
  const [detail, setDetail] = useState("");

  const setState = setOverride;

  const handleClick = async () => {
    setState("loading");
    setDetail("");

    const result = await requestNotificationPermission();

    if (result.ok) {
      setState("granted");
      return;
    }

    switch (result.reason) {
      case "denied":
        setState("denied");
        setDetail("You can re-enable alerts in your browser's site settings.");
        break;
      case "unsupported":
        setState("unavailable");
        setDetail("This browser doesn't support temple alerts.");
        break;
      case "timeout":
        setState("unavailable");
        setDetail("Your browser's notification service didn't respond. Please try again.");
        break;
      default:
        setState("unavailable");
        // Surface the underlying reason when there is one — "try again later"
        // with no detail is what made this impossible to diagnose.
        setDetail(
          result.detail
            ? `Couldn't enable alerts: ${result.detail}`
            : "Couldn't enable alerts just now. Please try again later."
        );
    }
  };

  if (state === "granted") {
    return (
      <div className="inline-flex items-center gap-2 text-[10px] md:text-xs font-bold text-saffron-700 bg-saffron-50 px-4 py-2 rounded-full border border-saffron-200 animate-fade-in">
        <CheckCircle2 size={14} /> Connected to Divine Updates
      </div>
    );
  }

  if (state === "denied" || state === "unavailable") {
    return (
      <p className="text-[9px] md:text-[10px] uppercase tracking-widest text-gray-400 font-bold max-w-[260px] leading-relaxed">
        {state === "denied" ? "Notifications blocked" : "Alerts unavailable"}
        {detail && <span className="block normal-case tracking-normal mt-1 text-gray-400">{detail}</span>}
      </p>
    );
  }

  return (
    <button
      onClick={handleClick}
      disabled={state === "loading"}
      className="group relative inline-flex items-center gap-3 text-[10px] md:text-xs font-bold uppercase tracking-[0.2em] text-saffron-600 hover:text-saffron-700 transition-all disabled:opacity-60"
    >
      <div className="w-8 h-8 rounded-full border border-saffron-200 flex items-center justify-center group-hover:bg-saffron-50 transition-colors">
        <Bell size={14} className={state === "loading" ? "animate-bounce" : "group-hover:rotate-12 transition-transform"} />
      </div>
      <span className="border-b border-saffron-200 group-hover:border-saffron-600 pb-0.5 whitespace-nowrap">
        {state === "loading" ? "Invoking updates…" : "Receive Temple Alerts"}
      </span>
      <div className="opacity-0 group-hover:opacity-100 transition-all -translate-y-2 group-hover:translate-y-0 flex items-center shrink-0">
        <img src="/ganapathi-logo-bw.png" alt="" className="w-3.5 h-3.5" />
      </div>
    </button>
  );
}
