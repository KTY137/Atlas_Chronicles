import { test, expect, type BrowserContext } from "@playwright/test";
import { createHash, randomBytes } from "node:crypto";
import { resolve } from "node:path";
import { DEMO_RULE_PACKAGE, stableJson } from "@chronicle/rules";
import { buildApp } from "../packages/server/src/app.ts";
import { createTestDb, migrate, type Db } from "../packages/server/src/db/index.ts";
import { createIdentity } from "../packages/server/src/identity/index.ts";
import { createCampaigns } from "../packages/server/src/domain/campaigns.ts";
import { createDocuments } from "../packages/server/src/domain/documents.ts";
import { createGameplay, type ActionCard, type ActionConfirmation, type SceneCard } from "../packages/server/src/domain/gameplay.ts";

const port = 5100 + Math.floor(Math.random() * 900);
const origin = `http://localhost:${port}`;
const config = { origin, bootstrapToken: randomBytes(32).toString("hex"), cookieSecret: randomBytes(32).toString("hex"), staticRoot: resolve("packages/client/dist") };
const title = "Das Archiv am Nordtor", sceneName = "Vor dem versiegelten Archiv", fictionDate = "16. Nebelmond 842";
const targetText = "Sera öffnet das versiegelte Archiv und findet den verschollenen Wegweiser.";
const hiddenText = "NUR FÜR DIE SPIELLEITUNG: Die Archivarin arbeitet für den Schattenrat.";

// Keep actual server entropy and the complete demo expression. This explicitly versioned
// acceptance package makes success certain after the UI sets Scharfsinn to 6, avoiding
// random test retries or replacement dice/receipt implementations.
const rules = {
  ...DEMO_RULE_PACKAGE,
  id: "org.atlas-chronicles.acceptance-table", name: "Archivprobe – Browserabnahme", version: "1.0.0",
  actions: DEMO_RULE_PACKAGE.actions.map(action => ({ ...action, threshold: 1 })),
};
let db: Db, app: Awaited<ReturnType<typeof buildApp>>;
let campaignId: string, entryId: string, passageId: string, actorId: string;
let gmSession: Awaited<ReturnType<ReturnType<typeof createIdentity>["issueSession"]>>;
let playerSession: typeof gmSession;

test.beforeAll(async () => {
  // A fresh in-memory PostgreSQL engine, not the developer's persisted campaign database.
  db = await createTestDb(); await migrate(db);
  const identity = createIdentity(db, config), campaigns = createCampaigns(db), documents = createDocuments(db), gameplay = createGameplay(db);
  const gm = await identity.bootstrap("Kaya Archivtest"); gmSession = gm;
  const campaign = await campaigns.createCampaign(gm.userId, { name: "Ein Abend mit bleibenden Spuren" }); campaignId = campaign.id;
  const invitation = await campaigns.issueInvitation(gm.userId, campaignId);
  const request = await campaigns.requestJoin(invitation.code, { displayName: "Sera Archivtest" });
  const approved = await campaigns.approveJoin(gm.userId, campaignId, request.id); actorId = approved.actorId;
  const claimed = await campaigns.claimJoin(request.id, request.pollToken);
  playerSession = await identity.issueSession(claimed.userId);
  const entry = await documents.saveEntry(gm.userId, campaignId, {
    title, passages: [targetText, hiddenText].map(text => ({ inhalt: { kind: "absatz" as const, inhalt: [{ text, marks: [] }] }, tags: ["spuren"] })),
  });
  entryId = entry.entryId; passageId = entry.passagen[0]!.pid;
  await gameplay.installPackage(gm.userId, campaignId, rules);
  await gameplay.activatePackage(gm.userId, campaignId, { packageId: rules.id, packageVersion: rules.version, expectedVersion: 0 });
  app = await buildApp(db, config); await app.listen({ host: "127.0.0.1", port });
});

test.afterAll(async () => { await app?.close(); await db?.close(); });

async function signIn(context: BrowserContext, session: typeof gmSession) {
  await context.addCookies([{ name: "chronicle_session", value: session.value, url: origin, httpOnly: true, secure: true, sameSite: "Strict", expires: Math.floor(session.expiresAt / 1000) }]);
}

