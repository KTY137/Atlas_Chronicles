// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2026 Kaya Yesilyurt - Atlas Chronicles. Siehe LICENSE.
import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { describe, expect, it } from "vitest";
import { parseTacticalMapDocument } from "@chronicle/szene";
import { exportTacticalUvtt, exportUvtt, importUvtt, inspectUvttImage, type UvttProvenance } from "../src/uvtt.ts";

const sample = readFileSync(new URL("./fixtures/uvtt/sampleMap.dd2vtt", import.meta.url), "utf8");
const provenance = JSON.parse(readFileSync(new URL("./fixtures/uvtt/provenance.json", import.meta.url), "utf8")) as { provenance: UvttProvenance; files: { path: string; bytes: number; sha256: string }[] };
const attribution = provenance.provenance;
const imported = importUvtt(sample, attribution);
const raw = (): any => ({ format: 0.3, resolution: { map_origin: { x: 2, y: 1 }, map_size: { x: 10, y: 10 }, pixels_per_grid: 256 }, line_of_sight: [[{ x: 2, y: 1 }, { x: 3, y: 1 }]], objects_line_of_sight: [], portals: [{ position: { x: 3, y: 2 }, bounds: [{ x: 3, y: 1.5 }, { x: 3, y: 2.5 }], rotation: 1.5, closed: false, freestanding: true }], lights: [{ position: { x: 4, y: 3 }, range: 2, intensity: 1, color: "ffaabbcc", shadows: true }], environment: { baked_lighting: false, ambient_light: "ffffffff" } });
const ingest = (value: unknown) => importUvtt(JSON.stringify(value), attribution);

describe("real external Dungeondraft UVTT fixture", () => {
  it("pins unmodified source bytes and license provenance", () => {
    expect(imported.source.sha256).toBe("3384e501dd30c2c978c6d56d8ad7ab75ebcc282accd9580511fef9a776d4dc4a");
    expect(imported.source.bytes).toBe(3786608); expect(imported.source.provenance.creator).toBe("Andre Kostur");
    for (const file of provenance.files) {
      const bytes = readFileSync(new URL(`./fixtures/uvtt/${file.path}`, import.meta.url));
      expect(bytes.length).toBe(file.bytes); expect(createHash("sha256").update(bytes).digest("hex")).toBe(file.sha256);
    }
    const project = JSON.parse(readFileSync(new URL("./fixtures/uvtt/sampleMap.dungeondraft_map", import.meta.url), "utf8"));
    expect(project.header.uses_default_assets).toBe(true); expect(project.header.asset_manifest).toEqual([]);
    expect(project.header.creation_build).toBe("1.0.1.3 awaken dryad");
  });
  it("imports actual image, cropped coordinates, object blockers, portal flags and colored lights", () => {
    expect(imported.fidelity.counts).toEqual({ walls: 4, objectBlockers: 1, portals: 2, lights: 2 });
    expect(imported.document.geometry.size).toEqual([2560, 2560]); expect(imported.document.frame.ursprung).toEqual([2, 1]);
    expect(imported.document.portals[0]!.position).toEqual([1280, 512]); expect(imported.document.portals[1]!.closed).toBe(false);
    expect(imported.document.lights[0]!.colorArgb).toBe("ffeccd8b"); expect(imported.document.lights[0]!.range).toBe(1280);
    expect(imported.image?.mimeType).toBe("image/png"); expect(imported.image?.sha256).toBe(createHash("sha256").update(Buffer.from(imported.image!.base64, "base64")).digest("hex"));
    expect(imported.document.geometry.regions).toEqual([]); expect(imported.document.geometry.places).toEqual([]);
  });
  it("round-trips exact original source, including formatting and the embedded image", () => {
    const result = exportUvtt(imported); expect(result.json).toBe(sample); expect(result.fidelity.exactSource).toBe(true); expect(importUvtt(result.json, attribution).document).toEqual(imported.document);
  });
  it("uses authoritative image pixels when an exported grid ratio has binary rounding error", () => {
    const document = parseTacticalMapDocument({ ...imported.document,
      grid: { kind: "square", size: 77, origin: [0, 0] },
      frame: { ursprung: [0, 0], einheitenProPixel: 1 / 77, ordnung: "xy", hoch: "unten" },
    });
    const exported = exportTacticalUvtt(document, imported.image), next = importUvtt(exported.json, attribution);
    expect(next.document.geometry.size).toEqual([2560, 2560]);
    expect(next.document.background).toEqual(imported.document.background);
    expect(exportUvtt(next).json).toBe(exported.json);
    const mismatch = JSON.parse(exported.json); mismatch.resolution.map_size.x = (2560 + 0.000001) / 77;
    expect(() => ingest(mismatch)).toThrow(/dimensions/);
  });
});

