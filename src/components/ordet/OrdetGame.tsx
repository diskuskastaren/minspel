"use client";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  DEFAULT_LENGTH,
  LENGTHS,
  hardModeMessage,
  isWordLength,
  keyboardState,
  shareText,
  validateHardMode,
  type WordLength,
} from "@/game-engine/ordet";
import type { GameState, LengthState } from "@/game-engine/ordet-api-types";
import { normalizeKey } from "@/lib/normalize-word";
import { stockholmDate } from "@/lib/time";
import { Keyboard } from "@/components/ui/Keyboard";
import { DateLine } from "@/components/hub/DateLine";
import { GameHeader } from "@/components/hub/GameHeader";
import { HowToPlayFooter, useHowToPlay } from "@/components/ui/HowToPlay";
import { Modal } from "@/components/ui/Modal";
import { ToastRegion, useToast } from "@/components/ui/Toast";
import { playSfx } from "@/components/ui/sound";
import { useColorblind, useFlag } from "@/components/ui/preferences";
import u from "@/components/ui/ui.module.css";
import { ApiError, api, errorText } from "./api";
import { Board, describeRow } from "./Board";
import { HowToPlay } from "./HowToPlay";
import { ResultSheet, WIN_LINES } from "./ResultSheet";
import { Settings } from "./Settings";
import s from "./ordet.module.css";

const CACHE_KEY = "klurig:ordet:cache";
const IS_DEV = process.env.NODE_ENV !== "production";
/** Rutorna vänds en i taget. */
const FLIP_STAGGER_MS = 300;
const FLIP_MS = 500;

function readCache(date: string): GameState | null {
  try {
    const c = JSON.parse(localStorage.getItem(CACHE_KEY) ?? "null") as GameState | null;
    return c && c.date === date ? c : null;
  } catch {
    return null;
  }
}

function writeCache(st: GameState) {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(st));
  } catch {
    /* fullt eller privat läge */
  }
}

/** Standard: 5 bokstäver, annars nästa ospelade längd. */
function pickLength(st: GameState, wanted: string | null): WordLength {
  const n = Number(wanted);
  if (isWordLength(n)) return n;
  const order: WordLength[] = [DEFAULT_LENGTH, 6, 7, 8, 4, 3];
  return order.find((l) => st.lengths.find((x) => x.length === l)?.session.state === "ongoing") ?? DEFAULT_LENGTH;
}

