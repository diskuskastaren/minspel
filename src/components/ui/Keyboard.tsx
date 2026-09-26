"use client";
import type { LetterScore } from "@/game-engine/ordet";
import s from "./ui.module.css";

// Svensk layout med Å Ä Ö där de sitter på ett vanligt svenskt tangentbord.
const ROWS = ["qwertyuiopå", "asdfghjklöä", "⏎zxcvbnm⌫"];
const LABEL: Record<LetterScore, string> = { correct: "rätt plats", present: "fel plats", absent: "finns inte" };

type Props = {
  /** Färg per bokstav (Ordet). Tomt = neutrala tangenter. */
  state?: Record<string, LetterScore>;
  onKey: (key: string) => void;
  disabled: boolean;
  /** Text på Enter-tangenten. */
  enterLabel?: string;
};

export function Keyboard({ state = {}, onKey, disabled, enterLabel = "Gissa" }: Props) {
  return (
    <div className={s.keyboard} role="group" aria-label="Tangentbord">
      {ROWS.map((row) => (
        <div key={row} className={s.keyRow}>
          {[...row].map((k) => {
            const special = k === "⏎" ? "Enter" : k === "⌫" ? "Backspace" : null;
            const st = special ? undefined : state[k];
            const label = special === "Enter" ? enterLabel : special === "Backspace" ? "Radera" : `${k.toUpperCase()}${st ? `, ${LABEL[st]}` : ""}`;
            return (
              <button
                key={k}
                type="button"
                data-game-key
                className={`${s.key} ${special ? s.keyWide : ""} ${st ? s[`key_${st}`] : ""}`}
                aria-label={label}
                disabled={disabled}
                onClick={() => onKey(special ?? k)}
              >
                {special === "Enter" ? enterLabel : special === "Backspace" ? <span aria-hidden="true">⌫</span> : k.toUpperCase()}
              </button>
            );
          })}
        </div>
      ))}
    </div>
  );
}
