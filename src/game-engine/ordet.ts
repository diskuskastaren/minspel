// Ordet – ren spellogik utan I/O. Körs auktoritativt på servern och i klienten
// för omedelbar återkoppling (längd, svårt läge, tangentbordsfärger, delning).
import { addDays, daysBetween } from "../lib/time.ts";
import { seededShuffle } from "./random.ts";
import { computeStats as computeSharedStats, type Stats } from "./stats.ts";

export const GAME_START_DATE = "2026-09-01";
export const LENGTHS = [3, 4, 5, 6, 7, 8] as const;
export type WordLength = (typeof LENGTHS)[number];
export const DEFAULT_LENGTH: WordLength = 5;
export const MAX_GUESSES = 6;
/** Global fördelning och percentil visas först när så här många har spelat klart. */
export const MIN_PLAYERS_FOR_DISTRIBUTION = 30;

export function isWordLength(n: unknown): n is WordLength {
  return LENGTHS.includes(n as WordLength);
}

export function challengeNumber(date: string): number {
  return daysBetween(GAME_START_DATE, date) + 1;
}

// ---------- Bedömning ----------

export type LetterScore = "correct" | "present" | "absent";

/** Färg per bokstav. Dubbletter: gröna först, sedan gula så länge svaret har kvar av bokstaven. */
export function scoreGuess(guess: string, answer: string): LetterScore[] {
  const g = [...guess];
  const a = [...answer];
  if (g.length !== a.length) throw new Error("LENGTH_MISMATCH");
  const res: LetterScore[] = Array(g.length).fill("absent");
  const remaining = new Map<string, number>();
  for (let i = 0; i < a.length; i++) {
    if (g[i] === a[i]) res[i] = "correct";
    else remaining.set(a[i], (remaining.get(a[i]) ?? 0) + 1);
  }
  for (let i = 0; i < g.length; i++) {
    if (res[i] === "correct") continue;
    const left = remaining.get(g[i]) ?? 0;
    if (left > 0) {
      res[i] = "present";
      remaining.set(g[i], left - 1);
    }
  }
  return res;
}

export type Row = { word: string; scores: LetterScore[] };

const RANK: Record<LetterScore, number> = { absent: 0, present: 1, correct: 2 };

/** Bästa kända status per bokstav (grön > gul > grå). */
export function mergeKeyboardState(prev: Record<string, LetterScore>, row: Row): Record<string, LetterScore> {
  const next = { ...prev };
  [...row.word].forEach((ch, i) => {
    const s = row.scores[i];
    if (!next[ch] || RANK[s] > RANK[next[ch]]) next[ch] = s;
  });
  return next;
}

export function keyboardState(rows: Row[]): Record<string, LetterScore> {
  return rows.reduce<Record<string, LetterScore>>(mergeKeyboardState, {});
}

// ---------- Svårt läge ----------

export type HardModeViolation =
  | { kind: "position"; index: number; letter: string }
  | { kind: "missing"; letter: string; count: number };

/**
 * Gröna bokstäver måste stå kvar på sin plats, och varje avslöjad bokstav måste
 * finnas minst lika många gånger som den mest avslöjande tidigare raden visar.
 */
export function validateHardMode(guess: string, rows: Row[]): HardModeViolation | null {
  const g = [...guess];
  for (const row of rows) {
    const w = [...row.word];
    for (let i = 0; i < w.length; i++) {
      if (row.scores[i] === "correct" && g[i] !== w[i]) return { kind: "position", index: i, letter: w[i] };
    }
  }
  const required = new Map<string, number>();
  for (const row of rows) {
    const counts = new Map<string, number>();
    [...row.word].forEach((ch, i) => {
      if (row.scores[i] !== "absent") counts.set(ch, (counts.get(ch) ?? 0) + 1);
    });
    for (const [ch, n] of counts) required.set(ch, Math.max(required.get(ch) ?? 0, n));
  }
  for (const [ch, n] of required) {
    if (g.filter((x) => x === ch).length < n) return { kind: "missing", letter: ch, count: n };
  }
  return null;
}

const COUNT_WORDS = ["", "", "två", "tre", "fyra", "fem", "sex", "sju", "åtta"];

export function hardModeMessage(v: HardModeViolation): string {
  const L = v.letter.toUpperCase();
  if (v.kind === "position") return `Bokstav ${v.index + 1} måste vara ${L}`;
  return v.count > 1 ? `Ordet måste innehålla ${COUNT_WORDS[v.count] ?? v.count} ${L}` : `Ordet måste innehålla ${L}`;
}

// ---------- Session ----------

export type SessionState = "ongoing" | "won" | "lost";
export type Session = {
  date: string;
  length: WordLength;
  state: SessionState;
  /** Svårt läge låses vid första gissningen. */
  hard: boolean;
  rows: Row[];
  startedAt: string;
  finishedAt: string | null;
};

export function newSession(date: string, length: WordLength, now = new Date()): Session {
  return { date, length, state: "ongoing", hard: false, rows: [], startedAt: now.toISOString(), finishedAt: null };
}

