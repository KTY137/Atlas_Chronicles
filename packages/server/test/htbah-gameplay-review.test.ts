import { createHash, randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { HOW_TO_BE_A_HERO_PACKAGE, HTBAH_EXAMPLE_CHARACTERS, evaluateSupportedAction, stableJson } from "@chronicle/rules";
import { createTestDb, migrate, type Db } from "../src/db/index.ts";
import { createCampaigns } from "../src/domain/campaigns.ts";
import { createDocuments } from "../src/domain/documents.ts";
import { createGameplay } from "../src/domain/gameplay.ts";
import { seedActorControl } from "./actor-fixtures.ts";

const SEED = "00000001000000020000000300000004", time = Date.UTC(2026, 8, 6, 12);
const cfg = { now: () => time, seed: () => SEED };
const hash = (value: unknown) => createHash("sha256").update(stableJson(value)).digest("hex");

describe("independent HTBAH receipt-row identity review", () => {
  let db: Db;
  beforeAll(async () => { db = await createTestDb(); await migrate(db); }, 30_000);
  afterAll(async () => { await db?.close(); });

  it.each(["action", "actor"])("rejects a validly hashed and replayable receipt transplanted across the row's %s identity", async attack => {
    const gm = randomUUID(), player = randomUUID(), actorId = randomUUID();
    await db.query("INSERT INTO users(id,display_name,platform_role,created_at) VALUES($1,'GM','leitung',$3),($2,'Hero','gast',$3)", [gm, player, time]);
    const campaignId = (await createCampaigns(db, cfg).createCampaign(gm, { name: "Receipt identity review" })).id;
    await db.query("INSERT INTO actors(id,campaign_id,user_id,name) VALUES($1,$2,$3,'Hero')", [actorId, campaignId, player]);
    await db.query("INSERT INTO campaign_memberships(campaign_id,user_id,role,display_name,name_skeleton,actor_id) VALUES($1,$2,'spieler','Hero','hero',$3)", [campaignId, player, actorId]);
    await seedActorControl(db, campaignId, actorId, player);
    const game = createGameplay(db, cfg), pkg = HOW_TO_BE_A_HERO_PACKAGE;
    await game.installPackage(gm, campaignId, pkg);
    const review = await game.previewPackage(gm, campaignId, pkg);
    await game.activatePackage(gm, campaignId, { packageId: pkg.id, packageVersion: pkg.version, expectedVersion: 0, previewHash: review.previewHash });
    await game.updateSheet(player, campaignId, { actorId, expectedVersion: 0, fields: HTBAH_EXAMPLE_CHARACTERS[0]!.fields });
    const entry = await createDocuments(db, cfg).saveEntry(gm, campaignId, { title: "Review door", passages: [{ inhalt: { kind: "absatz", inhalt: [{ text: "The door opens", marks: [] }] } }] });
    const roll = await game.prepareAction(gm, campaignId, { commandId: randomUUID(), actorId, actionId: attack === "action" ? "aptitude_handeln" : "skill_klettern", targetPassageId: entry.passagen[0]!.pid });
    if (attack === "action") expect(roll.receipt.success).toBe(false);
    const transplanted = evaluateSupportedAction(pkg, "skill_klettern", { ...roll.receipt.context, knowledge: { ...roll.receipt.context.knowledge, actorId: attack === "actor" ? "unrelated-actor" : actorId } });
    expect(transplanted.success).toBe(true);
    // Existing receipts are protected by the DB immutability trigger. Model an
    // inconsistent newly persisted row, as in the existing planted-Vollmacht tests.
    const insertedRollId = randomUUID();
    await db.query(`INSERT INTO action_rolls(id,campaign_id,actor_id,prepared_by,command_id,request_hash,package_id,package_version,action_id,receipt,receipt_hash,target_passage_id,target_passage_hash,vollmacht_id,fiction_date,prepared_at,scene_id,session_id)
      SELECT $2,campaign_id,actor_id,prepared_by,$3,request_hash,package_id,package_version,action_id,$4,$5,target_passage_id,target_passage_hash,vollmacht_id,fiction_date,prepared_at,scene_id,session_id
      FROM action_rolls WHERE id=$1`, [roll.id, insertedRollId, randomUUID(), transplanted, hash(transplanted)]);

    expect.soft((await game.replayRoll(gm, campaignId, insertedRollId)).valid).toBe(false);
    await expect.soft(game.confirmAction(gm, campaignId, insertedRollId)).rejects.toThrow();
    expect.soft((await db.query("SELECT 1 FROM confirmed_mints WHERE campaign_id=$1", [campaignId])).rowCount).toBe(0);
    expect.soft((await game.getRoll(gm, campaignId, insertedRollId)).status).toBe("ausstehend");
  });
});
