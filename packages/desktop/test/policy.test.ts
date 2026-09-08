// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2026 Kaya Yesilyurt - Atlas Chronicles. Siehe LICENSE.
import { describe, expect, it } from "vitest";
import { Authority, command, contained, hostEnvironment, partitionFor, postgresCommandOwnsDirectory, remoteOrigin, safeEnvironment } from "../src/policy.ts";
import { parseProfile } from "../src/profiles.ts";

describe("native management boundaries", () => {
  it.each(["http://example.org", "file:///etc/passwd", "https://user:secret@example.org", "https://example.org/path", "https://example.org?token=secret", "https://example.org/#x", "javascript:alert(1)", "https:\\evil.test"])("rejects remote target %s", origin => expect(() => remoteOrigin(origin)).toThrow());
  it("normalizes exact HTTPS targets into independent sessions", () => {
    expect(remoteOrigin("https://EXAMPLE.org:443/")).toBe("https://example.org");
    expect(partitionFor("http://localhost:45001")).not.toBe(partitionFor("http://localhost:45002"));
  });
  it("rejects hidden filesystem, process and target controls", () => {
    for (const value of [{ kind: "create", name: "World", directory: "C:/outside" }, { kind: "stop", profileId: "fake" }, { kind: "start", profileId: "../../.local" }, { kind: "shell", command: "whoami" }, { kind: "setup", name: "bad\nname" }])
      expect(() => command(value)).toThrow();
    expect(() => contained("C:/profiles", "..", "config.json")).toThrow();
  });
  it("invalidates file-dialog authority after navigation and profile replacement", () => {
    const authority = new Authority(); authority.select("a");
    const dialog = authority.lease(); authority.select("b"); expect(dialog).toThrow();
    const transfer = authority.lease(); authority.navigate(); expect(transfer).toThrow();
    expect(authority.lease()).not.toThrow();
  });
  it("never inherits database or Node execution settings into the host worker", () => {
    const env = safeEnvironment({ SystemRoot: "C:/Windows", DATABASE_URL: "private", NODE_OPTIONS: "--import unsafe", PATH: "C:/evil", COOKIE_SECRET: "private", ELECTRON_RUN_AS_NODE: "1" });
    expect(env).toEqual({ SystemRoot: "C:/Windows" });
  });
  it("recognizes pg_ctl Windows slash normalization without accepting a sibling directory", () => {
    expect(postgresCommandOwnsDirectory('"C:/runtime/bin/postgres.exe" -D "C:/profiles/owned/postgres" ', "C:\\profiles\\owned\\postgres")).toBe(true);
    expect(postgresCommandOwnsDirectory('"C:/runtime/bin/postgres.exe" -D "C:/profiles/owned/postgres-other" ', "C:\\profiles\\owned\\postgres")).toBe(false);
    expect(postgresCommandOwnsDirectory('"C:/runtime/bin/postgres.exe" -D "C:/foreign" -c other="C:/profiles/owned/postgres"', "C:\\profiles\\owned\\postgres")).toBe(false);
  });
  it("passes only dedicated configured Chronist credentials to the private host", () => {
    const source = { SystemRoot: "C:/Windows", CHRONICLE_CHRONIST_CONFIG: "C:/Atlas/provider.json",
      CHRONICLE_CHRONIST_KEY_OPENAI: "synthetic-test-key", OPENAI_API_KEY: "unrelated-account",
      LANGSMITH_API_KEY: "unrelated-tracing", NODE_OPTIONS: "--import unsafe", DATABASE_URL: "private" };
    expect(hostEnvironment(source)).toEqual({ SystemRoot: "C:/Windows", CHRONICLE_CHRONIST_CONFIG: source.CHRONICLE_CHRONIST_CONFIG,
      CHRONICLE_CHRONIST_KEY_OPENAI: "synthetic-test-key" });
    expect(safeEnvironment(source)).toEqual({ SystemRoot: "C:/Windows" });
    expect(hostEnvironment({ ...source, CHRONICLE_CHRONIST_CONFIG: "" })).toEqual({ SystemRoot: "C:/Windows" });
    expect(() => hostEnvironment({ CHRONICLE_CHRONIST_CONFIG: "relative.json" })).toThrow();
    expect(hostEnvironment({ ...source, CHRONICLE_CHRONIST_KEY_OPENAI: "invalid\r\nkey" })).not.toHaveProperty("CHRONICLE_CHRONIST_KEY_OPENAI");
  });
  it("rejects profile major-version replacement and operative ports", () => {
    const profile = { version: 1, id: "11111111-1111-4111-8111-111111111111", name: "World", createdAt: new Date().toISOString(), httpPort: 44001, pgPort: 44002, pgMajor: 17 };
    expect(parseProfile(profile)).toEqual(profile);
    for (const invalid of [{ pgMajor: 18 }, { httpPort: 3000 }, { pgPort: 54329 }, { httpPort: 44002 }, { databaseUrl: "remote" }]) expect(() => parseProfile({ ...profile, ...invalid })).toThrow();
  });
});
