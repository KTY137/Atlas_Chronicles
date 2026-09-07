import Fastify, { type FastifyError, type FastifyRequest, type FastifyReply } from "fastify";
import { readFile } from "node:fs/promises";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { AzgaarImportError } from "@chronicle/forge";
import { createTestDb, migrate, type Db } from "../src/db/index.ts";
import { createIdentity } from "../src/identity/index.ts";
import { createCampaigns } from "../src/domain/campaigns.ts";
import { createAtlas } from "../src/domain/atlas.ts";
import { Gone } from "../src/domain/errors.ts";
import { registerImports } from "../src/http/imports.ts";

describe("persisted ERON maps and authorized raster delivery", () => {
  const config = { origin: "https://eron-map.test", cookieSecret: "eron-map-secret-longer-than-thirty-two-characters", bootstrapToken: "eron-map-bootstrap-token-long-enough" };
  let db: Db, gm: string, campaign: string, otherCampaign: string, player: string, actor: string, cookie: string, playerCookie: string;
  let app: ReturnType<typeof Fastify>, mapId: string;
  beforeAll(async () => {
    db = await createTestDb(); await migrate(db);
    const identity = createIdentity(db, config), account = await identity.bootstrap("Kaya ERON"); gm = account.userId; cookie = account.setCookie.split(";")[0]!;
    const campaigns = createCampaigns(db); campaign = (await campaigns.createCampaign(gm, { name: "Andaria" })).id;
    otherCampaign = (await campaigns.createCampaign(gm, { name: "Other world" })).id;
    const invite = await campaigns.issueInvitation(gm, campaign), join = await campaigns.requestJoin(invite.code, { displayName: "Eron player" });
    const approved = await campaigns.approveJoin(gm, campaign, join.id); player = approved.userId; actor = approved.actorId;
    playerCookie = (await identity.issueSession(player, "cookie")).setCookie.split(";")[0]!;
    app = Fastify(); app.setErrorHandler((error: FastifyError, _req: FastifyRequest, reply: FastifyReply) => reply.code(error instanceof Gone ? 404 : error instanceof AzgaarImportError || error.validation ? 400 : 500).send({ error: error.message }));
    registerImports(app, db, config);
  }, 30_000);
  afterAll(async () => { await app?.close(); await db?.close(); });
  const url = (path: string) => `/api/campaigns/${campaign}${path}`;

  it("imports the bundled source once and returns existing content on repetition and JSON upload", async () => {
    const first = await app.inject({ method: "POST", url: url("/maps/eron"), headers: { cookie } });
    expect(first.statusCode).toBe(200); const result = first.json(); mapId = result.id;
    expect(result).toMatchObject({ unchanged: false, report: { orte: 190 } });
    expect((await app.inject({ method: "POST", url: url("/maps/eron"), headers: { cookie } })).json()).toMatchObject({ id: mapId, unchanged: true });
    const json = await readFile(new URL("../../../design/fixtures/eron/map-andaria.json", import.meta.url), "utf8");
    expect(await createAtlas(db).importMap(gm, campaign, json)).toMatchObject({ id: mapId, unchanged: true });
    expect((await db.query("SELECT id FROM atlas_maps WHERE campaign_id=$1", [campaign])).rowCount).toBe(1);
    const source = (await db.query<{ kind: string; source: { quelle: { json: string } } }>("SELECT kind,source FROM artifacts WHERE campaign_id=$1", [campaign])).rows[0]!;
    expect(source.kind).toBe("eron-map"); expect(source.source.quelle.json).toBe(json);
  });

  it("projects real clickable pins and original symbols, and keeps the full raster GM-only", async () => {
    const service = createAtlas(db), view = await service.getMap(gm, campaign, mapId);
    expect(view.pins).toHaveLength(190); expect(view.nodes).toHaveLength(191);
    expect(view.pins.find(p => p.label === "Akkator")).toMatchObject({ x: 3086.2545931518985, y: 3098.25, icon: "city", category: "Terabur", color: 0x007afa, symbol: "T" });
    expect(view.background).toEqual({ url: url(`/maps/${mapId}/image`), width: 8192, height: 8192 });
    const pin = view.pins.find(p => p.label === "Akkator")!;
    expect(view.nodes.find(n => n.id === pin.id)).toMatchObject({ canEnter: true });
    await service.revealNode(gm, campaign, mapId, pin.id, actor);
    const projected = await service.getMap(player, campaign, mapId);
    expect(projected.pins).toHaveLength(1); expect(projected).not.toHaveProperty("background");
    expect(projected.nodes[0]).not.toHaveProperty("canEnter"); expect(projected.nodes[0]).not.toHaveProperty("childMapId");
    await expect(service.getNode(player, campaign, mapId, pin.id)).rejects.toBeInstanceOf(Gone);
    expect(JSON.stringify(projected)).not.toContain("kindKeim");
  });

  it("serves only the authenticated GM's canonical map image without shared caching", async () => {
    const response = await app.inject({ method: "GET", url: url(`/maps/${mapId}/image`), headers: { cookie } });
    expect(response.statusCode).toBe(200); expect(response.headers["content-type"]).toContain("image/webp");
    expect(response.headers["cache-control"]).toBe("private, no-store");
    expect(response.rawPayload.subarray(0, 4).toString("ascii")).toBe("RIFF");
    expect(response.rawPayload.subarray(8, 12).toString("ascii")).toBe("WEBP");
    expect((await app.inject({ method: "GET", url: url(`/maps/${mapId}/image`), headers: { cookie: playerCookie } })).statusCode).toBe(404);
    expect((await app.inject({ method: "GET", url: `/api/campaigns/${otherCampaign}/maps/${mapId}/image`, headers: { cookie } })).statusCode).toBe(404);
    expect((await app.inject({ method: "GET", url: url(`/maps/${mapId}/image`) })).statusCode).toBe(404);
    expect((await app.inject({ method: "POST", url: url("/maps/eron"), headers: { cookie: playerCookie } })).statusCode).toBe(404);
  });

  it("rejects broken source JSON through the existing upload route", async () => {
    const response = await app.inject({ method: "POST", url: url("/maps/import"), headers: { cookie }, payload: { json: '{"mapBounds":[],"mapImage":"x"}' } });
    expect(response.statusCode).toBe(400);
  });
});
