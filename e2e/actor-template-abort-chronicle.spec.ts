// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2026 Kaya Yesilyurt - Atlas Chronicles. Siehe LICENSE.
import { test, expect, type Page } from "@playwright/test";
import { randomUUID } from "node:crypto";
import { CHRONICLE_HEROES_PACKAGE, CHRONICLE_ARCHETYPES } from "@chronicle/rules";
import { reviewApp } from "./helpers/review-app";
import { createActors } from "../packages/server/src/domain/actors.ts";
import { createGameplay } from "../packages/server/src/domain/gameplay.ts";
import { createFigurantrag } from "../packages/server/src/domain/figurantrag.ts";

// Abbruch der Charaktererstellung mit dem echten ChronicleHeroes-Paket (Fähigkeiten, Präsentation).
let host: Awaited<ReturnType<typeof reviewApp>>, templateId: string;
test.beforeAll(async () => {
  host = await reviewApp(13600 + Math.floor(Math.random() * 200));
  const game = createGameplay(host.db), actors = createActors(host.db), pkg = CHRONICLE_HEROES_PACKAGE;
  await game.installPackage(host.gm.userId, host.campaign.id, pkg);
  await game.activatePackage(host.gm.userId, host.campaign.id, { packageId: pkg.id, packageVersion: pkg.version, expectedVersion: 0 });
  const template = await actors.createActorTemplate(host.gm.userId, host.campaign.id, { commandId: randomUUID(), definition: {
    schemaVersion: 1, name: "Archetyp", kind: "player_character", loreEntryId: null, package: { id: pkg.id, version: pkg.version },
    fields: { ...CHRONICLE_ARCHETYPES[0]!.fields, name: "Mara" },
  } });
  templateId = template.id;
  // Die Spielerin beginnt ohne Figur, damit „Ich“ den Antrag zeigt und nicht einen Bogen.
  for (const own of await actors.listActors(host.player.userId, host.campaign.id)) {
    const grant = (await actors.listControllers(host.gm.userId, host.campaign.id, own.id)).find(g => g.userId === host.player.userId);
    if (grant) await actors.revokeController(host.gm.userId, host.campaign.id, own.id, host.player.userId, { commandId: randomUUID(), expectedVersion: grant.version, reason: "Antrag prüfen" });
  }
});
test.afterAll(async () => host?.close());
const form = (page: Page) => page.locator("form.creation-template-form");
/** Rückfragen erscheinen seit 2026-09-26 im Look (`confirmAction` aus @chronicle/ui), nicht als Browserdialog. */
const imDialog = (page: Page, knopf: string) => page.getByRole("dialog").getByRole("button", { name: knopf, exact: true }).click();
async function login(page: Page, gm: boolean) {
  const session = gm ? host.gm : host.player;
  await page.context().addCookies([{ name: "chronicle_session", value: session.value, url: host.origin, httpOnly: true, secure: true, sameSite: "Strict" }]);
}
async function expectUsable(page: Page, scope: ReturnType<Page["locator"]>, label: string) {
  const number = scope.locator('input[type="number"]:not([disabled])').first();
  await expect(number, label).toBeVisible();
  await number.fill("7");
  await expect(number, label).toHaveValue("7");
  const text = scope.locator('input[type="text"]:not([disabled])').first();
  await text.fill("Nach dem Abbruch");
  await expect(text, label).toHaveValue("Nach dem Abbruch");
  const disabled = await scope.locator("input:disabled, select:disabled, fieldset:disabled").count();
  expect(disabled, `${label}: gesperrte Felder`).toBe(0);
}
test("Spielleitung: Vorlage anfangen, verwerfen, weiter bedienen", async ({ page }) => {
  const errors: string[] = []; page.on("pageerror", error => errors.push(error.message));
  await login(page, true);
  await page.goto(`${host.origin}/?campaign=${host.campaign.id}&stage=schmiede&forge=actors`);
  const f = form(page);
  await f.getByLabel("Vorlagenname", { exact: true }).fill("Halbfertig");
  const number = f.locator('input[type="number"]').first();
  await expect(number).toBeVisible();
  await number.fill("9");
  await expect(number).toHaveValue("9");
  await f.getByRole("button", { name: "Änderungen verwerfen", exact: true }).click();
  await imDialog(page, "Verwerfen");
  await expect(f.getByLabel("Vorlagenname", { exact: true })).toHaveValue("");
  await expectUsable(page, f, "verwerfen");
  // Vorhandene Vorlage öffnen (der Entwurf ist schmutzig, also bestätigen), ändern, zurück zu „Neu“.
  await page.locator(".creation-template-list").getByRole("button", { name: /^Archetyp/ }).click();
  await imDialog(page, "Verwerfen");
  await expect(page.getByRole("heading", { name: "Figurvorlage überarbeiten", exact: true })).toBeVisible();
  const n2 = form(page).locator('input[type="number"]').first();
  await n2.fill("11");
  await expect(n2).toHaveValue("11");
  await page.getByRole("button", { name: "Neue Figurvorlage", exact: true }).click();
  await imDialog(page, "Verwerfen");
  await expect(page.getByRole("heading", { name: "Figurvorlage anlegen", exact: true })).toBeVisible();
  await expectUsable(page, form(page), "neu nach revision");
  expect(errors).toEqual([]);
});
test("Spieler: Antrag anfangen, abbrechen, erneut beginnen", async ({ page }) => {
  const errors: string[] = []; page.on("pageerror", error => errors.push(error.message));
  // Freigabe durch die Spielleitung.
  await createFigurantrag(host.db).freigeben(host.gm.userId, host.campaign.id, templateId, 0);
  await login(page, false);
  await page.goto(`${host.origin}/?campaign=${host.campaign.id}&stage=ich`);
  await page.getByRole("button", { name: "Figur beantragen", exact: true }).click();
  await page.getByRole("combobox", { name: "Figurvorlage", exact: true }).selectOption(templateId);
  await page.getByLabel("Name deiner Figur", { exact: true }).fill("Halbfertig");
  // Die Werte stehen im zweiten Schritt „Was kann sie?“.
  await page.getByRole("button", { name: "Weiter", exact: true }).click();
  const scope = page.locator("form");
  const number = scope.locator('input[type="number"]').first();
  await expect(number).toBeVisible();
  await number.fill("9");
  await expect(number).toHaveValue("9");
  await page.getByRole("button", { name: "Abbrechen", exact: true }).click();
  await imDialog(page, "Verwerfen");
  await page.getByRole("button", { name: "Figur beantragen", exact: true }).click();
  await page.getByRole("combobox", { name: "Figurvorlage", exact: true }).selectOption(templateId);
  const name = page.getByLabel("Name deiner Figur", { exact: true });
  await expect(name, "antrag erneut: leer").toHaveValue("");
  await name.fill("Nach dem Abbruch");
  await page.getByRole("button", { name: "Weiter", exact: true }).click();
  const again = page.locator("form").locator('input[type="number"]:not([disabled])').first();
  await again.fill("7");
  await expect(again, "antrag erneut").toHaveValue("7");
  expect(await page.locator("form").locator("input:disabled, select:disabled, fieldset:disabled").count(), "antrag erneut: gesperrte Felder").toBe(0);
  expect(errors).toEqual([]);
});
