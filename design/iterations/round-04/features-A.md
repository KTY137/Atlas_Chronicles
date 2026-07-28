# Feature Response — Candidate A, „Die Woche", Round 4

**Author:** Apollon, in the seat of Feature Architect, answering Nemesis's attack (`attack-A.md`)
against `product-A.md`. Every FATAL and MAJOR break gets a concrete mechanism below — server
behaviour, client surface, cost — not a promise. Three new capabilities extend the fusion beyond
what the breaks demanded. One thing is killed to pay for what got added. Mēden agan: nothing here
exists only to satisfy the adversary; each entry is justified on its own even if you delete the
break it happens to answer.

---

## Answers to Break 1 (FATAL) — the second hand has nothing to hold

### 1. Die Wiederkehr — a device credential that is not an account and not a bearer token

**Answers:** Break 1 (fatal) — the account-free returning-player gap.

**What it is, concretely.** At join (`product-A.md` §7.1 step 2, unchanged: link + display name,
die Namenswache), the client silently performs a WebAuthn **resident-key (passkey) registration**
against the `user_id` created for that join — no screen, no typing beyond the name she already
typed, no email, no password. `Users.email` and `Users.password_hash` stay nullable exactly as the
domain model already allows (`02-domain-model.md` never marks them `NOT NULL`); `platform_role`
gets one new value, `gast`. A new table, `Credentials(id, user_id, kind ∈ passkey|session_cookie,
device_label, created_at, last_used_at, revoked_at)`, holds one row per device. On every later
visit the browser's platform authenticator (or, on a device with no authenticator, an `HttpOnly`,
`Secure`, `SameSite=Strict` session cookie set at registration time) answers a server challenge —
the private key never leaves the device's secure hardware, and the cookie never leaves the
browser's storage partition to appear in a URL, a screenshot, a browser-history entry, or a
paste into Discord. **That is the load-bearing difference from the bearer token this lineage
already refused**: a bearer token *is* the access grant and is copyable; a passkey or an
`HttpOnly` cookie *proves possession of a device* and is not.

**Recovery, when the device itself is lost — the actual Tuesday scenario.** The GM already has
the gesture CHAMPION §6.8 grants her: click a name in the roster. It gains one gesture next to
it, **„Zugang erneuern"**, which mints a `Kopplungscode` — single-use, 10-minute expiry,
scoped to exactly one `user_id`, revocable, logged to `AuditEntry` — the identical shape as a
Vollmacht (capped, expiring, one-shot, GM-issued), just authorising a *person* instead of a
*passage*. The GM reads the six-character code to the player over whatever out-of-band channel
she already uses to send the join link (voice, SMS, Discord) — the same trust boundary the
product already relies on for onboarding. The player enters it on the new device, a fresh
passkey (or cookie) registers against her **existing** `user_id` — not a new identity, not a new
character, not a re-invite. Her Vollmachten, her Kodex, her provenance chips are exactly where
she left them.

**Why sensible now.** It is the one gap Nemesis found that has no cheap non-answer: leaving it
unaddressed makes W1 unfalsifiable (§ below), and every alternative this lineage floated on its
own (capability URL, real account) was already refused by name. This is neither — it costs one
device ceremony instead of one password, and it reuses a pattern (scoped/capped/expiring/
GM-minted) the product already has to build for Vollmacht, so the marginal cost is the credential
table and the WebAuthn call, not a whole new subsystem.

**Cost:** medium — WebAuthn client+server integration, `Credentials` table, `Kopplungscode` object
+ expiry job (near-identical to the Vollmacht expiry job already scheduled), the cookie fallback
for authenticator-less browsers, one new roster gesture.

**Invariants:** invariant 1 (server-authoritative permissions) is untouched — this is
*authentication*, not authorization; every permission check downstream is unchanged. It does not
reopen "no anonymous bearer token" (§10): possession of the URL alone grants nothing without the
matching device secret. It is honest about what it is (see §"Net effect" below) — this is a
password-free account, not the absence of one, and that should be said plainly rather than let
drift back into "no account" marketing.

### 2. Der Zugangsvorfall — the instrumentation that lets W1 tell the two failures apart

**Answers:** Break 1's second half — that W1 cannot distinguish "couldn't get back in" from
"didn't bother."

