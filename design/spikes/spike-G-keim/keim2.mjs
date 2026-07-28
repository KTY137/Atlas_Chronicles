// S-G1b — payload sizes (seed vs megabytes) and id stability under a parameter change.
import { chromium } from "playwright";
import { createHash } from "node:crypto";
import { gzipSync } from "node:zlib";
import { writeFileSync } from "node:fs";

const BASE = "http://localhost:5199/Fantasy-Map-Generator/";
const sha = o => createHash("sha256").update(JSON.stringify(o)).digest("hex").slice(0, 16);

async function run(browser, url) {
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 720 } });
  const page = await ctx.newPage();
  await page.goto(url, { waitUntil: "domcontentloaded", timeout: 180000 });
  await page.waitForFunction(() => window.mapId !== undefined, { timeout: 180000 });
  await page.waitForTimeout(1500);
  const d = await page.evaluate(() => {
    const p = window.pack;
    const alive = a => a.filter(e => e && !e.removed);
    const N = (typeof notes !== "undefined" && Array.isArray(notes)) ? notes : [];
    const minimalPack = {
      features: p.features, cultures: p.cultures, burgs: p.burgs, states: p.states,
      provinces: p.provinces, religions: p.religions, rivers: p.rivers, goods: p.goods,
      markers: p.markers, markets: p.markets, deals: p.deals, routes: p.routes,
      zones: p.zones, measurers: p.measurers
    };
    const packCells = {
      v: p.cells.v, c: p.cells.c, p: p.cells.p,
      g: Array.from(p.cells.g), h: Array.from(p.cells.h), area: Array.from(p.cells.area),
      f: Array.from(p.cells.f), t: Array.from(p.cells.t), haven: Array.from(p.cells.haven),
      harbor: Array.from(p.cells.harbor), fl: Array.from(p.cells.fl), r: Array.from(p.cells.r),
      conf: Array.from(p.cells.conf), biome: Array.from(p.cells.biome), s: Array.from(p.cells.s),
      pop: Array.from(p.cells.pop), culture: Array.from(p.cells.culture), burg: Array.from(p.cells.burg),
      routes: p.cells.routes, state: Array.from(p.cells.state), religion: Array.from(p.cells.religion),
      province: Array.from(p.cells.province)
    };
    const strip = o => JSON.stringify(o).length;
    return {
      seed: window.seed,
      cells: p.cells.i.length,
      sizes: {
        minimalJson: strip({ pack: minimalPack, biomesData: (typeof biomesData!=="undefined"?biomesData:null), notes: N, nameBases: (typeof nameBases!=="undefined"?nameBases:[]) }),
        packCellsJson: strip(packCells),
        burgsOnly: strip(alive(p.burgs)),
        statesOnly: strip(alive(p.states)),
        provincesOnly: strip(alive(p.provinces)),
        riversOnly: strip(p.rivers),
        routesOnly: strip(p.routes),
        dealsOnly: strip(p.deals),
        notesOnly: strip(N),
        nameBases: strip((typeof nameBases!=="undefined"?nameBases:[])),
        coaTotal: strip(alive(p.burgs).map(b => b.coa)) + strip(alive(p.states).map(s => s.coa))
      },
      counts: {
        burgs: alive(p.burgs).length, states: alive(p.states).length, provinces: alive(p.provinces).length,
        cultures: alive(p.cultures).length, religions: alive(p.religions).length, rivers: p.rivers.length,
        routes: p.routes.length, markers: p.markers.length, notes: N.length, deals: p.deals.length
      },
      // identity across a parameter change: names are the only thing that could survive
      burgNames: alive(p.burgs).map(b => b.name),
      burgKeyed: alive(p.burgs).map(b => [b.i, b.name]),
      stateNames: alive(p.states).map(s => s.fullName),
      minimalBlob: JSON.stringify({ pack: minimalPack, biomesData: (typeof biomesData!=="undefined"?biomesData:null), notes: N, nameBases: (typeof nameBases!=="undefined"?nameBases:[]) })
    };
  });
  await ctx.close();
  return d;
}

const browser = await chromium.launch({ channel: "chrome", args: ["--no-sandbox"] });
const base = await run(browser, `${BASE}?seed=chronicle-1&width=1280&height=720`);
const wider = await run(browser, `${BASE}?seed=chronicle-1&width=1600&height=900`);
await browser.close();

const gz = s => gzipSync(Buffer.from(s)).length;
const overlapById = (a, b) => {
  const m = new Map(b.map(([i, n]) => [i, n]));
  let same = 0;
  for (const [i, n] of a) if (m.get(i) === n) same++;
  return same;
};
const nameOverlap = (a, b) => {
  const s = new Set(b);
  return a.filter(n => s.has(n)).length;
};

const report = {
  base: { seed: base.seed, cells: base.cells, counts: base.counts, sizes: base.sizes,
          minimalGz: gz(base.minimalBlob), minimalRaw: base.minimalBlob.length },
  wider: { seed: wider.seed, cells: wider.cells, counts: wider.counts,
           minimalGz: gz(wider.minimalBlob), minimalRaw: wider.minimalBlob.length },
  idStabilityUnderCanvasChange: {
    baseBurgs: base.burgKeyed.length,
    widerBurgs: wider.burgKeyed.length,
    sameIdSameName: overlapById(base.burgKeyed, wider.burgKeyed),
    nameSurvivorsAnyId: nameOverlap(base.burgNames, wider.burgNames),
    stateNameSurvivors: nameOverlap(base.stateNames, wider.stateNames),
    baseStates: base.stateNames.length, widerStates: wider.stateNames.length
  },
  seedBytes: "chronicle-1".length
};
writeFileSync("keim2-report.json", JSON.stringify(report, null, 2));
console.log(JSON.stringify(report, null, 2));
