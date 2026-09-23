# Bilaga: Extern undersökning av lessgames.com (annan AI, 2026-09-23)

> Sparad 2026-09-23 som underlag inför kommande kodning. **Ingen kod har ändrats utifrån detta.**
> Originaltexten (oförändrad, avkortad i slutet redan när den klistrades in) finns längst ned.
> Huvudunderlaget är fortfarande [BILAGA-lessgames-research.md](BILAGA-lessgames-research.md), som bygger på API-anrop och klientkod. Den här undersökningen kunde inte ladda flera spel (Wordless och Clueless visade bara "Loading…", och Songless, More/less och Spelling Bee gav fel), så den är **svagare som källa om Lessgames**. Däremot innehåller den användbara produktkrav för vår egen version.

---

## 1. Bedömning: vad som är nytt jämfört med BLUEPRINT och research-bilagan

Följande saknas eller är tunt beskrivet i våra befintliga dokument och bör tas med när respektive del byggs:

### Robusthet i spelflödet
- **Ogiltiga svar och nätfel ska aldrig förbruka ett försök.** Dubbelklick ska räknas som en enda handling (idempotens finns redan i Öronmask, men regeln om att ett misslyckat anrop inte ska kosta ett försök bör gälla alla spel och testas).
- Om svarskontrollen misslyckas ska laddningen synas, och spelaren ska kunna försöka igen utan att det kostar något (exemplet i originaltexten gäller Rättstavat: "Checking your spelling…" som hänger).
- Kantfall att testa: **två öppna flikar**, utloggning mitt i spel, spel som påbörjas före midnatt och skickas efter, arkivdag utan publicerat innehåll, ljudfil saknas eller blockeras.
- Tillbaka-knapp och omladdning ska inte förlora ett pågående spel.

### Tillgänglighet och mobil
- Spelen ska gå att använda med tangentbord och **skärmläsare**. Bilder i Mer eller mindre behöver **alternativtext**.
- En mycket smal skärm ska få en användbar mobilvy eller en tydlig **rotationsuppmaning** (Lessgames gör så i Songless). Inga kontroller får hamna utanför skärmen.
- Kontrollera å/ä/ö på fysiska tangentbord som saknar svensk layout.

### Innehåll och data
- **Mer eller mindre:** varje värde bör lagra `metric, unit, source, asOf, method, confidence, license`. Visa källans datum. Undvik mått som ser ut som absoluta tal när källan bara ger ett relativt index (till exempel Google Trends).
- **Separera** innehållsobjekt, dagspussel, spelsession och händelse (guess/event). Föreslagen modell: `Puzzle { status: draft|scheduled|live|retired, contentVersion, publicPayload, privateAnswerRef }`, `Session { state: new|active|won|lost|abandoned }` och `Event { sequence, kind, payload }`. Den stämmer väl med BLUEPRINT §6.1.
- Schemaläggaren bör varna för upprepade svar, närliggande ämnen och för stora svårighetshopp.
- **Aning:** förklara för spelaren att talet är rang enligt spelets modell, inte en objektiv sanning. Versionera ordlistan och modellen (`vocabularyVersion`, `similarityModelVersion`).
- **Rättstavat:** bestäm uttryckligen om sammansatta ord, bindestreck, stavningsreformer och talspråk ska godkännas. Lagra godkända alternativa former.
- **Öronmask:** sökningen ska hantera alias, featuring, skiljetecken och korttitlar utan att två olika låtar med samma titel blandas ihop.

### Delning
- Ett delningskort ska inte avslöja svaret. Ett användarskapat pussel ska delas via en **signerad länk** så att svaret inte syns i URL:en.

### Musikrättigheter (skärper BLUEPRINT §0.4)
- Originaltexten nämner **Stim** och **IFPI** och säger att rättigheterna till både låtar och inspelningar måste vara utredda innan musikspelet lanseras publikt. Detta ska ligga på checklistan före publicering, tillsammans med granskningen av Deezers villkor.

## 2. Motsägelser mot vår verifierade research (lita på research-bilagan)

| Påstående i den externa undersökningen | Verifierat i BILAGA-lessgames-research.md |
|---|---|
| Songless-klippet börjar på 0,1 s | 0,13 s (`SONGLESS_TRACK_TIMESTEPS = [0.13, 0.53, 2, 8, 15]`). Gränssnittet visar "0.1 seconds", som är avrundat |
| Antal Songless-försök, klipplängder och kedjeregeln i More/less är okända | Kända: fem steg, fem rundor i More/less och en kedja där höger kort blir vänster |
| Clueless: talintervall och ledtrådar okända | Kända: rang med 1 = rätt ord, ledtrådskostnad per rangband och lemmatisering |
| Endast Google-inloggning observerad | Stämmer, men Better Auth med Stripe-plugin finns i koden |

