// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2026 Kaya Yesilyurt - Atlas Chronicles. Siehe LICENSE.
import type { CartographyDrawing } from "@chronicle/szene";
import type { MapPoint, ProjectedMapScene } from "./model.ts";

function sameRows<T>(a: readonly T[] | undefined, b: readonly T[] | undefined, equal: (a: T, b: T) => boolean): boolean {
  if (a === b) return true;
  if ((a?.length ?? 0) !== (b?.length ?? 0)) return false;
  return !a?.some((row, index) => row !== b![index] && !equal(row, b![index]!));
}
const samePoints = (a: readonly MapPoint[], b: readonly MapPoint[]): boolean => sameRows(a, b, (x, y) => x[0] === y[0] && x[1] === y[1]);
function sameDrawing(a: CartographyDrawing | undefined, b: CartographyDrawing | undefined): boolean {
  return a === b || !!a && !!b && a.width === b.width && a.height === b.height && a.background === b.background
    && sameRows(a.polygons, b.polygons, (x, y) => x.fill === y.fill && x.opacity === y.opacity && samePoints(x.points, y.points));
}

/** Only drawing work is cached. The complete replacement scene is still validated and used
 * for picking, selection, interaction cancellation and resource revocation on every update.
 * Compare content as well as identity: server polling can recreate otherwise identical rows.
 * Inputs follow the renderer boundary's readonly contract; callers replace edited records. */
export function changedSceneLayers(previous: ProjectedMapScene | undefined, next: ProjectedMapScene) {
  const world = !previous || previous.id !== next.id || previous.width !== next.width || previous.height !== next.height;
  const night = previous?.mood === "nacht", nextNight = next.mood === "nacht";
  const painting = !!previous?.drawing || previous?.painted === true, nextPainting = !!next.drawing || next.painted === true;
  const paintCells = !previous?.drawing && previous?.paintCells !== false, nextPaintCells = !next.drawing && next.paintCells !== false;
  const wallSize = (scene: ProjectedMapScene) => scene.grid && scene.grid.kind !== "none" ? scene.grid.size : 100;
  return {
    bounds: world,
    geography: world || !sameDrawing(previous!.drawing, next.drawing) || paintCells !== nextPaintCells
      || nextPaintCells && (!!previous!.rasterScope !== !!next.rasterScope
        || !sameRows(previous!.cells, next.cells, (a, b) => a.fill === b.fill && a.surface === b.surface && a.roof === b.roof && samePoints(a.polygon, b.polygon))),
    stamps: world || painting !== nextPainting || night !== nextNight
      || !sameRows(previous!.stamps, next.stamps, (a, b) => a.id === b.id && a.asset === b.asset && a.x === b.x && a.y === b.y && a.s === b.s && a.r === b.r && a.l === b.l && a.t === b.t),
    lettering: world || night !== nextNight
      || !sameRows(previous!.labels, next.labels, (a, b) => a.text === b.text && a.style === b.style && a.size === b.size && samePoints(a.points, b.points)),
    lights: world || night !== nextNight
      || !sameRows(previous!.lights, next.lights, (a, b) => a.x === b.x && a.y === b.y && a.range === b.range && a.intensity === b.intensity && a.color === b.color),
    pins: world || !sameRows(previous!.pins, next.pins, (a, b) => a.id === b.id && a.x === b.x && a.y === b.y && a.color === b.color && a.icon === b.icon && a.showMarker === b.showMarker),
    tokens: world || !sameRows(previous!.tokens, next.tokens, (a, b) => a.id === b.id && a.x === b.x && a.y === b.y && a.color === b.color && a.radius === b.radius),
    walls: world || wallSize(previous!) !== wallSize(next)
      || !sameRows(previous!.lines, next.lines, (a, b) => a.color === b.color && a.paint === b.paint && samePoints(a.points, b.points)),
  };
}
