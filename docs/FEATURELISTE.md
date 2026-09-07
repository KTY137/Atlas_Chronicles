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
8. **Beide Gates laufen, immer.** `npm run typecheck` prüft den Client **nicht** (die
   Wurzel-`tsconfig.json` schließt `packages/client/**` aus); ihn prüft `npm run build`
   (`tsc --noEmit && vite build`). Umgekehrt prüft der Build die **Server-Tests** nicht — ein
   Typfehler dort fällt nur `typecheck` auf. Vor jedem Abschluss laufen deshalb **beide**
   (gefunden 2026-09-07 bei Feature 5, verschärft bei Feature 9, nachdem ein Typfehler in einem
   Servertest einen Commit überlebt hatte).

## Stand der Liste

Legende: ☐ offen · ◐ in Arbeit · ☑ grün und belegt

| # | Feature | Stand | Notiz |
| --- | --- | --- | --- |
| 1 | Kampfsystem (testen) | ☑ | grün und belegt, siehe unten |
| 2 | Kampfbühne (wie bei Card Games) | ☑ | bedienbar am Tisch, Reiter „Kampf“ |
| 3 | Würfel animiert | ☑ | fallen beim Eintreffen, Historie bleibt ruhig |
| 4 | Wiki-Export | ☑ | Chronik als Markdown, im Blick der exportierenden Person |
| 5 | Lootkarten (Karte wie YuGiOh) | ☑ | Kartenfassung des Gegenstandsvertrags + Karte |
| 6 | Admininventar (Admin erstellt Lootkarten) | ☑ | war gebaut; geprüft und belegt, ein Regress dabei gefunden |
| 7 | Spielleiter kann Würfe erleichtern | ☑ | bedienbar im Reiter „Aktionen" |
| 8 | Alles als **eine** Datei exportierbar (JSON) | ☑ | Rundlauf belegt, Bilder inklusive; ein Regress dabei gefunden |
| 9 | Speicherstats (Lootkarten-Inventar der Spielleitung) | ☑ | Speicherstand im Vorrat: was es gibt und wo es liegt |
| 10 | Verschiedene Inventare · Containerinventare (Kutschloot) | ☑ | Inventarauswahl; ein Behälter ist eine Figur der Art Fahrzeug |
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

## Feature 5 — Lootkarten: das Gesicht zu einem System, das schon da war

**Gemessen zuerst, 2026-09-07 17:46 — und der Befund hat das Feature halbiert.** Migration 010
führt längst `item_templates` mit **unveränderlichen, inhaltsgehashten Revisionen**,
`item_instances` mit Besitzer und Zustand, und ein Ereignisprotokoll mit `item.transfer`. Die
Oberfläche hat bereits „Gegenstandsvorlagen" (anlegen, überarbeiten, archivieren) und einen
„Vorrat der Spielleitung". **Feature 5 war also nie das Datenmodell — es war die Karte.** Nichts
davon wurde nachgebaut (Regel 6).

Was fehlte: `ItemContractV1` trug nur Name, Lore-Verweis und Etiketten. Genug für eine Zeile in
einer Liste, zu wenig für eine Karte.

### Die Naht, an der die Kartenfassung durchkommt — und die, an der sie es nicht darf

`ItemContractV2` fügt Seltenheit, Art, Bild, Spruch und bis zu acht freie Zeilen hinzu. **Die
Seltenheit ist eine geschlossene Menge, die Art nicht:** was die Darstellung trägt (der Rahmen),
wird geschlossen; was die Welt beschreibt, bleibt offen. Kein Rollenspiel kennt dieselben
Gegenstandsarten, aber jede Karte braucht einen Rahmen.

Der Haken saß im Export: `campaign-bundle-v2.ts` erzwingt `schemaVersion === 1` und eine
geschlossene Schlüsselmenge — eine Kartenfassung hätte **jeden Export zum Stehen gebracht**. Und
dieser Prüfer ist zugleich der des **eingefrorenen** v2-Umschlags. Ihn einfach zu öffnen wäre
falsch: ein altes Paket, das eine Fassung enthielte, die sein eigener Leser nicht kennt, wäre
kein altes Paket mehr.

