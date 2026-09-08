# Chronistvertrag: unabhängige Gegenprüfung · 2026-09-08

Prüfstand: `d6065a9` mit fremdem, uncommittetem Kartenstand im Checkout
`experimental/featureliste-20260907`. Gegenstand ist ausschließlich
`chronist-completion-20260908.md`, noch keine Chronistimplementierung. Migration
027/native v16 bleiben reserviert. STATUS und vollständige Feature-Abnahme wurden
gelesen; Kartenlieferung, freier NPC-Generator und GUI bleiben bei Root.

**Urteil:** Der Ansatz ist tragfähig. Vor paralleler Umsetzung müssen insbesondere
Fehlerverbrauch, dauerhafte Request-/Einheitenbelege und die CLI-Capabilities
präzisiert werden. Es gibt keine Grundlage, alle drei genannten CLIs bereits als
belegt textbeschränkt zu behandeln. Die folgenden Befunde sind Vertragslücken
oder nachgewiesene Eigenschaften des bestehenden Codes, keine Behauptung neuer
Produktfehler in einer noch nicht existierenden Implementierung.

Nur dieses neue Dokument wurde geschrieben. Keine Produktionsänderung, kein
Commit, keine Abhängigkeit installiert, keine Schlüssel gelesen und kein Modell
befragt. Ausgeführt wurden Dateilesungen, Git-Lesungen, `--help`/`--version` der
vorhandenen CLIs und Primärquellenabrufe. Python-LangGraph ist **1.2.11**; kein
Workflow gestartet und kein zweiter Runner angelegt. LangSmith wurde nicht aktiviert.

## 1. HOCH — Fehlgeschlagene Calls können bekannten Teilverbrauch nicht zurückgeben

**Beleg:** Entwurf Zeilen 197–212 gibt Verbrauch ausschließlich in
`ChronistProviderReply` zurück. Der Zweig `ChronistCallOutcome.kind = failed`
besitzt nur Fehlercode und `mayHaveExecuted`. Zeilen 305–318 verlangen dagegen
vollständige Reservierung, exakte Verbuchung bekannter Ausgabe und unbekannte
Token/Kosten als `null`.

**Konkreter Gegenfall:** Ein Adapter empfängt 9000 Zeichen und einen Usage-Zwischenstand,
bricht danach wegen Timeout, Abbruch oder Ausgabelimit ab. Über den vereinbarten
Port kann er weder diese bekannten Zeichen noch Dauer/Token/Kosten melden.
`recordCall` erhält dieselbe Form wie bei einem Abbruch vor dem ersten Byte.
Eine alternative Nebenverbuchung im Provideradapter würde eine zweite, im
Vertrag nicht beschriebene Effektgrenze schaffen.

**Begrenzte Korrektur:** Usage-Evidence in **jeden** Outcome aufnehmen, getrennt
nach bekannten Werten und unbekanntem Rest; keine Teilantwort muss deshalb als
Vorschlag gespeichert werden. Vor Dispatch Callzahl, vollständige Eingabe und
maximale Ausgabe atomar reservieren. Bei ungewissem Ausgang bleibt die
Ausgaberestreservierung erhalten; tatsächliche bekannte Werte ersetzen sie nur
nach festgelegter Abschlussregel. Ein weiterer Versuch addiert seine eigene
Reservierung. Native v16 validiert diese Rechnung aus den Einzelbelegen.

**Gegenprobe:** Zwei parallele Calls mit zusammen gerade ausreichendem Budget;
einer liefert Teiltext und endet `output-limit`, der andere läuft weiter.
Export/Restore/Resume dürfen den bekannten Verbrauch oder die gebundene
Restmenge nicht reduzieren. Zusätzlich ein Timeout vor und nach erstem Byte.

## 2. HOCH — Submission-Requesthash ist aus den aufgelisteten Daten nicht eindeutig prüfbar

