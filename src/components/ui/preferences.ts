"use client";
// Inställningar som bara sparas i webbläsaren (gäller alla spel).
import { useCallback, useEffect, useState } from "react";

const COLORBLIND_KEY = "klurig:fargblind";

function read(key: string): boolean {
  try {
    return localStorage.getItem(key) === "1";
  } catch {
    return false;
  }
}

function write(key: string, on: boolean) {
  try {
    if (on) localStorage.setItem(key, "1");
    else localStorage.removeItem(key);
  } catch {
    /* privat läge – gäller bara den här sidvisningen */
  }
}

/** Ett av/på-val i localStorage. `false` tills sidan har laddats i webbläsaren. */
export function useFlag(key: string): [boolean, (on: boolean) => void] {
  const [on, setOn] = useState(false);
  useEffect(() => setOn(read(key)), [key]);
  const set = useCallback(
    (next: boolean) => {
      write(key, next);
      setOn(next);
    },
    [key],
  );
  return [on, set];
}

/** Färgblindläge: blå/orange i stället för grön/gul (klassen .cb på <html>). */
export function useColorblind(): [boolean, (on: boolean) => void] {
  const [on, set] = useFlag(COLORBLIND_KEY);
  useEffect(() => {
    document.documentElement.classList.toggle("cb", on);
  }, [on]);
  return [on, set];
}
