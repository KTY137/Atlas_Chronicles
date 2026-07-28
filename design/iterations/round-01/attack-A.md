# Attack — Candidate A, "The Living Codex" (**forge 2**)

Nemesis, die Widersacherin · 2026-07-27 · design round 1
Documents under attack: [`product-A.md`](product-A.md) (forge 2, 03:59) ·
[`spike-A1.html`](spike-A1.html) (04:37) · [`spike-A2.html`](spike-A2.html) (04:36)
Corpus read for this pass: [`00-intake.md`](../../00-intake.md) ·
[`02-domain-model.md`](../../02-domain-model.md) · [`03-triumph-ui-direction.md`](../../03-triumph-ui-direction.md) ·
[`RB-11`](../../research/RB-11-steam-vs-browser-verdict.md) · RB-01 teardowns · RB-05 · RB-08.

> **Lineage.** My attack on forge 1 is preserved verbatim at
> [`attack-A-forge-1.md`](attack-A-forge-1.md). This document judges **forge 2 only**. Where a
> forge-1 finding survives untouched I re-raise it and say exactly which forge-2 change failed to
> reach it; where forge 2 killed one, I concede it by number in §"What I could not break".

---

## The strongest reading, stated first

I am not attacking a wiki bolted to a VTT. The strongest reading of this candidate is a single
structural claim, and it is a good one:

> **`Revelation(passage, subject, revision, source, belief)` is one edge that simultaneously is the
> read-authorisation, the provenance stamp, the mechanical activation condition and the epistemic
> timeline — so permission, history, lore and rules stop being four subsystems that must be kept in
> sync and become four views of one row.**

That is genuine parsimony, it deletes the `Timeline` table on merit rather than by deferral, and no
product in the RB-01 teardowns models any part of it. §8's enumerated closure list against code
execution is the best answer anyone in this corpus has written. §7 answers reachability with
arithmetic that can be attacked, which is more than RB-11 demanded and more than forge 1 offered.

So I attack the load-bearing beam, not the trim. My finding is this: **the same edge that makes the
product coherent also makes it leak, because the candidate scoped the passage and forgot to scope
everything the passage is attached to** — the derived number, the provenance stamp, the audit line,
and the share token. Four of my five fatals are one mistake wearing four coats.

---

## FATAL

A CRITICAL from Athena blocks with no override; these are mine, and each is walkable by a person
with the artifact open.

### F1 — The derived number is the leak. §10.2 still does not list it. **[re-raised, unfixed]**

**Status against forge 1.** Forge 1's F1 said invariant 6 (calculation transparency) and invariant 1
(server-authoritative permissions) collide on the derivation view. Forge 2 changed the *schedule* —
§9.2 cuts clauses out of slice 1 — and changed nothing about the design. §10.2 enumerates the read
oracles with real care: `[[` autocomplete, backlink counts, "did you mean", search result counts,
red-link-turning-blue, the share token, 404-vs-403, ETags. **The derivation trace, the roll card and
the shared action log are still not on that list**, and §2 still sells the product on them.

**Scenario.** Session 15, 21:40. Sera holds `p_4f9c` (the ledger clause, `+2 Insight`, scope *House
Vharon finances*). The party is negotiating with the Vharon steward. Kaya calls Insight for
everyone — the normal move; a table rolls together. Sera's client sends 14. Brannt's sends 12.

Both numbers land in the session log, which every client renders, because a VTT that hides other
players' rolls is not a VTT. Timo says the sentence every table says: *"why is hers two higher?"* and
taps the number. Now:

- **The trace opens.** It cites `p_4f9c` — its id, its `+2`, its scope string *House Vharon
  finances*, and per §3.2 its `source` (*Der Eiserne Tresor, unterste Lade*). Four players who hold
  no revelation for that passage now know it exists, what it is worth, what it is about and where it
  came from. **Invariant 1 is gone, through the feature, not through a bug.**
- **The trace redacts.** **Invariant 6 is gone** — and the total still reads 14 against a base of 12,
  so the table learns a secret exists *and* learns its magnitude. §7.4 of spike-A1's own honesty
  panel gets this exactly right for passages ("not greyed out, not redacted — not sent"). Nobody
  carried the principle over to numbers, where absence is impossible: the sum has to be *some*
  number.

There is no third branch. "Show the trace only to the roller" is the fourth branch and it dies at the
table, where the sheet is on a screen three people can see and the GM is being asked out loud.

**Why fatal and not major.** This is the flex. §2's headline is *"a paragraph a character read is a
`+2` on their sheet, and the roll's derivation cites the sentence."* §2 avoids the collision only by
choosing the one audience where it is invisible — a demo with one PC and a friend, no shared check.
Change the audience to the one the product exists for (five players, one shared roll) and the flex is
the leak.

**What a fix costs, honestly.** Either secret clauses may not participate in shared rolls (the table
cannot resolve a check together, and the 21:40 moment dies), or every observer computes a different
total for the same roll (and the table cannot resolve a check together, differently). The honest
answer is probably the first, and it costs the candidate its own advertisement. **Say that out loud
in round 2 or discover it at 21:40.**

