import { _electron as electron } from "playwright";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { join } from "node:path";
import { tsImport } from "tsx/esm/api";

// This loader belongs only to the checkout's smoke process. The tested desktop still runs
// its compiled main/worker and copied client, including when --executable selects an install.
const { validateCurrentCampaignBundle, currentCampaignSemanticDiff }=await tsImport("@chronicle/io",import.meta.url);

const root=fileURLToPath(new URL("../../../",import.meta.url));
// Keep the timestamped profile path: nested worktrees also exercise libpq's password-file
// path limit. Recovery must retain its short, unique password filename inside that profile.
const run=join(root,".local/desktop-profiles",`smoke-${Date.now()}-${randomUUID().slice(0,8)}`);
await mkdir(run,{recursive:true});
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
  for(const [stil,setting,profil] of [["gemalt","fantasy","haus"],["zeitwelten","gegenwart","krankenhaus"],["zeitwelten","scifi","raumstation"]]){
    const probe=await request(`/api/campaigns/${campaignId}/tactical/generate`,"POST",{commandId:randomUUID(),name:`Bundled ${stil} ${setting}`,keim:`desktop-assets-${stil}-${setting}`,art:"grundriss",stil,optionen:{setting,profil,zellen:[24,20],raeume:5}});
    evidence.assetProbes.push({stil,setting,status:probe.status,...(probe.status===200?{}:{error:probe.body})});
    console.log(`Packaged asset probe ${stil}/${setting}: HTTP ${probe.status}`);
    assert.equal(probe.status,200,JSON.stringify(probe.body));
    const map=await request(`/api/campaigns/${campaignId}/tactical/maps/${probe.body.ack.subjectId}`);assert.equal(map.status,200,JSON.stringify(map.body));
    assert.ok(map.body.document.geometry.stamps.some(stamp=>stamp.a.startsWith(`pk.${stil}/`)),`${stil}/${setting} must retain artwork from its packaged asset pack`);
    record(`packaged ${stil} assets generate and persist ${setting} interiors`);
  }
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
}catch(error){evidence.passed=false;evidence.error=String(error);console.error(error);process.exitCode=1;}
finally{try{await stop();}catch(error){evidence.cleanupError=String(error);process.exitCode=1;}await writeFile(join(run,"evidence.json"),JSON.stringify(evidence,null,2));console.log(`Evidence: ${join(run,"evidence.json")}`);}
