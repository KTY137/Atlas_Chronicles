# Universal Rules Chronicles — completion review (2026-09-14)

This note supersedes the **remaining-work assessment** in
`2026-09-13-universal-rule-runtime.md`; that earlier file remains the historical record of the
first host-authoritative slice.

## Delivered architecture

### One authoritative package per object

- Rule packages remain immutable, versioned and content-hashed.
- Actor templates pin their own package revision.
- Instantiated actors and player requests resolve that pinned package instead of silently falling
  back to ChronicleHeroes or to the campaign's current package.
- Character sheets, template authoring, player requests and action entry use the host-authoritative
  runtime manifest/preview path.

### Schema-driven character sheet

`layout.sections` is now a category tree. Every section has a stable `id`, a label, fields, and an
optional `parent` section id.

- Existing flat packages remain valid.
- Categories can be nested to 16 levels.
- Unknown parents, self-parenting and cycles are rejected by the package parser.
- A field can appear in at most one category; imported packages cannot create duplicate controls.
- Unplaced fields remain editable through the runtime fallback section instead of disappearing.
- Rule Forge stores parent relationships using draft-local identities so renaming a section id does
  not detach its children while editing.
- Deleting a category reparents its children rather than leaving broken references.

The same recursive renderer is used for character sheets, actor-template authoring/history, player
character requests and the Rule Forge test table. The package, not React code, decides whether a
sheet looks like `Fähigkeiten -> Handeln -> Klettern`, `Talents -> Knowledge`, or another tree.

### Ability catalog hierarchy

The existing backwards-compatible `RuleAbility.group` string also supports nested presentation
paths. A group such as `Combat / Melee / Swords` is rendered as three levels. Existing one-segment
groups are unchanged. This covers systems where a learned ability/feat/perk catalogue is distinct
from numeric sheet fields.

### Mechanics already expressible without a game-specific evaluator

The declarative engine supports:

- bounded numeric/string/boolean actor fields and action inputs;
- ordinary dice expressions, multiple independent dice nodes, keep-high/low and exploding dice;
- deterministic arithmetic/conditionals and derived values;
- action preconditions;
- fixed thresholds and ordered multi-band outcomes;
- cross-field constraints;
- declared vital resources;
- learned abilities, prerequisites, budgets and roll modifiers;
- active conditions and modifiers;
- package migrations and replayable/self-tested actions.

## Reference families

The normal product catalogue contains first-party Atlas reference mechanics. The separately exported
How-to-be-a-Hero adaptation remains a licensed example boundary and is not pulled into the product
bundle.

| Reference | What it proves |
| --- | --- |
| ChronicleHeroes | W100, large ability catalogue, prerequisites/modifiers, resources |
| Chronicles Lite | W50, exactly 100 broad individually rollable skills grouped under Handeln/Wissen/Soziales, Presentation v3 |
| D20 Fantasy Reference | Six attributes, derived modifiers, nested combat/stat blocks, W20 checks, vitality |
| 5E-compatible Reference | Level-based proficiency, six abilities, checks, attacks, collections and conditional spellcasting |
| 3W20 Talent Reference | Three independent W20 rolls against different attributes and a talent reserve, nested physical/social/knowledge groups |
| How to be a Hero adaptation (`@chronicle/rules/examples`) | Licensed example of field-based skills and W100 outcomes; intentionally outside the product bundle |

`UNIVERSAL_REFERENCE_PACKAGES` now contains D20, 5E-compatible, 3W20 and Chronicles Lite and is the
single catalogue consumed by the Forge and its round-trip regression. Chronicles Lite is therefore
no longer only a compressed test fixture: it is a normal exported `RulePackageV2`, can be opened as
a Forge draft, is parsed by the same runtime, and carries 100 ordinary W50 actions with no special
React or server evaluator.

Together these cover the structural/mechanical families needed to build D&D-like, Pathfinder-like,
DSA-like, HTBAH-like and custom systems in the Rule Forge without adding a game-specific React or
server evaluator.

## Bug regressions covered

- Actor-template dirty state is based on the actual draft instead of a blanket form `onChange`.
- Templates have an explicit discard/reset action, so cancel no longer traps navigation behind a
  permanently reasserted dirty flag.
- Switching rule packages replaces the template rule draft atomically.
- Actor instantiation and player requests use the template's pinned package even when the campaign
  currently uses another package.
- A real HTTP regression creates a non-active Chronicles-Lite template and verifies the resulting
  sheet keeps the template package.
- The production ActorWorkbench no longer contains a legacy rule-authoring path; canonical actor
  templates and instantiation use the host-authoritative components directly. Inventory and loot
  remain isolated in `ActorInventoryWorkbench`.
- Forge round-trip coverage now includes every product reference package, including Chronicles Lite.

## Deliberate boundary

This is now a universal **declarative** rule-package architecture, not an arbitrary host-language
plugin sandbox. A rule set that fundamentally requires imperative custom code, external network
calls, unbounded data structures, or arbitrary executable scripts is intentionally not accepted by
the package parser. New safe declarative primitives should be added when a real rule family cannot
be represented by the existing bounded vocabulary.

Inventory and loot remain their own first-class Atlas object model rather than being duplicated as
arbitrary rule-package collections.

## Verification note

GitHub Actions is still failing before checkout on the current `main` line: jobs receive no hosted
runner, expose no executable steps and produce no job-log blob. The issue was reproduced by a manual
re-run and again by the workflows triggered after the Chronicles-Lite integration. This is a
pre-runner GitHub Actions/infrastructure failure, not TypeScript or test output.

The repository therefore carries focused parser/runtime/client/HTTP regressions for the universal
paths, while final full-gate status must be taken from a workflow run that actually obtains a runner
and executes its steps. Until then the code should be described as implemented and statically
reviewed, but not as CI-green.