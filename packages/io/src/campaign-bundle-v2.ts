// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2026 Kaya Yesilyurt - Atlas Chronicles. Siehe LICENSE.
// Copyright (c) 2026 Atlas Chronicles contributors. SPDX-License-Identifier: MIT
import { canonicalJson, textHash, type CanonicalValue } from "@chronicle/core";
import { stableJson, type AnyRulePackage } from "@chronicle/rules";
import { LEGACY_CAMPAIGN_RULES, type CampaignRulesProfile } from "./campaign-rules-profile.ts";
import { createCampaignBundle, validateCampaignBundle, type CampaignBundle } from "./campaign-bundle.ts";
import { CAMPAIGN_TABLES, CAMPAIGN_EXCLUSIONS, CAMPAIGN_BUNDLE_LIMITS, type CampaignRow, type CampaignTables } from "./campaign-schema.ts";
import { CAMPAIGN_V2_TABLES, CAMPAIGN_V2_ADDITIONAL_TABLES, CAMPAIGN_V2_MODULES, CAMPAIGN_ACTOR_KINDS, type CampaignTablesV2, type CampaignTableNameV2, type CampaignModuleV2 } from "./campaign-schema-v2.ts";
import { assertJson, fail, hash, object, list, string, keys, numeric, validateColumn, rejectDuplicateKeys } from "./campaign-v2-json.ts";

