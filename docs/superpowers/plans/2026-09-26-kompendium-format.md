<!-- SPDX-License-Identifier: BUSL-1.1 -->
<!-- Copyright (c) 2026 Kaya Yesilyurt - Atlas Chronicles. Siehe LICENSE. -->
# Kompendium-Format (Phase 1 Format, Phase 2 Server) — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A rule package can carry a complete compendium (kinds, entries, rule text, templates), several ability lists, a language and several attributions; the server keeps such packages fast and serves the compendium separately; bundled large packages install by id.

**Architecture:** New optional, closed-checked sections of schema-v2 packages (`compendium`, `sprache`, `abilityRules.lists`, `RuleAbility.entry`, `attribution.weitere`) parsed in `packages/rules`. Packages without them stay byte-identical (same stableJson, same hash). The server caches checked packages by content hash, strips the compendium from listings and runtime, and serves index and entries over two read-only routes. The forge's draft model passes the new sections through untouched.

**Tech Stack:** TypeScript (strict, `exactOptionalPropertyTypes`), vitest, Fastify + TypeBox (`packages/protocol`), PGlite/Postgres.

**Spec:** `docs/superpowers/specs/2026-09-26-kompendium-format-design.md`

**Worktree:** `.claude/worktrees/kompendium`, branch `feature/kompendium`. Run everything from the worktree root. Node modules resolve from the main checkout above it.

## Global Constraints

- Existing packages parse to byte-identical `stableJson` and the same `supportedPackageContentHash` (golden hashes in Task 1).
- Every new section is closed: unknown keys fail with a `RuleValidationError`, like every existing section.
- Limits live only in `RULE_LIMITS` (`packages/rules/src/validation.ts`): `compendiumKinds: 256`, `compendiumAttributes: 128`, `compendiumEntries: 65_536`, `entryTags: 64`, `attributeListValues: 256`, `entryLinks: 256`, `abilityLists: 32`, `regeltextTableColumns: 64`, `regeltextTableRows: 4_096`; texts use `longText` (200 000), labels `label` (500).
- Rule text is never HTML. No `innerHTML`, no `dangerouslySetInnerHTML` anywhere in this work.
- Actor kinds are `ACTOR_KINDS` from `packages/protocol/src/actors.ts` (`player_character`, `npc`, `creature`, `companion`, `vehicle`); rarities are `LOOT_RARITIES` (`gewoehnlich`, `ungewoehnlich`, `selten`, `episch`, `legendaer`). `packages/rules` must not import protocol; copy the two literal lists into `compendium.ts` and pin them equal with a test in `packages/server/test`.
- Visible UI text: plain German in `t("…")`, English entries in `packages/client/src/i18n/en/kompendium.json` (new catalog, registered in `i18n.ts`).
- Commit with explicit paths; files written by Python on Windows need LF.

## Review Focus

1. A package whose `abilityRules` has no `lists`: overview, runtime and hash exactly as before (Task 4 test "ohne Listen unverändert").
2. An ability whose group matches no list prefix lands in the first list; a list with `groups: []` is the catch-all (Task 4).
3. A `figur` template missing some fields: the missing ones take the field defaults, then the whole record is validated; unknown field keys fail (Task 3).
4. A rule-text table with a ragged row (fewer cells than the header) renders the missing cells empty rather than failing; more cells than the header fails (Task 2).
5. Opening an installed package that has a compendium as a forge draft and saving a new version keeps the compendium byte-for-byte (Task 7).

---

## Phase 1 — Format (`packages/rules`)

### Task 1: Limits, types, golden hashes

**Files:**
- Modify: `packages/rules/src/validation.ts` (add the limits from Global Constraints to `RULE_LIMITS`)
- Create: `packages/rules/src/compendium.ts` (types only in this task)
- Modify: `packages/rules/src/package-v2.ts` (type additions only)
- Modify: `packages/rules/src/index.ts` (export the new types)
- Create: `packages/rules/test/kompendium-golden.test.ts`

