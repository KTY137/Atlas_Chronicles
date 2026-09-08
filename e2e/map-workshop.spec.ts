import { test, expect, type BrowserContext } from "@playwright/test";
import { randomBytes } from "node:crypto";
import { resolve } from "node:path";
import type { TacticalMapCard } from "@chronicle/protocol";
import type { BauwerkTyp, TacticalMapDocumentV1 } from "@chronicle/szene";
import { buildApp } from "../packages/server/src/app.ts";
import { createTestDb, migrate, type Db } from "../packages/server/src/db/index.ts";
import { createIdentity } from "../packages/server/src/identity/index.ts";
import { createCampaigns } from "../packages/server/src/domain/campaigns.ts";
import { fitCamera, pointInPolygon } from "../packages/render/src/geometry.ts";

interface Building {
  knotenId: string; titel: string; art: string; x: number; y: number;
  bauwerk?: { typ: BauwerkTyp; beschreibung: string }; vorhandeneKarteId: string | null;
}
interface Children { art: string; stil: string; version: number; nodes: Building[] }

// A real built client, HTTP application and isolated PostgreSQL-compatible database. No API mocks.
test("Kartenwerkstatt creates a painted city with editable buildings and durable typed interiors", async ({ browser }, testInfo) => {
  test.setTimeout(240_000);
  let db: Db | undefined, app: Awaited<ReturnType<typeof buildApp>> | undefined, context: BrowserContext | undefined;
  try {
    db = await createTestDb(); await migrate(db);
    const port = 9600 + Math.floor(Math.random() * 100), origin = `http://localhost:${port}`;
    const config = { origin, cookieSecret: randomBytes(32).toString("hex"), bootstrapToken: randomBytes(32).toString("hex"), staticRoot: resolve("packages/client/dist") };
    const gm = await createIdentity(db, config).bootstrap("Kartenleitung");
    const campaign = await createCampaigns(db).createCampaign(gm.userId, { name: "Lindenhafen · Stadt und Geschichten" });
    app = await buildApp(db, config); await app.listen({ host: "127.0.0.1", port });
    context = await browser.newContext();
    await context.addCookies([{ name: "chronicle_session", value: gm.value, url: origin, httpOnly: true, sameSite: "Strict" }]);
    const page = await context.newPage(), errors: string[] = [], failedAssets = new Set<string>(), paintedAssets = new Set<string>();
    page.on("pageerror", error => errors.push(error.message));
    page.on("response", response => {
      if (/\/api\/packs\/[^/]+\/asset\//.test(response.url())) {
        if (!response.ok()) failedAssets.add(response.url());
        else if (response.url().includes("/pk.gemalt/")) paintedAssets.add(response.url());
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
    const sceneCanvas = () => page.locator('.nested-map-stage .tactical-canvas[data-canvas-ready="true"] canvas');
    const clickRoof = async (node: Building, document: TacticalMapDocumentV1) => {
      await expect(sceneCanvas()).toBeVisible();
      await sceneCanvas().scrollIntoViewIfNeeded();
      await page.locator(".nested-map-stage").getByRole("button", { name: "Ganze Karte", exact: true }).click();
      const bounds = (await sceneCanvas().boundingBox())!;
      const camera = fitCamera(document.geometry.size, [bounds.width, bounds.height]);
      const region = document.geometry.regions.find(item => item.id === node.knotenId)!;
      expect(region).toBeTruthy();
      // Prefer the roof away from its pin, to exercise region hit-testing as well as the badge.
      const candidate = region.punkte.map(point => [node.x * .4 + point[0] * .6, node.y * .4 + point[1] * .6] as const)
        .find(point => pointInPolygon(point, region.punkte) && Math.hypot(point[0] - node.x, point[1] - node.y) * camera.scale > 14);
      const [x, y] = candidate ?? [node.x, node.y];
      await page.mouse.click(bounds.x + camera.x + x * camera.scale, bounds.y + camera.y + y * camera.scale);
    };

    let cityId = "", city: TacticalMapCard, church: Building, house: Building, churchId = "", churchDocument: TacticalMapDocumentV1;
    await test.step("create a city through the workshop, with a visual preview that writes nothing", async () => {
      await page.goto(`${origin}/?campaign=${campaign.id}&stage=tisch`);
      await page.getByRole("tab", { name: "Szenenkarte", exact: true }).click();
      await page.getByRole("button", { name: "Karte & Vorbereitung", exact: true }).click();
      await page.getByRole("button", { name: "Neue Karte erzeugen", exact: true }).click();
      const workshop = page.getByRole("region", { name: "Kartenwerkstatt", exact: true });
      await expect(workshop).toBeVisible();
      await workshop.getByLabel("Name der Karte", { exact: true }).fill("Lindenhafen");
      await workshop.getByRole("group", { name: "Art der Karte", exact: true }).getByRole("button", { name: /^Stadt & Dorf/ }).click();
      await workshop.getByRole("group", { name: "Größenprofile", exact: true }).getByRole("button", { name: "Stadt", exact: true }).click();
      await workshop.getByRole("group", { name: "Zeichenstil", exact: true }).getByRole("button", { name: /^Gemalt/ }).click();
      await workshop.getByRole("spinbutton", { name: "Breite", exact: true }).fill("58");
      await workshop.locator(".map-seed-field input").fill("lindenhafen-browser-20260908");
      const before = await mapCount();
      const previewResponse = page.waitForResponse(response => response.url().endsWith("/tactical/generate/preview") && response.request().method() === "POST");
      await workshop.getByRole("button", { name: "Vorschau", exact: true }).click();
      const previewHttp = await previewResponse; expect(previewHttp.ok()).toBe(true);
      const preview = await previewHttp.json();
      expect(preview.art).toBe("siedlung"); expect(preview.stil).toBe("gemalt");
      expect(preview.document.geometry.size).toEqual([58 * 96, 44 * 96]);
      expect(preview.nodes).toHaveLength(preview.bauwerke); expect(preview.bauwerke).toBeGreaterThan(20);
      expect(preview.strassen).toBeGreaterThan(0); expect(preview).not.toHaveProperty("raeume");
      await expect(workshop.locator('.map-workshop-preview .tactical-canvas[data-canvas-ready="true"] canvas')).toBeVisible();
      await expect(workshop.getByText("Noch nicht gespeichert", { exact: true })).toBeVisible();
      expect(await mapCount()).toBe(before);
      await expect.poll(() => paintedAssets.size).toBeGreaterThan(0);
      await page.screenshot({ path: testInfo.outputPath("workshop-preview-desktop.png"), fullPage: true });
      const createResponse = page.waitForResponse(response => response.url().endsWith("/tactical/generate") && response.request().method() === "POST");
      await workshop.getByRole("button", { name: "Erzeugen und speichern", exact: true }).click();
      const createdHttp = await createResponse; expect(createdHttp.ok()).toBe(true); cityId = (await createdHttp.json()).ack.subjectId;
      expect(await mapCount()).toBe(before + 1);
      await page.getByRole("button", { name: "Karte im Atlas öffnen", exact: true }).click();
      await expect.poll(activeMap).toBe(cityId);
      await expect(sceneCanvas()).toBeVisible();
      await expect(page.locator(".nested-map-stage").getByRole("checkbox", { name: "Raster", exact: true })).not.toBeChecked();
      city = await readMap(cityId);
      const children = await readChildren(cityId);
      expect(children.art).toBe("siedlung"); expect(children.stil).toBe("gemalt");
      expect(children.nodes.every(node => node.art === "bauwerk")).toBe(true);
      church = children.nodes.find(node => node.bauwerk?.typ === "kirche")!;
      house = children.nodes.find(node => node.bauwerk?.typ === "haus")!;
      expect(church).toBeTruthy(); expect(house).toBeTruthy();
      await expect(page.locator(".nested-building-list li")).toHaveCount(children.nodes.length);
      await page.screenshot({ path: testInfo.outputPath("painted-city-desktop.png"), fullPage: true });
    });

    await test.step("select a church roof, edit its metadata and enter a church interior", async () => {
      await clickRoof(church!, city!.document);
      const metadata = page.locator(".building-metadata");
      await expect(metadata.getByLabel("Gebäudename", { exact: true })).toHaveValue(church!.titel);
      await expect(metadata.getByRole("combobox", { name: "Gebäudetyp", exact: true })).toHaveValue("kirche");
      await metadata.getByLabel("Gebäudename", { exact: true }).fill("Sankt Linden");
      await metadata.getByLabel("Beschreibung", { exact: true }).fill("Die Kirche am alten Hafen.");
      const savedResponse = page.waitForResponse(response => response.url().endsWith(`/knoten/${church!.knotenId}/metadata`) && response.request().method() === "PUT");
      await metadata.getByRole("button", { name: "Metadaten speichern", exact: true }).click();
      expect((await savedResponse).ok()).toBe(true);
      await expect(metadata.getByRole("button", { name: "Metadaten speichern", exact: true })).toBeDisabled();
      await expect(metadata.getByLabel("Gebäudename", { exact: true })).toBeEnabled();
      await page.locator(".atlas-entrance").getByText("Größe, Stil & Kartenart anpassen", { exact: true }).click();
      await expect(page.locator(".atlas-entrance").getByRole("combobox", { name: "Innenraum für Gebäudetyp", exact: true })).toHaveValue("kirche");
      await page.getByRole("button", { name: "Unterkarte erzeugen", exact: true }).click();
      await expect.poll(() => !!activeMap() && activeMap() !== cityId).toBe(true); churchId = activeMap()!;
      await expect(page.getByRole("heading", { name: "Sankt Linden", exact: true })).toBeVisible();
      const children = await readChildren(churchId), titles = children.nodes.map(node => node.titel);
      expect(titles).toContain("Kirchenschiff"); expect(titles).toContain("Altarraum"); expect(titles).toContain("Sakristei");
      await expect(page.locator(".nested-building-list").getByRole("button", { name: /^Kirchenschiff/ })).toBeVisible();
      const child = await readMap(churchId); churchDocument = child.document;
      expect(child.document.geometry.stamps.some(stamp => stamp.a.startsWith("pk.gemalt/"))).toBe(true);
      expect(await mapCount()).toBe(2);
      await page.screenshot({ path: testInfo.outputPath("church-interior-desktop.png"), fullPage: true });
      await page.getByRole("button", { name: "Eine Ebene zurück", exact: true }).click();
      await expect.poll(activeMap).toBe(cityId);
      await page.reload(); await expect(sceneCanvas()).toBeVisible();
      church = (await readChildren(cityId)).nodes.find(node => node.knotenId === church!.knotenId)!;
      expect(church).toMatchObject({ titel: "Sankt Linden", bauwerk: { typ: "kirche", beschreibung: "Die Kirche am alten Hafen." }, vorhandeneKarteId: churchId });
      await clickRoof(church, city!.document);
      await expect.poll(activeMap).toBe(churchId);
      expect((await readMap(churchId)).document).toEqual(churchDocument!);
      expect(await mapCount()).toBe(2);
      await page.getByRole("button", { name: "Eine Ebene zurück", exact: true }).click(); await expect.poll(activeMap).toBe(cityId);
    });

    await test.step("a house has its own room uses; display toggles preserve zoom and mobile fits", async () => {
      await clickRoof(house!, city!.document);
      await expect(page.locator(".building-metadata").getByRole("combobox", { name: "Gebäudetyp", exact: true })).toHaveValue("haus");
      await page.getByRole("button", { name: "Unterkarte erzeugen", exact: true }).click();
      await expect.poll(() => !!activeMap() && activeMap() !== cityId).toBe(true);
      const houseId = activeMap()!, rooms = (await readChildren(houseId)).nodes.map(node => node.titel);
      expect(houseId).not.toBe(churchId); expect(rooms).toContain("Wohnstube"); expect(rooms).toContain("Küche"); expect(rooms).toContain("Schlafzimmer"); expect(rooms).not.toContain("Altarraum");
      expect(await mapCount()).toBe(3);
      await page.getByRole("button", { name: "Eine Ebene zurück", exact: true }).click(); await expect.poll(activeMap).toBe(cityId);
      const toolbar = page.locator(".nested-map-stage").getByRole("group", { name: "Kartenansicht", exact: true });
      await toolbar.getByRole("button", { name: "Karte vergrößern", exact: true }).click();
      const zoom = await toolbar.getByLabel("Vergrößerung", { exact: true }).textContent();
      await toolbar.getByRole("checkbox", { name: "Namen", exact: true }).uncheck();
      await expect(toolbar.getByLabel("Vergrößerung", { exact: true })).toHaveText(zoom!);
      await toolbar.getByRole("checkbox", { name: "Raster", exact: true }).check();
      await expect(toolbar.getByLabel("Vergrößerung", { exact: true })).toHaveText(zoom!);
      await toolbar.getByRole("checkbox", { name: "Namen", exact: true }).check();
      await toolbar.getByRole("checkbox", { name: "Raster", exact: true }).uncheck();
      await expect(toolbar.getByLabel("Vergrößerung", { exact: true })).toHaveText(zoom!);
      await page.setViewportSize({ width: 390, height: 844 });
      await expect(sceneCanvas()).toBeVisible();
      await toolbar.getByRole("button", { name: "Ganze Karte", exact: true }).click();
      await page.getByRole("heading", { name: "Lindenhafen", exact: true }).scrollIntoViewIfNeeded();
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
      await page.screenshot({ path: testInfo.outputPath("painted-city-mobile.png"), fullPage: true });
      await page.getByRole("textbox", { name: "Gebäude suchen", exact: true }).fill("Sankt Linden");
      await expect(page.locator(".nested-building-list li")).toHaveCount(1);
      await page.getByRole("button", { name: "Sankt Linden betreten", exact: true }).click();
      await expect.poll(activeMap).toBe(churchId);
      expect(await mapCount()).toBe(3);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
      expect(failedAssets.size).toBe(0); expect(errors).toEqual([]);
    });
  } finally { await context?.close(); await app?.close(); await db?.close(); }
});
