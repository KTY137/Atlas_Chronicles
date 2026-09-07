# Server-Härtung: vier entscheidungsfreie Pakete — Implementierungsplan

> **Abgearbeitet, 2026-09-07.** Alle vier Aufgaben sind umgesetzt und einzeln committet:
> Zwillingsbeweis `a71aa85`, Produktversion und Gate `ae6283f`, lineage_events-Index
> `099c1f3`, Import-Rate-Limit `65df4f9`.
>
> Auch die drei Punkte aus „Ausdrücklich NICHT in diesem Plan" sind inzwischen gebaut, nachdem
> Kaya die Mechanismusentscheidungen delegiert hat (design/10 §7.1): Löschpfad `c52f3d4`,
> Rasterzahlen für den Betreiber `d110050`, Zugangsvorfall als native v8 `4621231`. Die
> Begründungen dort bleiben als Beleg stehen, warum sie zum Zeitpunkt des Plans offen waren —
> beim Zugangsvorfall war der Blocker echt und ist erst durch das Landen von v6/v7 gefallen.
>
> Eine Regression aus dieser Arbeit ist benannt und behoben: `c52f3d4` brach jeden Export,
> `0e4677f` stellt ihn wieder her.

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Vier abgegrenzte Befunde aus `design/10` schließen, die von keiner offenen Entscheidung abhängen: der fehlende Zwillingsbeweis, die fehlende Produktversion, der fehlende Index auf `lineage_events` und das fehlende Rate-Limit auf den teuren Import-Routen.

**Architecture:** Vier voneinander unabhängige Aufgaben, aufsteigend nach Kollisionsrisiko mit den parallel laufenden Sessions sortiert. Aufgabe 1 legt nur eine neue Testdatei an, Aufgabe 4 fasst zuletzt Dateien an, in denen andere Sessions aktiv arbeiten. Jede Aufgabe endet mit einem eigenen Commit und ist einzeln zurücknehmbar.

**Tech Stack:** Node 22+, TypeScript (ESM, strict), Fastify 5, `@fastify/rate-limit`, PostgreSQL 17, PGlite für Tests, Vitest, `node:test` für `tools/`.

**Spec:** [`design/10-hosted-betrieb-und-auslieferung.md`](../../../design/10-hosted-betrieb-und-auslieferung.md) — §1.3 (Zwillingsbeweis), §1.9 (Produktversion, `lineage_events`-Index, Import-Drosselung). Deckt aus §5 die Punkte 9 und 11 vollständig ab und aus Punkt 10 die beiden ersten Teile; was von §5 offen bleibt und warum, steht unten unter „Ausdrücklich NICHT in diesem Plan".

## Global Constraints

- **Node ab 22.12** (`package.json` `engines`). Auf Windows in PowerShell `npm.cmd`, nicht `npm`.
- **Strikt additive Migrationen.** Kein `DROP`, kein `SET NOT NULL`, kein Primärschlüsselwechsel — verengende Änderungen schließen Rolling Update aus (`design/10` §1.4). Dieser Plan enthält ausschließlich `CREATE INDEX`.
- **Migrationsdateien** liegen in `packages/server/src/db/migrations/`, benannt `NNN_name.sql`, und trennen Anweisungen durch eine Zeile `-- statement`.
- **Vitest findet Tests unter** `packages/*/test/**/*.test.ts` (`vitest.config.ts`). Eine neue Datei an dieser Stelle wird ohne Konfigurationsänderung gefunden.
- **Der Arbeitsbaum enthält unversionierte Arbeit anderer Sessions.** Niemals `git add -A`, `git add .` oder `git commit -a`. Jeder Commit nennt seine Dateien einzeln.
- **Keine Testabschwächung.** Kein Timeout hochsetzen, kein `skip`, kein `only`.

---

## Dateiübersicht

