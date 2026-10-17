# Local Editor Error and Risk Plan

## Current Facts

- The editor engine, versioned localStorage record, Yes/No dialog, and `/{encodedSlug}/edit` route are implemented in source.
- Wrangler Pages local emulator serves the SPA shell and `/{slug}/edit` with `200`; direct refresh restores the local record. This was verified with fixture metadata, not real Pages Functions data.
- Pages Functions API requests return `503` locally without persistent Turso bindings or `.dev.vars`. Do not interpret fixture-backed route/editor checks as Pages API integration success.
- Local storage read/write errors and text synchronization errors are surfaced in the editor UI. Invalid edit mappings block export; missing/corrupt local edit-route data does not fall back to server HTML.
- Local Windows native packages were installed without changing manifests/lockfile. `npm run build` passes; `npm run lint` now reaches TypeScript but reports five unrelated errors in `src/apiCacheWorker.ts`, `src/lib/apiHandler.ts`, `src/lib/siteScripts.ts`, and `src/lib/turso.ts`.
- The modal uses a sandboxed iframe; current permission attributes must not be broadened without separate security review.

## Required Handling in Future Phases

### Module and message boundary

- Reject messages not sent by the active preview iframe or with malformed IDs, node values, version, or slug.
- Do not let iframe code access parent storage. The host editor module owns reads/writes; keep `allow-same-origin` out unless separately reviewed and approved.
- A malformed or stale editor record must not be treated as a successful save or silently replaced by a server fetch.

### Local storage

- `localStorage` stores strings, is origin-scoped, persists across browser restarts, and can fail due to policy, privacy mode, serialization, or quota. It is not session-only storage.
- Catch read, parse, stringify, and write failures. Preserve the current in-memory document when possible, show a clear unsaved/local-storage error, and do not claim it was saved. This behavior is implemented in source; browser-level failure behavior is unverified.
- Use a schema version and template slug in the record; validate both before use. Avoid storing credentials, tokens, user identity, or unrelated app data in editor records.
- The current UI has no reset/remove control. Closing the modal preserves the local record; removal is through browser site-data controls. Do not delete a valid saved edit merely because a fetch or route load fails.

### Route and loading

- Show a processing state while source HTML or local record is being prepared. Prevent duplicate edit-session initialization.
- Invalid/reserved slug routes and missing catalog metadata need a recoverable route state.
- Verify browser refresh/direct navigation for `/{slug}/edit`; a client-side route working after navigation is not proof that Cloudflare serves the shell on direct refresh.

### Download and privacy

- Edited HTML must only enter a local Blob. Never include it in API bodies, analytics, logs, errors, or query strings.
- Edited Download must not issue the download metric POST; unedited/card metric behavior remains as existing.
- If local save/serialization fails, do not download original HTML while presenting it as the user's edited document.
- A localStorage-only content source does not guarantee zero network traffic: template scripts, fonts, images, or other referenced resources may still request remote assets under existing preview policy.

## Phase 4 Verification Cases and Results

1. Cancel edit confirmation and verify no local record or route change.
2. Accept confirmation; verify loading state, one initial raw source read when needed, local record creation, and edit route.
3. Reload directly at edit route and verify valid local HTML is used without a raw HTML refetch for that slug.
4. Edit visible text; verify local record, Preview, HTML view, and downloaded file agree.
5. Simulate corrupt record, blocked storage, and quota/write failure; verify explicit recovery and no silent original fallback.
6. Inspect Network and logs for absence of edited HTML. Verify edited metric POST is absent and unedited/card metrics remain unchanged.
7. Verify sandbox permissions, reserved routes, Back/Forward, direct refresh, and existing modal/card behavior.

### Source/Tool Results

- Source audit found and fixed that edits were not persisted after the initial record write.
- Source audit found and fixed edit-route Code/Copy/Download fallback to original HTML when the required local record was missing.
- `get_errors` reports no errors for touched TypeScript/TSX files; local storage smoke checks passed for missing, read/write/rewrite, corrupt JSON, and quota failure.
- The bootstrap script parses as JavaScript; build passes. Local HTTP returns 200 for the edit-route SPA shell and public catalog/raw endpoints.
- Local browser checks verified edited Blob content, request/metric behavior, corrupt-record handling, quota failure, reload, and route history. The harness did not expose real OS clipboard contents. Cloudflare Pages direct refresh and deployment remain unverified; do not infer production readiness from local results.
- Phase 5 Pages emulator check: `/` and `/{slug}/edit` shell return `200`; localStorage-backed edit loads and restores on refresh; Preview/HTML and Back/Forward pass with fixture metadata; no main-frame raw GET occurs for an active local record. Actual API Functions return `503` without local bindings. No production or deployment check occurred.