export function OrdetGame() {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const datum = params.get("datum");
  const wantedLen = params.get("langd");

  const [data, setData] = useState<GameState | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [len, setLen] = useState<WordLength | null>(null);
  const [drafts, setDrafts] = useState<Partial<Record<WordLength, string>>>({});
  const [pending, setPending] = useState(false);
  const [reveal, setReveal] = useState<{ len: WordLength; row: number } | null>(null);
  const [bounce, setBounce] = useState<{ len: WordLength; row: number } | null>(null);
  const [shakeKey, setShakeKey] = useState(0);
  const [showResult, setShowResult] = useState(false);
  const htp = useHowToPlay("ordet");
  const showHelp = htp.open;
  const setShowHelp = htp.setOpen;
  const { toast, notify } = useToast();
  const [announce, setAnnounce] = useState("");
  const [countdownTarget, setCountdownTarget] = useState(0);
  const [hardPref, setHardPref] = useFlag("klurig:ordet:svart");
  const [colorblind] = useColorblind();
  const boardRef = useRef<HTMLDivElement>(null);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);

  const later = useCallback((fn: () => void, ms: number) => {
    timers.current.push(setTimeout(fn, ms));
  }, []);
  useEffect(() => () => timers.current.forEach(clearTimeout), []);

  const applyState = useCallback(
    (st: GameState) => {
      setData(st);
      setCountdownTarget(Date.now() + st.msUntilNext);
      setLen((current) => current ?? pickLength(st, wantedLen));
      if (!st.isArchive) writeCache(st);
    },
    [wantedLen],
  );

  const load = useCallback(async () => {
    try {
      const st = await api.state(datum);
      applyState(st);
      setLoadError(null);
    } catch (e) {
      setLoadError(errorText(e));
    }
  }, [datum, applyState]);

  useEffect(() => {
    // Visa senast kända bräde direkt och hämta sedan serverns sanning.
    if (!datum) {
      const cached = readCache(stockholmDate());
      if (cached) applyState(cached);
    }
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [load]);

  const current: LengthState | null = useMemo(() => data?.lengths.find((l) => l.length === len) ?? null, [data, len]);
  const session = current?.session ?? null;
  const rows = useMemo(() => session?.rows ?? [], [session]);
  const ongoing = session?.state === "ongoing";
  const finished = !!session && !ongoing;
  const draft = (len && drafts[len]) || "";
  const revealing = !!reveal;
  const playDate = datum ?? data?.date ?? null;
  const hardActive = rows.length === 0 ? hardPref : !!session?.hard;

  // Tangentbordet får sina färger först när raden har vänts klart.
  const keys = useMemo(
    () => keyboardState(reveal && reveal.len === len ? rows.slice(0, reveal.row) : rows),
    [rows, reveal, len],
  );

  // Dygnsbyte medan sidan är öppen: en påbörjad runda får spelas klart (servern
  // ger 30 minuters marginal), annars laddas dagens nya ord direkt.
  useEffect(() => {
    if (!countdownTarget || data?.isArchive) return;
    const inProgress = ongoing && rows.length > 0;
    const t = setTimeout(
      () => {
        if (inProgress) {
          notify("Klockan slog tolv! Spela klart ditt ord – sedan väntar dagens nya.", "info", 5000);
        } else {
          notify("Klockan slog tolv! Dagens nya ord är här.", "good");
          setShowResult(false);
          setDrafts({});
          void load();
        }
      },
      Math.max(0, countdownTarget - Date.now()) + 1500,
    );
    return () => clearTimeout(t);
  }, [countdownTarget, data?.isArchive, ongoing, rows.length, notify, load]);

  const setDraft = useCallback((l: WordLength, fn: (d: string) => string) => setDrafts((d) => ({ ...d, [l]: fn(d[l] ?? "") })), []);

  const shake = useCallback(
    (text: string) => {
      playSfx("invalid");
      setShakeKey((k) => k + 1);
      notify(text, "bad");
    },
    [notify],
  );

  const submit = useCallback(async () => {
    if (!session || !len || !ongoing || pending || revealing) return;
    if ([...draft].length < len) {
      shake(draft.length === 0 ? `Skriv ett ord på ${len} bokstäver` : "För kort");
      return;
    }
    if (hardActive) {
      const v = validateHardMode(draft, rows);
      if (v) {
        shake(hardModeMessage(v));
        return;
      }
    }
    setPending(true);
    try {
      const res = await api.guess({ langd: len, idx: rows.length, ord: draft, svart: hardPref, datum: playDate });
      const next = res.length.session;
      const rowIdx = next.rows.length - 1;
      setData((d) => {
        if (!d) return d;
        const updated = { ...d, lengths: d.lengths.map((l) => (l.length === len ? res.length : l)), stats: { ...d.stats, [len]: res.stats } };
        if (!updated.isArchive) writeCache(updated);
        return updated;
      });
      setDraft(len, () => "");
      setReveal({ len, row: rowIdx });
      for (let i = 0; i < len; i++) later(() => playSfx("flip"), i * FLIP_STAGGER_MS + FLIP_MS / 2);
      const revealMs = (len - 1) * FLIP_STAGGER_MS + FLIP_MS;
      later(() => {
        setReveal(null);
        setAnnounce(describeRow(next.rows[rowIdx]));
        if (next.state === "won") {
          setBounce({ len, row: rowIdx });
          playSfx("win");
          notify(WIN_LINES[rowIdx], "good");
          later(() => setShowResult(true), 1300);
        } else if (next.state === "lost") {
          playSfx("lose");
          notify(`Nära skjuter ingen hare – ordet var ${next.answer?.toUpperCase()}`, "bad", 4000);
          later(() => setShowResult(true), 1800);
        }
      }, revealMs);
    } catch (e) {
      if (e instanceof ApiError && (e.code === "NOT_IN_WORD_LIST" || e.code === "HARD_MODE" || e.code === "WRONG_LENGTH")) {
        shake(errorText(e));
      } else {
        notify(errorText(e), "bad");
        if (e instanceof ApiError && (e.code === "MOVE_OUT_OF_ORDER" || e.code === "SESSION_FINISHED")) void load();
      }
    } finally {
      setPending(false);
    }
  }, [session, len, ongoing, pending, revealing, draft, hardActive, rows, hardPref, playDate, shake, setDraft, later, notify, load]);

  const onKey = useCallback(
    (key: string) => {
      if (!len || !ongoing || revealing) return;
      if (key === "Enter") return void submit();
      if (key === "Backspace") return setDraft(len, (d) => [...d].slice(0, -1).join(""));
      const ch = normalizeKey(key);
      if (ch && !pending) {
        playSfx("tap");
        setDraft(len, (d) => ([...d].length < len ? d + ch : d));
      }
    },
    [len, ongoing, revealing, pending, submit, setDraft],
  );

  // Fysiskt tangentbord. `event.key` (inte `code`) så att Å Ä Ö fungerar oavsett layout.
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey || e.altKey || e.isComposing) return;
      if (document.querySelector("dialog[open]")) return;
      const el = e.target instanceof Element ? e.target : document.body;
      if (el.closest("input, textarea, select")) return;
      const onGameKey = !!el.closest("[data-game-key]");
      if ((e.key === "Enter" || e.key === " ") && el.closest("button, a") && !onGameKey) return;
      if (e.key === "Enter" || e.key === "Backspace" || normalizeKey(e.key)) {
        e.preventDefault();
        // Skriver man medan en annan knapp har fokus flyttas fokus till spelet,
        // så att Enter sedan skickar svaret i stället för att trycka på knappen.
        if (!onGameKey && e.key !== "Enter" && el.closest("button, a")) boardRef.current?.focus({ preventScroll: true });
        onKey(e.key);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onKey]);

  function switchLength(l: WordLength) {
    if (l === len) return;
    if (revealing) return;
    setShowResult(false);
    setBounce(null);
    setLen(l);
    const q = new URLSearchParams(params.toString());
    q.set("langd", String(l));
    router.replace(`${pathname}?${q.toString()}`, { scroll: false });
    boardRef.current?.focus({ preventScroll: true });
  }

  const nextUnfinished = useMemo(() => {
    if (!data || !len) return null;
    const i = LENGTHS.indexOf(len);
    const order = [...LENGTHS.slice(i + 1), ...LENGTHS.slice(0, i)];
    return order.find((l) => data.lengths.find((x) => x.length === l)?.session.state === "ongoing") ?? null;
  }, [data, len]);

  async function share() {
    if (!session) return;
    const text = shareText(session, `${window.location.origin}/ordet`, colorblind);
    try {
      if (navigator.share && matchMedia("(pointer: coarse)").matches) {
        await navigator.share({ text });
        return;
      }
      await navigator.clipboard.writeText(text);
      notify("Resultatet är kopierat!", "good");
    } catch (e) {
      if ((e as Error).name !== "AbortError") notify("Kunde inte dela. Försök igen.", "bad");
    }
  }

  if (loadError && !data) {
    return (
      <main className={s.page}>
        <div className={u.fatal}>
          <p className="display">Nu tappade vi tråden.</p>
          <p>{loadError}</p>
          <button type="button" className={u.btnPrimary} onClick={() => void load()}>
            Försök igen
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className={s.page}>
      <GameHeader
        title="Ordet"
        current="ordet"
        onHelp={() => setShowHelp(true)}
        returnFocus={() => boardRef.current?.focus()}
        settings={<Settings hard={ongoing && rows.length > 0 ? !!session?.hard : hardPref} onHard={setHardPref} hardLocked={ongoing && rows.length > 0} />}
        subtitle={<DateLine data={data} />}
      />

      <nav className={`${u.tabs} ${s.lengthTabs}`} aria-label="Antal bokstäver">
        {LENGTHS.map((l) => {
          const st = data?.lengths.find((x) => x.length === l)?.session;
          const done = st && st.state !== "ongoing";
          const started = st?.state === "ongoing" && st.rows.length > 0;
          return (
            <button
              key={l}
              type="button"
              className={`${u.tab} ${l === len ? u.tabActive : ""} ${done ? (st.state === "won" ? u.tabWon : u.tabLost) : ""}`}
              aria-current={l === len ? "page" : undefined}
              aria-label={`${l} bokstäver${done ? (st.state === "won" ? ", klarad" : ", missad") : started ? ", påbörjad" : ""}`}
              aria-disabled={revealing && l !== len}
              onClick={() => switchLength(l)}
            >
              <span className="mono">{l}</span>
              {done && <span className={u.tabMark} />}
              {started && <span className={`${u.tabMark} ${s.tabStarted}`} />}
            </button>
          );
        })}
      </nav>

      <div ref={boardRef} tabIndex={-1} className={s.stage} aria-label={len ? `Ordet med ${len} bokstäver` : undefined}>
        {!session || !len ? (
          <div className={`${u.skeleton} ${s.boardSkeleton}`} aria-busy="true" aria-label="Laddar dagens ord" />
        ) : (
          <>
            <Board
              length={len}
              rows={rows}
              draft={draft}
              ongoing={ongoing}
              revealRow={reveal?.len === len ? reveal.row : null}
              shakeKey={shakeKey}
              bounceRow={bounce?.len === len ? bounce.row : null}
            />
            {hardActive && ongoing && (
              <p className={s.hardBadge}>
                Svårt läge{rows.length > 0 ? " 🔒" : ""}
              </p>
            )}
          </>
        )}
      </div>

      {session && finished && !revealing ? (
        <div className={s.donePanel}>
          <p>
            {session.state === "won" ? "Klarad!" : "Missad."} Ordet var{" "}
            <strong className="mono">{session.answer?.toUpperCase()}</strong>
          </p>
          <div className={s.doneButtons}>
            <button type="button" className={u.btnGhost} onClick={() => setShowResult(true)}>
              Visa resultat
            </button>
            {nextUnfinished && (
              <button type="button" className={u.btnPrimary} onClick={() => switchLength(nextUnfinished)}>
                {nextUnfinished} bokstäver →
              </button>
            )}
          </div>
        </div>
      ) : (
        <Keyboard state={keys} onKey={onKey} disabled={!session || !ongoing} />
      )}

      {IS_DEV && data && (
        <footer className={u.devbar}>
          <span>Utvecklingsläge</span>
          <button
            type="button"
            onClick={async () => {
              await api.devReset(datum);
              setShowResult(false);
              setDrafts({});
              setBounce(null);
              await load();
              notify("Dagens ord nollställda.");
            }}
          >
            Nollställ dagens ord
          </button>
        </footer>
      )}

      <Modal open={showHelp} onClose={() => setShowHelp(false)} title="Så spelar du" returnFocus={() => boardRef.current?.focus()}>
        <HowToPlay />
        <HowToPlayFooter never={htp.never} onNever={htp.setNever} onClose={() => setShowHelp(false)} />
      </Modal>

      {session && current && data && finished && (
        <Modal open={showResult} onClose={() => setShowResult(false)} title="Resultat" wide returnFocus={() => boardRef.current?.focus()}>
          <ResultSheet
            session={session}
            number={data.number}
            stats={data.stats[session.length]}
            daily={current.daily}
            colorblind={colorblind}
            nextLabel={nextUnfinished ? `Nästa: ${nextUnfinished} bokstäver` : null}
            onNext={() => nextUnfinished && switchLength(nextUnfinished)}
            onShare={() => void share()}
            countdownTarget={countdownTarget}
            isArchive={data.isArchive}
          />
        </Modal>
      )}

      <p className="visually-hidden" aria-live="polite">
        {announce}
      </p>
      <ToastRegion toast={toast} />
    </main>
  );
}
