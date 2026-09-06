import { test, expect, type BrowserContext, type Page } from "@playwright/test";
import { randomBytes, randomUUID } from "node:crypto";
import { readFile, mkdir } from "node:fs/promises";
import { resolve } from "node:path";
import { createPgDb, migrate, type Db } from "../packages/server/src/db/index.ts";
import { buildApp } from "../packages/server/src/app.ts";

// A fresh isolated schema on the real Postgres service, never the developer's campaign tables.
const schema=`chronicle_e2e_${randomUUID().replaceAll("-","")}`;
const port=3100+Math.floor(Math.random()*900);
const origin=`http://localhost:${port}`, bootstrapToken=randomBytes(32).toString("hex"), cookieSecret=randomBytes(32).toString("hex");
let admin:Db, db:Db, app:Awaited<ReturnType<typeof buildApp>>, databaseUrl:string;
const config={origin,bootstrapToken,cookieSecret,staticRoot:resolve("packages/client/dist")};
async function start() { db=createPgDb(databaseUrl); await migrate(db); app=await buildApp(db,config); await app.listen({host:"127.0.0.1",port}); }
test.beforeAll(async ()=>{
  const settings=process.env["E2E_DATABASE_URL"] ? null : JSON.parse(await readFile(".local/config.json","utf8"));
  const base=process.env["E2E_DATABASE_URL"] ?? settings.databaseUrl;
  admin=createPgDb(base); await admin.query(`CREATE SCHEMA "${schema}"`);
  const url=new URL(base); url.searchParams.set("options",`-c search_path=${schema}`); databaseUrl=url.href;
  await start(); await mkdir("test-results",{recursive:true});
});
test.afterAll(async ()=>{
  await app?.close(); await db?.close();
  if(admin) { if(!/^chronicle_e2e_[a-f0-9]{32}$/.test(schema)) throw new Error("Unexpected test schema"); await admin.query(`DROP SCHEMA "${schema}" CASCADE`); await admin.close(); }
});

