import { randomUUID } from "node:crypto";
import { describe, expect, it } from "vitest";
import { canonicalHash, type CanonicalValue } from "@chronicle/core";
import { createTestDb, migrate } from "../../server/src/db/index.ts";
import { createIdentity } from "../../server/src/identity/index.ts";
import { createCampaigns } from "../../server/src/domain/campaigns.ts";
import { createDocuments } from "../../server/src/domain/documents.ts";
import { createImports } from "../../server/src/domain/imports.ts";
import { createAuthoring } from "../../server/src/domain/authoring.ts";
import { createCampaignBundleV4 } from "../src/native-v4/index.ts";
import { collectV4Fixture, v4Config } from "./native-v4-fixture.ts";

const hash = (value: unknown) => canonicalHash(value as CanonicalValue);
describe("independent native V4 source admission review", () => {
  it("rejects a fully rehashed legacy receipt borrowing another entry's source from the same accepted artifact", async () => {
    const db = await createTestDb();
    try {
      await migrate(db);
      const gm = (await createIdentity(db, v4Config).bootstrap("Independent GM")).userId;
      const campaign = await createCampaigns(db, v4Config).createCampaign(gm, { name: "Two source articles" });
      const universe = (await db.query<{ universe_id: string }>("SELECT universe_id FROM campaigns WHERE id=$1", [campaign.id])).rows[0]!.universe_id;
      const domain = createAuthoring(db, v4Config), imports = createImports(db, v4Config);
      const input = { articles: [1, 2].map(pageid => ({ title: `Source ${pageid}`, pageid, ns: 0, revid: 1, wikitext: `This original source article ${pageid} contains enough original prose to remain a distinct imported atom.` })), templates: [], wikiUrl: "https://source.example/",
        attributionByPageId: Object.fromEntries([1, 2].map(id => [String(id), { complete: true as const, authors: [`Author ${id}`], anonymousContributions: 0, revisionSha1: "abc" }])) };
      const preview = await imports.previewEron(gm, campaign.id, input);
      await imports.acceptEron(gm, campaign.id, preview.artifactId, preview.entries.map(entry => entry.id));
      const entry = await createDocuments(db, v4Config).getEntry(gm, campaign.id, preview.entries.find(entry => entry.title === "Source 1")!.id);
      await domain.configurePublication(gm, campaign.id, { commandId: randomUUID(), expectedVersion: 0, enabled: true, worldSlug: "world", title: "World", description: "", locale: "de", contentWarnings: [], theme: null });
      await domain.publishEntry(gm, campaign.id, entry.entryId, { commandId: randomUUID(), expectedArticleRevisionId: entry.revisionId!, expectedPublicationVersion: 0, expectedPolicyVersion: 1, passageIds: entry.passagen.map(p => p.pid), publicSlug: "first", contentWarnings: [], mintIds: [] });
      const command = { commandId: "legacy-proof", expectedPolicyVersion: 1, kind: "legacy", route: "/wiki/Source_1", entryId: entry.entryId, sourceUrl: "https://source.example/wiki/Source_1" };
      // Establish the domain's actual denial before constructing an archive that
      // claims the same impossible command was accepted.
      await expect(domain.addRoute(gm, campaign.id, { ...command, route: "/wiki/Source_2", sourceUrl: "https://source.example/wiki/Source_2" })).rejects.toThrow(/nicht belegt/);
      await domain.addRoute(gm, campaign.id, command);
      const data = await collectV4Fixture(db, campaign.id, universe);
      expect(() => createCampaignBundleV4(data)).not.toThrow();
      const changed = JSON.parse(JSON.stringify(data));
      const event = changed.tables.authoring_events.find((row: { command_id: string }) => row.command_id === command.commandId);
      event.request.input.route = "/wiki/Source_2"; event.request.input.sourceUrl = "https://source.example/wiki/Source_2";
      event.request_hash = hash(event.request);
      event.after_state.route = event.request.input.route; event.after_state.sourceUrl = event.request.input.sourceUrl;
      changed.tables.publication_routes[0].route = event.request.input.route;
      changed.tables.publication_routes[0].source_url = event.request.input.sourceUrl;
      // createCampaignBundleV4 recomputes every outer/module/core hash itself.
      expect(() => createCampaignBundleV4(changed)).toThrow();
    } finally { await db.close(); }
  }, 30_000);
});
