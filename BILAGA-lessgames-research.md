# Bilaga: Research om lessgames.com

> Insamlad 2026-09-23 genom att använda sajten i webbläsare (desktop + mobilvy), läsa den publika klientkoden (Next.js-bundles), den server-renderade sidpayloaden och genom att anropa det publika spel-API:t på samma sätt som klienten gör.
>
> Märkning av källor:
> **[API]** = verifierat genom anrop mot `api.lessgames.com` ·
> **[KOD]** = utläst ur klientens JS-bundles ·
> **[UI]** = observerat i gränssnittet ·
> **[ANTAG]** = slutsats/antagande som inte kunnat verifieras direkt.
>
> Den här filen beskriver *hur Lessgames fungerar*. Hur vi ska bygga vår svenska version står i [BLUEPRINT.md](../BLUEPRINT.md).

---

## 1. Sajten i korthet

- Tagline: *"Why Play More? Lessgames brings you familiar games that require no skill."* [KOD]
- Affärsmodell enligt About-sidan: *"only makes money from ad revenue and subscriptions"*. Inga mejl, inga push-notiser. [UI]
- Sex spel (varav ett dolt): Wordless, Songless, Spelling Bee, More/less (Moreless), Clueless, samt **Mapless** som visas som en "???"-ruta på startsidan och bara är tillgänglig för prenumeranter. [KOD][UI]
- Alla spel är **dagliga**: samma pussel för alla, byts vid midnatt **America/New_York** (06:00 svensk sommartid). [KOD][API: `GET /` → `{"index":{"date":"2026-09-23","timeLeft":70472471}}`]
- Delningslänkar går via kortdomänen **less.gg** (t.ex. `https://less.gg/moreless`). [KOD]

## 2. Teknisk stack (identifierad)

| Del | Teknik | Källa |
|---|---|---|
| Frontend | Next.js App Router (RSC, `self.__next_f`), React | [KOD] |
| UI-bibliotek | Chakra UI v3 (tokens som `fg.muted`, `bg.panel`), Emotion-keyframes | [KOD] |
| i18n | next-intl, ICU-meddelanden (343 nycklar, bara engelska aktivt men "Language"-inställning finns) | [KOD] |
| State | Zustand (`audio-storage`, `preferences-storage` i localStorage) | [KOD] |
| Lokal speldata | Dexie/IndexedDB, databas `game-store`, tabell `sessions` med nyckel `[challengeDate+game+categoryId]` | [KOD] |
| Validering | Zod (både klient och server; servern svarar `VALIDATION_ERROR` med Zod-fältfel) | [KOD][API] |
| Formulär | Formik | [KOD] |
| Auth | Better Auth (`baseURL: https://api.lessgames.com`, `basePath: /auth`), Google-inloggning, plugins: additionalFields (`username`, `role`), Stripe-subscription | [KOD] |
| Backend | Eget API `api.lessgames.com` bakom Caddy (`via: 1.1 Caddy`), CORS med credentials | [API] |
| Media | `cdn.lessgames.com` (Cloudflare, S3/R2-liknande `aws-chunked`) — låtklipp `.aac`, bilder, TTS-ljud | [API] |
| Betalning | Stripe (Stripe.js, Payment Element, `subscription/intent`) | [KOD] |
| Analys | Umami (self-hosted `stats.less.gg`), Google Analytics 4, Cloudflare Web Analytics/RUM | [KOD] |
| Annonser | Playwire RAMP (`cdn.intergient.com`), Google Publisher Tag + Prebid, Confiant (annonskvalitet), BlockThrough (adblock-recovery), Google Funding Choices (CMP/samtyckesbanner) | [KOD] |
| Kartor | Google Maps Embed API (Street View) + Google Maps för gissningskartan | [KOD] |
| Musikspelare efter spel | SoundCloud Widget API (`w.soundcloud.com/player/api.js`) | [KOD] |
| Övrigt | `robots.txt` med ASCII-logga, `sitemap.xml` med alla 6 spel, `/api/maintenance` (Next route) | [API] |

