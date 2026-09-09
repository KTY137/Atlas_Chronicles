// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2026 Kaya Yesilyurt - Atlas Chronicles. Siehe LICENSE.
import { test, expect, type BrowserContext } from "@playwright/test";
import { randomBytes } from "node:crypto";
import { resolve } from "node:path";
import type { TacticalMapCard } from "@chronicle/protocol";
import type { AssetpaketV1, BauwerkTyp, KartenSetting, TacticalMapDocumentV1 } from "@chronicle/szene";
import { buildApp } from "../packages/server/src/app.ts";
import { createTestDb, migrate, type Db } from "../packages/server/src/db/index.ts";
import { createIdentity } from "../packages/server/src/identity/index.ts";
import { createCampaigns } from "../packages/server/src/domain/campaigns.ts";
import { fitCamera, pointInPolygon } from "../packages/render/src/geometry.ts";
import { artworkName } from "../packages/client/src/features/map-artwork.ts";

interface Building { knotenId: string; titel: string; art: string; x: number; y: number; bauwerk?: { typ: BauwerkTyp; beschreibung: string }; vorhandeneKarteId: string | null }
interface Children { art: string; stil: string; setting: KartenSetting; version: number; nodes: Building[] }

test("Zeitwelten cities inherit modern and science-fiction interiors, with a searchable 100-asset catalogue and durable placement", async ({ browser }, testInfo) => {
  test.setTimeout(240_000);
  let db: Db | undefined, app: Awaited<ReturnType<typeof buildApp>> | undefined, context: BrowserContext | undefined;
  try {
    db = await createTestDb(); await migrate(db);
    const port = 9900 + Math.floor(Math.random() * 100), origin = `http://localhost:${port}`;
    const config = { origin, cookieSecret: randomBytes(32).toString("hex"), bootstrapToken: randomBytes(32).toString("hex"), staticRoot: resolve("packages/client/dist") };
    const gm = await createIdentity(db, config).bootstrap("Zeitweltenleitung"), campaign = await createCampaigns(db).createCampaign(gm.userId, { name: "Orte durch die Zeit" });
    app = await buildApp(db, config); await app.listen({ host: "127.0.0.1", port });
    context = await browser.newContext();
    await context.addCookies([{ name: "chronicle_session", value: gm.value, url: origin, httpOnly: true, sameSite: "Strict" }]);
    const page = await context.newPage(), errors: string[] = [], failedAssets = new Set<string>(), zeitweltenAssets = new Set<string>();
    page.on("pageerror", error => errors.push(error.message));
    page.on("response", response => {
      if (/\/api\/packs\/[^/]+\/asset\//.test(response.url())) {
        if (!response.ok()) failedAssets.add(`${response.status()} ${response.url()}`);
        else if (response.url().includes("/pk.zeitwelten/")) zeitweltenAssets.add(response.url());
      }
    });
    const base = `${origin}/api/campaigns/${campaign.id}`;
    const mapCount = async () => Number((await db!.query<{ count: string }>("SELECT count(*)::text AS count FROM tactical_maps WHERE campaign_id=$1", [campaign.id])).rows[0]!.count);
    const readMap = async (id: string): Promise<TacticalMapCard> => {
      const response = await page.request.get(`${base}/tactical/maps/${id}`); expect(response.ok()).toBe(true); return response.json();
    };
    const readChildren = async (id: string): Promise<Children> => {
      const response = await page.request.get(`${base}/maps/tactical/${id}/children`); expect(response.ok()).toBe(true); return response.json();
    };
    const activeMap = () => new URL(page.url()).searchParams.get("atlasChild");
    const canvas = () => page.locator('.nested-map-view .tactical-canvas[data-canvas-ready="true"] canvas');
    const clickRoof = async (node: Building, document: TacticalMapDocumentV1) => {
      await expect(canvas()).toBeVisible(); await canvas().scrollIntoViewIfNeeded();
      await page.locator(".nested-map-stage").getByRole("button", { name: "Ganze Karte", exact: true }).click();
      const bounds = (await canvas().boundingBox())!, camera = fitCamera(document.geometry.size, [bounds.width, bounds.height]);
      const region = document.geometry.regions.find(item => item.id === node.knotenId)!; expect(region).toBeTruthy();
      const candidate = region.punkte.map(point => [node.x * .4 + point[0] * .6, node.y * .4 + point[1] * .6] as const)
        .find(point => pointInPolygon(point, region.punkte) && Math.hypot(point[0] - node.x, point[1] - node.y) * camera.scale > 14);
      const [x, y] = candidate ?? [node.x, node.y];
      await page.mouse.click(bounds.x + camera.x + x * camera.scale, bounds.y + camera.y + y * camera.scale);
    };

    for (const scenario of [
      { setting: "gegenwart" as const, label: "Gegenwart", title: "Hafenviertel Nord", typ: "polizei", rooms: ["Leitstelle", "Gewahrsam", "Vernehmung"] },
      { setting: "scifi" as const, label: "Science-Fiction", title: "Kolonie Aurora", typ: "medstation", rooms: ["Behandlungsraum", "Isolationsstation", "Operationssaal"] },
    ]) {
      let cityId = "", childId = "", building: Building, city: TacticalMapCard;
      await test.step(`${scenario.label}: create a city directly from the Atlas`, async () => {
        await page.goto(`${origin}/?campaign=${campaign.id}&stage=atlas`);
        await page.getByRole("button", { name: "Neue Karte", exact: true }).click();
        const workshop = page.getByRole("region", { name: "Kartenwerkstatt", exact: true });
        await workshop.getByLabel("Name der Karte", { exact: true }).fill(scenario.title);
        await workshop.getByRole("group", { name: "Art der Karte", exact: true }).getByRole("button", { name: /^Stadt & Dorf/ }).click();
        await workshop.getByRole("group", { name: "Setting", exact: true }).getByRole("button", { name: new RegExp(`^${scenario.label}`) }).click();
        await expect(workshop.getByRole("group", { name: "Zeichenstil", exact: true }).getByRole("button", { name: /^Zeitwelten/ })).toHaveAttribute("aria-pressed", "true");
        await workshop.getByRole("group", { name: "Größenprofile", exact: true }).getByRole("button", { name: "Stadt", exact: true }).click();
        await workshop.getByRole("spinbutton", { name: "Breite", exact: true }).fill("36");
        await workshop.getByRole("spinbutton", { name: "Höhe", exact: true }).fill("28");
        await workshop.getByRole("spinbutton", { name: "Gebäude", exact: true }).fill("36");
        await workshop.locator(".map-seed-field input").fill(`zeitwelten-browser-${scenario.setting}`);
        const before = await mapCount(), previewResponse = page.waitForResponse(response => response.url().endsWith("/tactical/generate/preview") && response.request().method() === "POST");
        await workshop.getByRole("button", { name: "Vorschau", exact: true }).click();
        const previewHttp = await previewResponse; expect(previewHttp.ok()).toBe(true);
        const preview = await previewHttp.json(); expect(preview).toMatchObject({ art: "siedlung", setting: scenario.setting, stil: "zeitwelten" });
        expect(preview.document.geometry.size).toEqual([36 * 96, 28 * 96]); expect(await mapCount()).toBe(before);
        await expect(workshop.locator('.tactical-canvas[data-canvas-ready="true"] canvas')).toBeVisible();
        const saveResponse = page.waitForResponse(response => response.url().endsWith("/tactical/generate") && response.request().method() === "POST");
        await workshop.getByRole("button", { name: "Erzeugen und speichern", exact: true }).click();
        const saved = await saveResponse; expect(saved.ok()).toBe(true); cityId = (await saved.json()).ack.subjectId;
        await expect.poll(activeMap).toBe(cityId); await expect(canvas()).toBeVisible();
        expect(await mapCount()).toBe(before + 1);
        const children = await readChildren(cityId); expect(children).toMatchObject({ setting: scenario.setting, stil: "zeitwelten" });
        city = await readMap(cityId); building = children.nodes.find(node => node.bauwerk?.typ === scenario.typ)!;
        expect(building).toBeTruthy();
        await page.screenshot({ path: testInfo.outputPath(`${scenario.setting}-city-desktop.png`), fullPage: true });
      });

      await test.step(`${scenario.label}: enter the matching building with inherited settings`, async () => {
        await clickRoof(building!, city!.document);
        await expect(page.locator(".building-metadata").getByRole("combobox", { name: "Gebäudetyp", exact: true })).toHaveValue(scenario.typ);
        const entrance = page.locator(".atlas-entrance");
        await entrance.getByText("Größe, Stil & Kartenart anpassen", { exact: true }).click();
        await expect(entrance.getByRole("combobox", { name: "Innenraum für Gebäudetyp", exact: true })).toHaveValue(scenario.typ);
        await expect(entrance.getByRole("group", { name: "Setting", exact: true }).getByRole("button", { name: new RegExp(`^${scenario.label}`) })).toHaveAttribute("aria-pressed", "true");
        const enteredResponse = page.waitForResponse(response => response.url().endsWith("/betreten") && response.request().method() === "POST");
        await entrance.getByRole("button", { name: "Unterkarte erzeugen", exact: true }).click();
        const entered = await enteredResponse; expect(entered.ok()).toBe(true); childId = (await entered.json()).mapId;
        await expect.poll(activeMap).toBe(childId); await expect(canvas()).toBeVisible();
        const children = await readChildren(childId); expect(children).toMatchObject({ art: "grundriss", setting: scenario.setting, stil: "zeitwelten" });
        expect(children.nodes.map(node => node.titel)).toEqual(expect.arrayContaining(scenario.rooms));
        expect(children.nodes.map(node => node.titel)).not.toContain("Altarraum");
        const source = await page.request.get(`${base}/tactical/maps/${childId}/source`); expect(source.ok()).toBe(true);
        expect((await source.json()).provenance.setting).toBe(scenario.setting);
        await page.screenshot({ path: testInfo.outputPath(`${scenario.setting}-interior-desktop.png`), fullPage: true });
      });

      if (scenario.setting === "gegenwart") await test.step("browse 100 real assets, place a computer and retain it after revision and reload", async () => {
        const baseline = await readMap(childId), before = new Set(baseline.document.geometry.stamps.map(stamp => stamp.id));
        await page.getByRole("button", { name: "Karte bearbeiten", exact: true }).click();
        // Der Objektkatalog liegt im zugeklappten Abschnitt "Einrichtung & Kartenassets";
        // "Moebel & Objekte" in der Buehnenleiste klappt ihn auf, sonst steht die Palette nicht im DOM.
        const openCatalogue = () => page.getByRole("button", { name: "Möbel & Objekte", exact: true }).click();
        await openCatalogue();
        const palette = page.getByRole("region", { name: "Kartenassets", exact: true });
        await expect(palette).toBeVisible(); await expect(palette.getByRole("combobox", { name: "Assetpaket", exact: true })).toHaveValue("pk.zeitwelten");
        await expect(palette.locator(".map-artwork-grid button")).toHaveCount(100);
        await expect(palette.getByText(/^100 von 100 Assets/)).toBeVisible();
        const manifestResponse = await page.request.get(`${origin}/api/packs/pk.zeitwelten/manifest`); expect(manifestResponse.ok()).toBe(true);
        const manifest = await manifestResponse.json() as AssetpaketV1; expect(manifest.assets).toHaveLength(100);
        const asset = manifest.assets.find(item => item.art === "moebel" && item.schlagworte.includes("computer"))!; expect(asset).toBeTruthy();
        await palette.getByRole("textbox", { name: "Assets suchen", exact: true }).fill(asset.name.replaceAll("_", " "));
        const choice = palette.locator(".map-artwork-grid button").filter({ has: page.getByText(artworkName(asset.name), { exact: true }) });
        await expect(choice).toHaveCount(1); await choice.click();
        await expect(choice).toHaveAttribute("aria-pressed", "true");
        await canvas().scrollIntoViewIfNeeded();
        await page.locator(".nested-map-view").getByRole("button", { name: "Ganze Karte", exact: true }).click();
        const bounds = (await canvas().boundingBox())!; await page.mouse.click(bounds.x + bounds.width / 2, bounds.y + bounds.height / 2);
        const save = page.getByRole("button", { name: "Kartenrevision speichern", exact: true }); await expect(save).toBeEnabled();
        const savedResponse = page.waitForResponse(response => response.url().endsWith(`/tactical/maps/${childId}/revision`) && response.request().method() === "PUT");
        await save.click(); expect((await savedResponse).ok()).toBe(true); await expect(save).toBeDisabled();
        const revised = await readMap(childId), added = revised.document.geometry.stamps.filter(stamp => !before.has(stamp.id));
        expect(revised.revision).toBe(baseline.revision + 1); expect(added).toHaveLength(1); expect(added[0]!.a).toBe(`pk.zeitwelten/${asset.name}`);
        await palette.screenshot({ path: testInfo.outputPath("zeitwelten-asset-search-desktop.png") });
        await page.reload(); await expect(canvas()).toBeVisible();
        expect((await readMap(childId)).document.geometry.stamps).toContainEqual(added[0]);
        await page.getByRole("button", { name: "Karte bearbeiten", exact: true }).click();
        await openCatalogue();
        await page.setViewportSize({ width: 390, height: 844 });
        await expect(palette.locator(".map-artwork-grid button")).toHaveCount(100);
        await palette.scrollIntoViewIfNeeded();
        expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
        await palette.screenshot({ path: testInfo.outputPath("zeitwelten-assets-mobile.png") });
        await page.getByRole("button", { name: "Karte ansehen", exact: true }).click();
        await page.setViewportSize({ width: 1440, height: 960 });
      });

      await test.step(`${scenario.label}: reload and reopen the authoritative child`, async () => {
        const child = await readMap(childId), count = await mapCount();
        await page.getByRole("button", { name: "Eine Ebene zurück", exact: true }).click(); await expect.poll(activeMap).toBe(cityId);
        await page.reload(); await expect(canvas()).toBeVisible();
        const node = (await readChildren(cityId)).nodes.find(node => node.knotenId === building!.knotenId)!;
        expect(node.vorhandeneKarteId).toBe(childId);
        await clickRoof(node, city!.document); await expect.poll(activeMap).toBe(childId);
        expect(await readMap(childId)).toEqual(child); expect(await mapCount()).toBe(count);
        if (scenario.setting === "scifi") {
          await page.setViewportSize({ width: 390, height: 844 }); await expect(canvas()).toBeVisible();
          await page.getByRole("heading", { name: building!.titel, exact: true }).scrollIntoViewIfNeeded();
          expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
          await page.screenshot({ path: testInfo.outputPath("scifi-interior-mobile.png"), fullPage: true });
        }
      });
    }
    expect(await mapCount()).toBe(4); expect(zeitweltenAssets.size).toBeGreaterThan(10);
    expect([...failedAssets]).toEqual([]); expect(errors).toEqual([]);
  } finally { await context?.close(); await app?.close(); await db?.close(); }
});
