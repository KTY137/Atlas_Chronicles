// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2026 Kaya Yesilyurt - Atlas Chronicles. Siehe LICENSE.
import { EventEmitter } from "node:events";
import { resolve } from "node:path";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import type { ProfileStore, OwnedProfile } from "../src/profiles.ts";

const mock = vi.hoisted(() => ({ fork: vi.fn(), pgStart: vi.fn(), pgStop: vi.fn() }));
vi.mock("electron", () => ({ utilityProcess: { fork: mock.fork } }));
vi.mock("../src/postgres.ts", () => ({ ManagedPostgres: class { start = mock.pgStart; stop = mock.pgStop; } }));
vi.mock("@chronicle/server/host", async importOriginal => ({ ...await importOriginal<typeof import("@chronicle/server/host")>(),
  localLanAddresses: () => [{ address: "192.168.1.2", name: "Test LAN" }] }));
import { HostController } from "../src/controller.ts";

const owned: OwnedProfile = {
  profile: { version: 1, id: "11111111-1111-4111-8111-111111111111", name: "Unit fixture", createdAt: "2026-09-06T00:00:00Z", httpPort: 45101, pgPort: 45102, pgMajor: 17 },
  directory: "C:/test-only-unused-profile", dataDirectory: "C:/test-only-unused-profile/postgres",
  secrets: { databasePassword: "a".repeat(64), cookieSecret: "b".repeat(64) },
};
interface Request { id: string; startId: string; kind: string; config?: { origin: string; lanAddress?: string } }
async function harness(chronistHostOf?: (profileId: string) => Promise<{ key?: string; configPath?: string; hinweis?: string }>, lanAddress?: string, reportedOrigin?: string, reportedLanOrigin?: string | null) {
  const worker = Object.assign(new EventEmitter(), { postMessage: vi.fn<(message: Request) => void>(), kill: vi.fn() });
  const unlock = vi.fn(async () => undefined);
  const store = { open: vi.fn(async () => owned), lock: vi.fn(async () => unlock) } as unknown as ProfileStore;
  worker.postMessage.mockImplementation(message => {
    if (message.kind === "start") queueMicrotask(() => {
      const echt = message.config!.lanAddress ? `http://${message.config!.lanAddress}:45101` : undefined;
      const gemeldet = reportedLanOrigin === undefined ? echt : reportedLanOrigin ?? undefined;
      worker.emit("message", { id: message.id, startId: message.startId, ok: true, value: { origin: reportedOrigin ?? message.config!.origin,
        ...(gemeldet ? { lanOrigin: gemeldet } : {}), nodeVersion: "24.test", decoder: "test", setupRequired: true } });
    });
  });
  mock.fork.mockReturnValue(worker);
  // This controller-only fixture opens no database; production must provide its
  // real authenticated recovery-point admission before schema changes.
  const controller = new HostController(store, "C:/unused-assets", "C:/unused-runtime", vi.fn(), { beforeSchema: async () => undefined }, chronistHostOf);
  await controller.start(owned.profile.id, lanAddress);
  return { controller, worker, unlock };
}

beforeEach(() => { vi.clearAllMocks(); mock.pgStart.mockResolvedValue(undefined); mock.pgStop.mockResolvedValue(undefined); });
afterEach(() => vi.useRealTimers());

it("keeps the world's own address and adds only the selected current LAN address as its second door", async () => {
  // Seit dem 17.09.2026: die eigene Adresse der Welt ist fest, das Heimnetz kommt DAZU. Vorher
  // ersetzte die Heimnetz-Adresse sie — dann wechselte die Adresse der Welt mit dem Netz und
  // sperrte die Spielleitung aus ihrem eigenen Cookie-Topf aus.
  const { controller, worker } = await harness(undefined, "192.168.1.2");
  expect(controller.ready?.origin).toBe("http://localhost:45101");
  expect(controller.ready?.lanOrigin).toBe("http://192.168.1.2:45101");
  expect(worker.postMessage).toHaveBeenCalledWith(expect.objectContaining({ kind: "start", config: expect.objectContaining({
    origin: "http://localhost:45101", lanAddress: "192.168.1.2", databaseUrl: expect.stringContaining("@127.0.0.1:45102/postgres") }) }));
  // Ohne Heimnetz laeuft dieselbe Welt unter derselben eigenen Adresse, nur ohne zweite Tuer.
  const ohne = await harness();
  expect(ohne.controller.ready?.origin).toBe("http://localhost:45101");
  expect(ohne.controller.ready?.lanOrigin).toBeUndefined();
  // Ein Startbeleg, der eine andere Adresse nennt als die angeforderte, gilt nicht — in beiden Feldern.
  await expect(harness(undefined, "192.168.1.2", "http://192.168.1.2:45101")).rejects.toThrow("Profil");
  await expect(harness(undefined, "192.168.1.2", undefined, "http://192.168.1.3:45101")).rejects.toThrow("Profil");
  await expect(harness(undefined, "192.168.1.2", undefined, null)).rejects.toThrow("Profil");
});