export const CAMPAIGN_BUNDLE_V2_VERSION = 2 as const;
export interface CampaignBundleDataV2 { readonly campaignId: string; readonly universeId: string; readonly exportedAt: string; readonly tables: CampaignTablesV2 }
export interface CampaignBundleV2 {
  readonly format: "atlas-chronicles/campaign"; readonly version: 2;
  readonly manifest: Omit<CampaignBundle["manifest"], "modules"> & {
    readonly coreContentHash: string;
    readonly modules: readonly { readonly name: CampaignModuleV2; readonly version: 1; readonly count: number; readonly sha256: string }[];
  };
  readonly tables: CampaignTablesV2;
}
const seal = (value: unknown) => textHash(stableJson(value));
const pk = (row: CampaignRow, columns: readonly string[]) => canonicalJson(columns.map(key => row[key]!) as CanonicalValue);
const compare = (a: string, b: string) => a < b ? -1 : a > b ? 1 : 0;
function normalizeAdditional(value: unknown): Pick<CampaignTablesV2, typeof CAMPAIGN_V2_ADDITIONAL_TABLES[number]["name"]> {
  const input = object(value, "tables"), output: Record<string, CampaignRow[]> = {};
  for (const table of CAMPAIGN_V2_ADDITIONAL_TABLES) {
    const seen = new Set<string>();
    output[table.name] = list(input[table.name], `tables.${table.name}`).map((value, index) => {
      const path = `tables.${table.name}[${index}]`, row = object(value, path); keys(row, table.columns, path);
      for (const [key, field] of Object.entries(table.fields)) validateColumn(row[key], field, `${path}.${key}`);
      const key = pk(row, table.primaryKey); if (seen.has(key)) fail(path, "duplicate primary key"); seen.add(key);
      return JSON.parse(JSON.stringify(row)) as CampaignRow;
    }).sort((a, b) => {
      for (const column of table.primaryKey) {
        const left = a[column], right = b[column];
        const order = typeof left === "number" && typeof right === "number" ? left - right : compare(String(left), String(right));
        if (order) return order;
      }
      return 0;
    });
  }
  return output as unknown as ReturnType<typeof normalizeAdditional>;
}
class Graph {
  private readonly indexes = new Map<string, Map<string, CampaignRow>>();
  constructor(readonly tables: CampaignTablesV2, readonly campaignId: string, readonly rules: CampaignRulesProfile) {}
  ref(table: CampaignTableNameV2, values: readonly unknown[], columns: readonly string[] = ["id"]): CampaignRow {
    const key = `${table}:${columns.join(",")}`; let index = this.indexes.get(key);
    if (!index) { index = new Map(this.tables[table].map(row => [pk(row, columns), row])); this.indexes.set(key, index); }
    const row = index.get(canonicalJson(values as CanonicalValue)); if (!row) fail(table, "missing same-campaign reference"); return row!;
  }
  nullable(table: CampaignTableNameV2, value: CanonicalValue | undefined, columns: readonly string[] = ["id"]): void { if (value !== null) this.ref(table, [value], columns); }
  package(value: unknown): AnyRulePackage {
    const pin = object(value, "definition.package"); keys(pin, ["id", "version"], "definition.package"); string(pin.id, "definition.package.id"); string(pin.version, "definition.package.version");
    return this.rules.parse(this.ref("rule_packages", [this.campaignId, pin.id, pin.version], ["campaign_id", "package_id", "version"]).document);
  }
}
const pair = (row: CampaignRow, left: string, right: string, path: string) => { if ((row[left] === null) !== (row[right] === null)) fail(path, `${left}/${right} must both be present or both absent`); };
function boundedText(value: unknown, path: string, maximum: number, nonempty = true): void {
  if (typeof value !== "string" || value.length > maximum || (nonempty && !/\S/.test(value))) fail(path, "bounded text required");
}
function itemState(value: unknown): void {
  const row = object(value, "item.state"); keys(row, ["quantity", "notes", "equipped"], "item.state");
  if (numeric(row.quantity, "item.quantity", 1) > 1_000_000) fail("item.quantity", "quantity limit exceeded");
  boundedText(row.notes, "item.notes", 4000, false); if (typeof row.equipped !== "boolean") fail("item.equipped", "boolean required");
}
/** Die geschlossene Menge der Seltenheiten — sie traegt den Rahmen der Karte. */
const LOOT_RARITIES = ["gewoehnlich", "ungewoehnlich", "selten", "episch", "legendaer"];
/** Das Gesicht einer Lootkarte. Rein beschreibend: keine Regelwirkung, kein Modifikator. */
function kartengesicht(row: Record<string, unknown>): void {
  if (!LOOT_RARITIES.includes(String(row.seltenheit))) fail("definition.seltenheit", "unknown rarity");
  boundedText(row.kategorie, "definition.kategorie", 80, false);
  boundedText(row.spruch, "definition.spruch", 600, false);
  // Der Bildverweis bleibt ununterworfen wie jede Bildreferenz im Haus: fehlen die Bytes, zeigt
  // die Karte den Platzhalter statt eines Lochs. Er wird begrenzt, nicht aufgeloest.
  if (row.bildAssetId !== null) boundedText(row.bildAssetId, "definition.bildAssetId", 128);
  for (const eintrag of list(row.zeilen, "definition.zeilen", 8)) {
    const zeile = object(eintrag, "definition.zeilen"); keys(zeile, ["label", "wert"], "definition.zeilen");
    boundedText(zeile.label, "definition.zeilen.label", 40); boundedText(zeile.wert, "definition.zeilen.wert", 120);
  }
}
/**
 * Die Beutetabelle einer Figurvorlage. Jede Zeile nennt eine Gegenstandsvorlage **mit ihrer
 * Revision** — eine Tabelle, die auf „die jeweils neueste Fassung" zeigte, änderte sich, ohne
 * dass jemand sie anfasst.
 */
