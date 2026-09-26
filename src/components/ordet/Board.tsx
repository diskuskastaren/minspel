"use client";
import { MAX_GUESSES, type LetterScore, type Row } from "@/game-engine/ordet";
import s from "./ordet.module.css";

const LABEL: Record<LetterScore, string> = { correct: "rätt plats", present: "fel plats", absent: "finns inte" };

export function describeRow(row: Row): string {
  return `${row.word.toUpperCase()}: ${[...row.word].map((ch, i) => `${ch.toUpperCase()} ${LABEL[row.scores[i]]}`).join(", ")}`;
}

type Props = {
  length: number;
  rows: Row[];
  draft: string;
  ongoing: boolean;
  /** Raden som just vänds (animeras bokstav för bokstav). */
  revealRow: number | null;
  /** Byts för att skaka den aktuella raden (ogiltig gissning). */
  shakeKey: number;
  bounceRow: number | null;
};

export function Board({ length, rows, draft, ongoing, revealRow, shakeKey, bounceRow }: Props) {
  const current = ongoing ? rows.length : -1;
  return (
    <div className={s.board} style={{ "--len": length } as React.CSSProperties} role="group" aria-label="Spelplan">
      {Array.from({ length: MAX_GUESSES }, (_, r) => {
        const row = rows[r];
        const letters = row ? [...row.word] : r === current ? [...draft] : [];
        const isCurrent = r === current;
        return (
          <div
            key={isCurrent ? `cur-${shakeKey}` : r}
            className={`${s.row} ${isCurrent && shakeKey > 0 ? s.shake : ""}`}
            aria-label={row ? `Gissning ${r + 1}: ${describeRow(row)}` : isCurrent ? `Gissning ${r + 1}: ${draft.toUpperCase() || "tom"}` : undefined}
            role={row || isCurrent ? "img" : undefined}
          >
            {Array.from({ length }, (_, i) => {
              const ch = letters[i];
              const score = row?.scores[i];
              const state = score ?? (ch ? "filled" : "empty");
              const cls = [
                s.tile,
                s[`tile_${state}`],
                row && revealRow === r ? s.reveal : "",
                row && bounceRow === r ? s.bounce : "",
                !row && ch && isCurrent && i === letters.length - 1 ? s.typed : "",
              ].join(" ");
              return (
                <span key={i} className={cls} style={{ "--i": i } as React.CSSProperties} aria-hidden="true">
                  {ch?.toUpperCase()}
                </span>
              );
            })}
          </div>
        );
      })}
    </div>
  );
}
