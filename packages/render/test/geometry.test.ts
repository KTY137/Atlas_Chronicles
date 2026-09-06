import { describe, expect, it } from "vitest";
import { fitCamera, hitTestMap, mapToScreen, normalizeCamera, pointInPolygon, screenToMap, validateMapScene, zoomCamera } from "../src/geometry.ts";
import type { ProjectedMapScene } from "../src/model.ts";

const scene: ProjectedMapScene = { id: "visible-world", width: 200, height: 100,
  cells: [{ id: "known-cell", polygon: [[0, 0], [200, 0], [200, 100], [0, 100]] }],
  pins: [{ id: "known-place", label: "Hafen", x: 50, y: 50 }],
  tokens: [{ id: "known-token", label: "Olav", x: 100, y: 50 }] };
describe("MapRenderer camera and hit boundary", () => {
  it("fits the full map and centers it in the available viewport", () => {
    const camera = fitCamera([200, 100], [448, 248]);
    expect(camera).toEqual({ x: 24, y: 24, scale: 2 });
    expect(screenToMap(mapToScreen([62, 42], camera), camera)).toEqual([62, 42]);
    const clamped = fitCamera([1, 1], [5000, 5000]);
    expect(mapToScreen([0.5, 0.5], clamped)).toEqual([2500, 2500]);
  });
  it("keeps the point under the cursor fixed while zooming and clamps extreme zoom", () => {
    const before = { x: 20, y: -10, scale: 2 };
    const anchor = [240, 150] as const;
    const after = zoomCamera(before, 3, anchor);
    expect(screenToMap(anchor, before)).toEqual(screenToMap(anchor, after));
    expect(zoomCamera(before, 1e20, anchor).scale).toBe(128);
    expect(() => zoomCamera(before, 0, anchor)).toThrow();
    expect(() => zoomCamera(before, 1, [NaN, 1])).toThrow();
    expect(() => normalizeCamera({ ...before, x: NaN })).toThrow();
  });
  it("matches visible pins and tokens after pan and zoom, with a constant screen hit radius", () => {
    const camera = { x: 20, y: 30, scale: 3 };
    expect(hitTestMap(scene, camera, [170, 180])).toEqual({ kind: "pin", id: "known-place" });
    expect(hitTestMap(scene, camera, [176, 180])).toEqual({ kind: "pin", id: "known-place" });
    expect(hitTestMap(scene, camera, [320, 180])).toEqual({ kind: "token", id: "known-token" });
    expect(hitTestMap(scene, camera, [30, 40])).toEqual({ kind: "cell", id: "known-cell" });
    expect(hitTestMap(scene, camera, [-50, -50])).toBeNull();
  });
  it("follows draw order and cannot return a removed projected entity", () => {
    const overlapped = { ...scene, tokens: [{ id: "front", label: "A", x: 50, y: 50 }] };
    expect(hitTestMap(overlapped, { x: 0, y: 0, scale: 1 }, [50, 50])).toEqual({ kind: "token", id: "front" });
    expect(hitTestMap({ ...scene, cells: [], pins: [], tokens: [] }, { x: 0, y: 0, scale: 1 }, [50, 50])).toBeNull();
  });
  it("handles concave polygon interiors, edges and outside points", () => {
    const polygon = [[0, 0], [10, 0], [10, 4], [4, 4], [4, 10], [0, 10]] as const;
    expect(pointInPolygon([2, 8], polygon)).toBe(true);
    expect(pointInPolygon([4, 8], polygon)).toBe(true);
    expect(pointInPolygon([8, 8], polygon)).toBe(false);
  });
  it("rejects invalid geometry and duplicate projected identities before allocation", () => {
    expect(() => validateMapScene(scene)).not.toThrow();
    expect(() => validateMapScene({ ...scene, pins: [...scene.pins, ...scene.pins] })).toThrow("duplicate");
    expect(() => validateMapScene({ ...scene, width: Infinity })).toThrow("dimensions");
    expect(() => validateMapScene({ ...scene, cells: [{ id: "bad", polygon: [[0, NaN], [1, 0], [2, 0]] }] })).toThrow("coordinate");
  });
});
