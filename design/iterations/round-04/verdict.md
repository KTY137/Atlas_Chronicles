# Round 4 — Verdict

## 1. The score table

| Lens | A — Die Woche | B — Die erste Minute |
|---|---:|---:|
| Product & the flex | **8** | 5 |
| Engineering & buildability | 4 | **8** |
| Market & differentiation | **7** | 5.5 |
| **Sum** | **19** | **18.5** |
| Lens wins | **2** | 1 |

**Margin history:** 24:14 → 21:19 → 20:17 → 20:18 → **19:18.5**. This round is the narrowest split in
five iterations of this lineage — half a point on the raw sum, and the lens-win count (2–1) hides a
4-point spread on the one lens that asks whether a solo developer with an AI crew can actually ship the
thing. **Nobody should read "A won" as "A won clearly." A won a coin flip that happened to land twice
on the same side.**

---

## 2. Where the judges disagreed — and what that disagreement means

**This is not noise. It is the same fact, weighted three different ways.**

All three judges independently converge on one finding: **each candidate's single most-repeated,
most-marketed claim has a hole in it**, and the two holes are of a different *kind*, not just a
different size.

- **A's hole is architectural.** The mechanism the whole thesis turns on — *"two hands, three days
  apart"* — requires a specific character's identity to survive across days with **no account**, on
  the very substrate whose permission model is keyed to `user_id` and whose presence model calls the
  connection *"ephemeral, never persisted"* (attack-A.md Break 1, **fatal**). The fix that
  features-A.md supplies (Die Wiederkehr: passkeys, a recovery-code flow, device-credential tables, an
  idempotent two-phase roll state machine, and an always-reachable scale-to-zero backend) is not a
  patch of the same size as the break. **It is a second security-critical subsystem, invented after
  attack, changing the product's runtime shape from a session-scoped app into an always-on async
  service.** The engineering judge scored this **4** and would not discount it even after the fix was
  supplied, because the fix's *existence* is the finding: the thesis needed an identity model the base
  architecture had explicitly refused, and now has one, at a cost nobody scoped before attack.

- **B's hole is an execution gap on a mechanic the champion already owns.** `Erfahren schlägt Gehört`
  (§4.4 of the current CHAMPION) is not new — it is inherited, unattacked, unchanged doctrine from
  round 3. B's spike simply never wired the *second* side of it: `haelt_etikett` was hardcoded for Sera
  and never evaluated for Brannt at all (attack-B.md Break 2, **major**, not fatal). The fix
  (Die Wissensprojektion: a real per-`(actor, passage)` Revelation ledger with a dual-write-on-reveal
  transaction) is genuine engine work, but it is **finishing a data shape the champion's own domain
  model already anticipated** (product-B.md §7.1(c)), not inventing a new subsystem class. The
  engineering judge scored this candidate an **8** for exactly that reason: the delta is close to free,
  adds no reachability complexity, and defers the lineage's hardest unsolved problem (NAT/CGNAT
  reachability) rather than making it load-bearing.

**That is the disagreement, stated once and not smoothed over: is a mechanism that is unbuilt-but-native
worse or better than a mechanism that is built-but-structurally-foreign?** The engineering judge says
foreign is worse, by a wide margin, because "foreign" here specifically means *two runtime systems
under one name*. The product and market judges say the payoff is worth it, because A's flex is the
only demo in the round that needs no session, no four Saturdays and no friends online — and it opens
market territory (the seventh day) that every rival, without exception, has ceded by construction.

**A second, quieter disagreement:** the market judge and the product judge both flag, unprompted, the
exact same "steal this" — Nachrechnen, B's re-executable seed-replay verifier — as something A's own
Vollmacht/Beleg card should simply also have, "at almost no design cost." When two independent judges
converge on the same graft without being asked to reconcile the candidates, that graft is not a
consolation prize; it is a signal the winning candidate is missing a control the losing one already
solved cheaply.

