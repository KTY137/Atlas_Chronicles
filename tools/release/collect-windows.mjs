// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2026 Kaya Yesilyurt - Atlas Chronicles. Siehe LICENSE.
import { readdir, readFile, mkdir, copyFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { createHash } from 'node:crypto';
import assert from 'node:assert/strict';
const diagnostics = process.argv.includes('--diagnostics');
const directory = '.local/desktop-profiles', checks = [];
for (const name of await readdir(directory).catch(() => [])) {
  if (!name.startsWith('smoke-')) continue;
  const evidence = JSON.parse(await readFile(join(directory,name,'evidence.json'),'utf8').catch(() => '{}'));
  // Do not publish temporary world IDs, signed cookies, recovery tickets, database files,
  // enrollment codes, full page text or runtime state. Only named assertions and errors.
  checks.push({ passed: evidence.passed === true, checks: evidence.checks ?? [], error: evidence.error ?? null, cleanupError: evidence.cleanupError ?? null, executableKind: evidence.executableKind ?? null, version: evidence.version ?? null });
}
const out = diagnostics ? '.local/release-diagnostics' : '.local/release'; await mkdir(out,{recursive:true});
if (diagnostics) {
  await writeFile(join(out,'smoke-diagnostics.json'),JSON.stringify(checks,null,2));
  // Server- und initdb-Protokolle der Smoke-Profile: Pfade, Port, PostgreSQL-Fehlerklassen —
  // keine Datenbankdateien, keine Zugangsdaten, keine Sitzungen. Ohne sie blieb ein
  // gescheiterter Hoststart im CI ein einzelner Satz.
  const logs = [];
  const walk = async (path, depth) => {
    if (depth > 6) return;
    for (const entry of await readdir(path,{withFileTypes:true}).catch(() => [])) {
      const child = join(path, entry.name);
      if (entry.isDirectory()) { if (entry.name !== 'postgres') await walk(child, depth + 1); }
      else if (entry.name === 'postgres.log' || entry.name === 'initdb.log') logs.push(child);
    }
  };
  for (const name of await readdir(directory).catch(() => [])) if (name.startsWith('smoke-')) await walk(join(directory,name), 0);
  for (const [index, path] of logs.entries()) await copyFile(path, join(out, `${index}-${path.split(/[\\/]/).at(-1)}`)).catch(() => {});
  process.exit(0);
}
assert.equal(process.platform,'win32'); assert.equal(checks.length,2); assert.ok(checks.every(c=>c.passed&&!c.cleanupError&&c.version==='0.4.3'));
assert.deepEqual(checks.map(c=>c.executableKind).sort(),['installed','packaged']);
const stamps=(await readdir('.local/desktop-artifacts')).sort(), stamp=stamps.at(-1);
const installer=JSON.parse(await readFile(join('.local/desktop-artifacts',stamp,'installer.json'),'utf8'));
assert.equal(installer.version,'0.4.3');
const bytes=await readFile(installer.setupExe), digest=createHash('sha256').update(bytes).digest('hex');
assert.equal(digest,installer.setupSha256); assert.equal(bytes.length,installer.bytes);
await copyFile(installer.setupExe,join(out,'Atlas-Chronicles-Setup.exe'));
await writeFile(join(out,'SHA256SUMS.txt'),`${digest}  Atlas-Chronicles-Setup.exe\n`);
await writeFile(join(out,'release-evidence.json'),JSON.stringify({version:installer.version,sourceCommit:process.env.GITHUB_SHA,sourceTree:process.env.SOURCE_TREE,workflowRun:process.env.GITHUB_RUN_ID,sha256:digest,bytes:bytes.length,platform:'windows-x64',signed:false,automaticUpdates:false,checks},null,2)+'\n');
console.log(`Verified Windows v${installer.version}: ${bytes.length} bytes, SHA256 ${digest}`);
