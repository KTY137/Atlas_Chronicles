# Featureliste — Arbeitsledger des experimentellen Worktrees

**Worktree:** `.claude/worktrees/featureliste`, Branch `experimental/featureliste-20260907`,
abgezweigt von `b3d809a` (`codex/resume-chronicle-20260906`), **nicht** von `origin/main`.

**Auftrag (Kaya, 2026-09-07):** die Liste unten *nach und nach* abarbeiten, für jedes Feature Zeit
lassen, **nicht regressieren**. Der Loop feuert alle 20 Minuten; dieses Dokument ist die Platte,
nicht das Gedächtnis. Wer hier kalt startet, liest diese Datei und `git log --oneline` — sonst
nichts.

## Regeln für diese Fläche

1. **Ein Feature nach dem anderen.** Kein zweites anfangen, solange das erste nicht grün ist.
2. **Erst messen, dann bauen.** Jedes Feature beginnt mit einem Test, der den heutigen Zustand
   beschreibt. Ein Test, der nie rot war, beweist nichts.
3. **Kein Regress.** Vor jedem Abschluss läuft die betroffene Suite; der Baseline-Stand steht unten.
4. **Kayas Migrationsregel gilt:** Datenmodell, Berechtigungen, Export-/Paketformat werden sofort in
   ihrer endgültigen Form gebaut. Layout, Text, Bewegung dürfen billig sein.
5. **Ein Feature ist erst fertig, wenn man es benutzen kann** (Kaya, 2026-09-07). Die Datenschicht
   allein ist kein Feature. Zu jedem Punkt gehört die Bedienoberfläche, und zwar eine, die jemand
   ohne Erklärung versteht. Erst dann steht hier ☑.
6. **Keine Doppelungen** (Kaya, 2026-09-07). Vor jeder Zeile Code wird gesucht, ob es die Sache
   schon gibt. Zweimal dasselbe unter zwei Namen ist teurer als gar nichts — und es ist der
   Fehler, den eine lange Liste am leichtesten erzeugt.
7. **Nicht die volle Suite laufen lassen** — sie braucht ~4 Minuten und blockiert. Gezielt die
   Suiten fahren, die die Änderung berühren, und die Konsumenten der geänderten Schnittstelle
   dazu (`grep -rln` auf den geänderten Export).

## Stand der Liste

Legende: ☐ offen · ◐ in Arbeit · ☑ grün und belegt

| # | Feature | Stand | Notiz |
| --- | --- | --- | --- |
| 1 | Kampfsystem (testen) | ☑ | grün und belegt, siehe unten |
| 2 | Kampfbühne (wie bei Card Games) | ☑ | bedienbar am Tisch, Reiter „Kampf“ |
| 3 | Würfel animiert | ☑ | fallen beim Eintreffen, Historie bleibt ruhig |
| 4 | Wiki-Export | ☑ | Chronik als Markdown, im Blick der exportierenden Person |
| 5 | Lootkarten (Karte wie YuGiOh) | ☐ | |
| 6 | Admininventar (Admin erstellt Lootkarten) | ☐ | |
| 7 | Spielleiter kann Würfe erleichtern | ☐ | |
| 8 | Alles als **eine** Datei exportierbar (JSON) | ☐ | `.chronicle` v6 existiert — prüfen, nicht neu bauen |
| 9 | Speicherstats (Lootkarten-Inventar der Spielleitung) | ☐ | |
| 10 | Verschiedene Inventare · Containerinventare (Kutschloot) | ☐ | |
| 11 | Permanente Spielerprofile (mehrere Figuren je Account) | ☐ | |
| 12 | Gesonderter Geldcounter | ☐ | |
| 13 | Leben/Mana/Ausdauer-Anzeige | ☐ | hängt an #1 |
| 14 | Dynamisch setzbare Bars | ☐ | hängt an #13 |
| 15 | KI-vorgeschlagene Änderungen | ☐ | |
| 16 | NPC-Templates (Loot mit Wahrscheinlichkeit) + NPC-Generator mit Typus | ☐ | |
| 17 | PNGs hochladbar | ☐ | `wiki_assets` (015) existiert — prüfen |
| 18 | Außerhalb der Hauptkarte erzeugbare Karten | ☐ | verschachtelte Karten (014) existieren — prüfen |

