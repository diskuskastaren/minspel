"use client";
import { MAX_ATTEMPTS, STEPS, formatSeconds, moveEmoji, type Stats } from "@/game-engine/oronmask";
import type { PublicSession } from "@/game-engine/oronmask-api-types";
import { Countdown } from "./Countdown";
import type { PlayerStatus } from "./useClipPlayer";
import s from "./oronmask.module.css";

type Props = {
  session: PublicSession;
  categoryName: string;
  number: number;
  stats: Stats;
  nextLabel: string | null;
  onNext: () => void;
  onShare: () => void;
  countdownTarget: number;
  isArchive: boolean;
  preview: { status: PlayerStatus; active: boolean; position: number; toggle: () => void };
};

const WIN_LINES = ["Direkt i örat!", "Klockrent!", "Snyggt lyssnat!", "Där satt den!", "Nära ögat – men rätt!", "I sista sekund!"];

export function ResultSheet({ session, categoryName, number, stats, nextLabel, onNext, onShare, countdownTarget, isArchive, preview }: Props) {
  const won = session.state === "won";
  const a = session.answer;
  const tries = session.moves.length;
  const maxDist = Math.max(1, ...stats.distribution);
  const highlight = won ? tries - 1 : MAX_ATTEMPTS;
  const winPct = stats.played ? Math.round((stats.won / stats.played) * 100) : 0;
  const playing = preview.active && preview.status === "playing";

  return (
    <div className={s.result}>
      <p className={s.eyebrow}>
        Öronmask #{number} · {categoryName}
      </p>
      <h2 className={`display ${s.resultTitle} ${won ? s.resultWon : s.resultLost}`}>
        {won ? WIN_LINES[tries - 1] : "Den här gick dig förbi"}
      </h2>
      <p className={s.resultSub}>
        {won ? `Du kände igen den efter ${formatSeconds(STEPS[tries - 1])}.` : "Låten var:"}
      </p>

      {a && (
        <div className={s.sleeve}>
          <div className={s.sleeveArt}>
            {a.cover ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={a.cover} alt={`Omslag: ${a.title}`} width={240} height={240} />
            ) : (
              <span className={s.sleeveArtFallback} aria-hidden="true">♪</span>
            )}
            {a.previewUrl && (
              <button type="button" className={s.sleevePlay} onClick={preview.toggle} aria-label={playing ? "Pausa låten" : "Spela låten"}>
                {playing ? "❚❚" : "▶"}
              </button>
            )}
            {playing && <span className={s.sleeveProgress} style={{ width: `${(preview.position / 30) * 100}%` }} />}
          </div>
          <div className={s.sleeveMeta}>
            <strong className={`display ${s.sleeveTitle}`}>{a.title}</strong>
            <span>{a.artist}</span>
            {a.year && <span className={`mono ${s.sleeveYear}`}>{a.year}</span>}
            <div className={s.links}>
              <a href={a.spotifyUrl} target="_blank" rel="noreferrer">
                Spotify ↗
              </a>
              <a href={a.deezerLink} target="_blank" rel="noreferrer">
                Deezer ↗
              </a>
            </div>
          </div>
        </div>
      )}

      <p className={s.emojiRow} aria-label="Dina försök">
        {Array.from({ length: MAX_ATTEMPTS }, (_, i) => moveEmoji(session.moves[i])).join(" ")}
      </p>

      <div className={s.actions}>
        <button type="button" className={s.btnGhost} onClick={onShare}>
          Dela resultat
        </button>
        {nextLabel && (
          <button type="button" className={s.btnPrimary} onClick={onNext}>
            {nextLabel} →
          </button>
        )}
      </div>

      <section className={s.stats} aria-label={`Din statistik för ${categoryName}`}>
        <dl className={s.statGrid}>
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
        <div className={s.dist}>
          {stats.distribution.map((n, i) => (
            <div key={i} className={s.distRow}>
              <span className="mono">{i === MAX_ATTEMPTS ? "✕" : i + 1}</span>
              <span className={s.distTrack}>
                <span
                  className={`${s.distBar} ${i === highlight ? (won ? s.distBarWon : s.distBarLost) : ""}`}
                  style={{ width: `${Math.max(6, (n / maxDist) * 100)}%` }}
                >
                  <span className="mono">{n}</span>
                </span>
              </span>
            </div>
          ))}
        </div>
      </section>

      {!isArchive && (
        <p className={s.next}>
          Nya låtar om <Countdown target={countdownTarget} />
        </p>
      )}
    </div>
  );
}
