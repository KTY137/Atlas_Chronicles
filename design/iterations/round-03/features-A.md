# Features for Candidate A — „Der Konvent", Round 3

**The Feature Architect's answer to Nemesis.** Read: `product-A.md`, `attack-A.md`, `spike-A1.html`,
`spike-A2.html`, `00-intake.md`, `02-domain-model.md`, `03-triumph-ui-direction.md`, `RB-11`,
`CHAMPION.md` §5.5–§6.6.

Her verdict: **three fatal, nine major, two minor — and the flex survives.** Her closing concession is
the work order: *„Every fatal above is about the machinery around the photograph, not the
photograph."* So this document does not defend the photograph. It rebuilds the machinery, cuts the
slice in half, and adds three things that make the photograph stranger.

**Seventeen features. Three kills. Four honest residues.** Every feature below either changes a type
so a break becomes unrepresentable, or it is a cut. Nothing here is a promise to be careful.

**The single sentence that organises all of it:** *the counted absence is the recurring bug, and it
recurs because the client is allowed to know two projections.* Take that ability away — from the
type, from the bundle, from the announcement path — and FATAL 1, FATAL 2 and MAJOR 10 are one fix
applied in three places.

---

## Part I — The three fatals

### F1 · Die fünfte Fläche — a live region is an output surface, and only the projection may speak

**Answers:** FATAL 1 (the Beobachter seat is handed a count, a byline and a name in `#meldung`, and
the Leak Bench cannot see it).

**What it is, concretely.**

The champion's `Sicht` node already has the right shape and Der Konvent never used it:

```text
Knoten { art, kinder[], handle?,
         texte: { sichtbar, aria, titel, alt, live } }   -- five strings, one record
```

`texte.live` is the fifth slot. Three changes make it the *only* way anything is announced:

1. **Announcements are composed server-side, per reader, and arrive as `Sicht` nodes.** The client
   never holds the numbers, so it cannot compose *„5 stehen nicht im Dokument — 2 davon von Sera."*
   The string that reaches a Beobachter seat is the string the projector wrote for that seat, and the
   projector for that seat has no access to the withheld set — the same reason `autorenleiste` is
   already correct in A2 while `ersteMeldung()` is not.
2. **One writer.** A single client function `sprich(knoten)` reads `knoten.texte.live` and is the only
   code in the product that writes to an element carrying `aria-live`, `role="status"` or
   `role="alert"`. A lint (`no-live-region-write`) fails the build on any `textContent` / `innerHTML`
   / `insertAdjacentHTML` / `append` targeting such an element outside `sprich()`. This is the same
   shape as the champion's existing dependency-cruiser rule (§6.3) and reuses its infrastructure.