## Feature 1 — Kampfsystem: gemessen, nicht vermutet

**Baseline vor jeder Zeile Code:** `packages/rules` + `gameplay.test.ts` + `htbah-gameplay.test.ts`
= **137/137 grün**. Zwei Fälle in `how-to-be-a-hero.test.ts` fallen unter Parallel-Last ins
5000-ms-Budget; isoliert laufen sie **25/25 grün in 25,6 s** (1,7 s bzw. 2,5 s). Last, kein
Defekt — dasselbe Muster, das STATUS.md für `campaign-bundle-v3` festhält. Kein Budget angehoben.

### Was funktioniert

`packages/server/test/kampf.test.ts`, erster Fall, **grün beim ersten Lauf**: Initiative
(`1d10 + Begabung Handeln`), ein klassifizierter Fertigkeitsangriff und Schaden
(`3W10 + 2, kritisch verdoppelt`) laufen aus einem gespeicherten Bogen, und alle drei Belege
rechnen sich nach. Die Würfelkette eines Kampfes trägt.

### Was fehlt — und es ist kein Bug

Der zweite Fall ist rot: HP auf 0 lässt `defeatPending` false, `confirmDefeat` bleibt
unerreichbar. **Das ist so entschieden worden, nicht übersehen.**
`design/iterations/how-to-be-a-hero-20260906.md` §H1: *„HP and GBP use versioned sheet updates …
changing them does not automatically change defeat state."* Der Grund steht in Zeile 154–156 und
ist gut: `adjustResource` markiert Niederlage, sobald **irgendeine** angepasste Zahl 0 erreicht —
ein leergespielter Geistesblitz-Zähler hätte die Figur getötet. Die v2-Ablehnung ist eine
**Quarantäne**, keine Lücke.

Dieselbe Zeile benennt aber auch, was stattdessen fehlt: *„A separate generic resource-semantics
change is outside this contract."* — **vertagt, nicht verworfen.** Und Zeile 108 hält fest, dass
Tod bei 0 HP die echte Regel des Systems ist; sie steht heute nur als Fließtext daneben.

Zwei Korrekturen an meiner ersten Eintragung hier: die Oberfläche ist **nicht** tot —
für v1-Pakete (Demo) ist `defeatPending` erreichbar und der Hinweis richtig. Und dies ist
**nicht** die Desktop-Sackgasse; dort war ein Zustand unerfüllbar, hier ist er bewusst
zurückgehalten.

### Die Entscheidung, die dieser Auftrag einfordert

Die Featureliste ruft die vertagte Arbeit ab — nicht nur mit „Kampfsystem", sondern mit **#13
Leben/Mana/Ausdauer** und **#14 dynamisch setzbare Bars**. Alle drei brauchen dieselbe fehlende
Sache: **das Regelpaket muss seine Vitalwerte deklarieren.**

Ein `vitals`-Eintrag je Paket nennt Feld, Beschriftung, Höchstwert-Ausdruck und was Erschöpfung
bedeutet. Damit folgt Niederlage aus einer **deklarierten** Regel — nicht aus „irgendeine Zahl ist
0" (die v1-Grobheit, die H1 zu Recht ablehnt) und nicht aus einem fest verdrahteten `hp` (der
billige Weg, der bei Mana und Ausdauer sofort bricht — also genau bei #13).

Nach Kayas Migrationsregel ist das Paketformat die **irreversible Schicht**: einmal maximal
gebaut, dient eine Deklaration drei Listenpunkten. Der Preis ist ehrlich und bekannt: der
Inhalts-Hash von How to be a Hero ändert sich, das Paket geht auf **1.1.0**. `gate:version` prüft
nur Wurzel- und Desktop-Manifest und ist davon nicht berührt.

**Kein Kampf-Scheduler wird behauptet** (Lineage Zeile 111). Initiative bleibt ein Wurf; die
Reihenfolge am Tisch ist Feature #2.

