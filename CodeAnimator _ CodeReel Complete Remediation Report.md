# CodeAnimator / CodeReel Complete Remediation Report

**Author:** Manus AI  
**Audit date:** 17 August 2026  
**Audited repository:** `AhmedAl-Bahrawy/CodeAnimator`  
**Audited commit:** `965ffc5c4eef4ae0641317d4f2d6947ae195413c`  
**Commit subject:** `feat: complete CodeReel core pipeline, rendering, export, and theming`  
**Scope:** Full repository review, source inspection, baseline validation, running-application inspection, and comparison with the supplied code-animation and terminal-recording references.

> **Executive conclusion:** The repository is a promising visual prototype with a useful domain model, a broad theme catalog, a working editor shell, and the beginnings of a deterministic timeline architecture. It is not yet a reliable code-to-video product. The highest-risk defects are in the animation contract, scene/theme propagation, renderer integration, export validity, and responsive layout. Several features are represented by types or data entries but are not connected end-to-end. The project should be treated as a pre-alpha implementation that requires a core-pipeline correction before additional themes or cosmetic controls are added.

## 1. Audit outcome at a glance

The project currently demonstrates the following successfully: a Vite/React application starts; a code editor is mounted; a canvas preview is present; theme cards are displayed; a basic timeline slider exists; and the application can construct a simple typing timeline from a clean source. These are valuable foundations.

However, the repository does not currently meet the stated product promise of a professional, mobile-safe code-animation studio. The baseline validation is already failing before functional acceptance can be considered. TypeScript reports `TS5101` for the deprecated `baseUrl` compiler option. ESLint reports **22 problems: 19 errors and 3 warnings**. The production build invokes `tsc -b` and therefore fails on the same TypeScript configuration error. There is no meaningful automated test suite: the repository scan found no unit or integration test files, with `src/components/export/AspectRatioSelector.tsx` being a component filename rather than a test.

| Area | Current assessment | Severity | Why it matters |
|---|---|---:|---|
| Build and code health | Failing TypeScript build and lint | Blocker | CI and production builds are not trustworthy. |
| Animation semantics | Timeline builder and evaluator disagree on line breaks, markup timing, and visible-state rules | Blocker | Preview and export can show different or incorrect frames. |
| Renderer integration | Shiki token output is not passed to the canvas; renderer contains unused parameters and hardcoded metrics | Critical | Syntax highlighting and style controls cannot reliably affect output. |
| Scene/theme state | Preview and export use the global theme rather than the scene theme | Critical | Editing or loading a scene can render/export the wrong theme. |
| Export | GIF path is mislabeled as WebM; no actual universal fallback; browser-specific paths are not validated | Blocker | Downloads can have the wrong extension or fail to play. |
| Aspect ratio and responsive design | Preview is hardcoded to 1080×1920; project aspect-ratio fields are not used in the visible pipeline | Critical | Desktop, landscape, square, custom dimensions, and mobile workflows are incomplete. |
| Controls and direct manipulation | Many controls are cosmetic or disconnected from renderer state | Critical | Users cannot predict what will affect the result. |
| Persistence | Persistence helpers exist, but autosave/recovery and several custom-data flows are not wired end-to-end | High | Work can be lost and project portability is weak. |
| Presentation/share workflow | No complete cinema mode, portable share URL, replay/remix flow, or embeddable player | High | The product lacks a polished presentation and distribution surface. |
| Accessibility and QA | No evidence of keyboard, screen-reader, reduced-motion, or cross-browser acceptance tests | High | Mobile and professional use will remain fragile. |

## 2. Product intent and external benchmark baseline

The requested product is not merely a syntax-colored editor. It is a local-first animation studio for producing attractive code and terminal videos across mobile, social, presentation, and documentation contexts. The reference set establishes a recognizable feature baseline.

Zlvox emphasizes client-side rendering, typewriter animation, auto-scroll, multiple syntax languages, 9:16 social output, 1080p/2K resolutions, 30/60 FPS, and WebCodecs-backed deterministic recording.[1] No Tools Left Behind adds horizontal and vertical orientation, branding, typing-speed choices, one-click recording, automatic stop behavior, and a maximum-duration guard.[2] Terminalizer separates recording, editable recording data, replay, GIF rendering, web-player generation, and sharing.[3] TerminalScreens emphasizes typing modes, line numbers, cursor toggling, looping, presentation mode, and copying either source or displayed state.[4]

The more advanced terminal references provide the strongest direction for the missing architecture. termgif supports multiple output formats, live and simulated modes, watch mode, templates, trimming, speed adjustment, captions, watermarks, TUI support, and Asciinema import/export.[5] VHS provides a human-editable declarative tape format with output targets, settings, typed actions, key presses, sleeps, visibility controls, screenshots, environment variables, themes, margins, window bars, border radius, frame rates, playback speed, loop offsets, and cursor behavior.[6] Jasper Bernaers’ Terminal Text Animator adds markup commands, CRT/glitch effects, matrix intros, typing sounds, hash-based share links, cinema mode, remixing, WebM/GIF output, 16:9/9:16/1:1 ratios, templates, and explicit mobile support.[7]

> The important comparison is not the number of theme cards. It is the completeness of the **authoring-to-replay-to-export-to-share contract**. CodeAnimator currently has many declared concepts, but the critical path is not yet coherent.

## 3. Repository architecture and current strengths

The repository has a sensible high-level decomposition. `src/core/types.ts` defines timeline events, canvas state, typing configuration, scene/project models, themes, backgrounds, export options, UI skins, brand kits, and Shiki token structures. The application separates stores, editor components, preview components, render layers, markup parsing, timeline construction, exporters, persistence, and data catalogs. That structure is suitable for a professional implementation if the boundaries are made authoritative rather than duplicative.

