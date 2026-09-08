// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2026 Kaya Yesilyurt - Atlas Chronicles. Siehe LICENSE.
/// <reference lib="dom" />
import { fitCamera, hitTestMap, mapPinHitRadius, mapToScreen, normalizeCamera, retainsTokenDrag, screenToMap, validateMapScene, zoomCamera } from "./geometry.ts";
import { rasterTileDisplaySize } from "./tactical-geometry.ts";
import { createGridGeometryCache } from "./grid-cache.ts";
import { planeStapel } from "./stapel.ts";
import type { MapCamera, MapHit, MapPoint, MapRenderer, ProjectedMapPin, ProjectedMapScene, ProjectedMapToken } from "./model.ts";

export interface MapRendererOptions {
  readonly onSelect?: (hit: MapHit | null) => void;
  readonly onCameraChange?: (camera: MapCamera) => void;
  readonly onMoveToken?: (tokenId: string, to: MapPoint) => void;
  readonly onPoint?: (point: MapPoint) => void;
  readonly signal?: AbortSignal;
}
export class MapRendererUnavailableError extends Error {
  constructor(cause: unknown) {
    super("Die Grafikkarte konnte nicht gestartet werden. Die Ortsliste bleibt verfügbar.", { cause });
    this.name = "MapRendererUnavailableError";
  }
}

/**
 * PixiJS implementation of the replaceable MapRenderer boundary. No requests, credentials,
 * hidden objects, raw imports or knowledge policy enter this module. The host owns the
 * accessible DOM list and routes; onSelect returns only the selected projected identity.
 */
