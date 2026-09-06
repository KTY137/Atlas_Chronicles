import { describe, expect, it } from "vitest";
import { pruefeBudget, RENDER_BUDGET } from "../src/budget.ts";
import type { ProjectedMapScene, ProjectedMapStamp, ProjectedMapToken, MapPoint } from "../src/model.ts";

function szene(overrides: Partial<ProjectedMapScene> = {}): ProjectedMapScene {
  return { id: "szene-1", width: 1_000, height: 1_000, cells: [], pins: [], ...overrides };
}

function zelle(id: string) {
  return { id, polygon: [[0, 0], [1, 0], [0, 1]] as MapPoint[] };
}

function marke(overrides: Partial<ProjectedMapToken> & Pick<ProjectedMapToken, "id">): ProjectedMapToken {
  return { x: 0, y: 0, label: overrides.id, ...overrides };
}

function stempel(overrides: Partial<ProjectedMapStamp> & Pick<ProjectedMapStamp, "id">): ProjectedMapStamp {
  return { asset: "pk.wald/baum", x: 0, y: 0, s: 1, r: 0, l: 0, ...overrides };
}

/** A polyline of `punkte` points, i.e. `punkte - 1` straight wall segments. */
function linie(id: string, punkte: number) {
  return { id, points: Array.from({ length: punkte }, (_, i) => [i, 0] as MapPoint) };
}

describe("pruefeBudget — baseline", () => {
  it("holds for an empty scene, with nothing to report", () => {
    const bericht = pruefeBudget(szene());
    expect(bericht).toEqual({
      zeichenaufrufe: 0, texturen: 0, tokens: 0, waende: 0, lichter: 0, stamps: 0,
      ueberschreitungen: [], haelt: true,
    });
  });

  it("always reports zero lichter — ProjectedMapScene carries no lights projection yet", () => {
    // Deliberately not a trivial scene: crowd every other field and confirm lights stay 0
    // regardless, because there is nothing in the render package's presentation model to count.
    const scene = szene({
      pins: [{ id: "p1", x: 1, y: 1, label: "pin" }],
      tokens: [marke({ id: "t1" })],
      stamps: [stempel({ id: "s1" })],
      lines: [linie("l1", 3)],
    });
    expect(pruefeBudget(scene).lichter).toBe(0);
  });
});

describe("pruefeBudget — a field at, below and above its limit (draw calls via cell count)", () => {
  // Cells are the cleanest vehicle for isolated single-field tests: a cell contributes to
  // `zeichenaufrufe` (one `Graphics` object each in `renderer.ts#draw`) and to nothing else, so
  // scaling cell count cannot accidentally trip `tokens`, `waende` or `texturen` too.

  it("holds exactly at the draw-call limit, but still reports the approaching warning", () => {
    const scene = szene({ cells: Array.from({ length: RENDER_BUDGET.maxZeichenaufrufe }, (_, i) => zelle(`c${i}`)) });
    const bericht = pruefeBudget(scene);
    expect(bericht.zeichenaufrufe).toBe(RENDER_BUDGET.maxZeichenaufrufe);
    expect(bericht.haelt).toBe(true);
    expect(bericht.ueberschreitungen).toEqual([
      { feld: "zeichenaufrufe", ist: RENDER_BUDGET.maxZeichenaufrufe, grenze: RENDER_BUDGET.maxZeichenaufrufe, schwere: "warnung" },
    ]);
  });

  it("violates one over the draw-call limit and names the exact field, ist and grenze", () => {
    const ueberLimit = RENDER_BUDGET.maxZeichenaufrufe + 1;
    const scene = szene({ cells: Array.from({ length: ueberLimit }, (_, i) => zelle(`c${i}`)) });
    const bericht = pruefeBudget(scene);
    expect(bericht.haelt).toBe(false);
    expect(bericht.ueberschreitungen).toEqual([
      { feld: "zeichenaufrufe", ist: ueberLimit, grenze: RENDER_BUDGET.maxZeichenaufrufe, schwere: "verletzung" },
    ]);
  });

  it("warns at exactly 90% of the draw-call limit but still holds", () => {
    const neunzigProzent = Math.round(RENDER_BUDGET.maxZeichenaufrufe * 0.9);
    const scene = szene({ cells: Array.from({ length: neunzigProzent }, (_, i) => zelle(`c${i}`)) });
    const bericht = pruefeBudget(scene);
    expect(bericht.haelt).toBe(true);
    expect(bericht.ueberschreitungen).toEqual([
      { feld: "zeichenaufrufe", ist: neunzigProzent, grenze: RENDER_BUDGET.maxZeichenaufrufe, schwere: "warnung" },
    ]);
  });

  it("stays silent well under 90% of a limit — no entry, not even an unrelated warning", () => {
    const scene = szene({ cells: [zelle("c0"), zelle("c1")] });
    const bericht = pruefeBudget(scene);
    expect(bericht.ueberschreitungen).toEqual([]);
    expect(bericht.haelt).toBe(true);
  });
});

