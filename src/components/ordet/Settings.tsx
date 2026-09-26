"use client";
import u from "@/components/ui/ui.module.css";
import s from "./ordet.module.css";

type Props = {
  hard: boolean;
  onHard: (on: boolean) => void;
  /** Svårt läge kan inte ändras mitt i en påbörjad runda. */
  hardLocked: boolean;
  colorblind: boolean;
  onColorblind: (on: boolean) => void;
};

function Switch({ id, label, hint, checked, disabled, onChange }: { id: string; label: string; hint: string; checked: boolean; disabled?: boolean; onChange: (on: boolean) => void }) {
  return (
    <div className={s.setting}>
      <label htmlFor={id}>
        <strong>
          {label}
          {disabled && (
            <span className={s.lock} aria-label="låst">
              {" "}
              🔒
            </span>
          )}
        </strong>
        <span id={`${id}-hint`}>{hint}</span>
      </label>
      <input
        id={id}
        type="checkbox"
        role="switch"
        className={s.switch}
        checked={checked}
        disabled={disabled}
        aria-describedby={`${id}-hint`}
        onChange={(e) => onChange(e.target.checked)}
      />
    </div>
  );
}

export function Settings({ hard, onHard, hardLocked, colorblind, onColorblind }: Props) {
  return (
    <div>
      <p className={u.eyebrow}>Inställningar</p>
      <h2 className={`display ${u.htpTitle}`}>Ditt sätt att spela</h2>
      <Switch
        id="svart-lage"
        label="Svårt läge"
        hint={hardLocked ? "Gäller från nästa runda – den här är redan påbörjad." : "Gröna bokstäver måste stå kvar och gula måste användas."}
        checked={hard}
        disabled={hardLocked}
        onChange={onHard}
      />
      <Switch
        id="fargblind"
        label="Färgblindläge"
        hint="Blått och orange i stället för grönt och gult. Gäller alla spel."
        checked={colorblind}
        onChange={onColorblind}
      />
    </div>
  );
}
