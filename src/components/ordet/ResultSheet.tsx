"use client";
import { useState } from "react";
import { MAX_GUESSES, percentileBeaten, rowEmoji, type DailyStats, type Stats } from "@/game-engine/ordet";
import type { PublicSession } from "@/game-engine/ordet-api-types";
import { Countdown } from "@/components/ui/Countdown";
import u from "@/components/ui/ui.module.css";
import s from "./ordet.module.css";

type Props = {
  session: PublicSession;
  number: number;
  stats: Stats;
  daily: DailyStats | null;
  colorblind: boolean;
  nextLabel: string | null;
  onNext: () => void;
  onShare: () => void;
  countdownTarget: number;
  isArchive: boolean;
};

export const WIN_LINES = ["Geni!", "Klockrent!", "Snyggt!", "Där satt den!", "Bra kämpat!", "Puh – i sista stund!"];

function Distribution({ values, highlight, won }: { values: number[]; highlight: number; won: boolean }) {
  const max = Math.max(1, ...values);
  return (
    <div className={u.dist}>
      {values.map((n, i) => (
        <div key={i} className={u.distRow}>
          <span className="mono">{i === MAX_GUESSES ? "✕" : i + 1}</span>
          <span className={u.distTrack}>
            <span
              className={`${u.distBar} ${i === highlight ? (won ? u.distBarWon : u.distBarLost) : ""}`}
              style={{ width: `${Math.max(6, (n / max) * 100)}%` }}
            >
              <span className="mono">{n}</span>
            </span>
          </span>
        </div>
      ))}
    </div>
  );
}

export function ResultSheet({ session, number, stats, daily, colorblind, nextLabel, onNext, onShare, countdownTarget, isArchive }: Props) {
  const [tab, setTab] = useState<"idag" | "totalt">("idag");
  const won = session.state === "won";
  const tries = session.rows.length;
  const highlight = won ? tries - 1 : MAX_GUESSES;
  const winPct = stats.played ? Math.round((stats.won / stats.played) * 100) : 0;
  const beaten = daily ? percentileBeaten(daily, session) : null;

  return (
    <div className={u.result}>
      <p className={u.eyebrow}>
        Ordet #{number} · {session.length} bokstäver{session.hard ? " · svårt läge" : ""}
      </p>
      <h2 className={`display ${u.resultTitle} ${won ? u.resultWon : u.resultLost}`}>
        {won ? WIN_LINES[tries - 1] : "Nära skjuter ingen hare"}
      </h2>
      <p className={u.resultSub}>{won ? `Du hittade ordet på ${tries} av ${MAX_GUESSES} försök.` : "Ordet var:"}</p>

      {session.answer && (
        <div className={s.answer} aria-label={`Ordet var ${session.answer.toUpperCase()}`}>
          {[...session.answer].map((ch, i) => (
            <span key={i} className={`${s.tile} ${s.tileSmall} ${won ? s.tile_correct : s.tile_filled}`} aria-hidden="true">
              {ch.toUpperCase()}
            </span>
          ))}
        </div>
      )}

      <p className={s.emojiGrid} aria-hidden="true">
        {session.rows.map((r) => rowEmoji(r.scores, colorblind)).join("\n")}
      </p>

      <div className={u.actions}>
        <button type="button" className={u.btnGhost} onClick={onShare}>
          Dela resultat
        </button>
        {nextLabel && (
          <button type="button" className={u.btnPrimary} onClick={onNext}>
            {nextLabel} →
          </button>
        )}
      </div>

      <section className={u.stats} aria-label="Statistik">
        <div className={s.segment} role="tablist" aria-label="Statistik">
          {(["idag", "totalt"] as const).map((t) => (
            <button key={t} type="button" role="tab" aria-selected={tab === t} className={tab === t ? s.segmentActive : ""} onClick={() => setTab(t)}>
              {t === "idag" ? "Idag" : "Totalt"}
            </button>
          ))}
        </div>

        {tab === "idag" ? (
          <div role="tabpanel" className={s.todayPanel}>
            {beaten !== null && (
              <p className={s.beaten}>
                Du löste den snabbare än <strong className="mono">{beaten} %</strong> av spelarna idag.
              </p>
            )}
            {daily?.distribution ? (
              <Distribution values={daily.distribution} highlight={highlight} won={won} />
            ) : (
              <p className={s.muted}>
                <span className="mono">{daily?.finished ?? 0}</span> spelare har klarat {session.length} bokstäver idag.
                Fördelningen visas när minst 30 har spelat klart.
              </p>
            )}
          </div>
        ) : (
          <div role="tabpanel">
            <dl className={u.statGrid}>
              <div>
                <dt>Spelade</dt>
                <dd className="mono">{stats.played}</dd>
              </div>
              <div>
                <dt>Vinst</dt>
                <dd className="mono">{winPct}%</dd>
              </div>
              <div>
                <dt>Streak</dt>
                <dd className="mono">{stats.currentStreak}</dd>
              </div>
              <div>
                <dt>Bästa</dt>
                <dd className="mono">{stats.bestStreak}</dd>
              </div>
            </dl>
            <Distribution values={stats.distribution} highlight={highlight} won={won} />
          </div>
        )}
      </section>

      {!isArchive && (
        <p className={u.next}>
          Nya ord om <Countdown target={countdownTarget} />
        </p>
      )}
    </div>
  );
}
