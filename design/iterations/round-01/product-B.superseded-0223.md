# The Table Engine — Product Candidate B, Round 1

Forged by Pythia, 2026-07-27. Rival this round: **The Living Codex** (candidate A, wiki-first).
Binding inputs: [`00-intake.md`](../../00-intake.md), [`01-attack-plan.md`](../../01-attack-plan.md),
[`02-domain-model.md`](../../02-domain-model.md),
[`03-triumph-ui-direction.md`](../../03-triumph-ui-direction.md), `research/RB-01..RB-10`.

> **Thesis, one line:** The live session is the product; the wiki is *exhaust* — the world record
> writes itself out of what actually happened at the table, and no one ever maintains it.

**Optimises for:** the 3½ hours a week the table is live, and the twenty minutes before it —
GM workload at 21:00, not at 14:00 on a Sunday.

**At the cost of:** it is unimpressive to a GM who has not yet played a session on it, and it is
openly hostile to the pre-written encyclopedia. A world that exists only as prose in someone's
head or someone's Google Doc gets no credit here until it touches a table. Candidate A courts
exactly that GM. This candidate does not, and will not hedge to get them.

**The judging rule this candidate accepts:** every feature is measured by whether it survives
contact with a live table at 21:00 with five humans waiting. A feature that only pays off during
prep is a Forge feature and gets prep-tier priority. A feature that requires the GM to maintain
something between sessions is, by default, rejected.

---

## 1. The flex

**"Fog of war, but for knowledge."** Foundry gives you fog of war for the map. Nobody in the
market has fog of war for the *world*. This candidate does, and gets it for free, because it
records the table instead of asking the GM to describe it.

The moment, concretely:

> **21:47, session 8.** The GM drops the Baron's token onto the stage. A player says the sentence
> every GM dreads: *"Wait — have we met this guy before?"*
>
> The GM taps the token and presses **`W`**.
>
> The Context Lens splits into columns. Left, in GM-red: **TRUTH** — the Baron is the lich; he
> commissioned the courier's murder; his sigil is on the ledger in the party's loot. Right, one
> narrow column per player character: **WHAT THEY HAVE.**
>
> - **Mira** — *"Session 3, in-world 14 Frostmoon: heard the name 'Aldric' from a dying courier
>   (witnessed)."* One line. That is all she has.
> - **Bjorn** — empty. His player missed session 5, and the app knows that, because attendance is
>   a record and the reveal in session 5 had a witness set.
> - **Sela** — two lines, one of them flagged **`told, unverified`**: the innkeeper lied to her in
>   session 6, and the ledger says so, because the GM tagged that reveal as `told`, not `witnessed`.
>
> The GM says, out loud, in under two seconds: *"Mira, you've heard the name. Bjorn — no idea who
> this is. Sela, you were told something about him that you have no reason to trust."*
>
> **Nobody wrote a word of that.** Not the GM, not a note-taker, not an AI. It is a fold over the
> session log.

That is the "wait, what?" — and it is the kind that *only lands after you have played*, which is
why it is a bet and not a safe demo. The friend's second question is always the same: *"How does
it know Bjorn wasn't there?"* Because attendance, presence and control are three different
recorded things (§6), and every reveal carries the set of characters who were in the room.

Why no competitor can copy it cheaply: in Foundry a journal page has per-user ownership — a
boolean, set by hand, with no provenance and no notion of *when* or *how* a character learned
something (RB-01-foundry). Roll20 has journals and handouts with a share list (RB-01-roll20).
Fantasy Grounds has story entries shared at the GM's discretion (RB-01-fantasy-grounds). Owlbear
and TaleSpire have no campaign memory at all (RB-01-owlbear, RB-01-talespire). Alchemy has
authored lore in a Universe, not derived knowledge (RB-01-alchemy). **Every one of them models
"who may see this document." None of them models "who learned this fact, when, and from whom."**
The second is a different data structure, and you can only populate it automatically if the live
table is already an event stream. Table-first is the precondition for the flex.

---

## 2. How the two halves fuse

Not "the wiki links to the session." The wiki **is a projection of the session log**, and the
table is the only writer on the primary path.

### The four objects

