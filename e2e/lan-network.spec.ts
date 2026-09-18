// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2026 Kaya Yesilyurt - Atlas Chronicles. Siehe LICENSE.
import { test, expect, type Page } from "@playwright/test";
import { createServer } from "node:net";
import { get } from "node:http";
import { randomBytes } from "node:crypto";
import { dirname, resolve } from "node:path";
import { mkdir, writeFile } from "node:fs/promises";
import NodeWebSocket from "ws";
import { startEmbeddedHost, localLanAddresses } from "../packages/server/src/host.ts";
import { createTestDb } from "../packages/server/src/db/index.ts";

const adapters = localLanAddresses(), requestedAddress = process.env.CHRONICLE_TEST_LAN_IP;
const lanAddress = requestedAddress ?? adapters[0]?.address;
if (requestedAddress && !adapters.some(adapter => adapter.address === requestedAddress)) throw new Error("CHRONICLE_TEST_LAN_IP must belong to this machine.");

async function freePort(address: string): Promise<number> {
  return new Promise((resolvePort, reject) => {
    const listener = createServer(); listener.once("error", reject);
    listener.listen(0, address, () => {
      const bound = listener.address();
      if (!bound || typeof bound === "string") return reject(new Error("Missing test port."));
      listener.close(() => resolvePort(bound.port));
    });
  });
}
async function request(page: Page, path: string, method = "GET", body?: unknown) {
  return page.evaluate(async ({ path, method, body }) => {
    const result = await fetch(path, { method, ...(body === undefined ? {} : { headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }) });
    return { status: result.status, body: await result.json() };
  }, { path, method, body });
}

