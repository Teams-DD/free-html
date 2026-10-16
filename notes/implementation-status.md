# Implementation Status

## Frozen Baseline

- Source commit: `13faaf6ed9ec67dad5ca9a96e8e0e4701ff0a28c` on `main` (`Add card preview loading state`).
- Package and lockfile: `0.0.5`.
- Source worktree matched `HEAD` at the original freeze. Approved phases and the Admin tab route fix are committed/pushed through `e6d5388`; the current public-header update is in the worktree and not yet deployed.
- Historical pre-feature baseline: `fecafe2`, package `0.0.1`.

## Source-Implemented Behavior (Runtime Not Implied)

- Public catalog loads settings and full template metadata; search/category/Popular filtering and 12/24/48 client-side pagination exist.
- Card previews use lazy raw-HTML iframes with an on-load indicator. Modal preview/code, desktop/tablet/mobile modes, copy, download, X/Escape close exist.
- Modal URLs use `/{slug}?opened` and `/{slug}?closed`; direct opened routes resolve after metadata load; `popstate` synchronizes Back/Forward. `/vcon` remains Admin except the legacy public modal query route.
- Per-template description is present in the shared model, Admin editor, API, Turso migration/read/write, and public metadata. Browser title/description update client-side; Open Graph image stays site-level.
- SEO Phase 8 adds initial and route-aware metadata, a primary-host canonical, WebApplication/WebSite/Organization/FAQ JSON-LD, matching visible help/privacy/FAQ content, and robots/sitemap/manifest/favicon/social assets. Admin edits homepage, category, and template SEO fields; blank overrides generate bounded defaults. Category/template columns are migrated additively at schema initialization. A scoped Pages Function renders `/templates/:slug` metadata, H1/content/FAQ, and internal links into the raw response before the SPA runs; other routes remain SPA-rendered. Only `/` is in the static sitemap; live migration, deployed raw response, and social-card behavior are unverified.
- Admin setup/login, template/category/settings management, Turso/R2 tools, sync-job management, and deployment instructions exist in source.
- Public category URLs resolve active category slugs; existing category labels/filter behavior and layout remain. Daily aggregate activity source exists; runtime persistence is unverified.

## Source-Confirmed Production Risks

- Phase 2 removes the hard-coded Admin token signing fallback in current source; deployment `ADMIN_SECRET` presence/rotation remains unverified. Without a valid 43-character secret, setup/login returns 503 and token verification fails closed.
- Deployed DB-backed routes now reject mock Turso clients, and strict-client helper failures no longer return mock success. Local development mock fallback remains. Runtime outage behavior has not been exercised.
- Phase 3 no longer reads/writes R2 credentials through `r2_config`; R2 credentials must come from deployment environment variables. Existing DB values are deliberately left untouched and may remain plaintext until a separately approved owner-controlled rotation/removal.
- `/api/vcon/save-env` now rejects app-side environment mutation. Admin credential forms do not transmit entered values; they instruct owners to configure deployment environment secrets.
- Phase 4 now returns 400 for malformed encoded R2 object paths and maps uncaught API failures to a generic response.
- Phase 4 moves download counting after content retrieval and browser download triggering; modal preview still uses the raw endpoint and does not increment views.
- Phase 4 distinguishes template-fetch failure from valid empty results and adds card/modal iframe error feedback plus a root render recovery state.
- Cloudflare Pages deep-link behavior and in-app “Architecture Verified” claim have not been validated by a live deployment.
- Admin tab route state now follows `/vcon` (Templates) and `/vcon/{tab}`; refresh and Back/Forward restore the active tab. Visual layout is unchanged.
- Public header update uses a compact mobile row, full-width search, and an expandable horizontal category nav; desktop inline navigation remains.

## Verification Status

| Check | Result |
|---|---|
| VS Code workspace diagnostics | No errors reported |
| `npm run lint` | Blocked: missing `@typescript/typescript-win32-x64` package in installed dependencies |
| `npm run build` | Blocked: missing Rolldown Windows native binding and WASI fallback |
| Automated test script | None defined in `package.json` |
| `.env` / `.dev.vars` | Neither file exists in the workspace |
| Browser, Turso, R2, Pages, cache, crawler behavior | Not verified in this baseline audit |
| Production deployment or mutation | Not performed |