The strongest architectural assets are the following. First, the `TimelineEvent` model can support deterministic replay if all state-changing actions are represented consistently. Second, the project model already has scene-level code theme, background, chrome, typing, brand-kit, and aspect-ratio fields. Third, the renderer is already split into background, chrome, code, cursor, highlight, and effect concepts rather than being one unmaintainable draw function. Fourth, the catalog approach makes it possible to ship many curated presets without hardcoding them into UI components.

The primary architectural weakness is that the declared model is ahead of the actual data flow. The same concept is stored in multiple places, then selectively bypassed. `CanvasPreview` owns a local timeline while `timelineStore` also owns timeline state. Preview reads the global theme store while scenes have `codeThemeId`. The project model stores aspect ratio and custom dimensions while preview and export primarily select dimensions from a platform-preset dropdown. Shiki exposes token structures while the canvas receives `tokenLines: null`. These are not isolated bugs; they are signs that the project lacks one authoritative render-state pipeline.

## 4. Reproducible baseline validation

The following checks were run against the audited commit after dependency installation.

| Check | Result | Evidence |
|---|---|---|
| Dependency installation | Completed | `npm ci --no-audit --no-fund` installed 300 packages. |
| Type check | Failed | `tsconfig.app.json:26` reports deprecated `baseUrl` option `TS5101`. |
| Lint | Failed | 22 problems: 19 errors and 3 warnings. |
| Production build | Failed | `npm run build` runs `tsc -b && vite build`, so it stops on `TS5101`. |
| Automated tests | Not found | No meaningful test files were found outside dependencies. |
| Dev server | Started | The app served at `http://localhost:5173/`. |
| Initial visual inspection | Partially successful | The rendered app became visible after a blank-looking initial frame; no startup exception appeared in the visible console output. |

The lint failures are not merely stylistic. They identify state-flow risks: refs are mutated during render in both `CodeInput.tsx` and `CanvasPreview.tsx`; `CanvasPreview.tsx` sets local state synchronously in an effect; several controls and stores contain unused variables; and dependency warnings indicate potentially stale scene or language values. Until the build and lint baseline is green, later visual fixes will be difficult to validate reliably.

## 5. Critical findings by subsystem

### 5.1 Timeline and animation semantics

The timeline is the most important correctness boundary and currently has several contract violations.

`buildTimelineFromSource.ts` constructs typing events from the stripped source. In character mode it emits a `type-char` per character and later emits a newline as another `type-char` at the end of each line. In word mode it splits a line using `/ (\s+)/`-equivalent behavior and emits whitespace as a separate `type-word`. In line mode it emits an entire line at once. The evaluator, `getStateAtTime.ts`, treats `type-char` as a character assigned into a line buffer, but it does not implement newline semantics. A newline is written at column `line.length` in the existing line buffer rather than advancing to the next source line. Consequently, the timeline’s representation of line transitions and the evaluator’s representation of visible lines can diverge.

The evaluator’s visible-line logic is also internally contradictory. It starts with all source lines in `state.visibleLines`, then builds a shortened list of typed lines, and finally restores the full source when no type event has occurred. This means the initial state is fully visible, while a state only a fraction into the first event can suddenly become a partially constructed view. That may be intentional for a code editor, but it is not a documented product rule and is incompatible with a normal typewriter animation where the initial frame should be an empty or explicitly configured state. The behavior is especially problematic for a recorded first frame because preview and export may begin from different assumptions.

Markup timing is not deterministic. The parser creates all markup events with `tMs: 0`, then the timeline builder inserts them at the start time of the markup line. For pauses, `timeShift` is accumulated, but only later markup insertion times are shifted. Existing typing events after the insertion point are not shifted by the pause. The comment says that a pause shifts subsequent events, but the implementation only changes a local offset used when placing future markup events; it does not move already-created typing events. In a source with a pause on an early line, the pause can overlap the typing timeline rather than extending it.

Markup ordering is also unstable when several events share a timestamp. Events are sorted only by `tMs`, so a `pause`, `set-highlight`, `set-speed`, or `scene-transition` with the same time as a typing event has no explicit ordering guarantee. A deterministic engine needs a sequence number or phase ordering, such as `state-before-frame`, `content`, `effects`, and `state-after-frame`.

The `speed` token is applied only when `buildTimelineFromSource` finds the first matching speed event for a line. It does not support multiple speed changes inside a line or on a token boundary. More importantly, `getStateAtTime` reports `state.typingSpeed`, but the builder does not emit a speed event for each effective source interval; therefore the evaluated state cannot necessarily describe the speed that produced the current frame.

Several declared event types are not implemented end-to-end. `delete-char`, `clear-highlight`, and `clear-focus` exist in the type union but are not produced by the parser. `beep` is parsed as a token but converted to `null`, so it has no timeline event and cannot trigger sound. `glitch` is converted into a small zoom change rather than a glitch effect. `scene-transition` is ignored by the evaluator. `cut` is ignored by the evaluator and the builder comment claims it is already applied without actually establishing a scene transition contract. `scroll-to` is evaluated but the application does not provide a complete authoring path to generate it.

The cursor model is incomplete. `cursor-jump` changes the cursor position, but `renderFrame` receives no direct cursor-blink phase configuration derived from the timeline. Cursor style exists in `TypingConfig`, but its use in the canvas must be verified against the renderer; the current pipeline does not show a complete link between scene cursor settings and drawing behavior. Cursor positions also do not normalize newline transitions correctly.

**Required fix:** create a single timeline compiler that converts source plus markup into an ordered, immutable event stream with stable sequence numbers, explicit duration effects, and scene transitions. The compiler must be tested with golden timelines. The evaluator must replay the same event stream for preview, export, thumbnails, seeking, and share-mode playback. No code path should build a second interpretation of the animation.

