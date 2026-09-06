import { canonicalHash, canonicalJson, type CanonicalValue, type KnotenId, type Ortswissen } from "@chronicle/core";
import { MAX_TIEFE, RAUM_KANTEN, type Knoten, type Weltkeim } from "./model.ts";

export type KnotenIndex = ReadonlyMap<KnotenId, Knoten>;
export interface ContainmentVerstoss {
  readonly art: "doppelte-id" | "falsche-kantenquelle" | "fehlendes-elternteil" | "mehrere-raumeltern" | "fehlender-raumelter" | "wurzel-mit-eltern" | "zyklus" | "max-tiefe";
  readonly knotenId: KnotenId;
}

/** Capture a detached, frozen provenance vector; caller mutation cannot invalidate its hash. */
export function weltkeim(input: Omit<Weltkeim, "keimHash">): Weltkeim {
  for (const key of ["generator", "version", "seed"] as const) {
    if (typeof input[key] !== "string" || !input[key].trim()) throw new Error(`Weltkeim.${key} fehlt`);
  }
  if (!input.optionen || typeof input.optionen !== "object" || Array.isArray(input.optionen)) {
    throw new Error("Weltkeim.optionen muss ein Objekt sein");
  }
  const optionen = JSON.parse(canonicalJson(input.optionen)) as Record<string, CanonicalValue>;
  const freeze = (value: CanonicalValue): void => {
    if (value !== null && typeof value === "object") {
      for (const child of Object.values(value)) freeze(child);
      Object.freeze(value);
    }
  };
  freeze(optionen);
  const record = { generator: input.generator, version: input.version, seed: input.seed, optionen };
  return Object.freeze({ ...record, keimHash: canonicalHash(record) });
}

/** Edges stored on a child point from that child to its parent. Political links do not nest. */
export function raumEltern(knoten: Knoten): readonly KnotenId[] {
  return knoten.eltern.filter((edge) => RAUM_KANTEN.includes(edge.art)).map((edge) => edge.nach);
}

function walk(start: KnotenId, index: KnotenIndex): number | ContainmentVerstoss["art"] {
  const seen = new Set<KnotenId>();
  let current = start;
  let depth = 0;
  for (;;) {
    if (seen.has(current)) return "zyklus";
    seen.add(current);
    const node = index.get(current);
    if (!node) return "fehlendes-elternteil";
    const parents = raumEltern(node);
    if (parents.length > 1) return "mehrere-raumeltern";
    if (!parents.length) return depth;
    if (++depth > MAX_TIEFE) return "max-tiefe";
    current = parents[0]!;
  }
}

/** Root depth is zero. Invalid graphs fail closed; a corrupt cycle never hangs a read path. */
export function tiefe(id: KnotenId, index: KnotenIndex): number {
  const result = walk(id, index);
  if (typeof result !== "number") throw new Error(`Containment ${result}: ${id}`);
  return result;
}

/** Validate the complete proposed graph before replacing persisted containment. */
export function pruefeContainment(knoten: readonly Knoten[]): readonly ContainmentVerstoss[] {
  const index = new Map<KnotenId, Knoten>();
  const errors: ContainmentVerstoss[] = [];
  const add = (art: ContainmentVerstoss["art"], knotenId: KnotenId): void => {
    if (!errors.some((e) => e.art === art && e.knotenId === knotenId)) errors.push({ art, knotenId });
  };
  for (const node of knoten) {
    if (index.has(node.id)) add("doppelte-id", node.id);
    index.set(node.id, node);
  }
  for (const node of knoten) {
    for (const edge of node.eltern) {
      if (edge.von !== node.id) add("falsche-kantenquelle", node.id);
      if (!index.has(edge.nach)) add("fehlendes-elternteil", node.id);
    }
    const parents = raumEltern(node);
    if (node.art !== "welt" && !parents.length) add("fehlender-raumelter", node.id);
    if (node.art === "welt" && parents.length) add("wurzel-mit-eltern", node.id);
    const result = walk(node.id, index);
    if (typeof result !== "number") add(result, node.id);
  }
  return errors;
}

/** Consume already-derived node knowledge, never inherit it from an ancestor or descendant. */
export function ortswissenFuer(id: KnotenId, wissen: ReadonlyMap<KnotenId, Ortswissen>): Ortswissen {
  return wissen.get(id) ?? "unbekannt";
}
