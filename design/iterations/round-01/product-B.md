# The Table Engine — Product Candidate B, Round 1

Forged by Pythia, 2026-07-27. Rival this round: **The Living Codex** (candidate A, wiki-first).
Binding inputs: [`00-intake.md`](../../00-intake.md) · [`01-attack-plan.md`](../../01-attack-plan.md) ·
[`02-domain-model.md`](../../02-domain-model.md) · [`03-triumph-ui-direction.md`](../../03-triumph-ui-direction.md) ·
`research/RB-01-*`, `RB-02`, `RB-04`, `RB-05`, `RB-07`–`RB-10`, and the ratified
[`RB-11`](../../research/RB-11-steam-vs-browser-verdict.md), whose runtime verdict this candidate
does not re-open.

> **Thesis, one line:** the live session is the product — and because the session is an
> append-only, server-authoritative command log rather than a pile of mutable rows, the table can
> be **rewound, blamed and replayed**, and the campaign wiki is that same log read in the other
> direction.

**Optimises for:** the twenty minutes before 21:00 and the three and a half hours after it. Every
feature is judged by whether it survives contact with five humans waiting.

**At the cost of:** authoring comfort. A GM who wants to sit down on a Sunday and write an
encyclopedia will find this product indifferent to them until they play. We do not ship a
world-builder's blank page as the front door, we do not compete for the GM whose world lives in a
200-page Google Doc, and we accept that candidate A owns that person. We also pay a real
engineering tax — an event-sourced core is a heavier substrate than a CRUD one, forever (§8, W2).

**The judging rule this candidate accepts, and asks to be held to:** a feature that only pays off
during prep is a Forge feature and takes Forge priority. A feature that requires the GM to maintain
something *between* sessions is rejected by default.

---

## 0. Note on the sentence I will not say

The obvious pitch for a table-first candidate is *"the wiki writes itself."* It is false and it
should be struck before an attacker has to strike it. **A deterministic fold over a session log
cannot produce a world-sentence.** It cannot write "Vaugn is a harbourmaster who has been quietly
selling salt-house access to the Ashen Pact for two winters." Any candidate claiming otherwise is
either hiding an LLM on the critical path (violating invariant 5) or lying.

What a deterministic fold *can* produce is everything around the sentence: the page's existence,
its identity, its typed fields, its links in both directions, its per-character visibility, its
dates, its provenance, its changelog, and its position in the graph. So this candidate's actual
claim, stated in the form that survives attack:

> **The wiki does not write your prose. It writes everything except your prose — and everything
> except your prose is the part GMs abandon.**

Nobody stops keeping a campaign wiki because writing two sentences about an innkeeper is hard. They
stop because of the *bookkeeping*: creating the page, remembering the name, linking it in both
directions, dating it, recording who was present, keeping the secret out of the players' copy, and
updating it when things change. That is the load, and that load is mechanical, and mechanical load
is exactly what a log can carry.

---

## 1. The flex

**You can rewind the table. And you can right-click any fact in the world and see the exact second
it became true.**

### The moment

> **21:47, session 12.** Combat. The GM drops a fireball template over the dock crates, presses
> **Commit**, and six tokens take damage. Two drop to zero and the shelf lights up with two amber
> `defeat_pending` chips awaiting his confirmation. One of the six is Ossa. The GM's stomach drops:
> he anchored the template one square too far east.
>
> In Foundry this is now six manual HP edits, an apology, and a table that saw the mistake.
>
> He presses **`Ctrl+Z`**.
>
> On every screen at the table — the GM's laptop, three browsers, one iPad — the six health bars
> run *backwards* over 280 ms. The two amber chips retract. The chat entries do not disappear; they
> grey and gain a strikethrough and a one-line reason field the GM types into: *"mis-anchored."*
> The fog that the blast had burned open re-closes. The initiative marker steps back one.
>
> Elapsed: four seconds. He re-anchors, commits, and the table plays on.
>
> The friend watching over his shoulder says the thing: **"Wait — you can *undo* a session?"**
>
> And then the GM shows the other direction. He opens the campaign wiki, finds the line on Vaugn's
> page that reads **`Faction: The Ashen Pact (contested)`**, and right-clicks it.
>
> A popover: *"Became true at **21:38, session 12, Beat 7** — Sela was told this by Vaugn under
> duress. Marked `told`, source `Vaugn`, contested since Beat 11 when the harbour ledger disagreed.
> **[Replay 18 s] · [Go to beat] · [Revert this]**"*
>
> He presses **Replay**. The Table zone plays eighteen seconds of the actual scene back: the tokens
> move as they moved, the roll ticks over, the reveal sweeps. Then it returns him to where he was.
>
> **"Wait — the *wiki* is version-controlled too?"**
>
> Same log. That was the whole trick.

### Why this is the reason the product exists

Because it is one architectural decision producing three capabilities the market has none of, and
because it works **in the first session**, not the fifteenth. It is not a feature that accrues; it
is a property of the substrate that is true on day one.

- **Rewind** — table-wide, multi-client, reversible state at Beat granularity.
- **Blame** — every number, fact, relationship, HP value and revealed secret resolves to the moment
  at the table it came from, in one gesture, with a derivation string.
- **Replay** — any Beat is a deterministic animation, because the log plus the pinned package
  version is a complete description of what happened.

### Why the incumbents cannot follow

Not because it is clever — because it is a **write-path** decision, and write paths are the one
thing a mature ecosystem cannot change.

- **Foundry** ships 5,338 approved modules, median user runs 19 of them (RB-01-foundry), and every
  one of them writes directly to mutable Documents. RB-05 records the decisive precedent: Foundry
  abandoned even the **PixiJS v7 → v8 renderer migration mid-cycle** because it would be "far more
  sweeping and disruptive than we had planned" for module authors, and publicly accepted the
  technical debt. If the *renderer* is unreplaceable because of the ecosystem, the *write path* is
  categorically harder. Their undo is per-action canvas history, not table state.
- **Roll20** is mid-rewrite of a renderer built on a decade-old engine "written in 3 or 4 different
  libraries with different coding styles" (RB-05). Jumpgate is a rendering project, not a data
  project.
- **Fantasy Grounds** carries XML/Lua rulesets with per-ruleset mutation semantics
  (RB-01-fantasy-grounds); an event-sourced core would break 50+ shipped systems and ~3,858 store
  products.
- **Owlbear** has nothing to rewind — no sheets, no rules, no state beyond tokens and fog, and a
  stated refusal to become a campaign manager (RB-01-owlbear).
- **Alchemy** and **TaleSpire** have no rules engine to speak of at all (RB-01-alchemy,
  RB-01-talespire: sheets and rules still deferred past 1.0 after ~5 years).

**Evidence honesty:** none of the six RB-01 briefs states "product X has no session-level undo" as
a positive finding — this is an absence-of-mention claim across six independent teardowns plus
RB-05's map teardown, which is strong but not primary-sourced. Before this appears in any marketing
copy, one person must sit in each of Foundry and Roll20 for an hour and try to undo a committed
attack. **[verify before quoting]**

