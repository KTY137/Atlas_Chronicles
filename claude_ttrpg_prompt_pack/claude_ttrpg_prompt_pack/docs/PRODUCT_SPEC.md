# Product Specification — Project Chronicle

## 1. Product definition

Project Chronicle is a browser-based virtual tabletop, campaign manager, and game-master operations workspace for tabletop role-playing games.

Its distinguishing goal is not merely to put tokens on a map. It should reduce the game master's preparation burden and cognitive load during play by keeping characters, items, places, quests, NPCs, notes, media, combat state, and generated improvisation material in one coherent campaign workspace.

The platform is system-agnostic. A rule package defines how a particular tabletop role-playing system behaves.

## 2. Primary users

### Game master

The game master creates and configures the campaign, controls visibility, manages rule packages, prepares and presents scenes, administers characters and items, creates campaign knowledge, operates combat, and optionally generates NPCs and locations.

The initial product assumes one primary GM. Co-GM permissions are a later extension but the data model must not make them impossible.

### Player

A player joins a campaign and primarily interacts with:

- their own characters;
- their character sheets;
- authorised inventories and item cards;
- their own notes;
- party-shared notes and handouts;
- quests, known NPCs, known locations, and campaign summaries published by the GM;
- the current map and authorised tokens;
- view-only combat state and results.

### Observer

A later role for spectators, stream views, or read-only participants. Not required in the first MVP.

## 3. Core domain concepts

- User
- Campaign
- Membership and role
- Rule package and rule-package version
- Character
- NPC
- Generic actor
- Item template
- Item instance
- Inventory
- Equipment loadout
- Status effect
- Quest
- Location
- Knowledge/article entry
- Note
- Campaign summary
- Scene
- Map asset
- Token
- Drawing/annotation
- Handout/media asset
- Encounter
- Combat participant
- Combat action
- Combat result
- Audit entry
- Generator template
- Generated draft

## 4. Permissions and visibility

Every campaign-scoped record must have an owner and an explicit visibility policy where relevant.

Recommended visibility values:

- `gm_only`
- `owner_and_gm`
- `party_shared`
- `selected_members`
- `campaign_public`

The server is authoritative. Client-side hiding is not a security boundary.

The UI must clearly state who can read a note. Since campaign owners may configure GM access to player notes, the player must never be misled into believing a GM-readable note is private.

The GM can:

- inspect all campaign actors and inventories;
- grant and revoke item instances;
- publish or unpublish quests and knowledge;
- reveal or conceal NPC and location information;
- move any authorised token;
- operate combat;
- override calculations with an audit reason.

Players can:

- edit their authorised character fields;
- create and edit notes within campaign policy;
- move only tokens they control when movement is enabled;
- manage inventory placement or equipment only within rule and GM permission;
- view information explicitly revealed to them.

## 5. Campaign workspace

The campaign workspace should use persistent navigation and a role-specific dashboard.

Recommended top-level areas:

- Home / session dashboard
- Characters
- NPCs
- Items and library
- Quests
- Places
- Wiki / knowledge
- Notes
- Scenes / maps
- Encounters / combat
- Media / handouts
- Campaign summary
- Settings / rule package / members
- Audit log

The GM dashboard should surface:

- current scene;
- current encounter;
- recently edited entities;
- hidden drafts;
- unresolved `defeat_pending` participants;
- quick generator actions;
- quick item grant;
- quick reveal/publish;
- upcoming or active quests;
- session notes.

The player dashboard should surface:

- active character;
- current scene;
- current quests;
- recent handouts;
- inventory changes;
- published campaign summary;
- personal notes.

## 6. Characters and character sheets

A user may own multiple characters but a campaign may restrict active characters.

A character includes:

- identity and portrait;
- rule-package-defined fields;
- derived values;
- resources such as health;
- inventory and equipment;
- status effects;
- notes;
- token configuration;
- permissions;
- change history.

### Dynamic sheet strategies

