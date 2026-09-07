// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2026 Kaya Yesilyurt - Atlas Chronicles. Siehe LICENSE.
import type { CanonicalValue, EntryId, KnotenId, PassageId } from "@chronicle/core";

/**
 * THE IRREVERSIBLE LAYER — containment, coordinates and provenance.
 *
 * `packages/szene` may know: Map, Region, Place, Token/Placement, Runtime Scene.
 * It may NOT know: knowledge decisions (06:2880). It must never import `@chronicle/chronik`;
 * `tools/gate-boundaries.mjs` fails the build if it does.
 *
 * RB-21d:645 states the stakes at full volume rather than smuggling them past:
 * **"Defining a format is an irreversible act."**
 */

// ---------------------------------------------------------------------------------------
// Coordinates — the answer to "coordinates do not nest"
// ---------------------------------------------------------------------------------------

/**
 * The corpus holds **three mutually incompatible coordinate contracts** — FMG's
 * `graphWidth/graphHeight`, UVTT's `resolution {map_origin, map_size, pixels_per_grid}`, and
 * Fandom `interactivemap`'s `mapBounds` + `origin: "bottom-left"` + `coordinateOrder: "xy"`.
 * **None nests into another** (RB-21d:667-673).
 *
 * So: a child map is **not a zoom level**. It is a separate artefact with its own `Rahmen`
 * and exactly one `Anker` point in its parent's frame.
 */
export interface Rahmen {
  readonly ursprung: readonly [number, number];
  readonly einheitenProPixel: number;
  readonly ordnung: "xy" | "yx";
  /** Which way y grows. Fandom's interactive maps are bottom-left; almost nothing else is. */
  readonly hoch: "oben" | "unten";
}

export interface Anker {
  readonly in: KnotenId;
  readonly bei: readonly [number, number];
  readonly massstab: number;
}

// ---------------------------------------------------------------------------------------
// Weltkeim — the storable world unit
// ---------------------------------------------------------------------------------------

/**
 * **The seed is not a world identity.** Measured: same seed, canvas 1280x720 -> 1600x900 keeps
 * `(id, name)` for **0 of 664 burgs**; 8 names survive (1.2 %); 1 of 25 state names survives
 * (RB-21d:234). A seed without its complete option vector is *"a lottery ticket that happens
 * to print the same number twice if you hold the machine perfectly still."*
 *
 * Therefore the storable unit is the seed **plus** the canonically-ordered option vector,
 * hashed. ~100 bytes. A version bump is a **migration, not an upgrade** (RB-21d:240).
 *
 * Scope discipline, ruled in N7 (OPEN-DECISIONS.md:131): `Weltkeim` is a **provenance record,
 * not a re-derivation promise.** `Nachrechnen` is NOT claimed over a generated world in any
 * copy or any UI until id survival across a generator version bump has been tested — and it
 * has not been (RB-21d:808, the highest-variance unknown in that brief).
 */
export interface Weltkeim {
  readonly generator: string;
  readonly version: string;
  readonly seed: string;
  readonly optionen: Readonly<Record<string, CanonicalValue>>;
  /** sha256 over canonical(generator|version|seed|optionen). Computed, never supplied. */
  readonly keimHash: string;
}

export interface Herkunft {
  readonly erzeuger: string;
  readonly version: string;
  readonly keimHash: string;
  /** The stable path within the derivation — how this node was reached, not where it sat. */
  readonly erzeugungspfad: readonly string[];
  /** The derived seed handed to a child generator, when this node seeds one. */
  readonly kindKeim?: string;
}

// ---------------------------------------------------------------------------------------
// Knoten — the containment lattice
// ---------------------------------------------------------------------------------------

export type KnotenArt =
  | "welt"
  | "landmasse"
  | "macht"
  | "region"
  | "ort"
  | "bauwerk"
  | "raum"
  | "behaelter"
  | "gegenstand";

/**
 * Edge kinds. `Raum` (spatial containment) is a strict tree; `Bezug` is a typed dated
 * multigraph. **A combined tree that mixes political membership, ownership, spatial location
 * and wiki nesting into one parent edge is verboten** (06:1207-1238) — merging later is one
 * migration, splitting later is data archaeology (RB-21:461-478).
 */
export type KantenArt =
  | "liegt_in_geografie"
  | "gehoert_zu_herrschaft"
  | "beruehrt"
  | "enthaelt_physisch";

/** Which edge kinds are spatial containment — the only ones that form the strict tree. */
export const RAUM_KANTEN: readonly KantenArt[] = ["liegt_in_geografie", "enthaelt_physisch"];

export interface Kante {
  readonly von: KnotenId;
  readonly nach: KnotenId;
  readonly art: KantenArt;
}

/**
 * `MAX_TIEFE = 24` (06:1207-1238). Not an aesthetic limit: an unbounded containment walk is a
 * denial-of-service against the projector, and the projector runs on every read path.
 */
export const MAX_TIEFE = 24;

