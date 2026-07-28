# Cross-Review von `spike-A2.html` — durch GUI-Architekt 1 (Sitz „Der Flex")

**Stand der Prüfung:** Runde 3, gelesen um 08:17. Datei vollständig: 127.770 Bytes, 2.252 Zeilen,
bootet sauber (`renderAlles()` in Zeile 2248), keine Konsolenfehler unter jsdom, keine externe
Netzabhängigkeit. Alle Zahlen unten sind **gemessen**, nicht gelesen: ich habe A2 unter jsdom
gefahren, den Sitz gewechselt und den Prüfstand nachgerechnet.

## Was daran sitzt

**Die beiden Sitze bauen tatsächlich zwei verschiedene Bildschirme.** A2 ist die
Universalitätsprobe, nicht der Flex: Achsenleiste (Inhalt × Skin × Rolle × Modus × Darstellung),
Sammlungsschiene, Prüfstand. Der Flex läuft dort mit, aber er ist nicht die Argumentation. Das ist
die richtige Arbeitsteilung und keiner von uns hat sie verletzt.

**Der Flex funktioniert dort auch, und ich habe ihn nachgemessen.** Spielleitung 11 Absätze,
4 Autorenscheiben → Sitz Brannt 6 Absätze, 3 Scheiben, Prüfstand meldet `entfallen 5`. Die Absätze
sind wirklich weg, nicht `display:none` (`.naiv-verborgen`-Knoten im Normalbetrieb: 0). Beide Sitze
kommen unabhängig auf dieselbe Zahl aus dem Kandidatentext — das ist ein Datenpunkt für die Runde,
kein Zufall.

**Die Werkbank ist der stärkste Einzelgedanke beider A-Sitze.** Der Schalter *„Naive Umsetzung
vorführen"* rendert die **falsche** Implementierung — fremde Absätze per CSS versteckt — und lässt
die Leak-Bench danach ausrechnen, was das kostet. Das ist der Unterschied zwischen einer Behauptung
und einem Beweis, und es ist genau das Werkzeug, das Runde 2 gefehlt hat. Ich habe nichts
Vergleichbares; mein DOM-Beleg zählt nur den guten Fall.

**Der Prüfstand misst statt zu behaupten.** `domSig()` hasht `#buehne.innerHTML` nach Entfernung
der Inline-Styles, `vokabularSig()` zählt das Bauteil-Vokabular, `pruefeKontrast()` liest die vom
Browser **aufgelösten** Farben über `getComputedStyle` und rechnet WCAG-Verhältnisse. „Sind die
Skins nur Umfärbungen?" ist damit eine Zahl, keine Meinung. Das gehört in die Produktion, und zwar
als Snapshot-Test, nicht als Panel.

**Ehrliche Kleinigkeit, die ich vermisse:** A2 sagt in der Leak-Bench-Notiz explizit, warum der
Name „Ossa" im Fließtext erlaubt und auf einer Byline-Fläche verboten ist. Eine Regel, die ihre
eigene Ausnahme benennt, ist mehr wert als eine grüne Zeile.

## Was gefaked ist oder teuer wird

1. **Die Leak-Bench widerspricht sich, und zwar sichtbar.** Am Sitz Brannt meldet sie
   `Treffer im Barrierefreiheitsbaum: 1 · gescheitert` — und direkt darunter steht
   *„Keine Fundstelle."* Ursache: in `leakBench()` schiebt nur der DOM-Zweig in `funde`; die
   `a11yTreffer`-Schleife zählt hoch, protokolliert aber nichts. Ein rotes Urteil ohne auffindbare
   Stelle ist schlimmer als kein Urteil — das ist **exakt** das Runde-2-Muster (die sichtbare
   Fläche war korrekt, der Barrierefreiheitsbaum nicht). Kleine Reparatur, aber sie muss vor dem
   Verdikt passieren, sonst liest die Runde eine grüne Werkbank, die einmal rot war.

2. **`imA11yBaum()` ist eine Näherung, die als Messung auftritt.** Sie läuft `aria-hidden`,
   `hidden`, `display`, `visibility` die Elternkette hoch. Sie sieht **nicht**:
   `aria-labelledby`/`aria-describedby` auf verborgene Knoten (die vom Screenreader *sehr wohl*
   gelesen werden), `::before/::after`-`content`, `alt` auf Hintergrundbildern, `<title>` in SVG.
   In A2 selbst gibt es im Bühnenbereich null `aria-labelledby` — die Näherung reicht also für
   **diesen** Baum, aber nicht für den nächsten. Wer diese Bench in die Produktion übernimmt, muss
   sie gegen eine echte Serialisierung (axe / NVDA-Transkript) stellen, sonst wächst sie mit der
   Oberfläche nicht mit.

