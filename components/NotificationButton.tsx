"use client";
/**
 * NotificationButton – lets a devotee subscribe to temple update pushes, so
 * every announcement the temple posts reaches their phone.
 *
 * Two things this has to get right that the first version did not:
 *
 * - "Allowed" in the browser is not the same as "subscribed". Permission can
 *   be granted while no token was ever saved (an earlier save failed, the
 *   token was pruned, site data was cleared). So when permission is already
 *   granted, the token is quietly re-registered on load, and "Connected" is
 *   shown only once the server has it.
 * - iPhones only allow web push for a site added to the Home Screen (iOS 16.4
 *   and later). In ordinary Safari the Notification API is simply absent, so
 *   rather than a dead "Alerts unavailable", iPhone visitors get the two steps
 *   that make it work.
 */
import { useEffect, useState, useSyncExternalStore } from "react";
import { Bell, CheckCircle2, Share, SquarePlus } from "lucide-react";
import { notificationPermission, requestNotificationPermission } from "@/lib/fcm";

type State = "idle" | "loading" | "granted" | "denied" | "unavailable" | "ios-install";

/** iPhone/iPad Safari that is not running as an installed Home Screen app. */
function needsIosInstall(): boolean {
  const ua = navigator.userAgent;
  const isIos = /iPad|iPhone|iPod/.test(ua) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
  const standalone =
    window.matchMedia("(display-mode: standalone)").matches ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true;
  return isIos && !standalone;
}

const permissionStore = {
  subscribe: () => () => {},
  getSnapshot: (): State => {
    const permission = notificationPermission();
    if (permission === "unsupported") return needsIosInstall() ? "ios-install" : "unavailable";
    if (permission === "denied") return "denied";
    // "granted" is verified below before it is shown; until then, offer the button.
    return permission === "granted" ? "loading" : "idle";
  },
  getServerSnapshot: (): State => "idle",
};

export default function NotificationButton() {
  const initial = useSyncExternalStore(
    permissionStore.subscribe,
    permissionStore.getSnapshot,
    permissionStore.getServerSnapshot
  );
  const [override, setOverride] = useState<State | null>(null);
  const state = override ?? initial;
  const [detail, setDetail] = useState("");

  const subscribe = async () => {
    setOverride("loading");
    setDetail("");
    const result = await requestNotificationPermission();
    if (result.ok) return setOverride("granted");

    switch (result.reason) {
      case "denied":
        setOverride("denied");
        setDetail("You can turn alerts back on in your browser's site settings.");
        break;
      case "unsupported":
        setOverride(needsIosInstall() ? "ios-install" : "unavailable");
        setDetail("This browser doesn't support temple alerts.");
        break;
      case "timeout":
        setOverride("idle");
        setDetail("Your browser's notification service didn't respond. Please try again.");
        break;
      default:
        setOverride("idle");
        setDetail(result.detail ? `Couldn't turn on alerts: ${result.detail}` : "Couldn't turn on alerts. Please try again.");
    }
  };

  // Permission already granted: make sure this device's token is on the
  // server. No prompt appears — the browser already said yes.
  useEffect(() => {
    if (initial !== "loading") return;
    let alive = true;
    requestNotificationPermission().then((result) => {
      if (!alive) return;
      setOverride(result.ok ? "granted" : "idle");
    });
    return () => {
      alive = false;
    };
  }, [initial]);

  if (state === "granted") {
    return (
      <div className="inline-flex items-center gap-2 text-xs font-bold text-saffron-700 bg-saffron-50 px-4 py-2.5 rounded-full border border-saffron-200 animate-fade-in">
        <CheckCircle2 size={15} /> You&apos;ll get temple alerts on this device
      </div>
    );
  }

  if (state === "ios-install") {
    return (
      <div className="max-w-[320px] mx-auto lg:mx-0 text-left bg-white border border-saffron-100 rounded-2xl px-4 py-3.5 shadow-sm">
        <p className="text-sm font-bold text-gray-900 flex items-center gap-2">
          <Bell size={15} className="text-saffron-600" /> Get temple alerts on iPhone
        </p>
        <ol className="mt-2 space-y-1.5 text-[13px] text-gray-600 leading-snug">
          <li className="flex items-center gap-2">
            <span className="w-5 h-5 shrink-0 rounded-full bg-saffron-50 text-saffron-700 text-[11px] font-bold flex items-center justify-center">1</span>
            Tap <Share size={14} className="text-saffron-700" /> Share in Safari
          </li>
          <li className="flex items-center gap-2">
            <span className="w-5 h-5 shrink-0 rounded-full bg-saffron-50 text-saffron-700 text-[11px] font-bold flex items-center justify-center">2</span>
            Choose <SquarePlus size={14} className="text-saffron-700" /> Add to Home Screen, open it from there, and tap this again
          </li>
        </ol>
      </div>
    );
  }

  if (state === "denied" || state === "unavailable") {
    return (
      <p className="text-[11px] uppercase tracking-widest text-gray-500 font-bold max-w-[280px] leading-relaxed">
        {state === "denied" ? "Alerts are blocked" : "Alerts unavailable in this browser"}
        {detail && <span className="block normal-case tracking-normal mt-1 font-medium">{detail}</span>}
      </p>
    );
  }

  return (
    <div className="flex flex-col items-center lg:items-start gap-1.5">
      <button
        onClick={subscribe}
        disabled={state === "loading"}
        className="group relative inline-flex items-center gap-3 py-2 text-[11px] md:text-xs font-bold uppercase tracking-[0.2em] text-saffron-600 hover:text-saffron-700 transition-all disabled:opacity-60"
      >
        <div className="w-9 h-9 rounded-full border border-saffron-200 flex items-center justify-center group-hover:bg-saffron-50 transition-colors">
          <Bell size={15} className={state === "loading" ? "animate-bounce" : "group-hover:rotate-12 transition-transform"} />
        </div>
        <span className="border-b border-saffron-200 group-hover:border-saffron-600 pb-0.5 whitespace-nowrap">
          {state === "loading" ? "Connecting…" : "Receive Temple Alerts"}
        </span>
      </button>
      {detail && <p className="text-xs text-gray-500 max-w-[280px]">{detail}</p>}
    </div>
  );
}
