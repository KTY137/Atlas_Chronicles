# Round 3 — Verdict

**Winner: B — „Der Abend" (the canon is the residue of play). 2–1, 20:18.**
Champion v3 (*Das Skriptorium*) is superseded by champion v4 (*Der Abend*), with five grafts from
A — „Der Konvent" — and both hardening passes folded in.

Lineage: [`product-A.md`](product-A.md) · [`product-B.md`](product-B.md) ·
[`attack-A.md`](attack-A.md) · [`attack-B.md`](attack-B.md) ·
[`features-A.md`](features-A.md) · [`features-B.md`](features-B.md) ·
spikes `spike-A1/A2/B1/B2.html` and their four cross-reviews.

---

## 1. The scores

| Lens | A — Der Konvent | B — Der Abend | Lens winner | Margin |
|---|---:|---:|---|---:|
| **Product & the flex** | **5** | **8** | B | 3 |
| **Engineering & buildability** | **8** | **4** | **A** | **4** |
| **Market & differentiation** | **5** | **8** | B | 3 |
| **Total** | **18** | **20** | **B, 2–1** | **2** |

**The margin history, which is itself a finding:**

| Round | Result | Margin |
|---|---|---:|
| 1 | A (Living Codex) 3–0 | 24:14 |
| 1b | A 2–1 | 21:19 |
| 2 | A (Skriptorium) 2–1 | 20:17 |
| **3** | **B (Der Abend) 2–1** | **20:18** |

Four rounds, four narrowing margins, and this is the first round in which **the losing candidate won
a lens by four points**. Nothing in the lineage has ever been this close to a hung verdict, and
nothing in the lineage has ever produced a split this violent on a single candidate: B scored 8, 4, 8.

---

## 2. Where the judges disagreed — and what that disagreement means

This is the most valuable section in the round and it is not smoothed.

### 2.1 The 8/4/8 is not noise. It is two judges and one judge reading *the same four artifacts* as evidence of different things.

The product and market judges both weighted the rendered spikes heavily and both said so in
writing. The engineering judge read the identical files and wrote: *"Both artifacts are HTML article
pages… There is no Pixi, no tile pyramid, no KTX2, no fog texture, no UVTT parser, no dice AST, no
server anywhere in the round."*

**Both readings are correct, and they are correct about different halves of the same candidate.**
B's four spikes render the wiki half — beautifully, and with a real bidirectional derivation
(`spike-B1.html:1339ff` prints a `+2` that carries its own clause; `zeichneAugenblick` at 1466 draws
a real board with fog, walls and an initiative strip). The wiki half is therefore *evidenced*. The
tactical half — the 98-day line item that became ~123 days after the feature pass, the line the
whole differentiation rests on — is evidenced by **nothing at all**. `spike-B2`'s "scene" is a
hand-authored SVG path string.

So the disagreement is **not a taste disagreement about what a good product is**. It is a
measurement gap with a precise address: *the round shipped four documents and four HTML pages, and
zero lines of server, renderer or projector code, in a round whose winner's central engineering
claim is a renderer bill.* Two judges scored the demonstrated half; one scored the undemonstrated
half. Neither is wrong, and averaging them would destroy the only useful information in the split.

### 2.2 The two candidates fail in opposite, non-overlapping ways — and that is why the vote is 2–1 and not 3–0 either way.

| | A — Der Konvent | B — Der Abend |
|---|---|---|
| **Fatal shape** | *"Nobody wants it."* | *"You cannot build it."* |
| Evidence for the demand | **Zero**, by its own §9.1 | RB-05 #3/#4/#10 — documented unmet demand |
| Evidence for the bill | The only checkable number in the round (after F12 halved slice 1) | 123 days, unspiked in every dimension, high-risk on the two differentiating lines |
| Failure residue | A shipped Skriptorium plus a byline strip — survivable | *"a mediocre VTT with an unusual footnote control"* — its own words |
| Optionality | Best in the round: no canvas, no Pixi, boring stack | Worst in the round: Pixi + tile pyramid + KTX2 + GPU fog + zero-per-frame-allocation CI gates |