#### Schema-native

The rule package defines fields, groups, tabs, validation, formulas, and layout.

Supported field types should eventually include:

- short text;
- long text;
- integer;
- decimal;
- boolean;
- select;
- multi-select;
- tags;
- date;
- image;
- resource tracker;
- repeating group;
- reference to another entity;
- dice expression;
- computed read-only value.

#### Background overlay

An image or rendered PDF page acts as the visual background. An authorised rule-package editor places fields over the background and maps them to the schema.

The import flow must include:

- page selection;
- field placement;
- field type;
- data-key mapping;
- tab order;
- visibility;
- validation;
- preview at multiple viewport sizes.

Automatic PDF understanding is not an MVP requirement.

## 7. Notes

Support:

- player notes;
- GM notes;
- party-shared notes;
- notes attached to characters, NPCs, quests, locations, scenes, items, or sessions;
- markdown or safe rich text;
- tags;
- search;
- autosave;
- version history for important notes;
- explicit visibility labels.

## 8. Campaign knowledge and wiki

The wiki is a campaign-specific knowledge base, not a public Fandom clone.

Entries may represent:

- NPCs;
- factions;
- locations;
- lore;
- events;
- objects;
- rules reminders;
- session recaps;
- free-form articles.

Requirements:

- folders, tags, backlinks, and full-text search;
- drafts and published states;
- per-entry visibility;
- cross-links to domain entities;
- optional templates;
- image and media embedding;
- revision history;
- no broken access control through backlinks or search snippets.

The campaign summary is a dedicated high-level entry or set of entries controlled by the GM.

## 9. Quests

A quest supports:

- title;
- description;
- status;
- priority;
- objectives;
- optional rewards;
- associated NPCs and locations;
- player-visible and GM-only sections;
- publication state;
- progress history.

Suggested states:

- draft
- active
- completed
- failed
- abandoned
- hidden

The GM creates and updates quests. Players initially view and optionally add personal notes; direct player editing of canonical quest data is not required.

## 10. NPC and location generators

### Generator principles

Generators reduce improvisation time. They do not replace GM control.

Support two modes:

1. deterministic template generation;
2. optional AI-assisted generation.

### NPC generator

A generator template may define:

- archetype, such as soldier, merchant, scholar, guard, noble, or criminal;
- setting and tone;
- ancestry/species where the campaign uses it;
- age range;
- presentation;
- name tables;
- appearance traits;
- mannerisms;
- motivation;
- fear;
- secret;
- relationship hook;
- voice or speech pattern;
- combat role;
- miniature sheet fields;
- equipment tables;
- portrait prompt metadata.

The generated NPC opens as a draft. The GM can regenerate one field without replacing accepted edits.

### Location generator

Inputs may include:

- place type, such as kitchen, throne room, forest, cellar, temple, workshop, or street;
- setting;
- wealth level;
- condition;
- time of day;
- mood;
- occupants;
- sensory emphasis;
- danger level;
- narrative purpose.

Outputs may include:

- short read-aloud description;
- longer GM description;
- sensory details;
- notable objects;
- hidden details;
- possible encounters;
- clues;
- exits and connections;
- improvisation hooks.

## 11. Item-card system

### Separation of concepts

An item template is a reusable library definition.

An item instance is a concrete copy owned by a character, NPC, container, or campaign. It stores its own quantity, condition, custom name, charges, and instance-specific modifications.

Changing a template creates a new template version or an explicit migration. It must not silently rewrite existing instances.

### Item categories

The system must allow rule-package-defined categories. Common examples include:

- weapon;
- armour;
- shield;
- consumable;
- potion;
- magical object;
- tool;
- quest item;
- generic item;
- ammunition;
- container.

### Card builder

The GM can define:

- name;
- category;
- image;
- rarity;
- descriptive text;
- tags;
- weight or encumbrance;
- value;
- charges;
- damage expression;
- damage type;
- armour value;
- equipment slot;
- prerequisites;
- bonuses;
- active and passive effects;
- custom rule-package fields;
- GM-only notes;
- player-facing description.

