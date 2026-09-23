import { describe, expect, it } from "vitest";
import { normalizeText, normalizeTitle, looksLikeJunkVersion } from "./normalize";
import { addDays, daysBetween, msUntilNextDay, startOfStockholmDay, stockholmDate } from "./time";
import { mp3Duration, sliceMp3 } from "./mp3";

describe("normalize", () => {
  it("tar bort versionstillägg och parenteser", () => {
    expect(normalizeTitle("Levels - Radio Edit")).toBe("levels");
    expect(normalizeTitle("Habits (Stay High)")).toBe("habits");
    expect(normalizeTitle("Hela huset (feat. Håkan Hellström)")).toBe("hela huset");
    expect(normalizeTitle("Song feat. Someone")).toBe("song");
  });
  it("är okänslig för diakritiska tecken och skiljetecken", () => {
    expect(normalizeText("Känn ingen sorg för mig Göteborg")).toBe("kann ingen sorg for mig goteborg");
    expect(normalizeText("Samir & Viktor")).toBe(normalizeText("Samir och Viktor"));
  });
  it("känner igen skräpversioner", () => {
    expect(looksLikeJunkVersion("Dancing Queen (Karaoke Version)")).toBe(true);
    expect(looksLikeJunkVersion("Dancing Queen")).toBe(false);
  });
});

describe("time (Europe/Stockholm)", () => {
  it("datum byts vid svensk midnatt, inte UTC", () => {
    expect(stockholmDate(new Date("2026-09-22T21:59:59Z"))).toBe("2026-09-22");
    expect(stockholmDate(new Date("2026-09-22T22:00:00Z"))).toBe("2026-09-23");
  });
  it("hanterar sommartid och vintertid", () => {
    expect(startOfStockholmDay("2026-03-29").toISOString()).toBe("2026-03-28T23:00:00.000Z");
    expect(startOfStockholmDay("2026-03-30").toISOString()).toBe("2026-03-29T22:00:00.000Z");
    expect(startOfStockholmDay("2026-10-26").toISOString()).toBe("2026-10-25T23:00:00.000Z");
  });
  it("tid kvar till nästa dag", () => {
    expect(msUntilNextDay(new Date("2026-09-23T21:00:00Z"))).toBe(3_600_000);
    // Dygnet då vintertid börjar är 25 timmar långt.
    expect(msUntilNextDay(new Date("2026-10-24T22:00:00Z"))).toBe(25 * 3_600_000);
  });
  it("datumaritmetik", () => {
    expect(addDays("2026-12-31", 1)).toBe("2027-01-01");
    expect(daysBetween("2026-09-01", "2026-09-23")).toBe(22);
  });
});

// Bygger en syntetisk MPEG-1 Layer III-fil: 128 kbps, 44,1 kHz, 417 byte/ram.
function fakeMp3(frames: number, withInfo = false): Uint8Array {
  const frameLen = 417;
  const id3 = [0x49, 0x44, 0x33, 3, 0, 0, 0, 0, 0, 5, 1, 2, 3, 4, 5];
  const out = new Uint8Array(id3.length + frameLen * (frames + (withInfo ? 1 : 0)));
  out.set(id3, 0);
  let o = id3.length;
  for (let i = 0; i < frames + (withInfo ? 1 : 0); i++) {
    out.set([0xff, 0xfb, 0x90, 0x00], o);
    if (withInfo && i === 0) out.set([0x58, 0x69, 0x6e, 0x67], o + 36); // "Xing"
    o += frameLen;
  }
  return out;
}

describe("mp3", () => {
  const frameSec = 1152 / 44100;
  it("räknar längd och hoppar över ID3 och Xing-ram", () => {
    expect(mp3Duration(fakeMp3(100, true))).toBeCloseTo(100 * frameSec, 5);
  });
  it("klipper till begärd längd på ramgräns", () => {
    const cut = sliceMp3(fakeMp3(1200), 0, 0.5);
    const frames = cut.length / 417;
    expect(Number.isInteger(frames)).toBe(true);
    expect(frames * frameSec).toBeGreaterThanOrEqual(0.5);
    expect((frames - 1) * frameSec).toBeLessThan(0.5);
    expect(cut[0]).toBe(0xff);
  });
  it("kan börja en bit in", () => {
    const cut = sliceMp3(fakeMp3(1200), 10, 2);
    expect(mp3Duration(cut)).toBeGreaterThanOrEqual(2);
    expect(mp3Duration(cut)).toBeLessThan(2 + 2 * frameSec);
  });
});
