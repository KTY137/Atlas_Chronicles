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