**Beleg:** Entwurf Zeilen 395 und 430–451 speichern Entwurf, Command-ID,
Requesthash und ACK, nennen aber kein eingefrorenes Einreichungsrequest.
Zeilen 538–546 verlangen dessen Neuberechnung. `documents.ts:117–121,141`
normalisiert bzw. ergänzt den Slug und trimmt den Titel.

**Konkreter Gegenfall:** Bei einem neuen Artikel können ein weggelassener Slug
und ein ausdrücklich angegebener, gleich normalisierter Slug denselben Artikel
und ACK erzeugen. Ebenso verschwinden Titel-Leerzeichen beim Speichern.
Ein Hash über das ursprüngliche Submit-Objekt lässt sich deshalb aus Zielrevision
und ACK nicht rekonstruieren. Auch `expectedVersion` des Vorschlags muss am
damaligen Request hängen, nicht aus einem heutigen Versionsstand geraten werden.

**Begrenzte Korrektur:** Eine geschlossene `submissionRequest`-Struktur dauerhaft
beim Vorschlag ablegen, mit Version, Operation, menschlicher Identität, Kampagne,
Vorschlags-ID, Command-ID, erwartetem Vorschlagsstand/Entwurfhash und Ziel.
Normalisierung und Umgang mit optionalen Feldern **vor** dem Hash genau festlegen.
Ein Startbeleg braucht entsprechend das kanonische Startrequest, soweit seine
Felder nicht verlustfrei aus dem unveränderlichen Snapshot ableitbar sind.
Ein identischer autorisierter Retry benutzt den gespeicherten Original-ACK vor
heutigen Quellen-/Ziel-CAS-Prüfungen, wie der Entwurf bereits richtig vorgibt.

**Gegenprobe:** Neuer Artikel mit optionalem Slug, Einreichung, spätere Ratifikation,
weitere Artikelbearbeitung, Export/Restore und identischer Retry. Zusätzlich ein
inhaltlich geändertes Request mit gleicher Command-ID: 409, keine neue Revision.
Native-Tamper ändert das gespeicherte Request bei unverändertem Hash: Ablehnung.

## 3. HOCH — Crash-/Parallelrechnung benötigt einen ausdrücklichen dauerhaften Callzustand

**Beleg:** Entwurf Zeilen 305–318,343–346,404–409 verlangt Reservierungen,
maximal zwei tatsächliche Versuche, monotonen Verbrauch, Lease/Fence und späte
Belege. Die Tabelle nennt nur allgemein „Callbelege“; der gemeinsame Port
`claimCall(unit, attempt)` beschreibt weder deren geschlossenen Zustand noch
die Antwort auf einen bereits beanspruchten, noch nicht abgeschlossenen Versuch.

**Befundart:** Konkrete Designlücke, kein beobachteter Race. Ein wiederholter
Claim desselben Versuchs darf keinen zweiten Permit erteilen; ein laufender
fremder Call ist aber auch keine schon aufgezeichnete Antwort. Die aktiv
verbrauchte Zeit muss außerdem bei Prozessverlust nachvollziehbar bleiben.
Nur am normalen `finish` gemessene Laufzeit würde nach jedem Crash zurückfallen.

**Begrenzte Korrektur:** Vor Builderteilung eine Call-Evidence-Struktur mit
eindeutigem `(runId,unitId,attempt)`, Requesthash, reservierten Mengen, Fence,
Dispatchstatus, Zeitbelegen und monotonem Abschluss definieren. Wiederholter
Claim eines aktiven Versuchs liefert einen eindeutigen Halt-/Wartezustand; ein
verwaister Dispatch wird `unknown`, nie wieder `not-sent`. Ein Permit muss beim
Adapter nur einmal für den Dispatch konsumierbar sein. Aktive Laufzeit durch
durable Ausführungsintervalle mit begrenztem Crashende abrechnen; Budget- und
Leaseupdates erfolgen unter derselben kurzen Sperre. Laufweite und globale
Parallelplätze dürfen nicht schon beim bloßen Verlust des Lease-Besitzers frei
werden, solange alte Calls noch laufen bzw. deren Ablaufgrenze nicht erreicht ist.

