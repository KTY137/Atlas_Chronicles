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

## Stand der Liste

Legende: ☐ offen · ◐ in Arbeit · ☑ grün und belegt

| # | Feature | Stand | Notiz |
| --- | --- | --- | --- |
| 1 | Kampfsystem (testen) | ☑ | grün und belegt, siehe unten |
| 2 | Kampfbühne (wie bei Card Games) | ☐ | |
| 3 | Würfel animiert | ☐ | |
| 4 | Wiki-Export | ☐ | |
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
