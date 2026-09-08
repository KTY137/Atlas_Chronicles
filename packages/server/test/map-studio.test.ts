// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2026 Kaya Yesilyurt - Atlas Chronicles. Siehe LICENSE.
import { randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from "vitest";
import type { FastifyInstance } from "fastify";
import { applyInteriorEdit, type InteriorEditResult } from "@chronicle/forge";
import { currentCampaignSemanticDiff, parseCurrentCampaignBundle, serializeCurrentCampaignBundle } from "@chronicle/io";
import { parseAssetpaket, parseTacticalMapDocument, serializeTacticalMapDocument, type Knoten, type TacticalCartographyV1 } from "@chronicle/szene";
import type { TacticalMapCard } from "../../protocol/src/tactical.ts";
import { buildApp } from "../src/app.ts";
import { createTestDb, migrate, type Db } from "../src/db/index.ts";
import { createIdentity } from "../src/identity/index.ts";
import { createCampaigns } from "../src/domain/campaigns.ts";
import { createTactical } from "../src/domain/tactical.ts";
import { createBetreten } from "../src/domain/betreten.ts";
import { exportCampaignBundle, initializeCampaignRestoreTarget, restoreCampaignBundle } from "../src/domain/bundles.ts";

const assets = parseAssetpaket(readFileSync(new URL("../../../assets/packs/pk.grundriss/paket.json", import.meta.url), "utf8"));
const blank = () => parseTacticalMapDocument({ schemaVersion: 1, kind: "tactical-map", coordinates: "image-pixels", frame: { ursprung: [0, 0], einheitenProPixel: 1, ordnung: "xy", hoch: "unten" },
  geometry: { v: 3, size: [800, 600], regions: [], stamps: [], places: [] }, grid: { kind: "square", size: 40, origin: [0, 0] }, elevation: 0, geometryElevation: [], walls: [], portals: [], lights: [], environment: { bakedLighting: false, ambientLightArgb: "ffffffff" }, background: null });
const emptyCartography = (): TacticalCartographyV1 => ({ schemaVersion: 1, kind: "tactical-cartography", construction: { cellSize: 40, origin: [0, 0] }, regions: [] });
function success(result: InteriorEditResult): Extract<InteriorEditResult, { ok: true }> {
  expect(result.ok, result.ok ? "" : result.message).toBe(true);
  if (!result.ok) throw Error(result.message);
  return result;
}
const revise = (card: TacticalMapCard, result: Extract<InteriorEditResult, { ok: true }>) => ({ schemaVersion: 3 as const,
  commandId: randomUUID(), expectedVersion: card.version, document: result.document, cartography: result.cartography,
  anchors: card.anchors, addedBuildings: result.addedBuildings, addedRooms: result.addedRooms });

describe("map studio V3 saves room construction at the existing revision boundary", () => {
  let db: Db, app: FastifyInstance, gm: string, campaign: string, cookie: string, playerCookie: string;
  const config = { origin: "https://map-studio.test", cookieSecret: "map-studio-cookie-secret-over-32-characters", bootstrapToken: "map-studio-bootstrap-secret-over-32-characters", now: Date.now };
  beforeAll(async () => {
    db = await createTestDb(); await migrate(db);
    const identity = createIdentity(db, config), campaigns = createCampaigns(db);
    gm = (await identity.bootstrap("Kaya")).userId;
    campaign = (await campaigns.createCampaign(gm, { name: "Freies Kartenstudio" })).id;
    cookie = `chronicle_session=${(await identity.issueSession(gm)).value}`;
    const invite = await campaigns.issueInvitation(gm, campaign), pending = await campaigns.requestJoin(invite.code, { displayName: "Spielerin" });
    const player = (await campaigns.approveJoin(gm, campaign, pending.id)).userId;
    playerCookie = `chronicle_session=${(await identity.issueSession(player)).value}`;
  }, 30_000);
  // Each case exercises the real HTTP gate with an independent route rate-limit store.
  beforeEach(async () => { app = await buildApp(db, config); });
  afterEach(async () => { await app?.close(); });
  afterAll(async () => { await db?.close(); });
  const put = (mapId: string, payload: object, session = cookie) => app.inject({ method: "PUT", url: `/api/campaigns/${campaign}/tactical/maps/${mapId}/revision`, headers: { cookie: session, origin: config.origin }, payload });
  async function fixture() {
    const tactical = createTactical(db, config);
    const imported = await tactical.importMap(gm, campaign, { commandId: randomUUID(), name: "Freie Leinwand", format: "native", sourceText: serializeTacticalMapDocument(blank()),
      provenance: { name: "Studio fixture", creator: "Tests", sourceUrl: null, license: "CC0-1.0", licenseUrl: null, retrievedAt: null, generator: null, generatorVersion: null } }, { cartography: emptyCartography(), nodes: [] });
    const card = await tactical.getMap(gm, campaign, imported.subjectId);
    const created = success(applyInteriorEdit({ document: card.document, cartography: card.cartography!, protectedRegionIds: [], assets, operationId: randomUUID(),
      operation: { kind: "room", from: [80, 80], to: [240, 240], titel: "Gästezimmer", template: "bedroom", floor: "wood" } }));
    return { tactical, card, created, id: created.addedRooms[0]!.regionId };
  }
  const node = async (mapId: string, id: string) => (await db.query<{ data: Knoten }>("SELECT data FROM tactical_map_nodes WHERE map_id=$1 AND knoten_id=$2", [mapId, id])).rows[0]?.data;

  it("persists a furnished room and real door, moves their exact IDs, and restores all ownership through a native archive", async () => {
    const f = await fixture();
    const doorway = success(applyInteriorEdit({ ...f.created, protectedRegionIds: [], operationId: randomUUID(), operation: { kind: "door", at: [160, 80], width: 40 } }));
    const input = revise(f.card, { ...doorway, addedRooms: f.created.addedRooms });
    const savedResponse = await put(f.card.id, input);
    expect(savedResponse.statusCode, savedResponse.body).toBe(200);
    const saved = await f.tactical.getMap(gm, campaign, f.card.id);
    expect(saved.version).toBe(2); expect(saved.document).toEqual(input.document); expect(saved.cartography).toEqual(input.cartography);
    const storedNode = await node(saved.id, f.id);
    expect(storedNode).toMatchObject({ id: f.id, art: "raum", titel: "Gästezimmer", herkunft: { erzeuger: "chronicle-manual-cartography" } });
    expect(saved.document.geometry.stamps.length).toBeGreaterThan(0); expect(saved.document.portals).toHaveLength(1);
    const role = saved.cartography!.regions.find(region => region.regionId === f.id)!;
    expect(role.role).toBe("room"); if (role.role !== "room" || !role.interior) throw Error("Missing saved interior");
    expect(role.interior.wallIds).toHaveLength(saved.document.walls.length);
    expect(role.interior.portalIds).toEqual(saved.document.portals.map(portal => portal.id));
    expect(role.interior.stampIds).toEqual(saved.document.geometry.stamps.map(stamp => stamp.id));
    expect((await put(saved.id, input)).json()).toEqual(savedResponse.json());
    const moved = success(applyInteriorEdit({ document: saved.document, cartography: saved.cartography!, protectedRegionIds: [], operationId: randomUUID(),
      operation: { kind: "interior-transform", target: { kind: "room", id: f.id }, delta: [280, 160], quarterTurns: 1 } }));
    const movedInput = revise(saved, moved), movedResponse = await put(saved.id, movedInput);
    expect(movedResponse.statusCode, movedResponse.body).toBe(200);
    const current = await f.tactical.getMap(gm, campaign, saved.id);
    expect(current.document).toEqual(moved.document); expect(current.cartography).toEqual(moved.cartography);
    expect(current.cartography!.regions.find(region => region.regionId === f.id)).toMatchObject({ role: "room", authored: true, provenance: null, interior: role.interior });
    expect(current.document.geometry.regions.map(region => region.id)).toEqual(saved.document.geometry.regions.map(region => region.id));
    for (const key of ["walls", "portals"] as const) expect(current.document[key].map(value => value.id)).toEqual(saved.document[key].map(value => value.id));
    expect(current.document.geometry.stamps.map(stamp => stamp.id)).toEqual(saved.document.geometry.stamps.map(stamp => stamp.id));
    expect(await node(current.id, f.id)).toEqual(storedNode);
    expect((await f.tactical.getMap(gm, campaign, current.id, 2)).document).toEqual(saved.document);
    const children = await createBetreten(db, config).children(gm, campaign, { parentKind: "tactical", parentMapId: current.id });
    expect(children.nodes.find(child => child.knotenId === f.id)).toMatchObject({ art: "raum", titel: "Gästezimmer" });
    const bundle = await exportCampaignBundle(db, gm, campaign), parsed = parseCurrentCampaignBundle(serializeCurrentCampaignBundle(bundle)), target = await createTestDb();
    try {
      await initializeCampaignRestoreTarget(target); await restoreCampaignBundle(target, parsed);
      const restored = await createTactical(target, config).getMap(gm, campaign, current.id);
      expect(restored.document).toEqual(current.document); expect(restored.cartography).toEqual(current.cartography);
      expect((await target.query<{ data: Knoten }>("SELECT data FROM tactical_map_nodes WHERE map_id=$1 AND knoten_id=$2", [current.id, f.id])).rows[0]!.data).toEqual(storedNode);
      expect(currentCampaignSemanticDiff(bundle, await exportCampaignBundle(target, gm, campaign))).toEqual([]);
    } finally { await target.close(); }
  }, 60_000);

  it("rejects absent, duplicate and unrelated room intents without a revision, node or receipt", async () => {
    const f = await fixture(), valid = revise(f.card, f.created);
    for (const addedRooms of [[], [...valid.addedRooms, ...valid.addedRooms], [{ regionId: "missing-room", titel: "Falsch" }]]) {
      const input = { ...valid, commandId: randomUUID(), addedRooms }, response = await put(f.card.id, input);
      expect(response.statusCode, response.body).toBe(400);
      expect((await f.tactical.getMap(gm, campaign, f.card.id)).version).toBe(1);
      expect(await node(f.card.id, f.id)).toBeUndefined();
      expect((await db.query("SELECT 1 FROM tactical_command_receipts WHERE command_id=$1", [input.commandId])).rowCount).toBe(0);
    }
  });

  it("rejects dangling construction references and unknown ownership versions atomically", async () => {
    const f = await fixture(), valid = revise(f.card, f.created);
    for (const override of [{ wallIds: ["missing-wall"] }, { stampIds: ["missing-stamp"] }, { portalIds: ["missing-door"] }, { lightIds: ["missing-light"] }, { schemaVersion: 2 }]) {
      const cartography = { ...valid.cartography, regions: valid.cartography.regions.map(role => role.role === "room" ? { ...role, interior: { ...role.interior, ...override } } : role) };
      const response = await put(f.card.id, { ...valid, commandId: randomUUID(), cartography });
      expect(response.statusCode, response.body).toBe(400);
      expect((await f.tactical.getMap(gm, campaign, f.card.id)).document).toEqual(f.card.document);
      expect(await node(f.card.id, f.id)).toBeUndefined();
    }
  });

  it("does not convert an existing generic region into an unnamed built room without a room intent", async () => {
    const f = await fixture(), shape = f.created.document.geometry.regions[0]!;
    const genericDocument = { ...f.card.document, geometry: { ...f.card.document.geometry, regions: [shape] } };
    const genericCartography: TacticalCartographyV1 = { ...f.card.cartography!, regions: [{ regionId: shape.id, role: "generic", authored: true, locked: false, provenance: null }] };
    const generic = await put(f.card.id, { ...revise(f.card, f.created), document: genericDocument, cartography: genericCartography, addedRooms: [] });
    expect(generic.statusCode, generic.body).toBe(200);
    const before = await f.tactical.getMap(gm, campaign, f.card.id);
    const converted = await put(f.card.id, { ...revise(before, f.created), addedRooms: [] });
    expect(converted.statusCode, converted.body).toBe(400);
    expect((await f.tactical.getMap(gm, campaign, f.card.id)).document).toEqual(before.document);
    expect(await node(f.card.id, f.id)).toBeUndefined();
  });

  it("rejects a player's V3 room mutation and prevents replay under a stale revision", async () => {
    const f = await fixture(), input = revise(f.card, f.created);
    expect((await put(f.card.id, input, playerCookie)).statusCode).toBe(404);
    expect((await f.tactical.getMap(gm, campaign, f.card.id)).version).toBe(1);
    expect((await put(f.card.id, input)).statusCode).toBe(200);
    expect((await put(f.card.id, { ...input, commandId: randomUUID() })).statusCode).toBe(409);
    expect((await f.tactical.getMap(gm, campaign, f.card.id)).version).toBe(2);
  });
});
