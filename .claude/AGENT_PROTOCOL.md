# PnP_App Agent Protocol

How Apollon coordinates the crew. Adapted from the proven NorthStar and project_tct protocols +
Anthropic's orchestrator-worker guidance (a lead delegates self-contained tasks to workers with
fresh context; workers don't know each other exist).

## Invocation rules

- **Apollon is the only router.** Subagents never talk to each other; they report to Apollon, who
  synthesizes for the stakeholder. No subagent-to-subagent chat.
- **One self-contained brief per dispatch:** objective, must-read paths, constraints, the smallest
  state needed, and the required output format. Never pass the full user chat history.
- **Fresh vs. reuse:** a new domain/task → fresh dispatch (stateless). A review→fix→re-verify loop
  on the *same* work → reuse the live instance (the reviewer remembers their findings). Switch to
  fresh when the transcript has grown large or when fresh adversarial eyes are the point.
- **Structured reports, not prose.** Ask for the report shape below.
- **Repo files are shared memory** — point workers at `STATUS.md`, `design/`, and `git diff`, not
  replayed context.

## Cost tiering — spend the cheap crew first

| Tier | Agents | Beat |
| --- | --- | --- |
| **Haiku — die Daimones** | Hermes, Mnemosyne, Argus | recon; ledgers/STATUS/indexes; gates + hygiene |
| **Sonnet — die Werkstatt** | Hephaistos, Aphrodite, Kalliope, Ariadne | feature forge; UI/UX & design system; content/copy/docs; data models & persistence |
| **Opus — der Areopag** | Athena, Nemesis, Pythia | security & integrity; adversarial attack; design forge |

Defaults Apollon applies automatically: a "where/what/which" → **Hermes**. A structural change
(new module/schema/decision) → **Mnemosyne** updates STATUS + indexes in the same beat. Before any
review or commit → **Argus** pre-runs the gates. After a work burst → **Argus** sweeps drift +
uncommitted files.

**Judgment-beat override:** beats carrying real discretion (design-system decisions, data-contract
changes, architecture calls) run on **Opus 5** via the per-dispatch `model` parameter, regardless of
the agent's default tier. Aphrodite's design-system beats are judgment beats and ride the same
override; her sonnet default covers layouts, components, and polish. Since the Areopag (Athena,
Nemesis, Pythia) already defaults to Opus, the override is in practice a promotion for Werkstatt
beats only. **If the tier is quota-exhausted, re-dispatch on the agent's default tier and record
it — the work outranks the override.**

## Parallelism

- Spawn **3–5 concurrent** for independent work packages; each gets a **disjoint file surface**.
- Until the repo has git history and gates, parallel edits stay strictly disjoint — no two agents
  in the same file, ever. Once git + gates exist, kernel-touching parallel work may use
  `isolation: worktree` and Apollon merges.
- Apollon does the cross-cutting wiring after parallel beats land — never two agents in one seam.

## Review discipline — pre-scoped, never blind

Sequence for a substantial change: **Argus pre-runs the suite** → Apollon hands the reviewer a
brief (changed files, pre-run result, specific concerns) → **Athena/Nemesis** re-run only to
reproduce a concern, not to establish a baseline. **A CRITICAL from Athena blocks — no override.**
Every confirmed break Nemesis produces becomes a **failing regression test before the fix**.

## Structured report shape (workers return this)

```json
{
  "agent": "hephaistos",
  "status": "done | blocked | needs_review | failed",
  "task": "short recap",
  "changed": ["path/one", "path/two"],
  "gates": {"tests": "…", "lint": "…"},
  "findings": ["anything the router must know / decisions taken / dissent"],
  "followups": ["what remains, if anything"],
  "did_not_touch": ["seams left for Apollon or another owner"]
}
```

This shape is the **default**; the Daimones and the Areopag define named extensions in their own
files (Hermes answers, Argus gate verdicts, Athena severities, …). Every report — extended or not —
carries at least `agent` and `status` (`done | blocked | failed`), so the router always sees a
blocked worker. Fields are capped (~500 chars; findings/handoff may run longer when they ARE the
deliverable). Reports never restate the brief.

## The design process (binding)

Consequential design goes through the forge: research refresh → **Pythia** forges **2–3 materially
different candidates** (philosophies, not cosmetics; honest weaknesses) → attack pass (**Athena**
threat surface & integrity, **Nemesis** assumptions & abuse, plus the relevant builder: Aphrodite
UX, Ariadne data contracts, Hephaistos buildability) → **Apollon's verdict** (adopt / merge /
iterate / kill), saved as lineage under `design/iterations/<topic>/round-NN/`. Nothing
consequential ships on round 1. When a test reveals a design flaw, **fix the design doc** and
record why.

## 🏺 Das Symposion (the regroup ritual)

The crew doesn't only grind — it regroups. Apollon calls the Symposion at a **milestone boundary,
after a long work burst, or when the stakeholder returns**. The round, in order:

1. **Argus** confirms the build is GREEN (all gates) — no wine on a red build.
2. **Argus** sweeps for uncommitted files / drift — nothing gets left on the table.
3. **Mnemosyne** refreshes `STATUS.md` so the handoff is true; **Kalliope** catches up owed docs.
4. **Apollon reflects on the product**: does the work still serve the players at the table? any
   drift from the verdicts? Re-plan the next move.
5. **Air the dissent.** Anything Athena or Nemesis has been growling about gets said now, not
   buried. Disagreement is documented, never averaged.

A Symposion ends with: green build, clean tree, honest STATUS, a clear next move, and no unspoken
objection. Then back to work.

## Hard rules (every agent)

- Work only inside `C:\Users\nukei\Desktop\PnP_App`. Sibling projects (`NorthStar`, `project_tct`,
  `agent_env`, …) are **READ-ONLY reference** — never edit them.
- Never push red: run gates before commit; never force-push; never invent scope — if blocked, say
  so and stop.
- The stakeholder's brief defines scope. Until it arrives, no feature code — design and
  preparation only.
- Honor the design lineage and ratified verdicts; changing a verdict requires a new round, not a
  quiet edit.
