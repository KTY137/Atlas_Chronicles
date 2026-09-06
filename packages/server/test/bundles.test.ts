import { randomUUID } from "node:crypto";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve, sep } from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { CAMPAIGN_V4_TABLES as CAMPAIGN_TABLES, campaignSemanticDiffV4 as campaignSemanticDiff,
  parseCampaignBundleV4 as parseCampaignBundle, serializeCampaignBundleV4 as serializeCampaignBundle, type CampaignBundleV4 as CampaignBundle } from "@chronicle/io";
import { DEMO_RULE_PACKAGE } from "@chronicle/rules";
import { createTestDb, migrate, type Db } from "../src/db/index.ts";
import { createIdentity } from "../src/identity/index.ts";
import { createCampaigns } from "../src/domain/campaigns.ts";
import { createDocuments } from "../src/domain/documents.ts";
import { createGameplay } from "../src/domain/gameplay.ts";
import { createWeek } from "../src/domain/week.ts";
import { createImports } from "../src/domain/imports.ts";
import { createAtlas } from "../src/domain/atlas.ts";
import { createCommunication } from "../src/domain/communication.ts";
import { createActors } from "../src/domain/actors.ts";
import { seedBundleActors } from "./bundle-actors-fixture.ts";
import { exportCampaignBundle, initializeCampaignRestoreTarget, inspectCampaignRestore, restoreCampaignBundle, enrollRestoredCampaignGm } from "../src/domain/bundles.ts";

const clock = Date.UTC(2026, 8, 6, 12), cfg = { now: () => clock, seed: () => "00000001000000020000000300000004" };
const authConfig = { ...cfg, origin: "https://bundle.test", cookieSecret: "credential-secret-never-exported".repeat(2) };
const paragraph = (text: string) => ({ inhalt: { kind: "absatz" as const, inhalt: [{ text, marks: [] }] }, tags: ["spuren"] });

/** Small synthetic Azgaar boundary fixture; the importer separately tests real captures. */
const mapSource = JSON.stringify({ info: { version: "1.151.2", seed: "bundle-test", width: 200, height: 100, mapName: "Restore Island" }, settings: { options: {} },
  pack: { cells: [{ i: 1, p: [20, 20], h: 50, f: 1, state: 0, province: 0, v: [0, 1, 2] }], vertices: [{ i: 0, p: [0, 0] }, { i: 1, p: [40, 0] }, { i: 2, p: [20, 40] }],
    features: [{ i: 0 }, { i: 1, land: true }], states: [{ i: 0 }], provinces: [{ i: 0 }], burgs: [{ i: 0 }, { i: 1, name: "Harbor", x: 20, y: 20, cell: 1, population: 5 }] } });

