import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { mkdtemp, rm } from "node:fs/promises";
import { join, resolve } from "node:path";
import { tmpdir } from "node:os";
import type { FastifyInstance } from "fastify";
import { buildApp } from "../src/app.ts";
import { createTestDb, migrate, type Db } from "../src/db/index.ts";
import { createIdentity } from "../src/identity/index.ts";

const config = { origin: "https://chronicle.test", cookieSecret: "test-cookie-secret-with-at-least-32-characters", bootstrapToken: "test-bootstrap-token-at-least-32-characters" };
const paragraph = (text: string) => ({ inhalt: { kind: "absatz", inhalt: [{ text, marks: [] }] } });
describe("Real server contracts — campaign, join, document and S-P1", () => {
  let db: Db, app: FastifyInstance, gm: string, campaignId: string;
  const players: { cookie: string; actorId: string; userId: string }[] = [];
  const request = (method: "GET" | "POST" | "PUT" | "DELETE", url: string, cookie = "", payload?: unknown) =>
    app.inject({ method, url, headers: { origin: config.origin, cookie }, ...(payload === undefined ? {} : { payload: payload as object }) });
  beforeAll(async () => { db = await createTestDb(); await migrate(db); app = await buildApp(db, config); }, 30_000);
  afterAll(async () => { await app?.close(); await db?.close(); });

  it("requires the setup secret once, persists campaign and admits guests only after GM approval", async () => {
    const forbidden = await request("POST", "/api/setup", "", { displayName: "Kaya" });
    expect(forbidden.statusCode).toBe(404);
    const setup = await app.inject({ method: "POST", url: "/api/setup", headers: { origin: config.origin, authorization: `Bearer ${config.bootstrapToken}` }, payload: { displayName: "Kaya" } });
    expect(setup.statusCode).toBe(200);
    gm = String(setup.headers["set-cookie"]).split(";")[0]!;
    expect(setup.headers["set-cookie"]).toMatch(/HttpOnly; Secure; SameSite=Strict/);
    const campaign = await request("POST", "/api/campaigns", gm, { name: "Andaria" });
    expect(campaign.statusCode).toBe(200);
    campaignId = campaign.json().id;
    for (const name of ["Sera", "Brannt", "Vesper"]) {
      const invite = (await request("POST", `/api/campaigns/${campaignId}/invitations`, gm, {})).json();
      const joined = (await request("POST", `/join/${invite.code}`, "", { displayName: name })).json();
      expect((await request("POST", `/api/joins/${joined.id}/claim`, "", { pollToken: joined.pollToken })).statusCode).toBe(404);
      const approved = await request("POST", `/api/campaigns/${campaignId}/joins/${joined.id}/approve`, gm);
      expect(approved.statusCode).toBe(200);
      const claim = await request("POST", `/api/joins/${joined.id}/claim`, "", { pollToken: joined.pollToken });
      expect(claim.statusCode).toBe(200);
      players.push({ cookie: String(claim.headers["set-cookie"]).split(";")[0]!, actorId: approved.json().actorId, userId: approved.json().userId });
      expect((await request("POST", `/api/joins/${joined.id}/claim`, "", { pollToken: joined.pollToken })).statusCode).toBe(404);
    }
    expect((await request("GET", "/api/campaigns", players[0]!.cookie)).json()).toHaveLength(1);
  });

  it("S-P1: three projected books, no hidden positions/metadata, byte-identical unknown and forbidden", async () => {
    const saved = await request("POST", `/api/campaigns/${campaignId}/entries`, gm,
      { title: "Haus Vharon", passages: [paragraph("GM sealed secret"), paragraph("Sera knows the cellar"), paragraph("Brannt heard a rumor"), paragraph("Vesper saw the garden")] });
    expect(saved.statusCode).toBe(200);
    const article = saved.json();
    const payloads: string[] = [];
    for (const [i, player] of players.entries()) {
      const reveal = await request("POST", `/api/campaigns/${campaignId}/reveal`, gm, { actorId: player.actorId, passageId: article.passagen[i + 1].pid });
      expect(reveal.statusCode).toBe(200);
      const read = await request("GET", `/api/campaigns/${campaignId}/entries/${article.entryId}`, player.cookie);
      expect(read.statusCode).toBe(200);
      expect(read.json().passagen).toHaveLength(1);
      expect(read.json().passagen[0].ord).toBe(0);
      expect(read.body).not.toMatch(/GM sealed secret|gehaltenePids|visibility|revisionId|version|hiddenCount|geltung|praegung/);
      payloads.push(read.body);
    }
    expect(new Set(payloads).size).toBe(3);
    const privateEntry = (await request("POST", `/api/campaigns/${campaignId}/entries`, gm, { title: "Secret", passages: [paragraph("unseen")] })).json();
    const forbidden = await request("GET", `/api/campaigns/${campaignId}/entries/${privateEntry.entryId}`, players[0]!.cookie);
    const missing = await request("GET", `/api/campaigns/${campaignId}/entries/never-existed`, players[0]!.cookie);
    const anonymous = await request("GET", `/api/campaigns/${campaignId}/entries/${privateEntry.entryId}`);
    expect(forbidden.statusCode).toBe(404);
    expect(forbidden.body).toBe(missing.body);
    expect(forbidden.body).toBe(anonymous.body);
    expect((await request("GET", `/api/campaigns/${campaignId}/entries?q=sealed`, players[0]!.cookie)).json()).toEqual([]);
  });

  it("preserves revision snapshots, rejects stale updates and prevents historical mutation", async () => {
    const created = (await request("POST", `/api/campaigns/${campaignId}/entries`, gm, { title: "A book", passages: [paragraph("original")] })).json();
    const update = { title: "A better book", expectedVersion: 1, passages: [{ ...paragraph("edited"), pid: created.passagen[0].pid }] };
    const saved = await request("PUT", `/api/campaigns/${campaignId}/entries/${created.entryId}`, gm, update);
    expect(saved.statusCode).toBe(200);
    expect(saved.json().passagen[0].pid).toBe(created.passagen[0].pid);
    expect((await request("PUT", `/api/campaigns/${campaignId}/entries/${created.entryId}`, gm, update)).statusCode).toBe(409);
    const history = (await request("GET", `/api/campaigns/${campaignId}/entries/${created.entryId}/history`, gm)).json();
    expect(history).toHaveLength(2);
    expect(JSON.stringify(history[1])).toContain("original");
    await expect(db.query("DELETE FROM revisions WHERE id=$1", [history[1].id])).rejects.toMatchObject({ code: "42501" });
    expect((await request("GET", `/api/campaigns/${campaignId}/entries/${created.entryId}/history`, players[0]!.cookie)).statusCode).toBe(404);
  });

  it("denies payload roles, forged identities, cross-origin writes, and revoked sessions", async () => {
    expect((await request("POST", `/api/campaigns/${campaignId}/entries`, players[0]!.cookie, { title: "Forged", passages: [], userId: "owner" })).statusCode).toBe(400);
    expect((await request("POST", `/api/campaigns/${campaignId}/entries`, players[0]!.cookie, { title: "Forged", passages: [] })).statusCode).toBe(404);
    const csrf = await app.inject({ method: "POST", url: "/api/campaigns", headers: { cookie: gm, origin: "https://attacker.test" }, payload: { name: "No" } });
    expect(csrf.statusCode).toBe(404);
    const copy = await createIdentity(db, config).issueSession(players[0]!.userId);
    await createIdentity(db, config).revoke(players[0]!.userId, copy.credentialId);
    expect((await request("GET", "/api/me", `chronicle_session=${copy.value}`)).statusCode).toBe(404);
  });

  it("does not expose hidden link targets or hidden-source changes through the real HTTP listener", async () => {
    const hidden = (await request("POST", `/api/campaigns/${campaignId}/entries`, gm, { title: "Hidden target", passages: [paragraph("private")] })).json();
    const input = { title: "Visible anchor", passages: [paragraph("hidden first"), { inhalt: { kind: "absatz", inhalt: [{ text: "the door", marks: [{ art: "link", zielSlug: "hidden-target", zielEntryId: hidden.entryId }] }] } }] };
    const entry = (await request("POST", `/api/campaigns/${campaignId}/entries`, gm, input)).json();
    await request("POST", `/api/campaigns/${campaignId}/reveal`, gm, { actorId: players[0]!.actorId, passageId: entry.passagen[1].pid });
    const address = await app.listen({ port: 0, host: "127.0.0.1" });
    const read = () => fetch(`${address}/api/campaigns/${campaignId}/entries/${entry.entryId}`, { headers: { cookie: players[0]!.cookie } }).then((r) => r.text());
    const before = await read();
    expect(before).not.toContain(hidden.entryId);
    await request("PUT", `/api/campaigns/${campaignId}/entries/${entry.entryId}`, gm,
      { title: input.title, expectedVersion: 1, passages: [paragraph("different sealed content"), { ...input.passages[1], pid: entry.passagen[1].pid }] });
    expect(await read()).toBe(before);
  });
});

