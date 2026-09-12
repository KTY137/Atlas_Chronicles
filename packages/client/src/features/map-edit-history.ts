// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2026 Kaya Yesilyurt - Atlas Chronicles. Siehe LICENSE.
import type { TacticalAnchor } from "@chronicle/protocol";
import type { BuildingIntent, RoomIntent, TacticalCartographyV1, TacticalMapDocumentV1 } from "@chronicle/szene";

export interface MapEditSnapshot {
  readonly document: TacticalMapDocumentV1;
  readonly cartography: TacticalCartographyV1;
  readonly anchors: readonly TacticalAnchor[];
  readonly addedBuildings: readonly BuildingIntent[];
  readonly addedRooms?: readonly RoomIntent[];
}
export interface MapEditGesture {
  readonly id: string;
  readonly seed: string;
  readonly baseline: MapEditSnapshot;
  readonly preview: MapEditSnapshot | null;
}
export interface MapEditHistory {
  readonly baseline: MapEditSnapshot;
  readonly past: readonly MapEditSnapshot[];
  readonly present: MapEditSnapshot;
  readonly future: readonly MapEditSnapshot[];
  readonly gesture: MapEditGesture | null;
}
export const MAP_HISTORY_LIMITS = Object.freeze({ steps: 100, bytes: 32 * 1024 * 1024 });
// Snapshots and their JSON subtrees are immutable. Reuse the exact canonical text of shared
// terrain/artwork instead of sorting and traversing the entire map for every small edit.
// Weak keys release abandoned previews and evicted history together with their cached text.
const canonicalText = new WeakMap<object, string>();
const encodedSizes = new WeakMap<MapEditSnapshot, number>();
const encoder = new TextEncoder();
function stable(value: unknown): string {
  if (!value || typeof value !== "object") return JSON.stringify(value);
  const cached = canonicalText.get(value);
  if (cached !== undefined) return cached;
  let serialized: string;
  if (Array.isArray(value)) serialized = `[${Array.from(value, child => stable(child) ?? "null").join(",")}]`;
  else {
    // Object enumeration keeps numeric keys in JSON's numeric order, even after sorting.
    const sorted = Object.fromEntries(Object.entries(value).sort(([a], [b]) => a.localeCompare(b)));
    serialized = `{${Object.entries(sorted).flatMap(([key, child]) => {
      const text = stable(child);
      return text === undefined ? [] : [`${JSON.stringify(key)}:${text}`];
    }).join(",")}}`;
  }
  canonicalText.set(value, serialized);
  return serialized;
}
function editBytes(snapshot: MapEditSnapshot): number {
  const cached = encodedSizes.get(snapshot);
  if (cached !== undefined) return cached;
  const size = encoder.encode(editFingerprint(snapshot)).byteLength;
  encodedSizes.set(snapshot, size);
  return size;
}
export const editFingerprint = (snapshot: MapEditSnapshot): string => stable(snapshot);
export const editDirty = (history: MapEditHistory): boolean => !!history.gesture || history.present !== history.baseline && editFingerprint(history.present) !== editFingerprint(history.baseline);
export const editHistory = (snapshot: MapEditSnapshot): MapEditHistory => ({ baseline: snapshot, past: [], present: snapshot, future: [], gesture: null });

/** Only completed user edits enter history; temporary pointer motion never does. */
export function commitEdit(history: MapEditHistory, next: MapEditSnapshot, limits: { readonly steps: number; readonly bytes: number } = MAP_HISTORY_LIMITS): MapEditHistory {
  next = normalizeEdit(next, history.baseline);
  if (editFingerprint(next) === editFingerprint(history.present)) return { ...history, gesture: null };
  const past = [...history.past, history.present];
  let retained = past.reduce((sum, snapshot) => sum + editBytes(snapshot), 0) + editBytes(next);
  while (past.length && (past.length > limits.steps || retained > limits.bytes)) retained -= editBytes(past.shift()!);
  return { ...history, past, present: next, future: [], gesture: null };
}
export function undoEdit(history: MapEditHistory): MapEditHistory {
  if (history.gesture) return { ...history, gesture: null };
  const previous = history.past.at(-1);
  return previous ? { ...history, past: history.past.slice(0, -1), present: previous, future: [history.present, ...history.future] } : history;
}
export function redoEdit(history: MapEditHistory): MapEditHistory {
  const next = history.future[0];
  return next && !history.gesture ? { ...history, past: [...history.past, history.present], present: next, future: history.future.slice(1) } : history;
}
export function beginEdit(history: MapEditHistory, id: string, seed: string): MapEditHistory { return { ...history, gesture: { id, seed, baseline: history.present, preview: null } }; }
export function previewEdit(history: MapEditHistory, id: string, snapshot: MapEditSnapshot): MapEditHistory {
  return history.gesture?.id === id ? { ...history, gesture: { ...history.gesture, preview: normalizeEdit(snapshot, history.baseline) } } : history;
}
export const cancelEdit = (history: MapEditHistory): MapEditHistory => history.gesture ? { ...history, gesture: null } : history;
export function acceptEdit(history: MapEditHistory): MapEditHistory { return history.gesture?.preview ? commitEdit(history, history.gesture.preview) : history; }

