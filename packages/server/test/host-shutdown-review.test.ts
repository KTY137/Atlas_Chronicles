// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2026 Kaya Yesilyurt - Atlas Chronicles. Siehe LICENSE.
import { beforeEach, expect, it, vi } from "vitest";
import type { Db } from "../src/db/index.ts";

const mock = vi.hoisted(() => ({ listen: vi.fn(), drain: vi.fn(), migrate: vi.fn() }));
vi.mock("../src/app.ts", () => ({ buildApp: async () => ({ listen: mock.listen, close: mock.drain }) }));
vi.mock("../src/db/index.ts", () => ({ migrate: mock.migrate, createPgDb: () => { throw new Error("Unit review must never open PostgreSQL"); } }));
import { startEmbeddedHost } from "../src/host.ts";

const config = { databaseUrl: "postgresql://chronicle:test@127.0.0.1:45102/postgres", origin: "http://localhost:45101", cookieSecret: "c".repeat(64), staticRoot: "C:/test-only-unused-client" };
const database = () => ({ close: vi.fn(async () => undefined), query: vi.fn(), transaction: vi.fn() });
beforeEach(() => {
  vi.clearAllMocks(); mock.listen.mockReset().mockResolvedValue(undefined);
  mock.drain.mockReset().mockResolvedValue(undefined); mock.migrate.mockReset().mockResolvedValue(undefined);
});

it("never closes the SQL pool beneath an unconfirmed HTTP drain", async () => {
  const db = database(), host = await startEmbeddedHost(config, db as Db);
  mock.drain.mockRejectedValueOnce(new Error("drain pending"));
  await expect(host.close()).rejects.toThrow("drain pending");
  expect(db.close).not.toHaveBeenCalled();
  await expect(host.state()).rejects.toThrow("draining");
});

it("allows an explicit retry of a transient SQL-pool close failure after HTTP has drained", async () => {
  const db = database(), host = await startEmbeddedHost(config, db as Db);
  db.close.mockRejectedValueOnce(new Error("transient pool close fault"));
  await expect(host.close()).rejects.toThrow("transient pool close fault");
  expect(mock.drain).toHaveBeenCalledOnce();
  await expect(host.state()).rejects.toThrow("draining");
  await expect(host.close()).resolves.toBeUndefined();
  expect(db.close).toHaveBeenCalledTimes(2);
});
