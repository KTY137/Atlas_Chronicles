<!-- SPDX-License-Identifier: BUSL-1.1 -->
<!-- Copyright (c) 2026 Kaya Yesilyurt - Atlas Chronicles. Siehe LICENSE. -->
# Die Regelwerkstatt, übersichtlich — Bibliothek, Werkbank, Balken

Stand 2026-09-23. Entwurf im Gespräch freigegeben („jo mach“), danach „zieh direkt durch“:
kein Mockup, keine Zwischenfreigabe. Nachweis sind die Bildschirmfotos der fertigen Oberfläche
unter `design/iterations/regelwerkstatt-20260923/`.

## Anlass

Kaya, 2026-09-23: *„der regelwerk editor ist noch maximal unübersichtig das müssen wir ändern,
zudem soll der "live" bar generator eine eigene section bekommen“*. „live bar“ heißt hier
**Lebensbalken** (Leben, Mana, Ausdauer); der Untertitel der Regelschmiede verspricht genau das.

Befund an der laufenden Oberfläche (D20-Referenz als Entwurf geöffnet, 1440 × 960):

1. Die Startvorlagen bleiben nach dem Öffnen eines Entwurfs aufgeklappt, eine volle
   Bildschirmhöhe über der eigentlichen Arbeit (`starterOpen` wird beim ersten Aufklappen wahr und
   nie wieder falsch).
2. Vier Wegweiser übereinander sagen dasselbe: Weg mit fünf Stationen, drei Zählkacheln, Banner
   „Nächster Schritt“, zehn Reiter mit Beschreibungszeile.
3. Der Reiter „Abgeleitet“ trägt fünf Dinge: abgeleitete Werte, Bogenregeln, Balken, den ganzen
   Oberflächenbaum und die Sammlungen, dazu Jargon („Collection“, „UI-Baustein“,
   „Presentation v3“, rohe Namen `group`, `vital`, `Integer`).
4. Jeder Eintrag ist eine immer offene Karte. Sechs Modifikatoren der D20-Referenz ergeben rund
   4000 px, jede Karte mit demselben Hinweis.
5. **Fehler:** Zwei Editoren für denselben Bogen. Sobald ein Paket einen Oberflächenbaum hat,
   rendern Bogen und Testtafel nur noch den Baum (`HostRuleFields`, `RuleForgePreview`). Der
   Reiter „Bogen“ ändert dann nur noch `layout.sections` und bleibt ohne sichtbare Wirkung — bei
   jeder geladenen Vorlage von Anfang an.
6. **Fehler:** Balken und abgeleitete Werte erscheinen nur auf dem Bogen, wenn der Baum einen
   Knoten für sie hat. Ein neuer Balken war also unsichtbar, bis jemand im Baum einen Knoten
   `vital` anlegte. Ein neues Attribut ebenso, sobald der Baum einmal angefasst war; ein
   entferntes Attribut hinterließ einen verwaisten Knoten und machte das Paket ungültig.
7. **Fehler:** Bei einem neuen Paket (`presentationAuto`) zeigte der Baum-Editor den alten,
   gespeicherten Baum, während die Paketprüfung den aus den Abschnitten neu abgeleiteten benutzte.
   Die erste Änderung im Baum übernahm den veralteten Stand; seither angelegte Attribute
   verschwanden vom Bogen.
8. Testtafel und Übernahme liegen unter allem anderen.

## Entscheidungen

Wo zwei Wege offen waren, gilt die allgemeinere Variante (`kaya-entscheide-selbst`).

### E1 — Zwei Ebenen: Bibliothek und Werkbank

Die Regelwerkstatt öffnet mit der **Bibliothek**: offener Entwurf (falls einer da ist), das in
dieser Runde aktive Regelwerk, alle installierten Versionen mit Suche und Kontextmenü, und
„Neu beginnen“ (leer, aus Datei, aus einer Vorlage). Die Vorlagen stehen nur hier.

Ein Paket öffnen, eine Vorlage übernehmen oder „Neues Paket“ führt in die **Werkbank**. „Zur
Bibliothek“ führt zurück, **ohne** den Entwurf zu verwerfen: er bleibt oben in der Bibliothek als
„Offener Entwurf · Weiter bearbeiten“ stehen, bis ein anderer ihn ersetzt (dann wie bisher mit
Rückfrage).

### E2 — Eine Navigation statt vier Wegweisern

