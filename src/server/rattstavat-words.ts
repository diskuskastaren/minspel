import "server-only";
import { existsSync } from "node:fs";
import path from "node:path";
import type { Level, Schedule, SpellingWord } from "@/game-engine/rattstavat";
import type { AudioKind } from "@/game-engine/rattstavat-api-types";
import { loadJsonFile } from "./json-file";

// Ordlista, fryst schema och förgenererade uppläsningar för Rättstavat.
const DIR = () => process.env.KLURIG_RATTSTAVAT_DIR ?? path.join(process.cwd(), "data", "rattstavat");

function words(): Map<string, SpellingWord> {
  return loadJsonFile(path.join(DIR(), "ord.json"), (json) => {
    const list = (json as { words: SpellingWord[] }).words;
    return new Map(list.map((w) => [w.ord, w]));
  });
}

/** Dagens fem ord i nivåordning, eller null om schemat inte räcker dit. */
export function wordsFor(date: string): SpellingWord[] | null {
  const day = loadJsonFile(path.join(DIR(), "schema.json"), (json) => (json as { days: Schedule }).days)[date];
  if (!day) return null;
  const all = words();
  return ([1, 2, 3, 4, 5] as Level[]).map((l) => {
    const w = all.get(day[l]);
    if (!w) throw new Error(`Rättstavat: ${day[l]} (${date}) saknas i ord.json`);
    return w;
  });
}

export function audioFile(word: string, kind: AudioKind): string | null {
  const file = path.join(DIR(), "ljud", `${word}-${kind}.mp3`);
  return existsSync(file) ? file : null;
}