## 3. Påverkar inte gällande beslut

BLUEPRINT §0 gäller fortfarande: allt körs lokalt, spelen byggs före konton och betalning, och Öronmask med Deezer används för lokal utveckling. Den externa undersökningen föreslår att musikspelet ska vänta tills rättigheterna är klara. Det är redan löst genom att inget publiceras förrän rättigheterna är utredda.

---

## Originaltext (inklistrad av produktägaren)

Lessgames.com – undersökning och blueprint för en svensk spelsajt

Undersökt: 23 september 2026. Syfte: arbetsunderlag att ge Claude Code för en självständig svensk produkt. Den svenska tjänsten ska ha egna namn, eget UI, egen visuell identitet, egen kod och redaktionellt svenskt innehåll.

### 1. Metod och säkerhet i slutsatserna

Jag gick igenom lessgames.com i en webbläsare utan konto: startsida, sidomeny, inställningar, arkiv, inloggningsruta, alla fem spel, hjälprutor, ändringslogg och Om oss. Jag provade kategorival, inmatning, tips, svar och skip där gränssnittet medgav det. Jag jämförde med sajtens egna sökindexerade sidor. Observerat nedan betyder att jag såg beteendet eller läste det i sajtens egen information. Rekommendation betyder en föreslagen specifikation för den svenska produkten. Ej verifierat betyder att det inte ska byggas som om det vore en fastslagen regel på Lessgames.

Begränsning i testet: Wordless och Clueless fastnade i Loading... i denna webbläsarsession. Songless Skip, More/less-val och Spelling Bee-svar visade Something went wrong; ett konsolfel visade Failed to fetch. Därför har jag inte kunnat verifiera deras slutskärmar, exakt antal försök, poäng, liv, återställning eller serverns svarskontroll. Det är en observation av denna session, inte bevis för att sajten generellt är trasig.

### 2. Produktöversikt

Startsidan visar fem spel: Wordless, Songless, Spelling Bee, More/less och Clueless, plus en ???-plats. Det finns ett gemensamt skal med sidomeny, arkiv, inställningar och inloggning; på spelsidor även How to play. Grundrytmen är korta dagliga utmaningar. Kontot erbjuds för statistik, synkronisering och egna utmaningar. Om-sidan säger att spelmaterial delvis kurateras manuellt och delvis väljs ur förberedda alternativ per dag; teamet uppger att innehållet skapas av människor och att intäkterna kommer från annonser och prenumerationer.

| Spel | Kärnmekanik | Direkt iakttaget | Viktig lucka |
|---|---|---|---|
| Wordless | Gissa hemligt ord och använd färgade bokstavsrutor som återkoppling | Egen rutt; sajtens hjälptext; Hard Mode och Custom i index; ändringsloggen beskriver regler för egna spel | Dagligt bräde, standardantal försök, exakt resultatflöde kunde inte laddas |
| Songless | Identifiera låt från mycket kort ljudklipp | All, Rock, Hip Hop; 0,1 s initialt; spela, låtsökning och Skip; fem visuella svarsrader | Exakta klipplängder efter varje steg, svarsmatchning och slutresultat |
| Spelling Bee | Lyssna och stava fem ord | Fem rundknappar, ljudknapp, Definition, Sentence, skärmtangentbord, Enter och backspace; tips döljer målordet | Antal försök per ord, poäng och resultat efter lyckat svar |
| More/less | Välj vilket av två objekt som har högre värde i en kategori | Två stora bildkort, OR, kategori Google Searches; ikoner för fler kategorier | Exakt serie-, liv- och poänglogik; val gav fel i testet |
| Clueless | Gissa ord efter betydelse; lägre tal betyder närmare målordet | Regler i egen ändringslogg och indexerad hjälptext | Faktisk brädvy, ordvalidering, talintervall, maxförsök och resultat |

Det finns ingen verifierad samtidig multiplayer, lobby eller room code. Custom Wordless är en asynkron social funktion: sajten beskriver möjligheten att skapa egna ordutmaningar för vänner. Hur länk, kod, mottagare och resultatdelning fungerar bakom inloggning är inte verifierat. Undvik att beskriva det som realtidsspel.

