// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2026 Kaya Yesilyurt - Atlas Chronicles. Siehe LICENSE.
// Publish only the exact main build that passed every release gate. Never rebuild,
// retag, replace assets, publish a PR artifact, or alter an existing public release.
import assert from 'node:assert/strict';
import { readFile, writeFile, mkdtemp, rm } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { execFileSync } from 'node:child_process';
export const VERSION = '0.4.3', REPOSITORY = 'KTY137/Atlas_Chronicles';
export const REQUIRED = ['gate', 'gui-validation', 'map-studio', 'regelwerk', 'windows-package'];
export const FILES = ['Atlas-Chronicles-Setup.exe', 'SHA256SUMS.txt', 'release-evidence.json'];
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
export function verifiedRuns(runs, sha) {
  assert.match(sha, /^[a-f0-9]{40}$/);
  const result = {};
  for (const name of REQUIRED) {
    const latest = runs.filter(run => run.name === name && run.path === `.github/workflows/${name}.yml`
      && run.head_sha === sha && run.head_branch === 'main' && run.event === 'push')
      .sort((a,b) => b.id - a.id)[0];
    if (!latest || latest.status !== 'completed' || latest.conclusion !== 'success') return null;
    result[name] = latest.id;
  }
  return result;
}
export function verifyEvidence(evidence, bytes, checksum, { sha, tree, run }) {
  assert.equal(evidence.version, VERSION); assert.equal(evidence.sourceCommit, sha);
  assert.equal(evidence.sourceTree, tree); assert.equal(String(evidence.workflowRun), String(run));
  assert.equal(evidence.platform, 'windows-x64'); assert.equal(evidence.signed, false);
  assert.equal(evidence.automaticUpdates, false);
  assert.ok(bytes.length > 10_000_000 && bytes.length < 400_000_000);
  assert.equal(bytes.subarray(0,2).toString(), 'MZ');
  assert.equal(evidence.bytes, bytes.length); assert.equal(evidence.sha256, hash(bytes));
  assert.equal(checksum, `${hash(bytes)}  Atlas-Chronicles-Setup.exe\n`);
  assert.equal(evidence.checks?.length, 2);
  assert.deepEqual(evidence.checks.map(check => check.executableKind).sort(), ['installed','packaged']);
  for (const check of evidence.checks) {
    assert.equal(check.passed, true); assert.equal(check.version, VERSION);
    assert.ok(!check.error && !check.cleanupError); assert.ok(check.checks.length >= 20);
    assert.ok(check.checks.every(name => typeof name === 'string' && name.length < 500));
  }
}
export function verifyAssets(assets, files) {
  assert.equal(assets.length, FILES.length);
  for (const name of FILES) {
    const matches = assets.filter(asset => asset.name === name); assert.equal(matches.length, 1);
    assert.equal(matches[0].state, 'uploaded'); assert.equal(matches[0].size, files[name].length);
    assert.equal(matches[0].digest, `sha256:${hash(files[name])}`);
  }
}
async function publish() {
  assert.equal(process.env.GITHUB_REPOSITORY, REPOSITORY);
  assert.equal(process.env.GITHUB_EVENT_NAME, 'workflow_run');
  const event = JSON.parse(await readFile(process.env.GITHUB_EVENT_PATH, 'utf8'));
  const trigger = event.workflow_run, sha = trigger.head_sha;
  assert.equal(trigger.head_branch, 'main'); assert.equal(trigger.event, 'push');
  assert.equal(trigger.repository.full_name, REPOSITORY);
  assert.equal(trigger.head_repository.full_name, REPOSITORY);
  assert.ok(REQUIRED.includes(trigger.name)); assert.match(sha, /^[a-f0-9]{40}$/);
  const token = process.env.GH_TOKEN; assert.ok(token);
  const root = `/repos/${REPOSITORY}`;
  const headers = { authorization: `Bearer ${token}`, accept: 'application/vnd.github+json', 'X-GitHub-Api-Version':'2022-11-28' };
  async function api(path, method='GET', body, nullable=false) {
    assert.ok(path.startsWith(`${root}/`));
    const response = await fetch(`https://api.github.com${path}`, {method,headers,body:body===undefined?undefined:JSON.stringify(body),signal:AbortSignal.timeout(60_000)});
    if (nullable && response.status === 404) return null;
    if (!response.ok) throw new Error(`GitHub ${method} ${path.split('?')[0]} returned ${response.status}`);
    return response.json();
  }
  const existing = await api(`${root}/releases/tags/v${VERSION}`, 'GET', undefined, true);
  if (existing && !existing.draft) { console.log(`v${VERSION} is already public; preserved without changes.`); return; }
  const main = await api(`${root}/git/refs/heads/main`);
  if (main.object.sha !== sha) { console.log('Superseded main build; no publication.'); return; }
  assert.equal(JSON.parse(await readFile('package.json','utf8')).version, VERSION);
  assert.equal(JSON.parse(await readFile('packages/desktop/package.json','utf8')).version, VERSION);
  async function currentGates() {
    const data = await api(`${root}/actions/runs?head_sha=${sha}&per_page=100`);
    assert.ok(data.total_count <= 100, 'Refuse incomplete gate listing');
    return verifiedRuns(data.workflow_runs, sha);
  }
  const gates = await currentGates();
  if (!gates) { console.log('Required main gates not all successful yet; no publication.'); return; }
  const tree = (await api(`${root}/git/commits/${sha}`)).tree.sha;
  const artifacts = await api(`${root}/actions/runs/${gates['windows-package']}/artifacts?per_page=100`);
  assert.ok(artifacts.total_count <= 100);
  const matches = artifacts.artifacts.filter(artifact => artifact.name === 'windows-v0.4.3-candidate');
  assert.equal(matches.length,1); const artifact = matches[0];
  assert.equal(artifact.expired, false); assert.equal(artifact.workflow_run.head_sha, sha);
  assert.equal(artifact.workflow_run.head_branch,'main'); assert.ok(artifact.size_in_bytes < 400_000_000);
  assert.match(artifact.digest, /^sha256:[a-f0-9]{64}$/);
  const directory = await mkdtemp(join(tmpdir(),'atlas-v043-'));
  try {
    // Follow GitHub's artifact redirect WITHOUT forwarding the API bearer token.
    const redirect = await fetch(`https://api.github.com${root}/actions/artifacts/${artifact.id}/zip`, {headers,redirect:'manual',signal:AbortSignal.timeout(60_000)});
    assert.equal(redirect.status,302); const address = new URL(redirect.headers.get('location'));
    assert.equal(address.protocol,'https:'); assert.equal(address.username,''); assert.equal(address.password,'');
    const response = await fetch(address,{signal:AbortSignal.timeout(300_000)}); assert.equal(response.status,200);
    const archive = Buffer.from(await response.arrayBuffer());
    assert.equal(`sha256:${hash(archive)}`,artifact.digest); assert.equal(archive.length,artifact.size_in_bytes);
    await writeFile(join(directory,'candidate.zip'),archive);
    execFileSync('python3',['tools/release/unpack-candidate.py',join(directory,'candidate.zip'),join(directory,'files')],{stdio:'inherit'});
    const files = Object.fromEntries(await Promise.all(FILES.map(async name => [name,await readFile(join(directory,'files',name))])));
    verifyEvidence(JSON.parse(files['release-evidence.json']),files['Atlas-Chronicles-Setup.exe'],files['SHA256SUMS.txt'].toString(),{sha,tree,run:gates['windows-package']});
    const tag = await api(`${root}/git/refs/tags/v${VERSION}`,'GET',undefined,true);
    if (tag) {
      const object = tag.object.type === 'tag' ? (await api(`${root}/git/tags/${tag.object.sha}`)).object : tag.object;
      assert.equal(object.type,'commit'); assert.equal(object.sha,sha,'Existing tag points elsewhere; do not retag');
    }
    assert.equal((await api(`${root}/git/refs/heads/main`)).object.sha,sha);
    assert.deepEqual(await currentGates(),gates,'Gates changed during verification');
    const body = `${await readFile('docs/releases/v0.4.3.md','utf8')}\n\n## Build-Nachweis\nCommit: \`${sha}\`\n\nSetup SHA-256: \`${hash(files['Atlas-Chronicles-Setup.exe'])}\`\n\n${REQUIRED.map(name=>`- ${name}: https://github.com/${REPOSITORY}/actions/runs/${gates[name]}`).join('\n')}\n`;
    let release = existing;
    if (release) { assert.equal(release.target_commitish,sha); assert.equal(release.draft,true); }
    else release = await api(`${root}/releases`,'POST',{tag_name:`v${VERSION}`,target_commitish:sha,name:'Atlas Chronicles v0.4.3 — Kartenstudio & GUI-Korrekturen',body,draft:true,prerelease:false});
    const currentAssets = await api(`${root}/releases/${release.id}/assets?per_page=100`);
    assert.ok(currentAssets.every(asset=>FILES.includes(asset.name)), 'Unexpected draft asset; preserve and stop');
    for (const name of FILES) {
      const same = currentAssets.find(asset=>asset.name===name);
      if (same) { assert.equal(same.state,'uploaded'); assert.equal(same.size,files[name].length); assert.equal(same.digest,`sha256:${hash(files[name])}`); continue; }
      const upload = new URL(release.upload_url.replace(/\{.*$/,''));
      assert.equal(upload.origin,'https://uploads.github.com'); assert.equal(upload.pathname,`${root}/releases/${release.id}/assets`);
      upload.searchParams.set('name',name);
      const result = await fetch(upload,{method:'POST',headers:{...headers,'content-type':'application/octet-stream','content-length':String(files[name].length)},body:files[name],signal:AbortSignal.timeout(300_000)});
      if (!result.ok) throw new Error(`Upload ${name} failed: ${result.status}; draft preserved`);
    }
    verifyAssets(await api(`${root}/releases/${release.id}/assets?per_page=100`),files);
    assert.equal((await api(`${root}/git/refs/heads/main`)).object.sha,sha,'Main moved; draft not published');
    assert.deepEqual(await currentGates(),gates);
    const published = await api(`${root}/releases/${release.id}`,'PATCH',{body,draft:false,prerelease:false,make_latest:'true'});
    assert.equal(published.draft,false); assert.equal(published.tag_name,`v${VERSION}`);
    const finalTag = await api(`${root}/git/refs/tags/v${VERSION}`);
    const finalObject = finalTag.object.type === 'tag' ? (await api(`${root}/git/tags/${finalTag.object.sha}`)).object : finalTag.object;
    assert.equal(finalObject.sha,sha);
    verifyAssets(await api(`${root}/releases/${release.id}/assets?per_page=100`),files);
    console.log(`Published verified v${VERSION}: ${published.html_url}`);
  } finally { await rm(directory,{recursive:true,force:true}); }
}
if (process.argv[1] && pathToFileURL(resolve(process.argv[1])).href === import.meta.url) await publish();