## 3. Routes (fullständig lista)

| Route | Innehåll | Källa |
|---|---|---|
| `/` | Startsida: 6 rutor (5 spel + "???") | [UI] |
| `/wordless` | Wordless (daglig) | [UI] |
| `/wordless/custom` | Skapa egen Wordless (kräver inloggning) | [KOD] |
| `/wordless/{customId}` | Spela någons egen Wordless | [KOD] |
| `/songless` | Songless | [UI] |
| `/spellingbee` | Spelling Bee | [UI] |
| `/moreless` | More/less | [UI] |
| `/clueless` | Clueless | [UI] |
| `/mapless` | Mapless (redirect till `/` om ej prenumerant) | [KOD] |
| `/archive?game=…` | Arkiv (kalender per spel, låst bakom prenumeration) | [KOD] |
| `/login` | Inloggning | [KOD] |
| `/p/{username}` | Publik profil (namn, gått med-datum, "Statistics – Coming, Soon?") | [KOD] |
| `/about`, `/changelog`, `/privacy`, `/terms` | Informationssidor | [UI] |
| `/maintenance` | Underhållssida med maskoten "Spot" | [KOD] |
| 404 / error | "Page not found." / "Something went wrong" med "Try again"/"Go home" | [KOD] |

## 4. Globala konstanter (utlästa ur klienten) [KOD]

```js
GAMES = ["wordless","songless","moreless","clueless","spellingbee","mapless"]
TIMEZONE = "America/New_York"

WORDLESS_CHALLENGE_START_DATE = "2025-08-29"
WORDLESS_CATEGORIES = längd 3,4,5,6,7,8  (categoryId 0–5)
WORDLESS_CUSTOM_MAX_GUESSES = 8        (prenumerant: 20)
WORDLESS_CUSTOM_MAX_CATEGORIES = 8     (max antal ord i en custom-utmaning)
WORDLESS_CUSTOM_MAX_WORD_LENGTH = 9    (prenumerant: 100)
WORDLESS_CUSTOM_TIME_LIMITS = [10, 30, 60, 120, 300] sek (+ "ingen")
WORDLESS_CUSTOM_MAX_GAME_CREATIONS_ALLOWED = 3 per 60 s

SONGLESS_CATEGORIES = All(0), Rock(1), Hip Hop(2)
SONGLESS_TRACK_TIMESTEPS = [0.13, 0.53, 2, 8, 15]  sekunder

MORELESS_CHALLENGE_REUSE_DAYS = 90
MORELESS_CATEGORIES =
  0 Google Searches  (heltal)   1 Spotify Streams (heltal)
  2 Movie Ratings    (decimal, affischformat 2/3)
  3 Prices           (prefix "$")   4 Trivia (auto-format)
MORELESS_ROUND_COUNT = 5

CLUELESS_CHALLENGE_START_DATE = "2025-12-01"
CLUELESS_MAX_BOARD_SIZE = 512
CLUELESS_HINT_COST_BANDS = [{minDistance:1000,cost:7},{minDistance:160,cost:5},{minDistance:2,cost:3}]

SPELLINGBEE_CHALLENGE_START_DATE = "2026-01-15"
SPELLINGBEE_CATEGORIES = 5 rundor

MAPLESS_CHALLENGE_START_DATE = "2026-09-01"
MAPLESS_ROUND_COUNT = 5, MAPLESS_MAX_ROUND_POINTS = 100
MAPLESS_SCORE_SCALE_KM = 1491.7        → poäng = 100 · e^(−km / 1491.7)
MAPLESS_SCORE_SCALES = 5000 / 100 / 10 (visningsskalor), default 100
MAPLESS_ROUND_TIME_LIMIT_MS = 180000   (3 min per runda)
```

