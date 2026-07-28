# Domain Model — proposal + Apollon's assessment (round 0)

Status: **binding working contract for the iteration rounds.** Source: Kaya, 2026-07-27,
**re-stated and confirmed** the same night ("bitte vergiss diese Struktur nicht oder refine sie
wenn du willst"). Companion to [`00-intake.md`](00-intake.md) and
[`03-triumph-ui-direction.md`](03-triumph-ui-direction.md). Every product candidate in
`iterations/` inherits this model; a candidate that departs from it must say so and justify it.
Refinements are welcome and recorded at the end — silent drift is not.

## The hierarchy

```
User → UniverseMembership → Universe → Campaign → GameSession
                                  ↑        ↑
User ────────── CampaignMembership ────────┘
```

Two membership edges run **parallel** to the containment chain — a user's role is never stored
on the user, always on the membership. The same person is GM in one campaign, player in the
next, observer in a third.

```
Platform
├─ Users                      (id, email, password_hash, display_name, platform_role)
├─ AuthSessions               (id, user_id, expires_at, refresh_token_hash, ip_metadata)
└─ Universes                  (id, name, owner_user_id, default_rule_package_id)
    ├─ UniverseMemberships    (universe_id, user_id, role: owner|editor|viewer)
    ├─ Timelines              (id, universe_id, name, parent_timeline_id, divergence_point)
    ├─ SharedKnowledge / SharedLocations / SharedFactions / SharedTemplates
    └─ Campaigns              (id, universe_id?, name, rule_package_id + version,
        │                      timeline_id, in_world_date, active_scene_id, settings)
        ├─ CampaignMemberships (campaign_id, user_id, role, status, joined_at)
        │                      roles: owner | gm | co_gm | player | observer
        ├─ GameSessions        (id, campaign_id, title, session_number, scheduled_at,
        │   │                   started_at, ended_at, status, recap,
        │   │                   active_scene_id, active_encounter_id)
        │   ├─ Scenes  ├─ Encounters  └─ SessionRecap
        ├─ Actors              (id, campaign_id, type, name, portrait_asset_id,
        │   │                   token_asset_id, rule_data, visibility)
        │   │                  type: player_character | npc | creature | companion | vehicle
        │   ├─ Characters      (id, campaign_id, actor_id, created_by_user_id, rule_package_version)
        │   ├─ CharacterControllers (character_id, user_id, permission)
        │   ├─ Inventories ├─ ItemInstances └─ StatusEffects
        ├─ ItemTemplates ├─ Quests ├─ Locations
        ├─ KnowledgeEntries    (universe_id?, campaign_id?, parent_entry_id?, type, title,
        │                       content, visibility, canon_status, created_by_user_id)
        ├─ Notes ├─ Assets └─ AuditEntries
```

## What is right about this — adopt

1. **Role-not-entity.** `platform_admin` is a value on `User.platform_role`; GM/player live on
   `CampaignMembership`. Modelling "Admin" as a top-level entity would have fused three
   unrelated concepts (platform operator, campaign owner, session host). Correct.
2. **AuthSession ≠ GameSession.** Naming discipline that prevents a whole class of bugs
   (`session.sessionId`). **Binding from day one** — it goes in Kalliope's glossary before any
   code exists.
3. **Actor as the common base.** PC, NPC, creature, companion, vehicle share sheet, HP,
   inventory, effects, token. Matches the pack's `ARCHITECTURE.md` §5 ("generic actor aggregate
   with typed specialisations… do not force every actor into a D&D-derived model"). Two
   independent sources converging is a good sign.
4. **CharacterController as its own table.** A character can be controlled by several users, by
   the GM, or by nobody. Storing `owner_user_id` on the character would have made shared
   companions and orphaned PCs into schema surgery later. Cheap now, expensive later — take it.
5. **KnowledgeEntry scoping via `universe_id` + `campaign_id`.** One model, two scopes, with
   `parent_entry_id` for campaign-local extensions that never mutate the universe entry. That is
   the right shape: additive, non-destructive, mirrors the item template/instance invariant.

## The Universe layer — this may be a sixth differentiation axis

**No competitor does this well.** Foundry "worlds" are isolated silos (RB-01-foundry); Roll20
campaigns cannot share a wiki (RB-01-roll20); Fantasy Grounds shares *purchased content*, not a
GM's own world. Yet every long-term GM has the problem: three campaigns in one homebrew world,
and the lore lives in a Google Doc because no VTT models it.

`Universe` + scoped `KnowledgeEntry` + `Timeline` turns that pain into a feature. It also gives
the wiki a reason to exist beyond "notes with links" — it becomes the durable asset a GM keeps
across years and groups, i.e. **the retention mechanic**. Candidate for axis 6, to be confirmed
by design round 1.

## Concerns the attack pass must handle

- **Mēden agan on Timelines.** Divergent timelines with `parent_timeline_id` are elegant and
  almost certainly premature. Recommendation: keep `Campaign.in_world_date` and a nullable
  `timeline_id` **column** in v1 so the door stays open; defer the `Timeline` **table** and any
  branching UI until a real table asks for it. A speculative timeline system will cost more in
  query complexity than it earns in year one.
- **The permission matrix just got two-dimensional.** Universe role × campaign role × entry
  visibility. A universe `editor` who is a mere `player` in campaign B must not read campaign
  B's GM-only extensions of a universe entry they can edit. That is a genuine escalation path —
  **Athena reviews this before any schema lands**, and it needs explicit test cases, not prose.
- **Universe-optional must be real.** `Campaign.universe_id` nullable is right, but "no
  universe" must not become a second code path. Cleanest: every campaign silently gets a
  personal universe; the UI hides the layer until a second campaign wants to share it.
  Onboarding (axis 2) must never make a first-time GM meet the word "Universe".
- **`Actor.rule_data` is the JSON escape hatch.** Sound, but the pack's rule is binding: every
  rule-defined document stores package id, package version, schema type, document version and
  validation status. That belongs in the contract, not in a developer's memory — Ariadne's beat.
- **Cross-campaign leakage via search and backlinks.** The pack already names this for
  campaigns; the universe layer doubles it. Search snippets, backlinks and "mentioned in" lists
  must filter by both scopes server-side.
- **Character portability.** The model ties `Character` to a campaign. Should a PC move between
  campaigns in the same universe (a returning hero)? If yes, `Character` needs a universe-level
  identity or an explicit copy/import operation. **Open question for Kaya.**

## Refinements (Apollon, 2026-07-27 — invited by Kaya)

1. **`Actor` and `Character` are one supertype with an extension, not two peers.** As written,
   `Actor.type = player_character` and a separate `Character` row carrying `actor_id` encode the
   same fact twice, which is a divergence waiting to happen. Ruling: **`Actor` is the aggregate**
   (identity, name, portrait, token, `rule_data`, visibility, campaign). PC-specific concerns —
   `created_by_user_id`, controller grants, advancement history — live in a `CharacterProfile`
   extension keyed by `actor_id`, created only for `type = player_character`. One row is the
   truth; the extension is optional detail. `CharacterController` then points at `actor_id`, so
   a companion or a vehicle can be controlled by a player with no special-casing.
2. **`RulePackageInstallation` is its own table, as Kaya's hierarchy shows.** A campaign pins
   `(package_id, version)`; the installation row carries install date, activation state,
   migration status and the validation report. Pinning on `Campaign` alone cannot express
   "installed but not yet activated" or "upgrade dry-run pending", both of which the rule-package
   spec requires.
3. **The `KnowledgeEntry` scope rule becomes a database constraint, not a convention.**
   `CHECK (universe_id IS NOT NULL)` — a campaign-scoped entry always carries its universe too,
   so the two-dimensional visibility filter can be expressed in a single index-friendly
   predicate. "Both empty is invalid" must be unrepresentable, not merely discouraged.
4. **Reconciled with the UI direction's primitives.** `03-triumph-ui-direction.md` names
   `Entity`, `Resource`, `Collection`, `Action`, `Effect`, `Relation`, `ViewRecipe`,
   `ThemeManifest`. These are **presentation and rules primitives**, not a competing data model:
   `Entity` is the UI's word for what the database calls `Actor` (plus locations, factions,
   ships…), `Collection` is a render recipe over inventories and libraries, `Resource` is a
   field-shape inside `rule_data`. Ruling: the persistence layer uses this document's names; the
   rule/UI layer uses the primitive names; **one mapping table is maintained** so the two never
   drift. Kalliope owns that glossary entry.
5. **`AuditEntry` is campaign-scoped and append-only** — no updates, no deletes, and it records
   actor, action, before/after, reason (mandatory for GM overrides) and the reversal link. It is
   the substrate for undo, so it is a first-class table, not logging.
6. **Universe-optional stays real but invisible.** Confirmed as an amendment below: every
   campaign silently gets a personal universe at creation, so there is exactly one code path;
   the concept surfaces in the UI only when a second campaign wants to share knowledge.

## Verdict

Adopt as the working domain model for design round 1's candidates, with three amendments:
timelines deferred to a column, universe made invisible until needed, and the two-dimensional
permission matrix treated as a first-class threat surface rather than a detail. This model is
materially better than what the pack proposed — it is the first contribution that adds a
*product* idea (the shared world) and not only structure.
