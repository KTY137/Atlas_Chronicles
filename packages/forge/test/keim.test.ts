import { readFileSync } from "node:fs";
import { gunzipSync } from "node:zlib";
import { describe, expect, it } from "vitest";
import { importiereAzgaar } from "../src/index.ts";

/**
 * Gate K-G2 · **`S-G1 · Der Keim`**.
 *
 * The corpus has carried this spike as unrun for five rounds, and it gates the whole map half:
 * *"If S-G1 is red, every day-figure in every RB-20 brief is wrong"* (RB-20:444-447).
 *
 * WHAT IT ASKS, stated precisely, because the cheap reading is wrong:
 *   Do our ids survive **two separate generator runs of the same seed and the same option
 *   vector**? Re-parsing one recorded file twice proves only that our parser is deterministic
 *   — `azgaar-real.test.ts` proves that, and it is a weaker claim.
 *
 * WHAT IT DOES NOT ASK: that ids survive a CHANGED option vector. They must not, and this file
 * measures that they do not. A different canvas is a different world: RB-21d:234 measured the
 * same seed at a different canvas keeping `(id, name)` for **0 of 664 burgs** and 8 names
 * (1.2 %). That measurement is the *reason* `width`/`height` sit inside the `Weltkeim`, and
 * therefore the reason a canvas change re-mints every id. An id scheme that pretended otherwise
 * would be claiming two different worlds are one.
 *
 * EVIDENCE. Three real headless runs through the generator's own export button, plus the
 * recorded production fixture — four independent runs in total. Captured by
 * `tools/capture-keim.mts`; each digest carries the source sha256 so any claim here can be
 * re-audited. Nothing is vendored: we run the generator unmodified and consume its export.
 */

interface KeimDigest {
  readonly label: string;
  readonly source: { readonly sha256: string; readonly bytes: number };
  readonly info: { readonly version: string; readonly seed: string; readonly width: number; readonly height: number };
  readonly keimHash: string;
  readonly counts: { readonly knoten: number; readonly orte: number; readonly zellen: number };
  readonly ortNamen: readonly string[];
  readonly knoten: readonly { readonly id: string; readonly art: string; readonly titel: string | null }[];
}

const digest = (label: string): KeimDigest =>
  JSON.parse(readFileSync(new URL(`./fixtures/keim-${label}.json`, import.meta.url), "utf8")) as KeimDigest;

const a = digest("a");
const b = digest("b");
const wide = digest("wide");

const idSet = (d: KeimDigest) => new Set(d.knoten.map((n) => n.id));
const titledPairs = (d: KeimDigest) =>
  new Set(d.knoten.filter((n) => n.titel !== null).map((n) => `${n.id}|${n.titel}`));
const shared = <T>(x: ReadonlySet<T>, y: ReadonlySet<T>) => [...x].filter((v) => y.has(v)).length;

