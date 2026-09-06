# 09 — Journale, Handouts, Ordner, Kompendien: der Implementierungskatalog

Status: **Bestandsaufnahme gegen den Arbeitsbaum**, 2026-09-06.
Auftrag: Kaya wählte aus dem Feature-Register das Cluster „Journale" (siehe
`07-shell-redesign.md` §12). Diese Datei sagt, was davon schon existiert, was
fehlt, und in welcher Reihenfolge es gebaut wird.

Methode: `design/feature-register.json` gefiltert auf `wer ∈ {World Anvil,
Foundry, Roll20, Fandom}`, `entscheidung ≠ verweigern`, `status =
konkurrenz-hat-es`; Clusterbegriffe gegen Name und Beschreibung. Ergebnis
**19 offene Einträge**. Anschließend jeder gegen `packages/*/src` geprüft.
Jede Bestandsaussage trägt einen Dateipfad; wo keiner steht, steht
**UNVERIFIED**.

## 1. Der Bestand — was die Suche im Produktcode findet

Gesucht wurde über alle `packages/*/src` (ohne `node_modules`):

| Begriff | Treffer | Befund |
|---|---:|---|
| `Handout` | **0 Dateien** | existiert im Produkt nicht |
| `Journal` | **0 Dateien** | existiert im Produkt nicht |
| `Kompendium` / `Compendium` | **0 Dateien** | existiert im Produkt nicht |
| `Ordner` / `Folder` / `Sammlung` | **0 Dateien** | existiert im Produkt nicht |
| `Inhaltsverzeichnis` / `toc` | **0 Dateien** | existiert im Produkt nicht |
| `Makro` / `Macro` | **0 Dateien** | existiert im Produkt nicht |
| `Infobox` | 3 Dateien | **teilweise da**, siehe unten |
| `Vorlage` / `Template` | 1 Datei | **nur lesend**, siehe unten |

Das ist ein klareres Ergebnis, als ich erwartet hatte: Vom Cluster existiert
im Produkt **fast nichts** — außer der Infobox, und die nur auf der
Importseite.

### 1.1 Was bei „Infobox" wirklich steht

- `packages/chronik/src/model.ts:47` — der Objekttyp wird „aus der eigenen
  Struktur des Autors (der Infobox-Vorlage)" abgeleitet, nicht aus Tags.