---

### F2 — `subject_type: campaign` un-knows and over-knows on membership churn **[re-raised, unfixed]**

**Status against forge 1.** Forge 1's F2 named this. §3.2 of forge 2 is unchanged: `subject_type ∈
{campaign, character, user}`. §6.5 says "roles on memberships, never on users" and stops there.
Nothing in forge 2 addresses what a `campaign`-scoped revelation means when the campaign's membership
set changes — and a five-year world is *defined* by its membership changing.

A campaign-audience revelation is a row pointing at a **set that changes over time**. Membership in
that set is a fact about a join table, not a fact about what a person read.

**Scenario A — the joiner.** Session 20. Mira's friend Jo joins Aldenfall; a `CampaignMembership` row
is written; Jo rolls a character. She opens *House Vharon*. Every campaign-scoped revelation ever
made resolves for her, because that is precisely what the predicate says. Her codex fills with
fourteen sessions of earned canon she was not present for, each stamped *learned Session 6, source:
Lady Ilva Vharon's testimony at court* — on a character who did not exist in session 6. The product's
single most-repeated promise ("the number has an address, and the address has a witness") becomes a
falsehood the trace prints with a timestamp and a source name.

**Scenario B — the leaver.** Timo quits after session 22. Kaya keeps Brannt as an NPC — a normal move
the domain model explicitly supports (`CharacterController` allows a character controlled by nobody).
Timo's membership is revoked. Every campaign-scoped clause on Brannt silently evaluates to false.
**The NPC forgets what he read**, mid-campaign, with no event, no audit row and no notification —
nothing was retracted, the set just got smaller. §3.2 is proud that a revelation is permanent.
Membership churn is a silent bulk revocation with no `AuditEntry`.

**Scenario C — the returning hero.** §6.4 answers character portability "yes, and it is free": one
universe-scope Actor Entry with campaign-scoped children. But a campaign-scoped revelation is keyed
to the *campaign*, not the character — so a hero imported into campaign B arrives holding campaign
B's shared canon and none of his own. §6.4 asserts a property §3.2's schema cannot express, and
§6.4 is the section that calls it "one pattern, three problems."

**Why fatal.** The fix is to materialise per-character revelation rows at reveal time, deleting
`campaign` as a *stored* subject_type (it survives as an authoring gesture that fans out). That is a
schema change to the one table §3.2 and §6.2 call the single most important in the product. It is
cheap in slice 1 and it is a five-year data migration afterwards.

---

### F3 — Provenance has no scope of its own, and the artifact demonstrates it leaking

**The claim under attack.** §3.2: the Revelation carries `source_entry_id` — *who told them. Brother
Alder. The ledger. A dream.* §3.2 calls provenance one of the "four jobs one edge does." The
candidate treats the source as an attribute of the permission grant, and therefore as automatically
safe.

It is not. **The source is a second payload with its own visibility, and nothing in the document
scopes it.**

**Scenario, in the document.** Kaya reveals `p_8f13` (Lady Ilva's mother died the winter the Kestrel
Wing burned) to **the party**, source = *Brother Alder's confession, taken in the second cellar under
the accounting archive*. The party's response body now contains the string. `p_6b18` — *"Under the
accounting archive of the Kestrelhof lies a second cellar that no city plan records"* — is a GM-only
passage nobody holds. The party just learned the second cellar exists, from the provenance field of a
correctly-scoped reveal. If `source_entry_id` instead points at an Entry (as §3.2's field name
promises), rendering it as *"source: The Vharon Ledgers"* leaks the existence, title and slug of an
entry the reader cannot open — and turns a red link blue in their codex, which §10.2 itself lists as
an oracle.

**Scenario, in the artifact — walk it.** Open [`spike-A2.html`](spike-A2.html). Leave the world on
Aldenfall. Set **Rolle → Beobachter** (labelled, precisely, *"Timo (Lesetoken)"* — the anonymous read
token of §4.2.3). The stage is correct: `p_a4` (the forgery) and `p_a5` (the clause) are absent, and
the **Antwort** tab proves the response body does not contain them. Now read the Sitzungsprotokoll in
the shelf, six inches lower:

```text
14·41   Enthüllung p_a5 → Sera Vahn · Quelle: Vharon-Ledger
14·16   Enthüllung p_a4 → Sera Vahn · Quelle: Bruder Alder
```

`renderShelf()` writes `#log` unconditionally; only `#target`, `#b-reveal`, `#b-undo` and `#glance`
are role-gated. So the artifact whose entire thesis is *one projection function is the only place
visibility happens* ships a second, ungated read path that names the withheld passage ids, their
sources and the session they were learned in — to the reader with the fewest rights in the product.

