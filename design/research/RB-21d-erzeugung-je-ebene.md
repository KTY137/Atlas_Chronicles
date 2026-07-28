# RB-21d — Die Erzeugung je Ebene

**Generation at every scale, and where it plugs into a nested world.** Compiled 2026-07-27.
Target: Kaya's own sentence, treated as the data-model proposal it is —

> *„das Ding ist hier haben wir Weltkarten, aber wir wollen auch lokale Karten haben können. Oder
> **nested Maps**, das wäre wohl das krasseste. **Jedes Universum ist dann eine gigantisch große nested
> map. Mit nested inventory.**"*

**Builds on [`RB-20d`](RB-20d-erzeugung.md) and does not redo it.** Where this brief contradicts the
corpus it says so by name; it does so **five times**, and every correction is listed in §7.

**Reads as binding and does not re-open:** [`RB-11`](RB-11-steam-vs-browser-verdict.md) — the game
engine is STRUCK at 2/2/2; the runtime is **React/TS + PixiJS, DOM-authoritative, canvas behind
`MapRenderer`, browser + Electron**. Unity/Godot/Unreal are out and are not discussed again.
[`RB-20b`](RB-20b-machbarkeit.md) already priced the *editor tooling* instinct behind "Unity" on the
pinned stack: **37–44 days for the full placement editor, 21–25 for `Der Ortsleger`**, with the scene
model, the `MapAnchor`, the derived fog and the package split measured rather than guessed. That is the
answer to "he wants real editor tooling"; nothing here re-opens it.
Also binding: [`RB-18`](RB-18-widerspruch.md) §1.7 (the unit is uncalibrated) and §1.2 (the 20 %
contingency is restored, always) · [`RB-12`](RB-12-eron-uebernahme.md) (the real-wiki import contract,
including the door triage in §5.4) · [`RB-04`](RB-04-asset-licensing.md) (the licence ledger) ·
[`RB-02`](RB-02-rendering-tech.md) (budgets, tile pyramid, fog-as-server-fact).

---

## 0. Method — and the thing this brief did that no previous round did

Four rules, applied without exception.

1. **Numbers marked [gemessen] were produced on this laptop today**, by scripts left on disk in
   [`design/spikes/spike-G-keim/`](../spikes/spike-G-keim/) (`keim.mjs` … `keim5.mjs`, each with its
   JSON report, plus a README with the exact setup). They are re-runnable.
2. **Numbers marked [aus dem Quelltext]** come from reading a cloned repository at a pinned commit and
   are explicitly *not* the same thing as running it.
3. **Vendor and author self-reporting is labelled** and never laundered.
4. **Where a figure could not be established the text says "no reliable figure found."** §8 lists every
   one.

### 0.1 The generator was executed. That has never happened in this lineage before.

RB-20d §9 item 1 recorded its own largest gap: *"A measured entity count from a real FMG run … **The
generator was not executed.** `S-G1` exists to fix this in one day."* RB-20d §9 item 7 recorded the
second: *"Whether FMG can generate headless (Node, no browser) … **Not tested.**"*

**Both are now closed, and it took under an hour, not a day.** [gemessen]

```
git clone --depth 1 https://github.com/Azgaar/Fantasy-Map-Generator   (v1.138.2)
npm install --ignore-scripts            → 97 packages
npm run dev -- --port 5199              → Vite 8, ready in 1,830 ms
node keim.mjs                           → Playwright + the system Chrome, headless
```

The harness is **upstream's own end-to-end recipe**, copied verbatim out of
`tests/e2e/burgs.spec.ts` [aus dem Quelltext]:

```js
await page.goto("/?seed=<seed>&width=1280&height=720");
await page.waitForFunction(() => window.mapId !== undefined, { timeout: 60000 });
const world = await page.evaluate(() => window.pack);
```

Azgaar maintains that contract himself. `public/main.js:1297` reads
`window.mapId = mapId; // expose for test automation`, and line 1302 dispatches
`new CustomEvent("map:generated", { detail: { seed, mapId } })`.

> **The ruling that follows from this and governs the rest of the brief: FMG has no Node-headless path
> and does not need one. It has a *browser*-headless path that its own CI exercises on every commit,
> and Chronicle already ships a browser — twice (tab and Electron). `seed → world` is a function we can
> call today.**

---

## 1. The verdict, up front

> **1. The nesting mechanism already exists, is deterministic, and crosses three scales — inside
> Azgaar's code, today.** `burgSeed = seed + String(burg.i).padStart(4, "0")` derives a Watabou
> city/village/dwelling seed from the world seed and the burg's id; `dungeonSeed = ${seed}${cellId}`
> derives a One Page Dungeon [aus dem Quelltext, `src/generators/burgs-generator.ts:560–690`,
> `markers-generator.ts:974`]. **Nobody unified the scales because the unification is trivial and
> nobody had anywhere to put the result.** Every child artefact in this ecosystem is a URL that opens
> a picture in an iframe. It has no id, no parent, no permission, no persistence. That is the seam,
> and it is *not* an algorithmic seam.
>
> **2. „Nested" is a DAG and this is now measured, not asserted.** On one real generated world
> [gemessen]: **207 of 575 routes (36.0 %) cross more than one state; 324 of 575 (56.3 %) cross more
> than one province; 136 of 157 rivers (86.6 %) cross more than one state; 17 of 25 states contain more
> than one religion; 16 of 25 more than one culture; and 8 of 25 states span more than one landmass.**
> A tree is wrong 32 % of the time at the very top level.
>
> **3. Containment defuses the doors problem, and the measured margin is larger than Apollon's
> hypothesis.** A generated world arrives with **1,163 named things, 1,093 distinct** [gemessen]. Under
> containment the *live* door count is: **44 at the world, median 6 inside a state, median 4 inside a
> province, max 20 anywhere.** RB-12 measured the hand-written Eron wiki at **9.3 doors per article and
> 77 doors in a single passage.** **The generated containment graph has a strictly tighter door
> distribution than the human-written wiki it is supposed to overwhelm.**
>
> **4. The seed is not a world identity, and this is the finding that costs money if learned late.**
> Same seed, canvas 1280×720 → 1600×900: **0 of 664 burgs keep (id, name). 8 of 664 names survive at
> all — 1.2 %. 1 of 25 state names survives** [gemessen]. The re-derivation key is
> `seed + the complete option vector + the generator version`, or it is nothing.
>
> **5. The containment edge we most need is the one Azgaar does not put on the entity.**
> `burg.province` is written by exactly one line in the whole repository —
> `src/controllers/provinces-editor.ts:1630`, a UI controller. On a freshly generated map **all 664
> burgs have `province` undefined**; all 664 resolve correctly through `pack.cells.province[burg.cell]`
> [gemessen]. **The hierarchy lives in the per-cell typed arrays, not in the records.** Any importer
> that reads the *Minimal* JSON export — which contains no cells — reconstructs a flat list, not a
> graph. That is a two-line fact that silently destroys the entire proposal.

---

## 2. The generator stack, by scale

### 2.1 The table

"Emits" answers the only question that matters here: **entities with identity, or pixels?**

