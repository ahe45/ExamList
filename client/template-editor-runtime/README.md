# Template Editor Runtime Boundary

The template editor is split into two layers.

## Host layer

Path: `client/features/template-editor`

Responsibilities:

- Loads template metadata and persisted layout data.
- Owns app-level state in `appState.templateEditor`.
- Opens and closes editor modals.
- Saves normalized template payloads through `template-api.js`.
- Adapts runtime events back into app state.

The host layer may call the runtime through the public API exposed by `loader.js` and the runtime factory. It should not reach into runtime internals directly.

## Runtime layer

Path: `client/template-editor-runtime/client`

Responsibilities:

- Owns document DOM interaction while the editor is mounted.
- Handles selection, keyboard commands, image movement, table editing, and toolbar interaction.
- Emits state changes through the runtime API.
- Keeps DOM-specific calculations close to the runtime modules.

The runtime layer should avoid importing host feature modules. Shared layout rules should be extracted to neutral helpers before both host and server preview code depend on them.

## Server rendering layer

Paths:

- `server/modules/pdf-templates`
- `server/modules/pdf-preview`

Responsibilities:

- Normalizes persisted layout data.
- Renders preview and PDF HTML from normalized layout.
- Applies the same page, table, image, candidate block, and data tag rules used by the client.

## Synchronization Points

- Host to runtime: `editor-runtime-loader.js`, `editor-runtime-adapter.js`, `template-editor-reset-runtime.js`
- Runtime to host: runtime API events, document state snapshots, dirty state sync
- Host to server: `template-api.js`, template request payload builders
- Server to client: normalized template layout, preview HTML, and PDF preview metadata/URL. Template editor PDF preview stores response `pdfUrl` as host state `previewPdfUrl`.

## Refactoring Rules

- Move pure geometry, sizing, and normalization logic before moving DOM code.
- Keep DOM reads and writes in runtime modules.
- Keep persisted layout shape changes in server normalization tests.
- When changing layout behavior, update both client editor tests and server preview tests.
