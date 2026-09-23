"use client";
import { STEPS, formatSeconds } from "@/game-engine/oronmask";
import s from "./oronmask.module.css";

export function HowToPlay() {
  return (
    <div className={s.htp}>
      <p className={s.eyebrow}>Så spelar du</p>
      <h2 className={`display ${s.htpTitle}`}>Känner du igen låten?</h2>
      <ol className={s.htpSteps}>
        <li>
          <span>
            <strong>Lyssna</strong> på ett kort klipp. Första gången får du bara {formatSeconds(STEPS[0])}.
          </span>
        </li>
        <li>
          <span>
            <strong>Sök och gissa</strong> på låten. Ingen aning? Hoppa över så får du höra mer.
          </span>
        </li>
        <li>
          <span>
            Varje fel eller överhoppning låser upp mer: {STEPS.map((x) => String(x).replace(".", ",")).join(" → ")} sekunder.
            Du har sex försök.
          </span>
        </li>
      </ol>
      <ul className={s.htpLegend}>
        <li>
          <span className={`${s.chip} ${s.chipGood}`} /> Rätt låt
        </li>
        <li>
          <span className={`${s.chip} ${s.chipHalf}`} /> Rätt artist, fel låt
        </li>
        <li>
          <span className={`${s.chip} ${s.chipBad}`} /> Fel
        </li>
        <li>
          <span className={`${s.chip} ${s.chipSkip}`} /> Överhoppad
        </li>
      </ul>
      <p className={s.htpFoot}>Fyra nya låtar varje dag, en per kategori. Nya låtar vid midnatt.</p>
    </div>
  );
}
