import { beforeAll, describe, expect, it } from "vitest";
import { canonicalHash, type CanonicalValue } from "@chronicle/core";
import { createCampaignBundleV3 } from "../src/campaign-bundle-v3.ts";
import { CAMPAIGN_V3_TABLES, type CampaignTablesV3 } from "../src/campaign-schema-v3.ts";
import { CAMPAIGN_V4_MODULES, CAMPAIGN_V4_TABLES, createCampaignBundleV4, validateCampaignBundleV4, parseCampaignBundleV4, serializeCampaignBundleV4, type CampaignBundleV4 } from "../src/native-v4/index.ts";
import { normalizeRoute } from "../src/native-v4/sources.ts";
import { authoringFixtureV4 } from "./native-v4-fixture.ts";

type Mutable = any;
const hash = (value: unknown) => canonicalHash(value as CanonicalValue);
function rehash(bundle: Mutable): CampaignBundleV4 {
  const core = createCampaignBundleV3({ campaignId: bundle.manifest.campaignId, universeId: bundle.manifest.universeId, exportedAt: bundle.manifest.exportedAt, tables: Object.fromEntries(CAMPAIGN_V3_TABLES.map(table => [table.name, bundle.tables[table.name]])) as unknown as CampaignTablesV3 });
  bundle.manifest.coreContentHash = core.manifest.contentHash; bundle.manifest.contentHash = hash(bundle.tables);
  bundle.manifest.modules = CAMPAIGN_V4_MODULES.map(name => { const specs = CAMPAIGN_V4_TABLES.filter(table => table.module === name); return { name, version: 1, count: specs.reduce((count, table) => count + bundle.tables[table.name].length, 0), sha256: hash(Object.fromEntries(specs.map(table => [table.name, bundle.tables[table.name]]))) }; });
  return bundle;
}
const event = (bundle: Mutable, command: string): Mutable => bundle.tables.authoring_events.find((row: Mutable) => row.command_id === command);
function replaceLegacy(bundle: Mutable, sourceUrl: string, route: string): void {
  const row = bundle.tables.publication_routes.find((row: Mutable) => row.kind === "legacy");
  row.route = route; row.source_url = sourceUrl;
  const receipt = event(bundle, "legacy-add");
  Object.assign(receipt.request.input, { route, sourceUrl }); Object.assign(receipt.after_state, { route, sourceUrl }); receipt.request_hash = hash(receipt.request);
}
function replaceImportPin(bundle: Mutable, entryId: string, revisionId: string): void {
  const row = bundle.tables.entry_publications.find((row: Mutable) => row.entry_id === entryId), receipt = event(bundle, "import-publish");
  row.revision_id = revisionId; receipt.request.input.expectedArticleRevisionId = revisionId; receipt.after_state.revisionId = revisionId; receipt.request_hash = hash(receipt.request);
}

describe("native V4 imported publication source semantics", () => {
  it("retains language-prefixed legacy addresses as distinct global keys", () => {
    expect(normalizeRoute("legacy", "/wiki/Original")).toBe("/wiki/Original");
    expect(normalizeRoute("legacy", "/de/wiki/Original")).toBe("/de/wiki/Original");
    expect(normalizeRoute("legacy", "/en/wiki/Original")).toBe("/en/wiki/Original");
    expect(normalizeRoute("legacy", "/PT-br/wiki/Original")).toBe("/pt-br/wiki/Original");
    expect(normalizeRoute("legacy", "/DE/wiki/Cafe%CC%81/Subpage")).toBe("/de/wiki/Caf%C3%A9/Subpage");
  });

  it.each(["/german/wiki/Original", "/de-DE-x/wiki/Original", "/de/Wiki/Original", "/de/wiki/", "/de/wiki/../Original", "/de/wiki/%252e%252e/Original", "/de/wiki/Original?secret", "/de/wiki/Original%23secret", "/de/wiki/Original%5Csecret", "/de/wiki//Original"])("rejects unsupported or ambiguous legacy path %s", route => {
    expect(() => normalizeRoute("legacy", route)).toThrow();
  });
});

