# Atlas Chronicles — Implementierungsplan

Stand: 2026-09-06. Auftrag: Die vorhandenen Entwürfe in eine tatsächlich benutzbare Anwendung überführen.

**Erstes Lieferziel:** Die Spielleitung startet Chronicle, erstellt eine Kampagne, lädt zwei Spieler ein und schreibt einen Wiki-Artikel. Nach einer gezielten Freigabe sehen beide Spieler unterschiedliche Inhalte. Artikel, Mitgliedschaften und Freigaben überleben einen Serverneustart.

Das ist der erste zusammenhängende Produktmeilenstein. Der vollständige Champion „Die Woche“, Karten, Regelbau und Kommunikation folgen in den unten benannten Ausbaustufen. Ein fertiges Fundament allein erfüllt diesen Meilenstein nicht.

## 1. Ausgangspunkt und verbindliche Entscheidungen

Auf dem Datenträger geprüft:

| Bereich | Tatsächlicher Stand | Nächster produktiver Schritt |
|---|---|---|
| `design/shell-lab/` | React-Prototyp mit sechs Bühnen, drei Looks und simulierten Daten; Typecheck und Produktionsbuild erfolgreich | Bestehende Shell in einen echten Client übernehmen und an Serverzustand anschließen |
| `packages/core/` | IDs, Scope, Commands, kanonische Serialisierung; Tests vorhanden | Browserverträglichkeit prüfen, Verträge in Server und Client durchsetzen |
| `packages/chronik/` | Datenverträge und nun getestete Lineage-/Merge-Funktionen | Transaktionales Speichern, Revisionen, API und Editor |
| `packages/szene/` | Datenverträge und nun getestete Containment-/Weltkeim-Funktionen | Importadapter, Persistenz und Atlasansicht |
| `packages/projection/` | Entry-Projektor als Bibliothek | Vollständige Tests und echte serverseitige, identitätsgebundene Verwendung |
| `packages/server/` | Angelegtes Datenbank-/Namenswachen-Grundgerüst | Domain-Services, Auth, HTTP und WebSocket implementieren |
| `packages/protocol/` | Paketmanifest, noch keine API-Schemas | Gemeinsame validierte Request-/Response-/Command-Verträge |
| Produktclient, Wiki-Import, Generatoradapter, Deployment | Noch nicht implementiert | Bestandteil dieses Plans |

Der unterbrochene Stand enthielt fehlende `lineage.ts`-/`containment.ts`-Exporte. Diese beiden Lücken sind im Übernahme-Checkpoint geschlossen. Das macht noch kein benutzbares Wiki und keine Kartengenerierung.

Die Quellen bestimmen Semantik und Reihenfolge:

- [Champion](../design/iterations/CHAMPION.md), insbesondere §12: vollständiger Abend/Woche-Ablauf und bestehende Gates.
- [Produktarchitektur](../design/06-giga-product-architecture.md), insbesondere §§11, 12, 16, 19, 21–22: gemeinsame Objekte, Commands, Projektion und vertikale Lieferung; übergreifend weiterhin ein Architekturentwurf.
- [Shell-Entscheidung](../design/07-shell-redesign.md): Band, Bühne, Instrument; natives Voice/Video ist beschlossen und ersetzt die ältere Ablehnung in Dokument 06.
- [Backend-Entscheidung](../design/08-backend-architektur.md): Node/TypeScript, Fastify, TypeBox, Postgres, PGlite, WebSocket; Hosted Rooms sind beschlossen.
- [Offene Entscheidungen](../design/iterations/OPEN-DECISIONS.md): insbesondere N3 Import-first, N7 Weltkeim als Provenienz und M3 bedingter Placement-Editor. Der neuere Beschluss S4=Ja hat Vorrang vor alten Einträgen.

## 2. Wo produktiver Code landet

