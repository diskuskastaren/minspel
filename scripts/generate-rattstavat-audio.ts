// Genererar uppläsningar för Rättstavat med Azure Neural TTS (sv-SE) och
// sparar dem som MP3 i data/rattstavat/ljud/{ord}-{ord|definition|mening}.mp3.
// Redan genererade filer hoppas över. Utan filer använder spelet webbläsarens
// talsyntes – bara i utvecklingsläge, eftersom ordet då måste skickas som text.
//
// Kräver miljövariablerna:
//   AZURE_SPEECH_KEY       nyckeln till Speech-resursen
//   AZURE_SPEECH_ENDPOINT  t.ex. https://<resurs>.cognitiveservices.azure.com
//   AZURE_SPEECH_VOICE     valfri, standard sv-SE-SofieNeural (även sv-SE-MattiasNeural, sv-SE-HilleviNeural)
//
// Kör: npm run rattstavat:ljud            (orden i schemat)
//      npm run rattstavat:ljud -- --alla  (hela ordlistan)
//
// Lyssna igenom resultatet – TTS uttalar ibland lånord fel. Rätta då med
// SSML-fonem i UTTAL nedan och ta bort filen så att den genereras om.
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fillSentence, type SpellingWord } from "../src/game-engine/rattstavat.ts";

const DIR = path.join(process.cwd(), "data", "rattstavat");
const OUT = path.join(DIR, "ljud");
const KEY = process.env.AZURE_SPEECH_KEY;
const ENDPOINT = process.env.AZURE_SPEECH_ENDPOINT?.replace(/\/+$/, "");
const VOICE = process.env.AZURE_SPEECH_VOICE ?? "sv-SE-SofieNeural";
const FORMAT = "audio-24khz-48kbitrate-mono-mp3";

/** Ord som behöver hjälp med uttalet: ord → SSML att använda i stället för texten. */
const UTTAL: Record<string, string> = {};

if (!KEY || !ENDPOINT) {
  console.error("Sätt AZURE_SPEECH_KEY och AZURE_SPEECH_ENDPOINT (se kommentaren överst i skriptet).");
  process.exit(1);
}

const escapeXml = (s: string) => s.replace(/[<>&'"]/g, (c) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", "'": "&apos;", '"': "&quot;" })[c]!);

async function synthesize(inner: string): Promise<Uint8Array> {
  const ssml = `<speak version='1.0' xml:lang='sv-SE'><voice name='${VOICE}'>${inner}</voice></speak>`;
  for (let attempt = 0; attempt < 4; attempt++) {
    const res = await fetch(`${ENDPOINT}/cognitiveservices/v1`, {
      method: "POST",
      headers: {
        "Ocp-Apim-Subscription-Key": KEY!,
        "Content-Type": "application/ssml+xml",
        "X-Microsoft-OutputFormat": FORMAT,
        "User-Agent": "klurig-rattstavat",
      },
      body: ssml,
    });
    if (res.status === 429) {
      await new Promise((r) => setTimeout(r, 2000 * (attempt + 1)));
      continue;
    }
    if (!res.ok) throw new Error(`Azure TTS ${res.status}: ${await res.text()}`);
    return new Uint8Array(await res.arrayBuffer());
  }
  throw new Error("Azure TTS: gav upp efter upprepad kvotgräns");
}

const { words } = JSON.parse(readFileSync(path.join(DIR, "ord.json"), "utf8")) as { words: SpellingWord[] };
const scheduled = new Set(
  Object.values(JSON.parse(readFileSync(path.join(DIR, "schema.json"), "utf8")).days as Record<string, Record<string, string>>).flatMap((d) =>
    Object.values(d),
  ),
);
const selected = process.argv.includes("--alla") ? words : words.filter((w) => scheduled.has(w.ord));

mkdirSync(OUT, { recursive: true });
let made = 0;
for (const w of selected) {
  const parts = {
    ord: UTTAL[w.ord] ?? escapeXml(w.ord),
    definition: escapeXml(w.definition),
    mening: escapeXml(fillSentence(w.mening, w.ord)),
  };
  for (const [typ, inner] of Object.entries(parts)) {
    const file = path.join(OUT, `${w.ord}-${typ}.mp3`);
    if (existsSync(file)) continue;
    writeFileSync(file, await synthesize(inner));
    made++;
  }
}
console.log(`${made} nya ljudfiler i ${path.relative(process.cwd(), OUT)} (${selected.length} ord).`);