**Gegenprobe:** Doppelter Claim vor Dispatch; Prozessverlust nach Reservierung,
nach Dispatch und nach Antwortbeleg; alter Fence liefert spät nach neuem Besitz.
Budget und Kandidaten bleiben eindeutig, ein expliziter zweiter Versuch ist
zusätzlicher Verbrauch. Zwei getrennte PostgreSQL-Verbindungen verwenden:
`db/index.ts` serialisiert PGlite-Transaktionen absichtlich und kann echte
Cross-Process-Konkurrenz allein nicht belegen.

## 4. HOCH — Drei CLI-Namen sind noch kein belegter gemeinsamer Textmodus

**Beleg im Vertrag:** Zeilen 359–363 verlangen für `codex`, `claude`, `gemini`
einen dokumentierten Aufruf ohne Agententools/Dateizugriffe. Der verlangte Modus
ist strenger als lediglich nichtinteraktive Ausgabe oder ein Schreibschutz.

| CLI | Tatsächlich geprüft | Tragfähige Aussage und offene Grenze |
|---|---|---|
| Claude Code | Lokal `2.1.261`, `claude --help`; aktuelle offizielle CLI-Referenz | `--tools ""` deaktiviert Built-ins. MCP ist gesondert auszuschließen; `--bare` beschränkt automatische Kontext-/Hook-/Pluginentdeckung. Nichtinteraktives `--print` allein ist kein Textmodus. |
| Gemini CLI | Nicht im lokalen PATH; offizielle Konfiguration, Headless-/Plan-Doku und Quellcode | `tools.core: []` lässt nach dem geprüften Registrycode keine über `maybeRegister` registrierten Core-Tools zu. Zusätzlich MCP, Hooks, Extensions, Skills und andere Discoverypfade kontrollieren. Headless beschreibt Ausgabe; Plan erlaubt ausdrücklich Lesezugriffe und das Schreiben von Plandateien. |
| Codex CLI | Lokal `0.153.4`, `codex.cmd exec --help`; offizielle CLI-/Konfigurationsreferenz | `--ephemeral` und `--ignore-user-config` sind vorhanden. `--sandbox read-only` beschreibt eine Sandbox für Modellkommandos, keine Abschaltung der Kommandos oder von Lesezugriffen. `features.shell_tool=false` deckt nur einen Werkzeugpfad. Eine dokumentierte vollständige No-Tools-Capability wurde in diesen Quellen **nicht belegt**. Das ist keine Behauptung technischer Unmöglichkeit. |