Utmaningsnummer = antal dagar sedan startdatum + 1 (används i delningstexten, t.ex. "Wordless 391").

## 5. API-kontrakt (api.lessgames.com)

Alla anrop är JSON, `credentials: include`. Fel returneras som `{"code": "...", "data": ...}`.

### Gemensamt
| Anrop | Svar / beteende |
|---|---|
| `GET /` | `{"text":"lessapi","index":{"date":"YYYY-MM-DD","timeLeft":<ms>}}` [API] |
| `GET /sessions?game&challengeDate` | Inloggads sparade sessioner [KOD] |
| `POST /sessions/checklist?challengeDate` | Vilka spel/kategorier som är klara idag (för menyn) [KOD] |
| `GET /sessions/archive?game` | Spelade/påbörjade datum (arkivkalender) [KOD] |
| `GET /sessions/activity` | Aktivitet (streak-veckan i menyn) [KOD] |
| `GET /changelog` | Nyhetsinlägg: `version, title, body(markdown), startDate, endDate, ctaLabel, ctaHref` [KOD] |
| `POST /feedback` | Feedback (kategori bugg/förslag, rate-limitad) [KOD] |
| `GET /polls?slug`, `POST /polls/vote` | Community-omröstningar (visas i Mapless) [KOD][API: `POLL_NOT_FOUND`] |
| `GET /subscription/plans` | `{"plans":[{"name":"pro","monthly":{"prices":{"usd":499}},"yearly":{"prices":{"usd":4790}}}]}` [API] |
| `POST /subscription/intent` | Skapar Stripe-intent [KOD] |
| `/auth/*`, `/auth/o/get-user`, `/auth/o/check-username`, `/auth/o/set-username` | Better Auth + användarnamn [KOD] |
| `GET lessgames.com/api/maintenance` | `{"enabled","active","pending","games":[],"startsAt","message"}` [API] |

### Wordless
- `POST /wordless/guess` body `{challengeDate, categoryId, roundIndex, guess}` eller `{customId, categoryId, roundIndex, guess}`.
- Svar: `{"correct":false,"comparison":[{"letter":"c","state":"incorrect"},{"letter":"a","state":"correct"},…]}` — states `correct | present | incorrect`. När `correct=true` **eller** `roundIndex` är sista rundan (5) inkluderas `"answer":"paw"`. [API]
- Dubbletter hanteras som Wordle: svar `paw`, gissning `pap` → p=correct, a=correct, p=incorrect. [API]
- Versaler accepteras och normaliseras. [API]
- Fel: `INVALID_GUESS_WORD` (ej i ordlistan), `INVALID_GUESS_LENGTH`, `INVALID_GUESS_CHARACTER`, `INVALID_HARD_MODE_GUESS`, `ROUND_NOT_FOUND` (roundIndex ≥ maxGuesses), `DATE_NOT_ALLOWED` (annat datum än idag utan arkivbehörighet). [API][KOD]
- `GET /wordless/stats?challengeDate&categoryId` → `{"daily":{"distribution":[{"point":1,"weight":0.0231},…,{"point":7,"weight":1}]},"allTime":{"distribution":[],"winStreak":null}}` — daglig fördelning är **kumulativ** (punkt 7 = förlust). Används för "Du placerade dig bland topp X %". [API]
- `POST /wordless/custom/create` body `{words[], maxGuesses, timeLimit, dictionaryDisabled, hardMode, blindMode}`. [KOD]

### Songless
- `GET /songless/search?query=` → max 10 träffar `[{id, artist, track}]` (kurerad låtdatabas; tom query → `VALIDATION_ERROR`). [API]
- `POST /songless/guess` body `{challengeDate, categoryId, roundIndex, songId | null}` (`null` = hoppa över). Svar `{"state":"incorrect"|"present"|"correct"|"skipped"}`. **`present` = rätt artist, fel låt.** På sista rundan: `"answer":{"artist","track","sc":"<soundcloud track id>"}`. [API]
- Sidan server-renderar dagens klipp: `{"categories":[{"categoryId":0,"fileUrl":"https://cdn.lessgames.com/songs/A200.aac"},…]}` — ~25 s AAC 48 kHz. Klientens uppspelning stoppas vid respektive tidssteg. [API]
- `GET /songless/stats?challengeDate&categoryId` → fördelning 1–5 + 6 (=fail), normaliserad mot max. [API]