### 3. Flöde och gemensam UX

På startsidan väljer spelaren ett spelkort. Spelrutterna är /wordless, /songless, /spellingbee, /moreless, /clueless. ??? har ingen verklig speldestination i den observerade navigeringen.

Vid första besöket i flera spel visas How to Play som dialog med en kort regel, illustrerad demo och länk till inloggning. Frågetecknet i sidhuvudet öppnar hjälpen igen. Det gick inte att bekräfta när introduktionen återkommer efter omladdning.

Sidhuvudet har meny till vänster; spelrubrik i mitten; hjälp, kalender/arkiv, inställningar och Sign In till höger. Startsidan saknar hjälpknappen. En inloggningsruta erbjuder Sign in with Google, lyfter synkronisering mellan enheter och egna Wordless-utmaningar. Ingen annan inloggningsmetod observerades.

Sidomenyn visar spelgenvägar, månadens aktivitet i kalender, nedräkning till nästa dag, uppmaning att hålla streak vid liv, feedback, externa sociala länkar, Om oss, ändringslogg, villkor och integritetspolicy. Spelens status markeras i menyn enligt ändringsloggen.

Inställningar: Music (av i den testade sessionen), Sound Effects (på), volymreglage (70 % visades), Dark Theme (på), Colorblind Mode och Reduced Motion med systemval. Det är kontroller i gränssnittet; jag har inte verifierat lagring eller effekten av varje toggle.

Arkivet har spelväljare, Played, Win Rate, månadskalender, antal slutförda dagar och förklaring för spelad/påbörjad/arkiv. Ändringsloggen säger att arkivspel är en Plus-funktion, även om kalendern visas utan inloggning. En klickad äldre dag öppnade inte ett spel i vår session. Sajtens ändringslogg säger att spelarframsteg kan återupptas i nästan alla spel.

UX-observation: gränssnittet är mörkt, centrerat och mycket avskalat, med stora klickytor, högt typografiskt fokus, diskret inramade svarsfält och gröna ljudknappar. Fel vid nätverksanrop visas som toast med generiskt felmeddelande. Songless visar en rotationsuppmaning om skärmen inte rymmer layouten, vilket framgår av sidans innehåll; exakt brytpunkt och faktiskt mobilbeteende testades inte. Ändringsloggen säger att animationer respekterar inställningen för reducerad rörelse och att Songless spelar ljud på iOS även i tyst läge.

### 4. Spel för spel

#### 4.1 Wordless

Bekräftad idé: skriv ett ord; bokstavsrutorna visar hur nära det är det hemliga ordet. Sajten har dagligt spel, Hard Mode och möjlighet till egna utmaningar. Hard Mode kräver enligt ändringsloggen att nya gissningar använder information om bokstäver som hittats tidigare. För egna spel nämns max åtta gissningar, blind mode med två gråtoner, möjligheten att stänga av ordbokskontroll samt inställningar för timer, antal gissningar och flera ord samtidigt. Indexet visar också en 3-kontroll men dess innebörd kunde inte fastställas.

Steg som kan härledas från sajtens hjälp: öppna dagens ord → ange en gissning → få rutfeedback → använd informationen i nästa gissning → lös ordet eller nå försöksgränsen. Standardantalet försök, färgsemantiken vid dubletter, ordlängderna, hur en ogiltig gissning behandlas och slutskärmen är ej verifierade här.

Svensk version – rekommendation: kuratera svar och separat acceptansordlista; stöd Å, Ä, Ö på fysiskt tangentbord och skärmtangentbord; normalisera Unicode konsekvent men behandla A/Å/Ä och O/Ö som skilda bokstäver; använd tvåpassalgoritm för dubletter (exakt position först, därefter kvarvarande bokstäver); validera hårt läge på servern och ge begriplig återkoppling. Börja med ett dagligt ord och sex försök som ett eget produktbeslut, inte som ett verifierat Lessgames-värde. Bygg inga egna ord eller blindläge förrän basmekaniken fungerar.

#### 4.2 Songless

Observerat flöde: välj All, Rock eller Hip Hop → spela ett ljudklipp på 0,1 sekunder → sök efter en låt eller tryck Skip → sajtens hjälp säger att fel svar låser upp längre utdrag. Fem tomma, visuella rader syntes i spelvyn. Ett staplat längdreglage visar upplåst ljud; startmarkören pekade på 0,1 s. En äldre ändringslogg nämner kuraterad sökmotor utan dubbletter och möjlighet att lyssna på hela låten via embed efter spel. Jag kunde inte verifiera resultatet eftersom skip gav fel och sökningen inte gav förslag i sessionen.

