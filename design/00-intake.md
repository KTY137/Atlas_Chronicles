# Design Intake — the Brief (round 0)

Status: **draft, awaiting Kaya's ratification.** Compiled by Apollon, 2026-07-26.
Sources: (A) the GPT-prepared pack `claude_ttrpg_prompt_pack/claude_ttrpg_prompt_pack/`,
(B) Kaya's amendments (stated 2026-07-26, verbatim intent preserved below).
This document is the single distillation the crew works from; the pack stays as reference.

## The product in one line

A browser-based, self-hostable, **system-agnostic** virtual tabletop + campaign manager whose
primary user is the **GM** — built to cut the GM's prep and live-play workload, and to look and
feel dramatically better than everything on the market.

## Source A — the pack ("Project Chronicle", working title)

Adopted as **authoritative product intent** (pending ratification):

- Mission & users: GM-centred; separate, permission-aware GM/player interfaces; observer later.
- The **15 product invariants** (pack `CLAUDE.md`): server-side permissions as the only truth;
  `defeat_pending` instead of auto-death; item template ≠ item instance; rule packages are
  declarative and versioned — **never** arbitrary code execution; AI is optional and always
  draft; uploads are untrusted; no copyrighted rulebook content without licence; no secrets in
  the browser; nothing is "done" without permissions, validation, errors, tests, docs.
- Domain scope (pack `PRODUCT_SPEC.md`): characters & dynamic sheets (schema-native +
  background-overlay), notes/wiki/quests/locations, item library + card builder + inventories,
  scenes/maps/tokens/drawing, media & handouts, GM combat console with calculation transparency
  and undo, dice service + action log, deterministic + optional AI generators, export/import,
  de/en localisation, accessibility.
- Delivery discipline: **vertical slices**, 12-phase roadmap with exit criteria (pack
  `ROADMAP.md`); "How to be a Hero" only as a later, licence-compliant external package — an
  original demo system unblocks development.

Adopted as **proposal only** (must survive design round 1, not pre-ratified):

- The concrete stack (React/TS + Vite, NestJS-style Node server, PostgreSQL, S3-compatible
  storage, Socket.IO rooms, modular monolith) — enters round 1 as **candidate A**.
- The pack's own CLAUDE.md + 8 analyst subagents: **inactive reference**; the Apollon crew is
  the organization. Their checklists get folded into the crew's briefs.

## Source B — Kaya's amendments (binding stakeholder requirements)

**K1 — Customizable themes with templates.** Theming must be intuitive and user-adjustable, with
shipped template presets: **Cyberpunk, Mittelalter/Medieval, Fantasy, PixelArt, …** (extensible).
Implications: token-first theming architecture from day one (one token source, themes as data);
a theme editor UI (pick/tweak/save/share); per-campaign mood set by the GM plus user preferences
to reconcile (open question K-Q2). PixelArt implies themes can swap **typography, spacing,
rendering style** — not just colors. This is Aphrodite's crown jewel, with Hephaistos wiring it.

**K2 — Visual GUI rule-builder.** The rule-package structure (entities, fields, sheet layouts,
formulas, dice, actions) should be **programmable visually via GUI** — forms/nodes, not raw
JSON. The pack's declarative, code-free package format is exactly what makes this feasible and
safe: the GUI edits validated declarative structures; the AST formula language gets a visual
editor with live trace preview. This pulls the pack's **Phase 10 forward in ambition**: it is a
flagship differentiator, not an afterthought (priority question K-Q3). Seats: Ariadne (package
structures & validation) + Aphrodite (builder UX) + Hephaistos (build), Athena guarding the
no-code-execution invariant.

**K3 — State-of-the-art GUI.** The UI must be **top tier and sexy** — modern component system,
real motion design/animations, polish that photographs well. Non-negotiable companion rule: it
stays **accessible and table-usable** (the pack's invariants stand — keyboard, contrast,
reduced-motion honored, no animation on hot paths that hurts canvas performance). "Sexy AND
accessible" is a design constraint pair, not a trade to be made silently.