| Aufgabe | Datei | Verantwortung |
|---|---|---|
| 1 | `packages/projection/test/entry.test.ts` (neu) | Der Zwillingsbeweis: byte-identische Payloads für Nicht-Halter |
| 2 | `package.json` (ändern) | Produktversion der Wurzel |
| 2 | `tools/gate-version.mjs` (neu) | Reine Prüffunktion plus CLI gegen Versionsdrift |
| 2 | `tools/test/gate-version.test.mjs` (neu) | `node:test` für die reine Prüffunktion |
| 3 | `packages/server/src/db/migrations/016_lineage_index.sql` (neu) | Zwei Indizes auf den Fremdschlüsseln von `lineage_events` |
| 3 | `packages/server/test/lineage-index.test.ts` (neu) | Belegt, dass die Migration die Indizes anlegt |
| 4 | `packages/server/src/http/imports.ts` (ändern) | Eigenes Rate-Limit für Karten- und Eron-Import |
| 4 | `packages/server/src/http/tactical.ts` (ändern) | Eigenes Rate-Limit für die drei Tactical-Import-Routen |
| 4 | `packages/server/test/rate-limit.test.ts` (ändern) | Testfall für die gedrosselten Import-Routen |

---

### Task 1: Der Zwillingsbeweis

`design/08-backend-architektur.md` §3 nennt den Zwillingsbeweis als Beleg für Grenze B9, und `packages/projection/src/entry.ts:19` behauptet im Kommentar, er teste genau das über `entryBytes`. Der Test existiert nicht: `entryBytes` wird nirgends aufgerufen, und `packages/projection` enthält keine einzige Testdatei. Diese Aufgabe schreibt ihn.

**Files:**
- Create: `packages/projection/test/entry.test.ts`

**Interfaces:**
- Consumes: `projiziereEntry(quelle: EntryQuelle, wissen: BetrachterWissen): EntryProjektion`, `entryBytes(p: EntryProjektion): string`, `LEERES_WISSEN: BetrachterWissen` — alle aus `packages/projection/src/index.ts`. `trustEntryId`, `trustPassageId` aus `@chronicle/core`. Typ `Passage` aus `@chronicle/chronik`.
- Produces: nichts. Reine Testdatei, kein Produktionscode.

- [x] **Step 1: Testdatei mit den drei Fällen schreiben**

Erstelle `packages/projection/test/entry.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { trustEntryId, trustPassageId } from "@chronicle/core";
import type { Passage } from "@chronicle/chronik";
import {
  projiziereEntry,
  entryBytes,
  LEERES_WISSEN,
  type BetrachterWissen,
  type EntryQuelle,
} from "../src/index.ts";

const ENTRY = "haus-vharon";

const absatz = (text: string) => ({ kind: "absatz" as const, inhalt: [{ text, marks: [] }] });

const passage = (pid: string, ord: number, inhalt: Passage["inhalt"]): Passage => ({
  pid: trustPassageId(pid),
  gen: 1,
  entryId: trustEntryId(ENTRY),
  ord,
  pfad: [],
  inhalt,
  geltung: "kanon",
  praegung: null,
});

const welt = (passagen: readonly Passage[]): EntryQuelle => ({
  entryId: ENTRY,
  slug: ENTRY,
  titel: "Haus Vharon",
  passagen,
});

// Die gehaltene Hälfte ist in beiden Zwillingen dieselbe. Sie trägt einen roten Link
// (`link` ohne `zielEntryId`) — genau die Stelle, an der eine Tür dekorieren würde.
const GEHALTEN = passage("p-gehalten", 0, {
  kind: "absatz",
  inhalt: [{ text: "Der Hof liegt hinter der ", marks: [] }, { text: "Kellertür", marks: [{ art: "link", zielSlug: "kellertuer" }] }],
});

describe("Zwillingsbeweis — zwei Welten, eine gehaltene Hälfte", () => {
  const wissenOhneTuer: BetrachterWissen = {
    gehaltenePids: new Set([GEHALTEN.pid]),
    offeneTueren: new Map(),
  };

  const zwillingA = welt([GEHALTEN, passage("p-a", 1, absatz("Im Keller liegt der Bruder."))]);
  const zwillingB = welt([GEHALTEN, passage("p-b", 1, absatz("Im Keller liegt nichts."))]);

  it("liefert für den Nicht-Halter byte-identische Payloads", () => {
    expect(entryBytes(projiziereEntry(zwillingA, wissenOhneTuer)))
      .toBe(entryBytes(projiziereEntry(zwillingB, wissenOhneTuer)));
  });

  it("verrät über ord weder Zahl noch Position der verborgenen Passagen", () => {
    const versteckt = welt([passage("p-vorne", 0, absatz("verborgen")), GEHALTEN, passage("p-hinten", 2, absatz("verborgen"))]);
    expect(projiziereEntry(versteckt, wissenOhneTuer).passagen.map((p) => p.ord)).toEqual([0]);
  });

  it("gibt dem anonymen Leser eine Projektion ohne Passagen", () => {
    expect(projiziereEntry(zwillingA, LEERES_WISSEN).passagen).toEqual([]);
  });

  it("dekoriert den roten Link nur für den Türhalter und lässt ihn sonst nackt", () => {
    const halter: BetrachterWissen = {
      gehaltenePids: new Set([GEHALTEN.pid]),
      offeneTueren: new Map([["kellertuer", { vollmachtId: "v-1", verfallAt: 1 }]]),
    };
    const nackt = entryBytes(projiziereEntry(zwillingA, wissenOhneTuer));
    const dekoriert = entryBytes(projiziereEntry(zwillingA, halter));
    expect(dekoriert).not.toBe(nackt);
    expect(dekoriert).toContain("v-1");
    expect(nackt).not.toContain("v-1");
  });
});
```

