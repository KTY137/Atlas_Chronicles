# PRÜFUNG — Argus über WELT.md, RB-12 und RB-13

**Argus, der Wächter · 2026-07-27.** Auftrag: jede Zahl, jedes Zitat, die Fixture-Integrität und
jeden Widerspruch der drei frisch geschriebenen Dokumente gegen die geernteten Daten prüfen.

**Womit geprüft wurde.** Alle Zahlen wurden aus `articles.json`, `graph.json`, `templates.json` und
`media.json` **neu berechnet** (eigene Skripte: balanced-brace-Scanner für Vorlagenaufrufe,
tiefenbewusster Parameter-Splitter, Absatzzerleger, Linkzähler). `eron-export.xml` wurde mit
`ElementTree` geparst, `fixture.js` mit Node 24 als ES-Modul importiert. Zusätzlich **21 Live-Calls**
gegen `https://eron.fandom.com/de/api.php` über `curl` (Namespace-Inventar, `siteinfo`,
`allcategories`, `querypage`, `prop=contributors` über alle 74 Titel, `Karte:Andaria`, drei
`Erismus`-Revisionen, `action=parse`, `siprop=extensions`, HEAD gegen drei URLs). Kein Call ist
fehlgeschlagen außer den erwarteten Cloudflare-403 auf HTML-Pfaden.

**Das Urteil in drei Sätzen.** `WELT.md` ist auf der Zahlenseite das solideste der drei Dokumente —
seine Korrektur an `README.md` §5.2 ist **unabhängig bestätigt** — und leidet nur an Kleinkram und
vier unsauberen Zitaten. `RB-12` ist in seiner Forensik (Lizenzen, XML, Karte, Türtriage, Lua)
**hervorragend und exakt**, aber sein Zerleger hat zwei Fehler, die genau die tragenden Zahlen
treffen: **583 statt 543 Infobox-Felder** und eine **88,9-%-Messung, die mit einem anderen, defekten
Zerleger entstanden ist als dem, den §2.4 spezifiziert**. `RB-13` ist auf der Fandom-Seite gut belegt,
transportiert aber die von `WELT.md` bereits korrigierten Passagenzahlen weiter und stützt sein
schärfstes Argument (§1.3) auf eine Messung, die heute nicht reproduzierbar ist.

---

## 0. Was sauber ist — namentlich, damit ein Freispruch etwas bedeutet

