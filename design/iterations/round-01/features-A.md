# Feature Response — Candidate A, „The Living Codex" (**forge 2**)

Feature Architect · 2026-07-27 · design round 1, answering [`attack-A.md`](attack-A.md) (forge 2)
Targets: [`product-A.md`](product-A.md) (forge 2, 03:59) · [`spike-A1.html`](spike-A1.html) (04:37) ·
[`spike-A2.html`](spike-A2.html) (04:36)
Corpus: [`00-intake.md`](../../00-intake.md) · [`01-attack-plan.md`](../../01-attack-plan.md) ·
[`02-domain-model.md`](../../02-domain-model.md) · [`03-triumph-ui-direction.md`](../../03-triumph-ui-direction.md) ·
[`RB-01-*`](../../research/) · [`RB-05`](../../research/RB-05-competitor-maps.md) ·
[`RB-11`](../../research/RB-11-steam-vs-browser-verdict.md)

> **Lineage.** My response to forge 1 is preserved verbatim at
> [`features-A-forge-1.md`](features-A-forge-1.md). This document answers **attack forge 2 only**.
> Two of its rulings (per-character materialisation; the sealed trace) were written at 03:19,
> product forge 2 was written at 03:59, and **forge 2 did not absorb either** — which is why
> Nemesis re-raises F1 and F2 marked *[re-raised, unfixed]* and is right to. That is a process
> failure, not a design one, and §0 states the correction: a feature response is not binding until
> it lands in the product document as **schema, manifest or gate**. Everything in this document is
> written to be pasted into a specific numbered section of `product-A.md`, and each item says which.

Costs: **small** ≈ ≤3 days · **medium** ≈ 1–2 weeks · **large** ≈ 3+ weeks, for one builder.

---

## How to read this

Nemesis's one-line verdict is correct and I adopt it as my brief:

> *the world is a good product and the passage is a good atom — but a secret is not only a
> paragraph. It is also a number, a source, a log line and a URL, and this candidate guards the
> paragraph.*

So there are exactly **four things attached to a passage that are not the passage**, and each one
gets a named owner in this document: the **number** (F1), the **audience set** (F2), the **source
and the log** (F3), the **URL** (F4). F5 is the same shape one layer down — the clause is scoped,
the object carrying it is not.

And one design pattern runs through all five answers, because it is the only pattern that keeps
invariant 1 and invariant 6 alive at the same time:

> **Der Leak wird zur Aufforderung.** Wherever a surface would leak, the server refuses, tells the
> GM *exactly what blocks it and why*, and offers the reveal as a one-key fix. The product never
> silently redacts and never silently leaks; it asks. This is the same discipline invariant 4
> already imposes on death, applied to knowledge.

I verified in source every artifact claim I build on: `spike-A1.html` L2392–L2399 (the bare-letter
keys), L2025 and L2060 (`AUDIT.splice`), L1518 (`<button class="verweis">`), L1944 (`Keine Klausel
aktiv`); `spike-A2.html` L2077–L2078 (**no modifier guard at all** — Ctrl+R reveals), L1816
(`#log` written unconditionally), L1735 (`eff = r.id === "obs" ? "gruppe"`), L1966–L1969 (log lines
carrying `Quelle:` for passages the observer does not hold), L1626 (`/p/8f2c-4d1a` — a bearer token
in the path), and `grep -c "<main"` = **0**. All as reported.

---

## Part 0 — The two rulings forge 2 dropped, restated as schema

These are not new. They are re-issued because a feature response that is not written into the
product document does not exist, and Nemesis proved it by re-raising both.

### 0.1 `Revelation` is materialised per character — `campaign` and `user` cease to be stored

**Into `product-A.md` §3.2 and §6.2, replacing the `subject_type` enum.**

```text
Revelation (id, passage_id, revision_id, character_id NOT NULL,
            granted_via, batch_id, granted_in_session_id,
            source_ref, belief, revealed_by_user_id, revealed_at,
            retracted_at?, superseded_by?)

granted_via ∈ { direct | party_fanout | catchup_grant | import_backfill | fork_import }
```

`audience` survives as an **authoring gesture on the Action** — Kaya still picks *Die Gruppe* — and
the server fans it out to N rows sharing one `batch_id`, so undo, audit, the Session Diff and the
Canon Diff still speak the GM's language. The stored truth is per character. Nothing changes in her
hands; everything changes underneath.

**The cost objection is arithmetic, and it dissolves.** N is table size, not user count. A five-year
world at 60 000 passages × 8 characters is 480 000 integers — a roaring bitmap per character,
single-digit megabytes, appended to at human pace (a GM presses reveal a few dozen times a session).

**Cost: medium, and it must land before slice 1 ships.** Free tonight, a five-year migration on the
product's most important table afterwards.

### 0.2 §10.2's oracle list becomes a file, not a paragraph

**Into `product-A.md` §10.2 and §9.3.** The list is short by exactly the four surfaces the thesis
invented. Prose lists go stale; a manifest with a CI gate does not.

`design/oracles.yaml` — one row per read surface, each with `id`, `surface`, `owner_module`,
`test_id`, `status`. **CI fails if any row has no green test, and fails if any response serializer
imports `Entry`, `Passage`, `Revelation` or `AuditEntry` outside the projection modules**
(dependency-cruiser rule, red from commit 1). Seven rows are added tonight, all of them absent from
forge 2: `derivation_trace`, `roll_card`, `session_log`, `audit_stream`, `session_recap`,
`revelation_source`, `share_endpoint`.

**Cost: small.** It is a YAML file, a lint rule and a CI job. It is also the only mechanism in this
document that survives *me* — the next person who invents a read surface has to add a row or the
build goes red.

---

## Part 1 — The fatals

### F1 · `disclosure` on every clause · the Sealed Trace · Publish Trace · Verdeckte Probe

**Answers:** F1 (the derived number is the leak).

Nemesis proves there is no third branch *given her framing*, and her framing is right: show the term
and leak the secret, or redact the term and leak its magnitude. The exit is not a third branch — it
is that **the collision is created at authoring time and can therefore be prevented at authoring
time**, and that the leak in the redaction branch is caused by redaction being *conditional*.

**Four parts. Three are cheap; one costs the candidate a sentence of its advertisement.**

**(1) `disclosure` becomes a required field on every clause.** The rule-package validator refuses to
save a clause without it; the visual rule-builder makes it a three-way radio with plain-language
help. This is a vocabulary constraint, enforced by the Forge, not a runtime check.

```yaml
clause:
  kind: modifier
  target: skill.insight
  value: +2
  scope: { subject: "House Vharon finances" }
  disclosure: sealed        # open | sealed | narrative
```

- **`open`** — the term is public whenever the total is. *"Sera: 14 = 12 + 2 (Vharon-Ledger)."*
  This is the correct setting for most clauses that will ever exist: equipment, class features,
  conditions, the party's shared discoveries. The §2 flex survives here, untouched and public.
