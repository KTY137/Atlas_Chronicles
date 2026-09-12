# Lebendige Einzelpanoramen — 2026-09-12

Owner-Korrektur: Einige Banner wirken unbewegt, das gleiche Hauptmotiv wird in
breiten Kopfzeilen mehrfach wiederholt. Alle 25 Motive sollen nochmals mehr
sichtbare Bewegung, Atmosphäre und liebevolle Details bekommen.

Das zentrale 640×96-Artwork wird genau einmal als direktes SVG gerendert.
Die Kopfzeile bleibt bei 64px Höhe. Die ursprüngliche Entscheidung für native
Vorschaupixel wurde auf ausdrückliche Owner-Korrektur durch vollständig
eingepasste, größere Panoramen ersetzt; siehe
`pixel-banners-four-passes-20260912.md` für die vier weiteren Durchgänge.
Der Hintergrund der breiten Leiste erhält ein eigenes, 8192 Pixel breites
Panorama mit unterschiedlichen linken und rechten Landschaften. Keine Kopien,
Spiegelungen oder Kacheln des Hauptmotivs. Ein schmaler Übergang verbindet die
Seiten mit dem vorhandenen Artwork. Die Seiten variieren pro Szene in Gelände,
Architektur, Bewuchs und kleinen Gegenständen.

Jedes Hauptmotiv erhält mindestens zwei erkennbare, thematisch passende
Bewegungen. Bewegte Partikel setzen nur unsichtbar zurück, pendelnde Objekte
kehren stetig zurück; Rotation erhält feste Ankerpunkte. Statische SVG-Position
und CSS-Animation liegen weiterhin auf getrennten Gruppen. Keine React-Timer.

Die Browserprüfung erweitert die bisherige Kontrolle laufender CSS-Animationen:
Gerenderte Pixel aller 25 Motive müssen sich in Vorschau und Kopfzeile über
mehrere Zeitpunkte verändern, auch bei eingefrorenen Sternen. Genau ein
Hauptmotiv und unterschiedliche Seiten werden bei breiter Kopfzeile geprüft.
Die bestehende endliche Regen-/Schnee-Loopprüfung und Bewegungsvorgaben bleiben.

Aktiver Main-Stand enthielt zunächst nur die ursprünglichen 20 Banner. Der
bereits geprüfte, ausschließlich bannerbezogene Commit 04578e1 wurde als f8f52f6
übernommen; die neue Arbeit baut auf den 25 detaillierten Motiven auf.
Koordination: vorhandener LangGraph-StateGraph, separater Checkpoint unter
`.local/pixel-banners-living`, LangGraph 1.2.11, vorhandener Pin, Tracing aus.
