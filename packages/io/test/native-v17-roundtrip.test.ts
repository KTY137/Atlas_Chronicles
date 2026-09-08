// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2026 Kaya Yesilyurt - Atlas Chronicles. Siehe LICENSE.
import { describe, expect, it } from "vitest";
import { canonicalHash, type CanonicalValue } from "@chronicle/core";
import { createCampaignBundleV3 } from "../src/campaign-bundle-v3.ts";
import { upgradeCampaignBundleV3 } from "../src/native-v4/bundle.ts";
import { createCampaignBundleV17, parseCampaignBundleV17, serializeCampaignBundleV17, validateCampaignBundleV17 } from "../src/native-v17/bundle.ts";
import { CAMPAIGN_V16_TABLES } from "../src/native-v16/schema.ts";
import { CAMPAIGN_V17_TABLES, CAMPAIGN_V17_MODULES, emptyCampaignTablesV17, type CampaignTableNameV17 } from "../src/native-v17/schema.ts";
import { createCurrentCampaignBundle, currentCampaignSemanticDiff, parseCurrentCampaignBundle, serializeCurrentCampaignBundle } from "../src/native-v17/current.ts";
import { campaignFixtureV3 } from "./campaign-v3-fixture.ts";

type MutableRow = Record<string, CanonicalValue>;
const seal = (value: unknown) => canonicalHash(value as CanonicalValue);
const AT = "1788696000000";

/** Die Kampagne aus dem gemeinsamen Fixture, dazu die drei Tabellen des Figurantrags. */
function fixture(withApplications = true) {
  const legacy = upgradeCampaignBundleV3(createCampaignBundleV3(campaignFixtureV3(0))).bundle;
  const tables = JSON.parse(JSON.stringify({ ...emptyCampaignTablesV17(), ...legacy.tables })) as Record<CampaignTableNameV17, MutableRow[]>;
  const data = { campaignId: "campaign", universeId: "universe", exportedAt: legacy.manifest.exportedAt, tables };
  if (!withApplications) return data;
  tables.figurvorlagen_freigaben = [{ template_id: "actor-template", campaign_id: "campaign", version: 2,
    freed_by: "gm", freed_at: AT, revoked_at: null }];
  const freigabeRequest = { campaignId: "campaign", operation: "figurvorlage.freigeben", templateId: "actor-template", expectedVersion: 0 };
  const freigabeAck = { templateId: "actor-template", campaignId: "campaign", freigegeben: true, version: 1,
    freedBy: "gm", freedAt: AT, revokedAt: null };
  const antragInput = { commandId: "antrag-1", templateId: "actor-template", name: "Nell", anfangswerte: { insight: 3 } };
  const antragRequest = { campaignId: "campaign", operation: "figurantrag.beantragen", input: antragInput };
  const offen = { id: "antrag", templateId: "actor-template", templateRevision: 1, name: "Nell", anfangswerte: { insight: 3 }, status: "offen",
    version: 1, antragsteller: "sera", createdAt: AT, decidedBy: null, decidedAt: null, actorId: null, reason: null };
  const bestaetigt = { ...offen, status: "bestaetigt", version: 2, decidedBy: "gm", decidedAt: AT, actorId: "companion" };
  const entscheidung = { campaignId: "campaign", operation: "figurantrag.bestaetigen", id: "antrag", expectedVersion: 1, reason: null };
  tables.figurantraege = [{ id: "antrag", campaign_id: "campaign", antragsteller: "sera", template_id: "actor-template",
    template_revision: 1, name: "Nell", anfangswerte: { insight: 3 }, state: "bestaetigt", reason: null, version: 2,
    created_at: AT, decided_by: "gm", decided_at: AT, actor_id: "companion" }];
  tables.figurantrag_events = [
    { seq: "1", command_id: "freigabe-1", campaign_id: "campaign", actor_user_id: "gm", operation: "figurvorlage.freigeben",
      request_hash: seal(freigabeRequest), request: freigabeRequest,
      payload: { schemaVersion: 1, before: null, after: freigabeAck }, ack: freigabeAck, created_at: AT },
    { seq: "2", command_id: "antrag-1", campaign_id: "campaign", actor_user_id: "sera", operation: "figurantrag.beantragen",
      request_hash: seal(antragRequest), request: antragRequest,
      payload: { schemaVersion: 1, anfangswerte: { insight: 3 } }, ack: offen, created_at: AT },
    { seq: "3", command_id: "bestaetigung-1", campaign_id: "campaign", actor_user_id: "gm", operation: "figurantrag.bestaetigen",
      request_hash: seal(entscheidung), request: entscheidung,
      payload: { schemaVersion: 1, before: offen, after: bestaetigt }, ack: bestaetigt, created_at: AT },
  ] as unknown as MutableRow[];
  return data;
}

