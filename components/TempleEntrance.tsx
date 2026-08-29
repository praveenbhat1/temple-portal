"use client";
/**
 * TempleEntrance — the ceremonial intro for the homepage.
 *
 * The sequence, as a piece of film:
 *
 *   0.0s  darkness, a vignette, two oil lamps catch
 *   0.6s  the brass bells swing and ring, light seeping through the door seam
 *   1.3s  the carved doors part — a shaft of light widens across the floor
 *   2.0s  the camera pushes in; Lord Vinayaka is revealed inside a lit arch
 *   2.6s  petals and embers drift through the light
 *   3.1s  the mantra rises
 *   4.4s  the veil lifts onto the page beneath
 *
 * The whole thing is CSS and inline SVG — no video file. That is deliberate:
 * an intro is the worst possible place for a multi-megabyte download, because
 * it sits between the devotee and the site. This weighs nothing and starts on
 * the first frame.
 *
 * Plays once per browser session, skippable by any interaction, and suppressed
 * entirely for visitors who prefer reduced motion.
 *
 * The pre-paint cover (html.entrance-pending, set by the inline script in
 * app/layout.tsx) hides the homepage until this overlay has painted, so the
 * animation never starts with a flash of the hero.
 */
import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";

export const ENTRANCE_SESSION_KEY = "svt-entrance-seen";

/** Total run time before the veil lifts on its own, in ms. */
const AUTO_FINISH_MS = 4400;
/** Duration of the closing fade, must match --entrance-veil-ms in globals.css. */
const VEIL_MS = 900;

function clearPrePaintCover() {
  document.documentElement.classList.remove("entrance-pending");
}

/**
 * Decide whether the ceremony should run, reading sessionStorage and the
 * reduced-motion preference — both browser-only, so this must not run on the
 * server.
 *
 * The answer is cached at module scope so it stays stable for the whole page
 * life: re-reading it on every render would return false the moment we set the
 * "seen" flag, and the overlay would vanish mid-animation.
 */
let cachedShouldPlay: boolean | null = null;

function computeShouldPlay(): boolean {
  try {
    // ?entrance=replay forces the ceremony to run again — handy for showing it
    // off without having to open a fresh browser session.
    const forced = new URLSearchParams(window.location.search).get("entrance") === "replay";
    if (forced) return true;

    if (sessionStorage.getItem(ENTRANCE_SESSION_KEY)) return false;
    return !window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  } catch {
    // Private browsing with storage disabled — just skip the ceremony.
    return false;
  }
}

const shouldPlayStore = {
  subscribe: () => () => {},
  getSnapshot: (): boolean => {
    if (cachedShouldPlay === null) cachedShouldPlay = computeShouldPlay();
    return cachedShouldPlay;
  },
  getServerSnapshot: (): boolean => false,
};

