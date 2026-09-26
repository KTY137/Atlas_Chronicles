<!-- SPDX-License-Identifier: BUSL-1.1 -->
<!-- Copyright (c) 2026 Kaya Yesilyurt - Atlas Chronicles. Siehe LICENSE. -->
# Die Regelschmiede von Level 1 auf Level 10

Stand 2026-09-25. Kaya: *„können wir die regelwerk schmiede noch mehr verbessern wir sind auf lvl 1
wollen aber auf lvl 10“*. Reihenfolge und Zuschnitt nach `kaya-entscheide-selbst` festgelegt; jede
Stufe ist einzeln lieferbar und bekommt eigene Nachweise.

## Die Leiter

| Level | Fähigkeit der Spielleitung | Paketformat | Stand |
| --- | --- | --- | --- |
| 1 | Übersichtliche Werkbank, Balken mit Farbe | ja (Farbe) | fertig, `a5f0ac6`, `2bbd3a1` |
| 2 | Nichts geht verloren: Entwurf automatisch gesichert, Rückgängig/Wiederholen | nein | dieser Schritt |
| 3 | „Wie wahrscheinlich ist das?“: Chance, Verteilung, Kurve je Aktion | nein | dieser Schritt |
| 4 | Würfelsysteme ohne Grenzen: Erfolge zählen, einzelne Würfel ansehen | ja | offen |
| 5 | Aktionen wirken: Schaden, Heilung, Kosten auf Balken | ja | offen, hängt am Kampftisch |
| 6 | Ausrüstung mit Regelwirkung | ja | offen (Teilprojekt 4) |
| 7 | Kategorien, Summen, Aufstieg | ja | offen (Teilprojekt 3) |
| 8 | Bogen per Ziehen und Ablegen auf der Vorschau | nein | offen |
| 9 | Assistent und „Regeltext → Entwurf“ per KI, nur als Entwurf | nein | offen |
| 10 | Versionsvergleich, Regelheft für Spieler, Paket teilen | nein | offen |

**Warum diese Reihenfolge.** 2 und 3 ändern nichts am Paketformat (umkehrbare Schicht, darf schnell
gehen) und sind die Grundlage für alles Weitere: wer an einem Würfelsystem baut (4–7), braucht
Rückgängig und muss sehen, was eine Änderung an den Chancen bewirkt. 4–7 berühren das Paketformat,
also die Schicht, die nach Kayas Migrationsregel gleich in ihrer endgültigen Form gebaut wird: jede
bekommt eine eigene Spec mit Engine-, Beleg- und Migrationsfolgen, bevor Code entsteht.

## Nachtrag 2026-09-25 — neue Reihenfolge

Kaya am selben Tag: *„ich meine aber auch vom Aussehen, der Übersichtlichkeit und wie man ein
Regelwerk erstellt das muss noch besser werden“* und *„ich will vollständige DnD5e, DSA etc. packs
haben die mit allen offizielen Fähigkeiten bestückt sind“*. Lizenzentscheidung (AskUserQuestion):
mitgeliefert werden **5e SRD 5.2 komplett** und **Pathfinder 2e Remaster (ORC)**; ein Import-Weg
für eigene Bücher (DSA, 5e jenseits des SRD) kommt später.

**Lizenzgrenze.** Mitgeliefert wird nur frei Lizenziertes. D&D 5e: SRD 5.1/5.2 (CC-BY-4.0); alles
darüber hinaus gehört Wizards of the Coast. DSA: keine freie Lizenz (Ulisses-Fanrichtlinien
schließen kommerzielle Nutzung aus) — kein mitgeliefertes DSA-Paket. Pathfinder 2e Remaster: Regeln
unter ORC; „Pathfinder“ ist Marke und ORC-„Reserved Material“ (Eigennamen der Spielwelt, Götter,
Orte) bleibt draußen — das Paket bekommt einen eigenen Namen und nennt Paizos Werk nur in der
Pflichtangabe.

**Engine-Grenze.** Ein vollständiges Paket passt nicht ins heutige Format: Fähigkeiten höchstens
512, Text höchstens 600 Zeichen, Rang 1–3, Kosten 0–9, Paket höchstens 1 MiB. Zauber brauchen Grade
0–9, Klassenmerkmale Stufen 1–20, Beschreibungen bis ~3000 Zeichen, das SRD 5.2 allein liegt über
1 MiB. Deshalb vor den Paketen ein **Kompendium-Format**: typisierte Einträge (Zauber,
Klassenmerkmal, Talent, Volk, Hintergrund, Gegenstand) mit Stufen, langen Texten und eigenem
Speicherrahmen neben dem gepinnten Regelpaket. Irreversible Schicht → eigene Spec mit
Angriffsdurchgang, bevor Code entsteht.

