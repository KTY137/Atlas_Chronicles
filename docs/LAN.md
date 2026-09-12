# Gemeinsam im Heimnetz spielen

Der Desktop kann eine Welt auf einer ausgewählten privaten IPv4-Adresse anbieten.
Spielleitung und Mitspieler öffnen dieselbe Adresse; der Hostrechner bleibt während
der Runde eingeschaltet. Diese Anleitung gilt für den Entwicklungsstand vom
12. September 2026 mit der Auswahl **Wer kann beitreten?** im Hostfenster.

## Desktop starten und einladen

1. Verbinde Host und Mitspieler mit demselben WLAN oder LAN. Ein Gast-WLAN kann
   Geräte voneinander isolieren.
2. Beende eine bereits laufende Welt im Hostfenster. Wähle unter **Wer kann
   beitreten?** die Heimnetz-Adresse deines WLAN- oder Ethernet-Adapters, etwa
   `192.168.178.54`. **Nur dieser Rechner** bleibt der Standard. Die Auswahl gilt
   für diesen Start und verändert keine gespeicherte Weltkonfiguration.
3. Starte die vorhandene Welt oder lege eine neue an. Bei einer neuen Welt richtest
   du die Spielleitung im Hostfenster ein und legst dort eine Runde an.
4. Erzeuge unter **Einladen** einen Einladungslink. Er enthält die ausgewählte
   IP-Adresse und den eigenen Port der Welt. Mitspieler öffnen den ganzen Link im
   Browser und geben ihren Namen an.
5. Gib die Person unter **Vor der Tür** frei. Sie wählt anschließend **Die Runde
   betreten**. Einladung und Freigabe gelten genauso wie im lokalen Modus.
6. Öffne mit **Spiel öffnen** deine eigene Spieloberfläche. Karte, Chat,
   Anwesenheit und Live-Aktualisierungen verwenden denselben HTTP-/WebSocket-Port.

In einer zweiten Desktop-App lässt sich dieselbe Adresse auch unter **Mit einem
Server verbinden** öffnen. Aktiviere dafür ausdrücklich **HTTP im vertrauten
Heimnetz verwenden**. Im Browser ist diese Einstellung nicht nötig.

## Wiederkommen und die Adresse wechseln

HTTP im Heimnetz ist unverschlüsselt und gehört in ein vertrautes Netz. Passkeys
sind über diese Adresse nicht verfügbar. Eine Gastsitzung gilt acht Stunden;
**Diesen Browser merken** verlängert den Browserzugang auf 30 Tage. Gelöschte oder
abgelaufene Cookies erfordern eine erneute Anmeldung.

Unter **Mitglieder → Zugangslink** erzeugt die Spielleitung einen zehn Minuten
gültigen, einmal verwendbaren Link für eine bestehende Person. So meldet sie sich
mit derselben Identität wieder an. Das gilt auch für die Spielleitung selbst.
`localhost` und eine LAN-IP haben getrennte Browsersitzungen; nach einem Wechsel
kann deshalb ebenfalls ein Zugangslink nötig sein. Figuren und Runden bleiben in
derselben Welt. Noch ausstehende Ersteinrichtungsbelege bleiben an ihre ursprüngliche
Adresse gebunden.

Wechselt die IP-Adresse durch ein anderes WLAN oder DHCP, beende die Welt und
starte sie mit der aktuellen Adresse neu. Alte Links enthalten weiterhin die alte
Adresse: Erzeuge neue Links. Eine feste DHCP-Zuordnung im eigenen Router kann die
Adresse stabil halten. Eine wiederhergestellte Host-Sicherung startet lokal;
bestehende LAN-Mitglieder können anschließend über Zugangslinks wiederkommen.

## Wenn ein anderes Gerät nicht hereinkommt

| Beobachtung | Nächster Schritt |
| --- | --- |
| Die Auswahl enthält keine Heimnetz-Adresse | WLAN/LAN-Verbindung prüfen. Es werden private IPv4-Adressen aus `10.0.0.0/8`, `172.16.0.0/12` und `192.168.0.0/16` angeboten. |
| Der Link enthält `localhost` | Welt beenden und vor dem Start eine Heimnetz-Adresse auswählen; neuen Link erzeugen. |
| Der Link geht am Host, aber nicht am zweiten Gerät | Gleiches Netz, Gastnetz-/Client-Isolation, VPN-Routen und die Windows-Firewall prüfen. |
| Die Welt meldet eine nicht mehr verfügbare Adresse | Aktuelle Adresse im Hostfenster auswählen und neu starten. |
| Anmeldung erscheint nach einem Adresswechsel | Einen Zugangslink für die bestehende Person erzeugen. |
| Schreiben oder Live-Verbindung wird abgewiesen | Die komplette angezeigte Adresse einschließlich `http` und Port verwenden. Aliasnamen und andere Origins werden im Heimnetzmodus abgewiesen. |

Falls eine Firewall-Regel nötig ist, beschränke sie auf die verwendete
Atlas-Anwendung, den angezeigten TCP-Port, die gewählte lokale IP, das Profil
**Privat** und Geräte im lokalen Subnetz. Die App richtet keine Firewall-Regeln,
Routerweiterleitungen, Zertifikate oder Internetfreigaben ein. PostgreSQL und die
Hostverwaltung bleiben ausschließlich auf dem Hostrechner.

## Eigener Server statt Desktop

Der bestehende Server verwendet ebenfalls einen ausdrücklichen HTTP-LAN-Modus.
In `deploy/.env` für den Compose-Betrieb:

```dotenv
CHRONICLE_ORIGIN=http://192.168.178.54:3000
CHRONICLE_BIND=192.168.178.54
CHRONICLE_PORT=3000
CHRONICLE_INSECURE_LAN=1
```

