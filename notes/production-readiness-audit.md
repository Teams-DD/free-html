# Production Readiness Audit

## Audit Record

- Audit date: 2026-10-16.
- Current source baseline: `main` at `13faaf6ed9ec67dad5ca9a96e8e0e4701ff0a28c` (`Add card preview loading state`).
- `package.json` and `package-lock.json` both declare `0.0.5`.
- Source files had no worktree changes at the freeze. Four planning documents had prior uncommitted edits and are consolidated by this documentation refresh; the worktree is not claimed clean.
- `fecafe2` / package `0.0.1` is the historical pre-routing baseline, not the current baseline.
- This is a source/configuration audit, not a penetration test or live deployment verification. Findings distinguish proven source behavior from conditional production impact and unverified provider behavior.

## Current Validation Evidence

- VS Code workspace diagnostics: no errors reported.
- `npm ci --ignore-scripts` completed, but the lockfile-based Windows install did not install the TypeScript Windows optional package or Rolldown Windows native binding referenced by their optional dependency declarations.
- Lockfile-only optional dependency generation and a lockfile-enabled `npm install --no-save` both made no tracked change and did not restore those packages.
- `npm run lint`: blocked before TypeScript checking because `@typescript/typescript-win32-x64` is missing after lockfile install.
- `npm run build`: blocked before bundling because Rolldown's Windows native binding and WASI fallback are missing after lockfile install.
- `npx wrangler whoami`: reports Wrangler is unauthenticated. No staging target is configured.
- `package.json` defines no automated test script.
- `.env` and `.dev.vars` are absent. Cloudflare environment variables, production routes, Turso contents, and deployed behavior were not inspected or verified.

## Findings

### F-01 — Hard-coded Admin signing secret (P0 at frozen baseline; source remediation recorded)

At the frozen baseline, [`src/lib/auth.ts`](../src/lib/auth.ts) returned a hard-coded signing key whenever `ADMIN_SECRET` was absent or empty. Both token creation and verification used that fallback. Protected `/api/vcon/*` routes relied on it. Phase 2 removes the fallback in the current worktree, requires a 43-character secret, passes the runtime value through sign/verify calls, adds a new token key id (invalidating old tokens), adds per-isolate setup/login attempt limits, and moves the shared password-length policy into [`src/lib/authPolicy.ts`](../src/lib/authPolicy.ts). Production secret presence/rotation and distributed rate limiting remain unverified.

### F-02 — Database failure could become successful in-memory operation (P0 at frozen baseline; source remediation recorded)

At the frozen baseline, [`src/lib/turso.ts`](../src/lib/turso.ts) returned a process-local mock client when Turso configuration was missing or client/schema initialization failed. Schema initialization marked a failing real client as mock and returned a success-shaped result. Read helpers could return seed/mock data. Category mutations could return success after persistence failure. Phase 3 current source rejects mock clients for deployed DB-backed API routes, marks real clients strict, and makes helper catch blocks throw a sanitized persistence error. Runtime failure behavior has not been exercised.

### F-03 — R2 secret credentials were stored in the application database (P1 at frozen baseline; legacy value retained)

At the frozen baseline, the Admin R2 configuration API in [`src/lib/apiHandler.ts`](../src/lib/apiHandler.ts) serialized account ID, access key ID, secret access key, bucket name, and domain into Turso's `r2_config` value without source-level encryption. Phase 3 current source no longer reads or writes that value and rejects app-side credential/env writes; Admin forms no longer transmit entered secrets. Existing Turso values were not deleted or migrated, and provider-side access/encryption remains unknown. R2 requires deployment environment values/native binding; whether these are configured in production is unknown.

### F-04 — Malformed R2 object paths were decoded without a guard (P1 at frozen baseline; source remediation recorded)

At the frozen baseline, [`src/lib/apiHandler.ts`](../src/lib/apiHandler.ts) called `decodeURIComponent(r2KeyRequested)` without a local guard. Phase 4 current source catches malformed encoding and returns 400. Live Pages response behavior is not verified.

### F-05 — Download counter records a request before content is ready (P1, metric semantics)

At the frozen baseline, [`src/public/PublicApp.tsx`](../src/public/PublicApp.tsx) fired the download-counter POST before HTML retrieval, so a failed retrieval could still increase the counter. Phase 4 current source sends the counter request only after HTML retrieval and a browser download trigger; the UI says “Download started” and does not claim the browser saved a file. The API checks that the template exists before incrementing. Modal/card previews still use `/raw`; modal opens are not counted as views.

