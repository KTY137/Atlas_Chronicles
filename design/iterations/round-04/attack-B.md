# Attack — Candidate B, "Die erste Minute," Round 4

**Attacker:** Nemesis, die Widersacherin.
**Verdict in one line:** Not broken on any hard invariant. Broken on execution in four
concrete, reproducible places — one of them is the artifact's own flagship keyboard
gesture misfiring in the artifact's own code, and one of them is the single most-quoted
selling moment in the document being absent from both spikes. Two structural gaps
(cast-size mismatch, a CSS robustness regression) round it out. Nothing here is fatal by
the corpus's own definition (no hard-invariant violation), but the strategy section's
central, uncopyable claim is unproven where it was cheapest to prove it.

---

## Break 1 — The mint hotkey has no focus guard, and it is reproducible in the artifact as shipped

**Severity: Major.**

`spike-B1.html`, line 2510–2512:

```js
document.addEventListener("keydown", (e) => {
  if ((e.ctrlKey || e.metaKey) && e.key === "Enter") { e.preventDefault(); praegen(); }
});
```

This listener is bound at `document` level with no check of `document.activeElement` and
no `e.target` filtering. `praegen()`'s only guard is `if (mintBtn.disabled || !letzterWurf) return;`
— i.e. it fires whenever a roll is pending, regardless of what has focus.

**Reproducible scenario, exactly as shipped:** Sera's player rolls (`rollBtn` → `letzterWurf`
is set, `mintBtn` enabled). Before the GM presses "Absatz prägen," she clicks into the
`#q` search box to find something else on the page (a completely ordinary GM action —
the search box is one tab-stop away from the roll button in the same header). She types,
then presses **Ctrl+Enter** out of habit (a near-universal "submit" chord in browsers,
chat apps and rich-text editors) to confirm her search or move on. The global listener
fires `praegen()` regardless — a passage is minted, `herkunft_anlass_id = NULL` is written,
the Saatbilanz changes, and a `Wurf` the document elsewhere describes as append-only and
permanently citable now exists, triggered by a keystroke aimed at a text field.

