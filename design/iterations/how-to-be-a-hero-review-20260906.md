# How to be a Hero: independent contract review

Date: 2026-09-06. Reviewer: independent Codex contract reviewer, routed by root.
Scope: the round-2 proposal in `how-to-be-a-hero-20260906.md`, current source seams and
official primary rules/licensing sources. This is a design review, not implementation
approval or a claim that regression tests have run.

## Verdict

**Adopt candidate B after the three high-priority contract corrections below.** No
critical finding. The v2 package boundary and native v5 envelope are justified by the
requested portable, playable workshop template. The existing v1 margin expression can
represent roll-under success; it cannot express portable critical classification,
computed sheet presentation and cross-field validity. A client-only interpretation would
leave exported packages dependent on undocumented application behavior.

Keep the proposed small declarative vocabulary. Computed-to-computed references, a new
formula grammar, automatic combat scheduling and a cross-system character converter are
unnecessary for this delivery. Preserve the complete character/roll/GBP/archive flow.

## Confirmed high-priority contract gaps

### H1 — Resource UI filtering does not enforce the promised no-luck-defeat behavior

Proposal seam: section 5.3, `how-to-be-a-hero-20260906.md:264` limits the resource UI to HP.
Current seam: `packages/server/src/domain/gameplay.ts:141`, `adjustResource`, accepts
every numeric stored field. After the versioned sheet update, line 148 sets
`defeat_pending=true` whenever the adjusted value is at or below zero.

A direct authorized resource request resetting a spent-GBP counter from 1 to 0 passes
ordinary numeric bounds and the proposed `spent <= maximum` constraint, then marks the
hero defeated. A zero-delta resource request on an already-zero spent field has the same
problem. Hiding this choice in CharacterSheet leaves the domain route available.

**Minimal correction:** enforce the admitted resource fields in the domain before any
write, using the same package-aware policy as the UI. Alternatively, reject the legacy
resource command for v2 packages and use the already proposed versioned sheet route for
HP as well as GBP, with explicit HP guidance. No broad redesign of v1 defeat semantics
is needed. If the policy is template-specific, state how template forks retain it.

Required regression after the v2 fixture exists: authorized direct resource request for
a spent-GBP field is rejected without sheet/version/defeat mutation; sheet-based GBP
spend and reset succeed without changing defeat state. Also verify the declared HP path.

### H2 — Replay does not yet bind the entire source package promised by the proposal

Proposal seam: section 5.1, lines 205–222, defines the v2 receipt extension and promises
that altering its source package fails exact replay. The inherited receipt pin is only
`{ id, version }` (`packages/rules/src/package.ts:49`); the v2 extension does not explicitly
add a package content binding.

Changing attribution or a computed expression unused by the action can leave the action
expression, context, total, outcome thresholds and all recorded action traces identical.
The analogous existing replay at `package.ts:192` compares the evaluated receipt, not
the whole package. Registry immutability prevents same-version replacement in an existing
campaign, but it is not a standalone receipt-to-document binding. An independently
recomputed package row hash also does not provide that binding.

**Minimal correction:** put a canonical full-package content digest in v2 receipts and
compare it in supported replay, including its canonicalization/algorithm in the contract.
Keep v1 bytes and behavior unchanged. The digest must cover attribution, constraints,
computed fields, action ordering and other declared package data. Require the same digest
at installation, server preparation and native v5 validation. This gives consistency
against the supplied original receipt; it does not turn unkeyed archive checksums into
proof of an externally trusted author or prevent coherent rewriting of an entire archive.

Required regression: altering only attribution or an unused computed expression while
keeping the original receipt must fail v2 replay. Altering outcome order/trace and
package/receipt version mismatches remain separate tests.

### H3 — The supported-version lifecycle needs defaults, registry and migration entry points

Proposal seam: section 5.1 names parse/evaluate/replay dispatchers and field validation,
but retains the existing migrations and promises same-ID package updates after sheets exist.
The live integration has three additional v1-only entry points:

- `gameplay.ts:55` installs through `RulePackageRegistry`; its `install` method reparses v1
  and checks only expected totals (`packages/rules/src/package.ts:203`).
- `gameplay.ts:121` resolves an unsaved sheet through `defaultActorFields`, which reparses
  v1 (`package.ts:177`).
- `gameplay.ts:82` reviews a changed campaign pin through `previewPackageMigration`;
  `packages/rules/src/migration.ts:22` reparses both packages as v1 and validates scalar
  fields only, including at the final migrated state on line 52.

Changing only the named dispatchers therefore leaves initial v2 installation/default
sheet retrieval and later catalogue migration blocked. A cast to the old type does not
solve this, and silently defaulting new fields would violate the current migration contract.

**Minimal correction:** explicitly add supported registry/self-test installation, supported
default-field resolution and supported migration preview. Preserve old entry points and
their validation behavior. Supported migration must validate source and destination
package constraints, keep direct same-ID version transitions and explicit add/archive
steps, preserve archived fields and use the current activation review hash/version guard.
State whether a same-ID v1-to-v2 transition is admitted or rejected; do not infer it from
semver alone. A v2-to-v2 catalogue revision is part of the immediate supported lifecycle.