## Roadmap State

| Phase | State |
|---|---|
| 0. Baseline and forensic audit | Complete; documentation only |
| 1. Reproducible validation/staging prerequisites | Started by user request; blocked before acceptance; not complete |
| 2. Admin signing/access hardening | Implemented in source; focused helper assertions pass; runtime/deployment verification pending |
| 3. Fail-closed persistence/secret storage | Implemented in source; diagnostics clean; runtime/deployment verification pending |
| 4. API and user-facing error/metric correctness | Implemented in source; diagnostics clean; runtime verification pending |
| 5. Existing URL/metadata verification | Deferred until post-push live test; not started |
| 6. Category routing/aggregate activity | Implemented in source; runtime verification pending |
| 7. Production release/verification | Proposed; not approved |
| 8. SEO and crawlable public content | Implemented in source; runtime verification pending |

## Current Workflow Gate

- User-directed workflow is code-first: no pre-push staging, Wrangler login, or assistant Cloudflare deployment.
- Phase 5 browser/runtime checks are deferred until after all approved code phases, GitHub push, and Cloudflare auto-rebuild; the user will perform the live test.
- Phase 6 is approved and implemented in source. Phase 7 release approval remains separate; the user will push/rebuild and perform live tests after code phases.
- Phase 1's local lint/build prerequisite remains blocked by missing Windows optional packages but does not start staging work under the user's workflow.

## Phase 08 Implementation Record (2026-10-16)

- Static metadata targets free HTML templates and Vib Tools, sets canonical `https://html.vibid.my/`, index/follow directives, Open Graph/Twitter fields, and WebSite, WebApplication, Organization, and FAQPage JSON-LD.
- The public app retains configurable title/description behavior, upgrades the old generic defaults, uses a utility-focused H1, and updates canonical/social metadata for supported catalog, category, and template routes.
- Visible workflow, feature, privacy, and FAQ sections follow the catalog. FAQ answers match the static FAQPage data. Privacy copy states project uploads are not required and public activity is recorded as daily aggregates.
- Added `public/robots.txt`, `public/sitemap.xml`, `public/site.webmanifest`, `public/favicon.svg`, `public/apple-touch-icon.svg`, and `public/og-image.svg`. The sitemap lists only `/` because template/category data is dynamic and Cloudflare Pages direct-path handling is unverified.
- Updated public API, Turso fallback, and Admin settings defaults. No database setting was changed; existing customized settings remain intact.
- Initial diagnostics passed for `PublicApp.tsx`, `turso.ts`, `SettingsManager.tsx`, and `apiHandler.ts`. Build, metadata/schema validators, live deep links, Google Search Console, and social crawler behavior remain unverified. No deployment or production mutation occurred.
- Follow-up adds editable homepage/category/template SEO title, description, and keywords. API writes are length-bounded; blank values use generated, compact metadata derived from site/category/template fields. Existing template `description` remains available as the template SEO-description fallback.
- Admin SEO fields now initialize with actual generated values, not placeholders. Untouched values regenerate as site/category/template fields change; editing a value preserves the override, and clearing it restores generated metadata. All SEO controls are required and save payloads retain generated fallbacks.
- Template Description (optional) and all SEO inputs are now inside a compact modal opened by `SEO` immediately left of `Save Template`; the editor metadata bar retains only title, slug, category, and tags. Close button, Done, Escape, and backdrop dismissal are supported.
- Turso schema initialization adds only missing `seo_title`, `seo_description`, and `seo_keywords` columns on templates/categories; reads, writes, and public category/template metadata include those fields. This migration code has not run against a live DB.
- Diagnostics pass across all touched TypeScript files; focused Node checks pass for legacy/current home, category/template defaults, explicit overrides, and size limits. A mock storage integration check is blocked by missing `@libsql/win32-x64-msvc`; `npm run lint` and `npm run build` remain blocked by missing TypeScript/Rolldown Windows optional binaries. No production DB change or deployment occurred.
- Screenshot forensic follow-up confirmed the deployed raw detail response was the homepage shell although the hydrated DOM had correct route metadata/content. `functions/templates/[slug].ts` now injects a template-specific initial HTML page, and `public/_routes.json` invokes it only under `/templates/*`. Its fixture emits 470 visible words, a title-matched H1, matching FAQ text, and category/home links. Live deployment response remains to be rechecked after rebuild.

