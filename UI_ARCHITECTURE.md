# UI Architecture and Content-Snapped Framing

## Workspace ownership

Code Animator now presents the major workflows through explicit feature-owned destinations:

| Workspace | Owns |
| --- | --- |
| Editor | Source editing, language selection, presets, and markup diagnostics |
| Design | Canvas ratio, background, code-window chrome, typography, syntax theme, application skin, and brand identity |
| Animate | Reveal mode, speed, cursor behavior, motion presets, FX, audio cues, and live transport |
| Preview | The interactive canvas workspace, pan, zoom, fit, and playback surface |
| Export | Format, quality, frame rate, playback speed, platform dimensions, and media export |
| Projects | Project and scene lifecycle through the application shell |

The desktop right rail contains Design, Animate, and Export. The responsive workspace includes Editor, Design, Animate, Preview, and Export. Preview remains the central live workspace on desktop.

## Framing modes

### Snap to content

`framingMode: 'snap-content'` is the default. The frame width reaches the output width, while its height is derived from the actual non-empty source line count and longest visible line. The frame is bottom-anchored, so the final code line determines the lower boundary rather than unused canvas height.

The renderer keeps title-bar and code padding inside the calculated frame. The scale is selected from content width and a bounded content-height target; long files remain constrained by the canvas, while short snippets receive a larger readable scale.

### Edge-to-edge

`framingMode: 'fill-canvas'` remains available for intentional full-canvas presentations. It uses the complete output rectangle and is useful when the background should be fully covered by the code surface.

### Fit to code

`framingMode: 'fit-code'` preserves the adaptive content framing behavior for layouts that should show the entire code block with surrounding background. It remains available for manual composition and comparison.

## Preview/export rule

The canonical scene resolver calculates `frameX`, `frameY`, `frameWidthPx`, `frameHeightPx`, and `contentFitScale`. Both live preview and export workers consume this same appearance model. New framing behavior must be implemented in the scene resolver rather than patched separately in canvas or media exporters.
