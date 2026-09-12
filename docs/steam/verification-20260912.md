# Steam preparation verification — 2026-09-12

Status: local preparation and native qualification passed. Native qualification
found stale migration content in the first merged artifact; the corrected,
rebuilt and staged candidate passed all 29 native smoke checks. Steam launch/release
acceptance remains open. No account access, SteamCMD, upload, payment,
publication or external message occurred in this work packet.

## Corrected candidate — local native qualification

Root rebuilt the desktop from clean generated output and packaged
`.local/desktop-artifacts/2026-09-12T21-34-05-811Z`, then successfully staged it
as `.local/steam-staging/steam-qualified-20260912`. This candidate passed local
native qualification; both earlier stages below are superseded and retained as evidence.

| Measurement | Observed value |
| --- | --- |
| Application version / platform | 0.4.3 / Windows x64 |
| Files / bytes | 2,619 / 575,200,944 |
| Source `artifact.json` SHA256 | `660908ccdaa46480f2b948aedb337f35d25455e7c829a1ddc833f607bc7b15e5` |
| `steam-preparation.json` SHA256 | `87c1cc685d2a175071b9825db501b54462e58eb09607e5d2b0d8f5bf35627c32` |
| `AtlasChronicles.exe` SHA256 | `d61c38be8dda6b3cc4fd76fb31a8b81bbc426033456d2ecb5951a2244a054557` |
| Prepared at | 2026-09-12T21:36:24.046Z |
| Atlas license SHA256 | `9331a714f977eb5e11c64b881059197e4f5808a2fb944e329c32a51ec20b7f5e` |
| Source revision | Not embedded in artifact record; no commit identity asserted |
| Steamworks IDs / SteamCMD / upload | Unknown / not executed / none |

All **36 migration filenames and file hashes match the current source**,
from `001_initial.sql` through `036_tabletop.sql`. The removed
`037_actor_progression.sql` is absent. The complete measured list, sizes and
SHA256 values are retained in [migrations-20260912.json](migrations-20260912.json)
(UTF-8/LF file SHA256 `ad604d081a9503c7c331b3422add3f65774f087ef4a289b6d66f8a33c460b35a`).
The staged Atlas license again matches the repository notice.

```powershell
node packages/desktop/tools/smoke.mjs --executable=C:/Users/nukei/Desktop/PROJECTS/project_atlas/Atlas_Chronicles/.local/steam-staging/steam-qualified-20260912/content/AtlasChronicles.exe
```

The first run of the corrected candidate successfully exported the campaign,
then failed an incorrect smoke-driver expectation added during the earlier UI
adaptation: it required V21 while this fixture correctly exports V20. The
current native adapter deliberately preserves the prior version when
`adventure_trees` and `actor_portraits` are empty. The original exact V20
assertion is restored; no application or fixture data changed.
Evidence: `.local/desktop-profiles/smoke-vsPkz2/evidence.json` (`passed: false`,
19 prior checks, no cleanup error; 2026-09-12T21:37:23.017Z–21:40:08.618Z).
The unsuccessful log remains `steam-native-smoke-qualified.log`.

The next repeat used the same executable and reached 18 checks before a
disabled floor input timed out. Its captured page contains HTTP 429 notices
for campaign/floor reads; the UI's error guard correctly disabled the field.
Evidence: `.local/desktop-profiles/smoke-Ci2iuZ/evidence.json`, no cleanup
error; log `steam-native-smoke-qualified-final.log`.

The production limits remain unchanged: the signed-in user's ordinary API
budget is 240/minute, while pack-read routes have separate 1,200/minute
budgets. The 300-file integrity probe cannot simply be assumed to consume the
ordinary bucket. The subsequent smoke records response counts by API route,
actual limit headers, every 429 and explicit budget checkpoints. Between
independent scripted scenarios it honors the server's remaining/reset headers
before starting the next scenario; ordinary scenario requests are never
retried. Any 429 in those flows fails the smoke. Startup/recovery/export also
receive recorded checkpoints. No rate protection or application code changes.

The instrumented final run of this same immutable executable **passed all 29
checks**, exited 0 and reported no cleanup error. It ran from
2026-09-12T21:48:54.081Z to 21:59:11.429Z. The log is
`.local/forge-release-20260912/steam-native-smoke-budgeted.log`; raw evidence is
`.local/desktop-profiles/smoke-uHFnyU/evidence.json`, SHA256
`4dfe251b51b59fcc3dc3314fe4484323000d55fd94c759f2013a95610d9bc71b`.
A checked-in [native smoke record](native-smoke-20260912.json) retains all 29
check names, normalized route observations and raw checkpoint headers without
profile credentials.