### 5.2 Markup parser and extraction

The parser recognizes the syntax `[[token:value]]`, while the Jasper reference uses human-readable line markup such as `[pause 2]`, `[clear]`, `[slow]`, `[fast]`, `[speed 30]`, `[glitch]`, and `[beep]`.[7] The repository specification may intentionally choose double brackets, but the user-facing product should either support both syntaxes or provide a documented canonical syntax with an editor toolbar and clear inline diagnostics. At present, the parser’s contract is not visible in the editor as a discoverable language.

The parser’s regular expression only matches tokens composed of letters followed optionally by a colon and characters until `]`. It does not support spaces in values, quoted text, escaped brackets, nested content, or command arguments beyond the narrow patterns. It strips markup using `/\[\[[^\]]+\]\]/g` and then calls `.trimEnd()` on every line. That alters user source by removing intentional trailing whitespace. For ordinary code this may be acceptable, but for terminal sessions, alignment-sensitive ASCII art, heredocs, and whitespace demonstrations it is destructive.

Invalid tokens are retained in the original line until the final stripping pass. Because the final stripping pass removes any bracketed token shape regardless of whether parsing succeeded, invalid markup can silently disappear from the displayed code while also producing an error. A robust editor should preserve invalid source, visually mark the exact token, and provide a safe “render without markup” behavior distinct from “strip markup from source.”

The parser reports line and column positions, but the report path into CodeMirror is not established in the reviewed integration. The project needs diagnostics that use the editor’s decoration API, not only a generic list or console message. The parser should return a source map from clean-source offsets to original-source offsets so that highlights, selections, export previews, and error locations remain accurate after markup is removed.

Markup extraction should also support a lossless project representation. The source with directives, clean display source, parsed event list, and source-map metadata should be separate fields or a versioned intermediate representation. Re-parsing the entire source on every frame, as `CanvasPreview.tsx` currently does, is inefficient and creates opportunities for preview/export divergence.

### 5.3 Preview, rendering, and syntax highlighting

The preview component hardcodes `canvasWidth = 1080` and `canvasHeight = 1920` at `CanvasPreview.tsx:36-37`. It uses a portrait canvas regardless of the project’s `aspectRatio`, `customWidth`, and `customHeight` fields. This is the direct cause of the project’s central requirement failure: landscape and square formats cannot be previewed faithfully, and custom dimensions cannot be validated before export.

The component stores a local timeline in state and separately uses the global timeline store. The local timeline is rebuilt in an effect, while playback time is stored globally and is updated through `seek()` on every animation frame. This creates duplicate ownership and unnecessary React updates. It also permits a race: the scene can change, the global current time can remain outside the new timeline’s duration, and the local timeline can be rebuilt one render later. The correct approach is a scene-keyed compiled timeline cache with one source of truth.

`CanvasPreview` reads `currentTheme` from `useThemeStore` instead of using `currentScene.codeThemeId`. This makes the scene model’s theme selection unreliable. Loading a scene, changing projects, or exporting a scene can display one theme in the editor while the scene’s stored theme says another. `ExportPanel.tsx` has the same defect: it selects a global theme rather than the current scene’s `codeThemeId`.

The preview calls `parseMarkup()` inside `renderFrameAt()` on every draw and passes `tokenLines: null` to `renderFrame`. This means the Shiki integration is not feeding the canvas preview. The editor can show syntax highlighting while the rendered video uses a separate or reduced coloring path, which directly violates the expected “what you see is what you export” behavior. The `CanvasState.tokens` field is never meaningfully populated by the reviewed evaluator, despite the renderer and type model providing token structures.

The animation loop updates the Zustand store by calling `seek(newTime)` on every `requestAnimationFrame`. This is a high-frequency global state update that can cause application-wide React rerenders at display refresh rate. It is also unnecessary: a render clock can keep time in a ref and publish UI progress at a lower cadence, while the canvas is drawn directly. The current implementation also mutates refs during render at lines 33-34, which ESLint correctly rejects. The time loop uses `startOffset` as a `let` even though it is never reassigned, a smaller correctness signal.

The preview scale is computed from the container’s size and the hardcoded portrait dimensions. In the observed desktop view the rendered code window is visibly small and sits low in a large unused dark stage. The UI is technically present, but the composition does not use the available preview area well. This suggests that the preview should separate a fitted stage from the output canvas, calculate the fit from the chosen aspect ratio, and show a visible safe area or crop boundary.

The rendering API uses `RenderContext` with `width`, `height`, `state`, theme, background, chrome, frame index, and FPS, but the current code path has unused dimensions and unused layer parameters according to lint. That is evidence that effects and typography controls are not fully connected. A renderer contract should make every parameter observable in output or remove it until the feature exists.

### 5.4 Canvas layers, shapes, effects, and style application

The renderer layer file contains unused `width`, `height`, `visibleLines`, and `ctx` parameters flagged by lint. These are not harmless cleanup items because they indicate that layer functions have signatures for responsibilities they do not perform. A professional renderer should have explicit layer contracts: background receives output bounds and time; chrome receives window bounds and chrome config; code receives tokenized lines, typography metrics, cursor state, focus state, and highlight state; effects receive deterministic frame time and seed; branding receives brand-kit data and safe-area bounds.

Typography controls define a local `TypographySettings` interface and emit patches, but the reviewed overview confirms no store connection and no persistence. `App.tsx` passes hardcoded settings and a no-op handler. The controls therefore imply customization that does not alter the output. Font family, font size, line height, and letter spacing must be stored in scene or project state, passed to the renderer, measured with the actual selected font, and included in export configuration.

