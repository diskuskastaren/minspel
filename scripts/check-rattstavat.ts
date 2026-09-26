// Kontrollerar Rättstavats ordlista (data/rattstavat/ord.json):
//  • rätt antal ord per nivå, inga dubbletter, bara bokstäver a–ö
//  • meningen har exakt en lucka ___ och avslöjar inte ordet någon annanstans
//  • definitionen innehåller inte ordet (eller en tydlig ordstam)
//  • ordet finns i Den stora svenska ordlistan (varning, inte fel – DSSO saknar
//    vissa sammansättningar)
//
// Kör: npm run rattstavat:kolla
import { readFileSync } from "node:fs";
import path from "node:path";
import { BLANK, LEVELS, type SpellingWord } from "../src/game-engine/rattstavat.ts";
import { dssoForms } from "./lib/hunspell.ts";

const MIN_PER_LEVEL = 60;
const file = path.join(process.cwd(), "data", "rattstavat", "ord.json");
const { words } = JSON.parse(readFileSync(file, "utf8")) as { words: (SpellingWord & { granskad?: boolean })[] };

const errors: string[] = [];
const warnings: string[] = [];
const seen = new Set<string>();
const { forms } = dssoForms();

for (const w of words) {
  const tag = `${w.ord} (nivå ${w.niva})`;
  if (!/^[a-zåäö]+$/.test(w.ord)) errors.push(`${tag}: bara a–ö utan accenter (skärmtangentbordet saknar andra tecken)`);
  if (seen.has(w.ord)) errors.push(`${tag}: dubblett`);
  seen.add(w.ord);
  if (!LEVELS.includes(w.niva)) errors.push(`${tag}: ogiltig nivå`);
  if (!w.definition?.trim()) errors.push(`${tag}: saknar definition`);
  if (w.mening.split(BLANK).length !== 2) errors.push(`${tag}: meningen ska ha exakt en ${BLANK}`);
  // Ordet, eller dess början om det är långt, får inte stå i texterna.
  const stem = w.ord.length >= 7 ? w.ord.slice(0, w.ord.length - 2) : w.ord;
  const leaks = (text: string) => new RegExp(`(^|[^a-zåäö])${stem}`, "i").test(text);
  if (leaks(w.definition)) errors.push(`${tag}: definitionen avslöjar ordet: "${w.definition}"`);
  if (leaks(w.mening.replace(BLANK, ""))) errors.push(`${tag}: meningen avslöjar ordet: "${w.mening}"`);
  if (w.ursprung && (!w.ursprung.sprak || !w.ursprung.fran)) errors.push(`${tag}: ofullständigt ursprung`);
  if (!forms.has(w.ord)) warnings.push(`${tag}: finns inte i DSSO – kontrollera stavningen mot SAOL`);
}
for (const l of LEVELS) {
  const n = words.filter((w) => w.niva === l).length;
  if (n < MIN_PER_LEVEL) errors.push(`Nivå ${l}: ${n} ord, behöver minst ${MIN_PER_LEVEL}`);
}

const unreviewed = words.filter((w) => !w.granskad).length;
console.log(`${words.length} ord · ${LEVELS.map((l) => `nivå ${l}: ${words.filter((w) => w.niva === l).length}`).join(" · ")}`);
console.log(`${unreviewed} ord är inte granskade av en människa ännu.`);
for (const w of warnings) console.log(`varning: ${w}`);
for (const e of errors) console.log(`FEL: ${e}`);
if (errors.length) process.exit(1);
