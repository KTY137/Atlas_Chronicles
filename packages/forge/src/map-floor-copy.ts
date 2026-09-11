// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2026 Kaya Yesilyurt - Atlas Chronicles. Siehe LICENSE.
import { canonicalHash } from "@chronicle/core";
import { parseTacticalMapDocument, parseTacticalCartography, type TacticalMapDocumentV1, type TacticalCartographyV1,
  type CartographyRegionV1, type CartographyRoomInteriorV1, type Knoten } from "@chronicle/szene";

/** Copy a saved blueprint, not its world identity, knowledge bindings or nested entrances.
 * Once created, both maps are independently editable ordinary revisions. */
export function copyFloorBlueprint(document: TacticalMapDocumentV1, cartography: TacticalCartographyV1,
  roomNames: ReadonlyMap<string, string>, seed: string, contents: boolean) {
  const source = parseTacticalMapDocument(document), drawing = parseTacticalCartography(cartography, source);
  const remap = (kind: string, id: string) => `floor-${canonicalHash(["floor-copy-v1", seed, kind, id]).slice(0, 40)}`;
  const interior = (v: CartographyRoomInteriorV1): CartographyRoomInteriorV1 => ({ ...v,
    stampIds: contents ? v.stampIds.map(id => remap("stamp", id)) : [], wallIds: v.wallIds.map(id => remap("wall", id)),
    portalIds: v.portalIds.map(id => remap("portal", id)), lightIds: contents ? v.lightIds.map(id => remap("light", id)) : [],
    ...(v.placeIds ? { placeIds: contents ? v.placeIds.map(id => remap("place", id)) : [] } : {}),
    ...(v.portalArtwork ? { portalArtwork: contents ? v.portalArtwork.map(p => ({ portalId: remap("portal", p.portalId), stampIds: p.stampIds.map(id => remap("stamp", id)) })) : [] } : {}),
  });
  const nextDocument = parseTacticalMapDocument({ ...source, geometry: { ...source.geometry,
    regions: source.geometry.regions.map(r => ({ ...r, id: remap("region", r.id) })),
    stamps: contents ? source.geometry.stamps.map(s => ({ ...s, id: remap("stamp", s.id) })) : [],
    places: contents ? source.geometry.places.map(p => ({ ...p, id: remap("place", p.id) })) : [],
  }, geometryElevation: source.geometryElevation.filter(e => contents || e.targetKind === "region").map(e => ({ ...e, targetId: remap(e.targetKind, e.targetId) })),
    walls: source.walls.map(w => ({ ...w, id: remap("wall", w.id) })),
    portals: source.portals.map(p => ({ ...p, id: remap("portal", p.id) })),
    lights: contents ? source.lights.map(l => ({ ...l, id: remap("light", l.id) })) : [],
  });
  const nextCartography = parseTacticalCartography({ ...drawing,
    regions: drawing.regions.map((r): CartographyRegionV1 => {
      const common = { ...r, regionId: remap("region", r.regionId), authored: true, provenance: null, locked: false };
      if (r.role === "room") return { ...common, role: "room", ...(r.interior ? { interior: interior(r.interior) } : {}) };
      if (r.role === "building") return { ...common, role: "building",
        ...(r.lotRegionId ? { lotRegionId: remap("region", r.lotRegionId) } : {}),
        ...(r.streetRegionId ? { streetRegionId: remap("region", r.streetRegionId) } : {}),
        ...(r.attachedStampIds ? { attachedStampIds: contents ? r.attachedStampIds.map(id => remap("stamp", id)) : [] } : {}),
      };
      return common;
    }),
    ...(drawing.labels ? { labels: contents ? drawing.labels.map(l => ({ ...l, id: remap("label", l.id) })) : [] } : {}),
  }, nextDocument);
  const nodes: Knoten[] = drawing.regions.filter(r => r.role === "room" || r.role === "generic").map((r, i) => {
    const id = remap("region", r.regionId), childSeed = canonicalHash(["floor-room-child-v1", seed, id]);
    return { id: id as Knoten["id"], art: "raum", titel: roomNames.get(r.regionId) ?? `Raum ${i + 1}`,
      eltern: [], rahmen: nextDocument.frame, anker: null, sichtAnker: null,
      herkunft: { erzeuger: "chronicle-floor-copy", version: "1", keimHash: childSeed, erzeugungspfad: ["room", id], kindKeim: childSeed },
    };
  });
  return { document: nextDocument, cartography: nextCartography, nodes,
    regionIds: new Map(source.geometry.regions.map(r => [r.id, remap("region", r.id)])) };
}