- **`sealed`** — the term appears only in the holder's and the GM's projection. The total is
  affected. Nobody else ever sees a term list for anyone.
- **`narrative`** — the clause produces **no number**: it produces an unlock (this option exists for
  her), a re-roll, or an edge die. A table already understands *"Sera würfelt mit Vorteil"* without
  anyone learning why, because that is how tables have worked for fifty years. **This is the setting
  the Forge recommends for a clause on a GM-only passage**, with a one-line warning at save time:
  *"Numerische Modifikatoren auf geheimen Passagen sind durch Subtraktion ableitbar. Vorteilswürfel
  nicht."*

**(2) The Sealed Trace is unconditional, not conditional.** `Trace` is a sum type with two
constructors and no third: `Complete { terms[], total }` or `Sealed { total }`. A term list that
does not sum to its own total is **unrepresentable in the API**. And the default audience for every
trace is *the roller and the GM, uniformly* — Brannt's clean, secret-free Insight trace is sealed to
the table exactly as Sera's is. There is therefore no observable difference between *"she has a
secret"* and *"she rolled"*. The oracle is not mitigated; it is gone.

Invariant 6 is rewritten in one clause, into `CLAUDE.md` and the product doc:
*every derived number can show its derivation **to a viewer entitled to every term in it**.*

**(3) `Publish Trace` — the leak becomes a prompt.** The GM (or the roller) can publish a trace to
the table. It is an Action: preview → commit → audit. The server projects it against the target
audience and returns one of two things:

- **Complete for that audience** → published. The table sees the full derivation. This is the common
  case, and it is §2's moment made *deliberate* instead of accidental.
- **Blocked** → the GM alone sees why: *„2 Terme zitieren Passagen, die Brannt und Timo nicht
  halten — Vharon-Ledger §2 (+2 Einsicht, gelernt in Sitzung 14)."* Each blocker carries a
  one-key reveal. Timo's *"why is hers two higher?"* hands Kaya the two choices a real GM has —
  narrate the mystery, or tell them — with the second costing one keystroke.

**(4) `Verdeckte Probe` — the shared check with an asymmetric term.** When a shared check contains
at least one `sealed` term for any participant, the GM's roll dialog offers a blind resolution:
the log records **outcomes for everyone, totals for nobody** — *„Sera: Erfolg · Brannt: Fehlschlag"*
— symmetrically, so absence is not a signal. One toggle, one log format, no per-observer arithmetic.

**Why sensible now:** (1) and (2) are a field and a type; they cost days and are impossible to
retrofit once a thousand clauses exist without a `disclosure` value. (3) and (4) are the two GM
gestures that make the constraint liveable.

**Cost: medium.** **Invariants:** 1 and 6 held simultaneously, which is the only resolution that
exists; 2 (the vocabulary stays declarative and closed); 10.

**Residual, stated not hidden:** see U1. A `sealed` numeric modifier is still subtractable at a
table where two sheets are visible on one screen. `narrative` is the honest answer and the Forge
recommends it; it does not forbid the other.

---

### F2 · Per-character revelations · Nachtragsgewährung · Erinnerung reist mit

**Answers:** F2 (a joiner, b leaver, c returning hero).

§0.1 is the schema half. Three behaviours complete it, one per scenario, and each is a screen.

**(a) The joiner — `Nachtragsgewährung` (Catch-Up Grant).** A new `CampaignMembership` grants
**nothing**. Instead the GM gets one screen at the moment Jo's character is created:
*„Jo tritt in Sitzung 20 bei. 47 Passagen sind Tischkanon. Alle gewähren · Auswählen · Keine."*
Whatever she grants is written with `granted_via: catchup_grant, granted_in_session_id: 20`, and
Jo's stamps read **„gewährt in Sitzung 20 (Nachtrag), ursprünglich Sitzung 6"** — never *"learned
Session 6, source: Lady Ilva Vharon's testimony"* on a character who did not exist in session 6. The
trace stops printing a lie with a timestamp, and the GM gets a decision she actually wants (most GMs
do **not** want the new player to arrive omniscient).

**(b) The leaver — nothing happens, and that is the feature.** Revelations key on `character_id`;
characters outlive memberships (`CharacterController` already permits a character controlled by
nobody). Brannt becomes an NPC and keeps every paragraph he read. **Membership churn becomes
structurally incapable of un-knowing anyone**, which is what §3.2 always claimed and could not
express. Timo's *account* loses access; Brannt's *knowledge* does not move.

