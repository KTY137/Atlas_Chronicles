import { Schema, Slice, Fragment } from "prosemirror-model";
import { EditorState, TextSelection } from "prosemirror-state";
import { history, undo, redo } from "prosemirror-history";
import { splitBlock } from "prosemirror-commands";
import { passageIdentity, blocks, lineage, resolve, mergeGuard, mint, resetMint } from "./identity.mjs";

const schema = new Schema({
  nodes: {
    doc: { content: "passage+" },
    passage: {
      passage: true, group: "block", content: "inline*",
      attrs: { pid: { default: null } },
      toDOM: (n) => ["p", { "data-pid": n.attrs.pid }, 0],
      parseDOM: [{ tag: "p", getAttrs: (d) => ({ pid: d.getAttribute("data-pid") }) }],
    },
    text: { group: "inline" },
  },
});

const P = (pid, text) => schema.nodes.passage.create({ pid }, text ? schema.text(text) : null);
const doc = (...ps) => schema.nodes.doc.create(null, ps);
const mkState = (d, withPlugin) =>
  EditorState.create({ doc: d, plugins: withPlugin ? [history(), passageIdentity()] : [history()] });
const pids = (s) => blocks(s.doc).map((b) => b.pid);
const texts = (s) => blocks(s.doc).map((b) => b.node.textContent);

// position of char index `i` inside block index `bi`
function posIn(state, bi, i) {
  const b = blocks(state.doc)[bi];
  return b.pos + 1 + i;
}
function apply(state, fn) { const tr = state.tr; fn(tr, state); return state.apply(tr); }
function cmd(state, command, at) {
  let s = at != null ? state.apply(state.tr.setSelection(TextSelection.create(state.doc, at))) : state;
  let out = s;
  command(s, (tr) => { out = s.apply(tr); });
  return out;
}

const results = [];
function T(name, fn) {
  let pass, detail;
  try { const r = fn(); pass = r.pass; detail = r.detail; }
  catch (e) { pass = false; detail = "THREW: " + e.message; }
  results.push({ name, pass, detail });
}

const SENT_A = "Das Aschene Siegel ist eine Faelschung.";
const SENT_B = " Das Original verbrannte 1194.";
const base = () => { resetMint(); return doc(P("p_0001", "Haus Vharon"), P("p_0002", SENT_A + SENT_B), P("p_0003", "Bruder Alder schweigt.")); };

// ---------------------------------------------------------------- 1. NAIVE
T("N1 split — naive (attrs only, no plugin): are ids still unique?", () => {
  const st = mkState(base(), false);
  const after = cmd(st, splitBlock, posIn(st, 1, SENT_A.length));
  const p = pids(after);
  const uniq = new Set(p).size === p.length;
  return { pass: uniq, detail: `pids=[${p.join(", ")}]  texts=${JSON.stringify(texts(after))}` };
});

T("N2 split — naive: does the ORIGINAL pid now address two different sentences?", () => {
  const st = mkState(base(), false);
  const after = cmd(st, splitBlock, posIn(st, 1, SENT_A.length));
  const dup = blocks(after.doc).filter((b) => b.pid === "p_0002");
  return {
    pass: dup.length === 1,
    detail: `p_0002 occurs ${dup.length}x, addressing ${JSON.stringify(dup.map((d) => d.node.textContent))}`,
  };
});

// ---------------------------------------------------------------- 2. HARDENED
T("H1 split: ids unique after plugin", () => {
  const st = mkState(base(), true);
  const after = cmd(st, splitBlock, posIn(st, 1, SENT_A.length));
  const p = pids(after);
  return { pass: new Set(p).size === p.length && p.every(Boolean), detail: `pids=[${p.join(", ")}]` };
});

T("H2 split: parent pid is RETIRED, not silently inherited by one half", () => {
  const st = mkState(base(), true);
  const after = cmd(st, splitBlock, posIn(st, 1, SENT_A.length));
  return { pass: !pids(after).includes("p_0002"), detail: `pids=[${pids(after).join(", ")}]` };
});

