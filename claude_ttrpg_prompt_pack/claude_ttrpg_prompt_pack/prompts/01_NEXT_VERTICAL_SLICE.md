Continue Project Chronicle by completing exactly one coherent vertical slice.

First:

1. Read `CLAUDE.md`.
2. Read `claude-progress.md`.
3. Read the relevant sections of `docs/PRODUCT_SPEC.md`, `docs/ARCHITECTURE.md`, `docs/RULE_PACKAGE_SPEC.md`, and `docs/ROADMAP.md`.
4. Inspect the implementation and current tests. Do not trust progress notes without verifying the code.
5. Choose the smallest highest-priority incomplete workflow that advances the current roadmap phase and can be left fully working.
6. Use specialist subagents for analysis or review where appropriate. Do not let multiple agents edit the same files concurrently.

Before coding, state:

- target user workflow;
- why this is the next slice;
- explicit non-goals;
- acceptance criteria;
- permission cases;
- data migrations;
- API/realtime contracts;
- UI states;
- test plan;
- specialist reviews required.

Implement the slice end to end. Do not create disconnected stubs. Include validation, server-side authorisation, error states, tests, documentation, and audit behaviour where required.

After implementation:

1. Run formatting, linting, type checking, unit tests, integration tests, and relevant end-to-end tests.
2. Use `qa-evaluator` for independent acceptance review.
3. Use `security-reviewer` if the change touches identity, permissions, uploads, sockets, rule packages, AI, or external services.
4. Fix material findings.
5. Update `docs/FEATURE_MATRIX.md`, `docs/API.md`, `docs/DECISIONS.md`, `docs/THREAT_MODEL.md`, and `claude-progress.md` as applicable.
6. Leave the repository in a clean, runnable, mergeable state.
7. Do not push or deploy unless explicitly requested.

Conclude with:

- completed workflow;
- important design decisions;
- tests/checks and results;
- known limitations;
- next recommended slice.
