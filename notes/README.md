# Project Notes

## Current Source Baseline

- Frozen 2026-10-16 at `main` / `13faaf6ed9ec67dad5ca9a96e8e0e4701ff0a28c`, package and lockfile `0.0.5`.
- Source matched `HEAD`; planning notes had prior uncommitted edits and are now being consolidated. Do not describe the overall worktree as clean.
- Historical `fecafe2` / `0.0.1` is not the current baseline.
- Source implementation and runtime/deployment verification are separate claims.

## Canonical Documents

- [Production readiness audit](production-readiness-audit.md): source-backed findings, validation evidence, and deployment unknowns.
- [Implementation roadmap](implementation-roadmap.md): eight current phases with scope locks, entry/acceptance gates, and approval controls.
- [Implementation status](implementation-status.md): source-present behavior, confirmed risks, validation and runtime verification status.
- [Phase progress log](phase-progress-log.md): current completion counts and historical approvals/source records.
- [Error handling inventory](error-handling.md): current source behavior and approval-gated error requirements.

## Change Control

1. Read `MEMORY.md`, this index, and the relevant audit/phase before implementation.
2. Obtain explicit approval for each proposed phase; documentation approval is not implementation or deployment approval.
3. Keep the phase scope lock and preserve unrelated app behavior/UI.
4. Run the narrow validation first; separate diagnostics, build, browser, staging, and production evidence.
5. Record exact files, results, remaining phases, blockers, and approval needs in the status/log and `MEMORY.md`.
6. Never put secrets, tokens, private data, or full template HTML in notes/logs.
