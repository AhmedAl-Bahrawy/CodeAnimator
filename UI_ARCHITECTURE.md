# Workspace Architecture

## Workspace ownership

Code Animator presents its major workflows through explicit feature-owned destinations:

| Workspace | Owns |
| --- | --- |
| Editor | Source editing, language selection, presets, and markup diagnostics |
| Design | Canvas ratio, background, code-window chrome, typography, syntax theme, application skin, brand identity, framing mode, and framing zoom |
| Animate | Reveal mode, speed, cursor behavior, motion presets, FX, audio cues, and live transport |
| Preview | The interactive canvas workspace, pan, zoom, fit, and playback surface |
| Export | Format, quality, frame rate, playback speed, platform dimensions, and media export |
| Projects | Project and scene lifecycle through the application shell |

The desktop right rail contains Design, Animate, and Export. The responsive workspace includes Editor, Design, Animate, Preview, and Export. Preview remains the central live workspace on desktop.

## Framing modes

### Fit to Code

`framingMode: 'fit-code'` is the bounded content composition. The canonical resolver measures the longest non-trailing source line and the final non-empty line, then centers a frame around those bounds. The frame contains the complete code rectangle at the largest safe scale under the user’s maximum zoom. Trailing blank lines do not increase the frame height.

### Fill Canvas

`framingMode: 'fill-canvas'` is the edge-to-edge composition. The frame rectangle is exactly the complete project output rectangle, and the renderer scales the code content proportionally to occupy the frame. The background and window layers remain enabled, but the outer window edges touch all four canvas edges.

### Code Lines Mode

`framingMode: 'code-lines'` records an adaptive code surface rather than a fixed project canvas. The output width follows the longest code line and the output height follows a stable visible-line viewport. Scene background, window chrome, title bar, and FX are suppressed. The Design-panel zoom slider directly controls glyph scale.

For long sources, the camera follows the timeline cursor line. The camera enters a safe-zone scroll when the cursor approaches the lower edge, clamps at the first and last valid source positions, and uses a deterministic line handoff so the movement is smooth rather than a one-frame jump. The same camera offset is applied to preview and all export frames.

## Preview/export rule

The canonical scene resolver calculates frame geometry, adaptive dimensions, content scale, content metrics, and the Code Lines viewport. Both live preview and export workers consume this same appearance model. New framing behavior belongs in `src/services/render` and must not be reconstructed independently in UI components or media exporters.
