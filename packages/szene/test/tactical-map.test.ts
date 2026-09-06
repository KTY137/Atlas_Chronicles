import { describe, expect, it } from "vitest";
import { parseBoundedMapJson, parseTacticalMapDocument, serializeTacticalMapDocument, type TacticalMapDocumentV1 } from "../src/tactical-map.ts";

const map = (): TacticalMapDocumentV1 => ({ schemaVersion: 1, kind: "tactical-map", coordinates: "image-pixels", frame: { ursprung: [2, 1], einheitenProPixel: 1 / 256, ordnung: "xy", hoch: "unten" }, geometry: { v: 3, size: [2560, 2560], stamps: [], regions: [{ id: "room", punkte: [[0, 0], [100, 0], [100, 100]] }], places: [{ id: "doorstep", x: 20, y: 40 }] }, grid: { kind: "square", size: 256, origin: [0, 0] }, elevation: 0, geometryElevation: [{ targetKind: "region", targetId: "room", elevation: 3 }], walls: [{ id: "wall", kind: "wall", points: [[0, 0], [0, 100]], elevation: 0 }], portals: [{ id: "portal", position: [0, 50], bounds: [[0, 40], [0, 60]], rotationRadians: 1.5, closed: false, freestanding: false, elevation: 0 }], lights: [{ id: "light", position: [40, 40], range: 300, intensity: 1, colorArgb: "ffaabbcc", shadows: true, elevation: 5 }], environment: { bakedLighting: false, ambientLightArgb: "ffffffff" }, background: null });
const clone = <T,>(value: T): T => JSON.parse(JSON.stringify(value)) as T;

describe("closed tactical map v1", () => {
  it("preserves SceneDoc v3, explicit frame, portal flags and scalar elevations", () => {
    const source = map(), parsed = parseTacticalMapDocument(source);
    expect(parsed).toEqual(source); expect(parseTacticalMapDocument(serializeTacticalMapDocument(parsed))).toEqual(source);
    expect(Object.isFrozen(parsed.geometry.regions[0]!.punkte)).toBe(true);
    expect(Object.hasOwn(parsed.portals[0]!, "kind")).toBe(false);
    expect(Object.hasOwn(parsed.geometry.regions[0]!, "elevation")).toBe(false);
  });
  it.each(["pointy", "flat"] as const)("supports both parity offsets for %s hexes", orientation => {
    for (const offset of ["even", "odd"] as const) expect(parseTacticalMapDocument({ ...map(), grid: { kind: "hex", size: 50, origin: [10, 20], orientation, offset } }).grid.kind).toBe("hex");
  });
  it("supports gridless and rejects accidental grid constraints", () => {
    expect(parseTacticalMapDocument({ ...map(), grid: { kind: "none" } }).grid).toEqual({ kind: "none" });
    expect(() => parseTacticalMapDocument({ ...map(), grid: { kind: "none", size: 50 } })).toThrow(/unknown property/);
  });
  it.each([
    (m: any) => { m.permissions = ["gm"]; }, (m: any) => { m.walls[0].visible = true; }, (m: any) => { m.portals[0].window = true; },
    (m: any) => { m.geometry.regions[0].entryId = "secret"; }, (m: any) => { m.schemaVersion = 2; }, (m: any) => { m.geometry.v = 4; },
  ])("rejects undeclared behavior instead of widening the profile", mutate => { const input = clone(map()); mutate(input); expect(() => parseTacticalMapDocument(input)).toThrow(); });
  it.each([NaN, Infinity, -Infinity, 1e10])("rejects unbounded coordinate %s", bad => { expect(() => parseTacticalMapDocument({ ...map(), elevation: bad })).toThrow(); });
  it("rejects invalid image/resource dimensions and untrusted asset locators", () => {
    expect(() => parseTacticalMapDocument({ ...map(), geometry: { ...map().geometry, size: [16000, 16000] } })).toThrow(/pixel budget/);
    expect(() => parseTacticalMapDocument({ ...map(), background: { sha256: "a".repeat(64), mimeType: "image/png", width: 1, height: 1 } })).toThrow(/dimensions/);
    expect(() => parseTacticalMapDocument({ ...map(), geometry: { ...map().geometry, base: { basisUrl: "https://example.com/secret", kachelgroesse: 256, ebenen: 3 } } })).toThrow(/asset reference/);
    expect(() => parseTacticalMapDocument({ ...map(), geometry: { ...map().geometry, stamps: [{ id: "stamp", a: "https://host/image", x: 0, y: 0, s: 1, r: 0, l: 0 }] } })).toThrow(/pack-qualified/);
  });
  it("requires unique geometry IDs and valid, unique elevation targets", () => {
    expect(() => parseTacticalMapDocument({ ...map(), geometryElevation: [{ targetKind: "place", targetId: "room", elevation: 2 }] })).toThrow(/existing geometry/);
    expect(() => parseTacticalMapDocument({ ...map(), geometryElevation: [...map().geometryElevation, ...map().geometryElevation] })).toThrow(/unique/);
    expect(() => parseTacticalMapDocument({ ...map(), lights: [{ ...map().lights[0]!, id: "wall" }] })).toThrow(/duplicate/);
  });
  it("retains all four existing stamp flags without adding entity behavior", () => {
    const input = { ...map(), geometry: { ...map().geometry, stamps: [{ id: "stamp", a: "pk.wald/baum_7", x: 0, y: 0, s: 1, r: 0, l: 0, t: 0xffffff, f: 15 }] } };
    expect(parseTacticalMapDocument(input).geometry.stamps[0]!.f).toBe(15);
    input.geometry.stamps[0]!.f = 16; expect(() => parseTacticalMapDocument(input)).toThrow();
  });
});

describe("bounded untrusted map JSON", () => {
  it("rejects duplicate and escaped duplicate properties at any depth", () => {
    for (const source of ['{"x":1,"x":2}', '{"x":1,"\\u0078":2}', '{"a":[{"k":1,"k":2}]}']) expect(() => parseBoundedMapJson(source)).toThrow(/duplicate/);
  });
  it("preserves a valid UTF-8 BOM source while parsing its content", () => { expect(parseBoundedMapJson('\ufeff{"x":"a\\\"b"}')).toEqual({ x: 'a"b' }); });
  it("rejects cyclic, accessor, prototype and nonfinite input without invoking getters", () => {
    let calls = 0; const value = Object.defineProperty({}, "x", { enumerable: true, get() { calls++; return 1; } });
    const array = [1]; Object.defineProperty(array, "0", { enumerable: true, get() { calls++; return 1; } });
    expect(() => parseBoundedMapJson(value)).toThrow(/data property/); expect(() => parseBoundedMapJson(array)).toThrow(/accessors/); expect(calls).toBe(0);
    const cyclic: unknown[] = []; cyclic.push(cyclic); expect(() => parseBoundedMapJson(cyclic)).toThrow(/cyclic/);
    expect(() => parseBoundedMapJson('{"__proto__":{"admin":true}}')).toThrow(/prototype/);
    expect(() => parseBoundedMapJson('{"x":1e999}')).toThrow(/finite/);
  });
  it("bounds nested and oversized JSON and rejects trailing input", () => {
    expect(() => parseBoundedMapJson("[".repeat(50) + "0" + "]".repeat(50))).toThrow(/complexity/);
    expect(() => parseBoundedMapJson('"ééé"', 5)).toThrow(/byte limit/);
    for (const source of ["true false", '{"a":1,}', "[1,]", "{a:1}"]) expect(() => parseBoundedMapJson(source)).toThrow();
  });
});
