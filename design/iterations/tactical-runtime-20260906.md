# Tactical runtime integration — 2026-09-06

This implements the existing Champion outline/canvas sequence and M7; it does not
ratify a new terrain editor, dynamic line of sight, collisions, asset catalogue or
unmeasured hardware performance. The reviewed pure TacticalMapDocument-v1 and UVTT
contracts landed at8457347. SceneDoc-v3 and native campaign v1/v2 remain unchanged.

## Integration review, round1

The initial read-only plan considered reusing communication command storage, an
append-only journal for every tactical transition, and a separate tactical session
start. Review rejected these seams: communication receipts are excluded from native
restore; unlimited positional records exceed the bounded50-step state undo contract;
a second session lifecycle could diverge from gameplay, clock baselines and table chat.

The selected alternative extends existing scenes/game_sessions with immutable map
revisions, scene plans and pinned session snapshots. Snapshot capture runs inside the
existing startScene transaction; an already active scene never resets. No reader,
restore or restart invents a map for a historical session without a snapshot.

## Integration review, round2

Ten additive tables separate exact source evidence, immutable map documents/anchors,
scene plans, live state, minimal durable command receipts and the last50 live patches.
Receipts contain identity/scope, request hash and a minimal acknowledgement, without
the original positions or full request. They prevent old commands from applying twice
after pruning and restore. Current authorization precedes replay; a valid old replay
precedes fresh CAS and active-session checks.

The session stores both its immutable initial snapshot and a rolling undo base.
Pruning applies the oldest patch to the base, advances its sequence/hash and deletes
the patch in the same transaction as live state and the new receipt. The retained
suffix is contiguous and replays exactly to current state. It deliberately cannot
reconstruct the discarded initial-to-base history. Old request hashes cannot be
recomputed after their payload is discarded; a further hash would not recover it.

Review corrected two undo edge cases: compensation points to a durable receipt,
not a deletable transition; subsequent undo compares prior/after values while using
today's forward-moving CAS version, allowing moveA/moveB/undoB/undoA. Only the latest
uncompensated eligible action of an object is offered, and undo itself consumes a
ring position. Knowledge, dice evidence and seals cannot be undone this way.

## Knowledge and raster boundary

One explicitly selected actor perspective feeds the existing held-passage/lineage
logic. Multiple controlled actors do not merge their knowledge. Entry or passage
anchors bind regions; an old split passage requires all active successors before
revealing the whole original region. Unbound geometry is private to the GM. Tokens
must be in a known region and have a known identity or current control. Player
responses omit raw maps, sources, hidden objects and global revision counters.

An immutable session pins its image. Public raster digests therefore bind session,
perspective, dimensions and visible region geometry without exposing an original
source hash as an oracle for hidden pixel changes. Token movement changes the full
projection but does not invalidate an unchanged raster projection. Tile reads check
current authorization before and after image processing.

The server decodes bounded PNG/WebP, replaces unauthorized pixels, materializes that
result, then builds lower-resolution tiles. This ordering needs two pipelines:
Sharp applies resize before composition within one pipeline regardless of call order.
See the [official composite contract](https://sharp.pixelplumbing.com/api-composite/).
The browser never receives a complete secret texture hidden under a visual overlay.
Mask/decoder/cache budgets and pixel-twin tests belong to the raster implementation.

## Format and acceptance

Native v3 validates its complete unchanged core through v2, adds every migration011
column and original source bytes, and excludes reconstructible tiles. Older bundles
require explicit upgrade reports. Its256MiB total UTF8-JSON budget includes escaping
and base64, with64MiB original tactical sources; v2 retains its own original limits.

Three-reader browser checks must cover import, authored region bindings, planned token
positions, scene start, independent Wiki/map visibility, actual protected pixels,
movement/retry/revocation/undo and native restore. Pixi and the accessible outline use
the same commands. Named-hardware S-K1/S-T1 measurements remain distinct from functional
tests and from the pure geometry/raster evidence. Current implementation/test status
belongs in STATUS.md; this document is the adopted implementation contract.

## Review corrections in the integrated implementation

- A tile denial or scope mismatch invalidates already displayed textures immediately; waiting
  for a separate projection poll retains old pixels during a network failure. A real three-browser
  regression revokes knowledge, interrupts only polling, and exercises the actual409 tile route.
- A coarse image texel keeps its full power-of-two world footprint even at an odd-sized image
  edge. The renderer clips the last partial texel to the image boundary instead of stretching the
  entire raster, which displaced geometry over a2561-pixel-wide map.
- Starting a reviewed preparation accepts optional scene/plan version preconditions under the
  same campaign lock used to capture its initial snapshot. Stale input fails before ending the
  previous session; retrying the already-active scene keeps its existing snapshot.
- Durable per-object receipt versions cover each demonstrated version advance even after undo
  patches are pruned. Native validation checks distinct stored versions, not receipt counts;
  duplicate no-op acknowledgements cannot hide a missing original retry receipt.
- Live invalidation hashes the server's tactical projection digest. Applying the smaller
  RulePackage JSON budget to an entire valid tactical document rejected large maps after import.