test("M4: prepare a scene, save a sheet, roll, confirm explicitly and read the dated wiki evidence", async ({ browser, page: gm }) => {
  const playerContext = await browser.newContext();
  const player = await playerContext.newPage();
  const errors: string[] = [];
  for (const page of [gm, player]) page.on("pageerror", error => errors.push(error.message));
  const base = `${origin}/api/campaigns/${campaignId}`;
  try {
    await signIn(gm.context(), gmSession); await signIn(playerContext, playerSession);
    await gm.goto(`${origin}/?campaign=${campaignId}&entry=${entryId}`);
    await expect(gm.getByRole("status", { name: "Live-Verbindung", exact: true })).toHaveAttribute("data-live-state", "connected");
    await expect(gm.getByRole("heading", { name: title, exact: true })).toBeVisible();
    const targetPassage = gm.locator(`#passage-${passageId}`);
    await targetPassage.locator("summary").filter({ hasText: "Herkunft ansehen" }).click();
    await expect(targetPassage.getByText("Für diese Passage wurde noch kein Kanonbeleg bestätigt.", { exact: true })).toBeVisible();

    await player.goto(`${origin}/?campaign=${campaignId}`);
    await expect(player.getByRole("status", { name: "Live-Verbindung", exact: true })).toHaveAttribute("data-live-state", "connected");
    await expect(player.getByRole("heading", { name: "Die Chronik", exact: true })).toBeVisible();
    await expect(player.locator(".entry-list button")).toHaveCount(0);
    expect((await player.request.get(`${base}/entries/${entryId}`)).status()).toBe(404);
    await expect(player.locator("body")).not.toContainText(targetText);
    await expect(player.locator("body")).not.toContainText(hiddenText);

    let scene: SceneCard;
    await test.step("Prepare and open a scene using the actual table UI", async () => {
      await gm.getByRole("button", { name: "Tisch", exact: true }).click();
      await expect(gm.getByRole("heading", { name: "Am Tisch", exact: true })).toBeVisible();
      await gm.getByRole("tab", { name: "Szenen", exact: true }).click();
      await gm.getByLabel("Name", { exact: true }).fill(sceneName);
      await gm.getByLabel("Datum in eurer Welt", { exact: true }).fill(fictionDate);
      await gm.getByRole("listbox", { name: "Artikel für diese Szene", exact: true }).selectOption(entryId);
      const created = gm.waitForResponse(response => response.url() === `${base}/scenes` && response.request().method() === "POST");
      await gm.getByRole("button", { name: "Szene vorbereiten", exact: true }).click();
      const response = await created; expect(response.status()).toBe(200); scene = await response.json() as SceneCard;
      expect(scene.entryIds).toEqual([entryId]); expect(scene.status).toBe("prepared");
      const card = gm.locator(".scene-card").filter({ has: gm.getByRole("heading", { name: sceneName, exact: true }) });
      await expect(card.getByText("Vorbereitet", { exact: true })).toBeVisible();
      const started = gm.waitForResponse(response => response.url() === `${base}/scenes/${scene.id}/start` && response.request().method() === "POST");
      await card.getByRole("button", { name: "Szene beginnen", exact: true }).click();
      expect((await started).status()).toBe(200);
      await expect(card.getByText("Am Tisch", { exact: true })).toBeVisible();
      await expect(gm.locator(".page-heading")).toContainText(fictionDate);
    });

    await test.step("Save the controlled character sheet through the UI", async () => {
      await gm.getByRole("combobox", { name: "Handelnde Figur", exact: true }).selectOption(actorId);
      await gm.getByRole("tab", { name: "Figur", exact: true }).click();
      await expect(gm.getByRole("heading", { name: "Dein Charakterbogen", exact: true })).toBeVisible();
      await gm.getByLabel("Name", { exact: true }).fill("Sera am Nordtor");
      await gm.getByLabel("Scharfsinn", { exact: true }).fill("6");
      const saved = gm.waitForResponse(response => response.url() === `${base}/actors/${actorId}/sheet` && response.request().method() === "PUT");
      await gm.getByRole("button", { name: "Bogen speichern", exact: true }).click();
      const response = await saved; expect(response.status()).toBe(200);
      expect(await response.json()).toMatchObject({ actorId, fields: { insight: 6, name: "Sera am Nordtor" }, version: 1 });
      await expect(gm.getByLabel("Scharfsinn", { exact: true })).toHaveValue("6");
      await gm.getByRole("combobox", { name: "Ressource", exact: true }).selectOption("vigour");
      await gm.getByRole("spinbutton", { name: "Änderung", exact: true }).fill("-1");
      const adjusted = gm.waitForResponse(r => r.url() === `${base}/actors/${actorId}/resource` && r.request().method() === "POST", { timeout: 5000 });
      await gm.getByRole("button", { name: "Änderung anwenden", exact: true }).click();
      expect((await adjusted).status()).toBe(200);
      await expect(gm.getByLabel("Kraft", { exact: true })).toHaveValue("5");
    });

    let roll: ActionCard;
    await test.step("Prepare a real server roll; the passage remains a private note", async () => {
      await gm.getByRole("tab", { name: "Aktionen", exact: true }).click();
      await gm.getByRole("combobox", { name: "Aktion", exact: true }).selectOption("investigate");
      await gm.getByLabel("Wissensetikett", { exact: true }).fill("spuren");
      await gm.locator("summary").filter({ hasText: "Erfolg mit einer Passage verbinden" }).click();
      await gm.getByRole("combobox", { name: "Artikel", exact: true }).selectOption(entryId);
      await gm.getByRole("combobox", { name: "Passage", exact: true }).selectOption(passageId);
      const prepared = gm.waitForResponse(response => response.url() === `${base}/rolls` && response.request().method() === "POST");
      await gm.getByRole("button", { name: "Würfeln", exact: true }).click();
      const response = await prepared; expect(response.status()).toBe(200); roll = await response.json() as ActionCard;
      expect(roll.status).toBe("ausstehend"); expect(roll.confirmation).toBeNull();
      expect(roll.receipt.package).toEqual({ id: rules.id, version: rules.version });
      expect(roll.receipt.context.actor?.["insight"]).toBe(6);
      expect(roll.receipt.dice).toHaveLength(1);
      const die = roll.receipt.dice[0]!; expect(die.sides).toBe(12); expect(die.kept).toHaveLength(1);
      expect(die.kept).toEqual([0]);
      const face = die.rolls[0]![0]!;
      expect(face).toBeGreaterThanOrEqual(1); expect(face).toBeLessThanOrEqual(12);
      expect(roll.receipt.total).toBe(face + 6 - 1); expect(roll.receipt.success).toBe(true);
      const card = gm.locator(".roll-card");
      await expect(card.locator(".roll-total")).toHaveText(String(roll.receipt.total));
      await expect(card.locator(".dice-results > span")).toHaveText(`${face}W12`);
      await expect(card.getByText("Das Ergebnis wartet auf deine Bestätigung.", { exact: true })).toBeVisible();
      expect((await db.query("SELECT id FROM confirmed_mints WHERE campaign_id=$1", [campaignId])).rowCount).toBe(0);
      expect((await db.query<{ geltung: string }>("SELECT geltung FROM passages WHERE id=$1", [passageId])).rows[0]!.geltung).toBe("notiz");
      expect((await player.request.get(`${base}/entries/${entryId}`)).status()).toBe(404);
      await expect(player.locator(".entry-list button")).toHaveCount(0);
    });

    let confirmation: ActionConfirmation;
    await test.step("Explicitly confirm once and independently replay the saved roll", async () => {
      const confirmed = gm.waitForResponse(response => response.url() === `${base}/rolls/${roll.id}/confirm` && response.request().method() === "POST");
      await gm.getByRole("button", { name: "Ergebnis bestätigen", exact: true }).click();
      const response = await confirmed; expect(response.status()).toBe(200); confirmation = await response.json() as ActionConfirmation;
      expect(confirmation.success).toBe(true);
      expect(confirmation.mint).toMatchObject({ kind: "wurf", passageId, provenance: { fictionDate, rollId: roll.id, actorId, package: { id: rules.id, version: rules.version } } });
      const mint = confirmation.mint!;
      expect(mint.seal).toMatch(/^[a-f0-9]{64}$/);
      expect(mint.seal).toBe(createHash("sha256").update(stableJson({ id: mint.id, passageId, revisionId: mint.revisionId, provenance: mint.provenance })).digest("hex"));
      expect(mint.provenance["playDate"]).toBe(new Date(mint.confirmedAt).toISOString().slice(0, 10));
      expect(mint.provenance["serverTime"]).toBe(mint.confirmedAt);
      expect(mint.provenance["augenblick"]).toMatchObject({ sceneId: scene.id, capturedAt: mint.confirmedAt });
      await expect(gm.getByRole("button", { name: "Ergebnis bestätigen", exact: true })).toHaveCount(0);
      await expect(gm.locator(".roll-card")).toContainText("Bestätigt · erfolgreich");
      const replayed = gm.waitForResponse(response => response.url() === `${base}/rolls/${roll.id}/replay`);
      await gm.getByRole("button", { name: "Nachrechnen", exact: true }).click();
      expect(await (await replayed).json()).toMatchObject({ valid: true, receiptHash: roll.receiptHash });
      await expect(gm.getByText("Nachgerechnet: Würfel, Regelversion und Beleg stimmen überein.", { exact: true })).toBeVisible();
      // Retry the already confirmed HTTP gesture; the production command must return its old receipt.
      const retry = await gm.request.post(`${base}/rolls/${roll.id}/confirm`, { headers: { origin } });
      expect(retry.status()).toBe(200); expect(await retry.json()).toEqual(confirmation);
      expect((await db.query("SELECT id FROM confirmed_mints WHERE campaign_id=$1", [campaignId])).rowCount).toBe(1);
      expect((await db.query<{ geltung: string }>("SELECT geltung FROM passages WHERE id=$1", [passageId])).rows[0]!.geltung).toBe("kanon");
    });

    await test.step("Follow the scene reference into the wiki and read the same evidence as the player", async () => {
      await gm.getByRole("tab", { name: "Szenen", exact: true }).click();
      await gm.locator(".scene-card").filter({ has: gm.getByRole("heading", { name: sceneName, exact: true }) }).getByRole("button", { name: title, exact: true }).click();
      await expect(gm.getByRole("heading", { name: title, exact: true })).toBeVisible();
      const evidence = gm.locator(`#passage-${passageId} .passage-evidence`);
      await evidence.locator("summary").click();
      await expect(evidence.getByRole("heading", { name: "Bestätigter Wurf", exact: true })).toBeVisible();
      await expect(evidence).toContainText(fictionDate);
      await expect(evidence).toContainText(String(confirmation.mint!.provenance["playDate"]));
      await expect(evidence.locator("time")).toHaveAttribute("datetime", new Date(confirmation.mint!.confirmedAt).toISOString());
      await expect(evidence).toContainText(confirmation.mint!.seal);
      await expect(evidence).toContainText(confirmation.mint!.revisionId);

      // The second live client receives only the passage disclosed by the confirmed action.
      await expect(player.locator(".entry-list button").filter({ hasText: title })).toBeVisible();
      await player.locator(".entry-list button").filter({ hasText: title }).click();
      await expect(player.locator("article.article-body")).toContainText(targetText);
      await expect(player.locator("body")).not.toContainText(hiddenText);
      const projected = await player.request.get(`${base}/entries/${entryId}`);
      expect(projected.status()).toBe(200); expect(await projected.text()).not.toContain(hiddenText);
      const playerEvidence = player.locator(`#passage-${passageId} .passage-evidence`);
      await playerEvidence.locator("summary").click();
      await expect(playerEvidence).toContainText(confirmation.mint!.seal);
      await expect(playerEvidence).toContainText(fictionDate);
      await player.reload();
      await expect(player.locator("article.article-body")).toContainText(targetText);
      await expect(player.locator("body")).not.toContainText(hiddenText);
    });
    expect(errors).toEqual([]);
  } finally { await playerContext.close(); }
});
