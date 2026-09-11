// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2026 Kaya Yesilyurt - Atlas Chronicles. Siehe LICENSE.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { verifiedRuns, verifyEvidence, verifyAssets, REQUIRED, FILES } from '../release/publish-v043.mjs';
const sha = 'a'.repeat(40), tree = 'b'.repeat(40), run = 101;
const runs = REQUIRED.map((name,i)=>({id:100+i,name,path:`.github/workflows/${name}.yml`,head_sha:sha,head_branch:'main',event:'push',status:'completed',conclusion:'success'}));
test('all exact main push gates are required; pending/failing/newer runs cannot reuse an older success',()=>{
  assert.equal(Object.keys(verifiedRuns(runs,sha)).length,5);
  assert.equal(verifiedRuns(runs.slice(1),sha),null);
  for(const override of [{conclusion:'failure'},{status:'in_progress',conclusion:null},{event:'pull_request'},{head_branch:'feature'},{head_sha:tree},{path:'.github/workflows/untrusted.yml'}])
    assert.equal(verifiedRuns([{...runs[0],...override},...runs.slice(1)],sha),null);
  assert.equal(verifiedRuns([...runs,{...runs[0],id:999,status:'in_progress',conclusion:null}],sha),null);
});
const bytes=Buffer.alloc(10_000_001); bytes.write('MZ');
const digest=createHash('sha256').update(bytes).digest('hex'), checksum=`${digest}  Atlas-Chronicles-Setup.exe\n`;
const evidence={version:'0.4.3',sourceCommit:sha,sourceTree:tree,workflowRun:run,platform:'windows-x64',signed:false,automaticUpdates:false,bytes:bytes.length,sha256:digest,checks:['installed','packaged'].map(executableKind=>({executableKind,version:'0.4.3',passed:true,checks:Array.from({length:20},(_,i)=>`verified ${i}`),error:null,cleanupError:null}))};
test('require matching executable identity and both completed Windows smoke runs',()=>{
  verifyEvidence(evidence,bytes,checksum,{sha,tree,run});
  for(const patch of [{version:'0.4.2'},{sourceCommit:tree},{sourceTree:sha},{workflowRun:102},{platform:'linux'},{signed:true},{automaticUpdates:true},{sha256:'c'.repeat(64)},{bytes:0},{checks:evidence.checks.slice(1)},{checks:[evidence.checks[0],evidence.checks[0]]}])
    assert.throws(()=>verifyEvidence({...evidence,...patch},bytes,checksum,{sha,tree,run}));
  for(const patch of [{passed:false},{cleanupError:'lock still alive'},{checks:[]},{error:'failed'}])
    assert.throws(()=>verifyEvidence({...evidence,checks:[{...evidence.checks[0],...patch},evidence.checks[1]]},bytes,checksum,{sha,tree,run}));
  assert.throws(()=>verifyEvidence(evidence,bytes,'forged',{sha,tree,run}));
});
test('published assets must match every exact byte hash; missing, extra or duplicate files fail',()=>{
  const files=Object.fromEntries(FILES.map(name=>[name,Buffer.from(name)]));
  const assets=FILES.map(name=>({name,state:'uploaded',size:files[name].length,digest:`sha256:${createHash('sha256').update(files[name]).digest('hex')}`}));
  verifyAssets(assets,files);
  for(const broken of [assets.slice(1),[...assets,assets[0]],[assets[0],assets[0],assets[2]],[{...assets[0],digest:'sha256:bad'},...assets.slice(1)],[{...assets[0],state:'starter'},...assets.slice(1)]]) assert.throws(()=>verifyAssets(broken,files));
});
