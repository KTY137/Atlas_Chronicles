// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2026 Kaya Yesilyurt - Atlas Chronicles. Siehe LICENSE.
// A draft transports the tested Windows bytes without Actions artifact storage.
// Only a second, completed-workflow invocation may publish; no rebuilding or retagging.
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
export const VERSION = '0.5.0', REPOSITORY = 'KTY137/Atlas_Chronicles';
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
export function verifyVersions(root, desktop, lock) {
  for (const manifest of [root, desktop, lock, lock.packages?.[''], lock.packages?.['packages/desktop']])
    assert.equal(manifest?.version, VERSION, 'Release manifests and lockfile must agree');
}
export function verifyDraft(release, sha) {
  assert.equal(release.draft, true, 'Preserve published releases');
  assert.equal(release.tag_name, `v${VERSION}`);
  assert.equal(release.target_commitish, sha, 'Preserve a draft belonging to a different commit');
  assert.equal(release.prerelease, false);
}
export async function boundedBytes(response, limit) {
  assert.ok(response.ok && response.body, 'Asset download failed');
  const declared = response.headers.get('content-length');
  if (declared !== null) assert.ok(/^\d+$/.test(declared) && Number(declared) <= limit);
  let total = 0; const chunks = [];
  for await (const chunk of response.body) {
    total += chunk.length; assert.ok(total <= limit, 'Asset exceeds its size limit'); chunks.push(chunk);
  }
  return Buffer.concat(chunks, total);
}
export async function release({ mode = 'publish', env = process.env, platform = process.platform,
  read = readFile, request = fetch, log = console.log } = {}) {
  assert.ok(['stage','publish'].includes(mode));
  assert.equal(env.GITHUB_REPOSITORY, REPOSITORY);
  const event = JSON.parse(await read(env.GITHUB_EVENT_PATH, 'utf8'));
  let sha;
  if (mode === 'stage') {
    assert.equal(platform, 'win32'); assert.equal(env.GITHUB_EVENT_NAME, 'push');
    assert.equal(env.GITHUB_REF, 'refs/heads/main'); assert.equal(env.GITHUB_WORKFLOW, 'windows-package');
    assert.equal(event.repository.full_name, REPOSITORY); sha = env.GITHUB_SHA;
    assert.equal(event.after, sha);
  } else {
    assert.equal(env.GITHUB_EVENT_NAME, 'workflow_run');
    const trigger = event.workflow_run; sha = trigger.head_sha;
    assert.equal(trigger.head_branch, 'main'); assert.equal(trigger.event, 'push');
    assert.equal(trigger.repository.full_name, REPOSITORY); assert.equal(trigger.head_repository.full_name, REPOSITORY);
    assert.ok(REQUIRED.includes(trigger.name)); assert.equal(trigger.conclusion, 'success');
  }
  assert.match(sha, /^[a-f0-9]{40}$/);
  assert.ok(env.GH_TOKEN);
  const root = `/repos/${REPOSITORY}`;
  const headers = { authorization: `Bearer ${env.GH_TOKEN}`, accept: 'application/vnd.github+json',
    'content-type': 'application/json', 'X-GitHub-Api-Version': '2022-11-28' };
  async function api(path, method = 'GET', body, nullable = false) {
    assert.ok(path.startsWith(`${root}/`));
    const response = await request(`https://api.github.com${path}`, { method, headers,
      body: body === undefined ? undefined : JSON.stringify(body), redirect: 'error', signal: AbortSignal.timeout(60_000) });
    if (nullable && response.status === 404) return null;
    if (!response.ok) throw new Error(`GitHub ${method} ${path.split('?')[0]} returned ${response.status}`);
    return response.json();
  }
  // Listing also sees drafts, which the published-release-by-tag endpoint may not return.
  const releases = await api(`${root}/releases?per_page=100`);
  assert.ok(releases.length < 100, 'Refuse an incomplete release listing');
  const matches = releases.filter(item => item.tag_name === `v${VERSION}`);
  assert.ok(matches.length <= 1, 'Duplicate release drafts need manual reconciliation');
  let candidate = matches[0];
  if (candidate && !candidate.draft) { log(`v${VERSION} is already published; preserved without changes.`); return 'preserved'; }
  const currentMain = async () => (await api(`${root}/git/refs/heads/main`)).object.sha;
  if (await currentMain() !== sha) { log('Superseded main build; no release changes.'); return 'superseded'; }
  verifyVersions(...await Promise.all(['package.json','packages/desktop/package.json','package-lock.json'].map(async path => JSON.parse(await read(path,'utf8')))));
  const tree = (await api(`${root}/git/commits/${sha}`)).tree.sha;
  const checkTag = async (required = false) => {
    const tag = await api(`${root}/git/ref/tags/v${VERSION}`, 'GET', undefined, true);
    if (!tag) { assert.equal(required, false, "Published release tag is missing"); return; }
    const object = tag.object.type === 'tag' ? (await api(`${root}/git/tags/${tag.object.sha}`)).object : tag.object;
    assert.equal(object.type, 'commit'); assert.equal(object.sha, sha, 'Never move an existing tag');
  };
  await checkTag();
  if (candidate) verifyDraft(candidate, sha);
  const listAssets = async () => api(`${root}/releases/${candidate.id}/assets?per_page=100`);
  const notes = await read(`docs/releases/v${VERSION}.md`, 'utf8');
  let files, gates;
  if (mode === 'stage') {
    assert.match(env.GITHUB_RUN_ID, /^\d+$/);
    const run = await api(`${root}/actions/runs/${env.GITHUB_RUN_ID}`);
    assert.equal(run.head_sha, sha); assert.equal(run.head_branch, 'main'); assert.equal(run.event, 'push');
    assert.equal(run.path, '.github/workflows/windows-package.yml'); assert.equal(run.status, 'in_progress');
    assert.equal(run.head_repository.full_name, REPOSITORY); assert.equal(env.SOURCE_TREE, tree);
    files = Object.fromEntries(await Promise.all(FILES.map(async name => [name, await read(`.local/release/${name}`)])));
    verifyEvidence(JSON.parse(files['release-evidence.json']), files[FILES[0]], files[FILES[1]].toString(), {sha, tree, run: env.GITHUB_RUN_ID});
    assert.equal(await currentMain(), sha, 'Main advanced; do not stage stale bytes');
    if (!candidate) candidate = await api(`${root}/releases`, 'POST', { tag_name: `v${VERSION}`, target_commitish: sha,
      name: `Atlas Chronicles v${VERSION}`, body: `${notes}\n\nBuild-Kandidat; Veröffentlichung erst nach allen fünf erfolgreichen CI-Prüfungen.\n`, draft: true, prerelease: false });
    verifyDraft(candidate, sha);
    const assets = await listAssets();
    assert.ok(assets.length <= FILES.length && assets.every(a => FILES.includes(a.name)), 'Preserve unexpected draft assets');
    for (const name of FILES) {
      const old = assets.filter(a => a.name === name); assert.ok(old.length <= 1);
      if (old.length) {
        assert.equal(old[0].state, 'uploaded'); assert.equal(old[0].size, files[name].length);
        assert.equal(old[0].digest, `sha256:${hash(files[name])}`, 'Never replace different draft bytes'); continue;
      }
      const response = await request(`https://uploads.github.com${root}/releases/${candidate.id}/assets?name=${encodeURIComponent(name)}`, {
        method: 'POST', headers: { ...headers, 'content-type': 'application/octet-stream', 'content-length': String(files[name].length) },
        body: files[name], redirect: 'error', signal: AbortSignal.timeout(300_000) });
      if (!response.ok) throw new Error(`Asset upload returned ${response.status}; draft preserved`);
      await response.json();
    }
    verifyAssets(await listAssets(), files);
    log(`Staged verified Windows v${VERSION}; release remains a draft until every gate succeeds.`); return 'staged';
  }
  async function currentGates() {
    const data = await api(`${root}/actions/runs?head_sha=${sha}&per_page=100`);
    assert.ok(data.total_count <= 100, 'Refuse an incomplete gate listing');
    return verifiedRuns(data.workflow_runs, sha);
  }
  gates = await currentGates();
  if (!gates || !candidate) { log('Required gates or Windows draft not ready; no publication.'); return 'pending'; }
  const assets = await listAssets();
  assert.deepEqual(assets.map(a => a.name).sort(), [...FILES].sort()); files = {};
  for (const asset of assets) {
    const limit = asset.name.endsWith('.exe') ? 399_999_999 : asset.name.endsWith('.json') ? 1_000_000 : 512;
    assert.ok(Number.isSafeInteger(asset.id) && asset.id > 0 && asset.size > 0 && asset.size <= limit);
    let response = await request(`https://api.github.com${root}/releases/assets/${asset.id}`, {
      headers: { ...headers, accept: 'application/octet-stream' }, redirect: 'manual', signal: AbortSignal.timeout(300_000) });
    if (response.status === 302) {
      const url = new URL(response.headers.get('location'));
      assert.equal(url.protocol, 'https:'); assert.ok(!url.username && !url.password);
      assert.ok(['release-assets.githubusercontent.com','objects.githubusercontent.com'].includes(url.hostname));
      // Never forward the API token to the signed download URL.
      response = await request(url.href, { redirect: 'error', signal: AbortSignal.timeout(300_000) });
    }
    files[asset.name] = await boundedBytes(response, limit);
  }
  verifyAssets(assets, files);
  verifyEvidence(JSON.parse(files[FILES[2]]), files[FILES[0]], files[FILES[1]].toString(), {sha, tree, run: gates['windows-package']});
  assert.equal(await currentMain(), sha); assert.deepEqual(await currentGates(), gates); await checkTag();
  verifyDraft(await api(`${root}/releases/${candidate.id}`), sha);
  verifyAssets(await listAssets(), files);
  const body = `${notes}\n\n## Build-Nachweis\nCommit: \`${sha}\`\n\nSetup SHA-256: \`${hash(files[FILES[0]])}\`\n\n${REQUIRED.map(name => `- ${name}: https://github.com/${REPOSITORY}/actions/runs/${gates[name]}`).join('\n')}\n`;
  const published = await api(`${root}/releases/${candidate.id}`, 'PATCH', { body, draft: false, prerelease: false, make_latest: 'true' });
  assert.equal(published.draft, false); assert.equal(published.tag_name, `v${VERSION}`);
  await checkTag(true); verifyAssets(await listAssets(), files);
  log(`Published verified v${VERSION}: ${published.html_url}`); return 'published';
}
if (process.argv[1] && pathToFileURL(resolve(process.argv[1])).href === import.meta.url) {
  assert.ok(process.argv.length === 2 || (process.argv.length === 3 && process.argv[2] === '--stage'));
  await release({ mode: process.argv[2] === '--stage' ? 'stage' : 'publish' });
}
