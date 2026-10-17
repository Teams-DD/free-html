# Editor Project Notes

## Frozen Baseline

- Date: 2026-10-16.
- Branch/commit: `main` / `1fcea4b85dba1c001d0a7b2a32f7cd09db2e5665` (`fix: prevent silent preview edit loss`).
- Package and lockfile version: `0.0.5`.
- Base commit is the frozen starting point; the current working tree contains uncommitted Phase 1–3 editor source and documentation changes.
- Source implementation, browser verification, and production behavior are separate claims.

## Canonical Documents

- [Implementation plan](editor-implementation-plan.md): requested modular editor architecture, four implementation phases, acceptance gates, and scope locks.
- [Implementation status](editor-implementation-status.md): implemented source behavior and remaining verification gaps.
- [Phase log](editor-phase-log.md): approvals, phase states, and closeout record format.
- [Error and risk plan](editor-error-handling.md): local-storage, route, editor bridge, and download failure requirements.

## Change Control

1. Phases 1–5 were verified locally. Phase 6 production release is approved but blocked until Wrangler authentication is available.
2. Production deployment/verification was authorized but has not been performed.
3. Keep phase scope locks; preserve unrelated public/Admin UI, APIs, metrics, routes, data, and configuration.
4. Record source checks separately from browser, staging, and production verification.
5. Update these notes and root `MEMORY.md` after each phase closeout.
6. Never place credentials, private data, or full template HTML in notes.
7. Source implementation and local Pages shell/editor-route verification are complete. Actual Pages Functions need local bindings; lint has unrelated errors; the approved production phase is blocked before deployment by missing Wrangler authentication.
