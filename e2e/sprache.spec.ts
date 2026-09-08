// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2026 Kaya Yesilyurt - Atlas Chronicles. Siehe LICENSE.
import { test, expect } from "@playwright/test";
import { randomBytes, randomUUID } from "node:crypto";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { buildApp } from "../packages/server/src/app.ts";
import { createPgDb, createTestDb, migrate, type Db } from "../packages/server/src/db/index.ts";
import { createIdentity } from "../packages/server/src/identity/index.ts";
import { createCampaigns } from "../packages/server/src/domain/campaigns.ts";

const schema = `chronicle_sprache_e2e_${randomUUID().replaceAll("-", "")}`;
const port = 9700 + Math.floor(Math.random() * 200), origin = `http://localhost:${port}`;
const config = { origin, bootstrapToken: randomBytes(32).toString("hex"), cookieSecret: randomBytes(32).toString("hex"), staticRoot: resolve("packages/client/dist") };
let admin: Db, db: Db, app: Awaited<ReturnType<typeof buildApp>>, campaignId: string, session: string;

test.beforeAll(async () => {
  const settings = process.env.E2E_DATABASE_URL ? null : await readFile(".local/config.json", "utf8")
    .then(text => JSON.parse(text)).catch(error => { if (error.code === "ENOENT") return null; throw error; });
  const base = process.env.E2E_DATABASE_URL ?? settings?.databaseUrl;
  if (base) {
    admin = createPgDb(base); await admin.query(`CREATE SCHEMA "${schema}"`);
    const url = new URL(base); url.searchParams.set("options", `-c search_path=${schema}`); db = createPgDb(url.href);
  } else db = await createTestDb();
  await migrate(db);
  const identity = createIdentity(db, config), campaigns = createCampaigns(db);
  const gm = await identity.bootstrap("Kaya Sprache"); session = gm.value;
  campaignId = (await campaigns.createCampaign(gm.userId, { name: "Zwei Sprachen" })).id;
  app = await buildApp(db, config); await app.listen({ host: "127.0.0.1", port });
});
test.afterAll(async () => {
  await app?.close(); await db?.close();
  if (admin) { if (!/^chronicle_sprache_e2e_[a-f0-9]{32}$/.test(schema)) throw new Error("Unexpected schema"); await admin.query(`DROP SCHEMA "${schema}" CASCADE`); await admin.close(); }
});

test("Sprachwahl schaltet die Oberflaeche um und ueberlebt das Neuladen", async ({ browser }) => {
  // Ohne feste Browsersprache entschiede die des Testlaeufers ueber den Startwert.
  const context = await browser.newContext({ locale: "de-DE" }); const errors: string[] = [];
  await context.addCookies([{ name: "chronicle_session", value: session, url: origin, httpOnly: true, secure: true, sameSite: "Strict" }]);
  const page = await context.newPage(); page.on("pageerror", error => errors.push(error.message));
  // Der Wechsel fragt vor dem Neuaufbau des Baums nach; ohne Zusage bleibt alles deutsch.
  page.on("dialog", dialog => void dialog.accept());
  await page.goto(`${origin}/?campaign=${campaignId}`);

  const rail = (name: string) => page.getByRole("navigation").getByRole("button", { name, exact: true });
  for (const label of ["Heute", "Chronik", "Atlas", "Tisch", "Kanal", "Woche", "Runde"])
    await expect(rail(label)).toBeVisible();

  await page.getByRole("button", { name: "Zugang verwalten", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Deine Darstellung" })).toBeVisible();
  await page.getByRole("combobox", { name: "Sprache" }).selectOption("en");

  // Drei Flaechen, drei Quellen: Bereichsleiste (App), Ueberschrift (Darstellung), Auswahl selbst.
  await expect(page.getByRole("heading", { name: "Your appearance" })).toBeVisible();
  await expect(page.getByRole("combobox", { name: "Language" })).toHaveValue("en");
  for (const label of ["Today", "Chronicle", "Atlas", "Table", "Channel", "Week", "Party"])
    await expect(rail(label)).toBeVisible();
  await expect(rail("Heute")).toHaveCount(0);

  // Die Wahl liegt im Browser, nicht in der Sitzung: sie ueberlebt ein Neuladen.
  await page.reload();
  await expect(rail("Today")).toBeVisible();
  await expect(page.getByRole("combobox", { name: "Language" })).toHaveValue("en");

  await page.getByRole("combobox", { name: "Language" }).selectOption("de");
  await expect(rail("Heute")).toBeVisible();
  await expect(page.getByRole("heading", { name: "Deine Darstellung" })).toBeVisible();
  expect(errors).toEqual([]);
  await context.close();
});

test("Browsersprache Englisch: auch die zuerst gezeichnete Leiste ist englisch", async ({ browser }) => {
  // Regression: die Startsprache steht vor dem ersten Zeichnen fest, der Katalog kommt erst
  // danach an. Wer nur die Sprache beobachtet, sieht diese Ankunft nicht und bleibt deutsch.
  const context = await browser.newContext({ locale: "en-GB" }); const errors: string[] = [];
  await context.addCookies([{ name: "chronicle_session", value: session, url: origin, httpOnly: true, secure: true, sameSite: "Strict" }]);
  const page = await context.newPage(); page.on("pageerror", error => errors.push(error.message));
  await page.goto(`${origin}/?campaign=${campaignId}`);

  const rail = (name: string) => page.getByRole("navigation").getByRole("button", { name, exact: true });
  for (const label of ["Today", "Chronicle", "Atlas", "Table", "Channel", "Week", "Party"])
    await expect(rail(label)).toBeVisible();
  await expect(rail("Heute")).toHaveCount(0);
  await expect(page.locator("html")).toHaveAttribute("lang", "en");
  expect(errors).toEqual([]);
  await context.close();
});
