import { _electron as electron } from "playwright";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { mkdir, mkdtemp, readFile, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { join } from "node:path";
import { tsImport } from "tsx/esm/api";

// This loader belongs only to the checkout's smoke process. The tested desktop still runs
// its compiled main/worker and copied client, including when --executable selects an install.
const { validateCurrentCampaignBundle, currentCampaignSemanticDiff }=await tsImport("@chronicle/io",import.meta.url);

const root=fileURLToPath(new URL("../../../",import.meta.url));
// Chromium's SQLite journal also needs room below MAX_PATH. A timestamped name in a
// nested delivery checkout can make cookies appear to flush while nothing is persisted.
// Keep the actual production partition identity and allocate a short, atomic test child.
const profiles=join(root,".local/desktop-profiles");await mkdir(profiles,{recursive:true});
const run=await mkdtemp(join(profiles,"smoke-"));
const artifactFlag=process.argv.find(value=>value.startsWith("--executable="));
const executable=artifactFlag?artifactFlag.slice("--executable=".length):fileURLToPath(new URL("../../../node_modules/electron/dist/electron.exe",import.meta.url));
const entry=join(root,"packages/desktop/dist");
const options={executablePath:executable,args:[...artifactFlag?[]:[entry],`--user-data=${join(run,"user-data")}`],env:Object.fromEntries(Object.entries(process.env).filter(([key])=>!["ELECTRON_RUN_AS_NODE","NODE_OPTIONS","DATABASE_URL","COOKIE_SECRET"].includes(key))),timeout:90000};
let application,manager,game,profileId,origin,gmId,campaignId,bundle;
const evidence={schema:"chronicle-desktop-smoke/1",run,startedAt:new Date().toISOString(),checks:[]};
const record=name=>{evidence.checks.push(name);console.log(`PASS ${name}`);};
async function launch(){application=await electron.launch(options);manager=await application.firstWindow();manager.setDefaultTimeout(30000);await manager.waitForURL("chronicle-shell://app/index.html");await manager.waitForSelector("#create-form");console.log("Desktop manager loaded.");}
async function invoke(request){const result=await manager.evaluate(request=>window.chronicleDesktop.invoke(request),request);assert.equal(result.ok,true,result.error);return result.value;}
async function request(path,method="GET",body){return game.evaluate(async({path,method,body})=>{const response=await fetch(path,{method,headers:body?{"Content-Type":"application/json"}:{},...(body?{body:JSON.stringify(body)}:{})});return{status:response.status,body:await response.json()};},{path,method,body});}
function validatedExport(response){assert.equal(response.status,200,JSON.stringify(response.body));const result=validateCurrentCampaignBundle(response.body);assert.equal(result.manifest.campaignId,campaignId);return result;}
function unchangedExport(response){const result=validatedExport(response);assert.equal(result.manifest.contentHash,bundle.manifest.contentHash);assert.deepEqual(currentCampaignSemanticDiff(bundle,result),[]);}
async function openGameWindow(phase){
  const started=Date.now(),[opened]=await Promise.all([application.waitForEvent("window",{timeout:90000}),invoke({kind:"open"})]);
  await opened.waitForLoadState();(evidence.windowOpenMs??={})[phase]=Date.now()-started;
  console.log(`Desktop ${phase} window loaded in ${evidence.windowOpenMs[phase]} ms`);return opened;
}
async function stop(){if(application){
  // A timed-out window wait does not cancel the native open action. Let that action settle
  // before asking the same production management boundary to drain and stop its own host.
  await manager.waitForFunction(async()=>{const status=await window.chronicleDesktop.invoke({kind:"status"});return status.ok&&!status.value.busy;},null,{timeout:90000,polling:250});
  await invoke({kind:"stop"});await application.close();application=undefined;
}}
try{
  await launch();
  await manager.locator("#profile-name").fill("Desktop smoke world");await manager.getByRole("button",{name:"Welt anlegen",exact:true}).click();
  await manager.waitForFunction(()=>!document.getElementById("setup").hidden||document.getElementById("message").classList.contains("error"),{},{timeout:90000});
  assert.equal(await manager.locator("#setup").isVisible(),true,await manager.locator("#message").innerText());
  // Der Einrichtungsschluessel des Clients ist im Desktop unerfuellbar: der Host baut die
  // Anwendung mit leerem bootstrapToken, und POST /api/setup verwirft alles unter 32 Zeichen.
  // Ein sichtbarer "Welt oeffnen"-Knopf vor der Einrichtung fuehrt also in eine Sackgasse.
  assert.equal(await manager.locator("#open").isHidden(),true,"Welt oeffnen darf vor der ersten Einrichtung nicht angeboten werden.");
  const state=await invoke({kind:"status"});profileId=state.profileId;origin=state.origin;
  assert.match(state.runtime.node,/^24\./);assert.ok(state.runtime.decoder);assert.notEqual(new URL(origin).port,"3000");evidence.runtime=state.runtime;
  record("own PG17 starts, migrations and native sharp decode under Electron Node24");
  const [createdGame]=await Promise.all([application.waitForEvent("window",{timeout:90000}),manager.locator("#gm-name").fill("Desktop GM").then(()=>manager.getByRole("button",{name:"Spielleitung einrichten",exact:true}).click())]);game=createdGame;await game.waitForLoadState();
  const identity=await request("/api/me");assert.equal(identity.status,200);gmId=identity.body.userId;
  const created=await request("/api/campaigns","POST",{name:"Persistent desktop campaign"});assert.equal(created.status,200);campaignId=created.body.id;
  const entry=await request(`/api/campaigns/${campaignId}/entries`,"POST",{title:"Survives restart",passages:[{inhalt:{kind:"absatz",inhalt:[{text:"Written in the genuine desktop host.",marks:[]}]}}]});assert.equal(entry.status,200);
  const generated=await request(`/api/campaigns/${campaignId}/tactical/generate`,"POST",{commandId:randomUUID(),name:"Bundled floorplan",keim:"desktop-runtime-smoke"});assert.equal(generated.status,200,JSON.stringify(generated.body));
  record("real generator route reads packaged licensed Grundriss assets and persists native tactical map");
  const eron=await request(`/api/campaigns/${campaignId}/maps/eron`,"POST");
  evidence.eronImport={status:eron.status,...(eron.status===200?{mapId:eron.body.id}:{error:eron.body})};
  console.log(`Packaged Andaria import: HTTP ${eron.status}`);
  assert.equal(eron.status,200,JSON.stringify(eron.body));assert.equal(eron.body.report.orte,190);
  const eronImage=await game.evaluate(async path=>{
    const response=await fetch(path),contentType=response.headers.get("content-type");
    if(!response.ok||!contentType?.startsWith("image/webp"))return{status:response.status,contentType,error:await response.text()};
    const bytes=await response.blob();
    try{const bitmap=await createImageBitmap(bytes);try{return{status:response.status,contentType,bytes:bytes.size,width:bitmap.width,height:bitmap.height};}finally{bitmap.close();}}
    catch(error){return{status:response.status,contentType,error:String(error)};}
  },`/api/campaigns/${campaignId}/maps/${eron.body.id}/image`);
  evidence.eronImage=eronImage;console.log(`Packaged Andaria image: ${JSON.stringify(eronImage)}`);
  assert.equal(eronImage.status,200,JSON.stringify(eronImage));assert.match(eronImage.contentType,/^image\/webp(?:;|$)/i);
  assert.equal(eronImage.error,undefined);assert.deepEqual([eronImage.width,eronImage.height],[8192,8192]);assert.ok(eronImage.bytes>0);
  record("packaged ERON source imports 190 Andaria places and browser decodes its actual 8192 x 8192 WebP image");
  evidence.assetProbes=[];
  for(const [stil,setting,profil] of [["gemalt","fantasy","haus"],["zeitwelten","gegenwart","krankenhaus"],["zeitwelten","scifi","raumstation"],["genres","fantasy","haus"],["genres","gegenwart","krankenhaus"],["genres","scifi","raumstation"]]){
    const probe=await request(`/api/campaigns/${campaignId}/tactical/generate`,"POST",{commandId:randomUUID(),name:`Bundled ${stil} ${setting}`,keim:`desktop-assets-${stil}-${setting}`,art:"grundriss",stil,optionen:{setting,profil,zellen:[24,20],raeume:5}});
    evidence.assetProbes.push({stil,setting,status:probe.status,...(probe.status===200?{}:{error:probe.body})});
    console.log(`Packaged asset probe ${stil}/${setting}: HTTP ${probe.status}`);
    assert.equal(probe.status,200,JSON.stringify(probe.body));
    const map=await request(`/api/campaigns/${campaignId}/tactical/maps/${probe.body.ack.subjectId}`);assert.equal(map.status,200,JSON.stringify(map.body));
    assert.ok(map.body.document.geometry.stamps.some(stamp=>stamp.a.startsWith(`pk.${stil}/`)),`${stil}/${setting} must retain artwork from its packaged asset pack`);
    record(`packaged ${stil} assets generate and persist ${setting} interiors`);
  }
  const genres=["fantasy","gothic","antike","wuxia","piraten","western","steampunk","noir","cyberpunk","weltraum","postapokalypse","unterwasser"];
  const packs=await request("/api/packs"),genreManifest=await request("/api/packs/pk.genres/manifest");
  evidence.genrePack={catalogueStatus:packs.status,manifestStatus:genreManifest.status};
  assert.equal(packs.status,200,JSON.stringify(packs.body));assert.equal(genreManifest.status,200,JSON.stringify(genreManifest.body));
  assert.equal(packs.body.find(pack=>pack.id==="pk.genres")?.assetCount,300);
  assert.equal(genreManifest.body.assets.length,300);
  evidence.genrePack.genres=Object.fromEntries(genres.map(genre=>[genre,genreManifest.body.assets.filter(asset=>asset.schlagworte.includes(`genre_${genre}`)).length]));
  assert.deepEqual(Object.values(evidence.genrePack.genres),genres.map(()=>25));
  const assetFiles=await game.evaluate(async assets=>{
    const result={verified:0,bytes:0,failures:[]};
    // Read every shipped file through the real authenticated host. A manifest alone cannot
    // establish that a packaged SVG exists, has the declared bytes, or survives serving.
    for(const asset of assets){
      const response=await fetch(`/api/packs/pk.genres/asset/${asset.datei.split("/").map(encodeURIComponent).join("/")}`);
      const contentType=response.headers.get("content-type");
      if(response.status!==200||!contentType?.startsWith("image/svg+xml")){result.failures.push({name:asset.name,status:response.status,contentType});continue;}
      const bytes=await response.arrayBuffer(),sha256=Array.from(new Uint8Array(await crypto.subtle.digest("SHA-256",bytes)),byte=>byte.toString(16).padStart(2,"0")).join("");
      if(bytes.byteLength!==asset.bytes||sha256!==asset.sha256){result.failures.push({name:asset.name,error:"manifest-bytes-or-hash-mismatch"});continue;}
      result.verified++;result.bytes+=bytes.byteLength;
    }
    return result;
  },genreManifest.body.assets);
  Object.assign(evidence.genrePack,assetFiles);assert.deepEqual(assetFiles.failures,[]);assert.equal(assetFiles.verified,300);
  record("packaged Genre-Archiv serves all 300 SVGs across twelve genres with their exact manifest bytes and SHA256");
  await game.goto(`${origin}/?campaign=${campaignId}&stage=atlas`);
  await game.getByRole("button",{name:"Neue Karte",exact:true}).click();
  const workshop=game.getByRole("region",{name:"Kartenwerkstatt",exact:true});
  await workshop.getByLabel("Name der Karte",{exact:true}).fill("Desktop genre catalogue");
  await workshop.getByRole("group",{name:"Größenprofile",exact:true}).getByRole("button",{name:"Weiler",exact:true}).click();
  await workshop.getByRole("group",{name:"Zeichenstil",exact:true}).getByRole("button",{name:/^Genre-Archiv/}).click();
  await workshop.locator(".map-seed-field input").fill("desktop-genre-catalogue");
  const previewResponse=game.waitForResponse(response=>response.url()===`${origin}/api/campaigns/${campaignId}/tactical/generate/preview`&&response.request().method()==="POST");
  await workshop.getByRole("button",{name:"Vorschau",exact:true}).click();
  const preview=await previewResponse;assert.equal(preview.status(),200);const previewMap=await preview.json();
  const savedResponse=game.waitForResponse(response=>response.url()===`${origin}/api/campaigns/${campaignId}/tactical/generate`&&response.request().method()==="POST");
  await workshop.getByRole("button",{name:"Erzeugen und speichern",exact:true}).click();
  const saved=await savedResponse;assert.equal(saved.status(),200);const genreMapId=(await saved.json()).ack.subjectId;
  const genreMap=await request(`/api/campaigns/${campaignId}/tactical/maps/${genreMapId}`);assert.equal(genreMap.status,200);
  assert.deepEqual(genreMap.body.document,previewMap.document);assert.ok(genreMap.body.document.geometry.stamps.some(stamp=>stamp.a.startsWith("pk.genres/")));
  const canvas=()=>game.locator('.nested-map-view .tactical-canvas[data-canvas-ready="true"] canvas');
  await canvas().waitFor({state:"visible"});
  await game.getByRole("button",{name:"Karte bearbeiten",exact:true}).click();
  await game.locator("summary").filter({hasText:/^Einrichtung & Kartenassets$/}).click();
  const palette=game.getByRole("region",{name:"Kartenassets",exact:true}),grid=palette.locator(".map-artwork-grid");
  await palette.getByRole("combobox",{name:"Genre",exact:true}).waitFor({state:"visible"});
  assert.equal(await palette.getByRole("combobox",{name:"Assetpaket",exact:true}).inputValue(),"pk.genres");
  const waitForAssets=(count,genre)=>game.waitForFunction(({count,genre})=>{
    const buttons=[...document.querySelectorAll('[aria-label="Kartenassets"] .map-artwork-grid > button')];
    return buttons.length===count&&(!genre||buttons.every(button=>button.querySelector("img")?.src.split("/").at(-1)?.startsWith(`${genre}_`)));
  },{count,genre});
  await waitForAssets(300);assert.equal(await palette.getByRole("combobox",{name:"Genre",exact:true}).locator("option").count(),13);
  for(const genre of genres){await palette.getByRole("combobox",{name:"Genre",exact:true}).selectOption(genre);await waitForAssets(25,genre);}
  evidence.genreCatalogue={mapId:genreMapId,filteredGenres:genres,searches:[]};
  let selectedAsset;
  for(const genre of ["fantasy","piraten","cyberpunk"]){
    selectedAsset=genreManifest.body.assets.find(asset=>asset.art==="moebel"&&asset.schlagworte.includes(`genre_${genre}`));assert.ok(selectedAsset);
    await palette.getByRole("combobox",{name:"Genre",exact:true}).selectOption(genre);
    await palette.getByRole("combobox",{name:"Kategorie",exact:true}).selectOption("moebel");
    await palette.getByRole("textbox",{name:"Assets suchen",exact:true}).fill(selectedAsset.name.replaceAll("_"," "));
    await waitForAssets(1,genre);await grid.locator("button").scrollIntoViewIfNeeded();
    const image=await grid.locator("img").evaluate(async image=>{await image.decode();return{width:image.naturalWidth,height:image.naturalHeight};});
    assert.ok(image.width>0&&image.height>0);await grid.locator("button").click();
    assert.equal(await grid.locator("button").getAttribute("aria-pressed"),"true");
    evidence.genreCatalogue.searches.push({genre,name:selectedAsset.name,...image});
  }
  await palette.screenshot({path:join(run,"genre-catalogue.png")});
  await canvas().scrollIntoViewIfNeeded();await game.locator(".nested-map-view").getByRole("button",{name:"Ganze Karte",exact:true}).click();
  const bounds=await canvas().boundingBox();assert.ok(bounds);await game.mouse.click(bounds.x+bounds.width*.5,bounds.y+bounds.height*.5);
  const revisionResponse=game.waitForResponse(response=>response.url()===`${origin}/api/campaigns/${campaignId}/tactical/maps/${genreMapId}/revision`&&response.request().method()==="PUT");
  await game.getByRole("button",{name:"Kartenrevision speichern",exact:true}).click();assert.equal((await revisionResponse).status(),200);
  await game.waitForFunction(()=>[...document.querySelectorAll("button")].find(button=>button.textContent?.trim()==="Kartenrevision speichern")?.disabled);
  const revisedGenreMap=await request(`/api/campaigns/${campaignId}/tactical/maps/${genreMapId}`);assert.equal(revisedGenreMap.status,200);
  const knownStamps=new Set(genreMap.body.document.geometry.stamps.map(stamp=>stamp.id));
  assert.deepEqual(revisedGenreMap.body.document.geometry.stamps.filter(stamp=>!knownStamps.has(stamp.id)).map(stamp=>stamp.a),[`pk.genres/${selectedAsset.name}`]);
  assert.equal(revisedGenreMap.body.revision,genreMap.body.revision+1);evidence.genreCatalogue.savedRevision=revisedGenreMap.body.revision;
  // Disabled also means an in-flight save. Wait for its GET and React's clean-draft
  // propagation before reloading, otherwise this test races the beforeunload guard.
  await game.waitForFunction(revision=>document.querySelector('.band-status')?.textContent?.trim()!=="Ungespeicherter Entwurf"&&[...document.querySelectorAll('.page-heading .field-help')].some(node=>node.textContent?.includes(`Kartenrevision ${revision}.`)),revisedGenreMap.body.revision);
  await game.reload();await canvas().waitFor({state:"visible"});
  assert.deepEqual((await request(`/api/campaigns/${campaignId}/tactical/maps/${genreMapId}`)).body.document,revisedGenreMap.body.document);
  record("compiled client previews and saves Genre-Archiv, filters twelve genres, searches and decodes three motifs, and persists placed artwork through reload");
  // Exercise the delivered lifecycle before the export/restart/restore checks below.
  // The fixture belongs to this isolated smoke profile; no user map is selected.
  assert.equal(revisedGenreMap.body.cartography?.schemaVersion,1);
  const entrances=await request(`/api/campaigns/${campaignId}/maps/tactical/${genreMapId}/children`);
  assert.equal(entrances.status,200);const house=entrances.body.nodes.find(node=>node.canEnter&&!node.vorhandeneKarteId);assert.ok(house);
  const enter=async(parentMapId,knotenId,expectedVersion,name)=>{
    const result=await request(`/api/campaigns/${campaignId}/betreten`,"POST",{commandId:randomUUID(),parentKind:"tactical",parentMapId,knotenId,expectedVersion,name});
    assert.equal(result.status,200,JSON.stringify(result.body));return result.body.mapId;
  };
  const interior=await enter(genreMapId,house.knotenId,entrances.body.version,"Desktop interior to remove");
  const rooms=await request(`/api/campaigns/${campaignId}/maps/tactical/${interior}/children`);assert.equal(rooms.status,200);
  const room=rooms.body.nodes.find(node=>node.canEnter);assert.ok(room);
  const cellar=await enter(interior,room.knotenId,rooms.body.version,"Desktop cellar to remove");
  await game.goto(`${origin}/?campaign=${campaignId}&stage=atlas&atlasChild=${genreMapId}`);
  const houseRow=game.locator(".nested-building-list > li").filter({has:game.getByRole("button",{name:`Aktionen für ${house.titel}`,exact:true})});
  await houseRow.waitFor({state:"visible"});await houseRow.click({button:"right"});
  await game.getByRole("menuitem",{name:"Unterkarte löschen …",exact:true}).click();
  const deletionDialog=game.getByRole("dialog",{name:"Karte löschen",exact:true});
  await deletionDialog.getByText("Desktop interior to remove",{exact:true}).first().waitFor({state:"visible"});
  await deletionDialog.getByText("Desktop cellar to remove",{exact:true}).waitFor({state:"visible"});
  await deletionDialog.screenshot({path:join(run,"map-deletion-preview.png")});
  const deleteResponse=game.waitForResponse(response=>response.url()===`${origin}/api/campaigns/${campaignId}/maps/tactical/${interior}/delete`&&response.request().method()==="POST");
  await deletionDialog.getByRole("button",{name:"2 Karten löschen",exact:true}).click();
  const removed=await deleteResponse;assert.equal(removed.status(),200);const deletionAck=await removed.json();
  assert.deepEqual(deletionAck.deletedMaps.map(map=>map.id).sort(),[interior,cellar].sort());
  await deletionDialog.waitFor({state:"hidden"});
  for(const id of [interior,cellar])assert.equal((await request(`/api/campaigns/${campaignId}/tactical/maps/${id}`)).status,404);
  const freed=await request(`/api/campaigns/${campaignId}/maps/tactical/${genreMapId}/children`);assert.equal(freed.status,200);
  assert.equal(freed.body.nodes.find(node=>node.knotenId===house.knotenId)?.vorhandeneKarteId,null);
  const replacement=await enter(genreMapId,house.knotenId,freed.body.version,"Desktop replacement interior");assert.notEqual(replacement,interior);
  evidence.mapLifecycle={parent:genreMapId,interior,cellar,replacement,deletionAck};
  record("compiled desktop right-click reviews and deletes two nested maps, frees the surviving entrance and persists a new replacement interior");
  await game.goto(`${origin}/?campaign=${campaignId}&stage=schmiede`);
  const overview=game.getByRole("region",{name:"Was möchtest du vorbereiten?",exact:true});
  await overview.waitFor({state:"visible"});
  const workshops=game.getByRole("navigation",{name:"Werkstätten",exact:true});
  assert.equal(await workshops.getByRole("button",{name:"Übersicht",exact:true}).getAttribute("aria-current"),"page");
  for(const label of ["Lootkarten","Figuren & NPCs","Karten","Bilder","Regeln","Aussehen","Veröffentlichung"]){
    await workshops.getByRole("button",{name:label,exact:true}).waitFor({state:"visible"});
    await overview.getByRole("button").filter({has:game.getByText(label,{exact:true})}).waitFor({state:"visible"});
  }
  await game.screenshot({path:join(run,"forge-overview.png"),fullPage:true});
  record("shared packaged client shows the Schmiede overview and all seven discoverable workshops");
  await workshops.getByRole("button",{name:"Regeln",exact:true}).click();
  const template=game.getByRole("region",{name:"How to be a Hero Vorlage"});
  await template.getByRole("button",{name:"HTBAH-Vorlage anpassen",exact:true}).click();
  await template.getByRole("button",{name:/HTBAH als Regelentwurf/}).click();
  for(const [suffix,label] of [["/rules/preview",/^Aktivierung pr/],["/rules",/^Version installieren$/],["/rules/activate",/^Gepr.*Version.*aktivieren$/]]){
    const response=game.waitForResponse(response=>response.url()===`${origin}/api/campaigns/${campaignId}${suffix}`&&response.request().method()==="POST");
    await game.getByRole("button",{name:label}).click();assert.equal((await response).status(),200);
  }
  bundle=validatedExport(await request(`/api/campaigns/${campaignId}/export`));
  assert.equal(bundle.manifest.rulePackageSchemaVersion,2);assert.equal(bundle.manifest.nestedMapSchemaVersion,1);
  assert.equal(bundle.version,15);assert.equal(bundle.manifest.mapLifecycleSchemaVersion,1);
  assert.ok(bundle.tables.map_lifecycle_events.some(row=>row.command_id===evidence.mapLifecycle.deletionAck.commandId));
  assert.ok(bundle.tables.tactical_map_nodes.some(node=>node.map_id===generated.body.ack.subjectId));
  assert.ok(JSON.stringify(bundle.tables.rule_packages).includes("CC-BY-NC-SA-4.0"));
  evidence.bundleVersion=bundle.version;evidence.campaignContentHash=bundle.manifest.contentHash;
  record(`shared packaged client installs and activates HTBAH V2 rules and exports attributed current native V${bundle.version} with generated map nodes`);
  record("native first setup installs HttpOnly cookie and shared client writes campaign/article");
  assert.equal(await game.evaluate(()=>typeof window.chronicleDesktop),"undefined");
  const prefs=await application.evaluate(({BrowserWindow})=>BrowserWindow.getAllWindows().map(window=>window.webContents.getLastWebPreferences()));assert.ok(prefs.every(pref=>pref.nodeIntegration===false&&pref.contextIsolation===true&&pref.sandbox===true&&pref.webSecurity===true));
  const cookies=await application.evaluate(async({BrowserWindow},origin)=>{const window=BrowserWindow.getAllWindows().find(window=>window.webContents.getURL().startsWith(origin));return(await window.webContents.session.cookies.get({name:"chronicle_session"})).map(cookie=>({httpOnly:cookie.httpOnly,secure:cookie.secure,sameSite:cookie.sameSite}));},origin);
  assert.ok(cookies.some(cookie=>cookie.httpOnly&&cookie.secure&&cookie.sameSite==="strict"));
  record("isolated game has no management bridge; all windows sandboxed and cookie flags preserved");
  await manager.screenshot({path:join(run,"manager.png"),fullPage:true});await game.screenshot({path:join(run,"game.png"),fullPage:true});
  await stop();record("Fastify drain, pool close and verified own PG smart-stop complete");
  await launch();await invoke({kind:"start",profileId});
  game=await openGameWindow("restart");
  assert.equal((await request("/api/me")).body.userId,gmId);assert.equal((await request("/api/campaigns")).body.some(campaign=>campaign.id===campaignId),true);
  unchangedExport(await request(`/api/campaigns/${campaignId}/export`));
  record("full Electron exit/relaunch reopens same profile, stable origin, cookie and semantic campaign hash");
  const originalCredential=(await request("/api/me")).body.credentialId;
  const point=await invoke({kind:"backup"});assert.ok(point.recoveryId);assert.equal(game.isClosed(),true);
  await invoke({kind:"recovery-restore",recoveryId:point.recoveryId,name:"Complete host recovery"});
  game=await openGameWindow("recovery");
  const recoveredMe=await request("/api/me");assert.equal(recoveredMe.status,200);assert.equal(recoveredMe.body.userId,gmId);assert.equal(recoveredMe.body.credentialId,originalCredential);
  unchangedExport(await request(`/api/campaigns/${campaignId}/export`));
  record("management recovery point restores new profile with same actual signed browser credential and complete campaign hash");
  await invoke({kind:"stop"});
  const source=join(run,`native-v${bundle.version}.chronicle`);await writeFile(source,JSON.stringify(bundle));
  // The smoke supplies one deterministic OS file-dialog selection; all validation,
  // private transfer, empty-target restore and enrollment use the production path.
  await application.evaluate(({dialog},source)=>{dialog.showOpenDialog=async()=>({canceled:false,filePaths:[source]});},source);
  const inspect=await invoke({kind:"restore-select",name:"Restored desktop world"});assert.equal(inspect.report.dryRun,true);assert.equal(inspect.report.formatVersion,bundle.version);assert.ok(inspect.gms.some(gm=>gm.id===gmId));
  const restored=await invoke({kind:"restore-confirm",ticket:inspect.ticket});assert.equal(restored.enrollmentRequired,true);
  const targetState=await invoke({kind:"status"});assert.notEqual(targetState.profileId,profileId);assert.notEqual(targetState.origin,origin);
  const enrollment=await invoke({kind:"enroll",campaignId,userId:gmId});assert.ok(enrollment.code);
  game=await openGameWindow("campaign-restore");
  const paired=await request("/api/pairing/redeem","POST",{code:enrollment.code});assert.equal(paired.status,200);assert.equal((await request("/api/me")).body.userId,gmId);
  unchangedExport(await request(`/api/campaigns/${campaignId}/export`));
  assert.notEqual((await request("/api/pairing/redeem","POST",{code:enrollment.code})).status,200);
  record(`native V${bundle.version} restores only into new profile, explicit historical GM enrolls once, semantic reexport equals source`);
  await stop();
  const disk=JSON.parse(await readFile(join(run,"user-data/profiles",profileId,"profile.json"),"utf8"));assert.notEqual(disk.pgPort,54329);
  const encrypted=await readFile(join(run,"user-data/profiles",profileId,"secrets.dpapi"));assert.ok(!encrypted.includes(Buffer.from("cookieSecret")));
  record("DPAPI ciphertext persisted; original development ports and configuration never selected");
  evidence.passed=true;
}catch(error){
  evidence.passed=false;evidence.error=String(error);console.error(error);process.exitCode=1;
  if(game&&!game.isClosed())try{
    evidence.failureView={url:game.url(),text:(await game.locator("body").innerText()).slice(0,12000)};
    await game.screenshot({path:join(run,"failure.png"),fullPage:true});
    evidence.gpuFeatures=await application.evaluate(({app})=>app.getGPUFeatureStatus());
  }catch(captureError){evidence.captureError=String(captureError);}
}
finally{try{await stop();}catch(error){evidence.cleanupError=String(error);process.exitCode=1;}await writeFile(join(run,"evidence.json"),JSON.stringify(evidence,null,2));console.log(`Evidence: ${join(run,"evidence.json")}`);}
