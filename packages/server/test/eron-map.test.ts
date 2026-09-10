// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2026 Kaya Yesilyurt - Atlas Chronicles. Siehe LICENSE.
import Fastify, { type FastifyError, type FastifyRequest, type FastifyReply } from "fastify";
import { readFile } from "node:fs/promises";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { AzgaarImportError } from "@chronicle/forge";
import { dateiSlug } from "@chronicle/io";
import { createTestDb, migrate, type Db } from "../src/db/index.ts";
import { createIdentity } from "../src/identity/index.ts";
import { createCampaigns } from "../src/domain/campaigns.ts";
import { createAtlas } from "../src/domain/atlas.ts";
import { createWikiMedien } from "../src/domain/wiki-medien.ts";
import { Gone } from "../src/domain/errors.ts";
import { registerImports } from "../src/http/imports.ts";

/**
 * EINE HEREINGEHOLTE KARTE, VOM IMPORT BIS ZUM BILD.
 *
 * Bis zum 2026-09-10 fuhr dieser Test über den Knopf „Beispielkarte laden": eine Karte und ein
 * Bild lagen als Datei neben dem Programm, und ein Klick zog beide herein. Der Knopf ist weg —
 * Kaya: *„mach die andaria map raus ich importier die dann selber nix hardcoded"*. Die App trägt
 * kein fremdes Kartenbild mehr mit sich.
 *
 * Der Test bleibt, denn er prüft nicht den Knopf, sondern den Weg: Karten-JSON hinein, Bild in den
 * Bildbestand, Marker projiziert, Rohbild nur für die Spielleitung. Die Karte liegt jetzt als
 * Prüfmuster unter `design/fixtures/` und wird nicht ausgeliefert — genau wie jede andere Karte,
 * die ein Mensch selbst hereinholt.
 */
describe("Eine hereingeholte Karte trägt ihr Bild aus dem Bestand", () => {
  const config = { origin: "https://eron-map.test", cookieSecret: "eron-map-secret-longer-than-thirty-two-characters", bootstrapToken: "eron-map-bootstrap-token-long-enough" };
  const quelle = new URL("../../../design/fixtures/eron/map-andaria.json", import.meta.url);
  const bildQuelle = new URL("../../../design/fixtures/eron/media/Andaria_03.02.2024.webp", import.meta.url);
  let db: Db, gm: string, campaign: string, otherCampaign: string, player: string, actor: string, cookie: string, playerCookie: string;
  let app: ReturnType<typeof Fastify>, mapId: string, json: string;
  beforeAll(async () => {
    db = await createTestDb(); await migrate(db);
    json = await readFile(quelle, "utf8");
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

  it("stores an uploaded map once and returns the existing one on repetition", async () => {
    const first = await app.inject({ method: "POST", url: url("/maps/import"), headers: { cookie }, payload: { json } });
    expect(first.statusCode).toBe(200); const result = first.json(); mapId = result.id;
    expect(result).toMatchObject({ unchanged: false, report: { orte: 190 } });
    const again = await app.inject({ method: "POST", url: url("/maps/import"), headers: { cookie }, payload: { json } });
    expect(again.json()).toMatchObject({ id: mapId, unchanged: true });
    expect(await createAtlas(db).importMap(gm, campaign, json)).toMatchObject({ id: mapId, unchanged: true });
    expect((await db.query("SELECT id FROM atlas_maps WHERE campaign_id=$1", [campaign])).rowCount).toBe(1);
    const source = (await db.query<{ kind: string; source: { quelle: { json: string } } }>("SELECT kind,source FROM artifacts WHERE campaign_id=$1", [campaign])).rows[0]!;
    expect(source.kind).toBe("eron-map"); expect(source.source.quelle.json).toBe(json);
  });

  /**
   * Das Bild kommt getrennt und über den Bildbestand — derselbe Weg, den ein Wiki-Abruf und ein
   * hochgeladenes Kartenbild nehmen. Der Name ist keine Angabe von außen: die Karte nennt ihr Bild
   * selbst in `mapImage`, und `dateiSlug` macht daraus den Bestandsnamen.
   */
  it("connects the picture through the campaign's own image store, matched by the name in the map", async () => {
    const dateiname = dateiSlug("Andaria 03.02.2024.jpg");
    const medien = createWikiMedien(db);
    const zeile = await medien.anlegen(gm, campaign, { dateiname, lizenz: "unbekannt", quelle: "Prüfmuster, nicht ausgeliefert" });
    const befund = await medien.bytesAnnehmen(gm, campaign, zeile.id, new Uint8Array(await readFile(bildQuelle)));
    // Der Typ ist GEMESSEN: die Datei heißt in der Karte `.jpg` und ist eine WebP.
    expect(befund).toMatchObject({ mime: "image/webp", breite: 8192, hoehe: 8192, gespeichert: true });
  }, 30_000);

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
    // Und ein Mitspieler holt keine Karte herein; das bleibt bei der Spielleitung.
    expect((await app.inject({ method: "POST", url: url("/maps/import"), headers: { cookie: playerCookie }, payload: { json } })).statusCode).toBe(404);
  });

  it("rejects broken source JSON through the existing upload route", async () => {
    const response = await app.inject({ method: "POST", url: url("/maps/import"), headers: { cookie }, payload: { json: '{"mapBounds":[],"mapImage":"x"}' } });
    expect(response.statusCode).toBe(400);
  });
});
