# CHAMPION — Die Woche

**v5 · round 4 (2026-07-27) · A over B, 19:18.5, 2–1 (the narrowest split in the lineage).**
Lineage: [`round-04/product-A.md`](round-04/product-A.md), attacked by
[`round-04/attack-A.md`](round-04/attack-A.md), hardened by
[`round-04/features-A.md`](round-04/features-A.md), grafted from
[`round-04/product-B.md`](round-04/product-B.md) + [`features-B.md`](round-04/features-B.md), ruled in
[`round-04/verdict.md`](round-04/verdict.md). Supersedes v4 (*Der Abend*), which remains readable in
git history and is **carried whole** — Die Woche is an addition to Der Abend, not a replacement of it,
as round-04/product-A.md states of itself: *"three tables, two enum values, one precondition."*
Everything v4 established is carried unless this file changes it.

This is the living spine. **The next round's forge reads this file and the verdict, nothing else.**
Where the evidence is thin it says so, in those words.

Graft marks: **[W]** round 4 *Die Woche* · **[N]** round 4 *Die erste Minute*, grafted · **[K]** round 3
*Der Konvent* · **[S]** champion v3 *Das Skriptorium* · **[Z]** round 2 *Der Zettelkasten* · **[B]**
round 1.

---

## 1. The thesis

> **Der Kanon ist der Bodensatz des Abends — und die Woche hat keinen freien Tag.**
> The canon is what the evening leaves behind. Prep shrinks to a seed; the encyclopedia is minted by
> play. **And play is not the only thing that mints it.** A mint has always required one human keypress
> (`Nichts wird automatisch Kanon`). Nothing in that invariant ever said the GM's, and nothing in it
> ever said *now*. **Two human hands, three days apart**, can complete the same gesture the table
> completes in two seconds — one writes and authorises on Saturday night, the other fires from a phone
> on Tuesday — and the die still rolls, the roll is still real, and the paragraph still lands in the
> encyclopedia with a weekday stamped on it.

Four rounds refined *how a GM writes*. Round 4 asked a question nobody had asked yet: **is Saturday the
only day canon can accrete on?** The champion's own invariant, read literally, never said so. Die Woche
is what falls out of reading it literally: a scoped, capped, revocable authorisation — die Vollmacht —
that lets a GM pre-write and pre-authorise an outcome on Saturday night, for a player to fire on
Tuesday, with no machine deciding anything in between.

**Optimised for:** everything Der Abend was optimised for (21:47 on a Saturday, session forty, the
evening as the unit of authorship) — **plus** the 1,460 hours a year the wiki is a reading surface, the
player with ten minutes on a Tuesday and nothing to do with them, and the GM whose prep for session 15
is *what the week did while she slept*.

**At the cost of, stated as costs and not as framing — Der Abend's costs, unchanged, plus four new
ones:**

- **Session one is still empty** (Der Abend, carried, §15.9). Die Woche does not fix cold start; it
  narrows the window in which cold start matters, once a campaign has a week or two behind it.
- **The long-form writer is still unserved in slice 1** (Der Abend, carried, §15.4).
- **The tactical ceiling, permanently, and now sequenced rather than merely priced.** Slice 1 ships
  **no canvas at all** — der Tisch ohne Leinwand, §7.2 — so for one slice the product looks, against
  Owlbear's twenty minutes to a table, like a wiki with dice. **K5 slips a slice and Kaya must rule on
  it** (§9.6, `OPEN-DECISIONS.md`).
- **Prep comes partly back.** Der Abend abolished prep. A Vollmacht is a sealed line written **in
  advance, for a named outcome**, at 23:41 on a Saturday. Three of them at ~90 s each is 4.5 minutes at
  the tiredest moment of the week, against a Prägerate gate that allows ≤4 min of GM chrome typing for
  the **entire session**. §15.14 is the honest version and it is the weakness this champion cannot
  cleanly fix.
- **Availability stops being optional, and identity survives the phone it was granted on.** The world
  must resolve a roll and project a `Sicht` on a Tuesday. Priced at **+8.7 % of die Raumuhr's annual
  allowance** (§14.1), and a returning player now carries **Die Wiederkehr**, a lightweight
  passwordless credential — named honestly as an account, not "no account" (§7.6, Apollon's ruling,
  round-04/verdict.md §3). This is the single largest new engineering surface this champion has ever
  carried, and it is not fully closed — §15.15.
- **The product models being wrong. It still does not model lying.** A letter can only carry passages
  its sender actually holds. Deliberate deception between player characters has no mechanical existence,
  and that is a beloved kind of play this champion continues to refuse. §15.16.

---

## 2. What is priced, what is measured, what is not

**Measured, and it survives into slice 2 unchanged [S]:** the editor. 116 SLOC identity layer,
0.087 ms/keystroke at 300 passages, three fatals found and repaired by smaller mechanisms than what they
replaced. Slice 1 deliberately still does not spend this capital.

**Priced but unspiked, and it is the champion's largest and oldest risk, unchanged for a fourth
round:** the tactical half. §9.5 decomposes it at ~120 days for one developer with an AI crew. **Nothing
in four rounds has exercised a Pixi scene graph, a tile pyramid, a KTX2 pipeline, a fog texture, a UVTT
parser, a dice AST or a perf harness.** Die Woche sequences this risk out of slice 1 rather than
reducing it (§9.2) — **the number is exactly what it was in round 3, and neither round-4 candidate spent
a single day de-risking it.** This is named as the round's honest non-achievement in
round-04/verdict.md §6 and repeated here so it cannot be missed.

**New and priced, unspiked: die Woche's own delta, ~26 days** (§9.4) — Vollmacht, Brief, der Umbruch,
die Woche's set-difference surface, die Wiederkehr's identity subsystem, der Zugangsvorfall, and der
ausstehende Wurf's idempotent roll state machine. **This is new engineering surface invented after
attack, not scoped before it**, and it is charged in full as a carried weakness (§15.15), not
absorbed silently into the total.

**Grafted, unbuilt and unmeasured for the fourth consecutive round: `Sicht`.** No artifact in the
lineage has shown server-side per-character projection. Die Woche adds **three more** projected
surfaces on top of it (`tuer_zustand`, `umbruch`, `briefwechsel`). Spike **S-P1** (two days) remains
mandatory before anything in §6 is believed, and there is no excuse left.

**Never measured: the mint rate.** Gate zero, unmoved.

**New this round, grafted [N]: Nachrechnen exists as a control, not yet as a shipped guarantee.** The
seed/AST/package-pin replay verifier is specified (§4.9) but the dice engine's determinism
requirements it needs — integer-only arithmetic, pinned RNG, locale-free formatting, cross-platform
byte equality — are not yet built. Gate **Nachgerechnet** (§12.4) is the precondition.

**Not priced at all: illustration commissioning.** *[needs a quote — no evidence base, will not invent
one]*.

---

## 3. The flexes

Four, for four audiences. The first three are Der Abend's, unchanged. The fourth is Die Woche's, and it
needs no session at all.

### 3.1 The flex — „Die Fußnote ist ein Würfelwurf, und der Würfelwurf ist eine Szene." [carried]

Kaya has **Haus Vharon** open: a crest infobox, five sections, twenty-two paragraphs, one red link
inside the infobox. Timo reads two paragraphs and asks how long she spent writing it. She presses the
provenance toggle (`Alt+Shift+H`) and a gutter opens with one chip per paragraph — most stamped with a
Saturday, a die roll, a spoken cue. **Die Saatbilanz**, computed and not typed: *"11 Zeilen gesät · 25
Absätze im Kanon · 3 getippt · 8 ausgelöst · 14 am Tisch entstanden."* A footnote opens into a full d20
derivation. **Der Augenblick** opens the map beside the article at the exact second the roll resolved.
**Four things at once, unreachable for every rival:** an addressable atom below the page, a
per-character revelation with a source, a die roll as a first-class citable durable object, and a
snapshot captured only at mint time. Full worked table, rival-by-rival unreachability and the geometry
gate (`Der Streifen`, ≤4 % `scrollHeight` growth) are unchanged — CHAMPION v4 §3.1.

