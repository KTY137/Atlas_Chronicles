// Copyright (c) 2026 Atlas Chronicles contributors. SPDX-License-Identifier: MIT
import { canonicalHash, canonicalJson, textHash, type CanonicalValue } from "@chronicle/core";
import { importiereEronKarte } from "@chronicle/forge";
import { stableJson } from "@chronicle/rules";
import { LEGACY_CAMPAIGN_RULES, type CampaignRulesProfile } from "./campaign-rules-profile.ts";
import { requireReciprocalMintEvidence } from "./campaign-current-evidence.ts";
import { CAMPAIGN_TABLES, CAMPAIGN_MODULES, CAMPAIGN_EXCLUSIONS, CAMPAIGN_BUNDLE_LIMITS, type CampaignColumn, type CampaignModule, type CampaignRow, type CampaignTableName, type CampaignTables } from "./campaign-schema.ts";
import { ImportValidationError } from "./validation.ts";
import { createWikiBundle, type WikiBundleData } from "./bundle.ts";

export const CAMPAIGN_BUNDLE_VERSION = 1 as const;
export interface CampaignBundleData { readonly campaignId: string; readonly universeId: string; readonly exportedAt: string; readonly tables: CampaignTables }
export interface CampaignBundle {
  readonly format: "atlas-chronicles/campaign";
  readonly version: 1;
  readonly manifest: {
    readonly profile: "complete-campaign"; readonly projection: "gm";
    readonly campaignId: string; readonly universeId: string; readonly exportedAt: string;
    readonly blockAstVersion: 1; readonly rulePackageSchemaVersion: 1; readonly contentHash: string;
    readonly modules: readonly { readonly name: CampaignModule; readonly version: 1; readonly count: number; readonly sha256: string }[];
    readonly excluded: typeof CAMPAIGN_EXCLUSIONS; readonly assetMode: "source-artifacts-only";
  };
  readonly tables: CampaignTables;
}
type Row = Record<string, CanonicalValue>;
const fail = (path: string, message: string): never => { throw new ImportValidationError(path, message); };
const hash = (value: unknown): string => canonicalHash(value as CanonicalValue);
/** Historical game seals deliberately retain their original rules stableJson encoding. */
const sealHash = (value: unknown): string => textHash(stableJson(value));
const object = (value: unknown, path: string): Row => {
  if (!value || typeof value !== "object" || Array.isArray(value)) fail(path, "object required");
  return value as Row;
};
const list = (value: unknown, path: string, max: number = CAMPAIGN_BUNDLE_LIMITS.rowsPerTable): CanonicalValue[] => {
  if (!Array.isArray(value) || value.length > max) fail(path, `array of at most ${max} items required`);
  return value as CanonicalValue[];
};
const string = (value: unknown, path: string, max = 128): string => {
  if (typeof value !== "string" || !value.length || value.length > max) fail(path, "bounded nonempty string required");
  return value as string;
};
function keys(row: Row, required: readonly string[], path: string, optional: readonly string[] = []): void {
  for (const key of Object.keys(row)) if (!required.includes(key) && !optional.includes(key)) fail(`${path}.${key}`, "unknown field; explicit migration required");
  for (const key of required) if (!Object.hasOwn(row, key)) fail(`${path}.${key}`, "required field missing");
}
function numeric(value: unknown, path: string, minimum = 0): number {
  if (typeof value !== "number" || !Number.isSafeInteger(value) || value < minimum) fail(path, "bounded integer required");
  return value as number;
}
function digest(value: unknown, path: string): string {
  const result = string(value, path, 64); if (!/^[a-f0-9]{64}$/.test(result)) fail(path, "SHA256 lowercase hex required"); return result;
}
function assertJson(value: unknown): void {
  let nodes = 0; const ancestors = new Set<object>();
  const walk = (v: unknown, depth: number, path: string): void => {
    if (++nodes > CAMPAIGN_BUNDLE_LIMITS.nodes || depth > CAMPAIGN_BUNDLE_LIMITS.depth) fail(path, "JSON complexity limit exceeded");
    if (v === null || typeof v === "boolean") return;
    if (typeof v === "number") { if (!Number.isFinite(v)) fail(path, "finite JSON number required"); return; }
    if (typeof v === "string") { if (v.length > CAMPAIGN_BUNDLE_LIMITS.stringLength) fail(path, "string limit exceeded"); return; }
    if (!v || typeof v !== "object") fail(path, "JSON value required");
    const ref = v as object;
    if (ancestors.has(ref)) fail(path, "cyclic JSON value");
    const proto = Object.getPrototypeOf(v);
    if (!Array.isArray(v) && proto !== Object.prototype && proto !== null) fail(path, "plain JSON object required");
    ancestors.add(ref);
    if (Array.isArray(v)) {
      if (v.length > CAMPAIGN_BUNDLE_LIMITS.nodes) fail(path, "array limit exceeded");
      if (Reflect.ownKeys(v).some(k => k !== "length" && (typeof k !== "string" || !/^(0|[1-9][0-9]*)$/.test(k) || Number(k) >= v.length))) fail(path, "non-JSON array properties are forbidden");
      for (let i = 0; i < v.length; i++) {
        const d = Object.getOwnPropertyDescriptor(v, String(i));
        if (!d || !("value" in d)) fail(path, "sparse arrays and accessors are forbidden");
        walk(d!.value, depth + 1, `${path}[${i}]`);
      }
    } else {
      for (const key of Reflect.ownKeys(ref)) {
        if (typeof key !== "string" || ["__proto__", "prototype", "constructor"].includes(key)) fail(path, "unsafe JSON key");
        const k = key as string, d = Object.getOwnPropertyDescriptor(ref, k)!;
        if (!d.enumerable || !("value" in d)) fail(path, "hidden fields and accessors are forbidden");
        walk(d.value, depth + 1, `${path}.${k}`);
      }
    }
    ancestors.delete(ref);
  };
  walk(value, 0, "$");
}
function validateColumn(value: CanonicalValue | undefined, c: CampaignColumn, path: string): void {
  if (value === null && c.nullable) return;
  if (c.kind === "json") { if (value === undefined || value === null) fail(path, "JSON document required"); return; }
  if (c.kind === "bigint") {
    if (typeof value !== "string" || !/^(0|[1-9][0-9]{0,18})$/.test(value) || BigInt(value) > 9223372036854775807n) fail(path, "nonnegative SQL bigint must be a canonical decimal string");
    return;
  }
  if (c.kind === "text") {
    if (typeof value !== "string" || value.length > (c.maxLength ?? 1_000_000)) fail(path, "bounded text required");
    if (c.values && !c.values.includes(value as string)) fail(path, "unsupported enum value; explicit migration required");
    if (c.pattern && !new RegExp(c.pattern).test(value as string)) fail(path, "invalid string encoding");
    return;
  }
  if (c.kind === "boolean") { if (typeof value !== "boolean") fail(path, "boolean required"); return; }
  if (typeof value !== "number" || !Number.isFinite(value) || (c.kind === "integer" && !Number.isSafeInteger(value)) || value < (c.minimum ?? -Infinity) || value > (c.maximum ?? Infinity)) fail(path, "number outside declared range");
}
const keyOf = (row: CampaignRow, columns: readonly string[]): string => canonicalJson(columns.map(k => row[k]!) as CanonicalValue);
const compare = (a: string, b: string): number => a < b ? -1 : a > b ? 1 : 0;
function normalizeTables(value: unknown): CampaignTables {
  const input = object(value, "tables"); keys(input, CAMPAIGN_TABLES.map(t => t.name), "tables");
  let total = 0; const output: Record<string, CampaignRow[]> = {};
  for (const spec of CAMPAIGN_TABLES) {
    const rows = list(input[spec.name], `tables.${spec.name}`); total += rows.length;
    if (total > CAMPAIGN_BUNDLE_LIMITS.rows) fail("tables", "total row limit exceeded");
    const unique = new Set<string>();
    output[spec.name] = rows.map((value, i) => {
      const path = `tables.${spec.name}[${i}]`, row = object(value, path); keys(row, spec.columns, path);
      for (const [key, field] of Object.entries(spec.fields)) validateColumn(row[key], field, `${path}.${key}`);
      for (const key of spec.primaryKey) if (row[key] === "") fail(path, "empty primary key");
      const pk = keyOf(row, spec.primaryKey); if (unique.has(pk)) fail(path, "duplicate primary key"); unique.add(pk);
      return JSON.parse(JSON.stringify(row)) as CampaignRow;
    }).sort((a, b) => {
      for (const key of spec.primaryKey) {
        const av = String(a[key]), bv = String(b[key]);
        const order = spec.bigintColumns.includes(key) ? (BigInt(av) < BigInt(bv) ? -1 : BigInt(av) > BigInt(bv) ? 1 : 0) : compare(av, bv);
        if (order) return order;
      }
      return 0;
    });
  }
  return output as unknown as CampaignTables;
}
function moduleManifest(tables: CampaignTables): CampaignBundle["manifest"]["modules"] {
  return CAMPAIGN_MODULES.map(name => {
    const specs = CAMPAIGN_TABLES.filter(t => t.module === name), payload = Object.fromEntries(specs.map(t => [t.name, tables[t.name]]));
    return { name, version: 1, count: specs.reduce((count, t) => count + tables[t.name].length, 0), sha256: hash(payload) };
  });
}

