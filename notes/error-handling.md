# Error Handling Inventory

## Audit Basis

- Source baseline `fecafe2`, branch `main`, package `0.0.1`.
- Source behavior does not prove deployed provider behavior.

## Existing Public Behavior

- `/api/settings` failure is caught; local defaults remain and no visible public error appears. Dev Mode may log locally.
- `/api/templates?metadata=1` failure clears `snippets`; UI shows the same “No snippets found” state as a valid empty result.
- Raw HTML fetch failure is caught; code view shows an error message, and copy/download show a toast.
- Unknown raw template returns plain-text 404; unknown detail template returns JSON 404.
- Detail GET increments views asynchronously and swallows increment errors. Modal raw preview does not call detail GET.
- Iframes have no explicit load-error UI handler.
- Admin `/api/vcon/*` routes return 401 for invalid admin tokens.
- Template/R2 sync failures are represented by durable jobs for real Turso; mock mode cannot persist jobs. Live recovery is unverified.

## Phase 1 URL Handling

- Invalid/malformed/missing/non-representable slug routes show a recoverable route error.
- Raw/detail/download handlers decode percent-encoded slug segments; invalid encoding returns 400.
- X/Escape close to `?closed`; Back/Forward uses `popstate`. URL state is not persistent analytics.
- Phase 1 diagnostics clean; direct browser/Pages behavior remains unverified.

## Phase 2 Description Handling

- Description is optional. Existing DB rows migrate to empty string; old save clients omitting it preserve an existing description during edit.
- Public modal description uses template description when non-empty; otherwise uses current site description. Closing restores site title/description.
- New DB schema declares description with empty-string default. Existing schema uses PRAGMA detection and conditional ALTER; if migration still fails, `initTursoSchema`'s existing catch marks the client mock. Live migration has not been exercised.
- Open Graph image remains site-level because there is no per-template image field.

## Remaining Verification Requirements

- Test Turso migration on both old and new schema, save/reopen description, empty fallback, and old client payload omission.
- Test card/direct modal metadata, close restoration, lookup failure, and existing preview/copy/download/filter/pagination.
- Keep runtime evidence separate from editor diagnostics; do not log HTML, credentials, or sensitive query values.
