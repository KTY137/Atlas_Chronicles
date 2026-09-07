# Native campaign v8: access incidents

Version 8 adds the Zugangsvorfall introduced by database migration 018 to the complete campaign archive. Export selects v8 when any access incident exists. Campaigns where nobody was ever locked out retain their v4, v5, v6 or v7 envelope. The explicit readers for those versions and their checksums remain unchanged.

`CHAMPION.md:372-376` defines the record: the server logs an event whenever a device presents no or expired credential against a character holding an open Vollmacht. Gate W1 uses it to attribute a red gate to one cause, lockout, instead of two indistinguishable ones, lockout or disengagement. `design/08-backend-architektur.md` §3 listed the incident among the invariants the code carries; until migration 018 it was carried by the schema and the documentation only.

The additional `zugang` module contains:

| Table | Preserved identity and evidence |
| --- | --- |
| `zugangsvorfaelle` | `id`, campaign, the locked-out user, exactly one door — either `dokument_vollmacht_id` or `aktions_vollmacht_id` — and the time of the incident |

## Why a new table rather than a widened `access_incidents`

`access_incidents` from migration 001 cannot carry this record, and the reason is structural rather than historical. Its foreign key points at `vollmachten`, and production code never inserts there: the only `INSERT` in the repository is a legacy fixture in `packages/server/test/bundles.test.ts`. Real doors are `action_vollmachten` (`domain/gameplay.ts`), and `domain/documents.ts` merely unions both when reading. A write path honouring that key could never fire in operation, and would leave the invariant looking satisfied while it is not.

Widening it was rejected for a second reason. The generations are additive by construction — v7 hands its v6 tables to v6, which rejects any extra column strictly — so reshaping a table that already sits in the v1 profile fights the design instead of following it. `access_incidents` therefore remains in the v1 profile exactly as it was: empty in practice, and untouched.

The door is two nullable columns rather than one column plus a text discriminator. On a new table this keeps a real foreign key for each kind, so "exactly one door, and it exists" is a checked statement rather than an agreement.

## What the reference parser validates

The parser validates the complete v7 core before checking incidents. It then rejects, per row: a campaign other than the exported one; a row naming both doors or neither; a document Vollmacht or action Vollmacht the bundle does not contain; and a subject who is not a member of this campaign. A proof pointing at a door that is absent from the same archive is not a proof, and an incident about someone who never sat at the table moves gate W1's denominator in the wrong direction.

The database holds the same statements independently: a `CHECK` constraint for exactly one door, a foreign key per kind, and two partial unique indexes that keep one incident per door per person. A device with a dead credential asks in a loop; the gate needs "had an open incident", not how many.

Module and complete-content checksums cover every new field.

## Server and restore

The server accounts for the migration-018 table even when exporting an older envelope. Restore writes incidents after both Vollmacht tables and after memberships, because a row points into all three; later formats have since appended their own tables behind it. Campaign deletion removes them first, as a leaf nothing points back at (`domain/deletion.ts`). The record is append-only under the same trigger as `audit`: `UPDATE` is refused without exception, and `DELETE` only inside an authorised campaign deletion (see migration 017).

Dry-run performs no writes; restored historical users receive no credentials.

## Public IO adapters

`createCampaignBundleV8`, `validateCampaignBundleV8`, `parseCampaignBundleV8`, `serializeCampaignBundleV8`, `campaignSemanticDiffV8`, `CAMPAIGN_BUNDLE_V8_JSON_SCHEMA` and the existing `*CurrentCampaignBundle` functions. `currentCampaignTables` supplies an in-memory union with an empty incident array for legacy envelopes; it does not rewrite the source archive or its manifest.

## Known limit, inherited

A bundle is capped at 256 MiB and wiki images have travelled inside it since v7. A campaign holding more than that cannot be exported at all, which is a standing contradiction with the 5 GB of storage the product sells — see `design/10-hosted-betrieb-und-auslieferung.md` §1.10. Nothing in v8 changes that, and the incidents themselves add negligible bytes.
