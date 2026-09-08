// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2026 Kaya Yesilyurt - Atlas Chronicles. Siehe LICENSE.
import { createHash, randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { FastifyInstance } from "fastify";
import type { MapReference } from "@chronicle/protocol";
import type { TacticalMapDocumentV1 } from "@chronicle/szene";
import { buildApp } from "../src/app.ts";
import { createTestDb, migrate, type Db } from "../src/db/index.ts";
import { createIdentity } from "../src/identity/index.ts";
import { createCampaigns } from "../src/domain/campaigns.ts";
import { createAtlas } from "../src/domain/atlas.ts";
import { createBetreten } from "../src/domain/betreten.ts";
import { createGameplay } from "../src/domain/gameplay.ts";
import { createGrundriss } from "../src/domain/grundriss.ts";
import { createMapLifecycle } from "../src/domain/map-lifecycle.ts";
import { createTactical } from "../src/domain/tactical.ts";
import { Gone } from "../src/domain/errors.ts";

/** Independent cross-path review. Production code and the lifecycle builder's tests are
 * deliberately untouched; each case owns a separate ephemeral campaign. */
describe("map lifecycle independent cross-path review", () => {
  const config = { origin: "https://map-lifecycle-review.test", cookieSecret: "map-lifecycle-review-cookie-secret-over-32-characters", bootstrapToken: "map-lifecycle-review-bootstrap-over-32-characters" };
  let db: Db, gm: string, cookie: string, app: FastifyInstance;
  beforeAll(async () => {
    db = await createTestDb(); await migrate(db);
    const identity = createIdentity(db, config); gm = (await identity.bootstrap("Lifecycle reviewer")).userId;
    cookie = `chronicle_session=${(await identity.issueSession(gm)).value}`;
    app = await buildApp(db, config);
  }, 30_000);
  afterAll(async () => { await app?.close(); await db?.close(); });
  const campaign = async () => (await createCampaigns(db).createCampaign(gm, { name: `Review ${randomUUID()}` })).id;
  const document: TacticalMapDocumentV1 = { schemaVersion: 1, kind: "tactical-map", coordinates: "image-pixels",
    frame: { ursprung: [0, 0], einheitenProPixel: 1, ordnung: "xy", hoch: "unten" },
    geometry: { v: 3, size: [64, 64], stamps: [], places: [], regions: [{ id: "review-room", punkte: [[4, 4], [60, 4], [60, 60], [4, 60]] }] },
    grid: { kind: "none" }, elevation: 0, geometryElevation: [], walls: [], portals: [], lights: [],
    environment: { bakedLighting: false, ambientLightArgb: "ffffffff" }, background: null };
  const newMap = async (id: string, name = "Review map") => (await createTactical(db).importMap(gm, id, {
    commandId: randomUUID(), name, format: "native", sourceText: JSON.stringify(document),
    provenance: { name: "Review fixture", creator: "Review", sourceUrl: null, license: "CC0-1.0", licenseUrl: null, retrievedAt: null, generator: null, generatorVersion: null },
  })).subjectId;
  async function deletionInput(id: string, reference: MapReference) {
    const preview = await createMapLifecycle(db).preview(gm, id, reference);
    return { commandId: randomUUID(), expectedVersion: preview.root.version, confirmationHash: preview.confirmationHash,
      confirmedMapIds: preview.maps.map(map => `${map.kind}:${map.id}`).sort() };
  }
  const remove = async (id: string, reference: MapReference) => createMapLifecycle(db).remove(gm, id, reference, await deletionInput(id, reference));

  it("keeps the legacy entrance unambiguous after deleting and reimporting the identical Atlas source", async () => {
    const id = await campaign(), atlas = createAtlas(db), first = await atlas.importEronMap(gm, id);
    const nodeId = (await atlas.getMap(gm, id, first.id)).pins[0]!.id;
    const legacyUrl = `/api/campaigns/${id}/knoten/${nodeId}/betretbar`;
    expect((await app.inject({ url: legacyUrl, headers: { cookie } })).statusCode).toBe(200);
    await remove(id, { kind: "atlas", id: first.id });
    const next = await atlas.importEronMap(gm, id);
    expect(next.unchanged).toBe(false); expect(next.id).not.toBe(first.id);
    expect((await atlas.importEronMap(gm, id)).id).toBe(next.id);
    expect(await atlas.listMaps(gm, id)).toEqual([{ id: next.id, title: (await atlas.getMap(gm, id, next.id)).title }]);
    const scoped = await app.inject({ url: `/api/campaigns/${id}/maps/atlas/${next.id}/knoten/${nodeId}/betretbar`, headers: { cookie } });
    expect(scoped.statusCode).toBe(200);
    const legacy = await app.inject({ url: legacyUrl, headers: { cookie } });
    expect(legacy.statusCode, "only one ACTIVE Atlas instance owns this legacy address").toBe(200);
  });

  it("does not attach a retired generated result returned by an earlier internal import receipt", async () => {
    const id = await campaign(), parentMapId = await newMap(id), entrance = createBetreten(db, config);
    const scope = { parentKind: "tactical" as const, parentMapId }, knotenId = "review-room";
    const descriptor = await entrance.betretbar(gm, id, knotenId, scope), commandId = randomUUID();
    const importCommandId = createHash("sha256").update(`betreten-import:${commandId}`).digest("hex");
    const generated = await createGrundriss(db, config).generate(gm, id, { commandId: importCommandId,
      name: descriptor.titel, keim: descriptor.kindKeim!, art: "grundriss", stil: "grundriss", optionen: { setting: "fantasy" } });
    await remove(id, { kind: "tactical", id: generated.ack.subjectId });
    const response = await app.inject({ method: "POST", url: `/api/campaigns/${id}/betreten`, headers: { cookie, origin: config.origin },
      payload: { commandId, ...scope, knotenId, expectedVersion: descriptor.version } });
    expect(response.statusCode, "a retired import ACK must never create a new entrance").toBeGreaterThanOrEqual(400);
    expect((await createTactical(db).getMap(gm, id, parentMapId)).version).toBe(descriptor.version);
    expect((await db.query("SELECT 1 FROM betreten_karten WHERE campaign_id=$1", [id])).rowCount).toBe(0);
  });

  it("blocks old editor/source/tile paths and entry retries while keeping the original delete ACK after replacement", async () => {
    const id = await campaign(), parentMapId = await newMap(id), child = await newMap(id), grandchild = await newMap(id);
    const entrance = createBetreten(db, config), scope = { parentKind: "tactical" as const, parentMapId };
    const enter = { commandId: randomUUID(), ...scope, knotenId: "review-room", targetMapId: child, expectedVersion: 1 };
    await entrance.betrete(gm, id, enter);
    await entrance.betrete(gm, id, { commandId: randomUUID(), parentKind: "tactical", parentMapId: child, knotenId: "review-room", targetMapId: grandchild, expectedVersion: 1 });
    const ref = { kind: "tactical" as const, id: child }, input = await deletionInput(id, ref);
    expect(input.confirmedMapIds).toEqual([`tactical:${child}`, `tactical:${grandchild}`].sort());
    const ack = await createMapLifecycle(db).remove(gm, id, ref, input);
    expect(ack.parent?.id).toBe(parentMapId);
    for (const old of [child, grandchild]) for (const suffix of ["?revision=1", "/source?revision=1", "/uvtt?revision=1", "/tiles/0/0/0?revision=1"]) {
      expect((await app.inject({ url: `/api/campaigns/${id}/tactical/maps/${old}${suffix}`, headers: { cookie } })).statusCode, suffix).toBe(404);
    }
    await expect(entrance.betrete(gm, id, enter)).rejects.toMatchObject({ code: "map-deleted" });
    const replacement = await newMap(id);
    await entrance.betrete(gm, id, { ...enter, commandId: randomUUID(), targetMapId: replacement, expectedVersion: ack.parent!.version });
    expect(await createMapLifecycle(db).remove(gm, id, ref, input)).toEqual(ack);
    expect((await entrance.children(gm, id, scope)).nodes[0]!.vorhandeneKarteId).toBe(replacement);
    await expect(entrance.betrete(gm, id, enter)).rejects.toMatchObject({ code: "map-deleted" });
    const otherParent = await newMap(id);
    await expect(entrance.betrete(gm, id, { ...enter, commandId: randomUUID(), parentMapId: otherParent, expectedVersion: 1 })).rejects.toBeInstanceOf(Gone);
  });

  it("protects active sessions, keeps their later history and does not capture deleted plans into new sessions", async () => {
    const id = await campaign(), mapId = await newMap(id), tactical = createTactical(db), game = createGameplay(db);
    const scene = await game.createScene(gm, id, { name: "Past table", entryIds: [], fictionDate: "One" });
    await tactical.savePlan(gm, id, scene.id, { commandId: randomUUID(), expectedVersion: 0, mapId, mapRevision: 1, tokens: [] });
    const active = await game.startScene(gm, id, scene.id);
    if (typeof active.id !== "string") throw new Error("The started scene must return a session ID");
    const historical = await tactical.getSession(gm, id, active.id);
    const ref = { kind: "tactical" as const, id: mapId }, input = await deletionInput(id, ref);
    await expect(createMapLifecycle(db).remove(gm, id, ref, input)).rejects.toMatchObject({ code: "map-in-use" });
    const next = await game.createScene(gm, id, { name: "Elsewhere", entryIds: [], fictionDate: "Two" });
    await game.startScene(gm, id, next.id);
    await remove(id, ref);
    const after = await tactical.getSession(gm, id, active.id);
    expect(after.document).toEqual(historical.document); expect(after.active).toBe(false);
    expect((await tactical.getTile(gm, id, active.id, 0, 0, 0)).bytes.length).toBeGreaterThan(0);
    expect(await tactical.getPlan(gm, id, scene.id)).toMatchObject({ mapId, unavailable: "map-deleted" });
    await expect(game.startScene(gm, id, scene.id)).rejects.toMatchObject({ statusCode: 400, message: expect.stringContaining("gelöscht") });
  });
});
