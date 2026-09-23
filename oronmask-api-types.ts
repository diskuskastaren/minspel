import type { CategorySlug, Session, Stats } from "./oronmask";

export type Reveal = {
  title: string;
  artist: string;
  year: number | null;
  cover: string | null;
  deezerLink: string;
  spotifyUrl: string;
  previewUrl: string | null;
};

export type PublicSession = Pick<Session, "date" | "category" | "state" | "moves"> & {
  unlocked: number;
  answer: Reveal | null;
};

export type GameState = {
  today: string;
  date: string;
  number: number;
  msUntilNext: number;
  isArchive: boolean;
  categories: { slug: CategorySlug; name: string; short: string; session: PublicSession }[];
  stats: Record<CategorySlug, Stats>;
};

export type MoveResponse = { session: PublicSession; stats: Stats };
export type SearchHit = { id: number; title: string; artist: string };
export type ApiError = { code: string };
