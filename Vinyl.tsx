"use client";
import s from "./oronmask.module.css";
import type { PlayerStatus } from "./useClipPlayer";

type Props = { status: PlayerStatus; onClick: () => void; label: string; disabled?: boolean };

export function Vinyl({ status, onClick, label, disabled }: Props) {
  const playing = status === "playing";
  return (
    <button
      type="button"
      className={`${s.vinyl} ${playing ? s.vinylSpinning : ""} ${status === "loading" ? s.vinylLoading : ""}`}
      onClick={onClick}
      disabled={disabled}
      aria-label={playing ? "Stoppa klippet" : label}
      aria-pressed={playing}
    >
      <span className={s.vinylDisc} aria-hidden="true">
        <span className={s.vinylShine} />
        <span className={s.vinylLabel}>
          {playing ? (
            <svg viewBox="0 0 24 24" width="30" height="30">
              <rect x="6" y="5" width="4" height="14" rx="1.2" fill="currentColor" />
              <rect x="14" y="5" width="4" height="14" rx="1.2" fill="currentColor" />
            </svg>
          ) : (
            <svg viewBox="0 0 24 24" width="30" height="30">
              <path d="M8 5.5v13a1 1 0 0 0 1.5.86l10.2-6.5a1 1 0 0 0 0-1.72L9.5 4.64A1 1 0 0 0 8 5.5Z" fill="currentColor" />
            </svg>
          )}
        </span>
      </span>
      <span className={s.tonearm} aria-hidden="true" />
    </button>
  );
}
