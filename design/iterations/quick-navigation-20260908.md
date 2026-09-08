# Schnellzugriff — Design, Gegenprüfung und Handoff

Datum: 2026-09-08. Basis: `1b5b7d123fdbb56c9203abf6ba93236571bb31d2`.
Auftrag: Featurelücken prüfen und die vorhandene GUI verbessern.

## Entscheidung

Die bestehende Shell und ihre Fachwerkstätten bleiben erhalten. Statt einer weiteren
Seitenleiste ergänzt ein zentraler Suchdialog direkte Einstiege in bereits vorhandene
Bereiche und Werkstätten. Ein kompletter Shell-Neubau hätte eine deutlich größere
Regressionsfläche; ein weiterer Satz Dashboard-Karten hilft nicht beim schnellen
Wechsel aus einem geöffneten Werkzeug.

`quick-navigation.ts` beschreibt ausschließlich statische Navigationsziele und eine
reine, getestete Suchfunktion. Explizite literale `t(...)`-Aufrufe bleiben für das
Sprachgate auffindbar. Die aktuelle Sprache bestimmt die Anzeige, die deutsche
Quellfassung und englische Suchwörter bleiben zusätzlich durchsuchbar.
`QuickNavigation.tsx` verwendet den nativen modalen Dialog mit sichtbarer
Schließen-Aktion, Suchfeld, benannten Ergebnissen und Tastatursteuerung. CSS nutzt
vorhandene Theme-Tokens; auf kleinen Bildschirmen wird der Auslöser kompakt.

App bleibt alleiniger Besitzer des Routenwechsels und des Entwurfsschutzes. `navigate`
meldet jetzt Erfolg/Abbruch zurück, damit der Dialog bei abgelehntem Verwerfen offen
bleibt. Nach erfolgreichem Wechsel erhält der Hauptinhalt den Fokus. Die bestehende
Mobilnavigation darf ein Escape aus dem darüberliegenden Dialog nicht mitverarbeiten.

## Angriffspunkte und Gegenmaßnahmen

- **Geheime Daten:** Kein API-Zugriff, kein Artikel-/Figurenindex, keine Treffer aus
  Kampagnentexten. Spielleiterziele werden vor der Suche gefiltert und vor der Aktion
  noch einmal gegen die aktuelle Rolle geprüft. Das ersetzt keine Serverberechtigung.
- **Entwurfverlust:** Jeder Zielwechsel läuft durch den bestehenden App-Guard. Ein
  abgelehntes Verwerfen schließt weder Entwurf noch Suche. Kein zweiter Guard mit
  abweichenden Regeln und keine automatisch schreibende Aktion.
- **Tastatur/Fokus:** Native Modalität, benannte Combobox/Listbox, aktive Option,
  Pfeile/Enter, Escape, Fokus-Rückkehr. Keine Übernahme von Wiederholungs-/IME-Ereignissen,
  fremden Modaldialogen oder dem Link-Shortcut in Rich-Text-Feldern.
- **Responsive Darstellung:** Begrenzte Dialogbreite und -höhe, scrollende Ergebnisliste,
  44-Pixel-Schließen-Aktion und vorhandene Theme-Variablen. Keine Animation eingeführt.
- **Unbeabsichtigte Paralleländerungen:** Karteneditor, Chronist, Server, Schemas und
  bestehende Übersetzungspakete bleiben unverändert. STATUS wird nicht mit einem
  Teilbestand überschrieben; dieser Text ist der additive Handoff bis zur Integration.

## Tatsächlich ausgeführte lokale Prüfungen

Die Ausführungsumgebung hatte keinen Netzwerkzugriff auf GitHub/npm und keine
installierten Projektabhängigkeiten. Dateien wurden über den GitHub-Connector gelesen.
Die ursprüngliche App-Datei wurde vor der engen Änderung bytegenau gegen den Git-Blob
`21947fe5ae5a44ee07241a0312c374bd0946ab01` geprüft.

- **20/20 Logikfälle bestanden:** Die eingecheckte Vitest-Testdatei wurde mit dem lokal
  vorhandenen TypeScript 5.8.3 nach ES-Modulen transpiliert. Nur Test-Runner-Import
  (`vitest` → `node:test`) und relative Modul-Endungen wurden für diesen Lauf ersetzt.
  Assertions und Produktfunktionen blieben gleich. Geprüft sind Katalog, gültige Ziele,
  Rollenfilter, Suche, Sortierung, Sprachwechsel und Tastenkürzel.
- **Strikter Typecheck des reinen Navigationsmodells bestanden**, einschließlich der
  bestehenden Typverträge aus `navigation.ts` und `forge-navigation.ts`, mit TS 5.8.3.
- Syntaxprüfung der geänderten TypeScript-/TSX-Dateien und JSON-Lesbarkeit lokal geprüft.

Das ist **kein** Lauf des Repository-Gates mit dessen TypeScript 7.0.2/Vitest-Version,
kein vollständiger App-Typecheck, kein Produktionsbuild und keine visuelle App-Abnahme.

## Hinzugefügte, noch nicht ausgeführte Browserabnahme

`e2e/quick-navigation.spec.ts` verwendet den bestehenden echten `reviewApp`-Prüfstand:
Zielwechsel/Neuladen, Pfeilumlauf und Fokus, leere Suche, Spielerrechte, Ablehnung und
Bestätigung am echten Loot-Entwurf, Mobilgröße/Tab-Fokus, fremder Dialog und Escape
über der Mobilnavigation. Acht Browserfälle sind geschrieben, hier nicht ausgeführt.
Die bestehende GitHub-Gate-Workflowdatei führt keine Playwright-Suite aus.

Vor Merge in einem vollständigen Checkout:

```sh
npm ci
npm run typecheck
npm run build
npm run gate:sprache
npx vitest run packages/client/test/quick-navigation.test.ts
npx playwright test e2e/quick-navigation.spec.ts e2e/gui-navigation.spec.ts
```

Für die Browserfälle die dokumentierten Datenbank-/Browser-Voraussetzungen einrichten.
Zusätzlich die betroffenen bestehenden Navigationstests prüfen. Bereits im STATUS
aufgeführte rote Kartenfälle getrennt belegen, nicht als Erfolg dieses Patches ausgeben.
Es wird hier weder ein Desktop-Paket noch eine Installation oder ein vollständiger
GUI-Abschluss behauptet. Die Änderung gehört bis zu diesen Nachweisen in einen Draft-PR.