The window chrome model includes macOS, Windows, terminal, and none; title; radius; shadow; padding; margin; and margin fill. The renderer needs to honor all these values consistently in preview and export. The observed output looked like a dark code window, but the current control and data-flow audit does not establish that all style values change the canvas. Each control needs a visual regression test and a state-to-pixel test.

Background types include gradient, solid, image, mesh, and animated. The renderer must make a clear capability distinction: a static gradient can be sampled deterministically; an image needs asset loading and export readiness; a mesh needs a deterministic shader-like function; animated backgrounds need a frame-time input and an export policy. The current model has `animated?: boolean`, but the reviewed pipeline does not show a complete asset, timing, or cancellation contract. An animated background that uses wall-clock time will differ between preview and export unless it receives the virtual timeline time.

The `glitch` markup command currently maps to a `zoom` event at level `1.02`. That is not a glitch effect. A glitch should be a bounded, deterministic effect with displacement, color-channel separation, scanline interruption, or noise seeded from frame index. The same applies to CRT scanlines, flicker, glow, and matrix-rain effects: they need explicit parameters, stable frame-time behavior, and reduced-motion handling.

### 5.5 Export pipeline and downloaded output

The export path contains the most severe user-facing defects.

`ExportPanel.tsx:82` downloads a GIF selection using the extension `.webm` because it uses `format === 'gif' ? 'webm' : format`. Unless the GIF exporter unexpectedly returns a WebM blob, this produces a file whose name and MIME/container disagree. Even if the bytes are valid, users and operating systems will misidentify the asset. This is a release-blocking defect.

`selectExporter.ts` chooses the GIF exporter for GIF, WebCodecs for every non-GIF format when supported, and MediaRecorder otherwise. There is no `ffmpeg-wasm` implementation even though `ExportTier` declares it. The “last resort” returns `mediaRecorderExporter` even if it is unsupported, so the app can present an export action that is guaranteed to fail. The UI’s pipeline badge is informational rather than capability-safe.

The WebCodecs exporter must produce a real container, not merely encoded elementary frames. WebCodecs’ `VideoEncoder` generates encoded chunks; a playable MP4 requires a correct muxer with codec configuration, timestamps, keyframes, and metadata. A playable WebM requires correct WebM/EBML muxing. The audit should treat container validity as unproven until the exporter is tested by inspecting MIME signatures and opening output with a media parser or `ffprobe` equivalent. The export contract must distinguish `video/mp4`, `video/webm`, and `image/gif` and return a blob whose type matches the selected format.

The MediaRecorder fallback captures a real-time stream and therefore is vulnerable to dropped frames, timer throttling, background-tab suspension, and inconsistent playback speed. It should be labeled as real-time capture and should not be presented as equivalent to virtual-time deterministic export. If the product promises pixel-perfect frame output, a frame-by-frame renderer must be used for deterministic paths, with MediaRecorder only as an explicitly lower-fidelity compatibility option.

The `playbackSpeedMultiplier` is passed to exporters, but the timeline itself is built without applying it, and the preview playback loop does not use it. This creates a UI control that may not change output. The correct semantics should be documented: either speed modifies timeline duration by scaling event times, or it modifies the clock at export/playback time. The same definition must apply to pause durations, cursor blink, background animation, sound markers, and scene transitions.

The export UI only exposes fixed platform presets, format, 30/60 FPS, and a speed slider. The project model supports custom dimensions, but no custom width/height controls are shown. There are no quality or bitrate controls, no loop or duration guard, no export preview metadata, no estimated file size, no watermark/branding options, no audio policy, no caption or subtitle export, no frame-sequence export, and no shareable player export. These are not all mandatory for version one, but the product brief explicitly asks for extensive customization and the supplied references establish several as expected.

The export operation does not visibly validate that the selected preset, source length, or code dimensions are compatible. A long source can overflow the code window, exceed a social platform’s practical duration, or produce unreadably small text. Export should perform a preflight report that reports output dimensions, duration, line count, maximum line width, font fit, browser capability, and warnings before starting.

The cancellation path passes an `AbortSignal`, but every exporter must honor it and release encoder, stream, worker, object URL, and canvas resources. The panel calls `cancelExport()` in the catch block, which may conflate user cancellation with export failure. User cancellation should have a distinct status and should not be shown as an error.

### 5.6 State management, persistence, and project lifecycle

The project model contains scenes and settings, but state boundaries are inconsistent. Theme, skin, and export stores are separate from project data even though output-relevant values must be scene-specific or project-specific. Global UI skin state is appropriate for the application shell; code theme, background, chrome, typography, and output dimensions are not global if scenes can differ.

`autosave.ts` implements a debounced helper that hashes a serialized project and calls `saveProject`, but the audit found no complete subscription or startup-recovery wiring in the application. The module-level `lastSavedProjectId` and `lastSavedHash` are flagged as unused, which reinforces that the helper is scaffolding rather than an active lifecycle. The application needs a store subscription, debounce and flush on unload, recovery on startup, and a visible save state.

`ProjectManager.tsx` loads projects on mount and can save or delete, but the broader project lifecycle requires explicit handling for current-project changes, current-scene changes, unsaved edits, duplicate names, corrupt records, schema migration, and empty states. IndexedDB persistence should be versioned. A project archive should include source, markup, timeline schema version, custom themes, custom skins, brand assets, background assets, and export defaults.

The repository contains `exportImportArchive.ts`, theme and skin repositories, and brand-kit concepts, but the UI audit did not establish a complete user-facing import/export path for all data. The report should not treat the existence of a helper as feature completion. Every repository function needs an integration test that starts from a fresh browser context, saves data, reloads, imports or exports, and verifies a pixel- or state-equivalent result.

### 5.7 User interface, direct manipulation, and presentation mode