Diese Aussagen habe ich nachgerechnet und sie stimmen **exakt** (nicht „ungefähr"):

**`WELT.md`**

| Abschnitt | Geprüft | Ergebnis |
|---|---|---|
| §2 Vorlagentabelle | Person 20 · Infobox Charakter 2 · Regierung 9 · Rasse/Spezies 8 · Rüstung/Waffe 4 · Krieg 3 · Ereignis 1 · Stadt 2 · Planet/Mond 1 · keine Vorlage 24 | **alle zehn exakt**, Summe 74 ✓ |
| §3.1 | 307 255 B · min 3 · Median 1 585,5 · max 56 582 · Erismus+Olav 92 199 = 30,0 % · <200 B: 5 · <500 B: 13 · <1500 B: 35 · ohne Abschnitt: 24 | **alle exakt**; die Bemerkung zu 1 580/1 591 ist korrekt |
| §3.1 | `Gotteserhöhung` = `Die` (3 B, 8 eingehende) · `Akkator` = `Akkator` (7 B, 12 eingehende) | **exakt** |
| §3.4 | 3 von 74 kategorisiert, alle `Kategorie:Charaktere`; nur `Ekmont von Radfurt` explizit im Quelltext; `{{#ifeq: {{NAMESPACENUMBER}} \| 0 \| [[Kategorie:Charaktere]]}}` steht **wörtlich** in `Vorlage:Infobox Charakter` und **nicht** in `Vorlage:Person`; 3/22 = 13,6 % | **exakt** |
| §3.5 | Genau **6** leere Werte — und es ist **dieselbe Sechserliste** (Bjoldiri/Rolle, Fjördin/Einheit, Kaiserreich/caption1, Ormin/Organisation, Zwergenkrieg/Verluste1+2). Person: 41 deklarierte `<data source>`, Artikel nutzen **9 bis 28**, genau **Rasse + Geschlecht** in allen 20, **14 von 41** in ≤4 Artikeln, **`Dienstnummer` und `Ereignisse` in null** | **alles exakt.** Der stärkste Abschnitt des Dokuments |
| §3.6 | **Alle 13 Widerspruchszeilen** im Wikitext verifiziert — inkl. Rangnummerierung `1,2,3,4,5,6,5,6` in `Kaiserliche Armee` gegen sauberes 1–10 in `Kaiserliche Marine`, und der vertauschten Preise des `Elfischen Unionssäbels` (20/40 gegen 40/20 bei zwei anderen Kurzschwertern) | **exakt.** Die „Geldmaschine" ist echt |
| §3.7 | 2022: 16 · 2023: 38 · 2024: 18 · 2025: 0 · 2026: 2 (Baldur 2026-03-11, Olav 2026-03-16); fünf älteste = Gotteserhöhung, Rasse, Katzenartige, Spezies, Langfingrige Hutkröte | **exakt** |
| §3.8 | Naben 32/27/22/22/19/19 · Orphans 2 · Deadends 5 · 41 Dateien · 0 Lizenzfeld | **exakt** (zur „37" siehe M1) |
| §4 P1–P10 | Alle zehn Passagen sind **wörtlich** im Korpus. Die Schadensleiter stimmt: drei Kurzschwerter 40/46/53/61/70, Hammer 80/92/106/122/140, Faktor exakt 2, Stufen ×1,15/×1,325/×1,525/×1,75. „Epos Regelwerk" kommt **dreimal** vor, alle drei in `Blechorgelhammer`, **alle drei rot** | **exakt** |
| §5 | `Liste an Waffen`: 88 rot / 5 blau / 30 Überschriften / Orphan / `Großschwert` und `Schild` sind die einzigen leeren Blatt-Abschnitte / 4 von 93 Waffen haben einen Artikel | **exakt** |

**`RB-12`**

| Abschnitt | Geprüft | Ergebnis |
|---|---|---|
| §1.1 Namespace-Inventar | ns0 74 · ns2 14 · ns4 1 · ns6 41 · ns8 2 · ns10 124 · ns14 36 · ns502 1 · ns828 22 · ns2900 1 = **316** | **live verifiziert, alle zehn Zeilen** |
| §1.1 Korrektur an README | `apfilterredir=nonredirects` = **73**, `redirects` = **1** (`Kaiserliche Flotte`) | **live verifiziert.** Die Korrektur ist richtig und wichtig |
| §1.2 XML-Anatomie | parst · 74 `<page>` · 74 `<revision>` · 65 `<parentid>` · 74 `<contributor>` · 24 `<comment>` · 1 `<redirect>` · Textsumme **307 255 B** = `articles.json` · Titelmengen identisch, keine Dubletten | **exakt** (Ausnahme: „all 42" Namespaces, siehe m10) |
| §1.5 `Karte:Andaria` | `interactivemap` · **98 620 B** · **190 Marker** · **16 Kategorien** mit exakt den genannten Zählungen (33/30/28/28/26/7/6/5/5/4/4/4/3/3/2/2) · `mapBounds [[0,0],[8192,8192]]` · `origin bottom-left` · `coordinateOrder xy` · zuletzt **2025-12-07** | **live verifiziert, jede Zahl** |
| §2.3 Parser-Fallen | **29** `}}`-Klebestellen in **28** Artikeln · **21** `[[Datei:…]]` in **11** Artikeln, **alle 21** an Prosa geklebt · linktrail-Regex wörtlich | **exakt** |
| §2.2 Konstruktzählung | `<ref>` 0 · `<blockquote>` 8 in 2 Artikeln · Wikitable 1 · `<gallery>`/`#invoke`/`#if`/`~~~~`/extlinks je 0 · DISPLAYTITLE 2 · DEFAULTSORT 1 · `<br>` 4 · `<nowiki>` 4 · Weiterleitung 1 · 413 Abschnitte · **88 Abschnitte ohne Rumpf** | **exakt** |
| §2.2 Prosastatistik | Median 392 (Doku: 390) · Mittel 473 (476) · **p90 895 (895)** | reproduziert (max weicht ab, m14) |
| §2.10 `Der Große Krieg` | 6 226 B · pageid 258 · revid 1072 · 2024-01-24 · 6 Überschriften · 0 Kategorien · 0 Bilder · 16 Infobox-Zeilen · 7 Absätze | **exakt** |
| §3.1–3.2 Lua | **0** `{{#invoke` in 307 255 B Artikeltext · `Kategorie:Scribunto-Module mit Fehlern` = **9**, alle `/Dok` · 22 Module · 9 von 146 benutzt → **137 ungenutzt** · `Vorlage:Regierung 2` = 0 Bytes · 11 Vorlagen mit `#invoke` | **exakt, live bestätigt** |
| §5.1 Kategorien | 43 deklariert, 28 nicht leer, nur `Charaktere` mit ns0-Mitgliedern; `Uncategorizedpages` = 71 | **live verifiziert** |
| §5.2/§5.3 Graph | 556 blau · 1 253 rot · 689 distinkte Ziele · 69,3 % · Naben, Orphans, Deadends | **exakt** |
| §5.4 Türtriage | **Tür 113 · Spur 100 · Notiz 472 · Verworfen 4 (15 Kanten)** — Summe 689 | **exakt reproduziert.** Sauberste Ableitung des Dokuments |
| §6.1 Lizenzforensik | 41 Dateien · 56,7 MB · 28 JPEG/12 PNG/1 ICO · 27 benutzt / 14 verwaist · größte 7 216 150 B · `extmetadata` nur `DateTime`+`ObjectName` · **`{{Selbst erstellt}}` 7 (7/7 benutzt) · `{{Bildzitat}}` 1 (benutzt) · `{{Keine Vorauswahl}}` 1 · `{{PD}}` 1 · `{{CC-BY-SA}}` 1 · ohne Marker 30 (18 leere Seiten, 12 Prosa ohne Marker), davon 19 benutzt** | **jede einzelne Zahl exakt** |
| §6.1 Der Namespace-Bug | `Kategorie:Selbst erstellte Dateien`, `CC-BY-SA Dateien`, `Erlaubnis` sind **live leer (size 0)**, während `PD`, `Bildzitat`, `Lizenz unbekannt` je 1 Mitglied haben | **live bestätigt.** Der beste Befund im ganzen Dokument |
| §2.5 Revisionspaar | `Erismus` hat **72** Revisionen, 2023-05-05 → 2024-06-22; revs **788/910/1139/1140** existieren mit den genannten Daten | **live verifiziert** (die daraus gezogene Zahl nicht — siehe **B2**) |

**`RB-13`**

| Abschnitt | Geprüft | Ergebnis |
|---|---|---|
| §1.3 | **226** geladene Extensions; **alle 34** namentlich genannten Extensions (AdEngine … StaffPowers, CloseDeadWiki, UnifiedSearch, ContentReview, AgeDeclaration, KidWikiChangeObserver, LegalImageReporting) existieren | **live verifiziert** |
| §1.1 | MediaWiki 1.43.9, `lang=de`, `wikiid=deeron`, `case=first-letter` | **live verifiziert** |
| D4 | `Erismus` gerendert = **165 600 B** HTML | **exakt** (Textseite: siehe M6) |
| D4/M6 | Gesamtkorpus 307 255 B Wikitext | **exakt** |
| §4.1 | `rightsinfo` = `{fandom.com/de/licensing-de, CC-BY-SA}` | **live verifiziert** |
| M13 | `eron-export.xml` = echtes `export-0.11`, 74 Seiten, 351 KB (359 391 B) | **exakt, parst sauber** |

**Fixture-Integrität**

- `eron-export.xml` ist **wohlgeformt** (`ElementTree`, `export-0.11`, `xml:lang=de`), 74 `<page>`,
  keine Dubletten, Titelmenge deckungsgleich mit `articles.json`, Textsumme byte-identisch.
- `fixture.js` **parst als ES-Modul unter Node 24**, exportiert `ERON`, `byId`, `byClass`,
  `redlinks`, setzt `window.ERON` im Script-Pfad, liefert **20 Entities über 10 Klassen** — exakt
  das, was `README.md` §7 zusagt.
- **Die deutsche Prosa ist echt und sauber:** über alle 20 Entities (26 Lead-Absätze + 30
  Abschnittsabsätze) **null** Reste von `[[`, `]]`, `{{`, `}}`, `'''` oder HTML-Tags. Stichproben
  gegen `articles.json` sind wortgleich.
- **Alle 20 Infobox-Zeilenzahlen stimmen exakt** mit den gefüllten Feldern des jeweiligen Artikels
  überein (Arvex 18/18, Olav 27/27, Kaiserreich 16/16, Der Große Krieg 16/16, …) — auch bei den
  Artikeln, deren Infobox **nicht** am Anfang steht. Der Infobox-Extraktor des Fixtures ist korrekt.
- `README.md` §3 Größenangaben (420/205/43/236/61 KB, 351 KB) stimmen alle.

> **Zur Vorgabe „zwölf Entities" im Auftrag:** in keinem der drei Dokumente noch in `README.md`
> steht eine Zwölf-Entity-Anforderung. Die dokumentierte Anforderung lautet **20 Entities über 10
> Klassen**, und `fixture.js` liefert genau das, mit den in `README.md` §7 namentlich genannten
> Titeln. Ich melde das als Abweichung im Auftrag, nicht im Artefakt.

---

## 1. Blocker

### B1 — `RB-12` verliert **40 von 583** Infobox-Feldern und nennt das Ergebnis „543 von 543, null Verlust"
**Datei:** `RB-12`, „The answer in one paragraph", §2.1, §2.2, §4.2, §4.3, A3, A4, A5.

**Behauptung:** *„543 of 543 filled infobox parameters in the corpus resolve to a declared
`<data source=…>` … zero undeclared, zero guessing"*; Feldtabelle mit `Person` 359, `Regierung` **56**,
`Rasse/Spezies` **17**, Summe **543**.

**Die Daten sagen:** Der Korpus enthält **589 Infobox-Parameterinstanzen, davon 583 gefüllt und 6
leer**. Pro Vorlage: Person **359** ✓ · Regierung **78** (nicht 56) · Krieg 39 ✓ · Rasse/Spezies
**35** (nicht 17) · Rüstung/Waffe 25 ✓ · Infobox Charakter 19 ✓ · Stadt 14 ✓ · Planet/Mond 7 ✓ ·
Ereignis 7 ✓.

**Die Ursache, und sie ist mechanisch nachweisbar:** §2.4 Schritt 1 lautet *„scan balanced `{{…}}`
**from offset 0**; the maximal prefix of adjacent top-level calls is the INFOBOX REGION"*. In **fünf**
Artikeln steht die Infobox **nicht** am Offset 0:

| Artikel | Was vorher steht | verlorene Felder |
|---|---|---:|
| `Dunkelelf` | `'''Dunkelelfen''' sind eine [[Humanoide]] [[Rasse]].` | 5 |
| `Flusself` | `Als '''Flusselfen''' bezeichnet man …` | 4 |
| `Mensch` | `Als '''Mensch''' bezeichnet man …` | 5 |
| `Ork` | `Als '''Ork''' … [[Rasse]].{{Rasse/Spezies\|…` | 4 |
| `Haus der Münze` | `<br />` | 22 |
| | | **40** |

583 − 40 = **543**. Die Zahl reproduziert sich exakt als Fehlerbetrag.

**Konsequenz:** die Kernaussage des Dokuments — *„Zero data loss on a straight `source` → field
mapping, across the entire corpus"* — ist **durch den eigenen Zerleger widerlegt**: er verliert
**6,9 % aller Felder stillschweigend**, und zwar exakt in der Kategorie „Vorlage nicht an Position 0",
die §2.3 als Fallenkatalog **nicht** enthält. Betroffen sind A3 (1 100 → müsste 1 140 sein), A4
(`feld` 543 → 583), A5 (543/543 → 583/583) und §4.2s „0 undeclared" (unbewiesen für 40 Felder).
`WELT.md` §3.5 („~590 Feldzeilen") und `README.md` §5.2 („583") haben hier **recht**.

### B2 — Die tragende 88,9-%-Messung stammt aus einem **anderen** Zerleger als dem spezifizierten — und zwar aus dem defekten
**Datei:** `RB-12` §2.5 („the measurement that decides the schema"), A16, §8.3.

**Behauptung:** rev 910 → rev 1139: *„1 → 27 … 27 → 42 … **24 (88.9 %)** survived byte-identical, 3
gone, 18 new, 24 of 24 changed ordinal"*; rev 1139 → 1140: *„42 → 42, 42 (100 %)"*.

**Die Daten sagen:** Ich habe beide Revisionen live geholt und zerlegt.

- Mit dem in **§2.4 spezifizierten** Verfahren (Vorlagen entfernen, an Überschriften trennen,
  Blöcke aus zusammenhängenden Nicht-Leerzeilen, Schwelle 40 Zeichen): rev 910 = **72** Absätze,
  rev 1139 = **101**, überlebt byte-identisch **50 (69,4 %)**, verschwunden 22, neu 51.
- Mit einem **naiven Leerzeilen-Splitter, der jeden Block verwirft, der mit `==` beginnt**:
  rev 910 = **27**, rev 1139 = **42**, überlebt **24**, verschwunden **3**, neu **18**;
  rev 1139 → 1140 = 42 → 42, 42 überlebt, 0/0. **Das ist Zeile für Zeile die Tabelle aus §2.5.**

**Der Befund:** §2.5 wurde mit genau der Zerlegung berechnet, die `WELT.md` §3.2 als **Zählfehler**
identifiziert (Absätze direkt unter einer Überschrift ohne Leerzeile fallen mit der Überschrift weg) —
derselbe Fehler, der `README.md`s 216 statt 492 erzeugt hat. Das ist auch intern inkonsistent:
`RB-12` selbst nennt `Erismus` an zwei Stellen (**§2.6**, **§7.3**) **101 Passagen**, während §2.5 für
rev 1139 (93 Bytes und 65 Minuten vor der aktuellen Fassung) **42** angibt — Faktor 2,4 im selben
Dokument.

**Konsequenz:** **A16 ist so nicht erfüllbar.** Ein Importer, der §2.4 implementiert, liefert für das
Paar 910/1139 nicht 24/3/18, sondern 50/22/51. Die *Schlussfolgerung* überlebt und wird sogar
schärfer — unter der korrekten Zerlegung haben **50 von 50** Überlebenden ihre Ordinalposition
gewechselt, also weiterhin 100 % — aber **die Zahlen in der Tabelle, in A16 und in §8.3 müssen neu
gerechnet werden**, sonst ist die wichtigste Abnahmezusicherung des Dokuments rot ab Tag eins.

### B3 — Das Atom hat in drei am selben Tag geschriebenen Dokumenten drei Werte, und einer davon ist als Gate formuliert
**Dateien:** `README.md` §5.2 · `WELT.md` §3.2 · `RB-12` §2.6/A3 · `RB-13` §6.4/M15.

| Quelle | Passagen gesamt | Infobox : Prosa | pro Artikel |
|---|---:|---|---:|
| `README.md` §5.2 | **799** | 583 : 216 = 73 : 27 | 10,8 |
| `RB-13` M15 (Gate!) | **799 ± 5 %** | 583 : 216 | 10,8 |
| `WELT.md` §3.2 | **1 075** | 583 : 492 = 54 : 46 | 14,5 |
| `RB-12` A3 | **1 100** | 543 + 497 + 60 | 15,1 |
| **meine Nachrechnung** | **1 078** | **583** Felder : **495** Absätze | **14,6** |

`WELT.md` ist am nächsten an der Wahrheit und seine Diagnose des README-Fehlers ist **unabhängig
bestätigt** (ich reproduziere mit der Heading-Glue-Regel 192 statt 495 Absätze). `RB-12`s 1 100 ist um
die 40 Felder aus **B1** zu niedrig und zählt Listenblöcke separat.

**Der eigentliche Blocker ist `RB-13` M15:** dort steht `799 ± 5 %` als **falsifizierbares Ziel** in
einer Tabelle, die *„jedes M1–M20 kann rot werden"* verspricht. M15 wird von **beiden**
Schwesterdokumenten desselben Tages widerlegt und geht damit garantiert rot — nicht weil das Produkt
scheitert, sondern weil das Gate eine überholte Zahl fixiert. **M15 muss vor der nächsten Runde neu
gesetzt oder gestrichen werden.** Genauso §6.4s Vorspann *„73 % of them are infobox rows"*.

`CHAMPION.md` §8 pinnt das Atom nicht — es erbt `02-domain-model.md`. `RB-12` §2.6 hat also recht,
dass die Regel normativ werden muss; nur ist die Zahl, mit der es normativ wird, falsch.

---

## 2. Major

### M1 — „37 Dateien ohne jede Herkunftsangabe" ist falsch; es sind **30**, und `RB-12` sagt es bereits
**Dateien:** `WELT.md` §3.8 · `README.md` §6 · `RB-13` §4.1.

`media.json` enthält für jede Datei `description_page_wikitext`. Auszählung: **11 von 41** Dateien
tragen einen Lizenzmarker (7× `Selbst erstellt`, 1× `Bildzitat`, 1× `Keine Vorauswahl`, 1× `PD`,
1× `CC-BY-SA`), **30** tragen keinen. Die „37" entsteht nur, wenn man ausschließlich die
**Kategorien** ansieht — und `RB-12` §6.1 weist live nach, dass die Kategorisierung durch einen
Namespace-Guard **kaputt** ist und sieben korrekt selbstlizenzierte Bilder verschwinden lässt.
`WELT.md` ist das jüngste der drei Dokumente und wiederholt die Zahl, die `RB-12` widerlegt hat.
Auch `RB-13` §4.1 trägt sie weiter.

### M2 — „Die Karte ist die einzige lebende Seite dieses Wikis" ist falsch
**Datei:** `RB-12` §1.5.

*„Last edited 2025-12-07. **Every ns0 article was last edited in 2024 or earlier.** The map is the
only living page on this wiki."* — `articles.json` sagt: `Baldur` **2026-03-11**, `Olav der Ehrliche`
**2026-03-16**. Beide sind ns0 und beide **jünger als die Karte**. `WELT.md` §3.7 hat es richtig und
zieht daraus sogar den zentralen Nutzungsbefund („gepflegt wird, was am Tisch passiert"). Der Satz in
`RB-12` schwächt genau das Argument, das `WELT.md` stark macht — und er ist widerlegbar mit einer
Sortierung von `last_edit`.

### M3 — `RB-13` §1.3s Cookie-Beweis ist heute nicht reproduzierbar und steht im Widerspruch zu §0
**Datei:** `RB-13` §1.3, M9.

Behauptet: *„A plain `HEAD` against `eron.fandom.com` … returns `set-cookie: exp_bucket=v9-18`,
`exp_bucket_2=v5-49`, `Geo={…}`, `surrogate-key: wiki-2915492`"* — und M9 nennt das *„reproducible
with one `curl -I`"*.

Ich habe HEAD gegen `https://eron.fandom.com`, `…/de/` und `…/de/wiki/Eron_Wiki` gefahren. **Alle
drei: HTTP 403, `cf-mitigated: challenge`, und als einziges Cookie Cloudflares `__cf_bm`.** Kein
`exp_bucket`, kein `Geo`, keine `surrogate-key`. Das ist auch logisch zu erwarten: §0 desselben
Dokuments stellt fest, dass *jeder* Nicht-Browser-Client 403 bekommt — eine an der Cloudflare-Kante
abgewiesene Anfrage erreicht Fandoms Applikation nie und kann deren Cookies nicht zurückbekommen.

Ich behaupte nicht, dass die Beobachtung erfunden ist (Cloudflare-Politur schwankt). Aber **der
Absatz, der mit „This is the product. The wiki is the bait." schließt, ruht auf einer Messung, die
sich nicht auf Anhieb wiederholen lässt**, und M9 verspricht Reproduzierbarkeit, die es hier nicht
gibt. Vor jeder externen Verwendung: im echten Browser nachfahren (das ist ohnehin §6s Messrig).

### M4 — Die Türkappung wird in drei Dokumenten mit drei Zahlen zitiert
**Dateien:** `CHAMPION.md` §4.9 · `README.md` §5.1 · `WELT.md` §3.3 · `RB-12` §5.4 · `RB-13` M20.

`CHAMPION.md` §4.9 wörtlich: *„**It is capped:** ≤1 per player per week + 2 free-floating, hard
server cap."* Daraus folgt für einen Dreiertisch **5 pro Woche**.

- `RB-12` §5.4 rechnet **korrekt**: „~5 per week … 113 ÷ 5 = 23 weeks".
- `WELT.md` §3.3 fragt *„Wie aus 1 253 Türen **3** werden"*.
- `RB-13` M20 schreibt *„CHAMPION §4.9 caps issuance at **~3/week**"*.

Beide Dreier unterschätzen die Kappung um 40 % und sind nicht durch `CHAMPION.md` gedeckt. Die offene
Frage bleibt offen — aber sie muss mit **5** gestellt werden, sonst diskutiert die nächste Runde eine
Knappheit, die es so nicht gibt.

### M5 — `fixture.js` verliert den echten Lead-Absatz genau dort, wo die Infobox nicht zuerst steht
**Datei:** `fixture.js`, gegen `README.md` §7.

`Mensch` und `Dunkelelf` haben im Fixture `lead: []` **und kein `prose_note`**. `README.md` §7 sagt
zu: *„`lead` kann leer sein (dann `prose_note` prüfen)"* — dieser Vertrag ist für **2 von 20**
Entities gebrochen. Sachlich falsch ist es bei `Mensch`: der Artikel beginnt mit
*„Als '''Mensch''' bezeichnet man eine von mehreren [[Humanoide|Humanoiden]] [[Rasse|Rassen]]."*
(62 Zeichen im Klartext, also **über** der 40-Zeichen-Schwelle) — dieser Satz existiert im Fixture
nicht. Bei `Ork` steht als „lead" ein Absatz aus der Mitte des Artikels statt des echten ersten
Satzes. Bei `Dunkelelf` (38 Zeichen) wäre der Verlust durch die Schwelle gedeckt, aber dann müsste
`prose_note` gesetzt sein.

**Es ist dieselbe Wurzel wie B1** — die Annahme „Infobox steht am Anfang". Der Infobox-Extraktor des
Fixtures ist davon *nicht* betroffen (alle 20 Zeilenzahlen stimmen), der Prosa-Extraktor schon. Ein
Spike, der `entity.lead[0]` rendert, zeigt für `Mensch` nichts und erklärt nicht warum.

### M6 — `RB-13` D4 verwechselt bei `Eron (Planet)` Wikitext-Bytes mit sichtbarem Text
**Datei:** `RB-13` D4.

Die Tabelle nennt für `eron.fandom.com/Eron (Planet)`: HTML **3 812 B**, „Visible text" **236 B**,
Ratio **16,2 ×**. 3 812 B ist korrekt (live nachgemessen). **236 B ist aber die Wikitext-Größe des
Artikels**, nicht sein sichtbarer Text — der beträgt gemessen **313 B**, Ratio **12,2 ×**. Die
`Erismus`-Zeile derselben Tabelle stimmt (165 600 B, Ratio 3,0). Der Fehler stützt die schärfste Zahl
der Zeile; das Argument trägt auch mit 12,2 ×, aber die Zelle ist falsch beschriftet.

---

## 3. Minor

| # | Datei | Behauptung | Daten |
|---|---|---|---|
| m1 | `WELT.md` §3.3, `RB-12` §5.4 | Redlink-Ziele mit **≥ 10** eingehenden Artikeln: **8** | **10** (…, `Haus Numerion` 10, `Die Zeugen von Al Masin` 10). Mit „> 10" wären es 8 |
| m2 | `WELT.md` §3.3(c) / `RB-12` §5.3 | **1 947** bzw. **1 991** Redlink-Vorkommen; 512 (26 %) gepipet | meine Zählung: **1 995** Vorkommen, **513** gepipet (25,7 %); Gesamtlinks 3 118 gegen `RB-12`s 3 105. Die Prozente stimmen, die Absolutzahlen sind in drei Varianten unterwegs |
| m3 | `WELT.md` §3.2 | 492 Absätze · 0-Prosa **8** · genau 1 Absatz **22** · ≤2 **32** · ≤3 **39** · ≥10 **14** | **495** · 0-Prosa **8** ✓ (identische Liste!) · genau 1 **21** · ≤2 **31** · ≤3 **37** · ≥10 **14** ✓. Parservarianz, keine Aussageänderung |
| m4 | `WELT.md` §3.5 | **121** von ~590 Werten sind Bullet-Listen (21 %) | **122** von 583 gefüllten (20,9 %) |
| m5 | `WELT.md` §4.1/P6 | „163 Listenpunkte im Fließtext, weitere **322** in Infobox-Werten" | Fließtext **164** ✓; in Infobox-Werten **431**, nicht 322 |
| m6 | `WELT.md` §5.1 | „`Olavs Familie` listet acht Mitglieder; **sieben** davon haben eigene Artikel" | **alle acht** haben einen Artikel |
| m7 | `WELT.md` §5.1 | Truppenstärken „`Legion (1000 Truppen)`", „`Centurie (100 Truppen)`", „`Flotte (15 Schiffe)`" — „sie stehen **alle** in Infobox-Zeilen" | Diese drei stehen als **Listenpunkte im Fließtext** von `Kaiserliche Armee`/`Marine`. Einwohnerzahlen und Bevölkerungsanteile stehen tatsächlich in Infobox-Zeilen. Das „alle" ist zu weit |
| m8 | `WELT.md` §3.1 vs. §5.2 | „fünf Ebenen tief" (§3.1) gegen „**Sechs** Ebenen Überschriften" (§5.2), beides über `Erismus`; `RB-12` §7.3 sagt „5 heading levels" | `Erismus` hat Überschriften der Wiki-Ebenen **2–5**, also vier. Mit dem Titel als Ebene 1 sind es fünf — §3.1 ist vertretbar, **§5.2 ist es nicht**. Korpusweit gibt es H6 dreimal, aber nicht in `Erismus` |
| m9 | `WELT.md` §1, §3.6, §5.1 | vier als wörtlich ausgewiesene Zitate | *„die Besatzer der Aschelande"* existiert so nicht (zusammengesetzt aus „als Besatzer der [[Aschelande]]" und „Kontrolle über die Aschelande"). *„gelten als die ehrgeizigsten Krieger unter den Völkern"* — Quelle: „gelten **sie** als … unter den Völkern **des Kontinents**". *„ein Rotblut Ork namens Aricles"* — Quelle: „**einen** [[Rotblut Ork]] namens". *„80% Menschen, 10% Waldelfen, 5% Zwerge, 5% Andere"* ist im Original eine Bullet-Liste. **Alle anderen 56 geprüften Zitate sind wörtlich** — bei einem Dokument, das im Vorspann „wörtlich … unverändert" zusichert, gehören diese vier markiert |
| m10 | `RB-12` §1.2 | `<namespaces>` „(all **42**)" | Der Export deklariert **37** |
| m11 | `RB-12` §4.2 | `Vorlage:Stadt` „declares **20** fields and the two cities that use it fill **7 each**"; „`Bjoldiri` renders as 13 blank rows" | Deklariert **18**. `Bjoldiri` füllt **6** (7 Parameter, 1 leer), `Kukiria` **8**. Also 12 bzw. 10 leere Zeilen |
| m12 | `RB-12` §6.4 | `prop=contributors`: Cornelius Holloway **71**, Dirk911 **10**, Kroej 1; 66 Einzelautor-, 8 Zweiautor-Artikel, 7 mit anonymen Beiträgen | Heute live: **67 / 9 / 1**; 63 Einzelautor, 7 Zweiautor, **4 ohne benannten Beitragenden**, 6 mit anonymen. Keine Continuation abgeschnitten. Die Kernaussage („drei benannte Autoren, `autoren[]` ≤ 3 Namen + Anon-Zähler") hält; die Einzelzahlen reproduzieren nicht |
| m13 | `RB-12` §1.5 | „**9 512** bytes of marker prose"; „**268** distinct link targets — 19 exist, 249 do not" | 9 623 B Marker-Beschreibungen; **269** Ziele (190 `popup.link` ∪ 81 Wikilinks), **19** existieren ✓, **250** fehlen. Praktisch exakt. **Ergänzung, die `RB-12` offenließ:** von den 250 fehlenden sind **112 bereits unter den 689**, **138 sind neu** |
| m14 | `RB-12` §2.2 | Prosa-Fragmente < 40 Zeichen: **16**; längster Absatz **3 466** Zeichen | **10** Fragmente; längster Absatz **2 082** Zeichen (Median/Mittel/p90 stimmen dagegen exakt) |
| m15 | `RB-12` §5.1 vs. `WELT.md` §3.4 | „over **three** years" gegen „über **vier** Jahre" | Erste Bearbeitung im Korpus 2022-02-15, letzte 2026-03-16 → **vier** Jahre. `WELT.md` hat recht |
| m16 | `RB-12` §5.3 | „689 distinct missing pages against 73 written articles — **9,4** doors per article" | Beide Nenner sind vertretbar (74 → 9,3 wie `README`/`WELT`, 73 → 9,4). Nur: dieselbe Kennzahl steht mit zwei Werten in der Lineage |
| m17 | `README.md` §4/§5.4 | „Kategorien mit Inhalt **43**" | **43 deklariert**, **28 nicht leer**. `RB-12` §5.1 hat es richtig |
| m18 | `README.md` §6 | „Nur **4 von 41** tragen überhaupt eine Lizenz-Kategorie" | **5** Dateien tragen eine Kategorie; zwei davon sind `Kategorie:Bilder` (keine Lizenz). Lizenzkategorien: genau **3** Dateien |
| m19 | `fixture.js` | `README.md` §7: Absätze „je ≤460 Zeichen" | längster Absatz **461** Zeichen |
| m20 | `RB-12` A9 | Textkonservierung 97,2 % = 219 581 von **225 809** Nicht-Whitespace-Zeichen | Ich komme auf 232 264 (mit Vorlagen) bzw. 213 605 (ohne). **Nicht nachvollziehbar** — und die 40 Felder aus **B1** sind in der gemessenen Ausgabe gar nicht enthalten, was die Kennzahl zusätzlich verschiebt |

---

## 4. Ein Befund zum Fixture selbst, der keine Zahl ist

`fixture.js` ist **nicht frei von externen URLs**: es enthält **18 Bild-URLs auf
`static.wikia.nocookie.net`** und 21 Artikel-URLs auf `eron.fandom.com`. Die Artikel-URLs sind
richtig und lizenzrechtlich sogar **nötig** (Attribution). Die Bild-URLs sind ein Risiko:

- `WELT.md` §3.8 formuliert eine **Regel ohne Ausnahme** — *„aus diesem Fixture werden keine Bilder
  eingebettet, heruntergeladen oder weiterverbreitet"*. Ein `<img src={e.images[0].url}>` in einem
  Spike verletzt sie in einer Zeile, und nichts im Datensatz hält davor.
- Die Bildobjekte im Fixture tragen **kein Lizenzfeld** — obwohl `media.json` für jede Datei
  `description_page_wikitext` und damit den Marker hat. Ein `lizenz_status` (`frei` / `zitat` /
  `unbekannt`) pro Bild, wie ihn `RB-12` §6.3 spezifiziert, ließe sich hier ohne Aufwand mitgeben und
  würde die Regel von einer Bitte in eine Datenaussage verwandeln.
- Für einen Artefakt-Autor kommt hinzu: eine Artifact-CSP blockt externe Hosts ohnehin — das Bild
  erscheint dann als kaputtes Icon, nicht als Fehler. Ein Platzhalter-Feld wäre ehrlicher.

**Kein Blocker, aber ein Handgriff**, und er gehört gemacht, bevor der erste Spike auf `fixture.js`
zeigt.

---

## 5. Was ich nicht bestimmen konnte

1. **Ob `RB-13` §1.3s `exp_bucket`/`Geo`/`surrogate-key` zum Erntezeitpunkt tatsächlich kamen.** Heute
   kommen sie nicht (403 + nur `__cf_bm`). Ich kann Cloudflare-Politur nicht rückdatieren.
2. **Die Zahl hinter `RB-12` A9 (225 809 Zeichen).** Ohne das Normalisierungsverfahren nicht
   reproduzierbar; meine beiden plausibelsten Varianten liegen 5–8 % daneben.
3. **`RB-12` §3.1s Klassen B/C/D/F (46/2/32/14).** Die Summe stimmt (124 + 22 = 146) und die
   Stichproben passen, aber die Klassifikation ist ein Urteil, kein Feld in `templates.json`.
4. **Ob `RB-12`s abweichende Contributor-Zahlen (71/10/1) ein anderes Verfahren oder ein anderer
   Wiki-Zustand sind.** Vier Artikel haben laut API **keinen** benannten Beitragenden; wer diese vier
   über `<contributor>` aus dem Export auffüllt, landet bei 71 — das erklärt die Differenz plausibel,
   ist aber nicht dokumentiert.
5. **Alle Fandom-Zahlen in `RB-13` §1.1, §3, §4.3, §5** (Wikis, Pageviews, Umsatz, Migrationstraffic,
   World-Anvil-/LegendKeeper-/Kanka-Preise). Sie sind als sekundär und teils blockiert **korrekt
   gekennzeichnet**; ich habe sie nicht geprüft und dieses Audit deckt sie nicht.

---

## 6. Was vor der nächsten Runde passieren muss

1. **`RB-12` §2.5 und A16 neu rechnen** mit dem in §2.4 spezifizierten Zerleger (B2). Die
   Schlussfolgerung überlebt; die Zahlen nicht.
2. **`RB-12`s Infobox-Extraktion um „Infobox nicht an Position 0" erweitern** und 543 → 583 überall
   nachziehen: §1, §2.1, §2.2, §4.2, §4.3, A3, A4, A5 (B1). Der Fall gehört als siebte Falle in §2.3.
3. **Eine Passagenzahl normativ machen** (B3) — und `RB-13` M15 und §6.4 daran anpassen oder
   streichen, sonst steht ein Gate im Korpus, das per Konstruktion rot ist.
4. **Die „37 Dateien ohne Herkunft" in `WELT.md` §3.8 und `README.md` §6 auf 30 korrigieren** (M1) und
   auf `RB-12` §6.1 verweisen.
5. **`RB-12` §1.5s „einzige lebende Seite" streichen** (M2) — zwei Artikel sind jünger als die Karte.
6. **Die Kappung überall als „≤1/Spieler/Woche + 2 frei ⇒ ~5/Woche" schreiben** (M4).
7. **`fixture.js`: Lead-Extraktion für Artikel mit vorangestellter Prosa reparieren** (`Mensch`,
   `Ork`, `Dunkelelf`) und `prose_note` setzen, wo `lead` leer bleibt (M5); Bildobjekten ein
   `lizenz_status` mitgeben (§4).
8. **Die vier unsauberen Zitate in `WELT.md` markieren oder ersetzen** (m9) — das Dokument sagt im
   Vorspann „wörtlich" zu, und diese Zusage ist billig zu halten.

---

*Argus. Hundert Augen, und keins davon nimmt eine Zahl auf Zuruf. Zwei der drei Dokumente sind besser,
als ihre Fehler vermuten lassen — aber die Fehler sitzen ausgerechnet in den Zeilen, die als
Abnahmekriterium gedacht sind, und ein Gate, das mit einer falschen Zahl grün wird, ist schlimmer als
gar kein Gate.*
