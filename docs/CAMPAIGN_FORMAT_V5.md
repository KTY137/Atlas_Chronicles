# Native campaign format V5

V5 explicitly admits both rule package generations and their receipts while retaining every
V4 campaign table. It is a complete GM archive, including historic actors, tactical state and
authoring evidence. It does not contain login credentials, invitation secrets or browser cookies.

Reference parser: `packages/io/src/native-v5/index.ts`.
Structural schema: `packages/io/schema/campaign-v5.schema.json`.
As with older formats, JSON Schema alone does not verify campaign integrity or admit a restore.

## Version and compatibility

The closed envelope remains `{format,version,manifest,tables}` with
`format: "atlas-chronicles/campaign"`, `version: 5`. The manifest declares
`rulePackageSchemaVersion: 2`, `ruleProfile: "rules-v1-v2@1"` and `coreTableVersion: 3`.
The last field describes the inherited table layout; a v2-rule campaign is never disguised
as a legacy V3 core envelope. All existing tactical/theme/authoring version metadata and
module integrity checks remain covered. Limits retain V4's256MiB aggregate budget.

`createCurrentCampaignBundle` chooses V5 if any installed package or receipt uses schema2,
including an inactive installed package. Otherwise it produces V4. The supported runtime
entry points are `validateCurrentCampaignBundle`, `parseCurrentCampaignBundle`,
`serializeCurrentCampaignBundle` and `currentCampaignSemanticDiff`.

`upgradeCampaignBundleV4` is explicit. It changes the envelope and manifest, preserves all
table bytes and their content hash, and reports source/target bundle hashes with an empty
changed-table list. HTTP export, the desktop host and the bundle CLI use the supported
dispatch. The CLI's `--upgrade-from-v4` is opt-in, as are the earlier-format upgrade flags.
Published V1–V4 constructors/parsers and schema files retain their original behavior.

## Rule and evidence validation

The parser validates both package versions, registered self-tests, all actor-definition
revisions, character/inventory fields and unconsumed Vollmachten against the exact package pin.
Schema2 cross-field constraints apply to each persisted state. Schema2 receipts carry the
SHA256 of the full parsed package in canonical encoding, including source attribution,
unused computed expressions and array order. Replay verifies the primary roll, outcome
classification, all recorded comparisons and operation budgets.

Mint evidence is reciprocal in the current runtime: every roll-backed mint must match a
successfully confirmed roll, and every confirmed roll's mint must match its complete stored
evidence. Rehashing an orphan mint from a failed or unconfirmed roll cannot make it valid.
The current V4 path and explicit older-format upgrades perform this extra admission check
before restore, while frozen legacy public parsers retain their published contract.

Server replay, preparation retries and confirmation additionally bind the receipt's package,
action and actor to the stored row before trusting a cached acknowledgement or mutating data.
This is content integrity; the archive does not invent historic author authority from the
present roster or authenticate an external package author solely from a checksum.

## Verification scope

Pure native tests cover V5 creation, exact schema generation, explicit V4 upgrade, historic
actors, classified receipts, unsupported versions, altered package content and invalid mint
evidence. The independent integrity review has seven passing regressions across IO/server.
A real-PostgreSQL mixed V1/V2 roundtrip preserves actor history, HP/Geistesblitze, receipts,
unused capabilities and inactive packages, restores into an empty target and yields no
semantic difference on re-export. Browser HTBAH coverage verifies the HTTP V5 export and
receipt replay after reopening the server. These are scoped working-tree checks; an exact
committed-tree gate is recorded separately when the integrated checkpoint is made.
