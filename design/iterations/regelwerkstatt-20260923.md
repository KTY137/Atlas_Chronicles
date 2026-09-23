<!-- SPDX-License-Identifier: BUSL-1.1 -->
<!-- Copyright (c) 2026 Kaya Yesilyurt - Atlas Chronicles. Siehe LICENSE. -->
# Regelwerkstatt übersichtlich — Nachweise 2026-09-23

Spec: [`docs/superpowers/specs/2026-09-23-regelwerkstatt-uebersicht-design.md`](../../docs/superpowers/specs/2026-09-23-regelwerkstatt-uebersicht-design.md).
Alle Bilder aus dem gebauten Client (`packages/client/dist`) gegen einen echten Testserver,
1440 × 960 (Handy: 390 × 844), Edge über Playwright.

## Vorher

| Bild | Befund |
| --- | --- |
| [`00-vorher-start.png`](regelwerkstatt-20260923/00-vorher-start.png) | Startvorlagen bleiben über der Arbeit aufgeklappt. |
| [`00-vorher-abgeleitet.png`](regelwerkstatt-20260923/00-vorher-abgeleitet.png) | Weg, Zählkacheln, Banner, zehn Reiter; jede Formel eine offene Karte. |

## Nachher

| Bild | Was es zeigt |
| --- | --- |
| [`01-bibliothek.png`](regelwerkstatt-20260923/01-bibliothek.png) | Einstieg: Bibliothek und „Eigenes Regelwerk beginnen“. |
| [`02-werkbank-paket.png`](regelwerkstatt-20260923/02-werkbank-paket.png) | Werkbank: Navigation mit vier Gruppen und Anzahlen, Statusleiste mit einem nächsten Schritt. |
| [`03-computed.png`](regelwerkstatt-20260923/03-computed.png) | Abgeleitete Werte als Liste und Detail statt sechs offener Karten. |
| [`03-vitals.png`](regelwerkstatt-20260923/03-vitals.png) | Balken: Schnellanlage, Detail, Live-Balken unter der Liste. |
| [`06-balken-neu.png`](regelwerkstatt-20260923/06-balken-neu.png) | Neues Paket, „Leben“ und „Mana“ je ein Klick, Schieber auf 7 von 20. |
| [`07-balken-leer.png`](regelwerkstatt-20260923/07-balken-leer.png) | Schieber auf 0: Balken leer, Satz zur Niederlage erscheint. |
| [`03-sheet.png`](regelwerkstatt-20260923/03-sheet.png) | Bogen: ein Editor, Aufbau einzeilig, Eintrag rechts, Vorschau darunter. |
| [`08-bogen-neu.png`](regelwerkstatt-20260923/08-bogen-neu.png) | Neue Balken liegen von selbst oben auf dem Bogen; die Vorschau zeigt denselben Stand. |
| [`03-publish.png`](regelwerkstatt-20260923/03-publish.png) | Übernehmen: der Weg mit fünf Stationen, Installieren, Prüfen, Aktivieren. |
| [`05-bibliothek-offener-entwurf.png`](regelwerkstatt-20260923/05-bibliothek-offener-entwurf.png) | Zurück in die Bibliothek verwirft nichts: „Offener Entwurf · Weiter bearbeiten“. |
| [`10-mobil-balken.png`](regelwerkstatt-20260923/10-mobil-balken.png) | 390 px: Navigation als waagrechte Leiste, kein seitliches Scrollen. |

## Während der Sichtprüfung korrigiert

- Der Live-Balken stand bei 1440 px unter dem Detail und damit unter der Statusleiste; er steht
  jetzt links unter der kurzen Balkenliste (Containerabfrage auf `.rf-editor`).
- Der Bogenaufbau hatte zweizeilige Karten je Eintrag (D20: rund 40 Einträge); jetzt eine Zeile,
  Kategorien in Akzentfarbe.
- Die Statusleiste bot „Weiter: Ausprobieren“ auch in „Ausprobieren“ an.
- Der Weg sagte noch „Würfle unten auf der Testtafel“.
- Das Beispiel „@stufe >= 2“ stand als Platzhalter im Feld „Nur zeigen, wenn“ und sah wie ein
  eingetragener Wert aus; es steht jetzt nur im Hilfetext.

## Prüfungen

- Einheit: `rule-sheet-model` (7), `rule-vital-model` (4), ganze Client-Suite 676/676.
- Browser: `rule-forge-path` (inkl. neuem Balken-Ablauf), `rule-forge`, `rule-forge-formula`,
  `rule-forge-map`, `forge-clarity` (3), `wiki-move-rules` (2) grün — 11 Abläufe.
- Nicht grün und nicht von diesem Umbau: `universal-rules-v3` ruft `page.getByDisplayValue` auf,
  das Playwright nicht kennt; `htbah.spec.ts` sucht eine „How to be a Hero Vorlage“, die es in der
  Oberfläche nicht mehr gibt.
- Typprüfung (Wurzel und Client), `gate:sprache`, `gate:boundaries`, `gate:version` grün.
