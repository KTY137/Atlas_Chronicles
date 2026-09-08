# Server- und Datenreview, 2026-09-08

Arbeitsbasis: `experimental/featureliste-20260907`, Ausgangscommit `9086cdb`.
Diese Review arbeitet ausschließlich im experimentellen Worktree. Keine Produktionsdaten,
keine Commits und keine Änderungen an eingefrorenen Profilen oder angewandten Migrationen.

## Ergebnis

Acht konkrete Fehler behoben. Neun neue Regressionstests wurden vor dem jeweiligen Fix rot
beobachtet; ein weiterer Test prüft die geänderte HTTP-Grenze. Die betroffenen Tests und die
geprüften Konsumenten sind grün. Die Prüfung ist eine gezielte Code- und Vertragsreview,
keine Behauptung vollständiger Fehlerfreiheit aller Servermodule.

| Befund | Schwere | Auslöser und vorheriges Verhalten | Änderung |
| --- | --- | --- | --- |
| Export wählt den falschen Leser | Hoch | Eine NPC-Vorlage mit Beutetabelle oder eine Lootkarte unter den Standardregeln, ohne zusätzliche Module: Der aktuelle Export wählte v4 und scheiterte an `definition.beute` bzw. `definition.spruch: unknown field; explicit migration required`. | `packages/io/src/native-v5/current.ts` berücksichtigt auch gespeicherte v2-Figuren- und Gegenstandsvorlagen bei der Wahl des vorhandenen v5-Profils. Alte Konstruktoren bleiben streng. |
| Beutemenge rückwärts | Hoch | Eine Vorlage mit `menge: [5, 2]` wurde unveränderlich gespeichert; der native Export lehnt diese Spanne ab. | `packages/server/src/domain/actors.ts` prüft die Reihenfolge vor dem Schreiben einer Revision. |
| Beuteverweis ohne Ziel | Hoch | Ein unbekanntes, fremdes oder nicht vorhandenes Vorlagenrevision-Ziel wurde gespeichert. Die Figur scheiterte erst beim tatsächlichen Auswürfeln; der Export scheitert unabhängig vom Würfelergebnis. | Derselbe Definitionsweg prüft die genannte Gegenstandsvorlage und Revision innerhalb der Kampagne, bei Anlage und Überarbeitung. |
| Geldbestand ohne Währung | Hoch | Der Geldbefehl nahm Beträge an, bevor die Spielleitung die Einheit benannt hatte. Das native v13-Profil verweigert solche Kampagnen. | `packages/server/src/domain/geld.ts` weist den Schreibversuch als Konflikt zurück und erhält den leeren Zustand bei Version 0. |
| Bild nach Rücknahme weiter abrufbar | Mittel | Eine freigegebene Bildpassage wurde entfernt. Die Chronik nahm das Wissen zurück, die Bildroute las aber nur die historische Revelation und lieferte weiterhin Bytes. | `packages/server/src/domain/wiki-medien.ts` verwendet die wirksamen Passage-Identitäten derselben Wissensableitung wie der Artikel und verlangt eine lebende Passage, die dieses Bild noch zeigt. Der Inventarzugriff bleibt bestehen. |
| Runde beim Entfernen nicht gezählt | Mittel | Die aktive letzte Figur der Initiativreihenfolge wird entfernt. Der Zug sprang an den Anfang, die Runde blieb unverändert. | `packages/server/src/domain/kampfbuehne.ts` zählt den tatsächlichen Umlauf wie beim regulären Zugwechsel. |
| Nachbesetzte Bühne ohne Zug | Mittel | Alle Figuren einer laufenden Bühne werden entfernt, danach wird eine neue hinzugefügt. Niemand war am Zug, und weder Eröffnen noch Weiterschalten konnte die Bühne fortsetzen. | Die erste Figur einer wieder besetzten laufenden Bühne erhält den Zug. |
| Alter Zug wird in neuer Runde erneut angenommen | Mittel | Ein verspäteter Doppelklick traf dieselbe Figur in einer späteren Runde; bei einer einzigen Figur sofort. Die Kennung allein unterschied die beiden Züge nicht. | Domain und HTTP verlangen Figur und erwartete `runde`; alle Bühnenmutationen sperren die gemeinsame Kampfzeile vor dem Lesen. |