**Interfaces (Produces):**
```ts
// compendium.ts
export const COMPENDIUM_ACTOR_KINDS = ["player_character", "npc", "creature", "companion", "vehicle"] as const;
export const COMPENDIUM_RARITIES = ["gewoehnlich", "ungewoehnlich", "selten", "episch", "legendaer"] as const;
export type CompendiumAttributeType = "text" | "number" | "boolean" | "list" | "enum";
export interface CompendiumAttribute { readonly key: string; readonly label: string; readonly type: CompendiumAttributeType; readonly values?: readonly string[]; readonly unit?: string }
export interface CompendiumKind { readonly id: string; readonly label: string; readonly plural: string; readonly description: string; readonly attributes: readonly CompendiumAttribute[] }
export type CompendiumValue = string | number | boolean | readonly string[];
export type CompendiumTemplate =
  | { readonly type: "figur"; readonly kind: typeof COMPENDIUM_ACTOR_KINDS[number]; readonly fields: Readonly<Record<string, Scalar>> }
  | { readonly type: "gegenstand"; readonly kategorie?: string; readonly seltenheit?: typeof COMPENDIUM_RARITIES[number]; readonly angaben: readonly { readonly label: string; readonly wert: string }[] };
export interface CompendiumEntry {
  readonly id: string; readonly kind: string; readonly name: string;
  readonly group?: string; readonly level?: number; readonly tags?: readonly string[];
  readonly attributes?: Readonly<Record<string, CompendiumValue>>;
  readonly summary?: string; readonly text: string;
  readonly source?: { readonly title: string; readonly page?: number };
  readonly links?: { readonly abilities?: readonly string[]; readonly actions?: readonly string[]; readonly conditions?: readonly string[]; readonly entries?: readonly string[] };
  readonly template?: CompendiumTemplate;
}
export interface RuleCompendium { readonly kinds: readonly CompendiumKind[]; readonly entries: readonly CompendiumEntry[] }
// package-v2.ts additions
export interface RuleAbilityList { readonly id: string; readonly label: string; readonly field: string; readonly groups: readonly string[]; readonly budget?: string }
// RuleAbilityRules gains: readonly lists?: readonly RuleAbilityList[]
// RuleAbility gains:      readonly entry?: string
// RuleAttribution gains:  readonly weitere?: readonly RuleAttribution[]
// RulePackageV2 gains:    readonly sprache?: string; readonly compendium?: RuleCompendium
```

- [ ] **Step 1: Golden test first.** `kompendium-golden.test.ts` records `supportedPackageContentHash` and `stableJson(...).length` of every exported package constant (`DEMO_RULE_PACKAGE`, `CHRONICLE_HEROES_PACKAGE`, `CHRONICLES_LITE_PACKAGE`, `D20_REFERENCE_PACKAGE`, `THREE_D20_REFERENCE_PACKAGE`, `FIFTH_EDITION_REFERENCE_PACKAGE`, `FIFTH_EDITION_SRD_PACKAGE`, the gzipped Lite fixture `test/fixtures/chronicles-lite-v1.rules.json.gz`). Write the current values as literals (run once with a `console.log` to capture them, then paste them in and remove the log). Expected: PASS before and after every later task.
- [ ] **Step 2:** Add the types and limits. `npx tsc -p tsconfig.json --noEmit` and the golden test stay green.
- [ ] **Step 3: Commit** `feat(rules): compendium types and limits`.

### Task 2: Regeltext — safe rule text

**Files:**
- Create: `packages/rules/src/regeltext.ts`
- Test: `packages/rules/test/regeltext.test.ts`

**Interfaces (Produces):**
```ts
export type RegeltextInline =
  | { readonly t: "text"; readonly text: string }
  | { readonly t: "fett" | "kursiv"; readonly kinder: readonly RegeltextInline[] }
  | { readonly t: "verweis"; readonly id: string; readonly text: string };
export type RegeltextBlock =
  | { readonly t: "absatz" | "ueberschrift"; readonly inhalt: readonly RegeltextInline[] }
  | { readonly t: "liste"; readonly punkte: readonly (readonly RegeltextInline[])[] }
  | { readonly t: "tabelle"; readonly kopf: readonly (readonly RegeltextInline[])[]; readonly zeilen: readonly (readonly (readonly RegeltextInline[])[])[] };
/** Pure; throws RuleValidationError only for limit violations (table size, cell count above the header). */
export function parseRegeltext(text: string): readonly RegeltextBlock[];
/** All `[[id]]` and `[[id|Text]]` targets, for link checks. */
export function regeltextVerweise(text: string): readonly string[];
```
Syntax: blocks are separated by blank lines. `### ` starts a heading. Lines starting with `- ` form a list. Lines starting with `|` form a table: the first row is the header, and a separator row `|---|` is optional and skipped. Everything else is a paragraph, with single newlines joined by a space. Inline: `**…**` bold, `*…*` italic, `[[id]]` or `[[id|Text]]` a reference. Unmatched markers stay literal text. A backslash escapes `*`, `[` and `|`.