### Abschluss Feature 1 — 2026-09-07 16:58

**Der Befund ist geschlossen, und zwar an der Schicht, die drei Listenpunkte trägt.** Das
Regelpaket deklariert seine Vitalwerte (`vitals`: Feld, Beschriftung, Höchstwert-Ausdruck,
Bedeutung der Erschöpfung). Niederlage folgt jetzt aus einer **ausgewiesenen** Regel, nicht
mehr aus „irgendeine Zahl ist 0“ und nicht aus einem fest verdrahteten `hp`. How to be a
Hero geht damit auf **1.1.0**; der Inhalts-Hash ändert sich, deshalb sagt es die Version.

**Was in diesem Durchgang dazukam — und warum es nötig war.** Die Deklaration und ihre beiden
Leser `evaluateVitals` / `depletedDefeatVitals` hatten **keinen einzigen direkten Test**; gedeckt
war nur der glückliche Pfad über den Server. Neun Fälle in `package-v2.test.ts` schließen das:
jede Ablehnung des Parsers (kein Zahlenfeld, doppelte Kennung, unbekannte Eigenschaft, fehlende
oder erfundene Erschöpfung, mehr als acht Vitalwerte), sieben nichtportable Höchstwert-Ausdrücke,
und die Leser selbst samt ausgewertetem Höchststand. Ein v1-Paket lehnt `vitals` jetzt genauso ab
wie `computed` und `constraints`.

**Die Zusicherung, die dabei festgeschrieben wurde:** `max` wird gegen **gespeicherte** Felder
geprüft und später gegen **dieselben** ausgewertet. Liefen die Namensräume auseinander, ergäbe
ein gültiges Paket eine Anzeige, die erst beim Anschauen bricht — genau die Sorte Ausfall, die
STATUS.md als „stillen Ausfall“ führt. Ein `max: "actor.unused"` (ein berechnetes Feld) wird
deshalb schon beim Einlesen abgelehnt.

**Gegenprobe gefahren, nicht behauptet.** Zwei absichtliche Brüche in `package-v2.ts` —
Erschöpfungsprüfung entfernt, und `depletedDefeatVitals` wieder auf „jeder leere Vitalwert“
gestellt — machen genau die beiden neuen Tests rot, der zweite mit
`['vigour','insight']` statt `['vigour']`. Das ist wörtlich der H1-Fehler, bei dem ein
leergespielter Zähler die Figur tötet. Danach zurückgesetzt und erneut grün.

**Belege.**

- Betroffene Suiten: **141/141 grün** (`packages/rules`, `kampf.test.ts`, `htbah-gameplay.test.ts`,
  `htbah-forge.test.ts`) — vorher 132, die neun neuen Fälle sind der Zuwachs.
- Volle Suite: **1351/1404 grün, 52 übersprungen**, ein Fehlschlag: `bundles-v3.test.ts` läuft
  unter Parallel-Last in sein 30-s-Budget. **Isoliert 6/6 grün in 19,8 s**, der langsame Fall bei
  10,0 s. Last, kein Defekt — dasselbe Muster wie bei `how-to-be-a-hero`. **Kein Budget wurde
  angehoben.**
- `npm run typecheck`: **0 Fehler**. `gate:boundaries`: **408 Dateien / 8 Regeln / 0 Verletzungen**.
  `gate:version`: grün.

**Offen und ausdrücklich nicht behauptet.** Eine bestehende Kampagne mit installiertem 1.0.0
bleibt gültig und hat weiterhin keine Vitalwerte — sie bekommt sie erst, wenn die Spielleitung
1.1.0 mit einer Migration aktiviert. Das ist die richtige Reihenfolge (kein Paket ändert sich
unter einer laufenden Runde hinweg), aber es ist ein Schritt, den jemand tun muss. Die
**Anzeige** der Vitalwerte gibt es noch nicht: `evaluateVitals` ist der Leser, auf dem #13 und
#14 aufsetzen, und gehört dort hin, nicht hierher. Es gibt weiterhin **keinen
Kampf-Scheduler** — Initiative ist ein Wurf, die Reihenfolge am Tisch ist #2.

