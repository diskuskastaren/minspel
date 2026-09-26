import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { addDays, stockholmDate } from "@/lib/time";
import { GameError } from "./errors";

// Integrationstest mot tjänstelagret med egen ordlista och tillfällig lagring.
const dir = mkdtempSync(path.join(tmpdir(), "klurig-rattstavat-"));
process.env.KLURIG_DATA_DIR = path.join(dir, "data");
process.env.KLURIG_RATTSTAVAT_DIR = dir;

const today = stockholmDate();
const WORDS = ["fönster", "stjärna", "restaurang", "chaufför", "reservoar"];
const { getState, answer, audio } = await import("./rattstavat-service");

function expectCode(fn: () => unknown, code: string, status: number) {
  try {
    fn();
  } catch (e) {
    expect(e).toBeInstanceOf(GameError);
    expect((e as GameError).code).toBe(code);
    expect((e as GameError).status).toBe(status);
    return;
  }
  throw new Error(`förväntade ${code}`);
}

beforeAll(() => {
  const words = WORDS.map((ord, i) => ({
    ord,
    niva: i + 1,
    definition: `Förklaring ${i + 1}.`,
    mening: `Här står ___ nummer ${i + 1}.`,
    ursprung: i === 3 ? { sprak: "franska", fran: "chauffeur" } : null,
  }));
  writeFileSync(path.join(dir, "ord.json"), JSON.stringify({ words }));
  const day = Object.fromEntries(WORDS.map((w, i) => [i + 1, w]));
  writeFileSync(path.join(dir, "schema.json"), JSON.stringify({ days: { [today]: day } }));
});
afterAll(() => rmSync(dir, { recursive: true, force: true }));

describe("rattstavat-service", () => {
  it("inget ord och inga kommande rundor lämnas ut före svar", () => {
    const st = getState("dev-a");
    const json = JSON.stringify(st);
    for (const w of WORDS) expect(json).not.toContain(w);
    expect(st.rounds[0].definition).toBe("Förklaring 1.");
    expect(st.rounds[0].sentence).toBe("Här står ___ nummer 1.");
    expect(st.rounds[1].definition).toBeNull();
    expect(st.rounds[3].originLanguage).toBeNull();
    expect(st.rounds[0].audio).toBe("talsyntes");
  });

  it("svar avslöjar rätt stavning och nästa runda", () => {
    const st = answer("dev-b", { round: 0, text: " Fönster " });
    expect(st.rounds[0].result).toMatchObject({ input: "fönster", correct: true, word: "fönster", sentence: "Här står fönster nummer 1." });
    expect(st.rounds[0].result?.daily).toEqual({ answered: 1, correct: 1 });
    expect(st.current).toBe(1);
    expect(st.rounds[1].definition).toBe("Förklaring 2.");
    expect(JSON.stringify(st)).not.toContain("stjärna");
  });

  it("fel stavning räknas och ursprunget visas efter svar", () => {
    let st = answer("dev-c", { round: 0, text: "fönster" });
    st = answer("dev-c", { round: 1, text: "stjärna" });
    st = answer("dev-c", { round: 2, text: "restorang" });
    expect(st.rounds[2].result?.correct).toBe(false);
    expect(st.rounds[3].originLanguage).toBe("franska");
    st = answer("dev-c", { round: 3, text: "chaufför" });
    expect(st.rounds[3].result?.origin).toEqual({ sprak: "franska", fran: "chauffeur" });
    st = answer("dev-c", { round: 4, text: "reservoar" });
    expect(st.state).toBe("finished");
    expect(st.score).toBe(4);
    expect(st.stats.played).toBe(1);
    expect(st.stats.distribution[4]).toBe(1);
    expectCode(() => answer("dev-c", { round: 5, text: "x" }), "SESSION_FINISHED", 409);
  });

  it("ordning och idempotens", () => {
    expectCode(() => answer("dev-d", { round: 1, text: "stjärna" }), "MOVE_OUT_OF_ORDER", 409);
    const a = answer("dev-d", { round: 0, text: "fönstr" });
    const b = answer("dev-d", { round: 0, text: "fönstr" });
    expect(b.rounds[0].result).toEqual(a.rounds[0].result);
    expectCode(() => answer("dev-d", { round: 0, text: "fönster" }), "MOVE_OUT_OF_ORDER", 409);
  });

  it("ogiltiga svar avvisas utan att förbruka rundan", () => {
    expectCode(() => answer("dev-e", { round: 0, text: "   " }), "VALIDATION_ERROR", 400);
    expectCode(() => answer("dev-e", { round: 0, text: "fön5ter" }), "VALIDATION_ERROR", 400);
    expect(getState("dev-e").current).toBe(0);
  });

  it("uppläsning: bara upplåsta rundor, fil går före talsyntes", () => {
    expect(audio("dev-f", { round: 0, kind: "ord" })).toEqual({ kind: "text", text: "fönster" });
    expect(audio("dev-f", { round: 0, kind: "mening" })).toEqual({ kind: "text", text: "Här står fönster nummer 1." });
    expectCode(() => audio("dev-f", { round: 1, kind: "ord" }), "ROUND_LOCKED", 403);
    mkdirSync(path.join(dir, "ljud"), { recursive: true });
    for (const k of ["ord", "definition", "mening"]) writeFileSync(path.join(dir, "ljud", `fönster-${k}.mp3`), new Uint8Array([1, 2, 3]));
    expect(audio("dev-f", { round: 0, kind: "ord" })).toEqual({ kind: "mp3", bytes: new Uint8Array([1, 2, 3]) });
    expect(getState("dev-f").rounds[0].audio).toBe("fil");
  });

  it("framtida datum är inte tillåtna", () => {
    expectCode(() => getState("dev-g", addDays(today, 1)), "DATE_NOT_ALLOWED", 403);
  });
});
