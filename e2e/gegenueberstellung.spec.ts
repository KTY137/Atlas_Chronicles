import { test, expect } from "@playwright/test";
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
test.beforeAll(async ()=>{
  const settings=process.env["E2E_DATABASE_URL"] ? null : JSON.parse(await readFile(".local/config.json","utf8"));
  const base=process.env["E2E_DATABASE_URL"] ?? settings.databaseUrl;
  admin=createPgDb(base); await admin.query(`CREATE SCHEMA "${schema}"`);
  const url=new URL(base); url.searchParams.set("options",`-c search_path=${schema}`); databaseUrl=url.href;
  db=createPgDb(databaseUrl); await migrate(db); app=await buildApp(db,config); await app.listen({host:"127.0.0.1",port});
  await mkdir("test-results",{recursive:true});
});
test.afterAll(async ()=>{
  await app?.close(); await db?.close();
  if(admin) { if(!/^chronicle_e2e_[a-f0-9]{32}$/.test(schema)) throw new Error("Unexpected test schema"); await admin.query(`DROP SCHEMA "${schema}" CASCADE`); await admin.close(); }
});

test("Die Gegenüberstellung: derselbe Artikel für zwei Figuren, Abweichungen markiert", async ({browser,page:gm})=>{
  const errors:string[]=[]; gm.on("pageerror",e=>errors.push(e.message));
  await gm.goto(origin); await gm.getByLabel("Dein Name",{exact:true}).fill("Kaya");
  await gm.getByLabel("Einrichtungsschlüssel").fill(bootstrapToken);
  await gm.getByRole("button",{name:"Chronik einrichten"}).click();
  await gm.getByLabel("Name der Kampagne").fill("Die Mühle am Fluss");
  await gm.getByRole("button",{name:"Kampagne anlegen"}).click();
  await expect(gm.getByRole("heading",{name:"Die Mühle am Fluss"})).toBeVisible();
  await gm.getByRole("button",{name:"Runde",exact:true}).click();
  await gm.getByRole("button",{name:"Einladung erstellen"}).click();
  const invite=await gm.getByLabel("Einladungslink",{exact:true}).inputValue();
  for(const name of ["Sera","Dorn"]) {
    const context=await browser.newContext(); const p=await context.newPage();
    await p.goto(invite); await p.getByLabel("Dein Name in der Runde").fill(name); await p.getByRole("button",{name:"Beitritt anfragen"}).click();
    await gm.locator(".requests-panel li").filter({hasText:name}).getByRole("button",{name:"Freigeben"}).click();
    await p.getByRole("button",{name:"Die Runde betreten"}).click();
    await expect(p.getByRole("button",{name:"Chronik",exact:true})).toBeEnabled();
    await context.close();
  }
  await gm.getByRole("button",{name:"Chronik",exact:true}).click();
  await gm.getByRole("button",{name:"Artikel anlegen",exact:true}).click();
  await gm.getByLabel("Artikeltitel").fill("Das versiegelte Archiv");
  await gm.getByLabel("Text der Passage 1",{exact:true}).fill("Beide kennen den Torbogen.");
  await gm.getByRole("button",{name:"Passage hinzufügen"}).click();
  await gm.getByLabel("Text der Passage 2",{exact:true}).fill("SERAS GEHEIMNIS: Der Mondschluessel liegt im Turm.");
  await gm.getByRole("button",{name:"Passage hinzufügen"}).click();
  await gm.getByLabel("Text der Passage 3",{exact:true}).fill("DORNS GEHEIMNIS: Der Rat kennt den verborgenen Pfad.");
  await gm.getByRole("button",{name:"Passage hinzufügen"}).click();
  await gm.getByLabel("Text der Passage 4",{exact:true}).fill("NIEMANDS WISSEN: Die Mühle brannte zweimal.");
  await gm.getByRole("button",{name:"Speichern",exact:true}).click();
  await expect(gm.getByRole("heading",{name:"Das versiegelte Archiv"})).toBeVisible();
  for(const [index,name] of [[0,"Sera"],[0,"Dorn"],[1,"Sera"],[2,"Dorn"]] as const) {
    const passage=gm.locator("article .passage").nth(index);
    await passage.getByRole("combobox").selectOption({label:name}); await passage.getByRole("button",{name:"Freigeben"}).click();
    await expect(gm.getByText("Die Passage ist jetzt für diese Figur freigegeben.")).toBeVisible();
  }

  // Die vorhandenen Werkzeuge der Spielleitung bleiben unverändert erreichbar.
  await expect(gm.getByRole("button",{name:"Historie"})).toBeVisible();
  await expect(gm.getByRole("button",{name:"Bearbeiten"})).toBeVisible();

  await gm.getByRole("button",{name:"Gegenüberstellung"}).click();
  const panel=gm.locator(".gegenueberstellung");
  await panel.getByLabel("Linke Figur").selectOption({label:"Sera"});
  await panel.getByLabel("Rechte Figur").selectOption({label:"Dorn"});
  const links=panel.locator(".spalte").first(), rechts=panel.locator(".spalte").last();
  await expect(links.getByRole("heading",{name:"Sera"})).toBeVisible();
  await expect(rechts.getByRole("heading",{name:"Dorn"})).toBeVisible();
  await expect(links).toContainText("SERAS GEHEIMNIS");
  await expect(links).not.toContainText("DORNS GEHEIMNIS");
  await expect(rechts).toContainText("DORNS GEHEIMNIS");
  await expect(rechts).not.toContainText("SERAS GEHEIMNIS");
  for(const column of [links,rechts]) {
    await expect(column).toContainText("Beide kennen den Torbogen.");
    await expect(column).not.toContainText("NIEMANDS WISSEN");
  }
  await expect(panel.locator('[data-seite="nur-links"]')).toHaveCount(1);
  await expect(panel.locator('[data-seite="nur-rechts"]')).toHaveCount(1);
  await expect(panel.locator('[data-seite="beide"]')).toHaveCount(2);

  await panel.getByRole("button",{name:"Schließen"}).click();
  await expect(gm.locator(".gegenueberstellung")).toHaveCount(0);
  await expect(gm.getByRole("heading",{name:"Das versiegelte Archiv"})).toBeVisible();
  expect(errors).toEqual([]);
});
