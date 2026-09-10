// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2026 Kaya Yesilyurt - Atlas Chronicles. Siehe LICENSE.
/// <reference lib="dom" />
/// <reference path="./pixi-csp.d.ts" />
import { fitCamera, hitTestMap, mapPinHitRadius, mapToScreen, normalizeCamera, pointInPolygon, retainsTokenDrag, screenToMap, validateMapScene, zoomCamera } from "./geometry.ts";
import { rasterTileDisplaySize } from "./tactical-geometry.ts";
import { createGridGeometryCache } from "./grid-cache.ts";
import { planeStapel } from "./stapel.ts";
import type { MapCamera, MapEditorInteraction, MapHit, MapPoint, MapRenderer, ProjectedMapPin, ProjectedMapScene, ProjectedMapToken } from "./model.ts";

export interface MapRendererOptions {
  readonly onSelect?: (hit: MapHit | null) => void;
  readonly onCameraChange?: (camera: MapCamera) => void;
  readonly onMoveToken?: (tokenId: string, to: MapPoint) => void;
  readonly onPoint?: (point: MapPoint) => void;
  readonly editor?: MapEditorInteraction;
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
  // This Pixi compatibility module replaces runtime Function generation with static
  // synchronizers. Its name does not request unsafe-eval; the desktop CSP stays intact.
  await import("pixi.js/unsafe-eval");
  if (options.signal?.aborted) throw new DOMException("Renderer creation aborted", "AbortError");
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
  geography.label = "geography";
  const buildings = new Container();
  const raster = new Container(), rasterBounds = new Graphics(), gridOverlay = new Graphics(), wallsOverlay = new Graphics(), dragPreview = new Graphics();
  const markers = new Container();
  // Placements sit above the floor and below walls, grid and markers: furniture is part of the
  // ground truth of the room, but it must never hide a wall or a token.
  const stampLayer = new Container(), rooftopStamps = new Container();
  // Light pools lie over floor and furniture and under walls: a torch warms the room it stands
  // in, the wall in front of it still reads as a wall. Additive, so two lamps brighten, not muddy.
  const glow = new Graphics(); glow.eventMode = "none"; glow.label = "glow"; glow.blendMode = "add";
  world.addChild(rasterBounds, raster, geography, stampLayer, buildings, rooftopStamps, glow, gridOverlay, wallsOverlay, markers, dragPreview);
  raster.mask = rasterBounds;
  app.stage.addChild(world);
  const selection = new Graphics().circle(0, 0, 15).stroke({ color: 0xffe7a1, width: 2 }); selection.visible = false;
  const label = new Text({ text: "", style: { fontFamily: "system-ui, sans-serif", fontSize: 14, fill: 0xffffff,
    stroke: { color: 0x14212b, width: 4 } } });
  app.stage.addChild(selection, label);
  const names = new Container(); names.eventMode = "none";
  app.stage.addChild(names);
  // Map furniture. It belongs to the drawn map, not to the world: a compass and a scale bar
  // keep their size and corner while the camera moves, exactly as they do on a printed sheet.
  // Neither carries an identity, so neither can leak one; both appear only on a scene that
  // actually is a drawn map, so battle maps without cartography stay clean.
  const chromeInk = 0x2c2519, chromePaper = 0xf0e6cb;
  const chrome = new Container(); chrome.eventMode = "none"; chrome.label = "chrome";
  const compass = new Graphics(), scaleBar = new Graphics();
  const chromeText = (size: number) => new Text({ text: "", style: { fontFamily: "system-ui, sans-serif", fontSize: size, fontWeight: "600",
    fill: chromeInk, stroke: { color: chromePaper, width: 2 } } });
  const compassLabel = chromeText(13), scaleLabel = chromeText(12);
  // The cartouche: the map's name on a strip of paper in the corner, set in a book face with a
  // little air between the letters, the way a printed sheet names itself.
  const titleBox = new Graphics(), titleText = new Text({ text: "", style: { fontFamily: "Georgia, 'Times New Roman', serif", fontSize: 18, fontWeight: "600",
    letterSpacing: 1.6, fill: chromeInk } });
  chrome.addChild(scaleBar, compass, compassLabel, scaleLabel, titleBox, titleText);
  app.stage.addChild(chrome);
  const pinLabels: InstanceType<typeof Text>[] = [];
  const nightLabel = { fontFamily: "system-ui, sans-serif", fontSize: 12, fill: 0xf4ebd8, stroke: { color: 0x14212b, width: 3 } } as const;
  const inkLabel = { fontFamily: "Georgia, 'Times New Roman', serif", fontSize: 12, fontStyle: "italic", fontWeight: "600", letterSpacing: .4, fill: 0x2c2519, stroke: { color: 0xf0e6cb, width: 3 } } as const;
  // The same book face by moonlight: pale ink with a dark halo, so a name still reads at night.
  const moonLabel = { ...inkLabel, fill: 0xe9e2cf, stroke: { color: 0x141b30, width: 3 } } as const;
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
    if (selected.kind === "cell") {
      const cell = scene.cells.find(item => item.id === selected!.id);
      if (!cell) return;
      const points = cell.polygon.map(point => mapToScreen(point, camera));
      selection.clear().poly(points.flatMap(point => [point[0], point[1]]), true).stroke({ color: 0xffe7a1, width: 2 });
      selection.position.set(0, 0); selection.visible = true;
      if (cell.label && scene.showLabels !== false) { label.text = cell.label; label.position.set(Math.max(4, Math.min(points[0]![0], viewport[0] - label.width - 4)), Math.max(4, points[0]![1] - 22)); label.visible = true; }
      return;
    }
    const item = selected.kind === "pin" ? scene.pins.find((p) => p.id === selected!.id)
      : selected.kind === "token" ? scene.tokens?.find((t) => t.id === selected!.id) : undefined;
    if (item) {
      const p = mapToScreen([item.x, item.y], camera);
      selection.clear().circle(0, 0, 15).stroke({ color: 0xffe7a1, width: 2 });
      selection.position.set(p[0], p[1]); selection.visible = true;
      label.text = item.label;
      label.position.set(Math.min(Math.max(4, p[0] + 18), Math.max(4, viewport[0] - label.width - 4)), Math.min(Math.max(4, p[1] - 12), Math.max(4, viewport[1] - label.height - 4)));
      label.visible = scene.showLabels !== false;
    }
  };
  /** Round steps for the scale bar; the largest one that fits 260 screen pixels wins. */
  const scaleSteps = [1, 2, 5, 10, 20, 25, 50, 100, 200, 250, 500, 1000, 2000, 5000, 10_000] as const;
  let compassAt = "", scaleAt = "", titleAt = "";
  const updateChrome = (): void => {
    chrome.visible = !!scene.drawing;
    // Keep each caption's own flag in step with the layer: a hidden container still leaves its
    // children claiming to be visible, and a map's names are counted by that flag.
    compassLabel.visible = scaleLabel.visible = chrome.visible;
    titleText.visible = titleBox.visible = chrome.visible && !!scene.title?.trim();
    if (!chrome.visible) return;
    const titleKey = `${scene.title ?? ""}:${viewport[0]}`;
    if (titleText.visible && titleKey !== titleAt) {
      titleAt = titleKey;
      titleText.text = scene.title!.trim().length > 60 ? `${scene.title!.trim().slice(0, 59)}…` : scene.title!.trim();
      const padding = 14, left = 18, top = 18, width = titleText.width + padding * 2, height = titleText.height + 12;
      titleBox.clear().rect(left, top, width, height).fill(chromePaper).stroke({ color: chromeInk, width: 1.2 });
      titleBox.rect(left + 3, top + 3, width - 6, height - 6).stroke({ color: chromeInk, width: .6, alpha: .6 });
      titleText.position.set(left + padding, top + 6);
    }
    const pitch = scene.grid && scene.grid.kind !== "none"
      // Hex cells are named by their circumradius; neighbours sit one inradius pair apart.
      ? scene.grid.kind === "hex" ? Math.sqrt(3) * scene.grid.size : scene.grid.size
      : 0;
    const unit = pitch > 0 ? pitch : 100;
    // Pick the largest round step that still fits, and draw exactly that. Clamping the drawn
    // bar instead would leave the caption describing a span the bar does not cover — a scale
    // that lies about itself is worse than no scale. Only past full zoom, where even the
    // smallest step is wider than the budget, does the bar honestly run long.
    const span = (step: number) => step * unit * camera.scale;
    const count = scaleSteps.filter(step => span(step) <= 260).at(-1) ?? scaleSteps[0]!;
    const length = span(count);
    const left = 18, bottom = viewport[1] - 30, height = 8, quarters = 4;
    // The rose never changes with the camera and the bar only when its label does; redrawing
    // either on every pan would rebuild a dozen paths per frame for a fixed piece of paper.
    // Without a grid the step counts hundred-pixel units, so the caption has to name the span
    // the bar actually covers. Saying "10" for a bar a thousand pixels wide is a wrong scale.
    const amount = pitch > 0 ? count : count * unit;
    const scaleKey = `${amount}:${length.toFixed(2)}:${bottom}`;
    if (scaleKey !== scaleAt) {
    scaleAt = scaleKey;
    scaleBar.clear();
    for (let part = 0; part < quarters; part++) {
      scaleBar.rect(left + length * part / quarters, bottom, length / quarters, height)
        .fill(part % 2 ? chromeInk : chromePaper);
    }
    scaleBar.rect(left, bottom, length, height).stroke({ color: chromeInk, width: 1.2 });
    const caption = pitch > 0 ? amount === 1 ? "Feld" : "Felder" : amount === 1 ? "Bildpunkt" : "Bildpunkte";
    scaleLabel.text = `${amount.toLocaleString("de")} ${caption}`;
    scaleLabel.position.set(left, bottom - scaleLabel.height - 3);
    }
    const compassKey = `${viewport[0]}:${viewport[1]}`;
    if (compassKey === compassAt) return;
    compassAt = compassKey;
    const radius = 25, centre = [viewport[0] - radius - 22, radius + 30] as const;
    compass.clear().circle(centre[0], centre[1], radius + 4).fill(chromePaper).stroke({ color: chromeInk, width: 1.2 });
    // Four long points and four short ones: the drawn rose every printed map carries. The
    // short diagonals go down first so the cardinals lie cleanly on top of them.
    const point = (index: number, reach: number, fill: number) => {
      const angle = index * Math.PI / 4 - Math.PI / 2, span = Math.PI / 8;
      const tip = [centre[0] + Math.cos(angle) * reach, centre[1] + Math.sin(angle) * reach];
      const side = (turn: number) => [centre[0] + Math.cos(angle + turn) * reach * .3, centre[1] + Math.sin(angle + turn) * reach * .3];
      compass.poly([...tip, ...side(span), ...side(-span)], true).fill(fill).stroke({ color: chromeInk, width: 1 });
    };
    for (let index = 1; index < 8; index += 2) point(index, radius * .5, chromePaper);
    for (let index = 0; index < 8; index += 2) point(index, radius, index ? chromeInk : 0x9c3f2f);
    compassLabel.text = "N";
    compassLabel.position.set(centre[0] - compassLabel.width / 2, centre[1] - radius - compassLabel.height - 3);
  };
  const updateLabels = (): void => {
    for (const text of pinLabels) text.visible = false;
    if (scene.showLabels !== true) return;
    // Screen-space boxes keep a whole city legible. The pool bounds both text objects and
    // overlap work; zooming reveals names as their projected footprints separate.
    const occupied: { x: number; y: number; width: number; height: number }[] = [];
    if (label.visible) occupied.push({ x: label.position.x - 4, y: label.position.y - 4, width: label.width + 8, height: label.height + 8 });
    let count = 0;
    const selectedCell = selected?.kind === "cell" ? scene.cells.find(cell => cell.id === selected!.id) : undefined;
    for (const pin of scene.pins) {
      if (count >= 160) break;
      if (!pin.label.trim() || camera.scale < (pin.labelMinScale ?? 0) || selected?.kind === "pin" && selected.id === pin.id) continue;
      if (selectedCell?.label === pin.label && pointInPolygon([pin.x, pin.y], selectedCell.polygon)) continue;
      const point = mapToScreen([pin.x, pin.y], camera);
      const width = Math.min(220, pin.label.length * 7 + 8), x = point[0] + mapPinHitRadius(pin) + 5, y = point[1] - 8;
      if (x < 0 || y < 0 || x + width > viewport[0] || y + 20 > viewport[1]) continue;
      if (occupied.some(box => x < box.x + box.width && x + width > box.x && y < box.y + box.height && y + 20 > box.y)) continue;
      let text = pinLabels[count];
      if (!text) {
        text = new Text({ text: "", style: nightLabel });
        text.eventMode = "none"; pinLabels.push(text); names.addChild(text);
      }
      // A drawn map names its places in ink on paper, a book face with a pale halo; a photographed
      // or dark battlemap keeps the bright label that stays legible over any image.
      text.style = scene.drawing ? scene.mood === "nacht" ? moonLabel : inkLabel : nightLabel;
      text.text = pin.label.length > 30 ? `${pin.label.slice(0, 29)}…` : pin.label;
      text.position.set(x, y); text.visible = true;
      occupied.push({ x: x - 4, y: y - 4, width: Math.max(width, text.width) + 8, height: Math.max(20, text.height) + 8 }); count++;
    }
  };
  const drawWalls = (): void => {
    wallsOverlay.clear();
    const lines = (scene.lines ?? []).filter(line => line.paint !== false);
    const trace = (points: readonly MapPoint[], dx = 0, dy = 0) => {
      const first = points[0]!; wallsOverlay.moveTo(first[0] + dx, first[1] + dy);
      for (let i = 1; i < points.length; i++) { const point = points[i]!; wallsOverlay.lineTo(point[0] + dx, point[1] + dy); }
    };
    // Walls (lines with no colour of their own) are drawn as stone: a cast shadow off to the
    // south-east, the wall's body, and a pale seam along its crown. The body grows with the
    // map's cell, never thinner than a screen line, so a battlemap wall reads as masonry at
    // any zoom instead of as a hairline. Coloured lines (doors) keep their colour.
    const cell = scene.grid && scene.grid.kind !== "none" ? scene.grid.size : 100;
    const body = Math.max(2.4 / camera.scale, cell * .11), walls = lines.filter(line => line.color === undefined);
    if (walls.length) {
      for (const line of walls) trace(line.points, body * .45, body * .55);
      wallsOverlay.stroke({ color: 0x1a1410, width: body * 1.15, alpha: .32 });
      for (const line of walls) trace(line.points);
      wallsOverlay.stroke({ color: 0x3b2f25, width: body });
      for (const line of walls) trace(line.points);
      wallsOverlay.stroke({ color: 0xd9c9a8, width: Math.max(1 / camera.scale, body * .22), alpha: .55 });
    }
    let color: number | undefined;
    // Batch only adjacent equal-colour paths, retaining original overlap order. Zoom still
    // rebuilds their geometry to preserve exactly two CSS pixels: a door mark is a mark.
    for (const line of lines) {
      if (line.color === undefined) continue;
      if (color !== undefined && color !== line.color) wallsOverlay.stroke({ color, width: 2 / camera.scale });
      color = line.color; trace(line.points);
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
    updateLabels();
    updateChrome();
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
    for (const child of rooftopStamps.removeChildren()) child.destroy();
    stampAnker = { x: camera.x, y: camera.y, scale: camera.scale };
    if (!scene.stamps?.length) return;
    // Cull against a window larger than the viewport, centred on it: grow the viewport by the
    // slack on every side and shift the camera by half of it, so the extra coverage is
    // symmetric rather than anchored at the top-left corner.
    const plan = planeStapel(
      scene.stamps,
      { ...camera, x: camera.x + STAMP_RAND, y: camera.y + STAMP_RAND },
      [viewport[0] + STAMP_RAND * 2, viewport[1] + STAMP_RAND * 2],
      { assetGroessen: new Map([...stampTextures].map(([asset, { bitmap }]) => [asset, [bitmap.width, bitmap.height] as const])) },
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
      // On a drawn map every object above the floor casts a soft shadow to the south-east, the
      // way a piece of furniture sits on a painted battlemap instead of floating on it.
      // Layers −10..10 are what stands on the floor (fixtures, furniture, vessels, figures,
      // lamps); floors (−100), doors, walls and marks cast nothing.
      if (scene.drawing && stamp.l >= -10 && stamp.l <= 10) {
        const w = resource.bitmap.width * stamp.s, h = resource.bitmap.height * stamp.s, shadow = new Graphics();
        shadow.ellipse(0, 0, w * .48, h * .48).fill({ color: 0x1a1410, alpha: .26 });
        shadow.position.set(stamp.x + w * .07, stamp.y + h * .1); shadow.rotation = stamp.r; shadow.eventMode = "none";
        stampLayer.addChild(shadow);
      }
      const sprite = new Sprite(resource.texture);
      sprite.anchor.set(.5);
      sprite.position.set(stamp.x, stamp.y);
      sprite.rotation = stamp.r;
      sprite.scale.set(stamp.s);
      // Furniture and figures stand in the same moonlight as the painted ground under them.
      if (stamp.t) sprite.tint = stamp.t; else if (scene.mood === "nacht") sprite.tint = 0x8a93b3;
      sprite.eventMode = "none";
      (stamp.l >= 40 ? rooftopStamps : stampLayer).addChild(sprite);
    }
  };
  const drawPin = (pin: ProjectedMapPin): InstanceType<typeof Graphics> => {
    const shape = new Graphics();
    if (pin.showMarker === false) { shape.visible = false; return shape; }
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
    clear(buildings);
    clear(markers);
    markerGraphics = [];
    // Each light is three pools inside one another, widest faintest, plus a small bright heart:
    // a cheap gradient that still reads as a glow rather than as a painted disc.
    // At night the same lights carry: the pools are two and a half times as strong, and the
    // outermost reaches further, because a torch is what the eye finds in the dark.
    glow.clear();
    const night = scene.mood === "nacht", carry = night ? 2.5 : 1;
    for (const light of scene.lights ?? []) {
      const color = light.color ?? 0xe0a050, strength = (light.intensity ?? 1) * carry;
      if (night) glow.circle(light.x, light.y, light.range * 1.35).fill({ color, alpha: .03 * strength });
      for (const [reach, alpha] of [[1, .04], [.62, .07], [.3, .11]] as const) glow.circle(light.x, light.y, light.range * reach).fill({ color, alpha: Math.min(1, alpha * strength) });
      glow.circle(light.x, light.y, Math.max(2, light.range * .06)).fill({ color: 0xfff1c8, alpha: Math.min(1, .45 * strength) });
    }
    if (scene.drawing) {
      if (scene.drawing.background !== null) geography.addChild(new Graphics().rect(0, 0, scene.width, scene.height).fill(scene.drawing.background));
      for (const polygon of scene.drawing.polygons) {
        const shape = new Graphics().poly(polygon.points.flatMap(point => [point[0], point[1]]), true).fill({ color: polygon.fill, alpha: polygon.opacity });
        shape.eventMode = "none"; geography.addChild(shape);
      }
    }
    // Separate simple polygons preserve Pixi's batching; geometry is rebuilt only on update.
    for (const cell of scene.drawing || scene.paintCells === false ? [] : scene.cells) {
      const building = cell.surface === "building", street = cell.surface === "street";
      const shape = new Graphics().poly(cell.polygon.flatMap((p) => [p[0], p[1]]), true)
        .fill({ color: cell.fill ?? (building ? 0xb87954 : street ? 0xb4a180 : 0x536b52), alpha: cell.surface ? 1 : scene.rasterScope ? .08 : 1 });
      if (building) {
        let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
        for (const [x, y] of cell.polygon) { minX = Math.min(minX, x); minY = Math.min(minY, y); maxX = Math.max(maxX, x); maxY = Math.max(maxY, y); }
        const width = maxX - minX, height = maxY - minY;
        const stroke = Math.max(.5, Math.min(width, height) * .035);
        shape.stroke({ color: cell.roof === "tech" ? 0x304c58 : cell.roof === "flat" ? 0x424a4d : 0x493d32, width: stroke, alpha: .95 });
        // Intersect a roof ridge with the actual footprint. Pairing scanline crossings also
        // handles concave buildings without drawing a ridge across an empty courtyard.
        const axis = width >= height ? 0 : 1, cross = axis === 0 ? 1 : 0;
        const fractions = cell.roof === "flat" ? [.25, .5, .75] : cell.roof === "tech" ? [.3, .7] : [.5];
        for (const fraction of fractions) {
        const middle = axis === 0 ? minY + height * fraction : minX + width * fraction;
        const crossings: number[] = [];
        for (let i = 0, j = cell.polygon.length - 1; i < cell.polygon.length; j = i++) {
          const a = cell.polygon[j]!, b = cell.polygon[i]!;
          if ((a[cross] > middle) !== (b[cross] > middle)) crossings.push(a[axis] + (middle - a[cross]) * (b[axis] - a[axis]) / (b[cross] - a[cross]));
        }
        crossings.sort((a, b) => a - b);
        for (let i = 0; i + 1 < crossings.length; i += 2) {
          const left = crossings[i]!, right = crossings[i + 1]!, inset = (right - left) * .14;
          if (right - left <= stroke * 2) continue;
          if (axis === 0) shape.moveTo(left + inset, middle).lineTo(right - inset, middle);
          else shape.moveTo(middle, left + inset).lineTo(middle, right - inset);
        }
        if (crossings.length) shape.stroke({ color: cell.roof === "tech" ? 0x9ce2dc : cell.roof === "flat" ? 0xe1e6e5 : 0xf0d0a0, width: stroke * (cell.roof === "flat" ? .4 : .8), alpha: .55 });
        }
      }
      shape.eventMode = "none";
      (building ? buildings : geography).addChild(shape);
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
      if (next.id !== scene.id) clearStampTextures();
      scene = next;
      const referencedAssets = new Set(scene.stamps?.map(stamp => stamp.asset));
      for (const [asset, resource] of stampTextures) if (!referencedAssets.has(asset)) {
        resource.texture.destroy(true); resource.bitmap.close(); stampTextures.delete(asset);
      }
      for (const resource of rasterResources) resource.texture.source.scaleMode = scene.rasterSampling ?? "linear";
      if (drag && (changedWorld || changedScope || (drag.snapshot && !retainsTokenDrag(drag.snapshot, scene.tokens?.find(t => t.id === drag?.token))))) {
        renderer.cancelInteraction();
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
      if (destroyed) { for (const item of images) item.image.close(); return; }
      const referencedAssets = new Set(scene.stamps?.map(stamp => stamp.asset));
      for (const { asset, image } of images) {
        if (!referencedAssets.has(asset)) { image.close(); continue; }
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
      updateLabels();
      render();
      options.onSelect?.(hit);
    },
    cancelInteraction() {
      const cancelled = drag; drag = null;
      if (cancelled?.editor) options.editor?.cancel();
      if (cancelled && canvas.hasPointerCapture(cancelled.id)) canvas.releasePointerCapture(cancelled.id);
      dragPreview.clear(); render();
    },
    destroy() {
      if (destroyed) return;
      renderer.cancelInteraction();
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
  let drag: { id: number; last: MapPoint; start: MapPoint; moved: boolean; editor?: boolean; token?: string; snapshot?: ProjectedMapToken } | null = null;
  let hand = false;
  canvas.addEventListener("pointerdown", (event) => {
    const editing = options.editor?.active() ?? false;
    if ((event.button !== 0 && !(editing && event.button === 1)) || drag) return;
    const p = local(event);
    const hit = renderer.hitTest(p), token = hit?.kind === "token" ? scene.tokens?.find(t => t.id === hit.id && t.movable) : undefined;
    const worldPoint = screenToMap(p, camera);
    const stampId = editing ? hitTestStamp(scene.stamps ?? [], worldPoint, new Map([...stampTextures].map(([asset, { bitmap }]) => [asset, [bitmap.width, bitmap.height] as const]))) : undefined;
    const editor = editing && event.button === 0 && !hand && !event.altKey && (options.editor?.begin(worldPoint, hit, stampId) ?? false);
    drag = { id: event.pointerId, last: p, start: p, moved: false, ...(editor ? { editor: true } : token && !editing ? { token: token.id, snapshot: { ...token } } : {}) };
    canvas.setPointerCapture(event.pointerId);
    canvas.focus({ preventScroll: true });
  }, { signal: listeners.signal });
  canvas.addEventListener("pointermove", (event) => {
    if (!drag || event.pointerId !== drag.id) return;
    const p = local(event);
    if (Math.hypot(p[0] - drag.start[0], p[1] - drag.start[1]) > 4) drag.moved = true;
    if (drag.editor) { if (options.editor?.active()) options.editor.move(screenToMap(p, camera)); else renderer.cancelInteraction(); }
    else if (drag.moved && drag.token) { const at = screenToMap(p, camera); dragPreview.clear().circle(at[0], at[1], 12 / camera.scale).stroke({ color: 0xffffff, width: 2 / camera.scale, alpha: .7 }); render(); }
    else if (drag.moved) renderer.panBy(p[0] - drag.last[0], p[1] - drag.last[1]);
    if (drag) drag.last = p;
  }, { signal: listeners.signal });
  canvas.addEventListener("pointerup", (event) => {
    if (!drag || event.pointerId !== drag.id) return;
    if (drag.editor) { if (options.editor?.active()) options.editor.commit(screenToMap(local(event), camera)); else options.editor?.cancel(); }
    else if (drag.moved && drag.token) options.onMoveToken?.(drag.token, screenToMap(local(event), camera));
    else if (!drag.moved) { renderer.select(renderer.hitTest(local(event))); options.onPoint?.(screenToMap(local(event), camera)); }
    dragPreview.clear(); render();
    drag = null;
    if (canvas.hasPointerCapture(event.pointerId)) canvas.releasePointerCapture(event.pointerId);
  }, { signal: listeners.signal });
  canvas.addEventListener("pointercancel", () => renderer.cancelInteraction(), { signal: listeners.signal });
  canvas.addEventListener("lostpointercapture", () => renderer.cancelInteraction(), { signal: listeners.signal });
  canvas.addEventListener("blur", () => { hand = false; renderer.cancelInteraction(); }, { signal: listeners.signal });
  canvas.addEventListener("wheel", (event) => {
    event.preventDefault();
    const delta = event.deltaY * (event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? viewport[1] : 1);
    renderer.zoomAt(Math.exp(Math.max(-2, Math.min(2, -delta * 0.001))), local(event));
  }, { signal: listeners.signal, passive: false });
  canvas.addEventListener("keydown", (event) => {
    if (event.key === "Escape") { renderer.cancelInteraction(); event.preventDefault(); return; }
    if (event.code === "Space" && options.editor?.active()) { hand = true; event.preventDefault(); return; }
    if (drag?.editor || event.ctrlKey || event.metaKey) return;
    const pan: Record<string, MapPoint> = { ArrowLeft: [48, 0], ArrowRight: [-48, 0], ArrowUp: [0, 48], ArrowDown: [0, -48] };
    const movement = pan[event.key];
    if (movement) renderer.panBy(...movement);
    else if (event.key === "+" || event.key === "=") renderer.zoomAt(1.25);
    else if (event.key === "-") renderer.zoomAt(0.8);
    else if (event.key === "Home") renderer.fit();
    else return;
    event.preventDefault();
  }, { signal: listeners.signal });
  canvas.addEventListener("keyup", event => { if (event.code === "Space") hand = false; }, { signal: listeners.signal });
  const observer = new ResizeObserver((entries) => {
    const bounds = entries[0]?.contentRect;
    if (bounds && bounds.width > 0 && bounds.height > 0 && !destroyed && (bounds.width !== viewport[0] || bounds.height !== viewport[1])) renderer.resize(bounds.width, bounds.height);
  });
  observer.observe(host);
  options.signal?.addEventListener("abort", renderer.destroy, { once: true });
  draw();
  return renderer;
}
import { hitTestStamp } from "./stamp-hit.ts";
