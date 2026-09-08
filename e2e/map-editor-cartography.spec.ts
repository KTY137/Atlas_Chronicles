// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2026 Kaya Yesilyurt - Atlas Chronicles. Siehe LICENSE.
import { test, expect, type BrowserContext, type Page } from "@playwright/test";
import { build } from "esbuild";
import { createHash, randomBytes, randomUUID } from "node:crypto";
import { mkdir, mkdtemp, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import sharp from "sharp";
import { cartographyDraw, cartographyPaintsWalls, rendererVersion, serializeTacticalMapDocument, type TacticalCartographyV1, type TacticalMapDocumentV1 } from "@chronicle/szene";
import type { TacticalMapCard } from "@chronicle/protocol";
import { buildApp } from "../packages/server/src/app.ts";
import { createTestDb, migrate, type Db } from "../packages/server/src/db/index.ts";
import { createIdentity } from "../packages/server/src/identity/index.ts";
import { createCampaigns } from "../packages/server/src/domain/campaigns.ts";
import { createTactical } from "../packages/server/src/domain/tactical.ts";
import { fitCamera } from "../packages/render/src/geometry.ts";

// Compile the owned components into an isolated test host. Production dist stays frozen for the separate
// desktop delivery; all commands below still cross the real HTTP and database boundary.
async function editorBundle(campaignId: string, mapId: string) {
  return build({ stdin: { resolveDir: process.cwd(), loader: "tsx", contents: `
    import { useCallback, useEffect, useState } from 'react';
    import { createRoot } from 'react-dom/client';
    import { AppearanceProvider } from './packages/client/src/features/Appearance.tsx';
    import { MapEditor } from './packages/client/src/features/MapEditor.tsx';
    import '@chronicle/ui/tokens.css';
    import './packages/client/src/styles.css';
    const path = '/api/campaigns/${campaignId}/tactical/maps/' + (new URLSearchParams(location.search).get('map') || '${mapId}');
    const dirty = value => { window.editorDirty = value; };
    function Check() {
      const [card, setCard] = useState(null);
      const reload = useCallback(() => fetch(path).then(response => response.json()).then(setCard), []);
      useEffect(() => { reload(); window.reloadEditor = reload; }, []);
      return <AppearanceProvider>{card ? <MapEditor current={card} campaignId='${campaignId}' onChanged={reload} onDirty={dirty} /> : <p>Laden</p>}</AppearanceProvider>;
    }
    createRoot(document.querySelector('#root')).render(<Check />);
  ` }, bundle: true, format: "esm", platform: "browser", target: "es2022", jsx: "automatic", write: false, outdir: ".local/map-editor-memory", logLevel: "silent",
    define: { "process.env.NODE_ENV": '"production"' }, loader: { ".svg": "dataurl", ".webp": "dataurl", ".png": "dataurl", ".woff2": "dataurl" } });
}
const canvas = (page: Page) => page.locator('.map-editor-stage .tactical-canvas[data-canvas-ready="true"] canvas');
async function point(page: Page, x: number, y: number) {
  const element = canvas(page); await element.scrollIntoViewIfNeeded();
  const bounds = (await element.boundingBox())!, camera = fitCamera([200,200], [bounds.width,bounds.height]);
  return { x: bounds.x + camera.x + x * camera.scale, y: bounds.y + camera.y + y * camera.scale };
}
async function clickMap(page: Page, x: number, y: number) { const at = await point(page,x,y); await page.mouse.click(at.x,at.y); }
async function dragMap(page: Page, from: readonly [number,number], to: readonly [number,number]) {
  const start = await point(page,...from), end = await point(page,...to);
  await page.mouse.move(start.x,start.y); await page.mouse.down(); await page.mouse.move(end.x,end.y,{ steps: 6 }); await page.mouse.up();
}

test("editor sections retain user choices across genre and drawing tool changes",async ({browser},info)=>{
  test.setTimeout(120_000);
  let db:Db|undefined,app:Awaited<ReturnType<typeof buildApp>>|undefined,context:BrowserContext|undefined;
  try {
    db=await createTestDb();await migrate(db);
    const port=10100+Math.floor(Math.random()*70),origin=`http://localhost:${port}`;
    const config={origin,cookieSecret:randomBytes(32).toString("hex"),bootstrapToken:randomBytes(32).toString("hex")};
    const gm=await createIdentity(db,config).bootstrap("Abschnittprüfung"),campaign=await createCampaigns(db).createCampaign(gm.userId,{name:"Abschnittprüfung"});
    const document:TacticalMapDocumentV1={schemaVersion:1,kind:"tactical-map",coordinates:"image-pixels",frame:{ursprung:[0,0],einheitenProPixel:1,ordnung:"xy",hoch:"unten"},
      geometry:{v:3,size:[200,200],stamps:[],places:[],regions:[]},grid:{kind:"none"},elevation:0,geometryElevation:[],walls:[],portals:[],lights:[],environment:{bakedLighting:false,ambientLightArgb:"ffffffff"},background:null};
    const imported=await createTactical(db,config).importMap(gm.userId,campaign.id,{commandId:randomUUID(),name:"Offene Werkzeuge",format:"native",sourceText:serializeTacticalMapDocument(document),
      provenance:{name:"Test fixture",creator:"Tests",sourceUrl:null,license:"CC0-1.0",licenseUrl:null,retrievedAt:null,generator:null,generatorVersion:null}});
    const compiled=await editorBundle(campaign.id,imported.subjectId),staticRoot=await mkdtemp(resolve(".local/map-editor-sections-host-"));await mkdir(join(staticRoot,"assets"));
    await Promise.all([writeFile(join(staticRoot,"check.js"),compiled.outputFiles!.find(f=>f.path.endsWith(".js"))!.text),writeFile(join(staticRoot,"check.css"),compiled.outputFiles!.find(f=>f.path.endsWith(".css"))!.text),
      writeFile(join(staticRoot,"index.html"),'<!doctype html><html lang="de"><head><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="/check.css"></head><body><main id="root"></main><script type="module" src="/check.js"></script></body></html>')]);
    app=await buildApp(db,{...config,staticRoot});await app.listen({host:"127.0.0.1",port});
    context=await browser.newContext();await context.addCookies([{name:"chronicle_session",value:gm.value,url:origin,httpOnly:true,sameSite:"Strict"}]);
    const page=await context.newPage(),errors:string[]=[];page.on("pageerror",error=>errors.push(error.message));await page.goto(origin);await expect(canvas(page)).toBeVisible();
    const assets=page.locator('details.map-editor-section').filter({has:page.locator('summary',{hasText:"Einrichtung & Kartenassets"})}),palette=page.getByRole("region",{name:"Kartenassets",exact:true});
    await expect(palette).toBeHidden();await assets.locator(':scope > summary').click();
    await palette.getByRole("combobox",{name:"Assetpaket",exact:true}).selectOption("pk.genres");await palette.getByRole("combobox",{name:"Genre",exact:true}).selectOption("fantasy");
    await palette.locator('.map-artwork-grid button').first().click();await expect(palette.getByRole("button",{name:"Platzieren beenden",exact:true})).toBeVisible();
    await palette.getByRole("combobox",{name:"Genre",exact:true}).selectOption("cyberpunk");
    await expect(palette.getByRole("combobox",{name:"Kategorie",exact:true})).toBeVisible();await palette.getByRole("combobox",{name:"Kategorie",exact:true}).selectOption("moebel");
    await palette.locator('.map-artwork-grid button').first().click();await palette.getByRole("button",{name:"Platzieren beenden",exact:true}).click();await expect(palette).toBeVisible();
    await palette.locator('.map-artwork-grid button').first().click();await assets.locator(':scope > summary').click();await expect(palette).toBeHidden();
    await page.getByRole("button",{name:"Platzieren beenden",exact:true}).click();await expect(palette).toBeHidden();
    await assets.locator(':scope > summary').click();await palette.getByRole("combobox",{name:"Genre",exact:true}).selectOption("fantasy");await expect(palette.getByRole("combobox",{name:"Kategorie",exact:true})).toBeVisible();
    await assets.locator(':scope > summary').click();
    const knowledge=page.locator('details.map-editor-section').filter({has:page.locator('summary',{hasText:"Wissensregionen & Verknüpfungen"})});
    await knowledge.locator(':scope > summary').click();await knowledge.getByRole("button",{name:"Region zeichnen",exact:true}).click();await knowledge.getByRole("button",{name:"Zeichnen pausieren",exact:true}).click();
    await expect(knowledge.getByLabel("Eckpunkt X",{exact:true})).toBeVisible();
    await knowledge.getByRole("button",{name:"Region zeichnen",exact:true}).click();await knowledge.locator(':scope > summary').click();
    await page.getByRole("button",{name:"Auswählen",exact:true}).click();await expect(knowledge.getByLabel("Eckpunkt X",{exact:true})).toBeHidden();
    const objects=page.locator('details.map-editor-section').filter({has:page.locator('summary',{hasText:"Orte & Kartenobjekte"})});
    await objects.locator(':scope > summary').click();await objects.getByRole("button",{name:"Ort auf Karte markieren",exact:true}).click();await objects.getByRole("button",{name:"Markieren beenden",exact:true}).click();
    await expect(objects.getByRole("button",{name:"Ort auf Karte markieren",exact:true})).toBeVisible();
    await objects.getByRole("button",{name:"Ort auf Karte markieren",exact:true}).click();await objects.locator(':scope > summary').click();
    await page.getByRole("button",{name:"Auswählen",exact:true}).click();await expect(objects.getByRole("button",{name:"Ort auf Karte markieren",exact:true})).toBeHidden();
    await page.screenshot({path:info.outputPath("retained-section-choices.png"),fullPage:true});expect(errors).toEqual([]);
  }finally{await context?.close();await app?.close();await db?.close();}
});

test("real editor gestures, reload recovery, original-image retry and 390px controls", async ({ browser }, info) => {
  test.setTimeout(180_000);
  let db: Db | undefined, app: Awaited<ReturnType<typeof buildApp>> | undefined, context: BrowserContext | undefined;
  let releasePending = () => {};
  try {
    db = await createTestDb(); await migrate(db);
    const port = 9770 + Math.floor(Math.random()*80), origin = `http://localhost:${port}`;
    const config = { origin, cookieSecret: randomBytes(32).toString("hex"), bootstrapToken: randomBytes(32).toString("hex") };
    const gm = await createIdentity(db,config).bootstrap("Editorprüfung"), campaign = await createCampaigns(db).createCampaign(gm.userId,{ name: "Kartografieprüfung" });
    const image = await sharp({ create: { width: 200, height: 200, channels: 4, background: { r: 208, g: 218, b: 183, alpha: 1 } } }).png().toBuffer();
    const document: TacticalMapDocumentV1 = { schemaVersion: 1, kind: "tactical-map", coordinates: "image-pixels", frame: { ursprung: [0,0], einheitenProPixel: 1, ordnung: "xy", hoch: "unten" },
      geometry: { v: 3, size: [200,200], stamps: [], places: [], regions: [{ id: "street", punkte: [[0,0],[20,0],[20,200],[0,200]] }] },
      grid: { kind: "none" }, elevation: 0, geometryElevation: [], walls: [], portals: [], lights: [], environment: { bakedLighting: false, ambientLightArgb: "ffffffff" },
      background: { sha256: createHash("sha256").update(image).digest("hex"), mimeType: "image/png", width: 200, height: 200 } };
    const cartography: TacticalCartographyV1 = { schemaVersion: 1, kind: "tactical-cartography", construction: { cellSize: 20, origin: [0,0] },
      regions: [{ regionId: "street", role: "road", material: "street", authored: false, locked: false, provenance: null }] };
    const tactical = createTactical(db,config), imported = await tactical.importMap(gm.userId,campaign.id,{ commandId: randomUUID(), name: "Werkzeugprüfung", format: "native", sourceText: serializeTacticalMapDocument(document), imageBase64: image.toString("base64"),
      provenance: { name: "Test fixture", creator: "Tests", sourceUrl: null, license: "CC0-1.0", licenseUrl: null, retrievedAt: null, generator: null, generatorVersion: null } }, { cartography, nodes: [] });
    const mapPath = `/api/campaigns/${campaign.id}/tactical/maps/${imported.subjectId}`, childPath = `/api/campaigns/${campaign.id}/maps/tactical/${imported.subjectId}/children`;
    const compiled = await editorBundle(campaign.id,imported.subjectId), js = compiled.outputFiles!.find(file => file.path.endsWith(".js"))!.text, css = compiled.outputFiles!.find(file => file.path.endsWith(".css"))!.text;
    const staticRoot = await mkdtemp(resolve(".local/map-editor-test-host-")); await mkdir(join(staticRoot,"assets"));
    await Promise.all([writeFile(join(staticRoot,"editor-check.js"),js),writeFile(join(staticRoot,"editor-check.css"),css),
      writeFile(join(staticRoot,"index.html"),'<!doctype html><html lang="de"><head><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="/editor-check.css"></head><body><main id="root"></main><script type="module" src="/editor-check.js"></script></body></html>')]);
    app = await buildApp(db,{ ...config, staticRoot }); await app.listen({ host: "127.0.0.1", port });
    context = await browser.newContext(); await context.addCookies([{ name: "chronicle_session", value: gm.value, url: origin, httpOnly: true, sameSite: "Strict" }]);
    const page = await context.newPage(), errors: string[] = []; page.on("pageerror",error => errors.push(error.message));
    let releaseChildren!: () => void; const heldChildren = new Promise<void>(resolve => { releaseChildren = resolve; });
    releasePending = releaseChildren;
    await page.route(`${origin}${childPath}`, async route => { await heldChildren; await route.continue(); });
    let failTiles = true;
    await page.route(`${origin}${mapPath}/tiles/**`, async route => { expect(new URL(route.request().url()).searchParams.get("layer")).toBe("background"); if (failTiles) { await route.fulfill({ status: 503, body: "temporary" }); } else await route.continue(); });
    const initialResponse = await page.request.get(`${origin}${mapPath}`, { timeout: 10_000 }); expect(initialResponse.status()).toBe(200);
    await page.goto(origin); await expect(canvas(page), errors.join("; ")).toBeVisible();
    await clickMap(page,10,60);
    await expect(page.getByRole("button",{ name: "Kartenrevision speichern", exact: true })).toBeDisabled();
    await expect(page.getByRole("button",{ name: "Auswahl entfernen", exact: true })).toBeDisabled();
    releaseChildren(); await page.unroute(`${origin}${childPath}`);
    await expect(page.getByRole("button",{ name: "Auswahl entfernen", exact: true })).toBeEnabled();
    await expect(page.getByRole("button",{ name: "Kacheln erneut laden", exact: true })).toBeVisible();
    await page.getByRole("button",{ name: "Kacheln erneut laden", exact: true }).click(); failTiles = false;
    await expect(page.getByText("Die Kartenberechtigung wurde entzogen.",{ exact: false })).toHaveCount(0);
    await expect(page.getByRole("button",{ name: "Kacheln erneut laden", exact: true })).toHaveCount(0);
    await page.getByRole("button",{ name: "Gelände", exact: true }).click();
    await page.getByLabel("Material",{ exact: true }).selectOption("forest");
    await clickMap(page,150,150); await expect(page.getByRole("button",{ name: "Vorschau übernehmen", exact: true })).toBeEnabled();
    await page.getByRole("button",{ name: "Vorschau übernehmen", exact: true }).click();
    await expect(page.getByRole("button",{ name: "Rückgängig", exact: true })).toBeEnabled();
    await page.getByRole("button",{ name: "Straßen", exact: true }).click();
    await dragMap(page,[10,110],[100,110]);
    await expect(page.getByRole("button",{ name: "Vorschau übernehmen", exact: true })).toBeEnabled();
    await page.getByRole("button",{ name: "Vorschau übernehmen", exact: true }).click();
    await page.getByRole("button",{ name: "Gebäude", exact: true }).click();
    await page.getByLabel("Gebäudename",{ exact: true }).fill("Haus am Weg");
    await clickMap(page,45,60); await expect(page.getByRole("button",{ name: "Vorschau übernehmen", exact: true })).toBeEnabled();
    await page.getByRole("button",{ name: "Vorschau übernehmen", exact: true }).click();
    await page.getByRole("button",{ name: "Auswählen", exact: true }).click();
    await dragMap(page,[45,60],[45,70]);
    await expect(page.getByRole("button",{ name: "Vorschau übernehmen", exact: true })).toHaveCount(0);
    await page.getByRole("button",{ name: "Auswahl drehen", exact: true }).click();
    await expect(page.getByRole("button",{ name: "Vorschau übernehmen", exact: true })).toBeEnabled();
    await page.getByRole("button",{ name: "Vorschau übernehmen", exact: true }).click();
    await canvas(page).focus(); await page.keyboard.press("Control+z"); await page.keyboard.press("Control+Shift+z");
    let putCount = 0, failReload = true;
    page.on("request",request => { if (request.url().endsWith(`${mapPath}/revision`) && request.method() === "PUT") putCount++; });
    await page.route(`${origin}${mapPath}`, async route => { if (putCount && failReload) { failReload = false; await route.fulfill({ status: 503, contentType: "application/json", body: JSON.stringify({ error: "Test: Nachladen ausgefallen" }) }); } else await route.continue(); });
    await page.getByRole("button",{ name: "Kartenrevision speichern", exact: true }).click();
    await expect(page.getByRole("status").filter({ hasText: "Gespeichert, Nachladen ausstehend" })).toBeVisible();
    await page.getByRole("button",{ name: "Gespeicherte Karte nachladen", exact: true }).click();
    await expect(page.getByRole("status").filter({ hasText: "Alle Änderungen gespeichert" })).toBeVisible(); expect(putCount).toBe(1);
    const saved = await tactical.getMap(gm.userId,campaign.id,imported.subjectId);
    expect(saved.cartography!.regions.some(region => region.role === "terrain" && region.material === "forest")).toBe(true);
    expect(saved.cartography!.regions.filter(region => region.role === "building")).toHaveLength(1);
    expect(saved.cartography!.regions.filter(region => region.role === "road").length).toBeGreaterThan(1);
    const house = saved.document.geometry.regions.find(region => region.id === saved.cartography!.regions.find(region => region.role === "building")!.regionId)!;
    expect(house.punkte.reduce((sum, point) => sum + point[1],0) / house.punkte.length).toBeCloseTo(70,0);
    const xs = house.punkte.map(point => point[0]), ys = house.punkte.map(point => point[1]);
    expect(Math.max(...ys)-Math.min(...ys)).toBeGreaterThan(Math.max(...xs)-Math.min(...xs));
    // A deliberate adoption supersedes the still-pending GET from an older successful PUT.
    await page.unroute(`${origin}${mapPath}`);
    let releaseSaved!: () => void, caughtSaved!: () => void;
    const savedHeld = new Promise<void>(resolve => { releaseSaved = resolve; });
    const savedCaught = new Promise<void>(resolve => { caughtSaved = resolve; });
    releasePending = releaseSaved;
    let holdNext = true;
    await page.route(`${origin}${mapPath}`,async route => {
      if (!holdNext) { await route.continue(); return; }
      holdNext = false; const response = await route.fetch(); caughtSaved(); await savedHeld; await route.fulfill({ response });
    });
    await page.getByText("Raster, Maßstab & Export",{ exact: true }).click();
    await page.getByLabel("Grundhöhe",{ exact: true }).fill("1");
    await page.getByRole("button",{ name: "Kartenrevision speichern", exact: true }).click(); await savedCaught;
    await expect(page.getByRole("status").filter({ hasText: "Gespeichert, Nachladen ausstehend" })).toBeVisible();
    const intermediate = await tactical.getMap(gm.userId,campaign.id,imported.subjectId);
    await tactical.reviseMap(gm.userId,campaign.id,imported.subjectId,{ schemaVersion: 2, commandId: randomUUID(), expectedVersion: intermediate.version,
      document: { ...intermediate.document, elevation: 99 }, cartography: intermediate.cartography, anchors: intermediate.anchors, addedBuildings: [] });
    await page.evaluate(() => (window as unknown as { reloadEditor: () => Promise<void> }).reloadEditor());
    page.once("dialog",dialog => void dialog.accept());
    await page.getByRole("button",{ name: "Aktuelle Karte übernehmen", exact: true }).click();
    await expect(page.getByLabel("Grundhöhe",{ exact: true })).toHaveValue("99");
    releaseSaved();
    await expect.poll(() => page.evaluate(() => (window as unknown as { editorDirty: boolean }).editorDirty)).toBe(false);
    await expect(page.getByRole("button",{ name: "Kartenrevision speichern", exact: true })).toBeDisabled();
    await expect(page.getByRole("status").filter({ hasText: "Alle Änderungen gespeichert" })).toBeVisible();
    await expect(page.getByLabel("Grundhöhe",{ exact: true })).toHaveValue("99");
    expect(putCount).toBe(2);
    await page.getByText("Raster, Maßstab & Export",{ exact: true }).click();
    await expect(page.getByLabel("Grundhöhe",{ exact: true })).toBeHidden();
    expect(await page.locator('.map-editor-section[open]').count()).toBe(0);
    await page.screenshot({ path: info.outputPath("editor-desktop.png"), fullPage: true });
    await page.setViewportSize({ width: 390, height: 844 });
    await expect(canvas(page)).toBeVisible(); await expect(page.getByRole("button",{ name: "Kartenrevision speichern", exact: true })).toBeVisible();
    await page.getByRole("button",{ name: "Werkzeuge & Details", exact: true }).click(); await expect(page.getByRole("button",{ name: "Gelände", exact: true })).toBeVisible(); await expect(canvas(page)).toBeHidden();
    await page.screenshot({ path: info.outputPath("editor-mobile-tools.png"), fullPage: true });
    await page.getByRole("button",{ name: "Karte", exact: true }).click(); await expect(canvas(page)).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    await page.screenshot({ path: info.outputPath("editor-mobile-map.png"), fullPage: true });
    expect(errors).toEqual([]);
  } finally { releasePending(); await context?.close(); await app?.close(); await db?.close(); }
});

test("generated settlement gallery, typed interior and legacy image in the actual editor", async ({ browser }, info) => {
  test.setTimeout(360_000);
  let db: Db | undefined, app: Awaited<ReturnType<typeof buildApp>> | undefined, context: BrowserContext | undefined;
  try {
    db = await createTestDb(); await migrate(db);
    const port = 9850 + Math.floor(Math.random()*70), origin = `http://localhost:${port}`;
    const config = { origin, cookieSecret: randomBytes(32).toString("hex"), bootstrapToken: randomBytes(32).toString("hex") };
    const gm = await createIdentity(db,config).bootstrap("Galerieprüfung"), campaign = await createCampaigns(db).createCampaign(gm.userId,{ name: "Siedlungsgalerie" });
    const compiled = await editorBundle(campaign.id,""), staticRoot = await mkdtemp(resolve(".local/map-editor-gallery-host-")); await mkdir(join(staticRoot,"assets"));
    await Promise.all([writeFile(join(staticRoot,"editor-check.js"),compiled.outputFiles!.find(file => file.path.endsWith(".js"))!.text),
      writeFile(join(staticRoot,"editor-check.css"),compiled.outputFiles!.find(file => file.path.endsWith(".css"))!.text),
      writeFile(join(staticRoot,"index.html"),'<!doctype html><html lang="de"><head><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="/editor-check.css"></head><body><main id="root"></main><script type="module" src="/editor-check.js"></script></body></html>')]);
    app = await buildApp(db,{ ...config, staticRoot }); await app.listen({ host: "127.0.0.1", port });
    context = await browser.newContext(); await context.addCookies([{ name: "chronicle_session", value: gm.value, url: origin, httpOnly: true, sameSite: "Strict" }]);
    const page = await context.newPage(), errors: string[] = [], failedAssets = new Set<string>();
    page.on("pageerror",error => errors.push(error.message));
    page.on("response",response => { if (/\/api\/packs\/[^/]+\/asset\//.test(response.url()) && !response.ok()) failedAssets.add(response.url()); });
    const base = `${origin}/api/campaigns/${campaign.id}`;
    // A local art-direction repair can be inspected on its fixed city seed without rerunning the whole gallery.
    const cityDetailOnly = process.env.ATLAS_MAP_GALLERY_SCOPE === "walled-city";
    const cases = (["weiler","dorf","stadt"] as const).flatMap(art => ["gallery:river-1","gallery:orchard-2","gallery:gate-3"].map((keim,index) => ({ art, keim, setting: "fantasy", stil: "grundriss", file: `${art}-${index+1}` })))
      .concat(["gegenwart","scifi"].map(setting => ({ art: "dorf" as const, keim: "gallery:river-1", setting, stil: "zeitwelten", file: `dorf-${setting}` }))).filter(item=>!cityDetailOnly || item.file === "stadt-1");
    const ledger: { file: string; id: string; seed?: string; setting?: string; size: readonly number[]; regions: number; stamps: number; walls:number; buildings:number }[] = [];
    let cityId = "", city: TacticalMapCard | undefined;
    const open = async (id: string) => {
      await page.goto(`${origin}/?map=${id}`); await expect(canvas(page),errors.join("; ")).toBeVisible();
      await page.getByRole("button",{ name: "Ganze Karte", exact: true }).click(); await page.waitForLoadState("networkidle");
      await expect(page.getByText("Ein Teil der Kartenobjekte konnte nicht gezeichnet werden.",{ exact: false })).toHaveCount(0);
      await expect(page.getByRole("status").filter({ hasText: "Alle Änderungen gespeichert" })).toBeVisible();
    };
    for (const item of cases) {
      const response = await page.request.post(`${base}/tactical/generate`,{ headers: { origin }, data: { commandId: randomUUID(), name: `${item.art} · ${item.setting} · ${item.keim}`, keim: item.keim, art: "siedlung", stil: item.stil, optionen: { art: item.art, setting: item.setting } } });
      expect(response.ok(),await response.text()).toBe(true); const id = (await response.json()).ack.subjectId;
      const map = await (await page.request.get(`${base}/tactical/maps/${id}`)).json() as TacticalMapCard;
      expect(map.cartography?.regions.some(region => region.role === "building")).toBe(true);
      await open(id);
      ledger.push({ file: item.file, id, seed: item.keim, setting: item.setting, size: map.document.geometry.size, regions: map.document.geometry.regions.length, stamps: map.document.geometry.stamps.length,
        walls:map.document.walls.length,buildings:map.cartography!.regions.filter(region=>region.role==="building").length });
      await canvas(page).screenshot({ path: info.outputPath(`${item.file}-map.png`) });
      await page.screenshot({ path: info.outputPath(`${item.file}-editor.png`), fullPage: true });
      if (item.file === "stadt-1") {
        cityId = id; city = map;
        expect(map.document.walls.length).toBeGreaterThan(0); expect(cartographyPaintsWalls(map.cartography!,map.document)).toBe(true);
        expect(cartographyDraw(map.document,map.cartography!).polygons.some(polygon=>map.document.walls.some(wall=>wall.id===polygon.regionId))).toBe(true);
      }
    }
    await open(cityId);
    const children = await (await page.request.get(`${base}/maps/tactical/${cityId}/children`)).json();
    const selected = children.nodes.find((node: { bauwerk?: { typ: string } }) => node.bauwerk?.typ === "haus"); expect(selected).toBeTruthy();
    await page.getByText("Wissensregionen & Verknüpfungen",{ exact: true }).click();
    await page.getByLabel("Region auswählen",{ exact: true }).selectOption(selected.knotenId);
    await page.getByText("Wissensregionen & Verknüpfungen",{ exact: true }).click();
    await page.getByRole("button",{ name: "Karte vergrößern", exact: true }).click({ clickCount: 4 });
    await canvas(page).screenshot({ path: info.outputPath("stadt-1-detail-map.png") });
    await page.screenshot({ path: info.outputPath("stadt-1-detail-editor.png"), fullPage: true });
    if (cityDetailOnly) {
      await writeFile(info.outputPath("gallery-ledger.json"),JSON.stringify({rendererVersion,scope:"walled-city",maps:ledger,failedAssets:[...failedAssets],pageErrors:errors},null,2));
      expect([...failedAssets]).toEqual([]); expect(errors).toEqual([]); return;
    }
    await page.setViewportSize({ width: 390, height: 844 });
    await page.getByRole("button",{ name: "Ganze Karte", exact: true }).click();
    await page.screenshot({ path: info.outputPath("stadt-1-mobile-map.png"), fullPage: true });
    await page.getByRole("button",{ name: "Werkzeuge & Details", exact: true }).click();
    await expect(canvas(page)).toBeHidden();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    await page.screenshot({ path: info.outputPath("stadt-1-mobile-tools.png"), fullPage: true });
    await page.setViewportSize({ width: 1440, height: 960 });
    const entry = await page.request.post(`${base}/betreten`,{ headers: { origin }, data: { commandId: randomUUID(), knotenId: selected.knotenId, parentKind: "tactical", parentMapId: cityId, expectedVersion: city!.version } });
    expect(entry.ok(),await entry.text()).toBe(true); const childId = (await entry.json()).mapId;
    await open(childId);
    await page.screenshot({ path: info.outputPath("house-interior-editor.png"), fullPage: true });
    // The same house remains protected after its interior exists.
    await open(cityId);
    await page.getByText("Wissensregionen & Verknüpfungen",{ exact: true }).click();
    await page.getByLabel("Region auswählen",{ exact: true }).selectOption(selected.knotenId);
    await expect(page.getByRole("button",{ name: "Auswahl entfernen", exact: true })).toBeDisabled();
    await expect(page.getByRole("button",{ name: "Auswahl drehen", exact: true })).toBeEnabled();
    expect((await (await page.request.get(`${base}/maps/tactical/${cityId}/children`)).json()).nodes.find((node: { knotenId: string }) => node.knotenId === selected.knotenId).vorhandeneKarteId).toBe(childId);
    const image = await sharp({ create: { width: 400, height: 300, channels: 4, background: { r: 137, g: 169, b: 132, alpha: 1 } } }).png().toBuffer();
    const legacy = { ...city!.document, geometry: { v: 3 as const, size: [400,300] as const, stamps: [], places: [], regions: [{ id: "old-knowledge", punkte: [[80,70],[320,70],[320,230],[80,230]] as const }] }, walls: [], lights: [], portals: [], geometryElevation: [],
      background: { sha256: createHash("sha256").update(image).digest("hex"), mimeType: "image/png" as const, width: 400, height: 300 } };
    const imported = await createTactical(db,config).importMap(gm.userId,campaign.id,{ commandId: randomUUID(), name: "Importkarte mit privater Wissensregion", format: "native", sourceText: serializeTacticalMapDocument(legacy), imageBase64: image.toString("base64"),
      provenance: { name: "Legacy fixture", creator: "Tests", sourceUrl: null, license: "CC0-1.0", licenseUrl: null, retrievedAt: null, generator: null, generatorVersion: null } });
    await open(imported.subjectId); await page.screenshot({ path: info.outputPath("legacy-image-editor.png"), fullPage: true });
    await writeFile(info.outputPath("gallery-ledger.json"),JSON.stringify({ rendererVersion,maps: ledger, failedAssets: [...failedAssets], pageErrors: errors },null,2));
    expect([...failedAssets]).toEqual([]); expect(errors).toEqual([]);
  } finally { await context?.close(); await app?.close(); await db?.close(); }
});
