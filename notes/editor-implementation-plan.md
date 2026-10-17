# Reusable Local HTML Editor Plan

## Baseline and Goal

- Frozen source baseline: `main` / `1fcea4b85dba1c001d0a7b2a32f7cd09db2e5665`, dated 2026-10-16; package/lockfile `0.0.5`.
- Phases 1–4 were authorized and implemented in the current working tree. Source review is complete; full typecheck/build and browser/runtime acceptance remain blocked or unverified.
- Goal: extract the modal's HTML-editing behavior into a reusable engine under `src/editor/`, then make a slug's local HTML the authoritative source for its edit/preview/HTML/download flow after edit mode is activated.
- The user-defined target edit route is `/{encodedSlug}/edit`. It is not handled by the current public route parser. Direct refresh and Pages delivery must be verified before treating that route as usable in production.

## Audited Current Source

- Editor processing, local storage, selection confirmation, and state/message handling now live under `src/editor/`; `PublicApp.tsx` owns host integration.
- Preview text edits are represented as validated text-node snapshots. In local edit mode, each valid snapshot is synchronously written to the slug-scoped localStorage record.
- Local edit route Preview, HTML, Copy, and modal Download use local content. Missing/corrupt local state fails closed; it does not fall back to original HTML. Edited Download uses a Blob and skips its metric POST; unedited/card Download retain the prior metric path.
- The route parser recognizes `/{encodedSlug}/edit`. Pages route configuration sends `/api/*` and `/templates/*` to Functions; direct Pages shell delivery for `/{slug}/edit` remains a runtime question.
- Editor records are persistent per-origin localStorage strings; they are not session-only and are not sent to an API by the editor flow.

## Target Module Boundary

All reusable editor behavior belongs under `src/editor/`. `PublicApp.tsx` should retain only modal/catalog integration and pass inputs/events through the module's public API.

Proposed module layout:

```text
src/editor/
  README.md
  index.ts
  types.ts
  documentProcessor.ts
  useHtmlEditorEngine.ts
```

- `documentProcessor.ts`: editable target IDs, text edit application, shape validation, editor bootstrap, and preview document preparation.
- `useHtmlEditorEngine.ts`: React lifecycle/state adapter, iframe message validation, editable toggle, edit snapshot, local persistence, preview restore, and edited-download eligibility.
- `types.ts` and `index.ts`: message/edit contracts and the public module exports. `README.md` documents the API and host requirements.
- The module has no imports from `PublicApp`, catalog types, router helpers, or site APIs. The host still owns fetching, modal presentation, routing, Blob trigger, and metric POST selection.
- `localHtmlStore.ts` and confirmation/processing UI are implemented inside this boundary; storage keys are schema-versioned and slug-scoped.
- To support copying the module to another app, preserve the host-independent import boundary. `useHtmlEditorEngine.ts` requires React; the document processor and types use browser platform APIs. Cross-app reuse is not proven until tested in a separate consumer.

Implemented storage record shape:

```ts
interface LocalHtmlDocument {
  schemaVersion: 1;
  slug: string;
  html: string;
  savedAt: string;
}
```

Use a namespaced, encoded per-slug key such as `free-html:editor:v1:<slug>`. Store an HTML string in JSON; localStorage does not store a file/blob. `localStorage` persists per origin across browser restarts and is not session-only. A local record must never be sent to an API.

## Phase 0 — Plan Refresh

**Status:** Complete; documentation only.

**Scope lock:** Freeze current baseline, remove superseded `notes/` Markdown, create this editor-focused plan/status/log/error set, and update `MEMORY.md`. No app source, dependencies, API, database, or production changes.

## Phase 1 — Extract and Isolate the Editor Engine

**Status:** Implemented in source; editor diagnostics pass; full build/runtime verification pending.

**Scope lock:** Move all existing editor-specific document processing, text target mapping, edit state/synchronization, iframe message handling/validation, preview HTML preparation, edited HTML generation, and editor-only error types from `PublicApp.tsx` into reusable `src/editor/` modules. Add a small public API and replace inline editor logic in `PublicApp.tsx` with calls to that API.

