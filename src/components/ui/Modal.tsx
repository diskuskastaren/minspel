"use client";
import { useEffect, useRef } from "react";
import s from "./ui.module.css";

type Props = {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  /** Vart fokus ska gå när modalen stängs (t.ex. sökfältet) – inte knappen som öppnade den. */
  returnFocus?: () => void;
  wide?: boolean;
  /** "drawer" = sidomeny som glider in från vänster. */
  variant?: "center" | "drawer";
};

export function Modal({ open, onClose, title, children, returnFocus, wide, variant = "center" }: Props) {
  const ref = useRef<HTMLDialogElement>(null);
  const closeRef = useRef(onClose);
  const focusRef = useRef(returnFocus);
  closeRef.current = onClose;
  focusRef.current = returnFocus;

  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) d.showModal();
    if (!open && d.open) d.close();
  }, [open]);

  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    const onDialogClose = () => {
      closeRef.current();
      // Vänta ett varv så att webbläsarens egen fokusåterställning inte vinner.
      setTimeout(() => focusRef.current?.(), 0);
    };
    d.addEventListener("close", onDialogClose);
    return () => d.removeEventListener("close", onDialogClose);
  }, []);

  return (
    <dialog
      ref={ref}
      className={`${s.modal} ${wide ? s.modalWide : ""} ${variant === "drawer" ? s.drawer : ""}`}
      aria-label={title}
      onClick={(e) => {
        if (e.target === ref.current) ref.current?.close();
      }}
    >
      <div className={s.modalInner}>
        <button type="button" className={s.modalClose} onClick={() => ref.current?.close()} aria-label="Stäng">
          ✕
        </button>
        {children}
      </div>
    </dialog>
  );
}
