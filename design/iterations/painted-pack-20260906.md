# Painted dungeon assets: byte-safe admission and integration route

Date: 2026-09-06. Owner: Codex, routed through codex-root. Scope: a gate regression/fix and two
authoring rounds with a concrete integration handoff. Root selected the project-use integration
direction below; its projection/renderer contract still awaits independent review before code
changes. No pack registration or publication grant occurred. Existing asset and forge ownership
remains in force.

## Verified originals

The three PNGs in `assets/generated/painted-dungeon-v1/` were read without modification, compared
against their original tool outputs, checked against `provenance.json`, and visually inspected.
All comparisons matched. Dimensions below come from their PNG IHDR bytes, not filename guesses.

| Asset | Pixels | Original bytes | Bytes after lossy UTF-8 decode/re-encode |
| --- | --- | ---: | ---: |
| stone-floor.png | 1254 x 1254 | 2,873,150 | 5,244,648 |
| wooden-table.png | 1536 x 1024 | 2,534,421 | 4,633,625 |
| rock-rubble.png | 1254 x 1254 | 1,578,795 | 2,875,969 |

SHA-256 of unchanged originals:

- Stone: `ead331468004c894199371c4d21af04837a320f6c18d7444887805c73475adc6`
- Table: `06d26decb0196b8f8aebeda2cfede2c41b7c0724fd406d0c19ede822fb1447cf`
- Rubble: `854751b349446e8466986ed09c7304a260fec1873402bc6a3501dd7cd96c9d05`

The recorded alpha measurements remain historical evidence from the original worker; this beat
did not rerun its pixel histogram. Stone is a finite surface, with no validated seamless repeat.
Table and rubble are transparent props. Their alpha fringe still needs inspection on both a light
and a dark product surface at intended scale. No file was cropped, recolored, resampled or rewritten.

## Confirmed gate defect, regression before correction

`tools/gate-assets.mjs` decoded every asset as UTF-8, then hashed and counted the re-encoded text.
Its own contract says these are file content addresses. A valid PNG therefore failed, while a
manifest declaring the *wrong* decoded hash and length passed.

The new `tools/test/gate-assets-binary.test.mjs` runs an unchanged copy of the actual gate in a
fresh OS-temp directory with the real canonical parser, a copy of `pk.grundriss`, and its actual
author script. Dependencies are linked read-only by use, and no shared pack, port, database or
build cache is written. Cleanup unlinks the dependency junction before removing the verified
temporary root. Synthetic PNG data includes a valid inert text chunk containing `<script>`.

Before correction, five child cases produced three passes and two failures:

1. Ordinary SVG and the real reproduced SVG pack passed.
2. PNG with the correct raw SHA-256/length was rejected with both mismatch messages.
3. PNG with forged decoded SHA-256/length incorrectly returned `gate:assets GREEN`.
4. Executable SVG was rejected.
5. SVG with a mismatched viewBox was rejected.

After the source claim and router authorization, the narrow fix reads assets as Buffers, hashes
those Buffers, compares `.length`, and calls `.toString("utf8")` only in the SVG validation branch.
The same unchanged regression then passed all five child cases (Node reports six tests including
the parent). `node --import tsx tools/gate-assets.mjs` passed with one pack, 41 assets, 41 resolvable
references and one reproduced author source. These results apply to the working tree; no commit
or detached-tree release verification was performed by this worker.

Recommended root script wiring, for the root package owner:

```json
"gate:assets": "node --test tools/test/gate-assets-binary.test.mjs && node --import tsx tools/gate-assets.mjs"
```

This adds the regression to the existing asset gate without a second validator or test framework.

## Existing contract and live integration seams

`packages/szene/src/assetpaket.ts` already admits PNG/WebP alongside SVG. `AssetpaketV1` requires
the actual pixel dimensions, anchor, integer cell footprint, cell pitch, raw file identity and a
hashed license text snapshot. `LicenseRef-*` is supported. It has no `localOnly`, distribution
admission or owner authorization field. The provenance JSON is not a package manifest.

