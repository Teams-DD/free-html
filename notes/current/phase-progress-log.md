# Phase Progress Log

## Current Snapshot

- Baseline: `main` / `5e95ac8875052dd83bcef7310f1b9ed7e9186eb7`, package/lockfile `0.0.5`, frozen 2026-10-16.
- Editor roadmap phases: 7 total (Phase 0 through Phase 6).
- Complete: 5 phases (Phase 0 baseline/docs; Phase 1 editor contract docs; Phase 2 local preview foundation; Phase 3 text synchronization; Phase 4 edited download).
- In progress: 0.
- Blocked/incomplete: Phase 5 browser/runtime regression.
- Remaining: 2 phases (Phase 5 acceptance still blocked; Phase 6 user-led post-push verification remains proposed).
- Phases 2–4 are implemented in source only; no production resource changed.
- Prior roadmap phase numbers are historical; see [implementation-status.md](implementation-status.md).

## Phase 0 — Baseline and Documentation Refresh

- Status: Complete; documentation only.
- Frozen baseline recorded from Git: `5e95ac8875052dd83bcef7310f1b9ed7e9186eb7`, `main`, version `0.0.5`; pre-refresh worktree was clean and synced with origin.
- Reconciled project memory, source audit, scope-locked roadmap, status, progress, and error inventory.
- Recorded the exact public preview-editor source gap and existing download metric request.
- No app code, API, database, configuration, deployment, or production data changed.

## Phase 1 — Editor Contract Decisions

- Status: Complete; documentation only; no code changes.
- Editing events and edited downloads must not send edited HTML or make a network request. Edited downloads skip the current counter/activity POST; unedited downloads retain it.
- HTML view and Copy remain original-source-only.
- Editable target: ordinary visible HTML text nodes in the preview body. Form values/placeholders, attributes, CSS-generated text, SVG/canvas, document metadata, formatting, and structure are out of scope. Template scripts retain current behavior and may replace text.
- Source seed fixtures were inspected; they do not represent or prove compatibility with the full live template corpus.
- Notes updated: forensic audit, roadmap, status, progress log, and error inventory. No app source/API/storage/production changes.

## Phase 2 — Local Preview Editor Foundation

- Status: Implemented in source; focused diagnostics clean; browser/runtime verification pending.
- Approval: User approved the exact Phase-02 scope on 2026-10-16.
- Changed file: `src/public/PublicApp.tsx` only.
- Added default-on `Editable` switch in modal Preview. Original template HTML loads via the existing raw GET/cache into a sandboxed `srcDoc`; preview-only scrollbar styling and a local bootstrap script are added to that preview document.
- The script toggles `contenteditable="plaintext-only"` on eligible visible text-bearing elements using `postMessage`. The editor itself issues no request during editing/toggling. No edited HTML is copied to React state, sent to the server, or passed to Download. Existing template scripts remain allowed and may make their own requests.
- Preserved HTML view, Copy, Download, download metrics, card preview, routes, APIs, database, Admin UI, and other app features.
- Known phase boundary: Preview iframe edits are not synchronized; leaving Preview for HTML unmounts the frame and discards those edits. Closing/reopening also resets them. Phase 3 handles local HTML synchronization; Phase 4 handles edited download/metric behavior.
- Validation: VS Code diagnostics for `PublicApp.tsx` report no errors. No browser/runtime/build test was run.

## Phase 3 — Text Editing and HTML Synchronization

- Status: Implemented in source; focused diagnostics and iframe-script syntax check pass; browser/runtime verification pending.
- Approval: User approved the exact Phase-03 scope on 2026-10-16.
- Changed file: `src/public/PublicApp.tsx` only.
- Eligible direct text-node values are sent to the parent via `postMessage`; the parent validates the iframe source/data and applies text values to a parsed copy of original HTML only when child-node shape still matches.
- Transient edited HTML state survives Preview/HTML switches. HTML view, Copy, Download, metrics, routes, and all other features remain unchanged. No editor persistence or edited-HTML network request was added.
- Scope correction: the injected Phase-02 bootstrap contained a TypeScript annotation that browser JavaScript could not parse; removed it. Node-shape checks prevent flattening nested structure. Structural changes to a target are rejected for synchronization.
- Validation: `get_errors` reports no errors in `PublicApp.tsx`; Node `vm.Script` parses the exact injected bootstrap. No browser/runtime/build check was run.

## Phase 4 — Download and Output Integration

- Status: Implemented in source; focused diagnostics clean; browser/runtime verification pending.
- Approval: User approved the exact Phase-04 scope on 2026-10-16.
- Changed file: `src/public/PublicApp.tsx` only.
- Modal Download uses transient edited HTML when available and skips the counter/activity POST. Edited HTML is used only for a local Blob and is not sent to the server.
- Unedited modal Download retains the raw HTML fetch and POST metric. Card Download still calls the original shared handler path.
- HTML view, Copy, filename, toast, routes, card preview, APIs, database, and other UI remain unchanged.
- Bugfix: apply-preview now fails instead of silently skipping missing/shape-mismatched/non-text targets; modal Download blocks fallback to original HTML if edits exist but cannot be applied.
- Validation: VS Code diagnostics report no errors in `PublicApp.tsx`. Browser/runtime/build test remains unverified because local server startup is blocked by missing `@esbuild/win32-x64`.

## Planned Phases

| Phase | Scope | State |
|---|---|---|
| 2 | Local preview editor foundation and default-on Editable control | Implemented in source; runtime pending |
| 3 | Visible-text state synchronization and local HTML representation | Implemented in source; runtime pending |
| 4 | Edited local download; no metric POST for edited output | Implemented in source; runtime pending |
| 5 | Focused regression, network, storage, and sandbox verification | Approved; blocked/incomplete |
| 6 | User-led live verification after push/rebuild | Proposed; not approved; no deployment authorization |

## Phase 5 — Focused Regression and Privacy Verification

- Status: Approved; source audit complete; browser/runtime acceptance blocked/incomplete.
- Source audit: code contains the default-on Editable switch, local text synchronization, edited modal Blob path, edited POST skip, unchanged unedited/card metric paths, and no browser-storage API use in `PublicApp.tsx`. Modal iframe retains `sandbox="allow-scripts allow-modals"`.
- Local browser attempt: `npm run dev -- --port 4173` failed before app startup because `@esbuild/win32-x64` is missing. No dependency install/fix was approved or attempted.
- Not verified: real text edits/toggle, Preview/HTML restoration, downloaded file bytes, browser network/storage traces, or sandbox runtime behavior.
- No app source, production, or shared browser page changed. Phase 6 is not approved and remains gated until Phase 5 runtime checks can run.

## Closeout Template

Append one record per phase:

- Phase/status; user approval and date; baseline commit.
- Scope lock; files changed; behavior added/changed; behavior explicitly preserved.
- Focused validation command and exact result.
- Browser/staging/production evidence, separately labeled; note when not run.
- Failures, remaining risks, completed/in-progress/remaining counts, and next approval gate.

Use acceptance criteria in [implementation-roadmap.md](implementation-roadmap.md). Source presence or clean diagnostics alone do not prove runtime success.