### The two flexes that grow out of it, named now, shipped later

Because the same log powers them, and because an attacker should see the roadmap the substrate
implies rather than a surprise in round 3:

1. **The Live Ruling** (Act III/IV, and the go-to-market — §4, §9-E2). A ruling improvised at the
   table becomes a draft rule in the Forge, pre-filled with the expression the GM actually used and
   the number of times it fired.
2. **Improvised generation** (Act IV+, K5d). The party goes somewhere unmapped; the GM draws three
   boxes and gets a walled, lit, playable tiled room in seconds. RB-05 is explicit that generation
   must land *after* the renderer and wall model are stable, so it is not promised early here.

---

## 2. How the two halves fuse

Kaya's product is **Wiki/Fandom + PnP session**. The mechanism is not "the wiki links to the
session." It is: **there is one write path, and both halves are views of it.**

### The mechanism in one diagram

```text
                     ┌──────────────────────────────────────┐
   GM / player  ───► │  Intent (typed, validated, scoped)   │
   gesture           └──────────────────┬───────────────────┘
                                        │  server-authoritative
                        ┌───────────────▼────────────────┐
                        │  Preview  →  Commit  →  Beat   │   append-only, versioned,
                        │  (trace)     (human)   (log)   │   package-pinned
                        └───────────────┬────────────────┘
                                        │
                ┌───────────────────────┴───────────────────────┐
        read backwards                                   read forwards
                │                                               │
        ┌───────▼────────┐                            ┌─────────▼─────────┐
        │  THE TABLE     │                            │   THE RECORD      │
        │  live state    │                            │  entity pages,    │
        │  rewind, blame │                            │  links, grants,   │
        │  replay        │                            │  changelog, diff  │
        └────────────────┘                            └───────────────────┘
```

Both halves are **projections**. Neither is a document the other has to be kept in sync with. There
is no synchronisation problem because there is no second source.

### What each half gives the other — concretely

**Play → Record (five mechanical gifts, zero prose):**

| The bookkeeping GMs abandon | How the log carries it |
|---|---|
| Creating the page | A name that does not resolve becomes a **stub entity** the moment it is used as the object of a Beat. Typed, addressable, zero prose, one line: *"first seen S12 B4."* |
| Linking, in both directions | A Beat *is* an edge. Backlinks are not maintained; they are queried. |
| Dating it | Every Beat carries real timestamp **and** `in_world_date`. |
| Keeping the secret out of the players' copy | Every Beat carries a witness set → per-character `Grant`s → the player's page renders only what their character has. Server-side omission, not CSS. |
| Keeping it current | The page's "What happened" section *is* the filtered log. It cannot go stale; there is nothing to update. |

**Record → Play (the return path, which is where table-first earns the wiki half):**

Every entity in the record is a **live table object with one privileged verb**. The wiki is not a
reference you leave the table to consult; it is the source of the GM's fastest gestures:

- Any page, statblock, item or handout: **`Space` = put it on the table now** (spawn token, deal
  card, show handout).
- Any passage or typed fact: **`T` = tell** — drag onto a portrait or the whole party; emits a
  `told` grant with a source in one gesture, ~1.2 s.
- Any number on a sheet: **`?` = the derivation**, and each term in the derivation is a link into
  the record.
- Any entity: **`W` = who knows what** — GM truth on the left, one narrow column per character.

That is the fusion: **one object, two surfaces, one log between them.** A wiki-first product can
have the first direction bolted on. It cannot have the second without making the table the writer.

### Worked example — session 12, a real fifteen minutes

| Time | At the table | What the GM does | What the log does | What the record does |
|---|---|---|---|---|
| 21:31 | Party enters the salt-house | Strikes the Curtain on the scene | `SceneChange` | Location `Salt-house` is a stub already (it was named in S11 by a player); gains `visited S12`. |
| 21:36 | They corner Vaugn | Types "Vaugn" into the shelf; no match | `Mention → Stub(Vaugn, actor)` | Page exists. Infobox: *first seen S12 B4*. No prose. Nobody was asked to create anything. |
| 21:38 | Vaugn cracks under pressure and names the Ashen Pact — but he is lying about who runs it | Selects the passage, presses `T`, drags to Sela | `Grant(passage, holder=Sela, mode=told, source=Vaugn, beat=12/7)` | Vaugn's page: `Faction: The Ashen Pact`. Sela's book: one line, flagged `told · unverified`. Ossa's book: nothing — he was in the next room, and attendance is recorded, not guessed. |
| 21:44 | Combat. Fireball, mis-anchored | `Ctrl+Z`, reason "mis-anchored", re-commit | Beats 11–12 marked `reverted`, reason stored | Nothing propagates. The record never saw a fact it should not have. |
| 21:52 | The party finds the harbour ledger; it contradicts Vaugn | Presses `Refute` on the faction claim | `Refute(target=fact, by=beat)` | The claim's `standing` flips to `contested`. Sela's book still shows what she was told, now with a contested marker — which is the correct epistemic state, and the interesting one. |
| 22:10 | Session ends | Presses **End Session** | — | **Session Diff**: 3 stubs promoted, 1 relationship, 6 grants, 1 contested claim, 1 ruling that fired 3×, 1 `defeat_pending` resolved. Each line links to its beat. The GM presses `A` to accept all, renames one stub, and writes **two sentences of prose on Vaugn's page because he wants to.** Elapsed: 90 seconds. |

Next Tuesday, a player who missed session 12 opens Vaugn's page. Infobox, three linked beats each
with an 18-second replay, two sentences of GM prose, and a note that his own character knows none
of it. **That page cost zero minutes of maintenance and is a real wiki page.** Nothing on it was
invented by software.

### The honest boundary of the mechanism

The record contains what the *software saw*. It does not contain what was said aloud and never
touched. This is the candidate's hardest weakness, it is stated as W1 in §8, and it is bounded —
not solved — by three things: the reveal gestures being fast enough to actually use (measured, §7),
the end-of-session diff as the human checkpoint, and a UI rule that **absence is never rendered as
fact** — an empty "What happened" says *"nothing recorded"*, never *"nothing happened."*

---

## 3. The six zones under this thesis

The shell from [`03-triumph-ui-direction.md`](../../03-triumph-ui-direction.md) is adopted whole:
six zones, the independent axes (content × skin × role × workspace mode × accessibility), one Scene
with three render recipes, DOM authoritative with Pixi behind `MapRenderer`, the accessibility and
performance gates, the explicit non-goals. This candidate changes **which zone is home**, **what
each zone is for**, and makes **two declared deviations**.

