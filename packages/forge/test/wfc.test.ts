import { describe, expect, it } from "vitest";
import { loeseWfc, WfcError, type WfcAuftrag, type WfcKachel } from "../src/wfc.ts";

/**
 * `loeseWfc` — Wave Function Collapse as a pure function over an explicit tileset.
 *
 * What matters here is not "does the maze look nice", it is the handful of guarantees the module
 * doc comment promises and that a plausible-looking implementation can still get wrong:
 *
 *  - **Determinism is the product.** A generator whose replay depends on iteration order over a
 *    `Set`, or on wall-clock jitter, is not deterministic even if it usually looks stable in a
 *    quick manual check — so this is tested as byte-for-byte equality of the whole result, twice.
 *  - **Sockets are a real constraint, not a label that happens to be ignored.** The "stripe" fixture
 *    below is built so that *only* correct propagation produces a contradiction-free grid — a
 *    solver that let mismatched tiles touch would either contradict constantly or (worse) silently
 *    accept an invalid neighbour, and both are checked against directly.
 *  - **The step cap is the only thing standing between a bad tileset and a hang**, per Gumin's own
 *    concession that satisfiability isn't decidable cheaply. So the cap is tested with a tileset
 *    engineered to never agree with itself, not with a tileset that merely runs long.
 *  - **A contradiction is data, not an exception.** Thrown-vs-returned is exactly the kind of thing
 *    a later refactor flips by accident, so it gets its own assertion, separate from the cap test.
 */

const NORD = 0, OST = 1, SUED = 2, WEST = 3;

/**
 * Every socket is `"x"`, on every tile, on every edge — so `kompatibel` is true for *any* pair in
 * *any* direction and propagation never narrows anything. That is deliberate: it turns every cell
 * into an independent weighted draw, which is exactly what the "different keim" and "weights are
 * honoured" tests need — no adjacency confound, one draw per cell.
 */
const OFFENES_SET: readonly WfcKachel[] = [
  { id: "leicht", gewicht: 1, kanten: ["x", "x", "x", "x"] },
  { id: "schwer", gewicht: 3, kanten: ["x", "x", "x", "x"] },
];

const DREIFARBIG_SET: readonly WfcKachel[] = [
  { id: "rot", gewicht: 1, kanten: ["x", "x", "x", "x"] },
  { id: "gruen", gewicht: 1, kanten: ["x", "x", "x", "x"] },
  { id: "blau", gewicht: 1, kanten: ["x", "x", "x", "x"] },
];

/**
 * North/south sockets are the shared value `"flur"` on every tile, so vertical adjacency is free.
 * East/west sockets are each tile's own unique label, so a tile can only sit horizontally next to
 * itself. The only contradiction-free solution is therefore horizontal stripes — a real,
 * non-vacuous test that propagation actually enforces the sockets it was given, not just that it
 * never complains.
 */
const STREIFEN_SET: readonly WfcKachel[] = [
  { id: "rot", gewicht: 1, kanten: ["flur", "rot", "flur", "rot"] },
  { id: "gruen", gewicht: 1, kanten: ["flur", "gruen", "flur", "gruen"] },
  { id: "blau", gewicht: 1, kanten: ["flur", "blau", "flur", "blau"] },
];

/** Self-compatible: north/east/south/west are all the same socket, so it tiles infinitely. */
const EINZELKACHEL: readonly WfcKachel[] = [{ id: "boden", gewicht: 1, kanten: ["flur", "flur", "flur", "flur"] }];

/**
 * Two tiles, eight distinct socket strings — no tile matches itself and no tile matches the
 * other, in any direction. The first collapse anywhere in the grid contradicts every one of its
 * neighbours. This is "deliberately unsatisfiable" in the strongest sense available: not merely
 * hard, but constructed so agreement is impossible.
 */
const UNMOEGLICHES_SET: readonly WfcKachel[] = [
  { id: "a", gewicht: 1, kanten: ["a-n", "a-o", "a-s", "a-w"] },
  { id: "b", gewicht: 1, kanten: ["b-n", "b-o", "b-s", "b-w"] },
];

