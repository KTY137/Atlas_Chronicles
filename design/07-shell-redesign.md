# 07 — Shell-Redesign: Band, Bühne, Instrument

Status: **ratifizierte Designrichtung + laufender Prototyp**, 2026-09-06.
Auftrag (Kaya): Die GUI ist überladen. Chronicle soll die Mischung aus World Anvil, Roll20,
The Forge und Discord werden — inklusive der dafür nötigen Netzinfrastruktur. „Designe was
richtig geiles."

Entschieden in dieser Session (Kaya, 2026-09-06):

1. **Voice/Video nativ mit eigenem SFU.** Das Nicht-Ziel aus
   `06-giga-product-architecture.md` §21.4 (Z. 3241: „eingebautes Voice/Video und eigener
   SFU-Betrieb" → extern) ist **bewusst gekippt**. Diese Datei ist die Ratifikationsnotiz.
2. **Lieferobjekt: klickbarer React-Prototyp + diese Spec** (`design/shell-lab/`).
3. **Look neu forgen, mehrere Kandidaten**, Entscheidung am laufenden Prototyp.
4. **Shell-Ansatz C: Band, Bühne, Instrument** (gegen „Dock" und „nur Bühne").

## 1. Diagnose: Woran Round 5 visuell gestorben ist

Nicht an Dekoration — an **Gleichzeitigkeit**. Jedes der vier Vorbilder bringt eine permanente
Fläche mit: World Anvil den Artikelbaum, Roll20 die Werkzeugpalette plus Chatstreifen, Discord
Kanal- *und* Mitgliederliste, The Forge das Betriebs-Dashboard. Wer alle addiert, hat fünf Rails
und keine Bühne (`screenshots/round-05/spike-A1.png`: vier Spalten, drei Toolbars, jede Fläche
voll). Kein Farbschema rettet das; die Regel muss strukturell sein.

## 2. Die Regel (das Anti-Überladungs-Gate)

> Gleichzeitig sichtbar sind höchstens: **ein Rail · eine Bühne · ein Instrument · das Band.**

- **Rail** — ikonisch, expandiert nur auf Wunsch; nie zwei Rails.
- **Bühne** — genau ein dominantes Objekt (Karte, Artikel, Kanal, Bogen, Schmiede-Canvas,
  Netz-Ansicht).
- **Instrument** — höchstens eines offen (Context Lens *oder* ein Werkzeugpanel).
- **Band** — Anwesenheit; dauerhaft, dünn, wächst nie.

Das Gate ist im Prototyp als Laufzeitprüfung eingebaut: gezählt werden DOM-Elemente mit `data-instrument` (Lens, Werkzeugpanels); reine Anzeigen wie Szenentitel oder Initiativleiste sind Bühneninhalt, keine Instrumente. Öffnet sich die Lens auf dem Tisch, klappt das Werkzeugpanel auf einen Griff zusammen — das Gate wird gelebt, nicht nur gemessen. Ein Screen, der es verletzt, ist ein
Bug, keine Geschmacksfrage. Damit ist „darf das noch eine Spalte haben?" dauerhaft beantwortet.

Zuordnung der Vorbilder: World Anvils Tiefe → Rail + Bühne. Roll20s Tisch → Bühne. Forges
Betrieb → eigenes Bühnenobjekt **Netz**. Discord → **aufgespalten** in Band (Anwesenheit) und
Bühne (Kanal).

## 3. Der Bruch: Der Kanal ist ein Bühnenobjekt

Discords Job zerfällt in zwei Hälften mit gegensätzlichen Bedürfnissen:

- **Anwesenheit** („wer ist da, wer spricht") ist ambient und darf nie Platz kosten → das Band.
- **Kommunikation** („diesen Kanal lesen, 40 Nachrichten aufholen") braucht Breite und ist zu
  ihrer Stunde die Hauptaufgabe → die Bühne.

Roll20 gibt Chat einen Streifen, Discord gibt ihm die ganze App — beide falsch, weil dieselbe
Fläche zu verschiedenen Stunden verschiedene Jobs hat. Bei uns: zwischen den Abenden ist der
Kanal die Bühne in voller Breite (Threads, Würfelkarten, geprägter Kanon als Rückstand); am
Tisch fällt er ins Band zurück.

Der Kanal ist zugleich die Heimat der **Async-Woche** des Champions („Die Woche",
`iterations/CHAMPION.md`): die Vollmacht wird im Kanal ausgestellt, der Dienstagswurf ist eine
Würfelkarte im Strom, der geprägte Kanon ist ein Residuum mit Wochentagsstempel. Discord-Layer
und Champion-These tragen einander.

## 4. Der Flüsterkanal — der Griff, den Discord nicht bauen kann

Audio erhält dieselbe Projektion, die der Champion für Wissen hat: `Sicht` entscheidet, wer was
*weiß*; derselbe Server entscheidet, wer was *hört*. Der SFU vergibt Track-Abonnements pro
Identität aus `CampaignMembership`. Die Spielleitung nimmt einen Spieler beiseite, der Tisch
läuft weiter; die anderen sehen ehrlich, *dass* zwei beiseite sind, hören aber nichts. Discord
kann das strukturell nicht, weil es die Kampagnenrollen nicht kennt. Für uns ist es dieselbe
Berechtigungskante, die schon existiert — Audio ist nur eine weitere Sache, die der Server pro
Identität projiziert.

Ehrlichkeitsregeln: Ein Flüsterkanal ist im Band **sichtbar als Zustand** (nie heimlich); wer
nicht teilnimmt, sieht die Beiseitenahme ohne Inhalt. Aufzeichnung existiert nicht.

## 5. Netzarchitektur: drei getrennte Ebenen

| Ebene | Technik | Regel |
|---|---|---|
| **Befehlsbus** | WebSocket, `seq`/resume, autoritativ (Command statt State-Patch, §16 Doc 06) | Der Spielzustand. Hält, wenn alles andere fällt. |
| **Medienebene** | **LiveKit** (Apache-2.0, selbst-hostbar), coturn für STUN/TURN | Voice/Video. Zugangstoken pro Identität, Grants aus `CampaignMembership`; Räume ↔ `GameSession`. |
| **Präsenz** | leichter Kanal auf dem Befehlsbus | Speist das Band. Läuft nie über die Medienebene. |

**Die Trennung ist der Punkt: ein Voice-Ausfall hält den Tisch nie an.**

Degradationsleiter, sichtbar und benannt (nie stilles Downgrade):

```text
SFU (Region) → TURN-Relay → P2P-Mesh (≤4) → „Sprache liegt — der Tisch läuft"
```

Entscheidungsbegründung LiveKit statt mediasoup von Hand: Selbst-Hostbarkeits-Invariante aus
`00-intake.md` bleibt heil (ein Container neben dem App-Server), ausgereifte Web-SDKs, Apache-2;
wir kaufen Verhalten und besitzen Optik — die Linie aus `05-visual-reset.md`. Selektives
Subscribe (Flüsterkanal) ist dort Kernfunktion, nicht Bastelei. Betriebskosten (Egress/Minuten)
sind der Preis der Umkehrung des Nicht-Ziels und gehören in die S4-Budgetentscheidung
(`iterations/OPEN-DECISIONS.md`).

Selbsthost-Topologie: App-Server + Postgres + LiveKit + coturn als Compose-Verbund; der
gehostete Betrieb nutzt dieselben Images mit Regionen. Kein zweiter Codepfad.

## 6. Die Shell

```text
┌─ Kontextzeile: Scope-Breadcrumb · Suche/⌘K · Rolle/View-as · Sync ─────────┐
├──┬──────────────────────────────────────────────────────────┬──────────────┤
│R │                                                          │              │
│a │                     B Ü H N E                            │  INSTRUMENT  │
│i │    Heute · Welt · Tisch · Kanal · Schmiede · Netz        │   (max. 1)   │
│l │              genau ein dominantes Objekt                 │              │
├──┴──────────────────────────────────────────────────────────┴──────────────┤
│ DAS BAND — Anwesenheit · Sprechringe · Mikro · Flüsterkanal · Verbindung   │
└────────────────────────────────────────────────────────────────────────────┘
```

- **Rail-Einträge:** Heute (Home/Router, oben abgesetzt) · Welt · Tisch · Kanäle ·
  Schmiede (Creator-Wechsel, abgesetzt) · Netz (Betrieb, unten; GM/Betreiber).
  Rollenprojektion serverseitig: Spieler sehen Schmiede/Netz gar nicht.
- **Lens:** unverändert der universelle Vertrag aus Doc 06 §6.2 (Tabs nur wo zutreffend,
  leere Tabs verboten).
- **Band-Inhalt:** Avatare mit Sprechringen, Mikro/Taub, Verbindungsqualität, Beitreten,
  Flüsterkanal-Kapsel, im Spiel zusätzlich kompakter Kanal-Rückfall (letzte Zeile + Öffnen).
- Alles andere aus Doc 06 (Scope×Workspace×Objekt×Rezept, Command Palette, URL-Modell,
  Rollenprojektion) bleibt in Kraft; diese Spec ersetzt nur §6.1-Frame und §21.4-Voice-Zeile.

## 7. Drei Look-Kandidaten (Entscheidung am laufenden Prototyp)

Nicht drei Farbschemata — drei Behauptungen darüber, was das Produkt ist. Live umschaltbar
(`?look=`), gleiche Semantik, gleiche Layouts.

| | **Obsidian** | **Vellum** | **Aurora** |
|---|---|---|---|
| These | Präzisionsinstrument | Foliant/Atlas — Stunden am Text | modernes Spielgerät, energetisch |
| Grund | Basalt `#0A0C0D` | Knochen `#F2EDE2`, Papierkorn | Indigo `#0D1120`, Aurora-Licht |
| Akzent | genau einer: Glut `#D98E3B` | Ochsenblut `#6E2430` + Grünspan `#3E6B5C` | Teal `#6FE3C4` · Violett `#8B7BF7` · Magenta `#F272B6` |
| Display | Cinzel (graviert) | Fraunces | Space Grotesk |
| Fließtext | IBM Plex Sans | Source Serif 4 | Manrope |
| Daten | IBM Plex Mono | IBM Plex Mono | IBM Plex Mono |
| Material | Haarlinien, kaum Glas, r=6 | Doppel-Haarlinien, Stich, r=2 | Glasinstrumente, Blur, r=14 |

Vellum ist der ehrlich andere Kandidat: Worldbuilding ist Lesen und Schreiben über Stunden, und
Dunkel ist dafür nicht automatisch richtig.

**Signatur-Element** (bewusst genau eines): **das Band** — Sprechringe, die mit der Stimme
atmen, und die Flüsterkanal-Choreografie (zwei Avatare gleiten in eine private Kapsel; für
Dritte mattiert). Alles andere bleibt diszipliniert.

## 8. Prototyp `design/shell-lab/`

React 19 + TypeScript + Vite, echte Eron-Assets (`fixtures/eron/`), CC-BY-SA-Attribution auf
den Prosa-Flächen. `visual-lab/` bleibt unangetastet als Lineage.

Enthalten: sechs Bühnenobjekte (Heute · Welt · Tisch · Kanal · Schmiede · Netz), Band mit
simulierten Sprechringen + Flüsterkanal, Lens als einziges Instrument, drei Looks, GM/Spieler,
reduzierte Bewegung, Schmalzustand (~390 px), Gate-Prüfung als Laufzeit-Badge.

**Ehrliche Grenzen:** Voice ist **simuliert** (Zustände, Ringe, Kapsel-Choreografie — kein
WebRTC); Karte ist DOM-Bild, nicht Pixi/`MapRenderer` (Schuld aus STATUS unverändert offen);
keine Persistenz, keine echten Rechte — Rollenprojektion ist im Lab clientseitig und wäre in
Produktion serverseitig.

## 9. Craft-Gates (Abnahme am Bildschirm, nicht am Text)

1. Fünf-Sekunden-Test: Bühne dominiert, nicht die Navigation.
2. Das Gate aus §2 wird auf keinem Screen verletzt.
3. Der Kanal liest sich in voller Breite besser als Discord bei 40 Nachrichten Rückstand.
4. Die Flüsterkanal-Choreografie ist in beiden Rollenprojektionen verständlich, ohne Legende.
5. Ein Screenshot pro Look, den man teilen möchte.
6. Reduzierte Bewegung erhält jede Zustandsänderung ohne Spektakel.
7. Schmalzustand ist komponiert, nicht gequetscht.
8. Voice-Ausfall ist ein benannter, sichtbarer Zustand — der Tisch läuft erkennbar weiter.

## 10. Folgeentscheidungen (offen, nicht still)

- **S4-Erweiterung:** SFU-Betriebskosten (Egress/Minuten) in die Hosted-Rooms-Budgetentscheidung.
- **Kanal-Datenmodell:** Nachricht/Thread/Würfelkarte/Residuum als Objekte im gemeinsamen
  Graph (§7 Doc 06) — Facette, nicht Parallelwelt. Entwurf nach Look-Entscheid.
- **Moderation/Privatsphäre:** Rollen, Bans, Rate-Limits für 40-Personen-Server (Round-3-Attack
  bleibt gültig); Flüsterkanal-Ehrlichkeitsregeln aus §4 sind bindend.
- **Look-Entscheid** durch Kaya am Prototyp; danach Token-Extraktion in die Registry als
  visueller Boden der Produktrunden (Sequenz aus `05-visual-reset.md` §Sequence gilt).

## 11. Import und Weiterschreiben — die Welt kommt herein und bleibt lebendig

Nachtrag 2026-09-06, ausgelöst durch Kayas Fragen am laufenden Prototyp
(„wieso ist nicht das ganze Wiki importiert", „kann ich einfach den Link zu
meinem Fandom-Wiki reinpacken", „können wir unser Wiki auf Chronicle
erweitern").

### 11.1 Der Korpus ist jetzt vollständig importiert

`design/shell-lab/scripts/import-wiki.mjs` überführt den Fixture-Auszug in
strukturierte Objekte. Gemessen, nicht geschätzt:

| | |
|---|---|
| Artikel | 74 |
| Wörter | 35.830 |
| Abschnitte | 429 |
| Backlinks (aus echtem Linkgraph) | 556 |
| Rote Links (verlinkt, nicht geschrieben) | 690 |
| Infoboxen → Registerfelder | 44 Artikel |

Der Parser übersetzt Wikitext in **Daten, nicht in HTML**: Infobox-Parameter
werden zu Registerfeldern, `[[Links]]` zu Kanten im Graph, Überschriften zu
Abschnitten. Damit ist ein importierter Artikel dasselbe Objekt wie ein in
Chronicle geschriebener — kein Zweitformat, keine Einbahnstraße.

**Bewusst verworfen:** Dateiverweise im Fließtext taugen nicht als Artikelbild
(sie gehören oft zu einer anderen Person im selben Text — Olav trug im ersten
Lauf Shromus' Portrait). Nur Infobox-`Bild` und Titeltreffer gelten. Lieber
kein Bild als ein falsches.

### 11.2 Navigation ohne zweite Spalte

74 Artikel brauchen Navigation, das Gate (§2) verbietet aber einen zweiten
Rail. Antwort: **die Omnibox (⌘K)** aus Doc 06 §6.4, plus die Links im Text
selbst und die Backlinks am Fuß. Ein transienter Overlay ist **kein
Instrument** im Sinne des Gates — er schließt sich mit dem ersten Befehl.
Das ist die einzige zulässige Art, Tiefe zu erschließen, ohne Fläche zu
verbrauchen.

### 11.3 Fandom-Link einfügen → Import. Verifiziert, nicht behauptet.

Fandom läuft auf MediaWiki mit offener API. Gegen `eron.fandom.com` gemessen
(2026-09-06):

```
GET /de/api.php?action=query&generator=allpages&prop=revisions
    &rvprop=content&rvslots=main&format=json&origin=*
→ HTTP 200 · Access-Control-Allow-Origin: *
→ 74 Artikel · 316 Seiten · 38 Bilder · 1153 Edits · Paginierung via continue
```

`origin=*` heißt: Der Import läuft **direkt aus dem Browser**, ohne Proxy. Der
Nutzer fügt die Wiki-URL ein, Chronicle liest Titel, Wikitext, Revisionen,
Links und Medienliste und legt daraus Objekte an.

Was dabei **ehrlich benannt werden muss**, sonst ist der Import eine Falle:

- **Lizenz.** Fandom-Text ist CC BY-SA 3.0. Jeder importierte Artikel trägt
  Quelle, Autor, Revisions-ID und Lizenz im Herkunft-Tab; abgeleitete Fassungen
  bleiben share-alike. Kein stiller Rechteübergang.
- **Bilder ≠ Text.** Uploads in einem Fandom-Wiki tragen häufig fremde Rechte
  (`STATUS.md` sagt das bereits). Bilder werden einzeln bestätigt, nicht
  pauschal gezogen.
- **Templates werden nicht ausgeführt.** Wir importieren die Parameter, nicht
  die Vorlagenlogik. Das ist kein Verlust, sondern der Gewinn: aus Textbausteinen
  werden typisierte Felder.
- **Einwegimport.** Chronicle liest Fandom, schreibt aber nicht zurück. Ein
  Re-Sync holt Änderungen nach und zeigt Konflikte, statt sie zu überschreiben.

Derselbe Pfad trägt jedes MediaWiki (Wikipedia, eigene Instanz). World Anvil
und Notion brauchen eigene Adapter — gleiche Zielobjekte, anderer Reader.

### 11.4 Und dann schreibt ihr darin weiter

Das ist der eigentliche Punkt: Der Import ist ein **Anfangszustand**, kein
Archiv. Nach dem Import ist Chronicle das Wiki.

- Artikel sind bearbeitbare Objekte; Rechte laufen über `Sicht`, nicht über
  Wiki-Konventionen.
- **Rote Links sind Keime.** 690 davon stehen schon im Korpus. Ein Klick legt
  den Artikel an, an genau der Stelle, wo er gebraucht wurde.
- **Der Tisch schreibt mit.** Das ist die Champion-These („Die Woche"): Ein
  Wurf am Dienstag prägt einen Absatz, der Absatz steht in der Enzyklopädie,
  mit Herkunft auf Vollmacht und Wurf. Kein Wiki der Welt tut das, weil kein
  Wiki weiß, dass gespielt wurde.

Das ist die Trennlinie zu World Anvil: Dort ist das Wiki ein Werk, das man
pflegt. Hier ist es der **Rückstand des Spielens** — und der Import sorgt nur
dafür, dass ihr nicht bei null anfangt.
