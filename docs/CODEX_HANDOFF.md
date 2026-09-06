# Codex work alongside Claude — 2026-09-06

Kaya resumed implementation after restarting VS Code and reported three active Claude sessions. Their task assignments are not yet known to this Codex session.

Codex completed the HTTP shutdown/restart fix and browser verification in `e2e/`, plus document/revelation serialization and letter snapshot integrity. Current ownership: root owns wiki navigation/backlinks/slug projection, minimal App/Wiki integration and browser tests. Codex workers own new ChannelView/useCampaignLive files, the new native campaign bundle parser/schema in io, and server bundle export/dry-run/empty-database restore with **migration009_campaign_restore.sql reserved**. Prior Codex client owners are no longer active after the restart; no current external product-client ownership was found on disk. Preserve Claude's active deploy, media/realtime shutdown and fixture/import-parser work.

Fresh checks after restart: all **174 tests in 16 suites**, root typecheck, package boundaries, and the client production build pass. This replaces the earlier incomplete week-suite result in the pause handoff. Real PostgreSQL17 has been restarted using the existing development Compose service and local credentials.

The original browser shutdown hang is resolved. Raw accepted TCP preconnections that never sent HTTP bytes prevented Fastify from closing. The lifecycle hook now drains active responses and closes idle/preconnect sockets, relinquishing upgraded sockets to the WebSocket plugin. The complete campaign browser flow passes through database close/reopen and revoked access. Both campaign and passkey test ports are randomized; keep separate Playwright output directories across sessions.

Existing uncommitted work and unrelated Claude design files must be preserved. Runtime secrets remain in ignored `.local/` and `deploy/media/.runtime/`; neither belongs in commits. `docs/IMPLEMENTATION_PLAN.md` retains the complete scope beyond this verification step.

## Live overlap and integration notes

Another session changed `app.ts` to `forceCloseConnections: true` and randomized the campaign E2E port during Codex's diagnosis. The real browser restart subsequently passed. A new application-level regression then proved that `forceCloseConnections: true` returns from shutdown while a database operation is still running and drops its response. Codex therefore integrated `registerHttpLifecycle(app)` immediately after Fastify construction and removed only that flag/comment, retaining other parallel edits. Its two lower-level tests cover raw TCP preconnections and draining an active delayed writer with a complete 850KB response. The combined lifecycle change is wired; do not restore unconditional connection destruction.

The shared client `dist/` was also rebuilt by another process while browser verification was in progress. That artifact (`index-BHaakBGr.js`) failed immediately with `ReferenceError: React is not defined`. The canonical `npm.cmd run build` regenerated working artifact `index-7eVIBbfV.js` from unchanged source. Use the canonical workspace build, and keep browser output paths separate across concurrently running Playwright processes. Codex now uses `--output=test-results/codex-browser`.

Codex added `e2e/passkeys.spec.ts`: real browser WebAuthn ceremony with a virtual authenticator, challenge replay denial and passkey/derived-session revocation. The final run passed both browser tests in18.5s with the graceful lifecycle hook; no physical hardware or synced-provider claim.

Document/revelation correctness is now covered by two real Postgres concurrency regressions. An overlapping grant could previously evade the merge audience check, and a grant could acknowledge an already-retired passage. Both failed before the fix and pass with shared campaign serialization and membership locks in the document transaction. Delayed letters now compare sealed entry/title/slug/path and relative mailed-passage order as well as the original content hash. Seven regressions preserve compatibility and distinguish hidden-only edits from changed mailed material.

Final combined verification for this beat: `npm.cmd run gate` with `TEST_DATABASE_URL` loaded from ignored local config passed package boundaries, root typecheck and **198 tests in22 suites**, including the two real Postgres concurrency tests. `npx.cmd playwright test --reporter=line --output=test-results/codex-browser` passed **2/2**. These totals include the parallel Claude fixture gate tests present at verification time. No full-product or production-hosting completion is claimed.

## Previous green product checkpoint — 5a0a0f5

The final combined gate passes **279 tests in33 files**, TypeScript and125-file/8-rule package boundaries with real PostgreSQL enabled. Canonical client build passes. `playwright test --reporter=line --output=test-results/codex-verified` passes **4/4 in37.1s**, including native archive download and the complete table roll/confirmation/provenance flow. The live-refresh form reset and retained-die-index display regressions are fixed and covered. The native bundle now has7 PGlite and4 real PostgreSQL tests, plus29 pure parser tests and a scoped independent consistency review.

Next ownership after checkpoint: live_ui_audit owns new WeekView/week-api/CSS; bundle_contract owns new RuleForge/FormulaBuilder/preview/model/CSS; shutdown_audit owns new MediaPanel/CSS and scoped media lifecycle backend fixes. Root owns App/Reader/Wiki integration, reviewed rule migration API and end-to-end acceptance. Coordinate overlapping server edits before touching shared files. Three external Claude sessions continue; preserve their design/deploy/import-parser changes.

## Previous combined UI checkpoint — 9b1a59f

Week, visual RuleForge and persistent MediaPanel are connected and verified together. The final root gate with real PostgreSQL passes **357 tests in40 files**, root TypeScript and **139 files /8 rules /0 boundary violations**. The canonical production client build passes. `ATLAS_MEDIA_E2E=1` with `playwright test --reporter=line --output=test-results/codex-full-ui-final` passes **all7 flows in1.2m**. Actual media evidence is loopback LiveKit with synthetic browser devices; remote HTTPS/TURN, physical hardware and browser SFU-outage recovery are not inferred from it.

