import { once } from "node:events";
import Fastify from "fastify";
import WebSocket from "ws";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createTestDb, migrate, type Db } from "../src/db/index.ts";
import { createCampaigns } from "../src/domain/campaigns.ts";
import { registerHttpLifecycle } from "../src/http/lifecycle.ts";
import { registerRealtime } from "../src/http/realtime.ts";
import { createIdentity } from "../src/identity/index.ts";

describe("realtime owns upgraded connection shutdown", () => {
  const config = { origin: "http://chronicle.test", cookieSecret: "c".repeat(32), bootstrapToken: "b".repeat(32) };
  let db: Db, campaign: string, cookie: string;
  beforeAll(async () => {
    db = await createTestDb();
    await migrate(db);
    const identity = createIdentity(db, config), session = await identity.bootstrap("Kaya");
    campaign = (await createCampaigns(db).createCampaign(session.userId, { name: "Closing the table" })).id;
    cookie = session.setCookie.split(";")[0]!;
  }, 30_000);
  afterAll(async () => { await db?.close(); });

  async function open(trackHttp: boolean) {
    const app = Fastify();
    if (trackHttp) registerHttpLifecycle(app);
    await registerRealtime(app, db, config);
    const address = await app.listen({ host: "127.0.0.1", port: 0 });
    const socket = new WebSocket(`${address.replace("http:", "ws:")}/api/campaigns/${campaign}/live`, { headers: { origin: config.origin, cookie } });
    socket.on("error", () => {});
    let welcomed = false;
    socket.on("message", data => { if (JSON.parse(data.toString()).type === "welcome") welcomed = true; });
    try {
      await expect.poll(() => welcomed).toBe(true);
      return { app, socket };
    } catch (error) {
      socket.terminate();
      await app.close();
      throw error;
    }
  }

  it.each([true, false])("sends close code 1001 with HTTP socket tracking=%s", async trackHttp => {
    const { app, socket } = await open(trackHttp);
    try {
      const ended = once(socket, "close");
      await app.close();
      const [code, reason] = await ended;
      expect(code).toBe(1001);
      expect(reason.toString()).toBe("Server wird beendet");
      expect(app.websocketServer.clients.size).toBe(0);
    } finally {
      socket.terminate();
      await app.close();
    }
  });

  it("terminates a peer that does not acknowledge the close frame", async () => {
    const { app, socket } = await open(true);
    socket.pause();
    let timer: ReturnType<typeof setTimeout> | undefined;
    try {
      const closed = await Promise.race([
        app.close().then(() => true),
        new Promise<boolean>(resolve => { timer = setTimeout(() => resolve(false), 2500); }),
      ]);
      expect(closed).toBe(true);
      expect(app.websocketServer.clients.size).toBe(0);
    } finally {
      clearTimeout(timer);
      socket.terminate();
      await app.close();
    }
  });
});
