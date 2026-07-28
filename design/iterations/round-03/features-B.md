# Feature-Antwort auf den Angriff — Kandidat B, „Der Abend" (Runde 3)

Feature Architect. Gelesen: [`product-B.md`](product-B.md), [`attack-B.md`](attack-B.md),
[`spike-B1.html`](spike-B1.html), [`spike-B2.html`](spike-B2.html),
[`00-intake.md`](../../00-intake.md), [`RB-11`](../../research/RB-11-steam-vs-browser-verdict.md).

Nemesis' Urteil ist in zwei Sätzen richtig und ich nehme beide an:

> **Die Projektion leckt überall dort, wo sie nicht Text ist** (F2 Marginalie, F3 Abbildung,
> F4 Kardinalzahl, M5 Wandgeometrie) — *und das eine Gate dafür kann für keinen der vier rot werden.*
> **Und das Dokument hält drei Paare von Positionen, die einander verbieten** (F6, F7, F1).

Die erste Familie ist eine **Modelllücke**, keine Sammlung von Bugs: der Kandidat hat drei Runden lang
das Atom *unterhalb der Seite* erkämpft und dabei angenommen, jeder rechtebedürftige Knoten sei ein
Absatz. Die Antwort ist deshalb nicht „vier Fixes", sondern **eine Regel, ein Gate und drei neue
Knotentypen**. Die zweite Familie verlangt Wahlentscheidungen; ich treffe sie hier ausdrücklich und
lösche jeweils die Gegenposition, statt beide zu behalten.

Ich habe außerdem an drei Stellen **Umfang gestrichen**, weil eine Runde, die nur addiert, das
Produkt unversendbar macht (§5).

**Notation:** jede Position trägt *Antwortet auf · Was es ist · Warum jetzt · Kosten · Invarianten.*
Kosten sind **klein** (≤ 2 Tage), **mittel** (3–6 Tage), **groß** (> 6 Tage), ein Entwickler mit
KI-Crew, im Maßstab von §5.6.

---

## 1. Die sieben Fatalen

### 1.1 · Die Randmarke — der Flex hat eine echte Schmalform · *F1*

**Was es ist.** Unterhalb der Marginalie-Schwelle rendert die Herkunftsschicht **nicht als Block**,
sondern als **hochgestellte Sigle im Textfluss**, direkt hinter dem letzten Wort des Absatzes — genau
wie ein Fußnotenzeichen, weil es eines ist. `⚄ 21:14` in 0,7 em, `vertical-align: super`. Kein neues
Blockelement, keine Zeile zwischen zwei Absätzen, kein Rahmen. Antippen öffnet **dieselbe
Beleg-Karte** wie am Desktop, in-flow, als Disclosure. Die Marginalie am Desktop und die Sigle am
Telefon sind zwei Darstellungen **derselben** Sache, und beide sind ein Toggle über einer schönen
Seite.

Die drei Herkunftsklassen bleiben auf dem Telefon unterscheidbar über **drei unabhängige Kanäle** —
Glyphe (`·` getippt, `◇` gesät-und-ausgelöst, `⚄/⌗/❝/§/✝` am Tisch entstanden), Farbe, und
Unterstreichungsstil (keine / gepunktet / durchgezogen). Kontrastmodus nimmt die Farbe, nicht die
Unterscheidung (→ 3.1).

**Das Gate, das die Verweigerung aus §11 messbar macht — „Der Streifen".** Für neun Breakpoints
(320 · 375 · 414 · 768 · 834 · 1024 · 1180 · 1440 · 1920) gilt beim Umschalten der Herkunftsschicht:
`scrollHeight` des Artikels wächst um **≤ 4 %**, und **zwischen zwei `.atom` wird kein Element mit
`display` ≠ `inline*` eingefügt** (DOM-Assertion, nicht Augenmaß). Rot = die Seite ist eine Liste
geworden.

**Warum jetzt.** §11 formuliert die Verweigerung absolut und §14-K6 nennt die Mittwoch-Telefon-Lesung
die halbe These. Eine absolute Verweigerung, die nur oberhalb von 1180 px gilt, ist keine. Und die
Sigle ist auf dem Telefon **das bessere Bild** als die Marginalie: sie sieht aus wie Wikipedia und
verhält sich wie ein Würfel.

**Kosten: klein** (~1 Tag, davon der halbe für das Gate). **Invarianten:** 8 (die Sigle ist ein
`<button>` mit `aria-expanded`, nicht ein dekoratives Zeichen).

---

### 1.2 · Grenze B9 — der Projektor ist der Server, und der Client kennt genau einen Leser · *F2, M8*

**Was es ist.** Die strukturelle Antwort auf „eine SL-Tatsache erreicht den Client per
`display:none`" ist nicht ein besserer Renderer, sondern ein **Drahtformat, in dem Verstecken
unaussprechbar ist**:

