// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2026 Kaya Yesilyurt - Atlas Chronicles. Siehe LICENSE.
import { randomUUID } from "node:crypto";
import Fastify, { type FastifyInstance } from "fastify";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createTestDb, migrate, type Db } from "../src/db/index.ts";
import { createIdentity } from "../src/identity/index.ts";
import { createCampaigns } from "../src/domain/campaigns.ts";
import { createDocuments } from "../src/domain/documents.ts";
import { createGameplay } from "../src/domain/gameplay.ts";
import { Gone, Conflict } from "../src/domain/errors.ts";
import { registerAuthoring } from "../src/http/authoring.ts";
import { registerPublication } from "../src/http/publication.ts";
import { registerImports } from "../src/http/imports.ts";
import { ImportValidationError } from "@chronicle/io";
import { getThemePreset, HIGH_CONTRAST_COLORS, evaluateThemeAccessibility, THEME_PRESET_IDS } from "@chronicle/theme";

const config = { origin: "https://publication.test", cookieSecret: "publication-http-test-cookie-secret-over-thirty-two-characters", now: () => 1788696000000 };
const paragraph = (text: string) => ({ inhalt: { kind: "absatz" as const, inhalt: [{ text, marks: [] }] } });
describe("public HTTP uses the explicit projection", () => {
  let db: Db, app: FastifyInstance, disabled: FastifyInstance, gm: string, cookie: string;
  beforeAll(async () => {
    db = await createTestDb(); await migrate(db); const identity = await createIdentity(db, config).bootstrap("Kaya"); gm = identity.userId; cookie = identity.setCookie.split(";")[0]!;
    function application(enabled: boolean) {
      const server = Fastify({ ajv: { customOptions: { removeAdditional: false, useDefaults: false, coerceTypes: false } } });
      server.setErrorHandler((error, _req, reply) => error instanceof Gone ? reply.code(404).send({ error: "Nicht verfügbar" }) : error instanceof Conflict ? reply.code(409).send({ error: "Konflikt" }) : reply.code(error instanceof ImportValidationError ? 400 : (error as { statusCode?: number }).statusCode ?? 500).send({ error: error instanceof Error ? error.message : "Fehler" }));
      registerAuthoring(server, db, { ...config, publicDeliveryEnabled: enabled }); registerPublication(server, db, { ...config, publicDeliveryEnabled: enabled }); return server;
    }
    app = application(true); disabled = application(false); registerImports(app, db, { ...config, bootstrapToken: "unused-focused-test-bootstrap" }); await app.ready(); await disabled.ready();
  }, 30_000);
  afterAll(async () => { await app?.close(); await disabled?.close(); await db?.close(); });
  async function fixture() {
    const campaign = (await createCampaigns(db, config).createCampaign(gm, { name: "Unpublished campaign name" })).id;
    const docs = createDocuments(db, config), entry = await docs.saveEntry(gm, campaign, { title: "Published title", passages: [paragraph("Public text <script>danger()</script>"), paragraph("HIDDEN-PASSAGE")] });
    const base = `/api/campaigns/${campaign}`;
    const configured = await app.inject({ method: "PUT", url: `${base}/publication`, headers: { cookie }, payload: { commandId: randomUUID(), expectedVersion: 0, enabled: true, worldSlug: "world", title: "Public world", description: "Public description", locale: "de", contentWarnings: ["Public warning"], theme: null } });
    expect(configured.statusCode).toBe(200);
    const policy = (await app.inject({ url: `${base}/publication`, headers: { cookie } })).json().policy;
    const payload = { expectedArticleRevisionId: entry.revisionId!, expectedPublicationVersion: 0, expectedPolicyVersion: 1, passageIds: [entry.passagen[0]!.pid], publicSlug: "article", contentWarnings: [], mintIds: [] };
    return { campaign, docs, entry, base, policy, payload };
  }
  async function publish(f: Awaited<ReturnType<typeof fixture>>) {
    const response = await app.inject({ method: "PUT", url: `${f.base}/entries/${f.entry.entryId}/publication`, headers: { cookie }, payload: { ...f.payload, commandId: randomUUID() } });
    expect(response.statusCode).toBe(200); return response;
  }
  it("performs a real HTTP publish and serves the exact preview through every public output", async () => {
    const f = await fixture();
    const preview = await app.inject({ method: "POST", url: `${f.base}/entries/${f.entry.entryId}/publication/preview`, headers: { cookie }, payload: f.payload });
    expect(preview.statusCode).toBe(200); await publish(f);
    const path = `/w/${f.policy.publicKey}/world/article`, anonymous = await app.inject(path), authenticated = await app.inject({ url: path, headers: { cookie } });
    expect(anonymous.statusCode).toBe(200); expect(anonymous.body).toBe(preview.json().html); expect(authenticated.body).toBe(anonymous.body);
    expect(anonymous.body).toContain("&lt;script&gt;danger()&lt;/script&gt;"); expect(anonymous.body).not.toContain("<script>");
    expect(anonymous.body).toContain('rel="canonical"'); expect(anonymous.body).toContain('lang="de"'); expect(anonymous.body).toContain('href="#content"');
    const outputs = ["world.json", "entries/article", "search?q=Public", "backlinks/article", "feed.json", "sitemap.xml", "robots.txt", "social.svg?article=article"];
    for (const output of outputs) {
      const result = await app.inject(`/public/${f.policy.publicKey}/${output}`);
      expect(result.statusCode, output).toBe(200); expect(result.headers["cache-control"]).toBe("no-store");
      expect(result.body, output).not.toMatch(/HIDDEN-PASSAGE|Unpublished campaign name|current_revision_id|actorUserId|assetId/);
      expect(result.body, output).not.toContain(f.entry.entryId); expect(result.body, output).not.toContain(f.entry.revisionId!);
    }
    expect((await app.inject(`/public/${f.policy.publicKey}/search?q=HIDDEN-PASSAGE`)).json()).toEqual({ count: 0, results: [] });
  });
  it("keeps JSON, HTML, search/feed metadata and social SVG bytes unchanged by private mutations", async () => {
    const f = await fixture(); await publish(f);
    const urls = [`/w/${f.policy.publicKey}/world/article`, ...["world.json", "entries/article", "search", "feed.json", "sitemap.xml", "social.svg?article=article"].map(path => `/public/${f.policy.publicKey}/${path}`)];
    const before = await Promise.all(urls.map(async url => { const r = await app.inject(url); return { body: r.body, etag: r.headers.etag }; }));
    await f.docs.saveEntry(gm, f.campaign, { title: "Private rename", slug: "private-rename", expectedVersion: f.entry.version!, passages: [{ ...paragraph("Private replacement"), pid: f.entry.passagen[0]!.pid }, paragraph("Another hidden PID")] }, f.entry.entryId);
    const theme = await app.inject({ method: "POST", url: `${f.base}/themes`, headers: { cookie }, payload: { commandId: randomUUID(), manifest: getThemePreset("PixelArt") } });
    expect(theme.statusCode).toBe(200);
    expect((await app.inject({ method: "PUT", url: `${f.base}/theme-pin`, headers: { cookie }, payload: { commandId: randomUUID(), expectedVersion: 0, themeId: theme.json().subjectId, revision: 1 } })).statusCode).toBe(200);
    const after = await Promise.all(urls.map(async url => { const r = await app.inject(url); return { body: r.body, etag: r.headers.etag }; })); expect(after).toEqual(before);
  });
  it("renders the explicit public theme typography and geometry while honoring operating-system accessibility", async () => {
    const f = await fixture(); await publish(f);
    let policyVersion = 1;
    for (const preset of THEME_PRESET_IDS) {
      const manifest = getThemePreset(preset);
      const created = await app.inject({ method: "POST", url: `${f.base}/themes`, headers: { cookie }, payload: { commandId: randomUUID(), manifest } });
      expect(created.statusCode).toBe(200);
      const policy = await app.inject({ method: "PUT", url: `${f.base}/publication`, headers: { cookie }, payload: { commandId: randomUUID(), expectedVersion: policyVersion++, enabled: true, worldSlug: "world", title: "Public world", description: "Public description", locale: "de", contentWarnings: [], theme: { themeId: created.json().subjectId, revision: 1 } } });
      expect(policy.statusCode).toBe(200);
      const html = (await app.inject(`/w/${f.policy.publicKey}/world/article`)).body;
      expect(html).toContain(`--space:${manifest.geometry.spacing}px`); expect(html).toContain(`--radius:${manifest.geometry.radius}px`);
      expect(html).toContain(`data-edges="${manifest.geometry.edges}"`);
      expect(html).toContain(`image-rendering:${manifest.sampling === "nearest" ? "pixelated" : "auto"}`);
      expect(html).toContain("font-family:var(--font-display)"); expect(html).toContain("font-family:var(--font-body)");
      // Aus dem Manifest abgeleitet, nicht aus einer Liste von Presetnamen: sonst muss diese
      // Zeile bei jedem neuen Look nachgezogen werden und prueft am Ende nur noch sich selbst.
      const erwarteteLeseschrift = { cinzel: "Georgia", serif: "Georgia", mono: "ui-monospace", plex: "system-ui", system: "system-ui" }[manifest.typography.body];
      expect(html).toContain(`--font-body:${erwarteteLeseschrift}`);
      expect(html).toContain("@media(prefers-contrast:more)"); expect(html).toContain(`--bg:${HIGH_CONTRAST_COLORS.bg}`);
      expect(html).toContain("@media(forced-colors:active)"); expect(html).toContain("forced-color-adjust:auto");
      expect(html).toContain("transition:none!important"); expect(html).not.toMatch(/@font-face|url\(https?:/);
      const revised = await app.inject({ method: "PUT", url: `${f.base}/themes/${created.json().subjectId}`, headers: { cookie }, payload: { commandId: randomUUID(), expectedVersion: 1, manifest: { ...manifest, name: "Private later head" } } });
      expect(revised.statusCode).toBe(200);
      expect((await app.inject(`/w/${f.policy.publicKey}/world/article`)).body).toBe(html);
    }
    expect(evaluateThemeAccessibility({ ...getThemePreset("Fantasy"), colors: HIGH_CONTRAST_COLORS }).passes).toBe(true);
  });
  it("serves the declared JSON Feed format without deriving an update time from private state", async () => {
    const f = await fixture(); await publish(f);
    const response = await app.inject(`/public/${f.policy.publicKey}/feed.json`), feed = response.json();
    expect(response.headers["content-type"]).toContain("application/feed+json");
    expect(feed).toMatchObject({ version: "https://jsonfeed.org/version/1.1", title: "Public world", items: [], home_page_url: `https://publication.test/w/${f.policy.publicKey}/world` });
    expect(feed).not.toHaveProperty("updated"); expect(feed).not.toHaveProperty("date_modified");
  });
  it("publishes only explicitly selected matching mints and returns GM-only source choices", async () => {
    const f = await fixture(), game = createGameplay(db, config);
    const minted = await game.mintGesprochen(gm, f.campaign, { commandId: randomUUID(), passageId: f.entry.passagen[0]!.pid, fictionDate: "SECRET-FICTION-DATE" });
    const choicesUrl = `${f.base}/entries/${f.entry.entryId}/publication/sources`;
    expect((await app.inject(choicesUrl)).statusCode).toBe(404);
    const choices = (await app.inject({ url: choicesUrl, headers: { cookie } })).json();
    expect(choices).toEqual({ legacyRoutes: [], mints: [{ mintId: minted.id, passageId: minted.passageId, revisionId: minted.revisionId, kind: "gesprochen", date: "2026-09-06" }], hasMoreMints: false });
    const payload = { ...f.payload, expectedArticleRevisionId: minted.revisionId, mintIds: [minted.id], commandId: randomUUID() };
    expect((await app.inject({ method: "PUT", url: `${f.base}/entries/${f.entry.entryId}/publication`, headers: { cookie }, payload })).statusCode).toBe(200);
    const url = `/public/${f.policy.publicKey}/feed.json`, before = await app.inject(url), feed = before.json();
    expect(feed.items).toHaveLength(1); expect(feed.items[0]).toMatchObject({ title: "Published title", content_text: "Public text <script>danger()</script>", _chronicle: { date: "2026-09-06", kind: "gesprochen" } });
    expect(feed.items[0].id).toMatch(/^[a-f0-9]{64}$/); expect(feed.items[0].url).toMatch(/^https:\/\/publication.test\/w\/[^/]+\/world\/article#passage-1$/);
    expect(before.body).not.toMatch(/SECRET-FICTION-DATE|userId|actorId|seal|provenance|date_published/); expect(before.body).not.toContain(minted.id);
    const hidden = await game.mintGesprochen(gm, f.campaign, { commandId: randomUUID(), passageId: f.entry.passagen[1]!.pid, fictionDate: "HIDDEN-MINT" });
    const after = await app.inject(url); expect(after.body).toBe(before.body); expect(after.headers.etag).toBe(before.headers.etag);
    const rejected = await app.inject({ method: "PUT", url: `${f.base}/entries/${f.entry.entryId}/publication`, headers: { cookie }, payload: { ...payload, commandId: randomUUID(), expectedArticleRevisionId: hidden.revisionId, expectedPublicationVersion: 1, mintIds: [hidden.id] } });
    expect(rejected.statusCode).toBe(400); expect((await app.inject(url)).body).toBe(before.body);
  });
  it("returns no old body or conditional 304 after unpublish, including aliases and social cards", async () => {
    const f = await fixture(); await publish(f);
    const path = `/w/${f.policy.publicKey}/world/article`, before = await app.inject(path);
    const unpublished = await app.inject({ method: "POST", url: `${f.base}/entries/${f.entry.entryId}/publication/unpublish`, headers: { cookie }, payload: { commandId: randomUUID(), expectedArticleRevisionId: f.entry.revisionId!, expectedPublicationVersion: 1, expectedPolicyVersion: 1 } });
    expect(unpublished.statusCode).toBe(200);
    for (const url of [path, `/public/${f.policy.publicKey}/entries/article`, `/public/${f.policy.publicKey}/social.svg?article=article`]) {
      const result = await app.inject({ url, headers: { "if-none-match": before.headers.etag! } }); expect(result.statusCode).toBe(404); expect(result.body).not.toContain("Public text");
    }
    expect((await app.inject(`/public/${f.policy.publicKey}/feed.json`)).json().items).toEqual([]);
  });
  it("requires authenticated authoring while keeping the local delivery gate off by default", async () => {
    const f = await fixture(); await publish(f);
    expect((await app.inject({ method: "PUT", url: `${f.base}/entries/${f.entry.entryId}/publication`, payload: { ...f.payload, commandId: randomUUID() } })).statusCode).toBe(404);
    for (const key of [f.policy.publicKey, "unknown"]) expect((await disabled.inject(`/public/${key}/world.json`)).statusCode).toBe(404);
    expect((await disabled.inject("/robots.txt")).body).toContain("Disallow: /");
  });
  it("imports complete author-history assertions over HTTP, accepts them and publishes the credited selection", async () => {
    const f = await fixture(), payload = { articles: [{ title: "Original source", pageid: 1, ns: 0, revid: 1, wikitext: "This is a complete original source paragraph with the author history explicitly supplied for publication." }], templates: [], wikiUrl: "https://source.example/", license: "CC-BY-SA-3.0",
      attributionByPageId: { "1": { complete: true, authors: ["Ada", "Zora"], anonymousContributions: 2, revisionSha1: "abc123" } } };
    const preview = await app.inject({ method: "POST", url: `${f.base}/imports/eron`, headers: { cookie }, payload });
    expect(preview.statusCode).toBe(200); expect(preview.json().attributionComplete).toBe(true);
    const entryId = preview.json().entries[0].id;
    expect((await app.inject({ method: "POST", url: `${f.base}/imports/${preview.json().artifactId}/accept`, headers: { cookie }, payload: { entryIds: [entryId] } })).statusCode).toBe(200);
    const entry = await f.docs.getEntry(gm, f.campaign, entryId), sources = await app.inject({ url: `${f.base}/entries/${entryId}/publication/sources`, headers: { cookie } });
    expect(sources.json().legacyRoutes).toEqual([{ kind: "legacy", route: "/wiki/Original_source", entryId, sourceUrl: "https://source.example/wiki/Original_source" }]);
    const published = await app.inject({ method: "PUT", url: `${f.base}/entries/${entryId}/publication`, headers: { cookie }, payload: { ...f.payload, commandId: randomUUID(), expectedArticleRevisionId: entry.revisionId!, passageIds: entry.passagen.map(p => p.pid), publicSlug: "original" } });
    expect(published.statusCode).toBe(200);
    const html = await app.inject(`/w/${f.policy.publicKey}/world/original`); expect(html.statusCode).toBe(200); expect(html.body).toContain("Ada, Zora"); expect(html.body).toContain("2 anonyme Beiträge"); expect(html.body).toContain("CC-BY-SA-3.0");
    expect((await app.inject({ method: "POST", url: `${f.base}/publication/routes`, headers: { cookie }, payload: { ...sources.json().legacyRoutes[0], commandId: randomUUID(), expectedPolicyVersion: 1 } })).statusCode).toBe(200);
    expect((await app.inject("/wiki/Original_source")).headers.location).toBe(`/w/${f.policy.publicKey}/world/original`);
  });
  it("never invents missing authors and bounds the optional attribution upload", async () => {
    const f = await fixture(), base = { articles: [{ title: "Incomplete source", pageid: 1, ns: 0, revid: 1, wikitext: "This is an original source paragraph whose author history has deliberately not been supplied here." }], templates: [], wikiUrl: "https://source.example/", license: "CC-BY-SA-3.0" };
    const preview = await app.inject({ method: "POST", url: `${f.base}/imports/eron`, headers: { cookie }, payload: base });
    expect(preview.statusCode).toBe(200); expect(preview.json().attributionComplete).toBe(false);
    const entryId = preview.json().entries[0].id;
    expect((await app.inject({ method: "POST", url: `${f.base}/imports/${preview.json().artifactId}/accept`, headers: { cookie }, payload: { entryIds: [entryId] } })).statusCode).toBe(200);
    const entry = await f.docs.getEntry(gm, f.campaign, entryId);
    expect((await app.inject({ method: "PUT", url: `${f.base}/entries/${entryId}/publication`, headers: { cookie }, payload: { ...f.payload, commandId: randomUUID(), expectedArticleRevisionId: entry.revisionId!, passageIds: entry.passagen.map(p => p.pid) } })).statusCode).toBe(400);
    for (const assertion of [ { complete: false, authors: ["Ada"], anonymousContributions: 0, revisionSha1: "abc" }, { complete: true, authors: [], anonymousContributions: 0, revisionSha1: "abc" }, { complete: true, authors: ["x".repeat(513)], anonymousContributions: 0, revisionSha1: "abc" }, { complete: true, authors: Array(5000).fill("x".repeat(512)), anonymousContributions: 0, revisionSha1: "abc" } ]) {
      const result = await app.inject({ method: "POST", url: `${f.base}/imports/eron`, headers: { cookie }, payload: { ...base, attributionByPageId: { "1": assertion } } });
      expect(result.statusCode).toBe(400);
    }
    expect((await db.query("SELECT 1 FROM artifacts WHERE campaign_id=$1", [f.campaign])).rowCount).toBe(1);
  });
  it("preserves distinct original language-prefixed Wiki paths on the local host", async () => {
    const locations: string[] = [];
    for (const locale of ["de", "en"]) {
      const f = await fixture(), payload = { articles: [{ title: "Original", pageid: 1, ns: 0, revid: 1, wikitext: "This original source paragraph comes with complete attribution and a language-specific original path." }], templates: [], wikiUrl: `https://source.example/${locale}/`, attributionByPageId: { "1": { complete: true, authors: ["Ada"], anonymousContributions: 0, revisionSha1: "abc" } } };
      const preview = await app.inject({ method: "POST", url: `${f.base}/imports/eron`, headers: { cookie }, payload }); expect(preview.statusCode).toBe(200);
      const entryId = preview.json().entries[0].id;
      expect((await app.inject({ method: "POST", url: `${f.base}/imports/${preview.json().artifactId}/accept`, headers: { cookie }, payload: { entryIds: [entryId] } })).statusCode).toBe(200);
      const entry = await f.docs.getEntry(gm, f.campaign, entryId), choices = (await app.inject({ url: `${f.base}/entries/${entryId}/publication/sources`, headers: { cookie } })).json();
      expect(choices.legacyRoutes).toEqual([{ kind: "legacy", route: `/${locale}/wiki/Original`, entryId, sourceUrl: `https://source.example/${locale}/wiki/Original` }]);
      expect((await app.inject({ method: "PUT", url: `${f.base}/entries/${entryId}/publication`, headers: { cookie }, payload: { ...f.payload, commandId: randomUUID(), expectedArticleRevisionId: entry.revisionId!, passageIds: entry.passagen.map(p => p.pid) } })).statusCode).toBe(200);
      expect((await app.inject({ method: "POST", url: `${f.base}/publication/routes`, headers: { cookie }, payload: { ...choices.legacyRoutes[0], route: `/${locale.toUpperCase()}/wiki/Original`, commandId: randomUUID(), expectedPolicyVersion: 1 } })).statusCode).toBe(200);
      const response = await app.inject(`/${locale}/wiki/Original`); expect(response.statusCode).toBe(302); locations.push(response.headers.location!);
      expect((await app.inject(`/${locale.toUpperCase()}/wiki/Original`)).headers.location).toBe(response.headers.location);
    }
    expect(new Set(locations).size).toBe(2);
    expect((await app.inject("/invalid/wiki/Original")).statusCode).toBe(404);
  });
});
