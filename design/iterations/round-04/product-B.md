# Die erste Minute (the world arrives already lived-in) — Product Candidate B, Round 4

> **Thesis, one line:** *Der Kanon ist der Bodensatz des Abends — und der erste Bodensatz kann
> ehrlich mitgeliefert werden.* The champion sells the residue of forty evenings and asks the buyer
> to wait four Saturdays for the first four. **We manufacture the first four legitimately: the
> tradeable unit becomes a *played* Anlass — a seed plus one real table's evening, shipped with its
> real Belege, its real Augenblicke and its real per-character books — and every sentence in it is
> stamped with whose evening it was.**

Evolution of [`CHAMPION.md`](../CHAMPION.md) v4 (*Der Abend*), attacking unresolved items **5**
(*minute one, still*), **4** (*Fandom-grade at scale*) and — obliquely but hardest — the round-3
verdict's §6 finding that *nothing was built*, by making the champion's own **gate zero produce a
shippable artefact instead of only a number**. Everything in the champion is carried unless this
document changes it. Where it changes something, it says so and says what it costs.

---

## 1. What this optimises for, at the cost of what

**Optimised for: minute one for the evaluator and the migrant, and the creator channel RB-11
ratified.** A solo GM on a Tuesday, alone, no account, no friends online, no map to prepare, opens a
campaign that is already amber. Ninety seconds later she has opened a footnote into a die roll, run
that roll again herself, watched a board appear at 21:14:38 on somebody else's June, and minted one
paragraph of her own that the page renders differently from the other twenty-five. Optimised, second,
for the **system author**: her rule package now ships with a runnable proof — an evening in which her
clauses actually fired — which is the difference between publishing a library and publishing a
library with an example. RB-11 §"Implications" made creators the discovery channel; this candidate
gives them a unit to distribute.

**At the cost of, stated as costs:**

- **A second content pipeline, before revenue, on a solo stakeholder's calendar.** Four launch
  Anlässe ≈ **12–16 person-days plus four four-hour evenings with three other humans**, plus
  licensing paperwork and per-participant consent. §9.1. It lands in exactly the weeks the champion's
  tactical half is still unspiked (champion §15.1), and nothing in this candidate makes that better.
- **It does not buy minute one for the greenfield GM.** It buys it for the *evaluator* (she opens
  ours), for the *migrant* (her Foundry world arrives as 1,106 `mitgebracht` passages, honestly grey),
  and for the *table that starts on a bought Anlass*. **A GM inventing her own world from nothing still
  waits four Saturdays for her own amber.** Champion §15.9 is narrowed, not repealed, and the
  narrowing is the whole claim.
- **The honest label may lose the sale.** The first sentence of our flex is *„0 Absätze an diesem
  Tisch."* We are betting an evaluator reads that as integrity and not as *"the demo is fake."* We have
  **zero evidence** for that bet. §10.4 makes it a gate with a red condition.
- **A second package format on the security surface**, carrying more content types than anything we
  had planned — text, geometry, rasters, revelations and a rule package in one artefact — against
  RB-11's named attack target *"the package format's freedom from any code-execution escape hatch."*
  §8.5 closes it; §10.6 prices the residue.
- **A durable, citable `Wurf` naming a real person now ships to strangers.** Champion §15.7's
  unresolved right-to-erasure collision gets materially worse. §10.3. **This is the genuinely hard
  weakness and it is not solved here.**

**What it explicitly does not do:** it does not re-open the runtime (RB-11 is ratified: React/TS +
PixiJS, DOM-authoritative, Electron shell, one-time GM licence, players always free, Steam gated). It
does not make the world *playable between Saturdays* — that is the rival's bet, and it is the bet this
one is not making. Where the rival buys the six off-days by making availability mandatory, this
candidate buys **the ninety seconds before anyone has agreed to play at all**, and it needs nothing
awake to do it: **the first minute is one person, one browser, one hosted room, no second client, no
NAT traversal and no certificate.** §7.3 turns that into the only reachability number in the round
that goes *down*.

---

## 2. The flex — „Rechne es nach."