- `packages/chronik/src/model.ts:123` — **eine Infoboxzeile ist bereits eine
  eigene Passage** („die geteilte Infobox"), mit eigener Identität.
- `packages/io/src/wikitext.ts:6–9` — eine feste Abbildung fremder
  Vorlagennamen auf Chronicle-Typen (`Person → charakter`,
  `Rasse/Spezies → spezies`, `Stadt → ort`, `Krieg → ereignis` …).

**Das ist die halbe Miete und zugleich die Grenze.** Chronicle kann eine
Infobox *lesen* und in Passagen zerlegen. Es kann keine *entwerfen*: Es gibt
keinen Vorlagen-Editor, keine benutzerdefinierten Felder, keine Feldtypen.
Die Abbildung in `wikitext.ts` ist hartkodiert — eine Welt mit einer eigenen
Vorlage fällt hindurch.

### 1.2 Was daneben schon existiert und trägt

- `packages/client/src/features/MediaPanel.tsx` — Medienfläche, also der Ort,
  an den ein Handout-Schirm später andockt.
- `packages/client/src/features/PublicationWorkbench.tsx` — Publikation, also
  die vorhandene Antwort auf „was sehen Fremde".
- `packages/client/src/features/ImportView.tsx` — Import, inklusive der
  Infobox-Erkennung.
- **`Sicht`/Freigabe ist breit verankert** (u. a. `client/src/App.tsx`,
  `Editor.tsx`, `ActorWorkbench.tsx`). Das ist der wichtigste Befund für die
  Reihenfolge: Die Berechtigungskante, die ein Handout braucht, muss nicht
  erfunden werden.

## 2. Die 19 offenen Einträge, gruppiert

### Gruppe A — Journale und Handouts (4)

| Feature | Quelle |
|---|---|
| Journaleinträge mit Rich-Text-Editor | Foundry |
| Handouts über Journale und Bilder | Foundry |
| Journale, Handouts und Ordner | Roll20 |
| Handout-Schirm (GM schiebt Bilder live an alle) | World Anvil |

**Erweitert:** den vorhandenen Artikel plus `Sicht`. Ein Journal ist kein
zweiter Wissensspeicher — es ist ein Artikel mit mehreren Seiten und einer
Freigabe je Seite. Foundry hat *kein* eigenes Handout-Objekt (steht so im
Register); wir brauchen auch keines.

**Abhängigkeit:** keine. Baubar mit dem, was da ist.

### Gruppe B — Vorlagen und Infoboxen (4)

| Feature | Quelle |
|---|---|
| Infobox-GUI für Nicht-Techniker | Fandom |
| Portable Infoboxes (deklarative Strukturdaten) | Fandom |
| 28 Artikelvorlagen | World Anvil |
| Vorlagen als Fragenkatalog gegen den Kaltstart | World Anvil |

**Erweitert:** `chronik/model.ts` (Infoboxzeile = Passage) um die
Schreibrichtung. Die Leserichtung existiert.

Der vierte Eintrag ist der unterschätzte: *„Die Vorlagenfelder stellen einem
Anfänger die Fragen über seine Welt, die er nicht zu stellen wusste — die leere
Seite verschwindet."* Das ist kein Formular, das ist Onboarding. Es kostet
fast nichts, sobald der Vorlagen-Editor steht, und es adressiert genau den
Kaltstart.

**Abhängigkeit:** Gruppe B vor Gruppe D — Kompendien liefern Objekte, die ein
Schema brauchen.

### Gruppe C — Ordnung und Navigation (3)

| Feature | Quelle |
|---|---|
| Journale, Handouts und **Ordner** | Roll20 |
| Inhaltsverzeichnisse je Artikel, Welt und Kategorie | World Anvil |
| DSTS-Bibliothek mit Kurzbefehlen | World Anvil |

**Erweitert:** den vorhandenen Korpus, ohne neue Objekte. Ein
Inhaltsverzeichnis ist eine abgeleitete Ansicht über Überschriften; eine
Sammlung ist eine gespeicherte Abfrage. Die Kurzbefehle sind die vorhandene
Omnibox (⌘K) mit einem GM-Präfix.

**Abhängigkeit:** keine.

### Gruppe D — Kompendien (2)

| Feature | Quelle |
|---|---|
| Compendium-Pakete | Foundry |
| Lizenzierte Compendien mit tier-gestaffeltem Teilen | Roll20 |

**Erweitert:** das vorhandene Paketformat (Regelpakete sind bereits versioniert
und angeheftet — `packages/rules`, `packages/forge`). Ein Kompendium ist ein
Paket mit Inhalt statt mit Regeln.

**Abhängigkeit:** Gruppe B (Schema), und die Lizenzfrage aus §11.3.

### Gruppe E — Export und Interop (2)

| Feature | Quelle |
|---|---|
| Vollständiger Weltexport als ZIP | World Anvil |
| Export ist Daten, keine Welt | World Anvil |

Der zweite ist als *Warnung* katalogisiert, nicht als Wunsch: Was ein
World-Anvil-Export **nicht** mitbringt, sind Vorlagenrendering, Infoboxen,
Autolinker-Querverweise und Kartenpin-Bindungen. Wenn wir exportieren, muss
genau das mit — sonst bauen wir denselben Fehler nach.

**Erweitert:** `packages/io` (existiert, mit `campaign-bundle` und nativen
Formaten v2–v5).

### Gruppe F — Spielzeug am Tisch (4)

Chat-Würfel-Engine mit Makros (Roll20) · Flache Automation über Bogen-Buttons,
Roll Templates und Makros (Roll20) · Kartenregionen mit anhängbaren Verhalten
(Foundry) · Mediensammlung ohne Übertragung an Spieler (World Anvil).

Gehört fachlich zu Tisch und Schmiede, nicht zu diesem Cluster. **Hier nur
verzeichnet, nicht eingeplant** — damit niemand glaubt, der Katalog habe sie
übersehen.

## 3. Baureihenfolge

**Schritt 1 — Journale, Handouts, Sammlungen.** Alles, was mit Artikel +
`Sicht` sofort geht, ohne neues Objekt und ohne neue Abhängigkeit. Größter
Nutzen je Aufwand, weil die Berechtigungskante schon existiert.
→ *Im Prototyp erledigt* (`design/shell-lab`, Commit `6ed8e38`).

**Schritt 2 — Vorlagen-Editor und Kompendien.** Erst das Schema, dann die
Pakete, die es füllen. Die Leserichtung existiert in `chronik/model.ts`; hier
kommt die Schreibrichtung dazu.
→ *Im Prototyp erledigt* (`002e30e` Infobox-Studio, Kompendium-Regal).

**Schritt 3 — Verzeichnisse, Export-Vollständigkeit, Handout-Schirm.**
Abgeleitete Ansichten und die Interop-Lücke. Der Handout-Schirm braucht den
Realtime-Pfad, der mit dem Befehlsbus (07 §5) bereits steht — er ist die erste
Fläche, die ihn für etwas anderes als Spielzustand benutzt.
→ *offen.*

## 4. Was hier nicht gebaut wird, und warum

Aus den 98 verweigerten Einträgen dieser vier Anbieter, mit ihrer eigenen
Begründung aus dem Register:

- **Eigene Artikelvorlagen in HTML+TWIG** (World Anvil) — *„Code als
  Autorenfläche, zusätzlich hinter 99 USD/Jahr — die Wunde, auf die K2 zielt."*
  Unsere Antwort ist das Formular, nicht die Templatesprache.
- **Bogenentwicklung als Code mit Sheetworkers** (Roll20) und
  **Systementwicklung als Code** (Foundry) — dieselbe Begründung, dritte und
  zweite unabhängige Belegstelle. Regelpakete bleiben deklarativ.
- **Variablen in Artikeln** (World Anvil) — *„der erste Schritt zu einer
  Templatesprache im Artikel — genau der Pfad, der bei World Anvil in HTML+TWIG
  endet."*
- **Zeitleisten** (World Anvil, mehrere Einträge) — DO-NOT-Urteil aus RB-14
  §8.4, ratifiziert in `04-die-eine-plattform.md` §6.1.
- **Interwiki-Verlinkung** (Fandom) — setzt ein Netz gehosteter Wikis voraus,
  das wir ausdrücklich nicht bauen.
- **Tausende Statblocks / 100+ Regelsysteme** (World Anvil) —
  *„Datenerfassung, kein Softwareproblem."* Unsere Antwort ist der Import.

## 5. Ehrliche Grenzen dieses Katalogs

- Die Bestandssuche ist eine **Textsuche über `packages/*/src`**. Ein Feature,
  das unter einem ganz anderen Namen existiert, würde sie übersehen. Für die
  acht Begriffe oben halte ich das Ergebnis für belastbar, weil sechs davon
  exakt null Treffer haben — ein vorhandenes Journalsystem ohne das Wort
  „Journal" wäre ungewöhnlich.
- Die Clusterzuordnung der 19 Einträge stammt aus einem Regex über Name und
  Beschreibung. Einträge, die das Cluster betreffen, es aber nicht benennen,
  fehlen. **UNVERIFIED**, wie viele das sind.
- Was im Prototyp erledigt ist, ist **im Prototyp** erledigt. Im Produkt
  existiert davon nichts; `design/shell-lab` ist ein Designlabor, kein
  Auslieferungspfad.
