// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2026 Kaya Yesilyurt - Atlas Chronicles. Siehe LICENSE.
/**
 * Native prueft das Modul `regelarchiv` so streng wie jedes andere: echte Beziehungen, echte
 * Zeiten. Eine Archivzeile ohne ihr Paket waere die Notiz ueber etwas, das es nicht gibt.
 */
import { fail } from "../campaign-v3-json.ts";
import type { CampaignTablesV18 } from "./schema.ts";
import { collectRegelarchivIdentityIds, type RulePackageArchivRow } from "./data.ts";

function require(value: unknown, message: string): asserts value { if (!value) fail("regelarchiv", message); }
const zeit = (value: unknown) => typeof value === "string" && /^(0|[1-9][0-9]{0,18})$/.test(value);

export function validateRegelarchivTables(tables: CampaignTablesV18, campaignId: string): void {
  const archiv = tables.rule_package_archiv as unknown as readonly RulePackageArchivRow[];
  const users = new Set(tables.users.map(u => String(u.id)));
  // Genau der Fremdschluessel aus 030: Kampagne, Kennung und Version zusammen.
  const pakete = new Set(tables.rule_packages.filter(p => p.campaign_id === campaignId)
    .map(p => `${String(p.package_id)}@${String(p.version)}`));
  for (const id of collectRegelarchivIdentityIds(archiv)) require(users.has(id), "regelarchiv identity");
  for (const row of archiv) {
    require(row.campaign_id === campaignId, "archive campaign");
    require(pakete.has(`${row.package_id}@${row.version}`), "archived package missing");
    require(zeit(row.archived_at), "archive fields");
  }
}