**Why fatal.** This is not a spike slip. It is the doc-level gap made visible: §3.3 rules that every
growth of the world emits an `AuditEntry`, §6.5 keeps `AuditEntry` campaign-scoped and append-only,
§3.4 step 7 generates the recap from the revelation stream — and **the audit stream, the session log
and the recap are not on §10.2's oracle list either.** Three surfaces, all of which by construction
name passages their readers cannot hold, all of them outside the choke point the candidate says is
the whole defence. Invariant 1.

---

### F4 — The party-codex share token: one bearer URL, two opposite intents, no revocation, unpriced

**The claim under attack.** §4.2.3: *"The Party Codex is publishable to an anonymous read link. Not a
new role — a **scoped read token** that resolves server-side to the campaign's revelation
projection."* §10.2 lists "the party-codex share token" among the oracles, so the candidate knows it
is a surface. Naming a surface is not scoping it, and here the design is actively self-contradictory.

**Break 1 — the same mechanism serves two opposite intents.** §4.2.3 wants a private link for five
players who will not install anything. §11.3 wants a published world with a *"built with Chronicle"*
footer that **ranks in search** and is the go-to-market. These are the same artefact in the document
and they have opposite security postures. Nothing in forge 2 distinguishes them: no expiry, no
rotation, no per-player identity, no revocation-on-leave, no `noindex` policy, no rate limit.

**Scenario.** Session 3, Kaya pastes the party-codex link into the campaign Discord so people can
read between sessions. Discord's unfurl bot fetches the URL and caches a preview; the embed shows the
first paragraph of the party codex in a channel with forty people. Session 22, Timo leaves the group.
His membership is revoked (which, per F2, silently un-knows Brannt) — but **the bearer URL in his
scrollback still works**, because a token in a URL is not an identity and §4.2.3 defines no way to
retire one. Session 30, Kaya reveals the campaign's final twist to the party. It appears at that URL
within a second, to everyone who has ever seen the channel.

**Break 2 — it is not in §7.2's bill.** §7.2 prices egress at *"5 clients × 4 h"* and storage at
5 GB/universe. The party-codex token is an unauthenticated, publicly-linkable, deliberately
search-indexed read endpoint on a **one-time €30 licence**. §7.2 does not model it at all: not one
row, not one sentence. The candidate priced the thing it built and did not price the thing it opened.

**Break 3 — the artifact confirms there is no distinction.** `spike-A2.html`, `renderKnows()`:

```js
{ id: "obs", label: pk.observer, d: "Lesetoken → dieselbe Projektion wie die Gruppe" }
…
const eff = r.id === "obs" ? "gruppe" : r.id;
```

The read token *is* the party projection, byte for byte. There is no reduced public edition, no
"published" flag on an Entry, no separation between "my five players" and "the internet". And per F3,
the observer additionally gets the session log.

**Why fatal.** Invariant 1 says client-side hiding is never a security boundary. A bearer token in a
URL with no expiry, no identity and no revocation is not a *server-side* boundary either — it is a
password everyone has and nobody can change. The Observer contract in
[`03-triumph-ui-direction.md`](../../03-triumph-ui-direction.md) is explicit: *"secrets and private
notes structurally absent, not merely visually hidden."* Here they are structurally present and
merely unlinked.

---

### F5 — Item TEMPLATE and item INSTANCE: §6.1's substrate cannot hold §4's promise

**The claim under attack.** §4 (Library): *"Item TEMPLATE and item INSTANCE stay rigorously separate
(invariant 3) — a template is a universe-scope Entry, an instance is a campaign-scope row that
references it and is never mutated by a template edit."*

Now read §6.1's substrate, which is forge 2's proudest structural move. Every durable object is an
`Entry` with `Passage` children and an extension:

```text
Entry ├─ Passage (id, entry_id, ord, block_type, content, clause NULL, anchor_key)
      └─ extensions: ActorExt · SceneExt · ItemTemplateExt · LocationExt · QuestExt · RulePageExt
```

There is an `ItemTemplateExt`. **There is no `ItemInstanceExt`.** So an instance is not an Entry, has
no Passages, and therefore **holds no clause of its own** — the clause lives on the *template's*
passage, which is the only place §6.1 allows a clause to live.

**Scenario.** Universe *Aldenfall* holds an ItemTemplate Entry *Aschener Siegelring*, whose statblock
passage carries `clause: {kind: modifier, target: skill.etiquette, value: +1}`. Three campaigns run in
that universe; nine instances exist across them; Sera has worn hers for eleven sessions. In September
Kaya rebalances the universe template to `+2`. §3.2's revision pinning saves *revelations* — it pins
what a character learned. It does not save instances, because an instance is a row with no revision
and no passage: it dereferences the template and reads whatever the current revision says. **All nine
instances change at once, in three campaigns, mid-campaign, with no diff, no dry run and no
`RulePackageInstallation`-style pin.** Invariant 3, violated by the substrate the candidate promoted
specifically to avoid writing the same mechanism five times.

