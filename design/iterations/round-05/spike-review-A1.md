# Kreuzprüfung — GUI-Architekt 1 liest `spike-A2.html`

*Runde 5 · Kandidat A · geschrieben nach Fertigstellung von `spike-A1.html`, gelesen als Code und als
Entwurf, im Browserdokument geprüft (jsdom, Canvas-Stub, alle Achsen durchgeschaltet).*

---

## Was es trifft

**1 · Die Rung ist echt und sie ist an der schwersten Stelle gebaut.** A2 rendert eine Leinwand mit
Raster (Quadrat · Hex · rasterlos, alle drei belegt), Fangstufen, Höhe als Skalarband, Zugfolge,
Nebel und einer Freigabe mit Differenzriegel — **und schaltet dieselbe Leinwand über drei
Weltpakete** (`eron` → `kepler` → `nebelakte`, Wurzelattribut `data-welt`). Das ist die härtere
Aufgabe von uns beiden: mein Sitz musste eine Karte bauen, seiner musste beweisen, dass es
*dieselbe* Karte ist. Der Weltwechsel funktioniert im Dokument, ohne DOM-Umbau, mit
unveränderter Steuerleiste. Das ist die Universalitätsprüfung, die K7 verlangt, und sie ist nicht
behauptet, sondern durchgeschaltet.

