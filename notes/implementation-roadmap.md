# Public Modal URL and Metadata Roadmap

## Frozen Baseline and Scope

- Baseline: `fecafe2` on `main`, package `0.0.1`, frozen 2026-10-16.
- Current working-tree package version after Phase 2: `0.0.3`.
- Scope: public slug-based modal URLs, open/close history state, and browser title/description metadata.
- Preserve card UI, catalog/search/category/Popular filters, pagination, card/modal previews, device modes, code/copy/download, existing counters, Admin auth/slug behavior, and R2 sync.
- No persistent open/close analytics, SSR/crawler infrastructure, template image field, or unrelated routes/features.
- Each implementation phase requires explicit user approval.

## Phase 0: Freeze Baseline and Audit — Complete

**Scope:** documentation only.

- Frozen commit/worktree/version and traced current routing, modal, slug, counters, metadata and fallback paths.
- Recorded exact source facts and production unknowns in the audit.

## Phase 1: Slug-Based Modal URL State — Complete in Source; Runtime Verification Pending

**Implemented contract:** `/` is catalog; card View pushes `/{encodedSlug}?opened`; X/Escape replace the current entry with `/{encodedSlug}?closed`. Direct opened routes resolve after metadata fetch; `popstate` synchronizes Back/Forward.

**Implemented scope:** `App.tsx`, `PublicApp.tsx`, and narrowly the raw/detail/download API path decoders for percent-encoded slugs. Invalid/missing/non-representable routes show a recovery state. `/vcon?opened`/`?closed` routes to PublicApp for a slug `vcon`; bare `/vcon` remains Admin.

**Preserved/out of scope:** no DB/schema change, persistent analytics, view-counter call, auth/write semantic change, slug rename, R2 sync, metadata update, or unrelated UI.

**Acceptance status:** source diagnostics clean; browser/Pages direct-route/encoded-slash behavior and actual production slug inventory remain unverified.

## Phase 2: Per-Template Browser Metadata — Complete in Source; Runtime Verification Pending

**Implemented scope:** optional `description` across shared template type, additive Turso migration, template read/save mappings, existing Admin single-template editor, and public metadata response. Existing rows and omitted values default/preserve compatibly. No bulk UI description control was added.

**Metadata behavior:** active modal sets `document.title` and `og:title` from template title; meta description and `og:description` use template description or site-description fallback. Closing restores site title/description. Open Graph image remains site-level.

**Migration:** startup creates the column on new DBs; existing DBs check `PRAGMA table_info` and conditionally `ALTER TABLE`. Concurrent duplicate-column attempts recheck column existence. If schema initialization still fails, existing code falls back to mock mode; live migration is unverified.

**Out of scope:** persistent open/close analytics, view counter changes, SSR/crawler rendering, per-template image, R2 sync, auth, unrelated UI/routes.

**Acceptance status:** editor diagnostics clean. Live migration, save/reopen, public metadata, open/close restore, and browser behavior remain unverified.

## Phase 3: Staging and Regression Gate — Approved; Blocked Before Staging

**Scope lock:** stage and verify approved Phases 1–2 only. Add a Pages fallback only if direct-route staging proves it is required. No production deployment before separate approval.

**Checks:** direct opened URL/reload, opened/closed/Back/Forward, invalid and production slug inventory, Admin `/vcon` isolation, editor description save/reopen, old-row empty fallback, public title/description restore, preview/code/copy/download, filters/pagination.

**Unknowns:** deployed Pages fallback, actual DB slug inventory/schema migration, crawler metadata, build and Wrangler readiness. Recheck before staging; do not treat historical environment failures as current.

**Preflight (2026-10-16):** `npm run build` failed before bundling because Rolldown's Windows native binding is missing; `npx wrangler whoami` reports unauthenticated. No `.env`/`.dev.vars` or non-production route is configured. `wrangler.cache.toml` routes the production hostname, so it was not used as staging. No deployment, production write, cache purge, or schema migration was performed. Phase 3 remains blocked and is not complete.

## Dependency Order

`0 -> 1 -> 2 -> 3`
