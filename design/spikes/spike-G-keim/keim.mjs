// S-G1 · Der Keim — measure a real FMG run, headless, twice per seed.
import { chromium } from "playwright";
import { createHash } from "node:crypto";
import { writeFileSync } from "node:fs";

const BASE = "http://localhost:5199/Fantasy-Map-Generator/";

function sha(o) {
  return createHash("sha256").update(JSON.stringify(o)).digest("hex").slice(0, 16);
}

async function run(browser, seed, label) {
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 720 } });
  const page = await ctx.newPage();
  const t0 = Date.now();
  await page.goto(`${BASE}?seed=${seed}&width=1280&height=720`, { waitUntil: "domcontentloaded", timeout: 180000 });
  await page.waitForFunction(() => window.mapId !== undefined, { timeout: 120000 });
  const tReady = Date.now() - t0;
  await page.waitForTimeout(1500);

  const data = await page.evaluate(() => {
    const p = window.pack;
    const alive = a => a.filter(e => e && !e.removed);
    const burgs = alive(p.burgs);
    return {
      seed: window.seed,
      mapId: window.mapId,
      version: window.version || null,
      cellsPack: p.cells.i.length,
      cellsGrid: window.grid.cells.i.length,
      counts: {
        burgs: burgs.length,
        burgsRaw: p.burgs.length,
        states: alive(p.states).length,
        provinces: alive(p.provinces).length,
        cultures: alive(p.cultures).length,
        religions: alive(p.religions).length,
        rivers: p.rivers.length,
        routes: p.routes.length,
        markers: p.markers.length,
        zones: p.zones.length,
        features: p.features.length,
        markets: (p.markets || []).length,
        goods: (p.goods || []).length,
        deals: (p.deals || []).length,
        notes: (typeof notes !== "undefined" && Array.isArray(notes) ? notes : []).length,
        military: p.states.reduce((n, s) => n + ((s && s.military) ? s.military.length : 0), 0)
      },
      // full identity fingerprints
      burgSig: burgs.map(b => [b.i, b.name, b.x, b.y, b.cell, b.state, b.province ?? null, b.culture, b.population, b.type, b.capital, b.port]),
      stateSig: alive(p.states).map(s => [s.i, s.name, s.fullName, s.form, s.center, s.culture, s.cells, s.burgs, s.area]),
      provSig: alive(p.provinces).map(v => [v.i, v.name, v.center, v.burg]),
      cultSig: alive(p.cultures).map(c => [c.i, c.name, c.base, c.center, c.type]),
      relSig: alive(p.religions).map(r => [r.i, r.name, r.type, r.form, r.deity ?? null, r.center]),
      riverSig: p.rivers.map(r => [r.i, r.name, r.source, r.mouth, r.parent, r.basin, r.discharge, r.length]),
      routeSig: p.routes.map(r => [r.i, r.group, r.points.length, r.length ?? null]),
      markerSig: p.markers.map(m => [m.i, m.type, m.icon, m.x, m.y, m.cell]),
      heightSig: Array.from(p.cells.h),
      biomeSig: Array.from(p.cells.biome),
      stateCellSig: Array.from(p.cells.state),
      // sample of the door surface
      sampleBurgs: burgs.slice(1, 9).map(b => ({ i: b.i, name: b.name, pop: b.population, type: b.type, state: b.state, province: b.province, capital: b.capital, port: b.port, mfcgSeedField: b.MFCG ?? null, hasCoa: !!b.coa })),
      // named-thing census: every distinct human-readable name the generator emits
      names: {
        burgs: burgs.map(b => b.name),
        states: alive(p.states).map(s => s.fullName || s.name),
        provinces: alive(p.provinces).map(v => v.fullName || v.name),
        cultures: alive(p.cultures).map(c => c.name),
        religions: alive(p.religions).map(r => r.name),
        rivers: p.rivers.map(r => r.name).filter(Boolean),
        routes: p.routes.map(r => r.name).filter(Boolean),
        features: p.features.filter(f => f && f.name).map(f => f.name),
        markers: p.markers.map(m => m.type)
      },
      noteSample: (typeof notes !== "undefined" && Array.isArray(notes) ? notes : []).slice(0, 4).map(n => ({ id: n.id, name: n.name, legendLen: (n.legend || "").length }))
    };
  });
  data.tReadyMs = tReady;
  data.label = label;
  await ctx.close();
  return data;
}

const browser = await chromium.launch({ channel: "chrome", args: ["--no-sandbox"] });
const out = {};
for (const [seed, labels] of [["chronicle-1", ["A1", "A2"]], ["chronicle-2", ["B1"]]]) {
  for (const l of labels) out[l] = await run(browser, seed, l);
}
await browser.close();

const digest = d => ({
  burg: sha(d.burgSig), state: sha(d.stateSig), prov: sha(d.provSig), cult: sha(d.cultSig),
  rel: sha(d.relSig), river: sha(d.riverSig), route: sha(d.routeSig), marker: sha(d.markerSig),
  height: sha(d.heightSig), biome: sha(d.biomeSig), stateCell: sha(d.stateCellSig)
});

const report = {
  A1: { seed: out.A1.seed, mapId: out.A1.mapId, ms: out.A1.tReadyMs, cellsPack: out.A1.cellsPack, cellsGrid: out.A1.cellsGrid, counts: out.A1.counts, digest: digest(out.A1) },
  A2: { seed: out.A2.seed, mapId: out.A2.mapId, ms: out.A2.tReadyMs, cellsPack: out.A2.cellsPack, counts: out.A2.counts, digest: digest(out.A2) },
  B1: { seed: out.B1.seed, mapId: out.B1.mapId, ms: out.B1.tReadyMs, counts: out.B1.counts, digest: digest(out.B1) },
  sampleBurgs: out.A1.sampleBurgs,
  noteSample: out.A1.noteSample,
  nameCounts: Object.fromEntries(Object.entries(out.A1.names).map(([k, v]) => [k, v.length])),
  distinctNames: (() => {
    const all = [].concat(...Object.values(out.A1.names));
    return { total: all.length, distinct: new Set(all).size };
  })()
};
report.deterministic_same_seed = JSON.stringify(report.A1.digest) === JSON.stringify(report.A2.digest);
report.differs_other_seed = JSON.stringify(report.A1.digest) !== JSON.stringify(report.B1.digest);
report.mapId_stable = report.A1.mapId === report.A2.mapId;

writeFileSync("keim-report.json", JSON.stringify(report, null, 2));
writeFileSync("keim-full.json", JSON.stringify(out));
console.log(JSON.stringify(report, null, 2));
