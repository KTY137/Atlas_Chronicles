// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2026 Kaya Yesilyurt - Atlas Chronicles. Siehe LICENSE.
import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { FastifyInstance } from "fastify";
import type { Knoten } from "@chronicle/szene";
import { currentCampaignSemanticDiff, parseCurrentCampaignBundle, serializeCurrentCampaignBundle } from "@chronicle/io";
import { buildApp } from "../src/app.ts";
import { createTestDb, migrate, type Db } from "../src/db/index.ts";
import { createIdentity } from "../src/identity/index.ts";
import { createCampaigns } from "../src/domain/campaigns.ts";
import { createGrundriss } from "../src/domain/grundriss.ts";
import { createBetreten } from "../src/domain/betreten.ts";
import { createTactical } from "../src/domain/tactical.ts";
import { createGameplay } from "../src/domain/gameplay.ts";
import { exportCampaignBundle, initializeCampaignRestoreTarget, restoreCampaignBundle } from "../src/domain/bundles.ts";

describe("Kartenwerkstatt: Städte, Stile und dauerhafte Gebäudemetadaten", () => {
  let db: Db, app: FastifyInstance, gm: string, campaign: string, other: string, cookie: string, playerCookie: string;
  const config = { origin: "https://map-workshop.test", cookieSecret: "map-workshop-cookie-secret-over-32-characters", bootstrapToken: "map-workshop-bootstrap-secret-over-32-characters" };
  beforeAll(async () => {
    db = await createTestDb(); await migrate(db);
    const identity = createIdentity(db, config), campaigns = createCampaigns(db);
    gm = (await identity.bootstrap("Kaya")).userId;
    campaign = (await campaigns.createCampaign(gm, { name: "Werkstatt" })).id;
    other = (await campaigns.createCampaign(gm, { name: "Andere Welt" })).id;
    cookie = `chronicle_session=${(await identity.issueSession(gm)).value}`;
    const invite = await campaigns.issueInvitation(gm, campaign);
    const join = await campaigns.requestJoin(invite.code, { displayName: "Spielerin" });
    const player = (await campaigns.approveJoin(gm, campaign, join.id)).userId;
    playerCookie = `chronicle_session=${(await identity.issueSession(player)).value}`;
    app = await buildApp(db, config);
  }, 30_000);
  afterAll(async () => { await app?.close(); await db?.close(); });
  const post = (path: string, payload: object, session = cookie) => app.inject({ method: "POST", url: `/api/campaigns/${campaign}${path}`, headers: { cookie: session, origin: config.origin }, payload });
  const body = (over: object = {}) => ({ commandId: randomUUID(), name: "Lindenstadt", keim: "lindenstadt", art: "siedlung", optionen: { art: "weiler", bauwerke: 9 }, ...over });
  const city = async (stil: "grundriss" | "gemalt" = "grundriss", campaignId = campaign) => {
    const created = await createGrundriss(db, config).generate(gm, campaignId, { ...body(), art: "siedlung", stil, optionen: { art: "weiler", bauwerke: 9 } });
    const parentMapId = created.ack.subjectId, scope = { parentKind: "tactical" as const, parentMapId };
    return { parentMapId, scope, list: await createBetreten(db, config).children(gm, campaignId, scope) };
  };
  const metadata = (map: string, node: string, payload: object, session = cookie, campaignId = campaign) => app.inject({ method: "PUT",
    url: `/api/campaigns/${campaignId}/maps/tactical/${map}/knoten/${node}/metadata`, headers: { cookie: session, origin: config.origin }, payload });
  const readNode = async (map: string, node: string) => (await db.query<{ data: Knoten }>("SELECT data FROM tactical_map_nodes WHERE map_id=$1 AND knoten_id=$2", [map, node])).rows[0]!.data;

  it("liefert eine echte Stadtvorschau mit Gebäuden und Straßen ohne Schreibeffekte", async () => {
    const before = await createTactical(db).listMaps(gm, campaign);
    const response = await post("/tactical/generate/preview", body({ optionen: { art: "stadt", ausdehnung: [32, 24], zellgroesse: 64, bauwerke: 18, strassenDichte: 0.4, grundstueck: [2, 5], licht: true } }));
    expect(response.statusCode).toBe(200);
    const preview = response.json();
    expect(preview.art).toBe("siedlung"); expect(preview.document.kind).toBe("tactical-map");
    expect(preview.bauwerke).toBeGreaterThan(0); expect(preview.strassen).toBeGreaterThan(0);
    expect(preview).not.toHaveProperty("raeume");
    expect(preview.nodes).toHaveLength(preview.bauwerke);
    expect(preview.nodes[0]).toMatchObject({ art: "bauwerk", bauwerk: { typ: expect.any(String) }, titel: expect.any(String), x: expect.any(Number), y: expect.any(Number) });
    expect(preview.document.geometry.regions).toHaveLength(preview.cartography.regions.length);
    expect(preview.cartography.regions.filter((region: { role: string }) => region.role === "building")).toHaveLength(preview.bauwerke);
    expect(preview.cartography.regions.filter((region: { role: string }) => region.role === "road")).toHaveLength(preview.strassen);
    expect(await createTactical(db).listMaps(gm, campaign)).toHaveLength(before.length);
  });

  it.each([{ label: "Stadt", ausdehnung: [56, 44] as const, bauwerke: 130 }, { label: "Großstadt", ausdehnung: [88, 64] as const, bauwerke: 256 }])("speichert große Vektorstädte: $label nach ihrer Vorschau", async ({ label, ausdehnung, bauwerke }) => {
    const request = body({ name: label, optionen: { art: "stadt", ausdehnung, bauwerke } });
    const before = (await createTactical(db).listMaps(gm, campaign)).length;
    const preview = await post("/tactical/generate/preview", request); expect(preview.statusCode).toBe(200);
    const document = preview.json().document;
    expect(document.background).toBeNull(); expect(document.geometry.size).toEqual(ausdehnung.map(value => value * 96));
    expect(document.geometry.size[0] * document.geometry.size[1]).toBeGreaterThan(16_000_000);
    expect(await createTactical(db).listMaps(gm, campaign)).toHaveLength(before);
    const generated = await post("/tactical/generate", request); expect(generated.statusCode).toBe(200);
    const tactical = createTactical(db), mapId = generated.json().ack.subjectId;
    const map = await tactical.getMap(gm, campaign, mapId); expect(map.document).toEqual(document);
    await tactical.reviseMap(gm, campaign, mapId, { schemaVersion: 2, cartography: map.cartography, addedBuildings: [], commandId: randomUUID(), expectedVersion: map.version, document: { ...map.document, grid: { kind: "none" } }, anchors: [] });
    const revised = await tactical.getMap(gm, campaign, mapId); expect(revised.revision).toBe(2);
    const gameplay = createGameplay(db), scene = await gameplay.createScene(gm, campaign, { name: label, entryIds: [], fictionDate: "Heute" });
    await tactical.savePlan(gm, campaign, scene.id, { commandId: randomUUID(), expectedVersion: 0, mapId, mapRevision: revised.revision, tokens: [] });
    await gameplay.startScene(gm, campaign, scene.id);
    const active = await tactical.getActive(gm, campaign);
    expect(active?.hatRaster).toBe(true); expect(active?.size).toEqual(document.geometry.size);
    expect(active?.regions.length).toBe(document.geometry.regions.length);
  }, 30_000);

  it("wählt nur lokale Stile; Stil und Anordnung verändern nachweisbar die Erzeugung", async () => {
    const plain = (await post("/tactical/generate/preview", body())).json();
    const paintedResponse = await post("/tactical/generate/preview", body({ stil: "gemalt" }));
    expect(paintedResponse.statusCode).toBe(200);
    const painted = paintedResponse.json();
    expect(painted.keimHash).not.toBe(plain.keimHash);
    expect(painted.document.geometry.stamps.some((stamp: { a: string }) => stamp.a.startsWith("pk.gemalt/"))).toBe(true);
    expect((await post("/tactical/generate/preview", body({ stil: "../../secret" }))).statusCode).toBe(400);
    expect((await post("/tactical/generate/preview", body({ optionen: { kammern: 4 } }))).statusCode).toBe(400);
    const profile = await post("/tactical/generate/preview", body({ art: "grundriss", optionen: { anordnung: "raster", profil: "kirche" } }));
    expect(profile.statusCode).toBe(200); expect(profile.json().art).toBe("grundriss");
  });

  it("öffnet eine Stadtroute und zeigt ausschließlich Gebäude als Eingänge", async () => {
    const created = await post("/tactical/generate", body()); expect(created.statusCode).toBe(200);
    const mapId = created.json().ack.subjectId;
    const children = await app.inject({ method: "GET", url: `/api/campaigns/${campaign}/maps/tactical/${mapId}/children`, headers: { cookie } });
    expect(children.statusCode).toBe(200);
    const list = children.json(); expect(list.art).toBe("siedlung"); expect(list.nodes.length).toBeGreaterThan(0);
    expect(list.nodes.every((node: { art: string; canEnter: boolean }) => node.art === "bauwerk" && node.canEnter)).toBe(true);
    const map = await createTactical(db).getMap(gm, campaign, mapId);
    const street = map.document.geometry.regions.find(region => !list.nodes.some((node: { knotenId: string }) => node.knotenId === region.id))!;
    expect((await metadata(mapId, street.id, { commandId: randomUUID(), expectedVersion: 1, titel: "Falsches Haus" })).statusCode).toBe(404);
    expect((await post("/betreten", { commandId: randomUUID(), parentKind: "tactical", parentMapId: mapId, knotenId: street.id, expectedVersion: 1 })).statusCode).toBe(404);
    const source = await createTactical(db).getSource(gm, campaign, mapId);
    expect(source.provenance.generator).toBe("chronicle-siedlung");
  });

  it("speichert Namen und Typ mit CAS und idempotenter Quittung; das Kircheninnere erbt den Stil", async () => {
    const { parentMapId, scope, list } = await city("gemalt"), node = list.nodes[0]!, before = await readNode(parentMapId, node.knotenId);
    const edit = { commandId: randomUUID(), expectedVersion: list.version, titel: "Sankt Linden", bauwerk: { typ: "kirche", beschreibung: "Die Kirche am Markt." } };
    const changed = await metadata(parentMapId, node.knotenId, edit); expect(changed.statusCode).toBe(200); expect(changed.json().version).toBe(2);
    expect((await metadata(parentMapId, node.knotenId, edit)).json()).toEqual(changed.json());
    expect((await metadata(parentMapId, node.knotenId, { ...edit, titel: "Andere Anfrage" })).statusCode).toBe(409);
    expect((await metadata(parentMapId, node.knotenId, { ...edit, commandId: randomUUID() })).statusCode).toBe(409);
    const saved = await readNode(parentMapId, node.knotenId);
    expect(saved).toEqual({ ...before, titel: edit.titel, bauwerk: edit.bauwerk });
    const entered = await post("/betreten", { commandId: randomUUID(), ...scope, knotenId: node.knotenId, expectedVersion: changed.json().version });
    expect(entered.statusCode).toBe(200);
    const childId = entered.json().mapId, child = await createTactical(db).getMap(gm, campaign, childId);
    const childNodes = (await db.query<{ data: Knoten }>("SELECT data FROM tactical_map_nodes WHERE map_id=$1", [childId])).rows.map(row => row.data);
    expect(childNodes.find(item => item.art === "bauwerk")?.bauwerk?.typ).toBe("kirche");
    expect(child.document.geometry.stamps.some(stamp => stamp.a.startsWith("pk.gemalt/"))).toBe(true);
    const secondEdit = await metadata(parentMapId, node.knotenId, { commandId: randomUUID(), expectedVersion: 3, titel: "Neuer Name", bauwerk: { typ: "haus", beschreibung: "Neu bezeichnet" } });
    expect(secondEdit.statusCode).toBe(200);
    const reentered = await post("/betreten", { commandId: randomUUID(), ...scope, knotenId: node.knotenId, expectedVersion: 4, art: "hoehle" });
    expect(reentered.json()).toMatchObject({ mapId: childId, erzeugt: false });
    expect(await createTactical(db).getMap(gm, campaign, childId)).toEqual(child);
    const renamed = (await createBetreten(db, config).children(gm, campaign, scope)).nodes.find(item => item.knotenId === node.knotenId)!;
    expect(renamed).toMatchObject({ titel: "Neuer Name", bauwerk: { typ: "haus" }, vorhandeneKarteId: childId });
    expect((await readNode(parentMapId, node.knotenId)).herkunft).toEqual(before.herkunft);
  });

  it("verweigert Spieler, fremde Kampagnen, Wurzeln und ungültige Metadaten", async () => {
    const { parentMapId, list } = await city(), node = list.nodes[0]!;
    const edit = { commandId: randomUUID(), expectedVersion: 1, titel: "Gültiger Name" };
    expect((await metadata(parentMapId, node.knotenId, edit, playerCookie)).statusCode).toBe(404);
    expect((await metadata(parentMapId, node.knotenId, edit, cookie, other)).statusCode).toBe(404);
    const root = (await db.query<{ knoten_id: string }>("SELECT knoten_id FROM tactical_map_nodes WHERE map_id=$1 AND data->>'art'='ort'", [parentMapId])).rows[0]!.knoten_id;
    expect((await metadata(parentMapId, root, edit)).statusCode).toBe(404);
    for (const invalid of [{ titel: "Unsichtbar\u0000" }, { titel: "x".repeat(161) }, { bauwerk: { typ: "palast", beschreibung: "" } }, { bauwerk: { typ: "haus", beschreibung: "x".repeat(2001) } }, { bauwerk: { typ: "haus", beschreibung: "Tab\t" } }, { constructor: {} }]) {
      expect((await metadata(parentMapId, node.knotenId, { ...edit, ...invalid })).statusCode).toBe(400);
    }
    expect((await createTactical(db).getMap(gm, campaign, parentMapId)).version).toBe(1);
  });

  it("schützt Identität, Herkunft und Löschhistorie weiterhin direkt in der Datenbank", async () => {
    const { parentMapId, list } = await city(), node = list.nodes[0]!, saved = await readNode(parentMapId, node.knotenId);
    await expect(db.query("UPDATE tactical_map_nodes SET data=jsonb_set(data,'{herkunft,kindKeim}','\"forged\"') WHERE map_id=$1 AND knoten_id=$2", [parentMapId, node.knotenId])).rejects.toMatchObject({ code: "42501" });
    await expect(db.query("UPDATE tactical_map_nodes SET data=jsonb_set(data,'{art}','\"raum\"') WHERE map_id=$1 AND knoten_id=$2", [parentMapId, node.knotenId])).rejects.toMatchObject({ code: "42501" });
    await expect(db.query("UPDATE tactical_map_nodes SET knoten_id='forged' WHERE map_id=$1 AND knoten_id=$2", [parentMapId, node.knotenId])).rejects.toMatchObject({ code: "42501" });
    await expect(db.query("DELETE FROM tactical_map_nodes WHERE map_id=$1 AND knoten_id=$2", [parentMapId, node.knotenId])).rejects.toMatchObject({ code: "42501" });
    expect(await readNode(parentMapId, node.knotenId)).toEqual(saved);
  });

  it("benennt neu gezeichnete Stadtgebäude und erhält deren abgeleiteten Kindkeim", async () => {
    const { parentMapId, scope } = await city(), tactical = createTactical(db), map = await tactical.getMap(gm, campaign, parentMapId);
    const region = { id: "drawn-building", punkte: [[10, 10], [110, 10], [110, 110], [10, 110]] as const };
    await tactical.reviseMap(gm, campaign, parentMapId, { schemaVersion: 2,
      cartography: { ...map.cartography!, regions: [...map.cartography!.regions, { regionId: region.id, role: "building", authored: true, locked: false, provenance: null }] },
      addedBuildings: [{ regionId: region.id, titel: "Neues Haus", typ: "haus" }], commandId: randomUUID(), expectedVersion: map.version,
      document: { ...map.document, geometry: { ...map.document.geometry, regions: [...map.document.geometry.regions, region] } }, anchors: [] });
    const betreten = createBetreten(db, config), before = await betreten.betretbar(gm, campaign, region.id, scope);
    const edit = await metadata(parentMapId, region.id, { commandId: randomUUID(), expectedVersion: before.version, titel: "Das neue Haus", bauwerk: { typ: "haus", beschreibung: "Selbst gezeichnet" } });
    expect(edit.statusCode).toBe(200);
    expect((await betreten.betretbar(gm, campaign, region.id, scope)).kindKeim).toBe(before.kindKeim);
    expect((await readNode(parentMapId, region.id)).bauwerk?.typ).toBe("haus");
  });

  it("reicht Stadttyp, Größe und Stil durch die verschachtelte HTTP-Erzeugung", async () => {
    const root = await createGrundriss(db, config).generate(gm, campaign, { commandId: randomUUID(), name: "Eingang", keim: "city-through-door" });
    const parentMapId = root.ack.subjectId, scope = { parentKind: "tactical" as const, parentMapId };
    const list = await createBetreten(db, config).children(gm, campaign, scope), knotenId = list.nodes[0]!.knotenId;
    const request = { commandId: randomUUID(), ...scope, knotenId, expectedVersion: list.version, art: "siedlung", stil: "gemalt",
      optionen: { art: "weiler", ausdehnung: [24, 18], zellgroesse: 64, bauwerke: 10, strassenDichte: 0.2, grundstueck: [3, 5], licht: false } };
    const response = await post("/betreten", request); expect(response.statusCode).toBe(200);
    const child = await createTactical(db).getMap(gm, campaign, response.json().mapId);
    expect(child.document.geometry.size).toEqual([24 * 64, 18 * 64]);
    expect(child.document.geometry.stamps.some(stamp => stamp.a.startsWith("pk.gemalt/"))).toBe(true);
    expect((await createTactical(db).getSource(gm, campaign, child.id)).provenance.generator).toBe("chronicle-siedlung");
    expect((await post("/betreten", { ...request, commandId: randomUUID(), optionen: { kammern: 3 } })).statusCode).toBe(400);
  });

  it("stellt Metadaten und deren idempotente Quittungen mit einem nativen Archiv wieder her", async () => {
    // The receipt/metadata fixture is independent of every city created by earlier cases.
    const campaign = (await createCampaigns(db).createCampaign(gm, { name: "Archiv-Metadaten" })).id;
    const { parentMapId, scope, list } = await city("grundriss", campaign), knotenId = list.nodes[0]!.knotenId;
    const edit = { commandId: randomUUID(), expectedVersion: list.version, titel: "Die bewahrte Schmiede", bauwerk: { typ: "schmiede" as const, beschreibung: "Am südlichen Tor" } };
    const edited = await createBetreten(db, config).updateMetadata(gm, campaign, parentMapId, knotenId, edit);
    const input = { commandId: randomUUID(), ...scope, knotenId, expectedVersion: edited.version };
    const entered = await createBetreten(db, config).betrete(gm, campaign, input);
    const bundle = await exportCampaignBundle(db, gm, campaign);
    const parsed = parseCurrentCampaignBundle(serializeCurrentCampaignBundle(bundle)), target = await createTestDb();
    try {
      await initializeCampaignRestoreTarget(target); await restoreCampaignBundle(target, parsed);
      const restored = createBetreten(target, config), children = await restored.children(gm, campaign, scope);
      expect(children.nodes.find(node => node.knotenId === knotenId)).toMatchObject({ titel: edit.titel, bauwerk: edit.bauwerk, vorhandeneKarteId: entered.mapId });
      expect(await restored.updateMetadata(gm, campaign, parentMapId, knotenId, edit)).toEqual(edited);
      expect(await restored.betrete(gm, campaign, input)).toEqual(entered);
      expect(currentCampaignSemanticDiff(bundle, await exportCampaignBundle(target, gm, campaign))).toEqual([]);
    } finally { await target.close(); }
  }, 30_000);
});