## Admin Tab Refresh Fix (2026-10-16)

- Root cause: `VconApp` kept the selected Admin tab only in React state and always initialized it to `templates`; browser refresh therefore reopened the Templates dashboard.
- Fix: `/vcon` remains the Templates default; `/vcon/{tab}` stores each valid Admin tab. Initial load and `popstate` restore the tab, and sidebar/add/edit/cancel/save transitions update the route.
- Scope: one source file (`src/vcon/VconApp.tsx`); no sidebar layout, public routes, data, API, or auth changes.
- Validation: changed-file diagnostics clean; the route mapping/call-site audit confirms all tab transitions use the URL-aware helper. Live Pages refresh confirmation remains pending after rebuild.

## Phase 06 Implementation Record (2026-10-16)

- Public routes support `/`, `/popular`, `/categories/{slug}`, and `/templates/{slug}`. Template routes preserve validated category/page/size or Popular context; modal close restores the catalog route. Search is not serialized. Legacy `/{slug}?opened`/`?closed` and `/vcon` Admin behavior remain.
- Added read-only `GET /api/categories` for active category records. Existing visible controls and filter logic remain; active empty categories resolve to the existing empty-results state.
- Template single/bulk forms now choose an active category after category data loads; editing a template whose stored category is missing/inactive defaults it to the first active category. Save APIs reject inactive/unknown category values.
- Schema initialization conditionally reassigns only template rows with orphan `General` category values to the earliest active category, and only when no `General` category exists. This migration code has not run against the user's DB; no DB was accessed or modified during this task.
- Added public `POST /api/activity` for `category_view` and `template_open`, with active resource validation and bounded per-minute in-memory request limits. Existing download-counter action adds `download_request` to aggregate storage best-effort.
- Added additive `activity_daily` table with UTC day/event/slug/count only, 90-day cleanup on write/report read, and authenticated `GET /api/vcon/analytics` with strict date validation and a maximum 90-day range.
- No user IDs, IPs, user agents, raw search terms, or per-user histories are stored. IP is used transiently for in-memory rate limiting only.
- Post-deploy crash report identified a TDZ: the pagination clamp effect read `totalPages` before its `const` initialization. The effect is now placed after the pagination calculations. The fix has not yet been rebuilt/deployed or live-tested.
- Validation: diagnostics reported no errors in `turso.ts`, `apiHandler.ts`, and `PublicApp.tsx`; runtime route, history, rate-limit, schema migration, retention, and event-count behavior remain unverified. No schema migration was executed.
- Scope: no visible layout redesign, dashboard, production data/settings change, deploy, or cache purge.

## Phase 04 Implementation Record (2026-10-16)

- Unexpected uncaught API errors now return a generic 500 and log only method/error type; Turso persistence failures retain sanitized 503. Public template-list failures no longer expose raw exception messages.
- Malformed R2 object key encoding returns 400. Missing templates cannot increment download counts.
- Catalog fetch failure now shows a retry state distinct from valid empty/no-results. Card and modal iframe errors show “Preview unavailable”; catastrophic React render errors show a reload recovery screen.
- Download counter POST now follows successful HTML retrieval and the browser download trigger. UI says “Download started”; server count is not presented as proof that the browser saved the file. Local card count updates from the server response.
- Validation: workspace diagnostics report no errors in `apiHandler.ts`, `PublicApp.tsx`, and `main.tsx`. Browser/API failure injection and download behavior were not run; `npm run lint`/`build` remain blocked by missing Windows optional dependencies.
- Scope: no visual layout redesign, persistent analytics, schema/package/config/production-data change, deployment, or cache purge.

