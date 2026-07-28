# Eron — die Welt, ihre Klassen, ihr Schlamassel

**Das Crew-Briefing zum Beispiel-Universum.** Geschwisterdokument zu [`README.md`](README.md)
(Provenienz, Lizenz, Harvest-Methode). Alle Zahlen hier sind aus `articles.json`, `graph.json`,
`templates.json` und `media.json` vom Harvest **2026-07-27** neu berechnet; alle deutschen Sätze sind
**wörtlich** aus dem Korpus, unverändert bis auf entferntes Wiki-Markup. Wo die Zahl hier von einer
Zahl in `README.md` abweicht, steht die Abweichung dabei.

> **Die Grenze, vor allem anderen.** Eron ist **Fixture und Skin, nie Gegenstand** (Invariante K7).
> Das Produkt bleibt welt- und systemagnostisch. Jede Oberfläche, die mit diesem Korpus gebaut wird,
> muss mit einem anderen Korpus ohne DOM-, Controls- oder Komponentenänderung genauso funktionieren.
> **Ein Kandidat, der Eron hartverdrahtet, ist gescheitert.** Und: der Import ist kein Demo, sondern
> ein **Abnahmetest an echtem Material** — „besser als Fandom" ist ab hier eine Messung, keine
> Behauptung.

---

## 1. Die Welt in 400 Wörtern

**Genre und Ton.** Spätmittelalterliche Hochfantasy mit auffällig wenig Zauberglanz und auffällig
viel Verwaltungsrecht. Der Ton ist chronistisch, nicht heroisch: die Artikel klingen wie eine
Realenzyklopädie, die über Erbfolgen, Steuerhoheiten und Truppenstärken schreibt und dabei
gelegentlich einen Gott erwähnt. Der Korpus **zweifelt an sich selbst** — über den Gründungskrieg des
Reiches heißt es: *„Eine große Anzahl an Gelehrten, überwiegend außerhalb des Kaiserreichs, zweifelt
diese Erzählung vom Krieg der Kriege an. Ein Konflikt dieser Größenordnung sei viel zu schwach
dokumentiert."*

**Das politische Rückgrat.** Alles hängt am **Kaiserreich**, offiziell *„Heiliges Resifisches
Trimonarchisches Kaiserreich der Götter Gnaden"*, gegründet im Jahr 0 aus drei Reichen, aufgelöst
866. Sein Kaiser wird beim **Kaiserthing** gewählt und *„durch den Hochelfenritus beinahe unsterblich
gemacht und kann nur durch äußere Einwirkungen wie zum Beispiel Mord getötet werden"* — deshalb
tagte das Thing in 866 Jahren nur dreimal. Vorgänger und Legitimationsquelle ist das **Königreich
Resif**, gegründet vom **Hochelfenrat** unter Hochkönig Valor Saron, zerbrochen, als *„Valor Saron
von seiner eigenen Frau erstochen"* wurde. Der Rat überlebt das Reich, kontrolliert den Elfischen
Geheimdienst und wird *„in der Union … als absolute Herrscherkaste"* fungieren. **Haus Paradon** ist
eines der *„Drei Heiligen Häuser"*; die **Numerion Rebellion** (810–816) kostet Haus Numerion für
immer den Platz bei der Kaiserwahl. **Der Große Krieg** (745–770) ist die Katastrophe im Rücken jeder
Figur: 6 Mio. militärische und 34 Mio. zivile Tote auf der einen, 20 Mio. und 70 Mio. auf der anderen
Seite — ausgelöst vom orkischen Großhäuptling Uril Ul gegen *„die Besatzer der Aschelande"*.

**Die Völker.** Zwei Ebenen: **Spezies** (Humanoide, Ogroide, Reptiloide, Katzenartige) über
**Rassen** (Mensch, Zwerg, Wald-/Fluss-/Dunkelelf; Ork, Rotblut Ork, Kobold). Jede Rasse hat harte
Werte und ein Vorurteil: Zwerge *„gelten als die ehrgeizigsten Krieger unter den Völkern"*, Orks
waren *„einst … für ihre Dichtkunst und ihre Architektur bekannt"*, Kobolde sind das Volk, das *„so
unfassbar verhasst"* ist, dass man es im Kaiserreich besitzen durfte.

**Die Spezifika, die niemand erfinden muss.** **Silberwahnsinn**, tödlich, überwiegend bei Zwergen,
*„Es gibt keinen dokumentierten Fall einer Heilung."* Die **Gotteserhöhung** — drei Sterbliche werden
auf einem Berg zu Göttern. Der **Blechorgelhammer**, *„eine seltene Kombination aus einem Instrument
und einem Kriegshammer"*, zwei Exemplare, wirkt Zauber, *„wenn bestimmte Melodien gespielt werden"*.
Und die **Langfingrige Hutkröte**, 15 m lang, 65 t schwer, 4 000 Jahre alt: *„Ausgewachsene Tiere
werden auch oft als Haus gehalten."*

---

## 2. Die Entitätsklassen, die wirklich da sind

Die **reale** Klassifikation dieses Wikis ist die **gewählte Infobox-Vorlage** — Kategorien tragen
nichts bei (§3.4). Danach zerfallen die 74 ns0-Artikel so:

| Vorlage | Artikel | Domänenklasse (02-domain-model.md, CHAMPION §8) | Sitz im Modell? |
|---|---:|---|---|
| `Person` (20) + `Infobox Charakter` (2) | **22** | Charakter → `Actor` + `CharacterProfile` | ✔ sauber |
| `Regierung` | **9** | Organisation | ✔ — **aber siehe unten, die Vorlage lügt** |
| `Rasse/Spezies` | **8** | Spezies | ✖ nur eine Ebene, das Wiki hat zwei |
| `Rüstung/Waffe` | **4** | Gegenstand → `ItemTemplate` | ✔ sauber |
| `Krieg` (3) + `Ereignis` (1) | **4** | Ereignis | ✔ sauber |
| `Stadt` (2) + `Planet/Mond` (1) | **3** | Ort → `Location` | ✔ sauber |
| **keine Vorlage** | **24** | — | **hier wird es interessant** |

**32 % des Korpus tragen keine Vorlage** und sind damit für einen vorlagengesteuerten Importer
typlos. Was in diesen 24 Artikeln steckt, ist die Liste der Klassen, die das Domänenmodell **nicht**
hat:

