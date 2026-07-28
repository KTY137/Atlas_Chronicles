# Eron — Fixture, Provenienz und Lizenz

**Das Beispiel-Universum des Projekts. Ein Testkorpus, niemals Produktinhalt.**

Harvest: **2026-07-27** · Quelle: **https://eron.fandom.com/de/** · Sprache **de** ·
MediaWiki **1.43.9** · `wikiid = deeron` · Kanal: MediaWiki-API über `curl`
(WebFetch liefert für diesen Host 402, gerendertes HTML 403 — Cloudflare).

---

## 1. Wem die Welt gehört, und was das Produkt daraus nicht machen darf

Eron ist eine Fantasy-Welt, geschrieben von **Kaya und seinen Kollegen**. Sie ist der Crew als
Beispiel-Universum übergeben worden — *„das können wir ja als Beispiel Universum verwenden"* … *„eron
ist ja nur ein Beispiel"*.

Daraus folgt eine harte Grenze, die jeder Artefakt-Autor kennen muss:

> **Eron ist Fixture und Skin, nie Gegenstand.** Das Produkt bleibt welt- und systemagnostisch
> (Invariante **K7**: Kunst ist Content und Skin, nie eine eingeschweißte dargestellte Welt).
> **Ein Kandidat, der Eron hartverdrahtet, ist gescheitert.** Jede Oberfläche, die mit diesem Fixture
> gebaut wird, muss mit einem anderen Korpus genauso funktionieren — ohne DOM-, Controls- oder
> Komponentenänderung.

Der Import ist ausserdem kein Demo, sondern ein **Abnahmetest an echtem Material**: *„wikiFandom ist
halt scheiße, wir wollen das in besser integrieren und dann unser wiki in unsere custom app bringen
(auch als Test ob das funktioniert)"*. „Besser als Fandom" hört damit auf, ein Slogan zu sein, und wird
messbar — die Zahlen dafür stehen in §4 und §5.

## 2. Lizenz und die Attributionspflicht, die daraus entsteht

Die API meldet als `rightsinfo`:

```
url  = https://www.fandom.com/de/licensing-de
text = CC-BY-SA
```

Fandom-Textinhalte stehen unter **CC BY-SA** (dort: CC BY-SA 3.0 Unported). Das ist eine **freie, aber
nicht bedingungslose** Lizenz. Konkret schuldet ihr bei jeder Verwendung dieses Textes:

1. **Namensnennung (BY)** — Quelle „Eron Wiki", die URL des jeweiligen Artikels, und der Hinweis auf die
   Autorenschaft. Die Autorenhistorie liegt nicht in diesem Fixture; wer sie braucht, holt sie über
   `prop=revisions&rvprop=user` nach. Für interne Design-Spikes genügt die Wiki- und Artikel-URL,
   für alles Veröffentlichte nicht.
2. **Lizenzangabe** — „CC BY-SA 3.0", verlinkt.
3. **Share-alike (SA)** — Bearbeitungen und Ableitungen dieses **Textes** müssen unter derselben Lizenz
   weitergegeben werden.
4. **Kennzeichnung von Änderungen** — die hier gespeicherte Prosa in `fixture.js` ist **bearbeitet**:
   Wiki-Markup entfernt, Absätze auf ~460 Zeichen gekürzt. Das ist im Kopf der Datei vermerkt und muss
   es bleiben.

**Was das für das Produkt bedeutet, und es ist eine Design-Anforderung, keine Fußnote:** wer einen
Fandom-Import anbietet, importiert Inhalte unter einer Share-alike-Lizenz in eine Anwendung, in der
Nutzer sie weiterschreiben. Der Importer muss Quell-URL und Lizenz **pro Artikel** mitführen und beim
Export wieder ausgeben, sonst produziert das Produkt Lizenzverstöße im Namen seiner Nutzer. Das ist eine
Spalte im Datenmodell, kein Text im Impressum.

**Bilder sind ein separater und schlechterer Fall — siehe §6.** Es liegen **keine Bild-Binärdaten** in
diesem Fixture, nur URLs und Metadaten. Das ist Absicht.

## 3. Was in diesem Verzeichnis liegt