The observed complete native run took 10 minutes 17 seconds, including 62.2
seconds of budget-aware pauses. The Windows workflow therefore allows 15
minutes for each full packaged/installed acceptance step and 60 minutes for
the entire build job, replacing its earlier 8/40-minute orchestration budgets.
Individual browser-action, launch and unit-test timeouts are unchanged. These
workflow budgets were updated locally; no remote CI run is claimed.

The native checks cover packaged PostgreSQL/migrations and image decoding,
campaign setup and round invitations, packaged maps and all 300 genre assets,
all seven Forge destinations, ChronicleHeroes rules, linked floors and fog,
exact native V20 export, full restart, recovery with the same signed browser
credential, portable restore into a new profile, safe world deletion, sandbox
boundaries, DPAPI persistence and owned-process shutdown. The V20 fixture
intentionally exercises the current adapter's data-dependent fallback.

Every recorded checkpoint returned HTTP 200 with `x-ratelimit-limit: 240`.
Each limit/remaining/reset header was independently checked to be a non-null
numeric string. `Retry-After` was absent throughout, and `exceeded` is empty:
**zero HTTP 429 responses**, including checkpoints. The two explicit pauses
total 62.2 seconds and occur between independent scenarios.

| Checkpoint | Remaining / limit | Reset seconds | Reserve | Pause ms |
| --- | --- | --- | --- | --- |
| catalogue-ui | 154 / 240 | 15 | 160 | 15,100 |
| map-lifecycle-and-forge | 163 / 240 | 52 | 160 | 0 |
| floors-and-export | 95 / 240 | 47 | 160 | 47,100 |
| restart-and-export | 237 / 240 | 60 | 80 | 0 |
| recovery-and-export | 237 / 240 | 60 | 80 | 0 |
| portable-restore-and-export | 238 / 240 | 60 | 80 | 0 |

The browser observed 964 API responses: 634 carried limit 1,200, 321 carried
limit 240, and nine carried route-specific limits 4, 8 or 60. These observations
can include cached responses and do not measure server bucket debits. In
particular, 577 Genre-Archiv asset responses and 46 Grundriss asset responses
carried 1,200. The checkpoint evidence supports keeping rapid scripted
scenarios within the normal budget; it does not establish a production defect
or justify changing the application's limits.

## First merged-build stage — rejected during native qualification

After the merged client and desktop build, root packaged
`.local/desktop-artifacts/2026-09-12T21-10-42-073Z` and successfully ran:

```powershell
npm.cmd run steam:prepare -- --artifact=2026-09-12T21-10-42-073Z --stage=steam-final-20260912
```

This stage superseded the older tool-validation snapshot below, but its native
export failed as described below. It is retained as rejected-build evidence,
not an accepted release candidate or Steam build.

| Measurement | Observed value |
| --- | --- |
| Application version / platform | 0.4.3 / Windows x64 |
| Files / bytes | 2,620 / 575,202,301 |
| Compiled client entry | `resources/app/client/assets/index-MNlgxQey.js` |
| Electron / embedded Node / PostgreSQL | 44.2.0 / 24.20.0 / 17.11 |
| Source `artifact.json` SHA256 | `8ebc6150ba7aad3d48c4dd7daf163c4ad268974f2f4e1a8df10df9a04a548388` |
| `AtlasChronicles.exe` SHA256 | `d61c38be8dda6b3cc4fd76fb31a8b81bbc426033456d2ecb5951a2244a054557` |
| `steam-preparation.json` SHA256 | `25a4d7f8e4f71772789fcd3df26455a8ee382e85a27bc2aa8ec0b2e0f3ae328c` |
| Prepared at | 2026-09-12T21:17:01.449Z |
| Atlas license SHA256 | `9331a714f977eb5e11c64b881059197e4f5808a2fb944e329c32a51ec20b7f5e` |
| Packaged license / author | BUSL-1.1 / Kaya Yesilyurt |
| App/depot IDs / VDF / SteamCMD | Unknown / none / not executed |
| Source revision | Not embedded in artifact record; no commit identity asserted |

