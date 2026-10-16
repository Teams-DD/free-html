# Public Preview Editor Roadmap

## Baseline and Approval Rules

- Frozen source: `main` / `5e95ac8875052dd83bcef7310f1b9ed7e9186eb7`, 2026-10-16; package/lockfile `0.0.5`.
- The source baseline has no modal preview editor. Findings are in [production-readiness-audit.md](production-readiness-audit.md).
- Phases 0 and 1 are complete as documentation/contract work only. Phase 2 is implemented in source. Phases 3–6 are proposed and not approved.
- Explicit user approval is required separately for each implementation phase. No phase authorizes production deployment or data/configuration changes.
- Preserve unrelated app features, functions, routes, controls, and UI. Change only behavior listed in the approved phase.
- Edited HTML must remain client-side and must never be uploaded or saved remotely under this feature.

## Current Source Constraints

- At the frozen baseline, modal preview loaded `/api/templates/:slug/raw?hide_scrollbars=1` inside a sandboxed iframe (`allow-scripts allow-modals`). The Phase-02 working tree now fetches original HTML through the existing raw GET/cache and renders it in `srcDoc` with the same sandbox permissions.
- Unedited modal/card downloads fetch original HTML, make a local Blob, then post a metric request. Phase 4 modal downloads use edited local HTML and skip the metric POST when edits exist.
- The raw endpoint's preview-only response can inject scrollbar CSS; Phase 2 instead adds scrollbar CSS locally to the preview document. Neither path is used as edited export HTML in this phase.
- The frozen baseline had no editor. Phase 2 added transient iframe-DOM editability; Phase 3 now synchronizes eligible text-node changes to transient local HTML state, still not Download.
- The editor handler adds no network request. Template scripts remain enabled as before and can independently make requests; the app cannot claim that every template causes zero network traffic.

## Phase 0 — Baseline and Documentation Refresh

**Status:** Complete in this documentation-only task.

**Scope lock:** Freeze the current source commit/package version; inspect source and existing notes; update Markdown and project memory only. No app source, dependencies, APIs, database, production settings, deployment, or data changes.

**Acceptance:** Canonical notes identify the same commit/version, distinguish source from runtime evidence, record the editor findings, list phases and decision gates, and do not claim the feature is implemented.

## Phase 1 — Editor Contract Decisions

**Status:** Complete; documentation only; no code changes.

**Scope lock:** Record the edit privacy, output, and editable-content contract from the user's request and source audit. No app source, UI, API, database, data, configuration, or deployment change.

**Decisions:**

- The editor itself makes no request in response to editing; edited HTML is never sent or persisted remotely. Existing sandboxed template scripts remain enabled and may make their own requests.
- Edited Download creates a local Blob and skips the existing download-counter/activity POST. Unedited Download retains the existing POST. Therefore edited downloads are intentionally absent from those aggregates.
- The HTML view and Copy continue to show/copy the original fetched source. Only Preview edits and edited Download output are in scope.
- Editable content is ordinary visible HTML text nodes in the preview body. Form values/placeholders, attributes, CSS-generated content, SVG/canvas text, document metadata, formatting, and structural edits are excluded. Existing template scripts keep their current sandboxed behavior; script-driven text replacement can replace an edit.
- The source contains mock/seed examples, not the complete live template set. Compatibility beyond audited fixtures must be verified in Phase 5 and must not be claimed universally without evidence.

**Acceptance:** The above decisions are recorded consistently in the audit, status, error inventory, and later phase criteria. Phase 2 still requires separate explicit approval.

## Phase 2 — Local Preview Editor Foundation

**Status:** Implemented in source; focused diagnostics pass; browser/runtime verification pending.

**Scope lock:** Add the `Editable` control beside Preview, enabled by default for each newly opened modal. Load original HTML into transient client memory and render the modal preview from a local representation so it can be edited. Keep edits in component/browser memory only; do not use localStorage, IndexedDB, cookies, server write APIs, or persistence. Keep the existing sandbox boundary; do not add `allow-same-origin` without a separate security review and approval.

**Out of scope:** Editing the HTML/code tab, changing card previews, template source on the server, saved user projects, account features, new APIs, database/schema changes, Admin UI, or unrelated modal redesign.

**Acceptance/result:** The switch defaults on for a newly opened modal. It sends a local `postMessage` to toggle plaintext-only editing inside the sandboxed preview; toggling off/on preserves current iframe DOM edits. Original HTML is loaded through the existing raw GET/cache and rendered using `srcDoc`; closing/reopening starts from original fetched content and resets edits. HTML/Copy/Download/metrics paths are unchanged, and no editor event sends a request.

**Implementation record:** `src/public/PublicApp.tsx` only. The preview bootstrap adds editor markers to eligible elements in the iframe DOM; no edited HTML is synchronized to React state or export. Switching to HTML unmounts the preview iframe, so in-iframe edits are lost when returning to Preview. Diagnostics report no errors. No browser/build/runtime verification was run.

