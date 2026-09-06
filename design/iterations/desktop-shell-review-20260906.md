# Desktop shell: independent authority and lifecycle review

Date: 2026-09-06. Reviewer: independent Codex worker, reporting only to root.

The adopted [two-round design](desktop-shell-20260906.md) remains the implementation
contract. This review covers the initial desktop policy/profile/PostgreSQL/controller/
main/preload/worker code, packaging scripts, and `server/src/host.ts`. New recovery and
migration helpers are outside the frozen review surface. Root is applying corrections;
the reviewer owns this note and the three disjoint regression files below only.

## Verdict and evidence boundaries

**Accepted for the bounded authority/lifecycle review after correction: all four findings
are closed at the focused regression level.** There is no critical finding. Two originally
high-severity lifecycle findings and two medium-severity failure handling findings are
recorded below with their corrections. Each confirmed failure had a red test before its
product correction. The tests run the actual Main IPC handlers or controller/host facade
with test doubles at Electron/process/database boundaries; they do not start Electron,
PostgreSQL, a browser, or an operative database.

Root supplied a green preflight of 19 tests in four files and the unpacked executable's
eight-checkpoint smoke. That smoke is prior evidence, not rerun evidence from this reviewer.
The new focused tests establish the failure seams, not a signed-release, installer, NVDA,
real-device, recovery, or full crash/restart acceptance claim.

## Findings

### DSK-R1 — HIGH — local renderer outlives authenticated host ownership

**Trigger:** open a local world and stop its host, or let its authenticated worker exit.
The initial Main code retained the local game BrowserWindow and its persistent session.
Same-origin navigation remained allowed and there was no outgoing request guard tied to
the owned worker. Once that listener releases its port, another local process can answer
the same localhost origin; the old window can reload or reconnect with its existing session.
HttpOnly protects JavaScript access to the cookie; it does not authenticate the new listener.

**Evidence:** `main-authority-review.test.ts` initially failed both stop and worker-loss
window revocation tests at 20:30:41 local time, with `isDestroyed()` still false. The
same tests passed after root added exact local-window tracking, revocation on draining/
failure, and an outgoing local-origin ownership gate. The separate remote window remains
open. This is a source-and-handler reproduction; live cookie interception was not performed.

**Fix seam:** `main.ts` host transition callback and `openGame`. Revoke local documents
before the listener is released; block requests while its host is not proven ready. Keep
the legitimate persistent session for a subsequent authenticated start and leave remote
windows independent. Root's correction is present and the two focused tests are green.

### DSK-R2 — HIGH — navigation can discard the sole first-login credential

**Trigger:** first GM setup commits in `host.setup`; the management document reloads
before the private setup response reaches Main. Main's first post-await authority assertion
then throws before installing the returned cookie. The identity already exists, so the real
host's empty-world bootstrap guard rejects another setup. There is no existing campaign GM
enrollment path for this brand-new, not-yet-authenticated world.

**Evidence:** the fifth `main-authority-review.test.ts` case resolves a committed first-login
receipt after an actual Main navigation event. Main correctly rejects the stale UI response,
but `cookies.set` and `flushStore` are never called. This test was red at 20:32:59. The
server facade's transaction and existing-user rejection substantiate the committed side
of this boundary. No second identity is proposed as a workaround.

**Fix seam:** distinguish the UI navigation lease from the bound profile's private setup
completion. Persist/reconcile the receipt only for its original profile/session even when
the UI reply becomes stale; never open a game from that stale completion. Cookie-install
failure and delayed worker replies also need a deliberate private recovery path. The
90-second baseline controller timeout also removed its pending ID, so a later successful
setup receipt was discarded as well. A state change alone would not recover that credential.

**Re-verification:** Main now completes cookie installation and `flushStore` for the captured
original profile/session before checking the UI lease; the stale view still receives failure
and opens no game. The real controller persists the private successful receipt before
resolving Main, and retains timed-out requests to process late replies. Profile storage
encrypts a profile/origin-bound receipt through the existing OS box, syncs its temporary
file, then renames it. On explicit profile start, Main reads that receipt and restores the
same session before clearing the exact matching receipt. Cookie installation or flush
failure leaves the receipt available. Navigation and late-response regressions are green;
the cross-profile ciphertext replay test also passes.

