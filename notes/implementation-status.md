# Implementation Status

## Baseline

- Frozen source commit: `fecafe2` (`Paginate public template cards`), branch `main`.
- Baseline worktree was clean and synced with `origin/main` on 2026-10-16.
- Baseline version `0.0.1`; Phase 1 `0.0.2`, Phase 2 `0.0.3`, card redesign `0.0.4`, current preview-loader version `0.0.5`.
- Source implementation is not equivalent to runtime/deployment verification.

## Existing Source Features

- Public settings and full metadata list load from `/api/settings` and `/api/templates?metadata=1`.
- Search, category/Popular filters, and 12/24/48 client-side card pagination are present; pagination limits rendered cards, not API/DB work.
- Card previews use lazy raw HTML iframes with a compact per-frame loading indicator hidden on `onLoad`; modal device/code modes, copy/download, and download counter remain present.
- Admin setup/auth, template/category/settings management, Turso/R2 management, and status UI exist.

## Phase 1 Source Implementation

- Public modal URLs use `/{slug}?opened` and `/{slug}?closed`; direct open and browser Back/Forward synchronize with modal state.
- Encoded slugs are decoded by existing raw/detail/download routes; invalid/non-representable routes show a recovery state.
- URL state is client-side only; no analytics writes or view-counter change.

## Phase 2 Source Implementation

- Optional per-template `description` is present in the shared model, Admin single-template editor, template save API and Turso persistence, and public metadata projection.
- Existing DB schema migration adds a non-null empty-default column; older template rows retain an empty fallback. Save calls omitting description preserve an existing value.
- Active modal sets browser title/OG title to template title and description/OG description to template description or site-level fallback. Closing restores site metadata. OG image remains site-level.
- Version manifest and lockfile are synchronized at `0.0.3`.

## Current Roadmap Status

| Phase | Status |
|---|---|
| 0. Baseline/source audit | Complete; docs only |
| 1. Slug modal URL state | Complete in source; browser/deployment verification pending |
| 2. Per-template metadata | Complete in source; migration/browser verification pending |
| 3. Staging/regression | Approved; blocked before staging (build binding, Wrangler auth, and staging target unavailable) |

## Verification Limits

- VS Code diagnostics found no errors in the touched source and manifests.
- Browser testing, live Turso migration/save, deployed route behavior, encoded-slash delivery, and crawler metadata were not verified.
- Phase 3 preflight: build failed because the Windows Rolldown native binding is missing; Wrangler is unauthenticated and no non-production route is configured. No deployment or production mutation was performed.
- No automated test script exists; historical TypeScript/Rolldown dependency failures should be rechecked before rollout.
