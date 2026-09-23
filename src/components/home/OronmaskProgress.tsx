"use client";
import { useEffect, useState } from "react";
import { moveEmoji, MAX_ATTEMPTS } from "@/game-engine/oronmask";
import type { GameState } from "@/game-engine/oronmask-api-types";
import s from "@/app/home.module.css";

export function OronmaskProgress() {
  const [state, setState] = useState<GameState | null>(null);
  useEffect(() => {
    fetch("/api/oronmask/state", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then(setState)
      .catch(() => {});
  }, []);
  if (!state) return <span className={s.progress}>&nbsp;</span>;
  const done = state.categories.filter((c) => c.session.state !== "ongoing");
  return (
    <span className={s.progress}>
      <span className="mono">
        {done.length}/{state.categories.length}
      </span>{" "}
      klara idag
      {done.length > 0 && (
        <span className={s.progressRows} aria-hidden="true">
          {done.map((c) => (
            <span key={c.slug}>{Array.from({ length: MAX_ATTEMPTS }, (_, i) => moveEmoji(c.session.moves[i])).join("")}</span>
          ))}
        </span>
      )}
    </span>
  );
}