## Phase 02 Implementation Record (2026-10-16)

- Signing no longer has a default key. Secrets shorter than 43 characters are rejected; API issue/verify calls receive `ADMIN_SECRET` from the active runtime environment. New tokens carry `kid: admin-v2`; legacy tokens fail verification and require sign-in again.
- Setup and login each allow five attempts per 15-minute in-memory runtime window and return 429 with `Retry-After` when limited. This is per-isolate best-effort protection, not a distributed rate limiter.
- Admin setup, add-admin, and password-change paths use the shared `src/lib/authPolicy.ts` 15–128 character rule. Existing passwords can still log in; changing them requires the new rule. The Admin visual layout is unchanged; validation text changed.
- Deployment docs now identify the 43-character minimum. No secret value or Cloudflare setting was changed.
- Validation: editor diagnostics reported no errors in all six touched source files after the shared-helper extraction. One Node built-in TypeScript-strip check passed for secret/token/password/rate-limit helpers before the unchanged password validator was moved to `authPolicy.ts`. The broader API-graph check could not load because existing modules import type-only exports as runtime values under this Node mode. `npm run lint`/`npm run build` remain blocked by missing Windows optional dependencies. No API/browser/Pages live test was run.
- Out of scope unchanged: public app/features, Admin layout, database/schema, package files, R2/cache configuration, production credentials/data, deployment.

## Phase 03 Implementation Record (2026-10-16)

- Deployed API DB routes reject mock clients with 503; real Turso clients are marked strict so helper catch paths throw a sanitized persistence error rather than returning mock reads or mutation success. Category/admin/template/settings helpers are fail-closed for strict clients. The status endpoint reports mock storage as disconnected.
- Production first-admin setup uses only the deployment-configured Turso client; request-supplied credentials remain supported only in local development.
- R2 config is sourced only from deployment environment variables/native binding. App-side R2 save and runtime-env endpoints reject writes; existing Admin forms return guidance without transmitting typed secrets. R2 template misses cannot fall through to mock seed content.
- Existing `r2_config` values were not read, migrated, or deleted. Cloudflare environment values and current production DB contents were not inspected or changed.
- Sync-job DB access errors propagate separately from R2 transfer errors; existing retry/backoff behavior is preserved. Runtime durability/restart behavior was not tested.
- Validation: diagnostics reported no errors in all five touched files; `git diff --check` is clean. No runtime Turso outage, R2, sync, browser, or Cloudflare test was run. Full npm lint/build remain blocked by Phase 01 missing Windows optional packages.
- Out of scope unchanged: public UI, Admin layout, schema, package files, Wrangler config, production data/settings, deployment, and cache purge. R2 requires owner-managed environment variables after deploy.

## Phase 01 Attempt (2026-10-16)

- `npm ci --ignore-scripts` completed from the existing lockfile, but TypeScript's Windows optional package and Rolldown's Windows native binding were not installed even though their versions are referenced by the packages' optional dependency declarations.
- `npm install --package-lock-only --include=optional` and lockfile-enabled `npm install --no-save` made no tracked changes and did not resolve the missing Windows packages.
- `npm run lint` stops because `@typescript/typescript-win32-x64` cannot be resolved. `npm run build` stops because the Rolldown Windows binding cannot be resolved. Neither command reached source type checking or bundling.
- `npx wrangler whoami` reports Wrangler is unauthenticated. `.env` and `.dev.vars` do not exist; no approved non-production Pages/Worker target is configured.
- No package manifest, lockfile, source, or Wrangler config changes were made. No deploy, production request, database mutation, or cache purge occurred.
- Phase 1 remains blocked; phases 2–7 are not approved. The four type errors seen during a temporary no-lock install are not treated as baseline findings because that install floated dependencies beyond the lockfile.

See [implementation-roadmap.md](implementation-roadmap.md) for scope locks and [phase-progress-log.md](phase-progress-log.md) for historical approvals and completion records.
