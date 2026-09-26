import "server-only";
import { readFileSync } from "node:fs";
import {
  GAME_START_DATE,
  ROUNDS,
  applyAnswer,
  challengeNumber,
  computeStats,
  dailyRates,
  fillSentence,
  newSession,
  normalizeSpelling,
  score,
  type Session,
  type SpellingWord,
} from "@/game-engine/rattstavat";
import type { AudioKind, GameState, PublicRound } from "@/game-engine/rattstavat-api-types";
import { msUntilNextDay } from "@/lib/time";
import { IS_DEV, resolveDate as resolveDateFor } from "./dates";
import { GameError } from "./errors";
import { audioFile, wordsFor } from "./rattstavat-words";
import { createSessionStore } from "./store";

const store = createSessionStore<Session, "dag">("rattstavat-sessions.json", () => "dag");
export const resetDay = store.resetDay;

export function resolveDate(requested: string | null | undefined, now = new Date()) {
  return resolveDateFor(requested, GAME_START_DATE, now);
}

function wordsOrThrow(date: string): SpellingWord[] {
  const w = wordsFor(date);
  if (!w) throw new GameError("NO_CHALLENGE", 503);
  return w;
}

function buildState(deviceId: string, date: string, today: string, session: Session): GameState {
  const words = wordsOrThrow(date);
  const daily = dailyRates(store.listForChallenge(date, "dag"));
  const current = session.answers.length;
  const rounds: PublicRound[] = words.map((w, i) => {
    const answer = session.answers[i];
    const visible = i <= current;
    const hasFiles = audioFile(w.ord, "ord") && audioFile(w.ord, "definition") && audioFile(w.ord, "mening");
    return {
      index: i,
      level: w.niva,
      definition: visible ? w.definition : null,
      sentence: visible ? w.mening : null,
      originLanguage: visible ? (w.ursprung?.sprak ?? null) : null,
      audio: hasFiles ? "fil" : "talsyntes",
      result: answer
        ? { input: answer.input, correct: answer.correct, word: w.ord, origin: w.ursprung, sentence: fillSentence(w.mening, w.ord), daily: daily[i] }
        : null,
    };
  });
  return {
    today,
    date,
    number: challengeNumber(date),
    msUntilNext: msUntilNextDay(),
    isArchive: date !== today,
    state: session.state,
    current,
    score: score(session),
    rounds,
    stats: computeStats(store.list(deviceId), today),
  };
}

export function getState(deviceId: string, requestedDate?: string | null): GameState {
  const { date, today } = resolveDate(requestedDate);
  return buildState(deviceId, date, today, store.get(deviceId, date, "dag") ?? newSession(date));
}

export function answer(deviceId: string, input: { date?: string | null; round: number; text: string }): GameState {
  const { date, today } = resolveDate(input.date);
  const text = normalizeSpelling(input.text);
  if (!text || text.length > 40 || !/^[\p{L}-]+$/u.test(text)) throw new GameError("VALIDATION_ERROR", 400);
  const words = wordsOrThrow(date);
  const session = store.get(deviceId, date, "dag") ?? newSession(date);

  // Idempotens: samma svar på samma runda (t.ex. vid omsändning) ger samma resultat.
  if (input.round < session.answers.length) {
    if (session.answers[input.round].input !== text) throw new GameError("MOVE_OUT_OF_ORDER", 409);
    return buildState(deviceId, date, today, session);
  }
  if (session.state !== "ongoing") throw new GameError("SESSION_FINISHED", 409);
  if (input.round !== session.answers.length) throw new GameError("MOVE_OUT_OF_ORDER", 409);

  const next = applyAnswer(session, text, words[input.round]);
  store.save(deviceId, next);
  return buildState(deviceId, date, today, next);
}

export type Audio = { kind: "mp3"; bytes: Uint8Array } | { kind: "text"; text: string };

/**
 * Uppläsning för en runda. Förgenererade MP3-filer i första hand. Utan filer får
 * webbläsaren texten att läsa upp själv – bara i utveckling, eftersom ordet då
 * syns i nätverkstrafiken innan spelaren har svarat.
 */
export function audio(deviceId: string, input: { date?: string | null; round: number; kind: AudioKind }): Audio {
  const { date } = resolveDate(input.date);
  const session = store.get(deviceId, date, "dag") ?? newSession(date);
  if (input.round > session.answers.length || input.round >= ROUNDS) throw new GameError("ROUND_LOCKED", 403);
  const w = wordsOrThrow(date)[input.round];
  const file = audioFile(w.ord, input.kind);
  if (file) return { kind: "mp3", bytes: new Uint8Array(readFileSync(file)) };
  if (!IS_DEV) throw new GameError("NO_AUDIO", 404);
  const text = input.kind === "ord" ? w.ord : input.kind === "definition" ? w.definition : fillSentence(w.mening, w.ord);
  return { kind: "text", text };
}
