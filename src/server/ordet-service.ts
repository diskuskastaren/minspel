import "server-only";
import {
  GAME_START_DATE,
  LENGTHS,
  applyGuess,
  challengeNumber,
  computeDailyStats,
  computeStats,
  newSession,
  validateHardMode,
  type Session,
  type Stats,
  type WordLength,
} from "@/game-engine/ordet";
import type { GameState, GuessResponse, LengthState } from "@/game-engine/ordet-api-types";
import type { DaySummary } from "@/game-engine/hub";
import { normalizeWord } from "@/lib/normalize-word";
import { msUntilNextDay } from "@/lib/time";
import { resolveDate as resolveDateFor } from "./dates";
import { GameError } from "./errors";
import { answerFor, isValidGuess } from "./ordet-words";
import { createSessionStore } from "./store";

const store = createSessionStore<Session, WordLength>("ordet-sessions.json", (s) => s.length);
export const resetDay = store.resetDay;

export function resolveDate(requested: string | null | undefined, now = new Date()) {
  return resolveDateFor(requested, GAME_START_DATE, now);
}

function answerOrThrow(date: string, length: WordLength): string {
  const answer = answerFor(date, length);
  if (!answer) throw new GameError("NO_CHALLENGE", 503);
  return answer;
}

function toPublic(session: Session): LengthState {
  const finished = session.state !== "ongoing";
  return {
    length: session.length,
    session: {
      date: session.date,
      length: session.length,
      state: session.state,
      hard: session.hard,
      rows: session.rows,
      answer: finished ? answerOrThrow(session.date, session.length) : null,
    },
    daily: finished ? computeDailyStats(store.listForChallenge(session.date, session.length)) : null,
  };
}

function statsFor(deviceId: string, length: WordLength, today: string): Stats {
  return computeStats(store.list(deviceId), length, today);
}

export function getState(deviceId: string, requestedDate?: string | null): GameState {
  const { date, today } = resolveDate(requestedDate);
  const lengths = LENGTHS.map((l) => {
    answerOrThrow(date, l);
    return toPublic(store.get(deviceId, date, l) ?? newSession(date, l));
  });
  const all = store.list(deviceId);
  const stats = Object.fromEntries(LENGTHS.map((l) => [l, computeStats(all, l, today)])) as Record<WordLength, Stats>;
  return { today, date, number: challengeNumber(date), msUntilNext: msUntilNextDay(), isArchive: date !== today, lengths, stats };
}

export function makeGuess(
  deviceId: string,
  input: { date?: string | null; length: WordLength; idx: number; word: string; hard: boolean },
): GuessResponse {
  const { date, today } = resolveDate(input.date);
  const word = normalizeWord(input.word);
  if (!word) throw new GameError("VALIDATION_ERROR", 400);
  if ([...word].length !== input.length) throw new GameError("WRONG_LENGTH", 400);

  const answer = answerOrThrow(date, input.length);
  const session = store.get(deviceId, date, input.length) ?? newSession(date, input.length);

  // Idempotens: samma gissning med samma index (t.ex. vid omsändning) ger samma svar.
  if (input.idx < session.rows.length) {
    if (session.rows[input.idx].word !== word) throw new GameError("MOVE_OUT_OF_ORDER", 409);
    return { length: toPublic(session), stats: statsFor(deviceId, input.length, today) };
  }
  if (input.idx !== session.rows.length) throw new GameError("MOVE_OUT_OF_ORDER", 409);
  if (session.state !== "ongoing") throw new GameError("SESSION_FINISHED", 409);
  if (!isValidGuess(word)) throw new GameError("NOT_IN_WORD_LIST", 422);
  const hard = session.rows.length === 0 ? input.hard : session.hard;
  if (hard && validateHardMode(word, session.rows)) throw new GameError("HARD_MODE", 422);

  const next = applyGuess(session, word, answer, { hard });
  store.save(deviceId, next);
  return { length: toPublic(next), stats: statsFor(deviceId, input.length, today) };
}

// ---------- Hubben ----------

export function daySummary(deviceId: string, date: string): DaySummary {
  const sessions = LENGTHS.map((l) => store.get(deviceId, date, l));
  const finished = sessions.filter((s) => s && s.state !== "ongoing");
  const won = finished.filter((s) => s!.state === "won").length;
  return {
    done: finished.length,
    total: LENGTHS.length,
    started: sessions.some((s) => s && s.rows.length > 0),
    finished: finished.length === LENGTHS.length,
    detail: finished.length ? `${won} av ${finished.length} lösta` : null,
  };
}

/** Datum då spelaren klarade minst ett ord. */
export function finishedDates(deviceId: string): string[] {
  return store
    .list(deviceId)
    .filter((s) => s.state !== "ongoing")
    .map((s) => s.date);
}
