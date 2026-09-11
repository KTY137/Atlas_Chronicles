// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2026 Kaya Yesilyurt - Atlas Chronicles. Siehe LICENSE.
import { test, expect, type Page, type BrowserContext } from "@playwright/test";
import { randomUUID } from "node:crypto";
import sharp from "sharp";
import { inspectUvttImage } from "@chronicle/forge";
import { floorPointInside, type TacticalMapDocumentV1 } from "@chronicle/szene";
import { reviewApp } from "./helpers/review-app.ts";
import { createGrundriss } from "../packages/server/src/domain/grundriss.ts";
import { createTactical } from "../packages/server/src/domain/tactical.ts";
import { createMapStudio } from "../packages/server/src/domain/map-studio.ts";
import { createGameplay } from "../packages/server/src/domain/gameplay.ts";
import { createDocuments } from "../packages/server/src/domain/documents.ts";

const cmd=()=>({commandId:randomUUID()});
async function login(context:BrowserContext,origin:string,value:string){await context.addCookies([{name:"chronicle_session",value,url:origin,httpOnly:true,sameSite:"Strict"}]);}
async function openFloors(page:Page){const panel=page.getByTestId("map-floors-panel");await panel.locator("summary").first().click();return panel;}
async function canvas(page:Page){await expect(page.locator('.tactical-canvas[data-canvas-ready="true"]')).toHaveCount(1);}

// Real built client, authenticated HTTP and isolated DB. No API or renderer mocks.
test("upper floor and basement remain aligned, independently editable and reopen through stairs",async({browser},info)=>{
  const host=await reviewApp(12110+Math.floor(Math.random()*70)),context=await browser.newContext({locale:"de-DE"});
  try{
    await login(context,host.origin,host.gm.value);
    const generated=await createGrundriss(host.db).generate(host.gm.userId,host.campaign.id,{...cmd(),art:"grundriss",stil:"gemalt",name:"Dreigeschossiges Haus",keim:"floor-browser",optionen:{profil:"haus",zellen:[24,20]}});
    const rootId=generated.ack.subjectId,tactical=createTactical(host.db),rootBefore=await tactical.getMap(host.gm.userId,host.campaign.id,rootId);
    const page=await context.newPage(),errors:string[]=[];page.on("pageerror",e=>errors.push(e.message));page.on("dialog",d=>d.accept());
    await page.goto(`${host.origin}/?campaign=${host.campaign.id}&stage=atlas&atlasChild=${rootId}`);await canvas(page);
    let panel=await openFloors(page);
    await panel.getByLabel("Name des neuen Geschosses",{exact:true}).fill("Obergeschoss");
    await panel.getByLabel("Geschossnummer",{exact:true}).fill("1");
    await expect(panel.getByLabel("Treppenraum im aktuellen Geschoss",{exact:true}).locator("option")).not.toHaveCount(0);
    const creating=page.waitForResponse(r=>r.request().method()==="POST"&&r.url().endsWith("/floors")&&r.ok());
    await panel.getByRole("button",{name:"Geschoss anlegen und öffnen",exact:true}).click();const upperId=(await(await creating).json()).mapId;
    await expect.poll(()=>new URL(page.url()).searchParams.get("atlasChild")).toBe(upperId);await canvas(page);
    panel=await openFloors(page);await expect(panel.getByRole("navigation",{name:"Geschoss auswählen"}).getByRole("button")).toHaveCount(2);
    await page.screenshot({path:info.outputPath("upper-floor.png"),fullPage:true});
    const upper=await tactical.getMap(host.gm.userId,host.campaign.id,upperId),stack=(await createMapStudio(host.db).getFloors(host.gm.userId,host.campaign.id,upperId)).stack;
    const stairs=stack.links[0]!;expect(floorPointInside(stairs.position,rootBefore.document.geometry.regions.find(r=>r.id===stairs.fromRegionId)!.punkte)).toBe(true);
    expect(floorPointInside(stairs.position,upper.document.geometry.regions.find(r=>r.id===stairs.toRegionId)!.punkte)).toBe(true);
    expect(upper.anchors).toEqual([]);expect((await createMapStudio(host.db).getFog(host.gm.userId,host.campaign.id,upperId)).state.party).toEqual([]);
    await page.getByRole("button",{name:"Karte bearbeiten",exact:true}).click();
    await page.getByText("Raster, Maßstab & Export",{exact:true}).click();
    await page.getByLabel("Grundhöhe",{exact:true}).fill("4");
    await page.getByRole("button",{name:"Kartenrevision speichern",exact:true}).click();
    await expect(page.getByText(/Kartenrevision 2\./)).toBeVisible();
    await page.getByRole("button",{name:"Karte ansehen",exact:true}).click();await page.reload();await canvas(page);
    expect((await tactical.getMap(host.gm.userId,host.campaign.id,upperId)).document.elevation).toBe(4);
    expect(await tactical.getMap(host.gm.userId,host.campaign.id,rootId)).toEqual(rootBefore);
    panel=await openFloors(page);await panel.getByRole("navigation",{name:"Geschoss auswählen"}).getByRole("button",{name:/^Ebene 0/}).click();
    await expect.poll(()=>new URL(page.url()).searchParams.get("atlasChild")).toBe(rootId);await canvas(page);
    panel=await openFloors(page);await panel.getByLabel("Name des neuen Geschosses",{exact:true}).fill("Keller");await panel.getByLabel("Geschossnummer",{exact:true}).fill("-1");
    const basement=page.waitForResponse(r=>r.request().method()==="POST"&&r.url().endsWith("/floors")&&r.ok());
    await panel.getByRole("button",{name:"Geschoss anlegen und öffnen",exact:true}).click();const cellarId=(await(await basement).json()).mapId;
    await expect.poll(()=>new URL(page.url()).searchParams.get("atlasChild")).toBe(cellarId);await canvas(page);
    panel=await openFloors(page);await expect(panel.getByRole("navigation",{name:"Geschoss auswählen"}).getByRole("button")).toHaveCount(3);
    await panel.locator(".floor-links").getByRole("button",{name:/^Treppe:/}).click();
    await expect.poll(()=>new URL(page.url()).searchParams.get("atlasChild")).toBe(rootId);await canvas(page);
    await page.reload();await canvas(page);panel=await openFloors(page);await expect(panel.getByText("3 von 16 Geschossen",{exact:true})).toBeVisible();
    await page.setViewportSize({width:390,height:844});expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
    await page.screenshot({path:info.outputPath("floors-mobile.png"),fullPage:true});expect(errors).toEqual([]);
  }finally{await context.close();await host.close();}
});

