# Architecture Proposal — Project Chronicle

## 1. Architectural stance

Start as a modular monolith with a separate browser client and application server in one repository.

Do not begin with microservices. The system needs strong domain boundaries, not network boundaries. A modular monolith is easier to run locally, easier to test transactionally, and easier for a small team plus coding agents to maintain.

## 2. Suggested repository structure

```text
project-chronicle/
├─ apps/
│  ├─ web/                    # React + TypeScript browser application
│  └─ server/                 # TypeScript application server
├─ packages/
│  ├─ domain/                 # Framework-independent domain types and invariants
│  ├─ rules-engine/           # Declarative schemas, formulas, validation, migrations
│  ├─ api-contracts/          # Shared request/response and realtime event contracts
│  ├─ ui/                     # Shared accessible UI components
│  ├─ config/                 # Shared lint, TypeScript, test configuration
│  └─ test-support/           # Factories, fixtures, helpers
├─ rule-packages/
│  └─ demo-system/            # Original minimal reference rules package
├─ docs/
├─ infra/
│  ├─ docker/
│  └─ compose/
├─ .claude/
│  └─ agents/
├─ CLAUDE.md
└─ claude-progress.md
```

A workspace package manager is recommended. Keep builds reproducible and lock dependencies.

## 3. Frontend

Recommended baseline:

- React;
- TypeScript with strict settings;
- Vite;
- a router with nested campaign routes;
- a server-state query/cache library;
- a small predictable client-state store;
- an accessible component system;
- React Konva or an equivalent scene-graph canvas library for the initial 2D board;
- a safe rich-text or Markdown editor;
- generated API types from shared contracts.

### Frontend boundaries

Suggested feature modules:

- auth
- campaigns
- memberships
- characters
- actors
- items
- inventories
- quests
- knowledge
- notes
- scenes
- canvas
- media
- encounters
- generators
- settings
- audit

Each module should expose a small public surface. Domain logic should not live inside presentation components.

### Map canvas state

Separate:

- durable scene state;
- local interaction state;
- transient realtime state.

Examples:

- Durable: token position after drop, drawing object after stroke completion.
- Local: current drag preview, selection rectangle, panel size.
- Transient: cursor, ping animation, another user's active drag.

Do not write every mouse-move event to the database.

## 4. Server

Recommended baseline:

- Node.js with TypeScript;
- NestJS or an equivalently structured framework;
- PostgreSQL;
- Prisma or another type-safe migration-capable ORM;
- REST-style HTTP endpoints for durable commands and queries;
- Socket.IO or a similarly mature WebSocket abstraction for campaign rooms;
- OpenAPI or shared runtime-validated contracts;
- background-job abstraction for thumbnails, media processing, exports, and AI generation;
- S3-compatible object storage.

For local development, use Docker Compose with:

- application server;
- PostgreSQL;
- MinIO or another S3-compatible local store;
- optional mail catcher;
- optional Redis only when a concrete scaling or job-queue need exists.

Do not add Redis merely because realtime systems sometimes use it. One application instance does not need a distributed Socket.IO adapter.

## 5. Domain modules

### Identity and access

Responsibilities:

- users;
- sessions;
- campaign membership;
- roles;
- selected-member visibility;
- invitations;
- account lifecycle.

### Campaign

Responsibilities:

- campaign metadata;
- installed rule package and version;
- campaign settings;
- active scene and encounter;
- feature flags;
- campaign export boundary.

### Actors

Use a generic actor aggregate with typed specialisations:

- player character;
- NPC;
- companion;
- generic creature.

Do not force every possible actor into a D&D-derived model.

### Items and inventory

Responsibilities:

- item templates and versions;
- item instances;
- inventory containers;
- equipment;
- grant/transfer/consume operations;
- effects contributed by equipment.

### Knowledge

Responsibilities:

- quests;
- locations;
- wiki entries;
- summaries;
- notes;
- publication and visibility;
- links and backlinks;
- search indexing.

### Scenes

Responsibilities:

- map assets;
- scene configuration;
- tokens;
- drawings;
- reveal state;
- active scene;
- realtime scene snapshot.

### Encounters

Responsibilities:

- encounter lifecycle;
- participant snapshots/references;
- initiative;
- actions;
- calculations;
- result commit;
- defeat state machine;
- audit and reversal.

### Rules

Responsibilities:

- package manifest;
- schema validation;
- field definitions;
- UI layout metadata;
- formula parsing and evaluation;
- dice definitions;
- action definitions;
- package migrations;
- compatibility checks.

### Generation

Responsibilities:

- generator templates;
- deterministic generation;
- AI provider abstraction;
- structured output validation;
- draft acceptance.

### Media

Responsibilities:

- upload intent;
- storage;
- metadata;
- thumbnail;
- access-controlled retrieval;
- handout reveal.

## 6. Persistence model

Use relational tables for durable entities and JSON columns only where schema variability genuinely requires them.

A practical hybrid:

- strongly relational columns for identity, ownership, permissions, lifecycle, timestamps, package version, and frequently queried fields;
- validated JSON documents for rule-package-defined actor and item fields;
- normalised tables for inventory ownership, encounter participants, audit entries, visibility grants, and links.

