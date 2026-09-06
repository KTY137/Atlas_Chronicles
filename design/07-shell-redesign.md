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

### 11.5 Schreiben ist gebaut, nicht skizziert

Nachtrag 2026-09-06 (Kaya: „ich will dass das wiki voll funktionsfähig ist").

Der Parser wanderte aus dem Import-Skript in den Browser (`src/wikitext.ts`).
Das ist die tragende Entscheidung: **ein Parser für Import und Bearbeitung**.
Wer einen Artikel ändert, ändert Wikitext, und dieselbe Funktion strukturiert
ihn sofort neu — es gibt keinen Serialisierungs-Rückweg, der auseinanderlaufen
könnte. Das Import-Skript liefert nur noch Rohtext plus Herkunft.

Gebaut und im echten Browser nachgewiesen (`scripts/e2e-wiki.mjs`, 17/17 grün):

- **Bearbeiten** jedes Artikels im Wikitext-Editor, mit sofortiger
  Neustrukturierung.
- **Anlegen** aus jedem roten Link; der Keim wird zum Artikel, und der rote Link
  färbt sich überall grün, wo er vorkam.
- **Backlinks entstehen sofort** — ein neuer `[[Verweis]]` erzeugt die Rückkante
  im selben Moment.
- **Persistenz** über das Neuladen; Änderungen sind als solche markiert und mit
  „Import wiederherstellen" einzeln zurücknehmbar.
- **Verzeichnis** (`?welt=index`) nach Objektart, plus „am meisten vermisst" —
  die roten Links nach Häufigkeit, also die Liste dessen, was die Welt braucht.
- **Suche** (⌘K) über Titel und Volltext, inklusive neu angelegter Artikel.

Zwei Fehler, die erst der Funktionstest sichtbar machte und die beide behoben
sind:

1. **Stiller Rückfall.** `?artikel=<unbekannt>` sprang wortlos auf den
   Standardartikel. Ein Keim ist ein gültiger Zustand und muss deep-linkbar
   bleiben — genau die Art verstecktes Downgrade, die CLAUDE.md §1 verbietet.
2. **Veraltete Bühne.** Die Bühne hing in einem `useMemo`, dessen
   Abhängigkeiten den Änderungszähler nicht enthielten. Nach dem Speichern
   zeigte der Prototyp weiter den alten Zustand, obwohl korrekt gespeichert
   worden war. Im Screenshot unsichtbar — nur im Ablauf zu finden.

Im Lab liegt der Schreibspeicher in `localStorage`; im Produkt liegt er auf dem
Server hinter `Sicht`. Die Grenze ist bewusst gezogen und benannt.

### 11.6 Der Live-Import ist gebaut — Adresse einfügen genügt

Nachtrag 2026-09-06. §11.3 hatte den Mechanismus nur *belegt*; jetzt existiert
die Oberfläche (`?stage=welt&welt=import`, erreichbar aus dem Verzeichnis).

Ablauf: Adresse einfügen → **Wiki prüfen** → Chronicle ermittelt den Endpunkt
selbst und zeigt, was dort steht (Name, Artikelzahl, Bilder, Sprache, Lizenz)
→ **importieren** mit Fortschritt und Abbruch.

Die Endpunkt-Erkennung probiert der Reihe nach `<pfad>/api.php`,
`<pfad>/w/api.php`, `<origin>/w/api.php`, `<origin>/api.php`. Damit trägt
derselbe Weg Fandom (`/de/api.php`), Wikipedia (`/w/api.php`) und eigene
Instanzen, ohne dass jemand einen Endpunkt kennen muss.

**Gegen das echte Eron-Wiki nachgewiesen** (`scripts/e2e-import.mjs`, 10/10
grün, echte Netzanfragen aus dem Browser):

| | |
|---|---|
| Erkannt | Eron Wiki · de · 74 Artikel · 38 Bilder |
| Lizenz aus `rightsinfo` | CC-BY-SA |
| Endpunkt selbst gefunden | `eron.fandom.com/de/api.php` |
| Importiert | **73 Artikel, 303 kB Text** |
| Herkunft je Artikel | Quelle, Lizenz, Revisionsnummer |

**73 statt 74 ist kein Verlust, sondern der Beweis, dass live gelesen wird.**
„Kaiserliche Flotte" ist seit der Fixture-Ernte am 2026-07-27 zu einer
Weiterleitung auf „Kaiserliche Marine" geworden; Weiterleitungen werden
bewusst nicht importiert (`gapfilterredir=nonredirects`). Der Import bildet
das Wiki von heute ab, nicht das von damals.

Weitere Zusicherungen, alle geprüft:

- Importierte Artikel tragen die Lizenz **sichtbar am Artikel**
  („Prosa: eron.fandom.com (de) · CC-BY-SA · Revision 1154"), nicht im
  Kleingedruckten.
- **Live-Import verwerfen** entfernt ausschließlich Importiertes; selbst
  Geschriebenes bleibt stehen.
- Scheitert der Browserspeicher (Kontingent), sagt Chronicle das, statt still
  zu verlieren — die Sitzung läuft weiter, aber der Nutzer weiß, dass ein
  Neuladen die Änderungen kostet.
- Der Importer schreibt nie in fremde Systeme; MediaWiki wird nur gelesen.

### 7.1 Die drei Looks im Produkt — Stand 2026-09-06

Der Prototyp trägt alle drei; das Produkt trug bisher zwei. Abgleich zwischen
`design/shell-lab` und `packages/theme`:

| Ratifizierter Look (§7) | Produkt-Preset | Stand |
|---|---|---|
| **Obsidian** — Basalt, eine Glut-Akzentfarbe | `Fantasy` | war da (`packages/ui/src/tokens.css`: „extracted from the ratified Obsidian shell reference") |
| **Vellum** — heller Foliant | `Medieval` | war da |
| **Aurora** — Indigo, Teal, chromatische Tiefe | `Aurora` | **neu ergänzt** |

Aurora ist damit nicht länger nur Laborware. Es wurde in das vorhandene
Theme-System gelegt statt daneben: `THEME_PRESET_IDS` kennt es, und weil
`AppearanceSettings` und `ThemeWorkbench` über diese Liste iterieren, erscheint
es ohne eine einzige Änderung am Client in der Look-Auswahl und als Vorlage.

**Nachweis statt Zusicherung.** Der Produktvertrag verlangt, dass *jedes*
Preset *jede* deklarierte Kontrastpaarung besteht
(`packages/theme/src/contrast.ts`, WCAG 2.2 sRGB): Text, Muted, Faint, Links
und Akzent gegen zwölf Untergründe, Statusfarben gegen ihre weichen Flächen,
Fokus und Steuerlinien als Nicht-Text. Aurora besteht **135 von 135 Paaren**
(entworfen und geprüft mit `tools/aurora-contrast.mjs`).

Gates nach der Ergänzung: `tsc` grün · **814 Tests grün** (0 rot) ·
`gate:boundaries` grün (264 Dateien, 0 Verstöße) · `gate:assets` grün ·
Client-Build grün.

Was Aurora im Produkt **nicht** mitbringt: Space Grotesk und Manrope stehen in
`THEME_FONT_IDS` nicht zur Verfügung; das Preset nutzt `system`/`plex`. Die
Glasmaterialität aus dem Labor ist Sache der Atmosphäre-Regler, nicht des
Farbpresets. Beides ist bewusst so und keine stille Kürzung.