**Why this is not a nitpick.** The champion's own roadmap and this candidate's §9.3 "cut
order" both point at ProseMirror-class rich text editing arriving for GM-typed passages
(the "getippt" atoms that make up most of Marek's own content). Ctrl+Enter is *exactly*
the chord that rich-text and chat surfaces conventionally bind to "submit." The candidate
is building toward a product where the GM will be composing free text (§9.2 step 6: "Kaya
improvises Ossa's fate") in the same session where a roll may be sitting unminted. A
global, focus-blind hotkey for an irreversible-feeling, permanently-citable action, in a
product whose other major surface will want the identical chord for something else, is
the kind of thing the attack brief's "tired GM, cat on the keyboard" scenario describes
literally — and it is not hypothetical here, it is present in the current build.

**Fix is cheap** (scope the listener to skip when `document.activeElement` is a form
field, or scope it to the shelf/session surface only) but it is not done, and the artifact
that exists today reproduces the failure on the first try.

---

## Break 2 — The flagship fusion mechanic is never computed, faked, or even attempted in either artifact

**Severity: Major, and it lands on the document's own central claim.**

The single most-repeated, most-quoted claim in this candidate — stated as the one thing
"no rival can copy" — is the pairing at §4.1, 20:31–20:34: Sera gets **+2** from a clause
because she "holds" 4 passages about Haus Vharon; Brannt hears the same fact from Sera and
his own check on the same topic prints **+0 · Hörensagen zählt nicht**, "from the same
clause that gave Sera +2." This is quoted again in the acceptance demo (§9.4) and named as
the load-bearing edge in §4 ("`Ein Anlass liefert Revelations, nicht nur Passagen`" — "which
character knew what, from which source, with which `erfahrungsgrad`").

I read the actual engine that computes this in `spike-B1.html`:

```js
function haeltEtikett(actor, etikett) {
  return document.querySelectorAll(
    '.atom[data-etikett~="' + etikett + '"][data-haelt~="' + actor + '"]'
  ).length;
}
```

`data-haelt` is a **flat, static, per-passage HTML attribute** — a hand-authored guest
list baked into the markup (`data-haelt="sera brannt vesper"` on some atoms, `data-haelt="sera"`
on others). It has no `erfahrungsgrad` dimension per character. There is no data structure
anywhere in either spike that says "Sera holds this passage `erlebt`, Brannt holds it
`gehoert`" — `data-grad` is an attribute of the **passage**, not of a **(character, passage)
relationship**, so the same passage cannot simultaneously be "erlebt" for one reader and
"gehoert" for another in this model. The clause node in the AST (`{ t: "clause", id:
"k_vharon_kenntnis", actor: "sera" }`) is only ever evaluated for Sera, with `gehalten:4`
either hand-set in the fixture (`w_003.eingefroren.k_vharon_kenntnis: 4`) or DOM-counted
for her specifically. **Brannt's version of this same check — the one the document quotes
three times as the unbeatable moment — is not built, not faked with a hardcoded number, and
not attempted anywhere in 4,700+ combined lines of markup and script.** `spike-B2.html`
comes closer to a real per-character projection engine (three roles, a genuine DOM-exclusion
`sichtbar()` gate) but its role axis is `gm | pl | ob`, not per-character `erfahrungsgrad`,
and its own `wurf` fixture is likewise a single static AST evaluated once, never twice for
two different holders of the same fact.

**Why this matters more than an ordinary missing feature.** Every other headline mechanic
in this candidate got an artifact: the provenance chips, the Saatbilanz, the Beleg card, the
seed replay, the seal, the "Der Streifen" gate, the four-channel encoding, the role/skin/
width matrix. The one mechanic that both drives the flex's punchline dialogue *and* is
named as the structural reason "no rival can copy this" is the one mechanic that got no
artifact at all — not even a cheat. That is a specific, checkable gap, not a vague
"everything is unspiked" complaint (which the document already owns candidly in §10.7–10.8).
It means round 4 still cannot show, even in a mockup, that "Erfahren schlägt Gehört" survives
contact with two different characters reading the same fact — which is the exact thing §10.8
already flags as a house rule with no reference implementation. The spike had every
opportunity to at least fake the Brannt side with a second hardcoded number the way the
Sera side is faked, and did not.

---

## Break 3 — A table with the "wrong" number of humans breaks the fusion silently, and the document's own worked example is sized to dodge exactly the scenario the attack brief specifies

**Severity: Major.**

Every shipped Anlass in this candidate's own data ships a **fixed cast size**: "3 Bücher"
(Sera 34, Brannt 21, Vesper 9 — repeated identically for the Aldenfall, Kepler-9 and
Nebelakte fixtures in `spike-B2.html`: three `besetzung` entries each, no more, no fewer).
The worked evening in §4.1 seats exactly Kaya (GM) + three friends, one per pregenerated
book — a perfect 1:1 match between humans and shipped characters.

The attack brief's own canonical table is **five real humans, one tired GM** — i.e. GM plus
**four** players. Run that table against this candidate: three players take Sera, Brannt
and Vesper and immediately enjoy the shipped `haelt_etikett` bonuses (+2 on Vharon checks
from minute one). The **fourth** player has no shipped book to inherit — there is no
provision anywhere in `product-B.md` for a cast-size mismatch (I searched explicitly; the
word "Übernahme" appears eight times and never once addresses a player count that exceeds
or falls short of the shipped roster). That fourth player either:

- rolls a brand-new character with `gehalten = 0` for every etikett, permanently failing
  every `mindestens` threshold the shipped Regelkarten define, so she never sees a bonus
  the other three take for granted — the opposite of "labelled inheritance," it is *silent*
  exclusion, because nothing on her sheet or in the UI explains *why* her Menschenkenntnis
  checks never get the +2 her tablemates get from the same house rule; or
- the GM has to manually reveal N passages to her mid-session to catch her up — which is
  exactly the kind of extra "GM chrome" work the champion's own gate zero (Prägerate:
  "≤4 min GM chrome typing... ≤2 regretted omissions") was built to minimize, now
  reintroduced at the table specifically *because* the product shipped pre-authored content
  sized to someone else's four-person table.

Symmetrically, a table with **two** players has an orphaned Vesper-book nobody claims, and
"3 Bücher · 9 Passagen" sits in the Anlass panel as an advertised asset nobody at this table
will ever open — which, per the document's own honesty architecture (the whole point of the
Saatbilanz and the provenance layer is to never let a number lie about what happened), is an
awkward thing for the product to keep displaying unclaimed.

This is not an edge case invented to pad the list — it is the *default* case for any real
group whose size doesn't happen to equal the size of somebody else's table four sessions
earlier, and the corpus's own attack brief names a five-person table as the standing test.

---

## Break 4 — B1's infobox has no overflow-wrap; B2, its own sibling artifact, proves the fix was known and cheap

**Severity: Minor–Major (cosmetic collapse in the flagship view, not a data-loss bug).**

`spike-B1.html`'s infobox — the exact component on screen in the candidate's own flex
screenshot ("a crest infobox with ten rows... one red link inside the infobox") — sets:

```css
.infobox dl { display: grid; grid-template-columns: 5.5rem minmax(0, 1fr); }
.infobox dt, .infobox dd { padding: 0.32rem var(--sp-3); font-size: var(--fs-small); ... }
```

with no `overflow-wrap` / `word-break` anywhere on `dt`/`dd`. Grid items default to
`min-width: auto`, which resolves to the min-content size of an unbreakable token — so a
single long unbroken word in a `dd` value will force the track wider than the infobox's
fixed `width: 15.5rem`, escaping the floated box into the article text beside it. The
article body paragraphs are protected (`.article p { hyphens: auto; }`), but the infobox
values are not `<p>` elements and inherit nothing.

Run the attack brief's own stress case: a German compound noun in an infobox value — not
exotic for this candidate's own genre (its content already includes "Kanzleischreiberin,"
"Siegelrecht," "Wachsschicht" as building blocks; a title like
"Grenzstreitschlichtungsvollmacht" or a real place-name compound is entirely plausible
content for exactly this kind of infobox row). It will overflow in B1 today, unstyled.