- [x] **Step 2: Test laufen lassen und Fehler prüfen**

Run: `npm.cmd exec -- vitest run packages/projection/test/entry.test.ts`

Erwartung: Die Datei wird gefunden, alle vier Fälle laufen und bestehen. Sie prüfen vorhandenes Verhalten, das bisher nur unbelegt behauptet war — ein Fehlschlag hier wäre kein fehlendes Feature, sondern ein echtes Leck in Grenze B9. Tritt einer auf: nicht den Test anpassen, sondern melden.

- [x] **Step 3: Typecheck**

Run: `npm.cmd run typecheck`
Erwartung: PASS, keine neuen Fehler.

- [x] **Step 4: Grenzen-Gate**

Run: `npm.cmd run gate:boundaries`
Erwartung: PASS. `@chronicle/projection` darf `@chronicle/core` und `@chronicle/chronik` konsumieren; der Test führt keine neue Richtung ein.

- [x] **Step 5: Commit**

```bash
git add packages/projection/test/entry.test.ts
git commit -m "test: write the Zwillingsbeweis that entry.ts and design/08 both claimed"
```

---

### Task 2: Produktversion festlegen und gegen Drift sichern

`package.json` der Wurzel steht auf `0.0.0`, `packages/desktop/package.json` auf `0.1.0`. Es gibt keine Produktversion — damit ist nichts taggbar, und ohne Tag gibt es kein Registry-Release und keinen Update-Feed (`design/10` §1.9, §4.1).

**Files:**
- Modify: `package.json` (Feld `version`, Zeile 4; Feld `scripts.gate`)
- Create: `tools/gate-version.mjs`
- Create: `tools/test/gate-version.test.mjs`

**Interfaces:**
- Produces: `pruefeVersionen(manifeste: {name: string, version: string}[]): string[]` aus `tools/gate-version.mjs` — gibt die Liste der Verstöße zurück, leer bedeutet in Ordnung. Wird von `tools/test/gate-version.test.mjs` konsumiert.

- [x] **Step 1: Den fehlschlagenden Test schreiben**

Erstelle `tools/test/gate-version.test.mjs`:

```js
import { test } from "node:test";
import assert from "node:assert/strict";
import { pruefeVersionen } from "../gate-version.mjs";

test("akzeptiert übereinstimmende, gesetzte Versionen", () => {
  assert.deepEqual(pruefeVersionen([
    { name: "chronicle", version: "0.1.0" },
    { name: "@chronicle/desktop", version: "0.1.0" },
  ]), []);
});

test("weist die Platzhalterversion der Wurzel zurück", () => {
  const verstoesse = pruefeVersionen([
    { name: "chronicle", version: "0.0.0" },
    { name: "@chronicle/desktop", version: "0.1.0" },
  ]);
  assert.equal(verstoesse.length, 1);
  assert.match(verstoesse[0], /chronicle/);
});

test("weist auseinanderlaufende Versionen zurück", () => {
  const verstoesse = pruefeVersionen([
    { name: "chronicle", version: "0.1.0" },
    { name: "@chronicle/desktop", version: "0.2.0" },
  ]);
  assert.equal(verstoesse.length, 1);
  assert.match(verstoesse[0], /@chronicle\/desktop/);
});

test("ignoriert Bibliothekspakete ohne eigene Auslieferung", () => {
  assert.deepEqual(pruefeVersionen([
    { name: "chronicle", version: "0.1.0" },
    { name: "@chronicle/desktop", version: "0.1.0" },
    { name: "@chronicle/projection", version: "0.0.0" },
  ]), []);
});
```

