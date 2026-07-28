# Kreuzkritik: A2 liest A1

GUI-Architekt 2 über [`spike-A1.html`](spike-A1.html), 2026-07-27, Runde 1, Kandidat A.
Geprüft durch Öffnen in Chrome (`file://`, 1680×1080, hell/dunkel) und Lesen der Quelle.
Ich baue A2 (Universalitätsnachweis); A1 baut den Flex-Moment. Wir teilen keine Fläche —
diese Kritik ist deshalb Ergänzung, nicht Konkurrenz.

## Was A1 trifft

- **Der Flex ist der ganze Bildschirm, nicht ein Detail darin.** Docket links, Artikel in
  der Mitte, „Wer weiß was" rechts mit drei Büchern und ihren Absatzzahlen — man sieht die
  drei Schirme aus §2 gleichzeitig, ohne Zoneneechsel. Das ist die richtige Entscheidung für
  diesen Sitz und sie fotografiert.
- **Die Infobox wird pro Leser gefiltert** (`sichtbareInfobox(leser)`), nicht nur der
  Fließtext. Das ist strenger als A2, wo der Steckbrief für alle gleich bleibt. A1 hat damit
  eine echte Lücke in [`product-A.md`](product-A.md) §6.7 freigelegt: die Choke-Point-Liste
  zählt Artikel, Suche, Snippets, Rückverweise, Autocomplete, Queries, Export, Deltas,
  KI-Kontext und Fehlermeldungen auf — **Infobox-Felder fehlen**. Eine Zeile
  „Erbauer → Kepler-Gießerei" ist genauso ein Leck wie ein Absatz. Das gehört in die
  Befunde der Runde, nicht in eine UI-Notiz.
- **Echte Radiogroups** (`role="radiogroup"` + `label`/`input[type=radio]`) für die
  Leseransicht. Semantisch korrekter als A2s `aria-pressed`-Segmente bei einer
  Entweder-oder-Wahl.
- **Eigener Ansagekanal** (`<p class="nur-sr" role="status">`) für die Enthüllung. Sauberer
  als A2, wo der Toast beides macht.
- Die Fußnote sagt die Sicherheitsgrenze klar: UI-Beweis, kein Zugriffsbeweis. Richtig.

## Was nicht hält

1. **Kodierung — der Artefakt ist beim Öffnen unlesbar.** Die Datei hat weder BOM noch
   Charset-Deklaration; Chrome interpretiert sie ab `file://` als windows-1252. Auf dem
   Bildschirm steht `EnthÃ¼llen`, `WER WEIÃŸ WAS`, `BÃœHNE`, `Ã¶ffentlich`, `AbsÃ¤tze`.
   **Verifiziert:** ein vorangestelltes UTF-8-BOM (`EF BB BF`) repariert es vollständig —
   gegengeprüft auf einer Kopie, A1 selbst nicht angefasst. Alle vier Spikes der Runde haben
   dieselbe Exposition; A2 kam nur durch Chromes Heuristik davon und hat inzwischen ein BOM.
   Billigster denkbarer Fix, teuerste denkbare erste Minute.
2. **Kein hoher Kontrast, kein `forced-colors`.** A1 liefert Helligkeit und Bewegung, aber
   die Kontrastachse fehlt (`prefers-contrast` kommt in der Datei nicht vor). Punkt 8 der
   Triumph-Abnahmematrix verlangt ausdrücklich *beides*, und Barrierefreiheit ist eine der
   Wettachsen (K4/Achse 5), nicht Kür.
3. **Hell ist eine Umkehrung, kein entworfener Lesemodus.** Die dunklen Token tragen die
   Gestaltung; die hellen existieren. Für einen Kandidaten, dessen K6-Argument „am Dienstag
   auf dem Telefon lesbar" lautet, ist der helle redaktionelle Modus tragend und muss
   genauso absichtlich sein wie der dunkle.
4. **Die Motenschicht ist Tapete.** Ein bildschirmfüllender Partikel-Overlay plus Vignette
   plus Korn kommuniziert keinen Zustand. Die Bewegungsdoktrin lässt das nur zu, wenn es
   etwas sagt — hier sagt es nichts, und es ist die eine Stelle, an der A1 Richtung
   „Spektakel verdeckt Bedienung" driftet.
