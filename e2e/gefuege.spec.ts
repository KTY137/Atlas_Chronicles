import { test, expect, type Page } from "@playwright/test";
import { randomBytes, randomUUID } from "node:crypto";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { buildApp } from "../packages/server/src/app.ts";
import { createPgDb, migrate, type Db } from "../packages/server/src/db/index.ts";
import { createIdentity } from "../packages/server/src/identity/index.ts";
import { createCampaigns } from "../packages/server/src/domain/campaigns.ts";
import { createDocuments } from "../packages/server/src/domain/documents.ts";
import { createGefuege } from "../packages/server/src/domain/gefuege.ts";

const schema = `chronicle_gefuege_e2e_${randomUUID().replaceAll("-", "")}`;
const port = 9000 + Math.floor(Math.random() * 190), origin = `http://localhost:${port}`;
const config = { origin, bootstrapToken: randomBytes(32).toString("hex"), cookieSecret: randomBytes(32).toString("hex"), staticRoot: resolve("packages/client/dist") };
let admin: Db, db: Db, app: Awaited<ReturnType<typeof buildApp>>, campaignId = "", alrik = "", mira = "";
let gmSession = "", playerSession = "";
const absatz = (text: string) => ({ inhalt: { kind: "absatz" as const, inhalt: [{ text, marks: [] }] } });

test.beforeAll(async () => {
  const settings = process.env["E2E_DATABASE_URL"] ? null : JSON.parse(await readFile(".local/config.json", "utf8"));
  const base = process.env["E2E_DATABASE_URL"] ?? settings.databaseUrl;
  admin = createPgDb(base); await admin.query(`CREATE SCHEMA "${schema}"`);
  const url = new URL(base); url.searchParams.set("options", `-c search_path=${schema}`); db = createPgDb(url.href); await migrate(db);
  const identity = createIdentity(db, config), campaigns = createCampaigns(db), gm = await identity.bootstrap("Kaya Gefüge");
  gmSession = gm.value;
  campaignId = (await campaigns.createCampaign(gm.userId, { name: "Haus Vharon" })).id;
  const invite = await campaigns.issueInvitation(gm.userId, campaignId);
  const request = await campaigns.requestJoin(invite.code, { displayName: "Sera" });
  const member = await campaigns.approveJoin(gm.userId, campaignId, request.id);
  playerSession = (await identity.issueSession(member.userId)).value;

  const docs = createDocuments(db);
  const a = await docs.saveEntry(gm.userId, campaignId, { title: "Alrik von Vharon", passages: [
    absatz("Alrik ist der Vater von Mira."), absatz("Alrik hasst Haus Ker.")] });
  const m = await docs.saveEntry(gm.userId, campaignId, { title: "Mira von Vharon", passages: [absatz("Mira führt den Nordpass.")] });
  const k = await docs.saveEntry(gm.userId, campaignId, { title: "Haus Ker", passages: [absatz("Haus Ker hält den Nordpass.")] });
  alrik = a.entryId; mira = m.entryId;
  const gefuege = createGefuege(db);
  await gefuege.anlegen(gm.userId, campaignId, { passageId: a.passagen[0]!.pid, vonEntryId: a.entryId, nachEntryId: m.entryId, art: "elternteil_von", rolle: "Vater" });
  await gefuege.anlegen(gm.userId, campaignId, { passageId: a.passagen[1]!.pid, vonEntryId: a.entryId, nachEntryId: k.entryId, art: "feindschaft_mit" });
  // Sera hält nur die Verwandtschaftspassage, nie die über Haus Ker.
  await docs.revealPassage(gm.userId, campaignId, a.passagen[0]!.pid, member.actorId!);
  await docs.revealPassage(gm.userId, campaignId, m.passagen[0]!.pid, member.actorId!);
  app = await buildApp(db, config); await app.listen({ host: "127.0.0.1", port });
});
test.afterAll(async () => {
  await app?.close(); await db?.close();
  if (admin) { if (!/^chronicle_gefuege_e2e_[a-f0-9]{32}$/.test(schema)) throw new Error("Unexpected schema"); await admin.query(`DROP SCHEMA "${schema}" CASCADE`); await admin.close(); }
});
const oeffne = async (page: Page, entryId: string) => {
  await page.goto(`${origin}/?campaign=${campaignId}&stage=wiki&entry=${entryId}`);
  await expect(page.getByRole("heading", { name: "Alrik von Vharon" })).toBeVisible();
};

test("Das Gefüge sitzt am Artikel und zeigt jeder Leserin nur ihre eigenen Kanten", async ({ browser }) => {
  const errors: string[] = [];
  const gmContext = await browser.newContext();
  await gmContext.addCookies([{ name: "chronicle_session", value: gmSession, url: origin, httpOnly: true, secure: true, sameSite: "Strict" }]);
  const gm = await gmContext.newPage(); gm.on("pageerror", error => errors.push(error.message));
  await oeffne(gm, alrik);

  // Regressionswache: die bestehenden Werkzeuge bleiben, wo sie waren.
  for (const label of ["Historie", "Gegenüberstellung", "Bearbeiten"])
    await expect(gm.getByRole("button", { name: label })).toBeVisible();

  await gm.getByRole("button", { name: "Gefüge" }).click();
  const panel = gm.locator(".gefuege");
  await expect(panel.getByRole("heading", { name: "Das Gefüge" })).toBeVisible();
  await expect(panel.locator('svg [data-art="elternteil_von"]')).toHaveCount(1);
  for (const name of ["Alrik von Vharon", "Mira von Vharon"])
    await expect(panel.locator("svg text").filter({ hasText: name })).toHaveCount(1);
  // Der Stammbaum zeigt keine politische Kante, und umgekehrt.
  await expect(panel.locator('svg [data-art="feindschaft_mit"]')).toHaveCount(0);
  await panel.getByRole("tab", { name: "Politogramm" }).click();
  await expect(panel.locator('svg [data-art="feindschaft_mit"]')).toHaveCount(1);
  await expect(panel.locator('svg [data-art="elternteil_von"]')).toHaveCount(0);
  await expect(panel.locator("svg text").filter({ hasText: "Haus Ker" })).toHaveCount(1);

  await panel.getByRole("button", { name: "Schließen" }).click();
  await expect(gm.locator(".gefuege")).toHaveCount(0);
  await gmContext.close();

  const playerContext = await browser.newContext();
  await playerContext.addCookies([{ name: "chronicle_session", value: playerSession, url: origin, httpOnly: true, secure: true, sameSite: "Strict" }]);
  const player = await playerContext.newPage(); player.on("pageerror", error => errors.push(error.message));
  await oeffne(player, alrik);
  await player.getByRole("button", { name: "Gefüge" }).click();
  const seras = player.locator(".gefuege");
  await expect(seras.locator('svg [data-art="elternteil_von"]')).toHaveCount(1);
  await seras.getByRole("tab", { name: "Politogramm" }).click();
  // Die Feindschaft haengt an einer Passage, die Sera nicht haelt: fuer sie gibt es sie nicht.
  await expect(seras.locator('svg [data-art="feindschaft_mit"]')).toHaveCount(0);
  await expect(seras).not.toContainText("Haus Ker");
  // Und sie darf keine Kante eintragen.
  await expect(seras.getByRole("button", { name: "Beziehung eintragen" })).toHaveCount(0);
  await playerContext.close();
  expect(errors).toEqual([]);
});
