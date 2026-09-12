// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2026 Kaya Yesilyurt - Atlas Chronicles. Siehe LICENSE.
import { randomUUID } from "node:crypto";
import { readFile } from "node:fs/promises";
import { test, expect } from "@playwright/test";
import { reviewApp } from "./helpers/review-app";
import { createGameplay } from "../packages/server/src/domain/gameplay.ts";
import { createTactical } from "../packages/server/src/domain/tactical.ts";

let host: Awaited<ReturnType<typeof reviewApp>>, sceneId: string;
test.beforeAll(async () => {
  host = await reviewApp(15200 + Math.floor(Math.random() * 150));
  const game = createGameplay(host.db), tactical = createTactical(host.db);
  const scene = await game.createScene(host.gm.userId, host.campaign.id, { name: "Das Tor im Nebel", entryIds: [], fictionDate: "Erster Abend" });
  sceneId = scene.id;
  const map = await tactical.importMap(host.gm.userId, host.campaign.id, {
    commandId: randomUUID(), name: "Das Tor im Nebel", format: "uvtt",
    sourceText: await readFile("packages/forge/test/fixtures/uvtt/sampleMap.dd2vtt", "utf8"),
    provenance: JSON.parse(await readFile("packages/forge/test/fixtures/uvtt/provenance.json", "utf8")).provenance,
  });
  await tactical.savePlan(host.gm.userId, host.campaign.id, sceneId, {
    commandId: randomUUID(), expectedVersion: 0, mapId: map.subjectId, mapRevision: 1,
    tokens: [{ id: randomUUID(), actorId: host.actorId, x: 1000, y: 1000, elevation: 0, rotation: 0, scale: 1 }],
  });
});
test.afterAll(async () => { await host?.close(); });

test("a GM plans and follows a persisted adventure, starts its map and shares verified custom dice with a player", async ({ page, context, browser }, testInfo) => {
  const errors: string[] = []; page.on("pageerror", error => errors.push(error.message));
  await context.addCookies([{ name: "chronicle_session", value: host.gm.value, url: host.origin, httpOnly: true, sameSite: "Strict" }]);
  const base = `${host.origin}/api/campaigns/${host.campaign.id}`;
  await page.goto(`${host.origin}/?campaign=${host.campaign.id}&stage=tisch`);
  await page.getByRole("tab", { name: "Abenteuerbaum", exact: true }).click();
  await page.getByRole("button", { name: "Erste Szene anlegen", exact: true }).click();
  await page.getByLabel("Name des Abenteuers", { exact: true }).fill("Der Nebelpfad");
  await page.getByLabel("Szenentitel", { exact: true }).fill("Das Nebeltor");
  await page.getByLabel("Notizen der Spielleitung", { exact: true }).fill("GM-Geheimnis: Die Wache wartet auf ein Zeichen.");
  await page.getByRole("combobox", { name: /^Mit Spielszene verbinden/ }).selectOption(sceneId);
  await page.getByRole("button", { name: "Abzweigung mit neuer Szene", exact: true }).click();
  await page.getByLabel("Szenentitel", { exact: true }).fill("Am Nachtmarkt");
  await page.locator(".adventure-node").filter({ has: page.getByText("Das Nebeltor", { exact: true }) }).click();
  await page.getByLabel("Entscheidung", { exact: true }).fill("Mit der Wache verhandeln");
  await page.getByRole("button", { name: "Baum speichern", exact: true }).click();
  await expect(page.locator(".adventure-save-state")).toContainText("Gespeichert am");
  await page.getByRole("button", { name: "Diese Szene beginnen", exact: true }).click();
  await expect(page.locator(".adventure-current h3")).toHaveText("Das Nebeltor");

  await page.getByRole("tab", { name: "Spieltisch", exact: true }).click();
  await expect(page.getByRole("region", { name: "Figuren am Tisch", exact: true })).toContainText("Sera");
  await expect(page.getByRole("heading", { name: "Das Tor im Nebel", exact: true })).toBeVisible();
  await expect(page.locator(".tabletop-map canvas").first()).toBeVisible();
  const dice = page.getByRole("region", { name: "Würfelschale", exact: true });
  await dice.getByLabel("Anzahl", { exact: true }).fill("3");
  await dice.getByLabel("Eigenen Wertebereich wählen", { exact: true }).check();
  await dice.getByLabel("Von", { exact: true }).fill("-2");
  await dice.getByLabel("Bis", { exact: true }).fill("2");
  const rolled = page.waitForResponse(response => response.url() === `${base}/rolls` && response.request().method() === "POST");
  await dice.getByRole("button", { name: "Würfeln", exact: true }).click();
  const response = await rolled; expect(response.status()).toBe(200);
  const receipt = await response.json();
  await expect(dice.locator(".table-die")).toHaveCount(3);
  const values = (await dice.locator(".table-die").allTextContents()).map(Number);
  expect(values.every(value => Number.isInteger(value) && value >= -2 && value <= 2)).toBe(true);
  expect(values.reduce((sum, value) => sum + value, 0)).toBe(receipt.receipt.total);
  await dice.locator(".table-dice-history > summary").click();
  await dice.getByRole("button", { name: "Ergebnis bestätigen", exact: true }).click();
  await expect(dice.getByRole("button", { name: "Ergebnis bestätigen", exact: true })).toHaveCount(0);
  await dice.getByRole("button", { name: "Nachrechnen", exact: true }).click();
  await expect(dice).toContainText("Nachgerechnet: Würfel, Regelversion und Beleg stimmen überein.");
  await page.screenshot({ path: testInfo.outputPath("tabletop.png"), fullPage: true });

  const playerContext = await browser.newContext({ locale: "de-DE" });
  try {
    await playerContext.addCookies([{ name: "chronicle_session", value: host.player.value, url: host.origin, httpOnly: true, sameSite: "Strict" }]);
    const player = await playerContext.newPage(); player.on("pageerror", error => errors.push(error.message));
    await player.goto(`${host.origin}/?campaign=${host.campaign.id}&stage=tisch`);
    await expect(player.getByRole("region", { name: "Würfelschale", exact: true }).locator(".table-die")).toHaveCount(3);
    await expect(player.getByRole("tab", { name: "Abenteuerbaum", exact: true })).toHaveCount(0);
    expect((await player.request.get(`${base}/tabletop/adventure`)).status()).toBe(404);
    await expect(player.locator("body")).not.toContainText("GM-Geheimnis");
  } finally { await playerContext.close(); }

  await page.getByRole("tab", { name: "Abenteuerbaum", exact: true }).click();
  await page.reload();
  await expect(page.getByLabel("Name des Abenteuers", { exact: true })).toHaveValue("Der Nebelpfad");
  await page.locator(".adventure-current").getByRole("button", { name: /Mit der Wache verhandeln/ }).click();
  await expect(page.locator(".adventure-current h3")).toHaveText("Am Nachtmarkt");
  await page.reload();
  await expect(page.locator(".adventure-current h3")).toHaveText("Am Nachtmarkt");
  await page.screenshot({ path: testInfo.outputPath("adventure.png"), fullPage: true });
  expect(errors).toEqual([]);
});
