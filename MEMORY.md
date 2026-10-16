# Project Memory

Last reviewed: 2026-10-16

Source facts and runtime/deployment evidence must remain distinct. Detailed project scope and current phase state live in `notes/`.

## Stack and Architecture

- TypeScript ES modules; React 19, Vite 8, Tailwind CSS 4, lucide-react, motion.
- Local server: Express 4 + `tsx`; Cloudflare Pages Functions and Wrangler for deployment.
- Shared API entry point: `src/lib/apiHandler.ts`. Turso/libSQL schema and persistence: `src/lib/turso.ts`. R2 helpers: `src/lib/r2.ts`. Admin auth: `src/lib/auth.ts`.
- `src/App.tsx` selects Admin for `/vcon`/`/vcon/*`, otherwise the public app. The legacy `/vcon?opened` and `?closed` routes can represent a public modal for a matching slug; bare `/vcon` remains Admin.
- A separate cache Worker is represented by `src/apiCacheWorker.ts`/`wrangler.cache.toml`; its production route/deployment has not been verified.
- Current source baseline: `main` at `5e95ac8875052dd83bcef7310f1b9ed7e9186eb7` (`feat(admin): add public header and footer scripts`), package and lockfile `0.0.5`, frozen 2026-10-16. The worktree was clean and synced with origin immediately before the documentation refresh. No tag/changelog convention is established.

## Public Catalog

- Loads site settings and the complete template metadata list. Search/category/Popular filtering and client-side pagination (12 default; 12/24/48) are present. Pagination limits rendered cards/iframes, not API payload or DB reads.
- Public cards follow `card_design_v4.html`: 4:3 preview, 6px radius, compact badges/body/stats/buttons, hover treatment. Card data/actions remain data-driven.
- Card preview iframe uses `loading="lazy"` and a compact accessible `Loading preview...` indicator that is hidden on that iframe's load event. This is loading feedback only; it does not make requests faster.
- View modal supports preview/HTML, desktop/tablet/mobile modes, copy, download, and close. The frozen baseline had no editor. Phases 2–3 add a default-on Editable switch, sandboxed local `srcDoc`, and transient text-node synchronization that survives Preview/HTML switching. Phase 4 modal Download uses edited local HTML and skips the metric POST; synchronization errors block download rather than falling back to original HTML. Unedited and card downloads retain their original metric behavior. Edited HTML is never sent to the server. Existing template scripts remain enabled and may make independent requests.
- Editor contract: edits and edited downloads do not send/save edited HTML or issue an editor/metric request; unedited/card downloads retain the metric POST. HTML/Copy remain original-source-only. Phases 0–4 are complete in docs/source. Phase 5 is approved but runtime-blocked by missing `@esbuild/win32-x64`; Phase 6 is not approved.
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
- Local `npm run dev` uses `server.ts`; dev Vite runs in SPA mode. Local production Express has a static catch-all. Cloudflare Pages direct slug-route behavior remains unverified.

## Verification and Workflow

- `npm run lint` runs TypeScript checking and `npm run build` runs the Vite build. `package.json` has no automated test script.
- Previous notes recorded lint/build blocked by missing Windows optional packages. This was not rerun during the documentation refresh; do not report it as a fresh result.
- Phases 2–4 changed only `src/public/PublicApp.tsx`; VS Code diagnostics pass. Phase 5's local server attempt failed before startup because `@esbuild/win32-x64` is missing; browser/runtime behavior remains unverified.
- The former roadmap's phases are historical source-work records. Current baseline, editor findings, scope-locked phases, status, and error inventory are maintained in `notes/current/`.
- Phase 2 is implemented in the working tree; Phase 3–6 remain proposed. Obtain explicit approval for each later implementation phase; no source approval authorizes deployment or production changes. After approved changes, update `MEMORY.md` and relevant `notes/current/` records. Never record secrets or full HTML.
