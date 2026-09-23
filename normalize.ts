// Textnormalisering för att jämföra låttitlar och artistnamn oberoende av
// versaler, diakritiska tecken, skiljetecken och versionstillägg.
// Filen får inte importera något – den används även av katalogskriptet.

export function normalizeText(input: string): string {
  return input
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\b(and|och|the)\b/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

// "Habits (Stay High)", "Dancing Queen - Remastered 2001", "Levels - Radio Edit",
// "Song feat. X" → kärntiteln.
export function normalizeTitle(title: string): string {
  let t = title;
  t = t.replace(/\s*[([][^)\]]*[)\]]/g, " ");
  t = t.replace(/\s+[-–—]\s+.*$/, "");
  t = t.replace(/\s+(feat|ft|featuring|with)\.?\s.*$/i, "");
  const n = normalizeText(t);
  // Om allt försvann (t.ex. en titel som bara är en parentes) – fall tillbaka.
  return n.length > 0 ? n : normalizeText(title);
}

const JUNK = /\b(karaoke|instrumental|tribute|made famous|originally performed|cover|8[- ]?bit|lullaby|piano version|sped up|slowed)\b/i;

export function looksLikeJunkVersion(...texts: string[]): boolean {
  return texts.some((t) => JUNK.test(t));
}
