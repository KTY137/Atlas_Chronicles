# Independent painted-pack contract review

Date: 2026-09-06. Reviewer: codex-root/painted_pack_review. Root confirmed the coordination
claim for this new file. Reviewed `painted-pack-20260906.md` against the current source at a
working-tree snapshot whose observed HEAD was `3225907`; later parallel commits may exist.
This is a source/contract review, not an executed test report. No production edits, install,
build, browser, database access, pack registration or publication occurred.

## Verdict and route

**ITERATE, then implement the complete generated-art path.** The selected project-use route is
authorized by the user's request. No further public redistribution permission is needed to
integrate their own generated pixels into their authorized application. Preserve the original
PNGs, the separate six-field `TacticalEntity`, the server's knowledge decision, and the existing
network-free renderer boundary. The binary asset-gate fix can land independently.

The proposed contract identifies most lifecycle hazards correctly, but leaves binding decisions
open in the irreversible layer: durable asset identity, the actual private access boundary,
player visibility of generated decoration, and self-contained native portability. Resolve the
following findings in the lineage before their corresponding implementation lands. The route
below completes the product; a pack selector plus invisible stamps or a diagnostic preview is
not acceptance.

## PP-R1 — HIGH: the existing asset route cannot provide private, revocable delivery

**Evidence.** `packages/server/src/http/packs.ts:24` constructs its own global catalogue. Every
route only authenticates an identity. At lines 54–56 a matching ETag bypasses byte verification,
and successful asset responses advertise `public, max-age=31536000, immutable`. The proposed
contract adds a digest to the request URL but does not bind that digest, session or perspective
to the server route. A new private filesystem root does not change these authorization rules.

**Concrete break.** A second authenticated account can enumerate and fetch a newly installed
project pack unless the handler changes. A browser or shared cache can reuse a previously
successful response without invoking the authorization check at all. After a passage or pack
grant is withdrawn, the generic route still has no session/placement decision to reject.
Adding `?sha256=oldHash` also permits today's bytes to be returned under yesterday's asserted
content identity unless the server compares the requested identity itself.

**Binding correction.**

- Construct one configured pack service at the app boundary and inject it into catalogue,
  generator and tactical delivery. A request selects a registered id/version/hash; it never
  selects a filesystem root. Bind project registrations to an explicit account/profile and
  campaign use scope. The user's authorized project installation supplies that registration;
  this is an implementation boundary, not a new permission ceremony.
- Filter project catalogue/manifest access by that scope. A pack's generic artwork is not
  evidence that any particular placement exists. If players need only board artwork, return
  their selected descriptors through the tactical projection, not a complete private manifest.
- Serve projected artwork through a tactical-scoped handler, for example
  `GET /api/campaigns/:campaignId/sessions/:sessionId/tactical/assets/:descriptorId?view=:stampDigest`.
  The handler reuses `project` and the manifest-owned byte resolver, requires the current
  `stampDigest`, and resolves `descriptorId` only among that view's selected descriptors. A GM
  preparation equivalent authorizes the map revision. These are thin delivery adapters, not
  duplicate pack parsers or a second visibility algorithm.
- Use `Cache-Control: private, no-store` for this project-use delivery and host fetch
  `cache: "no-store"`. Keep a bounded, scope-owned in-memory cache only. Recheck permission
  and scope after any asynchronous read/decode work before sending; match the raster route's
  pre/post authorization discipline. Refusal and conditional responses need the same policy.
  If a separately public immutable route remains for CC0 packs, it must enforce the requested
  content hash/version before either 200 or 304; a changed ETag alone is not cache invalidation.

**Required negative evidence.** Account B cannot list/manifest/read account A's project pack;
revoked membership and old stamp scopes cannot fetch or obtain a 304; wrong descriptor/hash
cannot return current bytes; denial during loading clears painted pixels even when the next
projection poll fails. Previously delivered bytes cannot be made unknown to their recipient;
the enforceable guarantees are future delivery denial and removal from the active board.

## PP-R2 — HIGH: projected descriptors do not pin a saved map's original artwork

