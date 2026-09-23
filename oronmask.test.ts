import { describe, expect, it } from "vitest";
import {
  applyMove,
  challengeNumber,
  computeStats,
  judgeGuess,
  newSession,
  scheduleForDate,
  shareText,
  unlockedSeconds,
  type CatalogSong,
  type Session,
} from "./oronmask";

const answer = { id: 1, title: "Dancing Queen", artistIds: [10], artistNames: ["ABBA"] };

describe("judgeGuess", () => {
  it("rätt låt via id", () => {
    expect(judgeGuess(answer, { ...answer })).toBe("correct");
  });
  it("rätt låt i annan version räknas som rätt", () => {
    expect(judgeGuess(answer, { id: 2, title: "Dancing Queen - Remastered 2001", artistIds: [10], artistNames: ["ABBA"] })).toBe("correct");
  });
  it("samma titel av annan artist är fel", () => {
    expect(judgeGuess(answer, { id: 3, title: "Dancing Queen", artistIds: [99], artistNames: ["Cover Band"] })).toBe("wrong");
  });
  it("rätt artist fel låt ger 'artist'", () => {
    expect(judgeGuess(answer, { id: 4, title: "Waterloo", artistIds: [10], artistNames: ["ABBA"] })).toBe("artist");
  });
  it("artist matchas på namn om id skiljer", () => {
    expect(judgeGuess(answer, { id: 5, title: "SOS", artistIds: [77], artistNames: ["Abba"] })).toBe("artist");
  });
  it("medverkande artist räknas", () => {
    const duet = { id: 6, title: "Hela huset", artistIds: [1, 2], artistNames: ["Veronica Maggio", "Håkan Hellström"] };
    expect(judgeGuess(duet, { id: 7, title: "Känn ingen sorg för mig Göteborg", artistIds: [2], artistNames: ["Håkan Hellström"] })).toBe("artist");
  });
});

describe("session", () => {
  it("vinst på andra försöket", () => {
    let s = newSession("2026-09-23", "pop");
    s = applyMove(s, { kind: "skip" });
    expect(unlockedSeconds(s)).toBe(1);
    s = applyMove(s, { kind: "guess", trackId: 1, title: "x", artist: "y", result: "correct" });
    expect(s.state).toBe("won");
    expect(s.finishedAt).not.toBeNull();
    expect(unlockedSeconds(s)).toBe(30);
  });
  it("förlust efter sex försök och inga fler drag", () => {
    let s = newSession("2026-09-23", "pop");
    for (let i = 0; i < 6; i++) s = applyMove(s, { kind: "skip" });
    expect(s.state).toBe("lost");
    expect(() => applyMove(s, { kind: "skip" })).toThrow("SESSION_FINISHED");
  });
  it("tidsstegen", () => {
    let s = newSession("2026-09-23", "pop");
    const seen = [unlockedSeconds(s)];
    for (let i = 0; i < 5; i++) {
      s = applyMove(s, { kind: "guess", trackId: 9, title: "a", artist: "b", result: "wrong" });
      seen.push(unlockedSeconds(s));
    }
    expect(seen).toEqual([0.5, 1, 2, 4, 8, 15]);
  });
});

function song(id: number, cats: CatalogSong["cats"]): CatalogSong {
  return { id, title: `T${id}`, artist: "A", artistIds: [id], artistNames: ["A"], cats, year: null, cover: null, link: "", rank: 0 };
}

describe("scheduleForDate", () => {
  const catalog = [
    ...Array.from({ length: 5 }, (_, i) => song(i + 1, ["alla", "pop"])),
    ...Array.from({ length: 5 }, (_, i) => song(i + 11, ["alla", "hiphop"])),
    ...Array.from({ length: 5 }, (_, i) => song(i + 21, ["alla", "mello"])),
    ...Array.from({ length: 5 }, (_, i) => song(i + 31, ["alla"])),
  ];
  it("är deterministiskt", () => {
    expect(scheduleForDate(catalog, "2026-09-23")).toEqual(scheduleForDate([...catalog].reverse(), "2026-09-23"));
  });
  it("olika kategorier får olika låtar samma dag", () => {
    for (let d = 0; d < 30; d++) {
      const date = new Date(Date.UTC(2026, 8, 1 + d)).toISOString().slice(0, 10);
      const ids = Object.values(scheduleForDate(catalog, date)).map((s) => s.id);
      expect(new Set(ids).size).toBe(ids.length);
    }
  });
  it("en kategori upprepar ingen låt förrän poolen är slut", () => {
    const ids = Array.from({ length: 5 }, (_, d) =>
      scheduleForDate(catalog, new Date(Date.UTC(2026, 8, 1 + d)).toISOString().slice(0, 10)).pop.id,
    );
    expect(new Set(ids).size).toBe(5);
  });
});

describe("delning och statistik", () => {
  it("delningstext", () => {
    let s = newSession("2026-09-23", "hiphop");
    s = applyMove(s, { kind: "guess", trackId: 1, title: "a", artist: "b", result: "artist" });
    s = applyMove(s, { kind: "skip" });
    s = applyMove(s, { kind: "guess", trackId: 1, title: "a", artist: "b", result: "correct" });
    expect(challengeNumber("2026-09-23")).toBe(23);
    expect(shareText(s, "http://x/oronmask")).toBe(
      "Öronmask #23 · Svensk hiphop\n🟨⬛🟩⬜⬜⬜\nHörde den på 2 s 🎧\nhttp://x/oronmask",
    );
  });
  it("streak och fördelning", () => {
    const mk = (date: string, won: boolean, moves: number): Session => ({
      date,
      category: "pop",
      state: won ? "won" : "lost",
      moves: Array.from({ length: moves }, () => ({ kind: "skip" as const })),
      startedAt: "",
      finishedAt: "",
    });
    const stats = computeStats(
      [mk("2026-09-18", true, 1), mk("2026-09-19", false, 6), mk("2026-09-20", true, 2), mk("2026-09-21", true, 3), mk("2026-09-22", true, 1)],
      "pop",
      "2026-09-23",
    );
    expect(stats.played).toBe(5);
    expect(stats.won).toBe(4);
    expect(stats.bestStreak).toBe(3);
    expect(stats.currentStreak).toBe(3);
    expect(stats.distribution).toEqual([2, 1, 1, 0, 0, 0, 1]);
  });
});
