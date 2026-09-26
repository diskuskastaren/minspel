import { describe, expect, it } from "vitest";
import {
  LENGTHS,
  MAX_GUESSES,
  applyGuess,
  challengeNumber,
  computeDailyStats,
  computeStats,
  extendSchedule,
  hardModeMessage,
  keyboardState,
  mergeKeyboardState,
  newSession,
  percentileBeaten,
  scoreGuess,
  shareText,
  validateHardMode,
  type LetterScore,
  type Row,
  type Session,
  type WordLength,
} from "./ordet";
import { normalizeKey, normalizeWord } from "../lib/normalize-word";

// C = correct, P = present, A = absent
const code = (s: LetterScore[]) => s.map((x) => (x === "correct" ? "C" : x === "present" ? "P" : "A")).join("");
const row = (word: string, answer: string): Row => ({ word, scores: scoreGuess(word, answer) });

describe("scoreGuess", () => {
  const cases: [guess: string, answer: string, expected: string][] = [
    // Grundfall
    ["kaffe", "kaffe", "CCCCC"],
    ["björk", "kaffe", "AAAAP"],
    ["stuga", "glass", "PAAPP"],
    ["glass", "stuga", "PAPPA"],
    ["fjäll", "kaffe", "PAAAA"],
    // Dubbletter i gissningen
    ["kakao", "kaffe", "CCAAA"],
    ["tatta", "kaffe", "ACAAA"],
    ["eeeee", "kaffe", "AAAAC"],
    ["ffffa", "kaffe", "AACCP"],
    ["aabbb", "baaaa", "PCPAA"],
    ["lolla", "lilla", "CACCC"],
    ["sköts", "stöts", "CACCC"],
    ["papp", "apan", "PPAA"],
    ["tatta", "atlas", "PPAAP"],
    // Dubbletter i svaret
    ["kafe", "kaka", "CCAA"],
    ["akta", "kaka", "PPAC"],
    ["talla", "lilla", "AACCC"],
    ["allel", "lalle", "PPCPP"],
    // Tre av samma bokstav
    ["sssaa", "assas", "PCCCP"],
    ["mamma", "ammam", "PPCPP"],
    // å, ä, ö
    ["åsnor", "öring", "AAPAP"],
    ["räven", "ärmen", "PPACC"],
    ["öööaa", "ögona", "CAAAC"],
    ["båt", "tåg", "ACP"],
    ["älg", "älg", "CCC"],
    ["öga", "gås", "APA"],
    // Längre ord
    ["trädgård", "trädgård", "CCCCCCCC"],
    ["kastrull", "semester", "AAPPPAAA"],
    ["fönster", "smörgås", "APAPAAP"],
    ["solsken", "kastrul", "PAPAPAA"],
  ];
  for (const [guess, answer, expected] of cases) {
    it(`${guess} mot ${answer} → ${expected}`, () => {
      expect(code(scoreGuess(guess, answer))).toBe(expected);
    });
  }
  it("fel längd kastar", () => {
    expect(() => scoreGuess("abc", "abcd")).toThrow();
  });
});

describe("tangentbordet", () => {
  it("visar bästa kända status per bokstav", () => {
    const k = keyboardState([row("glass", "stuga"), row("stuga", "stuga")]);
    expect(k.s).toBe("correct");
    expect(k.g).toBe("correct");
    expect(k.l).toBe("absent");
  });
  it("grön blir aldrig gul igen", () => {
    let k = mergeKeyboardState({}, row("kaffe", "kakor"));
    expect(k.k).toBe("correct");
    k = mergeKeyboardState(k, row("ökade", "kakor"));
    expect(k.k).toBe("correct");
  });
  it("en grå dubblett nedgraderar inte en gul bokstav", () => {
    // "sssaa" mot "assas": tredje s är grön, de andra gula – bokstaven blir grön
    expect(keyboardState([row("sssaa", "assas")]).s).toBe("correct");
    // "tatta" mot "atlas": första t gult, de andra två grå
    const k = keyboardState([row("tatta", "atlas")]);
    expect(k.t).toBe("present");
    expect(keyboardState([row("ffffa", "kaffe")]).f).toBe("correct");
  });
});

