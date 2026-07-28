# Incremental Roadmap — Project Chronicle

## Delivery philosophy

Each phase must produce usable, tested workflows. Do not advance because the UI looks complete; advance when permissions, persistence, tests, failure states, and documentation are complete.

## Phase 0 — Project harness and executable skeleton

Deliver:

- repository workspace;
- web and server applications;
- shared contracts;
- database and object-storage development environment;
- CI checks;
- health endpoint;
- base accessible shell;
- error handling;
- docs and threat-model skeleton;
- original demo rule package;
- `claude-progress.md`.

Exit criteria:

- one command starts the complete development environment;
- tests and static checks run;
- browser reaches server health state;
- database migration and reset are documented;
- no placeholder architecture contradictions.

## Phase 1 — Identity, campaigns, roles, and permissions

Deliver:

- register/login/logout;
- secure sessions;
- create campaign;
- campaign membership and invitation;
- GM/player dashboards;
- server-side role checks;
- visibility policy primitives;
- audit records for membership changes.

Vertical-slice scenario:

A GM creates a campaign, adds a player, and both users see different authorised dashboards.

Exit criteria:

- horizontal privilege escalation tests;
- separate GM and player end-to-end browser contexts;
- secure session and CSRF strategy documented.

## Phase 2 — Actors and the first schema-native character sheet

Deliver:

- install/select original demo rule package;
- actor model;
- create player character and NPC;
- dynamic schema-driven fields;
- derived values;
- basic character sheet;
- GM view and player-authorised edit;
- portrait upload;
- actor audit history.

Exit criteria:

- invalid rule-defined values rejected on server;
- derived values tested;
- GM and player permission matrix tested;
- rule package and document versions stored.

## Phase 3 — Knowledge workspace

Deliver:

- notes with visibility;
- quests;
- locations;
- NPC knowledge pages;
- wiki entries;
- campaign summary;
- tags, folders, links;
- publish/unpublish;
- initial search.

Exit criteria:

- search snippets respect permissions;
- autosave and conflict behaviour tested;
- player can never retrieve GM-only content through API or backlinks.

## Phase 4 — Item library, card builder, and inventory

Deliver:

- item template CRUD and versioning;
- item-card editor;
- item instances;
- grant, revoke, transfer, stack, equip, consume;
- armour/weapon/consumable examples;
- inventory UI;
- transaction and audit log.

Exit criteria:

- template edits do not mutate existing instances silently;
- concurrent transfer cannot duplicate an item;
- item operations enforce rule and role policy.

## Phase 5 — Scene map, tokens, drawing, and handouts

Deliver:

- map upload;
- scene creation;
- active scene;
- token placement and ownership;
- pan/zoom;
- token move;
- basic shared drawing;
- realtime rooms;
- reconnect snapshot;
- image/PDF handout reveal.

Exit criteria:

- unauthorised users cannot subscribe to rooms;
- GM-only token data is not broadcast to players;
- state recovers after refresh;
- drawing traffic is rate-limited/batched;
- realistic scene remains responsive.

## Phase 6 — GM-controlled combat MVP

Deliver:

- encounter creation;
- participants;
- initiative/order;
- attack, damage, healing, and status-effect actions;
- formula preview and explanation;
- commit and log;
- manual override with reason;
- `defeat_pending`;
- explicit confirm defeat;
- basic undo.

Exit criteria:

- players cannot call combat commit endpoints;
- zero/negative health never auto-defeats;
- every committed change is traceable;
- calculation and state-machine tests are comprehensive.

## Phase 7 — Deterministic generators

Deliver:

- generator template format;
- weighted tables;
- soldier NPC template;
- kitchen/throne-room/forest location templates;
- draft review;
- field-level regenerate;
- create entity from accepted draft.

Exit criteria:

- no AI provider required;
- seeds can reproduce a deterministic result;
- accepted edits survive regeneration of other fields.

## Phase 8 — Optional AI-assisted generation

Deliver:

- server-side provider adapter;
- structured NPC and location generation;
- prompt-template versioning;
- approved-context selection;
- quotas/timeouts;
- draft validation;
- graceful no-provider state.

Exit criteria:

- no keys in browser;
- invalid provider output cannot corrupt campaign data;
- no automatic publication;
- privacy behaviour documented.

## Phase 9 — Background-overlay sheet editor

Deliver:

- image/PDF page background;
- manual field placement;
- schema field mapping;
- responsive preview;
- tab order;
- package export.

Exit criteria:

- arbitrary PDF is not claimed to be automatically understood;
- overlay remains usable at supported screen sizes;
- package can be reinstalled and reproduce the sheet.

## Phase 10 — Rule-package authoring and combat configuration

Deliver:

- package validation UI;
- formula editor with trace;
- action builder;
- equipment/effect editor;
- migration dry-run;
- package self-tests;
- version upgrade workflow.

Exit criteria:

- arbitrary code execution remains impossible;
- malformed packages are rejected with useful errors;
- campaigns pin versions and upgrade explicitly.

## Phase 11 — Portability and production hardening

Deliver:

- campaign export/import;
- backup and restore;
- storage quotas;
- thumbnail jobs;
- observability;
- rate limiting;
- dependency and security checks;
- deployment guide;
- accessibility audit;
- performance budget.

Exit criteria:

- restore drill passes;
- export contains no secrets;
- failure and reconnect scenarios tested;
- production threat model reviewed.

## Deferred until after validated use

- co-GM granular permissions;
- per-player fog of war;
- audio/video conferencing;
- mobile-native application;
- plugin marketplace;
- 3D tabletop;
- public campaign discovery;
- commercial rules content;
- arbitrary trusted-code plugin SDK.