**Die Lösung stand schon im Haus:** `checkActorInventoryTables` bekommt ein
`CampaignRulesProfile` — der eingefrorene Pfad übergibt `LEGACY_CAMPAIGN_RULES`, der aktuelle
`SUPPORTED_CAMPAIGN_RULES`. Genau die Naht, die schon die Regelpaket-Fassungen trennt. Sie trägt
jetzt zusätzlich `itemCardFaces`. **Keine neue Formatgeneration** — es kommt keine Tabelle dazu,
nur ein Inhalt in einer bereits exportierten `jsonb`-Spalte.

### Die Karte

`Lootkarte.tsx` ist rein darstellend und steht an **einer** Stelle — deshalb erscheint sie
überall gleich: in der Vorlagenwerkstatt als **lebende Vorschau** (wer eine Karte baut, soll die
Karte sehen, nicht ein Formular erraten), im Bestand als Kartenblatt, beim Bearbeiten neben dem
Formular, und in der Ansicht einer früheren Revision.

Zwei Ehrlichkeiten:

- **Die Seltenheit steht als WORT auf der Karte**, nicht nur als Rahmenfarbe — eine Aussage, die
  allein in einer Farbe steckt, kommt bei Farbenblindheit nicht an.
- **Eine Vorlage der Fassung 1 bekommt kein erfundenes Gesicht.** Sie zeigt, was sie hat, und
  sagt, dass das Gesicht fehlt. Sie mit „Gewöhnlich" aufzufüllen wäre eine Aussage über einen
  Gegenstand, die niemand getroffen hat.
- Das Bild kommt aus dem **vorhandenen** Bildbestand der Chronik (`wiki_assets`) — kein zweiter
  Bilderspeicher.

### Ein Fund, der über dieses Feature hinausgeht

**`npm run typecheck` prüft den Client NICHT.** Die Wurzel-`tsconfig.json` schließt
`packages/client/**` ausdrücklich aus. Geprüft wird der Client von `npm run build`
(`tsc --noEmit && vite build`) — genau dort fielen dann auch zwei echte Fehler dieses Features
auf (fehlender Import, impliziertes `any`). **Regel 7 im Kopf dieses Dokuments ist entsprechend
ergänzt:** wer Client-Code anfasst, muss bauen, nicht nur typechecken.

### Belege

- `lootkarte.test.ts` (io) **6/6 grün**: die Karte kommt durch den aktuellen Umschlag, **wird vom
  eingefrorenen abgewiesen**, Fassung 1 gilt unverändert weiter, erfundene Seltenheit,
  zusätzliche Eigenschaften, zu lange Angaben und zu viele Zeilen werden abgelehnt.
- `lootkarte.test.ts` (client) **5/5 grün**: Seltenheit als Wort, Art/Spruch/Zeilen/Etiketten,
  **kein erfundenes Gesicht für Fassung 1**, Platzhalter ohne Bild, karge Karte bleibt lesbar.
- **Gegenprobe gefahren:** das eingefrorene Profil auf `itemCardFaces: true` gestellt → der Fall
  „wird vom eingefrorenen Umschlag abgewiesen" wird rot. Danach zurückgesetzt.
- Kein Regress: `packages/io` + `packages/client` + vier Server-Suiten **406/406 grün**,
  `typecheck` 0 Fehler, `gate:boundaries` **424/8/0**, Client-Build grün.

### Offen und ausdrücklich nicht behauptet

Die Karte ist **beschreibend**: keine Regelwirkung, kein Würfelmodifikator — genau wie der
Vertrag es seit jeher sagt. Es gibt **keine Kartenrückseite, keinen Druckbogen und keine
Animation** beim Ziehen. Und eine Vorlage der Fassung 1 bekommt ihr Gesicht erst, wenn die
Spielleitung sie das nächste Mal überarbeitet — automatisch umschreiben käme nicht in Frage,
denn ihre Revision ist unveränderlich und inhaltsgehasht.

## Feature 6 — Admininventar: geprüft, nicht gebaut. Und dabei einen Regress gefunden.

**Gemessen zuerst, 2026-09-07 17:55.** Der Ledger hatte für #6 „prüfen, nicht neu bauen"
vermerkt, und das war richtig. Der ganze Pfad steht:

- **Nur die Spielleitung entwirft Lootkarten.** `saveTemplate` verlangt `role === "leitung"`;
  über HTTP bekommt eine Spielerin **404**, nicht 403 — dieselbe Antwort wie überall im Haus.
