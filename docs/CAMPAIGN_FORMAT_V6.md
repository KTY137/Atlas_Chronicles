# Native campaign v6: nested maps

Version 6 adds the durable map addresses introduced by database migrations 013/014 to the complete campaign archive. Export selects v6 when any retained generator node, entrance or entrance receipt exists. Campaigns without these records retain their v4 or v5 envelope. The explicit v4/v5 readers and their checksums remain unchanged.

The additional `nested-maps` module contains:

| Table | Preserved identity and evidence |
| --- | --- |
| `tactical_map_nodes` | `(map_id, knoten_id)`, campaign and the original generator Knoten payload, including child seeds and coordinate frame |
| `betreten_karten` | `(campaign_id, parent_kind, parent_map_id, knoten_id)`, child tactical map, nullable generation hash, creator and creation time |
| `betreten_command_receipts` | Command, campaign, actor, request hash, exact response and creation time |

Each child map has exactly one entrance parent. Identical region IDs in different parent maps remain distinct addresses. The child keeps its existing tactical sources, revision history, anchors and coordinates; importing never regenerates map geometry or generator nodes. Manually attached maps preserve a null generation hash.

The reference parser validates the complete supported-rules v5 core before checking nesting. It rejects cross-campaign rows, missing historical users, missing child maps, missing atlas nodes, missing current tactical parent regions, conflicting child parents, cycles, mismatched stored node identities and receipts that disagree with their retained entrance. Receipt request hashes remain opaque evidence because the database stores no original request body; this format does not claim independent request replay. Module and complete-content checksums cover every new field.

The server accounts for all migration-014 tables even when exporting an older envelope. Restore requires an explicitly initialized empty migration-014 destination. It writes node metadata and entrances after their atlas/tactical parents, then restores receipts. A final semantic comparison includes all nesting tables and rolls back the entire transaction on differences. Dry-run performs no writes; restored historical users receive no credentials.

Public IO adapters are `createCampaignBundleV6`, `validateCampaignBundleV6`, `parseCampaignBundleV6`, `serializeCampaignBundleV6`, `campaignSemanticDiffV6`, `CAMPAIGN_BUNDLE_V6_JSON_SCHEMA` and the existing `*CurrentCampaignBundle` functions. `currentCampaignTables` supplies an in-memory union with empty nesting arrays for legacy envelopes; it does not rewrite the source archive or its manifest.
