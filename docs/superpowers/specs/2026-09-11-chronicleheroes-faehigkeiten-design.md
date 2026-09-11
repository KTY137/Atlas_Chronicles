<!-- SPDX-License-Identifier: BUSL-1.1 -->
<!-- Copyright (c) 2026 Kaya Yesilyurt - Atlas Chronicles. Siehe LICENSE. -->
# ChronicleHeroes 2.0 — Fähigkeiten, Zustände, Aufstieg

Stand 2026-09-11, von Kaya freigegeben („ja passt pushe durch"). Offene Entscheidungen hat Kaya für
die Regelschmiede delegiert (2026-09-08): die allgemeinere Variante, hier begründet, im Nachhinein kippbar.

## Ziel

Ein tiefes Regelwerk, so einfach zu spielen wie ein Einsteigersystem: der Kern bleibt ein Satz
(W100 drunter, Fertigkeit plus Talent), die Tiefe kommt aus 200 Fähigkeiten, 12 Zuständen, Aufstieg
und optionalen Archetypen. Eigene Regeln und eigener Text; nichts aus How To Be A Hero (CC BY-NC-SA).

## Regeln (Inhalt, Schritt 2)

- **Kern unverändert:** Felder Körper/Geist/Herz, Fertigkeiten 0–100, Talent, Lebenskraft, Rüstung,
  Funken, Schaden, Initiative, abgesprochene Probe.
- **200 Fähigkeiten:** je 60 für Körper, Geist, Herz, 20 allgemeine. Jede: Name, Gruppe, Rang 1–3,
  Art (*dauerhaft* wirkt immer · *Einsatz* wählt man beim Wurf · *Reaktion* wie Einsatz, außerhalb
  des eigenen Zugs), Funkenkosten 0–2 (Hinweis, abgehakt wird von Hand), Preis in Erfahrung
  (Rang 1: 3, Rang 2: 5, Rang 3: 8), Vorstufe, Voraussetzung (Fertigkeit oder Talent), ein Satz
  Wirkung, maschinenlesbar als Modifikator.
- **12 Zustände**, jeder mit einer einfachen Wirkung auf Proben, Schaden oder Initiative.
- **Aufstieg:** Erfahrung vergibt die Spielleitung (1–3 je Abend). Auf Fertigkeiten gelegte
  Erfahrung gibt je 5 Punkte; Fähigkeiten kosten ihren Preis. Start: 360 Punkte und 9 Erfahrung
  für Fähigkeiten (drei vom Rang 1).
- **12 Archetypen:** optionale Startpakete aus Fertigkeitsauswahl und drei Rang-1-Fähigkeiten.

## Engine (Schritt 1) — allgemein, nicht ChronicleHeroes-eigen

**Entscheidung: Schema bleibt 2, drei optionale Bausteine.** Eine neue Formatstufe hätte Export,
Sicherung und Nachweise gezwungen, eine neue Versionszahl zu tragen; ein Paket ohne die Bausteine
ist byteidentisch mit heute, Prüfsummen und alte Quittungen bleiben gültig.

- `abilityRules { abilityField, conditionField?, budget? }` — zwei erklärte Textfelder des Pakets
  halten die gelernten Fähigkeiten und aktiven Zustände als Kennungsliste („a, b, c"). **Entscheidung:**
  keine neue Feldart; Bogenfelder bleiben Einzelwerte, Protokoll und Bogenspeicher bleiben unverändert.
  `budget` ist ein deterministischer Zahlenausdruck; die Summe der Preise darf ihn nicht übersteigen.
- `abilities[]` (≤ 512): `id, name, group, rank 1..3, kind dauerhaft|einsatz|reaktion, cost 0..9,
  price 0..99, requires? (≤ 4 Kennungen), prerequisite? (Wahrheitsausdruck), text ≤ 600, modifiers? (≤ 4)`.
- `conditions[]` (≤ 32): `id, name, text, modifiers?`.
- Modifikator: `{ actions: [Kennung | Präfix*] (≤ 16), target: "ziel" | "ergebnis", value }`,
  `value` deterministischer Zahlenausdruck über Bogenfelder.

**Entscheidung: die Formelsprache bleibt unverändert.** Quittungen tragen `engineVersion`, und das
Nachrechnen verlangt Gleichheit; neue Formelfunktionen hätten alte Würfe entwertet. Stattdessen
rechnet die Engine vor dem Wurf die Summe der passenden Modifikatoren aus und setzt sie in die
Parameter `input.mod_ziel` und `input.mod_ergebnis`, die eine Aktion dafür erklärt. Vom Menschen
übergebene Werte werden überschrieben; aus dem Bereich des Parameters wird geklemmt. Die Aktion
entscheidet selbst, wo die Zahl wirkt (Schwelle, Schaden, Initiative).

- Es wirken: aktive Zustände, gelernte *dauerhafte* Fähigkeiten, und die im Parameter `einsatz`
  gewählten *Einsatz*-/*Reaktions*-Fähigkeiten (müssen gelernt sein).
- Die Quittung trägt `modifiers: [{ source, id, target, value }]` — nur bei Paketen mit `abilityRules`.
- Bogenprüfung (bei jedem Lesen, wie die Constraints): Kennungen bekannt und eindeutig, Vorstufen
  gelernt, Voraussetzungen erfüllt, Preis ≤ Budget.
- `abilityOverview(package, fields)` liefert gelernt, aktiv, ausgegeben, Budget und was jetzt lernbar ist.
- Paketprüfung: Felder vorhanden und Text, Vorstufen bekannt, jede exakt genannte oder per Präfix
  getroffene Aktion erklärt den Ziel-Parameter, keine Würfel in deklarativen Ausdrücken.

## Oberfläche (Schritt 3)

Bogen-Abschnitt „Fähigkeiten" (gelernt, Suche, Lernen mit Voraussetzungsprüfung, Budget), Zustände
zum Anhaken, am Tisch die passenden Einsatz-Fähigkeiten als Häkchen; `einsatz`/`mod_*` erscheinen
nie als freie Eingabe. Regelschmiede: Reiter „Fähigkeiten" und „Zustände". Archetyp beim Anlegen.

## Prüfung

Schritt 1: Engine-Tests (Wirkung, Einsatz nur gewählt, Zustände, keine Fälschung von `mod_*`,
Bogenprüfung, Nachrechnen, Paketprüfung, Übersicht). Schritt 2: Anzahlen, jede Voraussetzung mit
gültigem Bogen erreichbar, jede Wirkung auswertbar, kein fremder Regeltext. Schritt 3: Client-Tests,
Desktop-Smoke mit Fähigkeit am Tisch.