3. **The bench's scan space inverts from allow-list to deny-list.** `scanRaum()` today returns four
   selectors the spike author remembered. It becomes `document.body` **minus** `[data-pruefstand]`,
   with that one exclusion **written into the gate definition** — the exact rule the champion already
   imposed on die Goldene Signatur (§6.6: *„exclusions written into the gate definition; the test
   bench excludes itself; nothing else by default"*). A surface that did not exist when the bench was
   written is scanned by default instead of missed by default.

**New `oracles.yaml` rows:** `live_region` (owner: the projection module; test: for every role, every
announcement-producing action, assert the serialised AX tree contains no needle from
`verbotenesGut(role)`).

**New Leak Bench fixture, seeded red:** *die Ansage-Probe.* Walk `?rolle=beobachter` and
`?rolle=spieler&sitz=brannt`, fire seat change, ratification, reveal, search and error; assert zero.
FATAL 1's exact string is fixture #1, the way round 2's eight leak sites became fixtures 1–8.

**Why it is sensible now, not later.** §9.4 already stakes the candidate on the leak rate; the round-3
instrument measured the rate and the measurement was bad. The instrument has to be fixed before the
next measurement means anything, and the fix is a lint plus an inverted scan — three days, not a
project.

**Invariants.** Invariant 1: the boundary moves from client discipline to the projector, which is
server-side. Invariant 8: the accessibility tree stops being a second, unguarded channel — it becomes
the *same* channel, which is what „accessibility is architecture" was supposed to mean.

**Cost: medium.** (Lint and scan inversion are small; server-composed announcements touch every
announcement site in the product.)

---

### F2 · Der einäugige Client — a reader's runtime cannot hold a second projection

**Answers:** FATAL 2(a) (`entfallen = absatzZahl(projektion('sl')) − absatzZahl(projektion(sitz))`
rendered in Brannt's own page header, and on the Twitch overlay).

**What it is, concretely.**

That subtraction is only *writable* because `projektion()` takes a seat argument and lives on the
client. Remove the argument and the bug is unrepresentable — the champion's own doctrine
(§6.4, *unrepresentability, not policy*) applied one layer up from where he applied it.

- **The player client's function is `sicht()`. It takes no arguments.** It returns the one tree the
  server sent. There is no seat parameter, no viewer parameter, no complement, no second call.
- **The projector never ships in a non-GM bundle.** A build gate asserts the player entry point's
  module graph does not reach the projection package — the dependency-cruiser rule already exists
  (§6.3); this adds one direction to it.
- **Die Sichtbrille — „Aus Sicht" — is a server round trip that returns a whole new `Sicht`,** and the
  route is gated on the `sichtbrille` capability. A player who forges the request gets **404, not
  403**, with the same body and the same timing (champion §6.4, inherited unchanged).
- **The Beobachter/stream seat is a seat like any other:** it receives one `Sicht`, computed
  server-side, with `autoren: []` by construction rather than by a post-filter.

**Why it is sensible now.** It costs nothing to build — it is a smaller client, not a bigger one — and
it is the only fix that survives a new developer joining in month nine. Every other fix to FATAL 2 is
a rule someone has to remember.

**Invariants.** Invariant 1 directly. It also makes A2's excellent `naiv` mode *safer*: the naive
renderer becomes a GM-only diagnostic that renders the GM's own two Sichten side by side, which is
exactly where a comparison belongs.

**Cost: small.**

---

### F3 · Die Differenzkarte — the counted absence exists exactly once, and it is GM apparatus

**Answers:** FATAL 2(b) (A1's `Anträge: 1 offen` inside `<article class="blatt">`, which flips to
`0 offen` on Vesper's page after a ratification she was excluded from — the one-bit channel), and
half of MAJOR 10.

**What it is, concretely.**

The GM genuinely needs *„what does Brannt not have?"* — it is the prep engine's best row. So the
number is not deleted; it is **relocated into a type that cannot be serialised to a player.**

```text
NurLeitung<T>            -- a wrapper with no encoder instance for the player payload codec
Differenzkarte = NurLeitung<{
  leser, eintrag,
  fehlend: [{ pid, grund: NichtDabei | Abwesend | AnwesendKeinZeuge | NieEnthuellt,
              autorschaft }] }>
```

- The `grund` sum is the champion's existing Gap Card closed sum (§6.6 rule 3), **plus** Der
  Konvent's one addition: `autorschaft`, so the GM sees *„Brannt fehlen 5 · davon 2 von Sera."*
- **It lives in der Rand, never on the stage.** `03-triumph-ui-direction.md`'s zone rule already
  separates apparatus from document; §8 already places the Session Diff in der Rand. A1 put it on the
  stage. That is now a layout *lint*: no node whose type is `NurLeitung<_>` may be mounted inside
  `#buehne`, checked in CI by rendering every role and asserting the stage subtree's node types.
- **Die Nennerregel, promoted from prose to type.** The player `Sicht` node has exactly one numeric
  field: `ordinal`, and ordinals are **re-assigned per projection** so no gap is countable (A1
  already does this correctly at line 1807 — it is the best line in the round; make it the rule).
  Every other number on a player surface must carry `data-herkunft` naming the array it folds, and a
  generic property test asserts the derivation's length equals the number (see F14).
- **Anträge are not counted on the stage at all.** A pending Antrag renders as a **marker beside its
  anchor**, and only for (a) its author and (b) whoever the constitution names as ratifier. Vesper
  neither authored it nor may ratify it, so her `Sicht` contains no Antrag node — no counter to flip,
  no bit to leak.

**New `oracles.yaml` rows:** `differenzkarte`, `sitzungsspiegel`, `sammlungsschiene`, `autorenliste`
— the three Nemesis named plus the card itself.

**Why it is sensible now.** Two independently built artifacts placed a cross-projection count on the
reader's page. That is a shape, not a slip, and shapes are fixed by moving the type, not by review.

**Invariants.** 1 and 6: the GM's number *can* show its derivation, because she is entitled to every
term in it — which is invariant 6's exact wording and the reason this card is legal and the player's
counter is not.

**Cost: medium.**

---

### F4 · Der Briefkasten — asynchronous authoring without a world that has to be awake

**Answers:** FATAL 3 (a one-time licence cannot fund perpetual availability; the candidate
simultaneously requires hosting, adopts Owlbear's subscription and inherits RB-11's one-time licence;
and 68.35 % of the analogous market self-hosts, i.e. the thesis is switched off for the majority).

**The mistake being corrected, named plainly.** §7 converted the hosted room into a requirement
because it believed asynchronous authoring needs *the world* to answer on Wednesday. It does not. It
needs **a letterbox** to answer. The world is large, stateful, expensive and only needed when someone
is reading it. The letterbox is small, stateless and needed always. Der Konvent conflated them and
priced the wrong one.

**What it is, concretely.**

The runtime splits into two deployables with a hard boundary:

| | **Die Welt** | **Der Briefkasten** |
|---|---|---|
| Holds | canon, projections, revelations, maps, assets, sessions | an append-only queue of small opaque blobs, per campaign |
| Knows | everything | nothing — it cannot read a blob's contents |
| Runs | when someone is using it (hosted room **or** the GM's Electron host) | always |
| Costs | sockets + CPU + storage | ~1 KB per note, capped |

- **A Feldnotiz written on Wednesday is written against the player's local Kodex** (IndexedDB;
  service worker where the context is secure). It is *hers immediately* — §3.1's promise, now true
  offline. Pressing `Alt+A` posts **one blob** to the Briefkasten and shows an honest receipt:
  *„Zugestellt. Kaya hat den Konvent zuletzt am Sonntag geöffnet."*
- **The blob is opaque to us.** It is encrypted with a campaign key held by the world, so the
  letterbox is a dumb spool and not a second copy of the campaign. That also disposes of the
  „resident world, backups, support surface" cost Nemesis correctly priced: there is no resident
  world.
- **When the world wakes** — the GM opens the app to prep, or her Electron host boots — it drains the
  spool, decrypts, and the Anträge appear in der Rand beside their anchors. The anchor claim is
  resolved through the champion's existing `resolve()` (§5.5, *lineage moves the pointer, never the
  words*), so a note anchored to a pid that has since been split lands on the surviving child with a
  margin line, exactly like a pinned read.
- **`BriefkastenPort`, three implementations, from commit 1:** (a) **our hosted spool, included with
  the licence** — no subscription, because it costs almost nothing; (b) **BYO** — any S3-compatible
  bucket or WebDAV endpoint the GM already pays for; (c) **keiner** — LAN-only; notes spool locally
  and sync when the author and the world are on the same network. Mode (c) is degraded, not broken:
  the notes still exist, they are still hers, they arrive Saturday.

**The number, in the unit RB-11 demanded — per campaign-month, not per session-hour.**

Inputs shown, none of them a vendor quote. Cap: 200 items / 2 MB per campaign. Realistic steady state
at §7's own optimistic rate (20 notes/week): ~20 KB/week spooled, drained weekly, so the resident
footprint is **≈ 20 KB, not 2 MB**. Object storage at ~€0.02/GB-month ⇒ **≈ €0.0000004 per
campaign-month** of storage. Requests: 20 PUTs + ~4 drains/week ⇒ ~100 requests/month ⇒ at
~€0.4/million requests, **≈ €0.00004 per campaign-month**. Round both up by 100× for metadata,
logging and slack: **< €0.01 per campaign-month.**

Against RB-11's ratified €40 one-time licence at ~78 % net = **€31.20**, a five-year campaign
(60 months) consumes **< €0.60** of letterbox — under 2 % of gross margin, with the remaining
€30.60 available for the play-time hosted room (§7's inherited < €0.01 per session-hour), payment
fees, and support. **The tail is funded, and the arithmetic is in the unit the charge was written in.**

**What this deletes from the candidate.** §7's sentence *„Wer nur im LAN hostet, bekommt das
Skriptorium"* is struck. It becomes:

> **Wer nur im LAN hostet, bekommt den Konvent mit Zustellverzögerung.**

The 68.35 % Electron majority get the thesis. §9.1's falsifier becomes measurable in the population
that actually exists.

**And §5's Owlbear sentence is reconciled rather than deleted.** We adopt Owlbear's *shape* — charge
for storage and rooms, never for features — but as an **optional convenience tier above the one-time
licence**, not as the base model. The base licence buys the application, the Briefkasten and BYO
everything. A GM who wants us to hold her 8 GB of maps and keep a room resident can pay us monthly
for storage; no feature is behind it, and **no player ever buys anything** (RB-11, untouched). The
three things Nemesis said cannot coexist now coexist because the middle one changed rank: the
perpetual requirement is gone, the subscription is optional, the licence is the base.

**The one thing that remains Kaya's call and not mine:** whether we offer the storage tier at all.
The candidate is fundable without it.

**Invariants.** Invariant 1 holds: `geltung` transitions and ratification remain server-authoritative;
an offline note can be *written* and cannot be *ratified*, which was always true and is now the only
remaining restriction rather than a product-shaped hole. Invariant 2: the spool carries data, never
code.

**Cost: medium.** (A queue endpoint, a port with three impls, local-first writes for one narrow object
type. The offline *editor* stays out of scope — see F7, which is what makes this cheap.)

---

## Part II — The nine majors

### F5 · Der zweite Griff und die Rücknahme — nothing publishes another person's sentence by timeout

**Answers:** MAJOR 4 (A1's 4-second ring commits on silence; A2's `Alt+K` commits with no dialog at
all; there is no un-ratify; §3.2's own rule *„Schweigen veröffentlicht nie"* is violated by the
implementation of §3.3).

**What it is, concretely.**

1. **The timer is inverted.** For a ratification of *another person's* passage, the sheet's timer
   **closes without publishing** at 10 s. Focus starts on `[Abbrechen]` (A1 already does this
   correctly — line 1966 — and then betrays it with a commit timer). Commit is a second deliberate
   act: `Enter` on the focused `[Ratifizieren]`, or `Alt+K` pressed a second time. Two keys total,
   which is still the fastest ratification in any product, because every other product has zero.
2. **One-key stays where it is safe.** `Alt+K` on an Antrag the GM authored herself commits directly.
   The distinction is `autorschaft == Mitglied(self)` — a comparison, not a policy.
3. **Die Rücknahme — a real, bounded un-ratify.** For **120 seconds** after commit, or until the next
   ratification in the same session, `Ctrl+Z` in der Rand writes an append-only `Ratifikation` row
   with `ergebnis: zurueckgenommen`. The passage's `geltung` reverts to `antrag`, the Revelations
   granted by that ratify event are revoked, and the paragraph leaves every holder's projection.
   Append-only is preserved: nothing is deleted, a compensating event is written, and lineage shows
   both.
4. **The dialog states the residue at the moment it matters,** not in a weakness section: *„Sera und
   Brannt haben den Absatz bereits geladen. Die Rücknahme entfernt ihn aus ihren Büchern — gelesen
   haben sie ihn vielleicht."* The server knows who loaded it, because `Sicht` delivery is acked.

**Why 120 seconds and not unbounded.** An unbounded un-publish is a rewrite-history feature and it
poisons the byline's truth claim, which is the whole product. The window covers the cat, the misfire
and the misread. It does not cover regret, and it is not supposed to.

**Invariants.** Invariant 4's logic — *nothing irreversible without an explicit human confirmation* —
is now applied to a player's authorship as well as to a monster's hit points, which is Nemesis's exact
demand. Invariant 1: revocation is a server act.

**Cost: medium.** (The sheet change is small; revelation revocation is medium — but it must exist
anyway for `Verfassung.austritt: wird_zurueckgezogen`, so it is a cost the candidate already owed.)

---

### F6 · Der Nachzügler — attendance is a span, and delivery is a standing rule

**Answers:** MAJOR 5 (the late joiner is silently and permanently excluded; der Konventspiegel then
manufactures a scene out of the resulting hole; and §3.3 says „present" without saying which of
`02-domain-model.md`'s three presences it means).

**What it is, concretely.**

1. **The definition is picked, in writing: `granted_via: ratifikation` pre-selects by *attendance*,
   not by connection.** `SessionAttendance(actor_id, session_id, joined_at, left_at NULL)` is a span.
   A socket that drops at 21:14 and returns at 21:18 does not change attendance; leaving the session
   does. This is the side Nemesis said we must pick, and it is the right side: attendance is what the
   *fiction* means by „was in the room".
2. **Die Nachzügler-Zeile.** When an attendance span **opens** during a live session, the server
   computes the `ratifikation` grants made since session start that this actor did not receive, and
   emits **one row into der Rand**: *„Brannt ist um 21:20 dazugekommen · 1 Ratifikation seit
   Sitzungsbeginn · [zustellen] [zurückhalten]."* Default **`zurückhalten`** — the champion's
   recipient-grid default (§5.5), inherited unchanged, because sometimes the late player's character
   genuinely was not there.
3. **The hole becomes visible to the one person who can fix it.** `NichtDabei` is already a
   constructor of the Gap Card sum (F3); this is the case it was written for and Der Konvent forgot
   to route into it.
4. **Und der Riss wird entgiftet.** §3.4's symmetric difference is computed over held sets
   **excluding** passages whose non-holding reason is `NichtDabei` or `Abwesend`. Der Riss must
   measure *disagreement*, not *attendance*. It is a `WHERE` clause on a join that already exists, and
   it turns §3.4 from a claim into a true one.

**Why it is sensible now.** §3.4 is the candidate's prep engine and its second-best idea. Shipping it
on top of an attendance artefact would produce a wrong scene in month one — and, because the
projection is correctly total, an *unfindable* wrong scene. One `WHERE` clause and one Rand row.

**Invariants.** Invariant 1: delivery stays a GM act on the server. Invariant 6: the Riss row's
`<details>` derivation (which A1 already ships, lines 1747–1770) now prints the exclusion, so the
number shows its own reasoning.

**Cost: small.**

---

### F7 · Die Notiz ist kein Eingriff — a Feldnotiz never touches the spine

**Answers:** MAJOR 6 (a Feldnotiz *is* a structural op, so §4.1's „structural steps are rare"
measurement is imported from the wrong workload; the free on-ramp keystroke is a 600 ms round trip
that can 409; and §4.4's falsifier is written for the champion's problem, not this candidate's).

**This is the mēden agan feature: it removes machinery rather than adding it.**

**What it is, concretely.**

A Passage with `geltung ∈ notiz | antrag` **is not in the Entry's spine.**

```text
Passage … ord NULL              -- notes and Anträge have no ordinal
          anker_anspruch (pid, gen) NULL   -- a CLAIM on an anchor, not a structural relation
```

- **Creating, editing and submitting a note carry no `base_entry_seq`, cannot return
  `409 STALE_SPINE`, and never rebase.** She is its only author; nobody contends for it; it is in no
  one's document. It is a plain insert.
- **Only `Alt+K` is structural.** Ratification is the single operation that assigns an ordinal and
  takes the server sequence — one op, pressed by the GM, on her connection, at her leisure. The 21:31
  scenario evaporates: Brannt's `Alt+A` cannot collide with Kaya's Enter, because it claims no parent
  in the spine.
- **The claim is resolved at ratification time** through `resolve()` (champion §5.5). If the claimed
  pid was retired in the interim, the ratification dialog names it — *„Der Absatz, an den Brannt sich
  gehängt hat, wurde geteilt. [obere Hälfte] [untere] [freistehend]"* — to the **GM**, in prep, not to
  the player mid-scene.
- **Therefore §3.1's promise becomes literally true:** one keystroke, local write, background post, no
  server dependency at all — which is also what makes F4's Briefkasten cheap.

**The falsifier is rewritten for this candidate's workload,** which is Nemesis's actual charge:

| # | Measures | Target |
|---|---|---|
| N1 | p95 `Ctrl+Enter` → „the note is mine and in my Kodex", 600 ms RTT link | **< 150 ms** (local write) |
| N2 | Anchor-resolution collisions per 100 ratifications | **< 5**, each a named dialog, never a silent relocation |
| N3 | Rebase refusals per 4-hour **co-authoring** session (champion's number, kept where it belongs) | **≤ 2** |
| N4 | Umbettung straddle cases per session | **≤ 1** |

N1 and N2 are new and measurable in the Briefkasten spike; N3 and N4 move to slice 1.5 with §4 (F12).

**Invariants.** Invariant 1 untouched (submission and ratification remain server acts). Invariant 3's
sibling logic — template ≠ instance — is the same discipline applied to standing: **a note is not a
paragraph until someone says so**, and the data shape now says that instead of merely the prose.

**Cost: small, and negative in complexity.** It deletes a dependency between the on-ramp and the
sequence engine.

---

### F8 · Die Tafelvollmacht — the constitution gets a second chamber, with exactly two dials

**Answers:** MAJOR 7 (the co-GM runs the fight, the Verfassung's six dials are all about canon, §6.2
closes the door with „no other configuration surface exists", and invariant 4's `defeat_pending`
confirmation has no owner).

**What it is, concretely.**

```text
Verfassung.tafel = {
  tafel_schreiben        ∈ nur_sl | sl_und_mitleitung,             -- Zustand: hp, initiative, conditions
  niederlage_bestaetigt  ∈ nur_sl | sl_und_mitleitung | szenenleitung
}
```

- **`szenenleitung` is the interesting value and it is one field on `GameSession`:** one person at a
  time holds die Szenenleitung, set by the lead GM with one key, printed in the session header for
  everyone — *„Timo leitet die Szene."* Handing it over is one key and an `AuditEntry`. Whoever holds
  it may confirm `defeat_pending`.
- **The confirmation records who.** The `Zustand` transition to `besiegt` carries
  `bestaetigt_von_user_id`. Nemesis's precise complaint — *„nothing in the data model records the
  distinction"* — becomes a column, and the bounded undo ring (inherited) covers it.
- **§6.2's closing sentence is amended, not deleted:** *„Die Verfassung hat zwei Kammern — Kanon und
  Tafel — und keine dritte."* Two enums with closed value sets. It is still a record, not a policy
  language; invariant 2 is untouched and Nemesis's concession #2 survives intact.

**Why it is sensible now.** §10 step 9 ships the co-GM/Zustand pairing in the one-take acceptance
demo. The demo hits `defeat_pending` at 21:47. Either this dial exists or the demo stalls on camera.

**Invariants.** Invariant 4 is satisfied in spirit and in the schema: an explicit human confirmation
by a person the constitution named for that purpose, recorded.

**Cost: small.**

---

### F9 · Die fremde Hand — authorship is a value, not a foreign key

**Answers:** MAJOR 8 (an imported Passagensatz has no valid `autor_user_id`; all three of Nemesis's
options are wrong; both spikes would throw on an unknown id; and §6.5's export clearance can never be
satisfied for a foreign author, so installing a kit could permanently block the GM's own export).

**What it is, concretely.** `Passage.autor_user_id NOT NULL` is replaced by a closed sum:

```text
Autorschaft = Mitglied(user_id)                                  -- a User on this instance
            | Fremd(anzeigename, herkunft_paket_id, herkunft_autor_id)
            | Pseudonym(handle, ehemals_mitglied_hash)           -- the GDPR path, §6.5
            | Verdeckt(sl_sichtbar_user_id)                      -- see F10
            | Unbekannt(herkunft_paket_id)                       -- imported with no manifest
```

Stored as `autorschaft_art NOT NULL` plus nullable payload columns. **No byline render can throw,
because rendering is a `match` the compiler forces you to exhaust** — which is precisely the bug shape
in both spikes (`AUTOREN[p.autor]`, `PERSONEN[personId]`).

- **`felder.yaml` gains the third class Nemesis identified as missing.** `autorenklasse` says *who
  may see a byline*. The new **`identitaetsklasse ∈ lokal | fremd_erlaubt`** says *whether it resolves
  to a local identity*. The code-generated projector must handle every `Autorschaft` constructor or
  the build fails — the same gate §6.4 already imposes for the two existing classes.
- **The UI does not lie and does not put a stranger's face at the table.** A `Fremd` disc is
  **outlined, not filled**, carries no avatar, and reads *„aus dem Paket ‚Hafenstadt Sarn' · Sera M. ·
  nicht an diesem Tisch."* The Autorenleiste renders local authors first and imported authors in a
  second, labelled group: *„Aus Paketen: 4 Namen."*
- **And that group *may* carry a count — this is the one place a count is legal, and the rule is
  stated so it cannot creep.** Imported authorship is **package metadata that shipped in a file**; it
  is public by construction and is not a projection of withheld content. The rule in `oracles.yaml`:
  *a count is legal iff its complement is already in the reader's possession.* Package manifests
  qualify. Nothing else in the product does.
- **§6.5's export lock unlocks.** Clearance is required for `Mitglied` passages only. `Fremd` passages
  carry the upstream licence forward over the existing `derived_from` edge `(paket_id, index,
  version)`; clearance was granted once by the package's publisher and travels in `zuschreibung.json`.
  The GM can always export her own campaign — which is the argument §5 uses against Roll20 and which
  MAJOR 8 had quietly killed.

**Invariants.** Invariant 7 (provenance is tracked) is strengthened: provenance now has a type instead
of a convention. Invariant 6: the byline's derivation is the manifest row.

**Cost: medium.**

---

### F10 · Die Konventsscheibe — anonymity is an authorship, and the seal is uniform

**Answers:** MAJOR 9 (ratifying an anonymous Antrag either publishes the identity the boolean was
created to withhold, or leaves a discless hole that is the loudest possible signal; and structurally, a
per-column `autorenklasse` cannot express a per-row `anonym` flag).

**What it is, concretely.** The structural problem dissolves inside F9's sum type: **anonymity stops
being a per-row boolean on `Ratifikation` and becomes a per-row *value* of the authorship column** —
`Verdeckt(sl_sichtbar_user_id)`. The per-column class then governs it uniformly, because there is
nothing exceptional left to express.

- **`Verdeckt` projects to a byline for the lead GM alone, and to a uniform disc for everyone else.**
- **The hole is filled by traffic, not by hiding.** This is the champion's own Sealed Trace doctrine
  (§6.5: *„the seal is uniform … so privacy stops being the signal"*), reused verbatim: passages whose
  authorship is `Verdeckt` **and** passages the GM ratifies from her own notes both render **die
  Konventsscheibe** — the table's own sigil. The bucket has ordinary traffic in it by construction, so
  a Konventsscheibe paragraph is not a signal.
- **The ratify path gets its branch, as a required act, not a countdown.** The sheet shows a red line:
  *„Dieser Antrag ist anonym eingereicht. Nach der Ratifikation trägt der Absatz die Konventsscheibe,
  nicht Vespers Scheibe."* A checkbox, not a timer (F5).
- **New constitution dial: `anonyme_antraege ∈ aus | an`, default `aus`.** When off, the option never
  appears and there is no bucket to explain.
- **`Ratifikation.anonym` is deleted.** One boolean removed, one enum constructor added, and the
  enforcement architecture can now see it.

**Invariants.** Invariant 1: the distinction is enforced in the projector, not the client. The residue
— that this is social, not cryptographic anonymity, and in a small campaign the bucket may be thin —
is real and is in the unanswerable list.

**Cost: small, given F9.**

---

### F11 · Die eigene Zahl und die Orakelprobe — the Library counts only what the reader holds

**Answers:** MAJOR 10 (die Autorenliste is a seventh oracle the enumeration missed; A2's
`renderSammlung()` `.concat(p.verwandte)` ships per-entry paragraph volumes verbatim to every seat
under a footnote claiming the opposite; and at 2,000 entries the rail is 2,000 unvirtualised small
oracles re-rendered on every keystroke).

**What it is, concretely.**

1. **Every per-entry number in the Sammlung is the reader's own number.** Not a static list field. To
   make that affordable at 2,000 entries, the server maintains
   `LeserEintragsZahl(viewer_id, entry_id, n)`, updated on revelation grant and revoke — rows the
   projector already touches on exactly those two events. The rail is **windowed (~40 rows)** and
   search on player surfaces is a server round trip, which `CHAMPION.md` §6.2 already priced as the
   named cost of `Sicht`. Nothing new is being bought here; something is being *stopped* from being
   free.
2. **Die Autorenliste is per-Entry and reader-relative. The per-campaign figure does not exist in a
   player `Sicht`** — there is no field for it. For the GM it is a column on die Differenzkarte (F3).
   *„Sera hat in dieser Kampagne 40 geschrieben"* is unwritable, not forbidden.
3. **Die Orakelprobe — the completeness gate, which is the actual fix.** „The enumeration missed one"
   is not repaired by adding one; it is repaired by making the enumeration checkable. CI walks every
   module that emits a reader-facing surface — the dependency-cruiser rule in §6.3 already knows which
   those are — and **asserts every rendering entry point is named in `oracles.yaml`**. An unlisted
   surface fails the build. That converts *„did we remember?"* from a review question into a compiler
   question, which is the doctrine this candidate claims and did not apply to itself.

**Invariants.** 1 and 8. And invariant 6, since the reader's own count folds an array the reader
possesses.

**Cost: medium.**

---

### F12 · Slice 1 halbiert — the photograph ships; the concurrency engine becomes a spike

**Answers:** MAJOR 11 (slice 1 is the whole vision with four small things cut; its central delta is
the one item §9.3 says has no correct answer and three rounds have not spiked; §4's falsifiers are
marked „Status: unbuilt"), and it is the precondition for MAJOR 12.

**This is a cut, and it is the most important item in this document.**

**Slice 1 becomes „Der ratifizierte Absatz" — two humans, one writer at a time.**

Cut from slice 1, in full: **`Binnentext` (the CRDT) · `entry_seq` / `base_entry_seq` /
`409 STALE_SPINE` / the client rebase engine · die Umbettung · der Strukturbrief · die Mitleitung ·
the co-GM.** All of §4.

**Why this is not cowardice, and why §4 is not being abandoned.** §4 is good architecture — Nemesis
attacked it and conceded it (her point 5). But it is a *replacement* for the champion's single-writer
lock per Entry, and **the lock works.** Shipping the lock in slice 1 costs nothing and delays nothing,
because §4's own falsifiers are unbuilt and its hardest edge is unmeasured. And decisively:

> **The flex does not need two simultaneous typists.** *„Sie hat das geschrieben. Und er darf es nicht
> lesen"* needs one ratified note and two seats. §2 says so in its own words: *„The champion needed a
> campaign with history for its merge blocker; this needs one ratified note and two seats."*

Slice 1 therefore keeps: `geltung` · `Autorschaft` (F9) · `Feldnotiz` → `Antrag` → `Alt+K` with the
second grip (F5) · `Verfassung` (two presets, radio, no editor) · die Autorenleiste · die Antragsspur
· die Differenzkarte · the new `oracles.yaml` rows · the second and third classes in `felder.yaml` ·
the Leak Bench fixtures · the combat strip with `defeat_pending` and undo · Foundry + Obsidian import
· `.chronicle` round trip with empty diff.

**Slice 1.5 — „Zwei Hände" — is a *spike*, not a slice, and it is scoped by its own measurement.** Two
real writers, a real editor, real structural operations, and a measured Umbettung straddle rate
against N3/N4 (F7). Nemesis's requirement #6 is *„§4 must be spiked before slice 1 is scoped"*; we
agree so completely that we take it out of slice 1 rather than promise to spike it in time.

**Restored to slice 1 with the money saved** — and these are not consolation prizes, they are the two
things §9.1's survival depends on:

- **die Randfrage** (the champion's lower-effort on-ramp, which §9.1 names as a mitigation and §10 cut
  — cutting your own mitigation for your own mortal weakness is not a trade, it is an error);
- **the seeded geteilte Infobox onboarding flow** — §2's *second still*, the newcomer's photograph,
  the one that needs no history;
- **der Feldbau** (F13).

**Cost: small — it is a cut.** It reduces slice 1 by an unpriced CRDT on an unpriced contenteditable
surface, which is the largest single risk in the candidate.

---

### F13 · Die Probetafel und der Feldbau — one person can reach the product on a Tuesday

**Answers:** MAJOR 12 (the proof needs four humans and the ratified go-to-market needs one; and §10
cuts the rule-builder, which RB-11 names as the channel itself, with no carve-out — while correctly
carving out the importers).

**What it is, concretely — two parts.**

**(a) Die Probetafel — the solo evaluation path, which we have already built twice.** A seeded demo
campaign shipped as first-run content: one Entry with eleven paragraphs, four named seats, one pending
Antrag, one Streitfall, and a „zeig mir die Bytes" panel. The evaluator occupies the seats in sequence
with die Sichtbrille and reaches the flex **alone, in under five minutes, and photographs it.**

This is not new architecture. **`spike-A2.html` is this feature**, minus its leaks. The round already
produced the demo; it simply has not been recognised as a shipping artifact. Fixture data plus the
dial the GM already has.

Combined with F12's drop to two humans, slice 1's minimum configuration is **one** for evaluation and
**two** for the full loop.

**(b) Der Feldbau — the smallest true rule-builder, in slice 1.** §10 applied exactly the right
distinction to the importers (*„launch-blocking, not slice-blocking"*) and the wrong one to the
instrument RB-11 named as the go-to-market. The carve-out is not the whole Forge; it is one form:

- a GUI that defines an Actor's **fields** — name, type, default, and a derived value with a **live
  derivation trace** (invariant 6, which Alchemy's builder explicitly does not have, and which §5
  names as the axis on which we must be *deeper, not prettier*);
- output is a **declarative package** (invariant 2 — no scripting, by construction);
- **no** sheet-layout editor, **no** node graph, **no** dice actions, **no** WFC, **no** theme editor.

It is screenshottable, it is what a system author evaluates, it is the seed of K2, and it is the only
Forge surface in slice 1.

**Invariants.** 2 (declarative only), 6 (the trace is the point), 10 (it ships with validation, error
states and tests or it does not ship).

**Cost: medium** (der Feldbau) **+ small** (die Probetafel).

---

## Part III — The two minors

### F14 · Die Prüfung prüft die Auslieferung — checks measure what ships, not what the author remembered

**Answers:** MINOR 13 (A2's Darstellung selectors are a closed set of the spike author's own chrome;
`body { overflow-x: hidden }` suppresses the very symptom the „0 px" row stands proxy for; A1's leak
needles are typed literals and its Sera row is coloured `gruen = (sera === 0)`, so a correct
projection shows red) and MINOR 14 (the Autorenzeile counts `b.autor` and misses `konten[].autor`, so
the number contradicts the page; `absatzZahl()` reports 6 while 7 blocks render).

**Four changes, all small, all generic.**

1. **Darstellung inverts to a deny-list**, like the Leak Bench in F1: measure **every** text-bearing
   element inside the stage, exclude only `[data-pruefstand]`. A surface added next month is measured
   by default.
2. **`overflow-x: hidden` on `body`, `html` or the stage root is forbidden by lint.** Wide content
   scrolls inside its own `overflow-x: auto` container, so the symptom is visible and the check can go
   red — which is the only property that makes a check worth having.
3. **The Lange-Labels axis is fed from package content, not chrome.** Every fixture package ships a
   `stress` variant with a 90-character compound in the infobox value, the article title and the
   figure caption — *„Verbleib der Aufzeichnungen im Kapitelhausschlüsselträgerverzeichnis"* is
   fixture text, not an attacker's hypothetical. Test and check stop being the same closed set.
4. **Die Herkunftsprobe — one gate for every number in the product.** Every rendered number carries
   `data-zahl` and `data-herkunft` naming the collection it folds; a generic property test expands
   each derivation and asserts `length === value`. The byline count is then computed by the *same*
   fold that produced the rendered blocks (one function handling `streitfall` via `konten[]`), because
   any other implementation fails the gate. **Invariant 6 stops being a principle and becomes a
   test** — and it catches MINOR 14's class permanently rather than MINOR 14's instance once.
5. Leak needles are **derived, never literal** (A2 already does this correctly; A1 is the
   counter-example), and a row is green iff `treffer === 0`, never iff a name is absent.

**Cost: small.**

---

## Part IV — Beyond defence: three features that are not answers

These are not repairs. They exploit the Wiki+Table fusion in ways that require **per-passage
authorship + per-character readership + a live session** simultaneously — which is to say, no product
in RB-01 can copy them without rebuilding its data model. All three are cheap, and all three happen to
attack §9.1, the mortal bet, from the only angle that can move it: **giving a player's own writing a
use at the table.**

### F15 · Die Berufung — the player cites her own paragraph as an argument, mid-scene

**New capability.**

**What it is.** In a live session, a player selects any passage she holds in her Kodex and presses one
key. It arrives in the GM's Rand as a citation card:

> *„Sera beruft sich auf: ‚Der Ring gehörte seiner Schwester.' · Sitzung 12 · geschrieben von Sera ·
> **Brannt und Vesper halten diesen Absatz nicht.**"*

That last clause is die Differenzkarte (F3) doing the one job only it may do, at the one moment it is
worth the most: the GM learns instantly that the table's knowledge is asymmetric on the thing a player
just invoked, and can play it — *„Brannt, du hörst Sera etwas sagen, von dem du noch nie gehört
hast."*

**Why no competitor can copy it.** It requires an object smaller than a page (Foundry cannot),
per-character read state on that object (Roll20 cannot), authorship on it (nobody has), and a live
session to deliver into (Obsidian, World Anvil and LegendKeeper cannot). It is the four load-bearing
layers in one keystroke.

**Why it earns its place tonight.** §9.1 is the candidate's mortal weakness and its mitigations are,
by its own admission, „honest and weak". Every one of them is about making writing *cheap*. None is
about making writing *pay*. Die Berufung is the first thing in the product that makes a player's own
paragraph **do something at the table**, which is the only durable reason anyone ever writes anything.

**Cost: small.** One action, one Rand channel, one Differenzkarte query — all three exist.

**Invariants.** 1 (the citation is projected: the GM sees the holder analysis; the player sees only
that it was sent). 6 (the card shows its derivation).

---

### F16 · Die offene Stelle — the page you cannot read is the page you are invited to write

**New capability.**

**What it is.** Every Entry a reader can navigate to carries, at the foot of the article, the same
invitation — **uniformly, whether she holds eleven paragraphs of it or none**:

> *„Was weiß deine Figur über ‚Der Pfandleiher am Sattelmarkt'?"*  `[Feldnotiz schreiben]`

She types one line; it becomes a Feldnotiz anchored to the Entry. The on-ramp is placed exactly where
her curiosity already is — on a red link she just followed, or on a page that is thin because it is
thin *or* because it is withheld, and **she cannot tell which, because the invitation is identical
either way.**

**Why the uniformity is the design, not the decoration.** A prompt shown only on sparse pages would be
a first-class oracle: *„this page has more on it than you can see."* Shown on every reachable page it
is information-free. Entries a reader may not know exist still return **404, never 403** (champion
§6.4, unchanged), so the reachable set itself leaks nothing. **A permission-correct feature and a
growth feature turn out to be the same feature** — which is the sort of thing that only happens when
the permission model is the architecture rather than a filter.

**Why no competitor can copy it.** Every rival's empty page is empty because nothing was written.
Ours is ambiguous by construction, and the ambiguity is what makes the invitation safe to show
everywhere.

**Why it earns its place tonight.** It is the cheapest possible answer to *„die Spieler schreiben
nicht"* — a writing surface at the end of every article the player already opened — and it costs one
component and one fixture.

**Cost: small.**

**Invariants.** 1 and 8 (it is a `Sicht` node, keyboard-reachable, in the reading order).

---

### F17 · Die Klärung — the wiki's unresolved argument becomes a scene, and the scene writes back

**New capability, completing §3.5.**

**What it is.** A Streitfall (two ratified, contradictory accounts by different authors, both canon,
rendered side by side) currently has no exit. That was deliberate — *„not deciding is a supported
state with a name"* — and it is right. But a table that plays for five years will eventually **settle
one at the table**, and today the product has no word for that either.

Die Klärung is one action in der Rand, available only **during a live session**:

- the GM picks the surviving Fassung; one key;
- the loser is marked **`widerlegt`** — *not* `supersedes` (champion §8.3, the distinction is load-
  bearing): the world contradicted a claim; nobody's paragraph was deleted and nobody's byline was
  removed;
- the survivor gains a stamp: *„bestätigt in Sitzung 19"*, with **the session, the scene and the
  characters who were present** on it;
- the article renders the survivor in the prose and the refuted account as a marginal
  *„strittig bis Sitzung 19"* — for the readers who hold it; for everyone else it was never there;
- der Konventsband (§11.1) prints both accounts and the resolution in the appendix, which is the most
  beautiful page in the book.

**Why no competitor can copy it.** Fandom cannot hold two contradictory canonical accounts at all.
Foundry cannot attribute either one. And none of them can make the *table's* outcome the thing that
resolves the *wiki's* disagreement, with the resolution scoped to who was in the room — that is
literally both halves of the product, in one keystroke, in both directions.

**Why it earns its place tonight.** §3.4 turns disagreement into prep; §3.5 lets the canon hold it;
without §17 the loop never closes and Streitfälle accumulate forever. It also produces the round's
best sentence for the demo: *„Der Tisch hat entschieden, und die Enzyklopädie weiß, wer dabei war."*

**Cost: small.** One action over rows that already exist, one stamp, one render recipe already built
in A2.

---

## Part V — What gets killed

Three cuts, beyond F12's halving of slice 1. Every round that only adds is a round that made the
product harder to ship.

### K1 · Die Freie Stadt, and `was_wird_kanon: selbstkanon_im_eigenbereich` — **the main kill**

§9.6 says it in the candidate's own words: it is *„a gesture at that segment, not an answer to it"*,
for a segment that needs *„roles, bans, rate limits, revert wars and an appeals path we will not
build"*, and for which **we have no evidence.**

A preset that ships knowingly inadequate support for open-table West Marches is worse than no preset:
it invites exactly the users the product will fail, and it does so under a name that promises the
opposite.

And the enum value is the real cost. `selbstkanon_im_eigenbereich` is **canon with no ratifier** — a
second, entirely separate canon path, with its own permission composition, its own audit shape, its
own conflict semantics and its own Leak Bench matrix, **inside the product whose thesis is
ratification.** Deleting it removes a whole code path, not a radio button.

**Two presets ship: `Die Kanzlei` and `Der Konvent`.** `was_wird_kanon ∈ nur_sl_ratifiziert |
mitleitung_ratifiziert`. Everything ratifies.

### K2 · `Verfassung.nachfolge: konvent(mehrheit, karenz_tage)`

§11.3 is charming and its enum has three values. `keine` is free. `benannt(user_id)` is one field, one
transfer action and answers *„what if you disappear?"* completely. `konvent(mehrheit, karenz_tage)`
is a **majority vote** with an inactivity detector, a quorum rule, a grace period, a tie rule and —
inevitably — an appeals surface, i.e. the exact governance machinery K1 just refused to build, in the
one part of the product nobody will exercise until year three.

**Kill `konvent`. Keep `keine | benannt`.** §11.3's claim — *„answers the most common way a five-year
campaign dies, with one enum, one timer and zero new UI"* — remains true of `benannt` and was never
true of `konvent`.

### K3 · Die per-campaign Autorenliste

Folded into F11 and stated here so it is not lost: *„Sera hat in dieser Kampagne 40 Absätze
geschrieben"* is deleted from every player surface. It is the aggregate oracle, it was never in
`oracles.yaml`, and the GM keeps it as a Differenzkarte column. **The feature that was going to sell
the Fandom half was scaling its leak surface linearly with the corpus.**

---

## Part VI — Unanswerable within this candidate's thesis

Four residues. Each is stated because a fake fix is worse than an admission.

1. **A `Fremd` author's name can appear in a private instance we cannot reach.** F9 makes imported
   authorship representable and honest, but a takedown or erasure request from someone who authored a
   passage inside a package now installed on ten thousand private servers reaches nobody. The upstream
   publisher warrants consent at publish time and we cannot verify it. This is the champion's §16.11
   residue multiplied by the number of authors, and F9 makes it *visible* rather than solved. Any
   product that lets people ship other people's writing has this; ours has it on a smaller object,
   which makes it more frequent, not different.

2. **Anonymity is subtractable in a thin campaign.** F10's uniform Konventsscheibe works because the
   bucket has ordinary traffic. In a campaign where the GM ratifies little of her own and one
   anonymous Antrag lands, the bucket has one item and the table can subtract. Mitigation, not fix:
   the GM's ratify sheet prints the current bucket size before she commits — *„Diese Kampagne hat
   bisher 2 Konventsabsätze"* — so the person deciding is the person who knows. The label stays
   *social anonymity, not cryptographic*, and it is honest.

3. **§9.1's write rate cannot be measured population-neutrally, even with F4.** The Briefkasten makes
   the thesis *available* to the self-hosting majority, but a note that spools until Saturday is not
   the same product as a note that lands in ten seconds. The falsifier must therefore be reported
   **separately for hosted tables and Briefkasten-only tables**, with the sample sizes printed, and
   a hosted-only number must be labelled as not generalising. Nemesis's second-order point survives
   F4 in reduced form and we say so.

4. **The thesis is not observable by a solo evaluator, and never will be.** F13 makes the *flex*
   reachable alone in five minutes — one person, one dial, three seats, a photograph. It does not
   make *„players will write"* observable alone, because that claim is about four humans over three
   sessions and no demo can compress it. The honest split: **we sell the photograph to the individual
   and we measure the thesis at real tables.** MAJOR 12's sharpest sentence — *„the bet cannot be
   observed until four people have already committed"* — is now false about the flex and still true
   about the thesis.

---

## Net effect

**The candidate is materially stronger, and it is smaller.** Ten of the fourteen breaks are answered
by changing a type so the bug becomes unrepresentable rather than merely forbidden — the one-argument
`sicht()` (F2), the `NurLeitung<T>` wrapper (F3), the `Autorschaft` sum that absorbs both the imported
author and the anonymous one (F9, F10), the ordinal-less note that cannot collide with the spine (F7),
and the `texte.live` slot that was in the champion's own type and had never been used (F1). That is
the candidate's own doctrine — *unrepresentability, not policy* — finally applied to the surfaces the
candidate itself invented, which is precisely what §9.4 promised and what round 3's instruments failed
to do. Three of the four gates that failed (the Leak Bench's scan space, the Darstellung selectors,
the oracle enumeration) fail because they were **allow-lists written from memory**; all three invert
to deny-lists with their exclusions in the gate definition, which is the single structural lesson of
this round.

**FATAL 3 is answered by a decomposition, not by a price change**, and that is the most consequential
item here: the world and the letterbox were one deployable because nobody had asked what actually has
to be awake on Wednesday. Almost nothing does. The tail costs **< €0.01 per campaign-month against
€31.20 of one-time margin**, RB-11's licence is untouched, no player buys anything, Owlbear's
storage-and-rooms model survives as an optional tier rather than a contradiction — and the 68.35 %
who self-host get the thesis instead of the consolation product. **And it is smaller than what it
replaces:** a spool that cannot read its own contents is less software than a resident world.

**And it is a real cut.** Slice 1 loses the entire §4 concurrency engine — the CRDT, the sequence
engine, the rebase client, die Umbettung — and loses the co-GM with it; the Freie Stadt preset and
the whole no-ratifier canon path are deleted; `nachfolge: konvent` is deleted; the per-campaign
Autorenliste is deleted. What comes back is die Randfrage and the seeded onboarding flow, i.e. the two
things §9.1's survival depended on and §10 had traded away. **Slice 1 goes from four humans to two,
and from one to evaluate.** Nemesis's requirement #6 — spike §4 before scoping slice 1 — is satisfied
by not scoping it.

**Where it is still soft, honestly.**

- **§4 is now unscheduled, not merely unspiked.** Slice 1.5 has a spike and two falsifiers (N3, N4)
  and no date. The candidate's best architecture is also its least urgent, which is the correct
  ordering and an uncomfortable one — the champion's single-writer lock is genuinely load-bearing in
  slice 1 and will have to be removed later, in a live product, which is a migration nobody has
  costed.
- **`Sicht` is still grafted, unbuilt and unmeasured** (§9.4, champion §16.2) and every feature in
  Part I now sits on it — F1, F2, F3 and F11 are all *„the projector does this"*. The load on that one
  unbuilt component went up, not down. It is now unambiguously the first thing that must be built and
  the first thing that must be measured; if it does not compose, four fatal-class repairs go with it.
- **§9.1 is untouched as a bet.** F15, F16 and F17 improve the odds — they give a player's writing a
  use at the table, put a writing surface at the foot of every article, and close the loop from
  disagreement to scene to canon — but they are three good arguments against zero market evidence.
  The number that settles it is still ≥ 1 Feldnotiz per player per three sessions, and it is still
  unmeasured.
- **Die Umbettung remains unsolved and is now deferred rather than answered.** Nemesis conceded it and
  I will not manufacture what she could not find. It moves with §4 into slice 1.5 and its straddle
  rate is N4.
- **The 2,000-entry front is priced but unproven.** F11's per-reader materialised counts plus a
  windowed rail is the right architecture; the Fandom half's search performance under `Sicht` on
  player surfaces — round trips, no local index — remains, as §9.8 says, *„Fandom-grade search
  unproven"*, three rounds in.

**The photograph survived the attack, and the machinery around it has been rebuilt, halved, and made
checkable.** *„Sie hat das geschrieben. Und er darf es nicht lesen"* is now reachable by one person in
five minutes, on a page that invites her to write the next paragraph, in a product that can no longer
count her absences out loud.

> *Die Zahl am Rand ist fortgeräumt,*
> *der Brief liegt still im Kasten —*
> *und wer die Feder führen will,*
> *braucht keinen wachen Palast.*