The engineering judge is right that A is the better-engineered product. The product and market
judges are right that it is the better-engineered product **for a market nobody has shown exists**,
and that it declines, in writing, to enter the category the buyer is shopping. Those two statements
do not contradict each other, and the round should stop pretending a verdict can make them.

### 2.3 Three judges named three different decisive measurements, and **not one of them has been made.**

- **Product judge:** *"measure the mint rate before anything else is scoped"* — B's ≥8 mints per
  instrumented four-hour session.
- **Engineering judge:** spike the tactical half — Pixi scene graph + tile pyramid + per-character
  fog texture + `.dd2vtt` import, hitting RB-02's budget, in ≤25 measured days.
- **Market judge:** either a positioning ruling from Kaya (knowledge product first or table first),
  or A's own falsifier — ≥1 Feldnotiz per player per three sessions, ≥40 % of Anträge ratified.

Three lenses, three flip conditions, three unmade measurements. **That, and not the winner, is the
actual output of round 3.** Every one of them is cheap. Section 6 says plainly what it means that
none was run.

### 2.4 A disagreement inside the product lens that both other judges missed.

The product judge scored A's flex the *best single line in three rounds* and simultaneously scored
the candidate a 5, because the photograph is **an absence**: the payload is five paragraphs that are
not there. Both A spikes independently bolted a counter onto the reader's own page
(`spike-A2.html:1550` — a pulsing „−5 Absätze entfallen"; `spike-A1.html:1322` — „Anträge: 1 offen"),
which Nemesis correctly calls a fatal leak. The product judge reads it as something worse than a
leak: **a design tell.** Two uncoordinated authors each concluded the image did not read on its own
and each added a number to make it legible. That is evidence about the flex, not about the authors,
and it is the single most damaging finding against A — more damaging than anything in the attack.

The counter-observation, which the round must also keep: **every fatal found in A was outside the
projection function.** The projection itself was clean in both artifacts. That is a genuinely
reassuring result about where the danger lives, and it belongs in the champion as a rule, not a
footnote.

### 2.5 What the judges did *not* disagree about, and it decided the round.

All three, independently, recorded that **B is the only candidate that ships a table**, and none of
them disputed that A's §10 refuses the map canvas, clauses, the Wissensprobe, the Fassungsprobe and
the Souffleur, and closes with *"It does not claim to be a virtual tabletop."* The engineering judge
scored A an 8 **and still described its slice as having no game in it**. Unanimity on the fact,
disagreement on whether it is disqualifying.

---

## 3. The ruling

> **Champion: B — Der Abend. The canon is the residue of play.**
> **It wins conditionally, and the conditions are written into the champion as gate zero.**

### 3.1 The reasoning chain

1. **A concedes half of Kaya's sentence in writing, before any score is counted.** The brief is
   *Wiki/Fandom **+** PnP session*, each half making the other stronger. A's slice 1 refuses the map
   canvas, and — decisively — cuts **die Wissensprobe by name**, which is the *only* knowledge→play
   mechanism in the lineage. A's slice 1 therefore has **no wiki→table direction at all**: it is an
   encyclopedia beside a combat strip. Two features in one window is not the fusion.
2. **Round 2's verdict made *"there is still no game in it"* round 3's binding work order.** B
   discharges it — dice, tokens, three grid types, elevation, UVTT import *and* export, per-character
   fog, initiative, `defeat_pending`, undo ring, canvas accessibility, costed line by line with two
   falsifiers on the two high-risk rows. A does not. A verdict that ignores its own previous binding
   item is not a verdict.
3. **B's fusion is mechanically inseparable, and that is checkable in the artifact.**
   Wurf → Passage → footnote runs table→wiki; `haelt_etikett` / `erfahrungsgrad` run wiki→table,
   printing `+2` to Sera and `+0 · Hörensagen` to Brannt **off the same clause**
   (`spike-B1.html` BELEGE.b1/b5). Neither half computes without the other. That is the brief, in one
   frame, rendered rather than claimed.