export interface Knoten {
  /** `hash(keim | kind | erzeugungspfad)` — **never an index** (invariant I8). */
  readonly id: KnotenId;
  readonly art: KnotenArt;
  /** `null` is legal and meaningful: an unnamed container is a real state, not a missing one. */
  readonly titel: string | null;
  /**
   * **MULTI-PARENT, typed, never a single pointer.** Measured on one real generated world:
   * 324 of 575 routes (56.3 %) cross more than one province, 8 of 25 states span more than one
   * landmass — *"a tree is wrong 32 % of the time at the very top level"* (RB-21d:88-92).
   * Migrating pointer -> list later rewrites every read site (RB-21d:665-666).
   */
  readonly eltern: readonly Kante[];
  readonly rahmen: Rahmen;
  readonly anker: Anker | null;
  readonly herkunft: Herkunft | null;
  /**
   * The projection hook. **A `Knoten` is permissioned, always.** `Sicht` projects **per node,
   * not per subtree** — knowing a chest exists is not knowing its contents, or every search
   * result leaks a container (invariant I11, RB-21d:683-686).
   */
  readonly sichtAnker: EntryId | null;
}

/**
 * Der Ortsleger's honest root. **The GM is never asked "wo hängt das?" before she can play**
 * (N6, OPEN-DECISIONS.md:130). One row, one name, one breadcrumb reading „noch nicht verortet".
 * It satisfies the one-parent invariant, it lets her play tonight, and re-parenting later is
 * one keypress and an audit row.
 *
 * Gate W-G9 makes the claim falsifiable: the containment graph must contribute **zero** of
 * P6's <=7 named concepts on the path to a first minted paragraph.
 */
export const UNVERORTET_TITEL = "Unverortet";

// ---------------------------------------------------------------------------------------
// Ort — the generated place, and why it is a door and not an article
// ---------------------------------------------------------------------------------------

/**
 * The surviving record from the generation brief (RB-20d:383-388) — *"and it renders,
 * everywhere in the product, as **a red link with a seed behind it**."*
 *
 * The design finding this encodes (RB-20d:63-67): a generated world arrives with ~1,000
 * settlements. Naive generation converts 690 doors into 1,000 stubs — and *„der rote Link ist
 * eine Tür"* only exists while there are red links. **A generator that writes articles
 * destroys the flex it was supposed to feed.** Hence: the generator emits doors, not articles.
 */
export interface Ort {
  readonly id: KnotenId;
  readonly name: string;
  readonly x: number;
  readonly y: number;
  readonly typ: string;
  readonly eltern: readonly Kante[];
  readonly herkunft: Herkunft;
  /** Generator facts shown on the pin. Data, never prose. */
  readonly merkmale: Readonly<Record<string, CanonicalValue>>;
  /**
   * A derived seed, if this place can itself seed a child artefact (a city, a dungeon).
   * The cross-scale mechanism read out of the generator's own source (RB-21d:143-157).
   */
  readonly kindKeim?: string;
}

/**
 * `ErzeugerAdapter` — the whole point of the generation half.
 *
 * N3 (OPEN-DECISIONS.md:127) rules **import-only for slice 1 and 2**, and conditions the
 * embed. The reason the ruling is cheap to reverse is exactly this interface:
 * *"`ErzeugerAdapter: (Weltkeim) → Ort[]` makes import, embed and reimplement three
 * implementations of one interface."*
 *
 * Refused by the same ruling: shipping the generator's `dist/`. Its build copies 21.49 MB of
 * `public/` verbatim, which ships **179 CC-BY-NC-SA charges**, a **GPLv2+ TinyMCE**, and a
 * 2016 jQuery with three published CVEs (RB-21c). Import-only owes none of it.
 */
export interface ErzeugerAdapter {
  readonly name: string;
  readonly version: string;
  erzeuge(keim: Weltkeim): Promise<readonly Ort[]>;
}

// ---------------------------------------------------------------------------------------
// Scene document and entity binding
// ---------------------------------------------------------------------------------------

export interface PyramidRef {
  readonly basisUrl: string;
  readonly kachelgroesse: number;
  readonly ebenen: number;
}

/**
 * `Stamp` is field-for-field what a GPU particle container's data model already is
 * (RB-20b:167-170) — which is why the bulk layer is cheap and the *entity* layer is the
 * expensive, differentiating one.
 */
export interface Stamp {
  readonly id: string;
  /** Pack-qualified asset reference, e.g. "pk.wald/baum_7" — **never a URL**. */
  readonly a: string;
  readonly x: number;
  readonly y: number;
  readonly s: number;
  readonly r: number;
  readonly l: number;
  readonly t?: number;
  readonly f?: number;
}

export interface SceneDoc {
  readonly v: 3;
  readonly size: readonly [number, number];
  readonly base?: PyramidRef;
  readonly stamps: readonly Stamp[];
  readonly regions: readonly Region[];
  readonly places: readonly PlacePoint[];
}

export interface Region {
  readonly id: string;
  readonly punkte: readonly (readonly [number, number])[];
}

export interface PlacePoint {
  readonly id: string;
  readonly x: number;
  readonly y: number;
}

/**
 * **The entity binding is not a field on the stamp** (RB-20b:86-96). The trap it avoids: if
 * every tree is a row in the knowledge graph, dragging a forest writes 400 wiki mutations.
 * **Stamps are anonymous by default and promoted on purpose** — the anti-log invariant applied
 * to geometry.
 *
 * Because the anchor is a separate row keyed by scene, **one place may appear on many maps**.
 */
export interface MapAnchor {
  readonly sceneId: string;
  readonly ziel:
    | { readonly kind: "stamp"; readonly id: string }
    | { readonly kind: "region"; readonly id: string }
    | { readonly kind: "place"; readonly id: string };
  readonly entryId: EntryId;
  readonly passageId?: PassageId;
}
