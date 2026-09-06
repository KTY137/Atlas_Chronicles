# Native campaign v1

`campaign-v1.schema.json` is the structural JSON Schema for the canonical JSON
`.chronicle` storage profile. It enumerates all native table and column names;
unknown native fields require an explicit format migration.

The reference parser additionally checks campaign scope, ownership graphs,
historical revision digests, source artifacts, declarative rule packages, roll
replay and immutable mint/letter/delivery evidence. A JSON Schema-only pass does
not certify those semantic constraints or grant authentication.

Use the database-free reader:

```powershell
npm.cmd exec -- tsx packages/io/scripts/read-campaign.ts path/to/campaign.chronicle
```

The schema, schema metadata, native campaign reference parser and reference
fixture are offered under the accompanying MIT license. Referenced workspace
packages retain their own license terms. The current implementation proposal
and non-retroactivity commitment are recorded in
`design/iterations/campaign-bundle-v1.md`; scoped independent consistency review
is complete, and external publication remains pending.

The fixture includes a frozen field letter/delivery, a deterministic action roll,
a historical session baseline and a lineage sequence above JavaScript's safe
integer range. It contains synthetic content and no credentials or media state.
