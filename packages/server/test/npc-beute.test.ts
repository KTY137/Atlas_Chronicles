// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2026 Kaya Yesilyurt - Atlas Chronicles. Siehe LICENSE.
import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { DEMO_RULE_PACKAGE } from "@chronicle/rules";
import { createTestDb, migrate, type Db } from "../src/db/index.ts";
import { createCampaigns } from "../src/domain/campaigns.ts";
import { createIdentity } from "../src/identity/index.ts";
import { createActors } from "../src/domain/actors.ts";

/**
 * NPC-Vorlagen mit Beute nach Wahrscheinlichkeit.
 *
 * Eine Beutetabelle ist keine Auswahl von einem aus vielen, sondern eine Liste von
 * Moeglichkeiten: der Wolf traegt vielleicht das Fell und vielleicht den Zahn, unabhaengig
 * voneinander. Und sie nennt jede Gegenstandsvorlage MIT ihrer Revision — eine Tabelle, die auf
 * "die jeweils neueste Fassung" zeigte, aenderte sich, ohne dass jemand sie anfasst.
 */
const config = { origin: "https://beute.test", cookieSecret: "npc-beute-cookie-secret-with-over-32-characters" };
const befehl = () => ({ commandId: randomUUID() });
const gegenstand = (name: string) => ({ schemaVersion: 1 as const, name, loreEntryId: null, tags: [] });
const figur = (name: string, beute: readonly unknown[]) => ({
  schemaVersion: 2 as const, name, kind: "creature" as const, loreEntryId: null,
  package: { id: DEMO_RULE_PACKAGE.id, version: DEMO_RULE_PACKAGE.version }, fields: {}, beute,
});

describe("Beute an der Figurvorlage", () => {
  let db: Db, gm: string;
  beforeAll(async () => { db = await createTestDb(); await migrate(db); gm = (await createIdentity(db, config).bootstrap("Kaya")).userId; }, 30_000);
  afterAll(async () => db?.close());

  async function fixture() {
    const campaign = (await createCampaigns(db).createCampaign(gm, { name: "Der Wald" })).id;
    const actors = createActors(db);
    const vorlage = async (name: string) =>
      (await actors.createItemTemplate(gm, campaign, { ...befehl(), definition: gegenstand(name) })).id;
    return { campaign, actors, fell: await vorlage("Wolfsfell"), zahn: await vorlage("Wolfszahn") };
  }
  const erschaffe = async (f: Awaited<ReturnType<typeof fixture>>, beute: readonly unknown[]) => {
    const vorlage = await f.actors.createActorTemplate(gm, f.campaign, { ...befehl(), definition: figur("Wolf", beute) });
    return f.actors.instantiateActor(gm, f.campaign, { ...befehl(), templateId: vorlage.id, templateRevision: 1 });
  };

  it("legt sichere Beute wirklich in das Inventar der neuen Figur", async () => {
    const f = await fixture();
    const wolf = await erschaffe(f, [
      { templateId: f.fell, templateRevision: 1, wahrscheinlichkeit: 100, menge: [1, 1] },
      { templateId: f.zahn, templateRevision: 1, wahrscheinlichkeit: 100, menge: [3, 3] },
    ]);
    const inventar = await f.actors.listItems(gm, f.campaign, wolf.id);
    // Beide Zeilen greifen: eine Beutetabelle ist eine Liste von Moeglichkeiten, keine Auswahl.
    expect(inventar.map(i => i.definition.name).sort()).toEqual(["Wolfsfell", "Wolfszahn"]);
    expect(inventar.find(i => i.definition.name === "Wolfszahn")!.state.quantity).toBe(3);
  });

  it("haelt sich an die Mengenspanne", async () => {
    const f = await fixture();
    for (let i = 0; i < 12; i += 1) {
      const wolf = await erschaffe(f, [{ templateId: f.fell, templateRevision: 1, wahrscheinlichkeit: 100, menge: [2, 5] }]);
      const menge = (await f.actors.listItems(gm, f.campaign, wolf.id))[0]!.state.quantity;
      expect(menge).toBeGreaterThanOrEqual(2);
      expect(menge).toBeLessThanOrEqual(5);
    }
  });

  it("beachtet die Wahrscheinlichkeit, statt sie zu ignorieren", async () => {
    // Bei einem Prozent und vierzig Figuren ist "alle vierzig tragen es" praktisch unmoeglich.
    // Umgekehrt "mindestens eine" zu verlangen waere flackernd — also wird nur die Richtung
    // geprueft, und die genuegt: wer die Wahrscheinlichkeit ignoriert, faellt hier durch.
    const f = await fixture();
    let mit = 0;
    for (let i = 0; i < 40; i += 1) {
      const wolf = await erschaffe(f, [{ templateId: f.fell, templateRevision: 1, wahrscheinlichkeit: 1, menge: [1, 1] }]);
      if ((await f.actors.listItems(gm, f.campaign, wolf.id)).length) mit += 1;
    }
    expect(mit).toBeLessThan(40);
  });

  it("laesst eine Vorlage der Fassung 1 ohne Beute", async () => {
    // Nicht-Rueckwirkung: eine Vorlage von vorgestern erschafft weiter eine Figur mit leeren Haenden.
    const f = await fixture();
    const alt = await f.actors.createActorTemplate(gm, f.campaign, { ...befehl(), definition: {
      schemaVersion: 1, name: "Reh", kind: "creature", loreEntryId: null,
      package: { id: DEMO_RULE_PACKAGE.id, version: DEMO_RULE_PACKAGE.version }, fields: {},
    } });
    const reh = await f.actors.instantiateActor(gm, f.campaign, { ...befehl(), templateId: alt.id, templateRevision: 1 });
    expect(await f.actors.listItems(gm, f.campaign, reh.id)).toEqual([]);
  });

  it("weist eine Beutezeile ab, die keine Vorlage, keine Spanne oder keine Wahrscheinlichkeit hat", async () => {
    const f = await fixture();
    const kaputt = [
      [{ templateId: f.fell, templateRevision: 1, wahrscheinlichkeit: 0, menge: [1, 1] }],
      [{ templateId: f.fell, templateRevision: 1, wahrscheinlichkeit: 101, menge: [1, 1] }],
      [{ templateId: f.fell, templateRevision: 1, wahrscheinlichkeit: 50, menge: [0, 1] }],
      [{ templateId: f.fell, templateRevision: 1, wahrscheinlichkeit: 50 }],
      [{ templateId: f.fell, wahrscheinlichkeit: 50, menge: [1, 1] }],
      [{ templateId: f.fell, templateRevision: 1, wahrscheinlichkeit: 50, menge: [1, 1], erfunden: true }],
    ];
    // `createActorTemplate` prueft den Entwurf SYNCHRON im Arrow-Rumpf, bevor ein Versprechen
    // entsteht — ein ungueltiger Entwurf wirft also sofort und wird nicht abgelehnt.
    for (const beute of kaputt)
      expect(() => f.actors.createActorTemplate(gm, f.campaign, { ...befehl(), definition: figur("Wolf", beute) })).toThrow();
  });

  it("nennt eine Gegenstandsvorlage, die es geben muss", async () => {
    // Eine Beutezeile auf eine Vorlage, die es nicht gibt, verspricht einen Gegenstand, den
    // niemand erschaffen kann — die Datenbank weist sie beim Erschaffen ab.
    const f = await fixture();
    await expect(erschaffe(f, [{ templateId: randomUUID(), templateRevision: 1, wahrscheinlichkeit: 100, menge: [1, 1] }]))
      .rejects.toThrow();
  });
});
