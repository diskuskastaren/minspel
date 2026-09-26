import { describe, expect, it } from "vitest";
import {
  LEVELS,
  ROUNDS,
  applyAnswer,
  challengeNumber,
  computeStats,
  dailyRates,
  extendSchedule,
  fillSentence,
  isCorrect,
  matchingPrefix,
  newSession,
  normalizeSpelling,
  score,
  shareText,
  spellingDiff,
  type DiffPart,
  type Level,
  type Session,
  type SpellingWord,
} from "./rattstavat";

const word = (ord: string, niva: Level = 1, varianter?: string[]): SpellingWord => ({
  ord,
  niva,
  definition: "d",
  mening: "Här står ___.",
  ursprung: null,
  varianter,
});

const levenshtein = (a: string, b: string): number => {
  const d = Array.from({ length: a.length + 1 }, (_, i) => [i, ...Array(b.length).fill(0)]);
  for (let j = 1; j <= b.length; j++) d[0][j] = j;
  for (let i = 1; i <= a.length; i++)
    for (let j = 1; j <= b.length; j++) d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
  return d[a.length][b.length];
};
const expected = (parts: DiffPart[]) => parts.map((p) => (p.kind === "extra" ? "" : p.ch)).join("");
const typed = (parts: DiffPart[]) => parts.map((p) => (p.kind === "missing" ? "" : p.kind === "same" ? p.ch : p.got)).join("");
const kinds = (parts: DiffPart[]) => parts.filter((p) => p.kind !== "same").map((p) => `${p.kind}:${p.kind === "extra" ? p.got : p.ch}`);

describe("bedömning", () => {
  it("exakt stavning efter trim och gemener", () => {
    expect(isCorrect("  Restaurang ", word("restaurang"))).toBe(true);
    expect(isCorrect("restorang", word("restaurang"))).toBe(false);
    expect(normalizeSpelling(" Chauf för ")).toBe("chaufför");
  });
  it("å, ä och ö är egna bokstäver", () => {
    expect(isCorrect("fonster", word("fönster"))).toBe(false);
    expect(isCorrect("chauffor", word("chaufför"))).toBe(false);
  });
  it("accenter räknas (é är inte e)", () => {
    expect(isCorrect("ide", word("idé"))).toBe(false);
    expect(isCorrect("idé", word("idé"))).toBe(true); // e + kombinerande accent
  });
  it("godtagbara varianter", () => {
    expect(isCorrect("mail", word("mejl", 1, ["mail"]))).toBe(true);
  });
  it("matchande början", () => {
    expect(matchingPrefix("restorang", "restaurang")).toBe(4);
    expect(matchingPrefix("fönster", "fönster")).toBe(7);
    expect(matchingPrefix("fön", "fönster")).toBe(3);
    expect(matchingPrefix("", "fönster")).toBe(0);
  });
});

describe("skillnad", () => {
  const cases: [input: string, answer: string, diff: string[]][] = [
    ["restaurang", "restaurang", []],
    ["rekomendera", "rekommendera", ["missing:m"]],
    ["definitift", "definitivt", ["wrong:v"]],
    ["intresant", "intressant", ["missing:s"]],
    ["parallel", "parallell", ["missing:l"]],
    ["chauför", "chaufför", ["missing:f"]],
    ["kommmun", "kommun", ["extra:m"]],
    ["sjuksjöterska", "sjuksköterska", ["wrong:k"]],
    ["hjälm", "jälm", ["extra:h"]],
    ["jälm", "hjälm", ["missing:h"]],
  ];
  for (const [input, answer, diff] of cases) {
    it(`${input} → ${answer}`, () => {
      expect(kinds(spellingDiff(input, answer))).toEqual(diff);
    });
  }
  const pairs: [string, string][] = [
    ["restorang", "restaurang"],
    ["shafför", "chaufför"],
    ["konäsör", "konnässör"],
    ["xylofån", "xylofon"],
    ["", "fönster"],
    ["abcdef", ""],
    ["schizofreni", "skitsofreni"],
  ];
  for (const [input, answer] of pairs) {
    it(`återskapar båda stavningarna och är minimal: ${input || "∅"} / ${answer || "∅"}`, () => {
      const parts = spellingDiff(input, answer);
      expect(expected(parts)).toBe(answer);
      expect(typed(parts)).toBe(input);
      expect(parts.filter((p) => p.kind !== "same")).toHaveLength(levenshtein(input, answer));
    });
  }
});

