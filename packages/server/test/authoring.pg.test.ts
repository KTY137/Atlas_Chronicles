// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2026 Kaya Yesilyurt - Atlas Chronicles. Siehe LICENSE.
import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createPgDb, migrate, type Db } from "../src/db/index.ts";
import { createIdentity } from "../src/identity/index.ts";
import { createCampaigns } from "../src/domain/campaigns.ts";
import { createDocuments } from "../src/domain/documents.ts";
import { createImports } from "../src/domain/imports.ts";
import { createAuthoring } from "../src/domain/authoring.ts";
import { createPublication, publicHash } from "../src/domain/public-projection.ts";
import { Conflict, Gone } from "../src/domain/errors.ts";

const connection = process.env["TEST_DATABASE_URL"], schema = `chronicle_authoring_${randomUUID().replaceAll("-", "")}`;
const config = { origin: "https://publication.test", cookieSecret: "publication-pg-test-cookie-secret-over-thirty-two-characters", now: () => 1788696000000 };
const paragraph = (text: string) => ({ inhalt: { kind: "absatz" as const, inhalt: [{ text, marks: [] }] } });
const configure = (expectedVersion = 0) => ({ commandId: randomUUID(), expectedVersion, enabled: true, worldSlug: "world", title: "Public world", description: "Shared", locale: "de" as const, contentWarnings: [], theme: null });
function deferred() { let resolve!: () => void; const promise = new Promise<void>(done => { resolve = done; }); return { promise, resolve }; }
describe.skipIf(!connection)("authoring transactions on PostgreSQL", () => {
  let db: Db, admin: Db, gm: string;
  beforeAll(async () => {
    admin = createPgDb(connection!); await admin.query(`CREATE SCHEMA "${schema}"`);
    const url = new URL(connection!); url.searchParams.set("options", `-c search_path=${schema} -c statement_timeout=15000`); url.searchParams.set("application_name", schema);
    db = createPgDb(url.href); await migrate(db); gm = (await createIdentity(db, config).bootstrap("Kaya")).userId;
  }, 30_000);
  afterAll(async () => { await db?.close(); if (admin) { if (!/^chronicle_authoring_[a-f0-9]{32}$/.test(schema)) throw new Error("Unexpected authoring test schema"); await admin.query(`DROP SCHEMA IF EXISTS "${schema}" CASCADE`); await admin.close(); } });
  async function fixture(imported = false) {
    const campaign = (await createCampaigns(db, config).createCampaign(gm, { name: "Private name" })).id, docs = createDocuments(db, config), domain = createAuthoring(db, config);
    let entry;
    if (imported) {
      const imports = createImports(db, config), preview = await imports.previewEron(gm, campaign, { articles: [{ title: "Original page", pageid: 1, ns: 0, revid: 1, wikitext: "This imported source paragraph is deliberately long enough to form an original source atom." }], templates: [], wikiUrl: "https://source.example/" });
      await imports.acceptEron(gm, campaign, preview.artifactId, preview.entries.map(e => e.id));
      const original = await docs.getEntry(gm, campaign, preview.entries[0]!.id);
      entry = await docs.saveEntry(gm, campaign, { title: "Newly authored article", expectedVersion: original.version!, passages: [paragraph("Neuer eigenständig verfasster Absatz.")] }, original.entryId);
    } else entry = await docs.saveEntry(gm, campaign, { title: "Shared title", passages: [paragraph("Shared"), paragraph("Private")] });
    await domain.configurePublication(gm, campaign, configure());
    const input = { commandId: randomUUID(), expectedArticleRevisionId: entry.revisionId!, expectedPublicationVersion: 0, expectedPolicyVersion: 1,
      passageIds: [entry.passagen[0]!.pid], publicSlug: "article", contentWarnings: [], mintIds: [] };
    return { campaign, docs, domain, entry, input };
  }
  it("admits exactly one concurrent publication of the same source and policy versions", async () => {
    const f = await fixture();
    const result = await Promise.allSettled([f.domain.publishEntry(gm, f.campaign, f.entry.entryId, f.input), f.domain.publishEntry(gm, f.campaign, f.entry.entryId,
      { ...f.input, commandId: randomUUID(), passageIds: [f.entry.passagen[1]!.pid] })]);
    expect(result.filter(r => r.status === "fulfilled")).toHaveLength(1);
    const rejected = result.find(r => r.status === "rejected") as PromiseRejectedResult; expect(rejected.reason).toBeInstanceOf(Conflict);
    expect((await db.query("SELECT 1 FROM authoring_events WHERE campaign_id=$1 AND operation='entry.publish'", [f.campaign])).rowCount).toBe(1);
  });
  it("reserves a legacy host path across two different campaign locks and rolls back the losing policy", async () => {
    const a = await fixture(true), b = await fixture(true);
    for (const f of [a, b]) await f.domain.publishEntry(gm, f.campaign, f.entry.entryId, f.input);
    const sources = await a.domain.publicationSources(gm, a.campaign, a.entry.entryId); expect(sources.legacyRoutes).toHaveLength(1);
    const route = sources.legacyRoutes[0]!;
    const result = await Promise.allSettled([a.domain.addRoute(gm, a.campaign, { ...route, commandId: randomUUID(), expectedPolicyVersion: 1 }),
      b.domain.addRoute(gm, b.campaign, { ...route, entryId: b.entry.entryId, commandId: randomUUID(), expectedPolicyVersion: 1 })]);
    expect(result.filter(r => r.status === "fulfilled")).toHaveLength(1);
    const rejected = result.find(r => r.status === "rejected") as PromiseRejectedResult; expect(rejected.reason).toBeInstanceOf(Conflict);
    expect((await db.query("SELECT 1 FROM publication_routes WHERE kind='legacy' AND route=$1", [route.route])).rowCount).toBe(1);
    expect((await Promise.all([a.domain.getPublication(gm, a.campaign), b.domain.getPublication(gm, b.campaign)])).map(p => p!.version).sort()).toEqual([1, 2]);
    const location = await createPublication(db, { ...config, publicDeliveryEnabled: true }).resolveLegacy(route.route, value => value);
    expect(location).toMatch(/^\/w\/[^/]+\/world\/article$/);
  });
  it("orders rendering before a waiting unpublish and refuses all later delivery", async () => {
    const f = await fixture(); await f.domain.publishEntry(gm, f.campaign, f.entry.entryId, f.input);
    const policy = (await f.domain.getPublication(gm, f.campaign))!, delivery = createPublication(db, { ...config, publicDeliveryEnabled: true }), entered = deferred(), release = deferred();
    const rendering = delivery.withWorld(policy.publicKey, async world => { entered.resolve(); await release.promise; return publicHash(world); });
    await entered.promise;
    const unpublish = f.domain.configurePublication(gm, f.campaign, { ...configure(1), enabled: false });
    try {
      let waiting = false;
      for (let i = 0; i < 100 && !waiting; i++) {
        waiting = (await admin.query<{ waiting: boolean }>("SELECT EXISTS(SELECT 1 FROM pg_stat_activity WHERE application_name=$1 AND wait_event_type='Lock') AS waiting", [schema])).rows[0]!.waiting;
        if (!waiting) await new Promise(resolve => setTimeout(resolve, 5));
      }
      expect(waiting).toBe(true);
    } finally { release.resolve(); }
    expect(await rendering).toMatch(/^[a-f0-9]{64}$/); await unpublish;
    await expect(delivery.getWorld(policy.publicKey)).rejects.toBeInstanceOf(Gone);
  });
});
