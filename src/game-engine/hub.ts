// Hubben: dagens spel, checklista, aktivitet och streak över alla spel.
import { addDays, daysBetween } from "../lib/time.ts";

export type GameSlug = "oronmask" | "ordet" | "rattstavat";

export const GAMES: { slug: GameSlug; name: string; href: string; unit: string }[] = [
  { slug: "oronmask", name: "Öronmask", href: "/oronmask", unit: "låtar" },
  { slug: "ordet", name: "Ordet", href: "/ordet", unit: "ord" },
  { slug: "rattstavat", name: "Rättstavat", href: "/rattstavat", unit: "ord" },
];

/** Ett spels läge idag för en spelare. */
export type DaySummary = {
  /** Avklarade delpussel (kategorier, ordlängder, rundor). */
  done: number;
  total: number;
  started: boolean;
  finished: boolean;
  /** Kort resultat, t.ex. "4/5 rätt". */
  detail: string | null;
};

export type HubGame = DaySummary & { slug: GameSlug; name: string; href: string; unit: string };

export type Today = {
  date: string;
  msUntilNext: number;
  games: HubGame[];
  allDone: boolean;
  /** De senaste sju dagarna, äldst först, med om spelaren klarade minst ett pussel. */
  week: { date: string; played: boolean }[];
  streak: { current: number; best: number };
};

/** Dagar i rad med minst ett avklarat pussel (räknas till idag, eller igår om idag inte spelats än). */
export function activityStreak(dates: Iterable<string>, today: string): { current: number; best: number } {
  const set = new Set(dates);
  const sorted = [...set].filter((d) => d <= today).sort();
  let best = 0;
  let run = 0;
  let prev: string | null = null;
  for (const d of sorted) {
    run = prev && daysBetween(prev, d) === 1 ? run + 1 : 1;
    best = Math.max(best, run);
    prev = d;
  }
  let current = 0;
  let cursor = set.has(today) ? today : addDays(today, -1);
  while (set.has(cursor)) {
    current++;
    cursor = addDays(cursor, -1);
  }
  return { current, best };
}

export function lastWeek(dates: Iterable<string>, today: string): { date: string; played: boolean }[] {
  const set = new Set(dates);
  return Array.from({ length: 7 }, (_, i) => {
    const date = addDays(today, i - 6);
    return { date, played: set.has(date) };
  });
}

/** Nästa spel som inte är klart idag, räknat efter `current` i listans ordning. */
export function nextGame<T extends { slug: GameSlug; finished: boolean }>(games: T[], current: GameSlug | null): T | null {
  const i = current ? games.findIndex((g) => g.slug === current) : -1;
  const order = [...games.slice(i + 1), ...games.slice(0, Math.max(0, i))];
  return order.find((g) => !g.finished) ?? null;
}
