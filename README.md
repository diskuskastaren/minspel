# Klurig (arbetsnamn)

Svensk samling dagliga minispel. Specifikationen finns i [BLUEPRINT.md](BLUEPRINT.md) (§0 = gällande beslut).
**Allt körs lokalt** tills produktägaren bestämmer att sidan ska bli offentlig.

## Status
| Spel | Status |
|---|---|
| Öronmask (gissa låten) | ✅ Spelbar lokalt |
| Ordet (gissa ordet, 3–8 bokstäver) | ✅ Spelbar lokalt (fas 1a) |
| Aning, Mer eller mindre, Rättstavat | Väntar |
| Vilse | Parkerad |
| Skalningsspel | Idé (produktägaren) |

## Kom igång
```bash
npm install
npm run dev        # http://localhost:3000
npm test           # enhetstester + integrationstester för tjänstelagret
npm run test:e2e   # Playwright (mobil + desktop), startar dev-servern vid behov
npm run typecheck
npm run catalog    # bygg om låtkatalogen från data/seed-songs.json mot Deezer (~2 min)
npm run ordlista   # bygg om Ordets ord- och svarslistor (data/ordet/)
npm run ordet:schema  # förläng Ordets frysta schema till 60 dagar framåt
```
Projektet ligger på en nätverksenhet, så dev-servern kör webpack med pollande filbevakning (`WATCHPACK_POLLING`, se `.claude/launch.json`). Kör du `npm run dev` direkt i en terminal och ändringar inte laddas om: sätt `WATCHPACK_POLLING=true` först.

## Öronmask – så fungerar det
- **Fyra låtar per dag**: Alla, Svensk pop, Svensk hiphop, Schlager & Mello. Byts vid midnatt svensk tid.
- **Sex försök**. Klippet växer 0,5 → 1 → 2 → 4 → 8 → 15 s. Gul = rätt artist, fel låt.
- **Ljud**: Deezers 30 s-förhandslyssningar. Servern klipper MP3:n på ramgränser och lämnar bara ut det som är upplåst (`/api/oronmask/clip`), så det går inte att tjuvlyssna. Hela förhandslyssningen strömmas direkt från Deezer först när rundan är klar.
- **Svaret** lämnar aldrig servern innan rundan är avslutad. Drag valideras i ordning och är idempotenta.
- **Sparat läge**: anonym enhets-cookie + fil `.data/oronmask-sessions.json` (byts mot databas före publicering).
- **Katalog**: `data/seed-songs.json` (kurerad lista + `*top:N` = artistens N mest spelade låtar) → `npm run catalog` → `data/catalog.json` (282 låtar). Låtar som inte hittas listas i `data/catalog-report.txt`.
- **Utvecklingsläge**: `?datum=2026-09-10` spelar ett tidigare datum. "Nollställ dagens rundor" längst ned på spelsidan.

## Ordet – så fungerar det
- **Sex ord per dag**: 3, 4, 5, 6, 7 och 8 bokstäver. Standard är 5. Man kan byta längd när som helst; varje längd har sin egen runda.
- **Sex gissningar**. Grön = rätt plats, gul = finns på annan plats, grå = finns inte. Dubbletter bedöms som i Wordle.
- **Svenskt tangentbord** (Å Ä Ö) på skärmen och fysiskt (`event.key`, så alla layouter fungerar; `é`→`e`, `æ`→`ä`, `ø`→`ö`).
- **Svårt läge** och **färgblindläge** i inställningarna (kugghjulet). Svårt läge låses vid första gissningen och kontrolleras även på servern.
- **Servern äger svaret**: det lämnas ut först när rundan är slut. Ord som inte finns i ordlistan förbrukar inget försök. Drag är idempotenta och valideras i ordning.
- **Resultat**: delningstext med emoji, personlig statistik per längd, och dagens fördelning + "snabbare än X %" när minst 30 spelare är klara.
- **Återuppta**: brädet hämtas från servern vid omladdning (och visas direkt ur en lokal cache).
- **Ordlistor** (`npm run ordlista` → `data/ordet/`):
  - *Gissningar* (≈126 000 former): alla böjningsformer ur Den stora svenska ordlistan (npm `dictionary-sv`, LGPL-3.0) expanderade med Hunspell-reglerna. Sammansättningar som bara finns via Hunspells sammansättningsregler kommer inte med.
  - *Svar* (≈3 200): Kelly-listan (Språkbanken, CC BY 4.0) nivå A1–B2, substantiv/verb/adjektiv. Utan DSSO:s "föreslå inte"-ord, `data/ordet/blocklista.txt` och ord med för många snarlika varianter (t.ex. `_ALLA`). Se `data/ordet/rapport.txt`.
- **Fryst schema**: `data/ordet/schema.json` (datum → ord per längd). Passerade dagar ändras aldrig, ord upprepas inte. Servern varnar i loggen när schemat räcker < 7 dagar.

## Struktur
```
src/game-engine/   ren spellogik per spel (oronmask, ordet) + delad statistik/slump + tester
src/lib/           tid (Europe/Stockholm), MP3-klippning, text- och ordnormalisering
src/server/        tjänstelager per spel, generisk sessionslagring, Deezer, ordlistor
src/app/api/       oronmask/{state,guess,clip,search,dev-reset}, ordet/{state,guess,dev-reset}
src/components/    UI (ui/ delat, oronmask/, ordet/, home/)
scripts/           build-catalog.ts, build-ordet-words.ts, schedule-ordet.ts
e2e/               Playwright-tester
```

## Innan sidan blir offentlig (ej gjort)
- Granska Deezers villkor för kommersiellt bruk (se BLUEPRINT §0).
- Byt fil-lagring mot Postgres, lägg till rate limiting, frys Öronmasks dagliga schema (i dag räknas det fram ur katalogen – ändras katalogen ändras framtida dagars låtar). Ordets schema är redan fryst.
- Ordet: kurera svarslistan manuellt (Kelly bygger på webbtext och har många samhälls-/politikord), och bekräfta licensvillkoren för DSSO (LGPL-3.0) och Kelly (CC BY 4.0) med attribution på Om-sidan.
- Global statistik ("topp X %") kräver delad databas.
- Ta bort `robots: noindex` i `src/app/layout.tsx`.
