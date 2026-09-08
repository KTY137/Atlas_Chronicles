// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2026 Kaya Yesilyurt - Atlas Chronicles. Siehe LICENSE.
import { test, expect } from "@playwright/test";
import { build } from "esbuild";

test("map actions use the same child target with right click, keyboard and touch",async ({ page },info) => {
  const compiled = await build({ stdin: { resolveDir: process.cwd(), loader: "tsx", contents: `
    import { createRoot } from 'react-dom/client';
    import { MapContextMenu } from './packages/client/src/features/MapContextMenu.tsx';
    import '@chronicle/ui/tokens.css';
    const action = value => { document.querySelector('#result').textContent = value; };
    createRoot(document.querySelector('#root')).render(<MapContextMenu label='Innenraum der Schmiede' actions={[
      { id: 'open', label: 'Unterkarte öffnen', onSelect: () => action('open:child') },
      { id: 'edit', label: 'Karte bearbeiten', onSelect: () => action('edit:child') },
      { id: 'delete', label: 'Karte löschen …', danger: true, onSelect: () => action('preview:child') }
    ]}><button id='house'>Schmiede · Innenraum vorhanden</button><input aria-label='Text bearbeiten' defaultValue='Eigene Notiz' /></MapContextMenu>);
  ` }, bundle: true, format: "iife", platform: "browser", target: "es2022", jsx: "automatic", write: false, outdir: ".local/map-menu-memory", logLevel: "silent", define: { "process.env.NODE_ENV": '"production"' } });
  await page.setContent('<main id="root"></main><output id="result"></output>');
  await page.addStyleTag({ content: compiled.outputFiles!.find(file => file.path.endsWith('.css'))!.text });
  await page.addScriptTag({ content: compiled.outputFiles!.find(file => file.path.endsWith('.js'))!.text });
  const house = page.locator('#house'), trigger = page.getByRole('button',{ name: 'Aktionen für Innenraum der Schmiede', exact: true });
  await house.click({ button: 'right' });
  const menu = page.getByRole('menu',{ name: 'Karte Innenraum der Schmiede', exact: true });
  await expect(menu).toBeVisible(); await expect(page.getByRole('menuitem',{ name: 'Unterkarte öffnen', exact: true })).toBeFocused();
  await page.keyboard.press('End'); await expect(page.getByRole('menuitem',{ name: 'Karte löschen …', exact: true })).toBeFocused();
  await page.keyboard.press('Enter'); await expect(page.locator('#result')).toHaveText('preview:child'); await expect(menu).toHaveCount(0);
  await house.focus(); await page.keyboard.press('Shift+F10'); await expect(menu).toBeVisible();
  await page.keyboard.press('ArrowUp'); await expect(page.getByRole('menuitem',{ name: 'Karte löschen …', exact: true })).toBeFocused();
  await page.keyboard.press('Escape'); await expect(menu).toHaveCount(0); await expect(house).toBeFocused();
  await page.setViewportSize({ width: 390, height: 844 });
  await trigger.click(); await expect(menu).toBeVisible();
  const bounds = (await menu.boundingBox())!; expect(bounds.x).toBeGreaterThanOrEqual(0); expect(bounds.x+bounds.width).toBeLessThanOrEqual(390);
  await page.screenshot({ path: info.outputPath('map-menu-mobile.png'), fullPage: true });
  await page.getByRole('menuitem',{ name: 'Karte bearbeiten', exact: true }).click(); await expect(page.locator('#result')).toHaveText('edit:child');
  await page.getByLabel('Text bearbeiten').click({ button: 'right' }); await expect(menu).toHaveCount(0);
});

test("canvas keyboard context remains open when focus scrolls back from lower editor controls",async ({ page }) => {
  const compiled=await build({stdin:{resolveDir:process.cwd(),loader:"tsx",contents:`
    import {useState} from 'react'; import {createRoot} from 'react-dom/client';
    import {MapContextMenu} from './packages/client/src/features/MapContextMenu.tsx';
    import {TacticalCanvas} from './packages/client/src/features/TacticalCanvas.tsx';
    import {AppearanceProvider} from './packages/client/src/features/Appearance.tsx';
    import '@chronicle/ui/tokens.css';
    const scene={id:'keyboard-menu',width:200,height:200,cells:[],pins:[]};
    function Check(){const [at,setAt]=useState(null);return <AppearanceProvider><div style={{display:'grid',gap:26}}><div style={{height:1200}}>Andere Werkzeuge</div>
      <TacticalCanvas scene={scene} tileBase='' selection={null} onContextMenu={(hit,at)=>setAt({...at,key:performance.now()})}/>
      <div style={{height:1200}}/><input aria-label='Untere Karteneinstellung'/>
      {at?<MapContextMenu key={at.key} label='Aktuelle Karte' popup={{...at,onDismiss:()=>setAt(null)}} actions={[{id:'delete',label:'Karte löschen …',onSelect:()=>{}}]}/>:null}</div></AppearanceProvider>}
    createRoot(document.querySelector('#root')).render(<Check/>);
  `},bundle:true,format:"iife",platform:"browser",target:"es2022",jsx:"automatic",write:false,outdir:".local/canvas-menu-memory",logLevel:"silent",define:{"process.env.NODE_ENV":'"production"'}});
  await page.setContent('<main id="root"></main>'); await page.addStyleTag({content:compiled.outputFiles!.find(f=>f.path.endsWith('.css'))!.text});
  await page.addScriptTag({content:compiled.outputFiles!.find(f=>f.path.endsWith('.js'))!.text});
  const canvas=page.locator('.tactical-canvas[data-canvas-ready="true"] canvas'); await expect(canvas).toBeVisible();
  await page.getByLabel('Untere Karteneinstellung').fill('14'); const height=await page.evaluate(()=>document.documentElement.scrollHeight);
  await canvas.focus(); await page.keyboard.press('Shift+F10');
  await expect(page.getByRole('menu',{name:'Karte Aktuelle Karte',exact:true})).toBeVisible();
  expect(await page.evaluate(()=>document.documentElement.scrollHeight)).toBe(height);
  await page.keyboard.press('Escape'); await expect(page.getByRole('menu')).toHaveCount(0); await expect(canvas).toBeFocused();
});