Databehov för svensk motsvarighet: track_id, titel, artist, accepterade titel- och artistalias, genre/epok, ljudfil eller uttryckligen tillåten ljudkälla, reproducerbar startpunkt, klipplängder, ljudnivå, rättigheter/territorium/tidsperiod, valfri bild och officiell lyssningslänk. Kuratera svenska artister och låtar som svenska spelare faktiskt kan känna igen, med blandning av decennier och genrer. Stöd stavningsvarianter, featuring, skiljetecken, diakritik och vanliga korttitlar utan att flera olika låtar blandas ihop.

Avgörande genomförandefråga: använd inte Spotifys API eller previewklipp som genväg för musikquiz. Spotifys utvecklarpolicy förbjuder spel, inklusive triviaquiz, byggda på deras plattform. Stims vägledning gäller rättigheter för musik online och IFPI beskriver rättigheter till inspelningar; rätt upplägg för de faktiska låtarna och inspelningarna måste klaras ut innan denna funktion lanseras. Ett alternativ under prototypfas är egen/licensierad musik eller ett icke-ljudbaserat musikspel.

#### 4.3 Spelling Bee

Observerat flöde: fem numrerade rundor visas; tryck ljudknapp för uttal → skriv ord via skärmtangentbord eller fysisk inmatning → använd Definition eller Sentence om du vill ha kontext → tryck Enter. Definition och exempelmening maskerar själva svarsordet. I testet gav definitionen för första ordet en beskrivning av hjärnan och meningen hade en lucka; brain skrevs in och Enter visade Checking your spelling..., men serveranropet misslyckades. Det gick inte att hoppa till runda 2 genom att klicka på dess siffra innan runda 1 var klar. Ändringsloggen anger fem handplockade ord per dag som blir svårare.

Svensk version – rekommendation: använd svenskt mänskligt inspelat tal eller kvalitetssäkrad svensk TTS; lagra uttalsvariant, ordklass, definition, mening med maskerat svar, svårighetsgrad och alternativa godkända böjningar. Bestäm uttryckligen om sammansatta ord, bindestreck, stavningsreform, talspråk och ord med Å/Ä/Ö accepteras. Låt spelaren spela upp ordet igen. Ge synlig laddning och tydligt återförsök om svarskontrollen misslyckas, utan att dra ett försök.

#### 4.4 More/less

Observerat flöde: rubrik för mått (Google Searches i testet), två stora bildkort med namn och OR mellan; spelaren väljer vilket objekt som har högre värde. Ett tredje objekt fanns redan i sidans bildinnehåll, vilket tyder på förladdning av nästa jämförelse. Överst finns flera kategoriikoner. Ändringsloggen nämner uttryckligen Google Searches, Spotify Streams och Movie Ratings som kategorier som uppdateras automatiskt; övriga ikoner och deras exakta etiketter är inte verifierade. När jag valde ett kort visades fel, så kedjans längd, poäng, facit och liv kan inte slås fast.

Svensk version – rekommendation: kategorier med pålitliga och daterade jämförelsetal: svenska artister, filmer, svenska städer, sport, geografi och offentlig statistik. Varje värde behöver metric, unit, source, as_of, method, confidence och licens. Visa källans datum och hantera lika värden. Undvik ett mått som antyder jämförbara absoluta sökvolymer om källan bara ger ett relativt index. Definiera själv om produkten använder streak tills fel svar eller ett bestämt antal frågor; referensens regel är inte verifierad.

#### 4.5 Clueless

Bekräftad idé: gissa ett hemligt dagligt ord med hjälp av semantisk likhet. Varje gissning får ett tal; lägre tal betyder att ordet ligger närmare målordet i betydelse. Sajtens hjälpsida säger att talet visar avståndet. Startsiffror, gräns för gissningar, ordmodell, jämförelsekorpus, dubblettbeteende och facit kunde inte testas.

Svensk version – rekommendation: börja med en versionerad svensk ordlista och en mätmetod vars rangordning är stabil för alla spelare samma dag. Förberäkna rang/likhet per dagsord för snabb feedback. Testa manuellt att svenska böjningar, sammansättningar och flertydiga ord ger begriplig riktning. Förklara att talet är rang eller avstånd enligt spelets modell, inte en objektiv språklig sanning. Lägg till tydlig återkoppling för ord utanför lexikonet och tidigare gissningar.