> **B9 — Kein Nutzlastfeld des Leser-Kanals trägt jemals Sichtbarkeitsmetadaten.** Es gibt kein
> `sicht`, kein `data-leser`, kein `nur_sl`, keinen `rolle`-Diskriminator im Dokument, das ein Client
> empfängt. Der Client hat keinen Parameter, gegen den er verzweigen könnte. Der Leserwechsel
> („Aus Sicht: ▾") ist **ein Serverroundtrip**, kein Zustandswechsel im Browser.

Durchgesetzt wie C2 durchgesetzt ist — unterhalb des Programmierers:

- Der Antworttyp des Artikel-Endpunkts ist ein **geschlossener AST ohne Rechtefelder**; ein Feld mit
  einem Namen aus einer verbotenen Liste (`sicht`, `leser`, `rolle`, `nur_*`, `visible_to`, …) lässt
  die Schema-Validierung im Build scheitern.
- Ein **CI-Assert über das serialisierte Fixture**: keine Antwort enthält die Bytes einer nicht
  freigegebenen Passage, Anmerkung oder Abbildung — das ist die Leak Bench **[C]**, erweitert um die
  neuen Knotentypen.
- Der Reader-Picker in B1 ist eine **Spike-Affordanz** und wird im nächsten Artefakt durch drei
  serverseitig erzeugte Nutzlasten ersetzt (→ 2.8).

**Warum jetzt.** Invariante 1 ist nicht „wir verstecken sorgfältig", sondern „Verstecken ist keine
Grenze". Solange die Nutzlast Rechtefelder trägt, ist ein `display:none` **immer eine Zeile
entfernt**, und F2 beweist, dass die Zeile geschrieben wird, sogar von Leuten, die die Regel kennen —
in derselben Funktion, die daneben `removeChild` benutzt. Der einzige Fix, der hält, ist der, nach dem
die falsche Zeile nicht mehr formulierbar ist.

**Kosten: klein–mittel** (~2 Tage; es ist überwiegend eine Schema- und Disziplinentscheidung, die
**heute** getroffen werden muss und in sechs Monaten groß wäre). **Invarianten:** 1 (dies *ist* die
Invariante, endlich als Typ), 8.

---

### 1.3 · Die Anmerkung als Knoten — Marginalien bekommen eine pid · *F2*

**Was es ist.** Randnotizen, Stempel, redaktionelle Hinweise und der `Irrtum`-Vermerk sind heute eine
CSS-Klasse an einem `<span>`. Sie werden ein **erstklassiger Knoten**:

```text
Anmerkung (id, ziel_pid, ziel_gen,
           art ∈ irrtum | hinweis | quelle | redaktion | berichtigung,
           text, gepraegt_durch, at)
```

Eine Anmerkung wird **wie eine Passage freigegeben** — eigene `Revelation`-Kante, eigene Zeile in
`felder.yaml`, eigene Disklosure-Klasse, eigene Leak-Bench-Fixture (*eine Anmerkung an einer Passage,
die die Leserin hält, während die Anmerkung SL-only ist, erscheint in keinem Byte ihrer Antwort*).
Damit gilt die Hausregel, die der Kandidat bisher implizit hatte und nirgends aussprach:

> **Alles, was Rechte braucht, ist ein Knoten mit einer pid. Nichts, was Rechte braucht, ist ein
> Attribut an einem anderen Knoten.**

**Warum jetzt.** Ohne diesen Typ hat der Kandidat kein Modell für *Metatext über eine Passage* — und
Metatext über eine Passage ist per Definition das Gefährlichste, was er trägt, weil er die Passage
bewertet. Es ist außerdem die Voraussetzung für 4.1 („Der Irrtum, datiert"), das aus genau diesem
Bruch ein Verkaufsargument macht.

**Kosten: klein** (~2 Tage: eine Tabelle, eine Kante, eine Fixture). **Invarianten:** 1, 6 (eine
`berichtigung`-Anmerkung trägt ihren eigenen Beleg), 10.

---

### 1.4 · Default-Deny durch Totalität — die fehlende Regel macht den Build rot · *F3*

**Was es ist.** `darf()` gibt heute `true` zurück, wenn kein Attribut da ist. Die Antwort ist nicht
`return false`, sondern **die Abwesenheit des Zweigs**:

- Der Projektor ist eine **totale Funktion** über eine **geschlossene Summe von Knotenarten**
  (`Passage | Anmerkung | Abbildung | Feld | Beleg | Augenblick | Beziehung | …`). Es gibt keinen
  Default-Zweig; ein neuer Konstruktor ohne Projektionsregel ist ein **Typfehler**, kein Laufzeitwert.
- **Registry-Vollständigkeitsgate:** ein CI-Schritt enumeriert die Konstruktoren der Union und
  behauptet, dass jeder eine Zeile in `felder.yaml` mit einer Disklosure-Klasse hat. Fehlt eine →
  **rot**, nicht „öffentlich".

**Warum jetzt.** Nemesis' Formulierung ist exakt richtig: *die Abwesenheit einer Regel muss den Build
rot machen, nicht die Zeile ausliefern.* Das ist heute eine Stunde Arbeit und in Slice 3 eine
Migration.

**Kosten: klein** (~1 Tag). **Invarianten:** 1, 10.

---

### 1.5 · Die geschwärzte Tafel — Abbildungen sind Passagen, und sie sind maskierbar · *F3*

**Was es ist.** Zwei Stufen, absichtlich getrennt, weil nur die erste Slice 1 blockiert.

**Stufe 1 (Slice 1).** Eine Abbildung ist ein `Passage(kind: bild)` mit eigener pid, eigener
`Revelation`, eigener Bildunterschrift-Passage und eigener `herkunft`. Sie wird vom selben Projektor
angefasst wie jeder Absatz; eine Galerie ist eine Liste projizierter Kinder und kann **leer sein, ohne
dass der Abschnitt verschwindet**. Ohne Freigabe kommt kein Byte der Bilddatei beim Leser an — die
Asset-URL ist **kein Bearer-Token**, sondern eine autorisierte Route.

**Stufe 2 (launch-blocking, nicht slice-blocking).** **Die Schwärzung:** die SL zieht Masken
(Rechtecke/Polygone) über ein Handout; jede Maske ist ein eigenständig freigebbares Objekt mit eigener
pid. Der Server liefert **ein anderes Bild**, nicht dasselbe Bild mit einer Overlay-Ebene: ein
gerastertes Derivat, gecacht unter `(bild_id, maskensatz_hash, zoom)`, invalidiert bei Freigabe.
Der Spieler bekommt **andere Pixel**.

**Warum jetzt.** Nemesis' Satz ist der Kern: *ein Handout transportiert eine Tatsache ohne
Satzgrenze.* Tafel III sagt „blind", während der Absatz mit derselben Tatsache gesperrt ist. Und
Stufe 2 ist nicht Luxus: sie ist **dasselbe Derivat-System**, das M4 braucht (→ 2.4), also zahlt man
es einmal und bekommt zwei Antworten. Die Aufteilung hält Slice 1 klein und die Antwort trotzdem
vollständig.

**Kosten: Stufe 1 klein (~1,5 Tage) · Stufe 2 mittel (~5 Tage, geteilt mit 2.4).**
**Invarianten:** 1, 7 (das Derivat erbt die Provenienz des Originals), 9.

---

### 1.6 · Kein Nenner — eine Kardinalzahl über Ungehaltenes ist ein Orakel · *F4*

**Was es ist.** Eine harte Regel plus zwei Streichungen im Artefakt:

> **Keine Leseroberfläche druckt eine Zahl, deren Wert von Inhalten abhängt, die diese Leserin nicht
> hält.** Kein `n von N`, kein „3 Marken verborgen", kein „8 / 12 Absätze", keine Gesamtseitenzahl,
> kein Fortschrittsbalken über den Kanon.

- Die Linsen-Bildunterschrift in B2 wird informationsfrei: *„Diese Aufnahme zeigt, was diese Leserin
  halten kann."* — konstant, in jeder Rolle identisch, byteweise gleich.
- Zähler **mit** Nenner existieren weiterhin — aber nur für einen Leser, der ohnehin alles hält (die
  SL), und dann mit **eigener Zeile in `oracles.yaml`** und Audience `sl`. Der Prüfstand ist ein
  Entwicklerwerkzeug und wird als solches gekennzeichnet, nicht ausgeliefert.

**Warum jetzt.** §9.7 formuliert die Regel wörtlich, und beide Artefakte brechen sie im Satz, der sich
ihrer Einhaltung rühmt. Das ist keine Kosmetik: die Zahl ist die *einzige* Information, die ein
sorgfältig projiziertes Dokument noch verrät, und sie ist genau die, die eine Spielerin in eine
Entscheidung übersetzt („da drin sind drei").

**Kosten: klein** (~0,5 Tage). **Invarianten:** 1, 6 (die SL-Sicht darf zählen, weil für sie nichts
verborgen ist).

---

### 1.7 · Der Zwillingsbeweis — das Gate, das für alle vier Leckklassen rot werden kann · *F4, F3, M5, M4*

**Was es ist.** `Augenblick-Leck` wird ersetzt. Der alte Test variiert **eine** Dimension und kann
per Konstruktion nichts finden, was in beiden Fixtures gleich ist. Der neue Test ist eine
**Eigenschaft**, kein Beispiel:

> **Gleiche gehaltene Hälfte ⇒ gleiche Bytes, egal was auf der anderen Seite steht.**
>
> Ein Generator erzeugt aus einem Seed **Zwillingspaare** von Szenen und Artikeln. Die Hälfte, die
> die Leserin hält, ist in beiden byteidentisch. Die Hälfte, die sie nicht hält, wird **vollständig
> randomisiert**: Anzahl der Marken, Identitäten, Wandgeometrie ungehaltener Regionen, Türpositionen,
> Lichter, Nebelkontur, Initiative-Kardinalität, Anzahl und Text der Absätze, Anmerkungen,
> Abbildungen und deren Masken.
>
> Behauptet wird über **200 Seeds**: identische HTTP-Antwortbytes, identischer DOM (serialisiert),
> identische Bounding-Boxen aller gerenderten Knoten, identischer `getFullAXTree` (CDP), identische
> Bytes des **gerasterten Kartenabzugs** (→ 2.4) — und Antwortzeiten innerhalb eines Bandes, mit
> demselben Varianztest, den der Kandidat für **404-never-403** schon führt **[C]**.

**Warum jetzt.** Das ist der Unterschied zwischen einem Gate und einer Beruhigung. Es fängt F4
(Kardinalität), F3 (Abbildung), M5 (Geometrie), F2 (Anmerkung) und jede zukünftige Leckklasse, die
niemand vorher benennen konnte — weil es nicht prüft, *was* geleakt wird, sondern behauptet, dass die
Ausgabe **von der ungehaltenen Eingabe nicht abhängt**. Es ist die einzige Form, in der §9.7s
Selbstauskunft (*„die Stelle, an der wir lecken würden"*) je überprüfbar wird.

**Kosten: mittel** (~5 Tage: Generator, Differ, AX-Tree-Harness). **Invarianten:** 1, 8 (der
Barrierebaum ist ein geprüfter Kanal, nicht ein vergessener), 10.

---

### 1.8 · Der totale Renderer — es gibt kein `innerHTML`, und keinen HTML-Blattknoten · *F5*

**Was es ist.** Drei Schnitte:

1. **`innerHTML`, `outerHTML`, `insertAdjacentHTML`, `document.write`,
   `dangerouslySetInnerHTML` sind im gesamten Produkt verboten.** Eine ESLint-Regel + eine
   dependency-cruiser-Regel machen den Build rot. Es gibt **eine** Ausnahmedatei: den Markdown/
   Rich-Text-Sanitiser aus Slice 2, mit eigener Fuzz-Suite (§16.8 **[C]** nennt ihn schon die
   sicherheitskritischste Funktion des Produkts — dann soll er auch die einzige sein).
2. **Der reisende Beleg (§10.3a) ist ein AST, dessen Blattyp `Text(string)` ist. Es gibt keinen
   `Html`-Konstruktor.** Damit stimmt „das Paketformat hat keine Fluchtluke" endlich auch an der
   Renderinggrenze und nicht nur in der Paketsprache. B2s `el()`-Helfer ist die Hausform; B1s
   Gewohnheit wird gelöscht.
3. **Fremdtext ist ein eigener Typ.** Anzeigenamen, Paket-Termvokabular und importierte Belegtexte
   sind `UntrustedText` (branded string). Die Rendering-API akzeptiert an Textpositionen **nur**
   `UntrustedText | LocalizedString`; beide landen ausschließlich über `textContent`.

**Warum jetzt.** §7.1 Schritt 3 lädt Fremde ohne Konto an den Tisch, §10.3 lädt Strings aus Discord
ein, und §4.6 macht die Wurfkarte paket-authored. Drei Einladungen, ein Renderpfad. Die Regel kostet
heute nichts und ist nach 40 Komponenten nicht mehr durchsetzbar.

**Kosten: klein** (~2 Tage). **Invarianten:** 2 (im Browser der SL, wo sie bisher nicht galt), 10.

---

### 1.9 · Die Namenswache — der kontenlose Beitritt bekommt eine Eingangsprüfung · *F5*

**Was es ist.** Beim Beitritt per Link wird der Anzeigename normalisiert und geprüft: NFKC,
Länge ≤ 40 Grapheme, keine Steuerzeichen, **keine Bidi-Overrides**, kein führender/abschließender
Leerraum, kein reines Emoji-Konfusat — und **eine Homoglyphen-Prüfung gegen die bereits im Raum
anwesenden Namen** (Skeleton-Vergleich nach UTS-39). `Тimo` (kyrillisches Т) neben `Timo` wird
abgelehnt mit *„Dieser Name ist von ‚Timo' nicht zu unterscheiden."*

**Warum jetzt.** An einem Tisch ohne Konten ist der Anzeigename die **einzige Identität**, und
Freigaben werden an Figuren gehängt, die die SL in einer Liste anklickt. Ein nicht unterscheidbarer
Name ist damit keine Kosmetik, sondern ein Weg, eine Freigabe an die falsche Person zu bekommen. Zwei
Stunden Arbeit, und es schließt gleichzeitig den ersten Schritt von F5s Bosheitsleiter.

**Kosten: klein** (~1 Tag). **Invarianten:** 1, 10.

---

### 1.10 · Die Rückfrage — man darf den Puffer *fragen*, man darf ihn nie *lesen* · *F6*

**Die Wahl, ausdrücklich getroffen.** F6 verlangt, dass die Runde eine Position wählt und die andere
streicht. **Gewählt: §11 bleibt absolut, rückwirkendes Prägen bleibt — und die Liste wird gestrichen.**

**Was es ist.** Es gibt keinen Bildschirm, dessen Vorgabezustand ein Verzeichnis von Würfen ist. Es
gibt eine **gerichtete, verankerte, gedeckelte Frage**, erreichbar **nur aus einem Kanonobjekt
heraus** (einer Passage, einer Figur, einer Region, einem Artikel) — nie aus der Navigation:

> „Gab es dazu einen Wurf?"

- **Pflichtanker.** Die Anfrage braucht **eine Figur** *und* **einen Themenanker** (Szene, Region,
  Artikel oder Etikett), beide aus dem Kanon gewählt, nie ein bloßer Zeitraum. Ein Aufruf mit
  Null-Anker wird serverseitig abgewiesen.
- **Höchstens drei Treffer**, gerendert **als Wurfkarten** — dieselbe Publikationsfläche, auf der
  auch geprägt wird —, nicht als Tabellenzeilen. Keine Paginierung, kein „alle anzeigen", keine
  Sortierung, kein Export.
- **Serverseitig genau ein Pfad.** Die dependency-cruiser-Regel wird **verschärft, nicht gelockert**:
  statt „kein Response-Serializer darf `Sitzungspuffer` importieren" gilt „**genau einer** darf, er
  heißt `rueckfrage`, sein Rückgabetyp ist `Wurfkarte[] where len ≤ 3`, und er verweigert den
  Null-Anker". Ein benannter, getypter, gedeckelter Pfad ist ein **strengeres** Gate als ein
  Formverbot, weil er alles andere ausschließt.
- **Der ehrliche Preis, ausgesprochen:** *ein Wurf, den man nicht benennen kann, ist weg.* Wer sich
  nicht erinnert, worum es ging, bekommt ihn nicht zurück. Das ist keine Einschränkung gegen die
  These — es ist die These.

**Und damit werden die vierzehn Tage endlich bezahlt** (→ 5.1: der Puffer wird gleichzeitig auf die
Hälfte seines Inhalts reduziert).

**Warum jetzt.** Ohne diese Geste trägt der Kandidat 14 Tage subpoenafähiger Daten für ein Feature,
das er sich selbst verbietet — Nemesis' schärfster Punkt und völlig zutreffend. Mit ihr sind die 14
Tage eine bezahlte Leistung mit einer benannten Gegenleistung.

**Kosten: mittel** (~4 Tage). **Invarianten:** 1 (die Rückfrage projiziert wie alles andere: eine SL
sieht die Würfe ihrer Kampagne, niemand sonst ruft sie auf), 6, 10.

---

### 1.11 · Die dritte Herkunft und die Saatbilanz — der kleinere, wahre Flex, als Zahl · *F7*

**Die Wahl, ausdrücklich getroffen.** Nemesis' Zinke A ist die wahre: die Sätze **waren**
vorgeschrieben, kurz, ungerichtet und versiegelt. „Gar nicht" wird gestrichen. Was an seine Stelle
tritt, ist besser, weil es **nachprüfbar** ist.

**Was es ist.**

1. **`Passage.gepraegt_durch` bekommt einen dritten Wert, und der Chip zwei Zeitstempel.**

   ```text
   getippt              — geschrieben, nie ausgelöst          grau,    ·
   gesaet_ausgeloest    — vor Samstag gesät, vom Abend wahr    bernstein hohl, ◇
                          gemacht: trägt BEIDE Daten
   am_tisch             — am Abend entstanden                  bernstein voll, ⚄ ⌗ ❝ § ✝
   import               — fremde Herkunft                      grau, ⇥
   ```

   Chipzeile für eine ausgelöste Saatzeile:
   `◇ gesät 14. März · ausgelöst 21:14, Sitzung 14 · Menschenkenntnis · Sera · 21 gegen 15`

2. **Die Saatbilanz** — eine abgeleitete Zeile unter dem Artikeltitel, sichtbar mit der
   Herkunftsschicht: *„11 Zeilen gesät · 25 Absätze im Kanon · 3 getippt · 8 ausgelöst · 14 am Tisch
   entstanden."* Sie ist berechnet, sie kann rot werden (bei einer schreibenden SL steht dort
   *„24 getippt · 1 geprägt"*), und sie ersetzt einen Slogan durch ein Verhältnis.

3. **Der neue Dialog**, der die erste Demo überlebt:

   > **Timo:** *„Wie lange hast du daran geschrieben?"*
   > **Kaya:** *„Elf Zeilen. Die Seite hat fünfundzwanzig Absätze."*
   > **Timo:** *„Und der Rest?"* — **Kaya:** *„Ist passiert."*

**Warum jetzt.** Der Flex **ist** der Kandidat; ein Standbild, dessen Bildunterschrift vom eigenen
Musterabend widerlegt wird, überlebt keine Demo. Und die Reparatur macht das Bild **stärker**: ein
Chip, der eine im März getippte Zeile an den Würfel bindet, der sie wahr gemacht hat, ist genau das,
was kein Konkurrent zeigen kann — „geschrieben und nie benutzt" gegen „geschrieben und von einem Abend
wahr gemacht" ist eine Unterscheidung, die nur ein Produkt mit einem zitierbaren Wurf treffen kann.

Nebenwirkung, die eine Rechnung repariert: unter dem korrigierten Modell tippt die SL am Tisch **nicht**
22 Absätze, sondern löst 8 aus (je ~2 s) und tippt 14 kurze. §9.1s Gate (≤ 4 min Tippen) wird damit
erst haltbar — und bekommt eine zweite Dimension: **die Prägemischung wird mitprotokolliert und
gedruckt.**

**Kosten: klein** (~2 Tage). **Invarianten:** 6 (die Bilanz zeigt ihre Ableitung), 10.

---

## 2. Die acht Schweren

### 2.1 · Das Zeugnis, die beantwortete Randfrage, und ein Gate für das dünnste Buch · *M1*

Drei Teile, weil M1 drei Löcher hat: das Artefakt der Spielerin, ihre Beteiligung an der Autorschaft,
und die fehlende Messung.

**(a) Das Zeugnis — das Artefakt der Spielerin ist keine gekürzte Enzyklopädie, es ist ein Bericht.**
Sieben Absätze sind ein dünner Lexikonartikel und ein **dichter Erlebnisbericht**. Deshalb bekommt
jede Figur eine eigene, automatisch gesetzte Leseoberfläche: *„Sitzung 14, aus Seras Sicht"* — die
ihr an diesem Abend freigegebenen Passagen in Tischreihenfolge, jede mit ihrem Beleg und ihrem
Augenblick, dazu ihre Randfragen und ob sie beantwortet wurden. Es ist §10.1s Nachhall, auf eine Figur
projiziert statt auf eine Kampagne, und es ist **kein Log**: es enthält ausschließlich Kanon, es ist
nach der Erzählung geordnet, und sein Vorgabezustand ist ein Text, keine Liste.
Mittwoch 07:40 findet Sera das fertig vor.

**(b) Die beantwortete Randfrage — der Spieler wird Mit-Autor, und der Chip sagt es.**
`Passage.veranlasst_durch → frage_id` (nullable). Eine Randfrage einer Spielerin erscheint in der
Kandidatenliste des nächsten **Anlasses**; wird daraus eine geprägte Passage, liest ihr Chip:
`21:16 · Sitzung 15 · auf Brannts Frage`. Kein sechster Prägegesten-Handler — die Prägung bleibt P1/P2,
es kommt eine Provenienzkante dazu.

Das ist der Satz, den kein Rivale drucken kann: **„Dieser Absatz existiert, weil du gefragt hast."**

**(c) Gate „Das dünnste Buch".** In der instrumentierten Vier-Stunden-Sitzung (§9.1) gilt zusätzlich:
**das dünnste Spielerbuch gewinnt ≥ 3 Passagen.** Rot heißt: die Projektion ist zu eng geschnitten
oder die SL prägt nur für sich. Damit ist Spielerretention zum ersten Mal **eine Zahl** statt einer
Hoffnung — und Nemesis' Satz *„kein Abschnitt des Dokuments preist Spielerretention"* ist beantwortet.

**Warum jetzt.** §10.1 nennt die Chronik das Retentionsobjekt, und sie gehört einer Person. Vier
Rivalen gewinnen Spieler über die Sitzung. (a) und (b) sind fast vollständig aus vorhandenen Daten
gebaut — Revelationen, Belege, Augenblicke, `frage`-Zeilen existieren alle bereits.

**Kosten: (a) mittel (~3 Tage, eine Render-Rezeptur) · (b) klein (~1 Tag) · (c) klein (~1 Tag).**
**Invarianten:** 1 (das Zeugnis ist eine Projektion wie jede andere), 8, 10.

---

### 2.2 · Der Beleg ist ein Faksimile — die Begründung friert mit der Zahl · *M2*

**Was es ist.** `terme` wird von einer nackten pid auf einen **eingefrorenen Abdruck** erweitert:

```text
terme jsonb = [{ quelle, wert, klausel_ref,
                 begruendung: { pid, gen, text_abdruck, etikett_abdruck } }]
```

Und die Anzeigeregel: **eine Beleg-Karte rendert ausschließlich aus eingefrorenen Daten. Nichts an
ihr wird jemals neu berechnet.** Sie ist ein Faksimile des Moments, nicht eine Ansicht auf heute.

Das Gate `Der Beleg hält` wird von einer auf **vier** Mutationen erweitert; nach jeder muss die Karte
**byteidentisch** reproduzieren: (1) Paket-Upgrade, (2) Etikett-Umbenennung, (3) neue Freigaben an
dieselbe Figur, (4) `supersede` der begründenden Passage.

**Warum jetzt.** Invariante 6 und §11 (*„keine Zahl als Beweis gedruckt, die nicht rot werden kann"*).
Der Fix ist klein und die Migration nach 10.000 Belegen ist es nicht.

**Kosten: klein** (~2 Tage). **Invarianten:** 6, 3 (Abdruck ≠ lebende Passage — dieselbe
Template/Instanz-Trennung, eine Ebene höher), 10.

---

### 2.3 · Die Grundplatte und der Klauselzettel — die Fusion kommt in den Paketen an, die Kunden installieren · *M3*

**(a) Die Grundplatte.** Jedes im Forge angelegte Paket startet **nicht leer**, sondern aus einer
Vorlage, die die drei Fusionsklauseln bereits verdrahtet enthält — `haelt`, `haelt_etikett`,
`erfahrungsgrad` — jeweils `disclosure`-getaggt, kommentiert und **mit einem Klick löschbar**. Ein
Systemautor, der ihr Homebrew portiert, muss die Fusion **aktiv entfernen**, nicht aktiv finden.

**(b) Die Importer erzeugen Pakete, und die tragen sie auch.** Foundry-, Roll20- und
FG-Import (launch-blocking, §7.5) produzieren jeweils ein Regelpaket; das generierte Paket bekommt
dieselbe Grundplatte. Damit erscheint der Mechanismus in den Paketen der **migrierenden** GMs, die in
Jahr eins die Mehrheit sind — ohne dass jemand etwas authored.

**(c) Der Klauselzettel — 3 Tage GUI in Slice 1 statt 15 Tage GUI danach.** Nicht der ganze
Schema-Former: nur das **Klauselformular für die drei Prädikate**, die Slice 1 ohnehin als einzige
kennt. Eine SL stellt *„+2, wenn die Figur ≥ 3 Passagen mit #haus-vharon hält"* in einem Formular ein,
ohne YAML. Das ist die kleinste ehrliche Version von K2 und sie ist genau so groß, wie Slice 1s
Klauselsprache reicht.

**Warum jetzt.** RB-11 ist ratifiziert: *Discovery läuft über Creators, der Regelbauer ist der
Go-to-Market.* Ein Fusionsmechanismus, der in keinem installierten Paket vorkommt, ist keine
Differenzierung, sondern eine Demo. Und Voreinstellungen **sind** der Vertriebsweg — Systemagnostik
heißt „du kannst es löschen", nicht „wir liefern nichts".

**Kosten: (a) klein (~1 Tag) · (b) klein (im Importer enthalten) · (c) mittel (~3 Tage).**
**Invarianten:** 2 (die Grundplatte ist deklarativ, wie alles), 5, 9.

---

### 2.4 · Der Kartenabzug — Degradation senkt Treue, nie Rechte · *M4*

**Die strukturelle Regel zuerst, weil sie das Meiste gratis löst:**

> **B10 — Kein Renderpfad, auch kein degradierter, erzeugt jemals eine Ansicht mit Bytes, die die
> Leserin nicht halten darf. Eine Qualitätsstufe darf Auflösung, Partikeldichte, Animation, Textur-
> und Zoomtiefe senken. Sie darf die Nebel- und Projektionsgrenze nicht überschreiten.**

Konsequenz, sofort und kostenlos: **die Stufe „statische Kartenersatzdarstellung" wird aus §5.4
gestrichen.** Was bleibt, sind Stufen, die die Projektion nicht anfassen (halbe Texturauflösung, keine
Partikel, keine Animation, niedrigere Nebeltexturauflösung — dieselbe Maske, gröber).

**Und dort, wo ein Client wirklich kein WebGL hat**, kommt **der Kartenabzug**: ein serverseitig
gerastertes Derivat, erzeugt vom **selben Derivat-Dienst wie die geschwärzte Tafel** (→ 1.5 Stufe 2),
gecacht unter `(scene_id, freigabesatz_hash, zoom)`, mit **eingebackenem** Nebel. Es gibt keinen
unvernebelten Pfad, weil das Bild ohne Nebel nie existiert.

**Die Rechnung, weil §12 sie schuldet.** Ein Derivat 1024², WebP ≈ 150–300 KB, ~0,3 s CPU. Eine
Vier-Stunden-Sitzung hat ~15–30 Freigaben; ein Derivat wird **nur auf Anforderung** erzeugt, also nur
wenn ein degradierter Client existiert. Worst case zwei solche Clients: ≈ 60 Renderings ⇒ **≈ 20 s
CPU und ≈ 12 MB Egress ⇒ ≈ €0,002 pro Sitzung.** Das fügt sich unter §12s €0,05/Sitzungsstunde und
korrigiert die dort falsche Buchung („Fog-Recompute ist clientseitig") für genau diesen Pfad.

Der Zwillingsbeweis (→ 1.7) läuft **auch gegen den gerasterten Pfad**: Zwillingsszenen ⇒ identische
PNG-Bytes.

**Warum jetzt.** Zwei einzeln richtige Ideen (Owlbears Qualitätsschalter, unsere Projektion) sind nie
gegeneinander gehalten worden; die Regel B10 kostet nichts und verhindert, dass jemand die Abkürzung
nimmt, wenn im Monat neun ein Tablet ruckelt.

**Kosten: die Regel klein (~0,5 Tage) · der Kartenabzug mittel (~5 Tage, geteilt mit 1.5 Stufe 2,
launch-blocking, nicht slice-blocking).** **Invarianten:** 1, 8.

---

### 2.5 · Wände gehören Regionen — die Geometrie wird projiziert wie der Text · *M5*

**Was es ist.** `SzenenEbene(kind: wand | portal | licht)` bekommt `region_pid`. Ein Segment wird
ausgeliefert, wenn die Leserin **mindestens eine der Regionen hält, die es begrenzt** — sonst gar
nicht. Nicht gedimmt, nicht schraffiert: **abwesend**.

Konsequenz für die Darstellung: der Nebel über ungehaltenem Raum ist **deckend**, keine
halbtransparente Schraffur über einer vollständigen Zeichnung. Die Kante des Nebels ist die Kante des
Wissens, und dahinter ist Papier.

Beim UVTT-Import werden Wandsegmente automatisch der Region zugeordnet, die sie begrenzen (Punkt-
in-Polygon gegen die Regionsflächen); nicht zuordenbare Segmente landen in einer Region
`unzugeordnet`, die **niemand hält** — also default-deny, konsistent mit 1.4.

**Warum jetzt.** Für einen Kandidaten mit der Zeile *„Der Nebel ist nicht Nebel — er ist die
Projektion"* ist die durchscheinende Vollgeometrie der peinlichste mögliche Fund, und der Fix ist
klein. Er macht die Zeile außerdem zum ersten Mal **wörtlich wahr**.

**Kosten: klein** (~2 Tage). **Invarianten:** 1, 8 (die Tafel-Outline-Rezeptur zählt ungehaltene
Räume ebenfalls nicht auf — dieselbe Filterung).

---

### 2.6 · Der Handschlag, und: der Raum liefert seinen eigenen Client · *M6*

Drei Teile, in der Reihenfolge ihrer Wirkung.

**(a) Die Prägung ist serverseitig und hängt an keinem Client.** `Strg+Enter` sendet
`{gesture, wurf_id, actor_user_id}`. Der Server erfasst den Augenblick aus **serverseitig gehaltenem**
Zustand. Ein Spielerclient, der beim Deserialisieren wirft, **kann eine Prägung nicht scheitern
lassen**, weil kein Spielerclient an einer Prägung beteiligt ist. Nemesis' Szenario stirbt an der
Architektur, nicht an der Versionierung — und das kostet null, es ist nur die Benennung, wo die
Wahrheit liegt.

**(b) Der Raum liefert seinen eigenen Client.** Der Electron-Host serviert **das Bundle, das er
eingebettet hat**, auch an Browser-Spieler im LAN. Ein Raum hat damit **genau eine** Clientversion,
per Konstruktion. Nur der Hosted-Room-Pfad zieht vom CDN, und dort kommen Server und Client aus
demselben Deploy. Die Drift ist damit nicht bepreist — sie ist **gelöscht**.

**(c) Der Handschlag, für den Rest.** Beim Beitritt tauschen Client und Raum `wire_major`. Ungleich ⇒
**kein stiller Teilbeitritt**, sondern ein Dialog, der sagt, was zu tun ist („Dein Host läuft 1.4, der
Raum braucht 1.6" + Update-Knopf; im Browser: harter Reload). Innerhalb eines Majors ist die
Drahtentwicklung **additiv**: neue Felder optional, unbekannte Felder ignoriert. Gate
**„Zwei Versionen, ein Abend"**: CI fährt den N-2-Client gegen den N-Server und spielt die
Akzeptanzdemo (§13) durch.

**Warum jetzt.** In diesem Produkt ist ein Wire-Mismatch Kanonverlust, weil der Moment in 14 Tagen
physisch gelöscht ist. (a) und (b) sind fast gratis und entfernen das Problem; (c) fängt den Rest.

**Kosten: (a) 0 (Benennung) · (b) klein (~1 Tag) · (c) mittel (~3 Tage, überwiegend das Gate).**
**Invarianten:** 1 (serverseitige Prägung ist die stärkere Form von C2), 10.

---

### 2.7 · Die Raumuhr — ein Satz Klarheit, bevor es eine Preisseite gibt · *M7*

**Die Modellaussage, in einem Satz:**

> **Einmalige SL-Lizenz. Sie enthält ein Kontingent an gehosteten Raumstunden und Speicher. Wer es
> überschreitet, hostet selbst (kostenlos, unbegrenzt, für immer) oder kauft **einmalig** nach. Es
> gibt kein Abonnement, und kein Feature liegt jemals hinter dem Zähler.**

Konkret: ~€30 einmalig, enthält **300 gehostete Raumstunden pro Jahr** (≈ 75 Vier-Stunden-Sitzungen —
mehr als jeder reale Tisch spielt) und **5 GB** Kampagnenspeicher. Darüber: Electron-Selbsthosting
(€0), **Raumstunden-Pakete** als Einmalkauf, oder **der eigene Eimer** — der `Platform`-Port **[C]**
existiert bereits, also darf eine SL ihren eigenen S3-kompatiblen Speicher eintragen. „Bring your own
bucket" ist für ein selbsthostbares Produkt fast gratis und ein echter Flex.

**Die Oberfläche: die Raumuhr** in den Kampagneneinstellungen — verbrauchte von enthaltenen Stunden,
mit einer Zeile: *„Im Desktop-Client zählt nichts davon."*

**Die Arithmetik, mit gezeigten Eingaben.** 40 Sitzungen × 4 h × €0,05 ≈ **€8** gegen ≈ €23,50 netto.
Das volle Kontingent von 300 h ≈ **€15** — immer noch unter netto, bei 7,5-fachem Normalverbrauch. Das
Kontingent ist keine Gewinnschraube, es ist ein **Deckel gegen den pathologischen Fall**, und der
pathologische Fall hat einen kostenlosen Ausweg, den wir ohnehin bauen.

**Warum jetzt.** RB-11s ratifizierte Zeile („einmalig, Spieler immer frei") wird von §12s Nebensatz
berührt. Ein Satz Klärung ist billiger als eine Preisseite, die zurückgenommen werden muss.

**Kosten: klein** (~2 Tage: Zähler, Anzeige, ein Top-up-SKU). **Invarianten:** 10.

---

### 2.8 · Spike S-P1 „Drei Bücher, ein Server" — die Universalität am richtigen Objekt · *M8*

**Was es ist.** Das nächste Artefakt der Lineage ist **kein weiterer HTML-Spike**, sondern ein
minimaler Server: ein Node-Projektor über ein Fixture, der aus **einer** kanonischen Quelle **drei**
Nutzlasten erzeugt — Sera, Brannt, Vesper —, jede eine Figur, keine Rolle. Behauptet wird:

- die drei Antworten unterscheiden sich byteweise;
- keine enthält Rechtefelder (B9, → 1.2);
- der Zwillingsbeweis (→ 1.7) läuft gegen sie;
- `sl` ist **keine Rolle in der ACL**: die SL ist eine figurenlose Leserin mit
  `campaign.gm`-Mitgliedschaft, und die Beobachterin ist eine figurenlose Leserin mit einem
  **expliziten Freigabesatz** — kein Rang, keine dritte Stufe.

**Warum jetzt.** Nemesis' Satz stimmt: *kein Artefakt der Runde zeigt eine serverseitige
Pro-Figur-Projektion*, und die Rolle-als-Subjekt aus B2 ist eine Formabweichung, die jemand
abschreibt. Zwei Tage verwandeln den schwächsten Beweis der Runde in den stärksten.

**Kosten: klein** (~2 Tage). **Invarianten:** 1, 10.

---

## 3. Der Kehraus der Leichten

### 3.1 · Drei Kanäle für die Herkunft, und ein vollständiger Prüflauf · *m3, m4*

Die Herkunft wird **nie** allein durch Farbe getragen: **Glyphe** (Art), **Farbe** (Sättigung) und
**Strich** (keine / gepunktet / durchgezogene Unterstreichung) sind drei unabhängige Kanäle. Im
Hochkontrastmodus fällt die Farbe weg und die Unterscheidung bleibt vollständig — was Invariante 8
(*Zugänglichkeit ist Architektur*) an genau der Stelle einlöst, an der der Flex sonst seinen einzigen
Kanal verliert.

Der Prüflauf sweept **alle 1.152 Zustände**, nicht 144: die vier Zugänglichkeitsachsen
(`kontrast`, `bewegung`, `art`, `herkunft`) kommen in die Kombinatorik. Eine Bank, deren Verkaufsargument
Ehrlichkeit ist, muss die Achsen messen, für die sie gebaut wurde.
**Kosten: klein** (~2 Tage).

### 3.2 · Die Druckansicht als vierte Render-Rezeptur · *m5*

`Druck` tritt neben Cinematic / Tactical / Outline: Belege sind **offen**, Chips werden zu echtem
Fußnotenapparat am Seitenfuß, Augenblicke zu kleinen Randfiguren, Kolumnentitel = Sitzung. CI rendert
das Fixture nach PDF und behauptet **Fußnotenzahl == Chipzahl**. §10.1 nennt die gedruckte Chronik das
Retentionsobjekt und ein physisches Produkt — dann ist der Druck eine Ansicht und kein Nachgedanke.
**Kosten: mittel** (~4 Tage, launch-blocking, nicht slice-blocking).

### 3.3 · Der Tastenbund — Beschleuniger sind Daten, nicht Konstanten · *m1*

Alle Beschleuniger stehen in **einer** Tabelle, sind **umbelegbar**, und ein CI-Schritt prüft jeden
Standard gegen eine eingecheckte Liste reservierter Tasten (macOS-Fensterserver, Windows-Shell,
NVDA/JAWS/VoiceOver-Modifier, Browser-Menüakzeleratoren). `Strg/Cmd+H` fällt dadurch von selbst
heraus.

**Die primäre Affordanz der Herkunftsschicht ist ein sichtbarer, beschrifteter Schalter** mit
`aria-pressed` in der Artikelleiste — er ist auffindbar, er ist fotografierbar, und er funktioniert
auf einem Telefon, das keine Tastatur hat. Der Standardbeschleuniger ist **`Alt+Shift+H`** (nicht
OS-reserviert, kein Sprachausgabe-Stopp, kein Menüakzelerator), umbelegbar.
**Kosten: klein** (~2 Tage).

### 3.4 · Artefakthygiene · *m2, m6, m7*

`overflow-wrap: anywhere` im Chip und in jedem inhaltsgetriebenen Etikett (deutsche Komposita und
Homebrew-Namen sind der Normalfall, nicht der Randfall); `<main>` + Sprunglink in **jedem** Artefakt;
die 3,47-MB-Tafel wird durch ein Derivat innerhalb des 1,2-MB-Gates ersetzt und das Gate läuft **gegen
die Artefakte**, nicht nur gegen den künftigen Build. Der Überlaufdetektor des Prüfstands deckt den
Chip mit ab.
**Kosten: klein** (~1 Tag).

---

## 4. Drei neue Fähigkeiten — nicht Verteidigung, sondern Ausbau

Diese drei stehen hier, weil sie die **Fusion** ausbeuten, nicht weil jemand angegriffen hat. Alle
drei sind für jeden Rivalen im Korpus unbaubar, ohne das Produkt neu zu schreiben — und alle drei sind
aus Daten gebaut, die der Kandidat ohnehin führt.

### 4.1 · Der Irrtum, datiert — eine Enzyklopädie, die weiß, wann welcher Leser aufgehört hat, falsch zu liegen

**Was es ist.** `belief: false` existiert bereits **[C]**: die SL prägt die *falsche* Schlussfolgerung,
die Brannt aus einem misslungenen Wurf zieht. Bisher endet das dort. Ausgebaut:

1. **Der Glaube ist pro Leser und er ist datiert.** Brannts Buch trägt den Satz normal — ohne jeden
   Hinweis, dass er falsch ist (das ist F2s Reparatur, hier als Feature: die `Irrtum`-Anmerkung ist
   ein eigener Knoten mit eigener Freigabe und liegt **nicht** in seiner Antwort).
2. **Die Klausel darf darauf zugreifen.** Ein viertes Prädikat wäre zu viel; stattdessen kennt
   `erfahrungsgrad` den Wert `irrig`. Eine Hausregel kann lauten: *„−2, wenn die Figur auf eine
   widerlegte Passage baut"* — und die Ableitung druckt in Brannts eigenen Worten, warum er sicher ist.
3. **Die Berichtigung ist ein Ereignis mit einem Beleg.** Wenn in Sitzung 19 der Wurf fällt, der ihn
   widerlegt, prägt die SL die Berichtigung. In **Brannts** Buch — und nur dort — wird der Satz
   durchgestrichen, mit einem Chip:
   `✎ widerlegt · 22:14, Sitzung 19 · Spurenlesen · Brannt · 17 gegen 14`
   In Seras Buch stand er nie. In Kayas Buch steht beides mit beiden Daten.

**Warum das ein Flex ist.** Jedes Wiki der Welt hat eine Versionsgeschichte des *Artikels*. Dies ist
eine Versionsgeschichte **des Lesers**: nicht „wann wurde der Text korrigiert", sondern „wann hat
diese Person aufgehört, das zu glauben, und was hat sie überzeugt". Das erfordert per-Figur-Freigaben
(Foundry: kleinste Einheit ist die Seite), einen zitierbaren Wurf (Foundry: eine Chatnachricht) und
eine Anmerkung mit eigenen Rechten (existiert nirgends). Und es fügt der Demo einen zweiten Schlag
hinzu: *„und hier ist der Absatz, den er fünf Sitzungen lang geglaubt hat."*

**Kosten: mittel** (~4 Tage, launch-blocking; die Anmerkung aus 1.3 und `supersede` **[C]** existieren
bereits). **Invarianten:** 1, 5 (kein Modell entscheidet, was falsch ist — die SL prägt es), 6.

---

### 4.2 · Die Gegenüberstellung — dieselbe Seite, zweimal, und sie widersprechen sich

**Was es ist.** Eine SL-Oberfläche: **zwei Figuren wählen, denselben Artikel nebeneinander**, mit
markierten Divergenzen — was nur A hält, was nur B hält, was beide halten aber mit verschiedenem
`erfahrungsgrad` (erfahren gegen gehört gegen irrig). Zwei Spalten, eine Kopfzeile, kein weiteres
Chrom.

**Warum das ein Flex ist, und warum es §9.2 hilft.** Es ist §7.4s *geteilte Infobox* **[C]**, von einer
Infobox auf einen ganzen Artikel hochgezogen — und es funktioniert **in einer neunzig Sekunden alten
Welt**, weil es keine vierzig Abende braucht, sondern zwei Freigaben. Der Kandidat hat kein gutes
Minute-Eins-Bild (§9.2, seine zweitschwerste Schwäche); dies ist eines, es ist ein einziges Standbild,
und es zeigt genau die Sache, die kein Rivale hat: **ein Dokument, das für zwei Leute verschieden
ist.** Betrieblich ist es außerdem das beste Prüfwerkzeug, das eine SL haben kann — *„weiß Vesper
eigentlich noch irgendwas?"* — und damit die Oberfläche, an der Gate 2.1(c) („Das dünnste Buch") für
die SL sichtbar wird.

**Kosten: klein** (~2 Tage — zwei Projektionen nebeneinander, ein Diff über pids).
**Invarianten:** 1 (die SL hält beide Projektionen ohnehin; für andere Leser existiert die Ansicht
nicht), 8.

---

### 4.3 · Die Lücke — die einzige Vorbereitungsfläche des Produkts, und sie schaut nach vorn

**Was es ist.** Ein SL-Bildschirm, den man in zehn Sekunden liest: **was weiß niemand?**

- gesäte, noch nicht ausgelöste Zeilen des Anlasses,
- Regionen mit nicht ausgegebenen Passagen,
- Passagen, die **genau eine** Figur hält (die fragilen — stirbt sie, stirbt das Wissen),
- Passagen, die nur als **Hörensagen** im Umlauf sind und die niemand erfahren hat,
- offene Randfragen der Spieler,
- Regelkarten, die noch `informal` sind.

**Warum das ein Flex ist.** Der Kandidat hat kein Vorbereitungswerkzeug und darf keins bekommen, ohne
seine These zu verraten. Dies ist keins: es ist **die Inverse eines Logs** — es listet nicht, was
passiert ist, sondern was **noch nicht** passiert ist, und das ist per Konstruktion keine
Ereignisliste. Es gibt der SL einen Grund, die App am Mittwoch zu öffnen, der nicht Lesen ist, und es
ist nur berechenbar, weil Wissen pro Figur modelliert ist — Foundry kann die Frage nicht einmal
stellen.

**Kosten: klein** (~2 Tage, fünf Abfragen über bestehende Kanten). **Invarianten:** 1 (SL-only,
`oracles.yaml`-Zeile mit Audience `sl`), 5, 6.

---

## 5. Was gestrichen wird

Vier Streichungen. Drei sparen Tage, alle vier sparen Erklärungen.

### 5.1 · KILL — `nachricht` und `zug` verlassen den Sitzungspuffer

`Sitzungspuffer.art` schrumpft von fünf Werten auf **zwei**: `wurf` und `zustandswechsel`.
Chat-Nachrichten und Tokenbewegungen werden **relayed, nicht persistiert** — sie gehen über den
Socket und existieren danach nirgends. Das ist verlustfrei, weil **keine der fünf Prägegesten sie
jemals zitieren kann**: P1 prägt einen Wurf, P2 eine gesprochene Zeile (die die SL selbst auslöst),
P3 eine Regelkarte, P4 einen `defeat_pending`-Übergang, P5 ist keine Passage.

**Was das kauft.** §9.4s teuerster Satz — *„für vierzehn Tage liegt der vollständige Bericht eines
Abends auf der Platte, subpoenafähig"* — wird **falsch**. Was auf der Platte liegt, sind 47
Würfelergebnisse und eine Handvoll HP-Übergänge. Das ist kein Sitzungsprotokoll unter irgendeiner
Lesart, und die 14 Tage tragen jetzt genau eine Sache: die Rückfrage (→ 1.10).
**Ersparnis: ~2 Tage und die halbe Privacy-Sektion.**

### 5.2 · KILL — das geteilte Nebelmodell ist eine Voreinstellung, keine zweite Maschine

§5.6 veranschlagt 12 Tage für „Nebel: **beide** sozialen Modelle", Risiko hoch, mit einem eigenen
Falsifizierer. Der Falsifizierer wird **jetzt gezogen, nicht später**: es gibt **eine** Nebelmaschine,
die pro Figur arbeitet, weil unser Nebel die Projektion ist. „Geteilter Party-Nebel" ist dann kein
zweites Modell, sondern **eine Voreinstellung: gib immer an alle aus.** Ein Schalter, kein Renderpfad.

Das entfernt die riskanteste Zeile des Tischbudgets zur Hälfte, entfernt eine ganze Klasse von
Kohärenzfragen (*was passiert, wenn man mitten in der Sitzung umschaltet?*) und macht die
Differenzierung schärfer statt breiter: **wir haben das Modell, das Roll20 entfernt hat und das
Foundry nicht hat — und nur dieses.**
**Ersparnis: ~5 Tage, und die Risikostufe der Zeile fällt von hoch auf mittel.**

### 5.3 · KILL — die Rolle „Beobachter" als eigene Stufe in Slice 1

Ein Beobachter ist keine dritte Rechtestufe, sondern **eine figurenlose Leserin mit einem expliziten
Freigabesatz** — genau die Form, die 02-domain-model.md ohnehin verlangt und die B2 verletzt (M8).
Damit verschwindet eine Dimension aus jeder ACL, jedem Fixture, jedem Prüflauf und jedem
Zwillingspaar. Das Intake führt Beobachter ausdrücklich als *„später"*.
**Ersparnis: ~2 Tage und ein Drittel der Kombinatorik.**

### 5.4 · KILL — zwei Freigabesteuerungen; es gibt nur noch eine

Heute hat die SL zwei Dinge, die dasselbe tun: einen **Nebelpinsel** (deckt Karte auf) und eine
**Freigabe** (gibt Passagen aus). Das ist eine Steuerung zu viel, und es ist die Stelle, an der die
beiden Hälften auseinanderdriften können. Gestrichen wird der Nebelpinsel als eigenständiger Begriff:

> **Es gibt genau eine Freigabesteuerung, und sie operiert auf Wissen. Der Nebel ist ihr Schatten.**

Die SL zieht über eine Region und gibt **die Passagen dieser Region** an gewählte Figuren aus; der
Nebel öffnet sich, weil sich das Wissen geöffnet hat. „Betreten ist Ausgeben" **[C]** ist damit nicht
mehr eine Sonderregel für den Tokeneintritt, sondern der Normalfall in einer zweiten Auslösung. Ein
freihändiger „nur die Karte aufdecken"-Pinsel bleibt für Fälle ohne Passagen erhalten — aber als
Sonderfall mit demselben Codepfad, nicht als Konkurrenzsystem.

Das ist gleichzeitig ein **Verkaufsargument**: es gibt kein anderes Produkt, in dem Nebel und Wissen
dieselbe Geste sind, und es ist ein Feature, das **durch Löschen** entsteht.
**Ersparnis: ~1 Tag, ein Konzept, und eine dauerhafte Klasse von Inkonsistenzen.**

---

## 6. Die Rechnung

| | Tage |
|---|---:|
| Neu in Slice 1 (1.1–1.4, 1.6–1.11, 2.1a–c, 2.2, 2.3a/c, 2.4-Regel, 2.5, 2.6, 2.7, 2.8, 3.1, 3.3, 3.4, 4.2, 4.3) | **≈ +39** |
| Streichungen (5.1 – 5.4) | **≈ −10** |
| Zusätzlich angeboten, falls die Runde tauschen will: Hex + gridless raus, nur Quadrat (§7.3 eigene Schnittreihenfolge, Punkt 4) | −4 |
| **Netto auf Slice 1** | **≈ +25 (bzw. +21 mit dem Tausch)** |
| Launch-blocking, nicht slice-blocking (1.5 Stufe 2 + 2.4 Kartenabzug geteilt, 3.2 Druck, 4.1 Irrtum) | ≈ +13 |

Slice 1 geht damit von ~98 Tagen Tisch auf ~123, und das ist ehrlich zu benennen: **die Projektion
tatsächlich zu einer Projektion zu machen, ist kein Feinschliff, es ist ein Viertel des Tisches.**
Der Kandidat hat drei Runden lang behauptet, per Figur zu projizieren, und die Artefakte haben
gezeigt, dass er es für Text tut und für nichts anderes. Der Aufpreis kauft genau die Differenz
zwischen der Behauptung und der Sache.

---

## 7. Nettowirkung

**Der Kandidat ist stärker, und zwar an der Stelle, an der er am lautesten war.** Die erste
Fatalen-Familie — die Projektion leckt überall dort, wo sie nicht Text ist — ist nicht mit vier
Pflastern beantwortet, sondern mit einer Regel (*alles, was Rechte braucht, ist ein Knoten mit einer
pid*), einer Grenze (*B9: der Client kennt genau einen Leser, und die Nutzlast trägt keine
Rechtefelder*) und einem Gate, das **für unbenannte Leckklassen rot werden kann** (der
Zwillingsbeweis: gleiche gehaltene Hälfte ⇒ gleiche Bytes). Das ist ein besserer Zustand als vor dem
Angriff, weil vorher niemand hätte sagen können, ob es leckt — jetzt kann es eine Maschine sagen.

Die zweite Familie — Positionen, die einander verbieten — ist durch **Wahl** aufgelöst, nicht durch
Ausgleich. F6: das Log bleibt verboten, das rückwirkende Prägen bleibt, und was gestrichen wird, ist
die **Liste** (die Rückfrage ist verankert, gedeckelt und aus dem Kanon heraus erreichbar; ein Wurf,
den man nicht benennen kann, ist weg). F7: „gar nicht" wird gestrichen und durch eine Zahl ersetzt,
die die Maschine berechnet — und der Chip, der eine im März getippte Zeile an den Würfel bindet, der
sie wahr gemacht hat, ist ein **besseres** Bild als die Behauptung, die er ersetzt. F1: die
Verweigerung aus §11 ist keine Prosa mehr, sondern eine Geometrie mit neun Breakpoints und einer
Prozentzahl.

Drei Dinge sind darüber hinaus neu und keiner Attacke geschuldet: eine Enzyklopädie, die weiß, **wann
welcher Leser aufgehört hat, falsch zu liegen** (4.1); dieselbe Seite zweimal nebeneinander, die sich
widerspricht (4.2, und sie funktioniert in einer neunzig Sekunden alten Welt, was §9.2 zum ersten Mal
ein Bild gibt); und die einzige Vorbereitungsfläche, die eine Anti-Log-These sich erlauben darf, weil
sie nach vorn schaut (4.3). Und vier Streichungen, von denen eine — **eine** Freigabesteuerung, der
Nebel als ihr Schatten — ein Verkaufsargument ist, das durch Löschen entsteht.

**Wo er weich bleibt.** Erstens: **Slice 1 wächst auf ~123 Tage Tisch.** Das ist die ehrlichste Zahl
in diesem Dokument und die gefährlichste; die Runde muss sie gegen §5.6s eigene Schnittreihenfolge
halten und nicht wegatmen. Zweitens: **§9.1 bleibt unberührt** — die Prägerate ist weiterhin eine
Zahl, die niemand gemessen hat, und kein Feature hier misst sie; das Gate falsifiziert die These und
wird es tun oder nicht. Drittens: **§9.2 ist gemildert, nicht geheilt** — die Gegenüberstellung gibt
Minute eins ein Bild, aber die Enzyklopädie braucht weiterhin vier Abende. Viertens: **M1s Asymmetrie
ist messbar, nicht abgeschafft** — eine SL, die härter geheim hält, produziert dünnere Spielerbücher,
und das Gate „Das dünnste Buch" macht das sichtbar, ohne es aufzuheben. Fünftens: **das Recht auf
Löschung** kollidiert weiterhin mit einem dauerhaften `Wurf`, der die Beiträge einer Person nennt, und
5.1 verkleinert das Problem, ohne es zu lösen.

Und ein letztes Wort zur Ehrlichkeit: die teuersten Positionen hier (1.7 Zwillingsbeweis, 1.5
geschwärzte Tafel, 2.4 Kartenabzug) sind alle **Beweislast**, keine Oberfläche. Sie machen das Produkt
nicht schöner. Sie machen den einen Satz wahr, an dem alles hängt — *„der Nebel ist nicht Nebel, er
ist die Projektion"* — und ein Kandidat, dessen Alleinstellung eine Projektion ist, darf sich diesen
Satz nicht auf Zuruf glauben.

> *Zweiundzwanzig Bernsteinmarken, und acht davon sind Saat,*
> *die ein Würfel am Samstag wahr gemacht hat —*
> *und was am Rand des Absatzes steht, hat jetzt eine pid,*
> *und was hinter dem Nebel liegt, hat keine Bytes.*

— Feature Architect