### 3.2 The ninety-second acquisition still — die geteilte Infobox [Z] und die Gegenüberstellung [carried]

Each infobox row is its own passage with its own provenance. Die Gegenüberstellung: the same article
side by side for two characters, divergences marked. Works in a ninety-second-old world. Unchanged —
CHAMPION v4 §3.2.

### 3.3 The player's flex — die Berufung [K, carried]

One key, mid-scene, cites a passage a player holds into the GM's rail with the differential holder
analysis attached (`NurLeitung`). Unchanged — CHAMPION v4 §3.3.

### 3.4 The headline flex — „Der rote Link ist eine Tür." [W]

**It is a Wednesday.** No session, no four Saturdays. Kaya has her phone on a train. Timo is looking
over her shoulder.

**Beat one.** Die Saatbilanz has grown an axis: *"31 Absätze im Kanon · 14 am Tisch entstanden · 6
zwischen den Tischen."* — *„Zwischen den Tischen?"*

**Beat two.** She opens die Herkunftsschicht (the page does not change shape — `Der Streifen` still
holds). Among the Saturday chips stand three that are not Saturdays: a letter sent Monday and delivered
Wednesday with a two-day Postlaufzeit, a Vollmacht fired Tuesday at 22:41, a Vollmacht that expired
unfired Thursday morning.

**Beat three.** Footnote `[7]` opens into a full derivation:

```
1d20 = 17
  + 4   Weisheit
  + 2   du hältst 4 Passagen über Haus Vharon
  − 2   du kennst die Kanzlei nur aus Brannts Brief (Mo 18:02) — Hörensagen zählt nicht
  ───────────────────────────────────
  = 21  gegen SG 18 · Erfolg
Vollmacht v_031 · ausgestellt Sa 23:41, Sitzung 14 · verfällt zu Sitzung 15
                                          [ Nachrechnen ]  [ Der Augenblick ]
```

**A letter written on Monday is a −2 on a die roll on Tuesday, printed in the footnote of an
encyclopedia read on Wednesday.** She presses **Nachrechnen** [N, grafted — §4.9): the client re-runs
the roll from the frozen seed, expression AST and clause revision, and seals it byte-identical.
*„Niemand war dabei. Ich habe geschlafen."*

**Beat four — the actual flex.** She scrolls to the infobox. One row is a red link: *„Kanzlei: Ossa
(kein Eintrag)."* She turns the reader dial to **Sera** (a server round trip). The same row is **not
red**. It is a door: a thin ring, a weekday label, one control.

> **Timo:** *„Warte. Der rote Link ist eine Tür?"*

Every wiki in the world renders a red link as an absence and an invitation to type. This product
renders it as an invitation to go and find out — a die roll, on a Tuesday, from a phone, that ends with
a paragraph in an encyclopedia and a weekday over the footnote.

**Why it is the right flex.** It photographs in one frame on a phone, needs one week rather than four
Saturdays, and it is the champion's own flex (§3.1) with the one thing that flex cannot supply: **a date
that is not a game night.** Structurally unreachable for every rival named in §3.1, plus one row: the
wiki rivals (Obsidian, World Anvil, LegendKeeper, Kanka, Notion) are all six-day products with no
seventh day; TaleSpire has a genuine async precedent (persistent boards a seat-holder can enter while
the owner is offline) but no sheets, no rules, no journals — an empty world with nothing to do in it.
**Die Woche is the only seven-day product in the comparison set.**

**The refusal that makes it honest, and the ruling that makes it buildable (round-04/verdict.md §3):**
the door is visible **only** to its holder — der Zwillingsbeweis carries a dedicated fixture pair
proving two worlds identical but for unheld Vollmachten produce byte-identical output for a non-holder.
And the "no account" onboarding this flex depends on is now honestly two paths, not one: the
single-evening / spectator join stays fully account-free; a player who wants a door to still be open on
Tuesday carries **Die Wiederkehr** (§7.6) — a lightweight passkey, not the account this lineage refused,
but an account nonetheless, and named as one.

### 3.5 Every Beleg, every Vollmacht, now carries its own proof [N, grafted]

Every derivation card in the product — Der Abend's Beleg, Die Woche's Vollmacht mint — gained one
control this round it did not have before: **Nachrechnen**. Full mechanism in §4.9. It is the single
grafted idea two independent judges asked for without prompting (round-04/verdict.md §2), and it turns
every footnote in the product from *"trust the seal"* into *"press the button."*

---

## 4. How the halves fuse

**Five mint gestures (table → wiki), three predicates (wiki → table), one citation gesture, one issuing
gesture that mints nothing, and one authorisation object that lets the mint gesture fire without the
GM in the room.**

### 4.1–4.8 [carried from CHAMPION v4 §4.1–§4.8, unchanged]