it("rejects an absent interface before starting PostgreSQL or a worker", async () => {
  await expect(harness(undefined, "192.168.1.99")).rejects.toThrow("nicht mehr verfügbar");
  expect(mock.pgStart).not.toHaveBeenCalled(); expect(mock.fork).not.toHaveBeenCalled();
});

it("invalidates ready authority when an unconfirmed mutating request times out", async () => {
  const { controller, worker } = await harness();
  vi.useFakeTimers();
  const timedOut = controller.request("setup", { name: "First GM" }).catch(error => error as { code: string });
  await vi.advanceTimersByTimeAsync(90_001);
  expect(await timedOut).toMatchObject({ code: "host-timeout" });
  // The worker is still executing the original mutation; a late reply is not proof
  // that retrying the original command is safe. Do not kill it or claim ready.
  expect(worker.kill).not.toHaveBeenCalled();
  expect(controller.state, "Unconfirmed setup must withdraw readiness until reconciled").toBe("failed");
  expect(controller.ready).toBeUndefined();
});

it("refuses new mutations after a failed drain while retaining the owned process and lock", async () => {
  const { controller, worker, unlock } = await harness();
  worker.postMessage.mockImplementation(message => queueMicrotask(() => worker.emit("message", { id: message.id, startId: message.startId, ok: message.kind !== "stop", value: { code: "unexpected-new-enrollment" } })));
  await expect(controller.stop()).rejects.toThrow();
  expect(controller.state).toBe("failed");
  expect(mock.pgStop).not.toHaveBeenCalled();
  expect(unlock).not.toHaveBeenCalled();
  await expect(controller.request("enroll", { campaignId: owned.profile.id, userId: owned.profile.id })).rejects.toThrow();
});

it("retains the lock and refuses PostgreSQL shutdown when worker drain is unconfirmed", async () => {
  const { controller, worker, unlock } = await harness();
  vi.useFakeTimers();
  const stopping = controller.stop().catch(error => error as { code: string });
  await vi.advanceTimersByTimeAsync(90_001);
  expect(await stopping).toMatchObject({ code: "host-timeout" });
  expect(controller.state).toBe("failed");
  expect(mock.pgStop).not.toHaveBeenCalled();
  expect(unlock).not.toHaveBeenCalled();
  expect(worker.kill).not.toHaveBeenCalled();
});

it("starts the world without a readable Chronist key and carries the reason", async () => {
  // Ein unlesbares Chiffrat kostet den Anbieter, nicht die Welt. Der Grund muss aber
  // irgendwo stehen, sonst fehlt der Chronist wortlos und niemand weiß, wo zu suchen ist.
  const hinweis = "Der gespeicherte Chronist-Schlüssel ist mit diesem Windows-Konto nicht lesbar.";
  const { controller, worker } = await harness(async () => ({ hinweis }));
  expect(controller.state).toBe("ready");
  expect(controller.chronistHinweis).toBe(hinweis);
  const optionen = mock.fork.mock.calls[0]![2] as { env: Record<string, string> };
  expect(optionen.env.CHRONICLE_CHRONIST_KEY_ANTHROPIC).toBeUndefined();
  expect(optionen.env.CHRONICLE_CHRONIST_CONFIG).toBeUndefined();
  // Nach dem Beenden gehört der Hinweis keiner laufenden Welt mehr.
  worker.postMessage.mockImplementation(message => queueMicrotask(() => worker.emit("message", { id: message.id, startId: message.startId, ok: true })));
  await controller.stop();
  expect(controller.chronistHinweis).toBeUndefined();
});

it("leaves no Chronist hint when the profile key reads cleanly", async () => {
  const { controller } = await harness(async () => ({ key: "synthetic-test-key", configPath: resolve("test-only-unused-profile/chronist-providers.json") }));
  expect(controller.state).toBe("ready");
  expect(controller.chronistHinweis).toBeUndefined();
  const optionen = mock.fork.mock.calls[0]![2] as { env: Record<string, string> };
  expect(optionen.env.CHRONICLE_CHRONIST_KEY_ANTHROPIC).toBe("synthetic-test-key");
});
