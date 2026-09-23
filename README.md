# Klurig (arbetsnamn)

Svensk samling dagliga minispel. Specifikationen finns i [BLUEPRINT.md](BLUEPRINT.md) (§0 = gällande beslut).
**Allt körs lokalt** tills produktägaren bestämmer att sidan ska bli offentlig.

## Status
| Spel | Status |
|---|---|
| Öronmask (gissa låten) | ✅ Spelbar lokalt |
| Ordet, Aning, Mer eller mindre, Rättstavat | Väntar |
| Vilse | Parkerad |
| Skalningsspel | Idé (produktägaren) |

## Kom igång
```bash
npm install
npm run dev        # http://localhost:3000
npm test           # enhetstester (spelmotor, tid, MP3-klippning, normalisering)
npm run typecheck
npm run catalog    # bygg om låtkatalogen från data/seed-songs.json mot Deezer (~2 min)
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

## Struktur
```
src/game-engine/   ren spellogik (regler, schema, bedömning, delning, statistik) + tester
src/lib/           tid (Europe/Stockholm), MP3-klippning, textnormalisering
src/server/        Deezer-klient, katalog, sessionslagring, tjänstelager
src/app/api/       oronmask/{state,guess,clip,search,dev-reset}
src/components/    UI (oronmask/, home/)
scripts/           build-catalog.ts
```

## Innan sidan blir offentlig (ej gjort)
- Granska Deezers villkor för kommersiellt bruk (se BLUEPRINT §0).
- Byt fil-lagring mot Postgres, lägg till rate limiting, frys det dagliga schemat (i dag räknas det fram ur katalogen – ändras katalogen ändras framtida dagars låtar).
- Global statistik ("topp X %") kräver delad databas.
- Ta bort `robots: noindex` i `src/app/layout.tsx`.
