# Project Memory

Last reviewed: 2026-10-16

Source facts and runtime/deployment evidence must remain distinct. Detailed project scope and current phase state live in `notes/`.

## Stack and Architecture

- TypeScript ES modules; React 19, Vite 8, Tailwind CSS 4, lucide-react, motion.
- Local server: Express 4 + `tsx`; Cloudflare Pages Functions and Wrangler for deployment.
- Shared API entry point: `src/lib/apiHandler.ts`. Turso/libSQL schema and persistence: `src/lib/turso.ts`. R2 helpers: `src/lib/r2.ts`. Admin auth: `src/lib/auth.ts`.
- `src/App.tsx` selects Admin for `/vcon`/`/vcon/*`, otherwise the public app. The legacy `/vcon?opened` and `?closed` routes can represent a public modal for a matching slug; bare `/vcon` remains Admin.
- A separate cache Worker is represented by `src/apiCacheWorker.ts`/`wrangler.cache.toml`; its production route/deployment has not been verified.
- Current source baseline: `main` at `1fcea4b85dba1c001d0a7b2a32f7cd09db2e5665` (`fix: prevent silent preview edit loss`), package and lockfile `0.0.5`, frozen 2026-10-16. The worktree was clean at the editor-plan refresh. No tag/changelog convention is established.

## Public Catalog

- Loads site settings and the complete template metadata list. Search/category/Popular filtering and client-side pagination (12 default; 12/24/48) are present. Pagination limits rendered cards/iframes, not API payload or DB reads.
- Public cards follow `card_design_v4.html`: 4:3 preview, 6px radius, compact badges/body/stats/buttons, hover treatment. Card data/actions remain data-driven.
- Card preview iframe uses `loading="lazy"` and a compact accessible `Loading preview...` indicator that is hidden on that iframe's load event. This is loading feedback only; it does not make requests faster.
- View modal supports preview/HTML, desktop/tablet/mobile modes, copy, download, and close. The reusable `src/editor/` engine handles text mapping, iframe messaging, confirmation, versioned per-slug localStorage, and local-first edit state. `/{encodedSlug}/edit` is parsed by the public app; valid local HTML drives Preview/HTML/Copy/modal Download, and edited downloads skip the metric POST. Missing/corrupt local edit-route data fails closed instead of falling back to server HTML. Source behavior is implemented; browser/runtime behavior is not verified.
- The editor roadmap is in `notes/editor-implementation-plan.md`. Phases 0–5 source/local verification are complete. Phase 6 production release is approved but blocked before deploy because `npx wrangler whoami` reports unauthenticated; `npm run build` passes and no production request/deploy occurred. Configured Pages project is `html-snippets`.
- Phase 1 source adds `/{slug}?opened`/`?closed`, direct modal resolution, browser history synchronization, recoverable route errors, and encoded-slug decoding in raw/detail/download endpoints. URL state is not persistent analytics; the existing detail GET view increment is not called by modal open.
- Historical Phase 2 added optional template descriptions and client-side modal metadata. Current approved Phase 2 auth work removes the JWT default secret, requires a 43-character environment secret, invalidates legacy tokens, adds bounded isolate-local login/setup limits, and enforces 15–128 character passwords via `src/lib/authPolicy.ts`. Focused helper assertions pass; API/browser/Cloudflare runtime verification is pending.
- Current approved Phase 3 source rejects deployed mock Turso use, makes strict-client helper failures throw instead of returning mock success, and uses deployment environment variables/native binding for R2. Existing `r2_config` database values were not read, migrated, or deleted; runtime storage behavior is unverified.
- Current approved Phase 4 source returns controlled 400 for malformed R2 paths, generic 500 for unexpected API errors, separates catalog failure from empty results, reports iframe/root render errors, and counts download requests only after content load and download trigger. Browser/runtime behavior is unverified.
- Admin tab selection is stored at `/vcon/{tab}` (`/vcon` defaults to Templates), with refresh and Back/Forward synchronization. Live Pages confirmation is pending rebuild.
- Public header retains inline desktop categories and uses compact mobile branding/search with an expandable horizontal category navigation; current source diagnostics are clean, live behavior awaits push/rebuild.
- Public category routes use active stored slugs; existing search remains client-only. Phase 6 source adds daily category/template/download-request aggregates, with no user IDs, IPs, user agents, raw search terms, or per-user histories persisted. Template forms now choose active categories; schema init conditionally reassigns orphan `General` template rows to the earliest active category when no General category exists. That migration has not run against a live DB. A post-deploy TDZ crash was fixed and awaits rebuild/live confirmation.

## Storage and Operations

- Admin Scripts settings store Header/Footer snippets in existing Turso key/value settings and install them in public `document.head` and end of `document.body` after settings load. Save normalization strips a BOM and outer whitespace and standardizes CRLF, preserving internal code formatting. This is trusted-admin arbitrary code execution for public visitors; the UI warns about that. No schema migration is needed; production behavior is unverified.
- SEO Phase 8 adds route-aware metadata, the `html.vibid.my` canonical host, static WebApplication/WebSite/Organization/FAQ structured data, visible workflow/privacy/FAQ content, and crawl/icon/social assets. Admin edits homepage/category/template SEO title/description/keywords; inputs are prefilled, untouched defaults regenerate with source-field changes, and clearing an override restores its nonblank default. Template description and SEO values are edited in a compact modal opened beside Save Template, not in the editor metadata bar. Category/template columns are additive Turso migrations. Screenshot follow-up adds an edge-rendered initial HTML response only for `/templates/:slug`; the SPA remains client-rendered elsewhere. The sitemap lists only `/`. Live DB migration, Pages deployment, crawlers, and social previews remain unverified; see the roadmap/status notes.

- Turso is metadata/template-content storage; R2 stores objects/assets. Source has durable template sync jobs for real Turso. Deployed DB-backed routes now fail closed instead of using mock persistence. Mock memory mode cannot persist jobs; deployed behavior is unverified.
- `/api/status` source reuses a 30-second isolate-local result; production impact is unmeasured.
- Root `wrangler.toml` is for Pages. `wrangler.cache.toml` currently has production-host routes; do not use it as staging.
- Local `npm run dev` uses `server.ts`; dev Vite runs in SPA mode. Local Pages emulator serves `/{slug}/edit` directly; real Pages Function data integration needs local bindings, and production behavior remains unverified.

## Verification and Workflow

- `npm run lint` runs TypeScript checking and `npm run build` runs the Vite build. `package.json` has no automated test script.
- `LocalHtmlStore` smoke checks pass for missing/read/write/rewrite/corrupt/quota cases; editor-file diagnostics and iframe bootstrap parsing pass. `npm run build` passes after local-only native package installation; package manifests/lockfile are unchanged.
- `npm run lint` reports five unrelated type errors in `src/apiCacheWorker.ts`, `src/lib/apiHandler.ts`, `src/lib/siteScripts.ts`, and `src/lib/turso.ts`. Local Express and Pages emulator serve the root/edit-route shell; Pages direct refresh, localStorage restoration, Preview/HTML, and Back/Forward pass with fixture metadata. Actual Pages API Functions return 503 without local bindings. Production behavior and real OS clipboard contents remain unverified.
- The previous `notes/current/` set was replaced by the editor-specific plan/status/log/error documents at `notes/`. Keep source, tool, browser, and production claims distinct. Never record secrets or full HTML.
