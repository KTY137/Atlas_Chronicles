// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2026 Kaya Yesilyurt - Atlas Chronicles. Siehe LICENSE.
import { randomUUID } from "node:crypto";
import { mkdir } from "node:fs/promises";
import { test, expect, type Page } from "@playwright/test";
import { THEME_PRESET_IDS } from "@chronicle/theme";
import { HOW_TO_BE_A_HERO_PACKAGE, HTBAH_EXAMPLE_CHARACTERS } from "../packages/rules/src/examples.ts";
import { LOOK_LABEL } from "../packages/client/src/features/look-namen";
import { reviewApp } from "./helpers/review-app";
import { createGameplay } from "../packages/server/src/domain/gameplay.ts";
import { createActors } from "../packages/server/src/domain/actors.ts";
import { createKampfbuehne } from "../packages/server/src/domain/kampfbuehne.ts";

// Jeder neue Browserkontext sucht sonst zuerst einen Proxy (automatische Erkennung) und bleibt
// dabei auf manchen Rechnern zehn Sekunden und länger hängen, bevor die erste Anfrage an
// localhost überhaupt hinausgeht. Dieser Fall braucht zwei Kontexte nebeneinander.
test.use({ launchOptions: { args: ["--no-proxy-server"] } });

let host: Awaited<ReturnType<typeof reviewApp>>;
let buehne: ReturnType<typeof createKampfbuehne>, kampfId: string;
test.beforeAll(async () => {
  host = await reviewApp(15600 + Math.floor(Math.random() * 150));
  const gm = host.gm.userId, campaign = host.campaign.id, paket = { id: HOW_TO_BE_A_HERO_PACKAGE.id, version: HOW_TO_BE_A_HERO_PACKAGE.version };
  const game = createGameplay(host.db), actors = createActors(host.db);
  buehne = createKampfbuehne(host.db);
  await game.installPackage(gm, campaign, HOW_TO_BE_A_HERO_PACKAGE);
  const review = await game.previewPackage(gm, campaign, HOW_TO_BE_A_HERO_PACKAGE);
  await game.activatePackage(gm, campaign, { packageId: paket.id, packageVersion: paket.version, expectedVersion: 0, previewHash: review.previewHash });
  await game.updateSheet(host.player.userId, campaign, { actorId: host.actorId, expectedVersion: 0, fields: { ...HTBAH_EXAMPLE_CHARACTERS[0]!.fields, hp: 70 } });
  const wolf = await actors.createActorTemplate(gm, campaign, { commandId: randomUUID(), definition: { schemaVersion: 1, name: "Wolf", kind: "creature", loreEntryId: null, package: paket, fields: { hp: 40 } } });
  const kampf = await buehne.anlegen(gm, campaign, { name: "Hinterhalt am Pass" }); kampfId = kampf.id;
  await buehne.teilnehmerHinzufuegen(gm, campaign, kampf.id, { name: "Sera", seite: "gefaehrten", initiative: 15, actorId: host.actorId });
  await buehne.ausVorlage(gm, campaign, kampf.id, { commandId: randomUUID(), templateId: wolf.id, templateRevision: wolf.revision, anzahl: 2, seite: "gegner", initiative: 12, lage: "feld" });
  await buehne.eroeffnen(gm, campaign, kampf.id);
});
test.afterAll(async () => { await host?.close(); });

async function oeffne(page: Page, session: { value: string }, stage = "tisch&tab=kampf") {
  await page.context().addCookies([{ name: "chronicle_session", value: session.value, url: host.origin, httpOnly: true, sameSite: "Strict" }]);
  await page.goto(`${host.origin}/?campaign=${host.campaign.id}&stage=${stage}`);
}
const karte = (page: Page, name: string) => page.getByRole("article", { name, exact: true });

