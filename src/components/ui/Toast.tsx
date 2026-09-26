"use client";
import { useCallback, useState } from "react";
import s from "./ui.module.css";

export type Toast = { id: number; text: string; tone: "info" | "good" | "half" | "bad" };

/** Ett kort meddelande i taget högst upp på sidan. */
export function useToast() {
  const [toast, setToast] = useState<Toast | null>(null);
  const notify = useCallback((text: string, tone: Toast["tone"] = "info", ms = 2400) => {
    const id = Date.now() + Math.random();
    setToast({ id, text, tone });
    setTimeout(() => setToast((t) => (t?.id === id ? null : t)), ms);
  }, []);
  return { toast, notify };
}

export function ToastRegion({ toast }: { toast: Toast | null }) {
  return (
    <div className={s.toastRegion} aria-live="assertive">
      {toast && (
        <div key={toast.id} className={`${s.toast} ${s[`toast_${toast.tone}`]}`}>
          {toast.text}
        </div>
      )}
    </div>
  );
}
