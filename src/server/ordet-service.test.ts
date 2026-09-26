import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { LENGTHS } from "@/game-engine/ordet";
import { addDays, stockholmDate } from "@/lib/time";
import { GameError } from "./errors";

// Integrationstest mot tjänstelagret med egna ordlistor och tillfällig lagring.
const dir = mkdtempSync(path.join(tmpdir(), "klurig-ordet-"));
process.env.KLURIG_DATA_DIR = path.join(dir, "data");
process.env.KLURIG_ORDET_DIR = dir;

const today = stockholmDate();
const ANSWERS = { 3: "älg", 4: "fika", 5: "kaffe", 6: "lingon", 7: "fönster", 8: "trädgård" } as const;
const GUESSES = ["båt", "tåg", "glass", "björk", "stuga", "fjäll", "kakor", "glöms", "sagor"];

const { getState, makeGuess } = await import("./ordet-service");

async function expectCode(fn: () => unknown, code: string, status?: number) {
  try {
    fn();
  } catch (e) {
    expect(e).toBeInstanceOf(GameError);
    expect((e as GameError).code).toBe(code);
    if (status) expect((e as GameError).status).toBe(status);
    return;
  }
  throw new Error(`förväntade ${code}`);
}

beforeAll(() => {
  const words: Record<number, string[]> = {};
  for (const l of LENGTHS) words[l] = [...GUESSES, ...Object.values(ANSWERS)].filter((w) => [...w].length === l);
  writeFileSync(path.join(dir, "gissningar.json"), JSON.stringify({ words }));
  const days = { [today]: ANSWERS, [addDays(today, -1)]: ANSWERS };
  writeFileSync(path.join(dir, "schema.json"), JSON.stringify({ days }));
});
afterAll(() => rmSync(dir, { recursive: true, force: true }));

describe("ordet-service", () => {
  it("state innehåller aldrig svaret före avslut", () => {
    const json = JSON.stringify(getState("dev-a"));
    for (const answer of Object.values(ANSWERS)) expect(json).not.toContain(`"${answer}"`);
    makeGuess("dev-a", { length: 5, idx: 0, word: "glass", hard: false });
    expect(JSON.stringify(getState("dev-a"))).not.toContain("kaffe");
  });

  it("svaret kommer med när rundan är slut", () => {
    const r = makeGuess("dev-b", { length: 5, idx: 0, word: "KAFFE", hard: false });
    expect(r.length.session.state).toBe("won");
    expect(r.length.session.answer).toBe("kaffe");
    expect(r.length.daily?.finished).toBe(1);
    expect(r.length.daily?.distribution).toBeNull(); // färre än 30 spelare
    expect(r.stats.played).toBe(1);
  });

  it("dragindex utanför ordning ger 409, upprepat drag är idempotent", async () => {
    await expectCode(() => makeGuess("dev-c", { length: 5, idx: 1, word: "glass", hard: false }), "MOVE_OUT_OF_ORDER", 409);
    const first = makeGuess("dev-c", { length: 5, idx: 0, word: "glass", hard: false });
    const again = makeGuess("dev-c", { length: 5, idx: 0, word: "glass", hard: false });
    expect(again.length.session.rows).toEqual(first.length.session.rows);
    await expectCode(() => makeGuess("dev-c", { length: 5, idx: 0, word: "björk", hard: false }), "MOVE_OUT_OF_ORDER", 409);
  });

  it("ord som inte finns i ordlistan förbrukar inget försök", async () => {
    await expectCode(() => makeGuess("dev-d", { length: 5, idx: 0, word: "qwert", hard: false }), "NOT_IN_WORD_LIST", 422);
    await expectCode(() => makeGuess("dev-d", { length: 5, idx: 0, word: "båt", hard: false }), "WRONG_LENGTH", 400);
    await expectCode(() => makeGuess("dev-d", { length: 5, idx: 0, word: "ka ffe", hard: false }), "VALIDATION_ERROR", 400);
    expect(getState("dev-d").lengths.find((l) => l.length === 5)!.session.rows).toHaveLength(0);
  });

  it("svårt läge kontrolleras på servern och låses vid första gissningen", async () => {
    makeGuess("dev-e", { length: 5, idx: 0, word: "stuga", hard: true }); // mot kaffe: a gul
    await expectCode(() => makeGuess("dev-e", { length: 5, idx: 1, word: "björk", hard: false }), "HARD_MODE", 422);
    const ok = makeGuess("dev-e", { length: 5, idx: 1, word: "kakor", hard: false });
    expect(ok.length.session.hard).toBe(true);
  });

  it("avslutad runda går inte att spela vidare", async () => {
    for (let i = 0; i < 6; i++) makeGuess("dev-f", { length: 3, idx: i, word: "båt", hard: false });
    const s = getState("dev-f").lengths.find((l) => l.length === 3)!.session;
    expect(s.state).toBe("lost");
    expect(s.answer).toBe("älg");
    await expectCode(() => makeGuess("dev-f", { length: 3, idx: 6, word: "tåg", hard: false }), "SESSION_FINISHED", 409);
  });

  it("framtida datum är inte tillåtna", async () => {
    await expectCode(() => getState("dev-g", addDays(today, 1)), "DATE_NOT_ALLOWED", 403);
  });

  it("datum utan schemalagt ord ger NO_CHALLENGE", async () => {
    await expectCode(() => getState("dev-g", addDays(today, -2)), "NO_CHALLENGE", 503);
  });
});
