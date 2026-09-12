// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2026 Kaya Yesilyurt - Atlas Chronicles. Siehe LICENSE.
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFile} from 'node:fs/promises';
import {resolve,join} from 'node:path';
import {pathToFileURL} from 'node:url';

/** Reject mixed runs, partial qualification and substituted installer bytes before publication. */
export function verifyGuiRelease({evidence,installer,bytes,sums,version,commit,run}) {
  assert.equal(version,'0.5.0','This publisher is scoped to the requested 0.5.0 release');
  assert.match(commit,/^[a-f0-9]{40}$/);assert.match(String(run),/^\d+$/);
  assert.equal(evidence.version,version);assert.equal(evidence.commit,commit);assert.equal(String(evidence.run),String(run));
  assert.equal(evidence.packagedSmoke,true);assert.equal(evidence.installedSmoke,true);assert.equal(evidence.unsigned,true);
  assert.equal(installer.version,version);assert.equal(installer.kind,'unsigned-local-per-user-squirrel-setup');
  assert.equal(installer.bytes,bytes.length);assert.ok(bytes.length>0);
  const sha256=createHash('sha256').update(bytes).digest('hex');
  assert.equal(evidence.sha256,sha256);assert.equal(installer.setupSha256,sha256);
  assert.equal(sums.trim(),`${sha256}  Atlas-Chronicles-Setup.exe`);
  return {version,commit,run:String(run),sha256,bytes:bytes.length,unsigned:true};
}
async function main() {
  const dir=resolve(process.argv[2]??'release-output');
  const load=async name=>JSON.parse(await readFile(join(dir,name),'utf8'));
  const result=verifyGuiRelease({evidence:await load('build-evidence.json'),installer:await load('installer.json'),
    bytes:await readFile(join(dir,'Atlas-Chronicles-Setup.exe')),sums:await readFile(join(dir,'SHA256SUMS.txt'),'utf8'),
    version:JSON.parse(await readFile('packages/desktop/package.json','utf8')).version,commit:process.env.GITHUB_SHA,run:process.env.GITHUB_RUN_ID});
  console.log(JSON.stringify(result,null,2));
}
if(process.argv[1]&&pathToFileURL(resolve(process.argv[1])).href===import.meta.url) await main();
