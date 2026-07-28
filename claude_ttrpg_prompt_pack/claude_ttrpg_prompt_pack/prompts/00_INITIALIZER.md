You are starting the Project Chronicle repository.

Read `CLAUDE.md` and every file in `docs/` before acting. Use the `product-architect`, `security-reviewer`, `ux-accessibility`, and `qa-evaluator` subagents for independent analysis. Do not ask any agent to implement the entire product.

Your task is to initialise a production-minded but minimal development foundation and complete only Phase 0 from `docs/ROADMAP.md`.

Required work:

1. Inspect the repository and report its current state.
2. Resolve contradictions between the supplied documents. Preserve product invariants.
3. Choose the exact initial technology stack within the boundaries of `docs/ARCHITECTURE.md` and record the decision in `docs/DECISIONS.md`.
4. Create a feature matrix and threat-model skeleton.
5. Scaffold the monorepo, web application, server application, shared packages, original demo rule package, tests, formatting, linting, type checking, and local Docker development dependencies.
6. Implement a real end-to-end health path from browser to server and database. Do not create fake feature buttons.
7. Add clear development commands and environment-variable examples without secrets.
8. Create `claude-progress.md` containing:
   - current architecture;
   - commands;
   - completed work;
   - test results;
   - known limitations;
   - exact next recommended vertical slice.
9. Run all checks and repair failures.
10. Ask the QA evaluator to assess Phase 0 exit criteria and the security reviewer to assess the initial trust boundaries. Address material findings.
11. Leave the repository in a clean state suitable for the next session.

Do not implement authentication, maps, combat, AI generation, or the full rule engine in this task. Build only enough rule-package structure to validate the architecture and support later work.

Before editing, present:

- chosen Phase 0 goal;
- assumptions;
- proposed stack;
- repository changes;
- verification plan.

After implementation, present:

- files and systems created;
- architectural decisions;
- commands to run;
- checks executed and results;
- reviewer findings addressed;
- remaining limitations;
- exact Phase 1 proposal.
