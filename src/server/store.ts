import "server-only";
import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import path from "node:path";

// Enkel filbaserad lagring för lokal utveckling. Byts mot Postgres innan
// sidan blir offentlig (samma funktionssignaturer). En fil per spel.

type Keyed = { date: string };
type Stored<S> = S & { deviceId: string };

export type SessionStore<S extends Keyed, C extends string | number> = {
  get(deviceId: string, date: string, category: C): S | null;
  save(deviceId: string, session: S): void;
  list(deviceId: string): S[];
  /** Alla spelares sessioner för en utmaning (för dagens statistik). */
  listForChallenge(date: string, category: C): S[];
  /** Endast för utveckling: nollställ en enhets sessioner för ett datum. */
  resetDay(deviceId: string, date: string): void;
};

export function createSessionStore<S extends Keyed, C extends string | number>(
  fileName: string,
  categoryOf: (s: S) => C,
): SessionStore<S, C> {
  let db: { sessions: Record<string, Stored<S>> } | null = null;
  const file = () => path.join(process.env.KLURIG_DATA_DIR ?? path.join(process.cwd(), ".data"), fileName);

  const load = () => {
    if (db) return db;
    db = existsSync(file()) ? JSON.parse(readFileSync(file(), "utf8")) : { sessions: {} };
    return db!;
  };
  const persist = () => {
    mkdirSync(path.dirname(file()), { recursive: true });
    const tmp = `${file()}.tmp`;
    writeFileSync(tmp, JSON.stringify(load()));
    renameSync(tmp, file());
  };
  const key = (deviceId: string, date: string, category: C) => `${deviceId}|${date}|${category}`;
  const strip = ({ deviceId: _omit, ...s }: Stored<S>) => s as unknown as S;

  return {
    get(deviceId, date, category) {
      const s = load().sessions[key(deviceId, date, category)];
      return s ? strip(s) : null;
    },
    save(deviceId, session) {
      load().sessions[key(deviceId, session.date, categoryOf(session))] = { ...session, deviceId };
      persist();
    },
    list(deviceId) {
      return Object.values(load().sessions)
        .filter((s) => s.deviceId === deviceId)
        .map(strip);
    },
    listForChallenge(date, category) {
      return Object.values(load().sessions)
        .filter((s) => s.date === date && categoryOf(s) === category)
        .map(strip);
    },
    resetDay(deviceId, date) {
      const sessions = load().sessions;
      for (const k of Object.keys(sessions)) if (k.startsWith(`${deviceId}|${date}|`)) delete sessions[k];
      persist();
    },
  };
}