## Vertragsänderung am Zugwechsel

`POST /api/campaigns/:campaignId/kaempfe/:kampfId/zug` verlangt jetzt
`{ "von": "teilnehmer-id", "runde": 1 }`. Die Runde ist eine positive Ganzzahl.
Domain: `naechsterZug(userId, campaignId, kampfId, von, runde)`.
Der Client-Verantwortliche wurde über den Root koordiniert. In dieser Teilreview wurden keine
Clientdateien geändert. Der HTTP-Test prüft fehlende Runde = 400, gültiger Zug = 200,
veralteter Zug = 409.

## Belege

Alle Vitest-Aufrufe liefen mit `--maxWorkers=1`; die vollständige Testsuite und `npm run gate`
wurden nicht ausgeführt.

1. Erste Gegenprobe: `geld`, `npc-beute`, `kampfbuehne`, auf die neuen Fälle eingeschränkt:
   **5 fehlgeschlagen, 21 übersprungen**, 31,51 s. Beobachtet: angenommene ungültige Daten,
   Runde 1 statt 2, kein aktiver Teilnehmer statt B.
2. Zweite Gegenprobe: `wiki-medien`, `admininventar`, auf die neuen Fälle eingeschränkt:
   **2 fehlgeschlagen, 12 übersprungen**, 15,28 s. Beobachtet: Bildbytes trotz pensionierter
   Passage; Exportfehler `definition.spruch`. Der NPC-Exportfehler `definition.beute` trat
   zusätzlich in der ersten vollständigen Folgesuite auf und führte zur Profilwahlkorrektur.
3. Zugwiederholung vor Fix: **2 fehlgeschlagen, 11 übersprungen**, 5,98 s. Beide alten
   Zuganfragen wurden angenommen.
4. Betroffene Servermodule nach den Datenkorrekturen: `npc-beute`, `geld`, `kampfbuehne`,
   `admininventar`, `wiki-medien`, `bild-hochladen`, `alles-in-einer-datei`:
   **59/59**, 64,10 s. Enthält Wiederherstellung der Lootkarte ohne v2-Regelpaket und den
   bestehenden Rundlauf der Kampagne einschließlich echter Bildbytes.
5. Nach Erweiterung des Zugvertrags: `kampfbuehne` (**14/14**), `actors` (13),
   `containerinventar` (4), `kampf` (2), `htbah-gameplay` (15), `erleichterungen` (6),
   `chronist` (4): **58/58**, 61,53 s.
6. Native v5, unabhängige v5-Review, v6, Lootkarten, Wiki-Markdown sowie `rules`, `core`,
   `chronik`, `projection`, `protocol`: **208/208 in 13 Dateien**, 22,91 s.
7. `git diff --check -- packages/server packages/io`: grün.
8. `npm.cmd run typecheck`: grün, Exitcode 0 nach sämtlichen Serveränderungen.

Die drei grünen Testläufe ergeben 325 Testausführungen; wegen des erneut geprüften
Bühnenmoduls sind es **314 unterschiedliche Tests in 26 Dateien**.
Root verantwortet den abschließenden gemeinsamen Client-Build.

## Geprüfte Flächen und Grenzen

Codeinspektion: Figuren-/Gegenstandsrechte und custody-Befehle, Beutetabellen, Kartenbilder,
Vitalwertauswertung und Niederlage, Kampfbühne, Geld, Erleichterungen, effektives
Chronikwissen, Bildzugriff, Chronist-Eingabe, native Profilwahl, Export-/Restore-Reihenfolge,
Löschreihenfolge, kanonisches JSON und projizierter Markdown-Export. Die gezielten Suites
prüfen insbesondere bestehende Autoritätsgrenzen und eingefrorene Leser neben den neuen Fällen.