- [x] **Step 2: Test laufen lassen, Fehlschlag bestätigen**

Run: `node --test tools/test/gate-version.test.mjs`
Erwartung: FAIL mit `Cannot find module` für `../gate-version.mjs`.

- [x] **Step 3: Die Prüffunktion samt CLI schreiben**

Erstelle `tools/gate-version.mjs`:

```js
// Ohne Produktversion ist nichts taggbar, und ohne Tag gibt es kein Registry-Release und
// keinen Update-Feed (design/10 §1.9). Geprüft werden nur die Manifeste, die tatsächlich ein
// Artefakt ausliefern: die Wurzel und der Desktop. Bibliothekspakete bleiben absichtlich auf
// 0.0.0 — sie werden nie einzeln veröffentlicht, und eine Pflichtversion dort wäre Zeremonie.
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";

/** Manifeste, die ein auslieferbares Artefakt tragen. Alle anderen werden ignoriert. */
export const AUSGELIEFERT = ["chronicle", "@chronicle/desktop"];

/**
 * @param {{name: string, version: string}[]} manifeste
 * @returns {string[]} Verstöße im Klartext; leer heißt in Ordnung.
 */
export function pruefeVersionen(manifeste) {
  const relevant = manifeste.filter((m) => AUSGELIEFERT.includes(m.name));
  const verstoesse = [];
  for (const m of relevant) {
    if (m.version === "0.0.0") verstoesse.push(`${m.name} trägt die Platzhalterversion 0.0.0 — es gibt keine Produktversion.`);
  }
  const gesetzt = relevant.filter((m) => m.version !== "0.0.0");
  const wurzel = gesetzt.find((m) => m.name === "chronicle");
  if (wurzel) {
    for (const m of gesetzt) {
      if (m.version !== wurzel.version) verstoesse.push(`${m.name} steht auf ${m.version}, die Wurzel auf ${wurzel.version} — eine Auslieferung, zwei Versionen.`);
    }
  }
  return verstoesse;
}

const HIER = fileURLToPath(new URL(".", import.meta.url));
const PFADE = ["../package.json", "../packages/desktop/package.json"];

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const manifeste = [];
  for (const pfad of PFADE) {
    const roh = JSON.parse(await readFile(new URL(pfad, import.meta.url), "utf8"));
    manifeste.push({ name: roh.name, version: roh.version });
  }
  const verstoesse = pruefeVersionen(manifeste);
  if (verstoesse.length) {
    for (const v of verstoesse) console.error(`Versions-Gate: ${v}`);
    process.exit(1);
  }
  console.log(`Versions-Gate: ${manifeste.map((m) => `${m.name}@${m.version}`).join(", ")}`);
  void HIER;
}
```

- [x] **Step 4: Test laufen lassen, Erfolg bestätigen**

Run: `node --test tools/test/gate-version.test.mjs`
Erwartung: PASS, vier Tests.

- [x] **Step 5: Die Wurzelversion setzen**

Ändere in `package.json` Zeile 4 `"version": "0.0.0",` zu `"version": "0.1.0",`.

`0.1.0` und nicht `1.0.0`: Der Desktop steht bereits auf `0.1.0`, und `docs/DESKTOP.md` führt offene Release-Gates. Eine 1.0 wäre eine Aussage, die die Nachweislage nicht deckt.

- [x] **Step 6: Das Gate verdrahten**

Ändere in `package.json` das Skript `gate`:

```json
"gate:version": "node --test tools/test/gate-version.test.mjs && node tools/gate-version.mjs",
"gate": "npm run gate:version && npm run gate:boundaries && npm run gate:assets && npm run typecheck && npm run test",
```

- [x] **Step 7: Das Gate-Skript laufen lassen**

Run: `npm.cmd run gate:version`
Erwartung: PASS, Ausgabe `Versions-Gate: chronicle@0.1.0, @chronicle/desktop@0.1.0`.

- [x] **Step 8: Commit**

```bash
git add package.json tools/gate-version.mjs tools/test/gate-version.test.mjs
git commit -m "build: give the product a version and a gate against drift"
```