**The second half of the same hole.** §1's thesis is *"the world is the product"*, and §6.1's rule is
*every durable object gets a mandatory Entry row.* An ItemInstance is the single most story-laden
object class at a tabletop — *the sword that drank the Kestrel's blood in session 9*. Under §6.1 it
cannot be `[[linked]]`, cannot appear in the backlink index, cannot carry a revelation, cannot have a
revision history, and cannot be a wiki page. The candidate that claims everything is an Entry has
excluded the object players name.

**What a fix costs.** Either instances become Entries with copied passages at instantiation (which is
correct, and which is a real cost §9 does not carry — it is content-addressed vendoring at the
*instance* level, B3's mechanism applied one layer down), or §4's sentence is false. Pick one in
writing.

---

## MAJOR

### M1 — §4.1 welds the Forge to the Codex; RB-11 requires it separable by architecture

RB-11 is unambiguous (lines 149–150): *"**That** is the Steam-shaped half of Project Chronicle. Keep
it separable by architecture; decide whether to ship it separately when it exists."* The brief
re-states it as a binding carry: keep the Forge **separable by architecture**.

§4.1 is forge 2's proudest paragraph and it does the opposite: *"the wiki-template editor and the
character-sheet builder are the same tool, because a sheet is a page schema… it is the Codex's own
type editor, and we cannot ship user-defined article types without it."* §6.2 keys `Schema` to
`(universe_id, package_id)`.

A standalone Forge — the WFC generator + theme editor + visual rule-builder, the Dungeon-Alchemist-
shaped single-user artefact that RB-11 says is the only Steam-viable half — cannot be lifted out of a
product where its editor *is* the wiki's type system and its rows hang off `universe_id`. §8/B7's "no
SteamPipe in CI" answers *deferral*, which was never the hard part. **A satisfies the requirement it
was already going to satisfy and breaks the one that costs something**, and does so in the paragraph
it presents as its biggest structural payoff. Not fatal — it is a later rewrite priced at zero today,
which is exactly the shape RB-11 warned about.

### M2 — Reveal is one unmodified letter, with a sticky recipient, on the only action undo cannot undo

`R`. No modifier, no confirmation, and the recipient is whatever the `An` dropdown was left on. A
tired GM at 22:50 who set it to *Die Gruppe* twenty minutes ago, selects the forgery paragraph to
re-read it, and brushes `r` — burns the campaign's central secret to five clients. Undo deletes the
row. **It does not un-read the paragraph.** Invariant 4 exists in this corpus precisely because
irreversible state changes need explicit confirmation, and a revelation is *more* irreversible than a
death: you can resurrect a character.

The artifacts split on this and the split is instructive. `spike-A1.html` guards correctly:

```js
if (k === "r" && !ev.ctrlKey && !ev.metaKey && !ev.altKey) { ev.preventDefault(); enthuellen(); }
```

`spike-A2.html` does not:

```js
if (e.key === "r" || e.key === "R") { e.preventDefault(); enthuellen(); }
if (e.key === "z" || e.key === "Z") { e.preventDefault(); ruecknahme(); }
```

**Walk it:** open spike-A2, click a passage, press **Ctrl+R**. The page does not reload. It reveals.
Same for Ctrl+Z, which fires `ruecknahme()` rather than the browser's undo. Two seats, one house
rule, one seat missed it — which is the argument for the guard being architectural rather than a
habit.

**And the guard both seats have is wrong for the product.** `/^(INPUT|SELECT|TEXTAREA)$/` does not
match `contenteditable`. Slice 1 (§9.1) ships *"a single-user rich-text editor with stable passage
anchors"* as the Primary Stage. A ProseMirror/Tiptap surface is a `contenteditable` div. Kaya fixing
a typo mid-session types `der` — the editor takes the keystroke **and the document-level handler
fires the reveal.** The candidate's headline gesture is a bare letter on a page whose primary surface
is a text editor. §2 even stages it that way: *"She puts the cursor in the fourth paragraph… she
presses `R`."* Either the article is read-only and "puts the cursor" is wrong, or it is editable and
`R` types an r.

### M3 — §7's own arithmetic sets a quota at less than half what §7 says a five-year world needs

§7.2, verbatim: *"Storage per campaign — a five-year codex: ~400 scenes + handouts ≈ **8–20 GB**."*
Six lines later, verbatim: *"the licence includes a hosted quota — **5 GB per universe** and 2
concurrent rooms."*

§1 says the product is *"optimised for the fifth year"*, §10.1 says the value curve crosses the
competition *"around session four"*, and §11.3 says worlds are forkable and publishable. The GM who
lives the thesis — the only customer the thesis is for — hits the paywall in year two or three, on a
**one-time** licence she already paid, for the asset the product told her to accumulate. §7.2 even
computes the failure ("a GM with four worlds breaks it inside three years") and then sets the quota
without reconciling it.

I am not attacking the pricing research; §7.2's inputs are exposed and mostly sound, and that is more
than RB-11 asked for. I am attacking the policy §7.2 derives from its own numbers in the very next
paragraph. Either the quota rises to the estimate, or the licence stops being one-time, or the thesis
stops being the fifth year. Three options, no fourth, and forge 2 picks none.

### M4 — In v1, "self-hostable" means "everyone installs Electron"

§7.3's matrix is the most honest table in either candidate, and its consequence is not drawn.
*Electron host + browser players over the internet: **Not supported in v1**.* *Electron host + browser
players on LAN: works over plain `http://192.168.x.x`, which is not a secure context, so those players
silently lose service workers, WebGPU and OPFS.*

The intake's one-line product definition is *"A browser-based, **self-hostable**… VTT."* Under A's v1,
a self-hosted deployment cannot serve a browser player over the internet at all, and can serve a LAN
browser player only at the WebGL2 floor with no offline cache. So self-hosting in v1 = every
participant installs the desktop client.

That is defensible. What is not defensible is that §11.3 names the *"data-sovereignty-minded,
EU-facing audience"* as the reason the product is trusted at all — and that audience is exactly the
one that will not use hosted rooms, and therefore the audience v1 serves worst. The candidate builds
its trust story on the users its v1 leaves out. Name the tension in round 2; do not let §7.4's
*"Nothing. She never meets CGNAT, because she never hosts"* stand as the whole answer, because it is
the answer for the user who does not want the feature.

### M5 — Launch export ships outbound only. Nobody can bring a campaign in.

RB-11 ¶4 is satisfied in the letter: §8 commits at launch to UVTT/`.dd2vtt` import, UVTT export, and
Foundry/Roll20/FG-shaped **scene export**, plus Markdown/Obsidian vault import. Good, and better than
forge 1.

But read what direction those run. RB-11's evidence is Dungeon Alchemist, which *"reached the whole
market by exporting into its rivals"* — Dungeon Alchemist is a **tool that feeds** the incumbents. A
is a **replacement** for them. The direction that decides whether a Foundry GM switches is *import*,
and there is **no Foundry world import, no Roll20 export ingestion, no Fantasy Grounds campaign
import** anywhere in §8 or §9.

**Scenario.** A Foundry GM with four years of Aldenfall reads the launch page. To evaluate A she must
retype her world, or export scenes to UVTT (losing journals, actors, items, macros, module data — UVTT
is a *map* format) and hand-copy the prose. §10.1 says the value curve needs four sessions of faith;
she cannot reach session one without a week of data entry. Meanwhile §11.3 proudly makes A *"easy to
leave"* — the product optimises the exit and does not build the entrance.

### M6 — Slice 1 ships `Entry.schema_id` with no `Schema` table, against §4.1's own ninety-day rule

§4.1: *"A wiki-first product needs **user-defined page types** (a 'Faction' article, a 'Settlement'
article) within the first ninety days, because otherwise the Codex is one untyped blob."* §6.2 makes
`Schema` one of three new tables and says *"this is what makes §4.1 true."*

