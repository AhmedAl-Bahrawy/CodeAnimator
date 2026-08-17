# CodeReel — Full Technical Implementation Plan & Agent Prompt

> A complete, deeply detailed engineering spec for a Code-to-Video generator built for programming-education content creators (YouTube Shorts / Instagram Reels / TikTok). This document is written to be handed directly to **OpenCode** (the open-source, model-agnostic, terminal-native coding agent) as project context. It is structured so it can be dropped in as `AGENTS.md` at the project root, or pasted as the first message in a new OpenCode session — both work, since OpenCode reads `AGENTS.md` on every session start and Build mode will execute against it directly.

**Stack constraint (given):** React + TypeScript. **No backend, no database.** Everything is client-side. Persistence is local-only (IndexedDB / localStorage / file export-import). Deployable as a static SPA on Vercel/Netlify/Cloudflare Pages/GitHub Pages with zero server cost.

---

## Table of Contents

1. [Competitive Research — What Already Exists](#1-competitive-research)
2. [Product Positioning & Gaps We're Filling](#2-product-positioning)
3. [Core Architecture Decisions](#3-core-architecture-decisions)
4. [Rendering Engine Deep Dive](#4-rendering-engine-deep-dive)
5. [Export Pipeline Deep Dive](#5-export-pipeline-deep-dive)
6. [Syntax Highlighting System](#6-syntax-highlighting-system)
7. [Markup / Director-Notes Scripting Language](#7-markup-scripting-language)
8. [Code Themes — Full Catalog](#8-code-themes-full-catalog)
9. [Scene Backgrounds & Frame Chrome](#9-scene-backgrounds-frame-chrome)
10. [**Website UI Theming System** (theming the app itself, not just the code)](#10-website-ui-theming-system)
11. [Component Architecture](#11-component-architecture)
12. [State Management & Data Model](#12-state-management--data-model)
13. [Local Persistence (No DB)](#13-local-persistence-no-db)
14. [Mobile Performance Requirements](#14-mobile-performance-requirements)
15. [Accessibility & RTL](#15-accessibility--rtl)
16. [Feature Catalog — Full List](#16-feature-catalog-full-list)
17. [Tech Stack — Final](#17-tech-stack-final)
18. [Project Structure](#18-project-structure)
19. [Phased Delivery Plan](#19-phased-delivery-plan)
20. [Acceptance Criteria](#20-acceptance-criteria)
21. [**THE AGENT PROMPT** — paste this into OpenCode](#21-the-agent-prompt)

---

## 1. Competitive Research

Seven existing tools were audited before writing this spec. Their strengths and failure modes directly shaped every architectural decision below.

### 1.1 Zlvox — Code to Video
- **Strong tech:** WebCodecs API (`VideoEncoder`) for real frame-accurate encoding; a "Virtual Time Engine" that renders every frame deterministically instead of relying on real-time capture — zero dropped frames, zero stutter.
- **Feature set:** 8 code themes, 6 animation styles (Typewriter, Block Fade-in, Slide In, Neon Glow, Rainbow Wave, Static), 7 decorative backgrounds (Mesh Gradient, Matrix Code, Vaporwave, Galaxy, Sunset, Dark Blur, Solid), 1080×1920 and 1440×2560 (2K) output, 30/60 FPS, zero watermark, 100% client-side.
- **Fatal flaw:** **Desktop-Chrome-only.** It hard-blocks iOS, Android, and Firefox because `VideoEncoder` isn't available there. A creator on a phone literally cannot use it.
- **Site quality signal:** the tool is buried inside a generic 30-tool SEO-farm site (ad calculators, meme generators, etc. sitting next to it) — a strong negative signal for brand trust that we explicitly avoid by building a single-purpose product.

### 1.2 No Tools Left Behind — Code Video Generator
- **Strong UX:** dead-simple flow — orientation (16:9/9:16) → theme (20 named themes: Monokai, Dracula, Night Owl, Gruvbox, Synthwave, Cyberpunk, etc.) → typing speed (Fast/Medium/Slow) → Record. 40-second hard cap, which is exactly right for Shorts/Reels.
- **Flaw:** recording is tied to real-time typing capture — there is no separate deterministic render pass, so output quality/smoothness is coupled to the device's live performance during recording. No deep customization (colors, font, window chrome) beyond the theme picker.

### 1.3 termgif (PyPI)
Python CLI converting termtosvg/asciinema recordings to GIF. Not a web tool, no 9:16 awareness, no social-content focus. Useful takeaway: **GIF must remain a first-class export format** alongside MP4/WebM because it's still the fastest way to share on GitHub READMEs and X/Twitter without autoplay restrictions.

### 1.4 Terminalizer
CLI/Node tool that records a real terminal session into a themeable GIF/SVG via a config file. Key transferable concept: the **"Frame Box"** — the window chrome around the code (macOS traffic-light buttons, title bar, drop shadow) is a first-class visual element, not an afterthought. Our window-chrome system (Section 9) is built directly on this idea.

### 1.5 VHS (charmbracelet/vhs)
The most technically rigorous tool in the set, but it's a **CLI-only** Go binary driven by declarative `.tape` script files (requires `ttyd` + `ffmpeg` installed locally). Its command vocabulary is the single best reference for what a *complete* animation control surface looks like. We translate every VHS concept into a UI/data-model equivalent:

| VHS concept | Our equivalent |
|---|---|
| `Set Theme {json}` / named theme | Visual theme picker + full JSON custom-theme editor (Section 8) |
| `Set FontSize`, `FontFamily`, `LetterSpacing`, `LineHeight` | Typography controls in the settings panel, live-bound to the render |
| `Set Width` / `Height` | Aspect-ratio presets (9:16, 1:1, 16:9, custom) |
| `Set Padding` | Inner padding around code inside the window frame |
| `Set Margin` / `MarginFill` | Outer canvas background around the window frame (gradient/image/video) |
| `Set WindowBar` (Colorful/ColorfulRight/Rings/RingsRight) | Window-chrome style selector (macOS / Windows / minimal / none) |
| `Set BorderRadius` | Border-radius slider on the window frame |
| `Set TypingSpeed` + `Type@500ms "..."` (per-segment speed override) | Global typing speed + inline `[[speed:...]]` markup tokens |
| `Sleep` / `Wait /regex/` | `[[pause:seconds]]` markup token |
| `Hide` / `Show` | Ability to mark setup code as instantly-typed (no animation) vs. animated |
| `Set PlaybackSpeed` | Global export playback-speed multiplier |
| Output to `.gif`/`.mp4`/`.webm`/PNG sequence | Multi-format export picker |

This gives us a clean mental model: **every visual property is a timeline-controllable value, not a static setting.**

### 1.6 TerminalScreens — Coding Animation Tool
- **Strong idea:** ready-made presets (React Component, Python API Script, Deploy Script, GitHub Actions CI, SQL Query) that let a user start instantly instead of writing code from scratch — directly applicable to a programming-teacher's workflow.
- Typing modes: character-by-character or word-by-word. Toggles: line numbers, cursor, loop. A distraction-free "Presentation Mode" for live talks.
- **Flaw:** no real video/GIF export at all — it's a live-display tool only, not a content-production tool. This is the single clearest differentiator versus our product: **we must ship real file export**, not just a live player.

### 1.7 Jasper Bernaers — Terminal Text Animator
**The smartest product thinking in the set**, even though it targets generic retro-terminal messages rather than syntax-highlighted code:
- **7 terminal themes:** Green CRT Phosphor, Amber Phosphor, MS-DOS Blue, macOS Dark, Ubuntu Purple, Hacker Red, Matrix.
- **Retro FX layer:** scanlines, CRT flicker, neon glow, glitch bursts, matrix-rain intro — all toggleable, all composable.
- **Audio:** optional mechanical typing clicks + beep, synthesized via Web Audio API (zero asset weight).
- **In-text scripting markup** — this is the single best idea in the whole competitive set: `[pause 2]`, `[clear]`, `[slow]`/`[fast]`, `[speed 30]`, `[glitch]`, `[beep]`, all written inline in the message itself instead of requiring a complex per-line UI. **This is the direct ancestor of Section 7 below.**
- 3 aspect-ratio presets (16:9, 9:16, 1:1), matching exactly what we need for multi-platform export.
- Dual export: `RECORD` (live `MediaRecorder` capture → WebM) and `EXPORT GIF` (deterministic frame-by-frame render → GIF). **This dual-path pattern is the direct ancestor of our hybrid export strategy (Section 5).**
- Everything 100% client-side, zero upload, zero account — the same privacy/no-backend posture we are adopting.
- **Gap:** no real per-token syntax highlighting (it's a monochrome terminal-message tool, not a code editor renderer).

### 1.8 Cross-Tool Comparison Matrix

| | Real syntax highlighting | Works fully on mobile | Real file export | Themes | Aspect ratios | In-text scripting markup | Audio | Deterministic (frame-perfect) render |
|---|---|---|---|---|---|---|---|---|
| Zlvox | ✅ (Prism.js) | ❌ Desktop-Chrome only | ✅ WebCodecs | 8 | 9:16 only | ❌ | ❌ | ✅ |
| NTLB | Static coloring only | ✅ | ✅ (basic) | 20 | 16:9 / 9:16 | ❌ | ❌ | ❌ |
| TerminalScreens | Static coloring only | ✅ | ❌ live-only | 2 | unclear | ❌ | ❌ | ❌ |
| Jasper Terminal Animator | ❌ (terminal text) | ✅ | ✅ WebM + GIF | 7 | 16:9/9:16/1:1 | ✅ excellent | ✅ | Partial |
| **CodeReel (this spec)** | ✅ Shiki (TextMate-grade) | ✅ **hard requirement** | ✅ hybrid pipeline | 30+ | 9:16/1:1/16:9/custom | ✅ advanced | ✅ optional | ✅ always |

---

## 2. Product Positioning

**The gap nobody fills:** a tool that combines (real, VS-Code-grade syntax highlighting) + (rock-solid mobile support, not a degraded fallback) + (real deterministic video export, not just live capture) + (a large, deeply customizable theme system) + (an in-text scripting language for pacing/emphasis) in one product. That is CodeReel.

**Target user:** a programming educator producing short-form vertical video (Arabic or English), who needs to go from "paste code" to "downloaded MP4" in under two minutes, on whatever device is in front of them — including a phone.

---

## 3. Core Architecture Decisions

### 3.1 Decouple render resolution from display viewport (the fix for "cropped on export")

This is the root cause of the two failure modes described by the user: tools that work on mobile but render at low/wrong resolution, and tools that look good but export cropped/stretched because rendering is coupled to the exporting device's screen size.

**Rule: the internal render canvas ALWAYS renders at a fixed target resolution (e.g. 1080×1920), regardless of the device's actual screen size.** The on-screen preview is that same canvas scaled down visually via CSS transform (`transform: scale(previewScale)` where `previewScale = containerWidth / canvasWidth`), never re-rendered at a different internal resolution. Export always reads from the same full-resolution canvas. Consequences:
- A 375px-wide phone screen shows a perfectly scaled-down live preview of a 1080×1920 canvas.
- Exporting from that phone produces an identical-resolution file to exporting from a 4K desktop monitor — always.
- No cropping, no stretching, no quality loss tied to device.

### 3.2 Virtual Timeline rendering, not real-time capture

Every animatable property (typed characters, cursor position, highlighted lines, zoom level, scroll offset, opacity of scene elements) is derived from a **Timeline**: an ordered, time-stamped list of keyframe events built once from the user's code + markup + settings.

```ts
interface TimelineEvent {
  tMs: number;                 // absolute time in milliseconds from scene start
  type:
    | "type-char" | "type-word" | "delete-char"
    | "cursor-jump" | "set-highlight" | "clear-highlight"
    | "set-focus" | "clear-focus" | "pause" | "clear-screen"
    | "cut" | "zoom" | "scroll-to" | "set-speed" | "scene-transition";
  payload: Record<string, unknown>;
}

interface Timeline {
  totalDurationMs: number;
  events: TimelineEvent[];
  fps: number;
}
```

- **Live preview** walks this Timeline using `requestAnimationFrame`, computing "what should the code buffer / cursor / highlight state look like at time T" on every tick — this is for human viewing only and its smoothness does not affect the exported file.
- **Export** walks the *exact same* Timeline deterministically: for a 10-second clip at 60fps, exactly 600 frames are computed, each one a pure function of `(Timeline, frameIndex/fps)`. This guarantees byte-for-byte identical timing whether the export runs on a low-end Android phone or a Mac Studio — because frame computation speed only affects *how long export takes*, never *what the output looks like*.
- This "state at time T is a pure function" design is also what makes scrubbing, instant-preview-seek, and thumbnail generation trivial to add later.

### 3.3 Hybrid, auto-detected export pipeline

Zlvox fails completely off Chrome-Desktop because it has no fallback. We fix that with a three-tier pipeline chosen automatically at runtime:

```
Tier 1 (best, when supported):
  WebCodecs API (VideoEncoder) — frame-accurate hardware/software H.264 or VP9 encode,
  fastest, highest quality. Feature-detect via `"VideoEncoder" in window`.

Tier 2 (fallback for browsers without VideoEncoder, e.g. some mobile Safari/Firefox versions):
  MediaRecorder + canvas.captureStream(fps) — real-time capture of the SAME
  deterministic Timeline playback loop, output WebM.

Tier 3 (universal fallback, works absolutely everywhere including old browsers):
  @ffmpeg/ffmpeg (WASM build) — render the Timeline frame-by-frame to an in-memory
  PNG sequence (or raw canvas ImageData), then encode client-side to MP4 via ffmpeg.wasm.
  Slower, but 100% reliable and needs no special browser API.

GIF export (any tier, on demand):
  gif.js (Web Worker based) — frame-by-frame render, always available regardless
  of which video tier is active, since it only needs Canvas 2D + a worker.
```

Detection + selection happens once on app load and is surfaced to the user via a small status badge ("Exporting via WebCodecs — Fast" / "Exporting via ffmpeg.wasm — Compatibility mode") so power users understand what's happening, but the flow never requires manual configuration.

### 3.4 Worker-offloaded rendering

All per-frame canvas drawing during export runs inside a **Web Worker** using `OffscreenCanvas`, keeping the main UI thread free to remain responsive (scrolling, cancel button, progress bar) even while exporting a long clip on a weak device. Live preview can run on the main thread (it's cheap — one frame per RAF tick) but export must not.

### 3.5 Everything client-side — no backend, no database

Given constraint: **React + no backend, no DB.** This is not a limitation here — it's a feature, matching the privacy posture of the best competitor (Jasper Bernaers' tool: "nothing uploaded, ever"). All persistence uses:
- **IndexedDB** (via `Dexie.js`) for: saved projects, saved custom themes, saved custom UI skins, cached Shiki language grammars/themes.
- **localStorage** for: lightweight preferences (last used theme id, UI skin id, language, RTL toggle).
- **File System Access API / plain `<a download>` blobs** for: explicit project export/import as `.json`, so a user can move a project between devices or back it up outside the browser.

No user account, no server round-trip, no analytics beacon required for the tool to function.

---

## 4. Rendering Engine Deep Dive

### 4.1 Layer stack (bottom to top, drawn every frame)

```
1. Scene Background layer   (gradient / image / animated pattern / video-loop / solid)
2. Outer Margin layer       (the color/gradient area between background and the window frame — "MarginFill")
3. Window Frame layer       (rounded rect, drop shadow, chrome bar: dots/title/none)
4. Code Surface layer       (background color from the active CODE theme, padding)
5. Line-number gutter       (optional, theme-aware)
6. Syntax-highlighted text  (per-token colored glyphs, computed from Shiki tokens up to current Timeline position)
7. Highlight/Focus overlay  (semi-transparent rects behind highlighted lines, dim overlay for focus mode)
8. Cursor layer             (block/bar/underscore, blink state derived from Timeline time, not wall-clock time)
9. FX layer                 (scanlines, CRT flicker noise, glow bloom, glitch-burst displacement — all deterministic, seeded by frame index so they're reproducible on export)
10. Branding/Watermark layer (optional user logo/text, corner-anchored)
```

Each layer is a pure `draw(ctx, timelineState, canvasWidth, canvasHeight)` function — no hidden mutable state, no `Date.now()` calls anywhere in the render path (this is critical: any wall-clock read inside a render function breaks export determinism).

### 4.2 Typing state derivation

Given the fully-tokenized source (from Shiki) and the current time `T`, the "typed so far" buffer is derived, not stored:

```ts
function getVisibleCodeAtTime(timeline: Timeline, tMs: number): {
  visibleText: string;
  cursorLine: number;
  cursorCol: number;
  activeHighlightRange: [number, number] | null;
  focusLine: number | null;
  scrollOffsetPx: number;
  zoomLevel: number;
} {
  // Binary-search / linear-scan the sorted events array for all events with tMs <= T,
  // fold them into the resulting state. O(log n) with binary search since events
  // are time-sorted at Timeline construction.
}
```

Binary search over `events` (sorted by `tMs`) keeps per-frame state computation cheap even for long, event-dense scripts — important for export throughput on low-end devices.

### 4.3 Auto-scroll

When typed content exceeds the visible code-surface height, scroll offset is itself a Timeline-driven value (`scroll-to` events), not a real DOM scroll — so it renders identically in preview and in every export tier, including the ffmpeg.wasm frame-dump path where there is no real DOM at all (it renders off an OffscreenCanvas in a worker).

---

## 5. Export Pipeline Deep Dive

### 5.1 Common export contract

Regardless of tier, export is driven through one interface so the UI never needs to branch on which tier is active:

```ts
interface Exporter {
  readonly tierName: "webcodecs" | "mediarecorder" | "ffmpeg-wasm" | "gif";
  readonly isSupported: boolean;
  export(opts: ExportOptions, onProgress: (pct: number) => void): Promise<Blob>;
}

interface ExportOptions {
  timeline: Timeline;
  width: number;
  height: number;
  fps: 30 | 60;
  format: "mp4" | "webm" | "gif";
  playbackSpeedMultiplier: number; // 0.5x .. 2x
}
```

### 5.2 Tier selection logic

```ts
function selectExporter(desiredFormat: "mp4" | "webm" | "gif"): Exporter {
  if (desiredFormat === "gif") return gifExporter; // always the same path
  if ("VideoEncoder" in window && "VideoDecoder" in window) return webCodecsExporter;
  if ("MediaRecorder" in window && HTMLCanvasElement.prototype.captureStream) return mediaRecorderExporter;
  return ffmpegWasmExporter; // last resort, always works
}
```

### 5.3 Progress & cancellation

Every exporter must report `onProgress(0..100)` and support an `AbortController`-style cancel, since exports on weak mobile devices via the ffmpeg.wasm tier can take tens of seconds — the UI must never appear frozen. Run the whole export (including ffmpeg.wasm's own internal work) inside the Web Worker so `postMessage` progress events keep flowing to the main thread throughout.

### 5.4 Platform export presets

One-tap buttons that set `width/height/fps/maxDurationMs` together:

| Preset | Resolution | FPS | Max duration |
|---|---|---|---|
| YouTube Shorts | 1080×1920 | 30 or 60 | 60s |
| Instagram Reel | 1080×1920 | 30 or 60 | 90s |
| TikTok | 1080×1920 | 30 or 60 | 60s |
| X / Twitter post | 1920×1080 or 1080×1080 | 30 | 140s |
| YouTube (standard) | 1920×1080 | 30 or 60 | none |
| Square feed post | 1080×1080 | 30 | 60s |

---

## 6. Syntax Highlighting System

- **Engine: Shiki** (same TextMate-grammar engine as VS Code) — gives byte-accurate token colors matching real editor themes, far beyond Prism.js's regex-based approach.
- **Lazy-loaded per language** — only load the WASM grammar + theme actually selected, to keep first paint fast on mobile. Cache loaded grammars in memory for the session and in IndexedDB across sessions.
- **Minimum supported languages at launch:** JavaScript, TypeScript, JSX/TSX, Python, HTML, CSS, Bash/Shell, SQL, JSON, YAML, C, C++, Go, Rust, PHP, Java, Kotlin, C#, Ruby, Markdown, Dockerfile.
- **Token-to-Timeline mapping:** Shiki returns a token list (`{content, color, fontStyle}[]`) per line; the typing Timeline is generated by walking this token stream character-by-character (or word-by-word / line-by-line depending on typing mode) so every rendered character always has its correct final color from frame one — there is no "type first, colorize later" flash of unstyled text.
- **Arabic comments / RTL runs inside code:** code lines stay LTR overall (this is a hard rule — code syntax itself must never flip direction), but any comment token containing Arabic text is rendered with the Unicode bidi algorithm applied *within that token's span only*, so Arabic comment text reads correctly right-to-left while the surrounding `//`/`#` and code stays LTR. Use the CSS `unicode-bidi: plaintext` behavior equivalent implemented manually at the Canvas text-shaping level (Canvas doesn't support this via CSS, so the text run must be pre-shaped — split the token into contiguous LTR/RTL runs before drawing, and draw each run in its own direction).

---

## 7. Markup / Director-Notes Scripting Language

Users write inline control tokens directly in the code (extracted before rendering, never shown in the final video), using the syntax `[[token:value]]` on their own line or trailing a line. Directly descended from Jasper Bernaers' `[pause 2]` markup, extended for code-specific needs.

| Token | Effect |
|---|---|
| `[[pause:1.5]]` | Hold for 1.5 seconds (silence for voiceover explanation) |
| `[[speed:fast]]` / `[[speed:slow]]` / `[[speed:40]]` | Change typing speed from this point (named preset or literal chars/sec) |
| `[[highlight:4-7]]` | Highlight lines 4–7 (glow + slight scale-up) |
| `[[focus:4]]` | Dim everything except line 4 |
| `[[clear]]` | Wipe the whole buffer and restart typing (before/after demos) |
| `[[cut]]` | Instant hard cut to the next scripted state, no typing animation |
| `[[zoom:1.3]]` | Temporarily scale the canvas view for cinematic emphasis |
| `[[cursor:jump:12]]` | Instantly move the cursor to line 12 without typing (simulate editing existing code) |
| `[[scene:next]]` | Advance to the next multi-scene block (see Section 16.1) |
| `[[glitch]]` | Fire a single deterministic glitch-burst FX event |
| `[[beep]]` | Play (and encode, if audio export is enabled) a short synthesized terminal beep |

**Parser requirement:** the markup parser must run as a pre-processing pass that (a) strips all `[[...]]` tokens from the text that will actually be typed/rendered, and (b) converts them into `TimelineEvent`s inserted at the correct character offset in the resulting Timeline. Malformed tokens (unknown name, bad value) must fail with a clear inline editor warning (squiggly underline + tooltip) rather than silently breaking the render.

---

## 8. Code Themes — Full Catalog

All themes below must ship at launch, organized into UI categories.

### 8.1 Editor Classics
Dracula · Monokai · Night Owl · One Dark Pro · Solarized Dark · Solarized Light · Gruvbox Dark · Gruvbox Light · Nord · Tomorrow Night · Palenight · Material Dark · Cobalt2 · Atom Dark · Oceanic Next · Ayu Dark · Ayu Light · GitHub Dark · GitHub Light · Catppuccin Mocha · Catppuccin Latte · Catppuccin Frappé · Catppuccin Macchiato · Winter is Coming · Min Dark · Min Light

*(Shiki ships bundled Textmate-compatible versions of most of these — use `shiki`'s built-in theme bundle first, and only hand-author a theme JSON for the ones it doesn't include.)*

### 8.2 Retro Terminal
Green CRT Phosphor · Amber Phosphor · MS-DOS Blue · macOS Terminal Dark · Ubuntu Purple · Hacker Red · Matrix Green · Commodore 64

Each Retro Terminal theme exposes toggleable FX (all deterministic, all rendered in the FX layer described in 4.1):
- CRT Scanlines (animated subtle horizontal line sweep)
- Screen Flicker (low-amplitude brightness jitter, seeded per-frame for export reproducibility)
- Neon Glow (bloom around glyph edges)
- Glitch Burst (triggerable via `[[glitch]]` or randomly at a configurable low frequency)
- Matrix Rain intro (a few seconds of falling-character intro before the code scene starts)

### 8.3 Vibrant / Social-Media
Synthwave '84 · Vaporwave · Cyberpunk Neon · Neon Glow · Pastel Dreams · Horizon · ShadowFox · Indigo Night · Sunset Gradient Code · Bubblegum

These lean into bold gradients and high-saturation accents specifically because they read well at small preview sizes in a vertical social feed — a plain "editor" theme can look flat/boring as a thumbnail.

### 8.4 Custom Theme Builder

A full theme editor exposing exactly the 16-color model VHS uses (background, foreground, 8 base ANSI-style colors, 8 bright variants), plus code-specific token role overrides (`keyword`, `string`, `comment`, `function`, `variable`, `number`, `operator`, `type`, `punctuation`) so power users aren't limited to ANSI-role mapping when they want per-token-type precision.

```ts
interface CodeTheme {
  id: string;
  name: string;
  background: string;
  foreground: string;
  ansi: {
    black: string; red: string; green: string; yellow: string;
    blue: string; magenta: string; cyan: string; white: string;
    brightBlack: string; brightRed: string; brightGreen: string; brightYellow: string;
    brightBlue: string; brightMagenta: string; brightCyan: string; brightWhite: string;
  };
  tokenOverrides?: Partial<Record<
    "keyword" | "string" | "comment" | "function" | "variable" | "number" | "operator" | "type" | "punctuation",
    string
  >>;
  cursorColor?: string;
  lineNumberColor?: string;
  selectionColor?: string;
}
```

- Save to "My Themes" (IndexedDB).
- Export/Import as a portable `.json` file (so a theme built once can be reused across devices, or shared with a teammate like Basel, or bundled into a channel's brand kit).
- Live-preview the theme against the user's actual current code while editing it, not against a generic sample snippet.

---

## 9. Scene Backgrounds & Frame Chrome

These are independent of the *code* theme — they control the area outside the code window ("Margin" in VHS terms) and the window's own chrome.

**Backgrounds (outer canvas, behind the window frame):**
Mesh Gradient (multiple animatable gradient presets) · Galaxy/Starfield · Matrix Rain (full-canvas variant, not just intro) · Sunset Gradient · Vaporwave Grid · Dark Blur (blurred abstract shape) · Solid Color (free color picker) · Custom Image Upload · Custom Video Loop Upload (short muted looping clip, e.g. abstract motion background — encoded into the export via the same frame-accurate Timeline sampling, not just overlaid live).

**Window chrome:**
- Style: macOS traffic-lights (colorful or monochrome) · Windows-style minimal bar · Browser-tab style · None (borderless, code floats directly on the background)
- Title bar text (editable, e.g. `session_12_lists.py`)
- Border radius slider
- Drop shadow intensity slider
- Inner padding slider
- Outer margin size slider + `MarginFill` (solid/gradient) independent of the main background

---

## 10. Website UI Theming System

**This is distinct from Sections 8–9 (which theme the *rendered video content*). This section covers theming the surrounding web application itself** — the editor chrome, panels, buttons, typography of the tool's own interface — because a creator building a personal brand (e.g. "Ocean Dev") should be able to make the *tool* feel like their own workspace, not just the exported clip.

### 10.1 Requirements

- A **UI Skin system** fully decoupled from the Code Theme system in Section 8. Changing the app's own dark/light look must never affect the rendered code-video output, and vice versa.
- Ship at least **10 built-in UI skins** covering a spread of moods: `Midnight` (deep near-black dev-tool dark mode, default), `Paper` (clean light mode), `Terminal Green` (monospace-heavy, phosphor-green accented chrome, matches the Retro Terminal code-theme family), `Aurora` (soft gradient dark mode with purple/teal accents), `Sunset Studio` (warm gradient light-adjacent mode), `Slate` (neutral gray, minimal-distraction), `Neon City` (Cyberpunk-leaning high-contrast dark), `Sand` (warm beige/cream light mode), `Ocean` (deep blue/teal dark mode — a natural pairing for an "Ocean Dev" channel identity), `Contrast` (a high-contrast accessibility-first theme meeting WCAG AAA contrast ratios).
- Implement via **CSS custom properties** (`--bg-base`, `--bg-elevated`, `--bg-panel`, `--text-primary`, `--text-secondary`, `--text-muted`, `--accent`, `--accent-foreground`, `--border`, `--border-strong`, `--danger`, `--success`, `--warning`, `--radius-sm/md/lg`, `--font-ui`, `--font-mono`) defined per-skin and swapped by toggling a `data-ui-skin="oceandev"` attribute on `<html>`, consumed throughout via Tailwind's CSS-variable-based theme config (`tailwind.config` colors mapped to `var(--token)`), so components never hardcode a color.
- **Full custom UI-skin builder**, mirroring the depth of the code Theme Builder: a live-editable panel exposing every token above with color pickers, a font picker (pairs of UI font + monospace font, loaded from a bundled/self-hosted font subset — never a runtime Google Fonts call, to keep the app fully offline-capable), corner-radius scale, and density mode (`compact` / `comfortable` / `spacious` — adjusts padding/spacing scale tokens app-wide).
- Skins persist per-device via `localStorage` (`codereel.ui-skin`) and are saved/exported the same way as code themes (IndexedDB "My UI Skins" + JSON export/import), so a full personal brand kit (UI skin + code theme + background pack + logo watermark) can be exported as one bundle and reused across the creator's other machines or shared with a teammate.
- **Live theme preview while editing:** the skin editor applies changes to the *actual running app* in real time (not a mock swatch), so the user can see exactly how their editor panel, buttons, and text will look as they adjust each token.
- A **"Brand Kit" concept** ties it together: a named bundle of `{ uiSkinId, codeThemeId, backgroundPresetId, watermarkAssetRef, defaultAspectRatio }` that a creator can create once per channel (e.g. one Brand Kit for "Khwarizm Academy" lessons, a different one for "Ocean Dev" videos) and switch between instantly from a single dropdown — this directly serves a multi-channel creator's real workflow.
- RTL layout mode for the app chrome itself (not just code comments) — when the user's locale/preference is Arabic, the entire settings panel, menus, and controls mirror to RTL, using CSS logical properties (`margin-inline-start` etc.) throughout instead of hardcoded `left`/`right`, so no component needs a separate RTL variant written by hand.

### 10.2 Data model

```ts
interface UISkin {
  id: string;
  name: string;
  isBuiltIn: boolean;
  tokens: {
    bgBase: string; bgElevated: string; bgPanel: string;
    textPrimary: string; textSecondary: string; textMuted: string;
    accent: string; accentForeground: string;
    border: string; borderStrong: string;
    danger: string; success: string; warning: string;
    radiusSm: string; radiusMd: string; radiusLg: string;
    fontUI: string; fontMono: string;
  };
  density: "compact" | "comfortable" | "spacious";
}

interface BrandKit {
  id: string;
  name: string;              // e.g. "Khwarizm Academy", "Ocean Dev"
  uiSkinId: string;
  codeThemeId: string;
  backgroundPresetId: string;
  watermarkAssetDataUrl?: string;
  defaultAspectRatio: "9:16" | "1:1" | "16:9" | "custom";
}
```

### 10.3 Why this matters for this specific user

Given this creator runs **two distinct brands** (Khwarizm Academy — Arabic educational content — and Ocean Dev — a personal channel with its own pixel-art identity), a single hardcoded app look would force constant manual re-theming every session. The Brand Kit switcher turns "get into Khwarizm Academy recording mode" or "get into Ocean Dev recording mode" into one click that reconfigures the entire tool (app skin + code theme + background + watermark + aspect ratio) at once.

---

## 11. Component Architecture

```
<App>
 ├─ <AppShell>                       // applies data-ui-skin, RTL dir, layout shell
 │   ├─ <TopBar>                     // brand-kit switcher, project name, export button
 │   ├─ <MobileTabBar>                // shown <768px: Editor / Style / Preview tabs
 │   ├─ <EditorPanel>
 │   │   ├─ <CodeInput>              // CodeMirror 6 instance, markup syntax highlighting for [[tokens]]
 │   │   ├─ <LanguagePicker>
 │   │   ├─ <PresetLibraryDrawer>    // Section 16.2 snippet presets
 │   │   └─ <MarkupLintPanel>        // inline warnings for malformed [[tokens]]
 │   ├─ <StylePanel>
 │   │   ├─ <CodeThemeGallery> + <CodeThemeBuilder>
 │   │   ├─ <BackgroundPicker> + <WindowChromeControls>   (Section 9)
 │   │   ├─ <UISkinGallery> + <UISkinBuilder>             (Section 10)
 │   │   ├─ <TypographyControls>     // font, size, letter/line spacing
 │   │   ├─ <TypingBehaviorControls> // mode, cursor style, autoscroll
 │   │   └─ <BrandKitManager>
 │   ├─ <PreviewStage>
 │   │   ├─ <CanvasPreview>          // the scaled live canvas (Section 3.1)
 │   │   ├─ <TimelineScrubber>       // seek/scrub through the Virtual Timeline
 │   │   └─ <PlaybackControls>
 │   └─ <ExportPanel>
 │       ├─ <AspectRatioPresets>
 │       ├─ <PlatformExportPresets>  // Section 5.4
 │       ├─ <FormatAndQualityControls>
 │       ├─ <ExportProgressModal>
 │       └─ <ExportTierBadge>        // shows which pipeline tier is active
 └─ <ProjectManager>                 // Section 13: open/save/duplicate/delete local projects
```

**Editor choice:** CodeMirror 6 (not a plain `<textarea>`) for the code input, so the user gets real line numbers, bracket matching, and — critically — custom syntax highlighting *for the `[[markup]]` tokens themselves* (rendered as a distinct inline "widget" style) directly while typing, matching how VS Code highlights special comments.

---

## 12. State Management & Data Model

- **Zustand** for global app state, split into focused stores to avoid one giant store: `useProjectStore`, `useTimelineStore` (derived/computed, memoized), `useThemeStore` (code themes), `useUIThemeStore` (UI skins/brand kits), `useExportStore`.
- Timeline generation (code + markup → `Timeline`) is a pure, memoized function (`useMemo`/selector-level memoization) recomputed only when source code, markup, or timing-affecting settings change — never on every render.

```ts
interface Project {
  id: string;
  name: string;
  createdAt: number;
  updatedAt: number;
  scenes: Scene[];               // multi-scene support, Section 16.1
  aspectRatio: "9:16" | "1:1" | "16:9" | "custom";
  customWidth?: number;
  customHeight?: number;
  brandKitId?: string;
}

interface Scene {
  id: string;
  language: string;
  sourceWithMarkup: string;      // raw editor content, including [[tokens]]
  codeThemeId: string;
  backgroundPresetId: string;
  windowChrome: WindowChromeConfig;
  typingConfig: TypingConfig;
}
```

---

## 13. Local Persistence (No DB)

Since there is explicitly no backend/DB, all storage is browser-native:

| Data | Storage | Notes |
|---|---|---|
| Projects | IndexedDB (Dexie) | Full `Project` objects; list view = "My Projects" |
| Custom code themes | IndexedDB (Dexie) | + JSON export/import |
| Custom UI skins | IndexedDB (Dexie) | + JSON export/import |
| Brand kits | IndexedDB (Dexie) | References theme/skin/background ids |
| Last-used preferences | localStorage | last skin id, last theme id, RTL toggle, last export format |
| Cached Shiki grammars | IndexedDB (or Cache API) | avoid re-downloading WASM grammar on every visit |
| Autosave | IndexedDB, debounced (e.g. 1.5s after last edit) | recovers unsaved work after an accidental tab close |
| Uploaded assets (logo, custom background image/video) | IndexedDB as Blob | never leaves the device |

Provide an explicit **"Export All Data"** button that zips (via `jszip` or similar) all projects/themes/skins into one downloadable archive, and an **"Import"** flow to restore it — this is the no-backend equivalent of a backup/sync feature.

---

## 14. Mobile Performance Requirements

These are hard requirements, directly answering the user's core complaint about existing tools:

1. Live preview must sustain ≥30fps visual smoothness on a mid-range Android device (e.g. a 2022-era Snapdragon 7-series equivalent) with the canvas scaled to fit a typical phone viewport.
2. Export must never block the main thread long enough to trigger a "page unresponsive" browser warning — verified by keeping all per-frame drawing inside the OffscreenCanvas Web Worker (Section 3.4) with periodic `postMessage` progress updates.
3. Shiki grammar loading must be lazy and cached — first paint of the editor must not wait on downloading grammars for languages the user hasn't selected yet.
4. Touch targets in the Style/Export panels must meet a minimum 44×44px hit area (mobile usability baseline), and the panel layout must reflow to the `<MobileTabBar>` pattern below 768px width rather than cramming the desktop 3-column layout into a narrow viewport.
5. Test matrix before shipping any release: Chrome Android, Safari iOS (current and one version back), Samsung Internet, Firefox Android — export must succeed (via whichever pipeline tier applies) on every one of these, even if Tier 1 (WebCodecs) isn't available on all of them.

---

## 15. Accessibility & RTL

- Full keyboard navigation across all panels (editor, style controls, export flow) — no mouse-only interactions.
- Color contrast in the default `Midnight` and `Paper` UI skins must meet WCAG AA at minimum; the dedicated `Contrast` skin (Section 10.1) must meet AAA.
- `prefers-reduced-motion` respected in the *app UI itself* (panel transitions, hover animations) — this is separate from the rendered video content's own animation, which is the user's explicit creative choice and is never auto-disabled.
- Arabic UI language pack for the app chrome itself (menus, buttons, tooltips) as a first-class locale, not an afterthought translation layer — since this creator's primary teaching audience and workflow are Arabic-language.
- As detailed in Section 6, code content itself always stays LTR structurally; RTL only applies to Arabic comment spans and, per Section 10.1, to the surrounding app chrome when Arabic UI locale is active.

---

## 16. Feature Catalog (Full List)

### 16.1 Multi-scene sequences
A project can contain multiple `Scene`s (e.g. `models.py` → `views.py` → `test output`), each with its own code, theme, and window chrome, stitched into one continuous export with a configurable transition (`cut` or `crossfade`) between them. The Timeline concept extends naturally: each scene contributes its own event block, offset by the cumulative duration of prior scenes.

### 16.2 Educational snippet preset library
A curated, filterable library of ready-to-drop-in code snippets across common teaching topics: Python loops/functions/lists/dicts, JS async/await, React hooks, SQL joins, Bash scripting basics, Git commands, REST API calls, common algorithm patterns (sorting, recursion). Each preset can include pre-authored `[[markup]]` pacing so a teacher gets a good-pacing starting point, not just raw unstyled code.

### 16.3 Project autosave & project manager
Covered in Sections 12–13. A "My Projects" grid view with thumbnails (rendered by exporting a single representative frame at, e.g., 50% through the Timeline, cheap to generate on-demand).

### 16.4 Voiceover helper (optional, local-only)
User uploads one audio file for reference; the app decodes it via the Web Audio API and renders a waveform strip aligned beneath the `<TimelineScrubber>`, purely as a visual pacing aid for manually placing `[[pause:...]]` tokens against the creator's actual narration — the audio file itself is never bundled into the exported video automatically (video export remains silent by default, matching how these social platforms handle native voiceover added in their own editors), but an explicit **"burn in this audio track"** opt-in is available for users who want a single self-contained file, muxed client-side via ffmpeg.wasm.

### 16.5 Timeline scrubbing & instant seek
Because frame state is a pure function of time (Section 4.2), the `<TimelineScrubber>` supports instant drag-to-seek preview with no re-computation cost beyond a single state evaluation — critical for a smooth editing feel.

### 16.6 Keyboard shortcuts for power users
Space = play/pause preview, Cmd/Ctrl+E = export, Cmd/Ctrl+S = save project, `[`/`]` = nudge selected markup token's value, matching the muscle-memory expectations of a developer-tool audience.

### 16.7 Duplicate & fork
One-click duplicate of any project or any single scene, useful when producing a series of similar lesson videos (e.g. "Session 12", "Session 13" sharing the same visual setup).

---

## 17. Tech Stack — Final

| Concern | Choice | Why |
|---|---|---|
| Framework | React 19 + TypeScript + Vite | matches existing developer skillset, fast HMR, easy static build |
| Styling | Tailwind CSS + CSS custom properties (Section 10.2) + shadcn/ui primitives | utility velocity + full design-token theming without fighting Tailwind |
| Code editor input | CodeMirror 6 | real editor ergonomics, custom markup-token highlighting |
| Syntax highlighting (render) | Shiki (lazy-loaded per language) | TextMate-grade accuracy, matches VS Code themes exactly |
| Rendering | Canvas 2D + OffscreenCanvas + Web Worker | deterministic, worker-offloaded, resolution-decoupled (Section 3) |
| Video export tier 1 | WebCodecs API (`VideoEncoder`) | fastest, highest quality where supported |
| Video export tier 2 | `MediaRecorder` + `canvas.captureStream()` | broad fallback |
| Video export tier 3 | `@ffmpeg/ffmpeg` (WASM) | universal fallback, works everywhere |
| GIF export | `gif.js` (Web Worker) | always-available format |
| State management | Zustand | lightweight, store-splitting friendly |
| Local persistence | Dexie.js over IndexedDB + localStorage | no backend/DB per project constraint |
| Audio (optional) | Web Audio API | synthesized typing/beep FX, zero asset weight |
| Fonts | Self-hosted subsetted font files (no runtime Google Fonts call) | keeps the app fully offline-capable, faster mobile load |
| Deployment | Static SPA — Vercel / Netlify / Cloudflare Pages | zero server cost, matches no-backend constraint |
| Testing | Vitest + React Testing Library; Playwright for export-pipeline smoke tests across browser engines | catch regressions in the trickiest part of the app (export) |

---

## 18. Project Structure

```
codereel/
├─ src/
│  ├─ app/                      # App shell, routing (if any), providers
│  ├─ components/
│  │  ├─ editor/                # CodeInput, LanguagePicker, MarkupLintPanel, PresetLibraryDrawer
│  │  ├─ style/                 # CodeThemeGallery, CodeThemeBuilder, BackgroundPicker,
│  │  │                         # WindowChromeControls, UISkinGallery, UISkinBuilder, BrandKitManager
│  │  ├─ preview/                # CanvasPreview, TimelineScrubber, PlaybackControls
│  │  ├─ export/                 # AspectRatioPresets, PlatformExportPresets, ExportProgressModal, ExportTierBadge
│  │  ├─ projects/               # ProjectManager, ProjectCard, ImportExportDataPanel
│  │  └─ ui/                     # shadcn/ui-based primitives (Button, Dialog, Tabs, Slider, ColorPicker...)
│  ├─ core/
│  │  ├─ timeline/                # Timeline type, buildTimelineFromSource(), getStateAtTime()
│  │  ├─ markup/                  # parser + linter for [[tokens]]
│  │  ├─ highlighting/            # Shiki wrapper, lazy grammar loader, RTL-run splitter for comments
│  │  ├─ render/                  # layer draw functions (Section 4.1), FX layer, deterministic RNG for seeded FX
│  │  └─ export/                  # exporters/webCodecsExporter.ts, mediaRecorderExporter.ts,
│  │                               # ffmpegWasmExporter.ts, gifExporter.ts, selectExporter.ts
│  ├─ stores/                     # Zustand stores (Section 12)
│  ├─ data/
│  │  ├─ codeThemes/              # built-in CodeTheme JSON catalog (Section 8)
│  │  ├─ uiSkins/                 # built-in UISkin JSON catalog (Section 10)
│  │  ├─ backgroundPresets/
│  │  └─ snippetPresets/          # Section 16.2 library content
│  ├─ persistence/                 # Dexie schema/db.ts, projectRepo.ts, themeRepo.ts, skinRepo.ts, exportImportArchive.ts
│  ├─ workers/                     # render.worker.ts, export.worker.ts, gif.worker.ts
│  ├─ i18n/                        # Arabic + English UI strings, RTL logical-property helpers
│  └─ styles/                      # globals.css (CSS variable definitions per skin), tailwind.config.ts
├─ public/
│  └─ fonts/                       # self-hosted subsetted font files
├─ AGENTS.md                       # <- this document, or a trimmed pointer to it
└─ package.json
```

---

## 19. Phased Delivery Plan

**Phase 1 — Core loop (single scene, single export tier):**
CodeMirror input → Shiki highlighting → basic Timeline (typing only, no markup yet) → live Canvas preview at fixed internal resolution with CSS-scaled display → 5 launch themes → MP4 export via WebCodecs only (Tier 1). Goal: prove the resolution-decoupled render + deterministic Timeline concept end-to-end.

**Phase 2 — The actual differentiators (highest priority after Phase 1):**
Full hybrid export pipeline (Tiers 2 and 3 + GIF), so mobile/Safari/Firefox actually work — this is the single most important phase given the user's original complaint. Add remaining code themes, all aspect ratios, platform export presets, branding/watermark.

**Phase 3 — Markup & advanced control:**
Full `[[token]]` markup parser + linter, multi-scene sequences, auto-scroll, Retro Terminal FX layer (scanlines/flicker/glow/glitch), custom Code Theme Builder.

**Phase 4 — Website UI theming system:**
Full UI Skin system (Section 10) — CSS-variable architecture, 10 built-in skins, UI Skin Builder, Brand Kit manager, RTL app-chrome mode.

**Phase 5 — Content-creator quality-of-life:**
Snippet preset library, project autosave/manager, voiceover helper with waveform, timeline scrubbing polish, keyboard shortcuts, duplicate/fork, full data export/import archive.

**Phase 6 — Hardening:**
Real-device mobile performance pass (Section 14 test matrix), accessibility audit (Section 15), Playwright cross-browser export smoke tests, bundle-size audit (verify Shiki/ffmpeg.wasm lazy-loading is actually deferring correctly, not bloating first load).

---

## 20. Acceptance Criteria

- [ ] A video exported from a mid-range Android phone is **pixel-identical in resolution** to one exported from a desktop, for the same project settings — no cropping, no stretching.
- [ ] Export succeeds (through whichever pipeline tier is appropriate) on Chrome Desktop, Safari iOS, Chrome Android, and Firefox Desktop.
- [ ] The UI thread never freezes/warns "page unresponsive" during export on any tested device.
- [ ] All cataloged code themes (Section 8) are present and functional; the Code Theme Builder saves, exports, and re-imports correctly.
- [ ] All cataloged UI skins (Section 10) are present and functional; the UI Skin Builder live-updates the actual app chrome, and Brand Kits correctly bundle+switch `{uiSkin, codeTheme, background, watermark, aspectRatio}` in one action.
- [ ] All `[[markup]]` tokens (Section 7) function as specified and are cleanly stripped from rendered/exported output.
- [ ] No forced watermark from the tool itself.
- [ ] Arabic comments render correctly RTL-within-LTR-code (Section 6); Arabic UI locale mirrors the app chrome correctly (Section 15).
- [ ] Zero backend calls anywhere in the network tab during normal use — confirmed via a dev-mode network-request assertion in the Playwright suite.
- [ ] Full project + theme + skin data survives a browser restart (IndexedDB persistence) and can be exported/imported as a single archive.

---

## 21. THE AGENT PROMPT

Everything below this line is what you paste into OpenCode — either as the initial message of a new session, or saved as `AGENTS.md` at the project root (OpenCode reads it automatically on every session start). It intentionally repeats the load-bearing decisions from the sections above in a dense, directive form, because the agent should not need to re-derive them from prose.

```markdown
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
   API inside a render/draw function, since that breaks export determinism. A 
   10s/60fps export must always produce exactly 600 frames of identical output 
   regardless of how fast the device computing it is.

3. **Hybrid, auto-detected export pipeline with three tiers, selected at 
   runtime via feature detection — never require the user to configure this 
   manually:**
   - Tier 1: WebCodecs API (`VideoEncoder`), used when `"VideoEncoder" in 
     window`. Fastest, highest quality.
   - Tier 2: `MediaRecorder` + `canvas.captureStream(fps)`, used when Tier 1 
     is unavailable but `MediaRecorder` + `captureStream` are supported.
   - Tier 3: `@ffmpeg/ffmpeg` (WASM build), the universal fallback that must 
     work on every browser with no special API dependency — render the 
     Timeline frame-by-frame and encode client-side.
   - GIF export via `gif.js` is always available on top of any tier, since it 
     only needs Canvas 2D + a Web Worker.
   - Show a small badge indicating which tier is active, but never block the 
     user on tier selection.

4. **All per-frame drawing during export runs inside a Web Worker using 
   OffscreenCanvas.** The main UI thread must remain responsive (progress bar, 
   cancel button) throughout export on every device, including low-end mobile.

5. **Syntax highlighting via Shiki** (TextMate-grammar engine, same as VS 
   Code), lazy-loaded per selected language, cached across sessions in 
   IndexedDB/Cache API. Do not use a regex-based highlighter like Prism as the 
   primary engine — accuracy matters because this tool's differentiator is 
   editor-grade highlighting quality.

6. **Arabic-aware text handling:** code lines always stay structurally LTR. 
   Only Arabic text inside comment tokens gets RTL shaping, scoped to that 
   token's run only, achieved by splitting each token into contiguous 
   LTR/RTL sub-runs before drawing to canvas (canvas text has no native bidi 
   support, so this must be done manually at the text-shaping layer, not via 
   CSS `direction`).

## In-Text Markup Scripting Language

Parse and strip these tokens (syntax `[[token:value]]`) from source before 
rendering, converting each into a `TimelineEvent` at the correct character 
offset:

`[[pause:seconds]]` · `[[speed:fast|slow|<number>]]` · `[[highlight:start-end]]` 
· `[[focus:lineNumber]]` · `[[clear]]` · `[[cut]]` · `[[zoom:multiplier]]` · 
`[[cursor:jump:lineNumber]]` · `[[scene:next]]` · `[[glitch]]` · `[[beep]]`

Malformed tokens must surface as an inline editor warning (squiggly underline 
+ tooltip), never fail silently and never leak into rendered output.

## Two Independent Theming Systems (do not conflate them)

**(A) Code Themes** — theme the *rendered video content* (the code itself): 
background/foreground/16 ANSI-style colors/per-token-role overrides for 
keyword/string/comment/function/variable/number/operator/type/punctuation. 
Ship 30+ built-in themes across three categories:
- *Editor Classics*: Dracula, Monokai, Night Owl, One Dark Pro, Solarized 
  Dark/Light, Gruvbox Dark/Light, Nord, Tomorrow Night, Palenight, Material 
  Dark, Cobalt2, Atom Dark, Oceanic Next, Ayu Dark/Light, GitHub Dark/Light, 
  Catppuccin (Mocha/Latte/Frappé/Macchiato), Winter is Coming, Min Dark/Light.
- *Retro Terminal*: Green CRT Phosphor, Amber Phosphor, MS-DOS Blue, macOS 
  Terminal Dark, Ubuntu Purple, Hacker Red, Matrix Green, Commodore 64 — each 
  with toggleable FX: scanlines, screen flicker, neon glow, glitch bursts 
  (all deterministic/seeded per-frame for export reproducibility), matrix-rain 
  intro.
- *Vibrant/Social*: Synthwave '84, Vaporwave, Cyberpunk Neon, Neon Glow, 
  Pastel Dreams, Horizon, ShadowFox, Indigo Night, Sunset Gradient, Bubblegum.
- A full **Code Theme Builder**: 16-color model editor + token-role overrides, 
  live preview against the user's actual current code, save to IndexedDB "My 
  Themes", JSON export/import.

Also ship independent **scene background & window chrome controls**: outer 
canvas backgrounds (Mesh Gradient, Galaxy, Matrix Rain, Sunset Gradient, 
Vaporwave Grid, Dark Blur, Solid Color, custom image upload, custom video 
loop upload) and window chrome (macOS traffic-lights/Windows-style/browser-
tab/none, editable title bar text, border radius, drop shadow, inner padding, 
outer margin + independent MarginFill color/gradient).

**(B) Website UI Theming (Skins)** — theme the *application itself* (the 
editor's own chrome: panels, buttons, typography, colors of the tool the user 
is sitting inside), **completely decoupled from (A)**. Changing the app's own 
look must never affect rendered video output and vice versa. Requirements:
- Implement via CSS custom properties (`--bg-base`, `--bg-elevated`, 
  `--bg-panel`, `--text-primary`, `--text-secondary`, `--text-muted`, 
  `--accent`, `--accent-foreground`, `--border`, `--border-strong`, 
  `--danger`, `--success`, `--warning`, `--radius-sm/md/lg`, `--font-ui`, 
  `--font-mono`), swapped by toggling `data-ui-skin="<id>"` on `<html>`, and 
  consumed via Tailwind theme config mapped to those variables — never 
  hardcode a color in a component.
- Ship 10 built-in UI skins: `Midnight` (default dark), `Paper` (light), 
  `Terminal Green` (phosphor-green accented, pairs with Retro Terminal code 
  themes), `Aurora` (soft purple/teal gradient dark), `Sunset Studio` (warm 
  light-adjacent), `Slate` (neutral minimal-distraction gray), `Neon City` 
  (Cyberpunk high-contrast dark), `Sand` (warm beige/cream light), `Ocean` 
  (deep blue/teal dark — natural fit for a channel branded "Ocean Dev"), 
  `Contrast` (WCAG AAA accessibility-first).
- Build a full **UI Skin Builder**: every token above exposed with color 
  pickers, a UI-font + mono-font picker pulling from self-hosted subsetted 
  font files (never a runtime Google Fonts network call — the app must work 
  fully offline), a corner-radius scale, and a density mode 
  (compact/comfortable/spacious affecting spacing scale app-wide). Changes 
  apply live to the actual running app, not a mock swatch.
- Persist custom skins the same way as code themes: IndexedDB "My UI Skins" + 
  JSON export/import.
- Build a **Brand Kit** system: a named bundle of 
  `{ uiSkinId, codeThemeId, backgroundPresetId, watermarkAssetRef, 
  defaultAspectRatio }` switchable from one dropdown in the top bar — this 
  exists because a single creator often runs multiple channels/brands and 
  needs to reconfigure the entire tool (both theming systems + watermark + 
  aspect ratio) in one action rather than manually re-picking six settings 
  every session.
- Support a full RTL app-chrome mode (not just RTL in code comments) using 
  CSS logical properties throughout (`margin-inline-start`, `padding-inline-
  end`, etc.) instead of hardcoded `left`/`right`, activated when Arabic UI 
  locale is selected, so no component needs a hand-written RTL variant.

## Required Feature Set (beyond core rendering/export/theming above)

- Multi-scene sequences (multiple code scenes stitched into one export, with 
  cut/crossfade transitions between them).
- A curated, filterable **snippet preset library** for common teaching topics 
  (Python loops/functions/lists/dicts, JS async/await, React hooks, SQL joins, 
  Bash basics, Git commands, REST calls, sorting/recursion patterns), each 
  optionally pre-authored with `[[markup]]` pacing.
- **Project autosave** (debounced IndexedDB writes) + a "My Projects" manager 
  view (grid with on-demand thumbnail generation from a mid-Timeline frame).
- Optional **voiceover helper**: local audio file decode via Web Audio API, 
  waveform strip rendered beneath the timeline scrubber as a pacing aid for 
  placing `[[pause]]` tokens — audio is never auto-muxed into export by 
  default, but provide an explicit opt-in to burn it in client-side via 
  ffmpeg.wasm.
- Instant **timeline scrubbing** (drag-to-seek preview) exploiting the "state 
  is a pure function of time" design — no re-computation cost beyond a single 
  state evaluation at the sought time.
- Platform **export presets**: YouTube Shorts (1080×1920, ≤60s), Instagram 
  Reel (1080×1920, ≤90s), TikTok (1080×1920, ≤60s), X/Twitter (1920×1080 or 
  1080×1080), YouTube standard (1920×1080, no cap), square feed post 
  (1080×1080, ≤60s) — one tap sets width/height/fps/maxDuration together.
- Optional branding/watermark: text and/or uploaded logo image, corner-
  anchored, positioned by the user — never a forced tool watermark.
- Keyboard shortcuts: Space = play/pause preview, Cmd/Ctrl+E = export, 
  Cmd/Ctrl+S = save project.
- Full **data export/import**: zip all projects/themes/skins/brand kits into 
  one downloadable archive and restore from it — this is the no-backend 
  equivalent of backup/sync.

## Tech Stack

React 19 + TypeScript + Vite · Tailwind CSS + CSS custom properties + 
shadcn/ui · CodeMirror 6 (code input, with custom highlighting for 
`[[markup]]` tokens while typing) · Shiki (rendered syntax highlighting, 
lazy-loaded per language) · Canvas 2D + OffscreenCanvas + Web Worker 
(rendering) · WebCodecs API / MediaRecorder / `@ffmpeg/ffmpeg` (WASM) / 
`gif.js` (export tiers, per Non-Negotiable Architecture #3) · Zustand (state, 
split into `useProjectStore` / `useTimelineStore` / `useThemeStore` / 
`useUIThemeStore` / `useExportStore`) · Dexie.js over IndexedDB + localStorage 
(all persistence — no backend, no database) · Web Audio API (optional 
typing-click/beep FX, synthesized, zero asset weight) · self-hosted subsetted 
fonts (no runtime Google Fonts calls) · Vitest + React Testing Library + 
Playwright (cross-browser export pipeline smoke tests).

## Mobile Performance Bar (hard requirement, verify on real devices before 
considering any phase "done")

- Live preview sustains ≥30fps visual smoothness on a mid-range Android device.
- Export never triggers a "page unresponsive" browser warning on any device — 
  guaranteed by the Web Worker + OffscreenCanvas rendering requirement above.
- Shiki grammar loading is lazy and cached — first paint never waits on 
  languages the user hasn't selected.
- Touch targets ≥44×44px; layout reflows to a mobile tab pattern 
  (Editor/Style/Preview tabs) below 768px width instead of compressing the 
  desktop 3-column layout.
- Export must succeed via the appropriate pipeline tier on: Chrome Desktop, 
  Safari iOS (current + one version back), Chrome Android, Samsung Internet, 
  Firefox Android/Desktop.

## Project Structure

Follow this layout:

```
src/
├─ app/                    # shell, providers
├─ components/
│  ├─ editor/               # CodeInput, LanguagePicker, MarkupLintPanel, PresetLibraryDrawer
│  ├─ style/                 # CodeThemeGallery/Builder, BackgroundPicker, WindowChromeControls,
│  │                          # UISkinGallery/Builder, BrandKitManager
│  ├─ preview/                # CanvasPreview, TimelineScrubber, PlaybackControls
│  ├─ export/                  # AspectRatioPresets, PlatformExportPresets, ExportProgressModal, ExportTierBadge
│  ├─ projects/                 # ProjectManager, ProjectCard, ImportExportDataPanel
│  └─ ui/                        # shadcn/ui-based primitives
├─ core/
│  ├─ timeline/              # Timeline type + buildTimelineFromSource() + getStateAtTime()
│  ├─ markup/                 # [[token]] parser + linter
│  ├─ highlighting/            # Shiki wrapper, lazy grammar loader, RTL-run splitter
│  ├─ render/                   # layer draw functions, FX layer, seeded deterministic RNG
│  └─ export/                    # webCodecsExporter / mediaRecorderExporter / ffmpegWasmExporter /
│                                 # gifExporter / selectExporter
├─ stores/                  # Zustand stores
├─ data/                    # codeThemes/, uiSkins/, backgroundPresets/, snippetPresets/ (JSON catalogs)
├─ persistence/              # Dexie schema, repos, exportImportArchive
├─ workers/                   # render.worker.ts, export.worker.ts, gif.worker.ts
├─ i18n/                       # Arabic + English strings, RTL logical-property helpers
└─ styles/                      # CSS variable definitions per skin, tailwind.config.ts
```

## Phased Delivery — work in this order, confirm each phase before the next

1. **Core loop**: CodeMirror → Shiki → basic Timeline (typing only) → 
   resolution-decoupled Canvas preview → 5 launch themes → WebCodecs-only MP4 
   export. Prove the core architecture end-to-end before adding breadth.
2. **Hybrid export pipeline** (all 3 tiers + GIF) — this is the single most 
   important phase, since it's the direct fix for "works on mobile but export 
   is bad" / "looks good but breaks off Desktop Chrome." Add remaining code 
   themes, all aspect ratios, platform export presets, watermark.
3. **Markup language + multi-scene + Retro Terminal FX + Code Theme Builder.**
4. **Website UI Theming System**: CSS-variable architecture, 10 built-in 
   skins, UI Skin Builder, Brand Kit manager, RTL app-chrome mode.
5. **Creator quality-of-life**: snippet library, autosave/project manager, 
   voiceover helper, scrubbing polish, shortcuts, duplicate/fork, full 
   data export/import archive.
6. **Hardening**: real-device mobile pass, accessibility audit, Playwright 
   cross-browser export smoke tests, bundle-size audit confirming lazy-loads 
   actually defer (Shiki grammars, ffmpeg.wasm) rather than bloating first load.

## Definition of Done (verify against every one of these before declaring 
any phase complete)

- Video exported from a mid-range Android phone has identical resolution to 
  one exported from desktop for the same project — no cropping, no stretching.
- Export succeeds on Chrome Desktop, Safari iOS, Chrome Android, Firefox — 
  via whichever tier is appropriate on each.
- UI thread never freezes during export on any tested device.
- All cataloged code themes present and functional; Code Theme Builder saves/
  exports/re-imports correctly.
- All cataloged UI skins present and functional; UI Skin Builder live-updates 
  the real app; Brand Kits correctly bundle and one-click-switch all four 
  linked settings.
- All `[[markup]]` tokens function as specified and are cleanly stripped from 
  rendered output.
- No forced watermark from the tool.
- Arabic comments render RTL-within-LTR-code correctly; Arabic UI locale 
  mirrors app chrome correctly via logical CSS properties.
- Zero network calls to any backend during normal use.
- Projects/themes/skins survive a browser restart and can be exported/
  imported as one archive.

## How to Start

Do not write implementation code yet. First, in Plan mode, propose the exact 
file list and package.json dependencies for Phase 1 only, matching the 
Project Structure above. Wait for confirmation, then proceed phase by phase, 
never jumping ahead to a later phase's scope without being asked.
```

---

## Final Notes Before You Send This

1. **Placement:** save Section 21's fenced block as `AGENTS.md` at the repo root before starting the OpenCode session — OpenCode auto-loads it on every session start, so you won't need to re-paste it each time you resume work.
2. **Mode discipline:** start every new multi-file task in OpenCode's **Plan mode** (read-only, shows the intended file changes before touching anything), review the plan, then switch to **Build mode** to execute — this matches the "How to Start" instruction at the end of the prompt and avoids the agent sprinting ahead through all six phases unsupervised.
3. **Naming:** "CodeReel" is a placeholder. Swap it for a name tied to your "Ocean Dev" or Khwarizm Academy identity before committing `AGENTS.md`, since it's referenced by name throughout.
4. **Scope discipline:** this spec is intentionally exhaustive so nothing important gets missed, but you do not need Phase 4–6 features to have a usable internal tool — Phases 1–2 alone already solve your original complaint (mobile support + real theming + real video export) and are usable for actual content production while the rest is still being built.
