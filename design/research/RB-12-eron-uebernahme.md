# RB-12 — Die Übernahme. The Eron import as a migration contract

**Ariadne, die Fadenführerin · 2026-07-27.** Beat: turn *„unser wiki in unsere custom app bringen (auch
als Test ob das funktioniert)"* into a specification and an acceptance test.
Inputs, all read from disk: [`design/fixtures/eron/`](../fixtures/eron/) (`articles.json`,
`templates.json`, `media.json`, `graph.json`, `eron-export.xml`, `README.md`) ·
[`iterations/CHAMPION.md`](../iterations/CHAMPION.md) §1, §3.2, §3.4, §4, §8, §10.9, §11, §12.4 ·
[`00-intake.md`](../00-intake.md) (the invariants, K7) · [`02-domain-model.md`](../02-domain-model.md).
Live verification: 14 additional MediaWiki API calls over `curl` (namespace inventory, category sizes,
`prop=contributors` over all 74 titles, four `Erismus` revisions, `export=1` of `Karte:Andaria`). Every
count below is reproducible; the decomposer used is 120 lines and is specified in §2.4.

**Eron is fixture and skin, never subject.** Nothing in this brief may be read as a licence to model the
product on Eron. Every rule here must hold for a Star-Trek wiki, a Cyberpunk wiki, and a wiki with no
infoboxes at all. Where a rule is Eron-shaped, it is marked **[corpus-specific]** and is a *default*, not
a law.

---

## The answer in one paragraph

The Eron import is **not one project, it is three**, and only the first is what people mean when they say
"import my wiki." (1) **Structure lands almost perfectly.** 543 of 543 filled infobox parameters in the
corpus resolve to a declared `<data source="…">` in a Fandom **portable infobox** — zero undeclared,
zero guessing, nine templates covering 44 of 73 articles. This is the single most mechanically valuable
thing in a Fandom export and it makes typed entities a parsing job, not an AI job. (2) **Prose lands
with a boundary rule that must be normative, because it is the whole answer.** The same corpus yields
**1 100** passages under one boundary rule and **1 525** under another, both defensible; the count is a
*decision*, not a measurement, and CHAMPION §8's atom is undefined until this document pins it. (3)
**Provenance is where the import is worse than Fandom unless we make it better on purpose.** The API's
`extmetadata` carries **zero** licence fields for all 41 files; the licence lives in file-description
wikitext, and the wiki's own licence templates are **broken** — `{{Selbst erstellt}}` categorises only
inside `{{#ifeq:{{NAMESPACENUMBER}}|0}}`, which never fires on a `Datei:` page, so seven correctly
self-licensed images are invisible to the category system that is supposed to find them. And the
export's XML gives **one revision per page**, which is not enough to satisfy CC BY-SA attribution
without a second, separate crawl.

**The scary part is not scary and the boring part is.** Lua is a non-issue here (22 modules, 0 invoked
by any article, and the nine "modules with errors" are all `/Dok` stubs of unused Fandom boilerplate).
The thing that will actually break the importer is **re-import**: a second run against a changed wiki.
Empirically, across 13 months of real editing on the corpus's largest article, **24 of 27 paragraphs
survived byte-identically (88.9 %) and all 24 survivors changed ordinal position.** Content hash is a
viable passage identity; document order is not. That single measurement decides the schema.

And one thing nobody in this lineage has looked at: the wiki's most recently edited page is not an
article. It is `Karte:Andaria`, `contentmodel = interactivemap`, **98 620 bytes of JSON, 190 placed
markers with prose and links across 16 factional categories**, on an 8192×8192 canvas. It exports
cleanly over the same API. It is the richest single artefact in the corpus and the fixture does not
contain it (§1.5).

---

## 1. What arrives

### 1.1 The corpus, closed and reconciled

`siteinfo.statistics` reports 316 pages. The per-namespace inventory (live, `list=allpages`, 2026-07-27)
accounts for every one of them:

| ns | Name | Pages | In our export? |
|---:|---|---:|---|
| 0 | *(article)* | **74** | yes — 73 articles + 1 redirect |
| 2 | Benutzer | 14 | no |
| 4 | Eron Wiki (project) | 1 | no |
| 6 | Datei | 41 | metadata only, no binaries |
| 8 | MediaWiki | 2 | no |
| 10 | Vorlage | 124 | source only, in `templates.json` |
| 14 | Kategorie | 36 | names only |
| 502 | Blog | 1 | no |
| 828 | Modul | 22 | source only |
| **2900** | **Karte** | **1** | **no — and this is the miss, §1.5** |
| | **Total** | **316** | = `statistics.pages` ✓ |

**Namespace 1, 3, 7, 11, 15 (all Diskussion) are empty: this wiki has no talk pages at all.** That is
lucky and not typical. A wiki with talk pages has an entire second corpus of unsigned, threaded,
`~~~~`-stamped text with no clean mapping to anything in CHAMPION §8, and the honest answer for it is
"do not import" — a talk page is a log, and §11 refuses logs.

**One correction to the fixture README, and it matters for the test.** README §4 asserts
`Artikel (ns0) = 74 = siteinfo.statistics.articles ✓`. Both numbers are 74 but they count different
things. `apfilterredir=nonredirects` returns **73**; `apfilterredir=redirects` returns **1**
(`Kaiserliche Flotte` → `Kaiserliche Marine`, visible as `<redirect title="…"/>` in `eron-export.xml`).
Fandom's `statistics.articles` uses its own definition. **The acceptance test must therefore assert
`entries == 73` and `aliases == 1`, never `== statistics.articles`** — an importer that agrees with
`statistics.articles` here agrees by accident (§7).

### 1.2 The XML export as a format — what it contains

`eron-export.xml` is `export-0.11`, produced by `action=query&export=1`. Structure, verified by parsing:

```
<mediawiki version="0.11" xml:lang="de">
  <siteinfo>  sitename, dbname, base, generator, case, <namespaces> (all 42)
  <page> ×74
    <title> <ns> <id> [<redirect title=…/>]
    <revision> ×1          ← exactly one, on every single page
      <id> [<parentid>] <timestamp> <contributor><username><id>
      <origin> <model>wikitext</model> <format>text/x-wiki</format>
      <text bytes=… sha1=… xml:space="preserve">  ← the wikitext
      <sha1> [<comment>]
```

Counts across the 74 pages: 74 `<revision>` (never 2), 65 `<parentid>`, 74 `<contributor>`, 24
`<comment>`, 1 `<redirect>`. Text total **307 255 bytes**, identical to the sum in `articles.json` — the
two artefacts agree byte-for-byte, which is the fixture's own integrity proof.

### 1.3 What it omits — and each omission has a cost

| Omitted | Consequence |
|---|---|
| **Revision history** | Only the *current* revision ships. `<contributor>` is the **last editor**, not the author list. CC BY-SA requires attribution of authors (§6.3). Recovering it needs a second crawl: `prop=revisions&rvprop=user&rvlimit=max`, 73 more calls. |
| **Files (binaries)** | Not in the XML at all. Ever. Files are a separate pipeline over `prop=imageinfo` + 41 HTTP GETs (**56.7 MB**; 26.1 MB if orphans are skipped). |
| **Templates & modules** | Not included *unless requested*. Our export requested only ns0, so it has none. Fandom's `Special:Export` UI has a "Vorlagen einbinden" checkbox; the API equivalent is `&templates=1`. Without it, every `{{Person\|…}}` in the text is an unresolvable call. |
| **Talk pages, user pages, project pages** | Not included unless titled explicitly. Here: irrelevant (empty). Elsewhere: a decision. |
| **Category *membership*** | Present *implicitly*, as `[[Kategorie:…]]` inside wikitext. Category **pages** (ns14) and their descriptions are separate. |
| **The interactive map** | ns2900 is not ns0. Requesting it works (§1.5) — but nobody requests a namespace they do not know exists. |
| **Fandom-platform content** | Discussions/Forum (ns2000–2002), Message Walls (ns1200), blogs (ns502), and the site theme are outside `Special:Export` entirely. On this wiki that is 1 blog page. On an active wiki it can be the majority of the words. |

### 1.4 Can a non-technical GM actually obtain it? — a button, with one honest gap

Three channels, in descending order of what we verified:

1. **The MediaWiki API. Verified working, repeatedly, from this machine.**
   `action=query&export=1&exportnowrap=1&titles=…` in batches of ~15 returns a valid `export-0.11`
   document. This is the channel the fixture was built on and **the channel our importer should use.**
   It needs no account, no admin rights, and no wiki-owner cooperation. **The GM does not obtain
   anything: the GM pastes a wiki URL and we fetch it.** *That is the product answer to this question.*
2. **`Spezial:Exportieren` (the browser UI).** Standard MediaWiki: a textarea of page titles, a "include
   templates" checkbox, a "current revision only" checkbox, a category-expansion box. **Our automated
   client gets HTTP 403 (Cloudflare) on both the form and the submit URL** — that is a statement about
   our user-agent, **not** about a human in a browser, and *I could not determine* whether the page
   renders for a logged-in human. Assume it does; do not build on the assumption.
3. **A full wiki dump.** Historically Fandom published `…_pages_current.xml.7z` under
   `s3.amazonaws.com/wikia_xml_dumps/…`; that path now returns **403** for `deeron`. *I could not
   determine* whether Fandom still offers dumps to wiki owners today. **Do not put "ask Fandom for a
   dump" in any onboarding flow until someone checks.**

**Product ruling, and it is the difference between a button and a project:** the importer's primary
input is a **URL**, not a file. `https://eron.fandom.com/de/` → we resolve `api.php`, read `siteinfo`,
enumerate `allpages`, batch `export=1`, and show a preview. The XML-file upload path exists as a
fallback for wikis that are dead, private, or self-hosted — and because a GM who has already downloaded
a dump should not be told to go find the wiki again. **Two inputs, one pipeline, and the pipeline starts
after the XML exists.** That keeps `Special:Export`'s uncertainty off the critical path.