**K5 — Map excellence, map generation, game-engine feel** (added 2026-07-26, late evening).
Kaya wants: (a) map representation that beats the competitors ("wir wollen das nur in besser");
(b) **map generation** as a feature (procedural and/or assisted — ties naturally into the pack's
location-generator system: a generated location should be able to become a generated map);
(c) an honest evaluation of **game-engine tech** ("Unreal Engine 5 etc., wo wir Sprites haben") —
sprites, animated tokens, lighting, particles, game-engine feel. Constraint to resolve honestly
in round 1: UE5-class native engines conflict with the browser-first, self-hostable invariant;
the likely answer is game-engine-class 2D/WebGPU in the browser (to be verified by research
RB-02), but candidates must argue this with evidence, not assumption.
(d) Kaya explicitly favors **Wave Function Collapse (WFC)** as the generation principle ("das
kombinatorische Quanten-Generierungsprinzip") — constraint-based tile collapse for coherent maps;
round-1 candidates should treat WFC-driven, tile/sprite-based map generation as a flagship bet,
not a nice-to-have.
(e) Sprite/tile asset libraries must exist under **commercially usable licenses** (CC0 like
Kenney, CC-BY, or paid commercial packs) — RB-02 verifies the ecosystem and the licensing
model a commercial product needs.

**K4 — Differentiation mandate.** The product must stand apart from **Foundry, Roll20, and all
others** — combine their strengths or surpass them, especially in **features and user
accessibility**. Implications: design round 1 starts with a **competitive research brief**
(Foundry VTT, Roll20, D&D Beyond/Maps, Owlbear Rodeo, Fantasy Grounds, Alchemy RPG, Talespire,
Let's Role, …) mapping strengths/weaknesses/pricing/UX; **every round-1 candidate must carry an
explicit differentiation thesis** ("why does a table switch to us?"). Functional inspiration
yes; cloned branding/trade dress never (pack invariant).

**K6 — RESOLVED 2026-07-27 by [RB-11](research/RB-11-steam-vs-browser-verdict.md).** Ruling:
**Option C as architecture, ship A, keep the Steam door unlocked and unopened.** One web/DOM
codebase (React/TS + PixiJS, DOM-authoritative, canvas as one view) shipped as a browser app
*and* an **Electron** desktop client; **one-time GM licence, players always free**, sold direct
through a merchant of record (~78 % net vs. ~40 % of list realised on Steam). No Steam Direct
fee, no store page, no depot pipeline until a named gate is passed.

Why it dissolves rather than answers the fork: **we were building the Steam client anyway.** A
browser cannot host a local server, so the self-hostable invariant has exactly one humane
implementation — a desktop binary with an embedded host (Foundry telemetry: 68.35 % Electron).
Adding Steam later is $100, a depot script and 6–8 weeks of process; it is not an architecture.

The three load-bearing facts:
- **GM Forge already shipped our exact model on Steam** — $29.99, Workshop, free browser players
  — and has **83 reviews and 1 concurrent player after eight years**. The median 2025 Steam
  release earned **$249**.
- **No game engine has a rich-text editing control** (Godot proposal #1182 still open; Unity UI
  Toolkit likewise). Option B would turn the wiki half into a multi-month text-editor project and
  drop accessibility — the axis K4 told us to win — from rank 1 to rank 3–4. Struck, 2/2/2.
- **Steam works for tools, not for tables.** Dungeon Alchemist (single-user, screenshottable,
  exports *into* every rival VTT) raised €2.46 M from 57,209 backers; TaleSpire, a venue, raised
  ~$400 k. Therefore: **the Forge** — WFC map generator + theme editor + visual rule-builder — is
  the Steam-shaped half of Chronicle. Keep it *separable by architecture*; decide later whether
  it ships separately.

The problem the fork did **not** solve, and which every option pays identically: a browser player
joining a GM's home server hits mixed-content and cannot get a certificate for a LAN IP. The only
proven fix is Plex's DNS-zone + per-server wildcard-certificate service — which we would then
operate forever. **Choosing a channel does not choose a solution.** Every round-1+ candidate must
answer reachability with a number, not a hope.

Consequence for K4: under a direct channel, discovery runs through **creators and system
authors**, not gamers — which is exactly how Foundry grew to 475 systems with no store at all.
So the **visual rule-builder is not merely a flagship feature, it is the go-to-market**, and
**UVTT + Foundry/Roll20/FG-shaped export ships at launch**, not in a late phase. Dungeon
Alchemist reached the whole market by exporting to its rivals.

**Superseded — the original framing, kept for lineage: the distribution fork was OPEN** (raised 2026-07-26, late evening): "Was ist, wenn wir das
als Steam-releasebares Spiel machen?" The browser-first + self-hostable assumption came from the
pack, **not** from Kaya — it is therefore a proposal, not an invariant, and is formally under
review. Four options are on the table: (A) browser-first self-hosted, (B) Steam-native game,
(C) hybrid single codebase shipped to browser + Steam, (D) asymmetric — GM buys a native/Steam
host client, players join free from a browser (the Fantasy-Grounds-Ultimate / Foundry pattern).
Research: RB-07 (Steam economics) · RB-08 (distribution precedents) · RB-09 (client tech paths) ·
RB-10 (Workshop & networking) → verdict RB-11. **No architecture work proceeds until this is
answered** — it determines the stack more than any other single decision. Steam Workshop is the
tantalising part: our rule packages, theme templates and tilesets are exactly Workshop-shaped
content, and Steam solves discovery, which is a new VTT's hardest problem.

**K7 — Game feel through staging, never through a welded-in game world** (2026-07-27, settled
across Codex's spike series; Kaya's own words are the ruling).

The requirement started as "die UI soll nicht wie eine GUI aussehen, sondern wie bei einem
richtigen Spiel" and was sharpened by Kaya through one deliberate overshoot:

- **The middle ground, in Kaya's framing:** text-based web app ← **Chronicle** → PnP sandbox.
  Text stays the primary carrier; the surface is alive and tactile; the app never depicts a
  specific adventure. *"Universell + atmosphärisch."*
- **The governing sentence:** **"Game Feel durch Inszenierung — nicht durch eine fest eingebaute
  Spielwelt."**

Lineage of the three spikes:

1. `chronicle-harbor-visual-spike.html` — **the overshoot, ruled a mistake.** A painted leather
   satchel as the inventory. Gorgeous, but it depicts one fantasy world inside a core component
   and thereby breaks system-agnosticism and K1. **Not discarded:** kept as material for a
   possible later *optional Sandbox/Scene mode* — and if revisited it must be re-thought from a
   different angle, not merely polished.
2. `chronicle-living-shell.html` (+ v2) — **the correction.** Painted art *panels* instead of
   HTML boxes, 9-slice scaling, free slots/capacities/fields, optional artwork area with a clean
   icon fallback — and no baked-in world. The identical inventory carries Aldenfall, Kepler-9
   and Nebelakte with DOM, controls and components unchanged.
3. `chronicle-triumph-shell.html` + [`03-triumph-ui-direction.md`](03-triumph-ui-direction.md) —
   **the architecture.** Independent axes: **content × skin × role × workspace mode ×
   accessibility**, a stable six-zone shell (Session · Story · Cast · Library · Table · Forge),
   and one canonical Scene with **three render recipes** — Cinematic (art and mood), Tactical
   (grid, tokens, walls, fog) and Outline (semantic DOM tree). Codex's own visual audit caught
   the skins being mere recolours and replaced them with genuinely different 9-slice kits.

**Adopted as the UI direction for design round 1.** Art is *content* delivered by packages;
ornament is *skin* delivered by a theme manifest; interaction geometry stays semantic DOM. That
answers "feels like a game" and system-agnosticism and accessibility at once — the tension named
below is thereby largely resolved, and the resolution, not the tension, is what round 1 inherits.

**K8 — World Anvil ist der Maßstab** (2026-07-27, binding amendment). Kaya's words, verbatim:
*"ja wir wollen halt sein wie WorldAnvil nur besser größer stärker."* Consequence: for five design
rounds, the crew's reference sentence was "Wiki/Fandom + PnP session," which **named the wrong
rival**. Fandom is the **platform users are leaving** (a bad host); **World Anvil is the product
benchmark to beat**. Until this amendment the crew had no research-led analysis of World Anvil
itself. **Corrected by RB-14 on the day it was written:** an earlier draft of this amendment cited
"3.1/5 on Trustpilot" — that figure comes from a ten-review aggregator and does not hold. The live
Trustpilot page shows **3.8/5**; World Anvil's own FAQ claims 4.5; all three disagree, so **the
rating is not the evidence — the recurring complaint texts are**, and those are real: an
unintuitive, dated interface, a steep learning curve, and core capabilities behind the paywall. So
their **depth is respected and their surface is the opening**. A second correction from the same
brief: World Anvil is **bootstrapped and unfunded** (no rounds raised), a subscription-funded
company that also publishes RPG books — a materially different animal from a VC-backed platform,
and a beatable one. Implication: every candidate's differentiation ledger must from now on include
the wiki-side rivals (World Anvil, LegendKeeper, Fandom) in explicit comparison to the VTT rivals,
not instead of them. Evidence: [`design/research/RB-14-worldanvil.md`](research/RB-14-worldanvil.md).

**K9 — Die eine Plattform** (2026-07-27, binding ambition). Kaya's words, verbatim:
*"quasi eine marriage aus worldanvil und Foundry/roll20 etc. Wir kombinieren die meisten pnp
tools in ein giga tool. eine Chronicles Platform um die eine platform zu schreiben die jede
andere knechtet."* Explicit ruling: this is a **deliberate Tolkien reference** (one platform to
rule them all) and the crew treats it as real direction, not hyperbole. The governing thesis:
combine all-in-one strength with the visual, theming, and rule-builder assets that no existing
platform has made intuitive. Research in flight answers the thesis: RB-15 (map of the whole
tabletop tooling landscape with absorb/integrate/refuse rulings per function), RB-16 (graveyard
of all-in-one platforms that failed and their postmortems), RB-17 (the substrate thesis: by
what mechanism does a platform come to dominate), RB-18 (Nemesis attacking the ambition itself),
synthesised into `design/04-die-eine-plattform.md`. Open tension, stated plainly: **the ambition
is maximal; the builder is one person plus an AI crew; the crew's operating principle is Mēden
agan (nothing in excess); and World Anvil is disliked partly *because* it is enormous. Therefore
"bigger" must be earned through depth and sequencing, not through feature count.** This tension
is real and belongs in the design attack — it is not a refusal of the ambition, but its honest
prerequisite.

**K10 — Eron als Beispiel-Universum und Migrationstest** (2026-07-27, binding fixture). Kaya's
words, verbatim: *"das können wir ja als Beispiel Universum verwenden, ist von meinen Kollegen
und mir,"* *"eron ist ja nur ein Beispiel,"* and *"wikiFandom ist halt scheiße wir wollen das
in besser integrieren und dann unser wiki in unsere custom app bringen (auch als test ob das
funktioniert)."* Record: the Eron Wiki ([German wiki](https://eron.fandom.com/de/), authored by
Kaya and colleagues) is harvested into `design/fixtures/eron/` as the crew's real, acceptance-test
corpus. Verified via MediaWiki API on 2026-07-27: **74 articles, 316 pages, 1,153 edits,
38 files, ~100 templates, 9 Scribunto modules with errors, MediaWiki 1.43.9**. Three binding
consequences: (1) **Every design artifact from round 5 onwards must use the real corpus.**
Invented placeholder characters are retired; Eron's actual world state is the fixture all
candidates propose to improve. (2) **Eron is an example universe, never the product's depicted
subject.** This restates and reinforces K7 (art is content and skin, never a welded-in game
world), and any candidate that models Eron's specifics, lore or visual identity into the core
product has failed by K7. (3) **The import itself is an acceptance test.** Eron is the real
corpus a prototype must ingest and re-export without breaking structure, licensing or lineage;
the import specification lives in `design/research/RB-12-eron-uebernahme.md`. Licensing
consequence for invariant 7: Fandom content carries **CC BY-SA** even when authored by our own
stakeholder. Attribution travels with the content into our product and **must travel back out
through our export**, unchanged. This is a non-negotiable part of running an open import/export
surface.

