# Code Animator Architecture

## Purpose

Code Animator is deployed as one Vite-powered frontend bundle. The project is organized by **feature ownership** at the UI boundary and by **responsibility** for reusable application services. This keeps the visual surface separate from rendering, animation, export, persistence, and state mechanics without introducing a server/client deployment split.

The canonical visual contract remains `SceneRenderModel`. The editor, canvas preview, and export pipelines continue to consume the same resolved scene appearance and timeline so the architecture refactor does not create a second rendering path.

## Source Layout

| Directory | Responsibility | Allowed role |
| --- | --- | --- |
| `src/features/` | User-facing product capabilities | Feature UI, feature hooks, and feature-local orchestration |
| `src/services/` | Framework-independent domain and media logic | Rendering, timeline replay, animation evaluation, highlighting, markup, audio, and export |
| `src/state/` | Zustand application state | Projects, timeline, export lifecycle, UI skins, and code themes |
| `src/persistence/` | IndexedDB data access | Repositories, autosave, and import/export archives |
| `src/data/` | Built-in static configuration | Skins, themes, backgrounds, snippets, platform presets |
| `src/workers/` | Vite worker entrypoints | Off-main-thread export rendering |
| `src/shell/` | Application composition and runtime effects | `AppShell`, `TopBar`, bootstrap, skin synchronization, autosave wiring, and timeline wiring |
| `src/ui/` | Reusable visual primitives | Radix/shadcn-style controls with no product feature ownership |
| `src/types/` | Shared contracts | Domain types and ambient declarations |
| `src/lib/` | Small generic utilities | Helpers that do not belong to a feature or domain service |

The feature folders use a public entrypoint so the shell imports stable feature APIs rather than implementation files.

```text
src/features/
  editor/
    components/       # CodeInput, LanguagePicker, markup lint, preset drawer
    hooks/             # useSceneEditor: scene mutation adapter
    index.ts           # public editor API
  preview/
    components/       # CanvasPreview and workspace UI
    index.ts
  export/
    components/       # ExportPanel and aspect-ratio UI
    index.ts
  animation/
    components/       # AnimationPanel
    index.ts
  style/
    components/       # Background, theme, typography, chrome, skin, brand controls
    index.ts
  projects/
    components/       # ProjectManager
    index.ts
```

## Dependency Boundaries

The architecture follows a one-way dependency direction. UI primitives do not know about features. Feature UI may consume public service functions, state selectors, static data, and shared types, but the application shell is responsible for composing features and supplying cross-feature context. Domain services do not import React components or Zustand stores.

| Layer | May depend on | Must not depend on |
| --- | --- | --- |
| `ui` | React, styling utilities, Radix primitives | Features, stores, persistence, services |
| `features` | `services`, `state`, `persistence`, `data`, `types`, `ui`, `lib` | Application entrypoint internals |
| `services` | `types`, `data`, generic browser APIs where required | React UI, feature components, Zustand stores |
| `state` | `types`, `data`, `persistence` where store hydration requires it | Feature components |
| `persistence` | `types`, Dexie, browser storage APIs | React components |
| `shell` | Feature public APIs, state, persistence, services, data, UI | Feature implementation internals where a public entrypoint exists |

The `@/*` alias remains supported for compatibility. Explicit aliases are also available for new code: `@features/*`, `@services/*`, `@state/*`, `@ui/*`, `@shell/*`, and `@types/*`. TypeScript and Vite resolve the aliases consistently.

## Runtime Composition

`src/App.tsx` is now a composition root rather than a scene mutation service. It selects the current project and scene, resolves the canonical `SceneRenderModel`, invokes `useApplicationRuntime`, obtains scene callbacks from `useSceneEditor`, and lays out the desktop and mobile surfaces.

`useSceneEditor` owns all scene mutation semantics. It preserves markup while the user edits visible source, merges nested typing/style/presentation/audio/animation settings, and applies project-level aspect-ratio changes. Components therefore receive focused callbacks and do not need to know how the store identifies the current scene.

`useApplicationRuntime` owns application bootstrap concerns. It hydrates IndexedDB projects and custom visual assets, restores the selected skin, synchronizes skin CSS variables, registers autosave, and publishes the canonical timeline to the playback store. These effects are intentionally outside feature components because they coordinate the whole application.

```text
App
├── project/theme/skin state selection
├── resolveSceneRenderModel(project, scene, skin)
├── useApplicationRuntime(...)
├── useSceneEditor(...)
└── feature public APIs
    ├── editor
    ├── preview
    ├── style
    ├── animation
    ├── export
    └── projects
```

## Canonical Rendering Rule

All visual surfaces must continue to derive from the same resolved model:

```text
Project + Scene + UISkin + FPS
        │
        ▼
resolveSceneRenderModel(...)
        │
        ▼
SceneRenderModel
   ├── CodeInput appearance
   ├── CanvasPreview model
   ├── ExportPanel model
   └── render worker/exporter options
```

A feature may add controls or orchestration, but it must not reconstruct appearance, framing, timeline, or animation state independently. Changes to visual behavior belong in `src/services/render`, `src/services/timeline`, or `src/services/animation` and should be consumed by every output surface through the canonical model.

## Worker and Deployment Constraint

The project remains a single frontend deployment. `src/workers/render.worker.ts` stays a Vite worker entrypoint, and the export coordinator continues to construct it with `new URL('@/workers/render.worker.ts', import.meta.url)`. This keeps worker bundling compatible with Vite while preserving off-main-thread frame rendering.

## Validation Contract

The refactor is considered safe when all of the following remain true:

| Check | Purpose |
| --- | --- |
| `npx tsc -b` | Type-safe module boundaries and worker imports |
| `pnpm lint` | Consistent source quality and unused-import protection |
| `pnpm build` | Valid single-bundle production output |
| `node tests/animation-regression.mjs` | Deterministic animation and playhead behavior |
| `node tests/parity-regression.mjs` | Editor/canvas skin parity and export behavior |
| `node tests/academy-regression.mjs` | Khwarizm Academy visual contract |
| `node tests/workspace-audio-regression.mjs` | Canvas workspace and sound controls |
| `node tests/export-media-probe.mjs` | Playable MP4 and WebM media output |

## Adding New Code

New user-facing behavior should begin in the appropriate feature folder. Put React components and feature-specific hooks there. If the behavior is reusable without React, place it in the corresponding service. If it persists across reloads, use a repository in `src/persistence`; if it is built-in and immutable, use `src/data`; if it is ephemeral application state, use `src/state`.

Avoid adding new imports from feature implementation paths to `src/App.tsx`. Export the intended surface from a feature `index.ts` and consume that public API from the shell. Keep the `@/*` alias for compatibility, but prefer the explicit aliases when the dependency direction would otherwise be unclear.
