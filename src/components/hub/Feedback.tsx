"use client";
import { useState } from "react";
import type { GameSlug } from "@/game-engine/hub";
import u from "@/components/ui/ui.module.css";
import s from "./hub.module.css";

const KINDS = [
  ["bugg", "Något är fel"],
  ["forslag", "Förslag"],
  ["annat", "Annat"],
] as const;

const ERRORS: Record<string, string> = {
  RATE_LIMITED: "Du har skickat många meddelanden på kort tid. Försök igen om en stund.",
  VALIDATION_ERROR: "Skriv ett meddelande (högst 1 000 tecken).",
};

export function Feedback({ game, onDone }: { game?: GameSlug; onDone: () => void }) {
  const [kind, setKind] = useState<(typeof KINDS)[number][0]>("bugg");
  const [text, setText] = useState("");
  const [state, setState] = useState<"idle" | "sending" | "sent">("idle");
  const [error, setError] = useState<string | null>(null);

  async function send(e: React.FormEvent) {
    e.preventDefault();
    if (!text.trim()) return setError(ERRORS.VALIDATION_ERROR);
    setState("sending");
    setError(null);
    try {
      const res = await fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ typ: kind, text, spel: game ?? null, sida: location.pathname }),
      });
      if (!res.ok) {
        const code = ((await res.json().catch(() => ({}))) as { code?: string }).code ?? "";
        setError(ERRORS[code] ?? "Det gick inte att skicka. Försök igen.");
        setState("idle");
        return;
      }
      setState("sent");
    } catch {
      setError("Ingen anslutning – försök igen.");
      setState("idle");
    }
  }

  if (state === "sent") {
    return (
      <div className={s.feedbackDone}>
        <p className={u.eyebrow}>Tyck till</p>
        <h2 className={`display ${u.htpTitle}`}>Tack!</h2>
        <p>Vi läser allt som kommer in.</p>
        <button type="button" className={u.btnPrimary} onClick={onDone}>
          Stäng
        </button>
      </div>
    );
  }

  return (
    <form className={s.feedback} onSubmit={send}>
      <p className={u.eyebrow}>Tyck till</p>
      <h2 className={`display ${u.htpTitle}`}>Vad tycker du?</h2>
      <fieldset className={u.fieldset}>
        <legend className="visually-hidden">Typ av meddelande</legend>
        <div className={u.choice}>
          {KINDS.map(([v, label]) => (
            <label key={v}>
              <input type="radio" name="typ" value={v} checked={kind === v} onChange={() => setKind(v)} />
              {label}
            </label>
          ))}
        </div>
      </fieldset>
      <label className={s.feedbackField}>
        <span>Meddelande</span>
        <textarea value={text} onChange={(e) => setText(e.target.value)} maxLength={1000} rows={5} required placeholder="Berätta vad som hände eller vad du önskar …" />
        <span className={s.feedbackCount}>{text.length}/1000</span>
      </label>
      <p className={s.feedbackNote}>Skriv inga personuppgifter. Vi sparar meddelandet, vilket spel och vilken sida det gäller – inget mer.</p>
      {error && (
        <p className={s.feedbackError} role="alert">
          {error}
        </p>
      )}
      <button type="submit" className={u.btnPrimary} disabled={state === "sending"}>
        {state === "sending" ? "Skickar …" : "Skicka"}
      </button>
    </form>
  );
}