function beutetabelle(value: unknown, g: Graph): void {
  const zeilen = list(value, "definition.beute", 32);
  for (const eintrag of zeilen) {
    const zeile = object(eintrag, "definition.beute");
    keys(zeile, ["templateId", "templateRevision", "wahrscheinlichkeit", "menge"], "definition.beute");
    g.ref("item_template_revisions", [zeile.templateId, zeile.templateRevision], ["template_id", "revision"]);
    const prozent = numeric(zeile.wahrscheinlichkeit, "definition.beute.wahrscheinlichkeit", 1);
    if (prozent > 100) fail("definition.beute.wahrscheinlichkeit", "a probability is at most 100 percent");
    const menge = list(zeile.menge, "definition.beute.menge", 2);
    if (menge.length !== 2) fail("definition.beute.menge", "a quantity range has a lower and an upper bound");
    const von = numeric(menge[0], "definition.beute.menge[0]", 1), bis = numeric(menge[1], "definition.beute.menge[1]", 1);
    if (von > bis) fail("definition.beute.menge", "the lower bound of a quantity range cannot exceed its upper bound");
  }
}
function definition(value: unknown, actor: boolean, g: Graph): void {
  const row = object(value, "definition");
  // Fassung 2 ist die Kartenfassung eines Gegenstands — und nur dort, wo das Profil sie kennt.
  const karte = !actor && row.schemaVersion === 2 && g.rules.itemCardFaces;
  // Fassung 2 einer FIGURvorlage ist ihre Beutetabelle. Zwei Aussagen, zwei Faehigkeiten.
  const beute = actor && row.schemaVersion === 2 && g.rules.npcLoot;
  keys(row, actor ? (beute ? ["schemaVersion", "name", "kind", "loreEntryId", "package", "fields", "beute"] : ["schemaVersion", "name", "kind", "loreEntryId", "package", "fields"])
    : karte ? ["schemaVersion", "name", "loreEntryId", "tags", "seltenheit", "kategorie", "bildAssetId", "spruch", "zeilen"]
    : ["schemaVersion", "name", "loreEntryId", "tags"], "definition");
  if (row.schemaVersion !== 1 && !karte && !beute) fail("definition", "unknown definition version; explicit migration required");
  boundedText(row.name, "definition.name", 160); g.nullable("entries", row.loreEntryId);
  if (actor) {
    if (!CAMPAIGN_ACTOR_KINDS.filter(kind => kind !== "unspecified").includes(row.kind as never)) fail("definition.kind", "unknown actor kind");
    const fields = object(row.fields, "definition.fields"); if (Object.keys(fields).length > 64) fail("definition.fields", "field limit exceeded");
    for (const [key, value] of Object.entries(fields)) {
      if (!/^[a-z][a-z0-9_-]{0,95}$/.test(key)) fail("definition.fields", "invalid field key");
      if (typeof value === "string") boundedText(value, "definition.fields", 4096, false);
      else if (typeof value === "number") { if (!Number.isFinite(value) || Math.abs(value) > 1e12) fail("definition.fields", "invalid scalar"); }
      else if (typeof value !== "boolean") fail("definition.fields", "scalar required");
    }
    try { g.rules.fields(g.package(row.package), fields); } catch { fail("definition.fields", "fields do not match pinned rule package"); }
    if (beute) beutetabelle(row.beute, g);
  } else {
    const tags = list(row.tags, "definition.tags", 32); for (const tag of tags) boundedText(tag, "definition.tags", 80);
    if (new Set(tags).size !== tags.length) fail("definition.tags", "duplicate tags");
    if (karte) kartengesicht(row);
  }
}
function timestamp(value: unknown, path: string): void { if (value !== null) numeric(value, path); }
function card(value: unknown, operation: string, g: Graph, subject: CanonicalValue): void {
  const row = object(value, "event.card"), path = `event.${operation}`;
  if (operation.includes(".template.")) {
    keys(row, ["id", "revision", "version", "archivedAt", "definition", "contentHash"], path);
    const actor = operation.startsWith("actor.");
    const stored = g.ref(actor ? "actor_template_revisions" : "item_template_revisions", [row.id, row.revision], ["template_id", "revision"]);
    if (row.id !== subject || row.contentHash !== seal(row.definition) || row.contentHash !== stored.content_hash || hash(row.definition) !== hash(stored.definition)) fail(path, "historical template snapshot differs from pinned revision");
    definition(row.definition, actor, g); numeric(row.revision, path, 1); timestamp(row.archivedAt, path);
  } else if (operation.startsWith("actor.controller.")) {
    keys(row, ["userId", "permission", "version", "grantedBy", "grantedAt", "revokedAt"], path);
    g.ref("actor_profiles", [subject], ["actor_id"]); g.ref("users", [row.userId]); g.nullable("users", row.grantedBy);
    if (row.permission !== "control") fail(path, "unknown controller permission");
    pair(row, "grantedBy", "grantedAt", path); timestamp(row.grantedAt, path); timestamp(row.revokedAt, path);
  } else if (operation === "reader.perspective") {
    keys(row, ["actorId", "version"], path); g.ref("users", [subject]); g.nullable("actor_profiles", row.actorId, ["actor_id"]);
  } else if (operation.startsWith("actor.")) {
    keys(row, ["id", "campaignId", "name", "kind", "version", "archivedAt", "loreEntryId", "template", "canControl", "canReadAs"], path);
    if (row.id !== subject || row.campaignId !== g.campaignId || !CAMPAIGN_ACTOR_KINDS.includes(row.kind as never) || typeof row.canControl !== "boolean" || typeof row.canReadAs !== "boolean") fail(path, "invalid historical actor card");
    g.ref("actor_profiles", [row.id], ["actor_id"]); boundedText(row.name, path, 512); g.nullable("entries", row.loreEntryId); timestamp(row.archivedAt, path);
    if (row.template !== null) { const pin = object(row.template, path); keys(pin, ["id", "revision"], path); g.ref("actor_template_revisions", [pin.id, pin.revision], ["template_id", "revision"]); }
  } else {
    keys(row, ["id", "version", "holderActorId", "archivedAt", "template", "definition", "state"], path);
    if (row.id !== subject) fail(path, "historical item subject differs"); g.ref("item_instances", [row.id]); g.nullable("actor_profiles", row.holderActorId, ["actor_id"]); timestamp(row.archivedAt, path);
    const pin = object(row.template, path); keys(pin, ["id", "revision"], path);
    const revision = g.ref("item_template_revisions", [pin.id, pin.revision], ["template_id", "revision"]);
    if (hash(row.definition) !== hash(revision.definition)) fail(path, "historical item definition differs from pinned revision"); definition(row.definition, false, g); itemState(row.state);
  }
  // A first reader selection can have a historical zero-version absence snapshot.
  numeric(row.version, path, operation === "reader.perspective" ? 0 : 1);
}
function eventRequest(row: CampaignRow, g: Graph): void {
  const request = object(row.request, "event.request"), operation = String(row.operation), path = `event.request.${operation}`;
  keys(request, ["campaignId", "operation", "subjectId", "input"], path);
  const input = object(request.input, path), creates = operation.endsWith(".create") || operation.endsWith(".instantiate");
  if (request.campaignId !== g.campaignId || request.operation !== operation || request.subjectId !== (creates ? null : row.subject_id) || seal(request) !== row.request_hash) fail(path, "request envelope identity or hash mismatch");
  const required = ["commandId"], optional: string[] = [];
  if (!creates) required.push("expectedVersion");
  if (!creates && operation !== "reader.perspective") required.push("reason");
  if (operation.endsWith(".template.create") || operation.endsWith(".template.revise")) required.push("definition");
  if (operation.endsWith(".instantiate")) required.push("templateId", "templateRevision");
  if (operation === "actor.instantiate") optional.push("name");
  if (operation === "actor.update") required.push("name", "kind", "loreEntryId");
  if (operation.startsWith("actor.controller.")) required.push("targetUserId");
  if (operation === "reader.perspective") required.push("actorId");
  if (operation === "item.instantiate" || operation === "item.transfer") required.push("holderActorId");
  if (operation === "item.instantiate") optional.push("state");
  if (operation === "item.update") required.push("state");
  keys(input, required, path, optional); string(input.commandId, path);
  if (input.commandId !== row.command_id || (input.reason ?? null) !== row.reason) fail(path, "command identity or reason differs");
  if (input.reason !== undefined) boundedText(input.reason, path, 500);
  if (input.expectedVersion !== undefined && numeric(input.expectedVersion, path, operation === "reader.perspective" || operation === "actor.controller.grant" ? 0 : 1) > 2_147_483_647) fail(path, "version limit exceeded");
  if (input.definition !== undefined) definition(input.definition, operation.startsWith("actor."), g);
  if (input.templateId !== undefined) {
    string(input.templateId, path); if (numeric(input.templateRevision, path, 1) > 2_147_483_647) fail(path, "revision limit exceeded");
    g.ref(operation.startsWith("actor.") ? "actor_template_revisions" : "item_template_revisions", [input.templateId, input.templateRevision], ["template_id", "revision"]);
  }
  if (input.name !== undefined) boundedText(input.name, path, 160);
  if (input.kind !== undefined && !CAMPAIGN_ACTOR_KINDS.filter(kind => kind !== "unspecified").includes(input.kind as never)) fail(path, "unknown actor kind");
  if (input.loreEntryId !== undefined) g.nullable("entries", input.loreEntryId);
  if (input.targetUserId !== undefined) g.ref("users", [input.targetUserId]);
  if (input.actorId !== undefined) g.nullable("actor_profiles", input.actorId, ["actor_id"]);
  if (input.holderActorId !== undefined) g.nullable("actor_profiles", input.holderActorId, ["actor_id"]);
  if (input.state !== undefined) itemState(input.state);
  const after = object(row.after_state, path), before = row.before_state === null ? null : object(row.before_state, path);
  if (creates ? before !== null || after.version !== 1 : after.version !== Number(input.expectedVersion) + 1 || (before?.version ?? 0) !== input.expectedVersion) fail(path, "historical versions do not match command");
  if (input.definition !== undefined) {
    let expected = input.definition;
    if (operation.startsWith("actor.")) { const original = object(expected, path); expected = { ...original, fields: g.rules.fields(g.package(original.package), original.fields) } as CanonicalValue; }
    if (hash(expected) !== hash(after.definition)) fail(path, "result differs from normalized template request");
  }
  if (operation.endsWith(".instantiate") && hash(after.template) !== hash({ id: input.templateId, revision: input.templateRevision })) fail(path, "instance pin differs from request");
  if (operation === "actor.update" && (after.name !== input.name || after.kind !== input.kind || after.loreEntryId !== input.loreEntryId)) fail(path, "actor update differs from request");
  if (operation === "actor.instantiate") {
    const template = g.ref("actor_template_revisions", [input.templateId, input.templateRevision], ["template_id", "revision"]), definition = object(template.definition, path);
    if (after.name !== (input.name ?? definition.name) || after.kind !== definition.kind || after.loreEntryId !== definition.loreEntryId) fail(path, "actor instance differs from template");
  }
  if (operation.startsWith("actor.controller.") && after.userId !== input.targetUserId) fail(path, "grant target differs from request");
  if (operation === "actor.controller.grant" && (after.grantedBy !== row.actor_user_id || after.grantedAt === null || after.revokedAt !== null)) fail(path, "grant result differs from issuing identity");
  if (operation === "actor.controller.revoke" && (!before || after.revokedAt === null || after.grantedBy !== before.grantedBy || after.grantedAt !== before.grantedAt)) fail(path, "revocation rewrites original grant provenance");
  if (operation === "reader.perspective" && (row.actor_user_id !== row.subject_id || after.actorId !== input.actorId)) fail(path, "reader perspective differs from request");
  if ((operation === "item.instantiate" || operation === "item.transfer") && after.holderActorId !== input.holderActorId) fail(path, "item custody differs from request");
  if ((operation === "item.instantiate" || operation === "item.update") && hash(after.state) !== hash(input.state ?? { quantity: 1, notes: "", equipped: false })) fail(path, "item state differs from request");
  if (creates && after.archivedAt !== null) fail(path, "new object is already archived");
  if (operation.endsWith(".archive") && (!before || before.archivedAt !== null || after.archivedAt === null)) fail(path, "archive transition required");
  if (operation.endsWith(".template.create") && after.revision !== 1) fail(path, "first template revision must be one");
  if (operation.endsWith(".template.revise") && after.revision !== Number(before?.revision) + 1) fail(path, "template revision must advance once");
  if (before && ["actor.update", "actor.archive", "item.update", "item.transfer", "item.archive", "actor.template.archive", "item.template.archive"].includes(operation)) {
    const mutable = new Set(["version", ...(operation === "actor.update" ? ["name", "kind", "loreEntryId"]
      : operation === "actor.archive" ? ["archivedAt", "canControl", "canReadAs"]
      : [operation === "item.update" ? "state" : operation === "item.transfer" ? "holderActorId" : "archivedAt"])]);
    const fixed = (value: CampaignRow) => Object.fromEntries(Object.entries(value).filter(([key]) => !mutable.has(key)));
    if (hash(fixed(before)) !== hash(fixed(after))) fail(path, "command changes fields outside its declared operation");
  }
}
/** Internal semantic seam shared by the explicit native-v5 profile. */
export function checkActorInventoryTables(t: CampaignTablesV2, campaignId: string, rules: CampaignRulesProfile): void {
  const g = new Graph(t, campaignId, rules);
  for (const table of CAMPAIGN_V2_ADDITIONAL_TABLES) for (const row of t[table.name]) {
    if (row.campaign_id !== campaignId) fail(table.name, "cross-campaign row");
    for (const key of ["created_by", "granted_by", "user_id", "actor_user_id"]) if (row[key] !== undefined && row[key] !== null) g.ref("users", [row[key]]);
  }
  for (const [headers, revisions, actor] of [["actor_templates", "actor_template_revisions", true], ["item_templates", "item_template_revisions", false]] as const) {
    const histories = new Map<CanonicalValue, CampaignRow[]>();
    for (const row of t[revisions]) { const history = histories.get(row.template_id!) ?? []; history.push(row); histories.set(row.template_id!, history); }
    for (const row of t[headers]) {
      g.ref(revisions, [row.id, row.head_revision], ["template_id", "revision"]);
      const history = histories.get(row.id!) ?? [];
      if (history.length !== row.head_revision || history.some(revision => Number(revision.revision) > Number(row.head_revision)) || Number(row.version) < Number(row.head_revision)) fail(headers, "template head does not match complete revision history");
    }
    for (const row of t[revisions]) {
      g.ref(headers, [row.template_id]); definition(row.definition, actor, g);
      if (row.content_hash !== seal(row.definition)) fail(revisions, "template definition hash mismatch");
    }
  }
  for (const row of t.actors) g.ref("actor_profiles", [row.id], ["actor_id"]);
  for (const row of t.actor_profiles) {
    g.ref("actors", [row.actor_id]); pair(row, "template_id", "template_revision", "actor_profiles"); pair(row, "created_by", "created_at", "actor_profiles");
    if (row.template_id !== null) g.ref("actor_template_revisions", [row.template_id, row.template_revision], ["template_id", "revision"]);
    g.nullable("entries", row.lore_entry_id);
  }
  for (const row of t.actor_controllers) { g.ref("actor_profiles", [row.actor_id], ["actor_id"]); pair(row, "granted_by", "granted_at", "actor_controllers"); }
  for (const row of t.reader_perspectives) {
    g.ref("campaign_memberships", [campaignId, row.user_id], ["campaign_id", "user_id"]); g.nullable("actor_profiles", row.actor_id, ["actor_id"]);
    // This is a saved choice, not proof of today's grant: revoked/archive states
    // remain legitimate durable data and live authorization must recheck them.
  }
  for (const row of t.item_instances) { g.ref("item_template_revisions", [row.template_id, row.template_revision], ["template_id", "revision"]); g.nullable("actor_profiles", row.holder_actor_id, ["actor_id"]); itemState(row.state); }
  const commands = new Set<string>();
  for (const row of t.actor_inventory_events) {
    const command = pk(row, ["actor_user_id", "command_id"]); if (commands.has(command)) fail("actor_inventory_events", "duplicate durable command identity"); commands.add(command);
    const operation = String(row.operation);
    for (const key of ["before_state", "after_state", "result"] as const) if (row[key] !== null) card(row[key], operation, g, row.subject_id!);
    if (row.after_state === null || hash(row.after_state) !== hash(row.result)) fail("actor_inventory_events", "result differs from historical after state");
    eventRequest(row, g);
  }
}
export function createCampaignBundleV2(data: CampaignBundleDataV2): CampaignBundleV2 {
  assertJson(data); keys(object(data, "data"), ["campaignId", "universeId", "exportedAt", "tables"], "data");
  keys(object(data.tables, "tables"), CAMPAIGN_V2_TABLES.map(table => table.name), "tables");
  const core = validateCampaignBundle(createCampaignBundle({ campaignId: data.campaignId, universeId: data.universeId, exportedAt: data.exportedAt,
    tables: Object.fromEntries(CAMPAIGN_TABLES.map(table => [table.name, data.tables[table.name]])) as unknown as CampaignTables }));
  const tables: CampaignTablesV2 = { ...core.tables, ...normalizeAdditional(data.tables) };
  if (CAMPAIGN_V2_TABLES.reduce((count, table) => count + tables[table.name].length, 0) > CAMPAIGN_BUNDLE_LIMITS.rows) fail("tables", "total row limit exceeded");
  checkActorInventoryTables(tables, data.campaignId, LEGACY_CAMPAIGN_RULES);
  const modules = CAMPAIGN_V2_MODULES.map(name => {
    const specs = CAMPAIGN_V2_TABLES.filter(table => table.module === name);
    return { name, version: 1 as const, count: specs.reduce((count, table) => count + tables[table.name].length, 0), sha256: hash(Object.fromEntries(specs.map(table => [table.name, tables[table.name]]))) };
  });
  const bundle: CampaignBundleV2 = { format: "atlas-chronicles/campaign", version: 2, manifest: { ...core.manifest, coreContentHash: core.manifest.contentHash, contentHash: hash(tables), modules }, tables };
  if (Buffer.byteLength(canonicalJson(bundle as unknown as CanonicalValue), "utf8") > CAMPAIGN_BUNDLE_LIMITS.bytes) fail("$", "maximum campaign bundle size exceeded");
  return bundle;
}
export function validateCampaignBundleV2(value: unknown): CampaignBundleV2 {
  assertJson(value); const row = object(value, "$"), manifest = object(row.manifest, "manifest"); keys(row, ["format", "version", "manifest", "tables"], "$");
  keys(manifest, ["profile", "projection", "campaignId", "universeId", "exportedAt", "blockAstVersion", "rulePackageSchemaVersion", "contentHash", "coreContentHash", "modules", "excluded", "assetMode"], "manifest");
  if (row.format !== "atlas-chronicles/campaign" || row.version !== 2 || manifest.profile !== "complete-campaign" || manifest.projection !== "gm" || manifest.blockAstVersion !== 1 || manifest.rulePackageSchemaVersion !== 1 || manifest.assetMode !== "source-artifacts-only" || hash(manifest.excluded) !== hash(CAMPAIGN_EXCLUSIONS)) fail("manifest", "unsupported campaign profile/version; explicit migration required");
  const bundle = createCampaignBundleV2({ campaignId: string(manifest.campaignId, "manifest.campaignId"), universeId: string(manifest.universeId, "manifest.universeId"), exportedAt: string(manifest.exportedAt, "manifest.exportedAt", 40), tables: row.tables as unknown as CampaignTablesV2 });
  if (hash(manifest) !== hash(bundle.manifest)) fail("manifest", "payload/core/module checksum or count mismatch");
  return bundle;
}
export function parseCampaignBundleV2(text: string): CampaignBundleV2 {
  if (typeof text !== "string" || Buffer.byteLength(text, "utf8") > CAMPAIGN_BUNDLE_LIMITS.bytes) fail("$", "maximum campaign bundle size exceeded");
  let value: unknown; try { value = JSON.parse(text); } catch { fail("$", "invalid campaign JSON"); }
  rejectDuplicateKeys(text); return validateCampaignBundleV2(value);
}
export function serializeCampaignBundleV2(bundle: CampaignBundleV2): string { return canonicalJson(validateCampaignBundleV2(bundle) as unknown as CanonicalValue); }
export function campaignSemanticDiffV2(a: CampaignBundleV2, b: CampaignBundleV2): readonly CampaignTableNameV2[] {
  const left = validateCampaignBundleV2(a), right = validateCampaignBundleV2(b);
  return CAMPAIGN_V2_TABLES.filter(table => hash(left.tables[table.name]) !== hash(right.tables[table.name])).map(table => table.name);
}
export interface CampaignUpgradeReport {
  readonly algorithm: "atlas-chronicles/v1-to-v2/actor-defaults@1"; readonly sourceVersion: 1; readonly targetVersion: 2;
  readonly sourceContentHash: string; readonly targetContentHash: string; readonly sourceBundleHash: string;
  readonly addedRows: readonly { readonly table: string; readonly count: number }[]; readonly reportHash: string;
}
/** Explicit, deterministic upgrade only. It does not invent historical authors/times or credentials. */
export function upgradeCampaignBundleV1(input: unknown): { bundle: CampaignBundleV2; report: CampaignUpgradeReport } {
  const source = validateCampaignBundle(input), campaignId = source.manifest.campaignId;
  const tables = { ...source.tables, ...Object.fromEntries(CAMPAIGN_V2_ADDITIONAL_TABLES.map(table => [table.name, []])) } as CampaignTablesV2;
  const primaryActors = new Set(source.tables.campaign_memberships.map(member => member.actor_id));
  const playerBindings = new Set(source.tables.campaign_memberships.filter(member => member.role === "spieler").map(member => pk(member, ["actor_id", "user_id"])));
  const defaults = {
    actor_profiles: source.tables.actors.map(actor => ({ actor_id: actor.id!, campaign_id: campaignId, kind: primaryActors.has(actor.id) ? "player_character" : "unspecified", template_id: null, template_revision: null, lore_entry_id: null, version: 1, archived_at: null, created_by: null, created_at: null })),
    actor_controllers: source.tables.actors.filter(actor => playerBindings.has(pk(actor, ["id", "user_id"]))).map(actor => ({ actor_id: actor.id!, campaign_id: campaignId, user_id: actor.user_id!, permission: "control", version: 1, granted_by: null, granted_at: null, revoked_at: null })),
    reader_perspectives: source.tables.campaign_memberships.map(member => ({ campaign_id: campaignId, user_id: member.user_id!, actor_id: member.role === "spieler" ? member.actor_id! : null, version: 1, updated_at: null })),
  };
  const bundle = createCampaignBundleV2({ campaignId, universeId: source.manifest.universeId, exportedAt: source.manifest.exportedAt, tables: { ...tables, ...defaults } });
  const receipt = { algorithm: "atlas-chronicles/v1-to-v2/actor-defaults@1" as const, sourceVersion: 1 as const, targetVersion: 2 as const,
    sourceContentHash: source.manifest.contentHash, targetContentHash: bundle.manifest.contentHash, sourceBundleHash: hash(source),
    addedRows: CAMPAIGN_V2_ADDITIONAL_TABLES.map(table => ({ table: table.name, count: bundle.tables[table.name].length })) };
  return { bundle, report: { ...receipt, reportHash: hash(receipt) } };
}
