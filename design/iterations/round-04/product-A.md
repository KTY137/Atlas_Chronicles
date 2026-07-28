# Die Woche (the campaign has no off-days) — Product Candidate A, Round 4

> **Kanon fällt nicht nur samstags an.**
> The champion mints the world at the table. This candidate mints it on the other six days too —
> through the *same five gestures*, over der Briefkasten, with **two human hands three days apart**.

**Lineage.** An evolution of champion v4 *Der Abend*
([`../CHAMPION.md`](../CHAMPION.md)), attacking the two defects its own verdict named first:
*„session one is empty"* (§15.9) and *„the player's book is thin"* (§15.5). Everything in the
champion is carried unless this document changes it. §6 lists every change, and there are fewer than
a reader of §2 would expect: **three tables, two enum values, one precondition.**

**Optimised for:** the 1,460 hours a year the champion is a reading surface. The player who has ten
minutes on a Tuesday and nothing to do with them. The GM whose prep for session 15 is *what the week
did*. **Minute one and week one, instead of Saturday four.**

**At the cost of, stated as costs:**

- **The canvas leaves slice 1.** Pixi, the tile pyramid, KTX2 and the GPU fog texture — the four
  things nobody in this lineage has ever written — move to slice 2. Slice 1 ships **der Tisch ohne
  Leinwand**: the Outline recipe as the only render recipe. Against Owlbear's twenty minutes to a
  table (`RB-01-owlbear.md` §Onboarding) we look, for one slice, like a wiki with dice. **K5 slips a
  slice and Kaya must rule on it** (§8.5, `OPEN-DECISIONS.md`).
