# Cross-review — GUI Architect 1 (seat: THE FLEX) on `spike-A2.html`

Reviewer: author of [`spike-A1.html`](spike-A1.html). Sibling read in full markup, plus the
signature, guard, plate and test sections of its script. 2026-07-27.

The two artifacts do not collide: A1 is the emotional argument (one screen, peak craft, the red
refusal inside a typeset page), A2 is the rational one (the axis matrix made falsifiable). Nothing
below is a scope complaint.

## What it nails

1. **It goes at the acceptance matrix of `03-triumph-ui-direction.md` head-on** — three genres ×
   four skins × contrast × motion × label length × artwork, three roles — and it *measures* the
   invariant instead of asserting it. My seat does none of this. Items 1, 2, 3, 8, 9 and 10 of that
   matrix now have an artifact that can go **red**, which is the first time in this project that a
   spike has been able to fail.
2. **The structural signature is a real mechanism, not decoration.** `sigLines()` walks the element
   tree emitting `depth/tag:role#aria-attr-names`, hashes with FNV-1a, and diffs against a baseline
   for the same role and document version. The claim in the notes matches the code exactly — I
   checked, because the round-1 verdict says an artifact that asserts a mechanism either implements
   it or says so on the surface. This one implements it.
3. **Role projection framed as omission with a number.** "Weglassen, nicht Verstecken" plus a node
   delta against the SL baseline is the right way to photograph a security property: a reviewer can
   count. It is also the only honest counter to "you just used `display:none`".
4. **It independently derived the same symmetric merge guard.** A2 computes
   `holder(oben) △ holder(unten)` and argues it from §3.2 (a merged block resolves from both parent
   pids, so its audience is the union). A1 arrived at the identical rule from the other end. Two
   independent derivations agreeing is the strongest evidence the round has that the guard is a
   consequence of the data model and not a slogan.
5. **The honesty section is the best in either seat.** It names what the signature is *not* (not the
   accessibility tree, not computed names, not visibility), names the two `data-sig-ignore`
   subtrees, and — the part I would have got wrong — *excludes* light/dark from the matrix with a
   reason rather than padding 288 to 576.

## What it fakes, or over-reads

1. **The Prüfstand is the first thing on the page, and it is a lab bench.** Nothing above the shell
   would ever appear in a product. That is the seat's job, but the round must not read A2's screen
   as evidence about desire or craft; it is evidence about *contract*. If Kaya is shown exactly one
   image, it should not be this one.
2. **The baseline is captured lazily, keyed `role@docVersion`.** Whichever combination renders first
   for a role becomes the truth for that role. The sweep therefore proves *self-consistency across
   the matrix*, which is what the text says — but the green badge reads to a skimmer as "the DOM is
   correct". A defect present in all 288 combinations is invisible to it, and there is no golden
   signature checked into the repo. That gap is one line of copy away from being honest and one
   fixture file away from being closed.
3. **The artwork axis cannot move the signature by construction.** `#plateFallback` is toggled with
   the `hidden` attribute, so the node is in the tree in every state. As a *layout* axis it earns
   its place; as a *structural* axis it multiplies the combination count by three without being able
   to fail. The 288 is honest arithmetic over a slightly padded axis list, and the note about
   light/dark shows the author already knows this argument.
4. **The plate loads a real PNG by relative path** (`../../spikes/assets/harbor-night/harbor-map.png`
   — it exists, I checked). Legitimate per the brief, and the fallback is designed rather than
   broken. But the artifact is only self-contained *in place*: opened from a copy, "Artwork fehlt"
   becomes the default state, and that is the version somebody will screenshot.
5. **Neither of us discharges §8.1, and two artifacts must not be read as coverage.** A2 says so
   plainly (per-block `contenteditable`, no ProseMirror, no IME, no screen reader in editing mode) —
   and so does A1, in the same words, because it is the same shortcut. The editor's real risk is
   still exactly where the candidate's own §0.4 put it, and round 2 has now produced two prototypes
   that route around it identically.

## What it would cost to build for real

- **The signature harness is the cheapest new gate anyone proposed in round 2, and I would adopt it
  whichever candidate wins.** ~80 lines of walker plus a hash; it belongs in CI as a Playwright
  fixture, never in the product bundle. Estimate: **2–3 days** to port (render the axis matrix per
  role, diff against a committed golden signature per role), plus **~1 day** to write down the
  ignore-list *policy* — which subtrees may legitimately differ, and who may add one. Without that
  policy the ignore attribute becomes the escape hatch that makes the gate always green.
- **The in-browser 288-sweep is a demo, not a CI job.** 288 × 3 roles of full render will dominate a
  pipeline; CI needs a sampling strategy (all skins × all roles, then a rotating slice of the rest)
  or a headless render budget. Worth saying out loud before it is promised.
- **Everything else in A2 — worlds, skins, infobox, plate, rails — is the shell cost already priced
  in `03`.** It re-proves that price at a new level of rigour; it does not add to it.

## One-line verdict

If one screenshot goes to Kaya, it is A1's red refusal in a typeset page. If one artifact survives
into the repo as a permanent gate, it is A2's structural signature — and the round should say both
sentences, not pick.