## Feature 2 — Kampfbühne: der Befund und der Entwurf

**Gemessen, 2026-09-07 17:05.** Es gibt **keine Initiativreihenfolge** — nirgends. `initiative`
kommt im ganzen Baum nur als Würfelaktion des Regelpakets vor (`how-to-be-a-hero.ts`) und in
Tests. `Round.tsx` heißt „Runde", meint aber die Spielrunde am Tisch (Mitglieder, Einladungen),
nicht die Kampfrunde. Die taktische Fläche kennt Marken auf einer Karte, aber keine Ordnung
darüber, **wer wann dran ist**. Der Ledger hatte das für #2 vorgemerkt; es stimmt.

### Was eine Kampfbühne ist — und was sie nicht ist

„Wie bei Card Games" ist keine Verzierung, sondern die Aussage über das Modell: die Bühne ist die
**abstrakte** Alternative zur taktischen Karte. Kein Gelände, keine Koordinaten — zwei
gegenüberliegende Reihen, jeder Kämpfende eine Karte, eine Reihenfolge, eine Runde. Die
taktische Karte bleibt unangetastet; wer Gelände braucht, nimmt sie. Beides nebeneinander ist
richtig, eines in das andere zu pressen wäre der billige Weg.

Daraus folgt: **`seite` ist ein Modellwert, kein Layout.** Die zwei Reihen sind die Aussage.

### Das Datenmodell, in endgültiger Form (Kayas Migrationsregel)

- **`kaempfe`** — der Kampf: Kampagne, Name, Rundenzähler, Zustand
  (`vorbereitet` → `laufend` → `beendet`), Zeiger auf den Teilnehmer, der am Zug ist.
- **`kampf_teilnehmer`** — die Karte auf der Bühne: Kampf, Seite, Initiativwert, stabile
  Ordnungszahl für Gleichstände, optional an einen `actor` gebunden, sonst freier Name (Gegner).

**Die Initiative trägt ihren Beleg mit.** Der Wert ordnet, aber wo er aus einem Wurf stammt,
steht die `roll_id` daneben. Das ist keine Zierde, sondern die Hausregel dieser Anwendung:
nichts Wirksames ohne Quittung. Von Hand gesetzte Werte (Gegner) haben keine — und sagen das,
statt es zu verschweigen.

### Warum das kein UI-Stück ist

`requireCoveredSchema` in `domain/bundles.ts` prüft in **beide** Richtungen: jede dauerhafte
Spalte des laufenden Schemas muss in einem Exportprofil vorkommen, und jede Profilspalte muss
existieren. Eine neue Tabelle ohne Profil bringt **jeden Export zum Stehen** — so wurden schon
die Bilder in v7, der Zugangsvorfall in v8, die Gefüge-Kanten in v9 und die Kategorien in v10
gefunden. Die Bühne ist deshalb ein senkrechter Schnitt durch fünf Orte, die zusammen landen
müssen:

1. Migration `021_kampfbuehne.sql`
2. `packages/io/src/native-v11/**` (Generation 11, additiv — kein eingefrorenes Profil anfassen)
3. `restoreOrder` und die Formatversion-Union in `domain/bundles.ts`
4. Löschabdeckung (`deletion.test.ts` leitet sie aus dem laufenden Schema her)
5. Domäne samt Berechtigungen + HTTP, dann erst die Bühne selbst

Punkt 5 ist die sichtbare Hälfte und kommt zuletzt. Wer hier kalt startet: die Reihenfolge ist
nicht verhandelbar, weil der Baum zwischen 1 und 3 **rot** ist.

### Abschluss Feature 2 — 2026-09-07 17:40

**Die Bühne steht und man kann sie bedienen.** Reiter **„Kampf“** am Tisch, direkt neben der
Szenenkarte — dort, wo die abstrakte Schwester hingehört. Keine zehnte Leiste daneben (Regel 6).

**Was die Spielleitung tun kann:** eine Bühne aufstellen, Kämpfende daraufsetzen (mit oder ohne
Figur am Tisch, mit oder ohne Wurfbeleg), eröffnen, reihum weiterschieben, jemanden herunternehmen,
beenden. **Was die Runde sieht:** dieselbe Bühne, ohne Knöpfe — sie muss wissen, wann sie dran ist.

