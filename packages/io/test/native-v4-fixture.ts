import { createTestDb, migrate, type Db } from "../../server/src/db/index.ts";
import { createIdentity } from "../../server/src/identity/index.ts";
import { createCampaigns } from "../../server/src/domain/campaigns.ts";
import { createDocuments } from "../../server/src/domain/documents.ts";
import { createImports } from "../../server/src/domain/imports.ts";
import { createGameplay } from "../../server/src/domain/gameplay.ts";
import { createAuthoring } from "../../server/src/domain/authoring.ts";
import { getThemePreset } from "@chronicle/theme";
import type { CanonicalValue } from "@chronicle/core";
import { CAMPAIGN_V4_TABLES, CAMPAIGN_V4_ADDITIONAL_TABLES, type CampaignTablesV4, type CampaignBundleDataV4 } from "../src/native-v4/index.ts";

export const v4Config = { origin: "https://native-v4.test", cookieSecret: "native-v4-fixture-secret-more-than-thirty-two-characters", now: () => 1788696000000 };
const paragraph = (text: string) => ({ inhalt: { kind: "absatz" as const, inhalt: [{ text, marks: [] }] } });
export async function collectV4Fixture(db: Db, campaignId: string, universeId: string): Promise<CampaignBundleDataV4> {
  const tables: Record<string, readonly Record<string, CanonicalValue>[]> = {};
  for (const spec of CAMPAIGN_V4_TABLES) {
    const rows = (await db.query<Record<string, CanonicalValue>>(`SELECT ${spec.columns.map(column => `"${column}"`).join(",")} FROM "${spec.name}"`)).rows;
    tables[spec.name] = rows.map(row => Object.fromEntries(spec.columns.map(column => [column, spec.bigintColumns.includes(column) && row[column] !== null ? String(row[column]) : row[column]!])));
  }
  return { campaignId, universeId, exportedAt: new Date(v4Config.now()).toISOString(), tables: tables as unknown as CampaignTablesV4 };
}
/** Every authoring row comes from the real migrated domain, including canonical
 * imported attribution, minted evidence, aliases, tombstones and stale retries. */
