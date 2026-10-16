# Phase Progress Log

## Current Roadmap Snapshot

- Baseline: `13faaf6ed9ec67dad5ca9a96e8e0e4701ff0a28c` on `main`, package/lockfile `0.0.5`, frozen 2026-10-16.
- Total current roadmap phases: 8 (Phase 0 through Phase 7).
- Complete in source: 5 phases (Phase 0 audit, Phases 2–4, and Phase 6 category routing/aggregate activity).
- Remaining: 3 phases without source completion. Phase 1 is blocked/deferred; Phase 5 live verification is deferred; Phase 7 release remains separately gated.
- Phases 2–4 and 6 changed source; no production data mutation, staging deployment, or production deployment occurred.
- Current lint/build blockers and unverified environments are recorded in [implementation-status.md](implementation-status.md).

## Phase 0 — Current Baseline and Forensic Audit

- Status: Complete; documentation only.
- Source baseline: `13faaf6ed9ec67dad5ca9a96e8e0e4701ff0a28c`; source paths matched `HEAD` at freeze.
- Worktree note: prior edits affected planning Markdown only; not described as a clean worktree.
- Recorded current source facts, security/durability/error findings, command blockers, and deployment unknowns.
- Changes: notes and `MEMORY.md` only; no code/config/production writes.

## Pending Current Roadmap Phases

| Phase | Planned work | State |
|---|---|---|
| 1 | Reproducible lint/build and isolated staging prerequisites | Started by user request; blocked before acceptance |
| 2 | Admin signing secret and access hardening | Implemented in source; focused helper checks pass; runtime/deployment pending |
| 3 | Fail-closed Turso persistence and managed secret storage | Implemented in source; runtime/deployment pending |
| 4 | API/UI error handling and metric correctness | Implemented in source; runtime verification pending |
| 5 | Verify existing URL/metadata source features | Deferred until post-push live test |
| 6 | Category slug routes and aggregate activity tracking | Implemented in source; runtime verification pending |
| 7 | Separately approved production release and rollback | Proposed; not approved |

## Phase 2 — Admin Signing and Access Hardening

- Status: Implemented in source; focused helper assertions passed; runtime/deployment verification pending.
- Approval: user approved Phase 02 on 2026-10-16.
- Changes: removed default JWT signing key; require a 43-character runtime secret; pass Pages/local runtime secret into sign/verify paths; version tokens with `kid: admin-v2`; add bounded five-per-15-minute per-isolate setup/login attempt windows; set shared `authPolicy.ts` 15–128 character password rule for setup/create/change; update existing validation text and deployment secret example.
- Compatibility: all existing Admin tokens lack the new key id and will be rejected; users must sign in again. Existing passwords remain valid for login, but new/changed passwords must meet the new rule.
- Scope: no Admin layout, public app, DB/schema, package/lockfile, R2/cache config, credentials, or production resource changes.
- Validation: diagnostics clean on all six touched source files; isolated auth helper assertion command passed before extracting the unchanged policy function. `tsx` runtime test was blocked by missing Windows esbuild optional binary; API graph cannot run under Node type stripping due existing type-only value imports. Full lint/build remain dependency-blocked; no live API/Cloudflare test was run.
- Limitation: rate-limit map is bounded and isolate-local; it does not replace provider-level distributed rate limiting.

## Phase 3 — Fail-Closed Persistence and Secret Storage

- Status: Implemented in source; runtime/data verification pending.
- Approval: user approved Phase 03 on 2026-10-16.
- Changes: deployed API DB routes reject mock storage; strict Turso clients throw instead of silently falling back in helpers; category/admin/template/settings writes cannot return mock-backed success; status reports non-durable storage as disconnected.
- R2 secrets now come only from deployment environment variables/native binding. App R2-save and runtime-env endpoints reject writes; existing Admin forms do not send typed credentials. Existing `r2_config` database values were not read, migrated, or deleted.
- Owner must configure deployment R2 environment values after code deployment; any old DB secret rotation/removal remains owner-controlled after verified cutover.
- Sync-job persistence errors remain distinct from R2 transfer failures; existing retry/backoff behavior is unchanged and not runtime-tested.
- Validation: diagnostics clean for five touched source files; `git diff --check` clean. No runtime Turso outage, R2, sync restart, browser, or Cloudflare test was run; npm gates remain blocked by missing Windows optional packages.
- Scope preserved: no public UI/Admin layout, DB schema/data, package files, Wrangler config, production settings, deployment, or cache purge changed.

## Phase 4 — API and User-Facing Error/Metric Correctness

- Status: Implemented in source; diagnostics clean; browser/API verification pending.
- Approval: user approved Phase 04 on 2026-10-16.
- Changes: controlled malformed R2 path 400; generic top-level 500 with method/error type only; sanitized Turso 503; no raw public template-list exception details; explicit failed-catalog retry state and card/modal iframe error feedback; root React error recovery boundary.
- Download counter now receives a request after HTML is loaded and the browser download is triggered. The UI reports “Download started”; this does not assert browser-save completion. The server verifies template existence before incrementing.
- Validation: diagnostics clean on `apiHandler.ts`, `PublicApp.tsx`, and `main.tsx`. No browser/API fault injection was run; full npm lint/build remain blocked by missing Windows optional dependencies.
- Scope preserved: no layout redesign, persistent analytics, schema/package/config change, production data/settings change, deploy, or cache purge.