**Die Karte trägt ihren Beleg.** Wählt die Spielleitung eine Figur, für die ein Initiativwurf
vorliegt, bietet das Formular an, dessen Wert zu übernehmen; die `roll_id` wandert mit und die
Karte zeigt „gewürfelt“ statt „gesetzt“. **Wer die Zahl danach von Hand ändert, verliert den
Beleg** — eine Karte, die einen Wurf behauptet, den sie nicht zeigt, wäre schlimmer als eine ohne.
Ein erfundener Beleg wird vom Fremdschlüssel abgewiesen, nicht gespeichert; beides ist geprüft.

**Ein echter Fehler unterwegs, gefunden und behoben:** das Herunternehmen einer Karte rief `POST`
gegen eine `DELETE`-Route. Der Knopf hätte nichts getan.

**Belege.**

- `kampfbuehne.test.ts` **9/9 grün** — Reihenfolge samt Gleichstand, Runde beim Rücksprung,
  Doppelklick-Abwehr, Zugweitergabe beim Entfernen, Beenden, Berechtigungen, leere Bühne, und
  die zwei Belegfälle gegen die echte Würfelmaschinerie.
- Gegenprobe: Nebenläufigkeitssicherung und Rundenzähler ausgehängt → genau die zwei zugehörigen
  Fälle rot. Danach zurückgesetzt.
- Berührte Konsumenten: `restore-order` + `deletion` + `packages/io` **249/249 grün**;
  Formatkonsumenten am Server **32 bestanden, 4 übersprungen**; `health` bootet mit der neuen
  Route. `typecheck` 0 Fehler, `gate:boundaries` **417/8/0**, Client-Build grün.

**Offen und ausdrücklich nicht behauptet.** Eine bereits gesetzte Initiative lässt sich nicht
nachträglich ändern — nur herunternehmen und neu aufstellen, was die Aufnahmereihenfolge
verschiebt. Das ist die eine raue Kante, die ich sehe; sie gehört auf die Liste, nicht in eine
Behauptung. Die Bühne aktualisiert sich alle 4 Sekunden per Abfrage wie die übrigen Flächen, es
gibt keinen eigenen Live-Kanal. Und die Vitalwerte aus #1 werden auf der Karte **noch nicht**
angezeigt — das ist #13, und es ist bewusst dort und nicht hier.

## Feature 3 — Würfel animiert: die Bewegung darf den Wert nicht tragen

**Gemessen, 2026-09-07 17:30.** Die Würfel eines Wurfs standen als schlichte Zahlen-Kacheln in
`.dice-results`. Keine Bewegung — aber auch keine Lücke im Modell: der Wurf entsteht auf dem
Server, mit Beleg, und die Anzeige liest ihn nur. Feature 3 ist deshalb **reine Oberfläche**, und
das ist die richtige Größe.

### Zwei Fallen, die zuerst gefunden werden mussten

**Erstens: zwei Tests pinnen die Würfel-DOM.** `roll-card.test.ts` schneidet
`<div class="dice-results">…</div>` per Regex heraus und vergleicht den reinen Text; `e2e/table.spec.ts`
erwartet `.dice-results > span` mit exakt `{Augen}W12`. Ein zusätzliches Textzeichen oder ein
verschachteltes `<div>` hätte beides gebrochen. **Aufbau und Text sind deshalb unverändert
geblieben** — dazugekommen sind nur eine Klasse und eine laufende Nummer je Würfel.

**Zweitens: `styles.css` Zeile 307 hat längst eine globale `prefers-reduced-motion`-Regel.** Sie
kürzt `animation-duration` und `animation-iteration-count` — **aber nicht `animation-delay`.**
Eine über Verzögerungen gestaffelte Animation bliebe für diese Nutzer also stehen und zeigte die
Würfel in ihrer Anfangslage. Gestaffelt wird hier deshalb über die **Dauer**
(`calc(360ms + var(--wuerfel-nr) * 95ms)`), und die Kurve läuft von *verdreht* nach *neutral*:
der Ruhezustand des Elements IST der Endzustand. Fällt die Bewegung ganz aus, steht der Wert
trotzdem richtig da. Keine zweite Reduced-Motion-Regel (Regel 6).

