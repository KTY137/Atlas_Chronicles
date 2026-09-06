import { test, expect, type BrowserContext, type Page } from "@playwright/test";
import { randomBytes } from "node:crypto";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { RoomServiceClient } from "livekit-server-sdk";
import { buildApp } from "../packages/server/src/app.ts";
import { createTestDb, migrate, type Db } from "../packages/server/src/db/index.ts";
import { createIdentity } from "../packages/server/src/identity/index.ts";
import { createCampaigns } from "../packages/server/src/domain/campaigns.ts";
import { createGameplay } from "../packages/server/src/domain/gameplay.ts";
import { mediaConfigFromEnv } from "../packages/server/src/domain/media.ts";

// Explicit opt-in: this test uses the existing local SFU, never starts/stops shared services.
test.skip(process.env.ATLAS_MEDIA_E2E !== "1", "Set ATLAS_MEDIA_E2E=1 with the configured loopback LiveKit stack running.");
test.use({ launchOptions: { args: ["--use-fake-device-for-media-stream", "--use-fake-ui-for-media-stream", "--auto-select-desktop-capture-source=Entire screen"] } });
const port = 9200 + Math.floor(Math.random() * 500), origin = `http://localhost:${port}`;
const config = { origin, cookieSecret: randomBytes(32).toString("hex"), bootstrapToken: randomBytes(32).toString("hex"), staticRoot: resolve("packages/client/dist") };
let db: Db, app: Awaited<ReturnType<typeof buildApp>>, provider: RoomServiceClient, campaign: string;
const sessions: { userId: string; value: string }[] = [];
test.beforeAll(async () => {
  const source = await readFile("deploy/media/.runtime/app.env", "utf8");
  const environment = Object.fromEntries(source.trim().split(/\r?\n/).map(line => { const split = line.indexOf("="); return [line.slice(0, split), line.slice(split + 1)]; }));
  const livekit = mediaConfigFromEnv(environment)!;
  if (![livekit.url, livekit.apiUrl].every(value => ["localhost", "127.0.0.1", "[::1]"].includes(new URL(value).hostname))) throw new Error("Media acceptance requires explicitly configured loopback endpoints");
  provider = new RoomServiceClient(livekit.apiUrl, livekit.apiKey, livekit.apiSecret, { requestTimeout: 5 });
  db = await createTestDb(); await migrate(db);
  const identity = createIdentity(db, config), campaigns = createCampaigns(db), gm = await identity.bootstrap("Kaya Medien");
  sessions.push(gm); campaign = (await campaigns.createCampaign(gm.userId, { name: "Die hörbare Runde" })).id;
  for (const displayName of ["Sera Medien", "Dorn Medien"]) {
    const invite = await campaigns.issueInvitation(gm.userId, campaign), request = await campaigns.requestJoin(invite.code, { displayName });
    const member = await campaigns.approveJoin(gm.userId, campaign, request.id);
    sessions.push({ userId: member.userId, ...await identity.issueSession(member.userId) });
  }
  const game = createGameplay(db), scene = await game.createScene(gm.userId, campaign, { name: "Am gemeinsamen Tisch", entryIds: [], fictionDate: "Abend" });
  await game.startScene(gm.userId, campaign, scene.id);
  app = await buildApp(db, { ...config, livekit }); await app.listen({ host: "127.0.0.1", port });
});
test.afterAll(async () => {
  await app?.close();
  if (db && provider) {
    const rooms = (await db.query<{ name: string }>("SELECT provider_room AS name FROM media_rooms UNION SELECT provider_room AS name FROM media_cleanup")).rows;
    for (const room of rooms) await provider.deleteRoom(room.name).catch(() => {});
  }
  await db?.close();
});

