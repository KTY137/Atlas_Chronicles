# How to be a Hero: independent client implementation review

Date: 2026-09-06. Reviewer: independent Codex reviewer, routed only through root.
Scope: HTBAH template discovery/catalogue, v1/v2 rule-workshop drafts/import/forks,
declarative editors and previews, sheet HP/GBP state, classified receipts and the
threshold-only Vollmacht selector. The adopted template contract and implementation
review (H4/H5 closed) are the supplied context. No browser or client-build window
was used by this reviewer.

## Verdict

**H6, H7 and H8 (MEDIUM) are corrected and independently verified.** The initial
five failing regressions reproduced three client correctness findings. Root corrected
the product seams; nine reviewer cases now pass, including the existing stale-sheet
and ambiguous-save controls and new compatible-example controls. No additional
confirmed finding remains open within this review's boundaries. This is a bounded
client review, not a browser, database or release approval.

Regression file: `packages/client/test/htbah-client-review.test.ts`.
Command: `npm.cmd test -- packages/client/test/htbah-client-review.test.ts`.
Initial independent run at 20:37:24 local: **4 failed**.
Expanded run at 20:40:15 local: **5 failed, 2 passed**, 894 ms total Vitest duration.
The tests execute actual component handlers using the repository's existing esbuild
and VM review-harness approach. Cross-realm JSON objects are normalized before entering
the real rules validator; no rule assertion or evaluator is replaced with a fake.

Independent correction-verification command:
`npm.cmd test -- packages/client/test/htbah-client-review.test.ts packages/client/test/htbah-forge.test.ts`.
At **20:44:33 local: 15 passed in 2 files**, comprising 9 reviewer cases and 6 HTBAH
forge cases, in 893 ms total Vitest duration. H6 was strengthened to verify parent
package invalidation, error display and external-value resynchronization; H7 retains
numeric required behavior; H8 includes positive original/label-renamed catalogue
controls and checks that unavailable shortcuts leave editable fixtures plus guidance.

## H6 — MEDIUM: a normal visual formula edit throws and cannot retain the draft

Seam: `packages/client/src/features/RuleDeclarativeEditor.tsx`, `ExpressionInput`,
the FormulaBuilder `onChange` handler (approximately line 13 before correction).

Open the visual builder for a computed value whose expression is `0`, select its
numeric content and clear it before typing the replacement. The builder emits the
normal intermediate draft `{kind:"literal",type:"number",value:""}`. ExpressionInput
immediately calls `compileFormula` and throws `Konstante: Bitte eine Zahl eintragen.`
from the event handler. There is no catch or separate visual draft state, so the edit
cannot be retained and no inline error explains it. This same component is used for
computed values, sheet constraints, action preconditions and outcome comparisons.

The failing test invokes the actual handler with that intermediate draft, requires
it to remain editable without throwing, then completes it as `25`. This is a visual
editing seam, not a parser bypass or a request to accept an incomplete package.

Correction route: preserve the visual draft while incomplete, show validation in the
editor, and keep the package from being installed as an unnoticed previous expression
while a visibly different invalid edit is pending. Successful completion must still
use the existing compiler/parser and the dice/knowledge restrictions.

**Closed:** root added retained FormulaDraft state and visible error handling. An
incomplete visual edit emits an empty source, invalidating the parent package while
retaining the editable visual input. The independent test feeds this source back as
the parent prop, confirms `validateDraft(...).valid === false`, completes 25 and
confirms validity/error clearance, then supplies external 50 and confirms the visual
control resynchronizes. No previous valid expression remains silently publishable.

## H7 — MEDIUM: native required text fields prevent valid HTBAH sheet saves

Seam: `packages/client/src/features/RuleFields.tsx`, ordinary input `required`.

The canonical HTBAH package permits an empty notes string. The regression validates
an otherwise complete 400-point example with `notes:""` through the real package
validator, then inspects the actual RuleFields control. That empty input is marked
`required`, so browser constraint validation prevents the enclosing sheet form's
onSubmit from running. A player cannot simply leave optional notes blank and save
their HP/GBP changes. Name and profession use the same generic text control.

This unconditional requirement predates HTBAH, but the new blank/default template
flow exposes it directly. Concurrent edits added hints and a Pflichtfeld label during
review; the current reviewed snapshot still declares all ordinary text fields
required while the same component's scalar validator accepts the empty text.

Correction route: derive native constraints and required/optional copy from the
actual field contract. Preserve the numeric requirements and the concurrently owned
hint/error additions. This finding needs no change to the package data format.
The proof is an actual control-property assertion; browser-native behavior was not
separately executed in this review's reserved no-browser window.

