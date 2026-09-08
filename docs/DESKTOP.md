# Desktop and the managed local host

The Windows x64 desktop now implements a genuine local-world vertical slice: Electron
starts its own PostgreSQL 17 cluster, runs the existing Fastify application in an Electron
utility process, and opens a byte-for-byte copy of the existing web client. There is no
development server, runtime TypeScript loader, Docker prerequisite, or second production
database. This is an implementation milestone, not the completed M8 release gate.

## Build and run

Use the locked workspace install and an already built web client. Desktop builds do not
rebuild that client. The following commands run from the repository root:

```powershell
npm.cmd ci
# Electron 44 uses an explicit installer command if its executable is absent:
node node_modules/electron/install.js
# Prepare the pinned PostgreSQL runtime as described below, then:
node packages/desktop/tools/prepare-runtime.mjs
npm.cmd run build
npm.cmd run desktop:build
node packages/desktop/tools/launch.mjs
```

The launcher removes inherited `ELECTRON_RUN_AS_NODE`, Node execution hooks, and checkout
database settings. A normal launch stores its profiles under Electron's `userData`.
The management window offers new world, continue, first GM setup, stop, separate HTTPS
server connection, and native campaign restore into a newly allocated empty profile.
After restore, explicitly choose the historical GM and redeem the one-use pairing code in
the ordinary game login. Import does not grant a browser credential or enable public hosting.

Closing a running host offers cancel, orderly stop, or visible tray background operation.
Only the host that the application started and authenticated is managed. Active HTTP work
and WebSockets drain through the existing server lifecycle before its SQL pool closes and
PostgreSQL receives smart shutdown. Drain immediately closes authenticated local game
windows, before releasing their listener. Worker loss does the same; queued local requests
are denied while the private host is unavailable. Remote windows and legitimate persisted
sessions remain intact. A timeout or failed drain withdraws Ready and permits an explicit
stop retry while retaining the owned worker, PostgreSQL and lock until closure is proved.

## Device-bound recovery

The management action **Welt beenden und sichern** drains the selected host and creates a
custom PostgreSQL dump before stopping its owned database. A recovery point under
`userData/recovery/<id>` contains the fixed files `database.dump`, `secrets.dpapi`,
`profile.json` and `recovery.json`. Its closed manifest binds the original profile/origin,
application and PostgreSQL versions, migration checksums, identity/credential/campaign
counts, byte sizes and SHA256 hashes. HMAC authenticates the complete manifest using the
original DPAPI-protected signing key. The dump contains sensitive host data; the entire
recovery directory remains local and must be protected as profile data.

Restoration verifies the full point before allocating a new profile, initializes a new
empty cluster, restores in one transaction, checks counts and schema, and preserves the
original cookie-signing key while retaining the new database password. The existing
browser credential is copied privately to the new profile's isolated browser session.
The live test confirms the same credential ID authenticates after recovery. No cookie
value is returned through management IPC and no existing world is emptied.

Before an existing profile receives a pending packaged SQL migration, the controller
requires a verified recovery point while the application listener is stopped. Unknown or
changed previously applied migration checksums reject startup. An older executable alone
is not a database rollback. A compatible recovery point must be restored into a new target.
Fresh empty clusters do not require a meaningless pre-initialization backup.

These recovery points depend on the same Windows account and its DPAPI state. They are
distinct from the portable native campaign export, which excludes credentials and uses
separate historical-GM enrollment. A portable encrypted full-host format is not delivered.

## Pinned runtime and resources

| Component | Pin |
| --- | --- |
| Electron | 44.2.0; actual utility-process Node 24.20.0 |
| PostgreSQL | EDB Windows x64 17.11-1 binaries |
| Native decoder | existing sharp 0.35.4 |
| Desktop compiler | esbuild 0.25.12 |
| Local packager | @electron/packager 20.3.0 |
| Local installer | electron-winstaller 5.4.4 (Squirrel.Windows) |

