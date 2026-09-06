# Native campaign export and restore

The current version 4 `atlas-chronicles/campaign` file preserves one GM campaign and the unchanged v2 wiki, rules, gameplay, week, communication and actor/inventory evidence. The inherited v3 core contains original tactical sources, immutable map revisions and article/passage anchors, scene plans, initial and rolling session snapshots, current tokens, at most 50 retained live transitions per session and permanent minimal retry acknowledgements. Version 4 adds immutable themes, explicit publication snapshots, source mappings and complete authoring command history. The authenticated export reads one PostgreSQL repeatable-read snapshot and holds a shared lock on the requesting GM's membership until collection completes. Ordinary document writers remain free to commit; their later changes cannot mix into that snapshot. The [v4 format contract](CAMPAIGN_FORMAT_V4.md), JSON Schema and reference parser are MIT-licensed; the published v1/v2/v3 parsers, schemas and fixtures remain unchanged.

Authentication credentials, invitations, pairing codes, transport caches, temporary table chat and all media runtime state are excluded. Source artifacts retain their original Eron/Azgaar evidence; remotely referenced media files are not downloaded. V3 includes the original tactical UVTT text and its embedded image once, or a native map's original text and separately supplied original image. Masked tiles, decoded textures and delivery caches are rebuilt. The v4 limit is 256 MiB of serialized UTF-8 JSON including escaping/base64; each original tactical text source is limited to 64 MiB and the unchanged v2 core retains its own smaller limits. A matching hash establishes internal consistency, not a trusted author's identity.

Restore is a local administrator operation into an empty database/schema. It preserves historical user IDs as credential-free `gast` records, never reuses existing identities and never grants platform privileges. Campaign roles remain historical campaign data. A separate explicit `enroll` command reconnects the chosen historical GM; restore/check never enroll users or reconnect media rooms.

Choose a separate destination database. Set its connection string in the current PowerShell process as `DATABASE_URL` using your local secret-management workflow. The optional `--database-url` argument is supported, but exposes the value to local process inspection and shell history. Commands never print the connection string.

```powershell
npm.cmd exec -- tsx packages/server/src/bundle-cli.ts initialize
npm.cmd exec -- tsx packages/server/src/bundle-cli.ts check --input C:\Backups\campaign.chronicle
npm.cmd exec -- tsx packages/server/src/bundle-cli.ts restore --input C:\Backups\campaign.chronicle
```

Older files require exactly one explicit source-version upgrade option. Run the check first and retain its migration report alongside the source archive:

```powershell
npm.cmd run campaign-bundle -- check --input C:\Backups\campaign-v1.chronicle --upgrade-from-v1
npm.cmd run campaign-bundle -- restore --input C:\Backups\campaign-v1.chronicle --upgrade-from-v1
npm.cmd run campaign-bundle -- check --input C:\Backups\campaign-v2.chronicle --upgrade-from-v2
npm.cmd run campaign-bundle -- restore --input C:\Backups\campaign-v2.chronicle --upgrade-from-v2
npm.cmd run campaign-bundle -- check --input C:\Backups\campaign-v3.chronicle --upgrade-from-v3
npm.cmd run campaign-bundle -- restore --input C:\Backups\campaign-v3.chronicle --upgrade-from-v3
```

The v1 path first applies the unchanged migration-010 defaults: one profile per old actor, controller grants only for the previously authorized player/default-actor binding, and saved default perspectives for existing members. It then applies the v2-to-v3 step, which adds ten empty tactical tables. The v2 path applies only that second step. Neither creates maps or past movements, infers grants from historical `user_id`, grants GM private actor knowledge, or invents historical timestamps. Existing IDs, core values and seals remain intact. The response has `formatVersion:4` and a separately hashed `migration.steps` report with each algorithm and source/target hashes. Recomputing the explicit pure upgrades verifies it; it is not stored as a historical campaign event. Flags for the wrong source version or multiple flags together are rejected. V4 input requires no upgrade flag; V3 requires --upgrade-from-v3.

Before starting the restored app, explicitly enroll its historical GM. Supply `CHRONICLE_ORIGIN` and `COOKIE_SECRET` from the destination application's environment, alongside the same `DATABASE_URL`. Select the campaign ID and a user ID whose stored campaign role is already `leitung`; the command refuses player IDs, actor IDs and unrelated campaigns.