- **Der Vorrat ist das Admininventar, und zwar ohne zweite Tabelle:** ein Gegenstand ohne Träger
  (`holder_actor_id IS NULL`) liegt bei der Spielleitung. Lesen und Anlegen sind an
  `role === "leitung"` gebunden.
- **Ausgeben ist gebaut und bedienbar:** im Gegenstandseditor wählt die Spielleitung den Träger,
  inklusive „Vorrat der Spielleitung" als Rückweg.

**Die Arbeit dieses Durchgangs war deshalb die Beweisführung**, nicht der Bau. Vier Fälle in
`admininventar.test.ts` halten die ganze Geschichte: entwerfen → in den Vorrat legen → ausgeben,
und daneben die drei Verweigerungen (Vorrat nicht einsehbar, keine Gegenstände durch Spielende,
keine Vorlagenpflege durch Spielende). Sechs weitere in `item-contract.test.ts` prüfen den
Vertrag selbst.

### Der Fund, der diesen Durchgang gerechtfertigt hat

`item-contract.test.ts` wurde beim ersten Lauf **rot** — und zwar an meiner eigenen Arbeit von
Feature 5. Die drei neuen Muster im Gegenstandsvertrag standen als `pattern: "\S"` statt
`pattern: "\\S"`. In TypeScript ist `"\S"` schlicht `S`: **das Muster verlangte den Buchstaben S.**
Jedes Etikett, jede Kartenzeile ohne „S" wäre an der Tür abgewiesen worden — „licht", „Gewicht",
„1 Pfund".

Warum es niemandem auffiel: die io-Tests prüfen über `boundedText` im Paketprofil, nicht über
das TypeBox-Schema; der Client-Test rendert nur. **Kein einziger vorhandener Test führte durch
diese Tür.** Erst der Vertragstest im Protokollpaket tat es. Behoben; die alte Fassung 1 war nie
betroffen, ihr Muster stand seit jeher richtig da.

### Belege

- `admininventar.test.ts` **4/4 grün** — die volle Geschichte samt Weitergabe (die Karte behält
  ihr Gesicht auf dem Weg zur Figur) und den drei Verweigerungen.
- `item-contract.test.ts` **6/6 grün** — beide Fassungen durch dieselbe Tür, erfundene Seltenheit
  und Zusatzfelder abgewiesen, Grenzen für Spruch/Art/Zeilen, Fassung 1 unverändert.
- **Gegenprobe gefahren:** `instantiateItem` ohne die `leitung`-Bedingung → der Fall „nur die
  Spielleitung setzt Gegenstände in die Welt" wird rot („promise resolved instead of rejecting").
  Danach zurückgesetzt.
- Kein Regress: `protocol` + `io` + `client` + vier Server-Suiten **414/414 grün**, `typecheck`
  0 Fehler, `gate:boundaries` **426/8/0**, Client-Build grün.

### Offen und ausdrücklich nicht behauptet

Der Vorrat kennt **keine Ordnung**: keine Kisten, keine Sortierung, keine Suche, keine Stapel.
Für zwanzig Karten reicht das, für zweihundert nicht — aber Behälter sind **#10**, und dort ist
auch die echte Lücke benannt (`holder_actor_id` trägt nur Figuren). Und ein Massenanlegen gibt es
nicht: jede Karte wird einzeln in die Welt gesetzt.

## Feature 7 — Würfe erleichtern: der Befund und der Entwurf

**Gemessen, 2026-09-07 18:05.** Drei Dinge, die zuerst geklärt werden mussten:

**1. Das Regelwerk lehnt eine allgemeine Modifikatorformel ausdrücklich ab.** Jede
Fertigkeitsprobe trägt in ihrer Offenlegung den Satz „Ohne Modifikator", und die Adaption sagt
in `manual_ruling` warum: *„keine offizielle allgemeine Modifikatorformel"*. Eine Erleichterung
darf also **keine Regel erfinden** — sonst schreibt die App dem lizenzierten System etwas zu,
das es nicht hat. Was die Adaption stattdessen anbietet, ist die **„Abgesprochene Probe"**:
Endwert und kritische Grenzen werden ausdrücklich festgelegt, und *„Eingaben bleiben im Beleg"*.
Das ist der sanktionierte Weg, und darauf muss eine Erleichterung aufsetzen.

