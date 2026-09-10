# Atlas Chronicles

Eine gemeinsam genutzte Chronik für Pen & Paper: Kampagnen, Wissen pro Spielfigur,
Wiki, Karten, Regelpakete und ein Spieltisch mit nachvollziehbaren Würfen und
ausdrücklich bestätigten Kanon-Einträgen. Die Implementierung läuft; den gesamten
Lieferumfang hält der [Implementierungsplan](docs/IMPLEMENTATION_PLAN.md) fest.

Eine Einrichtungsanleitung für Spielleitung und Spieler auf Englisch — eigener
Rechner, LAN oder eigener Server — steht in
[Getting Started (EN)](docs/GETTING_STARTED_EN.md).

## Herunterladen

[**v0.4.0 für Windows**](https://github.com/KTY137/Atlas_Chronicles/releases/tag/v0.4.0)
— ein Setup für den eigenen Benutzer, ohne Administratorrechte. Der Bau ist
**unsigniert**: Windows warnt vor einem unbekannten Herausgeber, und diese Warnung
stimmt. Es gibt keinen Aktualisierungskanal; eine neue Fassung heißt neu
herunterladen. Was drin ist, was fehlt und die Prüfsumme zum Nachrechnen stehen in
den [Release-Notizen](docs/RELEASE_NOTES_v0.4.0.md); die früheren Fassungen bleiben
in den Notizen zu [v0.3.0](docs/RELEASE_NOTES_v0.3.0.md),
[v0.2.0](docs/RELEASE_NOTES_v0.2.0.md) und
[v0.1.0](docs/RELEASE_NOTES_v0.1.0.md) beschrieben.

Diese Fassung schließt eine Lücke, die im Betrieb schmerzte: eine gewöhnliche
Sitzung hält acht Stunden, und wer weder einen Passkey eingerichtet noch den
Browser gemerkt hat, stand danach vor der Anmeldeseite ohne Weg zurück — auch die
Spielleitung, der dieser Server gehört. Das Hostfenster hat jetzt einen Bereich
**Zugänge und Rollen**: Runden und Mitglieder mit der Spalte, wer gerade nicht
mehr hereinkommt, ein Zugangscode für jedes Mitglied, ein Einladungscode für eine
Runde und die Wahl, wer die Spielleitung führt. Der Abschnitt ist immer sichtbar,
auch wenn gerade keine Welt läuft — dann sagt er, was zu tun ist. Und eine lokale
Welt lässt sich löschen; bestätigt wird durch Tippen ihres Namens, gesicherte
Stände bleiben erhalten.

## Lokal starten

Voraussetzungen: Node.js ab 22.12, npm und laufendes Docker Desktop.
Im Repository unter PowerShell:

```powershell
npm.cmd ci
npm.cmd run configure
npm.cmd run db:up
npm.cmd run build
npm.cmd start
```

Die App öffnet unter <http://localhost:3000>. Bei der ersten Einrichtung wird der
Wert `bootstrapToken` aus `.local/config.json` benötigt. Lokale Zugangsdaten und
Datenbankkonfiguration werden erzeugt, bleiben beim erneuten Konfigurieren
erhalten und sind von Git ausgeschlossen. Der Server wendet ausstehende
Datenbankmigrationen beim Start an.

Für Änderungen mit automatischem Neuladen nach `db:up`: `npm.cmd run dev` und
<http://localhost:5173>. Der Entwicklungsserver verwendet weiterhin PostgreSQL.

## Prüfen

```powershell
npm.cmd run gate
npm.cmd run test:e2e
```

Das Gate prüft Paketgrenzen, TypeScript und Tests. Die Browserprüfungen verwenden
Microsoft Edge und eine laufende lokale PostgreSQL-Instanz; sie legen isolierte
Testschemata an. Für die zusätzlichen PostgreSQL-Konkurrenztests im Gate:

```powershell
$atlasSettings = Get-Content -Raw .local/config.json | ConvertFrom-Json
$env:TEST_DATABASE_URL = $atlasSettings.databaseUrl
npm.cmd run gate
Remove-Item Env:\TEST_DATABASE_URL
```

## Stand und Betrieb

Die App enthält Einrichtung und Beitritt, Passkeys, Wiki-Projektionen und
Bearbeitung, Eron-/Azgaar-Import, Karten, Charakterbögen, Szenen, Würfe,
Bestätigungen, Kampagnenbeiträge und getrennten Tischchat. Die
[Figurenverwaltung](docs/ACTORS_UI.md) ergänzt versionierte Vorlagen,
eigenständige Figuren und Gegenstände, geteilte Kontrolle und einen ausdrücklich
gewählten Wissensblick. Die [Szenenkarte](docs/TACTICAL_UI.md) ergänzt UVTT-Import,
Wissensregionen, vorbereitete Figuren, getrennten Livezustand und Undo; der Server
liefert ausschließlich sichtbare Bildkacheln. Die
[Wochenansicht](docs/WEEK_UI.md) verbindet Briefe, Postlaufzeit, Lesestand und
Wochenunterschiede. Die Schmiede bietet visuellen Regel- und Bogenbau mit
Testfiguren, Würfel-Trace und ausdrücklich bestätigter Paketmigration. Die
[Theme- und Publikationswerkstatt](docs/AUTHORING.md) ergänzt vier Presets, lokale
Leseeinstellungen und die ausdrückliche Freigabe ausgewählter Artikelstände.
Das Spielerbanner zeigt Namen und Anwesenheit der verbundenen Runde auch beim
Bühnenwechsel. Sprach- und Videochat, Bildschirmfreigabe und Sprachräume sind entfernt.
Aktuelle Nachweise und offene Lieferpunkte
stehen in [STATUS.md](STATUS.md).

Die Spielleitung kann die vollständige Kampagne als native `.chronicle`-Datei
herunterladen. Der [Restore-Leitfaden](docs/CAMPAIGN_RESTORE.md) beschreibt die
geprüfte Wiederherstellung in eine leere Instanz und die separate Einrichtung
neuer Zugangsdaten. Der [Formatvertrag v4](docs/CAMPAIGN_FORMAT_V4.md)
benennt auch ausgeschlossene Laufzeitdaten.

Wer selbst hosten will, beginnt beim [Self-Hosting-Guide](docs/SELFHOSTING.md): er
stellt die drei Betriebsformen gegenüber, benennt die benötigten Dateien und sagt
für jede, was geprüft ist. Die Betriebs- und Architekturdetails dahinter stehen in
[deploy/README.md](deploy/README.md). Öffentliche Domain/TLS benötigen weiterhin
eine Prüfung in der tatsächlichen Betriebsumgebung.