- **Prep comes partly back.** The champion abolished prep (*„Vorbereitung schrumpft auf eine Saat"*).
  A Vollmacht is a sealed line written **in advance, for a named outcome**, at 23:41 on a Saturday.
  Four of them cost six minutes at the tiredest moment of the week. §8.2 is the honest version and it
  is the weakness I cannot cleanly fix.
- **Availability stops being optional.** The champion's world runs on demand and its letterbox cannot
  read its own contents. Die Woche needs a world that can **resolve a roll and project a Sicht on a
  Tuesday**. Priced at **+8.7 % of die Raumuhr's annual allowance** with the inputs shown (§8.3), and
  degrading — honestly and by name — for the self-hosting GM whose laptop is shut.
- **The product models being wrong. It does not model lying.** A letter can only carry passages its
  sender actually holds (§4.3). Deliberate deception between player characters has no mechanical
  existence in this product, and that is a beloved kind of play we refuse. §8.7.

---

## 1. The thesis, and the one sentence it turns on

The champion is right that **the evening is the author**. It is wrong that the evening is the only
author available, and the reason it believes that is not a design conviction — it is an accident of
which invariant got written first.

> **`Nichts wird automatisch Kanon.`** No roll, no move, no message, no state transition ever writes
> a Passage without **a human keypress** (CHAMPION §4.1).

Read it again. It says *a human keypress*. **It does not say the GM's, and it does not say now.**
Die Randfrage (P5) and die Berufung are already player gestures; the champion simply never let a
player's keypress complete a mint, and never let a mint's two halves be separated in time.

**Die Woche separates them.**

> ### Zwei Hände, drei Tage.
> A mint has always required one human decision. It now requires **two humans**, and they may be
> **three days apart**. The GM writes and authorises on Saturday at 23:41. The player fires on
> Tuesday at 22:41. Between those two keypresses no machine decides anything: the text was already
> written, the recipient was already chosen, the threshold was already set. **The server rolls the
> die and releases what a human wrote, to a person a human named, because a second human asked.**

The object that carries the GM's half is **die Vollmacht** — a scoped, capped, revocable, expiring,
unchainable authorisation to mint exactly one already-written Passage.

And this is why the candidate does **not** rebuild the inbox, which is the attack it was told it dies
to:

> ### Ein Eingang füllt sich. Eine Vollmacht leert sich.
> Der Konvent's ratification queue ran **player → GM**: the player writes, the GM owes a decision, the
> backlog grows monotonically with player enthusiasm. Die Vollmacht runs **GM → player**: the GM
> spends a bounded allowance, the player draws it down, and **everything unspent expires at the next
> session start.** There is no list on the GM's side that grows. The only number on her Woche surface
> is *how many doors are still open*, and it can only go **down**.

Capacity, not queue. That is the whole structural difference, and it is checkable: the server enforces
**≤1 Vollmacht per player per week plus 2 free-floating**, and expiry is a job, not a decision.

---

## 2. The flex — „Der rote Link ist eine Tür."

**It is a Wednesday.** That is the point of the demo: it does not need a session, and it does not need
four Saturdays. Kaya has her phone on a train. Timo is looking over her shoulder.

### Beat one — die Saatbilanz has grown an axis

Haus Vharon, the encyclopedia page, unchanged in shape from the champion's flex — crest infobox, five
sections, blue links, one red link inside the infobox, three plates, *Siehe auch*. Under the title:

```
11 Zeilen gesät · 31 Absätze im Kanon · 3 getippt · 8 ausgelöst
                 · 14 am Tisch entstanden · 6 zwischen den Tischen
```

> **Timo:** *„Zwischen den Tischen?"*

### Beat two — die Herkunftsschicht has weekdays in it

She presses the provenance toggle. The page does not change shape (gate „Der Streifen" is carried
unchanged, CHAMPION §6.10). Among the Saturday chips stand three that are not Saturdays:

```
  ¶  14. März · getippt · Vorbereitung
  ⚄  Sa 21:29 · Sitzung 14 · Betreten · Archivnische · Sera, Brannt
  ✉  Mo 15. Juni 18:02 · Brief · Brannt an Sera · Postlaufzeit 2 Tage · zugestellt Mi 06:00
  ◈  Di 16. Juni 22:41 · Vollmacht · „Frag in der Kanzlei nach" · Sera · 21 gegen 18
  ◈  Do 18. Juni 07:12 · Vollmacht · veranlasst Mi 23:50, aufgelöst Do 07:12
  ✝  Sa 22:51 · Sitzung 17 · Niederschlag · Hauptmann Vaugn
```

> **Kaya:** *„Sechs Absätze sind an Tagen entstanden, an denen wir nicht gespielt haben."*

### Beat three — der Beleg, and the line no dice log can hold

The footnote at the end of paragraph 26 opens in the flow, exactly as in the champion:

```
[7]  Nachforschen · Sera Valdris · Di 16. Juni, 22:41:08
     1d20 = 17
       + 4   Weisheit
       + 2   du hältst 4 Passagen über Haus Vharon   (haelt_etikett „haus-vharon", mindestens: 3)
       − 2   du kennst die Kanzlei nur aus Brannts Brief (Mo 18:02) — Hörensagen zählt nicht
       ───────────────────────────────────
       = 21  gegen SG 18 · Erfolg
     Vollmacht v_031 · ausgestellt Sa 23:41, Sitzung 14 · verfällt zu Sitzung 15
     Regelpaket hausregeln-aldenfall 2.3 · Klausel k_nachforschen@r4 · Wurf w_212 · dauerhaft
```

**A letter written on Monday is a −2 on a die roll on Tuesday, printed in the footnote of an
encyclopedia article read on Wednesday.** Three days, three surfaces, one clause — and the `−2` comes
from `erfahrungsgrad`, which is the champion's own fusion predicate (CHAMPION §4.4) doing a job it was
never given a chance to do, because in a Saturday product everybody hears everything in the same room.

> **Timo:** *„Aber du warst doch gar nicht dabei."*
> **Kaya:** *„Niemand war dabei. Ich habe geschlafen."*

### Beat four — the door, which is the actual flex

She scrolls back to the infobox. One row is a red link: **„Kanzlei: Ossa (kein Eintrag)"**. In
Kaya's view it is red, because nothing has been written there.

She turns the reader dial to **Sera** — a server round trip, CHAMPION §6.3 — and the same row is
**not red**. It is a door: a thin ring around the link, a weekday label, and one control.

```
  Kanzlei: Ossa   ⟶  offen bis Sitzung 15 · Nachforschen gegen 18
```

> **Timo:** *„Warte. Der rote Link ist eine Tür?"*

**That is the sentence.** Every wiki in the world renders a red link as *an absence and an invitation
to type*. This product renders it as **an invitation to go and find out** — a die roll, on a Tuesday,
from a phone, that ends with a paragraph in an encyclopedia and a footnote with a weekday over it.

**Why it is the right flex.** It photographs in **one frame on a phone** — a Wikipedia-shaped infobox
with one live row — and it needs **one week, not four Saturdays**. It is the champion's own flex
(*„die Fußnote ist ein Würfelwurf"*) with the one thing the champion cannot supply: **a date that is
not a game night.** And it is structurally unreachable for every rival:

| Rival | Why it cannot render this frame | Source |
|---|---|---|
| **Foundry** | A journal page is an HTML string; there is no atom below the page for a link to be a door into, and a roll is a chat message nothing can cite. There is also **no official mobile app** — phone play sits behind a module author's Patreon (Swipe VTT), and Simple Mobile is unmaintained. | `RB-01-foundry.md` §Platform, §GM prep |
| **Roll20** | Journals/handouts only, no campaign export, per-player reveal removed with *„no way to turn this back"* — and the **mobile app was retired and delisted from app stores in Feb 2026**, with mobile users pointed at the browser. They left the device the week happens on. | `RB-01-roll20.md` §Platform, §GM prep, §Import/export |
| **Fantasy Grounds** | They **built the between-sessions surface and made it read-only**: the Online Reader (beta, 2025-11-08) is a web compendium for reading owned modules on any device — *reading only, not play*. The story record is a chat log. | `RB-01-fantasy-grounds.md` §Platform |
| **Owlbear Rodeo** | The best phone client in the category (137 MP map on an iPhone 14 Pro Max) and **no journals, quests or wiki natively** — Journal! is a community extension. There is nothing for a Tuesday to accrete into. | `RB-01-owlbear.md` §Platform, §GM prep |
| **Alchemy** | Universes, lore and handouts exist, and the browser is *„explicitly not optimized"* for phones and tablets. Their lore is a reading surface; a red link there is a red link. | `RB-01-alchemy.md` §Platform, §GM prep |
| **TaleSpire** | The one genuine async precedent in the corpus — **persistent cloud boards that seat-holding guests can enter while the owner is offline** — and **no character sheets, no rules automation, no journals/quests/wikis, no mobile at all**. An always-open world with nothing to do in it and nowhere to write it down. | `RB-01-talespire.md` §Platform, §Feature inventory |

**And the wiki rivals — Obsidian, World Anvil, LegendKeeper, Kanka, Notion — are all six-day products
with no seventh day. This is the only seven-day product in the comparison set.**

---

## 3. How the two halves fuse — the third direction

The champion fuses table→wiki (five mint gestures) and wiki→table (three predicates). Die Woche adds
the direction that only exists when there is no table in the room:

> **On six days out of seven, the wiki *is* the table. Reading is the play surface, and a red link is
> a move.**

### 3.1 Die Vollmacht — the mechanism, precisely

A Vollmacht is **not a sixth mint gesture.** The closed set of five `praegung.*` handlers stays five
and the dependency-cruiser rule that guards it is unchanged (CHAMPION §4.1). What changes is one
precondition inside `praegung.beleg` (P1):

```text
praegung.beleg(wurf_id, actor_user_id, gesture) requires
     actor_user_id is the campaign GM
  OR actor_user_id controls a character holding an OPEN Vollmacht v where
       v.eingelöst_durch_wurf_id IS NULL
       AND wurf.klausel_ref     = v.klausel_ref
       AND wurf.thema_etikett   = v.thema_etikett
       AND wurf.ergebnis       >= v.schwelle
       AND v.verfall not reached
```

On success the handler releases **`v.freigabe_pid`** — a Passage the GM already wrote and sealed — as
a Revelation to `v.inhaber_character_id`, with `Quelle = Wurf(w)`, `gepraegt_durch: vollmacht`, and
**both dates** on the chip, exactly as the champion's `gesaet_ausgeloest` already does. The Augenblick
is captured server-side.

**What a Vollmacht cannot do, enforced by type and by grant:**

- **It cannot be widened.** Clause, topic anchor, threshold, recipient character and the sealed
  passage are frozen at issuance. The client holds an opaque handle and never the sealed text.
- **It cannot be re-targeted.** `inhaber_character_id NOT NULL`, immutable. A holder cannot mint into
  someone else's book.
- **It cannot chain.** `Vollmacht.freigabe` is typed `SealedPassageRef`. **There is no constructor
  that yields a `Vollmacht`**, so an authorisation cannot issue an authorisation — the same shape as
  the champion's *„there is no `Html` constructor"* (CHAMPION §6.8).
- **It cannot outlive the week.** `verfall ∈ NaechsteSitzung | Datum(d)`; expiry is a job with a CI
  test asserting `status` transitions and that a fired-after-expiry request returns **404, not 403**,
  same body, same timing.
- **It can be revoked in one keypress**, and a revoked Vollmacht is a 404 for its holder immediately.
- **It is capped:** ≤1 per player per week + 2 free-floating, hard server cap, not a UI hint.
- Every issuance, firing, expiry and revocation writes an append-only `AuditEntry`.

**Failure mints nothing** and spends the Vollmacht (unless `wiederholbar`). What the player gets is a
line in her *own* Kodex — *„Di 22:41 — in der Kanzlei nachgefragt, nichts erfahren"* — which is hers,
never canon, never a Revelation. What the *GM* gets is the best prep signal in the product: on
Saturday, die Woche tells her **Sera went to the chancery and found nothing**, so now she knows where
to put something.

### 3.2 The worked week — Sitzung 14 → Sitzung 15

The champion's Saturday (CHAMPION §4.8) is carried unchanged. This is what follows it.

| When | What happens | Mechanism | Mint? |
|---|---|---|---|
| **Sa 23:40** | Die Fällung: *„9 Passagen geprägt · 47 Würfe verworfen · Puffer wird am 10. Juli gelöscht."* | unchanged | — |
| **Sa 23:41** | **Die Fällung now also issues.** Die Lücke (CHAMPION §10.6) already computed the candidates; Kaya presses `V` three times. Two are one line each, one is `freigabe: offen`. *„Sera: frag in der Kanzlei nach — gegen 18."* **~90 s total.** | **die Vollmacht** ×3 | — |
| **So 09:20** | Kaya does nothing. Nothing breaks. | — | — |
| **Mo 18:02** | Brannt, on his phone: he sends Sera two passages he holds about the Kanzlei plus a covering note. The world is asleep; the blob goes into der Briefkasten. | **der Brief** | — |
| **Mi 06:00** | The world wakes (Sera opens the app). The spool drains. Brannt's two passages become Revelations to Sera with `Quelle = Gehört(brannt, r_0455)`, `granted_via: brief`. Her book stamps them *Hörensagen*. **Postlaufzeit 2 Tage** was set by the GM's world post (§9.1) — written Monday, delivered Wednesday, in fiction and in fact. | **Revelation, not a mint** | — |
| **Di 22:41** | Sera opens Haus Vharon on her phone. The infobox row „Kanzlei: Ossa" is a door. She presses it. Server rolls `1d20=17 +4 +2 −2 = 21` against 18. The roll card appears. **She presses `Ctrl+Enter`.** | **P1, second hand** | **✔** |
| **Di 22:41:08** | The sealed line Kaya wrote at 23:41 on Saturday is released as a Passage into Sera's book, `gepraegt_durch: vollmacht`, both dates on the chip, Augenblick captured, footnote `[7]` appears in the article. | | |
| **Mi 23:50** | Vesper fires her Vollmacht. **Kaya self-hosts and her laptop is shut.** Vesper's intent is *posted*, not resolved; the receipt is honest: *„Zugestellt. Kayas Welt war zuletzt Sonntag wach."* | **der Briefkasten**, degraded path | pending |
| **Do 07:12** | Kaya opens her laptop for four minutes. The spool drains, Vesper's roll resolves, her paragraph arrives. The chip carries both moments: *„veranlasst Mi 23:50 · aufgelöst Do 07:12."* | | **✔** |
| **Do 07:14** | **Der Zug.** Kaya, still on her phone, releases one sealed line to Brannt: *„Der Bote kam nicht zurück."* One keypress. Twenty seconds. **This is P2 (der Souffleur) performed asynchronously — no new gesture.** | **P2** | **✔** |
| **Fr** | Nobody does anything. | — | — |
| **Sa 19:52** | Session 15 opens. **The Anlass is not six lines Kaya typed.** It is her three remaining seed lines *plus what the week did*: two paragraphs of canon that were not there last Saturday, one letter delivered, one Vollmacht expired unfired, one failed enquiry that told her where to put something. **Her prep for session 15 was written by her players.** | **die Woche**, `NurLeitung` | — |
| **Sa 19:53** | Sera opens the app. She does not get *„what happened this week."* She gets **der Umbruch**: her own encyclopedia, re-set, with this week's four new atoms marked in place, in their articles. | §5 | — |

**Six days, three mints, zero GM sessions, ~110 seconds of GM time.** And the knowledge→play direction
fired twice on days nobody was at a table: the `+2` from `haelt_etikett` and the `−2` from
`erfahrungsgrad` over a letter.

### 3.3 Why this makes both halves stronger, not just busier

- **The wiki half gets a reason to be read that is not devotion.** Reading is how you find your door.
- **The play half gets a knowledge model with *latency*.** The champion's `Gehört` edge is a footnote
  inside one room. Over a week with Postlaufzeit it becomes a **social and geographic structure**:
  who told whom, how long it took, and what it cost on the roll.
- **The GM's prep collapses further, not less.** The champion shrank prep to a seed. Die Woche
  converts a *fraction* of the seed into pre-authorised outcomes and then has the week spend them —
  and hands her, at 19:52, a session opening she did not write. §8.2 prices what this costs her.

---

## 4. The six zones under Die Woche

The Triumph shell ([`../../03-triumph-ui-direction.md`](../../03-triumph-ui-direction.md)) is carried:
six zones, Campaign Context / Module Rail / Collection Rail / Primary Stage / Context Lens / Session
Shelf, independent axes (content × skin × role × mode × a11y), one Scene with three render recipes,
theme manifests, DOM authoritative with Pixi behind `MapRenderer`, the non-goals, K7. **The shell does
not change. Its centre of gravity does.**

| Zone | Under Die Woche |
|---|---|
| **Session → die Woche** | **Four states instead of three.** *Vorher — der Anlass* (a seed, now also fed by the week). *Währenddessen — die Kanonleiste* (unchanged). *Danach — die Fällung, die jetzt auch ausstellt*: the closing balance gains one ritual, `V` ×N, ≤90 s, inside a moment the GM already has. *Dazwischen — die Woche*: for the player, her open doors and her letters in transit; for the GM, a `NurLeitung` set difference (§5.2) and a count that only falls. |
| **Story → das Archiv** | **Promoted from reading surface to the six-day play surface.** Red links are doors (§3.1). Der Umbruch marks this week's accretion **in place, inside the articles** (§5.1). Die Herkunftsschicht gains a weekday glyph — a fourth independent channel alongside glyph/colour/stroke, because a weekday is text and survives high contrast by construction. **In slice 1 it is still a reading-and-firing surface, not an editing surface** — the champion's §7.1 dividend is untouched: nothing here is typed, so nothing here needs the editor. |
| **Cast → die Zeugen** | Gains **der Briefwechsel**: a character page shows who this character wrote to and heard from, as the projected `Quelle = Gehört` edges with their Postlaufzeit. *„Was sie bezeugt hat"* (erfahren) and *„was sie gehört hat"* (gehört) were already separated; now the second half has **arrows and dates**. This is the campaign's social graph, computed from permission data we already store, and no rival models it at all. |
| **Library → das Regal** | Gains **Vollmachten** (open, spent, expired — a GM surface, `NurLeitung` where it counts) and **Briefe** (delivered, in transit). The tradeable unit upgrades from an `Anlass` to **eine Ausgabe** (§9.3): a seed *plus* a set of Vollmachten *plus* letters already in transit. |
| **Table → der Tisch** | **Unchanged in specification, changed in schedule.** CHAMPION §9 is carried whole and unamended — three grid types, elevation as a scalar, lossless UVTT import *and* export, per-character fog as the projection, the RB-02 budget as CI gates, the §9.2 refusals. What moves is **when the canvas arrives**: slice 1 ships **der Tisch ohne Leinwand** (§7.2), slice 2 ships the canvas. Justification in §7.2 and the cost in §8.5. |
| **Forge → das Formular** | Gains **der Vollmachtszettel** — the clause form for issuing an authorisation, which is the *third* thing (after die Regelkarte and der Klauselzettel) that makes a system author out of a GM without her opening a YAML file. It is also the authoring surface for **die Ausgabe**, which is the format RB-11's ratified creator channel actually wants: something smaller than a campaign, bigger than a map, that plugs into someone else's table. `forge-standalone` stays a CI target with zero imports from `codex/*`, `session/*`, `server/*` — **the Forge stays separable by architecture** (RB-11, ratified). |

**Ruling change to CHAMPION §13, ruling 1 — and it is the whole thesis in a routing line.** The
champion opens in **Session** if a session is live, else **Story**. Die Woche adds one clause:

```
live GameSession                        → Session
unfired Vollmacht OR undelivered Umbruch → Story, mit dem Umbruch scharf
otherwise                                → Story
```

Still one predicate. **On six days out of seven the app opens into the book — and the book has
something in it that was not there yesterday.**

Rulings 2 (rail precedes stage), 3 (no edit toggle, no `contenteditable` in the reader tree) and 4
(motion carries state) are carried unchanged. Ruling 4 gains one moment: **a letter in transit** is
the only object in the product that animates without a user action, and it does so once, on arrival,
as a state change — reduced motion replaces it with the arrival marker, `transition: none !important`.

---

## 5. The anti-log answer — solved without becoming a log

This is the attack the thesis was told it must survive: *asynchronous play needs a place to see what
happened, and that place is the log CHAMPION §11 refuses.* Two surfaces, two different data
structures, and **neither is an event sequence.**

### 5.1 Der Umbruch — your book, re-set

The player's answer to *„what happened this week?"* is **not** a list. It is her own encyclopedia,
**with this week's arrivals marked in place, inside their articles, in article order.**

```text
Lesestand (character_id, entry_id, letzte_gen_gelesen, at)     -- one watermark per reader per entry
```

Der Umbruch renders `Sicht(viewer)` with atoms newer than the watermark carrying an arrival mark. It
is a **projection with a highlight**, not a feed. Test it against the champion's own refusal
(CHAMPION §11: *„No screen has, as its default state, a list of what happened"*):

- **Default state is an article**, or the Kodex index of articles. There is no screen whose default
  state is a list of events. ✓
- **Ordering is by document structure**, which is the story — never by machine time. ✓
- **It shows only what arrived in her own book**, because it is a `Sicht` render. Another player's
  Tuesday is not merely hidden from it; it is *absent from the data structure*. ✓
- The one number it prints — *„4 neue Absätze"* — is a count over content the reader **holds**, so
  **Kein Nenner** (CHAMPION §6.5) permits it: there is no denominator and no cross-projection term. ✓

**And a gate, because a prose refusal is worth nothing in this lineage** (CHAMPION §6.10 established
the pattern). Gate **„Kein Strom"**, added to `oracles.yaml` as row `umbruch`:

1. The Umbruch surface contains **no time-ordered container**: `[data-umbruch] :is(ol,ul,table)[data-sortiert=zeit]` count `=== 0`.
2. **Remove every article context and nothing renders.** The gate strips `[data-artikel]` ancestors from the fixture and asserts the surface produces zero nodes — i.e. the marks *cannot* exist independently of the document they mark. A feed would survive that operation; a highlight cannot.
3. Der Zwillingsbeweis (CHAMPION §6.6) runs over it: same held half ⇒ same bytes, whatever anyone else did this week.

I state honestly in §8.4 that this is a **rule with a gate, not a type**, and that it is the invariant
most likely to be traded away under user pressure.

### 5.2 Die Woche — the GM's set difference, which is not a replay

The GM genuinely needs *„what happened while I slept."* She gets it as an extension of the champion's
existing `NurLeitung<Differenzkarte>` (CHAMPION §6.5), evaluated over a window:

```text
NurLeitung<{ fenster: (letzte_sitzung, jetzt),
             dazugekommen: [{leser, pid, quelle, wann}],
             offen:        [{vollmacht_id, inhaber, anker, verfall}],
             verfallen:    [{vollmacht_id, inhaber, grund}],
             unterwegs:    [{brief_id, von, an, zustellung_am}] }>
```

> **A log is an append-only sequence you read forward. Die Woche is a set difference you read once.**

It is computed from **the current state of two projections**, not from an event stream. Nothing is
persisted to produce it; delete every row of the `Sitzungspuffer` and it still computes, because it
folds `Revelation` and `Vollmacht` — durable canon objects — not events. `NurLeitung<T>` has **no
encoder instance in the player payload codec**, so it cannot be serialised to a player even by a
developer who wants to.

**The 14-day purge is untouched.** Vollmacht rolls are `dauerhaft = true` on citation and leave the
purge scope exactly like every other cited `Wurf`; uncited week rolls are physically deleted at
`+14 d` by the same job with the same row-count CI test. Die Woche adds **no new retention**, and the
right-to-erasure collision (CHAMPION §15.7) is neither improved nor worsened.

---

## 6. The data shape — three tables, two enum values, one precondition

[`../../02-domain-model.md`](../../02-domain-model.md) is inherited whole: `User → UniverseMembership
→ Universe → Campaign → GameSession`; roles on memberships; `AuthSession ≠ GameSession`; `Actor` as
the aggregate; `CharacterController` on `actor_id`; `RulePackageInstallation`; `KnowledgeEntry`
scoping as a DB constraint; append-only campaign-scoped `AuditEntry`. The champion's §8 is inherited
whole. **The delta is deliberately tiny, and its smallness is a claim: the champion already built a
world that is different for every reader — it just never let anybody touch it on a Tuesday.**

### 6.1 New

```text
Vollmacht (id, campaign_id, ausgestellt_in_session_id, ausgestellt_von_user_id,
           inhaber_character_id NOT NULL,           -- immutable
           klausel_ref, thema_etikett, schwelle,
           freigabe SealedPassageRef,               -- NO constructor yields a Vollmacht: no chaining
           anker ∈ RoterLink(link_id) | Passage(pid) | Ort(region_pid),
           verfall ∈ NaechsteSitzung | Datum(d),
           wiederholbar boolean DEFAULT false,
           status ∈ offen | eingelöst | verfallen | widerrufen,
           eingelöst_durch_wurf_id NULL, ausgestellt_at)

Brief     (id, campaign_id, von_character_id, an_character_id[],
           mitgeteilte_pids[],        -- server-validated: sender must HOLD each one
           begleittext UntrustedText, -- never canon, never a Revelation, lives in the recipient's Kodex
           abgeschickt_at, zustellung_am, zugestellt_at NULL, gelesen_at NULL)

Lesestand (character_id, entry_id, letzte_gen_gelesen, at)      -- der Umbruch's watermark
```

### 6.2 Changed

- `Passage.gepraegt_durch` gains **one value**: `vollmacht`. (The champion: *„`gepraegt_durch` ist der
  Flex, und es ist eine Spalte."* This thesis costs that column one enum value.)
- `Revelation.granted_via` gains **one value**: `brief`.
- `praegung.beleg` gains **one precondition** (§3.1). The closed set of five handlers stays five and
  the dependency-cruiser rule guarding it is unchanged.

### 6.3 Explicitly unchanged, and each is load-bearing

- **The `Quelle` sum type is untouched.** A letter is `Gehört(from_character_id, via_revelation_id)`,
  which already exists. **No fourth constructor.**
- **`GameSession` is untouched, and a week is not a session.** `AuthSession ≠ GameSession` is already
  a rule; a third session concept is refused. The week is the *window between two GameSessions* and is
  computed from `campaign.last_session_ended_at`, never stored.
- **`Zustand` is untouched.** Nothing between sessions moves a token or changes HP. A Vorhaben yields
  knowledge; it does not yield board state. This keeps the whole undo-ring collision (CHAMPION §15.8)
  from getting worse.
- **`Sitzungspuffer`, its TTL and its physical purge are untouched** (§5.2).
- **No new render recipe.** Der Umbruch is a mark inside the Outline/Cinematic recipes; die Woche is a
  `NurLeitung` panel.

### 6.4 New `felder.yaml` / `oracles.yaml` obligations, because the projector is code-generated from them

Every new column declares a disclosure class or the build fails (CHAMPION §6.4). New `oracles.yaml`
rows, each with an owner module and a green test or CI fails: `umbruch` · `tuer_zustand` (the door
state on a red link — **the highest-risk new oracle in this candidate**, because whether a link is a
door tells the reader that something exists behind it) · `vollmacht_karte` · `brief_umschlag` ·
`brief_unterwegs` · `briefwechsel` · `woche_bilanz` · `aushang`.

**The door is an oracle and it must be projected like one.** A door is visible **only** to its
`inhaber_character_id`. To every other reader — including another player at the same table — the row
is an ordinary red link, byte-identical. Der Zwillingsbeweis gets a dedicated fixture pair for exactly
this: two worlds whose held halves are identical, one with three Vollmachten on the unheld side and
one with none, asserting identical HTTP bytes, identical DOM, identical `getFullAXTree` and identical
response timing.

---

## 7. The first slice — „Die Tür"

**One workflow: one campaign, one evening, and then one week.** Browser only, hosted room, three
people, **no canvas.**

### 7.1 The workflow, end to end

1. Kaya creates a campaign and writes an **Anlass**: six lines in a single-line inline composer —
   plain text, `[[links]]`, **no document editor**. Two lines `versiegelt`.
2. Two players join by link, display name, **no account** (die Namenswache runs).
3. **Sera rolls Menschenkenntnis** and the card prints `+2 · du hältst 3 Passagen mit #haus-vharon`
   — `haelt_etikett` against **her own projection**, in her own words.
4. **`Ctrl+Enter`.** A sealed seed line is released to Sera, `Quelle = Wurf(w)`, both dates, an
   `Augenblick` captured server-side, a footnote appears in the article.
5. Brannt is revealed the same passage as **`[von Sera gehört]`**; his next roll prints **`+0 ·
   Hörensagen`** from the same clause.
6. A guard drops below 0 → `defeat_pending` → Kaya confirms → one `ereignis` passage. Undo ring
   intact. **All of this on der Tisch ohne Leinwand** (§7.2).
7. **Die Fällung, which now also issues.** *„6 Passagen geprägt · 41 Würfe verworfen · Puffer wird am
   10. Juli gelöscht."* Then `V` ×2, ≤60 seconds, two doors opened.
8. **Tuesday, a phone.** Sera opens Haus Vharon. The infobox row is a door. She presses it. Server
   rolls. `Ctrl+Enter`. **The paragraph arrives with a Tuesday over it.**
9. **Monday–Wednesday.** Brannt sends Sera a **Brief** carrying two passages he holds. It is delivered
   with Postlaufzeit; her next roll on the topic prints **`−2 · nur gehört`** from the same clause
   that printed `+2` on Saturday.
10. **Open Brannt's DevTools on Tuesday** and his response body contains **no bytes** of Sera's door,
    her sealed line, or her result — and the red link in his infobox is byte-identical to a reader
    with no campaign at all.
11. **Saturday 19:52.** Session 15 opens with an Anlass that contains the week. Sera's landing is
    **der Umbruch**: her own articles, four atoms marked.
12. Export → import into an empty instance → **diff empty**, including lineage, `dauerhaft` Würfe,
    Augenblicke, **Vollmachten and Briefe**.

**Step 8 alone is the flex, and it happens in week one.** The champion's flex needs Saturday four.

### 7.2 Der Tisch ohne Leinwand — the cut, and why it is not the cut that lost round 3

Round-3 A lost, in part, because *„A's §10 refuses the map canvas"* **as a product decision** and its
slice had *„no game in it"* (round-03 verdict §2.5, §3.1). This is a different cut and the difference
must be exact:

- **CHAMPION §9 is carried whole and unamended.** Three grid types, elevation as a scalar, lossless
  UVTT import *and* export, per-character fog as the projection, the RB-02 budget as CI gates, the
  §9.2 refusals, the parity rule. **Nothing is refused. One thing is sequenced.**
- **Slice 1 still contains a game**, and it contains **both** fusion directions. Dice with a seeded
  server-side roller and the `Trace` sum. Initiative, HP, conditions, `defeat_pending` with explicit
  GM confirmation, the 50-transition undo ring, timers. Regions, walls and portals **as data**, from a
  real `.dd2vtt` parse. Per-character fog **as projection over regions** — which is `Sicht`, which we
  are building anyway. Token positions as `Zustand` on a coordinate grid. What is missing is the
  *drawing of it*, not the playing of it.
- **The render recipe that ships is die Tafel** — the Outline recipe, which CHAMPION §9.1 already
  commits to as *„a fully usable play surface, so a screen-reader player is never handed a canvas at
  all."* Either that sentence is true and shipping it first is legitimate, or it is false and the
  champion's accessibility claim was never real. **We ship the accessible path first and the canvas
  becomes the enhancement rather than the retrofit.** That is invariant 8 — *accessibility is
  architecture, not polish* — taken literally for the first time in four rounds.
- **The risk profile inverts, and this is the engineering argument.** The champion budgets
  accessibility-over-canvas at 8 days and marks it **high**, precisely because it is retrofitted onto
  a canvas, with a falsifier at 14. Build the outline **first** and that risk is structurally gone:
  there is nothing to reconcile it with.

**What slice 1 therefore contains zero of: Pixi, the tile pyramid, KTX2/Basis, and the GPU fog
texture — the four artefacts nobody in four rounds of this lineage has ever written.** That is the
direct answer to round 3's engineering 4 and to CHAMPION §15.1.

### 7.3 The bill, decomposed against the champion's own table so it can be attacked

| CHAMPION §9.5 line | Champion | Slice 1 here | Note |
|---|---:|---:|---|
| `MapRenderer` + Pixi scene graph + input abstraction | 8 | **0** | slice 2 |
| Tile pyramid, KTX2/Basis, zoom variants, streaming | 10 | **0** | slice 2 |
| Tokens: placement, drag, snap ×3, elevation, server validation | 8 | **3** | positions as `Zustand`, rendered as outline |
| UVTT `.dd2vtt` import **and** export | 6 | **6** | a parser, not a renderer — and RB-11 §3 mandates export at launch |
| Fog: per-character | 7 | **2** | projection over regions; the GPU exploration texture is slice 2 |
| Combat: initiative, HP, conditions, `defeat_pending`, undo, timers | 7 | **7** | |
| Dice: seeded roller, AST, roll card, `Trace`, Publish/Verdeckte Probe | 9 | **9** | |
| Die Prägung: five handlers, Sitzungspuffer, Fällung, Augenblick | 10 | **10** | |
| Accessibility + the Outline recipe as a real play surface | 8 (**high**) | **8** (med) | risk falls: nothing to reconcile with |
| Perf harness, budget scene, CI gates, perf HUD | 4 | **1** | no renderer to gate |
| Der Kartenabzug + masked-handout derivative service | 6 | **4** | handout masks stay; the map raster is slice 2 |
| Der Zwillingsbeweis | 5 | **5** | +1 fixture pair for the door |
| B9 / totality / Anmerkung / Bild-Passage / `NurLeitung` | 9 | **9** | |
| Der Handschlag + „Zwei Versionen, ein Abend" | 3 | **3** | |
| | **≈100 + 20 % = 120** | **67** | |

**Plus die Woche itself:**

| Item | Days | Risk |
|---|---:|---|
| `Vollmacht`: object, issuance in die Fällung, expiry job, the `praegung.beleg` precondition, revocation, caps, audit | 5 | med |
| `Brief`: envelope, server-side hold check, Revelation fan-out with `granted_via: brief`, Postlaufzeit, the covering note as `UntrustedText` in the Kodex | 4 | low |
| Der Umbruch: `Lesestand`, in-place marks, gate „Kein Strom", `oracles.yaml` row, Zwillingsbeweis fixture | 5 | med |
| Die Woche surface: the `NurLeitung` set difference (GM) + doors and letters (player) | 4 | low |
| **Der rote Link ist eine Tür**: link↔Vollmacht binding, door-state projection, the `tuer_zustand` oracle and its fixture pair | 3 | **high** — it is a new oracle on the most-rendered atom in the product |
| Der Zug: the GM's async release from a phone (P2, no new gesture) | 2 | low |
| Briefkasten: intent-and-receipt (two-way), honest receipts, drain-on-wake | 3 | med |
| | **26** | |

**Slice 1 tactical + week ≈ 67 + 26 = 93 days, against the champion's 120 — and the 27 days saved are
not the point. The point is that all four unspiked artefacts are on the other side of the line.**

### 7.4 What is explicitly **not** in slice 1 — read twice, this is where candidates cheat

Everything the champion excludes (ProseMirror, the identity registry, mint leases, `StructuralIntent`,
split/merge, die Zollgrenze, der Nachtrag, die Schonfrist, die Fassungsprobe, dynamic LOS, wall
authoring, Scene Levels, animated maps, WFC, the second skin, the theme editor, the full visual
rule-builder, Electron, universes as a visible concept, collaborative editing, item templates, **AI of
any kind**, `PassageVariant`) — **plus**:

- **Pixi, the tile pyramid, KTX2 and the GPU fog texture.**
- **Die Postlaufzeit as a configurable world post** — slice 1 ships a single campaign-wide constant
  (`0 Tage` default). The geography is slice 2.
- **Der Aushang** (§9.2) — slice 2. Slice 1's landing is the Kodex index with the Umbruch marks.
- **Die Ausgabe as a publishable package** (§9.3) — launch-blocking, not slice 1.
- **Push notifications of any kind.** A letter arriving must never buzz a phone in slice 1; the
  receipt is in-app and honest. Notification design is a product decision with its own verdict.
- **`freigabe: offen` Vollmachten** — the version that defers the sealed line to the GM. It is the
  mitigation for §8.2 and it is *also* the shape that re-creates GM debt, so it does not ship until
  the Türquote gate (§7.5) has run and we know what the real authoring cost is.

**If slice 1 must shrink, the honest cut order:** (1) UVTT *export*, keeping import; (2) der Brief,
keeping die Vollmacht — the door is the flex, the letter is the depth; (3) der Zug; (4) hex and
gridless. **Never** the closed set of five mint handlers, **never** `Sicht` or B9, **never**
`haelt_etikett` or `erfahrungsgrad`, **never** der Zwillingsbeweis, **never** die Herkunftsschicht, and
**never** die Vollmacht — without it this is the champion with fewer days.

### 7.5 Gate zero, and it is cheaper here than in the champion

The round-3 verdict's gate zero is the **Prägerate**, and its complaint was that the champion cannot
measure it without ~120 days of renderer first. **Under this thesis it is measurable in slice 1 with
no canvas at all**, and it splits into two:

| Gate | Green when | If red |
|---|---|---|
| **Prägerate** (carried) | Instrumented four-hour session: **≥8 mints**, ≤4 min GM chrome typing, no interaction >12 s, ≤2 named regretted omissions, printed mint mix. | The champion's thesis is refuted and so is this one. |
| **W1 · die Türquote** (new, and it is *this* candidate's gate zero) | Over **four instrumented weeks**: **≥50 % of issued Vollmachten are fired before expiry**; **≥1 Vorhaben per player per week**; the GM's issuance ritual costs **≤120 s per session**; and **≥3 of the 4 weeks contain at least one mint on a non-session day.** | **The thesis is refuted.** The GM will not run a Tuesday game, we rebuilt an inbox with better manners, and the champion's Saturday shape was right. Say so before marketing does. |
| **W2 · das dickere Buch** (sharpens CHAMPION's „dünnstes Buch") | Over the same four weeks the **thinnest player book gains ≥3 passages from non-session days**. | Die Woche does not fix CHAMPION §15.5 and its second-best argument is gone. |
| **W3 · kein Strom** | Gate „Kein Strom" (§5.1) green: no time-ordered container; strip the article contexts and nothing renders. | Der Umbruch is a log and the anti-log invariant is lost. |

S-P1 (*Drei Bücher, ein Server*, ~2 days) and the Prägerate harness are carried as mandatory. **S-T1
is deferred with the canvas** — and that is the most consequential scheduling claim in this document,
because it means slice 1 does not need the round's most expensive spike to start.

---

## 8. Weaknesses — the honest ledger

### 8.1 There is zero market evidence that a GM will open a door, and that is the shape that killed round-3 A

The RB corpus contains **no evidence of demand for between-session play**, because no product in it
ships one. The single adjacent data point — TaleSpire's persistent cloud boards that seat-holders can
enter while the owner is offline (`RB-01-talespire.md` §Feature inventory) — has **no character
sheets, no rules automation and no journals**, so it proves that people will *stand* in an empty world,
not that they will *play* in a full one. Fantasy Grounds' Online Reader is the closest thing to a
between-sessions product anyone has built, and they shipped it **read-only**
(`RB-01-fantasy-grounds.md` §Platform) — which I read as encouraging and an attacker will read as a
mature vendor having correctly judged the demand.

**This is exactly Der Konvent's fatal shape** (*„nobody wants it"*, round-03 verdict §2.2), and I will
not argue my way out of it. It is charged to gate **W1** and W1 is four weeks of instrumentation, not a
document.

### 8.2 The GM's authoring cost moved; it did not vanish — and this is the hard one

The champion's central economic claim is *prep shrinks to a seed*. A Vollmacht is **prep with a
target number** — a sealed line written in advance for a specific outcome, at 23:41, by someone who has
been running a game for four hours. Three of them at 90 seconds each is 4.5 minutes at the worst moment
of the week, and CHAMPION's Prägerate gate allows **≤4 min of GM chrome typing for the entire
session.** **Die Woche's ritual can consume the champion's entire typing budget by itself.**

Three partial answers, none a cure:

- Die Lücke (CHAMPION §10.6) already computes the candidate list, so the GM chooses rather than
  invents; the composer is one line, not a document.
- The Vollmacht she wrote for Saturday's sealed seed lines is often *already written* — an unreleased
  sealed Anlass line becomes a Vollmacht by pointing at it, at a cost of one keypress and a threshold.
- `freigabe: offen` removes the writing entirely and resolves as *„du hast etwas gefunden — Kaya
  erzählt es dir"*, becoming a P2 Souffleur next session. **But that is GM debt, which is the inbox
  wearing a different hat**, so it is held out of slice 1 (§7.4) until W1 tells us the real cost.

**I do not have a clean answer.** The tension is structural: *no prep* and *pre-authorised outcomes*
pull in opposite directions, and every mitigation either costs the GM writing or costs her a debt.
This is the weakness I most want the attack pass to break, because the break is worth more than my
defence.

### 8.3 Availability stops being optional, and Fantasy Grounds gives away free the thing I now need on six more days

**The number, with inputs shown.** Die Welt must be able to resolve a roll and project a Sicht on a
Tuesday; der Briefkasten cannot, by construction (it cannot read its own contents). So the world runs
**scale-to-zero, woken by a request**:

- Per campaign-week: 4 players × ~1.5 reads/fires/letters ≈ **6 wake events**, ≤**20** for a heavy table.
- Per wake: cold start ~0.3–0.8 s + a 60 s idle timeout so a second action feels instant ⇒ budget
  **≤90 s of compute per wake**.
- 20 × 90 s = 1,800 s = **0.5 compute-hours per campaign-week ⇒ ~2.2 per campaign-month ⇒ ~26 per
  campaign-year.**
- Against **die Raumuhr's 300 hosted room-hours/year** (CHAMPION §14.1): **8.7 % of the allowance.**
  Against ~16 session-hours a month, die Woche is **+14 % hosted compute.**
- Der Briefkasten's own cost is unchanged at **< €0.01 per campaign-month** and the letter payloads sit
  inside its existing 200-item / 2 MB cap.
- **Cost per session-hour stays inside CHAMPION §14.3's < €0.05**; the week adds a rounding error to
  compute and **nothing to asset egress**, because between sessions nobody loads a map.

*All figures are estimates with their inputs shown. None is a vendor quote.*

**And the honest degradation, which is worse under this thesis than under the champion's.** CHAMPION
§14.3's reachability table is carried unchanged — hosted room as the v1 default, Electron host,
ACME DNS-01 for a GM who owns a domain (no inbound port needed, so it works behind CGNAT), tunnels
documented and CI-tested but operated by neither of us, Plex-pattern DNS+PKI **explicitly deferred and
named as deferred**. What changes is the *experience* of the degraded paths:

| Path | v1? | What Tuesday actually looks like |
|---|---|---|
| **Hosted room** (default) | **Yes** | Sera fires at 22:41 and has her paragraph at 22:41. The GM never meets the words port, certificate, NAT or IP. |
| Electron host, laptop open | Yes, €0 | Identical. |
| **Electron host, laptop shut** | Yes, **printed on the tin** | The Vorhaben is **posted, not resolved.** An intent blob goes to der Briefkasten with an honest receipt — *„Zugestellt. Kayas Welt war zuletzt Sonntag wach."* The world drains it on next wake and the chip carries both moments. **The week still accretes; it accretes in bursts.** |
| Electron host + browser players on LAN | Yes, degraded | Plain `http://192.168.x.x` is not a secure context: no service worker, so **no offline Kodex** — which under this thesis costs more than it did, because the offline Kodex is where a letter is written. |
| LAN-only / `keiner` | Yes | Vorhaben resolve only when author and world share a network. Stated in the join dialog. |
| Remote players, GM behind CGNAT, no hosted room | — | Unchanged and unsolved: hosted room, a tunnel, or a relay we run. **There is no fourth.** |

**The structural loss stands and gets worse.** Fantasy Grounds went **free-to-play on 2025-11-08** and
ships a **cloud relay that solves reachability for their users at no charge**
(`RB-01-fantasy-grounds.md` §Platform). §8.3 is where we pay for what they give away, and Die Woche
extends the days on which we pay. **This is not closable by design and I will not pretend otherwise.**

### 8.4 Der Umbruch is a rule with a gate, not a type — and it is the invariant most likely to be traded away

`NurLeitung<T>` makes a denominator **unrepresentable**. Nothing in this candidate makes a feed
unrepresentable. Gate „Kein Strom" (§5.1) can go red, which is more than the champion's prose refusal
could do — but the product pressure toward *„just show me what happened this week"* will arrive in the
first month from every user, and it will be reasonable, and the person who eventually ships it will be
us. The champion's §11 says *„the moment we ship a log view, the attack is correct and we have lost."*
**Die Woche is the thesis that makes that moment likeliest.**

### 8.5 Slice 1 has no canvas, K5 slips a slice, and Kaya must rule

K5 is Kaya's own amendment: maps, generation, sprites that beat the competitors. This candidate
delivers all of it — in slice 2. For one slice we are, against Owlbear's ~20 minutes to a table and
Foundry's play-5e-tonight, **a wiki with dice and an outline**. The Outline-first argument (§7.2) is a
real engineering argument, but **no artifact in this lineage has demonstrated that a screen-reader-
native outline table is pleasant to play on for four hours**, and if it is not, slice 1 has a table
nobody wants to sit at and the whole sequencing collapses. Logged for `OPEN-DECISIONS.md` beside the
champion's WFC reallocation.

### 8.6 A pre-signed mint is a delegated authority, and the product's promise is that the GM decides

Scoped, capped, immutable, unchainable, revocable, expiring, audited — and still: the first time a
Vollmacht releases a sealed line at 03:00 in a way the GM meant differently, she will experience the
product as having written canon behind her back. The champion's five-word invariant
(*„Nichts wird automatisch Kanon"*) becomes a fifteen-word one
(*„Nichts wird Kanon, das die Spielleitung nicht selbst geschrieben und freigegeben hat"*).
**Shorter invariants survive contact with tired developers; longer ones get exceptions.** Athena
should attack the revocation race directly: a Vollmacht revoked at 22:41:07 while a roll resolves at
22:41:08 must lose, and the transaction that proves it must be one the projector cannot skip.

### 8.7 The product models being wrong. It does not model lying.

A `Brief` carries only passages its sender **holds**, server-validated. So a player cannot write *„I
tell him the seal is genuine"* when her character knows it is forged: the covering note can say it, but
the note is never canon and produces no Revelation, so the lie has **no mechanical existence**. What
the product *does* model, and models beautifully, is honest transmission of falsehood — a character
who holds an `irrig` passage passes it on, and the recipient inherits a false belief with a true
provenance. **Being wrong is modelled; lying is not.** Deception between player characters is one of
the best things in tabletop and we refuse it, because the alternative is letting a player write GM
ground truth (`Revelation.belief`), which is the one boolean CHAMPION §8.5 calls *„what makes the
product a story tool instead of a database."*

### 8.8 Carried from the champion, unfixed and in some cases worsened

- **`Sicht` is unbuilt for the fourth round** (CHAMPION §15.10) — and this candidate **adds two new
  projected surfaces** (`tuer_zustand`, `umbruch`) and a third (`briefwechsel`) on top of it. S-P1 is
  two days and there is no excuse left; here it is a precondition, not a wish.
- **Fandom-grade at scale is still unproven** (CHAMPION §15.3) and Die Woche makes it worse *again*:
  more short passages, arriving on more days, plus a per-reader watermark join on every article render.
  `retrieve()` p95 < 80 ms against the 5,000-entity fixture is now **red until run, five rounds
  running**.
- **The art pipeline is still unpriced**, one 3.47 MB plate against a 1.2 MB first-paint budget.
- **Right-to-erasure vs. a durable `Wurf`** is untouched, and a `Brief` adds a second person's writing
  to the same collision.
- **The 02:00 long-form writer is still the least-served user**, and this candidate defers her editor
  again. World Anvil and LegendKeeper serve her better than we will for two slices.

---

## 9. Creative extensions — what the thesis makes possible that nobody asked for

### 9.1 Die Postlaufzeit — distance becomes a game mechanic expressed in the wiki

The GM sets the world's post: *„Ein Brief nach Sarn braucht vier Tage."* A `Brief` carries
`zustellung_am`, and the Revelation lands **on the in-fiction arrival date**. One nullable column, and
the campaign acquires a **postal geography**: the party in the north does not know for a week what the
capital learned on Monday, and the `−2 · nur gehört` on their roll is *dated*. It produces the single
best dramatic object the product can hold — **a letter in transit**: written, unreadable, arriving
Thursday — and it is a reason to open the app on a Thursday that is not a notification. Nobody in the
RB corpus models in-fiction latency of any kind.

### 9.2 Der Aushang — Fandom's main page, computed per character, re-laid every day

Every reader's book is already different. So the Story zone's landing becomes a **front page**: the
three articles with the most accretion *in her book*, her open doors, her letters in transit, and one
red link she can walk through. It is the anti-log's positive form — **the spine is the article, never
the clock** — and it is the answer to CHAMPION §15.9 (*„minute one is lost"*) that neither die
Gegenüberstellung nor die geteilte Infobox could be: a shipped `Anlass` arrives with a front page
**already composed**, so a solo evaluator on a Tuesday opens something that looks like a world with a
newspaper, ninety seconds after install. *(It also composes with the rival thesis of this round, and
the verdict should notice that.)*

### 9.3 Die Ausgabe — the tradeable unit becomes a week, and it is the go-to-market

RB-11 ratified that **discovery runs through creators, not gamers**, and that Dungeon Alchemist reached
the whole market by exporting into its rivals (€2.46 M from 57,209 backers). The champion's tradeable
unit is an `Anlass` — a seed. Die Woche's is **eine Ausgabe**: a seed, *plus* a set of Vollmachten with
their sealed lines, *plus* one or two letters already in transit. A GM installs it and her table has
**six days of play before the next Saturday**, not a map and a hope.

It is declarative, has no code-execution escape hatch (an Ausgabe is Vollmacht rows and sealed
Passages, and the only leaf type in the travelling AST is `Text`), it is authored in the Forge — the
separable, single-user, screenshottable half RB-11 identified as the Steam-shaped one — and it fills
the gap in the registry between *a map* and *a campaign* where nobody currently sells anything. It is
also the only content format in this market that a rival **cannot consume**, which is the mirror of the
UVTT export strategy: we export into their tools, and they cannot import our weeks.

### 9.4 Die Chronik bekommt Zwischenkapitel — the printed book gains an epistolary form

Die Chronik (CHAMPION §10.3) prints a finished campaign as a book whose **chapters are evenings and
whose footnotes are dice**. Die Woche gives it what every real chronicle has and no VTT can produce:
**between the chapters, the letters.** Print is already the fourth render recipe (Druck) with a CI step
asserting *footnote count == chip count*; add one assertion — *Zwischenkapitel count == delivered Brief
count* — and the retention object becomes a genuinely beautiful book. Nobody else can print it, because
nobody else knows which sentence came from which roll, on which day, in which letter.

---

## 10. What this candidate refuses

Everything CHAMPION §11 refuses, carried verbatim — no arbitrary code execution, no `innerHTML`, no
embedded query language, no AI on the critical path and no automatic canon at any tier, **no session-log
surface**, no sixth mint gesture without a verdict, no 3D, no feature-count war, no bare single-letter
shortcuts, no `campaign`/`user` as stored subject types, no `confidence` field, no anonymous bearer
token, no `PassageVariant` — **plus five of its own:**

- **No third session concept.** `AuthSession ≠ GameSession` already holds; a week is a computed window,
  never a stored entity.
- **No player-authored canon.** A `Brief` transmits; it does not create. `begleittext` is
  `UntrustedText` in a personal Kodex, never a Passage, never a Revelation, never in an export as canon.
- **No unbounded issuance.** ≤1 Vollmacht per player per week + 2 free-floating, server-enforced, and
  everything unspent expires. **An inbox fills; a Vollmacht drains.**
- **No chaining.** No constructor yields a `Vollmacht`. An authorisation cannot authorise.
- **No notifications in slice 1.** A letter arriving must not buzz a phone. If the only reason a player
  opens the app on a Tuesday is that we interrupted her, the thesis is false and the gate should say so
  rather than the push service hiding it.

---

## 11. Kaya's amendments, answered where this candidate differs from the champion

| | Amendment | Where this candidate differs |
|---|---|---|
| **K1** | Themes + templates | Unchanged (two kits at launch, contrast measured on painted pixels). One addition: **the weekday is a fourth provenance channel** alongside glyph/colour/stroke, and it is text, so it survives high contrast, greyscale and print by construction. |
| **K2** | Visual GUI rule-builder | Unchanged, **plus der Vollmachtszettel** — a third no-YAML authoring surface after die Regelkarte and der Klauselzettel, and the one that produces a sellable artefact (§9.3). Conceded again: Alchemy shipped their Sheet Builder first (`RB-01-alchemy.md` §Feature inventory). |
| **K3** | State-of-the-art GUI | Unchanged, and **strengthened by the cut**: the Outline recipe ships first as a real play surface, so accessibility is architecture in the literal sense for the first time in four rounds (§7.2). |
| **K4** | Differentiation | §2's ledger. New axis: **the seventh day.** Every rival is a Saturday product; two of them (Roll20, Foundry) do not have a working phone at all. |
| **K5** | Maps, generation, sprites | **The honest divergence. Everything in CHAMPION §9 is carried, none of it is refused, and the canvas moves to slice 2.** WFC stays in slice 3. **Kaya must rule** (§8.5). |
| **K6** | Distribution | Unchanged and *more* load-bearing: the browser on a phone is not the Wednesday read any more, it is the Tuesday **play** surface. Electron remains the self-hosting invariant's implementation and now also the thing whose lid being shut is a printed degradation (§8.3). |
| **K7** | Game feel through staging | Fully honoured. The most cinematic moment in the product becomes **a red link turning into a door**, and a letter arriving — transitions between two pieces of the user's own record, never a depicted world. |

---

*Candidate A, round 4. The bet, unhedged: **the champion's invariant says „a human keypress" and never
noticed it did not say „now". Two hands, three days apart, and the canon accretes on a Tuesday.** It
buys week one instead of Saturday four, it gives the player something to do instead of something to
read, and it pays for it with the canvas in slice 1, with prep coming partly back at 23:41, and with a
world that has to be reachable on six more days. If the GM does not open the door, W1 goes red in four
weeks and this document is wrong — which is four weeks and not a year, and that is the second-best
thing about it.*

> *Der Würfel fiel an einem Dienstag,*
> *und niemand sah ihm zu —*
> *nur eine Zeile, die schon geschrieben war,*
> *und eine Hand, drei Tage jung.*
