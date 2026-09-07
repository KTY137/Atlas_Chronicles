// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2026 Kaya Yesilyurt - Atlas Chronicles. Siehe LICENSE.
import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createTestDb, migrate, type Db } from "../src/db/index.ts";
import { createCampaigns } from "../src/domain/campaigns.ts";
import { createMetering } from "../src/domain/metering.ts";
import { Gone } from "../src/domain/errors.ts";

const STUNDE = 3600_000;

/**
 * Die Raumuhr rechnet auf Wandzeit offener Sitzungen (design/10 §3.4). Diese Tests halten
 * die eine Eigenschaft fest, an der eine Abrechnung sonst still falsch wird: Ein Abend, der
 * über die Fenstergrenze läuft, gehört anteilig in beide Fenster und nicht ganz in eines.
 */
describe("Raumuhr — was eine Kampagne verbraucht hat", () => {
  let db: Db;
  const clock = Date.UTC(2026, 8, 7, 12);
  const cfg = { now: () => clock };
  beforeAll(async () => { db = await createTestDb(); await migrate(db); }, 30_000);
  afterAll(async () => { await db?.close(); });

  async function tisch(name: string) {
    const gm = randomUUID(), spieler = randomUUID();
    for (const [id, role] of [[gm, "leitung"], [spieler, "gast"]]) {
      await db.query("INSERT INTO users(id,display_name,platform_role,created_at) VALUES($1,$2,$3,$4)", [id, id, role, clock]);
    }
    const campaign = await createCampaigns(db, cfg).createCampaign(gm, { name });
    await db.query("INSERT INTO campaign_memberships(campaign_id,user_id,role,display_name,name_skeleton) VALUES($1,$2,'spieler',$3,$3)", [campaign.id, spieler, "Sera"]);
    const scene = randomUUID();
    await db.query("INSERT INTO scenes(id,campaign_id,name,entry_ids,fiction_date,created_by,created_at) VALUES($1,$2,'Abend','[]','1. Regen',$3,$4)", [scene, campaign.id, gm, clock]);
    return { gm, spieler, campaignId: campaign.id, scene };
  }

  async function sitzung(t: { campaignId: string; scene: string; gm: string }, von: number, bis: number | null) {
    const id = randomUUID();
    await db.query("INSERT INTO game_sessions(id,campaign_id,scene_id,started_at,ended_at,started_by) VALUES($1,$2,$3,$4,$5,$6)",
      [id, t.campaignId, t.scene, von, bis, t.gm]);
    return id;
  }

  it("summiert die Wandzeit geschlossener Sitzungen", async () => {
    const t = await tisch("Summe");
    await sitzung(t, clock - 5 * STUNDE, clock - 3 * STUNDE);
    await sitzung(t, clock - 2 * STUNDE, clock - STUNDE);

    const verbrauch = await createMetering(db, cfg).campaignUsage(t.gm, t.campaignId);
    expect(verbrauch.sessions).toBe(2);
    expect(verbrauch.openSessions).toBe(0);
    expect(verbrauch.roomSeconds).toBe(3 * 3600);
  });

  it("zählt eine noch offene Sitzung bis zum Fensterende, nie darüber hinaus", async () => {
    const t = await tisch("Offen");
    await sitzung(t, clock - 2 * STUNDE, null);

    const jetzt = await createMetering(db, cfg).campaignUsage(t.gm, t.campaignId);
    expect(jetzt.openSessions).toBe(1);
    expect(jetzt.roomSeconds).toBe(2 * 3600);

    // Ein früher endendes Fenster darf die offene Sitzung nicht bis zur Gegenwart mitzählen.
    const frueher = await createMetering(db, cfg).campaignUsage(t.gm, t.campaignId, 0, clock - STUNDE);
    expect(frueher.roomSeconds).toBe(3600);
  });

  it("beschneidet einen Abend, der über die Fenstergrenze läuft, statt ihn ganz zuzuschlagen", async () => {
    const t = await tisch("Grenze");
    // Vier Stunden, von denen genau eine im Fenster liegt.
    await sitzung(t, clock - 4 * STUNDE, clock);
    const verbrauch = await createMetering(db, cfg).campaignUsage(t.gm, t.campaignId, clock - STUNDE, clock);
    expect(verbrauch.sessions).toBe(1);
    expect(verbrauch.roomSeconds).toBe(3600);
  });

  it("zählt Sitzungen gar nicht, die das Fenster nicht berühren", async () => {
    const t = await tisch("Daneben");
    await sitzung(t, clock - 10 * STUNDE, clock - 9 * STUNDE);
    const verbrauch = await createMetering(db, cfg).campaignUsage(t.gm, t.campaignId, clock - STUNDE, clock);
    expect(verbrauch).toMatchObject({ sessions: 0, roomSeconds: 0 });
  });

  it("misst offene Medienräume getrennt von der Raumzeit", async () => {
    const t = await tisch("Medien");
    const s = await sitzung(t, clock - 3 * STUNDE, clock - STUNDE);
    await db.query(`INSERT INTO media_rooms(id,campaign_id,session_id,kind,provider_room,created_by,created_at,closed_at)
      VALUES($1,$2,$3,'table',$4,$5,$6,$7)`, [randomUUID(), t.campaignId, s, `raum-${randomUUID()}`, t.gm, clock - 3 * STUNDE, clock - 2 * STUNDE]);

    const verbrauch = await createMetering(db, cfg).campaignUsage(t.gm, t.campaignId);
    expect(verbrauch.roomSeconds).toBe(2 * 3600);
    expect(verbrauch.mediaRoomSeconds).toBe(3600);
  });

  it("zeigt die Rechnung nur der Spielleitung — nach S1 zahlt genau einer für den Tisch", async () => {
    const t = await tisch("Rechte");
    await sitzung(t, clock - STUNDE, clock);
    await expect(createMetering(db, cfg).campaignUsage(t.spieler, t.campaignId)).rejects.toBeInstanceOf(Gone);
  });

  it("liefert dem Betreiber alle Kampagnen — die Zahl, auf der die Kalkulation ruht", async () => {
    const a = await tisch("Dichte A"), b = await tisch("Dichte B");
    await sitzung(a, clock - STUNDE, clock);
    await sitzung(b, clock - 2 * STUNDE, clock);

    const alle = await createMetering(db, cfg).allUsage();
    const gefunden = new Map(alle.map((u) => [u.campaignId, u.roomSeconds]));
    expect(gefunden.get(a.campaignId)).toBe(3600);
    expect(gefunden.get(b.campaignId)).toBe(2 * 3600);
    // Die Betreibersicht kennt jede Kampagne, auch die ohne jede Sitzung.
    expect(alle.length).toBeGreaterThanOrEqual(gefunden.size);
  });
});