**Evidence.** Tactical stamps persist only `a: "pack/name"` and transforms. At
`packages/server/src/domain/tactical.ts:176` and `:206`, map content hashes cover document and
anchors, without an asset dependency lock. `domain/grundriss.ts:128` stores ordinary generator
provenance, not a manifest snapshot. `domain/packs.ts:82` keys installed entries by pack id only;
a second directory with the same id silently replaces the first. The proposed descriptor
includes a current version/hash, but never says where the original version/hash survives.

**Concrete break.** Generate and save a table under pack 1.0.0; replace the installed pack with
1.1.0; reopen the same map revision. Resolving `pk.painted-dungeon/wooden-table` now chooses
1.1.0. A new `stampDigest` makes the change visible to caches, but does not preserve the map's
identity or make its old art reproducible. A seed hash cannot reconstruct the missing manifest.

**Binding correction.** Persist an immutable asset dependency lock in the canonical map
revision contract, covered by its content hash and session snapshot identity. For each used
pack, retain id, version, canonical manifest hash and snapshot; snapshot rows retain file hash,
MIME, length, intrinsic size, anchor, pitch, and license text identity. A placement's pack/name
resolves only through that revision's lock. Store historical content-addressed bytes alongside
that admitted package identity. Unavailable historical content is an explicit unresolved
dependency, never a fallback to the latest install.

The configured catalogue must distinguish id/version/manifest hash, reject conflicting
registrations of the same immutable identity, and never depend on directory enumeration order.
The generator uses the exact selected manifest; pack identity/hash belongs in the options and
provenance it saves. Changing a map's artwork requires a deliberate new map revision. Older
native maps without a lock stay explicitly unresolved until their references are resolved into
a new revision; importing them must not claim that today's installation was their original art.

**Required negative evidence.** Save, close, upgrade the installed pack and reopen the old
revision: the exact original three PNG hashes remain selected. A new revision may select new
hashes under the same names. Duplicate id/version with different manifest content is rejected;
missing old bytes preserve unresolved references. A same-name replacement must not rely only
on invalidating the renderer's cache.

## PP-R3 — HIGH: reference-only export does not complete the requested native portability

**Evidence.** The design at lines 235–244 explicitly postpones asset bytes and requires a pack
already installed at the destination. `packages/io/src/native-v5/bundle.ts:70` still declares
`source-artifacts-and-tactical-sources`; its closed envelope has no pack dependency or asset
blob section. The current profile preserves tactical source documents, not their referenced
PNG files. This limitation is honestly stated, but it is an unfinished part of the full scope.

**Binding correction.** Keep an ordered native-format implementation beat in this work. Add an
explicit new native campaign profile/version carrying the map-revision locks from PP-R2 and a
deduplicated content-addressed blob table for the original PNGs, exact manifest bytes, hashed
project-use/license notices and byte-preserved generation provenance. Include these in the
archive checksums and size/row accounting. Validate all entries and cross-references before
admitting a restore; reject missing bytes, hash mismatches, path traversal, duplicate conflicting
identities and archive size expansion. Restore installs into the destination's campaign-scoped
asset store through the canonical admission service, with rollback on failed campaign restore.
It must not overwrite an unrelated global installation or import credentials/profile grants.

The user moving their own campaign and generated artwork between their own installations is
within the authorized project-use route. That does not require choosing CC0 or a public art
grant. The notice travels with the bytes. For external packs that genuinely prohibit an export,
report an explicit unresolved/excluded dependency and do not label that export self-contained.

**Required acceptance.** Export the generated painted map and campaign, then restore into an
empty authorized destination with no preinstalled painted pack and no network asset source.
The same table/rubble pixels render from the restored exact bytes. Missing/corrupted blob and
conflicting-pack cases fail before a partial campaign or pack installation becomes visible.

## PP-R4 — HIGH: the selected player policy leaves generated artwork without a product path

**Evidence.** The design at lines 167–171 permits only individually bound stamps and defers
unanchored decoration. `packages/forge/src/kartenwerk.ts:267` emits plain decorative stamps;
`domain/grundriss.ts` passes no anchors into `tactical.importMap`. A known room region therefore
does not reveal its generated table/rubble, even after host loading is implemented. Conversely,
making every unanchored stamp public by region would reinterpret existing private data.