**Third: both engineering and market judges name the same conditional collapse for A**, from opposite
directions. Engineering: if the no-account constraint is dropped, A's whole identity problem
evaporates and its remaining profile is "substantially more buildable" than B's unbuilt ledger — flip
to A, hard. Market: if it turns out there is *no* fix for Break 1 that doesn't reintroduce an anonymous
bearer token or require an account, the seventh-day thesis "collapses to works only for players who
never lose their session," and the flip goes to B. **Both judges are pointing at the same lever — how
strictly "no account" is enforced — and reaching opposite conclusions about which way the lever should
be pulled.** That lever is the actual fork this verdict has to resolve, not a side issue.

---

## 3. The ruling

**Champion: A — Die Woche.** It becomes CHAMPION v5, superseding v4 *Der Abend* (which is carried
whole — Die Woche is an addition, not a replacement, as its own document states: *"three tables, two
enum values, one precondition"*).

**The reasoning chain:**

1. Both candidates found the same shape of problem in the current champion — *the wiki is a reading
   surface for six days out of seven, and minute one is lost* — and both answered it honestly, with
   real spike code, real self-critique, and a genuine attack pass. Neither is a document that asserts
   without demonstrating; that bar, missed for three straight rounds before this one, is now cleared
   by every artifact on the table.
2. **A's flex opens uncontested market territory that compounds every week the product is alive**,
   not just at onboarding: the seventh day is a structural axis no wiki rival has and no VTT rival can
   render (product-A.md §2's table is not rhetorical — Foundry's journal has no atom below the page,
   Roll20 removed per-player reveal and delisted its mobile app, Fantasy Grounds built the exact
   surface and shipped it read-only). B's edge — minute-one conversion — is real and cheap
   (≈€0.0012/evaluation) but shares its lane with a live, well-funded incumbent (Alchemy already sells
   pre-made adventures), which makes it a depth/verifiability contest rather than new territory.
3. **A's fatal break has a resolution inside this lineage's own vocabulary, and this verdict adopts it
   as a ruling rather than leaving it as an open question.** Die Wiederkehr is not, on inspection, the
   anonymous-bearer-token or the full-account pattern this lineage already refused — it is a third
   thing, smaller than either, and features-A.md itself names the residue honestly: *"a password-free,
   emailless account... a real identity mechanism, which a future round must not let drift back into
   being described as absent."* **This verdict takes that sentence as binding and resolves the lever
   named in §2 explicitly: the account-free join is preserved for the single-evening, spectator, and
   evaluator path (the table Saturday night, the cold-open demo); a lightweight passkey/cookie
   credential (Die Wiederkehr) is required — and honestly named as an account, not "no account" — for
   any player who wants a Vollmacht to survive past the session it was issued in.** This is exactly the
   engineering judge's flip condition, deliberately triggered: the existing `user_id`/`AuthSession`
   substrate now handles cross-day identity the way it was designed to, the passkey subsystem is scoped
   as an *extension* of that substrate rather than a parallel one, and the "two runtime systems under
   one name" objection is answered by naming the system honestly instead of engineering around the
   refusal to name it.
4. **This does not fully close the engineering gap, and this verdict does not pretend it does.** The
   scale-to-zero always-reachable backend, the idempotent two-phase roll state machine, and the
   +8.7 % annual compute tax are real, priced, and now written into the champion as carried weaknesses
   (§15) rather than argued away. The 4 stands as a scored fact about this round's artifacts; it is not
   retroactively erased by a ruling that only fixes one of its two causes.
5. **B's ideas are real capital and are grafted wholesale (§4).** In particular Nachrechnen — because
   two independent judges asked for it without prompting, and because A's own Vollmacht mint has
   exactly the same "trust me" gap Nachrechnen was built to close.

**The conditions under which this ruling is wrong — read as the actual work order, not as hedging:**

- **If gate W1 (die Türquote) returns red** — fewer than half of issued Vollmachten fired before
  expiry across four instrumented weeks — **the thesis is refuted by its own gate zero**, and B's
  minute-one economics (which defer reachability past the point of sale rather than making it
  load-bearing on six more days) become the correct bet in hindsight. This is the single largest
  open question this verdict is exposed to.
- **If Die Wiederkehr's real build cost exceeds a bounded extension** — if the passkey/recovery-code/
  idempotent-roll-state work metastasizes past the scope features-A.md priced it at — the engineering
  judge's "two systems under one name" objection is vindicated in full and this ruling should reverse.
- **If Kaya rules that "no account, ever, for any player" is non-negotiable** rather than accepting the
  spectator/returning-player split this verdict just drew, Break 1 has no known fix inside this
  lineage's own refusals, and the seventh-day thesis is fatally holed as originally specified.
- **If round 5 demonstrates die Wissensprojektion live** — Sera's `+2` and Brannt's `+0` both genuinely
  computed from one clause, not one hardcoded and one absent — as convincingly as A's door privacy math
  is already demonstrated in spike-A2, the market judge's flip condition fires and B's minute-one
  delivery, now proven rather than asserted, would out-argue A's still-unproven weekly cadence.

---

## 4. Grafted from the loser

A losing candidate is lineage, not waste. Five ideas move from B into the champion:

1. **Nachrechnen** — the seed/AST/package-pin replay verifier with its green seal, disclosed on its own
   copy as *"durability, not anti-forgery."* Grafted onto every Beleg card **and** every Vollmacht mint
   card: a control that lets a skeptical reader re-run the derivation herself, closing the exact gap
   both the product and market judges flagged unprompted (§2).
2. **Die Fokuswache** — the scoped, focus-guarded mint hotkey. Nemesis's reproducible break (a global
   `Ctrl+Enter` firing from inside a search box) applies verbatim to A's own mint gesture; the fix
   (check `document.activeElement`, fall through when focus is in any input) is grafted as a
   product-wide rule for every keyboard mint trigger, not just B's.
