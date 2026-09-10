// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2026 Kaya Yesilyurt - Atlas Chronicles. Siehe LICENSE.
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createMapRenderer } from "../src/renderer.ts";
import { rendererVersion } from "@chronicle/szene";
import { mapToScreen } from "../src/geometry.ts";
import type { MapPinIcon, ProjectedMapScene } from "../src/model.ts";

vi.mock("pixi.js/unsafe-eval", () => ({}));

// The product factory and its camera/resource lifecycle run unchanged. This
// narrow Pixi boundary records geometry submission; it does not simulate GPU speed.
const pixi = vi.hoisted(() => ({ type: 1, resolution: 1, paths: 0, strokes: [] as { color?: number; width?: number; pixelLine?: boolean }[], textures: [] as { source: { scaleMode: string }; destroy: ReturnType<typeof vi.fn> }[],
  graphics: [] as { position: { x: number; y: number }; scale: { x: number; y: number }; circles: number[]; paths: number; visible: boolean; fills: unknown[]; strokes: unknown[]; segments: number[][] }[],
  stages: [] as { label: string; children: unknown[] }[],
  labels: [] as { text: string; visible: boolean }[], sprites: [] as { destroyed: boolean; position: { x: number; y: number }; scale: { x: number; y: number } }[] }));
vi.mock("pixi.js", () => {
  class Vector { x = 0; y = 0; set(x: number, y = x) { this.x = x; this.y = y; } }
  class Container {
    children: Container[] = []; position = new Vector(); scale = new Vector(); visible = true; eventMode = "auto"; mask: unknown; label = "";
    addChild(...children: Container[]) { this.children.push(...children); return children[0]; }
    removeChildren() { return this.children.splice(0); }
    destroy() { for (const child of this.removeChildren()) child.destroy(); }
  }
  class Graphics extends Container {
    circles: number[] = []; paths = 0; fills: unknown[] = []; strokes: unknown[] = []; segments: number[][] = []; ellipses = 0; blendMode = "normal"; rotation = 0;
    constructor() { super(); pixi.graphics.push(this); }
    clear() { this.circles.length = 0; this.paths = 0; this.fills.length = 0; return this; } rect() { return this; } ellipse() { this.ellipses++; return this; }
    circle(_x: number, _y: number, radius: number) { this.circles.push(radius); return this; } fill(style: unknown) { this.fills.push(style); return this; }
    poly() { pixi.paths++; this.paths++; return this; } moveTo(x: number, y: number) { pixi.paths++; this.paths++; this.segments.push([x, y]); return this; } lineTo(x: number, y: number) { this.segments.at(-1)?.push(x, y); return this; }
    stroke(style: { color?: number; width?: number; pixelLine?: boolean }) { pixi.strokes.push(style); this.strokes.push(style); return this; }
  }
  class Text extends Container { text = ""; width = 20; height = 10; anchor = new Vector(); rotation = 0; resolution = 1; style: unknown; constructor(options?: { text?: string; style?: unknown }) { super(); if (options?.text !== undefined) this.text = options.text; this.style = options?.style; pixi.labels.push(this); } }
  class Canvas extends EventTarget {
    style: Record<string, string> = {}; dataset: Record<string, string> = {}; tabIndex = 0;
    setAttribute() {} hasPointerCapture() { return false; } releasePointerCapture() {} setPointerCapture() {} focus() {}
    getBoundingClientRect() { return { left: 0, top: 0, width: 1200, height: 800 }; }
  }
  class Application {
    canvas = new Canvas(); stage = new Container(); renderer = { type: pixi.type, resolution: pixi.resolution, resize() {} };
    constructor() { pixi.stages.push(this.stage as unknown as { label: string; children: unknown[] }); }
    async init() {} render() {} destroy() { this.stage.destroy(); }
  }
  class Sprite extends Container {
    width = 0; height = 0; anchor = new Vector(); destroyed = false;
    constructor() { super(); pixi.sprites.push(this); }
    override destroy() { this.destroyed = true; super.destroy(); }
  }
  return { Application, Container, Graphics, Text, Sprite, RendererType: { WEBGL: 1, WEBGPU: 2, CANVAS: 4 }, Texture: { from() { const texture = { source: { scaleMode: "linear" }, destroy: vi.fn() }; pixi.textures.push(texture); return texture; } } };
});