type CartographyRegion = TacticalCartographyV1["regions"][number];
const regionIndexes = new WeakMap<MapEditSnapshot, ReadonlyMap<string, { readonly region: CartographyRegion; readonly fingerprint: string }>>();
const regionMeanings = new WeakMap<CartographyRegion, object>();
function editRegionIndex(value: MapEditSnapshot) {
  const cached = regionIndexes.get(value);
  if (cached) return cached;
  const geometry = new Map(value.document.geometry.regions.map(region => [region.id, region]));
  const stamps = new Map(value.document.geometry.stamps.map(stamp => [stamp.id, stamp]));
  const walls = new Map(value.document.walls.map(item => [item.id, item]));
  const portals = new Map(value.document.portals.map(item => [item.id, item]));
  const lights = new Map(value.document.lights.map(item => [item.id, item]));
  const places = new Map(value.document.geometry.places.map(item => [item.id, item]));
  const indexed = new Map(value.cartography.regions.map(region => {
    let meaning = regionMeanings.get(region);
    if (!meaning) {
      const { authored: _authored, locked: _locked, provenance: _provenance, ...rest } = region;
      meaning = rest; regionMeanings.set(region, meaning);
    }
    return [region.regionId, { region, fingerprint: stable([geometry.get(region.regionId), meaning,
      region.role === "building" ? (region.attachedStampIds ?? []).map(id => stamps.get(id)) : region.role === "room" && region.interior ? [region.interior.stampIds.map(id => stamps.get(id)), region.interior.wallIds.map(id => walls.get(id)), region.interior.portalIds.map(id => portals.get(id)), region.interior.lightIds.map(id => lights.get(id)), (region.interior.placeIds ?? []).map(id => places.get(id))] : null]) }] as const;
  }));
  regionIndexes.set(value, indexed);
  return indexed;
}
/** Match the server's immutable-region rule against the saved revision, including artwork. */
function normalizeEdit(snapshot: MapEditSnapshot, saved: MapEditSnapshot): MapEditSnapshot {
  if (snapshot === saved) return snapshot;
  const document = snapshot.document, baseline = saved.document;
  if (snapshot.cartography.regions === saved.cartography.regions && document.geometry.regions === baseline.geometry.regions
    && document.geometry.stamps === baseline.geometry.stamps && document.geometry.places === baseline.geometry.places
    && document.walls === baseline.walls && document.portals === baseline.portals && document.lights === baseline.lights) return snapshot;
  const before = editRegionIndex(saved), current = editRegionIndex(snapshot);
  let changed = false;
  const regions = snapshot.cartography.regions.map(region => {
    const stored = before.get(region.regionId), same = stored?.fingerprint === current.get(region.regionId)!.fingerprint;
    const authored = same ? stored!.region.authored : true, provenance = same ? stored!.region.provenance : null;
    if (authored === region.authored && stable(provenance) === stable(region.provenance)) return region;
    changed = true; return { ...region, authored, provenance };
  });
  return changed ? { ...snapshot, cartography: { ...snapshot.cartography, regions } } : snapshot;
}

/** A successful PUT followed by a later GET must retain edits made while reloading. */
export function acknowledgeEdit(history: MapEditHistory, submitted: MapEditSnapshot, saved: MapEditSnapshot): MapEditHistory {
  const rebase = (snapshot: MapEditSnapshot): MapEditSnapshot => editFingerprint(snapshot) === editFingerprint(submitted) ? saved : ({ ...normalizeEdit(snapshot, saved),
    addedBuildings: snapshot.addedBuildings.filter(intent => !saved.document.geometry.regions.some(region => region.id === intent.regionId)),
    ...(snapshot.addedRooms ? { addedRooms: snapshot.addedRooms.filter(intent => !saved.document.geometry.regions.some(region => region.id === intent.regionId)) } : {}),
  });
  const present = editFingerprint(history.present) === editFingerprint(submitted) ? saved : rebase(history.present);
  const reversedIndex = [...history.past].reverse().findIndex(snapshot => editFingerprint(snapshot) === editFingerprint(submitted));
  const submittedIndex = reversedIndex < 0 ? -1 : history.past.length - 1 - reversedIndex;
  const past = editFingerprint(present) === editFingerprint(saved) ? [] : submittedIndex >= 0 ? [saved, ...history.past.slice(submittedIndex + 1).map(rebase)] : [saved];
  const gesture = history.gesture ? { ...history.gesture, baseline: rebase(history.gesture.baseline), preview: history.gesture.preview ? rebase(history.gesture.preview) : null } : null;
  return { baseline: saved, present, past, future: history.future.map(rebase), gesture };
}

