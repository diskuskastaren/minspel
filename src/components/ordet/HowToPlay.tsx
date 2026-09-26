"use client";
import { MAX_GUESSES, type LetterScore } from "@/game-engine/ordet";
import u from "@/components/ui/ui.module.css";
import s from "./ordet.module.css";

function Example({ word, marks }: { word: string; marks: Partial<Record<number, LetterScore>> }) {
  return (
    <span className={s.example} aria-hidden="true">
      {[...word].map((ch, i) => (
        <span key={i} className={`${s.tile} ${s.tileSmall} ${marks[i] ? s[`tile_${marks[i]}`] : s.tile_filled}`}>
          {ch.toUpperCase()}
        </span>
      ))}
    </span>
  );
}

export function HowToPlay() {
  return (
    <div>
      <p className={u.eyebrow}>Så spelar du</p>
      <h2 className={`display ${u.htpTitle}`}>Gissa dagens ord</h2>
      <ol className={u.htpSteps}>
        <li>
          <span>
            Du har <strong>{MAX_GUESSES} försök</strong>. Varje gissning måste vara ett riktigt ord med rätt antal bokstäver –
            böjda former som <em>hunden</em> och <em>sprang</em> går bra.
          </span>
        </li>
        <li>
          <span>Efter varje gissning visar färgerna hur nära du är.</span>
        </li>
        <li>
          <span>
            Välj <strong>3 till 8 bokstäver</strong> – sex nya ord varje dag.
          </span>
        </li>
      </ol>
      <div className={s.examples}>
        <div>
          <Example word="stuga" marks={{ 0: "correct" }} />
          <p>
            <strong>S</strong> finns i ordet och står på rätt plats.
          </p>
        </div>
        <div>
          <Example word="kaffe" marks={{ 1: "present" }} />
          <p>
            <strong>A</strong> finns i ordet men på en annan plats.
          </p>
        </div>
        <div>
          <Example word="björk" marks={{ 2: "absent" }} />
          <p>
            <strong>Ö</strong> finns inte i ordet.
          </p>
        </div>
      </div>
      <p className={u.htpFoot}>
        <strong>Svårt läge</strong> (i inställningarna): allt du fått veta måste användas i nästa gissning. Nya ord vid midnatt.
      </p>
    </div>
  );
}
