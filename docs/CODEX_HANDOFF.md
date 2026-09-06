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

## Current green product checkpoint

The final combined gate passes **279 tests in33 files**, TypeScript and125-file/8-rule package boundaries with real PostgreSQL enabled. Canonical client build passes. `playwright test --reporter=line --output=test-results/codex-verified` passes **4/4 in37.1s**, including native archive download and the complete table roll/confirmation/provenance flow. The live-refresh form reset and retained-die-index display regressions are fixed and covered. The native bundle now has7 PGlite and4 real PostgreSQL tests, plus29 pure parser tests and a scoped independent consistency review.

Next ownership after checkpoint: live_ui_audit owns new WeekView/week-api/CSS; bundle_contract owns new RuleForge/FormulaBuilder/preview/model/CSS; shutdown_audit owns new MediaPanel/CSS and scoped media lifecycle backend fixes. Root owns App/Reader/Wiki integration, reviewed rule migration API and end-to-end acceptance. Coordinate overlapping server edits before touching shared files. Three external Claude sessions continue; preserve their design/deploy/import-parser changes.
