// Visningsinställningar som sparas i webbläsaren och gäller alla spel.
// Filen importerar inget och används både av inline-skriptet i layout.tsx
// (före första renderingen) och av klientkomponenterna.

export type ThemePref = "system" | "light" | "dark";
export type MotionPref = "system" | "reduce" | "full";

export type Preferences = {
  theme: ThemePref;
  motion: MotionPref;
  colorblind: boolean;
  sound: boolean;
  /** 0–1 */
  volume: number;
};

export const DEFAULT_PREFERENCES: Preferences = { theme: "system", motion: "system", colorblind: false, sound: true, volume: 0.5 };

export const PREF_KEYS = {
  theme: "klurig:tema",
  motion: "klurig:rorelse",
  colorblind: "klurig:fargblind",
  sound: "klurig:ljud",
  volume: "klurig:volym",
} as const;

/**
 * Körs synkront i <head> innan sidan ritas: sätter data-theme, data-motion och
 * klassen .cb på <html> utifrån sparade val och systemets inställningar.
 */
export const PREFERENCES_SCRIPT = `(function(){var d=document.documentElement,g=function(k){try{return localStorage.getItem(k)}catch(e){return null}},q=function(m){try{return matchMedia(m).matches}catch(e){return false}};var t=g(${JSON.stringify(PREF_KEYS.theme)})||"system",m=g(${JSON.stringify(PREF_KEYS.motion)})||"system";d.setAttribute("data-theme",t==="dark"||(t==="system"&&q("(prefers-color-scheme: dark)"))?"dark":"light");d.setAttribute("data-motion",m==="reduce"||(m==="system"&&q("(prefers-reduced-motion: reduce)"))?"reduce":"full");if(g(${JSON.stringify(PREF_KEYS.colorblind)})==="1")d.classList.add("cb")})()`;
