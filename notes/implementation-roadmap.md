# Current Production Readiness Roadmap

## Baseline and Change Control

- Baseline: `main`, source commit `13faaf6ed9ec67dad5ca9a96e8e0e4701ff0a28c`, package and lockfile `0.0.5`, frozen 2026-10-16.
- Source files matched `HEAD` at the freeze. Planning notes contained uncommitted edits from earlier planning and are being consolidated; the repository is not described as clean.
- Historical source milestone `fecafe2` / `0.0.1` is not the current baseline.
- Phase 0 is complete. Phase 1 validation prerequisites remain blocked/deferred. Phases 2, 3, 4, and 6 were explicitly approved and are implemented in source; deployment/runtime verification remains pending. Phase 5 is deferred to post-push live testing; Phase 7 release approval remains separate.
- An earlier approval to stage the old URL/metadata phases was recorded but blocked before staging. It did not authorize deployment and does not approve the expanded sequence below.
- Current user workflow: implement approved code phases only; do not perform pre-push staging, Wrangler login, or Cloudflare deployment. After all code phases, the user will arrange GitHub push/Cloudflare auto-rebuild and perform live testing. Staging-only Phase 5 is deferred to that post-push verification window and does not block Phase 6 code work.
- Every implementation phase needs its own explicit approval. Do not change code, schema, credentials, production settings, or data until that phase is approved.
- Preserve existing public/Admin UI layout and unrelated functions. A phase may change only its listed behavior. If a check discovers an unlisted defect, pause and document it for approval rather than expanding scope.

## Phase 0 — Freeze and Forensic Audit — Complete

**Scope lock:** documentation and source/configuration inspection only.

**Record:** current commit/version, worktree distinction, exact source findings, command blockers, runtime unknowns, and historical implementation milestones. No code or production changes.

**Acceptance:** audit evidence is source-backed and distinguishes code presence from runtime verification. See [production-readiness-audit.md](production-readiness-audit.md).

## Phase 1 — Reproducible Validation and Staging Prerequisites — Started; Blocked; Not Complete

**In scope:** restore dependencies from the existing lockfile without changing versions unless separately approved; make `npm run lint` and `npm run build` runnable; configure an isolated non-production Pages target and environment variables; verify Wrangler authentication without using production routes. If cache-Worker behavior must be tested, create a separate staging Worker config and hostname; never reuse `wrangler.cache.toml` production routes.

**Out of scope:** production deploy, production cache purge, DB migration, credentials in repository files, and application feature changes.

**Acceptance:** lint and build complete; clean staging target is identified; staging secrets are configured outside source control; staging host/config is demonstrably separate from `html.vibid.my`; any staging cache Worker has its own non-production route; rollback target is documented. Stop if a dependency or config change is needed beyond the approved scope.

**Progress (2026-10-16):** `npm ci --ignore-scripts` completed from the current lockfile, but the resulting Windows install lacks the platform-specific optional binaries referenced by the lockfile's TypeScript/Rolldown dependency declarations. `npm run lint` and `npm run build` both stop before source validation/bundling because those binaries cannot be resolved. `npm install --package-lock-only --include=optional` made no lockfile change; normal `npm install --no-save` reported up to date and also made no tracked change. A prior no-lockfile install temporarily floated ignored `node_modules`; it was replaced by the lockfile install and is not validation evidence. `npx wrangler whoami` reports unauthenticated. `.env` and `.dev.vars` are absent; no isolated staging target is configured. No app source, package manifest, lockfile, Wrangler config, or production resource was changed. Further dependency lock/install-policy changes and staging/account prerequisites require resolution before this phase can pass.

## Phase 2 — Admin Signing and Access Hardening — Implemented in Source; Runtime Pending

**In scope:** remove the known default `ADMIN_SECRET`; fail closed unless a secret of at least 43 characters is available; pass the runtime's `ADMIN_SECRET` explicitly through Pages and local API handling; invalidate old tokens; limit first-admin setup and login to five attempts per 15-minute in-memory runtime window; enforce a 15–128 character password rule on setup, add-admin, and password-change paths.

**Out of scope:** Admin role redesign, UI redesign, changing public read permissions, or altering unrelated authentication flows.

