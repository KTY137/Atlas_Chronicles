# STATUS — cold-start handoff

Updated: **2026-07-29** (Daedalus Visual Lab acceptance in progress)

## Where we are

- **Four rounds complete.** Lineage under `design/iterations/round-01..04/`: each round forged two product candidates A/B, attacked confirmed breaks, hardened features and recorded a verdict. No candidates were deleted; every loser's best ideas were available to graft into the champion.
- **Champion: CHAMPION.md v5 — „Die Woche" (round 4, A over B, 19:18.5, 2–1, the narrowest split in the lineage).** The thesis is unhedged: the canon is the residue of the evening, and the week has no off-day. A mint has always required one human keypress, but nothing in that invariant said *now*. Two human hands, three days apart, can complete the same gesture the table completes in two seconds. A GM writes and authorises an outcome on Saturday night, for a player to fire on Tuesday, and the die rolls, the roll is real, and the paragraph lands in the encyclopedia with a weekday stamped on it. Die Vollmacht is a scoped, capped, revocable pre-authorisation. The seventh day is a structural axis no rival has and no VTT rival can render.
- **Margin history: 24:14 → 21:19 → 20:17 → 20:18 → 19:18.5.** Narrowing every round. The round-4 verdict reads this as pressure to fork harder, not as convergence — candidates are separating, not merging.
- **Oldest unpaid debt:** the ~120-day tactical half (canvas, Pixi, tile pyramid, KTX2, fog texture). Priced since round 3; unspiked in every dimension for four rounds. `Sicht` (the composing choke point) has been grafted forward unbuilt for a fourth round, and Die Woche adds three more projected surfaces on top of it (`tuer_zustand`, `umbruch`, `briefwechsel`). Der Tisch ohne Leinwand sequences the canvas to slice 2; no round yet de-risked it against running code.
- **Round 5 was interrupted, not completed.** Both product candidates and all four GUI spikes landed. Only `spike-review-A1.md` and `spike-review-B2.md` landed; the other two cross-reviews, both attacks, both hardening passes and the verdict are absent. Rounds 6–11 were not started on disk.
- **The canonical feature register landed** as valid JSON at `design/feature-register.json` (659,633 bytes). The promised human-readable register and audit did not land.
- **Visual reset is now binding.** Kaya rejected the current look after inspecting the artifact direction: the round-5 pages are functional proofs, not visual ancestors. `design/05-visual-reset.md` governs the next visual work.
- **The first React visual lab is built.** `design/visual-lab/` uses React 19, Motion, Radix and the real Andaria/Eron assets; its deterministic concealed/revealed states are captured at 1600×1000 and a real 390×844 viewport. TypeScript and the Vite production build pass. Honest boundary: the map is still a DOM image, not Pixi or `MapRenderer`.
- **A full product/GUI architecture draft now exists:** `design/06-giga-product-architecture.md`. It audits the 771-entry register and current competitor stack, proposes Home/`Heute` as router outside the rail, the campaign loop `Welt → [Vorbereitung als zu testender Slot] → Tisch` and `Schmiede` as a separate creator context. It defines the shared object/view-recipe model, app shell, route and screen inventory, capability registry, technical boundaries, delivery slices and measurable validation gates. **It is a proposal for ratification, not a replacement for the Champion or its dependency/security contracts.**

## Daedalus Visual Lab trial

- Repo-local confinement admits only `design/visual-lab/src/App.tsx` and `main.tsx`; the active `visual-lab-dev` role routes to local `qwen2.5-coder:7b`; the verifier is `npm ci` plus the TypeScript/Vite production build.
- The first externally isolated attempt at base `7bc8d0f` produced the inert `main.tsx` root-guard patch `fdb1b9dc…59e0`, passed contained build gates, left the primary checkout untouched, and was independently mounted through headless Edge.
- Promotion remains false and no candidate patch is applied. `.agentenv/work-queue.json` now records that exact operator-authorised task and base so the remaining acceptance can exercise real queue discovery and picker selection rather than a manually constructed `TaskSpec`; that full picker run is still pending.

## Round 5 — actual interrupted fork

The launched workflow replaced round 4's stale fork with the open-door economy measured by RB-21:

- **A „Der Schlüsselmeister"** — multiply the human hands that may authorise canon without making canon automatic.
- **B „Die Schwelle"** — distinguish a real, actionable door from mere absence; only doors consume keys.

Do not infer a winner. The verdict does not exist.

## What is decided

- **Organization:** Apollon (orchestrator) + 10 specialists (Haiku/Sonnet/Opus tiers, Greek pantheon), adversarial forge & attack & harden cycle, Symposion ritual.
- **Brief:** wiki + PnP table, system-agnostic core, GM-centred, campaign manager, browser-based, self-hostable.
- **K1–K7 (Kaya's amendments, all adopted):** customizable theme templates, visual rule-builder, state-of-the-art accessible GUI, differentiation vs. rivals, maps in slice 2, browser/Electron distribution, game feel through staging.
- **Stack (pinned by RB-11):** React/TS + PixiJS, DOM-authoritative, one web codebase, shipped as browser app and Electron client, one-time GM licence (players free), sold direct through merchant of record.
- **Design is binding:** every verdict documents disagreement and ruled calls; losing candidates become lineage, not waste.
- **Visual stack for the design lab:** accessible source-owned primitives (Radix/shadcn registry shape), Motion for product interaction, PixiJS behind `MapRenderer`, and selective copied effects from React Bits/Aceternity. Glass is a material, not the design system. See `design/05-visual-reset.md`.
- **Eron use:** Kaya states that he and a colleague created Eron and authorises its use in this project. Text remains CC BY-SA with attribution. Per-file provenance remains explicit because some uploaded images or map-tool exports may carry third-party terms.
- **Eron party fixture:** player characters for the Child adventure are Olav der Ehrliche, Song Kayn and Oggugat; Yal'it was an earlier companion. Other named examples, including Baldur, Bodin and Irme, are NPCs. Do not infer player status from article recency.

## Still open — Kaya's calls

- **S2 — bandwidth for a second go-to-market motion (Steam)?** Assumed **No** for planning; reversal cost high. *This is the question the whole fork turns on.*
- **K5 — may the canvas slip a slice?** The outline-first argument is real, but no artifact has proved an outline table pleasant for four hours. Kaya rules.
- **K-Q4 / S8 — the public name.** Domain and SEO compound from day one under direct sales. Deferred; now time-sensitive.
- **Five more in `OPEN-DECISIONS.md`:** S1 (players never pay — provisionally No), S3 (licence primary — provisionally Yes), S4 (hosted rooms — provisionally Yes, needs budget), S5 (Forge separable — provisionally Yes), S6 (business entity / Impressum — genuinely Kaya's).