### DSK-R3 — MEDIUM — timed-out requests retain ready authority

**Trigger:** a mutating worker request has no reply within 90 seconds. The initial timeout
callback rejects and forgets its pending ID, but leaves `state=ready` and `ready` intact.
Main releases its operation lock, allowing subsequent requests while the prior mutation's
completion is unknown. After a failed drain, the initial controller also retains Ready and
accepts new `request()` calls.

**Evidence:** two `controller-lifecycle-review.test.ts` cases are red against the baseline:
ready survives setup timeout and the controller forwards a new enrollment after drain
failure. The worker/host facade already rejects operations once its own close begins;
the latter test is a controller-admission failure, **not evidence that the real worker
commits an enrollment after draining**. The stronger timeout case applies while the
worker is still running an ordinary mutation and has not begun close.

**Fix seam:** `HostController.request` timeout/admission and stop failure transitions.
Withdraw Ready and invalidate dependent authority on indeterminate completion. Preserve
the owned process and lock and allow only explicit stop or reconciliation until resolved.
Do not kill an active mutation or call its timeout a successful stop. Coordinate first-login
receipt recovery with DSK-R2.

**Re-verification:** timeout now withdraws Ready, transitions to failed, and rejects new
ordinary controller operations while allowing explicit drain. A late setup response is
persisted without restoring Ready. Private response processing is serialized so a setup
receipt is saved before a subsequent stop response can release the lock. Failed drain
keeps Ready withdrawn. All three independent controller cases and the author's additional
late-receipt case pass.

### DSK-R4 — MEDIUM — a rejected pool-close promise permanently poisons stop retries

**Trigger:** HTTP drain succeeds but `db.close()` rejects once. `host.close()` stores the
combined rejected promise forever with `closing ??= ...`. Every explicit retry returns
the original error without calling the pool closer again. The desktop stays open and the
profile stays locked even when the injected transient condition is gone.

**Evidence:** `host-shutdown-review.test.ts` uses the real facade with a one-shot pool-close
failure; the second close rejects instead of resolving, with no second pool-close call.
Its independent countertest verifies that an unsuccessful HTTP drain must not close the
pool or reopen the facade for commands.

**Fix seam:** permit a retry of final pool closure while keeping the facade closed to new
commands and sharing concurrent stop work. Root's correction retries the combined close;
a direct local Fastify check confirmed two `close()` calls both resolve while the `onClose`
hook runs only once. The regression therefore checks successful pool retry, not an
unnecessary exact count of facade `app.close()` calls. This is a controlled fault-injection
result, not a claim that the actual pg pool failed in the supplied executable smoke.

## Other boundaries inspected

- Actual Main handlers reject an impostor WebContents with the same URL, a subframe,
  and a capability from an earlier main-frame navigation. Status polling does not release
  the awaited dialog operation lock; stale dialog completion creates no profile.
- Game and remote windows have no management preload and use per-origin sessions.
  Main-frame and exact-origin media checks are present. Real permission dialogs, devices,
  screen capture, certificate failures and media-track teardown were not exercised here.
- Profile creation requires the OS secret box, generated IDs and isolated port allocation.
  The existing profile tests cover ciphertext persistence and live-lock refusal. Static
  review found no renderer-controlled filesystem path or process command. Windows
  junction races, stale-lock concurrency and PID reuse were not live-tested.
- PostgreSQL admission verifies runtime hashes, exact process executable/data directory,
  authenticated SQL directory/port/version/listen settings and SCRAM-only rules before
  management. Unconfirmed worker drain does not stop PostgreSQL, kill the worker, or release
  its lock in the targeted countertest. Real PG crash/recovery remains separate evidence.
- Build/package scripts source the desktop resources and sharp dependencies. They do not
  deliberately include checkout configuration or profile directories. The unsigned,
  unpacked package and absent release fuses/ASAR integrity are documented limitations;
  this review does not turn the package into a signed distribution or prove a secret scan.

## Regression files and rerun command