const scene: ProjectedMapScene = { id: "authorized-scene", width: 2560, height: 2560, cells: [], pins: [],
  tokens: [{ id: "visible-token", x: 1200, y: 1200, label: "Known token", movable: true, revision: 1 }],
  lines: Array.from({ length: 1500 }, (_, i) => ({ id: `wall-${i}`, points: [[30 + i % 50 * 50, 30 + Math.floor(i / 50) * 70], [50 + i % 50 * 50, 42 + Math.floor(i / 50) * 70]] as const, color: 0xebc887 })),
  rasterScope: "authorized-view" };
/** Finds a named layer on the most recently created stage; layers carry Pixi's own `label`. */
function layer(name: string) {
  const walk = (node: { label: string; children: unknown[] }): { label: string; children: unknown[]; visible: boolean } | undefined =>
    node.label === name ? node as never : (node.children as { label: string; children: unknown[] }[]).map(walk).find(Boolean);
  const found = walk(pixi.stages.at(-1)!);
  if (!found) throw new Error(`no layer labelled ${name}`);
  return found;
}
function host() { const children: unknown[] = []; return { clientWidth: 1200, clientHeight: 800, appendChild(child: unknown) { children.push(child); }, children } as unknown as HTMLElement; }
beforeEach(() => {
  pixi.type = 1; pixi.resolution = 1; pixi.paths = 0; pixi.strokes.length = 0; pixi.textures.length = 0; pixi.graphics.length = 0; pixi.labels.length = 0; pixi.sprites.length = 0;
  vi.stubGlobal("window", { devicePixelRatio: 1 }); vi.stubGlobal("requestAnimationFrame", vi.fn(() => 1)); vi.stubGlobal("cancelAnimationFrame", vi.fn());
  vi.stubGlobal("ResizeObserver", class { observe() {} disconnect() {} });
});
afterEach(() => { vi.unstubAllGlobals(); });

