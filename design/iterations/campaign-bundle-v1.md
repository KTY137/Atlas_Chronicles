# Native campaign bundle v1 — implementation proposal and review record

Status: implemented contract, 2026-09-06. **Scoped independent consistency review completed; integrated product gate recorded in STATUS.md.**
This records the concrete bounded implementation of IMPLEMENTATION_PLAN M2/M6;
it does not ratify a new product direction or claim the entire Champion delivered.

The independent review inspected current table coverage, explicit exclusions, legacy baseline absence, original hash formulas, bigint/time units, legitimate external source references and transaction boundaries. It reproduced a same-entry alias rejection after an ordinary A→B→A rename. The validator now accepts that historical self-alias while rejecting a competing identity; the pure roundtrip and real HTTP export regressions pass. Two further in-memory serialize/parse probes retained decimal bigint9007199254740993 and returned an empty semantic diff. The reviewer inspected, but did not rerun, the PostgreSQL tests. The adapter author separately ran5 PGlite and4 real PostgreSQL checks, including concurrent snapshot/membership behavior and explicit administrator enrollment. This is scoped implementation evidence, not a whole-product review.

## Inherited decisions

- [Implementation plan M2](../../docs/IMPLEMENTATION_PLAN.md): versioned schemas,
  reference parser and fixtures, permissive schema license, explicit migration,
  empty semantic roundtrip diff.
- [Product architecture §11.10](../06-giga-product-architecture.md): preview/dry-run,
  atomic import, hashes and manifest, validation before export success.
- [Champion §12.1](CHAMPION.md): lineage, durable rolls, Augenblicke, Vollmachten
  and letters survive export/import.
- Existing `atlas-chronicles/wiki` v1 remains the wiki adapter module. Its meaning
  is unchanged; native persisted revision documents and other game modules cannot
  be losslessly squeezed into it.

## Chosen first native profile

`atlas-chronicles/campaign`, version 1, is one canonical UTF-8 JSON `.chronicle`
file. `manifest.profile=complete-campaign` and `projection=gm` identify a complete
campaign archive, including hidden passages and private durable letters. This
is not a projected player export or distributable Ausgabe package.

The closed `tables` object is a stable storage profile. Every presently persisted
durable column from migrations 001–008 is explicitly enumerated in
`packages/io/src/campaign-schema.ts`, grouped into eight manifest modules.
Table identifiers never come from executable uploaded SQL. Empty collections
are required rather than guessed. SQL bigint values use nonnegative decimal
strings, preserving values beyond JavaScript's safe integer range. Collections
sort by complete primary key; object keys use core canonical serialization.

The manifest records scope, AST/package versions, module counts/hashes, a payload
hash, explicit exclusions and `assetMode=source-artifacts-only`. Envelope export
time is excluded from semantic comparison. Original row IDs, revisions, lineage
sequence values, evidence JSON, timestamps and seals remain unchanged.

The reference parser validates row shapes, campaign scope, ownership references,
historical revision documents, ASTs, lineage/containment, package pins, replayable
action receipts, mint/confirmation seals, source artifacts and frozen letter/
delivery evidence. Historical game hashes retain the original rules `stableJson`
encoding; they are not silently replaced by the envelope's canonical encoder.

Arbitrary original generator/wiki JSON and declarative field maps remain inert
data. The structural JSON Schema publishes those as JSON-valued fields; the
reference parser also checks known nested model/evidence structures and graph
constraints. JSON Schema alone is not a semantic validator. Unknown native
tables/columns/modules, native versions, unsafe keys, duplicate JSON keys and
unsupported active payload kinds fail closed. Limits: 128 MiB UTF-8, one million
rows total, 200,000 rows per table, depth 64, five million JSON nodes.

## Exclusions and authorization boundary

- Authentication: credentials, keys/tokens/hashes, challenges, invitations,
  pending joins, pairing codes, platform privileges.
- Delivery cache: command response caches, events and event cursors. Durable
  command identifiers embedded in actual rolls, Vollmachten, mints and letters
  remain part of those objects.
- Table chat: all `campaign_messages(kind=table)` rows, including expired rows.
  Explicitly authored `kind=letter` campaign messages retain tombstones/threads.
- Media runtime: every media table and media operational audit events.

Users contain only historical `id`, `display_name`, `created_at`. A file never
confers authentication. First restore targets an empty local instance under
administrator control; restored identity records have no credentials, and a
selected historical GM must be enrolled using a fresh local credential. UUID
coincidence is never identity verification. Existing campaigns or identities
cause rejection. No merge, ownership remap, nested ID rewrite or resealing is
performed. An authenticated "import into my existing account" flow needs a
separate explicit identity/access-binding contract before implementation.

## Restore traps that must remain covered

1. `vollmachten` and `action_vollmachten` contain consumed-roll FK cycles. Restore
   requires explicitly deferred constraints, not temporary state rewrites.
2. Session INSERT automatically captures immutable `week_baselines`. The restore
   migration must permit inserting authentic baselines before sessions and let
   the ordinary capture trigger preserve an already present baseline. Never
   disable all history guards or fabricate historical knowledge.
   Sessions predating migration 006 can legitimately have no baseline. The
   administrator restore adapter uses a transaction-local construction marker
   to preserve that absence as well; all UPDATE/DELETE history guards remain
   active, and ordinary session creation still captures its baseline.
3. Baseline lineage sequence cutoffs refer to original global sequence numbers.
   Preserve gaps and large values; advance generators beyond restored maxima.
4. Passage birth revision is not the current content revision. Reimport after a
   mint can leave live metadata different from its incoming revision snapshot.
   Frozen letters likewise must not be compared with today's mutable passages.
5. Letter source hashes cover projected field contents without the rehydrated
   `klauselKandidat` marker. Preserve the original bytes and algorithm.
6. Partial Eron acceptance leaves AST links to unaccepted source candidates.
   These symbolic unresolved links are not broken relational ownership.
   Rename A → B → A can also leave a historical alias matching the same current
   entry's slug. Preserve that self-alias; reject only competing identities.
7. Migration 002 gives old revisions `document={}`, `created_at=0`. This known
   historical absence remains explicit; the parser cannot verify or invent a
   snapshot which was never persisted.

## Completeness and non-retroactivity

The profile includes currently persisted wiki history/provenance/import reports,
actors/sheets/rules, atlas source objects, scenes/sessions, legacy and action
rolls/Vollmachten, mints, clocks, letters/delivery/read state, baselines, durable
messages and durable audit/access incidents. It does not invent absent asset
bytes, actor templates/inventory, tactical tokens or missing author histories.
Those wider product contracts remain in the implementation plan.

The schema and reference fixture are published in the repository under
`packages/io/schema/LICENSE` (MIT). The implementation's meaning is documented
here for review; external publication/ratification has not happened in this
change. Once released, incompatible meanings receive a new explicit profile
version, migration and readable loss report. Version 1 must not be redefined
silently. Existing versions remain readable by their reference parser.

Reference validation:

```powershell
npm.cmd exec -- tsx packages/io/scripts/read-campaign.ts packages/io/test/fixtures/campaign-v1.chronicle
npm.cmd exec -- vitest run packages/io/test/campaign-bundle.test.ts
```

Schema/fixture regeneration (maintainer operation):

```powershell
npm.cmd exec -- tsx packages/io/scripts/generate-campaign-schema.ts
```
