# Implementation Status

## Status Rules

- Baseline: `417dc16202a69806bf62bb55819ed3d16c2326b7` on `main`.
- Items below are marked **source-implemented** when the code path exists. This is not the same as production verification.
- Production cache configuration and live DB/R2 behavior have not been verified from this workspace.
- Phase 0 documentation and Phase 1–6 source implementation are complete; Phase 7 is not implemented.
- Phase 1–3 changes are uncommitted. Worker routes must be deployed/attached before cache behavior is live.

## Pre-Phase-1 Source-Implemented Features at Baseline

### Public application

- Loads site settings and template data from `/api/settings` and `/api/templates`: [PublicApp.tsx](../src/public/PublicApp.tsx#L67) [PublicApp.tsx](../src/public/PublicApp.tsx#L117).
- Renders category/search filters and HTML cards from the fetched list; the card iframe uses `srcDoc`: [PublicApp.tsx](../src/public/PublicApp.tsx#L280).
- Has preview/code modes, desktop/tablet/mobile preview sizing, code copy, HTML download, and download-count request: [PublicApp.tsx](../src/public/PublicApp.tsx#L156) [PublicApp.tsx](../src/public/PublicApp.tsx#L376).

## Phase 1 Working-Tree Implementation (Uncommitted)

- Adds an opt-in `dev_mode` setting and local-only public Dev Log for app API response metadata and top-level browser errors; response bodies and credentials are not captured: [PublicApp.tsx](../src/public/PublicApp.tsx) [DevLogPanel.tsx](../src/public/DevLogPanel.tsx).
- Adds request-level `Server-Timing` spans to `/api/settings` and `/api/templates`: [apiHandler.ts](../src/lib/apiHandler.ts).

### Admin application

- Admin route is lazy-loaded from the public app entry: [App.tsx](../src/App.tsx#L4).
- Template editor supports single and bulk file upload paths: [TemplateCreateEdit.tsx](../src/vcon/pages/TemplateCreateEdit.tsx#L114) [TemplateCreateEdit.tsx](../src/vcon/pages/TemplateCreateEdit.tsx#L124).
- Template/category tables contain row selection, bulk actions, and 20-row pagination: [TemplateManager.tsx](../src/vcon/pages/TemplateManager.tsx) [CategoryManager.tsx](../src/vcon/pages/CategoryManager.tsx) [AdminTablePagination.tsx](../src/vcon/components/AdminTablePagination.tsx).
- Shared admin confirmation modal is mounted at the admin root and used by admin confirmations: [AdminConfirmation.tsx](../src/vcon/components/AdminConfirmation.tsx) [VconApp.tsx](../src/vcon/VconApp.tsx).
- Settings, Turso, R2, and Deployment pages have widened centered content containers in source: [SettingsManager.tsx](../src/vcon/pages/SettingsManager.tsx) [TursoManager.tsx](../src/vcon/pages/TursoManager.tsx) [R2Manager.tsx](../src/vcon/pages/R2Manager.tsx) [DeploymentDocs.tsx](../src/vcon/pages/DeploymentDocs.tsx).
- Admin handlers exist for templates, categories, settings, database initialization/seeding, R2 configuration/files, and admin-user management: [VconApp.tsx](../src/vcon/VconApp.tsx#L185) [apiHandler.ts](../src/lib/apiHandler.ts#L453).

### Cloudflare and storage integration

- Pages Function routes `/api/*` to `handleApiRequest`: [functions/api/[[route]].ts](../functions/api/[[route]].ts).
- `_routes.json` includes `/api/*`; `/assets/*` are excluded from Functions: [public/_routes.json](../public/_routes.json).
- R2 supports S3 client and Native R2 binding helpers: [r2.ts](../src/lib/r2.ts#L145) [r2.ts](../src/lib/r2.ts#L298).
- Public `/api/settings` and `/api/templates` responses include request-level `Server-Timing` spans for handler/Turso timings and direct R2 object operations; this is not Cloudflare account analytics: [apiHandler.ts](../src/lib/apiHandler.ts).
- Static build assets have `public, max-age=31536000, immutable`; public JSON responses have no source-defined cache policy: [public/_headers](../public/_headers#L1) [apiHandler.ts](../src/lib/apiHandler.ts#L28).

## Roadmap Feature Status

| Roadmap phase | Source implementation status | Runtime/production status |
|---|---|---|
| 0. Baseline and docs | Complete; notes only | Baseline SHA recorded |
| 1. Measure and targets | Complete in source; Dev Mode evidence tool implemented | Live sample/target recorded; production activation unverified |
| 2. Public read caching | Worker gateway/config implemented; only two public list/settings GETs cached | Dry-run passed; Worker route and live HIT/purge unverified |
| 3. Cache freshness/invalidation | Revisioned R2 URLs, raw API no-store, per-object app-host fallback invalidation implemented | Dry-run passed; external old browser cache and live route behavior unverified |
| 4. Payload/read optimization | Public app uses metadata-only list; previews/content load from the existing raw endpoint | Typecheck blocked by missing Windows TypeScript package; deployed payload/browser regression pending |
| 5. Turso/R2 recovery | Atomic Turso sync jobs, idempotent R2 operations, bounded retries, and authenticated retry endpoint | Source diagnostics clean; deployed failure-injection pending |
| 6. Admin status/config work | 30-second status probe reuse, explicit forced refresh, admin request deduplication, and route-scoped R2 config reads | Source diagnostics clean; deployed call-volume impact pending |
| 7. Production rollout | Approved; blocked before staging | Build blocked by missing Rolldown native binding; Wrangler unauthenticated; no staging Worker route configured |

## Verification Limits

- Prior source diagnostics reported no errors for the inspected UI changes, but they do not verify Cloudflare, Turso, or R2 production behavior.
- A prior production build attempt failed because the Windows Rolldown native binding was missing.
- A prior local dev-server attempt failed because `@xmldom/xmldom` could not be resolved.
- Re-run build, tests, and browser regression checks after fixing the local dependency environment; do not treat the application as production-verified until then.