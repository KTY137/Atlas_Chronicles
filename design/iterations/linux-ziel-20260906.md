# M8 Linux-Ziel — Laufzeit, Prozessbesitz und was noch fehlt

Stand: 2026-09-06, Session `atlas-chronicels-da`. Dies ist Entwurfslinie und
Belegdokument, **keine gelieferte Funktion**. Der Code liegt als Patch in
`.local/linux-port/linux-port.patch` und ist in `packages/desktop` **nicht**
eingespielt — dieses Paket gehört einer anderen, gleichzeitig schreibenden
Session (siehe „Eigentum" unten).

## Auslöser

Kayas Frage war, ob Atlas Chronicles als Tauri-App für alle Distributionen
paketiert werden kann, wenn zusätzlich ein Steam-Release ansteht.

Die Runtime-Frage ist bereits entschieden und bleibt es: [RB-11](../research/RB-11-steam-vs-browser-verdict.md)
ratifiziert Electron über Tauri auf drei Befunden — das Steam-Overlay hakt sich
in Chromiums In-Process-GPU ein, nicht in WebView2; WebKitGTK ist genau auf dem
Linux-/Deck-Ziel eine dokumentierte Grafikbelastung, auf dem der WebGL-schwere
Pixi-Viewport lebt; und Electron enthält Node bereits, was den lokalen Host
architektonisch geschenkt bekommt. Eine unabhängige Neubewertung dieser
Entscheidung war beauftragt, ist aber an API-Rate-Limits gestorben und steht
weiterhin aus — **die Entscheidung gilt also als unverändert, nicht als neu
bestätigt.**

Der eigentliche Befund war ein anderer: „für alle Distros" scheiterte nicht an
der Shell, sondern daran, dass es **überhaupt keinen Linux-Build gab**. Die
Paketierung war auf `platform:"win32"` festgenagelt und die PostgreSQL-Laufzeit
auf ein Windows-Binärarchiv.

## Entscheidung 1 — Die Linux-PostgreSQL-Laufzeit wird selbst übersetzt

| Kandidat | Ergebnis |
| --- | --- |
| EnterpriseDB-Binärpaket, wie unter Windows | **Fällt aus.** `postgresql-17.11-1-linux-x64-binaries.tar.gz` antwortet mit HTTP 403; das Windows-Pendant liefert 200 und 340 MB. |
| `io.zonky.test` Embedded-Binaries | **Fällt aus.** Neueste 17er-Version ist 17.5.0. Das bräche die Versionsgleichheit mit Windows, und `postgres.ts` prüft `server_version` gegen `17.11`. |
| Übersetzen aus dem kanonischen Quelltext | **Gewählt.** Versionsgleich, gleiche Pinning-Disziplin, keine neue Fremdquelle im Vertrauensanker. |

Gepinnt: `postgresql-17.11.tar.bz2`, SHA256
`dd27f2b3c59e73ed14aa3324901242bf69a032a6347805f274e6260322d42979`, geprüft vor
dem Entpacken. Rezept: `.local/linux-port/pgbuild/Dockerfile`.

**Gemessenes Ergebnis:**

- Übersetzungsbasis Ubuntu 22.04. Debian 11 (glibc 2.31) wurde zuerst versucht
  und aufgegeben: `deb.debian.org` führt Versionen, die es nicht mehr ausliefert
  (`libperl5.32`, `libc-dev-bin` → 404), und `archive.debian.org` hat gar keine
  `bullseye-security`-Suite. Das Hauptarchiv allein lässt `libc6-dev` und `perl`
  unauflösbar.
- **Tatsächliche glibc-Untergrenze: 2.34** (höchstes benötigtes Symbol laut
  `objdump -T`), nicht 2.35 wie die Basis vermuten ließe. Deckt Ubuntu 22.04+,
  Debian 12+, Fedora 35+, Arch und SteamOS 3.
- Fremdabhängigkeiten nur `libc`, `libm`, `libz` — kein ICU, kein OpenSSL, kein
  readline. `libpq.so.5` liegt im eigenen Paket.
- **36 MB** gegen 340 MB beim Windows-Archiv. 1875 Dateien.
- `make install-world-bin` legt **keine Lizenzdatei** ins Präfix (per `find`
  geprüft). Der Build kopiert deshalb die Upstream-`COPYRIGHT` nach und das
  Manifest pinnt sie wie jede Binärdatei.

Offen: Electron 44 hat eine eigene glibc-Grenze. Liegt sie über 2.34, kostet
diese Wahl nichts; liegt sie darunter, sind wir das begrenzende Element.

## Entscheidung 2 — Prozessbesitz über Inode, nicht über Pfadstrings

Der Windows-Pfad beweist über `Win32_Process`, dass ein gefundener Postmaster
wirklich unserer ist, bevor er ihm je ein Stoppsignal schickt. Linux braucht ein
Äquivalent gleicher Stärke, sonst wird aus der Prüfung eine Höflichkeitsfloskel.

Gewählt: `stat("/proc/<pid>/exe")` und Vergleich von **Gerät und Inode** gegen
die ausgelieferte Binärdatei, statt Pfadstrings zu vergleichen. Das überlebt ein
umbenanntes Verzeichnis, entwertet einen Symlink, der nur so aussieht wie unser
Pfad, und braucht den `" (deleted)"`-Sonderfall von `readlink` gar nicht erst.

Dazu `postgresArgvOwnsDirectory` gegen `/proc/<pid>/cmdline` (NUL-getrennt,
unquoted, deshalb **nicht** mit der Windows-Regex zu erschlagen) und ein
UID-Abgleich. Alle Fehlerpfade schließen zu; es gibt keinen Rückfall auf eine
schwächere Prüfung.

**Bewusst weggelassen:** ein Startzeit-Abgleich gegen `postmaster.pid` Zeile 3
zum Schutz gegen PID-Wiederverwendung. Der Inode-Vergleich weist eine recycelte
PID mit jedem anderen Binary bereits ab, der argv-Vergleich eine mit unserem
Binary auf fremdem Verzeichnis. Übrig bliebe das Parsen von `/proc/<pid>/stat`
plus eine USER_HZ-Annahme — Risiko auf Fehlablehnungen ohne verbleibenden
Gewinn. Gemessen wurde die Differenz trotzdem: 1 s, hätte also ohnehin eine
Toleranz gebraucht.

## Entscheidung 3 — Geschlossene Prozessumgebung statt Allow-List

Windows filtert Hostvariablen über eine Allow-List. Linux bekommt eine **feste,
geschlossene** Umgebung (`PATH`, `LC_ALL`, `LANG`) und trägt gar nichts vom Host
weiter: der dynamische Loader beachtet `LD_PRELOAD` und `LD_LIBRARY_PATH`, libpq
beachtet `PGDATA`/`PGPORT`/`PGHOST`/`PGUSER`/`PGPASSWORD`. Eine Allow-List, die
eines davon übersieht, ist eine Injektionsstelle.

`TZ` bleibt bewusst ungesetzt: der Windows-Pfad erbt die Systemzone, und ein
erzwungenes UTC auf nur einer Plattform wäre eine stille Divergenz.

## Belege

Alles hier wurde ausgeführt, nicht hergeleitet.

| Prüfung | Ergebnis |
| --- | --- |
| Isolierte Arbeitskopie, Windows | 25/25 grün |
| Patch auf den **aktuellen** `packages/desktop` angewandt | sauber, Hunk 2 mit fuzz 2 |
| Gepatchter Baum inkl. der Tests der anderen Session | **37/37 grün** (recovery, controller-lifecycle, main-authority, setup-receipt) |
| Portierter Code gegen echten Postmaster im Linux-Container | **13/13 grün** |
| PostgreSQL-Lebenszyklus in Linux (initdb → start → status → smart stop) | vollständig, als unprivilegierter Nutzer |

`postmaster.pid` wurde gegen einen laufenden 17.11-Postmaster auf Linux
verifiziert: Index 0 = PID, 1 = Datenverzeichnis, 2 = Startzeit, 3 = Port. Damit
trägt die bestehende Analyse unverändert; einzig Index 4 (Socket-Verzeichnis)
ist Unix-spezifisch und wird nicht gelesen.

`/proc/<pid>/exe` ist **nur für den besitzenden Nutzer** lesbar — als anderer
Nutzer liefert es EACCES. Das ist genau der Fall, den die App trifft (sie hat den
Postmaster selbst gestartet), und der Grund, warum jeder Fehlerpfad zuschließen
muss.

## Eigentum und warum nichts eingespielt ist

`packages/desktop` ist **untracked** — `git ls-files` liefert 0 — und wurde
während dieser Arbeit fortlaufend von einer anderen Session beschrieben. Das
getrackte Root-`package.json` verdrahtet die Sache bereits über `desktop:build`,
`desktop` und `desktop:smoke`: der committete Baum verweist auf Code, den er
nicht enthält.

Nach `coord/PROTOCOL.md` beansprucht diese Session ausschließlich
`.local/linux-port/**` und diese Datei. Der Port wird als Patch geliefert und
vom Eigentümer eingespielt. Eine Sicherung der 26 Dateien liegt außerhalb des
Checkouts unter `../desktop-rettung-20260906`.

## Was noch fehlt

1. **Paketierung.** `package.mjs` ist weiterhin `platform:"win32"`, `build.mjs`
   kopiert die Laufzeit plattformblind. Nicht angefasst, weil beide Dateien der
   anderen Session gehören.
2. **`main.ts` Zeile 26** wirft weiterhin `"This desktop runtime supports
   Windows x64 only."` Der Riegel muss fallen, wenn der Rest steht.
3. **safeStorage auf Linux.** Der Windows-Entwurf verlangt Fail-Closed ohne
   Klartext-Rückfall. Auf Linux kann Electron auf `basic_text` zurückfallen, das
   mit festem Schlüssel „verschlüsselt". Ob `isEncryptionAvailable()` das
   abfängt, ist **ungeprüft** — der beauftragte Agent starb am Rate-Limit. Bis
   dahin ist die Fail-Closed-Zusage auf Linux **nicht belegt**.
4. **sharp und native Module** beim Querpaketieren von Windows aus: ungeprüft.
5. **Case-Sensitivity-Durchsicht** des übrigen Repos: ungeprüft.
6. Die Steam-Fragen (steamrt4, Overlay, Deck) bleiben gegatet nach RB-11 §4 und
   sind hier bewusst nicht bearbeitet.
