import { createHash, randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { HOW_TO_BE_A_HERO_PACKAGE, HTBAH_EXAMPLE_CHARACTERS, defaultSupportedActorFields, stableJson } from "@chronicle/rules";
import { createPgDb, createTestDb, migrate, type Db } from "../src/db/index.ts";
import { createCampaigns } from "../src/domain/campaigns.ts";
import { createGameplay } from "../src/domain/gameplay.ts";
import { createActors } from "../src/domain/actors.ts";

const pkg = HOW_TO_BE_A_HERO_PACKAGE;
const definition = (fields = { ...HTBAH_EXAMPLE_CHARACTERS[0]!.fields }) => ({ schemaVersion: 1, name: "Hero blueprint", kind: "player_character", loreEntryId: null, package: { id: pkg.id, version: pkg.version }, fields });
const command = () => ({ commandId: randomUUID() });
describe("HTBAH actor blueprint and saved character lifecycle", () => {
  let db: Db, gm: string, admin: Db | undefined;
  const schema = `chronicle_htbah_actor_${randomUUID().replaceAll("-", "")}`;
  beforeAll(async () => {
    const connection = process.env["TEST_DATABASE_URL"];
    if (connection) {
      admin = createPgDb(connection); await admin.query(`CREATE SCHEMA "${schema}"`);
      const url = new URL(connection); url.searchParams.set("options", `-c search_path=${schema}`);
      db = createPgDb(url.href);
    } else db = await createTestDb();
    await migrate(db); gm = randomUUID();
    await db.query("INSERT INTO users(id,display_name,platform_role,created_at) VALUES($1,'GM','leitung',1)", [gm]);
  }, 30_000);
  afterAll(async () => {
    await db?.close();
    if (admin) {
      try { if (!/^chronicle_htbah_actor_[a-f0-9]{32}$/.test(schema)) throw new Error("Unexpected test schema"); await admin.query(`DROP SCHEMA IF EXISTS "${schema}" CASCADE`); }
      finally { await admin.close(); }
    }
  });
  async function fixture() {
    const campaign = (await createCampaigns(db).createCampaign(gm, { name: "Hero workshop" })).id;
    const game = createGameplay(db), actors = createActors(db);
    await game.installPackage(gm, campaign, pkg);
    const review = await game.previewPackage(gm, campaign, pkg);
    await game.activatePackage(gm, campaign, { packageId: pkg.id, packageVersion: pkg.version, expectedVersion: 0, previewHash: review.previewHash });
    return { campaign, game, actors };
  }
  it("creates immutable V2-pinned blueprints and independent saved characters with validated defaults", async () => {
    const f = await fixture(), first = await f.actors.createActorTemplate(gm, f.campaign, { ...command(), definition: definition({}) });
    expect(first.definition.fields).toEqual(defaultSupportedActorFields(pkg));
    const revised = await f.actors.reviseActorTemplate(gm, f.campaign, first.id, { ...command(), expectedVersion: 1, reason: "Set example values", definition: definition() });
    const request = { ...command(), templateId: first.id, templateRevision: revised.revision };
    const actor = await f.actors.instantiateActor(gm, f.campaign, request);
    expect(await f.actors.instantiateActor(gm, f.campaign, request)).toEqual(actor);
    const second = await f.actors.instantiateActor(gm, f.campaign, { ...command(), templateId: first.id, templateRevision: 1 });
    expect((await f.game.getSheet(gm, f.campaign, actor.id)).fields).toEqual(HTBAH_EXAMPLE_CHARACTERS[0]!.fields);
    expect((await f.game.getSheet(gm, f.campaign, second.id)).fields).toEqual(defaultSupportedActorFields(pkg));
    expect((await f.actors.getActorTemplate(gm, f.campaign, first.id, 1)).contentHash).toBe(first.contentHash);
    expect((await f.game.prepareAction(gm, f.campaign, { ...command(), actorId: actor.id, actionId: "skill_klettern" })).receipt.schemaVersion).toBe(2);
  });

  it("rejects invalid initial and revised blueprint constraints without recording revisions or command events", async () => {
    const f = await fixture();
    for (const fields of [{ ...definition().fields, skill_klettern: 100 }, { ...definition().fields, gbp_spent_handeln: 24 }]) {
      await expect(f.actors.createActorTemplate(gm, f.campaign, { ...command(), definition: definition(fields) })).rejects.toThrow(/constraint/);
    }
    expect((await db.query("SELECT 1 FROM actor_templates WHERE campaign_id=$1", [f.campaign])).rowCount).toBe(0);
    const saved = await f.actors.createActorTemplate(gm, f.campaign, { ...command(), definition: definition() });
    await expect(f.actors.reviseActorTemplate(gm, f.campaign, saved.id, { ...command(), expectedVersion: 1, reason: "Invalid point allocation", definition: definition({ ...definition().fields, skill_klettern: 100 }) })).rejects.toThrow(/constraint/);
    expect(await f.actors.getActorTemplate(gm, f.campaign, saved.id)).toEqual(saved);
    expect((await db.query("SELECT 1 FROM actor_inventory_events WHERE campaign_id=$1", [f.campaign])).rowCount).toBe(1);
  });

  it("validates an imported blueprint again at instantiation before creating actors, sheets or control grants", async () => {
    const f = await fixture(), id = randomUUID(), bad = definition({ ...definition().fields, gbp_spent_handeln: 24 });
    await db.transaction(async tx => {
      await tx.query("INSERT INTO actor_templates(id,campaign_id,created_by,created_at) VALUES($1,$2,$3,1)", [id, f.campaign, gm]);
      await tx.query("INSERT INTO actor_template_revisions(template_id,campaign_id,revision,definition,content_hash,created_by,created_at) VALUES($1,$2,1,$3,$4,$5,1)", [id, f.campaign, bad, createHash("sha256").update(stableJson(bad)).digest("hex"), gm]);
    });
    await expect(f.actors.instantiateActor(gm, f.campaign, { ...command(), templateId: id, templateRevision: 1 })).rejects.toThrow(/constraint/);
    for (const table of ["actors", "actor_sheets", "actor_controllers", "actor_inventory_events"]) expect((await db.query(`SELECT 1 FROM ${table} WHERE campaign_id=$1`, [f.campaign])).rowCount).toBe(0);
  });
});
