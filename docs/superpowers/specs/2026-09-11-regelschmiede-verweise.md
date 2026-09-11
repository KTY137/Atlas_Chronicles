<!-- SPDX-License-Identifier: BUSL-1.1 -->
<!-- Copyright (c) 2026 Kaya Yesilyurt - Atlas Chronicles. Siehe LICENSE. -->
# Regelschmiede — Kennungen und Vorstufen sicher bearbeiten

Fortsetzung von ChronicleHeroes 2.0, Stand 2026-09-11. Ausgangspunkt:
`245f78d1b42b7cf23400b585030f641e88d6149e` auf `main`, einschließlich Claudes fünf
ChronicleHeroes-Commits bis `ea923e1` und des Expeditionspakets aus PR #5.

## Befund und Entscheidung

Der Fähigkeiten-Editor änderte Kennungen direkt bei jedem Tastendruck. Vorstufen,
Vorgaben und Pakettests behielten die alte Kennung. Beim Löschen wurde die Kennung
hingegen still aus den Vorstufen anderer Fähigkeiten entfernt. Dadurch änderte sich
die Lernbedingung einer anderen Fähigkeit ohne ausdrückliche Entscheidung.

Kennungsänderungen werden nun ausdrücklich übernommen. Die reine Funktion
`renameRuleEntry` aktualisiert im selben Entwurf die erklärten Kennungslisten:
Vorstufen, Bogen-Vorgaben, Einsatz-Vorgaben von Aktionen, Kontexte aller Pakettests
(auch ausgeblendeter) und Textvorgaben in `add`-Umstellungsschritten. Sie ersetzt
nur ganze Listeneinträge und erhält Reihenfolge und Leerraum. Doppelte/reservierte
Kennungen und überschrittene Zeichengrenzen lehnen die Änderung als Ganzes ab.

Löschen bleibt gesperrt, solange solche Verweise bestehen. Die Oberfläche nennt
die betroffenen Einträge. Sie löscht weder abhängige Fähigkeiten noch deren
Vorstufen. Die Auswahl neuer Vorstufen schließt direkte und transitive Kreise aus;
sie terminiert auch bei einem bereits fehlerhaften importierten Kreis und bleibt
auf vier Vorstufen begrenzt.

## Bewusste Grenze

Geändert wird ausschließlich ein Regelentwurf. Installierte Pakete, Figuren,
Sicherungen und Wurfquittungen werden nicht umgeschrieben. Freie Texte und Formeln
werden ebenfalls nicht blind ersetzt. Wer darin Kennungen als Text vergleicht,
muss diese Formeln ausdrücklich prüfen. Dies ist keine automatische Migration
bereits gespielter Kampagnen und keine neue Engine-Regel gegen importierte Kreise.
Schema-Version, Engine-Version, Wurfauswertung und die 200 Fähigkeiten bleiben gleich.

## Nachweis und offene Übergabe

26 reine Regressionstests wurden lokal mit Node 22 ausgeführt; dabei wurde nur
der Vitest-Import durch `node:test` ersetzt, die Tests und Produktivfunktionen
blieben gleich. Zwei weitere Tests prüfen auf GitHub den Export nach einer
Umbenennung im echten ChronicleHeroes-Paket. Das Klartext-Gate umfasst beide
neuen Quelldateien; P13 enthält die neuen englischen Oberflächentexte.

Der zusätzliche Workflow `regelwerk` führt Typprüfung, Sprach-/Grenzprüfung und
Regel-/Regelschmiede-Tests unabhängig voneinander aus. Das bestehende Gesamtgate
wird nicht verändert oder abgeschwächt. Die tatsächlich beobachteten CI-Ergebnisse
werden im Pull Request dokumentiert; diese Datei behauptet keinen grünen Gesamtlauf.

Aus der Übergabe weiter offen: Windows-Desktop-Smoke nach dem Timing-Fix,
Durchklicken von Lernen/Einsetzen in der echten App, der Serverfall
`actor-projection.test.ts` und die auf dem Ausgangsstand dokumentierten 41
Beutekarten-Reproduktionsabweichungen. Kein Installer und kein Release erstellt.