## Phase 6 — Category URL Routing and Aggregate Activity

- Status: Implemented in source; runtime/data verification pending.
- Approval: user approved Phase 06 on 2026-10-16.
- Routes: `/`, `/popular`, `/categories/{slug}`, `/templates/{slug}`. Template URL preserves validated category/page/size or Popular return context; modal close restores it. Search stays client-only; legacy modal aliases and `/vcon` Admin isolation remain.
- Added public active-category read path and valid-slug checks. Empty active categories remain valid and use the existing empty-results state.
- Added `category_view`, `template_open`, and `download_request` daily UTC aggregates. Download event is written best-effort alongside the existing counter route.
- Aggregate schema stores only day/event/resource slug/count/update time, prunes beyond 90 days, and exposes an authenticated admin read endpoint with a maximum 90-day date range. Public event ingestion validates active slugs and uses transient in-memory IP rate limiting; no IP/user-agent/user ID/search term/per-user history is persisted.
- Validation: diagnostics clean on `turso.ts`, `apiHandler.ts`, and `PublicApp.tsx`. No browser history, API, migration, retention, rate-limit, or aggregate-counter runtime test was run. No schema migration or production change was executed.
- Scope preserved: no visible UI redesign/dashboard, no search URL/analytics, no production data/settings, deployment, or cache purge.
- Post-deploy hotfix: browser console reported `ReferenceError: Cannot access 'dt' before initialization`; minified offset mapped to the clamp effect reading `totalPages` before its declaration. Moved the effect below `totalPages`/pagination calculation. Touched-file diagnostics pass; push/rebuild/live confirmation pending.

## Workflow Note (2026-10-16)

- Per the user's instruction, staging setup/auth/deployment is deferred. After all code phases, GitHub push and Cloudflare auto-rebuild precede the user's live test.
- Phase 5 is a post-push verification gate; Phase 6 code was implemented under separate approval before that live test.
- No pre-push Cloudflare access or production operation is authorized by this workflow note.

## Phase 1 — Reproducible Validation and Staging Prerequisites

- Status: Started by user request on 2026-10-16; blocked; not complete.
- Scope: dependency restore from existing lockfile, lint/build validation, isolated staging prerequisites, Wrangler authentication check. No feature/code changes.
- `npm ci --ignore-scripts` completed but omitted the Windows TypeScript and Rolldown optional binaries referenced by the locked package declarations.
- `npm install --package-lock-only --include=optional` and lockfile-enabled `npm install --no-save` did not add the missing package records or change tracked files.
- The one final `npm run lint` and `npm run build` each stopped before type checking/bundling because those optional platform packages were absent.
- `npx wrangler whoami` reported unauthenticated. No `.env`, `.dev.vars`, or isolated staging target is configured.
- No source, manifest, lockfile, Wrangler config, deployment, production write, schema migration, or cache purge was changed/performed.
- Blockers: repair/reconcile optional dependency lock metadata or install policy within approved dependency scope; obtain/configure an approved non-production target and Wrangler access. Do not use `wrangler.cache.toml` production routes.
- The four TypeScript errors from the temporary no-lock install are discarded as evidence because it floated packages beyond the frozen lockfile.

## Historical Source Milestones

These are source-history records from the superseded roadmap, not claims of live production behavior:

- Historical baseline `fecafe2` / `0.0.1`: public slug modal route and per-template description were absent in that snapshot.
- Historical Phase 1: `/{encodedSlug}?opened` / `?closed`, browser history synchronization, recoverable route errors, and encoded API slug decoding were added in source. Browser/Pages behavior was not verified.
- Historical Phase 2: optional template description, additive Turso migration, Admin editor, and client-side modal metadata were added in source. Live migration/browser behavior was not verified.
- Historical Phase 3: approval to stage the historical Phases 1–2 was recorded on 2026-10-16. It was blocked before staging by missing build bindings, unauthenticated Wrangler, and no non-production target. No deployment or production mutation occurred. This historical approval does not authorize a production deploy or the new roadmap phases.
- Historical public card loader update: the card iframe displays a loading indicator hidden by its `onLoad` handler. This is source behavior, not proof of faster loading or successful iframe delivery.

## Per-Phase Close Record Template

After each approved phase, append:

- Approval and date; phase/scope lock; baseline commit.
- Files and behavior changed; preserved and out-of-scope behavior.
- Focused validation command and exact result.
- Runtime/staging/production evidence, clearly separated from source diagnostics.
- Failures, unresolved risks, rollback state, completed-phase count, remaining phases, and next approval needed.

Do not mark a phase complete because code exists or diagnostics are clean; use the phase acceptance gate in [implementation-roadmap.md](implementation-roadmap.md).
