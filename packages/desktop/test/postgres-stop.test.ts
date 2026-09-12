// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2026 Kaya Yesilyurt - Atlas Chronicles. Siehe LICENSE.
import { spawn } from "node:child_process";
import { mkdtemp, mkdir, writeFile, readFile, rm, symlink } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { expect, it } from "vitest";
import { ManagedPostgres, samePostgresPath } from "../src/postgres.ts";
import type { OwnedProfile } from "../src/profiles.ts";

const PORT = 57679;
async function profile(): Promise<OwnedProfile> {
  const directory = await mkdtemp(join(tmpdir(), "chronicle-postgres-stop-")), dataDirectory = join(directory, "postgres");
  await mkdir(dataDirectory, { recursive: true });
  return { profile: { version: 1, id: "510b4796-9189-4401-bfcb-29517fc9fb85", name: "Desktop smoke world", createdAt: "2026-09-08T22:04:39.824Z", httpPort: 55572, pgPort: PORT, pgMajor: 17 },
    directory, dataDirectory, secrets: { databasePassword: "a".repeat(64), cookieSecret: "b".repeat(64) } };
}
// postmaster.pid so, wie PostgreSQL sie liegen laesst: PID, Datenverzeichnis, Startzeit, Port.
const pidFile = (pid: number, dataDirectory: string) => `${pid}\n${dataDirectory}\n1788905157\n${PORT}\n`;

it("beendet eine Welt, deren eingetragener Postmaster nicht mehr laeuft, statt sie unschliessbar zu machen", async () => {
  // Ein abgestuerzter Postmaster laesst seine PID-Datei liegen. Der Eigentuemernachweis kann
  // einen toten Prozess nicht mehr messen: Win32_Process antwortet leer. Wer das als "nicht
  // bestaetigt" wertet, verweigert jedes Beenden - Fenster-X, Tray und app.quit gleichermassen.
  const owned = await profile();
  const dead = await new Promise<number>((resolve, reject) => {
    const child = spawn(process.execPath, ["-e", ""], { stdio: "ignore", windowsHide: true });
    child.once("error", reject); child.once("exit", () => resolve(child.pid!));
  });
  try {
    await writeFile(join(owned.dataDirectory, "postmaster.pid"), pidFile(dead, owned.dataDirectory));
    await expect(new ManagedPostgres(join(owned.directory, "runtime"), owned).stop()).resolves.toBeUndefined();
  } finally { await rm(owned.directory, { recursive: true, force: true }); }
});

it("uebernimmt weiterhin keinen fremden lebenden Prozess, nur weil er in postmaster.pid steht", async () => {
  // Die Lebendpruefung darf den Nachweis nicht ersetzen: eine lebende, aber fremde PID
  // (hier der Testprozess selbst) muss abgewiesen bleiben, sonst beendet die Welt fremde Prozesse.
  const owned = await profile();
  try {
    await writeFile(join(owned.dataDirectory, "postmaster.pid"), pidFile(process.pid, owned.dataDirectory));
    // Windows must inspect the live foreign executable; non-Windows cannot run CIM
    // and must reject the unverified owner rather than attempting a stop command.
    await expect(new ManagedPostgres(join(owned.directory, "runtime"), owned).stop()).rejects.toThrow(
      process.platform === "win32" ? "fremder Prozess" : "Windows-Prozesszuordnung konnte nicht bestätigt werden.");
    expect(await readFile(join(owned.dataDirectory, "postmaster.pid"), "utf8")).toBe(pidFile(process.pid, owned.dataDirectory));
    expect(() => process.kill(process.pid, 0)).not.toThrow();
  } finally { await rm(owned.directory, { recursive: true, force: true }); }
}, 15_000);

it("compares actual directory identity without treating a different or missing path as an alias", async () => {
  const owned = await profile(), alias = join(owned.directory, "alias"), other = join(owned.directory, "other");
  try {
    await mkdir(other); await symlink(owned.dataDirectory, alias, process.platform === "win32" ? "junction" : "dir");
    await expect(samePostgresPath(alias, owned.dataDirectory)).resolves.toBe(true);
    await expect(samePostgresPath(other, owned.dataDirectory)).resolves.toBe(false);
    await expect(samePostgresPath(join(owned.directory, "missing"), owned.dataDirectory)).resolves.toBe(false);
    await expect(samePostgresPath("postgres", owned.dataDirectory)).resolves.toBe(false);
    await expect(samePostgresPath(null, owned.dataDirectory)).resolves.toBe(false);
  } finally { await rm(owned.directory, { recursive: true, force: true }); }
});
