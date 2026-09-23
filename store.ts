import "server-only";
import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import path from "node:path";
import type { CategorySlug, Session } from "@/game-engine/oronmask";

// Enkel filbaserad lagring för lokal utveckling. Byts mot Postgres innan
// sidan blir offentlig (samma funktionssignaturer).
const DIR = path.join(process.cwd(), ".data");
const FILE = path.join(DIR, "oronmask-sessions.json");

type StoredSession = Session & { deviceId: string };
type DB = { sessions: Record<string, StoredSession> };

let db: DB | null = null;

function load(): DB {
  if (db) return db;
  db = existsSync(FILE) ? (JSON.parse(readFileSync(FILE, "utf8")) as DB) : { sessions: {} };
  return db;
}

function persist() {
  mkdirSync(DIR, { recursive: true });
  const tmp = `${FILE}.tmp`;
  writeFileSync(tmp, JSON.stringify(load()));
  renameSync(tmp, FILE);
}

const key = (deviceId: string, date: string, category: CategorySlug) => `${deviceId}|${date}|${category}`;

export function getSession(deviceId: string, date: string, category: CategorySlug): Session | null {
  const s = load().sessions[key(deviceId, date, category)];
  if (!s) return null;
  const { deviceId: _omit, ...session } = s;
  return session;
}

export function saveSession(deviceId: string, session: Session): void {
  load().sessions[key(deviceId, session.date, session.category)] = { ...session, deviceId };
  persist();
}

export function listSessions(deviceId: string): Session[] {
  return Object.values(load().sessions)
    .filter((s) => s.deviceId === deviceId)
    .map(({ deviceId: _omit, ...s }) => s);
}

/** Endast för utveckling: nollställ en enhets sessioner för ett datum. */
export function resetDay(deviceId: string, date: string): void {
  const sessions = load().sessions;
  for (const k of Object.keys(sessions)) if (k.startsWith(`${deviceId}|${date}|`)) delete sessions[k];
  persist();
}
