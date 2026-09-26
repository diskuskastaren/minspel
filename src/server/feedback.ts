import "server-only";
import { appendFileSync, mkdirSync } from "node:fs";
import path from "node:path";
import { GameError } from "./errors";

const KINDS = ["bugg", "forslag", "annat"];
const GAMES = ["oronmask", "ordet", "rattstavat"];
const LIMIT = 5;
const WINDOW_MS = 60 * 60_000;
const recent = new Map<string, number[]>();

export type FeedbackInput = { typ: unknown; text: unknown; spel: unknown; sida: unknown };

/** Sparar feedback som en rad JSON i .data/feedback.jsonl (byts mot databas före publicering). */
export function saveFeedback(deviceId: string, input: FeedbackInput, now = Date.now()): void {
  const text = typeof input.text === "string" ? input.text.trim() : "";
  if (!KINDS.includes(input.typ as string) || !text || text.length > 1000) throw new GameError("VALIDATION_ERROR", 400);
  const spel = GAMES.includes(input.spel as string) ? (input.spel as string) : null;
  const sida = typeof input.sida === "string" && /^\/[\w\-/åäö]*$/.test(input.sida) ? input.sida.slice(0, 80) : null;

  // Enkel begränsning per enhet: högst fem meddelanden i timmen.
  const times = (recent.get(deviceId) ?? []).filter((t) => now - t < WINDOW_MS);
  if (times.length >= LIMIT) throw new GameError("RATE_LIMITED", 429);
  recent.set(deviceId, [...times, now]);

  const dir = process.env.KLURIG_DATA_DIR ?? path.join(process.cwd(), ".data");
  mkdirSync(dir, { recursive: true });
  appendFileSync(path.join(dir, "feedback.jsonl"), JSON.stringify({ at: new Date(now).toISOString(), typ: input.typ, spel, sida, text }) + "\n");
}
