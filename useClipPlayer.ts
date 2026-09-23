"use client";
import { useCallback, useEffect, useRef, useState } from "react";

export type PlayerStatus = "idle" | "loading" | "playing" | "error";

/**
 * Spelar upp ett klipp via HTMLAudioElement (spelar även när iPhone står i
 * tyst läge). Klippen hämtas som blob och cachas per nyckel. Servern skickar
 * bara upplåst längd, så klippet slutar av sig självt vid rätt tidssteg.
 */
export function useClipPlayer() {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const urls = useRef(new Map<string, string>());
  const raf = useRef<number | null>(null);
  const currentKey = useRef<string | null>(null);
  const [status, setStatus] = useState<PlayerStatus>("idle");
  const [position, setPosition] = useState(0);
  const [activeKey, setActiveKey] = useState<string | null>(null);

  useEffect(() => {
    const audio = new Audio();
    audio.preload = "auto";
    audioRef.current = audio;
    const onEnd = () => {
      if (raf.current) cancelAnimationFrame(raf.current);
      setStatus("idle");
      setPosition(0);
    };
    audio.addEventListener("ended", onEnd);
    const cache = urls.current;
    return () => {
      audio.pause();
      audio.removeEventListener("ended", onEnd);
      if (raf.current) cancelAnimationFrame(raf.current);
      for (const u of cache.values()) URL.revokeObjectURL(u);
    };
  }, []);

  const tick = useCallback(() => {
    const a = audioRef.current;
    if (!a) return;
    setPosition(a.currentTime);
    if (!a.paused) raf.current = requestAnimationFrame(tick);
  }, []);

  const stop = useCallback(() => {
    const a = audioRef.current;
    if (!a) return;
    a.pause();
    a.currentTime = 0;
    if (raf.current) cancelAnimationFrame(raf.current);
    setStatus("idle");
    setPosition(0);
  }, []);

  const play = useCallback(
    async (key: string, url: string, { external = false } = {}) => {
      const a = audioRef.current;
      if (!a) return;
      stop();
      currentKey.current = key;
      setActiveKey(key);
      setStatus("loading");
      try {
        let src = urls.current.get(key);
        if (!src) {
          if (external) {
            src = url;
          } else {
            const res = await fetch(url, { cache: "no-store" });
            if (!res.ok) throw new Error(String(res.status));
            src = URL.createObjectURL(await res.blob());
          }
          urls.current.set(key, src);
        }
        if (currentKey.current !== key) return; // användaren hann byta
        a.src = src;
        a.currentTime = 0;
        await a.play();
        setStatus("playing");
        raf.current = requestAnimationFrame(tick);
      } catch {
        setStatus("error");
      }
    },
    [stop, tick],
  );

  const toggle = useCallback(
    (key: string, url: string, opts?: { external?: boolean }) => {
      if (status === "playing" && activeKey === key) stop();
      else void play(key, url, opts);
    },
    [status, activeKey, stop, play],
  );

  return { status, position, activeKey, play, stop, toggle };
}
