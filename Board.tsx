"use client";
import { MAX_ATTEMPTS, STEPS, formatSeconds, type Move } from "@/game-engine/oronmask";
import s from "./oronmask.module.css";

const RESULT_LABEL = { correct: "Rätt låt", artist: "Rätt artist, fel låt", wrong: "Fel" } as const;

export function Board({ moves, ongoing }: { moves: Move[]; ongoing: boolean }) {
  return (
    <ol className={s.board} aria-label="Dina försök">
      {Array.from({ length: MAX_ATTEMPTS }, (_, i) => {
        const m = moves[i];
        const current = ongoing && i === moves.length;
        const kind = !m ? (current ? "current" : "empty") : m.kind === "skip" ? "skip" : m.result;
        return (
          <li key={i} className={`${s.row} ${s[`row_${kind}`]}`} style={{ animationDelay: `${i * 40}ms` }}>
            <span className={`${s.rowNum} mono`}>{String(i + 1).padStart(2, "0")}</span>
            <span className={s.rowText}>
              {!m && current && <em>Ditt försök</em>}
              {m?.kind === "skip" && <em>Hoppade över</em>}
              {m?.kind === "guess" && (
                <>
                  <span className={s.rowTitle}>{m.title}</span>
                  <span className={s.rowArtist}>{m.artist}</span>
                  <span className="visually-hidden">{RESULT_LABEL[m.result]}</span>
                </>
              )}
            </span>
            <span className={`${s.rowTime} mono`}>{formatSeconds(STEPS[i])}</span>
          </li>
        );
      })}
    </ol>
  );
}
