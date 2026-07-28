// Hephaistos — Messung der Szenendaten. Kein Framework, keine Abhängigkeit.
// Frage: Ist "eine Stempelszene ist nur eine Liste" wirklich billig?
import zlib from 'node:zlib';
import { performance } from 'node:perf_hooks';

const WORLD = 8192;            // the stakeholder's real map, in px
const ASSETS = 900;            // distinct stamp assets in a theme pack
const rnd = (() => { let s = 0x2f6e2b1; return () => (s = (s * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff; })();

function makeScene(n, withEntity) {
  const a = new Array(n);
  for (let i = 0; i < n; i++) {
    const o = {
      id: 's' + i.toString(36),
      a: 'pk.wald/baum_' + ((rnd() * ASSETS) | 0).toString(36),   // asset ref
      x: +(rnd() * WORLD).toFixed(1),
      y: +(rnd() * WORLD).toFixed(1),
      s: +(0.4 + rnd() * 2.2).toFixed(3),                          // scale
      r: +(rnd() * 6.283).toFixed(3),                              // rotation
      l: (rnd() * 6) | 0,                                          // layer
      t: rnd() < 0.25 ? ((rnd() * 0xffffff) | 0) : 0,              // tint
      f: rnd() < 0.1 ? 1 : 0,                                      // flags (flip etc.)
    };
    // 1 in 12 stamps is an *entity*: it carries a wiki reference. This is the thesis.
    if (withEntity && i % 12 === 0) {
      o.e = { k: 'ort', ref: 'eron:artikel/' + (i % 74) + '#p' + ((rnd() * 40) | 0) };
    }
    a[i] = o;
  }
  return { v: 3, w: WORLD, h: WORLD, stamps: a };
}

function soa(n, scene) {
  // struct-of-arrays: what the renderer actually wants to upload
  const x = new Float32Array(n), y = new Float32Array(n), s = new Float32Array(n),
        r = new Float32Array(n), tex = new Uint16Array(n), lay = new Uint8Array(n),
        tint = new Uint32Array(n), flg = new Uint8Array(n);
  const st = scene.stamps;
  for (let i = 0; i < n; i++) {
    const o = st[i];
    x[i] = o.x; y[i] = o.y; s[i] = o.s; r[i] = o.r;
    tex[i] = i % ASSETS; lay[i] = o.l; tint[i] = o.t; flg[i] = o.f;
  }
  return x.byteLength + y.byteLength + s.byteLength + r.byteLength +
         tex.byteLength + lay.byteLength + tint.byteLength + flg.byteLength;
}

function grid(scene, cell) {
  const cols = Math.ceil(WORLD / cell);
  const buckets = new Map();
  for (const o of scene.stamps) {
    const k = ((o.y / cell) | 0) * cols + ((o.x / cell) | 0);
    let b = buckets.get(k); if (!b) buckets.set(k, b = []);
    b.push(o);
  }
  return { buckets, cols, cell };
}
function query(g, vx, vy, vw, vh) {
  const out = [];
  const c0 = (vx / g.cell) | 0, c1 = ((vx + vw) / g.cell) | 0;
  const r0 = (vy / g.cell) | 0, r1 = ((vy + vh) / g.cell) | 0;
  for (let r = r0; r <= r1; r++) for (let c = c0; c <= c1; c++) {
    const b = g.buckets.get(r * g.cols + c); if (b) for (const o of b) out.push(o);
  }
  return out;
}

const t = (f) => { const a = performance.now(); const v = f(); return [performance.now() - a, v]; };

console.log('n\tJSON MB\tgzip MB\tparse ms\tSoA MB\tSoA build ms\tindex ms\tcull ms\tvisible');
for (const n of [1000, 5000, 20000, 50000, 200000]) {
  const scene = makeScene(n, true);
  const [tj, json] = t(() => JSON.stringify(scene));
  const [tg, gz] = t(() => zlib.gzipSync(Buffer.from(json), { level: 6 }));
  const [tp] = t(() => JSON.parse(json));
  const [ts, soaBytes] = t(() => soa(n, scene));
  const [ti, g] = t(() => grid(scene, 512));
  // one viewport-worth of culling, averaged over 200 camera positions
  let vis = 0;
  const [tc] = t(() => { for (let k = 0; k < 200; k++) vis = query(g, rnd() * 6000, rnd() * 6000, 1920, 1080).length; });
  console.log([n,
    (json.length / 1048576).toFixed(2),
    (gz.length / 1048576).toFixed(2),
    tp.toFixed(1),
    (soaBytes / 1048576).toFixed(2),
    ts.toFixed(1),
    ti.toFixed(1),
    (tc / 200).toFixed(3),
    vis].join('\t'));
}

// --- Undo: journal of patches vs snapshots -------------------------------
console.log('\n-- Undo/Redo --');
const scene = makeScene(50000, true);
const full = JSON.stringify(scene).length;
// a patch: which stamp, which fields, before/after
const patch = JSON.stringify({ op: 'move', id: 's1abc', from: { x: 1234.5, y: 5678.9 }, to: { x: 1240.0, y: 5690.2 } });
console.log('full scene JSON bytes      :', full);
console.log('one move patch bytes       :', patch.length);
console.log('1000-step undo ring, patch :', (patch.length * 1000 / 1024).toFixed(1), 'KB');
console.log('1000-step undo ring, snap  :', (full * 1000 / 1073741824).toFixed(2), 'GB  <-- naive snapshot model');
// multi-select brush stroke: 300 stamps placed in one stroke
const strokePatch = JSON.stringify({ op: 'add', stamps: scene.stamps.slice(0, 300) });
console.log('one 300-stamp scatter patch:', (strokePatch.length / 1024).toFixed(1), 'KB');

// --- Export arithmetic ---------------------------------------------------
console.log('\n-- Export at 8192^2 --');
const px = 8192 * 8192;
console.log('pixels                      :', px.toLocaleString());
console.log('RGBA8 backing store         :', (px * 4 / 1048576).toFixed(0), 'MB');
console.log('iOS Safari canvas area cap  : 16,777,216 px  -> over by', (px / 16777216).toFixed(1) + 'x');
for (const tile of [1024, 2048, 4096]) {
  const n = (8192 / tile) ** 2;
  console.log(`tiled export @${tile}px      : ${n} passes, ${(tile*tile*4/1048576).toFixed(0)} MB peak per pass`);
}
