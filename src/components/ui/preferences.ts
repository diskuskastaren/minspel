"use client";
// Delat inställningslager (useSyncExternalStore) så att en ändring i
// inställningsmodalen syns direkt i alla komponenter och på <html>.
import { useCallback, useEffect, useState, useSyncExternalStore } from "react";
import { DEFAULT_PREFERENCES, PREF_KEYS, type Preferences } from "@/lib/preferences";

const listeners = new Set<() => void>();
let current: Preferences | null = null;

function read(): Preferences {
  const p = { ...DEFAULT_PREFERENCES };
  try {
    const s = localStorage;
    const theme = s.getItem(PREF_KEYS.theme);
    if (theme === "light" || theme === "dark" || theme === "system") p.theme = theme;
    const motion = s.getItem(PREF_KEYS.motion);
    if (motion === "reduce" || motion === "full" || motion === "system") p.motion = motion;
    p.colorblind = s.getItem(PREF_KEYS.colorblind) === "1";
    p.sound = s.getItem(PREF_KEYS.sound) !== "0";
    const vol = Number(s.getItem(PREF_KEYS.volume));
    if (s.getItem(PREF_KEYS.volume) !== null && vol >= 0 && vol <= 1) p.volume = vol;
  } catch {
    /* privat läge – standardval */
  }
  return p;
}

function persist(p: Preferences) {
  try {
    const s = localStorage;
    s.setItem(PREF_KEYS.theme, p.theme);
    s.setItem(PREF_KEYS.motion, p.motion);
    if (p.colorblind) s.setItem(PREF_KEYS.colorblind, "1");
    else s.removeItem(PREF_KEYS.colorblind);
    s.setItem(PREF_KEYS.sound, p.sound ? "1" : "0");
    s.setItem(PREF_KEYS.volume, String(p.volume));
  } catch {
    /* gäller bara den här sidvisningen */
  }
}

const media = (q: string) => typeof window !== "undefined" && window.matchMedia(q).matches;

/** Samma logik som inline-skriptet, för ändringar efter att sidan laddats. */
export function applyPreferences(p: Preferences) {
  const d = document.documentElement;
  const dark = p.theme === "dark" || (p.theme === "system" && media("(prefers-color-scheme: dark)"));
  d.setAttribute("data-theme", dark ? "dark" : "light");
  const reduce = p.motion === "reduce" || (p.motion === "system" && media("(prefers-reduced-motion: reduce)"));
  d.setAttribute("data-motion", reduce ? "reduce" : "full");
  d.classList.toggle("cb", p.colorblind);
}

export function getPreferences(): Preferences {
  if (typeof window === "undefined") return DEFAULT_PREFERENCES;
  if (!current) current = read();
  return current;
}

export function setPreferences(patch: Partial<Preferences>) {
  current = { ...getPreferences(), ...patch };
  persist(current);
  applyPreferences(current);
  listeners.forEach((l) => l());
}

function subscribe(l: () => void) {
  listeners.add(l);
  // Följ systemets tema och rörelseinställning när valet är "system".
  const mqs = ["(prefers-color-scheme: dark)", "(prefers-reduced-motion: reduce)"].map((q) => window.matchMedia(q));
  const onChange = () => applyPreferences(getPreferences());
  mqs.forEach((m) => m.addEventListener("change", onChange));
  return () => {
    listeners.delete(l);
    mqs.forEach((m) => m.removeEventListener("change", onChange));
  };
}

export function usePreferences(): [Preferences, (patch: Partial<Preferences>) => void] {
  const prefs = useSyncExternalStore(subscribe, getPreferences, () => DEFAULT_PREFERENCES);
  return [prefs, setPreferences];
}

/** Ett spelspecifikt av/på-val i localStorage (t.ex. Ordets svåra läge). */
export function useFlag(key: string): [boolean, (on: boolean) => void] {
  const [on, setOn] = useState(false);
  useEffect(() => {
    try {
      setOn(localStorage.getItem(key) === "1");
    } catch {
      /* privat läge */
    }
  }, [key]);
  const set = useCallback(
    (next: boolean) => {
      try {
        if (next) localStorage.setItem(key, "1");
        else localStorage.removeItem(key);
      } catch {
        /* gäller bara den här sidvisningen */
      }
      setOn(next);
    },
    [key],
  );
  return [on, set];
}

/** Färgblindläge (blå/orange i stället för grön/gul), t.ex. för delningstexten. */
export function useColorblind(): [boolean, (on: boolean) => void] {
  const [prefs, set] = usePreferences();
  return [prefs.colorblind, (on) => set({ colorblind: on })];
}