T("H3 split at position 0 (Enter at start): no half silently keeps the id", () => {
  const st = mkState(base(), true);
  const after = cmd(st, splitBlock, posIn(st, 1, 0));
  const b = blocks(after.doc);
  const contentBlock = b.find((x) => x.node.textContent.startsWith("Das Aschene"));
  return {
    pass: contentBlock.pid !== "p_0002" && !pids(after).includes("p_0002"),
    detail: `blocks=${JSON.stringify(b.map((x) => [x.pid, x.node.textContent.slice(0, 18)]))}`,
  };
});

T("H4 merge (Backspace at start of block 2): the absorbed pid disappears", () => {
  const st = mkState(base(), true);
  const b = blocks(st.doc);
  const after = apply(st, (tr) => tr.join(b[2].pos));
  return { pass: !pids(after).includes("p_0003") && pids(after).length === 2, detail: `pids=[${pids(after).join(", ")}] texts=${JSON.stringify(texts(after))}` };
});

T("H5 paste-over of a range spanning two passages: foreign pids are re-minted", () => {
  const st = mkState(base(), true);
  const foreign = Slice.maxOpen(Fragment.from([P("FOREIGN_X", "Eingefuegt eins."), P("FOREIGN_Y", "Eingefuegt zwei.")]));
  const from = posIn(st, 1, 5), to = posIn(st, 2, 5);
  const after = st.apply((() => { const tr = st.tr; tr.replace(from, to, foreign); tr.setMeta("paste", true); return tr; })());
  const p = pids(after);
  return { pass: !p.includes("FOREIGN_X") && !p.includes("FOREIGN_Y") && new Set(p).size === p.length && p.every(Boolean),
           detail: `pids=[${p.join(", ")}] texts=${JSON.stringify(texts(after))}` };
});

T("H6 duplicate paste from the SAME document: resident keeps its pid, copy is re-minted", () => {
  const st = mkState(base(), true);
  const copy = Slice.maxOpen(Fragment.from([P("p_0002", SENT_A + SENT_B)]));
  const end = st.doc.content.size;
  const after = st.apply((() => { const tr = st.tr; tr.replace(end, end, copy); tr.setMeta("paste", true); return tr; })());
  const p = pids(after);
  return { pass: p[1] === "p_0002" && new Set(p).size === p.length && p.length === 4,
           detail: `pids=[${p.join(", ")}]` };
});

T("H7 undo after split restores the ORIGINAL pid (no orphan after Ctrl+Z)", () => {
  const st = mkState(base(), true);
  const after = cmd(st, splitBlock, posIn(st, 1, SENT_A.length));
  const back = cmd(after, undo);
  return { pass: JSON.stringify(pids(back)) === JSON.stringify(["p_0001", "p_0002", "p_0003"]),
           detail: `after=[${pids(after).join(", ")}] -> undo=[${pids(back).join(", ")}]` };
});

T("H8 undo->redo is stable (redo does not mint a THIRD generation)", () => {
  const st = mkState(base(), true);
  const a = cmd(st, splitBlock, posIn(st, 1, SENT_A.length));
  const idsA = pids(a);
  const b = cmd(a, undo);
  const c = cmd(b, redo);
  return { pass: JSON.stringify(pids(c)) === JSON.stringify(idsA),
           detail: `split=[${idsA.join(", ")}] undo=[${pids(b).join(", ")}] redo=[${pids(c).join(", ")}]` };
});

T("H11 paste-over: the partially overwritten RESIDENT passage keeps its pid (edit, not re-identify)", () => {
  const st = mkState(base(), true);
  const foreign = Slice.maxOpen(Fragment.from([P("FOREIGN_X", "Eingefuegt eins."), P("FOREIGN_Y", "Eingefuegt zwei.")]));
  const from = posIn(st, 1, 5), to = posIn(st, 2, 5);
  const after = st.apply((() => { const tr = st.tr; tr.replace(from, to, foreign); tr.setMeta("paste", true); return tr; })());
  const p = pids(after);
  return { pass: p[0] === "p_0001" && p[1] === "p_0002", detail: `pids=[${p.join(", ")}] texts=${JSON.stringify(texts(after))}` };
});

