# Project Memory

Last reviewed: 2026-10-16

This file is a source-grounded map of the project. Keep implementation facts separate from deployment verification, and update this file when code or project structure changes. The `notes/` directory remains the authority for the detailed production audit, phased roadmap, and implementation status.

## Tech Stack and Dependencies

- **Language/runtime:** TypeScript, ES modules, Node.js for the local Express server, and browser APIs for the React application. TypeScript is configured for ES2022 with bundler module resolution and JSX transform.
- **Frontend:** React 19, Vite 8, Tailwind CSS 4 through `@tailwindcss/vite`, `lucide-react` icons, and `motion` for animation.
- **Server/API:** Express 4 and `tsx` run the local server. API requests use the Web `Request`/`Response` interfaces and are handled by a shared API handler.
- **Database:** Turso/libSQL via `@libsql/client`. The code has an in-memory mock store and seed templates when usable Turso credentials are absent or the configured database fails.
- **Object storage:** Cloudflare R2 via the AWS S3 SDK, with support for Cloudflare native R2 bucket bindings in Pages Functions.
- **Hosting/deployment:** Cloudflare Pages Functions and Wrangler. A separate cache Worker is represented by `src/apiCacheWorker.ts` and `wrangler.cache.toml`; its live route/deployment is not verified. The root `wrangler.toml` configures the Pages project.
- **Other runtime dependencies:** `dotenv` loads local environment variables; `@xmldom/xmldom` supplies DOM globals needed by the AWS SDK in Node. `@google/genai` is declared, but its current use was not established during this review.
- **Available scripts:** `npm run dev` / `npm start` run `server.ts`; `npm run build` builds with Vite; `npm run preview` previews the Vite build; `npm run lint` runs `tsc --noEmit`; Pages build/deploy/dev scripts use Vite and Wrangler. There is no test script in `package.json`.
- **Application version:** package manifest and lockfile are synchronized at `0.0.1`; repository has no existing release tags or changelog convention.

## Architecture and Folders

- `src/App.tsx` selects the public app or lazy-loaded admin app based on the `/vcon` path.
- `src/public/` contains the public template catalog and development-log UI.
- `src/vcon/` contains the admin shell, login/setup, reusable admin components, and pages for templates, categories, settings, Turso, R2, and deployment documentation.
- `src/lib/apiHandler.ts` is the shared API router/business-logic entry point used by both local Express and Cloudflare Pages Functions.
- `src/lib/turso.ts` owns database access, schema setup, seed/mock storage, and template/category/settings persistence. `src/lib/r2.ts` owns S3-compatible and native R2 operations and URL handling. `src/lib/auth.ts` handles admin password hashing and signed-token creation/verification. `src/lib/initialTemplates.ts` holds seed content; `src/types.ts` defines shared data contracts.
- `server.ts` serves API requests through the shared handler and runs Vite middleware in development or static `dist/` files in production.
- `functions/api/[[route]].ts` forwards Cloudflare Pages API requests to the shared handler and passes Cloudflare environment/bucket bindings.
- `public/` contains Pages headers and route configuration. Root `index.html`, `vite.config.ts`, `tsconfig.json`, `wrangler.toml`, and `wrangler.cache.toml` hold app/build/runtime configuration.
- `notes/` contains the production-readiness audit, implementation roadmap/status, phase log, and error-handling notes. Read the relevant notes before work that falls within a documented phase; the roadmap requires explicit approval before implementing a phase.

## Features and Business Logic

- **Public catalog:** Loads site settings and the complete template metadata list from the API; supports search/category/Popular filtering and client-side card pagination (12 default, 12/24/48 options). Filtering and Popular download sorting occur before page slicing, so all matching items remain reachable. Pagination limits rendered cards/iframes, not API payload size or database reads. It also supports HTML previews, desktop/tablet/mobile preview modes, code display/copy, HTML download, and view/download counters.
- **Admin (`/vcon`):** Admin setup/login and token verification; template create/edit/delete and bulk upload; category management; site settings and branding assets; database initialization/seeding/testing; R2 configuration, file browsing, and status; admin-user management; and deployment guidance.
- **API:** Public settings/template metadata/detail/raw-content and R2 file reads; admin-authenticated template/category/settings/storage/database/user operations; health/status reporting; and template-to-R2 synchronization/retry handling.
- **Persistence model:** Turso is the metadata/configuration and template-content store. R2 holds template/asset objects. Source includes durable template sync jobs and a mock in-memory mode; whether real provider operations work depends on environment configuration and is not proven by source inspection.
- **Freshness/performance work:** Source includes metadata-only public listing, on-demand raw template reads, request timing diagnostics, status caching, R2 URL revisions, and cache Worker code. Consult `notes/implementation-status.md` and `notes/implementation-roadmap.md` for exact phase status and outstanding deployment gates.

## Conventions and Working Rules

- Follow the existing TypeScript/React style: functional components, shared interfaces in `src/types.ts`, PascalCase component/file names for React components, camelCase functions/variables, and explicit `.ts`/`.tsx` extensions in relative imports where already used.
- Prefer existing Tailwind utility classes; global theme/base styling is in `src/index.css`. Preserve the existing visual system and avoid unrelated UI restyling during functional changes.
- Keep API behavior in the shared `src/lib/apiHandler.ts` path so local and Pages deployments use the same handler. Use existing Turso/R2/auth modules rather than duplicating provider logic.
- Configuration and credentials come from environment values, Cloudflare bindings, or admin-managed settings. Never place real secrets in source, logs, or project memory. Admin token persistence currently uses browser local storage; review the existing auth flow before changing it. Ensure a strong `ADMIN_SECRET` is configured rather than relying on the source fallback.
- `npm run lint` is the configured TypeScript check; `npm run build` is the production build. There is no configured automated test command. The implementation notes report past local build/dev failures from missing native/package dependencies, so re-check the environment before treating those results as current.
- Do not equate source implementation or dry-run validation with deployed/production verification. Record runtime, credentials, Worker routing, and live-provider limitations explicitly.
- Preserve the scope controls in `notes/implementation-roadmap.md`. Do not implement a roadmap phase without the required explicit approval.
- After any code, configuration, or architecture change, update this project memory in the same work session or provide the exact markdown update to the user as required by `.github/copilot-instructions.md`.

## Current Verification Notes

The implementation notes reviewed on 2026-10-16 describe Phases 1–6 as implemented in source to varying degrees, with production/live verification still pending; Phase 7 rollout is blocked pending environment, Wrangler, and staging setup. The roadmap labels Phase 2 as in progress, so use the detailed phase documents rather than this summary when determining current rollout status. Previously recorded local failures include a missing Windows Rolldown native binding for build and unresolved `@xmldom/xmldom` for the dev server. These are historical notes, not a claim that the current workspace has been freshly tested.