class Graph {
  private readonly indexes = new Map<string, Map<string, CampaignRow>>();
  private readonly groups = new Map<string, Map<string, CampaignRow[]>>();
  constructor(readonly tables: CampaignTables) {}
  has(table: CampaignTableName, value: unknown, key = "id"): boolean {
    let index = this.indexes.get(`${table}:${key}`);
    if (!index) { index = new Map(this.tables[table].map(r => [String(r[key]), r])); this.indexes.set(`${table}:${key}`, index); }
    return typeof value === "string" && index.has(value);
  }
  group(table: CampaignTableName, key: string, value: CanonicalValue): readonly CampaignRow[] {
    const cacheKey = `${table}:${key}`; let index = this.groups.get(cacheKey);
    if (!index) { index = new Map(); for (const row of this.tables[table]) { const k = String(row[key]), rows = index.get(k) ?? []; rows.push(row); index.set(k, rows); } this.groups.set(cacheKey, index); }
    return index.get(String(value)) ?? [];
  }
  ref(table: CampaignTableName, value: unknown, path: string, key = "id"): CampaignRow {
    const id = string(value, path); let index = this.indexes.get(`${table}:${key}`);
    if (!index) { index = new Map(this.tables[table].map(r => [String(r[key]), r])); this.indexes.set(`${table}:${key}`, index); }
    const row = index.get(id); if (!row) fail(path, `missing ${table} reference`); return row!;
  }
  composite(table: CampaignTableName, columns: readonly string[], values: readonly unknown[], path: string): CampaignRow {
    const key = `${table}:${columns.join(",")}`; let index = this.indexes.get(key);
    if (!index) { index = new Map(this.tables[table].map(r => [keyOf(r, columns), r])); this.indexes.set(key, index); }
    const row = index.get(canonicalJson(values as CanonicalValue)); if (!row) fail(path, `missing ${table} composite reference`); return row!;
  }
  unique(table: CampaignTableName, columns: readonly string[], predicate: (r: CampaignRow) => boolean = () => true): void {
    const seen = new Set<string>();
    for (const row of this.tables[table].filter(predicate)) { const key = keyOf(row, columns); if (seen.has(key)) fail(table, `duplicate ${columns.join(",")}`); seen.add(key); }
  }
  revision(revision: unknown, entry: unknown, path: string): CampaignRow { const r = this.ref("revisions", revision, path); if (r.entry_id !== entry) fail(path, "revision belongs to another entry"); return r; }
  package(row: CampaignRow, path: string): CampaignRow { return this.composite("rule_packages", ["campaign_id", "package_id", "version"], [row.campaign_id, row.package_id, row.package_version], path); }
}