**Binding correction.** Adopt a persisted, explicit placement visibility mode in the canonical
map revision annotation contract: `private`, `anchor`, or `region-decoration` with a declared
region id. Legacy/unclassified unanchored placements default to `private`. The generator marks
ordinary floor/furniture placements as decoration of their actual containing room; placements
without a valid home region remain private. GM preparation exposes the mode and can bind
semantic objects to existing entry/passage anchors through the existing editor.

The server evaluates exactly one mode. `anchor` requires the existing held/active/successor
decision AND a known region; it never falls back to region decoration when a passage is
unknown, revoked or split. Creating an explicit passage binding changes the placement to
`anchor`. Removing that binding leaves it private until the GM deliberately selects decoration
again, so unbinding cannot silently disclose a secret. `region-decoration` requires knowledge
of its declared region and the footprint check below; it emits artwork only, without adding
fake semantic entities or entry labels. No browser reads the GM document to manufacture this.

For the first implementation, choose the proposed conservative **full transformed footprint
must be authorized** alternative. Use the actual intrinsic rectangle around the manifest anchor,
apply rotation/scale/translation, and require it to be contained in the authorized region union;
omit otherwise. A tested conservative AABB containment check against a single known polygon is
acceptable, with explicit omission reporting to the GM. Testing four corners alone is not
sufficient for concave regions: an edge/interior can cross unknown space. Do not call viewport
culling or a client-only mask an authorization check.

**Required negative evidence.** A generated table in a known room appears for a player without
invented lore records; an explicitly passage-bound table in the same known room remains absent
until every active successor is held. An old unclassified imported stamp remains private.
Revocation, anchor removal, region removal and successor split/merge clear the actual pixels.
Test a rotated table across a concave boundary and a room edge using its full transparent canvas
extent, not its center or its reserved cell footprint.

## PP-R5 — HIGH: original dimensions invalidate the current culling assumption

**Evidence.** `packages/render/src/stapel.ts:32` assumes every image is 64 by 64 pixels and uses
that radius at `:97`; its comment that this can only over-include is false for these originals.
`renderer.ts:186` hardcodes a center anchor. The generator correctly uses
`mapCellPitch / packCellPitch` at `kartenwerk.ts:266`, but placement at `:271` is the reserved
cell rectangle's center, regardless of a noncentral manifest anchor.

**Concrete counterexample, derived from source.** The 1536 by 1024 table at a 64-pixel map pitch
and 512-pixel authoring pitch uses `s = 0.125`, so its canvas is 192 by 128 map pixels, or three
by two map cells. At camera scale 4, its screen half-width is 384 pixels. Put its center at
screen x = -300: 84 pixels of the table remain visible. Even the renderer's 256-pixel padded
window rejects it, because the hardcoded cull radius is only about 22.63 screen pixels and
`-300 + 256 + 22.63 < 0`.

**Binding correction.** Feed validated intrinsic size and anchor into the CPU culling boundary;
use transformed corners/AABBs or a conservative anchor-relative radius from all four actual
corners. The CPU planner remains browser-pure and needs no Pixi/network import. Use the same
geometry for culling, bounds checks and server authorization. Render `anker / groesse` without
clamping legal noncentral/outside anchors to the center. Keep `s = mapPitch / packPitch`; do
not resize PNG bytes or merge them into the 64-pitch default pack.

For generated placement, center the intrinsic canvas in the reserved footprint, then place the
declared anchor at `canvasCenter + R(anchor - intrinsicCenter) * s`. This preserves all current
center-anchor placements while preventing a noncentral anchor from shifting art outside the
reserved cells. Rotation-aware placement must likewise reserve an adequate footprint or refuse
that placement. `einheiten` is allocation metadata, not the rendered image dimensions.

**Required evidence.** The exact table is three by two cells; rubble/stone retain their actual
1254/512 canvas scale inside their three-by-three reservations. Verify the zoomed culling
counterexample, a noncentral anchor and a rotated boundary case. Prove the original stone never
enters repeated-floor selection, including when the editable `gangboden` query requests one of
its tags: enforce `kachelbar` in the repeated-floor selector, not solely a naming convention.

## PP-R6 — MEDIUM: image ownership needs one atomic resource-admission definition