**2. Die Spielleitung kann heute schon jeden Wurf machen.** `listControlledActorIds` gibt der
Leitung alle Figuren; `prepare` prüft nur die Kontrolle über die Figur, nicht die Aktion. Sie
kann also für jede Figur eine „Abgesprochene Probe" mit jedem Endwert würfeln, und
`prepared_by` schreibt mit, **wer** die Zahlen gesetzt hat. Das ist keine Lücke — aber es ist
auch nicht das Feature: **es nimmt der Spielerin die Würfel aus der Hand.**

**3. Auch eine Spielerin kann `manual_ruling` mit Endwert 99 würfeln.** Das ist bewusst kein
Loch: der Wurf allein wirkt nichts (Prägung verlangt die Leitung), und alle Eingaben stehen im
Beleg. Aber es zeigt die eigentliche Lücke scharf: **dass die Spielleitung zugestimmt hat,
steht nirgends.** Eine erleichterte Probe ist heute von einer selbst gesetzten nicht zu
unterscheiden.

### Was Feature 7 also ist

**Die Spielleitung gewährt eine Erleichterung; die Spielerin würfelt sie selbst.** Der Beleg
zeigt danach, wer sie gewährt hat und warum. Kein erfundener Modifikator, keine weggenommenen
Würfel, keine Absprache, die nur mündlich existiert.

### Warum das keine Vollmacht ist (Regel 6)

Eine Vollmacht ist die naheliegende Doppelung — und sie passt nicht:

- **Andere Lebensdauer.** Eine Vollmacht ist „eine Tür für später", mit Ablauf und
  Wochenkontingent. Eine Erleichterung gilt für diesen Moment am Tisch.
- **Anderes Urteil.** Eine Vollmacht urteilt über eine **Schwelle**; deshalb weist
  `assertVollmachtAction` Aktionen mit Ergebnisbändern ausdrücklich ab — eine Schwelle wäre für
  sie bedeutungslos. Eine erleichterte Probe wird von den **Bändern des Pakets** beurteilt.
- **Andere Buchführung.** Eine Vollmacht zählt gegen ein Kontingent, eine Erleichterung nicht.

Beides in eine Tabelle zu zwingen hieße, einen Begriff mit zwei Bedeutungen zu beladen. Das ist
seine eigene Art von Doppelung.

### Das Datenmodell, in endgültiger Form

**`erleichterungen`** — ein einmal einlösbares Zugeständnis:

- Kampagne, Figur, **gemeinte Aktion** (`skill_klettern` — wofür die Erleichterung gilt, für die
  Erzählung), **gewürfelte Aktion** (die sanktionierte `manual_ruling`), und die **abgesprochenen
  Eingaben** als JSON.
- **Grund** — Pflicht. Eine Erleichterung ohne Begründung ist eine Zahl ohne Absprache; genau
  das soll sie ja ersetzen.
- gewährt von / am, eingelöst durch welchen Wurf / wann, widerrufen am.

**Einmalig und ausdrücklich eingelöst:** eine Erleichterung, die zweimal gilt, ist ein
Dauerbonus — und ein Dauerbonus wäre wieder der Modifikator, den das Regelwerk nicht hat.

### Der senkrechte Schnitt

Eine neue Tabelle heißt wieder: Migration, **native Generation 12**, `restoreOrder`,
Löschabdeckung, Domäne samt Berechtigungen, HTTP, dann die Oberfläche. Dieselbe Reihenfolge wie
bei der Kampfbühne, und zwischen Schritt 1 und 3 ist der Baum rot.

### Feature 7 — Stand: Datenschicht steht, Oberfläche fehlt (2026-09-07 18:20)

**Gebaut:** Migration `022_erleichterungen.sql`, native Generation **12** samt Prüfung,
`restoreOrder`, Löschabdeckung, die Domäne `erleichterungen.ts` und — der wichtigste Teil — die
**Einlösung im vorhandenen Wurfpfad**.

**Die Einlösung wurde bewusst nicht als zweiter Wurfweg gebaut.** `prepareAction` bekommt ein
optionales `erleichterungId`; ist es gesetzt, kommen **Aktion und Eingaben aus der Zeile**, nicht
aus der Anfrage. Ein eigener Wurfpfad daneben hätte eine zweite Beleg-, Sitzungs- und
Paketlogik — und die wäre eines Tages auseinandergelaufen.

