"use client";
import { useState } from "react";
import type { GameSlug } from "@/game-engine/hub";
import { Modal } from "@/components/ui/Modal";
import { Settings } from "@/components/ui/Settings";
import u from "@/components/ui/ui.module.css";
import { Feedback } from "./Feedback";
import { MenuContent } from "./Menu";
import s from "./hub.module.css";

type Props = {
  /** Utan rubrik visas bara knapparna (startsidan har egen logga). */
  title?: string;
  subtitle?: React.ReactNode;
  current?: GameSlug;
  onHelp?: () => void;
  /** Spelspecifika inställningar; standard är de gemensamma. */
  settings?: React.ReactNode;
  /** Vart fokus ska gå när menyn eller inställningarna stängs (spelytan). */
  returnFocus?: () => void;
  titleClassName?: string;
};

export function MenuIcon() {
  return (
    <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
      <path d="M4 7h16M4 12h16M4 17h10" />
    </svg>
  );
}

export function GearIcon() {
  return (
    <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true" fill="none" stroke="currentColor">
      <circle cx="12" cy="12" r="8.2" strokeWidth="3.2" strokeDasharray="3.22 3.22" />
      <circle cx="12" cy="12" r="5.6" strokeWidth="2.4" />
    </svg>
  );
}

/** Sidhuvud för alla sidor: meny, rubrik, hjälp och inställningar. */
export function GameHeader({ title, subtitle, current, onHelp, settings, returnFocus, titleClassName }: Props) {
  const [menu, setMenu] = useState(false);
  const [prefs, setPrefs] = useState(false);
  const [feedback, setFeedback] = useState(false);
  return (
    <>
      <header className={u.header}>
        <div className={s.headerLeft}>
          <button type="button" className={`${u.iconBtn} ${s.menuBtn}`} onClick={() => setMenu(true)} aria-label="Meny">
            <MenuIcon />
          </button>
        </div>
        <div className={u.brand}>
          {title && <h1 className={`display ${u.title} ${titleClassName ?? ""}`}>{title}</h1>}
          {subtitle !== undefined && <p className={u.subtitle}>{subtitle}</p>}
        </div>
        <div className={s.headerButtons}>
          {onHelp && (
            <button type="button" className={u.iconBtn} onClick={onHelp} aria-label="Så spelar du">
              ?
            </button>
          )}
          <button type="button" className={`${u.iconBtn} ${s.iconCenter}`} onClick={() => setPrefs(true)} aria-label="Inställningar">
            <GearIcon />
          </button>
        </div>
      </header>

      <Modal open={menu} onClose={() => setMenu(false)} title="Meny" variant="drawer" returnFocus={returnFocus}>
        {menu && (
          <MenuContent
            current={current}
            onNavigate={() => setMenu(false)}
            onFeedback={() => {
              setMenu(false);
              setFeedback(true);
            }}
          />
        )}
      </Modal>
      <Modal open={prefs} onClose={() => setPrefs(false)} title="Inställningar" returnFocus={returnFocus}>
        {settings ?? <Settings />}
      </Modal>
      <Modal open={feedback} onClose={() => setFeedback(false)} title="Tyck till" returnFocus={returnFocus}>
        {feedback && <Feedback game={current} onDone={() => setFeedback(false)} />}
      </Modal>
    </>
  );
}