```text
packages/
  client/       React/Vite-Anwendung, Routen, Serverzustand, Formulare
  ui/           aus der vorhandenen Shell extrahierte Tokens und UI-Bausteine
  core/         stabile IDs, Scope, Versionen und allgemeine Contracts
  protocol/     TypeBox-Schemas, Commands und projizierte API-Antworten
  chronik/      Wiki, Passage, Revision, Lineage, Provenienz
  projection/   Sicht, Leserprojektion, Such-/Karten-/Eventprojektion
  szene/        Orte, Regionen, Karten, Containment und Scene-Dokumente
  io/           Eron-/Dateiimport, Bundle-Export, Verlustberichte
  server/       Auth, Domain-Services, SQL, HTTP, WebSocket
  rules/        deklarative Regeln, Würfel, Auswertung und nachvollziehbarer Trace
  render/       MapRenderer mit Pixi-Implementierung und DOM-Fallback
  forge/        Generatoradapter, später Regel-/Theme-Autorenwerkzeuge
deploy/         Container, Compose, LiveKit/TURN-Konfiguration und Betriebsanleitung
e2e/            echte Browserabläufe mit getrennten Benutzerkontexten
```

Pakete entstehen mit ihrer ersten ausführbaren Funktion. Die Liste ist die Zielaufteilung, kein Auftrag, zunächst leere Ordner zu erzeugen. `design/` bleibt Referenz und Testkorpus. Produktcode importiert keine Lab-Komponenten oder Spike-Laufzeit; benötigte Bausteine werden gezielt übernommen, geprüft und im Produkt gepflegt.

`forge` bleibt von `chronik` unabhängig. Browserpakete erhalten keine Datenbank-, Cookie- oder privaten Domainmodelle. Insbesondere muss der aktuelle `node:crypto`-Import im Core an der Browsergrenze geklärt sein, bevor der Client den gesamten Core importiert.

## 3. Die erste Arbeitsfolge — bis zur benutzbaren Anwendung

### M0 — Fundament anschließen und Projektion beweisen

Dieser Schritt ist eine kurze Voraussetzung für M1, kein eigenständiger Produktabschluss.

| Ticket | Umsetzung und Dateifläche | Fertig, wenn |
|---|---|---|
| F01 | Root-Workspace, Boundary-Gate, Typecheck und Tests konsolidieren; Übernahme-Checkpoint erfassen | Ein frischer Checkout installiert reproduzierbar; fehlende Module und Bibliotheksgrenzen sind geprüft |
| F02 | `server/src/db/`: SQL-Modell gegen vorhandene Entry-/Passage-/Revision-/Revelation-Contracts vervollständigen; Migrationen und Transaktionen | Dieselben Migrationen laufen in PGlite und Postgres 17; Wiederholung, Rollback und referenzielle Integrität sind getestet |
| F03 | `protocol/` und `server/src/identity/`: Identität, Membership, Gastablauf, Ablaufzeiten, Widerruf, GM-Ersteinrichtung | Rollen kommen vom Server; manipulierter Join, abgelaufene Credentials und fremde Kampagnen werden abgewiesen |
| F04 | `projection/` plus authentifizierte HTTP-Leseroute | **S-P1** mit drei Lesern sowie Zwillingsbeweis gegen reale Serverantworten grün; keine verborgenen Inhalte, Rechtefelder, verräterischen Zähler oder Reihenfolgelücken |

F02/F03 können mit den reinen Wiki-/Kartenfunktionen parallel laufen. **F04 geht der neuen Produktoberfläche voraus**, wie in Dokument 06 §21 festgelegt. Die vorhandene visuelle Referenz ist bereits gebaut; dafür beginnt keine neue Designrunde.

Identität wird aus dem Spike fachlich übernommen, nicht ungeprüft kopiert: echte WebAuthn-Zeremonien statt frei angelieferter SPKI-Schlüssel; Challenge an Benutzer und Zweck binden; GM-Rechte beim Kopplungscode prüfen; auch wiederholte Antworten erst nach Halterprüfung ausliefern. Das SQL-Grundgerüst ist bis zu dieser Prüfung keine endgültig veröffentlichte Persistenzschnittstelle.

### M1 — Kampagne, Einladung und echtes Wiki