**What it is.** Every time a device presents an *expired or missing* credential against a
character with an open Vollmacht, the server logs a `Zugangsvorfall` (character_id, at,
resolved_via ∈ kopplungscode|abandoned) instead of silently 404-ing into a generic "join" screen.
The player sees a plain sentence — *„Dieses Gerät kennt dich noch nicht. Bitte deine Spielleitung
um einen Zugangscode."* — which is also the recovery entry point for feature 1. Gate **W1** is
amended with one line: **a Vollmacht that expired unfired while its holder had ≥1 open
`Zugangsvorfall` in that window is excluded from W1's numerator and denominator, tagged
`ausgeschlossen: zugangsvorfall`, and reported separately.** A red W1 can no longer quietly mean
"players got locked out"; it has to say so.

**Why sensible now.** It is the cheapest possible fix to the exact failure Nemesis named — one
enum tag on an event the server already has full information to log — and it makes gate zero
honest, which §7.5 already promises ("say so before marketing does") without yet having the
plumbing to keep that promise.

**Cost:** small — one log event, one gate-report filter, one user-facing sentence.

---

## Answers to Break 2 (MAJOR) — roll/mint atomicity under connection loss

### 3. Der ausstehende Wurf — the roll is durable state, not a message in flight

**Answers:** Break 2 (major) — the unspecified connection-loss seam between roll and mint.