async function instrument(context: BrowserContext) {
  await context.addInitScript(() => {
    const captured: MediaStreamTrack[] = [], connections: RTCPeerConnection[] = [];
    Object.assign(window, { __mediaCaptured: captured, __mediaConnections: connections });
    const original = navigator.mediaDevices.getUserMedia.bind(navigator.mediaDevices);
    navigator.mediaDevices.getUserMedia = async constraints => { const stream = await original(constraints); captured.push(...stream.getTracks()); return stream; };
    const display = navigator.mediaDevices.getDisplayMedia.bind(navigator.mediaDevices);
    navigator.mediaDevices.getDisplayMedia = async options => { const stream = await display(options); captured.push(...stream.getTracks()); return stream; };
    const OriginalPeer = window.RTCPeerConnection;
    window.RTCPeerConnection = class extends OriginalPeer { constructor(configuration?: RTCConfiguration) { super(configuration); connections.push(this); } };
  });
}
const panel = (page: Page) => page.locator(".media-panel");
async function connected(page: Page) { await expect(panel(page).locator(".media-state")).toContainText("Sprache verbunden", { timeout: 25_000 }); }
async function audioBytes(page: Page) {
  return page.evaluate(async () => {
    const peers = (window as unknown as { __mediaConnections: RTCPeerConnection[] }).__mediaConnections;
    let bytes = 0;
    for (const peer of peers) if (peer.connectionState !== "closed") for (const row of (await peer.getStats()).values())
      if (row.type === "inbound-rtp" && row.kind === "audio") bytes += Number(row.bytesReceived ?? 0);
    return bytes;
  });
}
async function allCaptureStopped(page: Page) {
  return page.evaluate(() => (window as unknown as { __mediaCaptured: MediaStreamTrack[] }).__mediaCaptured.every(track => track.readyState === "ended"));
}

