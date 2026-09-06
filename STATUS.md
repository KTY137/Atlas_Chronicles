# STATUS — cold-start handoff

Updated: **2026-09-06** (Claude takeover checkpoint; implementation plan requested)

## Current handoff — start here

- Kaya asked Codex to continue the stopped Claude sessions, then clarified that work must become a real application and requested an implementation plan. The next work is defined in **[docs/IMPLEMENTATION_PLAN.md](docs/IMPLEMENTATION_PLAN.md)**: F01–F04 and P01–P06, through a real campaign/join/persisted-wiki flow with two distinct player projections.
- The earlier July ledger below is historical. Newer decisions in `design/07-shell-redesign.md` and `design/08-backend-architektur.md` record the shell direction, native LiveKit voice/video and **S4=Yes** for hosted rooms. Self-host transport P11 remains separate and open.
- `design/shell-lab/` is a working React visual prototype; its typecheck and production build pass. Its fixture data, voice, permissions and network indicators are simulations. There is still **no operational product client or HTTP backend**.
- The interrupted runtime scaffold is now under `packages/`. Missing wiki `lineage.ts` and map `containment.ts` were implemented with regression tests. The new server scaffold contains pg/PGlite adapters, checksum-tracked migrations and the documented name-guard subset; it has no domain services, auth routes or command bus yet.
- The SQL schema is a tested scaffold, **not a final published persistence contract**. F02 must complete it against Entry/Revision/Passage/Lineage and provenance requirements before product data is accepted. Live Postgres has not been validated in this checkpoint.
- Eron/Fandom import, Azgaar import, clickable persistent maps, rules, browser integration and deployment are planned work, not delivered features. The production package manifest does not make its planned start command operational.
- Checkpoint verification: root `npm.cmd run gate` passes (20 files / 8 boundary rules / no violations, TypeScript, **38 tests in 4 suites**); suites cover core serialization, wiki lineage, containment and SQL/name handling. Vitest was updated from 3.2.4 to 3.2.7; dependency audit after installation reports no vulnerabilities.
- Work continues on `codex/resume-chronicle-20260906`. Pre-existing Claude design/lab work and local `.semgrep/` state were preserved. Only explicit implementation/documentation paths belong in checkpoint commits.

## Historical ledger — 2026-07-29

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
- The committed curated queue was then exercised through the real picker CLI against Daedalus `c49b4a0`: it selected queue SHA `757fef92…a417`, routed the local writer, reproduced the exact 577-byte patch, passed the contained queue gate, recorded completed ledger intent 3 and reaped its isolated worktree and branch. The canonical Windows-console run exited 0; Daedalus `09a89a5` additionally suppresses the now-reaped branch from its inspection hints.
- Promotion remains false and no candidate patch is applied. The primary checkout is clean, the raw patch remains under `runs/spine/picker-patches/`, and the queue item is now `done` so an unattended picker will not repeat the accepted trial.

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
