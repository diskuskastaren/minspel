export const TIMEZONE = "Europe/Stockholm";
const DAY_MS = 86_400_000;

type Parts = { y: number; m: number; d: number; h: number; min: number; s: number };

function partsInZone(instant: Date): Parts {
  const f = new Intl.DateTimeFormat("en-US", {
    timeZone: TIMEZONE,
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
  const p = Object.fromEntries(f.formatToParts(instant).map((x) => [x.type, x.value]));
  return { y: +p.year, m: +p.month, d: +p.day, h: +p.hour, min: +p.minute, s: +p.second };
}

// Skillnad mellan Stockholmstid och UTC vid ett visst ögonblick (ms).
function zoneOffsetMs(instant: Date): number {
  const p = partsInZone(instant);
  const asUtc = Date.UTC(p.y, p.m - 1, p.d, p.h, p.min, p.s);
  return asUtc - Math.floor(instant.getTime() / 1000) * 1000;
}

const pad = (n: number) => String(n).padStart(2, "0");

/** Dagens datum i Stockholm som "YYYY-MM-DD". */
export function stockholmDate(now: Date = new Date()): string {
  const p = partsInZone(now);
  return `${p.y}-${pad(p.m)}-${pad(p.d)}`;
}

export function addDays(date: string, days: number): string {
  const [y, m, d] = date.split("-").map(Number);
  const t = new Date(Date.UTC(y, m - 1, d) + days * DAY_MS);
  return `${t.getUTCFullYear()}-${pad(t.getUTCMonth() + 1)}-${pad(t.getUTCDate())}`;
}

export function daysBetween(from: string, to: string): number {
  const a = Date.parse(`${from}T00:00:00Z`);
  const b = Date.parse(`${to}T00:00:00Z`);
  return Math.round((b - a) / DAY_MS);
}

/** UTC-ögonblicket då ett givet Stockholmsdatum börjar (00:00 lokal tid). */
export function startOfStockholmDay(date: string): Date {
  const [y, m, d] = date.split("-").map(Number);
  const guess = Date.UTC(y, m - 1, d, 0, 0, 0);
  let t = guess - zoneOffsetMs(new Date(guess));
  // En korrigering räcker även över sommartidsbyten.
  t = guess - zoneOffsetMs(new Date(t));
  return new Date(t);
}

export function msUntilNextDay(now: Date = new Date()): number {
  const next = startOfStockholmDay(addDays(stockholmDate(now), 1));
  return Math.max(0, next.getTime() - now.getTime());
}

export function isValidDate(s: unknown): s is string {
  return typeof s === "string" && /^\d{4}-\d{2}-\d{2}$/.test(s) && !Number.isNaN(Date.parse(`${s}T00:00:00Z`));
}
