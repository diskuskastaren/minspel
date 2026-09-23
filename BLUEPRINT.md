# Blueprint: Svensk samling dagliga ordspel och frågespel

> **Status:** Specifikation v1.0 · 2026-09-23
> **Underlag:** Analys av lessgames.com (se [docs/BILAGA-lessgames-research.md](docs/BILAGA-lessgames-research.md) för rådata, API-kontrakt och källmärkning).
> **Arbetsnamn:** **Klurig** (platshållare, byt med sök-och-ersätt). Alla spelnamn nedan är förslag.
>
> Dokumentet beskriver *vad* vi bygger och *varför*. Det kopierar inte Lessgames visuella design, texter, varumärke eller innehåll. Vi tar över genreidén: dagliga, snabba och delbara minispel.

---

## 0. Beslut och aktuell prioritering (gäller före §14 och §16)

*Beslutat 2026-09-23 av produktägaren:*

1. **Allt körs lokalt** tills produktägaren uttryckligen säger att sidan ska bli offentlig. Ingen deploy, ingen publik domän, inga externa konton som exponerar sidan. Sidan ska vara färdigutvecklad när den publiceras.
2. **Spelfunktionerna först.** Konton/inloggning, synk, Plus/betalning, arkiv-betalvägg, annonser, profiler och egna utmaningar väntar tills spelen fungerar. Anonyma lokala sessioner räcker under utvecklingen.
3. **Ordning:**
   1. **Öronmask (musikspelet)** – byggs först.
   2. Övriga spel (Ordet, Aning, Mer eller mindre, Rättstavat) – väntar.
   3. **Vilse** (Street View) – parkerad för senare implementering.
   4. **Skalningsspel** – ny idé som produktägaren utvecklar själv. *Endast notering tills vidare, ingen specifikation.*
4. **Musikkälla (verifierat 2026-09-23):**
   - **Spotify kan inte användas.** Spotifys utvecklarpolicy förbjuder uttryckligen spel: *"Do not create a game, including trivia quizzes."* Dessutom stängdes 30-sekunders `preview_url` av för alla nya appar den 27 nov 2024.
   - **Apple/iTunes** förhandslyssningar får bara användas i marknadsföringssyfte och *"not for entertainment purposes"* → olämpligt för ett spel.
   - **Deezer API** ger 30 s-klipp (`preview`-fält, ingen API-nyckel krävs för sök/läsning). Riktlinjerna tillåter 30 s-extrakt men förbjuder nedladdningsbar ljuddata. → **Används för lokal utveckling.** Kommersiella villkor ska granskas innan sidan blir offentlig.

5. **Status 2026-09-23:** Öronmask är byggd och spelbar lokalt (se [README.md](README.md)). Avvikelser från §5.5/§15 i denna fas: enkel Next.js-app (inte monorepo) och fil-lagring istället för Postgres. Båda byts ut före publicering.

---

