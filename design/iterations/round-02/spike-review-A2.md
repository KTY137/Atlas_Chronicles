# Cross-Review: `spike-A1.html`, gelesen von GUI-Architekt 2

*Seat 2 (Universalitätsnachweis) über Seat 1 (Der Beweis-Moment). Gelesen am Quelltext, nicht am
Screenshot; die Behauptungen unten sind an Zeilennummern geprüft, nicht erinnert.*

## Was es trifft

**1. Der Blocker ist hergeleitet, nicht getippt.** `mergeGuard` (Z. 907–912) rechnet die
symmetrische Differenz beider Leser-Mengen — unabhängig von mir zur selben Regel gekommen — und
`blockerNode()` erzeugt beide Sätze aus `holdersOf(up)`/`holdersOf(lo)`. Ändert man im Absatz-Apparat,
wer einen Absatz kennt, ändert der Blocker sein Urteil. Das ist der Unterschied zwischen einem
Beweis und einem Bild von einem Beweis.

**2. Die Gewinn-Tabelle schlägt meine Aufzählung.** `Leser | Absatz | Text` (Z. 1082–1083) beantwortet
die Frage eines Zuschauers — *wer bekäme was?* — in einem Blick, mit Absatz-pid als Beleg. Meine
Liste sagt dasselbe in Prosa und ist schwächer. Wenn Runde 3 eine Komponente kanonisiert, dann diese.

**3. Die beste einzelne Zeile in beiden Artefakten** steht in seiner Blocker-Fußzeile:
*„mergeGuard(p_4f9c, p_7b21) · serverseitige Vorbedingung · der Klient darf sie zeigen, nicht
entscheiden.“* Sie nimmt den einzigen Einwand vorweg, den ein Fachfremder gegen einen Client-Blocker
hat, und zwar **innerhalb der Fotografie**. Ich habe dieselbe Aussage in eine Fußnote unter die Seite
geschrieben, wo sie niemand liest.

**4. Der Text ist wirklich ein Text.** Zehn Absätze, darunter ein Zitat mit `belief:false`, eine
zurückgenommene Enthüllung, ein roter Link mit Screenreader-Zusatz *„— Seite noch nicht
geschrieben“* (Z. 685). Dieses letzte Detail ist eine Klasse über dem Durchschnitt: es ist die
Stelle, an der ein Wiki normalerweise Farbe als einzigen Zustandsträger benutzt.

**5. Null externe Ressourcen, kein einziges `<img>`.** Papierkorn per Inline-SVG-Filter, Tablet und
Siegel per CSS. Das Ding ist unkaputtbar portabel.

**6. Ehrlichkeit als Bauteil.** Die aufklappbare Liste (Z. 644–652) nennt sieben echte Grenzen,
inklusive der verkürzten Revisions-Bindung — das ist genau das, was das Runde-1-Urteil verlangt hat.

## Was es fingiert — oder jedenfalls nicht zeigt

**1. Es beweist genau eine Kombination.** Ein Skin (Archive), eine Welt (Aldenfall), eine Rolle,
kein Kontrast-, Label- oder Artwork-Schalter. Von der Triumph-Akzeptanzmatrix (`03`, Punkte 1, 2, 3,
7, 8, 9) prüft es keinen einzigen. Das ist **Arbeitsteilung, kein Fehler** — es ist mein Sitz — und
A1 behauptet nirgends etwas anderes. Der Verdict darf A1 nur nicht als *„das Bild des Produkts“*
zitieren: es ist das Bild *eines* Produktzustands.

**2. Seine Kunst kann nicht kaputtgehen.** Weil alles CSS ist, gibt es weder einen
Fehlbild-Fallback noch einen „Artwork aus“-Zustand. Ausgerechnet die beiden Zustände, die
entscheiden, ob das Theme-Manifest trägt, sind dort strukturell unerreichbar. Schön und teuer
zugleich: die Schönheit ist nicht die versprochene (9-Slice-Kit aus einem Manifest), sondern eine
handgesetzte Sonderanfertigung für diese eine Seite.

**3. Ein echter, kleiner Fehler.** Die Blocker-Überschrift zitiert `g.gains[0].wouldGain` (Z. 1071)
— den Text *eines* Gewinns. Sobald Gewinne in **beide** Richtungen zeigen (oben kennt A, unten kennt
B), nennt der Satz einen Text, während die Tabelle zwei listet. Im Kanon-Fall des Flexes unsichtbar,
im gemischten Fall falsch. Zwei Zeilen Reparatur.

**4. Der Tisch zeigt beide Bücher gleichzeitig.** Das Tablet ist der stärkste Bildeinfall in beiden
Artefakten — und es rendert Seras Projektion **im selben DOM neben Kayas Dokument**. Das ist
offengelegt („kein Zugriffsschutz-Beweis“) und für den Kamerawinkel unvermeidlich; es heißt aber,
dass A1 *Auslassung* nicht vorführen kann, sondern nur *Nebeneinander*. Bei mir rendert je Rolle nur
ein Baum, und der geheime Satz ist im Spieler-DOM messbar abwesend (jsdom-geprüft). Beides zusammen
ist das vollständige Argument; einzeln ist keines davon eins.

**5. `contenteditable` je Absatz.** Wir haben beide dieselbe Vereinfachung gewählt, A1 sagt es sauber
dazu. Es ist trotzdem die teuerste Stelle: ProseMirror hat **eine** editierbare Fläche, nicht zehn.
Fokusführung, Ankunft ohne Re-Render und Screenreader-Verhalten — die Dinge, die beide Artefakte
vorführen — müssen auf dem echten Substrat neu gebaut werden. Keines von beiden preist das.

## Was es in echt kosten würde

Gegen die 28-Tage-Tabelle in `product-A.md` §0.4 gelesen:

- **Innerhalb des Budgets:** Blocker-Komponente, Gewinn-Tabelle, Apparat-Rail, Leser-Discs,
  Marginalien, Rücknahme-Darstellung, roter Link mit a11y-Zusatz. Das sind die 4 Tage
  „Reveal-as-writing-gesture, margin rail, inline blockers“ — A1 zeigt, dass sie realistisch sind.
- **Nicht enthalten und nicht sichtbar:** die Archive-Optik als *Skin* statt als Handsatz. Der
  9-Slice-Kit, die Kontrastvalidierung über die Token-Matrix und die Fallback-Kette sind in A1 nicht
  angefasst; sie stehen in `03` und kosten dort, nicht hier.
- **Die Zahl, die weiterhin niemand hat:** die 5 Tage Barrierefreiheit auf `contenteditable`. Beide
  Artefakte umgehen sie mit derselben Vereinfachung. Der Falsifizierer aus §0.4 („mehr als 10 Tage →
  die Schätzung ist um ~20 % falsch“) bleibt nach Runde 2 unberührt, und beide Spikes sagen das.

## Empfehlung an die Runde

Die beiden Artefakte streiten nicht, sie ergänzen sich, und zwar überprüfbar: A1 beweist, dass der
Moment *schön* ist, A2 beweist, dass er *überall derselbe* ist. Wenn nur eines ins Verdict darf,
nimm A1 für das Foto und diesen Review für die Fußnote — aber schreib dazu, dass die Universalität
an einer anderen Datei hängt. Übernimm aus A1 in jede spätere Fassung: die Gewinn-Tabelle und die
`mergeGuard(...)`-Fußzeile.
