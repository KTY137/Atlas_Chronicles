import { chromium } from "playwright";
import { writeFileSync } from "node:fs";
const B="http://localhost:5199/Fantasy-Map-Generator/";
const br=await chromium.launch({channel:"chrome",args:["--no-sandbox"]});
const pg=await (await br.newContext({viewport:{width:1280,height:720}})).newPage();
await pg.goto(`${B}?seed=chronicle-1&width=1280&height=720`,{waitUntil:"domcontentloaded",timeout:180000});
await pg.waitForFunction(()=>window.mapId!==undefined,{timeout:180000});
await pg.waitForTimeout(1500);
const r=await pg.evaluate(()=>{
  const p=window.pack,c=p.cells,alive=a=>a.filter(e=>e&&!e.removed);
  const burgs=alive(p.burgs),states=alive(p.states),provs=alive(p.provinces);
  const stat=arr=>{const s=arr.slice().sort((a,b)=>a-b);const q=f=>s[Math.min(s.length-1,Math.floor(f*s.length))];
    return {n:s.length,min:s[0],p50:q(.5),p90:q(.9),max:s[s.length-1],mean:+(s.reduce((a,b)=>a+b,0)/s.length).toFixed(2)};};
  // provinces per state (via province capital burg's state, and via cells)
  const provByState={};for(const v of provs){const st=c.state[v.center];(provByState[st] ||= []).push(v.i);}
  // burgs per province
  const burgByProv={};for(const b of burgs){const pv=c.province[b.cell];(burgByProv[pv] ||= []).push(b.i);}
  // burgs per state
  const burgByState={};for(const b of burgs){(burgByState[b.state] ||= []).push(b.i);}
  // markers per province
  const mkByProv={};for(const m of p.markers){const pv=c.province[m.cell];(mkByProv[pv] ||= []).push(m.i);}
  // top-level fan-out
  const landmasses=p.features.filter(f=>f&&f.land).length;
  const names=[].concat(burgs.map(b=>b.name),states.map(s=>s.fullName),provs.map(v=>v.fullName),
    alive(p.cultures).map(x=>x.name),alive(p.religions).map(x=>x.name),
    p.rivers.map(x=>x.name).filter(Boolean),p.markers.map(m=>m.type),
    states.flatMap(s=>(s.military||[]).map(m=>m.name)));
  const dup={};for(const n of names)dup[n]=(dup[n]||0)+1;
  return {
    landmasses, states:states.length, provinces:provs.length, burgs:burgs.length,
    rootFanout: landmasses+states.length,
    provincesPerState: stat(Object.values(provByState).map(a=>a.length)),
    burgsPerProvince: stat(Object.values(burgByProv).map(a=>a.length)),
    burgsPerState: stat(Object.values(burgByState).map(a=>a.length)),
    markersPerProvince: stat(Object.values(mkByProv).map(a=>a.length)),
    statesWithNoProvinceRow: states.length-Object.keys(provByState).length,
    provincesWithNoBurg: provs.length-Object.keys(burgByProv).length,
    namesTotal: names.length, namesDistinct: Object.keys(dup).length,
    worstCollisions: Object.entries(dup).filter(([,v])=>v>1).sort((a,b)=>b[1]-a[1]).slice(0,8)
  };
});
await br.close();
writeFileSync("keim5-report.json",JSON.stringify(r,null,2));
console.log(JSON.stringify(r,null,2));