4. **B's differentiators are grounded in documented unmet demand; A's central bet is grounded in
   nothing.** Per-character fog is RB-05's *"single loudest unmet demand"* — Roll20 removed it with
   *"no way to turn this back"*, Foundry only has shared. Lossless UVTT import **and** export: RB-05
   #4 records no VTT does it well natively, and RB-11's ratified precedent is Dungeon Alchemist
   reaching the whole market by exporting into its rivals. Against that, A's own §9.1: *"There is
   zero market evidence that players will write."*
5. **B got better under attack in the way that matters most.** The first fatal family — the
   projection leaks everywhere it is not text (marginalia, figure, cardinal, wall geometry) — was not
   answered with four patches but with one rule (*anything needing permissions is a node with a pid*),
   one boundary (B9: the payload carries no permission fields, so `display:none` becomes unwritable)
   and **der Zwillingsbeweis**, the first property gate in four rounds that can go red for a leak
   class nobody named in advance. Before the attack nobody could say whether it leaked; now a machine
   can.

### 3.2 What the ruling explicitly does **not** claim

It does not claim B is the better-engineered candidate. It is not. The engineering 4 stands
undiscounted and is written into the champion as its largest named risk. **A solo developer who
commits to ~123 days of unspiked tactical work ships nothing for roughly a year and only then
discovers whether the GM presses `Ctrl+Enter` eight times in an evening.** That sentence is now
§15.1 of the champion.

### 3.3 The conditions under which this ruling is wrong — each with the measurement that settles it

| # | The ruling is wrong if… | Measurement | Consequence |
|---|---|---|---|
| **C1** | the GM does not mint | **Prägerate**: instrumented four-hour session — ≥8 mints, ≤4 min GM chrome typing, no interaction >12 s, ≤2 named regretted omissions | Red ⇒ the page stays grey, the footnote gallery is empty, **the thesis is refuted** and A's flex — which needs one ratified note and two seats — was the safer bet. **This is gate zero and nothing else is scoped until it runs.** |
| **C2** | the tactical bill is fiction | **Spike S-T1**: running Pixi scene graph behind `MapRenderer` + tile pyramid + per-character fog texture + a real `.dd2vtt` import, hitting RB-02's budget (60 fps / 300 tokens / 1,500 wall segments / zero per-frame allocations) on the reference laptop, **in ≤25 measured days** | Over 25 days ⇒ the champion cuts to per-character fog only, square grid only, no tile pyramid, and the round says the bill was wrong. Over 40 ⇒ the ruling was wrong and the lineage must re-fork on build-vs-defer. |
| **C3** | `Sicht` does not compose | **Spike S-P1** „Drei Bücher, ein Server": a minimal Node projector producing three byte-different payloads for Sera, Brannt and Vesper from one canonical source, none containing permission fields, with der Zwillingsbeweis run against them | Red ⇒ both candidates fall, **B less far**: it degrades to shared-party fog and page-level reveals; A's entire product *is* the projection. |
| **C4** | Kaya rules the other way on positioning | A ruling, not a fact: *is Chronicle a campaign-knowledge product first and a table second?* | If yes, the market lens inverts, A's authorship axis was the category-defining move, and ~123 days of tactical half is capital spent entering a fight the champion concedes. **Logged in `OPEN-DECISIONS.md`. The ratified intake currently points the other way** — K5 demands maps that beat the competitors, and the six-zone shell has a Table zone. |

C1 and C3 are days of work. C2 is five weeks. **All three are cheaper than one more round of
documents**, which is the finding of §6.

---

## 4. Grafted from the loser

Der Konvent loses the round and contributes the five best repairs in it. A losing candidate is
lineage, not waste.

### G1 · Der Briefkasten — the world and the letterbox are two deployables (`features-A.md` F4)