- [ ] **Step 1: Failing tests:** paragraphs; heading; list; table with and without a separator; a ragged short row padded with empty cells; a row with more cells than the header fails with "regeltext: table row has more cells than the header"; a table with 4 097 rows fails; nested `**fett *kursiv***`; an unmatched `**` stays literal; `[[zauber-feuerball|Feuerball]]` gives a reference; `<script>` stays plain text in a text node; `regeltextVerweise` finds both reference forms.
- [ ] **Step 2:** Implement with a line scanner and a small recursive inline parser. No regex backtracking on unbounded input: scan by index.
- [ ] **Step 3:** Tests green; commit `feat(rules): safe rule text for the compendium`.

### Task 3: Compendium parsing

**Files:**
- Modify: `packages/rules/src/compendium.ts` (add `parseRuleCompendium`, `compendiumIndex`, `compendiumEntry`, `withoutCompendium`)
- Modify: `packages/rules/src/package-v2.ts` (allowed package keys gain `"compendium"`, `"sprache"`; call the parser after abilities; `sprache` must match `/^[a-z]{2,3}(-[A-Z]{2})?$/`)
- Test: `packages/rules/test/kompendium.test.ts`

**Interfaces (Produces):**
```ts
export function parseRuleCompendium(input: unknown, context: {
  readonly fields: Readonly<Record<string, FieldSchema>>;
  readonly abilityIds: ReadonlySet<string>; readonly actionIds: ReadonlySet<string>; readonly conditionIds: ReadonlySet<string>;
}): RuleCompendium;
export interface CompendiumIndexRow { readonly id: string; readonly kind: string; readonly name: string; readonly group?: string; readonly level?: number; readonly tags?: readonly string[]; readonly summary?: string; readonly vorlage?: "figur" | "gegenstand" }
export interface CompendiumIndex { readonly kinds: readonly CompendiumKind[]; readonly entries: readonly CompendiumIndexRow[] }
export function compendiumIndex(pkg: AnyRulePackage): CompendiumIndex;          // empty kinds/entries when none
export function compendiumEntry(pkg: AnyRulePackage, id: string): CompendiumEntry | null;
export function withoutCompendium(pkg: AnyRulePackage): AnyRulePackage;       // same object when no compendium
```
Rules:
- kinds: `id` identifier, unique; `label`, `plural` and `description` as labels; `attributes` unique by `key` (identifier). `enum` needs `values` (1–256 labels, unique); other types must not have `values`; `unit` is an optional label.
- entries: `id` unique across entries; `kind` must exist; `name` label; `group` label; `level` integer 0–1000; tags are labels, unique, at most `entryTags`; `summary` at most 500 characters; `text` is longText and must pass `parseRegeltext`; every `[[…]]` target must be an entry id; `source.title` label, `source.page` integer 1–100 000.
- attributes: only keys of the kind. Type checks: `text` string ≤ label, `number` finite, `boolean`, `list` array of labels ≤ `attributeListValues`, `enum` value from `values`.
- links: every id must exist in its set, at most `entryLinks` per list.
- figure template: `kind` in `COMPENDIUM_ACTOR_KINDS`; `fields` keys must be package fields. Build `{ ...defaults, ...fields }` and validate with `validateEntityFields(fields, record)` so failures report the field.
- item template: `kategorie` label, `seltenheit` in `COMPENDIUM_RARITIES`, `angaben` at most 8 rows, each label ≤ 80 and value ≤ 600. These are the lootcard limits from `ItemTemplateDefinition`; check them there and copy the exact numbers.