---

### Task 3: Index auf den Fremdschlüsseln von `lineage_events`

`lineage_events` hat keinen einzigen Index außer dem Primärschlüssel `seq`. Fünf Lesestellen joinen über `entry_id` (`documents.ts:43`, `gameplay.ts:193`, `tactical.ts:256`, `week.ts:64`, plus `bundles.ts:126` beim Export), eine über `revision_id` (`authoring.ts:285`). Postgres legt für Fremdschlüssel keinen Index an. Die Tabelle wächst pro Spielabend und wird nie aufgeräumt (`design/10` §1.1).

**Files:**
- Create: `packages/server/src/db/migrations/016_lineage_index.sql`
- Create: `packages/server/test/lineage-index.test.ts`

**Interfaces:**
- Consumes: `createTestDb()`, `migrate(db)`, Typ `Db` aus `packages/server/src/db/index.ts`.
- Produces: zwei Indizes `lineage_events_entry_id_idx` und `lineage_events_revision_id_idx`.

- [x] **Step 1: Freie Migrationsnummer bestätigen**

Run: `ls packages/server/src/db/migrations/`

Erwartung: höchste vorhandene Nummer ist `015`. **Ist bereits eine `016` vorhanden** — andere Sessions legen laufend Migrationen an —, nimm die nächste freie Nummer und benutze sie in allen folgenden Schritten statt `016`.

- [x] **Step 2: Den fehlschlagenden Test schreiben**

Erstelle `packages/server/test/lineage-index.test.ts`:

```ts
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createTestDb, migrate, type Db } from "../src/db/index.ts";

describe("lineage_events trägt Indizes auf seinen Fremdschlüsseln", () => {
  let db: Db;
  beforeAll(async () => { db = await createTestDb(); await migrate(db); }, 30_000);
  afterAll(async () => { await db?.close(); });

  it("indiziert entry_id und revision_id", async () => {
    const rows = (await db.query<{ indexname: string }>(
      "SELECT indexname FROM pg_indexes WHERE tablename='lineage_events' ORDER BY indexname",
    )).rows.map((r) => r.indexname);
    expect(rows).toContain("lineage_events_entry_id_idx");
    expect(rows).toContain("lineage_events_revision_id_idx");
  });
});
```

- [x] **Step 3: Test laufen lassen, Fehlschlag bestätigen**

Run: `npm.cmd exec -- vitest run packages/server/test/lineage-index.test.ts`
Erwartung: FAIL — die erwarteten Indexnamen fehlen in der Liste.

- [x] **Step 4: Die Migration schreiben**

Erstelle `packages/server/src/db/migrations/016_lineage_index.sql`:

```sql
-- lineage_events wächst pro Spielabend und wird nie aufgeräumt. Fünf Lesestellen joinen über
-- entry_id (documents.ts:43, gameplay.ts:193, tactical.ts:256, week.ts:64, bundles.ts:126),
-- eine über revision_id (authoring.ts:285). Postgres indiziert Fremdschlüssel nicht von selbst.
-- Rein additiv: CREATE INDEX ändert kein Schema, das alter Code voraussetzt.
CREATE INDEX lineage_events_entry_id_idx ON lineage_events(entry_id);
-- statement
CREATE INDEX lineage_events_revision_id_idx ON lineage_events(revision_id);
```

- [x] **Step 5: Test laufen lassen, Erfolg bestätigen**

Run: `npm.cmd exec -- vitest run packages/server/test/lineage-index.test.ts`
Erwartung: PASS.

- [x] **Step 6: Die übrige Server-Testmenge laufen lassen**

Run: `npm.cmd exec -- vitest run packages/server/test`
Erwartung: PASS. Ein neuer Index darf kein Verhalten ändern; schlägt hier etwas fehl, hing ein Test an einer Zeilenreihenfolge ohne `ORDER BY` — melde das, statt den Test anzupassen.

- [x] **Step 7: Commit**

```bash
git add packages/server/src/db/migrations/016_lineage_index.sql packages/server/test/lineage-index.test.ts
git commit -m "perf: index the foreign keys lineage_events joins on"
```

---

### Task 4: Eigenes Rate-Limit für die teuren Import-Routen

