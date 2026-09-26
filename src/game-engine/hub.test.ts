import { describe, expect, it } from "vitest";
import { activityStreak, lastWeek, nextGame } from "./hub";

describe("hubb", () => {
  it("streak räknas till idag eller igår", () => {
    expect(activityStreak(["2026-09-24", "2026-09-25", "2026-09-26"], "2026-09-26")).toEqual({ current: 3, best: 3 });
    expect(activityStreak(["2026-09-24", "2026-09-25"], "2026-09-26")).toEqual({ current: 2, best: 2 });
    expect(activityStreak(["2026-09-20", "2026-09-21", "2026-09-22", "2026-09-25"], "2026-09-27")).toEqual({ current: 0, best: 3 });
    expect(activityStreak([], "2026-09-26")).toEqual({ current: 0, best: 0 });
  });
  it("streak över månads- och sommartidsskifte", () => {
    expect(activityStreak(["2026-10-24", "2026-10-25", "2026-10-26"], "2026-10-26").current).toBe(3);
    expect(activityStreak(["2026-09-30", "2026-10-01"], "2026-10-01").current).toBe(2);
  });
  it("veckoremsan", () => {
    const w = lastWeek(["2026-09-26", "2026-09-21"], "2026-09-26");
    expect(w.map((d) => d.date)).toEqual(["2026-09-20", "2026-09-21", "2026-09-22", "2026-09-23", "2026-09-24", "2026-09-25", "2026-09-26"]);
    expect(w.filter((d) => d.played).map((d) => d.date)).toEqual(["2026-09-21", "2026-09-26"]);
  });
  it("nästa spel hoppar över klara och börjar om", () => {
    const g = [
      { slug: "oronmask" as const, finished: false },
      { slug: "ordet" as const, finished: true },
      { slug: "rattstavat" as const, finished: false },
    ];
    expect(nextGame(g, "ordet")?.slug).toBe("rattstavat");
    expect(nextGame(g, "rattstavat")?.slug).toBe("oronmask");
    expect(nextGame(g, null)?.slug).toBe("oronmask");
    expect(nextGame(g.map((x) => ({ ...x, finished: true })), "ordet")).toBeNull();
  });
});
