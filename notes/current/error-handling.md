# Error-Handling Inventory

## Audit Basis

- Source baseline: `5e95ac8875052dd83bcef7310f1b9ed7e9186eb7`, package `0.0.5`, frozen 2026-10-16.
- This document describes source behavior, not verified production behavior. No runtime failure injection was run for this documentation refresh.

## Existing Source Error Handling

### Public application

- Settings fetch failure is caught and falls back to local/default settings; no dedicated public settings error state is established here.
- Template metadata load failure is separated from valid empty/no-results and exposes retry UI.
- Raw HTML retrieval errors are caught. The HTML view has a failure message; copy/download paths show a toast.
- Invalid/unavailable category or template routes have recovery UI.
- Card and modal preview iframes have load-error feedback. A root React error fallback offers reload recovery.
- Dev-mode logging records API outcomes and top-level browser errors in a bounded in-memory list; it does not establish iframe-internal diagnostics or persistent telemetry.

### API, authentication, and storage

- API top-level handling returns a generic 500 for unexpected errors and sanitized 503 for Turso persistence errors. Malformed encoded R2 paths are handled as 400 in the recorded source implementation.
- Admin setup/login fail closed when signing-secret requirements are not met; protected routes reject invalid/missing tokens. Rate limits are in-memory and isolate-local.
- Deployed DB-backed routes reject mock persistence; runtime outage behavior is not proven by source inspection.
- R2 helper calls return failure results on caught provider failures. R2 secrets are sourced from deployment environment/native binding in current source; app-side secret writes are rejected. Existing database values were not audited or removed by this task.
- Download counter/activity is requested after the browser download trigger. It records a request, not proof that the browser saved the file.

## Preview Editor Error Handling

### Phase 2 source behavior

- Raw HTML load failure sets the modal preview error state and clears the loading indicator; the existing `Preview unavailable` recovery overlay is shown.
- The local `srcDoc` iframe load clears the loading state; iframe error sets the same recoverable preview error state.
- The parent sends only a local editable-state message to the iframe; the editor handler makes no API request. Existing template scripts remain enabled and may make independent requests.
- Text-edit messages are accepted only from the current preview iframe and only when IDs, text-node indices, and text values have the expected types. Local synchronization skips a target if its child-node shape no longer matches the original.
- These paths are source-implemented but have not been exercised in a browser/runtime test.

### Later phase requirements

1. Phase 3 synchronization/serialization failure must not silently create stale or partial local HTML; keep the original fetched content unchanged and show a clear error.
2. Phase 4 Blob/download-trigger failure must report failure and must not claim the file was saved.
3. Validate message source/type before acting; invalid messages must not change editor state.
4. Closing/changing templates must discard transient edits; no persistence unless separately approved.
5. Phase 4 edited downloads make no metric request. Unedited metric failures remain best-effort and must not block the local download.

## Remaining Verification Gaps

- Phase-05 browser verification is blocked because the local server fails before startup when `@esbuild/win32-x64` is missing. Runtime handling cannot be claimed from source inspection alone.
- Test source-fetch errors, iframe load failures, serialization failures, failed Blob/download triggers, and telemetry/API failures in a controlled environment.
- Verify the sandbox and any parent/iframe communication without granting same-origin access by default.
- Inspect network requests and browser storage to establish that no edited HTML is transmitted or persisted.
- Verify error text and recovery across desktop, tablet, mobile, and keyboard use after implementation.
- Do not inject failures into production or use production data without separate explicit approval.