Die Prägung (the five gestures P1–P5, and the closed-set enforcement below the programmer); die Quelle
(the `Wurf | Gesprochen | Gehört | Passage` sum, and `erfahrungsgrad` derived from it); die Wissensprobe
(`haelt`/`haelt_etikett` evaluated against the rolling character's own projection); `Erfahren schlägt
Gehört` (one clause, two derivations, `disclosure` required, die Grundplatte as the distribution
channel); der Augenblick (the ≤2 KB per-mint snapshot); eine einzige Freigabe (fog opens because
knowledge opened, one control not two); die Berufung und die beantwortete Randfrage (the uniformity
rule: the invitation to write is shown identically on every reachable Entry); the worked session table.
**Nothing here changes.** Full text: CHAMPION v4 §4.1–§4.8.

### 4.9 Die Vollmacht — a mint that does not need the GM in the room [W]

Not a sixth mint gesture. The closed set of five `praegung.*` handlers stays five. What changes is one
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

On success the handler releases `v.freigabe_pid` — a Passage the GM already wrote and sealed — as a
Revelation, `gepraegt_durch: vollmacht`, with **both dates** on the chip, exactly as `gesaet_ausgeloest`
already carries them.

**What a Vollmacht cannot do, enforced by type and by grant:**

- **It cannot be widened, re-targeted or chained.** Clause, topic anchor, threshold, recipient character
  and the sealed passage are frozen at issuance; `inhaber_character_id` is immutable;
  `Vollmacht.freigabe` is typed `SealedPassageRef` and **there is no constructor that yields a
  `Vollmacht`** — the same shape as *"there is no `Html` constructor"* (CHAMPION v4 §6.8).
- **It cannot outlive the week.** `verfall ∈ NaechsteSitzung | Datum(d)`; a fired-after-expiry request
  returns **404, not 403**, same body, same timing.
- **It can be revoked in one keypress**, 404 for its holder immediately. The revocation race (revoked at
  22:41:07 while a roll resolves at 22:41:08) is unattacked and handed to Athena — §15.7 (carried).
- **It is capped:** ≤1 per player per week + 2 free-floating, hard server cap.
- Every issuance, firing, expiry and revocation writes an append-only `AuditEntry`.

**Failure mints nothing** and spends the Vollmacht (unless `wiederholbar`). The player gets a private
line in her own Kodex, never canon. The GM gets the best prep signal in the product: *Sera went to the
chancery and found nothing* — so she knows where to put something.

**Der Ankerkeim** [W]: a third `Vollmacht.anker` variant, `Keim(titel)` — a one-line stub `KnowledgeEntry`
created at issuance time, rendering as an ordinary red link with no downstream code-path split. Removes
the precondition that a wiki-less GM cannot issue a door at all, without removing the sealed-line
writing cost.

### 4.10 Der Brief — knowledge with latency [W]

```text
Brief (id, campaign_id, von_character_id, an_character_id[],
       mitgeteilte_pids[],        -- server-validated: sender must HOLD each one
       begleittext UntrustedText, -- never canon, never a Revelation, lives in the recipient's Kodex
       abgeschickt_at, zustellung_am, zugestellt_at NULL, gelesen_at NULL)
```

A player sends another player passages she holds, with a covering note. The Revelation lands **on the
in-fiction arrival date** (`zustellung_am` — die Postlaufzeit, a campaign-wide constant in slice 1,
`0 Tage` default). The recipient's book stamps it `Hörensagen`; her next roll on the topic prints `−2 ·
nur gehört` from the same clause that printed `+2` for the sender. **This is `erfahrungsgrad` doing a
job it was never given a chance to do in a Saturday product, where everybody hears everything in the
same room.**

`Quelle` gains no fourth constructor — a letter is `Gehört(from_character_id, via_revelation_id)`,
which already exists. `Revelation.granted_via` gains one value: `brief`.

**What it explicitly does not model — stated as a refusal, not an oversight (§15.16):** a `Brief`
carries only passages its sender actually holds, server-validated. Deliberate deception between player
characters has no mechanical existence. Honest transmission of falsehood is modelled beautifully; a
knowing lie is not, because the alternative is letting a player write GM ground truth
(`Revelation.belief`), the one boolean that makes this product a story tool rather than a database.

### 4.11 Nachrechnen — every derivation is re-executable, not just legible [N, grafted]

**Graft, adapted:** every Beleg card and every Vollmacht mint card carries a **Nachrechnen** control. It
re-executes the same evaluator that produced the frozen imprint — from the frozen `seed`, `ausdruck`
(expression AST), `paket_pin` and clause revision already stored on `Wurf` (CHAMPION v4 §8.2) — in a
worker, and diffs the replay against the imprint byte-for-byte.

**Stated on the tin, exactly as B's own document insisted, because overclaiming it is the fastest way to
lose the argument:**

- **It claims:** the printed number follows from the frozen seed, the frozen AST, the pinned package
  version and the named clause revision, and nothing has drifted since it was minted. This is gate
  „Der Beleg hält" (CHAMPION v4 §7.4) turned into a control a human can press.
- **It does not claim:** that a human was present, or that a seed was not ground until a favourable
  result came up. **The honest primary purpose is durability, not anti-forgery**: a package upgrade in
  2029 cannot change what a die roll meant in 2027. Marketing copy that says "verified real play" is
  false and must not ship.

Gate **Nachgerechnet** (§12.4, grafted): every Beleg and every Vollmacht in the acceptance fixture
replays byte-identically in CI on Windows/macOS/Linux Chromium and Node, across two package minor
versions, locale forced to `tr-TR`. This makes the dice engine's determinism a **shipping requirement**
— integer-only arithmetic, pinned RNG, locale-free formatting, cross-platform byte equality — costed at
+3 days on the roller line in §9.5, on the critical path.

### 4.12 Die Fokuswache — the mint hotkey learns to check where it is [N, grafted]

Nemesis's reproducible break in B's spike (`Ctrl+Enter` firing from inside a search box because the
listener was bound to `document` with no focus check) applies to every mint trigger in this product,
including die Vollmacht's. **Fix, product-wide:** the keydown listener moves off `document`; it checks
`document.activeElement` and lets the chord fall through untouched when focus is in any
input/textarea/contenteditable; the shortcut affordance is shown only when legal to press. Nemesis's own
repro is the first fixture in a permanent regression suite.

---

## 5. The anti-log architecture

The attack this candidate was built to survive, unchanged: *"the exhaust is a log, not an
encyclopedia."* Der Abend answered it for the table (CHAMPION v4 §5). Die Woche adds the harder version:
*asynchronous play needs a place to see what happened, and that place is the log §11 refuses.*

### 5.1 Der Sitzungspuffer, die Fällung, die Rückfrage [carried, unchanged — CHAMPION v4 §5.1–§5.3]

### 5.2 Der Umbruch — your book, re-set [W]

The player's answer to *"what happened this week?"* is not a list. It is her own encyclopedia, with
this week's arrivals marked in place, inside their articles, in article order.

```text
Lesestand (character_id, entry_id, letzte_gen_gelesen, at)     -- one watermark per reader per entry
```

Tested against the champion's own refusal: default state is an article, never a list · ordering is by
document structure, never machine time · it shows only what arrived in her own book, because it is a
`Sicht` render · the one number it prints (*"4 neue Absätze"*) has no denominator, so `Kein Nenner`
(CHAMPION v4 §6.5) permits it.

**Gate „Kein Strom"** (new `oracles.yaml` row `umbruch`): the surface contains no time-ordered
container; **remove every article context and it produces zero nodes** — the marks cannot exist
independently of the document they mark, which a feed would survive and a highlight cannot. Der
Zwillingsbeweis runs over it: same held half ⇒ same bytes, whatever anyone else did this week.

**Stated honestly, unimproved, and the invariant most likely to be traded away under user pressure:**
this is a rule with a gate, not a type. `NurLeitung<T>` makes a denominator unrepresentable; nothing
here makes a feed unrepresentable, and the product pressure toward "just show me what happened this
week" will arrive in month one from every user. §15.10.

### 5.3 Die Woche — the GM's set difference, which is not a replay [W]

An extension of the existing `NurLeitung<Differenzkarte>` (CHAMPION v4 §6.5), evaluated over a window:

```text
NurLeitung<{ fenster: (letzte_sitzung, jetzt),
             dazugekommen: [{leser, pid, quelle, wann}],
             offen:        [{vollmacht_id, inhaber, anker, verfall}],
             verfallen:    [{vollmacht_id, inhaber, grund}],
             unterwegs:    [{brief_id, von, an, zustellung_am}] }>
```

**A log is an append-only sequence you read forward. Die Woche is a set difference you read once.**
Computed from the current state of two durable projections (`Revelation`, `Vollmacht`), not from an
event stream; delete every row of `Sitzungspuffer` and it still computes. `NurLeitung<T>` has no encoder
instance in the player payload codec. **The 14-day purge is untouched**; Vollmacht rolls are `dauerhaft
= true` on citation like every other cited `Wurf`.

**Der Zugangsvorfall — access-incident logging that untangles the gate below** [W]: the server logs an
event whenever a device presents no/expired credential against a character holding an open Vollmacht.
Gate W1's numerator/denominator excludes and separately tags any expired-unfired Vollmacht whose holder
had an open Zugangsvorfall in that window — so a red gate is attributable to one cause (lockout) instead
of two indistinguishable ones (lockout vs. disengagement).

---

## 6. Permission architecture — the spine

Unchanged in every load-bearing rule — CHAMPION v4 §6.1–§6.13 carried whole: die Sicht as a composing
choke point with no denominator field; Grenze B9 (der Projektor ist der Server, no visibility metadata
on any player payload, ever); Default-Deny durch Totalität; `Kein Nenner` and `NurLeitung<T>`; der
Zwillingsbeweis; Wände gehören Regionen; der totale Renderer und die Namenswache; `oracles.yaml`, die
Orakelprobe, die Umkehrung der Prüflisten; die Herkunftsschicht als Geometrie; the Leak Bench und die
Goldene Signatur; unrepresentability, not policy; der Sealed Trace, Publish Trace, Verdeckte Probe.

**What Die Woche adds to this spine, and it is one new obligation, precisely scoped:**

- **New `oracles.yaml` / `felder.yaml` rows, each with an owner module and a green test or CI fails:**
  `umbruch` · **`tuer_zustand`** (the door state on a red link — **the highest-risk new oracle in this
  champion**, because whether a link is a door tells the reader something exists behind it) ·
  `vollmacht_karte` · `brief_umschlag` · `brief_unterwegs` · `briefwechsel` · `woche_bilanz` ·
  `nachrechnen_replay`.
- **The door is projected like every other oracle.** A door is visible only to its
  `inhaber_character_id`; to every other reader — including another player at the same table — the row
  is an ordinary red link, byte-identical. Der Zwillingsbeweis gets a dedicated fixture pair: two worlds
  whose held halves are identical, one with three Vollmachten on the unheld side and one with none,
  asserting identical bytes, DOM, `getFullAXTree` and response timing. **This has been verified by hand
  and by a live in-page serialise-and-compare routine in spike-A2 — the strongest-checked claim in
  either round-4 candidate.**
- **Overflow guard, product-wide** [attack-A Break 4, closed]: `overflow-wrap: anywhere` on every
  door/link/infobox text node, plus a permanent CI fixture asserting no scroll overflow against a
  synthetic 60-character unbroken token — the sibling artifact that lacked it (spike A1) is corrected
  and the fix is made durable rather than one-time.

---

## 7. Identity, authorship and the durable record

### 7.1–7.5 [carried from CHAMPION v4 §7.1–§7.5, unchanged]

Das Identitätsdividende (a passage minted whole needs no editor, no registry, no leases in slice 1);
Autorschaft ist ein Wert, kein Fremdschlüssel; die Belegzeile ist ein Orakel (a non-holder sees no
attribution at all, not a redacted one); der Beleg ist ein Faksimile (frozen imprint, never recomputed —
**now also re-executable on demand, §4.11**); Berichtigung, `widerlegt ≠ supersedes`, der Irrtum.

### 7.6 Die Wiederkehr — a lightweight account, named honestly [W, hardened by Apollon's ruling]

**The problem this answers, stated without softening (attack-A Break 1, fatal):** a player joins by link
with no account. Three days later she opens the app on a different device, or the same device with
cleared site data, to fire a Vollmacht her GM authorised on Saturday. There is no login to recover
through, because there was never an account. Neither a bookmarkable capability URL (the anonymous bearer
token this lineage already refused) nor a full account (which breaks the frictionless onboarding the
whole flex depends on) is acceptable as originally scoped.

**The resolution, ruled by Apollon (round-04/verdict.md §3) rather than left open:** the account-free
join is preserved **only** for the single-evening, spectator and cold-evaluator path — the table
Saturday night, the door-flex demo on a stranger's phone. **Any player who wants a door to still be
open on Tuesday carries Die Wiederkehr, and it is named as what it is: a lightweight, password-free,
emailless account, not an absence of one.**

**Mechanism.** Silent WebAuthn passkey registration at join, against a nullable-email/password `user_id`
(`platform_role = gast`), stored in `Credentials`. A lost device is recovered via a GM roster gesture
(*„Zugang erneuern"*) that mints a Vollmacht-shaped `Kopplungscode` — single-use, 10-minute expiry,
scoped, revocable, audited — which registers a fresh credential against the **same** `user_id`, never a
new identity. Authenticator-less browsers fall back to an HttpOnly/Secure/SameSite=Strict cookie, never
a URL-embedded token.

**Why this is the smallest available answer and not a new pattern:** it reuses the exact
scoped/capped/expiring/GM-minted shape already required for die Vollmacht, and it extends the existing
`user_id`/`AuthSession` substrate (CHAMPION v4 §8) rather than building a parallel one.

**What it does not fix, stated plainly (§15.15):** this is still a second security-critical subsystem
that did not exist before this round, it still turns the world into a scale-to-zero, wake-on-request
service reachable on six more days than the previous champion required, and the engineering judgment on
this round's spikes (round-04/verdict.md, engineering lens: **4**) is not discounted by this ruling —
only one of its two causes is answered.

**Der Wiederkehr-Ausweis** [W]: a player-facing panel listing every device credential registered to the
viewer's own identity (label, first/last-used, one-click revoke), reading off the same `Credentials`
table. *Gnōthi seauton* applied to the product: an account-free-sounding product quietly holding a
credential should show the player exactly what carries her access.

### 7.7 Der ausstehende Wurf — the roll as durable, idempotent, resumable state [W]

**Answers attack-A Break 2 (major):** roll-then-mint atomicity is unspecified under connection loss.
`Wurf` gains `status ∈ ausstehend | bestaetigt | verworfen`, persisted server-side the instant the roll
happens. The confirm endpoint is idempotent; reopening a door with a pending `Wurf` returns the same
card (never re-rolls) until confirmed or a ~30-minute window lapses, after which the Vollmacht reverts
to `offen`, unspent. Reload becomes ordinary page-load behaviour, not a special resume path. This is the
mechanism that protects `Nichts wird automatisch Kanon` under exactly the seam the brief asks every
candidate to stress: a network partition between the two keypresses.

---

## 8. The data shape

`02-domain-model.md` is inherited whole — CHAMPION v4 §8.1–§8.6 carried unchanged: `Entry` as the
substrate; `Wurf` as a first-class citable object; `Augenblick`; `Zustand` and `ActorInstance` as the
explicitly mutable second substrate; `PassageRelation`, `Link`, `Etikett`, `Haltung`, `Revelation`; the
editor's dormant hardening, waiting for slice 2.

### 8.1 New tables, this round

```text
Vollmacht (id, campaign_id, ausgestellt_in_session_id, ausgestellt_von_user_id,
           inhaber_character_id NOT NULL,           -- immutable
           klausel_ref, thema_etikett, schwelle,
           freigabe SealedPassageRef,               -- no constructor yields a Vollmacht: no chaining
           anker ∈ RoterLink(link_id) | Passage(pid) | Ort(region_pid) | Keim(titel),
           verfall ∈ NaechsteSitzung | Datum(d),
           wiederholbar boolean DEFAULT false,
           status ∈ offen | eingelöst | verfallen | widerrufen,
           eingelöst_durch_wurf_id NULL, ausgestellt_at)

Brief     (id, campaign_id, von_character_id, an_character_id[],
           mitgeteilte_pids[],        -- server-validated: sender must HOLD each one
           begleittext UntrustedText, -- never canon, never a Revelation
           abgeschickt_at, zustellung_am, zugestellt_at NULL, gelesen_at NULL)

Lesestand (character_id, entry_id, letzte_gen_gelesen, at)      -- der Umbruch's watermark

Credentials (id, user_id, kind ∈ passkey | cookie, label, registered_at,
             last_used_at, revoked_at NULL)                     -- die Wiederkehr

Zugangsvorfall (id, campaign_id, user_id, vollmacht_id NULL, at)  -- untangles gate W1
```

`Wurf` gains `status ∈ ausstehend | bestaetigt | verworfen` (§7.7).

### 8.2 Changed columns

- `Passage.gepraegt_durch` gains one value: `vollmacht`.
- `Revelation.granted_via` gains one value: `brief`.
- `praegung.beleg` gains one precondition (§4.9). The closed set of five handlers stays five.

### 8.3 Explicitly unchanged, and each is load-bearing

The `Quelle` sum type is untouched — a letter is `Gehört`, which already existed, **no fourth
constructor**. `GameSession` is untouched, and a week is not a session: `AuthSession ≠ GameSession`
holds; the week is the window between two `GameSession`s, computed, never stored. `Zustand` is
untouched: a Vorhaben yields knowledge, never board state. `Sitzungspuffer`, its TTL and its physical
purge are untouched. No new render recipe — der Umbruch is a mark inside the existing recipes; die
Woche is a `NurLeitung` panel.

---

## 9. The tactical half — specified concretely enough to be costed, and untouched for a fourth round

**Unchanged from CHAMPION v4 §9 in every specification** — three grid types, elevation as a scalar,
lossless UVTT import and export, per-character fog as the projection, the RB-02 budget as CI gates, the
§9.2 refusals (no dynamic LOS, no Scene Levels, no 3D, no WFC in slice 1), the parity rule. **Nothing is
refused. One thing is sequenced.**

### 9.1 Der Tisch ohne Leinwand — the cut, and why it is not the cut that lost round 3 [W]

Round-3 A lost partly because its slice refused the map canvas as a *product decision* and had "no game
in it." This is a different cut: **slice 1 still contains a game, and it contains both fusion
directions** — dice with a seeded server roller, initiative, HP, conditions, `defeat_pending` with
explicit confirmation, the undo ring, regions/walls/portals as data from a real `.dd2vtt` parse,
per-character fog as projection over regions, token positions as `Zustand`. **What is missing is the
drawing of it, not the playing of it.** The render recipe that ships is die Tafel, the Outline recipe —
CHAMPION v4 §9.1 already commits to it as *"a fully usable play surface, so a screen-reader player is
never handed a canvas at all."* Either that sentence is true and shipping it first is legitimate, or it
was never true. **We ship the accessible path first and the canvas becomes the enhancement rather than
the retrofit** — the risk CHAMPION v4 §9.5 marked **high** because it was retrofitted onto a canvas is
structurally gone when there is nothing to reconcile it with.

**What slice 1 contains zero of: Pixi, the tile pyramid, KTX2/Basis, the GPU fog texture** — the four
artefacts nobody in four rounds of this lineage has ever written.

### 9.2 The bill, decomposed against CHAMPION v4's own table

| CHAMPION §9.5 line | v4 (tactical, full) | Slice 1 here | Note |
|---|---:|---:|---|
| `MapRenderer` + Pixi + input abstraction | 8 | **0** | slice 2 |
| Tile pyramid, KTX2/Basis, zoom variants | 10 | **0** | slice 2 |
| Tokens: placement, drag, snap ×3, elevation | 8 | **3** | positions as `Zustand`, outline-rendered |
| UVTT import **and** export | 6 | **6** | a parser, not a renderer |
| Fog: per-character | 7 | **2** | projection over regions; GPU texture is slice 2 |
| Combat: initiative, HP, conditions, undo, timers | 7 | **7** | |
| Dice: seeded roller, AST, roll card, `Trace` | 9 | **9** | |
| Die Prägung: five handlers, Fällung, Augenblick | 10 | **10** | |
| Accessibility + Outline recipe as a real play surface | 8 (high) | **8** (med) | risk falls: nothing to reconcile with |
| Perf harness, budget scene, CI gates | 4 | **1** | no renderer to gate |
| Kartenabzug + masked-handout service | 6 | **4** | map raster is slice 2 |
| Der Zwillingsbeweis | 5 | **5** | +1 fixture pair for the door |
| B9 / totality / Anmerkung / Bild-Passage / NurLeitung | 9 | **9** | |
| Der Handschlag | 3 | **3** | |
| | **≈120** | **67** | |

### 9.3 Die Woche's own delta [W]

| Item | Days | Risk |
|---|---:|---|
| `Vollmacht`: object, issuance, expiry job, `praegung.beleg` precondition, revocation, caps, audit | 5 | med |
| `Brief`: envelope, hold check, Revelation fan-out, Postlaufzeit, covering note | 4 | low |
| Der Umbruch: `Lesestand`, in-place marks, gate „Kein Strom", Zwillingsbeweis fixture | 5 | med |
| Die Woche surface: `NurLeitung` set difference (GM) + doors and letters (player) | 4 | low |
| **Der rote Link ist eine Tür**: link↔Vollmacht binding, door-state projection, `tuer_zustand` oracle | 3 | **high** — most-rendered atom in the product |
| Der Zug: async GM release from a phone (P2, no new gesture) | 2 | low |
| Briefkasten: intent-and-receipt, honest receipts, drain-on-wake | 3 | med |
| **Die Wiederkehr**: passkey subsystem, `Credentials`, recovery-code flow, cookie fallback | 5 | **high** — new, security-critical, unscoped before attack |
| **Der ausstehende Wurf**: idempotent two-phase roll state machine | 3 | med |
| **Nachrechnen + Nachgerechnet gate**: dice engine determinism, cross-platform byte equality | 3 | med |
| **Die Fokuswache**: scoped hotkey, regression fixture | 1 | low |
| | **≈38** | |

**Slice 1 tactical + week ≈ 67 + 38 = 105 days.** This is higher than product-A.md's original ≈93,
because it now honestly carries the identity/idempotency/verification surface the attack forced rather
than the pre-attack estimate. **This number is stale the moment it is written and should be re-measured
against S-T1 and against Die Wiederkehr's actual build before it is trusted.**

### 9.4 What is explicitly not in slice 1 [carried and extended]

Everything CHAMPION v4 excludes, plus: die Postlaufzeit as a configurable world post (slice 1 ships a
single campaign-wide constant, `0 Tage` default); der Aushang; die Ausgabe as a publishable package
(launch-blocking, not slice 1); push notifications of any kind — a letter arriving must never buzz a
phone in slice 1; `freigabe: offen` Vollmachten (GM debt in a different hat, held out until W1 has run).

**If slice 1 must shrink, the honest cut order:** (1) UVTT export, keeping import; (2) der Brief,
keeping die Vollmacht — the door is the flex, the letter is the depth; (3) der Zug; (4) hex and
gridless. **Never** the closed set of five mint handlers, **never** `Sicht`/B9, **never**
`haelt_etikett`/`erfahrungsgrad`, **never** der Zwillingsbeweis, **never** die Herkunftsschicht, **never**
die Vollmacht.

### 9.5 What still does not ship, ever or for years [carried, CHAMPION v4 §9.2]

No dynamic per-token LOS · no Scene Levels · no 3D, no animated video backgrounds · no WFC in slice 1
(K5's flagship lands in slice 3, and Kaya must rule on the reallocation).

### 9.6 K5 slips a slice, and Kaya must rule

K5 is Kaya's own amendment: maps, generation, sprites that beat the competitors. This champion delivers
all of it — in slice 2. For one slice it is, against Owlbear's ~20 minutes and Foundry's play-5e-tonight,
a wiki with dice and an outline. The Outline-first argument (§9.1) is real, but **no artifact in this
lineage has demonstrated that a screen-reader-native outline table is pleasant to play on for four
hours**, and if it is not, slice 1 has a table nobody wants to sit at. Logged for `OPEN-DECISIONS.md`.

---

## 10. Time, the record, and the reader

### 10.1–10.7 [carried from CHAMPION v4 §10.1–§10.7, unchanged, plus one addition each where noted]

Die Herkunftsschicht; drei Regler on every page header; der Nachhall und die Chronik (**Die Chronik
bekommt Zwischenkapitel** [W] — print gains a fourth CI assertion, *Zwischenkapitel count == delivered
Brief count*, alongside *footnote count == chip count*); die Wurfkarte reist (now travelling **with its
Nachrechnen seal**, §4.11 — a pasted card renders with a green seal, so every shared footnote verifies
itself with no marketplace, no account, no server round trip); das Zeugnis; die Lücke; cold start,
honestly.

### 10.8 Die Postlaufzeit — distance becomes a game mechanic expressed in the wiki [W]

The GM sets the world's post: *"Ein Brief nach Sarn braucht vier Tage."* A `Brief` carries
`zustellung_am`, and the Revelation lands on the in-fiction arrival date. One nullable column, and the
campaign acquires a postal geography: the party in the north does not know for a week what the capital
learned on Monday, and the `−2 · nur gehört` on their roll is dated. **Nobody in the corpus models
in-fiction latency of any kind.** Slice 1 ships a single campaign-wide constant; the geography is slice
2 (§9.4).

### 10.9 Die Ausgabe — the tradeable unit becomes a week [W]

The champion's tradeable unit is an `Anlass` — a seed. Die Ausgabe is a seed, plus a set of Vollmachten
with their sealed lines, plus one or two letters already in transit. A GM installs it and her table has
six days of play before the next Saturday, not a map and a hope. It is declarative, has no
code-execution escape hatch, and is the only content format in this market a rival cannot consume — the
mirror of UVTT export: we export into their tools, they cannot import our weeks.

**Grafted discipline [N]: Geschlossene Tüte, applied.** Die Ausgabe is a second package format on the
same security surface RB-11 named as the attack target, and it inherits B's closed-schema discipline
rather than inventing a lighter one: an enumerated content list, **the validator rejects any unknown
key**, and a new gate — **Geschlossene Tüte (Ausgabe)** — tests it against ten hostile fixtures (unknown
key, external URL, un-re-encoded raster, decompression bomb, clause operator outside the fixed set,
missing consent record where a `Fremd`-authored line is bundled, package pin naming an unavailable
version, and three more specific to `Vollmacht`/`Brief` payloads: a sealed passage with no
`inhaber_character_id`, a Vollmacht with no `verfall`, a Brief naming an unheld `mitgeteilte_pid`).

**Der Ausgabenkorb** [W]: a read-only preview before publishing an Ausgabe, listing bundled Vollmachten
(word counts only, never sealed text), Keim stubs and seed lines, rendered from the same
`NurLeitung`-shaped query die Woche's GM panel already computes.

### 10.10 Der Aushang — Fandom's main page, computed per character [W]

Every reader's book is already different. The Story zone's landing becomes a front page: the three
articles with the most accretion in her book, her open doors, her letters in transit, one red link she
can walk through. Slice 2 (§9.4).

### 10.11 Die offene Tür — public unauthenticated permalink [W]

A GM-controlled, default-off toggle that publishes an article's existing byte-verified-safe `fremd`
projection at a stable public URL — no new privacy surface, a deliberate address for output that already
exists and whose safety proof already exists (§6). The cheapest possible go-to-market artefact this
champion has.

---

## 11. What this product refuses

Everything CHAMPION v4 §11 refuses, carried verbatim, **plus five of Die Woche's own:**

- **No third session concept.** `AuthSession ≠ GameSession` already holds; a week is a computed window,
  never a stored entity.
- **No player-authored canon.** A `Brief` transmits; it does not create. `begleittext` is
  `UntrustedText` in a personal Kodex, never a Passage, never a Revelation, never canon in an export.
- **No unbounded issuance.** ≤1 Vollmacht per player per week + 2 free-floating, server-enforced, and
  everything unspent expires. An inbox fills; a Vollmacht drains.
- **No chaining.** No constructor yields a `Vollmacht`. An authorisation cannot authorise.
- **No notifications in slice 1.** A letter arriving must not buzz a phone. If the only reason a player
  opens the app on a Tuesday is that the product interrupted her, the thesis is false and the gate
  should say so rather than the push service hiding it.

**And one refusal this round adds by ruling rather than by design:** **no anonymous bearer token, and no
pretending an account is absent when it is present.** Die Wiederkehr is named as an account (§7.6). A
future round that drifts back to describing it as "no account" is repeating the exact overclaim
round-04/verdict.md was written to correct.

---

## 12. The slices and the gates

### 12.1 Slice 1 — „Die Tür"

One workflow: one campaign, one evening, and then one week. Browser only, hosted room, three people,
**no canvas.**

**The workflow, end to end** [merges CHAMPION v4 §12.1 steps 1–12 with product-A.md §7.1]:

1. Kaya creates a campaign and writes an Anlass: six lines, single-line inline composer, no editor.
2. Two players join by link, display name, **no account** (die Namenswache runs).
3. Sera rolls Menschenkenntnis; the card prints `+2 · du hältst 3 Passagen mit #haus-vharon` —
   `haelt_etikett` against her own projection.
4. `Ctrl+Enter`. A sealed seed line is released, both dates, Augenblick captured server-side, a footnote
   appears.
5. Brannt is revealed the same passage as `[von Sera gehört]`; his next roll prints `+0 · Hörensagen`.
6. A guard drops below 0 → `defeat_pending` → Kaya confirms → one `ereignis` passage.
7. **Die Fällung, which now also issues.** `V` ×2, ≤60 s, two doors opened.
8. **Tuesday, a phone.** Sera opens Haus Vharon. The infobox row is a door. She presses it. Server
   rolls. `Ctrl+Enter`. **The paragraph arrives with a Tuesday over it.** She presses **Nachrechnen** and
   the seal is byte-identical.
9. **Monday–Wednesday.** Brannt sends Sera a Brief carrying two passages he holds, delivered with
   Postlaufzeit; her next roll prints `−2 · nur gehört` from the same clause that printed `+2` on
   Saturday.
10. Open Brannt's DevTools on Tuesday: no bytes of Sera's door, her sealed line, or her result; his red
    link is byte-identical to a reader with no campaign at all.
11. **Saturday.** Session 15 opens with an Anlass that contains the week. Sera's landing is der Umbruch:
    her own articles, four atoms marked.
12. Export → import → **diff empty**, including lineage, `dauerhaft` Würfe, Augenblicke, **Vollmachten
    and Briefe**.

**Contents:** everything CHAMPION v4 §12.1 lists, **plus** `Vollmacht` · `Brief` · `Lesestand` ·
`Credentials` · `Zugangsvorfall` · die Fällung's issuance step · der Umbruch with gate „Kein Strom" ·
die Herkunftsschicht's weekday channel · der Ankerkeim · Nachrechnen on every Beleg and Vollmacht card ·
die Fokuswache.

**Explicitly not in slice 1:** everything CHAMPION v4 §12.1 excludes, plus §9.4's list above (canvas,
configurable Postlaufzeit, der Aushang, die Ausgabe as a package, push notifications, `freigabe: offen`).

