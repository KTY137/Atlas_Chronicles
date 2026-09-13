# UniversalRulesChronicles — host-authoritative editor runtime

Date: 2026-09-13. Base: `d96c8931c99ec586292be1322dce55effcabc073`.
Work stays on `UniversalRulesChronicles`; this is not a release or a merge to main.

## Delivered slice

The previous transport contracts disagreed with the engine: actor templates and
player requests allowed 64 fields, sheets 128, the engine 512. A shared protocol
`RuleValues` contract now accepts up to 512 bounded scalar fields. The regression
suite asserts that this contract matches the engine limit and rejects field 513.

A campaign member can request the selected installed package's read model at
`GET /api/campaigns/:campaignId/rules/runtime?packageId=...&packageVersion=...`.
The host returns contract version 1, the exact package pin/content hash, defaults,
field/layout metadata, computed labels, abilities, conditions and check names.
Missing layout fields remain editable in an additional section. Loading a package
never activates it, mutates an actor or installs a browser-supplied document.

`POST /api/campaigns/:campaignId/rules/runtime/preview` takes
`{ packageId, packageVersion, contentHash, fields }`. The existing rules engine
performs validation and computes values, vitals and learnable abilities on the
host. Invalid drafts return errors and no derived values. Foreign campaigns,
uninstalled packages and mismatched hashes are rejected. Existing verified demo
package resolution is retained; there is no generic fallback to another package.

Both the actor-template form and the character sheet now use `useHostRules` and
`HostRuleFields`. Package changes replace the draft atomically; no ability list or
defaults are carried across packages. Preview results are bound to campaign, pin,
content hash, all draft values and retry epoch. Old responses are rejected during
render, even when a transport ignores cancellation. Failed/offline previews never
enable save. Explicit identifier-list repair remains available for invalid imports.

Template and sheet save commands include `packageContentHash`. The server checks
it again inside the existing authorized mutation transaction. Older clients may
omit it; normal server validation and expected-version checks still apply.
Existing immutable template revisions, command idempotency and dirty-draft conflict
handling remain in place. English labels are presentation copies only: a cached
browser package cannot supply defaults, bounds, budgets or computed values.

## Evidence and reproducible checks

Executed locally in the implementation environment:

- `node --experimental-transform-types --test tools/test/universal-rule-runtime.test.mjs`
  — 15 tests passed, including the production asynchronous hook with controlled
  transports, A→B→A races, stale hashes, invalid defaults, layout omissions, field
  bounds and label-only translation safety.
- The original Chronicles Lite v1 fixture installs and passes its 12 embedded
  self-tests; the runtime preserves all 107 fields and 103 checks. See the fixture
  README for provenance. The fixture is test-only, not silently installed in rounds.
- `node tools/gate-boundaries.mjs` — passed, no violations.
- `git diff --check` — passed.
- A scoped strict TypeScript 5.8.3 check of the rules exports and request-state
  helpers passed; syntax checks passed for all changed TypeScript modules.

Not claimed as locally executed: the repository-pinned TypeScript 7 full check,
Vitest/Fastify/PGlite integration tests, client build, official language gate or a
real browser session. Project npm dependencies were unavailable here. A substitute
TypeScript 5 scanner cannot run the version-7 language gate reliably and is not
counted as a passing check.

The `regelwerk` workflow now has an independent **Hostautoritative Regeln** job:

```sh
node --experimental-transform-types --test tools/test/universal-rule-runtime.test.mjs
npx vitest run packages/server/test/rule-runtime-http.test.ts \
  packages/server/test/gameplay-rule-bounds.test.ts \
  packages/client/test/chronicle-client-review.test.ts --maxWorkers=2
```

The new HTTP suite exercises membership, exact installed pins, side-effect-free
preview, corrupt stored hashes, 107-field Lite template create/revise, stale hashes,
512/513-field boundaries, instantiated sheets and revision conflicts. Existing
workflow jobs retain full typecheck, build, language and rule-forge checks. Consult
the actual Actions result for remote evidence rather than treating this document
as a green CI claim.

## Deliberate boundaries / remaining work

This is the host-authoritative **template/sheet editor** path on the existing v1/v2
engine, not a new universal mechanics interpreter. It does not claim complete D&D,
DSA or Pathfinder adapters, license-cleared rulebooks, a release, or a main merge.
The rule-authoring sandbox and legacy presentation/example helpers remain; they
are not authorities for these two save paths. Saved actors retain their pinned
package and explicit migration flow. Other clients still receive package listings
for authoring and presentation, and should be migrated separately where needed.

A manual browser smoke test should switch ChronicleHeroes → Lite → ChronicleHeroes
with throttled requests, edit and save a Lite template, instantiate a sheet,
exercise an invalid identifier list, then test host loss/reload and a concurrent
sheet edit. Confirm each check against the checked-out branch, not v0.5.0 assets.