Der Export ist auf 4 Anfragen je Minute gedrosselt (`http/bundles.ts:10`). Die Import-Routen mit bis zu 64 MiB Body laufen unter dem allgemeinen Limit von 240 je Minute (`app.ts:47`). Das ist die asymmetrische Stelle aus `design/10` §1.9: Der billige Weg hinaus ist geschützt, der teure Weg hinein nicht.

Diese Aufgabe kommt zuletzt, weil sie als einzige Dateien anfasst, in denen andere Sessions aktiv arbeiten.

**Files:**
- Modify: `packages/server/src/http/imports.ts` (Routen in Zeile 24 und 39)
- Modify: `packages/server/src/http/tactical.ts` (Routen in Zeile 39, 40 und 44)
- Modify: `packages/server/test/rate-limit.test.ts` (neuer Testfall am Ende der `describe`)

**Interfaces:**
- Consumes: die Routen-Option `config: { rateLimit: { max, timeWindow } }` von `@fastify/rate-limit`, exakt wie in `http/bundles.ts:10` verwendet.
- Produces: nichts, was eine spätere Aufgabe konsumiert.

- [x] **Step 1: Vor der Änderung den aktuellen Stand der beiden Dateien lesen**

Run: `git diff packages/server/src/http/imports.ts packages/server/src/http/tactical.ts`

Andere Sessions ändern diese Dateien. Lies den aktuellen Inhalt, bevor du editierst, und übernimm die vorgefundene Formatierung.

- [x] **Step 2: Den fehlschlagenden Test schreiben**

Füge in `packages/server/test/rate-limit.test.ts` innerhalb der bestehenden `describe`-Klammer, nach dem letzten `it`, ein:

```ts
  it("drosselt den Kartenimport härter als den allgemeinen Verkehr", async () => {
    const app = await buildApp(db, config);
    try {
      const url = `/api/campaigns/${randomUUID()}/maps/import`;
      const headers = { origin: config.origin, "content-type": "application/json" };
      // Ohne Anmeldung antwortet die Route 400 oder 404 — das genügt: gezählt wird die Anfrage,
      // nicht ihr Erfolg. Entscheidend ist allein, dass die Drosselung weit vor 240 greift.
      for (let i = 0; i < 8; i++) {
        expect((await app.inject({ method: "POST", url, headers, payload: {} })).statusCode).not.toBe(429);
      }
      expect((await app.inject({ method: "POST", url, headers, payload: {} })).statusCode).toBe(429);
    } finally { await app.close(); }
  });
```

- [x] **Step 3: Test laufen lassen, Fehlschlag bestätigen**

Run: `npm.cmd exec -- vitest run packages/server/test/rate-limit.test.ts`
Erwartung: FAIL — die neunte Anfrage kommt durch, weil die Route noch unter dem allgemeinen Limit von 240 läuft.

- [x] **Step 4: Das Limit auf die Import-Routen setzen**

In `packages/server/src/http/imports.ts`, Route `/api/campaigns/:campaignId/maps/import` (Zeile 24): ergänze `config` im Optionsobjekt, sodass es lautet

```ts
{schema:{body:jsonBody},bodyLimit:64*1024*1024,config:{rateLimit:{max:8,timeWindow:"1 minute"}}}
```

In derselben Datei, Route `/api/campaigns/:campaignId/imports/eron` (Zeile 39):

```ts
{schema:{body:eron},bodyLimit:24*1024*1024,config:{rateLimit:{max:8,timeWindow:"1 minute"}}}
```

In `packages/server/src/http/tactical.ts` ergänze dasselbe `config`-Feld in den Optionsobjekten der drei Routen `${base}/tactical/maps/import-preview`, `${base}/tactical/maps` und `${base}/tactical/maps/:id/revision`, jeweils neben dem vorhandenen `bodyLimit: TACTICAL_IMPORT_BODY_LIMIT`:

```ts
{ bodyLimit: TACTICAL_IMPORT_BODY_LIMIT, config: { rateLimit: { max: 8, timeWindow: "1 minute" } }, schema: { body: P.TacticalImportSchema } }
```

Acht je Minute und nicht vier wie beim Export: Ein Import wird beim Einrichten einer Kampagne mehrfach hintereinander versucht, ein Export nicht. Acht lässt ein ungeduldiges Nacheinander zu und stoppt trotzdem weit vor der Stelle, an der 64-MiB-Bodies die Maschine tragen müssten.