**Neue Reihenfolge.** (a) Optik, Übersicht und ein **Regelwerk-Assistent** — umkehrbare Schicht,
sofort; (b) Spec Kompendium-Format; (c) 5e SRD 5.2 vollständig; (d) ORC-Paket nach Pathfinder 2e
Remaster; danach Level 3 (Wahrscheinlichkeit) und die Formatstufen 4–7.

## Grenzen ohne Sorgen (Nachtrag 2026-09-25)

Kaya: *„erweitere die Grenzen davon so dass man sich nie Sorgen machen muss, auch bei über 1000
Fähigkeiten/Attributen etc., das muss dann für alle Bereiche angehoben werden: Fähigkeitenzahl,
Zeichenlimits, Rangbereiche, Paketgröße, etc“*.

**G1 — Eine Quelle.** Jede Inhaltsgrenze steht in `RULE_LIMITS` (Paket `rules`); Prüfer, Protokoll,
Server und Oberfläche lesen sie von dort. Bisher kopierte die Oberfläche 64, 8, 4, 512 oder
„Rang 1–3“ von Hand und wäre beim Anheben stehen geblieben.

**G2 — Die neuen Werte.** Inhaltsgrenzen (Anzahl, Länge, Bereich) großzügig; Schutzgrenzen der
Rechnung (Tiefe, Knoten, Schritte, Würfel) nur so weit, dass große Kataloge nicht an ihnen scheitern.

| Bereich | bisher | neu |
| --- | --- | --- |
| Paketgröße / JSON-Knoten | 1 MiB / 50 000 | 64 MiB / 4 000 000 |
| Attribute, Aktionen, Fähigkeiten | 512 / 512 / 512 | je 65 536 |
| Zustände, abgeleitete Werte, Bogenregeln | 32 / 64 / 64 | je 16 384 |
| Balken, Listen, Bogenabschnitte | 8 / 64 / 64 | 256 / 4 096 / 4 096 |
| Namen und Beschriftungen | 80–120 Zeichen | 500 |
| Beschreibungen, Erklärungen, Hinweise | 600–1 024 | 200 000 |
| Meldungen | 1 024 | 10 000 |
| Rang / Kosten / Preis | 1–3 / 0–9 / 0–99 | 0–1 000 / 0–1 000 000 / 0–1 000 000 |
| Vorstufen, Wirkungen, Aktionsmuster je Wirkung | 4 / 4 / 16 | 256 / 256 / 1 024 |
| Textfeld (auch Listen- und Fähigkeitsspeicher) | 4 096 Zeichen | 16 777 216 |
| Auswahlwerte, Felder je Listeneintrag, Einträge je Liste | 64 / 64 / 128 | 10 000 / 1 024 / 100 000 |
| Bogenbaum Knoten / Kinder / Tiefe | 512 / 128 / 16 | 262 144 / 65 536 / 64 |
| Pakettests, Migrationswege, Schritte | 64 / 64 / 128 | 16 384 / 4 096 / 65 536 |
| Formel Länge / Knoten / Tiefe | 4 096 / 512 / 32 | 65 536 / 8 192 / 128 |
| Rechenschritte je Aufruf / Würfel / Explosionen | 4 096 / 100 / 20 | 250 000 / 10 000 / 100 |
| Werte je Bogen im Protokoll / Textwert | 512 / 4 096 | 65 536 / 16 777 216 |
| Bögen je Migration | 2 048 | 1 000 000 |
| Anfragegröße Regelpaket und Bogen (Server) | 2 MiB | 128 MiB (nur diese Wege) |

**G3 — Verträglichkeit.** Anheben ändert kein bestehendes Paket, keinen Beleg, keinen Hash. Ein
großes Paket lässt sich in älteren Programmständen nicht installieren; das gilt für jede
Formaterweiterung. Absenken wäre der irreversible Schritt — deshalb gleich großzügig.

