"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import type { AudioSource } from "./api";

/** Hittar en svensk röst i webbläsaren. Röstlistan laddas asynkront i vissa webbläsare. */
function swedishVoice(): Promise<SpeechSynthesisVoice | null> {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) return Promise.resolve(null);
  const pick = () => speechSynthesis.getVoices().find((v) => v.lang.toLowerCase().replace("_", "-").startsWith("sv")) ?? null;
  const now = pick();
  if (now || speechSynthesis.getVoices().length > 0) return Promise.resolve(now);
  return new Promise((resolve) => {
    const done = () => resolve(pick());
    speechSynthesis.addEventListener("voiceschanged", done, { once: true });
    setTimeout(done, 1200);
  });
}

export type SpeakerStatus = "idle" | "loading" | "playing";

/**
 * Spelar upp en uppläsning: förgenererad MP3 om servern har en, annars
 * webbläsarens talsyntes med svensk röst. `rate` 0,75 = långsamt.
 */
export function useSpeaker() {
  const [status, setStatus] = useState<SpeakerStatus>("idle");
  const [activeKey, setActiveKey] = useState<string | null>(null);
  const [noVoice, setNoVoice] = useState(false);
  const cache = useRef(new Map<string, Promise<AudioSource>>());
  const audio = useRef<HTMLAudioElement | null>(null);
  const token = useRef(0);

  const stop = useCallback(() => {
    token.current++;
    audio.current?.pause();
    if (typeof window !== "undefined" && "speechSynthesis" in window) speechSynthesis.cancel();
    setStatus("idle");
    setActiveKey(null);
  }, []);

  useEffect(() => stop, [stop]);

  const play = useCallback(
    async (key: string, load: () => Promise<AudioSource>, rate = 1): Promise<void> => {
      stop();
      const my = ++token.current;
      setActiveKey(key);
      setStatus("loading");
      try {
        if (!cache.current.has(key)) cache.current.set(key, load());
        const src = await cache.current.get(key)!;
        if (my !== token.current) return;
        const finish = () => {
          if (my === token.current) {
            setStatus("idle");
            setActiveKey(null);
          }
        };
        if (src.kind === "mp3") {
          const el = audio.current ?? new Audio();
          audio.current = el;
          el.src = src.url;
          el.playbackRate = rate;
          el.onended = finish;
          el.onerror = finish;
          await el.play();
          setStatus("playing");
          return;
        }
        const voice = await swedishVoice();
        if (my !== token.current) return;
        if (!voice) {
          setNoVoice(true);
          finish();
          return;
        }
        const u = new SpeechSynthesisUtterance(src.text);
        u.voice = voice;
        u.lang = voice.lang;
        u.rate = rate;
        u.onend = finish;
        u.onerror = finish;
        speechSynthesis.speak(u);
        setStatus("playing");
      } catch (e) {
        cache.current.delete(key);
        if (my === token.current) {
          setStatus("idle");
          setActiveKey(null);
        }
        throw e;
      }
    },
    [stop],
  );

  return { play, stop, status, activeKey, noVoice };
}