describe("mounted renderer submission and resource lifecycle", () => {
  it("keeps a building entrance clickable and selectable without painting a dot over its roof", async () => {
    const map = await createMapRenderer(host(), { id: "roof", width: 400, height: 400, showLabels: true, cells: [],
      pins: [{ id: "house", x: 150, y: 150, label: "House", showMarker: false }] });
    expect(pixi.graphics.some(graphic => graphic.visible && graphic.circles.includes(5))).toBe(false);
    expect(map.hitTest(mapToScreen([150,150],map.getCamera()))).toEqual({ kind: "pin", id: "house" });
    map.select({ kind: "pin", id: "house" }); expect(pixi.labels.some(label => label.visible && label.text === "House")).toBe(true); map.destroy();
  });
  it("shows a selected building name once when its cell and entrance share the same label", async () => {
    const map = await createMapRenderer(host(), { id: "selection", width: 400, height: 400, showLabels: true,
      cells: [{ id: "house", polygon: [[100,100],[200,100],[200,200],[100,200]], label: "Selected house" }],
      pins: [{ id: "entrance", x: 150, y: 150, label: "Selected house" }] });
    map.select({ kind: "cell", id: "house" });
    expect(pixi.labels.filter(label => label.visible && label.text === "Selected house")).toHaveLength(1); map.destroy();
  });
  const pointer = (canvas: EventTarget, type: string, point: readonly number[], extra = {}) => canvas.dispatchEvent(Object.assign(new Event(type), { pointerId: 1, button: 0, clientX: point[0], clientY: point[1], ...extra }));
  it("routes opt-in edit drags in map coordinates without panning or moving a token", async () => {
    const mount = host(), begin = vi.fn(() => true), move = vi.fn(), commit = vi.fn(), token = vi.fn();
    const map = await createMapRenderer(mount, scene, { onMoveToken: token, editor: { active: () => true, begin, move, commit, cancel: vi.fn() } });
    const camera = map.getCamera(), canvas = mount.children[0]!;
    const start = mapToScreen([1200,1200], camera), end = mapToScreen([1400,1300], camera);
    pointer(canvas, "pointerdown", start); pointer(canvas, "pointermove", end); pointer(canvas, "pointerup", end);
    expect(begin).toHaveBeenCalledWith([1200,1200], { kind: "token", id: "visible-token" }, undefined);
    expect(move.mock.calls[0]![0][0]).toBeCloseTo(1400); expect(commit.mock.calls[0]![0][1]).toBeCloseTo(1300);
    expect(map.getCamera()).toEqual(camera); expect(token).not.toHaveBeenCalled(); map.destroy();
  });
  it("keeps token movement unchanged when editing is inactive and uses Alt as an explicit pan gesture", async () => {
    const mount = host(), begin = vi.fn(() => true), token = vi.fn(); let active = false;
    const map = await createMapRenderer(mount, scene, { onMoveToken: token, editor: { active: () => active, begin, move: vi.fn(), commit: vi.fn(), cancel: vi.fn() } });
    const camera = map.getCamera(), canvas = mount.children[0]!, start = mapToScreen([1200,1200], camera), end = [start[0]+50,start[1]+20];
    pointer(canvas, "pointerdown", start); pointer(canvas, "pointermove", end); pointer(canvas, "pointerup", end);
    expect(token).toHaveBeenCalledTimes(1); expect(begin).not.toHaveBeenCalled(); expect(map.getCamera()).toEqual(camera);
    active = true; pointer(canvas, "pointerdown", start, { altKey: true }); pointer(canvas, "pointermove", end); pointer(canvas, "pointerup", end);
    expect(begin).not.toHaveBeenCalled(); expect(token).toHaveBeenCalledTimes(1); expect(map.getCamera().x).toBe(camera.x+50); map.destroy();
  });
  it("cancels a live edit exactly once on scope replacement and teardown, keeping late pointerup inert", async () => {
    const mount = host(), cancel = vi.fn(), commit = vi.fn();
    const map = await createMapRenderer(mount, scene, { editor: { active: () => true, begin: () => true, move: vi.fn(), commit, cancel } });
    const canvas = mount.children[0]!, point = mapToScreen([1200,1200], map.getCamera());
    pointer(canvas, "pointerdown", point); map.update({ ...scene, rasterScope: "new-scope" }); pointer(canvas, "pointerup", point);
    expect(cancel).toHaveBeenCalledTimes(1); expect(commit).not.toHaveBeenCalled();
    pointer(canvas, "pointerdown", point); map.destroy(); expect(cancel).toHaveBeenCalledTimes(2);
  });
  it("submits shared ordered polygon colors without additional legacy roof strokes", async () => {
    const polygon = [[10,10],[100,10],[100,100],[10,100]] as const;
    const map = await createMapRenderer(host(), { ...scene, tokens: [], lines: [], cells: [{ id: "roof", polygon, surface: "building" }],
      drawing: { rendererVersion, width: scene.width, height: scene.height, background: null,
        polygons: [{ regionId: "roof", points: polygon, fill: 0x123456, opacity: .7 }, { regionId: "roof", points: polygon, fill: 0x654321, opacity: .2 }] } });
    // Scoped to the drawing's own layer: map furniture is chrome in a separate container and
    // must not be able to satisfy — or to break — a claim about the submitted cartography.
    const painted = layer("geography").children as { fills: unknown[]; strokes: unknown[] }[];
    expect(painted.flatMap(item => item.fills)).toEqual([{ color: 0x123456, alpha: .7 }, { color: 0x654321, alpha: .2 }]);
    expect(painted.flatMap(item => item.strokes)).toEqual([]);
    map.destroy();
  });
  it("keeps compass and scale bar out of the world and away from a map that carries no drawing", async () => {
    const plain = await createMapRenderer(host(), { ...scene, tokens: [], lines: [] });
    expect(layer("chrome").visible).toBe(false);
    plain.destroy();
    const drawn = await createMapRenderer(host(), { ...scene, tokens: [], lines: [], grid: { kind: "square", size: 128, origin: [0, 0] },
      drawing: { rendererVersion, width: scene.width, height: scene.height, background: null, polygons: [] } });
    const chrome = layer("chrome");
    expect(chrome.visible).toBe(true);
    // Chrome lives on the stage, never inside the panned/zoomed world container.
    expect((layer("geography") as { children: unknown[] }).children).not.toContain(chrome);
    // The cartouche is a caption too; without a title it stays an empty, hidden text.
    const captions = () => (chrome.children as { text?: string }[]).map(child => child.text).filter(text => typeof text === "string" && text !== "");
    expect(captions()).toEqual(["N", expect.stringContaining("Felder")]);
    const before = captions();
    drawn.zoomAt(8);
    expect(captions()).not.toEqual(before);
    drawn.destroy();
    // Without a grid the bar counts pixels, and its caption must name the span it really
    // covers: the real studio showed "10 Bildpunkte" under a bar a thousand pixels wide.
    const gridless = await createMapRenderer(host(), { ...scene, tokens: [], lines: [],
      drawing: { rendererVersion, width: scene.width, height: scene.height, background: null, polygons: [] } });
    const bar = layer("chrome").children as { text?: string; fills?: unknown[]; strokes?: { width?: number }[] }[];
    const caption = bar.map(child => child.text).find(text => typeof text === "string" && text !== "N")!;
    const span = Number.parseInt(caption.replace(/\./g, ""), 10);
    // Four painted quarters plus the outline: the bar's own drawn width in screen pixels.
    const painted = bar.find(child => (child.fills?.length ?? 0) === 4)!;
    expect(caption).toMatch(/Bildpunkt/);
    expect(span * gridless.getCamera().scale).toBeGreaterThan(60);
    expect(span * gridless.getCamera().scale).toBeLessThanOrEqual(260);
    expect(painted).toBeDefined();
    gridless.destroy();
  });
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

  it("toggles names and grid without changing camera, marker glyphs or hit targets", async () => {
    const projected: ProjectedMapScene = { ...scene, tokens: [], lines: [], showLabels: true,
      grid: { kind: "square", origin: [0, 0], size: 100 }, pins: [{ id: "church", label: "Kirche", icon: "portal", x: 1200, y: 1200 }] };
    const map = await createMapRenderer(host(), projected);
    map.zoomAt(1.4); map.panBy(12, -17); map.select({ kind: "pin", id: "church" });
    const camera = map.getCamera(), center = mapToScreen([1200, 1200], camera);
    expect(pixi.labels.some(text => text.visible && text.text === "Kirche")).toBe(true);
    map.update({ ...projected, showLabels: false, grid: { kind: "none" } });
    expect(map.getCamera()).toEqual(camera); expect(pixi.labels.some(text => text.visible)).toBe(false);
    expect(map.hitTest(center)).toEqual({ kind: "pin", id: "church" });
    expect(pixi.graphics.some(graphics => graphics.position.x === 1200 && graphics.circles[0] === 11 && graphics.visible)).toBe(true);
    map.update(projected);
    expect(map.getCamera()).toEqual(camera); expect(pixi.labels.some(text => text.visible && text.text === "Kirche")).toBe(true);
    map.destroy();
  });

  it("limits crowded names while preserving every icon and picking target", async () => {
    const pins = Array.from({ length: 400 }, (_, index) => ({ id: `house-${index}`, x: 1200, y: 1200, label: `Haus ${index}`, icon: "place" as const }));
    const map = await createMapRenderer(host(), { ...scene, tokens: [], lines: [], showLabels: true, pins });
    expect(pixi.labels.filter(text => text.visible)).toHaveLength(1);
    expect(pixi.graphics.filter(graphics => graphics.circles[0] === 11)).toHaveLength(400);
    expect(map.hitTest(mapToScreen([1200, 1200], map.getCamera()))).toEqual({ kind: "pin", id: "house-399" });
    map.select({ kind: "pin", id: "house-10" });
    expect(pixi.labels.some(text => text.visible && text.text === "Haus 10")).toBe(true); map.destroy();
  });

  it("renders opaque roofs and streets while clipping concave roof ridges away from a courtyard", async () => {
    const polygon = [[0, 0], [120, 0], [120, 100], [80, 100], [80, 30], [40, 30], [40, 100], [0, 100]] as const;
    const map = await createMapRenderer(host(), { ...scene, tokens: [], lines: [], cells: [
      { id: "street", polygon: [[0, 0], [130, 0], [130, 110]], surface: "street" },
      { id: "house", polygon, surface: "building" }, { id: "region", polygon, fill: 0x112233 },
    ] });
    const roof = pixi.graphics.find(graphics => graphics.fills.some(fill => typeof fill === "object" && fill !== null && "color" in fill && fill.color === 0xb87954))!;
    expect(roof.fills).toContainEqual({ color: 0xb87954, alpha: 1 });
    expect(roof.segments).toHaveLength(2);
    for (const [x1, y1, x2, y2] of roof.segments) { expect(y1).toBe(50); expect(y2).toBe(50); expect(x1! >= 0 && x2! <= 40 || x1! >= 80 && x2! <= 120).toBe(true); }
    expect(pixi.graphics.flatMap(graphics => graphics.fills)).toContainEqual({ color: 0xb4a180, alpha: 1 });
    expect(pixi.graphics.flatMap(graphics => graphics.fills)).toContainEqual({ color: 0x112233, alpha: .08 });
    map.destroy();
  });

  it("releases stamp artwork removed from a replacement scene and closes late unused images", async () => {
    const asset = "pk.city/roof", bitmap = { width: 64, height: 64, close: vi.fn() } as unknown as ImageBitmap;
    const map = await createMapRenderer(host(), { ...scene, lines: [], stamps: [{ id: "roof", asset, x: 100, y: 100, s: 1, r: 0, l: 0 }] });
    map.setStampImages([{ asset, image: bitmap }]);
    map.update({ ...scene, lines: [] }); expect(bitmap.close).toHaveBeenCalledTimes(1);
    const late = { close: vi.fn() } as unknown as ImageBitmap;
    map.setStampImages([{ asset, image: late }]); expect(late.close).toHaveBeenCalledTimes(1);
    expect(pixi.textures).toHaveLength(1); map.destroy();
  });

  it.each([15, 40])("keeps a partly visible 128 x 320 bitmap on layer %s through zoom and culls it only offscreen", async layer => {
    const asset = "pk.zeitwelten/bus", bitmap = { width: 128, height: 320, close: vi.fn() } as unknown as ImageBitmap;
    const map = await createMapRenderer(host(), { ...scene, width: 4096, height: 4096, tokens: [], lines: [],
      stamps: [{ id: "bus", asset, x: 700, y: 1700, s: 10, r: 0, l: layer }] });
    const visible = () => pixi.sprites.filter(sprite => !sprite.destroyed);
    map.setCamera({ x: 0, y: 0, scale: 1 }); map.setStampImages([{ asset, image: bitmap }]);
    expect(visible()).toHaveLength(1);
    expect(visible()[0]).toMatchObject({ position: { x: 700, y: 1700 }, scale: { x: 10, y: 10 } });
    map.setCamera({ x: 0, y: 0, scale: 2 }); expect(visible()).toHaveLength(1);
    map.panBy(0, -10_000); expect(visible()).toHaveLength(0);
    map.destroy(); expect(bitmap.close).toHaveBeenCalledTimes(1);
  });

  it.each(["flat", "tech"] as const)("clips %s roof seams inside a concave footprint", async roof => {
    const polygon = [[0, 0], [120, 0], [120, 100], [80, 100], [80, 20], [40, 20], [40, 100], [0, 100]] as const;
    const map = await createMapRenderer(host(), { ...scene, tokens: [], lines: [], cells: [{ id: "building", polygon, surface: "building", roof }] });
    const shape = pixi.graphics.find(graphics => graphics.fills.some(fill => typeof fill === "object" && fill !== null && "color" in fill && fill.color === 0xb87954))!;
    expect(shape.segments.length).toBeGreaterThan(2);
    for (const [x1, y1, x2, y2] of shape.segments) {
      expect(y1).toBe(y2); expect(y1! > 20 && y1! < 100).toBe(true);
      expect(x1! >= 0 && x2! <= 40 || x1! >= 80 && x2! <= 120).toBe(true);
    }
    map.destroy();
  });

  it("rejects unknown presentation surfaces and non-boolean name visibility", async () => {
    await expect(createMapRenderer(host(), { ...scene, showLabels: "yes" } as unknown as ProjectedMapScene)).rejects.toThrow("label visibility");
    await expect(createMapRenderer(host(), { ...scene, cells: [{ id: "bad", polygon: [[0, 0], [10, 0], [10, 10]], surface: "external" }] } as unknown as ProjectedMapScene)).rejects.toThrow("map surface");
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

describe("the cartouche and the stone wall", () => {
  it("names a drawn map in its corner and stays silent on a map without a drawing or a title", async () => {
    const drawing = { rendererVersion, width: scene.width, height: scene.height, background: null, polygons: [] };
    const titled = await createMapRenderer(host(), { ...scene, tokens: [], lines: [], title: "Silberbach", drawing });
    const chromeTexts = () => (layer("chrome").children as { text?: string; visible: boolean }[]).filter(child => typeof child.text === "string");
    expect(chromeTexts().some(text => text.text === "Silberbach" && text.visible)).toBe(true);
    titled.update({ ...scene, tokens: [], lines: [], drawing });
    expect(chromeTexts().some(text => text.text === "Silberbach" && text.visible)).toBe(false);
    titled.update({ ...scene, tokens: [], lines: [], title: "Silberbach" });
    expect(chromeTexts().some(text => text.visible)).toBe(false);
    titled.destroy();
  });
  it("draws uncoloured walls as stone with a shadow and a seam sized by the cell, and doors as two-pixel marks", async () => {
    const map = await createMapRenderer(host(), { ...scene, tokens: [], grid: { kind: "square", size: 64, origin: [0, 0] },
      lines: [{ id: "wall", points: [[10, 10], [200, 10]] }, { id: "door", points: [[50, 10], [70, 10]], color: 0x6faa98 }] });
    pixi.strokes.length = 0; map.zoomAt(1.5);
    const widths = pixi.strokes.map(style => style.width!);
    expect(pixi.strokes).toHaveLength(4);
    expect(widths[1]).toBeCloseTo(64 * .11, 5); expect(widths[0]).toBeGreaterThan(widths[1]!); expect(widths[2]).toBeLessThan(widths[1]!);
    expect(pixi.strokes[3]!.color).toBe(0x6faa98); expect(widths[3]! * map.getCamera().scale).toBeCloseTo(2, 10);
    map.destroy();
  });
});

describe("light, shadow and ink on a drawn map", () => {
  const drawing = { rendererVersion, width: scene.width, height: scene.height, background: null, polygons: [] };
  it("pools every light additively over the floor and under the walls, and clears them with the scene", async () => {
    const map = await createMapRenderer(host(), { ...scene, tokens: [], lines: [], drawing, lights: [{ id: "torch", x: 100, y: 100, range: 200, intensity: .5, color: 0xdd8a33 }, { id: "candle", x: 300, y: 300, range: 80 }] });
    const glow = layer("glow") as { blendMode: string; circles: number[]; fills: { alpha?: number }[] };
    expect(glow.blendMode).toBe("add");
    expect(glow.circles).toHaveLength(8);
    expect(glow.circles.slice(0, 3)).toEqual([200, 124, 60]);
    expect(glow.fills[0]).toMatchObject({ color: 0xdd8a33, alpha: .02 });
    const world = (pixi.stages.find(stage => stage.label === "") ?? { children: [] }).children;
    void world;
    map.update({ ...scene, tokens: [], lines: [], drawing });
    expect(glow.circles).toHaveLength(0);
    map.destroy();
  });
  it("lays a shadow under furniture on a drawn map only, never under floors, doors or marks", async () => {
    const stamps = [{ id: "floor", asset: "pk.gemalt/boden", x: 50, y: 50, s: 1, r: 0, l: -100 }, { id: "chest", asset: "pk.gemalt/truhe", x: 90, y: 90, s: 1, r: 0, l: 0 }, { id: "door", asset: "pk.gemalt/tuer", x: 130, y: 130, s: 1, r: 0, l: 20 }];
    const image = () => ({ width: 32, height: 32, close: vi.fn() }) as unknown as ImageBitmap;
    const drawn = await createMapRenderer(host(), { ...scene, tokens: [], lines: [], drawing, stamps });
    drawn.setStampImages(stamps.map(stamp => ({ asset: stamp.asset, image: image() })));
    const shadows = () => pixi.graphics.filter(graphics => (graphics as unknown as { ellipses: number }).ellipses > 0).length;
    expect(shadows()).toBe(1);
    drawn.destroy(); pixi.graphics.length = 0;
    const plain = await createMapRenderer(host(), { ...scene, tokens: [], lines: [], stamps });
    plain.setStampImages(stamps.map(stamp => ({ asset: stamp.asset, image: image() })));
    expect(shadows()).toBe(0);
    plain.destroy();
  });
  it("sets place names in ink on a drawn map and keeps the bright label on a photographed one", async () => {
    const pins = [{ id: "inn", x: 400, y: 400, label: "Zum goldenen Hirsch" }];
    const map = await createMapRenderer(host(), { ...scene, tokens: [], lines: [], showLabels: true, pins, drawing });
    const label = () => pixi.labels.find(text => text.text === "Zum goldenen Hirsch") as { style?: { fill?: number; fontFamily?: string } } | undefined;
    expect(label()?.style?.fill).toBe(0x2c2519); expect(label()?.style?.fontFamily).toContain("serif");
    map.update({ ...scene, tokens: [], lines: [], showLabels: true, pins });
    expect(label()?.style?.fill).toBe(0xf4ebd8);
    map.destroy();
  });
});

describe("the same room by night", () => {
  const drawing = { rendererVersion, width: scene.width, height: scene.height, background: null, polygons: [] };
  it("lets the lights carry two and a half times as far and as strong", async () => {
    const lights = [{ id: "torch", x: 100, y: 100, range: 200, intensity: .5, color: 0xdd8a33 }];
    const map = await createMapRenderer(host(), { ...scene, tokens: [], lines: [], drawing, lights, mood: "nacht" });
    const glow = layer("glow") as { circles: number[]; fills: { alpha?: number }[] };
    expect(glow.circles).toEqual([270, 200, 124, 60, 12]);
    expect(glow.fills[0]).toMatchObject({ color: 0xdd8a33, alpha: .0375 });
    expect(glow.fills[1]).toMatchObject({ color: 0xdd8a33, alpha: .05 });
    map.update({ ...scene, tokens: [], lines: [], drawing, lights });
    expect(glow.circles).toEqual([200, 124, 60, 12]);
    expect(glow.fills[0]).toMatchObject({ alpha: .02 });
    map.destroy();
  });
  it("sets names in moonlit ink and stands the furniture in the same moonlight", async () => {
    const pins = [{ id: "inn", x: 400, y: 400, label: "Zum goldenen Hirsch" }];
    const stamps = [{ id: "chest", asset: "pk.gemalt/truhe", x: 90, y: 90, s: 1, r: 0, l: 0 }];
    const map = await createMapRenderer(host(), { ...scene, tokens: [], lines: [], showLabels: true, pins, drawing, stamps, mood: "nacht" });
    map.setStampImages([{ asset: "pk.gemalt/truhe", image: { width: 32, height: 32, close: vi.fn() } as unknown as ImageBitmap }]);
    const label = () => pixi.labels.find(text => text.text === "Zum goldenen Hirsch") as { style?: { fill?: number; fontFamily?: string } } | undefined;
    expect(label()?.style?.fill).toBe(0xe9e2cf); expect(label()?.style?.fontFamily).toContain("serif");
    expect((pixi.sprites.at(-1) as { tint?: number }).tint).toBe(0x8a93b3);
    map.update({ ...scene, tokens: [], lines: [], showLabels: true, pins, drawing, stamps, mood: "winter" });
    expect(label()?.style?.fill).toBe(0x2c2519);
    expect((pixi.sprites.at(-1) as { tint?: number }).tint).toBeUndefined();
    map.destroy();
  });
});

describe("names lettered along their lines", () => {
  const drawing = { rendererVersion, width: scene.width, height: scene.height, background: null, polygons: [] };
  const letters = () => (layer("lettering") as { children: { text: string; rotation: number; position: { x: number; y: number }; style?: { fill?: number; fontStyle?: string } }[] }).children;
  it("sets one letter per character along the line, turned with it, centred on its middle, and a clicked name whole", async () => {
    const labels = [{ id: "bach", text: "Silberbach", points: [[100, 100], [500, 100], [500, 500]] as const, size: 24, style: "wasser" as const }, { id: "feste", text: "Alte Feste", points: [[800, 800]] as const, size: 30, style: "ort" as const }];
    const map = await createMapRenderer(host(), { ...scene, tokens: [], lines: [], drawing, labels });
    const all = letters(), bach = all.filter(item => item.text.length === 1), feste = all.find(item => item.text === "Alte Feste")!;
    expect(bach.map(item => item.text).join("")).toBe("Silberbach");
    expect(feste.position).toMatchObject({ x: 800, y: 800 }); expect(feste.rotation).toBe(0);
    // Ten letters of 20 px with a little air between them are centred on the 800 px line: the
    // first sits on the first leg, the last on the second, and the corner turns the word down.
    expect(bach[0]!.rotation).toBe(0); expect(bach.at(-1)!.rotation).toBeCloseTo(Math.PI / 2);
    expect(bach[0]!.position.y).toBe(100); expect(bach.at(-1)!.position.x).toBe(500);
    expect(bach[0]!.style?.fontStyle).toBe("italic"); expect(bach[0]!.style?.fill).toBe(0x2f5666);
    map.update({ ...scene, tokens: [], lines: [], drawing, labels: [labels[1]!], mood: "nacht" });
    expect(letters()).toHaveLength(1); expect(letters()[0]!.style?.fill).toBe(0xe9e2cf);
    map.update({ ...scene, tokens: [], lines: [], drawing });
    expect(letters()).toHaveLength(0);
    map.destroy();
  });
  it("turns a line drawn right to left around so the name still reads left to right, and spaces a region out in capitals", async () => {
    const map = await createMapRenderer(host(), { ...scene, tokens: [], lines: [], drawing, labels: [{ id: "wald", text: "Finsterwald", points: [[900, 300], [100, 300]], size: 40, style: "gegend" }] });
    const glyphs = letters();
    expect(glyphs.map(item => item.text).join("")).toBe("FINSTERWALD");
    expect(glyphs[0]!.position.x).toBeLessThan(glyphs.at(-1)!.position.x);
    expect(glyphs.every(item => item.rotation === 0)).toBe(true);
    map.destroy();
  });
});