| Scale | Tool | Emits | Licence — code | Licence — output | Headless? | Deterministic seed? |
|---|---|---|---|---|---|---|
| **World / continent** | **Azgaar FMG** v1.138.2 | **entities** — burgs, states, provinces, cultures, religions, rivers, routes, markers, zones, markets, goods, regiments, coats of arms + 22 per-cell typed arrays | **MIT + an explicit derivative-works grant** (§6.1) | explicitly free, incl. commercial sale | **yes — headless browser, upstream-maintained** [gemessen] | **yes, byte-identical** [gemessen] |
| World / continent | mapgen4 (Red Blob) | heightfield + rivers, no entities | **Apache-2.0** | permissive, *"including commercial projects"* | not tested | yes (its own `prng`) |
| **Realm / region** | **Watabou · Perilous Shores** | **SVG/PNG only** | **closed** | *"copy, modify, include in your commercial rpg adventures"* | via `?seed=&export=` URL | yes |
| **Settlement (city)** | **Watabou · MFCG** | **PNG / SVG / JSON / GeoJSON** (buildings, roads, walls, trees) | **closed.** Only an abandoned 2021 snapshot is open: `watabou/TownGeneratorOS`, **GPL-3.0, 1,877★, 290 forks, last push 2021-01-09, 59 KB** [GitHub API] | as above | via `?seed=&export=json` | yes |
| **Settlement (village)** | Watabou · Village Generator | PNG / SVG / JSON | **closed** | as above | via URL | yes |
| **Building** | Watabou · Dwellings | PNG / SVG | **closed** | as above | via URL | yes |
| **Dungeon interior** | **Watabou · One Page Dungeon** | **PNG / SVG / JSON** — *"a list of rectangular rooms (including corridors) and a list of doors"* | **closed** | as above | **`?seed=…&export=png\|svg\|json`** | yes |
| Cave | Watabou · Cave/Glade | PNG / SVG | closed | as above | via URL | yes |
| Dungeon interior | **donjon** | image / HTML / PDF / **JSON** / TSV (deprecated) | **CC BY-NC 3.0** on the published Perl source — **fatal for us** | site content partly OGL | web form, seed field | yes (Random Seed input) |
| Dungeon interior | **Augur: Instant Dungeons** | native Foundry `Wall`/door/light documents | closed, Patreon-paid | — | inside Foundry only | yes (seed parameter) |
| **Battlemap / room** | **Dungeondraft · DungeonFog · Arkenforge · Dungeon Alchemist** | **UVTT** — image + walls + portals + lights | closed, one-time purchase | per-asset minefield (RB-04) | **no** — desktop GUIs | **no** — human-authored layout |

**Verified this session:** `watabou`'s eight public GitHub repositories were enumerated via the API.
**None of the Procgen Arcana generators is open source.** The only relevant repo is `TownGeneratorOS`
(GPL-3.0, five years stale). RB-20d's ruling stands unchanged and is now enumerated rather than
inferred: **Watabou can be linked to and read from; never forked, never vendored.**

### 2.2 Why nobody has unified across scales — the answer, and it is not "it is hard"

The instinct is that cross-scale generation is unsolved research. **It is not.** Read the code:

```ts
// src/generators/burgs-generator.ts — createWatabouCityLinks(burg)
const burgSeed = seed + String(i).padStart(4, "0");
url.search = new URLSearchParams({
  name, population, size, seed: burgSeed, river, coast, farms, citadel,
  urban_castle, hub, plaza, greens, temple, walls, shantytown, style
}).toString();
if (sea) url.searchParams.append("sea", sea);
```

That is a **derived child seed plus seventeen derived parameters**, computed from the parent world's
own hydrology, biome, route topology and settlement flags, handed across a scale boundary to a
different author's generator. The village path adds a **tag vocabulary** —
`estuary`, `island,district`, `coast`, `confluence`, `river`, `pond`, `highway`, `dead end`,
`isolated`, `uncultivated`, `farmland`, `no orchards`, `no square`, `palisade`, `sparse`, `dense`
— derived from the parent world. The dungeon path is `${seed}${cellId}`.

**So the mechanism is a string concatenation and a query string, and two hobbyists shipped it years
ago.** The reason nobody unified the scales is the reason this whole product exists:

> **Every one of those child worlds is rendered into an `<iframe sandbox>` and then thrown away.**
> `markers-generator.ts:976` literally embeds the dungeon as a `pointer-events: none` iframe inside a
> legend. It is a picture of a place, generated on demand, with **no id, no parent edge, no coordinate
> frame, no permission and no persistence.** There is nowhere to put it, because none of these tools
> has a knowledge graph. **The gap is not the generator. It is the address.**

**One correction to our own corpus, and it strengthens rather than weakens the fusion argument.**
RB-20d §4.4 quotes an itch.io thread — *"currently it's a seed, a few flags (coast, river etc), and a
name"* — as the bridge ceiling. **That quote is stale.** The bridge today carries seventeen parameters
and a derived tag vocabulary. The ceiling finding survives and is *sharper*: seventeen parameters is
still not an address, still not a permission, still not a history, and **the artefact on the far side
is never saved at all.** The bridge got wider and stayed exactly as shallow. That is better evidence
for RB-15 §5's test than the 2022 quote was.

### 2.3 What each scale can and cannot give a knowledge graph

| Must emit for Chronicle | FMG (world) | Watabou (city/village/dungeon) | donjon | UVTT tools (battlemap) |
|---|:--:|:--:|:--:|:--:|
| stable ids | ✔ *within one map, tombstoned* (§4.3) | ✖ — seed only | ✖ | ✖ |
| names per culture | ✔ (`names-generator` + 82,967 B of name bases) | ✔ | thin | ✖ |
| typed fields | ✔ (§4.2) | partial (JSON) | partial | ✖ |
| **containment edges** | **✔ but in cell arrays, not on records** (§4.4) | ✖ | ✖ | ✖ |
| geometry in map space | ✔ | ✔ | ✔ | ✔ |
| **walls / portals / lights** | ✖ | ✖ | ✖ | **✔ native** |
| an anchor into a parent frame | **partially** — the child seed exists, the anchor does not | ✖ | ✖ | ✖ |

**Nobody in the corpus emits the last row.** That is the piece we must define, and §6 rules on it.

---

## 3. Deterministic seeds — what they are worth, and what they are not

### 3.1 Determinism, measured

Two independent browser contexts, same seed, same canvas, cold each time. Eleven independent SHA-256
digests over the full entity signatures and the raw per-cell arrays [gemessen, `keim.mjs`]:

| digest over | run A1 | run A2 | different seed B1 |
|---|---|---|---|
| burgs `(i, name, x, y, cell, state, province, culture, population, type, capital, port)` × 664 | `2eb0b3f4…` | **`2eb0b3f4…`** | `5b265277…` |
| states `(i, name, fullName, form, center, culture, cells, burgs, area)` | `1d476f79…` | **`1d476f79…`** | `b3e315af…` |
| provinces · cultures · religions · rivers · routes · markers | *all equal* | *all equal* | *all differ* |
| `pack.cells.h` (raw heightmap, 4,758 cells) | `0a81f6f9…` | **`0a81f6f9…`** | `fd32ee89…` |
| `pack.cells.biome` · `pack.cells.state` | *equal* | *equal* | *differ* |

> **`deterministic_same_seed = true` on 11 of 11 digests. `differs_other_seed = true` on 11 of 11.**

**The mechanism, and it has one consequence people will trip over.** `setSeed()` in `public/main.js:762`
does exactly one thing: `Math.random = aleaPRNG(seed)`. It **globally monkeypatches `Math.random`** for
the whole realm; the 36 `Math.random` call sites across `src/generators/**` then inherit determinism for
free [aus dem Quelltext]. Consequence: **determinism is realm-wide, not per-call. You cannot generate
two worlds concurrently in one JavaScript realm.** One hidden context per world, serialised. That is
fine for us and it must be written down.

### 3.2 The seed is not a world identity — the measurement that kills the naive version

The attractive idea is: *store an 11-byte seed instead of a 2.5-megabyte map.* Test it.

Same seed `chronicle-1`. Only the canvas changes, 1280×720 → 1600×900 [gemessen, `keim2.mjs`]:

| | 1280×720 | 1600×900 |
|---|---:|---:|
| pack cells | 4,758 | 5,444 |
| burgs | 664 | **814** |
| provinces | 155 | 181 |
| rivers | 157 | 197 |
| **burgs keeping `(id, name)`** | — | **0 of 664** |
| **burg names surviving at all, any id** | — | **8 of 664 (1.2 %)** |
| **state names surviving** | — | **1 of 25** |

> **A seed without its option vector is not a re-derivation key. It is a lottery ticket that happens to
> print the same number twice if you hold the machine perfectly still.**

**Therefore the storable unit is not `seed`. It is:**

```text
Weltkeim {
  generator: "azgaar-fmg",
  version:   "1.138.2",              // pinned; a bump is a migration, not an upgrade
  seed:      "chronicle-1",
  optionen:  { … the complete option vector, canonically ordered, hashed … },
  keim_hash: sha256(generator|version|seed|canonical(optionen))
}
```

`keim_hash` is what `Nachrechnen` (CHAMPION §4.11) cites. It is ~100 bytes. **Everything derived from it
is re-executable, provably, and the proof is a hash comparison rather than a promise.** That is the
doctrine satisfied exactly, and it needed the measurement above to be stated honestly.

### 3.3 What that lets us store instead of megabytes

Payload census of one generated world [gemessen, `keim2.mjs` / `keim3.mjs`, byte counts of
`JSON.stringify`]:

| Component | bytes | share of Minimal export |
|---|---:|---:|
| `deals` — the trade simulation log, 10,742 rows | **1,285,223** | **50.6 %** |
| `burgs` — 664 records (mostly `coa` heraldry blobs) | 803,977 | 31.7 % |
| `routes` (575) | 104,040 | 4.1 % |
| `nameBases` — *map-independent, ships with the generator* | 82,967 | 3.3 % |
| `markets` (28) | 63,662 | 2.5 % |
| `provinces` (155) · `states` (25) · `rivers` (157) · `notes` (131) | 48,055 · 42,317 · 32,627 · 29,765 | 6.0 % |
| `goods` (71) · `features` (22) · `religions` · `zones` · `cultures` · `biomesData` · `markers` | 17,591 · 12,911 · 3,897 · 2,570 · 1,700 · 2,018 · 4,345 | 1.8 % |
| **Minimal JSON, total** | **2,537,912** (gz **360,165**) | 100 % |
| *plus* PackCells JSON (the 22 typed arrays) | 713,346 | — |
| **The containment projection Chronicle actually keeps** — 863 nodes across 4 levels | **112,600** (gz **21,174**) | **4.4 %** |
| `Weltkeim` (generator + version + seed + option hash) | **~100** | 0.004 % |

> **A whole generated world's containment graph — 19 landmasses, 25 states, 155 provinces, 664
> settlements, with names, coordinates, types, populations and parents — is 21 KB gzipped.**
>
> **Half of what Azgaar hands us is an economic simulation log we would never read.**

**The storage ruling:** store the **`Weltkeim` + the containment projection + the human diff**. Do not
store the Full JSON as canon; keep it as a cache keyed by `keim_hash`, evictable, re-derivable in ~8 s
(§3.4). Store the *raster* as the tile pyramid that already exists on disk (RB-02, 1,365 tiles /
9.9 MB / 31.7 s).

### 3.4 Generation time, measured

FMG's own internal timer, printed to the console on a headless run [gemessen, seed `probe`,
1280×720, 9,975 points → 5,864 cells]:

```
generateProduction 1,902 ms · generateMilitary 502 ms · addMarkers 295 ms
generateProvinces 122 ms · generateMarkets 56 ms · generateZones 43 ms
TOTAL 7.85 s
→ States: 12 · Provinces: 178 · Burgs: 716
```

Wall clock through the Playwright harness, including Vite dev-server module loading and a 1.5 s settle:
**38.5–41.9 s**. Against a production build with the bundle warm, expect the 7.85 s figure to dominate.
**`generateProduction` alone is 24 % of generation time and produces the 1.29 MB of deals we throw
away** — a candidate for `regenerateEconomy: false` if upstream ever exposes it, and today an argument
for reading `pack` in-page and never serialising `deals` at all.

---

## 4. Azgaar's structure, concretely

Repository state, verified today: **5,844★ · 958 forks · 29 open issues · 52,195 KB · pushed
2026-07-26 · `spdx_id: NOASSERTION`** (the added grant confuses GitHub's classifier — the file is MIT
plus one paragraph, §6.1). Languages: **HTML 4,094,495 B / TypeScript 2,574,689 B / JavaScript
508,895 B / CSS 42,747 / Python 4,948 / Dockerfile 555.** Releases in 2026: **v1.110 (Vite, 01-22),
v1.119 (Jagged Coastlines, 04-26), v1.123 (Eroded Terrain, 06-12), v1.124 (Economy, 06-17).**
Bus factor: **Azgaar 489 commits; `github-actions[bot]` 59; the next human 32.**

### 4.1 Is there a separable generation core after the Vite migration? — **No.**

Measured over `src/generators/**` (23 non-test files, **16,542 lines**) [gemessen, `grep -o | wc -l`]:

| Coupling | Count |
|---|---:|
| references to the global `pack` | **698** |
| references to the global `grid` | 97 |
| `window.` | 25 |
| **`ensureEl(` — reads options straight out of DOM inputs** | **11** |
| `document.` | 9 |
| **generator files touching the DOM at all** | **9 of 23** |
| files importing from `d3` | **19 of 23** |
| `Math.random` call sites (determinism via the global monkeypatch) | 36 |

**And the decisive structural fact:** the pipeline that orchestrates those 23 files is **not in `src/`
at all.** `docs/domain/generation_pipeline.md` states it plainly: *"The canonical 'build a world from
scratch' routine lives in `public/main.js` → `async function generate(options)`."* That file is
**1,337 lines of untyped JavaScript** and the pipeline is **sixteen phases** with two documented
ordering constraints and **three separate replication sites** that each re-run a different slice of it
(`heightmap-editor.js` twice, `src/generators/resample.ts` once).

`docs/architecture/architecture.md` opens with: *"This document outlines the **future** architecture …
The current architecture is a mix of different patterns and styles, which makes it difficult to
understand and maintain."* Its goals include *"Separate procedural generation from rendering and UI
logic"* and *"Make world data independent from SVG / DOM manipulation."* **Those are aspirations with
no date.** The `src/` split into `generators/ · renderers/ · controllers/ · services/` is real and
useful and is **filing, not decoupling.**

> **Ruling: there is a modular *file layout* and a monolithic *program*. Extracting the generators is
> not a refactor of 23 files; it is a rewrite of the 16-phase pipeline in `public/main.js` plus the
> untangling of 698 global references, against a repository that shipped four feature releases in 2026
> and was touched yesterday.**

### 4.2 Is there a headless path? — **Yes, and upstream maintains it.**

Answered in §0.1 and demonstrated. The contract is three lines, it is exercised by eleven Playwright
specs in `tests/e2e/`, and it is stable enough that upstream keeps `window.mapId` alive with a comment
that says why. `vitest.config.ts` additionally runs the pure generator units in `environment: "node"` —
so *some* of the code is Node-clean, but `generate()` is not.

**Not headless: Node.** 19 of 23 generator files import d3, 9 touch the DOM, and `setSeed` writes
`ensureEl("optionsSeed").value`. **Do not attempt a Node port. Run the browser we already ship.**

### 4.3 The real exported entities, and whether identifiers are stable

Read from `docs/architecture/data_model.md` (415 lines, upstream's own, and unusually honest — it opens
*"FMG data model is poorly defined, inconsistent and not well-documented"*) and confirmed against a live
run.

