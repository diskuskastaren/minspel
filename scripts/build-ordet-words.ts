// Bygger ordlistorna för Ordet.
//
//  • Gissningar: alla böjningsformer ur Den stora svenska ordlistan (DSSO,
//    npm-paketet dictionary-sv, LGPL-3.0) expanderade med Hunspell-reglerna,
//    plus Kelly-listans lemman. Egennamn, förkortningar och sammansättningar
//    som bara finns via Hunspells sammansättningsregler kommer inte med.
//  • Svar: Kelly-listan (Språkbanken, CC BY 4.0) nivå A1–B2, substantiv,
//    verb och adjektiv. Utan ord som DSSO märker "föreslå inte" (svordomar,
//    slurar), utan data/ordet/blocklista.txt och utan ord vars mönster har
//    för många varianter (t.ex. _ALLA).
//
// Kör: npm run ordlista   (hämtar Kelly-listan från GitHub första gången)
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { normalizeWord } from "../src/lib/normalize-word.ts";

const ROOT = process.cwd();
const OUT = path.join(ROOT, "data", "ordet");
const CACHE = path.join(ROOT, ".cache");
const KELLY_URL = "https://raw.githubusercontent.com/codesue/kelly/main/sv.csv";
const MIN_LEN = 3;
const MAX_LEN = 8;
const ANSWER_LEVELS = new Set(["A1", "A2", "B1", "B2"]);
const ANSWER_POS = /^(noun|verb|adjective)/;
/** Fler än så här vanliga ord som bara skiljer sig på en och samma plats → för mycket gissningslotteri. */
const MAX_PATTERN_VARIANTS = 3;

// ---------- Hunspell ----------

type Rule = { strip: string; add: string; cont: string; cond: RegExp };
type Affix = { kind: "SFX" | "PFX"; cross: boolean; rules: Rule[] };

function parseAff(text: string) {
  const affixes = new Map<string, Affix>();
  const flags: Record<string, string> = {};
  for (const raw of text.split("\n")) {
    const line = raw.replace(/#.*$/, "").trim();
    if (!line) continue;
    const f = line.split(/\s+/);
    if (["NEEDAFFIX", "FORBIDDENWORD", "ONLYINCOMPOUND", "NOSUGGEST"].includes(f[0])) flags[f[0]] = f[1];
    if (f[0] === "FLAG") throw new Error(`FLAG ${f[1]} stöds inte`);
    if (f[0] !== "SFX" && f[0] !== "PFX") continue;
    const kind = f[0] as "SFX" | "PFX";
    const flag = f[1];
    if (!affixes.has(flag)) {
      affixes.set(flag, { kind, cross: f[2] === "Y", rules: [] });
      continue;
    }
    const [addRaw, cont = ""] = f[3].split("/");
    const condSrc = f[4] ?? ".";
    const cond = new RegExp(kind === "SFX" ? `${condSrc}$` : `^${condSrc}`);
    affixes.get(flag)!.rules.push({ strip: f[2] === "0" ? "" : f[2], add: addRaw === "0" ? "" : addRaw, cont, cond });
  }
  return { affixes, flags };
}

/** Alla ord en ordboksrad genererar (utan sammansättningar). */
function expand(stem: string, stemFlags: string, aff: ReturnType<typeof parseAff>): string[] {
  const { affixes, flags } = aff;
  const out: string[] = [];
  const bad = (fl: string) => fl.includes(flags.ONLYINCOMPOUND) || fl.includes(flags.FORBIDDENWORD);
  const walk = (word: string, fl: string, depth: number) => {
    if (bad(fl)) return;
    if (!fl.includes(flags.NEEDAFFIX)) out.push(word);
    if (depth > 2) return;
    for (const flag of fl) {
      const a = affixes.get(flag);
      if (!a) continue;
      for (const r of a.rules) {
        if (!r.cond.test(word)) continue;
        if (a.kind === "SFX") {
          if (r.strip && !word.endsWith(r.strip)) continue;
          walk(word.slice(0, word.length - r.strip.length) + r.add, r.cont, depth + 1);
        } else {
          if (r.strip && !word.startsWith(r.strip)) continue;
          walk(r.add + word.slice(r.strip.length), r.cont, depth + 1);
        }
      }
    }
  };
  walk(stem, stemFlags, 0);
  return out;
}

// ---------- Källor ----------

async function kellyCsv(): Promise<string> {
  const file = path.join(CACHE, "kelly-sv.csv");
  if (existsSync(file)) return readFileSync(file, "utf8");
  const res = await fetch(KELLY_URL);
  if (!res.ok) throw new Error(`Kunde inte hämta Kelly-listan (${res.status})`);
  const text = await res.text();
  mkdirSync(CACHE, { recursive: true });
  writeFileSync(file, text);
  return text;
}

function parseCsvLine(line: string): string[] {
  const out: string[] = [];
  let cur = "";
  let q = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (q) {
      if (c === '"' && line[i + 1] === '"') {
        cur += '"';
        i++;
      } else if (c === '"') q = false;
      else cur += c;
    } else if (c === '"') q = true;
    else if (c === ",") {
      out.push(cur);
      cur = "";
    } else cur += c;
  }
  out.push(cur);
  return out;
}

type KellyRow = { rank: number; level: string; lemma: string; pos: string };

function parseKelly(csv: string): KellyRow[] {
  const [header, ...lines] = csv.split(/\r?\n/).filter(Boolean);
  const h = parseCsvLine(header);
  const col = (name: string) => h.indexOf(name);
  const [iId, iLevel, iLemma, iPos] = [col("ID"), col("CEFR Level"), col("Lemma"), col("POS")];
  return lines.map((l) => {
    const f = parseCsvLine(l);
    return { rank: Number(f[iId]), level: f[iLevel], lemma: f[iLemma].trim(), pos: f[iPos] };
  });
}

