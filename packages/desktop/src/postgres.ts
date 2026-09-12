// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2026 Kaya Yesilyurt - Atlas Chronicles. Siehe LICENSE.
import { createHash } from "node:crypto";
import { execFile, spawn } from "node:child_process";
import { promisify } from "node:util";
import { readFile, writeFile, rm, lstat, realpath } from "node:fs/promises";
import { isAbsolute, join, resolve } from "node:path";
import { createPgDb } from "@chronicle/server/host";
import { contained, fail, safeEnvironment, postgresCommandOwnsDirectory } from "./policy.ts";
import { databaseUrlOf, type OwnedProfile } from "./profiles.ts";

const exec = promisify(execFile);
export interface RuntimeManifest { version: 1; platform: "win32"; architecture: "x64"; postgres: "17.11"; source: string; archiveSha256: string; files: Record<string, string> }
const source = "https://get.enterprisedb.com/postgresql/postgresql-17.11-1-windows-x64-binaries.zip";
export const ARCHIVE_SHA256 = "6eabdf00d2893713b75db4336a23c3fdf505f056e217ec6e2e95d901750cfea3";
export async function verifyRuntime(root: string): Promise<void> {
  const manifest = JSON.parse(await readFile(join(root, "runtime.json"), "utf8")) as RuntimeManifest;
  if (manifest.version !== 1 || manifest.platform !== "win32" || manifest.architecture !== "x64" || manifest.postgres !== "17.11" || manifest.source !== source || manifest.archiveSha256 !== ARCHIVE_SHA256)
    fail("runtime-version", "PostgreSQL-Laufzeit passt nicht zu diesem Paket.");
  for (const file of ["bin/initdb.exe", "bin/pg_ctl.exe", "bin/postgres.exe", "bin/pg_dump.exe", "bin/pg_restore.exe", "server_license.txt", "commandlinetools_3rd_party_licenses.txt"])
    if (!manifest.files[file]) fail("runtime-incomplete", "PostgreSQL-Laufzeit ist unvollständig.");
  // Manifest itself belongs to signed app resources; all executable/DLL/share bytes are pinned.
  for (const [file, expected] of Object.entries(manifest.files)) {
    if (!/^[a-zA-Z0-9_./ +\-]+$/.test(file) || file.split("/").includes("..") || !/^[a-f0-9]{64}$/.test(expected)) fail("runtime-manifest", "Ungültiges Laufzeitmanifest.");
    const path = contained(root, file);
    if ((await lstat(path)).isSymbolicLink() || createHash("sha256").update(await readFile(path)).digest("hex") !== expected)
      fail("runtime-hash", "PostgreSQL-Laufzeit wurde verändert. Bitte das geprüfte Paket erneut installieren.");
  }
}

// Nur ESRCH beweist, dass es diese PID nicht mehr gibt. Alles andere - fehlende Rechte,
// eine unlesbare Zahl - gilt als lebend und muss den vollen Eigentuemernachweis durchlaufen.
function possiblyAlive(pid: number): boolean {
  if (!Number.isSafeInteger(pid) || pid <= 0) return true;
  try { process.kill(pid, 0); return true; } catch (error) { return (error as NodeJS.ErrnoException).code !== "ESRCH"; }
}

/** Windows 8.3 and long path spellings can name the same directory or executable.
 * Compare existing filesystem identities, not unchecked string substitutions. */
export async function samePostgresPath(recorded: unknown, expected: string): Promise<boolean> {
  if (typeof recorded !== "string" || !isAbsolute(recorded) || !isAbsolute(expected)) return false;
  try {
    const [left, right] = await Promise.all([realpath(recorded), realpath(expected)]);
    return process.platform === "win32" ? left.toLowerCase() === right.toLowerCase() : left === right;
  } catch { return false; }
}