describe("UVTT fidelity and coordinate semantics", () => {
  it("preserves unrecognized extensions in the source and surviving exported identities", () => {
    const source = raw(); source.software = "external-exporter"; source.portals[0].custom = { windowHint: "producer-specific" }; source.lights[0].position.label = "source-only";
    const value = ingest(source); expect(value.fidelity.issues.filter(i => i.code === "source-only").map(i => i.path)).toEqual(["uvtt.software", "portals[0].custom", "lights[0].position.label"]);
    expect(exportUvtt(value).json).toBe(JSON.stringify(source));
    const document = parseTacticalMapDocument({ ...value.document, portals: [{ ...value.document.portals[0]!, closed: true }] });
    const result = exportUvtt(value, document), exported = JSON.parse(result.json);
    expect(exported.software).toBe(source.software); expect(exported.portals[0].custom).toEqual(source.portals[0].custom); expect(exported.portals[0].closed).toBe(true); expect(exported.lights[0].position.label).toBe("source-only");
    expect(result.fidelity.nativeRoundTrip).toBe(false); expect(result.fidelity.issues.some(i => i.path === "geometry.identities" && i.severity === "loss")).toBe(true);
    expect(importUvtt(result.json, attribution).document.portals[0]!.closed).toBe(true);
  });
  it("preserves fractional crop alignment and changed image-local coordinates", () => {
    const source = raw(); source.resolution.map_origin = { x: 2.25, y: -1.5 }; const value = ingest(source);
    expect(value.document.grid).toEqual({ kind: "square", size: 256, origin: [192, 128] });
    const document = parseTacticalMapDocument({ ...value.document, walls: [{ ...value.document.walls[0]!, points: [[256, 512], [512, 512]] }] });
    const result = exportUvtt(value, document), next = importUvtt(result.json, attribution);
    expect(JSON.parse(result.json).line_of_sight[0][0]).toEqual({ x: 3.25, y: 0.5 }); expect(next.document.walls[0]!.points).toEqual(document.walls[0]!.points);
    expect(result.fidelity.issues.some(i => i.path === "grid.origin")).toBe(false);
  });
  it("associates retained unknown properties by identity after deletion and reorder", () => {
    const source = raw(); source.portals[0].sourceLabel = "first";
    source.portals.push({ ...source.portals[0], sourceLabel: "second" });
    const value = ingest(source), document = parseTacticalMapDocument({ ...value.document, portals: [{ ...value.document.portals[1]!, closed: true }] });
    const result = exportUvtt(value, document), exported = JSON.parse(result.json);
    expect(exported.portals).toHaveLength(1); expect(exported.portals[0].sourceLabel).toBe("second");
    expect(result.fidelity.issues.some(i => i.path === "source.removed")).toBe(true);
    expect(JSON.parse(value.source.json).portals[0].sourceLabel).toBe("first");
  });
  it("keeps wall point attributes with exact surviving coordinates after deleting the first point", () => {
    const source = raw(); source.resolution.map_origin = { x: 0, y: 0 };
    source.line_of_sight = [[{ x: 0, y: 0, label: "A" }, { x: 1, y: 1, label: "B" }, { x: 2, y: 2, label: "C" }]];
    const value = ingest(source), wall = value.document.walls[0]!;
    const result = exportUvtt(value, parseTacticalMapDocument({ ...value.document, walls: [{ ...wall, points: wall.points.slice(1) }] }));
    expect(JSON.parse(result.json).line_of_sight[0]).toEqual([{ x: 1, y: 1, label: "B" }, { x: 2, y: 2, label: "C" }]);
    expect(result.fidelity.issues.some(i => i.severity === "loss" && i.path.startsWith("line_of_sight[0]"))).toBe(true);
    expect(exportUvtt(value).json).toBe(JSON.stringify(source));
  });
  it("does not invent point identities for moved or ambiguous coordinates", () => {
    const source = raw(); source.resolution.map_origin = { x: 0, y: 0 };
    source.line_of_sight = [[{ x: 0, y: 0, label: "first" }, { x: 0, y: 0, label: "other" }, { x: 2, y: 2, label: "last" }]];
    const value = ingest(source), wall = value.document.walls[0]!;
    for (const points of [[[0, 0], [512, 512]], [[128, 128], [512, 512]]] as const) {
      const result = exportUvtt(value, parseTacticalMapDocument({ ...value.document, walls: [{ ...wall, points }] }));
      const exported = JSON.parse(result.json).line_of_sight[0];
      expect(exported[0]).not.toHaveProperty("label"); expect(exported[1].label).toBe("last");
      expect(result.fidelity.issues.some(i => i.severity === "loss" && i.path.startsWith("line_of_sight[0]"))).toBe(true);
    }
  });
  it("does not duplicate one source point's metadata onto newly duplicated coordinates", () => {
    const source = raw(); source.resolution.map_origin = { x: 0, y: 0 };
    source.line_of_sight = [[{ x: 0, y: 0, label: "A" }, { x: 1, y: 1, label: "B" }]];
    const value = ingest(source), wall = value.document.walls[0]!;
    const result = exportUvtt(value, parseTacticalMapDocument({ ...value.document, walls: [{ ...wall, points: [[0, 0], [0, 0], [256, 256]] }] }));
    expect(JSON.parse(result.json).line_of_sight[0]).toEqual([{ x: 0, y: 0 }, { x: 0, y: 0 }, { x: 1, y: 1, label: "B" }]);
    expect(result.fidelity.issues.some(i => i.severity === "loss" && i.path.startsWith("line_of_sight[0]"))).toBe(true);
  });
  it("preserves unchanged duplicate vertices and follows portal endpoints when their order changes", () => {
    const source = raw(); source.line_of_sight = [[{ x: 0, y: 0, label: "first" }, { x: 0, y: 0, label: "other" }]];
    source.portals[0].bounds[0].label = "left"; source.portals[0].bounds[1].label = "right";
    const value = ingest(source), wall = value.document.walls[0]!, portal = value.document.portals[0]!;
    const result = exportUvtt(value, parseTacticalMapDocument({ ...value.document,
      walls: [{ ...wall, kind: "object" }], portals: [{ ...portal, bounds: [portal.bounds[1], portal.bounds[0]] }],
    }));
    const exported = JSON.parse(result.json);
    expect(exported.objects_line_of_sight[0]).toEqual(source.line_of_sight[0]);
    expect(exported.portals[0].bounds.map((p: { label: string }) => p.label)).toEqual(["right", "left"]);
    expect(result.fidelity.issues.some(i => i.code === "source-only" && i.severity === "loss")).toBe(false);
  });
  it("keeps originals while explicitly reporting native-only geometry, hex grids and elevation loss", () => {
    const value = ingest(raw()), document = parseTacticalMapDocument({ ...value.document, grid: { kind: "hex", size: 50, origin: [0, 0], orientation: "flat", offset: "odd" }, elevation: 3, geometry: { ...value.document.geometry, regions: [{ id: "room", punkte: [[0, 0], [100, 0], [0, 100]] }] } });
    const result = exportUvtt(value, document); expect(result.fidelity.sourceRetained).toBe(true);
    expect(result.fidelity.issues.filter(i => i.severity === "loss").map(i => i.path)).toEqual(expect.arrayContaining(["grid", "elevation", "geometry.regions", "geometry.identities"]));
    expect(value.source.json).toBe(JSON.stringify(raw()));
  });
  it("exports native geometry without claiming a source or an identity-preserving round trip", () => {
    const result = exportTacticalUvtt(ingest(raw()).document); expect(result.fidelity.sourceRetained).toBe(false); expect(result.fidelity.nativeRoundTrip).toBe(false); expect(JSON.parse(result.json).format).toBe(0.3);
  });
  it("accepts 0.2 and reports missing optional features instead of inventing scene knowledge", () => {
    const source = raw(); source.format = 0.2; delete source.environment; delete source.lights; const value = ingest(source);
    expect(value.source.formatVersion).toBe(0.2); expect(value.document.lights).toEqual([]); expect(value.fidelity.issues.some(i => i.code === "defaulted")).toBe(true);
    expect(value.fidelity.issues.some(i => i.code === "no-region-bindings")).toBe(true); expect(value.fidelity.issues.some(i => i.code === "image-missing")).toBe(true);
  });
});

