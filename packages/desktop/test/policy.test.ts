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
  /** Der Loeschbefehl. Der Name reist mit, weil die Bestaetigung nicht im Fenster stattfindet. */
  it("nimmt einen Löschbefehl nur mit Profilkennung und Namen an", () => {
    const welt = "6c59fc3e-1172-43d9-9e90-a60b5b46bed6";
    expect(command({ kind: "loeschen", profileId: welt, name: "Die Nordlande" })).toEqual({ kind: "loeschen", profileId: welt, name: "Die Nordlande" });
    // Ohne Namen keine Bestaetigung, mit fremdem Feld kein Befehl, und keine Kennung ausserhalb
    // der UUID-Form — dieselbe Grenze wie bei jedem anderen Profilbefehl.
    for (const value of [{ kind: "loeschen", profileId: welt }, { kind: "loeschen", name: "Die Nordlande" },
      { kind: "loeschen", profileId: welt, name: "Die Nordlande", force: true },
      { kind: "loeschen", profileId: "../..", name: "Die Nordlande" }, { kind: "loeschen", profileId: welt, name: "" }])
      expect(() => command(value)).toThrow();
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
  it("passes only the profile-bound Chronist key and operator file of the started world to the private host", () => {
    const profileFile = "C:/Users/test/profiles/11111111-1111-4111-8111-111111111111/chronist-providers.json";
    const base = { SystemRoot: "C:/Windows" };
    const keys = (env: NodeJS.ProcessEnv) => Object.keys(env).filter(name => name.startsWith("CHRONICLE_CHRONIST_KEY_")).sort();
    expect(hostEnvironment(base), "Ohne abgelegte Schlüsseldatei entsteht keine Chronist-Variable").toEqual({ SystemRoot: "C:/Windows" });
    expect(hostEnvironment(base, {})).toEqual({ SystemRoot: "C:/Windows" });
    // The profile's own file and key travel together; one without the other is useless.
    const own = hostEnvironment(base, { key: "synthetic-test-key", configPath: profileFile });
    expect(own).toEqual({ SystemRoot: "C:/Windows", CHRONICLE_CHRONIST_CONFIG: profileFile, CHRONICLE_CHRONIST_KEY_ANTHROPIC: "synthetic-test-key" });
    expect(keys(own)).toEqual(["CHRONICLE_CHRONIST_KEY_ANTHROPIC"]);
    // An operator's own file wins and keeps its own key variables; the profile key still governs its name.
    const operator = { SystemRoot: "C:/Windows", CHRONICLE_CHRONIST_CONFIG: "C:/Atlas/provider.json",
      CHRONICLE_CHRONIST_KEY_OPENAI: "unrelated-account", CHRONICLE_CHRONIST_KEY_ANTHROPIC: "inherited-key" };
    const both = hostEnvironment(operator, { key: "synthetic-test-key", configPath: profileFile });
    expect(both["CHRONICLE_CHRONIST_CONFIG"]).toBe("C:/Atlas/provider.json");
    expect(both["CHRONICLE_CHRONIST_KEY_ANTHROPIC"]).toBe("synthetic-test-key");
    expect(keys(both)).toEqual(["CHRONICLE_CHRONIST_KEY_ANTHROPIC", "CHRONICLE_CHRONIST_KEY_OPENAI"]);
    // A profile file governs alone: no operating-system key variable rides along with it.
    expect(hostEnvironment({ ...base, CHRONICLE_CHRONIST_KEY_OPENAI: "unrelated-account" }, { key: "synthetic-test-key", configPath: profileFile }))
      .toEqual({ SystemRoot: "C:/Windows", CHRONICLE_CHRONIST_CONFIG: profileFile, CHRONICLE_CHRONIST_KEY_ANTHROPIC: "synthetic-test-key" });
    expect(hostEnvironment(base, { key: "synthetic-test-key", configPath: profileFile })["DATABASE_URL"]).toBeUndefined();
    expect(() => hostEnvironment(base, { key: "invalid\r\nkey", configPath: profileFile })).toThrow();
    expect(() => hostEnvironment(base, { key: "", configPath: profileFile })).toThrow();
    expect(() => hostEnvironment(base, { configPath: "chronist-providers.json" })).toThrow();
  });
  it("accepts the closed Chronist key command only for a legitimate own profile", () => {
    const id = "11111111-1111-4111-8111-111111111111";
    expect(command({ kind: "chronist-key", profileId: id, action: "set", value: "synthetic-test-key" }))
      .toEqual({ kind: "chronist-key", profileId: id, action: "set", value: "synthetic-test-key" });
    expect(command({ kind: "chronist-key", profileId: id, action: "clear" }))
      .toEqual({ kind: "chronist-key", profileId: id, action: "clear" });
    for (const invalid of [
      { kind: "chronist-key", profileId: "../../.local", action: "set", value: "synthetic-test-key" },
      { kind: "chronist-key", profileId: "C:/Users/other/profiles", action: "clear" },
      { kind: "chronist-key", profileId: "22222222-2222-2222-8222-222222222222", action: "clear" },
      { kind: "chronist-key", action: "clear" },
      { kind: "chronist-key", profileId: id, action: "read" },
      { kind: "chronist-key", profileId: id, action: "set" },
      { kind: "chronist-key", profileId: id, action: "clear", value: "synthetic-test-key" },
      { kind: "chronist-key", profileId: id, action: "set", value: "bad\nkey" },
      { kind: "chronist-key", profileId: id, action: "set", value: "" },
      { kind: "chronist-key", profileId: id, action: "set", value: "x".repeat(8193) },
      { kind: "chronist-key", profileId: id, action: "set", value: "synthetic-test-key", directory: "C:/outside" },
    ]) expect(() => command(invalid)).toThrow();
  });
});