The real three-reader Week flow exposed a PostgreSQL foreign-key lock upgrade deadlock: new event cursor creation held a campaign key-share lock before projection tried to expire authorizations under an exclusive campaign lock. The deterministic regression failed before correction and passes after `communication.sync` acquires campaign/membership locks first. No sequential client prewarming remains in the browser test.

Reviewed migration activation hashes include exact package documents, pin version and persisted sheet versions. The character form retains its baseline and dirty draft across live package changes or temporary network errors and requires explicit replacement. Reading acknowledgements bind to the exact projected article, including actor perspective. Media reconciliation processes later campaigns despite an earlier provider cleanup failure; scope switches prevent stale post-disconnect requests. Their red-to-green evidence is recorded in the implementation integrity ledger.

Next ownership: live_ui_audit owns new actor protocol/domain/HTTP/tests and migration010 after this checkpoint; root owns existing authorization/projection/client seams, bundle v2 and integration. bundle_contract owns only new tactical-map and UVTT pure contracts/fixtures/tests plus szene/forge exports. shutdown_audit completes MEDIA_UI documentation, then provides independent review. Existing v1 bundle semantics and migrations001–009 remain immutable. Explicitly version durable schema additions alongside export/restore; do not weaken schema coverage to let incomplete archives pass. Full M0–M9 remains active, including remaining actors/inventory/tactical tools/themes/publication/Electron and applicable generation gates.

## Current actor/inventory checkpoint

The actor ownership above is complete. Migration010 and all actor/item endpoints are integrated
with authorization, knowledge perspective, sheets, rolls, Week and live invalidation. The client
has real templates, instances, controller grants and inventory. Native export/restore/CLI now use
v2 with an explicit v1 upgrade; published v1 files remain unchanged.

Final gate: **460 tests in48 files**, root TypeScript, **160 files/8 rules/0 boundary violations**,
with `TEST_DATABASE_URL` enabled against real PostgreSQL. Canonical client build passes. Final
browser run with actual loopback media: **12/12 in1.5m**, artifacts `.local/e2e-actors-all-final`.
Four draft regressions first failed against real APIs and now pass. Scope and review corrections
are in `docs/ACTORS_UI.md` and the implementation integrity ledger.

Tactical/UVTT pure contracts are reviewed and pass50 tests with a real provenance fixture. Their
two independent export findings have red-to-green coverage. They do not yet constitute the
tactical product. Next owners will split new Tactical domain/migration/protocol, protected raster
delivery, explicit native v3 and root renderer/client/session integration. Freeze v1/v2 contracts
and migrations001–010 after this checkpoint; new durable objects require another explicit format.
Keep browser output outside the shared default `test-results/` parent to preserve other runs.
Three external Claude sessions remain in scope; preserve their files and unrelated `.semgrep/`.

## Tactical runtime integration — current

The pure tactical foundation is now integrated with migration011, authenticated DTOs/routes,
server-masked image pyramids, scene plans/capture, controlled movement, portal commands and
50-patch Undo plus durable minimal retries. The client has import/provenance/Fidelity, region
bindings, accessible preparation/live controls and Pixi tiles. Nativev3 includes all ten new
tables and explicit older-format upgrades. See `docs/TACTICAL_UI.md` for usage and honest gaps.

Review corrections cover large-map sync, Unicode canonical hashes, global command collisions,
transaction rollback after compaction, in-flight revocation, missing pruned receipts, odd-edge
LOD alignment, immediate browser texture removal after a denied scope, stale/dropped drafts,
concurrent retry IDs and token changes during drag. Root added scene/plan preconditions to
start and restored RulePackage's published HTTP value bounds. Six actual-component/hook and
seven drag-contract tests cover the additional independent UI findings.

Working-tree gate:592 tests in63 files plus1 intentional PGlite race skip, realPostgreSQL enabled,
195 boundary files/8 rules/0 violations and root/client TypeScript/build green. This run includes
Claude's concurrent asset tests. All14 functional E2E flows pass across the combined13/14 run
and one focused correction of the old actor test's expected archive version2→3; no product
change was needed for that assertion. Output `.local/e2e-tactical-combined` and
`.local/e2e-tactical-actors-v3`; current canonicaldist `index-DMbNOwxc`.

Another session included earlier WIP in8ebab01; do not equate that commit with this later
integration gate. Its surrounding commits and active shell-lab/asset/generator work are retained.
The external `.gitattributes` correction is reviewed and necessary for exact byte fixtures on
fresh Windows checkouts. It needs no broad renormalization; clean-tree verification follows.

Current root tasks: checkpoint exact paths, verify committed tree, then restart the owned
`start:media` process9052/session65357 and verify operative migrations001–011. Do not claim the
new APIs were already served by the old operative process. Browser worker is preparing/running
an opt-in tactical performance harness; coordinate its exclusive browser slot. Native worker
reviews the completed M8 theme/publication proposal; backend worker authored that proposal.
The M8 proposal is still awaiting root adoption. M7 entity-binding UI, true S-K1/S-T1 reference
hardware, M8 themes/publication/desktop and remaining conditional M9 gates stay in full scope.