The best economic repair in four rounds, and it fixes a hole the *winner* also has. A's §7 had made
the hosted room a requirement because it assumed asynchronous authoring needs **the world** awake on
Wednesday. It needs a **letterbox**. The runtime splits: *die Welt* (canon, projections, revelations,
maps, sessions — runs when someone uses it, hosted room or the GM's Electron host) and *der
Briefkasten* (an append-only spool of small opaque encrypted blobs, capped, **cannot read its own
contents**, always on). Three impls from commit 1: our hosted spool included with the licence, BYO
S3/WebDAV, and `keiner` (LAN-only, degraded not broken).

**Why it belongs to Der Abend specifically:** the Wednesday-morning phone read is half B's thesis
(§14-K6), die Randfrage is a player writing on Wednesday, and B's own §12 never priced what has to be
awake between Saturdays. The number, in RB-11's demanded unit: **< €0.01 per campaign-month** against
€31.20 of one-time margin — under 2 % of gross margin over a 60-month campaign. It is also *less
software than what it replaces*.

### G2 · Die Berufung — the player cites her own paragraph, mid-scene (`features-A.md` F15)

A player selects a passage she holds and presses one key. It lands in the GM's rail as
*„Sera beruft sich auf: ‚Der Ring gehörte seiner Schwester.' · Brannt und Vesper halten diesen Absatz
nicht."* The holder analysis is GM-only (see G3).

Two judges named this independently as the thing to steal. It requires all four load-bearing layers
at once — an atom below the page, per-character read state on it, provenance on it, and a live
session to deliver into — so no rival can copy it. **And it is the direct answer to the champion's
worst market defect**: Nemesis M1 (Kaya 22 paragraphs / 5 Belege, Vesper 7 / 1, and the asymmetry is
*monotone in good play*). Das Zeugnis and die beantwortete Randfrage make the thin player book
denser; **die Berufung makes it do something at the table**, which is the only durable reason anyone
ever writes anything down.

### G3 · `NurLeitung<T>` und die Differenzkarte — the counted absence has exactly one legal home (`features-A.md` F3)

B's repair for the cardinality leak is the rule **Kein Nenner** — correct, and prose. A's repair is a
**type**: `NurLeitung<T>` is a wrapper with **no encoder instance in the player payload codec**, so a
GM-only number cannot be serialised to a player even by a developer who wants to. A layout lint
forbids mounting any `NurLeitung<_>` node inside the stage. The GM genuinely needs *"what does Brannt
not have?"* — it is the prep engine's best row and it is what die Berufung prints — so the number is
**relocated, not deleted**.

Two independently built A artifacts each put a cross-projection count on the reader's page; both B
artifacts did the same thing with different numbers. **Four artifacts, four authors, one bug shape.**
Shapes are fixed by moving the type, not by review. This composes exactly with B's boundary B9.

### G4 · Die Herkunftsprobe und die Umkehrung der Prüflisten — every gate becomes a deny-list (`features-A.md` F14, F11)

The single structural lesson of round 3, and it is A's: **three of the round's gates failed because
they were allow-lists written from memory.** `scanRaum()` scanned four selectors the author
remembered; `pruefeDarstellung()` measured only chrome the author wrote; `oracles.yaml` enumerated six
rows and missed `autorenliste`; B's `Prüflauf` swept 144 of 1,152 states and skipped exactly the
accessibility axes.

All of them invert to **deny-lists with their exclusions written into the gate definition**
(`document.body` minus `[data-pruefstand]`) — the rule die Goldene Signatur already imposes. Plus two
completeness gates: **die Orakelprobe** (CI walks every module emitting a reader-facing surface and
fails the build on any rendering entry point not named in `oracles.yaml` — *"the enumeration missed
one"* is repaired by making the enumeration checkable) and **die Herkunftsprobe** (every rendered
number carries `data-zahl`/`data-herkunft` naming the collection it folds; one generic property test
expands the derivation and asserts `length === value`). The second turns invariant 6 from a principle
into a compiler question and kills a whole bug class rather than its instance.

### G5 · Autorschaft ist ein Wert, kein Fremdschlüssel — and die Belegzeile ist ein Orakel (`features-A.md` F9, F10, §6.4)

Two things, one type.

**(a) The sum.** `Autorschaft = Mitglied(user_id) | Fremd(anzeigename, paket_id, autor_id) |
Pseudonym(handle, hash) | Verdeckt(sl_sichtbar_user_id) | Unbekannt(paket_id)`. Der Abend needs this
for exactly the reasons A did and had not noticed: the tradeable unit is a played `Anlass` and a
**travelling Beleg** (§10.3a) — a roll card pasted from Discord arrives with an author who is not a
user of this instance. Rendering a byline becomes a match the compiler forces you to exhaust, so no
byline render can throw on an unknown id — the bug shape present in **all four** spikes.

**(b) The doctrine, which is the more important half.** *The byline is an oracle.* Knowing that Sera
wrote something on this page leaks that Sera knows something on this page. Under Der Abend the same
sentence is true of **der Beleg**: `1d20=13 +4 Weisheit … Sera Valdris, 21:14:38` tells the reader
Sera was present, rolled, and has a +4 Wisdom — from a passage he was *permitted* to hold. So the
Beleg line, the roller's name, the participant list on an Augenblick and the term vocabulary all get
their own `felder.yaml` disclosure class and their own `oracles.yaml` rows. A's §6.4 rule is adopted
verbatim: **a non-holder sees no byline at all — not a redacted one, not a count, not "1 weiterer".**

### Honourable mentions, taken as rules rather than features

- **The uniform invitation** (`features-A.md` F16): a writing prompt shown only on sparse pages is a
  first-class oracle; shown on *every* reachable page it is information-free. Die Randfrage adopts
  the uniformity rule.
- **The A-artifact finding that every fatal was *outside* the projection function.** Recorded in the
  champion as a positive result about where the danger lives.

### Deliberately **not** grafted

- **The ratification queue.** An inbox is how software dies; A's own §9.2 says so, and Der Abend's
  mint gesture already occupies the "one human decides" slot with no backlog. Player writing enters
  through die Randfrage and die Berufung, neither of which manufactures a queue.
- **The concurrency engine (`Strukturbrief` / `Binnentext` / die Umbettung).** Excellent architecture,
  conceded unbroken by Nemesis — and A's own feature pass cut all of it from slice 1. It has no
  consumer in a champion whose slice 1 has no editor. It is preserved in lineage for the day slice 2
  needs it.
- **Die Freie Stadt / the commons presets.** A killed them itself; the segment is unevidenced on both
  sides.
- **Der Konventsband and die Zuschreibung's royalty-split channel claim.** Genuinely good, genuinely
  unfundable attention right now; the champion's Chronik covers the retention artifact. Recorded as a
  future lever, not a slice item.

---

## 5. Still unresolved — the work order for round 4

Ordered by how much damage each does if it stays unanswered.

1. **The mint rate has never been measured, and the entire champion is downstream of one keypress at
   the worst two seconds of the evening.** No feature in either hardening pass measures it, and both
   feature architects say so. **Gate zero.**
2. **~123 days of tactical half, unspiked in every dimension.** No Pixi, no tile pyramid, no KTX2, no
   fog texture, no UVTT parser, no dice AST, no perf harness — and the two lines carrying the
   differentiation are the two its own author marked high-risk. Every other estimate in the lineage is
   checkable against something; this one is checkable against nothing.
3. **`Sicht` is unbuilt and unmeasured for the third consecutive round, and both candidates loaded
   *more* onto it.** No artifact in four rounds has shown server-side per-character projection: A2
   computes it in the client, B1 computes it in the client, B2 models permission as a **role** rather
   than a character, which is a shape defect anyone copying it carries into production. Spike S-P1 is
   two days and converts the round's weakest proof into its strongest.
4. **Fandom-grade at scale is unproven after four rounds — and Der Abend makes it worse.** A wiki
   assembled from forty evenings has more short passages and more entities than one a human wrote, so
   `retrieve()` p95 against the 5,000-entity fixture is *more* load-bearing here. No artifact in the
   lineage has search, an index, disambiguation or a list longer than 41 rows. **The first word of
   Kaya's brief is "Wiki" and we have never demonstrated one.**
5. **Minute one, still.** Mitigated by die Gegenüberstellung, the corrected Saatbilanz and import; not
   cured. We are asking a market that decides at minute one (Owlbear ~20 min, Roll20 10–15) to wait
   until session four, and saying so more loudly than the previous champion did.
6. **Player retention is priced but structurally intact.** The asymmetry is monotone in play quality:
   the better the GM keeps secrets, the thinner every player's book. Das Zeugnis, die beantwortete
   Randfrage, die Berufung and the „dünnstes Buch" gate make it denser, participatory and visible.
   None of them changes the knob.
7. **The 14 days.** Killing `nachricht`/`zug` from the Sitzungspuffer shrinks the exposed surface to
   dice results and state transitions — a large improvement — and die Rückfrage finally makes the 14
   days buy exactly one named thing. **The right-to-erasure collision with a durable, citable `Wurf`
   is not resolved by anything in this round.**
8. **The editor is dormant capital.** Round 2 measured it (116 SLOC, 0.087 ms, ~60 days) and round 3's
   winner defers all of it. The 02:00 long-form world-builder is **the least-served user in the
   champion**, and she is half of Kaya's sentence too.
9. **Art pipeline cost is still `[needs a quote]`**, and B's raster path is the worst in the round —
   a single 3.47 MB plate is 2.9× the entire first-paint budget, before tile pyramids, KTX2, token
   art, atlases and masked handout derivatives.
10. **A citable `Wurf` still collides with the `Zustand` undo ring.** The answer is a nag, not a
    mechanism.

---

## 6. What actually improved this round — honestly

### The genuine advances, and there are four

1. **After three rounds of *"there is still no game in it"*, there is a game in it.** This is the
   biggest single advance since round 1. The champion's slice 1 now contains dice with a seeded
   server-side roller and a `Trace` sum type, tokens on three grid types with elevation, lossless UVTT
   import *and* export, per-character fog derived from revelations, initiative, `defeat_pending`, an
   undo ring, and accessibility over the canvas with the Outline recipe as a real play surface —
   costed line by line, with falsifiers on the two high-risk rows. The round-2 verdict's binding work
   order is discharged.
2. **The fusion became bidirectional and inseparable, in a rendered artifact.** Round 2 had the
   wiki→table direction on paper. `spike-B1.html` prints two derivations from one clause to two
   readers in their own words — `+2 · du hast es selbst erfahren` and `+0 · Hörensagen zählt nicht`.
   That is Kaya's sentence executing, not being described.
3. **The permission doctrine got its first *property* gate.** Every previous gate in the lineage was
   an example-based differential: two fixtures identical but for one secret. Der Zwillingsbeweis
   asserts *same held half ⇒ same bytes, regardless of what stands on the other side*, across HTTP
   bytes, serialised DOM, bounding boxes, `getFullAXTree`, rasterised map derivatives and response
   timing, over 200 seeds. It does not test **what** leaks; it asserts the output does not **depend**
   on unheld input. It is the only gate in four rounds that can go red for a leak class nobody named
   in advance — and it is exactly the instrument A's §9.4 needed and did not have.
4. **The pricing contradiction that has run since RB-11 was solved twice, independently.** A one-time
   licence cannot fund a world that must be awake on Wednesday. A answers with a decomposition (the
   letterbox: < €0.01/campaign-month, world runs on demand); B answers with an allowance (die Raumuhr:
   ~€30 including 300 hosted room-hours/year and 5 GB, self-host free forever above it, one-time
   top-ups, no subscription, no feature ever behind the meter). **Both are right and the champion
   takes both**, because they answer different halves — the letterbox is what has to be *awake*, the
   Raumuhr is what the licence *includes*.

### The honest counterweight, and it is heavy

**Nothing was built.** Four HTML documents and four prose documents, zero lines of server code, zero
lines of renderer code, zero lines of projector code — in a round whose winner's central engineering
claim is a 123-day renderer bill and whose central permission claim is a projection nobody has run on
a server. The engineering judge's 4 is not a stylistic preference; it is a statement that **the
round's winner is the least-evidenced candidate in the lineage.**

Worse, this is now a **pattern rather than an incident**. Round 2 grafted `Sicht` unbuilt. Round 3
loaded four more fatal-class repairs onto it and grafted it forward still unbuilt. Both round-3
candidates independently reproduced the *same* class of leak the doctrine exists to prevent —
client-side projection presented as an access-control proof — and both said so in their own
self-critiques. **A doctrine that its own authors cannot follow in a 100 KB single-file spike is not
yet a doctrine; it is an intention.** That is a process failure, not a candidate failure, and the
verdict fixes it with a rule rather than a scolding:

> **Round 4 opens with three spikes, not two documents.** S-T1 (the tactical spike, ≤25 measured
> days), S-P1 (*Drei Bücher, ein Server* — the server-side per-character projector, ~2 days), and
> the Prägerate instrumentation harness. **No candidate may claim a number that one of the three
> could have measured and did not.**

### And the honest smaller ledger

- **A got better under attack than B did, on the axis that decides shipping.** F12 halved A's slice 1
  by *deleting* its own best architecture; F7 removed a dependency rather than adding machinery. B's
  feature pass, correctly, added ~39 days and cut 10. A's hardening pass is the better document; B is
  the better product. Both statements survive the verdict.
- **The theses were materially different and neither would have lost to the other's attack.** A died
  to *"nobody wants it"*, B to *"you cannot build it"*. That is a real fork, correctly chosen in the
  round-2 verdict, and it is now **exhausted** — round 4 must not fork on *who authors* again.
- **The margin narrowed for the fourth consecutive round (24 → 21 → 20 → 20:18).** Read one way that
  means the theses are converging on the same product. Read the other way it means the candidates are
  getting better at the same rate. §7's theses are chosen to break the convergence deliberately.

---

## 7. Theses for round 4

The champion is a **Saturday product**. It is superb for four hours and a reading surface for six
days, and it needs four Saturdays before its own flex photographs. Both unanswered halves of that
sentence get a candidate.

**Thesis A — „Die Woche" (the campaign has no off-days).** Between the Saturdays the world is
*playable*, not merely readable. A downtime action, a letter, a solo GM turn, a play-by-post exchange
run through the same five mint gestures over der Briefkasten, so canon accretes on a Tuesday too. It
attacks the champion's two worst numbers at once — session one is empty, and the player's book is
thin — by decoupling accretion from the calendar and giving the player something to *do* rather than
read. Its named fatal: availability stops being optional, the anti-log invariant comes under fresh
pressure (asynchronous play needs a place to see what happened, which is the log §11 refuses), and
the GM's inbox returns — the exact machinery Der Konvent was penalised for.

**Thesis B — „Die erste Minute" (the world arrives already lived-in).** The champion sells the
residue of forty evenings; this thesis manufactures the first four **legitimately**. The tradeable
unit becomes a *played* `Anlass` — a seed plus one real table's evening, shipped with real Belege,
real Augenblicke and real per-character books — so a solo evaluator on a Tuesday opens a campaign
that is already amber, opens a footnote into a scene, and turns the reader dial in ninety seconds.
Import is re-run through the same pass. It buys the minute-one battle the champion concedes and it
buys RB-11's ratified creator channel. Its named fatal: a second content pipeline we must author,
license and fund; the demo world is better than the customer's own for four weeks (Nemesis M3's shape
exactly); and a manufactured provenance layer collides head-on with the one honesty claim everything
in this product hangs from.

They would not lose to the same attack: A dies to *"the GM will not run a Tuesday game and you rebuilt
the inbox"*, B to *"you sold a photograph of somebody else's table."*

---

> *Der Griffel schwieg, der Würfel sprach,*
> *und was er sprach, steht in der Zeile —*
> *doch unter allem, ungebaut,*
> *wartet der Server auf sein Urteil.*
