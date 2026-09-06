import type { ProjectedMapScene } from "./model.ts";

/**
 * Der Budgetwächter — a pure, camera-free accountant that answers one question about a scene
 * before a single pixel of it is ever asked to render: does it fit inside the numbers the product
 * has committed to in CI?
 *
 * Those numbers are not house style; they are a gate with a name attached to it. Verbatim, from
 * `design/06-giga-product-architecture.md` §20.4 (G-PERF1, which restates
 * `design/research/RB-02-rendering-tech.md`'s "Performance budget proposal"):
 *
 * > "CI misst diese Grenzen auf der benannten Referenzklasse; „läuft auf meinem Rechner" ist kein
 * > Gate."
 *
 * The named reference class is a laptop with an integrated GPU, vintage 2020–2022 — a developer's
 * own desktop does not get a vote (this repo's own `docs/TACTICAL_PERFORMANCE.md` baseline run was
 * explicitly disqualified for exactly that reason: an RTX 5080 desktop, not the reference class).
 * The budget, restated here so this file is a single citable source rather than a paraphrase (see
 * also the exact byte/pixel/count constants CI actually asserts, in the `limits` object of
 * `e2e/tactical-performance.spec.ts`):
 *
 *   60 fps during pan/zoom · 300 scene tokens (max 100 visible and animated) · 20 dynamic lights
 *   (max 8 animated) · 1,500 wall segments · <=150 draw calls · ZERO hot-path allocations per frame
 *   · first-interactive shell <=1.2 MB compressed · 144-megapixel maps only via tiling, never as
 *   one texture · no single texture larger than 4096x4096 · at most 16 distinct textures per frame
 *
 * Not every one of those twelve numbers can be *evaluated* from a `ProjectedMapScene` alone, and
 * this module says so rather than faking a check:
 *
 * - Frame rate, hot-path allocation count and shell bundle size are properties of running code and
 *   a built artifact, not of scene data. `docs/TACTICAL_PERFORMANCE.md`'s Playwright harness is
 *   where those are actually measured, on real (if not always reference-class) hardware.
 * - "Max 100 visible and animated" tokens and "max 8 animated" lights need a live camera and an
 *   animation clock, which this module deliberately does not take. That per-frame, camera-aware
 *   half of the budget is the sibling `stapel.ts`'s job — its `massenAb`/`maxTexturen` answer "is
 *   THIS frame cheap enough", exactly the question next to this file's "is this SCENE, as
 *   authored, within bounds at all".
 * - Raster tile count and pixel dimensions (the 144 MP and 4096² limits) live in `MapRasterTile`
 *   bitmaps handed to the renderer out of band, through `setRasterTiles`/`setStampImages`, never
 *   inside `ProjectedMapScene` itself — a scene alone carries nothing to size them by.
 *
 * Every one of the twelve numbers still gets a field on `BudgetGrenzen` below — overridable, as
 * asked — because a budget a reader cannot see in full is a budget only half-documented. The four
 * that *are* mechanically checkable from scene content alone (total tokens, wall segments, draw
 * calls, distinct textures) are the ones `pruefeBudget` actually evaluates into `ueberschreitungen`.
 *
 * Pure by construction: no `pixi.js`, no DOM, no timers, no clock. This is a pre-flight gate meant
 * to run anywhere — a unit test, a CI step, a content-authoring tool — long before a `MapRenderer`
 * exists to hand a GPU anything.
 */