export default function TempleEntrance() {
  const shouldPlay = useSyncExternalStore(
    shouldPlayStore.subscribe,
    shouldPlayStore.getSnapshot,
    shouldPlayStore.getServerSnapshot
  );

  // Only the transitions we drive ourselves live in state; the starting phase is
  // derived, so there is no setState during mount.
  const [advanced, setAdvanced] = useState<"closing" | "done" | null>(null);
  const phase: "playing" | "closing" | "done" = advanced ?? (shouldPlay ? "playing" : "done");

  const timers = useRef<number[]>([]);

  const finish = useCallback(() => {
    setAdvanced((current) => {
      if (current !== null) return current; // already closing or closed
      timers.current.forEach(clearTimeout);
      timers.current = [];
      timers.current.push(window.setTimeout(() => setAdvanced("done"), VEIL_MS));
      return "closing";
    });
  }, []);

  useEffect(() => {
    if (!shouldPlay) {
      clearPrePaintCover();
      return;
    }

    try {
      sessionStorage.setItem(ENTRANCE_SESSION_KEY, "1");
    } catch {
      /* storage unavailable — the module-level cache still prevents a replay */
    }

    // Hand off from the pre-paint cover only once this overlay has painted,
    // otherwise the page flashes through in the gap between the two.
    const raf = requestAnimationFrame(() => requestAnimationFrame(clearPrePaintCover));

    timers.current.push(window.setTimeout(finish, AUTO_FINISH_MS));

    return () => {
      cancelAnimationFrame(raf);
      timers.current.forEach(clearTimeout);
      timers.current = [];
    };
  }, [shouldPlay, finish]);

  // Lock scrolling and let any interaction skip ahead.
  useEffect(() => {
    if (phase !== "playing") return;

    // The class locks both <html> and <body>, so no scrollbar sliver shows
    // alongside the fixed overlay.
    document.documentElement.classList.add("entrance-active");

    const skip = () => finish();
    window.addEventListener("pointerdown", skip);
    window.addEventListener("keydown", skip);
    window.addEventListener("wheel", skip, { passive: true });
    window.addEventListener("touchstart", skip, { passive: true });

    return () => {
      document.documentElement.classList.remove("entrance-active");
      window.removeEventListener("pointerdown", skip);
      window.removeEventListener("keydown", skip);
      window.removeEventListener("wheel", skip);
      window.removeEventListener("touchstart", skip);
    };
  }, [phase, finish]);

  if (phase === "done") return null;

  return (
    <div
      className={`entrance-root ${phase === "closing" ? "is-closing" : ""}`}
      role="presentation"
      aria-hidden="true"
    >
      {/* The whole scene sits in one element so the camera can push in on it. */}
      <div className="entrance-camera">
        {/* ── The sanctum behind the doors ── */}
        <div className="entrance-sanctum">
          <div className="entrance-halo" />

          {/* Shaft of light spilling out through the parting doors. */}
          <div className="entrance-shaft" />
          <div className="entrance-floorglow" />

          <div className="entrance-arch">
            <div className="entrance-arch__frame" />
            <div className="entrance-deity">
              <img src="/original-hero.jpg" alt="" draggable={false} />
              <span className="entrance-deity__sheen" />
            </div>
          </div>

          <p className="entrance-mantra">
            <span>ॐ</span> <span>ಗಂ</span> <span>ಗಣಪತಯೇ</span> <span>ನಮಃ</span>
          </p>

          {/* Drifting petals and embers, caught in the light. */}
          <Motes />
        </div>

        {/* ── Hanging oil lamps, lit before anything else moves ── */}
        <Lamp side="left" />
        <Lamp side="right" />

        {/* ── Bells, one on each side ── */}
        <Bell side="left" />
        <Bell side="right" />

        {/* ── The carved doors ── */}
        <div className="entrance-door entrance-door--left">
          <DoorCarving />
        </div>
        <div className="entrance-door entrance-door--right">
          <DoorCarving />
        </div>

        {/* Seam of light between the doors, before they part. */}
        <div className="entrance-seam" />

        {/* Cinematic vignette over everything. */}
        <div className="entrance-vignette" />
      </div>

      <button className="entrance-skip" onClick={finish} tabIndex={-1}>
        Skip
      </button>
    </div>
  );
}

/**
 * Petals and embers drifting up through the shaft of light.
 *
 * Position, delay, drift and size come from an index-derived pattern rather
 * than Math.random(): a random value differs between the server render and the
 * client, which React reports as a hydration mismatch.
 */
function Motes() {
  const motes = Array.from({ length: 18 }, (_, i) => {
    const left = 6 + ((i * 37) % 88);
    const delay = 1.4 + ((i * 13) % 26) / 10;
    const duration = 5.5 + ((i * 7) % 30) / 10;
    const size = 3 + ((i * 5) % 4);
    const drift = ((i % 5) - 2) * 22;
    return { left, delay, duration, size, drift, petal: i % 3 === 0 };
  });

  return (
    <div className="entrance-motes">
      {motes.map((m, i) => (
        <span
          key={i}
          className={m.petal ? "entrance-mote entrance-mote--petal" : "entrance-mote"}
          style={
            {
              left: `${m.left}%`,
              width: `${m.size}px`,
              height: `${m.petal ? m.size * 2 : m.size}px`,
              animationDelay: `${m.delay}s`,
              animationDuration: `${m.duration}s`,
              "--mote-drift": `${m.drift}px`,
            } as React.CSSProperties
          }
        />
      ))}
    </div>
  );
}

