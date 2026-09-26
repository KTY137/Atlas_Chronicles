import { test, expect, type Page } from "@playwright/test";
import { randomBytes, randomUUID } from "node:crypto";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { DEMO_RULE_PACKAGE } from "@chronicle/rules";
import { buildApp } from "../packages/server/src/app.ts";
import { createPgDb, createTestDb, migrate, type Db } from "../packages/server/src/db/index.ts";
import { createIdentity } from "../packages/server/src/identity/index.ts";
import { createActors } from "../packages/server/src/domain/actors.ts";
import { createCampaigns } from "../packages/server/src/domain/campaigns.ts";
import { createFigurantrag } from "../packages/server/src/domain/figurantrag.ts";

const schema = `chronicle_ich_e2e_${randomUUID().replaceAll("-", "")}`;
const port = 9400 + Math.floor(Math.random() * 200), origin = `http://localhost:${port}`;
const config = { origin, bootstrapToken: randomBytes(32).toString("hex"), cookieSecret: randomBytes(32).toString("hex"), staticRoot: resolve("packages/client/dist") };
let admin: Db, db: Db, app: Awaited<ReturnType<typeof buildApp>>, campaignId: string, vorlageId: string;
const sessions: { userId: string; value: string }[] = [];
test.beforeAll(async () => {
  const settings = process.env.E2E_DATABASE_URL ? null : await readFile(".local/config.json", "utf8")
    .then(text => JSON.parse(text)).catch(error => { if (error.code === "ENOENT") return null; throw error; });
  const base = process.env.E2E_DATABASE_URL ?? settings?.databaseUrl;
  if (base) {
    admin = createPgDb(base); await admin.query(`CREATE SCHEMA "${schema}"`);
    const url = new URL(base); url.searchParams.set("options", `-c search_path=${schema}`); db = createPgDb(url.href);
  } else db = await createTestDb();
  await migrate(db);
  const identity = createIdentity(db, config), campaigns = createCampaigns(db), gm = await identity.bootstrap("Kaya Ich"); sessions.push(gm);
  campaignId = (await campaigns.createCampaign(gm.userId, { name: "Die eigene Figur" })).id;
  const invite = await campaigns.issueInvitation(gm.userId, campaignId);
  const request = await campaigns.requestJoin(invite.code, { displayName: "Sera" });
  const member = await campaigns.approveJoin(gm.userId, campaignId, request.id);
  sessions.push({ userId: member.userId, ...await identity.issueSession(member.userId) });
  // Nell tritt bei, fuehrt aber keine Figur: genau die leere Flaeche, auf der ein Antrag beginnt.
  const nellJoin = await campaigns.requestJoin(invite.code, { displayName: "Nell" });
  const nell = await campaigns.approveJoin(gm.userId, campaignId, nellJoin.id);
  sessions.push({ userId: nell.userId, ...await identity.issueSession(nell.userId) });
  const actors = createActors(db);
  await actors.revokeController(gm.userId, campaignId, nell.actorId, nell.userId,
    { commandId: randomUUID(), expectedVersion: 1, reason: "Nell beantragt ihre Figur selbst." });
  vorlageId = (await actors.createActorTemplate(gm.userId, campaignId, { commandId: randomUUID(), definition: {
    schemaVersion: 1, name: "Wegkundige", kind: "player_character", loreEntryId: null,
    package: { id: DEMO_RULE_PACKAGE.id, version: DEMO_RULE_PACKAGE.version }, fields: { insight: 4 },
  } })).id;
  await createFigurantrag(db).freigeben(gm.userId, campaignId, vorlageId, 0);
  app = await buildApp(db, config); await app.listen({ host: "127.0.0.1", port });
});
test.afterAll(async () => {
  await app?.close(); await db?.close();
  if (admin) { if (!/^chronicle_ich_e2e_[a-f0-9]{32}$/.test(schema)) throw new Error("Unexpected schema"); await admin.query(`DROP SCHEMA "${schema}" CASCADE`); await admin.close(); }
});
const rail = (page: Page) => page.getByRole("navigation", { name: "Bereiche" });
/** Rückfragen erscheinen seit 2026-09-26 im Look (`confirmAction` aus @chronicle/ui), nicht als Browserdialog. */
const imDialog = (page: Page, knopf: string) => page.getByRole("dialog").getByRole("button", { name: knopf, exact: true }).click();

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
  await expect(player.getByRole("heading", { name: "Deine Figur", level: 1 })).toBeVisible();
  await expect(player.getByRole("button", { name: "Bogen speichern", exact: true })).toBeVisible();
  await expect(player.getByRole("heading", { name: "Inventar · Sera", exact: true })).toBeVisible();
  // Der Vorrat der Spielleitung ist keine Spielerfläche.
  await expect(player.getByRole("button", { name: "Vorrat öffnen", exact: true })).toHaveCount(0);

  // Der Bereich überlebt einen Neuladevorgang, wie jeder andere auch.
  await expect(player).toHaveURL(/stage=ich/);
  await player.reload();
  await expect(player.getByRole("heading", { name: "Deine Figur", level: 1 })).toBeVisible();

  // Und der Tisch bleibt unverändert erreichbar.
  await rail(player).getByRole("button", { name: "Tisch", exact: true }).click();
  await expect(player.getByRole("tab", { name: "Figur", exact: true })).toBeVisible();
  await expect(player.getByRole("tab", { name: "Figuren & Inventar", exact: true })).toBeVisible();
  expect(errors).toEqual([]);
  await context.close();
});