Die Beispieladresse durch die eigene Adresse ersetzen und den Verbund ohne
`--profile tls` starten. Bestehende Geheimnisse und Datenbankeinstellungen bleiben
in der eigenen Konfiguration. Für den direkten Node-Server setzt `HOST` die
Bind-Adresse und `PORT` den Port; `CHRONICLE_ORIGIN` und
`CHRONICLE_INSECURE_LAN=1` gelten genauso. Die normale Servereinrichtung steht in
[SELFHOSTING.md](SELFHOSTING.md).

Ohne diese ausdrückliche Einstellung bleiben Sitzungscookies `Secure`.
Der HTTP-Modus akzeptiert ausschließlich eine kanonische private IPv4-Origin.
`HttpOnly`, `SameSite=Strict`, exakte Host-/Origin-Prüfung, Sitzungsprüfung und
Rundenberechtigungen bleiben aktiv. Es gibt keine allgemeine CORS-Freigabe.
Für eine HTTPS-Domain bleibt `CHRONICLE_INSECURE_LAN=0`.

## Prüfung vom 12. September 2026

Der gezielte Prüfstand benutzt neue Testwelten und isolierte Datenbanken. Der
reproduzierte Ausgangsfehler war ein `Secure`-Cookie auf einer HTTP-LAN-Adresse.
Die Regression und die Transport-, Adapter-, Hoststart- und Desktop-Grenzen stehen
in `packages/server/test/lan-network.test.ts` und den Desktop-Tests.

Die Browserprüfung `e2e/lan-network.spec.ts` läuft einmal über `localhost` und
einmal über eine tatsächliche Adapter-IP. Zwei getrennte Browserkontexte durchlaufen
Einladung, Freigabe, Cookie-Anmeldung, erneutes Laden, Wiederanmeldung per
Zugangslink sowie WebSocket-Anwesenheit und Nachrichtenaktualisierung. Fremde
Origins und WebSocket-Origins sowie unberechtigte Spieleraktionen müssen scheitern.
Die LAN-Variante prüft zusätzlich den kanonischen Host und den HTTP-Kontext.

```powershell
$env:CHRONICLE_TEST_LAN_IP='192.168.178.54'
npx.cmd playwright test e2e/lan-network.spec.ts --reporter=list --output=.local/lan-network-playwright
npm.cmd run desktop:build
node packages/desktop/tools/lan-smoke.mjs
```

Der Desktop-Smoke startet den kompilierten Electron-Host mit eigenem PostgreSQL
und einem neuen Profil unter `.local/desktop-profiles/lan-*`; ein separater
Edge-Browser tritt über den erzeugten Link bei. Sein Prüfbeleg bleibt als
`evidence.json` im Testverzeichnis. Die Tests öffnen keine Produktionsprofile und
ändern keine Firewall-Regeln.

Gemessen auf Windows mit WLAN-Adresse `192.168.178.54`:

- Fokussierte Server-/Desktop-Prüfung: **52/52 Tests** in sieben Dateien bestanden,
  einschließlich verschlüsselter, an die ursprüngliche Origin gebundener
  Ersteinrichtungsbelege. `npm.cmd run typecheck` bestanden.
- Abschließender Browserlauf: **2/2 Abläufe** mit je zwei getrennten Clients
  bestanden, über `http://localhost:49695` und `http://192.168.178.54:56246`.
  Der LAN-Lauf prüft auch den Kopierknopf ohne sichere Zwischenablage-API und
  den markierten Link bei verweigerter Kopiergeste. JSON-Belege:
  `.local/lan-network-final/lan-network-localhost-real-4e4fb-return-and-two-live-clients/network-evidence.json`
  und `.local/lan-network-final/lan-network-lan-real-brows-412d8-return-and-two-live-clients/network-evidence.json`.
- Kompilierter Desktop mit PostgreSQL **17.11** und separatem Edge-Browser:
  **6/6 Prüfungen** bestanden, tatsächlich unter
  `http://192.168.178.54:58033`. Dauer 15:05:32–15:07:45 UTC.
  Beleg: `.local/desktop-profiles/lan-rWiNbD/evidence.json`.
  Die Welt und der Listener wurden geordnet beendet.
- Die Desktopkopie wurde nach dem abschließenden Browserlauf erneut gebaut:
  **182 Clientdateien** kopiert und **sieben Asset-Pakete** geprüft. Die endgültige
  Oberfläche enthält damit auch den Kopier-Fallback. Der unveränderte LAN-Kern hat
  den oben genannten nativen Nachweis; dieser letzte Kopiervorgang wurde nicht
  als weiterer nativer Test ausgegeben.
- Ein erster Desktopversuch wartete nur 90 Sekunden auf die unter paralleler
  Prüflast langsamere Initialisierung. Der Host wurde danach über den echten
  Management-IPC geordnet beendet. Der Smoke wartet jetzt auf den expliziten
  Bereitschaftszustand und schreibt bei Fehlern Status und Screenshot; die
  Anwendung selbst bekam dafür keine neue Startwiederholung.

Der direkte HTTP-Negativtest nutzt `node:http`, weil das hier verwendete Node
24.18 `fetch` einen vorgegebenen `Host`-Header verwirft. Derselbe Befund wurde für
die kanonischen Host-Header der Container-Liveness-/Readiness-Probes berücksichtigt.

Zwei Clients auf dem Hostrechner über dessen LAN-IP beweisen den Netzwerkpfad und das Browserverhalten;
eine Verbindung von einem zweiten physischen Gerät samt dessen WLAN- und
Firewall-Bedingungen bleibt separat zu prüfen. Die Docker-/TLS-Auslieferung wird
durch diese gezielte Desktop-/Browserprüfung nicht als abgenommen behauptet.
