// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2026 Kaya Yesilyurt - Atlas Chronicles. Siehe LICENSE.
import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { FastifyInstance } from "fastify";
import { SIEDLUNG_STANDORTE, type SiedlungOptionen } from "@chronicle/forge";
import { buildApp } from "../src/app.ts";
import { createTestDb, migrate, type Db } from "../src/db/index.ts";
import { createIdentity } from "../src/identity/index.ts";
import { createCampaigns } from "../src/domain/campaigns.ts";
import { createTactical } from "../src/domain/tactical.ts";
import { validateKartenOptionen } from "../src/domain/grundriss.ts";

describe("settlement location crosses preview and persistence boundaries", () => {
  let db: Db, app: FastifyInstance, gm: string, campaign: string, cookie: string;
  const config = { origin: "https://map-location.test", cookieSecret: "map-location-cookie-secret-over-32-characters", bootstrapToken: "map-location-bootstrap-secret-over-32-characters" };
  beforeAll(async () => {
    db = await createTestDb(); await migrate(db);
    const identity = createIdentity(db, config);
    gm = (await identity.bootstrap("Kaya")).userId;
    campaign = (await createCampaigns(db).createCampaign(gm, { name: "Standorte" })).id;
    cookie = `chronicle_session=${(await identity.issueSession(gm)).value}`;
    app = await buildApp(db, config);
  }, 30_000);
  afterAll(async () => { await app?.close(); await db?.close(); });
  const post = (path: string, payload: object) => app.inject({ method: "POST", url: `/api/campaigns/${campaign}/tactical/generate${path}`, headers: { cookie, origin: config.origin }, payload });

  it.each(SIEDLUNG_STANDORTE)("%s persists precisely the visible preview and normalized location", async standort => {
    const tactical = createTactical(db), before = await tactical.listMaps(gm, campaign);
    const request = { commandId: randomUUID(), name: `Ort ${standort}`, keim: "location:http", art: "siedlung", stil: "gemalt", optionen: { standort, art: "weiler", bauwerke: 9, licht: false } };
    const preview = await post("/preview", request);
    expect(preview.statusCode, preview.body).toBe(200);
    expect(await tactical.listMaps(gm, campaign)).toHaveLength(before.length);
    const created = await post("", request);
    expect(created.statusCode, created.body).toBe(200);
    const mapId = created.json().ack.subjectId, saved = await tactical.getMap(gm, campaign, mapId);
    expect(saved.document).toEqual(preview.json().document);
    expect(saved.cartography).toEqual(preview.json().cartography);
    // Fantasy-Städte (v11) haben tausende Flächen; den vollen Optionsvektor trägt die Grundfläche,
    // die übrigen tragen einen Vermerk desselben Erzeugers oder, als Gelände, keinen (1-MiB-Grenze).
    expect(saved.cartography?.regions[0]?.provenance?.optionen.standort).toBe(standort);
    expect(saved.cartography?.regions.every(region => region.provenance === null || region.provenance.generator === "chronicle-siedlung")).toBe(true);
    expect((await tactical.getMap(gm, campaign, mapId)).document).toEqual(saved.document);
    expect((await post("", request)).json().ack.subjectId).toBe(mapId);
    expect(await tactical.listMaps(gm, campaign)).toHaveLength(before.length + 1);
  });

  it("strictly rejects invalid or misplaced location options through both entrypoints", async () => {
    for (const standort of ["meer", "mountain", "", null, 2]) {
      const request = { commandId: randomUUID(), name: "Ungültig", keim: "invalid", art: "siedlung", optionen: { standort } };
      expect((await post("/preview", request)).statusCode).toBe(400);
      expect((await post("", request)).statusCode).toBe(400);
      expect(() => validateKartenOptionen("siedlung", { standort } as Partial<SiedlungOptionen>)).toThrow();
    }
    for (const art of ["grundriss", "hoehle"] as const) {
      expect((await post("/preview", { commandId: randomUUID(), name: "Falsche Karte", keim: "invalid", art, optionen: { standort: "insel" } })).statusCode).toBe(400);
      expect(() => validateKartenOptionen(art, { standort: "insel" })).toThrow();
    }
  });
});
