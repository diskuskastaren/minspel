import "server-only";
import { GAMES, activityStreak, lastWeek, type DaySummary, type GameSlug, type Today } from "@/game-engine/hub";
import { msUntilNextDay, stockholmDate } from "@/lib/time";
import * as ordet from "./ordet-service";
import * as oronmask from "./oronmask-service";
import * as rattstavat from "./rattstavat-service";

const SERVICES: Record<GameSlug, { daySummary: (deviceId: string, date: string) => DaySummary; finishedDates: (deviceId: string) => string[] }> = {
  oronmask,
  ordet,
  rattstavat,
};

/** Dagens läge i alla spel för en spelare: checklista, veckoremsa och streak. */
export function getToday(deviceId: string, now = new Date()): Today {
  const date = stockholmDate(now);
  const games = GAMES.map((g) => ({ ...g, ...SERVICES[g.slug].daySummary(deviceId, date) }));
  const dates = GAMES.flatMap((g) => SERVICES[g.slug].finishedDates(deviceId));
  return {
    date,
    msUntilNext: msUntilNextDay(now),
    games,
    allDone: games.every((g) => g.finished),
    week: lastWeek(dates, date),
    streak: activityStreak(dates, date),
  };
}
