import "server-only";
import { readFileSync, statSync } from "node:fs";
import path from "node:path";
import type { CatalogSong } from "@/game-engine/oronmask";

const FILE = path.join(process.cwd(), "data", "catalog.json");
let cache: { mtimeMs: number; songs: CatalogSong[]; byId: Map<number, CatalogSong> } | null = null;

/** Läser data/catalog.json (laddas om automatiskt när filen byggs om). */
export function getCatalog(): { songs: CatalogSong[]; byId: Map<number, CatalogSong> } {
  const mtimeMs = statSync(FILE).mtimeMs;
  if (!cache || cache.mtimeMs !== mtimeMs) {
    const json = JSON.parse(readFileSync(FILE, "utf8")) as { songs: CatalogSong[] };
    cache = { mtimeMs, songs: json.songs, byId: new Map(json.songs.map((s) => [s.id, s])) };
  }
  return cache;
}