**Out of scope:** New click-to-edit flow, localStorage persistence, `/slug/edit` route, modal redesign, Download/Copy/HTML behavior changes, API/schema changes, dependency changes, and unrelated cleanup.

**Acceptance/result:** The document processor and React hook are in `src/editor/`, exported through `index.ts`, and used by the modal. `PublicApp.tsx` retains host UI/routing/fetch/download integration. Card/raw fetch and modal controls remain in place. The module imports no app-local modules; its React hook requires React as a peer/runtime dependency. Current source diagnostics pass. No browser/runtime test or separate consumer-app test was run.

**Implementation record:** Added `src/editor/types.ts`, `documentProcessor.ts`, `useHtmlEditorEngine.ts`, `index.ts`, and `README.md`; rewired `src/public/PublicApp.tsx`. No new storage, route, popup, preloader, API, schema, or UI flow was added in Phase 1.

## Phase 2 — Confirm and Start Local Edit Mode

**Status:** Implemented in source; local browser and Pages SPA-shell route verified. Real Pages Functions data integration and production delivery remain unverified.

**Scope lock:** In the view modal, default the editor mode to enabled. Clicking an eligible preview text opens the requested confirmation dialog: “Hello here! Do you want to edit this HTML?” `No` closes the prompt without changing content. `Yes` shows a processing state, obtains the already-loaded source HTML when available (one raw GET only if source is not loaded), creates a versioned localStorage record, then enters `/{encodedSlug}/edit` and renders from the local record. Do not upload edited HTML or add a server save endpoint.

**Routing acceptance/result:** The root `/{encodedSlug}/edit` route is parsed separately from reserved routes. Local browser and Wrangler Pages checks verified direct open/reload and Back/Forward. The Yes path writes before pushing the route; No leaves route and storage unchanged. Actual Pages Functions still need local persistent bindings for full data integration.

**Storage acceptance/result:** Valid per-slug records are read before raw HTML. Corrupt/unavailable records show explicit errors; edit-route HTML/Copy/Download cannot fall back to server HTML. The initial edit route is entered only after a successful write. Metadata/catalog requests remain unchanged. Browser-level storage behavior remains unverified.

**Out of scope:** General contenteditable/source-code editing beyond the approved text editor, changing card previews, Admin, analytics schema, server persistence, or unrelated route redesign.

## Phase 3 — Local-First Live Edit, HTML View, and Download

**Status:** Implemented in source; local browser/storage/network checks pass. Production behavior remains unverified.

**Scope lock:** On every supported edit, compute the updated HTML from the current source plus validated text-node edits and synchronously persist that snapshot to localStorage. While a local edit record is active, Preview, HTML, edit route, Copy, and modal Download use local state; do not re-fetch raw HTML as a fallback. Switching Preview/HTML preserves the same local document. Download uses a browser Blob; edited downloads skip the metric POST, while unedited/card downloads retain existing behavior.

**Out of scope:** Server-side save, account sync, cloud backup, changing unrelated downloads/Copy semantics, storage migration to another backend, or editing other templates as a side effect.

**Acceptance/result:** Local browser checks verified text edit -> localStorage, HTML view, Preview restore, copied HTML passed to the clipboard API, and Blob content. The captured download was `minimal-dark-button.html`, contained the edited string, and did not contain the original. Edited download emitted no API/metric request; only the test harness's local `blob:` read was observed. Direct reload restored the edit without a main-frame raw GET; catalog card iframes still made their expected raw GETs. Unedited modal and card downloads retained their metric POSTs. Corrupt storage displayed an error without raw fallback; simulated quota failure kept the route unchanged and created no record. Closing the modal preserves the record; no reset UI is provided, so users can remove it through browser site-data controls.

## Phase 4 — Full Review, Verification, and In-Scope Fixes

**Status:** Complete for source and local runtime; Cloudflare/production behavior was not tested.