export function applyGuess(session: Session, guess: string, answer: string, opts: { hard?: boolean } = {}, now = new Date()): Session {
  if (session.state !== "ongoing") throw new Error("SESSION_FINISHED");
  if ([...guess].length !== session.length) throw new Error("WRONG_LENGTH");
  const hard = session.rows.length === 0 ? !!opts.hard : session.hard;
  if (hard && validateHardMode(guess, session.rows)) throw new Error("HARD_MODE");
  const scores = scoreGuess(guess, answer);
  const rows = [...session.rows, { word: guess, scores }];
  let state: SessionState = "ongoing";
  if (scores.every((s) => s === "correct")) state = "won";
  else if (rows.length >= MAX_GUESSES) state = "lost";
  return { ...session, hard, rows, state, finishedAt: state === "ongoing" ? null : now.toISOString() };
}

// ---------- Schema ----------

export type Schedule = Record<string, Record<WordLength, string>>;

/**
 * Förlänger ett fryst schema fram till och med `until`. Befintliga dagar ändras
 * aldrig. Varje längd går igenom sina svar i en fast slumpordning och ett ord
 * återkommer inte förrän alla andra har använts.
 */
export function extendSchedule(schedule: Schedule, answers: Record<WordLength, string[]>, until: string): Schedule {
  const next: Schedule = { ...schedule };
  const dates = Object.keys(schedule).sort();
  let date = dates.length ? addDays(dates[dates.length - 1], 1) : GAME_START_DATE;
  const used = new Map<WordLength, Set<string>>(LENGTHS.map((l) => [l, new Set(dates.map((d) => schedule[d][l]))]));
  const order = new Map<WordLength, string[]>(LENGTHS.map((l) => [l, seededShuffle([...answers[l]].sort(), `ordet:${l}:v1`)]));
  while (date <= until) {
    const day = {} as Record<WordLength, string>;
    for (const l of LENGTHS) {
      const pool = order.get(l)!;
      if (pool.length === 0) throw new Error(`Inga svar med ${l} bokstäver`);
      let pick = pool.find((w) => !used.get(l)!.has(w));
      if (!pick) {
        // Alla ord har använts – börja om.
        used.set(l, new Set());
        pick = pool[0];
      }
      used.get(l)!.add(pick);
      day[l] = pick;
    }
    next[date] = day;
    date = addDays(date, 1);
  }
  return next;
}

// ---------- Delning ----------

export function rowEmoji(scores: LetterScore[], colorblind = false): string {
  const map: Record<LetterScore, string> = colorblind
    ? { correct: "🟦", present: "🟧", absent: "⬜" }
    : { correct: "🟩", present: "🟨", absent: "⬜" };
  return scores.map((s) => map[s]).join("");
}

export function shareText(
  session: Pick<Session, "date" | "length" | "state" | "rows" | "hard">,
  url: string,
  colorblind = false,
): string {
  const score = session.state === "won" ? session.rows.length : "X";
  const head = `Ordet #${challengeNumber(session.date)} · ${session.length} bokstäver · ${score}/${MAX_GUESSES}${session.hard ? "*" : ""}`;
  const grid = session.rows.map((r) => rowEmoji(r.scores, colorblind)).join("\n");
  return `${head}\n${grid}\n${url}`;
}

// ---------- Statistik ----------

export type { Stats };

export function computeStats(sessions: Session[], length: WordLength, today: string): Stats {
  const games = sessions
    .filter((s) => s.length === length && s.state !== "ongoing")
    .map((s) => ({ date: s.date, won: s.state === "won", attempts: s.rows.length }));
  return computeSharedStats(games, MAX_GUESSES, today);
}

export type DailyStats = {
  players: number;
  finished: number;
  /** index 0–5 = löst på 1–6 gissningar, index 6 = förlust. Null tills tillräckligt många spelat. */
  distribution: number[] | null;
};

/** Dagens aggregat för en utmaning (alla spelares sessioner för samma datum och längd). */
export function computeDailyStats(sessions: Pick<Session, "state" | "rows">[]): DailyStats {
  const finished = sessions.filter((s) => s.state !== "ongoing");
  const distribution = Array(MAX_GUESSES + 1).fill(0);
  for (const s of finished) distribution[s.state === "won" ? s.rows.length - 1 : MAX_GUESSES]++;
  return {
    players: sessions.filter((s) => s.rows.length > 0).length,
    finished: finished.length,
    distribution: finished.length >= MIN_PLAYERS_FOR_DISTRIBUTION ? distribution : null,
  };
}

/** Andel (0–100) av dagens spelare som behövde fler gissningar eller inte klarade det. */
export function percentileBeaten(daily: DailyStats, session: Pick<Session, "state" | "rows">): number | null {
  if (!daily.distribution || session.state !== "won") return null;
  const mine = session.rows.length - 1;
  const worse = daily.distribution.slice(mine + 1).reduce((a, b) => a + b, 0);
  return Math.round((worse / daily.finished) * 100);
}
