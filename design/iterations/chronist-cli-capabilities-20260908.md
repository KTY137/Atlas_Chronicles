# Chronist: konkrete CLI-Capabilities · 2026-09-08

Status: Claude-Profil implementiert; abschließende Gegenprüfung und Registry-/Hostintegration
bei Root. Codex und Gemini bleiben eigene offene Capability-Arbeitspakete. Dieser Bericht
ersetzt weder den vollständigen Chronist-Auftrag noch dessen Abnahme.

## Gepinnte Ausgangspunkte

| CLI | Tatsächlich geprüftes Binary | SHA256 | Ergebnis |
|---|---|---|---|
| Claude Code | Native Windows EXE, `2.1.261` | `f2f5d1a155167488aeb32cd263e15436253c7b1681ae147c9e73e4d6bbc3c852` | Exakter Textinput ist möglich; benötigt vollständige Bodybindung und beaufsichtigte Einmal-Brücke. |
| Codex | Native Windows EXE hinter npm-Paket `0.153.4` | `444a3f0008050605cae73cd9b7a2dcac61294062dfaab56dd20430fd6498518b` | Help und Version geprüft; keine vollständige Werkzeug-/Lesesperre belegt. Keine Modellabfrage ausgeführt. |
| Gemini | Nicht installiert; keine Auflösung durch `Get-Command gemini` | — | Kein exaktes Binary testbar; keine Installation oder Anmeldung vorgenommen. |

Der Codex-npm-Shim wird nicht als ausführbares Capabilityziel verwendet: Er startet einen
weiteren Launcher. Der konkrete native Pfad liegt unter
`@openai/codex/node_modules/@openai/codex-win32-x64/vendor/x86_64-pc-windows-msvc/bin/codex.exe`.
Claude wurde als native EXE ausgeführt, nicht durch PowerShell-Argumentweiterleitung.
`--version`/`--help` aller geprüften Programme liefen ebenfalls mit isoliertem Home und
leerer Accountumgebung. Kein persönliches Anbieterprofil und kein Keychain-/OAuth-Bestand
wurde ausgelesen. Die Versions- und Transportbelege liegen lokal in
`.local/chronist-cli-capability/*/evidence.json`; sie enthalten ausschließlich synthetische
Eingaben und Testantworten.

## Rote Gegenproben, die den Adapter bestimmen

1. **Leere Windows-Argumente:** Node `spawn(...,{shell:false})` erhält `--tools`, `""` sowie
   `--setting-sources`, `""` tatsächlich als getrennte Argumente. Die reale Claude-Anfrage
   hatte `tools:[]`; das Initialisierungsereignis hatte leere MCP-, Skill- und Pluginlisten.
   Ein gesonderter Windows-Prozesstest umfasst leere Strings, eingebettete Anführungszeichen,
   Leerzeichen, Unicode, Backticks und abschließende Backslashes.
2. **Systemprompt ist nicht alleiniger Modellinput:** `--system-prompt` zusammen mit `--bare`
   ließ zunächst eine SDK-Identität und einen dynamischen `currentDate`-Hinweis übrig.
   Außerdem änderten sich Metadaten mit Geräte- und Sitzungskennungen. Ein Renderer nur für
   die sichtbare Eingabe wäre damit falsch gewesen.
3. **JSON-Schema kann Werkzeuge zurückbringen:** `--json-schema` fügte trotz `--tools ""`
   tatsächlich das Werkzeug `StructuredOutput` hinzu. Dieses Flag ist im Chronist-Profil
   ausdrücklich ausgeschlossen. Das Schema gehört in den gebundenen API-Body.
