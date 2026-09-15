// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2026 Kaya Yesilyurt - Atlas Chronicles. Siehe LICENSE.
import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { D20_REFERENCE_PACKAGE, DEMO_RULE_PACKAGE, defaultSupportedActorFields } from "@chronicle/rules";
import { createTestDb, migrate, type Db } from "../src/db/index.ts";
import { createCampaigns } from "../src/domain/campaigns.ts";
import { createIdentity } from "../src/identity/index.ts";
import { createGameplay } from "../src/domain/gameplay.ts";
import { createActors } from "../src/domain/actors.ts";
import { createPinnedFigurantrag } from "../src/domain/figurantrag-pinned.ts";

const config = { origin: "https://figurantrag-pinned.test", cookieSecret: "figurantrag-pinned-cookie-secret-with-more-than-32-chars" };

describe("pinned figure requests", () => {
  let db: Db, gm: string;
  beforeAll(async () => { db = await createTestDb(); await migrate(db); gm = (await createIdentity(db, config).bootstrap("Pinned GM")).userId; }, 30_000);
  afterAll(async () => { await db?.close(); });

  it("lists, approves and instantiates against the requested template package instead of the campaign default", async () => {
    const campaigns = createCampaigns(db), campaignId = (await campaigns.createCampaign(gm, { name: "Pinned request" })).id;
    const player = randomUUID(), actorId = randomUUID();
    await db.query("INSERT INTO users(id,display_name,created_at) VALUES($1,'Sera',$2)", [player, Date.now()]);
    await db.query("INSERT INTO actors(id,campaign_id,user_id,name) VALUES($1,$2,$3,'Sera')", [actorId, campaignId, player]);
    await db.query("INSERT INTO campaign_memberships(campaign_id,user_id,role,display_name,name_skeleton,actor_id) VALUES($1,$2,'spieler','Sera','sera',$3)", [campaignId, player, actorId]);

    const game = createGameplay(db), actors = createActors(db), requests = createPinnedFigurantrag(db);
    await game.installPackage(gm, campaignId, D20_REFERENCE_PACKAGE); // deliberately not activated
    expect((await game.listPackages(gm, campaignId)).pin).toEqual({ id: DEMO_RULE_PACKAGE.id, version: DEMO_RULE_PACKAGE.version });

    const template = await actors.createActorTemplate(gm, campaignId, { commandId: randomUUID(), definition: {
      schemaVersion: 1, name: "D20 Wanderer", kind: "player_character", loreEntryId: null,
      package: { id: D20_REFERENCE_PACKAGE.id, version: D20_REFERENCE_PACKAGE.version },
      fields: { ...defaultSupportedActorFields(D20_REFERENCE_PACKAGE) },
    } });
    await requests.freigeben(gm, campaignId, template.id, 0);
    expect((await requests.freigegebeneVorlagen(player, campaignId))[0]?.package).toEqual({ id: D20_REFERENCE_PACKAGE.id, version: D20_REFERENCE_PACKAGE.version });

    const requested = await requests.beantragen(player, campaignId, randomUUID(), { templateId: template.id, name: "Nell D20", anfangswerte: { strength: 14 } });
    expect(requested.package).toEqual({ id: D20_REFERENCE_PACKAGE.id, version: D20_REFERENCE_PACKAGE.version });
    expect((await requests.liste(gm, campaignId))[0]?.package).toEqual(requested.package);
    expect((await requests.liste(player, campaignId))[0]?.package).toEqual(requested.package);

    const approved = await requests.bestaetigen(gm, campaignId, requested.id, requested.version);
    expect(approved.antrag.package).toEqual(requested.package);
    const sheet = await game.getSheet(player, campaignId, approved.actorId);
    expect({ id: sheet.packageId, version: sheet.packageVersion }).toEqual(requested.package);
    expect(sheet.fields.strength).toBe(14);
    expect((await game.listPackages(gm, campaignId)).pin).toEqual({ id: DEMO_RULE_PACKAGE.id, version: DEMO_RULE_PACKAGE.version });
  });
});