**Compatibility:** new JWTs use header key id `admin-v2`; legacy tokens without that key id are rejected and users must sign in again. Existing passwords remain usable for login; a new password or password change must meet the new length rule. Admin layout is unchanged; only validation text and the deployment secret example change.

**Rate-limit limitation:** the counter is bounded in-memory state local to each runtime isolate, keyed by `CF-Connecting-IP` (or a shared `unknown` key when absent). It is best-effort abuse friction, not a durable or cross-isolate Cloudflare rate limit.

**Source acceptance:** missing/short secret cannot issue a token; token verification requires a configured secret and `admin-v2`; helper checks cover valid/wrong/missing secret, legacy header rejection, password boundaries, and attempt six rejection. Touched-file diagnostics report no errors. Full API/runtime/browser verification remains pending because the local TypeScript/Rolldown/esbuild platform packages are unavailable and Cloudflare was not accessed.

**Progress (2026-10-16):** implementation approved by the user. `src/lib/auth.ts`, `src/lib/authPolicy.ts`, `src/lib/apiHandler.ts`, existing Admin password validation, and the deployment secret example were updated. Focused auth helper assertions passed before extracting the unchanged password validator into the shared policy module; post-extraction diagnostics found no errors in the six touched source files. No package files, database, Cloudflare settings, production resources, or public UI were changed. No deployment or secret rotation was performed.

## Phase 3 — Fail-Closed Persistence and Secret Storage — Implemented in Source; Runtime Pending

**In scope:** make deployed API requests distinguish real Turso from mock mode and fail visibly/non-successfully when persistence is unavailable; prevent DB helper catch blocks from returning mock success for strict clients; ensure category/admin/template/settings mutations report success only after durable writes; retain local-development mock behavior; stop reading or writing R2 credentials through the plaintext `r2_config` settings path and use deployment environment variables; make `/api/vcon/save-env` truthful; propagate Turso sync-job errors separately from R2 upload errors.

**Out of scope:** production data cleanup, category/template renames, schema migration on production, R2 object deletion/re-upload, and changes to public card/modal UI.

**Source acceptance:** deployed DB-backed routes reject mock clients with 503; strict Turso helper failures throw a sanitized persistence error instead of returning mock data; category/admin/template/settings mutations cannot report mock-backed success; status reports mock storage as disconnected; R2 credentials are read only from deployment environment variables; app-side credential-save and runtime-env endpoints do not persist/claim success; Admin forms do not send typed credentials; R2 misses cannot fall through to mock template content; sync-job persistence errors are distinct from R2 upload errors. Changed-file diagnostics are clean and diff hygiene is clean.

**Data/deployment limitation:** existing `r2_config` values are deliberately not read, migrated, or deleted by this phase because production data/settings must remain untouched. After code deployment, R2 requires the owner to configure `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET_NAME`, and optional `R2_PUBLIC_DOMAIN` in deployment settings. Whether these variables are currently set is unknown. Rotation/removal of any old DB value must happen only after owner-controlled cutover.

**Runtime acceptance pending:** no Turso outage injection, sync-job restart test, R2 environment verification, API/browser run, or Cloudflare deployment occurred. Those checks are deferred to the user's post-push live test. Existing retry/backoff implementation was preserved; runtime durability was not asserted.

**Progress (2026-10-16):** user approved Phase 03. Source changes are in `src/lib/turso.ts`, `src/lib/apiHandler.ts`, `src/vcon/VconApp.tsx`, `src/vcon/pages/R2Manager.tsx`, and `src/vcon/pages/TursoManager.tsx`. Admin layout/public UI, schema, package files, Wrangler config, database values, and production settings were not changed.

## Phase 4 — API and User-Facing Error/Metric Correctness — Implemented in Source; Runtime Pending

**In scope:** guard malformed R2 path decoding; define a consistent top-level Pages API failure boundary; stop exposing raw internal error details on public responses; distinguish template-load failure from a valid empty catalog; add explicit card/modal iframe-load failure handling and a root React error fallback; count a download request only after template content loads and the browser download is triggered, without claiming the file was saved.

**Out of scope:** broad UI redesign, new monitoring vendor, persistent analytics, or unrelated API refactors.

