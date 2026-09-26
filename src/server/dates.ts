import "server-only";
import { addDays, startOfStockholmDay, stockholmDate } from "@/lib/time";
import { GameError } from "./errors";

const GRACE_MS = 30 * 60_000;
export const IS_DEV = process.env.NODE_ENV !== "production";

/**
 * Vilket datum en förfrågan gäller. Utveckling: valfritt tidigare datum från
 * spelets start. Strax efter midnatt får gårdagens påbörjade spel spelas klart.
 */
export function resolveDate(
  requested: string | null | undefined,
  gameStartDate: string,
  now = new Date(),
): { date: string; today: string } {
  const today = stockholmDate(now);
  if (!requested || requested === today) return { date: today, today };
  if (IS_DEV && requested >= gameStartDate && requested < today) return { date: requested, today };
  const inGrace = requested === addDays(today, -1) && now.getTime() - startOfStockholmDay(today).getTime() < GRACE_MS;
  if (inGrace) return { date: requested, today };
  throw new GameError("DATE_NOT_ALLOWED", 403);
}