`TEST_DATABASE_URL` war nicht gesetzt. Die Datenbanktests liefen gegen PGlite; echte
PostgreSQL-Parallelität ist damit nicht nachgewiesen. Die neue Kampfsperre verwendet die
bereits unterstützte `FOR UPDATE`-Grenze. Eine umfassende Konkurrenzprüfung sämtlicher
neuer Domänen bleibt zusätzliche Arbeit, insbesondere gleichzeitiges erstmaliges Anlegen
eines Geldstands und gleichzeitiges Bildlöschen/Vorlagenanlegen.

Vorhandene operative Kampagnen wurden nicht verändert oder auf historische ungültige
Beutetabellen geprüft. Die Zulassungsprüfungen verhindern neue fehlerhafte Revisionen;
sie schreiben keine unveränderliche Historie um. Ein bereits vorhandener Geldbestand ohne
Einheit lässt sich über den vorhandenen GM-Befehl durch Benennen der Einheit wieder
exportierbar machen. Die neue Profilwahl hilft bestehenden gültigen v2-Vorlagen unmittelbar.

## Unabhängige GUI-Integrationsprüfung

Nach dem Datenreview folgte eine begrenzte Gegenprüfung der neuen Navigation und ihrer
Editorgrenzen: App, Heute, TableView, Navigation/URL-Helfer, Shell-CSS, ForgeWorkbench,
ActorWorkbench, WikiMedien sowie die Effektgrenze von `tools/review/workflow.py`.
Keine zusätzliche belegte Rechte- oder Wissensverletzung wurde dabei gefunden.
Die Prüfung ersetzt weder den Browserdurchlauf des Root noch eine vollständige GUI-Audit.

| Befund | Schwere | Konkreter Ablauf und Auswirkung | Verantwortung |
| --- | --- | --- | --- |
| Figurenwechsel lässt verworfenen Entwurf stehen | Mittel | Am Tisch unter Figuren & Inventar einen Instanznamen eingeben, die handelnde Figur wechseln und das Verwerfen bestätigen. Der ungekoppelte Workbench-Zustand behält den Text, während der übergeordnete Dirty-Guard zurückgesetzt wird. Die nächste Navigation kann den weiterhin sichtbaren Entwurf ohne Rückfrage verlieren. | Behoben durch Root: ActorWorkbench wird bei Wechsel der actorId neu eingebunden. |
| Älterer Dashboard-Aufruf überstimmt Vollmacht | Mittel | Heute → Kampf öffnen → Szenen → Artikel → dessen Vollmacht öffnen. App reicht neben der neuen Vollmacht die alte Kampftab-Anforderung weiter; TableView zeigt Kampf, obwohl die URL Vollmachten verlangt. | Behoben durch Root: App leert die alte Tab-Anforderung beim Öffnen von Artikel, Brief und Vollmacht; TableView priorisiert die ausdrückliche Vollmacht. |
| Geldeditor erlaubt Befehl ohne Währungseinheit | Mittel | Vor dem Benennen der Einheit ist das neue Geldformular bedienbar. Der durch den Datenreview korrekt strengere Server weist Speichern zurück, während die Oberfläche eine unspezifische Konfliktmeldung zeigt. | Root hat Formular und gezielten Gameplay-Test angepasst; gemeldet: 11/11 grün. |

`packages/client/test/navigation-integration-review.test.ts` führt für die ersten beiden
Befunde den echten TableView, ActorWorkbench und dessen Erstellungsformular zusammen aus,
einschließlich Hook-Zustand, Schlüsselwechsel, Effekt-Cleanup und echtem URL-Helfer.
Unbeteiligte Unteransichten bleiben Stub-Grenzen; es ist kein vollständiger React-DOM-Test.
Vor den Reparaturen: **2/2 gezielt rot**, 0,91 s. Beobachtet wurden der erhaltene Text
`Unsaved guard` und der ausgewählte Tab `Kampf` statt `Vollmachten`.
Aufruf: `npx.cmd vitest run packages/client/test/navigation-integration-review.test.ts --maxWorkers=1`.
Nach den Reparaturen bestätigte Root **13/13 grün** für diese beiden Fälle zusammen mit
`gameplay-drafts-review.test.ts`. Es bleiben keine offenen Befunde aus diesem Angriffspass.