describe("native v17 Figurantrag", () => {
  it("ergänzt V16 rein additiv um genau drei Tabellen und ein Modul", () => {
    const vorher = CAMPAIGN_V16_TABLES.map(table => table.name);
    const nachher = CAMPAIGN_V17_TABLES.map(table => table.name);
    expect(nachher.slice(0, vorher.length)).toEqual(vorher);
    expect(nachher.slice(vorher.length)).toEqual(["figurvorlagen_freigaben", "figurantraege", "figurantrag_events"]);
    expect(CAMPAIGN_V17_MODULES[CAMPAIGN_V17_MODULES.length - 1]).toBe("figurantrag");
  });

  it("führt Freigabe, Antrag und Entscheidung unverändert durch Export und Import", () => {
    const data = fixture();
    const bundle = createCampaignBundleV17(data);
    expect(bundle.version).toBe(17);
    expect(bundle.manifest.figurantragSchemaVersion).toBe(1);
    expect(bundle.manifest.modules.find(m => m.name === "figurantrag")).toMatchObject({ count: 5, version: 1 });
    const reopened = parseCampaignBundleV17(serializeCampaignBundleV17(bundle));
    expect(reopened.tables.figurvorlagen_freigaben).toEqual(data.tables.figurvorlagen_freigaben);
    expect(reopened.tables.figurantraege).toEqual(data.tables.figurantraege);
    expect(reopened.tables.figurantrag_events).toEqual(data.tables.figurantrag_events);
    expect(validateCampaignBundleV17(reopened).manifest.contentHash).toBe(bundle.manifest.contentHash);
    expect(currentCampaignSemanticDiff(bundle, reopened)).toEqual([]);
  });

  it("delegiert an V16, solange alle drei Tabellen leer sind", () => {
    // Ohne Antraege reicht V17 unveraendert an V16 weiter — und V16 an V15, und so fort, bis zu
    // der Fassung, die diese Daten wirklich braucht. Eine Kampagne ohne Antraege bekommt deshalb
    // keine neue Formatnummer aufgedraengt.
    const leer = createCurrentCampaignBundle(fixture(false));
    expect(leer.version).toBeLessThan(17);
    expect(parseCurrentCampaignBundle(serializeCurrentCampaignBundle(leer)).version).toBe(leer.version);
    for (const name of ["figurvorlagen_freigaben", "figurantraege", "figurantrag_events"] as const) {
      const data = fixture(), leerer = JSON.parse(JSON.stringify(data)) as typeof data;
      for (const other of ["figurvorlagen_freigaben", "figurantraege", "figurantrag_events"] as const)
        if (other !== name) leerer.tables[other] = [];
      // Eine einzige nicht leere Tabelle genügt: dann ist die Datei eine V17-Datei. Ein
      // Ereignisbuch ohne seinen Antrag ist dagegen die Quittung von nichts und wird abgewiesen.
      if (name === "figurantrag_events") expect(() => createCurrentCampaignBundle(leerer)).toThrow(/application/);
      else expect(createCurrentCampaignBundle(leerer).version).toBe(17);
    }
    expect(createCurrentCampaignBundle(fixture()).version).toBe(17);
  });

  it("weist eine gefälschte Prüfsumme, ein unbekanntes Feld und einen erfundenen Verweis ab", () => {
    const gefaelscht = fixture();
    (gefaelscht.tables.figurantrag_events[1] as MutableRow).request_hash = "b".repeat(64);
    expect(() => createCampaignBundleV17(gefaelscht)).toThrow(/request hash/);

    const unbekannt = fixture();
    (unbekannt.tables.figurantrag_events[0]!.ack as unknown as MutableRow).extra = "x";
    expect(() => createCampaignBundleV17(unbekannt)).toThrow(/unknown field/);

    const erfunden = fixture();
    erfunden.tables.figurvorlagen_freigaben[0]!.template_id = "nicht-vorhanden";
    expect(() => createCampaignBundleV17(erfunden)).toThrow(/released template missing/);

    const widerspruch = fixture();
    widerspruch.tables.figurantraege[0]!.state = "abgelehnt";
    expect(() => createCampaignBundleV17(widerspruch)).toThrow(/confirmed application actor/);

    const fremd = fixture();
    fremd.tables.figurantraege[0]!.antragsteller = "unbekannt";
    expect(() => createCampaignBundleV17(fremd)).toThrow(/figurantrag identity/);
  });
});