function checkGraph(t: CampaignTables, campaignId: string, universeId: string, rules: CampaignRulesProfile): void {
  const g = new Graph(t);
  if (t.campaigns.length !== 1 || t.campaigns[0]!.id !== campaignId || t.universes.length !== 1 || t.universes[0]!.id !== universeId) fail("identities", "exactly the declared campaign and universe are required");
  const userKeys = ["owner_user_id", "user_id", "created_by", "author_user_id", "granted_by", "accepted_by", "installed_by", "started_by", "issued_by", "prepared_by", "updated_by", "sent_by", "reader_user_id", "actor_user_id"];
  for (const spec of CAMPAIGN_TABLES) for (const row of t[spec.name]) {
    const path = `tables.${spec.name}.${keyOf(row, spec.primaryKey)}`;
    if (Object.hasOwn(row, "campaign_id") && row.campaign_id !== campaignId) fail(path, "cross-campaign row");
    if (Object.hasOwn(row, "universe_id") && row.universe_id !== universeId) fail(path, "cross-universe row");
    for (const key of userKeys) if (row[key] !== undefined && row[key] !== null) g.ref("users", row[key], `${path}.${key}`);
    if (row.actor_id !== undefined && row.actor_id !== null) g.ref("actors", row.actor_id, path);
    if (row.entry_id !== undefined && row.entry_id !== null) g.ref("entries", row.entry_id, path);
    if (row.passage_id !== undefined) g.ref("passages", row.passage_id, path);
  }
  g.unique("entries", ["slug"]); g.unique("revisions", ["entry_id", "seq"]); g.unique("campaign_memberships", ["name_skeleton"]);
  g.unique("artifacts", ["campaign_id", "kind", "source_hash"]); g.unique("scenes", ["campaign_id"], r => r.status === "active");
  g.unique("game_sessions", ["campaign_id"], r => r.ended_at === null);
  for (const name of ["action_rolls", "action_vollmachten", "letters", "confirmed_mints"] as const) {
    const who = name === "action_rolls" ? "prepared_by" : name === "action_vollmachten" ? "issued_by" : name === "letters" ? "sent_by" : "user_id";
    g.unique(name, ["campaign_id", who, "command_id"]);
  }
  g.unique("confirmed_mints", ["roll_id"], r => r.roll_id !== null);
  for (const r of t.campaign_memberships) if (r.actor_id !== null && g.ref("actors", r.actor_id, "memberships.actor_id").user_id !== r.user_id) fail("memberships", "actor controller differs from member");
  const parentEdges = new Map<string, string[]>();
  for (const r of t.entries) {
    const revision = g.revision(r.current_revision_id, r.id, "entries.current_revision_id");
    if (revision.seq !== r.version) fail("entries", "version differs from current revision sequence");
    if (r.parent_entry_id !== null) { g.ref("entries", r.parent_entry_id, "entries.parent_entry_id"); parentEdges.set(String(r.id), [String(r.parent_entry_id)]); }
  }
  acyclic(parentEdges, "entries.parent_entry_id");
  for (const r of t.passages) {
    g.revision(r.revision_id, r.entry_id, "passages.revision_id");
    if (r.retired_at_revision !== null) g.revision(r.retired_at_revision, r.entry_id, "passages.retired_at_revision");
    textArray(r.path, "passages.path"); textArray(r.tags, "passages.tags"); block(r.content, "passages.content");
    if (r.praegung !== null) source(r.praegung, "passages.praegung", g, true);
  }
  g.unique("passages", ["entry_id", "ord"], r => r.retired_at_revision === null);
  for (const r of t.revelations) { if (r.vollmacht_id !== null) g.ref("vollmachten", r.vollmacht_id, "revelations.vollmacht_id"); source(r.quelle, "revelations.quelle", g, false); }
  const entriesBySlug = new Map(t.entries.map(e => [e.slug, e.id]));
  // Rename A -> B -> A leaves the historical self-alias in the current server.
  // It names the same identity and is harmless; a competing identity is not.
  for (const r of t.entry_aliases) if (entriesBySlug.has(r.slug) && entriesBySlug.get(r.slug) !== r.entry_id) fail("entry_aliases", "alias shadows another entry's slug");
  const lineage = new Map<string, string[]>();
  for (const r of t.lineage_events) {
    g.revision(r.revision_id, r.entry_id, "lineage.revision_id"); const e = object(r.event, "lineage.event"), kind = String(e.kind);
    let parents: string[] = [], children: string[] = [];
    if (["create", "revise", "retire"].includes(kind)) { keys(e, ["kind", "pid"], "lineage.event"); children = [string(e.pid, "lineage.pid")]; }
    else if (kind === "split") { keys(e, ["kind", "parent", "children"], "lineage.event"); parents = [string(e.parent, "lineage.parent")]; children = textArray(e.children, "lineage.children"); if (children.length < 2) fail("lineage", "split requires two children"); }
    else if (kind === "merge") { keys(e, ["kind", "parents", "child"], "lineage.event"); parents = textArray(e.parents, "lineage.parents"); children = [string(e.child, "lineage.child")]; if (parents.length < 2) fail("lineage", "merge requires two parents"); }
    else fail("lineage", "unknown lineage kind");
    if (new Set(parents).size !== parents.length || new Set(children).size !== children.length) fail("lineage", "duplicate lineage participant");
    for (const id of [...parents, ...children]) if (g.ref("passages", id, "lineage.participant").entry_id !== r.entry_id) fail("lineage", "lineage crosses entries");
    for (const p of parents) for (const c of children) { if (p === c && kind === "merge") continue; const edges = lineage.get(p) ?? []; edges.push(c); lineage.set(p, edges); }
  }
  acyclic(lineage, "lineage");
  for (const r of t.import_acceptances) { g.ref("artifacts", r.artifact_id, "acceptances.artifact_id"); g.revision(r.revision_id, r.entry_id, "acceptances.revision_id"); }
  for (const r of t.atlas_maps) { const a = g.ref("artifacts", r.artifact_id, "maps.artifact_id"); if (a.kind !== "azgaar" && a.kind !== "eron-map") fail("maps", "map needs an Azgaar or Fandom map artifact"); }
  for (const r of t.atlas_nodes) { g.ref("atlas_maps", r.map_id, "nodes.map_id"); const node = object(r.data, "nodes.data"); if (node.id !== r.id) fail("nodes", "node identity differs from data"); }
  for (const r of t.atlas_revelations) g.composite("atlas_nodes", ["map_id", "id"], [r.map_id, r.node_id], "atlas_revelations.node_id");
  for (const map of t.atlas_maps) atlasNodes(g.group("atlas_nodes", "map_id", map.id!).map(r => r.data), "atlas_nodes", g);
  for (const r of [...t.campaign_rule_pins, ...t.actor_sheets, ...t.action_vollmachten, ...t.action_rolls]) g.package(r, "package pin");
  for (const r of t.scenes) for (const id of textArray(r.entry_ids, "scenes.entry_ids")) g.ref("entries", id, "scenes.entry_ids");
  for (const r of t.game_sessions) { g.ref("scenes", r.scene_id, "sessions.scene_id"); if (r.ended_at !== null && BigInt(String(r.ended_at)) < BigInt(String(r.started_at))) fail("sessions", "session ends before it starts"); }
  for (const [authName, rollName] of [["vollmachten", "rolls"], ["action_vollmachten", "action_rolls"]] as const) {
    g.unique(rollName, ["vollmacht_id"], r => r.vollmacht_id !== null && r.status === "ausstehend");
    for (const r of t[authName]) {
      if (BigInt(String(r.expires_at)) <= BigInt(String(r.issued_at))) fail(authName, "authorization expiry must follow issuance");
      if (r.consumed_roll_id !== null && g.ref(rollName, r.consumed_roll_id, `${authName}.consumed_roll_id`).vollmacht_id !== r.id) fail(authName, "consumed roll belongs to another authorization");
    }
    for (const r of t[rollName]) if (r.vollmacht_id !== null) {
      const a = g.ref(authName, r.vollmacht_id, `${rollName}.vollmacht_id`);
      if (rollName === "action_rolls" && (a.actor_id !== r.actor_id || a.passage_id !== r.target_passage_id || a.package_id !== r.package_id || a.package_version !== r.package_version || a.action_id !== r.action_id)) fail(rollName, "roll differs from its authorization scope");
    }
  }
  for (const r of t.action_rolls) {
    if (r.target_passage_id !== null) g.ref("passages", r.target_passage_id, "roll.target_passage_id");
    if ((r.target_passage_id === null) !== (r.target_passage_hash === null)) fail("roll", "target passage and hash must occur together");
    if (r.scene_id !== null) g.ref("scenes", r.scene_id, "roll.scene_id");
    if (r.session_id !== null && g.ref("game_sessions", r.session_id, "roll.session_id").scene_id !== r.scene_id) fail("roll", "session and scene disagree");
    if (r.status === "ausstehend" && (r.confirmed_at !== null || r.confirmation !== null)) fail("roll", "pending roll has confirmation");
    if (r.status === "bestaetigt" && (r.confirmed_at === null || r.confirmation === null)) fail("roll", "confirmed roll lacks confirmation");
  }
  for (const r of t.confirmed_mints) { const p = g.ref("passages", r.passage_id, "mint.passage_id"); g.revision(r.revision_id, p.entry_id, "mint.revision_id"); if (r.roll_id !== null) g.ref("action_rolls", r.roll_id, "mint.roll_id"); }
  for (const r of t.letters) { g.ref("actors", r.from_actor_id, "letter.from_actor_id"); if (Number(r.arrival_day) < Number(r.sent_day)) fail("letters", "arrival precedes sending"); }
  for (const r of t.letter_recipients) {
    g.ref("letters", r.letter_id, "recipient.letter_id");
    if ((r.delivered_at === null) !== (r.delivered_day === null) || (r.delivered_at === null) !== (r.delivered_label === null) || (r.read_at === null) !== (r.read_day === null) || (r.delivered_at === null && r.read_at !== null)) fail("recipient", "incomplete delivery/read state");
  }
  for (const r of t.letter_delivery_receipts) g.composite("letter_recipients", ["letter_id", "actor_id"], [r.letter_id, r.actor_id], "delivery recipient");
  for (const r of t.week_baselines) {
    const session = g.ref("game_sessions", r.session_id, "baseline.session_id"); if (r.captured_at !== session.started_at) fail("baseline", "baseline capture differs from session start");
    for (const v of list(r.knowledge, "baseline.knowledge")) { const item = object(v, "baseline.knowledge"); keys(item, ["actorId", "passageId", "quelle", "grantedAt"], "baseline.knowledge"); g.ref("actors", item.actorId, "baseline.actorId"); g.ref("passages", item.passageId, "baseline.passageId"); source(item.quelle, "baseline.quelle", g, false); numeric(item.grantedAt, "baseline.grantedAt"); }
  }
  for (const r of t.campaign_messages) { if (r.session_id !== null || r.expires_at !== null || typeof r.body !== "string" || !r.body.length) fail("messages", "ephemeral table state is forbidden"); if (r.parent_id !== null) g.ref("campaign_messages", r.parent_id, "message.parent_id"); }
  acyclic(new Map(t.campaign_messages.filter(r => r.parent_id !== null).map(r => [String(r.id), [String(r.parent_id)]])), "messages.parent_id");
  for (const r of t.access_incidents) g.ref("vollmachten", r.vollmacht_id, "access_incidents.vollmacht_id");
  for (const r of t.reading_watermarks) for (const [pid, savedHash] of Object.entries(object(r.projected_hashes, "watermark.projected_hashes"))) { if (g.ref("passages", pid, "watermark.passage").entry_id !== r.entry_id) fail("watermark", "saved passage belongs to another entry"); digest(savedHash, "watermark.hash"); }
  for (const r of t.audit) audit(r, g);
  checkEvidence(t, g, rules);
}

