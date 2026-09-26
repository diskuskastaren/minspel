// Öronmask – ren spellogik utan I/O. Körs auktoritativt på servern och
// används av klienten för visning (delningstext, tidssteg, statistik).
import { normalizeText, normalizeTitle } from "../lib/normalize";
import { daysBetween } from "../lib/time";
import { seededShuffle } from "./random";
import { computeStats as computeSharedStats, type Stats } from "./stats";

export const GAME_START_DATE = "2026-09-01";

/** Hur många sekunder av klippet som är upplåsta efter 0, 1, 2 … försök. */
export const STEPS = [0.5, 1, 2, 4, 8, 15] as const;
export const MAX_ATTEMPTS = STEPS.length;
export const PREVIEW_SECONDS = 30;

export const CATEGORIES = [
  { slug: "alla", name: "Alla", short: "Alla" },
  { slug: "pop", name: "Svensk pop", short: "Pop" },
  { slug: "hiphop", name: "Svensk hiphop", short: "Hiphop" },
  { slug: "mello", name: "Schlager & Mello", short: "Mello" },
] as const;
export type CategorySlug = (typeof CATEGORIES)[number]["slug"];

export function isCategory(s: unknown): s is CategorySlug {
  return CATEGORIES.some((c) => c.slug === s);
}
export function categoryName(slug: CategorySlug): string {
  return CATEGORIES.find((c) => c.slug === slug)!.name;
}

export type CatalogSong = {
  id: number; // Deezer track id
  title: string;
  artist: string;
  artistIds: number[];
  artistNames: string[];
  cats: CategorySlug[];
  year: number | null;
  cover: string | null;
  link: string;
  rank: number;
  startOffset?: number; // sekunder in i förhandslyssningen
};

export type GuessResult = "correct" | "artist" | "wrong";
export type Move =
  | { kind: "skip" }
  | { kind: "guess"; trackId: number; title: string; artist: string; result: GuessResult };

export type SessionState = "ongoing" | "won" | "lost";
export type Session = {
  date: string;
  category: CategorySlug;
  state: SessionState;
  moves: Move[];
  startedAt: string;
  finishedAt: string | null;
};

export function newSession(date: string, category: CategorySlug, now = new Date()): Session {
  return { date, category, state: "ongoing", moves: [], startedAt: now.toISOString(), finishedAt: null };
}

export function challengeNumber(date: string): number {
  return daysBetween(GAME_START_DATE, date) + 1;
}

/** Sekunder av klippet som spelaren får höra just nu. */
export function unlockedSeconds(session: Pick<Session, "state" | "moves">): number {
  if (session.state !== "ongoing") return PREVIEW_SECONDS;
  return STEPS[Math.min(session.moves.length, STEPS.length - 1)];
}

export function applyMove(session: Session, move: Move, now = new Date()): Session {
  if (session.state !== "ongoing") throw new Error("SESSION_FINISHED");
  const moves = [...session.moves, move];
  let state: SessionState = "ongoing";
  if (move.kind === "guess" && move.result === "correct") state = "won";
  else if (moves.length >= MAX_ATTEMPTS) state = "lost";
  return { ...session, moves, state, finishedAt: state === "ongoing" ? null : now.toISOString() };
}

// ---------- Bedömning ----------

export type TrackInfo = { id: number; title: string; artistIds: number[]; artistNames: string[] };

export function judgeGuess(answer: TrackInfo, guess: TrackInfo): GuessResult {
  const sameArtist =
    guess.artistIds.some((id) => answer.artistIds.includes(id)) ||
    guess.artistNames.some((n) => answer.artistNames.map(normalizeText).includes(normalizeText(n)));
  if (guess.id === answer.id) return "correct";
  if (sameArtist && normalizeTitle(guess.title) === normalizeTitle(answer.title)) return "correct";
  return sameArtist ? "artist" : "wrong";
}

// ---------- Dagligt schema ----------

/**
 * Väljer dagens låt per kategori. Deterministiskt: samma katalog + datum ger
 * alltid samma låt. Varje kategori går igenom hela sin pool innan en låt
 * upprepas. "Alla" undviker låtar som redan är dagens låt i en annan kategori.
 */
export function scheduleForDate(catalog: CatalogSong[], date: string): Record<CategorySlug, CatalogSong> {
  const day = Math.max(0, daysBetween(GAME_START_DATE, date));
  const sorted = [...catalog].sort((a, b) => a.id - b.id);
  const result = {} as Record<CategorySlug, CatalogSong>;
  const taken = new Set<number>();
  const order: CategorySlug[] = ["pop", "hiphop", "mello", "alla"];
  for (const slug of order) {
    const pool = slug === "alla" ? sorted : sorted.filter((s) => s.cats.includes(slug));
    if (pool.length === 0) throw new Error(`Tom kategori: ${slug}`);
    const perm = seededShuffle(pool, `oronmask:${slug}:v1`);
    let idx = day % perm.length;
    for (let tries = 0; tries < perm.length && taken.has(perm[idx].id); tries++) idx = (idx + 1) % perm.length;
    result[slug] = perm[idx];
    taken.add(perm[idx].id);
  }
  return result;
}

// ---------- Delning ----------

export function moveEmoji(m: Move | undefined): string {
  if (!m) return "⬜";
  if (m.kind === "skip") return "⬛";
  return m.result === "correct" ? "🟩" : m.result === "artist" ? "🟨" : "🟥";
}

export function formatSeconds(s: number): string {
  return `${String(s).replace(".", ",")} s`;
}

export function shareText(session: Pick<Session, "date" | "category" | "state" | "moves">, url: string): string {
  const cat = categoryName(session.category);
  const row = Array.from({ length: MAX_ATTEMPTS }, (_, i) => moveEmoji(session.moves[i])).join("");
  const n = challengeNumber(session.date);
  const verdict =
    session.state === "won"
      ? `Hörde den på ${formatSeconds(STEPS[session.moves.length - 1])} 🎧`
      : "Den här gick mig förbi 💀";
  return `Öronmask #${n} · ${cat}\n${row}\n${verdict}\n${url}`;
}

// ---------- Personlig statistik ----------

export type { Stats };

export function computeStats(sessions: Session[], category: CategorySlug, today: string): Stats {
  const games = sessions
    .filter((s) => s.category === category && s.state !== "ongoing")
    .map((s) => ({ date: s.date, won: s.state === "won", attempts: s.moves.length }));
  return computeSharedStats(games, MAX_ATTEMPTS, today);
}