## Innehåll
0. [Beslut och aktuell prioritering](#0-beslut-och-aktuell-prioritering-gäller-före-14-och-16)
1. [Produktöversikt och kärnkoncept](#1-produktöversikt-och-kärnkoncept)
2. [Sitemap och informationsarkitektur](#2-sitemap-och-informationsarkitektur)
3. [Spel och funktioner](#3-spel-och-funktioner)
4. [User flows](#4-user-flows)
5. [Regler och spellogik per spel](#5-regler-och-spellogik-per-spel)
6. [Datamodell och innehållsbehov](#6-datamodell-och-innehållsbehov)
7. [Svensk lokalisering per spel](#7-svensk-lokalisering-per-spel)
8. [Svenska artister, ord, kategorier och datakällor](#8-svenska-artister-ord-kategorier-och-datakällor)
9. [UI/UX-krav (egen identitet)](#9-uiux-krav-egen-identitet)
10. [Mobil och desktop](#10-mobil-och-desktop)
11. [Backend-, frontend- och datakrav](#11-backend--frontend--och-datakrav)
12. [API:er och externa tjänster](#12-apier-och-externa-tjänster)
13. [Edge cases och felhantering](#13-edge-cases-och-felhantering)
14. [MVP kontra senare](#14-mvp-kontra-senare)
15. [Rekommenderad teknisk arkitektur](#15-rekommenderad-teknisk-arkitektur)
16. [Prioriterad implementationsplan](#16-prioriterad-implementationsplan)

---

## 1. Produktöversikt och kärnkoncept

### 1.1 Vad Lessgames är (sammanfattat)
En samling **dagliga** minispel, samma pussel för alla spelare, nytt varje dygn. Spelen ska kännas bekanta direkt (Wordle, Heardle, Higher/Lower, Semantle/Contexto, stavningstävling, GeoGuessr). En runda tar 1–5 minuter och slutar med en delbar resultatruta och jämförelse mot andra spelare. Man behöver inget konto för att spela. Intäkterna kommer från annonser och en frivillig prenumeration (reklamfritt, arkiv, extra lägen, tidig tillgång till nya spel).

### 1.2 Kärnkoncept som ska behållas (det som gör produkten)
| # | Kärnprincip | Varför den spelar roll |
|---|---|---|
| K1 | **Ett dagligt pussel per spel, samma för alla** | Skapar samtalsämne ("fick du dagens?") och gör delning meningsfull. |
| K2 | **Kort sessionslängd, låg tröskel** | Inget konto krävs, ingen tutorial-vägg, spelet startar direkt. |
| K3 | **Flera spel under ett tak** | Hubben gör att en spelare som kommer för ett spel stannar för fler ("Testa våra andra spel"). |
| K4 | **Delbart resultat utan spoilers** (emoji/text + bild) | Viral tillväxtmotor. |
| K5 | **Jämförelse med andra** (fördelning, "topp X %", genomsnitt) | Social validering utan krav på vänner eller multiplayer. |
| K6 | **Streaks, checklista och nedräkning** | Vanebildning: kom tillbaka imorgon. |
| K7 | **Servern äger svaren** | Svaret ska inte ligga i klienten. Det skyddar mot fusk och gör statistiken meningsfull. |
| K8 | **Progress överlever reload** | Man kan lämna och fortsätta senare samma dag. |
| K9 | **Arkiv och extra lägen som premium** | Enkel och respektfull intäkt. De dagliga spelen är alltid gratis. |
| K10 | **Flera "kategorier" per spel och dag** | Mer innehåll per besök: flera ordlängder, flera musikgenrer, flera mer/mindre-teman. |

### 1.3 Vad som ska förändras för Sverige
- **Språk och innehåll:** allt på svenska. Svenska ord med å/ä/ö, svenska artister och låtar, svenska personer, filmer, priser i SEK, svensk statistik (SCB) och svenska platser.
- **Dygnsbyte:** 00:00 **Europe/Stockholm** (Lessgames använder New York-tid).
- **Varumärke och UI:** helt egen visuell identitet, egna namn, egna texter och ett eget tonläge (se §9).
- **Juridik:** GDPR/ePrivacy (CMP enligt IAB TCF v2.2 om personaliserade annonser används), licensierad musik (inga egna rip-klipp), bildrättigheter.
- **Betalning:** SEK-priser, Stripe (kort, Apple Pay, Google Pay; kontrollera Swish-stöd i Stripe för prenumerationer innan beslut).
- **Förbättringar mot Lessgames svagheter:** servervaliderade sessioner även för anonyma, fokusbugg i modaler, uppmjukat dygnsbyte (spela klart påbörjat spel), svenskanpassad tangentbordslayout.

### 1.4 Målgrupp och positionering
- Primärt: svensktalande vuxna 18–55 som redan spelar Wordle, frågesporter eller "Melodikrysset" och korsord. De spelar på mobilen i pauser (pendling, lunch, kväll).
- Sekundärt: skolor och språkinlärare (Rättstavat), vänner och kollegor i gruppchattar (delning).
- Positionering: *"Dagens hjärngympa på svenska, på fem minuter."*

### 1.5 Framgångsmått
- D1/D7/D30-retention, andel som spelar ≥ 2 spel per besök, delningsfrekvens (delningar per avslutat spel), genomsnittlig streak-längd, konvertering till Plus, samt CLS/LCP på mobil.

---

## 2. Sitemap och informationsarkitektur

### 2.1 Sitemap (svenska slugs)
```
/                         Startsida (dagens spel, checklista, streak, nedräkning)
├── /ordet                Ordet (Wordle-typ, 3–8 bokstäver)   ?langd=5
│   ├── /ordet/skapa      Skapa egen utmaning (inloggad)
│   └── /ordet/u/{id}     Spela en egen utmaning (delad länk)
├── /oronmask             Öronmask (gissa låten)               ?kategori=pop
├── /mer-eller-mindre     Mer eller mindre (högre/lägre)
├── /aning                Aning (semantisk ordgissning)
├── /rattstavat           Rättstavat (stavningstävling med ljud)
├── /vilse                Vilse (Street View i Sverige) [Plus/senare]
├── /arkiv                Arkiv, kalender per spel             ?spel=ordet&datum=2026-09-01 [Plus]
├── /logga-in             Inloggning
├── /p/{anvandarnamn}     Publik profil
├── /installningar        (modal, men även djuplänkbar via #installningar)
├── /plus                 Prenumeration: pitch + checkout
├── /nyheter              Changelog/nyheter
├── /om                   Om oss
├── /integritet           Integritetspolicy
├── /villkor              Användarvillkor
├── /cookies              Cookieinställningar (öppnar CMP)
└── /underhall            Underhållssida
```
Spelrutter kan ta `?datum=YYYY-MM-DD` för arkivspel. Utan behörighet leder det till arkivgrinden.

### 2.2 Globala ytor (finns på alla sidor)
| Yta | Innehåll |
|---|---|
| **Header** | Meny (hamburgare), logga/spelets namn (länk hem), hjälp (?), arkiv (kalender), inställningar (kugghjul), konto (Logga in / avatar). |
| **Sidomeny (drawer)** | Lista över spel med bock när dagens spel är klart. Expanderbar undermeny per spel: *Hur man spelar*, *Arkiv*, *Egen utmaning* (där det finns). Aktivitetsremsa (senaste 7 dagarna + streak), nedräkning till nästa dag, Feedback, sociala länkar, Om/Nyheter/Villkor/Integritet. |
| **Modaler** | Hur man spelar, Inställningar, Resultat, Plus-checkout, Användarnamn, Bekräftelser (ge upp, ledtråd, lämna sidan). |
| **Toasts** | Ogiltigt ord, kopierat, nätverksfel, dygnsbyte, underhåll. |
| **Nyhetsbanner** | Tidsstyrt meddelande med CTA (från `announcements`). |

### 2.3 Informationshierarki på startsidan (egen design, inte en 3×2-grid-kopia)
1. Hälsning + datum + "Dagens nummer #123" + nedräkning.
2. **Dagens spel** som lista eller kort med status: *Ej påbörjad*, *Pågår (2/6 längder)*, *Klar ✓ + resultat-emoji*.
3. Streak och veckoremsa.
4. "Nytt/kommande spel"-teaser (motsvarar Lessgames "???").
5. Plus-teaser (diskret, visas inte för prenumeranter).

### 2.4 Navigationsprinciper
- Varje spel är en egen URL, går att dela och indexera (SEO: "svenskt wordle", "gissa låten", "ordspel på svenska").
- Byte av kategori inom ett spel (ordlängd, musikgenre) sker med flikar/segmenterad kontroll och uppdaterar query-param utan full navigering.
- Flikarna **låses under pågående runda** (som Lessgames Songless) för att undvika förvirring. Man kan inte byta genre mitt i en låt.
- Efter avslutat spel: tydlig väg vidare, *Nästa kategori* → *Nästa spel* → *Spela tidigare dagar (Plus)*.

---

## 3. Spel och funktioner

### 3.1 Spelen (mappning Lessgames → Klurig)
| Lessgames | Klurig (förslag) | Genre | Delpussel/dag | MVP? |
|---|---|---|---|---|
| Wordless | **Ordet** | Ordgissning med färgfeedback | 6 (3–8 bokstäver) | ✅ |
| Clueless | **Aning** | Semantisk "varmt/kallt"-ordgissning | 1 | ✅ |
| More/less | **Mer eller mindre** | Högre/lägre med kedja | 5 kategorier × 5 jämförelser | ✅ |
| Spelling Bee | **Rättstavat** | Hör ordet och stava det | 5 ord med stigande svårighet | ✅ (fas 1b) |
| Songless | **Öronmask** | Gissa låten från allt längre klipp | 3–4 genrer | **Byggs först** (Deezer-klipp, se §0) |
| Mapless | **Vilse** | Street View i Sverige, placera nål | 5 rundor | Parkerad till senare |
| – | **Skalningsspel** | Idé under utveckling (produktägaren) | – | Notering, ej specificerad |

Alternativa namn: *Ordlös* / *Tonlös* / *Aningslös* / *Kartlös* ("-lös"-serien). Den ligger dock nära Lessgames namnkoncept, så vi rekommenderar egna namn för en självständig identitet.

### 3.2 Plattformsfunktioner
| Funktion | Beskrivning | MVP? |
|---|---|---|
| Daglig schemaläggning | Nytt pussel 00:00 Stockholmstid, numrerat från lanseringsdag | ✅ |
| Anonymt spel | Enhets-ID (cookie) + serversession; lokal cache | ✅ |
| Återuppta | Progress sparas efter varje drag | ✅ |
| Resultatmodal | Utfall, svar, statistik Idag/Totalt, fördelning, placering, dela, nästa | ✅ |
| Delning | Web Share API → urklipp som fallback; text + emoji + kortlänk | ✅ |
| Delningsbild | Server-renderad OG-bild (PNG) per resultat | Fas 2 |
| Checklista | Vilka delpussel som är klara idag (meny + startsida) | ✅ |
| Streak/aktivitet | Senaste 7 dagarna + aktuell/bästa streak | ✅ (lokalt), serverbaserat i fas 2 |
| Nedräkning | Tid kvar till nästa dygn (serverstyrd) | ✅ |
| Hur man spelar | Visas första gången + var 15:e dag + manuellt via ? | ✅ |
| Inställningar | Mörkt/ljust tema (följ system), ljud av/på + volym, musik, färgblindläge, reducerad rörelse, svårt läge (Ordet), avståndsenhet (Vilse) | ✅ (utom musik) |
| Konto | Google, Apple, e-post (magisk länk), användarnamn | Fas 2 |
| Synk mellan enheter | Sessioner kopplas till konto; lokala anonyma sessioner migreras vid inloggning | Fas 2 |
| Egen Ordet-utmaning | Skapa, dela länk, spela, rapportera | Fas 2 |
| Profil | /p/namn, gått med, publik statistik (opt-in) | Fas 3 |
| Plus | Reklamfritt, arkiv, utökade egna utmaningar, tidig tillgång, exklusiva lägen | Fas 3 |
| Arkiv | Kalender per spel, status spelad/påbörjad, "X/Y klara denna månad" | Fas 3 |
| Nyheter/announcements | Tidsstyrd banner + /nyheter | Fas 2 |
| Feedback | Dialog (Bugg/Förslag), rate-limitad | ✅ (enkel) |
| Omröstningar | Community-röstning om regler/nya spel | Senare |
| Underhållsläge | Flagga + nedräkningsvarning + /underhall | Fas 2 |
| Säsongsteman | T.ex. jul, midsommar, Melodifestivalen-vecka | Senare |
| Annonser | Diskret bottenlist + mellanliggande banner på resultatsida | Fas 3 (om alls) |

---

## 4. User flows

### 4.1 Förstagångsbesökare (anonym) → spelar Ordet
```
Landar på / (eller /ordet via delad länk)
 → Cookie-/samtyckesbanner (bara om spårning/annonser är aktiva; annars ingen banner)
 → Klickar "Ordet"
 → "Hur man spelar"-modal öppnas automatiskt (första besöket)
     → Stäng (X / Esc / klick utanför) → FOKUS FLYTTAS TILL SPELYTAN (inte till ?-knappen)
 → Standardlängd 5 visas (Lessgames startar på 3 – vi väljer 5 som mest bekant)
 → Skriver bokstäver (fysiskt tangentbord eller skärmtangentbord med Å Ä Ö)
 → Enter → [klient: rätt längd? bara tillåtna tecken? svårt läge-regler?]
       → fel: skaka raden + toast ("Ordet finns inte i ordlistan", "För kort")
       → ok: POST /api/ordet/guess → rutor vänds en i taget (300 ms) med ljud
 → Vinst/förlust → kort paus (~1 s) → Resultatmodal
     → Dela (Web Share / kopiera) · Nästa längd · Statistik Idag/Totalt
 → Stänger modal → under spelet: "Spela tidigare dagar / eller kom tillbaka om 07:12:44"
                     + "Testa våra andra spel"
```

### 4.2 Återkommande spelare – hubbflödet
```
/ → ser checklista: Ordet 2/6 ✓, Aning ○, Mer eller mindre ○ …
 → klickar Aning → spelar → resultat → "Nästa spel: Mer eller mindre →"
 → alla dagens spel klara → firande (konfetti, reducerad rörelse respekteras)
   + "Du har klarat allt idag! Streak: 12 dagar 🔥"
```

### 4.3 Kategori- och längdbyte (Ordet)
```
Längdväljare [−] 5 [+]  (eller flikar 3 4 5 6 7 8)
 → pågående runda i nuvarande längd? → byte tillåtet (progress sparas per längd)
 → varje längd har egen status i checklistan
```
*Notera:* Lessgames låser genreflikar under pågående låt i Songless men tillåter längdbyte i Wordless. Vi gör likadant: byte är tillåtet i Ordet eftersom det inte finns något tidsmoment, och låst i Öronmask under uppspelning och pågående försök.

### 4.4 Inloggning och synk
```
Klick "Logga in" → /logga-in (eller modal)
 → Google / Apple / e-postlänk
 → Första gången: "Välj användarnamn" (3–16, a–z 0–9 _ -, live-kontroll av tillgänglighet)
 → Server: slå ihop enhetens anonyma sessioner med kontot
     konflikt (samma spel+datum+kategori finns på båda) → behåll den som är avslutad,
     annars den med flest drag; logga konflikten
 → Tillbaka till ursprunglig sida (returnTo)
```

### 4.5 Plus-köp
```
Klick "Plus" (meny, arkivgrind, uppsäljning på resultatsidan)
 → /plus: värdeerbjudande + planval (Månad 39 kr / År 349 kr "Spara 25 %")
 → Ej inloggad? → logga in först (returnTo=/plus)
 → Stripe Checkout (hostad) eller Payment Element i modal
 → Webhook: subscription.active → users.plan = 'plus'
 → Tack-skärm → annonser försvinner direkt, arkivet låses upp
 → Hantera/avsluta: Stripe Customer Portal-länk i Inställningar → Konto
```

### 4.6 Arkiv
```
/arkiv?spel=ordet → välj spel (dropdown) → månadskalender
 → dag-status: spelad ✓ / påbörjad ◐ / ej spelad ○ / låst 🔒 (före start eller framtid)
 → klick på dag → /ordet?datum=2026-08-14 → spelet i arkivläge (rubrik "Från arkivet · 14 aug")
 → Ej Plus → grind: "Lås upp hela arkivet"
```
Förslag: gratisanvändare får spela **de senaste 7 dagarna** gratis. Det är generösare än Lessgames och bra för retention. Plus låser upp resten.

### 4.7 Egen Ordet-utmaning
```
/ordet/skapa (inloggad) → lägg till 1–8 ord (≤ 9 bokstäver; Plus: fler/längre)
 → inställningar: max gissningar (1–8; Plus 20), tidsgräns (ingen/10/30/60/120/300 s),
   ordlistekontroll på/av, läge normal/svårt/blind
 → "Skapa" → rate-limit (3/min) + moderering (svordoms-/slurfilter)
 → Delningslänk /ordet/u/Ab3xK9 + "Dela med vänner"
Mottagare → disclaimer ("Orden är valda av en annan spelare …", regler, antal ord)
 → spelar → resultat (utan global statistik) → "Skapa din egen"
```

### 4.8 Dygnsbyte mitt i spel
```
Klocka når 00:00 Stockholmstid medan spelare är i ett pågående spel
 → Toast: "Nytt dygn! Dagens nya spel är här."
 → Påbörjat spel: får spelas klart i upp till 30 min (servern tillåter gårdagens datum
   för sessioner som startades före midnatt). Lessgames avvisar istället med DATE_NOT_ALLOWED.
 → Ej påbörjat: "Ladda om för att spela dagens"
```

---

## 5. Regler och spellogik per spel

Gemensam modell för alla spel:
- **Utmaning** = (spel, datum, kategori). **Session** = en spelares försök på en utmaning. Session state: `ongoing | won | lost`.
- **Utmaningsnummer** = dagar sedan spelets startdatum + 1.
- **Servern** validerar ordning (`roundIndex` måste vara nästa förväntade), avslutad session går inte att spela igen, och svaret lämnas ut först när sessionen är avslutad.
- **Statistik** aggregeras per utmaning och lämnas ut efter avslut.

### 5.1 Ordet (Wordle-typ)
| Parameter | Värde |
|---|---|
| Kategorier | Ordlängd 3, 4, 5, 6, 7, 8 (6 pussel/dag) |
| Gissningar | 6 |
| Alfabet | a–z + å ä ö (29 bokstäver). Ord med é, ü, à etc. utesluts ur svarslistan. `é` får skrivas som `e` i gissningar för ord som "ide" |
| Giltig gissning | Finns i gissningsordlistan för aktuell längd (böjningsformer tillåtna) |
| Svar | Vanligt grundord eller vanlig böjningsform (se §8.1). Aldrig egennamn, förkortningar eller stötande ord |

**Färglogik (exakt, hanterar dubbletter):**
```ts
function score(guess: string, answer: string): ('correct'|'present'|'absent')[] {
  const res = Array(guess.length).fill('absent');
  const remaining: Record<string, number> = {};
  for (let i = 0; i < answer.length; i++) {
    if (guess[i] === answer[i]) res[i] = 'correct';
    else remaining[answer[i]] = (remaining[answer[i]] ?? 0) + 1;
  }
  for (let i = 0; i < guess.length; i++) {
    if (res[i] === 'correct') continue;
    if (remaining[guess[i]] > 0) { res[i] = 'present'; remaining[guess[i]]--; }
  }
  return res;
}
```
- **Tangentbordsfärg:** per bokstav visas bästa kända status (correct > present > absent).
- **Svårt läge:** gröna bokstäver måste stå kvar på samma plats. Varje bokstav måste finnas minst lika många gånger som det högsta kända antalet (grön+gul) i tidigare rader. Felmeddelanden: "Bokstav 2 måste vara A", "Ordet måste innehålla R".
- **Blint läge** (bara egna utmaningar): inga färger per ruta, bara en radsummering "2 rätt plats · 1 fel plats", ingen tangentbordsfärgning.
- **Tidsgräns** (bara egna utmaningar): nedräkning per ord. När tiden är slut blir det förlust.
- **Poäng/statistik:** antal gissningar 1–6, eller X vid förlust. Fördelning per dag och längd, "Du löste den snabbare än 78 % av spelarna idag" (percentil beräknas från kumulativ fördelning; visa inte percentil om n < 30).
- **Delningstext:**
  ```
  Ordet #123 · 5 bokstäver · 4/6
  ⬜🟨⬜⬜⬜
  ⬜⬜🟩🟨⬜
  🟩⬜🟩⬜🟩
  🟩🟩🟩🟩🟩
  klurig.se/ordet
  ```
  Emojierna ska matcha vårt färgschema (t.ex. 🟦/🟧 i färgblindläge).

### 5.2 Aning (semantisk ordgissning)
| Parameter | Värde |
|---|---|
| Kategorier | 1 per dag |
| Gissningar | Obegränsat (tak 500 för bräde/prestanda) |
| Poäng | Antal gissningar + ledtrådskostnader (lägre = bättre). Gav upp = förlust |
| Feedback | Rang 1..N där 1 = hemliga ordet, beräknad som närhet i ordvektorrum |

**Logik:**
1. Klientvalidering: trim + gemener; 2–40 tecken; bara `[a-zåäö]`; inte dubblett; inte stoppord ("det här ordet är för vanligt"); inte på blocklista.
2. Server: lemmatisera (hus/huset/husen/husets → *hus*; springer/sprang → *springa*). Okänt lemma → `ORDET_FINNS_INTE` ("Det ordet känner vi inte till").
3. Slå upp rangen i den förberäknade rangtabellen för dagens ord. Ord utanför topp-N får rang via on-the-fly-cosinus mot hela vokabulären, eller "> 5000" som en rödfärgad stapel.
4. Svar: `{ lemma, rang, rätt: rang === 1 }`. Visa lemmat (inte exakt inmatning), så att spelaren förstår varför "husen" blev "hus".
5. **Visning:** senaste gissningen överst (markerad), sedan alla sorterade efter rang. Stapelbredd `max(1 %, 100 % · ((R_max − rang)/R_max)^3,5)` med R_max = 3000. Färg: nära (≤ 300), mitt (≤ 1500), långt (> 1500). Färgerna är våra egna.
6. **Ledtråd** (bekräftelsedialog visar kostnaden):
   - Ingen gissning än → ledtråd på rang 1000.
   - Bästa rang ≤ 20 → närmaste lediga rang under bästa (ned till 2).
   - Annars rang ≈ `ceil(0,8 · bästa)`, justera till närmaste lediga.
   - Kostnad: ledtrådens rang ≥ 1000 → +7, ≥ 160 → +5, ≥ 2 → +3.
7. **Ge upp** → bekräftelse → visa ordet + de 10 närmaste orden (lärande moment, bra UX som Lessgames saknar).
8. Delning: `Aning #45 · löst på 23 gissningar med 1 ledtråd 💡` + kort stapel-emoji av de 5 bästa gissningarna (🟩🟨🟥, utan ord).

### 5.3 Mer eller mindre (högre/lägre)
| Parameter | Värde |
|---|---|
| Kategorier | 5 per dag, spelas i fast ordning |
| Objekt per kategori | 6 (kedja) → 5 jämförelser |
| Poäng | 1 per rätt, max 25. Fel avslutar **inte** kategorin |
| Fråga | "Vilken har **flest/mest/högst** …?" (formuleras per kategori) |

**Logik:**
- Runda *i* (0–4): vänster kort = objekt *i*, höger = objekt *i+1*. Spelaren klickar/trycker på ett kort (eller ← →, eller W/S på mobil med vertikal layout).
- Servern returnerar båda värdena + `rätt`. **Lika värden = rätt oavsett val** (bör undvikas vid kurering men måste hanteras).
- Animation: båda värdena räknas upp (~1,5 s, easing ut), rätt/fel-markering, sedan glider vänster kort ut och höger kort blir vänster, nytt kort in (~0,8 s). Vid reducerad rörelse: tona in siffrorna direkt.
- Mellan kategorier: övergångsskärm "Kategori 2 av 5 · Näst på tur: Filmbetyg · Gör dig redo…" (1,5 s, kan hoppas över).
- Sammanfattning: poäng per kategori, total X/25, jämförelse med dagens snitt per kategori, percentil.
- Formatering: heltal med tunt mellanslag som tusentalsavgränsare ("2 740 000"), decimaler med komma ("7,2"), valuta "249 000 kr", enheter från kategorin.
- Delning:
  ```
  Mer eller mindre #88 · 19/25
  🔎 🟩🟩🟥🟩🟩
  🎵 🟩🟥🟥🟩🟩
  🎬 🟩🟩🟩🟩🟥
  💰 🟥🟩🟩🟥🟩
  🇸🇪 🟩🟩🟥🟥🟩
  ```

### 5.4 Rättstavat (stavningstävling)
| Parameter | Värde |
|---|---|
| Rundor | 5 ord, svårighet 1→5 |
| Försök som räknas | 1 per ord |
| Poäng | Antal rätt (0–5) |
| Ljud | Ordet uppläst + definition + exempelmening (TTS eller inspelat) |

**Logik:**
- Rundstart: stor uppspelningsknapp (första uppspelningen kräver användargest). Knappar: **Hör igen**, **Definition**, **Mening** (text med ordet maskerat som "____", och ljud), **Ursprung** (t.ex. "franska") när det finns, samt **Långsamt** (0,75× uppspelning, en egen förbättring).
- Inmatning: fält + skärmtangentbord med Å Ä Ö. Enter skickar.
- Jämförelse: exakt match efter trim + gemener (bindestreck/mellanslag i sammansättningar ska inte förekomma i svarslistan).
- Svar: `{ rätt, korrektStavning, andelSomKlaradeDet }`.
- Visning: bokstav-för-bokstav-avslöjande (~350 ms/bokstav). Grönt tills första avvikelsen, där det stannar och markeras rött. Därefter visas korrekt stavning med skillnaden markerad (diff-highlight, en förbättring).
- Efter fel: **"Öva igen"** (utan poäng) eller **"Nästa ord"**.
- Rundindikator 1–5 med status. Går att bläddra tillbaka och se avklarade ord.
- Sammanfattning: X/5, "andel som klarade varje ord idag" per runda, all-time lösningsgrad.
- Delning: `Rättstavat #30 · 4/5 🐝 ✅✅✅✅❌`.

### 5.5 Öronmask (gissa låten) – fas 2
| Parameter | Värde |
|---|---|
| Kategorier | Förslag: **Alla**, **Svensk pop**, **Svensk hiphop**, **Schlager & Mello** (+ senare: Rock, 80-tal, Dansband) |
| Försök | 6 |
| Klipplängd per försök | 0,5 s → 1 s → 2 s → 4 s → 8 s → 15 s (konfigurerbart; Lessgames: 0,13/0,53/2/8/15) |
| Feedback | fel (röd), **rätt artist fel låt** (gul), rätt (grön), överhoppad (grå) |

**Logik:**
- Klippet startar vid en kurerad `startOffset` (ofta refrängen eller ett igenkännbart intro). Uppspelning stoppas exakt vid tidssteget; tidslinjen visar segment och en markör.
- Sök: autocomplete (debounce 150 ms, min 1 tecken, max 10 träffar, "Artist – Låt"), diakritik-okänslig (`bjorn` matchar Björn), prioritera populära låtar.
- Välj träff → knappen "Hoppa över (+x s)" byter till "Gissa". Sista försöket: "Ge upp".
- Efter avslut: visa låt + artist + år + omslag, spela hela förhandslyssningen, länkar "Lyssna på Spotify / Apple Music / YouTube".
- Delning: `Öronmask #12 · Svensk pop · 🟥🟨🟩⬜⬜⬜ (2 s)`.

### 5.6 Vilse (Street View i Sverige) – fas 3, Plus
| Parameter | Värde |
|---|---|
| Rundor | 5 platser i Sverige |
| Tidsgräns | 2 min per runda (Lessgames 3 min) |
| Poäng | `100 · e^(−km / S)`, S = 200 km för Sverige-läget (justerbart; Lessgames använder 1491,7 km för världen). Max 500 |
| Dölj ledtrådar | Beskär/dölj adressfält (som Lessgames gör med iframe-förskjutning) eller använd Maps JavaScript API med `addressControl:false` |

- Flöde: Street View (panorera/zooma; "återställ vy"-knapp) → öppna minikarta → placera nål → "Gissa" → avstånd + poäng + linje på karta + platsnamn ("Ystad, Skåne") → nästa runda.
- Timeout utan nål: 0 poäng. Timeout med nål: nålen skickas.
- Sammanfattning: karta med alla 5, total poäng, percentil, "överlevnadskurva".
- Poängtabell med S = 200: 10 km → 95, 50 km → 78, 100 km → 61, 250 km → 29, 500 km → 8.

---

## 6. Datamodell och innehållsbehov

### 6.1 Databas (PostgreSQL) – kärntabeller
```sql
-- Identitet
users            (id uuid pk, email, created_at, plan text default 'free', role text default 'user')
profiles         (user_id pk fk, username citext unique, avatar_url, public_stats bool default false)
devices          (id uuid pk, created_at, last_seen_at, user_id fk null)      -- anonym identitet via httpOnly-cookie
subscriptions    (id, user_id fk, stripe_customer_id, stripe_subscription_id, status, plan, interval, current_period_end)

-- Spel och schema
games            (slug pk, name, enabled bool, start_date date, requires_plus bool, sort int)
categories       (game fk, category_id int, slug, name, config jsonb, pk(game, category_id))
challenges       (id bigserial pk, game fk, category_id int, date date, number int,
                  public_payload jsonb,      -- skickas till klient (bild-URL:er, ljud, masker)
                  secret_payload jsonb,      -- ALDRIG till klient (svar, värden)
                  status text check (status in ('draft','scheduled','published')),
                  unique(game, category_id, date))

-- Spelande
sessions         (id uuid pk, device_id fk, user_id fk null, game, category_id, challenge_id fk null,
                  custom_game_id fk null, state text, game_data jsonb, moves int,
                  score numeric null, started_at, finished_at null, updated_at,
                  unique(coalesce(user_id, device_id), challenge_id))
moves            (session_id fk, idx int, input jsonb, result jsonb, created_at, pk(session_id, idx))  -- revision/anti-fusk
daily_stats      (challenge_id pk, players int, finished int, histogram jsonb, avg numeric, updated_at)  -- aggregat
user_game_stats  (user_id, game, played, won, current_streak, best_streak, histogram jsonb, last_played date)

-- Egna utmaningar
custom_games     (id text pk /* kort base62 */, creator_id fk, game text, words text[], max_guesses int,
                  time_limit_s int null, dictionary_check bool, mode text, created_at, reports int default 0, hidden bool)

-- Plattform
announcements    (id, version, title, body_md, starts_at, ends_at, cta_label, cta_href)
feedback         (id, user_id null, device_id, category, message, created_at, user_agent)
polls / poll_votes
maintenance      (singleton: enabled, starts_at, message, games text[])
```

### 6.2 Innehållstabeller per spel
```sql
-- Ordet
words            (id, word text, length int, lemma text, pos text, freq_rank int,
                  is_answer_candidate bool, is_guess_allowed bool, difficulty int,
                  flags text[] /* offensive, proper, abbreviation, foreign */, source text)
-- svarsschema: challenges(game='ordet', category_id=length-3).secret_payload = {"answer":"kaffe"}

-- Aning
semantic_vocab   (lemma pk, freq_rank, pos)                       -- 20–40 k lemman
semantic_forms   (form pk, lemma fk)                              -- böjningsformer → lemma
semantic_ranks   (challenge_id, lemma, rank int, pk(challenge_id, lemma))  -- förberäknat topp 10 000
-- secret_payload = {"answer":"trädgård","neighbors_top10":[...]}

-- Mer eller mindre
ml_items         (id, category_slug, title, subtitle, image_url, image_credit, image_license,
                  value numeric, unit text, value_display_hint text, source_url, source_date,
                  last_used date null, active bool, tags text[])
-- public_payload = [{title, subtitle, image_url}] × 6 ; secret_payload = [value] × 6

-- Rättstavat
spelling_words   (id, word, difficulty 1..5, definition_text /* med ___ */, sentence_text,
                  origin text null, audio_word_url, audio_definition_url, audio_sentence_url,
                  tts_voice, reviewed_by, reviewed_at)

-- Öronmask
songs            (id, title, artist, artist_id, year, genres text[], popularity int,
                  preview_provider text /* deezer|itunes|licensed */, preview_ref text,
                  start_offset_s numeric, isrc, spotify_url, apple_url, youtube_url,
                  cover_url, active bool)
song_aliases     (song_id, alias)  -- alternativa titlar, "feat."
artists          (id, name, aliases text[])

-- Vilse
map_locations    (id, lat, lng, provider text /* google|mapillary */, pano_id, heading, pitch,
                  place_name, municipality, county, difficulty, verified_at)
```

### 6.3 Innehållsvolymer (för 1 år drift)
| Spel | Behov per dag | Per år | Kommentar |
|---|---|---|---|
| Ordet | 6 ord | ~2 200 svar (+ gissningslistor ~150 k former) | Svar ska inte upprepas (Lessgames: reuse = ∞) |
| Aning | 1 ord + rangtabell | 365 ord + 365 × 10 k rader | Förberäkna batchvis |
| Mer eller mindre | 30 objekt | ~11 000 objektvisningar, med 90 dagars återanvändning räcker ~3 000 unika objekt | Automatisera 3 av 5 kategorier |
| Rättstavat | 5 ord + 15 ljudfiler | 1 825 ord, ~5 500 ljudfiler | TTS-batch + mänsklig granskning |
| Öronmask | 3–4 låtar | ~1 400 låtar (återanvändning efter ~2 år OK) | Kurerad katalog ~3 000 sökbara låtar |
| Vilse | 5 platser | 1 825 platser | Verifiera panorama-ID regelbundet |

### 6.4 Innehållspipeline (gemensam)
1. **Import** (skript) → råtabeller med källa och licens.
2. **Kurering** i adminpanel: godkänn/avvisa, sätt svårighet, beskär bild, sätt startOffset.
3. **Schemaläggare** skapar `challenges` 60 dagar framåt med regler (ingen upprepning inom X dagar, balanserad svårighet, blanda kategorier, undvik tema-krockar som två fotbollsspelare i rad).
4. **Förhandsgranskning**: admin kan spela valfritt framtida datum.
5. **Publicering**: `status='published'` automatiskt vid midnatt. Varningslarm om morgondagen saknar innehåll.

---

## 7. Svensk lokalisering per spel

| Spel | Vad som behålls | Vad som ändras för Sverige |
|---|---|---|
| **Ordet** | 6 gissningar, flera längder, svårt/blint läge, egna utmaningar | Svenskt alfabet (29 tecken) och svensk tangentbordslayout `Q W E R T Y U I O P Å / A S D F G H J K L Ö Ä / ⏎ Z X C V B N M ⌫`. Svarsord från svenska frekvenslistor. Böjningsformer accepteras som gissningar. Standardlängd 5. Sammansatta ord bara om de är vanliga (t.ex. "solsken"). |
| **Aning** | Rangsystem, ledtrådar med kostnad, ge upp | Svensk vektormodell + svensk lemmatisering (viktigt: svenskan har mycket böjning och sammansättningar). Svenska stoppord. Visa lemmat. Sammansättningar som saknas i vokabulären får ett vänligt fel. |
| **Mer eller mindre** | 5×5-kedjan, fortsätt vid fel | Svenska kategorier: sv.wikipedia-visningar istället för Google-sökningar, svenska artisters lyssnare, svenska filmer/serier, priser i SEK, "Sverige i siffror" (SCB). Svenska personer, varumärken, platser. |
| **Rättstavat** | 5 ord, stigande svårighet, ljud/definition/mening/ursprung | Svenska stavningsfällor: sje-/tje-ljud, j-ljud (dj, gj, hj, lj), dubbelteckning, ng/gn, lånord från franska och engelska. Svensk TTS-röst. Definitioner skrivna för klurig.se. |
| **Öronmask** | Klipp som växer, gul = rätt artist | Svenska genrekategorier och svensk katalog (plus internationella hits som är stora i Sverige). Melodifestivalen-kategori under Mello-säsongen (jan–mars). |
| **Vilse** | Street View + nål + exponentiell poäng | Bara Sverige (och ev. Norden-läge). Skala 200 km. Platsnamn med kommun och landskap. |

**Ton och texter** (exempel, vi använder egna texter och översätter inte Lessgames):
- Vinst: "Snyggt!", "Klockrent!", "Där satt den!". Förlust: "Nära skjuter ingen hare – ordet var **KAFFE**".
- Ogiltigt ord: "Det ordet finns inte i vår ordlista".
- Ge upp-dialog: "Vill du verkligen ge upp? Ordet avslöjas och rundan avslutas."
- Dygnsbyte: "Klockan slog tolv! Dagens nya spel väntar."
- Datumformat: "tis 23 sep 2026", tid "07:12:44", tal "2 740 000", decimal "7,2".

---

## 8. Svenska artister, ord, kategorier och datakällor

### 8.1 Ordet – ordkällor
| Källa | Användning | Licens (verifiera före användning) |
|---|---|---|
| **SALDO** (Språkbanken Text, Göteborgs universitet) | Morfologi: lemman + alla böjningsformer → gissningslista och lemmatisering | CC BY 4.0 |
| **Kelly-listan, svenska** (Språkbanken) | ~8 400 vanliga ord graderade efter CEFR-nivå → svarskandidater och svårighet | CC BY-SA |
| **Språkbankens korpusfrekvenser** (t.ex. från Korp) | Frekvensrang → svårighet och filtrering av obskyra ord | Varierar per korpus (CC BY) |
| **Den stora svenska ordlistan** (DSSO, stavningsordlista för sv_SE) | Kompletterande gissningslista | LGPL/CC BY-SA |
| **Wiktionary (sv)** | Ordklass, stötande-flaggor, definitioner till Rättstavat | CC BY-SA |

*SAOL/SO/Svensk ordbok (Svenska Akademien) är inte fritt licensierade. Använd dem bara som manuell referens, inte som importerad data.*

**Urval av svarsord:** substantiv/adjektiv/verb i grundform eller vanlig form, Kelly-nivå A1–B2, frekvensrang < 15 000. Uteslut egennamn, förkortningar, svordomar, känsliga ord, ord med é/ü samt ord där bokstavsmönstret har alltför många varianter (t.ex. `_ALLA`). Dessa kan i stället ligga i svårt läge.

Exempel på bra svarsord: *3:* båt, öga, sol, älg · *4:* fika, hund, lönn, kaka · *5:* kaffe, björk, stuga, glass, fjäll · *6:* skratt, lördag, lingon · *7:* fönster, smörgås, cyklist · *8:* trädgård, kastrull, semester.

### 8.2 Aning – semantisk modell
| Alternativ | För- och nackdelar |
|---|---|
| **fastText sv (Common Crawl + Wikipedia, 300 dim)** | Gratis (CC BY-SA 3.0), hanterar ord utanför vokabulären via subord (bra för sammansättningar). Kvaliteten är ok. |
| **Word2vec/GloVe från Språkbanken eller KBLab** | Tränad på svensk text och bättre semantik. Kontrollera licensen. |
| **Embeddings från flerspråkig modell** (t.ex. OpenAI text-embedding-3, Cohere multilingual, KB-BERT/KB-SBERT) | Bäst semantisk kvalitet. Kostnaden är engångs vid förberäkning (~40 k ord × 1 = billigt). Mindre bra på enstaka ord utan kontext, så testa. |

**Rekommendation:** börja med fastText sv + SALDO-lemmatisering. Utvärdera mot ett testset (se §16) med ca 50 ordpar som svenskar bedömt som "nära/långt", och byt modell om kvaliteten inte räcker. Vokabulär: ~25 000 vanliga lemman (substantiv, verb, adjektiv), filtrerad mot SALDO och frekvens. Hemliga ord: konkreta och vardagliga substantiv/verb på Kelly-nivå A1–B1 (*trädgård, semester, cykla, kyla, fotboll, lärare, gräsmatta*).

**Svenska stoppord (utdrag):** och, att, det, som, en, ett, är, på, i, av, för, med, till, den, de, har, inte, om, var, jag, du, han, hon, vi, ni, men, så, kan, ska, skulle, vara, blir, man, sig, där, här, nu, då.

### 8.3 Mer eller mindre – kategorier och källor
| # | Kategori (förslag) | Värde | Källa / API | Automatisering |
|---|---|---|---|---|
| 1 | 🔎 **Mest lästa på Wikipedia** ("Vem/vad lästes mest om förra månaden?") | Sidvisningar sv.wikipedia senaste 30 dagarna | Wikimedia REST Pageviews API (öppet) + Wikidata för bild (Wikimedia Commons) | Helt automatisk |
| 2 | 🎵 **Mest lyssnade artister** | Följare eller popularitet | Spotify Web API (artist `followers`, `popularity`). Alternativ: Last.fm `listeners`. **Kontrollera Spotify Developer Policy om användning i spel/quiz innan lansering** | Automatisk |
| 3 | 🎬 **Högst betyg** (svenska filmer och serier) | Betyg 1–10 | TMDB API (`vote_average`; kräver attribution; kommersiell licens kan krävas). IMDb-dataset är bara för icke-kommersiellt bruk | Automatisk |
| 4 | 💰 **Vad kostade det?** | SEK | Kurering: kända auktioner (Bukowskis, Stockholms Auktionsverk), rekordbostäder, fotbollsövergångar, historiska priser (SCB:s KPI-omräkning), Systembolaget-sortiment | Manuell + halvautomatisk |
| 5 | 🇸🇪 **Sverige i siffror** | Blandat | SCB PxWebApi (befolkning per kommun, namnstatistik "hur många heter Lars"), Naturvårdsverket, Trafikverket, Wikidata SPARQL (höjder, längder, areor) | Halvautomatisk |
| Reserv | 🍎 Kalorier per 100 g | kcal | Livsmedelsverkets livsmedelsdatabas (öppet API) | Automatisk |
| Reserv | 🏙️ Invånare per kommun | antal | SCB | Automatisk |
| Reserv | ⚽ Allsvenska publiksiffror / mål | antal | Manuellt/öppna källor | Manuell |
| Reserv | 🏔️ Höjd över havet | m | Wikidata / Lantmäteriet | Automatisk |

**Exempel på objekt:** Zlatan Ibrahimović, Greta Thunberg, IKEA, Volvo, Melodifestivalen, Skansen, Kebnekaise, "Antal öar i Sverige", "Invånare i Kiruna", "Sverige-rekord i höjdhopp (cm)", "Pris för en Semla på Konditori X 2026", "Beck – Lockpojken (betyg)", "Solsidan", "Jönssonligan", "Så som i himmelen", "Avicii", "Veronica Maggio".

**Bilder:** Wikimedia Commons (spara licens och upphovsperson, visa kreditering i "i"-ikon), TMDB-affischer (enligt TMDB:s villkor), egen fotografering/illustration för trivia. Använd inte Google-bildsök eller Spotify-bilder utan att först kontrollera villkoren.

### 8.4 Rättstavat – ordtyper och exempel
| Svårighet | Typ | Exempel |
|---|---|---|
| 1 | Vardagliga ord med en fälla | fönster, hjälm, djur, ljus, gärna |
| 2 | sje-/tje-ljud, dubbelteckning | sjuksköterska, stjärna, kjol, tjugo, kommun, tillsammans |
| 3 | Lånord, vanliga felstavningar | restaurang, definitivt, rekommendera, intressant, parallell |
| 4 | Franska/grekiska lånord | chaufför, portfölj, ingenjör, entreprenör, psykologi, rytm |
| 5 | Svåra/ovanliga | reservoar, pittoresk, schizofreni, konnässör, byråkrati, hypotenusa |

Fält per ord: *definition* ("En ___ är en person som kör bil yrkesmässigt."), *mening* ("Vår ___ väntade utanför hotellet."), *ursprung* ("franska: chauffeur"). Texterna skrivs med AI-stöd och **granskas av människa**. Ljud: Azure Neural TTS sv-SE (t.ex. rösterna *Sofie*, *Mattias*, *Hillevi*) eller Google Cloud TTS sv-SE. Generera ljudfilerna en gång och lagra dem som AAC/MP3/Opus på CDN. Kontrollera uttal manuellt (TTS säger ibland fel på lånord). Använd SSML-fonem vid behov.

### 8.5 Öronmask – artister per kategori
- **Alla / Klassiker:** ABBA, Roxette, Europe, Ace of Base, The Cardigans, Robyn, Kent, Lars Winnerbäck, Håkan Hellström, Ted Gärdestad, Gyllene Tider, Per Gessle, Lisa Nilsson, Eva Dahlgren, Ulf Lundell, Magnus Uggla, Imperiet, Bo Kaspers Orkester, Petter, Timbuktu, Laleh, Veronica Maggio, Avicii, Swedish House Mafia, Zara Larsson, Tove Lo, Molly Sandén, Miriam Bryant, First Aid Kit, Lykke Li, José González, The Hives, Mando Diao, Icona Pop, Axwell, Alesso, Galantis.
- **Svensk pop (2010–idag):** Veronica Maggio, Molly Sandén, Zara Larsson, Miriam Bryant, Tove Lo, Darin, Oscar Zia, Hov1, Thomas Stenström, Einár (hiphop), Benjamin Ingrosso, Victor Leksell, Albin Lee Meldau, Newkid, Estraden, Bolaget, Hjalmar.
- **Svensk hiphop:** Petter, Timbuktu, Ison & Fille, Looptroop Rockers, Adam Tensta, Silvana Imam, Cherrie, Yasin, Einár, Dree Low, Greekazo, Z.E, Ant Wan, Jireel, Aden x Asme, Hov1, 1.Cuz, Victor Leksell (pop-rap), Adel, Ken Ring.
- **Schlager & Mello:** Carola, Charlotte Perrelli, Loreen, Måns Zelmerlöw, Eric Saade, Danny Saucedo, Sanna Nielsen, Linda Bengtzing, Anna Book, Lena Philipsson, Herreys, Sarek, Arvingarna, John Lundvik, Cornelia Jakobs, Marcus & Martinus, Tusse, The Mamas.
- **Senare kategorier:** Dansband (Vikingarna, Lasse Stefanz, Thorleifs, Arvingarna, Streaplers), Visor (Evert Taube, Cornelis Vreeswijk, Lisa Ekdahl), Rock/metal (Kent, Europe, Ghost, Sabaton, In Flames, The Hellacopters), 80/90-tal.

**Källor för ljud (juridiskt kritiskt, se även §0):**
- Lessgames rehostar egna klipp på sitt CDN. **Det gör inte vi**, eftersom det kräver licens från rättighetsinnehavarna (i Sverige STIM/SAMI och skivbolagen).
- **Beslut:** strömma 30 s-förhandslyssningar direkt från **Deezer API** (`preview`-fält). Visa länk till låten på Deezer. Preview-URL:erna är tidsbegränsade (signerade), så de hämtas via API:t vid behov och cachas kort. Ljudet får aldrig kunna laddas ner av användaren.
- **Inte Spotify:** policyn förbjuder spel/quiz och `preview_url` är avstängd för nya appar (verifierat 2026-09-23). Spotify-länkar till låten går bra som "lyssna vidare"-knapp.
- **Inte iTunes/Apple:** previews får inte användas för underhållning.
- Metadata: MusicBrainz (öppet, CC0) för ISRC/år, Deezer/iTunes för omslag.
- Ta beslut med juridisk rådgivning före lansering. Det här är produktens största juridiska risk.

### 8.6 Vilse – platskällor
- **Google Maps Embed API** (Street View-läge). Enligt Googles prislista har Embed API ingen avgift. Verifiera aktuell prissättning och villkor, samt att det är tillåtet att dölja adressfältet.
- **Mapillary** (öppen, CC BY-SA gatubild, API via Meta). Bra gratis alternativ.
- Platsnamn: Lantmäteriets öppna data (ortnamn) eller omvänd geokodning via Nominatim/OSM (respektera användningspolicyn eller kör egen instans).
- Karta för nålen: MapLibre GL + OpenFreeMap/MapTiler/Lantmäteriets öppna topografiska webbkarta.

---

## 9. UI/UX-krav (egen identitet)

### 9.1 Designprinciper
1. **Spelet först:** spelytan syns direkt ovanför vecket på en 375×667-skärm. Inga annonser eller banners får skjuta ned spelytan.
2. **Taktil feedback:** varje tryck ger visuell respons < 100 ms, ljud om det är påslaget och haptik (`navigator.vibrate` på Android) vid vinst/fel.
3. **Lugnt men lekfullt:** mikroanimationer (vändning, uppräkning, glid) med tydlig mening, aldrig dekoration som saktar ned.
4. **Tillgängligt från start:** WCAG 2.2 AA, fokushantering, aria-live för resultat, färgblindläge, reducerad rörelse och skalbar text.

### 9.2 Egen visuell identitet (ska inte likna Lessgames mörkgrå tema med fet grotesk)
Förslag att vidareutveckla med en designer:
- **Ljust standardtema** "papper": varm off-white bakgrund, djupt bläckblå text och ytor. Mörkt tema som alternativ (Lessgames är mörkt som standard).
- **Accentfärger:** saffransgul, lingonröd och tallgrön, hämtade från svensk natur och fika, utan flaggkitsch.
- **Spelstatusfärger** (egna, inte Wordles grön/gul):
  - rätt plats: tallgrön `#2F7D5B` · fel plats: saffran `#E0A526` · finns inte: ljusgrå/skiffer
  - färgblindläge: blå `#2F6FDE` / orange `#F07C2B`
- **Typografi:** en rundad, varm display-font (t.ex. *Bricolage Grotesque* eller *Fraunces* för rubriker) + läsbar UI-font (*Inter*/*Figtree*) + monospace-känsla för siffror (tabular nums).
- **Maskot:** en figur som återkommer i tomlägen, underhåll, 404 och firande, t.ex. en klurig igelkott, "Klurre". Lessgames har "Spot".
- **Startsida:** vertikal lista "Dagens spel" med progressringar och resultatemoji. Inte en ikon-grid.
- **Resultat:** bladvändning/"kvitto"-känsla (ett resultatkort som ser ut som en biljett). Kortet blir också delningsbilden.

### 9.3 Komponentkrav
| Komponent | Krav |
|---|---|
| Skärmtangentbord | 3 rader svensk layout. Knapparna minst 44×44 px (mobil), ⏎ och ⌫ breda. Färgas efter status. Fysiskt tangentbord mappas (inkl. Å Ä Ö och döda tangenter) |
| Bokstavsruta | Tillstånd tom/ifylld/rätt/fel plats/fel/blind. Vändanimation 250–300 ms per ruta, i följd. Skakning vid ogiltigt ord |
| Modal | Fokusfälla. **Vid stängning ska fokus gå till spelytan** (åtgärdar Lessgames-buggen där Enter öppnar hjälpen igen). Esc stänger. Klick utanför stänger (utom bekräftelser) |
| Toast | Överst, max 2 samtidigt, 2–4 s, aria-live="polite" |
| Resultatmodal | Rubrik (Vinst/Slut), svar, flikar Idag/Totalt, nyckeltal, fördelningsdiagram med egen stapel markerad, placeringstext, Dela, Nästa. Blockerar inte spelplanen permanent (kan stängas och öppnas via "Resultat") |
| Nedräkning | Tabulära siffror, uppdateras per sekund. Pausar när fliken är dold |
| Delning | Web Share API med text (+ bild i fas 2). Fallback kopiera → toast "Kopierat!" |
| Tomlägen | "Börja gissa för att se hur nära du är!", med maskot |

### 9.4 Ljud och rörelse
- Ljud av som standard på desktop? **Nej.** Ljudeffekter är på med låg volym (som Lessgames), musik av. Respektera systemets mute: använd `HTMLAudioElement` för musikklipp (spelar även i iOS tyst läge, vilket är ett medvetet val för Öronmask) och Web Audio för korta effekter.
- Ljudeffekter att producera själva: knapptryck, tangent, radera, vänd ruta, vinst, förlust, ogiltigt, allt klart, poänguppräkning, nål placerad.
- `prefers-reduced-motion`: ersätt vändningar/glid med toning. Inställningen har tre lägen: System/På/Av.

### 9.5 Mikrocopy och onboarding
- "Hur man spelar": 1 mening + 1 visuellt exempel + 3 regler. Visas vid första besöket och sedan var 15:e dag. Checkbox "Visa inte igen".
- Inloggningsincitament visas först **efter** första avslutade spelet: "Logga in för att spara din streak på alla enheter".

---

## 10. Mobil och desktop

| Aspekt | Mobil (< 640 px) | Surfplatta (640–1024) | Desktop (> 1024) |
|---|---|---|---|
| Header | Kompakt: meny, spelnamn, ikoner. "Logga in" blir en avatar-ikon | Som desktop | Full |
| Ordet | Rutnät skalar efter `min(vw, vh)`. Tangentbordet förankras i botten (safe-area-inset) | Centrerat | Centrerat, max ~500 px brett |
| Mer eller mindre | Korten **staplas vertikalt** med "ELLER"-bricka i mitten. Tryck på kort. Swipe upp/ned som extra | Sida vid sida | Sida vid sida, hover-effekt (lätt skalning) |
| Aning | Inmatning överst, lista rullar | – | Lista max 640 px |
| Öronmask | Uppspelningsknapp stor och centrerad. Sökresultat öppnas **ovanför** inmatningen (tangentbordet täcker annars) | – | – |
| Vilse | Street View i helskärm, kartan som bottenark som kan dras upp | Delad vy | Karta i hörnet som förstoras vid hover |
| Liggande läge på liten skärm | Visa "Vrid telefonen" bara när höjden < 420 px och spelet inte får plats (som Lessgames orienteringsspärr) | – | – |

Tekniska krav:
- `viewport-fit=cover`, `env(safe-area-inset-*)`, `100dvh` istället för `100vh` (mobilens adressfält).
- Förhindra dubbeltryckszoom på knappar (`touch-action: manipulation`).
- Fysiskt tangentbord ska fungera på desktop även när skärmtangentbordet visas.
- Annonsytor (om de används) får inte orsaka layoutskift. Reservera höjden och flytta upp innehållet (Lessgames mäter bottenlisten med ResizeObserver).
- Lighthouse mobil: LCP < 2,0 s, CLS < 0,05, INP < 150 ms.
- PWA (fas 2): installerbar, ikon, offline-sida, cache av dagens innehåll så att man kan spela vid dålig täckning (gissningar köas).

---

## 11. Backend-, frontend- och datakrav

### 11.1 Frontend
- **Ramverk:** Next.js (App Router) + TypeScript + React Server Components för initial payload (dagens publika utmaningsdata server-renderas, som Lessgames gör).
- **Styling:** Tailwind CSS + egen design-token-fil (CSS-variabler för färgscheman/teman), Radix UI eller Ark UI för tillgängliga primitiver (Dialog, Tabs, Select, Toast).
- **Animation:** Motion (Framer Motion) med global `reducedMotion`-inställning.
- **State:** Zustand (inställningar, ljud) + React Query/TanStack Query eller SWR (serverdata).
- **Lokal cache:** IndexedDB (Dexie) för spelsessioner (offline, snabb återladdning). **Servern är master.**
- **i18n:** next-intl med `sv` som standard och `en` förberett. Använd ICU plural/select för alla räknade texter.
- **Formulär/validering:** Zod-scheman delade mellan klient och server (monorepo-paket `@klurig/shared`).
- **Ljud:** Howler.js eller egen tunn wrapper (förladdning, volym, mute, iOS-upplåsning vid första gest).

### 11.2 Backend
- **API:** Next.js Route Handlers (`/api/*`) räcker för MVP. Separera till egen tjänst (Hono/Fastify) först om lasten kräver det.
- **Databas:** PostgreSQL (Supabase eller Neon). Row Level Security om Supabase-klient används direkt. Rekommendation: all spellogik via servern (service role), klienten pratar bara med vårt API.
- **Cache/rate limit:** Upstash Redis (eller Postgres-tabeller för MVP): rate limit per IP/device för gissningar (t.ex. 30/min), sök (60/min), skapa egen utmaning (3/min), feedback (5/h).
- **Schemalagda jobb:** Vercel Cron / Supabase pg_cron:
  - 00:00: publicera dagens utmaningar och invalidera cache.
  - Var 5:e min: aggregera `daily_stats`.
  - Dagligen: hämta Wikipedia-visningar, Spotify-data, TMDB-betyg; verifiera Street View-panoraman och förhandslyssningar; varna om innehåll saknas 7 dagar framåt.
- **Tidszon:** all datumlogik i `Europe/Stockholm` på servern (`date-fns-tz`/Temporal). Klienten får `today` och `msUntilNext` från servern (klientklockan kan inte litas på).

### 11.3 API-design (vårt, med förbättringar mot Lessgames)
```
GET  /api/today                                   → { date, number: {ordet:123,…}, msUntilNext }
GET  /api/games/:game/challenges?date=&category=  → publik payload (aldrig svar)
POST /api/games/:game/sessions                    → skapa/hämta session { sessionId, state, gameData }
POST /api/games/:game/sessions/:id/moves          → { idx, input } ⇒ { result, state, reveal? }
     - idx måste vara exakt nästa drag (idempotent: samma idx+input ⇒ samma svar)
     - svar/värden (reveal) bara när state ∈ {won, lost}
POST /api/games/aning/sessions/:id/hint           → { hintWord, rank, cost }
POST /api/games/:game/sessions/:id/give-up
GET  /api/games/:game/stats?challengeId=          → { histogram, avg, players, percentileFor(score) }
GET  /api/me/sessions?date=                       → checklista
GET  /api/me/activity                             → streak, senaste 30 dagarna
GET  /api/me/archive?game=                        → datum + status
GET  /api/songs/search?q=                         → [{ id, title, artist, year }] (≤ 10)
POST /api/custom/ordet                            → { id, url }
GET  /api/custom/ordet/:id                        → publik payload (utan ord)
POST /api/custom/ordet/:id/report
POST /api/feedback
GET  /api/announcements/active
GET  /api/maintenance
POST /api/billing/checkout | /api/billing/portal | /api/billing/webhook
/api/auth/*                                        (Better Auth eller Supabase Auth)
```
Felformat: `{ code: "ORD_FINNS_INTE", message?: string, data?: {...} }` med HTTP-status 400/401/403/404/409/429/500. Klienten mappar `code` → svensk text via i18n.

### 11.4 Anti-fusk och integritet
- Svar lagras i `secret_payload` och lämnar aldrig servern förrän sessionen är avslutad.
- Anonyma spelare får en **serversession** kopplad till en signerad httpOnly-cookie (`device_id`). Därmed går det inte att fråga efter svaret genom att skicka `roundIndex=5` direkt, vilket är en svaghet i Lessgames anonyma API.
- Offentliga utmaningspayloads innehåller inte sökbara ledtrådar (t.ex. bildfilnamn som `michael_jordan.jpg` är ok, men bilder på Mer eller mindre-värden eller låtfilnamn som avslöjar titeln är inte ok → använd hash-namn).
- Öronmask: ljudklippets URL ska inte avslöja låten. Proxa via `/api/audio/:token` med kortlivad signerad token, eller använd leverantörens preview-URL, som inte innehåller titeln.
- Statistik räknar bara första avslutade sessionen per enhet/konto och utmaning.

### 11.5 Datakrav och GDPR
- Personuppgifter: e-post, användarnamn, avatar (från OAuth), sessioner, IP (bara för rate limit, raderas efter 24 h).
- Radera konto: självbetjäning i Inställningar (radera profil och sessioner, anonymisera statistik).
- Dataexport (art. 20) på begäran eller via knapp.
- Analys: **Umami eller Plausible utan cookies** (inget samtycke krävs för aggregerad statistik utan spårning). GA4 undviks.
- Annonser med personalisering kräver TCF v2.2-CMP. Alternativt bara kontextuella annonser utan samtycke. Ännu enklare: ingen reklam i MVP.
- Lagring i EU (Supabase/Neon: region eu-north-1/eu-central-1; Vercel funktioner i `arn1` Stockholm).

---

## 12. API:er och externa tjänster

| Behov | Rekommenderat | Alternativ | Kostnad/licens (verifiera) |
|---|---|---|---|
| Hosting frontend/API | **Vercel** (region arn1) | Cloudflare Pages/Workers, Fly.io | Gratis–Pro |
| Databas | **Supabase Postgres** (EU) | Neon, egen Postgres | Gratis–Pro |
| Auth | **Better Auth** (samma som Lessgames, självhostad, flexibel) eller **Supabase Auth** | Auth.js, Clerk | Gratis |
| Inloggningsmetoder | Google, Apple, e-post-magisk länk | BankID (onödigt tungt) | – |
| Betalning | **Stripe Billing** (SEK, Checkout + Customer Portal) | Paddle (hanterar moms som merchant of record) | Avgift per transaktion |
| E-post | Resend / Postmark | SES | Låg |
| Media-CDN | **Cloudflare R2** + CDN | Supabase Storage, Bunny | Låg |
| Analys | **Umami** (självhostad) / Plausible | PostHog (EU) | Låg |
| Felspårning | Sentry | – | Gratis-nivå |
| Rate limit/cache | Upstash Redis | Vercel KV | Låg |
| Ordlistor | Språkbanken (SALDO, Kelly, Korp-frekvenser) | DSSO, Wiktionary | CC BY / CC BY-SA |
| Semantik | fastText sv | OpenAI/Cohere embeddings, KBLab-modeller | Gratis / engångskostnad |
| Lemmatisering | SALDO-morfologi (egen lookup) | Stanza sv, spaCy `sv_core_news_*` | Öppen källkod |
| TTS | **Azure Neural TTS sv-SE** | Google Cloud TTS, ElevenLabs | Per tecken, engångsgenerering |
| Musik-förhandslyssning | **Deezer API** (`/search`, `preview`) | – (Spotify: spel förbjudna. Apple: ej för underhållning) | Gratis, ingen nyckel. Kommersiella villkor granskas före publicering |
| Musikmetadata | MusicBrainz | Deezer, Spotify Web API | CC0 / villkor |
| Wikipedia-visningar | Wikimedia REST API `/metrics/pageviews` | – | Öppet (ange User-Agent) |
| Strukturerad fakta | Wikidata SPARQL | – | CC0 |
| Svensk statistik | SCB PxWebApi 2.0 | Kolada (kommundata) | Öppet (CC0/CC BY) |
| Filmdata | TMDB API | OMDb | Attribution krävs |
| Näringsdata | Livsmedelsverkets livsmedelsdatabas-API | – | Öppet |
| Street View | Google Maps Embed API | Mapillary API | Embed: avgiftsfritt enligt prislista. Mapillary: CC BY-SA |
| Karta | MapLibre GL + OpenFreeMap/MapTiler | Google Maps JS | Gratis–låg |
| Delningsbilder | `@vercel/og` (Satori) | html-to-image i klienten | Gratis |
| Kortlänkar | Egen kort domän (t.ex. `klur.ig` eller `klurig.se/d/…`) | – | Domänkostnad |
| CMP (om annonser) | Google Funding Choices / Cookiebot / Didomi | – | Varierar |
| Annonser (fas 3) | Google AdSense/Ad Manager, eller svenskt nätverk (t.ex. Adnami/Schibsted-marknad) | Playwire (som Lessgames) | Intäktsdelning |

---

## 13. Edge cases och felhantering

### 13.1 Tid och datum
| Fall | Hantering |
|---|---|
| Dygnsbyte mitt i spel | Påbörjad session får avslutas inom 30 min efter midnatt. Toast om nytt dygn. Nya sessioner skapas för det nya datumet |
| Klient med fel klocka/tidszon | All datumlogik på servern. Klienten visar serverns `msUntilNext` |
| Sommartid/vintertid | Dygnet är 23 eller 25 h; nedräkningen baseras på server-ms, inte "24 h" |
| Resenär i annan tidszon | Spelet följer svensk tid. Visa "Nytt spel kl. 00:00 svensk tid" i hjälpen |
| Framtida datum i URL | 404/"Det här spelet är inte släppt än" (Lessgames: `DATE_NOT_ALLOWED`) |
| Datum före spelets start | Arkivkalendern visar låst. API: 404 |
| Arkiv utan behörighet | 403 → arkivgrind med Plus-erbjudande |
| Innehåll saknas för idag | Visa vänligt fel ("Dagens spel är inte klart än") + larm till admin (Lessgames: `ROUND_NOT_FOUND`) |

### 13.2 Session och synk
| Fall | Hantering |
|---|---|
| Samma konto på två enheter | Optimistisk låsning med `moves`-index. Konflikt → 409 `SESSION_OUT_OF_SYNC` → klienten laddar om sessionen från servern och visar den senaste tillståndet (bättre än Lessgames, som bara ber användaren ladda om) |
| Dubbelklick/dubbel Enter | Klienten låser inmatning under pågående anrop. Servern är idempotent per (session, idx) |
| Nätverksfel mitt i drag | Retry med exponentiell backoff (3 försök). Ogiltig state rullas tillbaka. Toast "Ingen anslutning – försöker igen" |
| Offline | Visa offline-banner. Drag köas bara om svaret kan beräknas lokalt (aldrig, eftersom servern äger svaret) → blockera inmatning med tydlig text |
| Anonym → loggar in | Migrera enhetens sessioner. Konflikt: behåll avslutad, annars den med flest drag |
| Privat läge / blockerad IndexedDB | Fallback till minnet. Servern har ändå sessionen via cookie. Om cookies blockeras: spela utan persistens och visa en diskret varning |
| Cookie rensad | Ny anonym identitet, dagens progress förloras (om inte inloggad). Förklara i hjälpen |
| Lämnar sidan mitt i tidsbegränsad egen utmaning | `beforeunload` + in-app-dialog "Vill du lämna? Din pågående runda avbryts" |

### 13.3 Speluppsättning
| Spel | Edge case | Hantering |
|---|---|---|
| Ordet | Å/Ä/Ö från fysiskt tangentbord med annan layout | Lyssna på `event.key` (inte `code`), normalisera NFC, mappa `æ→ä`, `ø→ö` |
| Ordet | Ord med é ("idé") | Uteslut ur svar. Tillåt gissning "ide" om den finns i ordlistan |
| Ordet | Dubbelbokstäver | Scoring enligt §5.1 (testfall krävs) |
| Ordet | Svårt läge slås på mitt i spel | Tillåt bara före första gissningen (samma som Wordle). Visa låst-ikon |
| Ordet | Längdbyte under reveal-animation | Blockera byte tills animationen är klar |
| Aning | Sammansatt ord som saknas i vokabulären | `ORDET_FINNS_INTE` + tips "Prova ett enklare ord". Ev. fastText-subord för rang (fas 2) |
| Aning | Böjd form av hemliga ordet ("husen" när svaret är "hus") | Räknas som rätt (lemma = svar) |
| Aning | Stavfel | Föreslå "Menade du …?" (Levenshtein ≤ 1 mot vokabulär) |
| Aning | Stötande ord | Klientfilter + serverfilter, neutralt meddelande "Det ordet tar vi inte emot" |
| Mer eller mindre | Lika värden | Båda svaren räknas som rätt. Visa "Lika!" |
| Mer eller mindre | Bild laddas inte | Platshållare med titel. Förladda nästa objekts bild |
| Mer eller mindre | Värde ändras över tid (Wikipedia-visningar) | Frys värdet i `secret_payload` vid schemaläggning. Visa "Data från aug 2026" |
| Rättstavat | Autoplay blockeras | Visa en stor uppspelningsknapp. Spela först efter tryck |
| Rättstavat | Webbläsarens autokorrigering/stavningskontroll | `autocomplete=off autocorrect=off autocapitalize=none spellcheck=false`, helst eget skärmtangentbord |
| Rättstavat | Godtagbara stavningsvarianter (t.ex. "mejl/mail", "servett/serviett") | `accepted_variants[]` per ord. Undvik ord med flera vedertagna stavningar |
| Öronmask | Förhandslyssning borttagen hos leverantören | Daglig validering. Reservlåt per kategori. Vid fel: byt tyst och logga |
| Öronmask | Samma låt i flera versioner (live, remix) | Kurerad katalog med en kanonisk version. `song_aliases`. Gul/grön avgörs på artist-ID resp. song-ID |
| Öronmask | Artist "feat." / duetter | Rätt artist om någon av huvudartisterna matchar |
| Öronmask | iOS tyst läge | HTMLAudioElement. Ljudnivåvarning om volymen är 0 |
| Vilse | Panorama borttaget av Google | Daglig verifiering 7 dagar framåt. Byt plats automatiskt |
| Vilse | Ingen nål vid timeout | 0 poäng |

### 13.4 Plattform
| Fall | Hantering |
|---|---|
| Rate limit | 429 + `retryAfter`. Vänlig toast ("Lugn i stormen – försök igen om en stund") |
| Underhåll | `maintenance.enabled` → banner X min före. Under underhåll: pågående gissningar ger 503 → /underhall |
| 5xx | Felgräns per spel med "Försök igen" och "Till startsidan". Sentry-rapport |
| Egen utmaning med stötande ord | Filter vid skapande (`"nej."`). Rapportknapp. Dölj automatiskt vid ≥ 3 rapporter |
| Användarnamn upptaget/ogiltigt | Live-validering (debounce 300 ms), regler visas inline |
| Betalning misslyckas | Stripe-felmeddelande på svenska. Prenumeration aktiveras bara via webhook (aldrig via klientens redirect) |
| Prenumeration går ut | Webhook `customer.subscription.deleted` → plan free. Arkivspel som påbörjats får spelas klart |
| Få spelare på en utmaning | Visa inte percentil/fördelning förrän n ≥ 30. Visa istället "Kom tillbaka senare för att se hur andra gick" |
| Fokus efter modal | Återställ till spelytan, inte till knappen som öppnade modalen, om modalen öppnades automatiskt |
| Skärmläsare | aria-live-annonsering av varje radresultat ("K, fel plats. A, rätt plats …") |

---

## 14. MVP kontra senare

### 14.1 MVP (lansering, ca 6–8 veckor för en utvecklare/AI-agent)
**Mål:** bevisa att svenskar spelar dagligen och delar.
- Startsida med dagens spel, checklista, lokal streak och nedräkning.
- **Ordet** (3–8 bokstäver, svårt läge, delning, statistik).
- **Aning** (rang, ledtrådar, ge upp, delning, statistik).
- **Mer eller mindre** (5 kategorier, varav minst 3 automatiserade: Wikipedia, Sverige i siffror/SCB, Kalorier eller Filmbetyg).
- **Rättstavat** (5 ord/dag, förgenererat TTS).
- Anonyma serversessioner, återuppta, dygnsbyte med grace-period.
- Resultatmodal + fördelning + percentil (när n ≥ 30).
- Inställningar: tema, ljud, färgblind, reducerad rörelse.
- Hur man spelar, feedbackformulär, Om/Integritet/Villkor.
- Adminpanel (enkel): importera, kurera, schemalägga, förhandsgranska.
- Cookieless analys, Sentry.
- 60 dagars förschemalagt innehåll för alla spel vid lansering.

### 14.2 Fas 2 (vecka 9–14)
- Konton (Google/Apple/e-post), användarnamn, synk och migrering av anonyma sessioner.
- Serverbaserad streak/aktivitet och all-time-statistik.
- **Öronmask** (efter juridisk granskning; Deezer/iTunes-previews).
- Egna Ordet-utmaningar.
- Delningsbilder (OG).
- Nyheter/announcements, underhållsläge.
- PWA.

### 14.3 Fas 3 (vecka 15–22)
- **Klurig Plus** (Stripe): reklamfritt, arkiv, utökade egna utmaningar, tidig tillgång.
- Arkiv med kalender.
- **Vilse** (Plus först, som Lessgames Mapless).
- Annonser (valfritt, med CMP) för gratisanvändare.
- Profilsidor.

### 14.4 Senare/idébank
- Omröstningar, säsongsteman (Mello, jul, midsommar), bakgrundsmusik.
- Vänligor/grupper ("Kontoret") med gemensam topplista. Lessgames saknar sociala ligor, så det här kan särskilja oss.
- Engelska versionen via i18n.
- Nya svenska spel: "Kommunkoll" (gissa kommunen från siluett), "Melodikryss-light", "Årtalet" (gissa året för en händelse), "Namnsdagen".
- Notiser (opt-in e-post "Dagens spel är ute").

---

## 15. Rekommenderad teknisk arkitektur

```
                       ┌────────────────────────────────────────────┐
  Mobil/desktop  ───▶  │ Next.js (Vercel, arn1)                     │
  webbläsare           │  • RSC-sidor: /, /ordet, /aning …          │
   │  IndexedDB        │    server-renderar dagens PUBLIKA payload  │
   │  (cache)          │  • Route Handlers /api/* (spellogik)       │
   │                   │  • Cron: publicera, aggregera, validera    │
   │                   └───────┬───────────────┬────────────────────┘
   │                           │               │
   │                     ┌─────▼─────┐   ┌─────▼──────┐   ┌────────────┐
   │                     │ Postgres  │   │ Redis      │   │ Stripe     │
   │                     │ (Supabase │   │ (Upstash)  │   │ webhooks   │
   │                     │  EU)      │   │ rate limit │   └────────────┘
   │                     └─────▲─────┘   └────────────┘
   │                           │
   │   ┌───────────────────────┴──────────────────────────┐
   │   │ Innehållspipeline (Node-skript/Worker, cron)       │
   │   │  Språkbanken · fastText · Azure TTS · Wikimedia    │
   │   │  SCB · TMDB · Deezer · Mapillary/Google            │
   │   └───────────────────────┬──────────────────────────┘
   │                           ▼
   └────────────────▶  Cloudflare R2 + CDN (bilder, TTS-ljud, OG-bilder)
```

### 15.1 Monorepo-struktur
```
klurig/
├── apps/
│   ├── web/                    Next.js (spel, API, admin under /admin)
│   └── pipeline/               innehållsimport och förberäkning (Node/TS, ev. Python för fastText)
├── packages/
│   ├── shared/                 Zod-scheman, typer, konstanter (spelkonfig), felkoder
│   ├── game-engine/            REN spellogik utan I/O: scoreOrdet, hardModeCheck,
│   │                           aningHint, merMindreCompare, spellCompare, vilseScore
│   ├── ui/                     designsystem (tokens, komponenter)
│   └── db/                     Drizzle ORM-schema + migrationer
└── content/                    frön: ordlistor, kategorier, testdata
```
- **`game-engine` är ren och testad till 100 %.** Samma funktioner körs på servern (auktoritativt) och i klienten (för omedelbar validering av t.ex. svårt läge och längd).
- ORM: Drizzle (typsäkert, bra med Postgres/Supabase).
- Test: Vitest (enheter), Playwright (E2E på mobil- och desktopviewport).

### 15.2 Spelkonfiguration som data
```ts
// packages/shared/src/games.ts
export const GAMES = {
  ordet:  { startDate: '2026-11-01', categories: [3,4,5,6,7,8].map((len, i) => ({ id: i, slug: `${len}`, len })),
            maxGuesses: 6 },
  aning:  { startDate: '2026-11-01', categories: [{ id: 0 }], hintBands: [[1000,7],[160,5],[2,3]], barMaxRank: 3000 },
  merEllerMindre: { startDate: '2026-11-01', roundsPerCategory: 5,
            categories: ['wikipedia','artister','film','priser','sverige'] },
  rattstavat: { startDate: '2026-11-01', rounds: 5 },
  oronmask: { startDate: '2027-01-15', steps: [0.5,1,2,4,8,15], categories: ['alla','pop','hiphop','mello'] },
  vilse:  { startDate: '2027-03-01', rounds: 5, maxPoints: 100, scaleKm: 200, roundTimeMs: 120_000, plus: true },
} as const;
export const TIMEZONE = 'Europe/Stockholm';
```

---

## 16. Prioriterad implementationsplan

Planen är skriven så att en utvecklare eller AI-kodagent kan ta en uppgift i taget. Varje uppgift har ett **klart-när**-villkor. Gör uppgifterna i ordning inom varje fas. Uppgifter märkta ∥ kan göras parallellt.

### Fas 0 – Grund (vecka 1)
| # | Uppgift | Klart när |
|---|---|---|
| 0.1 | Skapa monorepo (pnpm workspaces, Turborepo), TypeScript strict, ESLint, Prettier, Vitest, Playwright | `pnpm test` och `pnpm build` går igenom i CI (GitHub Actions) |
| 0.2 | Next.js-app med App Router, Tailwind, design-tokens (ljust/mörkt tema), typsnitt, next-intl (sv) | Startsida renderar "Klurig" med tema-växling och utan CLS |
| 0.3 | Postgres (Supabase EU) + Drizzle-schema för §6.1 (users, devices, games, categories, challenges, sessions, moves, daily_stats) + migrationer | `pnpm db:migrate` skapar alla tabeller. Seed skapar spelen |
| 0.4 | Tids-util: `todayStockholm()`, `msUntilNext()`, `challengeNumber(game, date)` med tester för sommartid/vintertid | Enhetstester täcker 2026-03-29 och 2026-10-25 |
| 0.5 | Anonym identitet: middleware som sätter signerad httpOnly `device_id`-cookie och skapar `devices`-rad | Två anrop från samma webbläsare ger samma device_id |
| 0.6 | Gemensamt API-ramverk: Zod-validering, felformat `{code}`, rate limit (Upstash), Sentry | Felaktig body ger 400 med `VALIDATION_ERROR` och fältfel |

### Fas 1a – Ordet end-to-end (vecka 2–3)
| # | Uppgift | Klart när |
|---|---|---|
| 1.1 ∥ | `game-engine`: `scoreOrdet`, `mergeKeyboardState`, `validateHardMode` + 40 testfall (dubbletter, å/ä/ö) | 100 % täckning, alla fall gröna |
| 1.2 ∥ | Pipeline: importera SALDO + Kelly + frekvens → `words`. Flagga svarskandidater. Blocklista | ≥ 300 svarskandidater per längd 4–7, ≥ 150 för 3 och 8. Gissningslista ≥ 50 000 former |
| 1.3 | Schemaläggare: generera `challenges` för Ordet 60 dagar framåt utan upprepning | Varje dag har 6 publicerade utmaningar |
| 1.4 | API: `GET /api/today`, `GET challenges`, `POST sessions`, `POST moves` (auktoritativ, idempotent, reveal vid avslut) | Integrationstest: svaret kan inte hämtas före avslut, dragindex utanför ordning ger 409 |
| 1.5 | UI: rutnät, skärmtangentbord (svensk layout), fysiskt tangentbord, animationer, toasts, längdväljare, svårt läge | Går att spela alla 6 längder på mobil och desktop. Playwright-test vinner och förlorar |
| 1.6 | Resultatmodal + delningstext + statistik (`daily_stats`-aggregering via cron) | Delningstext kopieras. Fördelning visas när n ≥ 30 (testdata) |
| 1.7 | Återuppta: klienten hämtar session vid laddning, IndexedDB-cache | Reload mitt i spel återställer brädet exakt |

### Fas 1b – Aning, Mer eller mindre, Rättstavat (vecka 3–6)
| # | Uppgift | Klart när |
|---|---|---|
| 2.1 ∥ | Pipeline Aning: vokabulär 25 k lemman, form→lemma-tabell, fastText-vektorer, `semantic_ranks` topp 10 000 per schemalagt svar | Rangtabell för 60 dagar. Utvärderingsset: ≥ 80 % av "nära"-par hamnar inom rang 500 |
| 2.2 | `game-engine`: `aningHintRank`, `hintCost`, `barWidth`. API guess/hint/give-up | Tester för hint-algoritmen (inkl. upptagna rangar) |
| 2.3 | UI Aning: inmatning med räknare, senaste gissning överst, sorterad lista, färgstaplar, meny (ledtråd/ge upp) med bekräftelse, "10 närmaste" efter avslut | Playwright: gissa, ledtråd, ge upp |
| 2.4 ∥ | Pipeline Mer eller mindre: Wikipedia-pageviews-jobb, SCB-import, (TMDB eller Livsmedelsverket), bildimport från Commons med licensfält, adminvy för manuella priser | ≥ 150 aktiva objekt per kategori |
| 2.5 | Schemaläggare MoM: 6 objekt/kategori/dag, undvik lika värden och upprepning < 90 dagar, blanda svårighet (värdekvot 1,2–10×) | 60 dagar schemalagda |
| 2.6 | API + UI MoM: kortpar, uppräkning, glid, övergångsskärmar, vertikal layout på mobil, sammanfattning, delning | Playwright: spela 25 jämförelser |
| 2.7 ∥ | Pipeline Rättstavat: ordlista 5 svårighetsnivåer, AI-utkast till definition/mening/ursprung → granskningskö i admin → Azure TTS → R2 | 60 dagar × 5 ord granskade med ljud |
| 2.8 | API + UI Rättstavat: uppspelning, definition/mening/ursprung, inmatning, bokstav-för-bokstav-avslöjande, diff, öva igen, sammanfattning | Playwright: 5 rundor |

### Fas 1c – Hubb och lansering (vecka 6–8)
| # | Uppgift | Klart när |
|---|---|---|
| 3.1 | Startsida: dagens spel med status, checklista, streak (lokal), nedräkning, "nästa spel"-flöde | Status uppdateras när ett spel avslutas |
| 3.2 | Sidomeny, Inställningar (tema, ljud, färgblind, reducerad rörelse), Hur man spelar (15-dagarsregel), fokushantering | Axe-test utan allvarliga fel. Tangentbordsnavigering fungerar |
| 3.3 | Dygnsbyte: toast + grace-period 30 min på servern | Test med fejkad klocka |
| 3.4 | Admin: lista/förhandsgranska/byta dagens innehåll, larm när < 7 dagar schemalagt | Admin kan spela morgondagens pussel |
| 3.5 | Juridik och innehåll: Om, Integritet, Villkor, feedbackformulär, Umami | Sidor publicerade. Feedback sparas |
| 3.6 | Prestanda och QA: Lighthouse mobil, ljudkontroll på iOS/Android, låsta flikar, felsidor | LCP < 2 s, CLS < 0,05 på 4G-throttling |
| 3.7 | Lansering: domän, OG-taggar, sitemap, robots, SEO-texter per spel | Publik produktion |

### Fas 2 – Konton, Öronmask, egna utmaningar (vecka 9–14)
| # | Uppgift | Klart när |
|---|---|---|
| 4.1 | Auth (Better Auth eller Supabase Auth): Google, Apple, e-post. Användarnamnsflöde. Radera konto | Inloggning på mobil och desktop. GDPR-radering fungerar |
| 4.2 | Migrera anonyma sessioner vid inloggning + konfliktregler | Testfall för konflikter gröna |
| 4.3 | Serverstreak, `user_game_stats`, all-time-flik i resultatmodal, aktivitetsremsa | Streak räknas korrekt över dygnsbyten |
| 4.4 | **Juridisk granskning av musikkällor** → beslut Deezer/iTunes/licens | Skriftligt beslut |
| 4.5 | Öronmask-pipeline: katalog (~3 000 låtar), alias, startOffset-kurering, daglig preview-validering | 60 dagar × 4 kategorier schemalagda |
| 4.6 | Öronmask API + UI (tidslinje, sök, låsta flikar, resultat med förhandslyssning och länkar) | Playwright + manuell iOS-test i tyst läge |
| 4.7 | Egna Ordet-utmaningar (skapa, dela, spela, rapportera, rate limit, filter) | Länk fungerar för utloggad mottagare |
| 4.8 | OG-delningsbilder, announcements, underhållsläge, PWA | Delningsbild syns i iMessage/WhatsApp-förhandsvisning |

### Fas 3 – Intäkter och Vilse (vecka 15–22)
| # | Uppgift | Klart när |
|---|---|---|
| 5.1 | Stripe Billing: produkter i SEK (månad/år), Checkout, Customer Portal, webhooks → `subscriptions` | Testköp aktiverar Plus direkt via webhook |
| 5.2 | Arkiv: kalender per spel, status, grind, gratis 7 dagar bakåt | Plus spelar valfritt datum. Gratis bara 7 dagar |
| 5.3 | Plus-förmåner: utökade egna utmaningar, reklamfrihet, ring runt avatar | Förmåner styrs av `plan` |
| 5.4 | Vilse: platsimport (Mapillary/Google), verifieringsjobb, Street View-vy, kartnål (MapLibre), timer, poäng, sammanfattning | Plus-användare kan spela 5 rundor. Andra omdirigeras till Plus-sidan |
| 5.5 | (Valfritt) Annonser + CMP för gratisanvändare, utan layoutskift | CLS oförändrad. Samtycke respekteras |
| 5.6 | Profilsidor, omröstningar | – |

### Definition of Done (alla uppgifter)
- Typkontroll, lint och tester gröna. Nya regler i `game-engine` har enhetstester.
- Mobil (375 px) och desktop (1280 px) verifierade. Reducerad rörelse och färgblindläge fungerar.
- Alla texter i `messages/sv.json` (inga hårdkodade strängar).
- Inga svar/hemliga värden i klientbundlar eller publika payloads (verifieras med ett test som söker igenom HTML-/RSC-utdata efter dagens svar).

---

### Bilaga A – Nyckeltal att logga från dag 1 (Umami-event)
`game_start`, `game_move`, `game_complete {game, category, result, moves, duration_s}`, `share {game, method: native|clipboard}`, `hint_used`, `give_up`, `htp_open`, `settings_change {key}`, `category_switch`, `next_game_click`, `archive_open`, `plus_view`, `plus_checkout_start`, `plus_activated`, `error {code}`.

### Bilaga B – Juridisk checklista före lansering
- [ ] Varumärkessök på namnet (PRV/EUIPO) + domän.
- [ ] Licenser för ordlistor (attribution till Språkbanken i Om-sidan).
- [ ] Musik: skriftligt beslut om källa och villkor (Deezer/iTunes/STIM).
- [ ] Bilder: licens och kreditering för varje Mer eller mindre-objekt.
- [ ] TMDB/Spotify/Google-villkor för spel/quiz-användning.
- [ ] Integritetspolicy, cookiepolicy, personuppgiftsbiträdesavtal (Supabase, Vercel, Stripe, Azure).
- [ ] Villkor för användargenererat innehåll (egna utmaningar), rapportflöde.
- [ ] Konsumenträtt för prenumeration (ångerrätt 14 dagar, tydlig uppsägning).