**Why I'm confident this is a real gap and not a stretch:** `spike-B2.html`, testing the
identical component under its own axis matrix, explicitly guards against this —
`.infobox dt,.infobox dd{ ... min-width:0; overflow-wrap:anywhere }` — and B2 even ships a
dedicated long-string stress locale (`sprache:"lang"`, Finnish labels chosen specifically
"as the hard test for every control," per its own footer). B2 demonstrates the author knew
this failure mode and defended against it in one artifact; B1, the artifact actually used
for the flex demo screenshot, does not carry the same guard. It is a one-line CSS fix, but
it is missing from the exact component the product's own marketing moment depends on.

---

## What I could not break — conceded by name

**„Nachrechnen" does what it says and nothing more.** I read `nachrechnen()`,
`siegelSetzen()` and the `auswerten()`/AST replay path end to end looking for an
overclaim — a place where the UI implies proof of human presence, or silently drops the
seed-grinding caveat. I did not find one. The product's own copy in the `claim` `<details>`
block states the limit in exactly the words §3.2 promises ("Es prüft nicht: dass ein
Mensch dabei war... 5 % aller Seeds geben auf 1d20 eine 13"), and the three honest outcomes
(`ok` / `unberuehrt` / `bad`) are all wired to real comparisons against the frozen imprint,
not to a canned animation. This is the most carefully built part of either spike and it
holds.

**The role-visibility gate in `spike-B2.html` is a real DOM exclusion, not a CSS hide.**
`sichtbar(atom)` gates whether an atom is *appended to the DOM at all*
(`ab.atome.forEach(a => { if(sichtbar(a)) host.appendChild(atomKnoten(a)); })`), and the
artifact's own footer explicitly and correctly disclaims that this is not a security proof
("In der Produktion muss der Server die unberechtigten Datensätze aus der Antwort
entfernen"). I looked for a way to make this claim overreach — to find the artifact
implying more than it delivers — and it doesn't; the self-disclosure is accurate to what
the code does.

**The "`am Tisch` cannot be forged" claim (§3.1) is architecturally sound as stated.**
Deriving `Herkunftsklasse` from a single non-null-constrained, single-writer-set foreign
key, rather than storing it as an independently settable field, is the right shape for the
guarantee it claims, and I could not find a code path — in the document's own description
or by analogy in the spikes — by which an importer could set it. This is a real answer to
Nemesis M3's shape, not a rhetorical one.

**The acceptance demo (§9.4) already gates the leak surface I went looking for.** My first
instinct was that "an Anlass is a download... one cache entry per version globally" (§7.3)
implies a single static blob that must contain sealed/GM-only content for every fetcher,
which would make role-gating client-side-only for a live player — a hard-invariant-1
violation. But §9.4's own acceptance demo already specifies "open the second browser as
Brannt and show his response body contains no bytes of the two sealed lines and no wall
geometry of the unheld corridor," and B3's boundary table distinguishes the registry copy
("a source, never the live artefact") from the campaign's own installed, server-mediated
copy. The strongest reading is that CDN/static economics apply to the GM's one-time install
fetch, not to per-player live delivery, which continues through the champion's existing
permission spine. I do not have a reproducible scenario that survives this reading, so I am
not reporting it as a break — the candidate named and gated the exact risk I was reaching
for before I got there.

**The consent/right-to-erasure weakness (§10.3) is already owned, named, and I could not
sharpen it further.** The document itself calls this "the genuinely hard one... not solved
here" and states plainly that `Freigabe.widerruf_at` cannot reach a copy already on a
stranger's disk. I tried to find a way this was understated — e.g. whether Workshop-as-mirror
(RB-11) makes the un-recallable-copy problem worse in a way not yet said — and did not find a
sharper version than the one already on the page. Conceded as-is.

**Template vs. instance, defeat_pending, and the other seven hard invariants:** I did not
find a violation of invariants 2–10 attributable specifically to this candidate's delta over
the champion (as opposed to already-carried, already-flagged champion risk). The one
invariant-adjacent finding I pursued at length (Break 2, above) is a strategy/fidelity gap,
not a permissions or data-integrity violation.

---

## Front-by-front summary

1. **The table at 21:00.** Break 1 (hotkey) and Break 3 (cast-size mismatch) are both
   concrete failures at a real table, not in the lab. Neither is fatal; both are the kind
   of thing that makes a GM apologise.
2. **The invariants.** Clean. No hard-invariant violation found; three separate attempts
   (permission-spine-via-CDN, consent, template/instance) resolved in the candidate's favor
   or were already conceded by the document itself.
3. **The strategy.** Break 2 is the real hit here: the flex's most quotable line is
   unproven precisely where proving it would have been cheapest (a second hardcoded number
   in a spike that already hardcodes the first one). The cast-size problem (Break 3) also
   cuts here — "the world arrives already lived-in" quietly assumes the customer's table is
   shaped like the seller's.
4. **The artifacts.** Breaks 1 and 4 are both reproducible, in-code findings, not
   inferences from prose. The 2,000-entry search-at-scale risk the document already names
   in §8.2/§10.8 is independently confirmed by reading the actual search handler in B1
   (naive substring scan, no debounce, no virtualization, run on every keystroke over a
   live DOM query) — I'm not counting this as a new break since the candidate already owns
   it as a red gate, but the code inspection shows the concern is not overstated.

**Bottom line:** this candidate is not broken on the ground it chose to defend (honesty,
provenance, non-forgeability, seed-replay integrity) — that ground holds under direct
inspection of the code, not just the prose. It is broken on the ground it didn't spend
attention on: a global hotkey with no focus guard, a cast size that assumes the customer's
table matches the seller's, a CSS regression its own sibling artifact avoided, and — the
one that should worry the crew most — the single mechanic named three times as
structurally uncopyable is the one mechanic nobody, including this round's own spikes,
has yet made real.
