// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2026 Kaya Yesilyurt - Atlas Chronicles. Siehe LICENSE.
import { textHash } from "@chronicle/core";

export const CARTOGRAPHY_PATTERN_VERSION = "1";
export interface EditLimits { readonly cells: number; readonly patterns: number; readonly propagations: number; readonly backtracks: number }
export const CARTOGRAPHY_EDIT_LIMITS: EditLimits = Object.freeze({ cells: 1024, patterns: 64, propagations: 100_000, backtracks: 512 });
export type Cardinal = 0 | 1 | 2 | 3;
export type PatternPort = "land" | "road" | "water";
export type TerrainMaterial = "grass" | "earth" | "forest" | "field" | "rock" | "sand";
export interface CartographyPattern {
  readonly id: string;
  readonly ground: TerrainMaterial;
  /** Bits N=1,E=2,S=4,W=8. A bridge is the sole pattern carrying both networks. */
  readonly roadMask: number;
  readonly waterMask: number;
  readonly ports: readonly [PatternPort, PatternPort, PatternPort, PatternPort];
}
function pattern(id: string, ground: TerrainMaterial, roadMask = 0, waterMask = 0): CartographyPattern {
  return Object.freeze({ id, ground, roadMask, waterMask, ports: Object.freeze([0, 1, 2, 3].map(side => roadMask & 1 << side ? "road" : waterMask & 1 << side ? "water" : "land")) as CartographyPattern["ports"] });
}
export const CARTOGRAPHY_PATTERNS: readonly CartographyPattern[] = Object.freeze([
  ...(["grass", "earth", "forest", "field", "rock", "sand"] as const).map(material => pattern(`terrain:${material}`, material)),
  ...Array.from({ length: 15 }, (_, i) => pattern(`road:${i + 1}`, "earth", i + 1)),
  ...Array.from({ length: 15 }, (_, i) => pattern(`water:${i + 1}`, "grass", 0, i + 1)),
  pattern("bridge:ns", "earth", 5, 10), pattern("bridge:ew", "earth", 10, 5),
]);
export interface PatternCell { readonly x: number; readonly y: number; readonly candidates: readonly string[] }
export interface PatternBoundary { readonly x: number; readonly y: number; readonly side: Cardinal; readonly port: PatternPort }
export interface PatternAssignment { readonly x: number; readonly y: number; readonly pattern: CartographyPattern }
export interface PatternStatistics { readonly propagations: number; readonly backtracks: number }
export type PatternSolution =
  | { readonly ok: true; readonly assignments: readonly PatternAssignment[]; readonly statistics: PatternStatistics }
  | { readonly ok: false; readonly code: "invalid" | "contradiction" | "budget"; readonly message: string; readonly statistics: PatternStatistics };
export interface PatternSolveInput {
  readonly cells: readonly PatternCell[];
  readonly seed: string;
  /** Missing external edges are land; explicit boundary ports pin existing outside networks. */
  readonly boundary?: readonly PatternBoundary[];
  readonly limits?: Partial<typeof CARTOGRAPHY_EDIT_LIMITS>;
}

