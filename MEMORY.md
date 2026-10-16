# Project Memory

Last reviewed: 2026-10-16

Source facts and runtime/deployment evidence must remain distinct. Detailed project scope and current phase state live in `notes/`.

## Stack and Architecture

- TypeScript ES modules; React 19, Vite 8, Tailwind CSS 4, lucide-react, motion.
- Local server: Express 4 + `tsx`; Cloudflare Pages Functions and Wrangler for deployment.
- Shared API entry point: `src/lib/apiHandler.ts`. Turso/libSQL schema and persistence: `src/lib/turso.ts`. R2 helpers: `src/lib/r2.ts`. Admin auth: `src/lib/auth.ts`.
- `src/App.tsx` selects Admin for `/vcon`/`/vcon/*`, otherwise the public app. Phase 1 interprets `/vcon?opened` and `/vcon?closed` as public modal routes for a matching slug; bare `/vcon` remains Admin.
- A separate cache Worker is represented by `src/apiCacheWorker.ts`/`wrangler.cache.toml`; its production route/deployment has not been verified.
- Current source baseline: `main` at `13faaf6ed9ec67dad5ca9a96e8e0e4701ff0a28c`, package and lockfile `0.0.5`, frozen 2026-10-16. Historical pre-feature baseline `fecafe2`/`0.0.1` is not current. Source matched HEAD; planning docs had pending edits at freeze. No tag/changelog convention is established.

## Public Catalog

- Loads site settings and the complete template metadata list. Search/category/Popular filtering and client-side pagination (12 default; 12/24/48) are present. Pagination limits rendered cards/iframes, not API payload or DB reads.
- Public cards follow `card_design_v4.html`: 4:3 preview, 6px radius, compact badges/body/stats/buttons, hover treatment. Card data/actions remain data-driven.
- Card preview iframe uses `loading="lazy"` and a compact accessible `Loading preview...` indicator that is hidden on that iframe's load event. This is loading feedback only; it does not make requests faster.
- View modal supports preview/code, desktop/tablet/mobile modes, copy, download, X/Escape close.
- Phase 1 source adds `/{slug}?opened`/`?closed`, direct modal resolution, browser history synchronization, recoverable route errors, and encoded-slug decoding in raw/detail/download endpoints. URL state is not persistent analytics; the existing detail GET view increment is not called by modal open.
- Historical Phase 2 added optional template descriptions and client-side modal metadata. Current approved Phase 2 auth work removes the JWT default secret, requires a 43-character environment secret, invalidates legacy tokens, adds bounded isolate-local login/setup limits, and enforces 15–128 character passwords via `src/lib/authPolicy.ts`. Focused helper assertions pass; API/browser/Cloudflare runtime verification is pending.
- Current approved Phase 3 source rejects deployed mock Turso use, makes strict-client helper failures throw instead of returning mock success, and uses deployment environment variables/native binding for R2. Existing `r2_config` database values were not read, migrated, or deleted; runtime storage behavior is unverified.
- Current approved Phase 4 source returns controlled 400 for malformed R2 paths, generic 500 for unexpected API errors, separates catalog failure from empty results, reports iframe/root render errors, and counts download requests only after content load and download trigger. Browser/runtime behavior is unverified.
- Admin tab selection is stored at `/vcon/{tab}` (`/vcon` defaults to Templates), with refresh and Back/Forward synchronization. Live Pages confirmation is pending rebuild.
- Public header retains inline desktop categories and uses compact mobile branding/search with an expandable horizontal category navigation; current source diagnostics are clean, live behavior awaits push/rebuild.
- Public category routes use active stored slugs; existing search remains client-only. Phase 6 source adds daily category/template/download-request aggregates, with no user IDs, IPs, user agents, raw search terms, or per-user histories persisted. Template forms now choose active categories; schema init conditionally reassigns orphan `General` template rows to the earliest active category when no General category exists. That migration has not run against a live DB. A post-deploy TDZ crash was fixed and awaits rebuild/live confirmation.

## Storage and Operations

- SEO Phase 8 adds route-aware metadata, the `html.vibid.my` canonical host, static WebApplication/WebSite/Organization/FAQ structured data, visible workflow/privacy/FAQ content, and crawl/icon/social assets. Admin edits homepage/category/template SEO title/description/keywords; inputs are prefilled, untouched defaults regenerate with source-field changes, and clearing an override restores its nonblank default. Template description and SEO values are edited in a compact modal opened beside Save Template, not in the editor metadata bar. Category/template columns are additive Turso migrations. Screenshot follow-up adds an edge-rendered initial HTML response only for `/templates/:slug`; the SPA remains client-rendered elsewhere. The sitemap lists only `/`. Live DB migration, Pages deployment, crawlers, and social previews remain unverified; see the roadmap/status notes.

- Turso is metadata/template-content storage; R2 stores objects/assets. Source has durable template sync jobs for real Turso. Deployed DB-backed routes now fail closed instead of using mock persistence. Mock memory mode cannot persist jobs; deployed behavior is unverified.
- `/api/status` source reuses a 30-second isolate-local result; production impact is unmeasured.
- Root `wrangler.toml` is for Pages. `wrangler.cache.toml` currently has production-host routes; do not use it as staging.
- Local `npm run dev` uses `server.ts`; dev Vite runs in SPA mode. Local production Express has a static catch-all. Cloudflare Pages direct slug-route behavior remains unverified.

## Verification and Workflow

- `npm run lint` is the TypeScript check, `npm run build` is the Vite build. No automated test script exists. Installed Windows dependencies currently lack TypeScript, Rolldown, and libSQL optional native packages, blocking lint/build and direct persistence integration checks.
- Workspace diagnostics reported no errors. Phase 1 `npm ci --ignore-scripts` completed, but lockfile-based Windows install omits the TypeScript and Rolldown Windows optional binaries; `npm run lint` and `npm run build` stop before source validation. Lockfile-only generation and lockfile-enabled `npm install --no-save` did not repair this. No test script is defined.
- `.env` and `.dev.vars` are absent. Wrangler is unauthenticated and no isolated staging target exists. Browser, live Turso/R2, Cloudflare direct paths, staging, and production behavior are unverified.
- User workflow is code-first: defer staging/Wrangler/assistant deployment; after approved code phases, GitHub push and Cloudflare auto-rebuild are followed by the user's live test. Phase 5 verification is deferred; Phase 6 is implemented in source; Phase 7 release approval remains separate.
- Source audit found a hard-coded Admin secret and mock persistence fallback at the frozen baseline; Phases 2–3 current source address those paths. Legacy R2 credentials may remain in Turso but are no longer read. Other findings include public error/metric gaps; details and scope locks live in `notes/`.
- Preserve the source baseline and scope locks in `notes/implementation-roadmap.md`; Phase 1 validation is deferred/blocked, Phases 2–4 and 6 source code is implemented with runtime verification pending, Phase 5 is deferred until post-push live testing, and Phase 7 release approval is separate. After source/config changes, synchronize `MEMORY.md` and relevant notes. Never put secrets or full HTML in memory/docs/logs.
