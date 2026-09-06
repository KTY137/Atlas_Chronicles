# How to be a Hero: independent implementation review

Date: 2026-09-06. Reviewer: independent Codex adversarial reviewer, routed by root.
Scope: rule-package v2, supported migrations, the pinned HTBAH template, native v5,
their frozen legacy-profile seams and the HTTP/CLI/host version dispatch. Root later
extended this review to the now-stable gameplay/actors integration diffs. The adopted
contract and its binding corrections govern this review.

## Verdict

**H4 (HIGH) and H5 (MEDIUM) are corrected and independently verified.**
H4 covered both v5 and inherited v4 runtime admission; H5 is a server-side defensive
receipt-to-row identity check, confirmed after root extended the review scope. No
additional confirmed finding remains open within this review's boundaries.
No additional confirmed issue in the inspected pure-rule or version-dispatch surfaces.
This is a bounded implementation review, not a release approval or a browser/DB gate.

## H4: native v5 accepts a mint from a failed or unconfirmed roll

Location: `packages/io/src/campaign-bundle.ts`, `checkEvidence`, the
`confirmed_mints` loop (approximately lines 369-374 at the reviewed snapshot).

The roll loop checks a non-null `confirmation.mint` against its stored mint and checks
the confirmation success against the replayed receipt. The reverse direction is absent:
a stored roll-backed mint is only checked for provenance, identity and seals. Its roll
need not have a successful confirmation naming that mint. `provenance` checks the roll
pin and receipt digest but does not establish success or confirmation.

Confirmed local counterexample:

1. Keep the real deterministic v2 HTBAH receipt in `campaignFixtureV5`: aptitude
   Handeln 15, W100 21, `success:false`.
2. Give the roll a target passage/hash and a correctly sealed failure confirmation
   with `mint:null`.
3. Add a separate `confirmed_mints` row with `kind:"wurf"`, the same roll/pin/receipt
   digest, valid provenance and the correct mint seal. Put the same provenance in the
   revision document and recompute its required digest.
4. `createCampaignBundleV5` accepts the inconsistent state. It also accepts the same
   mint when the roll is pending with no confirmation at all.

These are coherent local checksums around contradictory semantic evidence, not a
claim to forge an externally authenticated author or defeat keyed cryptography.
The mint row contradicts the supplied unchanged replayable failed receipt. Because
`validateCampaignBundleV5` delegates payload validation to the same constructor, the
gap is on the native import/export validation path.

Regression: `packages/io/test/campaign-bundle-v5-review.test.ts`.
Command: `npm.cmd test -- packages/io/test/campaign-bundle-v5-review.test.ts`.
Initial independent run at 20:22:24 local: **2 failed**, both
`expected [Function] to throw an error`.
Expanded run at 20:23:46 local: **2 failed, 2 passed**. The added controls confirm that
a properly reciprocal successful v2 mint and a confirmed failed roll without a mint
are currently admitted.

Smallest correction: within the explicit supported-rules profile, require every
roll-backed mint to reference a confirmed roll whose validated confirmation is
successful and whose `confirmation.mint` reciprocally identifies the same immutable
mint. Keep the existing receipt/authorization success calculation authoritative and
retain its classification ban for threshold Vollmachten. Apply this profile invariant
to both supported rule generations; keep public legacy profile behavior frozen.

Root owns the product correction. The reviewer changed no product code.

At root's request, the same counterexample was checked with the frozen v1 receipt
(total 3, `success:false`) inside a genuine v4 envelope. The legacy v4 constructor
admits it and `validateCurrentCampaignBundle` also admitted it. A fifth regression
preserves the old constructor's behavior but requires current-runtime v4 admission to
reject the orphan mint. At 20:25:06 local: **4 passed, 1 failed**. Root's v5 reciprocal
confirmation check had landed by that run and all four prior regressions passed.

Root added the shared `requireReciprocalMintEvidence` invariant to v5 and current-runtime
v4 admission/export, while frozen legacy constructors remain unchanged. The reviewer
also inspected the explicit v1/v2/v3 upgrade destinations: all now pass their upgraded
v4 through current admission before DB mutation. Independent final focused run at
20:27:01 local: **5 passed in 1.29 seconds**. H4 is closed within this tested scope.

## H5: server replay and confirmation do not bind receipt to stored actor/action

Severity: **MEDIUM, defense in depth**. Location:
`packages/server/src/domain/gameplay.ts`, `replayRoll` and `confirm`.