**Session — promoted to the root route.**
Not a leaf of the world; the place the app opens. It is the transport deck of the table: tonight's
run sheet, the open threads pulled from the last Session Diff, the **Curtain Check** (a pre-session
lint: any `defeat_pending` left open, a character with no controller, a scene whose budget will
render at 20 fps on the weakest connected client, missing token art, a package upgrade pending —
one screen, green or not; RB-05 #10 as a shipped gate), and the live Beat tail with `Why?` on every
line. Prep is a queue inside Session, not a separate life.

**Story — becomes the Record.**
A timeline-first, event-sourced encyclopedia. Pages are **entity + typed fields + the filtered log +
optional prose**. Authoring exists and is welcome, but it is framed as *seeding*: a page written
before play is marked `unplayed` until a Beat touches it. Prose is a plain field with `[[link]]`
autocomplete, not a rich document model — a deliberate scope decision defended in §7. The Universe
layer from `02-domain-model` survives and is **earned**: facts are promoted to universe canon in the
Session Diff, so the shared world is sediment from play rather than a blank encyclopedia awaiting a
diligent GM.

**Cast — becomes the Green Room.**
Who is at the table tonight, in what state, controlled by whom. The compact play-glance is primary
(HP, conditions, `defeat_pending`, whose turn, what they know); the full sheet is a drill-down. The
relationship graph is **derived**: two characters who co-witnessed 40 beats are related, and the app
can say so with nobody maintaining a relationship table.

**Library — becomes the Prop Table.**
Templates, instances, inventories, cards, handouts, media — each with `Space` = put it on the table
now. Template ≠ instance stays absolute (invariant 3), and instances gain **provenance**: which beat
created this sword, whose hands it has passed through, what the party named it.

**Table — the default stage, always live.**
Three recipes as specified, selection preserved across recipe changes. Two table-first additions:
(a) **prep happens on the stage, backstage** — there is no separate scene editor; it is the same
stage with the Curtain down, and player clients receive nothing; (b) the stage carries the **rewind
scrubber**, which is the only new chrome this thesis adds to the map.

**Forge — the workshop, and the separable half.**
Theme Studio, visual rule/schema builder, formula/action graph, generators, package tests. Two
amendments: (a) every Forge artifact has **"Test at the table"** — spin a throwaway `GameSession`
with synthetic players and run it for real; a rule that cannot execute at a table is not finished;
(b) the Forge is fed by play — the rule-builder opens **pre-populated with the rulings this table
actually made** (§9-E2). Per RB-11 §5 the Forge stays **separable by architecture** (its own
package boundary, its own entry point, no dependency on a live session) so the Dungeon-Alchemist-
shaped SKU stays available without being scheduled.

### Two declared deviations from `03-triumph-ui-direction.md`

**D1 — The Session Shelf becomes a permanent Ledger Bar.**
03 says the Shelf is "visible during play, quieter during preparation." Under this thesis prep *is*
rehearsal on the live stage, so it is never quiet. The Shelf carries: session clock, Curtain state,
beat tail, dice, and the **transport controls — Preview · Commit · Undo · Rewind · Blame.** It is
the one element that never collapses, on any layout, in any zone, at any width. Justification: the
flex is a gesture, and a gesture that lives behind a menu is not a flex.

**D2 — A new value on the workspace-mode axis: `Curtain ∈ {Backstage | Live | Struck}`.**
Not a client toggle and not a seventh zone: a **server-authoritative property of the `GameSession`**
that gates what player clients are *sent*. Backstage material is omitted from the response, never
hidden in the DOM (invariant 1; the Triumph spike's own security note says exactly this is what the
spike does not prove). The Curtain is the most dangerous control in the product, so it is modelled
as data, audited, and covered by tests that fetch the raw API authenticated as a player.

### The amendments K1/K2/K3 require

- **K1 (themes).** Token-first, themes as data, the manifest of 03. GM sets the campaign skin;
  a user's accessibility overrides always win downward (a partial answer to K-Q2:
  campaign-scoped, with a user-scoped a11y override that beats it). The table-first twist:
  **skins react to beats** — `defeat_pending` dims the stage, a reveal sweeps light across the
  panel, a contested claim gets a hairline. K7's "game feel through staging" driven by the ledger
  rather than by hand-authored cues, and the cheapest cinematic win available.
- **K3 (motion).** Motion carries beat semantics, so it has a reason to exist: each beat type owns
  one transition from 03's tempo table (110–180 / 220–340 / 600–1000 ms). Nothing animated on the
  map hot path. Reduced motion replaces spatial travel with state change — **and the rewind is
  specified in both forms**, because the flex must not be gated on an animation an epileptic player
  has switched off.