/** Pure, bounded local constraint propagation. No wall-clock-dependent success criterion. */
export function solveCartographyPatterns(input: PatternSolveInput): PatternSolution {
  let propagations = 0, backtracks = 0, exhausted = false;
  const failure = (code: "invalid" | "contradiction" | "budget", message: string): PatternSolution => ({ ok: false, code, message, statistics: { propagations, backtracks } });
  const limits = { ...CARTOGRAPHY_EDIT_LIMITS, ...input.limits };
  for (const key of Object.keys(CARTOGRAPHY_EDIT_LIMITS) as (keyof EditLimits)[]) {
    if (!Number.isSafeInteger(limits[key]) || limits[key] < 0 || limits[key] > CARTOGRAPHY_EDIT_LIMITS[key]) return failure("invalid", "Ungültiges Suchbudget.");
  }
  if (typeof input.seed !== "string" || !input.seed.length || input.seed.length > 1024 || !Array.isArray(input.cells)) return failure("invalid", "Keim und Modulmenge sind erforderlich.");
  if (input.cells.length > limits.cells) return failure("budget", "Die Auswahl enthält zu viele Module.");
  const catalogue = new Map(CARTOGRAPHY_PATTERNS.map((value, index) => [value.id, index]));
  const cells = [...input.cells].sort((a, b) => a.y - b.y || a.x - b.x);
  const positions = new Map<string, number>(), domains: number[][] = [];
  const key = (x: number, y: number) => `${x},${y}`;
  const baseSeed = Number.parseInt(textHash(input.seed).slice(0, 8), 16);
  const rank = (x: number, y: number, candidate: number) => {
    let value = baseSeed ^ Math.imul(x, 0x9e3779b1) ^ Math.imul(y, 0x85ebca77) ^ Math.imul(candidate + 1, 0xc2b2ae35);
    value = Math.imul(value ^ value >>> 16, 0x7feb352d); value = Math.imul(value ^ value >>> 15, 0x846ca68b); return (value ^ value >>> 16) >>> 0;
  };
  for (const [index, cell] of cells.entries()) {
    if (!Number.isSafeInteger(cell.x) || !Number.isSafeInteger(cell.y) || Math.abs(cell.x) > 1_000_000 || Math.abs(cell.y) > 1_000_000 || positions.has(key(cell.x, cell.y))
      || !Array.isArray(cell.candidates) || !cell.candidates.length || cell.candidates.some((id: string) => !catalogue.has(id))) return failure("invalid", "Ungültige oder doppelte Moduladresse/Musterwahl.");
    const candidates = [...new Set<string>(cell.candidates)].map(id => catalogue.get(id)!);
    if (candidates.length > limits.patterns) return failure("budget", "Zu viele Muster pro Modul.");
    candidates.sort((a, b) => rank(cell.x, cell.y, a) - rank(cell.x, cell.y, b) || a - b);
    positions.set(key(cell.x, cell.y), index); domains.push(candidates);
  }
  const offsets = [[0, -1], [1, 0], [0, 1], [-1, 0]] as const;
  const neighbors = cells.map(cell => offsets.map(([x, y]) => positions.get(key(cell.x + x, cell.y + y))));
  const boundary = new Map<string, PatternPort>();
  if ((input.boundary?.length ?? 0) > cells.length * 4) return failure("invalid", "Zu viele Randbedingungen.");
  for (const edge of input.boundary ?? []) {
    const index = positions.get(key(edge.x, edge.y)), address = `${index}:${edge.side}`;
    if (index === undefined || ![0, 1, 2, 3].includes(edge.side) || neighbors[index]![edge.side] !== undefined || boundary.has(address) || !["land", "road", "water"].includes(edge.port)) return failure("invalid", "Ungültiger oder doppelter Außenanschluss.");
    boundary.set(address, edge.port);
  }
  // A trail holds only changed domains. Backtracking never clones whole document/grid states.
  const trail: { index: number; previous: number[] }[] = [];
  const replace = (index: number, domain: number[]) => { trail.push({ index, previous: domains[index]! }); domains[index] = domain; };
  const restore = (mark: number) => { while (trail.length > mark) { const value = trail.pop()!; domains[value.index] = value.previous; } };
  const propagate = (initial: readonly number[]): boolean => {
    const queue = [...initial], queued = new Set(queue);
    for (let cursor = 0; cursor < queue.length; cursor++) {
      const index = queue[cursor]!; queued.delete(index);
      for (let side = 0; side < 4; side++) {
        if (propagations >= limits.propagations) { exhausted = true; return false; } propagations++;
        const neighbor = neighbors[index]![side], opposite = (side + 2) % 4;
        const supported = neighbor === undefined ? new Set([boundary.get(`${index}:${side}`) ?? "land"])
          : new Set(domains[neighbor]!.map(candidate => CARTOGRAPHY_PATTERNS[candidate]!.ports[opposite]!));
        const next = domains[index]!.filter(candidate => supported.has(CARTOGRAPHY_PATTERNS[candidate]!.ports[side]!));
        if (!next.length) return false;
        if (next.length !== domains[index]!.length) {
          replace(index, next);
          for (const adjacent of neighbors[index]!) if (adjacent !== undefined && !queued.has(adjacent)) { queue.push(adjacent); queued.add(adjacent); }
        }
      }
    }
    return true;
  };
  if (!propagate(cells.map((_, i) => i))) return failure(exhausted ? "budget" : "contradiction", exhausted ? "Die Suche hat ihr Arbeitsbudget erreicht." : "Die Nachbaranschlüsse passen nicht zusammen.");
  // Iterative depth-first search avoids a stack proportional to the selected area.
  const decisions: { index: number; options: number[]; next: number; mark: number }[] = [];
  for (;;) {
    let index = -1;
    for (let i = 0; i < domains.length; i++) if (domains[i]!.length > 1 && (index < 0 || domains[i]!.length < domains[index]!.length)) index = i;
    if (index < 0) return { ok: true, assignments: cells.map((cell, i) => ({ x: cell.x, y: cell.y, pattern: CARTOGRAPHY_PATTERNS[domains[i]![0]!]! })), statistics: { propagations, backtracks } };
    decisions.push({ index, options: [...domains[index]!], next: 0, mark: trail.length });
    let advanced = false;
    while (decisions.length) {
      const decision = decisions.at(-1)!; restore(decision.mark);
      if (decision.next >= decision.options.length) { decisions.pop(); continue; }
      replace(decision.index, [decision.options[decision.next++]!]);
      if (propagate([decision.index, ...neighbors[decision.index]!.filter((value): value is number => value !== undefined)])) { advanced = true; break; }
      if (exhausted) return failure("budget", "Die Suche hat ihr Arbeitsbudget erreicht.");
      if (backtracks >= limits.backtracks) return failure("budget", "Die Suche hat ihr Rücksetzbudget erreicht.");
      backtracks++;
    }
    if (!advanced) return failure("contradiction", "Für diese Randbedingungen gibt es keine passende Variante.");
  }
}