### 1.5 The artefact the fixture missed — `Karte:Andaria`

`graph.json.edges_other_namespaces` contains exactly one edge: `Eron Wiki → Karte:Andaria`, `ns: 2900`.
The fixture recorded the pointer and not the target. I fetched it:

```
action=query&export=1&exportnowrap=1&titles=Karte:Andaria
  → <model>interactivemap</model> <format>text/plain</format>
    <text bytes="98620">{ "mapImage": "Andaria 03.02.2024.jpg",
      "mapBounds": [[0,0],[8192,8192]], "origin": "bottom-left",
      "coordinateOrder": "xy", "categories": [ …16… ], "markers": [ …190… ] }
```

- **190 markers**, each `{categoryId, position:[x,y], popup:{title, description, link}}`.
- **16 categories** with colour and symbol — and they are not decorations, they are **polities**:
  Südliche Minenreiche (33 markers), Terabur (30), Numerien (28), Elfenunion (28), Nördliche Minenreiche
  (26), Eromir (7), Dal Ork (6), Grau Demmaros (5), Oslavisches Sheikat (5), Freie Städte (4), Varen
  (4), Magische Akademien (4), Atlanische Ruinen (3), Klipplande (3), Dünenmeer (2), Resif (2).
- **9 512 bytes of marker prose**, wikilinked. 268 distinct link targets in the popups — of which
  **19 exist as articles and 249 do not.**
- Last edited **2025-12-07**. Every ns0 article was last edited in 2024 or earlier. **The map is the only
  living page on this wiki.**

Three consequences, and they are large:

1. **190 named, positioned places is the best gazetteer in the corpus** and it is denser than the
   articles. `Andaria` — the continent — has no article and is the #3 most-wanted red link (15 incoming);
   it *does* have a map with 190 pins on it.
2. **`mapBounds` + `origin` + `coordinateOrder` is a coordinate contract**, and it is the same shape as
   the UVTT concerns in CHAMPION §9. A marker is a `Location` with a position. This is the one place in
   the whole import where the wiki half hands the tactical half something real, for free.
3. **It is also a licence trap.** `mapImage` is `Andaria 03.02.2024.jpg` — 7.2 MB, the largest file in
   the corpus, and it carries **no licence statement of any kind** (§6).

**Ruling: `interactivemap` is a first-class import target, not a curiosity.** It costs ~2 days (it is
JSON, not wikitext) and it returns more structured world-data than any other single page. It must go
into the fixture before the next round: **`design/fixtures/eron/map-andaria.json` is a named gap.**

---

## 2. Wikitext → passages: the contract

### 2.1 The problem, stated exactly

CHAMPION §8 makes the **passage** the atom: paragraph-sized, individually revealable, individually
citable, optionally carrying a mechanical clause. A Fandom article is a page of many. The migration
contract must therefore answer: *given this wikitext, which byte ranges become passages, in what order,
with what identity, and what happens to everything that is not one of them?*

This is not a parsing question. It is a **counting** question with a product consequence, and the corpus
proves it: the same 73 articles yield

| Boundary rule | Passages | Per article |
|---|---:|---:|
| **V1 — one infobox field = one passage; one blank-line-delimited prose block = one passage; one contiguous list block = one passage** | **1 100** | 15.1 |
| V2 — as V1, but every bullet inside a multi-value field or list becomes its own passage | 1 525 | 20.9 |

Both are defensible. V2 makes `Schlachten = *Schlacht von Ktuvuk *Eroberung von Gluthafen …` into eleven
addressable battles; V1 makes it one row that happens to hold eleven doors. **Nothing in CHAMPION
decides this, and until it is decided the atom is undefined.** §2.6 rules.

*(The fixture README §5.2 reports 799 candidate passages — 583 infobox + 216 prose. My decomposer, run
over the same file, reports 543 infobox field instances and 497 prose blocks ≥40 chars. The 543/583 gap
is redirect handling and magic-word filtering; the 216/497 gap is a different paragraph rule. I cannot
reconcile the README's number because the script that produced it is not in the fixture. **This is
exactly the failure the contract exists to prevent: two competent readers of the same corpus disagreed
by 2.3× on the product's atom.** My numbers are reproducible from the decomposer in §2.4; if the
README's rule is preferred, it must be written down and mine discarded — but one of them must be
normative.)*

### 2.2 The mapping table

