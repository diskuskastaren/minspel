"use client";
import u from "@/components/ui/ui.module.css";

export function HowToPlay() {
  return (
    <div>
      <p className={u.eyebrow}>Så spelar du</p>
      <h2 className={`display ${u.htpTitle}`}>Hör ordet. Stava det rätt.</h2>
      <ol className={u.htpSteps}>
        <li>
          <span>
            <strong>Lyssna</strong> på ordet. Du kan höra det igen, långsamt, få en förklaring eller höra det i en mening.
          </span>
        </li>
        <li>
          <span>
            <strong>Skriv</strong> ordet och tryck Svara. Du har ett försök per ord – versaler spelar ingen roll, men å, ä och ö gör det.
          </span>
        </li>
        <li>
          <span>
            <strong>Fem ord</strong> om dagen, från vardagsord till riktigt kluriga lånord. Efter ett fel kan du öva på ordet utan att det
            påverkar poängen.
          </span>
        </li>
      </ol>
      <p className={u.htpFoot}>Nya ord vid midnatt.</p>
    </div>
  );
}