The running application shows a dense three-region desktop interface with editor, preview, and a long right-side catalog. The center stage leaves substantial unused space while the output window is small. Theme cards have small labels and controls; this is manageable with a mouse at desktop width but is not a strong touch/mobile interaction model.

The product asks for direct changes in the presentation. The current application has a preview and a timeline slider but no complete presentation-mode authoring surface. There is no visible scene track with cuts, pause blocks, highlight blocks, focus blocks, scroll markers, or transition handles. The user cannot directly see which markup event is responsible for an effect. A professional editor should offer both a text/markup authoring mode and a timeline mode, with bidirectional selection: selecting a timeline event highlights its source directive, and selecting a directive focuses its timeline interval.

There is no complete cinema mode or clean presentation view in the reviewed application. A presentation mode should hide editor chrome, fit the chosen output ratio to the viewport, provide play/pause/replay, optionally request fullscreen and audio permission, and expose a “Make a copy” or remix action when a share link is opened. The Jasper reference explicitly demonstrates cinema mode, replay, remix, and share behavior.[7]

The project also needs stronger interaction affordances. Buttons and tabs require accessible names and selected states. The range input should expose a formatted time value and keyboard semantics. Theme cards should show focus outlines, current selection, contrast information, and a preview that does not require tiny labels. On mobile, the editor, preview, controls, and theme gallery should become navigable sections or a bottom-sheet workflow rather than remain three narrow columns.

### 5.8 Mobile and responsive behavior

The hardcoded 1080×1920 canvas does not itself prevent responsive display, but it prevents responsive correctness. The product must support at least 9:16, 16:9, and 1:1 output, with custom output dimensions if the data model promises them. Preview fitting must use the selected project output dimensions; export must use the same dimensions; safe areas must be visualized; and text metrics must be recomputed for each size.

The current desktop screenshot shows a right-side theme gallery with many cards and a dense top bar. Without a mobile-specific layout mode, the likely failure modes are horizontal overflow, inaccessible tabs, compressed code input, tiny touch targets, and an export panel that is difficult to reach after scrolling. The mobile acceptance target should cover 320px, 375px, 414px, and tablet widths, in both portrait and landscape. It should also cover virtual keyboard behavior, safe-area insets, orientation changes, and touch dragging on the timeline.

Mobile export has additional constraints. Browser support for WebCodecs is uneven, and real-time MediaRecorder may be interrupted by device power or background policies. The UI should provide capability detection, an estimated export cost, a clear fallback, and a recovery path. If a device cannot render a requested resolution or FPS, the application should offer a lower preset rather than failing after a long export.

### 5.9 Syntax highlighting and language support

`src/core/highlighting/shiki.ts` declares a theme map that lint marks unused. This indicates that the highlighting service is not integrated into the render path. The editor can appear highlighted through CodeMirror while the output renderer uses plain text or a separate hardcoded token system. This is a direct “preview differs from export” risk.

The language selector currently exposes JavaScript in the observed app, but the product requires broad language coverage. The system needs a language registry that maps each user-facing language to editor support, Shiki grammar, tokenization fallback, file extension, and validation behavior. At minimum, the reference baseline suggests JavaScript, Python, CSS, HTML, PHP, Bash, SQL, and YAML.[1] [4]

Highlighting must be calculated once per source/theme/language combination and cached. The resulting token lines should be stored or memoized as render input. Markup stripping must preserve source offsets so that token colors remain aligned after directives are removed. Long lines and tabs need explicit width policy. The renderer should use measured glyph metrics rather than assuming character width.

### 5.10 Accessibility, performance, and security

The audit found no meaningful automated accessibility or performance suite. The application should be tested with keyboard-only navigation, screen readers, high contrast, reduced motion, and touch. Canvas content needs an accessible textual representation or a live region that exposes the current displayed code and playback state. Decorative effects should not be the only communication channel for focus or errors.

Rendering should avoid updating global React state at display refresh rate. Large source files require virtualization or bounded rendering. Shiki and image assets should be lazy-loaded. Theme galleries should use virtualization or grouped filtering rather than rendering every card into one long panel. Export should run in a worker where possible and should use transferable frame data rather than blocking the UI thread.

The local-first requirement is a strength, but import and image handling still require security hardening. Uploaded assets should be validated by type and size, object URLs revoked, and SVG or HTML-like data sanitized if rendered. Shared hash links must have a size limit, version field, compression strategy, and safe decoding path. A malformed or oversized link must not freeze the app.

## 6. Detailed issue register

The following register is the recommended engineering backlog. IDs are stable enough to reference in implementation tickets.

