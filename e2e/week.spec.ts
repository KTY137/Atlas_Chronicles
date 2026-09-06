import { test, expect, type BrowserContext, type Page } from "@playwright/test";
import { createHash, randomBytes, randomUUID } from "node:crypto";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { stableJson } from "@chronicle/rules";
import { buildApp } from "../packages/server/src/app.ts";
import { createPgDb, migrate, type Db } from "../packages/server/src/db/index.ts";
import { createIdentity } from "../packages/server/src/identity/index.ts";
import { createCampaigns } from "../packages/server/src/domain/campaigns.ts";
import { createDocuments } from "../packages/server/src/domain/documents.ts";
import { createGameplay } from "../packages/server/src/domain/gameplay.ts";
import type { FictionClock, LetterDetail, WeekDifference } from "../packages/client/src/features/week-api";

const schema = `chronicle_week_e2e_${randomUUID().replaceAll("-", "")}`;
const port = 6100 + Math.floor(Math.random() * 900), origin = `http://localhost:${port}`;
const config = { origin, bootstrapToken: randomBytes(32).toString("hex"), cookieSecret: randomBytes(32).toString("hex"), staticRoot: resolve("packages/client/dist") };
const title = "Die Wege am Frosttor";
const senderText = "Sera kennt den alten Weg über die gefrorene Brücke.";
const recipientText = "Brannt kennt den Garten hinter dem Tor.";
const hiddenText = "NUR SPIELLEITUNG: Unter dem Frosttor schläft der Schattenrat.";
const note = "Brannt, dieser Weg führt dich sicher zurück. Eine persönliche Notiz.";
let admin: Db, db: Db, app: Awaited<ReturnType<typeof buildApp>>;
let campaignId: string, entryId: string, senderPassage: string, recipientPassage: string, doorId: string;
let senderActor: string, recipientActor: string;
type Session = Awaited<ReturnType<ReturnType<typeof createIdentity>["issueSession"]>>;
let gmSession: Session, senderSession: Session, recipientSession: Session;

test.beforeAll(async () => {
  // Use an isolated schema on the actual Postgres service, never the working campaign schema.
  const settings = process.env["E2E_DATABASE_URL"] ? null : JSON.parse(await readFile(".local/config.json", "utf8"));
  const base = process.env["E2E_DATABASE_URL"] ?? settings.databaseUrl;
  admin = createPgDb(base); await admin.query(`CREATE SCHEMA "${schema}"`);
  const url = new URL(base); url.searchParams.set("options", `-c search_path=${schema}`);
  db = createPgDb(url.href); await migrate(db);
  const identity = createIdentity(db, config), campaigns = createCampaigns(db), documents = createDocuments(db), game = createGameplay(db);
  const gm = await identity.bootstrap("Kaya"); gmSession = gm;
  campaignId = (await campaigns.createCampaign(gm.userId, { name: "Die Woche am Frosttor" })).id;
  const invitation = await campaigns.issueInvitation(gm.userId, campaignId);
  const approved = [];
  for (const displayName of ["Sera", "Brannt"]) {
    const request = await campaigns.requestJoin(invitation.code, { displayName });
    const member = await campaigns.approveJoin(gm.userId, campaignId, request.id);
    await campaigns.claimJoin(request.id, request.pollToken);
    approved.push({ ...member, session: await identity.issueSession(member.userId) });
  }
  senderActor = approved[0]!.actorId; senderSession = approved[0]!.session;
  recipientActor = approved[1]!.actorId; recipientSession = approved[1]!.session;
  const document = await documents.saveEntry(gm.userId, campaignId, { title, passages: [senderText, recipientText, hiddenText].map(text => ({ inhalt: { kind: "absatz" as const, inhalt: [{ text, marks: [] }] }, tags: ["spuren"] })) });
  entryId = document.entryId; senderPassage = document.passagen[0]!.pid; recipientPassage = document.passagen[1]!.pid;
  await documents.revealPassage(gm.userId, campaignId, senderPassage, senderActor);
  await documents.revealPassage(gm.userId, campaignId, recipientPassage, recipientActor);
  const scene = await game.createScene(gm.userId, campaignId, { name: "Der letzte gemeinsame Abend", entryIds: [entryId], fictionDate: "Zehnter Frosttag" });
  await game.startScene(gm.userId, campaignId, scene.id);
  doorId = (await game.issueVollmacht(gm.userId, campaignId, { commandId: randomUUID(), actorId: senderActor, passageId: document.passagen[2]!.pid, actionId: "investigate", threshold: 5, expiresAt: Date.now() + 86_400_000, budgetKind: "player", fictionDate: "Dreizehnter Frosttag" })).id;
  app = await buildApp(db, config); await app.listen({ host: "127.0.0.1", port });
});

