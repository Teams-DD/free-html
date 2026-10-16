# Project Memory

Last reviewed: 2026-10-16

This is a source-grounded project map. Keep source implementation separate from runtime/deployment evidence. Detailed active scope and phase state live in `notes/`.

## Tech Stack and Dependencies

- **Language/runtime:** TypeScript ES modules; Node.js local Express server; browser React app.
- **Frontend:** React 19, Vite 8, Tailwind CSS 4, lucide-react, and motion.
- **Server/API:** Express 4 and `tsx`; shared Web Request/Response handler in `src/lib/apiHandler.ts`.
- **Database:** Turso/libSQL via `@libsql/client`, with in-memory mock/seed data if configured DB access fails or is absent.
- **Object storage:** Cloudflare R2 via AWS S3 SDK and native Pages bucket bindings.
- **Deployment:** Cloudflare Pages Functions/Wrangler; separate API cache Worker source in `src/apiCacheWorker.ts` and `wrangler.cache.toml`.
- **Version:** frozen baseline `fecafe2` used `0.0.1`; current working tree advances package and lockfile to `0.0.4` through Phases 1–2 and the public card redesign. No tag/changelog convention is established.
- **Scripts:** `npm run dev`/`npm start` run `server.ts`; `npm run build` uses Vite; `npm run lint` runs `tsc --noEmit`; no automated test script exists.

## Architecture

- `src/App.tsx` selects Admin at `/vcon` or `/vcon/*`, otherwise PublicApp. Phase 1 treats `/vcon?opened` and `/vcon?closed` as public modal routes for a possible slug `vcon`; bare `/vcon` remains Admin.
- `src/public/` contains the public catalog/modal and Dev Mode panel. `src/vcon/` contains Admin components/pages.
- `src/lib/apiHandler.ts` is shared by Express and Pages Functions. `src/lib/turso.ts` owns schema/persistence; `src/lib/r2.ts` owns R2; `src/lib/auth.ts` owns Admin auth.
- `server.ts` uses Vite SPA mode in development and an Express static catch-all in production. Cloudflare Pages direct slug refresh remains unverified; `public/_routes.json` covers API Function routing.
- `notes/` is the active `fecafe2` source audit and Phase 0–3 modal URL/metadata roadmap. Require explicit approval before pending phase work.

## Current Features and Phase 1–2

- Public catalog loads settings and complete template metadata; search/category/Popular and 12/24/48 client-side pagination are present. Pagination limits rendered cards, not API payload or DB reads. Public card styling follows `card_design_v4.html` with 4:3 previews, 6px card radius, compact badges/body/stats/buttons, and hover treatment; card data/actions stay data-driven.
- Cards/modal use raw HTML preview. Modal supports device sizes, code, copy, download, Escape/X close.
- Phase 1 adds `/{slug}?opened`/`?closed`, direct modal resolution after metadata load, History API synchronization, recoverable route errors, and encoded-slug decoding in raw/detail/download endpoints.
- Phase 1 URL state is browser-only, not persistent analytics. Existing detail GET increments views asynchronously; modal route does not call it.
- Phase 2 adds optional template description through Admin single-template editor, shared type, existing save API, additive Turso migration, and public metadata projection. Modal title/OG title use template title; description/OG description use template description or site description fallback; closing restores site-level values. OG image remains site-level.
- Phase 2 migration adds `description TEXT NOT NULL DEFAULT ''` to existing tables after PRAGMA inspection and rechecks concurrent ALTER failure. Existing rows and omitted legacy payloads have empty/preserve fallbacks.
- Phase 1–2 diagnostics are clean. Browser, Turso migration/save, Cloudflare direct paths, encoded-slash delivery, and production behavior remain unverified.

## Working Conventions

- Follow existing TypeScript/React/Tailwind patterns; preserve unrelated UI, Admin auth, DB/R2 sync, and public behaviors.
- Keep API logic in the shared handler. Never store secrets, credentials, or full HTML in docs/logs.
- `npm run lint` is the configured TypeScript check; `npm run build` is production build. Historical missing Windows TypeScript/Rolldown packages and `@xmldom/xmldom` failures must be rechecked, not assumed current.
- Source checks do not establish deployed Pages/Cloudflare/Turso/R2 behavior. Record limitations explicitly.
- Keep `MEMORY.md` and relevant `notes/` synchronized after code/config changes.
- Phase 3 staging is approved but blocked: latest build check failed on the missing Windows Rolldown binding, Wrangler is unauthenticated, and no staging route is configured. The existing Worker routes target production; no deployment or production mutation was performed.