test("GM and two players: UI join, private passages, conflict, real server restart and revoked access", async ({browser,page:gm})=>{
  const errors:string[]=[]; gm.on("pageerror",e=>errors.push(e.message));
  await gm.goto(origin); await gm.getByLabel("Dein Name",{exact:true}).fill("Kaya");
  await gm.getByLabel("Einrichtungsschlüssel").fill(bootstrapToken);
  await gm.getByRole("button",{name:"Chronik einrichten"}).click();
  await gm.getByLabel("Name der Kampagne").fill("Die drei Bücher");
  await gm.getByRole("button",{name:"Kampagne anlegen"}).click();
  await expect(gm.getByRole("heading",{name:"Die Chronik"})).toBeVisible();
  const campaignId=new URL(gm.url()).searchParams.get("campaign")!;
  await gm.getByRole("button",{name:"Runde",exact:true}).click();
  await gm.getByRole("button",{name:"Einladung erstellen"}).click();
  const invite=await gm.getByLabel("Einladungslink",{exact:true}).inputValue();
  const contexts:BrowserContext[]=[], pages:Page[]=[];
  for(const name of ["Sera","Dorn"]) {
    const context=await browser.newContext(); contexts.push(context); const p=await context.newPage(); pages.push(p); p.on("pageerror",e=>errors.push(e.message));
    await p.goto(invite); await p.getByLabel("Dein Name in der Runde").fill(name); await p.getByRole("button",{name:"Beitritt anfragen"}).click();
    await gm.locator(".requests-panel li").filter({hasText:name}).getByRole("button",{name:"Freigeben"}).click();
    await p.getByRole("button",{name:"Die Runde betreten"}).click();
    await expect(p.getByRole("heading",{name:"Die Chronik"})).toBeVisible();
  }
  await gm.getByRole("button",{name:"Chronik",exact:true}).click();
  await gm.getByRole("button",{name:"Artikel anlegen",exact:true}).click();
  await gm.getByLabel("Artikeltitel").fill("Das versiegelte Archiv");
  await gm.getByLabel("Text der Passage 1",{exact:true}).fill("SERAS GEHEIMNIS: Der Mondschlüssel liegt im Turm.");
  await gm.getByRole("button",{name:"Passage hinzufügen"}).click();
  await gm.getByLabel("Text der Passage 2",{exact:true}).fill("DORNS GEHEIMNIS: Der Rat kennt den verborgenen Pfad.");
  await gm.getByRole("button",{name:"Speichern",exact:true}).click();
  await expect(gm.getByRole("heading",{name:"Das versiegelte Archiv"})).toBeVisible();
  const entryId=new URL(gm.url()).searchParams.get("entry")!;
  for(const [index,name] of ["Sera","Dorn"].entries()) {
    const passage=gm.locator("article .passage").nth(index);
    await passage.getByRole("combobox").selectOption({label:name}); await passage.getByRole("button",{name:"Freigeben"}).click();
    await expect(gm.getByText("Die Passage ist jetzt für diese Figur freigegeben.")).toBeVisible();
  }
  const [sera,dorn]=pages as [Page,Page];
  const entryUrl=`${origin}/?campaign=${campaignId}&entry=${entryId}`;
  const bodies:string[]=[];
  for(const [index,p] of pages.entries()) {
    const payload=p.waitForResponse(r=>r.url()===`${origin}/api/campaigns/${campaignId}/entries/${entryId}/umbruch`);
    await p.goto(entryUrl); bodies.push(await (await payload).text());
    await expect(p.locator("article")).toContainText(index===0?"SERAS GEHEIMNIS":"DORNS GEHEIMNIS");
    await expect(p.locator("body")).not.toContainText(index===0?"DORNS GEHEIMNIS":"SERAS GEHEIMNIS");
    expect(bodies[index]).not.toContain(index===0?"DORNS GEHEIMNIS":"SERAS GEHEIMNIS");
    expect(bodies[index]).not.toMatch(/revelations|gepraegtDurch|actor_id|universe_id/);
  }
  await gm.screenshot({path:"test-results/wiki-gm.png",fullPage:true}); await sera.screenshot({path:"test-results/wiki-sera.png",fullPage:true});
  await sera.setViewportSize({width:390,height:844});
  expect(await sera.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  await sera.screenshot({path:"test-results/wiki-phone.png",fullPage:true});

  // Two real GM tabs preserve a stale draft instead of silently overwriting.
  const gm2=await gm.context().newPage(); await gm2.goto(entryUrl);
  await gm.getByRole("button",{name:"Bearbeiten",exact:true}).click(); await gm2.getByRole("button",{name:"Bearbeiten",exact:true}).click();
  await gm.getByLabel("Text der Passage 1",{exact:true}).fill("SERAS GEHEIMNIS: Der Mondschlüssel liegt jetzt im Hof.");
  await gm.getByRole("button",{name:"Speichern",exact:true}).click(); await expect(gm.getByText("Artikel gespeichert.")).toBeVisible();
  await gm2.getByLabel("Text der Passage 1",{exact:true}).fill("Mein noch nicht gespeicherter Entwurf");
  await gm2.getByRole("button",{name:"Speichern",exact:true}).click();
  await expect(gm2.getByText(/Dein Entwurf bleibt erhalten/)).toBeVisible();
  await expect(gm2.getByLabel("Text der Passage 1",{exact:true})).toHaveValue("Mein noch nicht gespeicherter Entwurf"); await gm2.close();

  // Close all app connections and the DB pool, then reopen the same persisted Postgres schema.
  console.info("E2E: completed UI conflict; stopping HTTP");
  await test.step("Stop the HTTP listener",async()=>app.close());
  console.info("E2E: closing database pool");
  await test.step("Close the Postgres pool",async()=>db.close());
  console.info("E2E: restarting app");
  await test.step("Reopen the persisted campaign",start);
  console.info("E2E: restarted; reopening player books");
  for(const p of pages) { await p.reload(); await expect(p.getByRole("heading",{name:"Das versiegelte Archiv"})).toBeVisible(); }
  await expect(sera.locator("article")).toContainText("jetzt im Hof"); await expect(dorn.locator("article")).not.toContainText("SERAS GEHEIMNIS");
  const state=await contexts[0]!.storageState(); await contexts[0]!.close();
  const returning=await browser.newContext({storageState:state}); const restored=await returning.newPage(); await restored.goto(entryUrl);
  await expect(restored.locator("article")).toContainText("jetzt im Hof");
  const me=await (await restored.request.get(`${origin}/api/me`)).json();
  expect((await restored.request.delete(`${origin}/api/credentials/${me.credentialId}`,{headers:{origin}})).status()).toBe(200);
  expect((await restored.request.get(`${origin}/api/campaigns/${campaignId}/entries/${entryId}`)).status()).toBe(404);
  await gm.getByRole("button",{name:"Runde",exact:true}).click();
  const invites=await (await gm.request.get(`${origin}/api/campaigns/${campaignId}/invitations`)).json();
  expect((await gm.request.delete(`${origin}/api/campaigns/${campaignId}/invitations/${invites[0].id}`,{headers:{origin}})).status()).toBe(200);
  const code=new URL(invite).searchParams.get("join");
  expect((await restored.request.post(`${origin}/join/${code}`,{headers:{origin},data:{displayName:"Zu spät"}})).status()).toBe(404);
  expect(errors).toEqual([]); await returning.close(); await contexts[1]!.close();
});