**K10a — Eron media permission clarification** (2026-07-27, binding). Kaya states that he and a
colleague are Eron's creators, that the universe is freely accessible and usable, and authorises
its use in this project. This removes the blanket ban on using the Eron maps and portraits in local
spikes and product integration. It does **not** erase per-file provenance: uploaded third-party art
and exports from map-making tools may carry terms the wiki page does not expose. The importer keeps
author, source, checksum and licence state per asset; unknown stays visible until cleared. Before a
public commercial release, capture the co-creator's permission in the provenance pack and clear any
third-party/tool-derived assets individually.

**K11 — visual reset** (2026-07-27, binding). Kaya's ruling after the round-5 direction became
visible: *"Bis jetzt gefällt mir das Design eh nicht, wir müssen das schon auf ein giga krasses
Level bringen; React kann das, es gibt extra Libraries, Examples, Templates und Presets."* The
round-5 HTML spikes remain useful executable arguments, but they are **not visual ancestors**.
Further visual work follows [`05-visual-reset.md`](05-visual-reset.md): one React design lab, a
source-owned accessible component base, deliberate motion and depth, and a cinematic table surface
tested against the real Eron map.

**K10b — the player-party fixture** (2026-07-27, stakeholder correction). In the adventure around
the Child, the main player gang was **Olav der Ehrliche, Song Kayn and Oggugat**; **Yal'it** was an
earlier party member. All other named figures used in the round-5 examples — including Bodin, Irme
and Baldur — are NPCs. Future party rails, initiative examples and screenshots must preserve that
distinction. The corpus confirms the spelling **Oggugat**; “Boggugat” was Kaya recalling the name,
not a second character.

