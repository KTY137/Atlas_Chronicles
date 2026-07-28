// S-G1c — per-key export breakdown, the containment projection, and the door census.
import { chromium } from "playwright";
import { gzipSync } from "node:zlib";
import { writeFileSync } from "node:fs";

const BASE = "http://localhost:5199/Fantasy-Map-Generator/";
const browser = await chromium.launch({ channel: "chrome", args: ["--no-sandbox"] });
const ctx = await browser.newContext({ viewport: { width: 1280, height: 720 } });
const page = await ctx.newPage();
await page.goto(`${BASE}?seed=chronicle-1&width=1280&height=720`, { waitUntil: "domcontentloaded", timeout: 180000 });
await page.waitForFunction(() => window.mapId !== undefined, { timeout: 180000 });
await page.waitForTimeout(1500);

const d = await page.evaluate(() => {
  const p = window.pack;
  const alive = a => a.filter(e => e && !e.removed);
  const N = (typeof notes !== "undefined" && Array.isArray(notes)) ? notes : [];
  const len = o => JSON.stringify(o).length;
  const perKey = {};
  for (const k of ["features","cultures","burgs","states","provinces","religions","rivers","goods","markers","markets","deals","routes","zones","measurers"]) perKey[k] = len(p[k]);
  perKey["notes"] = len(N);
  perKey["nameBases"] = len(typeof nameBases !== "undefined" ? nameBases : []);
  perKey["biomesData"] = len(typeof biomesData !== "undefined" ? biomesData : null);

  // the containment projection Chronicle would actually keep
  const burgs = alive(p.burgs), states = alive(p.states), provs = alive(p.provinces);
  const node = (kind, id, name, parent, x, y, extra) => ({ kind, id, name, parent, x, y, ...extra });
  const nodes = [];
  for (const f of p.features) if (f && f.land) nodes.push(node("landmass", `f${f.i}`, f.name || null, null, null, null, { group: f.group, cells: f.cells }));
  for (const s of states) nodes.push(node("state", `s${s.i}`, s.fullName, null, s.pole ? s.pole[0] : null, s.pole ? s.pole[1] : null, { form: s.form, culture: s.culture, cells: s.cells }));
  for (const v of provs) nodes.push(node("province", `p${v.i}`, v.fullName, `s${p.burgs[v.burg] ? p.burgs[v.burg].state : 0}`, v.pole ? v.pole[0] : null, v.pole ? v.pole[1] : null, { capitalBurg: v.burg }));
  for (const b of burgs) nodes.push(node("burg", `b${b.i}`, b.name, b.province ? `p${b.province}` : `s${b.state}`, b.x, b.y, { type: b.type, pop: b.population, capital: b.capital, port: b.port, culture: b.culture }));

  // "doors": every named thing with no article
  const namedThings = {
    burgs: burgs.length,
    states: states.length,
    provinces: provs.length,
    cultures: alive(p.cultures).length,
    religions: alive(p.religions).length,
    namedRivers: p.rivers.filter(r => r.name).length,
    namedFeatures: p.features.filter(f => f && f.name).length,
    markers: p.markers.length,
    regiments: states.reduce((n, s) => n + (s.military ? s.military.length : 0), 0),
    markets: (p.markets || []).length,
    goods: (p.goods || []).length
  };
  // markers carry prose: measure it
  const markerNotes = N.filter(n => String(n.id).startsWith("marker"));
  const regimentNotes = N.filter(n => String(n.id).startsWith("regiment"));
  return {
    perKey,
    nodesCount: nodes.length,
    nodesJson: JSON.stringify(nodes).length,
    byKind: nodes.reduce((a, n) => (a[n.kind] = (a[n.kind] || 0) + 1, a), {}),
    namedThings,
    noteBreakdown: {
      total: N.length, markerNotes: markerNotes.length, regimentNotes: regimentNotes.length,
      markerLegendChars: markerNotes.reduce((s, n) => s + (n.legend || "").length, 0),
      sampleMarkerNote: markerNotes.slice(0, 3).map(n => ({ id: n.id, name: n.name, legend: (n.legend || "").slice(0, 220) }))
    },
    burgTypeHistogram: burgs.reduce((a, b) => (a[b.type] = (a[b.type] || 0) + 1, a), {}),
    markerTypeHistogram: p.markers.reduce((a, m) => (a[m.type] = (a[m.type] || 0) + 1, a), {}),
    orphanProvinceParents: provs.filter(v => !v.burg).length,
    burgsWithoutProvince: burgs.filter(b => !b.province).length,
    burgsInNeutral: burgs.filter(b => !b.state).length,
    nodesBlob: JSON.stringify(nodes)
  };
});
await browser.close();

d.nodesGz = gzipSync(Buffer.from(d.nodesBlob)).length;
delete d.nodesBlob;
writeFileSync("keim3-report.json", JSON.stringify(d, null, 2));
console.log(JSON.stringify(d, null, 2));
