# Tactical map v1 data contract

[tactical-map-v1.schema.json](tactical-map-v1.schema.json) is the closed,
MIT-licensed interchange shape for `TacticalMapDocumentV1`. Its reference parser
is [tactical-map.ts](../src/tactical-map.ts). This is an implementation contract
for review, not a claim that a new product design or placement gate is ratified.
The existing [SceneDoc v3 interface](../src/model.ts) remains unchanged.

## Coordinates and geometry

All scene geometry, wall vertices, portal bounds/positions, light positions and
light ranges use image pixels with a top-left origin and downward y. Coordinates
outside the image are legal: cropped UVTT exports contain off-crop geometry.
Image dimensions are positive and bounded; a background requires integer pixel
dimensions exactly matching the geometry.

`frame` retains an independent external coordinate system. For image point
`(u,v)`, compute `dx=u*einheitenProPixel` and
`dy=v*einheitenProPixel*(hoch==="unten"?1:-1)`; add `[dx,dy]` to
`ursprung` for `ordnung:"xy"`, or `[dy,dx]` for `"yx"`.
Each child map has its own frame; neither this contract nor a zoom gesture
establishes parent/child containment.

A square grid's `size` is its cell pitch in pixels; `origin` is a lattice
intersection. A hex grid's `size` is the circumradius. `orientation` selects
pointy or flat hexes, and `offset` selects the shifted even/odd rows (pointy)
or columns (flat). Its origin is the center of hex (0,0). Gridless maps declare
only `{kind:"none"}`; coordinate scale remains in `frame`.

All `elevation` values are absolute scalar heights in the frame's external
units, with an arbitrary map-local zero. The root value defaults the existing
SceneDoc geometry; `geometryElevation` supplies unique overrides for existing
stamps, regions and places. Walls, portals and lights carry explicit scalar
heights. These numbers do not establish floors, levels, movement or LOS.

Geometry IDs are nonempty bounded strings and unique across stamps, regions,
places, walls, portals and lights. They do not identify wiki entries or actors.
Stamp fields follow the existing model: pack-qualified asset reference, uniform
positive scale, radians, layer, optional RGB tint and four existing flags
(flipX, flipY, locked, castsShadow; RB-20b). These are retained data, not an
editor or renderer implementation. The tactical profile constrains an optional
`PyramidRef.basisUrl` to `asset:<sha256>`, an opaque logical content address;
a later authorized delivery adapter must resolve it. This does not change the
broader SceneDoc v3 type.

Portals preserve source `closed` and `freestanding` flags. Those flags are
insufficient to infer whether a producer meant an open door or a window.
Lights preserve eight-digit ARGB, intensity, range and shadows; the contract
does not promise a particular illumination renderer. `background` is a content
digest, MIME type and dimensions, never a remote URL or embedded texture.

## Validation and evolution

Every object is closed. Unknown keys or schema versions require an explicit
migration. The parser returns a detached, deeply frozen snapshot; its JSON
serializer sorts object keys and preserves array order. It rejects duplicate
JSON keys, prototype keys, nonfinite values, cycles, accessors and excessive
nesting. The schema describes local shape; the reference parser also checks
global IDs, elevation references, image dimension equality, aggregate vertices,
pixel area and resource budgets. Apply both shape and semantic validation.

Limits: 32 MiB native JSON, 48 nesting levels, 2,000,000 JSON nodes, coordinates
and scalar heights within ±1e9, dimensions at most 32768, image area at most
144,000,000 pixels, 50,000 stamps, 2048 regions, 20,000 places, 20,000 combined
wall/object polylines, 20,000 portals, 4096 lights and 200,000 polygon/polyline/
portal-bound vertices. Text IDs and asset references are capped at 256 UTF-16
code units by the parser. These are import ceilings, not performance claims.

No identity, auth, fog, knowledge, actor control, token placement or undo state
is present. Persisted bindings and viewer projection remain separate contracts.
Neither a wall nor a shadow flag grants access; delivering a full secret image
with a client mask would still disclose that image.

## Design lineage

The model follows [RB-20b](../../../design/research/RB-20b-machbarkeit.md)
for unchanged anonymous stamps and separate bindings, and
[RB-21d](../../../design/research/RB-21d-erzeugung-je-ebene.md)
for independent coordinate frames and preserved source provenance.
The UVTT adapter and licensed external fixture are documented
[here](../../forge/test/fixtures/uvtt/README.md). Native campaign bundle v1 and
SceneDoc v3 are not widened by this profile.
