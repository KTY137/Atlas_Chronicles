import { _electron as electron } from "playwright";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { join } from "node:path";

const root=fileURLToPath(new URL("../../../",import.meta.url));
const run=join(root,".local/desktop-profiles",`smoke-${Date.now()}-${randomUUID().slice(0,8)}`);
await mkdir(run,{recursive:true});
const artifactFlag=process.argv.find(value=>value.startsWith("--executable="));
const executable=artifactFlag?artifactFlag.slice("--executable=".length):fileURLToPath(new URL("../../../node_modules/electron/dist/electron.exe",import.meta.url));
const entry=join(root,"packages/desktop/dist");
const options={executablePath:executable,args:[...artifactFlag?[]:[entry],`--user-data=${join(run,"user-data")}`],env:Object.fromEntries(Object.entries(process.env).filter(([key])=>!["ELECTRON_RUN_AS_NODE","NODE_OPTIONS","DATABASE_URL","COOKIE_SECRET"].includes(key))),timeout:90000};
let application,manager,game,profileId,origin,gmId,campaignId,bundle;
const evidence={schema:"chronicle-desktop-smoke/1",run,checks:[]};
const record=name=>{evidence.checks.push(name);console.log(`PASS ${name}`);};
async function launch(){application=await electron.launch(options);manager=await application.firstWindow();manager.setDefaultTimeout(30000);await manager.waitForURL("chronicle-shell://app/index.html");await manager.waitForSelector("#create-form");console.log("Desktop manager loaded.");}
async function invoke(request){const result=await manager.evaluate(request=>window.chronicleDesktop.invoke(request),request);assert.equal(result.ok,true,result.error);return result.value;}
async function request(path,method="GET",body){return game.evaluate(async({path,method,body})=>{const response=await fetch(path,{method,headers:body?{"Content-Type":"application/json"}:{},...(body?{body:JSON.stringify(body)}:{})});return{status:response.status,body:await response.json()};},{path,method,body});}
async function stop(){if(application){try{await invoke({kind:"stop"});await application.close();}finally{application=undefined;}}}
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
  const [createdGame]=await Promise.all([application.waitForEvent("window"),manager.locator("#gm-name").fill("Desktop GM").then(()=>manager.getByRole("button",{name:"Spielleitung einrichten",exact:true}).click())]);game=createdGame;await game.waitForLoadState();
  const identity=await request("/api/me");assert.equal(identity.status,200);gmId=identity.body.userId;
  const created=await request("/api/campaigns","POST",{name:"Persistent desktop campaign"});assert.equal(created.status,200);campaignId=created.body.id;
  const entry=await request(`/api/campaigns/${campaignId}/entries`,"POST",{title:"Survives restart",passages:[{inhalt:{kind:"absatz",inhalt:[{text:"Written in the genuine desktop host.",marks:[]}]}}]});assert.equal(entry.status,200);
  const generated=await request(`/api/campaigns/${campaignId}/tactical/generate`,"POST",{commandId:randomUUID(),name:"Bundled floorplan",keim:"desktop-runtime-smoke"});assert.equal(generated.status,200,JSON.stringify(generated.body));
  record("real generator route reads packaged licensed Grundriss assets and persists native tactical map");
  await game.goto(`${origin}/?campaign=${campaignId}&stage=schmiede`);
  const template=game.getByRole("region",{name:"How to be a Hero Vorlage"});
  await template.getByRole("button",{name:"HTBAH-Vorlage anpassen",exact:true}).click();
  await template.getByRole("button",{name:/HTBAH als Regelentwurf/}).click();
  for(const [suffix,label] of [["/rules/preview",/^Aktivierung pr/],["/rules",/^Version installieren$/],["/rules/activate",/^Gepr.*Version.*aktivieren$/]]){
    const response=game.waitForResponse(response=>response.url()===`${origin}/api/campaigns/${campaignId}${suffix}`&&response.request().method()==="POST");
    await game.getByRole("button",{name:label}).click();assert.equal((await response).status(),200);
  }
  const exported=await request(`/api/campaigns/${campaignId}/export`);assert.equal(exported.status,200);bundle=exported.body;assert.equal(bundle.version,5);assert.ok(JSON.stringify(bundle.tables).includes("CC-BY-NC-SA-4.0"));
  record("shared packaged client installs and activates HTBAH V2 rules and exports attributed native V5");
  record("native first setup installs HttpOnly cookie and shared client writes campaign/article");
  assert.equal(await game.evaluate(()=>typeof window.chronicleDesktop),"undefined");
  const prefs=await application.evaluate(({BrowserWindow})=>BrowserWindow.getAllWindows().map(window=>window.webContents.getLastWebPreferences()));assert.ok(prefs.every(pref=>pref.nodeIntegration===false&&pref.contextIsolation===true&&pref.sandbox===true&&pref.webSecurity===true));
  const cookies=await application.evaluate(async({BrowserWindow},origin)=>{const window=BrowserWindow.getAllWindows().find(window=>window.webContents.getURL().startsWith(origin));return(await window.webContents.session.cookies.get({name:"chronicle_session"})).map(cookie=>({httpOnly:cookie.httpOnly,secure:cookie.secure,sameSite:cookie.sameSite}));},origin);
  assert.ok(cookies.some(cookie=>cookie.httpOnly&&cookie.secure&&cookie.sameSite==="strict"));
  record("isolated game has no management bridge; all windows sandboxed and cookie flags preserved");
  await manager.screenshot({path:join(run,"manager.png"),fullPage:true});await game.screenshot({path:join(run,"game.png"),fullPage:true});
  await stop();record("Fastify drain, pool close and verified own PG smart-stop complete");
  await launch();await invoke({kind:"start",profileId});
  const [reopened]=await Promise.all([application.waitForEvent("window"),invoke({kind:"open"})]);game=reopened;await game.waitForLoadState();
  assert.equal((await request("/api/me")).body.userId,gmId);assert.equal((await request("/api/campaigns")).body.some(campaign=>campaign.id===campaignId),true);
  const again=await request(`/api/campaigns/${campaignId}/export`);assert.equal(again.body.manifest.contentHash,bundle.manifest.contentHash);
  record("full Electron exit/relaunch reopens same profile, stable origin, cookie and semantic campaign hash");
  const originalCredential=(await request("/api/me")).body.credentialId;
  const point=await invoke({kind:"backup"});assert.ok(point.recoveryId);assert.equal(game.isClosed(),true);
  await invoke({kind:"recovery-restore",recoveryId:point.recoveryId,name:"Complete host recovery"});
  const[recoveredGame]=await Promise.all([application.waitForEvent("window"),invoke({kind:"open"})]);game=recoveredGame;await game.waitForLoadState();
  const recoveredMe=await request("/api/me");assert.equal(recoveredMe.status,200);assert.equal(recoveredMe.body.userId,gmId);assert.equal(recoveredMe.body.credentialId,originalCredential);
  assert.equal((await request(`/api/campaigns/${campaignId}/export`)).body.manifest.contentHash,bundle.manifest.contentHash);
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
  const [targetGame]=await Promise.all([application.waitForEvent("window"),invoke({kind:"open"})]);game=targetGame;await game.waitForLoadState();
  const paired=await request("/api/pairing/redeem","POST",{code:enrollment.code});assert.equal(paired.status,200);assert.equal((await request("/api/me")).body.userId,gmId);
  const targetExport=await request(`/api/campaigns/${campaignId}/export`);assert.equal(targetExport.status,200);assert.equal(targetExport.body.manifest.contentHash,bundle.manifest.contentHash);
  assert.notEqual((await request("/api/pairing/redeem","POST",{code:enrollment.code})).status,200);
  record(`native V${bundle.version} restores only into new profile, explicit historical GM enrolls once, semantic reexport equals source`);
  await stop();
  const disk=JSON.parse(await readFile(join(run,"user-data/profiles",profileId,"profile.json"),"utf8"));assert.notEqual(disk.pgPort,54329);
  const encrypted=await readFile(join(run,"user-data/profiles",profileId,"secrets.dpapi"));assert.ok(!encrypted.includes(Buffer.from("cookieSecret")));
  record("DPAPI ciphertext persisted; original development ports and configuration never selected");
  evidence.passed=true;
}catch(error){evidence.passed=false;evidence.error=String(error);console.error(error);process.exitCode=1;}
finally{try{await stop();}catch(error){evidence.cleanupError=String(error);process.exitCode=1;}await writeFile(join(run,"evidence.json"),JSON.stringify(evidence,null,2));console.log(`Evidence: ${join(run,"evidence.json")}`);}
