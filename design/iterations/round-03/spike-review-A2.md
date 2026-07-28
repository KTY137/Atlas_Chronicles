# Cross-Review: `spike-A1.html`, gelesen von GUI-Architekt 2

*Runde 3. Sitz 2 (Universalitätsprobe) über Sitz 1 (der Beweis-Moment). Am Quelltext gelesen,
nicht am Bildschirmfoto; jede Behauptung unten hat eine Zeilennummer.*

## Was es trifft

**1. Die schärfste Orakel-Regel in beiden Dateien steht bei ihm.** `renderProsa()` überspringt
Abschnitte ohne sichtbare Passage — *„leere Überschrift wäre selbst ein Orakel"* (Z. 1602) — und
`renderDiagnose()` schreibt die Begründung dazu: *„Ordinalzahlen neu vergeben: 1…n. Keine Lücke,
aus der sich zählen ließe."* (Z. 1807). Die Neuvergabe der Ordinalzahlen habe ich unabhängig
genauso gebaut. **Die leere Überschrift habe ich übersehen**, und sie ist echt: „Die stillen Jahre
(1288–1294)" ohne Absatz darunter beantwortet die Frage, die der Absatz verschweigen sollte.
Das gehört in jede spätere Fassung, aus welcher Datei auch immer.

**2. Das Enthüllungsblatt ist das beste einzelne Bauteil der Runde.** Byte-Vorschau,
Empfängergitter mit den Anwesenden vorausgewählt, 4-Sekunden-Abbruch mit Zählring, und der Satz
*„Bis zur Bestätigung hat nichts den Server verlassen."* (Z. 1406–1417). Das ist §3.3 des
Kandidaten als Foto, in einem Blick verständlich, ohne Erklärtext daneben. Ich habe die
Ratifikation als drei Tasten gebaut und den Enthüllungspfad nur protokolliert — an dieser Stelle
ist A1 mir sichtbar überlegen.

**3. Die Verfassungskarte erklärt `austritt: bleibt_kanon` in zwei Sätzen** (Z. 1373) — *„einen
Absatz aus einer gemeinsamen Welt zu entfernen ist eine andere Handlung als einen Namen zu
entfernen"*. Das ist §6.5 als Oberfläche, an der einzigen Stelle, an der ein Mensch danach fragen
würde. Bei mir steht diese Tatsache **nirgends**.

**4. FLIP beim Umprojizieren** (Z. 1592–1628): die Seite ordnet sich um, sie lädt nicht neu.
Zusammen mit dem ehrlichen Nachtrag (Z. 1378–1385: Timos Satz stimmt über *diese Seite*, nicht
über *diesen Tisch*) ergibt das eine Haltung, die man nicht nachträglich einbauen kann.

**5. Null Bilddateien, alles CSS und Inline-SVG.** Unkaputtbar portabel — und, siehe unten, genau
deshalb an einer Stelle blind.

## Was es fingiert — oder jedenfalls nicht zeigt

**1. Die Leck-Prüfung kann nicht scheitern, weil ihre Nadeln fest verdrahtet sind.**
Z. 1781–1782: `text.match(/Sera/g)` und `text.match(/zweiter Ring/g)`. Zwei vom Autor gewählte
Zeichenfolgen für einen Datensatz. Kommt morgen eine zwölfte Passage dazu, meldet die Diagnose
weiterhin grün und sagt über den neuen Absatz **nichts**. Meine `verbotenesGut()` leitet die
verbotene Menge aus der Projektion selbst ab, und genau deshalb schlägt sie im Vorführmodus mit
10 DOM-Treffern und 793 Bytes an. **Eine Prüfung, die nicht scheitern kann, ist Zierrat.**
Reparatur: rund fünfzehn Zeilen — die Nadeln aus `PASSAGEN.filter(p => !haelt(p, S.leser))` bauen.

Nebenbei ein kleiner echter Fehler: die Zeile *„Volltext «Sera» in Prosa, Infobox, Leiste"* wird
mit `gruen = (sera === 0)` gefärbt (Z. 1790). In fast jeder Projektion **darf** „Sera" dort stehen —
sie hat sichtbare Absätze und eine Byline. Die Zeile zeigt also einen Fehlzustand an, wo keiner
ist, und trainiert den Leser darauf, Rot zu ignorieren.