/** A hanging brass oil lamp whose flame catches and then flickers. */
function Lamp({ side }: { side: "left" | "right" }) {
  return (
    <div className={`entrance-lamp entrance-lamp--${side}`}>
      <span className="entrance-lamp__chain" />
      <span className="entrance-lamp__glow" />
      <svg viewBox="0 0 48 44" width="100%" height="100%" aria-hidden="true">
        <defs>
          <linearGradient id={`lampbrass-${side}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#f3d98f" />
            <stop offset="45%" stopColor="#c99a2e" />
            <stop offset="100%" stopColor="#6b4d12" />
          </linearGradient>
        </defs>
        {/* bowl */}
        <path d="M6 16h36l-6 16a4 4 0 0 1-3.7 2.5H15.7A4 4 0 0 1 12 32z" fill={`url(#lampbrass-${side})`} />
        <ellipse cx="24" cy="16" rx="18" ry="4.5" fill="#f3d98f" opacity="0.75" />
        {/* spout */}
        <path d="M40 17l7-3-6.5 6z" fill={`url(#lampbrass-${side})`} />
      </svg>
      <span className="entrance-lamp__flame" />
    </div>
  );
}

/** A hanging brass bell that swings twice and radiates sound rings. */
function Bell({ side }: { side: "left" | "right" }) {
  return (
    <div className={`entrance-bell entrance-bell--${side}`}>
      <span className="entrance-bell__ring" />
      <span className="entrance-bell__ring entrance-bell__ring--delayed" />
      <div className="entrance-bell__swing">
        <svg viewBox="0 0 64 116" width="100%" height="100%" aria-hidden="true">
          <defs>
            <linearGradient id={`brass-${side}`} x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#fbeec0" />
              <stop offset="30%" stopColor="#e0bf55" />
              <stop offset="62%" stopColor="#9c7420" />
              <stop offset="100%" stopColor="#5d420f" />
            </linearGradient>
            <linearGradient id={`cord-${side}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#7f1d1d" />
              <stop offset="100%" stopColor="#b91c1c" />
            </linearGradient>
          </defs>

          {/* cord */}
          <rect x="30" y="0" width="4" height="30" fill={`url(#cord-${side})`} />
          {/* crown */}
          <circle cx="32" cy="32" r="5" fill={`url(#brass-${side})`} />
          {/* body */}
          <path
            d="M32 37c-13 0-21 12-23 28-1.5 11-4 16-5 19h56c-1-3-3.5-8-5-19-2-16-10-28-23-28z"
            fill={`url(#brass-${side})`}
          />
          {/* lip */}
          <ellipse cx="32" cy="86" rx="28" ry="6" fill={`url(#brass-${side})`} />
          <ellipse cx="32" cy="84" rx="28" ry="5" fill="#fbeec0" opacity="0.55" />
          {/* clapper */}
          <circle cx="32" cy="97" r="6" fill="#8a6a1c" />
          {/* highlight */}
          <path
            d="M22 45c-5 8-7 20-7 30"
            stroke="#fdf3d0"
            strokeWidth="2.5"
            fill="none"
            opacity="0.6"
            strokeLinecap="round"
          />
        </svg>
      </div>
    </div>
  );
}

/** Carved panelling, brass studs and a ring handle for one door leaf. */
function DoorCarving() {
  return (
    <div className="entrance-door__face">
      <div className="entrance-door__panel entrance-door__panel--upper">
        <span className="entrance-door__motif">ॐ</span>
      </div>
      <div className="entrance-door__panel entrance-door__panel--lower">
        <span className="entrance-door__lotus" />
      </div>
      <div className="entrance-door__studs">
        {Array.from({ length: 7 }).map((_, i) => (
          <span key={i} />
        ))}
      </div>
      <div className="entrance-door__handle" />
    </div>
  );
}