describe("session", () => {
  const words = LEVELS.map((l) => word(["fönster", "stjärna", "restaurang", "chaufför", "reservoar"][l - 1], l));
  it("fem rundor, ett försök per ord", () => {
    let s = newSession("2026-09-26");
    for (let i = 0; i < ROUNDS; i++) {
      expect(s.state).toBe("ongoing");
      s = applyAnswer(s, i % 2 === 0 ? words[i].ord.toUpperCase() : "fel", words[i]);
    }
    expect(s.state).toBe("finished");
    expect(s.finishedAt).not.toBeNull();
    expect(score(s)).toBe(3);
    expect(s.answers[0]).toEqual({ input: "fönster", correct: true });
    expect(() => applyAnswer(s, "x", words[0])).toThrow("SESSION_FINISHED");
  });
  it("mening med ordet insatt", () => {
    expect(fillSentence("Vår ___ väntade utanför.", "chaufför")).toBe("Vår chaufför väntade utanför.");
  });
});

describe("schema", () => {
  const pools = Object.fromEntries(LEVELS.map((l) => [l, Array.from({ length: 6 }, (_, i) => `ord${l}${i}`)])) as Record<Level, string[]>;
  it("en ord per nivå och dag, utan upprepning", () => {
    const s = extendSchedule({}, pools, "2026-10-01");
    const days = Object.keys(s).sort();
    expect(days[0]).toBe("2026-09-26");
    expect(days).toHaveLength(6);
    for (const l of LEVELS) expect(new Set(days.map((d) => s[d][l])).size).toBe(6);
    expect(s[days[0]][3]).toMatch(/^ord3/);
  });
  it("ändrar inte redan schemalagda dagar", () => {
    const a = extendSchedule({}, pools, "2026-09-28");
    const b = extendSchedule(a, pools, "2026-10-03");
    for (const d of Object.keys(a)) expect(b[d]).toEqual(a[d]);
  });
});

describe("delning och statistik", () => {
  const s = (date: string, correct: boolean[]): Session => ({
    date,
    state: correct.length === 5 ? "finished" : "ongoing",
    answers: correct.map((c) => ({ input: "x", correct: c })),
    startedAt: "",
    finishedAt: null,
  });
  it("delningstext", () => {
    expect(challengeNumber("2026-09-26")).toBe(1);
    expect(shareText(s("2026-09-30", [true, true, true, true, false]), "klurig.se/rattstavat")).toBe(
      "Rättstavat #5 · 4/5 🐝 ✅✅✅✅❌\nklurig.se/rattstavat",
    );
  });
  it("streak räknar spelade dagar i rad", () => {
    const all = [
      s("2026-09-20", [true, true, true, true, true]),
      s("2026-09-22", [true, false, true, false, false]),
      s("2026-09-23", [false, false, false, false, false]),
      s("2026-09-24", [true, true, true, true, false]),
      s("2026-09-25", [true, true]), // påbörjad, räknas inte
    ];
    const st = computeStats(all, "2026-09-25");
    expect(st.played).toBe(4);
    expect(st.correct).toBe(11);
    expect(st.words).toBe(20);
    expect(st.currentStreak).toBe(3);
    expect(st.bestStreak).toBe(3);
    expect(st.distribution).toEqual([1, 0, 1, 0, 1, 1]);
  });
  it("andel som klarade varje runda idag", () => {
    const rates = dailyRates([s("d", [true, false, true, true, true]), s("d", [true, true]), s("d", [])]);
    expect(rates[0]).toEqual({ answered: 2, correct: 2 });
    expect(rates[1]).toEqual({ answered: 2, correct: 1 });
    expect(rates[2]).toEqual({ answered: 1, correct: 1 });
  });
});
