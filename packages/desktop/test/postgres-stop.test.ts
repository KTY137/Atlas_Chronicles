// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2026 Kaya Yesilyurt - Atlas Chronicles. Siehe LICENSE.
import { spawn } from "node:child_process";
import { mkdtemp, mkdir, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { beforeEach, expect, it, vi } from "vitest";

// A deterministic Win32_Process probe, not an attempted PowerShell launch on Linux.
// Native ownership is additionally verified by the actual Windows packaged smoke.
const inspection = vi.hoisted(() => vi.fn());
vi.mock("node:child_process", async importOriginal => {
  const actual = await importOriginal<typeof import("node:child_process")>();
  const { promisify } = await import("node:util");
  const execFile = Object.assign(vi.fn(), { [promisify.custom]: inspection });
  return { ...actual, execFile };
});
beforeEach(() => {
  inspection.mockReset();
  inspection.mockResolvedValue({ stdout: JSON.stringify({ ExecutablePath: process.execPath, CommandLine: "node test-process" }), stderr: "" });
});
import { ManagedPostgres } from "../src/postgres.ts";
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
    expect(inspection).not.toHaveBeenCalled();
  } finally { await rm(owned.directory, { recursive: true, force: true }); }
});

it("uebernimmt weiterhin keinen fremden lebenden Prozess, nur weil er in postmaster.pid steht", async () => {
  // Die Lebendpruefung darf den Nachweis nicht ersetzen: eine lebende, aber fremde PID
  // (hier der Testprozess selbst) muss abgewiesen bleiben, sonst beendet die Welt fremde Prozesse.
  const owned = await profile();
  try {
    await writeFile(join(owned.dataDirectory, "postmaster.pid"), pidFile(process.pid, owned.dataDirectory));
    await expect(new ManagedPostgres(join(owned.directory, "runtime"), owned).stop()).rejects.toThrow("fremder Prozess");
    expect(inspection).toHaveBeenCalledOnce();
    expect(() => process.kill(process.pid, 0)).not.toThrow();
  } finally { await rm(owned.directory, { recursive: true, force: true }); }
});


it("refuses shutdown when Windows process ownership cannot be inspected", async () => {
  const owned = await profile();
  inspection.mockRejectedValueOnce(new Error("Synthetic unavailable CIM provider"));
  try {
    await writeFile(join(owned.dataDirectory, "postmaster.pid"), pidFile(process.pid, owned.dataDirectory));
    await expect(new ManagedPostgres(join(owned.directory, "runtime"), owned).stop())
      .rejects.toMatchObject({ code: "postgres-owner" });
    expect(inspection).toHaveBeenCalledOnce();
    expect(() => process.kill(process.pid, 0)).not.toThrow();
  } finally { await rm(owned.directory, { recursive: true, force: true }); }
});