**2 · `id="keineKarte"` ist der beste einzelne Zug in der Datei.** A2 hat einen expliziten,
gestalteten Zustand für den Ort **ohne** Karte — und das ist genau RB-21a §3.4 („die Tafel *ist* die
Karte für jeden Ort ohne eine"), am Importtag also für 100 % der Orte. Ein Kandidat, der die
Leinwand endlich baut, hat die stehende Versuchung, die Tafel zum Rückfall zu degradieren. A2 tut das
Gegenteil und macht den kartenlosen Ort zu einem entworfenen Bildschirm. Meine Datei hält die Tafel
zwar gleichrangig, aber sie hat diesen Zustand **nicht** — das ist ein Punkt für A2 gegen mich.

**3 · Acht unabhängige Achsen als Wurzelattribute, vor dem ersten Bild gesetzt.**
`welt · skin · rolle · thema · kontrast · motion · etiketten · art` — jede einzeln schaltbar, jede
als `data-*` auf der Wurzel. Vier Skins gegen meine zwei. Der `art="fehlt"`-Schalter (fehlendes
Artwork als Zustand, nicht als Unfall) ist ein Punkt aus der Akzeptanzmatrix von
`03-triumph-ui-direction.md`, den ich schlicht nicht bediene.

**4 · Es misst, statt zu behaupten.** „Kein Screenshot behauptet etwas" — Bildzeit, Nebelzeit,
**Bauteilsignatur über drei Weltpakete**, Kontrast über **144 Paare**, Überlauf bei 380 px. Die
Bauteilsignatur ist die klügste Messung in beiden Dateien: sie vergleicht die *Struktur* nach dem
Weltwechsel und macht damit „dieselbe Komponente" fälschungssicher. Ich messe mehr Zahlen, aber
keine ist so schwer zu schummeln wie diese.

**5 · Es sagt seine eigenen Grenzen laut.** Der Kasten „Alle Projektionen liegen in dieser Datei im
Client. Das ist ein UI-Beweis, kein Zugriffsbeweis — S-P1, ungebaut seit fünf Runden" steht **im
Dokument**, nicht in einer Fußnote. Ebenso die Nicht-Liste (Kachelpyramide, KTX2, Stempel, Atlas,
Pinsel, dynamische Sichtlinien, Scene Levels, UVTT-Export). Das ist die Redlichkeit, die diese
Linie auszeichnet.

---

## Was es vortäuscht — oder wo es dünner ist, als es aussieht

**1 · `data-thema` statt `data-theme` — eine Verletzung einer *bindenden* Bauregel.**
Die Auftragsregel nennt wörtlich `:root[data-theme="dark"]` / `:root[data-theme="light"]`. A2
benutzt durchgehend `data-thema`. Die *Absicht* ist erfüllt (das Attribut schlägt
`prefers-color-scheme` in beide Richtungen, im Dokument geprüft: `thema=dark` greift bei heller
Medienabfrage), aber jedes externe Werkzeug, jeder Screenshot-Harnisch und jede Kreuzprüfung, die
gegen den Wortlaut testet, meldet **false**. Das ist billig zu reparieren und teuer, es stehen zu
lassen.

**2 · Die Prosa ist dünn. Der Korpus ist Ortsnamen, nicht Text.** Ich zähle `Bjoldiri` 14×,
`Zwerg` 3×, aber **kein** `Hochelfenrat`, **kein** `Arvex Aurelius Paradon`, **kein**
`Gotteserhöhung`, **kein** `Silberwahnsinn`, **keine** Infobox-Feldzeile im Original-Wortlaut.
A2 nimmt aus dem echten Korpus vor allem die **Toponyme** (Das Tor, Fackelmarkt, Kupferleute) und
baut daraus eine Ortsgliederung. Das ist legitim für eine Karte — aber der Korpus-Befund, der laut
Auftrag der wahrscheinlichste Fehler dieser Runde ist (**die geteilte Infobox ist das MODELL, nicht
die Garnitur; 583 Feldzeilen; `Arvex` mit 18 Zeilen und null Prosa**), wird auf dieser Fläche nicht
geprüft. Ein Layout, das nur an Ortsnamen getestet wurde, ist am Renderer-Härtefall nicht getestet.
Mein Sitz trägt diesen Test (drei Artikel: 2.654 B mit Prosa, 1.067 B ohne jede Prosa, 3 B
Gesamtinhalt „Die"); der seine trägt die Universalität. Zusammen decken wir es ab — **einzeln tut es
keiner von uns beiden.**

**3 · Der Differenzriegel bleibt im Ruhezustand leer.** `#diffListe` und `#freigabeAudit` sind beim
Laden leer und füllen sich erst nach einer Auswahl; im Dokumenttest blieben sie auch nach
`#btnFreigeben` leer, weil vorher ein verdeckter Ort gewählt sein muss. Das ist kein Fehler, aber es
ist eine **verschenkte erste Sekunde**: das Stärkste der ganzen These (man *sieht*, wem ein
Tastendruck was beibringt) steht nicht auf dem Bildschirm, den man öffnet. Ich habe in meiner Datei
genau deshalb den Riegel beim Start scharf gestellt.

**4 · Vier Überschriften auf der ganzen Seite.** `h3 Blattheim`, `h3 Die Tafel`, `h3 Figuren im
Ausschnitt`, `h3 Ausgewählt` — kein `h1`, kein `h2`. Bei 65 `aria-*`-Attributen und einer erklärten
Barrierefreiheits-als-Architektur-Haltung ist die **Überschriftenhierarchie die eine Sache, die ein
Screenreader-Nutzer zur Navigation zuerst benutzt**, und sie fehlt praktisch. Das ist eine echte
Lücke, keine Stilfrage. (Meine Datei hat dasselbe Problem in kleinerer Form — beide Sitze sollten
das in Runde 6 reparieren.)

**5 · `Schleuse` kommt zweimal vor, `Vormerkung` null Mal, `Mandat` null Mal, `Zusammenlegung` null
Mal.** Das ist sitzgerecht — A2 ist die Universalitätsprüfung, nicht der Flex —, aber es heißt: **die
drei Vortragsfeatures dieser Runde sind in A2 nicht auf dem Schirm.** Wer nur A2 öffnet, sieht die
Rung erfüllt und das Level-Up in Features nicht. Die Runde braucht beide Dateien; das sollte der
Verdikt-Text ausdrücklich sagen, statt eine der beiden als „die" Antwort zu behandeln.

---

## Was es für echt kosten würde

Ehrlich geschätzt gegen `product-A.md` §10.4:

- **Die Leinwand selbst** (MapRenderer-Grenze, Pixi, Eingabe-Abstraktion, Einzelbildszene, Marken
  mit Fangen ×3 und Höhe, Nebel als abgeleitete Vektormaske, Zugfolge, Perf-Harnisch): **die
  veranschlagten 23 Entwicklertage sind plausibel** — aber nur unter der Voraussetzung, die A2 selbst
  nennt: **S-T1 ist ungelaufen.** Was A2 zeigt, ist eine 2D-Canvas-Skizze mit einem Dutzend Polygone.
  Die 23 Tage sind für Pixi, für die Budget-Szene und für 300 Marken. Der Sprung von hier nach dort
  ist der teuerste unbelegte Schritt der Datei — und das gilt für meine genauso.
- **Die drei Weltpakete als echte Achse** (Inhaltspaket entkoppelt von Skin, Rolle, Kontrast):
  im Produkt nicht die Datenmenge, sondern die **Disziplin**. Kostet keine Tage, kostet einen
  Gate — und A2 liefert diesen Gate (Bauteilsignatur) mit. **Das ist billiger als jede
  Feature-Zeile in §10.4 und wertvoller als die meisten.**
- **`keineKarte` als vollwertiger Zustand:** ≈1 Tag. Lächerlich billig gegen das, was er
  am Importtag rettet.
- **Was A2 *nicht* baut und was das Teure ist:** kein Server, keine echte Sichtprojektion, keine
  Persistenz, kein Importer. Die Datei sagt das selbst. S-P1 (zwei Tage, „nicht verhandelbar")
  bleibt der Flaschenhals für beide Sitze.

---

## Ist es ein Level über Runde 4?

**Ja, und zwar unstrittig — aus einem Grund, den man nicht wegdiskutieren kann: Runde 4 hatte in
vier Dateien null `<canvas>`.** `round-04/spike-A1.html`: 0 Canvas, 5 Inline-SVG. `spike-A2.html`:
0 Canvas, 0 SVG. Die Lineage hat vier Runden lang ~120 Entwicklertage taktische Arbeit bepreist und
nie ein Bild davon gezeigt. A2 zeigt eines, es bewegt sich, es hat drei Raster und einen Nebel, der
aus Offenbarungen abgeleitet ist — und es tut das **über drei Welten hinweg**, was in Runde 4
überhaupt keine Kategorie war.

**Optik:** gegen `round-04/spike-A2.html` (326 Token, 0 Canvas, reine Dokumentfläche) ist A2 nicht
nur anders, sondern dichter: 98 Token, vier Skins, Kartentoken, die die Leinwand aus demselben
System speisen wie die DOM. Der Satz aus dem Kopfkommentar — *„Die Leinwand hat keine eigenen
Farben"* — ist die richtige Haltung und in beiden Sitzen unabhängig gefunden worden, was ein gutes
Zeichen für sie ist.

**Wo ich es nicht ganz so hoch hänge:** Runde 4 hat mit `spike-A2` einen Universalitätsbeweis
geliefert, der schon damals stark war; A2 in Runde 5 ist dessen Fortsetzung **plus** Karte. Das ist
ein sauberes Level, aber es ist ein *Aufbau*, kein Bruch. Der Bruch dieser Runde — dass eine zweite
Hand schreibt und ein zweiter Name gedruckt wird — steht in meiner Datei, nicht in seiner. **Die
Runde ist ein Level höher; die beiden Hälften dieses Levels liegen in zwei Dateien und keine der
beiden trägt es allein.**

---

*Zwei Karten, ein Raster —*
*die eine beweist, dass sie überall steht,*
*die andere, wessen Name darunter steht.*
