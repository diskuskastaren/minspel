"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { GameSlug } from "@/game-engine/hub";
import { Countdown } from "@/components/ui/Countdown";
import { ProgressRing, statusText } from "./GameStatus";
import { useToday } from "./useToday";
import { WeekStrip } from "./WeekStrip";
import s from "./hub.module.css";

const IS_DEV = process.env.NODE_ENV !== "production";

/** Sidomenyns innehåll: dagens spel med status, veckoremsa, nedräkning och länkar. */
export function MenuContent({ current, onNavigate, onFeedback }: { current?: GameSlug; onNavigate: () => void; onFeedback: () => void }) {
  const { today } = useToday();
  const pathname = usePathname();
  return (
    <nav className={s.menu} aria-label="Huvudmeny">
      <Link href="/" className={`display ${s.menuLogo}`} onClick={onNavigate} aria-current={pathname === "/" ? "page" : undefined}>
        Klurig<span aria-hidden="true">.</span>
      </Link>

      <p className={s.menuHeading}>Dagens spel</p>
      <ul className={s.menuGames}>
        {(today?.games ?? []).map((g) => (
          <li key={g.slug}>
            <Link href={g.href} onClick={onNavigate} className={s.menuGame} aria-current={g.slug === current ? "page" : undefined}>
              <ProgressRing done={g.done} total={g.total} />
              <span className={s.menuGameText}>
                <strong className="display">{g.name}</strong>
                <span>{statusText(g)}</span>
              </span>
            </Link>
          </li>
        ))}
        {!today && <li className={s.menuSkeleton} aria-busy="true" />}
      </ul>

      {today && (
        <>
          <WeekStrip today={today} />
          <p className={s.menuCountdown}>
            Nya spel om <Countdown target={Date.now() + today.msUntilNext} />
          </p>
        </>
      )}

      <ul className={s.menuLinks}>
        <li>
          <button type="button" onClick={onFeedback}>
            Tyck till
          </button>
        </li>
        <li>
          <Link href="/om" onClick={onNavigate}>
            Om Klurig
          </Link>
        </li>
        <li>
          <Link href="/integritet" onClick={onNavigate}>
            Integritet
          </Link>
        </li>
        <li>
          <Link href="/villkor" onClick={onNavigate}>
            Villkor
          </Link>
        </li>
        {IS_DEV && (
          <li>
            <Link href="/admin" onClick={onNavigate}>
              Admin (lokalt)
            </Link>
          </li>
        )}
      </ul>
    </nav>
  );
}