### More/less
- Sidan server-renderar 5 kategorier × 6 objekt: `{roundNumber, image, title, description, categoryId}` — **värdena skickas inte** till klienten. [API]
- `POST /moreless/guess` body `{challengeDate, categoryId, roundIndex, direction:"left"|"right"}` → `{"stats":{"1":"2740000","2":"246000"},"correct":true}`. Runda *i* jämför objekt *i+1* (vänster) mot *i+2* (höger); höger kort glider in till vänster nästa runda (kedja). [API]
- `GET /moreless/stats?challengeDate&score` → `{"daily":{"percentile","sameScorePercentage","average","categoryAverages":{…}},"allTime":{"globalCategoryAverages","userCategoryAverages","userGamesPlayed"}}`. [API]
- Felkoder: `ROUND_ALREADY_PLAYED`, `ROUNDS_OUT_OF_ORDER`, `CATEGORY_ALREADY_PLAYED`, `DATE_NOT_ALLOWED`. [KOD]

### Clueless
- `POST /clueless/guess` body `{categoryId:0, word, challengeDate}` → `{"word":"house","distance":11,"correct":false,"isHint":false}`. `distance` = semantisk rang (1 = rätt ord). Ord **lemmatiseras** (houses→house, walking→walk, building→build). Regex `^[a-z]+$`. Okänt ord → `WORD_NOT_FOUND`. Rang kan vara > 8 000. [API]
- `POST /clueless/hint` body `{categoryId, guessedDistances:[…], challengeDate, giveUp}` → ett ledtrådsord med rang enligt algoritm (se §6.4). `giveUp:true` → returnerar svaret (`distance:1, isHint:true`). [API]
- `GET /clueless/stats?challengeDate&score` → `percentile, failedPercentage, average, distribution[1..101]` (101 = gav upp). [API]

### Spelling Bee
- Sidan server-renderar 5 rundor: `{correctPercentage, wordUrl, definitionUrl, sentenceUrl, origin, sentence:"…*…", definition:"…*…"}` där `*` maskerar ordet. [API]
- `POST /spellingbee/guess` body `{challengeDate, roundIndex, word}` → `{"word":"<rätt stavning>","correct":bool,"correctPercentage":…}` — rätt stavning returneras alltid, även vid fel. [API]
- `GET /spellingbee/stats?challengeDate&score` → `percentile, sameScorePercentage, average, roundPercentages{0..4}` + all-time. [API]

### Mapless
- Sidan server-renderar 5 Street View-embeds (`google.com/maps/embed/v1/streetview?pano=…&heading=…`). [API]
- `POST /mapless/start {challengeDate, categoryId}`, `POST /mapless/guess {challengeDate, categoryId, lat, lng, elapsedMs}` → `UNAUTHORIZED` om ej prenumerant. [API]
- `GET /mapless/stats` → `percentile, average, roundAverages, survival[]` (andel spelare som nått X poäng). [API]

## 6. Spellogik i detalj [KOD+API]