| Ticket | Umsetzung und Dateifläche | Abhängigkeit / sichtbares Ergebnis |
|---|---|---|
| P01 | `server/src/domain/`: Kampagne anlegen, auflisten, öffnen; Universe-/Campaign-Membership | F02/F03; die angemeldete GM besitzt eine gespeicherte Kampagne |
| P02 | `server/src/http/` + `protocol/`: Einladung ausstellen/widerrufen, Namenswache, Pending-Join, GM-Freigabe, einmalige Gast-Übernahme | P01; zwei getrennte Browser treten ohne Pflichtkonto bei |
| P03 | `chronik/` + Server: Entry erstellen/ändern/lesen, Revisionen, stabile Passage-IDs, Lineage und Reveal; optimistische Versionsprüfung | F02/F04; Speichern ist transaktional, parallele Änderungen erzeugen sichtbare Konflikte |
| P04 | `client/` + `ui/`: vorhandene Shell, Kampagnenauswahl, Join/Freigabe, Artikelliste, Reader und kleiner passagefähiger Editor anschließen | F04/P01–P03; echte API-Daten, Speicherstatus, Fehler- und Leerzustände |
| P05 | `e2e/`: GM plus zwei Spieler, Neustart und erneutes Öffnen | P01–P04; nachstehende Demo läuft automatisiert |
| P06 | `deploy/` + Root-Scripts: lokalen Start, Serverbuild und Clientbuild dokumentieren | P04/P05; ein dokumentierter Ablauf startet App und Postgres ohne Dateien unter `design/` auszuführen |

**Abnahmedemo M1:**

1. Leere Datenbank starten, GM einrichten, Kampagne anlegen.
2. Zwei Spieler über einen echten Einladungslink anmelden und freigeben; Namenskonflikt sichtbar behandeln.
3. Wiki-Artikel mit zwei Passagen verfassen und speichern.
4. Eine Passage an Spieler A, eine andere an Spieler B freigeben.
5. Beide Spieler öffnen dieselbe Artikel-URL. Browsernetzwerk und Seite enthalten jeweils nur die erlaubte Projektion.
6. Server und Browser neu starten: Kampagne, Mitgliedschaften, Artikel, Revision und Freigaben sind unverändert vorhanden.
7. Zwei GM-Tabs ändern dieselbe Revision: kein stiller Datenverlust; Konflikt erscheint im UI.
8. Einladung widerrufen und Credential entziehen: weder direkter HTTP-Aufruf noch erneute Verbindung umgehen den Entzug.

Die Oberfläche startet mit dem vorhandenen Obsidian-Look als reversibler Arbeitseinstellung. Vellum und Aurora bleiben als vorhandene Referenzen erhalten; daraus wird kein neuer Look-Beschluss abgeleitet. Nicht angeschlossene Funktionen erhalten keine simulierten Erfolgsmeldungen.

## 4. Weitere vertikale Ausbaustufen

### M2 — Das Wiki wird der tatsächliche Wissensspeicher

**Lieferung:** Eron importieren, Artikel verlinken und bearbeiten, zitierbare Historie öffnen, nach eigenem Wissen suchen und wieder exportieren.

- `io/`: deterministischer Import der vorhandenen Artikel-/Template-Daten; Infoboxen, Absätze, Listen, Überschriftenpfade, Redirects, rote Links und Rohblöcke. Vollständige Autorenhistorie explizit beschaffen/mitgeben; der letzte Bearbeiter genügt nicht.
- Reimport als Vorschau mit menschlicher Übernahme. Entfernte Quellpassagen löschen keine historischen Belege. Unbekannte Konstrukte und Medienlizenzen erscheinen im Verlust-/Quarantänebericht.
- Revision, Passage und Lineage gemeinsam persistieren; Split-/Merge-Operationen müssen frühere Zitate und unterschiedliche Empfängerkreise korrekt behandeln.
- Serverprojizierte Suche und Backlinks; geheime Treffer tauchen auch nicht in Trefferzahlen oder Vorschlägen auf.
- Versionierte `.chronicle`- und Rule-Package-Schemas, permissive Schema-Lizenz, veröffentlichbarer Referenzparser samt Fixtures und Nicht-Rückwirkungszusage. Bereits bekannte dauerhafte Objekte jetzt im Vertrag modellieren; ihre schreibenden Funktionen schrittweise implementieren. Spätere echte Vertragsänderungen erhalten explizite Migrationen. Export/Import ergibt einen leeren semantischen Diff.