**What it is.** `Wurf` gains an explicit `status ∈ ausstehend | bestaetigt | verworfen`. The
instant the server rolls (before any response reaches the client), the row is persisted as
`ausstehend`, and `praegung.beleg`'s confirm step becomes **idempotent**: `POST
/vollmacht/:id/bestaetigen { wurf_id }` short-circuits to the same body and the same `AuditEntry`
if called twice. Re-opening a door while an `ausstehend` Wurf already exists for that Vollmacht
returns **that same Wurf's card** — never a new roll — until it is either confirmed or a short
**confirmation window** (separate from the week-long `verfall`; ~30 minutes, sized to a real
mobile reconnect, not a session) elapses, at which point it flips to `verworfen` and the
Vollmacht returns to `offen`, spending nothing. Reload is therefore not a special "resume" code
path — it is what a normal page load already does, because the pending roll lives in the
database, not in `spike-A2.html`'s in-memory `S.wurf`.

**Why sensible now.** This is exactly the seam RB-11 and the brief both asked to be stressed
(reachability, mixed connectivity), and it is the one place where two contradictory
implementations were equally plausible readings of the same paragraph — a specification gap that
would otherwise get resolved by whichever engineer is tired on the day it's built. Making the Wurf
a durable state machine costs little and removes the ambiguity outright, and it is the literal
mechanism that keeps *„Nichts wird automatisch Kanon"* true under a network partition, which is
this candidate's founding sentence, not a nice-to-have.

**Cost:** small–medium — one state column, one idempotent endpoint, one CI fixture (roll, kill
the connection, reload, assert identical card; confirm twice, assert one Passage and one
`AuditEntry`).

**Invariants:** directly protects "Nichts wird automatisch Kanon" and invariant 4's sibling
concern (no silent auto-resolution) by construction: nothing is canon until the *second* keypress
lands, confirmed exactly once, however many times the network makes the client ask.

---

## Answers to Break 3 (MAJOR) — universal cost, conditional benefit, gates that can't tell why

### 4. Der Ankerkeim — a door a wiki-less GM can still issue

**Answers:** Break 3 (major), the authoring half — die Lücke has nothing to compute candidates
from for a GM with no existing wiki depth.

**What it is.** `Vollmacht.anker` gains a third option beyond `RoterLink(link_id)` and
`Passage(pid)`: **`Keim(titel)`** — a one-line `KnowledgeEntry` stub, title only, `canon_status =
keim`, created in the *same* keypress as the Vollmacht at Fällung time. It renders exactly like
any other red link to every reader; it is one enum value and one small creation form inside the
Forge/Fällung ritual (not the reader tree — ruling 3, no `contenteditable` in the article surface,
is untouched), so there is no second code path downstream: the `tuer_zustand` oracle, the
Zwillingsbeweis fixture, the export format, all see an `anker`, not a case split. A GM with zero
pre-existing wiki content can now author a door in roughly the time she already budgets for a
Lücke-assisted one — she types a title instead of picking from a list. **This does not remove her
per-door writing cost** (the sealed line and threshold are unchanged, and §8.2's tension stands);
it removes only the *precondition* that content already exists to anchor to, which is the specific
thing Break 3 named.

**Why sensible now.** It is the one-column, one-form answer to "the mechanism requires a wiki the
candidate never mandates" — cheaper than it sounds because `anker` was already a sum type expecting
exactly this kind of extension, and it does not touch the parts of the mechanism (issuance cap,
expiry, revocation, the door oracle) that are already correct.

**Cost:** small.

### 5. Gate W0 · die Ankerprobe — separating "no wiki" from "thesis refuted"

**Answers:** Break 3's other half — that W1 alone cannot distinguish the two causes of a red
result, and only one of them should kill the thesis.

**What it is.** A new gate, run in the same four instrumented weeks, **before** W1 is read:
**green when a GM whose wiki is below a stated depth (fewer than 10 existing `KnowledgeEntry`
rows at week start) still issues ≥1 Vollmacht per week using `Keim` anchors.** If W0 is green for
a campaign, that campaign's W1 result is attributable to *player* behaviour and counts normally.
**If W0 is red for a campaign — the GM could not or did not use `Keim` to make a door — that
campaign is excluded from W1's denominator with the reason recorded (`ausgeschlossen:
keine_anker`), not silently averaged in.** This is pure reporting logic over telemetry the
instrumented weeks already collect; it adds no new mechanism, only a filter and a label.

**Why sensible now.** It is exactly what Nemesis asked for — a way for a red W1 caused by "this
GM's wiki has nothing to anchor doors to" to stop masquerading as "nobody wants between-session
play," which is round-03's fatal shape and a genuinely different claim. Building `Keim` (feature 4)
without this gate would still leave the measurement blind; building this gate without `Keim` would
have nothing green to measure.

**Cost:** small — reporting/instrumentation only.

---

## Answer to Break 4 (MINOR) — the door's own overflow guard

### 6. Türtext-Umbruchschutz — the fix, made durable rather than one-time

**Answers:** Break 4 (minor) — the flagship spike has no overflow guard on the widget it names
its own highest-risk oracle.

**What it is.** `overflow-wrap: anywhere` (with `word-break: break-word` fallback) applied to
`.tuer-ziel`, `.tuer-meta`, `.ib-liste dd`, `a.eintrag`, `.leer` in spike A1, matching what spike
A2 already does at line 688 for the equivalent widget — the one-line fix Nemesis names. The
durable half: the `tuer_zustand` oracle (already listed in §6.4 as "the highest-risk new oracle in
this candidate") gets a CI fixture that renders the door with a synthetic 60-character unbroken
token and asserts `scrollWidth <= clientWidth` on every ancestor up to `.tuer`. The fix stops being
a patch to one spike and becomes a property the next spike author cannot silently regress.

**Why sensible now.** It costs one CSS rule and one small fixture; leaving it as a one-time patch
to A1 would have solved this round's instance and reintroduced the same gap the next time someone
writes a demo artifact from a blank stylesheet.

**Cost:** small.

---

## Beyond defence — features that make the fusion stranger, not just repaired

### 7. Die offene Tür — a public, unauthenticated permalink, for free

**New capability**, not an answer to any break.

**What it is.** A per-article (or per-campaign) GM-controlled toggle, default **off**, that
publishes the article's existing `fremd` projection — the exact no-campaign-membership rendering
Nemesis already hand-verified byte-for-byte leaks nothing (`attack-A.md`, "What I could not
break") — at a stable, unauthenticated URL. No new privacy surface is created: the published page
*is* the same output a stranger already gets if they guessed a campaign's internal URL; the toggle
only gives it a deliberate, stable address and a GM's deliberate choice to publish it.

**Why sensible now.** RB-11 already ratified that discovery for this product runs through creators
posting to Reddit/Discord/a blog, not through a storefront. This is the cheapest possible
implementation of that channel because the safety work is already done and already verified by an
adversary — it is a route and a boolean, not a new projector. No rival's private-journal model
(Foundry, Roll20, Fantasy Grounds) can produce a public, shareable, Wikipedia-shaped page straight
from live campaign data without a bespoke export step; this candidate can, because the `fremd`
projection already exists for privacy reasons and this simply exposes it on purpose.

**Cost:** small — one public route, one visibility flag (default off, server-enforced per
invariant 1), rate limiting so a published page cannot become a denial-of-service vector.

### 8. Der Wiederkehr-Ausweis — the device roster, shown to the player who owns it

**New capability**, though it is the visible half of feature 1 and near-free once that exists.

**What it is.** A small panel (Cast zone) listing every device credential registered to the
viewer's own identity — a label, first-seen date, last-used date, and a one-click revoke — reading
straight off the `Credentials` table feature 1 already needs. A player can see exactly why her
phone still remembers her on Tuesday, and can kill access from a device she lost, herself, without
asking the GM.

**Why sensible now.** Gnōthi seauton applied to the product itself: an account-free product that
quietly keeps a credential should never hide that fact from the person it belongs to. It costs
almost nothing — a read and a soft-delete on a table that exists regardless — and it is the kind
of legibility no competitor's real-login model bothers to surface to a player at all.

**Cost:** small.

### 9. Der Ausgabenkorb — an inspection screen for the thing you're about to publish

**New capability**, extending §9.3's already-specified `Ausgabe` (the tradeable seed + Vollmachten
+ letters unit) rather than inventing a new mechanism.

**What it is.** Before a GM publishes an `Ausgabe`, a read-only preview in Forge/Library lists
exactly which Vollmachten (sealed-line word counts only, never the sealed text, to a would-be
co-author who has not bought it), which `Keim` stubs, and which seed lines are bundled — a
checkable manifest over rows that already exist, rendered from the same `NurLeitung`-shaped query
die Woche's GM panel already computes.

**Why sensible now.** §9.3 already claims the format is "declarative… inspectable"; this is the
screen that makes that claim checkable by the GM herself before anything leaves her table, for the
cost of one more render of data the product already has in hand.

**Cost:** small.

---

## Killed — der Brief, cut wholly from slice 1

**What is removed.** `Brief`, its Postlaufzeit delivery, and der Briefkasten's letter-fan-out path
are cut entirely from slice 1 and promoted, whole, to slice 2 — not held as a contingency ("if
slice 1 must shrink") but actively removed now.

**Why.** `product-A.md` §7.4 already ranks der Brief second in its own honest cut order — "keeping
die Vollmacht — the door is the flex, the letter is the depth." This round adds two genuinely new,
justified costs to slice 1 (Die Wiederkehr's WebAuthn/pairing infrastructure, der ausstehende
Wurf's state machine) to answer breaks that would otherwise sink the thesis outright. Mēden agan
says that cost gets paid for by cutting, not by padding the slice further. Der Brief is depth, not
the flex Timo says out loud in §2; removing it saves the ~4 days §7.3 already prices, and it
removes an entire cross-device concern that Die Wiederkehr's pairing flow would otherwise have to
reason about item-by-item (a Brief's `begleittext` lives in the *recipient's* personal Kodex, on
whatever device she next opens it on — one more surface a lost-and-recovered identity has to get
right). Postlaufzeit's only consumer is der Brief, so it moves with it. Slice 1 now ships die
Vollmacht + der Ankerkeim + die Wiederkehr + der ausstehende Wurf, and the async, cross-character
correspondence layer arrives in slice 2 once the identity and atomicity ground it stands on has
actually run for four instrumented weeks.

---

## Net effect

The candidate is materially stronger where it was weakest. Break 1 — the one Nemesis asked
Apollon to weigh heaviest — now has an actual mechanism (Die Wiederkehr) instead of a silent gap,
and the gate that was supposed to catch its failure (W1) now has the instrumentation
(Zugangsvorfall) to tell a lockout from disengagement. Break 2's specification ambiguity collapses
into one specified, testable behaviour (der ausstehende Wurf) at exactly the reachability seam
RB-11 charges to every candidate. Break 3's structural asymmetry — universal cost, conditional
benefit — is answered on the authoring side (der Ankerkeim) and, more importantly, on the
measurement side (Gate W0), so a red W1 can no longer mean two different things at once. Break 4 is
closed and, more usefully, closed durably rather than patched once. Three new features exploit the
fusion in ways no competitor's architecture can cheaply copy — die offene Tür in particular is
close to free because the safety work behind it was already adversarially verified this round.

**Where it is still soft, honestly.** None of this manufactures demand: §8.1's real weakness —
zero market evidence that a GM will open a door at all — is untouched, and W0/W1 together still
depend on running four real weeks with real GMs before anyone knows the answer. §8.2's core tension
(prep partly returns at 23:41) is unchanged in kind; der Ankerkeim removes the *wiki-depth*
precondition, not the writing cost itself. §8.6's revocation race is exactly as unresolved as
before and is still, correctly, Athena's to attack directly. And Die Wiederkehr should be named
plainly for what it is: a password-free, emailless account with a device credential behind it —
not the absence of an account. That is a smaller, cheaper, more honest thing than either option
this lineage had previously refused, but a future round should not be allowed to quietly re-read
"no account" as "no account was ever true" once this ships.