export interface BudgetGrenzen {
  /**
   * Pan/zoom target frame rate on the reference laptop (design/06 §20.4; RB-02's "Performance
   * budget proposal", restated numerically as `frameMs: 16.7` in `e2e/tactical-performance.spec.ts`).
   * Not evaluated by `pruefeBudget`: a static scene carries no timing signal at all.
   */
  readonly zielBildrateHz: number;
  /** Total scene tokens a scene may declare. Checked against `scene.tokens?.length`. */
  readonly maxTokensGesamt: number;
  /**
   * Of those, at most this many may be visible AND animated at the same instant. Needs a live
   * camera and an animation clock this module does not take; the camera-aware half of this budget
   * is `stapel.ts`'s `massenAb`.
   */
  readonly maxSichtbareAnimierteTokens: number;
  /**
   * Total dynamic lights a scene may declare. `ProjectedMapScene` carries no lights projection at
   * all yet (see the `lichter` comment inside `pruefeBudget`), so this is never evaluated today.
   */
  readonly maxLichterGesamt: number;
  /** Of those, at most this many may animate/flicker. Same data-model gap as `maxLichterGesamt`. */
  readonly maxAnimierteLichter: number;
  /** Straight wall-segment edges, summed across every `scene.lines` polyline. Checked. */
  readonly maxWandSegmente: number;
  /** Estimated draw calls for the whole scene — see the model documented inside `pruefeBudget`. Checked. */
  readonly maxZeichenaufrufe: number;
  /**
   * Target allocation count inside the renderer's per-frame hot path. A property of running code,
   * not of scene data; verified by code review and by `stapel.test.ts`'s CPU-planning benchmark,
   * never by this function.
   */
  readonly hotPathAllokationenProFrame: number;
  /**
   * First-interactive shell size, gzip-equivalent bytes (`compressedShellBytes` in
   * `e2e/tactical-performance.spec.ts`). A build-artifact property, measured there, not here.
   */
  readonly maxShellBytesKomprimiert: number;
  /** Total base-map megapixels permitted, and only ever reachable via tiling. Raster tiles are supplied out of band; unevaluated here. */
  readonly maxKartenMegapixel: number;
  /** No single texture's longer edge may exceed this many pixels. Same out-of-band gap as `maxKartenMegapixel`. */
  readonly maxTexturKantenlaenge: number;
  /**
   * Distinct textures bound in one frame — PixiJS's own batch-renderer limit (RB-02; restated as
   * `STANDARD_MAX_TEXTUREN` in the sibling `stapel.ts` and as `boundTextures` in the e2e harness).
   * Checked, counted here from distinct `stamp.asset` values across the whole scene.
   */
  readonly maxTexturen: number;
}

/** The values quoted in the header comment above, as data. `budget.test.ts` asserts the two never drift apart. */
export const RENDER_BUDGET: BudgetGrenzen = {
  zielBildrateHz: 60,
  maxTokensGesamt: 300,
  maxSichtbareAnimierteTokens: 100,
  maxLichterGesamt: 20,
  maxAnimierteLichter: 8,
  maxWandSegmente: 1_500,
  maxZeichenaufrufe: 150,
  hotPathAllokationenProFrame: 0,
  maxShellBytesKomprimiert: 1_200_000,
  maxKartenMegapixel: 144,
  maxTexturKantenlaenge: 4096,
  maxTexturen: 16,
};

export interface Ueberschreitung {
  readonly feld: string;
  readonly ist: number;
  readonly grenze: number;
  readonly schwere: "warnung" | "verletzung";
}

export interface BudgetBericht {
  readonly zeichenaufrufe: number;
  readonly texturen: number;
  readonly tokens: number;
  readonly waende: number;
  readonly lichter: number;
  readonly stamps: number;
  readonly ueberschreitungen: readonly Ueberschreitung[];
  readonly haelt: boolean;
}

/**
 * Classifies one measured field against its limit and appends an entry when it is worth
 * surfacing. Nothing is pushed below 90 % of the limit — a scene at 40 tokens against a 300-token
 * budget is unremarkable, and a caller scanning `ueberschreitungen` should see only fields that
 * need a decision, not a full scorecard. `"warnung"` covers 90–100 % inclusive; `"verletzung"` is
 * strictly above 100 %. Only a `"verletzung"` may ever fail `haelt` — a scene can carry warnings
 * and still ship, by design (the brief: "A warning does not make `haelt` false").
 */
function pruefeFeld(feld: string, ist: number, grenze: number, ziel: Ueberschreitung[]): void {
  if (grenze <= 0) {
    // A caller-supplied zero/negative override reads as "none of this allowed at all"; any count
    // above zero is then a violation outright, since a percentage of a non-positive limit is
    // meaningless.
    if (ist > 0) ziel.push({ feld, ist, grenze, schwere: "verletzung" });
    return;
  }
  if (ist > grenze) ziel.push({ feld, ist, grenze, schwere: "verletzung" });
  else if (ist >= grenze * 0.9) ziel.push({ feld, ist, grenze, schwere: "warnung" });
}

/**
 * Answers, for one scene, whether it fits inside the render budget — before anything renders it.
 *
 * Every `grenzen` field is independently overridable; unspecified fields fall back to
 * `RENDER_BUDGET`.
 */
