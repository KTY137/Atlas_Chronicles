# Runtime integrity findings — 2026-09-06

This records implementation corrections against the existing Champion knowledge, immutable evidence and explicit human confirmation contracts. The full delivery sequence remains in `docs/IMPLEMENTATION_PLAN.md`; no new product verdict replaces the Champion.

## Document and letter knowledge

Two real PostgreSQL regressions in `packages/server/test/document-concurrency.pg.test.ts` failed before correction: a grant could commit after a merge had checked its recipients, and a grant could acknowledge a passage retired by an overlapping writer. Document saves and grants now share the campaign lock and stable author membership. Grant validation and insertion belong to the same transaction, following the campaign-before-entry ordering already used by gameplay/week/import writers. Both regressions passed after the correction.

The original delayed-letter hash binds text and tags but not the article title, slug, heading path or relative order of mailed passages. Four of seven new letter regressions initially failed. Delivery now compares those already-sealed fields while retaining the original hash and immutable snapshots. Changed mailed material remains historical-only; edits to other concealed material do not prevent a valid current grant. `letter-integrity.test.ts` and the existing week suite passed19 tests together.

Wiki navigation follows the same projection boundary. Backlinks are derived only from held active source passages, and unavailable target names and IDs produce the same404. Old slugs remain reserved for their original article, including when that article reclaims a previous name. Slug-only links resolve using a reader's known targets and aliases without rewriting the source revision. A redundant alias to the same current article is legitimate and survives native bundle validation; a competing identity is rejected.

## HTTP and WebSocket lifecycle

Browser preconnections can accept TCP without sending HTTP bytes and prevent Fastify shutdown. Unconditional connection destruction resolved that hang but a new application-level regression proved that it discarded an in-flight database response. The lifecycle tracker instead drains active responses and closes idle/preconnect sockets. Upgraded sockets move to the WebSocket plugin's ownership; otherwise a prior hook produced abnormal1006 closes before the plugin could send1001. Focused tests cover complete850KB response delivery, delayed database work, preconnections, normal1001 and an unresponsive peer.

## Authored communication and the table buffer

Explicit campaign posts and replies are durable authored objects, visible to campaign members. Table chat is a separate ephemeral buffer bound to the current session and physically removed when the session ends, with a14-day upper bound. This implements the shell's campaign channel while preserving the Champion's absence of an automatically recorded session transcript. It does not record speech or infer canon from conversation.

The live client uses server-derived presence and per-reader invalidation sequences. After uncertain delivery it keeps the command ID for an unchanged draft. Table drafts also carry the scene ID/version so an uncommitted retry cannot silently move to the next scene; a previously committed command still returns its original acknowledgement. The channel displays the newest500 messages in chronological order. Two focused regressions failed before these fixes and passed afterward. Older-page navigation remains separate from this initial bounded channel window.

## Evidence limits and follow-up

The above tests establish their named runtime behaviors, not the complete product. Native campaign format/restore design and its independent consistency review are recorded separately in `campaign-bundle-v1.md` and `docs/CAMPAIGN_RESTORE.md`. Current integrated gate and browser results belong in `STATUS.md`; the later combined UI checkpoint passes357 tests and7 browser flows.

## Browser-discovered presentation regressions

A same-path live refresh temporarily cleared loaded wiki data and unmounted the reader, losing an in-progress recipient selection before submission. Background refresh now retains loaded data; changed paths and failures still clear obsolete content. The real two-reader browser flow passes without relaxing its reveal assertion.

The dice receipt stores retained roll indices. The card rendered those indices as faces, displaying0 while the sealed roll total was correct. It now resolves each index to its original roll chain, including explosions. Three rendered-card regressions failed before correction and pass afterward; the table browser test checks the displayed face, total, human confirmation, provenance and reload. Historical roll records and seals are unchanged.

## Week, rules and live state

Reading marks now acknowledge a hash of the caller, campaign, actor perspective and exactly projected article. A new passage arriving between render and acknowledgement causes409, preserving its unread mark. Hidden-only edits do not change this hash. Frozen letter seals retain their original meaning.

Package review hashes cover the exact source/target documents, campaign pin version and persisted sheets with their versions. Activation rechecks this state in the same writer transaction before applying the reviewed migration. A new sheet, changed field, changed version or changed package invalidates the review. The visual editor retains dirty drafts across live refresh, temporary network loss and package changes; replacing that baseline is explicit. The migration/actor-field browser flow reproduced the original lost-form problem before correction. A real resource adjustment also caught a missing submit type on the shared button and now verifies the resulting server value.

