# Chronist, Sprachpaket, Figurenantrag — Umsetzungsplan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Den Chronist abnahmefähig machen, ein englisches Oberflächen-Sprachpaket einführen und Spielern den Figurenantrag ermöglichen.

**Architecture:** Drei Teilprojekte in einer Branch mit disjunkten Dateiflächen je Aufgabe. A baut auf dem committeten Codex-Snapshot `eebd27a` auf. B legt eine Nachricht-als-Schlüssel-Übersetzung über den unveränderten deutschen Quelltext. C fügt Antragstabellen, Native V17 und Routen additiv hinzu, ohne eingefrorene Tabellen anzufassen.

**Tech Stack:** TypeScript-Monorepo, Fastify, PostgreSQL 17, React 19 mit Vite, Vitest, Playwright, Electron 44, LangGraph JS für den Chronist-Graphen.

**Spec:** `docs/superpowers/specs/2026-09-08-chronist-sprachpaket-figurenantrag-design.md`

## Global Constraints

- Arbeitsverzeichnis ausschließlich `C:/Users/nukei/Desktop/PROJECTS/project_atlas/Atlas_Chronicles/.claude/worktrees/featureliste`, Branch `experimental/featureliste-20260907`.
- Agenten committen nicht und benutzen kein `git stash`; sie melden geänderte Dateien, der Koordinator committet je Aufgabe.
- Nur die je Aufgabe genannten Dateien ändern. Wer eine fremde Datei braucht, meldet das statt sie zu ändern.
- Keine volle Vitest-Suite. Gezielt: betroffene Suiten plus Konsumenten der geänderten Exporte (`grep -rln` auf den Export). Typecheck `npx tsc -p tsconfig.json --noEmit`; fremde Fehler aus parallelen Aufgaben werden gemeldet, nicht repariert.
- SPDX-Kopfzeile `// SPDX-License-Identifier: BUSL-1.1` und Copyright-Zeile wie in jeder Quelldatei; nicht in `.sql`-Migrationen.
- Migration 027 und Native V16 gehören dem Chronist, 028 und V17 dem Figurenantrag. Eingefrorene Tabellen (`campaign-schema-v2.ts`, 001 bis 026) werden nie geändert.
- Nichts wird automatisch Kanon. Kein Egress ohne serverseitig geprüfte Freigabe. Kein Schlüssel in Deskriptor, Fingerprint, Fehlertext, Export oder Renderer.
- Deutsche UI-Texte bleiben im Quelltext; Englisch nur im Katalog. Datenschlüssel, gespeicherte Titel, HTBAH-Paket, Assetnamen und Exportformate werden nie übersetzt.
- `LANGSMITH_TRACING` und `LANGCHAIN_TRACING_V2` bleiben aus.

---

## Teil A — Chronist fertigstellen

### Task A1: Rote Chronist-Tests und CLI-Prozessgrenze

