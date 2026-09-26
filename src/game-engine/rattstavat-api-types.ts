import type { Level, Origin, RoundDaily, SessionState, SpellingStats } from "./rattstavat";

export type RoundResult = {
  input: string;
  correct: boolean;
  /** Rätt stavning – lämnas ut först när rundan är besvarad. */
  word: string;
  origin: Origin | null;
  /** Exempelmeningen med ordet ifyllt. */
  sentence: string;
  daily: RoundDaily;
};

export type PublicRound = {
  index: number;
  level: Level;
  /** Texterna visas för besvarade rundor och den aktuella, inte för kommande. */
  definition: string | null;
  /** Exempelmeningen med ordet maskerat som ___. */
  sentence: string | null;
  originLanguage: string | null;
  /** "fil" = förgenererad uppläsning, "talsyntes" = webbläsarens röst (bara lokalt). */
  audio: "fil" | "talsyntes";
  result: RoundResult | null;
};

export type GameState = {
  today: string;
  date: string;
  number: number;
  msUntilNext: number;
  isArchive: boolean;
  state: SessionState;
  /** Index för rundan som spelas nu (= antal besvarade). */
  current: number;
  score: number;
  rounds: PublicRound[];
  stats: SpellingStats;
};

export type AudioKind = "ord" | "definition" | "mening";