| ID | Severity | Area | Evidence | Defect | Required correction |
|---|---|---|---|---|---|
| BLK-01 | Blocker | Build | `tsconfig.app.json:26`; baseline output | TypeScript build fails on deprecated `baseUrl`. | Replace the alias configuration with current `paths`/tooling or add a temporary deprecation policy; make `npm run build` pass on the supported TypeScript version. |
| BLK-02 | Blocker | Export | `ExportPanel.tsx:82` | GIF selection downloads with `.webm` extension. | Use MIME-aware filenames and assert blob type before download. |
| BLK-03 | Blocker | Export | `selectExporter.ts:6-12` | Unsupported non-GIF export falls back to an unsupported MediaRecorder exporter. | Add capability-safe selection with a real compatible fallback or disable the format with an explanation. |
| BLK-04 | Blocker | Timeline | `buildTimeline.ts:83-111` | Pause time does not shift already-built subsequent typing events. | Compile events in one ordered pass or shift all affected events after every duration event. |
| BLK-05 | Blocker | Rendering | `CanvasPreview.tsx:93-95` | Canvas receives `tokenLines: null`; Shiki is disconnected. | Compile token lines and pass them to preview and export through one render-state object. |
| BLK-06 | Blocker | State | `CanvasPreview.tsx:23-25`; `ExportPanel.tsx:33` | Global theme is used instead of scene `codeThemeId`. | Resolve theme by scene ID and make global theme state UI-only or remove it. |
| CRI-01 | Critical | Aspect ratio | `CanvasPreview.tsx:36-37` | Preview is always 1080×1920. | Derive dimensions from project aspect ratio/custom size and share the same resolver with export. |
| CRI-02 | Critical | Timeline | `getStateAtTime.ts:33-160` | Newline events do not advance line state correctly; initial state and partial state rules conflict. | Define a canonical text buffer model and add golden replay tests. |
| CRI-03 | Critical | Markup | `parser.ts:98` | Parser strips invalid markup and trims trailing whitespace. | Preserve source losslessly; maintain clean-source mapping and inline diagnostics. |
| CRI-04 | Critical | Markup | `parser.ts:143-146` | `glitch` is implemented as zoom; `beep` is discarded. | Add real deterministic effect/audio marker events or remove unsupported claims. |
| CRI-05 | Critical | Playback | `CanvasPreview.tsx:106-114` | Every animation frame updates global Zustand time. | Move the render clock outside global React state and throttle UI progress updates. |
| CRI-06 | Critical | Styles | `TypographyControls.tsx`; `App.tsx`; `layers.ts` | Typography controls are not connected to scene/render configuration. | Store typography in scene settings and apply measured metrics in preview/export. |
| CRI-07 | Critical | Export | exporter implementations | WebCodecs path’s playable container validity is unproven; fallback fidelity differs. | Implement and test proper muxing, MIME output, frame timestamps, keyframes, and compatibility tiers. |
| CRI-08 | Critical | Export | `ExportPanel.tsx:48-50` | Project custom dimensions/aspect ratio are ignored in the UI path. | Add project-aware dimension resolver and custom-size validation. |
| CRI-09 | Critical | State | `timelineStore.ts`; `CanvasPreview.tsx` | Duplicate local/global timeline ownership. | Create one compiled timeline cache keyed by project, scene, source, settings, and markup version. |
| HIGH-01 | High | Persistence | `autosave.ts`; call-site scan | Autosave helper is not fully wired to store changes or recovery. | Subscribe to project changes, recover on startup, show save state, add schema migrations. |
| HIGH-02 | High | Presentation | App composition | No complete cinema/presentation mode or clean replay surface. | Add presentation route/mode with ratio fitting, replay, fullscreen, and remix/share actions. |
| HIGH-03 | High | Sharing | Repository feature model vs visible UI | No portable compressed share URL, versioned link decoder, or embedded player. | Add hash-based share model with size limits and safe decoding. |
| HIGH-04 | High | Mobile | Observed desktop layout; hardcoded portrait preview | Mobile workflow and touch-first layout are not established. | Implement breakpoint layout, bottom sheets, safe areas, touch timeline, and mobile export guidance. |
| HIGH-05 | High | QA | Repository scan | No meaningful automated tests. | Add unit, integration, browser, visual regression, and export-validity suites. |
| HIGH-06 | High | Accessibility | UI composition | No evidence of keyboard, reduced-motion, canvas alternative, or focus-state acceptance. | Add accessible semantics and automated axe/keyboard coverage. |
| HIGH-07 | High | Export UX | `ExportPanel.tsx` | No preflight warnings, duration guard, quality controls, or output metadata. | Add export settings and preflight validation before encoding. |
| HIGH-08 | High | Data portability | persistence helpers | Project archive does not appear to be fully surfaced or versioned in the visible workflow. | Implement versioned project package import/export including assets and custom presets. |
| MED-01 | Medium | Lint | Baseline output | 19 errors and 3 warnings obscure real regressions. | Make lint clean and enforce it in CI. |
| MED-02 | Medium | React correctness | `CodeInput.tsx:136`; `CanvasPreview.tsx:33-34` | Refs are mutated during render. | Update refs in effects or callbacks; use stable event handlers. |
| MED-03 | Medium | React performance | `CanvasPreview.tsx:51` | Synchronous setState inside effect causes cascading render. | Derive timeline with memo/cache or set only in controlled asynchronous compilation. |
| MED-04 | Medium | Themes | Theme catalog and long gallery | Themes exist as data but lack search/filter/favorites/contrast metadata. | Add catalog metadata and scalable browsing. |
| MED-05 | Medium | Backgrounds | Background type model | Image/mesh/animated background lifecycle is incomplete. | Add asset readiness, deterministic time, fallback, and cleanup contracts. |
| MED-06 | Medium | Language support | Shiki integration and selector | User-facing language registry is incomplete or disconnected from renderer. | Centralize language capabilities and fallback behavior. |
| MED-07 | Medium | Filename/MIME | `ExportPanel.tsx` | Filename is fixed and not project/platform descriptive. | Use sanitized project name, scene name, preset, and correct extension. |
| MED-08 | Medium | Error handling | Export catch path | Cancellation and failure are conflated; errors are generic. | Use typed errors and actionable recovery messages. |
| MED-09 | Medium | Asset safety | Image/background/import paths | Asset type/size/sanitization policy is not explicit. | Validate assets and revoke object URLs. |
| LOW-01 | Low | Maintainability | `layers.ts` unused parameters | Renderer signatures contain dead inputs. | Refactor layer contracts and add renderer documentation. |
| LOW-02 | Low | UI polish | Theme cards and dense shell | Labels and controls are too small and not optimized for touch. | Improve card density, hit targets, focus styles, and grouping. |
| LOW-03 | Low | Documentation | README/spec vs implementation | The product contract does not clearly distinguish shipped, experimental, and planned features. | Add a capability matrix and a versioned feature status document. |

## 7. Missing features that should be added