PostgreSQL's [Windows download page](https://www.postgresql.org/download/windows/) links the
EDB binary distribution intended for embedding. The explicitly selected archive is
[postgresql-17.11-1-windows-x64-binaries.zip](https://get.enterprisedb.com/postgresql/postgresql-17.11-1-windows-x64-binaries.zip).
Its downloaded SHA256 is:

```text
6eabdf00d2893713b75db4336a23c3fdf505f056e217ec6e2e95d901750cfea3
```

Place that archive in `.local/desktop-runtime/`, verify the hash, and extract only `pgsql/bin`,
`pgsql/lib`, `pgsql/share`, `pgsql/server_license.txt`, and
`pgsql/commandlinetools_3rd_party_licenses.txt` into the same directory. The checked runtime
contains 1,565 files. `prepare-runtime.mjs` rechecks the archive before generating the manifest;
every start checks its version/source contract and each selected file hash. No renderer can
provide a runtime URL, archive path, executable, database URL, or arbitrary filesystem path.
This observed archive checksum is a build pin; public distribution still needs a signed
artifact trust chain.

Build resources contain the unchanged SQL migrations, copied web distribution, and licensed
local map asset packs. The build maps the generator's source-relative resource URLs to their
packaged resource location, verifies the copied manifest and all declared asset/license
hashes, and records client/worker/runtime/resource hashes in `dist/build.json`. It leaves the
generator source unchanged. The production bundle removes the unused PGlite test-adapter
import. Native sharp and its DLLs remain ordinary unpacked files.

## Boundaries

Profiles use generated IDs and persistent HTTP/PG ports from 41000–60999, excluding the
operative development port 54329. HTTP binds only 127.0.0.1 and uses the stable
`http://localhost:<port>` origin. The worker's private start-ID response must match the
requested origin before the game is opened; an HTTP 200 from another process is never
accepted as ownership. PostgreSQL ownership requires matching Windows executable, exact
normalized `-D` argument, postmaster file, authenticated server data directory, port, patch
version, loopback listen address and SCRAM rules. A stale PID alone never authorizes a stop.

The packed `chronicle-shell://app` management session has a separate preload. Each native
request checks the concrete registered WebContents, main frame, exact page, private
preload capability, closed command schema, and current navigation/profile lease. A single
operation lock spans awaited dialogs and host operations. Status polling cannot release it.
The shared game and remote windows have no management preload or process/file/restore IPC.
All windows enable sandbox, context isolation and web security and disable Node integration.

Profile passwords and cookie keys are random, persisted through Windows `safeStorage`, and
never returned to game JavaScript. Missing OS encryption blocks setup. Main installs the
first-setup cookie directly into the game's isolated session with the existing
HttpOnly/Secure/SameSite=Strict flags. Successful private setup responses, including late
responses after a management timeout, are durably retained for their original profile.
Reloading the management document rejects its stale UI operation while still flushing
the committed session to the original partition. A later start reconciles the encrypted
receipt. Process death between the database commit and receipt delivery remains a separate
open failure case; the proposed durable transaction receipt is under review.
Remote origins must be HTTPS without credentials,
path, query or fragment. Cross-origin navigation is blocked; an external HTTP(S) link needs
a separate system-browser confirmation. Certificate validation is unchanged.

Microphone/camera permission requires the known game frame/origin and an explicit dialog.
Screen sharing presents actual available source names and requires a current user gesture;
navigation invalidates pending grants. These implemented controls still need real Windows
device, screen-picker and NVDA acceptance. An automated browser cannot supply that evidence.

## Verification and artifacts

```powershell
npm.cmd exec -- vitest run packages/desktop/test packages/server/test/host.test.ts
node packages/desktop/tools/smoke.mjs
node packages/desktop/tools/package.mjs
node packages/desktop/tools/installer.mjs
```

The isolated smoke allocates a unique child of `.local/desktop-profiles`, leaves development
configuration and databases untouched, and records JSON plus manager/game screenshots there.
It uses an actual Electron main/utility process, actual DPAPI, PostgreSQL and sharp. Only the
native open-file dialog selection is supplied by the harness; validation, new-target restore,
enrollment and login follow the production path.

The smoke imports the packaged ERON source, checks its 190 Andaria places and fetches and
decodes the actual 8192 × 8192 WebP image. It generates painted fantasy interiors and
Zeitwelten interiors for both modern and science-fiction settings through the packaged
HTTP host, checking the saved artwork pack.
It checks the Schmiede overview and all seven workshop entrances before opening
**Regeln** and activating the HTBAH template. It validates exports with the current native
bundle reader, including checksums, generated map nodes and rule attribution. Restart,
device recovery and campaign restore must preserve the content hash and all campaign tables.
The observed envelope version is recorded in the evidence rather than fixed to V5. First
setup and reopened game windows have a 90-second budget; reopen durations are recorded,
and cleanup waits for a pending management action before requesting orderly shutdown.
These checks apply to the newly built executable; the earlier artifact records below are
historical.

On 2026-09-08 the expanded compiled-desktop smoke passed **15/15** checks at
`.local/desktop-profiles/smoke-a86d61f85d7142b7/evidence.json`, including native V6 exports,
all three extra asset probes, Andaria image decoding and both restore paths. Its screenshots
are `forge-overview.png`, `manager.png` and `game.png` beside the evidence. All owned hosts
stopped cleanly. This run exercised the compiled desktop distribution, not an installed
release. A separate long-profile-path recovery check found that libpq cannot read the
original 261-character absolute password-file path. Using its basename with a profile-local
working directory also failed. The unique shorter profile-local name
`pg-<32 UUID hex digits>.tmp` reduced the same path to 242 characters and completed the real
backup; both counterchecks are recorded in
`.local/desktop-profiles/smoke-1788856132565-b6d2802f/recovery-{relative,short}-pgpass.json`.
The same directory's `window-timing.json` records a separate native loading delay: window
creation and `did-start-loading` were immediate, while `dom-ready` and `did-finish-load`
arrived about 30.5 seconds later. The longer smoke budget accommodates that observed runtime
latency; it does not establish its cause or meet a startup-performance target.

On 2026-09-06 the focused baseline passed **33 tests in nine files** and root TypeScript,
including independent main-authority, failed-drain, shutdown-retry and late-setup-receipt
regressions. This is a focused desktop/server-host result, not a full M8 gate claim.

The historical 2026-09-06 development and standalone executable runs both passed **10/10** checks:
`.local/desktop-profiles/smoke-1788720754713-4eb9504a/evidence.json` and
`.local/desktop-profiles/smoke-1788720879254-5ea2d23b/evidence.json`. They cover actual PG17,
Electron Node24/sharp, the real licensed Grundriss generator, shared-client installation
and activation of the attributed HTBAH V2 rules, native V5 export, first setup, sandbox and
cookie flags, complete stop/restart, and unchanged campaign hashes. Full management
recovery into a new profile preserves the exact original credential; native V5 campaign
restore instead proves historical-GM enrollment, one-use redemption and equal reexport.
All three owned clusters per run were smart-stopped. A subsequent Windows process query
found no PostgreSQL process associated with desktop test profiles.

The isolated recovery helper additionally passed **3/3** checks at
`.local/desktop-profiles/recovery-1788719430846/evidence.json`: refusal while the application
listener is live, tampered-manifest refusal before destination creation, and real HTTP
authentication with the exact original credential after recovery into a new cluster.

The historical artifact tested on 2026-09-06 is
`.local/desktop-artifacts/2026-09-06T18-53-43-212Z/Atlas Chronicles-win32-x64/`,
**563,751,412 bytes** as an unpacked directory. Its executable SHA256 is
`774a608e1aad25bcd2eaace765788fbceb294a49bce0a38c5de4f7fc251b8409`.
The executable hash alone does not identify separately unpacked application resources;
the adjacent artifact record also records the main, worker, build and client index hashes.
This measurement is not an installed-volume, RAM, startup-budget or signed-release result.
Earlier artifacts and smoke runs are historical, superseded by the independent lifecycle
review fixes and the recovery integration in this artifact.

The package command creates a new, explicitly **unsigned, unpacked local Windows application**
under `.local/desktop-artifacts`. Its adjacent `artifact.json` records every packaged file's
relative path, byte size and SHA256 in `files`, the total byte count, executable hash and open
release gates. Links and non-regular files are refused. Dependency versions and licenses are
recorded in the packaged `DEPENDENCIES.json`. The package command does not create a signed installer,
publish a release, or claim a tested updater. A packaged smoke can select that executable with
`--executable=<absolute AtlasChronicles.exe path>`; its CLI test profile override remains confined
to a child of `.local/desktop-profiles`.

## The local unsigned setup

`node packages/desktop/tools/installer.mjs` (`npm run desktop:installer`) wraps an already packaged
and recorded artifact, without rebuilding it, into an explicitly **unsigned, per-user Squirrel
setup** under `.local/desktop-artifacts/<stamp>/installer/`. Before invoking Squirrel it checks
the complete file inventory, total byte count and executable hash. Changed, missing, extra or
linked resources are refused, as are legacy artifact records without the complete inventory.
`tools/test/desktop-artifacts.test.mjs` covers this admission boundary.
Squirrel remains the adopted Windows packaging
base; the pinned build tool is `electron-winstaller@5.4.4`. This step delivers only the local,
unsigned form: it configures no update feed, claims no tested updater, and sets no release fuses.
`installer.json` beside the setup records the tool pin, both hashes, the size and the open gates.

Electron's executable carries Squirrel's `SquirrelAwareVersion` resource, so Squirrel delegates
shortcut handling to the application and creates none itself. Answering the lifecycle argument by
quitting alone therefore installed an application with no start menu entry at all. `main.ts` now
hands `--createShortcut` / `--removeShortcut` to the update binary resolved from its own installed
layout, still before any profile work, and `test/squirrel-lifecycle.test.ts` pins both directions.
The tool's nuspec template is an allow-list that omits `LICENSES.chromium.html`, so the installer
supplies that file explicitly; without it the installed application ships no Chromium notices.
Electron's `version` marker stays absent on purpose: the application reads its own `build.json`,
and a second version source inside the package is the drift `gate:version` exists to prevent.

On 2026-09-07 the setup was built and installed on this machine: **214,446,592 bytes**, setup
SHA256 `976fed38de2f080d377d4d25a647ef526e316a2a4cdb64a688804cf3cd8cb0fd`, over the
564,494,760-byte artifact whose executable SHA256 is unchanged at `774a608e…`. The silent
installation produced `%LOCALAPPDATA%\AtlasChronicles\app-0.1.0` carrying that recorded executable
hash, both the start menu and the desktop shortcut, and the Chromium notices. Uninstallation
removed both shortcuts and left Squirrel's usual locked remainder behind a `.dead` marker.

Run the setup from an ordinary shell or Explorer. Squirrel passes its own environment to the
lifecycle invocation, so an inherited `ELECTRON_RUN_AS_NODE=1` — which Electron-based terminals
such as VS Code export — makes the application start as plain Node, reject `--squirrel-install`
as a bad option and exit 9. Installation itself still succeeds, but silently without shortcuts.
The launcher and the smoke already strip that variable; the installer path cannot, because the
process is Node before any of our code runs. Measured, not assumed: the same setup installed
without shortcuts under that variable and with both shortcuts once it was cleared.

Against that installed executable the smoke passed its own PG17/migration/sharp check and the real
licensed Grundriss generator route, then failed on two properties of the current working tree
rather than of packaging: its 30-second window wait is too short for first GM setup on this
machine, and its `bundle.version` assertion still expects 5 while the tree exports 6. The
development Electron fails identically, which is what separates the two causes. This is expressly
not a 10/10 result, and the setup is not a signed release.

## Remaining M8 work

A local unsigned per-user setup now exists and is described above; it is a first-install path and
performs no drain, recovery point or migration admission before replacing files. The installer and
update state machine around it, the signed Windows installer and configured update feed,
release ASAR/fuses, process-death bootstrap reconciliation, real pre-migration failure
injection, and full failure-injection/independent review remain to be delivered. Device-bound
recovery and the mandatory pre-migration guard are implemented; their normal live recovery
path and the pure schema admission cases have the scoped evidence above.
The existing portable campaign export excludes credentials and is not a full host backup.
No UI labels it as such. NVDA, Windows Hello, actual media devices, sleep/wake,
OS reboot, installation without admin rights, and measured installed/idle/load budgets remain
explicit acceptance gates. LAN/self-host HTTPS topology remains P11; the local host does not
configure DNS, certificates, firewall, router, TURN or a relay.

The adopted [desktop design and attack rounds](../design/iterations/desktop-shell-20260906.md)
remain the full scope; this milestone does not replace them with a wrapper.

The historical standalone artifact record above was manually enriched with four application
resource hashes. New packages instead record the complete `files` inventory automatically,
and the installer verifies that inventory before packaging. An old executable hash or the
four historical hashes alone no longer satisfies this check; package the current build again.
