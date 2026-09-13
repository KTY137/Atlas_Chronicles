// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2026 Kaya Yesilyurt - Atlas Chronicles. Siehe LICENSE.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { verifiedRuns, verifyEvidence, verifyAssets, verifyVersions, verifyDraft, boundedBytes, release, VERSION, REPOSITORY, REQUIRED, FILES } from '../release/publish.mjs';
const sha = 'a'.repeat(40), tree = 'b'.repeat(40), run = 104;
const runs = REQUIRED.map((name,i) => ({ id:100+i, name, path:`.github/workflows/${name}.yml`, head_sha:sha, head_branch:'main', event:'push', status:'completed', conclusion:'success', repository:{full_name:REPOSITORY}, head_repository:{full_name:REPOSITORY} }));
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const bytes = Buffer.alloc(10_000_001); bytes.write('MZ');
const checksum = `${hash(bytes)}  Atlas-Chronicles-Setup.exe\n`;
const evidence = { version:VERSION, sourceCommit:sha, sourceTree:tree, workflowRun:run, platform:'windows-x64', signed:false, automaticUpdates:false, bytes:bytes.length, sha256:hash(bytes), checks:['installed','packaged'].map(executableKind => ({ executableKind, version:VERSION, passed:true, checks:Array.from({length:20},(_,i)=>`verified ${i}`), error:null, cleanupError:null })) };
const files = { [FILES[0]]:bytes, [FILES[1]]:Buffer.from(checksum), [FILES[2]]:Buffer.from(JSON.stringify(evidence)) };
const assets = FILES.map((name,i) => ({id:10+i,name,state:'uploaded',size:files[name].length,digest:`sha256:${hash(files[name])}`}));
const draft = {id:1,tag_name:`v${VERSION}`,target_commitish:sha,draft:true,prerelease:false,html_url:'https://github.com/KTY137/Atlas_Chronicles/releases/tag/v0.5.0'};
test('all exact main push gates are required, including newer pending and failed reruns', () => {
  assert.equal(Object.keys(verifiedRuns(runs,sha)).length,5);
  assert.equal(verifiedRuns(runs.slice(1),sha),null);
  for(const override of [{conclusion:'failure'},{status:'in_progress',conclusion:null},{event:'pull_request'},{head_branch:'feature'},{head_sha:tree},{path:'.github/workflows/untrusted.yml'}])
    assert.equal(verifiedRuns([{...runs[0],...override},...runs.slice(1)],sha),null);
  assert.equal(verifiedRuns([...runs,{...runs[0],id:999,status:'in_progress',conclusion:null}],sha),null);
});
test('require matching executable identity, checksums and both completed Windows smokes', () => {
  verifyEvidence(evidence,bytes,checksum,{sha,tree,run});
  for(const patch of [{version:'0.4.3'},{sourceCommit:tree},{sourceTree:sha},{workflowRun:999},{platform:'linux'},{signed:true},{automaticUpdates:true},{sha256:'c'.repeat(64)},{bytes:0},{checks:evidence.checks.slice(1)},{checks:[evidence.checks[0],evidence.checks[0]]}])
    assert.throws(()=>verifyEvidence({...evidence,...patch},bytes,checksum,{sha,tree,run}));
  for(const patch of [{passed:false},{version:'0.4.3'},{cleanupError:'lock still alive'},{checks:[]},{error:'failed'}])
    assert.throws(()=>verifyEvidence({...evidence,checks:[{...evidence.checks[0],...patch},evidence.checks[1]]},bytes,checksum,{sha,tree,run}));
  assert.throws(()=>verifyEvidence(evidence,bytes,'forged',{sha,tree,run}));
});
test('published assets require every exact byte hash, no extra, missing or duplicate file', () => {
  verifyAssets(assets,files);
  for(const broken of [assets.slice(1),[...assets,assets[0]],[assets[0],assets[0],assets[2]],[{...assets[0],digest:'sha256:bad'},...assets.slice(1)],[{...assets[0],state:'starter'},...assets.slice(1)]]) assert.throws(()=>verifyAssets(broken,files));
});
test('all five product version fields must agree; published or other-source drafts stay untouched', () => {
  const lock={version:VERSION,packages:{'':{version:VERSION},'packages/desktop':{version:VERSION}}};
  verifyVersions({version:VERSION},{version:VERSION},lock);
  assert.throws(()=>verifyVersions({version:VERSION},{version:'0.4.3'},lock));
  assert.throws(()=>verifyVersions({version:VERSION},{version:VERSION},{...lock,packages:{}}));
  verifyDraft(draft,sha);
  for(const patch of [{draft:false},{target_commitish:tree},{tag_name:'v0.4.3'},{prerelease:true}]) assert.throws(()=>verifyDraft({...draft,...patch},sha));
});
test('download byte limits reject advertised and streamed oversize bodies', async () => {
  assert.equal((await boundedBytes(new Response('abc'),3)).toString(),'abc');
  await assert.rejects(boundedBytes(new Response('abcd'),3));
  await assert.rejects(boundedBytes(new Response('abc',{headers:{'content-length':'99'}}),3));
});
function harness(mode, {publicRelease=false, pending=false, wrongDraft=false, redirects=false, corrupt=false, superseded=false, uploadFailure=false, existingAssets=false}={}) {
  const env={GITHUB_REPOSITORY:REPOSITORY,GITHUB_EVENT_PATH:'event.json',GH_TOKEN:'test-only-token',GITHUB_SHA:sha,GITHUB_REF:'refs/heads/main',GITHUB_WORKFLOW:'windows-package',GITHUB_RUN_ID:String(run),SOURCE_TREE:tree,GITHUB_EVENT_NAME:mode==='stage'?'push':'workflow_run'};
  const state={candidate:mode==='stage'?undefined:{...draft},assets:mode==='stage'?[]:structuredClone(assets),writes:[],tag:false,downloads:0};
  if(publicRelease) state.candidate={...draft,draft:false};
  if(wrongDraft) state.candidate={...draft,target_commitish:tree};
  if(existingAssets){state.candidate={...draft};state.assets=structuredClone(assets);}
  const json=(body,status=200)=>new Response(JSON.stringify(body),{status,headers:{'content-type':'application/json'}});
  const read=async path=>{
    if(path==='event.json') return JSON.stringify(mode==='stage'?{repository:{full_name:REPOSITORY},after:sha}:{workflow_run:runs[0]});
    if(path==='package-lock.json') return JSON.stringify({version:VERSION,packages:{'':{version:VERSION},'packages/desktop':{version:VERSION}}});
    if(path.endsWith('package.json')) return JSON.stringify({version:VERSION});
    if(path.startsWith('docs/')) return 'Release notes';
    if(path.startsWith('.local/release/')) return files[path.split('/').at(-1)];
    throw new Error(`Unexpected read ${path}`);
  };
  const request=async (url,options={})=>{
    const u=new URL(url), path=u.pathname, method=options.method??'GET';
    if(method!=='GET') state.writes.push({method,path});
    if(u.hostname.endsWith('githubusercontent.com')) {
      assert.equal(options.headers,undefined,'API token must never reach signed download host');
      return new Response(files[FILES[Number(path.slice(1))]]);
    }
    if(u.hostname==='uploads.github.com') {
      if(uploadFailure) return json({},503);
      const name=u.searchParams.get('name');
      assert.deepEqual(options.body,files[name]);
      state.assets.push(assets.find(a=>a.name===name)); return json(state.assets.at(-1),201);
    }
    if(path.endsWith('/releases')&&method==='GET') return json(state.candidate?[state.candidate]:[]);
    if(path.endsWith('/releases')&&method==='POST'){state.candidate={...draft,...JSON.parse(options.body)};return json(state.candidate,201);}
    if(path.endsWith('/git/refs/heads/main')) return json({object:{sha:superseded?tree:sha}});
    if(path.endsWith(`/git/commits/${sha}`)) return json({tree:{sha:tree}});
    if(path.endsWith(`/git/ref/tags/v${VERSION}`)) return state.tag?json({object:{type:'commit',sha}}):json({},404);
    if(path.endsWith(`/actions/runs/${run}`)) return json({...runs.at(-1),status:'in_progress',conclusion:null});
    if(path.endsWith('/actions/runs')) return json({total_count:5,workflow_runs:pending?runs.slice(1):runs});
    if(path.endsWith('/releases/1/assets')) return json(state.assets);
    if(path.includes('/releases/assets/')) {
      state.downloads++; const index=Number(path.split('/').at(-1))-10;
      if(redirects) return new Response(null,{status:302,headers:{location:`https://release-assets.githubusercontent.com/${index}`}});
      return new Response(corrupt&&index===0?Buffer.from('forged'):files[FILES[index]]);
    }
    if(path.endsWith('/releases/1')&&method==='PATCH'){state.candidate={...state.candidate,...JSON.parse(options.body)};state.tag=true;return json(state.candidate);}
    if(path.endsWith('/releases/1')) return json(state.candidate);
    throw new Error(`Unexpected request ${method} ${path}`);
  };
  return {state,options:{mode,env,platform:'win32',read,request,log:()=>{}}};
}
test('Windows staging uploads all three files but cannot publish or create a tag', async () => {
  const h=harness('stage'); assert.equal(await release(h.options),'staged');
  assert.equal(h.state.assets.length,3); assert.equal(h.state.candidate.draft,true); assert.equal(h.state.tag,false);
  assert.equal(h.state.writes.filter(w=>w.method==='PATCH').length,0);
});
test('same-byte staging is resumable without replacement; failed uploads preserve draft', async () => {
  const h=harness('stage',{existingAssets:true}); assert.equal(await release(h.options),'staged'); assert.equal(h.state.writes.length,0);
  const failed=harness('stage',{uploadFailure:true}); await assert.rejects(release(failed.options));
  assert.equal(failed.state.candidate.draft,true); assert.equal(failed.state.tag,false);
});
test('publication independently downloads and checks draft bytes, five gates and the final tag', async () => {
  const h=harness('publish',{redirects:true}); assert.equal(await release(h.options),'published');
  assert.equal(h.state.candidate.draft,false); assert.equal(h.state.candidate.make_latest,'true');
  assert.equal(h.state.downloads,3); assert.deepEqual(h.state.writes.map(w=>w.method),['PATCH']);
});
test('pending gates, newer main and existing public release cause zero writes', async () => {
  for(const [config,result] of [[{pending:true},'pending'],[{superseded:true},'superseded'],[{publicRelease:true},'preserved']]) {
    const h=harness('publish',config); assert.equal(await release(h.options),result); assert.equal(h.state.writes.length,0);
  }
});
test('corrupt bytes or a different-source draft cannot be published or overwritten', async () => {
  for(const config of [{wrongDraft:true},{corrupt:true}]) {
    const h=harness('publish',config); await assert.rejects(release(h.options)); assert.equal(h.state.writes.length,0);
  }
});
test('pull requests cannot stage or publish', async () => {
  for(const mode of ['stage','publish']) {
    const h=harness(mode); h.options.env.GITHUB_EVENT_NAME='pull_request';
    await assert.rejects(release(h.options)); assert.equal(h.state.writes.length,0);
  }
});