**Ein Fehler, den nur das Messen gefunden hat.** Alle sechs Tests liefen zunächst in ein
Zeitbudget. Statt es anzuheben, habe ich mit einer Schrittmessung nachgesehen: `gewaehren` hing
**60 Sekunden**, alles davor lief in Millisekunden. Der Grund stand im eigenen Code — innerhalb
der Transaktion fragte ich über `db` statt über `tx`, und bei einer Einzelverbindung wartet eine
Abfrage daneben auf die offene Transaktion, also auf sich selbst. Behoben; danach **7 ms**. Ein
angehobenes Budget hätte den Hänger für immer zugedeckt.

**Belege.** `erleichterungen.test.ts` **6/6 grün**: gewähren und selbst würfeln, die Zahlen aus
der Zeile, einmalige Einlösung, höchstens ein offenes Zugeständnis je Figur und Probe,
Berechtigungen (gewähren/widerrufen/überblicken gehören der Leitung), und die Bindung an die
Figur. **Gegenprobe gefahren:** die Eingaben aus der Anfrage bevorzugen und die Einlösung nicht
festhalten → `target: 99` statt 70, und das Zugeständnis bleibt ewig offen. Danach
zurückgesetzt. Kein Regress: Gameplay-, Export- und Löschsuiten **301/301 grün**, `typecheck`
0 Fehler, `gate:boundaries` **433/8/0**, Client-Build grün. `bundles-v3` fiel unter Parallel-Last
ins Budget und ist **isoliert 6/6 grün** — Last, kein Defekt, kein Budget angehoben.

**Noch nicht da:** HTTP-Route und Oberfläche. Nach Regel 5 bleibt #7 auf „in Arbeit", bis die
Spielleitung eine Erleichterung im Browser gewähren und die Spielerin sie dort einlösen kann.

### Abschluss Feature 7 — 2026-09-07 18:40

**Man kann es jetzt benutzen.** Am Tisch, im Reiter **Aktionen**: die Spielleitung füllt „Eine
Probe erleichtern" aus — Figur, gemeinte Probe, die abgesprochenen Werte und eine **Begründung**
—, und die Spielerin sieht darüber ihrem Wurfformular ein Feld „Dir wurde entgegengekommen" mit
dem Knopf **„Erleichterte Probe würfeln"**.

**Die Eingabefelder zeichnet `RuleFields`** — dieselbe Komponente wie überall sonst. Ein eigenes
Formular für dieselben Felder wäre eine Doppelung, die beim nächsten Feldtyp auseinanderliefe.
Und die Fläche steht bei den **Aktionen**, nicht bei den Vollmachten: eine Vollmacht ist eine Tür
für später, eine Erleichterung gilt für diesen Moment.

**Was abgesprochen ist, steht offen auf der Karte.** Eine Erleichterung ist keine Überraschung;
die Spielerin sieht die Zahlen, bevor sie würfelt, und den Grund dazu.

### Zwei Dinge, die erst der HTTP-Test gezeigt hat

**Die CSRF-Abwehr.** Alle schreibenden Zugriffe antworteten zunächst mit 404. Der Grund steht in
`app.ts` Zeile 62: jeder Nicht-GET braucht einen passenden `Origin`. Das ist kein Fehler, sondern
eine Zusicherung — die vorhandenen HTTP-Tests im Haus machen bezeichnenderweise nur GETs oder
bauen eine eigene, nackte Anwendung. Der Fall steht jetzt ausdrücklich im Test: **eine fremde
Seite darf keine Erleichterung gewähren, auch nicht mit gültigem Sitzungsplätzchen.**

**Ein Stolperstein im eigenen Test.** Der Fall „ohne Herkunft" bestand zunächst nicht, weil
`undefined` als Argument den **Vorgabewert aktiviert** — die Herkunft wurde also doch
mitgeschickt. Jetzt heißt `null` ausdrücklich „ohne Kopf".

### Und der Musterfehler wäre beinahe wieder passiert

Beim Schreiben von `ErleichterungDraft` fiel `\\S` erneut zu `\S` zusammen — genau der Fehler aus
Feature 5. Diesmal sofort an den Zeichen geprüft und korrigiert, **und** in
`item-contract.test.ts` durch einen Fall abgesichert, der die **Wirkung** prüft statt der
Schreibweise: „Seil gesichert" muss durchkommen, obwohl kein großes S darin vorkommt.

