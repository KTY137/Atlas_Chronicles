// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2026 Kaya Yesilyurt - Atlas Chronicles. Siehe LICENSE.
import { describe, expect, it } from "vitest";
import type { CanonicalValue } from "@chronicle/core";
import { createCampaignBundleV3 } from "../src/campaign-bundle-v3.ts";
import { upgradeCampaignBundleV3 } from "../src/native-v4/bundle.ts";
import { CAMPAIGN_V17_TABLES } from "../src/native-v17/schema.ts";
import { createCampaignBundleV18, parseCampaignBundleV18, serializeCampaignBundleV18, validateCampaignBundleV18 } from "../src/native-v18/bundle.ts";
import { CAMPAIGN_V18_TABLES, CAMPAIGN_V18_MODULES, emptyCampaignTablesV18, type CampaignTableNameV18 } from "../src/native-v18/schema.ts";
import { createCurrentCampaignBundle, currentCampaignSemanticDiff, parseCurrentCampaignBundle, serializeCurrentCampaignBundle } from "../src/native-v18/current.ts";
import { campaignFixtureV3 } from "./campaign-v3-fixture.ts";

type MutableRow = Record<string, CanonicalValue>;
const AT = "1788696000000";

/** Die Kampagne aus dem gemeinsamen Fixture, dazu ein aus der Bibliothek genommenes Paket. */
function fixture(withArchive = true) {
  const legacy = upgradeCampaignBundleV3(createCampaignBundleV3(campaignFixtureV3(0))).bundle;
  const tables = JSON.parse(JSON.stringify({ ...emptyCampaignTablesV18(), ...legacy.tables })) as Record<CampaignTableNameV18, MutableRow[]>;
  const data = { campaignId: "campaign", universeId: "universe", exportedAt: legacy.manifest.exportedAt, tables };
  if (!withArchive) return data;
  const pkg = tables.rule_packages[0]!;
  tables.rule_package_archiv = [{ campaign_id: "campaign", package_id: pkg.package_id!, version: pkg.version!,
    archived_at: AT, archived_by: "gm" }];
  return data;
}

describe("native v18 Regelarchiv", () => {
  it("ergänzt V17 rein additiv um genau eine Tabelle und ein Modul", () => {
    const vorher = CAMPAIGN_V17_TABLES.map(table => table.name);
    const nachher = CAMPAIGN_V18_TABLES.map(table => table.name);
    expect(nachher.slice(0, vorher.length)).toEqual(vorher);
    expect(nachher.slice(vorher.length)).toEqual(["rule_package_archiv"]);
    expect(CAMPAIGN_V18_MODULES[CAMPAIGN_V18_MODULES.length - 1]).toBe("regelarchiv");
  });

  it("führt das genommene Paket unverändert durch Sicherung und Wiederherstellung", () => {
    const data = fixture();
    const bundle = createCampaignBundleV18(data);
    expect(bundle.version).toBe(18);
    expect(bundle.manifest.regelarchivSchemaVersion).toBe(1);
    expect(bundle.manifest.modules.find(m => m.name === "regelarchiv")).toMatchObject({ count: 1, version: 1 });
    const reopened = parseCampaignBundleV18(serializeCampaignBundleV18(bundle));
    expect(reopened.tables.rule_package_archiv).toEqual(data.tables.rule_package_archiv);
    expect(validateCampaignBundleV18(reopened).manifest.contentHash).toBe(bundle.manifest.contentHash);
    expect(currentCampaignSemanticDiff(bundle, reopened)).toEqual([]);
  });

  it("delegiert an V17, solange kein Paket genommen wurde", () => {
    const leer = createCurrentCampaignBundle(fixture(false));
    expect(leer.version).toBeLessThan(18);
    expect(parseCurrentCampaignBundle(serializeCurrentCampaignBundle(leer)).version).toBe(leer.version);
    expect(createCurrentCampaignBundle(fixture()).version).toBe(18);
  });

  it("weist ein erfundenes Paket, eine fremde Kampagne und eine unbekannte Person ab", () => {
    const erfunden = fixture();
    erfunden.tables.rule_package_archiv[0]!.package_id = "de.nicht.vorhanden";
    expect(() => createCampaignBundleV18(erfunden)).toThrow(/archived package missing/);

    const fremdeVersion = fixture();
    fremdeVersion.tables.rule_package_archiv[0]!.version = "99.0.0";
    expect(() => createCampaignBundleV18(fremdeVersion)).toThrow(/archived package missing/);

    const fremd = fixture();
    fremd.tables.rule_package_archiv[0]!.campaign_id = "andere";
    expect(() => createCampaignBundleV18(fremd)).toThrow(/archive campaign/);

    const unbekannt = fixture();
    unbekannt.tables.rule_package_archiv[0]!.archived_by = "niemand";
    expect(() => createCampaignBundleV18(unbekannt)).toThrow(/regelarchiv identity/);

    const doppelt = fixture();
    doppelt.tables.rule_package_archiv.push({ ...doppelt.tables.rule_package_archiv[0]! });
    expect(() => createCampaignBundleV18(doppelt)).toThrow(/duplicate primary key/);
  });
});
