// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2026 Kaya Yesilyurt - Atlas Chronicles. Siehe LICENSE.
import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createTestDb, migrate, type Db } from "../src/db/index.ts";
import { createIdentity } from "../src/identity/index.ts";
import { createCampaigns } from "../src/domain/campaigns.ts";
import { createDocuments } from "../src/domain/documents.ts";
import { createImports } from "../src/domain/imports.ts";
import { createAuthoring } from "../src/domain/authoring.ts";
import { createPublication, publicHtml } from "../src/domain/public-projection.ts";
import { getThemePreset, THEME_PRESET_IDS } from "@chronicle/theme";
import { authoringHash, checkedTheme } from "../src/domain/authoring.ts";
import { Conflict, Gone } from "../src/domain/errors.ts";
import { createCommunication } from "../src/domain/communication.ts";
import { seedActorControl } from "./actor-fixtures.ts";

const config = { origin: "https://publication.test", cookieSecret: "publication-test-cookie-secret-over-thirty-two-characters", now: () => 1788696000000 };
const paragraph = (text: string) => ({ inhalt: { kind: "absatz" as const, inhalt: [{ text, marks: [] }] } });
const configure = (expectedVersion = 0) => ({ commandId: randomUUID(), expectedVersion, enabled: true, worldSlug: "world", title: "Public world", description: "A shared world", locale: "de" as const, contentWarnings: [], theme: null });
describe("explicit native authoring", () => {
  let db: Db, gm: string;
  beforeAll(async () => { db = await createTestDb(); await migrate(db); gm = (await createIdentity(db, config).bootstrap("Kaya")).userId; }, 30_000);
  afterAll(async () => { await db?.close(); });
  async function fixture() {
    const campaign = (await createCampaigns(db, config).createCampaign(gm, { name: "Private campaign" })).id;
    const docs = createDocuments(db, config), domain = createAuthoring(db, config), delivery = createPublication(db, { ...config, publicDeliveryEnabled: true });
    const entry = await docs.saveEntry(gm, campaign, { title: "Shared article", passages: [paragraph("Visible"), paragraph("Secret")] });
    await domain.configurePublication(gm, campaign, configure());
    const command = { commandId: randomUUID(), expectedArticleRevisionId: entry.revisionId!, expectedPublicationVersion: 0, expectedPolicyVersion: 1,
      passageIds: [entry.passagen[0]!.pid], publicSlug: "article", contentWarnings: [], mintIds: [] };
    return { campaign, docs, domain, delivery, entry, command };
  }
  it("actually publishes a selected immutable article revision through the migrated SQL", async () => {
    const campaign = (await createCampaigns(db, config).createCampaign(gm, { name: "Private name" })).id;
    const entry = await createDocuments(db, config).saveEntry(gm, campaign, { title: "Shared article", passages: [paragraph("Visible passage"), paragraph("Private passage")] });
    const authoring = createAuthoring(db, config);
    await authoring.configurePublication(gm, campaign, configure());
    const command = { commandId: randomUUID(), expectedArticleRevisionId: entry.revisionId!, expectedPublicationVersion: 0, expectedPolicyVersion: 1,
      passageIds: [entry.passagen[0]!.pid], publicSlug: "article", contentWarnings: [], mintIds: [] };
    const ack = await authoring.publishEntry(gm, campaign, entry.entryId, command);
    expect(ack).toEqual({ subjectId: entry.entryId, version: 1 });
    const policy = (await authoring.getPublication(gm, campaign))!;
    const world = await createPublication(db, { ...config, publicDeliveryEnabled: true }).getWorld(policy.publicKey);
    expect(world.entries[0]!.passages).toHaveLength(1);
    expect(JSON.stringify(world)).toContain("Visible passage"); expect(JSON.stringify(world)).not.toContain("Private passage");
    expect(await authoring.publishEntry(gm, campaign, entry.entryId, command)).toEqual(ack);
  });
  it("saves all four presets with exact deterministic reports and preserves an older campaign pin", async () => {
    const { campaign, domain } = await fixture();
    for (const preset of THEME_PRESET_IDS) {
      const manifest = getThemePreset(preset), ack = await domain.createTheme(gm, campaign, { commandId: randomUUID(), manifest });
      const card = await domain.getTheme(gm, campaign, ack.subjectId);
      expect(card.accessibilityReport).toEqual(checkedTheme(manifest).report);
      expect(card.contentHash).toBe(authoringHash(manifest));
    }
    const first = (await domain.listThemes(gm, campaign))[0]!;
    await domain.pinTheme(gm, campaign, { commandId: randomUUID(), expectedVersion: 0, themeId: first.id, revision: 1 });
    await domain.reviseTheme(gm, campaign, first.id, { commandId: randomUUID(), expectedVersion: 1, manifest: { ...first.manifest, name: "Later private revision" } });
    expect((await domain.getThemePin(gm, campaign)).manifest).toEqual(first.manifest);
    expect((await domain.getTheme(gm, campaign, first.id)).revision).toBe(2);
    await expect(db.query("UPDATE theme_preset_revisions SET content_hash=$2 WHERE theme_id=$1", [first.id, "a".repeat(64)])).rejects.toThrow(/append-only/);
  });
  it("allows an invalid-contrast preview but refuses to persist or pin it", async () => {
    const { campaign, domain } = await fixture(), base = getThemePreset("Fantasy"), manifest = { ...base, colors: { ...base.colors, text: base.colors.bg } };
    expect((await domain.previewTheme(gm, campaign, { manifest })).accessibilityReport.passes).toBe(false);
    await expect(domain.createTheme(gm, campaign, { commandId: randomUUID(), manifest })).rejects.toThrow(/Kontraste/);
    expect(await domain.listThemes(gm, campaign)).toEqual([]);
  });
  it("preserves public bytes through private revision/rename and private theme head/pin changes", async () => {
    const f = await fixture(); await f.domain.publishEntry(gm, f.campaign, f.entry.entryId, f.command);
    const policy = (await f.domain.getPublication(gm, f.campaign))!, before = await f.delivery.getWorld(policy.publicKey);
    await f.docs.saveEntry(gm, f.campaign, { title: "Secret rename", slug: "secret-slug", expectedVersion: f.entry.version!, passages: [
      { ...paragraph("Private replacement of the published PID"), pid: f.entry.passagen[0]!.pid }, paragraph("Another secret") ] }, f.entry.entryId);
    const theme = await f.domain.createTheme(gm, f.campaign, { commandId: randomUUID(), manifest: getThemePreset("PixelArt") });
    await f.domain.pinTheme(gm, f.campaign, { commandId: randomUUID(), expectedVersion: 0, themeId: theme.subjectId, revision: 1 });
    await f.domain.reviseTheme(gm, f.campaign, theme.subjectId, { commandId: randomUUID(), expectedVersion: 1, manifest: { ...getThemePreset("PixelArt"), name: "Private theme name" } });
    expect(await f.delivery.getWorld(policy.publicKey)).toEqual(before);
  });
  it("checks every publish CAS independently and preserves one winner from competing selections", async () => {
    const f = await fixture();
    await expect(f.domain.publishEntry(gm, f.campaign, f.entry.entryId, { ...f.command, expectedArticleRevisionId: "stale" })).rejects.toBeInstanceOf(Conflict);
    await expect(f.domain.publishEntry(gm, f.campaign, f.entry.entryId, { ...f.command, expectedPublicationVersion: 1 })).rejects.toBeInstanceOf(Conflict);
    await expect(f.domain.publishEntry(gm, f.campaign, f.entry.entryId, { ...f.command, expectedPolicyVersion: 2 })).rejects.toBeInstanceOf(Conflict);
    const outcomes = await Promise.allSettled([f.domain.publishEntry(gm, f.campaign, f.entry.entryId, f.command),
      f.domain.publishEntry(gm, f.campaign, f.entry.entryId, { ...f.command, commandId: randomUUID(), passageIds: [f.entry.passagen[1]!.pid] })]);
    expect(outcomes.filter(result => result.status === "fulfilled")).toHaveLength(1);
    expect(outcomes.filter(result => result.status === "rejected")).toHaveLength(1);
  });
  it("checks current GM membership before acknowledging an old accepted command", async () => {
    const f = await fixture(); await f.domain.publishEntry(gm, f.campaign, f.entry.entryId, f.command);
    await db.query("UPDATE campaign_memberships SET role='beobachter' WHERE campaign_id=$1 AND user_id=$2", [f.campaign, gm]);
    await expect(f.domain.publishEntry(gm, f.campaign, f.entry.entryId, f.command)).rejects.toBeInstanceOf(Gone);
  });
  it("keeps old names as direct aliases and disables every route after entry unpublish", async () => {
    const f = await fixture(); await f.domain.publishEntry(gm, f.campaign, f.entry.entryId, f.command);
    await f.domain.configurePublication(gm, f.campaign, { ...configure(1), worldSlug: "renamed-world" });
    await f.domain.publishEntry(gm, f.campaign, f.entry.entryId, { ...f.command, commandId: randomUUID(), expectedPublicationVersion: 1, expectedPolicyVersion: 2, publicSlug: "renamed-article" });
    const policy = (await f.domain.getPublication(gm, f.campaign))!;
    expect(await f.delivery.canonicalRoute(policy.publicKey, "world", "article", (_world, _entry, redirect) => redirect)).toBe(`/w/${policy.publicKey}/renamed-world/renamed-article`);
    await f.domain.unpublishEntry(gm, f.campaign, f.entry.entryId, { commandId: randomUUID(), expectedArticleRevisionId: f.entry.revisionId!, expectedPublicationVersion: 2, expectedPolicyVersion: 2 });
    expect(await f.domain.getEntryPublication(gm, f.campaign, f.entry.entryId)).toMatchObject({ enabled: false, version: 3, revisionId: f.entry.revisionId });
    await expect(f.delivery.canonicalRoute(policy.publicKey, "world", "article", () => null)).rejects.toBeInstanceOf(Gone);
  });
  it("does not turn an old article public bit into a publication or enable delivery implicitly", async () => {
    const f = await fixture(), policy = (await f.domain.getPublication(gm, f.campaign))!;
    await db.query("UPDATE entries SET public=true WHERE id=$1", [f.entry.entryId]);
    expect((await f.delivery.getWorld(policy.publicKey)).entries).toEqual([]);
    await expect(createPublication(db, config).getWorld(policy.publicKey)).rejects.toBeInstanceOf(Gone);
    await expect(createPublication(db, config).getWorld("unknown")).rejects.toBeInstanceOf(Gone);
  });
  it("stores verifiable request preimages and rolls back a cross-campaign command collision", async () => {
    const a = await fixture(), b = await fixture();
    const original = await a.domain.publishEntry(gm, a.campaign, a.entry.entryId, a.command);
    await expect(b.domain.publishEntry(gm, b.campaign, b.entry.entryId, { ...b.command, commandId: a.command.commandId })).rejects.toBeInstanceOf(Conflict);
    expect(await b.domain.getEntryPublication(gm, b.campaign, b.entry.entryId)).toBeNull();
    const event = (await db.query<{ request: unknown; request_hash: string; ack: unknown }>("SELECT request,request_hash,ack FROM authoring_events WHERE command_id=$1", [a.command.commandId])).rows[0]!;
    expect(event.request_hash).toBe(authoringHash(event.request)); expect(event.ack).toEqual(original);
    await expect(db.query("DELETE FROM authoring_events WHERE command_id=$1", [a.command.commandId])).rejects.toThrow(/append-only/);
  });
  it("invalidates a player for an explicit theme pin, while draft/publication changes remain GM-only", async () => {
    const f = await fixture(), player = randomUUID(), actor = randomUUID(), communication = createCommunication(db, config);
    await db.query("INSERT INTO users(id,display_name,created_at) VALUES($1,'Sera',1)", [player]);
    await db.query("INSERT INTO actors(id,campaign_id,user_id,name) VALUES($1,$2,$3,'Sera')", [actor, f.campaign, player]);
    await db.query("INSERT INTO campaign_memberships(campaign_id,user_id,role,display_name,name_skeleton,actor_id) VALUES($1,$2,'spieler','Sera','sera',$3)", [f.campaign, player, actor]);
    await seedActorControl(db, f.campaign, actor, player);
    const beforePlayer = await communication.projectedFingerprint(player, f.campaign), beforeGm = await communication.projectedFingerprint(gm, f.campaign);
    const theme = await f.domain.createTheme(gm, f.campaign, { commandId: randomUUID(), manifest: getThemePreset("Fantasy") });
    expect(await communication.projectedFingerprint(player, f.campaign)).toBe(beforePlayer);
    const draftedGm = await communication.projectedFingerprint(gm, f.campaign); expect(draftedGm).not.toBe(beforeGm);
    await f.domain.publishEntry(gm, f.campaign, f.entry.entryId, f.command);
    expect(await communication.projectedFingerprint(player, f.campaign)).toBe(beforePlayer);
    expect(await communication.projectedFingerprint(gm, f.campaign)).not.toBe(draftedGm);
    await f.domain.pinTheme(gm, f.campaign, { commandId: randomUUID(), expectedVersion: 0, themeId: theme.subjectId, revision: 1 });
    expect(await communication.projectedFingerprint(player, f.campaign)).not.toBe(beforePlayer);
  });
  it("refuses incomplete imported provenance and keeps legacy source proof scoped to its own entry", async () => {
    const f = await fixture(), imports = createImports(db, config);
    const preview = await imports.previewEron(gm, f.campaign, { articles: [1, 2].map(pageid => ({ title: `Source ${pageid}`, pageid, ns: 0, revid: 1, wikitext: `This original source paragraph ${pageid} is deliberately long enough to remain an imported text atom.` })), templates: [], wikiUrl: "https://source.example/" });
    await imports.acceptEron(gm, f.campaign, preview.artifactId, preview.entries.map(e => e.id));
    const entry = await f.docs.getEntry(gm, f.campaign, preview.entries[0]!.id), sources = await f.domain.publicationSources(gm, f.campaign, entry.entryId);
    expect(sources.legacyRoutes).toEqual([{ kind: "legacy", route: "/wiki/Source_1", entryId: entry.entryId, sourceUrl: "https://source.example/wiki/Source_1" }]);
    const input = { ...f.command, expectedArticleRevisionId: entry.revisionId!, passageIds: [entry.passagen[0]!.pid] };
    await expect(f.domain.publishEntry(gm, f.campaign, entry.entryId, input)).rejects.toThrow(/Quellen- oder Autorenangaben/);
    expect(await f.domain.getEntryPublication(gm, f.campaign, entry.entryId)).toBeNull();
    const authored = await f.docs.saveEntry(gm, f.campaign, { title: "Own text", expectedVersion: entry.version!, passages: [paragraph("Ein völlig eigenständig formulierter Text ohne übernommene Quellpassage.")] }, entry.entryId);
    await f.domain.publishEntry(gm, f.campaign, entry.entryId, { ...input, expectedArticleRevisionId: authored.revisionId!, passageIds: [authored.passagen[0]!.pid] });
    await expect(f.domain.addRoute(gm, f.campaign, { commandId: randomUUID(), expectedPolicyVersion: 1, kind: "legacy", route: "/wiki/Source_2", entryId: entry.entryId, sourceUrl: "https://source.example/wiki/Source_2" })).rejects.toThrow(/nicht belegt/);
  });
  it("publishes complete source attribution and never treats an imported image reference as an asset grant", async () => {
    const f = await fixture(), imports = createImports(db, config);
    const input = { articles: [{ title: "Credited source", pageid: 1, ns: 0, revid: 1, wikitext: "This is the original credited text, retained here with a complete author history and license.\n\n[[Datei:Unlicensed-secret-image.png|thumb|This caption is licensed text.]]" }], templates: [], wikiUrl: "https://source.example/",
      attributionByPageId: { "1": { complete: true as const, authors: ["Zora", "Ada"], anonymousContributions: 2, revisionSha1: "abc123" } } };
    const preview = await imports.previewEron(gm, f.campaign, input); expect(preview.attributionComplete).toBe(true);
    await imports.acceptEron(gm, f.campaign, preview.artifactId, preview.entries.map(e => e.id));
    const entry = await f.docs.getEntry(gm, f.campaign, preview.entries[0]!.id);
    // Das Bild ist jetzt eine Figur statt Quarantäne — die Aussage dieses Tests bleibt davon
    // unberührt und wird schärfer: die Passage weiß, welche Datei gemeint ist, und trotzdem
    // verlässt weder Kennung noch Bild die öffentliche Auslieferung.
    expect(entry.passagen.some(p => p.inhalt.kind === "bildunterschrift")).toBe(true);
    expect(entry.passagen.some(p => p.inhalt.kind === "bildunterschrift" && p.inhalt.dateiname === "Unlicensed-secret-image.png")).toBe(true);
    await f.domain.publishEntry(gm, f.campaign, entry.entryId, { ...f.command, expectedArticleRevisionId: entry.revisionId!, passageIds: entry.passagen.map(p => p.pid) });
    const policy = (await f.domain.getPublication(gm, f.campaign))!, world = await f.delivery.getWorld(policy.publicKey);
    expect(world.entries[0]!.attributions).toEqual([{ sourceUrl: "https://source.example/wiki/Credited_source", license: "CC-BY-SA-3.0", authors: ["Ada", "Zora"], anonymousContributions: 2 }]);
    expect(JSON.stringify(world)).toContain("This caption is licensed text."); expect(JSON.stringify(world)).not.toContain("assetId"); expect(JSON.stringify(world)).not.toContain("Unlicensed-secret-image");
    expect(publicHtml(world, config.origin, world.entries[0]!)).not.toContain("<img");
  });
  it("uses the latest explicitly accepted source assertion at the selected revision without rewriting older artifacts", async () => {
    const f = await fixture(), imports = createImports(db, config), input = { articles: [{ title: "Later credited", pageid: 1, ns: 0, revid: 1, wikitext: "This original text remains unchanged when its complete author-history assertion is later supplied." }], templates: [], wikiUrl: "https://source.example/" };
    const first = await imports.previewEron(gm, f.campaign, input); await imports.acceptEron(gm, f.campaign, first.artifactId, first.entries.map(e => e.id));
    const complete = { ...input, attributionByPageId: { "1": { complete: true as const, authors: ["Ada"], anonymousContributions: 0, revisionSha1: "abc123" } } };
    const second = await imports.previewEron(gm, f.campaign, complete); await imports.acceptEron(gm, f.campaign, second.artifactId, second.entries.map(e => e.id));
    const entry = await f.docs.getEntry(gm, f.campaign, first.entries[0]!.id);
    await f.domain.publishEntry(gm, f.campaign, entry.entryId, { ...f.command, expectedArticleRevisionId: entry.revisionId!, passageIds: entry.passagen.map(p => p.pid) });
    const policy = (await f.domain.getPublication(gm, f.campaign))!, before = await f.delivery.getWorld(policy.publicKey);
    expect(before.entries[0]!.attributions[0]!.authors).toEqual(["Ada"]);
    const later = await imports.previewEron(gm, f.campaign, input); await imports.acceptEron(gm, f.campaign, later.artifactId, later.entries.map(e => e.id));
    expect(await f.delivery.getWorld(policy.publicKey)).toEqual(before);
    expect(JSON.stringify((await imports.artifact(gm, f.campaign, first.artifactId)).source)).toContain('"status":"incomplete"');
  });
});