**Source acceptance:** malformed R2 object keys return 400; uncaught API errors return a generic 500 and log only method/error type; persistence failures retain sanitized 503; public template-list errors do not expose internal messages; failed catalog loads show retry separately from valid empty results; card/modal iframe errors show recovery feedback; root render errors show reload recovery; download counter requests occur only after content is loaded and browser download is triggered, and UI copy says “Download started.”

**Progress (2026-10-16):** user approved Phase 04. Source changes are in `src/lib/apiHandler.ts`, `src/public/PublicApp.tsx`, and `src/main.tsx`. Focused diagnostics report no errors in all three files. No layout redesign, schema, analytics, package, production config/data, or deployment changes were made. Browser/API failure injection and download behavior remain unverified until the user's live test.

## Phase 5 — Existing URL/Metadata Verification — Deferred Until Post-Push Live Test

**In scope:** after all approved code phases and GitHub push/Cloudflare auto-rebuild, user-led live verification of `/{slug}?opened`/`?closed`, direct load/reload, X/Escape, Back/Forward, encoded slugs, `/vcon` Admin isolation, per-template title/description updates/restoration, preview/code/copy/download, filters, pagination, Turso migration, R2 sync, and cache invalidation.

**Out of scope:** pre-push staging setup, assistant Wrangler login/deployment, new category URLs, analytics, production data changes, or a Pages fallback unless live testing proves it is required and that fallback is separately approved.

**Acceptance:** user confirms all listed behaviors in the rebuilt live app; migration/cache behavior is recorded only if actually exercised; production slug inventory is reviewed without changing it; all failures are logged as findings and fixed only under a separately approved phase. Until then, runtime behavior remains unverified.

## Phase 6 — Category URL Routing and Aggregate Activity — Implemented in Source; Runtime Pending

**In scope / URL contract:** `/` is All; `/popular` is Popular; `/categories/{categorySlug}` selects an active category; `/templates/{templateSlug}` opens the existing modal. Validated `category`, `page`, `size`, and `view=popular` context are carried on the template route so close restores catalog state; omit defaults. Search remains client-side and out of URLs/events. Preserve `/{slug}?opened`/`?closed` as legacy aliases and `/vcon` Admin isolation.

**Category data:** expose active category records through a read-only public path; resolve routes with stored slugs, not display names. The Admin form defaults to an active category and the API rejects inactive/unknown category names. During schema initialization only, if no category named `General` exists and at least one active category exists, reassign template rows whose stored category is `General` (case-insensitive/trimmed) to the earliest active category by `created_at`, then `id`. Do not change any other category value or category record. This idempotent deployment-time data repair is limited to the misfiled rows reported by the user.

