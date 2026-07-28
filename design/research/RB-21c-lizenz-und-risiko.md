# RB-21c — Lizenz und Risiko: dürfen wir uns auf Azgaars Generator stützen?

**Athena, der Schild · 2026-07-27 · alle Zahlen selbst erhoben, Quellen im Text.**

Beat: Kayas *nested maps* brauchen einen Generator pro Maßstab. Diese Prüfung fragt nicht, ob der
Generator gut ist — RB-20d hat das getan —, sondern ob wir ihn **besitzen dürfen** und was er an
Risiko kostet. Der Runtime ist gepinnt (RB-11: React/TS + PixiJS, DOM-autoritativ, kein Game-Engine);
diese Frage wird hier nicht wieder geöffnet.

---

## 0. Das Urteil in vier Sätzen

**Der Code ist sauber und wir dürfen ihn verkaufen. Die mitgelieferte Kunst ist es nicht.**

Azgaars LICENSE ist echtes MIT mit einer zusätzlichen, *erweiternden* Klausel, die ausdrücklich die
**erzeugten Karten** freigibt — RB-20a hat recht, das ist einzigartig im Korpus. Aber die Klausel
kann nur vergeben, was Azgaar besitzt, und **53 % der mitgelieferten Wappen stehen unter CC BY-NC-SA
3.0 — non-commercial.** Dazu kommt ein GPLv2+-Editor im Repo. Beides ist billig zu entfernen und
**beides muss ein Gate werden, kein guter Vorsatz.**

| | Verdikt |
|---|---|
| Azgaars **Generierungscode** | **grün** — MIT, forkbar, verkaufbar, Electron-tauglich |
| Azgaars **Datenexport** (GeoJSON/JSON/CSV) | **grün** — der eigentliche Integrationspfad |
| Azgaars **mitgelieferte Wappen** | **ROT** — 179 von 337 non-commercial |
| Azgaars **vendored TinyMCE 7.1.0** | **ROT** — GPLv2-or-later im Auslieferungsbaum |
| Azgaars **Texturen** (11,1 MB) | **ROT bis geklärt** — null Provenienz auffindbar |
| Watabou **Output** | **grün** — beste Bedingungen im ganzen Korpus |
| Watabou **Code** | **ROT** — GPL-3.0 oder gar keine Lizenz; nicht einbettbar |

---

## 1. Die Lizenz, richtig gelesen

