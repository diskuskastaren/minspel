"use client";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { ROUNDS, isCorrect, shareText } from "@/game-engine/rattstavat";
import type { AudioKind, GameState } from "@/game-engine/rattstavat-api-types";
import { normalizeKey } from "@/lib/normalize-word";
import { Keyboard } from "@/components/ui/Keyboard";
import { DateLine } from "@/components/hub/DateLine";
import { GameHeader } from "@/components/hub/GameHeader";
import { HowToPlayFooter, useHowToPlay } from "@/components/ui/HowToPlay";
import { Modal } from "@/components/ui/Modal";
import { ToastRegion, useToast } from "@/components/ui/Toast";
import { playSfx } from "@/components/ui/sound";
import u from "@/components/ui/ui.module.css";
import { ApiError, api, errorText } from "./api";
import { Diff, RevealTiles, revealLength } from "./Answer";
import { HowToPlay } from "./HowToPlay";
import { Summary } from "./Summary";
import { useSpeaker } from "./useSpeaker";
import s from "./rattstavat.module.css";

const IS_DEV = process.env.NODE_ENV !== "production";
/** Avslöjandet visar en bokstav i taget. */
const REVEAL_MS = 350;
const MAX_LEN = 40;
const LEVEL_NAMES = ["", "Vardagsord", "Kluriga ljud", "Vanliga fällor", "Lånord", "Mästarnivå"];

type Panel = "definition" | "mening" | "ursprung";

function SpeakerIcon() {
  return (
    <svg viewBox="0 0 24 24" width="30" height="30" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 9v6h4l5 4V5L8 9H4Z" fill="currentColor" />
      <path d="M16.5 8.5a5 5 0 0 1 0 7" />
      <path d="M19 6a8.5 8.5 0 0 1 0 12" />
    </svg>
  );
}