- `packages/desktop/test/main-authority-review.test.ts`
- `packages/desktop/test/controller-lifecycle-review.test.ts`
- `packages/server/test/host-shutdown-review.test.ts`

```powershell
npm.cmd exec -- vitest run packages/desktop/test/main-authority-review.test.ts packages/desktop/test/controller-lifecycle-review.test.ts packages/server/test/host-shutdown-review.test.ts
```

The first root TypeScript run reported only the already-known parallel
`packages/szene/src/sichtmaske.ts` readonly assignments at lines 51 and 80. The final
root TypeScript recheck at 20:45 passed with no errors.

## Final re-verification

The complete three-file review run passed **10/10 tests** at **20:40:33 local time** and
again at **20:45:13** after the required migration-admission constructor hook landed.
Test fixtures added the newly required asynchronous `readSetupReceipt` and
`clearSetupReceipt` methods and an explicit test-only `beforeSchema` adapter; the review
assertions were preserved. Production supplies the real required callback, awaits it
after owned PostgreSQL start and before worker creation, and creates a recovery point
when migration admission requires one. The helper implementation itself remains outside
this authority review. The author's
`setup-receipt.test.ts` and `profiles.test.ts` then passed **3/3 tests** at **20:41:02**,
covering late setup persistence without renewed authority, private storage and refusal
of replay into a different profile.

Source inspection confirms restart reconciliation is called after authenticated profile
start and uses the captured original origin; clearing happens after cookie-store flush.
This review did not run a whole Electron process restart with a pending receipt, actual
DPAPI failure, disk-full injection, or a worker/Main crash between SQL commit and receipt
delivery. In particular, durable storage of a received reply does not establish atomic
recovery for a process lost before any reply arrives. Those fault cases and refreshed
executable-level smoke remain runtime acceptance work, outside this focused approval.

After recovery listing was added to Main's snapshot, the Main fixture was also updated
to mock `RecoveryStore.list` and `inspectMigrationAdmission`. Main/controller then passed
**8/8 tests at 20:46:49**. Inspection found the preceding 20:45 run had created only the
empty directories `C:\test-only-unused-profile` and its `recovery` child through the newly
integrated listing. Root was alerted and the directories were preserved; no files or
operative profile data were present. The new mock removes that filesystem side effect.
Mandatory production ordering remains: owned PG start, awaited required admission callback,
awaited recovery creation when admission requires it, then worker creation and migrations.

## Independent second round: durable setup and explicit update application

Reviewed on 2026-09-06 against the supplemental proposal beginning at
`desktop-shell-20260906.md:228`. This is a design review only: no product edits, tests,
build, download of executable artifacts, installer, browser or database operation was
performed. Root's newly supplied development and standalone 10/10 smoke results, including
V5 and identical-credential recovery, remain supplied runtime evidence, not reruns here.

**Verdict: adopt the selected approaches with binding corrections F1–F8 below.** They are
sufficiently specified to proceed with reversible implementation once root records adoption
of this second round. They do not yet admit installer application or public distribution.
None of the corrections calls for another user permission round: full desktop implementation
is already authorized. Missing signing credentials, a production publisher identity and an
operated feed are explicit operational inputs, not reasons to stop local implementation.

### Candidates and adequacy of the second round

