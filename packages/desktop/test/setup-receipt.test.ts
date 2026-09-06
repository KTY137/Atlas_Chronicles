import { EventEmitter } from "node:events";
import { afterEach, expect, it, vi } from "vitest";
import type { ProfileStore, OwnedProfile } from "../src/profiles.ts";
const mocks = vi.hoisted(() => ({ fork: vi.fn(), stop: vi.fn(async () => undefined) }));
vi.mock("electron", () => ({ utilityProcess: { fork: mocks.fork } }));
vi.mock("../src/postgres.ts", () => ({ ManagedPostgres: class { async start() {} stop = mocks.stop; } }));
import { HostController } from "../src/controller.ts";
afterEach(() => vi.useRealTimers());
it("persists a late committed setup receipt in the original profile after timeout without restoring ready", async () => {
  const owned: OwnedProfile = { profile: { version: 1, id: "11111111-1111-4111-8111-111111111111", name: "Original", createdAt: "2026-09-06T00:00:00Z", httpPort: 45101, pgPort: 45102, pgMajor: 17 }, directory: "C:/isolated-unused", dataDirectory: "C:/isolated-unused/postgres", secrets: { databasePassword: "a".repeat(64), cookieSecret: "b".repeat(64) } };
  const worker = Object.assign(new EventEmitter(), { postMessage: vi.fn(), kill: vi.fn() });
  const saveSetupReceipt = vi.fn(async () => undefined), unlock = vi.fn(async () => undefined);
  const store = { open: async () => owned, lock: async () => unlock, saveSetupReceipt } as unknown as ProfileStore;
  mocks.fork.mockReturnValue(worker);
  worker.postMessage.mockImplementation((message: { kind: string; id: string; startId: string }) => {
    if (message.kind === "start") queueMicrotask(() => worker.emit("message", { id: message.id, startId: message.startId, ok: true, value: { origin: "http://localhost:45101", nodeVersion: "24.test", decoder: "test", setupRequired: true } }));
  });
  const controller = new HostController(store, "C:/unused", "C:/unused", vi.fn(), { beforeSchema: async () => undefined });
  await controller.start(owned.profile.id);
  vi.useFakeTimers();
  const result = controller.request("setup", { name: "First GM" }).catch(error => error as Error);
  const sent = worker.postMessage.mock.calls.at(-1)![0] as { id: string; startId: string };
  await vi.advanceTimersByTimeAsync(90_001); await result;
  worker.emit("message", { ...sent, ok: true, value: { value: "private-test-receipt", expiresAt: Date.now() + 60000 } });
  await vi.waitFor(() => expect(saveSetupReceipt).toHaveBeenCalledWith(owned, expect.objectContaining({ value: "private-test-receipt" })));
  expect(controller.state).toBe("failed"); expect(controller.ready).toBeUndefined(); expect(worker.kill).not.toHaveBeenCalled(); expect(unlock).not.toHaveBeenCalled();
});
