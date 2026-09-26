// Förlänger Ordets frysta schema (data/ordet/schema.json) så att det räcker
// DAYS dagar framåt från idag. Redan schemalagda dagar ändras aldrig, så det
// går att bygga om ordlistan utan att dagens eller gårdagens ord byts.
//
// Kör: npm run ordet:schema            (60 dagar framåt)
//      npm run ordet:schema -- 90      (90 dagar framåt)
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { LENGTHS, extendSchedule, type Schedule, type WordLength } from "../src/game-engine/ordet.ts";
import { addDays, stockholmDate } from "../src/lib/time.ts";

const DIR = path.join(process.cwd(), "data", "ordet");
const FILE = path.join(DIR, "schema.json");
const days = Number(process.argv[2] ?? 60);
if (!Number.isInteger(days) || days < 1) throw new Error("Ange antal dagar som ett positivt heltal");

const { answers } = JSON.parse(readFileSync(path.join(DIR, "svar.json"), "utf8")) as {
  answers: Record<string, { word: string }[]>;
};
const pool = Object.fromEntries(LENGTHS.map((l) => [l, answers[l].map((a) => a.word)])) as Record<WordLength, string[]>;
const before: Schedule = existsSync(FILE) ? JSON.parse(readFileSync(FILE, "utf8")).days : {};
const until = addDays(stockholmDate(), days);
const after = extendSchedule(before, pool, until);

const dates = Object.keys(after).sort();
const lines = dates.map((d) => `    ${JSON.stringify(d)}: ${JSON.stringify(after[d])}`);
writeFileSync(FILE, `{\n  "note": "Fryst schema – ändra aldrig passerade dagar. Förläng med npm run ordet:schema.",\n  "days": {\n${lines.join(",\n")}\n  }\n}\n`);
console.log(`Schemat täcker ${dates[0]} – ${dates[dates.length - 1]} (${dates.length - Object.keys(before).length} nya dagar).`);
