import type { ActorId, PassageId } from "@chronicle/core";
import type { Erfahrungsgrad, LineageEvent, Quelle, Tuerklasse } from "./model.ts";

/** Document-order adapter for commit-time identity; never call once per keystroke. */
export interface LineageBlock {
  readonly pid: PassageId;
  readonly text: string;
  /** Supply the block AST hash so a link/mark edit also records a revision. */
  readonly fingerprint?: string;
}

function index(blocks: readonly LineageBlock[]): Map<PassageId, LineageBlock> {
  const result = new Map<PassageId, LineageBlock>();
  for (const block of blocks) {
    if (!block.pid || result.has(block.pid)) throw new Error("Passage ids must be nonempty and unique");
    result.set(block.pid, block);
  }
  return result;
}

/**
 * Spike A's saved-document diff, hardened against noncontiguous and ambiguous matches.
 * Exact joins/splits preserve ancestry; ambiguous edits become retire/create events.
 * The caller MUST run mergeGuard against effective audiences before committing merges.
 */
export function lineage(saved: readonly LineageBlock[], current: readonly LineageBlock[]): LineageEvent[] {
  const oldById = index(saved), newById = index(current);
  const usedOld = new Set<PassageId>(), usedNew = new Set<PassageId>();
  const events: LineageEvent[] = [];
  for (const next of current) {
    if (current.filter((p) => p.text === next.text).length !== 1) continue;
    const matches: LineageBlock[][] = [];
    for (let i = 0; i < saved.length; i++) {
      if (oldById.has(next.pid) && saved[i]!.pid !== next.pid) continue;
      const parents: LineageBlock[] = [];
      let text = "";
      for (let j = i; j < saved.length; j++) {
        const parent = saved[j]!;
        if (usedOld.has(parent.pid) || (newById.has(parent.pid) && parent.pid !== next.pid)) break;
        // An inherited merge identity must belong to its first parent.
        if (parent.pid === next.pid && j !== i) break;
        parents.push(parent);
        text += parent.text;
        if (!next.text.startsWith(text)) break;
        if (parents.length >= 2 && text === next.text) matches.push([...parents]);
      }
    }
    if (matches.length !== 1) continue;
    const parents = matches[0]!;
    events.push({ kind: "merge", parents: parents.map((p) => p.pid), child: next.pid });
    parents.forEach((p) => usedOld.add(p.pid));
    usedNew.add(next.pid);
  }
  for (const old of saved) {
    if (newById.has(old.pid) || usedOld.has(old.pid)) continue;
    if (saved.filter((p) => p.text === old.text).length !== 1) continue;
    const matches: LineageBlock[][] = [];
    for (let i = 0; i < current.length; i++) {
      const children: LineageBlock[] = [];
      let text = "";
      for (let j = i; j < current.length; j++) {
        const child = current[j]!;
        // Walk the actual document: filtering to fresh nodes would join across residents.
        if (oldById.has(child.pid) || usedNew.has(child.pid)) break;
        children.push(child);
        text += child.text;
        if (!old.text.startsWith(text)) break;
        if (children.length >= 2 && text === old.text) matches.push([...children]);
      }
    }
    if (matches.length !== 1) continue;
    const children = matches[0]!;
    events.push({ kind: "split", parent: old.pid, children: children.map((p) => p.pid) });
    usedOld.add(old.pid);
    children.forEach((p) => usedNew.add(p.pid));
  }
  for (const old of saved) {
    if (!newById.has(old.pid) && !usedOld.has(old.pid)) events.push({ kind: "retire", pid: old.pid });
  }
  for (const next of current) {
    const old = oldById.get(next.pid);
    if (usedNew.has(next.pid)) continue;
    if (!old) events.push({ kind: "create", pid: next.pid });
    else if (old.text !== next.text || old.fingerprint !== next.fingerprint) events.push({ kind: "revise", pid: next.pid });
  }
  return events;
}

/** Replay append-only events in time order; a retired reference never resurrects. */
export function resolvePassage(pid: PassageId, events: readonly LineageEvent[]): PassageId[] {
  const live = new Set([pid]);
  const ancestors = new Map<PassageId, Set<PassageId>>([[pid, new Set()]]);
  for (const event of events) {
    if (event.kind === "retire") live.delete(event.pid);
    if (event.kind !== "split" && event.kind !== "merge") continue;
    const parents = event.kind === "split" ? [event.parent] : event.parents;
    const children = event.kind === "split" ? event.children : [event.child];
    const reached = parents.filter((p) => live.has(p));
    if (!reached.length) continue;
    const history = new Set(reached.flatMap((p) => [...(ancestors.get(p) ?? []), p]));
    for (const child of children) {
      const retainedMergeParent = event.kind === "merge" && reached.includes(child);
      if (history.has(child) && !retainedMergeParent) throw new Error("Cyclic passage lineage");
    }
    reached.forEach((p) => live.delete(p));
    children.forEach((p) => {
      const previous = ancestors.get(p) ?? new Set<PassageId>();
      const next = new Set([...previous, ...history]);
      next.delete(p);
      ancestors.set(p, next);
      live.add(p);
    });
  }
  return [...live];
}

export interface MergeBlocker {
  readonly blocked: true;
  readonly gains: readonly { readonly holder: ActorId; readonly wouldGain: PassageId }[];
}

/** Effective holders must include lineage, scope and revocation filtering at the caller. */
export function mergeGuard(
  parents: readonly PassageId[],
  holdersOf: (pid: PassageId) => readonly ActorId[],
): MergeBlocker | null {
  const sets = parents.map((p) => new Set(holdersOf(p)));
  const union = new Set(sets.flatMap((set) => [...set]));
  const gains: { holder: ActorId; wouldGain: PassageId }[] = [];
  parents.forEach((pid, i) => {
    for (const holder of union) if (!sets[i]!.has(holder)) gains.push({ holder, wouldGain: pid });
  });
  return gains.length ? { blocked: true, gains } : null;
}

export function erfahrungsgrad(quelle: Quelle): Erfahrungsgrad {
  switch (quelle.art) {
    case "wurf": return "erfahren";
    case "gesprochen": return "gesprochen";
    case "gehoert": return "gehoert";
    // A citation alone cannot assert direct experience.
    case "passage": return "gehoert";
  }
}

export function tuerklasse(eingehend: number, verworfen = false): Tuerklasse {
  if (!Number.isSafeInteger(eingehend) || eingehend < 1) throw new Error("Incoming entry count must be positive");
  if (verworfen) return "verworfen";
  return eingehend >= 3 ? "tuer" : eingehend === 2 ? "spur" : "notiz";
}