T("H12 import: pasting a whole foreign article (12 blocks) re-mints every one of them", () => {
  const st = mkState(base(), true);
  const frag = Fragment.from(Array.from({ length: 12 }, (_, i) => P("OTHERWORLD_" + i, "Fremder Absatz " + i)));
  const end = st.doc.content.size;
  const after = st.apply((() => { const tr = st.tr; tr.replace(end, end, Slice.maxOpen(frag)); tr.setMeta("paste", true); return tr; })());
  const p = pids(after);
  return { pass: p.filter((x) => String(x).startsWith("OTHERWORLD")).length === 0 && new Set(p).size === p.length && p.length === 15,
           detail: `${p.length} blocks, foreign survivors: ${p.filter((x) => String(x).startsWith("OTHERWORLD")).length}` };
});

T("H9 typing inside a passage never changes its pid", () => {
  let st = mkState(base(), true);
  for (let i = 0; i < 40; i++) st = st.apply(st.tr.insertText("x", posIn(st, 1, 3)));
  return { pass: JSON.stringify(pids(st)) === JSON.stringify(["p_0001", "p_0002", "p_0003"]),
           detail: `pids=[${pids(st).join(", ")}] after 40 keystrokes` };
});

T("H10 reorder (cut+paste a whole block): the pid MOVES with the node", () => {
  const st = mkState(base(), true);
  const b = blocks(st.doc);
  const node = b[2].node;
  let s = st.apply(st.tr.delete(b[2].pos, b[2].pos + node.nodeSize));
  s = s.apply(s.tr.replace(0, 0, Slice.maxOpen(Fragment.from([node]))));
  return { pass: JSON.stringify(pids(s)) === JSON.stringify(["p_0003", "p_0001", "p_0002"]),
           detail: `pids=[${pids(s).join(", ")}]` };
});

// ---------------------------------------------------------------- 3. LINEAGE + RESOLUTION
T("L1 commit-time lineage reconstructs the split as parent->[children]", () => {
  const saved = base();
  const st = mkState(saved, true);
  const after = cmd(st, splitBlock, posIn(st, 1, SENT_A.length));
  const ev = lineage(saved, after.doc);
  const sp = ev.find((e) => e.kind === "split");
  return { pass: !!sp && sp.parent === "p_0002" && sp.children.length === 2,
           detail: JSON.stringify(ev) };
});

T("L2 a revelation written against the parent resolves to BOTH children (no silent orphan)", () => {
  const saved = base();
  const st = mkState(saved, true);
  const after = cmd(st, splitBlock, posIn(st, 1, SENT_A.length));
  const ev = lineage(saved, after.doc);
  const r = resolve("p_0002", ev);
  return { pass: r.length === 2 && r.every((p) => pids(after).includes(p)),
           detail: `resolve(p_0002) = [${r.join(", ")}]; live = [${pids(after).join(", ")}]` };
});

T("L3 lineage reconstructs a merge as [parents]->child", () => {
  const saved = base();
  const st = mkState(saved, true);
  const b = blocks(st.doc);
  const after = apply(st, (tr) => tr.join(b[2].pos));
  const ev = lineage(saved, after.doc);
  const mg = ev.find((e) => e.kind === "merge");
  return { pass: !!mg && mg.parents.includes("p_0002") && mg.parents.includes("p_0003"),
           detail: JSON.stringify(ev) };
});

T("L4 a content edit keeps the pid and emits `revise`, not `retire`", () => {
  const saved = base();
  let st = mkState(saved, true);
  st = st.apply(st.tr.insertText("NEU ", posIn(st, 1, 0)));
  const ev = lineage(saved, st.doc);
  return { pass: ev.length === 1 && ev[0].kind === "revise" && ev[0].pid === "p_0002",
           detail: JSON.stringify(ev) };
});

T("L5 delete a passage -> `retire`; a pointer resolves to NOTHING (dead), never to a wrong passage", () => {
  const saved = base();
  const st = mkState(saved, true);
  const b = blocks(st.doc);
  const after = st.apply(st.tr.delete(b[1].pos, b[1].pos + b[1].node.nodeSize));
  const ev = lineage(saved, after.doc);
  const r = resolve("p_0002", ev);
  return { pass: ev.some((e) => e.kind === "retire" && e.pid === "p_0002") && r.length === 0,
           detail: `${JSON.stringify(ev)} resolve=[${r.join(", ")}]` };
});