**The entities, with their identity rule:**

| Entity | id rule | Tombstoned? | Measured count, seed `chronicle-1` |
|---|---|---|---:|
| `burgs[]` | `i` **= array index** | ✔ `removed: true`, slot kept | **664** (665 raw) |
| `states[]` | `i` **= array index**; 0 = neutrals | ✔ | **25** |
| `provinces[]` | `i` **= array index**; 0 unused | ✔ | **155** |
| `cultures[]` | `i` **= array index**; 0 = wildlands | ✔ | **12** |
| `religions[]` | `i` **= array index**; 0 = no religion | ✔ | **19** |
| `goods[]` | `i` **= array index** | — | 71 |
| `rivers[]` | `i` **≠ index** (unordered array) | ✖ | **157** |
| `routes[]` | `i` **≠ index**; **`0` is a valid route, not a placeholder** | ✖ | **575** |
| `markers[]` | `i` **≠ index**; `'marker'+i` is the SVG id *and* the `notes` key | ✖ | **56** |
| `zones[]` | `i` **≠ index**, but array order is render order | ✖ | **8** |
| `markets[]` | **`i` starts at 1 and is not the index** — needs `Markets.get(i)` | ✖ | 28 |
| `features[]` | `i` from 1; element 0 has no data | ✖ | 22 (19 land) |
| `military` (regiments) | `i` **not unique** — key is `"stateId-regimentId"` | ✖ | 75 |
| `deals[]` | `i` = index, rebuilt every regeneration | ✖ | 10,742 |
| `notes[]` | `i` is a **string**, unordered | ✖ | 131 |

**Five different identity conventions in one export, three of which are traps.** An importer that
assumes `array[i].i === i` is correct for burgs/states/provinces/cultures/religions/goods and **wrong
for rivers, routes, markers, zones, markets, features and regiments.**

**Are ids stable across regeneration?**

- **Across two runs of the same seed with the same options: yes, byte-identically** (§3.1).
- **Across an option change: no, catastrophically** — 0 of 664 (§3.2).
- **Across edits within one map: yes** — this is what the tombstone discipline buys. A removed burg
  keeps its slot with `removed: true`; ids never shift.
- **Across a version bump: unknown, and probably not.** `src/services/io/auto-update.ts` is **1,259
  lines** of version-bump migrations, including the `1.124.0` block that introduced goods/markets/
  production/taxes. Migrations that *add* fields are safe; the pipeline is documented to require
  regeneration of the economy on several paths. **No reliable figure found** for id survival across a
  version bump; it was not tested.

**And two fields make the *file* non-reproducible even when the *world* is** [aus dem Quelltext,
`src/services/io/export-json.ts:85–94`]:

```js
exportedAt: new Date().toISOString(),
mapId                                    // public/main.js:1296 — mapId = Date.now()
```

Measured: `mapId_stable = false` across two identical runs [gemessen]. **Strip both before hashing, or
`Nachrechnen` fails on a world that is provably identical.**

### 4.4 Mapping onto the containment model — the finding Ariadne needs before she designs

**The load-bearing measurement, and it is a two-line fact with a large consequence:**

```
burgs on a freshly generated map:                                     664
burgs where `burg.province` is defined:                                 0
burgs where `pack.cells.province[burg.cell]` resolves a province:     664
burgs where `burg.state` disagrees with `pack.cells.state[burg.cell]`:  0
```
[gemessen, `keim3.mjs` / `keim4.mjs`]

`burg.province` is assigned by **exactly one line in the repository** —
`src/controllers/provinces-editor.ts:1630` — a UI controller that runs only when a human opens the
province editor. The data-model doc says the same thing about the reverse edge: `province.burgs[]` is
*"Optional (added when Province editor is opened)."*

> **The parent edge is not on the child. It is in `pack.cells.province[]`, a `Uint16Array`.**
>
> **Consequence: the Minimal JSON export — which is `pack` minus the cells — cannot reconstruct the
> containment graph.** You must take `PackCells` (713 KB) as well, or perform the join in-page before
> export. **Any plan that says "we just read their Minimal export" is broken and would not have been
> discovered until implementation.**

**The mapping, level by level.** Node kinds are Chronicle's; the right column is the join, not a field
lookup.

| Level | Chronicle node | Azgaar source | Parent edge |
|---|---|---|---|
| 0 · universe | `Welt` | `Weltkeim` (§3.2) + `mapCoordinates` + `graphWidth/Height` | — |
| 1 · landmass | `Landmasse` | `pack.features[]` where `land === true` (**19**) | `Welt` |
| 1′ · polity *(parallel axis, not a child of landmass)* | `Macht` | `pack.states[]` (**25**) | `Welt` — **and it spans landmasses 8 times in 25** |
| 2 · region | `Region` | `pack.provinces[]` (**155**) | `cells.state[province.center]` |
| 3 · settlement | `Ort` | `pack.burgs[]` (**664**) | **`cells.province[burg.cell]`** — the join, not `burg.province` |
| 3′ · point of interest | `Ort` (kind `merkwürdigkeit`) | `pack.markers[]` (**56**) + its `notes[]` legend | `cells.province[marker.cell]` |
| 4 · city interior | *(not emitted)* | **`burgSeed = seed + i.padStart(4,"0")`** → MFCG / Village / Dwellings | `Ort` |
| 5 · dungeon interior | *(not emitted)* | **`dungeonSeed = seed + cellId`** → One Page Dungeon | `Ort` |
| 6 · room / battlemap | *(not emitted, by anyone at this scale)* | UVTT import only | level 4 or 5 |
| — · **linear, multi-parent** | `Weg` | `pack.routes[]` (**575**) | **many** — 36.0 % cross ≥2 states, 56.3 % cross ≥2 provinces |
| — · **linear, multi-parent** | `Fluss` | `pack.rivers[]` (**157**) | **many** — 86.6 % cross ≥2 states |
| — · **overlay, cross-cutting** | `Kultur` / `Glaube` / `Zone` | `pack.cultures/religions/zones` | **not containment** — 17/25 states hold ≥2 religions, 16/25 hold ≥2 cultures |

**Three rulings for the containment model fall straight out of this:**

1. **Culture, religion and biome are not containment.** They are cross-cutting attributes with their own
   extents. Modelling them as parents produces a lattice with no root. Measured: they cut *across*
   states, 16–17 times out of 25.
2. **Routes and rivers are not nodes with a parent; they are edges with a set of touched nodes.** A
   `Weg` needs `beruehrt[]`, not `eltern`. Measured: 324 of 575 routes would need at least two `eltern`.
3. **Landmass and polity are two parallel axes over the same points, not two levels of one tree.**
   8 of 25 states span more than one landmass. The containment graph therefore needs **typed edges**
   (`liegt_in_geografie` vs `gehoert_zu_herrschaft`), or the first Reich with an overseas colony breaks
   it. This is the DAG, and it appears at the very first level of a default world.

**Empty containers exist and are normal:** 8 of 155 provinces have no burg, 1 of 25 states has no
province row [gemessen]. RB-12 §2.2 found the identical pattern in the hand-written wiki — **88 of 413
headings have no body.** A container with no children is a first-class state in both halves, and the
renderer must not treat it as an error.

---

## 5. The three shapes, costed

**Unit warning, restated because RB-18 §1.7 earned it:** these are days in the *same uncalibrated unit*
as CHAMPION §9.2 and RB-20b §7.1. Nothing in this project has converted one into a measured day.
RB-18 §1.2's **20 % contingency is restored on every line.** Each row carries its own falsifier.

### 5.1 Shape A — import-only (read their export)

Read a `.map` / Full JSON the GM produced elsewhere.

