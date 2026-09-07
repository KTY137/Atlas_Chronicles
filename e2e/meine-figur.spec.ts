import { test, expect, type Page } from "@playwright/test";
import { randomBytes, randomUUID } from "node:crypto";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { buildApp } from "../packages/server/src/app.ts";
import { createPgDb, migrate, type Db } from "../packages/server/src/db/index.ts";
import { createIdentity } from "../packages/server/src/identity/index.ts";
import { createCampaigns } from "../packages/server/src/domain/campaigns.ts";

const schema = `chronicle_ich_e2e_${randomUUID().replaceAll("-", "")}`;
const port = 9400 + Math.floor(Math.random() * 200), origin = `http://localhost:${port}`;
const config = { origin, bootstrapToken: randomBytes(32).toString("hex"), cookieSecret: randomBytes(32).toString("hex"), staticRoot: resolve("packages/client/dist") };
let admin: Db, db: Db, app: Awaited<ReturnType<typeof buildApp>>, campaignId: string;
const sessions: { userId: string; value: string }[] = [];
test.beforeAll(async () => {
  const settings = process.env.E2E_DATABASE_URL ? null : JSON.parse(await readFile(".local/config.json", "utf8"));
  const base = process.env.E2E_DATABASE_URL ?? settings.databaseUrl;
  admin = createPgDb(base); await admin.query(`CREATE SCHEMA "${schema}"`);
  const url = new URL(base); url.searchParams.set("options", `-c search_path=${schema}`); db = createPgDb(url.href); await migrate(db);
  const identity = createIdentity(db, config), campaigns = createCampaigns(db), gm = await identity.bootstrap("Kaya Ich"); sessions.push(gm);
  campaignId = (await campaigns.createCampaign(gm.userId, { name: "Die eigene Figur" })).id;
  const invite = await campaigns.issueInvitation(gm.userId, campaignId);
  const request = await campaigns.requestJoin(invite.code, { displayName: "Sera" });
  const member = await campaigns.approveJoin(gm.userId, campaignId, request.id);
  sessions.push({ userId: member.userId, ...await identity.issueSession(member.userId) });
  app = await buildApp(db, config); await app.listen({ host: "127.0.0.1", port });
});
test.afterAll(async () => {
  await app?.close(); await db?.close();
  if (admin) { if (!/^chronicle_ich_e2e_[a-f0-9]{32}$/.test(schema)) throw new Error("Unexpected schema"); await admin.query(`DROP SCHEMA "${schema}" CASCADE`); await admin.close(); }
});
const rail = (page: Page) => page.getByRole("navigation", { name: "Bereiche" });

test("Ich: eigener Bogen und eigenes Inventar, ohne Umweg über den Tisch", async ({ browser }) => {
  const context = await browser.newContext(); const errors: string[] = [];
  await context.addCookies([{ name: "chronicle_session", value: sessions[1]!.value, url: origin, httpOnly: true, secure: true, sameSite: "Strict" }]);
  const player = await context.newPage(); player.on("pageerror", error => errors.push(error.message));
  await player.goto(`${origin}/?campaign=${campaignId}`);

  // Regressionswache: kein bestehender Bereich verschwindet, weil "Ich" dazukommt.
  for (const label of ["Heute", "Chronik", "Atlas", "Tisch", "Kanal", "Woche", "Runde"])
    await expect(rail(player).getByRole("button", { name: label, exact: true })).toBeVisible();
  await expect(rail(player).getByRole("button", { name: "Schmiede", exact: true })).toHaveCount(0);

  await rail(player).getByRole("button", { name: "Ich", exact: true }).click();
  await expect(player.getByRole("heading", { name: "Deine Figur" })).toBeVisible();
  await expect(player.getByRole("button", { name: "Bogen speichern", exact: true })).toBeVisible();
  await expect(player.getByRole("heading", { name: "Inventar der Figur", exact: true })).toBeVisible();
  // Der Vorrat der Spielleitung ist keine Spielerfläche.
  await expect(player.getByRole("button", { name: "Vorrat öffnen", exact: true })).toHaveCount(0);

  // Der Bereich überlebt einen Neuladevorgang, wie jeder andere auch.
  await expect(player).toHaveURL(/stage=ich/);
  await player.reload();
  await expect(player.getByRole("heading", { name: "Deine Figur" })).toBeVisible();

  // Und der Tisch bleibt unverändert erreichbar.
  await rail(player).getByRole("button", { name: "Tisch", exact: true }).click();
  await expect(player.getByRole("tab", { name: "Figur", exact: true })).toBeVisible();
  await expect(player.getByRole("tab", { name: "Figuren & Inventar", exact: true })).toBeVisible();
  expect(errors).toEqual([]);
  await context.close();
});