**Activity contract:** record daily UTC aggregate events `category_view`, `template_open`, and `download_request` (the latter means the app's download request, not confirmed file save). The additive `activity_daily` store contains only day, event, resource slug, count, and update time. Do not store user IDs, IPs, user agents, raw search terms, or per-user histories. Validate active category/template slugs server-side; public ingestion is bounded to 60 requests/minute per transient IP key in memory. Retain aggregates for 90 days and expose them only through authenticated read-only `GET /api/vcon/analytics?from=YYYY-MM-DD&to=YYYY-MM-DD`, capped at 90 days. Tracking is best-effort and does not block catalog/modal/download actions. Existing counters keep their Phase 4 semantics.

**Out of scope:** visible UI redesign/dashboard, SSR, crawler infrastructure, any production data repair beyond the exact orphan-`General` reassignment above, new template fields, unrelated routes, and production analytics enablement.

**Source acceptance:** route parser/serializer covers category, Popular, template, pagination, modal return context, and legacy routes; active slugs are resolved from category records; public events validate slugs and persist only daily aggregates; event reads are authenticated/date-bounded; forms select active categories; save APIs reject invalid category values; orphan-`General` repair is idempotent and conditional. Source diagnostics are clean. Runtime route, migration effect, retention, and event-count tests remain pending until the user's post-push live test.

**Progress (2026-10-16):** user approved Phase 06. Source changes are in `src/lib/turso.ts`, `src/lib/apiHandler.ts`, `src/public/PublicApp.tsx`, and `src/vcon/pages/TemplateCreateEdit.tsx`. Existing visible controls/layout remain; search stays out of URL and analytics. The conditional migration code is present but has not run in this workspace; no production DB/settings were accessed or changed. No deployment or analytics dashboard was performed/added. Phase 05 live verification remains deferred by the user's code-first workflow.

## Phase 7 — Production Release and Verification — Proposed; Not Approved

**In scope:** production preflight, separately approved deploy, smoke/regression checks, cache verification, metrics/error monitoring, rollback rehearsal, and post-deploy sign-off.

**Out of scope:** unapproved feature work, schema/data repair, credential rotation outside Phase 2, and cache purge outside the approved release plan.

**Acceptance:** production secrets/config are verified without disclosure; deployed direct routes and APIs pass smoke checks; Turso/R2 durable behavior is demonstrated; cache behavior matches policy; rollback is available and tested; production outcomes are recorded as observed evidence. No release occurs on a failed prerequisite.

## Phase 8 — SEO and Crawlable Public Content — Implemented in Source; Runtime Pending

**Approval:** The user's 2026-10-16 request explicitly authorizes this SEO implementation, extending the earlier Phase 6 crawler-infrastructure exclusion only for the scope below.

**In scope:** optimize static and client-updated title/description/keywords/canonical/social metadata; add robots, a canonical sitemap, structured application/site/FAQ data, visible workflow/features/privacy/FAQ content, and favicon/manifest/social assets; allow Admin edits for homepage, category, and template SEO fields; generate compact metadata when overrides are blank; align default public and Admin settings. Template description and SEO fields are edited in a compact modal opened beside Save Template. Screenshot follow-up narrowly renders initial HTML for `/templates/:slug` only, including route-specific metadata, semantic content, FAQ, and internal links.

**Out of scope:** full-app SSR/prerendering or route rendering outside `/templates/:slug`, database-derived sitemap generation, production deployment, Search Console submission, and production settings/data changes. Use `html.vibid.my` as canonical; do not assert that the alternate host redirects to it.

**Source acceptance:** initial HTML has metadata and JSON-LD; template detail HTTP responses have route-matched title/description/keywords/self-canonical, a relevant H1, useful visible text, and internal links before JavaScript; hydrated route remains consistent; homepage/category/template SEO values round-trip through Admin/API/storage; blank overrides generate bounded title/description/keywords; existing Turso tables gain only missing SEO columns; on-page FAQ text matches FAQ JSON-LD; crawl assets exist; no unsupported zero-storage or universal responsiveness claims are made. Live DB migration, deployed raw response, crawler, social-preview, and rich-result validation remain pending.

**Progress (2026-10-16):** source adds `index.html` metadata/schema, public route-aware metadata and content, SEO-aligned default settings, and crawl/icon/social assets. Admin home/category/template fields and shared bounded fallback logic are persisted through API/Turso with additive category/template columns. Screenshot audit was reproduced against raw production HTML: `/templates/geek-p-01` returned the homepage title/description/canonical and an empty root, while hydrated browser metadata/content were route-specific. Added a scoped Pages Function for `/templates/:slug`, enabled only `/templates/*` alongside `/api/*`, and injects escaped route metadata, one relevant H1, over 250 words, visible FAQ, and internal category/home links before SPA startup. Renderer fixture passed with 470 words; diagnostics pass. Production response, live DB migration, and browser behavior after deployment remain unverified. Sitemap intentionally lists only `/`; no live DB migration, deployment, or production setting change was performed.

**Admin form follow-up (2026-10-16):** template description and SEO inputs moved from the editor metadata bar into a compact modal opened by the `SEO` button beside Save Template. Existing generated defaults, editable overrides, required SEO values, and save payload are unchanged. Modal supports close button, Done, Escape, and backdrop dismissal.

## Dependency Order and Current Gate

`0 -> 1 -> 2 -> 3 -> 4 -> 5 -> 6 -> 7`

Current state: Phase 0 is complete; Phase 1 validation prerequisites are deferred/blocked; Phases 2–4, 6, and 8 are implemented in source with runtime verification pending; Phase 5 is deferred until post-push live testing; Phase 7 release approval is separate. Local lint/build remain blocked by missing Windows optional packages. See [implementation-status.md](implementation-status.md).