/** Changes from the existing object inspector keep role coverage and attached references complete. */
export function editDocument(snapshot: MapEditSnapshot, document: TacticalMapDocumentV1): MapEditSnapshot {
  const roles = new Map(snapshot.cartography.regions.map(region => [region.regionId, region]));
  const stamps = new Map(document.geometry.stamps.map(stamp => [stamp.id, stamp]));
  const previousStamps = new Map(snapshot.document.geometry.stamps.map(stamp => [stamp.id, stamp]));
  const previousRegions = new Map(snapshot.document.geometry.regions.map(region => [region.id, region]));
  const regionIds = new Set(document.geometry.regions.map(region => region.id));
  const wallIds = new Set(document.walls.map(item => item.id)), portalIds = new Set(document.portals.map(item => item.id));
  const lightIds = new Set(document.lights.map(item => item.id)), placeIds = new Set(document.geometry.places.map(item => item.id));
  const retain = <T>(items: readonly T[], keep: (item: T) => boolean): readonly T[] => {
    const retained = items.filter(keep);
    return retained.length === items.length ? items : retained;
  };
  const regions = document.geometry.regions.map(region => {
    const existing = roles.get(region.id) ?? { regionId: region.id, role: "generic" as const, authored: true, locked: false, provenance: null };
    const previous = previousRegions.get(region.id);
    const changed = previous !== region && JSON.stringify(previous) !== JSON.stringify(region) || existing.role === "building" && existing.attachedStampIds?.some(id => stamps.get(id) !== previousStamps.get(id) && JSON.stringify(stamps.get(id)) !== JSON.stringify(previousStamps.get(id)));
    const role = changed ? { ...existing, authored: true, provenance: null } : existing;
    if (role.role !== "building" || !role.attachedStampIds) return role;
    const attachedStampIds = retain(role.attachedStampIds, id => stamps.has(id));
    return attachedStampIds === role.attachedStampIds ? role : { ...role, attachedStampIds };
  }).map(region => {
    if (region.role !== "room" || !region.interior) return region;
    const previous = region.interior;
    const retainedArtwork = previous.portalArtwork ? retain(previous.portalArtwork, mapping => portalIds.has(mapping.portalId)).map(mapping => {
      const stampIds = retain(mapping.stampIds, id => stamps.has(id));
      return stampIds === mapping.stampIds ? mapping : { ...mapping, stampIds };
    }) : undefined;
    const portalArtwork = retainedArtwork?.length === previous.portalArtwork?.length && retainedArtwork?.every((mapping, index) => mapping === previous.portalArtwork![index]) ? previous.portalArtwork : retainedArtwork;
    const interior = { ...previous,
      stampIds: retain(previous.stampIds, id => stamps.has(id)),
      wallIds: retain(previous.wallIds, id => wallIds.has(id)),
      portalIds: retain(previous.portalIds, id => portalIds.has(id)),
      lightIds: retain(previous.lightIds, id => lightIds.has(id)),
      ...(previous.placeIds ? { placeIds: retain(previous.placeIds, id => placeIds.has(id)) } : {}),
      ...(previous.portalArtwork ? { portalArtwork } : {}),
    };
    return Object.entries(interior).every(([key, value]) => value === previous[key as keyof typeof previous]) ? region : { ...region, interior };
  });
  const sameRegions = regions.length === snapshot.cartography.regions.length && regions.every((region, index) => region === snapshot.cartography.regions[index]);
  return { ...snapshot, document, cartography: sameRegions ? snapshot.cartography : { ...snapshot.cartography, regions },
    addedBuildings: retain(snapshot.addedBuildings, intent => regionIds.has(intent.regionId)),
    ...(snapshot.addedRooms ? { addedRooms: retain(snapshot.addedRooms, intent => regionIds.has(intent.regionId)) } : {}) };
}
