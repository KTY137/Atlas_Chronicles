// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2026 Kaya Yesilyurt - Atlas Chronicles. Siehe LICENSE.
import { EventEmitter } from "node:events";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import type { ProfileStore, OwnedProfile } from "../src/profiles.ts";

const mock = vi.hoisted(() => ({ fork: vi.fn(), pgStart: vi.fn(), pgStop: vi.fn() }));
vi.mock("electron", () => ({ utilityProcess: { fork: mock.fork } }));
vi.mock("../src/postgres.ts", () => ({ ManagedPostgres: class { start = mock.pgStart; stop = mock.pgStop; } }));
import { HostController } from "../src/controller.ts";

const owned: OwnedProfile = {
  profile: { version: 1, id: "11111111-1111-4111-8111-111111111111", name: "Unit fixture", createdAt: "2026-09-06T00:00:00Z", httpPort: 45101, pgPort: 45102, pgMajor: 17 },
  directory: "C:/test-only-unused-profile", dataDirectory: "C:/test-only-unused-profile/postgres",
  secrets: { databasePassword: "a".repeat(64), cookieSecret: "b".repeat(64) },
};
interface Request { id: string; startId: string; kind: string }
async function harness() {
  const worker = Object.assign(new EventEmitter(), { postMessage: vi.fn<(message: Request) => void>(), kill: vi.fn() });
  const unlock = vi.fn(async () => undefined);
  const store = { open: vi.fn(async () => owned), lock: vi.fn(async () => unlock) } as unknown as ProfileStore;
  worker.postMessage.mockImplementation(message => {
    if (message.kind === "start") queueMicrotask(() => worker.emit("message", { id: message.id, startId: message.startId, ok: true, value: { origin: "http://localhost:45101", nodeVersion: "24.test", decoder: "test", setupRequired: true } }));
  });
  mock.fork.mockReturnValue(worker);
  // This controller-only fixture opens no database; production must provide its
  // real authenticated recovery-point admission before schema changes.
  const controller = new HostController(store, "C:/unused-assets", "C:/unused-runtime", vi.fn(), { beforeSchema: async () => undefined });
  await controller.start(owned.profile.id);
  return { controller, worker, unlock };
}

beforeEach(() => { vi.clearAllMocks(); mock.pgStart.mockResolvedValue(undefined); mock.pgStop.mockResolvedValue(undefined); });
afterEach(() => vi.useRealTimers());

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