| Datei | Inhalt | Größe |
|---|---|---|
| `eron-export.xml` | **Der echte MediaWiki-XML-Export** aller 74 ns0-Artikel (`action=query&export=1`), aus 5 Batches zu **einem gültigen XML-Dokument** zusammengeführt: Header + `<siteinfo>` aus Batch 0, danach alle `<page>`-Elemente. Schema `export-0.11`. Das ist das Artefakt, das der Migrationstest frisst. | 351 KB |
| `articles.json` | 74 Records: `title`, `pageid`, `revid`, `last_edit`, `bytes`, **vollständiger `wikitext`**, `categories`, `links`, `templates_used`, `images`, `extlinks`, `sections` (geparste Überschriftenstruktur). | 420 KB |
| `templates.json` | Alle **124 ns10-Vorlagen** und **22 ns828-Scribunto-Module** mit Quelltext, `portable_infobox`-Flag, extrahierten Infobox-Feldern, Parametern, `#invoke`-Zielen und `used_by_articles`. | 205 KB |
| `media.json` | Alle **41 Dateien** mit `imageinfo` inkl. `extmetadata`, Kategorien, Uploader, sha1, Beschreibungsseiten-Wikitext und nutzenden Artikeln. **Keine Binärdaten.** | 43 KB |
| `graph.json` | Der interne Linkgraph: `nodes` mit In-/Out-Grad, `edges` (Artikel→Artikel), `edges_other_namespaces`, **`redlinks`** und `redlink_targets_by_incoming`, Orphans, Deadends. | 236 KB |
| `fixture.js` | **Kuratierter Auszug, 20 Entities** über 10 Klassen, echte deutsche Prosa, echte Infobox-Zeilen, echte Links und Redlinks. ES-Modul + `window.ERON`. Zum Inlinen in Spikes. | 61 KB |
| `README.md` | Dieses Dokument. | — |

Die Existenz **jedes** Linkziels wurde per `prop=info` einzeln geprüft (762 distinkte Ziele). Die
Redlinks sind daher die **echten** Redlinks des Wikis, nicht aus der Titelliste erschlossene.

## 4. Der Korpus in Zahlen

| Größe | Wert | Gegengeprüft |
|---|---:|---|
| Artikel (ns0) | **74** | = `siteinfo.statistics.articles` ✓ |
| Seiten gesamt | 316 | `siteinfo` |
| Bearbeitungen | 1 153 | `siteinfo` |
| Wikitext gesamt | **307 255 Bytes** | identisch in `articles.json` und `eron-export.xml` ✓ |
| Artikelgröße min / median / max | 3 / 1 591 / **56 582** B | `Erismus` ist der größte |
| Abschnitte (`==`) gesamt | 413 | 24 Artikel haben **null** Abschnitte |
| Vorlagen ns10 / Module ns828 | 124 / 22 | |
| Dateien | 41 (`siteinfo` sagt 38 — s. §6) | |
| Kategorien mit Inhalt | 43 | |

**Die Verteilung ist brutal schief und genau deshalb ein gutes Fixture:** `Erismus` (56 KB) und `Olav
der Ehrliche` (36 KB) tragen zusammen **30 %** des gesamten Korpus, während der Median bei 1 591 Bytes
liegt und `Eron (Planet)` aus **236 Bytes reiner Infobox** besteht. Ein Layout, das nur an einem
mittleren Artikel getestet wurde, ist nicht getestet.

## 5. Die fünf Befunde, die das Design betreffen

### 5.1 Der rote Link ist die Mehrheit, nicht die Ausnahme

| | Kanten | Anteil |
|---|---:|---:|
| Artikel → **existierender** Artikel (blau) | 556 | 30,7 % |
| Artikel → **nicht existierende** Seite (rot) | **1 253** | **69,3 %** |