| Line | Days |
|---|---:|
| Full-JSON parser + the five identity conventions (§4.3) + the `cells.province` join (§4.4) | 3 |
| Containment projection → nodes, typed edges, multi-parent `Weg`/`Fluss` | 3 |
| `Weltkeim` capture + provenance stamping + `mapId`/`exportedAt` stripping | 1 |
| Door triage per §7 of RB-12 (tier rules), applied per level | 2 |
| **Idempotent re-import / three-way merge** *(RB-20d's number, unchanged)* | 4 |
| **Base** | **13** |
| **+ 20 %** | **≈16** |

**Forecloses:** nothing structural. **Loses:** the child-seed chain — the GM's export contains
`burg.MFCG` only if *they* set it, and on a fresh map it is `null` for every burg [gemessen]. Without
running the generator ourselves we can still *derive* `seed + i.padStart(4,"0")`, but only if the
export carries the seed, which the Full JSON does (`info.seed`).
**Falsifier:** if the containment projection is not printing 863 nodes from a real export inside three
days, every number below is wrong.

### 5.2 Shape B — embed. **Two sub-shapes, and they must never be confused.**

**B1 · Embed the built bundle, unmodified, and drive it through upstream's automation contract.**
A hidden `BrowserWindow` (Electron) or a sandboxed same-origin iframe (browser); `?seed=…&width=…`;
`waitForFunction(() => window.mapId)`; read `window.pack`; discard the DOM. We ship their `dist/`, we
touch none of their source, and we upgrade by bumping a pinned version.

| Line | Days |
|---|---:|
| Vendored build + version pin + licence ledger row (`LicenseRef-Azgaar-FMG-1.0`, §6.1) | 1 |
| Hidden-context harness, ready signal, option-vector injection, timeout/failure path | 2 |
| Serialisation boundary: read `pack` + the 6 cell arrays we need, never `deals` | 1 |
| CSP / sandbox / offline asset audit (their `libs/`, fonts, heightmap templates) | 1 |
| **Base** | **5** |
| **+ 20 %** | **≈6** |

> **B1 is the cheapest thing in this brief and it is the one that turns `seed → world` into a function
> we own the calling convention for.** It is what makes §3.2's `Weltkeim` meaningful: we control the
> option vector, so we can pin it.

**Forecloses:** (a) generation on iOS Safari at world scale — a second full FMG realm is a real memory
cost and `RB-20b §4` already found Safari's canvas wall; ship generation as desktop/Electron-first and
say so. (b) It pins us to their DOM and their globals; an upstream refactor that renames `pack` breaks
us. Mitigation is the version pin, which is also the thing that makes §3.2's `keim_hash` honest.

**B2 · Fork the generators into `packages/`.** **Refused, and priced only as a warning.** 698 `pack`
references, 97 `grid`, 11 `ensureEl(`, 9 DOM-touching files, 19 of 23 d3 importers, and a 16-phase
pipeline living in 1,337 lines of untyped `public/main.js` with three documented replication sites —
against a solo-maintained repository (489 / 59 / 32) that shipped four feature releases in 2026 and was
pushed yesterday. **No day estimate is offered because any estimate would be a fiction.** The permanent
cost is not the port; it is the merge, forever.

### 5.3 Shape C — reimplement against the same contract

What must be written: the 16-phase pipeline; 16,542 lines' worth of heightmap, features, lakes, rivers,
biomes, cultures, states, provinces, burgs, religions, routes, military, markers, zones, markets, goods,
production and measurers; **100+ heightmap templates**; **82,967 bytes of name-training bases**; the
biome temperature/moisture matrix; and a heraldry generator (Azgaar's own `Armoria`, 357★, a separate
project).

**No day estimate. The honest calibration is external:** Dungeon Alchemist spent **four years, €2.46 M
and a studio** and still ships one visual style and no elevation (RB-20a §3.4). Azgaar has spent nine
years and 489 commits.

**What C alone would buy, and it is not nothing:** ids that are content-addressed from birth rather
than array indices; an option vector that is ours; a pipeline that can stop after phase 12 and never
compute the 1.29 MB of deals; and no bus factor of one.

> **The named boundary that keeps C possible later — and this is the answer to Kaya's migration rule.**
> The irreversible artefact is **not** which generator we call. It is **the containment node record and
> the `Weltkeim`**. Build those maximally now (§6.3). Keep every generator behind a one-way
> `ErzeugerAdapter: (Weltkeim) → Knoten[]`. Then A, B1 and C are the *same* interface with three
> implementations, and swapping generators is a package, not a migration. **Cheap where a boundary makes
> replacement possible; maximal where it does not.**

### 5.4 The honest asymmetry — measured

> **Azgaar optimises for a picture of a world. We need a populated knowledge graph.**

**How much of his pipeline we inherit and never use** [gemessen]:

| | bytes | verdict |
|---|---:|---|
| `deals` — 10,742 trade transactions, 24 % of generation time | 1,285,223 | **never read.** Skip the serialisation entirely; read `pack` in-page. |
| `nameBases` — 82,967 B of training corpora | 82,967 | **generator-side asset**, not world data. Never store per world. |
| `markets` + `goods` (economy catalogue + stock/prices) | 81,253 | *maybe* — an economy is a rules layer we have not designed. Park as `roh`. |
| `coa` heraldry blobs on 664 burgs + 25 states | 104,125 | **keep** — it is the one piece of *art* the generator produces for free, and it re-skins. |
| the 22 per-cell typed arrays | 713,346 | **keep 6** (`state`, `province`, `culture`, `religion`, `biome`, `burg`) — they *are* the containment graph (§4.4). Drop the other 16. |
| **the containment projection we keep** | **112,600** (gz 21,174) | **4.4 % of the Minimal export** |

**What our purpose needs and he does not produce — six things, each a real cost line:**

1. **A stable identity that is not an array index.** He tombstones within a map and offers nothing
   across regeneration. Ours must be `hash(keim_hash, kind, generation_path)` — the same discipline
   `spike-A-passage-identity` already measured in the prose domain (RB-20d §4.5).
2. **A viewer.** Nothing in FMG has a concept of *who is looking*. `Sicht` has no counterpart at any
   layer of his model. This is the fusion and it is entirely ours.
3. **A door.** FMG has no notion of *named but unwritten*. Every burg arrives complete. The `RoterLink`
   is not a state his model can express.
4. **The parent edge on the entity** (§4.4).
5. **A coordinate frame with an anchor.** He has one frame per map and no way to say *this map sits
   here, at this scale, inside that one*. That is precisely what "nested" needs and precisely what
   `burgSeed` does *not* carry (§6.2).
6. **Walls, portals and lights.** Absent at every scale in his model and in Watabou's, present only in
   UVTT.

**And one thing he produces that we did not ask for and must actively refuse:** **prose.** 56 markers
arrive carrying **5,915 characters** of generated English legend HTML [gemessen] — *"This legendary
water source is whispered about in ancient tales and believed to possess mystical properties…"*. RB-20d
ruled *"the generator must emit doors, not articles."* **FMG already emits articles.** §7 rules on it.

---

## 6. The interchange ruling

### 6.1 Licence, restated because everything above depends on it

`LICENSE`, fetched verbatim today: **MIT, "Copyright 2017-2024 Max Haniyeu (Azgaar)"**, plus one
inserted paragraph:

> *"You can produce, without restrictions, any derivative works from the original software and even reap
> commercial benefits from the sale of the secondary product. The derivates include created maps, map
> images, screenshots, videos, and other materials."*

GitHub returns `spdx_id: NOASSERTION` **because of that paragraph, not because of any restriction.**
RB-04's ledger must carry `LicenseRef-Azgaar-FMG-1.0` with a `license_text_snapshot`, or the CI gate
either false-positives it as MIT or rejects it.

**Contrast, unchanged:** Inkarnate — *"Customers may not redistribute, extract, or resell any Products,
whether in raw or modified form."* **Azgaar remains the only map source in the corpus whose *output* we
may ship.**

### 6.2 World scale — **Azgaar's GeoJSON is the correct *egress* target and the wrong *ingest* target.**

**This is a correction to RB-20a §5.1 and to RB-20d, and it is the reason the section exists.** The
corpus records that FMG's GeoJSON export carries *"burgs, states, provinces, cultures, religions,
markers."* **It does not.** The complete GeoJSON surface, read from `src/services/io/export.ts:796`:

```ts
export const ExportMap = {
  exportToSvg, exportToPng, exportToJpeg, exportToPngTiles, getMapURL,
  saveGeoJsonCells, saveGeoJsonRoutes, saveGeoJsonRivers, saveGeoJsonMarkers, saveGeoJsonZones
};
```

**Five layers. Cells, Routes, Rivers, Markers, Zones.** The *cell* polygons carry
`{id, height, biome, type, population, state, province, culture, religion, neighbors}` as **integer
foreign keys into tables that the GeoJSON does not contain.** There is **no burg point layer, no state
polygon layer, no province polygon layer, no culture or religion layer.** Burg, state, province,
culture and religion *tables* leave the program only as **per-panel CSV downloads** scattered across
~20 UI controllers, or inside the JSON/`.map` blob.

> **Ruling. Ingest: FMG Full JSON (or `.map`), never GeoJSON — because GeoJSON has the geometry and not
> the names, and the containment graph is in the cells (§4.4). Egress: emit GeoJSON in exactly Azgaar's
> five layers, because it is the only world-scale format anyone else reads (QGIS, and via QGIS
> everything).** RB-11's ratified "UVTT at launch" covers the battlemap; this covers the world; the
> middle is empty and that is the next paragraph.

### 6.3 Intermediate scales — **there is no format, and we must define one. Say it plainly.**

| Scale | Candidate | Verdict |
|---|---|---|
| City | **MFCG JSON / GeoJSON** | Real, and used (City Viewer, Dungeon Scrawl). **Closed source, undocumented schema, author explicitly not open-sourcing.** Usable as an *input* we parse defensively. **Not a standard we can build a contract on.** |
| Dungeon | **One Page Dungeon JSON** | *"a list of rectangular rooms (including corridors) and a list of doors"* — and a **known ambiguity in the wild**: *"there is no explicit way to distinguish front and rear entrances — they are both `stairs` (`type: 3`)."* No spec, no version field, no identity. |
| Dungeon | **donjon JSON** | Exists. Source is **CC BY-NC 3.0** — RB-04's ledger forbids derivation. Import only. |
| Battlemap | **UVTT** (`.dd2vtt`/`.df2vtt`/`.uvtt`) | Ratified, real, four emitters, Roll20 official. `resolution {map_origin, map_size, pixels_per_grid}` + walls + portals + lights + base64 image. **Carries no name, no id, no containment, no parent.** |

> **Therefore: we must define the intermediate representation ourselves. Defining a format is an
> irreversible act, and this brief states that at full volume rather than smuggling it past.**

**But define the *right* thing.** Do **not** define a new *file* format for cities and dungeons — that
is a standards war we would lose the way Watabou won his by accident. Define **one record**, and let
every source have an adapter:

```text
Knoten {                                  -- the irreversible artefact. Build it maximal, now, once.
  id            KnotenId,                 -- hash(keim_hash | kind | erzeugungspfad), never an index
  art           ∈ welt | landmasse | macht | region | ort | bauwerk | raum | behaelter | gegenstand,
  titel         string | null,            -- null is legal: an unnamed container is a real state
  eltern        Kante[],                  -- MULTI-PARENT. typed. never a single pointer.
  rahmen        { ursprung: [x,y], einheiten_pro_pixel, ordnung: 'xy'|'yx', hoch: 'oben'|'unten' },
  anker         { in: KnotenId, bei: [x,y], massstab: number } | null,
  herkunft      { erzeuger, version, keim_hash, erzeugungspfad, kind_keim } ,
  sicht_anker   -- the projection hook; a Knoten is permissioned, always
}
Kante { von, nach, art ∈ liegt_in_geografie | gehoert_zu_herrschaft | beruehrt | enthaelt_physisch }
```

**Why each field is in the maximal version rather than deferred:**

- **`eltern` is a list, not a pointer** — because 324 of 575 routes and 8 of 25 states already need two
  (§4.4). Migrating a pointer to a list later rewrites every read site.
- **`rahmen` + `anker` is the answer to "coordinates do not nest."** The corpus already holds **three
  mutually incompatible coordinate contracts**: FMG's `graphWidth/graphHeight` + `toGeoCoordinates`,
  UVTT's `resolution {map_origin, map_size, pixels_per_grid}`, and Fandom `interactivemap`'s
  `mapBounds` + `origin: "bottom-left"` + `coordinateOrder: "xy"` (RB-12 §1.5). None nests into
  another. **A child map is not a zoom level; it is a separate artefact with its own frame and one
  anchor point in its parent's frame.** Encoding that is one struct; discovering it in round 9 is a
  migration of every stored coordinate.
- **`herkunft.kind_keim`** is the nesting mechanism made durable: Azgaar computes
  `seed + i.padStart(4,"0")` and throws it away; we store it, so *"the city of Blattheim"* is a
  re-derivable artefact with an address forever.
- **`enthaelt_physisch` as a distinct edge kind** is what makes nested inventory the same mechanism —
  a chest in a room, a bag in a chest, a coin in a bag. Which brings the traps in the next paragraph.

**The three inventory traps, ruled here because the record is being fixed here:**

1. **Containment cycles.** `enthaelt_physisch` must be acyclic and enforced on write by an
   ancestor-walk, not by a periodic audit. The bag of holding inside the bag of holding is not a bug to
   be caught later; it is the first thing a player tries.
2. **Weight and capacity propagation.** Compute **up** on read, cache per node, invalidate on the edge.
   Do not denormalise a total onto the container — that is the same mistake as putting `province` on the
   burg, and Azgaar's own model shows what it costs (§4.4).
3. **Permission leaks through containment.** *Knowing that a chest exists* and *knowing what is in it*
   are two different revelations. `Sicht` must project **per node, not per subtree**, or every search
   result leaks a container's contents. This is CHAMPION §6's projection applied to `enthaelt_physisch`
   and it is the one place where the maps/inventory unification could quietly become a security bug.

---

## 7. The first sixty seconds after generation

### 7.1 The arithmetic that decides the design

A generated world arrives with **1,163 named things, 1,093 distinct** [gemessen]. RB-12 §5.4 measured
the supply side: CHAMPION §4.9 caps issuance at **≤1 Vollmacht per player per week + 2 free-floating**,
which is **~5 keys per week for a three-player table**, and RB-12 concluded that the *hand-written*
Eron wiki's **113 tier-1 doors** are already **23 weeks** of supply.

> **1,093 doors ÷ 5 keys per week = 219 weeks. Four years and two months.**
>
> **Naive generation does not produce 400 chores. It produces four years of them, in eight seconds.**

RB-20d's ruling — *"the generator must emit doors, not articles"* — is right about **articles** and
**insufficient about doors**. The correction this brief makes:

> **Emit doors, not articles — and emit only the doors at the level you are standing on.**

### 7.2 Does containment actually defuse it? — **measured, and by a larger margin than hypothesised**

Fan-out of the containment graph, seed `chronicle-1` [gemessen, `keim5.mjs`]:

| Standing on | Live doors are | n | min | **p50** | p90 | max | mean |
|---|---|---:|---:|---:|---:|---:|---:|
| **the world** | 19 landmasses + 25 states | — | — | — | — | **44** | 44 |
| **a state** | its provinces | 24 | 2 | **6** | 11 | 18 | 6.46 |
| **a province** | its settlements | 147 | 1 | **4** | 8 | **20** | 4.52 |
| a province | its markers | 45 | 1 | 1 | 2 | 5 | 1.24 |
| *(a state with no provinces)* | its settlements | 24 | 5 | 26 | 53 | 80 | 27.67 |

**Set that against the hand-written corpus RB-12 measured:** 9.3–9.4 doors per article, **55 % of
passages carry at least one, 118 passages carry five or more, and one passage carries 77.**

> **The generated containment graph's worst screen is 44 doors and its median screen is four to six.
> The hand-written wiki's worst passage is 77. Containment does not merely survive generation — it
> produces a *better* door distribution than a human wrote by hand.**
>
> **The failure mode is named too, and it is the last row:** a state with no province layer falls back
> to 26 settlements at the median and 80 at the worst. **The province level is not cosmetic; it is the
> thing that keeps the fan-out under ten.** 1 of 25 states in this world has no province row. Generate
> provinces, or generate a chore list.

### 7.3 The three things that must happen in those sixty seconds, each with its ruling

**a) Nothing is minted. Not one paragraph.** `Nichts wird automatisch Kanon` (CHAMPION §11), applied to
places. Every node lands with `praegung = null` and a `Herkunft` row, exactly as RB-12 §2.5 ruled for
imported passages. Die Saatbilanz reads `0 Absätze im Kanon · 863 Orte · 44 Türen sichtbar`.