## Phase 3 — Text Editing and HTML Synchronization

**Status:** Implemented in source; focused diagnostics and injected-script parse pass; browser/runtime verification pending.

**Scope lock:** Make only approved visible text targets editable in the preview. Synchronize text changes into an exportable local HTML representation. Do not add formatting, layout, image, CSS, attribute, or structural editing unless separately approved.

**Out of scope:** Source-code editor, rich-text formatting toolbar, asset upload, arbitrary DOM structure editing, or server persistence.

**Acceptance/result:** Input changes from eligible visible text-bearing elements are sent over a source-validated local `postMessage`. The parent applies only direct text-node values to a parsed copy of original HTML when the target child-node shape matches. Preview-only base/style/bootstrap elements and editor markers are excluded. The local representation survives switching Preview/HTML while the modal remains open; close/template change resets it. HTML view, Copy, Download, and metrics remain original-source behavior.

**Implementation record:** `src/public/PublicApp.tsx` only. IDs are assigned to ordinary elements with direct non-whitespace text; form controls, script/style, SVG/canvas, existing contenteditable, hidden text, and CSS-generated text are excluded. Enter is blocked in editable targets; if a target's child-node shape changes, its text edit is not applied to the local HTML rather than flattening its structure. The injected Phase-02 script's TypeScript annotation was removed because browser JavaScript cannot parse it. VS Code diagnostics are clean and the actual injected script parses with Node's `vm.Script`. No browser/build/runtime test was run.

## Phase 4 — Download and Output Integration

**Status:** Implemented in source; focused diagnostics pass; browser/runtime verification pending.

**Scope lock:** Make modal Download use edited local HTML when edits exist, otherwise preserve current original-template download. Never send edited HTML. Skip the download-counter/activity POST for edited downloads; preserve it for unedited downloads. Keep HTML tab and Copy on their existing original-source behavior.

**Out of scope:** Changing catalog/card Download behavior unless separately approved; changing analytics schema; adding server-side save/update routes; changing filename conventions; modifying other template delivery paths.

**Acceptance/result:** Modal Download uses `modalEditedHtml` when present and creates a local Blob; that branch skips the counter/activity POST and sends no edited HTML. With no edits, the existing raw fetch and counter POST remain. Card Download still uses the original one-argument handler. HTML tab and Copy remain original-source behavior; filename and toast are unchanged.

**Implementation record:** `src/public/PublicApp.tsx` only. No API, database, analytics schema, route, card, HTML view, or Copy changes. VS Code diagnostics report no errors. No browser/build/runtime verification was run.

## Phase 5 — Focused Regression and Privacy Verification

**Status:** Approved and source-audited; browser/runtime verification blocked; acceptance not met.

**Scope lock:** Validate only the editor/download slice and existing modal controls it touches. Cover enable/disable, text synchronization, close/reopen reset, original and edited downloads, viewport modes, original-source HTML/Copy behavior, failed source load, and sandbox isolation. Distinguish the initial raw-HTML GET from later edit/download actions; prove edits and edited-download actions make no requests, inspect browser storage for no persistence, and confirm edited downloads skip the metric POST while unedited downloads retain it. Run available type/build checks and record unavailable gates without changing dependency scope.

**Out of scope:** Broad unrelated refactoring, unrelated bug fixes, production data, staging setup, deployment, or cache purge.

**Source audit result:** Source paths match the checklist, and diagnostics for the touched app file report no errors. Local browser verification could not start because `@esbuild/win32-x64` is missing. Actual editing, tab-switch restoration, downloaded bytes, network traces, browser storage, and sandbox runtime behavior remain unverified.

**Blocker:** `npm run dev -- --port 4173` exited before app startup with the missing Windows esbuild optional package. Dependency repair is outside this phase's approved scope. Do not mark Phase 5 complete or proceed to Phase 6 until the browser regression is run in an available local environment.

## Phase 6 — User-Led Post-Push Verification

**Status:** Proposed; not approved; no deployment authorization.

**Scope lock:** After separately approved code phases and the user's GitHub push/Cloudflare rebuild, the user verifies the editor on the deployed site. The assistant does not log in, deploy, change production settings/data, or purge cache under this phase.

**Acceptance:** User confirms Preview/Editable, text changes, local download content, privacy/network behavior, existing modal controls, and agreed metric behavior. Record observed results only; any failure becomes a separately scoped finding/phase.

## Phase Order and Status

`0 -> 1 -> 2 -> 3 -> 4 -> 5 -> 6`

Phases 0–1 are complete as documentation/contract work only; Phases 2–4 are implemented in source. Phase 5 is approved but blocked/incomplete pending browser verification. Phase 6 is proposed/not approved. Existing production-readiness source work is summarized in the audit/status documents and is not counted as implementation of this editor roadmap.