3. **Geschlossene Tüte, the pattern** — a closed, enumerated package schema with a validator that
   rejects unknown keys and is tested against ten hostile fixtures. A's own new package type (die
   Ausgabe, §9.3 of product-A.md) carries exactly the same widened-attack-surface risk B's `.anlass`
   format does, and inherits the same discipline rather than inventing a lighter one.
4. **Die Testtafel** — a live per-actor clause preview in the rule-builder, showing a clause evaluated
   side by side for two or more named test characters as the author types. Grafted onto der
   Vollmachtszettel/der Klauselzettel: it is the cheapest way to make `erfahrungsgrad`'s asymmetry
   visible to a system author during authoring, which is also the cheapest answer to B's own Break 2.
5. **Die Freistelle-style disclosure grammar** — B's answer to a shipped cast not matching the real
   table (*"+0 · nichts mitgebracht,"* in the same chip grammar as *Hörensagen*) is grafted as the
   pattern for Die Woche's own analogous gap: a Vollmacht issued to a character whose player has left
   the table, or a Woche's set-difference containing a departed player, renders honestly in the same
   chip grammar rather than silently vanishing.

**Not grafted, deliberately:** die Übernahme / der Anlass-Packer's whole played-evening pipeline (A's
own thesis is about the *live* week, not a shipped, pre-played one — grafting it would be forging two
candidates into a third, which this lineage's own round-2 verdict already named as the wrong move); die
Gabelung (cross-table divergence comparison) and der Anlass als Rezension (fire-count ranking) — real
and cheap, but downstream of a Packer this round did not adopt, logged for a future round if the Packer
itself is ever built; die Maskierung / consent-pseudonymisation machinery — B's own genuinely hard,
unsolved problem, and grafting its partial answer into a candidate that does not share the underlying
risk (A ships no third-party's played evening) would be importing a mitigation with no matching threat.

---

## 5. Still unresolved — the work order for round 5

- **Zero market evidence that a GM will open a door.** Charged to gate W1, unmoved by this round.
- **The GM's authoring cost moved, it did not vanish** (§8.2 of product-A.md). Three Vollmachten at
  23:41 can consume the champion's entire Prägerate typing budget by itself. No mitigation in this
  round is a cure; `freigabe: offen` is GM debt in a different hat and is correctly held out of slice 1.
- **Availability stops being optional, and the identity fix makes it worse, not better.** A scale-to-
  zero, always-reachable backend behind a passkey subsystem is a materially larger ops/security surface
  than the session-scoped app the champion was until this round, and Fantasy Grounds gives away, free,
  the exact thing this now costs.
- **Der Umbruch is a rule with a gate, not a type.** `NurLeitung<T>` makes a denominator
  unrepresentable; nothing here makes a feed unrepresentable, and the pressure toward "just show me
  what happened this week" is named as the likeliest place this product's central anti-log invariant
  gets traded away.
- **`Sicht` is unbuilt and unmeasured for a fourth consecutive round**, and this round adds three more
  projected surfaces (`tuer_zustand`, `umbruch`, `briefwechsel`) on top of it without running S-P1.
- **Fandom-grade search at scale is unproven for a fifth round and is made worse by this round's own
  content**, in both candidates independently — more short passages, more per-reader joins, and no
  round has yet exercised `retrieve()` against the 5,000-entity fixture.
- **The revocation race** (a Vollmacht revoked at 22:41:07 while a roll resolves at 22:41:08) is named
  by its own author and handed to Athena; it has not actually been attacked yet.
- **The tactical half — ~120 days, unspiked in every dimension — is completely untouched for the fourth
  straight round.** Both candidates independently chose to defer the canvas rather than spike it. This
  is not a coincidence and it is the single largest number in the lineage that no round has yet
  checked against running code.
- **The art pipeline remains unpriced**, and illustration commissioning is still `[needs a quote]`.
- **Right-to-erasure vs. a durable, citable `Wurf`** is unresolved and now collides with a second
  person's writing (der Brief).
- **K5 (whether the canvas may slip a slice)** still needs Kaya's ruling; this round's champion answer
  (der Tisch ohne Leinwand, sequenced not refused) is Apollon's provisional read, not a settled one.
- **The 02:00 long-form world-builder** remains the least-served user in the product, for a fourth
  round running.

---

## 6. What actually improved this round — honestly

**Real improvement, and it should be named plainly rather than buried under the razor-thin score:**
verification rigor jumped across the whole lineage. Round 3's verdict complaint was *"nothing was
built"* — four HTML pages with zero server, renderer or projector code. This round's four spikes
instead carry **live, executable self-checks**: spike-A2 measures contrast ratios against computed
styles across sixteen skin×theme×contrast combinations and runs a serialise-and-compare Zwillingsbeweis
in-page; spike-B1/B2 re-execute the actual dice-evaluation function to produce Nachrechnen rather than
faking a green checkmark, and B2's Strukturabdruck hashes and re-verifies a canon's role/tag/depth tree
on every toggle. Both attack passes found real, reproducible breaks in running code (a hotkey that
mis-fires, an overflow guard present in one sibling file and missing in another, a projection function
that never evaluates its second branch) rather than only in prose. **That is genuine progress in the
one dimension this lineage has repeatedly failed on.**

**The honest counterweight, and it must be said plainly because the exciting reading would be wrong:**
this round did not move the product forward as much as the narrow 2–1 / 19–18.5 split suggests, and it
did not touch the lineage's largest, oldest, and most expensive open question at all. Both candidates,
independently, chose to defer the canvas rather than spike it — which means the ~120/123-day tactical
half that has been priced-but-never-built since round 3 is **still** priced-but-never-built, for a
fourth round, and neither candidate's engineering score is actually about that number; both scores are
about the *new* thing each candidate bolted on (A's identity subsystem, B's content pipeline). **A
round whose only motion is on the newest fifth of the product, while the largest and oldest four-fifths
sits exactly where it was, is a round that reshuffled more than it advanced — and the razor-thin margin
(19 to 18.5, down from 20:17 and 20:18) is the honest instrument reading that back.** If round 5
produces another close, well-verified extension of Die Woche without ever running S-T1, that is the
signal to stop extending and spend a round paying down the oldest debt instead — which is exactly the
fork this verdict proposes below.
