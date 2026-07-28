// identity.mjs — the Skriptorium passage-identity layer.
// PRICED CODE: everything between BEGIN PRICE and END PRICE is the layer we are buying.
// ---------------------------------------------------------------- BEGIN PRICE
import { Plugin, PluginKey } from "prosemirror-state";

export const identityKey = new PluginKey("passage-identity");

let counter = 0;
export const mint = (p = "n") => `${p}_${(++counter).toString(36).padStart(4, "0")}`;
export const resetMint = () => { counter = 0; };

const isPassage = (n) => n.type.spec.passage === true;

/** Collect (pid, pos, node) for every passage block, in document order. */
export function blocks(doc) {
  const out = [];
  doc.descendants((node, pos) => {
    if (isPassage(node)) { out.push({ pid: node.attrs.pid, pos, node }); return false; }
    return true;
  });
  return out;
}

/** Positions inserted by this transaction set, as [from,to) ranges in the NEW doc. */
function insertedRanges(trs) {
  const ranges = [];
  for (const tr of trs) {
    for (const map of tr.mapping.maps) {
      map.forEach((_os, _oe, ns, ne) => { if (ne > ns) ranges.push([ns, ne]); });
    }
  }
  return ranges;
}
const inAny = (pos, ranges) => ranges.some(([a, b]) => pos >= a && pos < b);

/**
 * Per-transaction invariant: every passage node carries a pid, and pids are unique
 * among LIVE nodes. Nothing else. No lineage, no server calls, no history pollution.
 *
 * Duplicate policy — the one real decision in this file:
 *   - pasted/dropped duplicate  -> the INSERTED copy is re-minted, the resident keeps its pid.
 *   - any other duplicate (= a structural split) -> the parent pid is RETIRED and BOTH
 *     halves are re-minted. Nobody silently inherits. Lineage is reconstructed at commit.
 */
export function passageIdentity() {
  return new Plugin({
    key: identityKey,
    appendTransaction(trs, oldState, newState) {
      if (!trs.some((t) => t.docChanged)) return null;
      const pasted = trs.some((t) => t.getMeta("paste") || t.getMeta("uiEvent") === "drop");
      const ins = pasted ? insertedRanges(trs) : null;

      const bs = blocks(newState.doc);
      const fixes = new Map(); // pos -> reason (a pos is fixed at most once)
      const mark = (pos, reason) => { if (!fixes.has(pos)) fixes.set(pos, reason); };

      // (a) PASTE/DROP: every INSERTED block is re-minted unconditionally. A pid arriving
      //     from another document is never a valid anchor here, duplicate or not.
      if (pasted) for (const b of bs) if (inAny(b.pos, ins)) mark(b.pos, "foreign");

      // (b) missing pid (schema default, programmatic insert, malformed import)
      for (const b of bs) if (b.pid == null) mark(b.pos, "missing");

      // (c) remaining duplicates = a structural split. Nobody inherits: both halves are
      //     re-minted and the parent pid is retired. Lineage is reconstructed at commit.
      const seen = new Map();
      for (const b of bs) {
        if (b.pid == null || fixes.has(b.pos)) continue;
        (seen.get(b.pid) || seen.set(b.pid, []).get(b.pid)).push(b);
      }
      for (const [, group] of seen) if (group.length > 1) for (const b of group) mark(b.pos, "split");

      if (!fixes.size) return null;
      const tr = newState.tr;
      for (const pos of fixes.keys()) tr.setNodeAttribute(pos, "pid", mint());
      // deliberately NOT addToHistory:false — the mint must be undone with the edit that
      // caused it, or Ctrl+Z leaves a document whose ids no longer match the saved revision.
      tr.setMeta(identityKey, [...fixes]);
      return tr;
    },
  });
}

/**
 * Commit-time lineage. Diffs the last SAVED doc against the doc being committed and
 * emits append-only lineage events. Runs once per save, never per keystroke.
 * Matching is by pid first, then by text for orphans (split/merge recovery).
 */