**Abnahme:** Eron-Fixture mit dokumentierten erwarteten Passagen; wiederholter Import ist deterministisch; Bearbeitung und Quellenwechsel zerstören keine Zitate; Export lässt sich in einer leeren Instanz öffnen. Importbericht und gespeicherter Artikel sind im Client erreichbar.

### M3 — Importierter Atlas mit Orten und Wiki-Verknüpfung

**Lieferung:** Eine exportierte Welt laden, neu öffnen, einen Ort auswählen und gezielt mit einem Wiki-Artikel verbinden.

- Zuerst ein echtes, mit Herkunft dokumentiertes Azgaar-Full-JSON-Fixture einchecken. Die vorhandenen Messspikes sind kein vollständiger Exportkorpus.
- `forge/`: Full-JSON-Adapter mit Schema-/Größenvalidierung; Zellrelationen korrekt aus dem Export lesen. Minimalexport ohne passende Zellen liefert eine konkrete Fehlermeldung.
- Quelldatei, Hash, Generatorversion, Seed und Optionen behalten. Weltkeim ist Provenienz; identischer Seed allein verspricht keine identische Welt.
- `szene/` + Server: Orte, Geografie, politische Mehrfachbeziehungen, Koordinaten und Scene-Dokument atomar speichern. Zyklus-/Tiefenfehler dürfen keinen halben Import hinterlassen.
- `client/`: Atlasübersicht, Ortsnavigation und Pin-/Artikelbindung über den gespeicherten Graphen. Eine zunächst einfache Übersichtskarte ist als solche benannt; taktische Pixi-/Fog-Funktionen gehören zu M7.
- Keine automatisch erzeugten Artikelstümpfe. Ein generierter Ort bleibt ein Ort, bis ein Mensch einen Artikel anlegt oder verknüpft. Spieler erhalten nur einzeln freigegebene Knoten.

**Abnahme:** Echter Export → Importbericht → persistierte Karte/Ortsliste → Pin → Artikel; nach Neustart derselbe Pfad. Verborgene Kinder bleiben verborgen, auch wenn der Elternort bekannt ist. Quellenartefakt und Import sind exportierbar. **S-G1** wird gegen diesen Produktionsadapter nachgewiesen.

Die erste Kartengenerierungsfunktion ist damit die beschlossene Übernahme eines generierten Weltexports. Der eingebettete Generator und WFC haben einen eigenen späteren Schritt; sie werden nicht als bereits geliefert bezeichnet.

### M4 — Ein spielbarer Abend mit bleibenden Ergebnissen

**Lieferung:** Szene vorbereiten, am Outline-Tisch spielen, würfeln, ein Ergebnis bestätigen und dessen Herkunft im Wiki wiederfinden.

- Gemeinsame Objektverweise für Vorbereitung und Tisch; keine Kopien der Weltartikel. Figuren und Inventar unterscheiden Vorlage/Instanz und besitzen kampagnengebundene Kontrolle.
- `rules/`: kleines eigenes Demosystem über einen deklarativen, versionierten Vertrag; Dice-/Formula-IR, `haelt_etikett`, `erfahrungsgrad`, Begrenzungen und nachvollziehbarer Trace.
- Serverseitiger, deterministischer Wurf; zweiphasige Bestätigung, Idempotenz und atomare Prägung. `defeat_pending` braucht eine menschliche Bestätigung.
- Die **fünf geschlossenen Mint-Handler** des Champions einzeln auf produktive Commands und Regressionstests abbilden; kein generischer Endpunkt darf beliebigen Kanon schreiben.
- WebSocket-Befehle mit authentifiziertem Kontext, Versionsbedingungen, `seq`/Resume und erneuter Projektion. Wiederverbinden oder doppelte Zustellung darf keine Handlung duplizieren.
- UI für Szene, Charakterbezug, Roll-Trace, Pending-Ergebnis, Bestätigung und Herkunftsbeleg.