Kaya has had the product open for four minutes. She has typed nothing. Timo is looking over her
shoulder at **Haus Vharon**: a crest infobox with ten rows, five sections, twenty-two paragraphs of
real prose, blue links, one red link inside the infobox (*„Kanzlei: Ossa (kein Eintrag)"*), three
plates with captions, *Siehe auch*.

> **Timo:** *„Das hast du alles geschrieben?"*
> **Kaya:** *„Nichts davon."*

**Beat one — die Herkunftsschicht, and it indicts itself.** She presses the provenance toggle. The
page does not change shape (gate „Der Streifen", champion §6.10, unchanged). A gutter opens and every
paragraph gains a chip — and **every single chip is hollow**:

```
  ◌ ¶  mitgebracht · 3. März · getippt · Marek Sanz
  ◌ ⚄  mitgebracht · 21:14, Sitzung 3 · Menschenkenntnis · Sera · 21 gegen 15 · geprüft
  ◌ ❝  mitgebracht · 21:22, Sitzung 3 · vorgelesen · der zweite Keller
  ◌ §  mitgebracht · 21:47, Sitzung 3 · Regelkarte · „Siegel prüfen kostet eine Handlung"
```

Under the title, die Saatbilanz, computed and not typed:

> *„25 Absätze im Kanon · **0 an diesem Tisch** · 25 mitgebracht aus »Der Aldenfall-Auftakt« von
> Marek Sanz · Siegel geprüft, 118 Belege nachgerechnet."*

> **Timo:** *„Also ist es Fake."*

**Beat two — der Nachweis.** She opens the footnote at the end of paragraph four. It is the champion's
Beleg card, and it has one control the champion's card does not have:

```
[1]  Menschenkenntnis · Sera Valdris · Sitzung 3 · 21:14:38
     1d20 = 13
       + 4   Weisheit
       + 2   du hältst 4 Passagen über Haus Vharon   (haelt_etikett „haus-vharon", mindestens: 3)
       + 2   Bruder Alders Hinweis (Sitzung 2)
     ─────────────────────────────────
       = 21  gegen SG 15 · Erfolg
     Regelpaket hausregeln-aldenfall 2.3 · Klausel k_vharon_kenntnis@r7 · Wurf w_003 · mitgebracht

                                                              [ Nachrechnen ]  [ Der Augenblick ]
```

She presses **Nachrechnen**. The client re-executes the roll from the frozen record — seed, expression
AST, package pin, clause revision — in a worker, and diffs the result against the imprint:

> ✔ *„Nachgerechnet. Seed 4f2a…c1, Ausdruck unverändert, Paket hausregeln-aldenfall 2.3 installiert
> und gehasht, Klausel k_vharon_kenntnis@r7. 1d20 = 13. Ergebnis 21. Übereinstimmung: byteidentisch.
> Dieser Wurf wurde am 14. Juni 2026 um 21:14:38 geworfen — **an Mareks Tisch, nicht an deinem.**"*

**Beat three — der Augenblick.** The second control opens the board *as it stood at 21:14:38*: the
archive nook, three tokens where they stood, Vaugn two squares from the door, the fog exactly as Sera
saw it, the initiative strip mid-round. It is the champion's Augenblick, and it arrived in a download.

**Beat four — the gesture that makes it a product and not a demo.** Kaya takes Sera, rolls once, and
presses `Ctrl+Enter`. One passage is minted. The provenance gutter now shows **twenty-five hollow
chips and one solid one**, and the Saatbilanz reads *„1 Absatz an diesem Tisch."*

> **Timo:** *„Warte. Du kannst **nachweisen**, dass jemand anderes diesen Wurf wirklich geworfen hat —
> und die Seite weiß, welcher Satz dir gehört und welcher nicht?"*

**Why this is the right flex.** It is one still frame — encyclopedia page, twenty-five hollow chips and
one solid, an open footnote card carrying a d20 derivation with a green seal, a board beside it. It
photographs **both halves of Kaya's sentence and the honesty claim in one image**, and it is reachable
**four minutes after a stranger arrives**, which the champion's flex is not (champion §10.7: *"three
amber chips, not twenty-two"* until session four).

Structurally unreachable for every rival, and the reasons are the champion's, sharpened by one row:

| Rival | Why it cannot render this frame |
|---|---|
| **Foundry** | A journal page is an **HTML string**; the smallest permissionable object is a page. Its *Ember* adventure and the Marketplace's 557 → 1,227 products in year one (RB-01-foundry) ship **prep**: text and maps with no reader-differentiated state and no citable roll. There is no id below the page for a footnote and no object for a seal to sit on. |
| **Roll20** | No campaign export **at all**, no sub-page identity, and per-player reveal was removed with *"no way to turn this back"* (RB-05 #3). A shipped campaign in which three characters hold three different books is not merely absent — it is **unrepresentable**. |
| **Fantasy Grounds** | ~3,858 licensed DLC products (RB-01-fg) — the deepest *published-rulebook* pipeline in the market — and the story record is a chat log. They sell the book, never the evening. |
| **Owlbear** | No content marketplace, and no sheets, rules or journal **by stated policy** (RB-01-owlbear). There is nothing for a shipped world to land in. |
| **Alchemy** | **The closest rival, and it must be named.** Revenue comes largely from officially licensed *"integrated adventures"* with art, motion and audio baked in, $5–$35 (RB-01-alchemy). They already ship pre-made worlds — but they ship **prep with production value**: no per-character knowledge state, no citable roll, and **no tactical map at all, by design**, so there is no scene for the footnote to open into. Their own reviewers report bundles that are *"just splash screens"* with no adventure text. |
| **TaleSpire** | Slabs are the most elegant sharing primitive in the category and we steal their shape a third time — but a slab carries **geometry**, never knowledge and never evidence. No sheets and no rules engine after ~5 years of Early Access. |

**Four things at once, and no product in the corpus has two:** an addressable atom below the page · a
per-character revelation that survived a download · a die roll as a first-class object you can
**re-execute** · a document that renders differently for the person reading it than for the person who
wrote it.

---

## 3. The refusal that makes it honest — and the answer to the named fatal

The attack this candidate exists to survive is: *"you sold a photograph of somebody else's table, and
a manufactured provenance layer destroys the honesty claim everything else hangs from. If provenance
can be fabricated for a demo, why trust it for your own campaign?"*

Three answers. The first is architectural, the second is economic, and the third is the one that
actually settles it.

### 3.1 `am Tisch` cannot be written by an importer — it is a DB grant, not a field

The champion's strongest enforcement is that no code path reachable from `session/*` may INSERT a
`passage` except the five `praegung.*` handlers, each requiring an explicit `actor_user_id` and a
`gesture` discriminator (champion §4.1). This candidate extends that rule by exactly one clause:

> ### `Nichts wird mitgebracht zu „am Tisch".`
> **Herkunftsklasse is derived from one nullable column, `herkunft_anlass_id`, and no import path can
> write NULL into it.** The runtime DB role's INSERT grants for `passage`, `wurf`, `revelation` and
> `augenblick` from any code path reachable from `anlass/*` or `import/*` carry a **CHECK constraint
> `herkunft_anlass_id IS NOT NULL`**, and a dependency-cruiser rule reddens the build on any other
> path. The five `praegung.*` handlers are the only writers of NULL, and they require a live
> `GameSession` on this instance plus an `actor_user_id`. **The importer physically cannot forge
> `am Tisch`.**

So the honesty claim is not *"trust that Marek really played this."* It is: **your own provenance is
first-person by construction.** `am Tisch` is a statement your own server makes about your own
keypresses, and there is no code path — ours or an attacker's, absent a database compromise that
already ends the discussion — by which downloaded content acquires it. We never ask a customer to
trust a stranger's provenance. **We label the stranger's differently, permanently, in the flex
itself.**

### 3.2 What „Nachgerechnet" claims, and — precisely — what it does not

The seal is a deterministic verifier, not a fraud detector, and overclaiming it is the fastest way to
lose the argument. Stated on the tin, in the product, in these words:

- **It claims:** the printed number follows from the frozen seed, the frozen expression AST, the pinned
  package version and the named clause revision, and nothing in the card has drifted since it was
  minted. This is champion §7.4's gate „Der Beleg hält" turned into a control a human can press.
- **It does not claim:** that a human was present, that the seed was not ground until a 13 came up
  (5 % of seeds give a 13 on a d20 — grinding is trivial), or that the timestamp is true.
- **The honest primary purpose is durability, not anti-forgery.** *A package upgrade in 2029 cannot
  change what a die roll meant in 2027.* The anti-forgery value is a side effect and is marketed as
  one, or not at all.

**What actually makes an Anlass expensive to fake is not the roll — it is die Verflechtung.** An Anlass
is N passages, M `Revelation` rows across K characters, an `Augenblick` per mint whose fog state must be
consistent with the revelation history at that instant, an attendance span, a session ordering, and a
`fire_count` on the Regelkarten. Forging a *plausible* one means constructing a consistent per-character
knowledge graph over four evenings — which is to say **doing the GM's job**. Faking it is not cheaper
than playing it. We do not claim it is impossible; we claim the cheapest path to a convincing Anlass
runs through a table, and that is enough.

### 3.3 Der Anlass endet — the demo must be consumable, not admirable

Nemesis M3's shape — *the demo world is better than the customer's own for four weeks* — is answered by
refusing to ship a world at all.

**A shipped Anlass is not a campaign. It is four evenings and a sealed remainder.** Six to ten seed
lines survive it unopened, deliberately unresolved, and the shipped record ends mid-thread. There is
nothing further to read. **You cannot keep admiring it; you can only keep playing it.** A soft cap in
the Packer refuses to publish an Anlass with more than four recorded evenings or fewer than four sealed
lines, and the registry displays both numbers.

The counter-pressure is **die Übernahme**, and it obeys the champion's own type rules rather than
breaking them. The tempting design — *„diese Welt ist zu 34 % eure"* — is **forbidden by
§6.5 Kein Nenner**: a ratio is a denominator, and the player `Sicht` node has exactly one numeric field.
So:

- **On a player surface:** a **count only**, of am-Tisch passages *she holds*. *„3 Absätze in deinem
  Buch sind an diesem Tisch entstanden."* No total, no ratio, no gap.
- **On the GM's surface:** the ratio, as `NurLeitung<Übernahme>` — no encoder instance in the player
  payload codec, so it cannot be serialised to a player even by a developer who wants to.
- **A migrating GM's four-year Foundry world never shows a percentage at all**, because *„0 % eure"*
  over 1,106 imported passages is an insult and a lie. Two counts, never a quotient.

---

## 4. How the two halves fuse

The champion's fusion is unchanged and untouched: **five mint gestures run table → wiki**, **three
predicates run wiki → table**, and neither half computes without the other. This candidate adds
**exactly one edge**, and the entire thesis rests on it:

> ### `Ein Anlass liefert Revelations, nicht nur Passagen.`
> A downloaded Anlass ships `Revelation` rows — *which character knew what, from which source, with
> which `erfahrungsgrad`* — not merely text. **That single fact is what makes the wiki → table direction
> execute at minute one**, because `haelt`, `haelt_etikett` and `erfahrungsgrad` evaluate against the
> rolling character's projection, and after an install that projection already has rows in it.
>
> **The imported past is a live input to the dice engine.** No rival can copy this, because none of them
> stores per-character knowledge state that a rule can read — Foundry's smallest permissionable object
> is a whole journal page, Roll20 removed per-player reveal, Alchemy has no rules-readable knowledge
> model, Owlbear has no journal by policy.

### 4.1 The worked evening — Sitzung 5, the table's first, the world's fifth

Sessions 1–4 are Marek's, shipped inside *Der Aldenfall-Auftakt*. Session 5 is Kaya's, in her kitchen,
with three friends who have never opened the product.

| Time | At the table | What the product does | Herkunft |
|---|---|---|---|
| 19:41 | Kaya opens the app | Lands in **Session**, because a session window is scheduled (champion §13, ruling 1). *Vorher* shows the installed Anlass: **4 Abende · 118 Absätze · 3 Bücher · 6 versiegelte Zeilen offen.** Content-addressed, version-pinned (B3). | — |
| 19:52 | Three players join by link, no account | **Die Übergabe.** Timo takes Brannt and inherits **21 passages, all `mitgebracht`**. The join dialog says it plainly: *„Du übernimmst Brannts Buch. Nichts davon hast du selbst erlebt."* Sera's book has 34, Vesper's 9 — three different books, shipped, byte-different (die Namenswache runs). | mitgebracht |
| 20:06 | Timo: *„Warum weiß mein Char überhaupt von der Kanzlei Ossa?"* | He opens the chip himself: *„mitgebracht · 21:31, Sitzung 3 · Spurenlesen · Brannt · 17 gegen 14."* Presses **Nachrechnen**. Green. **A player's question about his own character's knowledge is answered with evidence, by the player, in four seconds.** No GM adjudication, no retcon argument. | mitgebracht |
| 20:31 | Sera rolls Menschenkenntnis | `1d20=13 +4 Weisheit **+2 (du hältst 4 Passagen über Haus Vharon — Sitzung 2, 3, 4)** +2 (Alders Hinweis) = 21 gegen 15`. **The +2 exists because a stranger's three evenings put those passages in Sera's book.** This is the fusion, at minute thirty-nine of a table that has never played. | wiki → table |
| 20:31:22 | Kaya: *„Du siehst es sofort — das Siegel ist eine Fälschung."* | `Ctrl+Enter`. Sealed line 3 released, revealed to Sera, `Quelle = Wurf(w_051)`, Augenblick captured server-side. **`herkunft_anlass_id = NULL` → the first solid chip in the world.** Haus Vharon now renders 24 hollow, 1 solid. Kaya screenshots it without being asked. (**P1**) | **am Tisch** |
| 20:34 | Timo: *„Was siehst du?"* Sera tells him | Same passage revealed to Brannt as `Quelle = Gehört(sera, r_0552)`. His book stamps it *Hörensagen*. His next check on the topic prints `+0 · Hörensagen zählt nicht` **from the same clause that gave Sera +2** — a clause that shipped inside the Anlass's rule package. | am Tisch |
| 21:02 | A player asks something Marek never wrote | Kaya improvises Ossa's fate. `Ctrl+Enter`, one line, `[[Ossa]]` red link resolves. (**P2**) | **am Tisch** |
| 21:19 | Tokens enter the archive nook | **Eine einzige Freigabe.** The region geometry came from the Anlass's `.dd2vtt`; **the revelations that open it are this table's.** Fog opens per character. Vesper's payload contains none of it, including the wall segments (§6.7). | am Tisch |
| 21:47 | Argument about whether checking a seal costs an action | **Regelkarte**, one key. `fire_count = 1` — on a clause that **shipped with Marek's package**. That signal flows back to the registry as ranking (§11.2). | am Tisch |
| 22:51 | Vaugn drops below 0 HP | `defeat_pending`. Nothing dies. Kaya confirms; one `ereignis` passage. (**P4**) | am Tisch |
| 23:38 | Session ends | **Die Fällung**, with one new line: *„7 Absätze geprägt · 2 versiegelte Zeilen freigegeben · 39 Würfe verworfen · Puffer wird am 21. Juli gelöscht."* And beneath it: *„Diese Welt: **118 mitgebracht · 7 an diesem Tisch.**"* | — |
| Mi 07:40 | Timo on the train, phone | Brannt's book: 21 hollow chips and 3 solid. He presses the solid one at 21:02 and it reads *„du warst dabei."* The hollow ones are not lies to him; they are labelled inheritance. | — |

**Play → knowledge: seven mints, zero inference, zero AI. Knowledge → play: the `+2` at 20:31 and the
`+0` at 20:34, from one clause, over a book that arrived in a download.**

---

## 5. The six zones under this thesis

Six zones — Session · Story · Cast · Library · Table · Forge — with Campaign Context, Module Rail,
Collection Rail, Primary Stage, Context Lens and Session Shelf; independent axes
(content × skin × role × mode × a11y); one Scene with three render recipes; DOM authoritative, Pixi
behind `MapRenderer` ([`03-triumph-ui-direction.md`](../../03-triumph-ui-direction.md)). **The shell is
unchanged. The thesis needs no new zone**, which is itself an argument for it.

| Zone | Under *Die erste Minute* |
|---|---|
| **Session → der Anlass** | Gains a **fourth state before the other three: *die Übernahme***. Opening a shipped Anlass is a ~90-second reading-and-choosing surface: which pregenerated characters your players take, which sealed lines you keep and which you strike, which of Marek's Regelkarten you promote or delete. **It is a form, not a wizard**, and it is the only new primary surface in the candidate. Then *Vorher* (der Anlass) → *Währenddessen* (die Kanonleiste) → *Nachher* (die Fällung), all unchanged. |
| **Story → das Archiv** | Unchanged in shape; **die Herkunftsschicht gains one channel**. Kind rides glyph shape, `erfahrungsgrad` rides stroke, saturation rides colour — and **Herkunftsklasse rides fill (hollow / solid)**, which is a shape difference and therefore survives high contrast, greyscale and colour-blind modes intact. The word *mitgebracht* or *am Tisch* is the first token of every chip's accessible name. Gate „Der Streifen" (≤4 % `scrollHeight`, no non-inline element between two atoms, nine breakpoints) is unchanged and now also asserted with the fourth channel present. |
| **Cast → die Zeugen** | **The zone the thesis changes most.** Pregenerated characters ship *with their books*. The character page's *„was sie bezeugt hat"* section splits into **erlebt an diesem Tisch** and **übernommen**, each row openable into its Beleg and its Augenblick, each Beleg carrying **Nachrechnen**. A player who takes over a shipped character inherits knowledge she did not earn, and the product says so on every row rather than pretending otherwise. |
| **Library → das Regal** | Gains the shelf that makes the thesis tradeable: **Anlässe** — installed evenings, their pinned package versions, their verification state (*„118 Belege nachgerechnet, 0 Abweichungen, geprüft am 27.07."*), their RB-04 licence manifest with `derived_from` resolved transitively, and the **Mitspielerfreigabe** roster rendered as pseudonyms. Plus **die Prüfung**: a bulk re-verification of every Beleg in an installed Anlass, run once at install and re-runnable. *(A count here is package metadata about content the GM wholly holds — not a cross-projection denominator; §6.5 is not violated and the `oracles.yaml` row says which.)* |
| **Table → der Tisch** | Champion §9, with slice 1 cut hard (§9.3). **One structural gain: the Anlass ships its scene as UVTT**, so the table's minute one is an import that already happened — walls, doors, one light, grid aligned, tokens placed where Marek left them. We control the demo map's texture budget because **we authored it**, which is how the tile pyramid leaves slice 1 without a lie. |
| **Forge → das Formular** | **The strategic change, and the one RB-11 was waiting for.** The Forge gains **der Anlass-Packer**: select one or more of *your own* sessions → redact → pseudonymise (§10.3) → attach the rule package → resolve the licence manifest → run the verifier → seal → publish. It is single-user, visually spectacular, screenshottable and exports into rivals — **exactly the Steam-shaped half RB-11 §"Recommendation" 5 named**, and it now has a reason to exist beyond map generation. `forge-standalone` CI target with zero imports from `codex/*`, `session/*`, `server/*`, unchanged. |

**One ruling changed, one added.** Champion ruling 1 (the landing zone is time-dependent) is unchanged.
**New ruling: a campaign with an installed Anlass and zero `am Tisch` passages opens in *Story*, never
in *Session*** — the evaluator arrives at the encyclopedia, because the encyclopedia is the thing that
is already full. One predicate, one routing line, and it is the thesis made visible.

---

## 6. The differentiation ledger

Every claim below is from the RB briefs. **A ledger with no losses is a lie**, and the losses here are
worse than the champion's in one specific place: Alchemy already ships pre-made worlds.

| Rival | What this candidate does that they cannot | What they still do better — honestly |
|---|---|---|
| **Foundry** | Ship an *evening* rather than an adventure. Their content is prep: *Ember* (3,808 Kickstarter backers) and a Marketplace that went 557 → 1,227 products in year one are text, maps and compendia with **no reader-differentiated state and no citable roll**. A journal page is an HTML string; there is no id below the page for a footnote, no object for a seal, and adding one means touching every journal read path in an ecosystem where **only 1,590 of 5,338 approved modules were V14-compatible a month after V14** — in a company that abandoned even the PixiJS v7→v8 renderer migration as *"far more sweeping and disruptive than we had planned."* | Dynamic per-token LOS, six wall types × four perception channels, directional walls, attenuation, `ClockwiseSweepPolygon`, Scene Levels, 475 systems, 5,338 modules, $50 perpetual, ten years of trust. **For a table that wants good lighting and bought 5e content tonight, Foundry beats us outright and will for years.** |
| **Roll20** | Ship a campaign at all. **Roll20 has no campaign export whatsoever**, no sub-page identity, unreliable character transfer, and per-player reveal was removed with *"no way to turn this back"* (RB-05 #3) — so *three characters holding three different books* is not a missing feature, it is **unrepresentable in their data model.** | ~10M accounts and the LFG network effect, the one asset nobody can buy. Licensed compendiums. Zero-install reach on day one, ~10–15 minutes to a functional table. |
| **Fantasy Grounds** | Sell the evening instead of the book. Their ~3,858 licensed DLC products are the deepest published-rulebook pipeline in the market and **the story record is a chat log** — nothing in it can be cited, projected per character, or re-executed. | The deepest rules automation in the market; **fully free since 2025-11-08**; and **a free cloud relay that already solves reachability for their users.** §7.3 is where we pay for what they give away. **Our single worst structural disadvantage, not closable by design.** |
| **Owlbear Rodeo** | Give a shipped world somewhere to land. **No content marketplace, and no sheets, rules or journal by stated policy** — there is no knowledge model, so there is nothing to import into and no footnote to open. | **Minute one on a blank table**, which is the moment the market decides: ~20 minutes to running, players join in seconds, Warp Core, a 137-megapixel map on an iPhone 14 Pro Max, one-click CV auto-fog, an honest explicit quality switch. **We beat them to a *full* table; they beat us to an *empty* one, and most evaluators want an empty one.** |
| **Alchemy** | **The closest fight in the ledger.** They ship pre-made worlds already — licensed *"integrated adventures"* with art, motion and audio baked in, $5–$35. But those are **prep with production value**: no per-character knowledge state, no citable or re-executable roll, **no tactical map at all by design**, so there is no scene for a footnote to open into and no board for an Augenblick. Their own reviewers report purchased bundles that are *"just splash screens."* Ours is worth less as a photograph and more as an instrument. | Production values — the best-looking product in the category — built-in voice and video, a native Streamer Mode, licensed partner content, and a **shipped no-code Sheet Builder in open beta: they beat us to the first half of K2.** Our answer must be *deeper*, not prettier: their builder has no formula trace; ours prints its derivation. |
| **TaleSpire** | Make the shareable unit an *evening* rather than a *place*. Slabs — compact pasteable strings community sites index — are the most elegant sharing primitive in the category, and we steal their shape a third time (scene → evidence → **Anlass**). A slab carries geometry; it can never carry who knew what. **No sheets and no rules engine after ~5 years of Early Access.** | The gasp: 2,100+ tiles, real 3D dioramas, ~90 % positive across 4,300+ reviews. **We cannot out-photograph a diorama and should stop trying.** Our still is a footnote with a seal on it. |
| **Obsidian · World Anvil · LegendKeeper · Kanka · Notion** | **None of them can be handed a die roll**, and none can ship a world in which two readers see two documents. | All of them are better long-form writing environments than our slice 1, and three of them are free. Champion §15.4's least-served user is unchanged. |

> **The loss stated once, plainly:** for a table that wants to play a licensed system tonight with bought
> content and good lighting, **all six beat us, and three of them are free.** We win the table whose
> evenings are worth keeping, and — new this round — the evaluator who wants to *see* an evening worth
> keeping before committing four Saturdays to producing one.

---

## 7. Data shape, boundaries, reachability

### 7.1 What changes in `02-domain-model.md` — one column and one table

`User → UniverseMembership → Universe → Campaign → GameSession` is inherited whole; roles on
memberships; `AuthSession ≠ GameSession`; `Actor` as aggregate; `CharacterController` on `actor_id`;
`RulePackageInstallation` as its own table; `KnowledgeEntry` scoping as a DB constraint; append-only
campaign-scoped `AuditEntry`. **The champion's §8 is inherited whole.** The thesis costs:

**(a) One nullable column, product-wide.**

```text
Passage    … herkunft_anlass_id  NULL REFERENCES anlass_installation(id)
Wurf       … herkunft_anlass_id  NULL      -- imported Würfe arrive dauerhaft = true,
Revelation … herkunft_anlass_id  NULL      --   and never enter a Sitzungspuffer
Augenblick … herkunft_anlass_id  NULL
```

`Herkunftsklasse ∈ am_tisch | mitgebracht` is **derived from the constructor, never stored** —
`mitgebracht ⟺ herkunft_anlass_id IS NOT NULL` — obeying the champion's rule that a field a
deterministic process can fill is deleted rather than defaulted. It gets one row in `felder.yaml` and
one in `oracles.yaml` like everything else. **`gepraegt_durch` was the champion's flex in one column;
`herkunft_anlass_id` is this candidate's, in one more.**

**(b) The Anlass, as an extension of an Entry kind the champion already has.**

```text
Entry(kind: anlass)                                     -- the seed; already in the champion
  └─ AnlassExt (entry_id, anlass_id, version, autorschaft,          -- §7.2's sum type, unchanged
                lizenz_manifest_id, gespielt_am[], abende int,
                versiegelt_offen int, siegel_sha256, geprueft_at)

AnlassInstallation (id, campaign_id, anlass_id, version, inhalt_sha256,
                    installiert_at, paket_pins[])       -- vendor-on-first-use, content-addressed (B3)

Freigabe (anlass_id, teilnehmer_pseudonym, umfang ∈ text | wuerfe | stimme,
          erteilt_at, widerruf_at NULL, nachweis_hash)  -- the only genuinely new table
```

**(c) Zero new sum types.** `Autorschaft = Mitglied | Fremd | Pseudonym | Verdeckt | Unbekannt`
(champion §7.2) already contains exactly what packaging needs: `Pseudonym(handle,
ehemals_mitglied_hash)` is what a released participant becomes, and `Fremd(anzeigename,
herkunft_paket_id, herkunft_autor_id)` is what Marek is at Kaya's table. **The champion's data model
anticipated this thesis without knowing it**, which is the strongest available evidence that the
evolution is real rather than bolted on.

**(d) `Universe` stays deferred.** An installed Anlass materialises into the **campaign**, not the
universe, in slice 1. The universe-scoped Anlass shared by two campaigns is §11.1, an extension, not a
slice item.

### 7.2 RB-11's eight boundaries, and where the Anlass sits

| # | Boundary | This candidate |
|---|---|---|
| **B1** | `Platform` port | Unchanged. The Packer's only desktop-specific act is writing a file; it goes through `saveFile`. |
| **B2** | Package registry contract — our id scheme, semver, `engine` ranges, content hashing | **The Anlass is a second artefact type behind the same contract**, not a second registry. `.chronicle-pkg` (rules) and `.anlass` (a played evening + its rules) share the id scheme, the hashing and the validator core. Workshop and mod.io stay adapters; Workshop only ever a mirror. |
| **B3** | Vendor-on-first-use, content-addressed | **Load-bearing here.** An installed Anlass is copied into the campaign and hashed; the registry copy is a source, never the live artefact. It pins its rule package versions into the campaign, so **a live session's package pin cannot move under it** — RB-11's named Nemesis target, answered by the boundary rather than by a promise. |
| **B4** | Entitlement port | Unchanged. **Anlässe are never sold to players.** A player who joins a table running a bought Anlass buys nothing, ever. |
| **B5** | Session transport port | Unchanged. Note that minute one uses **no transport at all** — one client, one room. |
| **B6** | `.chronicle` round-trips a full campaign with zero Steam involvement | **`.anlass` is a profile of `.chronicle`**, not a parallel format: the same serialiser, the same round-trip gate, with `herkunft_anlass_id`, the installation record and the Freigabe roster inside the diff. One format to prove, not two. |
| **B7** | One repo, one build, two artefacts; no SteamPipe in CI until the gate passes | Unchanged. |
| **B8** | No feature ships desktop-only without a declared browser fallback | The Packer runs in the browser (DOM + a worker); the desktop build gains only native file dialogs. **Verified by the same acceptance demo run in both artefacts.** |

### 7.3 Reachability, with numbers — and the one place this thesis genuinely helps

RB-11 charges this identically to every option and says a candidate that hand-waves it should lose on
that ground alone. The champion's ruling stands unamended:

| Path | v1? | What a non-technical GM behind CGNAT experiences |
|---|---|---|
| **Hosted room** (default) | **Yes** | Create or install → copy link → players in. She never meets the words port, certificate, NAT or IP. |
| Electron host + Electron players | Yes, €0 | Everyone installs; full capability; works behind CGNAT on a LAN. |
| Electron host + **browser** players on LAN | Yes, **degradation printed on the join dialog** | `http://192.168.x.x` is not a secure context: no service worker, no offline Kodex, no WebGPU, no OPFS, the "Not secure" chip. The Electron host serves the bundle it embeds, so a room has exactly one client version by construction. |
| Own domain via **ACME DNS-01** | Yes | A GM who owns a domain gets a real certificate on her home box **behind CGNAT** — DNS-01 needs no inbound port. We operate no PKI and no DNS zone. CI-smoked against ACME staging. |
| **Remote players, GM behind CGNAT, no hosted room** | — | **DNS-01 issues a certificate; it does not create an inbound port.** Three answers exist: a hosted room, a tunnel (Cloudflare Tunnel / Tailscale Funnel — documented and CI-tested by us, operated by neither), or a relay we run. **There is no fourth**, and we say so on the pricing page. |
| Plex-pattern DNS zone + per-server wildcard PKI | **No — explicitly deferred, named as deferred** | A service business, not a feature. Bill written down, unpaid. |

**Session cost, inputs shown, unchanged from the champion:** text/knowledge deltas ~30–80 KB per
client-hour · table deltas ≈2–5 MB per client per 4 h · map assets one-time per map per client,
browser-cached from object storage · compute ≈ €0.001 per room-hour ⇒ **< €0.05 per session-hour.**
Der Briefkasten: **< €0.01 per campaign-month** against €31.20 of one-time margin.

**What this thesis adds, and it is the only reachability number in the round that goes down:**

- **An Anlass is a download, not a session.** Static, content-addressed, CDN-cacheable, one cache entry
  per version globally. Payload: text and revelations ~200 KB · UVTT ~50 KB · one 4096² map as KTX2
  ~8–12 MB · CC0 token art ~1 MB ⇒ **≈ 10–14 MB per Anlass.** At an assumed ~€0.09/GB egress,
  **≈ €1.10 per thousand downloads.** *Estimate with its inputs shown; no vendor quote.*
- **The evaluation costs ≈ €0.0012.** One person, ten minutes, one hosted room: compute ≈ €0.0002 plus
  one-time asset egress ≈ €0.001. **Ten thousand evaluations ≈ €12 — the entire cost of the minute-one
  battle.** That is the cheapest differentiator anywhere in four rounds of lineage.
- **Minute one does not touch reachability at all.** One person, one browser, one hosted room: no second
  client, no NAT traversal, no mixed content, no certificate for a LAN IP. **The hardest problem in the
  evidence base is deferred past the point of sale**, to the moment she invites friends — by which time
  she has already seen the product work.

---

## 8. What ships in the Anlass, and what may never be in one

### 8.1 The format, closed

`.anlass` is a `.chronicle` profile. Its contents are enumerated, and **the validator rejects any
unknown key** — a closed schema with no extension point:

- `Passage.content` as the **closed, versioned block AST** — never HTML, never Markdown at rest, no node
  carrying an event handler (champion §8.1).
- `Revelation`, `Wurf`, `Augenblick`, `Anmerkung`, `Etikett`, `Link`, `PassageRelation` rows.
- Clause ASTs over the **fixed operator set with no host access**; three predicates in slice 1.
- UVTT geometry — numbers.
- Rasters, **re-encoded server-side at install** (strips EXIF and malformed-decoder payloads), with
  dimension, size and frame-count caps, served from a separate origin under strict CSP.
- A manifest: RB-04's per-asset record with `sha256`, SPDX id, `derived_from[]`, and the Freigabe roster.

**Never in an Anlass:** SVG of any kind (RB-04 risk 12: an SVG can carry `<script>`; the champion bans
`innerHTML` product-wide and this closes the other door) · any URL resolving outside the package · any
font not OFL-1.1 self-hosted · any asset whose SPDX id is NC, ND, BY-SA or GPL (RB-04's copyleft trap:
our own composition and theme-recolouring make the output an *adaptation*) · any asset-store EULA
content (Unity/Fab/Synty/Humble — non-transferable, and non-transferability breaks the self-hosting
chain) · any `Zustand` row (HP is not knowledge) · any `Sitzungspuffer` row.

**Art supply for the four launch Anlässe** is RB-04 tier 0 + tier 1 only: a small commissioned core
set with `übertragbar und unterlizenzierbar` rights and an explicit end-user sublicence clause, plus
Kenney / DCSS curated export / 0x72 / ambientCG / Freesound CC0, snapshotted with checksums, never
hotlinked. **LPC is excluded by policy** and that costs us animated tokens; accepted. Illustration
commissioning remains **`[needs a quote]` — no evidence base, and this candidate will not invent one.**
The Anlass does not need illustration: **its images are Augenblicke, rendered from the table's own
board**, which is also K7 honoured exactly (art is content and skin, never a welded-in depicted world).

### 8.2 The three new gates

| Gate | Green when |
|---|---|
| **Nachgerechnet** | Every Beleg in every shipped Anlass replays **byte-identically** in CI on Windows / macOS / Linux Chromium and in Node, across two package minor versions, and with the locale forced to `tr-TR`. Requires the dice engine to be integer-only, RNG-pinned and locale-free in formatting — **+3 days over the champion's roller, and it is on the critical path.** Red blocks the Anlass release, not the product. |
| **Kein „am Tisch" ohne Tastendruck** | No code path reachable from `anlass/*` or `import/*` inserts a row with `herkunft_anlass_id IS NULL` into `passage`, `wurf`, `revelation` or `augenblick`. CHECK constraint + DB grant + dependency-cruiser, seeded red with a deliberate forging importer. |
| **Geschlossene Tüte** | The `.anlass` validator rejects ten hostile fixtures: unknown key · SVG · external URL · un-re-encoded raster · decompression bomb · clause operator outside the set · BY-SA asset · missing Freigabe · package pin naming an unavailable version · a `Sitzungspuffer` row. |
| **Freigabe** | No Anlass publishes unless every named participant has a `Freigabe` row with a non-null `nachweis_hash` and no `widerruf_at`. Enforced in the Packer **and** registry-side. |

All of the champion's gates are inherited unchanged, including **Prägerate as gate zero**, **S-T1**,
**S-P1**, der Zwillingsbeweis, Kein Protokoll, Der Beleg hält, Der Streifen, Das dünnste Buch,
Tischbudget, Orakelprobe, Herkunftsprobe, Cold read, Round-trip, Accessibility, Play posture, Zwei
Versionen ein Abend, and **Search at scale — still red until run, five rounds and counting.**

---

## 9. The first slice

**One workflow: a stranger opens a shipped evening and, ninety seconds later, is holding a page that
knows which sentence is hers.** It contains a game, because a candidate that concedes the table loses
this lineage (round-3 verdict §3.1). It is **smaller than the champion's slice 1**, and §9.3 says
exactly where the difference comes from.

### 9.1 Slice 0 — „Der Abend, aufgezeichnet" (~10–14 days, and it is not new work)

**The champion's gate zero already mandates an instrumented four-hour session to measure the mint
rate.** This candidate changes nothing about that requirement and takes a second output from it:

| Output | Who needed it |
|---|---|
| The **Prägerate** number: ≥8 mints, ≤4 min GM chrome typing, no interaction >12 s, ≤2 regretted omissions, plus the printed mint mix | The champion's gate zero (round-3 verdict §5.1: *"gate zero, nothing else is scoped until it runs"*) |
| **`.chronicle` fixture #1** — a real played evening with real Belege, real Augenblicke, three real per-character books | This candidate's entire content pipeline, first unit |
| The seed of the **5,000-entity search fixture** | Round-3 unresolved #4, five rounds unproven |

**The measurement and the content pipeline are the same activity.** That is the single best economic
move available to this thesis: gate zero stops being pure cost and becomes the first unit of inventory.
The harness it needs is **S-P1** (the two-day server-side projector) plus the five mint handlers plus a
square-grid map with no fog — all of which slice 1 needs anyway.

**Honest bill for four launch Anlässe** (three more after slice 0): 3 person-days each — one GM prep
day, one four-hour evening with three other humans, one day of packaging, redaction, licence resolution
and consent — ⇒ **~12–16 person-days plus four evenings**, excluding the commissioned tier-0 art set and
excluding illustration, which is `[needs a quote]`.

### 9.2 Slice 1 — „Die erste Minute", end to end

1. A stranger opens `…/anlass/aldenfall-auftakt`. **No account.** Read-only preview in a hosted room.
2. **Haus Vharon**: infobox as N `feld` passages, backlinks, real `<a href>` routing, cold server-side
   GET, uniform **404-never-403 with the timing-variance test**.
3. Provenance toggle → **25 hollow chips**, die Saatbilanz, gate „Der Streifen" green.
4. Footnote → the Beleg card → **Nachrechnen** → green seal with the replayed derivation.
5. **Der Augenblick** → the board at 21:14:38, three tokens, Sera's fog, the initiative strip.
6. **Die Gegenüberstellung** → Sera's article beside Vesper's, divergences marked. *(The evaluator is
   the GM of her own installed copy and holds everything; the divergence count is `NurLeitung`.)*
7. She claims the campaign and **starts a session alone**: the Anlass's `.dd2vtt` scene is already
   there. She takes Sera and rolls — the card prints **`+2 · du hältst 4 Passagen über Haus Vharon`**,
   computed from shipped revelations.
8. **`Ctrl+Enter`** → one passage, `herkunft_anlass_id = NULL` → **one solid chip among twenty-five.**
9. One friend joins by link as Brannt, holding **Brannt's shipped book, not Sera's**. She reveals the
   new passage as *von Sera gehört*; **his next check prints `+0 · Hörensagen` from the same clause.**
   He presses **die Berufung** on a passage he inherited and the GM's rail names who does not hold it.
10. Export → import into an empty instance → **diff empty**, including `herkunft_anlass_id`, the
    installation record, the Freigabe roster, `dauerhaft` Würfe and Augenblicke.

**Contents.** The champion's permission spine in full and **uncut** — `Sicht`, `felder.yaml`, B9,
totality, `NurLeitung`, `oracles.yaml` + die Orakelprobe + die Herkunftsprobe, the dependency-cruiser
rule, the Leak Bench seeded red with all thirteen fixtures, **der Zwillingsbeweis** — because this
thesis puts *more* on it, not less: **imported revelations are a new leak surface, and an Anlass that
leaks Marek's sealed lines to Kaya's players is a refutation, not a bug.** Plus: `Entry` · `Passage` ·
`Revision` · `Revelation` with the `Quelle` sum · `Anmerkung` · `Bild`-Passage · `Etikett` · `Haltung` ·
`Link` · `Zustand` · `ActorInstance` · `Wurf` · `Augenblick` · `Sitzungspuffer` with TTL and the
physical-purge test · the five `praegung.*` handlers with the closed-set rule · **`herkunft_anlass_id`
and its CHECK constraint** · **die Herkunftsschicht with the fourth channel** · **die Wiederholung
(Nachrechnen)** · **the `.anlass` format, validator and installer (B3)** · **die Übernahme** · die
Gegenüberstellung · die Berufung · die Fällung · die Regelkarte · der Souffleur · eine einzige Freigabe
· the clause engine at exactly three predicates with required `disclosure` · die Grundplatte + der
Klauselzettel · **der Tisch, reduced**: square grid, UVTT import, tokens with server-authoritative move
validation, per-character fog derived from revelations, wall projection (§6.7), seeded server-side dice
with the `Trace` sum, initiative, HP, `defeat_pending`, the 50-transition undo ring · **die Tafel** as
the Outline recipe and a real play surface · der Briefkasten (hosted + `keiner`) · the `Archive` skin ·
the `Platform` port with both impls · `.chronicle` round-trip in CI.

### 9.3 What is cut from the champion's slice 1 — and why it is honest

This is the section where candidates cheat. The cuts are real and each has a reason that is not *"we
ran out of room"*:

| Cut | Moves to | Why it is defensible here specifically |
|---|---|---|
| **Tile pyramid + KTX2 + zoom variants** | Launch-blocking | **We author the demo map.** A single 4096² texture is enough for an Anlass we ship, so the pyramid stops being a slice-1 dependency of the *flex*. It remains a dependency of the *product* and is not deleted. |
| **Hex (four varieties) and gridless** | Launch-blocking | Square only; the launch Anlässe ship square maps. Elevation stays a **scalar in the schema** (RB-05 #6: design it in, never retrofit) and is simply not rendered. |
| **UVTT *export*** | **Launch-blocking, not deferred** | RB-11 §3 requires export at **launch**; slice 1 is not launch. Import is load-bearing in slice 1 because the Anlass *is* an import. |
| **Der Kartenabzug / the raster derivative service** | Launch-blocking, with die geschwärzte Tafel stage 2 | **Grenze B10 stays a rule in slice 1** — degradation may lower fidelity, never rights — but no degraded raster path ships until the service does. |
| **Die Rückfrage · die Randfrage · das Zeugnis · die Lücke** | Slice 2 | None of them is on the ninety-second path. **This visibly weakens the player** (champion §15.5) and die Berufung is kept precisely to stop that becoming fatal. |
| **BYO Briefkasten (S3/WebDAV)** | Slice 2 | It is an adapter behind an existing port (B1/B6). Deferring it costs one adapter, not an architecture. Hosted and `keiner` ship. |
| Everything the champion already excluded | Unchanged | ProseMirror, the identity registry, `StructuralIntent`, split/merge, die Zollgrenze, der Nachtrag, die Schonfrist, dynamic LOS, wall authoring, Scene Levels, animated maps, WFC, the second skin, the theme editor, the full rule-builder, Electron, universes as a visible concept, item templates, **AI of any kind**. |

**Cut order if slice 1 must shrink further:** (1) UVTT import of *lights*, keeping walls, doors and
grid; (2) initiative and timers, keeping HP and `defeat_pending`; (3) die Berufung; (4) the `keiner`
Briefkasten impl. **Never: Nachrechnen · Herkunftsklasse · die Herkunftsschicht · `Sicht` or B9 · der
Zwillingsbeweis · `haelt_etikett` · the five mint handlers' closed set.**

### 9.4 Acceptance demo, one take, no cuts

Open a shipped Anlass with no account → 25 hollow chips and the Saatbilanz → open a footnote → press
**Nachrechnen** and show the replay output beside the frozen imprint → open der Augenblick → open the
second browser as Brannt and show his response body contains **no bytes** of the two sealed lines and
**no wall geometry** of the unheld corridor → roll as Sera and show `+2 · du hältst 4 Passagen`
computed from *shipped* revelations → `Ctrl+Enter` → **one solid chip appears among twenty-five hollow
ones** → reveal to Brannt as *von Sera gehört* → **his check prints `+0 · Hörensagen` from the same
clause** → die Berufung names who does not hold it → drop a guard to `defeat_pending`, confirm, undo →
die Fällung: *„118 mitgebracht · 1 an diesem Tisch"* → export → import → diff empty. **Then twenty
seconds that are not a DevTools tab:** the article, the provenance layer, one hollow chip and one solid
one, and the footnote pressed open into the board.

---

## 10. Weaknesses — the honest ledger

**10.1 The first four Anlässe are unavoidably ours, and the flywheel needs customers who do not yet
exist.** User-supplied Anlässe require played evenings, which require customers, which require the
Anlässe. ~12–16 person-days plus four evenings plus consent paperwork lands on a solo stakeholder in
exactly the weeks the champion's ~120-day tactical half is still unspiked. **The Packer converts every
customer into a potential supplier, but not one of them exists on launch day**, and a registry with
four items looks like a demo folder. Falsifier: if fewer than **five community Anlässe** are published
within 90 days of the Packer shipping, the content axis is ours forever and must be budgeted as a
permanent line, not an ignition cost.

**10.2 „Nachgerechnet" will be overclaimed, and the gap is a mis-selling risk discipline alone
prevents.** The seal proves coherence and durability; a buyer hears *"proof a human rolled this."*
Seed-grinding is trivial. §3.2 states the limit in the product's own copy, and the moment a marketing
page says *"verified real play"* the claim is false. **This is the mechanism in the candidate most
likely to be quietly upgraded by its own authors** — which is precisely how a doctrine becomes an
intention (round-3 verdict §6).

**10.3 Consent is revocable and a shipped `.anlass` is not. This is the genuinely hard one.** Four real
humans played that evening: their display names, character names, rolls and spoken lines are inside the
artefact, and a `Wurf` is append-only and citable by design. **Die Maskierung** — the Packer rewrites
every `Autorschaft::Mitglied` to `Pseudonym(handle, ehemals_mitglied_hash)` at export, one-way, with the
hash salted per Anlass so identities cannot be joined across releases — reduces identifiability and
**creates no recall mechanism whatsoever.** A `Freigabe.widerruf_at` can unpublish the registry listing
and make the verifier warn on install; it cannot reach an `.anlass` on a stranger's disk, a
`.chronicle` export, a built Publication or a printed Chronik. Champion §15.7's unresolved
right-to-erasure collision is not merely carried — **it is exported to third parties, which is a
materially worse position, and nothing in this document fixes it.** *[needs counsel, and the German
`Fachanwalt` consultation RB-04 already requires for the art contracts should cover it in the same
session.]*

**10.4 The flex depends on a second gesture landing, and we have no evidence anyone presses it.** The
first sentence an evaluator reads is *„0 Absätze an diesem Tisch."* If she reads that as *"the demo is
fake"* and closes the tab before **Nachrechnen**, the candidate's entire minute-one claim evaporates and
we have shipped the champion with extra content costs. **Gate „Die erste Minute" is the falsifier:** an
unmoderated first-run test, **10 evaluators, ≥8 reach der Augenblick within 3 minutes and ≥6 press
Nachrechnen or mint within 5 minutes, unprompted.** Red ⇒ the thesis is refuted and the round must say
so before marketing does. It costs about two days and it is cheaper than every other measurement in the
lineage.

**10.5 A GM who only ever runs shipped Anlässe never accretes an `am Tisch` layer — and that GM is
Fantasy Grounds' customer, who pays nothing.** The thesis's own success mode contains its failure mode:
the better our Anlässe, the more attractive it is to consume rather than author, and the consumption
market is served free by a vendor with ~3,858 licensed products. **Der Anlass endet** (§3.3) is the only
counter-pressure and it is a soft cap in a publishing tool, not a mechanism in the product.

**10.6 A second artefact type is a wider attack surface than the champion planned for.** An Anlass
carries text, geometry, rasters, revelations and a rule package — more content types than any package in
the lineage — against RB-11's named target *"the package format's freedom from any code-execution escape
hatch."* §8.1 closes it by enumeration and gate „Geschlossene Tüte" tests it, but **the honest statement
is that we widened the surface to buy the thesis.** RB-04 risk 12 (SVG payloads, decompression bombs,
cross-tenant leakage on the upload path) applies in full and its controls are inherited whole.

**10.7 Everything the champion left unspiked is still unspiked, and this candidate adds three days to
the critical path.** No Pixi, no tile pyramid, no fog texture, no UVTT parser, no dice AST, no perf
harness, no projector has ever been written in this lineage. **Nachrechnen makes the dice engine's
determinism a shipping requirement rather than a nice property** — integer-only arithmetic, pinned RNG,
locale-free formatting, cross-platform byte equality — and that is +3 days on a line the champion
already marked medium risk and never measured.

**10.8 Carried unchanged from the champion, and not improved here.** ~120 days of unspiked tactical half
· the mint rate never measured (gate zero, now with two outputs and the same risk) · `Sicht` unbuilt for
a fourth round with more loaded onto it · Fandom-grade search at scale unproven in five rounds and made
*worse* by shipped content, because an installed Anlass adds 118 more short passages to the index before
the customer types a word · the thin player book, monotone in play quality · *Erfahren schlägt Gehört* is
a house rule wired into an engine that no published rulebook contains · the 14 days are a policy · a
citable `Wurf` still collides with the `Zustand` undo ring · the art pipeline is `[needs a quote]` and
its one measured data point is a 3.47 MB plate at 2.9× the first-paint budget.

---

## 11. Creative extensions

### 11.1 Die Gabelung — two tables play the same evening, and the world diverges, visibly

Two campaigns install *Der Aldenfall-Auftakt*; both play their session 5; both mint on top of a common
ancestor. Because every passage carries a pid **and** a `herkunft_anlass_id` naming the same installed
version, the divergence is computable — and **the render surface already exists.** Die
Gegenüberstellung (champion §3.2) is a two-column comparison of one article under two projections; the
extension swaps the axis from *character* to *table*:

> *„Haus Vharon — an Mareks Tisch (Sitzung 3–7) · an Kayas Tisch (Sitzung 5–9). Gemeinsamer Ursprung:
> 25 Absätze. Marek: Vaugn stirbt in Sitzung 6. Kaya: Vaugn wird Verbündeter in Sitzung 7."*

Opt-in, offline, over exported artefacts only — **no live cross-tenant query, no telemetry, no
projection across a permission boundary.** It is git's most beautiful idea applied to a story, it costs
one new axis on a component that already ships in slice 1, and **nobody in the corpus can show two
campaigns' canon diverging from a common ancestor**, because nobody has an addressable atom that
survives a download.

### 11.2 Der Anlass als Rezension — a registry ranking signal that cannot be bought

Downloads and stars are gameable; a play record is not. The registry ranks an Anlass by **what tables
built on top of it**, opt-in and aggregated:

- the **`fire_count`** its shipped Regelkarten accumulate at other people's tables — a counter grown only
  by a deliberate keypress at 21:47, which is exactly the signal champion §17-K2 wanted and could not
  source;
- the **am-Tisch layer thickness** downstream campaigns accrete over it — *„41 Tische, im Schnitt 34
  eigene Absätze in den ersten drei Abenden"*;
- how many of its sealed lines were **struck** rather than played, which is the honest negative signal
  and we publish it too.

Gaming this means playing. And the smallest unit of it is already a shipped feature: **die Wurfkarte
reist** (champion §10.4) — a roll card pastes into Discord as one declarative string whose only leaf
type is `Text`. Under this thesis a pasted card renders **with its green seal**, so every shared
footnote is a piece of marketing that verifies itself, with no marketplace, no account and no server
round trip.

### 11.3 Die Lehrstunde — the tutorial, the trailer and the accessibility demo are one data object

An Anlass is a *played* evening: every mint carries an `Augenblick`, every Beleg a timestamp, every
Freigabe an order. That sequence is already a script. So the product can **replay Marek's Sitzung 3 beat
by beat, performing its own gestures**: 21:14 the roll, 21:14:38 the mint travelling roll card → passage
→ footnote → reader's book (champion §13 ruling 4, the best motion moment in four rounds), 21:29 the
Freigabe opening the fog, 21:47 the Regelkarte.

One data object, three products:

- **the tutorial** — a new GM learns the five gestures by watching them happen to real data, not to
  lorem ipsum;
- **the trailer** — a screen recording of the real product driving real content, which is the only
  honest kind, and it re-renders itself whenever the UI changes;
- **the accessibility demo** — the same walkthrough in the **Outline recipe** is a keyboard-only,
  screen-reader-complete narration of an entire evening, which is a claim no competitor can make at all:
  Fantasy Grounds and TaleSpire are Unity apps and structurally cannot follow us here (RB-11, K3).

It costs a cursor over an existing ordered sequence. **It is the cheapest tutorial in the category and
no rival can build one, because none of them kept the record.**

---

## 12. Kaya's amendments, where this candidate differs from the champion

| | Amendment | Delta |
|---|---|---|
| **K1** | Themes + templates | Unchanged — token-first, `Archive` + `Clean`, contrast validated against painted pixels. **Plus:** a shipped Anlass declares a skin but never *requires* one; the content × skin axis is asserted by rendering the launch Anlass under both kits in CI. Provenance now uses **four** independent channels (glyph shape, fill, stroke, saturation), so high contrast keeps the whole distinction including Herkunftsklasse. |
| **K2** | Visual GUI rule-builder | **Strengthened, and it is the go-to-market.** Der Klauselzettel ships in slice 1. **A rule package published *with* a played Anlass is a library with a runnable example** — and its `fire_count` at other tables becomes the registry's ranking signal (§11.2). Conceded, unchanged: Alchemy shipped their Sheet Builder first. |
| **K3** | State-of-the-art GUI | Unchanged; **die Lehrstunde makes the Outline recipe a marketing asset rather than a compliance item.** |
| **K4** | Differentiation | §6, with losses. Axes unchanged — durable world, per-character knowledge, evidence as a first-class object, no-code authoring, accessibility, theming, portability — **plus one new: the tradeable played evening.** Not feature count, not the renderer. |
| **K5** | Maps, generation, sprites | **Slightly reduced in slice 1 and honest about it**: square grid only, one authored texture, no pyramid until launch. WFC unchanged in slice 3, and **the Packer is the Forge's second reason to exist**, which strengthens RB-11's separability argument. Kaya's reallocation ruling is still owed. |
| **K6** | Distribution | Ratified verdict carried whole. **The Anlass is the creator channel RB-11 named**, and §7.3's numbers show minute one costs ≈ €0.0012 and touches no reachability path. |
| **K7** | Game feel through staging | **Honoured and strengthened.** An Anlass ships no depicted world: its images are Augenblicke of the table's own board, and its most cinematic moment is a die roll folding into a footnote — a transition between two pieces of someone's record. |

---

*Candidate B. The bet, unhedged: **the first evening can be bought, and honesty is the feature that makes
it saleable.** Not a photograph of somebody else's table — a labelled, re-executable, consumable record
of one, that the product itself refuses to let you mistake for your own. Its cheapest number is
€0.0012 per evaluation and its most expensive is a consent it cannot recall.*

> *Vier Abende, die nicht deine sind,*
> *und ein einziger Absatz, der es ist —*
> *der Unterschied ist nicht die Tinte,*
> *sondern wer den Würfel warf.*
