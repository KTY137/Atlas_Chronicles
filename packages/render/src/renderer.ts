/// <reference lib="dom" />
import { fitCamera, hitTestMap, mapToScreen, normalizeCamera, validateMapScene, zoomCamera } from "./geometry.ts";
import type { MapCamera, MapHit, MapPoint, MapRenderer, ProjectedMapScene } from "./model.ts";

export interface MapRendererOptions {
  readonly onSelect?: (hit: MapHit | null) => void;
  readonly onCameraChange?: (camera: MapCamera) => void;
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
  const { Application, Container, Graphics, Text } = await import("pixi.js");
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
  const canvas = app.canvas as HTMLCanvasElement;
  canvas.style.display = "block";
  canvas.style.width = "100%";
  canvas.style.height = "100%";
  canvas.style.touchAction = "none";
  canvas.tabIndex = 0;
  canvas.setAttribute("role", "img");
  canvas.setAttribute("aria-label", "Interaktive Karte. Pfeiltasten verschieben, Plus und Minus zoomen, Pos1 zeigt die gesamte Karte. Orte können auch in der Ortsliste ausgewählt werden.");
  canvas.dataset.mapBackend = "pixi-webgl";
  host.appendChild(canvas);
  const world = new Container();
  const geography = new Container();
  const markers = new Container();
  world.addChild(geography, markers);
  app.stage.addChild(world);
  const selection = new Graphics();
  const label = new Text({ text: "", style: { fontFamily: "system-ui, sans-serif", fontSize: 14, fill: 0xffffff,
    stroke: { color: 0x14212b, width: 4 } } });
  app.stage.addChild(selection, label);
  let scene = initial;
  let camera = fitCamera([scene.width, scene.height], viewport);
  let selected: MapHit | null = null;
  let destroyed = false;
  let scheduled = 0;
  let markerGraphics: InstanceType<typeof Graphics>[] = [];
  const listeners = new AbortController();
  const render = (): void => {
    if (destroyed || scheduled) return;
    scheduled = requestAnimationFrame(() => { scheduled = 0; if (!destroyed) app.render(); });
  };
  const updateSelection = (): void => {
    selection.clear();
    label.visible = false;
    if (!selected) return;
    const item = selected.kind === "pin" ? scene.pins.find((p) => p.id === selected!.id)
      : selected.kind === "token" ? scene.tokens?.find((t) => t.id === selected!.id) : undefined;
    if (item) {
      const p = mapToScreen([item.x, item.y], camera);
      selection.circle(p[0], p[1], 15).stroke({ color: 0xffe7a1, width: 2 });
      label.text = item.label;
      label.position.set(Math.min(Math.max(4, p[0] + 18), Math.max(4, viewport[0] - label.width - 4)), Math.min(Math.max(4, p[1] - 12), Math.max(4, viewport[1] - label.height - 4)));
      label.visible = true;
    }
  };
  const applyCamera = (): void => {
    world.position.set(camera.x, camera.y);
    world.scale.set(camera.scale);
    for (const marker of markerGraphics) marker.scale.set(1 / camera.scale);
    updateSelection();
    render();
    options.onCameraChange?.({ ...camera });
  };
  const clear = (container: InstanceType<typeof Container>): void => {
    for (const child of container.removeChildren()) child.destroy({ children: true });
  };
  const draw = (): void => {
    clear(geography);
    clear(markers);
    markerGraphics = [];
    // Separate simple polygons preserve Pixi's batching; geometry is rebuilt only on update.
    for (const cell of scene.cells) {
      const shape = new Graphics().poly(cell.polygon.flatMap((p) => [p[0], p[1]]), true).fill(cell.fill ?? 0x536b52);
      shape.eventMode = "none";
      geography.addChild(shape);
    }
    for (const pin of scene.pins) {
      const shape = new Graphics().circle(0, 0, 5).fill(pin.color ?? 0xebc887).stroke({ color: 0x13202a, width: 1.5 });
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
    applyCamera();
  };
  const ensureAlive = (): void => { if (destroyed) throw new Error("MapRenderer has been destroyed"); };
  const renderer: MapRenderer = {
    backend: "pixi-webgl",
    update(next) {
      ensureAlive();
      validateMapScene(next);
      const changedWorld = next.id !== scene.id || next.width !== scene.width || next.height !== scene.height;
      const previousSelection = selected;
      scene = next;
      if (changedWorld) { camera = fitCamera([scene.width, scene.height], viewport); selected = null; }
      // Remove a selection if the server's replacement projection no longer includes it.
      if (selected && !(selected.kind === "pin" ? scene.pins : selected.kind === "token" ? scene.tokens ?? [] : scene.cells).some((r) => r.id === selected!.id)) selected = null;
      draw();
      if (previousSelection && !selected) options.onSelect?.(null);
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
      app.destroy(true, { children: true });
      markerGraphics = [];
    },
  };
  const local = (event: MouseEvent): MapPoint => {
    const bounds = canvas.getBoundingClientRect();
    return [(event.clientX - bounds.left) * viewport[0] / Math.max(1, bounds.width), (event.clientY - bounds.top) * viewport[1] / Math.max(1, bounds.height)];
  };
  let drag: { id: number; last: MapPoint; start: MapPoint; moved: boolean } | null = null;
  canvas.addEventListener("pointerdown", (event) => {
    if (event.button !== 0 || drag) return;
    const p = local(event);
    drag = { id: event.pointerId, last: p, start: p, moved: false };
    canvas.setPointerCapture(event.pointerId);
    canvas.focus({ preventScroll: true });
  }, { signal: listeners.signal });
  canvas.addEventListener("pointermove", (event) => {
    if (!drag || event.pointerId !== drag.id) return;
    const p = local(event);
    if (Math.hypot(p[0] - drag.start[0], p[1] - drag.start[1]) > 4) drag.moved = true;
    if (drag.moved) renderer.panBy(p[0] - drag.last[0], p[1] - drag.last[1]);
    drag.last = p;
  }, { signal: listeners.signal });
  canvas.addEventListener("pointerup", (event) => {
    if (!drag || event.pointerId !== drag.id) return;
    if (!drag.moved) renderer.select(renderer.hitTest(local(event)));
    drag = null;
    if (canvas.hasPointerCapture(event.pointerId)) canvas.releasePointerCapture(event.pointerId);
  }, { signal: listeners.signal });
  canvas.addEventListener("pointercancel", () => { drag = null; }, { signal: listeners.signal });
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
