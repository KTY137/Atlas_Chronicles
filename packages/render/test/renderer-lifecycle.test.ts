// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2026 Kaya Yesilyurt - Atlas Chronicles. Siehe LICENSE.
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createMapRenderer } from "../src/renderer.ts";
import { mapToScreen } from "../src/geometry.ts";
import type { MapPinIcon, ProjectedMapScene } from "../src/model.ts";

// The product factory and its camera/resource lifecycle run unchanged. This
// narrow Pixi boundary records geometry submission; it does not simulate GPU speed.
const pixi = vi.hoisted(() => ({ type: 1, resolution: 1, paths: 0, strokes: [] as { color?: number; width?: number; pixelLine?: boolean }[], textures: [] as { source: { scaleMode: string }; destroy: ReturnType<typeof vi.fn> }[],
  graphics: [] as { position: { x: number; y: number }; scale: { x: number; y: number }; circles: number[]; paths: number; visible: boolean }[] }));
vi.mock("pixi.js", () => {
  class Vector { x = 0; y = 0; set(x: number, y = x) { this.x = x; this.y = y; } }
  class Container {
    children: Container[] = []; position = new Vector(); scale = new Vector(); visible = true; eventMode = "auto"; mask: unknown;
    addChild(...children: Container[]) { this.children.push(...children); return children[0]; }
    removeChildren() { return this.children.splice(0); }
    destroy() { for (const child of this.removeChildren()) child.destroy(); }
  }
  class Graphics extends Container {
    circles: number[] = []; paths = 0;
    constructor() { super(); pixi.graphics.push(this); }
    clear() { this.circles.length = 0; this.paths = 0; return this; } rect() { return this; }
    circle(_x: number, _y: number, radius: number) { this.circles.push(radius); return this; } fill() { return this; }
    poly() { pixi.paths++; this.paths++; return this; } moveTo() { pixi.paths++; this.paths++; return this; } lineTo() { return this; }
    stroke(style: { color?: number; width?: number; pixelLine?: boolean }) { pixi.strokes.push(style); return this; }
  }
  class Text extends Container { text = ""; width = 20; height = 10; }
  class Canvas extends EventTarget {
    style: Record<string, string> = {}; dataset: Record<string, string> = {}; tabIndex = 0;
    setAttribute() {} hasPointerCapture() { return false; } releasePointerCapture() {} setPointerCapture() {} focus() {}
  }
  class Application {
    canvas = new Canvas(); stage = new Container(); renderer = { type: pixi.type, resolution: pixi.resolution, resize() {} };
    async init() {} render() {} destroy() { this.stage.destroy(); }
  }
  class Sprite extends Container { width = 0; height = 0; anchor = new Vector(); }
  return { Application, Container, Graphics, Text, Sprite, RendererType: { WEBGL: 1, WEBGPU: 2, CANVAS: 4 }, Texture: { from() { const texture = { source: { scaleMode: "linear" }, destroy: vi.fn() }; pixi.textures.push(texture); return texture; } } };
});

const scene: ProjectedMapScene = { id: "authorized-scene", width: 2560, height: 2560, cells: [], pins: [],
  tokens: [{ id: "visible-token", x: 1200, y: 1200, label: "Known token", movable: true, revision: 1 }],
  lines: Array.from({ length: 1500 }, (_, i) => ({ id: `wall-${i}`, points: [[30 + i % 50 * 50, 30 + Math.floor(i / 50) * 70], [50 + i % 50 * 50, 42 + Math.floor(i / 50) * 70]] as const, color: 0xebc887 })),
  rasterScope: "authorized-view" };
function host() { const children: unknown[] = []; return { clientWidth: 1200, clientHeight: 800, appendChild(child: unknown) { children.push(child); }, children } as unknown as HTMLElement; }
beforeEach(() => {
  pixi.type = 1; pixi.resolution = 1; pixi.paths = 0; pixi.strokes.length = 0; pixi.textures.length = 0; pixi.graphics.length = 0;
  vi.stubGlobal("window", { devicePixelRatio: 1 }); vi.stubGlobal("requestAnimationFrame", vi.fn(() => 1)); vi.stubGlobal("cancelAnimationFrame", vi.fn());
  vi.stubGlobal("ResizeObserver", class { observe() {} disconnect() {} });
});
afterEach(() => { vi.unstubAllGlobals(); });