| Wikitext construct | Corpus count | → Chronicle | Rule |
|---|---:|---|---|
| Leading `{{Infobox}}` call | 44 articles | `Entry.type` + `Entry.fields[]` | §4. The template **name** is the type; each filled parameter is one passage. |
| Infobox parameter, single value | 431 | **Passage**, `kind: feld` | Carries `feld_schluessel` (the `source` key) + `feld_label` (the `<label>`), never the raw key alone. |
| Infobox parameter, bullet list | 112 (20.6 %) | **Passage**, `kind: feld`, `mehrwertig: true` | V1: one passage, values preserved as an ordered array. §2.6. |
| `== H2 ==` … `====== H6 ======` | 413 sections | `Passage.pfad[]` — a path, **not** a passage | A heading is an address, not content. 88 of 413 sections (21 %) have **no body at all**: they are pure containers. Minting them as passages would create 88 empty atoms. |
| Prose paragraph (blank-line delimited, ≥40 chars plain) | 497 | **Passage**, `kind: absatz` | The atom CHAMPION was designed around. Median 390 chars, mean 476, p90 895, max 3 466. |
| Prose paragraph <40 chars | 16 | **dropped**, logged | Almost all are stray fragments. Threshold is a config value, not a constant. |
| Contiguous `*`/`#` list block | 60 blocks / 187 items | **Passage**, `kind: liste` | V1. But see §2.7 — this is the genuinely unresolved one. |
| `'''bold'''` / `''italic''` | 192 / 224 | inline marks | Preserved as marks on the passage, not as structure. |
| `[[Ziel]]` / `[[Ziel\|Text]]` | 3 105 occurrences | `Link` (blue) or `RoterLink` (red) | §5. |
| `[[Datei:X\|mini\|Bildunterschrift]]` | 21, in 11 articles | `Asset` ref + a **caption passage** | Trap: **all 21** sit **glued to the front of a prose block** (Erismus's first block is `[[Datei:…]]\nDer Erismus ist…`). Must be lifted before the paragraph is hashed, or the atom's identity contains a filename. |
| `<blockquote>` | 8, in 2 articles | **Passage**, `kind: zitat` | Rendered as a quote; still an ordinary passage. |
| Wikitable `{\|` | **1**, in 1 article | **quarantine** — imported as `kind: rohblock`, rendered verbatim, flagged | §2.8. |
| `{{DISPLAYTITLE:…}}`, `{{DEFAULTSORT:…}}` | 2 / 1 | `Entry.anzeigename`, `Entry.sortierschluessel` | Never a passage. |
| `<br>`, `<nowiki>` | 4 / 4 | normalised away / escaped | |
| `<ref>` citations | **0** | — | §2.9. This zero is a finding, not an absence of data. |
| `<gallery>`, `{{#invoke}}`, `{{#if…}}`, `~~~~`, external links | **0 each** | — | Not present in this corpus. Code must still refuse them safely. |
| `#WEITERLEITUNG [[X]]` | 1 | `Alias`, not `Entry` | Never a passage, never a door. |

### 2.3 The parser traps, each one real and counted

1. **`}}` followed immediately by prose on the same line — 29 occurrences across 28 of 73 articles
   (38 %).** `Der Große Krieg` ends its infobox with `…\|Nächster=[[Numerion Rebellion]]}}'''Der Große
   Krieg''' war der größte…`. A line-based or `\n\n`-based splitter puts the entire 2 453-byte infobox
   and the 943-char lead into **one passage**. The only correct approach is **balanced-brace scanning**
   from offset 0, with `[[…]]` and nested `{{…}}` depth tracked separately.
2. **Pipes inside link targets.** `\|Kaste=[[Adel in Andaria\|Hochadel]]` — splitting parameters on a
   naive `|` regex destroys the link. Parameter splitting must be depth-aware on both `{{}}` and `[[]]`.
3. **Multi-line parameter values.** `Verwandte` in `Arvex Aurelius Paradon` is 379 characters over 15
   lines. Newlines inside a template call are legal and common (112 fields, 20.6 %).
4. **First-letter capitalisation.** `MediaWiki case=first-letter`: the wikitext writes `[[n. K.]]`, the
   page is `N. K.`. Link resolution must canonicalise (`_`→space, trim, `#`-fragment strip, uppercase
   first letter) or every lowercase-initial link becomes a spurious red link.
5. **Underscores and fragments in file references.** §6.2 — four spellings of the same filename in one
   corpus.
6. **The German linktrail.** `siteinfo.general.linktrail = /^([äöüßa-z]+)(.*)$/sDu` — `[[Kaiserreich]]s`
   renders as one word "Kaiserreichs" linking to `Kaiserreich`. A renderer that ignores this produces
   `Kaiserreich s`. Present throughout the corpus.

### 2.4 The decomposer, specified

```
decompose(wikitext, title, pageid, revid) →
  1. scan balanced {{…}} from offset 0; the maximal prefix of adjacent
     top-level calls is the INFOBOX REGION; everything after is BODY.
  2. for each infobox call: name → Entry.type candidate;
     split body on depth-0 '|'; each 'k=v' with v non-empty → one feld passage,
     in declaration order of the template's <infobox> XML, not source order.
  3. strip {{DISPLAYTITLE|DEFAULTSORT}} anywhere in BODY → Entry metadata.
  4. lift every [[Datei:…]] out of BODY → Asset ref + caption passage.
  5. split BODY on ^(={2,6})\s*(.+?)\s*\1\s*$ → segments carrying a heading PATH
     (level 2 = path[0], level 3 = path[1], …).
  6. within each segment: consecutive non-blank lines of the same kind
     ('*'/'#' → list, else para) form one block; blank line flushes.
  7. drop para blocks whose plain-text length < 40; log each drop.
  8. emit passages in document order with pfad[] and ordnung.
```

Determinism requirement, inherited from gate **Nachgerechnet** (CHAMPION §12.4): the decomposer must be
**locale-free and byte-stable**. Run twice on the same input on Windows and Linux with `LANG=tr-TR`, it
must emit byte-identical output. German umlauts, `ß`, `Yal'it`'s apostrophe and `Eron (Planet)`'s
parentheses are all in this corpus specifically to exercise that.

### 2.5 Identity and lineage — the measurement that decides the schema

A migrated passage has **no revelation history, no author at our table, and no Beleg.** It is the exact
inverse of everything CHAMPION §7 was built for: canon that arrived without being minted. The `Quelle`
sum type (`Wurf | Gesprochen | Gehört | Passage`, CHAMPION §8.3, *untouched*) has no constructor for it,
and it must not get one — adding `Import` as a fourth `Quelle` would put imported text on the same
footing as a die roll, which is the one thing this product exists to distinguish.

**Ruling: an imported passage is not a `Quelle` at all. It is a passage with `praegung = null` and a
`Herkunft` record.**

```text
ImportHerkunft (passage_id PK,
                import_id,                -- one row per import run
                quell_wiki_url,           -- https://eron.fandom.com/de/
                quell_artikel_url,        -- .../wiki/Der_Große_Krieg
                quell_pageid, quell_revid,-- 258, 1072
                quell_sha1,               -- the <revision><sha1> of the page
                passage_sha256,           -- hash of the normalised passage text
                pfad[],                   -- ['Geschichte','Vorgeschichte','…']
                ordnung,                  -- ordinal at import time — advisory only
                lizenz,                   -- 'CC-BY-SA-3.0'
                autoren[],                -- ['Cornelius Holloway'] (+ anon count)
                importiert_at)
```

`praegung = null` renders in die Herkunftsschicht as a fourth chip type — not a Saturday, not a
Vollmacht, not a Brief, but **„übernommen"**, with the source URL and the licence. The Saatbilanz
(CHAMPION §3.1) gains one term and the line becomes honest: *„1 100 Absätze übernommen · 0 am Tisch
entstanden"* on day one, which is exactly what the GM should see, and exactly the number the product
then makes go down as a share.

**Why `passage_sha256` and not `ordnung` is the identity — measured, not argued.** I pulled four
revisions of `Erismus` (72 revisions, 2023-05-05 → 2024-06-22) and decomposed each:

| From → To | Paras | Survived byte-identical | Gone | New | Survivors that changed ordinal |
|---|---|---:|---:|---:|---:|
| rev 788 (2023-05-05) → rev 910 (2023-06-27) | 1 → 27 | 0 | 1 | 27 | — |
| **rev 910 (2023-06-27) → rev 1139 (2024-06-22)** | **27 → 42** | **24 (88.9 %)** | **3** | **18** | **24 of 24 (100 %)** |
| rev 1139 → rev 1140 (same day) | 42 → 42 | 42 (100 %) | 0 | 0 | 0 |

**Thirteen months of real editing on the corpus's largest article: content hash survives 88.9 % of the
time; ordinal position survives 0 % of the time.** An importer keyed on `(pageid, section, ordinal)`
would, on a second run, destroy and recreate 24 passages that did not change a byte — and with them
every Revelation, every citation and every footnote pointing at them. An importer keyed on
`(pageid, passage_sha256)` reconciles all 24 as unchanged.

**Therefore, the re-import contract:**

- Match on `(quell_pageid, passage_sha256)` → **unchanged**, keep passage id, Revelations survive.
- New hash under a known pageid → **candidate new passage**; hold in a review queue, do not auto-mint.
- Hash disappeared → **candidate removal**; never delete. Mark `verwaist`, keep it addressable. A passage
  someone at the table has already been *told* cannot be un-told by an upstream edit; that is
  `Berichtigung` (CHAMPION §7.1–7.5), and it is a human gesture.
- The 3-of-27 that genuinely changed are the interesting ones and are precisely what a diff review should
  show a GM. **Sixteen of these per year per large article is a reviewable number.** Thousands would not
  be — which is the whole reason the hash rule matters.

### 2.6 The boundary ruling — V1, with one named exception

**V1 is the contract: one infobox field = one passage; one blank-line-delimited prose block = one
passage; one contiguous list block = one passage. 1 100 passages over 73 articles.**

Reasons, in order of weight:

1. **V1 preserves the author's own unit.** A GM who wrote `Verwandte=` as one field meant one fact
   ("these are his relatives"), not fifteen. Splitting it invents an authorial decision.
2. **V2 makes the Revelation surface unusable.** Under V2 a GM revealing "Arvex's family" must grant 15
   revelations instead of 1. CHAMPION §6's per-character projection is priced per passage.
3. **V1 keeps the atom count within the measured editor envelope** (CHAMPION §2: 0.087 ms/keystroke at
   300 passages). `Erismus` alone is 101 passages under V1 and 101 under V2 — but `Olav der Ehrliche` is
   75 under V1 and 96 under V2, and the corpus total moves 1 100 → 1 525. **`Search at scale` is red for
   a fifth round** (CHAMPION §12.4); do not hand it 39 % more rows for a nicety.
4. **The exception, and it is load-bearing:** a multi-value field's individual values are still **first-
   class link targets**. `Schlachten` is one passage with **eleven doors**. The door lives on the value,
   not on the passage. This is `mehrwertig: true` plus an ordered `werte[]` array, and it costs nothing.

**What V1 costs, said plainly:** you cannot reveal "Arvex knows about his brother Melvan but not his
brother Medovin." Sub-field revelation is refused in slice 1. If a table asks for it, V2 is a migration,
not a rewrite — `werte[]` is already there.

### 2.7 The 187 list items — unresolved, and named as unresolved

60 list blocks, 187 items. The fixture README (§5.2) counts 212 and calls the decomposition open; my
decomposer counts 187 over 73 articles (the difference is the redirect and list blocks nested inside
infobox values, which I attribute to the field). **Either way the design question is untouched and I
cannot close it from data.**

The problem is that a wiki list is three different things wearing one hat:

- `Silberwahnsinn § Bekannte Fälle` — a list of **relations** (`Person → hat Krankheit`). Semantically a
  `PassageRelation`, not prose.
- `Kaiserliche Marine § Ränge` — a list of **ordered ranks**, each with a gloss. Semantically an ordered
  collection with fields; closer to an `Entry` list than to a paragraph.
- `Erismus § …` — genuine bulleted prose. A paragraph that chose bullets.

**A rule that treats all three the same is wrong for two of them, and there is no signal in the wikitext
that distinguishes them.** V1 (one block = one passage) is therefore chosen as the *safe* default, not
the *right* one: it loses no text, mints no wrong relations, and leaves the promotion gesture ("this
list is a relation") as a human action in the importer's review step. **Open decision, belongs in
`OPEN-DECISIONS.md`.**

### 2.8 What is refused, and what the user sees instead

**No wikitext is executed. No template is expanded. No Lua runs. Ever.** Invariant 2 (rule packages are
declarative, never arbitrary code execution) applies to imports with equal force: an import is untrusted
input from the internet (invariant: uploads are untrusted), and template expansion is *by definition*
executing a stranger's program. The importer reads template *definitions* to learn field names (§4); it
never runs one.

Consequently, three things are quarantined rather than rendered:

| Case | Corpus | Behaviour |
|---|---:|---|
| A wikitable `{\|…\|}` | 1 | `kind: rohblock`. Rendered as monospaced source inside a bordered card with the header **„Aus dem Wiki übernommen — nicht umgewandelt"** and a link to the source article. It is a passage, it is citable, it is honest. |
| An unknown template call in body text | 0 | Same treatment: `rohblock` showing `{{Name\|…}}` verbatim. **Never silently dropped** — a silently dropped template is a lie about completeness. |
| `#invoke`, parser functions, `<script>`, raw HTML | 0 | Stripped, and **counted in the import report**. The report line reads *„3 Konstrukte konnten nicht übernommen werden"* with the list. |

The whole design principle: **the import report is a first-class artefact of the import, and it is a
list of losses, not a success banner.** "Better than Fandom" starts by telling the truth about what did
not come across.

### 2.9 The zero that means something: no citations exist

**`<ref>` appears zero times in 307 255 bytes.** Not one article cites anything. That is normal for a
homebrew wiki and it is worth stating because CHAMPION's whole provenance apparatus (die
Herkunftsschicht, der Beleg, Nachrechnen) has, at import time, **nothing to attach to.** Every one of
the 1 100 imported passages arrives with the same provenance: *"a person typed this into a Fandom page
between 2022 and 2024."*

That is not a weakness of the import. **It is the strongest possible argument for the product**, and it
should be said out loud in the pitch: Fandom gave this world 1 153 edits and cannot tell you which
sentence came from play. From the first Saturday after the import, ours can. The import's job is to make
the *before* picture legible so the *after* picture is visible.

### 2.10 One real article, end to end — `Der Große Krieg`

Input: 6 226 bytes, `pageid 258`, `revid 1072`, last edited 2024-01-24, one template (`Vorlage:Krieg`),
zero categories, zero images, 65 distinct link targets, 6 headings across 3 levels.

Output: **`Entry`** `{type: 'ereignis' ← Vorlage:Krieg, titel: 'Der Große Krieg', quelle: …/wiki/Der_Große_Krieg, lizenz: 'CC-BY-SA-3.0', autoren: ['Cornelius Holloway']}` and **23 passages** — 16 `feld`, 7 `absatz`, 0 `liste`:

| # | kind | address | value / opening | doors |
|---:|---|---|---|---:|
| 01 | feld | `Krieg.Name` → *Name* | `Der Große Krieg` | 0 |
| 02 | feld | `Krieg.Beginn` → *Beginn* | `745` | 0 |
| 03 | feld | `Krieg.Ende` → *Ende* | `770` | 0 |
| 04 | feld ✦ | `Krieg.Kontrahent1` | `Der Block` + 3 values | **4** (`Der Block`, `Dal Ork`, `Ork Imperium`, `Uril Ul`, `Oslavisches Sheikat`, `Chi-Sen Reich` — 6 refs, all red) |
| 05 | feld ✦ | `Krieg.Kontrahent2` | `Allianz` + 4 values | 3 red, 1 blue (`Kaiserreich`) |
| 06 | feld ✦ | `Krieg.Kommandeure1` | 5 values | 6 red |
| 07 | feld ✦ | `Krieg.Kommandeure2` | 2 values | 1 red, 1 blue (`Arvex Aurelius Paradon`) |
| 08 | feld | `Krieg.Truppen1` | `Uril Uls Heer` | 0 |
| 09 | feld ✦ | `Krieg.Truppen2` | 5 values | 1 red, 1 blue |
| 10 | feld | `Krieg.Verluste1` | `6.000.000 (Militär) / 34.000.000 (Zivil)` | 0 |
| 11 | feld | `Krieg.Verluste2` | `20.000.000 (Militär) / 70.000.000 (Zivil)` | 0 |
| 12 | feld ✦ | `Krieg.Schlachten` | **11 values, 403 chars** | **11 red** |
| 13 | feld ✦ | `Krieg.ESchlacht` | `Schlacht von Quellgard` | 1 red |
| 14 | feld | `Krieg.Gleichzeitiger` | `Zweiter Chi-Sen Krieg` | 1 red |
| 15 | feld | `Krieg.Endergebnis` | `Sieg` | 0 |
| 16 | feld | `Krieg.Nächster` | `Numerion Rebellion` | 0 (blue) |
| 17 | absatz | *(lead)* | *„Der Große Krieg war der größte und verlustreichste bewaffnete Konflikt des Andarischen Kontinents…"* (943 chars) | 12 red / 5 blue |
| 18 | absatz | `Geschichte › Vorgeschichte › Weitreichender Historischer Kontext` | *„Im Jahr 8 vor Gründung des Kaiserreichs…"* (802) | 13 red / 4 blue |
| 19 | absatz | `Geschichte › Vorgeschichte › Unmittelbar vor dem Großen Krieg` | *„Der Große Krieg, der im Jahr 745…"* (436) | 4 red / 2 blue |
| 20 | absatz | `…Unmittelbar vor dem Großen Krieg` | *„Uril Ul schaffte es nach dem Blutigen Frieden…"* (596) | 3 red / 1 blue |
| 21 | absatz | `…Unmittelbar vor dem Großen Krieg` | *„Die Eskalation erfolgte…"* (470) | 5 red / 3 blue |
| 22 | absatz | `Geschichte › Kriegs Verlauf › Die Schlacht von Ktuvuk` | *„Im Jahr 745 startete die Kaiserliche Sonnenmeerflotte…"* (346) | 6 red / 3 blue |
| 23 | absatz | `…Die Schlacht von Ktuvuk` | *„Uril Ul, Großhäuptling der Orks, fand jedoch Unterstützung…"* (392) | 5 red |

✦ = `mehrwertig`. **Three headings — `Geschichte`, `Vorgeschichte`, `Kriegs Verlauf` — produce no
passage at all**; they exist only inside `pfad[]`. That is 3 of this article's 6 headings and 88 of the
corpus's 413 sections.

**And the second article, which is the one that breaks naive renderers: `Arvex Aurelius Paradon`.** 1 067
bytes, `Vorlage:Person`, **18 passages, all of them infobox fields, zero prose, zero sections, zero
categories, 30 links of which 24 are red.** The house's namesake, the man who kills Uril Ul in the lead
paragraph of `Der Große Krieg`, has no article text whatsoever. **A reader, an exporter, a search
snippet generator or a "first paragraph" preview that assumes a lead paragraph exists breaks on the most
prominent character in this wiki.** Five of 73 entries (7 %) are prose-free: `Akkator`, `Arvex Aurelius
Paradon`, `Eron (Planet)`, `Gotteserhöhung`, `Reptiloide` — plus the redirect `Kaiserliche Flotte`,
which is an `Alias` and not an entry at all.

---

## 3. Templates and Lua — where migrations die, and where this one does not

### 3.1 The classification, all 146

| Class | ns10/828 | **Used by an article** | Migration verdict |
|---|---:|---:|---|
| **A · Semantic infobox** (`<infobox>` XML) | 18 | **9** | **Becomes structured fields.** §4. |
| **B · Pure formatting** (`{{!!}}`, `{{-}}`, `{{*}}`, `{{=}}`, `{{(}}`, `{{))}}` … + `/Dok` pages) | 46 | 0 | **Dropped.** These are wikitext-escape helpers; they have no meaning outside MediaWiki. |
| **C · Navigation** (`Navbox` + its `/Dok`) | 2 | 0 | **Becomes the graph.** A navbox is a hand-maintained rendering of links we already extract. |
| **D · Licence / provenance boxes** (`Selbst erstellt`, `PD`, `CC-BY-SA`, `CC-by`, `GFDL`, `Bildzitat`, `Erlaubnis`, `Keine Vorauswahl`, `From Wikimedia`, `Dateiinfo` …) | 32 | 0 (0 in ns0; **11 on file pages**) | **Becomes provenance metadata.** §6. These are the *most valuable* templates in the export and they are invisible to any importer that only looks at ns0. |
| **E · Lua-backed** (`{{#invoke:}}` → `Hatnote`, `Mbox`, `Navbox`, `Quote`, `Dialogue`) | 11 templates + 22 modules | **0** | **Not executed, not ported.** §3.2. |
| **F · Parameterised formatting/logic** (`Cite web`, `StructuredQuote`, `Dokumentation`, `Namespace`, `T`, `Trim`, `Cols`, `Tocrechts` …) | 14 | 0 | **Dropped**, individually logged if ever encountered in body text. |
| **G · Empty** (`Vorlage:Regierung 2`, 0 bytes) | 1 | 0 | Ignored. |

**137 of 146 are used by nothing.** Fandom ships every new wiki with `Infobox Album`, `Infobox Episode`,
`Infobox Spiele`, `Infobox Buch`, a Wikipedia-derived Hatnote/Mbox/Navbox stack and 50 `/Dok`
documentation subpages. **An importer that migrates all templates imports 94 % boilerplate.** The rule is
the inverse: *migrate templates that are transcluded by at least one article; list the rest in the report
and touch none of them.*

### 3.2 The nine "modules with errors" are a non-event, and here is why

`Kategorie:Scribunto-Module mit Fehlern` has **9 members** (live, verified). All nine:

```
Modul:Dialogue/Dok            Modul:Namespace detect/config/Dok
Modul:Hatnote/Dok             Modul:Namespace detect/data/Dok
Modul:Mbox/Dok                Modul:Namespace detect/Dok
Modul:Mbox/data/Dok           Modul:Navbox/Dok
Modul:Quote/Dok
```

**Every one is a `/Dok` documentation subpage of an unused Fandom boilerplate module.** They error
because the documentation harness they reference is not installed. Zero articles invoke any module (`0`
occurrences of `{{#invoke` in 307 255 bytes of article wikitext); the 22 modules total 11 446 bytes, all
Wikipedia-derived infrastructure. **The entire Lua layer of this wiki is decoration on a floor nobody
walks on.**

This dissolves the migration risk everyone expects — and the honest framing is: **it dissolves *here*,
because this wiki's authors never used templates for anything but infoboxes.** On a wiki whose authors
built a Lua-driven stat calculator, nothing dissolves and the answer is still "we do not run it." §3.4.

### 3.3 What the user sees where presentation used to be

Three honest sentences, which belong in the importer UI verbatim:

> **Wir übernehmen, was du geschrieben hast — nicht, wie Fandom es angezeigt hat.**
> Infoboxen werden zu Feldern. Kategorien und Links werden zu Beziehungen. Navigationsleisten,
> Layout-Vorlagen und Skripte werden nicht übernommen; wir zeigen dir jede einzelne, die wir
> weggelassen haben.
> Was wir nicht umwandeln konnten, verschwindet nicht — es steht als Rohblock im Artikel, mit einem
> Link auf das Original.

Concretely, for Eron: **nothing visible is lost**, because the only presentational template in use is the
infobox and we render infoboxes better than Fandom (as fields, with per-row provenance — CHAMPION §3.2).
The single wikitable becomes a `rohblock`.

### 3.4 How much of a *typical* wiki is unmigratable — the honest answer

**I cannot answer this from one corpus and I will not pretend to.** What Eron proves is a *lower bound
on the good case*: a wiki whose authors used Fandom's portable-infobox tooling and nothing else migrates
essentially whole. What it cannot tell us is the distribution across wikis, because Eron is a two-author,
1 153-edit, zero-talk-page, zero-citation wiki and the median Fandom wiki is not.

What is structurally true regardless of corpus, and is the part worth stating:

- **Presentation templates never migrate, on any wiki.** They encode MediaWiki's rendering model.
- **Lua never migrates, on any wiki**, and that is a policy, not a limitation (invariant 2).
- **Semantic templates migrate exactly as well as they were authored.** Portable infobox → total. Classic
  wikitable infobox → heuristic, lossy, needs a human. Free-form `{{Fakt|…}}` conventions → hopeless.
- **The ratio of semantic to presentational templates is the single number that predicts import
  quality**, and we can compute it for any wiki *before* the user commits: read ns10, count
  `<infobox>` vs. the rest, count transclusions. **That belongs in the importer's preview screen as a
  score, not in a support article.** For Eron: 9 of 9 transcluded templates are semantic — 100 %.

---

## 4. Infoboxes → structured data. The best news in the corpus.

### 4.1 They are portable infoboxes, and here is the evidence

**18 of 18 infobox templates use Fandom's `<infobox>` XML markup. Zero use classic wikitable markup.**
`Vorlage:Person`, verbatim from `templates.json`:

```xml
<infobox theme-source="Farbe">
  <title source="Name"><default>{{PAGENAME}}</default></title>
  <image source="Bild"/>
  <group>
    <header>Beschreibung</header>
    <data source="Spezies"><label>Spezies</label></data>
    <data source="Größe"><label>Körpergröße</label></data>
    …
  </group>
  <group>
    <header>Biografische Daten</header>
    <data source="Geburt"><label>Geburtsdatum</label></data>
    …
  </group>
</infobox>
```

**Say it plainly, because it is the headline of this section:** a portable infobox is *already* a schema.
`source` is the machine key, `<label>` is the display name, `<group><header>` is the section, `<title
source>` names the entity, `<image source>` names the portrait, `<default>` supplies fallbacks, and
`theme-source` is pure presentation to be discarded. **We do not infer a schema from rendered HTML. We
read one.** That is the difference between a two-day parser and a two-month heuristic-plus-AI project,
and it is why a Fandom import is tractable at all.

### 4.2 The mapping is total — 543 of 543

I compared every filled parameter in every article against the `<data source="…">` set declared by its
template:

| Template | Field instances | **Undeclared (would be lost)** | Declared but never filled |
|---|---:|---:|---:|
| `Person` | 359 | **0** | 2 |
| `Regierung` | 56 | **0** | 1 |
| `Krieg` | 39 | **0** | 3 |
| `Rüstung/Waffe` | 25 | **0** | 6 |
| `Infobox Charakter` | 19 | **0** | 7 |
| `Rasse/Spezies` | 17 | **0** | 2 |
| `Stadt` | 14 | **0** | 10 |
| `Planet/Mond` | 7 | **0** | 3 |
| `Ereignis` | 7 | **0** | 8 |
| **Total** | **543** | **0** | **42** |

**Zero data loss on a straight `source` → field mapping, across the entire corpus.** And 42 declared-but-
empty fields — the schema is wider than the data. `Vorlage:Stadt` declares 20 fields and the two cities
that use it fill 7 each. **A sheet renderer must omit empty fields, not show placeholders**, or `Bjoldiri`
renders as 13 blank rows.

### 4.3 The mapping into CHAMPION's entity fields

```text
Vorlage:X                      → Entry.type          (typ_quelle: 'vorlage', typ_roh: 'Person')
<title source="N"> / PAGENAME  → Entry.titel
<image source="Bild">          → Entry.portraet_asset_id  (after §6.2 normalisation)
<group><header>H</header>      → FeldGruppe.name = H, ordnung = declaration order
<data source="K"><label>L>     → Feld { schluessel: K, label: L, gruppe: H, ordnung: n }
theme-source="Farbe"           → DISCARDED (presentation)
<default>…</default>           → Feld.vorgabe, applied only when the article omits the parameter
{{Person|K=V}}                 → Passage { kind: 'feld', feld_schluessel: K,
                                           wert_roh: V, werte[]: V split on ^\* if mehrwertig,
                                           refs[]: resolved links }
```

**The type taxonomy this corpus actually has** — nine templates, 44 typed articles, 29 untyped:

| Template | Articles | → Chronicle type | Note |
|---|---:|---|---|
| `Person` | 20 | `charakter` | 41 declared fields, 14–28 typically filled |
| `Regierung` | 9 | `organisation` | polity, house and council all use it |
| `Rasse/Spezies` | 8 | `spezies` | |
| `Rüstung/Waffe` | 4 | `gegenstand` | **has `schaden`, `bonus`, `klasse`, `schutzwert` — mechanical fields, §4.5** |
| `Krieg` | 3 | `ereignis` | |
| `Infobox Charakter` | 2 | `charakter` | **duplicate schema, §4.4** |
| `Stadt` | 2 | `ort` | |
| `Planet/Mond` | 1 | `ort` | |
| `Ereignis` | 1 | `ereignis` | |

### 4.4 Real wikis carry competing schemas — the mapping step is human, and must be

`Person` and `Infobox Charakter` both model characters, in the same wiki, at the same time. Their fields
disagree in exactly the way that punishes automation:

| Concept | `Person` (20 articles) | `Infobox Charakter` (2 articles) |
|---|---|---|
| eye colour | `Augen` | `Augenfarbe` |
| death | `Tod` / `Todesort` | `Sterbedatum` / `Sterbeort` |
| height | `Größe` (label *Körpergröße*) | `Körpergröße` (a **source**, not a label) |
| marital status | — | `Familienstand` |
| debut / actor | — | `Debüt`, `Darsteller` (Fandom TV boilerplate, never filled) |

And the casing convention differs *by template*: `Person`/`Krieg`/`Stadt` use `TitleCase`
(`Geburtsort`), `Regierung`/`Rüstung/Waffe`/`Rasse/Spezies` use `lowercase_snake`
(`hervorgegangen_aus`, `durchschn_alter_der_pupertät` — including the author's typo, which we must
preserve, not fix). **Any importer that normalises field keys silently merges `Augen` and `Augenfarbe`
or fails to; both are wrong without a human.**

**Ruling: the template→type mapping screen is a mandatory, non-skippable step of the import**, and it is
the importer's single most important piece of UX. It shows nine rows, pre-filled with our best guess,
each with a type dropdown and a field-alias table, and a live preview of one real article. It takes a GM
about four minutes for a wiki this size and it is the moment the import stops being a conversion and
becomes a decision. **This is also where K7 is enforced: the screen is generated from the *user's*
templates. There is no Eron in the code.**

### 4.5 Where the fusion actually happens — `Rüstung/Waffe`

`Vorlage:Rüstung/Waffe` declares `schaden`, `bonus`, `klasse`, `schutzwert`, `schildwert`,
`verzauberung`, `seltenheit`, `kaufpreis`, `verkaufspreis`. Four articles fill 25 instances of them.

These are not encyclopedia facts. **They are mechanical values, and CHAMPION §8's passage can carry a
declarative mechanical clause.** This is the one place in the whole corpus where a wiki field is one
short step from a rule.

**And the ruling has to be a refusal, for the same reason invariant 2 exists:** an imported field is
**never** automatically a clause. `schaden = 1d8+2` in someone's Fandom wiki is a string that resembles
a dice expression; making it live would be the product inventing rules from untrusted text. What the
importer does instead: it **flags** the passage `klausel_kandidat: true`, and the GM promotes it by hand
in the rule-builder (K2), where the AST is validated and the package is pinned. **Import proposes;
a human mints.** That is `Nichts wird automatisch Kanon` applied to structure instead of prose, and it
is the same sentence.

---

## 5. Categories, links and redlinks

### 5.1 Categories: this wiki has none, and that is the argument

**3 of 73 articles carry any category at all** — `Bodin`, `Ekmont von Radfurt`, `Irme`, all three in
`Kategorie:Charaktere`. 43 categories are declared, 28 are non-empty, and of those 28, **exactly one has
article members.** The rest are template-maintenance categories (`Vorlagendokumentation` 50,
`Lizenzvorlagen` 15, `Infobox-Vorlagen` 10, `Scribunto-Module mit Fehlern` 9…).

`querypage=Uncategorizedpages` agrees: 71.

**Mapping:** `[[Kategorie:X]]` → `Etikett` (CHAMPION §8, existing table, no new concept). Maintenance
categories (any category whose members are ≥80 % non-ns0) are **not** imported as tags; they become
import-report lines.

**The consequence is the strongest "in besser" argument in this whole brief.** Two authors wrote 1 153
edits and 307 KB of world over three years and **classified almost nothing**, because Fandom's
classification is a second, optional, manual duty that competes with writing. Meanwhile they filled 543
infobox fields, because the infobox is the form that is *in front of you while you write.* **The type
must fall out of the structure the author already fills in, never out of a second obligation they will
ignore.** That is a measured product principle, not a slogan — and it means Chronicle's `Etikett` system
must be *derived and suggested*, never *required*.

### 5.2 Links: the graph is dense and hub-shaped

556 article→article edges over 73 articles. Hubs by in-degree: `Kaiserreich` 32, `Humanoide` 27,
`Mensch` 22, `Zwerg` 22, `Kaiser` 19, `Olav der Ehrliche` 19, `Remus' Kaiserreich` 16, `Magie` 15.
Orphans (no incoming): `Eron Wiki`, `Liste an Waffen`. Deadends (no outgoing *blue* link): `Akkator`,
`Eron (Planet)`, `Gotteserhöhung`, `Langfingrige Hutkröte`, `Numerisches Landsknechtschwert`.

`[[A]]` → `Link {von_passage_id, nach_entry_id, anzeigetext}`. **The link is anchored on the passage,
not the article** — that is what makes CHAMPION §3.2's per-row provenance and §6's per-character
projection work, and it is why the decomposer must record link positions during decomposition rather
than reading `prop=links` afterwards.

### 5.3 Redlinks: 1 253 doors, and the product's headline flex meets its real scale

| | Edges | Share |
|---|---:|---:|
| article → **existing** article (blue) | 556 | 30.7 % |
| article → **missing** page (red) | **1 253** | **69.3 %** |

**689 distinct missing pages against 73 written articles — 9.4 doors per article.** At the level of
individual link *occurrences* (which is what a reader sees on a page) it is starker still: **3 105
wikilinks, 1 991 red — 64.1 %.**

**Where the doors are, and this vindicates the flex's staging exactly:**

| Host | red | blue | red share |
|---|---:|---:|---:|
| infobox field values | **414** | 213 | 66.0 % |
| body paragraphs | 1 443 | 857 | 62.7 % |
| body lists | 134 | 44 | 75.3 % |

CHAMPION §3.4 beat four — *„She scrolls to the infobox. One row is a red link"* — is not a staged
convenience. **21 % of every door in this corpus is inside an infobox row**, which is the frame the flex
photographs.

**Per passage:** 577 of the 1 040 `feld`+`absatz` passages (55 %) carry at least one door; 463 carry none; 118 carry
five or more; the maximum is **77 doors in a single passage**. So *„der rote Link ist eine Tür"* has to
render at three scales: zero, one, and seventy-seven. A passage with 77 doors cannot show 77 rings.

**And the fixture README's warning is confirmed and quantified: not every red link is a door.** The
epoch markers `n. K.` / `v. K.` ("nach/vor Kaiser") are written as links in **four spellings**
(`n. K.`, `n. K`, `v. K.`, `v. K` — 30 occurrences in wikitext), and because MediaWiki normalises only
the first letter and not a trailing period, they exist as **four separate wanted pages**: `N. K.`
(5 incoming), `N. K` (4), `V. K.` (4), `V. K` (2) — **15 red edges pointing at a date suffix.** Three
of the four clear the ≥3 threshold and would be promoted to first-class doors by any purely statistical
rule. **An importer that turns every red link into a door builds four doors to „nach Kaiser".**

### 5.4 What day one does with each door — the triage, from the distribution

The distribution of `wanted_by` (how many distinct articles link a missing page) is a usable signal:

| incoming articles | distinct targets | cumulative |
|---:|---:|---|
| 1 | **472 (68.5 %)** | 689 |
| 2 | 101 | 217 |
| 3–4 | 72 | 116 (of which 3 are notation, §5.3) |
| ≥5 | **44** | 44 |
| ≥10 | 8 | — |

**Ruling — three tiers, computed at import, no AI, no guessing:**

| Tier | Rule | Count | Day one |
|---|---|---:|---|
| **Tür** | ≥3 incoming articles, not matching a notation/date pattern | **113** | A real `RoterLink`, eligible as a `Vollmacht.anker` (CHAMPION §4.9), listed in the GM's *Aushang* by demand. `Andarisch` (18), `Nördliche Minenreiche` (16), `Andaria` (15), `Blattheim` (14), `Königreich Terabur` (13), `Remus Paradon II.` (13) … |
| **Spur** | exactly 2 incoming articles | **100** | Rendered as a red link, clickable, but **not** offered as a Vollmacht anchor and not listed. Promotable by one GM keypress. |
| **Notiz** | exactly 1 incoming article | **472** | Rendered as plain text with a subtle dotted underline. **Not a door.** It is a word the author linked once. |
| **Verworfen** | notation guard `^[NnVv]\.\s?K\.?$` (+ bare years, single letters) | **4** (15 edges) | Never a link, logged in the report. |

**The notation guard is per-language and per-wiki and must be user-editable**, because `n. K.` is an
*Eron* convention. The mechanism is general (a regex list, defaulted from the wiki's language); the
patterns are corpus-specific.

**The gate this does not pass, and it must be said:** the fixture README already names it and I confirm
it with sharper numbers. CHAMPION §4.9 caps issuance at **≤1 Vollmacht per player per week + 2 free-
floating**. Even after triage there are **113 tier-1 doors**, against a supply of roughly 5 per week for
a three-player table. **That is 23 weeks to walk through the doors that already exist on day one, before
play creates a single new one.** (113 ÷ 5.) The cap is not wrong — it is what keeps the mint scarce. But *„der rote
Link ist eine Tür"* as a headline promise, meeting a real corpus, becomes *„113 Türen, 5 Schlüssel pro
Woche"*, and the product has no answer yet for how a GM chooses among them or how the other 108 doors
render so that they feel like inventory rather than like 111 refusals. **Unsolved, named, and it belongs
to the next round** — it is the same open item the fixture README raised, now with the denominator.

**The genuinely good news buried in the same numbers:** an import of 73 articles produces **113 named
things the authors intended to write and never did.** That is not debris and it is not backlog. It is
**the GM's prep queue, pre-sorted by how much her own world already depends on each one** — and no
competitor product has any way to produce that list at all, because none of them models a link to a page
that does not exist as anything but a mistake.

### 5.5 The map's doors

`Karte:Andaria` (§1.5) adds **249 more distinct link targets that are not articles**, on top of the 689.
Whether they overlap the 689 substantially I did not compute (the map is not in the fixture). **They
should be counted, and the map's markers are almost certainly the highest-quality doors in the entire
corpus**, because each one already carries a position, a faction, and a paragraph of description written
by the author. A door with a description and a location is very close to a `Keim` (CHAMPION §4.9's
`Ankerkeim`) that the GM did not have to write.

---

## 6. Files and licence

### 6.1 The finding: the structured metadata is empty, and the wiki's own licence system is broken

41 files, 56.7 MB, all `BITMAP` (28 JPEG, 12 PNG, 1 ICO). 27 used by an article, 14 orphaned. Largest is
7.2 MB (`Andaria 03.02.2024.jpg`, the interactive map's base image).

**`extmetadata` carries exactly two keys across all 41 files: `DateTime` and `ObjectName`.**
`LicenseShortName`, `License`, `UsageTerms`, `Artist`, `Credit`, `Copyrighted`, `Attribution`,
`AttributionRequired`, `LicenseUrl` are `null` on every single file. **The API's licence fields are
useless here. Do not build on them.**

The licence signal exists, but it lives in the **wikitext of the file description page**, as a template:

| Marker | Files | Meaning | Used by an article? |
|---|---:|---|---|
| `{{Selbst erstellt}}` | **7** | *„Diese Datei wurde vom Urheber hochgeladen."* — a positive claim by the uploader | **7 of 7** |
| `{{Bildzitat}}` | 1 | *„Dieses Bild ist **wahrscheinlich urheberrechtlich geschützt**. Es wird ausschließlich zur inhaltlichen Erläuterung genutzt."* | **yes** (`Mensch.jpg`) |
| `{{Keine Vorauswahl}}` | 1 | *„Zu dieser Datei fehlen ausreichende und korrekte Angaben über die Quelle, den/die Urheber und/oder die Lizenz."* | no (`Ormin.png`) |
| `{{PD}}` | 1 | public domain | no (Fandom's `Beispiel.jpg`) |
| `{{CC-BY-SA}}` | 1 | CC BY-SA 4.0 | no (`Favicon.ico`) |
| **none** | **30** | nothing at all — 18 files have no description page text whatsoever, 12 have prose but no marker | 19 of them **are** used |

**And now the bug, which is the reason the fixture README could only find four licensed files.** Three
of the licence templates wrap their categorisation in a namespace guard:

```wikitext
{{Selbst erstellt}} = {{LizenzBox|…}}{{#ifeq: {{NAMESPACENUMBER}} | 0 |
                       <includeonly>[[Kategorie:Selbst erstellte Dateien]]</includeonly>}}
```

`{{#ifeq:{{NAMESPACENUMBER}}|0}}` is true only in the **article** namespace. A file description page is
namespace **6**. **The category therefore never fires on the pages it exists for.** Verified live:
`Kategorie:Selbst erstellte Dateien`, `Kategorie:CC-BY-SA Dateien` and `Kategorie:Erlaubnis` are all
**empty**, while `PD`, `Bildzitat` and `Lizenz unbekannt` — the three templates that categorise
unconditionally — each have exactly 1 member. `Selbst erstellt`, `CC-BY-SA` and `Erlaubnis` are broken
identically; the same bug is in all three.

**Consequence, and it is a contract clause:** the licence importer **reads file-description wikitext,
not categories and not `extmetadata`.** A category-driven importer would classify **seven correctly
self-licensed images as "unknown"** on this wiki. This is not an Eron quirk — it is a copied Fandom
licence-template pack with a copied bug, which means it is probably on thousands of wikis.

### 6.2 The filename normalisation, and the assertion it buys

The 27 in-use files are referenced from article wikitext in **four incompatible spellings**, all in this
one corpus:

```
[[Datei:Eulendrache Symbol.jpg|mini|…]]      inline, canonical
Bild=Valor Saron 1.jpg                        infobox param, BARE filename, no prefix
Bild=Datei:Bodin.jpg                          infobox param, prefixed
Bild=Datei:1200px-Heraldic_shield_shape…png   underscores
Bild=Datei:Olav_der_herrliche.png#filelinks   underscores AND a fragment
```

A `[[Datei:…]]` regex finds **19**. Adding infobox image parameters naively finds 8 more but **6 of them
fail to resolve** (double prefix, underscores, fragment). After normalisation — strip any `Datei:`/`File:`
prefix, `_`→space, drop `#fragment`, uppercase first letter, re-add the canonical prefix — **all 27
resolve, and the set is exactly equal to the 27 files the API independently reports as used.**

**That equality is an acceptance assertion (§7, A6): `|referenced ∪ normalised| == 27`, `unresolved == 0`.**

### 6.3 The policy: imported and flagged, never refused, never silently clean

**A file with an unknown licence is imported, quarantined, and visibly marked. It is never refused and
it is never treated as clean.** The reasoning, in order:

- **Refusing loses the GM's own art.** Seven of these files are `Selbst erstellt` — the GM *is* the
  rights holder. Refusing them would be the product lecturing an author about her own drawings.
- **Silently importing is the invariant violation.** Invariant 7 requires tracked provenance; invariant
  "no copyrighted content without licence" is absolute. `Mensch.jpg` is self-declared as *probably
  copyrighted* — importing that as ordinary campaign art is exactly the failure the invariant names.

```text
Asset.lizenz_status ∈ frei          -- a positive claim exists ({{Selbst erstellt}}, {{PD}}, {{CC-*}})
                    | zitat         -- {{Bildzitat}} / {{Erlaubnis}}: third-party, limited use
                    | unbekannt     -- {{Keine Vorauswahl}} or no marker at all
Asset.lizenz_quelle   = the raw template name + the description-page URL
Asset.lizenz_gesetzt_von = 'import' | user_id
```

The four consequences of `unbekannt` and `zitat`, and each one must hold:

1. **Visible in the app.** A dotted amber corner on the image and a line in the entry's provenance
   drawer: *„Lizenz unbekannt — aus dem Wiki übernommen."* Not a modal, not a nag; a permanent, quiet,
   honest mark.
2. **Excluded from every outbound package by default.** An `Ausgabe` (CHAMPION §10.9) or any shared
   export **omits** every `unbekannt`/`zitat` asset and says so in the manifest. The `Geschlossene Tüte
   (Ausgabe)` validator gains an eleventh hostile fixture: *a package containing an asset with
   `lizenz_status != frei`* — it must reject.
3. **Never on a public surface.** `Die offene Tür` (CHAMPION §10.11) renders `unbekannt` assets as a
   placeholder, always, with no GM override. A public unauthenticated permalink is publication.
4. **One-keypress resolution.** The GM's asset list sorts by `unbekannt` first with a three-way control
   *(meins · fremd, erlaubt · unbekannt)*. **Fandom never asked; asking once is the whole improvement.**

**This is measurable, which is what Kaya asked for.** On the Eron corpus: Fandom's own category system
yields a licence determination for **3 of 41** files (7.3 %) — `Kategorie:PD` (1),
`Kategorie:Bildzitat` (1), `Kategorie:Lizenz unbekannt` (1) — and one of those three says only "we do
not know". Reading description wikitext yields **11 of 41** (26.8 %). That is a **3.7× improvement
before a human does anything**, and it recovers the seven `Selbst erstellt` files the namespace bug
hides. After a GM spends five minutes on the sorted list, it is 41 of 41. **"Better than Fandom" here
is a number: 7.3 % → 26.8 % automatically, → 100 % with five minutes of work Fandom never offers.**

### 6.4 CC BY-SA follows the *text*, and it must come back out

`meta=siteinfo&siprop=rightsinfo` returns `{url: fandom.com/de/licensing-de, text: "CC-BY-SA"}`. Fandom
text content is CC BY-SA 3.0 Unported. That is free but conditional, and importing it into an app where
users keep writing creates four standing obligations:

1. **BY — attribution.** Source wiki, source article URL, and the authors. **The export gives one
   contributor per page (the last editor). That is not the author list and using it is a licence
   violation dressed as diligence.** I ran `prop=contributors` over all 74 titles: **3 named
   contributors total** — `Cornelius Holloway` (71 articles), `Dirk911` (10), `Kroej` (1) — with 66
   single-author and 8 two-author articles, plus **7 articles with anonymous (IP) contributors**.
   The `autoren[]` array on `ImportHerkunft` is therefore at most three names plus an anon count, and
   costs one extra API pass. **It is cheap and it is not optional.**
2. **Licence statement.** *„CC BY-SA 3.0"*, linked, per entry — not once in an imprint.
3. **Share-alike.** Derivatives of *this text* stay CC BY-SA. **This is the clause with teeth:** a
   passage a player later edits is a derivative work of a CC BY-SA passage. `ImportHerkunft.lizenz`
   must **propagate** to any passage derived from an imported one, and the propagation must survive
   `Berichtigung`, `Umbruch` and export.
4. **Marking changes.** Our decomposition *is* a modification (markup removed, page split into 1 100
   pieces). The entry must say so.

**Therefore, and this is a hard requirement on `die Ausgabe` and on every export path:** an export
containing CC BY-SA-derived passages **must carry the attribution and the licence out with it**, in the
manifest and in the rendered output. A `.ausgabe` file with imported Eron text and no attribution block
makes *our user* the infringer, using *our* tool. That is the same class of failure as shipping an asset
with an unknown licence, and it gets the same treatment: **the validator rejects it.**

**Corollary that closes the loop on the acceptance test:** the round-trip gate (`export → import → diff
empty`, CHAMPION §12.4) must diff the attribution block too. An export that loses `autoren[]` is not a
clean round trip even if every passage matches.

---

## 7. The acceptance test, written as a test

**Purpose: „auch als Test ob das funktioniert" — answered as a red/green CI job plus a ten-minute human
pass. Nothing here is subjective.** Fixture: `design/fixtures/eron/eron-export.xml` +
`media.json` + a to-be-added `map-andaria.json`. The job is offline and hermetic; it never touches the
network.

### 7.1 Machine assertions — all must be green

| # | Assertion | Expected | Why this one |
|---|---|---:|---|
| **A1** | `Entry` count | **73** | `apfilterredir=nonredirects`, **not** `statistics.articles` (§1.1). Agreeing with 74 is a bug. |
| **A2** | `Alias` count (redirects) | **1** | `Kaiserliche Flotte` → `Kaiserliche Marine`, and it must **not** be an `Entry`. |
| **A3** | Total passages | **1 100** | V1 boundary rule (§2.6). Any other number means the rule drifted. |
| **A4** | Passage kinds | `feld` **543** · `absatz` **497** · `liste` **60** | The three-way split is the contract. |
| **A5** | Typed entries / infobox field mapping | **44** typed, **543/543** fields mapped, **0** undeclared | §4.2. One undeclared field = silent data loss. |
| **A6** | Asset references resolve | **27** distinct, **0** unresolved, set-equal to `used_by_count>0` | §6.2 — catches all four filename spellings. |
| **A7** | Link resolution | **556** blue edges, **1 253** red edges, **689** distinct red targets | Against `graph.json`, which verified every one of 762 targets with `prop=info`. |
| **A8** | Door triage | Tür **113** · Spur **100** · Notiz **472** · Verworfen **4** (`N. K.`, `N. K`, `V. K.`, `V. K`) | §5.4. Guards against "every red link is a door". |
| **A9** | Text conservation | Concatenated passage plain-text ≥ **97 %** of the source's plain-text — **measured: 97.2 %** (219 581 of 225 809 non-whitespace chars) | The real anti-loss check. The missing 2.8 % is the 16 sub-40-char fragments plus list/paragraph boundary whitespace. Falling below 97 % means the decomposer started eating text. |
| **A10** | Nothing executed | **0** template expansions, **0** Lua invocations, **0** network calls during import | Invariant 2. Assert by instrumentation, not by inspection. |
| **A11** | Licence carried | **73/73** entries carry `lizenz='CC-BY-SA-3.0'`, source URL, and `autoren[]` | §6.4. |
| **A12** | Asset licence status | `frei` **9** · `zitat` **1** · `unbekannt` **31** — and **0** `unbekannt`/`zitat` assets in any export or public projection | §6.3. |
| **A13** | Prose-free entries survive | **5** entries with 0 `absatz` passages render without error, incl. `Arvex Aurelius Paradon` | §2.10. The naive-renderer killer. |
| **A14** | Determinism | Two runs, Windows + Linux, `LANG=tr-TR`, byte-identical output | Gate **Nachgerechnet** (CHAMPION §12.4). |
| **A15** | **Idempotence** | Import the same XML twice → **0** new passages, **0** modified, **0** orphaned | The most important assertion in the table. |
| **A16** | **Re-import under change** | Import `Erismus` rev 910, then rev 1139 → **24** unchanged, **3** flagged changed, **18** flagged new, **0** silently deleted, all 24 keep their passage ids | §2.5, from the measured revision pair. This is the assertion that proves the identity rule. |
| **A17** | Round trip | export → import → diff empty, **including** `autoren[]` and `ImportHerkunft` | CHAMPION §12.4, extended by §6.4. |
| **A18** | Report completeness | The import report lists every dropped construct: 1 wikitable, 16 short paragraphs, 137 unused templates, 22 modules, 4 rejected notation targets (15 edges), 14 orphan files | §2.8 — a silent drop is a lie. |
| **A19** | Anti-Eron | Run the identical importer against a second, structurally different fixture (a wikitable-infobox wiki, English, with `<ref>`) → completes, produces entries, reports its losses | **K7.** A pipeline that only works on Eron has failed the brief. **This fixture does not exist yet and is a named prerequisite.** |

### 7.2 What is allowed to be lost — declared in advance

| Loss | Amount | Accepted because |
|---|---|---|
| Infobox visual theme (`theme-source="Farbe"`), colours, symbols | all | Presentation. K1 says the theme is ours. |
| Navboxes, layout templates, `/Dok` pages | 137 templates | Nothing is transcluded by an article. |
| Lua modules | 22 | Never executed, by policy (invariant 2). |
| Heading-only sections | 88 of 413 | Preserved as `pfad[]`, which is strictly more useful. |
| Prose fragments <40 chars | 16 | Logged individually; recoverable by lowering the threshold. |
| Wikitable rendering | 1 | Text preserved verbatim as `rohblock`. |
| Talk pages, user pages, blogs, Fandom Discussions | 15 pages | Out of scope by ruling; a log is not an encyclopedia (§11). |
| Revision history beyond the current revision | 1 152 of 1 153 edits | We keep `revid` + `sha1` + `autoren[]`. **Our history starts at import.** |
| File binaries at original size | — | Re-encoded on ingest (invariant: uploads are untrusted; un-re-encoded raster is a hostile fixture in `Geschlossene Tüte`). |

### 7.3 The ten-minute human pass

A checklist, in order, on the imported campaign. Each step is one action and one visible answer.

1. **(60 s)** Open `Arvex Aurelius Paradon`. **Expect:** a complete infobox of 18 rows, *no* body text,
   *no* empty-state error, and a provenance chip on every row. **This is the naive-renderer test and the
   §3.2 flex in one screen.**
2. **(60 s)** Open `Der Große Krieg`. **Expect:** 16 infobox rows + 7 paragraphs; the section path
   `Geschichte › Vorgeschichte › Weitreichender Historischer Kontext` visible on paragraph 18; the lead
   paragraph **separate** from the infobox (the `}}`-glue trap, §2.3).
3. **(60 s)** In that infobox, find `Schlachten`. **Expect:** one row, eleven values, eleven door
   affordances — not one door and not eleven rows.
4. **(45 s)** Click the door `Andarisch`. **Expect:** a `Keim` offering, and the line *„18 Artikel
   verweisen hierauf"* — the demand number, which is the thing Fandom cannot show.
5. **(45 s)** Open `Erismus` (56 KB, 101 passages). **Expect:** it loads without stutter, the outline
   shows 5 heading levels, and scroll position is stable. **This is the only stress article in the
   corpus.**
6. **(60 s)** Open the article `Mensch`, click its image. **Expect:** *„Bildzitat — wahrscheinlich
   urheberrechtlich geschützt"*, and the export button for this campaign shows *„1 Bild wird nicht
   mitgegeben."*
7. **(45 s)** Open any entry's provenance drawer. **Expect:** *„Übernommen aus Eron Wiki · CC BY-SA 3.0
   · Cornelius Holloway · 24.01.2024"* with a working source link.
8. **(60 s)** Open the import report. **Expect:** a list of losses matching A18, not a green tick.
9. **(90 s)** Run the import **again** on the same file. **Expect:** *„0 neu, 0 geändert"* and no
   duplicates anywhere. **(A15 — if this fails, nothing else matters.)*
10. **(90 s)** Open the GM's door list. **Expect:** 113 doors sorted by demand, `Andarisch` first, and
    **no door named `N. K.`**.

**Verdict rule: green requires all 19 machine assertions and all 10 human steps.** A19 failing means the
importer is an Eron importer, which the brief forbids. A15/A16 failing means the importer is a one-shot
toy, which is worse than not shipping it, because a GM will run it twice.

### 7.4 The one number that makes "better than Fandom" measurable

Three claims, each a number this corpus can produce on both sides:

| | Fandom | Chronicle after import | Method |
|---|---:|---:|---|
| Addressable, individually citable knowledge units | **74** (pages) | **1 100** (passages) | §2 |
| Files with determinable licence | **3** (7.3 %) | **11** (26.8 %) automatically, 41 (100 %) after ~5 min | §6.3 |
| Named gaps in the world, ranked by the world's own demand | **0** (Fandom has `Wantedpages`, unranked and unusable in the reading surface) | **113** ranked doors | §5.4 |

That is the deliverable sentence: **73 articles become 1 100 addressable atoms, 113 ranked doors and a
licence ledger — and none of the three exists on Fandom at all.**

---

## 8. The number

One developer with an AI crew, in working days. Split honestly, because "the importer" is two products.

### 8.1 Slice-1 importer — one-way, one-shot, text and structure only

| Line | d | Risk |
|---|---:|---|
| XML/API ingest: `siteinfo`, `allpages`, batched `export=1`, redirect and namespace handling, streaming parse | 3 | low |
| Wikitext decomposer to the specified subset (balanced braces, depth-aware params, headings, lists, files, emphasis, linktrail, magic words) | **6** | **high** — §8.3 |
| Portable-infobox schema reader (`<infobox>` XML → groups/labels/sources/defaults) | 2 | low |
| Template→type mapping screen incl. duplicate-schema reconciliation | 4 | medium (UX) |
| Passage builder, `ImportHerkunft`, hash identity, `praegung = null` provenance chip | 4 | medium |
| Link resolution + redlink triage + notation guard + door tiers | 4 | medium |
| Import report (the loss ledger) + preview | 3 | low |
| Acceptance harness A1–A14, A17–A18 + CI fixture | 3 | low |
| **Subtotal** | **29** | ≈ **6 weeks** |

### 8.2 The full importer — what makes it a product rather than a demo

| Line | d | Risk |
|---|---:|---|
| Media pipeline: fetch, re-encode, dedupe by sha1, size budget, orphan skip | 4 | medium |
| Licence layer: description-page parsing, status model, quarantine, export exclusion, `Ausgabe` validator fixture | 4 | low |
| CC BY-SA attribution: contributor crawl, `autoren[]`, propagation through derivatives, **carry-back on export** | 3 | medium |
| **Re-import / reconciliation / diff review UI** (A15, A16) | **7** | **high** — §8.3 |
| `interactivemap` importer: 190 markers → locations, categories → tags, bounds → coordinate frame | 2 | low |
| Second-corpus hardening + fixture (A19: wikitable infoboxes, `<ref>`, English, navboxes) | **5** | **high** — §8.3 |
| Onboarding UX: URL input, progress, undo the whole import | 5 | medium |
| **Subtotal** | **30** | ≈ **6 weeks** |
| **Total** | **59 d** | ≈ **12 weeks / 3 months** |

### 8.3 Where the risk actually is — three places, none of them Lua

1. **Re-import (7 d, high).** The only line where I can name a *specific* way it goes wrong: get the
   identity rule wrong and every second import destroys Revelations, citations and footnotes for
   passages that did not change a byte. §2.5 measured the answer (hash, not ordinal) so this is a
   **de-risked** 7 days rather than an unbounded one — but it is still the line I would spike first, and
   the `Erismus` rev-910/rev-1139 pair (A16) is a ready-made spike fixture that exists today.
2. **The wikitext decomposer against wikis that are not Eron (6 d + 5 d, high).** Eron has zero `<ref>`,
   one table, no navboxes, no galleries, no parser functions and no talk pages. **The estimate above is
   an estimate for the easy case, and I am telling you that rather than padding it silently.** A wiki
   with 400 `<ref>` tags, nested tables and a Lua stat block is not 20 % harder; it is a different
   parser with a different quarantine policy. **Everything after the first `if` on a construct Eron
   doesn't have is unestimated.** The mitigation is the second fixture (A19), and it is 5 days I would
   spend before the other 24 in §8.2.
3. **The redlink cap, which is not an engineering risk at all (0 d, unbounded).** 113 tier-1 doors
   against ~5 Vollmachten per week is a **product** problem (§5.4). No amount of importer work solves
   it, and shipping an import that produces 113 doors into a product that can open 5 of them per week
   makes the headline flex feel like a locked door rather than an open one. **This is the item most
   likely to make the acceptance test pass and the feature fail.**

**The honest headline for §8, since Kaya asked for a number:** **six weeks to a working one-way import
that passes 16 of the 19 assertions; twelve weeks to one a GM can run twice, with media and licence and
a second corpus.** The three weeks between those numbers that I would refuse to cut are re-import,
attribution carry-back, and the second fixture — because each one is the difference between a demo and a
promise.

---

## 9. What I could not determine

Stated in those words, per the brief.

1. **Whether a non-technical GM can reach `Spezial:Exportieren` in a browser.** Our automated client gets
   403 (Cloudflare) on the form and on the submit URL. That is a fact about our user-agent. *I could not
   determine* what a logged-in human sees. **The product ruling (URL in, §1.4) is designed so the answer
   does not matter — but nobody should write onboarding copy about it until it is checked.**
2. **Whether Fandom still offers full XML dumps to wiki owners.** The historical
   `s3.amazonaws.com/wikia_xml_dumps/…` path returns 403 for `deeron`. *I could not determine* whether a
   current path exists. Do not build a flow on it.
3. **How much of a *typical* Fandom wiki is unmigratable.** §3.4. One corpus with 9 semantic templates
   and zero used presentation templates cannot support a distribution claim. The *mechanism* for
   measuring it per-wiki before import exists (§3.4) and should ship; the *number* does not exist.
4. **Whether the 212/187 list items become passages, relations, or both.** §2.7. There is no signal in
   the wikitext that separates a list of relations from bulleted prose. This is a design decision, not a
   data question, and it is unresolved.
5. **How 1 253 doors become the 3–5 a table can walk through in a week.** §5.4. My triage reduces 689 to
   113; the cap supplies ~5/week. The remaining gap is two orders of magnitude and belongs to the next
   round. The fixture README raised this; I have only sharpened the denominator.
6. **Whether the `interactivemap` JSON is covered by the wiki's CC BY-SA `rightsinfo`.** It is a page
   revision, so presumably yes — but *I could not determine* it from the API, and its base image
   (`Andaria 03.02.2024.jpg`, 7.2 MB) carries **no licence statement at all**, so the map's usability is
   governed by §6.3's `unbekannt` rule regardless.
7. **The 543/583 and 497/216 divergences from the fixture README's own passage counts.** §2.1. I cannot
   reconcile them because the script that produced the README's numbers is not in the fixture. Mine are
   reproducible; one of the two rules must be made normative and the other discarded.
8. **Anything about how this import performs at scale.** 73 articles is a small wiki. `Search at scale`
   is red for a fifth round (CHAMPION §12.4) and importing 1 100 passages does not test it. A 5 000-
   article wiki producing ~75 000 passages is the case that matters and **no artefact in this lineage
   has touched it.**

---

## 10. What this brief asks the next round to decide

1. **Ratify V1** as the passage boundary rule, or replace it — but write one down. The atom is currently
   undefined and two readers of the same corpus already differ by 2.3× (§2.1, §2.6).
2. **Rule on lists** (§2.7). Passage, relation, or a promotion gesture.
3. **Rule on the door cap** (§5.4). 113 doors, ~5 keys per week, and no design for the other 108.
4. **Add two fixtures before the importer is built:** `map-andaria.json` (§1.5, ~2 h of work, the richest
   single artefact in the corpus) and a **non-Eron second corpus** (§7.1 A19, the only defence against
   building an Eron importer).
5. **Accept the three new schema objects** — `ImportHerkunft`, `Alias`, `Asset.lizenz_status` — and the
   two gate extensions: `Geschlossene Tüte (Ausgabe)` gains an eleventh hostile fixture (an asset with
   `lizenz_status != frei`), and the round-trip gate diffs `autoren[]`.

---

*Ariadne, die Fadenführerin. Der Faden hält, wo er verknotet ist — und dieser Knoten heißt
`passage_sha256`.*
