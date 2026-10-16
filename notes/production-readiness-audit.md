# Production Readiness Audit

## Audit Basis

- Frozen source baseline: `fecafe2` on `main`, package `0.0.1`.
- Baseline worktree was clean and synced on 2026-10-16.
- Scope: public HTML modal slug routing, open/close state, view counting, and per-template browser metadata.
- Source audit only; Pages deep-link behavior, production slugs, Turso migration, and crawler output are not verified live.

## Baseline Findings

### F-01: Public route selection had no slug resolver

`src/App.tsx` selected Admin for `/vcon` or `/vcon/*` and rendered PublicApp for every other path. PublicApp did not read the path/query to resolve a template.

### F-02: Modal open/close was local state only

Card View set `activeModal`; X/Escape set it to `null`. There was no public History API synchronization.

### F-03: Existing view counter was not called by modal preview

`GET /api/templates/:slug` increments views asynchronously. Card/modal iframes use `/api/templates/:slug/raw`, which does not increment views. Calling detail GET on open would transfer the full HTML-bearing template again.

### F-04: Slug input is editable but not fully constrained for route paths

Admin generates path-like slugs from new titles, but the slug input is manually editable. Do not infer production slug safety; no live database inventory was available.

### F-05: Baseline had no per-template description/image

`HtmlTemplate` contained title/slug/category/tags/content/counters/dates but no template SEO description/image. Public metadata came from site settings and generic `index.html` metadata.

### F-06: Deployment direct-path behavior was unknown

Local Express has SPA fallback; Vite dev runs in SPA mode. `public/_routes.json` describes `/api/*` Functions. No `public/_redirects` or `404.html` was present. These facts do not prove deployed Pages slug-refresh behavior.

## Phase 1 Source Record

- Card View pushes `/{encodedSlug}?opened`; X/Escape replace the current entry with `/{encodedSlug}?closed`.
- Direct opened routes resolve from the fetched metadata list. `popstate` synchronizes modal state.
- `/vcon?opened` and `/vcon?closed` are routed to PublicApp so a slug `vcon` can be opened; bare `/vcon` remains Admin.
- Unknown/malformed/multi-segment/URL-normalizing slugs show a return-to-catalog error. Encoded slug segments are decoded by raw/detail/download API handlers; stored slugs are not renamed.
- URL state is client-side only. No persistent event or view-counter write was added.

## Phase 2 Source Record

- Added optional `description` to the shared template model, admin single-template editor, save payload, Turso row, and public metadata projection.
- Fresh schema creates `description TEXT NOT NULL DEFAULT ''`. Existing schemas are checked with `PRAGMA table_info`; missing column is added with `ALTER TABLE`. A second column check handles concurrent migration attempts.
- Existing and bulk-upload templates default to empty description. Legacy clients omitting the field preserve an existing description on edit. Public metadata uses the field when present.
- While a modal is active, document title and Open Graph title use template title; meta description and Open Graph description use template description or site description fallback. Closing restores site-level title/description. Open Graph image remains site-level.
- `package.json` and lockfile are synchronized at `0.0.3`.
- No persistent open/close analytics, SSR/crawler path, R2 sync change, auth change, or unrelated API route was added.
- Editor diagnostics report no errors in touched source/manifests. Turso migration and browser behavior are not runtime-tested; existing schema initializer falls back to mock mode if schema initialization fails.

## Remaining Risks / Unknowns

- Actual production slugs may include reserved or URL-normalizing values; live inventory was unavailable.
- Cloudflare Pages direct-route refresh and encoded-slash handling have not been tested.
- Browser DOM metadata changes occur after JavaScript loads; server-rendered crawler metadata is out of scope.
- URL state is not persistent analytics. The existing detail GET still increments views and returns HTML; Phase 1/2 do not call it from modal open.
- No per-template social image exists; site-level Open Graph image remains in use.

## Phase 3 Staging Preflight (2026-10-16)

- Approval to stage and verify Phases 1–2 was received.
- One build attempt failed before bundling because `@rolldown/binding-win32-x64-msvc` and the WASI fallback are missing.
- One `npx wrangler whoami` attempt reported Wrangler is unauthenticated. No `.env` or `.dev.vars` exists in the workspace.
- No non-production Pages/Worker route is configured. `wrangler.cache.toml` targets `html.vibid.my` production API paths; it was not deployed as staging.
- No deployment, production write, cache purge, schema migration, or live regression was performed. Phase 3 is blocked before staging and is not complete.