| Was es ist | Artikel | Modell hat dafür … |
|---|---|---|
| **Amt / Titel** | `Kaiser`, `Baron` | nichts. Ein Amt ist kein Charakter und keine Organisation — es ist eine **Rolle mit Regeln**, die nacheinander von Personen besetzt wird. `Kaiser` beschreibt Wahlverfahren, Vetorechte und Unsterblichkeit; das ist ein **Regelbegriff mit Zeitachse**. |
| **Religion / Glaubenssystem** | `Erismus` (56 KB, der größte Artikel), `Liste an Religionen der Welt von Eron` | nichts. Erismus ist Organisation *und* Regelwerk *und* Kosmologie zugleich. |
| **Heilige Schrift** | `Epiphania` | nichts — ein Gegenstand, der ein Dokument ist, das eine Kosmologie enthält. |
| **Kraft / Weltgesetz** | `Magie` (enthält „Die 4 Regeln") | **Regelbegriff** — der einzige Kandidat im Modell, und er passt hier tatsächlich. |
| **Krankheit / Zustand** | `Silberwahnsinn` | nichts. Am nächsten: `StatusEffect` — aber das ist eine Instanz, kein Nachschlagewerk-Eintrag. |
| **Taxon** | `Humanoide`, `Ogroide`, `Reptiloide`, `Katzenartige`, `Rasse`, `Spezies` | nichts. Das Wiki modelliert **Spezies → Rasse → Individuum**; `Spezies` im Modell ist flach. Vier dieser sechs Artikel sind reine Definitionen (*„Als Rasse bezeichnet man eine Unterart einer bestimmten Spezies."*) — **Metamodell als Artikel**. |
| **Tier / Kreatur** | `Langfingrige Hutkröte` | nichts. Kein Charakter (kein Individuum), keine Spezies-im-Modellsinn (nicht spielbar), kein Gegenstand. |
| **Militärischer Verband** | `Kaiserliche Streitkräfte`, `Kaiserliche Armee`, `Kaiserliche Marine`, `Kaiserliche Flotte` | Organisation, notdürftig. Zwei davon sind **reine Rangordnungen** (10 Dienstgrade mit Truppenstärken) — das ist eine Regeltabelle im Prosakleid. |
| **Familie (nicht adelig)** | `Olavs Familie` | nichts. Ein Stammbaum ist eine **Relationsmenge**, kein Eintrag. |
| **Index / Liste** | `Liste an Waffen`, `Liste der Häuser von Andaria` | nichts, und das ist richtig so: eine Liste ist eine **Query**, kein Entity. `Liste der Häuser von Andaria` ist eine sortierbare Wikitable mit 8 Spalten — die **dritte** Darstellungsform von Entity-Daten neben Infobox und Prosa. |
| **Wiki-Meta** | `Eron Wiki` | nichts, und braucht auch nichts. Ein Importer muss es **erkennen und verwerfen**. |
| **Ort ohne Vorlage** | `Akkator` (7 Bytes) | ✔ Ort — aber nur, wenn der Importer aus 12 eingehenden Links schließt, was der Artikel selbst nicht sagt. |

### 2.1 Der Befund, der wehtut: die Vorlage ist **nicht** der Typ

`Vorlage:Regierung` trägt neun Artikel und darunter **sechs verschiedene Dinge**: einen Staat
(`Kaiserreich`), ein Adelshaus (`Haus Paradon`), eine Finanzbehörde (`Haus der Münze`), eine
Wahlversammlung (`Kaiserthing`), einen geheimen Attentäterorden (`Flüsterer`) und eine
Glaubensbruderschaft (`Bruderschaft der nie erlöschenden Flamme`). Sie teilen ein Feldschema
(`gründung`, `sitz`, `anführer`) und sonst nichts.

**Konsequenz für den Importer, und sie ist die wichtigste dieses Abschnitts:** §5.4 von `README.md`
sagt richtig, dass die Taxonomie in den Vorlagen steckt statt in den Kategorien. Aber sie steckt dort
**verlustbehaftet**. Vorlage → Klasse ist ein **Vorschlag mit Konfidenz**, kein Mapping. Ein Import,
der ohne Rückfrage abbildet, erzeugt neun „Organisationen", von denen sechs falsch sind. Die richtige
Produktantwort ist nicht bessere Automatik, sondern **ein Zuordnungsschritt, in dem der GM neun
Zeilen bestätigt oder korrigiert** — und der Korpus sagt uns, dass es genau neun sind, nicht 74.

---

## 3. Der ehrliche Schlamassel

Nichts hier ist geschönt. Ein Hobby-Wiki ist kein Datensatz, und jede Behauptung des Produkts über
„importiere deine Welt" muss **an diesen Zahlen** überleben.

### 3.1 Zwei Artikel sind ein Drittel der Welt

| Maß | Wert |
|---|---:|
| Artikel (ns0) | 74 (davon **1 Weiterleitung**: `Kaiserliche Flotte` → `Kaiserliche Marine`) |
| Wikitext gesamt | 307 255 B |
| min / Median / max | **3 B** / **1 586 B** / **56 582 B** (die beiden Mittelwerte sind 1 580 und 1 591; `README.md` nennt letzteren) |
| `Erismus` + `Olav der Ehrliche` | 92 199 B = **30,0 % des gesamten Korpus** |
| < 200 B | 5 Artikel (7 %) |
| < 500 B | 13 Artikel (18 %) |
| < 1 500 B | **35 Artikel (47 %)** |
| ohne jeden Abschnitt (`==`) | **24 Artikel (32 %)** |

`Gotteserhöhung` ist **3 Bytes** lang und lautet vollständig:

> Die

Das ist kein Stub, das ist ein abgebrochener Satz — und **8 Artikel verlinken darauf**, unter
anderem als *„Drei Heilige Häuser"* und als *„Göttern erklärt"*. `Akkator`, Reichshauptstadt von
816–866, ist **7 Bytes** lang und lautet vollständig: `Akkator`. Es hat **12 eingehende Links**.

**Ein Layout, das nur am Median getestet wurde, ist nicht getestet.** Es muss 3 Bytes und 56 KB
tragen, und 56 KB heißt hier: 67 Überschriften, fünf Ebenen tief, `== Gebote, Verbote und Strafen ==`
→ `=== Sexuelle Sünde ===` → `==== Inzest ====`.

### 3.2 Die Hälfte der Artikel ist ein Absatz lang — und ein Korrekturposten zu `README.md`

Zerlegt man den Fließtext in Absätze ≥ 40 Zeichen (Vorlagen, Tabellen, Listen, Datei-/Kategorielinks
und Überschriften entfernt):

| | Artikel | Anteil |
|---|---:|---:|
| **0 Prosa-Absätze** | **8** | 11 % |
| **genau 1 Prosa-Absatz** | **22** | 30 % |
| ≤ 2 Absätze | 32 | **43 %** |
| ≤ 3 Absätze | 39 | **53 %** |
| ≥ 10 Absätze | 14 | 19 % |
| **Summe Prosa-Absätze im Korpus** | **492** | |

> **Korrektur zu `README.md` §5.2, und sie ist nicht kosmetisch.** Dort stehen **216**
> Prosa-Absätze und daraus die Schlussfolgerung, die Infobox trage **73 %** aller adressierbaren
> Atome. Diese Zahl entsteht durch einen Zählfehler: Absätze, die **direkt unter einer Überschrift
> ohne Leerzeile** stehen, fallen bei blockweiser Trennung zusammen mit der Überschrift weg — und
> genau so schreibt dieses Wiki fast durchgehend (`== Überblick ==` gefolgt vom Absatz). Korrekt
> gezählt sind es **492**. Damit steht die Zerlegung so:
>
> | Kandidat-Passagen | Anzahl | Anteil |
> |---|---:|---:|
> | Infobox-Feldzeilen (`README.md` §5.2, unverändert) | 583 | 54 % |
> | **Prosa-Absätze** | **492** | **46 %** |
> | **Summe** | **1 075** | = **14,5 Passagen pro Artikel** |
>
> **Die Kernaussage überlebt, die Gewichtung nicht:** ein Fandom-Artikel ist tatsächlich eine Seite
> aus vielen (14,5 statt 10,8), aber Infobox und Prosa sind **etwa gleich stark**, nicht 3:1. Der
> Flex „die geteilte Infobox" bleibt tragend — er ist aber die **eine Hälfte** des Modells, nicht
> das ganze. Ein Import, der die Prosa als Beiwerk behandelt, verliert 46 % der Atome.

Trotz der Korrektur bleibt die Schieflage brutal: **53 % aller Artikel bestehen aus höchstens drei
Absätzen**, während `Erismus` (102) und `Olav der Ehrliche` (48) allein **31 % aller Prosa-Absätze**
tragen.

Die acht prosalosen Artikel sind nicht die unwichtigen: `Arvex Aurelius Paradon` (der letzte Kaiser
des Reiches — 18 Infobox-Zeilen, kein Fließtext), `Eron (Planet)` (236 B reine Infobox), `Akkator`
(die Hauptstadt, 7 B), `Gotteserhöhung` (3 B), `Liste der Häuser von Andaria` (5 314 B reine
Wikitable), `Katzenartige`, `Reptiloide` und die Weiterleitung `Kaiserliche Flotte`. **Ein Renderer,
der eine Lead-Prosa voraussetzt, zerbricht am letzten Kaiser des Reiches.**

### 3.3 Der rote Link ist die Mehrheitsoberfläche — und 69 % davon will genau ein Satz

| | Kanten | Anteil |
|---|---:|---:|
| Artikel → existierender Artikel (blau) | 556 | 30,7 % |
| Artikel → nicht existierende Seite (**rot**) | **1 253** | **69,3 %** |

**689 distinkte fehlende Seiten** auf 74 vorhandene Artikel = **9,3 Türen pro geschriebenem
Artikel**. Und die Verteilung ist ein extremer Long Tail:

| Nachfrage | distinkte Ziele |
|---|---:|
| **genau 1× verlinkt** | **472 (69 %)** |
| 2–4× | 173 (25 %) |
| ≥ 5× | 44 (6 %) |
| ≥ 10× | 8 |

Meistgewünscht: `Andarisch` (18×), `Nördliche Minenreiche` (16), `Andaria` (15), `Blattheim` (14),
`Königreich Terabur` (13), `Remus Paradon II.` (13).

**Drei Befunde, die den Headline-Flex des Champions direkt treffen:**

**(a) Nicht jeder rote Link ist eine Tür — aber weniger sind Müll, als man denkt.** Hart
disqualifiziert sind **17 Ziele mit 28 Kanten (2,2 %)**: die vier Epochenmarker `N. K.` (5×),
`N. K` (4×), `V. K.` (4×), `V. K` (2×) — **15 rote Links auf ein Datumsformat** — plus 13
Schreibvarianten eines bereits existierenden Ziels (Tabelle (b)). Ein Importer, der jeden Redlink
zur Vollmacht macht, baut eine Tür zu „nach Kaiser".

**Ausdrücklich *nicht* Müll, und das ist die Falle:** `Tal` (7×), `Landmann` (7×), `Jarl` (5×),
`Herzog` (4×), `Graf` (4×), `Vogt` (1×) sehen aus wie versehentlich verlinkte Substantive — aber
`Baron` **ist** ein Artikel dieses Wikis, mit Lehnsrecht, Steuerhoheit und Wappenführung. Diese Ziele
sind echte Weltlücken. **Eine Heuristik „kurzes generisches Wort ⇒ kein Kandidat" hätte hier sechs
legitime Türen zugemauert und dieselbe Klasse getroffen, die das Wiki nachweislich selbst ausbaut.**
Das disqualifizierende Merkmal ist die **Form** (Datumsmarker, Flexionsform, Tippfehler), nicht die
Kürze.

**(b) Dieselbe Tür existiert mehrfach, weil sie sich verschrieben hat.** Verifizierte Duplikate im
Redlink-Ziel-Set:

| Gemeint ist | Geschriebene Varianten |
|---|---|
| Das Elfenreich | `Geeintes Elfenreich Demmaros` (9) · `Geeinte Elfenreich Demmaros` (1) · `Geeinigtes Elfenreich Demmaros` (1) · `Vereinigtes Elfenreich Demmaros` (1) — **4 Türen, 12 Links, ein Land** |
| Das Königreich | `Königreich Terabur` (13) · `Königgreich Terabur` (1) |
| Der Erzherzog | `Erzherzog (Herzogtum der Quelllande)` (1) · `Erzherzog (Fürstentum der Quelllande)` (1) — dasselbe Amt, zwei Staatsformen, zwei Seiten |
| Der Bruder | `Der Erste Bruder` (3) · `Der erste Bruder` (1) · `Erster Bruder` (1) · `Der Zweite Bruder` (1) · `Der zweite Bruder` (1) |
| Das Sheikat | `Oslavisches Sheikat` (5) · `Olsavisches Sheikat` (1) |
| Der Krieg | `Zweiter Chi-Sen Krieg` (1) · `Zweiter Chi Sen Krieg` (1) · dazu `Chi Sen` (2) / `Chi-Sen` (1) |
| Das Reich | `Ewiges Reich` (1) · `Ewige Reich` (1) |
| Die Minenreiche | `Südliche Minenreiche` (6) · `Südlichen Minenreiche` (1, Dativ verlinkt) |

**(c) Der Tippfehler ist unsichtbar, weil er verrohrt ist.** Von 1 947 Redlink-Vorkommen im
Wikitext sind **512 (26 %) gepipet** — `[[Königgreich Terabur|Terabur]]` zeigt dem Leser das Wort
„Terabur" und verschweigt, dass das Ziel ein Tippfehler ist. Ein Produkt, das rote Links zu Türen
macht, macht damit **eine Tür pro Tippfehler**, und sie sieht aus wie jede andere.

**Die offene Frage bleibt offen und wird durch diese Zahlen schärfer:** Die Kappung des Champions
lautet ≤ 1 Vollmacht/Spieler/Woche + 2 freie. Die Nachfrage im Korpus lautet 1 253. **Wie aus
1 253 Türen 3 werden, ist ungelöst.** Diese Zahlen liefern immerhin ein Ranking, das kein Mensch
tippen musste: 44 Ziele mit ≥ 5 eingehenden Links sind 6 % der Ziele und die einzigen, die aussehen
wie eine Weltlücke statt wie ein Verschreiber.

### 3.4 Kategorien existieren nicht — und zwei von drei hat kein Mensch vergeben

**3 von 74 Artikeln** tragen überhaupt eine Kategorie, alle drei `Kategorie:Charaktere`. Das ist
gegen **22 Artikel, die eine Charakter-Infobox tragen** — die Kategorie erfasst **13,6 %** ihrer
eigenen Klasse.

Und die drei sind noch schlechter, als sie aussehen. Der Quelltext von `Vorlage:Infobox Charakter`
endet mit:

```
{{#ifeq: {{NAMESPACENUMBER}} | 0 | [[Kategorie:Charaktere]]}}
```

`Bodin` und `Irme` sind die **einzigen zwei** Artikel, die diese Vorlage benutzen — ihre Kategorie
ist **automatisch** und steht in keinem Artikelquelltext. Explizit kategorisiert hat ein Mensch genau
**einen** Artikel im ganzen Wiki: `Ekmont von Radfurt`. `Vorlage:Person`, die dominante Vorlage mit
20 Verwendungen, hat keine solche Zeile.

**Das ist das schärfste Argument für „in besser", das dieser Korpus liefert:** Fandoms
Organisationsangebot wurde von echten Autoren über vier Jahre und 1 153 Bearbeitungen **einmal**
benutzt. Der Typ muss aus der Struktur folgen, die der Autor ohnehin ausfüllt — nicht aus einer
zweiten Pflicht, die er ignoriert.

### 3.5 Infoboxen sind gepflegt — und trotzdem nicht vergleichbar

Hier muss eine verbreitete Erwartung korrigiert werden: **die Infoboxen sind nicht schlampig
ausgefüllt.** Über ~590 Feldzeilen im ganzen Korpus stehen genau **6 leere Werte** (`Fjördin
der Tapfere/Einheit`, `Ormin/Organisation`, `Bjoldiri/Rolle`, `Kaiserreich/caption1`,
`Zwergischer Eingliederungskrieg/Verluste1` und `/Verluste2`). Autoren lassen Felder **weg**, statt
sie leer zu lassen. Alle 18 Infobox-Vorlagen sind Fandom Portable Infoboxes, also deklarativ und
maschinenlesbar.

Das Problem ist ein anderes und schlimmeres: **jeder Artikel wählt eine andere Teilmenge.**

- `Vorlage:Person` deklariert **41** Felder. Die 20 Artikel benutzen **9 bis 28** davon.
- Genau **zwei** Felder kommen in allen 20 vor: `Rasse` und `Geschlecht`.
- **14 der 41 Felder** kommen in ≤ 4 Artikeln vor; `Dienstnummer` und `Ereignisse` in **null**.
- `Vorlage:Person` **und** `Vorlage:Infobox Charakter` modellieren beide Charaktere, mit
  unterschiedlichen Feldnamen für dasselbe (`Größe` vs. `Körpergröße`, `Tod` vs. `Sterbedatum`,
  `Geburt` vs. `Geburtstag`).

Dazu drei Formfehler mit mechanischer Sprengkraft:

1. **Einheiten fehlen uneinheitlich.** `Mensch: 1,75m` · `Zwerg: 1,45m` · `Rotblut Ork: 1,90`
   (ohne Einheit) · `Das Kind: 150cm` (andere Einheit) — **ein Feld, drei Notationen.**
2. **Preise sind mal Zahl, mal Währung.** `Kaiserliches Kurzschwert: kaufpreis=40 [[Kronen]]` gegen
   `Elfischer Unionssäbel: kaufpreis=20` gegen `Olav: Kopfgeld=150.000 Silberlinge`. **Zwei
   Währungen und ein einheitenloser Wert im selben Feldtyp.**
3. **21 % der Feldzeilen sind gar keine Zeilen, sondern Listen.** 121 der ~590 Werte sind
   Wiki-Bullet-Listen. Spitzenreiter: `Olav der Ehrliche/Verbrechen` mit **26 Einträgen**,
   `Arvex Aurelius Paradon/Verwandte` mit 15, `Der Große Krieg/Schlachten` mit 11.
   **Der Flex „jede Infobox-Zeile ist eine Passage" trifft hier auf eine Zeile mit 26 Passagen
   darin** — und die Zerlegung dieser 26 ist ungelöst.

### 3.6 Wo die Prosa sich selbst widerspricht

Alles verifiziert, alles **innerhalb eines Artikels oder zwischen zwei direkt verlinkten Artikeln**:

| Widerspruch | Quelle A | Quelle B |
|---|---|---|
| **Waldelf-Größe** | Infobox: `durchschnittsgröße=1,85m` | Abschnitt *Genetik*: *„In der Regel werden die hochgewachsenen Waldbewohner 1,90m groß"* |
| **Flusself-Größe** | Infobox: `durchschnittsgröße=1,80m` | *Genetik*: *„sind 1,85m groß"* |
| **Kobold-Lebenserwartung** | Infobox: `durchschn_lebenserwartung=45` | *Genetik*: *„Kobolde sind in der Regel 1,45m groß und leben 40 Jahre."* |
| **Bodins Geburtsort** | Infobox: `Geburtsort=Tal, Minenreiche` | Lead desselben 714-B-Artikels: *„ein Zwerg, der in Nord Tal geboren wurde"* |
| **Der Name des Kindes** | Lead: *„ein Rotblut Ork namens '''Aricles'''"* | zwei Absätze später: *„Es ist wahrscheinlich, dass **Ares** im Jahr 865 … gezeugt wurde"* |
| **Der Titel des Tieres** | Artikeltitel: `Langfingrige Hutkröte` | Erster Satz: *„Die '''Langfingrige Hohlkröte''' ist ein Tier."* |
| **Datum des Zwergenkriegs** | Infobox: `Beginn=835 / Ende=837` | Prosa: *„kam durch die Eingliederung der Minenreiche in das Kaiserreich im Jahr **333** zu Stande"* |
| **Wann Resif die Stadt Resif verließ** | `Hochelfenrat`: `sitz=Resif (Bis c.a 500 v. K)` | `Königreich Resif`: `regierungssitz=Resif (Bis c.a 700 v. K.)` — Rat und Reich, das er regiert, ziehen 200 Jahre auseinander um |
| **Marine oder Flotte** | `Kaiserliche Marine`, Satz 1 vs. Satz 2: *„Als Kaiserliche Marine bezeichnet man … Die **Kaiserliche Flotte** gehört zu den Kaiserlichen Streitkräften."* | `Kaiserreich`-Infobox führt `Kaiserliche Armee` **und** `Kaiserliche Flotte` als getrennte Verbände, obwohl `Kaiserliche Flotte` eine Weiterleitung auf `Kaiserliche Marine` ist |
| **Die Rangordnung zählt falsch** | `Kaiserliche Armee`: Ränge nummeriert `1, 2, 3, 4, 5, 6, **5**, **6**` — acht Ränge, zwei Nummern doppelt | dieselbe Struktur in `Kaiserliche Marine` zählt korrekt bis 10 |
| **Wie oft das Thing tagte** | `Kaiserthing`: *„Das Kaiserthing wurde nur drei Mal in der Geschichte des Kaiserreichs einberufen."* | derselbe Artikel, zwei Abschnitte später: *„veranstaltete Remus Paradon II. ein weiteres Kaiserthing, bei welchem nur er teilnehmen durfte"* |
| **Kauf teurer als Verkauf — außer einmal** | `Kaiserliches Kurzschwert` und `Numerisches Landsknechtschwert`: `kaufpreis=40, verkaufspreis=20` | `Elfischer Unionssäbel`: `kaufpreis=20, verkaufspreis=40` — **die Felder sind vertauscht, und das ist eine Geldmaschine** |

**Der letzte Eintrag ist der wichtige.** Er ist kein Prosafehler, sondern ein **mechanischer** Fehler
in einem deklarativen Feld. Ein Wiki bemerkt so etwas nie. Ein Produkt, das Infobox-Zeilen zu
mechanischen Klauseln macht, bemerkt es beim Import — **und das ist eine messbare, vorführbare
Überlegenheit gegenüber Fandom, die nichts mit Ästhetik zu tun hat.**

### 3.7 Das Wiki ist zu zwei Dritteln stehengeblieben

Letzte Bearbeitung pro Artikel: **2022**: 16 · **2023**: 38 · **2024**: 18 · **2025**: 0 ·
**2026**: 2. Die beiden Artikel von 2026 sind `Olav der Ehrliche` und `Baldur`. Der Änderungsstand
ist **kein** verlässlicher Indikator für den Spielerstatus: Kaya stellte klar, dass Baldur ein NPC
ist. Die Spielergruppe des Kind-Abenteuers war Olav, Song Kayn und Oggugat; Yal'it gehörte früher
dazu.
Die fünf ältesten (Feb. 2022, seither unangetastet) sind `Gotteserhöhung` (3 B), `Rasse`,
`Katzenartige`, `Spezies` und `Langfingrige Hutkröte`.

**Das ist das Nutzungsmuster, das der Champion beschreibt, in freier Wildbahn:** die Weltstruktur
wird einmal angelegt und stirbt; **gepflegt wird, was am Tisch passiert.** Ein Produkt, in dem der
Kanon vom Abend geprägt wird, hätte hier nicht 74 Artikel und eine tote Taxonomie, sondern 74 Artikel
und einen wachsenden Bodensatz.

### 3.8 Ränder, Naben, Medien

- **Naben** (eingehende Links): `Kaiserreich` 32 · `Humanoide` 27 · `Mensch` 22 · `Zwerg` 22 ·
  `Kaiser` 19 · `Olav der Ehrliche` 19.
- **Orphans** (kein eingehender Link): **2** — `Eron Wiki`, `Liste an Waffen`.
- **Deadends** (kein ausgehender *blauer* Link): **5** — `Akkator`, `Eron (Planet)`,
  `Gotteserhöhung`, `Langfingrige Hutkröte`, `Numerisches Landsknechtschwert`.
- **Medien: der schlechteste Teil des Korpus.** 41 Dateien, **0 mit Lizenzfeld**, 37 ohne jede
  Herkunftsangabe, und das Wiki gibt mit `Kategorie:Bildzitat` und `Kategorie:Lizenz unbekannt`
  selbst zu, dass ein Teil nicht von den Autoren stammt. **Regel ohne Ausnahme: aus diesem Fixture
  werden keine Bilder eingebettet, heruntergeladen oder weiterverbreitet.** Details: `README.md` §6.

---

## 4. Die zehn Passagen

Zehn echte Absätze aus dem Korpus, ausgewählt als Testmaterial für die Kernmechanik. Für jeden: was
er bei der Zerlegung **wird**, und was daran wehtut.

---

**P1 — `Zwerg`, Abschnitt *Genetik*. → Passage mit mechanischer Klausel, die sauberste im Korpus.**

> „Zwerge werden um die 65 Jahre alt und 1,45m groß. Sie können besser im dunkeln sehen als die
> meisten anderen Rassen. Sie gehören zur Spezies der Humanoide."

Drei Sätze, drei Sorten: zwei Messwerte (redundant zur Infobox, also **Duplikat**), **ein
deklarativer Vorteil** (*„besser im dunkeln sehen"* — Dunkelsicht, eine Speziesklausel, wie sie in
jedem Regelwerk der Welt existiert) und eine Taxonomiebehauptung (**Relation**, keine Klausel). Der
Absatz ist der Beweis, dass **die Klausel unter der Prosa liegt und nicht in ihr** — kein Wert, kein
Würfel, keine Zahl, nur eine benannte Fähigkeit. Genau die Art Satz, für die eine Offenbarung Sinn
ergibt: *Sera weiß, dass Zwerge im Dunkeln sehen*, ist eine echte Wissensfrage.

---

**P2 — `Waldelf`, Abschnitt *Genetik*. → Passage mit Klausel, die sich mit ihrer eigenen Infobox
streitet.**

> „Ihre Genetik erlaubt es ihnen pflanzliche und tierische Gifte aus ihrer Heimat locker
> wegzustecken. In der Regel werden die hochgewachsenen Waldbewohner 1,90m groß und leben 90 Jahre."

Satz 1 ist eine **mechanische Klausel** (Giftresistenz, mit Einschränkung: *„aus ihrer Heimat"* —
eine Bedingung, die ein Klauselmodell ausdrücken können muss). Satz 2 sagt **1,90m**, die Infobox
desselben Artikels sagt **1,85m**. Der Import muss hier **zwei Passagen mit widersprüchlichen
Werten** anlegen und den Konflikt **zeigen, statt ihn aufzulösen** — die Antwort „welcher Wert
gewinnt" gehört dem GM, nicht dem Parser.

---

**P3 — `Magie`, Abschnitt *Die 4 Regeln*. → Vier Passagen, jede eine Weltgesetz-Klausel. Das beste
Material im Korpus.**

> „Im Allgemeinen gelten folgende vier Regeln, die unter den Gelehrten als indiskutabel gelten:
> 1. Magie kann nichts aus dem Nichts erschaffen, lediglich vorhandene Energie umwandeln.
> 2. Ein Geist braucht zwangsläufig ein Behältnis. Hat er dies nicht stirbt das Individuum.
> 3. Man kann Niemanden von den Toten zurückholen. (Nekromantie fällt nicht darunter)
> 4. Zeitreisen sind determiniert."

Vier durchnummerierte, deklarative Weltgesetze mit einer expliziten Ausnahme in Klammern. **Das ist
kein Absatz, das sind vier Passagen**, und die Nummerierung ist ihre Ordnung. Und zwei Abschnitte
weiter steht der Grund, warum diese Klauseln **versioniert** sein müssen:

> „Der Magier Song Kayn entdeckte im Jahr 867 die Existenz der Zwischenwelt. Da es ihm gelang Dinge
> aus der Zwischenwelt in die Realität zu befördern bewies er, dass die erste Magie Regel scheinbar
> falsch ist."

**Eine Weltregel wird durch ein Ereignis widerlegt, in-fiction, mit Datum und Entdecker.** Das ist
`widerlegt ≠ supersedes` (CHAMPION §7) an echtem Material: Regel 1 bleibt gültige Vergangenheit und
falsche Gegenwart, und wer im Jahr 866 spielt, für den ist sie noch wahr. **Wenn eine Testtafel je
ein Fixture braucht, ist es dieses.**

---

**P4 — `Blechorgelhammer`, Infobox. → Metadaten, die sich als Prosa verkleiden — und der beste
Klauselträger des Korpus.**

> `schaden = *80 (Gewöhnlich) *92 (Verbessert) *106 (Exzellent) *122 (Meisterhaft) *140 (Episch)`
> `effekt = [[Effekte (Epos Regelwerk)|Panzerbrechend]]` ·
> `bonus = +1 [[Magieklasse (Epos Regelwerk)|Sturm]]` ·
> `klasse = [[Kampfklasse (Epos Regelwerk)|Berserker]]`

Eine einzige Infobox-Zeile, die **fünf** Werte trägt. Und die drei Links darunter verweisen auf ein
**benanntes Regelwerk namens „Epos"** — die einzigen drei Vorkommen im ganzen Korpus, alle drei rot.
**Das Wiki weiß von einem Regelsystem, das im Wiki nicht existiert.**

Und dann rechnen die Zahlen. Die drei Kurzschwerter tragen alle `40/46/53/61/70`, der Hammer
`80/92/106/122/140` — **exakt das Doppelte, Faktor für Faktor**: ×1,15 / ×1,325 / ×1,525 / ×1,75.
**Die Qualitätsleiter des Epos-Regelwerks steckt implizit in vier Infobox-Zeilen.** Ein Import, der
Infobox-Zeilen zu Klauseln macht, kann diese Leiter **erkennen und benennen**; ein Wiki kann es nie.
Das ist die Stelle, an der „besser als Fandom" aufhört, eine Meinung zu sein.

---

**P5 — `Kaiserliches Kurzschwert` vs. `Elfischer Unionssäbel`, Infobox. → Metadaten mit einem Bug.**

> `Kaiserliches Kurzschwert: kaufpreis = 40 [[Kronen]] | verkaufspreis = 20 [[Kronen]]`
> `Elfischer Unionssäbel:   kaufpreis = 20        | verkaufspreis = 40`

Zwei Passagen, ein Widerspruch, eine Konsequenz: **wer Unionssäbel kauft und verkauft, druckt Geld.**
Für die Wiki-Hälfte des Produkts sind das zwei harmlose Zeilen. Für die Tisch-Hälfte ist es ein
Regelfehler. **Der einzige Ort, an dem dieser Fehler auffallen kann, ist eine Anwendung, in der beide
Hälften dasselbe Atom lesen** — und genau das ist die These des Produkts, einmal an echtem Material
bewiesen.

---

**P6 — `Silberwahnsinn`, Lead + Abschnitt *Bekannte Fälle*. → Passage mit Klausel + eine Liste, die
in Wahrheit drei Relationen ist.**

> „Silberwahnsinn ist eine tödliche Krankheit, die überwiegend bei Zwergen auftritt. Andere Humanoide
> Rassen können die Krankheit jedoch auch bekommen. Es gibt keinen dokumentierten Fall einer
> Heilung."

Der Lead ist eine saubere Zustandsklausel mit Spezies-Affinität und einer harten Negation
(*„kein dokumentierter Fall einer Heilung"* — ein Satz, der am Tisch eine Entscheidung erzwingt).
`Ansteckungsgefahr` ist reine Narration mit eingebautem Streit (*„wird von vielen Gelehrten
angenommen … Gegen diese Theorie spricht allerdings"*) — **eine Passage, die eine offene Frage
kodiert, nicht ein Faktum.** Und dann:

> * König Donovin der Irre
> * Jarl Oromin Rubet der 14.
> * König Lodwin der Gigant
> * Hylde (Mutter von Olav dem Ehrlichen)

**Vier Listenpunkte, die keine Absätze sind, sondern vier Kanten `Person → hat Krankheit`.** Drei der
vier Ziele sind eigene Artikel, einer ist ein Redlink mit Zusatz in Klammern. Ob ein Listenpunkt eine
Passage, eine Relation oder beides wird, ist **die größte ungelöste Zerlegungsfrage dieses Korpus** —
163 Listenpunkte stehen im Fließtext, weitere 322 in Infobox-Werten.

---

**P7 — `Flüsterer`, Infobox-Zeile `anführer`. → Metadaten, die Prosa vortäuschen, mit einer
Wissensbombe darin.**

> `anführer = *Norin Sturm (Bis 840) *Denithor der Kolibri (Bis 851) *Ottoman der Bläser (Bis 851)
> *Sythri'in El Mida (Bis 851) *Dak Ul der Hauer (Bis 851) *Thorbin (Als er selbst) (Bis 851)
> *Thorbin (Unter Gedanken Kontrolle) (851-867) *Baldur (Ab 867)`

Eine Infobox-Zeile mit **acht Einträgen, sieben Zeitspannen und einer Person, die zweimal
vorkommt** — einmal *„Als er selbst"* und einmal *„Unter Gedanken Kontrolle"*. Das ist keine Zeile,
das ist eine **Amtszeit-Tabelle mit einem verborgenen Handlungsstrang**. Und es ist der
sauberste Testfall für die Sichtprojektion im ganzen Korpus: **dass Thorbin ab 851 fremdgesteuert
war, ist genau die Sorte Tatsache, die ein Spieler halten kann oder nicht.** Für den einen Leser
steht dort eine Liste von Anführern, für den anderen eine Verschwörung. Byte-identisch bis zur
Offenbarung.

---

**P8 — `Massaker von Mowach`, Abschnitt *Tathergang*. → Reine Narration, und deshalb wertvoll.**

> „Als sie auf der Mauer des Lagers angekommen waren, um auf der anderen Seite wieder herunter zu
> klettern, nahm Olav eine Laterne, warf diese nach unten und zündete das sehr trockene Feld im Lager
> an. Das Feuer entbrannte die Zelte in dem die Soldaten schliefen. Etwa siebzig Soldaten starben in
> den Flammen."

**Keine Klausel, kein Wert, keine Relation — ein Ereignis, dem man beim Passieren zusieht.** Der
Absatz gehört zu einem 6-KB-Artikel, der aus *Vorgeschichte → Nachforschungen → Tathergang →
Auswirkungen* besteht: **die Prosaform, die das Produkt selbst erzeugen will, hier von Hand
geschrieben.** Er ist der Kontrolltest: wenn die Zerlegung an ihm etwas Mechanisches findet, ist die
Zerlegung falsch. Und er ist der beste Kandidat für eine Herkunftsschicht — jeder Satz hier ist
offensichtlich das Protokoll eines Spielabends, nur ohne Beleg, ohne Wurf, ohne Datum. **Genau die
Fußnote, die im Produkt existieren würde und in Fandom nicht.**

---

**P9 — `Bjoldiri`, dritter Lead-Absatz. → Passage mit einer Fraktionsklausel, die ein Ort ist.**

> „Da die Stadt autonom ist, gelten hier meist vom Rest der Welt sehr abweichende Gesetze.
> Rauschmittel, Prostitution und gestattete Sklaverei sind erlaubt. Während Mord zwar offiziell
> verboten ist, drückt die Stadtwache oft ein Auge zu, solange bestimmte Grenzen nicht überschritten
> werden. Die einzige Ausnahme bilden Waffen, die vor dem Betreten der Stadt abgegeben und beim
> Verlassen wieder ausgehändigt werden."

**Eine ortsgebundene Regel, die eine Spielhandlung direkt verbietet:** Waffen werden am Tor
abgegeben. Das ist eine Klausel mit einem **Geltungsbereich, der eine Region ist** — der Fall, den
das Produkt „Wände gehören Regionen" nennt, hier als Gesetzestext statt als Kartenobjekt. Vier Sätze,
und mindestens zwei davon (Waffenabgabe; toleriertes Töten) verändern eine Szene, sobald jemand die
Stadt betritt. **Wenn ein Spieler diese Passage nicht hält, betritt seine Figur die Stadt bewaffnet
und erfährt es auf die harte Tour.**

---

**P10 — `Kaiserreich`, Abschnitt *Authentizität der Berichte*. → Passage über den Wahrheitswert
anderer Passagen. Der schwierigste Fall im Korpus.**

> „Eine große Anzahl an Gelehrten, überwiegend außerhalb des Kaiserreichs, zweifelt diese Erzählung
> vom Krieg der Kriege an. Ein Konflikt dieser Größenordnung sei viel zu schwach dokumentiert. Viele
> Dokumente aus dieser Zeit würden auf wundersame Weise fehlen und die einzigen vollständigen Quellen
> seien Eristische. […] Dennoch sind sich die Gelehrten darüber einig, dass ein Zauberer namens
> Canaran eine Streitmacht gegen die Reiche von Andaria führte und dieser im Jahr 1 v. K. verlor."

Der Absatz ist **weder Narration noch Klausel: er ist ein Kommentar auf die Verlässlichkeit von vier
anderen Absätzen desselben Artikels**, komplett im Konjunktiv (*„sei"*, *„würden"*, *„seien"*). Er
sagt: dieser Teil des Kanons ist umstritten, hier ist wer bezweifelt ihn, und hier ist der Rest, den
alle glauben.

**Das ist der Fall, den der Champion nicht modelliert.** Das Produkt kennt *Erfahren schlägt Gehört*
und `widerlegt ≠ supersedes`, aber nicht *„diese Passage ist offizielle Wahrheit und
wahrscheinlich Propaganda"*. Der Champion nennt in §15.16 seine Weigerung, Lüge zu modellieren, und
begründet sie gut. Dieser Absatz ist der Beleg, dass **echte Weltautoren genau dort schreiben** — und
dass sie es mit Bordmitteln tun: einem eigenen Unterabschnitt und dem Konjunktiv. Die billigste
ehrliche Antwort ist nicht ein Wahrheits-Boolean, sondern **eine Passage, die auf andere Passagen
zeigt** — die Relation existiert bereits im Modell.

---

### 4.1 Was die zehn zusammen sagen

| Kategorie | P |
|---|---|
| Passage mit mechanischer Klausel | P1, P2, P3 (×4), P6, P9 |
| Metadaten, die als Prosa auftreten | P4, P5, P7 |
| Reine Narration | P8 |
| Aussage über andere Aussagen | P10 |
| **Passage, die eine Relation ist** | P6 (Liste), P7 (Amtszeiten), P1 (Taxonomie) |

**Sechs der zehn tragen eine Klausel — und nur zwei davon (P1, P2) stehen in gewöhnlicher
Fließtext-Prosa.** Der Rest steht in Infobox-Zeilen, Listenpunkten oder Nummerierungen. Das ist die
richtige Lesart der Korrektur aus §3.2: **Prosa und Infobox sind mengenmäßig etwa gleich stark, aber
die mechanische Ladung sitzt fast ganz auf der Infobox-Seite.** Prosa trägt die Szene, die Infobox
trägt die Klausel — und die Infobox-Zeile ist zu 21 % selbst eine Liste.

---

## 5. Was ein GM damit am Tisch wirklich macht

### 5.1 Wo das Wiki im Spiel hilft

**Ein Name mit einer Meinung, in zwei Sekunden.** Der Korpus ist voll von Sätzen, die ein GM
mitten im Satz vorlesen kann: *„Den Nordlingen von Terabur sagt man einen starken Hang zu Met,
Weibern und Ringerei zu"*; *„Jeder weiß wer einen Zwerg einmal zum Freund hat, der hat ihn sein Leben
lang"*; *„Egal wo sie sind: Jeder hält sie für Gauner"*. Das sind **Vorurteile, keine Fakten** — sie
liefern sofort eine NSC-Haltung. **Genau diese Sätze sind der Sweet Spot der Kanon-Prägung**: kurz,
zitierbar, an eine Fraktion und eine Spezies gebunden.

**Ortsregeln, die eine Szene sofort verändern.** P9. Ein GM, der beim Betreten von Bjoldiri drei
Zeilen liest, hat eine Szene. Ein GM, der sie nicht liest, hat eine Waffenlast, die nicht hätte da
sein dürfen.

**Werte, die man am Tisch braucht.** Waffenschaden über fünf Qualitätsstufen, Kauf-/Verkaufspreise,
Truppenstärken (*„Legion (1000 Truppen)"*, *„Centurie (100 Truppen)"*, *„Flotte (15 Schiffe)"*),
Einwohnerzahlen, Bevölkerungsanteile (*„80% Menschen, 10% Waldelfen, 5% Zwerge, 5% Andere"*).
**Das sind Zahlen, die eine Probe entscheiden**, und sie stehen alle in Infobox-Zeilen — also genau
dort, wo das Produkt sein Atom ansetzt.

**Der Stammbaum als Sitzordnung.** `Olavs Familie` listet acht Mitglieder; sieben davon haben eigene
Artikel; `Olav/Verwandte` nennt Vater, Mutter, Großvater, Onkel, Halb-Cousin, Gemahlin, Sohn. **Das
ist die Beziehungskarte einer laufenden Kampagne**, in Infobox-Zeilen gegossen. Ein GM, der einen NSC
braucht, braucht keine Erfindung — er braucht diese sieben Namen sichtbar.

**Die Frage „was weiß meine Figur?" hat hier echte Antworten.** *Dass Thorbin ab 851
fremdgesteuert war* (P7). *Dass das Kind der Bastard des Kaisers ist* (`Das Kind`, Lead). *Dass
Silberwahnsinn Olavs Mutter tötete* (P6). Das sind Fakten, deren Verteilung über die Spieler **eine
Szene ist**. Für sie ist die Offenbarungsmechanik gebaut, und der Korpus liefert sie frei Haus.

### 5.2 Wo es nur eine Enzyklopädie ist, die keiner mittendrin öffnet

**`Erismus`, 56 KB, 67 Überschriften, fünf Ebenen.** Feiertage, Fastenregeln, Reinigungsrituale,
Prädestinationslehre, acht geringere Götter, vier Diakonien. **Niemand öffnet das um 21:47 an einem
Samstag.** Es ist Weltbau-Genuss und Lesestoff für die Woche — und exakt das Argument für die
Sechs-Tage-Hälfte des Produkts. Aber es ist auch die Warnung: **das Ding braucht Navigation, keine
Suche.** Sechs Ebenen Überschriften und keine einzige Kategorie sind ein Verzeichnisproblem, das
Fandom ungelöst lässt.

**`Remus' Kaiserreich` (18 KB), `Yal'it der Wissbegierige` (15 KB), `Kaiserreich` (9,7 KB).**
Verfassungsgeschichte und Erbfolgen. Am Tisch braucht man davon **einen** Satz: wer sitzt gerade auf
dem Thron und wer hasst ihn. Der Rest ist Nachschlagewerk. **Der Aushang des Champions — die
personalisierte Startseite — ist hier keine Bequemlichkeit, sondern die einzige Chance, dass diese
Artikel je gelesen werden.**

**Die 1 253 roten Links sind mittendrin ein Ärgernis, nicht ein Versprechen.** Ein GM, der in einer
Szene auf `Andarisch` klickt (18 Nachfragen) und ins Leere fällt, wird beim zweiten Mal nicht mehr
klicken. **Die Tür funktioniert nur, wenn sie selten ist.** Bei 9,3 Türen pro Artikel ist der
Standardzustand eines Links „kaputt", und ein kaputter Link, der aussieht wie eine Einladung, ist
schlimmer als ein kaputter Link, der aussieht wie ein Fehler. **Das ist keine UI-Frage, das ist die
Kappungsfrage aus §3.3, und sie ist offen.**

**`Liste an Waffen`: 88 Redlinks gegen 5 blaue Links, 30 Überschriften, ein Orphan.** Zwei
Abschnitte (`Großschwert`, `Schild`) sind **komplett leer**. Vier Waffen von ~90 haben einen
Artikel — 4,5 %. Das ist die Skizze eines
Ausrüstungskatalogs, und am Tisch ist sie unbrauchbar, weil man Preise und Schaden braucht, nicht
Namen. **Der Beweis, dass ein Wiki das falsche Werkzeug für einen Katalog ist** — und die stärkste
Stelle im Korpus für „ein Gegenstand ist ein Datensatz, kein Artikel".

**Und der Fall, den kein Wiki löst:** `Gotteserhöhung` ist 3 Bytes lang, wird von 8 Artikeln
verlinkt und trägt ein zentrales Weltkonzept. **Fandom kennt keinen Zustand zwischen „Artikel" und
„nichts".** Ein Produkt, in dem ein Absatz die Einheit ist, kennt ihn: ein einzelner geprägter Satz
über die Gotteserhöhung wäre ein vollwertiger, zitierbarer, offenbarungsfähiger Eintrag — und er
wäre in vierzig Sekunden am Tisch entstanden statt in vier Jahren nicht.

---

## 6. Die sechs Sätze, die diese Datei zu einem Auftrag machen

1. **Der Typ kommt aus der Vorlage, aber nur als Vorschlag.** Neun `Regierung`-Artikel sind sechs
   verschiedene Klassen. Der Import braucht einen Bestätigungsschritt über **9 Zeilen**, nicht 74.
2. **Das Domänenmodell hat für 24 von 74 Artikeln keine Klasse.** Ämter, Religionen, Krankheiten,
   Taxa, Verbände, Familien, Indizes. Vor Runde 12 zu entscheiden: eigene Klassen oder ein
   ehrliches `Regelbegriff`-Sammelbecken.
3. **Die Infobox-Zeile trägt die Klausel, die Prosa trägt die Szene — und beide sind gleich
   viele.** `README.md` §5.2 ist zu korrigieren (492 statt 216 Prosa-Absätze, 54:46 statt 73:27,
   §3.2). **Jede fünfte Infobox-Zeile ist selbst eine Liste**, bis zu 26 Einträge tief; die
   Zerlegung von Listenwerten ist ungelöst und blockiert die geteilte Infobox.
4. **Ein Renderer ohne Lead-Prosa-Voraussetzung ist Pflicht.** 8 Artikel haben keine, darunter der
   letzte Kaiser des Reiches.
5. **Nicht jeder rote Link ist eine Tür — aber die Aussortierung ist formal, nicht semantisch.**
   17 Ziele (28 Kanten) sind Datumsmarker oder Schreibvarianten; „generisch klingende" Ziele wie
   `Herzog` oder `Jarl` sind dagegen echte Lücken, denn `Baron` ist ein Artikel. 26 % aller
   Redlink-Vorkommen sind gepipet und damit als Tippfehler unsichtbar. Die **44 Ziele mit ≥ 5
   eingehenden Links (6 %)** sind die einzige Kandidatenmenge, die ohne Erfindung aus den Daten
   folgt — gegen eine Kappung von 3 pro Woche.
6. **Der Wertefehler im Unionssäbel ist die Demo.** Ein Import, der Infobox-Zeilen als mechanische
   Klauseln liest, findet in einem echten fremden Wiki einen echten Regelfehler, den vier Jahre
   Wiki-Betrieb nicht gefunden haben. **Das ist „besser als Fandom", gemessen statt behauptet.**