`packages/server/src/domain/packs.ts` already reads Buffers, verifies SHA-256/declared length and
resolves files only through manifest rows. `packages/server/src/http/packs.ts` is registered in
the app and supplies `/api/packs`, `/:packId/manifest` and `/:packId/asset/*`. Installation is
global to that server: every authenticated identity can access every installed pack. The
`createPacks({ root })` override exists but is documented as a fixture hook; it is not a deployed
private-profile admission mechanism.

`packages/server/src/domain/grundriss.ts` still reads `pk.grundriss/paket.json` directly and accepts
no pack selection. The forge accepts one canonical pack and reports unserved thematic slots.
`packages/client/src/features/TacticalCanvas.tsx` currently fetches raster tiles only: it neither
fetches pack manifests/assets nor calls `MapRenderer.setStampImages`. Renderer support already
exists, but `packages/render/src/renderer.ts` anchors every stamp at its image center. The host
must deliver images before any generated prop becomes visible.

`packages/forge/src/grundriss.ts` selects each floor by theme then stamps it into every floor cell;
it does not consult `kachelbar`. Registering the stone image with matching floor tags would repeat
a non-tileable finite image and, at the proposed authoring pitch, overlap adjacent cells.

## Authoring round 1: three routes and the attack findings

| Route | Product result | Required decision/work |
| --- | --- | --- |
| Own private installation using canonical V1 | The original props become usable in the requested app, with explicit incomplete-theme reporting | Actual private profile/root admission, package selection and host image delivery; a scoped use notice grounded in the user's instruction |
| Distribute an independent painted pack | A normal installed pack available to all intended recipients | A real redistribution grant selected by the operator, hashed text and provenance; the same generator/renderer wiring |
| Composite/overlay with the schematic pack | Complete existing rooms plus painted props | A deliberate multi-pack/generator decision, not filename substitution: current forge takes one pack and every asset shares its pack's cell pitch |

Round-1 recommendation: the first route, using `pk.painted-dungeon` and the exact PNG originals.
Keep this separate from the schematic author's reproducibility claim: stochastic image generation
cannot honestly reproduce the same pixels from a prompt. An installer can reproduce the package
from pinned original bytes and measured manifest data. Retain provenance outside the installed pack
or incorporate it into the declared notice: the gate rejects arbitrary unlisted README/JSON files.

Proposed manifest geometry, requiring a renderer-scale check before adoption:

| File/name | art | groesse | anker | einheiten | schlagworte |
| --- | --- | --- | --- | --- | --- |
| stone-floor.png / stone-floor | boden | [1254,1254] | [627,627] | [3,3] | [bemalt,einzelflaeche] |
| wooden-table.png / wooden-table | moebel | [1536,1024] | [768,512] | [3,2] | [mahl,holz,bemalt] |
| rock-rubble.png / rock-rubble | aufbau | [1254,1254] | [627,627] | [3,3] | [geroell,stein,bemalt] |

All three use `image/png`, `kachelbar:false`, `lizenz:null` inheriting the pack notice, and the raw
identity above. Pack `zellgroesse:512` puts the table canvas at exactly three by two cells; rubble
and stone occupy about 2.449 by 2.449 cells inside a three-by-three reserved footprint. Center
anchors match the present renderer, while full manifest anchor handling remains the correct
general solution. The stone tags deliberately match no default repeated-floor query. It is useful
as a single finite patch once placement/compositing exists; it cannot become the repeated floor
merely by setting a manifest tag.

Do not merge these rows into `pk.grundriss` unchanged. That pack's pitch is 64, so the same table
would draw at 24 by 16 cells. Changing the global pitch instead would shrink all existing SVGs.
The cell-pitch boundary is the concrete reason a silent asset replacement is incorrect.

The round-1 attack found three further holes in a pack-and-loader-only implementation:

- `TacticalView.entities` has exactly six fields (`id`, `kind`, `x`, `y`, `entryId`, `label`) in
  `packages/protocol/src/tactical.ts`. There is no asset reference or sprite transform to load.
- `TacticalView.tsx` maps these to pins, never to `ProjectedMapScene.stamps`. Reading the GM-only
  `document.geometry.stamps` in the browser would skip the existing knowledge projection.
- `setStampImages([])` does not clear textures. The present renderer setter only adds/replaces
  entries keyed by asset name; `update` clears raster resources on scope changes but does not
  invalidate stamp resources or reject an old asynchronous stamp-image response.

## Authoring round 2: selected project use, complete projection seam

Two implementation candidates after the attack:

| Candidate | Benefit | Failure/cost |
| --- | --- | --- |
| Infer sprites in the browser from the GM document or all map stamps | Short wiring patch | Rejected: unavailable to players by design and bypasses `Sicht`; texture lifetimes and visibility cannot be inferred from raw geometry |
| Server-selected visible stamps with pinned image metadata and independent stamp scope | One authorized projection for GM and players, with bounded renderer inputs | Selected direction; requires explicit protocol and renderer changes plus negative tests before implementation |

Root's 2026-09-06 instruction adopts a configurable, server-registered project-use pack for the
user's own generated outputs, the exact originals plus provenance, and an explicit UI pack
selection. The default CC0 `pk.grundriss` remains available and unchanged. The nonseamless stone
floor stays excluded from repeated-floor queries. Distribution remains a separate decision.
The following describes the contract to send to independent review, not code already delivered.

### Authorized projection, field by field

`packages/server/src/domain/tactical.ts:project` currently computes held/active passages and
lineage successors, derives `knowsAnchor`, projects known regions, then emits entities only for
known non-region anchors whose position is in a known region (GM authorization bypasses the
knowledge filter). The project-use integration must extend this same server decision. Asset
availability must never imply knowledge of a placement.

Add a distinct projected stamp collection, leaving the six-field entity record stable. Each row
contains only one already-authorized placement's `id`, pack-qualified `asset`, `x`, `y`, `s`, `r`,
`l`, optional `t`, and the resolved immutable image descriptor: pack id/version, declared relative
file, raw SHA-256, byte count, MIME type, intrinsic size and anchor. A deduplicated descriptor map
is acceptable only if its keys are exactly the assets referenced by emitted stamp rows. Do not
send a GM document, an entire generator scene, hidden stamp ids/counts or their asset references.

For the GM, the server may select map stamps using the authenticated GM membership decision;
clients still consume only the projected collection. For players, the first landing selects
only stamp-bound anchors already allowed by `knowsAnchor` and the known-region test. Unanchored
decorative floors/props are not silently made public. If the desired product behavior is to reveal
unanchored decoration by region, that requires a separately reviewed explicit policy, especially
because the generator currently emits many unanchored stamps.

The center-point check alone does not define which pixels of a large/rotated sprite may extend
into an unknown region. Preserve the known-region boundary by clipping selected sprite pixels to
the authorized region union; alternatively omit a sprite unless its full transformed footprint
is authorized. Independent review must choose and test this before player rendering is enabled.

Compute `stampDigest` from session/map revision, authorized perspective, selected stamps,
resolved content hashes/versions, anchors and any authorized clipping geometry. Include the
result and selected rows in the ordinary view digest. The existing `rasterDigest` remains for
raster tiles: it currently covers regions and perspective, so a placement or asset change alone
cannot safely reuse it as the stamp scope. Revoking an anchor or successor passage, switching
perspective, replacing a hash under the same asset name, or changing a transform must change the
stamp scope or synchronously remove the relevant placement.

### Host and renderer ownership

`TacticalView.tsx` passes the server-selected rows, scope and clipping data to `TacticalCanvas`;
it never manufactures them from `document`. The canvas host uses the pinned descriptor for the
existing manifest-owned `/api/packs/:packId/asset/:declaredFile` route, with the digest in the URL
cache key. The renderer remains network-free. A catalogue picker may show installed pack summaries
to the GM, but the board need not fetch full manifests merely to rediscover hidden asset names.

