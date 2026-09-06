# Native campaign export and restore

The version 1 `atlas-chronicles/campaign` file preserves one GM campaign, its immutable wiki history, source artifacts, atlas, rule packages, rolls, confirmations, fictional letters and receipts, week baselines, authored campaign posts and gameplay evidence. The authenticated export reads one PostgreSQL repeatable-read snapshot and holds a shared lock on the requesting GM's membership until collection completes. Ordinary document writers remain free to commit; their later changes cannot mix into that snapshot. The public format metadata and reference parser live in `packages/io/src/campaign-schema.ts` and `campaign-bundle.ts` (MIT).

Authentication credentials, invitations, pairing codes, transport caches, temporary table chat and all media runtime state are excluded. Source artifacts retain their original Eron/Azgaar evidence; remotely referenced media files are not downloaded or embedded. A file with a matching hash is internally consistent; its hash does not establish a trusted author's identity.

Restore is a local administrator operation into an empty database/schema. It preserves historical user IDs as credential-free `gast` records, never reuses existing identities and never grants platform privileges. Campaign roles remain historical campaign data. A separate explicit `enroll` command reconnects the chosen historical GM; restore/check never enroll users or reconnect media rooms.

Choose a separate destination database. Set its connection string in the current PowerShell process as `DATABASE_URL` using your local secret-management workflow. The optional `--database-url` argument is supported, but exposes the value to local process inspection and shell history. Commands never print the connection string.

```powershell
npm.cmd exec -- tsx packages/server/src/bundle-cli.ts initialize
npm.cmd exec -- tsx packages/server/src/bundle-cli.ts check --input C:\Backups\campaign.chronicle
npm.cmd exec -- tsx packages/server/src/bundle-cli.ts restore --input C:\Backups\campaign.chronicle
```

Before starting the restored app, explicitly enroll its historical GM. Supply `CHRONICLE_ORIGIN` and `COOKIE_SECRET` from the destination application's environment, alongside the same `DATABASE_URL`. Select the campaign ID and a user ID whose stored campaign role is already `leitung`; the command refuses player IDs, actor IDs and unrelated campaigns.

```powershell
npm.cmd exec -- tsx packages/server/src/bundle-cli.ts enroll --campaign-id CAMPAIGN_ID --user-id HISTORICAL_GM_USER_ID
```

This separate command promotes only that selected existing GM to platform `leitung` and prints a one-use pairing code valid for ten minutes. No browser credential is created yet. Start the destination app, open **Gerät verbinden**, and redeem the code to authenticate as the original historical user. Once authenticated, the GM can use the existing roster pairing flow to reconnect the remaining historical players. A lost/expired code can be replaced by explicitly running enrollment again. Pairing state and platform privileges are operational state excluded from campaign semantic equality.

`initialize` explicitly applies migrations only when the destination contains no application data or unrelated tables. `check` validates the file, required schema version and empty destination without migrations, writes or sequence changes. `restore` repeats validation and vacancy checks under an advisory lock and exclusive application-table locks. It inserts only the fixed format columns, checks all deferred foreign keys, reexports the restored graph and requires an empty semantic diff before committing. A failure rolls back the complete restoration. Identity sequence restarts are transactional.

Migration 009 makes the legacy and current consumed-roll cycles and historical baseline/session relationship deferrable. Existing immutable UPDATE/DELETE guards remain active. Historical baselines are inserted before sessions. A fixed transaction-local `chronicle.restore` construction marker prevents the session-insert trigger from inventing a baseline for sessions that predate migration 006; it cannot be supplied by bundle JSON. After commit/rollback the marker resets and normal new sessions capture their baseline again.

Run the focused restoration checks with:

```powershell
npm.cmd exec -- vitest run packages/server/test/bundles.test.ts
```

The tests cover all durable modules, consumed-roll cycles, preserved and legitimately missing baselines, credential/runtime exclusion, dry-run vacancy checks, rollback, occupied identities, explicit GM enrollment and reopening a persistent PGlite database. With `TEST_DATABASE_URL` set, `packages/server/test/bundles.pg.test.ts` adds real PostgreSQL snapshot interleaving, deferred-cycle restoration and transactional identity-restart rollback. It creates and removes only uniquely named test schemas. This operation covers the current complete-campaign profile, not tactical assets or future modules absent from version 1.
