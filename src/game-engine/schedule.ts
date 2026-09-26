// Fryst dagligt schema som delas av spelen: datum → ett ord/objekt per nyckel
// (ordlängd, svårighetsnivå …). Befintliga dagar ändras aldrig.
import { addDays } from "../lib/time.ts";
import { seededShuffle } from "./random.ts";

export type FrozenSchedule<K extends string | number> = Record<string, Record<K, string>>;

/**
 * Förlänger schemat fram till och med `until`. Varje nyckel går igenom sin pool
 * i en fast slumpordning och ett värde återkommer inte förrän alla andra i
 * poolen har använts – även om poolen ändras mellan körningarna.
 */
export function extendFrozenSchedule<K extends string | number>(
  schedule: FrozenSchedule<K>,
  pools: Record<K, string[]>,
  keys: readonly K[],
  opts: { until: string; startDate: string; seed: string },
): FrozenSchedule<K> {
  const next: FrozenSchedule<K> = { ...schedule };
  const dates = Object.keys(schedule).sort();
  let date = dates.length ? addDays(dates[dates.length - 1], 1) : opts.startDate;
  const used = new Map<K, Set<string>>(keys.map((k) => [k, new Set(dates.map((d) => schedule[d][k]))]));
  const order = new Map<K, string[]>(keys.map((k) => [k, seededShuffle([...pools[k]].sort(), `${opts.seed}:${k}:v1`)]));
  while (date <= opts.until) {
    const day = {} as Record<K, string>;
    for (const k of keys) {
      const pool = order.get(k)!;
      if (pool.length === 0) throw new Error(`Tom pool: ${k}`);
      let pick = pool.find((w) => !used.get(k)!.has(w));
      if (!pick) {
        // Allt i poolen har använts – börja om.
        used.set(k, new Set());
        pick = pool[0];
      }
      used.get(k)!.add(pick);
      day[k] = pick;
    }
    next[date] = day;
    date = addDays(date, 1);
  }
  return next;
}
