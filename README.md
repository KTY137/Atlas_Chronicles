# Atlas Chronicles

Eine gemeinsam genutzte Chronik für Pen & Paper: Kampagnen, Wissen pro Spielfigur,
Wiki, Karten, Regelpakete und ein Spieltisch mit nachvollziehbaren Würfen und
ausdrücklich bestätigten Kanon-Einträgen. Die Implementierung läuft; den gesamten
Lieferumfang hält der [Implementierungsplan](docs/IMPLEMENTATION_PLAN.md) fest.

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
[Wochenansicht](docs/WEEK_UI.md) verbindet Briefe, Postlaufzeit, Lesestand und
Wochenunterschiede. Die Schmiede bietet visuellen Regel- und Bogenbau mit
Testfiguren, Würfel-Trace und ausdrücklich bestätigter Paketmigration. Sprache,
Video, Bildschirmfreigabe und private Flüsterräume bleiben beim Bühnenwechsel
verbunden; Einrichtung und geprüfte Grenzen stehen in
[Medien im Client](docs/MEDIA_UI.md). Aktuelle Nachweise und offene Lieferpunkte
stehen in [STATUS.md](STATUS.md).

Die Spielleitung kann die vollständige Kampagne als native `.chronicle`-Datei
herunterladen. Der [Restore-Leitfaden](docs/CAMPAIGN_RESTORE.md) beschreibt die
geprüfte Wiederherstellung in eine leere Instanz und die separate Einrichtung
neuer Zugangsdaten. Der [Formatvertrag](design/iterations/campaign-bundle-v1.md)
benennt auch ausgeschlossene Laufzeitdaten.

Für Self-Hosting und die optionale Medieninfrastruktur siehe
[deploy/README.md](deploy/README.md). Öffentliche Domain/TLS und Medien hinter
NAT benötigen weiterhin eine Prüfung in der tatsächlichen Betriebsumgebung.