### F-06 — Category URL routing and persistent activity tracking were absent (P2 at frozen baseline; source remediation recorded)

At the frozen baseline, public category selection/search/pagination were React state and category options came from template category names; public code did not resolve stored category slugs. Phase 6 current source adds `/categories/{slug}`, `/popular`, `/templates/{slug}`, validated catalog return context, and legacy route compatibility. It also adds daily aggregate category/template/download-request events without user identifiers or search terms. The follow-up audit found single/bulk template form state defaulted to `General` even when active category options did not contain it; the category-count join then reported zero. Current source selects an active category, validates it in save APIs, and conditionally reassigns only orphan `General` template rows to the earliest active category when no `General` category exists. That migration has not run against a live DB. Browser routes, retention, and deployed behavior remain unverified.

### F-07 — Public load failures can look like valid empty content (P2)

At the frozen baseline, failed template metadata loads shared the valid-empty UI and iframes lacked error handlers; no root React error boundary was mounted. Phase 4 current source has a retry state for failed catalog loads, explicit card/modal iframe failure feedback, and a root React reload recovery boundary. Browser behavior is not yet verified.

### F-08 — Direct Pages deep-link behavior is unverified (release blocker until tested)

Local production Express in [`server.ts`](../server.ts) serves `index.html` for unmatched paths. [`public/_routes.json`](../public/_routes.json) routes `/api/*` to Pages Functions; it does not prove how Cloudflare Pages serves direct refreshes of `/{slug}` or future category paths. No Pages `_redirects` or `404.html` was present in the audited tree. The separate [`wrangler.cache.toml`](../wrangler.cache.toml) declares routes on `html.vibid.my`, a production hostname; it is not a staging target. No production or staging behavior is inferred from these files.

### F-09 — Browser metadata is client-side; crawler behavior is unverified (P2)

The HTML shell in [`index.html`](../index.html) contains generic site metadata. React updates document title and description after client data loads. The source does not provide server-rendered per-template metadata; crawler output was not tested.

### F-10 — In-app deployment page claims verification not evidenced by this audit (P2)

[`src/vcon/pages/DeploymentDocs.tsx`](../src/vcon/pages/DeploymentDocs.tsx) labels the Pages/Functions architecture “Verified.” This audit found configuration and source files, not a verified deployment. Do not treat that UI label as production evidence. Changing the visible label is outside this documentation-only task.

## Source Behavior Present in the Baseline

- Public catalog, search/category/Popular filters, 12/24/48 client-side pagination, lazy card iframes, template modal preview/code/device modes, copy, and download controls exist.
- Slug modal routing, direct `?opened` resolution after metadata load, `popstate` handling, recoverable invalid-route UI, and per-template title/description metadata exist in source.
- Phase 4 current source maps unexpected API exceptions to a generic 500 and safe log fields; Turso persistence failures remain sanitized 503 responses. Runtime provider behavior is unverified.
- Phase 6 current source resolves active category slugs and records daily aggregate activity with authenticated bounded-range reads. No analytics UI was added; runtime behavior remains unverified.
- `/vcon` and `/vcon/*` select Admin, except `/vcon?opened` or `?closed`, which are reserved for the legacy public slug route.
- Current source stores the Admin tab in `/vcon/{tab}`; bare `/vcon` defaults to Templates. Direct-refresh behavior is source-implemented but requires post-rebuild live confirmation.
- Admin auth, template/category/settings management, Turso/R2 management, and durable Turso-backed template sync-job code exist. Phase 2 auth hardening is now implemented in source; see [implementation-roadmap.md](implementation-roadmap.md#phase-2--admin-signing-and-access-hardening--implemented-in-source-runtime-pending) for its validation limits.
- Source existence above does not prove browser, database, R2, cache, or production behavior.

## Audit Limits

During the frozen-baseline audit, no live credentials, database contents, production slug inventory, Cloudflare dashboard, deployed URLs, or customer data were accessed and no resources were changed. Later approved source phases are separately recorded; no production resource was changed by those source updates. See [implementation-roadmap.md](implementation-roadmap.md) and [error-handling.md](error-handling.md).
