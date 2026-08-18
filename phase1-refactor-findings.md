# CodeReel second refactor findings

## Reproduced behavior

The editor accepts visible source and does not show markup tokens. The preview canvas exists and uses the project dimensions, but the visual model is still not identical to CodeMirror: canvas layout uses independent constants (`GUTTER_WIDTH`, `LINE_HEIGHT_MULT`, fixed title-bar height, and a fixed mono font fallback), while CodeMirror uses CSS typography and its own measured gutters/padding. The canvas code surface still uses `CodeTheme.background` while the editor surface uses a mixture of code theme and skin tokens, so Style and Skin changes can produce different surfaces.

The current MP4 flow can download `codereel-export.webm` when H.264 is unavailable, even though the user selected MP4. This is technically a compatible fallback but is not communicated before download. The browser export harness also revealed that export controls need to be exercised by selecting the format before clicking Export; the previous smoke test only tested the initially selected MP4 button. A subsequent all-format run timed out waiting for a download, indicating the export UI needs deterministic completion/error states and the test needs to wait for the panel state as well as the download event.

The old WebCodecs implementation emitted raw encoded chunks without a container. This second pass replaced it with MP4/WebM muxing, and the GIF path was replaced with a real gifenc implementation, but they still require browser verification after the latest build. The playback-speed math was also corrected: output frame count is now duration × FPS ÷ speed and the worker samples timeline time by multiplying source time by speed.

## Required canonical contract

A single `SceneAppearance`/render model must provide the editor and canvas with the same visible source, font family, font size, line height in pixels, letter spacing, code background, foreground, token palette, gutter width, code padding, line-number color, selection color, cursor color, border, and shell/chrome colors. Canvas geometry must be derived from the same CSS-like metrics rather than independent constants. A Skin is the global appearance token source; Style is the scene-level composition and typography override. Both must be resolved into one final appearance object before rendering.

Exports must consume the exact same resolved appearance and frame renderer as the preview. Every exporter must return a valid container whose MIME type, extension, and UI status agree. If MP4 is unavailable and a WebM fallback is used, the UI must explicitly say so before/after download; GIF must be a real image/gif blob; WebM must be a valid EBML container.
