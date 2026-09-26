"use client";
import Link from "next/link";
import { nextGame, type GameSlug } from "@/game-engine/hub";
import u from "@/components/ui/ui.module.css";
import { useToday } from "./useToday";

/** "Nästa spel: Rättstavat →" – nästa spel som inte är klart idag, annars tillbaka till startsidan. */
export function NextGameButton({ current, primary = true }: { current: GameSlug; primary?: boolean }) {
  const { today } = useToday();
  const next = today ? nextGame(today.games, current) : null;
  const cls = `${primary ? u.btnPrimary : u.btnGhost} ${u.linkBtn}`;
  if (!today) return <span className={cls} aria-hidden="true" style={{ visibility: "hidden" }} />;
  if (!next) {
    return (
      <Link href="/" className={cls}>
        Allt klart – till startsidan
      </Link>
    );
  }
  return (
    <Link href={next.href} className={cls}>
      Nästa spel: {next.name} →
    </Link>
  );
}