Links in der Werkbank eine senkrechte Reiterleiste (`role="tablist"`, `aria-orientation`
vertikal) in vier Gruppen, jeder Eintrag mit Anzahl und Warnzeichen, wenn der aktuelle Fehler
vermutlich dort liegt:

| Gruppe | Einträge |
| --- | --- |
| Überblick | Paket · Regelkarte |
| Die Figur | Attribute · Abgeleitete Werte · **Balken** · Listen · Bogen |
| Am Tisch | Aktionen · Fähigkeiten · Zustände · Bogenregeln |
| Fertigstellen | Ausprobieren · Migration · Übernehmen |

Die Zählkacheln und das Banner entfallen. Der Weg mit fünf Stationen (`RuleForgePath`) bleibt als
Logik und steht kompakt in „Übernehmen“. Unten in der Werkbank eine feste **Statusleiste**: der
Prüfsatz (gültig, oder der Fehler in Alltagsdeutsch mit „Zur Stelle“) und genau ein Knopf für den
nächsten Schritt aus `forgePathSteps`.

„Pakettests“ geht in „Ausprobieren“ auf: Tests entstehen auf der Testtafel und werden dort
gezeigt.

### E3 — Überall Liste und Detail

Abgeleitete Werte, Balken, Listen und Bogenregeln bekommen dieselbe Form wie Attribute und
Aktionen: links eine kompakte Liste mit Suche, rechts genau ein offener Eintrag. Eine gemeinsame
Liste (`RuleEntryList.tsx`) statt der dritten Kopie.

### E4 — Balken sind eine eigene Sektion mit Schnellanlage und Live-Balken

- **Schnellanlage:** „Leben“, „Mana“, „Ausdauer“. Ein Klick legt das Zahlenattribut an, wenn es
  fehlt (Kennung `leben`/`mana`/`ausdauer`, ganze Zahl), den Balken mit Höchststand und bei Leben
  „Niederlage steht zur Bestätigung an“, und legt ihn auf den Bogen. „Eigener Balken“ nimmt das
  erste freie Zahlenattribut.
- **Detail:** Attribut, Beschriftung, Höchststand als Formel, Verhalten bei 0, „Auf dem Bogen
  zeigen“.
- **Live daneben:** der echte Balken (`Vitalanzeige`, dieselbe Rechnung wie der Server) für die
  erste Testfigur, mit einem Schieber für den aktuellen Stand und den Attributen, die der
  Höchststand benutzt, zum Verstellen. Die Werte gehören der Testfigur und erscheinen ebenso auf
  der Testtafel.
- Farben je Balken bleiben weg: das wäre eine Erweiterung des Paketformats, und
  `vitalanzeige.css` hat bewusst eine Farbe für alle. Eigener Schritt, falls gewünscht.

### E5 — Ein Bogen-Editor: der Baum

„Bogen“ bearbeitet nur noch den Oberflächenbaum, in Alltagsworten (Kategorie, Attribut,
Abgeleiteter Wert, Balken, Liste, Fähigkeiten, Zustände, Aktionen; Abschnitt, Raster, Liste,
Karten, Kompakt, Tabelle). Links der Baum als eingerückte Zeilen, ein Eintrag ist ausgewählt und
rechts daneben bearbeitbar; darunter die Live-Vorschau des Bogens. Der alte Abschnitts-Editor
entfällt.

Modellregeln (`rule-sheet-model.ts`, rein und getestet):

- `sheetTree(draft)` ist der Baum, den der Bogen tatsächlich zeigt: bei `presentationAuto` der aus
  den Abschnitten abgeleitete, sonst der gespeicherte. Behebt Befund 7.
- `withSheetTree(draft, root)` übernimmt einen geänderten Baum, setzt `presentationAuto` auf
  falsch und leitet `layout.sections` aus den Kategorien des Baums ab. Damit gibt es eine
  Wahrheit; die Abschnitte bleiben für ältere Leser gültig. Behebt Befund 5.
- `placeOnSheet(draft, kind, ref, on)` legt Attribut, abgeleiteten Wert, Balken oder Liste auf den
  Bogen oder nimmt sie herunter. Neue Balken und Listen liegen sofort auf dem Bogen, neue Attribute
  ebenso (bei festem Baum am Ende der obersten Ebene). Entfernte Attribute nehmen ihre Knoten und
  ihren Balken mit. Behebt Befund 6.
