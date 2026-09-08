# Gameplay, maps and renderer review — 2026-09-08

Worktree: `.claude/worktrees/featureliste`; baseline `9086cdb`.
Execution: root-owned LangGraph `play_review` node. No secondary runner, commits or pushes.

## Findings and implemented changes

| Surface | Reproduced behavior | Change |
| --- | --- | --- |
| MeineFigur | An account initially without actors stayed empty after its first assignment. | Select the first available controlled actor when there is no valid selection and no draft. |
| MeineFigur | A clean inventory cleared the sheet's dirty signal; changing actors discarded an edited sheet without asking. | Aggregate both child signals, guard actor switching, and key both editors by actor. |
| CharacterSheet | Money edits did not participate in navigation protection; saving money here refreshed only this copy. | Aggregate sheet and money drafts and notify the shared parent after a money update. |
| Geldzaehler | A remote money version erased an in-progress amount. The submit then used the newly received version. | Retain the amount and its original baseline version; offer explicit adoption of the current balance. |
| Geldzaehler | Changing to an actor with the same version displayed the preceding actor's amount draft. | Scope draft and acknowledgement state by campaign and actor; clear on scope changes. |
| Geldzaehler | A successful save immediately displayed the old fetched balance until refresh. | Retain the returned acknowledgement while the resource catches up; refresh internally even without a parent callback. |
| Geldzaehler | A currency rename used the latest fetched version and could overwrite a concurrent rename. | Pin the rename's baseline; preserve the draft and explain the conflict. |
| Geldzaehler | A delayed prior-scope completion could clear the currently mounted scope's draft through its handler. | Ignore completion state updates after scope replacement or unmount. |
| Dice history | The hook treated the pre-fetch empty array as loaded history, so initial historical rolls counted as new. | Accept a null loading state and establish history only on the first loaded array. Root updated TableView's call site. |
| TacticalGenerate | Entering only width or only height silently omitted both dimensions. | Fill the untouched dimension from the selected generator's defaults. |
| Renderer | Removing an asset's last placement retained its GPU texture and ImageBitmap until canvas destruction. | Release resources for assets no longer referenced by the scene; keep assets still used by moved placements. |

The new gameplay component tests run actual handlers/effects against controlled resource and transport boundaries. They do not substitute for browser interaction. Renderer tests execute the production renderer with a narrow Pixi boundary; they establish resource ownership, not GPU performance.

## Integration delivered

- `Geldzaehler` accepts optional `onDirty(value)`. CharacterSheet uses it; the inventory owner integrates the same prop into its existing draft aggregation.
- `Kampfbuehne` accepts optional `onOpenInventory(actorId)`. Bound participant cards expose **Inventar öffnen** to the GM. Root routes this to the existing inventory rather than adding another editor.
- Advancing a fight sends `{ von, runde: kampf.runde }`, matching the data review's updated concurrency contract.
- `useFrischeKarten` accepts `readonly string[] | null`; null means no loaded history yet.

## Coverage and evidence

Read the working instructions and first 100 FEATURELISTE lines, STATUS handoff and recent commits. Reviewed the gameplay components listed above plus Kampfbuehne, Erleichterungen, Vitalanzeige, NestedMapView, TacticalPreparation, TacticalView, TacticalCanvas and AtlasView's state/navigation paths. Inspected forge nesting/settlement contracts, renderer artwork/raster lifetime, theme preference/contrast resolution, UI controls and desktop controller/main ownership paths. This is targeted review of the workflows and recent integration surfaces, not a claim that every branch of every package was executed.

Red evidence before fixes:

- Initial gameplay review: **7/7 failed** with observed draft loss, missing selection, missing dirty propagation, old acknowledgement display and wrong rename version.
- Added dice/loading and generator-dimension cases: **2 failed**, then green after their changes.
- Added renderer removal case: **1 failed** because the bitmap was never closed; then green.
- Added late money completion isolation: **1 failed**, then green.

Final observed targeted results, all with `--maxWorkers=1`:

| Files | Tests |
| --- | ---: |
| client/gameplay-drafts-review | 10 |
| client/htbah-client-review, wuerfel-animation | 16 |
| client/tactical-drafts-review, tactical-entities-review, vitalanzeige | 23 |
| render/renderer-lifecycle, tactical-drag-review, stapel | 39 |
| forge/verschachtelung, kette, siedlung | 62 |
| szene/containment, sichtmaske | 16 |
| theme/theme | 34 |
| desktop/controller-lifecycle-review, main-authority-review | 8 |
| **Total distinct targeted tests** | **208** |

The five-file final affected-path run reported **57/57** before adding the final money isolation case; that updated gameplay file then reported **10/10**. The earlier 13-file package/workflow review reported **163/163**. `git diff --check` reported no whitespace errors. Full suite and full gate were deliberately not run; root owns final typecheck/build and browser integration verification. Applied the React best-practices skill checklist to changed components: stable draft callbacks, scoped asynchronous results, bounded resources and native controls.

## Remaining scope

- Settlement generation exists in `packages/forge/src/siedlung.ts` and its 39 tests pass. The product's free/nested generation selectors and server generation integration still offer Grundriss/Höhle. A selectable village/settlement workflow remains unfinished and was intentionally not implemented in this GUI review.
- No installer rebuild, real GPU frame-time measurement, PostgreSQL deployment, full browser matrix or full package sweep was performed by this node.
- No new defect was established in the inspected theme, UI, scene containment/mask or desktop authority paths. Their targeted checks passed; this does not certify unexecuted paths.

Ready for root's shared-worktree integration and focused browser verification.

## Follow-up: existing browser consumers after the GUI rework

Adapted `e2e/rule-forge.spec.ts`, `htbah.spec.ts`, `authoring.spec.ts`, `actors.spec.ts` and `actor-drafts.spec.ts` to the shared GUI:

- Rule-editor entry uses `stage=schmiede&forge=rules`; appearance navigation uses **Aussehen**.
- Actor creation follows the new figure-template/create workflow and returns to the table through the visible handoff.
- Loot authoring follows **Lootkarten erstellen**, opens optional metadata, saves the extended card contract and follows **Jetzt Exemplar erzeugen** to the target inventory. Export is validated as the supported v5 envelope required by that extended card.
- Inventory card selection, item-editor headings, Wiki sidebar article selection, dirty status and HP spinbuttons have specific selectors where a card preview, overview or meter now shares their text.
- Configured PostgreSQL remains the preferred fixture. When both `E2E_DATABASE_URL` and `.local/config.json` are absent, these three formerly PG-only fixtures use `createTestDb`. This run used that PGlite fallback and does not establish a real PostgreSQL browser run.

Observed verification:

1. Initial five-file run: **9 passed, 7 failed**. Six failures were stale/ambiguous test selectors. One scenario passed its draft assertions but failed during context cleanup because a concurrent invocation deleted the shared Playwright artifact directory.
2. One early retry was cancelled at root's request to allow the final production build. Its first completed case exposed a second duplicate heading inside the new item-card preview; readiness now targets the editor's h3.
3. Root completed the build and froze `dist`. Only the seven initially failed scenarios were rerun with one worker and separate output: **7/7 passed in 6.3 minutes**.

All **16 distinct browser scenarios** in these five consumer files are therefore green across the targeted runs. Covered flows include actor/item draft preservation, delayed template saves, rule authoring and reviewed migration, HTBAH sheets/rolls/export/host reopen, shared actor control/revocation, publication/attribution, theme propagation/contrast and transient membership failures. No product change or weakened domain assertion was needed in this follow-up.

Final retry command:

```text
npx.cmd playwright test e2e/actor-drafts.spec.ts:85 e2e/actor-drafts.spec.ts:119 e2e/actor-drafts.spec.ts:161 e2e/actors.spec.ts e2e/authoring.spec.ts:208 e2e/htbah.spec.ts --workers=1 --output=.local/review-20260908/consumer-test-results --reporter=list
```

The root's subsequent selected-tab CSS specificity correction is verified separately by the root; no build changed during the final seven-case run.
