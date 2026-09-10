import { test,expect } from "@playwright/test";
import { randomBytes } from "node:crypto";
import { resolve } from "node:path";
import { createTestDb,migrate,type Db } from "../packages/server/src/db/index.ts";
import { buildApp } from "../packages/server/src/app.ts";

const port=4100+Math.floor(Math.random()*900);
const origin=`http://localhost:${port}`,bootstrapToken=randomBytes(32).toString("hex");
let db:Db,app:Awaited<ReturnType<typeof buildApp>>;
test.beforeAll(async()=>{
  db=await createTestDb();await migrate(db);
  app=await buildApp(db,{origin,bootstrapToken,cookieSecret:randomBytes(32).toString("hex"),staticRoot:resolve("packages/client/dist")});
  await app.listen({host:"127.0.0.1",port});
});
test.afterAll(async()=>{await app?.close();await db?.close();});

test("real browser WebAuthn registration/login verifies signatures, consumes challenges and honors revocation",async({page,context})=>{
  // Virtual authenticator supplies a real WebAuthn response through the browser API.
  // This verifies the ceremony, not a particular physical device or synced-passkey provider.
  // Protocol reference: https://chromedevtools.github.io/devtools-protocol/tot/WebAuthn/
  const cdp=await context.newCDPSession(page);
  await cdp.send("WebAuthn.enable");
  const {authenticatorId}=await cdp.send("WebAuthn.addVirtualAuthenticator",{options:{protocol:"ctap2",transport:"internal",hasResidentKey:true,hasUserVerification:true,isUserVerified:true,automaticPresenceSimulation:true}});
  const errors:string[]=[];page.on("pageerror",e=>errors.push(e.message));
  await page.goto(origin);
  await page.getByLabel("Dein Name",{exact:true}).fill("Passkey Test");
  await page.getByLabel("Einrichtungsschlüssel").fill(bootstrapToken);
  await page.getByRole("button",{name:"Chronik einrichten"}).click();
  await page.getByRole("button",{name:"Einstellungen"}).click();
  const initial=await (await page.request.get(`${origin}/api/me`)).json();
  await page.getByRole("button",{name:"Passkey einrichten",exact:true}).click();
  await expect(page.getByText("Dein Passkey wurde eingerichtet.")).toBeVisible();
  const credentials=await (await page.request.get(`${origin}/api/credentials`)).json() as {id:string;kind:string}[];
  const passkey=credentials.find(c=>c.kind==="passkey")!;expect(passkey).toBeTruthy();
  await page.getByRole("button",{name:"Abmelden",exact:true}).click();
  expect((await page.request.get(`${origin}/api/me`)).status()).toBe(404);
  const assertion=page.waitForRequest(r=>r.url()===`${origin}/api/passkeys/login`&&r.method()==="POST");
  await page.getByRole("button",{name:"Mit Passkey anmelden",exact:true}).click();
  await expect(page.getByRole("button",{name:"Einstellungen"})).toBeVisible();
  const signedResponse=(await assertion).postDataJSON();
  const returned=await (await page.request.get(`${origin}/api/me`)).json();
  expect(returned.userId).toBe(initial.userId);expect(returned.credentialId).not.toBe(initial.credentialId);
  const replay=await page.request.post(`${origin}/api/passkeys/login`,{headers:{origin},data:signedResponse});expect(replay.status()).toBe(404);
  expect((await page.request.delete(`${origin}/api/credentials/${encodeURIComponent(passkey.id)}`,{headers:{origin}})).status()).toBe(200);
  // Revoking the parent authenticator also closes sessions derived from that passkey.
  expect((await page.request.get(`${origin}/api/me`)).status()).toBe(404);
  await page.reload();
  const revokedAttempt=page.waitForResponse(r=>r.url()===`${origin}/api/passkeys/login`);
  await page.getByRole("button",{name:"Mit Passkey anmelden",exact:true}).click();
  expect((await revokedAttempt).status()).toBe(404);
  expect(errors).toEqual([]);
  await cdp.send("WebAuthn.removeVirtualAuthenticator",{authenticatorId});await cdp.detach();
});