Before requests, deduplicate content and enforce quotas: initially at most three concurrent
downloads, 32 MiB per declared file (the existing package limit), 48 MiB compressed bytes and
64 MiB estimated decoded RGBA bytes per stamp-image load set, and at most 256 distinct textures.
Those proposed session bounds cover the three originals (about 18.9 MB decoded together), while
preventing 4,096 individually legal files from exhausting the browser. Check response MIME/length
and digest, dimensions before GPU admission, and actual bitmap dimensions after decode. Do not
trust `Content-Length` alone; cancel a streaming response when its bound is exceeded. Deduplicate
by content identity rather than by placement count. Exceeding a quota keeps the DOM view usable
and reports omitted artwork; it does not silently widen the quota.

The renderer boundary needs replace/clear semantics for stamp images scoped by `stampDigest`,
plus pinned digest and anchor on image records. It must reject/close incoming bitmaps with a
stale scope, close removed/replaced bitmaps exactly once, destroy their Pixi textures, and clear
drawn stamps immediately on scope invalidation. Name alone is not content identity. Honor the
manifest anchor (`anker / groesse`) in rendering and in visibility/culling bounds rather than
hardcoding `.5`. Alpha compositing and layer order remain normal sprite behavior.

The host aborts outstanding requests on unmount, session/perspective/scope change and access
denial. Every decoded bitmap is either transferred once to the current renderer or closed by
the host; pending decode completion after unmount cannot install a texture. No object URL is
needed for the PNG path; if an SVG fallback uses one, revoke it on success, error and cancellation.
An access denial clears current pixels before retrying projection, matching the existing raster
invalidation behavior even when subsequent polling fails.

### Installation, delivery and native portability boundaries

Server configuration names an explicit project pack root/registered pack set; request input can
choose only an installed id/version and never a directory or arbitrary URL. Wire registration
through `packages/server/src/domain/packs.ts` and host configuration, then route the generator's
selection through that same catalogue. `packages/server/src/http/grundriss.ts` and
`packages/client/src/features/TacticalGenerate.tsx` add validated selection and display its actual
license scope, version and unserved-slot report. A changed selection invalidates the preview;
seed/provenance include the selected pack. Default omission still selects the original CC0 pack.

The installer owns `paket.json`, original PNG copies and the hashed project-use notice. Keep
`assets/generated/painted-dungeon-v1/provenance.json` byte-preserved and reference it from the
notice; a release copy of provenance needs an explicit enumerated packaging location because
the asset gate rejects undeclared extras inside a pack. File integrity is admission evidence,
not authorization: a private registered root must have the intended account/profile boundary,
and project-use assets must not enter public build archives merely because their parser succeeds.

Native map/campaign persistence already carries stamp references in tactical documents. The
current native-v4/v5 profiles declare `source-artifacts-and-tactical-sources`; they do not define
an asset-pack archive/install contract. This first landing preserves references and map state,
and it requires the same pinned pack to be installed at the destination. An importer should
report unresolved required packs and preserve their references; it must neither drop stamps nor
replace them with arbitrary current assets. Packaging PNGs/manifests/licenses in a campaign export,
content-addressed pack dependencies, and reinstalling them across machines require an explicit
native-format revision and distribution-scope decision. Do not call reference-only export fully
self-contained art portability.

### Negative evidence required before contract adoption

- A known stamp appears for the permitted reader, while an unknown stamp, its asset ref/hash and
  transform never appear in the player payload. GM rendering works through the same projected
  field without exposing the GM document. Unanchored decoration stays excluded for players.
- Passage revocation, split/merge successor changes, region removal and actor-perspective change
  remove previously drawn sprites. Denial during an asset load clears earlier pixels even if the
  next projection poll fails; an old load cannot repopulate the new scope.
