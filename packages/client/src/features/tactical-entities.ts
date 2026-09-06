import type { TacticalAnchor } from "@chronicle/protocol";
import type { TacticalMapDocumentV1 } from "@chronicle/szene";

export interface MapObject {
  id: string; kind: "stamp" | "place"; x: number; y: number; label: string; entryId?: string;
}
export const MAP_OBJECT_LIMIT = 20_000;
export const objectKey = (object: Pick<MapObject, "kind" | "id">) => `${object.kind}:${object.id}`;
/** The full accessible outline remains separate from this explicitly bounded graphic. */
export function mapObjectWindow<T extends MapObject>(objects: readonly T[], selected: string, width: number, height: number) {
  const eligible = objects.filter(o => Number.isFinite(o.x) && Number.isFinite(o.y) && o.x >= 0 && o.y >= 0 && o.x <= width && o.y <= height);
  const window = eligible.slice(0, MAP_OBJECT_LIMIT);
  const chosen = eligible.find(o => objectKey(o) === selected);
  if (chosen && !window.some(o => objectKey(o) === selected)) window[window.length - 1] = chosen;
  return window;
}
/** GM preparation only: anonymous geometry does not acquire a fabricated wiki binding. */
export function preparationObjects(document: TacticalMapDocumentV1, anchors: readonly TacticalAnchor[], entries: readonly { id: string; title: string }[]): MapObject[] {
  const bindings = new Map(anchors.map(a => [`${a.targetKind}:${a.targetId}`, a]));
  const titles = new Map(entries.map(e => [e.id, e.title]));
  return ([...document.geometry.stamps.map(o => ({ ...o, kind: "stamp" as const })), ...document.geometry.places.map(o => ({ ...o, kind: "place" as const }))])
    .map(o => { const a = bindings.get(objectKey(o)); return { id: o.id, kind: o.kind, x: o.x, y: o.y, label: a ? titles.get(a.entryId) ?? "Verknüpfter Artikel" : o.kind === "place" ? "Unverknüpfter Ort" : "Unverknüpftes Kartenobjekt", ...(a ? { entryId: a.entryId } : {}) }; })
    .sort((a, b) => objectKey(a) < objectKey(b) ? -1 : objectKey(a) > objectKey(b) ? 1 : 0);
}
