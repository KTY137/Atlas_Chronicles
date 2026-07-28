# Attack Plan — Project Chronicle (working title)

Status: **draft, presented to Kaya 2026-07-26.** Companion to [`00-intake.md`](00-intake.md).
Fuses the pack's 12-phase roadmap with the crew's process and Kaya's amendments K1–K4.
The pack's phase exit criteria remain binding; this plan groups them into acts and adds the
crew's rituals (forge rounds, attack passes, Symposia) plus the K-amendment placement.

## The five acts (plus Act 0, which starts everything)

### Akt 0 — Die Schmiede (design round 1) — NEXT

1. **Competitive research brief** (K4): Pythia maps Foundry VTT, Roll20, D&D Beyond Maps,
   Owlbear Rodeo, Fantasy Grounds, Alchemy RPG, Talespire, Let's Role — strengths, weaknesses,
   pricing, onboarding friction, accessibility. Saved under `design/research/`.
2. **Pythia forges 3 candidates**: A = the pack's architecture (React/TS + Node/Postgres/S3,
   modular monolith); B and C materially different bets. Every candidate must carry: a
   **differentiation thesis** ("why does a table switch to us?"), a **theme-token strategy**
   (K1), a **motion/GUI strategy** (K3), and an honest **rule-builder sequencing** (K2).
3. **Attack pass**: Athena (threat surface), Nemesis (assumptions + the drunk player at 1am),
   Aphrodite (UX/K1/K3), Ariadne (data contracts), Hephaistos (buildability).
4. **Apollon's verdict** pins: stack, gates, differentiation axes, answers to K-Q2 (theme
   authority) and K-Q3 (rule-builder priority).

Exit: ratified ADRs in lineage, `git init` + founding commit, gates recorded in `CLAUDE.md`.

### Akt I — Das Fundament (pack phases 0–1)

- Monorepo harness, web + server skeleton, CI gates, one-command dev environment, real
  browser→server→DB health path (pack Phase 0 exit criteria).
- Identity, campaigns, membership, roles, server-side permissions, GM/player dashboards,
  audit primitives (pack Phase 1 exit criteria, incl. horizontal-privilege-escalation tests).
- **K1 pulled forward:** the design system is token-first from day one; the first two theme
  templates (Fantasy + one more) ship as proof that themes are data, with automated contrast
  checks as a gate. Aphrodite owns; Argus gates contrast.

### Akt II — Die Seele (pack phases 2–4)

- Rule-engine core (declarative schemas, AST formula language, validation, trace) — the engine
  precedes its builder; Ariadne + Hephaistos.
- Actors + schema-native character sheets; demo rule package.
- Knowledge workspace: notes, quests, locations, wiki, campaign summary, search-with-permissions.
- Item library, card builder, instances, inventories, transactional transfer.
- **K1 completed:** all four launch templates (Cyberpunk, Mittelalter, Fantasy, PixelArt) +
  theme editor alpha (pick/tweak/save).

### Akt III — Der Tisch (pack phases 5–6)

- Scenes, map upload, tokens, drawing, realtime rooms, reconnect snapshots, handouts.
- GM combat console: initiative, action flow with calculation preview, commit + audit,
  `defeat_pending` state machine, undo.
- **K3 matured:** the motion design system lands here under a hard rule — nothing animated on
  the canvas hot path; performance budgets enforced as gates; `prefers-reduced-motion` honored
  everywhere.

### Akt IV — Die Magie (pack phases 7–9 + K2)

- Deterministic generators (NPC, location) with draft/field-regenerate flow.
- Optional AI adapters (server-side, structured, draft-only, degrades cleanly).
- Background-overlay sheet editor (image/PDF underlay + manual field mapping).
- **K2 flagship: the visual rule-builder** — schema forms → layout editor → visual formula/
  action editor with live trace preview → package self-tests in the UI. Sequenced honestly:
  the builder edits structures the engine already executes. (If K-Q3 is answered
  "flagship-early", the builder's schema-form stage moves into Akt II and the rest stays here.)

### Akt V — Der Feldzug (pack phases 10–11)

- Rule-package authoring completion: validation UI, migration dry-runs, version upgrade flow.
- Portability: campaign export/import, backup/restore drills, media manifests.
- Production hardening: rate limits, observability, dependency scanning, accessibility audit,
  performance budgets, deployment guide, threat-model review.
- Release under a real name (K-Q4).

## Standing rituals (every act)

- **Vertical slices only** — a slice ships with permissions, persistence, tests, error states,
  docs; the pack's per-phase exit criteria are the act's gate.
- **Attack pass before anything consequential ships** (Athena CRITICAL blocks, no override);
  Nemesis turns every confirmed break into a failing regression test in `tests/regression/`.
- **Symposion at every act boundary**: green gates, clean tree, honest STATUS, dissent aired.
- **Mnemosyne** updates STATUS/ledgers in the same beat as every structural change.

## Differentiation axes (K4 — where we beat them, named)

1. **GM workload**: fewer clicks from intent to result than Roll20/Foundry (measured, not felt).
2. **Onboarding**: a table is playing in minutes; no module-hunting safari.
3. **Theming joy** (K1): four gorgeous templates + an editor — the table looks like *their*
   campaign, not like our brand.
4. **Visual rule-builder** (K2): arbitrary systems without code — no major competitor does this
   well; it is our moat, guarded by the no-code-execution invariant.
5. **Accessibility** (K3+K4): keyboard-first, reduced-motion, contrast-guaranteed themes —
   state of the art *and* usable by everyone at the table.

A feature-count war against Foundry's decade-old module ecosystem is explicitly **not** the
strategy; these five axes are.

## First deliverables (already in flight, 2026-07-26)

- Spike 1: GM-workspace mockup with live theme-template switcher (K1+K3 proof).
- Spike 2: visual rule-builder mockup (K2 proof).
- This plan, presented as an artifact for Kaya.

Spikes are throwaway vision proofs — they inform Akt 0 candidates, they are not the codebase.
