import type { DailyStats, Session, Stats, WordLength } from "./ordet";

export type PublicSession = Pick<Session, "date" | "length" | "state" | "hard" | "rows"> & {
  /** Svaret lämnas bara ut när rundan är avslutad. */
  answer: string | null;
};

export type LengthState = {
  length: WordLength;
  session: PublicSession;
  /** Alla spelares resultat för den här längden idag – bara när den egna rundan är klar. */
  daily: DailyStats | null;
};

export type GameState = {
  today: string;
  date: string;
  number: number;
  msUntilNext: number;
  isArchive: boolean;
  lengths: LengthState[];
  stats: Record<WordLength, Stats>;
};

export type GuessResponse = { length: LengthState; stats: Stats };
