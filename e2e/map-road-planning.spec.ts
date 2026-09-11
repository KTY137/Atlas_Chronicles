// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2026 Kaya Yesilyurt - Atlas Chronicles. Siehe LICENSE.
import { test, expect } from "@playwright/test";
import { readFile } from "node:fs/promises";
import { reviewApp } from "./helpers/review-app.ts";
import { createTactical } from "../packages/server/src/domain/tactical.ts";
import { flaeche, schnittKonvex } from "../packages/forge/src/polygon.ts";

// Real UI, auth, generator, persistence and native data. No intercepted API responses.
test("road graph is edited with keyboard and pointer, replayed and saved without losing its geometry", async ({ browser }, info) => {
  const host=await reviewApp(11210+Math.floor(Math.random()*80));
  const context=await browser.newContext({locale:"de-DE",acceptDownloads:true});
  try {
    await context.addCookies([{name:"chronicle_session",value:host.gm.value,url:host.origin,httpOnly:true,sameSite:"Strict"}]);
    const page=await context.newPage(),errors:string[]=[];
    page.on("pageerror",e=>errors.push(e.message));page.on("dialog",d=>d.accept());
    await page.goto(`${host.origin}/?campaign=${host.campaign.id}&stage=atlas`);
    await page.getByRole("button",{name:"Neue Karte",exact:true}).click();
    const studio=page.getByRole("region",{name:"Kartenwerkstatt",exact:true});
    await studio.getByLabel("Name der Karte",{exact:true}).fill("Straßenstadt");
    await studio.getByLabel("Weltkeim").fill("roads-browser");
    await studio.getByRole("group",{name:"Landschaft auswählen",exact:true}).getByRole("button",{name:/^Ebene/}).click();
    await studio.getByText("Feineinstellungen",{exact:true}).click();
    await studio.getByRole("slider",{name:"Relief",exact:true}).focus();await page.keyboard.press("Home");
    await expect(studio.getByRole("slider",{name:"Relief",exact:true})).toHaveValue("0");
    const preview=()=>page.waitForResponse(r=>r.url().endsWith("/tactical/generate/preview")&&r.ok());
    let response=preview();await studio.getByRole("button",{name:"Vorschau",exact:true}).click();
    const baseline=await(await response).json();
    await studio.getByText("Straßen & Verbindungen planen",{exact:true}).click();
    const planner=studio.locator(".map-road-planner");
    await expect(planner.locator(".road-background")).not.toHaveCount(0);
    await planner.getByRole("button",{name:"Wegpunkt hinzufügen",exact:true}).click();
    await planner.getByLabel("Name des Wegpunkts",{exact:true}).fill("");
    await expect(studio.getByRole("button",{name:"Vorschau",exact:true})).toBeDisabled();
    await planner.getByLabel("Name des Wegpunkts",{exact:true}).fill("Westtor");
    await planner.getByRole("button",{name:"Wegpunkt hinzufügen",exact:true}).click();
    await planner.getByLabel("Name des Wegpunkts",{exact:true}).fill("Neuer Markt");
    await planner.getByLabel("Art des Wegpunkts",{exact:true}).selectOption("platz");
    await planner.getByRole("button",{name:"Verbindung hinzufügen",exact:true}).click();
    await planner.getByLabel("Straßenklasse",{exact:true}).selectOption("gasse");
    await planner.getByLabel("Straßenklasse",{exact:true}).selectOption("hauptstrasse");
    const drawing=planner.getByRole("group",{name:"Straßenplan zeichnen",exact:true});
    await drawing.getByRole("button",{name:"Wegpunkt bearbeiten: Westtor",exact:true}).focus();
    await page.keyboard.press("ArrowRight");
    await expect(planner.getByLabel("Wegpunkt X (%)",{exact:true})).toHaveValue("11");
    await page.keyboard.press("ArrowLeft");
    await expect(planner.getByLabel("Wegpunkt X (%)",{exact:true})).toHaveValue("10");
    await drawing.scrollIntoViewIfNeeded();
    const bounds=(await drawing.boundingBox())!,circle=(await drawing.locator('[data-road-node="ziel-2"] circle').boundingBox())!;
    await page.mouse.move(circle.x+circle.width/2,circle.y+circle.height/2);
    await page.mouse.down();await page.mouse.move(circle.x+circle.width/2,circle.y+circle.height/2-bounds.height*.1,{steps:4});await page.mouse.up();
    await expect(planner.getByLabel("Wegpunkt auswählen",{exact:true})).toHaveValue("ziel-2");
    expect(Number(await planner.getByLabel("Wegpunkt Y (%)",{exact:true}).inputValue())).toBeLessThan(45);
    await planner.getByLabel("Wegpunkt Y (%)",{exact:true}).fill("50");
    response=preview();await studio.getByRole("button",{name:"Vorschau",exact:true}).click();
    const generated=await(await response).json();
    expect(generated.generator.version).toBe("10");
    expect(generated.bericht.verkehr.routes[0].status).toBe("gebaut");
    expect(generated.bericht.verkehr.unreachableNodes).toEqual([]);
    expect(generated.cartography.relief).toEqual(baseline.cartography.relief);
    const reserved=new Set(generated.bericht.verkehr.reservedRegions);
    expect(reserved.size).toBeGreaterThan(1);
    for(const building of generated.nodes) {
      const roof=generated.document.geometry.regions.find((r:any)=>r.id===building.knotenId).punkte;
      for(const road of generated.document.geometry.regions.filter((r:any)=>reserved.has(r.id)))expect(flaeche(schnittKonvex(roof,road.punkte))).toBeLessThan(.001);
    }
    await expect(studio.getByRole("region",{name:"Ergebnis der Straßenplanung",exact:true})).toContainText("Gebaut:");
    const downloading=page.waitForEvent("download");
    await studio.getByRole("button",{name:"Vorlage als Datei speichern",exact:true}).click();
    const file=info.outputPath("roads-recipe.json");await(await downloading).saveAs(file);
    const recipe=JSON.parse(await readFile(file,"utf8"));
    expect(recipe.settings.verkehr.knoten).toHaveLength(2);expect(recipe.referenceHash).toBe(generated.keimHash);
    await planner.getByRole("button",{name:"Verbindung entfernen",exact:true}).click();
    await expect(studio.getByRole("button",{name:"Erzeugen und speichern",exact:true})).toBeDisabled();
    await studio.getByLabel("Kartenvorlage öffnen",{exact:true}).setInputFiles(file);
    await expect(planner.getByLabel("Verbindung auswählen",{exact:true}).locator("option")).toHaveCount(2);
    response=preview();await studio.getByRole("button",{name:"Vorschau",exact:true}).click();
    expect((await(await response).json()).keimHash).toBe(generated.keimHash);
    expect(await createTactical(host.db).listMaps(host.gm.userId,host.campaign.id)).toHaveLength(0);
    await page.setViewportSize({width:390,height:844});
    expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
    await page.setViewportSize({width:1440,height:960});
    await page.screenshot({path:info.outputPath("roads-preview.png"),fullPage:true});
    await drawing.scrollIntoViewIfNeeded();
    await page.screenshot({path:info.outputPath("roads-planner.png")});
    await studio.locator(".map-workshop-preview .tactical-canvas").first().scrollIntoViewIfNeeded();
    await page.screenshot({path:info.outputPath("roads-map.png")});
    await studio.getByRole("button",{name:"Erzeugen und speichern",exact:true}).click();
    await expect(page.locator('.tactical-canvas[data-canvas-ready="true"]')).toHaveCount(1);
    await expect(page.locator(".nested-building-list li")).toHaveCount(generated.nodes.length);
    const id=new URL(page.url()).searchParams.get("atlasChild")!;
    await page.reload();await expect(page.locator('.tactical-canvas[data-canvas-ready="true"]')).toHaveCount(1);
    const saved=await createTactical(host.db).getMap(host.gm.userId,host.campaign.id,id);
    expect(saved.document).toEqual(generated.document);
    expect(saved.cartography!.regions[0]!.provenance!.optionen.verkehr).toEqual(recipe.settings.verkehr);
    expect(errors).toEqual([]);
  } finally {await context.close();await host.close();}
});