- **K2 (rule-builder), sequenced honestly.** The engine is defined by what a beat needs to resolve;
  the builder edits structures the engine already executes. Order: dice + commit → resource and
  effect model → **rulings** (the cheap, in-play half, Act III) → schema forms → sheet layout →
  formula/action graph with live trace → package self-tests. Building the builder before the engine
  is a facade (intake tension #2) and this candidate will not pretend otherwise to win a round. The
  *rulings* stage is what makes the builder arrive early without being fake.

---

## 4. Reachability, priced

RB-11 §"Implications" 3: *answer reachability with a number, not a hope. A candidate that
hand-waves it should lose on that ground alone.* Here is the number and the failure modes.

### The v1 policy — three named paths, one default

| Path | Who it is for | v1 status |
|---|---|---|
| **1. Hosted room (default)** | Everyone. Join by link, no account, no install, iPads included. | **Ships in v1.** |
| **2. Desktop host, LAN** | The own-your-data GM; conventions; no-internet play. Electron app serves the client itself over plain HTTP on the LAN, so the page and the socket are **same-origin** and mixed content never arises. | **Ships in v1, with its degradation written on the tin.** |
| **3. Desktop host, remote players via our relay** | The self-hoster whose players are not in the room. The desktop app opens an **outbound** connection to our relay and receives an `https://room-xxxx.…` URL. No port forwarding, works behind CGNAT, GM keeps the data. | **Ships in v1.** |
| **4. Plex-pattern DNS zone + per-server wildcard PKI** | Direct browser→home-server TLS with no relay hop. | **Explicitly NOT in v1. Named as deferred, with its bill written down.** |

**Path 2's honest cost, stated because everyone else hides it:** `http://192.168.1.7:30000` is not
a secure context. That costs the service worker (no offline asset cache), WebGPU, and
`crypto.subtle`. WebGL2, the whole DOM product, and the full accessibility tree are unaffected. So
LAN play is real, and it is the reduced-graphics floor from 03's renderer boundary, and the app says
so in one sentence at connect time rather than failing mysteriously.

**Path 4's bill, so it cannot arrive by accident in month nine:** a DNS zone we operate forever, a
per-install enrolment/identity flow, a certificate issuance and rotation service, and the support
load Plex itself documented (they had to force *every* server onto HTTPS because mixed-content
blocking made HTTP servers unreachable, and reported difficulty finding one configuration that
satisfied all client types) — RB-10 §"Reachability". It is a service business, not a feature.

### The arithmetic

Per **4-hour session, one GM + four players**, with content-addressed assets, server-side re-encode
(WebP / KTX2, resolution tiers) and a client-side asset cache:

| Component | First session with a new scene set | Repeat session (cache warm) |
|---|---:|---:|
| State deltas (moves, rolls, chat, sheet edits), fanned to 5 clients | ~7 MB | ~7 MB |
| Media egress (3 scenes, tokens, portraits, handouts; ~30–50 MB × 5 clients) | ~150–250 MB | ~5–15 MB |
| Room compute | ~20 MB RAM, <1 % of a vCPU | same |

A weekly table over a year: ~8 distinct scene sets × 200 MB + ~42 warm sessions × 12 MB ≈
**2.0 GB egress per table-year.**

| Priced against | Cost / table-year | Cost / session-hour |
|---|---:|---:|
| Cloudflare R2 (zero egress fee) + a €5/mo Hetzner CX22 for rooms | ~€0.03 | ~€0.0002 |
| Worst case, metered CDN egress at €0.085/GB | ~€0.17 | ~€0.0009 |
| Path 3 (relay: ingress **and** egress) | ~€0.34 | ~€0.0017 |

Compute cross-check: a €5/month CX22 (2 vCPU / 4 GB) holds on the order of 100 concurrent live
rooms; at 100 tables × 50 sessions × 4 h that is 20,000 session-hours for €60/year ≈ **€0.003 per
session-hour**, which dominates the bandwidth line and is still nothing.

**Blended honest figure: ≈ €0.02–0.05 per four-hour session, ≈ €0.005–0.012 per session-hour.**
Against ~€23.50 net on a €30 one-time licence (RB-11), a weekly table costs us **€1–3 per year**;
we break even on hosting after roughly **8–20 years of weekly play**. Hosting does not sink the
one-time-licence model at this shape.

**Cross-check against the one real datum in the evidence base:** Owlbear Rodeo moves ~3 TB/month
with two people (RB-11). At 2 GB/table-year, 3 TB/month = 36 TB/year ≈ 18,000 active tables. That is
a plausible order of magnitude for their scale and their much heavier per-map bytes (144 MP
ceiling), so the model is not off by an order of magnitude in the optimistic direction.

### What breaks it, and the countermeasures that ship with v1

1. **Video/animated maps.** A 50 MB WebM × 5 clients × 6 scene changes = 1.5 GB in one session —
   **75× budget.** Countermeasures: hosted rooms re-encode and tier all uploads; animated backdrops
   count against a **2 GB per-campaign hosted-media quota** included with the licence; beyond that,
   the GM adds storage or hosts it themselves. This is Owlbear's rule and it is the right one —
   **charge for storage and rooms, never for features** (RB-11 decision 3; Roll20 charges for
   features and is the most complained-about product in the market).
2. **Voice/video.** Not ours. Discord is what tables use anyway (RB-01-foundry, RB-01-roll20,
   RB-01-owlbear all record it). Carrying A/V would multiply the bandwidth line by three orders of
   magnitude and we would be a telco.
3. **Abuse / open rooms.** Rooms are licence-bound, rate-limited and TTL'd; an unlicensed room
   cannot be created. The entitlement port (B4) is the chokepoint.

### What a non-technical GM behind CGNAT actually experiences

She buys once, opens the browser (or the desktop app), presses **"Host in the cloud"**, and copies a
link into Discord. Her players click it, type a name, and are approved. **She never meets the words
port, certificate, NAT or IP.** If she later wants her data on her own machine she installs the
desktop app, presses "Move this campaign here", and gets the same link — because path 3 is an
outbound connection, CGNAT is invisible. The only thing she loses is our uptime, and the only thing
she gains is sovereignty, and that is a sentence she can understand.

---

## 5. The differentiation ledger

A ledger with no losses is a lie. Every "they still do better" below is a real reason a table stays
where it is, and two of them are reasons *I* would stay.

### Foundry VTT

- **We do, they cannot:** table-wide rewind, blame on any fact, and beat replay — structurally
  blocked for them by 5,338 modules writing to mutable Documents, with the abandoned PixiJS v7→v8
  migration as the documented precedent (RB-05, RB-01-foundry). Declarative versioned packages
  immune to the churn that left **only 1,590 of 5,338 modules V14-compatible one month after
  release**. A first-party no-code builder against JavaScript + Handlebars system development.
  Accessibility as architecture against **open core issues for high-contrast text and an
  accessibility mode**, patched by community modules. Per-character knowledge with provenance
  against a per-user ownership boolean on a journal page.
- **They still do better — honestly:** dynamic lighting, walls (6 types × 4 perception channels ×
  five modes, directional walls, attenuation), vision, Scene Levels elevation and Regions V2 with
  attachable behaviors are best-in-class and the single most-cited "wow" (RB-05). 475 systems, 2,138
  premium packages, a marketplace that went 557 → 1,227 products in a year. Total data ownership at
  $50 once, which anchors the entire market's price expectations. **For a 5e tactical table playing
  tonight, Foundry beats our first slice outright and will beat us on the map for years.**

### Roll20

- **We do, they cannot:** portability — they have **no campaign export**, unreliable character
  transfer, and have declined custom-content export citing security/copyright (RB-01-roll20); our
  `.chronicle` bundle round-trips a whole campaign (B6). Any user theming at all. A no-code builder
  against HTML/CSS/sheetworkers "that cannot properly be tested outside Roll20", with custom sheets
  Pro-gated. A serious accessibility posture against years of documented screen-reader hostility and
  no public conformance statement. Per-player *and* shared fog as a core, mid-session-switchable
  choice, against Explorer Mode's shared reveal that users say has "no way to turn this back"
  (RB-05).
- **They still do better:** ~10M registered accounts and the **LFG directory network effect** —
  "most games are found on Roll20" is a moat we cannot build and should not pretend to attack.
  Licensed compendiums plus the Demiplane integration. And the plain fact that everybody already has
  an account, which is worth more than any feature we can ship in year one.

### Fantasy Grounds

- **We do, they cannot:** browser play at all (desktop-only Unity). Any accessibility story — they
  have none documented, and a Unity custom UI is structurally opaque to assistive tech. No-code
  system authoring against **XML + Lua edited in Notepad++**, with the paid third-party Ruleset
  Wizard as the low-code ceiling. A modern shell against MDI window soup, radial menus and coded
  effect strings like `DMG: 1d6 fire`.
- **They still do better:** the deepest native per-ruleset automation in the market — *"as a DM you
  spend pretty much no time on math."* ~3,858 licensed store products and a buy-a-module-and-run-it
  prep economy we cannot legally or economically match. **Free since 2025-11-08.** And — the part
  that stings for §4 — **SmiteWorks' cloud relay already solves reachability for them, for free, and
  has for years.** For a table on one of their ~50 licensed systems, we lose.

### Owlbear Rodeo

- **We do, they cannot:** everything above the map. No character sheets, no rules layer, no
  journals/quests/wiki first-party, and a stated intention never to become a campaign manager
  (RB-01-owlbear). Nothing accretes there, by design. Plus self-hosting (2.x is closed SaaS; only
  the deprecated 1.0 is source-available and non-commercial) and theming (none beyond paid room
  backgrounds).
- **They still do better:** **onboarding — they are the market benchmark**, ~20 minutes to a running
  game, players in seconds with no account. Renderer engineering: Warp Core's tiled streaming,
  spatial indexing, GPU instancing, GPU dynamic fog, **a 137-megapixel map on an iPhone 14 Pro Max**,
  and the cleanest quality/performance UX decision anyone has shipped (`sourceRadius === 0` → fast
  path, many more lights). Forecast, their one-click CV auto-fog. Touch and mobile as a *tested*
  target. **Our v1 renderer will not beat Warp Core, and I will not claim it will.** We aim at parity
  of feel and win above the map.

### Alchemy RPG

- **We do, they cannot:** self-hosting, portability beyond JSON character export, an API or mod
  surface at all. Tactical play — they have fog of war but **no dynamic lighting, no measurement, no
  AoE** (RB-01-alchemy, RB-05). Accessibility: motion-heavy presentation, documented
  dyslexia/readability complaints, no a11y statement, no reduced-motion option found. First-class
  homebrew — their licensed universes shine and custom campaigns are reported "quirky". And the
  entire ledger.
- **They still do better:** presentation. Widely ranked the best-looking VTT; scene-as-mood is a
  validated idea we are stealing as a *mode*. Built-in voice/video, a native Streamer Mode, 125+
  licensed system integrations. And **their Sheet Builder is a shipped, GUI, no-code product in open
  beta while ours is a plan.** On K2 — the axis RB-11 calls our go-to-market — they are ahead of us
  today. That is the honest sting in this ledger.

### TaleSpire

- **We do, they cannot:** sheets and rules — **neither exists after ~5 years of Early Access and
  both are deferred past 1.0**. Journals, quests, handouts: essentially absent. Theming: the fixed
  aesthetic *is* the product and they refuse plain tokens on principle. Accessibility: unaddressed,
  3D camera as the sole modality. Localisation: English only, which matters for a German-market
  product. Browser and tablet play. Self-hosting.
- **They still do better:** the gasp. A coherent toy-diorama look, 90 % positive across 4,300+ Steam
  reviews, persistent boards, real elevation for free, HeroForge minis, and the seats/guest
  generosity that shaped what players expect about who pays. **Nothing we ship in 2D will produce
  the same first-look reaction.** We stop trying to and win on the second look — which is a strategic
  weakness (§8, W4), not a clever framing.

### The uncontested square

RB-05: *"nobody owns the whole map stack."* The sharper version for this candidate: **nobody owns
the write path.** Six products, six variations of "mutate a row and log it afterwards," zero
event-sourced tables. That is the square, and it is not defended because nobody who could take it
can afford to.

---

## 6. The data shape

`02-domain-model.md` is adopted, **including all six of Apollon's refinements** — Actor as the
aggregate with a `CharacterProfile` extension, `RulePackageInstallation` as its own table, the
`KnowledgeEntry` scope rule as a `CHECK` constraint, the primitive-to-persistence mapping table
owned by Kalliope, `AuditEntry` append-only, and the silent personal universe — and its three
amendments (timelines deferred to a nullable column, Universe invisible until earned, the
two-dimensional permission matrix treated as a first-class threat surface).

This thesis makes **four changes** and adds **four tables**.

### Change 1 — `AuditEntry` is promoted to `Beat`, and becomes the only write path

02's refinement 5 already says `AuditEntry` is "the substrate for undo, so it is a first-class
table, not logging." This candidate takes that one step further and accepts the consequences out
loud: **there is no second write path.** Every mutation is a committed beat.

```text
Beats (id, game_session_id, campaign_id, seq, type, actor_ids[], object_refs[],
       scene_id, real_ts, in_world_date, witness_character_ids[], witness_user_ids[],
       payload jsonb, package_id, package_version, schema_version,
       parent_beat_id, status: proposed | committed | reverted | amended,
       reverted_by_beat_id, reason)
```

- Append-only. Corrections are new beats; nothing is ever mutated or deleted.
- `parent_beat_id` carries the **proposal → commit** chain.
- Every beat records the rule package **id and version** that produced it — 02's rule, now
  non-negotiable, because replay across a package upgrade is otherwise undefined (and B3's
  vendor-on-first-use makes the pin real).
- **Projection snapshots** are a separate, disposable table keyed by `(campaign_id, up_to_seq)`.
  They are cache, never truth, and can be dropped and rebuilt. This is the cost admitted in W2.

### Change 2 — `defeat_pending` stops being a special case

Invariant 4 is not an exception; it is the engine's default shape. Every consequential outcome is
`Proposal → (trace shown) → Commit`. `defeat_pending` is simply the outcome proposal a GM has not
confirmed. This unifies the combat console's preview/commit/undo, the Session Diff's
accept/discard, and Rewind into **one mechanism with one test suite**, which is the largest
architectural saving in the candidate.

### Change 3 — knowledge splits into container and atom

```text
Claims  (id, universe_id, campaign_id?, entry_id, subject_ref, predicate,
         object_ref | literal, source_beat_id, in_world_date,
         standing: open | contested | refuted,
         canon_status: proposed | campaign_canon | universe_canon | retconned,
         created_by: projection | gm)

Grants  (id, claim_id | passage_id, holder_ref (character | actor | audience),
         acquired_at_beat_id, mode: witnessed | told | read | inferred | gm_fiat,
         source_ref)
```text

`KnowledgeEntry` survives exactly as 02 defines it — scoped by `universe_id` + `campaign_id`, with
`parent_entry_id` for non-destructive campaign-local extension, and the `CHECK (universe_id IS NOT
NULL)` constraint. It becomes **the page**; Claims are its typed contents; prose is a field on it.
Universe promotion is a `canon_status` transition made in the Session Diff, which keeps 02's "sixth
differentiation axis" alive under a table-first thesis instead of discarding it.

Two deliberate omissions, both of which an attacker should check:
- **No `confidence` field.** A deterministic process cannot fill it. `mode` and `standing` are
  facts about the gesture and about the world; a confidence score would be a number we invent.
  A field a deterministic process cannot fill is deleted, not defaulted.
- **No generated prose column.** Ever. §0.

### Change 4 — three presence concepts are separated by name

In the spirit of `AuthSession ≠ GameSession`, binding from day one, into Kalliope's glossary before
any code exists:

| Concept | Table | Means |
|---|---|---|
| **Control** | `CharacterControllers` (02, unchanged, now keyed on `actor_id`) | who may act as this character |
| **Attendance** | `SessionAttendance (game_session_id, user_id?, actor_id?, joined_at, left_at)` | who was *at* this session — users and characters recorded separately, because a PC can be present while its player is not |
| **Connection** | ephemeral, never persisted | who has a socket open right now |

Conflate these three and the witness set is wrong, which makes the Grants wrong, which makes the
per-character wiki wrong. That is why they are three tables' worth of distinction and not one
boolean.

### Added: `Rulings` — the go-to-market table

```text
Rulings (id, campaign_id, name, scope_ref, trigger, expression_ast, created_at_beat_id,
         fire_count, last_fired_beat_id, promoted_to_package_id?, status)
```

A ruling is a GM's in-play declarative modifier: named, scoped, expressed in the same closed AST
the rule engine already evaluates, and **counted**. It costs one small form at the table and it is
the seed corn of §9-E2.

### What does not change

`User → UniverseMembership → Universe → Campaign → GameSession`. Roles on memberships, never on the
user. Actor as the aggregate. `ItemTemplate ≠ ItemInstance` (instances additionally gain
`origin_beat_id`, which is provenance for free). `Campaign.universe_id` nullable with a silent
personal universe and the word "Universe" absent from first run. `RulePackageInstallation` as its
own table with install date, activation state, migration status and validation report.

### The permission surface, stated as the threat it is

02 flags a two-dimensional matrix (universe role × campaign role × entry visibility). This candidate
adds a **third dimension: per-grant, per-character claim visibility.** Every search snippet,
backlink, autocomplete, "mentioned in" list, recap, replay, export and the Session Diff itself must
filter on all three **server-side, omitting** unauthorised records rather than hiding them. The
Triumph spike's own security note says this is precisely what it does not prove. **This is the
largest single risk in the candidate.** It is addressed by a differential test that is written
before the UI (§7) and it is Athena's first target.

---

## 7. The first slice

**"One encounter, rewound."** One coherent workflow: five humans, one map, one fight, one mistake,
one undo, one session page nobody typed. It is small, it ships the flex on day one, and the cuts
below are the point.

The previous instinct for a table-first candidate is to cut the map because Foundry owns lighting.
That is a mistake and this candidate refuses it: **a table-first product whose first artifact has no
table is incoherent**, and Kaya's sentence says *Foundry-grade live table*. So the map is in, and the
*hard* half of the map (dynamic lighting, wall authoring, generation) is out.

### In

1. **One campaign, one session.** GM + up to four players joining **by link** — display name + GM
   approval, no player account (Owlbear's pattern, RB-01-owlbear). Hosted room only in slice 1.
2. **Table zone, Tactical recipe + Outline recipe.** Static uploaded map, grid, tokens, drag/snap,
   **manual reveal-brush fog with per-player and shared modes** (RB-05 #3's uncontested demand —
   the shared/per-player switch, not the lighting). Outline ships in the same slice because
   accessibility is architecture and outlining a small scene is cheap.
3. **UVTT / `.dd2vtt` import** — walls, doors, windows, lights, grid alignment, lossless, GM-visible.
   RB-05 rates this **S (days)** and says *"no VTT does it well natively."* Walls arrive as data
   rather than as an authoring tool, which is how a small team gets Foundry-shaped scenes without
   building Foundry's editor. Wall *authoring* is out; wall *rendering and blocking* is in.
4. **Initiative and turn order**, with the turn as a beat.
5. **The action pipeline**: preview → trace → commit → beat, over a tiny declarative demo package
   (attack, damage, resource, condition). `defeat_pending` at ≤0 (invariant 4). `?` on any number
   shows its derivation (invariant 6).
6. **The flex, whole:** `Ctrl+Z` / rewind scrubber across all table state on all clients, with a
   mandatory reason field; `Blame` on any number or claim; `Replay` of any beat. Both a motion form
   and a reduced-motion form.
7. **The Record, in its structured form only:** stub-on-mention, entity pages with typed infobox +
   filtered "What happened" + automatic backlinks + **one plain-text prose field with `[[ ]]`
   autocomplete.** Reveal gestures `T` (tell) and `W` (who knows what).
8. **End Session → Session Diff**, keyboard accept/edit/discard, producing a session page and
   updated entity pages. **No AI anywhere in slice 1** — invariant 5 satisfied by having no provider.
9. **Server-authoritative omission, proved before the UI exists:** a raw API fetch authenticated as
   player B must not contain a claim B has no grant for. Differential test at 8 characters × 40
   claims × 3 states × 2 locales.
10. **One Crafted skin + Clean**, high contrast, reduced motion, automated contrast gate, full
    keyboard operation, NVDA/Firefox and VoiceOver/Safari passes, `axe-core` in CI.
11. **`.chronicle` export** that round-trips this campaign with zero Steam involvement (B6).

### Out — and why each cut survives

| Cut | Why |
|---|---|
| **Dynamic lighting, LOS, wall authoring tools** | Foundry owns the semantics and Owlbear owns the renderer (RB-05); we lose both in v1. UVTT import gives us their *output* for days of work instead of months. |
| Rich-text editing of any kind | A block/AST document editor with a cursor in it is a multi-month project and the single most under-priced item any VTT design makes. Slice 1 ships a `textarea` with link autocomplete and is honest about it. |
| The visual rule-builder (K2) | Act III/IV. Building the builder before the engine is a facade (intake tension #2). The **rulings** half arrives first because it is small and it is the seed. |
| Theme Studio (K1 editor) | Two shipped skins prove themes are data. The editor is Act II. |
| WFC generation (K5d) | RB-05's own sequencing: generation lands after the renderer and wall model are stable, because generation only impresses if the result is immediately playable. |
| Character sheets beyond the demo package | Sheets need the engine; the engine needs the beat model. |
| The Universe layer's UI | Silent personal universe. Promotion-to-canon surfaces when a second campaign exists. |
| The Electron shell | Slice 1 is browser + hosted room. The shell is **launch-blocking, not slice-1-blocking** — and spikes **S5** (NVDA survives the wrapper) and **S6** (measured install size and idle RAM) run *during* round 1, per RB-11 §5, because the shell is load-bearing for self-hosting. |
| AI, voice/video, mobile polish, Cinematic recipe | Later, and all four are cheap once the substrate exists. |

### Launch-blocking, distinct from slice-1-blocking

Stated separately so nobody confuses the two, and because RB-11 makes two of them non-negotiable:

- **UVTT import** (in slice 1) **plus Foundry / Roll20 / Fantasy-Grounds-shaped export.** RB-11 §3:
  *"UVTT + Foundry/Roll20/FG-shaped export ships at LAUNCH, not in a late phase."* Dungeon Alchemist
  reached the whole market by exporting to its rivals. A GM must be able to try us **beside** their
  incumbent, not instead of it.
- **The visual rule-builder**, at least through schema forms + sheet layout + the rulings promotion
  path. RB-11 §"Consequence for K4": discovery runs through creators and system authors, so the
  builder *is* the go-to-market, not a flagship feature.
- **The Electron desktop host** — it is the self-hosting invariant's implementation, not a Steam
  concession.
- **The three exit gates** (§7 below).

### The three exit gates — falsifiable, with stopwatches

1. **Labour gate.** The client instruments the GM's own typing across one real four-hour session.
   **Green at ≤ 4 minutes of total typing and no single input interaction over 12 seconds.** If a
   table-first product costs the GM more keystrokes than a notebook, the thesis is false and the
   gate says so before marketing does.
2. **Rewind gate.** In a live session with five connected clients, a committed multi-target action
   is reverted end-to-end — all clients converged, audit intact, no orphaned state — **in under
   1.5 s wall-clock**, and a reconnecting client rebuilds correct state from the log.
3. **Leak gate.** The differential permission test green at 8 × 40 × 3 × 2, plus one adversarial
   human hour against search, backlinks, autocomplete, replay and export.

### Exit criterion

Kaya runs one real session with real humans. Somebody makes a mistake, and the mistake costs four
seconds instead of four minutes. At 23:50 the GM presses End Session, spends ninety seconds in the
Session Diff, and closes the laptop on entity pages nobody typed. If that does not happen, the slice
failed regardless of what tests are green.

---

## 8. Weaknesses

Real ones. The attack pass is coming; hiding them wastes it. **W2 is the one I cannot fix.**

**W1 — The record contains what the software saw, not what the table knows.**
The GM narrates a betrayal aloud and touches nothing; the ledger is silent, and confidently so. The
failure mode is *silent*: a GM who trusts the record will contradict their own table, which is worse
than having no record. Table-first makes this worse than wiki-first would, because we explicitly
tell the GM to type less. Every fix costs the thesis something — tagging every utterance is the
labour we promised to abolish; voice capture puts an AI on the critical path (invariant 5) and is a
privacy problem in the EU. Bounded, not solved, by: gestures fast enough to actually use (measured
by the labour gate), the Session Diff as the human checkpoint, and the UI rule that absence renders
as *"nothing recorded"* and never as *"nothing happened."*

**W2 — HARD, and the one I have no clean answer to: append-only meets the right to erasure.**
A German product whose spine is an immutable log has to answer "delete my account and my data." A
player's display name, their prose, their chat lines and their user id are smeared across every beat
they touched, and beats are the substrate of undo, replay, projection and export. The known
technique is **crypto-shredding** — encrypt user-attributable payload fields under a per-user key
and destroy the key on erasure — but it has three consequences we would carry forever: projections
built before the shred are no longer reproducible; `.chronicle` export bundles become partially
opaque and their round-trip test needs a shredded-data case; and replay of an old beat renders holes
that the UI must present honestly rather than as corruption. There is also an unresolved question of
whether a *GM's* campaign record can be partially erased at a *player's* request without destroying
another data subject's work, which is a legal question, not a design one **[legal — needs counsel]**.
This must be designed before the first schema lands, it is Athena's beat, and no other candidate in
this round is forced to answer it — which is a cost of the thesis, not an accident.

**W3 — Event sourcing is a permanent tax on every future feature, paid by a solo stakeholder.**
Every feature must emit correct beats; every beat must stay replayable across schema migrations and
package upgrades; every read is a fold, so snapshots exist, so two representations exist, so the
classic event-sourcing bug arrives — *the sheet says 14 and the wiki says 12.* Rewind and amend must
recompute downstream grants. Hephaistos must price this honestly against a CRUD baseline, and
Nemesis should ask precisely what happens when a package upgrade makes an old beat unreplayable.
My own estimate: **+25–40 % on the core-domain slices, roughly neutral thereafter**, and I do not
have evidence for that number — it is judgement, and it should be spiked, not believed.

**W4 — The flex is a motion, and the market's currency is a still image.**
Rewind dies in a screenshot. RB-08's clearest commercial finding is that **Dungeon Alchemist —
single-user, screenshottable — raised €2.46 M from 57,209 backers** while TaleSpire, a venue, raised
~$400 k; TaleSpire and Sigil set the visual bar our K3 claim gets measured against. Slice 1 has one
skin, static maps and no lighting. We are betting a 12-second clip beats a lit dungeon on a store
page, and on a store page it does not. Partially answered by §9-E1 (making the clip a first-class
export), which is a mitigation and not a refutation.

**W5 — Rewind is socially harder than it is technically.**
Undoing damage is clean. Undoing "the NPC told you the password" is not — the humans still know. The
gesture invites GMs to reach further back than the software can honestly restore, and the first time
a GM rewinds twenty minutes and the table argues about what is now true, the feature becomes a
liability. Mitigation: rewind is **bounded to the current beat by default**, cross-beat reverts
require explicit confirmation naming what cannot be un-known, and reverted beats stay visible as
struck-through history rather than vanishing. That makes the demo less magical than the pitch.

**W6 — Reachability is an operations contract with no end date.**
§4's numbers are small, but they are per-table-forever against a one-time licence. The quota
discipline is the only thing standing between us and Let's Role's failure shape, and quota
enforcement is precisely the kind of thing a solo team defers. If animated maps become popular, the
model moves by 10–50× and the fix is a conversation with customers, not a code change.

**W7 — 95 % of wall-clock time is between sessions, and this product is quietest then.**
We optimise the 3½ hours a week we unambiguously win and have less to say about the other 164½ when
a GM might form a habit. Foundry shares this problem; a wiki-first product does not. Our answer —
the Forge and the rulings loop — is real but arrives in Act III.

**W8 — On K2 we are behind today.**
Alchemy's Sheet Builder is shipped and in open beta with a concrete, validated block taxonomy
(RB-01-alchemy). RB-11 says the visual rule-builder is our go-to-market. Our builder is a plan whose
first honest stage is Act III. If Alchemy ships a working System Builder before we ship ours, the
axis RB-11 told us to win is contested by a product that already looks better than we do.

---

## 9. Creative extensions

Three things nobody asked for that this thesis makes cheap, and that no competitor can copy without
first becoming event-sourced.

### E1 — The Beat Clip: our marketing unit is 18 seconds, not a screenshot

A beat is a complete, deterministic description of a moment, so it can be rendered without a
recorder. Press **Export clip** on any beat and get an 18-second WebM in the campaign's skin: the
tokens move as they moved, the roll ticks, the fog opens, the trace annotates itself, secrets
filtered to a chosen audience. Uses, in ascending order of value:

- **The recap.** Next session opens by playing back last session's five highest-weight beats
  instead of five minutes of the GM talking. Spoiler-correct per viewer, because grants are per
  character — which no recap in the market is.
- **The absent player.** Someone who missed session 12 watches their party's four minutes, filtered
  to what their character could know.
- **The answer to W4.** A table's best moment becomes a clip they post in their own Discord, with
  our skin on it. RB-11 is explicit that under a direct channel **discovery runs through creators**;
  a clip is the only artifact a table produces spontaneously, and we would be the only VTT that
  emits one. Owlbear cannot: there is no log. Foundry cannot: the state is mutable and unreplayable.

### E2 — Rulings become the system: the rule-builder is fed by play

Every improvised ruling is stored with its expression, its scope and its **fire count** (§6). After
twenty sessions the Forge does not open on a blank IDE — it opens on *this table's actual house
rules*, sorted by how often they fired, each one two clicks from becoming a versioned declarative
rule in the campaign's package, with a migration note and a dry-run. Press publish and the table's
homebrew is a real package in our registry (B2).

Three consequences, and the third is the strategic one:

1. **The builder's cold-start problem disappears.** Nobody faces an empty formula graph; they face
   an inbox of things they already decided.
2. **The invariant is preserved by construction:** a ruling is written in the same closed AST the
   engine already evaluates, so promotion adds no expressive power and no code-execution escape
   hatch (invariant 2).
3. **A system's popularity becomes measurable in fired rulings**, which is a registry ranking signal
   no competitor can compute and which cannot be gamed by downloads. Foundry reached 475 systems
   because it had system authors (RB-01-foundry, RB-11); we would reach them by turning ordinary
   GMs into system authors without their noticing they had become one. **This, not the map, is the
   growth engine.**

### E3 — Table telemetry: true things about your own table, counted, never judged

Ten sessions in, the log knows things no GM has ever been able to see about themselves, and every
one of them is arithmetic — no AI, no scoring, no advice:

> *Your combats average 47 minutes and 6.2 rounds. Session 11 was 71 % combat; sessions 1–10
> averaged 34 %. Ossa has spoken in 4 of the last 30 scenes. The longest single pause was 9 minutes
> during the market. Three of five players have never used their character's second ability. Two
> plot threads have been open for eleven sessions.*

GMs have wanted this forever and have had literally no way to get it. It is Strava for running a
table. It is also the most privacy-sensitive thing in the product, so the stance ships with it and
is non-negotiable: **GM-only, campaign-local, computed client-side or on the GM's own host,
off by default, never aggregated across tables, never sold, and per-player visibility of one's own
numbers is a player's own choice.** A product that records a table owes the table that sentence in
writing.

*(A fourth, listed without elaboration because it is a consequence rather than an idea: because
several campaigns can share a Universe and all of them are beat streams, the Universe can eventually
say things nobody recorded — "in three of your campaigns someone has burned down the Gilded Eel";
"no party has ever gone north." That is the retention mechanic `02-domain-model` was reaching for,
arrived at from the table side.)*

---

## 10. RB-11 compliance

### The eight boundaries (B1–B8) — named seams, with adapters

| # | Boundary | This candidate's seam | Adapters |
|---|---|---|---|
| **B1** | `Platform` port | `@chronicle/platform` — `openFile` · `saveFile` · `pickFolder` · `hostSession` · `discoverLAN` · `openExternal` · `social`. Domain code never touches a path, a port or a shell. | `platform-browser` (slice 1), `platform-electron` (launch) |
| **B2** | Package registry contract | `@chronicle/registry` — our id scheme, semver, `engine: ">=2.1 <3"` ranges, required/optional dependency split, content hashing, schema validation, resource budgets. | `.chronicle-pkg` zip (first), web registry (second), `ISteamUGC` / mod.io (only ever behind the port) |
| **B3** | Vendor-on-first-use, content-addressed | A resolved package is copied into the campaign and hashed; `RulePackageInstallation` holds the pin. Upgrades are explicit, diffable, undoable GM actions with declarative migrations. **A live session's pin cannot be replaced by an external updater** — and here it is load-bearing twice, because replay across an unpinned package upgrade is undefined. | — |
| **B4** | Entitlement port | `hasLicence()` — one seam, one chokepoint (it is also the room-creation gate, §4). | direct licence key, hosted account, Steam ownership |
| **B5** | Session transport port | `@chronicle/transport` — beats in, beats out, resume-from-seq. WebSocket now. **No SDR-only assumption ever enters domain code.** | WebSocket, relay, WebRTC, (SDR) |
| **B6** | `.chronicle` export bundle | Round-trips a full campaign — beats, projections, packages as `{sourceId, version, sha256}` references, assets by content hash — **with zero Steam involvement.** In slice 1, and its round-trip is a CI test. | — |
| **B7** | One repo, one build, two artefacts | Web bundle and Electron artefacts from one pipeline. **No SteamPipe/depot step in CI until the gate is passed.** | — |
| **B8** | Governance: no feature ships desktop-only without a declared, designed browser fallback | Enforced in review, and §4 path 2's degradation is the template for how a fallback is *declared* rather than discovered. | — |

### Theme and skin production budget (RB-11 §6)

First-party for launch; community-supplied through **our own registry (B2)**; Workshop only ever as
a mirror. Concretely: **two kits at slice 1** (one Crafted, one Clean) and **four at launch**
(Fantasy, Cyberpunk/Signal, Archive, PixelArt — K1's named list, minus one, honestly), each
commissioned under the Tier-0 rights contract of 03 (redistribution, export and sublicensing rights,
SPDX id, author, source, checksum, `derived_from`), with audited CC0 defaults where they fit
(RB-04). **Kaya funds these directly. There is no storefront ecosystem arriving to do it for us**,
and a skin kit is the one thing in this document that no amount of architecture makes cheaper.

### The named attack targets, pre-answered where I can

| Target (RB-11 §7) | This candidate's answer |
|---|---|
| **GM-machine-as-server trust model** | §4 paths 2 and 3; the desktop host binds a socket, so it carries authn/authz, session tokens, rate limiting, request validation and a patch cadence. Athena owns it. Untrusted input now includes the network. |
| **Package format's freedom from a code-execution escape hatch** | Closed AST, declarative only. No embedded HTML/JS/Lua, no scripted SVG, no arbitrary URL fetch from package data, no shell-out, no dynamic asset loading by path. Rulings (§9-E2) are written in the *same* AST, so the go-to-market feature adds no expressive power. |
| **Browser/desktop parity (B8)** | §4 path 2's degradation is declared and displayed. The rewind, blame and replay flex is DOM+state, not GPU, so it is identical on both. |
| **A live session's package-version pin (B3)** | Pinned on `RulePackageInstallation`, content-addressed, and doubly load-bearing here because replay depends on it. Nemesis should try to upgrade a package mid-session and then rewind across the boundary — that is the sharpest attack available against this candidate and I want it run. |
| **Full campaign round-trip via export, zero Steam** | B6, in slice 1, as a CI test, including the shredded-data case from W2. |

---

## Closing statement of the bet

Candidate A bets that the durable world is the product and that GMs will maintain it if the tools
are good enough. This candidate bets that **the table is the only place a campaign is ever
completely true**, and that a product which records the table properly gets three things nobody else
can have: a session you can rewind, a fact you can blame, and a wiki whose entire mechanical burden
is already paid.

It does not claim the wiki writes your prose. It claims the prose is the only part left.

> *Was am Tisch geschah, steht schon geschrieben —*
> *dir bleibt der Satz, und uns die Ordnung.*
