// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2026 Kaya Yesilyurt - Atlas Chronicles. Siehe LICENSE.
/**
 * Native prueft `kartenherkunft` so streng wie 031 es tut: eine Herkunft ohne ihre Karte waere
 * die Notiz ueber etwas, das es nicht gibt, und eine Wiki-Herkunft ohne Wiki keine Herkunft,
 * sondern eine Behauptung.
 */
import { fail } from "../campaign-v3-json.ts";
import type { CampaignTablesV19 } from "./schema.ts";
import { collectKartenherkunftIdentityIds, type AtlasKartenherkunftRow } from "./data.ts";

function verlange(value: unknown, message: string): asserts value { if (!value) fail("kartenherkunft", message); }
const zeit = (value: unknown) => typeof value === "string" && /^(0|[1-9][0-9]{0,18})$/.test(value);
const zahl = (value: unknown) => value === null || typeof value === "string" && /^[1-9][0-9]{0,18}$/.test(value);

export function validateKartenherkunftTables(tables: CampaignTablesV19, campaignId: string): void {
  const zeilen = tables.atlas_karten_herkunft as unknown as readonly AtlasKartenherkunftRow[];
  const users = new Set(tables.users.map(u => String(u.id)));
  const karten = new Set(tables.atlas_maps.filter(m => m.campaign_id === campaignId).map(m => String(m.id)));
  for (const id of collectKartenherkunftIdentityIds(zeilen)) verlange(users.has(id), "kartenherkunft identity");
  for (const row of zeilen) {
    verlange(row.campaign_id === campaignId, "provenance campaign");
    verlange(karten.has(row.map_id), "provenance map missing");
    verlange(zeit(row.abgerufen_am), "provenance time");
    verlange(zahl(row.pageid) && zahl(row.revid), "provenance page/revision numbers");
    const ausWiki = row.art === "wiki" || row.art === "beispiel";
    verlange(ausWiki === (row.wiki_url !== null), "provenance wiki address");
    verlange(ausWiki === (row.seitentitel !== null), "provenance page title");
    verlange(row.wiki_url === null || row.wiki_url.startsWith("https://"), "provenance address must be https");
    verlange(row.art !== "bild" || row.bild_dateiname !== null, "an image map needs its picture");
    /**
     * `bild_dateiname` ist ein NAME, keine Fremdschluesselkante — und das mit Absicht: die Karte
     * nennt ihr Bild (`mapImage`), lange bevor irgendwer seine Bytes hat. Ein Abruf, bei dem die
     * Seite ankam und das Bild nicht, hinterlaesst genau diesen Zustand, und er ist gueltig: eine
     * Karte ohne Hintergrund, die weiss, welchen sie sucht.
     */
  }
}
