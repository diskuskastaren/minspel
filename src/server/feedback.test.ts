import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterAll, describe, expect, it } from "vitest";
import { GameError } from "./errors";
import { saveFeedback } from "./feedback";

const dir = mkdtempSync(path.join(tmpdir(), "klurig-feedback-"));
process.env.KLURIG_DATA_DIR = dir;
afterAll(() => rmSync(dir, { recursive: true, force: true }));

describe("feedback", () => {
  it("sparar ett meddelande per rad utan enhets-id", () => {
    saveFeedback("dev-1", { typ: "bugg", text: " Tangenten Å fastnar ", spel: "ordet", sida: "/ordet" });
    const rows = readFileSync(path.join(dir, "feedback.jsonl"), "utf8").trim().split("\n").map((l) => JSON.parse(l));
    expect(rows[0]).toMatchObject({ typ: "bugg", text: "Tangenten Å fastnar", spel: "ordet", sida: "/ordet" });
    expect(JSON.stringify(rows[0])).not.toContain("dev-1");
  });
  it("validerar och begränsar", () => {
    expect(() => saveFeedback("dev-2", { typ: "spam", text: "x", spel: null, sida: null })).toThrow(GameError);
    expect(() => saveFeedback("dev-2", { typ: "annat", text: "  ", spel: null, sida: null })).toThrow(GameError);
    expect(() => saveFeedback("dev-2", { typ: "annat", text: "x".repeat(1001), spel: null, sida: null })).toThrow(GameError);
    for (let i = 0; i < 5; i++) saveFeedback("dev-3", { typ: "annat", text: `hej ${i}`, spel: null, sida: null }, 1000 + i);
    expect(() => saveFeedback("dev-3", { typ: "annat", text: "en till", spel: null, sida: null }, 2000)).toThrow("RATE_LIMITED");
    expect(() => saveFeedback("dev-3", { typ: "annat", text: "senare", spel: null, sida: null }, 1000 + 61 * 60_000)).not.toThrow();
  });
});
