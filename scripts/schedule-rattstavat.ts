// Förlänger Rättstavats frysta schema (data/rattstavat/schema.json): ett ord
// per svårighetsnivå och dag. Redan schemalagda dagar ändras aldrig.
//
// Kör: npm run rattstavat:schema          (60 dagar inklusive idag)
//      npm run rattstavat:schema -- 90    (90 dagar)
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { LEVELS, extendSchedule, type Level, type Schedule, type SpellingWord } from "../src/game-engine/rattstavat.ts";
import { addDays, stockholmDate } from "../src/lib/time.ts";

const DIR = path.join(process.cwd(), "data", "rattstavat");
const FILE = path.join(DIR, "schema.json");
const days = Number(process.argv[2] ?? 60);
if (!Number.isInteger(days) || days < 1) throw new Error("Ange antal dagar som ett positivt heltal");

const { words } = JSON.parse(readFileSync(path.join(DIR, "ord.json"), "utf8")) as { words: SpellingWord[] };
const pools = Object.fromEntries(LEVELS.map((l) => [l, words.filter((w) => w.niva === l).map((w) => w.ord)])) as Record<Level, string[]>;
const before: Schedule = existsSync(FILE) ? JSON.parse(readFileSync(FILE, "utf8")).days : {};
const after = extendSchedule(before, pools, addDays(stockholmDate(), days - 1));

const dates = Object.keys(after).sort();
const lines = dates.map((d) => `    ${JSON.stringify(d)}: ${JSON.stringify(after[d])}`);
writeFileSync(FILE, `{\n  "note": "Fryst schema – ändra aldrig passerade dagar. Förläng med npm run rattstavat:schema.",\n  "days": {\n${lines.join(",\n")}\n  }\n}\n`);
console.log(`Schemat täcker ${dates[0]} – ${dates[dates.length - 1]} (${dates.length - Object.keys(before).length} nya dagar).`);