function acyclic(edges: ReadonlyMap<string, readonly string[]>, path: string): void {
  const visited = new Set<string>(), active = new Set<string>();
  for (const start of edges.keys()) {
    const stack: { id: string; leave: boolean }[] = [{ id: start, leave: false }];
    while (stack.length) {
      const { id, leave } = stack.pop()!;
      if (leave) { active.delete(id); visited.add(id); continue; }
      if (active.has(id)) fail(path, "cyclic graph"); if (visited.has(id)) continue;
      active.add(id); stack.push({ id, leave: true });
      for (const child of edges.get(id) ?? []) stack.push({ id: child, leave: false });
    }
  }
}
function textArray(value: unknown, path: string): string[] { return list(value, path).map((v, i) => string(v, `${path}[${i}]`, 100_000)); }

function source(value: unknown, path: string, g: Graph, mint: boolean): void {
  const r = object(value, path), art = String(r.art);
  const fields = mint ? { wurf: "wurfId", gesprochen: "sitzung", ratifikation: "sitzung", berichtigung: "ersetzt", vollmacht: "vollmachtId" }
    : { wurf: "wurfId", gesprochen: "sitzung", gehoert: "von", passage: "ueber" };
  const key = (fields as Record<string, string>)[art]; if (!key) fail(path, "unknown source kind"); keys(r, ["art", key!], path); string(r[key!], path, 1024);
  if (art === "berichtigung" || art === "passage") g.ref("passages", r[key!], path);
  if (art === "gehoert") g.ref("actors", r[key!], path);
  if (art === "vollmacht") g.ref("action_vollmachten", r[key!], path);
  if (art === "wurf" && !g.has("action_rolls", r[key!]) && !g.has("rolls", r[key!])) fail(path, "missing roll source");
}
function inline(value: unknown, path: string): void {
  for (const item of list(value, path)) {
    const r = object(item, path); keys(r, ["text", "marks"], path); if (typeof r.text !== "string") fail(path, "inline text required");
    for (const value of list(r.marks, path, 32)) { const mark = object(value, path), art = String(mark.art); if (art === "link") { keys(mark, ["art", "zielSlug"], path, ["zielEntryId"]); string(mark.zielSlug, path, 512); if (mark.zielEntryId !== undefined) string(mark.zielEntryId, path); }
      else { keys(mark, ["art"], path); if (!["em", "strong", "code"].includes(art)) fail(path, "unknown inline mark"); } }
  }
}
function block(value: unknown, path: string): void {
  const r = object(value, path), kind = String(r.kind);
  // A figure grew optional fields (file name, alt text, alignment, width). They are OPTIONAL
  // here on purpose: a bundle written before images were imported carries none of them and must
  // keep validating — a published meaning is never silently redefined.
  if (["absatz", "zitat", "bildunterschrift"].includes(kind)) { keys(r, kind === "bildunterschrift" ? ["kind", "assetId", "inhalt"] : ["kind", "inhalt"], path, kind === "bildunterschrift" ? ["dateiname", "alt", "ausrichtung", "breite", "ausInfobox"] : []);
    if (kind === "bildunterschrift") { string(r.assetId, path);
      for (const key of ["dateiname", "alt"]) if (r[key] !== undefined) string(r[key], path, 2000);
      if (r.ausrichtung !== undefined && !["links", "rechts", "zentriert", "ohne"].includes(String(r.ausrichtung))) fail(path, "invalid image alignment");
      if (r.breite !== undefined && (typeof r.breite !== "number" || !Number.isSafeInteger(r.breite) || r.breite < 1)) fail(path, "invalid image width");
      if (r.ausInfobox !== undefined && typeof r.ausInfobox !== "boolean") fail(path, "invalid infobox flag"); }
    inline(r.inhalt, path); }
  else if (kind === "feld") { keys(r, ["kind", "schluessel", "label", "werte", "mehrwertig", "klauselKandidat"], path, ["gruppe"]); string(r.schluessel, path, 512); string(r.label, path, 1000); if (r.gruppe !== undefined) string(r.gruppe, path, 1000); if (typeof r.mehrwertig !== "boolean" || typeof r.klauselKandidat !== "boolean") fail(path, "field flags required"); const values = list(r.werte, path); if (!r.mehrwertig && values.length !== 1) fail(path, "single field needs exactly one value"); for (const v of values) inline(v, path); }
  else if (kind === "liste") { keys(r, ["kind", "geordnet", "punkte"], path); if (typeof r.geordnet !== "boolean") fail(path, "list ordering required"); for (const v of list(r.punkte, path)) inline(v, path); }
  else if (kind === "rohblock") { keys(r, ["kind", "quelltext", "grund"], path); if (typeof r.quelltext !== "string" || !["wikitabelle", "unbekannte-vorlage", "generator-prosa", "sonstiges"].includes(String(r.grund))) fail(path, "invalid raw block"); }
  else fail(path, "unknown block AST version or kind");
}

