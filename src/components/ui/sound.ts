"use client";
// Korta ljudeffekter som syntetiseras med Web Audio (inga ljudfiler).
// Respekterar inställningen för ljud och volym. Haptik på mobiler som stöder det.
import { getPreferences } from "./preferences";

export type Sfx = "tap" | "flip" | "invalid" | "correct" | "wrong" | "win" | "lose" | "allDone";

type Note = { f: number; at: number; dur: number; type?: OscillatorType; gain?: number };

const SOUNDS: Record<Sfx, Note[]> = {
  tap: [{ f: 520, at: 0, dur: 0.04, type: "triangle", gain: 0.35 }],
  flip: [{ f: 330, at: 0, dur: 0.06, type: "triangle", gain: 0.4 }],
  invalid: [
    { f: 196, at: 0, dur: 0.09, type: "square", gain: 0.18 },
    { f: 165, at: 0.09, dur: 0.12, type: "square", gain: 0.18 },
  ],
  correct: [
    { f: 660, at: 0, dur: 0.1 },
    { f: 880, at: 0.09, dur: 0.16 },
  ],
  wrong: [
    { f: 294, at: 0, dur: 0.14, type: "triangle" },
    { f: 247, at: 0.13, dur: 0.22, type: "triangle" },
  ],
  win: [
    { f: 523, at: 0, dur: 0.12 },
    { f: 659, at: 0.1, dur: 0.12 },
    { f: 784, at: 0.2, dur: 0.12 },
    { f: 1047, at: 0.3, dur: 0.3 },
  ],
  lose: [
    { f: 392, at: 0, dur: 0.18, type: "triangle" },
    { f: 330, at: 0.17, dur: 0.18, type: "triangle" },
    { f: 262, at: 0.34, dur: 0.35, type: "triangle" },
  ],
  allDone: [
    { f: 523, at: 0, dur: 0.1 },
    { f: 659, at: 0.08, dur: 0.1 },
    { f: 784, at: 0.16, dur: 0.1 },
    { f: 1047, at: 0.24, dur: 0.1 },
    { f: 1319, at: 0.32, dur: 0.4 },
  ],
};

const HAPTICS: Partial<Record<Sfx, number | number[]>> = { invalid: [30, 40, 30], wrong: 60, win: [40, 60, 80], lose: 120, allDone: [40, 40, 40, 40, 120] };

let ctx: AudioContext | null = null;

export function playSfx(name: Sfx) {
  if (typeof window === "undefined") return;
  const prefs = getPreferences();
  const pattern = HAPTICS[name];
  if (pattern && "vibrate" in navigator) {
    try {
      navigator.vibrate(pattern);
    } catch {
      /* stöds inte */
    }
  }
  if (!prefs.sound || prefs.volume <= 0) return;
  try {
    ctx ??= new AudioContext();
    if (ctx.state === "suspended") void ctx.resume();
    const t0 = ctx.currentTime + 0.01;
    const master = ctx.createGain();
    master.gain.value = prefs.volume * 0.25;
    master.connect(ctx.destination);
    for (const n of SOUNDS[name]) {
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.type = n.type ?? "sine";
      osc.frequency.value = n.f;
      const start = t0 + n.at;
      g.gain.setValueAtTime(0.0001, start);
      g.gain.exponentialRampToValueAtTime(n.gain ?? 0.5, start + 0.012);
      g.gain.exponentialRampToValueAtTime(0.0001, start + n.dur);
      osc.connect(g).connect(master);
      osc.start(start);
      osc.stop(start + n.dur + 0.02);
    }
  } catch {
    /* Web Audio saknas – tyst */
  }
}
