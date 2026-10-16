## Phase 1: Measure and Agree Freshness Targets — Complete in Source; Live Activation Pending

**Completion gate:** live endpoint payload/header sample is recorded, the user freshness target is recorded, and the requested evidence tool is implemented without changing cache/sync behavior. Account-wide metrics that are unavailable from the public app are explicitly labeled unavailable. This source phase is complete; Dev Mode behavior on production remains unverified until deployment.
# Production Performance Roadmap

## Global Scope Lock

This roadmap covers public API read caching, content freshness, template payload/data access, R2/Turso sync reliability, and admin status-call cost only.

Unless a phase explicitly lists a user-visible effect, preserve all existing routes, authentication, public card previews, filters, modal/device modes, downloads, counters, admin workflows, and UI. Do not change unrelated styling, features, database schema, or infrastructure. Each phase requires explicit approval before implementation.

## Phase 0: Freeze and Document Baseline — Complete

**Scope:** documentation only; no runtime changes.

- Record commit, branch, worktree state, known runtime findings, and unavailable production configuration.
- Preserve audit evidence and phase scopes in this notes folder.

**Completion gate:** baseline SHA and clean/synced status recorded; source findings linked. Completed at baseline `417dc16202a69806bf62bb55819ed3d16c2326b7`.

## Phase 1: Measure and Agree Freshness Targets — Complete in Source; Live Activation Pending

**Scope lock:** measurement plus the explicitly requested, opt-in Dev Mode evidence tool only. Allowed runtime changes are: persist a `dev_mode` setting; add its toggle to Admin Settings; show a local-only public Dev Log panel only when that setting is enabled; record public-app API request timing/status/bytes/cache headers and browser errors; add request-level `Server-Timing` for `/api/settings` and `/api/templates`. Do not log HTML bodies, setting values, credentials, tokens, or send/store diagnostics. Do not add Cloudflare Analytics credentials or claim account-wide metrics. No cache behavior, R2/Turso write flow, routes, or unrelated UI/features may change.

1. Capture response size/latency and headers for `/api/settings` and `/api/templates`.
2. Record `CF-Cache-Status`, `Age`, `ETag`, and `Server-Timing` when present; absent values must be recorded as unavailable, not inferred.
3. Separate browser-observable per-request measurements from Cloudflare account-wide invocation/usage metrics.
4. Record acceptable staleness after create/edit/delete and settings changes; user target is immediate visibility on the next request after update.
5. Record the measured public payload composition and the limits of request-level Turso/R2 attribution.

**Completion gate:** the live endpoint sample and user freshness target are recorded, and the requested Dev Mode evidence tool is implemented without changing cache or content-sync behavior. Account-wide metrics that are not available from public responses are explicitly marked unavailable. Source phase is complete; production activation remains unverified until deployment.

**Current evidence:** the user supplied `https://html.vibid.my/` and specified immediate visibility on the next request after an update. One live read-only sample is recorded in the phase log. The Dev Mode implementation is complete in source under the amended scope above.

**Remaining limitation:** Cloudflare account-wide metrics are not exposed by the public responses, and no Cloudflare Analytics credential/dashboard evidence is available. Browser Dev Mode shows per-request response headers/timing and instrumented server spans only; it cannot truthfully report global Pages invocations or account usage. Phase 01 does not implement caching, global purge, or changed-file-only synchronization.


## Phase 2: Cache Public Read Responses — In Progress

**Scope lock:** add a separate Wrangler-deployed Worker route in front of the existing Pages origin. Route only `/api/settings*`, `/api/templates*`, `/api/vcon/settings*`, `/api/vcon/templates*`, and `/api/vcon/seed-db*` through it; keep all static UI and other API routes on Pages. Cache only exact public GET `/api/settings` and `/api/templates` responses in Workers Cache with path+query keys, browser `Cache-Control: no-store`, a 60-second edge TTL, and tags. Proxy related existing writes unchanged to Pages; on successful template/settings/seed writes, purge the relevant global cache tag before returning. Do not change API JSON payloads, auth, write semantics, database schema, upload/delete behavior, or UI other than the already-approved Phase 1 Dev Mode. Do not cache download-counter POSTs; their values in the cached template list may be up to 60 seconds stale as explicitly approved. Raw template, single-template view-counter, and all other API reads must not enter the new cache. Do not add account-wide Analytics credentials or implement Phase 4 payload/sync changes.