**Abnahme:** Vorbereitung → Tisch → Wurf → menschliche Bestätigung → zitierbare Passage. Zweiter Client sieht genau seine Freigaben. Reconnect und Retry erzeugen genau eine Prägung. Nachrechnen reproduziert den Beleg; die plattformübergreifende Gate-Matrix bleibt separat nachzuweisen.

### M5 — Kommunikation und Hosting im echten Betrieb

**Lieferung:** Persistenter Kampagnenkanal, echte Anwesenheit und funktionierendes Voice/Video mit sichtbarem Flüsterzustand.

- Vor dem Nachrichtenmodell die offene Vertragsfrage aus Dokument 07 §10 entscheiden: Aufbewahrung ausdrücklich verfasster Kampagnennachrichten gegenüber flüchtigem Tischchat und dem Champion-Gate **„Kein Protokoll“**. Kein dauerhaftes Sitzungsprotokoll stillschweigend durch Kanalpersistenz einführen.
- Kanal/Nachricht/Thread am gemeinsamen Objektmodell ausrichten; Würfelkarten und Kanonbelege referenzieren M4-Objekte.
- Präsenz und Reconnect über den Befehlsbus; das Band zeigt tatsächliche Verbindung statt Lab-Zufallszustände.
- LiveKit/coturn als eigener Medienpfad; Token-Minting und Track-Abos aus Membership ableiten. Flüsterkanal für Dritte sichtbar, Audio ausschließlich für Teilnehmer.
- Medienausfall im Client benennen; Wiki, Commands und Tisch bleiben benutzbar. Jede angebotene Ersatzverbindung muss tatsächlich geprüft sein.
- Derselbe App-/Postgres-/Medienverbund für Hosted und Self-Host; Healthchecks, Migration, Backup/Restore, Metriken und Zugangskonfiguration dokumentieren.

**Abnahme:** Drei reale Browser, Kanalzustellung nach Reconnect, Mikrofon/Video und selektives Hören; SFU stoppen, Tischbefehle weiter ausführen. Isolierte Kampagnen können sich nicht abonnieren. Self-Host wird auf einer benannten erreichbaren HTTPS-Topologie getestet; die offene LAN-Transportfrage P11 wird nicht mit einer allgemeinen Join-Zusage verdeckt.

Der Medienstrang kann nach M1 parallel zu M2–M4 beginnen. Ein Compose-Eintrag allein ist weder Voice-Abnahme noch Betriebsabnahme. Endgültige Produktionsdomain, Region und Kostenrahmen betreffen den späteren Betrieb und blockieren die lokale Implementierung nicht.

### M6 — Der vollständige Champion „Die Woche“

**Lieferung:** Die Kampagne funktioniert auch zwischen zwei Spielabenden.

- Dauerhafte Wiederkehr als ausdrücklicher Schritt: echte Passkeys, widerrufbarer Cookie-Fallback, Ausweis, sichere Geräteerneuerung und Zugangsvorfälle.
- Vollmachten mit bestehenden Freigabepassagen, serverseitigen Wochen-Caps, Ablauf und Widerruf; Wiederholbarkeit und konkurrierende Bestätigung testen.
- Vorhaben, Fällung, Brief/Übertragung mit Herkunft und Postlaufzeit, Lesestand und Umbruch als Zustandsdifferenz.
- Fokuswache sowie vollständige Herkunft mit beiden Datierungen und serverseitigem Augenblick in UI, Persistenz und Export tragen.
- Tablet-/Telefonablauf für Dienstag: Tür öffnen, würfeln, bestätigen, Beleg nachrechnen. Fremde Türen bleiben byte-identisch unsichtbar.
- Bundle-Roundtrip um Würfe, Vollmachten, Briefe, Augenblicke und alle übrigen dauerhaften Zustände vervollständigen.

