// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2026 Kaya Yesilyurt - Atlas Chronicles. Siehe LICENSE.
// Local preparation only. This module never invokes SteamCMD or publishes a build.
import { cp, lstat, mkdir, readFile, realpath, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { basename, dirname, isAbsolute, join, relative, resolve, sep } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { verifyArtifactFiles } from "./installer.mjs";

const hash = bytes => createHash("sha256").update(bytes).digest("hex");
const inside = (parent, child) => {
  const suffix = relative(parent, child);
  return suffix !== "" && !isAbsolute(suffix) && suffix !== ".." && !suffix.startsWith(`..${sep}`);
};
const requiredFiles = [
  "AtlasChronicles.exe", "LICENSE", "LICENSES.chromium.html",
  "resources/app/package.json", "resources/app/build.json", "resources/app/DEPENDENCIES.json",
  "resources/app/main.cjs", "resources/app/worker.cjs", "resources/app/preload.cjs",
  "resources/app/client/index.html", "resources/app/manager/index.html",
  "resources/app/runtime/runtime.json", "resources/app/runtime/server_license.txt",
  "resources/app/runtime/commandlinetools_3rd_party_licenses.txt",
  ...["postgres", "initdb", "pg_ctl", "pg_dump", "pg_restore"].map(name => `resources/app/runtime/bin/${name}.exe`),
];

export function validateSteamIds(appId, depotId) {
  if (appId === undefined && depotId === undefined) return null;
  for (const [label, value] of [["app-id", appId], ["depot-id", depotId]]) {
    if (typeof value !== "string" || !/^[1-9]\d{0,9}$/.test(value) || Number(value) > 4_294_967_295)
      throw new Error(`${label} must be a positive uint32 decimal ID assigned by Steamworks; supply both IDs or neither.`);
  }
  if (appId === depotId) throw new Error("App and depot IDs must identify separate Steamworks objects.");
  return { appId, depotId };
}

/** Values are fixed or validated IDs/version: no arbitrary VDF text, credentials or paths. */
export function steamPreviewScripts(appId, depotId, version) {
  const ids = validateSteamIds(appId, depotId);
  if (!ids) throw new Error("Steam preview configuration requires actual app and depot IDs.");
  if (typeof version !== "string" || !/^\d+\.\d+\.\d+$/.test(version)) throw new Error("Invalid desktop version.");
  return {
    [`app_build_${appId}.vdf`]: `"AppBuild"\n{\n  "AppID" "${appId}"\n  "Desc" "Atlas Chronicles ${version} Windows x64 local preview"\n  "ContentRoot" "../content"\n  "BuildOutput" "../output"\n  "Preview" "1"\n  "Depots"\n  {\n    "${depotId}" "depot_build_${depotId}.vdf"\n  }\n}\n`,
    [`depot_build_${depotId}.vdf`]: `"DepotBuild"\n{\n  "DepotID" "${depotId}"\n  "FileMapping"\n  {\n    "LocalPath" "*"\n    "DepotPath" "."\n    "Recursive" "1"\n  }\n}\n`,
  };
}

async function ordinaryDirectory(directory) {
  const info = await lstat(directory);
  if (!info.isDirectory() || info.isSymbolicLink()) throw new Error("Steam preparation directories must not be links.");
  return realpath(directory);
}

function inspectResources(record) {
  for (const name of requiredFiles) {
    if (!record.files[name]?.bytes) throw new Error(`Steam launch/runtime resource missing or empty: ${name}`);
  }
  if (!Object.keys(record.files).some(name => /^resources\/app\/migrations\/[^/]+\.sql$/.test(name)))
    throw new Error("Steam content has no database migrations.");
  for (const name of Object.keys(record.files)) {
    const parts = name.toLowerCase().split("/");
    if (parts.some(part => [".git", ".local", "profiles", "recovery", "pg_wal", "steam_appid.txt"].includes(part)
      || /^\.env(?:\.|$)/.test(part) || /\.(?:dpapi|dump|pfx|p12|key)$/.test(part)))
      throw new Error(`Private or development-only resource cannot enter Steam content: ${name}`);
  }
}

/** Copy one immutable, recorded package. A success record is written only after copy verification.
 * Output's parent must already exist, and no existing output is replaced or removed. */
export async function prepareSteamArtifact({ artifactDirectory, outputDirectory, appId, depotId }) {
  const ids = validateSteamIds(appId, depotId);
  const selected = await ordinaryDirectory(resolve(artifactDirectory));
  const recordBytes = await readFile(join(selected, "artifact.json"));
  const record = JSON.parse(recordBytes);
  if (record.kind !== "unsigned-local-unpacked-windows-app" || typeof record.version !== "string" || !/^\d+\.\d+\.\d+$/.test(record.version))
    throw new Error("Steam preparation requires a versioned Windows unpacked artifact record.");
  if (typeof record.electron !== "string" || !/^\d+\.\d+\.\d+$/.test(record.electron)
    || typeof record.postgres !== "string" || !/^\d+\.\d+$/.test(record.postgres)
    || !Array.isArray(record.missingReleaseGates) || record.missingReleaseGates.some(gate => typeof gate !== "string" || !gate))
    throw new Error("Desktop artifact runtime versions and release gates must be recorded.");
  if (!Array.isArray(record.paths) || record.paths.length !== 1 || typeof record.paths[0] !== "string" || !isAbsolute(record.paths[0]))
    throw new Error("Artifact record must name one absolute packaged application directory.");
  const source = await ordinaryDirectory(record.paths[0]);
  if (!inside(selected, source)) throw new Error("Packaged application must stay inside the selected artifact directory.");
  const output = join(await ordinaryDirectory(dirname(resolve(outputDirectory))), basename(resolve(outputDirectory)));
  if (output === selected || inside(selected, output) || inside(output, selected))
    throw new Error("Steam output must be separate from the selected desktop artifact.");
  const inventory = await verifyArtifactFiles(source, record);
  inspectResources(record);
  const packageInfo = JSON.parse(await readFile(join(source, "resources/app/package.json"), "utf8"));
  const buildInfo = JSON.parse(await readFile(join(source, "resources/app/build.json"), "utf8"));
  if (packageInfo.name !== "atlas-chronicles" || packageInfo.main !== "main.cjs" || packageInfo.version !== record.version
    || buildInfo.electron !== record.electron || buildInfo.postgres !== record.postgres)
    throw new Error("Packaged application metadata differs from the selected artifact.");
  const scripts = ids ? steamPreviewScripts(appId, depotId, record.version) : {};
  await mkdir(output); // EEXIST is intentional: retain previous and partial runs for inspection.
  const content = join(output, "content");
  await cp(source, content, { recursive: true, force: false, errorOnExist: true });
  await verifyArtifactFiles(content, record);
  await verifyArtifactFiles(source, record);
  if (!(await readFile(join(selected, "artifact.json"))).equals(recordBytes))
    throw new Error("Desktop artifact record changed during Steam preparation.");
  await mkdir(join(output, "scripts"));
  await mkdir(join(output, "output"));
  for (const [name, text] of Object.entries(scripts)) await writeFile(join(output, "scripts", name), text, { flag: "wx" });
  const releaseGates = [
    ...new Set(record.missingReleaseGates ?? []),
    "Steamworks ownership, assigned app/depot IDs and package configuration verified by owner",
    "Content rights, bundled license notices and AI Content Survey approved for the chosen Steam product",
    "Exact build installed, launched, updated and uninstalled through Steam on reference Windows hardware",
    "Store assets, support details, system requirements and Valve store/build reviews completed",
  ];
  if (!record.files["resources/app/LICENSE"] || packageInfo.license === "UNLICENSED")
    releaseGates.push("Desktop app license notice/metadata reconciliation: root Electron LICENSE is not the Atlas license");
  const prepared = {
    schemaVersion: 1, kind: "local-steam-preparation", version: record.version,
    preparedAt: new Date().toISOString(), sourceArtifact: selected, artifactRecordSha256: hash(recordBytes),
    contentDirectory: content, platform: "win32", arch: "x64", ...inventory, exeSha256: record.exeSha256,
    steamworks: ids ?? { appId: null, depotId: null },
    launch: { executable: "AtlasChronicles.exe", arguments: "", workingDirectory: "", os: "windows", architecture: "64bit" },
    scripts: Object.fromEntries(Object.entries(scripts).map(([name, text]) => [name, { sha256: hash(text) }])),
    previewOnly: true, steamCmdExecuted: false, uploaded: false, publicRelease: false,
    missingReleaseGates: releaseGates,
  };
  await writeFile(join(output, "steam-preparation.json"), `${JSON.stringify(prepared, null, 2)}\n`, { flag: "wx" });
  return prepared;
}

const usage = `Local Steam preparation (no upload):
  node packages/desktop/tools/steam.mjs --artifact=<desktop-artifact-folder> [--stage=<new-folder>] [--app-id=<assigned-id> --depot-id=<assigned-id>]

Select a folder under .local/desktop-artifacts explicitly. Output is a new folder under
.local/steam-staging (defaults to the artifact folder name). Without both real IDs, the
content and evidence are prepared without VDF scripts. With IDs, VDF uses Preview=1.
Existing output is preserved. SteamCMD is never invoked. See docs/steam/README.md.
`;

export function parseSteamArguments(args) {
  const parsed = {};
  for (const value of args) {
    const match = /^--(artifact|stage|app-id|depot-id)=(.+)$/.exec(value);
    if (!match || Object.hasOwn(parsed, match[1])) throw new Error(`Unknown, empty or repeated argument: ${value}`);
    parsed[match[1]] = match[2];
  }
  for (const key of ["artifact", "stage"]) {
    if ((key === "artifact" || parsed[key] !== undefined) && !/^[a-zA-Z0-9][a-zA-Z0-9._-]*$/.test(parsed[key] ?? ""))
      throw new Error(`${key} must name one local directory; explicit --artifact is required.`);
  }
  validateSteamIds(parsed["app-id"], parsed["depot-id"]);
  return parsed;
}

async function main() {
  if (process.argv.slice(2).length === 1 && process.argv[2] === "--help") { console.log(usage); return; }
  const args = parseSteamArguments(process.argv.slice(2));
  const root = await realpath(fileURLToPath(new URL("../../../", import.meta.url)));
  const artifacts = await ordinaryDirectory(join(root, ".local", "desktop-artifacts"));
  const artifactDirectory = await ordinaryDirectory(join(artifacts, args.artifact));
  const stages = join(root, ".local", "steam-staging");
  await mkdir(stages, { recursive: true });
  const stageRoot = await ordinaryDirectory(stages);
  if (!inside(root, artifacts) || !inside(artifacts, artifactDirectory) || !inside(root, stageRoot))
    throw new Error("Steam preparation must stay inside this workspace's local artifact/staging directories.");
  const outputDirectory = join(stageRoot, args.stage ?? args.artifact);
  const record = await prepareSteamArtifact({ artifactDirectory, outputDirectory, appId: args["app-id"], depotId: args["depot-id"] });
  console.log(`Steam content verified: ${outputDirectory} (${Object.keys(record.files).length} files, ${record.bytes} bytes).`);
  console.log(record.steamworks.appId ? "Preview-only VDF scripts generated. SteamCMD was not run." : "App/depot IDs pending; no VDF scripts generated. SteamCMD was not run.");
  console.log(`Release gates remain open; see ${join(outputDirectory, "steam-preparation.json")}.`);
}

if (process.argv[1] && pathToFileURL(resolve(process.argv[1])).href === import.meta.url)
  await main().catch(error => { console.error(error.message); process.exitCode = 1; });
