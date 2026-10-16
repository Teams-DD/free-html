# Project Notes

## Frozen Baseline

- Freeze date: 2026-10-16.
- Branch/commit: `main` / `5e95ac8875052dd83bcef7310f1b9ed7e9186eb7` (`feat(admin): add public header and footer scripts`).
- Package and lockfile version: `0.0.5`.
- Immediately before this documentation refresh, the worktree was clean and `main` was up to date with `origin/main`. Documentation edits make it dirty; this is not a claim about its later state.
- This is a source baseline. Production/runtime behavior is not implied.

## Canonical Documents

- [Production-readiness forensic audit](production-readiness-audit.md): baseline evidence, current source findings, and unresolved verification.
- [Implementation roadmap](implementation-roadmap.md): proposed editor phases, scope locks, dependencies, and approval gates.
- [Implementation status](implementation-status.md): source-present behavior versus verified runtime behavior.
- [Phase progress log](phase-progress-log.md): phase counts and closeout records.
- [Error-handling inventory](error-handling.md): existing source handling and required editor error states.

## Change Control

1. Read root `MEMORY.md` and the relevant audit/phase before work.
2. Each implementation phase requires explicit user approval. This documentation refresh is not feature implementation or deployment approval.
3. Keep every phase inside its scope lock. Preserve unrelated app features, functions, routes, controls, and UI.
4. Validate the touched behavior first. Record source checks separately from browser, staging, and production evidence.
5. Update the status, progress log, and root `MEMORY.md` after approved implementation.
6. Never record secrets, tokens, private data, or full template HTML.