- [ ] **Step 1: Failing tests** (build a small v2 package with one field `staerke`, one ability `kraftschlag`, one action `probe`, one condition `erschoepft`):
  - a valid compendium with kinds `zauber` (attributes `grad:number`, `schule:enum[Hervorrufung,Bannmagie]`, `klassen:list`, `ritual:boolean`) and `kreatur`, plus entries with a figure template, and one `gegenstand` entry with an item template;
  - each rule above failing with its own message (at least 16 cases, one per rule);
  - Review Focus 3: a template missing a field gets its default, and an unknown key fails;
  - the whole package round-trips: `stableJson(parse(pkg)) === stableJson(pkg)`;
  - `compendiumIndex` omits `text`, `attributes`, `links` and `source`;
  - `withoutCompendium` returns the identical object when there is no compendium, and a valid package without the key when there is one.
- [ ] **Step 2:** Implement. Then run the golden test from Task 1: still green.
- [ ] **Step 3: Commit** `feat(rules): parse and index the compendium`.

### Task 4: Several ability lists and `entry`

**Files:**
- Modify: `packages/rules/src/package-v2.ts` (`abilityDeclarations`, `resolveAbilities`, `abilityOverview`; ability keys gain `"entry"`; `abilityRules` keys gain `"lists"`)
- Modify: `packages/rules/src/presentation-v3.ts` (the `abilities` node gains optional `list`)
- Modify: `packages/rules/src/runtime.ts` (runtime gains `abilityLists`; abilities carry `entry` and `list`)
- Test: `packages/rules/test/faehigkeitslisten.test.ts`

**Interfaces (Produces):**
```ts
// AbilityOverview gains (only when lists exist):
readonly lists?: readonly { readonly id: string; readonly learned: readonly string[]; readonly spent: number; readonly budget: number | null; readonly learnable: readonly string[] }[];
// RuleRuntime gains:
readonly abilityLists: readonly { readonly id: string; readonly label: string; readonly field: string }[] | null;
// RuleRuntime ability rows gain: readonly entry?: string; readonly list?: string
export function abilityListOf(pkg: RulePackageV2, ability: RuleAbility): string | null; // null when no lists
```
Rules:
- `lists` has 1–32 entries with unique ids.
- `lists[0].field === abilityRules.abilityField`.
- Each list field is a string field with `maxLength` ≥ 64, not the `conditionField`, not a collection storage field, and unique across lists.
- `groups` are labels. An empty array is allowed only for `lists[0]` (catch-all).
- An optional `budget` is a number expression. The top-level `budget` stays the budget of `lists[0]` when `lists[0].budget` is absent; if both are present the parse fails ("abilityRules: budget twice").
- Membership: the first list with a prefix match (`group === prefix || group.startsWith(prefix + "/")`), else `lists[0]`.
- `resolveAbilities` reads each list field.
  - An id stored in the wrong list fails with "ability X: belongs to list Y".
  - `requires` may point across lists.
  - The budget is checked per list.
