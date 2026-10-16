# Error Handling Inventory

## Audit Basis

- Source baseline: `13faaf6ed9ec67dad5ca9a96e8e0e4701ff0a28c`, package `0.0.5`, 2026-10-16.
- This inventory describes source paths; it does not establish Cloudflare, database, or browser runtime behavior.

## Existing Source Behavior

### Public catalog and modal

- Settings request failure is caught; local default branding remains. No dedicated public settings error state is shown.
- Template metadata fetch failure clears the template array and shows a retry state distinct from a successful empty/no-results response.
- Raw HTML fetch failures are caught. Code view shows an error; copy/download paths show a toast.
- Public routes resolve `/`, `/popular`, `/categories/{slug}`, and `/templates/{slug}`; legacy modal routes remain. Invalid/malformed template or category routes show recoverable errors.
- Card preview hides its loader on `load` and reports `Preview unavailable` on `error`; modal preview has equivalent failure feedback.
- Browser title and descriptions are updated client-side. No server-rendered crawler error/metadata path exists in source.

### API, auth, storage

- JSON API helper sets CORS `Access-Control-Allow-Origin: *`; OPTIONS returns 204 with the same broad origin policy.
- Current Phase 2 source rejects missing/short (`<43` characters) Admin signing secrets: setup/login return 503; token verification fails closed. Protected `/api/vcon/*` routes return 401 for invalid/missing tokens. New JWTs require `kid: admin-v2`, invalidating old tokens.
- Login and first-admin setup have five attempts per 15-minute in-memory window keyed by `CF-Connecting-IP`, or a shared `unknown` key when absent. This is per-isolate best-effort control, not persistent/distributed enforcement.
- Admin setup, add-user, and password change enforce the shared `src/lib/authPolicy.ts` 15–128 character rule in source. Existing stored passwords are not migrated and remain valid for login.
- Public raw/detail/download slug decoders catch invalid percent encoding and return 400. R2 file/object key decoding catches malformed encoding and returns 400.
- Unknown raw template returns plain-text 404; unknown detail returns JSON 404; invalid download slug returns JSON 400.
- Public template-list responses use a generic error. `handleApiRequest` maps `TursoPersistenceError` to a sanitized 503 and unexpected exceptions to a generic 500 while logging method and error type only. Other explicitly caught Admin handlers may still return their own messages.
- Local development can still use in-memory mock data. Deployed DB-backed routes reject mock/unconfigured Turso with 503; strict real-client helper failures throw a sanitized persistence error rather than returning mock data or mutation success. Runtime failure behavior is not live-tested.
- Template/R2 sync jobs have pending/failed states and bounded retry attempts when backed by real Turso; strict Turso persistence errors now propagate separately from R2 transfer errors. Mock mode cannot persist jobs; runtime retry behavior remains unverified.
- R2 S3 helpers return `{success:false}` on caught upload/read/list/delete failures. R2 credentials are sourced only from deployment environment variables/native binding. App save and `/api/vcon/save-env` routes reject writes; old `r2_config` values remain untouched but are no longer read by the API.
- API paths do not uniformly turn every non-persistence failure into the same status/error format.
- Download counter increments only after the template exists and the client triggers the download after loading HTML. The metric records a download request, not confirmed file-save completion.

### Diagnostics

- In Dev Mode, `PublicApp` records API responses/failures and top-level `window.error`/`unhandledrejection` events in an in-memory list capped at 100 entries.
- `DevLogPanel` states that it does not capture response bodies, credentials, iframe-internal traffic, or account-wide Cloudflare analytics. Logs are not persistent.
- `src/main.tsx` wraps `App` in a minimal error boundary with a reload recovery view; normal app layouts are unchanged.

## Phase 2 Auth Changes

- Missing/short signing configuration fails closed. Admin token issuance receives the runtime secret passed by `handleApiRequest`; no source fallback remains.
- New tokens use `kid: admin-v2`; the verifier rejects tokens without this identifier before signature verification. A deployment must provide a secret of at least 43 characters or Admin setup/login will be unavailable.
- Rate-limit counters are in-memory and isolate-local; restarts/new isolates reset them. Treat them as bounded code-level abuse friction only.
- Password validation is shared between backend routes and existing Admin setup/add/change forms. No layout changes were made; error text now states the new 15–128 character rule.

## Phase 6 Activity and URL Handling

- Public category list is read from active category records; routes resolve by slug. Search text stays in local UI state and is never sent to the activity endpoint.
- Single/bulk template forms select an active category when category data is available; API save paths reject inactive/unknown category names.
- On schema initialization, if no `General` category exists, orphan template rows with category `General` are reassigned to the earliest active category. This idempotent data repair has not been run against a live DB; only matching template category values are affected, not category records.
- `POST /api/activity` accepts only validated `category_view` and `template_open` events. `download_request` is recorded alongside the existing download-counter request.
- Daily aggregate rows contain only UTC day, event, resource slug, count, and update time. IP is used transiently for in-memory request limiting and is not stored; user IDs, user agents, raw search terms, and per-user histories are not stored.
- Aggregate reads require Admin auth and a valid date range of at most 90 days. Cleanup runs on aggregate writes and reads. Schema migration, retention, route history, and deployed event counts have not been runtime-tested.

## Required Error-Handling Work (Approval-Gated)

1. Fail closed for missing Admin signing configuration and real Turso persistence failures; never report mock writes as durable success.
2. Add a controlled Pages/API top-level failure boundary; return safe public errors and keep sensitive provider details in protected server logs.
3. Catch malformed R2 key decoding and return a stable 4xx response.
4. Separate loading, valid-empty, and failed catalog states; add iframe load-error feedback and a root render recovery path without redesigning the UI.
5. Define the download counter event precisely. The existing server counter records the POST request before HTML retrieval and cannot prove the browser saved a file.
6. Verify log redaction and ensure no credentials, template HTML, or raw search values enter persisted diagnostics.

## Verification Requirements

- Exercise missing/invalid secrets, unauthorized API calls, DB outage, schema migration failure, R2 outage, malformed percent encoding, invalid JSON, missing template, empty catalog, API 500, iframe failure, and React render failure in isolated tests/staging.
- Confirm expected HTTP status, safe client message, useful protected diagnostics, and no false success.
- Verify app interactions continue after best-effort diagnostics/analytics failures.
- Never use production data or credentials for fault injection without separate explicit approval.
