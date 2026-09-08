// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2026 Kaya Yesilyurt - Atlas Chronicles. Siehe LICENSE.
import test from "node:test";
import assert from "node:assert/strict";
import { mkdir, mkdtemp, writeFile, unlink, symlink, realpath, rm } from "node:fs/promises";
import { join, relative, isAbsolute, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { measureArtifactFiles } from "../../packages/desktop/tools/package.mjs";
import { verifyArtifactFiles } from "../../packages/desktop/tools/installer.mjs";

const workspace=fileURLToPath(new URL("../../",import.meta.url));
const fixtureRoot=join(workspace,".local","desktop-artifact-tests");
const inside=(parent,target)=>{const path=relative(parent,target);return path&&!isAbsolute(path)&&!path.split(sep).includes("..");};

async function fixture(t){
  await mkdir(fixtureRoot,{recursive:true});
  const base=await realpath(fixtureRoot);
  assert.ok(inside(await realpath(workspace),base),"Fixture root must stay inside the workspace.");
  const directory=await mkdtemp(join(base,"case-"));
  t.after(async()=>{
    const target=await realpath(directory),name=relative(base,target);
    assert.ok(inside(base,target)&&!name.includes(sep)&&name.startsWith("case-"),"Cleanup must target this test's isolated directory.");
    await rm(target,{recursive:true,force:true});
  });
  await mkdir(join(directory,"resources","app"),{recursive:true});
  await writeFile(join(directory,"AtlasChronicles.exe"),"fixed Electron executable");
  await writeFile(join(directory,"resources","app","worker.cjs"),"original worker");
  await writeFile(join(directory,"resources","app","index.html"),"current client");
  const inventory=await measureArtifactFiles(directory);
  return{directory,worker:join(directory,"resources","app","worker.cjs"),inventory,
    record:{...inventory,exeSha256:inventory.files["AtlasChronicles.exe"].sha256}};
}

test("an unchanged complete package inventory is accepted",async t=>{
  const {directory,record,inventory}=await fixture(t);
  assert.deepEqual(await verifyArtifactFiles(directory,record),inventory);
  assert.equal(Object.keys(inventory.files).length,3);
  assert.equal(inventory.bytes,Object.values(inventory.files).reduce((bytes,file)=>bytes+file.bytes,0));
});

test("a changed worker with identical byte count is rejected despite an unchanged EXE",async t=>{
  const {directory,worker,record}=await fixture(t);
  assert.equal(Buffer.byteLength("original worker"),Buffer.byteLength("modified worker"));
  await writeFile(worker,"modified worker");
  const changed=await measureArtifactFiles(directory);
  assert.equal(changed.files["AtlasChronicles.exe"].sha256,record.exeSha256);
  assert.equal(changed.bytes,record.bytes);
  await assert.rejects(verifyArtifactFiles(directory,record),/resource differs.*resources\/app\/worker\.cjs/);
});

test("missing resources are rejected",async t=>{
  const {directory,worker,record}=await fixture(t);
  await unlink(worker);
  await assert.rejects(verifyArtifactFiles(directory,record),/resource is missing.*worker\.cjs/);
});

test("additional resources are rejected",async t=>{
  const {directory,record}=await fixture(t);
  await writeFile(join(directory,"unrecorded.txt"),"unreviewed content");
  await assert.rejects(verifyArtifactFiles(directory,record),/Unrecorded packaged resource: unrecorded\.txt/);
});

test("unsafe inventory paths and Windows case aliases are refused",async t=>{
  const {directory,record}=await fixture(t),fingerprint=record.files["AtlasChronicles.exe"];
  for(const name of ["../escape","/absolute","C:/outside","resources\\escape","resources//escape","resources/../escape","resources/trailing.","resources/file:stream"]){
    await assert.rejects(verifyArtifactFiles(directory,{...record,files:{...record.files,[name]:fingerprint}}),/Unsafe packaged resource path/,name);
  }
  await assert.rejects(verifyArtifactFiles(directory,{...record,files:{...record.files,"atlaschronicles.exe":fingerprint}}),/Duplicate packaged resource path/);
});

test("junctions or symlinked directories are rejected before traversing them",async t=>{
  const {directory,record}=await fixture(t);
  await symlink(join(directory,"resources"),join(directory,"junction"),process.platform==="win32"?"junction":"dir");
  await assert.rejects(measureArtifactFiles(directory),/Packaged resource must not be a link: junction/);
  await assert.rejects(verifyArtifactFiles(directory,record),/Packaged resource must not be a link: junction/);
});

test("legacy EXE-only records, malformed fingerprints and wrong total byte counts are refused",async t=>{
  const {directory,record}=await fixture(t);
  await assert.rejects(verifyArtifactFiles(directory,{exeSha256:record.exeSha256}),/no complete file inventory/);
  await assert.rejects(verifyArtifactFiles(directory,{...record,bytes:record.bytes+1}),/byte count differs/);
  await assert.rejects(verifyArtifactFiles(directory,{...record,files:{...record.files,"AtlasChronicles.exe":{bytes:1,sha256:"broken"}}}),/Invalid packaged resource fingerprint/);
});
