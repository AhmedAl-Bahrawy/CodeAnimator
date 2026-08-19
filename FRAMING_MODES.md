# Framing Modes Contract

## Audit findings

The current implementation exposes three values in the style selector but only two values in the Animation panel. The Design panel does not mount the framing controls at all, so the user-visible controls are inconsistent. Saved scenes are also migrated on every fresh runtime through the `codereel-snap-content-framing-v2` migration, which can overwrite a deliberately selected framing mode while testing.

The renderer currently treats `contentFitScale` as both a content scale and a frame-geometry scale. That creates three problems. Fit to Code can be capped by a portrait canvas before it has calculated a true content rectangle, Fill Canvas sets the frame to the full canvas but leaves the code at its native scale, and the existing auto-scroll mutates the replay state using the raw canvas height without accounting for frame geometry or the active scale. The line painters also apply the scroll offset inconsistently: text and line numbers multiply it by the fit scale, while highlight geometry does not.

Preview and export both assume that the project aspect-ratio dimensions are always the recording dimensions. There is no code-lines output contract, no mode-specific background suppression, and no deterministic camera offset that keeps the cursor in view while a long snippet is revealed.

## Three-mode behavior

### Fit to Code

Fit to Code is a bounded content composition. The code window remains inside the selected output canvas with the configured outer margin. The frame rectangle is derived from the longest source line and the last non-empty source line, including gutter, padding, and title bar. The content scale is the largest scale that keeps the whole code rectangle inside the canvas and is capped by the user zoom limit. The frame is centered in both axes. Empty trailing source lines do not contribute to the frame height.

### Fill Canvas

Fill Canvas is an edge-to-edge composition. The frame rectangle is exactly the output rectangle, with no outer margin. The code content is scaled to occupy the available frame while preserving its aspect ratio; it is never left at an unscaled native size. The frame itself is still painted as a window when chrome is enabled, but its outer edges touch all four output edges.

### Code Lines Mode

Code Lines Mode records the code surface rather than a platform canvas. The output dimensions are derived from the code bounds at the selected zoom: width is the measured longest line plus gutter and horizontal padding, and height is the configured viewport line count plus vertical padding. Background and window chrome are suppressed for this mode; only the code surface, line numbers, syntax text, overlays, and cursor are recorded.

Code Lines Mode uses a deterministic follow camera. The output has a stable viewport height, and the camera offset is computed from the current global cursor line, line height, and viewport height. The cursor is kept within a top and bottom safe zone. The offset is clamped so it never scrolls above the first line or below the last visible line, and it is eased from the previous logical offset by the render-time interpolation so preview and export produce the same result for the same playhead. The zoom slider controls the code scale directly in this mode.

## Parity requirements

The same resolved appearance, output dimensions, camera calculation, layer order, and state-to-frame rules must be used by the live preview and all exports. A project canvas is used for Fit to Code and Fill Canvas. Code Lines Mode uses its adaptive output dimensions for both the preview bitmap and the exported media file.