**Abnahme:** Der vollständige Ablauf in Champion §12.1 läuft in der Anwendung. Technische Gates werden automatisiert; Prägerate und W0–W3 brauchen die dort verlangten echten Spielabende/Wochen. Ein synthetischer Test ersetzt diese Produktmessungen nicht. M1–M5 werden deshalb nicht als vollständiger Champion-Slice verkauft.

### M7 — Die taktische Karte

**Lieferung:** Szenenkarte mit echtem Pixi-Renderer, Tokens, Kamera und sichtabhängigen Karteninhalten.

- `render/`: `MapRenderer`-Boundary mit Scene/Patch/Camera/Hit-Test, Capability-Erkennung, Aufräumen und DOM-Parität.
- Tile-Pyramide, große Karten, zoomabhängige Darstellung, Regions-/Entity-Bindung und Figuren-/Token-Kontrolle.
- Fog/Sicht pro Figur auf Grundlage derselben Serverentscheidung wie Wiki und Orte; Renderer führt keine zweite Rechtepolitik ein.
- Bewegung, Auswahl und Layer erst über validierte Commands mit Undo-/Versionssemantik; Livezustand bleibt vom Plan getrennt.

**Abnahme:** **S-K1/S-T1** im echten Browserpfad, benannte Referenzhardware und realistische Last; zugänglicher DOM-Pfad bleibt benutzbar. Die bisherige DOM-Bildkarte und Lab-Messungen gelten hierfür nicht als Nachweis. Terminierung folgt der Canvas-Reihenfolge des Champions.

### M8 — Autorenwerkzeuge und Veröffentlichung

**Lieferung:** Ein fremdes, deklaratives Regelsystem samt Bogen erstellen, live verwenden und verlustbewusst exportieren; Kampagnenthemes speichern und zugängliche Darstellungen erlauben.

- Visueller Regel-/Bogenbau auf der bereits laufenden Engine: Schemaformen, Formula-/Action-Editor, Trace-Vorschau und Paketversionierung.
- Theme-Presets bearbeiten/speichern/teilen; lokale Accessibility-Präferenzen bleiben wirksam. Bestehende Token-Looks werden zu gepflegten Produktbausteinen.
- Exportadapter und Fidelity Reports für die beschlossenen Zielformate; kein Launchversprechen ohne geprüften tatsächlichen Adapter.
- Public Reader standardmäßig aus, explizite Veröffentlichung, stabile URLs/Aliase, Zuordnung alter eingehender URLs, vollständige SEO-Hülle und öffentlicher Mint-Feed über dieselbe öffentliche Projektion; Eron-Medien nur nach nachgewiesener Einzeldatei-Provenienz.
- Electron als Verpackung derselben Anwendung, mit geprüftem lokalen Host-/Update-/Sicherungspfad. Browser bleibt dieselbe Codebasis.

**Abnahme:** Fremdes Package erfüllt die vier P4-Klauseln aus Dokument 06: live spielbar, Sicht in der Würfelrechnung, zitierbare Prägung, Export mit Fidelity Report. Theme-Roundtrip, nicht rückwirkende Paketupdates und Desktop-Smoke gehören zur jeweiligen Freigabe. Die Publikationsabnahme umfasst Zwillingsbeweise über Reader, Feed, SEO, Social Cards und Vorschauen sowie die Weiterleitung bestehender Inbound-URLs.

**Releasegrenze:** M6 beweist den Champion-Ablauf, noch nicht sämtliche Launch-Voraussetzungen. Die geerbten Publikations-, Format-, Export- und Package-Gates dieser Stufe bleiben Launch-Voraussetzungen; kein Entwicklungsmeilenstein hebt sie auf. Die taktische Leinwand behält ihre gesonderte Slice-Reihenfolge.

### M9 — Eigene Generierung und bedingter Karteneditor

**Lieferung:** WFC-/Generatorarbeit auf dem stabilen Welt-/Scene-Vertrag, anschließend gegebenenfalls Placement-Werkzeuge.