### 6.1 Wordless
- 6 dagliga pussel (3–8 bokstäver); användaren byter längd med −/+ runt en siffra. 6 gissningar.
- **Hard mode** (inställning): varje gissning måste ha alla gröna bokstäver på samma plats och minst lika många av varje gul/grön bokstav som tidigare. Felmeddelanden: "2nd letter must be A", "Guess must contain R".
- **Blind mode** (bara custom): cellerna visar inga färger, bara en radsammanfattning (antal rätt/antal fel plats); ingen tangentbordsfärgning; ingen fördröjd reveal.
- Reveal: 300 ms per cell med ljud per cell (0 ms i blind mode).
- Tangentbordets färg per bokstav: bästa kända status vinner (correct > present > incorrect).
- Delning: `Wordless 391 (5 Letters) - 4/6` + emojirutnät + `Play Today's Game: https://less.gg/wordless`. Förlust visar 💀 istället för antal.
- Custom Wordless: flera ord i följd ("Round 1 of 3"), valbar max-gissningar, tidsgräns, ordlista av/på, läge normal/hard/blind. Disclaimer före start ("This challenge's words and rules were picked by another player…"). Skaparens profil länkas.

### 6.2 Songless
- 3 dagliga låtar (All, Rock, Hip Hop) som flikar; flikarna låses under pågående spel. [UI]
- 5 försök. Klipplängd per försök: 0,13 s → 0,53 s → 2 s → 8 s → 15 s. Tidslinjen visar segmenten och en markör "0.1 seconds" / "0.5 seconds" … [UI]
- Sökfält med autocomplete (artist + låt). Välj en träff → "Skip"-knappen blir "Submit". Sista försöket heter "Give up". [UI]
- Färger: röd = fel artist & låt, gul = rätt artist fel låt, grön = rätt. Överhoppade rader visar "Skipped". [UI]
- Resultat: modal med "Game Over"/"You Won!", "The song was …", flikar Today/All time, "Solved in", "Average", gissningsfördelning (din stapel färgad), "You and 22.5% of others failed today's game", SoundCloud-spelare som spelar hela låten, Share/Next. [UI]
- Delning: "I found the Rock song in 2 seconds 😎 [Songless #391]" — emoji beror på antal gissningar (🤯🥳😎🤩🎱 😅 💀).

### 6.3 More/less
- 5 kategorier i fast ordning (Google Searches → Spotify Streams → Movie Ratings → Prices → Trivia), var och en med 5 jämförelser (6 objekt i kedja) = max 25 poäng.
- Klicka på det kort som har **mest** (frågan är alltid "vilken har mer"). Båda värdena räknas upp animerat (~2 s), sedan glider vänster kort ut och ett nytt kommer in. [UI]
- Spelet fortsätter även vid fel svar (ingen "game over" per fel) — poäng = antal rätt. Mellan kategorier: övergångsskärm "Category 2 of 5 · Up next · Get ready…". [KOD]
- Kategoriflikar med ikoner högst upp visar progression. Mobil: korten staplas vertikalt med "OR"-bricka emellan. [UI]
- Datakällor enligt changelog: Google-sökningar, Spotify-streams och filmbetyg uppdateras automatiskt; priser/trivia kureras manuellt. Google-sökvolym är avrundad i intervall (t.ex. 246 000, 4 090 000). [API]
- Objekt får återanvändas efter 90 dagar.

### 6.4 Clueless
- Gissa dagens hemliga ord utifrån **betydelse**. Varje gissning får en rang (1 = rätt ord). Listan sorteras med bästa överst; senaste gissningen visas separat överst med pilmarkör. Räknare "#4" i sökfältet visar nästa gissningsnummer. [UI]
- Stapelbredd: `1 % om rang > 3000, annars 1 % + 99 % · ((3000 − rang)/3000)^3,5`. Färg: grön ≤ 300, orange ≤ 1 500, röd > 1 500. [KOD]
- Validering i klient: 1–64 tecken, bara a–z, slurfilter ("no."), dubblett ("… has already been guessed"), stoppord ("This word is too common") — lista på ~33 engelska funktionsord. [KOD]
- Ledtråd (meny "…"): kostnad beror på ledtrådens rang: ≥ 1000 → +7 gissningar, ≥ 160 → +5, ≥ 2 → +3. Bekräftelsedialog visar kostnaden. [KOD][UI]
- Ledtrådsalgoritm (`guessedDistances` = redan kända rangar): ingen gissning → rang 1000; bästa rang ≤ 20 → närmaste lediga rang under bästa (ner till 2), annars uppåt; bästa rang > 20 → `ceil(0,8 · bästa)`, justera ±1..50 om upptagen. [KOD]
- "Give up" med bekräftelse → visar ordet, räknas som förlust. Poäng = gissningar + ledtrådskostnader; statistik 1–100, 101 = gav upp.
- Delning: "I solved Clueless #X in 🔟 guesses with 1️⃣ hint 🥳 …"