function checkEvidence(t: CampaignTables, g: Graph, rules: CampaignRulesProfile): void {
  const importSources = new Set<string>();
  for (const a of t.artifacts) if (a.kind === "eron-preview") {
    const s = object(object(object(a.source, "artifact.source").result, "artifact.result").source, "artifact.originalSource");
    for (const value of list(s.articles, "artifact.originalSource.articles")) { const page = object(value, "artifact.originalSource.article"); importSources.add(hash([s.wikiUrl, page.pageid, page.revid])); }
  }
  for (const r of t.revisions) {
    const document = object(r.document, "revision.document");
    // Migration 002 explicitly created {} for older revisions. Preserve this known
    // absence rather than inventing a historical snapshot or silently rewriting its hash.
    if (Object.keys(document).length === 0 && r.created_at === "0") continue;
    if (r.content_hash !== (document.mint === undefined ? hash(document) : sealHash(document))) fail("revision.content_hash", "revision document digest mismatch");
    keys(document, ["title", "slug", "passagen", "tags"], "revision.document", ["mint", "importArtifactId"]);
    string(document.title, "revision.title", 512); string(document.slug, "revision.slug", 512);
    if (document.importArtifactId !== undefined) g.ref("artifacts", document.importArtifactId, "revision.importArtifactId");
    const ps = list(document.passagen, "revision.passagen"), tags = list(document.tags, "revision.tags"); if (ps.length !== tags.length) fail("revision", "snapshot tags and passages differ in length");
    for (const [i, value] of ps.entries()) {
      const p = object(value, "revision.passage");
      keys(p, ["pid", "entryId", "gen", "ord", "pfad", "inhalt", "geltung", "praegung", "erstelltInRevision"], "revision.passage", ["autorUserId", "autorActorId", "zurueckgezogenInRevision"]);
      if (p.entryId !== r.entry_id || g.ref("passages", p.pid, "revision.passage.pid").entry_id !== r.entry_id) fail("revision", "snapshot passage belongs to another entry");
      g.revision(p.erstelltInRevision, r.entry_id, "revision.passage.erstelltInRevision");
      if (p.zurueckgezogenInRevision !== undefined) g.revision(p.zurueckgezogenInRevision, r.entry_id, "revision.passage.zurueckgezogenInRevision");
      if (p.autorUserId !== undefined) g.ref("users", p.autorUserId, "revision.author"); if (p.autorActorId !== undefined) g.ref("actors", p.autorActorId, "revision.actor");
      numeric(p.gen, "snapshot.gen", 1); numeric(p.ord, "snapshot.ord"); textArray(p.pfad, "snapshot.pfad"); textArray(tags[i], "snapshot.tags"); block(p.inhalt, "snapshot.inhalt");
      if (!["notiz", "antrag", "kanon"].includes(String(p.geltung))) fail("snapshot.geltung", "unknown validity"); if (p.praegung !== null) source(p.praegung, "snapshot.praegung", g, true);
    }
    if (document.mint !== undefined) provenance(document.mint, "revision.mint", g);
  }
  for (const r of t.rule_packages) {
    try { const pkg = rules.parse(r.document); if (pkg.id !== r.package_id || pkg.version !== r.version || sealHash(pkg) !== r.content_hash) fail("rule_packages", "package identity or digest mismatch"); }
    catch (e) { if (e instanceof ImportValidationError) throw e; fail("rule_packages.document", `invalid rule package: ${e instanceof Error ? e.message : "validation failed"}`); }
  }
  for (const r of t.actor_sheets) {
    try { rules.fields(rules.parse(g.package(r, "sheet.package").document), r.fields); }
    catch (e) { fail("actor_sheets.fields", `invalid fields: ${e instanceof Error ? e.message : "validation failed"}`); }
  }
  // Classified outcomes cannot be reinterpreted by a threshold-only authorization,
  // including authorizations that have never been consumed by a roll.
  if (rules.name === "rules-v1-v2@1") for (const r of t.action_vollmachten) {
    const pkg = rules.parse(g.package(r, "authorization.package").document);
    if (pkg.schemaVersion === 2) {
      const action = pkg.actions.find(action => action.id === r.action_id);
      if (!action || action.outcome) fail("action_vollmachten", "classified or missing action cannot use threshold authorization");
    }
  }
  for (const r of t.action_rolls) {
    const receipt = object(r.receipt, "roll.receipt"), pkg = rules.parse(g.package(r, "roll.package").document);
    if (sealHash(receipt) !== r.receipt_hash || !rules.replay(pkg, receipt).valid || object(receipt.action, "receipt.action").id !== r.action_id) fail("action_rolls.receipt", "receipt digest, action or deterministic replay mismatch");
    const knowledge = object(object(receipt.context, "receipt.context").knowledge, "receipt.knowledge");
    if (knowledge.actorId !== r.actor_id) fail("receipt.knowledge", "knowledge actor differs from roll");
    for (const item of list(knowledge.passages, "receipt.knowledge.passages")) g.ref("passages", object(item, "receipt.knowledge.passage").passageId, "receipt.knowledge.passageId");
    if (r.confirmation !== null) {
      const c = object(r.confirmation, "roll.confirmation"); keys(c, ["rollId", "success", "mint", "confirmedAt", "seal"], "roll.confirmation");
      if (c.rollId !== r.id || typeof c.success !== "boolean" || String(c.confirmedAt) !== r.confirmed_at) fail("roll.confirmation", "confirmation identity or time mismatch");
      const { seal, ...body } = c; if (seal !== sealHash({ ...body, receiptHash: r.receipt_hash })) fail("roll.confirmation.seal", "confirmation seal mismatch");
      const success = r.vollmacht_id === null ? receipt.success ?? true : Number(receipt.total) >= Number(g.ref("action_vollmachten", r.vollmacht_id, "roll.authorization").threshold);
      if (c.success !== success || (!success && c.mint !== null)) fail("roll.confirmation", "confirmation outcome differs from pinned receipt/authorization");
      if (c.mint !== null) {
        const m = object(c.mint, "roll.confirmation.mint"), stored = g.ref("confirmed_mints", m.id, "roll.confirmation.mint");
        if (stored.roll_id !== r.id || hash(m) !== hash({ id: stored.id, kind: stored.kind, passageId: stored.passage_id, revisionId: stored.revision_id, provenance: stored.provenance, seal: stored.seal, confirmedAt: Number(stored.confirmed_at) })) fail("roll.confirmation.mint", "confirmation differs from immutable mint");
      }
    }
  }
  for (const r of t.confirmed_mints) {
    provenance(r.provenance, "mint.provenance", g); const p = object(r.provenance, "mint.provenance");
    if (p.kind !== r.kind || p.userId !== r.user_id || p.rollId !== r.roll_id || String(p.serverTime) !== r.confirmed_at || r.seal !== sealHash({ id: r.id, passageId: r.passage_id, revisionId: r.revision_id, provenance: r.provenance })) fail("mint", "mint identity, provenance or seal mismatch");
    const doc = object(g.ref("revisions", r.revision_id, "mint.revision").document, "mint.revision.document");
    if (hash(doc.mint) !== hash(r.provenance)) fail("mint", "mint differs from immutable revision provenance");
  }
  for (const r of t.passages) if (r.provenance !== null) { const p = object(r.provenance, "passage.provenance"); if (p.schemaVersion !== undefined) provenance(p, "passage.provenance", g); else importProvenance(p, r.id, importSources); }
  for (const r of t.artifacts) artifact(r, g);
  for (const r of t.letters) letter(r, g);
  for (const r of t.letter_delivery_receipts) delivery(r, g);
  if (rules.name === "rules-v1-v2@1") requireReciprocalMintEvidence(t);
}

function provenance(value: unknown, path: string, g: Graph): void {
  const p = object(value, path); keys(p, ["schemaVersion", "kind", "userId", "actorId", "serverTime", "requestHash", "playDate", "fictionDate", "rollId", "receiptHash", "vollmachtId", "replaces", "passageHash", "package", "augenblick"], path);
  if (p.schemaVersion !== 1 || !["wurf", "gesprochen", "ratifikation", "berichtigung", "vollmacht"].includes(String(p.kind))) fail(path, "unknown provenance schema/kind");
  g.ref("users", p.userId, path); if (p.actorId !== null) g.ref("actors", p.actorId, path); numeric(p.serverTime, path); digest(p.requestHash, path); digest(p.passageHash, path);
  string(p.playDate, path, 40); string(p.fictionDate, path, 120);
  if ((["wurf", "vollmacht"].includes(String(p.kind))) !== (p.rollId !== null) || (p.kind === "vollmacht") !== (p.vollmachtId !== null) || (p.kind === "berichtigung") !== (p.replaces !== null)) fail(path, "source kind and required evidence disagree");
  if (p.rollId !== null) { const r = g.ref("action_rolls", p.rollId, path); if (r.receipt_hash !== p.receiptHash || r.actor_id !== p.actorId || r.target_passage_hash !== p.passageHash || r.vollmacht_id !== p.vollmachtId) fail(path, "provenance roll evidence differs"); const pin = object(p.package, path); if (pin.id !== r.package_id || pin.version !== r.package_version) fail(path, "provenance package differs from roll"); }
  else if (p.receiptHash !== null || p.package !== null) fail(path, "roll-free provenance has roll evidence");
  if (p.vollmachtId !== null) g.ref("action_vollmachten", p.vollmachtId, path); if (p.replaces !== null) g.ref("passages", p.replaces, path);
  if (p.package !== null) { const pin = object(p.package, path); keys(pin, ["id", "version"], path); g.composite("rule_packages", ["campaign_id", "package_id", "version"], [g.tables.campaigns[0]!.id, pin.id, pin.version], path); }
  const a = object(p.augenblick, path); keys(a, ["capturedAt", "sceneId", "sessionId"], path); if (a.capturedAt !== p.serverTime) fail(path, "capture time differs from provenance");
  if (a.sceneId !== null) g.ref("scenes", a.sceneId, path); if (a.sessionId !== null && g.ref("game_sessions", a.sessionId, path).scene_id !== a.sceneId) fail(path, "Augenblick session and scene disagree");
}

