# How to be a Hero — playable template contract

Date: 2026-09-06. Status: **ADOPTED by root after two author rounds and independent contract review, with the binding corrections below**.

### Root adoption and binding review corrections

Root adopts candidate B on 2026-09-06. The independent review is recorded in
`how-to-be-a-hero-review-20260906.md`; it is a real review, not an implementation sign-off.
These corrections supersede conflicting proposal wording below:

1. **H1:** the legacy `adjustResource` command rejects all schema-v2 packages in the server
   domain before any mutation. HP and GBP use versioned sheet updates with explicit rule
   guidance; changing them does not automatically change defeat state. This policy follows
   the schema version, including template forks. Keep v1 resource/defeat semantics unchanged.
2. **H2:** v2 receipts include `packageContentHash`, the SHA-256 digest of the entire parsed
   package serialized by the existing canonical serializer. It covers attribution, unused
   computed expressions and collection order. Installation, preparation and native v5 replay
   use that same digest. This is content consistency, not proof of an external author.
3. **H3:** add supported-version registry/self-test installation, defaults and migration
   entry points as well as parse/evaluate/replay. Preserve legacy public entry points.
   Supported same-ID v2-to-v2 and explicit v1-to-v2 migrations are admitted only with the
   existing direct version step and explicit add/archive operations. Validate both source
   and destination fields, including cross-field constraints; preserve archived fields.
4. Aptitude zero failing on natural 1 is an explicitly labeled adaptation precedence.
   A single loss above 60 HP causes unconsciousness in the rules; applying the status is
   explicitly confirmed by the table. Critical damage is `2 * (Nd10 + agreed bonus)`;
   doubling the bonus is an explicitly labeled adaptation interpretation.
5. Native v5 must validate actor-definition history and unconsumed Vollmachten and support
   HTTP/CLI/host dispatch. Any installed v2 package, including an inactive one, selects v5.

Confirmed implementation attacks must have a failing regression before their correction.
Delivery remains conditional on the complete template, character, receipt and archive flow.
Implementation is now integrated in the working tree; see `docs/HTBAH.md` and
`docs/CAMPAIGN_FORMAT_V5.md`. The operative b415f03 checkout remains unchanged until the
new integrated checkpoint receives its own gate.
The stakeholder has already authorized the playable template. This review is an internal design
decision, not a request for permission from the stakeholder.

### Adopted implementation corrections (2026-09-06)

- **H4:** Current runtime native admission requires reciprocal successful confirmed roll/mint
  evidence, including explicit legacy upgrades. Frozen public legacy parsers stay unchanged.
- **H5:** Stored roll action, actor and package pin must match the validated/replayed receipt
  before cached preparation, replay or confirmation can trust it.
- **H6:** Incomplete visual expressions retain the local AST and expose validation. The parent
  package is invalidated until corrected; the previous valid expression is never silently used.
- **H7:** Optional text permits empty strings. Native required applies to numeric fields; field
  descriptions and requirement hints are separate from the stable field label.
- **H8:** Prepared400-point examples are offered only for compatible field sets/calculations and
  valid actual400-point values. Custom catalogues retain manual editing and get an explanation.

H1–H3 are binding contract corrections. The confirmed implementation attacks H4–H8 have
failing-before-fix evidence and scoped independent verification in the linked implementation
and client review records. H4/H5 pass seven IO/server cases;
the strengthened client review passes nine cases. The HTBAH and legacy-ruleforge browser flows
pass together in15s at `.local/e2e-htbah-labels`; live operative deployment is a separate step.

## 1. Product verdict proposed

Adopt candidate B: a complete configurable HTBAH template, backed by a small **explicit rule
package v2** capability for classifying one evaluated result. Preserve the v1 formula language,
v1 package parser, v1 receipt bytes and existing deterministic replay. Ship the corresponding
**native campaign v5** envelope before claiming a campaign using this template is portable.