**Files:**
- Modify: `packages/server/test/chronist-provider-registry.test.ts:50`
- Modify: `packages/server/test/chronist-document-proposal.test.ts:117`
- Modify: `packages/server/src/chronist-providers/cli-windows-job.ts`, ggf. `cli.ts`
- Modify: `packages/server/test/chronist-http-provider.test.ts` (auf Vitest)
- Create: `packages/io/test/native-v16-roundtrip.test.ts`
- Modify: `STATUS.md` (nur der Chronist-Absatz mit der Zahl „42")

**Interfaces:**
- Consumes: `currentCampaignTables()` aus `packages/io/src`, `CAMPAIGN_V16_TABLES` aus `packages/io/src/native-v16/schema.ts`, Job-Object-Supervisor aus `cli-windows-job.ts`.
- Produces: keine neuen Exporte. Der Roundtrip-Test exportiert nichts.

- [ ] **Step 1:** `npx vitest run packages/server/test/chronist-provider-registry.test.ts packages/server/test/chronist-document-proposal.test.ts packages/server/test/chronist-cli-provider.test.ts` ausführen; die drei Fehler wörtlich notieren.
- [ ] **Step 2:** Registry-Test: das gefälschte Activation-Objekt so typisieren, dass `availabilityCode` den Vertragstyp (`string | null` laut `packages/chronist/src/types.ts`) trägt; kein `as any`.
- [ ] **Step 3:** Proposal-Test Zeile 117: das V15-Bundle aus `currentCampaignTables()` minus `CAMPAIGN_V16_TABLES` bauen, damit `tables.chronist_laeufe` nicht im V15-Schema landet. Erwartung: 11/11 grün.
- [ ] **Step 4:** CLI-Test Zeile 221 lesen: der Fall verlangt, dass ein suspendiertes Kind nach dem Supervisor-Kill nicht mehr existiert. Ursache in `cli-windows-job.ts` finden (Job-Object mit `JOB_OBJECT_LIMIT_KILL_ON_JOB_CLOSE`, Prozessbaum). Fix im Produkt, nicht im Test. Erwartung: Test grün, kein verwaister Prozess (`tasklist` nach dem Lauf).
- [ ] **Step 5:** `chronist-http-provider.test.ts` von `node:test` auf `vitest` (`describe/it/expect`) umstellen, Inhalt und Fälle unverändert. Ausführen; Anzahl grüner Fälle notieren.
- [ ] **Step 6:** `native-v16-roundtrip.test.ts` schreiben, Muster `packages/io/test/` für V15: (a) Bundle mit gefüllten `chronist_laeufe`/`chronist_vorschlaege` exportieren und importieren, Feldmengen geschlossen; (b) leere Chronisttabellen ergeben V15-Ausgabe (`current.ts`-Delegation); (c) Manipulation eines `controlEvidence`-Feldes wird von `validation.ts` abgewiesen. Erst rot laufen lassen, dann grün.
- [ ] **Step 7:** STATUS.md: den Satz „HTTP-Transport: 42 lokale Streamprüfungen grün" durch die tatsächliche Zahl aus Step 5 ersetzen.
- [ ] **Step 8:** Typecheck; Bericht mit Dateiliste und Zahlen.

### Task A2: Egress-Freigabe als Einmal-Token und Kostenschätzung

**Files:**
- Create: `packages/server/src/domain/chronist/freigabe.ts`
- Create: `packages/server/test/chronist-freigabe.test.ts`
- Modify: `packages/protocol/src/chronist.ts`
- Modify: `packages/server/src/domain/chronist/service.ts` (`preview`, `consent`, `start`, `resume`)
- Modify: `packages/io/src/native-v16/data.ts`, `packages/io/src/native-v16/validation.ts` (Freigabebeleg ohne Token)
- Modify: `packages/client/src/features/ChronistWorkbench.tsx`, `packages/client/src/features/chronist-api.ts`, `packages/client/src/features/chronist-model.ts`
- Modify: `e2e/chronist.spec.ts`

**Interfaces:**
- Produces:
  ```ts
  // packages/protocol/src/chronist.ts
  export interface ChronistFreigabe { token: string; ablaufAt: number }
  export type ChronistExternalConsent = { scopeHash: string; token: string };
  // ChronistPreviewResult.freigabe: ChronistFreigabe | null
  // ChronistPreviewResult.estimate.costKind: "estimated" | "unknown"
  // packages/server/src/domain/chronist/freigabe.ts
  export function issueFreigabe(secret: string, claim: { campaignId: string; userId: string; scopeHash: string; providerFingerprint: string; model: string }, now: number, ttlMs?: number): ChronistFreigabe
  export function verifyFreigabe(secret: string, token: string, claim: {…same…}, now: number): "ok" | "expired" | "mismatch" | "malformed"
  ```
- Consumes: Cookie-Geheimnis aus der Serverkonfiguration (Name in `packages/server/src/app.ts` nachschlagen), `scopeHash` aus `preview`, `pricing` aus `parseChronistHostSettings`.

- [ ] **Step 1:** `chronist-freigabe.test.ts` mit acht Fällen schreiben: Start `fremd` ohne Token → Ergebnis `scope-changed`, keine Aufrufe; Token fremder Kampagne → abgewiesen; anderer Nutzer → abgewiesen; abgelaufen (now + 5 min + 1 s) → abgewiesen; zweimal verwendet → zweiter Lauf abgewiesen; `lokal` mit Token → `external-consent-unexpected`; Preview mit `pricing` → `costMicros > 0` und `costKind:"estimated"`; ohne `pricing` → `null` und `"unknown"`. Rot laufen lassen.
- [ ] **Step 2:** `freigabe.ts`: HMAC-SHA256 über die kanonische JSON-Form der Claim plus `ablaufAt`; Token `base64url(ablaufAt + "." + hmac)`. Einmaligkeit: Set verbrauchter Tokens im Service mit Ablaufbereinigung.
- [ ] **Step 3:** `service.ts`: `preview` gibt bei `location:"fremd"` `freigabe` aus; `consent()` verifiziert; `resume` verlangt frisches Token; Schätzung `(maxCalls · ceil(maxInputCharsPerCall / 4)) · inputMicrosPerMillion / 1e6 + maxCalls · maxOutputTokens · outputMicrosPerMillion / 1e6` als obere Schranke.
- [ ] **Step 4:** Native V16: `controlEvidence` erhält `freigabeAblaufAt` und `freigabeHash` (SHA-256 des Tokens), nie das Token; `validation.ts` prüft die Feldmenge.
- [ ] **Step 5:** Client: Checkbox erst nach gültiger Vorschau aktiv, sichtbarer Ablauf (Countdown aus `ablaufAt`), Token wird mit Start und Resume gesendet; Anzeige von Tokens je Zeichen als Annahme. `e2e/chronist.spec.ts` anpassen, lokal ausführen, Ergebnis notieren.
- [ ] **Step 6:** `npx vitest run packages/server/test/chronist-freigabe.test.ts packages/server/test/chronist-runs.test.ts packages/io/test/native-v16-roundtrip.test.ts` (letzterer aus A1, falls vorhanden), Typecheck; Bericht.

### Task A3: Schlüsselablage im Desktop

**Files:**
- Modify: `packages/desktop/src/profiles.ts` (SecretBox-Nutzung für `chronist-key.dpapi`)
- Modify: `packages/desktop/src/controller.ts`, `packages/desktop/src/policy.ts` (`hostEnvironment`), `packages/desktop/src/preload.ts`, `packages/desktop/src/main.ts` (IPC-Befehl)
- Modify: `packages/desktop/manager/*` (Eingabe „Chronist-Schlüssel setzen/löschen")
- Modify: `packages/desktop/test/policy.test.ts`, `packages/desktop/test/profiles.test.ts`
- Modify: `docs/DESKTOP.md`, `docs/CHRONIST.md` (Abschnitt Desktop)

**Interfaces:**
- Produces: IPC-Befehl `chronist-key` mit `{ profileId, action: "set" | "clear", value?: string }` über die geschlossene Befehlsschemaprüfung des Verwaltungsfensters; `hostEnvironment(profile)` liefert `CHRONICLE_CHRONIST_KEY_ANTHROPIC` nur wenn `chronist-key.dpapi` vorhanden und entschlüsselbar ist.
- Consumes: `SecretBox` aus `profiles.ts`, Allowlist `CHRONICLE_CHRONIST_KEY_[A-Z0-9_]{1,96}` in `policy.ts`.

- [ ] **Step 1:** Tests zuerst: `policy.test.ts`: ohne Schlüsseldatei keine Variable; mit Datei genau eine; Renderer-Befehl mit fremdem Profil abgewiesen; `profiles.test.ts`: Schreiben, Lesen, Löschen über DPAPI, Datei nie im Klartext (Bytes enthalten den Schlüssel nicht). Rot laufen lassen.
- [ ] **Step 2:** Implementieren; der Schlüssel wird nie an das Verwaltungsfenster zurückgegeben, nur „gesetzt/nicht gesetzt".
- [ ] **Step 3:** Verwaltungsfenster: Feld mit Passwortmaske, Buttons „Speichern" und „Entfernen", Hinweis „Anbieterwechsel verlangt Neustart der Welt".
- [ ] **Step 4:** `npx vitest run packages/desktop/test`, Typecheck; Dokumentation; Bericht.

### Task A4: Anbieterprofil 2, Modell-IDs, Dokumentation

**Files:**
- Modify: `packages/chronist/src/provider-profile.ts` (neues Profil `anthropic-messages-2`, bestehendes unverändert)
- Modify: `packages/chronist/test/provider-profile.test.ts`
- Modify: `packages/server/src/chronist-providers/registry.ts` (Defaults), `docs/CHRONIST.md`
- Modify: `design/iterations/chronist-completion-20260908.md` (Codex/Gemini-CLI bleiben unverifiziert)

- [ ] **Step 1:** Test: `renderChronistUnit` mit Profil 2 erzeugt `thinking:{type:"disabled"}`, kein `temperature`; Profil 1 byteweise unverändert (Snapshot-Hash aus dem bestehenden Test).
- [ ] **Step 2:** Profil 2 anlegen; Registry-Default `claude-sonnet-5`, Sparmodus `claude-haiku-4-5`, Preise in USD-Micros je Million (Sonnet 5: 2 000 000 / 10 000 000; Haiku 4.5: 1 000 000 / 5 000 000).
- [ ] **Step 3:** `docs/CHRONIST.md`: Anthropic-Beispielblock, Ollama-Discovery, Hinweis „kein hartes Ollama-Default". Bericht.

---

## Teil B — Englisches Sprachpaket

### Task B0: Infrastruktur

**Files:**
- Create: `packages/client/src/i18n.ts`, `packages/client/src/i18n/en.json` (leer: `{}`), `packages/client/src/i18n/en.plural.json`
- Modify: `packages/theme/src/preferences.ts` (`language`, `schemaVersion: 2`, Migration von 1)
- Modify: `packages/client/src/features/Appearance.tsx` (`lang`-Attribut, Sprachzustand), `packages/client/src/features/AppearanceSettings.tsx` (Auswahl „Sprache")
- Modify: `packages/client/src/api.ts` (`errorText` durch `t`)
- Modify: sieben Harness-Testdateien in `packages/client/test/` mit `runInNewContext`-Proxy: je eine Zeile `if (name === "../i18n" || name === "./i18n") return I18nStub;`
- Create: `tools/gate-sprache.mjs`, `tools/test/gate-sprache.test.mjs`
- Modify: `package.json` (`gate:sprache`, in `gate` zwischen `gate:boundaries` und `gate:assets`)
- Modify: `packages/theme/test/preferences.test.ts`

**Interfaces:**
- Produces:
  ```ts
  // packages/client/src/i18n.ts
  export type Sprache = "de" | "en";
  export function t(text: string, params?: Record<string, string | number>): string;
  export function plural(n: number, eins: string, viele: string, params?: Record<string, string | number>): string;
  export function aktuelleSprache(): Sprache;
  export function setzeSprache(sprache: Sprache): Promise<void>; // lädt en.json per import()
  export function locale(): "de-DE" | "en-GB";
  export const I18nStub: { t: (s: string) => string; plural: (n: number, a: string, b: string) => string; aktuelleSprache: () => "de"; locale: () => "de-DE" };
  ```
  Platzhalter `{name}`; `plural` schlägt in `en.plural.json` unter dem deutschen Einzahl-Text nach.

- [ ] **Step 1:** `packages/client/test/i18n.test.ts`: `t` liefert Identität ohne Katalog; mit Katalog Englisch; Platzhalter; fehlender Eintrag fällt zurück; `plural` beide Formen; `setzeSprache("en")` lädt den Katalog einmal. Rot.
- [ ] **Step 2:** `i18n.ts` implementieren; Sprachzustand als Modulvariable plus `subscribe` für React (`useSyncExternalStore` im `AppearanceProvider`, nicht in `i18n.ts`, damit die Harnesse ohne React-Kontext bleiben).
- [ ] **Step 3:** `preferences.ts`: Feld `language`, Migration v1 → v2 (`language:"de"`), Test in `packages/theme/test`.
- [ ] **Step 4:** `AppearanceSettings.tsx`: Auswahl „Sprache" mit „Deutsch"/„English"; `Appearance.tsx` setzt `document.documentElement.lang` und ruft `setzeSprache`.
- [ ] **Step 5:** Harness-Stubs in den sieben Dateien (`grep -ln "runInNewContext" packages/client/test`), ohne andere Zeilen zu berühren; die Suiten laufen lassen.
- [ ] **Step 6:** `gate-sprache.mjs`: TypeScript-AST über `packages/client/src`, `packages/ui/src`; sammelt `t("…")`-Literale, vergleicht mit `en.json`; Verstöße: fehlend, verwaist, nicht-literal, Deny-Liste (`packages/szene/src/model.ts`, `asset-genres.ts`, `packages/forge/src/grundriss.ts`, `bauprogramme.ts`, `packages/rules/src/templates/how-to-be-a-hero.ts`, `packages/io/src/wikitext.ts`, `packages/chronist/src/provider-profile.ts`, `packages/server/src/domain/public-projection.ts`), neues hartes `"de-DE"` außerhalb `i18n.ts`. Selbsttest mit Fixture-Strings. Solange der Katalog leer ist, meldet das Gate „0 Schlüssel, GREEN".
- [ ] **Step 7:** Typecheck, `npm run gate:sprache`, Bericht mit der Signatur von `t` für Welle 2.

### Task B1 bis B8: Übersetzungspakete (Welle 2, nach B0)

Je Paket dieselben Schritte; die Dateilisten stehen im Audit-Abschnitt 5 des Sprachpaket-Berichts und werden in die Agentenbriefe kopiert.

- [ ] **Step 1:** Jeden deutschen UI-Text in den Paketdateien mit `t("…")` umschließen: JSX-Text, `aria-label`, `title`, `placeholder`, `window.confirm`, Statusstrings in `.ts`-Helfern; Template-Literale in `t("… {name} …", { name })`; Pluralstellen in `plural`. Datenschlüssel, gespeicherte Titel und Filterlogik bleiben unangetastet.
- [ ] **Step 2:** `toLocaleString("de-DE")`, `toLocaleDateString("de-DE")`, `Intl.*("de")` in den Paketdateien auf `locale()` umstellen; `toLocaleLowerCase("de")` und `localeCompare(…,"de")` bleiben.
- [ ] **Step 3:** Englische Einträge in `packages/client/src/i18n/en.json` ergänzen, alphabetisch nach deutschem Schlüssel, damit acht Pakete ohne Konflikt mergen: jedes Paket schreibt seine Einträge in eine eigene Datei `packages/client/src/i18n/en/P<n>.json`; `i18n.ts` lädt alle Dateien des Ordners.
- [ ] **Step 4:** Ein Vitest-Fall je Paket in `packages/client/test/sprache-P<n>.test.ts`: Katalog laden, `setzeSprache("en")`, drei Stichproben englisch, `setzeSprache("de")`, dieselben deutsch.
- [ ] **Step 5:** Betroffene bestehende Suiten des Pakets laufen lassen, `npm run gate:sprache`, Typecheck; Bericht mit Stringzahl.

### Task B9: Browserablauf und Abschluss

- [ ] `e2e/sprache.spec.ts`: Anmelden, „Deine Darstellung" öffnen, Englisch wählen, drei Bereiche prüfen, zurück auf Deutsch. `docs/AUTHORING.md` Leseeinstellungen ergänzen. `README.md` Satz zur Sprachwahl.

---

## Teil C — Figurenantrag

### Task C1: Migration 028, Native V17, Domain

**Files:**
- Create: `packages/server/src/db/migrations/028_figurantrag.sql`
- Create: `packages/io/src/native-v17/{schema,bundle,data,current,validation,index}.ts`, `docs/CAMPAIGN_FORMAT_V17.md`
- Modify: `packages/io/src/index.ts` (Current auf V17), `packages/protocol/src/index.ts` (Export), Create: `packages/protocol/src/figurantrag.ts`
- Create: `packages/server/src/domain/figurantrag.ts`
- Modify: `packages/server/src/domain/bundles.ts` (`restoreOrder`), `packages/server/src/domain/deletion.ts` (`LOESCHREIHENFOLGE`)
- Modify: `packages/server/src/domain/actors.ts` (Projektion `templateForPlayer`, `instantiateActor` mit `createdBy`-Parameter)
- Create: `packages/io/test/native-v17-roundtrip.test.ts`, `packages/server/test/figurantrag.test.ts`
- Modify: `packages/server/test/deletion.test.ts`, `packages/server/test/bundle-actors-fixture.ts`

**Interfaces:**
- Produces:
  ```ts
  // packages/protocol/src/figurantrag.ts
  export type FigurantragStatus = "offen" | "bestaetigt" | "abgelehnt" | "zurueckgezogen";
  export interface FigurantragCard { id: string; templateId: string; templateRevision: number; name: string; status: FigurantragStatus; version: number; antragsteller: string; createdAt: string; decidedBy: string | null; decidedAt: string | null; actorId: string | null; reason: string | null }
  export interface FreigegebeneVorlageCard { id: string; name: string; art: string; anfangswerte: Record<string, unknown>; version: number }
  // packages/server/src/domain/figurantrag.ts
  export function createFigurantrag(db, cfg): {
    freigeben(user, campaign, templateId, expectedVersion): Promise<Ack>;
    entziehen(user, campaign, templateId, expectedVersion): Promise<Ack>;
    freigegebeneVorlagen(user, campaign): Promise<FreigegebeneVorlageCard[]>;
    beantragen(user, campaign, commandId, body: { templateId; name; anfangswerte }): Promise<FigurantragCard>;
    zuruecknehmen(user, campaign, id, expectedVersion): Promise<FigurantragCard>;
    liste(user, campaign): Promise<FigurantragCard[]>;
    bestaetigen(user, campaign, id, expectedVersion): Promise<{ antrag: FigurantragCard; actorId: string }>;
    ablehnen(user, campaign, id, expectedVersion, reason: string): Promise<FigurantragCard>;
  }
  ```
- Consumes: `authorize`, `member`, `instantiateActor`, `command` aus `actors.ts`; `campaign_rule_pins`; `Conflict`/`Gone` aus `domain/errors.ts`.

- [ ] **Step 1:** `figurantrag.test.ts` mit den Fällen aus dem Spec (nicht freigegeben 410; fremdes Paket Konflikt bei Antrag und bei Bestätigung; doppelte Bestätigung Konflikt; genau ein Grant; Ablehnung ohne `actors`-Zeile; Freigabeentzug zwischen Antrag und Bestätigung; Spieler sieht nur eigene Anträge; Vorlagenprojektion ohne `beute` und ohne fremde `loreEntryId`). Rot.
- [ ] **Step 2:** Migration 028 nach dem Muster von `026_map_lifecycle.sql` (Events-Tabelle, `deny_history_mutation`).
- [ ] **Step 3:** Domain implementieren; `instantiateActor` bekommt `createdBy` und `grantTo`, Verhalten für die Spielleitung unverändert (bestehende `actors.test.ts` bleibt grün).
- [ ] **Step 4:** Native V17 nach dem Muster von V16; `native-v17-roundtrip.test.ts`: Export/Import mit gefüllten Tabellen, Delegation an V16 bei leeren Tabellen, Schema-Deckung (`deletion.test.ts`). `docs/CAMPAIGN_FORMAT_V17.md`.
- [ ] **Step 5:** `npx vitest run packages/server/test/figurantrag.test.ts packages/server/test/actors.test.ts packages/server/test/deletion.test.ts packages/io/test/native-v17-roundtrip.test.ts packages/io/test/native-v16-roundtrip.test.ts`, Typecheck; Bericht.

### Task C2: Routen und Client (Welle 2, nach C1)

**Files:**
- Modify: `packages/server/src/http/actors.ts`
- Create: `packages/client/src/features/FigurAntrag.tsx`
- Modify: `packages/client/src/features/MeineFigur.tsx`, `packages/client/src/features/ActorWorkbench.tsx`
- Modify: `e2e/meine-figur.spec.ts`, `e2e/actors.spec.ts`, `docs/ACTORS_UI.md`, `docs/ICH.md`
- Create: `packages/client/test/figurantrag-review.test.ts`

- [ ] **Step 1:** Routen: `PUT /actor-templates/:id/freigabe`, `POST /actor-templates/:id/freigabe/entziehen`, `GET /actor-templates/freigegeben`, `POST /figurantraege`, `POST /figurantraege/:id/zuruecknehmen`, `GET /figurantraege`, `POST /figurantraege/:id/bestaetigen`, `POST /figurantraege/:id/ablehnen`; Rechte in der Domain, Schemas in `packages/protocol/src/figurantrag.ts`.
- [ ] **Step 2:** Client-Test mit dem Review-Harness: leere Fläche zeigt „Figur anlegen"; Vorlagenwahl listet nur freigegebene; Absenden ruft `POST /figurantraege` mit `commandId`; Status „wartet auf die Spielleitung"; Spielleitung sieht Reiter „Anträge" mit Bestätigen/Ablehnen. Rot, dann grün.
- [ ] **Step 3:** Browserabläufe erweitern und lokal ausführen; Dokumentation; Bericht.

---

## Abschluss

- [ ] `npm run gate` (Version, Grenzen, Sprache, Assets, Typecheck, Tests).
- [ ] Betroffene Browserabläufe: `chronist`, `sprache`, `meine-figur`, `actors`, `authoring`.
- [ ] `STATUS.md` Kopfabschnitt und `docs/FEATURELISTE.md` (#15 ☑ nur, wenn `e2e/chronist` grün ist).
- [ ] Neues Desktop-Paket über `npm run desktop:build`, `desktop:smoke`, `desktop:installer`.