Every rule-defined JSON document must store:

- rule package ID;
- rule package version;
- schema/entity type;
- document version;
- validation status or migration status.

## 7. Command and event model

Use explicit application commands such as:

- `CreateCampaign`
- `AddCampaignMember`
- `CreateActor`
- `UpdateActorFields`
- `CreateItemTemplate`
- `GrantItemInstance`
- `TransferItemInstance`
- `CreateScene`
- `MoveToken`
- `CommitDrawing`
- `StartEncounter`
- `PreviewCombatAction`
- `CommitCombatAction`
- `ConfirmDefeat`
- `PublishKnowledgeEntry`
- `RevealHandout`

A command:

1. authenticates the user;
2. authorises against campaign and record policy;
3. validates input;
4. loads required state;
5. checks versions/invariants;
6. performs a transaction;
7. writes audit data;
8. emits an authorised domain/realtime event.

Do not expose generic “update any JSON object” endpoints.

## 8. Realtime architecture

Use campaign and scene rooms.

Connection flow:

1. authenticate WebSocket connection from the existing secure session;
2. authorise campaign membership;
3. join only authorised campaign/scene rooms;
4. fetch authoritative snapshot by HTTP or initial socket message;
5. apply ordered events;
6. detect sequence gaps;
7. refetch snapshot when stale.

Event examples:

- `presence.updated`
- `scene.activated`
- `token.moved`
- `drawing.created`
- `drawing.deleted`
- `handout.revealed`
- `encounter.started`
- `encounter.turnChanged`
- `encounter.actionCommitted`
- `encounter.participantStateChanged`

Never broadcast GM-only data into a room that players can join and rely on the client to ignore it. Produce role-filtered payloads or separate channels.

## 9. Rule engine

The rules engine should contain:

- manifest loader;
- schema registry;
- runtime validation;
- formula parser;
- typed value environment;
- deterministic evaluator;
- dice AST;
- action compiler;
- explanation trace;
- package migration runner;
- compatibility validator.

The evaluator should return both value and trace:

```json
{
  "value": 7,
  "trace": [
    {"label": "Weapon base", "value": 10},
    {"label": "Strength bonus", "value": 2},
    {"label": "Target armour", "value": -5}
  ],
  "warnings": []
}
```

Use a restricted expression language. No arbitrary host-language evaluation.

## 10. Security boundaries

Trust boundaries:

- browser to server;
- server to database;
- server to object storage;
- server to AI provider;
- uploaded rule package to rule engine;
- uploaded media to processor;
- realtime publisher to clients.

Required controls:

- server-side permission checks;
- runtime input validation;
- secure session cookies;
- CSRF strategy;
- content security policy;
- upload allow-list and size limits;
- object-level access checks;
- short-lived or proxied media access;
- formula complexity limits;
- generator request quotas;
- audit log;
- redaction of secrets and private content from logs.

## 11. AI provider architecture

Define a provider-neutral interface, for example:

```ts
interface StructuredGenerator {
  generate<TInput, TOutput>(
    template: GeneratorTemplate<TInput, TOutput>,
    input: TInput,
    context: ApprovedCampaignContext
  ): Promise<GenerationDraft<TOutput>>;
}
```

The provider adapter must:

- run server-side;
- enforce timeouts and token/size budgets;
- request structured output;
- validate output;
- handle refusal and malformed output;
- avoid automatic publication;
- log metadata without sensitive prompts where policy forbids it.

## 12. Search

Begin with PostgreSQL full-text search and indexed name/tag lookup. Do not introduce a separate search cluster until measured needs justify it.

Search results must enforce visibility before returning snippets.

## 13. Deployment

Initial deployment target:

- Docker Compose;
- one application server;
- PostgreSQL;
- S3-compatible object storage;
- TLS reverse proxy;
- environment-file secrets;
- documented backup and restore.

Later scaling options:

- stateless server replicas;
- distributed WebSocket adapter;
- managed object storage;
- background workers;
- CDN for public or signed media;
- external identity provider.

Do not design the initial code as if massive scale already exists, but keep adapters and module boundaries clean.

## 14. Observability

Implement:

- structured logs;
- request correlation IDs;
- domain operation IDs;
- error tracking integration point;
- basic health endpoints;
- metrics for active socket connections, upload failures, rule-evaluation failures, and job failures.

Do not log private note bodies or secrets.

## 15. Testing architecture

- domain unit tests without database;
- repository integration tests against PostgreSQL;
- API tests with real permission policies;
- WebSocket tests for room authorisation and event filtering;
- browser end-to-end tests with separate GM and player contexts;
- fixture rule packages;
- malicious/invalid rule-package fixtures;
- upload tests;
- concurrency tests for item transfer and token movement;
- state-machine tests for `defeat_pending`.

## 16. Architectural decisions that must remain open until evidence exists

- exact rich-text editor;
- whether the first canvas uses React Konva or PixiJS;
- whether job processing initially runs in-process or through a queue;
- co-GM role details;
- per-player fog of war;
- plugin marketplace;
- mobile-native clients;
- external identity providers.

Record decisions when made. Do not silently fossilise temporary choices.