// ---------------------------------------------------------------- 4. THE LEAK
T("X1 MERGE GUARD: merging a revealed passage with a secret one is BLOCKED (this is the leak)", () => {
  const holders = { p_0002: ["Sera", "Brannt"], p_0003: [] };
  const g = mergeGuard(["p_0002", "p_0003"], (p) => holders[p] || []);
  return { pass: !!g && g.blocked, detail: JSON.stringify(g) };
});

T("X2 MERGE GUARD: merging two passages with identical audiences is allowed", () => {
  const holders = { p_0002: ["Sera"], p_0003: ["Sera"] };
  const g = mergeGuard(["p_0002", "p_0003"], (p) => holders[p] || []);
  return { pass: g === null, detail: String(g) };
});

T("X3 UNGUARDED merge would widen an audience — demonstrate the leak the guard prevents", () => {
  const saved = base();
  const st = mkState(saved, true);
  const b = blocks(st.doc);
  const after = apply(st, (tr) => tr.join(b[2].pos));
  const ev = lineage(saved, after.doc);
  const seraHolds = ["p_0002"];                       // Sera was never told p_0003
  const nowSees = seraHolds.flatMap((p) => resolve(p, ev));
  const text = blocks(after.doc).find((x) => x.pid === nowSees[0]).node.textContent;
  const leaked = text.includes("Bruder Alder schweigt.");
  return { pass: leaked, detail: `WITHOUT the guard, resolving Sera's revelation yields "${text}" — secret text included: ${leaked}` };
});

// ---------------------------------------------------------------- 5. PERFORMANCE
function bigDoc(n) {
  resetMint();
  const ps = [];
  for (let i = 0; i < n; i++) ps.push(P(mint(), `Absatz ${i}. ` + "Lorem ipsum dolor sit amet consectetur. ".repeat(3)));
  return doc(...ps);
}
T("PERF keystroke cost with the identity plugin, 300-passage article", () => {
  const d = bigDoc(300);
  let st = mkState(d, true);
  const at = posIn(st, 150, 5);
  // warm
  for (let i = 0; i < 50; i++) st = st.apply(st.tr.insertText("x", at));
  const t0 = process.hrtime.bigint();
  const N = 500;
  for (let i = 0; i < N; i++) st = st.apply(st.tr.insertText("x", at));
  const t1 = process.hrtime.bigint();
  const per = Number(t1 - t0) / 1e6 / N;
  return { pass: per < 8, detail: `${per.toFixed(3)} ms / keystroke (budget 8 ms), 300 passages, ${blocks(st.doc).length} blocks` };
});

T("PERF commit-time lineage diff, 300-passage article with 5 structural edits", () => {
  const saved = bigDoc(300);
  let st = mkState(saved, true);
  for (const bi of [10, 50, 120, 200, 280]) st = cmd(st, splitBlock, posIn(st, bi, 20));
  const t0 = process.hrtime.bigint();
  const R = 20; let ev;
  for (let i = 0; i < R; i++) ev = lineage(saved, st.doc);
  const t1 = process.hrtime.bigint();
  const per = Number(t1 - t0) / 1e6 / R;
  const splits = ev.filter((e) => e.kind === "split").length;
  return { pass: per < 100 && splits === 5, detail: `${per.toFixed(2)} ms per commit diff; ${splits} splits + ${ev.length - splits} other events detected` };
});

T("PERF worst case: 2000-passage article, keystroke cost", () => {
  const d = bigDoc(2000);
  let st = mkState(d, true);
  const at = posIn(st, 1000, 5);
  for (let i = 0; i < 30; i++) st = st.apply(st.tr.insertText("x", at));
  const t0 = process.hrtime.bigint();
  const N = 200;
  for (let i = 0; i < N; i++) st = st.apply(st.tr.insertText("x", at));
  const t1 = process.hrtime.bigint();
  const per = Number(t1 - t0) / 1e6 / N;
  return { pass: per < 8, detail: `${per.toFixed(3)} ms / keystroke at 2000 passages (budget 8 ms)` };
});

