import "server-only";
import {
  CATEGORIES,
  GAME_START_DATE,
  applyMove,
  challengeNumber,
  computeStats,
  judgeGuess,
  newSession,
  scheduleForDate,
  unlockedSeconds,
  type CatalogSong,
  type CategorySlug,
  type Move,
  type Session,
  type Stats,
} from "@/game-engine/oronmask";
import type { GameState, PublicSession, Reveal } from "@/game-engine/oronmask-api-types";
import type { DaySummary } from "@/game-engine/hub";
import { normalizeText } from "@/lib/normalize";
import { msUntilNextDay } from "@/lib/time";
import { sliceMp3 } from "@/lib/mp3";
import { getCatalog } from "./catalog";
import { getFreshPreviewUrl, getPreviewBytes, getTrackInfo, searchTracks, type SearchHit } from "./deezer";
import { resolveDate as resolveDateFor, IS_DEV } from "./dates";
import { GameError } from "./errors";
import { createSessionStore } from "./store";

export { GameError };

const store = createSessionStore<Session, CategorySlug>("oronmask-sessions.json", (s) => s.category);
const getSession = store.get;
const saveSession = store.save;
const listSessions = store.list;
export const resetDay = store.resetDay;

export function resolveDate(requested: string | null | undefined, now = new Date()) {
  return resolveDateFor(requested, GAME_START_DATE, now);
}

// ---------- Publik form (skickas till webbläsaren) ----------

async function toPublic(session: Session, song: CatalogSong): Promise<PublicSession> {
  let answer: Reveal | null = null;
  if (session.state !== "ongoing") {
    let previewUrl: string | null = null;
    try {
      previewUrl = await getFreshPreviewUrl(song.id);
    } catch {
      previewUrl = null;
    }
    answer = {
      title: song.title,
      artist: song.artistNames.join(", "),
      year: song.year,
      cover: song.cover,
      deezerLink: song.link,
      spotifyUrl: `https://open.spotify.com/search/${encodeURIComponent(`${song.artist} ${song.title}`)}`,
      previewUrl,
    };
  }
  return { date: session.date, category: session.category, state: session.state, moves: session.moves, unlocked: unlockedSeconds(session), answer };
}

function songFor(date: string, category: CategorySlug): CatalogSong {
  return scheduleForDate(getCatalog().songs, date)[category];
}

// ---------- Användningsfall ----------

export async function getState(deviceId: string, requestedDate?: string | null): Promise<GameState> {
  const { date, today } = resolveDate(requestedDate);
  const all = listSessions(deviceId);
  const categories = await Promise.all(
    CATEGORIES.map(async (c) => {
      const session = getSession(deviceId, date, c.slug) ?? newSession(date, c.slug);
      return { ...c, session: await toPublic(session, songFor(date, c.slug)) };
    }),
  );
  const stats = Object.fromEntries(CATEGORIES.map((c) => [c.slug, computeStats(all, c.slug, today)])) as Record<CategorySlug, Stats>;
  return { today, date, number: challengeNumber(date), msUntilNext: msUntilNextDay(), isArchive: date !== today, categories, stats };
}

export async function makeMove(
  deviceId: string,
  input: { date?: string | null; category: CategorySlug; idx: number; trackId: number | null },
): Promise<{ session: PublicSession; stats: Stats }> {
  const { date, today } = resolveDate(input.date);
  const existing = getSession(deviceId, date, input.category);
  if (date !== today && date < today && !IS_DEV && !existing) throw new GameError("DATE_NOT_ALLOWED", 403);
  const session = existing ?? newSession(date, input.category);
  const song = songFor(date, input.category);

  // Idempotens: ett upprepat anrop med samma index ger samma svar.
  if (input.idx < session.moves.length) {
    const prev = session.moves[input.idx];
    const same = input.trackId === null ? prev.kind === "skip" : prev.kind === "guess" && prev.trackId === input.trackId;
    if (!same) throw new GameError("MOVE_OUT_OF_ORDER", 409);
    return { session: await toPublic(session, song), stats: computeStats(listSessions(deviceId), input.category, today) };
  }
  if (input.idx !== session.moves.length) throw new GameError("MOVE_OUT_OF_ORDER", 409);
  if (session.state !== "ongoing") throw new GameError("SESSION_FINISHED", 409);

  let move: Move;
  if (input.trackId === null) {
    move = { kind: "skip" };
  } else {
    const guess = getCatalog().byId.get(input.trackId) ?? (await getTrackInfo(input.trackId).catch(() => null));
    if (!guess) throw new GameError("TRACK_NOT_FOUND", 404);
    const result = judgeGuess(song, guess);
    move = { kind: "guess", trackId: guess.id, title: guess.title, artist: guess.artistNames.join(", "), result };
  }
  const next = applyMove(session, move);
  saveSession(deviceId, next);
  return { session: await toPublic(next, song), stats: computeStats(listSessions(deviceId), input.category, today) };
}

/** Bara den del av klippet som spelaren har låst upp. */
export async function getClip(deviceId: string, requestedDate: string | null, category: CategorySlug): Promise<Uint8Array> {
  const { date } = resolveDate(requestedDate);
  const session = getSession(deviceId, date, category) ?? newSession(date, category);
  const song = songFor(date, category);
  const bytes = await getPreviewBytes(song.id);
  return sliceMp3(bytes, song.startOffset ?? 0, unlockedSeconds(session));
}

/** Förslag: Deezers sök + katalogträffar som Deezer råkar missa. */
export async function search(query: string): Promise<SearchHit[]> {
  const q = query.trim().slice(0, 80);
  if (q.length < 1) return [];
  const remote = await searchTracks(q).catch(() => [] as SearchHit[]);
  const words = normalizeText(q).split(" ").filter(Boolean);
  const local = getCatalog()
    .songs.filter((s) => {
      const hay = normalizeText(`${s.title} ${s.artistNames.join(" ")}`);
      return words.every((w) => hay.includes(w));
    })
    .sort((a, b) => b.rank - a.rank)
    .map((s) => ({ id: s.id, title: s.title, artist: s.artist }));
  const seen = new Set<string>();
  const out: SearchHit[] = [];
  for (const h of [...remote.slice(0, 8), ...local.slice(0, 4), ...remote.slice(8)]) {
    const k = `${normalizeText(h.artist)}|${normalizeText(h.title)}`;
    if (seen.has(k) || seen.has(String(h.id))) continue;
    seen.add(k);
    seen.add(String(h.id));
    out.push(h);
    if (out.length >= 10) break;
  }
  return out;
}

// ---------- Hubben ----------

export function daySummary(deviceId: string, date: string): DaySummary {
  const sessions = CATEGORIES.map((c) => getSession(deviceId, date, c.slug));
  const finished = sessions.filter((s) => s && s.state !== "ongoing");
  const won = finished.filter((s) => s!.state === "won").length;
  return {
    done: finished.length,
    total: CATEGORIES.length,
    started: sessions.some((s) => s && s.moves.length > 0),
    finished: finished.length === CATEGORIES.length,
    detail: finished.length ? `${won} av ${finished.length} rätt` : null,
  };
}

/** Datum då spelaren klarade minst en låt. */
export function finishedDates(deviceId: string): string[] {
  return listSessions(deviceId)
    .filter((s) => s.state !== "ongoing")
    .map((s) => s.date);
}
