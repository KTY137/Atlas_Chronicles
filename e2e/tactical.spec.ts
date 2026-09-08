import { test, expect, type Browser, type BrowserContext, type Locator, type Page } from "@playwright/test";
import { createHash, randomBytes, randomUUID } from "node:crypto";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import sharp from "sharp";
import { parseCampaignBundleV4 } from "@chronicle/io";
import type { UvttProvenance } from "@chronicle/forge";
import type { TacticalAck, TacticalMapCard, TacticalMoveInput, TacticalPlan, TacticalView } from "@chronicle/protocol";
import { buildApp } from "../packages/server/src/app.ts";
import { createPgDb, createTestDb, migrate, type Db } from "../packages/server/src/db/index.ts";
import { createIdentity } from "../packages/server/src/identity/index.ts";
import { createCampaigns } from "../packages/server/src/domain/campaigns.ts";
import { createDocuments } from "../packages/server/src/domain/documents.ts";
import { createGameplay } from "../packages/server/src/domain/gameplay.ts";
import { createTactical } from "../packages/server/src/domain/tactical.ts";
import { fitCamera } from "../packages/render/src/geometry.ts";
import { visibleMapTiles } from "../packages/render/src/tactical-geometry.ts";

// Isolated PostgreSQL schemas when configured, otherwise PGlite, and authenticated browsers. Only the denial regression
// interrupts projection polling; its 409 tile response comes from the actual server policy.
const fixturePath = resolve("packages/forge/test/fixtures/uvtt/sampleMap.dd2vtt");
const fixtureProvenance = resolve("packages/forge/test/fixtures/uvtt/provenance.json");
let schema: string, origin: string, campaignId: string, sceneId: string, entryId: string, passages: string[];
let admin: Db | undefined, db: Db, app: Awaited<ReturnType<typeof buildApp>>, config: Parameters<typeof buildApp>[1];
let sourceText: string, provenance: UvttProvenance;
let sessions: { userId: string; value: string; actorId?: string }[];
const base = () => `${origin}/api/campaigns/${campaignId}`;
const stage = (page: Page, name: string) => page.getByRole("navigation", { name: "Bereiche" }).getByRole("button", { name, exact: true });
const editor = (scope: Page | Locator, name: string) => scope.locator(".tactical-token").filter({ has: scope.getByRole("heading", { name, exact: true }) });
const apiWrite = (page: Page, path: string, data: unknown) => page.request.post(`${base()}${path}`, { headers: { origin }, data });
const view = async (page: Page): Promise<TacticalView> => {
  const response = await page.request.get(`${base()}/tactical/active`); expect(response.status()).toBe(200); return await response.json();
};

