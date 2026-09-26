// Minimal Hunspell-expansion (bara suffix/prefix, inga sammansättningar) för
// Den stora svenska ordlistan i npm-paketet dictionary-sv.
import { readFileSync } from "node:fs";
import path from "node:path";


type Rule = { strip: string; add: string; cont: string; cond: RegExp };
type Affix = { kind: "SFX" | "PFX"; cross: boolean; rules: Rule[] };

export type Aff = ReturnType<typeof parseAff>;

export function parseAff(text: string) {
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
export function expand(stem: string, stemFlags: string, aff: Aff): string[] {
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

/** Alla ordformer (gemener, utan egennamn) i DSSO, oavsett längd. */
export function dssoForms(root = process.cwd()): { forms: Set<string>; noSuggest: Set<string>; aff: Aff; lines: string[] } {
  const dir = path.join(root, "node_modules", "dictionary-sv");
  const aff = parseAff(readFileSync(path.join(dir, "index.aff"), "utf8"));
  const lines = readFileSync(path.join(dir, "index.dic"), "utf8").split("\n").slice(1);
  const forms = new Set<string>();
  const noSuggest = new Set<string>();
  for (const line of lines) {
    if (!line) continue;
    const slash = line.indexOf("/");
    const stem = slash < 0 ? line : line.slice(0, slash);
    const fl = slash < 0 ? "" : line.slice(slash + 1);
    if (stem !== stem.toLowerCase()) continue;
    for (const form of expand(stem, fl, aff)) {
      forms.add(form);
      if (fl.includes(aff.flags.NOSUGGEST)) noSuggest.add(form);
    }
  }
  return { forms, noSuggest, aff, lines };
}
