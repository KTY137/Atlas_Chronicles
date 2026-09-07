import type { FastifyInstance } from "fastify";
import { serializeCurrentCampaignBundle } from "@chronicle/io";
import type { Db } from "../db/index.ts";
import type { AppConfig } from "../app.ts";
import { createIdentity } from "../identity/index.ts";
import { exportCampaignBundle, CampaignRestoreError } from "../domain/bundles.ts";

/** Buchstaben aller Schriften bleiben; alles andere wird zum Bindestrich. Wie in `documents.ts`. */
const slug = (value: string) => value.normalize("NFKC").trim().toLowerCase().replace(/[^\p{L}\p{N}_-]+/gu, "-").replace(/^-|-$/g, "");

export function registerBundles(app: FastifyInstance, db: Db, config: AppConfig) {
  const identity = createIdentity(db, config);
  app.get<{ Params: { campaignId: string } }>("/api/campaigns/:campaignId/export", { config: { rateLimit: { max: 4, timeWindow: "1 minute" } } }, async (request, reply) => {
    const user = await identity.authenticate(request.headers.cookie);
    try {
      const bundle = await exportCampaignBundle(db, user.userId, request.params.campaignId, config);
      // Der Name der Welt steht im Dateinamen. Vorher hiess jeder Export `campaign.chronicle`:
      // wer drei Kampagnen sichert, hatte dreimal denselben Namen im Ordner liegen und musste
      // sie oeffnen, um sie zu unterscheiden. Der Name kommt aus dem Paket, nicht aus einer
      // zweiten Abfrage — dort steht er ohnehin schon.
      const name = slug(String(bundle.tables.campaigns[0]?.name ?? "")) || "kampagne";
      const ascii = `${name}.chronicle`.replace(/[^\x20-\x7e]/g, "_").replaceAll('"', "");
      return reply.type("application/vnd.atlas-chronicles+json; charset=utf-8")
        .header("Content-Disposition", `attachment; filename="${ascii}"; filename*=UTF-8''${encodeURIComponent(`${name}.chronicle`)}`)
        .send(serializeCurrentCampaignBundle(bundle));
    } catch (error) {
      if (error instanceof CampaignRestoreError) return reply.code(409).send({ error: "Für dieses Datenbankschema muss zuerst das Kampagnenformat aktualisiert werden." });
      throw error;
    }
  });
}