test.beforeEach(async () => {
  schema = `chronicle_tactical_e2e_${randomUUID().replaceAll("-", "")}`;
  const port = 9900 + Math.floor(Math.random() * 150); origin = `http://localhost:${port}`;
  config = { origin, bootstrapToken: randomBytes(32).toString("hex"), cookieSecret: randomBytes(32).toString("hex"), staticRoot: resolve("packages/client/dist") };
  const settings = process.env.E2E_DATABASE_URL ? null : await readFile(".local/config.json", "utf8")
    .then(text => JSON.parse(text)).catch(error => { if (error.code === "ENOENT") return null; throw error; });
  const databaseUrl = process.env.E2E_DATABASE_URL ?? settings?.databaseUrl;
  admin = undefined;
  if (databaseUrl) {
    admin = createPgDb(databaseUrl); await admin.query(`CREATE SCHEMA "${schema}"`);
    const url = new URL(databaseUrl); url.searchParams.set("options", `-c search_path=${schema}`); db = createPgDb(url.href);
  } else db = await createTestDb();
  await migrate(db);
  const identity = createIdentity(db, config), campaigns = createCampaigns(db), gm = await identity.bootstrap("Kaya Karten"); sessions = [gm];
  campaignId = (await campaigns.createCampaign(gm.userId, { name: "Zwei Blicke auf das Frosttor" })).id;
  const invitation = await campaigns.issueInvitation(gm.userId, campaignId);
  for (const displayName of ["Sera", "Dorn"]) {
    const join = await campaigns.requestJoin(invitation.code, { displayName }), member = await campaigns.approveJoin(gm.userId, campaignId, join.id);
    const membership = (await db.query<{ actor_id: string }>("SELECT actor_id FROM campaign_memberships WHERE campaign_id=$1 AND user_id=$2", [campaignId, member.userId])).rows[0]!;
    sessions.push({ userId: member.userId, actorId: membership.actor_id, ...await identity.issueSession(member.userId) });
  }
  const entry = await createDocuments(db).saveEntry(gm.userId, campaignId, { title: "Zwei Wege durch das Frosttor", passages: [
    { inhalt: { kind: "absatz", inhalt: [{ text: "Im Westflügel liegt Seras Bernsteinzimmer.", marks: [] }] } },
    { inhalt: { kind: "absatz", inhalt: [{ text: "Im Ostflügel liegt Dorns geheime Silberkammer.", marks: [] }] } },
  ] });
  entryId = entry.entryId; passages = entry.passagen.map(p => p.pid);
  sceneId = (await createGameplay(db).createScene(gm.userId, campaignId, { name: "Das geteilte Frosttor", entryIds: [entryId], fictionDate: "Erster Abend" })).id;
  sourceText = await readFile(fixturePath, "utf8");
  expect(createHash("sha256").update(sourceText).digest("hex")).toBe("3384e501dd30c2c978c6d56d8ad7ab75ebcc282accd9580511fef9a776d4dc4a");
  provenance = (JSON.parse(await readFile(fixtureProvenance, "utf8")) as { provenance: UvttProvenance }).provenance;
  app = await buildApp(db, config); await app.listen({ host: "127.0.0.1", port });
});
test.afterEach(async () => {
  await app?.close(); await db?.close();
  if (admin) { try { if (!/^chronicle_tactical_e2e_[a-f0-9]{32}$/.test(schema)) throw new Error("Unexpected tactical test schema"); await admin.query(`DROP SCHEMA "${schema}" CASCADE`); } finally { await admin.close(); } }
});

async function access(browser: Browser, index: number, trackBitmaps = false): Promise<{ context: BrowserContext; page: Page }> {
  const context = await browser.newContext(), session = sessions[index]!;
  await context.addCookies([{ name: "chronicle_session", value: session.value, url: origin, httpOnly: true, secure: true, sameSite: "Strict" }]);
  if (trackBitmaps) await context.addInitScript(() => {
    const retained = new Set<ImageBitmap>(), originalCreate = window.createImageBitmap.bind(window), originalClose = ImageBitmap.prototype.close;
    const state = window as typeof window & { tacticalBitmapCount: () => number };
    state.tacticalBitmapCount = () => retained.size;
    window.createImageBitmap = (async (...args: Parameters<typeof createImageBitmap>) => {
      const bitmap = await Reflect.apply(originalCreate, window, args) as ImageBitmap;
      retained.add(bitmap); return bitmap;
    }) as typeof createImageBitmap;
    ImageBitmap.prototype.close = function() { retained.delete(this); originalClose.call(this); };
  });
  return { context, page: await context.newPage() };
}
async function openTactical(page: Page) {
  await page.goto(`${origin}/?campaign=${campaignId}&stage=tisch`);
  await page.getByRole("tab", { name: "Szenenkarte", exact: true }).click();
}
async function reveal(gm: Page) {
  for (let i = 0; i < 2; i++) expect((await apiWrite(gm, "/reveal", { passageId: passages[i], actorId: sessions[i + 1]!.actorId })).status()).toBe(200);
}
async function canvasReady(page: Page) {
  await expect(page.locator('.tactical-canvas[data-canvas-ready="true"]')).toHaveCount(1);
  await expect(page.locator('canvas[data-map-backend="pixi-webgl"]')).toBeVisible();
}
async function paintedFittedCanvas(page: Page) {
  await canvasReady(page); await page.getByRole("button", { name: "Ganze Karte", exact: true }).click();
  const bounds = (await page.locator('canvas[data-map-backend="pixi-webgl"]').boundingBox())!, viewport = [bounds.width, bounds.height] as const;
  const expected = visibleMapTiles([2560, 2560], viewport, fitCamera([2560, 2560], viewport), await page.evaluate(() => devicePixelRatio)).length;
  await expect.poll(() => page.evaluate(() => (window as typeof window & { tacticalBitmapCount: () => number }).tacticalBitmapCount())).toBe(expected);
  await page.evaluate(() => new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve()))));
}

