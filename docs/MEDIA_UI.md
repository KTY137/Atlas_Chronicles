# Sprache und Video: lokaler Betrieb und Abnahme

Stand: 6. September 2026. Das native MediaPanel verbindet den Browser mit LiveKit. Es bleibt beim Wechsel zwischen Chronik, Tisch und Kanal verbunden; auch das Schließen des Panels beendet die Verbindung nicht. Voraussetzung sind eine aktuelle Kampagnenmitgliedschaft, eine laufende Spielsitzung und ein erreichbarer, konfigurierter Mediendienst.

## Bedienung

- **Sprache & Video** öffnen und **Sprachraum beitreten** wählen. Mikrofon und Kamera sind zunächst aus. Mikrofon, Kamera und Bildschirmfreigabe werden einzeln freigegeben; Browserberechtigungen bleiben erforderlich.
- Stimmen, Kamerabilder, Bildschirmfreigaben, Sprechaktivität und Verbindungsqualität stammen aus der tatsächlichen LiveKit-Verbindung. Die allgemeine App-Anwesenheit wird separat angezeigt und bedeutet nicht, dass jemand am Sprachraum teilnimmt.
- **Ton ausschalten** schaltet die empfangene Wiedergabe stumm; das eigene Mikrofon hat einen getrennten Schalter. Falls der Browser Autoplay blockiert, erscheint **Tonwiedergabe erlauben**. Mikrofon und Kamera lassen sich auswählen; die Lautsprecherauswahl setzt Browserunterstützung voraus.
- Die Spielleitung kann unter **Beiseite sprechen** ein bis fünf weitere Mitglieder einladen. Ein Flüsterraum überträgt ausschließlich Sprache. Andere Mitglieder sehen die Beteiligten, erhalten aber keinen Zugang zu deren Medien. Beobachter dürfen empfangen, jedoch keine Medien senden.
- Unter **Sprachzugang verwalten** kann die Spielleitung Mitglieder sperren und wieder zulassen. Eine Sperre beendet die betroffenen Räume; die übrigen Mitglieder können neu beitreten. Lokale Aufnahmen enden beim Verlassen, Abmelden oder Verlust des Zugangs. Es gibt keine Aufzeichnung.

## Lokal starten

Alle Befehle gelten im Repository-Stamm unter PowerShell. Benötigt werden Node.js ab 22.12, installierte npm-Abhängigkeiten und Docker mit Compose. Falls die lokale App-Datenbank noch nicht eingerichtet ist:

```powershell
npm.cmd run configure
npm.cmd run db:up
```

Die Medienkonfiguration wird **einmalig** erzeugt. `media:configure` verweigert absichtlich einen bereits vorhandenen Ordner `deploy/media/.runtime`; beim normalen Neustart diesen Schritt überspringen. Das Skript erzeugt eigene zufällige Schlüssel und gibt sie nicht aus. Die ignorierten Konfigurationsdateien bleiben lokal.

```powershell
npm.cmd run media:configure
npm.cmd run media:up
npm.cmd run media:check
npm.cmd run build
npm.cmd run start:media
```

`media:configure`, `media:up` und `media:check` führen diese vorhandenen Befehle aus:

```powershell
node deploy/media/prepare-local.mjs
docker compose -f deploy/media/compose.yaml up -d
node deploy/media/check-local.mjs
```

`start:media` lädt die Medienschlüssel aus der lokalen Env-Datei und startet die App, standardmäßig unter `http://localhost:3000`:

```powershell
node --env-file=deploy/media/.runtime/app.env --import tsx packages/server/src/main.ts
```

Für Entwicklung mit Vite stattdessen `npm.cmd run dev:media` verwenden; die Oberfläche läuft dann unter `http://localhost:5173`. Das entspricht `node --env-file=deploy/media/.runtime/app.env tools/dev.mjs`. Jeweils den vorgesehenen App-Prozess starten, keinen zweiten auf demselben Port. Ein gewöhnliches `npm.cmd start` lädt die Media-Env-Datei nicht automatisch; eine bereits laufende App übernimmt neue Umgebungswerte erst bei ihrem nächsten regulären Start.

Die Compose-Konfiguration verwendet LiveKit 1.13.6 und coturn 4.17.2. Alle veröffentlichten Ports sind an `127.0.0.1` gebunden: 7880/TCP für Signaling/API, 7881/TCP und 7882/UDP für Medien sowie 3478/TCP+UDP und 39060–39100/UDP für TURN. Diese Konfiguration ist ausschließlich für denselben lokalen Rechner vorgesehen. `room.auto_create: false` muss erhalten bleiben: Gelöschte Räume dürfen sich durch noch gültige alte Tokens nicht wieder öffnen.