### 6.5 Spelling Bee
- 5 ord per dag med stigande svårighet (dagens: ~96 % → 30 % klarar). Rundindikator 1–5. [UI][API]
- Stor högtalarknapp spelar ordet (TTS). Knappar "Definition" och "Sentence" spelar/visar definition och exempelmening med ordet maskerat (`*`). Ursprung ("Origin: Latin") visas när det finns. [UI][API]
- Skriv med skärm- eller fysiskt tangentbord → Enter. "Checking your spelling…". **Ett försök räknas**; svaret avslöjas bokstav för bokstav (375 ms/bokstav, grönt tills första felet, där det stannar och blir rött). [KOD]
- Efter fel: "Keep trying" (öva utan poäng) eller "Reveal answer". Sammanfattning: X/5 rätt, "Your solve rate", jämförelse per runda mot andra. [KOD]
- Delning: "Spelling Bee — 4/5 words correct 🐝" (+🔥 vid 5/5, 💀 vid 0).

### 6.6 Mapless (dolt, Plus)
- 5 rundor Street View (iframe förskjuten −68 px för att dölja adressraden), 3 min per runda, placera nål på karta, poäng 0–100 per runda (exponentiellt avtagande med avstånd), max 500. Avståndsenhet km/miles. Omröstningar (polls) i spelet för att låta prenumeranter påverka regler. [KOD]

## 7. Sessioner, persistens och progression [KOD]

- **Utloggad**: speldata sparas bara lokalt i IndexedDB. Servern är tillståndslös för anonyma — den jämför bara gissningen mot dagens svar.
  - Konsekvens/svaghet: en anonym klient kan skicka `roundIndex=5` direkt och få svaret (`answer`) utan att ha spelat. [API]
- **Inloggad**: sessioner lagras på servern; spel på två enheter samtidigt ger "Game session out of sync".
- Sessionsschema per spel (Zod): gemensamt `{game, challengeDate, categoryId, timestamp, state: ongoing|won|lost, gameData}`; `gameData` per spel:
  - wordless `{board: [[{letter,state}]], guesses, answer?}`
  - songless `{guesses, board: [{state,artist,track}|{state:"skipped"}], answer?:{artist,track,sc}}`
  - moreless `{points, currentRound, stats:{[idx]:value}, roundResults: bool[]}`
  - clueless `{board:[{word,distance,isHint}], metrics:{guessCount,hintCount}|null}`
  - spellingbee `{guess:{input,expected,correct}|null}`
  - mapless `{startedAt, guess:{coords,actual,locationName,elapsedMs}|null}`
- **Checklista** (antal delpussel per dag): wordless 6, songless 3, moreless 5, clueless 1, spellingbee 5, mapless 5. Ett spel bockas av (grön bock i menyn) när alla delar är won/lost.
- **Aktivitet**: sidomenyn visar "SEPTEMBER ACTIVITY" med de senaste 7 dagarna som cirklar + nedräkning till nästa dag + "Play a game to keep the streak alive!". [UI]
- **Arkiv** (Plus): välj spel, månadskalender med status played/started, "X/Y complete", streak-bricka, statistikkort (Played, Win rate/Solve rate). Gate: "Unlock the Full Archive – Play any past date with a Lessgames subscription."
- **Resultatskärm**: under spelet efter avslut: "PLAY PREVIOUS DAYS … OR COME BACK IN 19:24:33", datumremsa med de senaste 10 dagarna, och "TRY OUR OTHER GAMES" med länkar.
- **How to Play** visas automatiskt första gången och sedan var 15:e dag per spel (`{game}_htpLastShown`).

