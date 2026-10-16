# Production-Readiness Forensic Audit

## Audit Basis

- Frozen source baseline: `main` at `5e95ac8875052dd83bcef7310f1b9ed7e9186eb7`, dated 2026-10-16; package/lockfile `0.0.5`.
- Immediately before this documentation-only refresh, the repository was clean and synced to `origin/main`. This task changed no app source, configuration, database, or production resource.
- Findings are source-backed. They do not assert that the live site, Cloudflare, browser, Turso, or R2 has been tested.
- The prior notes' `13faaf6` baseline is historical and superseded by this freeze.

## Public HTML Preview Editor Findings

### F-01 — Modal preview has no edit mode

`PublicApp` has `viewMode` values `preview` and `code`; there is no editable-mode state. The modal preview is an iframe loading the raw-template URL. The HTML view renders a `<pre>`, not an editor. The source contains no `contentEditable` or `srcDoc` path for this modal.

Evidence: [PublicApp.tsx](../../src/public/PublicApp.tsx#L138), [PublicApp.tsx](../../src/public/PublicApp.tsx#L1227), [PublicApp.tsx](../../src/public/PublicApp.tsx#L1243).

### F-02 — Preview changes cannot reach Download

The download handler obtains HTML from `getTemplateHtml()`, creates a Blob from that string, and triggers a browser download. It has no input for preview DOM or local edits. Therefore the current download is fetched template HTML, not an edited preview.

Evidence: [PublicApp.tsx](../../src/public/PublicApp.tsx#L352), [PublicApp.tsx](../../src/public/PublicApp.tsx#L673).

### F-03 — Preview response includes preview-only CSS

The modal requests `/raw?hide_scrollbars=1`. The raw API conditionally injects scrollbar-hiding CSS into the returned HTML. `getTemplateHtml()` requests `/raw` without that query. Using the modal response itself as export HTML would include preview-only CSS unless it is removed or kept out of the export source.

Evidence: [PublicApp.tsx](../../src/public/PublicApp.tsx#L24), [apiHandler.ts](../../src/lib/apiHandler.ts#L545), [apiHandler.ts](../../src/lib/apiHandler.ts#L554).

### F-04 — Existing Download has a server-side metric request

After triggering a local Blob download, the client sends `POST /api/templates/:slug/download`. The server increments the download count and records the `download_request` aggregate. The request does not carry HTML. Editing can avoid sending edited HTML, but preserving current Download analytics means the Download click still makes a server request.

Evidence: [PublicApp.tsx](../../src/public/PublicApp.tsx#L687), [apiHandler.ts](../../src/lib/apiHandler.ts#L583), [apiHandler.ts](../../src/lib/apiHandler.ts#L591).

### F-05 — Editor persistence is not present in the public flow

The audited public flow fetches raw HTML and posts a download metric; no editor state or public save/update request is wired into the modal. This describes the current path only; it does not claim that no unrelated Admin template-write API exists.

## Existing Source State Relevant to Readiness

- Public catalog, category/Popular filters, pagination, card previews, modal preview/HTML display, viewport modes, copy, and download are present in source.
- Public category/template routes and daily aggregate activity are present in source. The conditional orphan-`General` category repair exists in source but has not been run against a live database.
- Auth hardening, fail-closed deployed Turso handling, deployment-environment R2 configuration, sanitized API failures, SEO/template-detail rendering, and Admin-managed Header/Footer scripts are present in the frozen source. Existing DB values, deployed secrets/configuration, migrations, and live behavior were not verified by this audit.
- `package.json` declares no test script. Prior notes recorded lint/build attempts blocked by missing Windows optional packages; those commands were not rerun for this documentation refresh.
- No production deployment or production data mutation was performed as part of this audit.

## Phase-01 Contract Decisions

These decisions apply to the proposed editor implementation and do not claim it exists in source:

1. Editing and edited download are local-only. Edited HTML is never sent to an API or saved remotely. The existing counter/activity `POST` is skipped for an edited download to honor the user's no-server-call requirement. Unedited downloads retain the existing metric request. This means edited downloads will not increment the current download counter/activity aggregate.
2. The HTML view and Copy command retain their current original-source behavior. Editing is scoped to Preview and the edited Download output; this phase does not redefine the code-view/copy contract.
3. Editable targets are ordinary visible HTML text nodes in the preview body. Text in form-control values/placeholders, attributes, CSS pseudo-elements, SVG/canvas, and document metadata is excluded. Template scripts remain enabled under the existing sandbox; script-driven changes to a rendered text node remain template behavior and are not guaranteed to preserve a user's edit.

Source fixtures demonstrate ordinary text, a script-mutated counter, and a checkbox input in [initialTemplates.ts](../../src/lib/initialTemplates.ts#L38) and [initialTemplates.ts](../../src/lib/initialTemplates.ts#L71). `INITIAL_SEEDS` is used for mock/seed behavior in `turso.ts`; this does not establish the complete production template corpus. The later verification phase must test representative templates without claiming universal compatibility from these fixtures.

The raw HTML GET needed to load the template remains a server read. The no-request guarantee applies to edit events and edited downloads: no edited HTML payload and no metric POST for edited output.

## Phase-02 Source Delta

- The frozen baseline findings above remain the baseline record. The approved Phase-02 working-tree patch in `src/public/PublicApp.tsx` now adds a default-on Editable switch, fetches/caches original HTML for the modal preview, and renders it in the existing sandbox permissions using `srcDoc`.
- A preview-local bootstrap script toggles `contenteditable="plaintext-only"` on visible eligible text-bearing HTML elements via `postMessage`. Preview-only scrollbar CSS is added to the local preview document, not the source HTML response.
- This patch does not serialize edits to React HTML state. HTML view, Copy, Download, and metrics still use their prior source behavior. Edited-download behavior remains for Phase 4.
- The editor handler itself performs no network request. The iframe still allows the template's scripts under the existing sandbox, so template-provided code may make its own requests; that behavior is not controlled or universally audited by this feature.
- Focused VS Code diagnostics for `PublicApp.tsx` report no errors. No browser/runtime test or build was run; the edit behavior is not claimed as live-verified.

## Phase-03 Source Delta

- The approved Phase-03 working-tree patch remains in `src/public/PublicApp.tsx` only. It maps eligible visible text-bearing elements to stable local IDs and sends changed direct text-node values through a source-validated iframe `postMessage`.
- The parent applies only those text values to a parsed copy of original HTML after checking the target's child-node shape. Editor IDs/attributes and preview-only style, base, and bootstrap script are not included in this local HTML representation.
- The transient representation survives Preview/HTML mode switching while the modal stays open. HTML view, Copy, Download, metrics, routes, and server APIs remain unchanged; closing/changing templates clears it.
- Focused diagnostics report no errors, and the injected bootstrap script parses as JavaScript. No browser/runtime/build test was run.

## Phase-04 Source Delta

- Modal Download now uses transient edited HTML when present and creates the file locally. That branch neither fetches original content nor sends edited HTML, and it skips the download-counter/activity POST.
- With no edits, modal Download retains the original raw-HTML fetch and counter POST. Card Download still calls the shared handler without an override and retains its prior behavior.
- Only `src/public/PublicApp.tsx` changed for this phase. Focused diagnostics report no errors; no browser/runtime/build test was run.

## Phase-05 Verification Result

- Source audit confirms default-on Editable state, local text-edit messaging/state, Preview rehydration from edited state, modal edited-HTML Blob selection, edited metric-POST skip, and the unchanged one-argument card/unedited download path.
- `PublicApp.tsx` contains no localStorage, sessionStorage, IndexedDB, or cookie use. The modal iframe retains `sandbox="allow-scripts allow-modals"`; card iframe sandbox remains unchanged.
- Browser-level checks for actual text input, tab switching, generated download contents, request traces, and storage were not run. The local server could not start: `npm run dev -- --port 4173` stopped before app startup because `@esbuild/win32-x64` is missing.
- Phase 5 runtime acceptance is **blocked/not met**. No production/shared browser page, deployment, dependency install, or app source change was used for this phase. Phase 6 remains gated.
