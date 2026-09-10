// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2026 Kaya Yesilyurt - Atlas Chronicles. Siehe LICENSE.
import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { currentCampaignSemanticDiff, parseCurrentCampaignBundle, serializeCurrentCampaignBundle } from "@chronicle/io";
import { DEMO_RULE_PACKAGE } from "@chronicle/rules";
import { HOW_TO_BE_A_HERO_PACKAGE, HTBAH_EXAMPLE_CHARACTERS, createHowToBeAHeroPackage } from "@chronicle/rules/examples";
import { createPgDb, type Db } from "../src/db/index.ts";
import { createIdentity } from "../src/identity/index.ts";
import { createCampaigns } from "../src/domain/campaigns.ts";
import { createDocuments } from "../src/domain/documents.ts";
import { createActors } from "../src/domain/actors.ts";
import { createGameplay } from "../src/domain/gameplay.ts";
import { exportCampaignBundle, initializeCampaignRestoreTarget, inspectCampaignRestore, restoreCampaignBundle } from "../src/domain/bundles.ts";

const connection = process.env["TEST_DATABASE_URL"];
const schemas = [0, 1].map(() => `chronicle_htbah_native_${randomUUID().replaceAll("-", "")}`);
const cfg = { origin: "https://htbah-native.test", cookieSecret: "htbah-native-local-test-cookie-secret-32-characters", now: () => Date.UTC(2026, 8, 6, 12), seed: () => "00000001000000020000000300000004" };
const command = () => ({ commandId: randomUUID() });
describe.skipIf(!connection)("HTBAH native V5 domain roundtrip on real PostgreSQL", () => {
  let admin: Db, source: Db, destination: Db;
  beforeAll(async () => {
    admin = createPgDb(connection!); const databases: Db[] = [];
    for (const schema of schemas) {
      await admin.query(`CREATE SCHEMA "${schema}"`);
      const url = new URL(connection!); url.searchParams.set("options", `-c search_path=${schema}`);
      const db = createPgDb(url.href); databases.push(db); await initializeCampaignRestoreTarget(db);
    }
    [source, destination] = databases as [Db, Db];
  }, 30_000);
  afterAll(async () => {
    await Promise.all([source?.close(), destination?.close()]);
    if (admin) {
      try {
        for (const schema of schemas) {
          if (!/^chronicle_htbah_native_[a-f0-9]{32}$/.test(schema)) throw new Error("Unexpected HTBAH native test schema");
          await admin.query(`DROP SCHEMA IF EXISTS "${schema}" CASCADE`);
        }
      } finally { await admin.close(); }
    }
  });

  it("exports active and inactive V2, mixed confirmed rolls and blueprint history, restores empty and reexports identically", async () => {
    const identity = createIdentity(source, cfg), gm = (await identity.bootstrap("Kaya")).userId;
    const localSession = await identity.issueSession(gm);
    const campaigns = createCampaigns(source, cfg), campaign = (await campaigns.createCampaign(gm, { name: "Portable heroes" })).id;
    const invitation = await campaigns.issueInvitation(gm, campaign), join = await campaigns.requestJoin(invitation.code, { displayName: "Mara" });
    const player = await campaigns.approveJoin(gm, campaign, join.id);
    const actors = createActors(source, cfg), game = createGameplay(source, cfg);
    const initialDefinition = { schemaVersion: 1, name: "Unplayed original blueprint", kind: "player_character", loreEntryId: null, package: { id: DEMO_RULE_PACKAGE.id, version: DEMO_RULE_PACKAGE.version }, fields: {} };
    const templateRequest = { ...command(), definition: initialDefinition };
    const blueprint = await actors.createActorTemplate(gm, campaign, templateRequest);
    const v1 = await game.prepareAction(player.userId, campaign, { ...command(), actorId: player.actorId, actionId: "investigate" });
    const confirmedV1 = await game.confirmAction(player.userId, campaign, v1.id);
    expect(v1.receipt.schemaVersion).toBe(1);
    expect((await source.query("SELECT 1 FROM actor_sheets")).rowCount).toBe(0);

    const pkg = HOW_TO_BE_A_HERO_PACKAGE;
    await game.installPackage(gm, campaign, pkg);
    const inactive = await exportCampaignBundle(source, gm, campaign, cfg);
    expect(inactive.version).toBe(5);
    expect((await game.listPackages(gm, campaign)).pin.id).toBe(DEMO_RULE_PACKAGE.id);
    expect(parseCurrentCampaignBundle(serializeCurrentCampaignBundle(inactive)).version).toBe(5);

    const review = await game.previewPackage(gm, campaign, pkg);
    await game.activatePackage(gm, campaign, { packageId: pkg.id, packageVersion: pkg.version, expectedVersion: 0, previewHash: review.previewHash });
    const revised = await actors.reviseActorTemplate(gm, campaign, blueprint.id, { ...command(), expectedVersion: 1, reason: "Use the selected HTBAH example", definition: { ...initialDefinition, name: "Mara", package: { id: pkg.id, version: pkg.version }, fields: { ...HTBAH_EXAMPLE_CHARACTERS[0]!.fields } } });
    const instantiateRequest = { ...command(), templateId: blueprint.id, templateRevision: revised.revision };
    const hero = await actors.instantiateActor(gm, campaign, instantiateRequest);
    const saved = await game.getSheet(gm, campaign, hero.id);
    await game.updateSheet(gm, campaign, { actorId: hero.id, expectedVersion: saved.version, fields: { ...saved.fields, gbp_spent_handeln: 1, hp: 90 } });
    const entry = await createDocuments(source, cfg).saveEntry(gm, campaign, { title: "Portable discovery", passages: [{ inhalt: { kind: "absatz", inhalt: [{ text: "The heroes discover the passage.", marks: [] }] } }] });
    const v2 = await game.prepareAction(gm, campaign, { ...command(), actorId: hero.id, actionId: "skill_klettern", targetPassageId: entry.passagen[0]!.pid });
    const confirmedV2 = await game.confirmAction(gm, campaign, v2.id);
    expect(confirmedV2).toMatchObject({ success: true, mint: { kind: "wurf" } });
    const unused = await game.issueVollmacht(gm, campaign, { ...command(), actorId: player.actorId, actionId: "initiative", passageId: entry.passagen[0]!.pid, threshold: 0, expiresAt: cfg.now() + 3600_000, budgetKind: "player", fictionDate: "Day 1" });
    await game.installPackage(gm, campaign, createHowToBeAHeroPackage({ id: "table.inactive.hero" }));

    const bundle = await exportCampaignBundle(source, gm, campaign, cfg), serialized = serializeCurrentCampaignBundle(bundle), parsed = parseCurrentCampaignBundle(serialized);
    expect(bundle.version).toBe(5); expect(bundle.tables.actor_template_revisions).toHaveLength(2);
    expect(bundle.tables.action_rolls).toHaveLength(2);
    expect(bundle.tables.rule_packages).toHaveLength(3);
    expect(serialized).not.toContain(cfg.cookieSecret); expect(serialized).not.toContain(localSession.value);
    expect(serialized).not.toContain(invitation.code); expect(serialized).not.toContain(join.pollToken);
    expect(await inspectCampaignRestore(destination, parsed)).toMatchObject({ formatVersion: 5, dryRun: true, enrollmentRequired: true });
    expect((await destination.query("SELECT 1 FROM users")).rowCount).toBe(0);
    expect(await restoreCampaignBundle(destination, parsed)).toMatchObject({ formatVersion: 5, dryRun: false, enrollmentRequired: true });
    expect(currentCampaignSemanticDiff(bundle, await exportCampaignBundle(destination, gm, campaign, cfg))).toEqual([]);
    for (const table of ["credentials", "auth_challenges", "invitations", "join_requests"]) expect((await destination.query(`SELECT 1 FROM ${table}`)).rowCount).toBe(0);
    const restoredGame = createGameplay(destination, cfg), restoredActors = createActors(destination, cfg);
    expect((await restoredGame.replayRoll(player.userId, campaign, v1.id)).valid).toBe(true);
    expect((await restoredGame.replayRoll(gm, campaign, v2.id)).valid).toBe(true);
    expect(await restoredGame.confirmAction(player.userId, campaign, v1.id)).toEqual(confirmedV1);
    expect(await restoredGame.confirmAction(gm, campaign, v2.id)).toEqual(confirmedV2);
    expect(await restoredActors.createActorTemplate(gm, campaign, templateRequest)).toEqual(blueprint);
    expect(await restoredActors.instantiateActor(gm, campaign, instantiateRequest)).toEqual(hero);
    expect((await restoredActors.getActorTemplate(gm, campaign, blueprint.id, 1)).definition.package.id).toBe(DEMO_RULE_PACKAGE.id);
    expect((await destination.query<{ status: string }>("SELECT status FROM action_vollmachten WHERE id=$1", [unused.id])).rows[0]!.status).toBe("offen");
    expect(currentCampaignSemanticDiff(bundle, await exportCampaignBundle(destination, gm, campaign, cfg))).toEqual([]);
  }, 30_000);
});