Required regression: install a v2 package; retrieve an unsaved v2 sheet; activate a valid
same-ID v2 revision containing an added catalogue field with explicit migration; reject
missing add/archive steps and a migrated effective skill above 100. Preserve old receipt
and package bytes throughout.

## Mechanics and source findings

The approved checks page really enumerates 97–100 for skill 70, although its accompanying
percentage claim is inconsistent. The proposal's explicitly pinned inclusive interpretation
is defensible; do not present it as the only official revision. Its natural-100 priority
and single evaluated W100 avoid the main classification hazards.
[Approved checks revision](https://howtobeahero.de/index.php?title=W%C3%BCrfe_%26_Proben_(kritische_Erfolge_%26_Fehlschl%C3%A4ge)&oldid=27220)

The PDF supports the stated group rounding, bonus opt-out, effective-skill limit, GBP
derivation, initiative and no critical successes on aptitude checks. **Aptitude zero
failing on natural 1 is the adaptation's explicit resolution of conflicting general and
specific text**, not a rule stated verbatim by a single combined edition. Retain that
precedence note in product help and package attribution/change notice.
[Official PDF, pages 3–8, 12 and 21](https://howtobeahero.de/images/4/47/Regelwerk.pdf)

Two small fidelity clarifications should land with adoption:

- PDF page 6 makes unconsciousness after a single loss above 60 HP mandatory. Change
  “can also cause / table decision” to definite rule guidance whose application is
  explicitly confirmed by the table. No automatic status engine is required.
- State explicitly whether critical damage doubles the flat bonus with the rolled dice.
  The proposal's “completed damage” suggests `(Nd10 + bonus) * 2`; label this interpretation
  in the source note so the formula and displayed explanation cannot diverge.

## Compatibility and buildability conditions

- The no-computed-reference rule prevents cycles without a dependency engine. Static type
  inference, dice/knowledge prohibition, finite values and an aggregate operation budget
  are sufficient if enforced on every supported evaluation path. Test the maximum 24-skill
  catalogue with all skills in one group: repeated sums must fit formula and aggregate limits.
- Evaluating the primary expression once and recording separate ordered band thresholds
  is adequate. Compute all thresholds in deterministic order; a failed precondition must
  produce no saved roll. Preserve the primary RNG/trace semantics.
- Native v5 is required. V4 currently constructs a V3 core in `native-v4/bundle.ts:40`
  and rejects a non-v1 rules manifest at line 59. V3 ultimately reaches both the base
  package/receipt/confirmation seals (`campaign-bundle.ts:333`) and the actor-definition
  and historical-request validation (`campaign-bundle-v2.ts:51`, `:78`, `:152`). All must
  use the explicit private supported profile for v5, with frozen public v1–v4 entry points.
  A profile-aware base check alone would miss actor revision history.
- Reject outcome actions in domain Vollmacht issuance and native v5 rows, even when no roll
  has yet consumed the authorization. Add a defensive check in delegated preparation and
  confirmation so their success calculation can never reinterpret a classified W100 as
  `total >= threshold`.
- The archive owner also needs the actual entry points: `server/src/http/bundles.ts`,
  `server/src/domain/bundles.ts`, `server/src/host.ts` and `server/src/bundle-cli.ts` are
  presently pinned to V4. Installed inactive v2 packages must choose v5 export.
- Fresh campaign creation does not create actor sheets (`domain/campaigns.ts:26`), so the
  proposed non-destructive activation route is feasible. Include the real creation seam:
  `client/src/features/ActorWorkbench.tsx:80` edits template initial fields and currently
  shows raw fields only. Reuse computed values/constraint feedback there or provide an
  equally discoverable template-to-character creation flow.
- The manual-ruling action is acceptable because ordinary skills remain actor-bound and
  automatically classified. Give manual thresholds an explicit agreed-rule label, and
  retain original inputs in the receipt. It must not become the primary check workflow.

## Attribution and evidence boundary

The wiki links CC BY-NC-SA 4.0. The proposal's portable attribution, change notice, separate
engine/template licenses and noncommercial restriction are appropriate. Preserve supplied
creator/copyright/license/disclaimer notices where applicable, retain modification notices
on forks, and treat imported source links as inert validated HTTP(S) links. Do not infer
PDF authorship from the uploader or imply official endorsement.
[Official wiki license footer](https://howtobeahero.de/index.php?title=W%C3%BCrfe_%26_Proben_(kritische_Erfolge_%26_Fehlschl%C3%A4ge)&oldid=27220),
[CC license conditions](https://creativecommons.org/licenses/by-nc-sa/4.0/legalcode.en#s3)

Only this review file was created. No product code, installs, build, gate, browser app
session, operative database or other worker surface was changed. Source inspection
confirms the design gaps above; no red-to-green implementation evidence is claimed.
Root can adopt the corrected contract and assign disjoint rules, archive and integration
owners immediately. Delivery acceptance remains the complete saved-character, classified
roll, GBP and native archive roundtrip, followed by independent implementation review.
