# Project Memory

Last reviewed: 2026-10-16

Source facts and runtime/deployment evidence must remain distinct. Detailed project scope and current phase state live in `notes/`.

## Stack and Architecture

- TypeScript ES modules; React 19, Vite 8, Tailwind CSS 4, lucide-react, motion.
- Local server: Express 4 + `tsx`; Cloudflare Pages Functions and Wrangler for deployment.
- Shared API entry point: `src/lib/apiHandler.ts`. Turso/libSQL schema and persistence: `src/lib/turso.ts`. R2 helpers: `src/lib/r2.ts`. Admin auth: `src/lib/auth.ts`.
- `src/App.tsx` selects Admin for `/vcon`/`/vcon/*`, otherwise the public app. Phase 1 interprets `/vcon?opened` and `/vcon?closed` as public modal routes for a matching slug; bare `/vcon` remains Admin.
- A separate cache Worker is represented by `src/apiCacheWorker.ts`/`wrangler.cache.toml`; its production route/deployment has not been verified.
- Package version: frozen baseline `fecafe2` used `0.0.1`; current working-tree version is `0.0.5`, synchronized in package manifest and lockfile. No tag/changelog convention is established.

## Public Catalog

- Loads site settings and the complete template metadata list. Search/category/Popular filtering and client-side pagination (12 default; 12/24/48) are present. Pagination limits rendered cards/iframes, not API payload or DB reads.
- Public cards follow `card_design_v4.html`: 4:3 preview, 6px radius, compact badges/body/stats/buttons, hover treatment. Card data/actions remain data-driven.
- Card preview iframe uses `loading="lazy"` and a compact accessible `Loading preview...` indicator that is hidden on that iframe's load event. This is loading feedback only; it does not make requests faster.
- View modal supports preview/code, desktop/tablet/mobile modes, copy, download, X/Escape close.
- Phase 1 source adds `/{slug}?opened`/`?closed`, direct modal resolution, browser history synchronization, recoverable route errors, and encoded-slug decoding in raw/detail/download endpoints. URL state is not persistent analytics; the existing detail GET view increment is not called by modal open.
- Phase 2 source adds optional template description through Admin single-template editor, shared type, save API, Turso migration, and public metadata. Modal title/OG title follow template title; description/OG description use the template description or site fallback; close restores site metadata. OG image remains site-level.

## Storage and Operations

- Turso is metadata/configuration/template-content storage; R2 stores objects/assets. Source has durable template sync jobs for real Turso. Mock memory mode cannot persist those jobs; deployed behavior is unverified.
- `/api/status` source reuses a 30-second isolate-local result; production impact is unmeasured.
- Root `wrangler.toml` is for Pages. `wrangler.cache.toml` currently has production-host routes; do not use it as staging.
- Local `npm run dev` uses `server.ts`; dev Vite runs in SPA mode. Local production Express has a static catch-all. Cloudflare Pages direct slug-route behavior remains unverified.

## Verification and Workflow

- `npm run lint` is the TypeScript check, `npm run build` is the Vite build. No automated test script exists.
- Phase 1–2 source diagnostics are clean. Browser preview-loader behavior, live Turso description migration/save, Cloudflare direct paths, and production metrics have not been verified.
- A previous build attempt failed due to missing Windows Rolldown native binding; Wrangler was unauthenticated and no staging route existed at the last Phase 3 preflight. Recheck environment before rollout.
- Preserve scope locks in `notes/implementation-roadmap.md`; require explicit approval for pending phases. After source/config changes, synchronize `MEMORY.md` and relevant notes. Never put secrets or full HTML in memory/docs/logs.