test("die Spielleitung verdeckt und verbirgt, die Runde sieht nur, was sie sehen darf", async ({ browser }) => {
  const fehler: string[] = [];
  const leitung = await (await browser.newContext()).newPage(); leitung.on("pageerror", e => fehler.push(e.message));
  await oeffne(leitung, host.gm);
  await expect(leitung.getByRole("heading", { name: "Der Kampftisch", exact: true })).toBeVisible();
  await expect(karte(leitung, "Wolf 1")).toContainText("Die Runde sieht: schwer angeschlagen");

  await karte(leitung, "Wolf 1").getByRole("button", { name: "Was mit Wolf 1 geschehen soll" }).click();
  await leitung.getByRole("button", { name: "In die Hand (verdecken)", exact: true }).click();
  await expect(leitung.getByRole("complementary", { name: "Nur für dich sichtbar" })).toContainText("Wolf 1");

  await karte(leitung, "Wolf 2").getByRole("button", { name: /^Was die Runde bei Lebenspunkte sieht/ }).click();
  await leitung.getByRole("radio", { name: /^Verborgen/ }).click();
  await expect(karte(leitung, "Wolf 2")).toContainText("Die Runde sieht: nichts");

  await leitung.getByRole("button", { name: "Mit den Augen der Runde" }).click();
  await expect(leitung.getByRole("region", { name: "Spieltisch" })).not.toContainText("Wolf 1");
  await expect(karte(leitung, "Wolf 2")).not.toContainText("Lebenspunkte");

  const runde = await (await browser.newContext()).newPage(); runde.on("pageerror", e => fehler.push(e.message));
  const antwort = runde.waitForResponse(r => r.url().endsWith(`/api/campaigns/${host.campaign.id}/kaempfe`) && r.request().method() === "GET");
  await oeffne(runde, host.player);
  const roh = await (await antwort).text();
  expect(roh).not.toContain("Wolf 1");
  expect(roh).not.toContain('"ordnung"');
  expect(roh).not.toContain('"sicht"');
  await expect(karte(runde, "Sera")).toContainText("Deine Figur");
  await expect(karte(runde, "Sera")).toContainText("70 / 100");
  await expect(karte(runde, "Wolf 2")).not.toContainText("Lebenspunkte");

  await karte(runde, "Sera").getByRole("button", { name: "Lebenspunkte ändern, jetzt 70 / 100" }).click();
  await runde.getByLabel("Neuer Wert", { exact: true }).fill("65");
  await runde.getByRole("button", { name: "Übernehmen", exact: true }).click();
  await expect(karte(runde, "Sera")).toContainText("65 / 100");
  expect(fehler).toEqual([]);
});

test("der Kampftisch steht in allen zwölf Looks", async ({ page }, testInfo) => {
  test.setTimeout(300_000); // zwölf Looks, je ein Wechsel und ein Bild
  // Hoch genug, dass die ganze Tafel im Fenster liegt: was unterhalb liegt, malt der Browser
  // im Bild nicht, und die feste Fußleiste läge sonst quer über den Karten.
  await page.setViewportSize({ width: 1440, height: 2200 });
  // Damit die Bilder jeden Kartenzustand zeigen: Sera am Zug, Wolf 1 verdeckt in der Hand
  // (aus dem Fall davor), Wolf 2 umgelegt — der Stempel muss in jedem Look zu lesen sein.
  const stand = await buehne.buehne(host.gm.userId, host.campaign.id, kampfId);
  const wolf2 = stand.teilnehmer.find(k => k.name === "Wolf 2")!;
  if (!("version" in wolf2)) throw new Error("Die Spielleitung bekommt ihre eigene Sicht.");
  await buehne.lageSetzen(host.gm.userId, host.campaign.id, kampfId, wolf2.id, { lage: "umgelegt", expectedVersion: wolf2.version });

  // Der Look wird in einem zweiten Fenster auf der Kontoseite gewählt; der Kampftisch daneben
  // übernimmt ihn, wie jedes offene Fenster. Zwei Seitenaufrufe je Look (Konto, Kampftisch)
  // sprengten nach fünf Looks das Minutenbudget der Spielleitung (240 Anfragen, Antwort 429).
  const ordner = testInfo.outputPath("looks"); await mkdir(ordner, { recursive: true });
  const einstellungen = await page.context().newPage();
  await oeffne(einstellungen, host.gm, "account");
  await oeffne(page, host.gm);
  await expect(page.getByRole("region", { name: "Spieltisch" })).toBeVisible();
  await expect(karte(page, "Wolf 2")).toContainText("umgelegt");
  for (const look of THEME_PRESET_IDS) {
    await einstellungen.getByRole("radio", { name: LOOK_LABEL[look], exact: true }).check();
    await expect(page.locator("html")).toHaveAttribute("data-appearance-theme", look);
    await expect(page.getByRole("region", { name: "Spieltisch" })).toBeVisible();
    await page.evaluate(() => document.fonts.ready.then(() => undefined));
    await page.locator(".kampftisch-tafel").screenshot({ path: `${ordner}/${look}.png` });
  }
});