- `abilityOverview` keeps the top-level fields as the union across all lists (budget = `lists[0]`'s) and adds `lists`.
- `entry` must be a compendium entry id; ability parsing runs before the compendium, so this check lives in `parseRuleCompendium`'s caller, after both are parsed.
- Presentation: `abilities` nodes may carry `list` (must exist). Uniqueness is keyed by `list ?? "*"`. Without `lists`, only one node without `list` is allowed, as before.

- [ ] **Step 1: Failing tests:**
  - Review Focus 1: a copy of ChronicleHeroes without `lists` gives an overview identical to today's (deep equal) and the same hash;
  - three lists (`merkmale` catch-all, `talente` groups `["Talente"]`, `zauber` groups `["Zauber"]`) with a budget only on `talente`: learning in each list, the wrong-list error, a cross-list `requires`, the per-list budget exceeded;
  - Review Focus 2: an unmatched group lands in `merkmale`;
  - a presentation with three `abilities` nodes (one per list) parses, and two nodes for the same list fail;
  - `entry` pointing at a missing entry fails, and pointing at an existing one passes;
  - the runtime shows `abilityLists` and the `list` of each ability.
- [ ] **Step 2:** Implement. Then run the golden test and all of `packages/rules/test`: green.
- [ ] **Step 3: Commit** `feat(rules): several ability lists and links from abilities to compendium entries`.

### Task 5: Attribution `weitere`

**Files:** Modify `packages/rules/src/package-v2.ts`. Test: `packages/rules/test/kompendium.test.ts` (extend).
- [ ] **Step 1:** Tests:
  - `attribution.weitere` holds up to 16 attributions with the same shape and checks as the main one; nesting inside `weitere` fails;
  - a package with the SRD EN attribution plus an MIT notice in `weitere` round-trips.
- [ ] **Step 2:** Implement: extract the existing attribution check into `attributionRecord(row, at, allowWeitere)`.
- [ ] **Step 3: Commit** `feat(rules): several attributions per package`.

### Task 6: Attack pass

**Files:** Test: `packages/rules/test/kompendium-angriff.test.ts`.
- [ ] **Step 1:** Cases:
  - 65 537 entries → fails on the limit;
  - an entry text of 200 001 characters → fails;
  - a table with 65 columns → fails;
  - `<img src=x onerror=alert(1)>` in text → parses, and `parseRegeltext` returns it as a single text node;
  - a cyclic `[[a]]` ↔ `[[b]]` → parses, and nothing recurses;
  - a template with `__proto__` as a field key → fails;
  - a 40 MB package with 30 000 entries parses within the operation budget and in under 20 s (use `it(..., 120_000)`), which proves no quadratic step.
- [ ] **Step 2:** Fix whatever fails.
- [ ] **Step 3: Commit** `test(rules): attack pass for the compendium`.

### Task 7: Forge drafts pass the new sections through

**Files:**
- Modify: `packages/client/src/features/rule-forge-model.ts` (`packageDraft`, `compilePackage`)
- Test: `packages/client/test/rule-forge-kompendium.test.ts`
- [ ] **Step 1:** Failing test (Review Focus 5): a v2 package with `compendium`, `sprache`, `abilityRules.lists`, `entry` on an ability and `attribution.weitere` gives `stableJson(compilePackage(packageDraft(pkg))) === stableJson(pkg)`.
- [ ] **Step 2:** The draft keeps these as opaque values:
  - `draft.passthrough = { compendium, sprache, lists, weitere }`;
  - ability rows keep `entry`;
  - `compilePackage` writes them back unchanged when present.
  
  Existing draft tests stay green.
- [ ] **Step 3: Commit** `feat(client): forge drafts keep compendium, lists and attributions`.

---

## Phase 2 — Server

### Task 8: Checked-package cache

**Files:**
- Create: `packages/server/src/domain/package-cache.ts`
- Modify: `packages/server/src/domain/rule-package-resolution.ts`, and `packages/server/src/domain/gameplay.ts` (`packageFor`)
- Test: `packages/server/test/package-cache.test.ts`

**Interfaces (Produces):**
```ts
/** Parsed, hash-verified packages by content hash; LRU bounded by serialized bytes (default 256 MiB). */
export function checkedPackage(document: unknown, contentHash: string): AnyRulePackage; // throws Gone("corrupt-package") on mismatch
export function packageCacheStats(): { entries: number; bytes: number };
```
- [ ] **Step 1: Failing tests:**
  - the second call with the same hash does not parse again (spy on `parseSupportedRulePackage` through a counter the module exports for tests);
  - a wrong hash throws `Gone("corrupt-package")` and is not cached;
  - once the byte limit is exceeded, the oldest entry leaves;
  - the existing `rule-runtime-http.test.ts` corrupt-store case still returns its error.
- [ ] **Step 2:** Implement. Both resolution paths call `checkedPackage`. The demo package stays a direct constant.
- [ ] **Step 3:** Run `npx vitest run packages/server/test/rule-runtime-http.test.ts packages/server/test/package-cache.test.ts`, then commit `perf(server): check a rule package once per content hash`.

### Task 9: Compendium routes

**Files:**
- Modify: `packages/protocol/src/rule-runtime.ts` (`CompendiumSelection = { packageId, packageVersion }`, `CompendiumEntrySelection = { packageId, packageVersion, id }`, same string limits as `RuleRuntimeSelection`)
- Modify: `packages/server/src/http/gameplay.ts`
- Test: `packages/server/test/kompendium-http.test.ts`
- [ ] **Step 1: Failing tests** against `buildApp`, with a package installed that has two kinds and three entries:
  - `GET /api/campaigns/:id/rules/compendium?packageId&packageVersion` returns 200 with `{ kinds, entries }` and no `text`, for game master and player alike;
  - it sends an `ETag` equal to the content hash, and a request with `If-None-Match` returns 304;
  - `GET …/rules/compendium/entry?…&id=x` returns the full entry;
  - an unknown id returns 404;
  - a non-member gets 404 (same body as unknown, following the S-P1 rule of this codebase);
  - a package that is not installed returns 404;
  - the demo package returns empty kinds and entries.
- [ ] **Step 2:** Implement both routes with `resolveRulePackage` and `requireMember` (any role), plus `compendiumIndex` and `compendiumEntry`.
- [ ] **Step 3: Commit** `feat(server): read the compendium of an installed package`.

### Task 10: Lean listing, full package on request

**Files:**
- Modify: `packages/server/src/domain/gameplay.ts` (`listPackages`)
- Modify: `packages/server/src/http/gameplay.ts` (new `GET …/rules/package?packageId&packageVersion`, game master only)
- Modify: `packages/client/src/features/game-api.ts` (`RulePackageStand` gains `kompendium?: number`)
- Modify: `packages/client/src/features/RuleForge.tsx` (fetch the full document before viewing or drafting when `kompendium > 0`)
- Tests: `packages/server/test/kompendium-http.test.ts` (extend) and `packages/client/test/rule-forge-kompendium.test.ts` (extend with a harness test)
- [ ] **Step 1: Failing tests:**
  - `GET /rules` returns the package without `compendium`, and its `bibliothek` row has `kompendium: 3`;
  - `GET …/rules/package` returns the full document with the same content hash as stored;
  - a player gets 404;
  - harness: opening that package as a draft requests `/rules/package` first, and the compiled draft contains the compendium.
- [ ] **Step 2:** Implement.
- [ ] **Step 3: Commit** `feat(rules): lean package listing, full package when the forge needs it`.

### Task 11: Bundled packages install by id

**Files:**
- Create: `packages/rules/data/README.md`, stating that bundled large rule packages live here as `<id>.rules.json.gz` and that each one ships its attribution inside the package.
- Create: `packages/server/src/domain/rule-templates.ts`
- Modify: `packages/server/src/http/gameplay.ts` (`GET /api/rule-templates`; `POST …/rules/install-template { templateId }`, game master only)
- Modify: `packages/desktop/tools/build.mjs` (copy `packages/rules/data/*.rules.json.gz` into the app resources; the server resolves the folder through an env var `ATLAS_RULE_DATA` or relative to the rules package)
- Test: `packages/server/test/rule-templates.test.ts`

**Interfaces (Produces):**
```ts
export interface RuleTemplateCard { readonly id: string; readonly name: string; readonly version: string; readonly sprache?: string; readonly eintraege: number; readonly bytes: number; readonly attributionTitle?: string }
export function listRuleTemplates(dir?: string): Promise<readonly RuleTemplateCard[]>;
export function loadRuleTemplate(id: string, dir?: string): Promise<AnyRulePackage>; // parses + caches by hash; throws Gone("template") if unknown
```
- [ ] **Step 1: Failing tests** with a temp dir holding one generated `.rules.json.gz` (a small compendium package):
  - the list shows it with its entry count;
  - install-template installs it, and a second call is idempotent through `install()`;
  - an unknown id returns 404;
  - a file whose inner `id` does not match its file name is skipped from the list, with no crash;
  - a path traversal id (`../x`) returns 404.
- [ ] **Step 2:** Implement. Add the desktop copy, then run `npm run desktop:build` once the main checkout is free. It must report the data folder.
- [ ] **Step 3: Commit** `feat(server): bundled rule packages install by id`.

---

## After Phase 2

Phase 3 (Nachschlagen, sheet links, adopt as template, several lists on the sheet, compendium in the forge) and Phase 4 (SRD 5.2.1 pipeline and packages DE/EN) get their own plans, written against the interfaces above once Tasks 1–11 are merged.
