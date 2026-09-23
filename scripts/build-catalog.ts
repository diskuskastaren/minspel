// Bygger data/catalog.json från data/seed-songs.json genom att slå upp varje
// låt i Deezers publika API. Låtar som inte hittas med exakt titel + artist
// hoppar vi över och listar i data/catalog-report.txt.
//
// Kör: npm run catalog
import { readFileSync, writeFileSync } from "node:fs";
import { looksLikeJunkVersion, normalizeText, normalizeTitle } from "../src/lib/normalize.ts";

type Seed = [artist: string, title: string, cats: string];
type DzTrack = {
  id: number;
  title: string;
  title_version?: string;
  rank: number;
  preview: string;
  readable?: boolean;
  artist: { id: number; name: string };
  album: { title: string; cover_medium?: string; cover_xl?: string };
};
type DzTrackFull = DzTrack & {
  release_date?: string;
  contributors?: { id: number; name: string }[];
  link: string;
};

const CAT_MAP: Record<string, string> = { p: "pop", h: "hiphop", m: "mello" };
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function dz<T>(path: string): Promise<T> {
  for (let attempt = 0; attempt < 4; attempt++) {
    const res = await fetch(`https://api.deezer.com${path}`, { headers: { "User-Agent": "klurig-local-dev/0.1" } });
    const json = (await res.json()) as T & { error?: { code: number; message: string } };
    if (json.error?.code === 4) {
      await sleep(2000); // kvot överskriden
      continue;
    }
    if (json.error) throw new Error(`${path}: ${json.error.message}`);
    await sleep(130); // Deezer tillåter ~50 anrop / 5 s
    return json;
  }
  throw new Error(`${path}: gav upp efter upprepad kvotgräns`);
}

function artistMatches(seedArtist: string, name: string): boolean {
  const a = normalizeText(seedArtist);
  const b = normalizeText(name);
  return a === b || b.startsWith(a + " ") || a.startsWith(b + " ");
}

async function findTrack(artist: string, title: string): Promise<DzTrack | null> {
  const wanted = normalizeTitle(title);
  const queries = [`${artist} ${title}`, title];
  for (const q of queries) {
    const res = await dz<{ data: DzTrack[] }>(`/search?q=${encodeURIComponent(q)}&limit=50`);
    const hits = res.data.filter(
      (t) =>
        t.preview &&
        normalizeTitle(t.title) === wanted &&
        artistMatches(artist, t.artist.name) &&
        !looksLikeJunkVersion(t.title, t.title_version ?? "", t.album.title) &&
        !/\blive\b/i.test(`${t.title} ${t.title_version ?? ""}`),
    );
    if (hits.length > 0) return hits.sort((a, b) => b.rank - a.rank)[0];
  }
  return null;
}

// "*top:5" i titelfältet = artistens 5 mest spelade låtar på Deezer.
async function artistTopTracks(artist: string, n: number): Promise<DzTrack[]> {
  const res = await dz<{ data: { id: number; name: string; nb_fan: number }[] }>(
    `/search/artist?q=${encodeURIComponent(artist)}&limit=10`,
  );
  const match = res.data
    .filter((a) => normalizeText(a.name) === normalizeText(artist))
    .sort((a, b) => b.nb_fan - a.nb_fan)[0];
  if (!match) return [];
  const top = await dz<{ data: DzTrack[] }>(`/artist/${match.id}/top?limit=${n * 3}`);
  const picked: DzTrack[] = [];
  const titles = new Set<string>();
  for (const t of top.data) {
    const key = normalizeTitle(t.title);
    if (!t.preview || t.artist.id !== match.id || titles.has(key)) continue;
    if (looksLikeJunkVersion(t.title, t.title_version ?? "") || /\b(live|remix|edit|interlude|intro|outro|skit)\b/i.test(t.title)) continue;
    titles.add(key);
    picked.push(t);
    if (picked.length >= n) break;
  }
  return picked;
}

async function main() {
  const seed = JSON.parse(readFileSync("data/seed-songs.json", "utf8")) as { songs: Seed[] };
  const catalog: unknown[] = [];
  const missing: string[] = [];
  const seen = new Set<number>();
  const seenKeys = new Set<string>();

  for (const [i, [artist, title, cats]] of seed.songs.entries()) {
    process.stdout.write(`[${i + 1}/${seed.songs.length}] ${artist} – ${title} … `);
    try {
      const topMatch = /^\*top:(\d+)$/.exec(title);
      const hits = topMatch ? await artistTopTracks(artist, Number(topMatch[1])) : [await findTrack(artist, title)];
      const found = hits.filter((h): h is DzTrack => h !== null);
      if (found.length === 0) {
        missing.push(`${artist} – ${title}`);
        console.log("SAKNAS");
        continue;
      }
      for (const hit of found) {
      const key = `${normalizeText(hit.artist.name)}|${normalizeTitle(hit.title)}`;
      if (seen.has(hit.id) || seenKeys.has(key)) {
        console.log(`dubblett (${hit.title})`);
        continue;
      }
      seen.add(hit.id);
      seenKeys.add(key);
      const full = await dz<DzTrackFull>(`/track/${hit.id}`);
      const contributors = full.contributors?.length ? full.contributors : [full.artist];
      catalog.push({
        id: full.id,
        title: full.title,
        artist: full.artist.name,
        artistIds: [...new Set(contributors.map((c) => c.id))],
        artistNames: [...new Set(contributors.map((c) => c.name))],
        cats: ["alla", ...cats.split("").map((c) => CAT_MAP[c]).filter(Boolean)],
        year: full.release_date ? Number(full.release_date.slice(0, 4)) || null : null,
        cover: full.album.cover_xl ?? full.album.cover_medium ?? null,
        link: full.link,
        rank: full.rank,
      });
      console.log(`ok (${full.title} · ${full.id})`);
      }
    } catch (e) {
      missing.push(`${artist} – ${title}  [fel: ${(e as Error).message}]`);
      console.log("FEL", (e as Error).message);
    }
  }

  writeFileSync("data/catalog.json", JSON.stringify({ builtAt: new Date().toISOString(), songs: catalog }, null, 1));
  writeFileSync(
    "data/catalog-report.txt",
    `Byggd ${new Date().toISOString()}\nHittade: ${catalog.length}\nSaknas: ${missing.length}\n\n${missing.join("\n")}\n`,
  );
  const counts: Record<string, number> = {};
  for (const s of catalog as { cats: string[] }[]) for (const c of s.cats) counts[c] = (counts[c] ?? 0) + 1;
  console.log(`\nKlart: ${catalog.length} låtar, ${missing.length} saknas.`, counts);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