### Belege

- `erleichterungen-http.test.ts` **4/4 grün**: die ganze Geste durch die echte Anwendung — die
  Spielerin würfelt selbst, und die **mitgeschickten eigenen Zahlen gelten nicht** (`target 99`
  wird zu 70); Berechtigungen; Zurücknehmen; die Herkunftsprüfung; und eine Begründung aus
  Leerzeichen scheitert schon am Schema.
- `erleichterungen.test.ts` **6/6**, `item-contract.test.ts` **7/7**.
- Kein Regress: `protocol` + `client` + fünf Server-Suiten **182/183**, wobei der eine Fehlschlag
  (`browser-entrypoints-review`) **isoliert 6/6** und das ganze Client-Paket allein **130/130**
  grün ist — Last, kein Defekt. `typecheck` 0 Fehler, `gate:boundaries` **436/8/0**,
  Client-Build grün.

### Offen und ausdrücklich nicht behauptet

Es gibt **keine Erschwernis** — die Liste verlangt Erleichtern, und das Gegenteil zu erfinden
wäre Regelarbeit, die niemand bestellt hat. Eine Erleichterung **läuft nicht ab**: sie gilt, bis
sie eingelöst oder zurückgenommen wird. Und sie erscheint **nicht in der Kampfbühne** — wer
gerade dran ist, sieht sie im Aktionen-Reiter, nicht auf seiner Karte.

## Feature 8 — Alles als eine Datei: geprüft, und dabei einen Regress von mir gefunden

**Der Ledger sagte „prüfen, nicht neu bauen", und das stimmte** — das `.chronicle`-Format steht
inzwischen bei Generation **12**, weil jedes Feature dieser Sitzung seine Tabellen mitgebracht
hat. Zu prüfen war das Wort **„alles"**.

### Was wirklich mitgeht — einschließlich der Bilder

Migration 015 sagt es selbst: *„die Bytes liegen als base64 in der Zeile … ein Dateisystempfad
daneben ist genau die Stelle, an der ein solches Paket unvollständig wird."* Ein Bild liegt also
**im** Paket. Der Test legt ein echtes 1×1-PNG an, exportiert, und findet dessen Base64 im
JSON-Text wieder — und nach der Wiederherstellung liefert der Server exakt dieselben Bytes aus.

### Der Regress, den nur dieser Test gefunden hat

Beim ersten Lauf war er **rot**, und zwar an meiner eigenen Arbeit von Feature 7:

```
audit.action.prepared.erleichterungId: unknown field; explicit migration required
```

Ich hatte die Kennung der Erleichterung in die Nutzlast des Prüfprotokolls geschrieben. Deren
Feldliste ist im **ältesten, eingefrorenen v1-Profil** auf drei Felder festgelegt — mein viertes
Feld hat damit **jeden Export gebrochen, sobald eine Erleichterung eingelöst war.**

Der Fix war nicht, das Profil aufzuweichen, sondern die **Doppelung zu entfernen**: die Verbindung
zwischen Wurf und Zugeständnis steht längst in `erleichterungen.eingeloest_roll_id`. Sie ein
zweites Mal ins Protokoll zu schreiben war überflüssig — und teuer.

**Das ist die Lehre dieses Durchgangs:** die Nutzlast des Prüfprotokolls ist ein eingefrorener
Vertrag. Eine neue Tatsache gehört in ihre eigene Tabelle, nicht nebenbei ins Protokoll.

### Eine echte Bedienlücke, nebenbei geschlossen

Jeder Kampagnenexport hieß `campaign.chronicle`. Wer drei Welten sichert, hatte dreimal denselben
Namen im Ordner und musste sie öffnen, um sie zu unterscheiden. Der Dateiname trägt jetzt den
Namen der Welt — kodiert nach RFC 5987 neben einem ASCII-Rückfall, wie beim Wiki-Export.

### Belege

