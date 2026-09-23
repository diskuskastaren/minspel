"use client";
import { useMemo } from "react";
import { STEPS, formatSeconds } from "@/game-engine/oronmask";
import s from "./oronmask.module.css";

const MAX = STEPS[STEPS.length - 1];
const BARS = 64;
// Kvadratrotsskala: de korta första stegen (0,5 s, 1 s) blir synliga.
const pos = (t: number) => Math.sqrt(Math.min(Math.max(t, 0), MAX) / MAX);
const timeAt = (x: number) => MAX * x * x;

function seeded(seed: string) {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) h = Math.imul(h ^ seed.charCodeAt(i), 16777619);
  return () => {
    h = Math.imul(h ^ (h >>> 13), 0x5bd1e995);
    h ^= h >>> 15;
    return ((h >>> 0) % 1000) / 1000;
  };
}

type Props = {
  seed: string;
  unlocked: number;
  position: number;
  playing: boolean;
  finished: boolean;
};

export function Timeline({ seed, unlocked, position, playing, finished }: Props) {
  // Dekorativ "ljudvåg" – samma form för samma låt och dag, avslöjar inget.
  const heights = useMemo(() => {
    const r = seeded(seed);
    let prev = 0.5;
    return Array.from({ length: BARS }, (_, i) => {
      const env = 0.55 + 0.45 * Math.sin((i / BARS) * Math.PI * 1.3 + 0.4);
      prev = prev * 0.45 + r() * 0.55;
      return Math.max(0.12, Math.min(1, env * (0.35 + prev * 0.9)));
    });
  }, [seed]);

  const limit = finished ? MAX : unlocked;
  const label = finished ? "Hela klippet" : formatSeconds(unlocked);

  return (
    <div className={s.timeline} aria-hidden="false">
      <div className={s.timelineHead}>
        <span className={s.timelineLabel}>
          Upplåst <strong className="mono">{label}</strong>
        </span>
        <span className={`${s.timelineNow} mono`}>{playing ? formatSeconds(Math.floor(position * 10) / 10) : " "}</span>
      </div>
      <div className={s.wave} role="img" aria-label={`Tidslinje. ${label} upplåst av ${formatSeconds(MAX)}.`}>
        {heights.map((h, i) => {
          const t = timeAt((i + 0.5) / BARS);
          const open = t <= limit;
          const heard = playing && t <= position;
          return (
            <span
              key={i}
              className={`${s.bar} ${open ? s.barOpen : ""} ${heard ? s.barHeard : ""}`}
              style={{ height: `${h * 100}%`, transitionDelay: open ? `${i * 6}ms` : "0ms" }}
            />
          );
        })}
        {STEPS.map((step, i) => (
          <span
            key={step}
            className={`${s.tick} ${step <= limit ? s.tickOpen : ""}`}
            style={{ left: `${pos(step) * 100}%` }}
            data-last={i === STEPS.length - 1 ? "" : undefined}
          />
        ))}
        {playing && <span className={s.playhead} style={{ left: `${pos(position) * 100}%` }} />}
      </div>
      <div className={s.tickLabels} aria-hidden="true">
        {STEPS.map((step) => (
          <span key={step} className={`mono ${step <= limit ? s.tickLabelOpen : ""}`} style={{ left: `${pos(step) * 100}%` }}>
            {String(step).replace(".", ",")}
          </span>
        ))}
      </div>
    </div>
  );
}
