// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2026 Kaya Yesilyurt - Atlas Chronicles. Siehe LICENSE.
// Frozen V4 replay, not an authorization decision. Current membership cannot prove
// historic GM authority, so durable identities are required without reviving grants.
import { parseThemeManifest, evaluateThemeAccessibility } from "@chronicle/theme";
import { fail, hash, object, list, string, keys } from "../campaign-v3-json.ts";
import type { CampaignRow } from "../campaign-schema.ts";
import { AUTHORING_V4_OPERATIONS, CAMPAIGN_BUNDLE_V4_LIMITS, CAMPAIGN_V4_ADDITIONAL_TABLES, type CampaignTablesV4 } from "./schema.ts";
import { equal, json, normalizeRoute, sourceIndex } from "./sources.ts";
type R = Record<string, unknown>;
function record(value: unknown, fields: readonly string[], path: string): R { const row = object(value, path); keys(row, fields, path); return row; }
function id(value: unknown, path: string): string { const result = string(value, path); if (/[\u0000-\u001f\u007f]/.test(result)) fail(path, "control-free identity required"); return result; }
function version(value: unknown, path: string, min = 1): number { if (typeof value !== "number" || !Number.isInteger(value) || value < min || value > 2_147_483_647) fail(path, "bounded SQL version required"); return value as number; }
function text(value: unknown, max: number, path: string): string { if (typeof value !== "string" || value.length > max || /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/.test(value)) fail(path, "bounded text required"); return value as string; }
function warnings(value: unknown): string[] {
  const rows = list(value, "warnings", 32).map(value => text(value, 240, "warning")); if (new Set(rows).size !== rows.length) fail("warnings", "duplicate warning"); return rows;
}
function ids(value: unknown, min = 0): string[] {
  const rows = list(value, "ids", 1000).map(value => id(value, "id")); if (rows.length < min || new Set(rows).size !== rows.length) fail("ids", "nonempty unique selection required"); return rows;
}
function bool(value: unknown, path: string): boolean { if (typeof value !== "boolean") fail(path, "boolean required"); return value as boolean; }
const themeKey = (id: unknown, revision: unknown) => `${String(id)}\u0000${String(revision)}`;
const routeKey = (kind: unknown, route: unknown) => `${String(kind)}\u0000${String(route)}`;
interface Event { row: CampaignRow; operation: string; subject: string; input: R; before: unknown; after: R; version: number }

