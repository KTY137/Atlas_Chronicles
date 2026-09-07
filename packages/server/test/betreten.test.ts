// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2026 Kaya Yesilyurt - Atlas Chronicles. Siehe LICENSE.
import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { FastifyInstance } from "fastify";
import type { Knoten } from "@chronicle/szene";
import { buildApp } from "../src/app.ts";
import { createTestDb, migrate, type Db } from "../src/db/index.ts";
import { createIdentity } from "../src/identity/index.ts";
import { createCampaigns } from "../src/domain/campaigns.ts";
import { createTactical, TacticalValidationError } from "../src/domain/tactical.ts";
import { createGrundriss } from "../src/domain/grundriss.ts";
import { createBetreten } from "../src/domain/betreten.ts";
import { Conflict, Gone } from "../src/domain/errors.ts";
import { tacticalPointInside } from "../src/domain/tactical-state.ts";

/**
 * A-G2's missing half: not "does the chain exist in data" (that is `kette.test.ts`, in
 * `@chronicle/forge`) but "can anyone walk it." `betreten.ts` is the address; these tests are
 * what keep the address honest — idempotent per node, seeded only by the node, and closed to
 * everyone but `leitung`.
 *
 * Node fixtures are inserted directly into `atlas_nodes` rather than through a real Azgaar
 * import (`createAtlas(db).importMap`, which needs a full multi-thousand-row export like
 * `packages/forge/test/fixtures/azgaar-full.json.gz`). That importer is exercised elsewhere
 * (`atlas.test.ts`, `kette.test.ts`); what is under test here is only what `betreten.ts` does
 * with a `Knoten` row once one exists, so a minimal hand-built row is the more honest fixture.
 */
