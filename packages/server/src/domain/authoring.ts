import { randomBytes, randomUUID } from "node:crypto";
import { Value } from "@sinclair/typebox/value";
import type { Static, TSchema } from "@sinclair/typebox";
import { canonicalJson, textHash, type CanonicalValue } from "@chronicle/core";
import { parseThemeManifest, evaluateThemeAccessibility, getThemePreset } from "@chronicle/theme";
import type { ThemeManifestV1 } from "@chronicle/theme";
import type { Passage } from "@chronicle/chronik";
import * as P from "../../../protocol/src/authoring.ts";
import type { Db } from "../db/index.ts";
import type { DomainConfig } from "./campaigns.ts";
import { Gone, Conflict } from "./errors.ts";
import { projectPublicWorld, type PublicEntrySource } from "./public-projection.ts";

export const authoringJson = (value: unknown): string => canonicalJson(value as CanonicalValue);
export const authoringHash = (value: unknown): string => textHash(authoringJson(value));
export class AuthoringValidationError extends Error { readonly statusCode = 400; }
function parse<T extends TSchema>(schema: T, input: unknown): Static<T> {
  try {
    const json = JSON.stringify(input);
    if (Buffer.byteLength(json, "utf8") > 512 * 1024) throw new Error();
    const value: unknown = JSON.parse(json);
    if (!Value.Check(schema, value)) throw new Error();
    return value;
  } catch { throw new AuthoringValidationError("Bitte die Autoren- oder Veröffentlichungsdaten prüfen."); }
}
const sorted = (values: readonly string[]) => [...values].sort();
export function normalizePublicationRoute(kind: P.PublicationRoute["kind"], route: string): string {
  if (kind !== "legacy") {
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(route) || route.length > 200) throw new AuthoringValidationError("Ein Alias benötigt einen gültigen Slug.");
    return route;
  }
  let path: string;
  try { path = decodeURIComponent(route).normalize("NFC"); } catch { throw new AuthoringValidationError("Ungültiger alter URL-Pfad."); }
  const match = /^\/(?:(?<locale>[a-zA-Z]{2}(?:-[a-zA-Z]{2})?)\/)?wiki\/(?<article>.+)$/.exec(path);
  if (!match || /[\\?#\u0000-\u001f\u007f%]/.test(path) || match.groups!["article"]!.split("/").some(part => [".", "..", ""].includes(part))) throw new AuthoringValidationError("Ein alter Pfad muss innerhalb /wiki/ oder /Sprachkennung/wiki/ liegen.");
  const locale = match.groups!["locale"], article = match.groups!["article"]!;
  const result = (locale ? `/${locale.toLowerCase()}` : "") + "/wiki/" + article.split("/").map(encodeURIComponent).join("/");
  if (result.length > 2048) throw new AuthoringValidationError("Alter URL-Pfad ist zu lang.");
  return result;
}
export async function authorizeAuthoring(tx: Db, userId: string, campaignId: string, write = false, gm = true): Promise<void> {
  const row = (await tx.query<{ role: string }>(`SELECT m.role FROM campaigns c JOIN campaign_memberships m ON m.campaign_id=c.id
    WHERE c.id=$1 AND m.user_id=$2 ${write ? "FOR UPDATE OF c FOR SHARE OF m" : "FOR SHARE OF c,m"}`, [campaignId, userId])).rows[0];
  if (!row || gm && row.role !== "leitung") throw new Gone();
}
interface ThemeHead { id: string; head_revision: number; version: number }
interface PolicyRow { campaign_id: string; public_key: string; enabled: boolean; world_slug: string; title: string; description: string; locale: "de" | "en"; content_warnings: string[]; theme_id: string | null; theme_revision: number | null; version: number }
interface EntryRow { entry_id: string; revision_id: string; passage_ids: string[]; public_slug: string; public_metadata: P.PublicationMetadata; version: number; enabled: boolean }
interface DocumentSnapshot { title: string; slug: string; passagen: Passage[]; tags: string[][]; importArtifactId?: string }
const policyCard = (row: PolicyRow): P.PublicationPolicy => ({ publicKey: row.public_key, enabled: row.enabled, worldSlug: row.world_slug, title: row.title, description: row.description, locale: row.locale,
  contentWarnings: row.content_warnings, theme: row.theme_id === null ? null : { themeId: row.theme_id, revision: row.theme_revision! }, version: row.version });
const entryCard = (row: EntryRow): P.EntryPublication => ({ entryId: row.entry_id, enabled: row.enabled, revisionId: row.revision_id, passageIds: row.passage_ids, publicSlug: row.public_slug, metadata: row.public_metadata, version: row.version });
export async function readPublicationPolicy(tx: Db, campaignId: string): Promise<P.PublicationPolicy | null> {
  const row = (await tx.query<PolicyRow>("SELECT * FROM campaign_publications WHERE campaign_id=$1", [campaignId])).rows[0]; return row ? policyCard(row) : null;
}
async function entryPublication(tx: Db, campaignId: string, entryId: string): Promise<P.EntryPublication | null> {
  if (!(await tx.query("SELECT 1 FROM entries WHERE id=$1 AND campaign_id=$2", [entryId, campaignId])).rowCount) throw new Gone();
  const row = (await tx.query<EntryRow>(`SELECT p.*,e.public AS enabled FROM entry_publications p JOIN entries e ON e.id=p.entry_id AND e.campaign_id=p.campaign_id
    WHERE p.entry_id=$1 AND p.campaign_id=$2`, [entryId, campaignId])).rows[0]; return row ? entryCard(row) : null;
}
export function checkedTheme(input: unknown, requirePassing = true): { manifest: ThemeManifestV1; report: P.ThemeReport; hash: string } {
  let manifest: ThemeManifestV1;
  try { manifest = parseThemeManifest(input); } catch { throw new AuthoringValidationError("Ungültiges Theme-Manifest."); }
  const hash = authoringHash(manifest), report = { ...evaluateThemeAccessibility(manifest), manifestHash: hash };
  if (requirePassing && !report.passes) throw new AuthoringValidationError("Die Theme-Kontraste müssen vor dem Speichern korrigiert werden.");
  return { manifest, report, hash };
}
export async function readTheme(tx: Db, campaignId: string, id: string, revision?: number): Promise<P.ThemeCard> {
  const head = (await tx.query<ThemeHead>("SELECT id,head_revision,version FROM theme_presets WHERE id=$1 AND campaign_id=$2", [id, campaignId])).rows[0];
  if (!head) throw new Gone();
  const selected = revision ?? head.head_revision;
  const row = (await tx.query<{ manifest: ThemeManifestV1; content_hash: string; accessibility_report: P.ThemeReport }>("SELECT manifest,content_hash,accessibility_report FROM theme_preset_revisions WHERE theme_id=$1 AND campaign_id=$2 AND revision=$3", [id, campaignId, selected])).rows[0];
  if (!row) throw new Gone(); const valid = checkedTheme(row.manifest);
  if (valid.hash !== row.content_hash || authoringJson(valid.report) !== authoringJson(row.accessibility_report)) throw new Gone();
  return { id, revision: selected, version: head.version, manifest: valid.manifest, contentHash: valid.hash, accessibilityReport: valid.report };
}
async function pin(tx: Db, campaignId: string): Promise<P.ThemePin | null> {
  return (await tx.query<P.ThemePin>('SELECT theme_id AS "themeId",theme_revision AS revision,version FROM campaign_theme_pins WHERE campaign_id=$1', [campaignId])).rows[0] ?? null;
}
async function routes(tx: Db, campaignId: string): Promise<P.PublicationRoute[]> {
  const rows = (await tx.query<P.PublicationRoute>('SELECT kind,route,entry_id AS "entryId",source_url AS "sourceUrl" FROM publication_routes WHERE campaign_id=$1', [campaignId])).rows;
  return rows.sort((a, b) => authoringJson(a) < authoringJson(b) ? -1 : 1);
}
async function reserveName(tx: Db, campaignId: string, kind: "world" | "article", route: string, entryId: string | null): Promise<void> {
  const alias = (await tx.query<{ entry_id: string | null }>("SELECT entry_id FROM publication_routes WHERE campaign_id=$1 AND kind=$2 AND route=$3", [campaignId, kind, route])).rows[0];
  if (alias && alias.entry_id !== entryId) throw new Conflict();
  if (kind === "article" && (await tx.query("SELECT 1 FROM entry_publications WHERE campaign_id=$1 AND public_slug=$2 AND entry_id<>$3", [campaignId, route, entryId])).rowCount) throw new Conflict();
}

export function createAuthoring(db: Db, cfg: DomainConfig = {}) {
  const now = cfg.now ?? Date.now;
  async function read<T>(userId: string, campaignId: string, work: (tx: Db) => Promise<T>, gm = true): Promise<T> {
    return db.transaction(async tx => { await authorizeAuthoring(tx, userId, campaignId, false, gm); return work(tx); });
  }
  async function command(userId: string, campaignId: string, operation: P.AuthoringOperation, subjectId: string | null, input: { commandId: string },
    work: (tx: Db) => Promise<{ subjectId: string; version: number; before: unknown; after: unknown }>): Promise<P.AuthoringAck> {
    return db.transaction(async tx => {
      await authorizeAuthoring(tx, userId, campaignId, true);
      const request = { campaignId, actorUserId: userId, operation, subjectId, input }, requestHash = authoringHash(request);
      const old = (await tx.query<{ campaign_id: string; actor_user_id: string; request_hash: string; ack: P.AuthoringAck }>("SELECT campaign_id,actor_user_id,request_hash,ack FROM authoring_events WHERE command_id=$1", [input.commandId])).rows[0];
      if (old) { if (old.campaign_id !== campaignId || old.actor_user_id !== userId || old.request_hash !== requestHash) throw new Conflict(); return old.ack; }
      const result = await work(tx), ack = { subjectId: result.subjectId, version: result.version };
      await tx.query(`INSERT INTO authoring_events(command_id,campaign_id,actor_user_id,operation,subject_id,request,request_hash,before_state,after_state,ack,created_at)
        VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)`, [input.commandId, campaignId, userId, operation, result.subjectId, authoringJson(request), requestHash,
        result.before === null ? null : authoringJson(result.before), authoringJson(result.after), authoringJson(ack), now()]);
      return ack;
    }).catch(error => { if (error?.code === "23505") throw new Conflict(); throw error; });
  }
  async function writeTheme(userId: string, campaignId: string, id: string | null, raw: unknown) {
    const input = id === null ? parse(P.ThemeCreateSchema, raw) : parse(P.ThemeReviseSchema, raw), checked = checkedTheme(input.manifest);
    const normalized = { ...input, manifest: checked.manifest };
    return command(userId, campaignId, id === null ? "theme.create" : "theme.revise", id, normalized, async tx => {
      const before = id === null ? null : await readTheme(tx, campaignId, id);
      if (before && (!("expectedVersion" in input) || input.expectedVersion !== before.version)) throw new Conflict();
      const themeId = id ?? randomUUID(), revision = (before?.revision ?? 0) + 1, version = (before?.version ?? 0) + 1;
      if (!before) await tx.query("INSERT INTO theme_presets(id,campaign_id,created_by,created_at) VALUES($1,$2,$3,$4)", [themeId, campaignId, userId, now()]);
      await tx.query(`INSERT INTO theme_preset_revisions(theme_id,campaign_id,revision,manifest,content_hash,accessibility_report,created_by,created_at)
        VALUES($1,$2,$3,$4,$5,$6,$7,$8)`, [themeId, campaignId, revision, authoringJson(checked.manifest), checked.hash, authoringJson(checked.report), userId, now()]);
      if (before) await tx.query("UPDATE theme_presets SET head_revision=$2,version=$3 WHERE id=$1", [themeId, revision, version]);
      return { subjectId: themeId, version, before, after: await readTheme(tx, campaignId, themeId) };
    });
  }
  async function pinTheme(userId: string, campaignId: string, raw: unknown) {
    const input = parse(P.ThemePinUpdateSchema, raw);
    return command(userId, campaignId, "theme.pin", campaignId, input, async tx => {
      const before = await pin(tx, campaignId); if ((before?.version ?? 0) !== input.expectedVersion) throw new Conflict();
      await readTheme(tx, campaignId, input.themeId, input.revision); const version = (before?.version ?? 0) + 1;
      await tx.query(`INSERT INTO campaign_theme_pins(campaign_id,theme_id,theme_revision,version,updated_by,updated_at) VALUES($1,$2,$3,$4,$5,$6)
        ON CONFLICT(campaign_id) DO UPDATE SET theme_id=EXCLUDED.theme_id,theme_revision=EXCLUDED.theme_revision,version=EXCLUDED.version,updated_by=EXCLUDED.updated_by,updated_at=EXCLUDED.updated_at`,
        [campaignId, input.themeId, input.revision, version, userId, now()]);
      return { subjectId: campaignId, version, before, after: await pin(tx, campaignId) };
    });
  }
  async function configurePublication(userId: string, campaignId: string, raw: unknown) {
    const input = parse(P.PublicationConfigureSchema, raw);
    return command(userId, campaignId, "publication.configure", campaignId, input, async tx => {
      const before = await readPublicationPolicy(tx, campaignId); if ((before?.version ?? 0) !== input.expectedVersion) throw new Conflict();
      if (input.theme) await readTheme(tx, campaignId, input.theme.themeId, input.theme.revision);
      await reserveName(tx, campaignId, "world", input.worldSlug, null);
      const version = (before?.version ?? 0) + 1;
      if (before && before.worldSlug !== input.worldSlug) await tx.query(`INSERT INTO publication_routes(campaign_id,kind,route,entry_id,source_url,created_by,created_at)
        VALUES($1,'world',$2,NULL,NULL,$3,$4) ON CONFLICT DO NOTHING`, [campaignId, before.worldSlug, userId, now()]);
      await tx.query(`INSERT INTO campaign_publications(campaign_id,public_key,enabled,world_slug,title,description,locale,content_warnings,theme_id,theme_revision,version,updated_by,updated_at)
        VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13) ON CONFLICT(campaign_id) DO UPDATE SET enabled=EXCLUDED.enabled,world_slug=EXCLUDED.world_slug,title=EXCLUDED.title,
        description=EXCLUDED.description,locale=EXCLUDED.locale,content_warnings=EXCLUDED.content_warnings,theme_id=EXCLUDED.theme_id,theme_revision=EXCLUDED.theme_revision,
        version=EXCLUDED.version,updated_by=EXCLUDED.updated_by,updated_at=EXCLUDED.updated_at`, [campaignId, before?.publicKey ?? randomBytes(18).toString("base64url"), input.enabled,
        input.worldSlug, input.title.trim(), input.description, input.locale, authoringJson(input.contentWarnings), input.theme?.themeId ?? null, input.theme?.revision ?? null, version, userId, now()]);
      return { subjectId: campaignId, version, before, after: await readPublicationPolicy(tx, campaignId) };
    });
  }

  async function publicationDraft(tx: Db, campaignId: string, entryId: string, input: P.EntryPublishPreviewInput): Promise<{ before: P.EntryPublication | null; after: P.EntryPublication; document: DocumentSnapshot }> {
    const policy = await readPublicationPolicy(tx, campaignId), before = await entryPublication(tx, campaignId, entryId);
    if (!policy || policy.version !== input.expectedPolicyVersion || (before?.version ?? 0) !== input.expectedPublicationVersion) throw new Conflict();
    const source = (await tx.query<{ current_revision_id: string; document: DocumentSnapshot; seq: number }>(`SELECT e.current_revision_id,r.document,r.seq FROM entries e JOIN revisions r ON r.id=e.current_revision_id AND r.entry_id=e.id
      WHERE e.id=$1 AND e.campaign_id=$2`, [entryId, campaignId])).rows[0];
    if (!source) throw new Gone(); if (source.current_revision_id !== input.expectedArticleRevisionId) throw new Conflict();
    const selected = new Set(input.passageIds);
    if (input.passageIds.some(pid => !source.document.passagen.some(p => p.pid === pid))) throw new AuthoringValidationError("Die Auswahl enthält keine Passage dieses Artikelstands.");
    await reserveName(tx, campaignId, "article", input.publicSlug, entryId);
    const metadata = await publicationMetadata(tx, campaignId, entryId, source.seq, source.document, selected, input.contentWarnings, input.mintIds);
    return { before, after: { entryId, enabled: true, revisionId: source.current_revision_id, passageIds: sorted(input.passageIds), publicSlug: input.publicSlug, metadata, version: (before?.version ?? 0) + 1 }, document: source.document };
  }
  async function publishEntry(userId: string, campaignId: string, entryId: string, raw: unknown) {
    const parsed = parse(P.EntryPublishSchema, raw), input = { ...parsed, passageIds: sorted(parsed.passageIds), mintIds: sorted(parsed.mintIds) };
    return command(userId, campaignId, "entry.publish", entryId, input, async tx => {
      const { before, after } = await publicationDraft(tx, campaignId, entryId, input);
      if (before && before.publicSlug !== after.publicSlug) await tx.query(`INSERT INTO publication_routes(campaign_id,kind,route,entry_id,source_url,created_by,created_at)
        VALUES($1,'article',$2,$3,NULL,$4,$5) ON CONFLICT DO NOTHING`, [campaignId, before.publicSlug, entryId, userId, now()]);
      await tx.query(`INSERT INTO entry_publications(entry_id,campaign_id,revision_id,passage_ids,public_slug,public_metadata,version,published_by,published_at)
        VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9) ON CONFLICT(entry_id) DO UPDATE SET revision_id=EXCLUDED.revision_id,passage_ids=EXCLUDED.passage_ids,
        public_slug=EXCLUDED.public_slug,public_metadata=EXCLUDED.public_metadata,version=EXCLUDED.version,published_by=EXCLUDED.published_by,published_at=EXCLUDED.published_at`,
        [entryId, campaignId, after.revisionId, authoringJson(after.passageIds), after.publicSlug, authoringJson(after.metadata), after.version, userId, now()]);
      await tx.query("UPDATE entries SET public=true WHERE id=$1 AND campaign_id=$2", [entryId, campaignId]);
      return { subjectId: entryId, version: after.version, before, after };
    });
  }
  async function unpublishEntry(userId: string, campaignId: string, entryId: string, raw: unknown) {
    const input = parse(P.EntryUnpublishSchema, raw);
    return command(userId, campaignId, "entry.unpublish", entryId, input, async tx => {
      const policy = await readPublicationPolicy(tx, campaignId), before = await entryPublication(tx, campaignId, entryId);
      if (!before) throw new Gone();
      const entry = (await tx.query<{ current_revision_id: string }>("SELECT current_revision_id FROM entries WHERE id=$1 AND campaign_id=$2", [entryId, campaignId])).rows[0]!;
      if (policy?.version !== input.expectedPolicyVersion || before.version !== input.expectedPublicationVersion || entry.current_revision_id !== input.expectedArticleRevisionId) throw new Conflict();
      const after = { ...before, enabled: false, version: before.version + 1 };
      await tx.query("UPDATE entry_publications SET version=$2,published_by=$3,published_at=$4 WHERE entry_id=$1", [entryId, after.version, userId, now()]);
      await tx.query("UPDATE entries SET public=false WHERE id=$1 AND campaign_id=$2", [entryId, campaignId]);
      return { subjectId: entryId, version: after.version, before, after };
    });
  }
  async function mutateRoute(userId: string, campaignId: string, raw: unknown, remove: boolean) {
    const parsed = remove ? parse(P.PublicationRouteRemoveSchema, raw) : parse(P.PublicationRouteAddSchema, raw), input = { ...parsed, route: normalizePublicationRoute(parsed.kind, parsed.route) };
    return command(userId, campaignId, remove ? "route.remove" : "route.add", campaignId, input, async tx => {
      const policy = await readPublicationPolicy(tx, campaignId); if (!policy || policy.version !== input.expectedPolicyVersion) throw new Conflict();
      const old = (await routes(tx, campaignId)).find(route => route.kind === input.kind && route.route === input.route) ?? null;
      let next: P.PublicationRoute;
      if (remove) { if (!old) throw new Gone(); next = old; await tx.query("DELETE FROM publication_routes WHERE campaign_id=$1 AND kind=$2 AND route=$3", [campaignId, input.kind, input.route]); }
      else {
        const added = input as P.PublicationRouteAddInput;
        if (old) throw new Conflict();
        if (added.kind === "world" ? added.entryId !== null || added.sourceUrl !== null : added.entryId === null || (added.kind === "article" ? added.sourceUrl !== null : added.sourceUrl === null)) throw new AuthoringValidationError("Aliasziel und Quelle passen nicht zur Routenart.");
        if (added.kind === "world" && added.route === policy.worldSlug) throw new Conflict();
        if (added.entryId !== null && !await entryPublication(tx, campaignId, added.entryId)) throw new Gone();
        if (added.kind === "article") await reserveName(tx, campaignId, "article", added.route, added.entryId);
        if (added.kind === "legacy") await verifyLegacySource(tx, campaignId, added.entryId!, added.sourceUrl!, added.route);
        next = { kind: added.kind, route: added.route, entryId: added.entryId, sourceUrl: added.sourceUrl };
        await tx.query("INSERT INTO publication_routes(campaign_id,kind,route,entry_id,source_url,created_by,created_at) VALUES($1,$2,$3,$4,$5,$6,$7)", [campaignId, next.kind, next.route, next.entryId, next.sourceUrl, userId, now()]);
      }
      const version = policy.version + 1;
      await tx.query("UPDATE campaign_publications SET version=$2,updated_by=$3,updated_at=$4 WHERE campaign_id=$1", [campaignId, version, userId, now()]);
      return { subjectId: campaignId, version, before: old ? { ...old, version: policy.version, removed: false } : null, after: { ...next, version, removed: remove } };
    });
  }
  async function previewEntry(userId: string, campaignId: string, entryId: string, raw: unknown) {
    const input = parse(P.EntryPublishPreviewSchema, raw);
    return read(userId, campaignId, async tx => {
      const draft = await publicationDraft(tx, campaignId, entryId, input), policy = (await readPublicationPolicy(tx, campaignId))!;
      const sources = await collectPublicationSources(tx, campaignId);
      const candidate: PublicEntrySource = { entryId, publication: draft.after, document: draft.document };
      const world = projectPublicWorld(policy, [...sources.filter(row => row.entryId !== entryId), candidate], await routes(tx, campaignId), await publicTheme(tx, campaignId, policy));
      return { world, entrySlug: input.publicSlug };
    });
  }
  return {
    listThemes: (userId: string, campaignId: string) => read(userId, campaignId, async tx => { const ids = (await tx.query<{ id: string }>("SELECT id FROM theme_presets WHERE campaign_id=$1 ORDER BY id COLLATE \"C\"", [campaignId])).rows; const result: P.ThemeCard[] = []; for (const row of ids) result.push(await readTheme(tx, campaignId, row.id)); return result; }),
    getTheme: (userId: string, campaignId: string, id: string, revision?: number) => read(userId, campaignId, tx => readTheme(tx, campaignId, id, revision)),
    previewTheme: (userId: string, campaignId: string, raw: unknown) => read(userId, campaignId, async () => { const input = parse(P.ThemePreviewSchema, raw), valid = checkedTheme(input.manifest, false); return { manifest: valid.manifest, contentHash: valid.hash, accessibilityReport: valid.report }; }),
    createTheme: (userId: string, campaignId: string, input: unknown) => writeTheme(userId, campaignId, null, input),
    reviseTheme: (userId: string, campaignId: string, id: string, input: unknown) => writeTheme(userId, campaignId, id, input), pinTheme,
    getThemePin: (userId: string, campaignId: string) => read(userId, campaignId, async tx => { const selected = await pin(tx, campaignId); return { pin: selected, manifest: selected ? (await readTheme(tx, campaignId, selected.themeId, selected.revision)).manifest : getThemePreset("Fantasy") }; }, false),
    getPublication: (userId: string, campaignId: string) => read(userId, campaignId, tx => readPublicationPolicy(tx, campaignId)), configurePublication,
    getEntryPublication: (userId: string, campaignId: string, entryId: string) => read(userId, campaignId, tx => entryPublication(tx, campaignId, entryId)), publishEntry, unpublishEntry, previewEntry,
    publicationSources: (userId: string, campaignId: string, entryId: string) => read(userId, campaignId, async tx => {
      await entryPublication(tx, campaignId, entryId);
      const legacy = new Map<string, P.PublicationRoute>();
      for (const source of await acceptedSources(tx, campaignId, entryId)) for (const origin of source.source.result.provenance) {
        try {
          const url = new URL(origin.value.quellArtikelUrl);
          if (!["http:", "https:"].includes(url.protocol) || url.username || url.password || url.search || url.hash) continue;
          const route = normalizePublicationRoute("legacy", url.pathname), candidate: P.PublicationRoute = { kind: "legacy", route, entryId, sourceUrl: origin.value.quellArtikelUrl };
          legacy.set(authoringJson(candidate), candidate);
        } catch { /* An unsupported source URL remains source evidence, not a redirect. */ }
      }
      const minted = (await tx.query<{ id: string; passage_id: string; revision_id: string; kind: P.PublicMintKind; confirmed_at: string }>(`SELECT m.id,m.passage_id,m.revision_id,m.kind,m.confirmed_at FROM confirmed_mints m JOIN passages p ON p.id=m.passage_id
        WHERE m.campaign_id=$1 AND p.entry_id=$2 ORDER BY m.confirmed_at DESC,m.id COLLATE "C" LIMIT 1001`, [campaignId, entryId])).rows;
      return { legacyRoutes: [...legacy].sort(([a], [b]) => a < b ? -1 : 1).map(([, route]) => route),
        mints: minted.slice(0, 1000).map(row => ({ mintId: row.id, passageId: row.passage_id, revisionId: row.revision_id, kind: row.kind, date: new Date(Number(row.confirmed_at)).toISOString().slice(0, 10) })),
        hasMoreMints: minted.length > 1000 };
    }),
    listRoutes: (userId: string, campaignId: string) => read(userId, campaignId, tx => routes(tx, campaignId)),
    addRoute: (userId: string, campaignId: string, input: unknown) => mutateRoute(userId, campaignId, input, false),
    removeRoute: (userId: string, campaignId: string, input: unknown) => mutateRoute(userId, campaignId, input, true),
  };
}

export async function publicTheme(tx: Db, campaignId: string, policy: P.PublicationPolicy): Promise<ThemeManifestV1> {
  // Deliberately independent of private campaign_theme_pins and all private heads.
  return policy.theme ? (await readTheme(tx, campaignId, policy.theme.themeId, policy.theme.revision)).manifest : getThemePreset("Fantasy");
}
export async function collectPublicationSources(tx: Db, campaignId: string): Promise<PublicEntrySource[]> {
  const rows = (await tx.query<EntryRow & { document: DocumentSnapshot }>(`SELECT p.*,e.public AS enabled,r.document FROM entry_publications p
    JOIN entries e ON e.id=p.entry_id AND e.campaign_id=p.campaign_id JOIN revisions r ON r.id=p.revision_id AND r.entry_id=p.entry_id
    WHERE p.campaign_id=$1 AND e.public=true`, [campaignId])).rows;
  return rows.map(row => ({ entryId: row.entry_id, publication: entryCard(row), document: row.document }));
}

interface SourceAttribution { status: "complete" | "incomplete"; value: { passageId: string; quellArtikelUrl: string; lizenz: string; autoren?: string[]; anonymeBeitraege?: number } }
async function acceptedSources(tx: Db, campaignId: string, entryId: string, revisionSeq?: number) {
  const rows = (await tx.query<{ source: { result: { provenance: SourceAttribution[]; passages: { pid: string; entryId: string }[] } } }>(`SELECT a.source FROM artifacts a JOIN import_acceptances i ON i.artifact_id=a.id
    JOIN revisions r ON r.id=i.revision_id AND r.entry_id=i.entry_id
    WHERE a.campaign_id=$1 AND i.entry_id=$2 AND a.kind='eron-preview' AND ($3::integer IS NULL OR r.seq<=$3) ORDER BY r.seq`, [campaignId, entryId, revisionSeq ?? null])).rows;
  return rows.map(row => {
    const ids = new Set(row.source.result.passages.filter(p => p.entryId === entryId).map(p => p.pid));
    return { source: { result: { provenance: row.source.result.provenance.filter(p => ids.has(p.value.passageId)) } } };
  });
}
async function verifyLegacySource(tx: Db, campaignId: string, entryId: string, sourceUrl: string, route: string): Promise<void> {
  let url: URL;
  try { url = new URL(sourceUrl); if (!["http:", "https:"].includes(url.protocol) || url.username || url.password || url.search || url.hash || normalizePublicationRoute("legacy", url.pathname) !== route) throw new Error(); }
  catch { throw new AuthoringValidationError("Eine alte Route benötigt eine belegte HTTP(S)-Quelladresse ohne Parameter."); }
  if (!(await acceptedSources(tx, campaignId, entryId)).some(row => row.source.result.provenance.some(p => p.value.quellArtikelUrl === sourceUrl))) throw new AuthoringValidationError("Diese Quelladresse ist für den Artikel nicht belegt.");
}
async function publicationMetadata(tx: Db, campaignId: string, entryId: string, revisionSeq: number, document: DocumentSnapshot, selected: Set<string>, contentWarnings: string[], mintIds: string[]): Promise<P.PublicationMetadata> {
  const ancestors = new Set(selected);
  const lineage = (await tx.query<{ event: { kind: string; parent?: string; children?: string[]; parents?: string[]; child?: string } }>(`SELECT l.event FROM lineage_events l JOIN revisions r ON r.id=l.revision_id
    WHERE l.entry_id=$1 AND r.seq<=$2 ORDER BY r.seq DESC,l.seq DESC`, [entryId, revisionSeq])).rows;
  for (const { event } of lineage) {
    if (event.kind === "split" && event.children?.some(id => ancestors.has(id)) && event.parent) ancestors.add(event.parent);
    if (event.kind === "merge" && event.child && ancestors.has(event.child)) for (const parent of event.parents ?? []) ancestors.add(parent);
  }
  const attributions = new Map<string, P.PublicAttribution>();
  // A later explicitly accepted assertion can complete earlier missing evidence.
  // Select it per origin atom at the pinned revision, preserving every old artifact
  // and excluding assertions accepted only after that historical publication cut.
  const assertions = new Map<string, SourceAttribution>();
  for (const artifact of await acceptedSources(tx, campaignId, entryId, revisionSeq)) for (const origin of artifact.source.result.provenance) if (ancestors.has(origin.value.passageId)) assertions.set(origin.value.passageId, origin);
  for (const origin of assertions.values()) {
    const p = origin.value;
    if (origin.status !== "complete" || !p.autoren || !Number.isInteger(p.anonymeBeitraege) || !p.lizenz || /unknown|unbekannt/i.test(p.lizenz)) throw new AuthoringValidationError("Für eine ausgewählte importierte Passage fehlen vollständige Quellen- oder Autorenangaben.");
    const attribution: P.PublicAttribution = { sourceUrl: p.quellArtikelUrl, license: p.lizenz, authors: sorted(p.autoren), anonymousContributions: p.anonymeBeitraege! };
    attributions.set(authoringJson(attribution), attribution);
  }
  const mints: P.PublicationMetadata["mints"] = [];
  for (const id of mintIds) {
    const mint = (await tx.query<{ id: string; passage_id: string; kind: P.PublicMintKind; confirmed_at: string; document: DocumentSnapshot; seq: number }>(`SELECT m.id,m.passage_id,m.kind,m.confirmed_at,r.document,r.seq FROM confirmed_mints m
      JOIN revisions r ON r.id=m.revision_id WHERE m.id=$1 AND m.campaign_id=$2 AND r.entry_id=$3`, [id, campaignId, entryId])).rows[0];
    const current = document.passagen.find(p => p.pid === mint?.passage_id), accepted = mint?.document.passagen.find(p => p.pid === mint.passage_id);
    if (!mint || !current || !accepted || !selected.has(mint.passage_id) || mint.seq > revisionSeq || authoringJson(current.inhalt) !== authoringJson(accepted.inhalt)) throw new AuthoringValidationError("Ein Mint-Verweis gehört nicht zum ausgewählten veröffentlichten Textstand.");
    mints.push({ mintId: id, passageId: mint.passage_id, date: new Date(Number(mint.confirmed_at)).toISOString().slice(0, 10), kind: mint.kind });
  }
  return { contentWarnings, attributions: [...attributions].sort(([a], [b]) => a < b ? -1 : 1).map(([, value]) => value), mints };
}