The delivered route is Rulewerkstatt → HTBAH template → choose the campaign's skill catalogue →
inspect two character examples → install → review activation → activate → create/edit a character
→ roll skills, aptitudes, initiative and damage → confirm receipts → track HP and Geistesblitz.
All real rolls and saved sheets use the existing authorized server commands. No browser RNG,
hidden change to the campaign pin, executable package code, or destructive replacement of receipts.

## 2. Official sources and the edition we implement

Sources were opened through the browser on 2026-09-06. No community expansion is treated as core.

| Source | Pinned evidence and use |
| --- | --- |
| [Official rulebook index](https://howtobeahero.de/index.php?title=Kategorie:Regelwerk&oldid=36116) | Directly links the official PDF; separately labels Hoschianer's community revision. |
| [Official PDF](https://howtobeahero.de/images/4/47/Regelwerk.pdf) | 21 pages; main mechanical baseline. [File history](https://howtobeahero.de/index.php?title=Datei:Regelwerk.pdf&oldid=5015) records current upload on 2018-05-26 by Blackcat2447. |
| [Approved checks revision, oldid 27220](https://howtobeahero.de/index.php?title=W%C3%BCrfe_%26_Proben_(kritische_Erfolge_%26_Fehlschl%C3%A4ge)&oldid=27220) | Approved 2021-04-08 text: 1 and 100 special cases; inclusive critical failure example 97–100 at skill 70. |
| [Latest checks revision, oldid 33560](https://howtobeahero.de/index.php?title=W%C3%BCrfe_%26_Proben_(kritische_Erfolge_%26_Fehlschl%C3%A4ge)&oldid=33560) | Unapproved revision, 2022-07-27 by SirT0b1: changes that example to 98–100. Recorded divergence; **not the selected edition**. |
| [Approved Begabungen, oldid 27263](https://howtobeahero.de/index.php?title=Begabungen&oldid=27263) | Three groups and commercial rounding. Footer credits Murmel Gippert, Mariana Friedrich, Mewo and others. |
| [CC BY-NC-SA 4.0](https://creativecommons.org/licenses/by-nc-sa/4.0/) and [legal code](https://creativecommons.org/licenses/by-nc-sa/4.0/legalcode.en) | The official wiki footer links this license. Attribution, change notice, noncommercial use and share-alike requirements remain visible and travel with the template. |

**Edition label in the product:** “How to be a Hero · Grundregelwerk (PDF 2018, bestätigte
Wikifassung 2021)”. This is an Atlas Chronicles adaptation; it is not endorsed by HTBAH.

The PDF's 10%-of-target critical failure boundary is inclusive. The approved wiki's assertion
that 97–100 represents 3% is arithmetically wrong; the implementation follows its enumerated
outcomes and the PDF formula, never repeats that probability claim. Latest wiki behavior is
shown in the source note so a group can deliberately fork a newer interpretation.

### Concrete mechanics

Let `G` be one of Handeln, Wissen, Soziales; `P[s]` the raw assigned skill points; `B[G]` the
aptitude; `E[s]` the effective skill; `U[G]` spent Geistesblitz; `r` the single W100 result.

- Character creation starts with 400 points. Advantages/disadvantages and later development
  can alter that allocation by agreement. Display spent/available points; do not lock every
  campaign character forever to exactly 400.
- `B[G] = round(sum(P[s] in G) / 10)`. Values are nonnegative, so v1 `round` implements the
  required rounding. `E[s] = P[s] + (applyBonus[s] ? B[G] : 0)`.
- An effective skill above 100 is **invalid**, rather than silently capped: the PDF asks the
  player to redistribute excess points within the group. A raw 0 denotes an unlearned skill;
  the corresponding action is unavailable and the group action remains available.
- Maximum Geistesblitz is `round(B[G] / 10)`; remaining is maximum minus `U[G]`. Track spent
  integers starting at 0, preserving expenditure when skill values change. A change that makes
  spent exceed the new maximum needs explicit correction in the sheet form.
- HP start at 100. The sheet reports unconsciousness below 10 and death at 0 as rule guidance.
  A single loss above 60 can also cause unconsciousness; this is a table decision displayed
  beside the damage result, not an invented automatic status mutation.
- Initiative is one W10 plus Handeln; highest result acts first. No combat scheduler is claimed.
- Skill result priority: `r == 100` critical failure; `r == 1` critical success;
  `r >= 90 + E/10` critical failure; `r <= E/10` critical success;
  `r <= E` success; otherwise failure. Integer dice naturally resolve fractional boundaries
  without an extra rounding rule. Example E=73: critical success 1–7, critical failure 98–100.
- Aptitude result priority: `r == 100` critical failure; `r >= 90 + B/10` critical failure;
  `r <= B` success; otherwise failure. The PDF's specific “no critical success for aptitude”
  overrides the wiki's general natural-1 wording; at aptitude 0 even 1 is not successful.
- Damage uses chosen N W10 plus an agreed flat bonus, and doubles the rolled damage for a
  critical attack. N is a bounded integer 1–10; weapon names/damage assignments remain the
  group's choice. The template gives no copyrighted weapon table as compulsory catalogue.
- A parry is an aptitude check on Handeln. The once-per-round limit, ranged attack exception
  and inability to parry critical attacks remain explicit table guidance.
- Geistesblitz may repeat a failed check in the same group, excluding critical failure. Regain
  points only through an explicit “Neuer Abend / Abenteuer: Punkte auffüllen” sheet operation.

**Modifiers:** the approved core text allows SL bonuses/penalties but does not settle a general
critical-boundary algorithm for modified checks. Automatic core actions therefore use the
unmodified sheet value. An explicitly named “Abgesprochene Probe” accepts the final target,
critical-success maximum (0 disables) and critical-failure minimum from the SL's ruling and
records those inputs in the receipt. It preserves natural 100 and the skill-only natural 1.
It never labels a new target/modifier convention “official”. The normal actor-bound action
remains the primary flow; no user must retype a known skill for an ordinary check.

## 3. Current implementation constraints inspected

Read: CLAUDE.md, .claude/AGENT_PROTOCOL.md, STATUS.md, rules demo/package/formula/validation/
migration, RuleForge, rule-forge-model, RuleForgePreview, CharacterSheet, TableView, RollCard,
game-api, protocol gameplay, server gameplay/actors and native campaign validators.
`docs/RULEFORGE_UI.md` does not exist in the inspected tree.

- Formula v1 has actor/input references, numeric/boolean operations, `if`, min/max/round and
  bounded dice. It has no local bindings; each syntactic dice evaluation consumes another roll.
- A v1 action must return a number. Its only packaged success semantics are fixed
  `total >= threshold`. Parsing rejects extra properties and unsupported schema/engine versions.
- Trace and receipts are deterministic and package-pinned. Changing their shape under v1 would
  break exact replay even where the arithmetic happens to agree.
- Field validation currently checks each scalar independently. It cannot validate an effective
  skill that depends on its group's raw total. Field/action maxima are each 64.
- Server roll preparation takes a saved authorized actor sheet and server seed. Confirmation
  uses receipt.success and replay; receipts with no success flag are treated as successful.
- Vollmachten use `total >= authorization.threshold` independently of package success. A raw
  W100 classified roll must not be routed through that existing threshold-only authorization.
- Resource adjustment currently marks defeat_pending whenever **any** adjusted number reaches
  zero. Geistesblitz must use version-guarded sheet updates. No token of luck reaching zero may
  mark defeat. A separate generic resource-semantics change is outside this contract.
- Package migration permits different versions of the same package, not arbitrary system swaps.
  Existing characters cannot silently switch from Spuren to HTBAH; see activation below.
- Native v1–v4 manifests declare `rulePackageSchemaVersion: 1`; v4 recursively validates v3/v2/
  v1 content. Reusing that envelope for v2 packages would misstate the portable format.

## 4. Round 1 — materially different candidates and attack

### Candidate A: v1 package plus a system-aware presentation adapter

Generate raw point fields and `min(99, max(1, E)) - 1d100` with threshold 0 for skills;
derive critical labels from the saved die trace in a dedicated HTBAH client component. All
existing persistence can remain v1. Aptitudes use their own margin formula without natural-1
success. Benefits: narrow patch, immediate sheet/roll use. Costs: the definitive classification
is missing from the portable package; exported packages need undocumented executable client
knowledge; activation/default skills and cross-field validity still need a second validator.

### Candidate B: v2 result classification and portable declarative template

Evaluate the primary expression once. Resolve ordered, dice-free threshold bands against that
stored numeric total, recording decisions in a v2 receipt. Add bounded computed sheet outputs,
cross-field assertions and attribution data to package v2. The template is portable declarative
data; the engine remains generic. Costs: a versioned package/receipt branch, native v5 and a
complete integration/test seam, rather than a single new demo constant.

### Round-1 design attack (author self-review, not a fabricated independent review)

| Seat perspective | Finding | Disposition |
| --- | --- | --- |
| Integrity | A can export a seemingly valid package with no portable critical-result meaning. | Reject A as the final product. |
| Adversarial | Repeating d100 inside if conditions can classify different rolls. | B evaluates the primary expression once; bands forbid dice. |
| UX | Only a raw roll/free-value action would still require hand-calculating an entire character. | Actor-bound actions, computed group/effective/GBP values and configurable catalogue are required. |
| Buildability | “Just v2” touches native replay and actor definitions, not only the rules parser. | Explicit file/dependency plan below; no v2 campaign admitted before native v5 is ready. |
| Ambition | A works as a private adapter but fails a reusable rule-workshop product. | B carries the reusable package contract; preserve the entire playable scope. |

Round-1 verdict proposed: retain B; refine it with explicit limits and compatibility boundaries.

## 5. Round 2 — concrete revised contract

### 5.1 Keep v1 frozen; introduce explicit supported-version entry points

Keep `parseRulePackage`, `evaluateAction`, `replayAction`, their v1 types, formula AST/parser,
RNG algorithm and receipt construction unchanged. Add `RulePackageV2`, `ActionResultV2`,
`AnyRulePackage`, `AnyActionResult`, `parseSupportedRulePackage`, `evaluateSupportedAction`,
`replaySupportedAction` and `validatePackageFields`. The supported functions dispatch by exact
schema version and call the existing v1 functions for old packages. Unknown versions still fail.
Runtime/UI integrations adopt the supported functions; legacy archive entry points stay v1.

Package v2 retains all common v1 properties, fields, layouts and migrations; its `engineVersion`
remains `1.0.0`, identifying the unchanged formula interpreter. It adds these closed records:

```ts
// Package-level optional properties, with explicit bounded lengths.
computed?: { id: string; label: string; expression: string }[];
constraints?: { id: string; message: string; expression: string }[];
attribution?: {
  title: string;
  sources: { title: string; url: string; revision: string; authors: string[] }[];
  licenseUrl: string;
  notice: string;
  changes: string;
};

// Optional v2 action property; mutually exclusive with fixed threshold.
outcome?: {
  bands: {
    id: string;
    label: string;
    comparison: "eq" | "lt" | "lte" | "gt" | "gte";
    expression: string;
    success: boolean;
  }[];
  fallback: { id: string; label: string; success: boolean };
};
// Optional v2 action preconditions, checked before any dice are evaluated.
preconditions?: { id: string; message: string; expression: string }[];
```

Limits: at most 64 computed outputs, 64 package constraints, 8 action bands, 8 action
preconditions, 8 sources and 32 authors per source; labels 120, messages/notices 1024,
source URLs 2048 characters; existing 1 MiB package limit still governs everything.
All IDs unique within their collection. Output IDs may not collide with stored field IDs.
Computed outputs are numeric and read-only, never accepted as saved fields or inserted into
actor context. Their expressions may reference stored actor fields only; they cannot reference
other computed outputs. No hidden dependency graph or cache is introduced.

Constraints/preconditions return boolean. All computed, assertion and band expressions prohibit
dice **and knowledge predicates**; use actor/input scalar context only, with input allowed only
in action preconditions/bands. All references are checked statically. Formula complexity limits
apply individually, and v2 evaluation sums all formula operations against a single bounded
operation budget. A package cannot evade the operation limit by adding many decision bands.

An action's primary expression is evaluated once. Bands compare its numeric total with their
dice-free numeric expression in declaration order. Evaluate all band thresholds in a deterministic
order before choosing the first match, so bad unreachable expressions cannot lurk behind a prior
match. The fallback handles no matches. Generic support permits overlapping bands deliberately;
the order is part of the immutable package and is visible in the editor.

`ActionResultV2` has schemaVersion 2, packageSchemaVersion 2 and outcomeVersion `1.0.0` alongside
the unchanged formula engine/RNG identifiers. Its primary expression/normalForm/dice/trace/total
retain the original calculation, plus:

```ts
outcome?: {
  id: string; label: string; success: boolean;
  matchedBand: number | null;
  comparisons: { id: string; comparison: string; threshold: number; matched: boolean }[];
};
```

Record deterministic band-expression traces separately (`outcomeTrace`), never splice them into
the primary trace as if they consumed the primary RNG. Receipt.success equals the selected
outcome success. V2 self-tests support optional expectedSuccess and expectedOutcomeId in addition
to expectedTotal; v1 self-tests retain their original closed shape and semantics. Replay compares
the complete versioned receipt. Altering its outcome, order, threshold, trace, seed or source
package must fail exact replay. Narrative confirmation remains the existing human operation.

### 5.2 Template data and character model

The initial template builder offers an **editable campaign skill catalogue**, not mandatory
canonical skills. Each skill has stable ID, label and group. Allow 1–24 skills total and explain
that this catalogue is shared by the campaign; each character invests only in skills they know.
Include a removable original example catalogue and a “Ohne Beispiele beginnen” option. Example
characters are explicitly examples and allocate 400 points; no random generation is implied.

Each skill adds raw integer points 0–100 and an applyBonus boolean (default true). Remaining
stored fields: name, profession, notes, HP 0–100, three spent-GBP counters, agreed point-budget
adjustment. At 24 skills this is 56 stored fields, below the existing 64 bound. Computed outputs:
three group values, three GBP maxima/remaining pairs, 24 effective skills, spent/available points
(at most 35 outputs). Formula strings duplicate only dice-free group sums and stay within 4096
characters. IDs are sanitized stable identifiers; labels are plain text and never executable.

Package constraints enforce effective skill ≤100 and each spent counter ≤ its derived maximum.
They deliberately allow incomplete allocation during editing and later advancement. UI displays
the 400-point creation budget, adjusted budget, unspent or overspent state and requires the user
to address/willingly record overspending before calling the character ready; the package does
not falsely claim a universal advancement cap. Action preconditions disallow unlearned skill
actions; aptitude actions remain usable, including the possibility of zero chance.

Actions: one per configured skill; Handeln/Wissen/Soziales aptitude checks; initiative; damage;
and an explicitly manual-ruling check. This is at most 30 actions. The damage action chooses one
literal `Nd10` branch using input count 1–10; only the selected branch evaluates dice. A critical
boolean multiplies the completed damage once; it does not request a second damage roll.

### 5.3 Product integration and existing commands

- RuleForge gets a visible “How to be a Hero” template card with edition, attribution and
  noncommercial license. Choosing it opens a draft and never installs/activates automatically.
  Skill edits regenerate only the draft after a dirty-state guard. Ordinary package authoring
  remains available; opening/exporting a v2 package retains all v2 fields losslessly.
- RuleForge adds editable ordered outcome bands, computed values and constraints with the same
  formula builder where applicable. The parser remains authority. Template conveniences may
  use dedicated catalogue controls, but importing/forking may not erase unsupported UI data.
- Testtafel uses the same supported evaluator as the server, displays raw die, outcome, resolved
  thresholds and computed character values, and can save a test that checks the classification.
- CharacterSheet shows computed outputs and validation errors before save; backend validates
  the same constraints on all sheet/actor writes and archive import. HP/GBP remain explicit
  sheet changes. Restrict the template's resource-adjustment UI to HP; zero GBP is saved only
  through the versioned sheet route, leaving existing defeat semantics untouched.
- TableView's ordinary actions use saved actor values. RollCard and preview show the selected
  outcome before/after confirmation and label failures “Probe misslungen”, avoiding the
  threshold-up language for roll-under outcomes. A roll carries no automatic damage mutation.
- Spend GBP through `PUT /actors/:id/sheet` with expectedVersion, then make a new explicit roll
  using the original action/inputs. Keep the previous receipt. The two operations are visibly
  separate; no atomic refund/replacement claim and no automatic replay of a network-ambiguous
  save. A pending point expenditure is resolved by refreshing the authoritative sheet. Manual
  reset uses the same route. Eligibility guidance comes from the prior receipt's classification.
- Reject issuing a threshold-only Vollmacht for a v2 action with outcome; hide it from that
  UI selector. Existing v1 and threshold-only v2 delegations preserve their current semantics.
  Ordinary HTBAH checks with explicit confirmation are fully supported.

**Activation:** a new campaign with no saved sheets may select the template through the existing
reviewed activation route. Once sheets exist, preserve the existing same-ID migration rule.
The template card must explain “Für eine neue Runde; vorhandene Figuren benötigen eine explizite
Migration” when crossing systems. Do not quietly install HTBAH under the Spuren ID or discard
old fields. For the requested immediately playable demonstration, create/use a fresh explicitly
selected campaign in the product test. Cross-system migration is a separate future contract.

### 5.4 Native archive and storage consequences

SQL rule documents and receipts are already JSON; v2 needs no new DB table. Historical package
rows are immutable and historical receipts remain unchanged. Actor definitions can retain their
existing versioned shape and package pin; their fields must be validated with that pinned package.

Native v1–v4 retain strict v1 package and v1 receipt admission, including their declared manifest.
Add **native v5** with the same table set as v4, `rulePackageSchemaVersion: 2`, a named supported
rule/receipt profile (accepting package/receipt v1 and v2 with matching pins), and explicit version
dispatch. It retains all authoring/tactical/source validation and inclusion. A v4→v5 migration
changes only the envelope/profile and its hashes; it never upgrades package/receipt bytes.

Refactor shared core validation behind an internal explicit profile parameter if required; public
legacy constructors always pass the frozen v1 profile. Never manufacture a fake v4 bundle from
v2 rows to bypass old validators, and never strip outcome data for export. New v5 validation
checks the same package hashes, sheet constraints, receipt replay, confirmation seals and mint
success implications using the supported-version dispatcher. Reject a v2 classified action
attached to an old threshold-only Vollmacht, including imported rows.

Exporter selects v5 when the campaign contains any v2 rule package/receipt, including installed
but inactive packages, and otherwise may continue producing v4. Import supports both. Failure
to support v5 export is a delivery blocker for template installation; it is not a reason to
silently make the campaign nonportable. Include explicit client error for unsupported formats.

## 6. Round-2 self-attack and remaining independent review

| Finding | Correction in revised B | Remaining proof |
| --- | --- | --- |
| Pinned approved/latest source divergence | Edition ID and notes above, inclusive approved boundary tested. | Reviewer checks exact 70/97 and 73/97 cases. |
| Re-evaluation could roll again | Ordered thresholds prohibit dice; original expression evaluated once. | One W100 in dice trace and seed-bound replay test. |
| Group bonus can push skills past 100 | Generic package constraints, shared across write/roll/import paths. | Hostile direct HTTP/save/actor blueprint/import tests. |
| Last GBP could mean defeat | Spent counters and versioned sheet saves; HP-only resource UI for template. | GBP 1→0 remaining leaves defeat_pending false. |
| Low-is-good roll could invert delegated mint | Outcome actions rejected by threshold-only Vollmacht issuance/import. | Failed critical roll cannot mint via direct request or altered archive. |
| New package silently accepted by old archive | Frozen old profiles plus explicit native v5. | Old archives/receipts byte stable; mislabeled v4+v2 rejected. |
| Template works only for one hardcoded hero | Configurable stable skill catalogue; per-character raw values and bonus opt-out. | Two characters with different skills/groups, edit/reopen/roundtrip. |
| Automatic regeneration could erase a custom draft | Dirty guard and explicit catalogue regeneration. | Imported v2 roundtrip preserves attribution, constraints and outcome order. |
| Unlimited point edits mistaken for faithful creation | Visible budget readiness and explicit adjustment; advancement remains possible. | Original example spends 400 and illegal effective skill fails. |
| Cross-system activation promise exceeds current migration | Fresh campaign flow; existing system migration remains explicit and blocked. | User-facing activation path succeeds without existing sheets, rejects destructive swap. |

These are **two actual author design rounds**, not external Athena/Nemesis sign-offs. Apollon
must route the final contract for independent integrity/adversarial/buildability review before
consequential code and record the adoption verdict here. Confirmed implementation attacks become
failing regressions before fixes. No named seat is claimed to have reviewed code not yet written.

## 7. Exact proposed file boundaries and order

Only this new design file is currently owned/changed by the template worker. After adoption:

1. **Rules owner:** new `packages/rules/src/package-v2.ts`, `outcome.ts`,
   `templates/how-to-be-a-hero.ts`, `templates/how-to-be-a-hero.LICENSE.md`,
   `packages/rules/schema/rule-package-v2.schema.json`, and focused tests
   `packages/rules/test/package-v2.test.ts`, `how-to-be-a-hero.test.ts`;
   export wiring in `packages/rules/src/index.ts`. Leave formula.ts and package.ts frozen;
   any reusable v1 internals required by v2 are factored only with unchanged v1 test evidence.
2. **Archive owner:** new `packages/io/src/native-v5/**`,
   `packages/io/schema/campaign-v5.schema.json`, native-v5 tests and profile-preserving internal
   factoring in campaign-bundle.ts/v2/v3/native-v4. This owner also integrates native export/
   import server dispatch and docs/CAMPAIGN_FORMAT_V5.md. Root assigns exact seam ownership.
3. **Root backend integration:** packages/server/src/domain/gameplay.ts and actors.ts adopt
   supported package/receipt/entity validation; issueVollmacht rejects classified outcomes;
   focused gameplay-rule-bounds/rule-preview/server-native tests. No new SQL migration intended.
4. **Root/client integration:** RuleForge.tsx, rule-forge-model.ts, RuleForgePreview.tsx,
   CharacterSheet.tsx, RollCard.tsx, TableView.tsx, game-api.ts, package import/export components;
   new template catalogue component/model and client tests; doc docs/HOW_TO_BE_A_HERO.md.
   FormulaBuilder remains v1 and only receives contexts supported by that grammar.
5. **Root verification/handoff:** bounded rule/client tests → combined real-PostgreSQL gate →
   canonical client build → fresh-campaign browser flow and archive reopen → independent attack
   → exact committed-tree verification → STATUS.md. Coordinate shared build/browser windows.

Do not touch parallel painted assets, grundriss, kartenwerk, Eron import or shell-lab work.

## 8. Test matrix and acceptance

- Frozen v1 package/demo/normalForm/trace/receipt fixture bytes and deterministic replay;
  v1 rejects every v2 key. Native v1–v4 unchanged fixtures remain valid and reject v2 content.
- Every W100 result 1–100 for representative skill values 0, 1, 9, 10, 70, 73, 99, 100 and
  aptitude 0, 1, 7, 10, 40; exactly one primary die, ordered critical priority, equality success,
  70/97 critical failure under selected edition, 73/97 ordinary failure, 100 always failure,
  skill 1 critical success, aptitude 1 ordinary success only when target permits.
- Rounding at raw group totals 124/125 and aptitude 14/15; bonus opt-out; effective >100
  rejection, mismatched source/catalogue IDs, raw zero skill action rejected; edited catalogue
  point allocation and spent GBP constraints. No computed field can be injected into a sheet.
- Outcome parser rejects duplicate IDs, malformed comparisons, dice in bounds/assertions,
  knowledge predicates, unknown references, scalar types and operation-budget bypasses.
  Self-tests fail when success/classification disagrees even if total matches.
- Saving and reopening 400-point characters; authorized and unauthorized actor writes; stale
  sheet/activation review conflict; GBP use/reset with zero remaining and no defeat; no claims
  of atomic repeat. Damage 1W10/10W10 plus flat bonus and critical doubling use one dice branch.
- Direct and imported outcome-bearing Vollmachten rejected; failed check with target passage
  cannot mint, confirmation/replay retains raw roll/outcome/attribution.
- Native v5 roundtrip with old+new packages and receipts, v4→v5 receipt bytes unchanged,
  tampered band/order/outcome/trace/package hash/source attribution rejected by pinned replay
  or package hash, source-artifact completeness preserved. Installed inactive v2 also selects v5.
- Browser: template discoverable → edit catalogue → example preview → install/review/activate
  fresh campaign → edit/save/reload character → skill/aptitude/initiative/damage rolls → confirm
  and replay → GBP tracked → download/reopen native archive. Inspect desktop and narrow layout.

Acceptance means that flow is verified and exported data remains independently interpretable.
A design document, a demo constant alone, or only unit tests do not constitute the requested
playable-template delivery.

## 9. License packaging

All template content/data generated from HTBAH is explicitly marked **CC BY-NC-SA-4.0**, with
official title, edition/source URLs, attribution to the How to be a Hero team/wiki contributors
and named credited contributors where supplied, license URL, and an original concise change
notice (“Für Atlas Chronicles in deklarative Regeln und Bogenfelder übertragen; Erläuterungen
neu formuliert; bestätigte Regelversion festgeschrieben.”). Retain earlier modification notices
on forks and append the current change. Source revision links retain contributor histories.

Do not invent individual authorship for the PDF uploader; distinguish upload history from
authorship. No logo, illustrations, PDF byte copy, book layout or wholesale rule text is bundled.
The template's notice is carried inside exported `.rules.json` and native package documents,
rendered in the RuleForge template detail and character information, and kept in its colocated
license notice. The root MIT engine license remains a separate license for engine/source code;
do not describe the entire distribution or exported template as MIT-only. This delivery is the
authorized noncommercial template integration; commercial redistribution needs its own rights
assessment and is not represented as authorized by this CC license.

## 10. Adoption ledger

- 2026-09-06: root directs a pinned approved PDF/wiki edition, unchanged legacy semantics,
  archive consequences before v2, whole playable scope, and versioned sheet saves for GBP.
- 2026-09-06: this worker proposes candidate B after two documented self-review rounds.
- Independent review: pending. Apollon's adoption: pending. Implementation: not started.
