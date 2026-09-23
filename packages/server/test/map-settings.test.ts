// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2026 Kaya Yesilyurt - Atlas Chronicles. Siehe LICENSE.
import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { FastifyInstance } from "fastify";
import { Value } from "@sinclair/typebox/value";
import { BAUWERK_TYPEN, KARTEN_SETTINGS, serializeTacticalMapDocument, type BauwerkTyp, type KartenSetting, type Knoten } from "@chronicle/szene";
import { currentCampaignSemanticDiff, parseCurrentCampaignBundle, serializeCurrentCampaignBundle } from "@chronicle/io";
import { buildApp } from "../src/app.ts";
import { createTestDb, migrate, type Db } from "../src/db/index.ts";
import { createIdentity } from "../src/identity/index.ts";
import { createCampaigns } from "../src/domain/campaigns.ts";
import { createGrundriss, validateKartenOptionen, type KartenOptionen } from "../src/domain/grundriss.ts";
import { createBetreten } from "../src/domain/betreten.ts";
import { createTactical } from "../src/domain/tactical.ts";
import { exportCampaignBundle, initializeCampaignRestoreTarget, restoreCampaignBundle } from "../src/domain/bundles.ts";
import { GrundrissSchema } from "../src/http/grundriss.ts";
import { BetretenSchema, KnotenMetadataSchema } from "../src/http/betreten.ts";