export async function createMapRenderer(host: HTMLElement, initial: ProjectedMapScene, options: MapRendererOptions = {}): Promise<MapRenderer> {
  validateMapScene(initial);
  if (options.signal?.aborted) throw new DOMException("Renderer creation aborted", "AbortError");
  const { Application, Container, Graphics, Text, Sprite, Texture, RendererType } = await import("pixi.js");
  const app = new Application();
  let viewport: MapPoint = [Math.max(1, host.clientWidth), Math.max(1, host.clientHeight)];
  try {
    await app.init({ width: viewport[0], height: viewport[1], preference: "webgl", antialias: true,
      autoDensity: true, resolution: Math.min(window.devicePixelRatio || 1, 2), backgroundColor: 0x14212b, autoStart: false });
  } catch (error) {
    try { app.destroy(true, { children: true }); } catch { /* initialization may not have created a renderer */ }
    throw new MapRendererUnavailableError(error);
  }
  if (options.signal?.aborted) {
    app.destroy(true, { children: true });
    throw new DOMException("Renderer creation aborted", "AbortError");
  }
  const backend = app.renderer.type === RendererType.WEBGL ? "pixi-webgl" : app.renderer.type === RendererType.WEBGPU ? "pixi-webgpu"
    : app.renderer.type === RendererType.CANVAS ? "pixi-canvas" : null;
  if (!backend) { app.destroy(true, { children: true }); throw new MapRendererUnavailableError(new Error("Unsupported Pixi renderer type")); }
  const nativePixelGrid = backend !== "pixi-canvas" && app.renderer.resolution === 1;
  const canvas = app.canvas as HTMLCanvasElement;
  canvas.style.display = "block";
  canvas.style.width = "100%";
  canvas.style.height = "100%";
  canvas.style.touchAction = "none";
  canvas.tabIndex = 0;
  canvas.setAttribute("role", "img");
  canvas.setAttribute("aria-label", "Interaktive Karte. Pfeiltasten verschieben, Plus und Minus zoomen, Pos1 zeigt die gesamte Karte. Orte können auch in der Ortsliste ausgewählt werden.");
  canvas.dataset.mapBackend = backend;
  host.appendChild(canvas);
  const world = new Container();
  const geography = new Container();
  const raster = new Container(), rasterBounds = new Graphics(), gridOverlay = new Graphics(), wallsOverlay = new Graphics(), dragPreview = new Graphics();
  const markers = new Container();
  // Placements sit above the floor and below walls, grid and markers: furniture is part of the
  // ground truth of the room, but it must never hide a wall or a token.
  const stampLayer = new Container();
  world.addChild(rasterBounds, raster, geography, stampLayer, gridOverlay, wallsOverlay, markers, dragPreview);
  raster.mask = rasterBounds;
  app.stage.addChild(world);
  const selection = new Graphics().circle(0, 0, 15).stroke({ color: 0xffe7a1, width: 2 }); selection.visible = false;
  const label = new Text({ text: "", style: { fontFamily: "system-ui, sans-serif", fontSize: 14, fill: 0xffffff,
    stroke: { color: 0x14212b, width: 4 } } });
  app.stage.addChild(selection, label);
  let scene = initial;
  let camera = fitCamera([scene.width, scene.height], viewport);
  let selected: MapHit | null = null;
  let destroyed = false;
  let scheduled = 0;
  let markerGraphics: InstanceType<typeof Graphics>[] = [];
  const gridCache = createGridGeometryCache();
  let previousGridLines: readonly (readonly MapPoint[])[] | undefined, previousScale = Number.NaN;
  const rasterResources: { bitmap: ImageBitmap; texture: InstanceType<typeof Texture> }[] = [];
  const stampTextures = new Map<string, { bitmap: ImageBitmap; texture: InstanceType<typeof Texture> }>();
  const clearStampTextures = () => {
    for (const resource of stampTextures.values()) { resource.texture.destroy(true); resource.bitmap.close(); }
    stampTextures.clear();
  };
  const clearRaster = () => {
    for (const child of raster.removeChildren()) child.destroy();
    for (const resource of rasterResources.splice(0)) { resource.texture.destroy(true); resource.bitmap.close(); }
  };
  const listeners = new AbortController();
  const render = (): void => {
    if (destroyed || scheduled) return;
    scheduled = requestAnimationFrame(() => { scheduled = 0; if (!destroyed) app.render(); });
  };
  const updateSelection = (): void => {
    selection.visible = false;
    label.visible = false;
    if (!selected) return;
    const item = selected.kind === "pin" ? scene.pins.find((p) => p.id === selected!.id)
      : selected.kind === "token" ? scene.tokens?.find((t) => t.id === selected!.id) : undefined;
    if (item) {
      const p = mapToScreen([item.x, item.y], camera);
      selection.position.set(p[0], p[1]); selection.visible = true;
      label.text = item.label;
      label.position.set(Math.min(Math.max(4, p[0] + 18), Math.max(4, viewport[0] - label.width - 4)), Math.min(Math.max(4, p[1] - 12), Math.max(4, viewport[1] - label.height - 4)));
      label.visible = true;
    }
  };
  const drawWalls = (): void => {
    wallsOverlay.clear();
    let color: number | undefined;
    // Batch only adjacent equal-color paths, retaining original overlap order.
    // Zoom still rebuilds stroke geometry to preserve exactly 2 CSS pixels.
    for (const line of scene.lines ?? []) {
      const next = line.color ?? 0xebc887;
      if (color !== undefined && color !== next) wallsOverlay.stroke({ color, width: 2 / camera.scale });
      color = next;
      const first = line.points[0]!; wallsOverlay.moveTo(first[0], first[1]);
      for (let i = 1; i < line.points.length; i++) { const point = line.points[i]!; wallsOverlay.lineTo(point[0], point[1]); }
    }
    if (color !== undefined) wallsOverlay.stroke({ color, width: 2 / camera.scale });
  };
  const applyCamera = (changedGeometry = false): void => {
    world.position.set(camera.x, camera.y);
    world.scale.set(camera.scale);
    const changedScale = camera.scale !== previousScale;
    if (changedGeometry || changedScale) { for (const marker of markerGraphics) marker.scale.set(1 / camera.scale); drawWalls(); }
    const gridLines = gridCache.lines([scene.width, scene.height], viewport, camera, scene.grid);
    // Native GPU lines stay one physical pixel without retessellation. At
    // higher pixel densities, or on Canvas2D, preserve one CSS pixel explicitly.
    if (gridLines !== previousGridLines || (!nativePixelGrid && changedScale)) {
      gridOverlay.clear();
      for (const points of gridLines) {
        const first = points[0]!; gridOverlay.moveTo(first[0], first[1]);
        for (let i = 1; i < points.length; i++) { const point = points[i]!; gridOverlay.lineTo(point[0], point[1]); }
      }
      if (gridLines.length) gridOverlay.stroke({ color: 0xddd8c8, width: nativePixelGrid ? 1 : 1 / camera.scale, pixelLine: nativePixelGrid, alpha: .22 });
      previousGridLines = gridLines;
    }
    previousScale = camera.scale;
    updateSelection();
    render();
    // Panning far enough to leave the culled window is the only thing that can reveal a stamp
    // that was legitimately dropped last frame. Zooming always re-culls, because scale changes
    // what fits on screen at all.
    if (stampsVeraltet()) drawStamps();
    options.onCameraChange?.({ ...camera });
  };
  const clear = (container: InstanceType<typeof Container>): void => {
    for (const child of container.removeChildren()) child.destroy({ children: true });
  };
  /**
   * Slack around the viewport, in CSS pixels, that a cull covers beyond what is on screen.
   * Culling exactly to the viewport would be correct and useless: every pan of one pixel would
   * rebuild every sprite. Culling to a padded window means a pan only pays when it leaves it.
   */
  const STAMP_RAND = 256;
  let stampAnker: { x: number; y: number; scale: number } | null = null;
  const stampsVeraltet = (): boolean =>
    stampAnker === null || stampAnker.scale !== camera.scale ||
    Math.abs(stampAnker.x - camera.x) > STAMP_RAND || Math.abs(stampAnker.y - camera.y) > STAMP_RAND;
  const drawStamps = (): void => {
    for (const child of stampLayer.removeChildren()) child.destroy();
    stampAnker = { x: camera.x, y: camera.y, scale: camera.scale };
    if (!scene.stamps?.length) return;
    // Cull against a window larger than the viewport, centred on it: grow the viewport by the
    // slack on every side and shift the camera by half of it, so the extra coverage is
    // symmetric rather than anchored at the top-left corner.
    const plan = planeStapel(
      scene.stamps,
      { ...camera, x: camera.x + STAMP_RAND, y: camera.y + STAMP_RAND },
      [viewport[0] + STAMP_RAND * 2, viewport[1] + STAMP_RAND * 2],
    );
    // Draw in the AUTHOR's order, not in bucket order. `planeStapel` groups by texture because
    // that is what a batch wants, but layer order is a statement about what lies on top of what:
    // a rug drawn after the table it belongs under is a wrong picture, and a wrong picture costs
    // more than a draw call. Pixi still batches the runs that happen to share a texture.
    const sichtbar = plan.buendel.flatMap((b) => b.stamps)
      .sort((a, b) => a.l - b.l || (a.id < b.id ? -1 : 1));
    for (const stamp of sichtbar) {
      const resource = stampTextures.get(stamp.asset);
      // No artwork, no shape. A placeholder box would be indistinguishable from real furniture at
      // a glance, which is exactly the kind of picture that lies about what is in the room.
      if (!resource) continue;
      const sprite = new Sprite(resource.texture);
      sprite.anchor.set(.5);
      sprite.position.set(stamp.x, stamp.y);
      sprite.rotation = stamp.r;
      sprite.scale.set(stamp.s);
      if (stamp.t) sprite.tint = stamp.t;
      sprite.eventMode = "none";
      stampLayer.addChild(sprite);
    }
  };
  const drawPin = (pin: ProjectedMapPin): InstanceType<typeof Graphics> => {
    const shape = new Graphics();
    if (!pin.icon) return shape.circle(0, 0, 5).fill(pin.color ?? 0xebc887).stroke({ color: 0x13202a, width: 1.5 });
    const color = pin.color ?? (pin.icon === "portal" ? 0x80d9c9 : 0xebc887);
    // One Graphics per pin, with no textures or extra display objects. Both the outline
    // and glyph are authored in CSS pixels; applyCamera cancels their world zoom.
    shape.circle(0, 0, mapPinHitRadius(pin) - 1).fill(0x14212b).stroke({ color, width: 1.5 });
    switch (pin.icon) {
      case "place":
        shape.poly([-5, -2, -4, -5, 0, -7, 4, -5, 5, -2, 4, 1, 0, 7, -4, 1], true).stroke({ color, width: 1.5 });
        shape.circle(0, -2, 1.6).fill(color);
        break;
      case "city":
        shape.moveTo(-7, 6).lineTo(-7, -2).lineTo(-2, -2).lineTo(-2, 6)
          .moveTo(-2, -2).lineTo(-2, -6).lineTo(3, -6).lineTo(3, 6)
          .moveTo(3, 0).lineTo(7, 0).lineTo(7, 6).lineTo(-7, 6)
          .moveTo(0.5, -3.5).lineTo(0.5, -1.5).moveTo(-4.5, 1).lineTo(-4.5, 3).stroke({ color, width: 1.5 });
        break;
      case "castle":
        shape.poly([-7, 6, -7, -6, -4, -6, -4, -3, -1.5, -3, -1.5, -6, 1.5, -6, 1.5, -3, 4, -3, 4, -6, 7, -6, 7, 6], true)
          .moveTo(-2, 6).lineTo(-2, 1).lineTo(2, 1).lineTo(2, 6).stroke({ color, width: 1.5 });
        break;
      case "cave":
        shape.poly([-7, 6, -6, -1, -2, -6, 3, -5, 7, 0, 7, 6], true)
          .moveTo(-3, 6).lineTo(-3, 1).lineTo(0, -2).lineTo(3, 1).lineTo(3, 6).stroke({ color, width: 1.5 });
        break;
      case "ruin":
        shape.moveTo(-7, 6).lineTo(7, 6).moveTo(-5, 6).lineTo(-5, -3).lineTo(-2, -3).lineTo(-2, 6)
          .moveTo(2, 6).lineTo(2, -1).lineTo(5, -4).lineTo(5, 6)
          .moveTo(-7, -4).lineTo(-3, -7).lineTo(0, -5).moveTo(3, -5).lineTo(7, -3).stroke({ color, width: 1.5 });
        break;
      case "portal":
        shape.moveTo(-6, 6).lineTo(-6, -6).lineTo(3, -6).lineTo(3, 6)
          .moveTo(-6, -6).lineTo(0, -3).lineTo(0, 8).lineTo(-6, 6)
          .moveTo(2, 1).lineTo(7, 1).moveTo(5, -1).lineTo(7, 1).lineTo(5, 3).stroke({ color, width: 1.5 });
        break;
    }
    return shape;
  };
  const draw = (): void => {
    rasterBounds.clear().rect(0, 0, scene.width, scene.height).fill(0xffffff);
    drawStamps();
    clear(geography);
    clear(markers);
    markerGraphics = [];
    // Separate simple polygons preserve Pixi's batching; geometry is rebuilt only on update.
    for (const cell of scene.cells) {
      const shape = new Graphics().poly(cell.polygon.flatMap((p) => [p[0], p[1]]), true).fill({ color: cell.fill ?? 0x536b52, alpha: scene.rasterScope ? .08 : 1 });
      shape.eventMode = "none";
      geography.addChild(shape);
    }
    for (const pin of scene.pins) {
      const shape = drawPin(pin);
      shape.position.set(pin.x, pin.y);
      shape.eventMode = "none";
      markers.addChild(shape);
      markerGraphics.push(shape);
    }
    for (const token of scene.tokens ?? []) {
      const shape = new Graphics().circle(0, 0, token.radius ?? 11).fill(token.color ?? 0x81b8d1).stroke({ color: 0xffffff, width: 2 });
      shape.position.set(token.x, token.y);
      shape.eventMode = "none";
      markers.addChild(shape);
      markerGraphics.push(shape);
    }
    canvas.dataset.mapScene = scene.id;
    applyCamera(true);
  };
  const ensureAlive = (): void => { if (destroyed) throw new Error("MapRenderer has been destroyed"); };
  const renderer: MapRenderer = {
    backend,
    update(next) {
      ensureAlive();
      validateMapScene(next);
      const changedWorld = next.id !== scene.id || next.width !== scene.width || next.height !== scene.height;
      const changedScope = scene.rasterScope !== next.rasterScope;
      const previousSelection = selected;
      if (changedScope || changedWorld) clearRaster();
      scene = next;
      // Artwork belongs to the placements still in this map, not every asset edited here.
      const usedStampAssets = new Set(scene.stamps?.map(stamp => stamp.asset) ?? []);
      for (const [asset, resource] of stampTextures) {
        if (usedStampAssets.has(asset)) continue;
        resource.texture.destroy(true); resource.bitmap.close(); stampTextures.delete(asset);
      }
      for (const resource of rasterResources) resource.texture.source.scaleMode = scene.rasterSampling ?? "linear";
      if (drag && (changedWorld || changedScope || (drag.snapshot && !retainsTokenDrag(drag.snapshot, scene.tokens?.find(t => t.id === drag?.token))))) {
        if (canvas.hasPointerCapture(drag.id)) canvas.releasePointerCapture(drag.id);
        drag = null; dragPreview.clear();
      }
      if (changedWorld) { camera = fitCamera([scene.width, scene.height], viewport); selected = null; }
      // Remove a selection if the server's replacement projection no longer includes it.
      if (selected && !(selected.kind === "pin" ? scene.pins : selected.kind === "token" ? scene.tokens ?? [] : scene.cells).some((r) => r.id === selected!.id)) selected = null;
      draw();
      if (previousSelection && !selected) options.onSelect?.(null);
    },
    applyPatch(patch) {
      ensureAlive(); if (patch.sceneId !== scene.id) throw new Error("patch belongs to another scene");
      renderer.update({ ...scene, ...(patch.cells ? { cells: patch.cells } : {}), ...(patch.pins ? { pins: patch.pins } : {}), ...(patch.tokens ? { tokens: patch.tokens } : {}) });
    },
    setStampImages(images) {
      for (const { asset, image } of images) {
        const existing = stampTextures.get(asset);
        if (existing) { existing.texture.destroy(true); existing.bitmap.close(); }
        stampTextures.set(asset, { bitmap: image, texture: Texture.from(image) });
      }
      drawStamps();
      render();
    },
    setRasterTiles(scope, tiles) {
      ensureAlive();
      if (scope !== scene.rasterScope) { for (const tile of tiles) tile.image.close(); return; }
      if (tiles.length > 128 || new Set(tiles.map(t => t.id)).size !== tiles.length || tiles.some(t => ![t.left, t.top, t.width, t.height, t.pixelScale].every(Number.isFinite) || t.left < 0 || t.top < 0 || t.width <= 0 || t.height <= 0 || t.pixelScale < 1 || t.pixelScale > 32768 || !Number.isInteger(Math.log2(t.pixelScale)) || t.left + t.width > scene.width || t.top + t.height > scene.height || t.image.width !== Math.ceil(t.width / t.pixelScale) || t.image.height !== Math.ceil(t.height / t.pixelScale) || t.image.width > 1024 || t.image.height > 1024)) {
        for (const tile of tiles) tile.image.close(); throw new Error("invalid raster tiles");
      }
      clearRaster();
      for (const tile of tiles) { const texture = Texture.from(tile.image); texture.source.scaleMode = scene.rasterSampling ?? "linear"; const sprite = new Sprite(texture); sprite.position.set(tile.left, tile.top); const size = rasterTileDisplaySize(tile, [tile.image.width, tile.image.height]); sprite.width = size[0]; sprite.height = size[1]; sprite.eventMode = "none"; raster.addChild(sprite); rasterResources.push({ bitmap: tile.image, texture }); }
      render();
    },
    resize(width, height) {
      ensureAlive();
      if (![width, height].every((v) => Number.isFinite(v) && v > 0 && v <= 32768)) throw new Error("invalid renderer viewport");
      // Preserve the map point at the viewport center when the surrounding layout changes.
      camera = { ...camera, x: camera.x + (width - viewport[0]) / 2, y: camera.y + (height - viewport[1]) / 2 };
      viewport = [width, height];
      app.renderer.resize(width, height);
      applyCamera();
    },
    fit() { ensureAlive(); camera = fitCamera([scene.width, scene.height], viewport); applyCamera(); },
    getCamera() { return { ...camera }; },
    setCamera(next) { ensureAlive(); camera = normalizeCamera(next); applyCamera(); },
    zoomAt(factor, point = [viewport[0] / 2, viewport[1] / 2]) { ensureAlive(); camera = zoomCamera(camera, factor, point); applyCamera(); },
    panBy(x, y) { ensureAlive(); camera = normalizeCamera({ ...camera, x: camera.x + x, y: camera.y + y }); applyCamera(); },
    hitTest(point) { ensureAlive(); return hitTestMap(scene, camera, point); },
    select(hit) {
      ensureAlive();
      if (hit && !(hit.kind === "pin" ? scene.pins : hit.kind === "token" ? scene.tokens ?? [] : scene.cells).some((r) => r.id === hit.id)) throw new Error("selection is not in the projected scene");
      selected = hit;
      updateSelection();
      render();
      options.onSelect?.(hit);
    },
    destroy() {
      if (destroyed) return;
      destroyed = true;
      listeners.abort();
      observer.disconnect();
      options.signal?.removeEventListener("abort", renderer.destroy);
      if (scheduled) cancelAnimationFrame(scheduled);
      clearRaster();
      clearStampTextures();
      app.destroy(true, { children: true });
      markerGraphics = [];
    },
  };
  const local = (event: MouseEvent): MapPoint => {
    const bounds = canvas.getBoundingClientRect();
    return [(event.clientX - bounds.left) * viewport[0] / Math.max(1, bounds.width), (event.clientY - bounds.top) * viewport[1] / Math.max(1, bounds.height)];
  };
  let drag: { id: number; last: MapPoint; start: MapPoint; moved: boolean; token?: string; snapshot?: ProjectedMapToken } | null = null;
  canvas.addEventListener("pointerdown", (event) => {
    if (event.button !== 0 || drag) return;
    const p = local(event);
    const hit = renderer.hitTest(p), token = hit?.kind === "token" ? scene.tokens?.find(t => t.id === hit.id && t.movable) : undefined;
    drag = { id: event.pointerId, last: p, start: p, moved: false, ...(token ? { token: token.id, snapshot: { ...token } } : {}) };
    canvas.setPointerCapture(event.pointerId);
    canvas.focus({ preventScroll: true });
  }, { signal: listeners.signal });
  canvas.addEventListener("pointermove", (event) => {
    if (!drag || event.pointerId !== drag.id) return;
    const p = local(event);
    if (Math.hypot(p[0] - drag.start[0], p[1] - drag.start[1]) > 4) drag.moved = true;
    if (drag.moved && drag.token) { const at = screenToMap(p, camera); dragPreview.clear().circle(at[0], at[1], 12 / camera.scale).stroke({ color: 0xffffff, width: 2 / camera.scale, alpha: .7 }); render(); }
    else if (drag.moved) renderer.panBy(p[0] - drag.last[0], p[1] - drag.last[1]);
    drag.last = p;
  }, { signal: listeners.signal });
  canvas.addEventListener("pointerup", (event) => {
    if (!drag || event.pointerId !== drag.id) return;
    if (drag.moved && drag.token) options.onMoveToken?.(drag.token, screenToMap(local(event), camera));
    else if (!drag.moved) { renderer.select(renderer.hitTest(local(event))); options.onPoint?.(screenToMap(local(event), camera)); }
    dragPreview.clear(); render();
    drag = null;
    if (canvas.hasPointerCapture(event.pointerId)) canvas.releasePointerCapture(event.pointerId);
  }, { signal: listeners.signal });
  canvas.addEventListener("pointercancel", () => { drag = null; dragPreview.clear(); render(); }, { signal: listeners.signal });
  canvas.addEventListener("wheel", (event) => {
    event.preventDefault();
    const delta = event.deltaY * (event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? viewport[1] : 1);
    renderer.zoomAt(Math.exp(Math.max(-2, Math.min(2, -delta * 0.001))), local(event));
  }, { signal: listeners.signal, passive: false });
  canvas.addEventListener("keydown", (event) => {
    const pan: Record<string, MapPoint> = { ArrowLeft: [48, 0], ArrowRight: [-48, 0], ArrowUp: [0, 48], ArrowDown: [0, -48] };
    const movement = pan[event.key];
    if (movement) renderer.panBy(...movement);
    else if (event.key === "+" || event.key === "=") renderer.zoomAt(1.25);
    else if (event.key === "-") renderer.zoomAt(0.8);
    else if (event.key === "Home") renderer.fit();
    else return;
    event.preventDefault();
  }, { signal: listeners.signal });
  const observer = new ResizeObserver((entries) => {
    const bounds = entries[0]?.contentRect;
    if (bounds && bounds.width > 0 && bounds.height > 0 && !destroyed && (bounds.width !== viewport[0] || bounds.height !== viewport[1])) renderer.resize(bounds.width, bounds.height);
  });
  observer.observe(host);
  options.signal?.addEventListener("abort", renderer.destroy, { once: true });
  draw();
  return renderer;
}