// ---------- Bygg ----------

const report: string[] = [];
const log = (s: string) => {
  report.push(s);
  console.log(s);
};

const dictDir = path.join(ROOT, "node_modules", "dictionary-sv");
const aff = parseAff(readFileSync(path.join(dictDir, "index.aff"), "utf8"));
const dicLines = readFileSync(path.join(dictDir, "index.dic"), "utf8").split("\n").slice(1);

const guesses = new Set<string>();
const noSuggest = new Set<string>(); // DSSO:s "föreslå inte" – ofta svordomar och slurar
for (const line of dicLines) {
  if (!line) continue;
  const slash = line.indexOf("/");
  const stem = slash < 0 ? line : line.slice(0, slash);
  const fl = slash < 0 ? "" : line.slice(slash + 1);
  if (stem !== stem.toLowerCase()) continue; // egennamn och förkortningar
  if (!/^\p{Ll}+$/u.test(stem)) continue; // bindestreck, punkter, siffror
  for (const form of expand(stem, fl, aff)) {
    const w = normalizeWord(form);
    if (!w || w.length < MIN_LEN || w.length > MAX_LEN) continue;
    guesses.add(w);
    if (fl.includes(aff.flags.NOSUGGEST)) noSuggest.add(w);
  }
}
log(`DSSO: ${guesses.size} gissningsbara former (${MIN_LEN}–${MAX_LEN} bokstäver)`);

const kelly = parseKelly(await kellyCsv());
let kellyAdded = 0;
for (const r of kelly) {
  const w = normalizeWord(r.lemma);
  if (w && w === r.lemma && w.length >= MIN_LEN && w.length <= MAX_LEN && !guesses.has(w)) {
    guesses.add(w);
    kellyAdded++;
  }
}
log(`Kelly: +${kellyAdded} lemman som saknades i DSSO`);

const blockFile = path.join(OUT, "blocklista.txt");
const blocklist = new Set(
  existsSync(blockFile)
    ? readFileSync(blockFile, "utf8")
        .split("\n")
        .map((l) => l.replace(/#.*$/, "").trim())
        .filter(Boolean)
    : [],
);

type Candidate = { word: string; rank: number; level: string };
const byLen = new Map<number, Candidate[]>();
const seen = new Set<string>();
const dropped: Record<string, string[]> = { blocklista: [], "DSSO föreslå-inte": [], "inte i ordlistan": [] };
for (const r of kelly) {
  if (!ANSWER_LEVELS.has(r.level) || !ANSWER_POS.test(r.pos)) continue;
  const w = r.lemma;
  if (!/^[a-zåäö]+$/.test(w) || w.length < MIN_LEN || w.length > MAX_LEN || seen.has(w)) continue;
  seen.add(w);
  if (blocklist.has(w)) dropped.blocklista.push(w);
  else if (noSuggest.has(w)) dropped["DSSO föreslå-inte"].push(w);
  else if (!guesses.has(w)) dropped["inte i ordlistan"].push(w);
  else {
    if (!byLen.has(w.length)) byLen.set(w.length, []);
    byLen.get(w.length)!.push({ word: w, rank: r.rank, level: r.level });
  }
}

// Mönster med många vanliga varianter (_ALLA: kalla, falla, walla …) gör spelet till lotteri.
dropped["för många varianter"] = [];
for (const [len, list] of byLen) {
  const common = new Set(list.map((c) => c.word));
  const keep = list.filter((c) => {
    for (let i = 0; i < len; i++) {
      const re = new RegExp(`^${c.word.slice(0, i)}.${c.word.slice(i + 1)}$`);
      let n = 0;
      for (const o of common) if (re.test(o)) n++;
      if (n - 1 > MAX_PATTERN_VARIANTS) return false;
    }
    return true;
  });
  dropped["för många varianter"].push(...list.filter((c) => !keep.includes(c)).map((c) => c.word));
  byLen.set(len, keep);
}

for (const [why, words] of Object.entries(dropped)) {
  log(`Uteslutna svar (${why}): ${words.length}${words.length ? ` – ${words.slice(0, 40).join(", ")}${words.length > 40 ? " …" : ""}` : ""}`);
}

const answers: Record<string, Candidate[]> = {};
const guessOut: Record<string, string[]> = {};
for (let len = MIN_LEN; len <= MAX_LEN; len++) {
  answers[len] = (byLen.get(len) ?? []).sort((a, b) => a.rank - b.rank);
  guessOut[len] = [...guesses].filter((w) => w.length === len).sort((a, b) => a.localeCompare(b, "sv"));
  log(`${len} bokstäver: ${answers[len].length} svar, ${guessOut[len].length} gissningar`);
}

mkdirSync(OUT, { recursive: true });
const sources = {
  gissningar: "Den stora svenska ordlistan (Göran Andersson, LGPL-3.0) via npm dictionary-sv + Kelly-listan",
  svar: "Kelly-listan, svenska (Språkbanken Text, CC BY 4.0) via github.com/codesue/kelly",
};
writeFileSync(path.join(OUT, "svar.json"), JSON.stringify({ generated: new Date().toISOString(), sources, answers }, null, 0).replace(/\],"/g, '],\n"'));
writeFileSync(path.join(OUT, "gissningar.json"), JSON.stringify({ sources, words: guessOut }).replace(/\],"/g, '],\n"'));
writeFileSync(path.join(OUT, "rapport.txt"), report.join("\n") + "\n");
