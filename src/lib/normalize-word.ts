// Normalisering av ord och tangenttryck för Ordet (svenskt alfabet a–z + å ä ö).
// Filen får inte importera något – den används även av ordlisteskriptet.

const KEEP = new Set(["å", "ä", "ö"]);
const MAP: Record<string, string> = { æ: "ä", ø: "ö" };

function foldChar(ch: string): string {
  if (KEEP.has(ch)) return ch;
  if (MAP[ch]) return MAP[ch];
  // é → e, ü → u, à → a … (accenter som inte hör till det svenska alfabetet)
  return ch.normalize("NFD").replace(/[̀-ͯ]/g, "");
}

/** Ett ord i spelets alfabet, eller null om det innehåller andra tecken. */
export function normalizeWord(input: string): string | null {
  const w = [...input.normalize("NFC").trim().toLowerCase()].map(foldChar).join("");
  return /^[a-zåäö]+$/.test(w) ? w : null;
}

/** Tangentbordets `event.key` → en bokstav i spelets alfabet, eller null. */
export function normalizeKey(key: string): string | null {
  if ([...key].length !== 1) return null;
  const w = normalizeWord(key);
  return w && w.length === 1 ? w : null;
}
