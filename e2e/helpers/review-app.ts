// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2026 Kaya Yesilyurt - Atlas Chronicles. Siehe LICENSE.
import { randomBytes } from "node:crypto";
import { resolve } from "node:path";
import { buildApp } from "../../packages/server/src/app.ts";
import { createTestDb, migrate } from "../../packages/server/src/db/index.ts";
import { createIdentity } from "../../packages/server/src/identity/index.ts";
import { createCampaigns } from "../../packages/server/src/domain/campaigns.ts";

/** Isolated application with real auth, database and HTTP routes; never reads host credentials. */
export async function reviewApp(port: number) {
  const origin = `http://localhost:${port}`;
  const config = { origin, bootstrapToken: randomBytes(32).toString("hex"), cookieSecret: randomBytes(32).toString("hex"), staticRoot: resolve("packages/client/dist") };
  const db = await createTestDb();
  try {
    await migrate(db);
    const identity = createIdentity(db, config), campaigns = createCampaigns(db);
    const gm = await identity.bootstrap("Kaya");
    const campaign = await campaigns.createCampaign(gm.userId, { name: "Die Chroniken des Nordens" });
    const invitation = await campaigns.issueInvitation(gm.userId, campaign.id);
    const request = await campaigns.requestJoin(invitation.code, { displayName: "Sera" });
    const member = await campaigns.approveJoin(gm.userId, campaign.id, request.id);
    const player = { ...await identity.issueSession(member.userId), userId: member.userId };
    const app = await buildApp(db, config);
    try { await app.listen({ host: "127.0.0.1", port }); } catch (error) { await app.close(); throw error; }
    return { origin, campaign, gm, player, actorId: member.actorId, db, close: async () => { await app.close(); await db.close(); } };
  } catch (error) { await db.close(); throw error; }
}