Primärquellen: [Claude CLI](https://code.claude.com/docs/en/cli-reference),
[Gemini Konfiguration](https://geminicli.com/docs/reference/configuration/),
[Gemini Registrycode](https://github.com/google-gemini/gemini-cli/blob/main/packages/core/src/config/config.ts#L3715),
[Gemini Headless](https://geminicli.com/docs/cli/headless/),
[Gemini Plan](https://geminicli.com/docs/cli/plan-mode/),
[Codex CLI](https://learn.chatgpt.com/docs/developer-commands?surface=cli),
[Codex Konfiguration](https://learn.chatgpt.com/docs/config-file/config-reference).

**Begrenzte Korrektur:** Pro gepinntem Binary einen ausführbaren Capability-Vertrag
mit exaktem Argumentvektor, kontrolliertem Arbeitsverzeichnis/Umfeld, deaktivierter
Kontextentdeckung, Werkzeug-/MCP-/Hookgrenze, Sessionpersistenz und Exit-/Usage-Schema
festlegen. Claude: leeres Built-in-Set plus leere strikte MCP-Konfiguration,
deaktivierte Anpassungen und keine Sessionpersistenz; `--bare` kann die verfügbare
Authentifizierungsart verändern, wie lokale Hilfe ausdrücklich beschreibt.
Gemini: leere Core-Allowlist plus dokumentierte `hooksConfig.enabled=false`,
`admin.mcp.enabled=false`, `admin.extensions.enabled=false` und
`admin.skills.enabled=false`; zusätzliche Registry-/Discoverypfade des exakten
Releases prüfen. Leere Arrays und leere CLI-Argumente müssen beim Windows-Spawn
unverändert ankommen. Codex erst nach Nachweis aller relevanten Werkzeug- und
Kontextpfade als diese Capability registrieren; einzelne Featureflags nicht
als vollständige Sperre ausgeben.

Damit bleibt die vollständige CLI-Lieferung ein konkretes Arbeitspaket.
Die Registry darf einen noch ungeprüften Adapter sichtbar als nicht verfügbar
führen; das erfüllt allein jedoch nicht die offene CLI-Abnahme. Ein im Modell
formuliertes „benutze keine Tools“ ersetzt den technischen Nachweis nicht.
Providertransport-Doubles müssen zudem feststellen, dass CLI-interne Retries,
Kompaktion und Zusatzaufrufe nicht als nur ein begrenzter Modellcall verbucht werden.

## 5. MITTEL — Anhängen über den bisherigen Writer erhält alte Passageautoren nicht

**Beleg:** Entwurf Zeilen 463–468 verlangt unveränderte vorhandene Passagen.
`documents.ts:41–42` rekonstruiert sie ohne `autorUserId`/`autorActorId`.
`saveEntry` setzt in Zeilen 129–131 auch bei unverändertem Inhalt den aufrufenden
Menschen als `autorUserId`; Pfade und Tags bekommen leere Defaults, falls sie
nicht erneut geliefert werden. Der native Parser kennt diese Autorinformationen
im historischen Snapshot ausdrücklich (`campaign-bundle.ts:337–343`).

**Konkreter Gegenfall:** GM B hängt einen Chronistantrag an einen Artikel von GM A.
Ein bloßes Wiederverwenden von `saveEntry` für die alten plus neuen Blöcke schreibt
auch die Autorenschaft alter Passagen auf B um. Ein eigener Schreiber, der nur
`source().passagen` übernimmt, verliert vorhandene optionale Snapshotmetadaten.
Kanonstatus kann dabei erhalten bleiben; das widerlegt den Metadatenverlust nicht.

**Begrenzte Korrektur:** Den internen Append-Intent am gesperrten aktuellen
Revisionssnapshot aufbauen und dessen vorhandene Passagen inklusive optionaler
Autoren, Pfade, Tags, Geltung und Prägung verlustfrei übernehmen. Nur neue PIDs
erhalten menschlichen Autor, `antrag` und `praegung=null` vor der Hashbildung.
Bekannte alte leere Snapshots benötigen eine ausdrückliche, geprüfte Behandlung,
keine erfundene historische Autorenschaft.

**Gegenprobe:** Artikel mit verschiedenen Autoren, Pfaden, Tags und Kanonpassage;
zweiter GM reicht Antrag ein. Alte Passageobjekte und Tags bleiben gleich,
nur die neuen Passagen kommen hinzu. Ein Fehler beim anschließenden
Vorschlags-ACK rollt den gesamten Dokument- und Vorschlagsschreibvorgang zurück.

## 6. MITTEL — Striktes JSON muss das tatsächliche Checkpointer-Protokoll abdecken

**Beleg:** Entwurf Zeilen 411–423 kombiniert echte `BaseCheckpointSaver`-Methoden,
Fan-out, Interrupts und begrenzte Vorgängerhaltung mit einem strikt einfachen
JSON-Serializer. Der gepinnte Checkpoint-Serializer 1.1.5 behandelt zusätzlich
`undefined`, `Error`, `Send` und `DeltaSnapshot`:
[Serializerquelle](https://github.com/langchain-ai/langgraphjs/blob/%40langchain%2Flanggraph-checkpoint%401.1.5/libs/checkpoint/src/serde/jsonplus.ts#L176).
LangGraph 1.4.14 schreibt Fan-out-Pakete als `Send` in den `TASKS`-Kanal:
[ChannelWrite](https://github.com/langchain-ai/langgraphjs/blob/%40langchain%2Flanggraph%401.4.14/libs/langgraph-core/src/pregel/write.ts#L111).

**Befundart:** Kompatibilitätslücke der Spezifikation, kein belegter Ausfall des
noch fehlenden Adapters. Ein `JSON.stringify`/`JSON.parse`-Paar ist allein weder
eine verlustfreie Serialisierungszusage noch ein Beleg für funktionierende
Interrupt-/Pending-Write-Wiederaufnahme. `Send` muss nicht als frei konstruierbare
Klasse wiederbelebt werden; ein validiertes Datenpaket genügt.

**Begrenzte Korrektur:** Explizites, versioniertes Wire-Schema für die verwendeten
Frameworkwerte und internen Kanäle festlegen. Notwendige Undefined-/Error-Tags
kontrolliert kodieren, erlaubte Send-Ziele und Argumente prüfen, ausschließlich
Daten rekonstruieren. Unbenutzte Typen wie `DeltaSnapshot` bewusst ausschließen;
bei DeltaChannels wäre das Abschneiden der Vorgängerkette ohne vollständigen
Seed falsch. `putWrites` muss die reservierten negativen Write-Indizes und die
unterschiedliche Wiederholungssemantik normaler/spezieller Writes erhalten,
wie [BaseCheckpointSaver](https://github.com/langchain-ai/langgraphjs/blob/main/libs/checkpoint/src/base.ts#L279)
und [MemorySaver](https://github.com/langchain-ai/langgraphjs/blob/main/libs/checkpoint/src/memory.ts#L449)
vorgeben. Pruning nur nach atomar gespeichertem Nachfolger und erhaltenen
abhängigen Pending-Writes; kein frei importierter Router.

**Gegenprobe:** Echte StateGraph-Ausführung ohne Modell, zwei Fan-out-Kinder,
eines erfolgreich und eines unterbrochen, DB schließen/neu öffnen, Resume;
erfolgreiches Kind wird nicht doppelt angewandt. Erneut nach Pruning und
native-v16-Roundtrip, zusätzlich Error-/Undefined-/Send-Tamper. Das prüft das
Frameworkverhalten, statt nur selbst erzeugte JSON-Fixtures zurückzulesen.

## 7. MITTEL — Einheitenbelege und historische Freigabeidentitäten müssen Pruning überleben

**Beleg:** Entwurf Zeilen 59–69 und 179–184 bindet alle Modellinputs an die
vollständige Quellenmenge; Zeilen 300–303 enthält transitive Zwischenabrisse.
Zeilen 394–395 nennen keinen eigenständigen unveränderlichen Einheitenkatalog.
Zeilen 415–417 erlauben Checkpoint-Pruning, während 538–543 alle Einheiten und
Requesthashes nach Restore semantisch prüfen will. `bundles.ts:154–157` sammelt
historische User ausschließlich aus benannten **Top-Level-Spalten** der Tabellen.

**Konkrete Lücken:** Eine nur im inzwischen gelöschten Checkpoint vorhandene
Einheit kann einen später exportierten Kandidaten nicht belegen. Freie
`sourceIds` plus beliebiger Prompt beweisen auch nicht, dass alle Promptinputs
in dieser Menge liegen. Resumiert ein anderer GM einen fremden Lauf, liegt dessen
erneute Zustimmung voraussichtlich in JSON; ohne eigene historische Referenz
kann er nach Mitgliedschaftslöschung aus der User-Sammlung verschwinden.

**Begrenzte Korrektur:** Innerhalb der vorgesehenen zwei Tabellen einen begrenzten,
unveränderlichen Einheiten-/Dispatchkatalog außerhalb der wegwerfbaren Checkpoints
festlegen. Er enthält den deterministischen Plan, Quellspans, Quellen-/Faktbezüge,
Elterneinheiten und Hashes der verwendeten Zwischenantworten. Reihenfolge der
Quellen vor Scopehash **und** Einheitenbildung kanonisieren; der Entwurf sortiert
den Scope, spricht beim Teilen jedoch von Quellenreihenfolge. Native berechnet
Prompt/Dependencies aus dieser geschlossenen Rezeptur nach. `facts` dürfen nur
aus den gepinnten Quellen abgeleitet sein; kein kompletter GM-Timeline-Stand im
Prompt einer angeblich kleineren Einheit. Alle historischen Freigabe-/Resume-
Menschen explizit aus einem streng validierten Evidence-Schema sammeln und im
Bundle referenzieren; die bloße Wahl vorhandener Spaltennamen löst JSON-Historie
nicht. Aktuelle Mitgliedschaft ist davon getrennt.

**Gegenprobe:** Zusammenfassung kennt sichtbares A und geheimes B, zitiert nur A;
Spieler bekommt weder Karte noch abgeleitete Zähler. Dasselbe über zwei
Zwischenabrisse nach Checkpoint-Pruning/Restore. Zusätzlicher GM gibt Wiederaufnahme
frei und verlässt danach die Kampagne: seine historische Identität bleibt
exportierbar, seine alte Zustimmung autorisiert keinen neuen Call.

## Bereits richtig entschiedene Grenzen

- `SourceRef.revisionId` pinnt den Entry-Kopf, nicht `passages.revision_id`.
  Das ist nötig: `documents.ts:127–154` erlaubt Inhaltsänderung bei gleicher PID
  und Generation. Der Entwurf blockiert außerdem die Bearbeitung einer anderen
  Passage desselben Artikels konservativ. Hier kein neuer Fehlerbefund.
- Vollständige transitive Abhängigkeiten statt Modellzitate als Berechtigung,
  erneute Sichtprüfung und 404 bei verdeckter Quelle passen zur bestehenden
  Projektion (`documents.ts:49–93`). Die noch fehlende Implementierung muss diese
  Grenze auch bei Listen, Cursor-/Zählerdaten und Einzelabrufen verwenden.
- Antragstatus vor Snapshot/Hash ist zwingend richtig. `mintRatifikation`
  verlangt bereits `antrag` (`gameplay.ts:296`); sein späteres `kanon` darf die
  historische Einreichungsprüfung nicht ungültig machen. `campaign-bundle.ts:330`
  prüft den gespeicherten Snapshot-Hash, nicht einen nachträglich geänderten Status.
- Gemeinsame äußere Transaktion ist ausführbar: `createDocuments(tx, cfg)` benutzt
  den übergebenen DB-Handle; verschachtelte Transaktionen sind in beiden
  DB-Adaptern Savepoints. Kein neuer unabhängiger Commit ist erforderlich.
- Sitzungskontext darf nicht einfach `getRoll`/`replayRoll` weiterreichen:
  `gameplay.ts:44,279–281` liefert vollständige Receipts. Die ausdrückliche
  Projektion, Replayprüfung und menschliche Speicherung im Entwurf beheben genau
  diese mögliche Anschlussfalle; `listRolls` ist tatsächlich auf 100 begrenzt.
- Native v16 als additive Fassade über v15, originaler ACK, Restore ohne Start,
  neue Runtime-Fence und erneute externe Zustimmung sind richtig. Die bestehende
  Restore-Semantik vergleicht nach dem Import das erneut exportierte Bundle
  (`bundles.ts:243–244`); Laufzeit-Invalidierung darf deshalb die historischen
  importierten Belege nicht still umschreiben.

Root kann diese Vertragsschärfungen in die Design-Lineage übernehmen und dann
Engine, Daten/IO und UI über die bereits vorgesehenen Knoten des vorhandenen
Feature-StateGraph freigeben. Erforderlich sind gezielte echte Adapter-/DB-/
Browsergegenproben; eine volle Suite oder echte Modellanfrage ist dafür nicht nötig.
