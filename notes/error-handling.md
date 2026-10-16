### Admin APIs and UI

- Phase 1 Dev Mode records public app API failures by route and error class, plus top-level `window.error`/`unhandledrejection`; it caps the in-memory log at 100 entries, redacts common credential labels in browser error text, and does not transmit diagnostics: [PublicApp.tsx](../src/public/PublicApp.tsx) [DevLogPanel.tsx](../src/public/DevLogPanel.tsx).
- Public read responses expose request-level `Server-Timing` spans; these show the timed helper spans, not a verified count of underlying SQL statements or Cloudflare account-wide usage: [apiHandler.ts](../src/lib/apiHandler.ts).
# Error Handling Inventory

## Audit Basis

This document records source behavior at baseline `417dc16202a69806bf62bb55819ed3d16c2326b7`. “Present” means a code path exists; it does not claim the path was runtime-tested against production services.

## Existing Error Handling

### Public page and read APIs

- Settings fetch catches errors and leaves/defaults to local settings; no visible error is presented for that request: [PublicApp.tsx](../src/public/PublicApp.tsx#L67).
- Template list fetch catches errors and sets `snippets` to an empty array. The UI then follows its empty-list state, so the source does not distinguish “no templates” from “request failed”: [PublicApp.tsx](../src/public/PublicApp.tsx#L117).
- `/api/settings` catches failures and returns a successful response with default settings: [apiHandler.ts](../src/lib/apiHandler.ts#L254).
- `/api/templates` catches failures and returns JSON with status 500: [apiHandler.ts](../src/lib/apiHandler.ts#L280).
- `getTemplates` catches database errors and falls back to mock templates: [turso.ts](../src/lib/turso.ts#L586).
- The single-template raw route returns 404 text when no template is found: [apiHandler.ts](../src/lib/apiHandler.ts#L300).

### Public counters

- Download endpoint calls `incrementDownloads`; the client starts the POST without awaiting it and ignores request rejection: [PublicApp.tsx](../src/public/PublicApp.tsx#L156).
- Single-template view increment rejection is explicitly swallowed: [apiHandler.ts](../src/lib/apiHandler.ts#L339).

### Turso and R2 persistence

- `saveTemplate` catches Turso persistence errors, logs a warning, and still returns the in-memory saved object: [turso.ts](../src/lib/turso.ts#L806) [turso.ts](../src/lib/turso.ts#L817).
- R2 helpers catch provider errors and return `{ success: false, error }`: [r2.ts](../src/lib/r2.ts#L145) [r2.ts](../src/lib/r2.ts#L250) [r2.ts](../src/lib/r2.ts#L298).
- Single template API can return success with an `r2Warning`: [apiHandler.ts](../src/lib/apiHandler.ts#L771).
- Bulk template upload continues to Turso save after an R2 upload failure; its uploaded count is based on successful `saveTemplate`, not successful dual-store sync: [apiHandler.ts](../src/lib/apiHandler.ts#L666) [apiHandler.ts](../src/lib/apiHandler.ts#L687).
- Template deletion ignores caught R2 deletion failures before deleting the Turso record: [apiHandler.ts](../src/lib/apiHandler.ts#L789).

### Admin APIs and UI

- `json()` centralizes JSON content type and CORS headers; endpoint-specific catches/HTTP status codes vary: [apiHandler.ts](../src/lib/apiHandler.ts#L28).
- Remaining `/api/vcon/*` routes verify the admin token and return 401 when invalid: [apiHandler.ts](../src/lib/apiHandler.ts#L453).
- Admin login/setup and manager pages contain local catch/feedback paths; exact behavior is page-specific. R2 test/save paths append messages to the page log: [R2Manager.tsx](../src/vcon/pages/R2Manager.tsx#L90).
- Phase 1 Dev Mode records public app API failures by route/error class and top-level `window.error`/`unhandledrejection`; entries are local-only, capped at 100, and common credential labels are redacted: [PublicApp.tsx](../src/public/PublicApp.tsx) [DevLogPanel.tsx](../src/public/DevLogPanel.tsx).
- Public read responses expose request-level `Server-Timing` spans. These are measured helper durations, not verified counts of underlying SQL statements or Cloudflare account-wide usage: [apiHandler.ts](../src/lib/apiHandler.ts).
- The Phase 2/3 Worker logs secret-safe error codes/names when tag purge fails and marks the write response `X-Cache-Invalidation: failed`; app-host cached content then ages out within the configured 60-second TTL. Per-object invalidation is source-reviewed but not live-tested: [apiCacheWorker.ts](../src/apiCacheWorker.ts).

## Gaps to Address in Approved Phases

1. Distinguish a valid empty template list from a failed list request; show retryable user feedback without replacing valid cached data with an empty state.
2. Define error contracts for cache hit/miss, stale response, origin failure, and invalidation failure.
3. Never claim “synced” unless the selected persistence contract is met; represent DB-only/R2-only partial outcomes and make them recoverable.
4. Add bounded retry/backoff only to idempotent operations; use idempotency or reconciliation records for writes.
5. Preserve counter behavior while reporting failures; do not let a counter retry duplicate increments.
6. Add structured, secret-safe logs/counters for route, cache status, origin fallback, Turso/R2 result, and invalidation result.
7. Define whether mock fallback is acceptable in production. If retained, make degraded/mock response distinguishable from real data.
8. Verify cache failures fail open to origin where safe, while auth/admin/write endpoints always bypass shared public cache.

## Error Acceptance Gate

- Every public read has defined fallback and visible/stale behavior.
- Every mutation has explicit all-success/partial-success semantics.
- Retries are bounded and duplicate-safe.
- Cache invalidation failure is observable and recoverable.
- Logs exclude auth tokens, R2 secrets, and full user-supplied HTML.
- Tests cover success, network failure, provider failure, partial success, retry, and stale-cache cases.

## Phase 5 Implementation Record (2026-10-16)

- Turso is the authoritative template store. For the real Turso client, API success now follows the Turso template mutation plus sync-job write batch; an R2 failure is returned as pending, not as fully synced.
- The `template_sync_jobs` table coalesces desired upload/delete state by stable object key. Upload and delete attempts happen only after the Turso mutation commits; repeating an object PUT or DELETE uses the same key and is idempotent. A per-key generation prevents stale attempts from clearing or changing a newer job.
- A failed job stores a fixed error code, attempt count, and next-attempt timestamp. Attempts stop after five, with retry delays of 30 seconds, 2 minutes, 10 minutes, and 30 minutes. Authenticated `POST /api/vcon/templates/sync-retry` processes up to 20 due jobs; `{ "force": true }` resets exhausted jobs.
- Logs include only action, object key, and a fixed failure code; HTML, credentials, and raw provider error messages are excluded from the new recovery log.
- Mock/in-memory storage has no durable job store and is explicitly not covered by the recovery guarantee. No scheduled retry service or admin UI was added; an administrator must invoke the protected retry endpoint for due jobs.
- Source diagnostics reported no errors for the touched API/storage files. Live Turso/R2 failure injection, persisted retry, and recovery have not been verified in deployment.

## Phase 6 Implementation Record (2026-10-16)

- `/api/status` reuses its last successful probe result for 30 seconds. `GET /api/status?refresh=1` explicitly bypasses that reuse and performs the live Turso/R2 checks.
- Admin status requests deduplicate in-flight requests; non-forced client lookups are throttled for 30 seconds. Initial load and explicit status-page refresh/test/config-change follow-ups force a live refresh; routine template refreshes do not trigger health probes.
- Saved R2 configuration is read only for status, public URL mapping, R2 operations, and template sync. Unrelated routes skip the extra Turso settings lookup.
- Explicit protected `/api/vcon/test-turso` and `/api/vcon/test-r2` behavior is unchanged. The status response shape and auth rules are unchanged.
- Source diagnostics reported no errors. The 30-second cache is isolate-local and production call-volume/latency improvement has not yet been measured.