4. **Retry-Zahl und Turn-Zahl reichen nicht:** Bei `CLAUDE_CODE_MAX_RETRIES=0` und
   `--max-turns 1` erzeugte ein Abbruch **nach empfangenem Streamanfang** zwei POSTs:
   zuerst `stream:true`, anschließend `stream:false`. Ein sofort geschlossener Socket hatte
   diesen Fehler noch nicht gezeigt. Der zweite Request ist ein interner Streaming-Fallback.
   `CLAUDE_CODE_DISABLE_NONSTREAMING_FALLBACK=1` reduzierte dieselbe Gegenprobe auf einen POST.
   Die Einmal-Brücke bleibt zusätzlich verpflichtend.
5. **Ein unerwarteter Read-Aufruf bleibt gesperrt:** Eine synthetische `tool_use`-Antwort
   für `Read` lieferte den CLI-Fehler, dass das Werkzeug nicht vorhanden ist. Es gab keinen
   zweiten Modellrequest. Der produktive HTTP-Decoder verwirft solche Antworten bereits
   vor einer nutzbaren Chronist-Antwort.

Die offiziellen Referenzen beschreiben die unterschiedlichen Flaggrenzen:
[Claude CLI](https://code.claude.com/docs/en/cli-reference),
[Bare-Modus und Authgrenze](https://code.claude.com/docs/en/headless).
Die konkreten obigen Aussagen beruhen auf aufgezeichnetem Verhalten des gehashten Binarys,
nicht auf einer vom Modell behaupteten Werkzeugfreiheit.

## Vollständiger eingefrorener Input

Das reine Profil `claude-cli-2.1.261-1` verwendet die Chronist-Systemanweisung, den kanonischen
Quellen-/Fakten-/Eltern-/Repairinput und `output_config.format` mit dem Chronist-Antwortschema.
Zusätzlich friert es `tools:[]`, `metadata:{user_id:"atlas-chronist"}`,
`thinking:{type:"disabled"}`, `temperature:1`, `max_tokens` und `stream:true` ein.
Das Modell ist auf den tatsächlich geprüften Namen `claude-sonnet-4-5-20250929` begrenzt.
Weitere Modellnamen benötigen eine eigene Capability-Gegenprobe.

Der Adapter schreibt exakt diesen bereits vermessenen `wireText` in eine eigene temporäre
Settingsdatei als `env.CLAUDE_CODE_EXTRA_BODY`. Die CLI erhält über stdin und
`--system-prompt` nur feste Platzhalter. Somit werden Quellentexte nicht als CLI-Kommandos,
Slash-Kommandos oder `@`-Dateiverweise verarbeitet. Die Windows-Gegenprobe mit einer
100.000 Zeichen langen synthetischen Eingabe bestand ebenfalls; der Produktvertrag erlaubt
pro Call höchstens 24.000 Eingabezeichen. Keine Quelle muss als Kommandozeilenargument passen.

Die dokumentierte Body-Erweiterung ersetzte im konkreten Binary sämtliche unerwarteten
Modellinputteile. Die Brücke vergleicht den gesamten empfangenen Body nach kanonischer
JSON-Abbildung mit `unit.dispatch.wireText`. Sie normalisiert nicht nachträglich den Inhalt
und ersetzt keinen abweichenden CLI-Body. Unterschiede führen vor externem I/O zum Fehler.
Native V16 kann denselben reinen Renderer ausführen; Zufallswerte, Datum und Secrets sind
kein Teil dieser Modellinputabbildung.
[Umgebungsvariablen](https://code.claude.com/docs/en/env-vars) dokumentieren
`CLAUDE_CODE_EXTRA_BODY`, Abschaltung von Compaction und Netzwerk-/Kontextanpassungen.

## Prozess- und Effektgrenze

Die Laufzeit besitzt folgende feste Reihenfolge, keinen zweiten Modellrunner:

1. Der bestehende LangGraph-Knoten bereitet die Einheit rein vor und beansprucht ihren Call.
2. Der Serveradapter prüft das aktivierte Profil sowie die Hashes der privaten Binarykopie
   und des Supervisors. Er verbraucht die vollständige Call-Capability genau einmal vor
   jeglichem Prozessstart. Erst dann prüft ein fester lesender Prozess erneut die Abwesenheit
   von maschinenweiten Claude-Policies; danach folgt der beaufsichtigte CLI-Start.
3. Ein fester Windows-Supervisor startet das Binary mit `CREATE_SUSPENDED`. Er ordnet es vor
   `ResumeThread` einem Job Object zu. `JOB_OBJECT_LIMIT_KILL_ON_JOB_CLOSE` beendet sämtliche
   Nachkommen, wenn der Supervisor normal endet oder vom Host abgebrochen wird. Maximal acht
   Prozesse gehören zu einem Job. Es wird kein Shellbefehl aus Quellen zusammengesetzt.
4. Die CLI kennt nur einen zufälligen lokalen Testschlüssel und den Loopback-Port. Die echte
   Anbieterberechtigung bleibt im Host. Sämtliche konfigurierten Proxykanäle führen zur
   lokalen ablehnenden Grenze; Telemetrie, Updates, Discovery, Anhänge und Hintergrundaufgaben
   sind ausgeschaltet. Nur der Host besitzt den festen externen Anthropic-Endpunkt.
5. Die Brücke schließt ihr lokales Einmaltor synchron, bevor sie Requestinhalt oder
   Autorisierung asynchron prüft. Erst nach exakter Bodygleichheit ruft sie
   `checkDispatch(permit,unit)` auf. Diese Serverprüfung bestätigt denselben bereits
   verbrauchten Call, Fence, Lease, Deadline, Rechte, Quellen und Abbruchstand. Sie verbraucht
   keinen zweiten Permit. Erst danach ist ein einziger externer HTTP-Request möglich.
6. Der bereits geprüfte HTTP-Decoder misst den tatsächlichen Stream, einschließlich bekannter
   Teilantwort vor Timeout/Abbruch/Ausgabelimit. Die zweite Streamhälfte geht zur CLI; ein
   erfolgreicher Abschluss benötigt zusätzlich deren eindeutiges erfolgreiches Endereignis
   mit demselben Antworttext. Rohfehler, Header und CLI-Kontometadaten werden nicht persistiert.

Ein Startfehler ohne Upstreamrequest ist `mayHaveExecuted=false` mit vollständiger bekannter
Nullausgabe. Die verbrauchte Call-/Inputreservierung bleibt als fehlgeschlagener Versuch
erhalten. Nach einem gesendeten Request werden bekannte Teilwerte erfasst; unbekannter Rest
bleibt gebunden. Ein zusätzlicher CLI-Request wird vor weiterem externen I/O abgewiesen.

Der native Supervisor ist als feste C#-Quelle in `cli-windows-job.ts` enthalten. Der Host
kompiliert ihn ausschließlich bei ausdrücklicher Aktivierung mit dem bereits vorhandenen
Windows-.NET-Compiler. Das installiert keine CLI und benötigt keine Anmeldung. Der echte
Windows-Test beendet einen Kindprozess samt realem Enkelprozess durch das Schließen des
Supervisorprozesses; beide PIDs sind anschließend beendet.

## Aktivierung und verbleibende Grenzen

`activateChronistCli` wird ausschließlich durch die ausdrückliche Hostkonfiguration ausgeführt.
Es erzeugt eine eigene Binarykopie, prüft deren festen SHA256-Hash, baut die Prozessgrenze und
führt einen echten lokalen Transport-Canary aus. Der Canary enthält künstliche Hook-, MCP-,
Skill- und CLAUDE.md-Marker in eigener Konfiguration sowie außerhalb seines Arbeitsverzeichnisses.
Geladene Hook-/MCP-Marker würden am lokalen ablehnenden Listener auffallen. Der Bytevergleich
prüft den vollständigen Input; die dokumentierte Bare-Grenze und das gepinnte Profil bleiben
die Grundlage für übersprungene Konfigurations-/Dateilesepfade. Eine fehlende Markerzeichenfolge
allein wäre kein allgemeiner Beweis, dass niemals eine Datei gelesen wurde.

Ein `available:true` aus JSON, HTTP oder einem Kampagnenpaket erzeugt keine Capability. Nur
ein vom laufenden Host erzeugtes Objekt besitzt den privaten Aktivierungsbeleg. Fehlendes
Binary, fehlender Schlüssel, nicht unterstützter Host und ungeprüfte Capability bleiben
unterscheidbare Verfügbarkeitszustände. `dispose` gibt die private Laufzeit nach dem Abbruch
und Drain aktiver Calls frei. Gehostete Hosts müssen die CLI-Grenze sperren.

Claude-Policyquellen werden nicht umgangen. Sind
`C:/Program Files/ClaudeCode/managed-settings.json`, `managed-settings.d` oder die
ClaudeCode-Policykeys in HKLM/HKCU vorhanden oder nicht zuverlässig prüfbar, scheitert die
Capability. Am Prüfrechner waren alle vier Quellen nach reiner Existenzprüfung abwesend.
Das veröffentlichte Binary enthält zwar den Namen `CLAUDE_CODE_MANAGED_SETTINGS_PATH`,
sein entsprechender Reader ist in diesem Build jedoch ohne Wirkung. Diese Variable wird
deshalb nicht als Isolation behauptet. Ein vom Betreiber während eines Calls verändertes
Hostsystem liegt außerhalb der Annahme einer unveränderten vertrauenswürdigen Hostkonfiguration.

Für Codex fehlt weiter eine allgemeine Text-/Werkzeug-/Kontextgrenze. Die offiziellen
[Konfigurationswerte](https://learn.chatgpt.com/docs/config-file/config-reference) unterscheiden
unter anderem HTTP- und Stream-Retries; das Abschalten einzelner Funktionen ersetzt keine
gesamte Capability. Gemini beschreibt eine Core-Tool-Allowlist und getrennte Hooks/MCP/
Extensions-/Skills-Einstellungen in der
[Konfigurationsreferenz](https://geminicli.com/docs/reference/configuration/). Ohne installiertes
gepinntes Binary gibt es dafür auf dieser Maschine keinen ausführbaren Nachweis. Der nächste
Schritt ist je CLI ein freigegebenes konkretes Binary mit derselben lokalen Gegenprobenmatrix;
bis dahin bleiben diese Anbieter ehrlich unverfügbar.

## Gezielte Prüfungen

`packages/server/test/chronist-cli-provider.test.ts` prüft die tatsächliche Windows-Prozessgrenze
und die Anbietergrenze. Die Native-CLI-Prüfungen werden nur bei ausdrücklich gesetztem
`ATLAS_CHRONIST_CLI_TEST_BINARY` ausgeführt und benötigen ausschließlich synthetische Transport-
antworten. Ohne dieses Argument bleibt sichtbar, dass die Nativefälle übersprungen wurden.
Es wird kein Modell befragt. Ausführung:

```powershell
$env:ATLAS_CHRONIST_CLI_TEST_BINARY='C:/Users/nukei/.local/bin/claude.exe'
node node_modules/vitest/vitest.mjs run packages/server/test/chronist-cli-provider.test.ts
```

Die elf Produktionsgegenproben bestanden mit dem realen Binary: Native-Erfolg, vollständiger
Permit, später Rechteverlust, abgebrochener Teilstream, Ausgabelimit, Abbruch, zweiter
authentisierter Brückenrequest, veränderter CLI-Body, Upstreamfehler ohne Retry/Detailleck,
gefälschte Capability sowie die beiden tatsächlichen Windows-Prozessprüfungen. Der
Aktivierungs-Canary mit Konfigurationsmarkern bestand als gemeinsame Voraussetzung.
Keine vollständige Suite ausgeführt; Registry-/Hostwiring, unabhängiger Review und integrierte
Chronist-/Native-Abnahme verbleiben bei Root.
