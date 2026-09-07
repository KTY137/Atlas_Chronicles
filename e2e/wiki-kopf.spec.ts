import { test, expect } from "@playwright/test";
import { randomBytes, randomUUID } from "node:crypto";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { buildApp } from "../packages/server/src/app.ts";
import { createPgDb, migrate, type Db } from "../packages/server/src/db/index.ts";
import { createIdentity } from "../packages/server/src/identity/index.ts";
import { createCampaigns } from "../packages/server/src/domain/campaigns.ts";
import { createDocuments } from "../packages/server/src/domain/documents.ts";

const schema = `chronicle_kopf_e2e_${randomUUID().replaceAll("-", "")}`;
const port = 9250 + Math.floor(Math.random() * 140), origin = `http://localhost:${port}`;
const config = { origin, bootstrapToken: randomBytes(32).toString("hex"), cookieSecret: randomBytes(32).toString("hex"), staticRoot: resolve("packages/client/dist") };
let admin: Db, db: Db, app: Awaited<ReturnType<typeof buildApp>>, campaignId = "", alrik = "";
let gmSession = "";
const absatz = (text: string) => ({ inhalt: { kind: "absatz" as const, inhalt: [{ text, marks: [] }] } });
const feld = (schluessel: string, label: string, wert: string) => ({ inhalt: { kind: "feld" as const, schluessel, label, mehrwertig: false, klauselKandidat: false, werte: [[{ text: wert, marks: [] }]] } });

test.beforeAll(async () => {
  const settings = process.env["E2E_DATABASE_URL"] ? null : JSON.parse(await readFile(".local/config.json", "utf8"));
  const base = process.env["E2E_DATABASE_URL"] ?? settings.databaseUrl;
  admin = createPgDb(base); await admin.query(`CREATE SCHEMA "${schema}"`);
  const url = new URL(base); url.searchParams.set("options", `-c search_path=${schema}`); db = createPgDb(url.href); await migrate(db);
  const identity = createIdentity(db, config), campaigns = createCampaigns(db), gm = await identity.bootstrap("Kaya Kopf");
  gmSession = gm.value;
  campaignId = (await campaigns.createCampaign(gm.userId, { name: "Eron" })).id;
  const docs = createDocuments(db);
  const a = await docs.saveEntry(gm.userId, campaignId, { title: "Alrik von Vharon", passages: [
    feld("Geburt", "Geburtsdatum", "819 n. K"), feld("Tod", "Todesdatum", "Winter 866"),
    feld("Größe", "Körpergröße", "180 cm"), absatz("Alrik ritt nach Norden.")] });
  await docs.saveEntry(gm.userId, campaignId, { title: "Haus Ker", passages: [feld("gründung", "Gründung", "c.a 1200 v. K.")] });
  alrik = a.entryId;
  app = await buildApp(db, config); await app.listen({ host: "127.0.0.1", port });
});
test.afterAll(async () => {
  await app?.close(); await db?.close();
  if (admin) { if (!/^chronicle_kopf_e2e_[a-f0-9]{32}$/.test(schema)) throw new Error("Unexpected schema"); await admin.query(`DROP SCHEMA "${schema}" CASCADE`); await admin.close(); }
});

test("Die Chronik bekommt eine Kopfleiste, und der Zeitstrahl rechnet sich aus den Daten", async ({ browser }) => {
  const context = await browser.newContext(); const errors: string[] = [];
  await context.addCookies([{ name: "chronicle_session", value: gmSession, url: origin, httpOnly: true, secure: true, sameSite: "Strict" }]);
  const page = await context.newPage(); page.on("pageerror", error => errors.push(error.message));
  await page.goto(`${origin}/?campaign=${campaignId}&stage=wiki&entry=${alrik}`);
  await expect(page.getByRole("heading", { name: "Alrik von Vharon" })).toBeVisible();

  // Regressionswache: die Werkzeuge am Artikel bleiben, wo sie waren.
  for (const label of ["Gefüge", "Historie", "Gegenüberstellung", "Bearbeiten"])
    await expect(page.getByRole("button", { name: label })).toBeVisible();

  const kopf = page.locator(".wiki-kopf");
  await expect(kopf).toBeVisible();
  await expect(kopf.getByRole("button", { name: "Übersicht", exact: true })).toBeVisible();
  await expect(kopf.getByRole("button", { name: "Zeitstrahl", exact: true })).toBeVisible();
  // Ohne importierte Kategorien traegt die Kopfleiste die Arten — sonst waere sie leer.
  await expect(kopf.getByRole("button", { name: /Sonstiges/ })).toBeVisible();

  await kopf.getByRole("button", { name: "Zeitstrahl", exact: true }).click();
  const strahl = page.locator(".zeitstrahl");
  await expect(strahl.getByRole("heading", { name: "Zeitstrahl" })).toBeVisible();
  // Die Ordnung ist das Weltjahr, und der Rohtext der Quelle bleibt sichtbar.
  await expect(strahl.locator(".zeit-ereignis")).toHaveCount(3);
  await expect(strahl.locator(".zeit-ereignis").first()).toContainText("Haus Ker");
  await expect(strahl.locator(".zeit-ereignis").first()).toContainText("c.a 1200 v. K.");
  await expect(strahl.locator(".zeit-ereignis").last()).toContainText("Winter 866");
  // Eine Messung ist kein Datum.
  await expect(strahl).not.toContainText("180 cm");

  // Eine Gruppe der Kopfleiste oeffnet ihre Seite mit den Artikeln darin.
  await kopf.getByRole("button", { name: /Sonstiges/ }).click();
  const gruppe = page.locator(".wiki-gruppenseite");
  await expect(gruppe.getByRole("heading", { name: "Sonstiges" })).toBeVisible();
  await gruppe.getByRole("button", { name: "Alrik von Vharon" }).click();
  await expect(page.getByRole("heading", { name: "Alrik von Vharon" })).toBeVisible();
  await expect(page.locator(".zeitstrahl")).toHaveCount(0);

  expect(errors).toEqual([]);
  await context.close();
});
