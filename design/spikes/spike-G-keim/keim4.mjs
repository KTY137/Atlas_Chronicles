import { chromium } from "playwright";
import { writeFileSync } from "node:fs";
const B="http://localhost:5199/Fantasy-Map-Generator/";
const br=await chromium.launch({channel:"chrome",args:["--no-sandbox"]});
const pg=await (await br.newContext({viewport:{width:1280,height:720}})).newPage();
await pg.goto(`${B}?seed=chronicle-1&width=1280&height=720`,{waitUntil:"domcontentloaded",timeout:180000});
await pg.waitForFunction(()=>window.mapId!==undefined,{timeout:180000});
await pg.waitForTimeout(1500);
const r=await pg.evaluate(()=>{
  const p=window.pack, c=p.cells, alive=a=>a.filter(e=>e&&!e.removed);
  const burgs=alive(p.burgs);
  const viaCell=burgs.map(b=>({i:b.i,name:b.name,stateField:b.state,stateCell:c.state[b.cell],provCell:c.province[b.cell],cultCell:c.culture[b.cell],relCell:c.religion[b.cell],biome:c.biome[b.cell],feature:c.f[b.cell]}));
  const noProv=viaCell.filter(v=>!v.provCell).length;
  const stateMismatch=viaCell.filter(v=>v.stateField!==v.stateCell).length;
  // DAG evidence: routes touching >1 state / >1 province
  const routeStates=p.routes.map(rt=>{const s=new Set(),pr=new Set();for(const pt of rt.points){const cell=pt[2];if(cell!=null&&c.state[cell]!==undefined){s.add(c.state[cell]);pr.add(c.province[cell]);}}return [s.size,pr.size];});
  const routesMultiState=routeStates.filter(x=>x[0]>1).length;
  const routesMultiProv=routeStates.filter(x=>x[1]>1).length;
  const riverStates=p.rivers.map(rv=>{const s=new Set();for(const cell of (rv.cells||[]))if(cell>=0)s.add(c.state[cell]);return s.size;});
  const riversMultiState=riverStates.filter(n=>n>1).length;
  // religions vs states: cross-cutting containment
  const cellsWithState=c.i.filter(i=>c.state[i]).length;
  const relPerState={};for(const i of c.i){if(!c.state[i])continue;(relPerState[c.state[i]] ||= new Set()).add(c.religion[i]);}
  const statesMultiReligion=Object.values(relPerState).filter(s=>s.size>1).length;
  const cultPerState={};for(const i of c.i){if(!c.state[i])continue;(cultPerState[c.state[i]] ||= new Set()).add(c.culture[i]);}
  const statesMultiCulture=Object.values(cultPerState).filter(s=>s.size>1).length;
  // features: does a state span >1 landmass?
  const featPerState={};for(const i of c.i){if(!c.state[i]||c.h[i]<20)continue;(featPerState[c.state[i]] ||= new Set()).add(c.f[i]);}
  const statesMultiLandmass=Object.values(featPerState).filter(s=>s.size>1).length;
  return {burgs:burgs.length,burgsWithNoProvinceViaCell:noProv,stateFieldVsCellMismatch:stateMismatch,
    routes:p.routes.length,routesMultiState,routesMultiProv,rivers:p.rivers.length,riversMultiState,
    states:alive(p.states).length,statesMultiReligion,statesMultiCulture,statesMultiLandmass,
    sample:viaCell.slice(0,5)};
});
await br.close();
writeFileSync("keim4-report.json",JSON.stringify(r,null,2));
console.log(JSON.stringify(r,null,2));