The project already has enough type concepts to support a strong product, but the feature set needs to be completed in a deliberate order. The following additions are recommended rather than optional decoration.

### Authoring and animation

The editor should support character, word, line, paste-instant, and scripted terminal modes. A structured timeline should allow explicit pauses, speed changes, clear-screen actions, cursor jumps, focus, line highlights, scroll positions, cuts, scene transitions, and effect markers. Markup should be complemented by a visual command palette so users do not need to memorize syntax. A marker list and timeline track should show the exact duration and source location of every event.

A terminal mode should support prompt configuration, command execution simulation without executing arbitrary local commands, command output blocks, special keys, hide/show capture, screenshots, and safe deterministic playback. The simulation mode should be the default for browser safety. The references demonstrate that editable script formats are valuable, so CodeAnimator should provide an importable/exportable `.codereel` or `.tape`-like format with a version field.

### Themes, skins, and brand kits

Theme data should be split into code syntax theme, terminal palette, application UI skin, background, chrome, and brand kit. Each preset should declare contrast, supported languages, preview thumbnail, animation compatibility, and whether it is safe for export. Users should be able to duplicate a preset, edit it, save it, favorite it, and export it.

Brand kits should apply consistently to preview, export, presentation, and share mode. A brand kit needs watermark placement, scale, opacity, safe-area rules, logo validation, and default output settings. The current `BrandKit` model is a good start but must be connected to render state.

### Output and distribution

The product should support MP4/H.264 where the browser permits it, WebM/VP9 or AV1 where appropriate, GIF, animated WebP, APNG, PNG frame sequence, and a project archive. MP4/WebM/GIF need separate capability and quality profiles. Frame-sequence export is important for debugging and for users who want to finish editing in a desktop video editor.

A presentation mode should render only the composition, include replay, allow optional fullscreen, support keyboard shortcuts, and expose a clean share link. A hash-based share link can remain local-first, but it needs compression, size limits, schema versioning, and safe parsing. A web-player export would support embedding the animation in documentation or a course page without requiring the editor UI.

### Mobile and collaboration fundamentals

The editor needs a mobile mode with a single-column flow, tabs or bottom sheets, persistent preview controls, large touch targets, and a compact timeline. It should support share-sheet invocation and maintain the selected aspect ratio through orientation changes. The app should clearly distinguish “edit on mobile,” “preview on mobile,” and “export on mobile” capability levels.

The project should also add local history/version snapshots, duplicate scene, reorder scene, scene thumbnails, undo/redo, autosave status, archive import/export, and recovery from interrupted export. Real-time collaboration is not required for the core product, but a versioned project file makes later collaboration possible.

## 8. Recommended target architecture

The implementation should be reorganized around a canonical intermediate representation rather than direct component-to-canvas calls.

```text
Source + Markup
      |
      v
Parser + Source Map + Diagnostics
      |
      v
Animation IR / Timeline Compiler
      |
      +--> Token Compiler (language + Shiki theme)
      |
      +--> Scene/Project Render Configuration Resolver
      |
      v
Canonical Frame State at virtual time T
      |
      +--> Canvas Preview
      +--> Deterministic Frame Exporter
      +--> MediaRecorder Compatibility Exporter
      +--> Presentation/Cinema Player
      +--> Thumbnail and Storyboard Generator
```

The `Animation IR` should contain a versioned source map, clean source, tokenized lines, ordered events, duration, scene boundaries, and warnings. Every event should have a stable ID, source location, start time, end time or instantaneous time, and sequence number. The state evaluator should be pure: given the IR and virtual time, it returns the same frame state on every platform.

The `RenderConfiguration` should be resolved once from project and scene state. It should include dimensions, aspect ratio, safe areas, typography, code theme, background, chrome, effects, brand kit, and export policy. Preview, exporter, player, and thumbnail rendering should consume the same configuration. Global stores should manage application UI state, not override scene render state.

The render loop should be split into two clocks. A high-resolution virtual render clock should drive canvas drawing and export. A lower-frequency UI clock should update the slider and time label. No `seek()` call should be required for every frame unless the store is intentionally a playback event log, which it is not in the current design.

## 9. Phased implementation plan

### Phase 0: Make the repository trustworthy

The first phase should correct TypeScript configuration, resolve all lint errors and warnings, establish a supported Node/TypeScript/browser matrix, and add CI commands for type check, lint, build, and tests. It should also remove or classify dead code and document which capabilities are experimental. No new visual feature should be accepted while the build is red.

**Exit criteria:** `npm run lint`, `npx tsc -b`, `npm run build`, and the initial test command all pass in a clean checkout.

### Phase 1: Correct the canonical animation engine

Implement a versioned parser result, source map, ordered event compiler, deterministic pause/speed semantics, newline-aware text buffer, scene/cut semantics, and pure state evaluator. Add golden tests for empty source, one line, multiple lines, spaces, Unicode, pauses, speed changes, highlight/focus, clear, cut, and seeking backward and forward.

**Exit criteria:** Given the same project and virtual time, preview state and export state are byte-for-byte equivalent for the same frame configuration.

### Phase 2: Unify render configuration and renderer integration

Resolve scene theme, language, typography, dimensions, backgrounds, chrome, effects, and brand kit through one function. Integrate Shiki or a reliable fallback into the frame renderer. Replace hardcoded 1080×1920 values. Measure text using the selected font and calculate fit, scroll, clipping, and safe areas from the output dimensions.

**Exit criteria:** Changing any output-affecting control changes the preview and the exported frame; changing the active scene cannot leak global theme settings.

### Phase 3: Build a real responsive editor and presentation surface

Create desktop, tablet, and mobile layouts. Add a storyboard and event timeline. Make theme and skin catalogs searchable and touch-friendly. Add presentation/cinema mode, fullscreen, replay, keyboard shortcuts, reduced-motion behavior, and accessible canvas alternatives.

