"use client";
import { Settings as SharedSettings, Switch } from "@/components/ui/Settings";

type Props = {
  hard: boolean;
  onHard: (on: boolean) => void;
  /** Svårt läge kan inte ändras mitt i en påbörjad runda. */
  hardLocked: boolean;
};

export function Settings({ hard, onHard, hardLocked }: Props) {
  return (
    <SharedSettings gameTitle="Ordet">
      <Switch
        id="svart-lage"
        label="Svårt läge"
        hint={hardLocked ? "Gäller från nästa runda – den här är redan påbörjad." : "Gröna bokstäver måste stå kvar och gula måste användas."}
        checked={hard}
        disabled={hardLocked}
        onChange={onHard}
      />
    </SharedSettings>
  );
}