**Scope lock:** Review all changed Phase 1–3 code against this plan; fix only editor/module/route/storage/HTML/download defects in scope. Verify module reuse boundary; Yes/No/processing flow; default mode; localStorage success, reload, corrupt record, unavailable storage and quota failure; Preview/HTML/edit route parity; edited local download bytes; no edited-HTML requests or metric POST; unchanged unedited/card metrics; sandbox attributes; unrelated routes/UI remain unchanged.

**Verification result:** Re-audited Phase 1–3 and fixed two gaps: persist every validated edit and fail closed when required local edit-route data is missing. Browser regression also exposed invalid editor IDs caused by using the Set callback's second argument as an index; changed ID assignment to indexed array iteration. Local browser verified Yes/No, visible processing, initial save, edit route, live text persistence, Preview/HTML parity, clipboard API receives edited HTML, edited Blob bytes, no edited API/metric request, unedited/card metric POSTs, corrupt/quota errors, direct reload, and Back/Forward. A direct route reload made no main-frame raw-template request; catalog card iframes continued their normal raw GETs. `npm run build`, editor diagnostics, storage smoke checks, and iframe script parsing pass. `npm run lint` reports five errors outside this scope in `src/apiCacheWorker.ts`, `src/lib/apiHandler.ts`, `src/lib/siteScripts.ts`, and `src/lib/turso.ts`. The browser harness could not verify the real OS clipboard contents; the app's clipboard API received the edited HTML. Cloudflare Pages/production delivery was not tested and no deployment occurred. Temporary Windows native packages were installed locally; manifests and lockfile are unchanged.

## Phase 5 — Cloudflare Pages Local-Runtime Verification

**Status:** Complete for the approved local scope; real Pages Functions data bindings remain unavailable.

**Scope lock:** Use `wrangler pages dev dist` only. Verify SPA shell/direct `/{slug}/edit` delivery, localStorage restoration, Preview/HTML state, Back/Forward, and main-frame network behavior. Do not use production or deploy. Do not change APIs, metrics, unrelated UI, or dependencies/configuration.

**Verification result:** Wrangler Pages emulator served `/` and `/{slug}/edit` with `200`; direct edit-route refresh and localStorage restoration passed. With a local browser fixture for the template-metadata response, Preview/HTML switching and Back/Forward between the modal route and `/{slug}/edit` passed. A direct edit-route reload made no main-frame raw-template GET. No source code changed in Phase 5. The emulator had no `.dev.vars`/persistent Turso binding: actual `/api/templates`, `/api/categories`, `/api/settings`, activity, raw-template, and direct `/templates/{slug}` Function requests returned `503`. Therefore the editor-flow test used a local metadata fixture; the real Pages Functions/data integration remains blocked/unverified. No deployment or production request was made.

## Phase 6 — Production Release and Smoke Verification

**Status:** User-approved; blocked before deployment because Wrangler is not authenticated.

**Scope lock:** Build the reviewed source and deploy `dist` only to the configured Cloudflare Pages project `html-snippets`, then perform a read-only smoke check of the deployed edit route and editor flow. No schema/data migration, unrelated code/UI/API change, or commit/push. Report the five unrelated lint errors; do not fix them within this phase.

**Acceptance:** Production deployment target is the configured Pages project; build succeeds; deployed `/{slug}/edit` direct refresh serves the app; editor can use a local record, switch Preview/HTML, and download locally without edited-content API/metric POST. If credentials, target confirmation, or runtime conditions prevent a check, stop and report it; do not substitute a different production target.

**Execution record:** Approval received 2026-10-16. `wrangler.toml` identifies `html-snippets`; `npx wrangler whoami` reported “You are not authenticated. Please run `wrangler login`.” `npm run build` succeeded. Deployment was not attempted; no production request, source/config change, commit, or push occurred. To resume, the project owner must authenticate Wrangler locally and then request continuation; do not send or store auth tokens in chat.

## Phase Order and Approval

`0 (docs) -> 1 (engine extraction) -> 2 (confirmation/local record/edit route) -> 3 (local-first sync and download) -> 4 (source/local browser regression) -> 5 (Pages local-runtime verification) -> 6 (production release)`

Phases 0–5 have source/local verification records. Phase 6 is approved but blocked before deployment until Wrangler authentication is available. No production deployment or access has occurred.