describe("hostile UVTT input and import artifacts", () => {
  it.each([
    (s: any) => { s.format = 2; }, (s: any) => { s.resolution.map_size.x = -1; }, (s: any) => { s.resolution.pixels_per_grid = 0; },
    (s: any) => { s.resolution.pixels_per_grid = 1.5; }, (s: any) => { s.resolution.map_size = { x: 32768, y: 32768 }; }, (s: any) => { s.portals[0].closed = "false"; },
    (s: any) => { s.portals[0].bounds = []; }, (s: any) => { s.line_of_sight = [[{ x: 1, y: 2 }]]; }, (s: any) => { s.lights[0].color = "#fff"; }, (s: any) => { s.lights[0].range = -1; },
    (s: any) => { s.image = "https://example.com/map.png"; }, (s: any) => { s.image = "PHN2ZyBvbmxvYWQ9J2V2aWwnPjwvc3ZnPg=="; },
  ])("rejects malformed supported data", mutate => { const source = raw(); mutate(source); expect(() => ingest(source)).toThrow(); });
  it("rejects duplicate properties and concealed nonfinite numbers", () => {
    expect(() => importUvtt('{"format":0.2,"format":0.3}', attribution)).toThrow(/duplicate/);
    expect(() => importUvtt(JSON.stringify(raw()).replace('"x":2', '"x":1e999'), attribution)).toThrow(/finite/);
  });
  it("rejects image mismatch, bad checksums and noncanonical base64", () => {
    const source = raw(); source.image = imported.image!.base64; source.resolution.map_size.x = 11; expect(() => ingest(source)).toThrow(/dimensions/);
    const corrupt = Buffer.from(imported.image!.base64, "base64"); corrupt[100] = corrupt[100]! ^ 1; expect(() => inspectUvttImage(corrupt.toString("base64"))).toThrow(/checksum/);
    expect(() => inspectUvttImage(imported.image!.base64 + "\n")).toThrow(/base64/);
  });
  it("revalidates retained source and supplied replacement image evidence", () => {
    expect(() => exportUvtt({ ...imported, source: { ...imported.source, sha256: "a".repeat(64) } })).toThrow(/retained source/);
    expect(() => exportUvtt({ ...imported, document: { ...imported.document, elevation: 2 } })).toThrow(/retained source/);
    expect(() => exportTacticalUvtt(imported.document)).toThrow(/image bytes/);
    expect(() => exportTacticalUvtt({ ...imported.document, background: { ...imported.document.background!, sha256: "a".repeat(64) } }, imported.image)).toThrow(/do not match/);
  });
});