- `alles-in-einer-datei.test.ts` **4/4 grün**: eine Kampagne mit **allem aus dieser Sitzung** —
  Kampfbühne (eröffnet), Lootkarte mit Kartengesicht im Vorrat, zwei Erleichterungen (eine offen,
  eine eingelöst samt Wurfbeleg), ein Artikel und ein Bild mit Bytes.
  1. Das Paket enthält all diese Zeilen und die Bildbytes.
  2. Es ist **ein** gültiger JSON-Text, der das Base64 des Bildes enthält.
  3. In eine **leere** Datenbank zurückgespielt ergibt der erneute Export **keinen einzigen
     inhaltlichen Unterschied** — und die Welt ist danach benutzbar: die Bühne läuft in Runde 1,
     das offene Zugeständnis steht mit seiner Begründung da, das Bild kommt Byte für Byte zurück.
  4. Die Datei heißt nach der Welt.
- Kein Regress: Gameplay-, Bündel-, `io`- und Löschsuiten **48 + 269 + 24 grün**, `typecheck`
  0 Fehler, `gate:boundaries` **437/8/0**, Client-Build grün.

### Offen und ausdrücklich nicht behauptet

Der Export ist **die Sicht der Spielleitung auf ihre Kampagne** — Zugangsdaten gehen bewusst
nicht mit (`credentials` bleibt beim Wiederherstellen leer, das prüft `bundles-v6` seit jeher).
Es gibt **keine Wiederherstellung über die Oberfläche**: zurückgespielt wird mit Serverwerkzeug,
nicht per Knopf. Und exportiert wird **eine Kampagne**, nicht mehrere auf einmal.

## Feature 9 — Speicherstats: die Frage, die der Vorrat nicht beantwortet

**Zuerst die Abgrenzung zu #6, sonst wäre es eine Doppelung.** Feature 6 ist das *Erstellen und
Halten* von Lootkarten — geprüft und belegt. Feature 9 ist etwas anderes, und die Lücke steht
wörtlich im Code: wenn die Spielleitung den Vorrat öffnet, holt die Oberfläche **alle**
Gegenstände der Kampagne (`/items`) und **wirft dann alles weg, was schon vergeben ist**
(`filter(i => i.holderActorId === holder)`). Die Spielleitung sieht den Tresor oder eine einzelne
Figur — **nie, wo der Loot eigentlich ist.**

### Eine Ableitung, keine zweite Quelle

Der Speicherstand rechnet aus genau der Liste, die ohnehin schon geholt wurde. **Bewusst keine
zweite Abfrage und keine Aggregation auf dem Server:** dieselben Zahlen an zwei Orten
auszurechnen heißt, sie irgendwann verschieden auszurechnen. `speicherstats()` ist deshalb eine
reine Funktion — und genau deshalb prüfbar.

**Karten und Stücke sind zwei Zahlen.** Zwanzig Pfeile sind *ein* Eintrag im Inventar und
*zwanzig* Stücke im Bestand; beides zusammenzuwerfen macht die Übersicht falsch, sobald jemand
Verbrauchsgut führt. **Archiviertes zählt nicht mit** — es im Bestand zu führen hieße, Vorrat zu
versprechen, den es nicht mehr gibt. Und die Beschriftung kommt aus der **jüngsten** Revision,
während ältere Stücke trotzdem unter derselben Vorlage mitzählen.

### Was man jetzt sieht

Im „Vorrat der Spielleitung" steht über den Karten eine Tafel: Summen oben (Vorlagen, Karten,
Stücke, davon im Vorrat und vergeben), darunter je Karte, wie viel im Tresor liegt und **bei wem
der Rest ist** — nach Namen sortiert, damit dieselbe Runde immer dieselbe Reihenfolge sieht.

### Ein Versäumnis aus dem vorigen Durchgang, hier gefunden

`alles-in-einer-datei.test.ts` hatte einen **Typfehler**: die Testkonfiguration ohne
`bootstrapToken` genügte `AppConfig` nicht. Zur Laufzeit lief der Test, der Typecheck nicht — und
ich hatte nach der letzten Ergänzung nur Build und Grenzen laufen lassen, **nicht** `typecheck`.
Behoben. Regel 8 im Kopf dieses Dokuments nennt jetzt beide Befehle ausdrücklich.

### Belege

- `speicherstats.test.ts` **7/7 grün**: Karten und Stücke getrennt, Verbleib je Figur samt
  Sortierung, Archiviertes außen vor, Vorlagen nach Namen und nur einmal, Beschriftung aus der
  jüngsten Revision, unbekannte Figur wird benannt statt verschwiegen, leerer Bestand.
- **Gegenprobe gefahren:** Archivfilter entfernt und Menge auf 1 festgenagelt → genau die
  zugehörigen Fälle rot. Danach zurückgesetzt.
