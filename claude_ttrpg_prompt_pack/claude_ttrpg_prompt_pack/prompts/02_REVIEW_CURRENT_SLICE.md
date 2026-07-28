Perform an adversarial review of the most recently implemented Project Chronicle vertical slice. Do not add unrelated features.

Read `CLAUDE.md`, `claude-progress.md`, the relevant product requirements, the changed code, tests, and migrations.

Delegate independent reviews to:

- `qa-evaluator`;
- `security-reviewer` when any trust boundary is involved;
- the relevant domain specialist;
- `ux-accessibility` for user-facing workflows.

Review for:

- mismatch with product invariants;
- missing server-side authorisation;
- GM/player information leaks;
- invalid state transitions;
- concurrent-update bugs;
- missing transaction boundaries;
- rule-package version mistakes;
- template/instance confusion;
- incomplete error, empty, loading, offline, and conflict states;
- fake or non-functional UI;
- accessibility regressions;
- missing regression tests;
- misleading documentation;
- excessive complexity or dependencies;
- secrets or private data in logs;
- upload, formula, socket, or AI-provider abuse paths.

Produce a prioritised finding list with severity, evidence, affected files, reproduction steps, and recommended fix.

Then fix all critical and high-severity findings, plus straightforward medium findings. Run the complete relevant verification suite and update project artefacts. Do not declare the slice complete merely because existing tests pass.