test("real UVTT import, region knowledge, preparation, three live views, commands and native persistence", async ({ browser }) => {
  test.setTimeout(240_000);
  const clients = await Promise.all([0, 1, 2].map(i => access(browser, i, true))), [gm, a, b] = clients.map(c => c.page) as [Page, Page, Page];
  const errors: string[] = []; for (const { page } of clients) page.on("pageerror", error => errors.push(error.message));
  let mapId = "", sessionId = "";
  try {
    await test.step("import the actual licensed map through the visual import form", async () => {
      await openTactical(gm);
      await gm.getByRole("button", { name: "Karte importieren", exact: true }).click();
      await gm.getByLabel("Name der Karte", { exact: true }).fill("Imagix Frosttor – zwei Wissensblicke");
      await gm.getByLabel("Quelldatei", { exact: true }).setInputFiles(fixturePath);
      await gm.getByLabel("Urheber", { exact: true }).fill(provenance.creator);
      await gm.getByLabel("Lizenz oder eigene Nutzungsrechte", { exact: true }).fill(provenance.license);
      await gm.getByLabel("Quellseite (optional)", { exact: true }).fill(provenance.sourceUrl!);
      await gm.getByLabel("Lizenznachweis (optional)", { exact: true }).fill(provenance.licenseUrl!);
      const previewResponse = gm.waitForResponse(r => r.url() === `${base()}/tactical/maps/import-preview` && r.request().method() === "POST");
      await gm.getByRole("button", { name: "Import prüfen", exact: true }).click();
      expect((await previewResponse).status()).toBe(200);
      await expect(gm.getByRole("heading", { name: "Importvorschau", exact: true })).toBeVisible();
      await expect(gm.locator(".tactical-import-report")).toContainText("2560 × 2560");
      const importedResponse = gm.waitForResponse(r => r.url() === `${base()}/tactical/maps` && r.request().method() === "POST");
      await gm.getByRole("button", { name: "Karte in die Kampagne übernehmen", exact: true }).click();
      const imported = await importedResponse; expect(imported.status()).toBe(200); mapId = ((await imported.json()) as TacticalAck).subjectId;
      expect((await db.query("SELECT id FROM entries WHERE campaign_id=$1", [campaignId])).rows).toHaveLength(1); // No autogenerated articles.
      const original = await (await gm.request.get(`${base()}/tactical/maps/${mapId}/source`)).json();
      expect(original.source_text).toBe(sourceText); expect(original.provenance).toMatchObject({ creator: provenance.creator, license: provenance.license, sourceUrl: provenance.sourceUrl, licenseUrl: provenance.licenseUrl });
    });

    await test.step("draw and explicitly bind separate left/right passage regions", async () => {
      await gm.getByRole("button", { name: "Karte & Vorbereitung", exact: true }).click();
      await gm.getByRole("button", { name: /^Kartenbibliothek/ }).click();
      await gm.getByRole("combobox", { name: "Szenenkarte", exact: true }).selectOption(mapId);
      for (const [i, corners] of [
        [[0, 0], [1280, 0], [1280, 2560], [0, 2560]],
        [[1280, 0], [2560, 0], [2560, 2560], [1280, 2560]],
      ].entries()) {
        for (const [x, y] of corners) {
          await gm.getByLabel("Eckpunkt X", { exact: true }).fill(String(x)); await gm.getByLabel("Eckpunkt Y", { exact: true }).fill(String(y));
          await gm.getByRole("button", { name: "Eckpunkt hinzufügen", exact: true }).click();
        }
        await gm.getByRole("button", { name: "Region schließen", exact: true }).click();
        await gm.getByRole("combobox", { name: "Wissen aus Artikel", exact: true }).selectOption(entryId);
        await gm.getByRole("combobox", { name: "Erforderliche Passage", exact: true }).selectOption(passages[i]!);
        await gm.getByRole("button", { name: "Region mit Wissen verknüpfen", exact: true }).click();
      }
      const saved = gm.waitForResponse(r => r.url() === `${base()}/tactical/maps/${mapId}/revision` && r.request().method() === "PUT");
      await gm.getByRole("button", { name: "Kartenrevision speichern", exact: true }).click(); expect((await saved).status()).toBe(200);
      const map: TacticalMapCard = await (await gm.request.get(`${base()}/tactical/maps/${mapId}`)).json();
      expect(map.revision).toBe(2); expect(map.document.geometry.regions).toHaveLength(2); expect(map.anchors.map(anchor => anchor.passageId).sort()).toEqual([...passages].sort());
    });

    await test.step("mark two places and bind their separate passage knowledge through the real editor", async () => {
      for (const [i, x] of [512, 2048].entries()) {
        await gm.getByLabel("Ort X", { exact: true }).fill(String(x)); await gm.getByLabel("Ort Y", { exact: true }).fill("700");
        await gm.getByRole("button", { name: "Ort an diesen Koordinaten markieren", exact: true }).click();
        await gm.getByLabel("Objektwissen aus Artikel", { exact: true }).selectOption(entryId);
        await gm.getByLabel("Objekt benötigt Passage", { exact: true }).selectOption(passages[i]!);
        await gm.getByRole("button", { name: "Objekt mit Wissen verknüpfen", exact: true }).click();
      }
      const saved = gm.waitForResponse(r => r.url() === `${base()}/tactical/maps/${mapId}/revision` && r.request().method() === "PUT");
      await gm.getByRole("button", { name: "Kartenrevision speichern", exact: true }).click(); expect((await saved).status()).toBe(200);
      const map: TacticalMapCard = await (await gm.request.get(`${base()}/tactical/maps/${mapId}`)).json();
      expect(map.revision).toBe(3); expect(map.document.geometry.places).toHaveLength(2); expect(map.anchors.filter(a => a.targetKind === "place")).toHaveLength(2);
      expect((await db.query("SELECT id FROM entries WHERE campaign_id=$1", [campaignId])).rows).toHaveLength(1);
    });

    await test.step("place both players in an explicit scene plan and begin it", async () => {
      await gm.getByRole("combobox", { name: "Szene", exact: true }).selectOption(sceneId);
      for (const [index, name, x] of [[1, "Sera", 512], [2, "Dorn", 2048]] as const) {
        await gm.getByRole("combobox", { name: "Figur platzieren", exact: true }).selectOption(sessions[index]!.actorId!);
        await gm.getByRole("button", { name: "Figur zur Vorbereitung hinzufügen", exact: true }).click();
        await editor(gm, name).getByLabel("X", { exact: true }).fill(String(x)); await editor(gm, name).getByLabel("Y", { exact: true }).fill("512");
      }
      const saved = gm.waitForResponse(r => r.url() === `${base()}/scenes/${sceneId}/tactical-plan` && r.request().method() === "PUT");
      await gm.getByRole("button", { name: "Karte & Figuren für Szene speichern", exact: true }).click(); expect((await saved).status()).toBe(200);
      await reveal(gm);
      const started = gm.waitForResponse(r => r.url() === `${base()}/scenes/${sceneId}/start` && r.request().method() === "POST");
      await gm.getByRole("button", { name: "Vorbereitete Szene beginnen", exact: true }).click(); expect((await started).status()).toBe(200);
      await gm.getByRole("button", { name: "Laufende Szene", exact: true }).click();
      await openTactical(a); await openTactical(b);
      // A ready WebGL canvas may still be blank after a tile failure. All three actual
      // raster views must be painted before claiming that multiplayer rendering works.
      for (const page of [gm, a, b]) await paintedFittedCanvas(page);
      const [gmView, aView, bView] = await Promise.all([view(gm), view(a), view(b)]); sessionId = gmView.sessionId;
      expect(gmView.tokens.map(token => token.name).sort()).toEqual(["Dorn", "Sera"]);
      expect(aView.tokens.map(token => token.name)).toEqual(["Sera"]); expect(bView.tokens.map(token => token.name)).toEqual(["Dorn"]);
      expect(aView.regions).toHaveLength(1); expect(bView.regions).toHaveLength(1); expect(aView.regions[0]!.id).not.toBe(bView.regions[0]!.id);
      expect(gmView.entities).toHaveLength(2); expect(aView.entities.map(o => o.x)).toEqual([512]); expect(bView.entities.map(o => o.x)).toEqual([2048]);
      for (const page of [a, b]) await expect(page.locator(".tactical-objects .tactical-object-list li")).toHaveCount(1);
      for (const projected of [aView, bView]) for (const key of ["map", "document", "walls", "portals"]) expect(Object.hasOwn(projected, key)).toBe(false);
      await expect(editor(a, "Sera")).toBeVisible(); await expect(editor(a, "Dorn")).toHaveCount(0);
      await expect(editor(b, "Dorn")).toBeVisible(); await expect(editor(b, "Sera")).toHaveCount(0);
      for (const [page, projected, knownLeft] of [[a, aView, true], [b, bView, false]] as const) {
        const response = await page.request.get(`${base()}/sessions/${sessionId}/tactical/tiles/4/0/0?view=${projected.rasterDigest}`);
        expect(response.status()).toBe(200); expect(response.headers()["x-tactical-view"]).toBe(projected.rasterDigest);
        const { data, info } = await sharp(await response.body()).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
        expect([info.width, info.height]).toEqual([160, 160]); let visible = 0;
        for (let y = 0; y < info.height; y++) for (let x = 0; x < info.width; x++) {
          const at = (y * info.width + x) * 4;
          if ((x < 80) === knownLeft) visible += data[at + 3]!;
          else expect([...data.subarray(at, at + 4)]).toEqual([0, 0, 0, 0]);
        }
        expect(visible).toBeGreaterThan(0);
      }
      await a.locator(".tactical-canvas-frame").scrollIntoViewIfNeeded(); await a.screenshot({ path: test.info().outputPath("left-knowledge-desktop.png"), fullPage: true });
      await b.locator(".tactical-canvas-frame").scrollIntoViewIfNeeded(); await b.screenshot({ path: test.info().outputPath("right-knowledge-desktop.png"), fullPage: true });
    });

    await test.step("move, replay safely, deny unauthorized/stale moves, then undo and drag on canvas", async () => {
      const initial = await view(a), own = initial.tokens[0]!, other = (await view(b)).tokens[0]!;
      await editor(a, "Sera").getByLabel("X", { exact: true }).fill("640");
      const moved = a.waitForResponse(r => r.url() === `${base()}/sessions/${sessionId}/tactical/tokens/${own.id}/move` && r.request().method() === "POST");
      await editor(a, "Sera").getByRole("button", { name: "Position speichern", exact: true }).click();
      const response = await moved; expect(response.status()).toBe(200); const input = response.request().postDataJSON() as TacticalMoveInput;
      expect((await apiWrite(a, `/sessions/${sessionId}/tactical/tokens/${own.id}/move`, input)).status()).toBe(200);
      expect((await apiWrite(a, `/sessions/${sessionId}/tactical/tokens/${own.id}/move`, { ...input, commandId: randomUUID(), x: 600 })).status()).toBe(409);
      expect((await apiWrite(a, `/sessions/${sessionId}/tactical/tokens/${own.id}/move`, { ...input, x: 641 })).status()).toBe(409);
      expect((await apiWrite(a, `/sessions/${sessionId}/tactical/tokens/${other.id}/move`, { ...input, commandId: randomUUID() })).status()).toBe(404);
      expect((await apiWrite(b, `/sessions/${sessionId}/tactical/tokens/${own.id}/move`, { ...input, commandId: randomUUID() })).status()).toBe(404);
      await a.getByRole("button", { name: "Rücknahme: Sera", exact: true }).click();
      await expect.poll(async () => (await view(a)).tokens[0]!.x).toBe(512);
      await expect(editor(a, "Sera").getByLabel("X", { exact: true })).toHaveValue("512");
      await a.getByRole("checkbox", { name: "Beim Ziehen einrasten", exact: true }).uncheck();
      const canvas = a.locator('canvas[data-map-backend="pixi-webgl"]'); await canvas.scrollIntoViewIfNeeded(); const bounds = (await canvas.boundingBox())!;
      const scale = Math.min((bounds.width - 48) / 2560, (bounds.height - 48) / 2560), offsetX = (bounds.width - 2560 * scale) / 2, offsetY = (bounds.height - 2560 * scale) / 2;
      const point = (x: number, y: number) => ({ x: bounds.x + offsetX + x * scale, y: bounds.y + offsetY + y * scale });
      const from = point(512, 512), to = point(640, 640);
      const dragged = a.waitForResponse(r => r.url() === `${base()}/sessions/${sessionId}/tactical/tokens/${own.id}/move` && r.request().method() === "POST");
      await a.mouse.move(from.x, from.y); await a.mouse.down(); await a.mouse.move(to.x, to.y, { steps: 6 }); await a.mouse.up();
      expect((await dragged).status()).toBe(200);
      const position = (await view(a)).tokens[0]!; expect(position.x).toBeGreaterThan(620); expect(position.x).toBeLessThan(660); expect(position.y).toBeGreaterThan(620);
      await a.getByRole("button", { name: "Rücknahme: Sera", exact: true }).click(); await expect.poll(async () => (await view(a)).tokens[0]!.x).toBe(512);
      const portal = gm.locator("section.panel").filter({ has: gm.getByRole("heading", { name: "Portale", exact: true }) }).locator(".tactical-object-list li").first();
      const changed = gm.waitForResponse(r => r.url().includes(`/sessions/${sessionId}/tactical/portals/`) && r.request().method() === "POST");
      await portal.getByRole("button").click(); expect((await changed).status()).toBe(200);
      await gm.getByRole("button", { name: "Rücknahme: Portal", exact: true }).click();
    });

    await test.step("the Wiki has the same knowledge and preparations never move the active scene", async () => {
      for (const [page, known, hidden] of [[a, "Bernsteinzimmer", "Silberkammer"], [b, "Silberkammer", "Bernsteinzimmer"]] as const) {
        await page.locator(".tactical-objects .tactical-object-list").getByRole("button", { name: "Ort: Zwei Wege durch das Frosttor", exact: true }).click();
        await page.locator(".tactical-object-selected").getByRole("button", { name: "Artikel öffnen", exact: true }).click();
        await expect(page.locator("article.article-body")).toContainText(known); await expect(page.locator("article.article-body")).not.toContainText(hidden);
      }
      await gm.getByRole("button", { name: "Karte & Vorbereitung", exact: true }).click();
      await gm.getByRole("button", { name: /^Kartenbibliothek/ }).click();
      await gm.getByRole("combobox", { name: "Szenenkarte", exact: true }).selectOption(mapId);
      await gm.getByRole("combobox", { name: "Szene", exact: true }).selectOption(sceneId);
      await editor(gm, "Sera").getByLabel("X", { exact: true }).fill("768");
      const saved = gm.waitForResponse(r => r.url() === `${base()}/scenes/${sceneId}/tactical-plan` && r.request().method() === "PUT");
      await gm.getByRole("button", { name: "Karte & Figuren für Szene speichern", exact: true }).click(); expect((await saved).status()).toBe(200);
      expect((await view(a)).tokens[0]!.x).toBe(512);
      const plan: TacticalPlan = await (await gm.request.get(`${base()}/scenes/${sceneId}/tactical-plan`)).json(); expect(plan.tokens.find(t => t.actorId === sessions[1]!.actorId)!.x).toBe(768);
      await stage(gm, "Runde").click();
      const downloading = gm.waitForEvent("download"); await gm.getByRole("button", { name: "Kampagne exportieren", exact: true }).click();
      const download = await downloading; expect(download.suggestedFilename()).toBe("zwei-blicke-auf-das-frosttor.chronicle");
      const archive = await readFile((await download.path())!, "utf8");
      const bundle = parseCampaignBundleV4(archive); expect(bundle.version).toBe(4);
      expect(bundle.tables.tactical_sources[0]!.source_text).toBe(sourceText); expect(bundle.tables.session_tactical_states).toHaveLength(1);
      expect(bundle.tables.tactical_token_states.find(t => t.actor_id === sessions[1]!.actorId)!.x).toBe(512);
      expect(bundle.tables.tactical_map_anchors.filter(a => a.target_kind === "place")).toHaveLength(2);
      await test.info().attach("native-tactical-campaign.chronicle", { body: Buffer.from(archive), contentType: "application/json" });
    });

    await test.step("reload and restart preserve live state, provenance and phone layout", async () => {
      const before = await view(a);
      await app.close(); app = await buildApp(db, config); await app.listen({ host: "127.0.0.1", port: Number(new URL(origin).port) });
      await openTactical(a); await canvasReady(a); expect((await view(a)).tokens).toEqual(before.tokens);
      expect((await (await gm.request.get(`${base()}/tactical/maps/${mapId}/source`)).json()).source_text).toBe(sourceText);
      await a.setViewportSize({ width: 390, height: 844 });
      await expect.poll(() => a.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
      await paintedFittedCanvas(a);
      await a.locator(".tactical-canvas-frame").scrollIntoViewIfNeeded();
      await a.screenshot({ path: test.info().outputPath("left-knowledge-phone.png"), fullPage: true });
      await gm.setViewportSize({ width: 390, height: 844 }); await openTactical(gm); await canvasReady(gm);
      await expect.poll(() => gm.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
      await paintedFittedCanvas(gm);
      await gm.locator(".tactical-canvas-frame").scrollIntoViewIfNeeded();
      await gm.screenshot({ path: test.info().outputPath("gm-tactical-phone.png"), fullPage: true });
      expect(errors).toEqual([]);
    });
  } finally { for (const client of clients) await client.context.close(); }
});

test("a real stale-scope tile denial disposes the old authorized image even while projection polling fails", async ({ browser }) => {
  test.setTimeout(120_000);
  // Focused lifecycle setup uses the already UI-covered import/plan APIs through their domains.
  const gm = sessions[0]!, actor = sessions[1]!.actorId!, tactical = createTactical(db, config);
  const imported = await tactical.importMap(gm.userId, campaignId, { commandId: randomUUID(), name: "Scope lifecycle map", format: "uvtt", sourceText, provenance });
  const map = await tactical.getMap(gm.userId, campaignId, imported.subjectId);
  await tactical.reviseMap(gm.userId, campaignId, map.id, { commandId: randomUUID(), expectedVersion: 1,
    document: { ...map.document, geometry: { ...map.document.geometry, places: [{ id: "known-place", x: 600, y: 700 }], regions: [{ id: "left", punkte: [[0, 0], [1280, 0], [1280, 2560], [0, 2560]] }] } },
    anchors: [{ targetKind: "region", targetId: "left", entryId, passageId: passages[0]! }, { targetKind: "place", targetId: "known-place", entryId, passageId: passages[0]! }] });
  await tactical.savePlan(gm.userId, campaignId, sceneId, { commandId: randomUUID(), expectedVersion: 0, mapId: map.id, mapRevision: 2,
    tokens: [{ id: randomUUID(), actorId: actor, x: 512, y: 512, elevation: 0, rotation: 0, scale: 1 }] });
  await createDocuments(db).revealPassage(gm.userId, campaignId, passages[0]!, actor);
  await createGameplay(db).startScene(gm.userId, campaignId, sceneId);
  const { context, page } = await access(browser, 1, true);
  const bitmapCount = () => page.evaluate(() => (window as typeof window & { tacticalBitmapCount: () => number }).tacticalBitmapCount());
  try {
    await openTactical(page); await canvasReady(page);
    const bounds = (await page.locator('canvas[data-map-backend="pixi-webgl"]').boundingBox())!;
    const viewport = [bounds.width, bounds.height] as const, expectedTiles = visibleMapTiles([2560, 2560], viewport, fitCamera([2560, 2560], viewport), await page.evaluate(() => devicePixelRatio)).length;
    await expect.poll(bitmapCount).toBe(expectedTiles);
    await page.locator(".tactical-objects .tactical-object-list").getByRole("button", { name: "Ort: Zwei Wege durch das Frosttor", exact: true }).click();
    await expect(page.locator(".tactical-object-selected").getByRole("button", { name: "Artikel öffnen", exact: true })).toBeVisible();
    await page.evaluate(() => new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve()))));
    await page.locator(".tactical-canvas-frame").scrollIntoViewIfNeeded();
    await page.screenshot({ path: test.info().outputPath("scope-before-denial.png"), fullPage: true });
    await page.route(`${base()}/tactical/active`, route => route.abort("connectionfailed"));
    // Actual durable permission change; the following tile request really returns409.
    await db.query("UPDATE revelations SET revoked_at=$3 WHERE actor_id=$1 AND passage_id=$2", [actor, passages[0], Date.now()]);
    const denied = page.waitForResponse(response => response.url().includes("/tactical/tiles/") && response.status() === 409);
    await page.getByRole("button", { name: "Karte vergrößern", exact: true }).click();
    await page.getByRole("button", { name: "Karte vergrößern", exact: true }).click();
    expect((await denied).status()).toBe(409);
    await expect(page.getByRole("button", { name: "Kartensicht erneut laden", exact: true })).toBeVisible();
    await expect(page.locator(".tactical-objects")).toHaveCount(0); await expect(page.locator(".tactical-object-selected")).toHaveCount(0);
    await page.screenshot({ path: test.info().outputPath("stale-scope-denial.png"), fullPage: true });
    await expect.poll(bitmapCount, { message: "A server-denied scope must close all old image bitmaps immediately", timeout: 3000 }).toBe(0);
    const retry = page.waitForRequest(request => request.url() === `${base()}/tactical/active`);
    await page.getByRole("button", { name: "Kartensicht erneut laden", exact: true }).click(); await retry;
    await expect.poll(bitmapCount).toBe(0);
    await expect(page.locator(".tactical-canvas")).toHaveCount(0);
    await page.unroute(`${base()}/tactical/active`);
    await page.getByRole("button", { name: "Kartensicht erneut laden", exact: true }).click();
    await expect(page.locator(".tactical-objects .tactical-object-list li")).toHaveCount(0);
    await expect(page.locator(".tactical-object-selected")).toHaveCount(0);
  } finally { await context.close(); }
});