// ---------------------------------------------------------------- 6. FUZZ
T("FUZZ 3000 random operations: ids stay unique and non-null, always", () => {
  resetMint();
  let st = mkState(bigDoc(40), true);
  let rng = 1234567;
  const rnd = () => ((rng = (rng * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff);
  let ops = 0, bad = null;
  for (let i = 0; i < 3000 && !bad; i++) {
    const bs = blocks(st.doc);
    if (bs.length < 2) { st = st.apply(st.tr.replace(st.doc.content.size, st.doc.content.size, Slice.maxOpen(Fragment.from([P(mint(), "neu")])))); continue; }
    const bi = Math.floor(rnd() * bs.length);
    const r = rnd();
    try {
      if (r < 0.30) { st = st.apply(st.tr.insertText("z", posIn(st, bi, 1))); }
      else if (r < 0.50) { st = cmd(st, splitBlock, posIn(st, bi, Math.min(3, bs[bi].node.textContent.length))); }
      else if (r < 0.65 && bi > 0) { st = apply(st, (tr) => tr.join(blocks(st.doc)[bi].pos)); }
      else if (r < 0.78) {
        const f = Slice.maxOpen(Fragment.from([P("EXT_" + i, "extern " + i)]));
        const p = blocks(st.doc)[bi].pos;
        st = st.apply((() => { const tr = st.tr; tr.replace(p, p, f); tr.setMeta("paste", true); return tr; })());
      }
      else if (r < 0.88) { st = cmd(st, undo); }
      else if (r < 0.94) { st = cmd(st, redo); }
      else { const b = blocks(st.doc)[bi]; if (blocks(st.doc).length > 1) st = st.apply(st.tr.delete(b.pos, b.pos + b.node.nodeSize)); }
      ops++;
    } catch { /* command not applicable at this position; skip */ }
    const p = pids(st);
    if (p.some((x) => x == null) || new Set(p).size !== p.length) bad = { i, p: p.slice(0, 12) };
  }
  return { pass: !bad, detail: bad ? `FAILED at op ${bad.i}: ${JSON.stringify(bad.p)}` : `${ops} ops applied, ${blocks(st.doc).length} blocks, all pids unique and non-null` };
});

T("FUZZ leak check: no pid ever appears twice, and no EXT_ (foreign) pid survives", () => {
  resetMint();
  let st = mkState(bigDoc(20), true);
  let rng = 987654;
  const rnd = () => ((rng = (rng * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff);
  for (let i = 0; i < 1200; i++) {
    const bs = blocks(st.doc);
    const bi = Math.floor(rnd() * bs.length);
    const f = Slice.maxOpen(Fragment.from([P("EXT_" + i, "extern"), P("EXT_" + i, "extern dup")]));
    const p = bs[bi].pos;
    try { st = st.apply((() => { const tr = st.tr; tr.replace(p, p, f); tr.setMeta("paste", true); return tr; })()); } catch {}
    if (rnd() < 0.3) st = cmd(st, splitBlock, posIn(st, Math.floor(rnd() * blocks(st.doc).length), 2));
  }
  const p = pids(st);
  const foreign = p.filter((x) => String(x).startsWith("EXT_"));
  return { pass: foreign.length === 0 && new Set(p).size === p.length,
           detail: `${p.length} blocks; foreign pids surviving: ${foreign.length}; unique: ${new Set(p).size === p.length}` };
});

// ---------------------------------------------------------------- REPORT
const w = Math.max(...results.map((r) => r.name.length));
console.log("\n=== SKRIPTORIUM PASSAGE-IDENTITY SPIKE — prosemirror-model/state/transform/history ===\n");
for (const r of results) console.log(`${r.pass ? "PASS" : "FAIL"}  ${r.name.padEnd(w)}  | ${r.detail}`);
const f = results.filter((r) => !r.pass).length;
console.log(`\n${results.length - f}/${results.length} passing.  (N1/N2 are the NAIVE baseline: FAIL there is the finding.)\n`);
