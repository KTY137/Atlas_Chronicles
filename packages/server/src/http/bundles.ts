import type { FastifyInstance } from "fastify";
import { serializeCampaignBundleV2 } from "@chronicle/io";
import type { Db } from "../db/index.ts";
import type { AppConfig } from "../app.ts";
import { createIdentity } from "../identity/index.ts";
import { exportCampaignBundle, CampaignRestoreError } from "../domain/bundles.ts";

export function registerBundles(app: FastifyInstance, db: Db, config: AppConfig) {
  const identity = createIdentity(db, config);
  app.get<{ Params: { campaignId: string } }>("/api/campaigns/:campaignId/export", { config: { rateLimit: { max: 4, timeWindow: "1 minute" } } }, async (request, reply) => {
    const user = await identity.authenticate(request.headers.cookie);
    try {
      const bundle = await exportCampaignBundle(db, user.userId, request.params.campaignId, config);
      return reply.type("application/vnd.atlas-chronicles+json; charset=utf-8")
        .header("Content-Disposition", 'attachment; filename="campaign.chronicle"')
        .send(serializeCampaignBundleV2(bundle));
    } catch (error) {
      if (error instanceof CampaignRestoreError) return reply.code(409).send({ error: "Für dieses Datenbankschema muss zuerst das Kampagnenformat aktualisiert werden." });
      throw error;
    }
  });
}
