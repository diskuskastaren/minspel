import Link from "next/link";
import { GameHeader } from "@/components/hub/GameHeader";
import { CardStatus, Celebration, DaySummaryLine, Greeting, TodayProvider, WeekCard } from "@/components/home/Today";
import s from "./home.module.css";

const UPCOMING = [
  { name: "Aning", blurb: "Hitta ordet genom betydelse. Varmt eller kallt?", tag: "Kommer snart" },
  { name: "Mer eller mindre", blurb: "Vad är störst? Sverige i siffror.", tag: "Kommer snart" },
  { name: "Vilse", blurb: "Var i Sverige är du?", tag: "Senare" },
  { name: "Skalningsspel", blurb: "En ny idé är på gång.", tag: "Idé" },
];

export default function Home() {
  return (
    <TodayProvider>
    <main className={s.page}>
      <GameHeader />
      <header className={s.header}>
        <Greeting />
        <h1 className={`display ${s.logo}`}>
          Klurig<span aria-hidden="true">.</span>
        </h1>
        <DaySummaryLine />
      </header>

      <Celebration />

      <Link href="/oronmask" className={s.feature}>
        <span className={s.featureDisc} aria-hidden="true" />
        <span className={s.featureBody}>
          <span className={s.kicker}>Dagens låtar</span>
          <span className={`display ${s.featureTitle}`}>Öronmask</span>
          <span className={s.featureBlurb}>Känner du igen låten på en halv sekund?</span>
          <CardStatus slug="oronmask" />
        </span>
        <span className={s.featureArrow} aria-hidden="true">
          →
        </span>
      </Link>

      <Link href="/ordet" className={`${s.feature} ${s.featureAlt}`}>
        <span className={s.featureTiles} aria-hidden="true">
          <span>O</span>
          <span>R</span>
          <span>D</span>
        </span>
        <span className={s.featureBody}>
          <span className={s.kicker}>Dagens ord</span>
          <span className={`display ${s.featureTitle}`}>Ordet</span>
          <span className={s.featureBlurb}>Sex ord, tre till åtta bokstäver. Sex försök per ord.</span>
          <CardStatus slug="ordet" />
        </span>
        <span className={s.featureArrow} aria-hidden="true">
          →
        </span>
      </Link>

      <Link href="/rattstavat" className={`${s.feature} ${s.featureAlt} ${s.featureSpell}`}>
        <span className={s.featureBee} aria-hidden="true">
          <span>Aa</span>
        </span>
        <span className={s.featureBody}>
          <span className={s.kicker}>Dagens stavning</span>
          <span className={`display ${s.featureTitle}`}>Rättstavat</span>
          <span className={s.featureBlurb}>Hör ordet. Stava det rätt. Fem ord, allt klurigare.</span>
          <CardStatus slug="rattstavat" />
        </span>
        <span className={s.featureArrow} aria-hidden="true">
          →
        </span>
      </Link>

      <WeekCard />

      <section aria-label="Kommande spel">
        <h2 className={s.sectionTitle}>På gång</h2>
        <ul className={s.list}>
          {UPCOMING.map((g, i) => (
            <li key={g.name} className={s.item} style={{ animationDelay: `${120 + i * 50}ms` }}>
              <span className={`display ${s.itemName}`}>{g.name}</span>
              <span className={s.itemBlurb}>{g.blurb}</span>
              <span className={s.itemTag}>{g.tag}</span>
            </li>
          ))}
        </ul>
      </section>
    </main>
    </TodayProvider>
  );
}
