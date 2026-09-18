// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2026 Kaya Yesilyurt - Atlas Chronicles. Siehe LICENSE.
import { afterAll, beforeAll, expect, it } from "vitest";
import { createIdentity, reachability } from "../src/identity/index.ts";
import { createTestDb, migrate, type Db } from "../src/db/index.ts";
import { isPrivateLanAddress, localLanAddresses, sessionCookieSecure } from "../src/network.ts";
import { validateEmbeddedHostConfig } from "../src/host.ts";

let db: Db;
beforeAll(async () => { db = await createTestDb(); await migrate(db); }, 30_000);
afterAll(async () => { await db?.close(); });

it("uses an HTTP session cookie only for explicitly enabled private LAN transport", async () => {
  const config = { origin: "http://192.168.178.54:45101", cookieSecret: "l".repeat(64), allowInsecureLan: true };
  const identity = createIdentity(db, config), gm = await identity.bootstrap("LAN GM");
  expect(gm.setCookie).toContain("HttpOnly;");
  expect(gm.setCookie).toContain("SameSite=Strict;");
  expect(gm.setCookie).not.toMatch(/; Secure(?:;|$)/);
  expect(identity.clearCookie()).not.toMatch(/; Secure(?:;|$)/);
  expect((await identity.authenticate(`chronicle_session=${gm.value}`)).userId).toBe(gm.userId);
});

it("keeps Secure by default and rejects a transport downgrade for any public or ambiguous target", () => {
  for (const origin of ["http://localhost:45101", "https://chronicle.example", "http://192.168.1.2:45101"])
    expect(sessionCookieSecure(origin)).toBe(true);
  for (const origin of ["http://localhost:45101", "http://127.0.0.1:45101", "https://192.168.1.2:45101", "http://8.8.8.8:45101",
    "http://100.64.1.2:45101", "http://169.254.1.2:45101", "http://192.168.1.2:45101/", "http://192.168.1.2:45101/path",
    "http://192.168.1.2:45101?origin=private", "http://user@192.168.1.2:45101", "http://0xc0a80102:45101", "http://[::1]:45101"])
    expect(() => createIdentity(db, { origin, cookieSecret: "t".repeat(64), allowInsecureLan: true }), origin).toThrow("private IPv4");
  expect(reachability("http://192.168.1.2:45101", true)).toMatchObject({ secureContext: false, passkeyEligible: false, selfHostTransport: "explicit-private-lan" });
  expect(reachability("http://localhost:45101")).toMatchObject({ secureContext: true, passkeyEligible: true });
});

it("lists only non-loopback private IPv4 interfaces without guessing a public, VPN or link-local target", () => {
  const adapter = (address: string, internal = false) => ({ address, family: "IPv4" as const, internal, netmask: "255.255.255.0", mac: "00:00:00:00:00:00", cidr: `${address}/24` });
  expect(localLanAddresses({ WLAN: [adapter("192.168.1.2")], Ethernet: [adapter("10.2.3.4")], Bridge: [adapter("192.168.1.2")],
    Loopback: [adapter("127.0.0.1", true)], Tailscale: [adapter("100.64.1.2")], Disconnected: [adapter("169.254.1.2")], Public: [adapter("8.8.8.8")] }))
    .toEqual([{ address: "10.2.3.4", name: "Ethernet" }, { address: "192.168.1.2", name: "Bridge" }]);
  expect(isPrivateLanAddress("172.16.0.1")).toBe(true); expect(isPrivateLanAddress("172.31.255.254")).toBe(true);
  expect(isPrivateLanAddress("172.32.0.1")).toBe(false); expect(isPrivateLanAddress("192.168.001.2")).toBe(false);
});

it("keeps PostgreSQL and the operative ports isolated, whichever addresses the world answers on", () => {
  // Die Adressregeln selbst stehen in `welt-adressen.test.ts`: seit dem 17.09.2026 ist `origin`
  // immer die eigene Adresse der Welt (`http://localhost:<Port>`), und `lanAddress` schaltet eine
  // ZWEITE Adresse frei, statt die erste zu ersetzen. Vorher wechselte die Adresse einer Welt mit
  // dem Netz — und damit der Cookie-Topf ihres Fensters, was die Spielleitung aussperrte.
  const config = { databaseUrl: "postgresql://chronicle:test@127.0.0.1:45102/postgres", origin: "http://localhost:45101", lanAddress: "192.168.1.2", cookieSecret: "c".repeat(64), staticRoot: "/client" };
  expect(validateEmbeddedHostConfig(config)).toBe(45101);
  const { lanAddress: _address, ...ohneHeimnetz } = config;
  // Ohne Heimnetz laeuft dieselbe Welt unveraendert weiter — nur eben nur auf der Rueckschleife.
  expect(validateEmbeddedHostConfig(ohneHeimnetz)).toBe(45101);
  for (const invalid of [{ lanAddress: "0.0.0.0" }, { origin: "http://localhost:3000" },
    { databaseUrl: "postgresql://chronicle:test@192.168.1.2:45102/postgres" },
    { databaseUrl: "postgresql://chronicle:test@127.0.0.1:54329/postgres" }]) expect(() => validateEmbeddedHostConfig({ ...config, ...invalid }), JSON.stringify(invalid)).toThrow();
});