- Ein Paket, das niemand anfasst, kommt weiter byteidentisch heraus (bindend seit Teilprojekt 1).
- Ein Paket ohne Baum (Format 1) bekommt ihn beim ersten Ändern, wie bisher mit Hinweis.

### E6 — Live-Vorschau als ausklappbare Leiste

Abweichung vom Chat-Entwurf („rechts eine Live-Vorschau“): ein fester dritter Streifen ließe bei
1440 px Fensterbreite rund 570 px für Formel, Bausteine und Knotennetz. Deshalb steht die
Vorschau in **Balken** und **Bogen** fest neben der Arbeit und ist in allen anderen Sektionen
eine Leiste, die sich über den Knopf „Bogen-Vorschau“ ausklappt (gemerkt unter
`atlas.rule-forge-preview`). Ab 1600 px liegt sie neben der Arbeit, darunter schiebt sie sich
darüber.

Die Testfiguren gehören jetzt `RuleForge` (`useForgeFixtures`), nicht mehr der Testtafel: so
rechnen Formel-Beispiele, Live-Balken, Vorschau und Testtafel mit derselben Figur, auch wenn
„Ausprobieren“ gerade nicht offen ist.

### E7 — Balken am Bogen wie auf der Karte

Der Knoten `vital` in `RulePresentationView` zeigt denselben Balken wie `Vitalanzeige` (Name,
Stand, Leiste, Erschöpfungshinweis) statt eines nackten `<meter>`. Das betrifft auch den Bogen am
Tisch und passt zum Kampftisch.

### E8 — Nichts außerhalb der Oberfläche

Paketformat, Engine, Server und Protokoll bleiben unberührt. Neue Sätze kommen in
`packages/client/src/i18n/en/regelwerkstatt.json`.

## Prüfung

- Einheit: `rule-sheet-model` (abgeleiteter Baum, Abschnitte aus Baum, Auf-den-Bogen-legen,
  Attribut anlegen und entfernen, Byte-Identität), Schnellanlage der Balken, Navigation
  (Fehlerort → Sektion), Jargon-Wächter über alle neuen Dateien.
- Bestehende Harness- und Browser-Tests der Regelschmiede ziehen auf die neue Navigation nach
  (Reiternamen bleiben, wo sie gleich heißen: Paket, Regelkarte, Attribute, Aktionen, Bogen).
- Sichtprüfung: jede Sektion einmal gerendert (1440 × 960 und 390 px), Fotos unter
  `design/iterations/regelwerkstatt-20260923/`.

### E9 — Farbe je Balken (Nachtrag, am selben Tag gewünscht)

Kaya: „ja hät ich gerne“ und „aber das wir die farben individuell einstellen können“. Das
Paketformat bekommt am Balken ein optionales Feld `color`:

- entweder ein Palettenname `red | orange | yellow | green | teal | blue | purple | grey` — er
  folgt den Signalfarben des gewählten Looks (`--danger`, `--ok`, `--warning`, `--info`,
  `--private`, Mischungen daraus, `--text-muted`) und bleibt damit in hellen wie dunklen und in
  selbst gebauten Looks lesbar;
- oder ein freier Farbwert, genau `#rrggbb` in Kleinbuchstaben — gilt in jedem Look gleich. Nichts
  anderes (keine Kurzform, kein CSS-Name, kein Ausdruck), damit kein Look den Wert anders liest und
  nichts in eine Stilangabe gelangt.

Fehlt das Feld, gilt wie bisher die Akzentfarbe; ein Paket ohne Farbe bleibt byteidentisch. Die
mitgelieferten Vorlagen bleiben ohne Farbe (feste Versionen). Die Schnellanlage färbt Leben rot,
Mana blau, Ausdauer grün. Die Leiste hat einen feinen Innenrand, damit auch eine Farbe nahe am
Hintergrund sichtbar bleibt. Ältere Programmstände lehnen ein Paket mit Farbe ab (der Prüfer kennt
nur bekannte Felder); das gilt für jede Formaterweiterung und betrifft nur neu gebaute Pakete.

## Bewusst nicht enthalten

- Ziehen und Ablegen im Bogenbaum (Pfeile und „Kategorie“-Auswahl bleiben).
- Ausrüstung mit Regelwirkung (Teilprojekt 4 der Regelschmiede).