**Exit criteria:** The primary editing flow works at 320px, 375px, 414px, tablet, and desktop widths without horizontal overflow or inaccessible controls.

### Phase 4: Replace export stubs with validated output paths

Implement a true deterministic frame exporter, correct MP4/WebM muxing, real GIF encoding, cancellation, worker execution, capability detection, quality profiles, and MIME-correct downloads. Add preflight warnings and output metadata. Keep MediaRecorder as a clearly labeled compatibility fallback rather than the universal path.

**Exit criteria:** Automated tests open each output format, verify its MIME/container signature, decode representative frames, confirm dimensions/FPS/duration, and verify cancellation cleans up resources.

### Phase 5: Add persistence, portability, and sharing

Wire autosave to project changes, add recovery and schema migrations, complete custom theme/skin/brand asset persistence, and create a versioned archive format. Add compressed hash sharing and a clean web-player/cinema route.

**Exit criteria:** A fresh browser context can import a project archive or shared link and reproduce the same scene state and frame output without server-side storage.

### Phase 6: Expand the preset and template ecosystem

Only after the core pipeline is correct should the project add more themes, terminal templates, social presets, educational templates, terminal scripts, captions, watermarks, and advanced effects. Each preset must be tested against all supported ratios and at least one mobile viewport.

**Exit criteria:** Every advertised preset has a valid preview, a valid export, readable text at its target dimensions, and a documented compatibility status.

## 10. Acceptance test matrix

| Test category | Minimum acceptance case | Expected result |
|---|---|---|
| Source parsing | Code containing markup, brackets, Unicode, tabs, and trailing spaces | Clean display source is correct; original source is preserved; diagnostics map to exact locations. |
| Timeline replay | Seek to every event boundary and arbitrary frame time | State is deterministic, line breaks and cursor position are correct. |
| Preview/export parity | Render the same virtual time through preview and exporter | Pixel-diff is within a documented tolerance. |
| Theme binding | Two scenes with different code themes | Switching scenes changes both preview and export theme correctly. |
| Typography | Change font, size, line height, and tracking | Canvas output changes and remains fitted without clipping. |
| Aspect ratios | 16:9, 9:16, 1:1, and custom dimensions | Preview and output share exact dimensions and safe-area behavior. |
| Markup controls | Pause, speed, focus, highlight, clear, cut, glitch, beep | Each command has a visible, documented, testable effect or is rejected clearly. |
| Export validity | MP4, WebM, GIF at 30 and 60 FPS where supported | Correct extension, MIME, dimensions, duration, and playable/decodeable bytes. |
| Cancellation | Cancel during a long export | Encoder/worker/resources are released; UI returns to idle with a cancellation message. |
| Persistence | Edit, close, reopen, recover | Latest saved project and scene are restored without silent loss. |
| Sharing | Encode/decode a project with a long source and custom settings | Link remains bounded or gives a clear size warning; decoded state reproduces output. |
| Mobile | 320px and 375px portrait, touch keyboard, export panel | No horizontal overflow; controls meet touch target; preview remains usable. |
| Accessibility | Keyboard-only flow and reduced motion | All controls are reachable, labeled, and effects respect user preference. |
| Performance | 500-line source and 60 FPS preview | UI remains responsive; frame rendering does not trigger full app rerender per frame. |

## 11. Recommended priority order for the next engineer

The next engineer should not begin by adding more themes. The correct order is: first make the build and lint checks pass; second replace duplicate timeline ownership with one deterministic compiler/evaluator; third fix scene-aware configuration and dimensions; fourth wire Shiki tokens and typography into the renderer; fifth implement and validate real exporters; sixth build responsive/presentation flows; seventh finish persistence and sharing; and only then expand the preset library.

The reason for this order is multiplicative. If the timeline is wrong, every animation mode is wrong. If the render configuration is split, every theme and style control is unreliable. If the exporter is not valid, every visual improvement fails at the product’s final user action. If the layout is not ratio-aware, mobile and social output remain broken no matter how attractive the theme catalog becomes.

## 12. Final recommendation

CodeAnimator should be continued, but the current branch should not be marketed as complete or used as the implementation handoff without a core-pipeline rewrite. The repository has a good product direction and several appropriate abstractions, yet it currently overstates completion through data catalogs and type definitions that are not connected to the actual render/export path.

A realistic release target is a staged beta: first deliver one reliable language, three aspect ratios, two typing modes, three themes, deterministic preview/export parity, valid WebM/GIF output, autosave, and a usable mobile layout. Then expand languages, themes, advanced effects, MP4, declarative scripts, sharing, and templates. This smaller vertical slice will expose the foundational issues early and create a stable base for the full professional studio requested in the brief.

## References

[1]: https://zlvox.com/tools/code-to-video "Zlvox — Code to Video Generator"

[2]: https://notoolsleftbehind.com/format/code-video-generator "No Tools Left Behind — Code Video Generator"

[3]: https://www.terminalizer.com/ "Terminalizer — Record, customize, render, generate, and share terminal recordings"

[4]: https://terminalscreens.com/tools/code-animation "TerminalScreens — Coding Animation Generator"

[5]: https://pypi.org/project/termgif/ "termgif — Terminal recording studio"

[6]: https://github.com/charmbracelet/vhs "Charmbracelet VHS — Your CLI home video recorder"

[7]: https://jasperbernaers.com/terminal-text-animator "Terminal Text Animator — Jasper Bernaers"

## Audit artifacts

The repository was not modified for implementation purposes. Audit notes are stored under `audit/`. The report is based on source inspection, the baseline command output, the running local application, and the public reference pages listed above. Untracked files already visible in the repository status are audit artifacts and source-count files, not product changes.
