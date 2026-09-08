# 300 neue Genre-Assets

Auftrag: 300 diverse Kartenassets für verschiedene Genres.

## Entscheidung

Ein zusätzliches Paket `pk.genres` enthält exakt 300 eigenständige SVG-Draufsichten,
aufgeteilt in zwölf Genres mit je 25 Motiven. Das bestehende Zeitwelten-Paket und seine
100 Assets bleiben unverändert. Fantasy, Gothic-Horror, Antike, Wuxia, Piraten, Western,
Steampunk, Noir, Cyberpunk, Weltraum, Postapokalypse und Unterwasser erhalten jeweils
3 kachelbare Böden, 1 Wand, 1 Tür, 1 Licht, 1 Behälter und 18 weitere Objekte.

Gemeinsame Material- und SVG-Helfer sichern Maßstab und Zeichenqualität. Die Silhouetten
und Funktionen der 300 Motive werden einzeln gestaltet. Kein neuer Bildgenerator- oder
Speicherpfad: vorhandener Paketautor, Lizenz-/Hashmanifest, Assetserver und Kartenrevisionen.
Semantische Tags verbinden die Motive mit Kategorien, Genre und den drei Kartensettings.
Der Editor erhält einen Genre-Filter; das Paket ist als zusätzlicher Kartenstil nutzbar.

Verworfen: 300 Farbkopien und zwölf isolierte Minipakete, zwischen denen der Benutzer
beim Einrichten dauernd wechseln müsste. Genre ist hier eine Eigenschaft der Assets;
die bestehenden drei Kartensettings und gespeicherten Kartenidentitäten bleiben stabil.

Der neue Zeichenstil heißt in der Oberfläche ausdrücklich **Genre-Mix passend zum Setting**:
Er wählt aus dem Genre-Archiv über die vorhandenen semantischen Anfragen und Settingtags.
Eine genreübergreifende Sammlung ersetzt kein vollständiges Spezialraumprogramm; fehlende
Anfragen bleiben im Generatorbericht sichtbar. Ein bestimmtes Genre lässt sich über den
Editorfilter gezielt einrichten. Das Zusatzpaket ändert durch seine eigene Paketidentität
den Weltkeim neuer Karten; die alten Pakete und Erzeugeroptionen bleiben unverändert.

## Ablauf und Abnahme

Lokaler LangGraph-StateGraph mit Checkpointer in `.local/genre-assets`, Pin
`langgraph>=1.2,<2`, Tracing aus. Drei unabhängige Zeichenaufträge zu je 100 Motiven;
die Hauptrolle integriert Paket, Genre-Auswahl und Kartenstil. Danach Paket-/Referenzgate,
Geometrieunterschiede, Rasterisierung aller Motive bei 64/128 Pixeln, Bodenkachelung,
Kontaktbögen, gezielte Generator-/Client-/Servertests sowie tatsächliche Browserbenutzung.

## Umsetzung und Review

Das Paket enthält 300 eigene Motive mit eindeutigen Namen, Dateihashes und Geometrien;
auch gegenüber den bisherigen 271 Assets wurde auf Wiederholungen geprüft. Alle 600
Rasterisierungen bei 64/128 Pixeln bestanden, alle 36 Böden decken ihre Kachel vollständig.
Alle zwölf Genre-Kontaktbögen und alle 36 Böden wurden visuell geprüft; die Hauptrolle
sichtete zusätzlich die Gesamtübersicht sowie Fantasy, Antike, Piraten, Noir, Cyberpunk,
Unterwasser und repräsentative Bodenansichten.

Der unabhängige Integrationsreview fand keine bestätigten Blocker bei Stil-Allowlisting,
Genre-/Kategorie-/Setting-/Suchfiltern, Paketwechsel oder vererbtem Stil aus der originalen
Quelle. Bestehende Unterkarten werden vor neuer Generierung wiederverwendet. Es gab keine
Änderungen am Kartenformat oder an den vier bestehenden Assetpaketen.

Die Bildprüfung korrigierte Beibootruder außerhalb des Footprints, eine überstehende
Noir-Ziegelkante und versetzte Steinfarben an zwei Pflasterübergängen. In drei Zukunftsböden
endeten Leiterbahnen beziehungsweise Waben nicht periodisch. Der Graph wurde um die
expliziten Knoten `tiling_repair` und `verification_final` erweitert. Eine neue Rasterprüfung
misst RGB-Sprünge an den tatsächlich aneinanderliegenden X-/Y-Kachelrändern relativ zu den
übrigen Pixelübergängen. Gegen den alten Stand: 9/12 bestanden, genau die drei Befunde rot;
nach der Korrektur auf 64-Pixel-Perioden: 12/12 bestanden. Alle zwölf Zukunftsböden wurden
anschließend erneut in 4×4-Kachelung gesichtet. Paket, Galerie und ZIP wurden neu erzeugt.

## Nachweise

- Finales Assetgate **29/29 grün**: fünf Pakete, **571 Assets / 571 gültige Referenzen**, alle
  fünf bytegleich reproduziert. Alle 300 Motive zusätzlich bei 64/128 Pixeln gerastert.
- Neue Generatorintegration **45/45**, Client **22 Dateien / 203 Tests**, fokussierte
  Karten-/Serverfälle **59/59** grün. Darunter die tatsächliche Auslieferung aller 300 SVGs,
  Erzeugung/Vorschau/Speichern, vererbter Stil und Wiederbetreten derselben Unterkarte.
- Version, Paketgrenzen, Typecheck und Client-Build bestanden.
- Breiter Vitestlauf: **163 Dateien / 1.788 Tests bestanden**, **10 Dateien / 52 Tests
  übersprungen**, **ein fehlgeschlagener Test** nach 683,97 s. Der Archivfall in
  `map-workshop.test.ts:182` überschritt 30.000 ms; zusätzlich meldete Vitest einen
  Worker-RPC-Timeout bei `onTaskUpdate`. Dieser Gesamtlauf war nicht vollständig grün.
- Anschließender Einzeldateilauf mit einem Worker und unverändertem Timeout:
  **11/11 grün**, Gesamtdauer 31,25 s; der betroffene Archivfall bestand in 17.950 ms.
  Keine unhandled Workerfehler, keine geänderten Zeitlimits oder Produktionsumgehungen.
- Galerie: `.local/genre-assets/galerie.html`; Übersicht: `300-assets.png`; einzelne
  Kontaktbögen `<genre>-64.png` / `<genre>-128.png`; Böden `<genre>-floors-4x4.png`.
  ZIP `genre-archiv-300.zip`: 302 Dateien (300 SVGs, Manifest und Lizenz), bytegleich
  gegen das ausgelieferte Paket geprüft.

- Finaler Browserlauf **1/1 grün in 54,2 s** gegen das abschließende Paket, ohne Cooldowns:
  Genre-Stadt im Canvas, 300 Katalogeinträge, zwölf Filter mit je 25 Motiven, echte Platzierung
  je eines Fantasy-/Piraten-/Cyberpunk-Objekts, Revision speichern und identisch neu laden.
  Mobilansicht bei 390 Pixeln ohne horizontalen Überlauf; Wechsel zurück zum bisherigen
  100er-Zeitweltenpaket. Keine Browserausnahmen oder fehlgeschlagenen Assetantworten.
  Drei Screenshots unter `test-results/genre-assets-verified/` wurden visuell gesichtet.
  PGlite, App und Browserkontext geschlossen; kein temporärer Listener oder Testprozess bleibt.
