"use client";
import type { HubGame } from "@/game-engine/hub";
import s from "./hub.module.css";

/** Liten ring som visar hur många delpussel som är klara idag. */
export function ProgressRing({ done, total, size = 34 }: { done: number; total: number; size?: number }) {
  const r = size / 2 - 3;
  const c = 2 * Math.PI * r;
  const finished = done >= total;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className={s.ring} aria-hidden="true">
      <circle cx={size / 2} cy={size / 2} r={r} className={s.ringTrack} />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        className={finished ? s.ringDone : s.ringValue}
        strokeDasharray={c}
        strokeDashoffset={c * (1 - Math.min(1, done / total))}
        transform={`rotate(-90 ${size / 2} ${size / 2})`}
      />
      {finished && (
        <path d={`M${size * 0.32} ${size * 0.52} l${size * 0.12} ${size * 0.12} l${size * 0.24} -${size * 0.26}`} className={s.ringCheck} />
      )}
    </svg>
  );
}

export function statusText(g: HubGame): string {
  if (g.finished) return `Klar${g.detail ? ` · ${g.detail}` : ""}`;
  if (g.started || g.done > 0) return `Pågår · ${g.done}/${g.total}`;
  return "Ej påbörjad";
}
