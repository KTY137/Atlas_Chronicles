// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2026 Kaya Yesilyurt - Atlas Chronicles. Siehe LICENSE.
import { test, expect } from "@playwright/test";
import { randomUUID } from "node:crypto";
import { readFile } from "node:fs/promises";
import { reviewApp } from "./helpers/review-app.ts";
import { planOverlaps, type PlanPoint } from "../packages/szene/src/settlement-plan.ts";
import { createTactical } from "../packages/server/src/domain/tactical.ts";

test("zones are drawn and edited, control real generation and replay from a portable recipe", async ({ browser }, info) => {
  const host = await reviewApp(11010 + Math.floor(Math.random() * 80));
  const context = await browser.newContext({ locale: "de-DE", acceptDownloads: true });
  try {
    await context.addCookies([{ name: "chronicle_session", value: host.gm.value, url: host.origin, httpOnly: true, sameSite: "Strict" }]);
    const page = await context.newPage(), errors: string[] = [];
    page.on("pageerror", error => errors.push(error.message)); page.on("dialog", dialog => dialog.accept());
    await page.goto(`${host.origin}/?campaign=${host.campaign.id}&stage=atlas`);
    await page.getByRole("button", { name: "Neue Karte", exact: true }).click();
    const studio = page.getByRole("region", { name: "Kartenwerkstatt", exact: true });
    await studio.getByLabel("Name der Karte", { exact: true }).fill("Siedlung mit Handwerksviertel");
    await studio.getByLabel("Weltkeim").fill("zones-browser");
    await studio.getByText("Viertel & Freiflächen planen", { exact: true }).click();
    const planner = studio.locator(".map-zone-planner");
    await planner.getByRole("button", { name: "Zone hinzufügen", exact: true }).click();
    await planner.getByLabel("Links (%)", { exact: true }).fill("0");
    await planner.getByLabel("Oben (%)", { exact: true }).fill("0");
    await planner.getByLabel("Breite (%)", { exact: true }).fill("100");
    await planner.getByLabel("Höhe (%)", { exact: true }).fill("100");
    // Empty intermediate text must be editable, but must never be submitted as a valid plan.
    await planner.getByLabel("Name des Viertels", { exact: true }).fill("");
    await expect(studio.getByRole("button", { name: "Vorschau", exact: true })).toBeDisabled();
    await planner.getByLabel("Name des Viertels", { exact: true }).pressSequentially("Altes Handwerk");
    await planner.getByLabel("Nutzung der Zone", { exact: true }).selectOption("handwerk");
    const preview = () => page.waitForResponse(response => response.url().endsWith("/tactical/generate/preview") && response.ok());
    let response = preview(); await studio.getByRole("button", { name: "Vorschau", exact: true }).click();
    const full = await (await response).json();
    expect(full.nodes.length).toBeGreaterThan(0);
    expect(full.nodes.every((node: any) => ["werkstatt", "schmiede", "lager"].includes(node.bauwerk?.typ))).toBe(true);
    await expect(studio.getByRole("region", { name: "Ergebnis der Zonenplanung", exact: true })).toContainText("Altes Handwerk");
    // Actual pointer drawing, then deterministic keyboard dimensions for the assertion below.
    const drawing = planner.getByRole("img", { name: "Zonenplan zeichnen", exact: true });
    await drawing.scrollIntoViewIfNeeded(); const bounds = (await drawing.boundingBox())!;
    await page.mouse.move(bounds.x + bounds.width * .35, bounds.y + bounds.height * .35);
    await page.mouse.down(); await page.mouse.move(bounds.x + bounds.width * .65, bounds.y + bounds.height * .65, { steps: 5 }); await page.mouse.up();
    await expect(planner.getByLabel("Zone auswählen", { exact: true })).toHaveValue("zone-2");
    await planner.getByLabel("Nutzung der Zone", { exact: true }).selectOption("frei");
    for (const [label, value] of [["Links (%)", "30"], ["Oben (%)", "30"], ["Breite (%)", "40"], ["Höhe (%)", "40"]]) await planner.getByLabel(label!, { exact: true }).fill(value!);
    await planner.getByLabel("Name des Viertels", { exact: true }).fill("Geschützter Anger");
    response = preview(); await studio.getByRole("button", { name: "Vorschau", exact: true }).click();
    const cleared = await (await response).json(), clearing: PlanPoint[] = [[.3,.3],[.7,.3],[.7,.7],[.3,.7]];
    expect(cleared.nodes.length).toBeLessThan(full.nodes.length);
    for (const node of cleared.nodes) {
      const polygon = cleared.document.geometry.regions.find((region:any) => region.id === node.knotenId).punkte;
      expect(planOverlaps(clearing,polygon.map(([x,y]: number[]) => [x! / cleared.groesse[0], y! / cleared.groesse[1]]))).toBe(false);
    }
    const downloading = page.waitForEvent("download");
    await studio.getByRole("button", { name: "Vorlage als Datei speichern", exact: true }).click();
    const file = info.outputPath("zones-recipe.json"); await (await downloading).saveAs(file);
    const recipe = JSON.parse(await readFile(file,"utf8"));
    expect(recipe.settings.planung.zonen).toHaveLength(2); expect(recipe.referenceHash).toBe(cleared.keimHash);
    await planner.getByRole("button", {name:"Zone entfernen",exact:true}).click();
    await studio.getByLabel("Kartenvorlage öffnen", { exact: true }).setInputFiles(file);
    await expect(planner.getByLabel("Zone auswählen", { exact: true }).locator("option")).toHaveCount(3);
    response = preview(); await studio.getByRole("button", { name: "Vorschau", exact: true }).click();
    expect((await (await response).json()).keimHash).toBe(cleared.keimHash);
    await page.screenshot({ path: info.outputPath("zones-preview.png"), fullPage: true });
    await studio.getByRole("button", { name: "Erzeugen und speichern", exact: true }).click();
    await expect(page.locator('.tactical-canvas[data-canvas-ready="true"]')).toHaveCount(1);
    await expect(page.locator(".nested-building-list li")).toHaveCount(cleared.nodes.length);
    const mapId = new URL(page.url()).searchParams.get("atlasChild")!;
    await page.reload(); await expect(page.locator(".nested-building-list li")).toHaveCount(cleared.nodes.length);
    const saved = await createTactical(host.db).getMap(host.gm.userId, host.campaign.id, mapId);
    expect(saved.cartography!.regions[0]!.provenance!.optionen.planung).toEqual(recipe.settings.planung);
    expect(errors).toEqual([]);
  } finally { await context.close(); await host.close(); }
});

