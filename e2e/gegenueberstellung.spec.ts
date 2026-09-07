import { test, expect } from "@playwright/test";
import { randomBytes, randomUUID } from "node:crypto";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { buildApp } from "../packages/server/src/app.ts";
import { createPgDb, migrate, type Db } from "../packages/server/src/db/index.ts";
import { createIdentity } from "../packages/server/src/identity/index.ts";
import { createCampaigns } from "../packages/server/src/domain/campaigns.ts";
import { createDocuments } from "../packages/server/src/domain/documents.ts";

// Aufbau ueber die Domaenen-API statt ueber die Oberflaeche: der Browserpfad soll die
// Gegenueberstellung pruefen, nicht das Anlegen von vier Passagen. Der Autorenpfad hat
// seinen eigenen Test in campaign.spec.ts.
const schema = `chronicle_gegen_e2e_${randomUUID().replaceAll("-", "")}`;
const port = 9200 + Math.floor(Math.random() * 200), origin = `http://localhost:${port}`;
const config = { origin, bootstrapToken: randomBytes(32).toString("hex"), cookieSecret: randomBytes(32).toString("hex"), staticRoot: resolve("packages/client/dist") };
let admin: Db, db: Db, app: Awaited<ReturnType<typeof buildApp>>, campaignId: string, entryId: string;
let gmSession = "", playerSession = "";
const absatz = (text: string) => ({ inhalt: { kind: "absatz" as const, inhalt: [{ text, marks: [] }] } });

test.beforeAll(async () => {
  const settings = process.env["E2E_DATABASE_URL"] ? null : JSON.parse(await readFile(".local/config.json", "utf8"));
  const base = process.env["E2E_DATABASE_URL"] ?? settings.databaseUrl;
  admin = createPgDb(base); await admin.query(`CREATE SCHEMA "${schema}"`);
  const url = new URL(base); url.searchParams.set("options", `-c search_path=${schema}`); db = createPgDb(url.href); await migrate(db);
  const identity = createIdentity(db, config), campaigns = createCampaigns(db), gm = await identity.bootstrap("Kaya Gegen");
  gmSession = gm.value;
  campaignId = (await campaigns.createCampaign(gm.userId, { name: "Die Mühle am Fluss" })).id;
  const invite = await campaigns.issueInvitation(gm.userId, campaignId);
  const figuren: Record<string, string> = {};
  for (const displayName of ["Sera", "Dorn"]) {
    const request = await campaigns.requestJoin(invite.code, { displayName });
    const member = await campaigns.approveJoin(gm.userId, campaignId, request.id);
    figuren[displayName] = member.actorId!;
    if (displayName === "Sera") playerSession = (await identity.issueSession(member.userId)).value;
  }
  const docs = createDocuments(db);
  const entry = await docs.saveEntry(gm.userId, campaignId, { title: "Das versiegelte Archiv", passages: [
    absatz("Beide kennen den Torbogen."), absatz("SERAS GEHEIMNIS: Der Mondschluessel liegt im Turm."),
    absatz("DORNS GEHEIMNIS: Der Rat kennt den verborgenen Pfad."), absatz("NIEMANDS WISSEN: Die Muehle brannte zweimal.")] });
  entryId = entry.entryId;
  const pids = entry.passagen.map(p => p.pid);
  for (const [index, name] of [[0, "Sera"], [0, "Dorn"], [1, "Sera"], [2, "Dorn"]] as const)
    await docs.revealPassage(gm.userId, campaignId, pids[index]!, figuren[name]!);
  app = await buildApp(db, config); await app.listen({ host: "127.0.0.1", port });
});
test.afterAll(async () => {
  await app?.close(); await db?.close();
  if (admin) { if (!/^chronicle_gegen_e2e_[a-f0-9]{32}$/.test(schema)) throw new Error("Unexpected schema"); await admin.query(`DROP SCHEMA "${schema}" CASCADE`); await admin.close(); }
});

test("Die Gegenüberstellung: derselbe Artikel für zwei Figuren, Abweichungen markiert", async ({ browser }) => {
  const context = await browser.newContext(); const errors: string[] = [];
  await context.addCookies([{ name: "chronicle_session", value: gmSession, url: origin, httpOnly: true, secure: true, sameSite: "Strict" }]);
  const gm = await context.newPage(); gm.on("pageerror", error => errors.push(error.message));
  await gm.goto(`${origin}/?campaign=${campaignId}&stage=wiki&entry=${entryId}`);
  await expect(gm.getByRole("heading", { name: "Das versiegelte Archiv" })).toBeVisible();

  // Regressionswache: die bestehenden Werkzeuge der Spielleitung bleiben, wo sie waren.
  await expect(gm.getByRole("button", { name: "Historie" })).toBeVisible();
  await expect(gm.getByRole("button", { name: "Bearbeiten" })).toBeVisible();

  await gm.getByRole("button", { name: "Gegenüberstellung" }).click();
  const panel = gm.locator(".gegenueberstellung");
  await panel.getByLabel("Linke Figur").selectOption({ label: "Sera" });
  await panel.getByLabel("Rechte Figur").selectOption({ label: "Dorn" });
  const links = panel.locator(".spalte").first(), rechts = panel.locator(".spalte").last();
  await expect(links.getByRole("heading", { name: "Sera" })).toBeVisible();
  await expect(rechts.getByRole("heading", { name: "Dorn" })).toBeVisible();
  await expect(links).toContainText("SERAS GEHEIMNIS");
  await expect(links).not.toContainText("DORNS GEHEIMNIS");
  await expect(rechts).toContainText("DORNS GEHEIMNIS");
  await expect(rechts).not.toContainText("SERAS GEHEIMNIS");
  for (const column of [links, rechts]) {
    await expect(column).toContainText("Beide kennen den Torbogen.");
    await expect(column).not.toContainText("NIEMANDS WISSEN");
  }
  await expect(panel.locator('[data-seite="nur-links"]')).toHaveCount(1);
  await expect(panel.locator('[data-seite="nur-rechts"]')).toHaveCount(1);
  await expect(panel.locator('[data-seite="beide"]')).toHaveCount(2);

  await panel.getByRole("button", { name: "Schließen" }).click();
  await expect(gm.locator(".gegenueberstellung")).toHaveCount(0);
  await expect(gm.getByRole("heading", { name: "Das versiegelte Archiv" })).toBeVisible();
  await context.close();

  // Fuer eine Spielerin gibt es die Flaeche nicht — und die Route bestaetigt sie auch nicht.
  const playerContext = await browser.newContext();
  await playerContext.addCookies([{ name: "chronicle_session", value: playerSession, url: origin, httpOnly: true, secure: true, sameSite: "Strict" }]);
  const player = await playerContext.newPage();
  await player.goto(`${origin}/?campaign=${campaignId}&stage=wiki&entry=${entryId}`);
  await expect(player.getByRole("heading", { name: "Das versiegelte Archiv" })).toBeVisible();
  await expect(player.getByRole("button", { name: "Gegenüberstellung" })).toHaveCount(0);
  const forged = await player.request.get(`${origin}/api/campaigns/${campaignId}/entries/${entryId}/gegenueberstellung?links=x&rechts=y`);
  expect(forged.status()).toBe(404);
  await playerContext.close();
  expect(errors).toEqual([]);
});