describe("svårt läge", () => {
  const rows = [row("glass", "stuga")]; // G gul, S gul (en), A gul
  it("godkänner en gissning som använder allt som avslöjats", () => {
    expect(validateHardMode("sagor", rows)).toBeNull();
  });
  it("kräver avslöjade bokstäver", () => {
    expect(validateHardMode("kaffe", rows)).toEqual({ kind: "missing", letter: "g", count: 1 });
  });
  it("kräver att gröna bokstäver står kvar", () => {
    const r = [row("stöta", "stuga")];
    expect(validateHardMode("sagat", r)).toEqual({ kind: "position", index: 1, letter: "t" });
    expect(hardModeMessage({ kind: "position", index: 1, letter: "t" })).toBe("Bokstav 2 måste vara T");
  });
  it("räknar dubbletter: två kända R kräver två R", () => {
    const r = [row("ranar", "arter")];
    expect(code(r[0].scores)).toBe("PPAAC");
    expect(validateHardMode("ababr", r)).toEqual({ kind: "missing", letter: "r", count: 2 });
    expect(validateHardMode("rabar", r)).toBeNull();
    expect(hardModeMessage({ kind: "missing", letter: "r", count: 2 })).toBe("Ordet måste innehålla två R");
  });
  it("grå bokstäver får användas igen (som i Wordle)", () => {
    expect(validateHardMode("glöms", [row("glass", "glöms")])).toBeNull();
  });
  it("tar det högsta antalet från någon rad", () => {
    const r = [row("sabel", "assas"), row("sassa", "assas")];
    expect(validateHardMode("assas", r)).toBeNull();
    expect(validateHardMode("asbad", r)).not.toBeNull();
  });
});

describe("session", () => {
  it("vinst på tredje gissningen", () => {
    let s = newSession("2026-09-26", 5);
    s = applyGuess(s, "glass", "kaffe");
    s = applyGuess(s, "björk", "kaffe");
    expect(s.state).toBe("ongoing");
    s = applyGuess(s, "kaffe", "kaffe");
    expect(s.state).toBe("won");
    expect(s.finishedAt).not.toBeNull();
    expect(() => applyGuess(s, "kaffe", "kaffe")).toThrow("SESSION_FINISHED");
  });
  it("förlust efter sex gissningar", () => {
    let s = newSession("2026-09-26", 3);
    for (let i = 0; i < MAX_GUESSES; i++) s = applyGuess(s, "båt", "älg");
    expect(s.state).toBe("lost");
    expect(s.rows).toHaveLength(6);
  });
  it("fel längd avvisas", () => {
    expect(() => applyGuess(newSession("2026-09-26", 5), "båt", "kaffe")).toThrow("WRONG_LENGTH");
  });
  it("svårt läge låses vid första gissningen", () => {
    let s = newSession("2026-09-26", 5);
    s = applyGuess(s, "glass", "stuga", { hard: true });
    expect(s.hard).toBe(true);
    expect(() => applyGuess(s, "kaffe", "stuga", { hard: false })).toThrow("HARD_MODE");
    let easy = applyGuess(newSession("2026-09-26", 5), "glass", "stuga");
    easy = applyGuess(easy, "kaffe", "stuga", { hard: true });
    expect(easy.hard).toBe(false);
  });
});

