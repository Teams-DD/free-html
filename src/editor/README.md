# HTML Editor Engine

This folder contains the reusable preview text editor engine used by the public view modal.

## Public API

Import from `src/editor/index.ts`:

- `useHtmlEditorEngine(slug, previewBaseUrl)` owns editor state, validated iframe messaging, preview reconstruction, and edited HTML calculation.
- The engine exposes storage-first preview initialization, explicit local-edit activation, selection confirmation state, and edited download-source status.
- `createPreviewDocument(html, baseUrl)` prepares a sandboxed preview document with editor bootstrap behavior.
- `applyPreviewTextEdits(html, edits)` applies supported text edits to a parsed HTML copy and fails when the source structure no longer matches.
- `LocalHtmlStore` reads/writes versioned HTML records under a slug-scoped localStorage key; storage errors are returned as explicit results.
- `EditConfirmationDialog` provides the shared Yes/No and processing UI.
- Exported types define editor messages and text edit records.

The engine does not fetch templates, manage application routes, emit analytics, or depend on public catalog/Admin models. The host supplies a slug and base URL, provides the raw-source fetch callback, and owns route navigation/download integration.

## Reuse Boundary

- `documentProcessor.ts` uses browser DOM APIs and has no app-local imports.
- `types.ts` has no app-local imports.
- `useHtmlEditorEngine.ts` requires React (peer/runtime dependency) for state and lifecycle integration.
- A non-React app can use the document processor and message types directly; a React app can use the exported hook.
- Keep the host iframe sandbox permissions explicit. Do not add `allow-same-origin` as part of engine reuse without a separate security review.

This is an internal source module, not a published package. Cross-app copyability is supported by its import boundary/API design but has not yet been tested in a separate consumer application.