**b) The 5,915 characters of generated prose are quarantined, not printed as canon.** This is new and
RB-20d did not see it. FMG's `notes[]` contains 56 marker legends and 75 regiment descriptions — real
English sentences, machine-written, with no author. **Ruling: they land as `kind: rohblock`, rendered
inside a bordered card headed „Vom Generator erzeugt — nicht geprüft", with the generator, version and
`keim_hash` under it.** They are citable, they are addressable, and they are never a `Quelle`. Identical
to RB-12 §2.8's treatment of an unconvertible wikitable, for the identical reason: **a silently dropped
construct is a lie about completeness, and a silently promoted one is a lie about authorship.**

**And a K7 problem nobody has named: the prose is English.** Eron is German. A German table generating a
German world receives 5,915 characters of English flavour text plus 664 name-generator names in
invented phonologies. **The default must be to import the *structure* and suppress the *prose* unless
the user opts in.** No reliable figure found for whether FMG has any localisation of `notes` — it does
not appear to.

**c) The name is never the identity.** 1,163 names collapse to 1,093 distinct — **70 collisions**, worst
being **`"1st Fleet"` × 19** (every state names its first fleet identically) and two settlements sharing
`"Tamsa"` [gemessen]. RB-12 §2.5 already proved this in the prose domain: content hash survives 88.9 %,
ordinal position 0 %. **Same finding, second domain: key on `Knoten.id`, never on `titel`.** A door
keyed on a title creates one door for two towns.

