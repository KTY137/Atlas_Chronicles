// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2026 Kaya Yesilyurt - Atlas Chronicles. Siehe LICENSE.
import { randomUUID } from "node:crypto";
import { HOW_TO_BE_A_HERO_PACKAGE, HTBAH_EXAMPLE_CHARACTERS } from "@chronicle/rules/examples";
import type { Db } from "../src/db/index.ts";
import { createCampaigns } from "../src/domain/campaigns.ts";
import { createActors } from "../src/domain/actors.ts";
import { createGameplay } from "../src/domain/gameplay.ts";
import { createKampfbuehne } from "../src/domain/kampfbuehne.ts";
import { createCommunication } from "../src/domain/communication.ts";

export const KAMPF_ZEIT = Date.UTC(2026, 8, 23, 12);
export const kampfCfg = { now: () => KAMPF_ZEIT, seed: () => "00000001000000020000000300000004" };
export const PAKET = { id: HOW_TO_BE_A_HERO_PACKAGE.id, version: HOW_TO_BE_A_HERO_PACKAGE.version };
/** Ein echtes 1×1-PNG — der Server bestimmt den Typ aus den Bytes. */
export const PNG_BASE64 = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==";

/**
 * Eine Runde, wie sie am Tisch sitzt: Spielleitung, zwei Spielende mit eigener Figur, How to be a
 * Hero aktiv (ein Balken `hp` „Lebenspunkte", Höchstwert 100, leer = Niederlage) und eine
 * Wolf-Vorlage mit 40 Lebenspunkten. Mira hat 70.
 */
export async function kampfFixture(db: Db) {
  const gm = randomUUID();
  await db.query("INSERT INTO users(id,display_name,platform_role,created_at) VALUES($1,'Spielleitung','leitung',$2)", [gm, KAMPF_ZEIT]);
  const campaigns = createCampaigns(db, kampfCfg), campaign = (await campaigns.createCampaign(gm, { name: "Kampftisch" })).id;
  const einladung = await campaigns.issueInvitation(gm, campaign);
  const beitreten = async (displayName: string) => {
    const mitglied = await campaigns.approveJoin(gm, campaign, (await campaigns.requestJoin(einladung.code, { displayName })).id);
    return { userId: mitglied.userId, actorId: mitglied.actorId! };
  };
  const mira = await beitreten("Mira"), thorn = await beitreten("Thorn");
  const game = createGameplay(db, kampfCfg), actors = createActors(db, kampfCfg);
  await game.installPackage(gm, campaign, HOW_TO_BE_A_HERO_PACKAGE);
  const review = await game.previewPackage(gm, campaign, HOW_TO_BE_A_HERO_PACKAGE);
  await game.activatePackage(gm, campaign, { packageId: PAKET.id, packageVersion: PAKET.version, expectedVersion: 0, previewHash: review.previewHash });
  await game.updateSheet(mira.userId, campaign, { actorId: mira.actorId, expectedVersion: 0, fields: { ...HTBAH_EXAMPLE_CHARACTERS[0]!.fields, hp: 70 } });
  const wolf = await actors.createActorTemplate(gm, campaign, { commandId: randomUUID(), definition: {
    schemaVersion: 1, name: "Wolf", kind: "creature", loreEntryId: null, package: PAKET, fields: { hp: 40 } } });
  /** Eine Gegnerfigur aus der Wolf-Vorlage — sie gehört der Spielleitung, keine Spielerin sieht sie in ihrer Liste. */
  const gegner = async (name: string) => (await actors.instantiateActor(gm, campaign, { commandId: randomUUID(), templateId: wolf.id, templateRevision: wolf.revision, name })).id;
  return { gm, campaign, mira, thorn, game, actors, wolf, gegner, buehne: createKampfbuehne(db, kampfCfg), live: createCommunication(db, kampfCfg) };
}