### 5. Innehåll, variation och progression

Publicering: samma dagsutmaning för alla spelare rekommenderas som utgångspunkt; använd serverns kalender i tidszonen Europe/Stockholm, versionssätt pussel och lagra publiceringsdatum. Exakt återställningstid på Lessgames är inte verifierad, även om sidomenyn visar nedräkning.

Kurering: separera content item, daily puzzle, gameplay session och guess/event. Framtida schemaläggning ska varna för upprepade svar, närliggande ämnen och för stora svårighetshopp.

Svårighetsgrad: fem stigande stavningsrundor är bekräftade. Wordless Hard Mode är bekräftat. För övriga spel saknas underlag för dynamisk svårighetsanpassning. Välj svensk svårighet redaktionellt och spåra hur ofta pussel klaras.

Återspelbarhet: dagligt innehåll, genre- eller ämnesval, arkiv och egna utmaningar ger variation. Historiska dagar är en Plus-funktion på referenssajten. Den svenska versionen bör besluta separat om äldre dagar ska vara gratis, betalda eller enbart tillgängliga efter dagens spel.

Konton och statistik: gästspel är möjligt i observerade spelvyer; Google-inloggning erbjuds för synkronisering och egna Wordless-utmaningar. Arkivet visar spelat och vinstprocent, sidomenyn streak/aktivitet. Jag såg ingen bekräftad achievement-lista, vänlista, leaderboard eller synkron multiplayer.

Delning: en egen utmaning för vänner nämns, men exakt delningslänk och resultatkort kunde inte inspekteras. Bygg vid behov ett separat, anonymt delningskort utan svarsspoiler och en signerad länk för användarskapat pussel.

Affär: gratis dagliga spel; annonser plus valfri Plus-prenumeration. Enligt ändringsloggen tar Plus bort annonser, ger arkiv och tidig åtkomst till kommande funktioner/spel. Mapless testades i september 2026 som begränsad Plus-funktion och visas inte som ett av de fem allmänt tillgängliga spelen på startsidan. Pris och aktuella betalvillkor har inte verifierats.

### 6. Teknikspår – observerat kontra slutsats

| Signal | Vad den stöder | Vad den inte bevisar |
|---|---|---|
| URL med /_next/static/chunks och app/... | Frontend är byggd med Next.js App Router | Ingen säker slutsats om databas, hosting eller backendramverk |
| chakra-*-klasser i renderad DOM | Chakra UI används för gränssnittskomponenter | Inte vilka egna designbibliotek som också finns |
| Bilder från cdn.lessgames.com | Separat mediavärd/CDN; ändringsloggen säger global CDN för låtar och foton | Inte leverantör eller licens för varje bild/ljudklipp |
| js.stripe.com laddas på spelsida | Stripe-kod finns i klienten | Inte aktuella priser eller att ett köp gjorts |
| Skript från Cloudflare Insights, stats.less.gg, Google Tag Manager/Analytics | Flera analys-/mätspår är inladdade | Inte samtyckesstatus, exakta events eller faktisk databehandling |
| Sajtens ändringslogg | Egen backend för spelrundor/statistik och Google-kontoinloggning nämns | Inte serverns API-kontrakt eller implementation |

Rekommenderad egen arkitektur: responsiv Next.js-app eller motsvarande; serverägda dagliga pussel och svar; databas för innehåll, schema, sessionsresultat och användarprofiler; objektlagring för egna/licensierade medier; redaktionellt adminflöde; fristående spelmotorer per spel. Lagra aldrig framtida facit öppet i klientens payload. Använd idempotenta svarsanrop så dubbeltryck och återförsök inte räknas två gånger. Håll användarnas gästframsteg lokalt med möjlighet att föra över dem till konto. Servern avgör slutresultat och statistiken bygger på avslutade sessioner.

Föreslagen datamodell:

```ts
type GameId = 'ordgissning' | 'latgissning' | 'stavning' | 'mer_eller_mindre' | 'ordnara';
type Puzzle = {
  id: string; game: GameId; date: string; timezone: 'Europe/Stockholm';
  category?: string; difficulty?: number; contentVersion: number;
  publicPayload: unknown; privateAnswerRef: string; status: 'draft'|'scheduled'|'live'|'retired';
};
type Session = {
  id: string; puzzleId: string; userId?: string; guestId?: string;
  state: 'new'|'active'|'won'|'lost'|'abandoned';
  startedAt: string; finishedAt?: string; attempts: number; score?: number;
};
type Event = { id: string; sessionId: string; sequence: number; kind: string; payload: unknown; at: string };
type Source = { id: string; url?: string; publisher: string; asOf?: string; license?: string; rights?: string };
```