test("real SFU carries browser media, keeps whispers private and stops tracks after revocation", async ({ browser }) => {
  test.info().annotations.push({ type: "evidence", description: "Real loopback LiveKit/SRTP; synthetic Chromium microphone/camera/screen devices, not physical hardware or remote HTTPS/TURN acceptance." });
  const contexts: BrowserContext[] = [], pages: Page[] = [], errors: string[] = [];
  try {
    for (const session of sessions) {
      const context = await browser.newContext({ permissions: ["microphone", "camera"] }); contexts.push(context);
      await instrument(context);
      await context.addCookies([{ name: "chronicle_session", value: session.value, url: origin, httpOnly: true, secure: true, sameSite: "Strict" }]);
      const page = await context.newPage(); pages.push(page); page.on("pageerror", error => errors.push(error.message));
      await page.goto(`${origin}/?campaign=${campaign}&stage=kanal`);
      await page.getByRole("button", { name: "Sprache und Video öffnen", exact: true }).click();
      await panel(page).getByRole("button", { name: "Sprachraum beitreten", exact: true }).click(); await connected(page);
    }
    const [gm, sera, dorn] = pages as [Page, Page, Page];
    await panel(gm).getByRole("button", { name: "Mikrofon einschalten", exact: true }).click();
    await panel(sera).getByRole("button", { name: "Kamera einschalten", exact: true }).click();
    await expect.poll(() => audioBytes(sera), { timeout: 20_000 }).toBeGreaterThan(1000);
    await expect.poll(() => audioBytes(dorn), { timeout: 20_000 }).toBeGreaterThan(1000);
    const playback = panel(sera).getByRole("button", { name: "Tonwiedergabe erlauben", exact: true });
    if (await playback.isVisible()) await playback.click();
    await expect.poll(() => sera.locator(".media-audio audio").evaluateAll(elements => elements.some(element => !(element as HTMLAudioElement).paused && (element as HTMLAudioElement).readyState >= 2))).toBe(true);
    await expect.poll(() => panel(gm).locator("video").evaluateAll(elements => elements.some(element => (element as HTMLVideoElement).videoWidth > 0)), { timeout: 20_000 }).toBe(true);
    await panel(gm).getByRole("button", { name: "Bildschirm teilen", exact: true }).click();
    await expect.poll(() => panel(sera).locator(".media-screen video").evaluateAll(elements => elements.some(element => (element as HTMLVideoElement).videoWidth > 0)), { timeout: 20_000 }).toBe(true);
    await panel(gm).getByRole("button", { name: "Bildschirmfreigabe beenden", exact: true }).click();
    await panel(gm).getByRole("button", { name: "Medienbereich schließen", exact: true }).click();
    await gm.getByRole("button", { name: "Chronik", exact: true }).click();
    await gm.getByRole("button", { name: "Sprache und Video öffnen", exact: true }).click(); await connected(gm);
    await expect(panel(gm).getByRole("button", { name: "Mikrofon ausschalten", exact: true })).toBeEnabled();

    await panel(gm).getByRole("checkbox", { name: "Sera Medien", exact: true }).check();
    await panel(gm).getByRole("button", { name: "Flüsterraum öffnen", exact: true }).click();
    await expect(panel(gm).locator(".media-state")).toContainText("Privater Flüsterraum");
    await panel(sera).getByRole("button", { name: "Flüsterraum betreten", exact: true }).click();
    await expect(panel(sera).locator(".media-state")).toContainText("Privater Flüsterraum");
    await expect(panel(dorn).locator(".media-whisper")).toContainText("Kaya Medien");
    await expect(panel(dorn).locator(".media-whisper")).toContainText("Sera Medien");
    await expect(panel(dorn).getByRole("button", { name: "Flüsterraum betreten", exact: true })).toHaveCount(0);
    await expect(panel(dorn).locator(".media-peer")).toHaveCount(1);
    await expect(dorn.locator(".media-audio audio")).toHaveCount(0);
    const whisperId = (await db.query<{ id: string }>("SELECT id FROM media_rooms WHERE campaign_id=$1 AND kind='whisper' AND closed_at IS NULL", [campaign])).rows[0]!.id;
    const denied = await dorn.evaluate(async ({ campaign, roomId }) => (await fetch(`/api/campaigns/${campaign}/media/token`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ roomId }) })).status, { campaign, roomId: whisperId });
    expect(denied).toBe(404);
    await panel(gm).getByRole("button", { name: "Mikrofon einschalten", exact: true }).click();
    await expect.poll(() => audioBytes(sera), { timeout: 20_000 }).toBeGreaterThan(1000);
    await expect(panel(gm).getByRole("button", { name: "Kamera einschalten", exact: true })).toBeDisabled();
    await expect(panel(sera).getByRole("button", { name: "Bildschirm teilen", exact: true })).toBeDisabled();

    await panel(gm).getByText("Sprachzugang verwalten", { exact: true }).click();
    await panel(gm).locator(".media-moderation-row").filter({ hasText: "Sera Medien" }).getByRole("button", { name: "Sprachzugang sperren", exact: true }).click();
    await expect(panel(sera).getByText("Die Spielleitung hat deinen Sprachzugang gesperrt.", { exact: true })).toBeVisible({ timeout: 20_000 });
    await expect.poll(() => allCaptureStopped(gm)).toBe(true); await expect.poll(() => allCaptureStopped(sera)).toBe(true);
    await expect(gm.locator(".media-audio audio")).toHaveCount(0); await expect(sera.locator(".media-audio audio")).toHaveCount(0);
    await panel(gm).getByRole("button", { name: "Medienbereich schließen", exact: true }).click();
    await gm.getByRole("button", { name: "Kanal", exact: true }).click();
    await gm.getByLabel("Nachricht an die Kampagne", { exact: true }).fill("Der Tisch läuft trotz beendeter Sprachverbindung weiter.");
    await gm.getByRole("button", { name: "Beitrag veröffentlichen", exact: true }).click();
    await expect(dorn.locator(".channel-message-body")).toContainText("Der Tisch läuft trotz beendeter Sprachverbindung weiter.");
    expect(errors).toEqual([]);
    await test.info().attach("media-evidence", { body: JSON.stringify({ topology: "loopback SFU", devices: "synthetic browser capture", receivedAudio: true, decodedVideo: true, decodedScreen: true, excludedWhisperSubscriber: true, revokedTracksEnded: true }), contentType: "application/json" });
  } finally { for (const context of contexts) await context.close(); }
});
