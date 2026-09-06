# Chronicle rules

`@chronicle/rules` is the browser-compatible, deterministic reference implementation of
Rule Package format **1**, engine **1.0.0**. It has no runtime dependencies, host imports,
network operations, dynamic code evaluation or implicit time source.

The original **Spuren** demo rolls one d12 plus Scharfsinn. Experience adds two; spoken or
heard knowledge adds zero; no held knowledge subtracts one. Nine succeeds. These mechanics
and their wording are original and MIT licensed. No external RPG text is distributed.

## Server and authoring API

```ts
import {
  DEMO_RULE_PACKAGE, defaultActorFields, evaluateAction, replayAction,
  RulePackageRegistry, previewPackageMigration,
} from '@chronicle/rules';

const packages = new RulePackageRegistry();
const pkg = packages.install(DEMO_RULE_PACKAGE); // installed, not campaign-activated
const actor = defaultActorFields(pkg);
const receipt = evaluateAction(pkg, 'investigate', {
  seed: '00000001000000020000000300000004', // example only: server generates fresh entropy
  actor,
  input: { topic: 'spuren' },
  knowledge: {
    actorId: 'sera',
    passages: [{ passageId: 'visible-passage', labels: ['spuren'], experience: 'erfahren' }],
  },
});
replayAction(pkg, receipt).valid; // true
```

The authoritative server supplies a fresh cryptographic, nonzero 128-bit seed, authenticates
the controlling member, loads the pinned package and actor fields, and supplies **only the
rolling character's projected held passages**. A request cannot select GM knowledge or
provide its own authority. `haelt`, `haelt_etikett` and `erfahrungsgrad` receive only that
projection. The latter returns the strongest held experience for a label, or `unbekannt`.
There is no hidden global registry or default GM view in this package.

`evaluateAction` returns the resolved input snapshot, package/action/engine versions, source
expression, normalized AST, each die face, kept die indexes, operation trace, total and
optional success. It **proposes a result**: human confirmation, server time, actor control,
visibility, idempotency, cryptographic receipt sealing and the five canon mint handlers live
in the server command layer. This library cannot write canon, modify resources or confirm
defeat. Previewing in the browser has no campaign effect.

`parseFormula`, `parseFormulaAst` and `evaluateFormula` support authoring and trace previews.
`fields` and `layout.sections` supply a safe form vocabulary without HTML or components.
`validateEntityFields` enforces defaults and constraints. Actions must have a visible
`disclosure` and `requiresConfirmation: true`.

## Published format and limits

[rule-package-v1.schema.json](schema/rule-package-v1.schema.json) is the permissively licensed
JSON Schema. `parseRulePackage` is the normative parser for formula typing, cross-references,
duplicate JSON keys, byte/depth limits and semantic constraints that JSON Schema alone does
not express. Import accepts one JSON document; archive paths, installation scripts, remote
schemas, embedded assets and unsupported schema keywords are rejected.

The scalar field vocabulary is integer, finite number, boolean or bounded string, with
optional string enums. Fields use fixed `actor.field` / `input.field` references. Formula
values are typed. Supported operations are arithmetic, numeric comparisons, strict equality,
boolean logic, lazy `if`, `min`, `max`, `floor`, `ceil`, `round`, `abs` and the three knowledge
functions. Strings use JSON quoting. There is no property construction, reflection, loop,
user function, recursion or ambient randomness.

Dice notation is `NdS`, optionally `khN` / `klN` and `!CAP`. Explosions sum each base die's
chain before keeping highest/lowest chains; equal totals retain earlier die indexes. `!2`
permits at most two additional faces per die. Reaching the cap on another maximum face sets
the trace's `capped` flag. All faces, including discarded and exploded faces, count toward
the **100-face total budget**. Limits: 1 MiB JSON, JSON depth 48, 50,000 JSON nodes, 4,096
formula characters, AST depth 32, 512 AST nodes, 4,096 evaluation steps, 100,000 die sides,
20 explosions per chain, 64 fields/actions and 2,048 held passages. Arithmetic outside
plus/minus 1e12 and division by zero fail.

Replay algorithm `xoshiro128ss-hex128-rejection-v1` implements
[Blackman and Vigna's xoshiro128** 1.1](https://prng.di.unimi.it/xoshiro128starstar.c).
The 32 hexadecimal seed characters are four successive unsigned 32-bit words, in written
order. JS `Math.imul`, shifts and unsigned conversion specify the 32-bit arithmetic. Dice
use rejection sampling over the full 32-bit output range; rejected words consume the
evaluation budget. The PRNG is for portable replay, **not cryptographic secrecy or receipt
authentication**. The server generates the entropy and seals receipts. The initial state
`[1,2,3,4]` has the tested first outputs `11520, 0, 5927040, 70819200`.

## Version pinning and explicit migration

Installation parses the package and executes declared self-tests before adding it to an
inactive catalog. A package ID/version pair can never be overwritten with different content.
Campaign activation is an explicit, persisted server operation. Installing a later version
does not change an existing pin.

`previewPackageMigration(old, next, entities)` requires a direct, declared migration. It
returns before/after values, archived removed fields and a change list, without mutating the
input. Operations are `rename`, `add`, `archive` and bounded `numeric` conversion using
`actor.value`; random or knowledge-dependent migrations are rejected. New fields require
explicit steps, occupied rename targets fail, and final fields must exactly match the target
schema. The server applies an approved preview transactionally with a campaign version guard.

**Non-retroactivity promise:** old packages, rolls, inputs, normalized ASTs and traces remain
unchanged. Replay always uses the receipt's pinned package and engine. They are never passed
through entity migrations. Unsupported future schema/engine versions require an explicit
parser/engine migration; they are not guessed or silently interpreted with current rules.

## Verification

From the workspace root: `npx vitest run packages/rules/test/rules.test.ts`. Tests cover the
published PRNG vector, trace replay and tamper detection, projection-only knowledge, immutable
versions, migration archival, type checking and hostile JSON/AST fixtures. These are library
checks; server authorization, persistence and browser user flows have their own integration
gates.