The layout may be card-like but must use original visual design and must not imitate protected trading-card branding.

### Inventory operations

Support:

- grant;
- revoke;
- transfer;
- split stack;
- merge stack;
- equip;
- unequip;
- consume charge;
- change condition;
- attach note;
- inspect audit history.

All consequential operations should be transactional and auditable.

## 12. Scenes, maps, tokens, and drawing

### Map import

The GM can upload common raster image formats for a scene background. PDF maps may be rendered server-side into images. Vector support is optional and should be sanitised.

Map metadata:

- native dimensions;
- display scale;
- optional grid type and size;
- optional real-world measurement scale;
- background image;
- thumbnail;
- ownership;
- upload status.

### Scene canvas

Required capabilities:

- pan;
- zoom;
- fit to viewport;
- token placement;
- token movement;
- token selection;
- multi-select for GM;
- token labels;
- token image;
- z-order/layers;
- snap-to-grid optional;
- GM-hidden tokens;
- player token ownership;
- basic ping;
- drawing and erasing;
- text labels;
- clearing selected drawings;
- realtime synchronisation;
- reconnect and state resynchronisation.

Recommended layers:

1. map background;
2. GM-only preparation layer;
3. drawing/annotation layer;
4. tokens;
5. effects/overlays;
6. transient cursors, selections, and pings.

### Drawing

Paint-level functionality is sufficient initially:

- freehand pen;
- straight line;
- rectangle;
- ellipse;
- text;
- eraser/select-delete;
- line width;
- limited colour selection;
- GM-only or shared visibility;
- undo/redo.

Do not broadcast every raw pointer event without rate limiting and batching.

### Fog and reveal

Not mandatory for the earliest MVP, but the architecture should allow:

- full concealment;
- manually revealed areas;
- GM preview-as-player;
- per-player or party reveal later.

## 13. Media and handouts

The GM can upload and present:

- images;
- short audio;
- supported video files or safe embedded links;
- PDFs as handouts.

The GM may:

- save media in the campaign library;
- reveal it to selected players or the party;
- open it as a modal handout;
- attach it to a scene, NPC, location, quest, or wiki entry;
- revoke access.

Requirements:

- file validation;
- size quotas;
- thumbnail/preview generation;
- access-controlled URLs;
- no arbitrary HTML embed;
- explicit handling for unsupported codecs;
- alt text and captions.

Screen recording or voice recording is not part of the initial scope unless explicitly specified later. “Aufzeichnen” in the current product means drawing/annotating on the shared canvas.

## 14. Combat console

### Ownership

The structured combat console is operated entirely by the GM in the initial product.

Players communicate their intent verbally or through ordinary chat. The GM selects and commits the structured action.

### Encounter setup

The GM can:

- create an encounter;
- add characters and NPCs;
- set teams;
- set or roll initiative;
- reorder participants;
- choose visible fields;
- start, pause, and end the encounter.

### Action flow

Example:

1. Select actor.
2. Select action or weapon.
3. Select target.
4. Enter situational modifiers.
5. Preview calculation.
6. Roll or enter result.
7. Preview damage, armour, effects, and resource changes.
8. Commit.
9. Broadcast an authorised result summary.
10. Record an audit entry.

### Required action types

- attack;
- direct damage;
- healing;
- resource adjustment;
- use consumable;
- apply status effect;
- remove status effect;
- armour adjustment;
- custom manual action.

### Calculation transparency

The GM must see:

- base value;
- dice result;
- bonuses and penalties;
- armour or resistance;
- final proposed change;
- warnings;
- target state after commit.

### Defeat state machine

Recommended lifecycle:

- `active`
- `incapacitated`
- `defeat_pending`
- `defeated`
- `removed`

