"use client";
import { createContext, useContext, useEffect, useState } from "react";
import type { GameSlug, Today } from "@/game-engine/hub";
import { ProgressRing, statusText } from "@/components/hub/GameStatus";
import { useToday } from "@/components/hub/useToday";
import { WeekStrip } from "@/components/hub/WeekStrip";
import { Countdown } from "@/components/ui/Countdown";
import s from "@/app/home.module.css";

const TodayContext = createContext<Today | null>(null);

/** Hämtar dagens läge en gång och delar det med startsidans kort. */
export function TodayProvider({ children }: { children: React.ReactNode }) {
  const { today, refresh } = useToday();
  // Uppdatera när man kommer tillbaka till fliken (t.ex. efter att ha spelat i en annan).
  useEffect(() => {
    const onVisible = () => document.visibilityState === "visible" && void refresh();
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, [refresh]);
  return <TodayContext.Provider value={today}>{children}</TodayContext.Provider>;
}

const useTodayData = () => useContext(TodayContext);

function greeting(hour: number) {
  if (hour < 5) return "God natt";
  if (hour < 10) return "God morgon";
  if (hour < 18) return "Hej";
  return "God kväll";
}

const DATE = new Intl.DateTimeFormat("sv-SE", { weekday: "long", day: "numeric", month: "long", timeZone: "Europe/Stockholm" });
const HOUR = new Intl.DateTimeFormat("sv-SE", { hour: "numeric", hourCycle: "h23", timeZone: "Europe/Stockholm" });

/** Hälsning och datum räknas i webbläsaren (sidan är förrenderad). */
export function Greeting() {
  const [now, setNow] = useState<Date | null>(null);
  useEffect(() => setNow(new Date()), []);
  return (
    <p className={s.date} suppressHydrationWarning>
      {now ? `${greeting(Number(HOUR.format(now)))} · ${DATE.format(now)}` : " "}
    </p>
  );
}

/** "1 av 3 spel klara idag · nya om 05:48:53" */
export function DaySummaryLine() {
  const today = useTodayData();
  const done = today?.games.filter((g) => g.finished).length ?? 0;
  return (
    <>
      <p className={s.lede}>
        {today ? (
          <>
            <strong>
              {done} av {today.games.length}
            </strong>{" "}
            spel klara idag · nya om <Countdown target={Date.now() + today.msUntilNext} />
          </>
        ) : (
          "Dagens spel på svenska. Nya varje midnatt."
        )}
      </p>
    </>
  );
}

/** Status i ett spelkort: ring + "Pågår · 2/6" / "Klar · 4/5 rätt". */
export function CardStatus({ slug }: { slug: GameSlug }) {
  const today = useTodayData();
  const g = today?.games.find((x) => x.slug === slug);
  return (
    <span className={s.progress}>
      {g ? (
        <>
          <ProgressRing done={g.done} total={g.total} size={26} />
          <span>{statusText(g)}</span>
        </>
      ) : (
        <span className={s.progressPlaceholder} />
      )}
    </span>
  );
}

export function WeekCard() {
  const today = useTodayData();
  if (!today) return <section className={`${s.weekCard} ${s.weekCardLoading}`} aria-hidden="true" />;
  return (
    <section className={s.weekCard} aria-label="Din vecka">
      <h2 className={s.sectionTitle}>Din vecka</h2>
      <WeekStrip today={today} />
    </section>
  );
}

const CONFETTI = ["var(--saffron)", "var(--lingon)", "var(--pine)", "var(--ink)"];

/** Firande när dagens alla spel är klara (konfetti visas en gång per dag). */
export function Celebration() {
  const today = useTodayData();
  const [confetti, setConfetti] = useState(false);
  useEffect(() => {
    if (!today?.allDone) return;
    try {
      const key = `klurig:firat:${today.date}`;
      if (!localStorage.getItem(key)) {
        localStorage.setItem(key, "1");
        setConfetti(true);
      }
    } catch {
      /* privat läge – inget konfetti */
    }
  }, [today]);
  if (!today?.allDone) return null;
  return (
    <section className={s.celebrate} aria-live="polite">
      <p className={`display ${s.celebrateTitle}`}>Du har klarat allt idag!</p>
      <p>
        {today.streak.current > 1 ? `Streak: ${today.streak.current} dagar 🔥` : "Kom tillbaka i morgon för nya spel."}
      </p>
      {confetti && (
        <span className={s.confetti} aria-hidden="true">
          {Array.from({ length: 36 }, (_, i) => (
            <i
              key={i}
              style={{
                left: `${(i * 37) % 100}%`,
                background: CONFETTI[i % CONFETTI.length],
                animationDelay: `${(i % 9) * 60}ms`,
                ["--drift" as string]: `${((i * 53) % 80) - 40}px`,
                ["--spin" as string]: `${(i * 97) % 720}deg`,
              }}
            />
          ))}
        </span>
      )}
    </section>
  );
}