describe("native campaign export and empty-target restore", () => {
  let source: Db, bundle: CampaignBundle, gm: string, player: string, campaign: string, actor: string, entryId: string, originalCookie: string;
  let actorFixture: Awaited<ReturnType<typeof seedBundleActors>>;
  beforeAll(async () => {
    source = await createTestDb(); await migrate(source);
    const identity = createIdentity(source, authConfig), session = await identity.bootstrap("Kaya");
    gm = session.userId; originalCookie = session.setCookie;
    const campaigns = createCampaigns(source, cfg); campaign = (await campaigns.createCampaign(gm, { name: "Restorable evidence" })).id;
    const members: { userId: string; actorId: string }[] = [];
    for (const name of ["Sera", "Dorn"]) {
      const invitation = await campaigns.issueInvitation(gm, campaign), request = await campaigns.requestJoin(invitation.code, { displayName: name });
      members.push(await campaigns.approveJoin(gm, campaign, request.id));
    }
    player = members[0]!.userId; actor = members[0]!.actorId;
    const otherActor = members[1]!.actorId, docs = createDocuments(source, cfg), game = createGameplay(source, cfg), week = createWeek(source, cfg);
    const entry = await docs.saveEntry(gm, campaign, { title: "Archive", passages: [paragraph("Frozen letter knowledge"), paragraph("Mint target"), paragraph("Private GM detail")] });
    entryId = entry.entryId;
    await docs.revealPassage(gm, campaign, entry.passagen[0]!.pid, actor);
    const scene = await game.createScene(gm, campaign, { name: "First evening", entryIds: [entryId], fictionDate: "Day 1" });
    const active = await game.startScene(gm, campaign, scene.id);
    // Simulate a genuine pre-006 session: no baseline ever existed for this history.
    await source.transaction(async tx => {
      await tx.query("SET LOCAL chronicle.restore='on'");
      await tx.query("INSERT INTO game_sessions(id,campaign_id,scene_id,started_at,ended_at,started_by) VALUES($1,$2,$3,$4,$5,$6)", [randomUUID(), campaign, scene.id, clock - 2000, clock - 1000, gm]);
    });
    await game.updateSheet(player, campaign, { actorId: actor, expectedVersion: 0, fields: { insight: 6 } });
    await game.activatePackage(gm, campaign, { packageId: DEMO_RULE_PACKAGE.id, packageVersion: DEMO_RULE_PACKAGE.version, expectedVersion: 0 });
    const authorization = await game.issueVollmacht(gm, campaign, { commandId: randomUUID(), actorId: actor, passageId: entry.passagen[1]!.pid, actionId: "investigate", threshold: -1000, expiresAt: clock + 60_000, budgetKind: "player", fictionDate: "Day 1" });
    const roll = await game.prepareVollmacht(player, campaign, authorization.id, { commandId: randomUUID() });
    await game.confirmVollmacht(player, campaign, roll.id);
    await week.setClock(gm, campaign, { day: 1, label: "First day", postDays: 0, version: 0 });
    const letter = await week.sendLetter(player, campaign, { commandId: randomUUID(), toActorIds: [otherActor], passageIds: [entry.passagen[0]!.pid], note: "Preserve this envelope" });
    await week.readLetter(members[1]!.userId, campaign, letter.id);
    await week.markRead(members[1]!.userId, campaign, entryId);
    const importer = createImports(source, cfg);
    const preview = await importer.previewEron(gm, campaign, { wikiUrl: "https://eron.fandom.com", templates: [], articles: [
      { pageid: 1, revid: 101, ns: 0, title: "Imported lore", wikitext: "An imported account describes a route to [[Unaccepted lore]] and preserves its original source." },
      { pageid: 2, revid: 102, ns: 0, title: "Unaccepted lore", wikitext: "A different imported article deliberately remains only in the reviewed preview." },
    ] });
    await importer.acceptEron(gm, campaign, preview.artifactId, [preview.entries.find(e => e.title === "Imported lore")!.id]);
    const atlas = createAtlas(source, cfg), map = await atlas.importMap(gm, campaign, mapSource), view = await atlas.getMap(gm, campaign, map.id);
    await atlas.linkEntry(gm, campaign, map.id, view.pins[0]!.id, entryId, view.version!);
    await atlas.revealNode(gm, campaign, map.id, view.pins[0]!.id, actor);
    const channel = createCommunication(source, cfg), post = await channel.send(player, campaign, { commandId: randomUUID(), kind: "letter", body: "Durable authored post" });
    await channel.send(gm, campaign, { commandId: randomUUID(), kind: "letter", parentId: post.id, body: "Durable authored reply" });
    await channel.send(player, campaign, { commandId: randomUUID(), kind: "table", body: "EPHEMERAL TABLE SENTINEL" });
    await source.query("INSERT INTO media_rooms(id,campaign_id,session_id,kind,provider_room,created_by,created_at) VALUES($1,$2,$3,'table',$4,$5,$6)", [randomUUID(), campaign, active.id, "PRIVATE PROVIDER SENTINEL", gm, clock]);
    await source.query("INSERT INTO audit(campaign_id,actor_user_id,kind,data,created_at) VALUES($1,$2,'media.room.closed',$3,$4)", [campaign, gm, { provider: "PRIVATE PROVIDER SENTINEL" }, clock]);
    // Legacy consumed-roll cycle remains a supported durable representation.
    await source.transaction(async tx => {
      await tx.query("SET CONSTRAINTS ALL DEFERRED");
      const door = randomUUID(), legacyRoll = randomUUID();
      await tx.query("INSERT INTO vollmachten(id,campaign_id,actor_id,passage_id,issued_by,target_slug,threshold,expires_at,issued_at,budget_kind,status,consumed_roll_id) VALUES($1,$2,$3,$4,$5,'archive',1,$6,$7,'player','eingeloest',$8)", [door, campaign, actor, entry.passagen[0]!.pid, gm, clock + 60_000, clock, legacyRoll]);
      await tx.query("INSERT INTO rolls(id,campaign_id,vollmacht_id,seed,expression,result,threshold,package_pin,status,rolled_at,confirmed_at,confirmation) VALUES($1,$2,$3,'legacy-seed','1d20',12,1,'kern@1.0.0','bestaetigt',$4,$4,$5)", [legacyRoll, campaign, door, clock, { legacy: true }]);
      await tx.query("INSERT INTO access_incidents(campaign_id,user_id,vollmacht_id,created_at) VALUES($1,$2,$3,$4)", [campaign, player, door, clock]);
    });
    actorFixture = await seedBundleActors(source, campaign, gm, player, entryId, cfg);
    bundle = await exportCampaignBundle(source, gm, campaign, cfg);
  }, 45_000);
  afterAll(async () => { await source?.close(); });

  it("exports every durable module and excludes credentials, private runtime state and table chat", async () => {
    expect(bundle.manifest.modules.filter(module => module.name !== "tactical" && module.name !== "authoring").every(module => module.count > 0)).toBe(true);
    expect(bundle.manifest.modules.find(module => module.name === "tactical")!.count).toBe(0);
    expect(bundle.manifest.modules.find(module => module.name === "authoring")!.count).toBe(0);
    expect(new Set(bundle.tables.actor_inventory_events.map(row => row.operation)).size).toBe(16);
    expect((await source.query("SELECT platform_role FROM users WHERE id=$1", [gm])).rows[0]!.platform_role).toBe("leitung");
    const serialized = serializeCampaignBundle(bundle);
    expect(serialized).not.toContain("EPHEMERAL TABLE SENTINEL"); expect(serialized).not.toContain("PRIVATE PROVIDER SENTINEL");
    expect(serialized).not.toContain(originalCookie); expect(bundle.tables.users.every(row => !Object.hasOwn(row, "platform_role"))).toBe(true);
    expect(bundle.tables.game_sessions.length).toBe(2); expect(bundle.tables.week_baselines.length).toBe(1);
    await expect(exportCampaignBundle(source, player, campaign, cfg)).rejects.toThrow();
    expect(campaignSemanticDiff(bundle, parseCampaignBundle(serialized))).toEqual([]);
  });

  it.each([
    ["an added durable column", "ALTER TABLE entries ADD COLUMN future_payload jsonb"],
    ["an added actor column", "ALTER TABLE actor_profiles ADD COLUMN future_payload jsonb"],
    ["an unknown durable table", "CREATE TABLE future_campaign_history (id text PRIMARY KEY, campaign_id text NOT NULL, payload jsonb)"],
  ])("requires a format migration before exporting %s", async (_description, ddl) => {
    const fresh = await createTestDb();
    try {
      await migrate(fresh);
      const owner = await createIdentity(fresh, authConfig).bootstrap("Future owner");
      const created = await createCampaigns(fresh, cfg).createCampaign(owner.userId, { name: "Future campaign" });
      await fresh.query(ddl);
      await expect(exportCampaignBundle(fresh, owner.userId, created.id, cfg)).rejects.toMatchObject({
        name: "CampaignRestoreError", message: expect.stringMatching(/migration/i),
      });
    } finally { await fresh.close(); }
  }, 20_000);

  it("dry-runs without mutation and roundtrips through a persistent database restart", async () => {
    const directory = await mkdtemp(join(tmpdir(), "chronicle-bundle-"));
    let target = await createTestDb(join(directory, "database"));
    try {
      await initializeCampaignRestoreTarget(target);
      const sequences = async () => (await target.query("SELECT last_value::text,is_called FROM lineage_events_seq_seq")).rows;
      const before = await sequences();
      expect((await inspectCampaignRestore(target, bundle)).dryRun).toBe(true);
      expect((await target.query("SELECT id FROM users")).rowCount).toBe(0); expect(await sequences()).toEqual(before);
      expect((await restoreCampaignBundle(target, bundle)).enrollmentRequired).toBe(true);
      await target.close(); target = await createTestDb(join(directory, "database"));
      const exported = await exportCampaignBundle(target, gm, campaign, cfg);
      expect(campaignSemanticDiff(bundle, exported)).toEqual([]);
      expect(await createActors(target, cfg).instantiateItem(gm, campaign, actorFixture.retryInput)).toEqual(actorFixture.historicalItem);
      expect(campaignSemanticDiff(bundle, await exportCampaignBundle(target, gm, campaign, cfg))).toEqual([]);
      await expect(target.query("UPDATE actor_template_revisions SET content_hash=repeat('0',64)")).rejects.toThrow(/append-only/i);
      await expect(target.query("DELETE FROM actor_inventory_events")).rejects.toThrow(/append-only/i);
      expect((await target.query("SELECT 1 FROM users WHERE platform_role<>'gast'")).rowCount).toBe(0);
      expect((await target.query("SELECT 1 FROM credentials")).rowCount).toBe(0);
      await expect(createIdentity(target, authConfig).authenticate(originalCookie)).rejects.toThrow();
      const preserved = await target.query("SELECT seal FROM confirmed_mints"); expect(preserved.rows[0]!.seal).toBe(bundle.tables.confirmed_mints[0]!.seal);
      await expect(target.query("UPDATE confirmed_mints SET seal='altered'")).rejects.toThrow(/append-only/i);
      const game = createGameplay(target, cfg), next = await game.createScene(gm, campaign, { name: "Next evening", entryIds: [entryId], fictionDate: "Day 2" });
      const session = await game.startScene(gm, campaign, next.id);
      expect((await target.query("SELECT 1 FROM week_baselines WHERE session_id=$1", [session.id])).rowCount).toBe(1);
      const historyMaximum = bundle.tables.lineage_events.reduce((max, row) => BigInt(String(row.seq)) > max ? BigInt(String(row.seq)) : max, 0n);
      await createDocuments(target, cfg).saveEntry(gm, campaign, { title: "New history", passages: [paragraph("After restore")] });
      expect(BigInt(String((await target.query("SELECT max(seq)::text AS value FROM lineage_events")).rows[0]!.value))).toBeGreaterThan(historyMaximum);
    } finally {
      await target.close();
      if (!resolve(directory).startsWith(resolve(tmpdir()) + sep)) throw new Error("Unexpected temporary database path");
      await rm(directory, { recursive: true, force: true });
    }
  }, 30_000);

  it("rolls back all inserted modules when a later insert fails", async () => {
    const target = await createTestDb(); await migrate(target);
    const failing: Db = { ...target, transaction: fn => target.transaction(tx => fn({ ...tx, query: async <T>(sql: string, params?: readonly unknown[]) => {
      if (sql.startsWith('INSERT INTO "actor_inventory_events"')) throw new Error("Injected restore failure");
      return tx.query<T>(sql, params);
    } })) };
    try {
      await expect(restoreCampaignBundle(failing, bundle)).rejects.toThrow("Injected restore failure");
      for (const table of CAMPAIGN_TABLES) expect((await target.query(`SELECT 1 FROM "${table.name}" LIMIT 1`)).rowCount).toBe(0);
      expect((await inspectCampaignRestore(target, bundle)).dryRun).toBe(true);
    } finally { await target.close(); }
  }, 20_000);

  it("rejects occupied identities and invalid evidence before any restore writes", async () => {
    const target = await createTestDb(); await migrate(target);
    try {
      await target.query("INSERT INTO users(id,display_name,created_at) VALUES($1,'Existing person',0)", [gm]);
      await expect(restoreCampaignBundle(target, bundle)).rejects.toThrow(/must be empty/);
      expect((await target.query("SELECT display_name FROM users WHERE id=$1", [gm])).rows[0]!.display_name).toBe("Existing person");
      expect((await target.query("SELECT 1 FROM campaigns")).rowCount).toBe(0);
      await expect(initializeCampaignRestoreTarget(target)).rejects.toThrow(/must be empty/);
      const corrupt = structuredClone(bundle) as unknown as { tables: { confirmed_mints: { seal: string }[] } };
      corrupt.tables.confirmed_mints[0]!.seal = "0".repeat(64);
      await expect(restoreCampaignBundle(target, corrupt)).rejects.toThrow();
    } finally { await target.close(); }
  }, 20_000);

  it("enrolls only an explicitly selected historical GM using a one-use pairing code", async () => {
    const target = await createTestDb(); await migrate(target);
    try {
      await restoreCampaignBundle(target, bundle);
      await expect(enrollRestoredCampaignGm(target, campaign, player, authConfig)).rejects.toThrow(/GM member/);
      await expect(enrollRestoredCampaignGm(target, campaign, actor, authConfig)).rejects.toThrow(/GM member/);
      await expect(enrollRestoredCampaignGm(target, randomUUID(), gm, authConfig)).rejects.toThrow(/GM member/);
      expect((await target.query("SELECT 1 FROM users WHERE platform_role='leitung'")).rowCount).toBe(0);
      expect((await target.query("SELECT 1 FROM pairing_codes")).rowCount).toBe(0);
      const failure: Db = { ...target, transaction: fn => target.transaction(tx => {
        const intercepted: Db = { ...tx, transaction: nested => nested(intercepted), query: async <T>(sql: string, params?: readonly unknown[]) => {
          if (sql.includes("INSERT INTO pairing_codes")) throw new Error("Enrollment write failed");
          return tx.query<T>(sql, params);
        } };
        return fn(intercepted);
      }) };
      await expect(enrollRestoredCampaignGm(failure, campaign, gm, authConfig)).rejects.toThrow("Enrollment write failed");
      expect((await target.query("SELECT 1 FROM users WHERE platform_role='leitung'")).rowCount).toBe(0);
      const pairing = await enrollRestoredCampaignGm(target, campaign, gm, authConfig);
      expect(pairing.expiresAt).toBe(clock + 600_000);
      expect((await target.query("SELECT 1 FROM credentials")).rowCount).toBe(0);
      const identity = createIdentity(target, authConfig), session = await identity.redeemPairing(pairing.code);
      expect(await identity.authenticate(session.setCookie)).toMatchObject({ userId: gm, platformRole: "leitung" });
      await expect(identity.redeemPairing(pairing.code)).rejects.toThrow();
      await expect(identity.bootstrap("Accidental replacement owner")).rejects.toThrow();
      expect(campaignSemanticDiff(bundle, await exportCampaignBundle(target, gm, campaign, cfg))).toEqual([]);
    } finally { await target.close(); }
  }, 20_000);
});