1. Use Workers Cache (not Pages `caches.default`): Cloudflare documents that it is checked before the Worker, tiered globally, and supports tag purge. Pages Wrangler schema in the installed project rejects `cache.enabled`, so deploy the cache gateway as a separate Worker route while retaining Pages as origin.
2. Proxy misses to the verified `https://free-html.pages.dev` origin; do not copy Pages Turso/R2 credentials into the gateway Worker.
3. Cache only exact settings/list GET endpoints; keep query string in the cache key and bypass/non-cache other existing APIs.
4. On successful settings save, template create/update/delete/bulk, and seed operations, purge the corresponding global tag. Do not purge after counter POST; its cached display may lag by up to 60 seconds.
5. Verify origin response, cold miss, warm hit without Pages Function execution, query variants, successful write followed by immediate fresh GET, counter staleness bound, and unrelated route pass-through in deployed staging.

**Completion gate:** deployed warm public GETs demonstrably hit Workers Cache without invoking Pages Functions; a successful relevant write purges the tag and the next GET observes updated content; other routes retain their existing behavior. A source-only diagnostic result does not satisfy the live cache gate.

**Implementation evidence:** `src/apiCacheWorker.ts` and `wrangler.cache.toml` define the separate gateway. The configured Pages origin `https://free-html.pages.dev` was verified with read-only GETs returning the same 200 JSON sizes as the custom domain. Installed Wrangler `4.151.0` dry-run validation succeeded. The Worker route itself has not been deployed or live-tested.

**Operational limits:** Workers Cache purges are globally propagated, per-Worker, and rate-limited to the Free-tier 5 requests/minute even if the zone has a higher plan. A purge failure is logged and marked `X-Cache-Invalidation: failed`; the 60-second TTL is the maximum recovery window in that case. Verify `Cloudflare-CDN-Cache-Control` behavior, route ownership/precedence, and live `Cf-Cache-Status` after deployment.

## Phase 3: Broader Cache Freshness and Asset Identity — Complete in Source; Live Activation Pending

**Scope lock:** freshness for template raw URLs and R2 assets only. Preserve UI, existing object keys, upload/download operations, and public routes. Do not change `html.mxflow.shop` zone settings.

1. Add `?v=<updated_at>` to template R2 URLs returned by list/single-template APIs; add a unique revision to branding upload URLs while retaining the existing R2 object keys and immutable object headers.
2. Make the stable Turso-backed `/api/templates/:slug/raw` response `no-store`.
3. Cache successful app-host `/api/r2/file/*` and `/api/r2/object/*` responses in Workers Cache for 60 seconds, with browser `no-store`, a shared asset tag, and a SHA-256 per-object tag.
4. Purge only affected object tags after successful template/asset writes and deletes. Purge the shared asset tag only when R2/runtime configuration changes. Keep Phase 2 settings/template-list purges.
5. Log purge failures and expose `X-Cache-Invalidation: failed`; the 60-second TTL bounds app-host fallback recovery.

**Completion gate:** source/config complete; after deployment, same-key edits return a fresh revision URL, app-host R2 fallback cache is purged for the changed key, and delete purges the targeted fallback object. No UI/API route changes; template DELETE adds an `r2_key` response field for precise invalidation.

**External-host limitation:** all sampled template `r2_url`s use `html.mxflow.shop`, outside the Worker route on `html.vibid.my`; that host returned `CF-Cache-Status: DYNAMIC` with one-year immutable caching. Revision queries refresh newly returned URLs, but old URLs already cached in a visitor's browser cannot be remotely erased. The Worker does not alter or purge the `mxflow.shop` zone.

## Phase 4: Reduce Repeated Data and Payload Work — Complete in Source; Live Measurement Pending

**Scope lock:** public catalog/content read path only. Preserve card previews, modal preview, search/filter, download behavior, and current appearance. Do not begin until the preview data contract is agreed.

