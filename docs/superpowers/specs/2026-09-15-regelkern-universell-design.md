# Regelkern: Fähigkeitsprofil, 3W20-Qualitätsstufen, Migrationsgrenzen, Wegweiser — 2026-09-15

Auftrag (Kaya, 2026-09-15): die Architekturskizze „Host besitzt das Regelwerk, die GUI rendert
das gelieferte Regelmodell“ umsetzen, dazu drei konkrete Punkte: der Abbruch der
Charaktererstellung lässt Felder unbedienbar zurück, aus der Regelkarte muss man herauszoomen
können, und die Erstellung eines Regelwerks ist undurchsichtig. Codex hatte zwischen dem
13. und 14. September bereits den Großteil der Architektur geliefert (siehe
`docs/iterations/2026-09-14-universal-rules-completion.md`). Diese Spec hält fest, was davon
geprüft wurde, was noch fehlte, und welche Entscheidungen ohne Rückfrage getroffen wurden
(Kayas Regel: die allgemeinste Variante wählen, sichtbar protokollieren).

## 1. Review der Codex-Lieferung (8c8495b..f29d7a9)

Drei unabhängige Reviews (Regelpaket, Client, Server) plus gezielte Testläufe.

| Bereich | Befund | Umgang |
| --- | --- | --- |
| `universal-reference.ts` | `lore_check` würfelte zweimal gegen `cleverness` statt gegen drei Attribute | behoben (`charisma` als drittes) |
| `package-v2.ts` | Ein Textfeld durfte gleichzeitig Fähigkeitsliste und Sammlungsspeicher sein; der Fehler wäre erst am ersten echten Bogen aufgetreten | Parser lehnt das jetzt ab, Regression in `presentation-v3.test.ts` |
| `HostRuleFields.tsx` | „Der Host prüft …“ ist Fachjargon in der Oberfläche | „Das Regelwerk prüft …“ |
| `ActorTemplatesHost.tsx` | „Lade die Vorlage erneut …“ hing an jedem Fehler, nicht nur am Konflikt | nur bei HTTP 409 |
| `how-to-be-a-hero.test.ts` | zwei Tests zielten auf Version 1.2.0, die HTBAH inzwischen selbst trägt | Tests auf 1.3.0 |
| Server (Rollen, Pins, Hash, Transaktionen, Fehlertexte) | keine Befunde | — |

Bindend bleibt: Regelpakete sind unveränderlich, versioniert, inhaltsgehasht; Vorlagen pinnen
ihr Paket; der Client wertet keine Regel selbst aus (Sichtbarkeit, abgeleitete Werte, Proben
kommen aus der Vorschau des Hosts).

## 2. Abbruch der Charaktererstellung

Sieben Abbruchwege wurden im echten Browser mit Demo- und ChronicleHeroes-Paket nachgestellt
(`e2e/actor-template-abort.spec.ts`, `e2e/actor-template-abort-chronicle.spec.ts`): Verwerfen,
„Neue Figurvorlage“, abgebrochener Bestätigungsdialog, Wechsel zu „Figur erschaffen“ und zurück,
Bereichswechsel, Revision öffnen und zurück, Spielerantrag abbrechen und neu beginnen. Das
Ergebnis steht in `STATUS.md`. Unabhängig vom Reproduktionsergebnis wird die vom Client-Review
gefundene Strukturschwäche behoben: Der Knopf, der aus einem hängenden Speichern herausführt,
darf nicht selbst am Sperrzustand des Speicherns hängen, und ein Speichern muss ein Zeitlimit
haben, damit `busy` nicht unbegrenzt gesetzt bleibt.

## 3. Fähigkeitsprofil des Regelwerks (Capabilities)

Entscheidung: **abgeleitet, nicht deklariert.** Ein deklarierter `capabilities`-Block könnte
lügen und wäre eine Formatänderung (Bytegleichheit installierter Pakete, Migration). Stattdessen
liefert `describeRuleCapabilities(pkg)` im Regelpaket eine berechnete Beschreibung, und das
Laufzeit-Manifest trägt sie als `capabilities` mit. Die Oberfläche fragt „Hat dieses Regelwerk
Fähigkeiten? Balken? Sammlungen? Abgestufte Ergebnisse? Mehrwurf-Proben?“ statt „Ist das D&D?“.