it("keeps identity and document bytes through a full durable database close/reopen", async () => {
  const directory = await mkdtemp(join(tmpdir(), "chronicle-restart-"));
  let db: Db | undefined, app: FastifyInstance | undefined;
  try {
    db = await createTestDb(directory); await migrate(db); app = await buildApp(db, config);
    const session = await createIdentity(db, config).bootstrap("Kaya");
    const headers = { cookie: `chronicle_session=${session.value}`, origin: config.origin };
    const campaign = (await app.inject({ method: "POST", url: "/api/campaigns", headers, payload: { name: "Persistent" } })).json();
    const article = (await app.inject({ method: "POST", url: `/api/campaigns/${campaign.id}/entries`, headers, payload: { title: "Remembered", passages: [paragraph("after restart")] } })).json();
    const url = `/api/campaigns/${campaign.id}/entries/${article.entryId}`;
    const before = (await app.inject({ url, headers })).body;
    await app.close(); await db.close();
    db = await createTestDb(directory); await migrate(db); app = await buildApp(db, config);
    expect((await app.inject({ url, headers })).body).toBe(before);
  } finally {
    await app?.close(); await db?.close();
    if (resolve(directory).startsWith(resolve(tmpdir()) + "\\chronicle-restart-")) await rm(directory, { recursive: true });
  }
}, 30_000);