## Geprüfte Abnahme

`media:check` wurde gegen den echten lokalen SFU erfolgreich ausgeführt: Raum anlegen, auflisten und löschen, signiertes Raumtoken prüfen, Signaling verbinden und den erneuten Beitritt mit demselben Token nach der Löschung ablehnen.

Der Browser-Test [e2e/media.spec.ts](../e2e/media.spec.ts) bestand separat in 17,4 Sekunden mit drei getrennten Edge-Kontexten und dem echten lokalen LiveKit-Dienst. Er prüft empfangene Audio-RTP-Bytes und laufende Wiedergabe, decodiertes Kamera- und Bildschirmvideo, Verbindungserhalt beim Seitenwechsel, privaten Flüsterverkehr, die serverseitige Ablehnung eines nicht eingeladenen Teilnehmers und gestoppte Aufnahmespuren nach einer Sperre. Anschließend konnte weiterhin ein Kampagnenbeitrag gesendet und empfangen werden. Mikrofon und Kamera waren synthetische Browsergeräte; die Bildschirmquelle wurde automatisiert ausgewählt.

Die gezielten Media-Tests bestanden mit **24/24**. Sie decken auch ab, dass ein Fehler bei der Raumlöschung andere Kampagnen nicht von der Zugangsprüfung ausschließt und dass ein abgebautes Panel keine verspäteten Requests mit einer neu angemeldeten Identität sendet. Die anschließende kombinierte Abschlussprüfung bestand mit **357 Tests in 40 Dateien**, Build, Typprüfung und **7 Browser-Tests einschließlich Media**.

Für eine erneute gezielte Browser-Abnahme müssen der lokale Stack laufen und die Client-Dateien gebaut sein. Der Test liest die lokale Media-Konfiguration selbst, verwendet eine frische Testdatenbank und eigene Räume und startet oder stoppt keine gemeinsamen Dienste:

```powershell
$previousMediaE2e = $env:ATLAS_MEDIA_E2E
try {
  $env:ATLAS_MEDIA_E2E = '1'
  npm.cmd exec -- playwright test e2e/media.spec.ts --output test-results/codex-media --reporter=line
} finally {
  if ($null -eq $previousMediaE2e) { Remove-Item Env:ATLAS_MEDIA_E2E -ErrorAction SilentlyContinue }
  else { $env:ATLAS_MEDIA_E2E = $previousMediaE2e }
}
```

## Betriebsverhalten und verbleibende Grenzen

Der Server gleicht tatsächliche SFU-Teilnehmer regelmäßig mit Mitgliedschaft, Rolle, Gerätezugang und Raumzuordnung ab; der Turnus beträgt zehn Sekunden. Abmelden und Gerätewiderruf stoßen zusätzlich einen Abgleich an. Ungültige Zugänge führen zum Austausch des betroffenen Raums. Bei einem Providerfehler bleibt die Löschabsicht gespeichert und eine ausstehende Bereinigung wird angezeigt; eine sofortige Entfernung kann dann nicht zugesichert werden. Fehlende Konfiguration, fehlende Spielsitzung, Sperre und Verbindungsfehler erscheinen im Medienbereich.

Nicht abgenommen sind physische Mikrofone/Kameras, mobile Browser, entfernte Teilnehmer über HTTPS/WSS, NAT-Verbindungen oder ein im Browser erzwungener TURN-Relay-Pfad. Das vorhandene [check-turn.sh](../deploy/media/check-turn.sh) ist eine separate TURN-Prüfung und war kein Bestandteil dieser Browser-Abnahme. Ein tatsächlicher SFU-Ausfall während laufender Browsernutzung wurde nicht ausgelöst; Providerfehler wurden in gezielten Tests und die weitere App-Nutzung nach Raumende im Browser geprüft. Ein P2P-Fallback ist noch nicht implementiert. Bildschirmton hängt von Browser und gewählter Quelle ab und wurde nicht separat nachgewiesen.

Media-Laufzeitdaten, Räume und Zugangstokens gehören nicht zum [nativen Kampagnenexport](CAMPAIGN_RESTORE.md). Nach einer Wiederherstellung werden keine alten Medienverbindungen fortgesetzt.
