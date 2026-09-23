import { test, expect } from "@playwright/test";
import { randomBytes, randomUUID } from "node:crypto";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { D20_REFERENCE_PACKAGE, DEMO_RULE_PACKAGE, defaultSupportedActorFields } from "@chronicle/rules";
import { buildApp } from "../packages/server/src/app.ts";
import { createPgDb, createTestDb, migrate, type Db } from "../packages/server/src/db/index.ts";
import { createIdentity } from "../packages/server/src/identity/index.ts";
import { createActors } from "../packages/server/src/domain/actors.ts";
import { createCampaigns } from "../packages/server/src/domain/campaigns.ts";
import { createGameplay } from "../packages/server/src/domain/gameplay.ts";
import { instantiatePinnedActor } from "../packages/server/src/domain/pinned-actors.ts";

const schema = `chronicle_universal_v3_${randomUUID().replaceAll("-", "")}`;
const port = 9880 + Math.floor(Math.random() * 100), origin = `http://localhost:${port}`;
const config = { origin, bootstrapToken: randomBytes(32).toString("hex"), cookieSecret: randomBytes(32).toString("hex"), staticRoot: resolve("packages/client/dist") };
let admin: Db, db: Db, app: Awaited<ReturnType<typeof buildApp>>, campaignId: string, playerSession: string, actorId: string;

test.beforeAll(async () => {
  const settings = process.env.E2E_DATABASE_URL ? null : await readFile(".local/config.json", "utf8")
    .then(text => JSON.parse(text)).catch(error => { if (error.code === "ENOENT") return null; throw error; });
  const base = process.env.E2E_DATABASE_URL ?? settings?.databaseUrl;
  if (base) {
    admin = createPgDb(base); await admin.query(`CREATE SCHEMA "${schema}"`);
    const url = new URL(base); url.searchParams.set("options", `-c search_path=${schema}`); db = createPgDb(url.href);
  } else db = await createTestDb();
  await migrate(db);
  const identity = createIdentity(db, config), campaigns = createCampaigns(db), gm = await identity.bootstrap("Universal GM");
  campaignId = (await campaigns.createCampaign(gm.userId, { name: "Universal rules v3" })).id;
  const invite = await campaigns.issueInvitation(gm.userId, campaignId);
  const request = await campaigns.requestJoin(invite.code, { displayName: "V3 Player" });
  const player = await campaigns.approveJoin(gm.userId, campaignId, request.id);
  playerSession = (await identity.issueSession(player.userId)).value;

  const actors = createActors(db);
  // The join flow gives a starter actor; remove that control so "Ich" has one unambiguous actor.
  await actors.revokeController(gm.userId, campaignId, player.actorId, player.userId,
    { commandId: randomUUID(), expectedVersion: 1, reason: "Use the pinned v3 test actor instead." });

  // Install the reference package but deliberately leave the campaign default on DEMO_RULE_PACKAGE.
  await createGameplay(db).installPackage(gm.userId, campaignId, D20_REFERENCE_PACKAGE);
  const template = await actors.createActorTemplate(gm.userId, campaignId, { commandId: randomUUID(), definition: {
    schemaVersion: 1, name: "V3 Adventurer", kind: "player_character", loreEntryId: null,
    package: { id: D20_REFERENCE_PACKAGE.id, version: D20_REFERENCE_PACKAGE.version },
    fields: { ...defaultSupportedActorFields(D20_REFERENCE_PACKAGE) },
  } });
  const actor = await instantiatePinnedActor(db, config, gm.userId, campaignId,
    { commandId: randomUUID(), templateId: template.id, templateRevision: template.revision, name: "Ari V3" },
    { createdBy: player.userId, grantTo: player.userId });
  actorId = actor.id;

  const active = await createGameplay(db).listPackages(gm.userId, campaignId);
  expect(active.pin).toEqual({ id: DEMO_RULE_PACKAGE.id, version: DEMO_RULE_PACKAGE.version });

  app = await buildApp(db, config); await app.listen({ host: "127.0.0.1", port });
});

test.afterAll(async () => {
  await app?.close(); await db?.close();
  if (admin) { if (!/^chronicle_universal_v3_[a-f0-9]{32}$/.test(schema)) throw new Error("Unexpected schema"); await admin.query(`DROP SCHEMA "${schema}" CASCADE`); await admin.close(); }
});

test("a pinned D20 actor renders presentation v3 and persists a collection while campaign default stays unchanged", async ({ browser }) => {
  const context = await browser.newContext(); const errors: string[] = [];
  await context.addCookies([{ name: "chronicle_session", value: playerSession, url: origin, httpOnly: true, secure: true, sameSite: "Strict" }]);
  const page = await context.newPage(); page.on("pageerror", error => errors.push(error.message));
  await page.goto(`${origin}/?campaign=${campaignId}&stage=ich`);

  // Solange der Name lädt, heißt auch das Porträt „Deine Figur“; gemeint ist die Seitenüberschrift.
  await expect(page.getByRole("heading", { name: "Deine Figur", level: 1 })).toBeVisible();
  await expect(page.getByText("Identity", { exact: true })).toBeVisible();
  await expect(page.getByText("Statistics", { exact: true })).toBeVisible();
  await expect(page.getByText("Ability Scores", { exact: true })).toBeVisible();
  await expect(page.getByText("Combat", { exact: true })).toBeVisible();
  await expect(page.getByText("Magic", { exact: true })).toHaveCount(0); // level 1 => visibleIf is false
  await expect(page.getByRole("heading", { name: "Weapons", exact: true })).toBeVisible();

  const weapons = page.getByRole("heading", { name: "Weapons", exact: true }).locator("..");
  await weapons.getByRole("button", { name: "Eintrag hinzufügen", exact: true }).click();
  await weapons.getByLabel("Name", { exact: true }).fill("Training Blade");
  await weapons.getByLabel("Attack bonus", { exact: true }).fill("3");
  await weapons.getByLabel("Damage", { exact: true }).fill("1d6");
  await page.getByRole("button", { name: "Bogen speichern", exact: true }).click();

  const api = `${origin}/api/campaigns/${campaignId}`;
  const sheet = await (await page.request.get(`${api}/actors/${actorId}/sheet`)).json();
  expect(sheet.packageId).toBe(D20_REFERENCE_PACKAGE.id);
  expect(JSON.parse(sheet.fields.weapons_data)).toEqual([{ name: "Training Blade", attack_bonus: 3, damage: "1d6", equipped: false }]);
  const rules = await (await page.request.get(`${api}/rules`)).json();
  expect(rules.pin).toEqual({ id: DEMO_RULE_PACKAGE.id, version: DEMO_RULE_PACKAGE.version });

  await page.reload();
  await expect(page.getByRole("heading", { name: "Weapons", exact: true })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Weapons", exact: true }).locator("..").getByLabel("Name", { exact: true })).toHaveValue("Training Blade");
  expect(errors).toEqual([]);
  await context.close();
});