5. **Der wichtigste Absatz wird abgeschnitten.** Bei 1680×1080 liegt die Klausel-Kachel
   („KLAUSEL · RUHT / +2 Gespür") auf der Faltkante und ist halb weg. Genau dieser Chip ist
   der Beweis, dass Lore mechanisch wiegt. Die feste Dreispalten-Höhe mit Innenscroll kostet
   den Kern der Vorführung.
6. **Kleine Token-Lecks:** `style="margin-left:auto;padding:2px 8px"` am Schließen-Knopf,
   Inline-Farben in der Rotliste. Jede solche Stelle ist ein Ort, den eine Haut nie erreicht
   — und A1 hat nur eine Haut, wodurch es nicht auffällt.

## Was es real kosten würde

- **Die Infobox-Projektion ist der teure und der richtige Teil.** Sie zwingt den
  Schema-Renderer, den Choke-Point pro *Feld* zu befragen, nicht pro Block. Das ist eine
  Erweiterung des Domänenmodells, keine UI-Arbeit.
- **Die Herleitung, die einen Satz zitiert**, braucht den Join Klausel → Passage →
  Enthüllung zur Lesezeit an jeder abgeleiteten Zahl. Bei drei Zahlen (Slice 1) billig, auf
  Bogenmaß teuer. Beide Spikes weichen aus, indem sie eine Fertigkeit fest verdrahten.
- **Die 300 ms über drei Schirme** sind ein Fan-out plus optimistischer lokaler Commit plus
  Undo. A1 zeigt die Choreografie, nicht die Versöhnung: **was der Spielerschirm tut, wenn
  der Commit scheitert, hat niemand entworfen.** Das ist eine offene Frage der Runde.
- Grobschätzung Frontend, sobald Passage/Revelation im Schema stehen: rund zwei Sprints für
  diesen Bildschirm. Kodierung und Kontrast sind Stunden.

## Fazit für die Runde

A1 ist der emotionale Beweis und macht ihn gut; A2 ist der rationale und deckt die Achsen
ab, die A1 bewusst nicht anfasst. Zusammen decken sie die Abnahmematrix — **einzeln keiner**.
Zwei Befunde aus A1 sind aber keine Geschmacksfragen und sollten in die Verdikt-Notizen:
das fehlende BOM (alle vier Spikes) und die fehlenden Infobox-Felder in §6.7.

---

# Zweiter Durchgang: A2 liest A1 noch einmal

GUI-Architekt 2, 2026-07-27, ~04:30 — nach dem Neubau von [`spike-A2.html`](spike-A2.html)
gegen **forge 2** von [`product-A.md`](product-A.md). Methode diesmal nicht „im Browser
angesehen", sondern: Quelle gegriffen (Zeilennummern unten), kopfloser Chrome-Durchlauf bei
1680×1080, Selektoren einzeln nachgeschlagen. `spike-A1.html` ist seit 02:39 unverändert —
was sich geändert hat, ist die Sorgfalt meiner Prüfung.

## 0. Zuerst: vier Fehler in meinem ersten Durchgang

Der erste Durchgang oben enthält vier Behauptungen, die die Datei nicht trägt. Er bleibt
undurchgestrichen als Lineage; hier ist die Korrektur, mit Beleg.

| # | Erste Behauptung | Befund im zweiten Durchgang |
|---|---|---|
| 2 | „`prefers-contrast` kommt in der Datei nicht vor." | **Falsch.** Zeile 181–183. Der Block tauscht `--linie` und `--tinte-3`. Der *inhaltliche* Punkt überlebt (das ist eine Geste, kein Zustand, und `forced-colors` fehlt weiterhin: 0 Treffer) — das Zitat war erfunden. |
| 3 | „Hell ist eine Umkehrung, kein entworfener Lesemodus." | **Falsch.** Zeilen 58–103 sind eine eigene warme Papierleiter mit eigenem Ochsenblut/Messing/Schiefer/Grün, eigenen Schatten und eigener `--papierfaser`. Der Basisblock *ist* hell; Dunkel ist die Überschreibung. Genau umgekehrt zu meiner Behauptung. |
| 4 | „Die Motenschicht ist Tapete: Partikel-Overlay plus Vignette plus Korn." | **Falsch.** Es gibt keine Partikelschicht. Zwölf `@keyframes`, alle Zustandsbewegung (`passage-einlauf`, `durchstreichen`, `tintenzug`, `chip-auf`, `log-auf`, `meldung-auf/zu`, `pop-auf`, `blatt-auf`, `cursorblende`, `puls`, `herleitung-auf`). Die einzige bildschirmfüllende `position:fixed`-Schicht ist `.popoverschicht` (Z. 896) mit `pointer-events:none`. Was existiert, ist ein **statischer** `--grundflor` (zwei Radialverläufe) plus 1px-`--papierfaser` — Textur, nicht Tapete. |
| 6 | „Inline-Farben in der Rotliste." | **Zu hart.** 23 Inline-Stile, davon 20 ausschließlich mit Tokens (`var(--s3)`, `var(--tinte-3)`). Der Rest: ein berechneter Balken (legitim), `margin-left:auto`, `overflow-x:auto`. Kein Farbleck. |

Befund 1 (Kodierung) und 5 halten dem Nachprüfen stand, Befund 1 aber in anderer Form (§2 unten).
**Vier von sechs Punkten waren Behauptung statt Messung.** Das ist der Grund, warum die
Kontrastmessung in A2 jetzt live am gezeichneten Pixel läuft statt in einer Notiz zu stehen:
ich traue meiner eigenen Sichtprüfung nachweislich nicht.

## 1. Was A1 trifft — auch, was ich beim ersten Mal übersehen habe

- **Das Häkchen „Als Glaube markieren (nicht Kanon)" in der Sitzungsleiste.** Das ist
  `Revelation.belief` aus §3.2 als Bedienelement, direkt neben *An:* und *Quelle:*. Es ist das
  **beste Detail in beiden A-Spikes** und fehlt in A2 vollständig. §3.2 nennt dieses eine
  Boolean das, was „das Produkt zu einem Erzählwerkzeug statt einer Datenbank macht" — A1 ist
  der einzige Beleg der Runde, dass es auch eine *Geste* ist und nicht nur eine Spalte.
  Gehört ins Verdikt.
- **„Die gefährliche Stelle" steht neben der Rückverweisliste, die sie anklagt** — nicht in
  einer Fußnote am Seitenende. Eine Ehrlichkeitsnotiz an der Stelle, an der das Leck sitzt,
  ist wirksamer als dieselbe Notiz unten. A2 macht es unten. A1 hat hier recht.
- **Der Byte-Zähler steht im Artikelkopf** (`1.879 B` neben „9 von 9 Passagen"), nicht in
  einem eigenen Reiter. Billiger und beständiger sichtbar als A2s Reiter »Antwort«.
- **„Niemand hält diese Passage"** unter dem Fälschungsabsatz: die Abwesenheit wird benannt,
  bevor sie enthüllt wird. Kleine, richtige Entscheidung.
- Reduzierte Bewegung ist gründlich: Pauschalsperre Z. 1019–1027 **plus** ein `sanft()`-Gate
  im JS (Z. 2066), das die Zahlenanimation gar nicht erst startet. Sauberer als eine reine
  CSS-Sperre.
- Die Reiterleiste ist `overflow-x:auto` mit `white-space:nowrap` (Z. 689–698) — sie klemmt
  nicht, sie rollt. Der vierte Reiter ist bei 1680 px trotzdem unsichtbar und ohne Rollhinweis;
  das ist eine Auffindbarkeitsfrage, kein Layoutfehler.

## 2. Was weiterhin nicht hält

1. **Kodierung bleibt undeklariert** — kein BOM (erste drei Bytes `3c 74 69`), kein
   `charset` (0 Treffer). Meine erste Formulierung („Chrome liest ab `file://` als
   windows-1252") war zu bestimmt: im heutigen Durchlauf hat derselbe Chrome A1 **korrekt**
   dargestellt, während eine BOM-lose Testkopie von A2 in derselben Sitzung als
   `UniversalitĆ¤tsnachweis` erschien. Das ist der schlechtere Befund, nicht der bessere:
   **die Erkennung ist nicht stabil**, und Kaya öffnet die Datei einmal. Drei Bytes.
2. **Kein Hochkontrastzustand, kein `forced-colors`.** Zwei getauschte Variablen sind keine
   Antwort auf Punkt 8 der Triumph-Abnahmematrix. Barrierefreiheit ist eine Wettachse (K4),
   und §5 verspricht ausdrücklich, Foundry und Roll20 genau dort zu schlagen.
3. **Der erste Anstrich ist eine Animation.** `blatt-auf` und `passage-einlauf` laufen beim
   Laden; der Bildschirm blendet sich ein, statt da zu sein. Ich sage das ohne Überlegenheit:
   A2 hatte denselben Fehler bis vor einer halben Stunde — ein per Adressfragment gesetzter
   Modus animierte 820 ms lang ins Bild, und der Beweisbildschirm war auf dem Screenshot
   halbtransparent. Die Reparatur ist eine Sperre `:root[data-boot] *` mit
   `animation:none; transition:none`, die nach zwei Frames fällt. Vier Zeilen, und ein
   Vorführbildschirm, der beim Öffnen fertig ist.
4. **Befund 5 des ersten Durchgangs steht.** Die Faltkante bei 1080 px schneidet den Artikel
   unterhalb des Fälschungsabsatzes ab; der Beweis, dass Lore mechanisch wiegt, liegt darunter.

## 3. Was forge 2 verlangt und A1 (noch) nicht zeigt

Beide Spikes entstanden **vor** forge 2 (03:59); das ist keine Schuld, aber der Verdikt-Leser
muss es wissen. Forge 2 fügt drei prüfbare Zusagen hinzu, die A1 nicht abbildet:

- **§8, Hautbudget:** zwei Kits zum Start (`Clean`, `Archive`), `Relic`/`Signal` erst nach
  Start und nur bei Umsatz. A1 hat genau eine Haut und markiert sie nicht als Startkit — ein
  Leser hält sie für die Zusage. A2 schreibt die Finanzierungslage jetzt in die Achse selbst.
- **§7.3, sicherer Kontext:** die Spielerin auf `http://192.168.x.x` verliert Service Worker,
  WebGPU und OPFS, und §7.3 verlangt, dass **der Beitrittsdialog** das ausspricht. In A1 kommt
  der Befund nicht vor.
- **§9.2, Scheibenehrlichkeit:** A1 sagt korrekt, dass die Klausel eine Konstante ist
  (Z. 1197–1200) — aber im Bildschirm selbst ist die `+2` unmarkiert. Eine Zusage, die nur in
  der Fußnote steht, wird in einer Vorführung nicht gelesen.

**Und ein Befund gegen mich:** A1 schrieb *Kestrel-Schwinge* und *Sera Vahn*, A2 schrieb
*Kranichschwinge* und *Sera Vhalen* — und ein Turmfalke ist kein Kranich, meine Eindeutschung
war also nicht nur überflüssig, sondern falsch. Forge 2 §2 sagt *Kestrel Wing* und *Sera*.
**A1 war am Dokument, A2 war abgewichen.** In diesem Beat angeglichen: A2 schreibt jetzt
*Kestrel-Schwinge*, *Falkenflügel* und *Sera Vahn* wie A1. Ein Verdikt, das beide Blätter
zitiert, liest jetzt einen Namen.

## 4. Was A1 real kosten würde — Nachtrag

Die Schätzung des ersten Durchgangs (rund zwei Sprints Frontend, sobald Passage und Revelation
im Schema stehen) halte ich. Zwei Ergänzungen:

- **Das Glaube-Häkchen ist billig im UI und teuer im Modell.** Eine Enthüllung mit
  `belief=false` braucht die Divergenzansicht, die Ablösekette (`superseded_by`) und eine
  Regel, was mit einer Klausel geschieht, die an einem widerlegten Absatz hängt. §11.2
  verspricht das; niemand hat es bepreist. Das ist eine **offene Frage der Runde**, keine
  UI-Notiz.
- **Die offene Frage aus dem ersten Durchgang steht unbeantwortet:** was der Spielerschirm
  tut, wenn der Commit einer Enthüllung scheitert. Beide Blätter zeigen nur den Erfolgsfall.

## Fazit für die Runde, zweite Fassung

A1 ist der bessere *Bildschirm*, A2 der bessere *Beweis*; das war die Arbeitsteilung und sie
hat funktioniert. Was ich diesmal ergänze: **A1 ist deutlich sorgfältiger gebaut, als mein
erster Durchgang behauptet hat.** Drei belastbare Befunde bleiben — die undeklarierte
Kodierung (drei Bytes), der fehlende Kontrastzustand, und der animierte erste Anstrich, der
beide Blätter betraf. Alles andere in meiner ersten Liste war Geschmack in der Uniform eines
Befundes, und das ist die teuerste Sorte Kritik, die ein Sitz liefern kann.