Felder: `attributes`, `computed`, `constraints`, `vitals`, `collections`, `abilities`,
`conditions`, `actions`, `gradedOutcomes`, `multiRollChecks`, `diceFamilies` (z. B. `W20`,
`W100`), `presentationTree`, `migrations`, `selfTests`. Jede Zahl ist eine Anzahl, jedes
Ja/Nein ein Merkmal. Die Regelwerkstatt zeigt daraus die Karte „Was dieses Regelwerk kann“ in
Alltagsdeutsch.

## 4. 3W20-Referenz mit Qualitätsstufen (DSA5-artiger Prototyp)

Das 3W20-Referenzpaket (eigene Attribute, keine DSA-Inhalte) bekommt sechs Qualitätsstufen als
geordnete Ergebnisbereiche: übrige Talentpunkte 0–3 → Stufe 1, 4–6 → 2, 7–9 → 3, 10–12 → 4,
13–15 → 5, ab 16 → 6; ist der Überschuss größer als der Talentwert, misslingt die Probe. Das
beweist, dass eine Mehrwurf-Probe mit Ausgleich und abgestuftem Ergebnis ohne Sonderauswerter
ausgedrückt wird. Version 1.1.0 → 1.2.0, Migrationswege von 1.0.0 und 1.1.0.

Bekannte Lücke, bewusst offen: „zwei Einsen = kritischer Erfolg, zwei Zwanziger = Patzer“
braucht Einsicht in einzelne Würfel. Die Formelsprache kennt keine Zählung einzelner
Würfelergebnisse. Das ist die nächste Engine-Primitive (Arbeitstitel `zaehle(1d20, == 1)`), nicht
Teil dieses Pakets.

## 5. Migrationsgrenzen

Unveränderliche Schicht (Änderung nur mit neuem Schema und explizitem Migrationsweg):
Paketformat `schemaVersion 2`, Präsentationsschema 3, Laufzeitvertrag `RULE_RUNTIME_CONTRACT`,
Inhaltshash-Dialekt (`stableJson` + SHA-256), Pin-Semantik (Vorlage → Paket@Version), Beute- und
Inventarmodell. Regeln: (a) Schema 2 darf nur additiv wachsen, neue Bausteine sind optional und
Pakete ohne sie bleiben byteidentisch; (b) ein Feld, das seine Bedeutung ändert, ist ein neues
Feld; (c) der Laufzeitvertrag wird nur erhöht, wenn das Lesemodell seine Form verliert, neue
Eigenschaften erhöhen ihn nicht; (d) Fähigkeitsprofile werden nie gespeichert.
Austauschbare Schicht (frei änderbar): Renderer, Editoren, Layout, Texte, Regelkarte.

## 6. Wegweiser in der Regelwerkstatt

Der Editor öffnet heute das aktive, schreibgeschützte Paket; wie ein eigenes Regelwerk entsteht,
sieht man nicht. Neu: (1) ein nummerierter Weg über dem Editor mit Zustand — Grundlage wählen,
Bogen und Regeln gestalten, Ausprobieren, Installieren, Für die Runde aktivieren — jede Stufe mit
einem Satz und einem Sprung zur richtigen Stelle; (2) die Startvorlagen (ChronicleHeroes, D20,
3W20, 5E-kompatibel, leer, Datei) stehen offen, solange kein Entwurf bearbeitet wird; (3) die
drei Verben Installieren, Prüfen, Aktivieren werden an Ort und Stelle in je einem Satz erklärt.

## 7. Regelkarte: Zoom

Karte und Knotennetz: Tasten − / + / Einpassen / volle Größe, Strg + Mausrad um den Zeiger,
Zoom wird gemerkt. Die Übersicht bleibt ohne Zoom.
