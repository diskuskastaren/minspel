import "server-only";
import { mkdirSync, readFileSync, writeFileSync, existsSync } from "node:fs";
import path from "node:path";
import type { TrackInfo } from "@/game-engine/oronmask";
import { looksLikeJunkVersion, normalizeText, normalizeTitle } from "@/lib/normalize";

// Deezers publika API kräver ingen nyckel. Förhandslyssningarna (30 s MP3) har
// tidsbegränsade signerade URL:er, så de hämtas på nytt när de blivit gamla.
const API = "https://api.deezer.com";
const PREVIEW_URL_MAX_AGE_MS = 20 * 60_000;
const CACHE_DIR = path.join(process.cwd(), ".cache", "previews");

export class UpstreamError extends Error {}

type DzTrack = {
  id: number;
  title: string;
  title_version?: string;
  preview: string;
  rank: number;
  link: string;
  release_date?: string;
  artist: { id: number; name: string };
  album: { title: string; cover_medium?: string; cover_xl?: string };
  contributors?: { id: number; name: string }[];
};

async function dz<T>(p: string): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`${API}${p}`, { headers: { "User-Agent": "klurig-local-dev/0.1" }, cache: "no-store" });
  } catch (e) {
    throw new UpstreamError(`Deezer onåbar: ${(e as Error).message}`);
  }
  const json = (await res.json()) as T & { error?: { message: string } };
  if (!res.ok || json.error) throw new UpstreamError(`Deezer: ${json.error?.message ?? res.status}`);
  return json;
}

type CachedTrack = { track: DzTrack; fetchedAt: number };
const trackCache = new Map<number, CachedTrack>();

async function getTrack(id: number, needFreshPreview = false): Promise<DzTrack> {
  const hit = trackCache.get(id);
  if (hit && (!needFreshPreview || Date.now() - hit.fetchedAt < PREVIEW_URL_MAX_AGE_MS)) return hit.track;
  const track = await dz<DzTrack>(`/track/${id}`);
  trackCache.set(id, { track, fetchedAt: Date.now() });
  return track;
}

export async function getTrackInfo(id: number): Promise<TrackInfo & { artist: string }> {
  const t = await getTrack(id);
  const people = t.contributors?.length ? t.contributors : [t.artist];
  return {
    id: t.id,
    title: t.title,
    artist: t.artist.name,
    artistIds: [...new Set(people.map((p) => p.id))],
    artistNames: [...new Set(people.map((p) => p.name))],
  };
}

export async function getFreshPreviewUrl(id: number): Promise<string | null> {
  const t = await getTrack(id, true);
  return t.preview || null;
}

/** Hela förhandslyssningen som bytes (cachas på disk för lokal utveckling). */
export async function getPreviewBytes(id: number): Promise<Uint8Array> {
  const file = path.join(CACHE_DIR, `${id}.mp3`);
  if (existsSync(file)) return new Uint8Array(readFileSync(file));
  const url = await getFreshPreviewUrl(id);
  if (!url) throw new UpstreamError("Låten saknar förhandslyssning");
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) throw new UpstreamError(`Kunde inte hämta ljud (${res.status})`);
  const bytes = new Uint8Array(await res.arrayBuffer());
  mkdirSync(CACHE_DIR, { recursive: true });
  writeFileSync(file, bytes);
  return bytes;
}

export type SearchHit = { id: number; title: string; artist: string };
const searchCache = new Map<string, { at: number; hits: SearchHit[] }>();

export async function searchTracks(query: string, limit = 25): Promise<SearchHit[]> {
  const key = normalizeText(query);
  const cached = searchCache.get(key);
  if (cached && Date.now() - cached.at < 10 * 60_000) return cached.hits;
  const res = await dz<{ data: DzTrack[] }>(`/search?q=${encodeURIComponent(query)}&limit=${limit}`);
  const seen = new Set<string>();
  const hits: SearchHit[] = [];
  for (const t of res.data) {
    if (!t.preview || looksLikeJunkVersion(t.title, t.title_version ?? "", t.album.title, t.artist.name)) continue;
    const k = `${normalizeText(t.artist.name)}|${normalizeTitle(t.title)}`;
    if (seen.has(k)) continue;
    seen.add(k);
    hits.push({ id: t.id, title: t.title, artist: t.artist.name });
  }
  searchCache.set(key, { at: Date.now(), hits });
  if (searchCache.size > 500) searchCache.delete(searchCache.keys().next().value!);
  return hits;
}