| Decision | Independent assessment |
|---|---|
| Transactional encrypted SQL outbox | Strong alternative: identity and recovery response share one durable commit, with no transaction waiting on Main. Its operating table, key contract and bundle exclusion are real work, but the existence of a new table alone is not a reason to reject it. Retain it as the fallback if the selected handshake cannot pass bounded crash tests. |
| Ordinary SQL transaction waiting for a durable Main receipt | Adopt for this one-time local operation: avoids a new permanent SQL contract, while making possession of the receipt a prerequisite to commit. Its cost is holding the setup lock and SQL connection while Main persists; an explicit deadline and restart reconciliation are therefore mandatory. This is an ordinary transaction, not PostgreSQL `PREPARE TRANSACTION`. |
| Direct `autoUpdater` download followed by a later Apply dialog | Reject for the chosen recovery boundary. Electron documents automatic download and application on a subsequent start; a late UI dialog cannot be the sole installation gate. [Electron autoUpdater](https://www.electronjs.org/docs/latest/api/auto-updater) |
| Private bounded staging followed by an admitted local Squirrel feed | Adopt. Squirrel remains the installation engine; our code controls admission and artifact trust. The local feed must be a closed package set, not a pointer back to an arbitrary remote feed. |

The proposal supplies two materially different candidates at each consequential seam;
this independent attack pass supplies round two. Root may record adoption of the proposal
plus this appendix as one decision. A production installer test must still prove the
behavior of the exact pinned Squirrel binary; the cited moving upstream branch is research
evidence, not that proof. Pins and dependency installation remain root's checkpoint work.

### F1 — bind the setup protocol and make the durable callback mandatory

The desktop setup entry point must require its persistence callback in the type and runtime
contract. An optional argument with an accidental Desktop omission must not silently invoke
the old commit-before-receipt behavior. The normal web adapter can retain its existing
behavior through a separate explicit entry point or mode; no renderer chooses that mode.

Persist the complete versioned tuple: profile ID and original origin, worker start ID,
operation ID, prepared user ID, credential ID, credential value and expiry. The Ack binds
the operation and a digest of the exact prepared receipt; it conveys no general command
authority. Check the concrete worker instance as well as start ID. One outstanding prepare
exists per setup operation. Ack handling bypasses only that operation's wait, and never
the ordinary command admission queue. Reject unknown fields, duplicate terminal messages,
foreign worker/operation IDs and acknowledgments arriving after the prepare is closed.
No UI dialog, download, cookie installation or user input occurs inside the SQL transaction.

### F2 — define the commit boundary, deadline and crash outcomes precisely

Parent loss implies rollback only while the worker has not accepted the matching durable
Ack. After that acceptance, a COMMIT may already be in progress or complete: report an
indeterminate outcome and reconcile. Never promise rollback merely because Main or its
final response disappeared. A prepared receipt is evidence of recoverability, not of commit.

The worker needs its own bounded Ack timer and terminal-state transition; Main's existing
90-second request timer is insufficient. Do not rely on an invented `parentPort` disconnect
event: the documented API lists its message event. A timer and a transaction-scoped SQL
timeout must make a lost parent release the setup lock even if the utility process survives.
Select and test the exact timeout relationship so a late Ack cannot reopen an expired
transaction. [Electron parentPort](https://www.electronjs.org/docs/latest/api/parent-port),
[PostgreSQL 17 transaction and idle transaction timeouts](https://www.postgresql.org/docs/17/runtime-config-client.html)

Reconciliation must acquire the **same** setup advisory lock and wait for the previous
transaction to resolve before authenticating or deciding that the world is empty. Require
the existing authenticator to return the prepared user and credential IDs, with normal
revocation/expiry checks. A negative authentication result plus existing users preserves
the receipt and shows an explicit login/recovery state. Delete an uncommitted receipt only
after locked proof of an empty world; no inferred replacement GM or renewed credential.
After successful authentication, install into the original partition, flush, then delete
only the exact receipt. A crash at any step must leave a repeatable reconciliation path.

Process-death tests must kill owned processes at every proposed boundary and also cover
loss after receipt rename but before Ack, Ack deadline racing persistence, an orphaned
worker holding the setup lock, rejected COMMIT, expired/revoked credentials and a late
duplicate prepared message. Disk synchronization and rename support the selected
process-death contract; they are not by themselves a measured power-loss guarantee.

### F3 — close the signed manifest and download contracts

Before implementation, fix the signature algorithm, key IDs and exact signed-byte format.
A fixed algorithm with a domain-separated signed UTF-8 payload is sufficient; no
manifest-supplied algorithm or trust key is accepted. Reject ambiguous JSON/duplicate keys,
duplicate artifact names and unknown fields. Bind the installation package ID as well as
display product, release channel, architecture, app version, PG major and schema contracts.
Use a real version ordering and a release sequence/freshness policy: signed old metadata
must not lower the highest accepted release or silently enable a downgrade. Key rotation
requires trust rooted in the already-pinned key; missing metadata means no update.

Define exact artifact classes and **both** per-file and aggregate byte limits. Enforce the
streamed byte count, deadlines and cancellation independently of Content-Length. Bound
decompression/installed-space requirements as well as compressed download space, including
space for staging, the old version and recovery. Disable redirects and reject non-success
responses; use an updater context without game cookies or bearer credentials. File names
must also exclude Windows reserved names, alternate streams, trailing dots/spaces, encoded
separators and case-insensitive collisions. Revalidate regular files, containment and hashes
when Apply consumes staging, not only when download finishes. Cancellation before handoff
has no Squirrel side effect; cancellation after handoff is an uncertain installation state,
not permission to kill arbitrary processes or delete installation files.

### F4 — the local Squirrel feed must contain exactly the admitted release

The staged Squirrel `RELEASES` file is part of the trust boundary. Generate it from admitted
bytes or verify its complete parsed contents against the signed manifest; permit only the
selected full package and local simple filenames. Reject alternate package IDs/versions,
delta entries, base URLs, undeclared packages and leftover staging files. Squirrel's own
release hashes do not replace the manifest SHA256/signature binding. Keep all of this
outside Squirrel's active package tree until Apply admission is durable.

Specify signature coverage per artifact. The signed manifest binds the `.nupkg` and
`RELEASES` bytes; do not pretend a NuGet ZIP is an Authenticode PE. Verify the actual shipped
application, updater and installer executable signatures and expected publisher under a
defined timestamp/expiry/revocation policy. Check the exact installed `Update.exe` hash and
publisher before executing it. The updater may update itself, so its successor must be
covered by the admitted release too. No fallback to a network URL or a freshly fetched
helper is allowed after admission. The installer tool documents signing of application
and installer executables; the precise pinned tool output still needs inspection.
[electron-winstaller signing documentation](https://github.com/electron/windows-installer#advanced-codesigning-with-electronwindows-sign)

### F5 — freeze the whole installation and define the backup sequence

Apply exclusion is installation-wide, not merely a lock on the selected profile. Other
instances or userData directories can still use that installation's PG/runtime files.
Prevent new starts across that installation while an Apply receipt is unfinished and prove
all relevant owned workers/PG processes have stopped. Unknown process ownership blocks
Apply; it never authorizes a broad process-name kill. An inactive profile need not be
migrated as part of an app update; its existing mandatory pre-schema recovery gate remains.

Use an explicit sequence: freeze commands and resolve setup receipts; drain all admitted
application work and close its SQL pool; while only a verified owned PG remains, create
and verify a recovery point of the settled profile; close backup connections; smart-stop
that PG and confirm stop; persist Apply admission; only then invoke Squirrel. Reopening
owned PG solely for the backup is acceptable if the host has already fully stopped, provided
no game or migration starts and it is stopped again. A dump taken before the last accepted
write is not the admitted recovery point. Keep the recovery outside the installation tree.

### F6 — make installation intent durable before any installer side effect

Store a versioned, authenticated Apply journal outside the replaceable install directory.
Bind installation identity and canonical root, operation ID, actual old artifact identity,
selected signed manifest digest, new artifact hashes, affected profile, verified recovery
identity/hash/schema and phase. Persist an `installing` intent **before** spawning Update.exe;
record updater exit separately from verification of the subsequent app launch. A journal
write or verification failure forbids the dependent side effect.

All normal starts, including old binaries that remain installed, must inspect unfinished
intent before acquiring a profile or running migrations. Authenticate the current packaged
code/runtime and compare it with the intended old/new release; a version string alone is
not installation proof. Do not delete or advance a receipt on mere process spawn. A crash
after replacement but before a completion record must be reconcilable from the durable
intent and actual artifact state. Missing/corrupt state and a still-running updater yield
a visible blocked Apply state, not an automatic rollback, reinstallation or profile start.
Any explicit rollback pairs compatible code with recovery into a new profile. Preserve
the old recovery point until post-update authentication and semantic data verification pass.

### F7 — prove actual installer target resolution and identity isolation

Bind package ID, application ID, executable name, userData root, signing/test identity and
canonical installation root. Resolve every path through the exact chosen Squirrel binary's
behavior and reject junction/symlink escapes; a chosen working directory is not target proof.
The current upstream implementation can derive the root from the location of Update.exe
and its package name, and a full install removes an existing target directory. This supports
the proposal's caution but does not verify the later pinned binary.
[Squirrel target resolution](https://github.com/Squirrel/Squirrel.Windows/blob/develop/src/Squirrel/UpdateManager.cs),
[Squirrel install/update behavior](https://github.com/Squirrel/Squirrel.Windows/blob/develop/src/Update/Program.cs)

The unsigned local test build must use a fresh distinct identity across those fields and
a verified unused destination; preserve the production installation and all profiles.
Use update mode for a tested existing installation, never a full-install shortcut.
Handle installer lifecycle arguments before any profile work. A normal administrator-account
test does not establish standard-user installation; that remains its own actual test.

### F8 — verify outside-ASAR code before loading it, and state the real guarantee

Package protected JS and its manifests into ASAR. Verify shipped native modules, their
non-system DLL dependencies, PG executables and all externally stored SQL/resources
**before** native require, spawn, migration or serving those bytes. A top-level native
`sharp` import that runs before the protected resource verifier is not admitted. A hash
stored next to the resource being checked is not its trust anchor. Provide no checkout or
source fallback. Exercise the exact fused utility worker and all copied resources.

ASAR integrity requires the embedded header digest plus both integrity validation and
OnlyLoadAppFromAsar. Set fuses and embed resources before final code signing, then read back
the final packaged binary and test manipulated copies. Distinguish detection before the
affected code loads from a complete startup scan: if the requirement is rejection of
*any* changed archive byte before operational startup, add an explicit complete verification
before profiles/windows start. ASAR checking is not protection for an arbitrarily replaced
EXE or all external native files. [Electron ASAR integrity](https://www.electronjs.org/docs/latest/tutorial/asar-integrity)

Keep cookie encryption enabled in both test versions and any compatible rollback version;
Electron documents enabling it as a one-way transition. Do not test a rollback by silently
turning the fuse off against the same cookie store. The proposed disabled RunAsNode,
Node-options, inspector and file-privilege fuses are consistent with the selected utility
process/custom-protocol design. [Electron fuses](https://www.electronjs.org/docs/latest/tutorial/fuses)

### Admission boundaries and next evidence

| Boundary | What permits the next step |
|---|---|
| Reversible implementation | Root records adoption of the proposal plus F1–F8, assigns shared seams and completes its checkpoint before dependency changes. No additional user confirmation is required. |
| Setup commit in Desktop | Exact active prepare binding, durable original-profile receipt and valid matching Ack before the worker deadline. Otherwise rollback or explicit indeterminate reconciliation; never a synthetic success. |
| Download to private staging | Verified bounded manifest with configured trust, compatible release and closed filenames. This authorizes no Squirrel change, host stop or installer execution. |
| Local test installer | Exact tool pin and binary identity, fresh test product, proven own target, preserved production state and frozen installation-wide process scope. |
| Apply | F3/F4 artifact and local-feed verification plus F5 settled recovery/stop evidence and F6 durable intent. Any failed prerequisite prevents the updater spawn. |
| Update completion | Actual installed artifact/runtime identity, compatible schema, successful original user/credential authentication and unchanged campaign semantics; process exit alone is insufficient. |
| Public signed distribution | Real publisher/signing credentials and timestamping, pinned production manifest key, configured operated HTTPS feed, tested revocation/key rotation and outstanding release/device/accessibility gates. Test keys prove only the local test channel. |

The next attack cases must first be red where they expose missing behavior: all setup crash
boundaries and stale/foreign Acks; revoked/expired restart receipt; bad signature or metadata
replay; changed files between verify and Apply; injected RELEASES URL/package; missing space;
recovery/drain/PG-stop failure; second instance using the same install; corrupt or lost Apply
journal; death before/after updater spawn/replacement; wrong target; native import before
hash admission; ASAR tamper and cookie-encryption-compatible rollback. Then run two real
isolated local package versions and record exact target and artifact identities. This is
the binding route to implementation and admission, not a claim those tests already passed.
