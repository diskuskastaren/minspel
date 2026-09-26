"use client";
import { useEffect, useState } from "react";
import { ROUNDS } from "@/game-engine/rattstavat";
import type { GameState } from "@/game-engine/rattstavat-api-types";
import s from "@/app/home.module.css";

export function RattstavatProgress() {
  const [state, setState] = useState<GameState | null>(null);
  useEffect(() => {
    fetch("/api/rattstavat/state", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then(setState)
      .catch(() => {});
  }, []);
  if (!state) return <span className={s.progress}>&nbsp;</span>;
  const done = state.rounds.filter((r) => r.result);
  return (
    <span className={s.progress}>
      <span className="mono">
        {done.length}/{ROUNDS}
      </span>{" "}
      ord idag
      {done.length > 0 && (
        <span className={s.progressRows} aria-hidden="true">
          <span>{done.map((r) => (r.result!.correct ? "✅" : "❌")).join("")}</span>
        </span>
      )}
    </span>
  );
}
