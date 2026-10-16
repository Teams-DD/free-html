# Production Readiness Audit

## Audit Basis

- Audited baseline: `417dc16202a69806bf62bb55819ed3d16c2326b7` on `main`.
- Worktree: clean at audit start.
- Method: source-path tracing of public load, Pages Functions routing, Turso reads/writes, and R2 operations.
- No implementation changes were made as part of this audit.
- Live Cloudflare Dashboard rules, production headers, query metrics, and cache hit ratios are unknown; findings below do not assume their values.

## Confirmed Findings

### F-01: Public page requests settings and the complete template list on each mount

`PublicApp` invokes `/api/settings` and `/api/templates` from mount effects. The template request is not page- or cursor-limited in this caller. Browser HTTP caching may affect an individual request, but this source path issues both fetches on a new app mount.

- [PublicApp.tsx](../src/public/PublicApp.tsx#L67)
- [PublicApp.tsx](../src/public/PublicApp.tsx#L117)

### F-02: Template list reads and returns complete HTML for every template

`getTemplates` builds `SELECT * FROM templates`, maps each `html_content`, and the public API returns the mapped items. The HTML is therefore part of the list payload used by card previews; this is not a public-page R2 download path.

- [turso.ts](../src/lib/turso.ts#L624)
- [turso.ts](../src/lib/turso.ts#L668)
- [apiHandler.ts](../src/lib/apiHandler.ts#L280)
- [apiHandler.ts](../src/lib/apiHandler.ts#L294)
- Card preview uses the returned HTML: [PublicApp.tsx](../src/public/PublicApp.tsx#L280)

### F-03: Public JSON responses have no source-defined cache policy

The shared `json()` helper sets content type and CORS headers, but no `Cache-Control`. Both `/api/settings` and `/api/templates` use this helper without passing cache headers. No `caches.default`, `s-maxage`, ETag, or purge path was found in `src` during this audit.

- [apiHandler.ts](../src/lib/apiHandler.ts#L28)
- [apiHandler.ts](../src/lib/apiHandler.ts#L265)
- [apiHandler.ts](../src/lib/apiHandler.ts#L294)
- Static built assets do have a one-year immutable rule: [public/_headers](../public/_headers#L1)

This proves the repository does not define API caching. It does not prove that no external Cloudflare Dashboard rule exists.

### F-03-L: Live public endpoint sample (2026-10-16)

Two sequential requests per endpoint were made from one HTTP client; the timings include client/network effects and are not certified cold/warm cache samples.

| Endpoint | Status/content type | Response bytes | Sequential client times | Cache headers |
|---|---|---:|---:|---|
| `/api/settings` | 200, `application/json` | 225,744 | 878 ms, 225 ms | `Cache-Control`, `CF-Cache-Status`, `Age`, `ETag` absent |
| `/api/templates` | 200, `application/json` | 265,048 | 373 ms, 262 ms | `Cache-Control`, `CF-Cache-Status`, `Age`, `ETag` absent |

The settings payload contains an `app_logo` string of 218,714 UTF-8 bytes and a `favicon_url` string of 6,846 bytes; values were not printed. The template list contains 9 entries with 258,572 aggregate HTML bytes; the largest HTML is 52,829 bytes. HTML contents were not printed or stored. The response `Server` header was `cloudflare`; without `CF-Cache-Status`, cache hit/miss remains unknown.

The user-set freshness target is that updated content appear on the next request after update, while unchanged HTML should not be re-synced from origin. This requires future cache/sync design; no cache behavior changed in Phase 1 measurement.

### F-04: Every Function request attempts to load saved R2 configuration from Turso

At the top of `handleApiRequest`, before route dispatch, the handler reads `r2_config` when a Turso client exists. This applies to public `/api/settings` and `/api/templates` requests as well, even when those routes do not read an R2 object.

- [apiHandler.ts](../src/lib/apiHandler.ts#L67)
- [apiHandler.ts](../src/lib/apiHandler.ts#L72)

### F-05: R2 object caching and key reuse are not consistent

The S3 upload helper writes `public, max-age=31536000, immutable`; template updates use the slug-based `templates/<slug>.html` key. A URL cached with that long immutable lifetime can remain stale after a same-key overwrite. The Native R2 upload helper sets content type but no cache-control metadata. The R2 API fallback uses object metadata or a one-day stale-while-revalidate default.

- [r2.ts](../src/lib/r2.ts#L145)
- [r2.ts](../src/lib/r2.ts#L159)
- [apiHandler.ts](../src/lib/apiHandler.ts#L740)
- [r2.ts](../src/lib/r2.ts#L298)
- [apiHandler.ts](../src/lib/apiHandler.ts#L198)

The stale result is a cache risk implied by the observed key/header combination; live cache behavior was not measured.

### F-06: R2/Turso writes can partially succeed without a durable sync record

For single template save, R2 upload failure is returned as `r2Warning` while the API still returns success after saving to Turso. Bulk upload proceeds to save/count the item even if the R2 upload did not succeed. Template delete catches and ignores R2 delete failure before continuing with the Turso delete. The current code has no visible retry queue or reconciliation record for these cases.

- [apiHandler.ts](../src/lib/apiHandler.ts#L731)
- [apiHandler.ts](../src/lib/apiHandler.ts#L771)
- [apiHandler.ts](../src/lib/apiHandler.ts#L666)
- [apiHandler.ts](../src/lib/apiHandler.ts#L792)

This is a confirmed partial-failure behavior. Whether the product intends Turso-only operation to count as a successful template save is a decision to confirm before changing it.

### F-07: Status checks perform backend work beyond returning stored status

`/api/status` tests the Turso connection, gets an R2 storage report, and tests R2 connectivity. The S3 connection test lists up to one object. Admin `VconApp` fetches this endpoint through `fetchStatus`.

- [apiHandler.ts](../src/lib/apiHandler.ts#L135)
- [apiHandler.ts](../src/lib/apiHandler.ts#L141)
- [apiHandler.ts](../src/lib/apiHandler.ts#L160)
- [r2.ts](../src/lib/r2.ts#L268)
- [r2.ts](../src/lib/r2.ts#L275)
- [VconApp.tsx](../src/vcon/VconApp.tsx#L100)

This applies to admin status refresh, not the public template-list request.

### F-08: Counter writes are separate from public content reads

Download clicks POST to the download endpoint, which increments the database counter. A separate single-template GET increments views asynchronously. The current public list fetch does not use that single-template route.

- [PublicApp.tsx](../src/public/PublicApp.tsx#L156)
- [apiHandler.ts](../src/lib/apiHandler.ts#L316)
- [apiHandler.ts](../src/lib/apiHandler.ts#L325)
- [apiHandler.ts](../src/lib/apiHandler.ts#L339)

These write endpoints must not be cached as public read responses.

## Production Risks and Unknowns

- **Confirmed source gap:** no cache policy is declared for public JSON responses.
- **Confirmed source cost:** full HTML list is read from Turso and returned with every uncached list response.
- **Confirmed partial sync:** R2 and Turso outcomes can diverge on upload/delete failure.
- **Cache risk:** same-key R2 overwrite plus immutable S3 metadata may serve old content; verify against deployed cache behavior before choosing purge/versioning.
- **Unknown:** Cloudflare Dashboard Cache Rules, live `CF-Cache-Status`, production latency, request counts, Turso query counts/cost, and R2 egress.
- **Unavailable for Phase 1 measurement:** no deployed public hostname is recorded in repository config; `.env` and `.dev.vars` are absent. The only environment template is `.env.example`, which contains placeholders. No Cloudflare dashboard metrics were available in the workspace.
- **Local verification blockers previously observed:** Vite/Rolldown could not load its Windows native binding; `npm run dev` could not resolve `@xmldom/xmldom`. Recheck the dependency installation before using build or browser tests as a release gate.

## Audit Conclusion

The safest first performance improvement is to measure and cache public read responses with explicit freshness rules. Public card previews currently depend on full HTML in `/api/templates`, so removing HTML from that response without a replacement preview/content path would change visible behavior. No code changes are authorized by this report.

## Phase 2 Implementation Record (2026-10-16)

- User-approved architecture: a separate Workers Cache gateway Worker on targeted API routes; existing Pages remains the static app and API origin.
- Origin verification: `free-html.pages.dev` returns the same 200 JSON payload sizes as `html.vibid.my` for `/api/settings` and `/api/templates`.
- Wrangler 4.151.0 accepts/dry-runs `wrangler.cache.toml`; the Pages config schema rejects `cache.enabled`, so Workers Cache is configured only in the separate Worker file.
- Cache scope: exact GET `/api/settings` and `/api/templates`; 60-second edge TTL; query string remains part of the default Workers Cache key; browser response is `no-store`.
- Global invalidation: successful settings/template/seed mutations purge corresponding Workers Cache tags. Counter POSTs are not purged; counter values in the list can lag by up to 60 seconds.
- Out of scope: all other API payloads/UI, changed-file-only sync, DB/R2 persistence semantics, and account-wide Cloudflare analytics.
- Deployment/runtime status: source and config only; route attachment and live HIT/purge behavior have not been verified. Cloudflare route-zone authorization is required for deployment.
- Official docs: [Workers Cache](https://developers.cloudflare.com/workers/cache/), [Cache keys](https://developers.cloudflare.com/workers/cache/cache-keys/), [Purge and invalidate](https://developers.cloudflare.com/workers/cache/purge/), [Pages Wrangler configuration](https://developers.cloudflare.com/pages/functions/wrangler-configuration/).

## Phase 3 Implementation Record (2026-10-16)

- Live asset finding: all nine sampled template R2 URLs use `html.mxflow.shop`; HEAD returned 200, one-year immutable cache-control, and `CF-Cache-Status: DYNAMIC`. Current branding fields were data URIs.
- Same-key freshness: template list/single API URLs now include an `updated_at` revision query; branding upload URLs receive a unique revision. R2 object keys and upload operations remain unchanged.
- Stable HTML endpoint: `/api/templates/:slug/raw` now uses `Cache-Control: no-store`.
- App-host fallback: `/api/r2/file/*` and `/api/r2/object/*` have a 60-second Workers Cache response, browser `no-store`, a shared configuration tag, and per-object SHA-256 tags. Relevant successful mutations purge affected object tags; R2/runtime configuration changes purge shared tags.
- Template DELETE adds `r2_key` to the authenticated JSON response so the Worker can purge only that object; existing UI reads `success` only.
- External host limitation: the Worker route on `html.vibid.my` does not intercept or purge `html.mxflow.shop`. Revisioned URLs refresh on new API responses, but previously cached old immutable URLs cannot be revoked from a visitor's browser.
- Worker deployment and live cache/purge behavior remain unverified.

## Phase 4 Implementation Record (2026-10-16)

- The public app requests `/api/templates?metadata=1`; this variant selects catalog columns without `html_content`. The default `/api/templates` response remains full for admin and other existing callers.
- Card previews use native lazy iframes against the existing sanitized, read-only `/api/templates/:slug/raw` route. Modal preview uses the same route; code/copy/download retrieve HTML only when needed and share in-flight/client-cached reads.
- Existing client-side category/search filtering, download counter POST, and local count update remain unchanged. No auth, mutation, R2 sync, schema, or unrelated route behavior changed.
- One source typecheck attempt was blocked before TypeScript ran because `@typescript/typescript-win32-x64` is missing. The deployed metadata response size and browser initial/scroll/modal/filter/download behavior have not yet been measured; Phase 1's 265,048-byte full-list sample remains the before baseline.

## Phase 5 Implementation Record (2026-10-16)

- Template writes now persist the Turso row and a per-object `template_sync_jobs` upsert in one libSQL write batch. Deletes persist the row deletion and R2 delete intent in one write batch. R2 operations run after the database commit.
- The chosen contract is Turso-authoritative: a successful response means the Turso mutation committed; `r2SyncStatus`/`r2_sync_status` reports whether R2 also synced or remains pending. Bulk responses expose `sync_pending`.
- Jobs coalesce by stable object key and retain action, template reference, generation, attempt count, next-attempt time, and fixed failure code. Generation-guarded completion/failure updates cannot overwrite a newer job. Attempts are capped at five with bounded backoff. An authenticated admin endpoint retries at most 20 due jobs and supports explicit force requeue.
- No authentication rules, UI, cache policy, settings, or unrelated routes were changed. The new retry route is inside the existing protected `/api/vcon/*` gate.
- VS Code diagnostics reported no errors in the touched API/storage modules. Live DB/R2 fault injection, recovery, and production deployment remain unverified. Mock storage cannot provide durable recovery; no scheduler/admin UI was added.

## Phase 6 Implementation Record (2026-10-16)

- `/api/status` caches successful probe results in the current isolate for 30 seconds. `GET /api/status?refresh=1` forces a new check. The JSON response shape is unchanged.
- Admin initial load and explicit status-page refresh/test/config changes request fresh status. Client requests are deduplicated/throttled, and template-only refresh/bulk actions no longer invoke health checks.
- The database-stored R2 config lookup is conditional on route use. Public settings/templates and R2/status/template-sync routes retain config resolution; unrelated paths skip it.
- Explicit protected Turso/R2 test routes, auth, UI layout, public APIs, writes, cache configuration, and Phase 7 rollout settings were not changed.
- VS Code diagnostics found no errors in the touched files. Isolate-local cache behavior and production call-volume/latency impact remain unverified.

## Phase 7 Rollout Preflight (2026-10-16)

- Approval received to stage and verify Phases 1–6, compare metrics with the Phase 1 baseline, test write freshness/sync recovery, and document rollback.
- `npm run build` did not complete: Rolldown could not load the Windows native binding; its WASI fallback was also absent.
- `npx wrangler whoami` reported no authenticated Cloudflare account. No `.env` or `.dev.vars` exists in the workspace.
- The available Worker config routes `html.vibid.my` production API paths and no separate staging route/hostname is documented. No Worker or Pages deployment was attempted.
- No production mutation, purge, or sync recovery test was run. Post-change payload/latency/Turso/R2 metrics and rollback evidence remain unavailable; Phase 7 is blocked before staging, not complete.