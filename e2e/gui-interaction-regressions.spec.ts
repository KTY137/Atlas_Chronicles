// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2026 Kaya Yesilyurt - Atlas Chronicles. Siehe LICENSE.
import { test, expect } from '@playwright/test';
import { mount } from './helpers/component-browser';

const menuHarness = `
  import {createRoot} from 'react-dom/client';
  import {MapContextMenu} from './packages/client/src/features/MapContextMenu.tsx';
  import '@chronicle/ui/tokens.css';
  const actions=Array.from({length:24},(_,i)=>({id:String(i),label:'Aktion '+i,onSelect:()=>{document.querySelector('output').textContent=String(i)}}));
  createRoot(document.querySelector('#root')).render(<div>
    <button onClick={()=>document.querySelector('#stage').requestFullscreen()}>Vollbild</button>
    <button onClick={()=>document.querySelector('dialog').showModal()}>Dialog</button>
    <section id='stage' style={{height:220,background:'#333'}}><MapContextMenu label='Vollbildkarte' actions={actions}><button>Vollbildziel</button></MapContextMenu></section>
    <dialog><MapContextMenu label='Dialogkarte' actions={actions}><button>Dialogziel</button><input aria-label='Notiz'/></MapContextMenu></dialog>
    <output/><div style={{height:1400}}>Seitenende</div>
  </div>);
`;

test('context menus dismiss when focus moves elsewhere without a pointer click', async ({ page }) => {
  await mount(page, menuHarness);
  await page.getByRole('button', { name: 'Aktionen für Vollbildkarte', exact: true }).click();
  await expect(page.getByRole('menu')).toBeVisible();
  await page.getByRole('button', { name: 'Vollbild', exact: true }).focus();
  await expect(page.getByRole('menu')).toHaveCount(0);
});

test('context menus dismiss on window blur and can immediately open again', async ({ page }) => {
  await mount(page, menuHarness);
  const trigger = page.getByRole('button', { name: 'Aktionen für Vollbildkarte', exact: true });
  await trigger.click();
  await page.evaluate(() => window.dispatchEvent(new Event('blur')));
  await expect(page.getByRole('menu')).toHaveCount(0);
  await trigger.click();
  await expect(page.getByRole('menu')).toBeVisible();
});

test('formula dropdown closes after selection, outside focus and Escape', async ({ page }) => {
  await mount(page, `
    import {createRoot} from 'react-dom/client'; import {useState} from 'react';
    import {FormulaBlocks} from './packages/client/src/features/FormulaBlocks.tsx';
    function Harness(){ const [value,setValue]=useState({kind:'literal',type:'number',value:'1'});
      return <><button>Außerhalb</button><FormulaBlocks value={value} onChange={setValue} sources={{actor:[],input:[]}} options={{allowDice:true,allowKnowledge:false}} /></>; }
    createRoot(document.querySelector('#root')).render(<Harness/>);
  `);
  const toggle = page.getByLabel('Menü für Formel', { exact: true });
  await toggle.click();
  await page.locator('.ff-block-menu select').selectOption('text');
  await expect(page.locator('.ff-block-menu[open]')).toHaveCount(0);
  await toggle.click();
  await page.getByRole('button', { name: 'Außerhalb' }).focus();
  await expect(page.locator('.ff-block-menu[open]')).toHaveCount(0);
  await toggle.click();
  await page.keyboard.press('Escape');
  await expect(page.locator('.ff-block-menu[open]')).toHaveCount(0);
});

test('a long context menu remains operable when keyboard navigation scrolls its own contents',async({page})=>{
  await page.setViewportSize({width:390,height:400});await mount(page,menuHarness);
  await page.getByRole('button',{name:'Aktionen für Vollbildkarte',exact:true}).click();
  const menu=page.getByRole('menu');await expect(menu).toBeVisible();
  await page.keyboard.press('End');await expect(page.getByRole('menuitem',{name:'Aktion 23',exact:true})).toBeFocused();
  await page.keyboard.press('Enter');await expect(page.locator('output')).toHaveText('23');await expect(menu).toHaveCount(0);
});

test('context menu is inside the fullscreen top layer and receives actual pointer input',async({page})=>{
  await mount(page,menuHarness);await page.getByRole('button',{name:'Vollbild',exact:true}).click();
  await expect.poll(()=>page.evaluate(()=>document.fullscreenElement?.id)).toBe('stage');
  await page.getByRole('button',{name:'Vollbildziel',exact:true}).click({button:'right'});
  await expect(page.getByRole('menu')).toBeVisible();
  expect(await page.getByRole('menu').evaluate(el=>document.fullscreenElement!.contains(el))).toBe(true);
  await page.getByRole('menuitem',{name:'Aktion 1',exact:true}).click();await expect(page.locator('output')).toHaveText('1');
});

test('context menus in modal dialogs do not fall behind the native backdrop',async({page})=>{
  await mount(page,menuHarness);await page.getByRole('button',{name:'Dialog',exact:true}).click();
  await page.getByRole('button',{name:'Dialogziel',exact:true}).click({button:'right'});
  expect(await page.getByRole('menu').evaluate(el=>document.querySelector('dialog')!.contains(el))).toBe(true);
  await page.getByRole('menuitem',{name:'Aktion 2',exact:true}).click();await expect(page.locator('output')).toHaveText('2');
});

test('keyboard context action in a text field is not stolen by its map container',async({page})=>{
  await mount(page,menuHarness);await page.getByRole('button',{name:'Dialog',exact:true}).click();
  await page.getByRole('textbox',{name:'Notiz'}).fill('Eigener Text');await page.keyboard.press('Shift+F10');
  await expect(page.getByRole('menu')).toHaveCount(0);await expect(page.getByRole('textbox',{name:'Notiz'})).toBeFocused();
});

test('a task has one admission even when two activations arrive before React paints busy',async({page})=>{
  await mount(page,`
    import {createRoot} from 'react-dom/client';import {useTask} from './packages/client/src/hooks.ts';
    window.jobs=[];window.calls=0;
    function Probe(){const task=useTask();window.task=task;const run=()=>task.run(()=>{window.calls++;return new Promise(resolve=>window.jobs.push(resolve))});
      return <><button onClick={()=>{run();run()}}>Doppelaktivierung</button><output>{task.busy?'busy':'idle'}</output><p>{task.error}</p></>}
    createRoot(document.querySelector('#root')).render(<Probe/>);
  `);
  await page.getByRole('button',{name:'Doppelaktivierung'}).click();await expect(page.locator('output')).toHaveText('busy');
  expect(await page.evaluate(()=>(window as any).calls)).toBe(1);
  await page.evaluate(()=>(window as any).jobs.splice(0).forEach((resolve:()=>void)=>resolve()));await expect(page.locator('output')).toHaveText('idle');
  await page.getByRole('button',{name:'Doppelaktivierung'}).click();expect(await page.evaluate(()=>(window as any).calls)).toBe(2);
});
