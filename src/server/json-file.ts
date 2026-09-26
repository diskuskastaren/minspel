import "server-only";
import { readFileSync, statSync } from "node:fs";

type Cached = { mtimeMs: number; value: unknown };
const cache = new Map<string, Cached>();

/** Läser och tolkar en JSON-fil. Resultatet cachas tills filen ändras. */
export function loadJsonFile<T>(file: string, parse: (json: unknown) => T): T {
  const mtimeMs = statSync(file).mtimeMs;
  const hit = cache.get(file);
  if (hit && hit.mtimeMs === mtimeMs) return hit.value as T;
  const value = parse(JSON.parse(readFileSync(file, "utf8")));
  cache.set(file, { mtimeMs, value });
  return value;
}
