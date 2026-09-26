// Personlig statistik som delas av spelen: spelade, vinster, streak och fördelning.
import { addDays, daysBetween } from "../lib/time.ts";

export type Stats = {
  played: number;
  won: number;
  currentStreak: number;
  bestStreak: number;
  /** index 0 … maxAttempts-1 = vann på försök 1 …, sista index = förlust */
  distribution: number[];
};

export type FinishedGame = { date: string; won: boolean; attempts: number };

export function computeStats(games: FinishedGame[], maxAttempts: number, today: string): Stats {
  const finished = [...games].sort((a, b) => a.date.localeCompare(b.date));
  const distribution = Array(maxAttempts + 1).fill(0);
  for (const g of finished) distribution[g.won ? g.attempts - 1 : maxAttempts]++;

  const wonDates = new Set(finished.filter((g) => g.won).map((g) => g.date));
  let best = 0;
  let run = 0;
  let prev: string | null = null;
  for (const g of finished) {
    if (g.won) {
      run = prev && daysBetween(prev, g.date) === 1 && wonDates.has(prev) ? run + 1 : 1;
      best = Math.max(best, run);
    } else run = 0;
    prev = g.date;
  }
  // Aktuell streak: räknas bakåt från idag (eller igår om dagens inte är spelad än).
  let current = 0;
  let cursor = wonDates.has(today) ? today : addDays(today, -1);
  while (wonDates.has(cursor)) {
    current++;
    cursor = addDays(cursor, -1);
  }
  return { played: finished.length, won: wonDates.size, currentStreak: current, bestStreak: best, distribution };
}