export class ManagedPostgres {
  private confirmed = false;
  constructor(readonly runtimeRoot: string, readonly owned: OwnedProfile) {}
  private async run(name: "initdb" | "pg_ctl", args: string[], env: NodeJS.ProcessEnv = safeEnvironment(process.env)): Promise<void> {
    try {
      // A started postmaster can inherit pg_ctl pipe handles on Windows. Observe
      // the command's exit, with no pipes for its long-lived descendant to retain.
      await new Promise<void>((resolve, reject) => {
        const child = spawn(join(this.runtimeRoot, "bin", `${name}.exe`), args, { windowsHide: true, shell: false, env, stdio: "ignore" });
        const timeout = setTimeout(() => { child.kill(); reject(new Error("PostgreSQL command timeout")); }, 70_000);
        child.once("error", error => { clearTimeout(timeout); reject(error); });
        child.once("exit", code => { clearTimeout(timeout); if (code === 0) resolve(); else reject(new Error("PostgreSQL command failed")); });
      });
    }
    catch { fail("postgres-command", `PostgreSQL ${name === "initdb" ? "Einrichtung" : "Start/Stopp"} fehlgeschlagen. Profilprotokoll prüfen.`); }
  }
  async verifyOwnership(): Promise<void> {
    const { owned } = this, data = await realpath(owned.dataDirectory);
    const lines = (await readFile(join(data, "postmaster.pid"), "utf8")).trim().split(/\r?\n/);
    const pid = Number(lines[0]);
    if (!Number.isSafeInteger(pid) || pid <= 0 || !await samePostgresPath(lines[1], data) || Number(lines[3]) !== owned.profile.pgPort)
      fail("postgres-owner", "PostgreSQL-Prozesszuordnung konnte nicht bestätigt werden.");
    const env = { ...safeEnvironment(process.env), CHRONICLE_CHECK_PID: String(pid) };
    let processInfo: { ExecutablePath: string; CommandLine: string };
    try {
      const result = await exec(join(process.env["SystemRoot"] ?? "C:\\Windows", "System32", "WindowsPowerShell", "v1.0", "powershell.exe"), ["-NoProfile", "-NonInteractive", "-Command", "Get-CimInstance Win32_Process -Filter ('ProcessId=' + $env:CHRONICLE_CHECK_PID) | Select-Object ExecutablePath,CommandLine | ConvertTo-Json -Compress"], { env, windowsHide: true, shell: false, timeout: 10_000 });
      processInfo = JSON.parse(result.stdout);
    } catch { return fail("postgres-owner", "Windows-Prozesszuordnung konnte nicht bestätigt werden."); }
    if (!processInfo || !await samePostgresPath(processInfo.ExecutablePath, resolve(this.runtimeRoot, "bin/postgres.exe")) ||
      !(postgresCommandOwnsDirectory(processInfo.CommandLine, data) || postgresCommandOwnsDirectory(processInfo.CommandLine, owned.dataDirectory)))
      fail("postgres-owner", "Ein fremder Prozess darf nicht übernommen oder beendet werden.");
    const db = createPgDb(databaseUrlOf(owned));
    try {
      const row = (await db.query<{ directory: string; version: string; port: string; listen: string }>("SELECT current_setting('data_directory') AS directory,current_setting('server_version') AS version,current_setting('port') AS port,current_setting('listen_addresses') AS listen")).rows[0];
      if (!row || !await samePostgresPath(row.directory, data) || !row.version.startsWith("17.11") || Number(row.port) !== owned.profile.pgPort || row.listen !== "127.0.0.1")
        fail("postgres-owner", "Datenbankziel stimmt nicht mit dem Profil überein.");
      if ((await db.query("SELECT 1 FROM pg_hba_file_rules WHERE auth_method <> 'scram-sha-256' OR error IS NOT NULL")).rowCount)
        fail("postgres-auth", "Datenbankprofil verlangt ausschließlich SCRAM-Anmeldung.");
    } finally { await db.close(); }
    this.confirmed = true;
  }
  async start(): Promise<void> {
    await verifyRuntime(this.runtimeRoot);
    const { owned } = this;
    const exists = await lstat(owned.dataDirectory).catch(e => { if ((e as NodeJS.ErrnoException).code === "ENOENT") return undefined; throw e; });
    if (exists?.isSymbolicLink()) fail("postgres-path", "Datenbankverzeichnis darf keine Verknüpfung sein.");
    if (!exists) {
      const passwordFile = join(owned.directory, "initdb-password.tmp");
      await writeFile(passwordFile, owned.secrets.databasePassword, { flag: "wx", mode: 0o600 });
      try { await this.run("initdb", ["-D", owned.dataDirectory, "-U", "chronicle", "--auth-local=scram-sha-256", "--auth-host=scram-sha-256", "--encoding=UTF8", "--locale=C", `--pwfile=${passwordFile}`]); }
      finally { await rm(passwordFile, { force: true }); }
      await writeFile(join(owned.dataDirectory, "postgresql.auto.conf"), `listen_addresses = '127.0.0.1'\nport = ${owned.profile.pgPort}\npassword_encryption = 'scram-sha-256'\n`, { mode: 0o600 });
    } else if ((await readFile(join(owned.dataDirectory, "PG_VERSION"), "utf8")).trim() !== "17") fail("postgres-major", "Dieses Profil benötigt PostgreSQL 17.");
    const pidFile = await lstat(join(owned.dataDirectory, "postmaster.pid")).catch(() => undefined);
    if (pidFile) {
      const pid = Number((await readFile(join(owned.dataDirectory, "postmaster.pid"), "utf8")).split(/\r?\n/)[0]);
      let alive = true;
      try { process.kill(pid, 0); } catch (e) { alive = (e as NodeJS.ErrnoException).code !== "ESRCH"; }
      if (alive) { await this.verifyOwnership(); return; }
      // Let PostgreSQL perform its own stale-PID/WAL recovery. Never edit the PID file.
    }
    await this.run("pg_ctl", ["-D", owned.dataDirectory, "-l", join(owned.directory, "postgres.log"), "-w", "-t", "60", "start"]);
    await this.verifyOwnership();
  }
  async stop(): Promise<void> {
    const recorded = await readFile(join(this.owned.dataDirectory, "postmaster.pid"), "utf8").catch(() => undefined);
    if (!this.confirmed && recorded === undefined) return;
    // Ein abgestuerzter Postmaster laesst seine PID-Datei liegen. Einen toten Prozess kann der
    // Eigentuemernachweis nicht mehr messen: Win32_Process antwortet leer, und das ist von einem
    // Fremdprozess ununterscheidbar. Ohne diesen Zweig bliebe die Welt dauerhaft unbeendbar,
    // denn Fenster-X, Tray und app.quit laufen alle durch dieselbe Pruefung.
    if (recorded !== undefined && !possiblyAlive(Number(recorded.split(/\r?\n/)[0]))) { this.confirmed = false; return; }
    await this.verifyOwnership();
    // Smart waits for connected sessions. The host's app and pool must close first.
    await this.run("pg_ctl", ["-D", this.owned.dataDirectory, "-m", "smart", "-w", "-t", "60", "stop"]);
    this.confirmed = false;
  }
}