## Tensions the attack pass must resolve

1. **Animation & theme freedom vs. accessibility & canvas performance** (K1+K3 vs. pack NFRs):
   user themes must not break contrast guarantees; motion must respect `prefers-reduced-motion`;
   nothing animated on the map hot path. Candidates must show *how* themes stay readable.
2. **Visual rule-builder scope vs. vertical-slice discipline** (K2 vs. roadmap): building the
   builder before the rules engine exists is building a facade. Candidates must sequence it
   honestly (engine → schema forms → layout editor → formula/node editor).
3. **"Surpass ALL others" vs. a 10-year ecosystem head start** (K4): a feature-count war against
   Foundry's module ecosystem is unwinnable on day one. The winnable axes: GM workload
   reduction, onboarding simplicity, theming/customization joy, accessibility, and the visual
   rule-builder (no competitor does this well for arbitrary systems). Candidates state which
   axes they bet on; "all of them at once" is not a thesis.
4. **Sexy stack vs. boring-tech principle** (K3 vs. pack architecture): motion-heavy
   state-of-the-art UI may pull toward specific libraries (animation, canvas/WebGL). Round 1
   weighs them against maintainability — no novelty for novelty's sake, no dowdiness for
   safety's sake.
5. **~~Painted world as UI vs. universality and accessibility~~ — RESOLVED before round 1** by
   the K7 lineage: semantic DOM stays authoritative, art arrives through a theme manifest
   (9-slice surfaces, ornaments, declared fallbacks) and through package content, never as a
   depicted world. Recorded here because the *resolution* is binding: any candidate that
   re-fuses world and chrome is rejected on sight. What remains genuinely open is only the
   **art-production cost** — how many skin kits ship at launch, and whether additional kits are
   first-party, commissioned or Workshop-supplied. That is a business decision, not a
   design one, and it belongs to the distribution verdict (K6).

