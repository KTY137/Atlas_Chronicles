// Hephaistos — Messung der Vektor-Weltschicht.
// Fragen: (1) Regionen-Trefferprüfung, (2) Nebel als Vektormaske statt Bitmap.
import pcm from 'polygon-clipping';
const pc = pcm.default ?? pcm;
import RBush from 'rbush';
import { performance } from 'node:perf_hooks';

const W = 8192;
let s = 0x51f3a7; const rnd = () => (s = (s * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff;
const t = (f) => { const a = performance.now(); const v = f(); return [performance.now() - a, v]; };

// A region: an irregular blob, n vertices, like a hand-traced country border.
function blob(cx, cy, rad, n) {
  const p = [];
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2;
    const rr = rad * (0.6 + rnd() * 0.8);
    p.push([cx + Math.cos(a) * rr, cy + Math.sin(a) * rr]);
  }
  p.push(p[0]);
  return [p];
}

function bbox(poly) {
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (const [x, y] of poly[0]) { if (x < x0) x0 = x; if (y < y0) y0 = y; if (x > x1) x1 = x; if (y > y1) y1 = y; }
  return { minX: x0, minY: y0, maxX: x1, maxY: y1 };
}
function inside(poly, px, py) {
  const r = poly[0]; let c = false;
  for (let i = 0, j = r.length - 1; i < r.length; j = i++) {
    const [xi, yi] = r[i], [xj, yj] = r[j];
    if ((yi > py) !== (yj > py) && px < ((xj - xi) * (py - yi)) / (yj - yi) + xi) c = !c;
  }
  return c;
}

console.log('== Trefferprüfung: Regionen ==');
for (const [count, verts] of [[100, 40], [500, 60], [2000, 80]]) {
  const regs = [];
  for (let i = 0; i < count; i++) regs.push(blob(rnd() * W, rnd() * W, 150 + rnd() * 500, verts));
  const tree = new RBush();
  const [tb] = t(() => tree.load(regs.map((p, i) => ({ ...bbox(p), i }))));
  let hits = 0;
  const [tq] = t(() => {
    for (let k = 0; k < 10000; k++) {
      const px = rnd() * W, py = rnd() * W;
      for (const c of tree.search({ minX: px, minY: py, maxX: px, maxY: py })) {
        if (inside(regs[c.i], px, py)) { hits++; break; }
      }
    }
  });
  const totalVerts = count * verts;
  console.log(`${count} Regionen x ${verts} Punkte (${totalVerts} Vertices): Index ${tb.toFixed(1)} ms, ` +
              `10k Treffer-Abfragen ${tq.toFixed(1)} ms = ${(tq / 10000 * 1000).toFixed(2)} us/Abfrage, ${hits} Treffer`);
}

console.log('\n== Nebel als Vektormaske (pro Figur) ==');
const welt = [[[0, 0], [W, 0], [W, W], [0, W], [0, 0]]];
for (const n of [20, 50, 200, 800]) {
  const revealed = [];
  for (let i = 0; i < n; i++) revealed.push(blob(rnd() * W, rnd() * W, 120 + rnd() * 260, 24));
  const [tu, uni] = t(() => pc.union(revealed[0], ...revealed.slice(1)));
  const [td, fog] = t(() => pc.difference(welt, uni));
  const vcount = (mp) => mp.reduce((a, poly) => a + poly.reduce((b, ring) => b + ring.length, 0), 0);
  const bytes = JSON.stringify(fog).length;
  console.log(`${n} Enthuellungen -> union ${tu.toFixed(1)} ms (${vcount(uni)} Vertices), ` +
              `difference ${td.toFixed(1)} ms -> Nebel ${vcount(fog)} Vertices, ${(bytes / 1024).toFixed(0)} KB JSON`);
}

console.log('\n== Vergleich: Nebel als Bitmaske ==');
for (const cell of [16, 32, 64]) {
  const c = Math.ceil(W / cell);
  console.log(`Raster ${cell}px/Zelle: ${c}x${c} = ${(c * c).toLocaleString()} Zellen, ` +
              `${(c * c / 8 / 1024).toFixed(0)} KB als 1-Bit-Maske, pro Figur`);
}

console.log('\n== Inkrementell: eine neue Enthuellung auf bestehenden Nebel ==');
const base = [];
for (let i = 0; i < 200; i++) base.push(blob(rnd() * W, rnd() * W, 120 + rnd() * 260, 24));
const uni0 = pc.union(base[0], ...base.slice(1));
const fog0 = pc.difference(welt, uni0);
const neu = blob(rnd() * W, rnd() * W, 200, 24);
const [ti] = t(() => pc.difference(fog0, neu));
console.log(`inkrementelle difference gegen bestehende Nebelmaske: ${ti.toFixed(2)} ms`);