§9.1's slice-1 manifest: `Entry`/`Passage`/`Revision`/`Link`/`Revelation`. **No `Schema`.** §6.1's
`Entry` carries a `schema_id` column with nothing to point at. §9.2 cuts the rule-builder; §9.2's
closing line makes slice 2 *"the rule-engine core plus clauses."* So the thing the candidate calls a
ninety-day necessity is in neither of the two slices it plans.

**Scenario — the homebrew player at the table.** Jens wants to run his own system. In slice 1 he gets
one hard-coded article shape and a text field. In slice 2 he gets a rule engine and clauses, still
with no schema editor, so his "Settlement" is a paragraph that says *Settlement*. The candidate's
answer to K2 (§4.1: *"K2 arrives earlier under this thesis"*) is true as an argument and false as a
plan.

### M7 — For two slices the product has nothing a player can see

The flex is `Ctrl+3` / the three-column diff / the Canon Divergence panel / the knowledge matrix.
Every one of them is GM-side. §2's scene is Kaya showing **Timo**, who is not at the table and is not
a customer — RB-11 already ruled that players never buy anything.

The player-facing half exists and is good — the party codex on Wednesday morning (§3.4 step 8) and the
Theory Board (§11.1) — but the Theory Board is a §11 *creative extension*, and the between-session
codex needs the share token that F4 breaks. Slice 1 gives a player: a link, a display name, and an
article that occasionally gains a paragraph. Slice 2 adds a number that goes up.

**Why this is commercial and not aesthetic.** Word of mouth in this market runs player→GM — *"my GM
uses Foundry"* is how a table learns a VTT exists. RB-11 routes discovery through creators and system
authors instead, which is the right ruling and which M6 shows the plan does not serve either (no
schema editor for two slices). So for two slices the product has no player-side pull and no
author-side pull. §10.1 calls cold start the business risk; this is the mechanism behind it, and
§10.1 does not name it.

### M8 — Every key the candidate uses is a screen-reader quick-nav key

Invariant 8: accessibility is architecture. §9.3 gates slice 1 on *"NVDA/Firefox reads the article,
**the reveal**, and the backlink list; keyboard-only completes the whole demo."*

