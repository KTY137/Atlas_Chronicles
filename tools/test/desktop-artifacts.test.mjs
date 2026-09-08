// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2026 Kaya Yesilyurt - Atlas Chronicles. Siehe LICENSE.
import test from "node:test";
import assert from "node:assert/strict";
import { mkdir, mkdtemp, readFile, readdir, writeFile, unlink, symlink, realpath, rm } from "node:fs/promises";
import { join, relative, isAbsolute, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";
import { measureArtifactFiles } from "../../packages/desktop/tools/package.mjs";
import { buildInstallerArtifact, verifyArtifactFiles } from "../../packages/desktop/tools/installer.mjs";

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

test("Squirrel mutations are isolated from the recorded artifact and long source paths",async t=>{
  const {directory}=await fixture(t);
  const source=join(directory,"nested-worktree-".repeat(6)),output=join(directory,"installer");
  await mkdir(join(source,"resources","app"),{recursive:true});
  await writeFile(join(source,"AtlasChronicles.exe"),"original executable");
  await writeFile(join(source,"resources","app","worker.cjs"),"original worker");
  await writeFile(join(source,"LICENSES.chromium.html"),"licenses");
  const inventory=await measureArtifactFiles(source),record={...inventory,version:"0.1.0",exeSha256:inventory.files["AtlasChronicles.exe"].sha256};
  let staging;
  await buildInstallerArtifact(source,record,output,async options=>{
    staging=options.appDirectory;
    assert.notEqual(staging,source);
    assert.ok(join(staging,"resources","app","worker.cjs").length<260);
    assert.deepEqual(await verifyArtifactFiles(staging,record),inventory);
    await writeFile(join(staging,"Squirrel.exe"),await readFile(createRequire(import.meta.url).resolve("electron-winstaller/vendor/Squirrel.exe")));
    await mkdir(options.outputDirectory);
    await writeFile(join(options.outputDirectory,options.setupExe),"generated setup");
  });
  assert.deepEqual(await verifyArtifactFiles(source,record),inventory);
  assert.equal(await readFile(join(output,"Atlas-Chronicles-Setup.exe"),"utf8"),"generated setup");
  await assert.rejects(realpath(staging),{code:"ENOENT"});
});

test("changed staged production bytes cannot be admitted as the original artifact",async t=>{
  const {directory}=await fixture(t);
  await writeFile(join(directory,"LICENSES.chromium.html"),"licenses");
  const inventory=await measureArtifactFiles(directory),record={...inventory,version:"0.1.0",exeSha256:inventory.files["AtlasChronicles.exe"].sha256};
  const output=join(directory,"installer");
  await assert.rejects(buildInstallerArtifact(directory,record,output,async options=>{
    await writeFile(join(options.appDirectory,"Squirrel.exe"),await readFile(createRequire(import.meta.url).resolve("electron-winstaller/vendor/Squirrel.exe")));
    await writeFile(join(options.appDirectory,"resources","app","worker.cjs"),"modified worker");
    await mkdir(options.outputDirectory);
    await writeFile(join(options.outputDirectory,options.setupExe),"generated setup with wrong worker");
  }),/resource differs.*worker\.cjs/);
  assert.deepEqual(await verifyArtifactFiles(directory,record),inventory);
  assert.deepEqual(await readdir(output),[]);
});

test("a failed installer leaves the source reusable and removes its private staging tree",async t=>{
  const {directory}=await fixture(t);
  await writeFile(join(directory,"LICENSES.chromium.html"),"licenses");
  const inventory=await measureArtifactFiles(directory),record={...inventory,version:"0.1.0",exeSha256:inventory.files["AtlasChronicles.exe"].sha256};
  let staging;
  await assert.rejects(buildInstallerArtifact(directory,record,join(directory,"installer"),async options=>{
    staging=options.appDirectory;
    await writeFile(join(staging,"Squirrel.exe"),"installer mutation");
    throw new Error("NuGet failed");
  }),/NuGet failed/);
  assert.deepEqual(await verifyArtifactFiles(directory,record),inventory);
  await assert.rejects(realpath(staging),{code:"ENOENT"});
});