test.afterAll(async () => {
  await app?.close(); await db?.close();
  if (admin) {
    if (!/^chronicle_week_e2e_[a-f0-9]{32}$/.test(schema)) throw new Error("Unexpected week test schema");
    await admin.query(`DROP SCHEMA "${schema}" CASCADE`); await admin.close();
  }
});

async function signIn(context: BrowserContext, session: Session) {
  await context.addCookies([{ name: "chronicle_session", value: session.value, url: origin, httpOnly: true, secure: true, sameSite: "Strict", expires: Math.floor(session.expiresAt / 1000) }]);
}
async function setClock(page: Page, base: string, day: number, label: string, postDays: number) {
  await page.getByLabel("Fortlaufender Tag", { exact: true }).fill(String(day));
  await page.getByLabel("Datum in eurer Welt", { exact: true }).fill(label);
  await page.getByLabel("Postlaufzeit in Tagen", { exact: true }).fill(String(postDays));
  const saved = page.waitForResponse(response => response.url() === `${base}/week/clock` && response.request().method() === "PUT");
  await page.getByRole("button", { name: "Weltzeit speichern", exact: true }).click();
  const response = await saved; expect(response.status()).toBe(200);
  expect(await response.json() as FictionClock).toMatchObject({ day, label, postDays });
  await expect(page.locator(".week-clock-now")).toHaveText(`${label} · Tag ${day}`);
}