describe("Kartensettings: generation, inherited interiors and native evidence", () => {
  let db: Db, app: FastifyInstance, gm: string, campaign: string, other: string, cookie: string, playerCookie: string;
  const config = { origin: "https://map-settings.test", cookieSecret: "map-settings-cookie-secret-over-32-characters", bootstrapToken: "map-settings-bootstrap-secret-over-32-characters" };
  beforeAll(async () => {
    db = await createTestDb(); await migrate(db);
    const identity = createIdentity(db, config), campaigns = createCampaigns(db);
    gm = (await identity.bootstrap("Kaya")).userId;
    campaign = (await campaigns.createCampaign(gm, { name: "Zeitwelten" })).id;
    other = (await campaigns.createCampaign(gm, { name: "Andere Welt" })).id;
    cookie = `chronicle_session=${(await identity.issueSession(gm)).value}`;
    const invite = await campaigns.issueInvitation(gm, campaign), join = await campaigns.requestJoin(invite.code, { displayName: "Spielerin" });
    const player = (await campaigns.approveJoin(gm, campaign, join.id)).userId;
    playerCookie = `chronicle_session=${(await identity.issueSession(player)).value}`;
    app = await buildApp(db, config);
  }, 30_000);
  afterAll(async () => { await app?.close(); await db?.close(); });
  const post = (path: string, payload: object, session = cookie, campaignId = campaign) => app.inject({ method: "POST", url: `/api/campaigns/${campaignId}${path}`, headers: { cookie: session, origin: config.origin }, payload });
  const request = (setting: KartenSetting, over: object = {}) => ({ commandId: randomUUID(), name: "Zeitstadt", keim: "same-time-seed", art: "siedlung", stil: "zeitwelten", optionen: { setting, art: "weiler", bauwerke: 9 }, ...over });
  const nodes = async (mapId: string) => (await db.query<{ data: Knoten }>("SELECT data FROM tactical_map_nodes WHERE map_id=$1", [mapId])).rows.map(row => row.data);

  it("publishes defaults and accepts every shared building profile at all HTTP boundaries", async () => {
    const response = await app.inject({ method: "GET", url: `/api/campaigns/${campaign}/tactical/generate/defaults` });
    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({ grundriss: { setting: "fantasy" }, siedlung: { setting: "fantasy" }, stile: expect.arrayContaining([{ id: "zeitwelten", titel: "Zeitwelten" }]) });
    expect(BAUWERK_TYPEN).toHaveLength(33); // 2026-09-23: +5 Fantasy-Typen der Viertelstadt
    for (const profil of BAUWERK_TYPEN) {
      expect(Value.Check(GrundrissSchema, request("gegenwart", { art: "grundriss", optionen: { setting: "gegenwart", profil } })), profil).toBe(true);
      expect(Value.Check(BetretenSchema, { commandId: "enter", knotenId: "node", optionen: { setting: "scifi", profil } }), profil).toBe(true);
      expect(Value.Check(KnotenMetadataSchema, { commandId: "edit", expectedVersion: 1, titel: "Ort", bauwerk: { typ: profil, beschreibung: "" } }), profil).toBe(true);
    }
  });

  it("previews distinct settings without writes and saves the exact Zeitwelten document", async () => {
    const tactical = createTactical(db), before = (await tactical.listMaps(gm, campaign)).length;
    const counts = () => db.query("SELECT (SELECT count(*) FROM tactical_sources) AS sources, (SELECT count(*) FROM tactical_map_nodes) AS nodes, (SELECT count(*) FROM betreten_command_receipts) AS receipts");
    const retained = (await counts()).rows;
    const hashes = new Set<string>();
    for (const setting of KARTEN_SETTINGS) {
      const input = request(setting), preview = await post("/tactical/generate/preview", input);
      expect(preview.statusCode, preview.body).toBe(200);
      const value = preview.json(); hashes.add(value.keimHash);
      expect(value.setting).toBe(setting); expect(value.stil).toBe("zeitwelten");
      expect(value.document.geometry.stamps.length).toBeGreaterThan(0);
      expect(value.document.geometry.stamps.every((stamp: { a: string }) => stamp.a.startsWith("pk.zeitwelten/"))).toBe(true);
      expect(value.nodes.every((node: { art: string }) => node.art === "bauwerk")).toBe(true);
      expect(await tactical.listMaps(gm, campaign)).toHaveLength(before);
    }
    expect((await counts()).rows).toEqual(retained);
    expect(hashes.size).toBe(KARTEN_SETTINGS.length);
    const input = request("gegenwart"), preview = await post("/tactical/generate/preview", input), saved = await post("/tactical/generate", input);
    expect(saved.statusCode, saved.body).toBe(200);
    const mapId = saved.json().ack.subjectId;
    expect((await tactical.getMap(gm, campaign, mapId)).document).toEqual(preview.json().document);
    expect((await tactical.getSource(gm, campaign, mapId)).provenance).toMatchObject({ setting: "gegenwart", generator: "chronicle-siedlung" });
    expect(await createBetreten(db, config).children(gm, campaign, { parentKind: "tactical", parentMapId: mapId })).toMatchObject({ setting: "gegenwart", stil: "zeitwelten" });
  });

  it("serves all 300 genre assets and retains the new style when entering and reopening a building", async () => {
    const catalogue = await app.inject({ url: "/api/packs", headers: { cookie } });
    expect(catalogue.json()).toEqual(expect.arrayContaining([expect.objectContaining({ id: "pk.genres", assetCount: 300 })]));
    const manifest = await app.inject({ url: "/api/packs/pk.genres/manifest", headers: { cookie } });
    const pack = manifest.json(); expect(pack.assets).toHaveLength(300);
    for (const asset of pack.assets) {
      const image = await app.inject({ url: `/api/packs/pk.genres/asset/${asset.datei}`, headers: { cookie } });
      expect(image.statusCode, asset.name).toBe(200); expect(image.headers["content-type"]).toContain("image/svg+xml");
    }
    const input = request("scifi", { stil: "genres" }), preview = await post("/tactical/generate/preview", input);
    expect(preview.statusCode, preview.body).toBe(200); expect(preview.json().stil).toBe("genres");
    const saved = await post("/tactical/generate", input); expect(saved.statusCode, saved.body).toBe(200);
    const mapId = saved.json().ack.subjectId, tactical = createTactical(db), betreten = createBetreten(db, config);
    expect((await tactical.getMap(gm, campaign, mapId)).document).toEqual(preview.json().document);
    const scope = { parentKind: "tactical" as const, parentMapId: mapId }, list = await betreten.children(gm, campaign, scope);
    expect(list).toMatchObject({ stil: "genres", setting: "scifi" });
    const knotenId = list.nodes[0]!.knotenId;
    const entered = await betreten.betrete(gm, campaign, { commandId: randomUUID(), ...scope, knotenId, expectedVersion: list.version });
    const child = await tactical.getMap(gm, campaign, entered.mapId);
    expect(child.document.geometry.stamps.some(stamp => stamp.a.startsWith("pk.genres/"))).toBe(true);
    expect(await betreten.children(gm, campaign, { parentKind: "tactical", parentMapId: child.id })).toMatchObject({ stil: "genres", setting: "scifi" });
    const again = await betreten.betrete(gm, campaign, { commandId: randomUUID(), ...scope, knotenId, expectedVersion: list.version });
    expect(again.mapId).toBe(child.id); expect(await tactical.getMap(gm, campaign, child.id)).toEqual(child);
  }, 30_000);

  it("carries modern settlement options through the nested HTTP union", async () => {
    const root = await createGrundriss(db, config).generate(gm, campaign, { commandId: randomUUID(), name: "Eingang", keim: "modern-settlement-through-door", optionen: { profil: "haus" } });
    const scope = { parentKind: "tactical" as const, parentMapId: root.ack.subjectId }, betreten = createBetreten(db, config), list = await betreten.children(gm, campaign, scope);
    const response = await post("/betreten", { commandId: randomUUID(), ...scope, knotenId: list.nodes[0]!.knotenId, expectedVersion: list.version,
      art: "siedlung", stil: "zeitwelten", optionen: { setting: "gegenwart", art: "stadt", ausdehnung: [32, 24], zellgroesse: 64, bauwerke: 18, strassenDichte: .4, grundstueck: [3, 5], licht: false } });
    expect(response.statusCode, response.body).toBe(200);
    const mapId = response.json().mapId, map = await createTactical(db).getMap(gm, campaign, mapId);
    expect(map.document.geometry.size).toEqual([32 * 64, 24 * 64]);
    expect(map.document.lights).toEqual([]);
    expect(await betreten.children(gm, campaign, { parentKind: "tactical", parentMapId: mapId })).toMatchObject({ art: "siedlung", setting: "gegenwart", stil: "zeitwelten" });
    expect((await createTactical(db).getSource(gm, campaign, mapId)).provenance).toMatchObject({ setting: "gegenwart", generator: "chronicle-siedlung" });
  });

  it.each([
    { setting: "gegenwart" as const, typ: "polizei" as const, room: "Gewahrsam" },
    { setting: "scifi" as const, typ: "medstation" as const, room: "Isolationsstation" },
  ])("inherits $setting and stored $typ; retries and later choices reopen the same child", async ({ setting, typ, room }) => {
    const saved = await post("/tactical/generate", request(setting)); expect(saved.statusCode, saved.body).toBe(200);
    const parentMapId = saved.json().ack.subjectId, scope = { parentKind: "tactical" as const, parentMapId }, betreten = createBetreten(db, config), tactical = createTactical(db);
    const list = await betreten.children(gm, campaign, scope), knotenId = list.nodes[0]!.knotenId;
    const edited = await app.inject({ method: "PUT", url: `/api/campaigns/${campaign}/maps/tactical/${parentMapId}/knoten/${knotenId}/metadata`, headers: { cookie, origin: config.origin },
      payload: { commandId: randomUUID(), expectedVersion: list.version, titel: "Die neue Zentrale", bauwerk: { typ, beschreibung: "Am Hauptplatz" } } });
    expect(edited.statusCode, edited.body).toBe(200);
    expect(await betreten.betretbar(gm, campaign, knotenId, scope)).toMatchObject({ setting, stil: "zeitwelten", bauwerk: { typ } });
    const input = { commandId: randomUUID(), ...scope, knotenId, expectedVersion: edited.json().version, optionen: { profil: "haus" } };
    expect((await post("/betreten", { ...input, expectedVersion: list.version })).statusCode).toBe(409);
    const entered = await post("/betreten", input); expect(entered.statusCode, entered.body).toBe(200);
    const childId = entered.json().mapId, child = await tactical.getMap(gm, campaign, childId), childNodes = await nodes(childId);
    expect(childNodes.find(node => node.art === "bauwerk")?.bauwerk?.typ).toBe(typ);
    expect(childNodes.map(node => node.titel)).toContain(room);
    expect(child.document.geometry.stamps.some(stamp => stamp.a.startsWith("pk.zeitwelten/"))).toBe(true);
    expect((await tactical.getSource(gm, campaign, childId)).provenance.setting).toBe(setting);
    expect(await betreten.children(gm, campaign, { parentKind: "tactical", parentMapId: childId })).toMatchObject({ setting, stil: "zeitwelten" });
    expect((await post("/betreten", input)).json()).toEqual(entered.json());
    const count = (await tactical.listMaps(gm, campaign)).length;
    const changed = await post("/betreten", { ...input, commandId: randomUUID(), stil: "gemalt", optionen: { setting: "fantasy", profil: "kirche" } });
    expect(changed.json()).toMatchObject({ mapId: childId, erzeugt: false });
    expect(await tactical.getMap(gm, campaign, childId)).toEqual(child);
    expect((await tactical.getSource(gm, campaign, childId)).provenance.setting).toBe(setting);
    expect(await tactical.listMaps(gm, campaign)).toHaveLength(count);
  });

  it("rejects malformed settings, cave-only misuse, unauthorized generation and private child reads", async () => {
    const before = (await createTactical(db).listMaps(gm, campaign)).length;
    for (const setting of [null, "modern", "scifi\u0000", 0, {}, ["gegenwart"]]) {
      for (const art of ["grundriss", "siedlung"] as const) {
        const optionen = { setting } as unknown as KartenOptionen;
        expect((await post("/tactical/generate/preview", request("fantasy", { art, optionen }))).statusCode).toBe(400);
        expect(() => validateKartenOptionen(art, optionen)).toThrow(/setting/i);
      }
    }
    expect(() => validateKartenOptionen("grundriss", Object.create({ setting: "scifi" }) as KartenOptionen)).toThrow();
    expect((await post("/tactical/generate/preview", request("scifi", { art: "hoehle", optionen: { setting: "scifi" } }))).statusCode).toBe(400);
    expect((await post("/tactical/generate/preview", request("scifi", { stil: "../../private" }))).statusCode).toBe(400);
    expect((await post("/tactical/generate/preview", request("scifi"), playerCookie)).statusCode).toBe(404);
    expect((await post("/tactical/generate", request("scifi"), playerCookie)).statusCode).toBe(404);
    const mapId = (await createTactical(db).listMaps(gm, campaign))[0]!.id;
    const path = `/api/campaigns/${campaign}/maps/tactical/${mapId}/children`;
    expect((await app.inject({ method: "GET", url: path, headers: { cookie: playerCookie } })).statusCode).toBe(404);
    expect((await app.inject({ method: "GET", url: path.replace(campaign, other), headers: { cookie } })).statusCode).toBe(404);
    const list = await createBetreten(db, config).children(gm, campaign, { parentKind: "tactical", parentMapId: mapId });
    const input = { commandId: randomUUID(), parentKind: "tactical", parentMapId: mapId, knotenId: list.nodes[0]!.knotenId, expectedVersion: list.version, optionen: { setting: "scifi" } };
    expect((await post("/betreten", input, playerCookie)).statusCode).toBe(404);
    expect((await post("/betreten", input, cookie, other)).statusCode).toBe(404);
    expect(await createTactical(db).listMaps(gm, campaign)).toHaveLength(before);
  });

  it("defaults old sources to fantasy and keeps setting independent of later stamp edits", async () => {
    const tactical = createTactical(db), preview = await createGrundriss(db, config).preview(gm, campaign, { commandId: randomUUID(), name: "Alter Grundriss", keim: "old-source", optionen: { profil: "haus" } });
    const old = await tactical.importMap(gm, campaign, { commandId: randomUUID(), name: "Alter Grundriss", format: "native", sourceText: serializeTacticalMapDocument(preview.document),
      provenance: { name: "Altbestand", creator: "Leitung", license: "CC0-1.0", sourceUrl: null, licenseUrl: null, retrievedAt: null, generator: null, generatorVersion: null } });
    const betreten = createBetreten(db, config), scope = { parentKind: "tactical" as const, parentMapId: old.subjectId }, list = await betreten.children(gm, campaign, scope);
    expect(list.setting).toBe("fantasy");
    const entered = await betreten.betrete(gm, campaign, { commandId: randomUUID(), ...scope, knotenId: list.nodes[0]!.knotenId, expectedVersion: list.version, stil: "zeitwelten", optionen: { setting: "scifi" } });
    const child = await tactical.getMap(gm, campaign, entered.mapId);
    const withoutStamps = { ...child.document, geometry: { ...child.document.geometry, stamps: [] } };
    await expect(tactical.reviseMap(gm, campaign, child.id, { schemaVersion: 2, commandId: randomUUID(), expectedVersion: child.version, document: withoutStamps, anchors: [], cartography: child.cartography!, addedBuildings: [] })).rejects.toThrow(/existing stamp/);
    const cartography = { ...child.cartography!, regions: child.cartography!.regions.map(role => role.role === "room" && role.interior ? { ...role, authored: true, provenance: null,
      interior: { ...role.interior, stampIds: [], ...(role.interior.portalArtwork ? { portalArtwork: role.interior.portalArtwork.map(item => ({ ...item, stampIds: [] })) } : {}) } } : role) };
    await tactical.reviseMap(gm, campaign, child.id, { schemaVersion: 2, commandId: randomUUID(), expectedVersion: child.version, document: withoutStamps, anchors: [], cartography, addedBuildings: [] });
    expect(await betreten.children(gm, campaign, { parentKind: "tactical", parentMapId: child.id })).toMatchObject({ setting: "scifi", stil: "zeitwelten" });
  });

  it("restores setting, expanded metadata and the original child through a native archive", async () => {
    const saved = await post("/tactical/generate", request("scifi")); expect(saved.statusCode, saved.body).toBe(200);
    const scope = { parentKind: "tactical" as const, parentMapId: saved.json().ack.subjectId as string }, betreten = createBetreten(db, config);
    const list = await betreten.children(gm, campaign, scope), knotenId = list.nodes[0]!.knotenId;
    const edit = { commandId: randomUUID(), expectedVersion: list.version, titel: "Archiv der Sterne", bauwerk: { typ: "bibliothek" as BauwerkTyp, beschreibung: "Erhaltene Berichte" } };
    const edited = await betreten.updateMetadata(gm, campaign, scope.parentMapId, knotenId, edit);
    const input = { commandId: randomUUID(), ...scope, knotenId, expectedVersion: edited.version }, entered = await betreten.betrete(gm, campaign, input);
    const bundle = await exportCampaignBundle(db, gm, campaign), parsed = parseCurrentCampaignBundle(serializeCurrentCampaignBundle(bundle));
    const sources = parsed.tables.tactical_sources.map(row => row.provenance as unknown as { setting?: KartenSetting });
    expect(sources.some(source => source.setting === "gegenwart")).toBe(true);
    expect(sources.some(source => source.setting === "scifi")).toBe(true);
    for (const setting of ["modern", null, {}]) {
      const bad = structuredClone(bundle);
      (bad.tables.tactical_sources[0]!.provenance as unknown as { setting: unknown }).setting = setting;
      expect(() => serializeCurrentCampaignBundle(bad)).toThrow(/provenance.setting/);
    }
    const target = await createTestDb();
    try {
      await initializeCampaignRestoreTarget(target); await restoreCampaignBundle(target, parsed);
      const restored = createBetreten(target, config), children = await restored.children(gm, campaign, scope);
      expect(children).toMatchObject({ setting: "scifi", stil: "zeitwelten" });
      expect(children.nodes.find(node => node.knotenId === knotenId)).toMatchObject({ titel: edit.titel, bauwerk: edit.bauwerk, vorhandeneKarteId: entered.mapId });
      expect(await restored.updateMetadata(gm, campaign, scope.parentMapId, knotenId, edit)).toEqual(edited);
      expect(await restored.betrete(gm, campaign, input)).toEqual(entered);
      expect(await restored.children(gm, campaign, { parentKind: "tactical", parentMapId: entered.mapId })).toMatchObject({ setting: "scifi", stil: "zeitwelten" });
      expect(currentCampaignSemanticDiff(bundle, await exportCampaignBundle(target, gm, campaign))).toEqual([]);
    } finally { await target.close(); }
  }, 60_000);
});