describe("mounted renderer submission and resource lifecycle", () => {
  it("releases artwork textures and bitmaps when their last map placement is removed", async () => {
    const image = { width: 64, height: 64, close: vi.fn() } as unknown as ImageBitmap;
    const stamp = { id: "chair", asset: "pack/chair", x: 100, y: 100, s: 1, r: 0, l: 0 };
    const map = await createMapRenderer(host(), { ...scene, lines: [], stamps: [stamp] });
    map.setStampImages([{ asset: stamp.asset, image }]);
    map.update({ ...scene, lines: [], stamps: [{ ...stamp, x: 200 }] });
    expect(image.close).not.toHaveBeenCalled();
    map.update({ ...scene, lines: [], stamps: [] });
    expect(image.close).toHaveBeenCalledTimes(1);
    expect(pixi.textures[0]!.destroy).toHaveBeenCalledWith(true);
    map.destroy();
    expect(image.close).toHaveBeenCalledTimes(1);
  });

  it("draws local pin glyphs once and retains their screen size, selection and picking through camera changes", async () => {
    const icons: MapPinIcon[] = ["place", "city", "castle", "cave", "ruin", "portal"];
    const pins = icons.map((icon, i) => ({ id: icon, icon, label: icon, x: 200 + i * 200, y: 500 }));
    const map = await createMapRenderer(host(), { ...scene, tokens: [], lines: [], pins });
    const badges = pins.map(pin => pixi.graphics.find(graphics => graphics.position.x === pin.x && graphics.position.y === pin.y)!);
    for (const badge of badges) { expect(badge.circles[0]).toBe(11); expect(badge.paths).toBeGreaterThan(0); }
    const geometryCount = pixi.graphics.length, paths = pixi.paths;
    map.panBy(30, -20); map.zoomAt(2);
    expect(pixi.graphics.length).toBe(geometryCount); expect(pixi.paths).toBe(paths);
    for (let i = 0; i < pins.length; i++) {
      expect(badges[i]!.scale.x * map.getCamera().scale).toBeCloseTo(1, 10);
      const pin = pins[i]!, center = mapToScreen([pin.x, pin.y], map.getCamera());
      expect(map.hitTest([center[0] + 12, center[1]])).toEqual({ kind: "pin", id: pin.id });
      expect(map.hitTest([center[0] + 12.1, center[1]])).toBeNull();
    }
    map.select({ kind: "pin", id: "portal" });
    const center = mapToScreen([pins[5]!.x, pins[5]!.y], map.getCamera());
    const selection = pixi.graphics.find(graphics => graphics.circles[0] === 15)!;
    expect(selection.visible).toBe(true); expect(selection.position).toMatchObject({ x: center[0], y: center[1] });
    expect(pixi.textures).toHaveLength(0); map.destroy();
  });

  it("rejects an invalid icon patch without replacing the last valid projected pin", async () => {
    const pin = { id: "nested", icon: "portal", x: 1200, y: 1200, label: "Unterkarte" } as const;
    const map = await createMapRenderer(host(), { ...scene, tokens: [], lines: [], pins: [pin] });
    const point = mapToScreen([1200, 1200], map.getCamera()), count = pixi.graphics.length;
    expect(() => map.applyPatch({ sceneId: scene.id, pins: [{ ...pin, icon: "external" as MapPinIcon }] })).toThrow("pin icon");
    expect(pixi.graphics.length).toBe(count); expect(map.hitTest(point)).toEqual({ kind: "pin", id: "nested" }); map.destroy();
  });

  it("does not reconstruct 1500 unchanged wall paths during camera pan", async () => {
    const map = await createMapRenderer(host(), scene); const before = pixi.paths;
    for (let i = 0; i < 20; i++) map.panBy(3, -2);
    expect(pixi.paths - before).toBe(0);
    const point = mapToScreen([1200, 1200], map.getCamera()); expect(map.hitTest(point)).toEqual({ kind: "token", id: "visible-token" });
    map.update({ ...scene, tokens: [], lines: [] }); expect(map.hitTest(point)).toBeNull(); map.destroy();
  });

  it("batches equal-color wall strokes while preserving their two-screen-pixel zoom weight", async () => {
    const map = await createMapRenderer(host(), scene); pixi.strokes.length = 0;
    map.zoomAt(1.5);
    const walls = pixi.strokes.filter(style => style.color === 0xebc887);
    expect(walls).toHaveLength(1);
    expect(walls[0]!.width! * map.getCamera().scale).toBeCloseTo(2, 10); map.destroy();
  });

  it("retains colored overlap order and replaces changed projected paths at the same camera", async () => {
    const lines = [0xff0000, 0x00ff00, 0xff0000].map((color, i) => ({ id: `overlap-${i}`, points: [[10, 10], [30, 30]] as const, color }));
    const map = await createMapRenderer(host(), { ...scene, tokens: [], lines }); pixi.strokes.length = 0;
    map.zoomAt(1.1);
    expect(pixi.strokes.filter(style => style.color !== 0xffe7a1).map(style => style.color)).toEqual([0xff0000, 0x00ff00, 0xff0000]);
    pixi.strokes.length = 0; const before = pixi.paths;
    map.update({ ...scene, tokens: [], lines: [{ id: "replacement", points: [[80, 80], [90, 90]], color: 0x0000ff }] });
    expect(pixi.paths - before).toBe(1); expect(pixi.strokes.map(style => style.color)).toEqual([0x0000ff]); map.destroy();
  });

  it("reuses the bounded one-pixel grid for camera changes within its covered world area", async () => {
    const map = await createMapRenderer(host(), { ...scene, lines: [], grid: { kind: "square", origin: [0, 0], size: 256 } });
    const before = pixi.paths;
    map.panBy(3, -2); map.zoomAt(1.1);
    expect(pixi.paths).toBe(before); map.destroy();
  });

  it.each([[1, 2], [4, 1]] as const)("preserves one CSS-pixel grid width at backend %s / resolution %s", async (type, resolution) => {
    pixi.type = type; pixi.resolution = resolution;
    const map = await createMapRenderer(host(), { ...scene, lines: [], grid: { kind: "square", origin: [0, 0], size: 256 } });
    pixi.strokes.length = 0; map.zoomAt(1.5);
    const grid = pixi.strokes.find(style => style.color === 0xddd8c8);
    expect(grid).toBeDefined(); expect(grid!.pixelLine).toBe(false); expect(grid!.width! * map.getCamera().scale).toBeCloseTo(1, 10); map.destroy();
  });

  it.each([[1, "pixi-webgl"], [2, "pixi-webgpu"], [4, "pixi-canvas"]] as const)("reports actual Pixi renderer type %s", async (type, backend) => {
    pixi.type = type; const element = host(), map = await createMapRenderer(element, { ...scene, lines: [] });
    expect(map.backend).toBe(backend); expect((element.children[0] as HTMLElement).dataset.mapBackend).toBe(backend); map.destroy();
  });

  it("applies presentation sampling to new and retained textures without discarding authorized bitmaps", async () => {
    const bitmap = { width: 256, height: 256, close: vi.fn() } as unknown as ImageBitmap;
    const map = await createMapRenderer(host(), { ...scene, lines: [], rasterSampling: "nearest" });
    map.setRasterTiles("authorized-view", [{ id: "0/0/0", left: 0, top: 0, width: 256, height: 256, pixelScale: 1, image: bitmap }]);
    expect(pixi.textures[0]!.source.scaleMode).toBe("nearest");
    map.update({ ...scene, lines: [], rasterSampling: "linear" });
    expect(pixi.textures[0]!.source.scaleMode).toBe("linear"); expect(bitmap.close).not.toHaveBeenCalled();
    map.update({ ...scene, lines: [], rasterScope: "replacement-view" });
    expect(bitmap.close).toHaveBeenCalledTimes(1); expect(pixi.textures[0]!.destroy).toHaveBeenCalledWith(true); map.destroy();
  });

  it("rejects undeclared sampling and unknown runtime backends", async () => {
    await expect(createMapRenderer(host(), { ...scene, rasterSampling: "smooth" } as unknown as ProjectedMapScene)).rejects.toThrow("sampling");
    pixi.type = 3; await expect(createMapRenderer(host(), scene)).rejects.toThrow("Grafikkarte");
  });
});