test("GM reveals and hides individual rooms while player payloads and image pixels remain masked",async({browser},info)=>{
  const host=await reviewApp(12210+Math.floor(Math.random()*70));const gmContext=await browser.newContext({locale:"de-DE"}),playerContext=await browser.newContext({locale:"de-DE"});
  try{
    await login(gmContext,host.origin,host.gm.value);await login(playerContext,host.origin,host.player.value);
    const gm=await gmContext.newPage(),player=await playerContext.newPage(),errors:string[]=[];
    for(const p of[gm,player]){p.on("pageerror",e=>errors.push(e.message));p.on("dialog",d=>d.accept());}
    const docs=createDocuments(host.db),entry=await docs.saveEntry(host.gm.userId,host.campaign.id,{title:"Geheime Kammer",passages:[{inhalt:{kind:"absatz",inhalt:[{text:"UNREVEALED-LORE-SECRET",marks:[]}]}}]});
    const data=await sharp({create:{width:128,height:96,channels:4,background:"#cc8954"}}).png().toBuffer(),b64=data.toString("base64"),ref=inspectUvttImage(b64);
    const document:TacticalMapDocumentV1={schemaVersion:1,kind:"tactical-map",coordinates:"image-pixels",frame:{ursprung:[0,0],einheitenProPixel:1,ordnung:"xy",hoch:"unten"},
      geometry:{v:3,size:[128,96],stamps:[],places:[{id:"secret-place",x:100,y:40}],regions:[{id:"left-room",punkte:[[4,4],[60,4],[60,92],[4,92]]},{id:"right-room",punkte:[[68,4],[124,4],[124,92],[68,92]]}]},grid:{kind:"square",size:8,origin:[0,0]},elevation:0,geometryElevation:[],walls:[],portals:[],lights:[],environment:{bakedLighting:false,ambientLightArgb:"ffffffff"},background:{sha256:ref.sha256,mimeType:ref.mimeType,width:128,height:96}};
    const tactical=createTactical(host.db),mapId=(await tactical.importMap(host.gm.userId,host.campaign.id,{...cmd(),name:"Geheimer Plan",format:"native",sourceText:JSON.stringify(document),imageBase64:b64,anchors:[{targetKind:"place",targetId:"secret-place",entryId:entry.entryId,passageId:entry.passagen[0]!.pid}],provenance:{name:"Browser fixture",creator:"Tests",sourceUrl:null,license:"CC0-1.0",licenseUrl:null,retrievedAt:null,generator:null,generatorVersion:null}})).subjectId;
    const game=createGameplay(host.db),scene=await game.createScene(host.gm.userId,host.campaign.id,{name:"Raumnebel",entryIds:[],fictionDate:"Tag 1"});
    await tactical.savePlan(host.gm.userId,host.campaign.id,scene.id,{...cmd(),expectedVersion:0,mapId,mapRevision:1,tokens:[{id:randomUUID(),actorId:host.actorId,x:20,y:20,elevation:0,rotation:0,scale:1}]});
    const sessionId=String((await game.startScene(host.gm.userId,host.campaign.id,scene.id)).id),activePath=`/api/campaigns/${host.campaign.id}/tactical/active`;
    // Observe only real responses; never intercept or substitute application data.
    let seenPlayer:any=null;player.on("response",async response=>{if(response.url().endsWith(activePath)&&response.ok())seenPlayer=await response.json();});
    for(const p of[gm,player]){await p.goto(`${host.origin}/?campaign=${host.campaign.id}&stage=tisch`);await p.getByRole("tab",{name:"Szenenkarte",exact:true}).click();await canvas(p);}
    await expect(player.getByTestId("room-fog-controls")).toHaveCount(0);
    const panel=gm.getByTestId("room-fog-controls");await panel.locator("summary").click();
    await panel.getByRole("button",{name:"Manuellen Raumnebel aktivieren",exact:true}).click();await expect(panel.getByText("Manueller Raumnebel aktiv",{exact:true})).toBeVisible();
    await expect.poll(()=>seenPlayer?.regions?.length).toBe(0);
    const labels=panel.getByRole("group",{name:"Räume für Raumnebel"}).getByRole("checkbox");await expect(labels).toHaveCount(2);await labels.nth(0).check();
    await panel.getByRole("button",{name:"Ausgewählte Räume aufdecken",exact:true}).click();
    await expect.poll(()=>seenPlayer?.regions?.map((r:any)=>r.id)).toEqual(["left-room"]);
    const allowed=structuredClone(seenPlayer);expect(allowed.tokens).toHaveLength(1);expect(JSON.stringify(allowed)).not.toContain("right-room");expect(JSON.stringify(allowed)).not.toContain("secret-place");
    const tile=await tactical.getTile(host.player.userId,host.campaign.id,sessionId,0,0,0,allowed.rasterDigest),pixels=await sharp(tile.bytes).ensureAlpha().raw().toBuffer({resolveWithObject:true});
    const alpha=(x:number,y:number)=>pixels.data[(y*pixels.info.width+x)*4+3];expect(alpha(20,20)).toBe(255);expect(alpha(100,20)).toBe(0);
    await player.screenshot({path:info.outputPath("player-one-room.png"),fullPage:true});
    await gm.reload();await gm.getByRole("tab",{name:"Szenenkarte",exact:true}).click();await canvas(gm);await gm.getByTestId("room-fog-controls").locator("summary").click();
    await expect(gm.getByTestId("room-fog-controls").getByText("Aufgedeckt",{exact:true})).toHaveCount(1);
    await player.reload();await player.getByRole("tab",{name:"Szenenkarte",exact:true}).click();await canvas(player);await expect.poll(()=>seenPlayer?.regions?.map((r:any)=>r.id)).toEqual(["left-room"]);
    await gm.getByTestId("room-fog-controls").getByRole("group",{name:"Räume für Raumnebel"}).getByRole("checkbox").nth(0).check();
    await gm.getByRole("button",{name:"Ausgewählte Räume verbergen",exact:true}).click();await expect.poll(()=>seenPlayer?.regions?.length).toBe(0);await expect.poll(()=>seenPlayer?.tokens?.length).toBe(0);
    await expect(tactical.getTile(host.player.userId,host.campaign.id,sessionId,0,0,0,allowed.rasterDigest)).rejects.toThrow();
    const blocked=await player.request.get(`${host.origin}/api/campaigns/${host.campaign.id}/tactical/maps/${mapId}/fog`);expect(blocked.status()).toBe(404);
    expect(JSON.stringify(seenPlayer)).not.toContain("UNREVEALED-LORE-SECRET");
    await gm.screenshot({path:info.outputPath("gm-room-controls.png"),fullPage:true});await player.screenshot({path:info.outputPath("player-rehidden.png"),fullPage:true});
    await gm.setViewportSize({width:390,height:844});expect(await gm.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);expect(errors).toEqual([]);
  }finally{await gmContext.close();await playerContext.close();await host.close();}
});
