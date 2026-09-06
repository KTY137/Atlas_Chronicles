# Native campaign format V4

V4 adds the seven durable authoring tables from migration `012_authoring.sql` to a
fully validated V3 campaign core. Published V1/V2/V3 parsers, schema files and byte
formats remain unchanged. This is a complete GM archive, not a Public Reader response.

Reference implementation: `packages/io/src/native-v4/index.ts`.
Structural interchange schema: `packages/io/schema/campaign-v4.schema.json`.
The schema is MIT-licensed like the preceding native format schemas. The reference
parser additionally verifies references, hashes, immutable sources and command replay;
JSON Schema validation alone does not admit a campaign for restoration.

## Envelope and upgrade

The envelope remains `{format,version,manifest,tables}` with
`format:"atlas-chronicles/campaign"` and `version:4`. All records are closed. The
manifest uses `coreFormatVersion:3`, `tacticalMapSchemaVersion:1`,
`themeSchemaVersion:1`, `authoringSchemaVersion:1` and
`assetMode:"source-artifacts-and-tactical-sources"`.

`coreContentHash` is the content hash of the complete reconstructed V3 core; that core
is passed through its unchanged parser, including the V2/V1 nested checks. Existing
module definitions remain fixed. The final new module is `authoring`, version 1.
Module counts/hashes cover their exact table subsets, and `contentHash` covers all
V4 tables. Canonical encoding and SHA256 follow the existing native core encoding.
Rows are sorted by their declared primary keys, using numeric comparison for SQL
integers and UTF-16 lexical comparison for strings, independent of host locale.
SQL bigint values remain nonnegative canonical decimal strings, bounded by signed
SQL bigint; millisecond timestamps are never reinterpreted as seconds.

`upgradeCampaignBundleV3(input)` is explicit and returns `{bundle,report}`. Its
algorithm is `atlas-chronicles/v3-to-v4/empty-authoring@1`; it adds seven empty tables
and records source/target content hashes, the source bundle hash, added row counts
and a report hash. It does not infer themes, publication pins, aliases or authoring
history. An old `entries.public=true` bit remains preserved but cannot open a public
article without the new explicit world policy and revision pin.

The outer budget stays 256 MiB with V3's aggregate row/node/depth limits. An individual
authoring request is at most 512 KiB. A theme's input/canonical manifest remains at
most 64 KiB under the pure theme parser. These are simultaneous limits, not additive
allowances. The small theme canonicalizer is not used to encode the entire campaign.

## Durable table coverage

| Table | Primary key and meaning |
| --- | --- |
| `theme_presets` | `id`; campaign, head revision/version and original creator/time |
| `theme_preset_revisions` | `(theme_id,revision)`; immutable manifest, content hash, deterministic accessibility report, campaign and creator/time |
| `campaign_theme_pins` | `campaign_id`; private campaign pin to one immutable theme revision, CAS version and updater/time |
| `campaign_publications` | `campaign_id`; immutable public key, explicit enabled flag, public world name/slug/description/language/warnings, separate nullable theme pin, CAS version and updater/time |
| `entry_publications` | `entry_id`; campaign, immutable source revision, selected PIDs, public slug, pinned public metadata, independent publication version and publisher/time; enabled state remains the core `entries.public` bit |
| `publication_routes` | `(campaign_id,kind,route)`; direct world/article aliases or canonical local legacy path with a proven source URL and creator/time |
| `authoring_events` | `command_id`; campaign, historic user, operation/subject, full normalized request and request hash, before/after state, minimal original ack and timestamp |

`CAMPAIGN_V4_TABLES` exposes every column, SQL bigint/JSON column classification and
restore ordering metadata. Runtime table coverage must reject any unrecognized durable
column/table until an explicit format revision covers it. Foreign campaign references,
missing identities, incomplete theme pins, duplicate keys and orphan rows are rejected.
Historical author identities are retained even if they no longer hold current membership;
the archive does not invent a proof of historic GM authority from today's roster.

## Theme evidence

Each theme revision passes the pure closed `ThemeManifestV1` parser and the contrast
admission report. The stored report is exactly
`{...evaluateThemeAccessibility(manifest),manifestHash:SHA256(canonical(manifest))}`.
Both this hash and `content_hash` are recomputed, as are all pair ratios, thresholds,
failure IDs and the result. Reports are not trusted because their outer bundle hashes
were recomputed. The report remains evidence about declared opaque token pairs; it is
not certification of rendered CSS, keyboard or assistive-technology behavior.

Every theme head has contiguous immutable revisions and matching create/revise events.
Private campaign pins and explicit public pins may legitimately refer to older revisions.
A missing public pin uses the fixed shipped Public Reader default in delivery, never a
private campaign pin. Local contrast/motion/font/density/art preferences are browser
state and intentionally absent from all campaign records.

## Full authoring request and replay contract

Every request hash binds this exact closed preimage:

```json
{"campaignId":"…","actorUserId":"…","operation":"…","subjectId":"…","input":{"commandId":"…"}}
```

`subjectId` in a `theme.create` request is `null` because the server allocates the theme
identity. The event's subject and ack contain that allocated identity. Theme revisions
target the theme, entry commands target their entry, and pin/policy/route commands target
the campaign. Route kind/path and target are inside the request, so a reused command ID
cannot acknowledge a different route. Input keys are operation-specific and closed.

| Operation | Historical before/after state and CAS |
| --- | --- |
| `theme.create` / `theme.revise` | Full ThemeCard; create has null before, then contiguous revision/version; revise binds `expectedVersion` |
| `theme.pin` | Null or `{themeId,revision,version}`; independent contiguous pin version |
| `publication.configure` | Null or full PublicationPolicy; preserves allocated public key, binds policy version; rename also preserves a direct old-world alias |
| `entry.publish` | Null or full EntryPublication; binds article revision, publication version and policy version separately; pins selected PIDs and derived metadata; rename preserves a direct old-article alias |
| `entry.unpublish` | Existing publication; preserves source selection/metadata/slug and sets enabled false while incrementing publication version |
| `route.add` / `route.remove` | Null or route fields plus policy `version` and `removed`; remove keeps an immutable tombstone in its event; both advance the world's policy version |

The ack is exactly `{subjectId,version}` and must equal the accepted after-state version.
Request preimages, the original command IDs, complete before/after values and source
records must agree. Current states are reconstructed from the full event history;
removing an intermediate event fails even after recomputing every container hash.

Replay orders versioned aggregates, not timestamps: clocks can tie. Policy configure and
route operations form one contiguous policy sequence. Entry commands are evaluated in
their declared policy interval and contiguous per-entry publication order. This retains
legitimate multiple publications between two policy changes and old retries after later
edits. Historical article revisions are not compared to the current article head.
Automatic rename aliases and explicit route deletions/additions are replayed together,
then checked against the complete current route table. Route uniqueness/normalization
and source provenance apply to historical commands as well as current rows.

## Public source metadata and delivery boundary

Selected PIDs must belong to the pinned immutable revision. Imported attribution is
restricted to passages belonging to the explicitly accepted article, even when its preview
artifact contains other articles. For each selected original PID or lineage ancestor, the
last accepted source assertion in article revision order wins, up to and including the
pinned publication revision. An explicit complete reacceptance can therefore repair an
earlier incomplete assertion while retaining both artifacts. A later private complete or
incomplete import cannot rewrite older publication evidence. Mint IDs must point to the same
article and a selected passage with the same published content, from a revision no newer
than the publication. Public UTC dates/kinds are recomputed from immutable mint records.
Invented authors, omitted required source attribution, private replacement content and
fabricated mint dates do not survive a rehashed bundle.

Legacy aliases are canonical local `/wiki/…` or `/<locale>/wiki/…` paths. A locale is two
ASCII letters with an optional hyphen and two more letters; it is normalized to lowercase.
The language prefix remains part of the globally reserved route: `/de/wiki/…` and
`/en/wiki/…` are distinct. Paths are decoded once, NFC normalized and individually escaped
by path component, preserving article-name case. Their HTTP(S) source URLs must have the
same normalized path and match that article's accepted import evidence;
credentials, query strings, fragments, traversal and unproven redirect targets are rejected.
The destination database additionally reserves legacy paths across the entire host.
A campaign archive cannot install a redirect on an external source host.

V4 preserves editorial publication decisions. It does not enable a new host's public
delivery switch, restore browser accessibility preferences, import credentials, or ship
derived search/SEO/card caches. Those local boundaries are intentional. Delivery still
uses the common anonymous public projector and configured local origin. The archive's
full GM data must never be sent to public consumers as a projection shortcut.

## Verification and reproducibility

`packages/io/test/campaign-bundle-v4.test.ts` builds its fixture through the real migrated
authoring/document/import/mint domains, covers every SQL012 column, verifies all eight
operations and performs file roundtrips. Negative fixtures recompute V4 content/core/module
hashes after modifying requests, acks, reports, pins, source metadata, history or routes;
the reference parser still rejects them.

`packages/io/test/campaign-v4-sources.test.ts` additionally exercises real language-prefixed
imports, incomplete-to-complete assertion repair, historical cuts after later incomplete
imports, and coherently rehashed cross-article source theft, language changes and metadata
substitution. The independently owned review regression corroborates the cross-article
case without sharing its fixture construction.

Regenerate only V4's structural schema with
`npx --no-install tsx packages/io/test/generate-campaign-v4-schema.ts`.
The schema test compares the checked-in artifact to its generated definition. Existing
V1/V2/V3 interchange artifacts are not regenerated by this command. Server tests separately
prove isolated restore/reopen/retry behavior and current authority checks.