- Nach Enginevertrag und grünen S-P1/S-G1/S-K1: versionierte WFC-Grammatik, deterministische Testkarten, Abbruch-/Budgetgrenzen und direkt speicherbares Scene-Ergebnis.
- Ein eingebetteter externer Generator braucht die bereits geforderten Versions-, Lizenz- und Sicherheitsnachweise; import-only bleibt bis dahin der ausgelieferte Weg.
- Placement-Editor bleibt an **Entscheidung M3 in OPEN-DECISIONS.md** und dokumentierte Nachfrage gebunden; das ist nicht der Atlas-Meilenstein M3 dieses Plans. Terrain-Paint/Assetkatalog sind kein stillschweigender Teil des Generatorauftrags.

**Abnahme:** Generieren → speichern → Szene öffnen → Ort/Wiki verknüpfen → exportieren, mit nachvollziehbarer Generatorversion und geprüfter Assetherkunft. Der Pfad läuft in `packages/`, nicht in einer neu angelegten Spike-Seite.

## 5. Parallelisierung ohne Dateikollisionen

Maximal vier aktive Arbeitsspuren; jede hat genau einen Eigentümer ihrer Dateien.

| Spur | Eigentum | Start / Übergabe |
|---|---|---|
| Integration | Root-Konfiguration, `protocol/`, `server/src/http/`, `client/`, `ui/`, E2E, Plan/STATUS | Verdrahtet erst die geprüften Contracts; startet UI nach F04 |
| Backend | `server/src/db/`, `server/src/domain/`, `server/src/identity/`, zugehörige Tests | F02/F03/P01–P03; DB-/Domain-API vor Clientintegration festlegen |
| Wiki | `chronik/`, `io/`, zugehörige Tests | Bestehende Lineage konsolidieren; Persistenzvertrag gemeinsam mit Backend, danach Import/Export |
| Karten | `szene/`, danach `forge/`-Importadapter, zugehörige Tests | Reine Adapter/Fixtures parallel vorbereiten; Integration M3 nach Projektion und Speichern |

Nach den Übergaben werden freie Spuren für Browserprüfung, unabhängige Rechte-/Datenprüfung und Medienintegration verwendet. Backend und Wiki schreiben niemals gleichzeitig dieselbe Migration. Keine Session installiert Dependencies oder verändert Root-Aliase neben der Integrationsspur.

## 6. Wann eine Stufe fertig ist

Eine Stufe ist erst fertig, wenn ihr benannter Nutzerablauf in der wirklichen App funktioniert:

1. UI, API und Datenbank sind verbunden; sichtbare Handlungen haben echte Wirkung.
2. Authentifizierung, Autorisierung, Eingabevalidierung und Fehlerzustände tragen denselben Ablauf.
3. Relevante Integrationstests laufen gegen das tatsächliche SQL; die Browserabnahme nutzt getrennte Rollen.
4. Speichern, Neustart, doppelte Zustellung und konkurrierende Änderung sind dort geprüft, wo die Stufe sie einführt.
5. Boundary-Gate, Typecheck, Tests und Produktbuild sind grün. Vor einer Veröffentlichung werden die zusätzlichen bestehenden Launch-Gates vollständig durchlaufen.
6. `STATUS.md` nennt implementierte Funktionen, genaue Startbefehle, Testergebnisse und offene Arbeit. Jeder Abschluss hat einen nachvollziehbaren Commit und eine vorführbare Demo.

Aktuell vorhandene Prüfbefehle: `npm.cmd run gate`, `npm.cmd run test`, sowie im Lab `npm.cmd run build`. Produktstart, Produktbuild und Browser-E2E sind **Zielbefehle**, die in P05/P06 implementiert werden; sie existieren heute noch nicht.

Die Reihenfolge dieses Plans ist die Arbeitsplanung. Aufwand wird nach F04 und der ersten durchlaufenen M1-Demo aus gemessener Arbeit geschätzt; die alten Architektur-Schätzungen sind keine Liefertermine. Der nächste Implementierungsauftrag umfasst **F01–F04 und P01–P06**, bis die oben beschriebene GM-/Zwei-Spieler-Demo mit dauerhaften Daten läuft.
