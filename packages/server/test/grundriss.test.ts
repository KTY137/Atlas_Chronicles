import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { FastifyInstance } from "fastify";
import { buildApp } from "../src/app.ts";
import { createTestDb, migrate, type Db } from "../src/db/index.ts";
import { createIdentity } from "../src/identity/index.ts";
import { createCampaigns } from "../src/domain/campaigns.ts";
import { createTactical } from "../src/domain/tactical.ts";
import { createGameplay } from "../src/domain/gameplay.ts";

/**
 * The generator, reachable.
 *
 * `packages/forge/src/grundriss.ts` was finished and tested for hours while being invocable by
 * nobody: no route, no surface, `erzeugeGrundriss` absent from every file under `packages/server`
 * and `packages/client`. Its own unit tests proved the algorithm; they could not prove the thing
 * that actually matters, which is that a generated map arrives in the product as an ordinary map.
 *
 * That is what this file measures, and the assertions are chosen so it cannot pass by accident:
 * the generated map must be openable and readable through the *import* subsystem's own reads,
 * because it went in through the import subsystem's own door.
 */
describe("die eigene Erzeugung, an das Produkt angeschlossen", () => {
  let db: Db, app: FastifyInstance, gm: string, cookie: string, campaign: string;
  const config = {
    origin: "https://grundriss.test",
    cookieSecret: "grundriss-test-cookie-secret-more-than-32-characters",
    bootstrapToken: "grundriss-bootstrap-secret-long-enough",
  };

  beforeAll(async () => {
    db = await createTestDb(); await migrate(db);
    const identity = createIdentity(db, config);
    gm = (await identity.bootstrap("Kaya")).userId;
    cookie = `chronicle_session=${(await identity.issueSession(gm)).value}`;
    app = await buildApp(db, config);
    campaign = (await createCampaigns(db).createCampaign(gm, { name: "Erzeugung" })).id;
  }, 30_000);
  afterAll(async () => { await app?.close(); await db?.close(); });

  const post = (path: string, payload: unknown) =>
    app.inject({ method: "POST", url: `/api/campaigns/${campaign}${path}`, headers: { cookie, origin: config.origin }, payload: payload as object });
  const body = (over: Record<string, unknown> = {}) => ({ commandId: randomUUID(), name: "Die Krypta", keim: "kaya-krypta-1", ...over });

  it("offers the generator's own defaults, so the surface cannot invent its own", async () => {
    const response = await app.inject({ method: "GET", url: `/api/campaigns/${campaign}/tactical/generate/defaults`, headers: { cookie, origin: config.origin } });
    expect(response.statusCode).toBe(200);
    const defaults = response.json();
    expect(defaults.zellen).toHaveLength(2);
    expect(defaults.raeume).toBeGreaterThan(0);
  });

  it("previews without persisting anything", async () => {
    const before = await createTactical(db).listMaps(gm, campaign);
    const response = await post("/tactical/generate/preview", body());
    expect(response.statusCode).toBe(200);
    const preview = response.json();
    expect(preview.keimHash).toMatch(/^[a-f0-9]{64}$/);
    expect(preview.raeume).toBeGreaterThan(0);
    expect(preview.groesse).toHaveLength(2);
    expect(await createTactical(db).listMaps(gm, campaign)).toHaveLength(before.length);
  });

  it("persists a generated floorplan as an ordinary tactical map", async () => {
    const response = await post("/tactical/generate", body({ name: "Die erste Krypta" }));
    expect(response.statusCode).toBe(200);
    const created = response.json();
    expect(created.ack.subjectId).toBeTruthy();
    expect(created.ack.version).toBe(1);

    // The point of the whole exercise: it is readable through the import subsystem's own path.
    const tactical = createTactical(db);
    const maps = await tactical.listMaps(gm, campaign);
    expect(maps.some(map => map.id === created.ack.subjectId && map.name === "Die erste Krypta")).toBe(true);

    const map = await tactical.getMap(gm, campaign, created.ack.subjectId);
    expect(map.document.kind).toBe("tactical-map");
    expect(map.document.geometry.regions.length).toBeGreaterThan(0);
    // A generated map has no photograph, and the map subsystem must be fine with that.
    expect(map.document.background).toBeNull();
  });

  it("records the generator in the provenance rather than claiming we drew it", async () => {
    const created = (await post("/tactical/generate", body({ name: "Herkunft" }))).json();
    const source = await createTactical(db).getSource(gm, campaign, created.ack.subjectId);
    expect(source.provenance.generator).toBe("chronicle-grundriss");
    expect(source.provenance.generatorVersion).toBeTruthy();
    expect(source.format).toBe("native");
  });

  it("is reproducible: the same seed and options yield the same keimHash", async () => {
    const one = (await post("/tactical/generate/preview", body())).json();
    const two = (await post("/tactical/generate/preview", body())).json();
    expect(two.keimHash).toBe(one.keimHash);
    expect(two.raeume).toBe(one.raeume);
  });

  it("treats a changed option vector as a different map, not the same one differently", async () => {
    // RB-21d measured the trap this defends: the same seed under a changed canvas kept
    // `(id, name)` for 0 of 664 generated settlements. A seed alone is not a world identity.
    const plain = (await post("/tactical/generate/preview", body())).json();
    const wider = (await post("/tactical/generate/preview", body({ optionen: { raeume: 12 } }))).json();
    expect(wider.keimHash).not.toBe(plain.keimHash);
  });

  it("refuses an impossible request as a user error, not a server fault", async () => {
    const response = await post("/tactical/generate", body({ optionen: { raeume: 100000 } }));
    expect(response.statusCode).toBeGreaterThanOrEqual(400);
    expect(response.statusCode).toBeLessThan(500);
  });

  it("does not let a member without leitung generate", async () => {
    const campaigns = createCampaigns(db);
    const invite = await campaigns.issueInvitation(gm, campaign);
    const join = await campaigns.requestJoin(invite.code, { displayName: "Spielerin" });
    const approved = await campaigns.approveJoin(gm, campaign, join.id);
    const session = await createIdentity(db, config).issueSession(approved.userId);
    const response = await app.inject({
      method: "POST",
      url: `/api/campaigns/${campaign}/tactical/generate`,
      headers: { cookie: `chronicle_session=${session.value}`, origin: config.origin },
      payload: body({ name: "Heimlich" }) as object,
    });
    expect(response.statusCode).toBeGreaterThanOrEqual(400);
    const maps = await createTactical(db).listMaps(gm, campaign);
    expect(maps.every(map => map.name !== "Heimlich")).toBe(true);
  });
  it("tells the play view there is no raster, so the renderer draws the geometry solid", async () => {
    // The defect this pins: every scene builder set `rasterScope` unconditionally from a content
    // hash. For a generated map — pure geometry, `background: null` — that made the renderer treat
    // the cells as an 8 % tint over a photograph that does not exist, and made the canvas request
    // tiles for it. A generated map would have looked like a blank page: the exact failure mode
    // "no fake previews" is about, arrived at honestly through a wrong assumption rather than a
    // shortcut. `rasterDigest` cannot answer the question — it is a hash of the visibility scope
    // and is always present.
    const created = (await post("/tactical/generate", body({ name: "Sichtprobe" }))).json();
    const game = createGameplay(db), tactical = createTactical(db);
    const scene = await game.createScene(gm, campaign, { name: "Sichtprobe", entryIds: [], fictionDate: "Heute" });
    await tactical.savePlan(gm, campaign, scene.id, {
      commandId: randomUUID(), expectedVersion: 0, mapId: created.ack.subjectId, mapRevision: 1, tokens: [],
    });
    await game.startScene(gm, campaign, scene.id);
    const view = await tactical.getActive(gm, campaign);
    expect(view).not.toBeNull();
    expect(view!.hatRaster).toBe(false);
    expect(view!.regions.length).toBeGreaterThan(0);
  });
});
