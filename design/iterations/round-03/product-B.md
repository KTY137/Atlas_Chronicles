# Der Abend (the canon is the residue of play) — Product Candidate B, Round 3

> **Der Kanon ist der Bodensatz des Abends.**
> The canon is what the evening leaves behind. Prep shrinks to a seed; the encyclopedia is
> **minted by play**, not typed before it.

Lineage: evolution of [`../CHAMPION.md`](../CHAMPION.md) v3 (*Das Skriptorium*), under the fork ruled
in [`../round-02/verdict.md`](../round-02/verdict.md) §6: *who — or what — authors the canon?*
The champion assumes **exactly one human, writing alone, before the session.** The rival candidate
detonates *alone*. **This one detonates *before*.**

Everything in `CHAMPION.md` is carried unless this document changes it. Where it changes something,
it says so in those words. Grafts kept from the champion are marked **[C]**; the passage atom, the
Revelation edge, `Sicht`, `Zustand`, the Leak Bench, `oracles.yaml`, `felder.yaml`, the append-only
grant and the eight boundaries are all **[C]** and are not re-argued here.

---

## 1. The thesis

### 1.1 The assumption being detonated

Three rounds have refined *how a GM writes*. Every candidate so far — Das Skriptorium, Der
Zettelkasten, Die Living Codex — asked the same unexamined question: **what is the atom of the thing
the GM types, and when does she type it?** The answer was settled (a paragraph, with bought identity)
and the verdict closed the fork.

The assumption underneath it was never touched: **that authoring is typing, and that typing happens
before Saturday.**

It is false for the artifact Kaya actually described. A campaign wiki is not a book someone wrote. It
is the **precipitate of forty evenings** — the ruling made at 21:47, the name improvised because a
player asked, the secret that came out because somebody rolled a 19, the corridor that mattered
because tokens went down it. In every real campaign the canonical text is written *afterwards, badly,
by someone tired*, or it is not written at all. **That is the actual failure the market has, and no
product in the RB-01 corpus addresses it, because every one of them treats prep and play as two
applications sharing a login.**

So: **the primary authoring surface is the live table.** The die roll, the token move, the ruling, the
spoken line. Prep becomes a **seed** — six to ten lines, some of them sealed. The encyclopedia is the
residue.

### 1.2 Why this thesis is the one that forces a table into existence

The verdict's §2.3 is the strongest finding in three rounds and it is a process failure, not a
candidate's: *"There is still no game in it."* Zero dice, zero HP, zero initiative, zero tokens in any
slice-1 definition until a feature pass bolted on a combat strip. §5.1 made it round 3's binding work
order.

**Der Abend cannot be specified without a table.** Not as a discipline — as a dependency. If there is
no die roll, there is no `Wurf` to cite; if there is no scene, there is nothing to enter; if there is
no `defeat_pending`, there is no Niederschlag to mint. A candidate under this thesis that shipped a
prep tool would be **incoherent**, not merely incomplete. §5 and §7 are therefore the longest sections
in this document, and §7 contains a decomposed day estimate for the tactical half that can be
attacked line by line.

### 1.3 What it optimises for, at the cost of what

**Optimised for: 21:47 on a Saturday, and session forty.** The GM who plays more than she writes —
which is most GMs, and is the one the champion's §16.7 admits it serves worst. The evening as the
unit of authorship. A world that grows on its own schedule, at the moment of maximum context, with a
provenance no retrospective writing can reconstruct.

**At the cost of, stated as costs and not as framing:**

- **Session one, and it is worse than the champion's problem, not better.** A new campaign under Der
  Abend is an empty room with a seed in it. The flex is structurally unreachable before roughly
  session three. Owlbear is ~20 minutes to a table (RB-01-owlbear); we are ~20 minutes to a table
  **and four weeks to a wiki**. The champion's curve crosses Owlbear's at session four; ours crosses
  at session four as well, and until then we look like a worse Owlbear with more chrome. Import is the
  only real palliative (§7.5), and it only serves the migrating GM.
- **The GM with 200 pages already written.** She gets an importer and a shrug. Her existing work
  arrives as canon with no provenance and no residue, and none of this thesis's payoff fires until she
  plays. The champion serves her better.
- **The editor, deferred out of slice 1 entirely.** Long-form prose writing — ProseMirror, the
  identity layer, split/merge, die Zollgrenze, der Nachtrag — moves to slice 2 (§6.4). A GM who wants
  to write an essay tonight cannot, and she will say so, loudly, in a review.
- **The tactical ceiling, permanently.** We pull the table forward and we still ship a **worse table
  than Foundry**, in daylight: no dynamic per-token line of sight, no six wall types × four perception
  channels, no attenuation, no Scene Levels, no 5,338 modules. §8 states this without softening. The
  bet is not that our table is better. **The bet is that our table's events are worth keeping, and
  theirs evaporate.**

### 1.4 The attack this candidate is built to survive, named in advance

> *"The exhaust is a log, not an encyclopedia — nobody has ever shown a friend their audit trail. And
> your table loses to Foundry: you will ship a worse map, worse lighting and worse automation than a
> product with a decade of head start, and your one differentiator will be metadata nobody
> photographs."*

Both halves are correct as stated, and both are answered by a single architectural decision that is
the spine of this document:

> **Nothing becomes canon automatically. There is no session log anywhere in this product, and the
> volatile record of an evening is physically deleted.**

Play produces a **Sitzungspuffer** (session buffer) — rolls, moves, chat, turn order — which is
mutable, uncited, unprojected, unsearchable, absent from every reader surface, and **purged**. The
only path from buffer to canon is **die Prägung** (the minting): one deliberate GM keypress, one
passage, at the moment of maximum context. A four-hour session produces ~40–90 rolls and mints
**6–25 passages.** The other ~800 machine sentences per campaign that round 2's losing candidate
manufactured, and deleted itself (verdict §4, "Deliberately not grafted"), are not filtered here —
**they are never written.**

An audit trail is what you get when a machine decides what to keep. **Der Abend is what you get when a
human decides, once per consequential moment, in two seconds, and everything else evaporates.** The
artifact is not a log view. The artifact is an ordinary, beautiful, Fandom-shaped encyclopedia page
— §2 is what happens when you turn one layer on.

---

## 2. The flex

### 2.1 The moment

Kaya has the **Haus Vharon** article open on her laptop. It is an encyclopedia page and nothing else:
an infobox with nine rows, four sections, twenty-five paragraphs of good German prose, blue links, one
red link, a gallery of three images. Timo reads two paragraphs.

> **Timo:** *„Wie lange hast du daran geschrieben?"*
> **Kaya:** *„Gar nicht."*

She presses **`Ctrl+H`** — *die Herkunftsschicht*, the provenance layer.

The page does not change shape. No panel opens, no modal, no view switch. A narrow gutter appears in
the left margin, and every paragraph gains one small chip.

- **Three chips are grey:** `getippt · Vorbereitung · 14. März`. Three lines. The seed.
- **Twenty-two chips are amber**, and each one carries a **timestamp between 20:00 and 23:40** on one
  of four different Saturdays:

```
  ⚄  21:14 · Sitzung 14 · Menschenkenntnis · Sera · 21 gegen 15
  ⌗  21:29 · Sitzung 14 · Betreten · Archivnische · Sera, Brannt
  ❝  21:22 · Sitzung 14 · vorgelesen · der zweite Keller
  §  21:47 · Sitzung 14 · Regelkarte · „Siegel prüfen kostet eine Handlung"
  ⚄  22:03 · Sitzung 16 · Wissen (Adel) · Brannt · 8 gegen 12  (Fehlschlag — belief: false)
  ✝  22:51 · Sitzung 17 · Niederschlag · Hauptmann Vaugn
```

Twenty-five paragraphs. Three were written. **Twenty-two happened.**

> **Timo:** *„Moment — die Seite ist der Abend?"*

### 2.2 The second beat, which is the one that actually lands

Timo points at paragraph four — *„Das Aschene Siegel, das Haus Vharon bei Hofe vorzeigt, ist eine
Fälschung."* — and at the small superscript marker at the end of the sentence. It looks exactly like a
Wikipedia footnote. He assumes it is a citation to a book.

Kaya presses it. **Der Beleg** opens as a footnote card, in the flow, below the paragraph:

```
[1]  Menschenkenntnis · Sera Valdris · Sitzung 14 · 21:14:38
     1d20 = 13
       + 4   Weisheit
       + 2   du hältst 4 Passagen über Haus Vharon (Sitzung 6, 9, 12, 14)
       + 2   Bruder Alders Hinweis (Sitzung 12)
     ─────────────────────────────────
       = 21  gegen SG 15 · Erfolg
     Regelpaket: hausregeln-aldenfall 2.3 · Klausel k_vharon_kenntnis@r7
```

And then the part that is not metadata. The footnote card has one control: **`[Der Augenblick]`**.

She presses it, and **the map opens beside the article at 21:14:38 on the 14th of June** — the
archive nook, the three tokens where they stood, Vaugn's token two squares from the door, the fog
exactly as Sera saw it, the initiative strip mid-round. The article's footnote is a **time machine
into a tactical scene**.

> **Timo:** *„Warte. Die Fußnote ist ein Würfelwurf, und der Würfelwurf ist eine Szene?"*

### 2.3 Why this is the right flex

**It is a single still image.** One screenshot: a typeset encyclopedia page with an open footnote card
that contains a d20 derivation, next to a map. A knowledge graph does not photograph — the champion's
§16.9 has conceded that for three rounds. **This does**, and it photographs the two halves of Kaya's
sentence *in the same frame*, which is the entire brief.

**It is structurally unreachable for every rival in the corpus**, and for a reason that is not effort:

| Rival | Why it cannot render this frame |
|---|---|
| Foundry | A journal page is an **HTML string**; the smallest permissionable object is a whole page (RB-01-foundry; conceded unbroken by Nemesis in both round-2 attacks). There is no id below the page to hang a footnote on, and a roll is a chat message, not an object anything can cite. |
| Roll20 | No campaign export at all, no sub-page identity, per-player reveal removed with *"no way to turn this back"* (RB-05). |
| Fantasy Grounds | Deep automation over **licensed** content; the story record is a chat log. |
| Owlbear | No sheets, no rules, no journal, **by stated policy** (RB-01-owlbear) — a two-person team that has said it will not become a campaign manager. |
| Alchemy | No tactical map at all, by design (RB-05: *"the 'no map' bet"*). There is no scene for the footnote to open into. |
| TaleSpire | No character sheets and no rules engine after ~5 years of Early Access, both deferred post-1.0 (RB-01-talespire). |

**It requires four things at once, and no product has more than two:** an addressable atom below the
page **[C]**; a per-character revelation with a source **[C]**; a die roll as a **first-class,
citable, durable object** (new, §6.1); and a **Momentaufnahme** — a ≤2 KB scene snapshot captured only
at mint time (new, §6.2).

**And the honest correction the attack will demand before it demands it:** `Ctrl+H` is a **toggle over
a beautiful page**, not a log view, and the difference is load-bearing. If we ever ship a screen whose
default state is a list of events, we have shipped the audit trail and lost the argument. §11 makes
"no session-log surface exists" a refusal, not a preference.

---

## 3. How the two halves fuse

Not "the wiki and the table are integrated." **Five named mechanisms — two mint (table → wiki), two
compute (wiki → table), one closes the loop** — each with a worked instance in §3.6.

### 3.1 Die Prägung — the mint gestures, and there are exactly five

Every mint is: **one keypress · one GM confirmation · exactly one Passage · zero inference · zero AI.**

| # | Gesture | Trigger | Produces | Cost |
|---|---|---|---|---|
| **P1** | **Der Beleg** | `Ctrl+Enter` on a resolved roll card | one Passage, revealed to the roller, `Quelle = Wurf(w)` | ~2 s |
| **P2** | **Der Souffleur** **[C]** | `Space` on a cue card; `Ctrl+Enter` on an improvised line | one Passage, `granted_via: vorgelesen` / `Quelle = Gesprochen` | ~2–6 s |
| **P3** | **Die Regelkarte** **[C]** | one key at the table | one `regel` Passage, `expression_ast = null`, `status: informal` | ~6 s |
| **P4** | **Der Niederschlag** **[C]** | GM confirms `defeat_pending` | exactly one `ereignis` Passage | 1 keypress |
| **P5** | **Die Randfrage** **[C]** | a player anchors a question to a passage she holds | one `frage` row (not a Passage) | ~10 s |

**Betreten ist Ausgeben [C] is deliberately not a mint.** Walking into a region **issues** passages the
GM already seeded; it mints nothing. The champion's rule is correct and it is the boundary that keeps
this thesis from becoming a log: *the only automatic capture in the lineage is one that manufactures
no backlog.* Der Abend keeps it exactly as written.

**The counter-rule, which is the whole architecture:**

> **`Nichts wird automatisch Kanon.`** No roll, no move, no message, no state transition ever writes a
> Passage without a human keypress. Enforced below the programmer: the runtime DB role has **no INSERT
> grant on `passage` from any code path reachable from `session/*`** except the five `praegung.*`
> handlers, each of which requires an explicit `actor_user_id` and a `gesture` discriminator.
> A dependency-cruiser rule reddens the build on any other path. The five handlers are a closed set
> and adding a sixth is a design decision with a verdict, not a feature.

### 3.2 Die Quelle — a closed sum type, and the hearsay edge

The champion's `Revelation.source_ref` is a Passage. Der Abend widens it to a **closed sum with four
constructors**, which is the smallest change that makes the fusion computable:

```text
Quelle =
  | Passage   (pid, gen)                        -- „steht in der Chronik"           [C]
  | Wurf      (wurf_id)                         -- „du hast es erwürfelt"           NEW
  | Gesprochen(session_id, at, gesprochen_von)  -- „es wurde am Tisch gesagt"       NEW
  | Gehört    (from_character_id, via_revelation_id)  -- hearsay                    NEW
```

`Gehört` is the load-bearing one. When Kaya reveals the same passage to Brannt *because Sera told
him*, the Revelation records **who he heard it from and which revelation of hers it derives from.**
That single edge is what §3.4 turns into a number.

**`erfahrungsgrad ∈ erfahren | gehört | gelesen | vermutet` is derived from the constructor, never
stored** — the champion's rule that a field a deterministic process can fill is deleted rather than
defaulted (§8.5 **[C]**, the `confidence` deletion). It gets one row in `felder.yaml` with a disclosure
class, like everything else.

### 3.3 Die Wissensprobe **[C]** — the wiki makes the roll better

Carried unchanged from `CHAMPION.md` §4.4: the clause AST gains `haelt(pid)` and
`haelt_etikett(tag, mindestens: n)`, and invariant 6 prints the derivation **in the roller's own
words**, from her own projection.

Under Der Abend this stops being a graft on the critical path and becomes **slice-1 content**, because
the verdict's §5.1 binding work order says so in those words: *"a roll whose bonus is computed from
the passages a character actually holds, with the derivation printed from her own projection."* §7.2
ships it.

### 3.4 Erfahren schlägt Gehört — the mechanism no rival can copy, and the one this candidate is betting on

The clause AST gains **exactly one more predicate**, over the `Quelle` sum:

```yaml
clause:
  kind: modifier
  target: skill.menschenkenntnis
  value: +2
  when: { erfahrungsgrad: { mindestens: erfahren, thema: "haus-vharon" } }
  disclosure: open
```

So a homebrew rule can read: *„+2, wenn die Figur das selbst erfahren hat; +0 auf Hörensagen."*
And the two derivations, printed to two different players in the same round, read:

```
Sera    +2 · du hast es selbst erfahren (Wurf 21 gegen 15, Sitzung 14, 21:14)
Brannt  +0 · du hast es von Sera gehört (Sitzung 14, 21:16) — Hörensagen zählt nicht
```

**Why no competitor can copy this:** it requires the `Quelle` sum, which requires a durable roll
object, which requires per-character revelation, which requires an atom below the page. Foundry cannot
even express the first step (RB-01-foundry: journal page as HTML string). Fantasy Grounds has the
deepest automation in the market and nothing to compute over — its story record is a chat log.

**Why this is a bet and not a gift, stated here rather than in §9:** it is a mechanic no published
rulebook contains. We are inventing a house rule and wiring it into the engine. It ships as a
**clause in a package**, `disclosure`-tagged and deletable — but if it is off by default, the fusion
mechanism is off by default; and if it is on by default we have shipped opinionated rules into a
system-agnostic product, which K4 says we are not. §9.6.

### 3.5 Der Augenblick — the snapshot that makes the footnote a scene

At mint time — **only** at mint time, never per roll, never per frame — the server captures a
**Momentaufnahme** attached to the `Wurf`:

```text
Augenblick (wurf_id PK, scene_id, region_pid NULL,
            marken jsonb,        -- [{actor_instance_id, x, y, elev, lage}] — ≤40 entries
            nebel_hash,          -- pointer into the fog-state ring, not a copy
            runde, at)           -- ≤2 KB, append-only
```

Twenty-five snapshots per campaign-session, not nine hundred. It is what makes `[Der Augenblick]`
possible and it is why the flex is a scene and not a citation.

**Projected through `Sicht` per reader [C], and this is a new leak surface we hand over honestly:** a
reader sees only the `marken` her character could have observed — same region, or a region she holds.
`Augenblick.marken` gets its own `felder.yaml` disclosure class and its own `oracles.yaml` row
(`augenblick_render`), and the Leak Bench gains a fixture: *a token position in a region a character
does not hold must never appear in her payload, DOM or accessibility tree.* Attack this; it is where
we would leak.

### 3.6 The worked session — Sitzung 14, four hours, real shape

