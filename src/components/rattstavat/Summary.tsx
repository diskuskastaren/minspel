"use client";
import Link from "next/link";
import { ROUNDS } from "@/game-engine/rattstavat";
import type { GameState } from "@/game-engine/rattstavat-api-types";
import { Countdown } from "@/components/ui/Countdown";
import u from "@/components/ui/ui.module.css";
import s from "./rattstavat.module.css";

const TITLES = ["Nästa gång!", "En i boken", "Bra början", "Godkänt!", "Nästan felfritt!", "Felfritt! 🐝"];

type Props = { data: GameState; onShare: () => void; onReview: (round: number) => void; countdownTarget: number };

export function Summary({ data, onShare, onReview, countdownTarget }: Props) {
  const { stats } = data;
  const rate = stats.words ? Math.round((stats.correct / stats.words) * 100) : 0;
  const max = Math.max(1, ...stats.distribution);
  return (
    <div className={u.result}>
      <p className={u.eyebrow}>Rättstavat #{data.number}</p>
      <h2 className={`display ${u.resultTitle} ${data.score >= 3 ? u.resultWon : u.resultLost}`}>{TITLES[data.score]}</h2>
      <p className={u.resultSub}>
        Du stavade <strong>{data.score}</strong> av {ROUNDS} ord rätt.
      </p>

      <ol className={s.summaryList}>
        {data.rounds.map((r) => {
          const res = r.result!;
          const pct = res.daily.answered ? Math.round((res.daily.correct / res.daily.answered) * 100) : 0;
          return (
            <li key={r.index}>
              <button type="button" onClick={() => onReview(r.index)} className={s.summaryRow}>
                <span className={res.correct ? s.markGood : s.markBad} aria-label={res.correct ? "rätt" : "fel"}>
                  {res.correct ? "✓" : "✕"}
                </span>
                <span className={s.summaryWord}>{res.word}</span>
                <span className={s.summaryPct}>
                  <span className="mono">{pct} %</span> klarade det
                </span>
              </button>
            </li>
          );
        })}
      </ol>

      <div className={u.actions}>
        <button type="button" className={u.btnGhost} onClick={onShare}>
          Dela resultat
        </button>
        <Link href="/ordet" className={`${u.btnPrimary} ${s.linkBtn}`}>
          Spela Ordet →
        </Link>
      </div>

      <section className={u.stats} aria-label="Din statistik">
        <dl className={u.statGrid}>
          <div>
            <dt>Spelade</dt>
            <dd className="mono">{stats.played}</dd>
          </div>
          <div>
            <dt>Rätt</dt>
            <dd className="mono">{rate}%</dd>
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
        <div className={u.dist}>
          {[...stats.distribution].reverse().map((n, ri) => {
            const i = ROUNDS - ri;
            return (
              <div key={i} className={u.distRow}>
                <span className="mono">{i}</span>
                <span className={u.distTrack}>
                  <span
                    className={`${u.distBar} ${i === data.score ? (data.score >= 3 ? u.distBarWon : u.distBarLost) : ""}`}
                    style={{ width: `${Math.max(6, (n / max) * 100)}%` }}
                  >
                    <span className="mono">{n}</span>
                  </span>
                </span>
              </div>
            );
          })}
        </div>
      </section>

      {!data.isArchive && (
        <p className={u.next}>
          Nya ord om <Countdown target={countdownTarget} />
        </p>
      )}
    </div>
  );
}
