// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2026 Kaya Yesilyurt - Atlas Chronicles. Siehe LICENSE.
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {verifyGuiRelease} from '../verify-gui-release.mjs';
function fixture(){const bytes=Buffer.from('synthetic installer bytes, never executed'),sha256=createHash('sha256').update(bytes).digest('hex');
  return {version:'0.5.0',commit:'a'.repeat(40),run:'12345',bytes,sums:`${sha256}  Atlas-Chronicles-Setup.exe\n`,
    evidence:{version:'0.5.0',commit:'a'.repeat(40),run:'12345',sha256,packagedSmoke:true,installedSmoke:true,unsigned:true},
    installer:{version:'0.5.0',kind:'unsigned-local-per-user-squirrel-setup',bytes:bytes.length,setupSha256:sha256}};}
test('accepts one fully qualified and byte-identical run',()=>assert.equal(verifyGuiRelease(fixture()).version,'0.5.0'));
for(const field of ['version','commit','run','sha256','packagedSmoke','installedSmoke','unsigned'])test(`rejects substituted or missing evidence ${field}`,()=>{
  const input=fixture();input.evidence[field]=typeof input.evidence[field]==='boolean'?false:'wrong';assert.throws(()=>verifyGuiRelease(input));
});
test('rejects altered bytes even when size remains the same',()=>{const input=fixture();input.bytes[0]^=1;assert.throws(()=>verifyGuiRelease(input));});
test('rejects a checksum document pointing at another file',()=>{const input=fixture();input.sums=input.sums.replace('Setup.exe','Other.exe');assert.throws(()=>verifyGuiRelease(input));});
test('refuses to repurpose this publisher for another release',()=>{const input=fixture();input.version='0.6.0';assert.throws(()=>verifyGuiRelease(input));});
test('rejects another installer kind or missing inventory size',()=>{for(const changes of [{kind:'signed'},{bytes:undefined},{setupSha256:'0'.repeat(64)}]){const input=fixture();Object.assign(input.installer,changes);assert.throws(()=>verifyGuiRelease(input));}});
