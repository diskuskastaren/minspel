// Rättstavat – ren spellogik utan I/O. Körs auktoritativt på servern och i
// klienten för visning (avslöjande, skillnad, öva igen, delning, statistik).
import { addDays, daysBetween } from "../lib/time.ts";
import { extendFrozenSchedule, type FrozenSchedule } from "./schedule.ts";

export const GAME_START_DATE = "2026-09-26";
export const LEVELS = [1, 2, 3, 4, 5] as const;
export type Level = (typeof LEVELS)[number];
export const ROUNDS = LEVELS.length;
/** Maskeringen i exempelmeningarna. */
export const BLANK = "___";

export type Origin = { sprak: string; fran: string };

export type SpellingWord = {
  ord: string;
  niva: Level;
  /** Förklaring utan själva ordet – läses upp och visas. */
  definition: string;
  /** Exempelmening med ordet ersatt av ___ (i exakt den form som ska stavas). */
  mening: string;
  ursprung: Origin | null;
  /** Andra vedertagna stavningar som också räknas som rätt (undvik helst sådana ord). */
  varianter?: string[];
};

export function challengeNumber(date: string): number {
  return daysBetween(GAME_START_DATE, date) + 1;
}

// ---------- Bedömning ----------

/** Jämförelseform: trim, gemener, NFC, inga inre mellanslag. Accenter behålls – de är en del av stavningen. */
export function normalizeSpelling(input: string): string {
  return input.normalize("NFC").trim().toLowerCase().replace(/\s+/g, "");
}

export function isCorrect(input: string, word: Pick<SpellingWord, "ord" | "varianter">): boolean {
  const n = normalizeSpelling(input);
  return n === word.ord || (word.varianter ?? []).includes(n);
}

/** Hur många bokstäver från början som stämmer (där avslöjandet stannar). */
export function matchingPrefix(input: string, answer: string): number {
  const a = [...input];
  const b = [...answer];
  let i = 0;
  while (i < a.length && i < b.length && a[i] === b[i]) i++;
  return i;
}

export type DiffPart =
  | { kind: "same"; ch: string }
  | { kind: "wrong"; ch: string; got: string }
  | { kind: "missing"; ch: string }
  | { kind: "extra"; got: string };

/**
 * Minsta skillnad mellan spelarens stavning och den rätta (Levenshtein med
 * bakåtspårning). Resultatet följer den rätta stavningen, med felaktiga,
 * saknade och överflödiga bokstäver markerade.
 */
export function spellingDiff(input: string, answer: string): DiffPart[] {
  const a = [...input];
  const b = [...answer];
  const d: number[][] = Array.from({ length: a.length + 1 }, (_, i) => Array.from({ length: b.length + 1 }, (_, j) => (i === 0 ? j : j === 0 ? i : 0)));
  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    }
  }
  const out: DiffPart[] = [];
  let i = a.length;
  let j = b.length;
  while (i > 0 || j > 0) {
    if (i > 0 && j > 0 && a[i - 1] === b[j - 1] && d[i][j] === d[i - 1][j - 1]) {
      out.push({ kind: "same", ch: b[j - 1] });
      i--;
      j--;
    } else if (i > 0 && j > 0 && d[i][j] === d[i - 1][j - 1] + 1) {
      out.push({ kind: "wrong", ch: b[j - 1], got: a[i - 1] });
      i--;
      j--;
    } else if (j > 0 && d[i][j] === d[i][j - 1] + 1) {
      out.push({ kind: "missing", ch: b[j - 1] });
      j--;
    } else {
      out.push({ kind: "extra", got: a[i - 1] });
      i--;
    }
  }
  return out.reverse();
}

export function fillSentence(sentence: string, word: string): string {
  return sentence.replace(BLANK, word);
}

// ---------- Session ----------

export type Answer = { input: string; correct: boolean };
export type SessionState = "ongoing" | "finished";
export type Session = {
  date: string;
  state: SessionState;
  answers: Answer[];
  startedAt: string;
  finishedAt: string | null;
};

export function newSession(date: string, now = new Date()): Session {
  return { date, state: "ongoing", answers: [], startedAt: now.toISOString(), finishedAt: null };
}

export function applyAnswer(session: Session, input: string, word: SpellingWord, now = new Date()): Session {
  if (session.state !== "ongoing") throw new Error("SESSION_FINISHED");
  const answers = [...session.answers, { input: normalizeSpelling(input), correct: isCorrect(input, word) }];
  const state: SessionState = answers.length >= ROUNDS ? "finished" : "ongoing";
  return { ...session, answers, state, finishedAt: state === "finished" ? now.toISOString() : null };
}

export function score(session: Pick<Session, "answers">): number {
  return session.answers.filter((a) => a.correct).length;
}

// ---------- Schema ----------

export type Schedule = FrozenSchedule<Level>;

export function extendSchedule(schedule: Schedule, words: Record<Level, string[]>, until: string): Schedule {
  return extendFrozenSchedule(schedule, words, LEVELS, { until, startDate: GAME_START_DATE, seed: "rattstavat" });
}

// ---------- Delning ----------

export function shareText(session: Pick<Session, "date" | "answers">, url: string): string {
  const marks = session.answers.map((a) => (a.correct ? "✅" : "❌")).join("");
  return `Rättstavat #${challengeNumber(session.date)} · ${score(session)}/${ROUNDS} 🐝 ${marks}\n${url}`;
}

// ---------- Statistik ----------

export type SpellingStats = {
  played: number;
  words: number;
  correct: number;
  /** Dagar i rad med en spelad runda (fram till idag eller igår). */
  currentStreak: number;
  bestStreak: number;
  /** index 0–5 = antal rätt en dag */
  distribution: number[];
};

export function computeStats(sessions: Session[], today: string): SpellingStats {
  const finished = sessions.filter((s) => s.state === "finished").sort((a, b) => a.date.localeCompare(b.date));
  const distribution = Array(ROUNDS + 1).fill(0);
  for (const s of finished) distribution[score(s)]++;
  const dates = new Set(finished.map((s) => s.date));
  let best = 0;
  let run = 0;
  let prev: string | null = null;
  for (const s of finished) {
    run = prev && daysBetween(prev, s.date) === 1 ? run + 1 : 1;
    best = Math.max(best, run);
    prev = s.date;
  }
  let current = 0;
  let cursor = dates.has(today) ? today : addDays(today, -1);
  while (dates.has(cursor)) {
    current++;
    cursor = addDays(cursor, -1);
  }
  return {
    played: finished.length,
    words: finished.length * ROUNDS,
    correct: finished.reduce((n, s) => n + score(s), 0),
    currentStreak: current,
    bestStreak: best,
    distribution,
  };
}

export type RoundDaily = { answered: number; correct: number };

/** Hur många av dagens spelare som klarade varje runda. */
export function dailyRates(sessions: Pick<Session, "answers">[]): RoundDaily[] {
  return LEVELS.map((_, i) => {
    const answered = sessions.filter((s) => s.answers.length > i);
    return { answered: answered.length, correct: answered.filter((s) => s.answers[i].correct).length };
  });
}
