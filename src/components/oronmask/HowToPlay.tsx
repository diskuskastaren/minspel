"use client";
import { STEPS, formatSeconds } from "@/game-engine/oronmask";
import u from "@/components/ui/ui.module.css";
import s from "./oronmask.module.css";

export function HowToPlay() {
  return (
    <div className={s.htp}>
      <p className={u.eyebrow}>Så spelar du</p>
      <h2 className={`display ${u.htpTitle}`}>Känner du igen låten?</h2>
      <ol className={u.htpSteps}>
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
      <ul className={u.htpLegend}>
        <li>
          <span className={`${u.chip} ${u.chipGood}`} /> Rätt låt
        </li>
        <li>
          <span className={`${u.chip} ${u.chipHalf}`} /> Rätt artist, fel låt
        </li>
        <li>
          <span className={`${u.chip} ${u.chipBad}`} /> Fel
        </li>
        <li>
          <span className={`${u.chip} ${u.chipSkip}`} /> Överhoppad
        </li>
      </ul>
      <p className={u.htpFoot}>Fyra nya låtar varje dag, en per kategori. Nya låtar vid midnatt.</p>
    </div>
  );
}
