// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2026 Kaya Yesilyurt - Atlas Chronicles. Siehe LICENSE.
import { test, expect } from '@playwright/test';
import { mount } from './helpers/component-browser';
import { randomSource, chooseNative } from './helpers/seeded-gui';

const seeds = process.env.GUI_FUZZ_SEEDS?.split(',').map(Number) ?? [1, 137, 20260911, 0xdeadbeef];
const harness = `
  import {createRoot} from 'react-dom/client';import {useState} from 'react';
  import {MapGenerationControls} from './packages/client/src/features/MapGenerationControls.tsx';
  import {generationSettings,generationOptions} from './packages/client/src/features/map-generation.ts';
  import {GRUNDRISS_STANDARD,HOEHLE_STANDARD,SIEDLUNG_STANDARD,ANLAGE_STANDARD} from '@chronicle/forge';
  import '@chronicle/ui/tokens.css';
  const defaults={grundriss:GRUNDRISS_STANDARD,hoehle:HOEHLE_STANDARD,siedlung:SIEDLUNG_STANDARD,anlagen:ANLAGE_STANDARD};
  function Probe(){const [value,setValue]=useState(generationSettings()),[tick,setTick]=useState(0);
    return <><button onClick={()=>setTick(n=>n+1)}>Hostdaten auffrischen</button>
      <output id='state'>{JSON.stringify({value,request:generationOptions(value,defaults),tick})}</output>
      <MapGenerationControls compact value={value} defaults={{...defaults}} onChange={setValue}/></>}
  createRoot(document.querySelector('#root')).render(<Probe/>);
`;

for (const seed of seeds) test(`model-based dropdown state fuzz seed=${seed}`, async ({page}, info) => {
  test.setTimeout(180_000);
  const random = randomSource(seed), trace: unknown[] = [], errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  await mount(page, harness);
  const picker = page.getByRole('combobox', {name:'Was liegt hinter dieser Tür?',exact:true});
  const choices = await picker.locator('option').evaluateAll(nodes => nodes.map(n=>(n as HTMLOptionElement).value));
  // The model tracks user intent only; it does not call the production mapping/validation helpers.
  let choice = 'siedlung:dorf', width: number|'' = '', setting = 'fantasy', style = 'gemalt';
  try {
    for (let step=0; step<80; ++step) {
      const command = random(5);
      if(command === 0 || step < choices.length) {
        const next = step < choices.length ? choices[step]! : choices[random(choices.length)]!;
        trace.push({step,command:'choose',next});
        await chooseNative(picker,next); choice=next;
        // Type presets may supply dimensions. A subsequent edit establishes a separate invariant.
        const enteredWidth=40+random(20); await page.getByRole('spinbutton',{name:'Breite',exact:true}).fill(String(enteredWidth)); width=enteredWidth;
      } else if(command === 1) {
        trace.push({step,command:'refresh'});
        await page.getByRole('button',{name:'Hostdaten auffrischen'}).click();
      } else if(command === 2) {
        width=random(2) ? 32+random(64) : '';trace.push({step,command:'width',width});
        await page.getByRole('spinbutton',{name:'Breite',exact:true}).fill(String(width));
      } else if(command === 3 && choice !== 'hoehle') {
        const index=random(3); setting=['fantasy','gegenwart','scifi'][index]!; style=index===0?'gemalt':'zeitwelten';
        trace.push({step,command:'setting',setting});
        await page.getByRole('group',{name:'Setting',exact:true}).getByRole('button').nth(index).click();
      } else {
        const size=[{width:390,height:844},{width:1440,height:960},{width:800,height:600}][random(3)]!;
        trace.push({step,command:'resize',...size});await page.setViewportSize(size);await page.keyboard.press('Escape');
      }
      await expect(picker).toHaveValue(choice);
      const state=JSON.parse(await page.locator('#state').innerText());
      expect(state.value.breite).toBe(width);expect(state.value.setting).toBe(setting);expect(state.value.stil).toBe(style);
      const [kind, subtype]=choice.split(':');
      expect(state.value.art).toBe(kind==='anlage'?'siedlung':kind);
      if(kind==='grundriss') expect(state.request.profil).toBe(subtype);
      if(kind==='siedlung') expect(state.request.art).toBe(subtype);
      if(kind==='anlage') expect(state.request.anlage).toBe(subtype);
      if(kind==='hoehle') expect(state.request).not.toHaveProperty('profil');
      expect(errors).toEqual([]);
    }
  } finally {
    await info.attach('state-fuzz-replay', {body:JSON.stringify({seed,steps:trace.length,trace,errors},null,2),contentType:'application/json'});
  }
});

for (const seed of seeds) test(`async admission state fuzz seed=${seed}`,async({page},info)=>{
  test.setTimeout(120_000);
  const random=randomSource(seed), trace:unknown[]=[];
  await mount(page,`
    import {createRoot} from 'react-dom/client';import {useTask} from './packages/client/src/hooks.ts';
    window.pending=[];window.admitted=0;
    function Probe(){const task=useTask();window.start=()=>task.run(()=>{window.admitted++;return new Promise((resolve,reject)=>window.pending.push({resolve,reject}))});
      return <><button onClick={()=>window.start()}>Arbeit starten</button><output>{task.busy?'busy':'idle'}</output><p>{task.error}</p></>}
    createRoot(document.querySelector('#root')).render(<Probe/>);
  `);
  await expect(page.locator('output')).toHaveText('idle');
  let admitted=0;
  try {
    for(let step=0;step<40;++step){
      const burst=1+random(8), reject=!!random(2);trace.push({step,burst,reject});
      await page.evaluate(n=>{for(let i=0;i<n;++i) (window as any).start()},burst);++admitted;
      await expect(page.locator('output')).toHaveText('busy');
      expect(await page.evaluate(()=>(window as any).admitted)).toBe(admitted);
      await page.getByRole('button',{name:'Arbeit starten'}).click();
      expect(await page.evaluate(()=>(window as any).admitted)).toBe(admitted);
      await page.evaluate(fail=>{const job=(window as any).pending.shift();fail?job.reject(new Error('Testfehler')):job.resolve()},reject);
      await expect(page.locator('output')).toHaveText('idle');
      await expect(page.locator('p')).toHaveText(reject?'Testfehler':'');
    }
  } finally {await info.attach('async-fuzz-replay',{body:JSON.stringify({seed,trace},null,2),contentType:'application/json'});}
});