**2. Der Suchraum lässt den Rand aus** (Z. 1778–1780, mit Kommentar). Für die Spielleitung ist das
richtig — Antragsspur und Konventspiegel sind ihr Apparat. Es heißt aber, dass A1 **Auslassung im
Blatt** vorführt und nicht **Auslieferung an einen Sitz**: Kayas Apparat und die Projektion der
Leserin stehen im selben Dokument. Ich habe dieselbe Grenze auf Rollen-Ebene beantwortet
(`rolle=beobachter` liefert weder Rand noch Byline noch Autorenzeile; `w-scheiben = 0`). Zugriffs-
beweis ist keines von beiden, und A1 sagt das sauber (Z. 1354).

**3. Eine Kombination, nicht eine Achse.** Ein Skin, eine Welt, eine Rolle, kein Kontrastschalter,
kein Bildwerkschalter, keine langen Beschriftungen. Von der Akzeptanzmatrix in `03` erfüllt A1
Punkt 8 (reduzierte Bewegung) und die Hell/Dunkel-Hälfte von Punkt 7; die Punkte 1, 2, 3, 9 sind
nicht adressiert. **Das ist Arbeitsteilung und kein Vorwurf** — es ist mein Sitz. Der Verdict darf
A1 nur nicht als *„das Bild des Produkts"* zitieren, sondern als das Bild **eines** Zustands.

**4. Weil die Kunst nicht kaputtgehen kann, ist sie auch nicht geprüft.** Kein `<img>` heißt: kein
Fehlbild-Pfad, kein „Bildwerk aus", kein Theme-Manifest unter Last. Ausgerechnet die zwei Zustände,
an denen sich entscheidet, ob die Manifest-Architektur aus `03` trägt, sind strukturell unerreichbar.
Der Relic-Look ist Handsatz für diese eine Seite, nicht ein Kit aus einem Manifest — dieselbe
Kritik wie in Runde 2, unverändert. (Meine Antwort darauf ist selbst nicht gratis, siehe unten.)

**5. „Skin" wird behauptet, nicht gezeigt.** `data-theme` tauscht zwei Paletten **eines** Skins.
Die Zusage aus `03` — *Relic · Signal · Archive · Clean bei gleichem Bauteilvertrag* — bleibt in
A1 unberührt. Ein zweiter Skin hätte dort etwa achtzig Zeilen Tokens gekostet und die Zusage von
einer Behauptung zu einer Messung gemacht.

## Was es in echt kosten würde

- **Innerhalb der Slice-1-Liste aus `product-A.md` §10:** Antragsspur, Enthüllungsblatt,
  Autorenleiste, Rinnenscheiben, geteilte Infobox, Konventspiegel-Tabelle, Verfassungskarte.
  A1 zeigt, dass diese Bauteile klein sind — das ist ein belastbares Ergebnis der Runde.
- **Nicht enthalten und in A1 auch nicht sichtbar:** der Skin als Manifest (9-Slice, Ersatzsignet,
  Kontrastvalidierung über die Tokenmatrix). Das kostet dort, wo `03` es hinschreibt, nicht hier.
- **Die Zahl, die weiterhin niemand hat:** Barrierefreiheit auf einer *schreibbaren* Fläche.
  A1 hat in dieser Runde keinen Editor — richtig für ein Flex-Blatt —, aber §4.2 legt ein CRDT auf
  genau diese Fläche, und weder A1 noch A2 fasst sie an. Der Falsifizierer bleibt unberührt und
  beide Spikes sollten das im Verdict so stehen lassen.

## Empfehlung an die Runde

Die beiden Artefakte streiten nicht, sie ergänzen sich, und diesmal überprüfbar: **A1 beweist, dass
der Moment schön ist, A2 beweist, dass er überall derselbe ist und dass die Prüfung scheitern kann.**

Übernehmen aus A1 in jede spätere Fassung: (a) die unterdrückte leere Abschnittsüberschrift,
(b) das Enthüllungsblatt mit Byte-Zähler und 4-Sekunden-Ring, (c) die `austritt`-Erklärung in der
Verfassungskarte.
Übernehmen aus A2 nach A1: die Leck-Nadeln aus der Projektion ableiten statt sie zu tippen
(~15 Zeilen), und einen zweiten Skin, damit „Skin" eine Messung wird.
