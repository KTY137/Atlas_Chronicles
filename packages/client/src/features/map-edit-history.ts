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
const stable = (value: unknown): string => JSON.stringify(value, (_key, child: unknown) => child && typeof child === "object" && !Array.isArray(child) ? Object.fromEntries(Object.entries(child).sort(([a], [b]) => a.localeCompare(b))) : child);
export const editFingerprint = (snapshot: MapEditSnapshot): string => stable(snapshot);
export const editDirty = (history: MapEditHistory): boolean => !!history.gesture || editFingerprint(history.present) !== editFingerprint(history.baseline);
export const editHistory = (snapshot: MapEditSnapshot): MapEditHistory => ({ baseline: snapshot, past: [], present: snapshot, future: [], gesture: null });

/** Only completed user edits enter history; temporary pointer motion never does. */
export function commitEdit(history: MapEditHistory, next: MapEditSnapshot, limits: { readonly steps: number; readonly bytes: number } = MAP_HISTORY_LIMITS): MapEditHistory {
  next = normalizeEdit(next, history.baseline);
  if (editFingerprint(next) === editFingerprint(history.present)) return { ...history, gesture: null };
  const past = [...history.past, history.present];
  const bytes = (snapshot: MapEditSnapshot) => new TextEncoder().encode(editFingerprint(snapshot)).byteLength;
  let retained = past.reduce((sum, snapshot) => sum + bytes(snapshot), 0) + bytes(next);
  while (past.length && (past.length > limits.steps || retained > limits.bytes)) retained -= bytes(past.shift()!);
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

/** Match the server's immutable-region rule against the saved revision, including artwork. */
function normalizeEdit(snapshot: MapEditSnapshot, saved: MapEditSnapshot): MapEditSnapshot {
  const index = (value: MapEditSnapshot) => {
    const geometry = new Map(value.document.geometry.regions.map(region => [region.id, region]));
    const stamps = new Map(value.document.geometry.stamps.map(stamp => [stamp.id, stamp]));
    const walls = new Map(value.document.walls.map(item => [item.id, item]));
    const portals = new Map(value.document.portals.map(item => [item.id, item]));
    const lights = new Map(value.document.lights.map(item => [item.id, item]));
    const places = new Map(value.document.geometry.places.map(item => [item.id, item]));
    return new Map(value.cartography.regions.map(region => {
      const { authored: _authored, locked: _locked, provenance: _provenance, ...meaning } = region;
      return [region.regionId, { region, fingerprint: stable([geometry.get(region.regionId), meaning,
        region.role === "building" ? (region.attachedStampIds ?? []).map(id => stamps.get(id)) : region.role === "room" && region.interior ? [region.interior.stampIds.map(id => stamps.get(id)), region.interior.wallIds.map(id => walls.get(id)), region.interior.portalIds.map(id => portals.get(id)), region.interior.lightIds.map(id => lights.get(id)), (region.interior.placeIds ?? []).map(id => places.get(id))] : null]) }] as const;
    }));
  };
  const before = index(saved), current = index(snapshot);
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
  return { ...snapshot, document, cartography: { ...snapshot.cartography, regions: document.geometry.regions.map(region => {
    const existing = roles.get(region.id) ?? { regionId: region.id, role: "generic" as const, authored: true, locked: false, provenance: null };
    const changed = JSON.stringify(previousRegions.get(region.id)) !== JSON.stringify(region) || existing.role === "building" && existing.attachedStampIds?.some(id => JSON.stringify(stamps.get(id)) !== JSON.stringify(previousStamps.get(id)));
    const role = changed ? { ...existing, authored: true, provenance: null } : existing;
    return role.role === "building" && role.attachedStampIds ? { ...role, attachedStampIds: role.attachedStampIds.filter(id => stamps.has(id)) } : role;
    
  }).map(region => region.role === "room" && region.interior ? { ...region, interior: { ...region.interior,
    stampIds: region.interior.stampIds.filter(id => stamps.has(id)),
    wallIds: region.interior.wallIds.filter(id => document.walls.some(item => item.id === id)),
    portalIds: region.interior.portalIds.filter(id => document.portals.some(item => item.id === id)),
    lightIds: region.interior.lightIds.filter(id => document.lights.some(item => item.id === id)),
    ...(region.interior.placeIds ? { placeIds: region.interior.placeIds.filter(id => document.geometry.places.some(item => item.id === id)) } : {}),
    ...(region.interior.portalArtwork ? { portalArtwork: region.interior.portalArtwork.filter(mapping => document.portals.some(item => item.id === mapping.portalId)).map(mapping => ({ ...mapping, stampIds: mapping.stampIds.filter(id => stamps.has(id)) })) } : {}),
  } } : region) }, addedBuildings: snapshot.addedBuildings.filter(intent => document.geometry.regions.some(region => region.id === intent.regionId)),
    ...(snapshot.addedRooms ? { addedRooms: snapshot.addedRooms.filter(intent => document.geometry.regions.some(region => region.id === intent.regionId)) } : {}) };
}