describe("pruefeBudget — the batching claim (stamps and textures)", () => {
  it("keeps many stamps sharing ONE asset cheap: one texture, one draw call, however many stamps", () => {
    const stamps = Array.from({ length: 5_000 }, (_, i) => stempel({ id: `s${i}`, asset: "pk.wald/baum" }));
    const bericht = pruefeBudget(szene({ stamps }));
    expect(bericht.stamps).toBe(5_000);
    expect(bericht.texturen).toBe(1);
    expect(bericht.zeichenaufrufe).toBe(1);
    expect(bericht.haelt).toBe(true);
    expect(bericht.ueberschreitungen).toEqual([]);
  });

  it("blows the texture bound when stamps use many DISTINCT assets, even with few stamps", () => {
    const stamps = Array.from({ length: RENDER_BUDGET.maxTexturen + 4 }, (_, i) => stempel({ id: `s${i}`, asset: `pk.wald/art-${i}` }));
    const bericht = pruefeBudget(szene({ stamps }));
    expect(bericht.texturen).toBe(RENDER_BUDGET.maxTexturen + 4);
    expect(bericht.haelt).toBe(false);
    expect(bericht.ueberschreitungen).toEqual([
      { feld: "texturen", ist: RENDER_BUDGET.maxTexturen + 4, grenze: RENDER_BUDGET.maxTexturen, schwere: "verletzung" },
    ]);
  });

  it("reports `stamps` as the total placement count, independent of `texturen`'s distinct-asset count", () => {
    const stamps = [
      stempel({ id: "a", asset: "pk.wald/baum" }), stempel({ id: "b", asset: "pk.wald/baum" }),
      stempel({ id: "c", asset: "pk.wald/fels" }), stempel({ id: "d", asset: "pk.wald/busch" }),
    ];
    const bericht = pruefeBudget(szene({ stamps }));
    expect(bericht.stamps).toBe(4);
    expect(bericht.texturen).toBe(3);
  });
});

describe("pruefeBudget — wall segments", () => {
  it("sums segments across every polyline (points - 1 each), not the number of lines", () => {
    const scene = szene({ lines: [linie("l1", 3), linie("l2", 5)] }); // 2 + 4 = 6 segments
    expect(pruefeBudget(scene).waende).toBe(6);
  });

  it("violates the wall-segment limit while the draw-call model still counts the wall layer as ONE call", () => {
    const uebersegmente = RENDER_BUDGET.maxWandSegmente + 1;
    const scene = szene({ lines: [linie("l1", uebersegmente + 1)] }); // N points = N-1 segments
    const bericht = pruefeBudget(scene);
    expect(bericht.waende).toBe(uebersegmente);
    // The wall overlay is a single persistent `Graphics` instance in `renderer.ts`; however many
    // segments it strokes, it is still one call — the whole reason a wall-segment budget and a
    // draw-call budget are tracked as two separate numbers in the header.
    expect(bericht.zeichenaufrufe).toBe(1);
    expect(bericht.ueberschreitungen).toEqual([
      { feld: "waende", ist: uebersegmente, grenze: RENDER_BUDGET.maxWandSegmente, schwere: "verletzung" },
    ]);
    expect(bericht.haelt).toBe(false);
  });
});

describe("pruefeBudget — grid contributes at most one draw call", () => {
  it("adds nothing when the grid is absent or explicitly 'none'", () => {
    expect(pruefeBudget(szene()).zeichenaufrufe).toBe(0);
    expect(pruefeBudget(szene({ grid: { kind: "none" } })).zeichenaufrufe).toBe(0);
  });

  it("adds exactly one call for a real grid, regardless of grid density", () => {
    const scene = szene({ grid: { kind: "square", size: 32, origin: [0, 0] } });
    expect(pruefeBudget(scene).zeichenaufrufe).toBe(1);
  });
});

