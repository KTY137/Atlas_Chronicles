# Codex work alongside Claude — 2026-09-06

## Verified integrated checkpoint and operative host — 2026-09-06 21:33

**Current localhost3000 is exact commit `53996fea23612e4cdec90720608521173e6e8061`**, in
`.local/checkouts/htbah-desktop-gate`, owned app **PID12600 / exec session1549**. Start from that
checkout with `node .local/verification-htbah-desktop/start-operative.mjs`. This ignored wrapper
loads the preserved local config and media settings, explicitly selects its configured database
instead of an inherited placeholder DATABASE_URL, and keeps public delivery disabled. Do not
remove or rebuild this operative checkout. The older authoring-gate checkout is retained;
its app PID13124/session9596 is stopped.

Its independent `npm ci` installed296 packages, audited311 and reported0 vulnerabilities.
`node_modules` is a real directory, with no shared junction. Exact-source root TypeScript,
324 boundary files /8 rules /0 violations,41 assets plus the binary identity regressions,
and **1178 tests /115 files** pass. One PGlite concurrency case intentionally skips; real
PostgreSQL was preflighted and used, with four test workers and unchanged test budgets.
The entire browser suite passes **24 functional flows in2.7 minutes on this one build**, including
HTBAH, native-v5 transfer, actual three-reader tactical views, server restart, WebAuthn and
loopback SFU. Four opt-in performance cases skip; no new hardware/accessibility acceptance.

Client `index-ChSVUtKl.js` has SHA256
`07a15908bf5bc76ab73fb47245cef81ebf98c836ace050ca64217c5504e8785f`.
After the operative restart, health, readiness and client all returned200; the served asset
matches that hash. A separate agent-browser session rendered the real welcome/login page
without page errors. SQL001–012, local config and the identity digest (one user/two credentials,
excluding last-used timestamps) are unchanged. Existing bootstrapToken is in this checkout's
ignored `.local/config.json`; no token or cookie was written into tracked files.

Evidence: the checkout's `.local/verification-htbah-desktop/{npm-ci,cold-gate,cold-build,cold-e2e}.log`,
`operative-{before,after}.json`, `operative.png`, and `.local/e2e-htbah-desktop-all`.
Ignored `.local/backups/pre-htbah-53996fe/public.dump` in the shared root is254928 bytes,
SHA256`55bf2c42e8fdcc35794597e2589b4715db2add68dc5868b1ccd762fdafaef313`;
its archive listing is verified, not an exercised restore. The preserved local config sits beside it.

Commit accounting: external commit6f1fce8 included Root's explicitly staged122-file integration
despite its desktop-only title. Subsequent53996fe contains only three documentation corrections
despite its feature title. Both are retained without history rewriting. The isolated checkpoint
proves the resulting complete tree; the earlier shared-dist snapshot claims below are superseded.

Next phase is in progress only in the shared checkout: mandatory Desktop setup prepare / durable
encrypted receipt / Ack / commit, locked exact-credential reconciliation, and automatic artifact
resource hashing. Root owns host.ts and coordinates the Desktop author; independent review
fixtures remain reviewer-owned. Installer/update/ASAR/fuses, the reviewed full painted-pack
contract and native original-byte portability remain in full scope. The external Linux patch
is still unapplied. Newer external UI/generator changes are preserved in the shared root and are
not silently claimed present in this frozen operative checkpoint. Full M0–M9 remains active.

## Previous working-tree handoff — HTBAH, tactical entities and desktop recovery

This section supersedes the older ownership and delivery notes below. Root now participates
in `coord/PROTOCOL.md` as `codex-root`; read its chat and actual path claims before editing
in the shared checkout. Those coordination files belong to another session and are still
untracked/excluded from this checkpoint; an isolated checkout must route through the root
shared workspace until their owner commits the coordination tools.
Do not stage external Claude's ActorWorkbench/Week/Channel/AtlasView/ImportView/styles work
or broad source globs. Several earlier external commits included root integration seams
before their new dependencies; the next root checkpoint must include those dependencies.

The working tree contains the complete configurable HTBAH template, generic package-v2 editor,
computed/validated character sheets, classified receipts and native campaign-v5 dispatch.
All eight contract/implementation review corrections are recorded in the HTBAH design lineage.
See [HTBAH](HTBAH.md) and [native v5](CAMPAIGN_FORMAT_V5.md). Root's tactical-entity UI/projection
also has independent red-to-green review and actual three-reader browser/revocation evidence.

Latest complete working-tree gate: **1,178 passed / 115 files**, one intentional PGlite
concurrency skip, root TypeScript, **324 boundary files / 8 rules / 0 violations**, and the
41-asset gate including the new binary identity regression. Evidence is
`.local/verification-htbah-desktop/gate-four-workers.log`. The first wrapper accidentally
inherited a placeholder DATABASE_URL; the corrected wrapper explicitly loads the existing
local config and performs a real PostgreSQL preflight. Default parallelism then exceeded three
old five-second restore-test budgets; all eight affected-file tests pass unchanged in isolation,
and the complete gate passes with four workers. No test timeout or assertion was relaxed.
Root's recorded client build is `index-DCMgOe37.js`. The independent checkpoint audit subsequently
found shared dist changed to `index-BCyHsh0p.js` by another writer despite the held build/browser
lease. All24 functional browser flows are verified across these working-tree snapshots,
including real loopback media; this is not exact single-build evidence. The full run passed13; eleven old selectors/copy
expectations needed to follow Claude's expanded labels, character-name heading, conflict text
and explicit file-upload mode. Its focused twelve-case rerun passed ten; the remaining two
then passed in10.7s. Root changed only tests between these runs, with downstream persistence,
authorization and replay assertions retained. See `e2e-all.log`, `e2e-labels.log` and
`e2e-final-two.log` in the verification directory and their separate `.local/e2e-*` artifacts.
The next committed-tree check must use its own npm ci and browser output, without shared
node_modules or dist, to prove one exact source/build snapshot.
The four opt-in performance cases were skipped; previous measurements are not new acceptance.

