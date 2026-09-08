// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2026 Kaya Yesilyurt - Atlas Chronicles. Siehe LICENSE.
import { createServer } from "node:net";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { basename, dirname, join, resolve } from "node:path";
import { expect, it, vi } from "vitest";
import { createTestDb } from "../src/db/index.ts";
import { createChronistRuntime } from "../src/chronist-providers/registry.ts";
import { startEmbeddedHost } from "../src/host.ts";

async function availablePort(): Promise<number> {
  return new Promise((resolvePort, reject) => {
    const server = createServer(); server.once("error", reject);
    server.listen(0, "127.0.0.1", () => {
      const address = server.address();
      if (!address || typeof address === "string") { server.close(); reject(new Error("Missing fixture port")); return; }
      server.close(error => error ? reject(error) : resolvePort(address.port));
    });
  });
}

it("reconfirms the Chronist drain on every embedded-host shutdown attempt before closing SQL", async () => {
  // Real Fastify must participate: unlike a reusable mock, it does not replay failed onClose hooks.
  const directory = await mkdtemp(join(tmpdir(), "chronicle-host-drain-"));
  const db = await createTestDb(), closeDatabase = vi.spyOn(db, "close");
  let released = false, host: Awaited<ReturnType<typeof startEmbeddedHost>> | undefined;
  const closeRuntime = vi.fn(async () => {
    expect(closeDatabase).not.toHaveBeenCalled();
    if (!released) throw new Error("fixture Chronist drain remains pending");
  });
  try {
    await writeFile(join(directory, "index.html"), "<!doctype html><title>Chronist drain fixture</title>");
    host = await startEmbeddedHost({
      databaseUrl: "postgresql://chronicle:test@127.0.0.1:45102/postgres",
      origin: `http://localhost:${await availablePort()}`, cookieSecret: "c".repeat(64), staticRoot: directory,
      chronist: { ...createChronistRuntime(), close: closeRuntime },
    }, db);

    await expect(host.close()).rejects.toThrow("drain remains pending");
    expect(closeRuntime).toHaveBeenCalledTimes(1); expect(closeDatabase).not.toHaveBeenCalled();
    await expect(host.state()).rejects.toThrow("draining");

    await expect(host.close()).rejects.toThrow("drain remains pending");
    expect(closeRuntime).toHaveBeenCalledTimes(2); expect(closeDatabase).not.toHaveBeenCalled();

    released = true;
    await expect(host.close()).resolves.toBeUndefined();
    expect(closeRuntime).toHaveBeenCalledTimes(3); expect(closeDatabase).toHaveBeenCalledTimes(1);
    await expect(host.close()).resolves.toBeUndefined();
    expect(closeRuntime).toHaveBeenCalledTimes(3); expect(closeDatabase).toHaveBeenCalledTimes(1);
  } finally {
    released = true;
    if (host) await host.close().catch(() => undefined);
    if (!closeDatabase.mock.calls.length) await db.close();
    const target = resolve(directory);
    if (dirname(target) !== resolve(tmpdir()) || !basename(target).startsWith("chronicle-host-drain-")) throw new Error("Fixture cleanup escaped its directory");
    await rm(target, { recursive: true, force: true });
  }
}, 30_000);
