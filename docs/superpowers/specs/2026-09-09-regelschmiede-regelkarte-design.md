# Regelschmiede: Regelkarte über das ganze Paket — Design

Datum: 2026-09-09. Status: **beschlossen** (Kaya, 2026-09-08: „entscheide ab jetzt du, nimm die
most general advanced option, frag mich nix"). Teilprojekt 2 von 4 des Regelschmiede-Umbaus;
Teilprojekt 1 (Formel-Bauteil) liegt seit `128b7d7` in `main`.

## 1. Auftrag und Entscheidungen

Kaya, 2026-09-09: „Kannst du die Regelwerkschmiede noch besser machen?" Die Reihenfolge der
Teilprojekte steht seit der Spec vom 2026-09-08 fest; als Nächstes kommt die Regelkarte: das
ganze Paket als ein Bild im Objekt-Bild, drei Modi umschaltbar, aufgebaut auf der Knotenzeichnung
des Formel-Bauteils.

| Frage | Entscheidung |
| --- | --- |
| Was zeigt die Karte | Alle Teile des Pakets als Knoten: Attribute (nach Bogenabschnitt), abgeleitete Werte, Regeln, Balken, Aktionen mit Parametern. Kanten sind die Abhängigkeiten, die aus den Formeln gelesen werden. |
| Drei Modi | **Übersicht** (die Figur als Karte eines Objekts, wie ein Klassendiagramm), **Karte** (Knoten in Spalten mit Kanten, Bearbeitung am gewählten Knoten), **Knotennetz** (dieselbe Karte, jede Formel als eingebettetes Knotennetz aus Teilprojekt 1). |
| Bearbeitung | Am gewählten Knoten, in allen drei Modi: Beschriftung, Formel über `FormulaField`, Meldung einer Regel, Erschöpfung eines Balkens. Attribute und Aktionen bekommen dazu einen Sprung in ihren Reiter für alles Weitere. |
| Befunde | Die Karte meldet in Klartext: unbenutzte Zahlen- und Ja/Nein-Attribute, Verweise auf Attribute, die es nicht gibt, Formeln, die nicht lesbar sind. Hinweise, keine Sperre — die Paketprüfung bleibt die einzige Sperre. |
| Platz | Eigener Reiter **Regelkarte** direkt nach „Paket". Die Objektkarte oben (Zählung) bleibt. |
| Ansatz | Nur Client. Ein Modell `rule-map-model.ts` liest den Entwurf, ein Bauteil `RuleMap.tsx` zeichnet. Keine neue Abhängigkeit, kein Layout-Framework: Spalten nach Art, Reihenfolge nach Schwerpunkt der Abhängigkeiten. |

## 2. Modell

`packages/client/src/features/rule-map-model.ts`:

- `ruleMapGraph(draft: RuleDraft): RuleMapGraph` mit `nodes`, `edges`, `issues`.
- Knotenarten (`RuleMapKind`): `attribute`, `computed`, `rule`, `bar`, `action`. Jeder Knoten
  trägt `id` (stabil: `attribute:<kennung>`, `action:<kennung>` …), `label`, `detail`
  (Alltagsdeutsch: „Zahl 0–20", „Formel: 1d20 + @geschick"), `group` (Bogenabschnitt bei
  Attributen), `formulas` (alle Formeln des Knotens mit Rolle: Ergebnis, Bedingung, Bereich,
  Höchststand, Berechnung) und `status` (`ok` | `hint` | `error`) mit `message`.
- Kanten: `{ from: attribute, to: <formelknoten>, via: <rolle> }`. Doppelte Kanten werden
  zusammengefasst. Es gibt keine Kanten zwischen Nicht-Attributen, weil die Engine abgeleitete
  Werte, Regeln, Balken und Aktionen nur über `actor.<attribut>` rechnet
  (`resolveFields` in `package-v2.ts`).
- `ruleMapLayout(graph, size)`: vier Spalten (Attribute · Abgeleitet · Regeln und Balken ·
  Aktionen). Attribute in Bogen-Reihenfolge mit Gruppenzeilen je Abschnitt, die anderen Spalten
  nach dem Mittel der Y-Werte ihrer Attribute (Schwerpunkt) sortiert. `size(node)` liefert Breite
  und Höhe je Knoten, damit das Knotennetz jede Formel in ihrer echten Größe einbettet.
- `relatedTo(graph, id)`: die Nachbarschaft eines Knotens für Hervorhebung und die Liste
  „Hängt zusammen mit".

Befunde:

| Fall | Status | Satz |
| --- | --- | --- |
| Formel nicht lesbar | `error` | „Die Formel lässt sich nicht lesen. Öffne den Knoten und korrigiere sie." |
| Verweis auf ein Attribut, das es nicht gibt | `error` | „Verweist auf @x, das es in diesem Paket nicht gibt." |
| Zahlen-/Ja-Nein-Attribut ohne Verwendung | `hint` | „Wird in keiner Formel benutzt." (Textattribute sind Anzeige und bekommen keinen Hinweis.) |

## 3. Bauteil `RuleMap`

`packages/client/src/features/RuleMap.tsx`, Props `{ draft, onChange(draft), disabled,
onOpen(tab) }`.

- Umschalter **Übersicht · Karte · Knotennetz**, Standard Übersicht, Wahl je Gerät in
  `localStorage` (`atlas.rule-map-view`, fehlertolerant).
- Suchfeld ab zehn Knoten: filtert Knoten nach Bezeichnung und Kennung; im Karten-Modus
  werden nicht passende Knoten abgeblendet, nicht entfernt (die Kanten bleiben lesbar).
- **Übersicht**: eine Karte „Figur" mit Abschnitten Attribute (je Bogenabschnitt), Abgeleitet,
  Regeln, Balken und darunter Aktionen als `name(?parameter: Zahl, …) → Formel`. Jede Zeile
  ist ein Knopf und wählt den Knoten. Formeln in Zucker (`@x`, `?x`).
- **Karte**: HTML-Knoten und SVG-Kanten wie `FormulaGraph`, Spaltenköpfe, Legende. Wahl eines
  Knotens hebt seine Nachbarschaft hervor und blendet den Rest ab. Statusfarbe am Knoten.
- **Knotennetz**: wie Karte, aber jeder Formelknoten enthält seine Formel als `FormulaGraph`
  (schreibgeschützt); Kanten enden am Kasten. Bearbeitet wird weiter im Bearbeitungsfeld.
- **Bearbeitungsfeld** rechts (unter 760 px darunter): Art und Kennung, Beschriftung,
  Formel(n) über `FormulaField`, Meldung (Regel), Erschöpfung (Balken), Liste „Hängt zusammen
  mit" (Nachbarn als Knöpfe), Knopf „Im Reiter … öffnen". Attribute: Beschriftung plus Sprung.
- Befunde als Liste über der Zeichnung („3 Hinweise"), jeder Eintrag ein Knopf zum Knoten.
- Tastatur: Knoten sind Knöpfe; Escape hebt die Wahl auf.
- Telefon: Zeichnung scrollt in ihrem Rahmen, die Seite nie.

## 4. Klartext

Verbotsliste wie Teilprojekt 1; `RuleMap.tsx` und `rule-map-model.ts` kommen in den
Jargon-Wächter `rule-forge-klartext.test.ts`. Wörter: Attribut, abgeleiteter Wert, Regel, Balken,
Aktion, Parameter, Formel, Verbindung, Hinweis.

## 5. Umsetzung, Dateien, Grenzen

- Neu: `rule-map-model.ts`, `RuleMap.tsx`, `rule-map.css`, Tests `rule-map-model.test.ts`,
  `rule-map.test.ts`, Browserablauf `e2e/rule-forge-map.spec.ts`.
- Geändert: `RuleForge.tsx` (Reiter `map`, Beschreibung, Einbau), `rule-forge-klartext.test.ts`
  (zwei Dateien mehr), `packages/client/src/i18n/en/P1.json` (die neuen Sätze aus
  `RuleForge.tsx`, damit `gate:sprache` grün bleibt).
- Nicht angefasst: `@chronicle/rules`, Paketformat, Belege, Protokoll, Server, Desktop.
- Byte-Treue bleibt: die Karte schreibt Formeln nur über dieselben Wege wie die Reiter
  (`expression` an Aktionen, `expression`/`max` an abgeleiteten Werten, Regeln, Balken).

## 6. Prüfung

- Modell: HTBAH-Vorlage liefert alle Knoten und Kanten, Statusfälle (unlesbar, unbekannt,
  unbenutzt), Layout-Spalten und Schwerpunkt-Reihenfolge, `relatedTo`.
- Bauteil: drei Modi rendern (react-dom/server), Bearbeitungsfeld zeigt Formel des gewählten
  Knotens, Jargon-Wächter.
- Browser: neues Paket → Reiter Regelkarte → Übersicht zeigt „Erste Aktion" → Karte → Knoten
  wählen → Formel im Bearbeitungsfeld ändern → Reiter Aktionen zeigt die geänderte Zeile →
  Knotennetz zeigt ein Knotennetz je Formel; 390 px ohne waagerechtes Scrollen der Seite.
- Gates: `typecheck`, `build`, `gate:sprache`, `gate:boundaries`, gezielte Vitest-Liste.

## 7. Nicht-Ziele

Keine Kategorien und Summen (3), keine Gegenstände (4), keine Kanten zwischen abgeleiteten
Werten (die Engine kennt sie nicht), kein Ziehen von Knoten mit der Maus (die Anordnung ist
berechnet und stabil), keine Änderung am Paketformat.
