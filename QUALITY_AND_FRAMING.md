# Quality and Framing Contract

## Quality profiles

Code Animator exposes two video export profiles. **High quality** renders video at 1.5× the logical project dimensions, uses a 24 Mbps target video bitrate, 192 kbps audio when AAC is available, and a two-second keyframe interval. **Ultra quality** renders at 2× dimensions, uses a 40 Mbps target video bitrate, 256 kbps audio when AAC is available, and a one-second keyframe interval.

The selected profile is carried through `ExportOptions.quality`. `ExportPanel` computes final even output dimensions, `webCodecsExporter` applies the profile to native VP9/H.264 configuration, `h264Mp4Fallback` applies the bitrate and GOP settings to the WASM encoder, and the MediaRecorder fallback uses the same video bitrate. GIF intentionally retains logical canvas dimensions because scaling indexed-color GIFs increases memory and file size without improving color fidelity.

MP4 audio uses the selected profile’s audio bitrate and retains the AAC-first, Opus-fallback strategy. The audio track is built from the same timeline cue positions and playback-speed multiplier as the rendered animation.

## Three framing modes

`resolveAdaptiveFrame()` and `resolveSceneRenderModel()` are the canonical geometry sources for preview and export. The same resolved appearance is passed to every renderer, so changing framing mode changes both the live canvas and the recorded media.

| Mode | Output dimensions | Frame geometry | Content behavior | Background behavior |
| --- | --- | --- | --- | --- |
| **Fit to Code** | Project aspect-ratio dimensions, scaled by export quality | A centered frame derived from the longest non-empty line and final non-empty line | The whole code rectangle is contained at the largest safe scale under `maxZoom`; trailing blank lines never enlarge the frame | Full project background, margin, chrome, and code surface remain available |
| **Fill Canvas** | Project aspect-ratio dimensions, scaled by export quality | Exact full-canvas rectangle with zero outer margin | Code is proportionally scaled to occupy the available frame rather than remaining at native size | Full project background and chrome remain available, with the window edges touching the output edges |
| **Code Lines Mode** | Adaptive width from the longest source line and adaptive viewport height from visible lines, scaled by the selected zoom and export quality | The frame is the complete adaptive output surface | The zoom slider directly controls glyph scale; long files use a deterministic follow camera tied to the timeline cursor line | Scene background, window chrome, title bar, and visual FX are suppressed; only code glyphs, line numbers, cursor, and code overlays are recorded |

### Fit to Code

Fit to Code calculates content metrics from actual source lines. The width uses the longest non-trailing line plus gutter and padding. The height uses the final non-empty source line plus line height, padding, and title-bar geometry. The frame is centered in the project canvas and is never expanded to include blank source lines.

The `maxZoom` control is an upper bound rather than a forced scale. If the full content cannot fit, the resolver reduces the scale to the canvas-safe value. If the content is short, the upper bound lets the code remain readable without inventing empty vertical space.

### Fill Canvas

Fill Canvas always assigns the frame rectangle to the entire logical output. The renderer calculates the native content-to-canvas fit scale and applies it to code text, gutter, overlays, and cursor geometry. This fixes the previous behavior where the outer window touched the canvas edges but the code stayed too small inside it.

### Code Lines Mode

Code Lines Mode derives its logical output width from the longest content line and derives its logical output height from a stable line viewport. Short snippets use only the number of lines they need; long snippets use a bounded viewport and scroll as the cursor progresses. The mode intentionally skips the scene background and window layers so the recorded surface contains the code itself rather than a fixed portrait or landscape canvas composition.

The follow camera is deterministic. `getStateAtTime()` exposes both the actual cursor line and a fractional handoff line. `renderFrame()` converts that line into a safe-zone scroll offset, clamps it between the first and last valid viewport positions, and applies the same offset to text, line numbers, highlights, focus overlays, and the cursor. Because the offset is derived from playhead time and timeline events, preview and export produce the same scroll path.

## Verification

The production build, TypeScript compiler, linter, full browser regression suite, and media probes pass. The focused framing regression verifies all three mode selectors and confirms that Code Lines Mode is smaller than the platform canvas and expands when its zoom slider is increased. A dedicated Code Lines export probe verifies an adaptive H.264 MP4 with output dimensions smaller than the standard 1620×2880 High-quality portrait export. The existing media probe continues to verify a playable High-quality MP4 with H.264 video and Opus audio, as well as a playable VP9 WebM.