### 7.4 The sixty seconds, concretely

1. `0–8 s` — Kaya presses *Erzeugen* or drops a `.map`. A hidden context runs FMG (§5.2 B1). FMG's own
   timer says 7.85 s.
2. `8–12 s` — the mapper runs the `cells.province` join and emits **863 nodes / 21 KB gzipped**. The
   `Weltkeim` is written. `deals` is never serialised.
3. `12–25 s` — the SVG/PNG goes into the tile pyramid that already exists on disk (1,365 tiles, 9.9 MB,
   31.7 s measured — this is the slowest step and it can run behind the map).
4. `25–30 s` — **the world opens and there are forty-four things on it.** Nineteen landmasses, twenty-
   five realms. Every name is red. Nothing is in the encyclopedia.
5. `30–40 s` — she opens one realm. **Six provinces.** She opens one province. **Four towns and a
   marker.** The other 1,049 doors exist, are addressable, are searchable, and are **not on the screen**.
6. `40–60 s` — she presses one town. The door opens: name, culture, population, state, port, coat of
   arms, and *„Noch nicht erschlossen."* `Ctrl+Enter`. **One paragraph is minted, by a human keypress,
   with a weekday over it.** `1 Absatz im Kanon · 863 Orte · 4 Türen im Blick.`

> **The last line is the whole finding. Not „999 Türen". Four.**

---

## 8. Corrections to the corpus

Recorded by name, as the protocol requires.

1. **RB-20a §5.1 and RB-20d — FMG's GeoJSON does *not* carry burgs, states, provinces, cultures or
   religions as features.** It carries five layers: Cells, Routes, Rivers, Markers, Zones. Cell
   polygons carry integer foreign keys into tables the file does not contain. Entity tables leave only
   as per-panel CSV or inside the JSON blob. §6.2.
2. **RB-20d §4.4 — the FMG↔MFCG bridge is not *"a seed, a few flags and a name."*** It is a derived
   child seed plus **seventeen parameters**, and for villages a derived tag vocabulary. The 2022 itch
   quote is stale. **The ceiling finding survives and is stronger:** the child artefact is never
   persisted at all. §2.2.
3. **RB-20d §2.1 — "roughly a thousand settlements"** is the right order of magnitude and the wrong
   figure at default settings. Measured: **664** and **716** on two seeds at 1280×720; **814** at
   1600×900. It scales with canvas, not with a constant.
4. **RB-20d §9 item 7 — "Whether FMG can generate headless" is answered.** Not in Node; **yes in a
   headless browser, using upstream's own maintained automation contract**, which FMG's CI runs on every
   commit. §0.1, §4.2.
5. **RB-20d §9 item 1 — "the generator was not executed" is closed.** It was executed five times today.
   Every count in this brief marked [gemessen] came from a real run.

---

## 9. What could not be established

1. **Id survival across an FMG version bump.** `auto-update.ts` is 1,259 lines of migrations. Not
   tested. **This is the highest-variance unknown in the brief** and it is the one that decides whether
   the version pin in `Weltkeim` can ever be relaxed.
2. **The MFCG / Village Generator JSON schema.** Undocumented, closed-source, no version field. We know
   it exists and that City Viewer and Dungeon Scrawl consume it. **No reliable figure found** for its
   fields.
3. **Whether the Watabou `?export=` URL parameter can be driven from a headless context without a
   user gesture** (browsers gate programmatic downloads). Not tested. It matters: it is the difference
   between "we can generate a city" and "the GM can click a link."
4. **LegendKeeper's nesting depth limit and whether its nested maps carry per-character visibility.**
   Its own marketing says maps nest *"indefinitely, from continents to crypts."* Its map-tool release
   post describes pins, regions, paths, labels, navigation and multiplayer cursors and **says nothing
   about player visibility, fog or permissions.** Pricing $9/mo (annual $90). **Absence of a claim is not
   absence of the feature — no reliable figure found.** This is the strongest counter-evidence to the
   nesting thesis in the market and it must be attacked properly before anyone calls nesting unclaimed.
5. **Whether any tool persists a generated child artefact as an entity.** Searched; found none; the
   absence looks real but is an absence-of-evidence.
6. **`generateProduction`'s cost if skipped.** 1,902 ms of 7.85 s and 1.29 MB of output, but there is no
   exposed flag to skip it in `generate()`. Not attempted.
7. **Frame-time cost of rendering 863 containment nodes plus 664 pins over the tile pyramid in Pixi.**
   RB-20b §9 item 1 still stands: **zero Pixi frames have been rendered in this lineage.** This brief
   measured data, not pixels.