| Object | What it is | Who writes it |
|---|---|---|
| **Beat** | One typed, append-only, server-authoritative record of a consequential thing at the table: `Reveal`, `Roll`, `Move`, `Transfer`, `Outcome`, `SceneChange`, `Mark` (a GM-tagged utterance), `Decision`. Carries actor(s), object(s), scene, real timestamp, `in_world_date`, and a **witness set**. | The engine, on every commit |
| **Fact** | A derived assertion attached to an entity: `(subject, predicate, object, source_beat, in_world_date, canon_status)`. Structured, not prose. | **The Projector** (deterministic) |
| **Grant** | `(character_or_user, fact, acquired_at_beat, mode: witnessed \| told \| inferred \| read \| gm_fiat)` — the Witness Ledger's atom. | The Projector |
| **KnowledgeEntry** | The *container* — the page. Its body is a rendered fact set plus optional authored prose. | GM (optional), Projector (facts) |

### The two directions

**Play → Knowledge (write).** The **Projector** folds Beats into Facts and Grants. It is pure,
deterministic, replayable, and runs with no AI provider — invariant 5 is satisfied structurally,
not by a feature flag. A `Reveal(entity: Baron, predicate: is_dead, witnesses: [Mira, Sela])`
produces one Fact on the Baron's page and two Grants. An `Outcome(defeat_confirmed)` produces a
dated Fact. A `Mark` — the GM pressing one key while saying something out loud — produces a
`told` Fact with the current witness set. Nothing is invented; the Projector cannot assert what
the log does not contain.

**Knowledge → Play (read).** Because every token, item instance, handout and scene is an entity
reference, the Context Lens *is* the wiki, filtered live. There is no navigating to the wiki
during play; selecting a thing on the table shows its dossier, permission-correct, in the two
columns of §1. The GM never leaves the table to remember something.

**The valve between them: the Chronicle Pass.** At `End Session`, the GM gets a **diff**, not a
document: *23 facts proposed, 4 entities auto-created (the tavern the party named, the NPC they
killed), 31 new backlinks, 2 conflicts.* Accept / edit / discard / promote-to-Universe-canon, in
a keyboard-driven review that takes three minutes. Discarded facts stay in the Beat log (audit
survives) and leave the wiki. **The GM is the editor of a paper they never had to write.**

### Worked example — session 8, fifteen real minutes

| Time | At the table | Beats emitted | What the world record does |
|---|---|---|---|
| 21:31 | GM strikes the Curtain on *Aldric's Study* | `SceneChange` | Location `Aldric's Study` gains `visited, session 8, 14 Frostmoon`. First visit → auto-stub page created, GM never asked. |
| 21:34 | Mira searches the desk, rolls 17 | `Roll(Mira, perception, 17)` | Nothing yet. A roll alone is not knowledge. |
| 21:34 | GM reveals the ledger to Mira only (Bjorn is across the hall) | `Reveal(Ledger, witnesses:[Mira])` | Fact `Ledger bears Aldric's sigil`. **One** Grant. Bjorn's column stays empty — automatically. |
| 21:38 | Mira tells the party | GM presses `M`, tags `told`, witnesses auto-filled from present characters | Three Grants, `mode: told`. The ledger now distinguishes *saw it* from *heard about it*, which is the difference between a paranoid player and a wrong one. |
| 21:41 | Bjorn drops the Baron to 0 HP | `Outcome(defeat_pending)` — **not** a death | Invariant 4 holds. No Fact yet: `defeat_pending` is a proposal. |
| 21:42 | GM confirms: he dies | `Outcome(defeat_confirmed)` | Fact `Aldric died, 14 Frostmoon, Aldric's Study, by Bjorn`. Grants to all four present characters. The Baron's page updates itself. |
| 21:44 | The party names the study "the Lily Room" | `Mark(rename)` | The auto-stub takes the party's name. The world record now speaks in *their* words. |
| 23:50 | `End Session` | — | Chronicle Pass: 23 facts, 3 min review. Session 8 page exists. Four entity pages changed. Zero prose typed. |

Next Tuesday the GM opens the campaign and the world remembers more than they do. That is the
loop, and it compounds: session 40 has a wiki no GM would ever have had the discipline to write.

---

## 3. The six zones under this thesis

The shell from [`03-triumph-ui-direction.md`](../../03-triumph-ui-direction.md) is adopted whole:
six zones, independent axes (content × skin × role × mode × a11y), one Scene with three render
recipes, DOM authoritative, Pixi behind `MapRenderer`, the accessibility and performance gates.
What changes is **which zone is home** and **what each zone is for**.