- [x] **Step 5: Test laufen lassen, Erfolg bestätigen**

Run: `npm.cmd exec -- vitest run packages/server/test/rate-limit.test.ts`
Erwartung: PASS, drei Tests.

- [x] **Step 6: Die Import- und Tactical-Tests laufen lassen**

Run: `npm.cmd exec -- vitest run packages/server/test/imports.test.ts packages/server/test/tactical.test.ts packages/server/test/tactical-integration.test.ts`

Erwartung: PASS. Schlägt ein Test mit 429 fehl, feuert er mehr als acht Importe gegen dieselbe App-Instanz. Dann baue in **diesem Test** eine frische App pro Fall, statt das Limit anzuheben.

- [x] **Step 7: Typecheck**

Run: `npm.cmd run typecheck`
Erwartung: PASS.

- [x] **Step 8: Commit**

```bash
git add packages/server/src/http/imports.ts packages/server/src/http/tactical.ts packages/server/test/rate-limit.test.ts
git commit -m "fix: rate-limit the expensive import routes, not just the cheap export"
```

---

## Abschluss

- [x] **Vollständiges Gate**

Run: `npm.cmd run gate`
Erwartung: PASS in allen fünf Stufen (`gate:version`, `gate:boundaries`, `gate:assets`, `typecheck`, `test`).

- [x] **Nachweis, dass keine fremde Arbeit mitgenommen wurde**

Run: `git status --short`

Erwartung: Die unversionierten und geänderten Dateien der anderen Sessions stehen unverändert da. Vier Commits liegen vor, keiner enthält eine Datei außerhalb der Dateiübersicht oben.

---

## Ausdrücklich NICHT in diesem Plan

Zwei Pakete aus `design/10` §5 sind hier bewusst ausgelassen. Beide sahen entscheidungsfrei aus und sind es bei genauem Hinsehen nicht.

**Löschpfad und Retention (§1.1).** Über ein Dutzend Historientabellen tragen `deny_history_mutation()`, das jedes DELETE abbricht (`002_documents.sql:58`). Eine autorisierte Kampagnenlöschung muss diesen Riegel kontrolliert passieren, und *wie* ist eine Sicherheitsentscheidung mit mindestens drei Antworten: ein Sitzungsmerker, den die Triggerfunktion prüft; eine `SECURITY DEFINER`-Funktion, die die Löschung kapselt; oder `ALTER TABLE … DISABLE TRIGGER` innerhalb einer Transaktion, was Tabelleneigentum voraussetzt. Die erste ist am leichtesten zu missbrauchen, die dritte am schwersten zu automatisieren. Das gehört entschieden, bevor es geplant wird.

**Zugangsvorfall-Schreibpfad (§1.2).** `access_incidents.vollmacht_id` hat einen Fremdschlüssel auf `vollmachten(id, campaign_id)` (`001_initial.sql:153`). Die Türen eines Betrachters stammen aber aus **beiden** Vollmacht-Tabellen: `documents.ts:67-73` vereinigt `vollmachten` und `action_vollmachten` zu `offeneTueren`. Ein Vorfall an einer `action_vollmachten`-Tür ließe sich heute gar nicht schreiben. Vorher zu entscheiden: ob `access_incidents` beide Herkünfte trägt (Diskriminator plus gelockerter Fremdschlüssel — eine verengende Migration, siehe Global Constraints), oder ob die Invariante bewusst nur für Dokument-Türen gilt. Erst danach steht fest, wo der Schreibpfad hingehört.

**`TacticalRasterStats` exponieren (§3.5).** `stats()` in `domain/tactical-raster.ts:277` liefert bereits `{ active, queued, cacheBytes, cacheEntries, cacheHits, cacheMisses }`; niemand ruft es auf. Das Signal ist da, die Frage ist *wohin damit*: Queue-Tiefe und Cache-Zustand auf einer offenen Route sind ein Aufklärungssignal für jemanden, der die Maschine gezielt überlasten will. Log, GM-Route oder Betreiber-Endpunkt hinter eigener Berechtigung — das ist zu entscheiden, nicht zu raten. Klein, aber nicht entscheidungsfrei.

Alle drei bekommen einen eigenen Plan, sobald die jeweilige Entscheidung gefallen ist.