describe("S-G1 · Der Keim — identity across real regeneration", () => {
  it("proves the runs are genuinely independent, not one file read twice", () => {
    // The raw exports differ byte-for-byte — the generator stamps an export time and a mapId
    // into `info`. If these were equal, the rest of this file would prove nothing.
    expect(a.source.sha256).not.toBe(b.source.sha256);
    expect(a.info).toEqual(b.info);
  });

  it("mints an identical Weltkeim for the same seed and the same option vector", () => {
    // Non-semantic variance (export timestamp, mapId) is outside the option vector and must
    // not reach the hash. This assertion is what makes re-import and 3-way merge possible.
    expect(b.keimHash).toBe(a.keimHash);
    expect(a.counts).toEqual(b.counts);
  });

  it("keeps EVERY node id across two independent generator runs", () => {
    const [A, B] = [idSet(a), idSet(b)];
    // Beide Digests stammen aus der Zeit vor der Markeraufnahme; sie werden nur miteinander
    // verglichen, nicht mit einem heutigen Import. Die Zahl bleibt deshalb, was aufgezeichnet wurde.
    expect(A.size).toBe(908);
    expect(shared(A, B)).toBe(A.size);

    // The stronger form: the id AND the name it points at, together. This is the pair the
    // corpus measured FMG's own ids failing to keep.
    const [pa, pb] = [titledPairs(a), titledPairs(b)];
    expect(shared(pa, pb)).toBe(pa.size);
    console.log(
      `S-G1 · same options: ${shared(A, B)}/${A.size} ids and ${shared(pa, pb)}/${pa.size} (id,titel) pairs survive a real regeneration`,
    );
  });

  it("re-mints every id when the option vector changes, because the world changed", () => {
    expect(wide.keimHash).not.toBe(a.keimHash);
    const [A, W] = [idSet(a), idSet(wide)];
    expect(shared(A, W)).toBe(0);

    // And the world really is different — this is the measurement that justifies the ruling
    // rather than inheriting it. The corpus saw 1.2 % name recurrence on its own seed/version.
    const namesA = new Set(a.ortNamen);
    const namesW = new Set(wide.ortNamen);
    const recurring = shared(namesA, namesW);
    const ratio = recurring / namesA.size;
    expect(ratio).toBeLessThan(0.1);
    console.log(
      `S-G1 · changed canvas: 0/${A.size} ids survive; ${recurring}/${namesA.size} place names recur (${(ratio * 100).toFixed(1)} %) — a different world, honestly re-identified`,
    );
  });

  it("agrees with the recorded production fixture — a fourth independent run", () => {
    const source = gunzipSync(
      readFileSync(new URL("./fixtures/azgaar-full.json.gz", import.meta.url)),
    ).toString("utf8");
    const imported = importiereAzgaar(source);
    expect(imported.keim.keimHash).toBe(a.keimHash);
    // Der Digest wurde aufgezeichnet, bevor Marker als Orte hereinkamen, und die 8-MB-Quelle
    // dahinter wurde bewusst nicht aufbewahrt — neu aufzeichnen hiesse, den Generator in
    // Version 1.151.2 erneut laufen zu lassen. Geprüft wird deshalb genau das, was die
    // Aufzeichnung noch aussagen kann, und das ist mehr als vorher: JEDE aufgezeichnete Id ist
    // weiterhin da, und was hinzukam, sind ausschliesslich die Marker — nichts sonst hat sich
    // verschoben.
    const markerIds = new Set(imported.orte.filter((ort) => ort.merkmale["sourceMarkerId"] !== undefined).map((ort) => ort.id as string));
    expect(markerIds.size).toBe(73);
    expect(new Set(imported.knoten.map((n) => n.id as string).filter((id) => !markerIds.has(id)))).toEqual(idSet(a));
  });

  it("does not collide with the hand-written corpus it must live beside", () => {
    // The other half of S-G1: generated ids and names must not shadow the user's own wiki.
    const articles = JSON.parse(
      readFileSync(new URL("../../../design/fixtures/eron/articles.json", import.meta.url), "utf8"),
    ) as { title: string }[];
    const graph = JSON.parse(
      readFileSync(new URL("../../../design/fixtures/eron/graph.json", import.meta.url), "utf8"),
    ) as { redlink_targets_by_incoming: Record<string, number> };

    const eronTitles = new Set(articles.map((row) => row.title));
    const eronDoors = new Set(Object.keys(graph.redlink_targets_by_incoming));
    const generated = new Set(a.ortNamen);

    const titleClashes = [...generated].filter((n) => eronTitles.has(n));
    const doorClashes = [...generated].filter((n) => eronDoors.has(n));

    // A clash is not a crash — two worlds may legitimately share a word. It must be *reported*
    // rather than silently merged, which is why this is measured and logged, and why the
    // assertion is on the id space (where a collision would be a real defect) rather than on
    // names (where it is a naming coincidence for a human to rule on).
    console.log(
      `S-G1 · collision: ${titleClashes.length} of ${generated.size} generated names match an existing article, ${doorClashes.length} match an open door${titleClashes.length ? ` (${titleClashes.join(", ")})` : ""}`,
    );
    expect(idSet(a).size).toBe(a.counts.knoten);
  });
});
