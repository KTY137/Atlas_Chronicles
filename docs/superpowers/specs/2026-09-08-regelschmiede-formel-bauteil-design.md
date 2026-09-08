# Regelschmiede: Formel-Bauteil und Objekt-Bild — Design

Datum: 2026-09-08. Status: **beschlossen** (Kaya: „entscheide ab jetzt du, nimm die most general
advanced option, frag mich nix"). Teilprojekt 1 von 4 des Regelschmiede-Umbaus.

## 1. Auftrag und Entscheidungen

Kaya, 2026-09-08: Die Regelschmiede ist „noch scheiße". Man muss Gleichungen eintragen können,
es muss übersichtlicher aussehen, Vorbild Foundry und Roll20. Und: Das Ganze ist
objektorientiertes Programmieren, nur visuell. Die Figur ist ein Objekt mit Attributen und
Methoden; Waffen sind ebenso Objekte. Später sollen D&D und DSA als Beispiele entstehen.

Beschlossen in der Brainstorming-Sitzung:

| Frage | Entscheidung |
| --- | --- |
| Eingabe | Formelzeile **plus** aufgeräumte Bausteine **plus** Knotennetz, umschaltbar, dieselbe Formel. |
| Objektkarte des Pakets | Alle drei Modi (Diagramm, Karte mit Bearbeitung am Knoten, Knotennetz), umschaltbar; das ist Teilprojekt 2 und nutzt die Knotenzeichnung aus diesem Teilprojekt. |
| Reihenfolge | 1 Formel-Bauteil → 2 Regelkarte → 3 Kategorien und Summen → 4 Ausrüstung mit Regelwirkung. |
| Ansatz | A: eine Formel, drei Ansichten, der Syntaxbaum des vorhandenen Parsers als einzige Wahrheit; Zucker `@attribut` und `?parameter` nur in der Anzeige. Kein fremder Editor, keine Block-Bibliothek. |
| Sprache der Oberfläche | Kein Fachjargon. Alles wird in der Oberfläche erklärt (Abschnitt 5). |
| Offene Entscheidungen | Ich wähle jeweils die allgemeinere, mächtigere Variante und protokolliere sie hier. |

Die vier Teilprojekte im Überblick, damit dieses hier seinen Platz kennt:

1. **Formel-Bauteil** (dieses Dokument): Zeile, Bausteine, Knoten; Layout der Schmiede im
   Objekt-Bild; Klartext. Nur Client plus zwei additive Exporte im Regelpaket `@chronicle/rules`.
2. **Regelkarte**: das ganze Paket als Graph aus Attributen, Abschnitten, abgeleiteten Werten,
   Methoden, Ressourcen; drei Modi. Nur Client; baut auf der Knotenzeichnung von 1 auf.
3. **Kategorien und Summen**: Wissen/Handeln/Soziales als Gruppen, erzeugte Summen und Boni
   („Fertigkeitswert = Punkte + Kategoriebonus" mit einem Klick). Die Schmiede erzeugt explizite
   Formeln; Engine unverändert.
4. **Ausrüstung mit Regelwirkung**: Werte an Gegenständen, die in Methoden einfließen
   (`angriff(waffe)`). Berührt Protokoll, Server, Paket- und Sicherungsformat; abgestimmt mit der
   parallelen Sitzung `project-atlas-54`, deren Flächen `packages/protocol`, `io`,
   `server/app.ts` und der Featureliste-Worktree sind.

Beispiel-Regelwerke: D&D 5e über die SRD 5.2 (CC-BY-4.0) mit Quellenangabe wie bei HTBAH; DSA hat
keine freie Lizenz, nur ein eigenes „DSA-artiges" Beispiel wäre möglich. HTBAH ist CC BY-NC-SA 4.0
und damit ein bekannter Release-Blocker (siehe RB-11), das ändert dieses Teilprojekt nicht.
Lizenzentscheidungen bleiben Kayas; sie sind nicht Teil von 1–4.

## 2. Das Objekt-Bild

Die Oberfläche spricht durchgehend in einem Bild, das Kaya vorgegeben hat und das Spielleitungen
ohne Programmierkenntnis verstehen:

| Im Paket heute | Im Objekt-Bild | Sichtbarer Name |
| --- | --- | --- |
| `fields` | Attribute der Figur | **Attribute** („die Werte, die jede Figur trägt") |
| `layout.sections` | Ordnung auf dem Bogen | **Bogen** |
| `computed` | abgeleitete Eigenschaften | **Abgeleitet** („Werte, die sich aus anderen ergeben") |
| `constraints` | Invarianten | **Regeln** („was immer stimmen muss") |
| `vitals` | Ressourcen | **Balken** (bleibt, ist eingeführt) |
| `actions` | Methoden mit Parametern | **Aktionen**, ihre `inputs` heißen **Parameter** |
| Gegenstand (Teilprojekt 4) | zweites Objekt | **Gegenstand**, als Parameter einer Aktion |

Reiterkennungen und Paketformat bleiben unverändert (`fields`, `computed`, …); nur Beschriftung
und Erklärung ändern sich. Vorhandene Browser-Abläufe, die Reiter über ihren Namen finden, werden
mit angepasst, wo ein Name wechselt (siehe Abschnitt 7).

## 3. Sprache und Referenzen in der Zeile

Die Formelsprache der Engine (`packages/rules/src/formula.ts`) bleibt byteidentisch. Das
Bauteil übersetzt nur beim Anzeigen und Tippen („Zucker").

### 3.1 Zucker

| Getippt | Gespeichert | Bedeutung |
| --- | --- | --- |
| `@geschick` | `actor.geschick` | Attribut der Figur |
| `?bonus` | `input.bonus` | Parameter der Aktion, wird beim Würfeln abgefragt |
| `?waffe.schaden` | (noch nicht darstellbar) | Attribut eines Objekt-Parameters; reserviert für Teilprojekt 4 |

- Entzuckern beim Parsen: `@ident` → `actor.ident`, `?ident` → `input.ident`, nur außerhalb von
  Zeichenketten. `ident` folgt der Kennungsregel des Pakets (`[a-z][a-z0-9_-]*`).
- Bezuckern beim Anzeigen: `actor.x` → `@x`, `input.x` → `?x`. Wer lieber `actor.x` tippt, darf
  das weiterhin; beide Schreibweisen sind gleichwertig.
- `?ident.member` erzeugt in diesem Teilprojekt eine Fehlermeldung in Klartext („Werte von
  Gegenständen kommen mit einem späteren Schritt; heute gibt es nur Attribute und Parameter.").
  Tokenizer, Vervollständigung und Knotenmodell kennen Quellen mit typisierten Mitgliedern, damit
  Gegenstandstypen später ohne Umbau dazukommen.
- Byte-Treue: Ein geöffneter Ausdruck wird in der Zeile mit Zucker angezeigt. Solange der Baum
  unverändert ist, wird der ursprüngliche Text zurückgeschrieben (die vorhandene Regel
  `draftExpression` mit `originalExpression`). Belege, Paketprüfsummen und Migrationsvorschauen
  bleiben unberührt.

### 3.2 Zwei additive Exporte im Regelpaket

Damit der Client die Grammatik nicht ein zweites Mal pflegt, bekommt `@chronicle/rules` zwei neue
Funktionen, beide ohne Auswirkung auf vorhandene Aufrufer:

- `tokenizeFormula(source)`: dieselbe Token-Regel wie `parseFormula`, liefert Tokens mit
  `start`/`end` und Art (`dice`, `number`, `string`, `word`, `operator`, `paren`, `comma`,
  `dot`). Ungültige Reste werden als `invalid`-Token mit Position gemeldet, nicht als Ausnahme.
- `parseFormulaDetailed(source)`: `{ ok: true, ast }` oder `{ ok: false, message, start, end,
  code }` mit dem betroffenen Token. `code` ist eine kleine geschlossene Menge
  (`invalid-token`, `expected`, `unsupported-function`, `unknown-field`, `argument-count`,
  `limit`, `type`), aus der der Client Klartext macht. Die Typprüfung (`inferFormulaType`) wird
  im selben Aufruf mit den übergebenen Feldtypen ausgeführt, damit „unbekanntes Attribut" und
  „Zahl erwartet, Wahrheitswert gefunden" ebenfalls eine Position haben.
- `parseFormula` und alle Fehlertexte bleiben, `ENGINE_VERSION` bleibt `1.0.0`: Für gültige
  Formeln ändert sich nichts, und nur das zählt für Belege und Wiederholung.

### 3.3 Vervollständigung

- `@` öffnet die Attributliste: Bezeichnung, Kennung, Typ als Wort („Zahl", „Ja/Nein",
  „Text"); Suche über Bezeichnung und Kennung, unscharf bei Tippfehlern; Pfeiltasten, Enter,
  Tab übernehmen, Escape schließt. Übernommen wird die Kennung; der Chip zeigt die Bezeichnung.
- `?` öffnet die Parameterliste der Aktion. Wo es keine Parameter gibt (abgeleitete Werte,
  Regeln, Balken, Migrationen), zeigt die Liste einen Satz: „Abgeleitete Werte haben keine
  Parameter, weil sie ohne Wurf gelten. Nutze Attribute mit @."
- Beim Tippen von Buchstaben ohne Vorzeichen erscheinen Funktionen mit deutscher Erklärung:
  `min` „kleinster Wert", `max` „größter Wert", `floor` „abrunden", `ceil` „aufrunden",
  `round` „runden", `abs` „Betrag", `if` „wenn … dann … sonst", dazu die Wissensfunktionen,
  wo erlaubt. Die Namen bleiben englisch, weil sie in gespeicherten Paketen stehen; die
  Erklärung steht daneben.
- Nach `d` in einer Zahl erscheinen Würfelvorschläge: `1d20`, `2d6`, `1d100`, „höchsten
  behalten" `2d20kh1`, „niedrigsten behalten" `2d20kl1`, „explodierend" `1d6!3`.

### 3.4 Fehler in Klartext

Jeder Fehlercode wird in einen Satz übersetzt und der betroffene Abschnitt in der Zeile
unterstrichen. Vollständige Zuordnung (der Katalog ist Teil der Umsetzung und wird getestet):

| Code | Satz |
| --- | --- |
| `invalid-token` | „Dieses Zeichen gehört nicht in eine Formel." |
| `expected` (`)`) | „Hier fehlt eine schließende Klammer." |
| `expected` (Ausdruck) | „Nach dem Rechenzeichen fehlt noch ein Wert, zum Beispiel eine Zahl, ein Würfel oder ein Attribut." |
| `unsupported-function` | „`xyz` kennt die Schmiede nicht. Erlaubt sind min, max, floor, ceil, round, abs und if." |
| `unknown-field` | „Das Attribut `gescick` gibt es nicht. Meintest du `geschick`?" (Vorschlag per Ähnlichkeit) |
| `argument-count` | „`min` braucht mindestens zwei Werte." |
| `type` | „Hier wird eine Zahl gebraucht, aber `@vertraut` ist Ja/Nein." |
| `limit` | „Diese Formel ist zu lang oder zu tief verschachtelt. Teile sie in einen abgeleiteten Wert auf." |
| Objektpfad | „Werte von Gegenständen kommen mit einem späteren Schritt." |

## 4. Das Bauteil `FormulaField`

Ein Bauteil ersetzt `FormulaBuilder` und die Textarea mit „Formelbaukasten öffnen" überall:
Ergebnisformel einer Aktion, Ergebnisbereiche, Vorbedingungen, abgeleitete Werte, Regeln,
Balken-Maximum, Migrationsformeln.

### 4.1 Vertrag

```ts
interface FormulaFieldProps {
  value: string;                       // kanonischer Ausdruck, wie im Paket gespeichert
  onChange(next: string): void;        // immer kanonisch; leer/ungültig ist erlaubt und macht den Entwurf ungültig
  sources: FormulaSources;             // { actor: Member[], input?: Member[] } mit id, label, type
  allowDice: boolean; allowKnowledge: boolean;
  example?: ExampleContext;            // Beispielfigur der Testtafel + Würfelstart
  label: string; help?: string; disabled?: boolean;
  originalExpression?: string;         // Byte-Treue beim Öffnen (siehe 3.1)
}
```

Innen: der Text der Zeile (mit Zucker) und der geparste Baum. Zeile, Bausteine und Knoten sind
Ansichten desselben Baums; Bausteine und Knoten schreiben über `formulaSource` zurück. Ein
unvollständiger Baustein (leerer Wert) macht den Ausdruck ungültig, `onChange` liefert dann den
unvollständigen Text und der Paketentwurf ist ungültig, so wie es H6 der HTBAH-Vorlage verlangt.
Nie wird still die letzte gültige Formel weiterverwendet.

### 4.2 Umschalter

Oben rechts: **Zeile · Bausteine · Knoten**. Standard Zeile. Die Wahl merkt sich der Browser je
Gerät (`localStorage`, Fehlertolerant). Ist die Zeile fehlerhaft, zeigen Bausteine und Knoten den
letzten gültigen Baum mit dem Hinweis „Die Zeile enthält einen Fehler; hier siehst du den Stand
davor." und sind bis zur Korrektur schreibgeschützt.

### 4.3 Zeile

- Ein einzeiliges Eingabefeld mit farbiger Überlagerung (Overlay über einem echten
  `<input>`/`<textarea>`, damit Auswahl, Einfügen, Rückgängig und Screenreader normal
  funktionieren): Attribute und Parameter als Chips mit Bezeichnung, Würfel, Zahlen, Funktionen
  und Rechenzeichen farblich unterschieden über Design-Tokens, Klammerpaare beim Cursor
  hervorgehoben.
- Popover für die Vervollständigung als `listbox` mit `aria-activedescendant`.
- Unter der Zeile genau eine Zeile: der Fehler mit Unterstreichung im Text **oder** das Beispiel.
- Ein Knopf „Spickzettel" öffnet eine kompakte Tafel mit sechs Beispielen zum Anklicken
  („Wurf plus Attribut", „Zwei Würfel, den besseren nehmen", „Wenn … dann … sonst", „Erfolg ab
  15", „Abrunden", „Mindestens 1"); Anklicken setzt die Formel in die Zeile.
- Beim ersten Öffnen der Schmiede auf einem Gerät steht über der Zeile ein einmaliger Hinweis:
  „Tippe @ für Attribute, ? für Parameter, Zahlen und Würfel wie 1d20 direkt."

### 4.4 Beispiel

Das Bauteil wertet die Formel im Browser mit `evaluateFormula` aus, mit der Beispielfigur der
Testtafel und festem Würfelstart; gleiche Engine wie am Tisch, keine zweite Rechnung. Anzeige:
„Beispiel: 17 = 12 (1d20) + 5 (Geschick)". Die Zerlegung stammt aus der Ablaufspur (`trace`):
Für eine Kette aus `+`/`-` auf oberster Ebene werden die Summanden mit Wert und Bezeichnung
gezeigt; sonst nur der Wert mit der Formel in Worten. „Neu würfeln" zieht einen anderen
Würfelstart. Formeln ohne Würfel zeigen nur den Wert. Für Wahrheitswerte: „trifft zu" / „trifft
nicht zu". Ohne gültige Beispielfigur (Testtafel leer) steht „Lege unten auf der Testtafel eine
Beispielfigur an, dann siehst du hier ein Ergebnis."

### 4.5 Bausteine, aufgeräumt

Waagerechte Darstellung wie ein Formeleditor: `[1d20] + [Geschick]`, Klammern als
Klammergruppen mit sichtbarem Rahmen, `if` als drei beschriftete Fächer „wenn / dann / sonst",
Funktionen als `min( … , … )` mit Fächern. Jeder Baustein hat ein Menü: „Art wechseln" (Zahl,
Attribut, Parameter, Würfel, Rechnung, Vergleich, wenn-dann-sonst, Funktion), „Klammern setzen",
„links anhängen", „rechts anhängen", „entfernen". Ersetzt `FormulaBuilder.tsx`; die Aufrufer der
Bausteinansicht laufen über `FormulaField`.

### 4.6 Knoten

Der Baum als Knotennetz von links nach rechts, automatisch angeordnet (Schichten nach Tiefe,
Blätter links, Ergebnis rechts). Blätter: Attribute, Parameter, Würfel, Zahlen, Texte. Innere
Knoten: Rechenzeichen, Vergleiche, `if`, Funktionen. Anschlüsse zeigen den Typ als Farbe: Zahl,
Ja/Nein, Text; das Ergebnis rechts trägt den erwarteten Typ (Zahl bei Ergebnisformeln, Ja/Nein
bei Regeln). Bearbeiten: Rechenzeichen im Knoten wechseln, Blatt austauschen über dieselbe
`@`/`?`-Suche, Knoten zwischen zwei anderen einfügen, Knoten entfernen (Kind rückt nach). Ziehen
von einem Ausgang auf einen freien Eingang setzt den Teilbaum dort ein; Zyklen sind unmöglich,
weil das Modell ein Baum ist. Umsetzung mit HTML-Knoten und SVG-Kanten ohne fremde Bibliothek.
Der Knotenrenderer (`FormulaGraph`) ist so geschnitten, dass die Regelkarte (Teilprojekt 2) ihn
für Paket-Knoten wiederverwendet: Knoten- und Kantenmodell sind vom Formelbaum entkoppelt.

### 4.7 Bedienung, Telefon, Barrierefreiheit

Alle drei Ansichten sind mit Tastatur vollständig bedienbar; die Zeile ist der Weg für
Screenreader. Auf dem Telefon (390 px) bleibt die Zeile die Hauptansicht; Bausteine und Knoten
scrollen waagerecht in ihrem Rahmen, die Seite nie.

## 5. Klartext in der Oberfläche

Kayas Regel: „Du musst halt alles in der GUI erklären oder verständlich dem User präsentieren."

- Verbotene Wörter in sichtbaren Texten der Schmiede: Parser, Token, Tokenizer, kanonisch,
  Syntax, Syntaxbaum, AST, Port, Skalar, Identifier, Schema, Typinferenz, Literal, Operand,
  Operator (stattdessen „Rechenzeichen"), Expression (stattdessen „Formel"), Input (stattdessen
  „Parameter"), Field (stattdessen „Attribut"). Ein Client-Test („Jargon-Gate") liest die
  Quelltexte der Schmiede-Bauteile und schlägt fehl, wenn ein verbotenes Wort in einem
  JSX-Textknoten oder einem `aria-label`/`title`/`placeholder` steht. Kommentare und Kennungen
  sind ausgenommen.
- Jede Eingabe hat einen Satz Hilfe darunter, der sagt, wofür sie ist und was ein gutes Beispiel
  wäre, im Stil der vorhandenen Feldhilfen.
- Der Spickzettel (4.3) und die Erklärungen in der Vervollständigung (3.3) bringen die Syntax an
  Ort und Stelle bei; ein Handbuch ist nicht nötig.
- Der Reiter-Untertitel erklärt jeden Schritt in einem Satz im Objekt-Bild (Abschnitt 2).
- Der Schalter auf das erweiterte Paketformat bleibt ausdrücklich, weil er das Verhalten am
  Tisch ändert (H1: Lebenspunkte dann über den Bogen, nicht über den alten Schnellknopf). Er
  heißt „Abgeleitete Werte, Regeln und Balken einschalten" und erklärt genau diesen Effekt. Beim
  ersten Klick auf „Abgeleiteten Wert anlegen" wird er direkt angeboten, ein Klick genügt.

## 6. Layout der Schmiede

- **Objektkarte statt „Aufbau dieses Pakets".** Links die Zählung „Attribute 12 · Abgeleitet 5 ·
  Regeln 3 · Balken 2 · Aktionen 4", rechts der Zustand („Entwurf, ungespeichert" /
  „Installiert, schreibgeschützt" / „Aktiv in dieser Runde") und die beiden Hauptknöpfe
  „Version installieren" und „Aktivierung prüfen". Der Bereich „Prüfen und übernehmen" bleibt
  unten für Vorschau, Bestätigung und Aktivierung.
- **Liste plus Editor** in den Reitern Attribute (heute Felder) und Aktionen: links eine
  kompakte Liste aller Einträge mit Bezeichnung, Kennung, Typ, Reihenfolge per Pfeilknöpfen wie
  heute und zusätzlich Ziehen, Suchfeld ab zehn Einträgen; rechts der Editor des gewählten
  Eintrags. Ersetzt das Auswahlmenü „Aktion bearbeiten" und die Karten untereinander.
- **Die Aktion als Karte einer Methode:** Kopf mit Name und Kennung; „Parameter" als kurze
  Zeilen (Bezeichnung, Typ, Vorgabe) mit „Parameter hinzufügen"; das Formel-Bauteil
  „Ergebnis"; „Erfolg" als Wahl zwischen „Feste Schwelle" und „Ergebnisbereiche", jeder Bereich
  mit eigenem Formel-Bauteil in Zeilenansicht; „Vorbedingungen" als Liste von Regeln; ein
  aufklappbarer Bereich „Details" mit Aktionsversion und Erklärung am Tisch.
- **Abgeleitet** (heute „Berechnungen"): drei kurze Listen (abgeleitete Werte, Regeln, Balken)
  mit je einer Formelzeile pro Eintrag und Bezeichnung daneben. Balken behalten die Feldwahl
  statt Tippen (vorhandene Entscheidung).
- Prüfzeile, Sprung zum fehlerhaften Reiter, Testtafel, Bibliothek, HTBAH-Vorlage, Import und
  Download bleiben, wie sie sind.

## 7. Umsetzung, Dateien, Grenzen

Neue Dateien (Client, `packages/client/src/features/`):

- `formula-sugar.ts`: Zucker hin und zurück, Vervollständigungsmodell, Fehlerkatalog
  (Code → Klartext), Ähnlichkeitsvorschlag für unbekannte Kennungen.
- `formula-example.ts`: Beispielauswertung und Zerlegung aus der Ablaufspur.
- `FormulaField.tsx` (Bauteil und Umschalter), `FormulaLine.tsx` (Zeile, Overlay, Popover,
  Spickzettel), `FormulaBlocks.tsx` (ersetzt `FormulaBuilder.tsx`), `FormulaGraph.tsx`
  (Knoten, Layout, Bearbeitung), `formula-field.css`.
- `RuleActionEditor.tsx` (Liste plus Editor, Methodenkarte), `RuleFieldList.tsx` (Liste plus
  Editor für Attribute); `RuleForge.tsx` wird auf Kopf, Reiter, Prüfzeile und Veröffentlichung
  reduziert; `RuleDeclarativeEditor.tsx` nutzt `FormulaField`.

Geändert im Regelpaket (`packages/rules/src/formula.ts`, `index.ts`): nur die zwei additiven
Exporte aus 3.2 plus Tests. Keine Änderung an `parseFormula`, `evaluateFormula`,
`ENGINE_VERSION`, Paketformaten, Belegen.

Nicht angefasst: `packages/protocol`, `packages/io`, `packages/server`, `packages/chronist`,
der Featureliste-Worktree (Flächen der Sitzung `project-atlas-54`). Keine neue Abhängigkeit.

Kompatibilität: Alle heute gültigen Pakete öffnen unverändert; Byte-Treue beim Zurückschreiben
ist getestet (HTBAH-Vorlage und Demopaket: Download nach Öffnen ist byteidentisch mit dem
Original). Bestehende Browser-Abläufe `rule-forge.spec.ts` und `htbah.spec.ts` werden an die
neuen Namen (Reiter „Attribute", Abschnitt „Parameter", Bauteil statt „Baustein"/„Linker Wert")
angepasst, nicht gelockert.

## 8. Prüfung und Nachweise

- Regelpaket: Tests für `tokenizeFormula` (Positionen, ungültige Reste) und
  `parseFormulaDetailed` (jeder Fehlercode mit Position; gültige Formeln liefern denselben Baum
  wie `parseFormula`; alle vorhandenen Formel-Tests bleiben grün).
- Client, gezielt: Zucker hin und zurück inklusive Zeichenketten und Byte-Treue;
  Vervollständigung (Filter, Tippfehler, gesperrtes `?`); Fehlerkatalog vollständig;
  Beispielzerlegung; Bausteine und Knoten schreiben denselben Baum zurück; Jargon-Gate.
- Browser (`e2e/rule-forge-formula.spec.ts`, echte HTTP/DB-Grenzen): `1d20 + @` tippen,
  „Geschick" wählen, Chip und Beispiel sehen; Fehler erzeugen und den Klartext sehen; auf
  Bausteine und Knoten wechseln und dort ein Rechenzeichen ändern; Paket installieren und am
  Tisch würfeln; der Beleg enthält den kanonischen Ausdruck. HTBAH-Vorlage öffnen, Download
  byteidentisch. 390 px: Zeile bedienbar, kein waagerechtes Scrollen der Seite.
- Gates: `npm run typecheck`, `npm run build`, Version, Paketgrenzen; gezielte Suiten plus
  Konsumenten von `@chronicle/rules` im Client (`rule-forge-model`, `RollCard`,
  `CharacterSheet`); keine volle Suite.
- Belege werden in `design/iterations/regelschmiede-formel-bauteil-20260908.md` und im
  Kopfabschnitt von `STATUS.md` festgehalten.

## 9. Nicht-Ziele

Keine Regelkarte des ganzen Pakets (2), keine Gruppen und Summen (3), keine Gegenstandswerte im
Wurf (4), keine Beispiel-Regelwerke, keine Änderung an Engine, Paketformat, Belegen, Protokoll
oder Server, kein fremder Editor, keine Block-Bibliothek, kein Desktop-Paket.