| Time | At the table | What the product does | Mint? |
|---|---|---|---|
| 19:52 | Kaya opens the app | It opens in **Session**, not Story (§4.1). The **Anlass** is six lines; two are sealed. Scene *Vharon-Archiv* is a `.dd2vtt` she imported in ninety seconds: walls, doors, one light. | — |
| 20:04 | Two players join by link, no account | Owlbear's pattern (RB-01-owlbear). Sera's Kodex already holds 34 passages from sessions 1–13. | — |
| 21:14 | Sera rolls Menschenkenntnis against the ledger | Server-side seeded roll. Card: `1d20=13 +4 Weisheit +2 (du hältst 4 Passagen über Haus Vharon) +2 (Alders Hinweis) = 21 gegen SG 15`. **The +2 is real and it is computed from her own projection.** | — |
| 21:14:38 | Kaya: *„Du siehst es sofort — das Siegel ist eine Fälschung."* | `Ctrl+Enter` on the roll card. **Sealed seed line 3 is minted as a Passage**, revealed to Sera, `Quelle = Wurf(w_014)`. Augenblick captured. Footnote `[1]` appears in Haus Vharon. **2 seconds. No typing.** | **P1** |
| 21:16 | Brannt: *„Sag mal — was siehst du da?"* Sera tells him. | Kaya reveals the same passage to Brannt, picking `[von Sera gehört]` in the Reveal Sheet. `Quelle = Gehört(sera, r_0411)`. His book stamps it *Hörensagen*. | — |
| 21:16 | Brannt: *„Wer hat Alder das erzählt?"* Kaya improvises: *„Ein Schreiber namens Ossa."* | `Ctrl+Enter`, one line typed, `[[Ossa]]` red link created, `first_mentioned_in_session: 14`. **6 seconds.** | **P2** |
| 21:22 | Kaya reads the second cellar's boxed text | **Souffleur**, `Space` ×3 **[C]**. Three seeded passages spoken and delivered, stamped *vorgelesen*. Three reader discs fill in as she reads. | **P2** ×3 |
| 21:29 | The party moves tokens into the archive nook | **Betreten ist Ausgeben [C]**: *„3 Passagen dieser Region an Sera, Brannt ausgeben?"* Enter, 4-second abort. **Mints nothing.** Fog opens per character — Vesper's token is elsewhere and her map does not change. | — |
| 21:47 | Argument about whether checking a seal costs an action. Kaya rules: *„Eine Handlung."* | **Regelkarte [C]**, one key, one line, one scope chip. `fire_count = 1`. Nobody waits. | **P3** |
| 22:03 | Brannt rolls Wissen (Adel), gets 8 against 12 | Failure. Kaya mints the *wrong* conclusion he draws, `belief: false` **[C]**. His book will be confidently incorrect until session 19. | **P1** |
| 22:51 | Vaugn drops below 0 HP | `Zustand.lage = defeat_pending` **[C]**. **Nothing dies.** Kaya confirms; one `ereignis` passage. Undo ring intact (50 transitions). | **P4** |
| 23:40 | Session ends | **Die Fällung** (§4.1): *„9 Passagen geprägt · 3 Regelkarten offen · 47 Würfe verworfen · Puffer wird am 10. Juli gelöscht."* Two red links; she promotes the Ossa note into a real `[[Ossa]]` article — two keystrokes. | — |
| Wed 07:40 | Sera on the train, on her phone | Haus Vharon, **her** version: 11 paragraphs, six with die-roll footnotes she can open. Brannt's has 9, one marked *Hörensagen*. Vesper's has 4. **Three different books.** She anchors a Randfrage. | **P5** |

**Play → knowledge: nine mints, forty-seven discarded rolls, zero inference, zero AI, and not one
sentence written by a machine.** Knowledge → play: the `+2` at 21:14 and the `+0` at 21:16 are both
computed from what these two characters actually hold.

---

## 4. The six zones under Der Abend

Per [`../../03-triumph-ui-direction.md`](../../03-triumph-ui-direction.md): the six-zone shell, the
independent axes (content × skin × role × mode × a11y), the three render recipes, the theme manifest,
DOM-authoritative with Pixi behind `MapRenderer`, the accessibility and performance gates and the
non-goals list are all carried **[C]**. Two shell rulings change, and both are consequences of the
thesis rather than taste.

### 4.1 Session → die Fällung. **This is now the home zone, conditionally.**

The champion rules *"Default landing is Story. One routing line; the whole philosophy made visible."*
**Der Abend changes that routing line, because the philosophy changed:**

> **The landing zone is time-dependent.** If a `GameSession` for any campaign the user belongs to is
> `live`, or the wall clock is within a scheduled session window, the app opens in **Session**.
> Otherwise it opens in **Story**. One predicate, one routing line, and it is the whole thesis made
> visible: *the table is not a place you navigate to; it is where the product lives on a Saturday.*

Session has three states, and the third is new and is the thesis's ledger:

- **Vorher — der Anlass.** Not a prep document: a seed. Six to ten lines, `[[links]]`, some sealed. A
  first-class `Entry(kind: anlass)` with a hard soft-cap warning above 20 passages — *„Ein Anlass mit
  40 Zeilen ist ein Artikel. Willst du ihn ins Archiv legen?"* We warn, we do not forbid.
- **Währenddessen — die Kanonleiste.** The mint rail. It replaces the champion's *der Rand* and
  inverts its relationship to the stage: the Primary Stage is the **scene**, and the Kanonleiste
  carries arrivals, presence, the reveal preview, the roll cards awaiting a mint decision, the open
  Regelkarten, and the running mint counter. **The champion's DOM-order rule survives unchanged
  [C]:** the rail precedes the stage in the DOM at all widths, CSS `order` puts it visually right.
- **Nachher — die Fällung.** The precipitation sheet, and the **only** place the buffer is ever
  triaged. It shows what was kept, what is being thrown away with a count, which Regelkarten are still
  informal, and the purge date. It is not a log: it is a **closing balance**, it is reachable exactly
  once per session, and after the purge date it renders as *„47 Würfe · gelöscht am 10. Juli."*

### 4.2 Story → das Archiv

Still the encyclopedia, still the champion's Skriptorium surface, **but it is a reading surface first
and an editing surface second**, and in slice 1 it is a reading surface only (§7.3). Minted passages
land here and accrete into articles. The infobox is N `feld` passages **[C]**. `Ctrl+H` — die
Herkunftsschicht — lives here and is the flex.

**Where the champion put its whole product, Der Abend puts its output.** That is the disagreement in
one line, and §8.7 argues it is also the better battlefield.

### 4.3 Cast → die Zeugen

An `Entry(actor)` is the template; an `ActorInstance` is der Auftritt **[C]**. Under Der Abend a
character page gains one section no rival has: **was sie bezeugt hat** — everything she holds
`erfahren`, separated from everything she holds `gehört`, each row openable into its Beleg and its
Augenblick. A player sheet is an article layout over the same passages plus `Zustand` **[C]** — a
`sheet` recipe, not a second document.

### 4.4 Library → das Regal

Carried **[C]**, plus two typed views the thesis creates: **Belege** (the campaign's rolls that became
canon — a gallery of footnotes, and a surprisingly good screenshot) and **Anlässe** (seeds, which are
the tradeable unit, §10.2).

### 4.5 Table → der Tisch. **The largest surface in the product, and it must exist.**

The champion's Table zone is *„die Wissenskarte, und man schreibt sie"* — a region list you type,
with the canvas deferred to slice 2 and no walls, no LOS, no Pixi hot path. **Der Abend cannot do
that.** A thesis whose atom is a die roll and a token move needs a real map in slice 1. §5 is the
specification and §5.6 is the bill.

### 4.6 Forge → das Formular

Carried **[C]**: Theme Studio, schema/type editor, rule-builder, generators, package tests,
`forge-standalone` CI target with zero imports from `codex/*`, `session/*`, `server/*`. Kept
separable by architecture per RB-11, shipping decision deferred.

One addition the thesis forces: **der Wurfkarten-Editor.** Under Der Abend a roll card is not chrome —
it is a **publishing surface**, because it becomes a footnote in an encyclopedia that outlives the
session. Its layout, its term vocabulary and its seal behaviour are package-authored, `disclosure`-
constrained, and rendered by the same `Sicht` projector as everything else.

---

## 5. The tactical half, specified concretely enough to be costed

This section exists because the verdict's §5.1 demands it and because "your table loses to Foundry" is
half of my death sentence. **The answer is not to win the tactical war. It is to name the exact line
we stop at, and to be excellent below it.**

### 5.1 What ships, precisely

**Scene and grid.** Square, hex (four varieties, pointy and flat, even/odd) and gridless. **Elevation
is a scalar on every placeable from day one** — RB-05 improvement #6 states plainly that designing
elevation into the vision/fog model before shipping is far cheaper than retrofitting, and that Foundry
needed until v14 (April 2026) to make Scene Levels core with its own devs calling vision/lighting/
occlusion under elevation *"challenging problems."* We take the one advantage of being late.

