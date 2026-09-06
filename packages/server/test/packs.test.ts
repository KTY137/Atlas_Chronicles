import { createHash } from "node:crypto";
import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import Fastify, { type FastifyError, type FastifyReply, type FastifyRequest } from "fastify";
import { createTestDb, migrate, type Db } from "../src/db/index.ts";
import { createIdentity } from "../src/identity/index.ts";
import { Gone } from "../src/domain/errors.ts";
import { createPacks, PackIntegrityError } from "../src/domain/packs.ts";
import { registerPacks } from "../src/http/packs.ts";

/**
 * Security is the point of this file.
 *
 * The route under test hands a map renderer real pack artwork by name. Everything here exists to
 * pin down the one property that actually matters: a request cannot make the server read, or
 * respond with the bytes of, anything the manifest did not already declare — and what it does
 * declare must be served exactly as recorded, or not at all.
 */
describe("packs: serving asset-pack artwork against the real pk.grundriss pack", () => {
  const identityConfig = { origin: "https://packs.test", cookieSecret: "packs-test-cookie-secret-with-at-least-32-characters" };
  let db: Db, app: ReturnType<typeof Fastify>, cookie: string;

  beforeAll(async () => {
    db = await createTestDb(); await migrate(db);
    const identity = createIdentity(db, identityConfig);
    const account = await identity.bootstrap("Packs GM");
    cookie = account.setCookie.split(";")[0]!;
    app = Fastify();
    // Mirrors the convention every other standalone-route test in this suite uses (media.test.ts):
    // the real app's Gone -> 404 mapping, reproduced locally so this file does not depend on app.ts.
    app.setErrorHandler((error: FastifyError, _req: FastifyRequest, reply: FastifyReply) =>
      reply.code(error instanceof Gone ? 404 : (typeof error === "object" && error !== null && "validation" in error) ? 400 : 500).send({ error: "unavailable" }));
    registerPacks(app, db, identityConfig);
  }, 30_000);
  afterAll(async () => { await app?.close(); await db?.close(); });

  const get = (url: string, withCookie = true) => app.inject({ method: "GET", url, headers: withCookie ? { cookie } : {} });

  it("lists the real installed pack with id, version, asset count and licence", async () => {
    const response = await get("/api/packs");
    expect(response.statusCode).toBe(200);
    const list = response.json() as Array<{ id: string; version: string; assetCount: number; lizenz: { spdx: string } }>;
    const entry = list.find((p) => p.id === "pk.grundriss");
    expect(entry).toBeTruthy();
    expect(entry!.version).toMatch(/^\d+\.\d+\.\d+$/);
    expect(entry!.assetCount).toBe(41);
    expect(entry!.lizenz.spdx).toBe("CC0-1.0");
  });

  it("parses the manifest and reports all 41 assets", async () => {
    const response = await get("/api/packs/pk.grundriss/manifest");
    expect(response.statusCode).toBe(200);
    const manifest = response.json();
    expect(manifest.id).toBe("pk.grundriss");
    expect(manifest.schemaVersion).toBe(1);
    expect(manifest.assets).toHaveLength(41);
  });

  it("serves a known asset with its declared mime type, and its bytes hash to the manifest value", async () => {
    const manifest = (await get("/api/packs/pk.grundriss/manifest")).json() as { assets: Array<{ name: string; datei: string; sha256: string }> };
    const asset = manifest.assets.find((a) => a.name === "boden_stein");
    expect(asset).toBeTruthy();
    const response = await get(`/api/packs/pk.grundriss/asset/${asset!.datei}`);
    expect(response.statusCode).toBe(200);
    expect(response.headers["content-type"]).toMatch(/^image\/svg\+xml/);
    expect(createHash("sha256").update(response.rawPayload).digest("hex")).toBe(asset!.sha256);
    expect(response.headers.etag).toBe(`"${asset!.sha256}"`);
  });

  it("round-trips the ETag: a matching If-None-Match yields 304 with no body", async () => {
    const first = await get("/api/packs/pk.grundriss/asset/boden/boden_stein.svg");
    expect(first.statusCode).toBe(200);
    const etag = first.headers.etag as string;
    const second = await app.inject({
      method: "GET", url: "/api/packs/pk.grundriss/asset/boden/boden_stein.svg",
      headers: { cookie, "if-none-match": etag },
    });
    expect(second.statusCode).toBe(304);
    expect(second.rawPayload.length).toBe(0);
  });

  it("refuses an encoded-slash (..%2f) traversal attempt with a 4xx", async () => {
    const response = await get("/api/packs/pk.grundriss/asset/..%2f..%2fpaket.json");
    expect(response.statusCode).toBeGreaterThanOrEqual(400);
    expect(response.statusCode).toBeLessThan(500);
  });

  it("refuses a literal ../ traversal attempt with a 4xx", async () => {
    const response = await get("/api/packs/pk.grundriss/asset/../paket.json");
    expect(response.statusCode).toBeGreaterThanOrEqual(400);
    expect(response.statusCode).toBeLessThan(500);
  });

  it("refuses an absolute path with a 4xx", async () => {
    const response = await get("/api/packs/pk.grundriss/asset/%2Fetc%2Fpasswd");
    expect(response.statusCode).toBeGreaterThanOrEqual(400);
    expect(response.statusCode).toBeLessThan(500);
  });

  it("404s a name that is not in the manifest even though the file exists on disk", async () => {
    // paket.json itself sits right next to every declared asset and is a perfectly real file —
    // and is not, and must never become, a declared asset.
    const response = await get("/api/packs/pk.grundriss/asset/paket.json");
    expect(response.statusCode).toBe(404);
  });

  it("404s an unknown pack id, for both the manifest and the asset route", async () => {
    expect((await get("/api/packs/does-not-exist/manifest")).statusCode).toBe(404);
    expect((await get("/api/packs/does-not-exist/asset/whatever.svg")).statusCode).toBe(404);
  });

  it("refuses unauthenticated requests on every route", async () => {
    expect((await get("/api/packs", false)).statusCode).toBeGreaterThanOrEqual(400);
    expect((await get("/api/packs/pk.grundriss/manifest", false)).statusCode).toBeGreaterThanOrEqual(400);
    expect((await get("/api/packs/pk.grundriss/asset/boden/boden_stein.svg", false)).statusCode).toBeGreaterThanOrEqual(400);
  });
});