Live fingerprints include only the caller's accessible sheets, articles/read state, clock and letters. Regression twins show that another player's sheet changes and pending private mail do not advance a reader's sequence. Three simultaneous fresh browser connections exposed a real PostgreSQL deadlock between cursor foreign-key key-share locks and the campaign lock used while expiring authorizations. A controlled real-database regression established the failing order. Sync now acquires campaign/membership locks before creating the cursor, matching existing writers; the concurrency regression and unmodified simultaneous Week flow pass.

## Media lifecycle

Production room admission binds tokens to the authenticated credential and server-derived role. Periodic reconciliation revalidates credentials, membership, channel, presence generation and private-room participants. Revocation rotates affected provider rooms, with durable cleanup intents, preventing reuse of old room tokens. Local tracks stop when access is lost or campaign/account scope changes.

Independent review found that one failed provider cleanup could starve all later campaigns. The regression failed first; reconciliation now processes every campaign and reports the retained failure after the sweep. A second regression proved that an unmounted component could issue a delayed request after disconnect under a new ambient session; epoch/mount guards now block it. Focused media tests pass24/24. The real three-browser SFU flow verifies audio RTP and playback, decoded camera/screen frames, navigation continuity, whisper outsider denial and capture termination after moderation; it does not claim physical devices, remote NAT or browser outage recovery.

## Actor control, evidence and the next native format

Migration010 adds explicit controller grants and reader perspectives alongside immutable
actor/item template revisions and independent instances. It leaves the historical core
membership/actor columns intact. Control permits acting with an actor; the explicitly
selected perspective determines private knowledge and received letters. Implicit GM
gameplay control does not expose private correspondence. Existing player bindings are
backfilled deterministically; no runtime fallback invents authority from a legacy column.

Two red-to-green domain regressions demonstrated hidden lore IDs in Actor/Item responses,
including command retries. Stored canonical events retain complete evidence, while each
response reprojects the lore reference against the current reader's knowledge. Player
ActorCards expose no global profile version; hidden-only lore changes therefore do not
advance that reader's live sequence. Separate projection tests cover shared control,
distinct knowledge, revocation, private GM correspondence and archived roll replay.

A real PostgreSQL race across two campaigns reused one global command ID. The unique
constraint correctly rolled back the losing transaction, but surfaced as500. The regression
now verifies a409 conflict and exactly one committed object/event. HTTP rate budgets are
keyed by authenticated user, so three verified readers behind one IP remain usable;
forged cookies and identity headers still share the unauthenticated IP budget.

Native v2 validates its core through the unchanged v1 parser and adds every migration010
table. V1 requires an explicit deterministic upgrade with a report, preserving IDs and
seals. Independent review found incompatible Rule-v1 field bounds in Actor/v2 parsing
(valid96-character field names and4096-character defaults) and event variants that could
rewrite supposedly unchanged actor fields. Each finding gained a failing regression
before its minimal correction. Real PostgreSQL restore tests cover template revision
cycles and the explicit administrator CLI upgrade.

## Actor drafts and tactical source fidelity

Four new real-PostgreSQL browser regressions first failed against the integrated client.
Selecting the active tab/item cleared its dirty guard; adding an item displaced unsaved
notes; a pending save erased subsequently typed text; a lower-sorted newly controlled
actor silently replaced the active figure; initial perspective hydration remounted an
editable Wiki; and an old template response closed a newer template draft. Same selections
are now no-ops, creation respects dirty state, pending forms disable their inputs, the
initial actor selection is pinned, knowledge-bound views wait for their perspective,
and template callbacks check their originating editor epoch and mount lifetime. All
regressions pass without fake server data or relaxed assertions.

The separate TacticalMapDocument-v1 contract preserves SceneDoc-v3 and includes UVTT
geometry, grid, frame and scalar elevation. Real BSD-licensed source files retain exact
provenance/hashes. Independent review reproduced two UVTT export failures: binary rounding
at2560/77 prevented reimport, and deleted/reordered wall points inherited the wrong source
metadata by array index. The corrected adapter accepts only machine-scale arithmetic
roundoff, takes authoritative image dimensions, matches unambiguous retained coordinates,
and reports unknown metadata loss when correspondence is ambiguous. Source bytes remain
unchanged on an untouched export. Fifty pure contract/adapter tests pass; these are not
evidence of a delivered tactical renderer, protected raster tiles or hardware load gate.