test("all expedition thumbnails resolve and placed rotated artwork survives saving and reload", async ({ browser }, info) => {
  const host = await reviewApp(11110 + Math.floor(Math.random() * 80));
  const context = await browser.newContext({ locale: "de-DE" });
  try {
    await context.addCookies([{ name: "chronicle_session", value: host.gm.value, url: host.origin, httpOnly: true, sameSite: "Strict" }]);
    const res = await context.request.post(`${host.origin}/api/campaigns/${host.campaign.id}/tactical/generate`, {
      headers: { origin: host.origin }, data: { commandId: randomUUID(), name: "Expedition", keim: "expedition-browser", art: "siedlung", stil: "gemalt", optionen: { art: "weiler", standort: "ebene", planung: { schemaVersion: 1, zonen: [{id:"clear",name:"Lagerplatz",nutzung:"frei",dichte:0,polygon:[[0,0],[1,0],[1,1],[0,1]]}] } } },
    });
    expect(res.ok(),await res.text()).toBe(true); const mapId = (await res.json()).ack.subjectId;
    const page = await context.newPage(), errors: string[] = []; page.on("pageerror", error => errors.push(error.message));
    await page.goto(`${host.origin}/?campaign=${host.campaign.id}&stage=atlas&atlasChild=${encodeURIComponent(mapId)}`);
    await page.getByRole("button", { name: "Karte bearbeiten", exact: true }).click();
    await page.getByRole("button", { name: "Möbel & Objekte", exact: true }).click();
    const palette = page.getByRole("region", { name: "Kartenassets", exact: true });
    // Deliberately leave incompatible filters in the old pack: switching must clear them.
    await palette.getByLabel("Kategorie", { exact: true }).selectOption("boden");
    await palette.getByLabel("Assets suchen", { exact: true }).fill("unpassende-suche");
    await palette.getByLabel("Assetpaket", { exact: true }).selectOption("pk.expedition");
    await expect(palette.getByLabel("Assetpaket", { exact: true }).locator("option:checked")).toContainText("Wildnis & Expedition");
    await expect(palette.getByLabel("Kategorie", { exact: true })).toHaveValue("all");
    await expect(palette.getByLabel("Assets suchen", { exact: true })).toHaveValue("");
    await expect(palette.locator(".map-artwork-grid button")).toHaveCount(24);
    for (const image of await palette.locator(".map-artwork-grid img").all()) {
      await image.scrollIntoViewIfNeeded(); await expect.poll(() => image.evaluate((img:HTMLImageElement) => img.complete && img.naturalWidth > 0)).toBe(true);
    }
    for (const [name, fraction] of [["Wurzelwerk",.42],["Expeditionszelt",.65]] as const) {
      await palette.locator(".map-artwork-grid").getByRole("button",{ name: new RegExp(`^${name}`) }).click();
      if (name === "Wurzelwerk") await page.getByRole("button",{name:"Objekt drehen · 0°",exact:true}).click();
      const canvas = page.locator(".map-editor canvas").first(); await canvas.scrollIntoViewIfNeeded();
      const b = (await canvas.boundingBox())!; await page.mouse.click(b.x + b.width*fraction,b.y+b.height*.5);
    }
    await page.keyboard.press("Escape");
    await page.getByRole("button",{name:"Kartenrevision speichern",exact:true}).click();
    await expect(page.getByText(/Kartenrevision 2\./)).toBeVisible();
    const saved = await createTactical(host.db).getMap(host.gm.userId,host.campaign.id,mapId);
    const stamps = saved.document.geometry.stamps.filter(s => s.a.startsWith("pk.expedition/"));
    expect(stamps.map(s => s.a).sort()).toEqual(["pk.expedition/expeditionszelt","pk.expedition/wurzelwerk"]);
    expect(stamps.every(s => Math.abs(s.r-Math.PI/2)<1e-8)).toBe(true);
    await page.reload(); await expect(page.locator('.tactical-canvas[data-canvas-ready="true"]')).toHaveCount(1);
    const reopened = await createTactical(host.db).getMap(host.gm.userId,host.campaign.id,mapId);
    expect(reopened.document.geometry.stamps.filter(s => s.a.startsWith("pk.expedition/"))).toEqual(stamps);
    await page.setViewportSize({width:390,height:844});
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await page.screenshot({path:info.outputPath("expedition-placed.png"),fullPage:true});
    expect(errors).toEqual([]);
  } finally { await context.close(); await host.close(); }
});