export function lineage(savedDoc, newDoc) {
  const oldB = blocks(savedDoc), newB = blocks(newDoc);
  const oldByPid = new Map(oldB.map((b) => [b.pid, b]));
  const newByPid = new Map(newB.map((b) => [b.pid, b]));
  const events = [];

  const freshNew = newB.filter((b) => !oldByPid.has(b.pid));
  const claimedNew = new Set(), matchedOld = new Set();
  const txt = (b) => b.node.textContent;

  // 1. MERGE — a block that SURVIVES (keeps its pid) but whose text is exactly itself plus
  //    its following old neighbours. This is what Backspace-at-start actually produces:
  //    ProseMirror keeps the first node and its attrs, and the absorbed pid vanishes.
  for (let i = 0; i < oldB.length; i++) {
    const o = oldB[i];
    const n = newByPid.get(o.pid);
    if (!n || matchedOld.has(o.pid) || txt(n) === txt(o)) continue;
    let acc = "", parents = [];
    for (let k = i; k < oldB.length && acc.length < txt(n).length; k++) { acc += txt(oldB[k]); parents.push(oldB[k]); }
    if (parents.length >= 2 && acc === txt(n)) {
      events.push({ kind: "merge", parents: parents.map((p) => p.pid), child: n.pid });
      parents.forEach((p) => matchedOld.add(p.pid));
    }
  }

  // 2. SPLIT — an old pid is gone and its text is the concatenation of >=2 consecutive
  //    fresh blocks. Under the plugin's no-inheritance rule this is the normal case.
  for (const o of oldB) {
    if (newByPid.has(o.pid) || matchedOld.has(o.pid)) continue;
    const t = txt(o);
    for (let i = 0; i < freshNew.length; i++) {
      if (claimedNew.has(i)) continue;
      let acc = "", kids = [], j = i;
      while (j < freshNew.length && !claimedNew.has(j) && acc.length < t.length) { acc += txt(freshNew[j]); kids.push(j); j++; }
      if (kids.length >= 2 && acc === t) {
        kids.forEach((k) => claimedNew.add(k));
        events.push({ kind: "split", parent: o.pid, children: kids.map((k) => freshNew[k].pid) });
        matchedOld.add(o.pid); break;
      }
    }
  }

  // 3. Everything left over.
  for (const o of oldB) if (!newByPid.has(o.pid) && !matchedOld.has(o.pid)) events.push({ kind: "retire", pid: o.pid });
  freshNew.forEach((b, i) => { if (!claimedNew.has(i)) events.push({ kind: "create", pid: b.pid }); });
  for (const [pid, o] of oldByPid) {
    const n = newByPid.get(pid);
    if (n && txt(n) !== txt(o) && !events.some((e) => e.kind === "merge" && e.child === pid))
      events.push({ kind: "revise", pid });
  }
  return events;
}

/**
 * Resolution: what a pointer (revelation, clause, link, map region) written against
 * `pid` resolves to after lineage. Append-only, so this is a graph walk, not a migration.
 */
export function resolve(pid, events) {
  const out = new Set(), seen = new Set(), stack = [pid];
  while (stack.length) {
    const p = stack.pop();
    if (seen.has(p)) continue;
    seen.add(p);
    const sp = events.find((e) => e.kind === "split" && e.parent === p);
    const mg = events.find((e) => e.kind === "merge" && e.parents.includes(p) && e.child !== p);
    const rt = events.find((e) => e.kind === "retire" && e.pid === p);
    if (sp) stack.push(...sp.children);
    else if (mg) stack.push(mg.child);
    else if (rt) continue;              // dead pointer, resolves to nothing — never to a wrong passage
    else out.add(p);
  }
  return [...out];
}

/**
 * THE MERGE GUARD. Merging two passages with different audiences widens the audience of
 * the narrower one. Server-side precondition, checked before the merge is allowed to commit.
 * Returns null if safe, or a blocker describing exactly who would gain what.
 */
export function mergeGuard(parents, holdersOf) {
  const sets = parents.map((p) => new Set(holdersOf(p)));
  const union = new Set(sets.flatMap((s) => [...s]));
  const gains = [];
  for (let i = 0; i < parents.length; i++)
    for (const h of union) if (!sets[i].has(h)) gains.push({ holder: h, wouldGain: parents[i] });
  return gains.length ? { blocked: true, gains } : null;
}
// ------------------------------------------------------------------ END PRICE