**If slice 1 must shrink, cut order:** §9.4's list, then CHAMPION v4 §12.1's list. **Never** the five
mint handlers, **never** `Sicht`/B9, **never** `haelt_etikett`/`erfahrungsgrad`, **never** der
Zwillingsbeweis, **never** die Herkunftsschicht, **never** die Vollmacht.

### 12.2 Slice 2 — „Die Feder" [carried, CHAMPION v4 §12.2, unchanged]

The editor half. Plus, added this round: der Aushang, die Postlaufzeit as a configurable world post, die
Ausgabe as a publishable package, der Kartenabzug's map raster.

### 12.3 Launch-blocking [carried, CHAMPION v4 §12.3, unchanged]

### 12.4 The gates — every one can go red

**Gate zero, unchanged and unmoved for a fourth round:**

| Gate | Green when |
|---|---|
| **Prägerate** | Instrumented four-hour session: ≥8 mints, ≤4 min GM chrome typing, no interaction >12 s, ≤2 regretted omissions, printed mint mix. **Red falsifies both this champion and its predecessor.** |
| **S-T1 · Der Tisch, gebaut** | Deferred with the canvas to slice 2 entry — see §9.1. **Still unrun for a fourth round.** |
| **S-P1 · Drei Bücher, ein Server** | Unchanged, ~2 days, mandatory. **Still unrun for a fourth round.** |

