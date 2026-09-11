# Geschosse, Keller und Raumnebel — 2026-09-11

Basis: main `a3bc38b0acd1fe2ff16c3ef6c9337e77f08abf11`.
Auftrag: Roadmap #3 Punkt 07 und raumweises Fog of War. Kein Auftrag zu den übrigen TODOs.

## Daten- und Sicherheitsentscheidung

Geschosse sind gewöhnliche, separat revisionierte taktische Karten in einem versionierten
Geschossverband. Der Verband enthält ausschließlich Namen, Ebenennummern und Übergänge, keine
zweite Kopie der Karteninhalte. Grundrisskopien erhalten neue Elementidentitäten und keine
übernommenen Wissensbindungen oder Unterkarten. Treppe, Aufzug und Durchbruch sind Reiseverbindungen,
keine zyklischen Elternkanten. Gemeinsamer Rahmen/Raster und identische Ankerkoordinaten werden
serverseitig geprüft, auch bei späteren Kartenänderungen.

Raumnebel ist ein unabhängiger, GM-gesteuerter Wissensvertrag je Karte UND gespeicherter Revision.
Ohne explizite manuelle Steuerung bleibt die bisherige Chronikwissensprojektion erhalten.
Manuell aktivierter Nebel verbirgt zunächst alle nicht ausdrücklich freigegebenen Räume. Gruppen-
und persönliche Freigaben/Verbergungen werden auf dem Server ausgewertet; der Spieler bekommt
weder unbekannte Geometrie/Namen noch die vollständige Freigabeliste. Rasterkacheln bleiben
serverseitig maskiert und erhalten nach Änderung einen neuen Sichtdigest. Bereits gesehene
Information lässt sich nicht aus dem menschlichen Gedächtnis oder externen Screenshots löschen.
Eine Raumfreigabe ist keine Freigabe der zugehörigen Chroniktexte.

Die laufende Szene behält ihre bestehende feste Kartenrevision. Geschossnavigation bearbeitet
keine laufenden Positionen und erzeugt keine heimlichen Szenenstarts. Jedes Geschoss ist mit der
vorhandenen Szenenvorbereitung spielbar. Eine freie Figurenreise zwischen gleichzeitig aktiven
Geschossen gehört nicht zu diesem Datenvertrag.

## Abnahme

Vor Remote-Integration ausgeführt: 29 reine Vertrags-/Kopier-/Nebeltests; 14 neue
HTTP-/Domänen-/Raster-/Sicherungsprüfungen; die letzten zusammen mit bestehenden taktischen
Sicherheits-/Lebenszyklustests: 62 bestanden, 14 PostgreSQL-spezifische Fälle ohne lokale
PostgreSQL-Verbindung übersprungen. Ein echter paralleler Test hält die Rasterauslieferung
an, verbirgt dann den Raum und verlangt, dass das überholte Bild nicht mehr ausgeliefert wird.

Der große lokale Karten-/Sicherungsdurchlauf prüfte 1.510 Fälle, davon 1.509 bestanden und
zunächst ein alter VM-Test fehlerhaft: sein Ressourcen-Testdouble lieferte für die neue
`/floors`-Abfrage ein Kartendokument statt eines Geschossverbands. Die Testdaten wurden um den
realen Endpoint-Vertrag ergänzt, keine Fachassertion entfernt. Ein zusätzlicher Navigationsfall
prüft Ablehnung und Bestätigung des Verwerfens ungespeicherter Kartenänderungen. Danach zehn
Werkstattfälle und alle 29 reinen Fälle erneut bestanden.

Root-Typecheck, Client-Typecheck/Produktionsbuild sowie Sprach-/Boundary-Regeln und zehn
Expeditionsprüfungen bestanden. Der vorhandene Kartenworkflow wird um diese Verträge, die
bestehenden taktischen Sicherheitsprüfungen und zwei echte Browserabläufe erweitert.
Die lokale Browsernavigation ist durch `ERR_BLOCKED_BY_ADMINISTRATOR` gesperrt. Keine
Umgehung und keine lokale Browserabnahme behauptet. CI, heruntergeladene Browserbilder und
endgültige Integrationsprüfung werden im PR-Abschlussreview dokumentiert.

Native Sicherungen nutzen Version 20 nur bei tatsächlich vorhandenen Geschoss-/Nebelzeilen;
ohne diese Daten bleibt die bisher erforderliche Version erhalten. Neue vollständige
Referenz-/Rechte-/Geometrieprüfungen ergänzen, nicht ersetzen, die eingefrorenen v1–v19-Prüfer.
Kein Windows-Paket oder Release in dieser Featurelieferung behauptet. Das bekannte globale
Loot-Reproduktionsproblem ist nicht durch Änderungen an Tests oder Assets umgangen.
