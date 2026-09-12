# Windows release v0.4.3: process inspection and failed smoke termination

The existing main-push package run
[34696007669](https://github.com/KTY137/Atlas_Chronicles/actions/runs/34696007669)
built commit `0953a84ba63421c1c1e0c60b41a8c8ecbd61d161` successfully. Packaging
finished at 13:23:19 UTC. The desktop smoke then failed at 13:23:56 because its
Windows process inspection could not confirm the PostgreSQL owner. It wrote
evidence at 13:24:06, but retained Electron/Playwright handles kept the failed
test alive until the job's forty-minute deadline. No release artifact was accepted.

The same run's foreign-process test took 10,036 ms and accepted an inspection
failure as sufficient rejection. This concealed an unusable native inspection
path. The actual cause of the runner's slow or failed CIM query was not established
by the old generic error. An identical local query with the restricted production
environment completed in approximately 505 ms.

The repair gives the PowerShell/CIM query thirty seconds, makes CIM errors
terminating, and distinguishes timeout, failed system query, unreadable JSON and
incomplete process information through fixed messages. It retains the environment
allowlist, exact system executable, PID-file checks, filesystem identities,
quoted data-directory argument, authenticated database identity and SCRAM checks.
The Windows foreign-process test now requires successful inspection followed by
rejection of the foreign executable; it still verifies that the foreign process
survives and its PID-file bytes remain unchanged.

The smoke driver persists the original error before optional diagnostics and
cleanup. It also records cleanup failures as failures and exits after flushing
the evidence. Playwright can clean up the process tree that this test launched
with its unique disposable profile. This is confined to the test driver; no
production ownership bypass or process-name-based cleanup was added. A reviewer
preferred CI timeout alone because of Playwright's exit cleanup; the chosen
test-only exit avoids discarding diagnostics behind another whole-job timeout.

The Windows workflow keeps all acceptance assertions, with separate bounded
stages for build, packaging, packaged acceptance, installer creation, installed
acceptance and release-evidence collection. Failure diagnostics can run after an
individual stage fails instead of waiting for the whole job deadline.

Local checks covered the real process-inspection/foreign-process tests and the
management-policy tests (22 passing cases). A bounded subprocess experiment using
the actual smoke catch/finally source reproduced the previous retained-handle
hang. The repaired failure case persisted both errors and exited with status 1;
cleanup-only failure remained red, and success still exited naturally after its
remaining asynchronous work. JavaScript, YAML and all eleven PowerShell workflow
steps parsed successfully. These checks do not replace the native package and
installed-application acceptance in CI.

The final typecheck passed. The complete local Vitest run with two workers passed
273 files and 3,039 cases; eleven files and 63 cases were skipped, including all
32 real-PostgreSQL cases assigned to CI. All seven suites affected by deadlines
in the earlier parallel run passed with their original assertions and deadlines.

Publication still requires `gate`, `gui-validation`, `map-studio`, `regelwerk`
and `windows-package` to pass on the same current main commit. The publisher
verifies the candidate archive, installer bytes, source tree, run identity, both
smoke results and uploaded asset digests before publishing. The final evidence is
attached to [v0.4.3](https://github.com/KTY137/Atlas_Chronicles/releases/tag/v0.4.3).

## Requested branch inclusion

All ten requested branch tips are ancestors of main `0953a84`, with zero commits
ahead: GUI fuzz/release, GUI hardening, floors/room fog, map-studio completion,
road network, zones/expedition, compounds/recipes, rule-ability references,
map-type selection and wilderness assets. Nine associated PRs are merged;
map-studio completion was integrated through direct merge `cdb5be5`.

| Branch | Verified tip | Integration |
| --- | --- | --- |
| `fix/gui-fuzz-release-20260911` | `dddf148` | PR #12, `0d38e64` |
| `release/gui-hardening-0.5.0` | `9c1192f` | PR #11, `dcd75c2` |
| `feature/map-floors-room-fog-20260911` | `7d09807` | PR #10, latest tip through `7bbbba0` |
| `feature/map-studio-completion-20260911` | `8f54d02` | Direct merge `cdb5be5` |
| `feature/map-road-network-20260911` | `7a8aaba` | PR #9, `a3bc38b` |
| `feature/map-zones-expedition-20260911` | `c98b85d` | PR #8, `c510c73` |
| `feature/map-compounds-recipes-20260911` | `8ea5506` | PR #7, `4f524ec` |
| `fix/regelwerk-faehigkeiten-verweise` | `418f8cd` | PR #6, `3beb68e` |
| `fix/atlas-map-type-selection-20260911` | `7ce2365` | PR #4, `f2d99d1` |
| `assets/wildnis-expedition-20260911` | `7387660` | PR #5, `245f78d` |

Ancestry alone did not preserve every change: GUI merge `dcd75c2` selected its
first parent's MapContextMenu blob and discarded the other parent's dialog/
fullscreen portal host and broader editable-target guards. This repair restores
those specific changes while retaining main's later scroll-dismissal behavior.
The existing fullscreen/dialog GUI regression cases cover the lost behavior.
The original source failed those two cases (three passed, two failed); the restored
source passed all five cases. An additional native-browser probe reproduced the
empty-contenteditable keyboard failure on the original source and verified native
keyboard/right-click handling for inputs, textareas, selects and editable content
on the repaired source; explicitly noneditable content still opens map actions.

The floors/fog merge retained all forty changed branch files, with newer STATUS
and an i18n superset. The map-studio feature code was already shared and its
remaining dependency-preparation workflow was incorporated exactly. Other
reviewed conflict resolutions retained main's promise-joining task handling,
deterministic loot lettering and the requested 0.4.3 version. No additional lost
feature was found in these merge resolutions.

The separate v0.5.0 GUI-qualification workflow is not a v0.4.3 admission gate.
Its broader browser-suite failures remain open; restoring the identified menu
regressions is not a claim of complete GUI qualification. An intermittent
Chronist concurrency failure was also observed there; the required gate's second
attempt on the original commit passed all 284 test files and all 32 real
PostgreSQL cases.
