import type { WordLength } from "@/game-engine/ordet";
import type { GameState, GuessResponse } from "@/game-engine/ordet-api-types";

export class ApiError extends Error {
  constructor(public code: string) {
    super(code);
  }
}

async function call<T>(url: string, init?: RequestInit): Promise<T> {
  let res: Response;
  try {
    res = await fetch(url, { cache: "no-store", ...init });
  } catch {
    throw new ApiError("NETWORK");
  }
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new ApiError((json as { code?: string }).code ?? "INTERNAL_ERROR");
  return json as T;
}

const q = (date: string | null) => (date ? `?datum=${date}` : "");

export const api = {
  state: (date: string | null) => call<GameState>(`/api/ordet/state${q(date)}`),
  guess: (body: { langd: WordLength; idx: number; ord: string; svart: boolean; datum: string | null }) =>
    call<GuessResponse>("/api/ordet/guess", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }),
  devReset: (date: string | null) => call<{ ok: true }>(`/api/ordet/dev-reset${q(date)}`, { method: "POST" }),
};

export const ERROR_TEXT: Record<string, string> = {
  NETWORK: "Ingen anslutning – kontrollera nätet och försök igen.",
  NOT_IN_WORD_LIST: "Det ordet finns inte i vår ordlista",
  WRONG_LENGTH: "Fel antal bokstäver",
  HARD_MODE: "Svårt läge: använd det du redan vet",
  DATE_NOT_ALLOWED: "Dagens ord är slut. Ladda om för att spela de nya!",
  MOVE_OUT_OF_ORDER: "Spelet uppdaterades i en annan flik. Vi laddar om din runda.",
  SESSION_FINISHED: "Den här rundan är redan avslutad.",
  NO_CHALLENGE: "Det finns inget ord schemalagt för i dag. Kör npm run ordet:schema.",
  VALIDATION_ERROR: "Något blev fel i förfrågan.",
  INTERNAL_ERROR: "Något gick snett. Försök igen.",
};
export const errorText = (e: unknown) => ERROR_TEXT[e instanceof ApiError ? e.code : "INTERNAL_ERROR"] ?? ERROR_TEXT.INTERNAL_ERROR;
