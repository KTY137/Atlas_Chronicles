# spike-G-keim — the first real run of Azgaar's Fantasy Map Generator in this lineage

Produced for [`RB-21d`](../../research/RB-21d-erzeugung-je-ebene.md), 2026-07-27.
Closes RB-20d §9 items 1 and 7.

## Setup

```
git clone --depth 1 https://github.com/Azgaar/Fantasy-Map-Generator fmg   # v1.138.2
cd fmg && npm install --ignore-scripts        # 97 packages
npm run dev -- --port 5199                    # Vite 8
cp <this dir>/keim*.mjs .
node keim.mjs && node keim2.mjs && node keim3.mjs && node keim4.mjs && node keim5.mjs
```

Requires Node ≥ 24 (upstream `engines`) and a Chrome/Chromium reachable by Playwright
(`chromium.launch({ channel: "chrome" })`). Measured on Node 24.18.0, Windows 11.

The harness is upstream's own e2e recipe from `tests/e2e/burgs.spec.ts`:
`?seed=…&width=…&height=…` → `waitForFunction(() => window.mapId !== undefined)` → read `window.pack`.
Note `notes`, `nameBases` and `biomesData` are `let`-declared script globals and are **not** on
`window` (`window.notes` resolves to the SVG element with `id="notes"`). Use bare identifiers.

## What each script measures

| Script | Report | Measures |
|---|---|---|
| `keim.mjs` | `keim-report.json` | determinism — 11 SHA-256 digests over full entity signatures and raw cell arrays, two runs of one seed plus a control seed; entity census; name census |
| `keim2.mjs` | `keim2-report.json` | payload sizes and gzip; **id stability under a canvas-size change with the same seed** |
| `keim3.mjs` | `keim3-report.json` | per-key export byte breakdown; the 863-node containment projection; generated marker prose |
| `keim4.mjs` | `keim4-report.json` | the `cells.province[burg.cell]` join; DAG evidence over routes, rivers, states |
| `keim5.mjs` | `keim5-report.json` | door fan-out distribution per containment level; name collisions |

## The five findings, in one place

1. **Deterministic:** same seed + same options → byte-identical on 11 of 11 digests.
2. **Not a world identity:** same seed, 1280×720 → 1600×900 → **0 of 664 burgs keep `(id, name)`**;
   8 names survive (1.2 %); 1 of 25 state names survives.
3. **The parent edge is not on the child:** `burg.province` undefined for all 664; all 664 resolve
   through `pack.cells.province[burg.cell]`.
4. **It is a DAG:** 36.0 % of routes and 86.6 % of rivers cross a state boundary; 8 of 25 states span
   more than one landmass.
5. **Containment tames the doors:** fan-out p50 = 4–6, max 20, root 44 — against 1,093 distinct names
   arriving at once and RB-12's hand-written max of 77 doors in one passage.

`mapId` (`Date.now()`) and `exportedAt` differ between identical runs; strip both before hashing.