- Kein Regress: `packages/client` **137/137**, `admininventar` + `actors` **17/17**,
  `alles-in-einer-datei` **4/4**, `typecheck` 0 Fehler, `gate:boundaries` **439/8/0**,
  Client-Build grün.

### Offen und ausdrücklich nicht behauptet

Der Speicherstand ist eine **Übersicht, kein Werkzeug**: man kann darin nichts anklicken, nichts
verschieben und nichts filtern. Wer etwas umverteilen will, nimmt die Karte darunter. Und er
zählt, was **in der Kampagne existiert** — nicht, was einmal existiert hat: archivierte Stücke
und die Geschichte ihrer Übergaben stehen im Ereignisprotokoll, nicht hier.

## Feature 10 — Containerinventare: meine eigene Notiz war falsch

**Korrektur.** Im Ledger stand bei #10: *„`holder_actor_id` trägt heute nur Figuren — hier liegt
die echte Lücke."* Das war zu pessimistisch. `actor_profiles.kind` kennt seit Migration 010 die
Art **`vehicle`** — in der Oberfläche „Fahrzeug" —, und `holder_actor_id` trägt sie wie jede
andere Figur. **Eine Kutsche ist in diesem Modell längst möglich.**

Und das ist keine Notlösung, sondern richtig: ein Behälter *ist* ein Ding in der Welt, das Dinge
hält, genau wie eine Kreatur oder eine Begleitung. Eine eigene Behältertabelle wäre eine
Doppelung — und die Figurenarten stehen im **eingefrorenen** Exportprofil
(`campaign-bundle-v2.ts`), eine neue Art bräche jeden Export. Dieselbe Lehre wie bei Feature 5
und 8.

### Was also fehlte

Nicht das Modell, sondern der **Weg dorthin**. Ein Behälterinventar erreichte man nur über die
Auswahl **„Handelnde Figur"** am Tisch — und eine Kutsche handelt nicht. Dazu kam eine stille
Sperre: der Knopf „Gegenstand hinzufügen" fragte die *handelnde* Figur ab und hätte beim Blättern
in einem Behälter fälschlich blockiert.

### Was jetzt da ist

Eine **Inventarauswahl** in der Kopfzeile des Inventars, mit drei Gruppen: *Vorrat der
Spielleitung*, *Figuren*, und *Behälter und Begleitung* (Fahrzeuge sind als solche gekennzeichnet).
Wer die Kutsche nicht führt, sieht sie dort **gar nicht erst** — die Liste zeigt nur, was der
Zugang ohnehin hergibt. Gelegt wird in das Inventar, das gerade offen ist; die Spielleitung kann
Beute also direkt in die Kutsche legen.

Wechselt die handelnde Figur am Tisch, folgt das Inventar — danach darf man frei blättern.

### Belege

- `containerinventar.test.ts` **4/4 grün**: der Behälter trägt Loot, den **nur die Spielleitung
  sieht, solange niemand die Kutsche führt**; er öffnet sich, sobald sie freigegeben wird (und
  die Runde kann darin wirtschaften); der Loot kommt wieder heraus und die Karte behält ihr
  Gesicht; und **mehrere Behälter vermischen sich nicht** — das ist „verschiedene Inventare".
- **Gegenprobe gefahren:** die Zugangsprüfung in `listItems` entfernt → der Fall „nur die
  Spielleitung sieht hinein" wird rot („promise resolved instead of rejecting"). Danach
  zurückgesetzt.
- Kein Regress: `packages/client` + `containerinventar` + `admininventar` + `actors`
  **158/158 grün**, `typecheck` 0 Fehler, `gate:boundaries` **440/8/0**, Client-Build grün.

### Offen und ausdrücklich nicht behauptet

Ein Behälter hat **keine Kapazität** — kein Gewicht, kein Platzlimit, kein „die Kutsche ist voll".
Behälter **liegen nicht ineinander**: eine Truhe in der Kutsche ist heute zwei Inventare
nebeneinander, keine Schachtelung. Und ein Behälter wird wie jede Figur angelegt, also über eine
Figurvorlage mit Regelpaket-Bindung — für eine Kutsche ist das mehr Zeremonie als nötig, aber es
ist derselbe Weg, den alles andere geht, und ein zweiter wäre die Doppelung.
