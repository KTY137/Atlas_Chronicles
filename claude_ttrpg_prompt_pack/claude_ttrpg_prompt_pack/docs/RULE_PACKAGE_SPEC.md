# Rule Package Specification — Initial Design

## 1. Purpose

A rule package defines game-specific data and deterministic mechanics while the core application supplies accounts, campaigns, permissions, persistence, maps, media, knowledge management, collaboration, and generic entity workflows.

The package format must be versioned, validated, portable, and safe to load from untrusted users.

## 2. Package shape

Suggested archive layout:

```text
my-rule-package/
├─ manifest.json
├─ entities/
│  ├─ character.schema.json
│  ├─ npc.schema.json
│  ├─ item.schema.json
│  └─ status-effect.schema.json
├─ layouts/
│  ├─ character-sheet.layout.json
│  ├─ npc-mini-sheet.layout.json
│  └─ item-card.layout.json
├─ actions/
│  ├─ attack.json
│  ├─ healing.json
│  └─ use-consumable.json
├─ combat/
│  ├─ encounter.json
│  ├─ initiative.json
│  └─ defeat.json
├─ generators/
│  ├─ soldier.json
│  └─ tavern-kitchen.json
├─ locales/
│  ├─ de.json
│  └─ en.json
├─ migrations/
│  └─ 1.0.0-to-1.1.0.json
└─ assets/
   └─ optional-licensed-assets/
```

## 3. Manifest

Illustrative fields:

```json
{
  "id": "org.example.demo-system",
  "name": "Chronicle Demo System",
  "version": "1.0.0",
  "engineCompatibility": ">=0.1.0 <1.0.0",
  "license": "MIT",
  "authors": [
    {"name": "Example Author"}
  ],
  "defaultLocale": "de",
  "supportedLocales": ["de", "en"],
  "entitySchemas": {
    "character": "entities/character.schema.json",
    "npc": "entities/npc.schema.json",
    "item": "entities/item.schema.json"
  },
  "layouts": {
    "character": "layouts/character-sheet.layout.json",
    "npcMini": "layouts/npc-mini-sheet.layout.json",
    "itemCard": "layouts/item-card.layout.json"
  },
  "actions": [
    "actions/attack.json",
    "actions/healing.json"
  ]
}
```

Validate IDs, semantic versions, paths, duplicate keys, archive size, file count, and compatibility before installation.

## 4. Entity schemas

Use a documented schema vocabulary, preferably based on JSON Schema with Chronicle-specific annotations.

Example:

```json
{
  "$id": "character",
  "type": "object",
  "required": ["name", "health", "strength"],
  "properties": {
    "name": {
      "type": "string",
      "minLength": 1,
      "maxLength": 120,
      "x-ui": {"label": "Name", "control": "text"}
    },
    "health": {
      "type": "object",
      "required": ["current", "max"],
      "properties": {
        "current": {"type": "integer"},
        "max": {"type": "integer", "minimum": 0}
      },
      "x-ui": {"control": "resource"}
    },
    "strength": {
      "type": "integer",
      "minimum": 0,
      "maximum": 100
    },
    "meleeBonus": {
      "type": "integer",
      "readOnly": true,
      "x-derived": {
        "expression": "floor(strength / 10)"
      }
    }
  }
}
```

Package installation must reject unsupported keywords rather than silently ignoring security-sensitive behaviour.

## 5. Layout schema

A layout describes presentation without embedding arbitrary HTML or scripts.

Example concepts:

- tabs;
- sections;
- grids;
- field references;
- repeated groups;
- read-only calculation panels;
- visibility conditions expressed through the safe expression language;
- responsive breakpoints chosen from a fixed set.

Example:

```json
{
  "type": "tabs",
  "tabs": [
    {
      "id": "overview",
      "labelKey": "sheet.overview",
      "content": {
        "type": "grid",
        "columns": 2,
        "children": [
          {"type": "field", "path": "name"},
          {"type": "field", "path": "health"},
          {"type": "field", "path": "strength"},
          {"type": "field", "path": "meleeBonus"}
        ]
      }
    }
  ]
}
```

No package-supplied React components in the first release.

## 6. Formula language

The expression language must be:

- parsed into an AST;
- bounded in operation count and recursion depth;
- deterministic except for explicit dice nodes;
- side-effect free;
- incapable of network, filesystem, environment, reflection, or host-language access;
- typed;
- explainable.

Suggested operations:

- arithmetic;
- comparison;
- boolean logic;
- conditional expression;
- minimum/maximum;
- floor/ceil/round;
- collection count/sum with strict bounds;
- field lookup;
- item/effect contribution lookup;
- dice expression references.

Disallow:

- loops;
- recursion;
- dynamic property construction;
- arbitrary function calls;
- regex with uncontrolled complexity;
- date/time as an implicit nondeterministic source.

## 7. Dice model

Parse dice notation into an AST rather than evaluating strings directly.

Possible nodes:

- constant;
- die;
- pool;
- add/subtract/multiply;
- keep highest/lowest;
- explode with explicit cap;
- success count;
- modifier;
- named alias.

Every roll result stores:

- original expression;
- parsed normal form;
- individual die results;
- modifiers;
- total;
- visibility;
- roller;
- server timestamp;
- package and action version.

## 8. Actions

An action is a declarative command template.

Illustrative attack action:

```json
{
  "id": "attack",
  "labelKey": "action.attack",
  "actorType": ["character", "npc"],
  "targetType": ["character", "npc"],
  "inputs": [
    {"id": "weaponInstanceId", "type": "itemReference", "required": true},
    {"id": "situationalModifier", "type": "integer", "default": 0}
  ],
  "checks": [
    {
      "id": "attackRoll",
      "expression": "roll(actor.attackDice) + actor.attackBonus + input.situationalModifier"
    }
  ],
  "proposedEffects": [
    {
      "type": "resourceDelta",
      "targetPath": "health.current",
      "expression": "-max(0, item.damage + check.attackRoll.bonusDamage - target.armour)"
    }
  ],
  "requiresPreview": true,
  "requiresCommit": true
}
```

The actual package vocabulary should be smaller and more explicit than this illustrative example.

## 9. Combat configuration

A package may define:

- initiative source;
- ascending or descending order;
- tie breaker;
- phases;
- action economy labels;
- turn hooks represented as declarative effects;
- health/resource thresholds;
- defeat-pending trigger;
- armour calculation;
- resistance;
- healing rules;
- status-effect duration.

Core lifecycle states remain platform-controlled so the package cannot bypass explicit defeat confirmation.

## 10. Items and effects

Item templates define possible fields and effects. Item instances contain concrete mutable state.

An effect should declare:

- source;
- target selector;
- affected path or calculation channel;
- operation;
- value expression;
- duration;
- stacking policy;
- visibility;
- removal condition.

Stacking policies may include:

- stack;
- highest only;
- lowest only;
- replace same source;
- unique by effect ID.

Conflicting or invalid effects should produce warnings, not undefined behaviour.

## 11. Generator templates

A generator template may define:

- input schema;
- deterministic tables;
- weighted choices;
- conditional tables;
- output entity schema;
- optional AI prompt template;
- allowed campaign context fields;
- output validation;
- field-level regeneration support.

AI prompt templates must not be able to request secrets or arbitrary database contents.

## 12. Migrations

A rule package version change must declare compatibility.

Migration capabilities should initially be limited to safe declarative operations:

- rename field;
- add field with default;
- remove field into archived metadata;
- transform numeric value with bounded expression;
- map enum values;
- split or merge fields through approved operations.

Always support dry-run migration with a report.

Campaigns should pin a rule-package version until the GM explicitly upgrades.

## 13. Package installation

Installation flow:

1. upload archive;
2. inspect archive safely;
3. validate manifest;
4. verify paths and size limits;
5. validate schemas and layouts;
6. parse every formula;
7. validate references;
8. run package self-tests;
9. present licence and compatibility;
10. install as inactive;
11. activate explicitly for a campaign.

Never execute package-provided installation scripts.

## 14. Package self-tests

A package should include or generate test vectors:

```json
{
  "name": "armour reduces damage",
  "environment": {
    "item.damage": 10,
    "target.armour": 4
  },
  "expression": "max(0, item.damage - target.armour)",
  "expected": 6
}
```

The platform should run these during installation and upgrade.

## 15. How to be a Hero reference package

Treat How to be a Hero as an external rules package, not as hard-coded platform behaviour.

Before distribution:

- verify the exact source version;
- preserve required attribution;
- comply with the applicable Creative Commons terms;
- do not assume non-commercial content can be included in a commercial product;
- keep any new original package code and copied rules text clearly distinguishable;
- allow a private local package import if redistribution is not legally appropriate.

The first automated tests should use an original demo system so the core project is not blocked by external licensing.