/**
 * The domain-level integrity boundary, exercised against throwaway fixture packs.
 *
 * These never touch the repository's real `assets/packs/pk.grundriss/` — tampering with a
 * committed asset to prove a hash check works would corrupt the very thing the check protects.
 * `createPacks({ root })` accepts a scan-root override for exactly this reason (see
 * `domain/packs.ts`); production code always calls it with no arguments.
 */
describe("packs: domain-level integrity boundary (fixture packs)", () => {
  const roots: string[] = [];
  afterAll(async () => { await Promise.all(roots.map((dir) => rm(dir, { recursive: true, force: true }))); });

  const svg = '<svg xmlns="http://www.w3.org/2000/svg"></svg>';
  const realHash = createHash("sha256").update(svg).digest("hex");

  async function fixture(overrides: { sha256?: string; bytes?: number } = {}) {
    const root = await mkdtemp(join(tmpdir(), "chronicle-packs-fixture-"));
    roots.push(root);
    const packDir = join(root, "pk.fixture");
    await mkdir(join(packDir, "boden"), { recursive: true });
    await writeFile(join(packDir, "boden", "echt.svg"), svg, "utf8");
    await writeFile(join(packDir, "boden", "undeclared.svg"), svg, "utf8"); // real file, never in the manifest
    await writeFile(join(packDir, "lizenz.txt"), "CC0", "utf8");
    const manifest = {
      schemaVersion: 1, kind: "asset-pack", id: "pk.fixture", titel: "Fixture", version: "1.0.0", urheber: "Test",
      zellgroesse: 64,
      lizenz: { spdx: "CC0-1.0", inhaber: "Test", herkunft: "eigen", quelle: null, datei: "lizenz.txt", textSha256: "a".repeat(64) },
      assets: [{
        name: "echt", art: "boden", datei: "boden/echt.svg", mimeType: "image/svg+xml",
        sha256: overrides.sha256 ?? realHash, bytes: overrides.bytes ?? Buffer.byteLength(svg, "utf8"),
        groesse: [64, 64], anker: [32, 32], einheiten: [1, 1], kachelbar: true, schlagworte: [], lizenz: null,
      }],
    };
    await writeFile(join(packDir, "paket.json"), JSON.stringify(manifest), "utf8");
    return createPacks({ root });
  }

  it("serves a correctly hashed fixture asset", async () => {
    const packs = await fixture();
    const read = packs.readAsset("pk.fixture", "boden/echt.svg");
    expect(read.mimeType).toBe("image/svg+xml");
    expect(createHash("sha256").update(read.bytes).digest("hex")).toBe(realHash);
  });

  it("refuses a tampered sha256 instead of serving the bytes", async () => {
    const packs = await fixture({ sha256: "b".repeat(64) });
    expect(() => packs.readAsset("pk.fixture", "boden/echt.svg")).toThrow(PackIntegrityError);
  });

  it("refuses a file whose on-disk size disagrees with the manifest's declared bytes (bounded response)", async () => {
    const packs = await fixture({ bytes: 999_999 });
    expect(() => packs.readAsset("pk.fixture", "boden/echt.svg")).toThrow(PackIntegrityError);
  });

  it("treats a file on disk that the manifest never declared as nonexistent", async () => {
    const packs = await fixture();
    expect(() => packs.resolveAsset("pk.fixture", "boden/undeclared.svg")).toThrow(Gone);
  });

  it("rejects traversal and absolute-path names at the manifest lookup, never at the filesystem", async () => {
    const packs = await fixture();
    expect(() => packs.resolveAsset("pk.fixture", "../../etc/passwd")).toThrow(Gone);
    expect(() => packs.resolveAsset("pk.fixture", "/etc/passwd")).toThrow(Gone);
    expect(() => packs.resolveAsset("pk.fixture", "boden/../../../etc/passwd")).toThrow(Gone);
  });
});