**(c) The returning hero — memory travels, quarantined by default.** Importing Kael into campaign B
brings his revelation rows with him under `granted_via: fork_import`. They arrive **inactive**:
visible on his sheet as *„Erinnerungen aus Aldenfall (37) — inaktiv"*, clauses off, invisible to
campaign B's codex until the receiving GM activates all, some or none in one action. This is the
correct default (a new GM does not want a stranger's `+2`s live in her world) and it makes §6.4's
asserted property actually expressible.

**Cost: small, given §0.1.** The grant screen and the quarantine toggle are a day each.
**Invariants:** 1 (the server writes grants), 6 (stamps stop lying), 10 (all three paths are audited
rows).

---

### F3 · Die Quelle ist selbst eine Passage · `visible_events()` · the log stops being a second read path

**Answers:** F3 (provenance has no scope of its own; the artifact's session log leaks to the
least-privileged reader).

This is the cleanest of the five because the candidate already owns the mechanism and simply did not
point it at the source.

**(1) `source_ref` stops being a string and stops being a raw entry pointer.**

```text
source_ref: { kind: entry | actor | roll | verbatim,
              ref_entry_id?, display_passage_id?, gm_only: bool }
```

The *displayed* source text is itself a **Passage** (`display_passage_id`). It is therefore scoped
by exactly the machinery that already exists — one projection, one predicate, one test. „Brother
Alder's confession, taken in the second cellar under the accounting archive" is not a field value; it
is a sentence in an article, with its own visibility, like every other sentence in the product.

**(2) The reveal Action has a server-side precondition: `visibility(source) ⊇ audience(reveal)`.**
If Kaya reveals `p_8f13` to the party with a GM-only source, **the server refuses the Action** and
the Reveal Sheet shows three fixes, one key each:

> *„Die Quelle nennt eine Passage, die die Gruppe nicht hält (`p_6b18` — zweiter Keller).*
> *→ Quelle mitenthüllen · gröbere Quelle wählen (Bruder Alder) · Quelle als SL-intern führen*
> *(die Gruppe sieht ‚Quelle: von der SL vergeben')."*

Der Leak wird zur Aufforderung, again — the same shape as F1's Publish Trace blocker and F5's
template review, deliberately, so the GM learns one behaviour and not three.

**(3) The session log, the audit stream and the recap go through a projection with a name.**
`visible_events(viewer, session)` is a sibling of `visible_passages()`, in the same module, on the
same lint. An event's audience is the union of subjects it names plus the GM; for everyone else the
event is **absent — not redacted, not counted, not summarised.** No *"4 Enthüllungen (verborgen)"*
line, because a count is an oracle. `spike-A2.html` L1816 is the exact bug: `#log` written
unconditionally while `#target`, `#b-reveal`, `#b-undo` and `#glance` are role-gated.

**(4) The Session Diff and the deterministic recap render per audience.** §3.4 step 7's recap is a
projection, so there are N recaps, one per character plus the GM's — and per N4 below, that turns
out to be a *feature* rather than a tax.

**Cost: small–medium.** The source-as-passage change is a day; `visible_events()` is the same
predicate over a different table; the precondition is one server-side check plus one dialog.
**Invariants:** 1, 6, 7 (provenance survives, correctly scoped), 10.

---

### F4 · Two artefacts, not one URL: `Leseschlüssel` and `Veröffentlichung`

**Answers:** F4 (one bearer URL, two opposite intents, no expiry, no identity, no revocation,
unpriced).

§4.2.3's share token is **deleted**. It served two purposes with opposite security postures and it
did neither. Two purpose-built objects replace it.

**(1) `Leseschlüssel` — private, named, revocable, uncrawlable.**

- The GM invites by name. Each invitee gets **their own key**, bound to a `ReaderIdentity`
  (display name, key hash, created, last seen, expires — default **180 days**, renewable in one
  click by the reader).
- **The key resolves to that reader's character projection, not the party's.** Timo's key shows
  Brannt's codex — his sources, his stamps, his sealed traces. This is strictly better *and*
  strictly smaller than the party projection, and it deletes the artifact's
  `eff = r.id === "obs" ? "gruppe"` collapse at the root.
- **Claim-on-POST kills the unfurl.** The invite link is a claim page: a bot's `GET` receives a
  static page with the world's name and **no content and no cookie**; the human presses
  *„Ja, ich bin Timo"* and the `POST` sets an `httpOnly`, `SameSite=Lax`, path-scoped session
  cookie and redirects to a **keyless** URL. Discord's preview shows a title card. Timo's scrollback
  contains a link that grants nothing to anyone who has not claimed it.
- **Revocation is one row.** Timo leaves → revoke his `ReaderIdentity`; Brannt's revelations are
  untouched (F2b). Plus a *Alle Schlüssel erneuern* button for the day a phone is lost.
- `Cache-Control: private, no-store` · `X-Robots-Tag: noindex` · per-key rate limit (60 req/min) ·
  every read counted against the campaign, visible to the GM.

**(2) `Veröffentlichung` — public, deliberate, frozen.**

A first-class object, not a projection with the lights off:

```text
Publication (id, campaign_id, edition, entry_selection, revelation_cutoff_session,
             licence, robots_policy, built_at, built_by, artifact_hash)
```

The GM **selects** entries and a revelation cut-off and presses *Veröffentlichen*. The server builds
a **static snapshot** — the same builder as §11.3's static-site export, one code path, two
destinations (our hosting, or a `.zip` the GM puts anywhere). It **never updates itself**. Session
30's twist cannot appear at a public URL without a deliberate second act. `robots_policy` is the
GM's choice and defaults to `noindex`; §11.3's search-ranking go-to-market is an opt-in the GM makes
once, knowingly.

**(3) It is now in the bill.** A Publication is static bytes on object storage → the €0-egress R2
row already in §7.2, plus its size against the asset quota (M3). A live `Leseschlüssel` session is
the same JSON deltas §7.2 already prices, ×1 client, on Wednesday morning, at ~10 KB. **The
unpriced, deliberately-crawled live endpoint no longer exists** — because the crawlable thing is a
static file and the live thing is authenticated.

**Cost: medium** (identities, claim flow, revocation UI) **+ small** (Publication, which reuses the
export builder we owe B6 anyway).
**Invariants:** 1 (server-side identity, not a bearer secret), 7 (licence field on the publication),
8 (a static site is the most accessible artefact we ship), 10.

---

### F5 · Instanzen: immer gepinnt, bei Bedarf befördert, Vorlagenänderung als Review

**Answers:** F5 (no `ItemInstanceExt`, so a template edit mutates nine instances — invariant 3).

Nemesis says *pick one in writing*. I pick: **instances are Entries when they earn it, and pinned
always.** Two halves, and the cheap half alone fixes the invariant.

**(1) The pin is unconditional and costs one column.**

```text
ItemInstance (id, campaign_id, template_entry_id,
              pinned_revision_id NOT NULL, entry_id NULL,
              diverged: bool, ...)
```

Every instance pins the template revision it was created from. Kaya's September rebalance to `+2`
changes **nothing** anywhere, in any campaign, ever, until someone says so. This is B3's
content-addressed vendoring applied one layer down, exactly as the attack proposes, and it is a
`NOT NULL` column plus a join. Invariant 3 stops being an assertion in §4 and becomes a foreign key.

**(2) `Vorlagen-Review` — the template edit becomes an Action with a diff.** When Kaya edits the
template, she gets: *„Aschener Siegelring — 9 Instanzen in 3 Kampagnen. Etikette +1 → +2."* Each
instance gets **Übernehmen · Behalten · Abweichen lassen**, default **Behalten**, with a per-campaign
"alle übernehmen". Sera's eleven-session ring changes only if a human said so, in a screen that
showed her the consequence. Der Leak wird zur Aufforderung, third instance of the pattern.

**(3) Promotion — an instance becomes an Entry the moment it becomes a story.** A torch does not
need a wiki page. *The sword that drank the Kestrel's blood in session 9* does. Any of four acts
promotes an instance: **naming it**, **writing a passage on it**, **revealing something about it**,
or **`[[linking]]` to it**. Promotion copies the template's passages into instance-owned passages at
`pinned_revision_id` and allocates an `entry_id`. From then on it is a full citizen: linkable,
backlinked, revisable, revealable, exportable, publishable. Before then it is one cheap row.

This is *mēden agan* in its exact sense: the general mechanism exists, and it is paid for only by the
objects that use it.

**Cost: medium** (the review screen and the promotion path; the pin itself is small).
**Invariants:** 3 (implemented, finally), 1, 6 (an instance's `+1` traces to its own pinned
revision), 10.

---

## Part 2 — The majors

### M1 · The Forge edits a **package**, never a universe — with a CI job that proves it

**Answers:** M1 (§4.1 welds the Forge to the Codex against RB-11).

§4.1's insight is right and its coupling is wrong, and the two are separable in one move:
**`Schema` keys to `package_id` only.** `universe_id` comes off the table. A universe does not own
schemas; it **installs packages** — which is B3's vendoring, which already exists.

The Codex's own type editor is then the Forge editing one particular package: the universe's
implicit **house package** `pkg:local/<universe>`, created on world creation, ordinary in every
respect, exportable and installable elsewhere. §4.1's payoff survives word for word — the
wiki-template editor and the sheet builder are the same tool — and the tool now operates on a file
format instead of a database row.

**The proof is a CI job, not a paragraph.** A `forge-standalone` build target compiles Forge + rule
engine + WFC generator + theme studio against a package file with **zero imports from `codex/*`,
`session/*` or `server/*`**, enforced by a dependency-cruiser rule that is red from commit 1. RB-11
asked for *separable by architecture*; this is the only form of that promise that cannot rot.

**Why sensible now:** it is a schema key and a lint rule today, and a rewrite of the whole authoring
half the day someone wants the Steam-shaped artefact. **Cost: small.**
**Invariants:** 2 (packages stay declarative and now stay self-contained), 10.

### M2 · Die Enthüllung ist eine Handlung — Sheet, no sticky target, a 4-second window

**Answers:** M2 (one unmodified letter, sticky recipient, no confirmation, irreversible).

The bare letter is deleted (M8 deletes the whole class). Reveal becomes:

1. **`Enter` on the focused passage handle** — a real `<button>`, so Enter works in browse mode,
   focus mode, and with a mouse, identically.
2. **The Reveal Sheet** — a focus-trapped `aria-modal` dialog with (a) **no preselected recipient**;
   last-used is offered as the *focused* button but is never armed by default, (b) a **byte
   preview**: *„Sera erhält: Absatz 4, Quelle ‚Bruder Alder'. Die Gruppe erhält: nichts."*, (c) the
   F3 source precondition and the F1 disclosure warning rendered inline as blockers, (d) **Commit**.
3. **A 4-second window.** The commit is deferred behind a visible *„Rückgängig"* toast; during the
   window **nothing has been sent to any client**. Cancel inside it and no row and no event ever
   existed. After it, the reveal is permanent and undo becomes **Retract** (M11), which is an
   append, not a deletion — because the paragraph has been read and the product must never pretend
   otherwise.

Kaya reveals forty times a session, so speed matters: after the first reveal, the Sheet opens with
the previous recipient as the focused default button. **Enter, Enter.** Two deliberate keystrokes,
one named target, one visible preview. That is faster than the dropdown she was maintaining, and it
cannot fire from a `contenteditable`.

**Cost: small.** **Invariants:** 4's discipline generalised to the irreversible act that is *more*
irreversible than death; 1; 10.

### M3 · Die geteilte Rechnung — Text ist frei, Pixel zählen

**Answers:** M3 (a 5 GB quota against §7's own 8–20 GB estimate).

§7.2's own numbers say the bill is **assets**, not the codex: 60 000 passages of prose with full
revision history is tens of megabytes. So the quota stops metering the thing the thesis tells the GM
to accumulate:

| Line | v1 policy |
|---|---|
| **Passages, revisions, revelations, links, schemas** | **unlimited**, included in the licence, forever |
| **Assets** (scenes, handouts, media) | **5 GB included per account** (not per universe), overage **at cost**, €0.02/GB-month, billed monthly, cancellable |
| **Eigener Speicher** | a `StorageTarget` on the universe → the GM points assets at her own S3/R2/Backblaze bucket. **Our cost: zero. Her cost: what she already pays.** |
| **Kaltes Regal** | assets untouched 12 months move to infrequent-access class automatically and count at ⅓ rate; a one-click warm-up |
| **Rooms** | 2 concurrent included, extra rooms at cost |

Three of Nemesis's four options taken at once: the quota rises on the half that is cheap, the licence
stays one-time, and the meter is moved onto the half that actually costs money — Owlbear's model
(storage and rooms, never features), which RB-01 shows the market accepts.

**Cost: small** for the policy and the Cold Shelf; **medium** for BYO-bucket.
**Invariants:** 7 (asset provenance is unaffected by where bytes live), 10.

### M4 · Eigene Domain, echtes HTTPS — the sovereignty path, named and tested

**Answers:** M4 (v1 "self-hostable" means everyone installs Electron; the sovereignty audience is
served worst).

§7.4's *"Nothing. She never meets CGNAT, because she never hosts"* is the right answer for the GM
who does not want the feature. Here is the answer for the one who does, at a cost we can pay:

1. **Own domain → full HTTPS, supported and tested at launch.** The host binary ships an **ACME
   client with DNS-01** and a five-field wizard (provider, API token, hostname). The GM who owns
   `aldenfall.de` gets a real certificate on her home box behind CGNAT, because DNS-01 does not need
   an inbound port. **We operate no PKI, no DNS zone, no Plex-pattern service** — §7.4's refusal
   stands. Tested in CI against a real ACME staging endpoint, so it is a shipped path and not a
   documentation page.
2. **No domain → two honest choices, both named in the join dialog**: (a) everyone uses the desktop
   client (€0, full capability), or (b) a **tested third-party tunnel recipe** (Cloudflare Tunnel /
   Tailscale Funnel) with a verified walkthrough and a CI smoke test — a recipe we maintain and do
   not operate.
3. **The Secure-Context Notice becomes a product surface**, per §7.3's genuinely new finding. A LAN
   browser player on `http://192.168.x.x` sees, in the join dialog, *what she is losing* — offline
   cache, WebGPU, OPFS — and a button *„Im Desktop-Client öffnen"*. Named, in the product, at the
   moment it matters.

So the v1 sentence becomes checkable: **self-hosting serves browser players over the internet if the
GM owns a domain; otherwise it serves desktop clients fully and LAN browsers with a stated
degradation.** That is a smaller promise than the intake's one-liner and a true one.

**Cost: medium.** **Invariants:** 1 (the host validates our tokens; it is never the identity
authority), 8 (the notice is a real dialog, keyboard-reachable), 10.

### M5 · Fremdwelt-Import — the entrance, at launch

**Answers:** M5 (export ships outbound only; the exit is optimised and the entrance unbuilt).

At launch, three importers, each landing in the Codex substrate rather than in a dump folder:

- **Foundry world import** — a world folder or `.zip`; journals → Entries with passages, actors →
  Actor Entries with statblock passages, items → ItemTemplates, tables and playlists → typed
  entries, scenes → the UVTT path (§8, already committed). Folder structure becomes `parent_entry_id`.
- **Roll20 campaign export (JSON)** — handouts, characters, and the journal tree.
- **Fantasy Grounds campaign XML** — the on-disk campaign, which is plain XML.

Three rules that make it a Codex import rather than a data migration:

1. **Nothing is silently dropped.** Unmapped data lands in a red-linked `Import-Rest` entry with a
   count and the raw record, and the **Import Report** prints the arithmetic: *„412 Journale · 1 106
   Passagen · 87 Akteure · 14 Sätze nicht übernommen (Makros)."*
2. **Licensed content is flagged, not laundered.** Records that came from a paid module or compendium
   are marked `licensed_source` on import: usable in the GM's own world, **excluded from
   `Veröffentlichung`, from `.chronicle` export sharing and from forking**. Invariant 7 is enforced
   at the import boundary, where it is cheap, instead of at the publish boundary, where it is a
   lawsuit.
3. **The import ends in the Nachtragsgewährung** (F2a). *„1 106 Passagen sind Kanon. Was weiß die
   Gruppe schon?"* The migrating GM's very first act in our product is the product's core gesture,
   performed on her own four-year world. That is the best onboarding this candidate can possibly
   have, and it exists only because F2's screen already exists.

**Why sensible now:** RB-11's Dungeon Alchemist evidence is about a *tool* feeding incumbents; A is a
*replacement*, and for a replacement the direction that decides everything is inbound. §10.1 says the
value curve needs four sessions of faith — this is how a Foundry GM reaches session one on Tuesday
instead of after a week of typing.

**Cost: large** (three formats, mapping tables, the report). Funded by killing the three bespoke
outbound scene exporters — see Part 4, kill 3.
**Invariants:** 7 (licence flags), 3 (imported items become templates + pinned instances), 10.

### M6 · Schema-Lite in Scheibe 1 — typed page types, no layout editor

**Answers:** M6 (`Entry.schema_id` pointing at nothing; the ninety-day rule in neither slice).

`Schema` ships in slice 1 at the smallest honest size:

```text
Schema (id, package_id, version, kind,
        fields[ {key, label, type ∈ text|number|date|ref|enum|list, unit?, required} ],
        infobox_order[], default_sections[])
```

Three built-ins (`article`, `person`, `place`) plus **„Neuer Seitentyp"** — a form, not a canvas.
Jens gets a real `Settlement` type with `Einwohner: number`, `Herrscher: ref(person)`,
`Gegründet: date` in slice 1, rendered as a real `<dl>` infobox (the spike already renders these
correctly). **No layout editor, no formulas, no sheet builder** — those arrive with the rule engine
in slice 2 and the layout stage after it, exactly as §4.1 sequences.

This is the ninety-day rule honoured at a fifth of the cost, and it makes `Entry.schema_id` point at
something on day one instead of being a column with a promise in it.

**Cost: small–medium.** **Invariants:** 2 (typed, declarative, no expressions), 8 (a typed infobox is
better semantic HTML than a free-text blob), 10.

### M7 · Der Spielersitz in Scheibe 1 — three surfaces and a re-cut demo

**Answers:** M7 (for two slices the product has nothing a player can see).

Slice 1 currently gives a player a link, a name, and an article that occasionally gains a paragraph.
Three additions, all of which run on data slice 1 already stores, and none of which needs the rule
engine:

1. **Der persönliche Kodex** — her own projection, her own stamps, on a phone, via `Leseschlüssel`
   (F4). Required anyway.
2. **„Was habe ich verpasst?"** — N4 below. Ships in slice 1.
3. **Feldnotizen** — N6 below. Ships in slice 1.

And a change to §9.3 that costs nothing and matters: **the acceptance demo gets a player seat.** Its
last thirty seconds are not the GM's DevTools network tab; they are Wednesday morning, a phone, a
player reading her own codex and writing one field note that cites a passage she holds. The DevTools
proof stays — it is the best gate in the corpus — but it stops being the finale.

**Cost: small** (the demo re-cut; the three surfaces are costed at N4/N6/F4).
**Invariants:** 1, 8, 10.

### M8 · Tastatur-Architektur — no bare letters, ever, and a reserved-key list in the repo

**Answers:** M8 (every key the candidate uses is an NVDA/JAWS quick-nav key).

Nemesis is right that this is not a bug but the key choice, and right that there is currently no
working key for the flagship gesture. The replacement is architectural:

1. **No global single-letter shortcut exists in this product.** A lint rule forbids
   `key.length === 1 && !ctrlKey && !metaKey && !altKey` in any document-level handler. Class deleted.
2. **Every command is reachable three ways** — a visible control, the **command palette**
   (`Ctrl+K`), and at most one non-reserved chord. This is a gate in `oracles.yaml`'s sibling
   `commands.yaml`: a command with fewer than three paths fails CI.
3. **`reserved-keys.md` in the repo**, enforced by the same lint: `Ctrl+1…9` (tab switching, which
   spike-A1 already discovered), `Ctrl+W/T/N/R/L/D/P/S/F`, `Alt+←/→`, `F1/F3/F5/F6/F11/F12`, and the
   **NVDA/JAWS browse-mode single letters** — which is the whole Latin alphabet, which is why rule 1
   exists.
4. **The reveal is `Enter` on a focused `<button>`** (M2). Activating a button works in browse mode.
   **The three-column view is the tablist the spike already built correctly** — Tab to it, arrows
   within it, `Ctrl+3` deleted along with `3`.
5. Region navigation is **`F6`**, the platform convention, not `Ctrl+digit`.

§9.3's gate — *"NVDA/Firefox reads the article, the reveal, and the backlink list; keyboard-only
completes the whole demo"* — becomes passable as specified.

**Cost: small.** **Invariants:** 8 (architecture, not polish), B8 parity restored on the flagship.

### M9 · Echte Links — `<a href>`, real routes, uniform 404

**Answers:** M9 (the wiki's links are `<button>`s).

Every `[[wikilink]]` renders as `<a href="/w/<universe>/<slug>">`. Middle-click, Ctrl-click, open in
new tab, copy link address, history, back button, hover status bar, *"link, visited"* in NVDA, and
crawlability for the `Veröffentlichung`. Red links are `<a href="/w/<universe>/<slug>?anlegen">` with
`data-state="rot"` and an `aria-describedby` note — a red link on Wikipedia is a link, and Timo's
*"open the Iron Vault in a new tab"* works.

Two rulings that come with it:

- **Server-side routing, not client-only.** Every article URL is resolvable by a cold `GET` against
  the reader's projection. This is required by the static export and the Publication anyway, so it
  is not a cost — it is the same code path pulled forward.
- **404, uniformly, always.** An entry the reader may not know exists returns **404, never 403**,
  with the same body and the same timing as a genuinely missing entry. `oracles.yaml` row
  `entry_route_404`, with a timing-variance test. (This closes the 404-vs-403 oracle §10.2 already
  names but nowhere resolves.)

**Cost: small.** **Invariants:** 1 (the 404 rule), 8, 10, and §11.3's search-ranking claim becomes
true instead of aspirational.

### M10 · `projection_version` and a performance gate with numbers

**Answers:** M10 (full `innerHTML` rebuilds, O(P × V × R) per keypress, focus destroyed per keystroke).

Three rulings, all of which the React/Pixi runtime makes cheap and none of which the vanilla spikes
had a reason to:

1. **The projection is computed once per `projection_version`, never inside a render loop.** A
   character's visible-passage set is a bitmap held per character; `projection_version` increments
   only when a revelation lands. The three-column matrix renders from three precomputed sets: the
   inner loop is a bit test, not a filter over 3 000 rows. Results cache on
   `(view, reader, projection_version)`, and during a session the hit rate is ~100 % because the
   only invalidator is an event the reader watched happen.
2. **No full `innerHTML` replacement anywhere.** Keyed reconciliation; **selection is a `data-`
   attribute plus roving `tabindex`, never a re-render**. Focus is never torn down, so NVDA stops
   re-announcing the control on every arrow key — which was the part that hurt more than the frames.
3. **A CI performance gate at the corpus's own numbers:** 300-passage article, 6 viewers, 3 000
   revelations, ArrowDown held 3 s → **no frame > 50 ms**, **zero `focusout` events on the selected
   handle**, search-box keystroke → repaint **< 8 ms** with a 2 000-entry rail (virtualised).

**Cost: small** (it is a gate plus the framework already pinned).
**Invariants:** 8 (focus stability is accessibility, not performance), 10.

### M11 · Append-only enforced by database grant; undo is `Retract`

**Answers:** M11 (undo splices rows out of an append-only audit log — flagged in forge 1, still there).

Three characters of code inverted the domain model's one non-negotiable property, twice, across a
rebuild. So it stops being a code-review item:

- **The application's runtime DB role has no `UPDATE` and no `DELETE` on `audit_entry`.** A
  `GRANT INSERT, SELECT` and nothing else. The splice becomes impossible at the layer below the
  programmer, which is the only layer that survives a 04:37 rebuild.
- **Undo inside the 4-second window writes nothing** (M2) — there was no commit, so there is nothing
  to un-log.
- **Undo after the window is `Retract`**, an appended event: `{kind: retract, target_revelation_id,
  actor, at, reason?}`. The Canon Diff can then answer *„hast du ihnen das gezeigt und wieder
  weggenommen?"* — §10.5's stated purpose, currently unanswerable in the artifact.
- The reader's side of a retraction is honest too: her codex shows the paragraph struck through with
  *„zurückgenommen in Sitzung 19"* rather than the paragraph silently vanishing, because a person who
  read a sentence cannot un-read it and pretending otherwise is what makes a wrong wiki.

**Cost: small.** **Invariants:** the domain model's refinement 5, restored; 6; 10.

### M12 · Herkunftsverlauf — Canon Divergence for numbers

**Answers:** M12 (calculation transparency is present-tense only; the fix was invented and applied to
the wrong noun).

Nemesis's own suggestion, adopted without modification because it is right. The trace view gains a
second tab, **Verlauf**, built from the revelation/retraction stream that F2 and M11 already store:

> `12` (Sitzung 1, Grundwert) → `14` (Sitzung 14 · +2 · Vharon-Ledger · Quelle: Bruder Alder) →
> `12` (Sitzung 19 · zurückgenommen · *die Aussage war eine Lüge*)

Scoped by F1's rule — sealed unless the viewer is entitled to every term — and rendered with the same
component as §11.2's Canon Divergence, because it is the same shape: *believed from, contradicted at,
superseded by*. Two consequences:

- **A number never changes silently again.** `zaehleZahl()`'s animation from 14 to 12 gets a
  **why-chip** the holder can open on the spot.
- **Invariant 6 stops being compliance and becomes a differentiator.** No product in the RB-01
  teardowns can show you the biography of a modifier, because none of them knows why a modifier
  exists.

**Cost: small.** **Invariants:** 6 (as history, not snapshot), 1, 10.

### M13 · Die Wissenskarte — the half of K5 that is on *our* thesis, in slice 2

**Answers:** M13 (K5, the flagship Kaya named, lands after both planned slices) — **partially. The
allocation itself is Kaya's to rule; see U2.**

I will not pretend a feature resolves a stakeholder collision. What I can do is make A's slice 2
carry a real, differentiated, demonstrable piece of K5 instead of nothing, and do it on the thesis
rather than against Foundry's decade-deep wall model. See N5 for the full description; the M13
answer in one line is:

**A Scene is an Entry, so its regions are passages, so the map is a projection — and a map that
differs per character because knowledge differs per character is a K5 feature no competitor can
ship without rebuilding their data model.** It arrives in slice 2 alongside the rule engine, it needs
no walls, no LoS and no `ClockwiseSweepPolygon`, and it gives the WFC generator a consumer that
exists — because a generator that emits *regions and tiles* emits exactly what the Wissenskarte
renders.

Tactical fog-by-vision, walls, lighting and the Pixi hot path stay in slice 3+, and §1's honest
surrender of the tactical ceiling stands.

**Cost: medium** (see N5). **Invariants:** 1 (region visibility is the same predicate), 8 (the
Outline recipe is the map's accessible representation and is free here), 9/K7.

### Minors · one hygiene block

All small, all in the next spike, none of them arguable:

1. `<main>` in spike-A2, and the article title as `<h1>` within the stage's heading scope.
2. The popover gets a real focus trap, `aria-modal="true"`, and `inert` on the background — or it
   stops calling itself `role="dialog"`.
3. The live region re-announces identical messages: clear → `requestAnimationFrame` → set, or append
   an invisible counter. §9.3 gates on NVDA reading *the reveal*; a silent second reveal fails it.
4. `overflow-wrap: anywhere` on `.eintrag-knopf .name` (A2's `.log p` already gets this right). This
   is the German-market product and the rail holds 2 000 compounds.
5. The A2 reveal toast stops asserting an isolation property F4 deletes.
6. **The backlink index gets built in the next spike.** §6.2 makes `Link` one of three new tables,
   §10.2 calls the backlink surface one of the dangerous oracles, and `zeichneRueck()` is a
   hard-coded literal array. The round's most-discussed permission surface is the one nobody
   prototyped, and it needs to be a real index over a real `Link` table with a real projection test.

---

## Part 3 — Beyond defence: three flexes that need the fusion

Each requires a per-character revelation log joined to a wiki. None can be copied by Foundry,
Roll20, Alchemy or Owlbear without rebuilding their data model — which is the test K4 actually sets.

### N4 · „Was habe ich verpasst?" — der Nachtrag

**New capability.** Nemesis named this herself as *"the cheapest win available to round 2"*, and she
is right that A has the data and never claims the feature.

A player opens the app — late to the table, or absent last week, or just on Wednesday morning — and
presses one button. She gets **her own** brief, deterministic, no AI, no GM effort:

> **Seit deinem letzten Besuch (Sitzung 21, 22:14)**
> **Du hast 3 Dinge gelernt.** *Der Aschener Siegelring am Hof ist eine Fälschung* — Sitzung 22,
> 20:41, Quelle: Bericht von Sera · *…*
> **Die Gruppe hat 5 Dinge gelernt, die du auch weißt.**
> **Eine Sache, die du glaubtest, stimmt nicht mehr:** *Die Bücher sind echt* — widerlegt in
> Sitzung 22 durch das Ledger.
> **Zwei rote Verweise sind neu:** *Kestrel-Flügel · Zweiter Keller*

Every line is a row we already store: F2's per-character revelations, F3's scoped sources, M11's
retractions, M12's value history, the Link table's red links. **It is a query and a stylesheet.**

**Why sensible now:** it is the answer to M7 in slice 1, it is the single most-requested thing at
every table in the world (*"what happened last week?"*), and it is structurally impossible for
competitors: Foundry can show you a journal, it cannot show you *your* delta, because it does not
model who knows what. It is also the seed of the deterministic recap §3.4 step 7 already promises —
one renderer, two audiences.

**Cost: small.** **Invariants:** 1 (it is a projection, server-produced), 5 (zero AI, and that is the
selling point), 6, 8.

### N5 · Die Wissenskarte — fog of war as a knowledge projection, not a vision computation

**New capability** (and the M13 answer).

Every GM in this hobby maintains two map files: the real one and the one the players get. Every VTT
solves this with *vision* — token line-of-sight, wall geometry, dynamic lighting — which is Foundry's
ten-year moat and Owlbear's Warp Core, and which we said in §1 we will not out-build.

We do not have to, because **we know something they structurally do not: who knows what.**

A Scene is an Entry. Its regions are Passages. Therefore a region carries a Revelation, and the map
a reader sees is the projection of the map:

| Region state for this reader | Rendered as |
|---|---|
| holds a revelation for the region passage | drawn, named, with its stamp: *„gelernt Sitzung 14, Quelle: Bruder Alder"* |
| holds a revelation marked `belief: false` | drawn in **rumour outline** — dotted, italic label, *„so hat man es dir erzählt"* |
| holds nothing | **absent** — no shape, no label, no placeholder, no bytes in the response |

So: **the party's map of Aldenfall is the map the party has earned**, drawn from hearsay and
half-truths, and it is *wrong in the places where they were lied to* — which is the single most
evocative thing anyone in this market could put on a screen. Sera's map and Brannt's map differ.
A rumour region that is later contradicted redraws itself and the Canon Divergence panel explains
when they believed it and who told them.

And the strategic payoffs are three:

- **It gives WFC a consumer two slices early.** A generator that emits regions + tiles emits exactly
  what this renders. K5's flagship bet lands against a real feature instead of against a tactical
  layer we admitted we would lose.
- **It photographs.** §10.6 concedes a knowledge graph does not screenshot. *A hand-drawn-looking
  map with three rumour-dotted rooms and a Sitzung-14 stamp on a corridor* absolutely does — and it
  is a still image, which U4 says we did not have.
- **It needs no walls.** No LoS, no attenuation, no sweep polygon, no Pixi hot path — region
  polygons, labels and the projection, DOM/SVG first. The Outline recipe (the semantic list of
  known regions) is free here and is the accessible representation §03 already demands.

**Why sensible now:** it is the thesis applied to the one surface the thesis had surrendered, it
costs a fraction of a vision system, and it is the map feature Kaya can be shown rather than
promised. **Cost: medium.** **Invariants:** 1 (the same predicate; unknown regions are *absent*, per
the Observer contract), 8, 9/K7 (regions are content, the tileset is a package, nothing is welded in).

### N6 · Feldnotizen mit Zitierpflicht — the players write the wiki, and cannot cite what they do not hold

**New capability**, and it absorbs §11.1's Theory Board (see Part 4, kill 5).

A player can write. Her **Feldnotiz** is an Entry in her own scope, with the same editor, the same
`[[` autocomplete (filtered through *her* projection — which is precisely the oracle §10.2 fears, so
this is where the projection gets tested hardest), and one constraint that makes it a mechanic
instead of a text field:

> **A field note may cite only passages the author holds.** Server-enforced. Her citations are
> `Revelation`-backed, which means her note *carries its own evidence*.

That single constraint produces four things at once:

- **A theory with stakes** — she writes *„Der Siegel ist eine Fälschung"* and cites the three
  passages she has. Other players can **agree / doubt** (one `Stake` row). When canon resolves, the
  note self-scores: *„Sera hat es in Sitzung 11 gesagt, auf drei Passagen, bevor das Ledger
  existierte."* That is §11.1's Theory Board, delivered by a general mechanism rather than a special
  one.
- **A wiki with more than one author** — the Fandom half stops being a GM's encyclopedia that players
  read, and becomes the thing a fandom wiki actually is. Nobody in this market has player-authored
  canon with permission-checked citations.
- **A promotion path** — the GM can promote a field note (or one of its paragraphs) into canon with
  attribution: *„nach einer Notiz von Sera, Sitzung 11"*. The world grows from the players, and the
  provenance chain records it.
- **A test surface that pays for itself.** Every leak in the product's most dangerous oracle
  (`[[` autocomplete) is exercised by a real user doing a real thing, in slice 1, by someone with the
  fewest rights in the system.

**Why sensible now:** it is the second player-facing surface M7 demands, it needs no rule engine, and
it is one Entry scope plus one server-side citation check plus one `Stake` row. It also gives the
player a reason to open the app that is not *reading*.

**Cost: small–medium.** **Invariants:** 1 (the citation check is server-side and is the whole point),
7, 8, 10.

---

## Part 4 — What we remove

Six removals. Every round that only adds is a round that made the product harder to ship.

**1. `subject_type: campaign` and `subject_type: user` as stored state — deleted.** (F2.) The
permission matrix loses a dimension: the gate becomes universe role × campaign role × character.
`audience` survives only as an authoring gesture that fans out. The best kind of removal — it shrinks
the thing that must be exhaustively tested forever.

**2. The anonymous bearer share token (§4.2.3) — deleted.** (F4.) One URL that was simultaneously a
private link for five people and a search-indexed public artefact, with no expiry, no identity and no
revocation. Replaced by two objects with opposite, explicit postures. The `/p/8f2c-4d1a` shape in
spike-A2 does not appear in the product.

**3. The three bespoke outbound scene exporters (Foundry-shaped, Roll20-shaped, FG-shaped) — cut from
launch.** (M5.) **UVTT is the interchange format all three already read**; three hand-maintained
exporters against three moving targets is triple maintenance for a format that exists. Launch exports
become: **UVTT out · `.chronicle` out · static site out**. The budget buys the *entrance* (M5), which
is the direction that decides whether anyone switches.

**4. Bare single-letter global shortcuts — deleted as a class.** (M8.) Not "changed to a better
letter". There is no better letter; NVDA and JAWS own the alphabet in browse mode. A lint rule, a
reserved-key list, and a command palette replace the entire category.

**5. The Theory Board as a distinct feature (§11.1) — folded into Feldnotizen.** (N6.) It was a
special-purpose surface for a general capability. One editor, one scope rule, one citation check, one
`Stake` row — and the Theory Board falls out. Two features become one.

**6. World forking (§11.3's fourth idea) — cut from v1.** *"Worlds are forkable, with attribution
through `derived_from`"* is one line priced at zero and it is a second product: a registry with
identity, moderation, takedown, licence compatibility between forked worlds, and — after M5 —
**contamination by imported licensed content**, which is invariant 7 with a lawyer attached. The
static `Veröffentlichung` (F4) delivers the actual value (a world you can show, hand over and host
anywhere) with none of it. Fork returns when the registry has an owner and a policy.

**One thing I decline to remove, against expectation:** the three-column diff. M8 breaks its *keys*,
not the view, and M10 breaks its *render loop*, not the view. It is the flex, it is the 40-second
video §10.6 says is our marketing asset, and both breaks are fixed above for a combined cost of days.

---

## Part 5 — Unanswerable within this thesis

Five, stated rather than papered over. A fake fix is worse than an admitted break.

**U1 — A shared check with an asymmetric secret cannot be jointly explained.** The Sealed Trace kills
the conditional-redaction oracle, `disclosure: narrative` gives the GM a leak-free way to express the
biggest secrets, `Publish Trace` turns the question into a one-key reveal, and `Verdeckte Probe`
resolves the collision symmetrically. But if a GM chooses `disclosure: sealed` on a numeric modifier
and the table can see two sheets on one screen, the magnitude is subtractable. **The mitigation is a
recommendation in the Forge, not a proof.** Nemesis predicted this cost and it is real; what I reject
is her framing that the honest fix is *"secret clauses may not participate in shared rolls"* — the
honest fix is that secret clauses should mostly not be *numbers*, which is a vocabulary design
decision the product can guide and cannot enforce.

**U2 — M13's allocation is a stakeholder collision, not a design defect, and Kaya must rule it.**
N5 puts a real, differentiated half of K5 into slice 2, on our thesis, at medium cost. It does not
change the fact that A reallocates the flagship Kaya *named* (WFC, sprites, "wir wollen das nur in
besser") to a flagship Kaya did not name. Nemesis is right that this must be a fork put to the
stakeholder, and no feature I can write is entitled to close it.

**U3 — No one-time licence funds hosting at the tail.** M3's split bill is arithmetically sound for
the median world, BYO-bucket removes our marginal cost for the heavy user, and the Cold Shelf helps.
It remains true that a GM who paid €30 in 2027 and reads her codex in 2037 costs us money forever
with no further revenue. The promise we can keep is narrower than the thesis wants: *„Dein Text ist
kostenlos, solange es uns gibt — und deine Welt öffnet sich auch ohne uns."* The second half is real
(static export, `.chronicle`, BYO storage). The first half is a bet on our survival, and no feature
fixes that.

**U4 — Cold start's *shape* is unchanged.** M5's importers shorten the curve dramatically for the
migrating GM — the customer we most want — and do **nothing** for the GM starting a fresh world, who
still faces an empty encyclopedia against Owlbear's twenty minutes. §10.1 calls this the reason to
lose the round. It is still the reason to lose the round; it is now the reason to lose a smaller part
of the market.

**U5 — The visibility tax is a behavioural bet on a human being at 23:00.** §10.4 is honest and it
stays honest. Reveals ride on gestures the GM already makes, the Session Diff catches misses, and
Blind Spots (features forge 1, N2) gives the tax a payoff worth paying. None of that makes a tired GM
press the button, and a codex that systematically under-reports is worse than no codex because
players trust it. This is measurable and unmeasured, and round 2 owes the measurement.

---

## Net effect

**Stronger, and this time for a different reason than last round.** Forge 1's response was one
structural change doing most of the work. Forge 2's is one *discipline* doing it: every surface that
hangs off a passage gets the passage's own scoping, and every place a scope would block the GM, the
product asks instead of hiding. Der Leak wird zur Aufforderung appears four times — F1's Publish
Trace blockers, F3's source precondition, F5's template review, M2's byte preview — and it is the
same dialog pattern each time, which means it costs once and teaches once.

**The five fatals.** F2, F3, F4 and F5 are answered structurally and cheaply, and each answer is a
schema change or a database grant rather than a promise: `character_id NOT NULL`; source as a
Passage plus `visible_events()`; two objects replacing one URL; `pinned_revision_id NOT NULL`. F1 is
answered at a stated, accepted price (U1) — the `disclosure` field is the new thing, and it moves the
collision from runtime, where it is unresolvable, to authoring time, where the Forge can guide it.
Nemesis's four-coats diagnosis was exactly right and the fix clusters for the same reason the breaks
did.

**The strategic exposure — M1, M5, M6, M7, M13 — was the harder half and it is only partly closed.**
M1 costs a schema key and a CI job and is genuinely fixed. M6 and M7 are fixed cheaply, and M7's
answer (N4 + N6) turns out to be the best new material in this document: the product finally has
something a player can *do* in slice 1, and both surfaces are impossible for competitors. M5 is
answered at large cost, funded by a kill, and it is the item most likely to be argued down — it
should not be, because it is the entrance and §11.3 already built the exit. M13 is answered halfway
and honestly (U2).

**The product also got smaller**, which matters more than what it gained: one permission dimension,
one bearer-token mechanism, three exporters, an entire class of keyboard shortcut, one duplicate
feature and the fork ecosystem are all gone.

**Where it is still soft, in order.**

*First, the editor.* §10.3 remains the largest unpriced engineering item in the candidate, and
nothing in this document touches it. Stable passage anchors across rewriting, splitting, merging and
pasting is a ProseMirror-class workstream, everything here anchors to passage ids, and if the anchors
drift then revelations orphan, clauses point at deleted sentences and every feature above degrades
silently. Hephaistos should price it before the verdict, not after.

*Second, U4 — cold start.* Import shortens the curve for migrators and leaves its shape intact for
everyone else. It is the axis on which this candidate loses if it loses.

*Third, the demo-versus-plan gap.* Slice 1 now carries `Schema`-Lite, three importers, reader
identities, a claim flow, `<a href>` routing and two player surfaces on top of what §9.1 already
listed. Each is individually justified above and the aggregate is a slice that has grown while I was
defending it. **Apollon should read Part 4's kills as load-bearing, not as decoration** — and if the
slice must shrink further, the honest cut is M5's Roll20 and Fantasy Grounds importers (keep Foundry,
which is 60 % of the market we are taking users from), not the scoping work, which is free tonight
and a migration in 2029.