**Closed:** native required state now applies only to numeric fields and the
required/optional copy follows that state. The independent test verifies valid blank
notes are not required while HP remains required. Root retained the concurrently
added hints, field-error validation and ARIA descriptions, with the parenthetical
required/optional label hint hidden from the accessible field name.

## H8 — MEDIUM: default examples are imported into incompatible custom catalogues

Seams: `packages/client/src/features/RuleForgePreview.tsx`, the
HTBAH-Beispielfiguren-laden handler, and `CharacterSheet.tsx`, the initial-sheet
example buttons. Both select the fixed `HTBAH_EXAMPLE_CHARACTERS` merely because
the package has an HTBAH source. Mapping matching field names to the current fields
does not adapt an example to changed skill identities or groups.

Three actual component counterexamples:

1. Build a valid catalogue using the original nine skill IDs but move all into
   Handeln. Load the example in the preview. Mara's raw 65 Klettern plus Handeln 40
   gives 105, so the real validator rejects `skill_valid_klettern` and the examples
   cannot be evaluated.
2. Replace those nine IDs with custom IDs and load the preview examples. The example
   has zero assigned points but retains the notes claim "400 verteilten Startpunkten".
3. Apply Mara through the actual SheetForm initial-sheet button with the regrouped
   catalogue. It creates the same invalid 105 draft before any network request.

Correction route: share a validated example-selection/adaptation policy between
preview and sheet. Generated/adapted examples must satisfy the current package and
state their actual allocation. Withholding incompatible shortcuts with a clear
explanation is also a valid bounded correction; retain the original two examples
for their compatible catalogue and keep custom fields editable.

**Closed:** root introduced shared `hasHtbahExamples` admission for preview and sheet.
It checks the expected field identities and computed formulas, then validates both
actual examples and their 400-point allocation against the current package. Changed
catalogues receive a clear explanation and retain manually editable fixture/sheet
fields. Independent positive controls confirm the original catalogue and harmless
label renaming both retain two valid 400-point examples. Both hostile regrouping
paths and the replaced-ID false-allocation path now pass their regressions. This
correction deliberately withholds incompatible prefilled examples; it does not claim
to generate 400-point characters for arbitrary custom catalogues.

## Bounded examined surfaces with no additional confirmed issue

- The supplied baseline is 60 tests in 3 files (51 legacy model, 3 existing roll,
  6 new HTBAH) and client TypeScript green. Those are root-provided counts, not
  reviewer reruns. Existing v1/v2 roundtrip and fork tests were inspected; drafts
  preserve v2 attribution, declaration arrays, outcome order and self-test outcomes.
- Installing and activating remain separate explicit operations. Draft replacement
  uses the existing confirmation guard; template catalogue edits do not mutate a
  currently open rule draft until the user chooses to open the generated package.
- Computed/assertion editors reuse FormulaBuilder with dice and knowledge disabled,
  and the supported parser remains authoritative. H6 concerns intermediate editing,
  not permission to admit an invalid expression. Classification self-test decisions
  compare success/outcome identity as well as the numeric result.
- RuleAttribution exposes source/revision/author/license/change notes. Fork/import
  retains those values. The package remains the authority for computed calculations.
- The Geistesblitz control changes only a dirty local draft. Its save sends absolute
  fields with expectedVersion through PUT sheet; v2 has no legacy resource form.
  The passing lost-response test accepts the first server write but rejects its
  response, manually retries, then refreshes the authoritative sheet. The retry
  retains version 1 and spent 1, so it cannot add a second expenditure. Only explicit
  adoption of the refreshed accepted sheet clears dirty state; no auto-save or
  replacement roll is generated. This is controlled-transport evidence, not a DB run.
- A newer version arriving while HP is edited leaves the draft intact and exposes
  explicit adoption. The passing handler test proves HP 60 is retained against a
  remotely supplied HP 20/version 2, with no mutation. Server version/permission checks
  remain necessary; no new server authorization claim is made here.
- TableView derives the selected actor from currently controlled actors and does not
  silently substitute a different actor. Sheet authorization failures clear loaded
  resource data through the existing shared resource hook. This was code inspection,
  not a new role-revocation browser regression.
- The Vollmacht selector excludes v2 actions with outcome before choosing its default
  or rendering options; ordinary actor-bound rolls still use the saved server sheet.
  RollCard and preview show outcome labels and resolved comparisons and preserve
  explicit confirmation. No new threshold-classification bypass was confirmed.

Reviewer changes are restricted to this note and the new regression file. No product
edit, install, operative database access, build, browser launch or commit was made.
Route: the three corrections are independently verified; root continues the reserved
end-to-end browser and integration verification.