## Tactical runtime integration and independent review

Migration011 and nativev3 preserve source bytes, revisions, planned token positions,
immutable initial snapshots and live state separately. Compaction keeps the last50
patches plus a replayable base and minimal durable command acknowledgements. Independent
review removed a pruned receipt from a valid53-move bundle and regenerated its hashes:
the parser incorrectly accepted it. Validation now requires distinct per-object receipt
versions for every demonstrated advance; no-op duplicates cannot fill a missing version.
Real PostgreSQL additionally verifies export snapshot isolation, deferred restore cycles,
old retries after restore and rollback of a command that fails after compaction.

The raster pipeline has19 tests, including real2560-square UVTT decode, secret pixel
twins at every pyramid level, boundary footprints, malformed containers, memory/cache
bounds, queue timeouts and retaining native worker capacity after caller timeout.
Independent source review found no additional blocker. A separate real three-browser
test found that a409 tile denial left9 old textures alive while projection polling was
offline. The host now immediately clears GPU images/cache, quarantines that scope and
requires a new authorized fetch on explicit retry. A2561-pixel LOD regression prevents
stretching coarse texels; clipping preserves alignment at the final partial pixel.

Actual-component/hook review reproduced accepted token values overwritten by stale
props, dirty plan unmount on transient errors, silent remote map revision rebinding and
concurrent commands losing an unresolved retry identity. A successful null plan was
also incorrectly treated as never loaded during refresh. Six review cases pass after
monotonic acknowledgement adoption, retained loaded state, pinned draft maps and a
bounded per-command retry map. Seven renderer tests cover gesture invalidation when
the original token's position/version changes, retaining unrelated cosmetic updates.
Scene/scope changes and control removal also cancel a drag.

Gameplay scene start now checks optional scene/plan versions before ending the current
session, under the capture transaction's campaign lock. Two HTTP regressions prove
stale rejection and empty-body compatibility. Another two actual HTTP tests preserve
the published RulePackage96-character field/4096-character value bounds for sheet and
action writes. Large tactical live synchronization hashes its existing projection
digest, avoiding the smaller RulePackage JSON budget on a valid20,000-stamp document.

These checks establish bounded functional behavior. They do not establish the specified
50,000-stamp reference-laptop S-K1/S-T1 performance or the remaining authoring/publication
and desktop gates. Current combined run counts and runtime state belong in STATUS.md.

## Authoring, publication and native-v4 independent review

SQL012 freezes seven authoring tables and exact command preimages. Theme revisions and public
article selections are immutable pins. Anonymous HTML/JSON/search/backlinks/feed/sitemap/social
output share one projector; a GM cookie does not expand it. Public delivery is independently
off by default in local process configuration, never enabled by a campaign archive.

Two source contract amendments were adopted before correction: language-prefixed legacy paths
remain distinct normalized identities, and source assertions are selected at or before the
published article revision. A later private import cannot rewrite old public bytes. An
independent native-v4 attack moved a fully rehashed attribution assertion between entries of
one accepted artifact; the test failed before validation restricted source passages to the
actual accepted entry. Parser and server now use the same entry/revision cutoff semantics.

Five independent client review cases exposed two defects with red-to-green evidence. A delayed
theme-save acknowledgement followed by a historical revision read inherited a newer head CAS
version, allowing an unseen version to be overwritten; the editor now retains the acknowledged
version as its baseline. Terminal authorization loss retained a private editor; it now clears
the draft and acknowledgement cache, while transient errors retain previously loaded state.
The other two preview style contract checks were already green on first execution and are not
presented as red-to-green findings.

Actual browser tests also exposed invalid intermediate contrast during theme color transitions
and a membership refresh error unmounting dirty editors. Color pairs now switch together; both
503 and 429 have mounted-editor regressions. The source workflow genuinely uploads attribution,
accepts the import, publishes selected passages and confirms a language-prefixed redirect.
Nine authoring browser cases and the complete23-flow functional suite pass on buildC4bNbIAT.

Native v4 wraps the unchanged historical v3 core and covers all seven new SQL tables. Tests
verify closed schema/column coverage, command replay, immutable pins, source integrity, explicit
v1/v2/v3 upgrade chains, real PostgreSQL restore/retry and atomic rollback after late insertion
failure. Credentials, local accessibility preferences and the host public-delivery switch remain
outside the campaign archive. Exact verification totals and operative runtime belong in STATUS.
