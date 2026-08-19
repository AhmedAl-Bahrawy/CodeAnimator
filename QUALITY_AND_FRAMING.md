# Export Quality and Adaptive Framing

## Quality profiles

Code Animator now exposes two video export profiles. **High quality** renders video at 1.5× the logical project dimensions, uses a 24 Mbps target video bitrate, 192 kbps audio when AAC is available, and a two-second keyframe interval. **Ultra quality** renders at 2× dimensions, uses a 40 Mbps target video bitrate, 256 kbps audio when AAC is available, and a one-second keyframe interval.

The selected profile is carried through `ExportOptions.quality`. `ExportPanel` computes the final even output dimensions, `webCodecsExporter` applies the profile to native VP9/H.264 configuration, `h264Mp4Fallback` applies the bitrate and GOP settings to the WASM encoder, and the MediaRecorder fallback uses the same video bitrate. GIF intentionally retains the logical canvas dimensions because scaling indexed-color GIFs multiplies memory and file size without improving color fidelity.

MP4 audio uses the selected profile’s audio bitrate and retains the existing AAC-first, Opus-fallback strategy. The audio track is built from the same timeline cue positions and playback-speed multiplier as the rendered animation.

## Adaptive framing

`resolveAdaptiveFrame()` remains the single source of truth for preview and export geometry. In `fit-code` mode, the resolver first calculates the true scale required to contain all source lines. It then applies a bounded minimum occupancy target: short snippets target up to 84% of the available canvas width while the target gradually falls to 48% as source line count grows. The final scale is clamped by the canvas bounds and the scene’s `maxZoom` value.

This prevents a two-line snippet from becoming a tiny centered window in a portrait export while ensuring long files still fit without clipping. The same calculation is reused by `resizeSceneAppearance()` for scaled exports, so the preview and exported frames preserve their relative composition.

## Verification

The production build and all existing regressions passed after the change. The media probe confirmed a High-quality MP4 at 1620×2880 with H.264 video and an audio stream, and a matching 1620×2880 WebM with VP9 video. The focused framing probe measured visible code pixels centered in a substantially larger footprint than the previous compact fit-to-code behavior.

## Edge-to-edge framing

The default presentation mode is now **Edge-to-edge** (`fill-canvas`). In this mode the canonical frame uses the complete output width and height, the outer window margin is removed, and the code surface reaches all four canvas boundaries. Existing saved projects receive a one-time migration through `codereel-edge-to-edge-framing-v1`; users can still select **Fit to code** when they prefer visible background around the window.

The preview and all scaled export paths resolve the same full-canvas frame, so the edge contact is preserved in MP4, WebM, GIF, and the live canvas.