for (const mode of ["localhost", "lan"] as const) test(`${mode}: real browser invitation, cookie return and two live clients`, async ({ browser }, testInfo) => {
  test.skip(mode === "lan" && !lanAddress, "No private LAN adapter available; set CHRONICLE_TEST_LAN_IP to an actual adapter address.");
  const address = mode === "lan" ? lanAddress! : "127.0.0.1";
  // Seit dem 17.09.2026 hat eine Welt immer ihre eigene, feste Adresse; `lanAddress` schaltet eine
  // ZWEITE Adresse frei, statt die erste zu ersetzen. `origin` ist hier deshalb die Adresse, unter
  // der dieser Durchlauf spielt — im Heimnetzmodus die Heimnetz-Adresse, wie bei Mitspielern.
  const eigeneAdresse = `http://localhost:${await freePort(address)}`;
  const origin = mode === "lan" ? `http://${address}:${new URL(eigeneAdresse).port}` : eigeneAdresse;
  const host = await startEmbeddedHost({ databaseUrl: "postgresql://chronicle:test@127.0.0.1:45102/postgres", origin: eigeneAdresse,
    cookieSecret: randomBytes(32).toString("hex"), staticRoot: resolve("packages/client/dist"), ...(mode === "lan" ? { lanAddress: address } : {}) }, await createTestDb());
  const gmContext = await browser.newContext({ locale: "de-DE" }), playerContext = await browser.newContext({ locale: "de-DE" });
  const gm = await gmContext.newPage(), player = await playerContext.newPage(), errors: string[] = [];
  gm.on("pageerror", error => errors.push(error.message)); player.on("pageerror", error => errors.push(error.message));
  try {
    const owner = await host.setup("Netzwerk Spielleitung"), campaign = await host.rundeAnlegen("Netzwerk Testrunde");
    const pairing = await host.kopplung(campaign.id, owner.userId), invite = await host.einladung(campaign.id);
    await gm.goto(`${origin}/?pair=${encodeURIComponent(pairing.code)}`);
    await expect(gm.getByLabel("Kopplungslink oder Code der Spielleitung")).toHaveValue(pairing.code);
    await gm.getByRole("button", { name: "Gerät verbinden", exact: true }).click();
    await expect.poll(async () => (await request(gm, "/api/me")).status).toBe(200);
    if (mode === "lan") {
      await gm.goto(`${origin}/?campaign=${campaign.id}&stage=runde`);
      await gm.getByRole("button", { name: "Einladung erstellen", exact: true }).click();
      const link = gm.getByLabel("Einladungslink", { exact: true });
      await expect(link).toHaveValue(/\?join=.+/);
      expect(new URL(await link.inputValue()).origin).toBe(origin);
      expect(await gm.evaluate(() => typeof navigator.clipboard)).toBe("undefined");
      await gm.getByRole("button", { name: "Kopieren", exact: true }).click();
      await expect(gm.getByText(/^(Einladungslink kopiert\.|Der Link ist markiert\.)/)).toBeVisible();
      // Denied system clipboard access must leave a selected, manually copyable link.
      await gm.evaluate(() => { document.execCommand = () => false; });
      await gm.getByRole("button", { name: /^(Kopiert|Kopieren)$/ }).click();
      await expect(gm.getByText("Der Link ist markiert. Kopiere ihn mit Strg+C oder über das Kontextmenü.")).toBeVisible();
      expect(await link.evaluate(input => ({ start: (input as HTMLInputElement).selectionStart, end: (input as HTMLInputElement).selectionEnd, length: (input as HTMLInputElement).value.length })))
        .toMatchObject({ start: 0, end: (await link.inputValue()).length });
    }
    await gm.goto(`${origin}/?campaign=${campaign.id}&stage=tisch`);
    await player.goto(`${origin}/?join=${encodeURIComponent(invite.code)}`);
    await expect(player.getByLabel("Einladungslink oder Code", { exact: true })).toHaveValue(invite.code);
    if (mode === "lan") await expect(player.getByRole("button", { name: "Mit Passkey anmelden" })).toBeDisabled();
    await player.getByLabel("Dein Name in der Runde").fill("Netzwerk Spieler");
    await player.getByRole("button", { name: "Beitritt anfragen" }).click();
    await expect(player.getByText("Deine Anfrage liegt bei der Spielleitung. Diese Seite aktualisiert sich automatisch.")).toBeVisible();
    const waiting = (await host.runden())[0]!.wartend[0]!;
    expect(waiting.displayName).toBe("Netzwerk Spieler");
    expect((await request(gm, `/api/campaigns/${campaign.id}/joins/${waiting.requestId}/approve`, "POST")).status).toBe(200);
    await player.getByRole("button", { name: "Die Runde betreten" }).click();
    await expect.poll(async () => (await request(player, "/api/me")).status).toBe(200);
    const playerMe = (await request(player, "/api/me")).body;
    expect(playerMe.userId).not.toBe(owner.userId);
    const cookies = (await playerContext.cookies(origin)).filter(cookie => cookie.name === "chronicle_session");
    expect(cookies).toHaveLength(1);
    expect(cookies[0]).toMatchObject({ httpOnly: true, sameSite: "Strict", secure: mode !== "lan" });
    expect(await player.evaluate(() => document.cookie)).not.toContain("chronicle_session");
    expect(await player.evaluate(() => isSecureContext)).toBe(mode !== "lan");
    const clientUuid = await player.evaluate(() => crypto.randomUUID());
    expect(clientUuid).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
    expect((await request(player, "/api/remember", "POST")).status).toBe(200);
    await player.reload();
    expect((await request(player, "/api/me")).body.userId).toBe(playerMe.userId);
    // These WebSockets use browser cookies and browser-generated Origin, with no injected headers.
    const connect = (page: Page) => page.evaluate(campaignId => {
      const probe = window as unknown as { lanProbe: { socket: WebSocket; packets: { type: string; members?: unknown[] }[] } };
      const socket = new WebSocket(`${location.origin.replace("http", "ws")}/api/campaigns/${campaignId}/live`);
      probe.lanProbe = { socket, packets: [] };
      socket.onmessage = event => probe.lanProbe.packets.push(JSON.parse(event.data));
    }, campaign.id);
    const packets = (page: Page) => page.evaluate(() => (window as unknown as { lanProbe: { packets: { type: string; members?: unknown[] }[] } }).lanProbe.packets);
    await connect(gm); await connect(player);
    await expect.poll(async () => (await packets(player)).some(packet => packet.type === "welcome")).toBe(true);
    await expect.poll(async () => (await packets(gm)).filter(packet => packet.type === "presence").at(-1)?.members?.length).toBe(2);
    const before = (await packets(gm)).filter(packet => packet.type === "refresh").length;
    expect((await request(player, `/api/campaigns/${campaign.id}/messages`, "POST", { commandId: clientUuid, kind: "letter", body: `Nachricht über ${mode}` })).status).toBe(200);
    await expect.poll(async () => (await packets(gm)).filter(packet => packet.type === "refresh").length).toBeGreaterThan(before);
    expect((await request(gm, `/api/campaigns/${campaign.id}/messages`)).body).toEqual(expect.arrayContaining([expect.objectContaining({ body: `Nachricht über ${mode}` })]));
    // Origin, Host and permission boundaries must also survive an authenticated LAN session.
    const foreignOrigin = await playerContext.request.post(`${origin}/api/campaigns`, { headers: { origin: "https://foreign.example" }, data: { name: "Forbidden" } });
    expect(foreignOrigin.status()).toBe(404);
    expect((await request(player, "/api/campaigns", "POST", { name: "Forbidden player campaign" })).status).toBe(404);
    const currentCookie = (await playerContext.cookies(origin)).find(cookie => cookie.name === "chronicle_session")!;
    const deniedSocket = await new Promise<number>((resolveStatus, reject) => {
      const socket = new NodeWebSocket(`${origin.replace("http", "ws")}/api/campaigns/${campaign.id}/live`, { headers: { origin: "https://foreign.example", cookie: `chronicle_session=${currentCookie.value}` }, handshakeTimeout: 5000 });
      socket.on("unexpected-response", (_req, response) => { resolveStatus(response.statusCode ?? 0); response.resume(); socket.terminate(); });
      socket.on("open", () => { socket.terminate(); reject(new Error("Foreign WebSocket origin accepted.")); });
      socket.on("error", reject);
    });
    expect(deniedSocket).toBe(404);
    if (mode === "lan") {
      const foreignHostStatus = await new Promise<number>((resolveStatus, reject) => {
        get(`${origin}/api/reachability`, { headers: { host: "foreign.example" }, timeout: 5000 }, response => {
          response.resume(); resolveStatus(response.statusCode ?? 0);
        }).on("error", reject);
      });
      expect(foreignHostStatus).toBe(404);
      // Die eigene Adresse der Welt antwortet im Heimnetzbetrieb MIT — das ist der feste Platz
      // der Spielleitung und der einzige Ort, an dem sie sich einen Passkey einrichten kann.
      // Ein Gewinn an Angriffsflaeche ist das nicht: wer 127.0.0.1 erreicht, sitzt an diesem
      // Rechner und erreicht dessen Heimnetz-Adresse ohnehin.
      const eigen = await fetch(`${eigeneAdresse}/api/health`, { signal: AbortSignal.timeout(3000) });
      expect(eigen.status).toBe(200);
      expect((await (await fetch(`${eigeneAdresse}/api/reachability`, { signal: AbortSignal.timeout(3000) })).json()))
        .toMatchObject({ passkeyEligible: true, secureContext: true });
      // Ohne Heimnetz bleibt es beim Gegenteil: dann hoert die Welt NUR auf der Rueckschleife.
      expect((await request(player, "/api/reachability")).body).toMatchObject({ passkeyEligible: false, secureContext: false, selfHostTransport: "explicit-private-lan" });
    }
    expect((await request(player, "/api/logout", "POST")).status).toBe(200);
    expect((await request(player, "/api/me")).status).toBe(404);
    const returning = await host.kopplung(campaign.id, playerMe.userId);
    await player.goto(`${origin}/?pair=${encodeURIComponent(returning.code)}`);
    await player.getByRole("button", { name: "Gerät verbinden", exact: true }).click();
    await expect.poll(async () => (await request(player, "/api/me")).body.userId).toBe(playerMe.userId);
    expect((await request(player, "/api/pairing/redeem", "POST", { code: returning.code })).status).toBe(404);
    expect(errors).toEqual([]);
    const evidence = { mode, origin,
      adapter: adapters.find(adapter => adapter.address === address)?.name ?? "loopback", browserClients: 2, browserCookies: true,
      invitationApproval: true, cookieReturn: true, pairingReturn: true, websocketPresenceAndRefresh: true,
      ...(mode === "lan" ? { clipboardWithoutSecureContext: true, clipboardDenialFallback: true } : {}),
      secondPhysicalComputer: false };
    const evidencePath = testInfo.outputPath("network-evidence.json");
    await mkdir(dirname(evidencePath), { recursive: true }); await writeFile(evidencePath, JSON.stringify(evidence, null, 2));
    await testInfo.attach("network-evidence", { contentType: "application/json", path: evidencePath });
  } finally { await playerContext.close(); await gmContext.close(); await host.close(); }
});
