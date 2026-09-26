"use client";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { STEPS, MAX_ATTEMPTS, formatSeconds, isCategory, shareText, type CategorySlug } from "@/game-engine/oronmask";
import type { GameState, SearchHit } from "@/game-engine/oronmask-api-types";
import { ApiError, api, errorText } from "./api";
import { Board } from "./Board";
import { HowToPlay } from "./HowToPlay";
import { DateLine } from "@/components/hub/DateLine";
import { GameHeader } from "@/components/hub/GameHeader";
import { HowToPlayFooter, useHowToPlay } from "@/components/ui/HowToPlay";
import { Modal } from "@/components/ui/Modal";
import { ResultSheet } from "./ResultSheet";
import { SearchBox, type SearchBoxHandle } from "./SearchBox";
import { Timeline } from "./Timeline";
import { Vinyl } from "./Vinyl";
import { useClipPlayer } from "./useClipPlayer";
import { playSfx } from "@/components/ui/sound";
import u from "@/components/ui/ui.module.css";
import s from "./oronmask.module.css";

const IS_DEV = process.env.NODE_ENV !== "production";

type Toast = { id: number; text: string; tone: "info" | "good" | "half" | "bad" };

export function OronmaskGame() {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const datum = params.get("datum");
  const wantedCat = params.get("kategori");

  const [data, setData] = useState<GameState | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [cat, setCat] = useState<CategorySlug | null>(null);
  const [selected, setSelected] = useState<SearchHit | null>(null);
  const [pending, setPending] = useState(false);
  const [showResult, setShowResult] = useState(false);
  const htp = useHowToPlay("oronmask");
  const showHelp = htp.open;
  const setShowHelp = htp.setOpen;
  const [toast, setToast] = useState<Toast | null>(null);
  const [countdownTarget, setCountdownTarget] = useState(0);
  const searchRef = useRef<SearchBoxHandle>(null);
  const player = useClipPlayer();
  const stopAudio = player.stop;

  const notify = useCallback((text: string, tone: Toast["tone"] = "info") => {
    const id = Date.now();
    setToast({ id, text, tone });
    setTimeout(() => setToast((t) => (t?.id === id ? null : t)), 2800);
  }, []);

  const load = useCallback(async () => {
    try {
      const st = await api.state(datum);
      setData(st);
      setCountdownTarget(Date.now() + st.msUntilNext);
      setLoadError(null);
      setCat((current) => {
        if (current) return current;
        if (isCategory(wantedCat)) return wantedCat;
        return (st.categories.find((c) => c.session.state === "ongoing") ?? st.categories[0]).slug;
      });
    } catch (e) {
      setLoadError(errorText(e));
    }
  }, [datum, wantedCat]);

  useEffect(() => {
    void load();
  }, [load]);

  // Datumet som faktiskt spelas (kan vara gårdagens strax efter midnatt).
  const playDate = datum ?? data?.date ?? null;

  const current = useMemo(() => data?.categories.find((c) => c.slug === cat) ?? null, [data, cat]);
  const session = current?.session ?? null;
  const moves = session?.moves.length ?? 0;
  const ongoing = session?.state === "ongoing";
  const finished = !!session && !ongoing;
  const locked = ongoing && moves > 0;
  const clipKey = session ? `clip:${session.date}:${session.category}:${moves}` : "";

  // Dygnsbyte medan sidan är öppen: en påbörjad låt får spelas klart (servern
  // ger 30 minuters marginal), annars laddas dagens nya låtar direkt.
  useEffect(() => {
    if (!countdownTarget || data?.isArchive) return;
    const t = setTimeout(
      () => {
        if (locked) {
          notify("Klockan slog tolv! Spela klart din låt – sedan väntar dagens nya.");
        } else {
          notify("Klockan slog tolv! Dagens nya låtar är här.", "good");
          stopAudio();
          setShowResult(false);
          void load();
        }
      },
      Math.max(0, countdownTarget - Date.now()) + 1500,
    );
    return () => clearTimeout(t);
  }, [countdownTarget, data?.isArchive, locked, notify, stopAudio, load]);

  const playClip = useCallback(() => {
    if (!session || !cat) return;
    if (finished && session.answer?.previewUrl) {
      player.toggle(`full:${session.date}:${cat}`, session.answer.previewUrl, { external: true });
      return;
    }
    player.toggle(clipKey, api.clipUrl(cat, playDate, moves));
  }, [session, cat, finished, player, clipKey, playDate, moves]);

  useEffect(() => {
    if (player.status === "error") notify("Kunde inte spela klippet. Försök igen.", "bad");
  }, [player.status, notify]);

  // Mellanslag spelar/stoppar när fokus inte är i ett fält.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement;
      if (e.code !== "Space" || el.closest("input, textarea, button, a, dialog")) return;
      e.preventDefault();
      playClip();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [playClip]);

  const submit = useCallback(
    async (trackId: number | null) => {
      if (!session || !cat || pending || !ongoing) return;
      setPending(true);
      player.stop();
      try {
        const res = await api.move({ kategori: cat, idx: moves, trackId, datum: playDate });
        setData((d) =>
          d && {
            ...d,
            categories: d.categories.map((c) => (c.slug === cat ? { ...c, session: res.session } : c)),
            stats: { ...d.stats, [cat]: res.stats },
          },
        );
        setSelected(null);
        const last = res.session.moves[res.session.moves.length - 1];
        if (res.session.state !== "ongoing") {
          playSfx(res.session.state === "won" ? "win" : "lose");
          setTimeout(() => setShowResult(true), 900);
        } else {
          if (last?.kind === "guess") playSfx("wrong");
          if (last?.kind === "guess") notify(last.result === "artist" ? "Rätt artist – men fel låt!" : "Inte den här.", last.result === "artist" ? "half" : "bad");
          const n = res.session.moves.length;
          // Spela direkt upp det längre klippet (användaren har precis klickat, så autoplay tillåts).
          setTimeout(() => void player.play(`clip:${res.session.date}:${cat}:${n}`, api.clipUrl(cat, playDate, n)), 250);
          searchRef.current?.focus();
        }
      } catch (e) {
        notify(errorText(e), "bad");
        if (e instanceof ApiError && (e.code === "MOVE_OUT_OF_ORDER" || e.code === "SESSION_FINISHED")) void load();
      } finally {
        setPending(false);
      }
    },
    [session, cat, pending, ongoing, player, moves, playDate, notify, load],
  );

  function switchCat(slug: CategorySlug) {
    if (slug === cat) return;
    if (locked) {
      notify("Gör klart den här låten först.", "info");
      return;
    }
    player.stop();
    setSelected(null);
    setShowResult(false);
    setCat(slug);
    const q = new URLSearchParams(params.toString());
    q.set("kategori", slug);
    router.replace(`${pathname}?${q.toString()}`, { scroll: false });
  }

  const nextUnfinished = data?.categories.find((c) => c.slug !== cat && c.session.state === "ongoing") ?? null;

  async function share() {
    if (!session) return;
    const text = shareText(session, `${window.location.origin}/oronmask`);
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

  if (loadError) {
    return (
      <main className={s.page}>
        <div className={u.fatal}>
          <p className="display">Nu hakade skivan upp sig.</p>
          <p>{loadError}</p>
          <button type="button" className={u.btnPrimary} onClick={() => void load()}>
            Försök igen
          </button>
        </div>
      </main>
    );
  }

  const stepNow = STEPS[Math.min(moves, STEPS.length - 1)];
  const stepNext = STEPS[Math.min(moves + 1, STEPS.length - 1)];
  const lastTry = moves === MAX_ATTEMPTS - 1;
  const actionLabel = selected ? "Gissa" : lastTry ? "Ge upp" : `Hoppa över (+${formatSeconds(stepNext - stepNow).replace(" s", "")} s)`;

  return (
    <main className={s.page}>
      <GameHeader
        title="Öronmask"
        current="oronmask"
        onHelp={() => setShowHelp(true)}
        returnFocus={() => searchRef.current?.focus()}
        subtitle={<DateLine data={data} />}
      />

      <nav className={u.tabs} aria-label="Kategorier">
        {(data?.categories ?? []).map((c) => {
          const done = c.session.state !== "ongoing";
          return (
            <button
              key={c.slug}
              type="button"
              className={`${u.tab} ${c.slug === cat ? u.tabActive : ""} ${done ? (c.session.state === "won" ? u.tabWon : u.tabLost) : ""}`}
              aria-current={c.slug === cat ? "page" : undefined}
              aria-disabled={locked && c.slug !== cat}
              onClick={() => switchCat(c.slug)}
            >
              <span className={s.tabName}>{c.short}</span>
              {done && <span className={u.tabMark} aria-label={c.session.state === "won" ? "klarad" : "missad"} />}
            </button>
          );
        })}
      </nav>

      {!session || !current ? (
        <div className={u.skeleton} aria-busy="true" aria-label="Laddar dagens låt" />
      ) : (
        <>
          <section className={s.deck} aria-label={`Dagens låt – ${current.name}`}>
            <p className={s.deckCat}>{current.name}</p>
            <Vinyl
              status={player.status === "playing" && player.activeKey?.startsWith(finished ? "full:" : clipKey) ? "playing" : player.status === "loading" ? "loading" : "idle"}
              onClick={playClip}
              label={finished ? "Spela hela förhandslyssningen" : `Spela ${formatSeconds(session.unlocked)}`}
            />
            <Timeline
              seed={`${session.date}:${session.category}`}
              unlocked={session.unlocked}
              position={player.position}
              playing={player.status === "playing"}
              finished={finished}
            />
          </section>

          <Board moves={session.moves} ongoing={ongoing} />

          <div className={s.controls}>
            {ongoing ? (
              <>
                <SearchBox ref={searchRef} selected={selected} onSelect={setSelected} onSubmit={() => selected && void submit(selected.id)} disabled={pending} />
                <button
                  type="button"
                  className={`${selected ? u.btnPrimary : lastTry ? u.btnDanger : u.btnGhost} ${s.actionBtn}`}
                  onClick={() => void submit(selected ? selected.id : null)}
                  disabled={pending}
                >
                  {pending ? "…" : actionLabel}
                </button>
              </>
            ) : (
              <div className={s.doneBar}>
                <span>
                  {session.state === "won" ? "Klarad!" : "Missad."} Låten var <strong>{session.answer?.title}</strong>
                </span>
                <button type="button" className={u.btnPrimary} onClick={() => setShowResult(true)}>
                  Visa resultat
                </button>
              </div>
            )}
          </div>
        </>
      )}

      {IS_DEV && data && (
        <footer className={u.devbar}>
          <span>Utvecklingsläge</span>
          <button
            type="button"
            onClick={async () => {
              player.stop();
              await api.devReset(datum);
              setShowResult(false);
              await load();
              notify("Dagens rundor nollställda.");
            }}
          >
            Nollställ dagens rundor
          </button>
        </footer>
      )}

      <Modal open={showHelp} onClose={() => setShowHelp(false)} title="Så spelar du" returnFocus={() => searchRef.current?.focus()}>
        <HowToPlay />
        <HowToPlayFooter never={htp.never} onNever={htp.setNever} onClose={() => setShowHelp(false)} />
      </Modal>

      {session && current && data && finished && (
        <Modal open={showResult} onClose={() => setShowResult(false)} title="Resultat" wide>
          <ResultSheet
            session={session}
            categoryName={current.name}
            number={data.number}
            stats={data.stats[current.slug]}
            nextLabel={nextUnfinished ? `Nästa: ${nextUnfinished.name}` : null}
            onNext={() => nextUnfinished && switchCat(nextUnfinished.slug)}
            onShare={() => void share()}
            countdownTarget={countdownTarget}
            isArchive={data.isArchive}
            preview={{
              status: player.status,
              active: player.activeKey === `full:${session.date}:${current.slug}`,
              position: player.position,
              toggle: playClip,
            }}
          />
        </Modal>
      )}

      <div className={u.toastRegion} aria-live="polite">
        {toast && (
          <div key={toast.id} className={`${u.toast} ${u[`toast_${toast.tone}`]}`}>
            {toast.text}
          </div>
        )}
      </div>
    </main>
  );
}