export async function authoringFixtureV4(options: { wikiUrl?: string; incompleteBefore?: boolean; includeUnacceptedArticle?: boolean } = {}) {
  const db = await createTestDb();
  try {
    await migrate(db); const gm = (await createIdentity(db, v4Config).bootstrap("Native V4 GM")).userId;
    const campaign = await createCampaigns(db, v4Config).createCampaign(gm, { name: "Private original name" });
    const campaignId = campaign.id, universeId = String((await db.query<{ universe_id: string }>("SELECT universe_id FROM campaigns WHERE id=$1", [campaignId])).rows[0]!.universe_id);
    const domain = createAuthoring(db, v4Config), docs = createDocuments(db, v4Config);
    const createInput = { commandId: "theme-create", manifest: getThemePreset("Fantasy") };
    const theme = await domain.createTheme(gm, campaignId, createInput);
    await domain.pinTheme(gm, campaignId, { commandId: "theme-pin-1", expectedVersion: 0, themeId: theme.subjectId, revision: 1 });
    await domain.reviseTheme(gm, campaignId, theme.subjectId, { commandId: "theme-revise-2", expectedVersion: 1, manifest: { ...getThemePreset("Fantasy"), name: "Private draft 2" } });
    const configInput = { commandId: "policy-create", expectedVersion: 0, enabled: true, worldSlug: "old-world", title: "  Public world  ", description: "A public description", locale: "de" as const, contentWarnings: ["Fantasy violence"], theme: { themeId: theme.subjectId, revision: 1 } };
    await domain.configurePublication(gm, campaignId, configInput);
    const entry = await docs.saveEntry(gm, campaignId, { title: "Original title", passages: [paragraph("Published passage"), paragraph("Secret passage")] });
    const mint = await createGameplay(db, v4Config).mintGesprochen(gm, campaignId, { commandId: "mint-source", passageId: entry.passagen[0]!.pid, actorIds: [], fictionDate: "First autumn" });
    const source = await docs.getEntry(gm, campaignId, entry.entryId);
    const publishInput = { commandId: "entry-publish-1", expectedArticleRevisionId: source.revisionId!, expectedPublicationVersion: 0, expectedPolicyVersion: 1, passageIds: [entry.passagen[0]!.pid], publicSlug: "old-article", contentWarnings: ["A bounded warning"], mintIds: [mint.id] };
    await domain.publishEntry(gm, campaignId, entry.entryId, publishInput);
    await domain.publishEntry(gm, campaignId, entry.entryId, { ...publishInput, commandId: "entry-publish-2", expectedPublicationVersion: 1, publicSlug: "new-article" });

    const imports = createImports(db, v4Config);
    const importInput = { articles: [{ title: "Imported Hall", pageid: 71, ns: 0, revid: 9, wikitext: "This imported hall has a sufficiently long paragraph for its explicit source attribution." },
      ...(options.includeUnacceptedArticle ? [{ title: "Unaccepted Shrine", pageid: 72, ns: 0, revid: 1, wikitext: "This separate source article is in the preview artifact but has never been accepted for this campaign." }] : [])], templates: [], wikiUrl: options.wikiUrl ?? "https://source.example/wiki/", license: "CC-BY-SA-4.0",
      attributionByPageId: { "71": { complete: true as const, authors: ["B", "A"], anonymousContributions: 2, revisionSha1: "a".repeat(40) }, "72": { complete: true as const, authors: ["Foreign author"], anonymousContributions: 0, revisionSha1: "c".repeat(40) } } };
    let incompleteRevisionId: string | null = null;
    if (options.incompleteBefore) {
      const first = await imports.previewEron(gm, campaignId, { ...importInput, attributionByPageId: undefined });
      await imports.acceptEron(gm, campaignId, first.artifactId, [first.entries[0]!.id]);
      incompleteRevisionId = (await docs.getEntry(gm, campaignId, first.entries[0]!.id)).revisionId!;
    }
    const preview = await imports.previewEron(gm, campaignId, importInput), importedId = preview.entries[0]!.id;
    await imports.acceptEron(gm, campaignId, preview.artifactId, [importedId]);
    const imported = await docs.getEntry(gm, campaignId, importedId);
    await domain.publishEntry(gm, campaignId, importedId, { commandId: "import-publish", expectedArticleRevisionId: imported.revisionId!, expectedPublicationVersion: 0, expectedPolicyVersion: 1, passageIds: imported.passagen.map(p => p.pid), publicSlug: "imported-hall", contentWarnings: [], mintIds: [] });
    await domain.addRoute(gm, campaignId, { commandId: "route-add", expectedPolicyVersion: 1, kind: "article", route: "temporary-alias", entryId: entry.entryId, sourceUrl: null });
    const artifact = (await db.query<{ source: { result: { provenance: { value: { quellArtikelUrl: string } }[] } } }>("SELECT source FROM artifacts WHERE id=$1", [preview.artifactId])).rows[0]!;
    const sourceUrl = artifact.source.result.provenance[0]!.value.quellArtikelUrl;
    const foreignSourceUrl = artifact.source.result.provenance.find(row => row.value.quellArtikelUrl !== sourceUrl)?.value.quellArtikelUrl ?? null;
    await domain.addRoute(gm, campaignId, { commandId: "legacy-add", expectedPolicyVersion: 2, kind: "legacy", route: new URL(sourceUrl).pathname, entryId: importedId, sourceUrl });
    await domain.removeRoute(gm, campaignId, { commandId: "route-remove", expectedPolicyVersion: 3, kind: "article", route: "temporary-alias" });
    await domain.addRoute(gm, campaignId, { commandId: "world-alias", expectedPolicyVersion: 4, kind: "world", route: "ancient-world", entryId: null, sourceUrl: null });
    await domain.configurePublication(gm, campaignId, { ...configInput, commandId: "policy-rename", expectedVersion: 5, worldSlug: "new-world" });
    await domain.unpublishEntry(gm, campaignId, entry.entryId, { commandId: "entry-unpublish", expectedArticleRevisionId: source.revisionId!, expectedPublicationVersion: 2, expectedPolicyVersion: 6 });
    await domain.publishEntry(gm, campaignId, entry.entryId, { ...publishInput, commandId: "entry-republish", expectedPublicationVersion: 3, expectedPolicyVersion: 6, publicSlug: "new-article" });
    // The public snapshot and historical retries must survive later private edits.
    await docs.saveEntry(gm, campaignId, { title: "Later secret title", slug: "later-secret", expectedVersion: source.version!, passages: [{ ...paragraph("Changed privately after publication"), pid: entry.passagen[0]!.pid }, paragraph("New secret")] }, entry.entryId);
    await domain.reviseTheme(gm, campaignId, theme.subjectId, { commandId: "theme-revise-3", expectedVersion: 2, manifest: { ...getThemePreset("Fantasy"), name: "Private draft 3" } });
    await domain.pinTheme(gm, campaignId, { commandId: "theme-pin-2", expectedVersion: 1, themeId: theme.subjectId, revision: 2 });
    // A later private reimport adds a new attribution source. Old public pins must
    // still validate against the accepted sources available at their own revision.
    const laterInput = { ...importInput,
      articles: [{ ...importInput.articles[0]!, revid: 10, wikitext: importInput.articles[0]!.wikitext + "\n\nA later private addition that has not been approved for public display." }],
      attributionByPageId: { "71": { complete: true as const, authors: ["C", "A", "B"], anonymousContributions: 3, revisionSha1: "b".repeat(40) } },
    };
    const laterImport = await imports.previewEron(gm, campaignId, laterInput);
    await imports.acceptEron(gm, campaignId, laterImport.artifactId, [importedId]);
    if (options.incompleteBefore) {
      const incompleteLater = await imports.previewEron(gm, campaignId, { ...laterInput, attributionByPageId: undefined });
      await imports.acceptEron(gm, campaignId, incompleteLater.artifactId, [importedId]);
    }
    const data = await collectV4Fixture(db, campaignId, universeId);
    const columns = (await db.query<{ table_name: string; column_name: string; data_type: string }>("SELECT table_name,column_name,data_type FROM information_schema.columns WHERE table_schema=current_schema() AND table_name=ANY($1::text[]) ORDER BY table_name,ordinal_position", [CAMPAIGN_V4_ADDITIONAL_TABLES.map(table => table.name)])).rows;
    return { data, columns, gm, themeId: theme.subjectId, entryId: entry.entryId, importedId, createInput, publishInput, mintId: mint.id, sourceUrl, foreignSourceUrl, incompleteRevisionId };
  } finally { await db.close(); }
}