**This round's gate zero, new [W]:**

| Gate | Green when | If red |
|---|---|---|
| **W0 · die Ankerprobe** | Over the instrumented weeks, a low-wiki-depth GM still issues ≥1 Vollmacht/week via Keim anchors. | Campaigns where it's red are **excluded from W1's denominator with a named reason** rather than silently averaged in. |
| **W1 · die Türquote** | Over four instrumented weeks (excluding W0-excluded campaigns): ≥50 % of issued Vollmachten fired before expiry; ≥1 Vorhaben/player/week; GM issuance ≤120 s/session; ≥3 of 4 weeks contain a mint on a non-session day. **Der Zugangsvorfall (§5.3) excludes lockouts from the numerator.** | **The thesis is refuted.** Say so before marketing does. |
| **W2 · das dickere Buch** | Over the same four weeks the thinnest player book gains ≥3 passages from non-session days. | Die Woche does not fix the thin-book weakness. |
| **W3 · kein Strom** | Gate „Kein Strom" (§5.2) green. | Der Umbruch is a log and the anti-log invariant is lost. |

**And carried, plus one addition from B's discipline:**

All gates in CHAMPION v4 §12.4 (Leak, der Zwillingsbeweis, Kein Protokoll, Der Beleg hält, Der Streifen,
Das dünnste Buch, Tischbudget, Orakelprobe/Herkunftsprobe, Cold read, Round-trip, Accessibility, Play
posture, Zwei Versionen ein Abend, Infrastructure, Search at scale) — unchanged, unmoved, and **Search
at scale is red until run for a fifth round.** Plus, grafted [N]:

| Gate | Green when |
|---|---|
| **Nachgerechnet** | Every Beleg and every Vollmacht in the acceptance fixture replays byte-identically in CI on Windows/macOS/Linux Chromium and Node, across two package minors, locale `tr-TR`. |
| **Geschlossene Tüte (Ausgabe)** | The `.ausgabe` validator rejects all ten hostile fixtures (§10.9). |
| **Türtext-Umbruchschutz** | A synthetic 60-character unbroken token in a door row does not overflow, product-wide. |

**Acceptance demo, one take, no cuts:** CHAMPION v4's demo, **plus**: `V` ×2 at die Fällung → Tuesday, a
phone, the door pressed, the roll rolled, `Ctrl+Enter`, the paragraph arriving with a weekday over it →
**Nachrechnen** pressed, green seal → a Brief delivered with Postlaufzeit, `−2 · nur gehört` printed from
the same clause → Saturday, der Umbruch: four atoms marked in place → export → import → diff empty
including Vollmachten and Briefe.

---

## 13. The shell

Six zones, unchanged in shape — CHAMPION v4 §13, all four rulings carried. **Die Woche's ruling
addition, and it is the whole thesis in a routing line:**

```text
live GameSession                        → Session
unfired Vollmacht OR undelivered Umbruch → Story, mit dem Umbruch scharf
otherwise                                → Story
```