### Was dazugekommen ist

- **Die Würfel fallen, wenn ein Wurf eintrifft** — gestaffelt, sodass sie nacheinander landen.
- **Ein Würfel dreht sich, solange der Wurf unterwegs ist.** Er zeigt keinen Wert: der entsteht
  auf dem Server, und hier eine Zahl vorzugaukeln wäre eine Behauptung.
- **Die Historie fällt nicht.** Die Wurfliste wird alle 6 Sekunden neu geholt; ohne diese
  Unterscheidung fiele bei jeder Abfrage alles erneut. `frischeAuswahl` hält die Regel: der erste
  Datenstand zählt vollständig als Bestand, nur was danach dazukommt, ist frisch. Eine
  verschwundene und wiederkehrende Karte ist kein neues Ereignis.

### Ein Fehler unterwegs

Beim Schreiben des Hooks geriet ein **echtes NUL-Byte** als Trennzeichen in `hooks.ts`. Es hätte
funktioniert, aber Werkzeuge halten NUL-haltige Dateien für binär. Ersetzt durch ein Komma —
Wurfkennungen sind UUIDs, das Komma kommt darin nicht vor.

### Belege

- `wuerfel-animation.test.ts` **7/7 grün**: was als frisch gilt (drei Fälle), und dass die
  Bewegung den Wert nicht trägt — gleicher Text mit und ohne Animation, Ruhe als Voreinstellung,
  eigene laufende Nummer je gewertetem Würfel.
- **Gegenprobe gefahren:** erster Datenstand fälschlich als frisch, und Bewegung als
  Voreinstellung → genau die zwei zugehörigen Fälle rot. Danach zurückgesetzt.
- Kein Regress: `packages/client` **125/125 grün** (darunter die beiden DOM-pinnenden Dateien),
  `typecheck` 0 Fehler, `gate:boundaries` **418/8/0**, Client-Build grün.

### Offen und ausdrücklich nicht behauptet

Die Würfel sind **beschriftete Kacheln, keine Augenbilder** — die Zahl und das `W12` daneben
sagen, was gefallen ist. Echte Würfelaugen gingen nur beim W6 auf, und ein System, das bei einer
Würfelart anders aussieht als bei allen anderen, wäre schlechter als eines, das überall gleich
liest. Der e2e-Lauf im Browser hat die Bewegung nicht gesehen; geprüft ist sie am gerenderten
Aufbau, nicht an einem laufenden Bild.

## Feature 4 — Wiki-Export: die Chronik als lesbare Datei

**Gemessen zuerst, 2026-09-07 17:35 — und es gab drei Dinge, die wie dieses Feature aussehen.**
`wikitext.ts` ist der **Import** aus MediaWiki (die Gegenrichtung). `CampaignExport` ist das
**Kampagnenpaket** `.chronicle`, ein Wiederherstellungsformat — das gehört zu #8, nicht hierher.
Und **Veröffentlichung** (`012_authoring.sql`) ist eine *gehostete* öffentliche Leseseite, keine
Datei zum Mitnehmen. Feature 4 ist das vierte: den Wiki-**Inhalt** als lesbares Dokument
herausnehmen. Keines der drei wurde angefasst (Regel 6).

### Die eine Frage, an der alles hängt

Wer exportiert, sieht was? Die Chronik hat Passagen-Wissen, Türen und Geltungsstufen. Ein Export,
der das falsch macht, ist kein Schönheitsfehler, sondern ein Leck.

**Deshalb leitet der Export nichts selbst her.** `exportWiki` ruft `listEntries` und `getEntry`
auf — dieselben Funktionen, die der Artikel im Browser benutzt. Die Sichtbarkeit hat damit **genau
eine Herleitung**, und der Serialisierer bekommt bereits Projiziertes und trifft keine einzige
Sichtbarkeitsentscheidung. Der Preis ist bekannt und wird bewusst gezahlt: zwei Lesungen je
Artikel. Ein Export ist eine Geste am Ende eines Abends, kein Renderpfad — und die Route ist wie
der Kampagnenexport auf 4 Aufrufe je Minute begrenzt.