Both the unpacked source and staged `resources/app/LICENSE` match the root
license exactly. Version, author and license metadata match the desktop
manifest. The earlier missing-Atlas-license gate is absent from this rejected
stage's record; all other recorded release gates remain explicit.

Native qualification ran directly against this stage with an isolated profile
using the existing `packages/desktop/tools/smoke.mjs` suite. Initial and repeat
results are preserved below.

The first native run passed 17 checks, then timed out at the outdated Forge
region label `Was möchtest du vorbereiten?`. Its captured page shows the
implemented `Regeln und Figuren zuerst` and `Den Spielabend ausgestalten`
sections, with all seven workshops. Evidence is preserved at
`.local/desktop-profiles/smoke-d3147T/evidence.json` (`passed: false`, no cleanup
error; 2026-09-12T21:17:52.399Z–21:21:42.547Z).

The smoke driver now checks both sections and all seven navigation/card
destinations, including the rules card's `Regelschmiede` label. It explicitly
opens the new template disclosure before using ChronicleHeroes. An initially
incorrect V21 export expectation was subsequently restored to the original
exact V20 contract, as explained above. Floor/fog data and semantic
restart/restore assertions remain intact. No application file, packaged byte,
timeout or assertion scope was relaxed. The repeat uses the same executable;
its separate log is `.local/forge-release-20260912/steam-native-smoke-rerun.log`.

The repeat passed 19 checks, including the new Forge overview, ChronicleHeroes
installation/activation and floor/fog controls. Campaign export then returned
HTTP 409 because the packaged database schema was not covered by the native
format. Evidence: `.local/desktop-profiles/smoke-yih6nQ/evidence.json`
(`passed: false`, no cleanup error;
2026-09-12T21:24:24.229Z–21:26:30.684Z).

Inspection found `037_actor_progression.sql` in the packaged migrations while
current source ends at `036_tabletop.sql`. The old generated file creates
`actor_progression_events`, which is outside the current native format.
The desktop builder previously copied migrations over an existing destination;
deleted SQL could therefore survive and change a fresh installed database.
Manager, runtime and asset-pack copies had the same stale-file behavior.

`prepareDesktopBuildOutput` now prepares the whole generated `desktop/dist`
directory before compilation. Its resolved absolute target is the package's
own `dist`; files, junctions and a noncanonical target are refused before any
recursive removal. The package path and every ancestor are checked for links,
and its lexical absolute path must match its canonical location. This replaces
only generated output and leaves previous
artifacts and profile data untouched. All subsequent resource copies start
empty, including client, manager, migrations, runtime, packs and fixtures.

```powershell
node --test tools/test/desktop-build-output.test.mjs
# 6 passed, 0 failed (165 ms).

npm.cmd run test:steam
# Final combined run by root: 30 passed, 0 failed (5.09 seconds).
# 6 build-output + 10 existing artifact/installer + 14 Steam preparation tests.
```

The migration regression first reproduces the old overlay copy retaining the
removed SQL, then proves that preparation excludes it. Additional checks cover
the other resource trees, a first build, and preservation of a junction's
destination or unexpected output file. Independent review also identified a
linked-package/ancestor escape in the first helper; both received regressions
and are refused before deletion in the final helper. Syntax and scoped diff checks passed.
The corrected build is packaged and staged separately as
`steam-qualified-20260912`; the rejected `steam-final-20260912` stays unchanged.
Root also added this combined tooling check to the Windows packaging workflow,
so stale-resource regressions are checked before future packages are built.

## Initial artifact evidence — older tool-validation snapshot

The pre-existing unpacked artifact
`.local/desktop-artifacts/2026-09-12T20-07-13-703Z` was explicitly selected:

```powershell
node packages/desktop/tools/steam.mjs --artifact=2026-09-12T20-07-13-703Z --stage=steam-preparation-20260912
```

The command completed successfully and verified the complete source and copied
content inventories. Local output:
`.local/steam-staging/steam-preparation-20260912`.

| Measurement | Observed value |
| --- | --- |
| Packaged application version | 0.4.3 |
| Platform | Windows x64 |
| Files | 2,613 |
| Total bytes | 575,092,070 |
| Source `artifact.json` SHA256 | `29012f4ab3b793492a879108c7e5d72075b39f631e4882de10d3c175409fc755` |
| `AtlasChronicles.exe` SHA256 | `2678e2622b284f3fae8f9ed39c40c3a0318793d468d7fbbddbf4c485cce21877` |
| `steam-preparation.json` SHA256 | `8eae04bf20caf024bbacf89284f7fbac90a02388e17eb8bc89959b61bb8a2961` |
| Prepared at | 2026-09-12T20:52:45.382Z |
| App/depot IDs | Unknown; null in evidence |
| Real-stage VDF scripts | None; actual IDs were not supplied |
| SteamCMD / uploaded / public release | false / false / false |

