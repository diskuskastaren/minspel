"use client";
import { useEffect, useState } from "react";
import { MAX_GUESSES } from "@/game-engine/ordet";
import type { GameState } from "@/game-engine/ordet-api-types";
import s from "@/app/home.module.css";

export function OrdetProgress() {
  const [state, setState] = useState<GameState | null>(null);
  useEffect(() => {
    fetch("/api/ordet/state", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then(setState)
      .catch(() => {});
  }, []);
  if (!state) return <span className={s.progress}>&nbsp;</span>;
  const done = state.lengths.filter((l) => l.session.state !== "ongoing");
  return (
    <span className={s.progress}>
      <span className="mono">
        {done.length}/{state.lengths.length}
      </span>{" "}
      klara idag
      {done.length > 0 && (
        <span className={s.progressRows} aria-hidden="true">
          {done.map((l) => (
            <span key={l.length}>
              {l.session.state === "won" ? "🟩" : "🟥"} {l.length} bokstäver {l.session.state === "won" ? l.session.rows.length : "X"}/{MAX_GUESSES}
            </span>
          ))}
        </span>
      )}
    </span>
  );
}