**Map loading.** Tile pyramid with compressed mip-mapped textures (KTX2/Basis), pre-generated zoom
variants. RB-05 improvement #2: Owlbear proved 137 MP on an iPhone 14 Pro Max; Roll20 generates four
variants per upload; Foundry ships KTX2 and still advises ≤50 MB video maps with an open issue (#10343)
asking to serve players a static substitute. Combining the three is a **weeks-scale (M)** win that
kills every published size ceiling in the market at once.

**Tokens.** Placement, drag with server-authoritative move validation, snap per grid type, elevation,
`Zustand` badges (HP band, conditions, `lage`), large-token centroids on hex. Budget from RB-02: 300
tokens per scene, ≤100 animated simultaneously visible.

**Walls: imported, not authored.** **First-class, lossless UVTT / `.dd2vtt` import** — walls, portals
(doors and windows), lights, grid alignment, resolution — shipping in **slice 1**, plus export. RB-05
improvement #4 rates UVTT import **S–M** and records that *no VTT does it well natively*: Roll20's
importer is Pro-gated with open bug threads (*"all my windows are doors"*), Fantasy Grounds needs the
third-party `uvtt2fgu`, Let's Role caps it at 16 MB and static. This is where our walls come from.
**We do not build a wall-authoring tool in v1** — room-trace, flood-fill and magnetic snap (RB-05 #5)
are launch-blocking-later, not slice-blocking.

**Fog: both social models, which nobody ships as core.** Per-character exploration texture **and**
shared-party mode, GM-switchable per scene mid-session, with a reveal/hide brush, a per-reader preview
(*„was sieht Sera gerade?"*) and undo. RB-05 improvement #3 calls this *"the single loudest unmet
demand"*: Roll20 removed per-player reveal with *"no way to turn this back"*, Foundry only added
**shared** fog in 14.359, and Owlbear's per-player fog is a community extension (*Smoke & Spectre!*).

**And the per-character model is nearly free for us and structurally impossible for them:** our fog
state is derived from **revelations over region passages [C]**. *Der Nebel ist nicht Nebel — er ist
die Projektion.* Walls occlude the **reveal shape** when a region is entered; they do not drive a
per-token raycast.

**Dice.** Server-side, seeded, deterministic, replayable. Expression AST over a fixed operator set with
**no host access [C]** — a package cannot supply a roller. Roll card with the full derivation, the
`Trace` sum type (`Complete{terms,total}` | `Sealed{total}`) so a term list that does not sum to its
own total is unrepresentable in the API **[C]**, Publish Trace, Verdeckte Probe **[C]**.

**Combat.** Initiative, turn order, HP, conditions, `defeat_pending` with explicit GM confirmation and
**no auto-death [C]**, per-session undo ring of 50 transitions on `Zustand` **[C]**, turn/condition
timers with per-user alert sounds (stolen from TaleSpire, RB-01-talespire "what to steal" #5).

**Accessibility over the canvas.** Keyboard-walkable scene objects with Tab/Enter/Arrows, screen-reader
descriptions on canvas items, an **Outline recipe of every scene that is a fully usable play surface**
(die Tafel **[C]**). Owlbear shipped the first half in 2.1 and calls it incomplete by their own
admission (RB-01-owlbear); we finish it, and the Outline recipe means a screen-reader player is never
handed a canvas at all.

### 5.2 What explicitly does not ship, ever or for years

- **No dynamic per-token line-of-sight vision.** No `ClockwiseSweepPolygon` equivalent, no six wall
  types × four perception channels × None/Normal/Limited/Proximity/Reverse-Proximity, no directional
  walls, no attenuation, no darkness sources with priority resolution (RB-05 Foundry teardown). Walls
  occlude fog reveal shapes. **Foundry wins this outright and we say so on the marketing page.**
- **No Scene Levels / multi-floor.** Elevation is a scalar and a fog dimension, not a stacked-image
  compositor.
- **No 3D.** **[C]**
- **No animated video map backgrounds.** RB-05: this is a documented pain point that punishes the
  weakest player's hardware with no mitigation. Sprite/tile-atlas animation (RB-05 #8) is the right
  answer and it is post-launch.
- **No WFC in slice 1.** RB-05's own sequencing: *"generation is only impressive if what it generates
  is immediately playable"* — layout first, WFC as the detail filler, after the region model and the
  wall model are stable. K5's flagship lands in slice 3 and Kaya must rule on that reallocation
  (`OPEN-DECISIONS.md`).

### 5.3 Renderer, and the parity rule

PixiJS behind the `MapRenderer` boundary, DOM authoritative, canvas is **one view** **[C]**. RB-02's
budget is adopted verbatim as CI gates: 60 fps sustained on a 2020–2022 integrated-GPU laptop, ≤1,500
wall/LOS segments, 20 dynamic lights, ≤16 distinct textures per frame, ≤150 draw calls, **zero
per-frame allocations on the hot path**, ≤400 MB CPU / ≤250 MB GPU, LOS/fog recompute ≤8 ms in a
worker at most once per token *settle* (not per drag pixel), token transforms ≤20 Hz.

**WebGPU is an opt-in fast path, never a dependency.** WebGL2 is the guaranteed path; RB-02 puts
WebGPU reach at roughly 70–85 % and warns against production dependence for us specifically. **No
feature may be gated on WebGPU** — that is boundary B8 **[C]** (no desktop-only feature without a
designed browser fallback) applied to the renderer.

### 5.4 Automatic per-client quality negotiation

RB-05 improvement #10, which **nobody** does automatically: measure each client's frame time and
automatically drop that client to a lower fog resolution, reduced particle density, or a static map
substitute — the thing Foundry issue #10343 asks for and FXMaster only approximates with a manual
Performance Mode. Plus the **scene budget lint** at prep time: *„Diese Szene hat 3.900 Wände, 60
Lichter und ein 2160p-Video; dein Spieler mit integrierter Grafik sieht ~20 fps."* Owlbear's honest
quality switch is the pattern (RB-01-owlbear "what to steal" — *copy it outright*), exposed as a named
GM choice rather than a hidden heuristic.

### 5.5 Touch and the physical table

RB-05 improvement #11: Foundry has **no native touch support** and needs TouchVTT, which *"can go a
bit jittery when it tries to distinguish between pan and zoom gestures."* Owlbear is the only product
that treats touch as a feature. One input abstraction — momentum pan, pinch-zoom, large hit targets —
which is the same abstraction that produces keyboard-navigable map controls, so a11y and touch are one
line item, not two.

### 5.6 The bill, decomposed so it can be attacked

One developer with an AI crew, tactical half only:

| Item | Days | Risk |
|---|---:|---|
| `MapRenderer` boundary, Pixi scene graph, one input abstraction (pointer/touch/keyboard) | 8 | med |
| Tile pyramid, KTX2/Basis, zoom variants, streaming | 10 | med |
| Tokens: placement, drag, snap ×3 grid types, elevation, server-authoritative move validation | 8 | low |
| UVTT `.dd2vtt` import **and** export (walls, portals, lights, grid, resolution) | 6 | low |
| Fog: GPU exploration texture, **both** social models, brush, per-reader preview, wall occlusion, undo | 12 | **high** |
| Combat: initiative, HP, conditions, `defeat_pending`, undo ring, timers | 7 | low |
| Dice: seeded server roller, expression AST, roll card, `Trace` sum type, Publish/Verdeckte Probe | 9 | med |
| **Die Prägung**: five mint handlers, Sitzungspuffer + TTL + physical purge, die Fällung, der Augenblick | 10 | med |
| Accessibility over the canvas + the Outline recipe as a real play surface | 8 | **high** |
| Perf harness, budget scene, CI gates, in-app perf HUD | 4 | low |
| Contingency (20 %) | 16 | |
| **Total** | **98** | |

**Two falsifiers, on the two high-risk lines, stated so the ledger can check them:**

1. **If fog exceeds 20 days, the shared-party model is cut** and we ship per-character only, and the
   round says so. Per-character is the one that is ours; shared-party is the one that is table stakes.
2. **If accessibility-over-canvas exceeds 14 days, the canvas ships with the Outline recipe as the
   sole screen-reader path** and the marketing claim narrows to *"every scene is fully playable
   without the map"* — which is true, testable, and still better than every rival — rather than
   *"the map is accessible."*

**And the honest arithmetic against the champion:** ~60 days of editor leave slice 1 (§6.4), ~98 days
of table arrive. **Slice 1 grows by roughly 38 days.** That is the price of having a game in it after
three rounds of not having one, and it should be attacked as a schedule risk, not defended as a
feature.

---

## 6. The data shape

[`../../02-domain-model.md`](../../02-domain-model.md) is inherited whole: `User →
UniverseMembership → Universe → Campaign → GameSession`, roles on memberships never on users,
`AuthSession ≠ GameSession`, `Actor` as the aggregate with `CharacterProfile` as an extension,
`CharacterController` on `actor_id`, `RulePackageInstallation` as its own table, `KnowledgeEntry`
scoping as a DB constraint, `AuditEntry` campaign-scoped and append-only, Timelines deferred to a
nullable column, Universe invisible until a second campaign needs it.

`CHAMPION.md` §8 is inherited whole: `Entry` / `Passage` / `Revision` / `PassageId` /
`PassageLineage` / `Link` / `Revelation` / `PassageRelation` / `Etikett` / `Haltung`, `Zustand` +
`ActorInstance` as the second explicitly-mutable substrate, the three presence concepts, the
`.chronicle` format carrying `lineage.jsonl` and the pid registry.

**Five changes. Two new tables, one widened column, one new enum, one new grant class.**

### 6.1 `Wurf` — a die roll is a first-class, citable, durable-on-demand object

```text
Wurf (id, campaign_id, session_id, actor_instance_id, actor_id,
      ausdruck,                    -- the AST, not a string
      terme jsonb,                 -- [{quelle, wert, klausel_ref, begruendung_pid?}]
      wuerfel jsonb, seed,         -- raw results + the seed: replayable, verifiable
      ergebnis, ziel NULL, ausgang ∈ erfolg | misserfolg | kein_ziel,
      paket_pin (paket_id, version, klausel_revision),
      trace ∈ Complete | Sealed,
      dauerhaft boolean DEFAULT false,   -- promoted on citation
      geworfen_at, ttl_at)
```

- **`seed` + `ausdruck` + `paket_pin` make a derivation reproducible in 2031.** A footnote printed in
  session 40 resolves the clause that was in force at 21:14 in session 14, not today's. This extends
  the champion's boundary **B3** — *a package upgrade mid-session cannot change what a character
  already knows* — to *a package upgrade in 2029 cannot change what a die roll meant in 2027.* It is
  one of RB-11's five named attack targets (the live session's package-version pin) and this is the
  answer.
- **`dauerhaft` is the seam between the two invariants**, and §9.4 is honest that the seam is the
  hardest unsolved problem in this candidate.

### 6.2 `Augenblick` — §3.5. One row per mint, ≤2 KB, append-only, `Sicht`-projected.

### 6.3 `Sitzungspuffer` — the volatile substrate, and the anti-log invariant made physical

```text
Sitzungspuffer (session_id, seq, art ∈ wurf | zug | nachricht | zustandswechsel | reihenfolge,
                nutzlast jsonb, at, ttl_at)
```

- The **only** table in the product whose runtime role holds `DELETE`. `AuditEntry` and
  `PassageLineage` keep `GRANT INSERT, SELECT` and nothing else **[C]**.
- **Purged at `session_ended_at + 14 days`** by a job with its own CI test asserting the rows are
  physically gone, not tombstoned.
- **No reader surface renders it.** There is no `oracles.yaml` row for a session log, because there
  is no session log. A dependency-cruiser rule fails the build on any response serializer importing
  `Sitzungspuffer` outside the live-session socket handler.
- A `Wurf` cited by a mint has `dauerhaft = true` and **leaves the buffer's purge scope**.

### 6.4 `Revelation.source_ref` widens to `Quelle`, and `Passage` gains one column

`Quelle` is the closed four-constructor sum of §3.2. `Passage` gains exactly one column:

```text
Passage.gepraegt_durch ∈ getippt | wurf | gesprochen | regelkarte | niederschlag | import
```

**That single enum is the flex.** `Ctrl+H` (§2.1) is one column plus the Revelation edge the champion
already owns. It costs one migration and it is the cheapest differentiator in three rounds of
candidates.

### 6.5 `Szene` gains layers, so imported and generated maps land in the same shape

```text
SzenenEbene (scene_id, kind ∈ bild | wand | portal | licht | raster | markierung,
             herkunft ∈ uvtt | gezeichnet | generiert | import,
             daten jsonb, ord)
```

A Scene is still an `Entry` and its regions are still Passages **[C]** — so the Outline recipe is
still a document, the Wissenskarte still projects per reader, and a `.dd2vtt` import and a future WFC
generation both land as `SzenenEbene` rows with a provenance tag. One shape, three producers.

### 6.6 What does not change, and why that matters

`Zustand` stays mutable, never in a Revelation, never citable, never in an arrangement, exported as a
savegame section **[C]**. **Token positions are `Zustand`, not knowledge, and they never mint.** The
only place a position ever becomes durable is the `Augenblick`, attached to a `Wurf`, captured by a
human keypress. The CI rule that asserts no `Zustand` key is reachable from `Revelation` / `Link` /
`PassageRelation` **[C]** is extended to `Augenblick.marken` being reachable **only** through the
`augenblick_render` oracle.

### 6.7 The identity dividend — the reason this candidate is cheaper where it counts

The champion buys passage identity for **116 SLOC + a server-side registry + mint leases +
`StructuralIntent` + a bounded convergence loop**, and it is right to, because **`splitBlock` copies
node attributes into both halves** — writing destroys identity, and three fatals came out of that one
fact.

**Under Der Abend, in slice 1, a passage is minted whole and is never split, because it was never
typed.** One gesture, one server-side mint, one pid, one generation. The registry, the leases, the
intent journal, the fixpoint loop, die Zollgrenze, der Nachtrag and die Schonfrist are **all
consequences of an editor**, and slice 1 has no editor.

> **The champion's atom is bought at the price of a text editor. Der Abend gets the same atom for
> free, because minting is where identity comes from.**

The editor is not cheaper here. **It is later** (§7.3), and it arrives in slice 2 with the champion's
entire measured hardening — the spike, the 27 assertions, the three repairs — intact and unchanged.
This candidate does not re-litigate the editor. It declines to put it in slice 1.

---

## 7. The first slice

**Slice 1 — „Der Beleg".** One workflow. One universe, one campaign, browser only, hosted room, three
people, one evening, one map.

### 7.1 The workflow, end to end

1. Kaya creates a campaign and writes an **Anlass**: six lines in a single-line inline composer —
   plain text, `[[links]]`, no rich text, **no document editor**. Two lines are marked `versiegelt`.
2. She imports one `.dd2vtt`: walls, doors, one light, grid aligned. Ninety seconds. She places three
   tokens.
3. Two players join by link, display name, **no account**.
4. **Sera rolls Menschenkenntnis.** The roll is server-side and seeded, and its card prints:

   ```
   1d20 = 13
     + 4  Weisheit
     + 2  du hältst 3 Passagen mit #haus-vharon (Sitzung 6, 9, 12)
   ───────────────────────
     = 19  gegen SG 15 · Erfolg
   ```

   The `+2` is **not a constant**. It is `haelt_etikett(tag: "haus-vharon", mindestens: 3)` evaluated
   against Sera's own projection, and it prints in her own words. This is the verdict §5.1 work order,
   discharged in slice 1 rather than promised in slice 2.
5. **Kaya presses `Ctrl+Enter` on the roll card.** The sealed seed line is minted as a Passage,
   revealed to Sera with `Quelle = Wurf(w_014)`, and an `Augenblick` is captured. A footnote appears
   at the end of that sentence in the Haus Vharon article.
6. Brannt asks; Kaya reveals the same passage to him choosing **`[von Sera gehört]`**. His book stamps
   it *Hörensagen*. **His next roll on the topic gets `+0` where Sera gets `+2`, and both derivations
   say why.**
7. The party enters the archive region. **Betreten ist Ausgeben** offers to issue its seeded passages;
   fog opens per character; Vesper's map does not change and her payload contains none of it.
8. A guard drops below 0 HP → `defeat_pending` → Kaya confirms → one `ereignis` passage minted → she
   undoes the last two `Zustand` transitions and the passage stays, honestly (§9.5).
9. **Die Fällung:** *„6 Passagen geprägt · 41 Würfe verworfen · Puffer wird am 10. Juli gelöscht."*
10. **Wednesday morning, a phone:** Sera's Haus Vharon has four paragraphs, three with openable
    die-roll footnotes; Brannt's has three, one marked *Hörensagen*; Vesper's has one. **Then
    `Ctrl+H`, and the flex.**
11. Export → import into an empty instance → diff empty, including lineage, the pid registry, `Wurf`
    rows marked `dauerhaft`, and `Augenblick` rows.

### 7.2 Contents

Accounts / campaign / membership / **server-side permissions** · `Entry` · `Passage` · `Revision` ·
`Revelation` with the `Quelle` sum · `Etikett` · `Haltung` · `Link` · `Zustand` · `ActorInstance` ·
**`Wurf` · `Augenblick` · `Sitzungspuffer` with TTL and a physical-purge CI test** · the five
`praegung.*` handlers with the closed-set dependency rule · **die Fällung** · **der Souffleur [C]** ·
**die Regelkarte [C]** · **die Randfrage [C]** · **der Tisch**: Pixi behind `MapRenderer`, tile
pyramid, tokens with three grid types and elevation, **UVTT import and export**, fog in both social
models with per-reader preview, initiative / HP / conditions / `defeat_pending` / undo ring, the
seeded server-side dice engine with the `Trace` sum type · **die Tafel [C]** as the Outline recipe and
a real play surface · **Betreten ist Ausgeben [C]** · the clause engine restricted to **exactly three
predicates** — `haelt`, `haelt_etikett`, `erfahrungsgrad` — with required `disclosure` · the article
stage with infobox `feld` passages, backlinks, real `<a href>` routing, cold server-side GET, uniform
**404-never-403 with a timing-variance test [C]** · **`Ctrl+H` die Herkunftsschicht** ·
**`Sicht` + `felder.yaml` [C]** · `visible_passages` + `visible_events` + `oracles.yaml` + the
dependency-cruiser rule + **the Leak Bench seeded red [C]**, with three new fixtures (an `Augenblick`
mark, a `Wurf` term citing an un-held passage, a hearsay chain) · append-only `AuditEntry` by DB grant
**[C]** · **Leseschlüssel** + the personal Kodex on a phone **[C]** · `.chronicle` round-trip in CI ·
the `Archive` skin only, Clean reachable via the a11y axis · the `Platform` port with both impls
**[C]**.

### 7.3 Explicitly not in slice 1 — and this is where candidates cheat, so read it twice

**ProseMirror. The identity registry. Mint leases. `StructuralIntent`. Split and merge. Die
Zollgrenze. Der Nachtrag and the recipient grid. Die Schonfrist. Die Fassungsprobe. `PassageLineage`
as a live mechanism.** All of it is slice 2. Slice 1's composer writes **one passage at a time** and
cannot split one.

Also out: dynamic LOS vision · wall authoring · Scene Levels · animated maps · WFC · the second skin ·
the theme editor · the Forge · the visual rule-builder · Electron · universes as a visible concept ·
collaborative editing · item templates and inventories · AI of any kind · `PassageVariant`.

**If slice 1 must shrink, the honest cut order is:** (1) the shared-party fog model, keeping
per-character; (2) UVTT *export*, keeping import; (3) die Randfrage; (4) hex and gridless, keeping
square. **Never the mint handlers' closed set** (it is the anti-log invariant), **never `Sicht`** (it
is the enforcement story), **never the `haelt_etikett` bonus** (it is the fusion), and **never `Ctrl+H`**
(it is the flex).

### 7.4 Why this slice is honest about demonstrating the flex

`Ctrl+H` over a four-paragraph article after one session is a *weak* version of §2 — three amber chips,
not twenty-two. **The flex is real at session one and only becomes a photograph at session four.**
Saying otherwise is the offence the verdict caught candidates committing. Two mitigations, both real
and neither a cure:

- **Import gives the flex a history it cannot otherwise have before month four [C].** A migrating GM's
  Foundry world arrives, and the **Nachtragsgewährung** screen — *„1.106 Passagen sind Kanon. Was
  weiß die Gruppe schon?"* — is our core gesture performed on her own four-year world. Those passages
  arrive `gepraegt_durch: import` and are **grey** in the Herkunftsschicht, honestly.
- **The acquisition still is still die geteilte Infobox [C]** — one page, five readers, five different
  pages, in a world ninety seconds old. Der Abend does not replace it; it needs it, precisely because
  the thesis has nothing at minute one.

### 7.5 Launch-blocking, distinct from slice-blocking

| Item | Days | Status |
|---|---:|---|
| The editor half — ProseMirror, identity registry, `StructuralIntent`, Zollgrenze, Nachtrag, Schonfrist | ~60 | **slice 2**, carried unchanged from `CHAMPION.md` §2.1 |
| Foundry world import + Obsidian/Markdown vault import | 9 | launch-blocking |
| Roll20 campaign JSON import | 8 | launch-blocking **(verdict §12.2 ruling, kept)** |
| Fantasy Grounds campaign XML import | 7 | launch-blocking **(verdict §12.2 ruling, kept)** |
| Foundry-shaped journal **export** — *"the sanitiser run backwards"* | 3 | launch-blocking |
| Visual rule-builder, **schema-form half only** | 15 | launch-blocking, falsifier at 20 **[C]** |
| Electron desktop host (+ NVDA-through-shell and footprint spikes) | 10 | launch-blocking — it **is** the self-hosting invariant **[C]** |

RB-11 rules that discovery runs through creators and system authors, and that Dungeon Alchemist
reached the whole market by exporting to its rivals (€2.46 M from 57,209 backers). **UVTT import and
export are in slice 1, not launch-blocking-later** — earlier than the champion places them — because
under Der Abend our walls come from UVTT anyway, so the import is load-bearing rather than
charitable.

---

## 8. The differentiation ledger

**A ledger with no losses is a lie.** Every row's second column is written to be quoted against us.

### 8.1 Foundry VTT

**What we do that they cannot.** Bind a die roll to a sentence. A Foundry journal page is an **HTML
string**, so the smallest object it can draw a permission boundary around is a whole page
(RB-01-foundry; the argument Nemesis attacked in both round-2 candidates and conceded unbroken in
both). There is no id below the page for a footnote to anchor to, and a roll is a chat message that
nothing can cite. Their **Scene Regions V2** with attachable Behaviors — *"when token enters region,
do X"* — is the closest thing in the market to Betreten ist Ausgeben, and it acts on **scene state**,
never on **who knows what**. And retrofitting sub-page identity means touching every journal read path
in an ecosystem where **only 1,590 of 5,338 modules were V14-compatible a month after V14 shipped**,
in a company that abandoned even the **PixiJS v7→v8 renderer migration** mid-cycle as *"far more
sweeping and disruptive than we had planned"* (RB-05). **The same ecosystem anchor that froze their
renderer freezes their schema.**

**What they still do better, and it is most of a VTT.** Six wall types × four perception channels ×
None/Normal/Limited/Proximity/Reverse-Proximity, directional walls, attenuation,
`ClockwiseSweepPolygon`, darkness sources with priority resolution, Scene Levels since v14, a particle
generator API, 475 game systems, 5,338 modules, $50 perpetual with players free, ten years of trust,
a Marketplace that went 557 → 1,227 products in year one. **For a table that wants to play 5e tonight
with bought content and good lighting, Foundry beats us outright and will for years.**

### 8.2 Roll20

**What we do that they cannot.** Everything in §8.1, plus: they have **no campaign export at all**,
unreliable character transfer, and declined custom-content export — the most-resented failure in the
category, and the reason *"here is your world, and here is the door out"* converts. They **removed**
per-player fog reveal with *"no way to turn this back"* (RB-05); our per-character fog is not a
feature we added, it is what the projection already is. Their UVTT import is a **Pro-gated API script**
with open bug threads (*"all my windows are doors"*).

**What they still do better.** ~10 M accounts and the LFG network effect — the one asset nobody can
buy. Licensed compendiums. Zero-install browser reach on day one. Jumpgate is putting real investment
into canvas performance.

### 8.3 Fantasy Grounds

**What we do that they cannot.** Declarative, versioned, no-code rule packages against XML/Lua with a
paid third-party low-code tool as the ceiling; browser and phone reach against a desktop install;
accessibility, which is absent from their marketing, docs and roadmap (RB-01-fantasy-grounds). And the
whole of §3: their story record is a chat log.

**What they still do better, and one of these costs us money every month.** The deepest rules
automation in the market; ~3,858 licensed products; **fully free since 2025-11-08**, which removed
their historic price objection; and **a cloud relay that already solves reachability for their users,
for free.** §12 is the section where we pay for what they give away. That is our single worst
structural disadvantage and it is not closable by design.

### 8.4 Owlbear Rodeo

**What we do that they cannot.** No character sheets, no rules layer, no system support, no campaign
management, **by stated policy** — a two-person team that has said it will not become a campaign
manager (RB-01-owlbear). Their fog can never become a knowledge projection because they have no
knowledge model to project. Their extensions are iframes with separate Patreons.

**What they still do better.** Minute one, which is the moment the market decides: ~20 minutes to a
running table, account-free joins in seconds. **Renderer engineering**: Warp Core, a 137-megapixel map
on an iPhone 14 Pro Max, tiled streaming, GPU soft shadows, ~130 MB CPU / 64 MB GPU for 100+ animated
tokens — RB-02 uses their numbers as our sanity reference, which means **their engine is our
benchmark, not our target**. **Forecast**: one-click CV auto-fog, the single biggest prep-minute
killer anyone has shipped. And the **explicit quality switch**, the cleanest performance-UX decision
in this market, which we copy outright.

### 8.5 Alchemy RPG

**What we do that they cannot.** They have **no tactical map at all**, by design (RB-05: *"the 'no
map' bet"*), so §2's second beat — the footnote that opens into a scene — has nothing to open. Their
Sheet Builder has no formula language with a trace, no versioned packages and no sharing economy for
homebrew.

**What they still do better.** The best-looking product in the category, built-in voice and video, a
native Streamer Mode, and a **shipped no-code Sheet Builder in open beta** — they beat us to the first
half of K2 and they will out-pretty us for a year. Our answer must be *deeper*, not prettier.

### 8.6 TaleSpire

**What we do that they cannot.** No character sheets and no rules engine after ~5 years of Early
Access, both explicitly deferred post-1.0; fog of war sent *"back to the drawing board"*; no
accessibility features documented; English only; desktop only; no general campaign export
(RB-01-talespire).

**What they still do better.** The gasp. 2,100+ tiles, real 3D dioramas, ~90 % positive across 4,300+
reviews. And **slabs** — boards as compact pasteable text strings, the most elegant sharing primitive
in the category, whose shape we steal twice (§10.3). **We cannot out-photograph a diorama and we
should stop trying [C].** Our still is a footnote that is a die roll. Theirs is a room.

### 8.7 The rivals the champion chose to fight, and why Der Abend leaves that battlefield

The market judge's core objection to the champion (verdict §2.1) was that it *"chose the worst
possible battlefield"*: its unique behaviour lives on the **writing surface**, where **Obsidian is
free, local, offline, instant and already installed with no visibility tax whatsoever**, where Notion's
editor is better than we ship in year one, and where Foundry V14's journal is *already* ProseMirror.
The champion's own §1 concedes *"we do not win on the editor."*

**Der Abend does not fight there.** Obsidian, World Anvil, LegendKeeper, Kanka and Notion are not at
the table. None of them can be handed a die roll. The champion's flip condition in verdict §3.1 —
*"wrong if the writing surface is genuinely lost"* — is answered not by winning the editor but by
**re-siting the product's unique behaviour onto a surface those five products structurally cannot
occupy.**

**The honest price of that move, and the attack pass should press on it:** we trade a battlefield we
lose (writing) for one we also lose (tactical maps, §8.1). The claim is not that our new battlefield
is winnable head-on. It is that **the product's unique behaviour now lives at the intersection**, where
the five wiki products cannot go and the six VTTs have no data model — and that an intersection with
two mediocre halves and one impossible mechanism beats a strong half on a crowded field. **That is the
bet, and it is falsifiable: if a table would rather have Foundry's lighting than our footnotes, we
lose, and no amount of provenance changes that.**

---

## 9. Weaknesses

### 9.1 The mint is a keypress the GM will not make at 21:47

This is the thesis's central falsifiable bet, and it is the exact mirror of the champion's unmeasured
visibility tax. If the mint rate in a real four-hour session falls below **~8**, the encyclopedia never
forms, `Ctrl+H` shows a mostly-grey page, and we have shipped a mediocre VTT with an unusual footnote
control. Everything in §2 depends on a number nobody has measured.

**Gate, so it can go red:** instrumented four-hour session — **≥8 mints**, **≤4 minutes total GM
typing on product chrome**, **no single interaction over 12 s**, and at session end the GM names ≤2
moments she wishes she had minted and did not. Red falsifies the thesis and the round must say so
before marketing does.

### 9.2 Session one is empty, and it is worse than the champion's minute-one problem

The champion is slow to a first artifact for the GM who does not write. **Der Abend is slow to a first
artifact for everyone**, because the artifact is made of evenings and there have been none. A prospect
evaluating us on a Tuesday afternoon sees a seed, a map and an empty encyclopedia. Owlbear gets them
playing in twenty minutes with none of our chrome (RB-01-owlbear).

Import and the split infobox are palliatives (§7.4) and neither is a cure. **We are asking a market
that decides at minute one to wait until session four**, and we are asking it more loudly than the
champion did.

### 9.3 The table loses to Foundry, in daylight, and we ship the concession in writing

§5.2 and §8.1. No dynamic LOS, no wall semantics, no Scene Levels, no 475 systems, no 5,338 modules,
no decade. Our fog is beautiful and per-character; their vision is a decade of `ClockwiseSweepPolygon`
and six wall types × four perception channels. **A table that switches to us for the map will be
disappointed within one session,** and our own §5.4 quality lint will be the first thing that tells
them so.

### 9.4 **[HARD]** The deletion invariant and the append-only invariant are in direct tension, and the seam is unsolved

This is the item most likely to force a v2 rewrite, and there is no clean answer.

The Sitzungspuffer is **physically deleted**; `AuditEntry` and `PassageLineage` are **append-only by DB
grant**. A cited `Wurf` must survive; an uncited one must vanish. Promotion happens at mint time — but
**the thesis explicitly wants retroactive citation**: on Wednesday the GM realises Tuesday's throwaway
roll mattered and wants to mint it. So the buffer cannot be purged eagerly.

Both horns draw blood:

- **Eager purge (at session end)** breaks retroactive minting, which is one of the two mechanisms that
  make Der Abend forgiving of a GM who was too busy to press `Ctrl+Enter` at 21:14 — i.e. it worsens
  §9.1, the thesis's most dangerous weakness, in order to strengthen a privacy claim.
- **Lazy purge (14-day TTL)** means *"we delete the exhaust"* is a **retention policy, not a
  property**. For fourteen days the full record of an evening — every roll, every move, every message
  — is on disk, subpoenable, backed up, and discoverable. A GM who believed the marketing has been
  misled by exactly the margin the champion's §5.6 warns about: *a safety mechanism manufacturing
  unearned trust*.

**We choose 14 days and print it on the tin**, in the Fällung sheet, in the privacy page, and in the
first-run flow. That is a policy dressed as an invariant and the attack should say so. Worse: the
right-to-erasure collision the champion names in §16.11 now has a second front, because a `Wurf`
citing a person's contributions is durable by design while the buffer around it is not.

**The honest statement: this is the one place where Der Abend's headline claim is weaker than its
prose.** We do not have the answer.

### 9.5 A citable roll collides with the undo ring

`Zustand` carries a bounded 50-transition per-session undo ring **[C]** so the table gets a real undo
while knowledge stays append-only. But a **minted** `Wurf` is immutable and its `Augenblick` describes
a board state. Undo a combat round after minting a Niederschlag, and the canon holds a passage whose
evidence depicts a state that was rolled back. The champion's **Berichtigung** (`supersede`) fixes the
knowledge side — the passage can be booked against — but nothing fixes *"the roll happened and the
round did not."* Current answer is a UI warning at mint time (*„Dieser Beleg friert die Runde ein"*),
which is a nag, not a mechanism.

### 9.6 Erfahren schlägt Gehört is a house rule we are wiring into an engine

§3.4. No published rulebook contains it. It ships as a deletable clause in a package — but off by
default the fusion mechanism is off by default, and on by default we have shipped opinionated rules
into a product K4 defines as system-agnostic. **Current resolution: on by default in our first-party
demo package only, off in the empty package, documented as a design opinion** — which means the demo
is more impressive than the product a new GM actually gets, and that gap is exactly the kind of thing
Nemesis finds.

### 9.7 The Augenblick is a new leak surface, in the least-forgiving place

§3.5. Token positions in a region a character does not hold are a **spatial oracle**: *"how many
tokens were in the room I couldn't see"* is information, and a count is an oracle **[C]**. It is
`Sicht`-projected and Leak-Bench-fixtured, but it is the first time this lineage projects **geometry**
rather than text, and geometry leaks through shapes, bounding boxes, fog-edge artefacts and the
serialised accessibility tree. `Sicht` itself remains **unbuilt and unmeasured** and is now on our
critical path too **[C]**.

### 9.8 Carried unchanged from the champion, because they did not get better

Collaborative editing is unpriced and may be incompatible with the identity rule (§16.4 **[C]** — Der
Abend does not deepen it, because slice 1 has no editor, but it does not solve it either). The
sanitiser remains the most security-critical function in the product (§16.8 **[C]**). Id churn leaks
into permanent things (§16.6 **[C]**). Fandom-grade at scale is unproven after three rounds and no
artifact in the lineage has search, an index, disambiguation or a list longer than 41 rows (§16.3
**[C]**) — **and Der Abend makes this worse**, because a wiki assembled from forty evenings has more
short passages and more entities than one a human wrote, so `retrieve()` p95 against the 5,000-entity
fixture is more load-bearing here, not less. **There is no market evidence for any of this** (§16.10
**[C]**).

---

## 10. Creative extensions

Three, in rising order of how much they change the business rather than the product.

### 10.1 Der Nachhall — the article rendered as a night, and the book that prints from it

Because every canonical passage names the second it happened, an article can be re-rendered **as one
evening**: pick session 14 and Haus Vharon collapses to only what that Saturday minted, in table
order, roll cards inline, the Augenblicke as small maps in the margin. **It is not a log** — it is
*this article, as authored by Saturday*, and the difference is that a log is ordered by machine time
while this is ordered by a story.

The end state is the artifact the champion always wanted and could never produce: **die Chronik**, the
printed book of a finished campaign, where **each chapter is an evening and the footnotes are dice**.
Nobody else can print that book, because nobody else knows which sentence came from which roll. It is
also the retention object — a GM who has one does not migrate — and it is a physical product we could
sell at cost through a print partner without touching the licence model.

### 10.2 Der Anlass als Handelsware, und der Nachhall als zweites Produkt

RB-08 and RB-11 rule that discovery runs through creators, not gamers: Foundry reached **475 systems
and 2,758 modules with no store at all**. The champion's answer is **Passagensätze [C]** — make the
tradeable unit a set of passages rather than a system or a module.

**Der Abend makes it smaller and stranger: the tradeable unit is an `Anlass`.** Ten lines, three of
them sealed, one scene with UVTT walls, two Regelkarten. **Authoring cost: twenty minutes.** It is not
an adventure — it is a thing designed to be *played into existence*, and it ships deliberately
incomplete, because completing it is what the buyer's table does.

And then the flywheel no competitor has: **a played Anlass can be published back as a Nachhall.** The
same seed file, plus what one real table's dice made of it — with the GM's consent, with player names
redacted through the existing recipient machinery, exported through the `.chronicle` path that already
exists. **Two products from one file, and the second one is written by a customer, for free, as a side
effect of playing.** Installing either drops passages in **unissued and unarranged [C]**, inert until
the buying GM performs the mint gesture on someone else's evening; upgrades route over the
`derived_from` provenance edge, **never over a content hash [C]**, so the registry never learns which
universe holds what.

### 10.3 Die Wurfkarte reist — evidence as a pasteable string, and the witness dial

**(a) The travelling Beleg.** TaleSpire's **slabs** are the most elegant sharing primitive in the
category (RB-01-talespire): a whole board as a compact pasteable text string, indexed by community
sites with zero marketplace and zero account friction. Apply it to **evidence**: a roll card exports
as one string. Paste it into Discord and it renders as a footnote card. Paste it into any Chronicle
campaign and it arrives as a **foreign Beleg** — provenance-tagged, `licensed_source` by default
**[C]**, unissued, inert until a GM mints on it. **Cross-table canon exchange with no marketplace, no
account, no server round trip and no code execution.** The string is a declarative AST; the package
format's no-escape-hatch closure **[C]** covers it by construction.

**(b) Der Zeuge — a third dial.** The champion has two page-header dials: **Stand: jetzt ▾** and
**Aus Sicht: Spielleitung ▾** **[C]**. Der Abend adds **Erfahrungsgrad: alles ▾**, so the GM can read
her own world as *"only what the party experienced first-hand"* — every hearsay sentence, every
rumour, every read-about fact stripped out. What remains is the part of the world that is *load-bearing
for these people*, and what vanishes is where the next scene is. One predicate over a closed sum
(§3.2), two joins, no AI, every row its own derivation — and it photographs: the same page, twice,
side by side, one of them half as long.

---

## 11. What this candidate refuses

Carried from `CHAMPION.md` §17 **[C]** — no arbitrary code execution ever, no embedded query language,
no AI on the critical path, no 3D, no feature-count war, no bare single-letter shortcut, no
`campaign`/`user` as stored subject types, no `confidence` field, no anonymous bearer token, no second
text per identity, no number printed as evidence that cannot go red — **plus three this thesis adds:**

- **No session-log surface.** No screen in this product has, as its default state, a list of what
  happened. There is no `oracles.yaml` row for one, and a dependency-cruiser rule fails the build on
  any serializer reaching `Sitzungspuffer` outside the live socket handler. **The moment we ship a log
  view, the attack in §1.4 is correct and we have lost.**
- **No sixth mint gesture without a verdict.** The five `praegung.*` handlers are a closed set with a
  DB-grant boundary. Adding one is a design decision recorded in the lineage, not a feature.
- **No automatic canon, at any tier, for any customer, ever** — including the plausible future where
  an LLM could summarise an evening well. **AI output is always a draft [C]**, and under Der Abend a
  draft is not a mint: the most an assistant may ever do is *pre-select* a roll card in the Fällung
  sheet with the GM's keypress still required. If that line moves, the thesis is dead and the product
  is a transcript service.

---

## 12. Reachability, priced — RB-11's most under-priced problem, answered with numbers

Carried from `CHAMPION.md` §14.2 **[C]** and sharpened where the tactical half changes the arithmetic.

| Path | Ships in v1? | What a non-technical GM behind CGNAT actually experiences |
|---|---|---|
| **Hosted room** (default) | **Yes** | Create campaign → copy link → players in. She never meets the words port, certificate, NAT or IP. |
| Electron host + Electron players | Yes, €0 | Everyone installs; full capability; works behind CGNAT on a LAN. |
| Electron host + **browser** players on LAN | Yes, **with the degradation printed on the tin** | Plain `http://192.168.x.x` is **not a secure context**: no service workers → no offline codex, no WebGPU fast path, no OPFS, and the "Not secure" chip. The join dialog says exactly this, with *„Im Desktop-Client öffnen"*. |
| Own domain via **ACME DNS-01** | Yes | A GM who owns `aldenfall.de` gets a real certificate on her home box **behind CGNAT** — DNS-01 needs no inbound port. We operate no PKI and no DNS zone. CI-smoked against a real ACME staging endpoint. |
| **Remote players, GM behind CGNAT, no hosted room** | — | **DNS-01 solves certificate issuance, not inbound reachability. [C]** Behind CGNAT there is no inbound port; remote players cannot reach her box, certificate or not. The only three real answers are a **hosted room**, a **tunnel** (Cloudflare Tunnel / Tailscale Funnel — documented and CI-tested by us, operated by neither), or a **relay we run**. **There is no fourth.** |
| Plex-pattern DNS zone + per-server wildcard PKI | **No — explicitly deferred, named as deferred** | A service business, not a feature. Bill written down and unpaid. |

**Cost per session-hour, with the map included and the inputs shown:**

- **Text/knowledge deltas**: ~30–80 KB per client-hour **[C]** ⇒ 5 clients × 4 h ≈ 1.0–1.6 MB.
- **Table deltas**: token transforms ≤20 Hz but only while something moves (RB-02); fog patches per
  reveal; roll cards; `Zustand`. Estimated **2–5 MB per client per 4-hour session** ⇒ 10–25 MB per
  session. Egress at ~€0.09/GB ⇒ **≈ €0.001–0.002**.
- **Map assets**: the real number, and it is **one-time per map per client**. A 40 MB tiled map,
  5 clients, first visit ⇒ ~200 MB ⇒ **≈ €0.018**, then browser-cached and served from object
  storage/CDN, not from the room process.
- **Compute**: ~€0.001 per room-hour **[C]**, plus fog/LOS recompute which RB-02 caps at ≤8 ms in a
  worker per token *settle* — client-side, so it does not enter the server bill.

> **Therefore: < €0.05 per session-hour, dominated by compute and one-time asset egress, not by
> steady-state bandwidth.** The binding constraint remains **relay CPU and socket count** — spike
> **S-R1**: 50 synthetic tables × 5 clients on one 4 vCPU node **[C]**.
>
> *All figures are estimates with their inputs shown. None is a vendor quote.*

**Monetisation, unchanged and not re-opened [C]:** one-time GM licence (~€30, ≈ €23.50 net through a
merchant of record), **players always free**, sold direct. Storage and rooms carry the meter; features
never do (Owlbear's model, which the market accepts). **Steam is a gated shelf, not a growth engine** —
no store page until a named gate passes; GM Forge shipped our exact model there and reached 83 reviews
and 1 concurrent player after eight years, and the median 2025 Steam release earned $249 (RB-11).
**The Forge stays separable by architecture** via the `forge-standalone` CI target with zero imports
from `codex/*`, `session/*`, `server/*` **[C]**; the shipping decision stays deferred.

**Theme/skin budget [C]:** first-party for launch — `Archive` and `Clean`, two kits — community
themes through **our own registry**, Workshop only ever a mirror. No storefront ecosystem is arriving
to fund launch kits.

**RB-11's five named attack targets, answered in one place:** the GM-machine-as-server trust model
(§12, hosted rooms default, LAN degradation printed, no inbound-port fantasy); the package format's
freedom from any code-execution escape hatch (§11 **[C]**, extended: a package cannot supply a dice
roller, and a travelling Beleg is a declarative AST); browser/desktop parity (boundary B8 **[C]**, plus
§5.3's rule that no feature may be gated on WebGPU); the live session's package-version pin (§6.1's
`Wurf.paket_pin`, which extends B3 from *what a character knows* to *what a number meant*); and a full
campaign round-tripping through export with zero Steam involvement (`.chronicle` round-trip in slice-1
CI, now including `Wurf` and `Augenblick` rows).

---

## 13. The gates that can go red

Carried from `CHAMPION.md` §12.5 **[C]** — Leak Bench seeded red, `Sicht` cost, cold read, round-trip,
accessibility including die Goldene Signatur, play posture at 200 % zoom, infrastructure S-R1 — **plus
five this thesis owns:**

| Gate | Green when |
|---|---|
| **Prägerate** (§9.1) | Instrumented four-hour session: **≥8 mints**, ≤4 min GM chrome typing, no interaction > 12 s, ≤2 named regretted omissions. **This gate falsifies the thesis and is the most important number in the candidate.** |
| **Kein Protokoll** | A CI assertion that `Sitzungspuffer` is unreachable from every response serializer, that no `oracles.yaml` row renders it, and that the purge job **physically deletes** rows (row count, not tombstone flag) at `session_ended_at + 14 d`. |
| **Der Beleg hält** | Replay: given `seed` + `ausdruck` + `paket_pin`, a `Wurf` from a fixture campaign reproduces its exact terms and total after a package upgrade to a later version. Red if a 2027 footnote reads differently in 2029. |
| **Augenblick-Leck** | Leak Bench fixture: a token in a region a reader's character does not hold appears in **no** payload, **no** DOM node, **no** bounding box, and **no** node of the serialised accessibility tree (CDP `getFullAXTree`). Two synthetic scenes identical but for one token's position, complete responses diffed byte for byte. |
| **Tischbudget** | RB-02's numbers as a headless benchmark: 60 fps at 300 tokens / 20 lights / 1,500 wall segments on the reference machine; ≤150 draw calls; **zero per-frame allocations**; first paint-to-interactive payload ≤1.2 MB. Bundle-size gate fails the build. |

**Acceptance demo, one take, no cuts:** import a `.dd2vtt` → place three tokens → two browsers join by
link with no account → **Sera rolls Menschenkenntnis and the card prints `+2 · du hältst 3 Passagen mit
#haus-vharon`** → press `Ctrl+Enter` and watch a footnote appear in an encyclopedia article → open
Brannt's DevTools and show his response body contains **no bytes** of the sealed sentence → reveal it
to him as *von Sera gehört* → **roll his check and watch the same clause print `+0 · Hörensagen`** →
walk the party into the archive region and issue it → drop a guard to `defeat_pending`, confirm, undo →
end the session and show die Fällung counting **6 kept, 41 discarded, purge date** → export → import
into an empty instance → diff empty. **Then thirty seconds that are not a DevTools tab:** the article,
`Ctrl+H`, three grey chips and three amber ones with timestamps — and one footnote pressed open into
`[Der Augenblick]`.

---

## 14. Kaya's amendments, answered

| | Amendment | Answer under Der Abend |
|---|---|---|
| **K1** | Themes + templates | Token-first from commit 1 **[C]**; two kits at launch (`Archive`, `Clean`); contrast validated in CI against **painted pixels**; content-length and `lang`-switching as gates. The roll card and the footnote card are **themed surfaces**, which is a new and demanding case: a derivation must stay legible at 200 % zoom in every skin. Illustration commissioning cost: **[needs a quote — no evidence base, will not invent one]**. |
| **K2** | Visual GUI rule-builder | Schema-form half launch-blocking at 15 days with a falsifier at 20 **[C]**; the visual formula editor with live trace preview ships after launch. **Der Abend adds the one thing that creates authors before the builder exists: die Regelkarte**, minted at the table in six seconds, promoted to a clause later, with a `fire_count` grown by deliberate keypress — a registry ranking signal downloads cannot game. Conceded: Alchemy shipped their Sheet Builder first. |
| **K3** | State-of-the-art GUI | The Triumph shell **[C]**, with the two rulings in §4.1. Motion carries state: a mint travels **roll card → passage → article footnote → reader's book**, which is the single best motion moment in three rounds of candidates and is a *transition*, not a depicted world. Reduced motion replaces travel with state change and keeps the arrival marker. Nothing animated on the map hot path. |
| **K4** | Differentiation | §8, with losses. Axes: the durable world, per-passage knowledge, **evidence as a first-class object**, no-code authoring, accessibility, theming, portability. **Not** feature count, **not** the renderer, **not** minute one. |
| **K5** | Maps, generation, sprites | **The biggest change from the champion.** A real map in slice 1: tokens, three grid types, elevation, lossless UVTT import/export, fog in both social models. **No dynamic LOS, no wall authoring, no Scene Levels — stated as concessions.** WFC lands in slice 3, after the region and wall models are stable, per RB-05's own sequencing (*layout first, WFC as detail filler*). Sprite/atlas rendering (RB-05 #8) is the K1 dividend — a theme reskins the same map by swapping the atlas — and it is post-launch. **This remains the reallocation Kaya must rule on** (`OPEN-DECISIONS.md`). |
| **K6** | Distribution | Browser non-negotiable — the Wednesday phone read **is** half the thesis **[C]**. One codebase, Electron as the self-hosting invariant's implementation, hosted rooms as the v1 join path, Steam gated behind RB-11's test, the Forge separable by architecture. |
| **K7** | Game feel through staging | **Fully honoured, and this thesis strengthens it.** Art is content and skin. The most cinematic moment in the product is a **die roll folding into a footnote** — a transition between two pieces of the user's own record, not a depicted world. `[Der Augenblick]` opens a scene that is *the table's own board*, never an authored diorama. Missing artwork is a designed state **[C]**. |

---

*Candidate B. The bet, unhedged: **prep is a seed, the evening is the author, and a die roll is a
citation.** Nothing becomes canon without a human keypress; everything else is deleted. The
encyclopedia that results cannot be written by a person, because no person was in the room at
21:14:38 with that much context — and it cannot be built by a competitor, because none of them has an
atom below the page, a roll that anything can cite, or a reader who is a character. What this
candidate does not have is a good session one, a wall you can draw, or an answer to the fourteen days
in which the thing we promise to delete is still on the disk.*

> *Vier Abende, fünfundzwanzig Absätze,*
> *drei getippt und zweiundzwanzig gewürfelt —*
> *und die Fußnote, die man aufklappt,*
> *führt zurück auf ein Brett, auf dem noch die Marken stehen.*