Every older-source chain now finishes with the v3-to-v4 step: seven empty authoring tables,
without inferred publication decisions or theme pins. A stored historical `entries.public`
bit alone does not publish an article. Version 4 additionally preserves immutable theme
revisions/reports, separate private and public pins, publication policies, selected article
revisions, public aliases/source mappings and complete authoring command preimages/receipts.
The separate process setting `CHRONICLE_PUBLIC_DELIVERY` is excluded and defaults off on a new
host, even when the restored world's policy is enabled.

```powershell
npm.cmd exec -- tsx packages/server/src/bundle-cli.ts enroll --campaign-id CAMPAIGN_ID --user-id HISTORICAL_GM_USER_ID
```

This separate command promotes only that selected existing GM to platform `leitung` and prints a one-use pairing code valid for ten minutes. No browser credential is created yet. Start the destination app, open **Gerät verbinden**, and redeem the code to authenticate as the original historical user. Once authenticated, the GM can use the existing roster pairing flow to reconnect the remaining historical players. A lost/expired code can be replaced by explicitly running enrollment again. Pairing state and platform privileges are operational state excluded from campaign semantic equality.

`initialize` explicitly applies migrations only when the destination contains no application data or unrelated tables. The current target requires migration 011. `check` validates the file, required schema version and empty destination without migrations, writes or sequence changes. `restore` repeats validation and vacancy checks under an advisory lock and exclusive application-table locks. It inserts only the fixed format columns, checks all deferred foreign keys, reexports the restored graph and requires an empty v4 semantic diff before committing. Older inputs are compared with their explicitly upgraded v4 result. A failure rolls back the complete restoration. Identity sequence restarts are transactional. Export and restore both reject unknown tables or additional durable columns instead of silently omitting a future module.

Migration 009 makes the legacy and current consumed-roll cycles and historical baseline/session relationship deferrable. Existing immutable UPDATE/DELETE guards remain active. Historical baselines are inserted before sessions. A fixed transaction-local `chronicle.restore` construction marker prevents the session-insert trigger from inventing a baseline for sessions that predate migration 006; it cannot be supplied by bundle JSON. After commit/rollback the marker resets and normal new sessions capture their baseline again.

Migration 010 adds actor/item tables without rewriting the legacy actor/member bindings. Restore preserves deferred template-head/revision cycles and leaves revision/event append-only guards active. Stored reader choices and historical permission flags are evidence of saved state; the application checks current membership, grant and archive state again before allowing private reading or commands. Old request receipts retain their original input, hash and returned snapshot, including when the current instance has since moved or been archived.

Migration 011 adds the ten tactical tables. Restore preserves the map-head/revision cycle, original initial snapshots, rolling undo bases, the bounded transition suffix and permanent minimal command receipts. The parser checks that applying the retained suffix to its base produces the current state; it does not claim to reconstruct discarded movements before that base. Old minimal receipts preserve retry deduplication after pruning and restore without retaining old positions. No missing historical session snapshot is generated during restoration. Access to current maps, actor controls and masked tiles is checked afresh by the running application.

Run the focused restoration checks with:

```powershell
npm.cmd exec -- vitest run packages/server/test/bundles.test.ts packages/server/test/bundles-v2.test.ts packages/server/test/bundles-v3.test.ts packages/io/test/campaign-bundle.test.ts packages/io/test/campaign-bundle-v2.test.ts packages/io/test/campaign-bundle-v3.test.ts packages/io/test/campaign-bundle-v3-large.test.ts
npm.cmd exec -- vitest run packages/server/test/bundles-v4.test.ts packages/server/test/bundles-v4.pg.test.ts packages/io/test/campaign-bundle-v4.test.ts
```

The focused tests cover existing durable modules and all ten tactical tables, unchanged old-format validation, explicit upgrade chains, preserved seals/baselines, credential exclusion, late-insert rollback and persistent PGlite reopening. Tactical cases include old retries after pruning and restore, multi-step undo, no-op receipts, a compensation whose original patch has left the ring, actual 64 MiB source/escaping limits and the licensed UVTT fixture. A separate test compares the pure v1 upgrade with actual migration-010 SQL backfill. With `TEST_DATABASE_URL` set, `packages/server/test/bundles.pg.test.ts` and `bundles-v3.pg.test.ts` add real PostgreSQL snapshot interleaving, deferred cycles, both CLI upgrades, pruned retries and transactional identity-restart rollback. Tests use only uniquely named temporary schemas; no operating database is restored or enrolled by this verification.
