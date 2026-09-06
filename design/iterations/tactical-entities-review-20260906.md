# Tactical entities: independent bounded review, 2026-09-06

Verdict: **the scoped review passes after Root's three selection corrections.**
The reviewer independently reran all ten new regressions at 20:10 local time on
2026-09-06: **10 passed, 1 file, 1.44 seconds**. No confirmed finding remains open
within this review. Root retains the integration/browser/release gate.

Scope: the adopted [entity contract](tactical-entities-20260906.md), additive protocol
and server projection, bulk anchor validation/storage, new native V4 tests, preparation
and live entity outline, renderer selection bridge, reader scope wiring and tactical E2E
changes. This review owns this note and
`packages/client/test/tactical-entities-review.test.ts`. Root owns all product fixes.

The supplied preflight was 16 projection tests and five real PostgreSQL native V4
cases green, plus 46 existing tactical cases and the intentional PGlite race skip.
The supplied 70,000-object case verified fewer than 25 SQL calls for revision save
and projection. Those are handoff evidence; this reviewer did not rerun a complete
baseline, build a client, start a browser, install dependencies or access the operative
database. The independently executed evidence below is the new focused Node/Vitest
file. Its component harness executes actual source handlers and effects; its renderer
stub reproduces the documented `select` and selection-removal callbacks. It is not a
browser, accessibility-tree or GPU performance measurement.

## Confirmed findings and narrow corrections

1. **MEDIUM, corrected: an out-of-map GM outline choice could throw in the renderer.**
   Imported geometry may legitimately sit outside the image rectangle. Both the GM
   live list and preparation retain it, while `mapObjectWindow` excludes it. Both
   parents originally derived `focusedObject` from the complete list and sent its
   absent identity to `renderer.select`, which throws for identities outside the
   projected scene. Two red component regressions showed the actual invalid canvas
   input. Root now derives graphical focus from `visibleObjects` and retains a
   separate complete-list choice for editing/navigation. Both regressions passed.

2. **MEDIUM, corrected: controlled selection feedback erased the full-outline choice.**
   After selecting an in-map marker, selecting an out-of-map object must clear only
   the graphical selection. The real renderer emits `onSelect(null)` for this
   programmatic clear, which previously cleared the parent's outline state too.
   Selecting a previous overflow marker beyond the 20,000-pin window exposed another
   callback: `update` emits null when that marker leaves the graphical window.
   Four red regressions covered live/preparation and ordinary/overflow prior choices.
   Root now suppresses callbacks during controlled scene/selection synchronization;
   actual user callbacks continue through the same bridge. All four cases passed.

3. **MEDIUM, corrected: token removal needs an explicit controlled-selection guard.**
   The preceding synchronization fix removes
   an implicit dependency on renderer removal callbacks. After a selected token is
   removed by a replacement projection, `LiveBoard` still supplied that old token ID
   as its controlled selection. A new red regression passes a real replacement
   projection with `tokens: []` through the actual parent and canvas hooks. Root now
   derives a current `selectedToken` from `data.tokens` and clears stale parent state;
   the canvas receives null immediately when it is absent. The red regression passed
   in the independent final rerun.

## Additional results

- No confirmed server confidentiality or lineage defect. The same transaction-local
  knowledge decision gates regions and entities; explicit passage bindings require
  every active lineage successor. Article-bound objects use held active passages.
  Players also pass the existing map/known-region point test before the semantic DTO
  is written. Private asset, transform and passage metadata are absent from that DTO.
- Bulk validation preserves geometry uniqueness, campaign membership of the article,
  and passage/article association. The set-based storage statement retains null
  passage bindings and runs inside the existing command transaction. No additional
  migration or native-format revision is required by these changes.
- Digest construction includes the sorted semantic entity projection while retaining
  the raster digest boundary. Stable prior anchor sorting makes equal geometry IDs
  across kinds deterministic; the client keys kinds separately. Native tests exercise
  actual active/ended V4 restoration, matching projections/hashes/plans, hidden-asset
  twins, and rehashed invalid relations. The review found no format-extension shortcut.
- Focused checks pass for the 70,000-object complete searchable outline and selected
  overflow inclusion within the 20,000-pin limit, stamp/place ID collisions, and
  immediate quarantine of a cached GM projection when the current role is player.
- Draft review found the existing map-key remount and mounted-ack guard intact.
  Entity edit fields sit within the save task's disabled fieldset; canvas edits check
  task state. The command hook still fingerprints its original body for uncertain
  retries. This is source inspection, not a new network race measurement.
- Root's supplied real 409 withdrawal E2E checks removal of raster, entities,
  selection and canvas during failed refetch. The positive browser flow and broader
  integration gates remain Root's separate verification surface.

This review neither grants a 70,000-marker GPU performance release nor claims that
native V4 contains external stamp asset-library bytes. Both boundaries remain as
declared in the adopted contract.