8. **The three-way merge cost on re-import.** Carried unchanged from RB-20d §6 at 4 days, still an
   estimate by analogy, still the highest-variance line in the cost table.
9. **Dungeondraft's default-asset EULA.** Unresolved for a third brief running.

---

## 10. Sources

**Internal (re-read, not re-derived):**
`design/00-intake.md` (K1, K5, K7, K8, K9, K10, invariants 2 and 7) ·
`design/iterations/CHAMPION.md` §1, §3.4, §4.9, §4.11, §6, §8, §9.2, §11, §12.4 ·
`design/research/RB-02-rendering-tech.md` · `RB-04-asset-licensing.md` ·
`RB-11-steam-vs-browser-verdict.md` (the engine ruling, not re-opened) ·
`RB-12-eron-uebernahme.md` §1.5, §2.5, §2.8, §4.5, §5.3, §5.4 ·
`RB-18-widerspruch.md` §1.2, §1.7, §4.2 ·
`RB-20a-kartenwerkzeuge.md` §1.7, §5.1, §6 · `RB-20b-machbarkeit.md` §1, §4, §5, §7, §8 ·
`RB-20d-erzeugung.md` (built on throughout; corrected in §8).

**Measured today [gemessen] — scripts on disk in `scratchpad/fmg/`, all re-runnable:**
`git clone --depth 1 https://github.com/Azgaar/Fantasy-Map-Generator` at **v1.138.2** ·
`npm install --ignore-scripts` (97 packages) · `npm run dev -- --port 5199` (Vite 8, ready 1,830 ms) ·
`keim.mjs` (determinism: 11 digests × 3 runs · entity census · name census) ·
`keim2.mjs` (payload sizes, gzip, id stability under a canvas change) ·
`keim3.mjs` (per-key export breakdown, the 863-node containment projection, marker prose) ·
`keim4.mjs` (the `cells.province` join, DAG evidence over routes/rivers/states) ·
`keim5.mjs` (door fan-out distribution, name collisions).
Node 24.18.0 · Playwright driving the system Chrome, headless · Windows 11, this laptop.
Static counts over the clone: `src/generators` 23 non-test files / **16,542 lines**; 698 `pack`,
97 `grid`, 25 `window.`, 11 `ensureEl(`, 9 `document.`, 36 `Math.random`, 19/23 d3 importers,
9/23 DOM-touching; `public/main.js` 1,337 lines; `src/**/*.ts` 65,028 non-test lines;
`public/**/*.js` 34,388 lines.

**External, retrieved 2026-07-27:**

- https://github.com/Azgaar/Fantasy-Map-Generator — **5,844★ / 958 forks / 29 open issues / 52,195 KB /
  pushed 2026-07-26 / `spdx_id: NOASSERTION`**; languages HTML 4,094,495 B, TS 2,574,689 B, JS 508,895 B;
  contributors Azgaar 489, next human 32; releases v1.110 (2026-01-22, Vite), v1.119, v1.123,
  v1.124 (2026-06-17, Economy)
- https://raw.githubusercontent.com/Azgaar/Fantasy-Map-Generator/master/LICENSE — **MIT + the
  derivative-works grant, quoted verbatim in §6.1**
- repo files read at that commit: `docs/domain/generation_pipeline.md` (the 16 phases, the three
  replication sites, *"lives in `public/main.js` → generate(options)"*) ·
  `docs/architecture/architecture.md` (*"outlines the **future** architecture … the current architecture
  is a mix of different patterns"*) · `docs/architecture/data_model.md` (415 lines; the identity rules,
  the tombstones, `burg.MFCG`, `province.burgs` *"Optional (added when Province editor is opened)"*) ·
  `src/generators/burgs-generator.ts` (`burgSeed`, the 17 MFCG parameters, the village tag vocabulary) ·
  `src/generators/markers-generator.ts:974–976` (`dungeonSeed`, the sandboxed iframe) ·
  `src/services/io/export.ts:796` (**the five GeoJSON functions**) · `src/services/io/export-json.ts`
  (`exportedAt`, `mapId`) · `src/controllers/provinces-editor.ts:1630` (**the only writer of
  `burg.province`**) · `public/main.js:749–763, 1296–1302` (`setSeed`, `Math.random = aleaPRNG`,
  `mapId = Date.now()`, `window.mapId // expose for test automation`, `map:generated`) ·
  `tests/e2e/*.spec.ts` (the headless recipe) · `playwright.config.ts` · `vitest.config.ts`
- https://api.github.com/users/watabou/repos — **eight public repos; only `TownGeneratorOS` is relevant:
  GPL-3.0, 1,877★, 290 forks, pushed 2021-01-09, 59 KB.** No village, dungeon, cave, dwellings or
  Perilous Shores source exists publicly.
- https://watabou.github.io/faq.html — *"You can use maps created by the generator(s) as you like: copy,
  modify, include in your commercial rpg adventures etc. Attribution is appreciated, but not required"*;
  *"normally unless I am done with a project I don't make its code public"*
- https://watabou.github.io/ — the six generators: Realm (perilous-shores), City, Village, Cave/Glade,
  Dungeon (one-page-dungeon), Dwelling
- https://watabou.itch.io/one-page-dungeon and its devlogs (via search index; itch.io returns HTTP 403 to
  automated fetch) — **`?seed=…&export=png|svg|json`**; *"a list of rectangular rooms (including
  corridors) and a list of doors"*; *"no explicit way to distinguish front and rear entrances — they are
  both stairs (`type: 3`)"*
- https://watabou.itch.io/medieval-fantasy-city-generator/devlog/112574 (via search index) — the `gates`
  and `export` URL parameters, *"valid values of png, svg and json"*; GeoJSON export
- https://donjon.bin.sh/code/dungeon/ — *"provided under the Creative Commons Attribution-NonCommercial
  3.0 Unported License"*, Perl · https://donjon.bin.sh/fantasy/dungeon/ — Random Seed field; downloads:
  map, clean map, print-scaled, self-contained HTML, PDF, **JSON**, TSV (deprecated)
- https://github.com/Ethck/azgaar-foundry — **MIT, 61★, 20 forks, pushed 2026-03-21**
- https://arkenforge.com/universal-vtt-files/ and https://help.roll20.net/hc/en-us/articles/41643201127831
  — UVTT: `resolution {map_origin, map_size, pixels_per_grid}`, walls, portals, lights, base64 image;
  `.dd2vtt` / `.df2vtt` / `.uvtt` are one format; Roll20 official support
- https://www.legendkeeper.com/ and https://www.legendkeeper.com/the-new-legendkeeper-map-tool-is-here/
  — **nested maps *"indefinitely, from continents to crypts"***; pins, regions, paths, labels,
  navigation, multiplayer cursors, wiki linking; maps are **uploaded images**; **$9/mo, $90/yr**;
  **no statement about player visibility or fog** (§9 item 4)

---

*RB-21d. The nesting was never the hard part — a stranger already computes the child seed, hands it
across a scale boundary with seventeen parameters, renders the result in an iframe with
`pointer-events: none`, and throws it away. Eight seconds produce eleven hundred named things and not
one of them has a door frame. What Kaya asked for is not a bigger map. It is the one thing no generator
in this ecosystem has ever emitted: a place that knows which place it is inside, and who is allowed to
have heard of it.*

> *Sie ziehen den Keim aus dem Keim, vierstellig aufgefüllt,*
> *und werfen das Kind in ein Fenster, das niemand betreten darf.*
> *Wir zählen nicht tausend Türen. Wir zählen vier —*
> *und die vier stehen in dem Raum, in dem du gerade stehst.*