- Two different hashes under one pack-qualified name replace the texture and change the digest.
  Tampered bytes, incorrect MIME, oversized streams, decompression dimensions, duplicate rows,
  excess textures, unavailable packs and unregistered selections fail within the declared bounds.
- Deferred decode after unmount closes its bitmap. Repeated scope changes and replacement do not
  accumulate textures or object URLs. A blank image batch demonstrably clears prior sprites.
- A noncentral anchor, rotation near a known-region edge and a sprite larger than one cell obey
  placement and visibility bounds. Center anchors show the unchanged table at three by two cells.
- The default schematic pack produces the same pinned default result, explicit selection changes
  preview/seed/provenance, and the stone surface is never selected by repeated-floor queries.
- Native round-trip preserves pack references and reports the missing package at a destination
  without it. Public packaging excludes the project-use pack until a real grant is selected.

These are the bounded review/test targets for the next beat. Root checkpoints the existing
HTBAH/desktop work first, then obtains independent attack/review of this complete contract before
changing the protocol, server projection or renderer seam.

## Scope of the use notice

Live official-source check on 2026-09-06: the OpenAI Europe Terms, updated 2026-01-16, allocate
whatever output rights OpenAI has to the user to the extent law permits and say output may be
non-unique. The Services Agreement, effective 2026-01-01, states the analogous customer terms
in sections 4.1 and 4.4. Neither selects the project's outbound art license. The exact account
contract was not inspected. Sources: [Europe Terms](https://openai.com/policies/eu-terms-of-use/)
and [Services Agreement](https://openai.com/policies/services-agreement/).

The user's request to generate assets for this application is a basis for integrating and using
the resulting assets in the authorized application work. It is not evidence that the user chose
CC0, asserted exclusive human authorship, or authorized an unrelated public art distribution.
`LicenseRef-Atlas-Generated-Project-Use` can name an accurate scoped notice if the router adopts
that scope from the actual user instruction. The notice should state AI generation, original
byte identities, the source generation record, the authorized project use, and that no public
redistribution grant or exclusive authorship claim is being made. Do not identify OpenAI as a
third-party artwork licensor or invent a human rightsholder in `inhaber`/`urheber` to satisfy parsing.

That identifier alone provides no isolation: placing such a pack in the default server root
makes it available through the global authenticated catalogue. A private first landing therefore
also needs an actual private installation boundary and exclusion from public packaging, or the
operator must choose an accurate distribution grant covering the intended recipients.

## Routed next steps and acceptance evidence

1. Root wires the already-green binary regression into its existing asset gate. The source fix
   and tests can land independently of any licensing or renderer choice.
2. Root selects private installation versus distribution using the existing user authorization;
   the asset owner builds canonical `paket.json` plus its actual notice from pinned originals.
   No generic `local-only` filename convention substitutes for admission.
3. Server owner routes pack selection through the existing catalogue instead of a second file
   reader, includes the selected id/version in preview and generated provenance, and retains
   generator seed identity. The existing unserved-slot report stays visible for a props-only pack.
4. Client owner resolves only references present in the projected scene, fetches manifest-owned
   paths with authentication and cancellation, validates bounded image responses, decodes them,
   and calls `setStampImages`. Include the manifest SHA in the request URL/cache key: the present
   endpoint advertises year-long immutable caching on a path without a content hash, so a changed
   ETag alone cannot make an already-fresh browser response revalidate. Dispose stale bitmaps on
   scene/session changes and failed/cancelled loads.
5. Verify PNG serving bytes and content type, inaccessible/unselected packs, unknown and mutated
   files, selected-pack seed/provenance, center/size/layer placement, and alpha against light/dark
   surfaces. A browser test must demonstrate generated table/rubble pixels actually on the map.
   A finite stone patch test must demonstrate no repeated-floor selection.

No install, build, product browser, operative database access, source image modification, pack
registration, release gate or publication was performed in this beat. The next concrete product
move is canonical package admission plus the existing renderer's missing host image delivery.
