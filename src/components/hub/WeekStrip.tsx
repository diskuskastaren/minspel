"use client";
import type { Today } from "@/game-engine/hub";
import s from "./hub.module.css";

const DAY = new Intl.DateTimeFormat("sv-SE", { weekday: "short", timeZone: "UTC" });

/** De senaste sju dagarna + streak. */
export function WeekStrip({ today }: { today: Today }) {
  const { current, best } = today.streak;
  return (
    <div className={s.week}>
      <ol className={s.weekDays} aria-label="Senaste sju dagarna">
        {today.week.map((d) => {
          const label = DAY.format(new Date(`${d.date}T12:00:00Z`)).replace(".", "");
          const isToday = d.date === today.date;
          return (
            <li key={d.date} className={`${s.weekDay} ${d.played ? s.weekPlayed : ""} ${isToday ? s.weekToday : ""}`}>
              <span className={s.weekDot} aria-hidden="true">
                {d.played ? "✓" : ""}
              </span>
              <span className={s.weekLabel}>{isToday ? "idag" : label}</span>
              <span className="visually-hidden">{d.played ? "spelad" : "inte spelad"}</span>
            </li>
          );
        })}
      </ol>
      <p className={s.streak}>
        <span className={s.streakNum}>
          <span className="mono">{current}</span> {current === 1 ? "dag" : "dagar"} i rad{current >= 3 ? " 🔥" : ""}
        </span>
        <span className={s.streakBest}>
          Bästa: <span className="mono">{best}</span>
        </span>
      </p>
    </div>
  );
}