function importProvenance(p: Row, passageId: unknown, importSources: ReadonlySet<string>): void {
  const path = "passage.importProvenance"; if (p.status !== "complete" && p.status !== "incomplete") fail(path, "unknown import provenance status");
  keys(p, p.status === "complete" ? ["status", "value"] : ["status", "value", "missing"], path);
  const v = object(p.value, path); keys(v, ["passageId", "importId", "quellWikiUrl", "quellArtikelUrl", "quellPageid", "quellRevid", "passageSha256", "pfad", "ordnung", "lizenz", "importiertAm", ...(p.status === "complete" ? ["autoren", "anonymeBeitraege", "quellSha1"] : [])], path);
  if (v.passageId !== passageId) fail(path, "source provenance belongs to another passage"); digest(v.passageSha256, path); numeric(v.quellPageid, path, 1); numeric(v.quellRevid, path, 1); textArray(v.pfad, path); numeric(v.ordnung, path);
  if (p.status === "incomplete" && hash(p.missing) !== hash(["complete-author-history", "revision-sha1"])) fail(path, "missing attribution evidence must remain explicit");
  if (p.status === "complete") { const authors = textArray(v.autoren, path); if (!authors.length && numeric(v.anonymeBeitraege, path) === 0) fail(path, "complete attribution needs author history"); string(v.quellSha1, path, 40); }
  if (!importSources.has(hash([v.quellWikiUrl, v.quellPageid, v.quellRevid]))) fail(path, "original import source artifact missing");
}
function artifact(r: CampaignRow, g: Graph): void {
  const s = object(r.source, "artifact.source");
  if (r.kind === "eron-preview") {
    keys(s, ["result", "versions"], "artifact.source"); const result = object(s.result, "artifact.result"), source = object(result.source, "artifact.originalSource");
    keys(result, ["importerVersion", "importId", "universeId", "campaignId", "entries", "revisions", "passages", "aliases", "links", "redLinks", "provenance", "media", "assets", "source", "report", "reviewRequired", "attributionComplete"], "artifact.result", ["kategorien"]);
    if (result.importerVersion !== "1" || result.universeId !== g.tables.universes[0]!.id || result.campaignId !== r.campaign_id || result.reviewRequired !== true || typeof result.attributionComplete !== "boolean") fail("artifact.result", "preview version, scope or review state mismatch");
    keys(source, ["format", "sha256", "wikiUrl", "articles", "templates"], "artifact.originalSource");
    if (source.format !== "eron-json" || source.sha256 !== hash({ articles: source.articles, templates: source.templates }) || r.source_hash !== hash({ source: source.sha256, preview: r.id })) fail("artifact.source_hash", "Eron source digest mismatch");
    if (hash(result.report) !== hash(r.report)) fail("artifact.report", "stored report differs from preview");
    // Die Assets gehören in die Selbstprüfung: eine Bildpassage verweist auf eine Asset-Id, und
    // mit einer leeren Liste wäre genau dieser Verweis unauflösbar.
    createWikiBundle({ universeId: result.universeId, campaignId: result.campaignId, entries: result.entries, revisions: result.revisions, passages: result.passages, aliases: result.aliases, links: result.links, revelations: [], lineage: [], assets: result.assets ?? [], provenance: result.provenance, sources: [source], importReports: [result.report] } as unknown as WikiBundleData);
    for (const [entryId, version] of Object.entries(object(s.versions, "artifact.versions"))) { g.ref("entries", entryId, "artifact.versions.entry"); numeric(version, "artifact.versions.version", 1); }
    // `kategorien` fehlt in Artefakten aus der Zeit vor Migration 020 — sein Fehlen ist kein
    // Fehler, eine kaputte Zeile darin schon: sie muss auf einen Eintrag desselben Pakets zeigen.
    for (const value of list(result.kategorien ?? [], "artifact.kategorien")) {
      const kategorie = object(value, "artifact.kategorien");
      keys(kategorie, ["entryId", "name", "slug"], "artifact.kategorien");
      g.ref("entries", kategorie.entryId, "artifact.kategorien.entryId");
      string(kategorie.name, "artifact.kategorien.name", 512); string(kategorie.slug, "artifact.kategorien.slug", 512);
    }
    for (const value of list(result.media, "artifact.media")) { const media = object(value, "artifact.media");
      keys(media, ["pageid", "fileName", "source", "licenseStatus", "state"], "artifact.media", ["assetId", "beschreibungsseiteUrl", "quellUrl", "urheber", "behaupteterMime"]);
      if (!["frei", "zitat", "unbekannt"].includes(String(media.licenseStatus)) || !["referenziert", "beschrieben"].includes(String(media.state))) fail("artifact.media", "unsupported media licensing/state");
      numeric(media.pageid, "artifact.media.pageid", 1); string(media.fileName, "artifact.media.fileName", 1000); string(media.source, "artifact.media.source", 100_000);
      for (const key of ["assetId", "beschreibungsseiteUrl", "quellUrl", "urheber", "behaupteterMime"]) if (media[key] !== undefined) string(media[key], `artifact.media.${key}`, 4096); }
    // Die Asset-Entwürfe: Herkunft und Lizenzurteil, Bytes ausdrücklich noch nicht.
    for (const value of list(result.assets ?? [], "artifact.assets")) { const asset = object(value, "artifact.assets");
      keys(asset, ["id", "universeId", "dateiname", "lizenzStatus", "lizenzGesetztVon", "verwendetVon", "verwaist", "imBestand"], "artifact.assets",
        ["mime", "sha256", "lizenzQuelle", "beschreibungsseiteUrl", "quellUrl", "urheber", "hochgeladenAm", "behaupteterMime", "breite", "hoehe", "bytes"]);
      if (!["frei", "zitat", "unbekannt"].includes(String(asset.lizenzStatus))) fail("artifact.assets", "unsupported asset licence state");
      if (asset.lizenzGesetztVon !== "import") fail("artifact.assets", "an import artifact records the importer's verdict, not a human's");
      if (typeof asset.verwaist !== "boolean" || typeof asset.imBestand !== "boolean") fail("artifact.assets", "asset usage flags required");
      string(asset.dateiname, "artifact.assets.dateiname", 512); textArray(asset.verwendetVon, "artifact.assets.verwendetVon"); }
  } else {
    keys(s, ["adapterVersion", "titel", "keim", "weltId", "knoten", "orte", "szene", "zellen", "quelle", "bericht"], "artifact.source");
    const source = object(s.quelle, "artifact.quelle"); keys(source, ["format", "sha256", "bytes", "json"], "artifact.quelle");
    const expectedFormat = r.kind === "eron-map" ? "fandom-interactivemap" : "azgaar-full-json";
    if (source.format !== expectedFormat || typeof source.json !== "string" || textHash(source.json as string) !== source.sha256 || source.sha256 !== r.source_hash || Buffer.byteLength(source.json as string, "utf8") !== source.bytes) fail("artifact.quelle", "Map original bytes/hash mismatch");
    if (r.kind === "eron-map") {
      // Re-derive the bounded adapter output: altered pins, colors or child identities cannot be
      // smuggled into an archive while retaining an unrelated, correctly hashed source document.
      let restored: unknown;
      try { restored = importiereEronKarte(source.json as string); } catch { fail("artifact.quelle", "Invalid Fandom map source"); }
      if (hash(restored) !== hash(s)) fail("artifact.source", "Fandom map differs from its preserved source");
    }
    if (s.adapterVersion !== "1") fail("artifact.adapterVersion", "unsupported Azgaar adapter version");
    if (hash(s.bericht) !== hash(r.report)) fail("artifact.report", "stored report differs from source artifact");
    const seed = object(s.keim, "artifact.keim"); keys(seed, ["generator", "version", "seed", "optionen", "keimHash"], "artifact.keim");
    const { keimHash, ...seedInput } = seed; if (keimHash !== hash(seedInput)) fail("artifact.keim", "seed provenance digest mismatch");
    atlasNodes(list(s.knoten, "artifact.knoten"), "artifact.knoten", g);
    const nodes = new Set(list(s.knoten, "artifact.knoten").map(v => String(object(v, "artifact.knoten").id)));
    if (!nodes.has(String(s.weltId))) fail("artifact.weltId", "world root absent");
    const scene = object(s.szene, "artifact.szene"); keys(scene, ["v", "size", "stamps", "regions", "places"], "artifact.szene", ["base"]); if (scene.v !== 3) fail("artifact.szene", "unsupported scene document version"); point(scene.size, "artifact.szene.size");
    for (const value of list(s.orte, "artifact.orte")) { const place = object(value, "artifact.ort"); keys(place, ["id", "name", "x", "y", "typ", "eltern", "herkunft", "merkmale"], "artifact.ort", ["kindKeim"]); if (!nodes.has(String(place.id))) fail("artifact.ort", "place node missing"); finite(place.x, "artifact.ort.x"); finite(place.y, "artifact.ort.y"); }
    for (const value of list(s.zellen, "artifact.zellen")) { const cell = object(value, "artifact.zelle"); keys(cell, ["id", "punkt", "land", "landmasseId", "machtId", "regionId", "polygon"], "artifact.zelle"); point(cell.punkt, "artifact.zelle.punkt"); if (typeof cell.land !== "boolean") fail("artifact.zelle", "land flag required"); for (const key of ["landmasseId", "machtId", "regionId"]) if (cell[key] !== null && !nodes.has(String(cell[key]))) fail("artifact.zelle", "cell references missing node"); for (const p of list(cell.polygon, "artifact.zelle.polygon")) point(p, "artifact.zelle.polygon"); }
    // Original generator JSON remains inert; it is never fetched or executed.
    try { JSON.parse(source.json as string); } catch { fail("artifact.quelle.json", "invalid original JSON"); }
  }
}

