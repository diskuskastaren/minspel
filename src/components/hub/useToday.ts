"use client";
import { useCallback, useEffect, useState } from "react";
import type { Today } from "@/game-engine/hub";

/** Dagens läge i alla spel (checklista, streak). `refresh` hämtar på nytt, t.ex. när en runda är klar. */
export function useToday(enabled = true): { today: Today | null; refresh: () => Promise<Today | null> } {
  const [today, setToday] = useState<Today | null>(null);
  const refresh = useCallback(async () => {
    try {
      const res = await fetch("/api/today", { cache: "no-store" });
      if (!res.ok) return null;
      const t = (await res.json()) as Today;
      setToday(t);
      return t;
    } catch {
      return null;
    }
  }, []);
  useEffect(() => {
    if (enabled) void refresh();
  }, [enabled, refresh]);
  return { today, refresh };
}