Still one predicate. **On six days out of seven the app opens into the book — and the book has
something in it that was not there yesterday.**

| Zone | Under Die Woche |
|---|---|
| **Session → die Fällung** | **Four states instead of three**, gaining *Dazwischen — die Woche*: for the player, her open doors and letters in transit; for the GM, a `NurLeitung` set difference and a count that only falls. *Nachher* gains the issuance ritual (`V` ×N, ≤90 s). |
| **Story → das Archiv** | **Promoted from reading surface to the six-day play surface.** Red links are doors. Der Umbruch marks this week's accretion in place. Die Herkunftsschicht gains a weekday glyph as a fourth channel (text, so it survives high contrast by construction). Still a reading-and-firing surface in slice 1, not an editing surface. |
| **Cast → die Zeugen** | Gains der Briefwechsel: who this character wrote to and heard from, with Postlaufzeit — the campaign's social graph, computed from permission data already stored. |
| **Library → das Regal** | Gains Vollmachten and Briefe. The tradeable unit upgrades from an `Anlass` to eine Ausgabe. |
| **Table → der Tisch** | Unchanged in specification (§9), changed in schedule: der Tisch ohne Leinwand ships slice 1, the canvas ships slice 2. |
| **Forge → das Formular** | Gains der Vollmachtszettel (the third no-YAML authoring surface after die Regelkarte and der Klauselzettel) and **die Testtafel** [N, grafted] — a live per-actor clause preview showing a clause evaluated side by side for two or more named test characters as the author types, exposing `erfahrungsgrad`'s asymmetry during authoring itself. |

---

## 14. Business, reachability, hosting

### 14.1 Die Raumuhr, updated [W]

Unchanged pricing shape (CHAMPION v4 §14.1: ~€30 one-time, 300 hosted room-hours/year, 5 GB, players
always free). **Die Woche's addition, priced with inputs shown:** the world runs scale-to-zero, woken by
a request — 4 players × ~1.5 reads/fires/letters ≈ 6 wake events per campaign-week (≤20 heavy) × ≤90 s
compute budget per wake ⇒ 0.5 compute-hours/campaign-week ⇒ **~26/campaign-year ⇒ 8.7 % of die Raumuhr's
300-hour allowance, +14 % hosted compute against ~16 session-hours/month.** Cost per session-hour stays
inside <€0.05; der Briefkasten's own cost is unchanged at <€0.01/campaign-month.

