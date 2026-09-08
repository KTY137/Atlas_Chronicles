// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2026 Kaya Yesilyurt - Atlas Chronicles. Siehe LICENSE.
import { createServer } from "node:net";
import { mkdtemp, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { expect, it, vi } from "vitest";
import { startEmbeddedHost, validateEmbeddedHostConfig } from "../src/host.ts";
import { createTestDb } from "../src/db/index.ts";
import { createChronistRuntime } from "../src/chronist-providers/registry.ts";

async function port(): Promise<number> {
  return new Promise((resolve, reject) => { const server = createServer(); server.once("error", reject); server.listen(0, "127.0.0.1", () => { const address = server.address(); if (!address || typeof address === "string") return reject(new Error("Missing port")); server.close(() => resolve(address.port)); }); });
}
it("requires explicit loopback settings and refuses operative targets", () => {
  const config = { databaseUrl: "postgresql://chronicle:secret@127.0.0.1:45002/postgres", origin: "http://localhost:45001", cookieSecret: "a".repeat(64), staticRoot: "/client" };
  expect(validateEmbeddedHostConfig(config)).toBe(45001);
  for (const invalid of [{ origin: "http://localhost:3000" }, { origin: "https://remote.test" }, { databaseUrl: "postgresql://user:secret@127.0.0.1:54329/chronicle" }, { databaseUrl: "postgresql://user:secret@remote:45002/postgres" }])
    expect(() => validateEmbeddedHostConfig({ ...config, ...invalid })).toThrow();
});
it("sets up only an empty world, serves the shared client and reopens the same identity", async () => {
  const directory = await mkdtemp(join(tmpdir(), "chronicle-host-test-"));
  const origin = `http://localhost:${await port()}`;
  const closeRuntime = vi.fn(async () => undefined);
  const config = { databaseUrl: "postgresql://chronicle:test@127.0.0.1:45002/postgres", origin, cookieSecret: "c".repeat(64), staticRoot: directory,
    chronist: { ...createChronistRuntime(), close: closeRuntime } };
  let host: Awaited<ReturnType<typeof startEmbeddedHost>> | undefined;
  try {
    await writeFile(join(directory, "index.html"), "<!doctype html><h1>Shared client</h1>");
    host = await startEmbeddedHost(config, await createTestDb(join(directory, "database")));
    expect(await host.state()).toEqual({ setupRequired: true });
    const gm = await host.setup("Local GM");
    await expect(host.setup("Second GM")).rejects.toThrow("empty");
    expect(await (await fetch(origin)).text()).toContain("Shared client");
    const me = await fetch(`${origin}/api/me`, { headers: { cookie: `chronicle_session=${gm.value}` } });
    expect((await me.json() as { userId: string }).userId).toBe(gm.userId);
    await host.close(); host = undefined;
    expect(closeRuntime).toHaveBeenCalledTimes(1);
    host = await startEmbeddedHost(config, await createTestDb(join(directory, "database")));
    expect(await host.state()).toEqual({ setupRequired: false });
    expect((await (await fetch(`${origin}/api/me`, { headers: { cookie: `chronicle_session=${gm.value}` } })).json() as { userId: string }).userId).toBe(gm.userId);
  } finally { await host?.close(); await rm(directory, { recursive: true, force: true }); }
}, 40_000);
it("refuses an occupied application port and closes its own SQL pool", async () => {
  const directory = await mkdtemp(join(tmpdir(), "chronicle-host-collision-")), occupied = createServer();
  await new Promise<void>(resolve => occupied.listen(0, "127.0.0.1", resolve));
  const address = occupied.address(); if (!address || typeof address === "string") throw new Error("Port missing");
  const db = await createTestDb(), close = vi.spyOn(db, "close");
  try {
    await writeFile(join(directory, "index.html"), "Shared client");
    const closeRuntime = vi.fn(async () => { expect(close).not.toHaveBeenCalled(); });
    await expect(startEmbeddedHost({ databaseUrl: "postgresql://chronicle:test@127.0.0.1:45002/postgres", origin: `http://localhost:${address.port}`, cookieSecret: "d".repeat(64), staticRoot: directory,
      chronist: { ...createChronistRuntime(), close: closeRuntime } }, db)).rejects.toThrow();
    expect(closeRuntime).toHaveBeenCalled();
    expect(close).toHaveBeenCalledTimes(1);
    expect(occupied.listening).toBe(true);
  } finally { await new Promise<void>(resolve => occupied.close(() => resolve())); await rm(directory, { recursive: true, force: true }); }
}, 30_000);
