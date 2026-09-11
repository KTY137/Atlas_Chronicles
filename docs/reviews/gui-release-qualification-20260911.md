# GUI qualification and Windows release candidate 0.5.0

Base: main `7976af9909b9f0d58311c11921b1612ca70c727d`. Retains the user's
512-field/512-action rule changes and the merged floor/room-fog features.

## Reproduced bugs, not guesses about intentional disabled controls

Five real Chromium/React regressions fail on the original sources and pass on
the corrected sources: internal scrolling dismisses long context menus; menus
portal outside fullscreen; menus portal behind a modal dialog; Shift+F10 in an
editable child is stolen; two synchronous useTask activations admit duplicate jobs.
Fixes preserve outer-scroll dismissal, native editing and sequential task reuse.
No forced clicks, test assertions removed, or production user data used.

The local five-component run passed. Four deterministic dropdown model seeds
exercise 320 command transitions (all concrete map options, edits, host refresh,
setting changes and viewport changes), and four async model seeds exercise 160
admission/completion cycles. Both local model suites passed. Their model stores
user intent, not outputs of the production mapping functions.
The full-application monkey uses four reported seeds, nine navigation areas,
bounded safe action pools and a mandatory native dropdown sweep. It records its
complete command prefix, selected values, error list and visited controls. Actual
pointer clicks and native keyboard navigation check event reachability; selectOption
alone would not prove an overlay does not intercept the control.

## Asset gate blocker

The existing Loot PNG source asked the operating system for Georgia/Times/DejaVu.
It therefore could not promise byte reproduction on GitHub's Linux image. Glyphs
now come from exact build-only npm dependencies (Libre Baskerville 5.3.0 under
OFL-1.1 and opentype.js 1.3.4 under MIT), become paths before rasterization and
are measured using actual advances. No font binary enters the desktop payload.
All 40 central illustration regions (x44..468, y96..456) are pixel-identical to
the base images; only lettering/layout and manifest checksums changed.
Source independence from system font discovery has a new regression. The existing
asset verification, binary integrity and orphan detection remain enabled.

## Release conditions and limits

Whole-application browser navigation is blocked administratively in the local
container; no workaround or local full-app acceptance is claimed. The real HTTP/
DB browser suites execute in GitHub Actions. Record their actual final results
before merging. A test pass does not prove absence of every GUI bug.

The release must build the exact accepted tree, run the existing Windows packaged
smoke in an isolated world, verify installer bytes and publish only after success.
An unsigned installer remains unsigned; no signing, update-feed or complete
20-feature roadmap claim is made. Current campaign backups should be made before
upgrading across the new floor/fog migrations.

## First remote qualification and test corrections

Run 34650492422 passed all five reproduced GUI regressions and eight independent
state-model tests. Its four full-app monkey cases found the test trying to assert
a visible mobile navigation item after the drawer correctly closed; the corrected
assertions check the hidden active item, actual URL and closed drawer. The browser
suite initially failed during collection because an obsolete HTBAH template export
no longer exists. It now exercises the actually shipped ChronicleHeroes template
with the same formula and byte-identical package assertions. These were test
contract mismatches, not additional claimed GUI defects.

The full canonical gate passed source assets/types and exercised real PostgreSQL.
Its remaining failures were old Windows-only desktop fixture assumptions on Linux.
Explicit platform/CIM doubles preserve the production guards; native path fixtures
and the pure Windows path parser are now unambiguous. All 52 desktop cases passed
locally, including a new fail-closed ownership-inspection regression. Native
Windows runtime verification remains assigned to both packaged and installed smoke.

Publication is scoped to this requested version and the exact main-run artifact.
Twelve independent admission checks reject substituted bytes, missing smoke
results, wrong run/commit/version and inconsistent checksums before publishing.
No existing release or tag will be overwritten.