**G3a — Warum die Rechenschritte nicht höher gehen.** Gemessen 2026-09-25: rund 9 µs je Schritt
samt Formellesen; 250 000 Schritte sind höchstens etwa 2 s, in denen der Server für alle am Tisch
steht. Das reicht für 16 000 abgeleitete Werte mit je 15 Schritten; ein vollständiger 5e-Bogen
braucht rund 600. Der Parser wächst linear (etwa 2 µs je Zeichen).

**G4 — Offen.** Die Werkbank prüft den Entwurf bei jeder Änderung vollständig; bei Paketen im
zweistelligen Megabyte-Bereich braucht das eine verzögerte Prüfung im Hintergrund (eigener Schritt,
sobald die großen Pakete kommen).

## Level 2 — Nichts geht verloren

**Befund.** Der Entwurf lebt nur im Arbeitsspeicher der Werkstatt. Neu laden, Fenster schließen oder
ein Absturz verwerfen ihn; es gibt kein Rückgängig über Formelfelder hinaus.

**Entscheidungen.**

- **L2-E1 Sicherung im Gerät, nicht auf dem Server.** Der Entwurf ist Werkstattzustand, kein
  Rundenzustand; er gehört (noch) niemandem außer der Spielleitung an diesem Gerät. Ablage unter
  `atlas.rule-draft.<kampagne>` im Browser- bzw. Electron-Speicher, gebündelt mit Zeitstempel und
  der Paketfassung, aus der er entstand. Kein neues Tabellenschema, kein Migrationspfad; läuft der
  Speicher voll, sagt die Werkstatt das in einem Satz. Serverseitige Entwürfe (mehrere Geräte) wären
  ein eigener Schritt.
- **L2-E2 Wiederherstellen ohne Rückfrage-Dialog.** Beim Öffnen steht ein gesicherter Entwurf in der
  Bibliothek als „Offener Entwurf · gesichert um 14:32“ mit „Weiter bearbeiten“ und „Verwerfen“.
  Verwerfen fragt über die Oberfläche nach, nie über `window.confirm` (Electron-Fokusfehler).
- **L2-E3 Rückgängig über den ganzen Entwurf.** Jede Änderung legt den vorigen Stand auf einen
  Verlauf (höchstens 100 Stände). Schnelles Tippen im selben Feld wird zu einem Schritt
  zusammengefasst (Pause unter 800 ms). Knöpfe „Rückgängig“ und „Wiederholen“ in der Werkbank
  nennen, was sie zurücknehmen („Rückgängig: Änderung an Balken“). Tastatur: Strg+Z, Strg+Umschalt+Z
  und Strg+Y — außerhalb von Textfeldern; in Textfeldern bleibt das Rückgängig des Feldes.
- **L2-E4** Installieren, Version erstellen, Paket öffnen beginnen einen neuen Verlauf.

## Level 3 — Wie wahrscheinlich ist das?

**Befund.** Wer an einer Formel dreht, sieht genau einen Beispielwurf. Ob „1W20 + Geschick gegen 15“
bei Geschick 3 eine 45-%-Chance ist, muss man selbst ausrechnen.

**Entscheidungen.**

- **L3-E1 Gezählt, nicht geschätzt aus einer Formel.** Jede Aktion wird mit derselben Engine
  gewürfelt wie am Tisch (`evaluateSupportedAction`), mit festen, fortlaufenden Würfelstarts: gleiche
  Eingabe, gleiches Bild. Das deckt jede Formel ab — Behalten, Explodieren, Bedingungen, Wissen,
  Wirkungen von Fähigkeiten — statt nur Würfelsummen. 2000 Würfe je Punkt; die Genauigkeit
  (± rund 2 Prozentpunkte) steht dabei.
- **L3-E2 Drei Antworten.** Erfolgschance (bzw. Anteil je Ergebnisbereich), die Verteilung der
  Ergebnisse als Balkendiagramm mit Durchschnitt und Spanne, und die Kurve „Chance über einem
  Attribut“: ein Zahlenattribut der Formel wird über seinen Bereich (höchstens 21 Punkte) variiert.
- **L3-E3 Ort.** In „Ausprobieren“ je Aktion und kompakt im Aktionsdetail („Erfolg in 45 % der
  Würfe“). Gerechnet wird in Häppchen, damit die Oberfläche nicht einfriert.
- **L3-E4 Nichts wird gespeichert**, nichts gewürfelt, was am Tisch zählt.