describe("normalisering", () => {
  it("gemener, å/ä/ö och accenter", () => {
    expect(normalizeWord("KAFFE")).toBe("kaffe");
    expect(normalizeWord("Idé")).toBe("ide");
    expect(normalizeWord("smørgås")).toBe("smörgås");
    expect(normalizeWord("æble")).toBe("äble");
    expect(normalizeWord("ångest")).toBe("ångest"); // decomposed å
    expect(normalizeWord("två ord")).toBeNull();
    expect(normalizeWord("abc1")).toBeNull();
  });
  it("tangenter", () => {
    expect(normalizeKey("Ö")).toBe("ö");
    expect(normalizeKey("ø")).toBe("ö");
    expect(normalizeKey("Enter")).toBeNull();
    expect(normalizeKey("1")).toBeNull();
  });
});

describe("schema", () => {
  const answers = Object.fromEntries(LENGTHS.map((l) => [l, Array.from({ length: 10 }, (_, i) => `${"x".repeat(l - 1)}${"abcdefghij"[i]}`)])) as Record<WordLength, string[]>;
  it("fyller varje dag med sex ord utan upprepning", () => {
    const s = extendSchedule({}, answers, "2026-09-10");
    const days = Object.keys(s).sort();
    expect(days[0]).toBe("2026-09-01");
    expect(days).toHaveLength(10);
    for (const l of LENGTHS) expect(new Set(days.map((d) => s[d][l])).size).toBe(10);
    for (const d of days) for (const l of LENGTHS) expect(s[d][l]).toHaveLength(l);
  });
  it("ändrar aldrig redan schemalagda dagar, även om ordlistan ändras", () => {
    const first = extendSchedule({}, answers, "2026-09-05");
    const shuffled = { ...answers, 5: [...answers[5]].reverse().slice(0, 8) } as Record<WordLength, string[]>;
    const second = extendSchedule(first, shuffled, "2026-09-08");
    for (const d of Object.keys(first)) expect(second[d]).toEqual(first[d]);
    const used5 = Object.keys(second).map((d) => second[d][5]);
    expect(new Set(used5).size).toBe(used5.length);
  });
  it("är deterministiskt", () => {
    expect(extendSchedule({}, answers, "2026-09-07")).toEqual(extendSchedule({}, answers, "2026-09-07"));
  });
});

describe("delning och statistik", () => {
  const won: Session = { ...newSession("2026-09-26", 5), hard: false };
  let s = applyGuess(won, "glass", "stuga");
  s = applyGuess(s, "stuga", "stuga");
  it("delningstext", () => {
    expect(challengeNumber("2026-09-01")).toBe(1);
    expect(shareText(s, "klurig.se/ordet")).toBe(
      `Ordet #26 · 5 bokstäver · 2/6\n🟨⬜🟨🟨⬜\n🟩🟩🟩🟩🟩\nklurig.se/ordet`,
    );
    expect(shareText(s, "u", true).split("\n")[2]).toBe("🟦🟦🟦🟦🟦");
  });
  it("förlust och svårt läge", () => {
    let l = newSession("2026-09-26", 3);
    for (let i = 0; i < 6; i++) l = applyGuess(l, "båt", "älg", { hard: true });
    expect(shareText(l, "u").split("\n")[0]).toBe("Ordet #26 · 3 bokstäver · X/6*");
  });
  it("personlig statistik per längd", () => {
    const st = computeStats([s, { ...s, length: 6 }], 5, "2026-09-26");
    expect(st.played).toBe(1);
    expect(st.distribution[1]).toBe(1);
    expect(st.currentStreak).toBe(1);
  });
  it("global fördelning visas först vid 30 avslutade", () => {
    const many = Array.from({ length: 29 }, () => s);
    expect(computeDailyStats(many).distribution).toBeNull();
    expect(percentileBeaten(computeDailyStats(many), s)).toBeNull();
    const lost = { state: "lost" as const, rows: Array(6).fill(s.rows[0]) };
    const d = computeDailyStats([...many, lost, { state: "ongoing", rows: [] }]);
    expect(d.finished).toBe(30);
    expect(d.players).toBe(30);
    expect(d.distribution?.[1]).toBe(29);
    expect(percentileBeaten(d, s)).toBe(3);
  });
});
