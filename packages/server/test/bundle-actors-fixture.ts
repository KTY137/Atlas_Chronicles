// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2026 Kaya Yesilyurt - Atlas Chronicles. Siehe LICENSE.
import { randomUUID } from "node:crypto";
import { DEMO_RULE_PACKAGE } from "@chronicle/rules";
import { createActors } from "../src/domain/actors.ts";
import type { Db } from "../src/db/index.ts";
import type { DomainConfig } from "../src/domain/campaigns.ts";

/** Exercise each durable actor/item command through the real domain for restore fixtures. */
export async function seedBundleActors(db: Db, campaign: string, gm: string, player: string, entry: string, cfg: DomainConfig) {
  const actors = createActors(db, cfg), command = () => randomUUID(), reason = "Explicit archive fixture change";
  const definition = { schemaVersion: 1, name: "Historical companion", kind: "companion", loreEntryId: entry, package: { id: DEMO_RULE_PACKAGE.id, version: DEMO_RULE_PACKAGE.version }, fields: { insight: 2 } };
  const template = await actors.createActorTemplate(gm, campaign, { commandId: command(), definition });
  await actors.reviseActorTemplate(gm, campaign, template.id, { commandId: command(), expectedVersion: 1, reason, definition: { ...definition, name: "Later template" } });
  const actor = await actors.instantiateActor(gm, campaign, { commandId: command(), templateId: template.id, templateRevision: 1, name: "Ash" });
  await actors.updateActor(gm, campaign, actor.id, { commandId: command(), expectedVersion: 1, reason, name: "Ash of the lantern", kind: "companion", loreEntryId: entry });
  // Der Weg des bestaetigten Figurantrags, ohne seine Tabellen: die Spielleitung loest den Befehl
  // aus, die Figur gehoert aber dem Spieler und die Kontrolle geht an ihn. Genau diese Herkunft
  // muss eine Sicherung unveraendert wieder herstellen — sonst gehoerte die zurueckgespielte
  // Figur ploetzlich der Spielleitung.
  const beantragt = await actors.instantiateActor(gm, campaign, { commandId: command(), templateId: template.id, templateRevision: 1, name: "Nell" },
    { createdBy: player, grantTo: player });
  await actors.grantController(gm, campaign, actor.id, player, { commandId: command(), expectedVersion: 0, reason });
  const perspective = await actors.getReaderPerspective(player, campaign);
  await actors.setReaderPerspective(player, campaign, { commandId: command(), expectedVersion: perspective.version, actorId: actor.id });
  const itemDefinition = { schemaVersion: 1, name: "Lantern", loreEntryId: entry, tags: ["light"] };
  const itemTemplate = await actors.createItemTemplate(gm, campaign, { commandId: command(), definition: itemDefinition });
  await actors.reviseItemTemplate(gm, campaign, itemTemplate.id, { commandId: command(), expectedVersion: 1, reason, definition: { ...itemDefinition, name: "Later lantern template" } });
  const retryInput = { commandId: command(), templateId: itemTemplate.id, templateRevision: 1, holderActorId: actor.id };
  const item = await actors.instantiateItem(gm, campaign, retryInput);
  await actors.updateItem(player, campaign, item.id, { commandId: command(), expectedVersion: 1, reason, state: { quantity: 3, notes: "An old acquisition", equipped: true } });
  await actors.transferItem(gm, campaign, item.id, { commandId: command(), expectedVersion: 2, reason, holderActorId: null });
  await actors.archiveItem(gm, campaign, item.id, { commandId: command(), expectedVersion: 3, reason });
  await actors.revokeController(gm, campaign, actor.id, player, { commandId: command(), expectedVersion: 1, reason });
  await actors.archiveActor(gm, campaign, actor.id, { commandId: command(), expectedVersion: 2, reason });
  await actors.archiveActorTemplate(gm, campaign, template.id, { commandId: command(), expectedVersion: 2, reason });
  await actors.archiveItemTemplate(gm, campaign, itemTemplate.id, { commandId: command(), expectedVersion: 2, reason });
  return { retryInput, historicalItem: item, actorId: actor.id, grantedActorId: beantragt.id };
}