1. Use an opt-in `?metadata=1` list response for the public app, with a Turso projection that excludes `html_content`; preserve the default full response for admin callers.
2. Load card/modal previews from the existing read-only raw-template endpoint, with native lazy loading for card iframes; fetch code/download content only when requested and share in-flight/client-cached reads.
3. Preserve metadata-based search/category filtering and the existing download counter POST. Paginate client-side with 12 cards by default and 12/24/48 options; slice only after filters and sorting so all templates remain reachable. This limits rendered cards/iframes but does not limit the metadata API response.
4. Compare deployed payload sizes and verify page navigation, previews, modal preview/code, filters, and downloads after rollout.

**Source completion gate:** the public metadata query omits HTML, the default/admin response remains unchanged, the public UI obtains content only through the existing read-only endpoint, and client pagination preserves access to every filtered/sorted result. Production payload comparison and browser workflow regression remain deployment checks.

## Phase 5: Make Turso/R2 Synchronization Recoverable — Complete in Source; Failure-Injection Verification Pending

**Scope lock:** template/asset upload, update, and delete synchronization between Turso and R2. No unrelated API or UI changes.

1. Treat Turso as authoritative: API success means the template row committed; a failed R2 operation is returned as pending with a durable recovery record.
2. Persist template mutations and their per-object desired R2 operation in one Turso write batch; coalesce repeated operations by stable object key.
3. Apply uploads/deletes only after the Turso mutation commits. Repeated PUT/DELETE operations on the same key are idempotent; delete failures remain queued.
4. Record a secret-safe failure code, cap attempts at five, and schedule delays of 30 seconds, 2 minutes, 10 minutes, and 30 minutes. Provide an authenticated retry endpoint with a 20-job request cap and explicit force-retry for exhausted jobs.
5. Keep failure-injection checks for Turso/R2 provider boundaries as deployment verification; do not claim production recovery until exercised against deployed services.

**Source completion gate:** each real-Turso template mutation and its desired R2 operation persist atomically; provider failures remain retryable/observable, and mock storage is explicitly outside durable recovery. Deployment verification remains required for live failure/retry behavior.

## Phase 6: Reduce Admin Status/Configuration Work — Complete in Source; Runtime Metrics Pending

**Scope lock:** `/api/status`, its `fetchStatus` callers, and config reads needed by the status response. Public API behavior and admin UI layout remain unchanged.

1. Reuse `/api/status` probe results for 30 seconds; `GET /api/status?refresh=1` forces live Turso/R2 checks.
2. Deduplicate/throttle admin status requests and refresh status after explicit status-page actions or R2 configuration changes, not after routine template refreshes.
3. Load saved R2 settings only on routes that use those values for status, public URL mapping, R2 operations, or template sync.
4. Preserve the existing response shape and admin-only explicit `/api/vcon/test-turso` and `/api/vcon/test-r2` actions; do not introduce shared CDN caching for status.

**Source completion gate:** repeated status visits reuse recent probes, explicit refresh bypasses the cache, and unrelated routes skip the stored R2 config lookup. Production call-volume impact remains to be measured after deployment.

## Phase 7: Production Rollout and Regression Gate — Approved; Blocked Before Staging

**Scope lock:** staged deployment, monitoring, rollback, and verification for approved phases only.

1. Restore the missing Windows Rolldown native binding and establish a successful production build.
2. Authenticate Wrangler and configure an approved preview/staging Pages target plus a non-production Worker route before deployment.
3. Run focused checks for cache key/freshness, authorization, mutations/counters, public previews/downloads, and Turso/R2 partial failure recovery.
4. Compare latency, bytes, Function invocations, Turso operations, and R2 operations against the Phase 1 baseline; account-wide metrics require authorized dashboard evidence.
5. Verify rollback in staging, document detach/redeploy/purge steps, then update rollout notes with measured results.

**Completion gate:** no regression in existing workflows; measured targets meet the agreed SLA; production/staging behavior is evidenced and rollback has been tested. Do not deploy the production Worker route as a substitute for staging.

## Dependency Order

`0 -> 1 -> 2 -> 3 -> 4 -> 5 -> 6 -> 7`

Phase 4's payload split is a decision gate, not a pre-approved API/UI redesign. Phase 5 may proceed independently after Phase 1 if sync reliability is prioritized, but it must not be represented as CDN caching work.