`LICENSE`, vollständig geholt am 2026-07-27
(https://raw.githubusercontent.com/Azgaar/Fantasy-Map-Generator/master/LICENSE):

> MIT License
> Copyright 2017-2024 Max Haniyeu (Azgaar), azgaar.fmg@yandex.com
> [vollständiger MIT-Text]
> **You can produce, without restrictions, any derivative works from the original software and even
> reap commercial benefits from the sale of the secondary product. The derivates include created
> maps, map images, screenshots, videos, and other materials.**

GitHub meldet `spdx_id: NOASSERTION`, `key: "other"` — bestätigt: der Detektor stolpert über den
Zusatzabsatz, nicht über eine Einschränkung. `package.json` deklariert selbst `"license": "MIT"`.

### 1.1 Der Zusatzabsatz ist eine Erweiterung, keine Bedingung

Er nimmt nichts weg. Er beseitigt genau die zwei Zweifel, die reines MIT offen lässt: (a) dass
abgeleitete Werke erlaubt sind, (b) — und das ist der entscheidende Teil — dass **der Output** frei
ist. MIT spricht über Software, nicht über das, was Software erzeugt. Azgaar sagt es ausdrücklich.

**Kontrast, RB-20a:** Inkarnate — *"Customers may not redistribute, extract, or resell any
Products."* Azgaar bleibt die einzige Kartenquelle im Korpus, deren **Ausgabe wir ausliefern dürfen.**

### 1.2 Aber: Azgaar kann nur vergeben, was ihm gehört

**Das ist der Satz, an dem dieses Dokument hängt.** Die Output-Klausel deckt Azgaars Urheberrecht am
Generator und an dem, was der Generator *selbst erzeugt* — Küstenlinien, Zellen, Burgs, Staaten,
Provinzen, Kulturen, Religionen, Routen, Flüsse, Biome. Sie deckt **nicht** die fremde Kunst, die in
ein gerendertes Bild hineingezeichnet wird: Wappen, Texturen, Waren-Icons. Für die hatte er nie die
Rechte zur Unterlizenzierung (§2).

**Praktische Folge, und sie passt exakt zu dem, was Chronicle ohnehin will:**

> **Eine Karte als *Daten* ist sauber. Eine Karte als *Bild mit Wappen und Papiertextur* ist es nicht.**

RB-20a hat das Ziel schon benannt — *"the interchange target is not UVTT — it is Azgaar's
GeoJSON/JSON"*. Wir wollen den Ortsgraphen, nicht das Poster. Der rechtlich saubere Pfad und der
architektonisch richtige Pfad sind derselbe Pfad.

### 1.3 Die fünf Fragen, präzise beantwortet

Getrennt nach **Code** und **Output**:

| | Code | Output (erzeugte Karten) |
|---|---|---|
| **(a) forken** | **Ja**, unbedingt. MIT erlaubt fork, modify, private Weiterentwicklung. | — |
| **(b) in ein kommerzielles Produkt einbetten** | **Ja** — nach Entfernen von TinyMCE (§3). | **Ja**, wenn die Karte keine Fremdkunst trägt. |
| **(c) in Self-Hosting-Download + Electron ausliefern** | **Ja** — dieselbe Bedingung. MIT hat keine Netzwerk-Klausel, kein AGPL-Problem. | **Ja**, dieselbe Bedingung. |
| **(d) ein Produkt verkaufen, das ihn enthält** | **Ja** — ausdrücklich: *"reap commercial benefits from the sale of the secondary product."* | **Ja** für Daten. **Nein** für Bilder mit NC-Wappen. |
| **(e) erzeugte Karten als First-Party-Inhalt ausliefern** | — | **Ja, aber nur als Geometrie/Daten oder als Bild ohne Wappen, ohne Textur, ohne Noun-Project-Icon.** |

### 1.4 Welche Attribution wir schulden und wo sie stehen muss

MIT ist keine Attribution-Formalität, sondern eine **Bedingung**: *"The above copyright notice and
this permission notice shall be included in all copies or substantial portions of the Software."*

**Zu liefern:**

1. Eine Datei **`THIRD-PARTY-NOTICES.md`**, die den **vollständigen MIT-Text plus die Copyright-Zeile**
   enthält. Empfohlene Fassung: *"Copyright 2017-2024 Max Haniyeu (Azgaar) **and contributors**"* —
   die Original-Zeile nennt nur Azgaar, obwohl elf weitere Menschen beigetragen haben (§5); die
   erweiterte Nennung kostet nichts und schließt die Lücke.
2. **Im Produkt erreichbar**, nicht nur im Repo: ein Über/Lizenzen-Bildschirm. **Für Electron
   zwingend im Binary** — eine Website genügt nicht, wenn wir eine Datei ausliefern.
3. Der Zusatzabsatz wird mitzitiert, weil er unsere Output-Rechte begründet — wir wollen belegen
   können, warum wir Karten ausliefern dürfen.
4. Pro behaltenem Asset dessen eigene Attribution (§2.6).

Der Zusatzabsatz verlangt **keine** Nennung für die Karten selbst — *"without restrictions"*. Wir
nennen Azgaar trotzdem; es ist billig und richtig.

---

## 2. Die 51 MB sind kein Quelltext — Inventar und Provenienz

Repo-Metadaten, 2026-07-27: **5.844 Sterne, 958 Forks, 29 offene Issues, `size` 52.195 KB, letzter
Push 2026-07-26**, `default_branch: master`. Der Objektbaum enthält **961 Einträge, ~40,5 MB Blobs**;
die Differenz zu 51 MB ist Git-Historie.

| Verzeichnis | Größe | Dateien |
|---|---:|---:|
| `public/` | **21,49 MB** | 577 |
| `docs/` | 8,40 MB | 36 |
| `tests/` | 7,47 MB | 40 |
| `src/` | 3,00 MB | 178 |

**Der Code ist die kleinste Fraktion.** `src/` ist 3 MB von 40. Der Rest ist Kunst, Doku-Screenshots
und Test-Fixtures — und die Kunst ist das Risiko.

> **Korrektur an RB-20a.** RB-20a führt Azgaar mit *"Bundled assets: **zero** — procedural vector"*
> und *"Library: **zero raster stamps**"*. Das ist für die **Kartensymbolik** richtig, für das
> **Repository falsch**: 21,5 MB `public/` mit 337 Wappen-SVGs, 23 Texturen (11,1 MB), 72
> Waren-Icons und über 30 Heightmaps. RB-20a hat den Generator beurteilt, nicht den
> Auslieferungsbaum. Diese Zeile ist zu berichtigen.

### 2.1 Wappen — `public/charges/`, 337 Dateien, vollständig geprüft

Jede Datei trägt ein `<metadata>`-Tag mit `license` und `source`. **Ich habe alle 337 geholt und
ausgewertet** (Abdeckung 337/337):

| Lizenz | Dateien | Anteil | Für ein verkauftes Produkt |
|---|---:|---:|---|
| **CC BY-NC-SA 3.0** | **179** | **53,1 %** | **VERBOTEN — non-commercial** |
| CC0 1.0 | 104 | 30,9 % | frei |
| CC BY-SA 4.0 | 15 | 4,5 % | nur mit Attribution **+ Copyleft auf das Asset** |
| CC BY-SA 3.0 | 21 | 6,2 % | dito |
| CC BY-SA 2.5 | 1 | 0,3 % | dito |
| **GFDL 1.3** | **10** | 3,0 % | Copyleft, für Software-Distribution unhandlich |
| CC BY 4.0 | 2 | 0,6 % | nur Attribution |
| CC BY 1.0 | 2 | 0,6 % | nur Attribution |
| Free Art License | 1 | 0,3 % | Copyleft |
| `licenseDescURL` (defekt) | 1 | 0,3 % | **unbekannt** |
| **kein `<metadata>`** | **2** | 0,6 % | **unbekannt** — `arbalest.svg`, `plaice.svg` |

**Quellen:** wappenwiki.org **178**, commons.wikimedia.org/upload.wikimedia.org **81**,
`author="Azgaar"` **72**, vikinganswerlady.com 2, en.wikipedia.org 1, freesvg.org 1, `author="Name"` 1.

**Die Rechnung, die zählt:** nur **104 CC0 + 4 CC BY = 108 von 337 (32 %)** sind ohne Copyleft
lieferbar. **229 von 337 (68 %)** sind es nicht — davon 179 wegen **NC**, das mit Chronicles
Geschäftsmodell (RB-11/CHAMPION §14.1: einmalige ~30-€-Lizenz) **unvereinbar** ist.

Beispiel, wörtlich aus `public/charges/lionRampant.svg`:

```xml
<metadata license="https://creativecommons.org/licenses/by-nc-sa/3.0" source="http://wappenwiki.org"/>
```

**Das ist Invariante-7-Gebiet, genau wie im Briefing vermutet: eine permissive Lizenz auf dem Code
sagt nichts über ein beigelegtes Icon-Set.** Azgaars Output-Klausel kann die wappenwiki-Wappen nicht
umlizenzieren — er hat sie unter NC-SA bekommen und gibt sie unter NC-SA weiter. Eine mit Wappen
gerenderte Karte in einem verkauften Electron-Binary ist **die Verletzung**, gegen die wir uns
schützen sollen.

### 2.2 Texturen — `public/images/textures/`, 23 Dateien, 11,1 MB — **null Provenienz**

Die größte Einzelklasse im Repo. `soiled-paper-vertical.png` allein ist **3,03 MB**, `plaster.jpg`
1,28 MB. Enthalten sind Papier-/Marmor-/Holzoptiken (`antique`, `folded-paper`, `pergamena`,
`marble`, `timbercut`) **sowie reale Satelliten- und Planetenbilder**: `iran-small`,
`mauritania-small`, `spain-small`, `mars-big`, `mercury-big`.

**Ich habe geprüft: keine EXIF-/eingebettete Urheberangabe, kein Attributionsfile im Repo, keine
Nennung in README, keine `<metadata>`.** Die README nennt ausschließlich *"Inspiration"* (Martin
O'Leary, Amit Patel, Scott Turner) — das sind Algorithmen-Vorbilder, keine Asset-Lizenzen.

**Provenienz nicht feststellbar.** Bei Namen wie `pergamena` und `soiled-paper` sind gängige
Textur-Portale die naheliegende Quelle, und deren Standardbedingungen (z. B. textures.com) verbieten
die **Weiterverteilung der Texturdatei selbst** ausdrücklich — genau das, was ein Electron-Binary tut.
Für `mars`/`mercury` ist NASA-Public-Domain plausibel, aber **unbelegt**.

**Verdikt: bis zur dateiweisen Klärung nicht ausliefern — auch nicht im Gratis-Build.**

### 2.3 Waren-Icons — in `src/index.html` eingebettet, 72 Stück, vorbildlich dokumentiert

72 `<metadata>`-Tags: **65 × CC BY 3.0** (66 × Quelle `thenounproject.com`), **7 × CC0**. Beispiel:

```xml
<metadata description="Mosquito by sitti fara from the Noun Project, edited by Azgaar"
          source="https://thenounproject.com/term/mosquito/2616575/"
          license="https://creativecommons.org/licenses/by/3.0"/>
```

**Kommerziell nutzbar — aber CC BY 3.0 verlangt Namensnennung bei jeder Weiterverbreitung.** 65
Einzelnennungen (Titel, Urheber, Quelle, Lizenz). Maschinenlesbar vorhanden, also automatisiert
generierbar. Das ist Arbeit, kein Blocker.

### 2.4 Heightmaps — `public/heightmaps/`, 30+ PNGs realer Regionen

`import-rules.txt` dokumentiert das Verfahren: erzeugt über `tangrams.github.io/heightmapper`, also
aus Mapzen/Nextzen-Terrain-Kacheln, die ihrerseits aus SRTM/NED u. a. stammen — **mit eigenen
Attributionspflichten, die im Repo nirgends erfasst sind.** Europa, Afrika, Nordamerika, Island,
Britannien etc. **Lizenzkette nicht feststellbar.** Für uns ohnehin entbehrlich: Chronicle braucht
keine Karte der echten Erde.

### 2.5 Schriften — **keine im Repo, dafür 39 Laufzeit-Referenzen auf Google**

Kein `.ttf`, `.woff`, `.otf` im Baum. `src/services/fonts.ts` lädt stattdessen zur Laufzeit von
**`fonts.gstatic.com` (39 Referenzen)** und `fonts.googleapis.com` (2).

Zwei Konsequenzen: (1) **Electron/Offline funktioniert so nicht.** (2) **DSGVO** — das LG München I
hat am 20.01.2022 (Az. 3 O 17493/20) die dynamische Einbindung von Google Fonts als
DSGVO-Verstoß gewertet (IP-Übermittlung ohne Einwilligung). Für ein deutschsprachiges Produkt ist
das ein reales Abmahnrisiko. **Selbst hosten — ist ohnehin für Offline nötig und löst beides.**

### 2.6 Zusammenfassung der Asset-Klassen

| Klasse | Umfang | Lizenz | Verdikt |
|---|---:|---|---|
| Wappen | 337 | 68 % NC/Copyleft/unbekannt | **nur die 108 sauberen** |
| Texturen | 23 / 11,1 MB | **unbekannt** | **nicht ausliefern** |
| Waren-Icons | 72 | CC BY 3.0 / CC0 | ok **mit** 65 Nennungen |
| Heightmaps | 30+ | Kette unbelegt | nicht nötig, weglassen |
| Marker `ship/wagon.svg` | 2 | **kein metadata** | **unbekannt** |
| App-Icons/Favicons | 7 | Azgaars Branding | **weglassen** (fremde Marke) |
| Schriften | 0 Dateien | Laufzeit-CDN | selbst hosten |

---

## 3. Abhängigkeitskette — kommt Copyleft durch die Hintertür?

### 3.1 npm-Laufzeitabhängigkeiten: sauber, alle geprüft

| Paket | Lizenz |
|---|---|
| alea | MIT |
| d3 | ISC |
| delaunator | ISC |
| driver.js | MIT |
| lineclip | ISC |
| polylabel | ISC |
| three | MIT |

**Kein GPL, kein AGPL, kein LGPL.** Toolchain (vite, vitest, playwright, biome, typescript) ist
devDependency und wird nicht ausgeliefert. `engines: node >= 24`.

### 3.2 Die Hintertür ist offen, und sie heißt TinyMCE — **CRITICAL**

`public/libs/tinymce/` — **4,13 MB, 123 Dateien.** Der Versionsbanner:

```
/** TinyMCE version 7.1.0 (2024-05-08) */
```

und `public/libs/tinymce/license.md`, wörtlich:

> **TinyMCE** — Copyright (c) 2024, Ephox Corporation DBA Tiny Technologies, Inc.
> Licensed under the terms of **GNU General Public License Version 2 or later**.

**TinyMCE hat mit 7.0 (April 2024) von LGPL 2.1 auf GPLv2-or-later gewechselt.** Azgaar vendort
genau diese erste GPL-Version. Es ist **nicht toter Ballast**: `src/controllers/notes-editor.ts`
referenziert `tinymce` elfmal und ruft `tinymce.init({...})` auf.

**Ein entlastendes Detail, das ich verifiziert habe** — es wird *nicht* gebundelt:

```ts
const url = "https://azgaar.github.io/Fantasy-Map-Generator/libs/tinymce/tinymce.min.js";
await import(/* @vite-ignore */ url);
tinymce._setBaseUrl("https://azgaar.github.io/Fantasy-Map-Generator/libs/tinymce");
```

Dynamischer Import einer absoluten Fremd-URL mit `@vite-ignore` — Vite bündelt das nicht. **Aber der
GPL-Code liegt im Repository.** Wer den Fork klont, klont ihn; wer `public/` in ein Electron-Binary
packt, **verteilt GPLv2+-Code mit einem proprietären Produkt.** TinyMCE ist über `init()` eng
integriert; Tiny Technologies' eigene Position ist, dass GPL dann auf die integrierende Anwendung
durchschlägt — deshalb verkaufen sie eine kommerzielle Ausnahme.

**Behebung — billig, sauber, und sie kostet uns nichts:** `public/libs/tinymce/` und
`src/controllers/notes-editor.ts` löschen. **Chronicle hat einen eigenen, gemessenen Editor**
(CHAMPION §2: 116 SLOC Identity-Layer, 0,087 ms/Tastendruck bei 300 Passagen). Wir wollten Azgaars
Notizeditor nie. **Aufwand ~0. Aber es muss ein CI-Gate sein, kein Vorsatz.**

**Nebenbefund:** die Fremd-URL bedeutet auch, dass die App zur Laufzeit `azgaar.github.io`
kontaktiert — Verfügbarkeits- und Datenschutzabhängigkeit von fremdem Hosting.

### 3.3 Weitere vendored Bibliotheken in `public/libs/`

| Datei | Lizenz | Anmerkung |
|---|---|---|
| `jszip.min.js` 3.6.0 | **MIT *oder* GPLv3 (dual)** | MIT-Option **schriftlich wählen** |
| `rgbquant.min.js` | MIT (© 2015 Leon Sorokin) | ok |
| `loopsubdivison.min.js` | MIT (© 2022 Stephens Nunnally) | ok |
| `simplify.js` | © 2017 Vladimir Agafonkin (BSD-2) | ok |
| `flatqueue.js` | ISC | ok |
| `three.min.js`, `orbitControls`, `mapControls`, `objexporter` | MIT (three.js + examples) | ok |
| `d3.min.js`, `delaunator`, `polylabel`, `alea` | ISC/MIT | ok |
| `jquery-3.1.1`, `jquery-ui`, `touch-punch` | MIT | veraltet (3.1.1 = 2016) |
| `dropbox-sdk.min.js` | MIT | Fremddienst — weglassen |
| `indexedDB.js` | Azgaars eigener Code | ok |
| **`openwidget.min.js`** | **keine Lizenzangabe** | **siehe unten** |

**`openwidget.min.js` — eigener Befund:**

```js
window.__ow.organizationId = "7bb02e70-bcef-4861-a4e6-d259b0d10e24"
```

Ein LiveChat-**OpenWidget**-Drittanbieter-Widget mit **fest verdrahteter Organisations-ID Azgaars**,
ohne Lizenzbanner. Ausgeliefert würde es die Daten *unserer* Nutzer an *sein* Konto senden.
**Ersatzlos entfernen.**

### 3.4 Weitere Laufzeit-Fremdhosts (aus dem gesamten Quellbaum erhoben)

`fonts.gstatic.com` 39 · `azgaar.github.io` 9 · `mapbox.github.io` 7 · `deorum.vercel.app` 3 ·
`cartographyassets.com` 3 · `fonts.googleapis.com` 2 · `8desk.top` 2 · **`googletagmanager.com` 1**
(Google-Tracking — entfernen) · `cdnfonts.com` 1 · `dafont.com` 1.

**Der KI-Generator ist unbedenklich:** `src/controllers/ai-generator.ts` ist
Bring-your-own-key (OpenAI / Anthropic / Ollama), Schlüssel vom Nutzer, `keyLink` auf die jeweilige
Konsole. **Kein eingebettetes Secret.** Wir würden das Feature ohnehin ersetzen.

### 3.5 AGPL?

**Keine AGPL-Komponente gefunden — weder in `package.json` noch in `public/libs/`.** Das ist die
gute Nachricht für ein self-hostbares Produkt: AGPL wäre dort das schwerere Problem gewesen, weil
sie schon beim Netzwerkzugriff auslöst. GPLv2+ (TinyMCE) löst nur bei *Distribution* aus — und wir
liefern aus, also greift es trotzdem, aber die Behebung ist eine Löschung statt einer Architektur.

---

## 4. Kontinuität — ein Autor, 489 Commits

Verifizierte Verteilung (GitHub Contributors API):

| Beiträger | Commits |
|---|---:|
| **Azgaar** | **489** |
| github-actions[bot] | 59 |
| evolvedexperiment | 32 |
| SheepFromHeaven | 31 |
| goteguru | 23 |
| Avengium | 22 |
| Copilot | 13 |
| klavs | 8 |
| dependabot[bot] | 7 |
| MrHaribo | 5 |
| JoeMcMahon87 / Phundrak | je 4 |

**Bus-Faktor eins, bestätigt.** Azgaar hat mehr Commits als alle Menschen zusammen ×3.

### 4.1 Was Unwiderruflichkeit garantiert — und was nicht

**Eine erteilte MIT-Lizenz kann für bereits veröffentlichte Versionen nicht zurückgenommen werden.**
Das ist keine Auslegung, das ist die Konstruktion einer unbefristeten, nicht-exklusiven Lizenz ohne
Widerrufsvorbehalt.

**Was das praktisch garantiert:**
- Jeder Commit, den wir heute holen, darf **auf Dauer** unter MIT + Output-Klausel genutzt,
  modifiziert und verkauft werden. Für immer. Auch wenn Azgaar morgen aufhört, relizenziert oder das
  Projekt verkauft.
- Ein Käufer/Nachfolger kann uns die bereits erhaltene Version nicht entziehen.

**Was es nicht garantiert:**
- **Zukünftige** Versionen. Azgaar hält den Großteil des Urheberrechts (§5) und kann v1.139+ unter
  beliebige Bedingungen stellen. Dann sitzen wir auf unserem gepinnten Stand und pflegen selbst.
- Dass die Kunst-Provenienz je geklärt wird (§2.2 bleibt offen, egal wer weitermacht).
- Dass `azgaar.github.io` erreichbar bleibt — und dort hängen TinyMCE und weitere 9 Referenzen.

### 4.2 Die Maßnahme, die heute fällig ist

**Sofort einen Fork auf einem gepinnten Commit-SHA anlegen und vollständig spiegeln** — eigenes
Repo, kein Submodul auf sein Repo, keine Laufzeit-Referenz auf seine Domain. SHA, Abrufdatum und der
**wörtliche LICENSE-Text wie geholt** werden mitarchiviert; die Lizenz zum Zeitpunkt des Abrufs ist
das, worauf wir uns später berufen. Das ist billig und heute noch billig.

### 4.3 Das eigentliche Kontinuitätsrisiko ist technisch, nicht juristisch

Das Projekt ist **mitten in der Migration** von Vanilla-JS zu TypeScript (README: *"The codebase is
gradually transitioning… while maintaining compatibility with the existing generation pipeline and
old `.map` user files"*). Sichtbare Spuren: `src/` mit 178 TS-Dateien **neben** `public/modules/ui/`
mit 8 alten JS-Dateien, und **eine `src/index.html` von 638,7 KB**. Ein 638-KB-HTML-Dokument ist
keine Datei, die man nebenbei pflegt.

**Ein weiterer Befund:** `package.json` steht auf **1.138.2**, das letzte GitHub-*Release* ist
**v1.124 (2026-06-17)**. `master` läuft also deutlich vor dem letzten getaggten Release — wir müssen
bewusst wählen, ob wir auf einen Tag oder auf einen `master`-SHA pinnen. **Empfehlung: getaggtes
Release**, weil dort die Wahrscheinlichkeit eines halbfertigen Migrationsstands geringer ist.

Wenn Azgaar mitten in der Migration aufhört, erben wir einen **halbmigrierten** Codebestand. Das ist
das Risiko, das wirklich beißt — und es ist ein Argument dafür, **den Datenexport zu konsumieren
statt den Renderer zu forken** (§7).

---

## 5. Urheberrecht — wem gehört der Code?

- `LICENSE` nennt **einen** Rechteinhaber: *"Max Haniyeu (Azgaar)"*, Zeitraum *2017-2024* (die
  Angabe ist bei aktiver Entwicklung 2026 schlicht veraltet).
- **Kein CLA. Keine `CONTRIBUTING.md`** (HTTP 404 verifiziert). Also keine
  Urheberrechtsübertragung an Azgaar.
- Damit behalten die ~11 menschlichen Beiträger das Urheberrecht an ihren Beiträgen. Diese Beiträge
  sind über **GitHub ToS §D.6 (inbound = outbound)** unter der Repo-Lizenz — also MIT — an das
  Projekt und seine Nutzer lizenziert.

**Materielle Auswirkung auf Forken und Verkaufen: keine.** Jeder Beitrag kam unter MIT herein, wir
forken unter MIT, wir verkaufen. Der fehlende CLA bedeutet nur, dass **Azgaar selbst** das Projekt
nicht ohne Zustimmung aller Beiträger *proprietär* relizenzieren könnte — was für uns sogar
stabilisierend wirkt: **eine vollständige Umlizenzierung künftiger Versionen ist für ihn schwerer,
als der Bus-Faktor vermuten lässt.**

Zwei Nuancen:
- **Copilot, 13 Commits** — maschinell erzeugter Code. Nach Auffassung des US Copyright Office ist
  rein maschinell Erzeugtes nicht schutzfähig. Das **senkt** das Risiko, es erhöht es nicht.
- Unsere Attribution sollte **"Azgaar and contributors"** lauten (§1.4), weil die Original-Zeile die
  Beiträger nicht nennt.

**Das wirklich Ungeklärte ist nicht der Code, sondern die Kunst** — und zwar nicht wegen fehlender
CLAs, sondern weil Azgaar Assets unter NC/SA-Bedingungen übernommen hat, die er nicht weitergeben
kann (§2.1), und Texturen ohne jede Herkunft (§2.2).

---

## 6. Watabou — die lokale Ebene, auf denselben Achsen geprüft

Kayas *nested maps* brauchen einen Generator **pro Maßstab**. Also ist die Lizenzfrage pro Maßstab zu
stellen — und die Antwort fällt für Watabou **genau umgekehrt** aus wie für Azgaar.

### 6.1 Output — die besten Bedingungen im gesamten Korpus

Watabou's Procgen Arcana FAQ (https://watabou.github.io/faq.html), wörtlich:

> *"You can use maps created by the generator(s) as you like: copy, modify, include in your
> **commercial** rpg adventures etc. **Attribution is appreciated, but not required.**"*

Besser als Azgaar (der Attribution ebenfalls nicht verlangt, aber enger formuliert), und
unvergleichbar besser als Inkarnate/Dungeondraft (RB-20a).

**Eine Norm, kein Lizenzbestandteil:** Watabou missbilligt es, generierte Karten „as is" zu
verkaufen — sagt aber ausdrücklich, dass er die Lizenzformulierung deswegen **nicht** ändern werde.
Chronicle verkauft ein **Werkzeug**, keine Kartenpakete; wir stehen auf der richtigen Seite von
Lizenz *und* Norm — **solange wir keine Bibliothek Watabou-generierter Karten als First-Party-Inhalt
mitliefern.** Das würde ich auch dann vermeiden, wenn es lizenzrechtlich trüge: die Beziehung ist
mehr wert als ein paar Beispielkarten.

### 6.2 Code — nicht verfügbar, und wo verfügbar, dann GPL

Watabou selbst (FAQ):

> *"Managing open-source projects is a lot of work, so normally **unless I am done with a project I
> don't make its code public**."*

Alle 8 öffentlichen GitHub-Repos geprüft:

| Repo | Lizenz | Sprache | Sterne | letzter Push |
|---|---|---|---:|---|
| **TownGeneratorOS** | **GPL-3.0** | Haxe | 1.877 | **2021-01-09** |
| RuneGeneratorOS | **keine** | Haxe | 204 | 2020-05-12 |
| CompassOS | **keine** | Haxe | 87 | 2019-04-17 |
| pixel-dungeon / PD-classes / switch-hook | GPL-3.0 | Java/Haxe | — | ≤2021 |

**Drei harte Konsequenzen:**

1. **`TownGeneratorOS` ist GPL-3.0** — starkes Copyleft ohne Ausnahme. Einbetten in Chronicle würde
   **das gesamte Produkt unter GPL-3.0 zwingen.** Für ein verkauftes, proprietäres Produkt: **aus.**
   Es ist ohnehin eine **frühe** Fassung und seit **5,5 Jahren** unangetastet, während der Live-
   Generator weiterentwickelt wurde.
2. **`RuneGeneratorOS` und `CompassOS` haben *gar keine* Lizenz.** Öffentlich ≠ lizenziert — ohne
   Lizenz gilt „alle Rechte vorbehalten". **Wir dürfen sie überhaupt nicht verwenden.** Das ist die
   klassische Falle, und sie ist hier scharf.
3. **Für Village, One Page Dungeon und Mansion existiert überhaupt kein Quelltext** — die von Kaya
   gewünschten lokalen Maßstäbe sind die, für die am wenigsten verfügbar ist.

### 6.3 Was das für *nested maps* architektonisch bedeutet

**Die Generator-Geschichte ist über die Maßstäbe hinweg nicht einheitlich, und das ist eine
Architekturvorgabe, keine Fußnote:**

| Maßstab | Generator | Rechtsweg |
|---|---|---|
| Welt / Region | **Azgaar (MIT)** | **einbettbar** — läuft in unserem Prozess |
| Stadt / Dorf / Dungeon / Mansion | **Watabou** | **nur Import** — Nutzer erzeugt auf seiner Seite, exportiert JSON/SVG, wir importieren |
| Battlemap | Dungeondraft / Dungeon Alchemist (RB-20a) | **nur Import** (UVTT) |

> **Der Containment-Graph muss „importierter Kindknoten" als erstklassigen Fall führen, nicht als
> Notbehelf.** Für alle Maßstäbe außer der Welt ist Import der **einzig legale** Weg, ein Kind zu
> erzeugen. Ein Modell, das „in-place generieren" als Normalfall und „importieren" als Sonderfall
> baut, ist an der lokalen Ebene sofort falsch — und das ist genau die Ebene, die Kaya haben will.

Das stützt zugleich RB-20a: Watabous JSON beweist, dass eine erzeugte Siedlung **von Natur aus ein
Objektgraph** ist, kein Bild. Ein Objektgraph ist genau das, was ein Containment-Knoten braucht.

---

## 7. Verdikt — als Erlaubnisliste

### 7.1 Wir dürfen — ohne Bedingungen

1. Azgaars Generator auf einem **gepinnten SHA forken**, privat halten, beliebig ändern.
2. Den **MIT-Generierungscode kommerziell** nutzen — Browser und Electron, self-hosted und verkauft.
3. Azgaars **GeoJSON / JSON / CSV** einlesen und verarbeiten (Burgs, Staaten, Provinzen, Kulturen,
   Religionen, Routen, Marker).
4. **Erzeugte Karten als Daten** (Geometrie + Attribute) als First-Party-Inhalt ausliefern und
   verkaufen — durch die Output-Klausel ausdrücklich gedeckt.
5. Von Nutzern exportierte **Watabou-JSON/SVG importieren**, anzeigen und in verkauften Kampagnen
   verwenden.
6. Alle npm-Laufzeitabhängigkeiten verwenden (MIT/ISC).

### 7.2 Wir dürfen mit Bedingungen — die Bedingungen namentlich

| Handlung | Bedingung |
|---|---|
| **Den Fork ausliefern** | `public/libs/tinymce/` **und** `src/controllers/notes-editor.ts` vorher löschen. **CI-Gate**, das den Auslieferungsbaum auf GPL/AGPL/`*-NC`/GFDL/LAL prüft und rot wird. |
| **Wappen mitliefern** | Nur die **104 CC0**. Die 179 NC, 37 SA, 10 GFDL, 1 LAL, 3 unbekannten **entfernen**. |
| **Waren-Icons mitliefern** | 65 CC-BY-3.0-Einzelnennungen automatisch aus den `<metadata>`-Tags generieren. |
| **Irgendein Asset mitliefern** | `THIRD-PARTY-NOTICES.md`, **im Produkt erreichbar** (Electron: im Binary). |
| **Gerenderte Karten als Marketing-/Demo-Material** | Ohne wappenwiki-Wappen, ohne Textur ungeklärter Herkunft, ohne Noun-Project-Icon. |
| **Schriften** | Selbst hosten (Lizenz je Familie prüfen). Nötig für Offline **und** entschärft das Google-Fonts-DSGVO-Risiko. |
| **jszip** | MIT-Option der Dual-Lizenz **schriftlich** in den Notices wählen. |
| **CC-BY-SA-/GFDL-Assets** *(falls überhaupt)* | Volle Attribution **plus** Copyleft auf das Asset akzeptieren. **Empfehlung: stattdessen ersetzen.** |

### 7.3 Wir dürfen nicht

1. **Die 179 CC-BY-NC-SA-3.0-Wappen in einem verkauften Produkt ausliefern.** NC ist mit Chronicles
   Geschäftsmodell unvereinbar. — **CRITICAL, kein Override.**
2. **TinyMCE 7.1.0 (GPLv2+) in einem proprietären Electron-Binary oder Self-Hosting-Bundle
   ausliefern.** — **CRITICAL, kein Override.**
3. Die **23 Texturen (11,1 MB)** ausliefern, solange die Provenienz nicht dateiweise geklärt ist.
4. `public/libs/openwidget.min.js` ausliefern (Azgaars fest verdrahtete Organisations-ID).
5. Die `googletagmanager.com`-Einbindung übernehmen.
6. **Watabous `TownGeneratorOS` (GPL-3.0) in Chronicle einbetten.**
7. **`RuneGeneratorOS` / `CompassOS` überhaupt verwenden** — keine Lizenz erteilt.
8. Zur Laufzeit von `azgaar.github.io`, `deorum.vercel.app`, `8desk.top`, `cdnfonts.com`,
   `dafont.com` abhängen.
9. Azgaars App-Icons/Favicons übernehmen (fremdes Branding).
10. Eine Bibliothek **Watabou-generierter Karten** als First-Party-Inhalt mitliefern.

### 7.4 Die zwei Gates, die daraus folgen

| Gate | Grün wenn |
|---|---|
| **Saubere Tüte** | Der Auslieferungsbaum enthält **keine** Datei unter GPL, AGPL, GFDL, LAL oder einer `*-NC`-Lizenz, und **keine** Binärdatei ohne Eintrag im Provenienzregister. Läuft in CI, bricht den Build. |
| **Vollständige Nennung** | Jedes ausgelieferte Drittasset hat einen Eintrag in `THIRD-PARTY-NOTICES.md` mit Titel, Urheber, Quelle, Lizenz — generiert, nicht getippt — und der Über-Bildschirm rendert ihn. |

**Warum als Gate und nicht als Vorsatz:** die Behebung kostet heute fast nichts (eine Löschung, eine
Whitelist). In Runde 9, wenn 400 Assets im Baum liegen und ein Binary im Verkauf ist, kostet sie das,
was Kaya „Migration" nennt. Die Provenienz eines Assets nachträglich zu ermitteln ist **unmöglich**,
nicht nur teuer — man kann eine Datei nicht rückwirkend fragen, woher sie kam.

---

## 8. Was ich nicht klären konnte

Ehrlich benannt, ohne erfundene Zahlen:

1. **Provenienz der 23 Texturen (11,1 MB)** — keine EXIF, kein Attributionsfile, keine README-Nennung,
   keine `<metadata>`. **Keine belastbare Angabe auffindbar.**
2. **`ship.svg` / `wagon.svg`** (`public/images/markers/`) — kein `<metadata>`-Tag.
3. **`arbalest.svg`, `plaice.svg`** — kein `<metadata>`; eine weitere Datei mit defektem Wert
   `licenseDescURL`.
4. **Lizenzkette der Heightmaps** — Verfahren dokumentiert (tangrams/Mapzen), aber die
   Attributionspflichten der zugrunde liegenden Höhendaten sind im Repo nirgends erfasst.
5. **Ob wappenwiki.org selbst korrekt CC BY-NC-SA vergibt** — die Wappen dort können ihrerseits aus
   Wikimedia Commons stammen, teils unter anderen Bedingungen. Nicht nachgeprüft; **ändert nichts am
   Verdikt**, weil wir uns auf die deklarierte Lizenz verlassen müssen und die NC sagt.
6. **Ob Azgaar für einzelne NC-Assets eine gesonderte Erlaubnis hat** — kein Hinweis in beide
   Richtungen.
7. **Lizenzbedingungen von OpenWidget** — kein Banner, keine Lizenzdatei im Repo.
8. **Watabous itch.io-Lizenzthread im Wortlaut** — die Seite antwortet mit HTTP 403 auf automatisierte
   Abrufe; die zitierten Bedingungen stammen aus der offiziellen FAQ (watabou.github.io/faq.html).

---

## 9. Empfehlung in einem Absatz

**Ja — aber wir übernehmen den Generator, nicht das Repository.** Forke heute auf ein getaggtes
Release, spiegle es vollständig, und nimm **`src/` plus die Datenexportpfade**. Lass `public/` liegen:
darin stecken 21,5 MB Kunst, von der die Hälfte non-commercial ist, 11 MB ohne jede Herkunft und ein
GPL-Editor, den wir nie wollten. Chronicle braucht von Azgaar den **Ortsgraphen**, nicht das Poster —
und genau dieser Teil ist MIT, ausdrücklich kommerziell freigegeben und der einzige im ganzen Korpus,
dessen **Ausgabe** wir verkaufen dürfen. Für die lokalen Maßstäbe ist Watabou juristisch das
Spiegelbild: der Output ist großzügiger als alles andere, der Code ist unerreichbar. **Also wird
Import zum ersten Bürger des Containment-Graphen** — nicht aus Bequemlichkeit, sondern weil es
unterhalb der Weltebene der einzige legale Weg ist, einen Kindknoten zu erzeugen.

---

*Athena, der Schild · zwei CRITICALs, beide heute für ~0 behebbar, beide morgen nicht mehr.*
