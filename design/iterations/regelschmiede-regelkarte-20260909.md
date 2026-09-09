# Regelschmiede: Regelkarte über das ganze Paket

Auftrag (Kaya, 2026-09-09): „Kannst du die Regelwerkschmiede noch besser machen?" Nach
Kayas Reihenfolge vom 2026-09-08 war die Regelkarte dran: das ganze Paket als ein Bild im
Objekt-Bild, drei Modi, aufgebaut auf der Knotenzeichnung des Formel-Bauteils. Entschieden
ohne Rückfrage („nimm die most general advanced option, frag mich nix").

## Entscheidungen

Bindend ist die Spec `docs/superpowers/specs/2026-09-09-regelschmiede-regelkarte-design.md`.
Die Kernentscheidungen, im Nachhinein kippbar:

- **Eigener Reiter „Regelkarte"** direkt nach „Paket" (Schritt 2 von 8). Die Objektkarte oben
  mit der Zählung bleibt.
- **Drei Modi, ein Zustand.** Übersicht (die Figur als Karte eines Objekts, wie ein
  Klassendiagramm), Karte (Spalten Attribute · Abgeleitet · Regeln und Balken · Aktionen mit
  SVG-Verbindungen), Knotennetz (wie Karte, jede Formel als eingebettetes, schreibgeschütztes
  `FormulaGraph`). Die Wahl eines Knotens und das Bearbeitungsfeld rechts sind in allen drei
  Modi dieselben; die Moduswahl merkt sich der Browser je Gerät.
- **Kanten nur von Attributen.** Die Engine rechnet abgeleitete Werte, Regeln, Balken und
  Aktionen ausschließlich über `actor.<attribut>` (`resolveFields` in `package-v2.ts`);
  Kanten zwischen Nicht-Attributen gäbe es nur als Erfindung. Ein Balken bekommt zusätzlich
  die Kante „Stand" von seinem Attribut, auch ohne Formelverweis.
- **Befunde sind Hinweise, keine Sperre.** Unlesbare Formel, Verweis auf ein fehlendes
  Attribut oder einen fehlenden Parameter (Fehler), unbenutztes Zahlen- oder Ja/Nein-Attribut
  (Hinweis; Textattribute sind Anzeige). Die Liste ist zugeklappt, solange nur Hinweise da
  sind, und geöffnet, sobald ein Fehler dabei ist. Die Paketprüfung bleibt die einzige Sperre.
- **Bearbeitung am Knoten schreibt über dieselben Wege wie die Reiter** (`expression` an
  Aktionen, `expression`/`max` an abgeleiteten Werten, Regeln, Balken). Byte-Treue beim
  unveränderten Öffnen bleibt dadurch unberührt. Alles, was die Karte nicht anbietet
  (Typ, Bereich, Parameterliste, Ergebnisbereiche anlegen), erreicht man über den Knopf
  „Im Reiter … öffnen".
- **`FormulaGraph` bekam `compact`** (ohne Legende und Ergebnissatz) und Auslassungspunkte
  für lange Knotenbeschriftungen — der einzige Eingriff in Teilprojekt 1, additiv.
- **Keine Änderung** an `@chronicle/rules`, Paketformat, Belegen, Protokoll, Server, Desktop.

## Was gebaut wurde

- `packages/client/src/features/rule-map-model.ts`: Entwurf → Knoten, Kanten, Befunde;
  Layout in vier Spalten, Attribute in Bogen-Reihenfolge unter Gruppenzeilen, alle anderen
  Spalten nach dem Schwerpunkt ihrer Attribute sortiert; jede Knotengröße kommt vom Aufrufer,
  damit das Knotennetz jede Formel in echter Größe einbettet.
- `packages/client/src/features/RuleMap.tsx` und `rule-map.css`: Umschalter, Suche ab zehn
  Knoten, Befundliste, Übersicht, Karte/Knotennetz mit Hervorhebung der Nachbarschaft und
  Abblenden des Rests, Bearbeitungsfeld mit `FormulaField`, Liste „Hängt zusammen mit",
  Escape hebt die Wahl auf. Unter 760 px steht das Bearbeitungsfeld unter der Zeichnung;
  die Zeichnung scrollt in ihrem Rahmen, die Seite nie.
- `RuleForge.tsx`: Reiter `map`, Beschreibung, Einbau; der Reiter bleibt in der
  schreibgeschützten Ansicht navigierbar (Bearbeitungsfeld gesperrt, Knoten wählbar).
- Sprachpaket: 56 neue Sätze plus eine Pluralform in `P1.json`/`en.plural.json`, ans Ende
  angehängt, damit der Katalog-Diff klein bleibt.
- Jargon-Wächter deckt die beiden neuen Dateien mit ab.

## Gemessene Nachweise

Alle Zahlen aus tatsächlichen Läufen auf `feature/regelschmiede-regelkarte`.

**Browserabläufe (Playwright, `msedge`, nach `npm run build`):**

- `e2e/rule-forge-map.spec.ts` — 1/1 grün, neu. Deckt: neues Paket → Reiter Regelkarte →
  Übersicht zeigt „Erste Aktion" mit `() → 1d20 + @insight` → Befund „Kraft wird in keiner
  Formel benutzt" führt zum Knoten → Formel am Knoten auf `1d20 + @insight + @vigour`
  geändert, Beispiel erscheint → Reiter Aktionen zeigt dieselbe Zeile → Befund ist weg →
  Karte mit vier Spalten, Wahl von „Kraft" hebt „Erste Aktion" hervor und blendet „Name" ab,
  Escape schließt → Knotennetz zeigt eingebettete Formelnetze mit dem Attribut → „Im Reiter
  Aktionen öffnen" wechselt den Reiter → 390 px ohne waagerechtes Scrollen der Seite, keine
  `pageerror`.
- `e2e/rule-forge-formula.spec.ts` 2/2 und `e2e/rule-forge.spec.ts` 1/1 — unverändert grün
  im selben Bündel (4 von 4 in 3,5 min).
- Bildschirmfotos aller drei Modi mit der HTBAH-Vorlage (74 Teile) im echten Browser
  angesehen: Übersicht, Karte, Knotennetz und 390-px-Ansicht. Der einzige Befund daraus —
  überlaufende Beschriftungen wie „Spurenlesen · Rohpunkte" in den kleinen Formelknoten —
  ist behoben (Auslassungspunkte, voller Name als Tooltip).

**Gates:** `npm run typecheck` grün; `npm run build` grün; `gate:sprache` GREEN (3029
Schlüssel, 0 Verstöße); `gate:boundaries` GREEN (640 Dateien, 0 Verstöße); `gate:version`
GREEN.

**Gezielte Vitest-Liste:** 14 Testdateien der Schmiede und des Formel-Bauteils grün
(darunter `rule-map-model.test.ts` 6/6 und `rule-map.test.ts` 6/6, neu; Jargon-Wächter
14 Dateien). Keine volle Suite, nach Kayas Regel.

## Abweichungen von der Spec

- Keine inhaltlichen. Die Spec sah das Suchfeld „ab zehn Knoten" vor; so ist es gebaut.

## Offen

- Teilprojekt 3: Kategorien und Summen (Wissen/Handeln/Soziales als Gruppen mit erzeugten
  Summen und Boni). Die Karte gruppiert Attribute heute nach Bogenabschnitt; Kategorien
  könnten dieselben Gruppenzeilen nutzen.
- Teilprojekt 4: Ausrüstung mit Regelwirkung (`?waffe.schaden`), berührt Protokoll, Server und
  Sicherungsformat; Absprache nötig.
- Ziehen von Knoten mit der Maus ist bewusst nicht gebaut: die Anordnung ist berechnet und
  stabil, eine handverschobene Karte müsste im Paket gespeichert werden.
- Weitere Beispiel-Regelwerke und Lizenzfragen jenseits HTBAH bleiben Kayas Entscheidung.
