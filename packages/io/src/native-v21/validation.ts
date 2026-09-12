// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2026 Kaya Yesilyurt - Atlas Chronicles. Siehe LICENSE.
import { validAdventureTree } from "@chronicle/protocol";
import { vermisseBild } from "../bild.ts";
import { fail } from "../campaign-v3-json.ts";
import type { CampaignTablesV21 } from "./schema.ts";
function require(value: unknown, message: string): asserts value { if (!value) fail("tabletop", message); }
export function validateTabletopTables(t: CampaignTablesV21, campaignId: string): void {
  const users = new Set(t.users.map(row => row.id)), scenes = new Set(t.scenes.filter(row => row.campaign_id === campaignId).map(row => row.id));
  const actors = new Set(t.actors.filter(row => row.campaign_id === campaignId).map(row => row.id));
  for (const row of t.adventure_trees) {
    require(row.campaign_id === campaignId && users.has(row.updated_by) && BigInt(String(row.updated_at)) >= 0n, "adventure campaign/author/time invalid");
    require(validAdventureTree(row.document), "adventure document invalid");
    require(row.current_node_id === null || row.document.nodes.some(node => node.id === row.current_node_id), "current adventure node missing");
    require(row.document.nodes.every(node => node.sceneId === null || scenes.has(node.sceneId)), "adventure scene missing");
  }
  for (const row of t.actor_portraits) {
    require(row.campaign_id === campaignId && users.has(row.updated_by) && actors.has(row.actor_id) && BigInt(String(row.updated_at)) >= 0n, "portrait campaign/actor/author/time invalid");
    const imageFields = [row.mime, row.sha256, row.bytes, row.breite, row.hoehe, row.daten];
    if (imageFields.every(value => value === null)) continue;
    require(imageFields.every(value => value !== null) && typeof row.daten === "string", "partial portrait image");
    require(/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(row.daten), "portrait base64 invalid");
    const bytes = Buffer.from(row.daten, "base64");
    require(bytes.length > 0 && bytes.length <= 8 * 1024 * 1024 && bytes.toString("base64") === row.daten, "portrait size/encoding invalid");
    const measured = vermisseBild(bytes);
    require(measured.mime === row.mime && measured.sha256 === row.sha256 && String(measured.bytes) === row.bytes && measured.breite === row.breite && measured.hoehe === row.hoehe, "portrait bytes differ from metadata");
  }
}