3. **Die DOM-Signatur beweist weniger, als sie suggeriert.** Sie zeigt: die Achsen dieses Spikes
   verändern das Markup nicht. Das ist wahr — aber sie sind hier **konstruktionsbedingt** reine
   CSS-Achsen. Ein echtes Skin-Paket der adoptierten Richtung bringt 9-Slice-Flächen, Ornamente,
   Ersatzsignete und Fallbacks mit; ob *dann* noch ein Hash gleich bleibt, ist die eigentliche
   Frage, und dieser Prüfstand kann sie nicht stellen. Gleiches gilt für
   *„Verschiedene Bauteile im Einsatz: 44"* — eine Vokabelzahl ist ein Indiz für ein
   Komponentensystem, kein Nachweis.

4. **Die Tafel hängt an `../../spikes/chronicle-harbor-world.png` — 2,0 MB, und ausgerechnet aus
   dem Spike, den die K7-Lineage als Übertreibung verworfen hat.** Als *Paketinhalt* in einem
   Szenenrahmen mit Bildunterschrift ist das vertretbar (Kunst ist Inhalt, nicht Schale) und der
   Ersatzsignet-Pfad existiert. Zwei Sachen bleiben trotzdem: das Bild ist allein größer als das
   Performance-Budget der adoptierten Richtung für die *ganze* erste interaktive Schale
   (≤ 1,2 MB komprimiert), und der Sitzbrief nannte `design/spikes/assets/` — nicht eine Ebene
   darüber. Ich habe die Gegenwette gesetzt (alles CSS/Inline-SVG) und dafür keinen einzigen
   Kunstmoment; das ist kein besseres Ergebnis, nur ein anderes Loch.

5. **Nebenläufigkeit ist in beiden A-Sitzen unbelegt.** §4 (Strukturbrief, `409 STALE_SPINE`,
   Rebase, Umbettung) ist der Teil des Kandidaten, der laut §9.3 am ehesten gehasst wird — und
   *„4 am Tisch"* ist bei A2 eine Anzeige, kein zweiter Schreiber. Bei mir existiert er gar nicht.
   Die Runde sollte das nicht als Auslassung der Sitze verbuchen, sondern als **offene Spike-Schuld
   des Kandidaten**.

6. **Sachlicher Widerspruch zwischen den Sitzen, der geschlichtet gehört, nicht gemittelt:** Bei
   mir ist **Ossa eine ausgetretene Autorin** (Verfassung `austritt: bleibt_kanon`, entsättigte
   Scheibe, Zuschreibung erhalten) — so liest `product-A.md` §2 die graue Scheibe *„Ossa · bis
   2029"*. Bei A2 ist Ossa laut Leak-Bench-Notiz eine **Nichtspielerfigur**, deren *Spielerin* 2029
   ausgetreten ist, trägt aber trotzdem eine Autorenscheibe. Beides gleichzeitig geht nicht. Das
   ist keine Geschmacksfrage: an Ossa hängt §6.5 (wem gehören die Absätze einer Ausgetretenen) und
   damit ein GDPR-Pfad. Eine der beiden Lesarten muss in die Lineage.

7. **Zweiter Leser, zweite Wette.** A2s Vesper verliert einen Absatz (`entfallen 1`); meine Vesper
   verliert vier und damit **Seras Scheibe vollständig** — kein Name, keine Zahl, kein
   „1 weiterer Autor", Volltextsuche nach „Sera" ergibt 0 Treffer. Ich halte meine für die
   schärfere Fassung von §6.4 („die Byline ist ein Orakel"), aber A2s ist die realistischere
   Tischsituation. Das ist ein echter Dissens über die Vorführdaten, nicht über die Doktrin.

## Was es kosten würde, das echt zu bauen

Der Prüfstand ist im Kern eine CI-Suite, die zufällig in der Seite steht — und das ist ein
Kompliment. Billig und sofort übernehmbar: Kontrastvalidierung im Theme-Build, DOM-Signatur-Diff
über alle Skins als Snapshot-Test, Vokabularzählung als Lint. Teuer und **nicht** UI-Arbeit: die
Leak-Bench gegen den **Antwortkörper des Servers** statt gegen den Browser-DOM, plus eine echte
Barrierefreiheitsbaum-Serialisierung. Genau dort fand Runde 2 acht Lecks in 3.700 Zeilen, und genau
dort verdoppelt Der Konvent die Fläche (§9.4). Diese Hälfte gehört Athena und ist Monate, nicht
Tage — und keiner der beiden Sitze hat sie geliefert. Wer den Prüfstand als „Sicht ist bewiesen"
liest, liest ihn falsch; beide Spikes rendern im Browser und beweisen deshalb eine **Absicht**,
keine Durchsetzung. A2 sagt das an mehreren Stellen selbst; ich habe es in meiner Linsenkarte
stehen. Das sollte im Verdikt stehen bleiben, nicht weggeglättet werden.
