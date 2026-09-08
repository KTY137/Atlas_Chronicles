// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2026 Kaya Yesilyurt - Atlas Chronicles. Siehe LICENSE.
import { test, expect, type BrowserContext } from "@playwright/test";
import { build } from "esbuild";
import { randomBytes, randomUUID } from "node:crypto";
import { mkdir, mkdtemp, readFile, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import type { MapDeleteInput, MapDeletionPreview, TacticalMapCard } from "@chronicle/protocol";
import { cartographyDraw, cartographyPaintsWalls, rendererVersion } from "@chronicle/szene";
import { buildApp } from "../packages/server/src/app.ts";
import { createTestDb, migrate, type Db } from "../packages/server/src/db/index.ts";
import { createIdentity } from "../packages/server/src/identity/index.ts";
import { createCampaigns } from "../packages/server/src/domain/campaigns.ts";
import { createGameplay } from "../packages/server/src/domain/gameplay.ts";
import { createTactical } from "../packages/server/src/domain/tactical.ts";
import { fitCamera, hitTestMap } from "../packages/render/src/geometry.ts";
import { mapDocumentScene } from "../packages/client/src/features/map-generation.ts";

test("real canvas child deletion: blockers, reviewed cascade, conflict reload and parent navigation", async ({ browser },info) => {
  test.setTimeout(240_000);
  let db: Db | undefined, app: Awaited<ReturnType<typeof buildApp>> | undefined, context: BrowserContext | undefined;
  try {
    db=await createTestDb(); await migrate(db);
    const port=10010+Math.floor(Math.random()*80), origin=`http://localhost:${port}`;
    const config={ origin,cookieSecret:randomBytes(32).toString("hex"),bootstrapToken:randomBytes(32).toString("hex") };
    const gm=await createIdentity(db,config).bootstrap("Kartenprüfung"), campaign=await createCampaigns(db).createCampaign(gm.userId,{name:"Karten und Innenräume"});
    const compiled=await build({stdin:{resolveDir:process.cwd(),loader:"tsx",contents:`
      import { useState } from 'react'; import { createRoot } from 'react-dom/client';
      import { AppearanceProvider } from './packages/client/src/features/Appearance.tsx';
      import { AtlasView } from './packages/client/src/features/AtlasView.tsx';
      import { TacticalPreparation } from './packages/client/src/features/TacticalPreparation.tsx';
      import '@chronicle/ui/tokens.css'; import './packages/client/src/styles.css';
      const dirty=value=>{window.mapDirty=value};
      function Host(){const [revision,setRevision]=useState(0); return <AppearanceProvider>{new URLSearchParams(location.search).has('workshop')
        ? <TacticalPreparation campaignId='${campaign.id}' revision={revision} onChanged={()=>setRevision(v=>v+1)} onDirty={dirty}/>
        : <AtlasView campaignId='${campaign.id}' role='leitung' onOpenEntry={()=>{}} onDirty={dirty}/>}</AppearanceProvider>}
      createRoot(document.querySelector('#root')).render(<Host/>);
    `},bundle:true,format:"esm",platform:"browser",target:"es2022",jsx:"automatic",write:false,outdir:".local/map-delete-memory",logLevel:"silent",
      define:{"process.env.NODE_ENV":'"production"'},loader:{".svg":"dataurl",".webp":"dataurl",".png":"dataurl",".woff2":"dataurl"}});
    const staticRoot=await mkdtemp(resolve(".local/map-delete-host-")); await mkdir(join(staticRoot,"assets"));
    await Promise.all([writeFile(join(staticRoot,"check.js"),compiled.outputFiles!.find(f=>f.path.endsWith(".js"))!.text),writeFile(join(staticRoot,"check.css"),compiled.outputFiles!.find(f=>f.path.endsWith(".css"))!.text),
      writeFile(join(staticRoot,"index.html"),'<!doctype html><html lang="de"><head><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="/check.css"></head><body><main id="root"></main><script type="module" src="/check.js"></script></body></html>')]);
    app=await buildApp(db,{...config,staticRoot}); await app.listen({host:"127.0.0.1",port});
    context=await browser.newContext(); await context.addCookies([{name:"chronicle_session",value:gm.value,url:origin,httpOnly:true,sameSite:"Strict"}]);
    const page=await context.newPage(), errors:string[]=[]; page.on("pageerror",e=>errors.push(e.message));
    const base=`${origin}/api/campaigns/${campaign.id}`;
    const post=async (path:string,data:unknown) => { const response=await page.request.post(`${base}${path}`,{headers:{origin},data}); expect(response.ok(),await response.text()).toBe(true); return response.json(); };
    const get=async (path:string) => { const response=await page.request.get(`${base}${path}`); expect(response.ok(),await response.text()).toBe(true); return response.json(); };
    const source=JSON.parse(await readFile(resolve("design/fixtures/eron/map-andaria.json"),"utf8")); source.mapImage="Lifecycle fixture.jpg";
    const world=(await post("/maps/import",{json:JSON.stringify(source)})).id;
    const worldCard=await get(`/maps/${world}`), town=worldCard.nodes.find((n:{title:string})=>n.title==="Akkator");
    const city=(await post("/tactical/generate",{commandId:randomUUID(),name:"Akkator mit Stadtmauer",keim:"gallery:river-1",art:"siedlung",stil:"grundriss",optionen:{art:"stadt",setting:"fantasy"}})).ack.subjectId;
    await post("/betreten",{commandId:randomUUID(),parentKind:"atlas",parentMapId:world,knotenId:town.id,expectedVersion:worldCard.version,targetMapId:city});
    const cityCard=await get(`/tactical/maps/${city}`) as TacticalMapCard;
    expect(cityCard.document.walls.length).toBeGreaterThan(0); expect(cartographyPaintsWalls(cityCard.cartography!,cityCard.document)).toBe(true);
    const drawing=cartographyDraw(cityCard.document,cityCard.cartography!);
    expect(drawing.polygons.some(p=>cityCard.document.walls.some(w=>w.id===p.regionId))).toBe(true);
    let cityChildren=await get(`/maps/tactical/${city}/children`);
    const house=cityChildren.nodes.find((n:{bauwerk?:{typ:string}})=>n.bauwerk?.typ==="haus"); expect(house).toBeTruthy();
    const child=(await post("/betreten",{commandId:randomUUID(),parentKind:"tactical",parentMapId:city,knotenId:house.knotenId,expectedVersion:cityChildren.version,name:"Innenraum am Stadttor"})).mapId;
    const rooms=await get(`/maps/tactical/${child}/children`), room=rooms.nodes.find((n:{canEnter:boolean})=>n.canEnter); expect(room).toBeTruthy();
    const grandchild=(await post("/betreten",{commandId:randomUUID(),parentKind:"tactical",parentMapId:child,knotenId:room.knotenId,expectedVersion:rooms.version,name:"Keller unter dem Stadttor"})).mapId;
    const game=createGameplay(db,config), tactical=createTactical(db,config), planned=await game.createScene(gm.userId,campaign.id,{name:"Treffen im Stadttor",entryIds:[],fictionDate:"1. Erntemond"});
    await tactical.savePlan(gm.userId,campaign.id,planned.id,{commandId:randomUUID(),expectedVersion:0,mapId:grandchild,mapRevision:1,tokens:[]});
    await game.startScene(gm.userId,campaign.id,planned.id);
    const deletes:{target:string;body:MapDeleteInput}[]=[];
    page.on("request",r=>{if(r.method()==="POST"&&r.url().endsWith("/delete")) deletes.push({target:r.url(),body:r.postDataJSON()});});
    const canvas=page.locator('.nested-map-stage .tactical-canvas[data-canvas-ready="true"] canvas');
    const openCity=async()=>{await page.goto(`${origin}/?atlasMap=${world}&atlasChild=${city}`);await expect(canvas).toBeVisible();await page.getByRole("button",{name:"Ganze Karte",exact:true}).click();};
    const rightClickHouse=async(target=canvas)=>{
      await target.scrollIntoViewIfNeeded(); const bounds=(await target.boundingBox())!, camera=fitCamera(cityCard.document.geometry.size,[bounds.width,bounds.height]);
      await page.mouse.click(bounds.x+camera.x+house.x*camera.scale,bounds.y+camera.y+house.y*camera.scale,{button:"right"});
      await expect(page.getByRole("menu")).toContainText(house.titel);
      await expect(page.getByRole("menuitem",{name:"Unterkarte löschen …",exact:true})).toBeVisible();
    };
    await openCity(); await page.getByRole("button",{name:"Karte bearbeiten",exact:true}).click();
    const cityEditor=page.locator('.map-editor-stage .tactical-canvas[data-canvas-ready="true"] canvas'); await expect(cityEditor).toBeVisible();
    await page.getByRole("button",{name:"Ganze Karte",exact:true}).click(); await rightClickHouse(cityEditor); await page.keyboard.press("Escape");
    await page.getByRole("button",{name:"Karte ansehen",exact:true}).click(); await expect(canvas).toBeVisible(); await page.getByRole("button",{name:"Ganze Karte",exact:true}).click();
    const projected=mapDocumentScene(city,cityCard.document,cityChildren.nodes,"siedlung",undefined,"fantasy",cityCard.cartography);
    const water=cityCard.cartography!.regions.filter(region=>region.role==="water").map(region=>{
      const polygon=cityCard.document.geometry.regions.find(r=>r.id===region.regionId)!.punkte;
      return [polygon.reduce((sum,p)=>sum+p[0],0)/polygon.length,polygon.reduce((sum,p)=>sum+p[1],0)/polygon.length] as const;
    }).find(point=>{const hit=hitTestMap(projected,{x:0,y:0,scale:1},point);return hit?.kind==="cell"&&cityCard.cartography!.regions.find(r=>r.regionId===hit.id)?.role==="water";});
    expect(water).toBeTruthy(); await canvas.scrollIntoViewIfNeeded();
    const backgroundBounds=(await canvas.boundingBox())!, backgroundCamera=fitCamera(cityCard.document.geometry.size,[backgroundBounds.width,backgroundBounds.height]);
    await page.mouse.click(backgroundBounds.x+backgroundCamera.x+water![0]*backgroundCamera.scale,backgroundBounds.y+backgroundCamera.y+water![1]*backgroundCamera.scale,{button:"right"});
    await expect(page.getByRole("menu")).toContainText("Akkator mit Stadtmauer");
    await expect(page.getByRole("menuitem",{name:"Karte löschen …",exact:true})).toBeVisible();
    await expect(page.getByRole("menuitem",{name:"Unterkarte löschen …",exact:true})).toHaveCount(0); await page.keyboard.press("Escape");
    // A full-page screenshot temporarily resizes the viewport; a pointer menu correctly dismisses on resize.
    await rightClickHouse(); await page.screenshot({path:info.outputPath("walled-city-roof-context.png")});
    await page.getByRole("menuitem",{name:"Unterkarte löschen …",exact:true}).click();
    const dialog=page.getByRole("dialog",{name:"Karte löschen",exact:true}), confirm=dialog.getByRole("button",{name:"2 Karten löschen",exact:true});
    await expect(dialog).toContainText("Innenraum am Stadttor"); await expect(dialog).toContainText("Keller unter dem Stadttor");
    await expect(dialog).toContainText("laufenden Szenen"); await expect(confirm).toBeDisabled(); expect(deletes).toHaveLength(0);
    await page.screenshot({path:info.outputPath("deletion-active-blocker.png"),fullPage:true});
    const next=await game.createScene(gm.userId,campaign.id,{name:"Weiterreise ohne Karte",entryIds:[],fictionDate:"1. Erntemond"}); await game.startScene(gm.userId,campaign.id,next.id);
    await dialog.getByRole("button",{name:"Löschvorschau neu laden",exact:true}).click(); await expect(confirm).toBeEnabled();
    const before=await get(`/maps/tactical/${child}/deletion-preview`) as MapDeletionPreview;
    const descendant=await get(`/tactical/maps/${grandchild}`) as TacticalMapCard;
    const changed=await page.request.put(`${base}/tactical/maps/${grandchild}/revision`,{headers:{origin},data:{commandId:randomUUID(),expectedVersion:descendant.version,schemaVersion:2,
      document:{...descendant.document,elevation:1},anchors:descendant.anchors,cartography:descendant.cartography,addedBuildings:[]}});
    expect(changed.ok(),await changed.text()).toBe(true);
    await confirm.click(); await expect(dialog).toContainText("haben sich geändert"); await expect(confirm).toBeDisabled(); expect(deletes).toHaveLength(1);
    expect(deletes[0]!.target).toBe(`${base}/maps/tactical/${child}/delete`);
    expect(deletes[0]!.body.confirmedMapIds).toEqual(before.maps.map(m=>`${m.kind}:${m.id}`).sort());
    await page.screenshot({path:info.outputPath("deletion-conflict-review.png"),fullPage:true});
    await dialog.getByRole("button",{name:"Löschvorschau neu laden",exact:true}).click(); await expect(confirm).toBeEnabled(); expect(deletes).toHaveLength(1);
    await confirm.click(); await expect(dialog).toHaveCount(0); expect(deletes).toHaveLength(2);
    expect(new URL(page.url()).searchParams.get("atlasChild")).toBe(city);
    await expect.poll(async()=>(await get(`/maps/tactical/${city}/children`)).nodes.find((n:{knotenId:string})=>n.knotenId===house.knotenId).vorhandeneKarteId).toBeNull();
    expect((await page.request.get(`${base}/tactical/maps/${child}`)).status()).toBe(404);
    expect((await page.request.get(`${base}/tactical/maps/${grandchild}`)).status()).toBe(404);
    expect((await tactical.getPlan(gm.userId,campaign.id,planned.id)).unavailable).toBe("map-deleted");
    await page.reload(); await expect(canvas).toBeVisible();
    await page.locator('.nested-building-list').getByRole("button",{name:new RegExp(`^${house.titel}`)}).first().click();
    await expect(page.getByRole("button",{name:"Unterkarte erzeugen",exact:true})).toBeEnabled();
    await page.getByRole("button",{name:"Unterkarte erzeugen",exact:true}).click();
    await expect.poll(()=>new URL(page.url()).searchParams.get("atlasChild")).not.toBe(city);
    const replacement=new URL(page.url()).searchParams.get("atlasChild")!; expect(replacement).not.toBe(child);
    await expect(page.locator('.nested-map-view h1')).toBeVisible();
    await page.locator('.nested-card-actions .map-context-trigger').click(); await page.getByRole("menuitem",{name:"Karte löschen …",exact:true}).click();
    await expect(dialog.getByRole("button",{name:"Karte endgültig löschen",exact:true})).toBeEnabled();
    await dialog.getByRole("button",{name:"Karte endgültig löschen",exact:true}).click(); await expect(dialog).toHaveCount(0);
    await expect.poll(()=>new URL(page.url()).searchParams.get("atlasChild")).toBe(city); await expect(canvas).toBeVisible();
    await page.setViewportSize({width:390,height:844});
    await page.getByRole("button",{name:"Hauptkarte",exact:true}).click(); await expect(page.locator('.atlas-render-host canvas')).toBeVisible();
    const library=page.getByRole("region",{name:"Kartenbibliothek",exact:true}); await library.getByRole("button",{name:`Aktionen für ${worldCard.title}`,exact:true}).click();
    await page.getByRole("menuitem",{name:"Karte löschen …",exact:true}).click(); await expect(confirm).toBeEnabled();
    await expect(dialog).toContainText("Akkator mit Stadtmauer"); expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
    await page.screenshot({path:info.outputPath("world-cascade-mobile.png"),fullPage:true});
    await confirm.click(); await expect(dialog).toHaveCount(0); await expect(library.locator('.map-library-row')).toHaveCount(0);
    await expect(page.locator('.atlas-render-host canvas')).toHaveCount(0);
    expect((await page.request.get(`${base}/maps/${world}`)).status()).toBe(404); expect((await page.request.get(`${base}/tactical/maps/${city}`)).status()).toBe(404);
    const standalone=(await post("/tactical/generate",{commandId:randomUUID(),name:"Entwurf in der Schmiede",keim:"lifecycle-draft-guard"})).ack.subjectId;
    await page.setViewportSize({width:1440,height:960}); await page.goto(`${origin}/?workshop`);
    await page.getByRole("button",{name:/^Kartenbibliothek/}).click();
    await page.getByRole("button",{name:"Aktionen für Entwurf in der Schmiede",exact:true}).click();
    await page.getByRole("menuitem",{name:"Karte bearbeiten",exact:true}).click();
    await page.getByText("Raster, Maßstab & Export",{exact:true}).click(); await page.getByLabel("Grundhöhe",{exact:true}).fill("14");
    await expect(page.getByRole("button",{name:"Kartenrevision speichern",exact:true})).toBeEnabled();
    const editorCanvas=page.locator('.map-editor-stage .tactical-canvas[data-canvas-ready="true"] canvas');
    await page.evaluate(()=>{
      const events:unknown[]=[]; (window as unknown as {menuEvents:unknown[]}).menuEvents=events;
      for(const name of ['keydown','contextmenu','scroll','focusin','resize']) document.addEventListener(name,event=>events.push({type:event.type,target:(event.target as HTMLElement)?.className,key:(event as KeyboardEvent).key,x:(event as MouseEvent).clientX,y:(event as MouseEvent).clientY}),true);
      new MutationObserver(()=>events.push({type:'menu',text:document.querySelector('[role=menu]')?.textContent??null})).observe(document.querySelector('.tactical-preparation')!,{childList:true});
    });
    await editorCanvas.focus(); await page.keyboard.press("Shift+F10");
    try { await expect(page.getByRole("menu")).toContainText("Entwurf in der Schmiede"); }
    finally { await writeFile(info.outputPath('keyboard-context-evidence.json'),JSON.stringify(await page.evaluate(()=>(window as unknown as {menuEvents:unknown[]}).menuEvents),null,2)); }
    page.once("dialog",dialog=>dialog.dismiss()); await page.getByRole("menuitem",{name:"Karte löschen …",exact:true}).click();
    await expect(dialog).toHaveCount(0); await expect(page.getByLabel("Grundhöhe",{exact:true})).toHaveValue("14"); expect(deletes).toHaveLength(4);
    await page.getByRole("button",{name:"Aktionen für Entwurf in der Schmiede",exact:true}).click();
    page.once("dialog",dialog=>dialog.accept()); await page.getByRole("menuitem",{name:"Karte löschen …",exact:true}).click();
    await expect(dialog).toContainText("Entwurf in der Schmiede"); await dialog.getByRole("button",{name:"Abbrechen",exact:true}).click();
    await expect(page.getByLabel("Grundhöhe",{exact:true})).toHaveValue("14"); expect(deletes).toHaveLength(4);
    await page.getByRole("button",{name:"Aktionen für Entwurf in der Schmiede",exact:true}).click();
    page.once("dialog",dialog=>dialog.accept()); await page.getByRole("menuitem",{name:"Karte löschen …",exact:true}).click();
    await dialog.getByRole("button",{name:"Karte endgültig löschen",exact:true}).click();
    await expect(dialog).toHaveCount(0); await expect(page.getByRole("region",{name:"Kartenbibliothek",exact:true}).locator('.map-library-row')).toHaveCount(0);
    await expect(editorCanvas).toHaveCount(0); expect((await page.request.get(`${base}/tactical/maps/${standalone}`)).status()).toBe(404);
    await writeFile(info.outputPath("lifecycle-evidence.json"),JSON.stringify({rendererVersion,world,city,child,grandchild,replacement,cityWalls:cityCard.document.walls.length,cityBuildings:cityCard.cartography!.regions.filter(r=>r.role==="building").length,deletes,errors},null,2));
    expect(errors).toEqual([]);
  } finally {await context?.close();await app?.close();await db?.close();}
});