export function RattstavatGame() {
  const params = useSearchParams();
  const datum = params.get("datum");

  const [data, setData] = useState<GameState | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [view, setView] = useState<number | null>(null);
  const [draft, setDraft] = useState("");
  const [pending, setPending] = useState(false);
  const [reveal, setReveal] = useState<{ round: number; shown: number } | null>(null);
  const [panels, setPanels] = useState<Record<number, Partial<Record<Panel, true>>>>({});
  const [practice, setPractice] = useState<number | null>(null);
  const [shakeKey, setShakeKey] = useState(0);
  const htp = useHowToPlay("rattstavat");
  const showHelp = htp.open;
  const setShowHelp = htp.setOpen;
  const [showResult, setShowResult] = useState(false);
  const [announce, setAnnounce] = useState("");
  const [countdownTarget, setCountdownTarget] = useState(0);
  const { toast, notify } = useToast();
  const speaker = useSpeaker();
  const stageRef = useRef<HTMLDivElement>(null);
  const stopAudio = speaker.stop;

  const load = useCallback(async () => {
    try {
      const st = await api.state(datum);
      setData(st);
      setCountdownTarget(Date.now() + st.msUntilNext);
      setLoadError(null);
    } catch (e) {
      setLoadError(errorText(e));
    }
  }, [datum]);

  useEffect(() => {
    void load();
  }, [load]);

  const playDate = datum ?? data?.date ?? null;
  const finished = data?.state === "finished";
  const index = data ? Math.min(view ?? data.current, ROUNDS - 1) : 0;
  const round = data?.rounds[index] ?? null;
  const result = round?.result ?? null;
  const revealing = reveal !== null;
  const answering = !!data && !finished && index === data.current && !revealing;
  const practicing = practice === index && !!result && !revealing;
  const typing = answering || practicing;
  const open = panels[index] ?? {};

  // Avslöjandet: en bokstav i taget, sedan resultatet.
  useEffect(() => {
    if (!reveal || !data) return;
    const res = data.rounds[reveal.round].result;
    if (!res) return;
    const total = revealLength(res);
    if (reveal.shown < total) {
      const t = setTimeout(() => {
        playSfx("flip");
        setReveal((r) => r && { ...r, shown: r.shown + 1 });
      }, REVEAL_MS);
      return () => clearTimeout(t);
    }
    const t = setTimeout(() => {
      setReveal(null);
      setAnnounce(res.correct ? `Rätt! ${res.word.toUpperCase()}` : `Fel. Rätt stavning är ${res.word.toUpperCase()}`);
      playSfx(res.correct ? "correct" : "wrong");
      notify(res.correct ? "Snyggt!" : "Nära – men inte riktigt", res.correct ? "good" : "bad");
      if (data.state === "finished") setTimeout(() => setShowResult(true), 1200);
    }, 250);
    return () => clearTimeout(t);
  }, [reveal, data, notify]);

  // Dygnsbyte medan sidan är öppen: en påbörjad runda får spelas klart (servern
  // ger 30 minuters marginal), annars laddas dagens nya ord direkt.
  useEffect(() => {
    if (!countdownTarget || data?.isArchive) return;
    const inProgress = !!data && data.state === "ongoing" && data.current > 0;
    const t = setTimeout(
      () => {
        if (inProgress) {
          notify("Klockan slog tolv! Spela klart dina ord – sedan väntar dagens nya.", "info", 5000);
        } else {
          notify("Klockan slog tolv! Dagens nya ord är här.", "good");
          stopAudio();
          setShowResult(false);
          setView(null);
          setPanels({});
          void load();
        }
      },
      Math.max(0, countdownTarget - Date.now()) + 1500,
    );
    return () => clearTimeout(t);
  }, [countdownTarget, data, notify, stopAudio, load]);

  const speak = useCallback(
    (i: number, kind: AudioKind, rate = 1) => {
      speaker.play(`${playDate}:${i}:${kind}`, () => api.audio(i, kind, playDate), rate).catch((e) => notify(errorText(e), "bad"));
    },
    [speaker, playDate, notify],
  );

  useEffect(() => {
    if (speaker.noVoice) notify("Webbläsaren saknar en svensk röst – använd förklaringen och meningen.", "half", 5000);
  }, [speaker.noVoice, notify]);

  function togglePanel(p: Panel) {
    setPanels((all) => ({ ...all, [index]: { ...all[index], [p]: true } }));
    if (p === "definition") speak(index, "definition");
    if (p === "mening") speak(index, "mening");
  }

  const submit = useCallback(async () => {
    if (!data || pending) return;
    const text = draft.trim();
    if (!text) {
      playSfx("invalid");
      setShakeKey((k) => k + 1);
      notify("Skriv ordet först", "bad");
      return;
    }
    if (practicing && result) {
      if (isCorrect(text, { ord: result.word })) {
        playSfx("correct");
        notify("Rätt! Nu sitter det.", "good");
        setPractice(null);
        setDraft("");
      } else {
        playSfx("invalid");
        setShakeKey((k) => k + 1);
        notify("Inte riktigt – lyssna och försök igen.", "bad");
      }
      return;
    }
    if (!answering) return;
    setPending(true);
    speaker.stop();
    try {
      const st = await api.answer({ runda: index, svar: text, datum: playDate });
      // Stanna kvar på ordet som just besvarades tills spelaren går vidare.
      setView(index);
      setData(st);
      setDraft("");
      setReveal({ round: index, shown: 0 });
    } catch (e) {
      notify(errorText(e), "bad");
      if (e instanceof ApiError && (e.code === "MOVE_OUT_OF_ORDER" || e.code === "SESSION_FINISHED")) void load();
    } finally {
      setPending(false);
    }
  }, [data, pending, draft, practicing, result, answering, speaker, index, playDate, notify, load]);

  const onKey = useCallback(
    (key: string) => {
      if (!typing || pending) return;
      if (key === "Enter") return void submit();
      if (key === "Backspace") return setDraft((d) => [...d].slice(0, -1).join(""));
      const ch = normalizeKey(key);
      if (ch) {
        playSfx("tap");
        setDraft((d) => ([...d].length < MAX_LEN ? d + ch : d));
      }
    },
    [typing, pending, submit],
  );

  // Fysiskt tangentbord. `event.key` så att Å Ä Ö fungerar oavsett layout.
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
        if (!onGameKey && e.key !== "Enter" && el.closest("button, a")) stageRef.current?.focus({ preventScroll: true });
        onKey(e.key);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onKey]);

  function goTo(i: number) {
    if (!data || revealing || i > data.current) return;
    speaker.stop();
    setDraft("");
    setPractice(null);
    setView(i === data.current ? null : i);
    stageRef.current?.focus({ preventScroll: true });
  }

  function nextWord() {
    if (!data) return;
    goTo(data.current);
    // Knapptrycket räknas som användargest, så uppläsningen får starta direkt.
    speak(data.current, "ord");
  }

  async function share() {
    if (!data) return;
    const text = shareText(
      { date: data.date, answers: data.rounds.filter((r) => r.result).map((r) => ({ input: r.result!.input, correct: r.result!.correct })) },
      `${window.location.origin}/rattstavat`,
    );
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

  const playingKey = speaker.status !== "idle" ? speaker.activeKey : null;
  const isPlaying = (kind: AudioKind) => playingKey === `${playDate}:${index}:${kind}`;
  const showResultPanel = !!result && !(reveal?.round === index);
  const shownTiles = reveal?.round === index ? reveal.shown : Infinity;

  const dailyText = useMemo(() => {
    if (!result) return null;
    const { answered, correct } = result.daily;
    if (!answered) return null;
    return `${Math.round((correct / answered) * 100)} % av ${answered} spelare klarade det idag`;
  }, [result]);

  if (loadError && !data) {
    return (
      <main className={s.page}>
        <div className={u.fatal}>
          <p className="display">Nu tappade vi rösten.</p>
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
        title="Rättstavat"
        current="rattstavat"
        onHelp={() => setShowHelp(true)}
        returnFocus={() => stageRef.current?.focus()}
        titleClassName={s.title}
        subtitle={<DateLine data={data} />}
      />

      <nav className={s.dots} aria-label="Dagens ord">
        {(data?.rounds ?? Array.from({ length: ROUNDS }, () => null)).map((r, i) => {
          const res = r?.result;
          const locked = !data || i > data.current || (reveal !== null && reveal.round < i);
          const state = res && !(reveal?.round === i) ? (res.correct ? s.dotGood : s.dotBad) : "";
          return (
            <button
              key={i}
              type="button"
              className={`${s.dot} ${state} ${i === index ? s.dotActive : ""}`}
              disabled={locked}
              aria-current={i === index ? "step" : undefined}
              aria-label={`Ord ${i + 1}${res ? (res.correct ? ", rätt" : ", fel") : locked ? ", låst" : ", nu"}`}
              onClick={() => goTo(i)}
            >
              {res && !(reveal?.round === i) ? (res.correct ? "✓" : "✕") : i + 1}
            </button>
          );
        })}
      </nav>

      <div ref={stageRef} tabIndex={-1} className={s.stage}>
        {!data || !round ? (
          <div className={`${u.skeleton} ${s.stageSkeleton}`} aria-busy="true" aria-label="Laddar dagens ord" />
        ) : (
          <section className={s.card} aria-label={`Ord ${index + 1} av ${ROUNDS}`}>
            <p className={u.eyebrow}>
              Ord {index + 1} av {ROUNDS} · {LEVEL_NAMES[round.level]}
            </p>

            <div className={s.player}>
              <button
                type="button"
                className={`${s.speak} ${isPlaying("ord") ? s.speaking : ""}`}
                onClick={() => speak(index, "ord")}
                aria-label="Hör ordet"
              >
                <SpeakerIcon />
                <span>{isPlaying("ord") ? "Lyssna…" : "Hör ordet"}</span>
              </button>
              <div className={s.chips}>
                <button type="button" className={`${s.chip} ${isPlaying("ord") ? s.chipActive : ""}`} onClick={() => speak(index, "ord", 0.75)}>
                  Långsamt
                </button>
                <button type="button" className={`${s.chip} ${open.definition ? s.chipOpen : ""}`} onClick={() => togglePanel("definition")}>
                  Förklaring
                </button>
                <button type="button" className={`${s.chip} ${open.mening ? s.chipOpen : ""}`} onClick={() => togglePanel("mening")}>
                  Mening
                </button>
                {round.originLanguage && (
                  <button type="button" className={`${s.chip} ${open.ursprung ? s.chipOpen : ""}`} onClick={() => togglePanel("ursprung")}>
                    Ursprung
                  </button>
                )}
              </div>
            </div>

            {(open.definition || open.mening || open.ursprung || result) && (
              <dl className={s.clues}>
                {(open.definition || result) && round.definition && (
                  <div>
                    <dt>Förklaring</dt>
                    <dd>{round.definition}</dd>
                  </div>
                )}
                {(open.mening || result) && round.sentence && (
                  <div>
                    <dt>Mening</dt>
                    <dd>
                      {showResultPanel && result
                        ? result.sentence
                        : round.sentence.split("___").map((part, i) => (
                            <span key={i}>
                              {i > 0 && <span className={s.blank} aria-label="lucka" />}
                              {part}
                            </span>
                          ))}
                    </dd>
                  </div>
                )}
                {(open.ursprung || (result && result.origin)) && (round.originLanguage || result?.origin) && (
                  <div>
                    <dt>Ursprung</dt>
                    <dd>
                      {showResultPanel && result?.origin ? (
                        <>
                          {result.origin.sprak}: <em>{result.origin.fran}</em>
                        </>
                      ) : (
                        round.originLanguage
                      )}
                    </dd>
                  </div>
                )}
              </dl>
            )}

            {result && (
              <div className={s.answer}>
                <RevealTiles result={result} shown={shownTiles} />
                {showResultPanel && (
                  <div className={s.verdict}>
                    <p className={result.correct ? s.verdictGood : s.verdictBad}>{result.correct ? "Rätt stavat!" : "Rätt stavning:"}</p>
                    {!result.correct && <Diff input={result.input} word={result.word} />}
                    {dailyText && <p className={s.daily}>{dailyText}</p>}
                  </div>
                )}
              </div>
            )}
          </section>
        )}
      </div>

      {data && (
        <div className={s.controls}>
          {typing ? (
            <>
              <div key={shakeKey} className={`${s.tape} ${shakeKey ? s.shake : ""}`} aria-live="polite" aria-label={practicing ? "Öva: skriv ordet" : "Ditt svar"}>
                {practicing && <span className={s.tapeTag}>Öva</span>}
                {draft ? <span className={s.tapeText}>{draft.toUpperCase()}</span> : <span className={s.tapePlaceholder}>Skriv ordet…</span>}
                <span className={s.caret} aria-hidden="true" />
              </div>
              <Keyboard onKey={onKey} disabled={pending} enterLabel={practicing ? "Kolla" : "Svara"} />
            </>
          ) : result && !revealing ? (
            <div className={s.nextBar}>
              {!result.correct && (
                <button
                  type="button"
                  className={u.btnGhost}
                  onClick={() => {
                    setPractice(index);
                    setDraft("");
                    speak(index, "ord");
                  }}
                >
                  Öva igen
                </button>
              )}
              {finished ? (
                <button type="button" className={u.btnPrimary} onClick={() => setShowResult(true)}>
                  Visa resultat
                </button>
              ) : (
                <button type="button" className={u.btnPrimary} onClick={nextWord}>
                  {index === data.current - 1 ? "Nästa ord →" : `Till ord ${data.current + 1} →`}
                </button>
              )}
            </div>
          ) : null}
        </div>
      )}

      {IS_DEV && data && (
        <footer className={u.devbar}>
          <span>Utvecklingsläge</span>
          <button
            type="button"
            onClick={async () => {
              speaker.stop();
              await api.devReset(datum);
              setShowResult(false);
              setView(null);
              setPanels({});
              setPractice(null);
              setDraft("");
              await load();
              notify("Dagens ord nollställda.");
            }}
          >
            Nollställ dagens ord
          </button>
        </footer>
      )}

      <Modal open={showHelp} onClose={() => setShowHelp(false)} title="Så spelar du" returnFocus={() => stageRef.current?.focus()}>
        <HowToPlay />
        <HowToPlayFooter never={htp.never} onNever={htp.setNever} onClose={() => setShowHelp(false)} />
      </Modal>

      {data && finished && (
        <Modal open={showResult} onClose={() => setShowResult(false)} title="Resultat" wide returnFocus={() => stageRef.current?.focus()}>
          <Summary
            data={data}
            onShare={() => void share()}
            onReview={(i) => {
              setShowResult(false);
              goTo(i);
            }}
            countdownTarget={countdownTarget}
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
