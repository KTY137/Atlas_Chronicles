// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2026 Kaya Yesilyurt - Atlas Chronicles. Siehe LICENSE.
import { test, expect, type Page } from '@playwright/test';
import { reviewApp } from './helpers/review-app';
import { randomSource, chooseNative } from './helpers/seeded-gui';

const seeds = process.env.GUI_MONKEY_SEEDS?.split(',').map(Number) ?? [137, 7007, 20260911, 0xc0ffee];
const areas = ['Heute','Ich','Tisch','Chronik','Atlas','Woche','Kanal','Schmiede','Runde'];
async function navigate(page:Page, name:string){
  const mobile=page.getByRole('button',{name:'Bereiche öffnen',exact:true});
  if(await mobile.isVisible()) await mobile.click();
  const target=page.getByRole('navigation',{name:'Bereiche',exact:true}).getByRole('button',{name,exact:true});
  await target.click();await expect(target).toHaveAttribute('aria-current','page');
}

// No production/world credentials, no remote calls and no unrestricted destructive button pool.
// Every seed gets its own real application+database. Trace records even no-op choices for replay.
for (const seed of seeds) test(`bounded full-application monkey seed=${seed}`,async({browser}, info)=>{
  test.setTimeout(360_000);
  const host=await reviewApp(12500 + seeds.indexOf(seed));
  const context=await browser.newContext({locale:'de-DE',viewport:{width:seed%2?1440:390,height:960}});
  const random=randomSource(seed), trace:unknown[]=[], errors:string[]=[], controls=new Set<string>(), visited=new Set<string>();
  let nativeChanges=0;
  try {
    await context.addCookies([{name:'chronicle_session',value:host.gm.value,url:host.origin,httpOnly:true,sameSite:'Strict'}]);
    const page=await context.newPage();page.on('pageerror',error=>errors.push(error.message));
    page.on('response',response=>{if(response.url().startsWith(host.origin+'/api/') && response.status()>=500) errors.push(`HTTP ${response.status()} ${new URL(response.url()).pathname}`)});
    page.on('dialog',dialog=>dialog.accept());
    await page.goto(`${host.origin}/?campaign=${host.campaign.id}&stage=heute`);
    await expect(page.locator('.application')).toBeVisible();
    for(let step=0;step<140;++step){
      const command=step<areas.length?0:random(9);
      let detail:unknown;
      if(command===0){
        const area=step<areas.length?areas[step]!:areas[random(areas.length)]!;
        trace.push({step,command:'area',area});await navigate(page,area);visited.add(area);
        if(area==='Atlas' && await page.getByRole('button',{name:'Neue Karte',exact:true}).isVisible()){
          await page.getByRole('button',{name:'Neue Karte',exact:true}).click();
          await expect(page.getByRole('region',{name:'Kartenwerkstatt',exact:true})).toBeVisible();
        }
      } else if(command===1 || command===2) {
        const options=page.locator('main select:visible:enabled');const count=await options.count();
        if(count){
          const select=options.nth(random(count));
          const descriptor=await select.evaluate((el:HTMLSelectElement)=>({name:el.getAttribute('aria-label')||el.labels?.[0]?.textContent||el.name,
            values:Array.from(el.options).filter(o=>!o.disabled&&!(o.parentElement instanceof HTMLOptGroupElement&&o.parentElement.disabled)).map(o=>o.value)}));
          if(descriptor.values.length){
            const value=descriptor.values[random(descriptor.values.length)]!;
            trace.push({step,command:'select',...descriptor,value});controls.add(descriptor.name??'unnamed');
            await chooseNative(select,value);++nativeChanges;
          }else trace.push({step,command:'select-empty',...descriptor});
        }else trace.push({step,command:'no-select'});
      } else if(command===3){
        const tabs=page.locator('main [role=tab]:visible:not([disabled]), main nav[aria-label="Werkstätten"] button:visible:not([disabled])');
        const count=await tabs.count();
        if(count){const target=tabs.nth(random(count));detail=await target.innerText();trace.push({step,command:'tab',detail});await target.click();}
        else trace.push({step,command:'no-tab'});
      } else if(command===4){
        const summaries=page.locator('main details > summary:visible');const count=await summaries.count();
        if(count){const target=summaries.nth(random(count));detail=await target.innerText();trace.push({step,command:'disclosure',detail});await target.click();}
        else trace.push({step,command:'no-disclosure'});
      } else if(command===5){
        const toggles=page.locator('main .map-kind-cards button:visible,main .map-location-cards button:visible,main .map-style-options button:visible,main .map-size-presets button:visible,main .map-era-options button:visible');
        const count=await toggles.count();
        if(count){const target=toggles.nth(random(count));detail=await target.innerText();trace.push({step,command:'map-preset',detail});await target.click();await expect(target).toHaveAttribute('aria-pressed','true');}
        else trace.push({step,command:'no-map-preset'});
      } else if(command===6){
        const fields=page.locator('main input[type=text]:visible:enabled:not([readonly]), main input[type=search]:visible:enabled, main textarea:visible:enabled:not([readonly])');
        const count=await fields.count();
        if(count){const field=fields.nth(random(count));const value=['','Räume ÄÖÜ ß','<b>nur Text</b>','Fuzz-'+seed+'-'+step][random(4)]!;
          trace.push({step,command:'text',value,field:await field.getAttribute('aria-label')});await field.fill(value);await expect(field).toHaveValue(value);
          // Shift+F10 must leave native text editing alone, including inside map widgets.
          await field.press('Shift+F10');await expect(page.getByRole('menu')).toHaveCount(0);await page.keyboard.press('Escape');
        }else trace.push({step,command:'no-text'});
      } else if(command===7){
        const width=[390,800,1440][random(3)]!;trace.push({step,command:'resize',width});await page.setViewportSize({width,height:844});
        await page.keyboard.press('Escape');
      } else {
        trace.push({step,command:'keyboard',key:'Tab / Shift+Tab / Escape'});
        await page.keyboard.press('Tab');await page.keyboard.press('Shift+Tab');await page.keyboard.press('Escape');
      }
      expect(errors,`seed ${seed}, prefix ${step+1}`).toEqual([]);
      await expect(page.locator('.application')).toBeVisible();
    }
    // A mandatory drop-down sweep prevents a lucky random seed from exercising only navigation.
    await navigate(page,'Atlas');
    if(!await page.getByRole('region',{name:'Kartenwerkstatt',exact:true}).isVisible()) await page.getByRole('button',{name:'Neue Karte',exact:true}).click();
    const studio=page.getByRole('region',{name:'Kartenwerkstatt',exact:true});
    for(const value of ['anlage:burg','anlage:schloss','siedlung:dorf','siedlung:stadt']){
      trace.push({command:'mandatory-native-sweep',value});await chooseNative(studio.getByRole('combobox',{name:'Art des Ortes',exact:true}),value);++nativeChanges;
    }
    await expect(studio.getByRole('combobox',{name:'Art des Ortes',exact:true})).toHaveValue('siedlung:stadt');
    expect(visited.size).toBe(areas.length);expect(nativeChanges).toBeGreaterThanOrEqual(4);expect(errors).toEqual([]);
    await page.screenshot({path:info.outputPath('monkey-final.png'),fullPage:true});
  } finally {
    await info.attach('monkey-replay',{body:JSON.stringify({seed,commands:trace.length,nativeChanges,visited:[...visited],controls:[...controls],trace,errors},null,2),contentType:'application/json'});
    await context.close();await host.close();
  }
});