describe("native V4 accepted source replay against real domain history", () => {
  let mixed: Awaited<ReturnType<typeof authoringFixtureV4>>, repaired: Awaited<ReturnType<typeof authoringFixtureV4>>;
  beforeAll(async () => {
    mixed = await authoringFixtureV4({ wikiUrl: "https://source.example/de/", includeUnacceptedArticle: true });
    repaired = await authoringFixtureV4({ wikiUrl: "https://source.example/pt-br/", incompleteBefore: true });
  }, 30_000);

  it("roundtrips a real language-prefixed source proof including its request and durable route", () => {
    const bundle = parseCampaignBundleV4(serializeCampaignBundleV4(createCampaignBundleV4(mixed.data)));
    const route = bundle.tables.publication_routes.find(row => row.kind === "legacy")!;
    expect(route.route).toBe("/de/wiki/Imported_Hall"); expect(route.source_url).toBe(mixed.sourceUrl);
    expect(event(bundle, "legacy-add").request.input.route).toBe(route.route);
  });

  it("rejects borrowing another article's URL from the same accepted multi-article artifact even after coherent rehashing", () => {
    const forged = JSON.parse(JSON.stringify(createCampaignBundleV4(mixed.data)));
    expect(mixed.foreignSourceUrl).not.toBeNull();
    replaceLegacy(forged, mixed.foreignSourceUrl!, new URL(mixed.foreignSourceUrl!).pathname);
    expect(() => validateCampaignBundleV4(rehash(forged))).toThrow();
  });

  it.each(["different language", "dropped language", "noncanonical case", "unproven matching path"])("rejects rehashed language-source forgery: %s", kind => {
    const forged = JSON.parse(JSON.stringify(createCampaignBundleV4(mixed.data)));
    const route = kind === "different language" ? "/en/wiki/Imported_Hall" : kind === "dropped language" ? "/wiki/Imported_Hall" : kind === "noncanonical case" ? "/DE/wiki/Imported_Hall" : "/de/wiki/Imported_Hall";
    replaceLegacy(forged, kind === "unproven matching path" ? "https://other.example/de/wiki/Imported_Hall" : mixed.sourceUrl, route);
    expect(() => validateCampaignBundleV4(rehash(forged))).toThrow();
  });

  it("accepts incomplete then explicitly completed origin assertions and preserves the public cut after a later incomplete private import", () => {
    const bundle = parseCampaignBundleV4(serializeCampaignBundleV4(createCampaignBundleV4(repaired.data)));
    expect(JSON.stringify(bundle.tables.artifacts)).toContain('"status":"incomplete"');
    const publication = bundle.tables.entry_publications.find(row => row.entry_id === repaired.importedId)!;
    expect(publication.revision_id).not.toBe(repaired.incompleteRevisionId);
    expect(publication.revision_id).not.toBe(bundle.tables.entries.find(row => row.id === repaired.importedId)!.current_revision_id);
    expect(publication.public_metadata).toMatchObject({ attributions: [{ authors: ["A", "B"], anonymousContributions: 2 }] });
  });

  it.each(["earlier incomplete", "later incomplete"])("rejects coherent rehashing that moves the public source cut to %s evidence", cut => {
    const forged = JSON.parse(JSON.stringify(createCampaignBundleV4(repaired.data)));
    const revision = cut === "earlier incomplete" ? repaired.incompleteRevisionId : forged.tables.entries.find((row: Mutable) => row.id === repaired.importedId).current_revision_id;
    replaceImportPin(forged, repaired.importedId, revision!);
    expect(() => validateCampaignBundleV4(rehash(forged))).toThrow();
  });

  it("rejects coherent metadata rehashing that substitutes authors accepted only after the public source cut", () => {
    const forged = JSON.parse(JSON.stringify(createCampaignBundleV4(repaired.data)));
    const row = forged.tables.entry_publications.find((row: Mutable) => row.entry_id === repaired.importedId), receipt = event(forged, "import-publish");
    row.public_metadata.attributions[0].authors = ["A", "B", "C"]; row.public_metadata.attributions[0].anonymousContributions = 3;
    receipt.after_state.metadata = structuredClone(row.public_metadata);
    expect(() => validateCampaignBundleV4(rehash(forged))).toThrow();
  });
});