When a configured threshold is crossed, transition to `defeat_pending`. Do not automatically mark the participant dead or defeated. The GM must choose a resolution such as defeated, unconscious, stabilised, escaped, transformed, or manual recovery.

### Undo and audit

Combat commits should create domain operations that can be reversed where no later dependency makes reversal unsafe. The audit log must preserve both the original and reversal.

## 15. Dice and action log

Although not the defining feature, a VTT needs a dice expression service and a visible action log.

Requirements:

- common dice notation;
- rule-package-defined aliases;
- deterministic test mode;
- cryptographically reasonable server-side randomness for shared rolls;
- public, GM-only, and private roll visibility;
- immutable roll result record;
- clear distinction between actual roll and manually entered result.

A full social chat system may be deferred, but a session action log is required for combat and handouts.

## 16. Realtime collaboration

Realtime state includes:

- connected users;
- current scene;
- token positions;
- drawings;
- pings;
- handout presentation;
- encounter turn;
- selected broadcast events.

Durable truth remains in the database. Clients reconnect by fetching an authoritative snapshot, then subscribing to new events.

Every realtime room join and event must be authorised server-side.

Use version numbers or sequence numbers to detect stale state.

## 17. Search and command palette

The GM needs rapid access during play.

Global search should eventually cover:

- characters;
- NPCs;
- items;
- quests;
- places;
- wiki entries;
- notes;
- scenes;
- media.

A command palette may provide:

- create NPC;
- generate location;
- grant item;
- reveal handout;
- open encounter;
- switch scene;
- search campaign;
- open active character.

## 18. Import, export, backup, and portability

Required before calling the product production-ready:

- campaign export;
- campaign import with validation;
- rule-package export/import;
- media manifest;
- database backup documentation;
- version compatibility checks;
- conflict-safe IDs;
- audit of missing assets;
- no secrets in exports.

Exports should use an open, documented archive format.

## 19. Non-functional requirements

### Performance

- responsive GM workspace on ordinary laptops;
- map interactions should remain smooth with realistic token and drawing counts;
- virtualise long lists;
- use thumbnails rather than full-resolution media in libraries;
- rate-limit high-frequency realtime events.

### Reliability

- autosave important text;
- visible save state;
- transactional domain operations;
- graceful reconnect;
- idempotent retries where practical;
- migration and backup testing.

### Security

- secure password hashing or external identity provider;
- secure cookie sessions;
- CSRF protection where applicable;
- server-side RBAC/ABAC;
- upload validation and malware scanning integration point;
- content security policy;
- rate limiting;
- audit log;
- dependency scanning;
- no arbitrary rule-package execution.

### Accessibility

- keyboard navigation;
- scalable text;
- high contrast;
- screen-reader labels;
- reduced motion;
- non-colour-only status communication;
- alt text;
- accessible modal and panel focus management.

### Privacy

- data minimisation;
- clear note visibility;
- user and campaign deletion workflows;
- configurable AI data sharing;
- no accidental indexing of private campaign content.

## 20. Explicitly deferred features

These are not part of the first MVP:

- 3D tabletop physics;
- built-in map editor comparable to specialist map tools;
- automatic conversion of arbitrary rulebook PDFs into a complete rules engine;
- arbitrary code plugins uploaded by end users;
- marketplace;
- mobile-native apps;
- integrated voice/video conferencing;
- procedural 3D miniatures;
- automated player-controlled videogame combat;
- public social network;
- commercial copyrighted rules compendium.

## 21. Product success criteria

The first meaningful release succeeds when a GM can:

1. create a campaign and invite players;
2. install or select a rule package;
3. create characters and NPCs;
4. manage character sheets, inventories, notes, quests, places, and wiki entries;
5. upload a map and run a shared token scene;
6. create and grant item cards;
7. operate a complete GM-controlled encounter with transparent calculations and defeat confirmation;
8. present handouts;
9. recover from refresh or disconnect without losing committed state;
10. export the campaign;
11. understand who can see every piece of information;
12. use the product without configuring an AI provider.
