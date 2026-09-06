# Native campaign format v3

Copyright (c) 2026 Atlas Chronicles contributors. SPDX-License-Identifier: MIT

Version 3 adds native tactical sources, immutable maps and anchors, scene plans,
session snapshots, current tokens, a bounded undo suffix and permanent minimal
command receipts to the unchanged version 2 campaign core. It is a complete GM
archive of one campaign. The public v1/v2 parsers, schemas and fixtures stay frozen.
This document accompanies the M7 implementation; operating acceptance is recorded
separately in the repository handoff.

## Envelope and compatibility

The closed envelope remains `{format, version, manifest, tables}` with format
`atlas-chronicles/campaign` and version `3`. Tables remain flat. The reference parser
extracts exactly the fixed v2 tables and validates them with the unchanged v2
implementation before validating the tactical additions. Existing seals, rule
packages, original wiki evidence, actor definitions and inventory receipts retain
their original hash encodings and meaning.

`manifest.coreContentHash` is the validated v2 content hash. The manifest explicitly
identifies core format version 2 and tactical map schema version 1. Its asset mode
is `source-artifacts-and-tactical-sources`: original tactical source bytes are part
of this format, while decoded textures, masked tiles and delivery caches are not.
Existing authentication, runtime chat and media exclusions remain unchanged.

Canonical table and module hashes use the same canonical JSON encoding as earlier
campaign versions. They establish internal consistency, not trusted authorship.
The standalone JSON Schema describes structure; the MIT reference parser also
checks object references, semantic invariants and hashes. Unknown tables, columns,
operations and embedded fields require an explicit format migration.

The public implementation is [campaign-schema-v3.ts](../packages/io/src/campaign-schema-v3.ts),
[campaign-v3.schema.json](../packages/io/schema/campaign-v3.schema.json) (URI
`urn:atlas-chronicles:campaign:3`) and
[campaign-bundle-v3.ts](../packages/io/src/campaign-bundle-v3.ts), with a portable
[synthetic fixture](../packages/io/test/fixtures/campaign-v3.chronicle).

The added `tactical` module, version 1, has exactly these ten fixed tables:

| Purpose | Tables |
| --- | --- |
| Source and immutable map evidence | `tactical_sources`, `tactical_maps`, `tactical_map_revisions`, `tactical_map_anchors` |
| Future scene plan | `scene_tactical_plans`, `scene_token_plans` |
| Session snapshots and current tokens | `session_tactical_states`, `tactical_token_states` |
| Minimal retry evidence and bounded undo | `tactical_command_receipts`, `tactical_transitions` |

The executable metadata is the exact column allowlist. SQL bigint values remain
canonical nonnegative decimal strings. Source text hashes cover the exact UTF-8
text. Map revision hashes cover `{document, anchors}` with anchors sorted by
`targetKind` and `targetId` in UTF-16 code-unit order. Initial/base hashes cover the
closed snapshot `{schemaVersion:1,map:{id,revision,contentHash},tokens,portals}`;
token and portal arrays are sorted by ID. These tactical hashes use recursive
sorted-object JSON with the established scalar encoding, independently of the
smaller RulePackage admission limits. The unchanged v2 core keeps its own rules.

## Sources and byte limits

Original UVTT text is preserved byte-for-byte as UTF-8, including unknown source
fields. Native map documents retain the existing TacticalMapDocumentV1 contract.
Source evidence is stored once; an embedded UVTT image must not also be copied as
a second full image payload merely to build delivery tiles. Restored delivery
artifacts are reconstructed from source evidence and current authorization.
The pure reference parser checks image containers, dimensions and content hashes;
it does not decode pixels or certify image rendering. Current HTTP import and
player tile delivery use the server's separately bounded pixel decoder.

The outer v3 file limit is **256 MiB of actual serialized UTF-8 JSON**, including
escaping, manifest data and any base64 expansion. Each original source is limited
to **64 MiB**. The largest permitted source base64 string is
`4 * ceil(64 MiB / 3)` characters. Individual limits do not promise that every
maximum-sized component fits simultaneously. The unchanged v2 core still enforces
its own 128 MiB envelope, row, node and string limits. No overflow is truncated.

## Plans, current state and bounded retention

Scene plans pin immutable map revisions. Starting a scene copies its plan inside
the existing game-session transaction. Later edits do not rewrite that session's
initial snapshot or current tactical state. Historical sessions without tactical
state remain without it; an import or read does not fabricate an old snapshot.

Each tactical session retains its original initial snapshot, a rolling undo-base
snapshot, current state and at most **50 live transitions**, including compensating
undo operations. Pruning applies the oldest transition to the undo base and removes
that transition in the same transaction. Map and plan requests are not stored in
this ring. Compensation advances object versions; it never erases game seals,
revealed knowledge or the original session snapshot.

Permanent command receipts contain identity/scope, a request fingerprint and a
minimal acknowledgement without historical positions. Pruning an undo transition
does not remove its receipt. Repeating an old accepted command after pruning,
restart or restore therefore acknowledges the original acceptance without applying
the command again. Current authorization is always rechecked.

Retained movement hashes bind
`{campaignId,actorUserId,scopeKind,scopeId,operation,input}`. Normalized movement
inputs include the route `tokenId`, portal inputs include `portalId`, and undo
inputs include `targetCommandId`. Acks contain exactly `{subjectId,version}`.
No-op receipts keep the existing object version and add no transition. For a
retained patch the parser reconstructs and checks that fingerprint. Compensation
targets the permanent receipt, so its original patch may have just left the ring.
For each live token and portal, distinct acknowledgement versions must cover every
advance from version 2 through the current version, including pruned changes.
Repeated no-op acknowledgements cannot fill a missing version. Validation sorts
the stored versions instead of iterating an untrusted declared version range.

The parser verifies the retained suffix from the undo-base snapshot to current
state. It cannot reconstruct discarded movements between the original initial
snapshot and the rolling base, or recompute a discarded request from its hash.
That is the explicit retention boundary, not a claim of complete movement history.

## Explicit upgrade and restore

`upgradeCampaignBundleV2` validates its source and adds ten empty tactical tables.
It preserves every v2 row, ID and seal and produces a separate deterministic
migration report. It does not invent maps, grants, movement history or timestamps.
The report is operational output, not an asserted historical campaign event.

Version 2 input requires `--upgrade-from-v2`. Version 1 input requires the existing
explicit `--upgrade-from-v1` path, now reported as the unchanged v1-to-v2 actor-default
upgrade followed by the v2-to-v3 empty-tactical upgrade. Supplying both flags or a
flag for the wrong source version is rejected. Current v3 input needs neither flag.

Restore remains local-administrator-only into an empty target. Credentials and
platform privileges are not restored; enrollment is a separate explicit operation.
Schema coverage must include every tactical table and column. Foreign keys and
history guards remain active. The importer preserves the original initial snapshot,
rolling base, retained suffix and permanent receipts, then requires an empty v3
semantic reexport diff before committing.

See [CAMPAIGN_RESTORE.md](CAMPAIGN_RESTORE.md) for local commands and their scope.