### Session — promoted to the product's root

In candidate A, Session is a leaf of the world. Here it is the landing zone and the default route.
It holds:

- **The Run Sheet** — the GM's live agenda: beats to hit, open clocks, unresolved threads pulled
  automatically from the last Chronicle Pass ("Sela still doesn't know about the lily"), and the
  three things prepped for tonight. Not a document; a checklist the table consumes.
- **The Curtain Check** — the twenty-minutes-before gate (§7 of RB-05's lint idea, widened): any
  `defeat_pending` left open from last session, a character with no controller, a player whose
  client will render this scene at 20 fps, a scene with no walls, a quest with no next step,
  missing token art. One screen, green or not.
- **The Beat tail** — the live log, human-readable, with `Why?` on every line.
- **The Chronicle Pass** at the end.

### Story — becomes the Chronicle

Not an authored wiki. A **timeline-first, event-sourced record** with the Witness Ledger as its
signature view. Pages are entity + facts + optional prose. Authoring still exists — you can write
a page — but it is framed as **seeding**: a stub a table will fill, marked `unplayed` until a Beat
touches it. The Universe layer from `02-domain-model` survives and is *earned*: Facts get promoted
to Universe canon during the Chronicle Pass, so the shared world is sediment from many campaigns
rather than a blank encyclopedia waiting for a diligent GM (§6).

### Cast — becomes the Green Room

Who is at the table tonight, in what state, controlled by whom. Sheets are play surfaces, not
records: the compact glance is primary, the full sheet is a drill-down. The relationship graph is
**derived** — two characters who co-witnessed 40 Beats are related, and the app can say so without
anyone maintaining a relationship table.

### Library — becomes the Prop Table

Every object in Library carries one privileged verb: **"Put it on the table now."** Item templates,
instances, handouts, cards, media, statblocks. Template ≠ instance stays absolute (invariant 3),
and instances now additionally carry **provenance**: which Beat created this sword, in whose hands
it has been, what it was named by the party. A looted item has a history because the loot was a
Beat.

### Table — the default stage, always live

The Primary Stage, and under this thesis it is not a "mode you switch to" — it is where you are.
Three recipes as specified (Cinematic / Tactical / Outline), selection preserved across recipe
changes. The table-first addition: **prep happens on the stage, backstage.** There is no separate
scene editor; there is the same stage with the Curtain down, where the GM stages tokens, drops
props and rehearses reveals, and the players' clients receive nothing.

### Forge — the workshop between sessions

Theme Studio, visual rule/schema builder, formula/action graph, generators, package tests — all as
specified. One table-first amendment to every Forge artifact: a **"Test at the Table"** button that
spins a throwaway GameSession with fake players and runs the thing for real. A rule the builder
cannot execute at a table is not finished, and the Forge should say so out loud.

### Where the shell must change — two declared deviations

1. **The Session Shelf is promoted to a permanent Transport Bar.** 03-triumph says the Shelf is
   "visible during play, quieter during preparation." Under this thesis prep *is* rehearsal on the
   live stage, so the Shelf is never quiet: session clock, Curtain state, Beat tail, dice, Rewind.
   It is the one element that never collapses, on any layout, in any zone.
2. **A new value on the workspace-mode axis: Stage state — `Backstage | Live | Struck`.** This is
   *not* a client toggle and *not* a seventh zone. It is a server-authoritative property of the
   `GameSession` that gates what player clients are sent (invariant 1). Backstage material is
   omitted from the response, never hidden in the DOM. The Curtain is the single most dangerous
   control in the product and is therefore modelled as data, audited, and covered by tests that
   fetch the raw API as a player.

### The three amendments carried per the attack plan

- **K1 theme strategy.** Token-first, themes as data, theme manifest per 03-triumph, GM sets the
  campaign skin, users may always override downward for accessibility (a partial answer to K-Q2:
  campaign-scoped with a user-scoped a11y override that wins). The table-first twist: **skins
  react to Beats** — a `defeat_pending` dims the stage, a `Reveal` sweeps light across the panel.
  That is K7's "game feel through staging" driven by the ledger instead of by hand-authored cues,
  and it is the cheapest cinematic win in the product.
- **K3 motion.** Motion carries Beat semantics, so the motion system has a *reason*: each Beat type
  owns one transition, taken from 03-triumph's tempo table (110–180 / 220–340 / 600–1000 ms).
  Nothing animated on the map hot path. Reduced motion replaces spatial travel with state change.
- **K2 rule-builder sequencing, honestly.** The engine is defined by what a Beat needs to resolve,
  and the builder edits structures the engine already executes. Order: dice + Beat commit → resource
  and effect model → schema forms → sheet layout → formula/action graph with live trace → package
  self-tests. This is **Act IV**, not the first slice. Anything earlier is a facade (intake tension
  #2), and this candidate will not pretend otherwise to win a round.
- **Invariant 6, unified.** "Why is this number 14?" and "Why does the wiki say the Baron is dead?"
  are answered by the *same* trace component walking the same Beat chain. Calculation transparency
  and knowledge provenance are one feature, which is a real architectural saving.
- **K6 distribution — this candidate's position.** Table-first is inherently multiplayer and
  session-shaped, which argues against the standalone-single-user-Steam-tool split that RB-08 L3
  recommends (that route suits candidate A's authoring tools far better). This candidate takes
  RB-09's recommendation as written: **one web codebase, browser build primary, Electron shell for
  a Steam/desktop build, keeping intake options A/C/D open**, and treats RB-08 L2 as binding —
  Steam is a shelf, not a growth engine. Deferred to the RB-11 verdict, which does not yet exist;
  this is a position, not a ruling.

---

## 4. The differentiation ledger

A ledger with no losses is a lie. Every "they do better" line below is a real reason a table stays
where it is.

### Foundry VTT

- **We do, they cannot:** per-witness knowledge with provenance (their journals have per-user
  ownership booleans, no acquisition record); a world record that writes itself; table-level
  **Rewind** across all state (they have per-action undo); declarative versioned rule packages that
  are structurally immune to the churn that left **only 1,590 of 5,338 modules V14-compatible one
  month after release** (RB-01-foundry); a first-party no-code builder against their JavaScript +
  Handlebars system development; first-class accessibility against **open core issues for contrast
  and an accessibility mode** patched by community modules.
- **They still do better — honestly:** dynamic lighting, walls, vision, Scene Levels and Regions V2
  with attachable behaviors are best-in-class and the #1 cited "wow" (RB-01-foundry, RB-05); 5,338
  modules and 475 systems; total data ownership; a $50-once price that anchors the whole market.
  **For a 5e tactical table playing tonight, Foundry beats our first slice outright and will beat us
  on the map for years.**

### Roll20

- **We do, they cannot:** export everything (they have **no campaign export**, unreliable character
  transfer, and have declined custom-content export — RB-01-roll20); any user theming at all; a
  wiki with cross-linking and provenance against journals + handouts; a no-code builder against
  HTML/CSS/sheetworkers with custom sheets Pro-gated; a serious accessibility posture against years
  of documented screen-reader hostility and no public conformance statement.
- **They still do better:** ~10M registered accounts and the **LFG directory network effect** —
  "most games are found on Roll20" is a moat we cannot build; the licensed compendium catalog plus
  the Demiplane integration; and the plain fact that everyone already has an account.

### Fantasy Grounds

- **We do, they cannot:** browser play at all (desktop-only Unity client); any accessibility story
  (they have none documented); no-code system authoring against **XML + Lua edited in Notepad++**,
  with the paid third-party Ruleset Wizard as the low-code ceiling; a modern shell against MDI
  window soup and radial menus; and the entire Witness Ledger, which their story-entry sharing does
  not approach.
- **They still do better:** the deepest native per-ruleset automation in the market — "as a DM you
  spend pretty much no time on math"; **~3,858 licensed store products** and a buy-a-module-and-run-it
  prep economy; and since November 2025 the client is **free**, which deletes their historic price
  objection. For a table playing one of their ~50 licensed systems, their prep economy is
  unbeatable by us and we should not pretend otherwise.

### Owlbear Rodeo

- **We do, they cannot:** everything above the map — sheets, rules, campaign memory, knowledge. They
  have **no character sheets, no rules layer, no journals/quests/wiki first-party**, and have stated
  they will not become a campaign manager (RB-01-owlbear). Nothing accretes there, by design. Also:
  self-hosting (2.x is closed SaaS; only the deprecated 1.0 is source-available, non-commercially)
  and theming (they have none beyond paid room backgrounds).
- **They still do better:** **onboarding — they are the market benchmark** at ~20 minutes to a
  running game and account-free player join in seconds; renderer engineering (Warp Core, GPU soft-
  shadow fog, a **137-megapixel map on an iPhone 14 Pro Max**); Forecast, their one-click CV auto-fog;
  touch and mobile as a shipped target; and a genuinely playable free tier. At minute one Owlbear
  beats us, and honestly probably always will — our answer is parity of *feel*, not of speed.

### Alchemy RPG

- **We do, they cannot:** self-hosting, an API, mods, real portability (their ceiling is JSON
  character export); tactical play (they have fog of war but **no dynamic lighting, no measurement,
  no AoE**); accessibility (motion-heavy, documented readability complaints, no a11y statement, no
  reduced-motion option found); first-class homebrew (their licensed universes shine, custom
  campaigns are "quirky"); and derived knowledge — their Universes are *authored* lore.
- **They still do better:** presentation. They are widely ranked the best-looking VTT; scene-as-mood
  is a validated idea we are stealing; built-in voice/video and a native **Streamer Mode**; 125+
  licensed system integrations; and their **Sheet Builder is a shipped, GUI, no-code product in open
  beta while ours is a plan in Act IV**. That last one is the honest sting: on K2 they are ahead of
  us today.

### TaleSpire

- **We do, they cannot:** character sheets and rules (**neither exists after ~5 years of Early
  Access, both deferred past 1.0**); journals, quests, handouts (essentially absent); theming (the
  fixed aesthetic is the product identity and they refuse plain tokens on principle); accessibility
  (unaddressed, 3D camera as sole modality); localisation (English only — material for a German
  stakeholder); browser/tablet play; and self-hosting.
- **They still do better:** the gasp. A coherent toy-diorama 3D look, 90% positive across 4,300+
  Steam reviews, persistent boards, real elevation for free, HeroForge minis, and the seats/guest
  licensing generosity that sets player expectations about who pays. **Nothing we ship in 2D will
  produce the same first-look reaction**, and we should stop trying to and win on the second look.

### The uncontested square

Per RB-05: "nobody owns the whole map stack." The sharper version for this candidate: **nobody owns
the knowledge stack at all.** Six products, six models of "who may see this document," zero models
of "who learned this, when, from whom." That is the square this candidate occupies.

---

## 5. What this candidate refuses to build

*Mēden agan.* Stated so the attack pass can hold us to it:

- No authored-encyclopedia workflow on the primary path. Seeding, yes; a "New Wiki Page" button as
  the front door, no.
- No 3D. RB-05's strongest single finding stands: **Project Sigil, WotC's UE5 VTT, is dead** with
  servers closing October 2026, while browser-based D&D Beyond Maps continues.
- No arbitrary code execution, ever, in packages, themes or extensions (invariant 2).
- No AI on the critical path. The Projector is deterministic. AI may draft recap prose and nothing
  else in the first three acts.
- No branching Timeline table in v1 — `Campaign.in_world_date` plus a nullable `timeline_id` column,
  per Apollon's amendment in `02-domain-model`.
- No feature-count war against Foundry's ecosystem (intake tension #3).

---

## 6. The data shape

`02-domain-model.md` is adopted, with its three amendments (timelines deferred to a column,
Universe invisible until needed, the two-dimensional permission matrix treated as a threat surface).
This thesis changes four things and adds three tables.

### Change 1 — AuditEntries are promoted to `Beats`, and become load-bearing

The pack treated the action log as an audit artifact. Here it is **the primary write path of the
entire product**. Consequences that must be accepted up front:

```
Beats (id, game_session_id, campaign_id, seq, type, actor_ids[], object_refs[],
       scene_id, real_ts, in_world_date, witness_character_ids[], witness_user_ids[],
       payload jsonb, package_id, package_version, schema_version, parent_beat_id,
       status: proposed | committed | rewound | amended)
```

- Append-only. Corrections are new Beats (`amended`), never mutations.
- `parent_beat_id` gives the proposal→commit chain (below).
- Every Beat records the rule package id **and version** that produced it — the pack's rule, now
  non-negotiable, because replay across a package upgrade is otherwise undefined.

### Change 2 — `defeat_pending` stops being a special case

Invariant 4 is not an exception; it is the engine's default shape. Every consequential outcome is
**`BeatProposal → BeatCommit`**: the engine computes, the Lens shows the trace, a human commits.
`defeat_pending` is simply the `Outcome` proposal that a GM has not confirmed. This unifies the
combat console's preview/commit/undo with the Chronicle Pass's accept/discard, and gives Rewind a
single mechanism.

### Change 3 — `KnowledgeEntry` splits into container and atom

```
Facts   (id, universe_id?, campaign_id?, entry_id, subject_ref, predicate, object_ref|literal,
         source_beat_id, in_world_date, canon_status: proposed|campaign_canon|universe_canon|retconned,
         created_by: projector|gm)
Grants  (id, fact_id, character_id?, user_id?, acquired_at_beat_id,
         mode: witnessed|told|inferred|read|gm_fiat, confidence: firm|unverified)
```

`KnowledgeEntry` survives exactly as `02-domain-model` defines it — scoped by `universe_id` +
`campaign_id`, with `parent_entry_id` for non-destructive campaign-local extension. It becomes the
*page*; Facts are its contents. Universe promotion is a `canon_status` transition performed in the
Chronicle Pass, which is what makes the Universe layer **earned sediment** rather than a blank
encyclopedia — and keeps `02-domain-model`'s "sixth differentiation axis" alive under a table-first
thesis rather than discarding it.

### Change 4 — three presence concepts are separated by name

In the spirit of `AuthSession ≠ GameSession`, binding from day one and going into Kalliope's
glossary before any code exists:

| Concept | Table | Means |
|---|---|---|
| **Control** | `CharacterControllers` (unchanged) | who may act as this character |
| **Attendance** | `SessionAttendance (game_session_id, user_id?, character_id?, joined_at, left_at)` | who was *at* this session — users and characters recorded separately, because a PC can be present while its player is absent |
| **Presence** | ephemeral, not persisted | who has a socket open right now |

The Witness Ledger is wrong the moment these three are conflated. That is why they are three.

### What does not change

`User → UniverseMembership → Universe → Campaign → GameSession`; roles on memberships, never on the
user; `Actor` as the common base with typed specialisations; `CharacterController` as its own table;
`ItemTemplate` ≠ `ItemInstance` (instances additionally gain `origin_beat_id`); `Campaign.universe_id`
nullable with a silent personal universe and the word "Universe" never shown at first run.

### The permission surface, stated as the threat it is

`02-domain-model` already flags a two-dimensional matrix (universe role × campaign role × entry
visibility). This candidate adds a **third dimension: per-Grant, per-character fact visibility.**
Every search snippet, backlink, autocomplete, "mentioned in" list, recap and export must filter on
all three, server-side, with the response *omitting* unauthorised records rather than hiding them —
the exact boundary the Triumph spike explicitly does not prove. **This is the largest single risk in
the candidate and Athena should treat it as such** (see weakness W4).

---

## 7. The first slice

**"One Scene, One Reveal, One Recap."** One coherent workflow, a real four-hour session, ending
with a session page nobody typed. This is the whole slice, and the cuts below are the point.

### In

1. One campaign, one `GameSession`. GM plus up to four players joining **by link** — display name +
   GM approval, no player account required (Owlbear's pattern, RB-01-owlbear).
2. **Attendance** captured at Curtain-up: present users × present characters, editable by the GM
   mid-session (a player arriving at 22:00 is the normal case, not an edge case).
3. **Table zone, Cinematic recipe only.** A backdrop image, a cast strip, a handout panel, a
   spotlight. Plus the **Outline** recipe of the same Scene, because accessibility is architecture
   and the Outline is cheap when there is nothing to outline yet.
4. **Three Beat types:** `Reveal(entity → witnesses)`, `Roll(actor, expression, result)`,
   `Mark(GM utterance, mode: told|witnessed)`. Proposal→commit on all three, with Rewind.
5. **The Witness Ledger view** — press `W` on any entity: TRUTH column plus one column per present
   character, each fact showing mode, session and in-world date, with `Why?` walking to its Beat.
6. **End Session → Chronicle Pass**: deterministic diff, keyboard accept/edit/discard, producing a
   session page and updated entity pages. No AI in the loop at all in slice 1.
7. **Server-authoritative omission**, proved by test: a raw API fetch authenticated as player B must
   not contain a fact player B has no Grant for. This test exists before the UI does.
8. Two skins (one Crafted, one Clean) + High Contrast + Reduced Motion, automated contrast gate,
   full keyboard operation, NVDA/Firefox and VoiceOver/Safari passes.
9. `Campaign.in_world_date` advanced by the GM, stamped on every Beat.

### Out — the brutal part

| Cut | Why it survives being cut |
|---|---|
| **The tactical map. Walls, tokens, grid, fog, lighting.** | The flex is the ledger, not the lighting. Foundry owns lighting (RB-01-foundry) and Owlbear owns the renderer (RB-05); we will not beat either in slice 1 and a bad map is worse than no map. Alchemy is an existence proof that a whole product ships without one (RB-01-alchemy). **This is the cut most likely to be attacked and I am making it anyway.** |
| Character sheets | Cast entries are entities with a handful of fields. Sheets need the rule engine; the rule engine needs the Beat model to exist first. |
| The rule engine and rule packages | Slice 1's dice are a plain expression evaluator emitting `Roll` Beats. A `package_version` column exists and is filled with `demo@0`. |
| The visual rule-builder (K2) | Act IV. Building the builder before the engine is building a facade (intake tension #2). |
| Theme Studio (K1 editor) | Two shipped skins prove themes are data. The editor comes with Act II. |
| AI anything | The Projector is deterministic. Invariant 5 is satisfied by having no provider at all in slice 1. |
| WFC map generation (K5d) | RB-05's own sequencing: generation lands *after* the renderer and wall model are stable, because generation only impresses if the result is immediately playable. |
| The Universe layer | Silent personal universe, invisible. Promotion-to-canon UI arrives when a second campaign exists. |
| Multi-campaign, import, export | Export is a launch requirement (RB-08 L4), not a slice-1 requirement. |

### Exit criterion

Kaya runs one real session with real humans. At 23:50 the GM presses End Session, spends three
minutes in the Chronicle Pass, and closes a laptop on a world record they did not write. If that
does not happen, the slice failed regardless of what tests are green.

---

## 8. Weaknesses

Real ones. The attack pass is coming and hiding these wastes it.

**W1 — The cold-start problem is a sales wound, not just a UX one.** A wiki made of exhaust
produces nothing until you have played. A GM evaluating this on a Tuesday afternoon opens an empty
product with no reason to switch; candidate A demos beautifully at session zero and this candidate
demos at session three. Worse, the flex in §1 *cannot be shown* without a played history. Mitigation
is a seeded demo campaign with a synthetic Beat log — which is a fake, and a reviewer will say so.

**W2 — HARD, and I have no clean fix: the Witness Ledger is systematically incomplete and
confidently wrong.** The engine records reveals, rolls and marked utterances. It does not record
that the GM said "the baron smells of lilies" in passing, that Mira's player was in the kitchen, that
the table worked it out in Discord on Thursday, or that Bjorn's player read the module in 2019. So
the ledger is a record of *what the software saw*, presented in a UI that invites reading it as *what
the characters know* — and the failure mode is silent: a GM who trusts it will confidently contradict
their own table, which is worse than having no ledger at all. Every fix costs the thesis something:
tagging every utterance is exactly the manual labour we promised to abolish; voice capture is an AI
dependency on the critical path (invariant 5) and a privacy problem; and the honest framing
("Recorded", never "Known") makes the flex quieter in the demo where it needs to be loudest. This is
the weakness that could kill the candidate and it should be attacked first.

**W3 — Event sourcing is a permanent tax on every future feature.** Every feature must emit correct
Beats; every Beat must survive schema migration and package-version upgrades to remain replayable;
Rewind and Amend must recompute the Projector's entire downstream output including Grants. "Actually
that happened two sessions ago" fights an append-only log. This is a materially larger engineering
surface than Foundry itself carries — for a solo stakeholder with an AI crew. Hephaistos should
price this honestly and Nemesis should ask what happens when a rule package upgrade makes an old
Beat unreplayable.

**W4 — The permission matrix goes three-dimensional and one leak destroys the product's
credibility.** Universe role × campaign role × per-Grant fact visibility, filtered server-side across
search, backlinks, autocomplete, "mentioned in", recaps, exports and the Chronicle Pass diff itself.
A player seeing a GM secret in a search preview is not a bug in this product — it is the product's
central promise failing in public. `02-domain-model` already names the two-dimensional version as a
genuine escalation path; this candidate makes it worse on purpose.

**W5 — The thesis is hostile to the most valuable GM in the market.** The GM with a ten-year homebrew
world, three campaigns and a 200-page document is exactly who candidate A serves and exactly who this
candidate tells to start playing before the app will help. Import mitigates it; the *philosophy* does
not, and philosophies leak into UI.

**W6 — 95% of wall-clock time is between sessions, and this product is quietest then.** Table-first
optimises the 3½ hours a week the app is unambiguously winning and has less to say about the 164½
hours when a GM might otherwise open it, form a habit, and stay subscribed. Foundry shares this
problem; a wiki-first product does not.

**W7 — Slice 1 demos worse than Owlbear's free tier.** Shipping a table-first product whose first
public artifact has no battlemap is a positioning risk with real teeth: the category is *called*
"virtual tabletop," reviewers will screenshot the map, and RB-01-talespire already warns that
TaleSpire and Sigil set the visual bar our K3 claim gets measured against. We are betting that a
three-column knowledge panel photographs better than a lit dungeon. It does not.

**W8 — Rewind is socially harder than it is technically.** Undoing the table means undoing things
players saw and reacted to. Foundry's per-action undo is safe because it is small; a table-level
rewind across a witness ledger raises a question no data model answers: **does Mira un-know the
sigil?** The engine can revoke the Grant. The human cannot.

---

## 9. Creative extensions

Three things nobody asked for that this thesis makes cheap, and that no competitor can copy without
first becoming event-sourced.

### E1 — "Previously On" — the scrubbable session

A session is a Beat stream, so it is a timeline you can scrub. Two products fall out of one feature:

- **The recap cut.** A player who missed session 5 opens a 90-second replay assembled deterministically
  from the highest-weight Beats — reveals, confirmed outcomes, decisions, scene changes — rendered as
  the actual scenes with the actual cast in the campaign's skin, not as a wall of text. It is filtered
  by *their* character's Grants, so it is also spoiler-correct, which no recap in the market is.
- **Rewind the table.** "No — we're rewinding to before the door." The whole table state is a fold of
  Beats, so the GM can move the fold. Foundry undoes an action; nobody rewinds a session. (Ships with
  W8's honest caveat: the app revokes the Grants, the humans still remember.)

### E2 — The Amend — retcon as a first-class, traceable operation

Facts are sourced to Beats and Grants are explicit, so history can be *amended* rather than edited.
Mark a Beat `amended`; the Projector recomputes every downstream Fact and Grant and shows the GM a
preview: *"7 facts change. 3 pages change. Mira loses one thing she believed; Sela gains two. Here is
what your table would now believe."* Then commit or discard. A document store cannot do this; a wiki
cannot do this. And it is the same trace component as invariant 6's "why is this number 14?", so it
costs us almost nothing to build once the Projector exists.

### E3 — The Dossier — handouts as knowledge transactions in costume

Select a set of Facts, press **"Brief the party."** The product emits a permission-correct in-world
document — a bounty poster, a case file, a ship's manifest — laid out by the current theme manifest
(K1) with the campaign's skin, delivered to exactly the chosen characters. The point is not that it
is pretty. The point is that **handing it over creates Grants**, so the ledger stays true, and the
prettiest artifact in the product is also the most rigorous one. Every other VTT's handout is a JPEG
with a share list; ours is a state transition wearing a costume.

### E4 — Cross-table archaeology (Universe layer, later acts)

Once several campaigns share a Universe and all of them are Beat streams, the Universe can tell the
GM things no one recorded: *"In three of your campaigns someone has burned down the Gilded Eel."*
*"No party has ever gone north."* *"Aldric has died twice, at different in-world dates — pick which
one is canon."* This is emergent world knowledge, available only to a product that recorded the play,
and it is the retention mechanic `02-domain-model` was reaching for — arrived at from the table side
instead of the encyclopedia side.

---

## Closing statement of the bet

Candidate A bets that the durable world is the product and that GMs will maintain it if the tools are
good enough. This candidate bets the opposite and stakes everything on it: **GMs will not maintain a
wiki — they never have — but they will play, and play is structured enough to be read.** Record the
table properly and the encyclopedia writes itself, with a property no hand-written wiki has ever had:
it knows who knows what.

If the attack pass breaks W2, this candidate is wounded at the heart and should say so rather than
be patched. That is the risk of making a bet the rival is not making.
