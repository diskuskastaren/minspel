import type { CategorySlug } from "@/game-engine/oronmask";
import type { GameState, MoveResponse, SearchHit } from "@/game-engine/oronmask-api-types";

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

const dateParam = (date: string | null) => (date ? `&datum=${date}` : "");

export const api = {
  state: (date: string | null) => call<GameState>(`/api/oronmask/state?${dateParam(date).slice(1)}`),
  move: (body: { kategori: CategorySlug; idx: number; trackId: number | null; datum: string | null }) =>
    call<MoveResponse>("/api/oronmask/guess", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }),
  search: (q: string, signal: AbortSignal) =>
    call<{ hits: SearchHit[] }>(`/api/oronmask/search?q=${encodeURIComponent(q)}`, { signal }).then((r) => r.hits),
  clipUrl: (category: CategorySlug, date: string | null, moves: number) =>
    `/api/oronmask/clip?kategori=${category}${dateParam(date)}&n=${moves}`,
  devReset: (date: string | null) => call<{ ok: true }>(`/api/oronmask/dev-reset?${dateParam(date).slice(1)}`, { method: "POST" }),
};

export const ERROR_TEXT: Record<string, string> = {
  NETWORK: "Ingen anslutning – kontrollera nätet och försök igen.",
  DATE_NOT_ALLOWED: "Dagens runda är slut. Ladda om för att spela den nya!",
  MOVE_OUT_OF_ORDER: "Spelet uppdaterades i en annan flik. Vi laddar om din runda.",
  SESSION_FINISHED: "Den här rundan är redan avslutad.",
  TRACK_NOT_FOUND: "Vi hittade inte den låten – välj en annan.",
  UPSTREAM_ERROR: "Musiktjänsten svarar inte just nu. Försök igen om en stund.",
  VALIDATION_ERROR: "Något blev fel i förfrågan.",
  INTERNAL_ERROR: "Något gick snett. Försök igen.",
};
export const errorText = (e: unknown) => ERROR_TEXT[e instanceof ApiError ? e.code : "INTERNAL_ERROR"] ?? ERROR_TEXT.INTERNAL_ERROR;
