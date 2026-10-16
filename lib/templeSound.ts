"use client";
/**
 * The temple bell, synthesised — no audio file to download before the intro.
 *
 * A struck brass bell is a set of inharmonic partials that ring at different
 * rates, which is why it doesn't sound like a sine "beep". The ratios below
 * are the classic bell partials (hum, prime, tierce, quint, nominal and up);
 * each gets its own level and decay, plus a short noisy strike transient.
 *
 * Browsers start every AudioContext suspended until the visitor has tapped
 * something, so sound is strictly opt-in: TempleEntrance offers a "sound"
 * button, and a page that never gets a tap simply stays silent.
 */

const PARTIALS: [ratio: number, gain: number, decay: number][] = [
  [0.5, 0.35, 4.2], // hum
  [1.0, 0.6, 3.4], // prime / fundamental
  [1.19, 0.32, 2.6], // minor-third tierce — the "bell" colour
  [1.5, 0.18, 2.2],
  [2.0, 0.4, 2.0], // nominal
  [2.74, 0.16, 1.4],
  [3.76, 0.1, 0.9],
  [5.4, 0.05, 0.5],
];

let ctx: AudioContext | null = null;
let master: GainNode | null = null;

function context(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (!ctx) {
    const Ctor = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctor) return null;
    ctx = new Ctor();
    master = ctx.createGain();
    master.gain.value = 0.32; // a soft bell, not an alarm
    // A gentle low-pass takes the edge off the top partials on phone speakers.
    const tone = ctx.createBiquadFilter();
    tone.type = "lowpass";
    tone.frequency.value = 5200;
    master.connect(tone).connect(ctx.destination);
  }
  return ctx;
}

/** Resume audio. Must be called from inside a tap/click handler. */
export async function unlockSound(): Promise<boolean> {
  const c = context();
  if (!c) return false;
  try {
    if (c.state !== "running") await c.resume();
  } catch {
    return false;
  }
  return c.state === "running";
}

export function soundUnlocked(): boolean {
  return ctx?.state === "running";
}

/** Strike the bell once. `fundamental` in Hz; `when` in seconds from now. */
export function strikeBell(fundamental = 560, when = 0, level = 1) {
  const c = ctx;
  if (!c || !master || c.state !== "running") return;
  const t0 = c.currentTime + when;

  for (const [ratio, gain, decay] of PARTIALS) {
    const osc = c.createOscillator();
    const g = c.createGain();
    osc.type = "sine";
    // A hair of detune per partial gives the slow beating of real bronze.
    osc.frequency.value = fundamental * ratio * (1 + (Math.random() - 0.5) * 0.002);
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(gain * level, t0 + 0.006);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + decay);
    osc.connect(g).connect(master);
    osc.start(t0);
    osc.stop(t0 + decay + 0.05);
  }

  // The clapper's strike: 30 ms of filtered noise.
  const len = Math.floor(c.sampleRate * 0.03);
  const buffer = c.createBuffer(1, len, c.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
  const noise = c.createBufferSource();
  noise.buffer = buffer;
  const band = c.createBiquadFilter();
  band.type = "bandpass";
  band.frequency.value = fundamental * 4;
  const ng = c.createGain();
  ng.gain.value = 0.25 * level;
  noise.connect(band).connect(ng).connect(master);
  noise.start(t0);
}

/** A light buzz on phones that support it (Android). Silent no-op elsewhere. */
export function haptic(pattern: number | number[]) {
  try {
    // Browsers only allow vibration after the visitor has tapped the page.
    const active = (navigator as Navigator & { userActivation?: { hasBeenActive: boolean } }).userActivation?.hasBeenActive;
    if (active && "vibrate" in navigator) navigator.vibrate(pattern);
  } catch {
    /* unsupported */
  }
}
