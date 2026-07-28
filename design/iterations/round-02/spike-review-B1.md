# Cross-Review — GUI Architect 1 (Seat: THE FLEX) reviewing `spike-B2.html`

Reviewer: Seat B1 (`spike-B1.html`, „Es gibt keine Datei. Es gibt eine Karte.")
Reviewed: `spike-B2.html` — „Universalitätsprüfung", 97 KB, 1.979 Zeilen, keine externen Ressourcen.
Method: read the source, then executed it in jsdom and drove the axis console, the reader axis,
`Erfassen`, `Berichtigen` and the Beweis tab. No console errors in any path I exercised.

---

## What it nails

**1. The three worlds are actually three worlds.** This is the single hardest item in the Triumph
acceptance matrix (#1/#2) and B2 pays for it in full. Aldenfall's *„Die Vharon kamen als
Salzhändler aus dem Süden und kauften sich mit dem Salzzoll in den Rat ein"* becomes Kepler-9's
*„Die Achene kamen als Kühlfrachtfahrer aus dem inneren System und kauften sich mit der
Frachtabgabe …"* and Nebelakte's *„Die Warnholts begannen als Speditionsmakler am Freihafen …"* —
three parallel, coherently authored corpora with identical card topology, not a label swap and
not a find-and-replace on nouns. That is real work and it is the right work for that seat.

**2. The Struktursignatur is a falsifiable instrument, not a claim.** A hash over
`tagName + Bauteilrolle` in the stage region, deliberately excluding text, colour and classes,
recomputed on every axis change, with the last-changed axis printed beside it. It converts
„one unchanged shell across content and skin" from an assertion into something a reviewer can
watch stay constant — and, correctly, it *does* change on the role axis, which is exactly the
claim that the role acts structurally rather than cosmetically. I did not build anything this
honest in B1 and I should have.

**3. The section cascade is proven by descent, not by prose.** Driving the reader axis:
SL 10 cards / 6 headings → Sera 6 / 5 → Ossa 4 / 4 → Publikum 2 / 2. The headings disappear with
their contents. That is §6.6.2 made observable, and it is the leak class the thesis creates for
itself.

**4. The refusal panel is the best writing in either spike.** „Was dieser Spike nicht beweist"
names the missing access control, the Schnitt (§8.1), the Anordnen labour (§8.3), the
13-cards-is-not-60.000 problem — and closes with *„Der Spike baut Markup mit innerHTML. Das
Produkt verbietet das (§10.4)."* Admitting that the artifact violates the invariant it advocates
is the rarest thing in a design round.

**5. The contrast probe measures resolved token values live and is allowed to go red**, with the
caveat printed next to the number: it measures the token pair, not the painted pixel, and the
K1 CI probe must measure the pixel. Correct, and it is the caveat most spikes omit.

## What it fakes, or lets the reader over-read

**1. The Struktursignatur cannot really go red on the axes it is advertised against.** The stage
markup is produced by one generator that takes skin and world only as data; nothing in the code
path *could* branch on them. So the signature is a regression guard for a refactor that has not
happened yet, presented in the register of a proof. It is a good instrument mislabelled — it
proves the renderer as written does not branch, not that the architecture forbids branching.

**2. The corpus is 13 cards and the product's claim is Fandom-grade.** B2 says this itself, so
this is not a caught lie — but the consequence is under-stated: three worlds × 13 cards means
the universality claim is tested at a scale where *every* design survives. Nothing here bends
under 41 cards, let alone 41 in one arrangement, which is what my seat rendered and where the
Lesefassung starts to feel like composition labour (§8.3). The axis matrix is proven; the load is
not, and the two get read as one.

**3. `Anordnen` is a disabled button with an `sr-only` reason.** Structurally honest, rhetorically
convenient: the disabled control sits in the same shelf as three working verbs, so the surface
reads „four verbs, one not yet wired" when the truth is „the second unmeasured behavioural bet of
the whole candidate is absent." Nemesis will pull exactly that thread. A visible, non-screen-reader
caption on the shelf would cost nothing and remove the read.

**4. `Erfassen` produces a card but skips the moment that matters.** Typing a sentence and getting
a stamped card in two DOM nodes is right; but the four-second claim is about the *paste* (§1.1c),
and pasting three paragraphs out of Google Docs is not exercised at all. The verb that is
demonstrated is the cheap one.

**5. The Berichtigen dialog and my B1 flex overlap more than the seats should.** B2's dialog states
the same Nachhall („4 Anordnungen · 2 Karten · 1 Klausel · 3 Figuren · 2 Ausgaben") and runs the
same abort window. That is not a fault of the artifact — it is the candidate's only real gesture —
but the round should know that the two spikes do not independently corroborate that number; they
were both written from §2 of `product-B.md`.

## What it would cost to build for real

| Element | Real cost | Note |
|---|---|---|
| Seed → ladder → end-token architecture across four skins × light/dark × contrast factor | **~4–6 days** for two production skins, not four | B2 proves the *shape* is right. The cost is not the CSS, it is the CI contrast probe against painted pixels (K1) plus the 9-slice art per skin, which is a commissioning line item with no quote in the intake. |
| Struktursignatur as a CI gate | **~0.5 day** | Cheapest item in either spike and the highest leverage. It should be lifted into the gate suite verbatim the day a component set exists: render the stage under N axis combinations, assert one signature per role. |
| Three-world content fixtures | **~1 day per world, forever** | The hidden recurring cost: every new component needs three worlds of fixture, or the universality gate silently stops testing. Somebody must own this. |
| The live contrast probe against real pixels | **~2–3 days, and it needs a headless browser in CI** | B2's token-pair version is ~40 lines. The pixel version needs rasterisation, which is the difference between a lint and a build dependency. Price it as a build dependency. |
| Reader-projected rendering on the server | **not costed by either spike** | Both of us project in the browser and both say so. The real number is `visible_karten()` + the projection cache + the Leak Bench, and it is the largest unpriced item in candidate B after the Schnitt. |

## One thing I would change before Pythia reads it

Put the „Was dieser Spike nicht beweist" panel where a reviewer sees it **without opening the
Beweis tab.** It currently sits three clicks deep behind the strongest-looking screen in the round.
That inverts the intended reading: the polish is free and the honesty is gated. Swap the cost of
those two clicks.

---

*Reviewed against `product-B.md` §1.1, §2, §6.6, §8.1, §8.3, §8.6, §10, §13 and
`03-triumph-ui-direction.md`'s acceptance matrix. Both artifacts share the fault that neither
proves access control; neither hides it.*
