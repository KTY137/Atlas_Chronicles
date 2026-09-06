import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createMapRenderer } from "../src/renderer.ts";
import { mapToScreen } from "../src/geometry.ts";
import type { ProjectedMapScene } from "../src/model.ts";

// The product factory and its camera/resource lifecycle run unchanged. This
// narrow Pixi boundary records geometry submission; it does not simulate GPU speed.
const pixi = vi.hoisted(() => ({ type: 1, resolution: 1, paths: 0, strokes: [] as { color?: number; width?: number; pixelLine?: boolean }[], textures: [] as { source: { scaleMode: string }; destroy: ReturnType<typeof vi.fn> }[] }));
vi.mock("pixi.js", () => {
  class Vector { x = 0; y = 0; set(x: number, y = x) { this.x = x; this.y = y; } }
  class Container {
    children: Container[] = []; position = new Vector(); scale = new Vector(); visible = true; eventMode = "auto"; mask: unknown;
    addChild(...children: Container[]) { this.children.push(...children); return children[0]; }
    removeChildren() { return this.children.splice(0); }
    destroy() { for (const child of this.removeChildren()) child.destroy(); }
  }
  class Graphics extends Container {
    clear() { return this; } rect() { return this; } circle() { return this; } fill() { return this; }
    poly() { pixi.paths++; return this; } moveTo() { pixi.paths++; return this; } lineTo() { return this; }
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
  class Sprite extends Container { width = 0; height = 0; }
  return { Application, Container, Graphics, Text, Sprite, RendererType: { WEBGL: 1, WEBGPU: 2, CANVAS: 4 }, Texture: { from() { const texture = { source: { scaleMode: "linear" }, destroy: vi.fn() }; pixi.textures.push(texture); return texture; } } };
});

const scene: ProjectedMapScene = { id: "authorized-scene", width: 2560, height: 2560, cells: [], pins: [],
  tokens: [{ id: "visible-token", x: 1200, y: 1200, label: "Known token", movable: true, revision: 1 }],
  lines: Array.from({ length: 1500 }, (_, i) => ({ id: `wall-${i}`, points: [[30 + i % 50 * 50, 30 + Math.floor(i / 50) * 70], [50 + i % 50 * 50, 42 + Math.floor(i / 50) * 70]] as const, color: 0xebc887 })),
  rasterScope: "authorized-view" };
function host() { const children: unknown[] = []; return { clientWidth: 1200, clientHeight: 800, appendChild(child: unknown) { children.push(child); }, children } as unknown as HTMLElement; }
beforeEach(() => {
  pixi.type = 1; pixi.resolution = 1; pixi.paths = 0; pixi.strokes.length = 0; pixi.textures.length = 0;
  vi.stubGlobal("window", { devicePixelRatio: 1 }); vi.stubGlobal("requestAnimationFrame", vi.fn(() => 1)); vi.stubGlobal("cancelAnimationFrame", vi.fn());
  vi.stubGlobal("ResizeObserver", class { observe() {} disconnect() {} });
});
afterEach(() => { vi.unstubAllGlobals(); });

describe("mounted renderer submission and resource lifecycle", () => {
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