Spelspecifika fält: ordgissning answer, acceptedGuesses, length, maxGuesses; låt track, aliases, audioAsset, offset, unlockDurations, rights; stavning words[5], pronunciation, definition, sentence, acceptedForms; mer/mindre items, metric, value, unit, source, asOf, tiePolicy; ordnärhet target, vocabularyVersion, similarityModelVersion, precomputedRanks. Privata svar skickas först vid verifierat avslut.

### 7. Byggordning för Claude Code

Produktgrund: skapa en svensk startsida med fem tydligt namngivna spel, egen design, hjälp, gemensam navigering, mobil och desktop, inställningar, svensk tidszon och gästframsteg. Gör en liten redaktionell adminyta och lägg in testpussel.

Första spelbara version: bygg ordgissning, stavning med rättighetsfri svensk ljudkälla, mer/mindre med spårbara svenska data och ordnärhet med versionerad modell. Varje spel ska ha regler, pågående läge, inmatning, validering, fel, vinst/förlust, resultat och möjlighet att återuppta.

Musikspel: lägg in ljudgissning först när klipp, inspelning, omslagsbild och övriga relevanta rättigheter är klarlagda; annars använd ett ljudfritt prototypinnehåll som inte låtsas vara licensierade hitlåtar.

Konto och socialt: frivillig inloggning, synkronisering, statistik, kalender/arkiv, delbara resultat och egna pussel. Lägg en verklig lobby och room codes endast om du avsiktligt vill tillföra synkron multiplayer; det är inte belagt som del av referensens basprodukt.

Affär: mät faktisk användning först. Utvärdera annonser och valfri prenumeration med tydliga gränser för gratis innehåll, integritet och licenskostnad.

Minsta godkännandekriterier:

- Alla fem kort öppnar rätt spel, och tillbaka/uppdatera fungerar utan att pågående spel förloras.
- Dagsbyte vid svensk midnatt är identiskt mellan enheter; servern ger inte framtida facit före publicering.
- Ogiltiga svar och tillfälligt nätfel förbrukar inte försök. Dubbelklick räknas som en handling.
- Wordless hanterar dubletter och Å/Ä/Ö; stavning hanterar svenska sammansättningar och text/tal; låtsökning hanterar alias utan dubbletter.
- Ljud fungerar efter användarens start på iOS/Android; mute, volym och reducerad rörelse respekteras. Spelet går att använda med tangentbord och skärmläsare.
- En mycket smal skärm får en användbar mobilvy eller en tydlig rotationsuppmaning; inga kontroller hamnar utanför skärmen.
- Resultat visar rätt svar, gissningar/antal försök och länk tillbaka; delning döljer svaret innan mottagaren spelat.
- Konto synkroniserar mellan enheter utan att radera gästens påbörjade spel.

### 8. Edge cases och obesvarade frågor

Att planera för: förlorad uppkoppling mitt i svar; ljudfil saknas eller blockeras; iOS-autoplay; sökresultat med två låtar med samma titel; ogiltigt svenskt ord och böjd form; å/ä/ö på tangentbord som saknar svensk layout; ord med dubbletter; lika jämförelsevärden och inaktuella API-värden; kalender över sommartidsbyte; spel startat före midnatt och skickat efter; två flikar öppna; utloggning under spel; arkivdag utan publicerat innehåll; bild med saknad alternativtext; kategori med för få godkända frågor; egna pussel med stötande text eller spoiler i länken; återförsök efter serverfel.

Fortfarande okänt om Lessgames: exakta timers, lives och scoring i alla spel; Wordless ordlängder/standardförsök; alla More/less-kategorier och kedjeregel; Songless klipplängder efter 0,1 s, maximalt antal gissningar och ljudleverantör; Spelling Bee antal fel per ord; Clueless rangberäkning och antal gissningar; kontots alla vyer; konkreta Plus-priser; resultatdelning; färgkodning och animationsdetaljer på slutskärmar; brytpunkter för mobil. Föreslagna värden ovan är därför egna produktbeslut och ska inte

*[Texten slutar här i den inklistrade versionen.]*