**Evidence.** The current `renderer.ts:250` setter adds/replaces by name, does not call
`ensureAlive`, and leaves all old entries after an empty batch. The design properly asks for
scope replacement and quotas, but the exact ownership point and how concurrent/stale loads
share the budget remain open. An implementation can pass each individual 64 MiB decode check
while retaining the prior 64 MiB batch plus several pending replacements.

**Binding correction.** Define `setStampImages(scope, batch)` as a complete replacement with
renderer ownership of every submitted bitmap on all outcomes. A stale/destroyed/invalid batch
closes its unique bitmaps exactly once and never installs any member; reject duplicate bitmap
objects/descriptors before mutating current textures. Validate and create the replacement set
atomically with cleanup on a mid-batch failure. Scope changes synchronously detach sprites and
release old textures/bitmaps; an empty valid batch does the same. The host never closes a bitmap
after transfer. De-duplicate GPU content by raw hash plus decode interpretation, while keeping
placement anchor metadata per descriptor: identical PNG bytes can have different anchors.

Account compressed, decoded and in-flight reservations across the entire active canvas load,
including replacement batches. Abort/cancel bounded response readers on the first failed
request. Verify dimensions from trusted-format headers before full decode, actual dimensions
after decode, and allow no unchecked redirect or external SVG resource fetch. After auth denial,
scope change or unmount, a pending decode closes its result and cannot resurrect pixels.

**Required evidence.** Blank replacement, duplicate bitmap objects, deferred decode after
unmount, failure after one accepted image, request cancellation, rapid alternating scopes and
same bytes under different anchors leave no stale pixels or accumulated textures. HTTP/body
size, decoded dimensions and aggregate quotas fail within their declared bounds while DOM
commands remain usable. No new testing framework is needed.

## PP-R7 — MEDIUM: a hashed notice must be validated on the actual private admission path

**Evidence.** `createPacks` parses manifest text and verifies an asset when read, but never
verifies the declared license text snapshot. Its existing fixture even admits a deliberately
dummy notice hash. A gate that only scans the default repository pack directory will not
validate a separately configured private root. Filename containment is lexical and does not
define installer symlink/reparse-point behavior.

**Binding correction.** The private installer/admission service validates exact original file
lengths/hashes, canonical manifest identity, required notice bytes/hash, dimensions/MIME,
enumerated provenance location and allowed file set before registration. Reject reparse-point
or symlink escapes using real filesystem containment, reject duplicate immutable identities,
and keep reads bounded even if a registered file changes between stat and read. The notice
uses `LicenseRef-Atlas-Generated-Project-Use`, accurately identifies AI generation and the
existing project-use instruction, and travels with campaign-owned copies. Do not copy the
default pack's CC0 declaration, invent exclusive human authorship, or name the model provider
as an artwork licensor to satisfy required strings. Descriptive generator attribution and a
qualified project-use statement are preferable to an invented rightsholder.

This review does not revisit legal conclusions or select a public distribution grant. It asks
that the actual admitted bytes match the already selected notice and that build packaging uses
an explicit public-pack allowlist rather than recursively including the configured private root.

## Ordered landing and product acceptance

1. Adopt PP-R1–R5 in the design lineage; root assigns the canonical revision/dependency and
   visibility contract, configured pack admission/delivery, generator selection, renderer and
   host seams to their owners. Preserve the default schematic generator's pinned regression.
2. Package the exact originals and provenance with the scoped notice; admit them through the
   configured service. Implement selection, durable locks, projected descriptors and explicit
   decoration visibility, then bounded host delivery and correct image placement/lifetimes.
3. Exercise the real generator UI with a deterministic scenario that places both table and
   rubble; enter preparation, save/reopen, start a scene, and inspect the actual generated PNG
   pixels for the GM and permitted player. Check alpha on light and dark surfaces. Keep the
   incomplete-theme report visible for the props-only pack; the stone is a finite optional
   patch, never a repeated floor.
4. Complete the native asset-bearing format beat and restore into an empty private destination.
   Run focused adversarial regressions and the required project gates, followed by real browser
   evidence for revocation and stale-load prevention. A screenshot from a forge spike or a
   `setStampImages` unit test does not demonstrate the product's end-to-end flow.

The accepted direction is implementable without another user approval round: pin the bytes,
bind their delivery and visibility to the existing campaign decision, and carry those same
bytes through the map's native round trip.