test("Ich: wer keine Figur führt, beantragt sie hier — und nimmt den Antrag auch wieder zurück", async ({ browser }) => {
  const context = await browser.newContext(); const errors: string[] = [];
  await context.addCookies([{ name: "chronicle_session", value: sessions[2]!.value, url: origin, httpOnly: true, secure: true, sameSite: "Strict" }]);
  const nell = await context.newPage(); nell.on("pageerror", error => errors.push(error.message));
  const api = `${origin}/api/campaigns/${campaignId}`;
  await nell.goto(`${origin}/?campaign=${campaignId}&stage=ich`);

  // Die leere Fläche ist keine Sackgasse mehr.
  await expect(nell.getByRole("heading", { name: "Eine Figur beantragen", exact: true })).toBeVisible();
  await nell.getByRole("button", { name: "Figur beantragen", exact: true }).click();
  // Gewählt werden kann ausschließlich, was die Spielleitung freigegeben hat.
  const wahl = nell.getByRole("combobox", { name: "Figurvorlage", exact: true });
  await expect(wahl.locator("option")).toHaveCount(2);
  await wahl.selectOption(vorlageId);
  await nell.getByLabel("Name deiner Figur", { exact: true }).fill("Nell vom Frosttor");
  // Die Anfangswerte sind mit der Vorlage vorbelegt; nur die Änderung wird zum Wunsch. Sie stehen im
  // zweiten Schritt „Was kann sie?“, abgeschickt wird im dritten, „Fertig“.
  await nell.getByRole("button", { name: "Weiter", exact: true }).click();
  await expect(nell.getByLabel("Scharfsinn", { exact: true })).toHaveValue("4");
  await nell.getByLabel("Scharfsinn", { exact: true }).fill("5");
  await nell.getByRole("button", { name: "Weiter", exact: true }).click();
  const gestellt = nell.waitForResponse(r => r.url() === `${api}/figurantraege` && r.request().method() === "POST");
  await nell.getByRole("button", { name: "Antrag absenden", exact: true }).click();
  const antwort = await gestellt; expect(antwort.status()).toBe(200);
  const antrag = await antwort.json();
  // Das Regelwerk führt ein eigenes Namensfeld; der Name der Figur steht deshalb auch dort.
  expect(antrag.anfangswerte).toEqual({ insight: 5, name: "Nell vom Frosttor" });
  expect(typeof antrag.id).toBe("string");

  await expect(nell.getByText("„Nell vom Frosttor“ wartet auf die Spielleitung.")).toBeVisible();
  await expect(nell.getByRole("button", { name: "Figur beantragen", exact: true })).toHaveCount(0);
  // Der Bereich überlebt einen Neuladevorgang, der offene Antrag ebenso.
  await nell.reload();
  await expect(nell.getByText("„Nell vom Frosttor“ wartet auf die Spielleitung.")).toBeVisible();

  await nell.getByRole("button", { name: "Antrag zurücknehmen", exact: true }).click();
  await imDialog(nell, "Antrag zurücknehmen");
  await expect(nell.getByRole("button", { name: "Figur beantragen", exact: true })).toBeVisible();
  expect((await (await nell.request.get(`${api}/figurantraege`)).json())[0].status).toBe("zurueckgezogen");
  expect(errors).toEqual([]);
  await context.close();
});
