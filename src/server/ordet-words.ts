import "server-only";
import path from "node:path";
import { LENGTHS, type Schedule, type WordLength } from "@/game-engine/ordet";
import { addDays, stockholmDate } from "@/lib/time";
import { loadJsonFile } from "./json-file";

// Ordlistor och fryst schema för Ordet. Filerna byggs med `npm run ordlista`
// och `npm run ordet:schema` och laddas om automatiskt när de ändras.
const DIR = () => process.env.KLURIG_ORDET_DIR ?? path.join(process.cwd(), "data", "ordet");
const WARN_DAYS = 7;

function loadJson<T>(name: string, parse: (json: unknown) => T): T {
  return loadJsonFile(path.join(DIR(), name), parse);
}

export function guessList(length: WordLength): Set<string> {
  return loadJson("gissningar.json", (json) => {
    const words = (json as { words: Record<string, string[]> }).words;
    return new Map(LENGTHS.map((l) => [l, new Set(words[l] ?? [])]));
  }).get(length)!;
}

export function isValidGuess(word: string): boolean {
  const len = [...word].length as WordLength;
  return LENGTHS.includes(len) && guessList(len).has(word);
}

let warnedFor = "";

/** Dagens hemliga ord för en längd, eller null om schemat inte räcker till det datumet. */
export function answerFor(date: string, length: WordLength): string | null {
  const schedule = loadJson("schema.json", (json) => (json as { days: Schedule }).days);
  const today = stockholmDate();
  if (warnedFor !== today && !schedule[addDays(today, WARN_DAYS)]) {
    warnedFor = today;
    console.warn(`[ordet] Schemat räcker mindre än ${WARN_DAYS} dagar – kör npm run ordet:schema`);
  }
  return schedule[date]?.[length] ?? null;
}
