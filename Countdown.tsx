"use client";
import { useEffect, useState } from "react";

const pad = (n: number) => String(n).padStart(2, "0");

export function Countdown({ target, onDone }: { target: number; onDone?: () => void }) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);
  const left = Math.max(0, target - now);
  useEffect(() => {
    if (left === 0) onDone?.();
  }, [left, onDone]);
  const h = Math.floor(left / 3_600_000);
  const m = Math.floor((left % 3_600_000) / 60_000);
  const sec = Math.floor((left % 60_000) / 1000);
  return (
    <time className="mono" suppressHydrationWarning>
      {pad(h)}:{pad(m)}:{pad(sec)}
    </time>
  );
}