In NVDA and JAWS browse mode, single-letter quick navigation owns **`r` = next radio button** and
**`1`/`2`/`3` = next heading of level 1/2/3**. Those are, exactly and completely, the candidate's
keyboard vocabulary — `R` to reveal, `1`/`2`/`3` to switch reader view (spike-A1 lines 2392–2399;
spike-A2's handler is identical). A screen-reader user in browse mode presses `R` and moves to a
radio button; the page never receives the event. To reach the reveal she must be in focus mode, which
requires focus inside a form control — but the passage handle is a `<button>`, which is browse mode.

So **the gate §9.3 promises cannot pass as specified**, and the failure is not a bug to fix later: it
is the key choice. spike-A1's honesty panel found the sibling problem (Chrome and Firefox reserve
`Ctrl+1…8` for tab switching, so `Ctrl+3` — the gesture printed in §2 — never reaches the page) and
moved the gesture to bare `3`, which is the collision above. **There is currently no working key for
this candidate's core gesture in a browser**, and that is B8 (browser/desktop parity) failing on the
flagship, not on a corner. Credit where due: the seat found half of this itself and wrote it down.

### M9 — The wiki's links are `<button>`s. It is not a wiki.

`spike-A1.html`, `alsProsa()`:

```js
return '<button type="button" class="verweis" data-zustand="' + zustand +
       '" data-slug="' + slug + '" …>' + anzeige + "</button>";
```

Every `[[link]]` in the prose is a button. No `href`. Therefore: no middle-click, no Ctrl-click, no
"open in new tab", no "copy link address", no browser history, no back button, no hover status bar,
no crawlability — and a screen reader announces *"button"* where a wiki reader expects *"link,
visited"*.

**Scenario.** Timo, in §2's own kitchen-table scene, says the thing anyone says in front of a wiki:
*"open the Iron Vault in a new tab so we can compare."* He cannot. Kaya loses her place instead.

This is my answer to "does the semantic layer exist or is it art with divs": mostly it exists —
`<main>`, `<nav aria-label>`, real `<dl>` infoboxes, a correct tablist with arrow keys, `scope`d table
headers, glyph+text+colour for every state, `hyphens: auto` on the reading measure. And then the one
element the entire product is named after is the wrong element. §11.3 additionally wants the exported
static site to **rank in search**; a site whose links are buttons does not rank.

### M10 — The render loop rebuilds the world on every arrow keypress, and O(P × V × R) inside the matrix

`waehle()` → `zeichneBlaetter()` + `zeichneWissen()`. Both are full `innerHTML` replacements. And
`zeichneWissen()` calls the projection *inside the cell loop*:

```js
const zeilen = e.passagen.map(p => {
  const zellen = spalten.map(s => {
    const reihen = projektion(s.id, Z.eintrag);   // full projection, per cell
```

`projektion()` filters the whole `ENTHUELLUNGEN` array and allocates two `Map`s. So the matrix is
O(passages × viewers × revelations) with fresh allocations per cell — and it runs on **every arrow
keypress**.

**Scenario, at the numbers the corpus asks for.** A five-year world, a 300-passage article
(`03-triumph`'s performance reference already sizes a scene at 300 tokens; a long faction article is
the same order), 6 viewers, ~3 000 revelations: 300 × 6 × 3 000 ≈ 5.4 M filter steps plus 1 800 Map
allocations, per keystroke, on the main thread, while the GM holds ArrowDown. Add the 2 000-entry
codex rail, which `zeichneKodex()` rebuilds in full on **every input event** in the search box.

And the part that hurts more than the frame drops: `waehle()` destroys the focused element and
re-queries for it (`document.querySelector('.passage[data-gewaehlt="1"] .passage-griff').focus()`).
Focus is torn down and restored on every keypress, which makes NVDA re-announce the control and makes
the keyboard-only pass §9.3 gates on feel broken even when it technically works.

### M11 — Undo deletes rows from an append-only audit log. Flagged in forge 1, rebuilt, unchanged.

[`02-domain-model.md`](../../02-domain-model.md) refinement 5 is binding: *"`AuditEntry` is
campaign-scoped and **append-only** — no updates, no deletes… It is the substrate for undo, so it is
a first-class table, not logging."*

`spike-A1.html`, in both the reveal-undo and the revoke-undo paths:

```js
zurueck() {
  eintragObj.widerrufen = true;
  const i = AUDIT.indexOf(logZeile); if (i >= 0) AUDIT.splice(i, 1);
}
```

The undo **splices the audit line out**. Forge 1's attack raised this. The seat rebuilt the artifact
at 04:37 and the splice is still there. It is three characters of code and it inverts the one
property the domain model made non-negotiable: after an undo there is no record that the reveal
happened, so nothing in the product can answer *"did you show them that, and then take it back?"* —
which is the exact question §10.5 says the Canon Diff exists to answer.

### M12 — Calculation transparency is present-tense only, and the candidate already invented the fix

Invariant 6: every derived number can show its derivation. `herleitungsBlock()` does, beautifully —
`12 base · +2 clause p_4f9c · = 14`, ending at the sentence and its source. Then revoke:

```js
if (!ein.hat) { return '…<tr class="summe"><td>= 12</td>…<p>Keine Klausel aktiv.</p>' }
```

The derivation for the *current* state is honest and the history is gone. Sera's player watched 14
count down to 12 (`zaehleZahl()` animates it) and her sheet now says the number has always been 12,
with no path to why it changed, because the `AuditEntry` that would explain it is GM-scoped — and per
M11 may have been spliced out anyway.

This is the sharpest available criticism because the candidate **already invented the fix and applied
it to the wrong noun.** §11.2's Canon Divergence renders exactly this for facts — *believed from
Session 6, contradicted Session 19, superseded* — and calls it the thing that makes the product a
story tool. Numbers get no such view. Extend Canon Divergence to derived values and invariant 6 stops
being a snapshot and becomes a differentiator.

### M13 — K5 is Kaya's named flagship and it lands after both planned slices

The intake, K5, verbatim: map representation that beats the competitors (*"wir wollen das nur in
besser"*), map generation as a feature, and *"Kaya explicitly favors WFC… round-1 candidates should
treat WFC-driven, tile/sprite-based map generation as a **flagship bet, not a nice-to-have**."*

A's answer (§4 "Table → the exercise chamber", appendix K5) is: staged. §9.2 cuts maps, tokens, the
Tactical recipe, UVTT and all generation from slice 1; §9.2's own text makes slice 2 the rule engine.
So K5 begins at slice 3 at the earliest, and §1 states plainly that the tactical ceiling is
surrendered.

I am not calling this dishonest — §1 argues the trade openly and §5's ledger is the most honest
competitive assessment in the corpus. I am calling it a **stakeholder collision the verdict must
resolve, not the candidate**: A reallocates the flagship Kaya named to a flagship Kaya did not name.
That is a legitimate thing for a design round to *propose*; it is not a thing a candidate gets to do
quietly, and §9's slice plan does not surface it. Put it to Kaya as a fork.

---

## MINOR

1. **spike-A2 has no `<main>`.** The Primary Stage is `<section class="panel stage">`; the only `<h1>`
   is the test bench's own title and the article title is an `<h2>`. Bench framing, but the artifact
   arguing that a11y is architecture is missing the primary landmark.
2. **spike-A1's popover is `role="dialog"` with no focus trap, no `aria-modal`, no inert background.**
   It focuses the close button and Escape works; Tab walks straight out into the page behind it.
3. **The live region does not re-announce identical messages.** `sagen()` sets `textContent` on a
   `role="status"`; two consecutive reveals with the same wording are announced once.
4. **A 90-character German compound in the codex rail forces a horizontal scrollbar.**
   `.eintrag-knopf .name` has no `overflow-wrap`, and `.sammlung { overflow-y: auto }` makes
   `overflow-x` compute to `auto`. Cosmetic — but this is the German-market product and the rail is
   where 2 000 entries live. (`.log p` in A2 gets it right: `overflow-wrap: anywhere`.)
5. **spike-A2's reveal toast is factually wrong for party reveals.** *"Der Antwortkörper der anderen
   Leser ändert sich nicht."* The observer projection **is** the party projection (F4, break 3), so a
   party reveal changes it immediately.
6. **The backlink index does not exist in either artifact.** `zeichneRueck()` is a hard-coded literal
   array switched on entry slug. §10.2 calls the backlink surface one of the dangerous ones and §6.2
   makes `Link` one of three new tables; neither seat built a line of it. Not a break — a note that
   the round's most-discussed permission surface is the one nobody prototyped.

---

## What I could not break — conceded by name

A clean bill from me has to mean something, so these are concessions, not courtesy.

- **Invariant 2 — no code-execution escape hatch.** §8's target 2 is an *enumerated closure list*, not
  a promise: no embedded HTML/JS/Lua, no scripted SVG (re-encoded or rejected), no remote fetch from
  package data, no `url()` to a non-package origin in theme CSS, no iframes, no template-expression
  evaluation, no dynamic asset loading by constructed path, formulas as an AST over a fixed operator
  set with no host access. I went looking for the hatch — the theme manifest's 9-slice `url()` is the
  obvious one and §8 closes it explicitly. **This is the best single paragraph in the round and it
  should survive into the verdict whichever candidate wins.**
- **Invariant 5 — AI optional.** There is no AI. The recap is deterministic from the revelation
  stream (§3.4 step 7). That is not compliance, it is a position, and RB-05's Dungeon Alchemist
  evidence says it sells.
- **Invariant 9 / K7 — art is content and skin.** `spike-A1.html` loads **zero external resources** —
  no web font, no image, pure CSS tokens and inline SVG — and is genuinely handsome. No depicted world
  is welded into any component. spike-A2 additionally makes *missing art* a first-class axis (`an` /
  `aus` / `fehlt`, with a deterministic sigil fallback), which is acceptance-matrix item 9 and the only
  place in the round it is actually exercised.
- **Invariant 4 — `defeat_pending`.** Not violated. Combat is out of slice 1 and §3.4 step 6 states
  the rule correctly. I looked for an analogue violation in the revelation lifecycle and found a
  **design gap** (M2: the reveal deserves the same confirmation discipline) — that is a
  recommendation, not a violation, and I will not dress it as one.
- **Invariant 7 — provenance.** §4's Library carries the RB-04 ledger properly: SPDX id, author,
  source, checksum, `derived_from`. §11.3 extends `derived_from` to forked worlds, which is the right
  generalisation.
- **Invariant 10 — nothing done without tests.** §9.3's gate list is the strongest in the corpus:
  response-body assertions instead of UI absence, each read oracle enumerated with its own test,
  horizontal privilege-escalation tests, export→import byte-identical diff, axe-core in CI, NVDA and
  keyboard-only and 200 % zoom from slice 1. My F1/F3/F4 are precisely *arguments that this list is
  incomplete* — which is a compliment to the list.
- **XSS.** I hunted in both spikes. `alsProsa()` runs `esc()` **before** the `[[…]]` substitution, so
  display names are already escaped; `slugVon()` sanitises to `[a-z0-9-]`; `popover()` escapes its
  title; the response inspector escapes the JSON; A2 escapes every interpolation in its template
  literals. **I found no injection path.** One note for the build: `esc()` does not escape `'`, which
  is safe only while every attribute uses double quotes — make that a lint, not a habit.
- **Forge 1's F3 is dead.** The embedded query language — *"a second execution language nobody
  scoped"* — is **gone** from forge 2. Removed, not argued away. That is the correct response to an
  attack and I record it as one.
- **The three-column flex at 380 px does not collapse.** I expected it to. `@media (max-width: 900px)`
  turns it into a `grid-auto-flow: column` scroll-snap carousel at `minmax(16rem, 74vw)`, with
  `hyphens: auto` on the reading text and `lang="de"` set. It degrades into a swipe rather than a
  ruin — better than the document claims for it.
- **High contrast × dark.** spike-A2 makes `--hc` a `calc()` factor inside one lightness ladder rather
  than a second palette, which makes the classic failure (a high-contrast block written against the
  light ladder leaking into dark) *structurally impossible* rather than merely absent. Lift the
  seed→ladder→end-token architecture and the live contrast probe out of the spike regardless of who
  wins the round.
- **§7 answered reachability.** RB-11 said a candidate that hand-waves this *"should lose on that
  ground alone."* A did not hand-wave: the arithmetic is shown with its inputs exposed, and §7.3's
  secure-context finding — a LAN browser player on plain HTTP **silently** loses service workers,
  WebGPU and OPFS — is genuinely new to this corpus, correct, and the concrete mechanism behind the
  mixed-content problem RB-09/RB-10/RB-11 flag only in the abstract. My M3 and M4 attack the *policy*
  §7 derives; the pricing itself stands.
- **The 21:00 test, the tablet on 3G.** A is genuinely light here and I could not break it. Slice 1
  has no maps; a player's projection is a small JSON body that gets *smaller* the less they know; the
  shell is capped at 1.2 MB. The three-column view — the only heavy surface — is GM-side. Against a
  table-first rival this is an advantage, and the candidate never claims it.
- **The 21:00 test, the player who joined 20 minutes late.** A has the data to answer *"what did the
  party learn since 20:40"* deterministically, from the revelation stream, with sources. No competitor
  can. **The product document never claims this and no slice builds it** — but the capability is real
  and it is the cheapest win available to round 2.

---

## Verdict

Four of my five fatals are one mistake: **the candidate scoped the passage and did not scope the
things attached to the passage.** The derived number (F1), the provenance source (F3), the audit and
session log (F3), and the share token (F4) are all read paths that name withheld content, and none of
them sits inside the single projection function §10.2 offers as the whole defence. §10.2's oracle
list is careful and it is *short by four* — and the four it is short by are the four the thesis
invented. F5 is the same shape one layer down: the clause is scoped, the instance carrying it is not.
F2 is the one that is genuinely different, and it is the one that costs a migration if it is not
fixed before slice 1 lands.

None of this says the thesis is wrong. The Revelation edge is the best structural idea in round 1 and
§8's closure list is the best paragraph. It says the thesis is **under-scoped by exactly one level of
indirection, everywhere, consistently** — which is a fixable defect and a cheap one *today*.

The strategic exposure is separate and no schema fixes it: M1 (the Forge welded to the Codex against
RB-11), M5 (export without import — the exit optimised, the entrance unbuilt), M6 and M7 (two slices
with no schema editor and nothing a player can see) and M13 (K5 reallocated) together say that A's
first year serves neither the creators RB-11 routes discovery through nor the players who generate
word of mouth. §10.1 calls cold start *"the reason to lose the round if there is one."* It is right,
and M5 + M6 + M7 are the mechanism it does not name.

**One line for Apollon:** *the world is a good product and the passage is a good atom — but a secret
is not only a paragraph. It is also a number, a source, a log line and a URL, and this candidate
guards the paragraph.*