function finite(value: unknown, path: string): number { if (typeof value !== "number" || !Number.isFinite(value)) fail(path, "finite number required"); return value as number; }
function point(value: unknown, path: string): void { const p = list(value, path, 2); if (p.length !== 2) fail(path, "coordinate pair required"); finite(p[0], path); finite(p[1], path); }
function atlasNodes(values: readonly unknown[], path: string, g: Graph): void {
  const nodes = new Map<string, Row>();
  for (const value of values) { const node = object(value, path); keys(node, ["id", "art", "titel", "eltern", "rahmen", "anker", "herkunft", "sichtAnker"], path); const id = string(node.id, path); if (nodes.has(id)) fail(path, "duplicate atlas node"); nodes.set(id, node); }
  const spatial = new Map<string, string[]>();
  for (const [id, node] of nodes) {
    if (!["welt", "landmasse", "macht", "region", "ort", "bauwerk", "raum", "behaelter", "gegenstand"].includes(String(node.art)) || (node.titel !== null && typeof node.titel !== "string")) fail(path, "invalid node kind or title");
    const parents: string[] = [];
    for (const value of list(node.eltern, path)) { const e = object(value, path); keys(e, ["von", "nach", "art"], path); if (e.von !== id || !nodes.has(String(e.nach)) || !["liegt_in_geografie", "gehoert_zu_herrschaft", "beruehrt", "enthaelt_physisch"].includes(String(e.art))) fail(path, "invalid node edge"); if (["liegt_in_geografie", "enthaelt_physisch"].includes(String(e.art))) parents.push(String(e.nach)); }
    if (parents.length !== (node.art === "welt" ? 0 : 1)) fail(path, "invalid spatial parent count"); spatial.set(id, parents);
    const f = object(node.rahmen, path); keys(f, ["ursprung", "einheitenProPixel", "ordnung", "hoch"], path); point(f.ursprung, path); if (finite(f.einheitenProPixel, path) <= 0 || !["xy", "yx"].includes(String(f.ordnung)) || !["oben", "unten"].includes(String(f.hoch))) fail(path, "invalid coordinate frame");
    if (node.anker !== null) { const a = object(node.anker, path); keys(a, ["in", "bei", "massstab"], path); if (!nodes.has(String(a.in)) || finite(a.massstab, path) <= 0) fail(path, "invalid atlas anchor"); point(a.bei, path); }
    if (node.herkunft !== null) { const h = object(node.herkunft, path); keys(h, ["erzeuger", "version", "keimHash", "erzeugungspfad"], path, ["kindKeim"]); string(h.erzeuger, path, 512); string(h.version, path, 128); digest(h.keimHash, path); textArray(h.erzeugungspfad, path); }
    if (node.sichtAnker !== null) g.ref("entries", node.sichtAnker, path);
  }
  acyclic(spatial, path);
  for (const start of spatial.keys()) { let cursor: string | undefined = start, depth = 0; while ((cursor = spatial.get(cursor)?.[0]) !== undefined) if (++depth > 24) fail(path, "spatial depth exceeds 24"); }
}
function audit(r: CampaignRow, g: Graph): void {
  const d = object(r.data, "audit.data"), kind = String(r.kind), path = `audit.${kind}`;
  if (kind === "action.prepared") { keys(d, ["rollId", "actorId", "vollmachtId"], path); g.ref("action_rolls", d.rollId, path); g.ref("actors", d.actorId, path); if (d.vollmachtId !== null) g.ref("action_vollmachten", d.vollmachtId, path); }
  else if (kind.startsWith("praegung.")) { keys(d, ["mintId", "passageId", "seal"], path); const mint = g.ref("confirmed_mints", d.mintId, path); if (mint.passage_id !== d.passageId || mint.seal !== d.seal || `praegung.${String(mint.kind)}` !== kind) fail(path, "audit differs from mint"); }
  else if (kind === "action.confirmed" || kind === "vollmacht.confirmed") { keys(d, ["rollId", "success", "mintId"], path); g.ref("action_rolls", d.rollId, path); if (typeof d.success !== "boolean") fail(path, "success flag required"); if (d.mintId !== null) g.ref("confirmed_mints", d.mintId, path); }
  else if (kind === "vollmacht.issued") { keys(d, ["id", "actorId", "passageId", "expiresAt", "budgetKind"], path); const a = g.ref("action_vollmachten", d.id, path); if (a.actor_id !== d.actorId || a.passage_id !== d.passageId || a.expires_at !== String(d.expiresAt) || a.budget_kind !== d.budgetKind) fail(path, "audit differs from authorization"); }
  else if (kind === "vollmacht.revoked" || kind === "vollmacht.expired") { keys(d, ["id"], path); g.ref("action_vollmachten", d.id, path); }
  else { keys(d, ["from", "to", "requiresConfirmation", "entities"], path); if (d.requiresConfirmation !== true) fail(path, "explicit migration confirmation required"); for (const key of ["from", "to"]) { const pin = object(d[key], path); keys(pin, ["id", "version"], path); g.composite("rule_packages", ["campaign_id", "package_id", "version"], [r.campaign_id, pin.id, pin.version], path); } for (const value of list(d.entities, path)) { const entity = object(value, path); keys(entity, ["id", "before", "after", "archived", "changes"], path); g.ref("actors", entity.id, path); object(entity.before, path); object(entity.after, path); object(entity.archived, path); textArray(entity.changes, path); } }
}