test("M6: a seeded article passage becomes delayed hearsay, a frozen receipt, inline unread knowledge and a GM difference", async ({ browser, page: gm }) => {
  const senderContext = await browser.newContext(), recipientContext = await browser.newContext();
  const sender = await senderContext.newPage(), recipient = await recipientContext.newPage();
  const errors: string[] = [];
  for (const page of [gm, sender, recipient]) page.on("pageerror", error => errors.push(error.message));
  const base = `${origin}/api/campaigns/${campaignId}`, book = `${origin}/?campaign=${campaignId}&entry=${entryId}`;
  try {
    await signIn(gm.context(), gmSession); await signIn(senderContext, senderSession); await signIn(recipientContext, recipientSession);
    await Promise.all([gm.goto(`${origin}/?campaign=${campaignId}&stage=woche`), sender.goto(book), recipient.goto(book)]);
    for (const page of [gm, sender, recipient]) await expect(page.getByRole("status", { name: "Live-Verbindung", exact: true })).toHaveAttribute("data-live-state", "connected");

    await test.step("Read the recipient's current article, without revealing another passage", async () => {
      await expect(recipient.getByRole("heading", { name: title, exact: true })).toBeVisible();
      await expect(recipient.locator("article.article-body")).toContainText(recipientText);
      await expect(recipient.locator("body")).not.toContainText(senderText);
      await expect(recipient.locator("body")).not.toContainText(hiddenText);
      const marked = recipient.waitForResponse(response => response.url() === `${base}/entries/${entryId}/read` && response.request().method() === "POST");
      await recipient.getByRole("button", { name: "Als gelesen markieren", exact: true }).click();
      expect((await marked).status()).toBe(200);
      await expect(recipient.locator(".article-body .passage-unread")).toHaveCount(0);
      await recipient.getByRole("button", { name: "Woche", exact: true }).click();
      await expect(recipient.getByRole("heading", { name: "Die Woche", exact: true })).toBeVisible();
      await expect(recipient.locator(".week-envelopes .week-envelope")).toHaveCount(0);
      await setClock(gm, base, 10, "Zehnter Frosttag", 3);
    });

    let sent!: LetterDetail;
    await test.step("Compose from the actual wiki passage and send an immutable delayed letter", async () => {
      await sender.locator(`#passage-${senderPassage}`).getByRole("button", { name: "In einem Brief weitergeben", exact: true }).click();
      await expect(sender.getByRole("heading", { name: "Die Woche", exact: true })).toBeVisible();
      const composer = sender.locator(".week-composer");
      await expect(composer.locator(".week-selection")).toContainText(senderText);
      await expect(composer).not.toContainText(recipientText); await expect(composer).not.toContainText(hiddenText);
      await composer.getByRole("checkbox", { name: "Brannt", exact: true }).check();
      await composer.getByLabel("Persönlicher Begleittext", { exact: true }).fill(note);
      const responsePromise = sender.waitForResponse(response => response.url() === `${base}/week/letters` && response.request().method() === "POST");
      await composer.getByRole("button", { name: "Brief versiegeln und senden", exact: true }).click();
      const response = await responsePromise; expect(response.status()).toBe(200); sent = await response.json() as LetterDetail;
      expect(response.request().postDataJSON()).toMatchObject({ fromActorId: senderActor, toActorIds: [recipientActor], passageIds: [senderPassage], note });
      expect(sent.arrivalDay).toBe(13); expect(sent.direction).toBe("sent"); expect(sent.noteIsCanon).toBe(false);
      expect(sent.recipients).toEqual([{ actorId: recipientActor, deliveredAt: null, deliveredDay: null, deliveredLabel: null, readAt: null, readDay: null }]);
      expect(sent.articles[0]!.passagen.map(passage => passage.pid)).toEqual([senderPassage]);
      await expect(sender.getByText("Dein Brief ist gespeichert und versiegelt.", { exact: true })).toBeVisible();
      await expect(sender.locator(".week-letter-stage")).toContainText(senderText);
      expect((await db.query("SELECT id FROM letters WHERE campaign_id=$1", [campaignId])).rowCount).toBe(1);
    });

    await test.step("Only the sender sees the envelope before its fictional arrival", async () => {
      expect(await (await recipient.request.get(`${base}/week/letters`)).json()).toEqual([]);
      expect((await recipient.request.get(`${base}/week/letters/${sent.id}`)).status()).toBe(404);
      expect((await gm.request.get(`${base}/week/letters/${sent.id}`)).status()).toBe(404);
      await expect(recipient.locator(".week-envelopes .week-envelope")).toHaveCount(0);
      await expect(recipient.locator("body")).not.toContainText(note);
      await expect(gm.locator(".week-difference")).toContainText("Sera → Brannt");
      await expect(gm.locator(".week-difference")).toContainText("Ankunft ab Tag 13");
      await expect(gm.locator(".week-difference")).not.toContainText(note);
    });

    await test.step("Advance the world clock, open the frozen article and acknowledge the real receipt", async () => {
      await setClock(gm, base, 13, "Dreizehnter Frosttag", 1);
      const envelope = recipient.locator(".week-envelopes .week-envelope").filter({ hasText: "Von Sera" });
      await expect(envelope).toBeVisible();
      const opened = recipient.waitForResponse(response => response.url() === `${base}/week/letters/${sent.id}` && response.request().method() === "GET");
      await envelope.click();
      const response = await opened; expect(response.status()).toBe(200);
      const received = await response.json() as LetterDetail;
      expect(received.direction).toBe("received"); expect(received.recipients.map(row => row.actorId)).toEqual([recipientActor]);
      expect(received.articles).toEqual(sent.articles); expect(received.arrivalDay).toBe(13);
      const receipt = received.delivery[0]!;
      expect(receipt.proof).toMatchObject({ fromActorId: senderActor, toActorId: recipientActor, sentDay: 10, scheduledDay: 13, deliveredDay: 13, deliveredLabel: "Dreizehnter Frosttag" });
      expect(receipt.proof.passages[0]).toMatchObject({ passageId: senderPassage, grant: "current", quelle: { art: "gehoert", von: senderActor } });
      expect(receipt.seal).toBe(createHash("sha256").update(stableJson(receipt.proof)).digest("hex"));
      const stage = recipient.locator(".week-letter-stage");
      await expect(stage).toContainText(senderText); await expect(stage).toContainText(note); await expect(stage).not.toContainText(hiddenText);
      await stage.locator("summary").filter({ hasText: "Quelle dieser Abschrift" }).click();
      await expect(stage.getByText(received.articles[0]!.citations[0]!.sourceRevisionId, { exact: true })).toBeVisible();
      await stage.locator("summary").filter({ hasText: "Versand und Zustellbeleg ansehen" }).click();
      await expect(stage.getByText(receipt.seal, { exact: true })).toBeVisible();
      await expect(stage.getByText(sent.seal, { exact: true })).toBeVisible();
      const read = recipient.waitForResponse(item => item.url() === `${base}/week/letters/${sent.id}/read` && item.request().method() === "POST");
      await stage.getByRole("button", { name: "Brief als gelesen markieren", exact: true }).click();
      const readResponse = await read; expect(readResponse.status()).toBe(200);
      expect((await readResponse.json() as LetterDetail).recipients[0]!.readDay).toBe(13);
      await expect(stage.getByText("Deine Lesebestätigung ist gespeichert.", { exact: true })).toBeVisible();
      await recipient.setViewportSize({ width: 390, height: 844 });
      expect(await recipient.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    });

    await test.step("Read the new passage in its article, then inspect the GM's state difference", async () => {
      await recipient.locator(".week-letter-stage").getByRole("button", { name: "In der Chronik öffnen", exact: true }).click();
      await expect(recipient.getByRole("heading", { name: title, exact: true })).toBeVisible();
      await expect(recipient.locator(`#passage-${senderPassage}`)).toContainText("Neu für dich");
      await expect(recipient.locator(`#passage-${recipientPassage}`)).not.toContainText("Neu für dich");
      await expect(recipient.locator(".article-body .passage-unread")).toHaveCount(1);
      await expect(recipient.locator("body")).not.toContainText(hiddenText);
      const comparison = await (await gm.request.get(`${base}/week/difference`)).json() as WeekDifference;
      expect(comparison.baselineKnown).toBe(true);
      expect(comparison.knowledgeAdded).toHaveLength(1);
      expect(comparison.knowledgeAdded[0]).toMatchObject({ actorId: recipientActor, passageId: senderPassage, entryId, quelle: { art: "gehoert", von: senderActor } });
      expect(comparison.inTransit).toEqual([]);
      const added = gm.locator(".week-difference-entry").filter({ hasText: title });
      await expect(added).toContainText("Brannt"); await expect(added).toContainText("Gehört von Sera");
      expect((await db.query("SELECT id FROM confirmed_mints WHERE campaign_id=$1", [campaignId])).rowCount).toBe(0);
      expect((await db.query<{ geltung: string }>("SELECT geltung FROM passages WHERE id=$1", [senderPassage])).rows[0]!.geltung).toBe("notiz");
      await recipient.getByRole("button", { name: "Als gelesen markieren", exact: true }).click();
      await expect(recipient.locator(".article-body .passage-unread")).toHaveCount(0);
      await recipient.reload(); await expect(recipient.locator(".article-body .passage-unread")).toHaveCount(0);
      await expect(recipient.locator("article.article-body")).toContainText(senderText);
    });

    await test.step("Return to the sender's existing personal door through the Week navigation", async () => {
      await sender.getByRole("button", { name: "Meine Vollmachten öffnen", exact: true }).click();
      await expect(sender.getByRole("tab", { name: "Vollmachten", exact: true })).toHaveAttribute("aria-selected", "true");
      await expect(sender.locator(`#door-${doorId}`)).toBeVisible();
      expect(await (await recipient.request.get(`${base}/vollmachten`)).json()).toEqual([]);
    });
    expect(errors).toEqual([]);
  } finally { await senderContext.close(); await recipientContext.close(); }
});