The desktop host uses its own verified PostgreSQL17 cluster and DPAPI profile, unprivileged
game windows, private management IPC, durable setup receipt reconciliation, verified drain,
mandatory recovery before pending migrations and device-bound recovery into a new profile.
Both fresh dev and standalone smoke pass **10/10**, including actual HTBAH through the shared
client, native-v5 roundtrip and the original credential authenticating after full recovery.
See [DESKTOP](DESKTOP.md) for exact artifact/resource hashes and scoped evidence. This executable
was tested before the latest Core/UI source checkpoint and is not claimed byte-identical to it.
The installer, updates, ASAR/fuses and process-death refinement at `desktop-shell-20260906.md:228`
are now adopted with independent F1–F8 corrections; their implementation follows this checkpoint
and their dependencies have not been installed yet.

Three generated PNG originals are preserved byte-for-byte under `assets/generated/painted-dungeon-v1`.
The asset gate now uses raw binary identity; registration, selected generator pack, per-Sicht
sprite delivery and self-contained pack portability are the next independent design review,
`painted-pack-20260906.md` / `painted-pack-review-20260906.md`. Do not infer public distribution
permission or CC0 from the generated images, and do not repeat the non-seamless stone patch.

**Operative app remains the independently verified b415f03 checkout below.** Do not report the
new uncommitted work as already served on localhost3000. Complete the coherent checkpoint and
its independent checkout gate before updating that owned process. Full M0–M9 scope persists;
reference hardware, real play-week measurements, NVDA and external HTTPS/media remain scoped
acceptance evidence to obtain, not silently closed by functional tests.

## Prior verified authoring checkpoint

This section supersedes the historical ownership/runtime notes below. Root completed M8 theme,
local appearance, publication/source, native-v4 and reviewed renderer integration. The working
tree passes 781 tests in 76 files with real PostgreSQL, one intentional PGlite race skip,
TypeScript, 233-file/8-rule boundaries and asset checks. Client `index-C4bNbIAT.js` passes all
23 functional Playwright flows including real loopback media in 2.2 minutes. The four opt-in
performance harness cases also pass separately; read TACTICAL_PERFORMANCE for measured limits,
not a blanket performance acceptance. AUTHORING records the nine new browser flows and
independent red-to-green regressions. Checkpoint and clean-tree validation follow next.

The exact authoring checkpoint is now **b415f03**, independently verified in
`.local/checkouts/authoring-gate` with its own npm ci:781 tests in76files,1 intentional skip,
233 boundaries/8rules,32assets and identical client artifact. Localhost3000 now serves that
checkout, owned **PID13124/session9596**, actual SQL001–012. Health/client200 and artifact verified.
Old PID22164 stopped. Ignored `.local/backups/pre-authoring-b415f03/public.dump` and config are
the pre-migration local recovery point; no successful restore exercise is inferred from its
valid archive listing. Preserve credentials/media env/demo data; public delivery stays off.

The user's expanded goal retains the whole implementation plan, asks us to complement Claude,
generate map assets in parallel, and provide a How to be a Hero rules template. External Claude
work remains active in shell-lab, import/parser fixtures and the assetpaket/grundriss modules.
Root owns integration; the image worker owns only new assets/generated/painted-dungeon-v1 and
its optional design note. Desktop and tactical-entity proposals are not product delivery yet.
Asset byte delivery, archive pack portability and actual generator-to-table integration are
known gaps; schematic symbols and diagnostic SVGs do not prove those flows.

## Historical implementation notes

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

### Verified checkpoint and actual runtime follow-up

Commit **7b45296** is verified in clean `.local/checkouts/tactical-gate`, using an independent
`npm ci`:566 tests in62 files plus1 intentional PGlite race skip,191 boundary files/8 rules,
root/client TypeScript and client build `index-DMbNOwxc` green. A first cold concurrent-build
run hit one unchanged5s PG-restore timeout; its focused rerun and the full unchanged gate pass.
No limits or assertions changed. Fresh Windows checkout now preserves the UVTT checksum under
`core.autocrlf=true`; `.gitattributes` was included without broad file renormalization.

Old PID9052/session65357 is stopped. **Current owned app PID22164/session29214** serves localhost3000
from that verified checkout. Its ignored local config is a copy of the existing local config;
media env remains the original ignored `deploy/media/.runtime/app.env`. Startup command from
the checkout is `node --env-file=<absolute original repo>/deploy/media/.runtime/app.env --import
tsx packages/server/src/main.ts`. Operative SQL lists001–011; health and client both200.
Do not remove this checkout while its app is running. New authoring migration012 is not operative.

M8 round2 is now adopted with independent-review fixes recorded at the top of its design file:
triple publication CAS, host-global legacy route uniqueness, retained normalized authoring
request preimages and a fixed public default theme. Worker live_ui_audit owns new packages/theme;
shutdown_audit owns new authoring/publication backend/protocol/SQL012/tests; bundle_contract owns
the opt-in tactical performance harness/browser slot until handed back. Root owns UI/wiring and
nativeV4 until that worker is free. All prior scope, conditional gates and unpublished work remain.
