// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2026 Kaya Yesilyurt - Atlas Chronicles. Siehe LICENSE.
import { parseTacticalCartography, parseTacticalMapDocument, tacticalCartographyHash } from "@chronicle/szene";
import { fail, object } from "../campaign-v3-json.ts";
import { CAMPAIGN_V13_TABLES, type CampaignTablesV13 } from "../native-v13/schema.ts";
import type { CampaignTablesV14 } from "./schema.ts";

/** V14 records the formerly implicit relation between map CAS versions and geometry revisions.
 * Only this validation view translates acknowledgements. Exported receipts remain unchanged. */
export function cartographyCoreTables(tables: CampaignTablesV14): CampaignTablesV13 {
  const maps = new Map(tables.tactical_maps.map(row => [String(row.id), row]));
  const revisions = new Map(tables.tactical_map_revisions.map(row => [JSON.stringify([row.map_id, row.revision]), row]));
  const byVersion = new Map<string, typeof tables.tactical_map_cartography[number]>(), byMap = new Map<string, typeof tables.tactical_map_cartography[number][]>();
  for (const row of tables.tactical_map_cartography) {
    const map = maps.get(String(row.map_id)), revision = revisions.get(JSON.stringify([row.map_id, row.map_revision]));
    const revisionNumber = Number(row.map_revision), mapVersion = Number(row.map_version), key = JSON.stringify([row.map_id, mapVersion]);
    if (!map || !revision || row.campaign_id !== map.campaign_id || row.campaign_id !== revision.campaign_id) fail("tactical_map_cartography", "missing same-campaign map revision");
    if (!Number.isSafeInteger(mapVersion) || mapVersion < revisionNumber || mapVersion > Number(map!.version) || revisionNumber === 1 && mapVersion !== 1) fail("tactical_map_cartography.map_version", "invalid revision/CAS version mapping");
    if (byVersion.has(key)) fail("tactical_map_cartography.map_version", "ambiguous revision/CAS version mapping"); byVersion.set(key, row);
    const list = byMap.get(String(row.map_id)) ?? []; list.push(row); byMap.set(String(row.map_id), list);
  }
  for (const rows of byMap.values()) {
    rows.sort((left, right) => Number(left.map_revision) - Number(right.map_revision));
    for (let index = 1; index < rows.length; index++) if (Number(rows[index]!.map_version) <= Number(rows[index - 1]!.map_version)) fail("tactical_map_cartography.map_version", "revision/CAS versions must increase strictly");
  }
  const receipts = new Map<string, number>();
  const projected = tables.tactical_command_receipts.map(row => {
    if (row.operation !== "map.revise") return row;
    const ack = object(row.ack, "receipt.ack"), key = JSON.stringify([row.subject_id, ack.version]), mapping = byVersion.get(key);
    if (!mapping) {
      const first = byMap.get(String(row.subject_id))?.[0];
      if (first && Number(ack.version) >= Number(first.map_version)) fail("tactical_map_cartography.map_version", "missing revision/CAS mapping for cartography acknowledgement");
      return row; // Frozen validation remains responsible for unmapped legacy receipts.
    }
    if (Number(mapping.map_revision) < 2) fail("tactical_map_cartography.map_version", "a revision command cannot create initial cartography");
    receipts.set(key, (receipts.get(key) ?? 0) + 1);
    return { ...row, ack: { ...ack, version: mapping.map_revision! } };
  });
  for (const [key, row] of byVersion) if (Number(row.map_revision) > 1 && receipts.get(key) !== 1) fail("tactical_map_cartography.map_version", "a saved revision requires exactly one matching original CAS acknowledgement");
  return { ...Object.fromEntries(CAMPAIGN_V13_TABLES.map(table => [table.name, tables[table.name]])), tactical_command_receipts: projected } as unknown as CampaignTablesV13;
}

/** The frozen v13 core has already proved maps, sources, snapshots, anchors and child addresses. */
export function checkCartographyTables(tables: CampaignTablesV14, campaignId: string): void {
  const revisions = new Map(tables.tactical_map_revisions.map(row => [JSON.stringify([row.map_id, row.revision]), row]));
  const seen = new Set<string>(), first = new Map<string, number>();
  for (const row of tables.tactical_map_cartography) {
    const key = JSON.stringify([row.map_id, row.map_revision]), revision = revisions.get(key);
    if (row.campaign_id !== campaignId || !revision || revision.campaign_id !== campaignId) fail("tactical_map_cartography", "missing same-campaign map revision");
    if (seen.has(key)) fail("tactical_map_cartography", "duplicate revision cartography"); seen.add(key);
    const map = parseTacticalMapDocument(revision!.document), cartography = parseTacticalCartography(row.document, map);
    if (tacticalCartographyHash(cartography) !== row.content_hash) fail("tactical_map_cartography", "cartography content hash mismatch");
    const mapId = String(row.map_id), number = Number(row.map_revision);
    first.set(mapId, Math.min(first.get(mapId) ?? number, number));
  }
  for (const row of tables.tactical_map_revisions) {
    const start = first.get(String(row.map_id));
    if (start !== undefined && Number(row.revision) >= start && !seen.has(JSON.stringify([row.map_id, row.revision]))) fail("tactical_map_cartography", "cartography is missing after this map adopted revision cartography");
  }
}