describe("pruefeBudget — every checkable limit is individually overridable", () => {
  it("raises the draw-call ceiling", () => {
    const scene = szene({ cells: Array.from({ length: RENDER_BUDGET.maxZeichenaufrufe + 1 }, (_, i) => zelle(`c${i}`)) });
    expect(pruefeBudget(scene, { maxZeichenaufrufe: 1_000 }).haelt).toBe(true);
  });

  it("raises the wall-segment ceiling", () => {
    const scene = szene({ lines: [linie("l1", RENDER_BUDGET.maxWandSegmente + 2)] });
    expect(pruefeBudget(scene, { maxWandSegmente: 10_000 }).haelt).toBe(true);
  });

  it("raises the distinct-texture ceiling", () => {
    const stamps = Array.from({ length: RENDER_BUDGET.maxTexturen + 4 }, (_, i) => stempel({ id: `s${i}`, asset: `pk.wald/art-${i}` }));
    expect(pruefeBudget(szene({ stamps }), { maxTexturen: 100 }).haelt).toBe(true);
  });

  it("raises the token ceiling, though tokens couples into draw calls in the current renderer", () => {
    // Every token is its own `Graphics` circle in `renderer.ts#draw` (never batched), so any scene
    // exceeding `maxTokensGesamt` (300) also exceeds the far smaller `maxZeichenaufrufe` (150) on
    // token count alone. Overriding `maxTokensGesamt` correctly clears the `tokens` entry; it
    // cannot and should not silently clear the separate, still-true `zeichenaufrufe` violation.
    const tokens = Array.from({ length: RENDER_BUDGET.maxTokensGesamt + 1 }, (_, i) => marke({ id: `t${i}` }));
    const bericht = pruefeBudget(szene({ tokens }), { maxTokensGesamt: 10_000 });
    expect(bericht.ueberschreitungen.some((u) => u.feld === "tokens")).toBe(false);
    expect(bericht.ueberschreitungen.some((u) => u.feld === "zeichenaufrufe")).toBe(true);
  });

  it("accepts an override for every field in BudgetGrenzen at once without altering an otherwise-compliant scene", () => {
    const scene = szene({ tokens: [marke({ id: "t0" })], stamps: [stempel({ id: "s0" })], lines: [linie("l0", 2)] });
    const bericht = pruefeBudget(scene, {
      zielBildrateHz: 30, maxTokensGesamt: 1, maxSichtbareAnimierteTokens: 1, maxLichterGesamt: 1,
      maxAnimierteLichter: 1, maxWandSegmente: 1, maxZeichenaufrufe: 1_000, hotPathAllokationenProFrame: 0,
      maxShellBytesKomprimiert: 1, maxKartenMegapixel: 1, maxTexturKantenlaenge: 1, maxTexturen: 1,
    });
    expect(bericht.haelt).toBe(true);
  });
});

describe("pruefeBudget — multiple simultaneous violations", () => {
  it("reports exactly three entries when three limits break and a fourth stays comfortable", () => {
    const tokens = Array.from({ length: RENDER_BUDGET.maxTokensGesamt + 1 }, (_, i) => marke({ id: `t${i}` })); // breaks tokens (301)
    const lines = [linie("wand", RENDER_BUDGET.maxWandSegmente + 2)]; // breaks waende (1501)
    // 100 stamps sharing one asset: keeps texturen at 1, far under its limit.
    const stamps = Array.from({ length: 100 }, (_, i) => stempel({ id: `s${i}`, asset: "pk.wald/baum" }));
    const bericht = pruefeBudget(szene({ tokens, lines, stamps }));
    // zeichenaufrufe = 0 cells + 0 pins + 301 tokens + 1 wall layer + 0 grid + 1 stamp batch = 303,
    // which also breaks maxZeichenaufrufe (150) — an honest consequence of unbatched token drawing,
    // not a fourth independently chosen violation.
    expect(bericht.zeichenaufrufe).toBe(303);
    expect(bericht.texturen).toBe(1);
    expect(bericht.haelt).toBe(false);
    expect(bericht.ueberschreitungen).toHaveLength(3);
    expect(new Set(bericht.ueberschreitungen.map((u) => u.feld))).toEqual(new Set(["tokens", "waende", "zeichenaufrufe"]));
    expect(bericht.ueberschreitungen.every((u) => u.schwere === "verletzung")).toBe(true);
  });
});

describe("RENDER_BUDGET — matches the numbers quoted in the header comment", () => {
  it("carries exactly the twelve budgeted numbers documented at the top of budget.ts", () => {
    // A budget that drifts from its own documentation is worse than none — this pins RENDER_BUDGET
    // to the literal quote in the header, so an edit to one without the other fails loudly here.
    expect(RENDER_BUDGET.zielBildrateHz).toBe(60);
    expect(RENDER_BUDGET.maxTokensGesamt).toBe(300);
    expect(RENDER_BUDGET.maxSichtbareAnimierteTokens).toBe(100);
    expect(RENDER_BUDGET.maxLichterGesamt).toBe(20);
    expect(RENDER_BUDGET.maxAnimierteLichter).toBe(8);
    expect(RENDER_BUDGET.maxWandSegmente).toBe(1_500);
    expect(RENDER_BUDGET.maxZeichenaufrufe).toBe(150);
    expect(RENDER_BUDGET.hotPathAllokationenProFrame).toBe(0);
    expect(RENDER_BUDGET.maxShellBytesKomprimiert).toBe(1_200_000);
    expect(RENDER_BUDGET.maxKartenMegapixel).toBe(144);
    expect(RENDER_BUDGET.maxTexturKantenlaenge).toBe(4096);
    expect(RENDER_BUDGET.maxTexturen).toBe(16);
  });
});