The digest and pure replay checks validate a receipt against its package, but omit
`receipt.action.id === roll.action_id` and
`receipt.context.knowledge.actorId === roll.actor_id`.
The current classified-Vollmacht checks do not close nondelegated receipt-row identity.

Two disposable PGlite attacks in `packages/server/test/htbah-gameplay-review.test.ts`
create legitimate sheets, targets and prepared rolls, then insert a fresh inconsistent
row with a correctly sealed, independently replayable receipt:

- A row retains `action_id=aptitude_handeln` from a real failed 21-on-15 roll, while its
  receipt records successful `skill_klettern`. `replayRoll` returns `valid:true` and
  `confirmAction` resolves `success:true` with a real minted passage.
- A row retains the controlled actor identity while its successful same-action receipt
  has `context.knowledge.actorId="unrelated-actor"`. Replay and mint confirmation also
  accept it; resulting provenance attributes the mint to the stored actor.

Boundary: an initial attempt to UPDATE an existing receipt was correctly blocked by
the SQL immutability trigger. The confirmed tests use newly INSERTed inconsistent rows,
as do the existing planted-Vollmacht tests. Strict native import already checks these
actor/action identities. This finding does **not** claim an ordinary HTTP caller can
replace a receipt, bypass the immutable trigger or import such a forged v5 bundle.
It concerns the server's promised defensive evidence verification and prevents a
corrupt persisted row from minting or making a campaign unexportable.

Command: `npm.cmd test -- packages/server/test/htbah-gameplay-review.test.ts`.
Confirmed run at 20:28:51 local: **2 failed**; both returned `valid:true` and resolved a
mint confirmation where rejection was required. This ran only disposable PGlite and
did not connect to the operative PostgreSQL database.

Root implemented `validRollEvidence`, sharing complete receipt-row verification between
replay and confirmation: package document/receipt/row pins, action ID, knowledge actor
ID, receipt digest and pure replay. It executes before mint mutation, before returning
stored confirmation evidence and on cached preparation retries. The reviewer inspected
those call sites; valid receipt bytes and authority checks remain unchanged.

Independent final command:
`npm.cmd test -- packages/io/test/campaign-bundle-v5-review.test.ts packages/server/test/htbah-gameplay-review.test.ts`.
At 20:30:42 local: **7 passed in 2 files, 2.81 seconds**. Both transplant attacks now
reject confirmation, report invalid replay, leave the planted roll pending and create
no mint. The five archive attacks/controls remain green. H5 is closed within this
tested scope.

## Examined boundaries and limits of evidence

- V2 additions are parsed as closed records after a frozen-v1 common-field projection.
  Declarative formulas prohibit dice and knowledge predicates; references/types are
  checked. Complete stable-JSON package hashing and exact receipt replay cover unused
  expressions, attribution and array order.
- Field constraints/computations, action preconditions, the primary evaluation and all
  declared outcome bands share the 4096-operation counter. The primary roll is evaluated
  once; every threshold is evaluated before selecting the first matching band.
- Supported migration enforces direct same-ID transitions, no schema downgrade,
  explicit add/archive steps, source/destination constraints, preserved archived values
  and the adopted three bounded phases. No additional bypass was confirmed.
- The template implements the pinned approved inclusive critical boundary, natural
  1/100 precedence, explicit aptitude-zero interpretation, rounded group/GBP values,
  learned-skill preconditions, effective-skill bounds, one selected damage dice branch
  and explicit source/adaptation notices. The supplied exhaustive test baseline was
  inspected; its 1200 rolls were not rerun merely to reproduce the baseline.
- Native v5 normalizes shared tables under its explicit supported profile, without
  constructing a fake v1-v4 envelope. Legacy public constructors retain the fixed v1
  profile. Actor definition revisions and historical request/cards reach the selected
  field validator; unused v2 classified-action Vollmachten are rejected.
- Native v5 retains tactical/authoring validation and table inclusion. Installed but
  inactive v2 package detection and HTTP/CLI/host dispatch are present. The structural
  schemas and their version/profile declarations were inspected; no independent JSON
  Schema engine was installed or invoked.

The root-provided baseline was 109 pure tests in three files (including 51 frozen
legacy cases and 1200 real W100 outcomes), and 66 archive tests (11 v5 plus 55 legacy).
Those are provided baseline results, not independently rerun counts. Root later supplied
18 successful server PostgreSQL tests and a full v5 real-PostgreSQL roundtrip; these were
also not repeated merely to reproduce the baseline. This reviewer ran only the new
attack regressions above. No server gameplay/actors product edits,
dependency installation, browser/build window, operative DB write or external-session
file change was made.
