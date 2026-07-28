# Claude Code Prompt Pack — System-Agnostic GM-Centred VTT

This pack turns the product idea into durable Claude Code instructions, a product specification, an architecture proposal, an incremental roadmap, and specialised subagents.

## What this is

This is not the application itself. It is the project harness that should stop Claude from attempting a fragile one-shot implementation.

The intended product is a browser-based, system-agnostic virtual tabletop and campaign manager whose primary user is the game master. It supports separate GM and player interfaces, dynamic character sheets, inventories, item cards, maps and tokens, campaign knowledge, a GM-operated combat console, and optional AI-assisted content generation.

## Recommended use

1. Create or open an empty Git repository.
2. Copy this entire pack into the repository root.
3. Start Claude Code in the repository root.
4. Paste `prompts/00_INITIALIZER.md` into the main Claude session.
5. Review the architecture and backlog Claude creates.
6. For later sessions, use `prompts/01_NEXT_VERTICAL_SLICE.md`.
7. Use `prompts/02_REVIEW_CURRENT_SLICE.md` before accepting large features.
8. Keep `CLAUDE.md`, `docs/`, and `claude-progress.md` under version control.

Claude Code automatically reads `CLAUDE.md`. Do not paste the whole product description into every session.

## Development rule

Build one verified vertical slice at a time. A vertical slice must include the database, server/API, permissions, UI, tests, and documentation required for one usable workflow.

Never ask Claude to “build the entire app now”. The complete product is comparable in scope to a substantial virtual-tabletop platform and must be developed incrementally.

## First recommended slice

The first usable slice should be:

- local account registration and login;
- create a campaign;
- invite or add a player;
- role-aware campaign dashboard;
- create a basic character;
- verify that the GM can see the character and the player only sees authorised content.

Do not begin with the map canvas, AI generation, or universal combat DSL. Those features depend on the identity, campaign, permission, and persistence foundations.

## Working title

The documents use **Project Chronicle** as a temporary internal name. Rename it before public release.