## Open questions for Kaya

- **K-Q1 Ratification:** pack + amendments = the binding brief?
- **K-Q2 Theme authority:** who themes what — GM sets the campaign look, players can override
  locally? Are themes campaign-scoped, user-scoped, or both?
- **K-Q3 Rule-builder priority:** flagship-early (accept slower core buildout) or
  core-first-then-builder (pack's original order, builder as the crescendo)?
- **K-Q4 Working title:** keep "Project Chronicle" internally until a real name is chosen?
- **K-Q5 Late amendment integration (2026-07-27):** K8–K10 arrived after the design arena had
  already run five rounds (through CHAMPION.md v5, round 4). The current champion was forged
  against the older framing (World Anvil unanalysed, "Die eine Plattform" unspecified, Eron
  unfixed). **The champion is due for a re-aim** once the new research lands; the work order
  lives in `design/04-die-eine-plattform.md` §8.

## What happens on ratification

1. `git init` + founding commit.
2. The 15 invariants + K1–K4 get folded into `CLAUDE.md`; GPT-agent checklists into crew briefs.
3. **Pythia, design round 1**: competitive research brief (K4) → candidate A (pack architecture)
   vs. 2 materially different alternatives, each with a differentiation thesis → attack pass
   (Athena, Nemesis, Aphrodite/UX, Ariadne/data, Hephaistos/buildability) → Apollon's verdict
   pins stack, gates, and the differentiation axes.
4. Phase 0 (harness + executable skeleton) per the roadmap, then vertical slices.
