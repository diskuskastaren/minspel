"use client";
import { useCallback, useEffect, useState } from "react";
import s from "./ui.module.css";

const EVERY_MS = 15 * 86_400_000;
const NEVER = "aldrig";

/**
 * "Så spelar du" visas automatiskt första gången och sedan var 15:e dag,
 * om spelaren inte har valt "Visa inte igen".
 */
export function useHowToPlay(game: string) {
  const key = `klurig:${game}:htp`;
  const [open, setOpen] = useState(false);
  const [never, setNeverState] = useState(false);

  useEffect(() => {
    try {
      const v = localStorage.getItem(key);
      if (v === NEVER) {
        setNeverState(true);
        return;
      }
      if (Date.now() - Number(v ?? 0) > EVERY_MS) {
        setOpen(true);
        localStorage.setItem(key, String(Date.now()));
      }
    } catch {
      /* privat läge – visa inte automatiskt */
    }
  }, [key]);

  const setNever = useCallback(
    (on: boolean) => {
      setNeverState(on);
      try {
        localStorage.setItem(key, on ? NEVER : String(Date.now()));
      } catch {
        /* gäller bara den här sidvisningen */
      }
    },
    [key],
  );

  return { open, setOpen, never, setNever };
}

export function HowToPlayFooter({ never, onNever, onClose }: { never: boolean; onNever: (on: boolean) => void; onClose: () => void }) {
  return (
    <div className={s.htpFooter}>
      <button type="button" className={`${s.btnPrimary} ${s.htpGo}`} onClick={onClose}>
        Nu kör vi
      </button>
      <label className={s.htpNever}>
        <input type="checkbox" checked={never} onChange={(e) => onNever(e.target.checked)} />
        Visa inte automatiskt igen
      </label>
    </div>
  );
}