**This is an older build used to exercise the preparation tool.** It predates
the merged Forge/character changes in this work packet and the license-notice
fix below. The artifact record does not establish a source commit; no exact
current-source or fresh Steam-launch claim is made for this older snapshot.
The merged build is now staged separately as recorded above.

## Scoped checks

```powershell
node --test tools/test/steam-preparation.test.mjs
# 14 passed, 0 failed

node --test tools/test/desktop-artifacts.test.mjs tools/test/steam-preparation.test.mjs
# 24 passed, 0 failed (34.2 seconds)

node --check packages/desktop/tools/steam.mjs
node --check packages/desktop/tools/build.mjs
git diff --check
# Passed; Git also reported existing line-ending normalization notices on GUI files.
```

The Steam regressions verify complete-copy identity, no accidental adjacent
files, independent VDF syntax/nesting and preview semantics, explicit CLI
selection, ID injection rejection, same-size worker tampering, unrecorded
resources, known private files, missing PostgreSQL resources, mismatched
metadata, preserved existing output, source/output containment and linked
resources. Synthetic test IDs never reached a real stage or Steam.
The existing artifact/installer suite also passes unchanged. Root subsequently
performed the merged client/desktop build and broader product validation;
local native qualification is documented above. No launch through the Steam
client has been performed.

## Packaging correction

Inspection of the older package found its root `LICENSE` begins with Electron
and GitHub attribution. Atlas had no separate license file, and its generated
application manifest said `UNLICENSED`, although the repository and desktop
manifest declare `BUSL-1.1`.

`packages/desktop/tools/build.mjs` now copies the unchanged repository `LICENSE`
beside the application and derives its author/license metadata from the desktop
manifest. This preserves Electron's license at the root. Final-build validation
confirmed `resources/app/LICENSE` equals the repository notice and the
packaged author/license match `packages/desktop/package.json` (see above). The old staged
artifact retains its original bytes and an explicit missing-license gate.
This correction is not a comprehensive third-party license audit.

## Remaining integration and release work

- Complete Steam installation/update/uninstall, two-device LAN and reference
  hardware acceptance; the corrected candidate's local native smoke is complete.
- Complete actual Steamworks IDs/account/package configuration, store assets,
  support/commercial fields and Valve reviews.
- Resolve optional Chronist paid-provider access and live-AI survey/safeguards
  for the chosen Steam edition; do not presume BYOK approval.

The [release preparation guide](README.md) contains commands, concrete launch
settings and the sourced checklist. The [store draft](store-draft.md) contains
German/English copy, claim evidence and current asset dimensions. Official
Steamworks sources were checked on 2026-09-12 and are linked next to their
requirements in those documents.

## Follow-up: Squirrel lifecycle test isolation

The integrated full-suite run showed all four existing
`packages/desktop/test/squirrel-lifecycle.test.ts` cases reaching their unchanged
5,000 ms limit. The absent-updater case reproduced independently with one
worker: 5,212 ms and a timeout. It cannot be an actual updater delay: `spawnSync`
is mocked, and that case explicitly supplies an absent updater.

The new LAN helpers in `main.ts` and `policy.ts` import through
`@chronicle/server/host`. The lifecycle harness already isolated profiles,
controller and recovery, but left this newly used host boundary real. Its
dynamic import traversed Fastify, bundle and Chronist dependencies during every
`resetModules` boot, including observable WebAuthn crypto initialization.

The harness now makes the host's four network functions inert throwing spies;
an installer event that calls one fails the test. The no-startup test also
explicitly asserts that the boundary was not used. Production code and all
existing shortcut/quit/window/instance-lock assertions remain unchanged.

```powershell
npx.cmd vitest run packages/desktop/test/squirrel-lifecycle.test.ts --maxWorkers=1
# 4 passed; test execution 211 ms, total Vitest duration 1.00 s.
```

This fixes test dependency isolation. It is not a claim that a packaged
installer launch defect was reproduced or that production startup performance
was measured. No timeout was raised, no assertion removed, and no broad suite
was repeated for this diagnosis.