describe("Der Zugang — die Adresse, die man begehen kann", () => {
  let db: Db, gm: string, spieler: string, campaign: string, app: FastifyInstance, cookie: string, playerCookie: string;
  const config = { origin: "https://betreten.test", cookieSecret: "betreten-test-cookie-secret-more-than-32-characters", bootstrapToken: "betreten-bootstrap-secret-more-than-32-characters" };

  beforeAll(async () => {
    db = await createTestDb();
    await migrate(db);
    const identity = createIdentity(db, config);
    gm = (await identity.bootstrap("Kaya")).userId;
    campaign = (await createCampaigns(db).createCampaign(gm, { name: "Zugang" })).id;
    const campaigns = createCampaigns(db);
    const invite = await campaigns.issueInvitation(gm, campaign);
    const join = await campaigns.requestJoin(invite.code, { displayName: "Spieler" });
    spieler = (await campaigns.approveJoin(gm, campaign, join.id)).userId;
    cookie = `chronicle_session=${(await identity.issueSession(gm)).value}`;
    playerCookie = `chronicle_session=${(await identity.issueSession(spieler)).value}`;
    app = await buildApp(db, config);
  }, 30_000);
  afterAll(async () => { await app?.close(); await db?.close(); });

  /**
   * Hand-built node row. `herkunft.kindKeim` mirrors exactly what `azgaar.ts:245,247` writes
   * onto both `Ort.kindKeim` and the imported `Knoten`'s own `herkunft.kindKeim` for a burg —
   * the field `betreten.ts` actually reads.
   */
  async function seedKnoten(opts: { titel: string | null; kindKeim?: string }): Promise<string> {
    const id = randomUUID(), artifactId = randomUUID(), mapId = randomUUID(), at = Date.now();
    await db.query(
      "INSERT INTO artifacts(id,campaign_id,kind,source_hash,source,report,created_by,created_at) VALUES($1,$2,'test',$3,'{\"orte\":[],\"zellen\":[],\"bericht\":{},\"quelle\":{\"format\":\"test\"}}','{}',$4,$5)",
      [artifactId, campaign, randomUUID(), gm, at],
    );
    await db.query(
      "INSERT INTO atlas_maps(id,campaign_id,artifact_id,title,width,height,created_at) VALUES($1,$2,$3,'Testkarte',10,10,$4)",
      [mapId, campaign, artifactId, at],
    );
    const knoten: Knoten = {
      id: id as Knoten["id"], art: "ort", titel: opts.titel, eltern: [],
      rahmen: { ursprung: [0, 0], einheitenProPixel: 1, ordnung: "xy", hoch: "unten" },
      anker: null, sichtAnker: null,
      herkunft: {
        erzeuger: "test", version: "1", keimHash: "0".repeat(64), erzeugungspfad: ["ort", id],
        ...(opts.kindKeim !== undefined ? { kindKeim: opts.kindKeim } : {}),
      },
    };
    await db.query("INSERT INTO atlas_nodes(map_id,id,campaign_id,data) VALUES($1,$2,$3,$4)", [mapId, id, campaign, JSON.stringify(knoten)]);
    return id;
  }

  const input = (knotenId: string, over: Partial<{ commandId: string; name: string }> = {}) => ({ commandId: randomUUID(), knotenId, expectedVersion: 1, ...over });
  const scopeFor = async (knotenId: string) => ({ parentKind: "atlas" as const,
    parentMapId: (await db.query<{ map_id: string }>("SELECT map_id FROM atlas_nodes WHERE campaign_id=$1 AND id=$2", [campaign, knotenId])).rows[0]!.map_id });
  const generateMap = async (name: string) => (await createGrundriss(db, config).generate(gm, campaign, { commandId: randomUUID(), name, keim: name })).ack.subjectId;

  it("meldet einen Knoten mit Kindkeim als begehbar", async () => {
    const betreten = createBetreten(db, config);
    const knotenId = await seedKnoten({ titel: "Die Gruft", kindKeim: "seed-eins-0001" });
    const status = await betreten.betretbar(gm, campaign, knotenId);
    expect(status.kindKeim).toBe("seed-eins-0001");
    expect(status.vorhandeneKarteId).toBeNull();
    expect(status.titel).toBe("Die Gruft");
  });

  it("erzeugt beim Betreten eine Karte und persistiert sie", async () => {
    const betreten = createBetreten(db, config);
    const knotenId = await seedKnoten({ titel: "Die zweite Gruft", kindKeim: "seed-zwei-0002" });
    const result = await betreten.betrete(gm, campaign, input(knotenId));
    expect(result.erzeugt).toBe(true);
    expect(result.mapId).toBeTruthy();
    expect(result.keimHash).toMatch(/^[a-f0-9]{64}$/);
    // Read through the canonical path, not through `betreten.ts`'s own storage — the point
    // is that the generated map is an ordinary tactical map, indistinguishable from one a GM
    // imported by hand.
    const map = await createTactical(db).getMap(gm, campaign, result.mapId);
    expect(map.document.kind).toBe("tactical-map");
  });

  it("betritt man denselben Knoten erneut, kommt dieselbe Karte zurück, nicht erzeugt", async () => {
    const betreten = createBetreten(db, config);
    const knotenId = await seedKnoten({ titel: "Dritte Gruft", kindKeim: "seed-drei-0003" });
    const erste = await betreten.betrete(gm, campaign, input(knotenId, { name: "Erster Besuch" }));
    // A different commandId and a different cosmetic name: idempotency must be keyed on the
    // node, not on replaying the same request (module doc point 3).
    const zweite = await betreten.betrete(gm, campaign, input(knotenId, { name: "Zweiter Besuch" }));
    expect(zweite.erzeugt).toBe(false);
    expect(zweite.mapId).toBe(erste.mapId);
    const status = await betreten.betretbar(gm, campaign, knotenId);
    expect(status.vorhandeneKarteId).toBe(erste.mapId);
  });

  it("derselbe Knoten liefert bei zwei Aufrufen denselben keimHash", async () => {
    const betreten = createBetreten(db, config);
    const knotenId = await seedKnoten({ titel: "Vierte Gruft", kindKeim: "seed-vier-0004" });
    const erste = await betreten.betrete(gm, campaign, input(knotenId));
    const zweite = await betreten.betrete(gm, campaign, input(knotenId));
    expect(zweite.keimHash).toBe(erste.keimHash);
  });

  it("meldet einen Knoten ohne Kindkeim ehrlich als nicht begehbar, und Erzeugen wird verweigert", async () => {
    const betreten = createBetreten(db, config);
    const knotenId = await seedKnoten({ titel: "Nur ein Marktplatz" });
    const status = await betreten.betretbar(gm, campaign, knotenId);
    expect(status.kindKeim).toBeNull();
    await expect(betreten.betrete(gm, campaign, input(knotenId))).rejects.toBeInstanceOf(Gone);
    expect(await betreten.betretbar(gm, campaign, knotenId)).toMatchObject({ vorhandeneKarteId: null });
  });

  it("verweigert einem Mitglied ohne Leitung das Betreten, und es entsteht keine Karte", async () => {
    const betreten = createBetreten(db, config);
    const knotenId = await seedKnoten({ titel: "Fünfte Gruft", kindKeim: "seed-fuenf-0005" });
    await expect(betreten.betrete(spieler, campaign, input(knotenId))).rejects.toBeInstanceOf(Gone);
    const status = await betreten.betretbar(gm, campaign, knotenId);
    expect(status.vorhandeneKarteId).toBeNull();
  });

  it("verweigert einen unbekannten Knoten, statt etwas zu erfinden", async () => {
    const betreten = createBetreten(db, config);
    const unbekannt = randomUUID();
    await expect(betreten.betretbar(gm, campaign, unbekannt)).rejects.toBeInstanceOf(Gone);
    await expect(betreten.betrete(gm, campaign, input(unbekannt))).rejects.toBeInstanceOf(Gone);
  });

  it("die erzeugte Kindkarte ist über den gewöhnlichen taktischen Lesepfad lesbar", async () => {
    const betreten = createBetreten(db, config);
    const knotenId = await seedKnoten({ titel: "Sechste Gruft", kindKeim: "seed-sechs-0006" });
    const result = await betreten.betrete(gm, campaign, input(knotenId));
    const tactical = createTactical(db);
    const maps = await tactical.listMaps(gm, campaign);
    expect(maps.some((m) => m.id === result.mapId)).toBe(true);
    const map = await tactical.getMap(gm, campaign, result.mapId);
    expect(map.document.geometry.regions.length).toBeGreaterThan(0);
    // A generated map has no photograph — same invariant `grundriss.test.ts` guards.
    expect(map.document.background).toBeNull();
  });

  it("verweigert nicht enthüllte Atlas-Knoten auch über den alten Descriptor", async () => {
    const id = await seedKnoten({ titel: "Privater Zugang", kindKeim: "privater-seed" });
    const betreten = createBetreten(db, config), scope = await scopeFor(id);
    await expect(betreten.betretbar(spieler, campaign, id)).rejects.toBeInstanceOf(Gone);
    await expect(betreten.betretbar(spieler, campaign, id, scope)).rejects.toBeInstanceOf(Gone);
    await expect(betreten.children(spieler, campaign, scope)).rejects.toBeInstanceOf(Gone);
  });

  it("enthüllt Spielern weder Kindkeim noch private Kindkarten hinter einem sichtbaren Ort", async () => {
    const id = await seedKnoten({ titel: "Sichtbarer Ort", kindKeim: "geheime-unterkarte" });
    const betreten = createBetreten(db, config), scope = await scopeFor(id);
    const child = await betreten.betrete(gm, campaign, { ...input(id), ...scope });
    const player = await createCampaigns(db).requireMember(spieler, campaign);
    await db.query(`INSERT INTO atlas_revelations(map_id,node_id,campaign_id,actor_id,knowledge,granted_by,granted_at)
      VALUES($1,$2,$3,$4,'benannt',$5,$6)`, [scope.parentMapId, id, campaign, player.actorId, gm, Date.now()]);
    expect(await betreten.betretbar(spieler, campaign, id, scope)).toMatchObject({ titel: "Sichtbarer Ort", kindKeim: null, vorhandeneKarteId: null });
    await expect(createTactical(db).getMap(spieler, campaign, child.mapId)).rejects.toBeInstanceOf(Gone);
    await expect(betreten.children(spieler, campaign, { parentKind: "tactical", parentMapId: child.mapId })).rejects.toBeInstanceOf(Gone);
  });

  it("persistiert rekursive Räume, ihre ursprünglichen Kindkeime und einen vollständigen Rückweg", async () => {
    const id = await seedKnoten({ titel: "Oberwelt", kindKeim: "rekursive-oberwelt" });
    const betreten = createBetreten(db, config), root = await scopeFor(id);
    const first = await betreten.betrete(gm, campaign, { ...input(id), ...root });
    const scope = { parentKind: "tactical" as const, parentMapId: first.mapId };
    const rooms = await betreten.children(gm, campaign, scope), room = rooms.nodes[0]!;
    const metadata = (await db.query<{ data: Knoten }>("SELECT data FROM tactical_map_nodes WHERE map_id=$1 AND knoten_id=$2", [first.mapId, room.knotenId])).rows[0]!.data;
    expect((await betreten.betretbar(gm, campaign, room.knotenId, scope)).kindKeim).toBe(metadata.herkunft!.kindKeim);
    const second = await betreten.betrete(gm, campaign, { ...input(room.knotenId), ...scope, expectedVersion: rooms.version });
    const grandchildren = await createBetreten(db, config).children(gm, campaign, { parentKind: "tactical", parentMapId: second.mapId });
    expect(grandchildren.ancestors.map(ancestor => ancestor.id)).toEqual([root.parentMapId, first.mapId, second.mapId]);
    expect(grandchildren.nodes.length).toBeGreaterThan(0);
    expect((await betreten.betrete(gm, campaign, { ...input(room.knotenId), ...scope })).mapId).toBe(second.mapId);
    expect((await betreten.children(gm, campaign, scope)).nodes.find(node => node.knotenId === room.knotenId)?.vorhandeneKarteId).toBe(second.mapId);
  });

  it("zwei gleichzeitige erste Besuche erzeugen genau eine Karte und keine verwaisten Entwürfe", async () => {
    const id = await seedKnoten({ titel: "Gemeinsame Tür", kindKeim: "konkurrierende-tuer" });
    const betreten = createBetreten(db, config), scope = await scopeFor(id);
    const before = await createTactical(db).listMaps(gm, campaign);
    const visits = await Promise.all([betreten.betrete(gm, campaign, { ...input(id), ...scope }), betreten.betrete(gm, campaign, { ...input(id), ...scope })]);
    expect(visits[0]!.mapId).toBe(visits[1]!.mapId);
    expect(visits.filter(result => result.erzeugt)).toHaveLength(1);
    expect(await createTactical(db).listMaps(gm, campaign)).toHaveLength(before.length + 1);
  });

  it("replayed dieselbe Command-Antwort und verweigert geänderte Payloads derselben Command-ID", async () => {
    const id = await seedKnoten({ titel: "Beleg", kindKeim: "command-beleg" });
    const betreten = createBetreten(db, config), request = { ...input(id), ...await scopeFor(id) };
    const first = await betreten.betrete(gm, campaign, request);
    expect(await betreten.betrete(gm, campaign, request)).toEqual(first);
    await expect(betreten.betrete(gm, campaign, { ...request, name: "Andere Payload" })).rejects.toBeInstanceOf(Conflict);
    const other = await seedKnoten({ titel: "Anderer Ort", kindKeim: "anderer-beleg" });
    await expect(betreten.betrete(gm, campaign, { ...request, ...await scopeFor(other), knotenId: other })).rejects.toBeInstanceOf(Conflict);
    expect((await betreten.betretbar(gm, campaign, other)).vorhandeneKarteId).toBeNull();
  });

  it("rollt Kartengenerierung, Knoten und Belege zurück wenn die Adresse nicht gespeichert werden kann", async () => {
    const id = await seedKnoten({ titel: "Atomare Tür", kindKeim: "atomare-tuer" }), scope = await scopeFor(id);
    const failAtEdge = (inner: Db): Db => ({
      query: (sql, params) => sql.startsWith("INSERT INTO betreten_karten") ? Promise.reject(new Error("edge-write-failed")) : inner.query(sql, params),
      transaction: work => inner.transaction(tx => work(failAtEdge(tx))),
      close: () => inner.close(),
    });
    const before = await createTactical(db).listMaps(gm, campaign), request = { ...input(id), ...scope };
    await expect(createBetreten(failAtEdge(db), config).betrete(gm, campaign, request)).rejects.toThrow("edge-write-failed");
    expect(await createTactical(db).listMaps(gm, campaign)).toHaveLength(before.length);
    expect((await db.query("SELECT 1 FROM betreten_command_receipts WHERE command_id=$1", [request.commandId])).rowCount).toBe(0);
    expect((await createBetreten(db, config).betretbar(gm, campaign, id, scope)).version).toBe(1);
    expect((await createBetreten(db, config).betrete(gm, campaign, request)).erzeugt).toBe(true);
  });

  it("verweigert fehlende/veraltete Quellversionen bevor eine Karte entsteht", async () => {
    const id = await seedKnoten({ titel: "Version", kindKeim: "version-pruefen" });
    const betreten = createBetreten(db, config), scope = await scopeFor(id), before = await createTactical(db).listMaps(gm, campaign);
    await expect(betreten.betrete(gm, campaign, { commandId: randomUUID(), knotenId: id, ...scope })).rejects.toBeInstanceOf(TacticalValidationError);
    await expect(betreten.betrete(gm, campaign, { ...input(id), ...scope, expectedVersion: 9 })).rejects.toBeInstanceOf(Conflict);
    expect(await createTactical(db).listMaps(gm, campaign)).toHaveLength(before.length);
  });

  it("verknüpft eine vorhandene Karte auch mit einem Ort ohne Kindkeim, ohne Kopie", async () => {
    const id = await seedKnoten({ titel: "Vorhandenes Gebäude" }), mapId = await generateMap("Vorhandenes Gebäude");
    const betreten = createBetreten(db, config), scope = await scopeFor(id), before = await createTactical(db).listMaps(gm, campaign);
    expect(await betreten.betrete(gm, campaign, { ...input(id), ...scope, targetMapId: mapId })).toEqual({ mapId, erzeugt: false, keimHash: null });
    expect(await createTactical(db).listMaps(gm, campaign)).toHaveLength(before.length);
    expect((await betreten.children(gm, campaign, scope)).version).toBe(2);
    const otherMap = await generateMap("Anderes Gebäude");
    await expect(betreten.betrete(gm, campaign, { ...input(id), ...scope, targetMapId: otherMap })).rejects.toBeInstanceOf(Conflict);
  });

  it("verweigert Selbstbezüge, Kreise, mehrere Eltern und fremde Kampagnen", async () => {
    const betreten = createBetreten(db, config), a = await generateMap("Kreis A"), b = await generateMap("Kreis B");
    const scopeA = { parentKind: "tactical" as const, parentMapId: a }, scopeB = { parentKind: "tactical" as const, parentMapId: b };
    const roomA = (await betreten.children(gm, campaign, scopeA)).nodes[0]!, roomB = (await betreten.children(gm, campaign, scopeB)).nodes[0]!;
    await expect(betreten.betrete(gm, campaign, { ...input(roomA.knotenId), ...scopeA, targetMapId: a })).rejects.toBeInstanceOf(TacticalValidationError);
    await betreten.betrete(gm, campaign, { ...input(roomA.knotenId), ...scopeA, targetMapId: b });
    await expect(betreten.betrete(gm, campaign, { ...input(roomB.knotenId), ...scopeB, targetMapId: a })).rejects.toBeInstanceOf(TacticalValidationError);
    const extra = await seedKnoten({ titel: "Zweite Platzierung" });
    await expect(betreten.betrete(gm, campaign, { ...input(extra), ...await scopeFor(extra), targetMapId: b })).rejects.toBeInstanceOf(TacticalValidationError);
    const foreign = (await createCampaigns(db).createCampaign(gm, { name: "Andere Kampagne" })).id;
    const target = await createGrundriss(db, config).generate(gm, foreign, { commandId: randomUUID(), name: "Fremd", keim: "fremder-raum" });
    await expect(betreten.betrete(gm, campaign, { ...input(extra), ...await scopeFor(extra), targetMapId: target.ack.subjectId })).rejects.toBeInstanceOf(Gone);
  });

  it("trennt gleiche Knoten-IDs in verschiedenen Quellkarten und verweigert mehrdeutige Altadressen", async () => {
    const id = await seedKnoten({ titel: "Erste Kopie", kindKeim: "gleiche-kopie" });
    const other = await seedKnoten({ titel: "Zweite Kopie", kindKeim: "gleiche-kopie" });
    const betreten = createBetreten(db, config), firstScope = await scopeFor(id), secondScope = await scopeFor(other);
    await db.query("UPDATE atlas_nodes SET id=$1,data=jsonb_set(data,'{id}',to_jsonb($1::text)) WHERE map_id=$2", [id, secondScope.parentMapId]);
    await expect(betreten.betretbar(gm, campaign, id)).rejects.toBeInstanceOf(Gone);
    const a = await betreten.betrete(gm, campaign, { ...input(id), ...firstScope }), b = await betreten.betrete(gm, campaign, { ...input(id), ...secondScope });
    expect(a.mapId).not.toBe(b.mapId);
  });

  it("hält verknüpfte Räume beim Bearbeiten erreichbar und speichert weitere Änderungen regulär", async () => {
    const parentMapId = await generateMap("Bearbeitbarer Zugang"), scope = { parentKind: "tactical" as const, parentMapId };
    const betreten = createBetreten(db, config), room = (await betreten.children(gm, campaign, scope)).nodes[0]!;
    const child = await betreten.betrete(gm, campaign, { ...input(room.knotenId), ...scope });
    const tactical = createTactical(db), map = await tactical.getMap(gm, campaign, parentMapId);
    const removed = { ...map.document, geometry: { ...map.document.geometry, regions: map.document.geometry.regions.filter(region => region.id !== room.knotenId) } };
    await expect(tactical.reviseMap(gm, campaign, parentMapId, { commandId: randomUUID(), expectedVersion: map.version, document: removed, anchors: map.anchors })).rejects.toBeInstanceOf(TacticalValidationError);
    const document = { ...map.document, environment: { ...map.document.environment, ambientLightArgb: "ff333333" } };
    await tactical.reviseMap(gm, campaign, parentMapId, { commandId: randomUUID(), expectedVersion: map.version, document, anchors: map.anchors });
    expect((await tactical.getMap(gm, campaign, parentMapId)).document.environment.ambientLightArgb).toBe("ff333333");
    expect((await betreten.betretbar(gm, campaign, room.knotenId, scope)).vorhandeneKarteId).toBe(child.mapId);
  });

  it("platziert Zugänge innerhalb konkaver handgezeichneter Räume und behält deren Keim beim Editieren", async () => {
    const parentMapId = await generateMap("Handgezeichneter Raum"), tactical = createTactical(db), map = await tactical.getMap(gm, campaign, parentMapId);
    const polygon = [[0,0],[120,0],[120,30],[30,30],[30,120],[0,120]] as const;
    const room = { id: "hand-drawn-region", punkte: polygon };
    const document = { ...map.document, geometry: { ...map.document.geometry, regions: [...map.document.geometry.regions, room] } };
    await tactical.reviseMap(gm, campaign, parentMapId, { commandId: randomUUID(), expectedVersion: map.version, document, anchors: [] });
    const betreten = createBetreten(db, config), scope = { parentKind: "tactical" as const, parentMapId };
    const list = await betreten.children(gm, campaign, scope), anchor = list.nodes.find(node => node.knotenId === room.id)!;
    expect(tacticalPointInside([anchor.x, anchor.y], polygon)).toBe(true);
    const seed = (await betreten.betretbar(gm, campaign, room.id, scope)).kindKeim;
    expect(seed).toMatch(/^[a-f0-9]{64}$/);
    const updated = { ...document, environment: { ...document.environment, ambientLightArgb: "ff222222" } };
    await tactical.reviseMap(gm, campaign, parentMapId, { commandId: randomUUID(), expectedVersion: list.version, document: updated, anchors: [] });
    expect((await betreten.betretbar(gm, campaign, room.id, scope)).kindKeim).toBe(seed);
    expect((await betreten.betrete(gm, campaign, { ...input(room.id), ...scope, expectedVersion: list.version + 1 })).mapId).toBeTruthy();
  });

  it("liefert die geschlossenen HTTP-Verträge für Öffnen, Kinder und Rückweg", async () => {
    const id = await seedKnoten({ titel: "HTTP-Tür", kindKeim: "http-tuer" }), scope = await scopeFor(id);
    const base = `/api/campaigns/${campaign}`, path = `${base}/maps/atlas/${scope.parentMapId}`;
    const status = await app.inject({ method: "GET", url: `${path}/knoten/${id}/betretbar`, headers: { cookie } });
    expect(status.statusCode).toBe(200); expect(status.json().version).toBe(1);
    const denied = await app.inject({ method: "GET", url: `${path}/knoten/${id}/betretbar`, headers: { cookie: playerCookie } });
    expect(denied.statusCode).toBe(404);
    const forged = await app.inject({ method: "POST", url: `${base}/betreten`, headers: { cookie, origin: config.origin }, payload: { ...input(id), ...scope, keim: "caller-controlled" } });
    expect(forged.statusCode).toBe(400);
    const created = await app.inject({ method: "POST", url: `${base}/betreten`, headers: { cookie, origin: config.origin }, payload: { ...input(id), ...scope } });
    expect(created.statusCode).toBe(200);
    const children = await app.inject({ method: "GET", url: `${base}/maps/tactical/${created.json().mapId}/children`, headers: { cookie } });
    expect(children.statusCode).toBe(200); expect(children.json().ancestors).toHaveLength(2);
    expect(children.json().nodes[0]).toMatchObject({ canEnter: true, vorhandeneKarteId: null });
    expect(children.json().nodes[0]).not.toHaveProperty("kindKeim");
    expect((await app.inject({ method: "GET", url: `${base}/maps/tactical/${created.json().mapId}/children`, headers: { cookie: playerCookie } })).statusCode).toBe(404);
  });

  /**
   * DIE KARTENART HINTER DER TUER.
   *
   * Unterkarten entstehen beim Betreten — und entstanden bis hierher IMMER als Grundriss. Hinter
   * einem Hoehleneingang lagen damit Raeume und Gaenge: die Wahl aus Feature 16 endete an der
   * Tuer. Sie reicht jetzt hindurch, und zwar genau bis zur ersten Erzeugung.
   */
  it("erzeugt hinter der Tuer eine Hoehle, wenn eine Hoehle bestellt ist", async () => {
    const betreten = createBetreten(db, config);
    const knotenId = await seedKnoten({ titel: "Der Schlund", kindKeim: "seed-hoehle-0001" });
    const result = await betreten.betrete(gm, campaign, { ...input(knotenId), art: "hoehle" });
    expect(result.erzeugt).toBe(true);
    const quelle = await createTactical(db).getSource(gm, campaign, result.mapId);
    expect(quelle.provenance.generator).toBe("chronicle-hoehle");
    expect(quelle.provenance.creator).toBe("chronicle-hoehle");
  });

  it("bleibt ohne Angabe beim Grundriss", async () => {
    // Nicht-Rueckwirkung: eine Tuer, die gestern Raeume und Gaenge ergab, fuehrt heute nicht
    // ploetzlich in Fels — und jeder Aufrufer von gestern kennt das Feld gar nicht.
    const betreten = createBetreten(db, config);
    const knotenId = await seedKnoten({ titel: "Die stille Kammer", kindKeim: "seed-grundriss-0001" });
    const result = await betreten.betrete(gm, campaign, input(knotenId));
    const quelle = await createTactical(db).getSource(gm, campaign, result.mapId);
    expect(quelle.provenance.generator).toBe("chronicle-grundriss");
  });

  it("waehlt die Art nur beim ERSTEN Betreten — danach ist der Ort da", async () => {
    const betreten = createBetreten(db, config);
    const knotenId = await seedKnoten({ titel: "Die zweimal betretene Hoehle", kindKeim: "seed-hoehle-0002" });
    const erst = await betreten.betrete(gm, campaign, { ...input(knotenId), art: "hoehle" });
    // Zweiter Gang durch dieselbe Tuer, diesmal ausdruecklich mit der anderen Art: der Ort wird
    // NICHT neu gewuerfelt. Eine Adresse, die bei jedem Besuch einen neuen Ort praegt, waere ein
    // Spielautomat und kein Ort.
    const zweit = await betreten.betrete(gm, campaign, { ...input(knotenId), art: "grundriss" });
    expect(zweit.mapId).toBe(erst.mapId);
    expect(zweit.erzeugt).toBe(false);
    const quelle = await createTactical(db).getSource(gm, campaign, erst.mapId);
    expect(quelle.provenance.generator).toBe("chronicle-hoehle");
  });

  it("weist eine Kartenart neben einer angehaengten Karte ab, statt sie zu schlucken", async () => {
    // Zwei verschiedene Auftraege: anhaengen ODER erzeugen. Die Art waere hier wirkungslos, und
    // eine wirkungslos geschluckte Eingabe ist schlimmer als eine abgelehnte.
    const betreten = createBetreten(db, config);
    const knotenId = await seedKnoten({ titel: "Die verbundene Halle", kindKeim: "seed-anhang-0001" });
    const fertige = await generateMap("Vorhandene Halle");
    await expect(betreten.betrete(gm, campaign, { ...input(knotenId), targetMapId: fertige, art: "hoehle" }))
      .rejects.toThrow(TacticalValidationError);
    // Und die Tuer steht danach immer noch offen: der abgewiesene Versuch hat nichts angelegt.
    expect((await betreten.betretbar(gm, campaign, knotenId)).vorhandeneKarteId).toBeNull();
  });

  it("traegt die Wahl durch die echte Anwendung — und weist eine erfundene Art ab", async () => {
    const knotenId = await seedKnoten({ titel: "Die Route zur Hoehle", kindKeim: "seed-http-0001" });
    const scope = await scopeFor(knotenId);
    const antwort = await app.inject({ method: "POST", url: `/api/campaigns/${campaign}/betreten`,
      headers: { cookie, "content-type": "application/json", origin: config.origin },
      payload: JSON.stringify({ ...input(knotenId), ...scope, art: "hoehle" }) });
    expect(antwort.statusCode).toBe(200);
    const quelle = await createTactical(db).getSource(gm, campaign, antwort.json().mapId as string);
    expect(quelle.provenance.generator).toBe("chronicle-hoehle");

    const erfunden = await seedKnoten({ titel: "Der Irrgang", kindKeim: "seed-http-0002" });
    const abgewiesen = await app.inject({ method: "POST", url: `/api/campaigns/${campaign}/betreten`,
      headers: { cookie, "content-type": "application/json", origin: config.origin },
      payload: JSON.stringify({ ...input(erfunden), ...(await scopeFor(erfunden)), art: "labyrinth" }) });
    expect(abgewiesen.statusCode).toBe(400);
  });
});