function letter(r: CampaignRow, g: Graph): void {
  const snapshots = list(r.snapshots, "letter.snapshots", 32), seen = new Set<string>();
  if (!snapshots.length) fail("letter", "empty sealed letter");
  for (const value of snapshots) {
    const s = object(value, "letter.snapshot"); keys(s, ["passageId", "entryId", "slug", "title", "content", "path", "ord", "sourceRevisionId", "sourceGen", "sourceHash", "sourceQuelle", "tags", "knownTargets"], "letter.snapshot");
    const pid = string(s.passageId, "letter.passageId"); if (seen.has(pid)) fail("letter", "duplicate snapshot passage"); seen.add(pid); string(s.slug, "letter.slug", 512); string(s.title, "letter.title", 512);
    if (g.ref("passages", pid, "letter.passageId").entry_id !== s.entryId) fail("letter", "snapshot entry differs from passage");
    g.revision(s.sourceRevisionId, s.entryId, "letter.sourceRevisionId"); numeric(s.sourceGen, "letter.sourceGen", 1); numeric(s.ord, "letter.ord");
    block(s.content, "letter.content"); textArray(s.path, "letter.path"); textArray(s.tags, "letter.tags"); textArray(s.knownTargets, "letter.knownTargets"); source(s.sourceQuelle, "letter.sourceQuelle", g, false);
    // Frozen fields restore the non-mechanical marker only; the original projector
    // omitted that marker when calculating sourceHash. No current passage is consulted.
    const content = object(s.content, "letter.content"), projected = content.kind === "feld" ? Object.fromEntries(Object.entries(content).filter(([k]) => k !== "klauselKandidat")) : content;
    if (s.sourceHash !== sealHash({ passageId: s.passageId, content: projected, tags: s.tags })) fail("letter.sourceHash", "frozen projected source digest mismatch");
  }
  const recipients = g.group("letter_recipients", "letter_id", r.id!).map(x => String(x.actor_id)).sort();
  if (!recipients.length || recipients.length > 16 || recipients.includes(String(r.from_actor_id))) fail("letter", "invalid recipient set");
  if (r.seal !== sealHash({ schemaVersion: 1, id: r.id, fromActorId: r.from_actor_id, toActorIds: recipients, note: r.note, snapshots: r.snapshots, sentAt: Number(r.sent_at), sentDay: r.sent_day, sentLabel: r.sent_label, arrivalDay: r.arrival_day })) fail("letter.seal", "letter seal mismatch");
}
function delivery(r: CampaignRow, g: Graph): void {
  const p = object(r.proof, "delivery.proof"); keys(p, ["schemaVersion", "letterId", "letterSeal", "fromActorId", "toActorId", "sentAt", "sentDay", "scheduledDay", "deliveredAt", "deliveredDay", "deliveredLabel", "passages"], "delivery.proof");
  const letter = g.ref("letters", r.letter_id, "delivery.letter_id"), recipient = g.composite("letter_recipients", ["letter_id", "actor_id"], [r.letter_id, r.actor_id], "delivery.recipient");
  if (p.schemaVersion !== 1 || p.letterId !== r.letter_id || p.letterSeal !== letter.seal || p.fromActorId !== letter.from_actor_id || p.toActorId !== r.actor_id || String(p.deliveredAt) !== r.delivered_at || r.delivered_at !== recipient.delivered_at || p.deliveredDay !== recipient.delivered_day || p.deliveredLabel !== recipient.delivered_label || p.sentAt !== Number(letter.sent_at) || p.sentDay !== letter.sent_day || p.scheduledDay !== letter.arrival_day || sealHash(p) !== r.seal) fail("delivery.proof", "delivery identity, state or seal mismatch");
  const snapshots = list(letter.snapshots, "delivery.snapshots"), outcomes = list(p.passages, "delivery.passages");
  if (snapshots.length !== outcomes.length) fail("delivery", "missing passage outcome");
  for (const [i, value] of outcomes.entries()) { const o = object(value, "delivery.outcome"), s = object(snapshots[i], "delivery.snapshot"); keys(o, ["passageId", "sourceRevisionId", "sourceHash", "quelle", "grant"], "delivery.outcome");
    if (o.passageId !== s.passageId || o.sourceRevisionId !== s.sourceRevisionId || o.sourceHash !== s.sourceHash || !["current", "historical-only"].includes(String(o.grant)) || hash(o.quelle) !== hash({ art: "gehoert", von: letter.from_actor_id })) fail("delivery.outcome", "outcome differs from sealed snapshot"); }
}

/** Internal normalized data seam; it never creates a legacy envelope for new rule data. */
export function normalizeCampaignCore(data: CampaignBundleData, rules: CampaignRulesProfile): CampaignTables {
  assertJson(data); keys(object(data, "data"), ["campaignId", "universeId", "exportedAt", "tables"], "data"); const tables = normalizeTables(data.tables); string(data.campaignId, "campaignId"); string(data.universeId, "universeId");
  if (typeof data.exportedAt !== "string" || !/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d\.\d{3}Z$/.test(data.exportedAt) || !Number.isFinite(Date.parse(data.exportedAt)) || new Date(data.exportedAt).toISOString() !== data.exportedAt) fail("exportedAt", "canonical UTC ISO timestamp required");
  checkGraph(tables, data.campaignId, data.universeId, rules);
  return tables;
}
export function createCampaignBundle(data: CampaignBundleData): CampaignBundle {
  const tables = normalizeCampaignCore(data, LEGACY_CAMPAIGN_RULES);
  const bundle: CampaignBundle = { format: "atlas-chronicles/campaign", version: 1, manifest: { profile: "complete-campaign", projection: "gm", campaignId: data.campaignId, universeId: data.universeId, exportedAt: data.exportedAt, blockAstVersion: 1, rulePackageSchemaVersion: 1, contentHash: hash(tables), modules: moduleManifest(tables), excluded: CAMPAIGN_EXCLUSIONS, assetMode: "source-artifacts-only" }, tables };
  if (Buffer.byteLength(canonicalJson(bundle as unknown as CanonicalValue), "utf8") > CAMPAIGN_BUNDLE_LIMITS.bytes) fail("$", "maximum campaign bundle size exceeded");
  return bundle;
}
export function validateCampaignBundle(value: unknown): CampaignBundle {
  assertJson(value); const r = object(value, "$"), m = object(r.manifest, "manifest"); keys(r, ["format", "version", "manifest", "tables"], "$");
  keys(m, ["profile", "projection", "campaignId", "universeId", "exportedAt", "blockAstVersion", "rulePackageSchemaVersion", "contentHash", "modules", "excluded", "assetMode"], "manifest");
  if (r.format !== "atlas-chronicles/campaign" || r.version !== 1 || m.profile !== "complete-campaign" || m.projection !== "gm" || m.blockAstVersion !== 1 || m.rulePackageSchemaVersion !== 1 || m.assetMode !== "source-artifacts-only" || hash(m.excluded) !== hash(CAMPAIGN_EXCLUSIONS)) fail("manifest", "unsupported campaign profile/version; explicit migration required");
  const bundle = createCampaignBundle({ campaignId: string(m.campaignId, "manifest.campaignId"), universeId: string(m.universeId, "manifest.universeId"), exportedAt: string(m.exportedAt, "manifest.exportedAt", 40), tables: r.tables as unknown as CampaignTables });
  if (m.contentHash !== bundle.manifest.contentHash || hash(m.modules) !== hash(bundle.manifest.modules)) fail("manifest", "payload/module checksum or count mismatch");
  return bundle;
}
export function parseCampaignBundle(text: string): CampaignBundle {
  if (typeof text !== "string" || Buffer.byteLength(text, "utf8") > CAMPAIGN_BUNDLE_LIMITS.bytes) fail("$", "maximum campaign bundle size exceeded");
  let value: unknown; try { value = JSON.parse(text); } catch { fail("$", "invalid campaign JSON"); }
  rejectDuplicateKeys(text);
  return validateCampaignBundle(value);
}
/** JSON.parse keeps the last duplicate key. That ambiguity is forbidden in this format. */
function rejectDuplicateKeys(text: string): void {
  const stack: { object: boolean; key: boolean; seen: Set<string> }[] = [];
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (c === '"') {
      const start = i; for (++i; i < text.length; i++) { if (text[i] === "\\") i++; else if (text[i] === '"') break; }
      const top = stack[stack.length - 1];
      if (top?.object && top.key) { const key = JSON.parse(text.slice(start, i + 1)) as string; if (top.seen.has(key)) fail("$", `duplicate JSON key: ${key}`); top.seen.add(key); top.key = false; }
    } else if (c === "{" || c === "[") stack.push({ object: c === "{", key: c === "{", seen: new Set() });
    else if (c === "}" || c === "]") stack.pop();
    else if (c === ",") { const top = stack[stack.length - 1]; if (top?.object) top.key = true; }
  }
}
export function serializeCampaignBundle(bundle: CampaignBundle): string { return canonicalJson(validateCampaignBundle(bundle) as unknown as CanonicalValue); }
/** Table names whose durable semantic values differ; timestamps in the envelope are excluded. */
export function campaignSemanticDiff(a: CampaignBundle, b: CampaignBundle): readonly CampaignTableName[] {
  const left = validateCampaignBundle(a), right = validateCampaignBundle(b);
  return CAMPAIGN_TABLES.filter(t => hash(left.tables[t.name]) !== hash(right.tables[t.name])).map(t => t.name);
}