**The degradation, and it is worse under this thesis than under Der Abend's:** a self-hosting GM with a
shut laptop no longer costs her players a Wednesday *read* — it costs them a Tuesday's *play*. A
Vorhaben is posted, not resolved; the receipt is honest (*"Zugestellt. Kayas Welt war zuletzt Sonntag
wach."*); the world drains it on next wake and the chip carries both moments. **The week still accretes;
it accretes in bursts.**

### 14.2 Der Briefkasten [K, extended W]

Unchanged in shape (CHAMPION v4 §14.2: world/letterbox split, three impls, <€0.01/campaign-month).
**Extended:** der Briefkasten now carries two directions — a player's offline note (unchanged) **and**
a Vorhaben's intent-and-receipt when the world is asleep (§14.1). Both are opaque encrypted blobs the
spool cannot read; the invariant is unchanged: minting and revelation stay server-authoritative, and an
offline intent can be posted but never resolved without the world waking.

### 14.3 Reachability, ruled [carried, CHAMPION v4 §14.3, unchanged]

**And the structural loss stands and gets worse.** Fantasy Grounds is free-to-play since 2025-11-08 with
a cloud relay that solves reachability for their users at no charge. §14.1 is where this champion pays
for what they give away, and Die Woche extends the days on which it pays. **This is not closable by
design.**

---

## 15. Carried weaknesses — the honest ledger

**15.1–15.13 [carried verbatim from CHAMPION v4 §15.1–§15.13].** Every one of them is unimproved by this
round: ~120 days of tactical half, unspiked in every dimension (§15.1, and now the single largest
untouched number in five rounds — see round-04/verdict.md §6); the mint rate never measured (§15.2);
Fandom-grade search at scale unproven for a fifth round and made worse — Die Woche adds more short
passages arriving on more days, plus a per-reader watermark join on every article render (§15.3); the
02:00 long-form writer still the least-served user (§15.4); the player's book is thin, monotone in play
quality (§15.5); `Erfahren schlägt Gehört` remains a house rule wired into an engine, and is now the
mechanism Die Woche's whole flex depends on firing twice a week instead of once a session (§15.6); the
14 days remain a policy, and right-to-erasure now collides with a second person's writing via der Brief
(§15.7, sharpened); a citable `Wurf` still collides with the `Zustand` undo ring (§15.8); session one is
still empty (§15.9); `Sicht` grafted, unbuilt, unmeasured, now for a **fourth** round, with three more
projected surfaces loaded onto it (§15.10, renumbered from v4 §15.10); the art pipeline unpriced
(§15.11); no market evidence for any of this (§15.12); the sanitiser, id churn, asymmetric numeric
secrets, clause migration, the hosting tail — all carried, unchanged (§15.13).

**New this round:**

**15.14 The GM's authoring cost moved; it did not vanish, and this is the hard one.** A Vollmacht is
prep with a target number — a sealed line written in advance for a named outcome, at 23:41, by someone
who has run a game for four hours. Three at ~90 s each is 4.5 minutes, and the Prägerate gate allows
≤4 min of GM chrome typing for the **entire session**. Die Lücke already computes the candidate list,
and an unreleased sealed Anlass line can become a Vollmacht for the cost of one keypress and a
threshold — but neither is a cure, and `freigabe: offen` (deferring the sealed line to next session) is
GM debt wearing a different hat, held out of slice 1 until W1 tells us the real cost. **No prep and
pre-authorised outcomes pull in opposite directions, and every mitigation either costs the GM writing or
costs her a debt.**

**15.15 Die Wiederkehr is a real, new, security-critical subsystem, and this round's engineering
judgment (4/8) is not fully answered by naming it honestly.** Passkeys, a recovery-code flow, a
device-credential table, and an idempotent two-phase roll state machine were invented after attack, not
scoped before it, and they turn the product from a session-scoped app into an always-reachable
scale-to-zero service on six more days than the previous champion needed. §7.6's ruling closes the
*naming* problem (it is an account, and the product should say so); it does not close the *scope*
problem. Round 5 owes a real cost estimate for this subsystem, checked against something, the way S-T1
is owed for the canvas.

**15.16 The product models being wrong. It still does not model lying.** A `Brief` carries only passages
its sender actually holds, server-validated — deliberate deception between player characters has no
mechanical existence. Honest transmission of falsehood is modelled beautifully (an `irrig` passage
passed on); a knowing lie is not, because the alternative is letting a player write `Revelation.belief`,
the one boolean that makes this product a story tool instead of a database. **Unresolved by design, and
named as a refusal rather than an oversight.**

**15.17 A pre-signed mint is a delegated authority in a product whose promise is that the GM decides.**
Scoped, capped, immutable, unchainable, revocable, expiring, audited — and still: the first time a
Vollmacht releases a sealed line in a way the GM meant differently, she experiences the product as
having written canon behind her back. The five-word invariant (`Nichts wird automatisch Kanon`) becomes
a fifteen-word one (`Nichts wird Kanon, das die Spielleitung nicht selbst geschrieben und freigegeben
hat`). **Shorter invariants survive contact with tired developers; longer ones get exceptions.** The
revocation race is unattacked and handed to Athena.

**15.18 Nachrechnen will be overclaimed by its own future authors if this document is not held to
account.** The seal proves coherence and durability — it does not prove a human was present, and seed
grinding is trivial. The moment marketing copy says "verified real play," the claim is false. §4.11
states the limit on the record precisely so a future round cannot quietly upgrade it.

---

## 16. Competitive position [carried, CHAMPION v4 §16, plus one addition]

Everything in CHAMPION v4 §16 stands: the moat against Foundry's HTML-string journal is structural and
unbroken across four rounds of attack; where this product wins (per-character fog as the projection
itself, UVTT round-trip, a campaign export that exists at all, a die roll citable in 2031, one reveal
control) is unchanged; where rivals still win (Foundry's tactical depth, Roll20's network effect, Fantasy
Grounds' free rules automation and free relay, Owlbear's minute one, Alchemy's production values and
Sheet Builder, TaleSpire's diorama gasp) is unchanged and conceded in the product's own voice.

**Die Woche's addition:** the wiki rivals — Obsidian, World Anvil, LegendKeeper, Kanka, Notion — are all
six-day products with no seventh day, and the one adjacent async precedent (TaleSpire's persistent
boards) has no sheets, no rules, no journals. **This is the only seven-day product in the comparison
set**, and the differentiation compounds every week the product is alive rather than front-loading at
onboarding — which matters for a one-time-purchase model that needs ongoing reasons to stay switched.
Die Ausgabe (§10.9) is a new sellable SKU, sized between a map and a campaign, engineered to be
non-importable by rivals, that fills a real gap in the creator-channel strategy RB-11 ratified.

---

## 17. Kaya's amendments, answered

CHAMPION v4 §17 stands for K1–K4, K6, K7 with one addition each:

| | Amendment | Delta this round |
|---|---|---|
| **K1** | Themes + templates | The weekday is a fourth provenance channel, text-based, surviving high contrast by construction. |
| **K2** | Visual GUI rule-builder | Gains der Vollmachtszettel (a third no-YAML authoring surface) and die Testtafel [N] (live per-actor preview). |
| **K3** | State-of-the-art GUI | Strengthened by the cut: the Outline recipe ships first as a real play surface, so accessibility is architecture in the literal sense for the first time in five rounds. |
| **K4** | Differentiation | New axis: the seventh day. |
| **K5** | Maps, generation, sprites | **The honest divergence.** Everything in §9 is carried, none of it is refused, and the canvas moves to slice 2. **Kaya must rule** (§9.6). |
| **K6** | Distribution | More load-bearing than ever: the browser on a phone is not the Wednesday read any more, it is the Tuesday **play** surface. Electron remains the self-hosting invariant's implementation and now also the thing whose lid being shut is a printed degradation (§14.1). |
| **K7** | Game feel through staging | Fully honoured. The most cinematic moment in the product becomes a red link turning into a door, and a letter arriving. |

---

## 18. Graft index — lineage kept visible

CHAMPION v4 §18 stands in full (all grafts from rounds 1–3). **New this round:**

| Graft | Origin | Where it lives now |
|---|---|---|
| **Die Vollmacht** — the pre-authorised, capped, expiring mint that lets P1 fire without the GM present | round 4 A **[W]**, native | §4.9 |
| **Der Brief + die Postlaufzeit** — knowledge with in-fiction latency | round 4 A **[W]**, native | §4.10, §10.8 |
| **Der Umbruch + die Woche's set difference** — the anti-log answer for asynchronous play | round 4 A **[W]**, native | §5.2, §5.3 |
| **Der Ankerkeim, Gate W0** — separating "no wiki" from "thesis refuted" | round 4 A **[W]**, native | §4.9, §12.4 |
| **Die Wiederkehr, der Zugangsvorfall, der ausstehende Wurf** — the identity/idempotency fixes to attack-A's fatal and major breaks | round 4 A **[W]**, native | §7.6, §5.3, §7.7 |
| **Die Ausgabe** — the tradeable unit becomes a week | round 4 A **[W]**, native | §10.9 |
| **Nachrechnen** — the re-executable, honestly-limited seed replay verifier | round 4 B **[N]**, grafted | §3.5, §4.11, §12.4 |
| **Die Fokuswache** — the scoped, focus-guarded mint hotkey | round 4 B **[N]**, grafted | §4.12 |
| **Geschlossene Tüte, the closed-schema/hostile-fixture discipline** — applied to die Ausgabe | round 4 B **[N]**, grafted | §10.9, §12.4 |
| **Die Testtafel** — live per-actor clause preview in the rule-builder | round 4 B **[N]**, grafted | §13 |
| **Die Freistelle-style honest-gap chip grammar** — "+0 · nichts mitgebracht" applied to Die Woche's own departed-player gaps | round 4 B **[N]**, grafted | §5.3 |

**Not grafted, deliberately (round-04/verdict.md §4):** die Übernahme / der Anlass-Packer's played-evening
pipeline (a different candidate's thesis — grafting it would forge a third candidate rather than harden
one); die Gabelung and der Anlass als Rezension (downstream of a Packer this round did not adopt); die
Maskierung / consent-pseudonymisation machinery (B's own genuinely hard, unsolved problem, with no
matching threat surface in this champion, since it ships no third party's played evening).

---

*CHAMPION v5. The bet, unhedged: **the champion's invariant said "a human keypress" and never said
"now." Two hands, three days apart, and the canon accretes on a Tuesday.** It buys week one instead of
Saturday four, gives the player something to do instead of something to read, and pays for it with the
canvas still in slice 2, with prep coming partly back at 23:41, with a world that must be reachable on
six more days, and — new and unresolved — with a real identity subsystem this lineage spent three rounds
proud of not needing. The round that produced this champion won by half a point out of thirty-seven, on
a lens split that hides a structural disagreement about what "buildable" means. **If the GM does not open
the door, W1 goes red in four weeks and this document is wrong** — which is four weeks and not a year,
and remains the second-best thing about it. If the tactical half stays unspiked for a fifth round while
this thesis is extended again rather than tested against running code, the honest reading is not that the
bet is good — it is that nobody has yet been asked to prove the more expensive half.*

> *Der Würfel fiel an einem Dienstag,*
> *und niemand sah ihm zu —*
> *nur eine Zeile, die schon geschrieben war,*
> *und eine Hand, drei Tage jung.*
> *Doch wer die Hand drei Tage hält,*
> *muss wissen, wessen Hand es ist —*
> *und das ist keine Abwesenheit mehr,*
> *sondern ein Name, den wir endlich schreiben.*
