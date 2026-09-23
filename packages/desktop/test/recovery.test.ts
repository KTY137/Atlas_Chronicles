// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2026 Kaya Yesilyurt - Atlas Chronicles. Siehe LICENSE.
import { expect, it } from "vitest";
import { migrationAdmission, parseRecoveryManifest, recoveryAuthentication } from "../src/recovery.ts";

const pin = { name: "001_initial.sql", sha256: "a".repeat(64) };
const unsigned = {
  version: 1 as const, kind: "chronicle-device-recovery" as const, id: "11111111-1111-4111-8111-111111111111", createdAt: "2026-09-06T18:00:00.000Z", appVersion: "0.1.0", postgres: "17.11" as const,
  sourceProfileId: "22222222-2222-4222-8222-222222222222", sourceOrigin: "http://localhost:45001", schema: [pin], counts: { users: 1, credentials: 2, campaigns: 1 },
  files: { "database.dump": { bytes: 42, sha256: "b".repeat(64) }, "secrets.dpapi": { bytes: 42, sha256: "c".repeat(64) }, "profile.json": { bytes: 42, sha256: "d".repeat(64) } },
};
it("authenticates the complete recovery manifest including identities, schema and file hashes", () => {
  const hmac = recoveryAuthentication(unsigned, "e".repeat(64));
  expect(parseRecoveryManifest({ ...unsigned, hmac })).toEqual({ ...unsigned, hmac });
  expect(recoveryAuthentication({ ...unsigned, sourceProfileId: unsigned.id }, "e".repeat(64))).not.toBe(hmac);
  expect(recoveryAuthentication({ ...unsigned, counts: { ...unsigned.counts, credentials: 0 } }, "e".repeat(64))).not.toBe(hmac);
  expect(recoveryAuthentication(unsigned, "f".repeat(64))).not.toBe(hmac);
  expect(() => parseRecoveryManifest({ ...unsigned, hmac, restorePath: "C:/original" })).toThrow();
  expect(() => parseRecoveryManifest({ ...unsigned, hmac, files: { ...unsigned.files, "../outside": unsigned.files["database.dump"] } })).toThrow();
  expect(() => parseRecoveryManifest({ ...unsigned, hmac, postgres: "18.0" })).toThrow();
  expect(() => parseRecoveryManifest({ ...unsigned, hmac, schema: [pin, pin] })).toThrow();
});
it("requires recovery before extending an existing schema and refuses an unpaired binary rollback", () => {
  const next = { name: "002_more.sql", sha256: "b".repeat(64) };
  expect(migrationAdmission([], [pin])).toEqual({ pending: [pin], recoveryRequired: false });
  expect(migrationAdmission([pin], [pin])).toEqual({ pending: [], recoveryRequired: false });
  expect(migrationAdmission([pin], [pin, next])).toEqual({ pending: [next], recoveryRequired: true });
  // Klartext: eine ältere App vor einer neueren Welt nennt beide Datenstufen und die Abhilfe.
  expect(() => migrationAdmission([pin, next], [pin])).toThrow(/neueren Version.*Datenstufe 002.*bis Datenstufe 001.*neueste Version installieren/);
  expect(() => migrationAdmission([pin], [{ ...pin, sha256: "0".repeat(64) }])).toThrow(/abweichende Fassung der Datenstufe 001.*neu installieren/);
});

// Pin zur Dokumentation in DESKTOP.md: ein Recovery-Punkt trägt genau drei Dateien. Der
// Chronist-Schlüssel und die profilinterne Betreiberdatei bleiben beim Ursprungsprofil,
// eine wiederhergestellte Welt startet also ohne beide.
it("carries no Chronist key in a recovery point, so a restored world starts without one", () => {
  const hmac = recoveryAuthentication(unsigned, "e".repeat(64));
  expect(Object.keys(parseRecoveryManifest({ ...unsigned, hmac }).files)).toEqual(["database.dump", "secrets.dpapi", "profile.json"]);
  expect(() => parseRecoveryManifest({ ...unsigned, hmac, files: { ...unsigned.files, "chronist-key.dpapi": unsigned.files["secrets.dpapi"] } })).toThrow();
  expect(() => parseRecoveryManifest({ ...unsigned, hmac, files: { ...unsigned.files, "chronist-providers.json": unsigned.files["profile.json"] } })).toThrow();
});