## 8. Inställningar och tillgänglighet [UI][KOD]
- Settings-modal med sidonavigering (Preferences / About Us / Sign in): Music (bakgrundsmusik, även vinterversion), Sound Effects (på/av + volym 0–100 %), Dark Theme, Accessibility (Colorblind Mode, Reduced Motion: System/Enable/Disable), Hard Mode (Wordless), Song Audio, Distance Units, Language.
- Ljudeffekter: button, switch, keyboard_type, keyboard_backspace, cell_reveal, won, lost, finished_all, word_not_found, word_too_short, plus/minus (längdväljare), mapless marker/zoom/score_count.
- Övriga UX-detaljer: orienteringsspärr ("Please rotate your device") när skärmen är för liten i liggande läge; bekräftelse vid navigering bort med osparad progress; toast "Time's up! Today's games have ended. Refresh to play the latest!" när dygnet slår om; underhållsvarning med nedräkning ("Maintenance starts in 5 minutes. Finish your game soon!"); säsongstema (vinter).
- Känd UX-bugg: efter att How to Play-modalen stängts ligger fokus kvar på "?"-knappen, så Enter (för att skicka en gissning) öppnar modalen igen. [UI]

## 9. Konto, profil, monetisering [KOD][API]
- Inloggning: endast Google (Better Auth). Efter första inloggning: "Pick a Username" (3–16 tecken, a–z 0–9 _ -, får ej börja/sluta med _ eller -, live-kontroll av tillgänglighet).
- Kontots fördelar enligt texter: synka progress mellan enheter, skapa custom Wordless, spara statistik.
- **Lessgames Plus**: 4,99 USD/mån eller 47,90 USD/år (~20 % rabatt). Innehåll: reklamfritt, arkiv "back to day 1", exklusiva lägen, större custom-gränser, early access (Mapless). Betalning i modal med Stripe Payment Element (öppnas via `#subscribing` i URL). Prenumeranter får en färgad ring runt avataren.
- Annonser: bottenlist ("bottom rail") vars höjd mäts så att layouten flyttas upp; sidan hävdar att annonser inte ska vara i vägen.
- Feedback-dialog (Bug Report / General Suggestion, "We can only reply to users who are logged in", rate-limit). Extern Tally-länk för "Join our Feedback Team" och jobbansökan.

## 10. Analys-event (Umami) [KOD]
`sidebar:game_click`, `sidebar:archive_click`, `sidebar:htp_click`, `sidebar:feedback_click`, `sidebar:social_click`, `sidebar:logo_click`, `profile:login_click`, `profile:logout_click`, `profile:preference_update`, `game:wordless_share`, `game:songless_share`, `game:spellingbee_start|complete|keep_try`, `game:mapless_start|guess|complete|share|guess_error`, `mapless:panorama_toggle|reset|summary_round_view`.

## 11. Produkthistorik (från changelog) [UI]
- 2.0 Moreless + ny backend, Google-login, CDN, användarnamn.
- 2.1 "The Big Remaster": ny motor, bättre skalning, kurerad låtsökning, full-låt-embed, custom Wordless med timer/antal gissningar/flera ord, respekterar Reduced Motion, man kan lämna och återvända utan att tappa progress.
- 2.2 Clueless + vintertema + omgjort sessionssystem.
- 2.3 Spelling Bee + checklista i menyn + datum/nedräkning.
- 2.4 Hard mode, blind mode, ordlista av, färgblindläge, volymreglage, automatiska Moreless-data.
- 2.5 Arkiv + Lessgames Plus.
- 2.6 Mapless (Plus-test), About-sida.
- Rytm: en uppdatering den 1:a varje månad.
