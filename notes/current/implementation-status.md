# Implementation Status

## Frozen Baseline

- Source: `main` / `5e95ac8875052dd83bcef7310f1b9ed7e9186eb7` (`feat(admin): add public header and footer scripts`), dated 2026-10-16.
- Package and lockfile: `0.0.5`.
- Worktree was clean and synced before this documentation refresh. The current worktree now contains the approved Phase-02 source patch and documentation updates; the frozen baseline commit itself is unchanged.
- Source presence is not proof of live or deployed operation.

## Existing Source-Implemented Behavior

- Public catalog, search/category/Popular filtering, client-side pagination, lazy card previews, modal Preview/HTML modes, desktop/tablet/mobile viewport controls, Copy, Download, and modal close handling exist in source.
- Public category/template routes, route restoration, and aggregate activity paths exist in source.
- Admin auth hardening, fail-closed deployed Turso behavior, environment-based R2 credentials, API error handling, SEO metadata/template-detail response support, and Header/Footer script settings exist in source.
- These are source facts. This documentation refresh did not exercise the live site, Cloudflare, Turso, R2, crawler behavior, or a production deployment.

## New Feature State

- Phase 2 modal preview foundation: **implemented in source** in `src/public/PublicApp.tsx`; default-on Editable switch, local raw-HTML loading/cache, sandboxed `srcDoc`, preview-local scrollbar styling, and plaintext-only text editability toggled by `postMessage` are present.
- Phase 3 synchronizes eligible direct text-node changes into transient local HTML state using source-validated `postMessage` and a child-node shape check. Phase 4 modal Download uses that state when present and skips the metric POST; with no edits, it uses original fetched HTML and retains the POST. Card Download remains on its original path.
- A Phase-04 bugfix now fails edited HTML generation atomically if an edit target is missing, its node shape changed, or its referenced node is not text. Modal Download shows a recovery toast and does not fall back to original HTML when captured edits cannot be applied.
- Local edits survive Preview/HTML switching while the modal remains open. Closing/reopening or changing templates resets them to original content.
- The editor handler itself issues no API request and no persistence is used. Existing template scripts remain enabled and may independently make requests.
- The editor's toggle/input path makes no app API request. Template scripts remain enabled under the existing sandbox and may independently make requests; universal zero-network behavior is not established.
- HTML view and Copy remain original-source-only. No edited HTML is sent to the server, and no API/database/persistence path was added.
- Phase 1 is complete as a documentation-only contract; Phases 2–4 are implemented in source but not browser/runtime verified. Phase 5 is approved and source-audited but runtime-blocked; Phase 6 remains proposed and unapproved. See [implementation-roadmap.md](implementation-roadmap.md).
- Future download contract: edited downloads must not send edited HTML or make the counter/activity POST; unedited downloads retain the existing metric. HTML view and Copy remain original-source-only. Editing is limited to eligible visible HTML text-bearing elements; form values, attributes, SVG/canvas, CSS-generated text, formatting, and structure are excluded.

## Verification Record

- Phase 4 validation: VS Code diagnostics for `PublicApp.tsx` report no errors after the silent text-loss fix. Browser interaction, app test, lint command, build, staging, and production checks were not run for this phase.
- Phase 5 source audit: source confirms the requested branches and contains no browser-storage API use in `PublicApp.tsx`; modal sandbox permissions remain unchanged. Local browser checks are blocked because `npm run dev -- --port 4173` fails before startup on missing `@esbuild/win32-x64`. Actual interaction/download/network/storage behavior is not verified; Phase 5 acceptance is incomplete.
- Previous notes recorded `npm run lint` and `npm run build` blocked by missing Windows optional packages after the then-current lockfile install. Those outcomes are historical and were not rerun for this refresh.
- `package.json` has no automated test script.
- No production deployment, DB migration, production setting change, or production data mutation was performed for this task.

## Historical Roadmap Reconciliation

The prior roadmap's Phases 2–4, 6, 8, and 9 describe changes present in the frozen source; Phase 1 validation and Phase 5/7 production verification remained blocked/deferred or separately gated in those records. Their runtime/deployment claims remain unverified unless the user records later evidence. These old phase numbers are historical and are not the new editor roadmap's phase counts.

## Per-Phase Update Rule

After each approved phase, record: approval/date; baseline; exact scope; files/behavior changed; preserved behavior; focused command and result; runtime evidence separately; remaining limitations; completed/remaining phase counts; and next approval required. Never mark a feature “working in production” based only on source presence or diagnostics.
