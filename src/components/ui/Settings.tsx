"use client";
import { useId } from "react";
import type { MotionPref, ThemePref } from "@/lib/preferences";
import { usePreferences } from "./preferences";
import { playSfx } from "./sound";
import s from "./ui.module.css";

export function Switch({
  id,
  label,
  hint,
  checked,
  disabled,
  onChange,
}: {
  id: string;
  label: string;
  hint: string;
  checked: boolean;
  disabled?: boolean;
  onChange: (on: boolean) => void;
}) {
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

function Choice<T extends string>({ label, hint, value, options, onChange }: { label: string; hint: string; value: T; options: [T, string][]; onChange: (v: T) => void }) {
  const name = useId();
  return (
    <fieldset className={`${s.settingStack} ${s.fieldset}`}>
      <span>
        <legend>
          <strong>{label}</strong>
        </legend>
        <span>{hint}</span>
      </span>
      <div className={s.choice}>
        {options.map(([v, text]) => (
          <label key={v}>
            <input type="radio" name={name} value={v} checked={value === v} onChange={() => onChange(v)} />
            {text}
          </label>
        ))}
      </div>
    </fieldset>
  );
}

/** Inställningar som gäller alla spel, plus valfria spelspecifika (children). */
export function Settings({ children, gameTitle }: { children?: React.ReactNode; gameTitle?: string }) {
  const [prefs, set] = usePreferences();
  return (
    <div>
      <p className={s.eyebrow}>Inställningar</p>
      <h2 className={`display ${s.htpTitle}`}>Ditt sätt att spela</h2>

      {children && (
        <>
          <p className={s.settingsGroup}>{gameTitle}</p>
          {children}
        </>
      )}

      <p className={s.settingsGroup}>Alla spel</p>
      <Choice<ThemePref>
        label="Tema"
        hint="Följ systemet eller välj själv."
        value={prefs.theme}
        options={[
          ["system", "System"],
          ["light", "Ljust"],
          ["dark", "Mörkt"],
        ]}
        onChange={(theme) => set({ theme })}
      />
      <Switch
        id="fargblind"
        label="Färgblindläge"
        hint="Blått och orange i stället för grönt och gult."
        checked={prefs.colorblind}
        onChange={(colorblind) => set({ colorblind })}
      />
      <Choice<MotionPref>
        label="Rörelse"
        hint="Minska animationer som vändningar och skakningar."
        value={prefs.motion}
        options={[
          ["system", "System"],
          ["reduce", "Minska"],
          ["full", "Full"],
        ]}
        onChange={(motion) => set({ motion })}
      />
      <Switch id="ljud" label="Ljudeffekter" hint="Korta ljud när du gissar, vinner och förlorar." checked={prefs.sound} onChange={(sound) => set({ sound })} />
      {prefs.sound && (
        <label className={s.settingStack}>
          <span>
            <strong>Volym</strong>
          </span>
          <input
            type="range"
            className={s.volume}
            min={0}
            max={1}
            step={0.1}
            value={prefs.volume}
            onChange={(e) => set({ volume: Number(e.target.value) })}
            onPointerUp={() => playSfx("correct")}
            onKeyUp={() => playSfx("tap")}
          />
        </label>
      )}
    </div>
  );
}