describe("WFC · loeseWfc — deterministisches, begrenztes Kollabieren", () => {
  it("liefert für denselben Keim und denselben Auftrag zweimal ein byte-identisches Ergebnis", () => {
    const auftrag: WfcAuftrag = { keim: "wfc:determinismus:1", breite: 12, hoehe: 9, kacheln: DREIFARBIG_SET };
    const a = loeseWfc(auftrag);
    const b = loeseWfc(auftrag);
    expect(b).toStrictEqual(a);
    expect(JSON.stringify(b)).toBe(JSON.stringify(a));
  });

  it("mintet für einen anderen Keim ein anderes Raster", () => {
    const basis = { breite: 6, hoehe: 6, kacheln: DREIFARBIG_SET } as const;
    const a = loeseWfc({ ...basis, keim: "wfc:keim:a" });
    const b = loeseWfc({ ...basis, keim: "wfc:keim:b" });
    expect(a.raster).not.toEqual(b.raster);
  });

  it("löst ein 1x1-Raster ohne Nachbarn", () => {
    const ergebnis = loeseWfc({ keim: "wfc:1x1", breite: 1, hoehe: 1, kacheln: DREIFARBIG_SET });
    expect(ergebnis.raster).toHaveLength(1);
    expect(ergebnis.vollstaendig).toBe(true);
    expect(ergebnis.widersprueche).toBe(0);
    expect(DREIFARBIG_SET.map((k) => k.id)).toContain(ergebnis.raster[0]);
  });

  it("füllt mit genau einer selbstverträglichen Kachel das gesamte Raster", () => {
    const breite = 11, hoehe = 7;
    const ergebnis = loeseWfc({ keim: "wfc:einzelkachel", breite, hoehe, kacheln: EINZELKACHEL });
    expect(ergebnis.vollstaendig).toBe(true);
    expect(ergebnis.widersprueche).toBe(0);
    expect(ergebnis.raster).toHaveLength(breite * hoehe);
    expect(ergebnis.raster.every((wert) => wert === "boden")).toBe(true);
  });

  it("erzeugt in einem vollständigen Raster nur Nachbarschaften mit passenden Sockeln", () => {
    const breite = 8, hoehe = 6;
    const ergebnis = loeseWfc({ keim: "wfc:sockel:1", breite, hoehe, kacheln: STREIFEN_SET });
    // The stripe tileset is constructed so a contradiction-free solve is always reachable — if
    // this is false, propagation (not the test) is the thing that is wrong.
    expect(ergebnis.vollstaendig).toBe(true);
    expect(ergebnis.widersprueche).toBe(0);

    const kachelnNachId = new Map(STREIFEN_SET.map((k) => [k.id, k] as const));
    for (let y = 0; y < hoehe; y++) {
      for (let x = 0; x < breite; x++) {
        const hierId = ergebnis.raster[y * breite + x];
        const hier = kachelnNachId.get(hierId!)!;
        if (x + 1 < breite) {
          const rechts = kachelnNachId.get(ergebnis.raster[y * breite + x + 1]!)!;
          expect(hier.kanten[OST]).toBe(rechts.kanten[WEST]);
        }
        if (y + 1 < hoehe) {
          const unten = kachelnNachId.get(ergebnis.raster[(y + 1) * breite + x]!)!;
          expect(hier.kanten[SUED]).toBe(unten.kanten[NORD]);
        }
      }
    }
  });

  it("hält den Schrittdeckel bei einem grundsätzlich unlösbaren Tileset ein, statt zu hängen", () => {
    const breite = 40, hoehe = 40, maxSchritte = 50;
    const ergebnis = loeseWfc({ keim: "wfc:deckel:1", breite, hoehe, kacheln: UNMOEGLICHES_SET, maxSchritte });
    expect(ergebnis.raster).toHaveLength(breite * hoehe);
    expect(ergebnis.schritte).toBeLessThanOrEqual(maxSchritte);
    expect(ergebnis.vollstaendig).toBe(false);
    // 1600 cells cannot possibly be fully decided within 50 units of work — the cap, not luck,
    // is what stopped this run.
    expect(ergebnis.raster.some((wert) => wert === null)).toBe(true);
  });

  it("meldet Widersprüche als Daten statt sie zu werfen", () => {
    const breite = 5, hoehe = 5;
    expect(() => loeseWfc({ keim: "wfc:widerspruch:1", breite, hoehe, kacheln: UNMOEGLICHES_SET })).not.toThrow();
    const ergebnis = loeseWfc({ keim: "wfc:widerspruch:1", breite, hoehe, kacheln: UNMOEGLICHES_SET });
    expect(ergebnis.raster).toHaveLength(breite * hoehe);
    expect(ergebnis.widersprueche).toBeGreaterThan(0);
    expect(ergebnis.vollstaendig).toBe(false);
  });

  it("honoriert Gewichte statistisch über viele Keime hinweg", () => {
    const breite = 20, hoehe = 20;
    let schwer = 0, gesamt = 0;
    for (let i = 0; i < 5; i++) {
      const ergebnis = loeseWfc({ keim: `wfc:gewicht:${i}`, breite, hoehe, kacheln: OFFENES_SET });
      for (const wert of ergebnis.raster) {
        gesamt++;
        if (wert === "schwer") schwer++;
      }
    }
    // Weight 3 vs weight 1 ⇒ expected share 0.75. 2000 independent draws (400 cells × 5 seeds,
    // guaranteed independent because OFFENES_SET's sockets never constrain a neighbour) put the
    // standard deviation at ~0.0097, so [0.65, 0.85] is a ~10σ band — wide enough to never flake,
    // narrow enough that a reversed or ignored weight would fail it every time.
    const anteil = schwer / gesamt;
    expect(anteil).toBeGreaterThan(0.65);
    expect(anteil).toBeLessThan(0.85);
  });

  it("verweigert ein leeres Tileset mit einer klaren Fehlermeldung", () => {
    const auftrag: WfcAuftrag = { keim: "wfc:leer:1", breite: 4, hoehe: 4, kacheln: [] };
    expect(() => loeseWfc(auftrag)).toThrow(WfcError);
    expect(() => loeseWfc(auftrag)).toThrow(/kacheln/);
  });
});
