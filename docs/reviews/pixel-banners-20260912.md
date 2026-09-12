# 20 animierte Pixelart-Banner — 2026-09-12

Unter Einstellungen → Deine Darstellung → Pixelart-Banner sind 20 originale,
lokal mitgelieferte SVG-Szenen auswählbar. Alle Vorschauen laufen animiert, auch
ohne Auswahl oder Hover. In der Kopfzeile läuft die gewählte Szene. Farbschema
und Banner sind unabhängig; „Kein Banner“ und „Banner animieren“ steuern Bild
und Bewegung getrennt. Die Auswahl bleibt nach Neuladen und in weiteren Fenstern
derselben Browserinstallation erhalten.

Fantasy umfasst Mondburg, Glühwald, Drachenberge, Himmelsinseln und Kristallhöhle.
Dazu kommen Steam-, Clock-, Diesel-, Western-, Frost-, Cyber-, Solar-, Bio-, Nano-,
Ocean-, Retro-, Atom-, Space- und Gothicpunk sowie Vaporwave. Die Szenen besitzen
eigene Motive und Bewegungen: Luftschiff, Zahnräder, Zug, Schnee, Regen, Funken,
Wasser, Blasen und mehr. Keine externen Medien oder neuen Laufzeitabhängigkeiten.

Die geschlossenen lokalen Einstellungen wandern ausdrücklich von V1/V2 nach V3.
Bestehende Sprach-, Farb- und Zugänglichkeitswahlen bleiben erhalten. Alte Stände
beginnen ohne Banner. Reduzierte Bewegung ergibt ein Standbild; ausgeschaltete
Zierbilder, hoher Kontrast, nüchterne Darstellung oder Sparmodus verbergen den
Schmuck in der Kopfzeile. Bis 760 px bleibt der Platz für die vorhandene Bedienung.

## Nachweise

- Produktionsbuild inklusive Client-Typecheck bestanden; Root-Typecheck bestanden.
- 84 Vitest-Prüfungen bestanden: Theme, lokale Einstellungen und Appearance/i18n.
- Fünf Browserprüfungen mit echter HTTP-App, Sitzungs-Cookie und isolierter PGlite-DB
  bestanden (`e2e/pixel-banners.spec.ts`, letzter Lauf 3,6 Minuten).
  Alle 20 Vorschauen besitzen laufende Browseranimationen ohne Hover; alle 20 Motive
  erscheinen nach Auswahl im Header. Neustart, Fenstersynchronisierung, Zurücksetzen,
  Tastatur, Englisch, Bewegungsvorgaben, Sparmodus und Forced Colors geprüft.
- Header mit 390, 820, 1440 und 3440 px geprüft, Bedienelemente erreichbar, kein
  horizontaler Überlauf. Zwei verschiedene gerenderte Animationsframes belegt.
- Version-, Boundary- und Asset-Gates bestanden (42 Asset-Prüfungen, 611 Assets).
- Banner-Sprachprüfung mit dem vorhandenen Gate-Prüfer: 49 Schlüssel, drei neue
  Quelldateien, keine offenen Texte oder Verstöße.
- React-Komponenten und Screenshots der Galerie/Header geprüft; die Animation hat
  keine React-Timer oder Rendering-Schleifen. Radiosemantik und dekoratives SVG
  bleiben getrennt. Alle Muster-IDs sind pro Instanz eindeutig.

Screenshots: `.local/pixel-banners/gallery.png` und `header-{390,820,1440,3440}.png`.
Der Windows-Transport von agent-browser antwortete nicht; die vollständige
Browserprüfung und Screenshots erfolgten erfolgreich mit Playwright/Edge.

## Grenzen und Übergabe

`npm run gate` wurde ausgeführt und stoppte am globalen Sprachgate auf parallel
bearbeiteten Figuren-/Spieltischdateien und deren Katalogen. Deshalb kein Anspruch
auf eine bestandene vollständige Projektsuite. Diese fremden Änderungen werden
nicht in den Banner-Commit übernommen. Kein Installer oder Release erzeugt.

Entscheidungen: `design/iterations/pixel-banners-20260912.md`.
Koordination: bestehender `tools/review/workflow.py`-StateGraph, eigener SQLite-
Checkpoint unter `.local/pixel-banners`; LangGraph 1.2.11, Tracing aus.
