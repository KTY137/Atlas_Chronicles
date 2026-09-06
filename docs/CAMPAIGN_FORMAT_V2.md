# Native campaign format v2

Copyright (c) 2026 Atlas Chronicles contributors. SPDX-License-Identifier: MIT

Version 2 is an additive `atlas-chronicles/campaign` profile for application migrations 001–010. It preserves the published version 1 contract and adds the actor/inventory storage introduced by migration 010. It is a GM archive of one campaign, not a reader projection or authentication backup. [CAMPAIGN_RESTORE.md](CAMPAIGN_RESTORE.md) describes local administrator operation.

## Public contract and implementation

- [campaign-schema-v2.ts](../packages/io/src/campaign-schema-v2.ts): fixed table/column metadata, limits and structural JSON Schema.
- [campaign-v2.schema.json](../packages/io/schema/campaign-v2.schema.json): standalone structural schema, URI `urn:atlas-chronicles:campaign:2`.
- [campaign-bundle-v2.ts](../packages/io/src/campaign-bundle-v2.ts): reference parser, canonical serializer, semantic comparison and explicit v1 upgrade.
- [campaign-v2.chronicle](../packages/io/test/fixtures/campaign-v2.chronicle): portable synthetic fixture including original game seals and actor/item data.

The envelope remains a closed object with `format`, `version`, `manifest` and flat `tables`. `version` is exactly `2`. The manifest retains `profile: "complete-campaign"`, `projection: "gm"`, campaign/universe IDs, canonical UTC export time, block-AST and rule-package schema versions `1`, exclusions and source-artifact asset mode. It adds `coreContentHash`; its ten modules retain module version `1`.

The original eight modules and all their table columns are unchanged. A v2 parser extracts exactly that core, calls the unchanged `createCampaignBundle` and `validateCampaignBundle`, and then validates the additions. A v1 parser continues to reject v2 rather than silently discarding new information. Its parser, schema and published fixtures are not rewritten.

| Added module | Fixed tables |
| --- | --- |
| `actors` | `actor_templates`, `actor_template_revisions`, `actor_profiles`, `actor_controllers`, `reader_perspectives` |
| `inventory` | `item_templates`, `item_template_revisions`, `item_instances`, `actor_inventory_events` |

The executable metadata is the exact column allowlist. Unknown envelope fields, tables, columns, operations and embedded definition/card/request fields are rejected. JSON Schema supplies structural checks; the reference parser is additionally required for references, graph/state invariants and hashes. SQL `bigint` columns remain canonical nonnegative decimal strings, including values above JavaScript's safe integer range.

## Hashes and historical meaning

Rows are sorted by primary-key components. New textual keys use UTF-16 code-unit order; revision integers use numeric order. Existing core tables retain the v1 normalizer. `H(value)` below is SHA-256 of the repository's UTF-8 `canonicalJson(value)`, encoded as lowercase hexadecimal; object keys are sorted without locale-dependent comparison.

```text
manifest.contentHash     = H(all normalized v2 tables)
manifest.coreContentHash = unchanged v1 manifest.contentHash
module.sha256            = H({ tableName: normalizedRows, ... } for that module)
module.count             = sum of that module's row counts
```

Export time is outside semantic table equality. The first eight module manifests must equal the v1 core's module manifests. Existing wiki hashes, roll receipts, minted seals, letters, delivery proofs and baseline data keep their original v1 validation and encoding.

Actor/item `content_hash` values use SHA-256 of `stableJson(definition)` from the existing rules implementation. Durable event `request_hash` uses the same encoding over the stored closed envelope `{ campaignId, operation, subjectId, input }`. For creation, the route subject is `null`, while the event's `subject_id` records the generated object. Controller requests also preserve the route's target user inside `input.targetUserId`. Normalized actor-template defaults are checked against the request and its pinned rule package.

Every new row is scoped to the declared campaign. The parser checks user/object references, complete template revision histories and head pins, paired nullable template/provenance fields, item state, command identity uniqueness and historical card/request consistency. `result` equals the event's saved `after_state`. Historical cards are checked against their own immutable pins and request; their mutable names, custody, state and permission flags are not forced to equal today's values. Saved reader choices can outlive a grant or archive change. Current access remains a server authorization decision.

## Explicit v1 upgrade and provenance

`upgradeCampaignBundleV1(source)` validates the original archive and returns `{ bundle, report }`. Algorithm `atlas-chronicles/v1-to-v2/actor-defaults@1` copies every v1 table unchanged and adds:

1. One profile per historical actor. A member's historical default actor is `player_character`; other actors are `unspecified`. Version is `1`; template, lore, archive and creation provenance are `null`.
2. One `control` grant only where the old player membership's `actor_id` and `user_id` both match the actor. Version is `1`; grant provenance and revocation are `null`. Merely sharing `actors.user_id` creates no grant.
3. One reader-perspective row per membership: the historical default actor for players, otherwise `null`; version `1`, update time `null`.

All other new tables are empty. No IDs, old seals or legacy default bindings change. No credentials, runtime data, private GM perspective, synthetic historical event, guessed author or migration-time timestamp is added. The pure implementation is tested against the actual SQL backfill of migration 010.

The separate report contains the algorithm ID, source/target versions, source content hash, target content hash, `sourceBundleHash = H(validated v1 envelope)`, and added row counts. `reportHash = H(report without reportHash)`. Recomputing the pure upgrade from the preserved source verifies the complete report and target. The report is emitted by explicit CLI check/restore and can be retained beside the archive; it is not stored as a historical campaign event or reconstructed on later exports. Hash agreement establishes internal consistency, not trusted authorship.

## Storage boundary

Export and restore inspect the current application schema against the compiled v2 allowlist inside their transaction. Only the existing fixed authentication/delivery/media/schema-migration exclusions and `users.platform_role` are operational exclusions. An unknown base table or extra durable column requires a new format migration; coverage is never disabled to make an export succeed.

Restore requires an empty migration-010 target and explicit `--upgrade-from-v1` for old files. The target receives credential-free user stubs; enrollment remains separate. All inserts, deferred FK validation, v2 semantic reexport comparison and identity sequence restarts commit atomically. History guards stay active. Future tactical storage and any additional SQL modules require an explicit later format version.
