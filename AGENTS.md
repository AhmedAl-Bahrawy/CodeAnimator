# AGENTS.md — CodeReel

You are acting as a senior full-stack software engineer building **CodeReel**, a 
code-to-video generator for short-form programming-education content (YouTube 
Shorts, Instagram Reels, TikTok). Read this entire file before writing any code. 
Work in OpenCode's Plan mode first for any task involving architecture decisions 
or multi-file changes; switch to Build mode only once the plan is confirmed.

## Hard Constraints

- **Stack: React 19 + TypeScript + Vite.**
- **NO backend. NO database.** Fully client-side SPA. All persistence is 
  IndexedDB (via Dexie.js) + localStorage + explicit file export/import. 
  Deployable as a static site with zero server infrastructure.
- **Styling: Tailwind CSS + CSS custom properties + shadcn/ui.** Never hardcode 
  a color, radius, or font anywhere in a component — always reference a design 
  token (`var(--token)` / Tailwind theme extension mapped to those variables).
- **Do not introduce a server-rendering framework** (no Next.js server 
  features, no API routes) — this is a pure static SPA.

## The Core Problem This Product Solves

Existing code-to-video tools fail in one of two ways: (a) high quality but 
desktop-Chrome-only because they depend entirely on WebCodecs with no fallback, 
or (b) work everywhere but export cropped/stretched/low-quality video because 
rendering resolution is coupled to the exporting device's screen size. CodeReel 
must do neither. This is the top architectural priority — get this right before 
polishing anything else.

## Non-Negotiable Architecture

1. **Resolution-decoupled rendering.** The render canvas always draws at a 
   fixed internal target resolution (e.g. 1080×1920) regardless of device 
   screen size. The on-screen preview is that same canvas visually scaled down 
   via CSS transform — never re-rendered at a different resolution. Export 
   always reads the full-resolution canvas. A phone and a desktop must produce 
   byte-identical resolution output for the same project.

2. **Virtual Timeline, not real-time capture.** Build a `Timeline`: a sorted, 
   time-stamped array of `TimelineEvent`s (typing, pauses, highlights, cursor 
   jumps, zoom, scroll, scene transitions) derived once from the user's code + 
   inline `[[markup]]` tokens + settings. Live preview walks it with 
   `requestAnimationFrame` for human viewing only. Export walks the *same* 
   Timeline deterministically, computing every frame as a pure function of 
   `(Timeline, frameIndex / fps)` — never call `Date.now()` or any wall-clock 
   API inside a render/draw function, since that breaks export determinism.

3. **Hybrid, auto-detected export pipeline with three tiers:**
   - Tier 1: WebCodecs API (`VideoEncoder`), used when `"VideoEncoder" in window`.
   - Tier 2: `MediaRecorder` + `canvas.captureStream(fps)`, fallback when Tier 1 unavailable.
   - Tier 3: `@ffmpeg/ffmpeg` (WASM build), universal fallback.
   - GIF export via `gif.js` always available.

4. **All per-frame drawing during export runs inside a Web Worker using 
   OffscreenCanvas.**

5. **Syntax highlighting via Shiki** (TextMate-grammar engine), lazy-loaded per language.

6. **Arabic-aware text handling:** code lines always stay structurally LTR. 
   Only Arabic text inside comment tokens gets RTL shaping.

## In-Text Markup Scripting Language

Parse and strip these tokens (syntax `[[token:value]]`) from source before 
rendering:

`[[pause:seconds]]` · `[[speed:fast|slow|<number>]]` · `[[highlight:start-end]]` 
· `[[focus:lineNumber]]` · `[[clear]]` · `[[cut]]` · `[[zoom:multiplier]]` · 
`[[cursor:jump:lineNumber]]` · `[[scene:next]]` · `[[glitch]]` · `[[beep]]`

## Two Independent Theming Systems

**(A) Code Themes** — theme the *rendered video content* (30+ built-in themes)
**(B) Website UI Skins** — theme the *application itself* (10 built-in skins)

## Tech Stack

React 19 + TypeScript + Vite · Tailwind CSS + CSS custom properties + 
shadcn/ui · CodeMirror 6 · Shiki · Canvas 2D + OffscreenCanvas + Web Worker 
· WebCodecs API / MediaRecorder / gif.js · Zustand · Dexie.js over IndexedDB

## Project Structure

```
src/
├─ app/                    # shell, providers
├─ components/
│  ├─ editor/              # CodeInput, LanguagePicker, MarkupLintPanel, PresetLibraryDrawer
│  ├─ style/               # CodeThemeGallery, BackgroundPicker, WindowChromeControls,
│  │                       # UISkinGallery, BrandKitManager
│  ├─ preview/             # CanvasPreview, TimelineScrubber, PlaybackControls
│  ├─ export/              # AspectRatioPresets, PlatformExportPresets, ExportPanel
│  ├─ projects/            # ProjectManager
│  └─ ui/                  # shadcn/ui-based primitives
├─ core/
│  ├─ timeline/            # Timeline type + buildTimelineFromSource() + getStateAtTime()
│  ├─ markup/              # [[token]] parser + linter
│  ├─ highlighting/        # Shiki wrapper, lazy grammar loader
│  ├─ render/              # layer draw functions, FX layer
│  └─ export/              # webCodecsExporter / mediaRecorderExporter / gifExporter
├─ stores/                 # Zustand stores
├─ data/                   # codeThemes/, uiSkins/, backgroundPresets/, snippetPresets/
├─ persistence/            # Dexie schema, repos, exportImportArchive
└─ styles/                 # CSS variable definitions per skin
```

## Definition of Done

- Video exported from phone has identical resolution to desktop export.
- Export succeeds on Chrome Desktop, Safari iOS, Chrome Android, Firefox.
- UI thread never freezes during export.
- All 32 code themes present and functional.
- All 10 UI skins present and functional; Brand Kits work.
- All `[[markup]]` tokens function and are stripped from output.
- No forced watermark.
- Zero network calls to any backend.
- Projects/themes/skins survive browser restart and can be exported/imported.