**689 distinkte fehlende Seiten** bei 74 vorhandenen Artikeln — auf jeden geschriebenen Artikel kommen
**9,3 Türen**. Das ist die wichtigste Zahl dieses Harvests. Der Headline-Flex des Champions
(*„Der rote Link ist eine Tür"*, CHAMPION §3.4) ist an echtem Material nicht die Randfunktion, für die
er gehalten werden könnte — er ist die **Hauptoberfläche des Lesens**. Zugleich verschärft das die
Gate-Frage: bei 1 253 Türen ist „jede Tür ist eine Vollmacht" nicht bedienbar. Die Kappung
(≤1 Vollmacht/Spieler/Woche + 2 freie, CHAMPION §4.9) trifft hier auf eine Nachfrage von drei
Größenordnungen darüber. **Wie aus 1 253 Türen 3 werden, ist ungelöst und gehört in die nächste Runde.**

Meistgewünscht: `Andarisch` (18×), `Nördliche Minenreiche` (16), `Andaria` (15), `Blattheim` (14),
`Königreich Terabur` (13), `Remus Paradon II.` (13), `Minenreiche` (12), `Baumgard` (11).
Die rotlink-reichsten Artikel: `Erismus` (90), `Liste an Waffen` (88), `Remus' Kaiserreich` (84),
`Olav der Ehrliche` (83).

Kurios und für die Namenswache relevant: das Wiki verlinkt **Epochenmarker** wie `[[n. K.]]` und
`[[v. K.]]` als Seiten. Ein Importer, der jeden Redlink zur Tür macht, baut Türen zu „nach Kaiser".
**Nicht jeder rote Link ist eine Tür — manche sind Tippfehler und Datumsformate.**

### 5.2 Ein Artikel ist keine Passage — und die Passagen sind überwiegend Infobox-Zeilen

Zerlegt man den Korpus auf die Atom-Ebene des Champions (CHAMPION §8):

| Kandidat-Passagen | Anzahl | Anteil |
|---|---:|---:|
| Infobox-Feldzeilen | **583** | 73 % |
| Prosa-Absätze (≥40 Zeichen) | 216 | 27 % |
| **Summe** | **799** | |
| zusätzlich: Listenpunkte | 212 | (Zerlegung offen) |

74 Artikel → **799 Passagen**, also **10,8 Passagen pro Artikel** — die These „ein Fandom-Artikel ist
eine Seite aus vielen" bestätigt sich an echtem Material. **Aber die Gewichtung ist die Überraschung:**
die Infobox trägt drei Viertel der adressierbaren Atome, nicht die Prosa. Der Flex *„die geteilte
Infobox"* (CHAMPION §3.2, jede Infobox-Zeile eine eigene Passage mit eigener Herkunft) ist damit nicht
eine hübsche Zugabe zum Prosa-Modell — er **ist** das Modell für diesen Korpus.

Zwei Artikel im kuratierten Subset haben **überhaupt keine Prosa**: `Arvex Aurelius Paradon` (der
Namensgeber des Hauses, 18 Infobox-Zeilen, null Fließtext) und `Eron (Planet)`. Sie sind absichtlich im
Fixture und mit `prose_note` markiert. **Ein Renderer, der eine Lead-Prosa voraussetzt, zerbricht am
prominentesten Charakter des Wikis.**

Die 212 Listenpunkte sind ungelöst: eine Liste wie `Bekannte Fälle` in `Silberwahnsinn` ist semantisch
eine Relation (`Person → hat Krankheit`), kein Absatz. Ob ein Listenpunkt eine Passage, eine Relation
oder beides wird, ist **eine offene Designfrage** und in diesem Fixture nicht entschieden.

### 5.3 Alle Infoboxen sind Fandom Portable Infoboxes — das ist die gute Nachricht

**18 von 18** Infobox-Vorlagen benutzen Fandoms `<infobox>`-XML-Markup, **keine** ist eine klassische
Tabellenvorlage. Das ist der migrationsfreundlichste Fall: die Feldstruktur ist **deklarativ und
maschinenlesbar** (`<data source="…">`), muss also nicht aus Wikitable-Markup rückgeraten werden. Der
Importer kann Vorlage → Entity-Typ und `source` → Feld direkt abbilden.

Tatsächlich **benutzt** werden nur 9 Vorlagen — das ist die reale Typ-Taxonomie des Wikis:

| Vorlage | Artikel | Felder def. | Entspricht Klasse |
|---|---:|---:|---|
| `Vorlage:Person` | **20** | 41 | Charakter |
| `Vorlage:Regierung` | 9 | 21 | Organisation / Polity / Haus |
| `Vorlage:Rasse/Spezies` | 8 | 5 | Spezies |
| `Vorlage:Rüstung/Waffe` | 4 | 14 | Gegenstand |
| `Vorlage:Krieg` | 3 | 18 | Ereignis |
| `Vorlage:Stadt` | 2 | 18 | Ort |
| `Vorlage:Infobox Charakter` | 2 | 17 | Charakter (Dublette!) |
| `Vorlage:Planet/Mond` | 1 | 8 | Ort |
| `Vorlage:Ereignis` | 1 | 13 | Ereignis |

Zwei Beobachtungen mit Konsequenzen: **(a)** `Person` **und** `Infobox Charakter` modellieren beide
Charaktere — echte Wikis führen konkurrierende Schemata parallel, der Importer braucht Mapping, nicht
Automatik. **(b)** `Vorlage:Person` deklariert **41** Felder, aber Artikel füllen typisch 14–28. Ein
Sheet-Renderer muss **leere Felder auslassen**, nicht Platzhalter zeigen.

**137 von 146 Vorlagen/Modulen sind ungenutzt** — Fandoms mitgeliefertes Boilerplate (`Infobox Album`,
`Infobox Episode`, `Infobox Spiele` …). Ein Importer, der stumpf alle Vorlagen migriert, importiert
94 % Müll. Kein Artikel ruft ein Scribunto-Modul direkt auf; die Lua-Schicht ist reine Fandom-
Infrastruktur und **muss nicht portiert werden** — ein echtes Migrationsrisiko, das sich hier auflöst.

### 5.4 Kategorien existieren praktisch nicht — die Taxonomie steckt in den Vorlagen

**Nur 3 von 74 Artikeln** tragen überhaupt eine Kategorie (alle drei `Kategorie:Charaktere`). 71
Artikel sind unkategorisiert; das bestätigt `querypage=Uncategorizedpages` (71). Von den 43 Kategorien
mit Inhalt sind fast alle Vorlagen- und Wartungskategorien, keine Weltkategorien.

**Konsequenz:** ein Importer, der Kategorien als Klassifikation nutzt, bekommt aus diesem Wiki nichts.
Die reale Klassifikation ist die **gewählte Infobox-Vorlage** (§5.3). Fandoms eigenes
Organisationsangebot wird von echten Autoren nicht benutzt — ein direktes Argument für „in besser":
**der Typ soll aus der Struktur folgen, die der Autor ohnehin ausfüllt, nicht aus einer zweiten Pflicht,
die er ignoriert.**

### 5.5 Der Graph ist dicht, mit sehr wenigen Rändern

Naben (In-Grad): `Kaiserreich` 32, `Humanoide` 27, `Mensch` 22, `Zwerg` 22, `Kaiser` 19,
`Olav der Ehrliche` 19, `Remus' Kaiserreich` 16, `Magie` 15.
**Orphans** (kein eingehender Link): `Eron Wiki`, `Liste an Waffen`.
**Deadends** (kein ausgehender *blauer* Link): `Akkator`, `Eron (Planet)`, `Gotteserhöhung`,
`Langfingrige Hutkröte`, `Numerisches Landsknechtschwert` — die API-eigene `Deadendpages` zählt 3, weil
sie Redlinks mitzählt; die Differenz ist eine Definitionsfrage, kein Fehler.

## 6. Medien — die Provenienz ist der schlechteste Teil dieses Korpus, und das ist zu sagen

41 Dateien, **keine Binärdaten geholt** (Absicht). Und der Befund ist unbequem:

- **0 von 41** Dateien tragen ein Lizenzfeld in `extmetadata` (`LicenseShortName`, `License`,
  `UsageTerms` — durchgehend leer).
- **Nur 4 von 41** tragen überhaupt eine Lizenz-Kategorie: 1× `PD` (die Fandom-Beispieldatei
  `Beispiel.jpg`), 1× `Bildzitat` (`Mensch.jpg`), 1× `Lizenz unbekannt` (`Ormin.png`), 2× `Bilder`
  (Wiki-Chrome). Für **37 Dateien ist die Herkunft schlicht undokumentiert.**
- `Kategorie:Bildzitat` und `Kategorie:Lizenz unbekannt` sind Selbstauskünfte des Wikis, dass mindestens
  ein Teil des Bildmaterials **nicht** von den Autoren stammt.
- 14 Dateien sind verwaist (von keinem Artikel benutzt), darunter fünf Andaria-Karten-Varianten.

**Regel für die Crew, ohne Ausnahme:** aus diesem Fixture werden **keine Bilder in Artefakte
eingebettet, nicht heruntergeladen und nicht weiterverbreitet.** `media.json` ist eine Bestandsaufnahme
für den Importer-Entwurf, keine Asset-Bibliothek. Wo ein Spike ein Bild braucht, gehört dorthin ein
Platzhalter oder ein Asset mit belegter Lizenz (K5(e): CC0/Kenney o. ä.).

**Für das Produkt ist das ein Feature-Befund, kein Ärgernis:** wenn ein echtes, gepflegtes Wiki bei
90 % seiner Bilder die Lizenz nicht kennt, dann ist ein Importer, der die Lizenz **erzwingt oder
wenigstens sichtbar als unbekannt markiert**, eine echte Verbesserung gegenüber Fandom — messbar, nicht
behauptet.

Die kleine Zähldifferenz (`siteinfo` sagt 38 Bilder, `allpages ns6` listet 41) rührt daher, dass
`statistics.images` nur Uploads mit Bild-Mediatyp zählt, während ns6 auch `Favicon.ico` und die beiden
`Site-background-*` mitführt. Beide Zahlen sind korrekt; im Fixture liegen alle 41.

## 7. Wie man das Fixture benutzt

```js
// ES-Modul
import { ERON, byId, byClass, redlinks } from './fixture.js';
byId['silberwahnsinn'].lead[0];        // echter deutscher Absatz
byId['haus-paradon'].infobox.rows;     // [{label, value, links, redlinks}]
byId['arvex-aurelius-paradon'].prose_note;  // reine Infobox, kein Fließtext
byClass.species;                       // Zwerg, Dunkelelf, Mensch, Ork
ERON.redlinkHotlist;                   // meistgewünschte fehlende Seiten des GANZEN Korpus

// klassisches Script
// <script src="fixture.js"></script>  ->  window.ERON
```

Enthaltene 20 Entities über 10 Klassen: **character** (Arvex Aurelius Paradon, Olav der Ehrliche, Valor
Saron) · **house** (Haus Paradon) · **organisation** (Hochelfenrat, Bruderschaft der nie erlöschenden
Flamme) · **polity** (Kaiserreich) · **place** (Eron (Planet), Bjoldiri) · **event** (Der Große Krieg,
Massaker von Mowach) · **species** (Zwerg, Dunkelelf, Mensch, Ork) · **weapon** (Elfischer Unionssäbel,
Blechorgelhammer) · **magic** (Magie, Silberwahnsinn) · **religion** (Erismus).

Pro Entity: bis zu 2 Lead-Absätze + 2 Abschnitte à 1 Absatz (je ≤460 Zeichen, an Satzgrenze gekürzt),
alle Infobox-Zeilen mit aufgelösten Links, bis zu 18 Redlinks in Dokumentreihenfolge, Bild-**URLs**
(keine Daten), echte Kategorien, Quell-URL.

**Beim Bauen zu beachten:** `infobox` kann `null` sein · `lead` kann leer sein (dann `prose_note`
prüfen) · Werte enthalten `·`-getrennte Listen aus Wiki-Bullets · Titel enthalten Umlaute, Apostrophe
(`Yal'it`) und Klammern (`Eron (Planet)`) — genau dafür sind sie drin.

## 8. Reproduktion

Der Harvest lief ausschließlich über `curl` gegen `https://eron.fandom.com/de/api.php`, mit
Titel-Batches (20 für `prop=`, 15 für `export`), ~0,35 s Pause zwischen Aufrufen und
Continuation-Verfolgung. **Keine Anfrage ist fehlgeschlagen; alle 74 Artikel liegen vollständig vor.**

Verifiziert nach dem Schreiben: `eron-export.xml` parst mit `ElementTree`, enthält **74** `<page>`,
keine Dubletten, keine fehlenden und keine überzähligen Titel gegenüber `list=allpages`; die Summe des
Wikitexts im XML (**307 255 B**) ist identisch mit der in `articles.json`; `fixture.js` wurde mit
Node 24 als Modul importiert und liefert 20 Entities.