export function checkAuthoringTables(tables: CampaignTablesV4, campaignId: string): void {
  const users = new Set(tables.users.map(row => String(row.id))), entries = new Map(tables.entries.map(row => [String(row.id), row]));
  const sources = sourceIndex(tables), themeRows = new Map(tables.theme_preset_revisions.map(row => [themeKey(row.theme_id, row.revision), row]));
  for (const table of CAMPAIGN_V4_ADDITIONAL_TABLES) for (const row of tables[table.name]) {
    if (row.campaign_id !== campaignId) fail(table.name, "foreign campaign row");
    for (const column of ["created_by", "updated_by", "published_by", "actor_user_id"]) if (row[column] !== undefined && !users.has(String(row[column]))) fail(`${table.name}.${column}`, "missing durable identity");
  }
  const checkedThemes = new Map<string, { manifest: unknown; contentHash: string; accessibilityReport: unknown }>();
  function checkedTheme(value: unknown) {
    const key = hash(value), cached = checkedThemes.get(key); if (cached) return cached;
    let manifest; try { manifest = parseThemeManifest(value); } catch { return fail("theme.manifest", "invalid closed theme manifest"); }
    const report = evaluateThemeAccessibility(manifest); if (!report.passes) fail("theme.report", "stored theme fails contrast admission");
    const result = { manifest, contentHash: hash(manifest), accessibilityReport: { ...report, manifestHash: hash(manifest) } };
    checkedThemes.set(key, result); return result;
  }
  function themePin(value: unknown): R | null {
    if (value === null) return null;
    const pin = record(value, ["themeId", "revision"], "theme.pin"); id(pin.themeId, "theme.pin.themeId"); version(pin.revision, "theme.pin.revision");
    if (!themeRows.has(themeKey(pin.themeId, pin.revision))) fail("theme.pin", "missing or foreign immutable revision"); return pin;
  }
  for (const row of tables.theme_preset_revisions) {
    const valid = checkedTheme(row.manifest); equal(row.content_hash, valid.contentHash, "theme.content_hash"); equal(row.accessibility_report, valid.accessibilityReport, "theme.accessibility_report");
  }
  function policyFromRow(row: CampaignRow): R {
    return { publicKey: row.public_key, enabled: row.enabled, worldSlug: row.world_slug, title: row.title, description: row.description, locale: row.locale, contentWarnings: row.content_warnings,
      theme: row.theme_id === null ? null : { themeId: row.theme_id, revision: row.theme_revision }, version: row.version };
  }
  function validatePolicy(value: unknown): R {
    const policy = record(value, ["publicKey", "enabled", "worldSlug", "title", "description", "locale", "contentWarnings", "theme", "version"], "policy");
    if (typeof policy.publicKey !== "string" || !/^[A-Za-z0-9_-]{24}$/.test(policy.publicKey)) fail("policy.publicKey", "immutable public identity required");
    bool(policy.enabled, "policy.enabled"); normalizeRoute("world", string(policy.worldSlug, "policy.worldSlug", 200));
    const title = string(policy.title, "policy.title", 200); if (!title.trim() || title !== title.trim()) fail("policy.title", "trimmed title required");
    text(policy.description, 2000, "policy.description"); if (!["de", "en"].includes(String(policy.locale))) fail("policy.locale", "unsupported locale");
    warnings(policy.contentWarnings); themePin(policy.theme); version(policy.version, "policy.version"); return policy;
  }
  function validateEntry(value: unknown): R {
    const entry = record(value, ["entryId", "enabled", "revisionId", "passageIds", "publicSlug", "metadata", "version"], "publication");
    const entryId = id(entry.entryId, "publication.entryId"); if (!entries.has(entryId)) fail("publication.entryId", "missing article");
    bool(entry.enabled, "publication.enabled"); sources.revision(entry.revisionId, entryId); const selected = ids(entry.passageIds, 1); equal(selected, [...selected].sort(), "publication.passageIds");
    normalizeRoute("article", string(entry.publicSlug, "publication.publicSlug", 200)); version(entry.version, "publication.version");
    const metadata = record(entry.metadata, ["contentWarnings", "attributions", "mints"], "publication.metadata");
    const mintIds = list(metadata.mints, "publication.metadata.mints", 1000).map(mint => id(object(mint, "mint").mintId, "mint.id")); ids(mintIds); equal(mintIds, [...mintIds].sort(), "publication.mintIds");
    equal(metadata, sources.metadata(entryId, String(entry.revisionId), selected, warnings(metadata.contentWarnings), mintIds), "publication.metadata"); return entry;
  }
  function validateRoute(value: unknown): R {
    const route = record(value, ["kind", "route", "entryId", "sourceUrl"], "route");
    if (!["world", "article", "legacy"].includes(String(route.kind))) fail("route.kind", "unknown route kind");
    const name = string(route.route, "route.route", 2048); equal(name, normalizeRoute(String(route.kind), name), "route.normalization");
    if (route.kind === "world") { if (route.entryId !== null || route.sourceUrl !== null) fail("route", "world alias has no article or source"); }
    else {
      const entryId = id(route.entryId, "route.entryId"); if (!entries.has(entryId)) fail("route.entryId", "missing article");
      if (route.kind === "article") { if (route.sourceUrl !== null) fail("route.sourceUrl", "article alias has no source URL"); }
      else sources.legacy(entryId, string(route.sourceUrl, "route.sourceUrl", 2048), name);
    }
    return route;
  }

  const events: Event[] = tables.authoring_events.map(row => {
    const operation = String(row.operation), subject = id(row.subject_id, "event.subject_id");
    if (!AUTHORING_V4_OPERATIONS.includes(operation as typeof AUTHORING_V4_OPERATIONS[number])) fail("event.operation", "unknown operation");
    const request = record(row.request, ["campaignId", "actorUserId", "operation", "subjectId", "input"], "event.request");
    if (Buffer.byteLength(json(request), "utf8") > CAMPAIGN_BUNDLE_V4_LIMITS.authoringRequestBytes) fail("event.request", "authoring request byte limit exceeded");
    if (request.campaignId !== campaignId || request.actorUserId !== row.actor_user_id || request.operation !== operation || request.subjectId !== (operation === "theme.create" ? null : subject)) fail("event.request", "request scope/identity/operation/target differs");
    if (row.request_hash !== hash(request)) fail("event.request_hash", "request preimage mismatch");
    const ack = record(row.ack, ["subjectId", "version"], "event.ack"), acceptedVersion = version(ack.version, "event.ack.version"); if (ack.subjectId !== subject) fail("event.ack", "acknowledged subject differs");
    const input = object(request.input, "event.input") as R; if (input.commandId !== row.command_id) fail("event.command_id", "request command identity differs"); id(input.commandId, "input.commandId");
    const fields: Record<string, readonly string[]> = {
      "theme.create": ["commandId", "manifest"], "theme.revise": ["commandId", "expectedVersion", "manifest"],
      "theme.pin": ["commandId", "expectedVersion", "themeId", "revision"],
      "publication.configure": ["commandId", "expectedVersion", "enabled", "worldSlug", "title", "description", "locale", "contentWarnings", "theme"],
      "entry.publish": ["commandId", "expectedArticleRevisionId", "expectedPublicationVersion", "expectedPolicyVersion", "passageIds", "publicSlug", "contentWarnings", "mintIds"],
      "entry.unpublish": ["commandId", "expectedArticleRevisionId", "expectedPublicationVersion", "expectedPolicyVersion"],
      "route.add": ["commandId", "expectedPolicyVersion", "kind", "route", "entryId", "sourceUrl"], "route.remove": ["commandId", "expectedPolicyVersion", "kind", "route"],
    };
    record(input, fields[operation]!, "event.input");
    if (["theme.pin", "publication.configure", "route.add", "route.remove"].includes(operation) && subject !== campaignId) fail("event.subject", "campaign-scoped command required");
    if (input.expectedVersion !== undefined) version(input.expectedVersion, "input.expectedVersion", operation === "theme.revise" ? 1 : 0);
    if (input.expectedPolicyVersion !== undefined) version(input.expectedPolicyVersion, "input.expectedPolicyVersion");
    if (input.expectedPublicationVersion !== undefined) version(input.expectedPublicationVersion, "input.expectedPublicationVersion", operation === "entry.publish" ? 0 : 1);
    if (operation.startsWith("entry.")) sources.revision(input.expectedArticleRevisionId, subject);
    const after = object(row.after_state, "event.after_state") as R; if (after.version !== acceptedVersion) fail("event.ack.version", "ack differs from durable accepted state");
    return { row, operation, subject, input, before: row.before_state, after, version: acceptedVersion };
  });

  const grouped = new Map<string, Event[]>();
  for (const event of events.filter(event => event.operation === "theme.create" || event.operation === "theme.revise")) { const rows = grouped.get(event.subject) ?? []; rows.push(event); grouped.set(event.subject, rows); }
  for (const head of tables.theme_presets) {
    const rows = (grouped.get(String(head.id)) ?? []).sort((a, b) => a.version - b.version);
    if (rows.length !== head.head_revision || head.version !== head.head_revision) fail("theme.history", "missing/extra revision or event");
    let previous: R | null = null;
    rows.forEach((event, index) => {
      if (event.version !== index + 1 || event.operation !== (index === 0 ? "theme.create" : "theme.revise") || (index > 0 && event.input.expectedVersion !== index)) fail("theme.history", "noncontiguous revision/CAS history");
      equal(event.before, previous, "theme.event.before");
      const valid = checkedTheme(event.input.manifest), stored = themeRows.get(themeKey(head.id, index + 1));
      if (!stored || stored.created_by !== event.row.actor_user_id) fail("theme.revision", "missing revision or wrong creator");
      equal(stored!.manifest, valid.manifest, "theme.revision.manifest");
      previous = { id: head.id, revision: index + 1, version: index + 1, ...valid }; equal(event.after, previous, "theme.event.after");
    });
    if (rows[0]?.row.actor_user_id !== head.created_by) fail("theme.created_by", "creator differs from event"); grouped.delete(String(head.id));
  }
  if (grouped.size || tables.theme_preset_revisions.length !== events.filter(event => ["theme.create", "theme.revise"].includes(event.operation)).length) fail("theme.history", "orphan immutable revision/event");

  let pin: R | null = null, pinActor: unknown;
  const pinEvents = events.filter(event => event.operation === "theme.pin").sort((a, b) => a.version - b.version);
  pinEvents.forEach((event, index) => {
    if (event.version !== index + 1 || event.input.expectedVersion !== index) fail("theme.pin.history", "noncontiguous CAS history");
    equal(event.before, pin, "theme.pin.before"); themePin({ themeId: event.input.themeId, revision: event.input.revision });
    pin = { themeId: event.input.themeId, revision: event.input.revision, version: index + 1 }; equal(event.after, pin, "theme.pin.after"); pinActor = event.row.actor_user_id;
  });
  if (tables.campaign_theme_pins.length !== (pin === null ? 0 : 1)) fail("theme.pin", "history/current pin mismatch");
  for (const row of tables.campaign_theme_pins) { equal({ themeId: row.theme_id, revision: row.theme_revision, version: row.version }, pin, "theme.pin.current"); equal(row.updated_by, pinActor, "theme.pin.updated_by"); }

  let policy: R | null = null, policyActor: unknown;
  const publicEntries = new Map<string, R>(), publicSlugs = new Map<string, string>(), entryActors = new Map<string, unknown>(), observedRevision = new Map<string, number>();
  const publicRoutes = new Map<string, { value: R; creator: unknown }>();
  const addAlias = (kind: "world" | "article", route: unknown, entryId: unknown, creator: unknown) => {
    const key = routeKey(kind, route), prior = publicRoutes.get(key);
    if (prior && prior.value.entryId !== entryId) fail("route.alias", "alias target collision");
    if (!prior) publicRoutes.set(key, { value: { kind, route, entryId, sourceUrl: null }, creator });
  };
  function reserveArticle(slug: unknown, entryId: unknown): void {
    const alias = publicRoutes.get(routeKey("article", slug)); if (alias && alias.value.entryId !== entryId) fail("publication.slug", "reserved alias collision");
    const owner = publicSlugs.get(String(slug)); if (owner !== undefined && owner !== entryId) fail("publication.slug", "article name collision");
  }
  const entryGroups = new Map<number, Event[]>();
  for (const event of events.filter(event => event.operation.startsWith("entry."))) { const expected = Number(event.input.expectedPolicyVersion), rows = entryGroups.get(expected) ?? []; rows.push(event); entryGroups.set(expected, rows); }
  const policyEvents = events.filter(event => ["publication.configure", "route.add", "route.remove"].includes(event.operation)).sort((a, b) => a.version - b.version);
  policyEvents.forEach((event, index) => {
    if (event.version !== index + 1) fail("policy.history", "noncontiguous policy history");
    if (event.operation === "publication.configure") {
      if (event.input.expectedVersion !== index) fail("policy.expectedVersion", "historical CAS mismatch"); equal(event.before, policy, "policy.before");
      const after = validatePolicy(event.after);
      if (policy && after.publicKey !== policy.publicKey) fail("policy.publicKey", "immutable public identity changed");
      const title = string(event.input.title, "input.title", 200); if (!title.trim()) fail("input.title", "nonblank title required");
      equal(after, { publicKey: after.publicKey, enabled: bool(event.input.enabled, "input.enabled"), worldSlug: normalizeRoute("world", string(event.input.worldSlug, "input.worldSlug", 200)), title: title.trim(), description: text(event.input.description, 2000, "input.description"), locale: event.input.locale, contentWarnings: warnings(event.input.contentWarnings), theme: themePin(event.input.theme), version: index + 1 }, "policy.after");
      if (policy && policy.worldSlug !== after.worldSlug) addAlias("world", policy.worldSlug, null, event.row.actor_user_id);
      policy = after;
    } else {
      if (!policy || event.input.expectedPolicyVersion !== index) fail("route.policy", "missing policy or historical CAS mismatch");
      const kind = String(event.input.kind), name = string(event.input.route, "route.name", 2048), key = routeKey(kind, name), old = publicRoutes.get(key);
      equal(name, normalizeRoute(kind, name), "route.request.normalized");
      const remove = event.operation === "route.remove";
      if (remove && !old || !remove && old) fail("route.history", "route existence differs from command");
      equal(event.before, old ? { ...old.value, version: index, removed: false } : null, "route.before");
      const route = validateRoute(remove ? old!.value : { kind, route: name, entryId: event.input.entryId, sourceUrl: event.input.sourceUrl });
      if (!remove) {
        if (kind === "world" && route.route === policy!.worldSlug) fail("route", "alias duplicates current world name");
        if (route.entryId !== null && !publicEntries.has(String(route.entryId))) fail("route.entryId", "article was never explicitly published");
        if (kind === "article") reserveArticle(route.route, route.entryId);
        publicRoutes.set(key, { value: route, creator: event.row.actor_user_id });
      } else publicRoutes.delete(key);
      equal(event.after, { ...route, version: index + 1, removed: remove }, "route.after"); policy = { ...policy!, version: index + 1 };
    }
    policyActor = event.row.actor_user_id;
    const entryEvents = (entryGroups.get(index + 1) ?? []).sort((a, b) => a.subject < b.subject ? -1 : a.subject > b.subject ? 1 : a.version - b.version);
    for (const item of entryEvents) {
      const before = publicEntries.get(item.subject) ?? null, expected = Number(before?.version ?? 0);
      if (item.input.expectedPublicationVersion !== expected || item.version !== expected + 1) fail("publication.history", "noncontiguous publication CAS history");
      equal(item.before, before, "publication.before");
      const source = sources.revision(item.input.expectedArticleRevisionId, item.subject), seq = Number(source.seq);
      if (seq < (observedRevision.get(item.subject) ?? 0)) fail("publication.revision", "observed article revision moved backwards"); observedRevision.set(item.subject, seq);
      const after = validateEntry(item.after);
      if (item.operation === "entry.publish") {
        const selected = ids(item.input.passageIds, 1), mintIds = ids(item.input.mintIds); equal(selected, [...selected].sort(), "input.passageIds.normalized"); equal(mintIds, [...mintIds].sort(), "input.mintIds.normalized");
        equal(after, { entryId: item.subject, enabled: true, revisionId: item.input.expectedArticleRevisionId, passageIds: selected, publicSlug: normalizeRoute("article", string(item.input.publicSlug, "input.publicSlug", 200)), metadata: sources.metadata(item.subject, String(item.input.expectedArticleRevisionId), selected, warnings(item.input.contentWarnings), mintIds), version: expected + 1 }, "publication.after");
        reserveArticle(after.publicSlug, item.subject);
        if (before && before.publicSlug !== after.publicSlug) { addAlias("article", before.publicSlug, item.subject, item.row.actor_user_id); publicSlugs.delete(String(before.publicSlug)); }
        publicSlugs.set(String(after.publicSlug), item.subject);
      } else {
        if (!before) fail("publication.unpublish", "no previous publication"); equal(after, { ...before!, enabled: false, version: expected + 1 }, "publication.unpublish.after");
      }
      publicEntries.set(item.subject, after); entryActors.set(item.subject, item.row.actor_user_id);
    }
    entryGroups.delete(index + 1);
  });
  if (entryGroups.size) fail("publication.policy", "publication references missing policy version");
  if (tables.campaign_publications.length !== (policy === null ? 0 : 1)) fail("policy.current", "missing policy history");
  for (const row of tables.campaign_publications) {
    if ((row.theme_id === null) !== (row.theme_revision === null)) fail("policy.theme", "incomplete nullable theme pin");
    equal(validatePolicy(policyFromRow(row)), policy, "policy.current"); equal(row.updated_by, policyActor, "policy.updated_by");
  }
  if (tables.entry_publications.length !== publicEntries.size) fail("publication.current", "missing/extra publication history");
  for (const row of tables.entry_publications) {
    const entry = entries.get(String(row.entry_id)); if (!entry) fail("publication.entry_id", "missing article");
    equal(validateEntry({ entryId: row.entry_id, enabled: entry!.public, revisionId: row.revision_id, passageIds: row.passage_ids, publicSlug: row.public_slug, metadata: row.public_metadata, version: row.version }), publicEntries.get(String(row.entry_id)) ?? null, "publication.current");
    equal(row.published_by, entryActors.get(String(row.entry_id)), "publication.published_by");
  }
  if (tables.publication_routes.length !== publicRoutes.size) fail("route.current", "missing/extra alias history");
  for (const row of tables.publication_routes) {
    const state = publicRoutes.get(routeKey(row.kind, row.route)); if (!state) fail("route.current", "unrecorded route");
    equal(validateRoute({ kind: row.kind, route: row.route, entryId: row.entry_id, sourceUrl: row.source_url }), state!.value, "route.current"); equal(row.created_by, state!.creator, "route.created_by");
  }
}