**Der Kopf des Dokuments sagt, wessen Blick es ist.** Ein Spielerexport trägt „Dies ist **dein**
Blick auf die Chronik"; der Knopf heißt für sie „Mein Wissen exportieren", für die Spielleitung
„Chronik exportieren". Bliebe das ungesagt, hielte jemand seinen Ausschnitt für die Welt und
merkte es nie.

### Der Serialisierer

`packages/io/src/wiki-markdown.ts`, die Gegenrichtung zu `wikitext.ts` im selben Paket. Er hält
die Struktur: Überschriften erst dort, wo der Passagen-Pfad sich ändert; Listen, Zitate,
Auszeichnungen; mehrwertige Infobox-Zeilen bleiben Aufzählung, statt zu einer Komma-Zeile zu
verschmelzen. Verweise zeigen als Sprungmarken in dasselbe Dokument — der Export ist **eine**
Datei.

Zwei Ehrlichkeiten stecken darin:

- **Markdown-Zeichen im Fließtext werden geschützt.** Ohne das formatierte sich ein Artikel, der
  über Sterne und Klammern spricht, beim Export selbst um — der Export wäre keine Kopie mehr,
  sondern eine Interpretation.
- **Abbildungen werden benannt, nicht behauptet.** Die Bytes liegen nicht bei; ein `![…](…)`
  zeigte auf nichts. Stattdessen steht dort *Abbildung: burg.png* samt Bildunterschrift.
- Ein unverwandelter **Rohblock** wird gezeigt, nicht stillschweigend fallengelassen — dieselbe
  Regel wie im Leser.

### Keine Doppelung beim Herunterladen

Der Blob-Download stand schon in `CampaignExport`. Statt ihn ein zweites Mal zu schreiben, ist er
als `ladeAlsDatei` nach `api.ts` gewandert und wird jetzt von beiden benutzt. Er liest den
Dateinamen aus `Content-Disposition` — der Server weiß besser als der Browser, wie die Datei
heißen soll.

### Belege

- `wiki-markdown.test.ts` **10/10 grün**: Schutzzeichen, Überschriften nur bei Pfadwechsel,
  Sortierung nach `ord`, Listen/Zitate/Verweise, Abbildung ohne Bildbehauptung, Rohblock,
  mehrwertige Felder, Inhaltsverzeichnis, leere Chronik.
- `wiki-export.test.ts` **4/4 grün** gegen die echte Anwendung: die Spielleitung bekommt alles,
  **die Spielerin nur ihre gehaltene Passage** — weder die verborgene Passage desselben Artikels
  noch der Artikel, den sie gar nicht kennt. Dazu Kopfzeilen (Umlaut kodiert nach RFC 5987 neben
  ASCII-Rückfall, keine Zeilenumbrüche) und 404 für Fremde.
- **Gegenprobe gefahren:** der Export nimmt die Abkürzung und leitet die Sichtbarkeit selbst her
  → der Spielerfall wird rot und leckt genau `Unter der Mauer liegt ein Tunnel`. Danach
  zurückgesetzt.
- Kein Regress: `packages/io` + `packages/client` + vier Wiki-Serversuiten **394/394 grün**,
  `typecheck` 0 Fehler, `gate:boundaries` **421/8/0**, Client-Build grün.

### Offen und ausdrücklich nicht behauptet

Der Export ist **eine Markdown-Datei ohne Bilder** — Abbildungen werden benannt. Es gibt keinen
Export einzelner Artikel und kein zweites Format (HTML, PDF, Wikitext-Rückweg); die Wahl fiel auf
das eine Format, das sich überall öffnen, drucken und weiterverarbeiten lässt. Und der Export
liest je Artikel zweimal — für eine sehr große Chronik ist das langsam, aber es ist der Preis
dafür, dass die Sichtbarkeit nur eine Quelle hat.
