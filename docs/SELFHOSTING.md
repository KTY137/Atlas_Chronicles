# Selbst hosten — der Guide

Atlas Chronicles läuft in drei Formen. Alle drei benutzen **denselben Code**: dasselbe
Server-Paket, dieselben Migrationen, denselben Web-Client. Es gibt keinen „abgespeckten
Self-Host". Was sich unterscheidet, ist nur, **wer die Maschine betreibt** und **wie die
Mitspieler drankommen**.

Wenn du nur wissen willst, welche Dateien du brauchst: [Weg B](#weg-b--eigener-server-mit-docker)
ist die Antwort, und die Dateiliste steht unter [Was du wirklich brauchst](#was-du-wirklich-brauchst).

## Erst entscheiden: welcher Weg ist deiner?

| | **Gehosteter Raum** | **Weg A — Desktop** | **Weg B — eigener Server** |
|---|---|---|---|
| Wer betreibt die Maschine | wir | du, dein PC | du, dein Server/VPS |
| Was du können musst | nichts | eine Anwendung starten | Terminal, DNS, Docker |
| Mitspieler übers Internet | ja | **nein, noch nicht** | ja |
| Passkeys (Login ohne Passwort) | ja | ja (localhost) | nur mit eigener Domain + TLS |
| Textchat und App-Anwesenheit | ja | ja | ja |
| Deine Daten gehören dir | ja — `.chronicle`-Export | ja | ja |
| Stand heute | im Betrieb | unsignierte lokale App | funktioniert, TLS-Kante ungeprüft |

**Wichtig zum Datenbesitz:** Ein gehosteter Raum sperrt dich nie ein. Die Spielleitung kann
die vollständige Kampagne jederzeit als `.chronicle`-Datei herunterladen und woanders wieder
öffnen — siehe [CAMPAIGN_RESTORE.md](CAMPAIGN_RESTORE.md). Das Ende einer Hostingzahlung ist
kein Datenverlust. Self-Hosting ist deshalb eine Wahl, keine Notwehr.

---

## Weg A — Desktop

Der Vergleich, den alle im Kopf haben, ist Minecraft: eine Datei herunterladen, Doppelklick,
fertig. Genau dahin geht dieser Weg — **aber er ist noch nicht dort angekommen.** Was heute
existiert und was fehlt, steht ausführlich in [DESKTOP.md](DESKTOP.md).

**Was heute funktioniert.** Die Anwendung bringt ihr eigenes PostgreSQL 17 mit, startet den
Server selbst und öffnet denselben Web-Client wie alle anderen. Kein Docker, kein Terminal
im Betrieb, keine Datenbankinstallation. Mehrere getrennte Welten nebeneinander, Anhalten
und Fortsetzen, `.chronicle`-Import in eine neue leere Welt, gerätegebundene Sicherungspunkte.

**Was heute nicht funktioniert — und das ist der entscheidende Satz:** Der lokale Host lauscht
ausschließlich auf `127.0.0.1`. Er richtet **kein** DNS, **keine** Zertifikate und **keine**
Firewall- oder Router-Konfiguration ein. Du kannst damit also **noch keine
Mitspieler einladen.** Das ist Minecraft-Singleplayer; „Open to LAN" ist noch nicht gebaut.
Wer heute mit anderen spielen will, nimmt einen gehosteten Raum oder Weg B.

**Es gibt außerdem noch keinen Installer.** `package.mjs` erzeugt eine *unsignierte, entpackte*
Windows-Anwendung (rund 564 MB als Verzeichnis), ausdrücklich keine Release-Auslieferung.
Offen sind laut DESKTOP.md: signierter Installer und Update-Feed, ASAR-Integrität und Fuses
sowie die Abnahme mit NVDA und echten Geräten.

### Bauen und starten (heute: aus dem Quellcode)

Voraussetzung ist Node ab 22.12. Alles läuft **im Repository-Verzeichnis**:

```powershell
npm.cmd ci
node node_modules/electron/install.js
```

Dann das PostgreSQL-Laufzeitpaket bereitlegen. Lade
`postgresql-17.11-1-windows-x64-binaries.zip` von der offiziellen
[PostgreSQL-Windows-Seite](https://www.postgresql.org/download/windows/), lege das Archiv
nach `.local/desktop-runtime/` und prüfe seinen SHA256:

```text
6eabdf00d2893713b75db4336a23c3fdf505f056e217ec6e2e95d901750cfea3
```

Entpacke daraus **nur** `pgsql/bin`, `pgsql/lib`, `pgsql/share`, `pgsql/server_license.txt`
und `pgsql/commandlinetools_3rd_party_licenses.txt` in dasselbe Verzeichnis. Danach:

```powershell
node packages/desktop/tools/prepare-runtime.mjs
npm.cmd run desktop
```

`prepare-runtime.mjs` prüft das Archiv erneut und schreibt ein Manifest; bei jedem Start
werden Version, Herkunft und die Hashes aller ausgewählten Dateien nachgeprüft. Eine
eigenständige Anwendung erzeugst du mit `node packages/desktop/tools/package.mjs` — daneben
landet ein Nachweis mit exaktem Hash, Größe, Abhängigkeitsversionen und den noch offenen
Release-Gates.

---

## Weg B — eigener Server mit Docker

Das ist der Weg, der heute wirklich Mitspieler bedient. Er entspricht dem, was bei Minecraft
der eigene Server ist — nur dass Atlas eine Datenbank mitbringt und, anders als Minecraft,
für Passkeys eine echte Domain braucht.

### Was du wirklich brauchst

Die Dateien liegen alle in [`deploy/`](../deploy/) und kommen mit dem Repository:

| Datei | Wofür |
|---|---|
| `deploy/docker-compose.selfhost.yml` | der Verbund: `app` + `postgres`, dazu das Profil `tls` |
| `deploy/Dockerfile` | baut das Image — dasselbe Image, das auch gehostete Räume fahren |
| `deploy/Caddyfile` | automatisches HTTPS für deine Domain |
| `deploy/configure-selfhost.mjs` | erzeugt `deploy/.env` mit frischen Geheimnissen |
| `deploy/selfhost.env.example` | Vorlage, falls du `.env` von Hand schreibst |
| **`deploy/.env`** | **die einzige Datei mit Geheimnissen.** Nicht in Git, Modus 600 |

Dazu brauchst du:

- **Docker mit Compose** auf dem Server.
- **Das Repository selbst.** Es gibt heute noch kein veröffentlichtes Image in einer
  Registry — das Compose baut mit `build:` aus dem Quellcode. Du brauchst also den Klon,
  nicht nur die Compose-Datei. Das ist der größte Unterschied zu Minecrafts einzelner `.jar`.
- **Eine Domain**, deren A-Record auf diesen Host zeigt, und freie Ports 80 und 443.
  Ohne Domain funktionieren keine Passkeys — siehe [LAN ohne Domain](#lan-ohne-domain).

Deine Spieldaten liegen **nicht** in Dateien, sondern im Docker-Volume
`chronicle-postgres`. Das Gegenstück zu Minecrafts kopierbarem `world/`-Ordner ist bei uns
nicht dieses Volume, sondern der `.chronicle`-Export — portabel, versioniert und absichtlich
ohne Zugangsdaten.

### Einrichten

**Zuerst in den Klon wechseln.** Das ist der häufigste Fehler überhaupt: Alle folgenden
Befehle laufen *im* Repository-Verzeichnis, nicht in dem Ordner, in dem du `git clone`
aufgerufen hast.

```bash
git clone https://github.com/KTY137/Atlas_Chronicles.git
cd Atlas_Chronicles          # ohne diese Zeile schlaegt alles Folgende fehl
```

Geheimnisse erzeugen — einmalig, mit deiner echten Domain:

```bash
node deploy/configure-selfhost.mjs chronik.example.org
```

Das schreibt `deploy/.env` mit frisch erzeugtem Datenbankpasswort, Cookie-Schlüssel und
Einrichtungsschlüssel. Das Skript **gibt die Werte nie aus** und **überschreibt eine
vorhandene `.env` nie** — es bricht lieber ab, als deine Geheimnisse zu verlieren.

Starten:

```bash
docker compose --env-file deploy/.env \
  -f deploy/docker-compose.selfhost.yml \
  --profile tls up -d --build
```

Caddy holt beim ersten Start automatisch ein Zertifikat. Das setzt voraus, dass die Domain
bereits auf diesen Host zeigt und 80/443 von außen erreichbar sind.

### Erste Einrichtung im Browser

Öffne deine Domain. Die App fragt nach Name und **Einrichtungsschlüssel** — das ist
`BOOTSTRAP_TOKEN` aus `deploy/.env`:

```bash
grep BOOTSTRAP_TOKEN deploy/.env
```

Danach ist der Schlüssel wertlos; `/api/setup` meldet dann `required: false`. Mitspieler
kommen ab jetzt über Einladungslinks herein, nicht über den Schlüssel.

### LAN ohne Domain

Es geht auch ohne Domain, aber mit einer benannten Einschränkung. Trage in `deploy/.env` ein:

```bash
CHRONICLE_ORIGIN=http://192.168.1.5:3000
CHRONICLE_BIND=0.0.0.0
```

und starte **ohne** `--profile tls`. Spieler öffnen dann die IP direkt.

**Was dabei verloren geht:** Passkeys funktionieren nicht. Ein Browser erlaubt sie nur in
einem sicheren Kontext, und eine IP-Adresse darf keine rpId sein — das ist eine Regel des
Browsers, kein Fehler der App. Die Cookie-Wiederkehr ist in dieser Topologie eingeschränkt
und als offener Punkt P11 vermerkt. Deshalb bewerben wir diesen Weg nicht aktiv.

Die App verschweigt das nicht: `GET /api/reachability` sagt dem Client pro Origin, welche
Anmeldezeremonie tatsächlich angeboten wird. Es gibt kein stilles Herabstufen — fehlt eine
Ebene, benennt die App den Zustand.

`CHRONICLE_ORIGIN` muss **exakt** mit dem übereinstimmen, was die Spieler in der Adresszeile
stehen haben. Der Server prüft jeden `Origin`-Header dagegen. Ein `https` statt `http`, ein
fehlender Port oder ein Schrägstrich zu viel, und schreibende Anfragen werden abgewiesen.

### Textchat, Spielerbanner und Gespräche

Textchat, Spielerbanner und App-Anwesenheit laufen über den App-Server. Dafür sind keine
weiteren Dienste, Domains oder Portfreigaben nötig.

Eingebauter Sprach- und Videochat einschließlich Bildschirmfreigabe und Sprachräumen
wurde entfernt. Für Gespräche verwendet die Runde eine externe Anwendung.
Bestehende lokale Konfigurationsdateien werden bei dieser Änderung nicht gelöscht.
Früher eingerichtete Sprachdienste kann der Betreiber getrennt stilllegen; ein App-Update
beendet sie nicht automatisch. Das Datenbankvolume bleibt erhalten.

---

## Betrieb

**Sichern.** Zwei verschiedene Dinge, beide sinnvoll:

```bash
# Vollständige Maschinensicherung (enthält Zugangsdaten — sensibel behandeln)
docker compose --env-file deploy/.env -f deploy/docker-compose.selfhost.yml \
  exec postgres pg_dump -U chronicle -Fc chronicle > chronicle-$(date +%F).dump
```

Die `.chronicle`-Ausgabe aus der Spielleitungsoberfläche ist etwas anderes: portabel, ohne
Zugangsdaten, gedacht zum Umziehen und Weitergeben. Der Formatvertrag benennt auch
ausdrücklich, welche Laufzeitdaten *nicht* enthalten sind — siehe
[CAMPAIGN_FORMAT_V4.md](CAMPAIGN_FORMAT_V4.md). Für den geprüften Wiederherstellungsweg:
[CAMPAIGN_RESTORE.md](CAMPAIGN_RESTORE.md).

**Ein Paket endet bei 256 MiB, und das musst du wissen, bevor es dich trifft.** Seit
Formatversion 7 reisen die Bilder deines Wikis als base64 **im Paket** mit — mit dem üblichen
Drittel Aufschlag, und ein einzelnes Bild darf höchstens rund 64 MiB binär groß sein.
Überschreitet eine Kampagne die Grenze, bricht der Export mit „maximum campaign bundle size
exceeded" ab, statt ein unvollständiges Paket zu schreiben. Das ist die richtige Entscheidung
des Formats — ein Paket, das sich für vollständig ausgibt und es nicht ist, wäre schlimmer.

Für dich heißt es: **Der `.chronicle`-Export ist dein Umzugsweg, nicht deine Sicherung.**
Sichere die Datenbank mit `pg_dump` wie oben, und prüfe früh, ob deine Kampagne noch unter der
Grenze liegt — nicht erst an dem Tag, an dem du umziehen willst. Bilder füllen sie schnell.
Der Widerspruch zwischen dieser Grenze und dem, was an Speicher versprochen wird, ist als
offener Punkt festgehalten: [design/10](../design/10-hosted-betrieb-und-auslieferung.md) §1.10.

**Aktualisieren.**

```bash
git pull
docker compose --env-file deploy/.env -f deploy/docker-compose.selfhost.yml \
  --profile tls up -d --build
```

Migrationen laufen beim Start. Der Migrator sperrt gegen gleichzeitig startende Container
und prüft bei jedem Start die Prüfsumme jeder bereits angewandten Datei — ein Neustart auf
einer bereits migrierten Datenbank ist gefahrlos.

**Ein Update ist trotzdem ein kurzes Wartungsfenster, kein nahtloser Wechsel.** Die meisten
Migrationen sind erweiternd; danach läuft auch alter Code weiter. Einzelne sind verengend
(eine Spalte wird `NOT NULL`, ein Primärschlüssel wechselt), und ab einer solchen Migration
können alte und neue Programmversion nicht mehr gleichzeitig gegen dieselbe Datenbank laufen.
Das Zurückrollen der Anwendung ist dann **kein** Zurückrollen des Schemas. Sichere vor einem
Update, und lies die Migrationsdateien, wenn du einen größeren Sprung machst.

**Läuft es?** Drei Endpunkte mit drei verschiedenen Fragen:

| Endpunkt | Beantwortet | Wer fragt |
|---|---|---|
| `/api/live` | Läuft der Prozess und bedient er HTTP? Ohne Datenbank. | der Container-Healthcheck — das entscheidet über **Neustarts** |
| `/api/ready` | Antwortet auch die Datenbank, binnen 2 Sekunden? | Load Balancer oder du, bevor Verkehr fließt |
| `/api/health` | unverändert für bestehende Aufrufer | Bestandscode |

Die Trennung ist Absicht. Hinge der Neustart an einem Datenbank-Roundtrip, dann würde ein
ausgelasteter Spielabend den funktionierenden Server neu starten — und der Neustart würde
die Last weiter erhöhen. Eine tatsächlich ausgefallene Datenbank repariert ein Neustart
ohnehin nicht. Beide Sonden sind vom Rate-Limit ausgenommen, damit ein Verkehrsgipfel keinen
Scheinausfall meldet.

**Geheimnisse** stehen nur in `deploy/.env`. Nie in Logs, nie in Tickets, nie in einem
Screenshot fürs Forum.

**Offene Ports nach außen.** Mit `tls`: 80 und 443. Ohne Profile lauscht ausschließlich
`127.0.0.1:3000` — von außen dann gar nichts.

**Datenbankschrauben.** Die vier Werte unten sind bewusst gesetzt und über die Umgebung
überschreibbar, damit ein Laptop und ein gehosteter Raum sich unterscheiden dürfen, ohne
einen zweiten Codepfad zu erzeugen. Jeder verhindert einen benannten Ausfall — die
ausführliche Begründung steht in [deploy/README.md](../deploy/README.md).

| Variable | Vorgabe | Verhindert |
|---|---|---|
| `DB_POOL_MAX` | 10 | mehr Verbindungen, als Postgres zulässt |
| `DB_CONNECT_TIMEOUT_MS` | 10000 | endloses Warten; ein erschöpfter Pool sieht sonst aus wie ein toter Server |
| `DB_IDLE_TIMEOUT_MS` | 30000 | tagelang offene Backends bei ruhender Installation |
| `DB_STATEMENT_TIMEOUT_MS` | 30000 | eine entlaufene Abfrage, die ihre Verbindung belegt (0 schaltet ab) |

---

## Wenn etwas schiefgeht

**`npm error code EUSAGE` … „can only install with an existing package-lock.json"**, oder
**`ENOENT: no such file or directory, open '…/package.json'`**

Du stehst eine Ebene zu hoch. `git clone` erzeugt einen *Unterordner*; die Befehle gehören
hinein:

```powershell
cd Atlas_Chronicles
npm.cmd ci
```

**Caddy bekommt kein Zertifikat.** Zeigt der A-Record deiner Domain schon auf diesen Host?
Sind 80 und 443 von außen erreichbar und nicht von einem anderen Webserver belegt? Caddy
braucht beide — Port 80 für die Ausstellung, 443 für den Betrieb.

**Schreibende Anfragen werden abgewiesen, Lesen geht.** `CHRONICLE_ORIGIN` stimmt nicht
zeichengenau mit der Adresse überein, die die Spieler benutzen. Schema, Host und Port müssen
exakt passen.

**Kein Passkey-Angebot im Login.** Erwartet, wenn du ohne Domain über eine IP zugreifst.
`GET /api/reachability` sagt dir, was die App für dieses Origin tatsächlich anbietet.

**Der Server verabschiedet sich nach einem Postgres-Neustart.** Behoben: Der Pool hat einen
`error`-Zuhörer, protokolliert den Vorfall und überlässt dem Pool das Verwerfen der kaputten
Verbindung. Belegt in `packages/server/test/db-pool.pg.test.ts` gegen echtes PostgreSQL.
Trifft dich das trotzdem, bist du auf einem älteren Stand — aktualisieren.

---

## Was geprüft ist und was nicht

Diese Trennung gehört in einen Betriebsguide, weil sie darüber entscheidet, wo du selbst
nachmessen musst.

**Geprüft:**

- `docker compose config` löst App + Postgres mit und ohne das Profil `tls` auf.
- Das Image baut aus `deploy/Dockerfile`.
- App und Postgres aus diesem Compose lokal hochgefahren: `/api/health` ok, `/api/setup`
  verlangt Einrichtung, `/` liefert 200, POST ohne Origin wird abgewiesen.
- Der Desktop-Weg: eigenes PostgreSQL, echte DPAPI, Export und Wiederherstellung,
  vollständiges Anhalten und Neustarten — als isolierter Nachweis, nicht als Release.

**Nicht geprüft — hier misst du selbst nach:**

- Die **TLS-Kante gegen eine echte Domain.** Im Test gab es keine öffentliche Domain.
- Die **LAN-Topologie ohne Domain** ist offener Punkt P11 und deshalb nicht beworben.
- Der Desktop-Weg hat **keinen signierten Installer und keinen Update-Feed**, und er kann
  **keine Mitspieler von außen bedienen**.

Betriebs- und Architekturdetails, die über diesen Guide hinausgehen, stehen in
[deploy/README.md](../deploy/README.md).