test("an impossible river route remains a visible diagnostic until bridges are explicitly allowed", async ({ browser }, info) => {
  const host=await reviewApp(11310+Math.floor(Math.random()*80));
  const context=await browser.newContext({locale:"de-DE"});
  try {
    await context.addCookies([{name:"chronicle_session",value:host.gm.value,url:host.origin,httpOnly:true,sameSite:"Strict"}]);
    const page=await context.newPage(),errors:string[]=[];
    page.on("pageerror",e=>errors.push(e.message));
    await page.goto(`${host.origin}/?campaign=${host.campaign.id}&stage=atlas`);
    await page.getByRole("button",{name:"Neue Karte",exact:true}).click();
    const studio=page.getByRole("region",{name:"Kartenwerkstatt",exact:true});
    await studio.getByLabel("Name der Karte",{exact:true}).fill("Flussquerung");await studio.getByLabel("Weltkeim").fill("roads-river");
    await studio.getByRole("group",{name:"Landschaft auswählen",exact:true}).getByRole("button",{name:/^Fluss/}).click();
    await studio.getByText("Feineinstellungen",{exact:true}).click();await studio.getByRole("slider",{name:"Relief",exact:true}).focus();await page.keyboard.press("Home");
    await expect(studio.getByRole("slider",{name:"Relief",exact:true})).toHaveValue("0");
    await studio.getByText("Straßen & Verbindungen planen",{exact:true}).click();
    const planner=studio.locator(".map-road-planner");
    await planner.getByRole("button",{name:"Wegpunkt hinzufügen",exact:true}).click();
    await planner.getByRole("button",{name:"Wegpunkt hinzufügen",exact:true}).click();
    await planner.getByLabel("Art des Wegpunkts",{exact:true}).selectOption("tor");
    await planner.getByLabel("Maximaler Höhenwechsel",{exact:true}).fill("64");
    await planner.getByRole("button",{name:"Verbindung hinzufügen",exact:true}).click();
    const preview=()=>page.waitForResponse(r=>r.url().endsWith("/tactical/generate/preview")&&r.ok());
    let response=preview();await studio.getByRole("button",{name:"Vorschau",exact:true}).click();
    const refused=await(await response).json();expect(refused.bericht.verkehr.routes[0].status).toBe("kein-weg");
    await expect(studio.getByRole("region",{name:"Ergebnis der Straßenplanung",exact:true})).toContainText("Kein zulässiger Weg");
    await expect(studio.getByRole("button",{name:"Erzeugen und speichern",exact:true})).toBeDisabled();
    expect(await createTactical(host.db).listMaps(host.gm.userId,host.campaign.id)).toHaveLength(0);
    await planner.getByLabel("Flussbrücken für diese Verbindung erlauben",{exact:true}).check();
    response=preview();await studio.getByRole("button",{name:"Vorschau",exact:true}).click();
    const built=await(await response).json();expect(built.bericht.verkehr.routes[0].status).toBe("gebaut");
    expect(built.bericht.verkehr.routes[0].riverCrossings).toBeGreaterThan(0);
    expect(built.bericht.verkehr.unreachableNodes).toEqual([]);
    expect(built.cartography.regions.filter((r:any)=>r.role==="road"&&r.material==="bridge").length)
      .toBeGreaterThan(refused.cartography.regions.filter((r:any)=>r.role==="road"&&r.material==="bridge").length);
    await expect(studio.getByRole("button",{name:"Erzeugen und speichern",exact:true})).toBeEnabled();
    await page.screenshot({path:info.outputPath("river-bridge-preview.png"),fullPage:true});
    await studio.locator(".map-workshop-preview .tactical-canvas").first().scrollIntoViewIfNeeded();
    await page.screenshot({path:info.outputPath("river-bridge-map.png")});
    await studio.getByRole("button",{name:"Erzeugen und speichern",exact:true}).click();
    await expect(page.locator('.tactical-canvas[data-canvas-ready="true"]')).toHaveCount(1);
    expect(await createTactical(host.db).listMaps(host.gm.userId,host.campaign.id)).toHaveLength(1);
    expect(errors).toEqual([]);
  }finally{await context.close();await host.close();}
});
