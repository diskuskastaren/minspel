import type { AudioKind, GameState } from "@/game-engine/rattstavat-api-types";

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

/** Förgenererad MP3 eller text som webbläsaren läser upp själv (bara lokalt). */
export type AudioSource = { kind: "mp3"; url: string } | { kind: "text"; text: string };

export const api = {
  state: (date: string | null) => call<GameState>(`/api/rattstavat/state${date ? `?datum=${date}` : ""}`),
  answer: (body: { runda: number; svar: string; datum: string | null }) =>
    call<GameState>("/api/rattstavat/answer", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }),
  audio: async (round: number, kind: AudioKind, date: string | null): Promise<AudioSource> => {
    let res: Response;
    try {
      res = await fetch(`/api/rattstavat/ljud?runda=${round}&typ=${kind}${dateParam(date)}`, { cache: "no-store" });
    } catch {
      throw new ApiError("NETWORK");
    }
    if (!res.ok) throw new ApiError(((await res.json().catch(() => ({}))) as { code?: string }).code ?? "INTERNAL_ERROR");
    if (res.headers.get("Content-Type")?.includes("audio/")) return { kind: "mp3", url: URL.createObjectURL(await res.blob()) };
    return { kind: "text", text: ((await res.json()) as { text: string }).text };
  },
  devReset: (date: string | null) => call<{ ok: true }>(`/api/rattstavat/dev-reset${date ? `?datum=${date}` : ""}`, { method: "POST" }),
};

export const ERROR_TEXT: Record<string, string> = {
  NETWORK: "Ingen anslutning – kontrollera nätet och försök igen.",
  VALIDATION_ERROR: "Skriv ordet med bokstäver.",
  DATE_NOT_ALLOWED: "Dagens ord är slut. Ladda om för att spela de nya!",
  MOVE_OUT_OF_ORDER: "Spelet uppdaterades i en annan flik. Vi laddar om din runda.",
  SESSION_FINISHED: "Dagens runda är redan klar.",
  ROUND_LOCKED: "Det ordet är inte upplåst än.",
  NO_AUDIO: "Uppläsningen saknas för det här ordet.",
  NO_CHALLENGE: "Det finns inga ord schemalagda för i dag. Kör npm run rattstavat:schema.",
  INTERNAL_ERROR: "Något gick snett. Försök igen.",
};
export const errorText = (e: unknown) => ERROR_TEXT[e instanceof ApiError ? e.code : "INTERNAL_ERROR"] ?? ERROR_TEXT.INTERNAL_ERROR;