export function pruefeBudget(scene: ProjectedMapScene, grenzen?: Partial<BudgetGrenzen>): BudgetBericht {
  const g: BudgetGrenzen = { ...RENDER_BUDGET, ...grenzen };

  const tokens = scene.tokens?.length ?? 0;

  // A `ProjectedMapLine`'s `points` form one connected polyline; `renderer.ts#drawWalls` walks it
  // with one `moveTo` and `points.length - 1` `lineTo` calls. A "wall segment" is exactly one such
  // edge — the same granularity `docs/TACTICAL_PERFORMANCE.md`'s 1,500-wall-segment fixture
  // describes — so a single two-point line is one segment, not one wall.
  let waende = 0;
  for (const line of scene.lines ?? []) waende += Math.max(0, line.points.length - 1);

  // Distinct stamp assets, the same bucketing key `planeStapel` groups by in the sibling
  // `stapel.ts` — one bound texture per asset. The difference: this accountant counts every stamp
  // in the whole scene, not only the ones a particular camera would currently cull in. The two
  // numbers can legitimately differ (a scene may hold far more distinct assets than any one view
  // ever shows at once); this file's number is the one a pre-render, per-scene gate needs, because
  // a scene is authored once and panned many times.
  const stampAssets = new Set<string>();
  for (const stamp of scene.stamps ?? []) stampAssets.add(stamp.asset);
  const texturen = stampAssets.size;
  const stamps = scene.stamps?.length ?? 0;

  /**
   * Draw-call model — approximate on purpose, and documented here rather than left implicit:
   *
   * 1. Sprites sharing a texture batch into one call. Every stamp becomes a `Sprite` in
   *    `renderer.ts#drawStamps`; PixiJS's batch renderer merges same-texture sprites, so a bucket
   *    of any number of stamps on one asset still costs exactly one call. That is the entire
   *    reason `texturen` above is bucketed by asset instead of counted per stamp.
   * 2. Each distinct texture starts a new batch. `stampZeichenaufrufe` below is therefore exactly
   *    `texturen` — one call per bound asset, never per stamp.
   * 3. A `Graphics` object with its own fill is its own call. `renderer.ts#draw` allocates one
   *    `new Graphics()` per cell and one more per pin/token: none of those share a texture with
   *    anything else, so each is counted individually, one call per cell/pin/token. Walls and the
   *    grid are the opposite case: `wallsOverlay` and `gridOverlay` are each a single, persistent
   *    `Graphics` instance that every wall line, respectively every grid line, is drawn into — one
   *    object, so at most one call each, independent of how many lines or segments it holds.
   *    PixiJS's batcher also does not open a new texture batch for a plain-color stroke or fill
   *    (solid shapes share an internal 1×1 white texture regardless of tint), so per-line color
   *    changes inside `wallsOverlay` do not multiply its call count either.
   *
   * Raster tiles are excluded entirely: `MapRasterTile` bitmaps reach the renderer out of band via
   * `setRasterTiles`, never through `ProjectedMapScene`, so a scene alone carries no tile count to
   * estimate from. That gap is real and stated, not hidden — see the header comment above.
   *
   * Being approximately right about what the renderer actually does, and saying so, beats being
   * precisely wrong about PixiJS internals this module has no access to.
   */
  const wandZeichenaufrufe = (scene.lines?.length ?? 0) > 0 ? 1 : 0;
  const gridZeichenaufrufe = scene.grid && scene.grid.kind !== "none" ? 1 : 0;
  const stampZeichenaufrufe = texturen;
  const zeichenaufrufe = scene.cells.length + scene.pins.length + tokens + wandZeichenaufrufe + gridZeichenaufrufe + stampZeichenaufrufe;

  // `ProjectedMapScene` — the render package's own presentation boundary — carries no lights
  // projection at all today (see `model.ts`). This repo's own tactical-performance evidence
  // confirms the current state in its own words: "zero rendered dynamic lights", despite 20
  // persisted light definitions in the domain model. Reporting 0 here is an honest reading of the
  // data this function actually receives, not a silent pass: the limits stay on `BudgetGrenzen` so
  // a future lights projection can be wired in without changing this function's contract, and a
  // reader wondering why `lichter` is always 0 finds the answer right here.
  const lichter = 0;

  const ueberschreitungen: Ueberschreitung[] = [];
  pruefeFeld("tokens", tokens, g.maxTokensGesamt, ueberschreitungen);
  pruefeFeld("waende", waende, g.maxWandSegmente, ueberschreitungen);
  pruefeFeld("zeichenaufrufe", zeichenaufrufe, g.maxZeichenaufrufe, ueberschreitungen);
  pruefeFeld("texturen", texturen, g.maxTexturen, ueberschreitungen);

  const haelt = ueberschreitungen.every((u) => u.schwere !== "verletzung");

  return { zeichenaufrufe, texturen, tokens, waende, lichter, stamps, ueberschreitungen, haelt };
}
