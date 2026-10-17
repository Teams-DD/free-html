# Editor Implementation Status

## Frozen Baseline

- Base branch/commit: `main` / `1fcea4b85dba1c001d0a7b2a32f7cd09db2e5665`, dated 2026-10-16. Current implementation and documentation changes are uncommitted in the working tree.
- Package/lockfile: `0.0.5`.
- The task began with Phase 1/2 work already present as uncommitted changes. Phases 2–5 were completed locally, including Pages emulator checks; no deployment occurred.

## What Exists in Source

- Modal Preview/HTML modes and a default-on `Editable` switch.
- Editor document processing, eligible text mapping, iframe `postMessage` protocol/state, preview preparation, and edited-HTML computation are extracted to `src/editor/` and used by `PublicApp.tsx` through the public module exports.
- Modal edited Download uses a local Blob and skips the metric POST when valid edited HTML exists. Unedited/card downloads retain their current metric behavior.
- A source guard fails edited HTML generation on a missing target or changed text-node shape and blocks modal download rather than silently falling back to original HTML.
- Preview text selection opens Yes/No confirmation. Yes writes a versioned per-slug localStorage record before changing to `/{encodedSlug}/edit`; No leaves the route/content unchanged.
- Existing local records load before raw HTML. Missing/corrupt/unavailable records fail visibly; edit-route HTML, Copy, and Download do not fall back to server HTML.
- Each validated text-edit message is synchronously converted to HTML and written to the local record. Preview/HTML switching and modal Copy/Download use the local document while local edit mode is active.
- Local storage write/sync failures are surfaced in the modal. Invalid edit mappings block export; valid in-memory edits can still be downloaded as a local Blob if storage is unavailable.
- Closing the modal preserves the saved per-slug record. There is no in-app reset control; browser site-data controls can remove it.

## New Plan State

- Phase 0: complete; documentation refresh.
- Phase 1: complete in source; the reusable engine is under `src/editor/`.
- Phase 2: complete in source; confirmation, initial persistence, local-first route loading, and fail-closed route handling are implemented.
- Phase 3: complete in source; edit snapshots persist immediately and local HTML drives Preview/HTML/Copy/modal Download.
- Phase 4: source and local browser regression complete; Cloudflare/production behavior remains unverified.
- Phase 5: Pages local SPA shell/direct edit route and fixture-backed saved-edit flow verified; real Pages Functions data bindings returned 503.
- Phase 6: approved, but blocked before deployment because `npx wrangler whoami` reports unauthenticated. `npm run build` passes; deployment was not attempted.

## Verification Limits

- `LocalHtmlStore` smoke checks passed for missing records, repeated write/read, corrupt JSON, and quota failure. Editor-file diagnostics and iframe bootstrap parsing pass.
- `npm run build` passes after installing missing Windows native packages locally without manifest/lockfile changes. `npm run lint` reports five existing/out-of-scope type errors in `src/apiCacheWorker.ts`, `src/lib/apiHandler.ts`, `src/lib/siteScripts.ts`, and `src/lib/turso.ts`; no editor module errors are reported.
- Local browser checks verified confirmation/processing, initial save, text persistence, Preview/HTML switching, direct edit-route reload, Copy API input, edited Blob content, edited no-API/no-metric behavior, unedited/card metric POSTs, corrupt/quota errors, and Back/Forward. Real OS clipboard contents were not observable.
- Wrangler Pages emulator served `/` and `/{slug}/edit` as `200`; direct refresh and localStorage restoration passed. Fixture-backed metadata allowed Preview/HTML and Back/Forward checks. Real Pages Functions (`/api/templates`, `/api/categories`, `/api/settings`, raw/activity) returned `503` because local persistent Turso bindings/vars were unavailable. No source change, production access, or deployment occurred in Phase 5.
- Cloudflare production behavior and separate-app module reuse remain unverified. Phase 6 requires a separate approval.
- Phase-06 approval is recorded. The configured target is `html-snippets`; local Wrangler authentication is missing. No production command/request was issued. The owner must run `npx wrangler login` locally and ask to resume; never share the auth token.
