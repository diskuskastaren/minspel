"use client";
import { matchingPrefix, spellingDiff } from "@/game-engine/rattstavat";
import type { RoundResult } from "@/game-engine/rattstavat-api-types";
import s from "./rattstavat.module.css";

/** Hur många brickor avslöjandet visar totalt (stannar vid första felet). */
export function revealLength(result: Pick<RoundResult, "input" | "word" | "correct">): number {
  if (result.correct) return [...result.input].length;
  return matchingPrefix(result.input, result.word) + 1;
}

/**
 * Spelarens stavning, bokstav för bokstav: grönt tills första avvikelsen, som
 * markeras rött. Är svaret för kort visas en tom röd bricka där det tar slut.
 */
export function RevealTiles({ result, shown }: { result: RoundResult; shown: number }) {
  const letters = [...result.input];
  const prefix = matchingPrefix(result.input, result.word);
  const tiles = result.correct ? letters : [...letters.slice(0, prefix + 1)];
  if (!result.correct && prefix >= letters.length) tiles.push(" ");
  const rest = result.correct ? [] : letters.slice(prefix + 1);
  return (
    <p className={s.reveal} aria-label={`Du skrev ${result.input.toUpperCase()}`}>
      {tiles.slice(0, shown).map((ch, i) => (
        <span key={i} className={`${s.tile} ${i < prefix || result.correct ? s.tileGood : s.tileBad}`} aria-hidden="true">
          {ch.toUpperCase()}
        </span>
      ))}
      {shown >= tiles.length &&
        rest.map((ch, i) => (
          <span key={`r${i}`} className={`${s.tile} ${s.tileRest}`} aria-hidden="true">
            {ch.toUpperCase()}
          </span>
        ))}
    </p>
  );
}

/** Rätt stavning med skillnaden mot spelarens markerad. */
export function Diff({ input, word }: { input: string; word: string }) {
  const parts = spellingDiff(input, word);
  const kinds = new Set(parts.map((p) => p.kind));
  return (
    <>
      <p className={s.diff} aria-label={`Rätt stavning: ${word.toUpperCase()}`}>
        {parts.map((p, i) =>
          p.kind === "same" ? (
            <span key={i} aria-hidden="true">
              {p.ch}
            </span>
          ) : p.kind === "extra" ? (
            <del key={i} className={s.diffExtra} aria-hidden="true" title={`Ta bort ${p.got}`}>
              {p.got}
            </del>
          ) : (
            <mark key={i} className={p.kind === "wrong" ? s.diffWrong : s.diffMissing} aria-hidden="true" title={p.kind === "wrong" ? `${p.got} → ${p.ch}` : `Saknas: ${p.ch}`}>
              {p.ch}
            </mark>
          ),
        )}
      </p>
      <p className={s.legend}>
        {kinds.has("missing") && (
          <>
            <mark className={s.diffMissing}>saknades</mark>{" "}
          </>
        )}
        {kinds.has("wrong") && (
          <>
            <mark className={s.diffWrong}>fel bokstav</mark>{" "}
          </>
        )}
        {kinds.has("extra") && <del className={s.diffExtra}>för mycket</del>}
      </p>
    </>
  );
}
