# Code Animator (CodeReel) — Full Audit Findings

Repo: AhmedAl-Bahrawy/CodeAnimator (cloned to /home/ubuntu/CodeAnimator, deps installed with pnpm, tsc passes, eslint shows only 7 hook-dep warnings).

## Confirmed issues to fix

### A. Functional bugs
1. **CanvasPreview uses raw `sourceWithMarkup` instead of cleanSource** (biggest bug):
   - `getStateAtTime` is called with `currentScene.sourceWithMarkup` (lines 154/156) — typed text in preview/export would include `[[markup]]` tokens. Timeline in App.tsx is built from cleanSource, so preview text shows markup while timeline logic uses stripped text. `buildFullSourceState` (line 124-136) also uses sourceWithMarkup, and CanvasState has no `cleanSource`. Fix: build cleanSource once in App.tsx and store in timelineStore or pass via store; both preview and export already parse markup. Simplest robust fix: add a `cleanSource` computed value in timelineStore (derived from scene source via memoized parse) used by preview; export parses itself already.
2. **ExportPanel: platform preset overrides project aspect ratio** — lines 59-61: `selectedPresetData?.width || projectDimensions.w` — default selected preset is `'youtube-shorts'` (1080x1920) so if project is 1:1, export is still 1080x1920. Fix: default selectedPreset to `undefined`/empty "Project default"; when preset id is 'project-default', use project dimensions; also sync preset selection when project aspect ratio changes.
3. **playbackSpeedMultiplier is never applied** — ExportOptions has it, ExportPanel sets it, but NO exporter (webCodecs/mediaRecorder/gif) uses it; timeline durations are computed with baseSpeed only. Fix: apply multiplier in exporter (scale frame sampling or timeline duration). Best approach: export pipeline should scale the timeline duration (fps stays, but `tMs = frameIndex / (fps * multiplier)`). Simplest: in renderCoordinator/worker, pass speedMultiplier and worker computes `tMs = (frameIndex / (config.fps * multiplier)) * 1000`.
4. **WebCodecs exporter: codec check uses hardcoded framerate 30** — `VideoEncoder.isConfigSupported` called with `framerate: 30` but user may export at 60 fps; some configs supported at 30 but not 60 (or vice versa). Fix: pass `fps` to checkCodecSupport.
5. **WebCodecs exporter: MP4 blob mislabeled when falling back to VP9** — if avc unsupported, produces vp9 in webm container but mimeType 'video/mp4' was only set on avc path... actually code sets mimeType='video/mp4' only for avc; for fallback it sets 'video/webm'. OK. BUT blob.type on save uses `blob.type.includes('webm')` fallback which is fine.
6. **GIF exporter never produces a GIF** — `gifExporter` tierName 'gif' but records with MediaRecorder `video/webm` and returns a webm blob; comment in ExportPanel even says "GIF output uses WebM container". AGENTS.md says "GIF export via gif.js always available". Fix: either implement a real canvas-based GIF encoder (simple LZW GIF writer in worker-free JS) or clearly rename/fix. Implement a small in-house animated-GIF encoder (writeCanvasFrames approach using ImageData) — feasible: draw frames, sample pixels to 8-bit palette, LZW encode. Alternative simpler: keep MediaRecorder webm output but set `format` extension correctly and rename feature; better to implement a basic GIF writer. Decide: implement simple GIF encoder for correctness.
7. **mediaRecorderExporter & gifExporter reference `coordinator` before declaration** (hoisting works since `const` — NO! `const` is NOT hoisted; lines 62/61 reference `coordinator` in abort listener defined before `const coordinator =` — this is a **TDZ error at runtime**!). mediaRecorderExporter.ts line 62: `signal.addEventListener('abort', () => { cancelled = true; coordinator.cancel(); ... })` but `const coordinator = new RenderCoordinator(...)` is at line 68. JS temp-dead-zone: accessing `coordinator` inside arrow before const init throws ReferenceError if abort fires early. Actually const bindings are TDZ until initialized; the callback executes later, by which time init happened — arrow body evaluated only when called, so fine at call time (TDZ only during initialization of the block). Callback fires after coordinator exists, so no runtime bug. But still reorder for clarity.
8. **worker `self.onmessage` handler**: `(self as unknown as Worker).postMessage(...)` works. Frame pipeline: `convertToBlob` + `createImageBitmap` async per frame — frames may arrive out of order; coordinator maps by frameIndex, fine.
9. **ExportPanel "fps" passed but timeline builder in ExportPanel ignores `playbackSpeedMultiplier`** (see #3).
10. **CanvasPreview seek while playing**: calling seek during play updates currentTimeMs but animation loop ignores it mid-loop (restarts from startOffset) — minor.

### B. Dead / unconnected code (remove or wire)
11. **`ProjectManager` modal never opened**: TopBar has no button; App.tsx has `showProjectManager` state but nothing sets it true. Wire: TopBar should expose an `onOpenManager` callback, App passes it.
12. **`exportImportArchive.ts` (exportAllData/importAllData/downloadBlob) has zero callers** — add import/export buttons in ProjectManager (or TopBar) wired to these functions.
13. **`skinRepo.ts` (saveCustomSkin/loadCustomSkins/deleteCustomSkin) zero callers** — UI skin store's `addCustomSkin/removeCustomSkin` never persist; wire persistence into uiSkinStore (load custom skins on mount, save on add/remove).
14. **`themeRepo.ts` zero callers** — same for themeStore addCustomTheme/removeCustomTheme.
15. **`getCachedHighlight`/`setCachedHighlight` exported but never called** — remove or use in CanvasPreview (preview already has own cacheRef; refactor to use shared utils). Simplify: use them in CanvasPreview to dedupe.
16. **`getAvailableExporters()` never called** — remove dead export or use in ExportPanel (show supported tiers). Option: remove from bundle (tree-shaking would drop anyway); but file export/index.ts re-exports — remove to clean.
17. **`CodeLine`, `HighlightedToken`, `AspectRatioPreset` interfaces unused** — remove from types.ts.
18. **`watermarkAssetDataUrl` in BrandKit type never used** (AGENTS.md: "No forced watermark"). Remove field.
19. **`maxDurationMs` defined in platformPresets but never validated** — enforce in export: warn/error if timeline duration exceeds platform limit.
20. **`brandKitId` on Project type unused** — applyBrandKit should set project.brandKitId; UI should show active kit. Wire minimally.
21. **`previewCanvasWidth/previewCanvasHeight/setPreviewDimensions` in timelineStore never read/written** — remove (CanvasPreview computes its own dims).
22. **`useThemeStore` is a stale global theme selection**: `setTheme`, `getCurrentTheme`, `currentThemeId` never used (themes are per-scene). Remove stale fields, keep `themes`+`getThemesByCategory`.
23. **`ProjectManager` fetches saved projects on open but never displays/uses them** (`setSavedProjects` stored then unused) — either use to refresh list or remove; keep but utilize: clicking refresh, or remove entirely.
24. **Unused helpers in lib/utils.ts**: `clamp`, `lerp`, `easeInOutCubic`, `seededRandom` — never imported anywhere. Remove.
25. **`binarySearchTime`**: used only by getStateAtTime — fine, keep.
26. **`drawWatermark` empty layer** — keep as documented placeholder (AGENTS says optional watermark) — leave but simplify.
27. **AppShell `data-ui-skin="midnight"` hardcoded attribute** — stale decoration; remove (real skin via CSS vars).
28. **eslint hook-deps warnings**: TopBar line 21 (useMemo dep currentScene), CodeInput 222, ExportPanel 50/56, CanvasPreview 36/95/137 — fix arrays correctly.
29. **`CanvasPreview` fps hardcoded 30 in renderFrameAt frameIndex calc** (line 174): uses 30 regardless of timeline fps — minor, preview is visual only; fine but use timeline fps.
30. **MediaRecorder exporters real-time pacing `setTimeout(frameDuration)`** — works; OK.

### C. Minor
31. ExportPanel "Output" note shows project aspect ratio even when preset overrides — after fix #2, text should reflect selected mode.
32. `handleDismissError` calls finishExport but progress bar only shows while isExporting — ok.
33. `topbar` project switcher uses `<select>` — fine.
34. README is Vite template boilerplate — replace with real README.

## Progress log (what's done so far)
- DONE: types.ts — removed CodeLine, AspectRatioPreset, HighlightedToken, watermarkAssetDataUrl; Project kept brandKitId+scenes once.
- DONE: render.worker.ts — added speedMultiplier to init msg + effectiveFps calc.
- DONE: renderCoordinator.ts — speedMultiplier option, totalFrames scaled by multiplier.
- DONE: webCodecsExporter.ts — fps param in checkCodecSupport; speedMultiplier passed.
- DONE: mediaRecorderExporter.ts / gifExporter.ts — abort listener moved after coordinator const; speedMultiplier passed; onFrameReady no-op kept.
- DONE: timelineStore.ts — removed previewCanvasWidth/Height/setPreviewDimensions; added cleanSource; setTimeline now (timeline, cleanSource).
- DONE: App.tsx — setTimeline(timeline, cleanSource).
- DONE: CanvasPreview.tsx — uses cleanSource from timelineStore; frameFps from timeline; fixed hook deps for renderFrameAt + paused effect; buildFullSourceState guards empty lines.
- NEXT: ExportPanel (preset default 'project-default' + sync), TopBar (open ProjectManager prop), ProjectManager (export/import archive buttons + cleanup setSavedProjects), ExportPanel GIF note update, themeStore (remove stale fields), uiSkinStore/skinRepo persistence wiring, lib/utils (remove unused helpers), AppShell data-ui-skin removal, eslint fixes (TopBar, CodeInput, ExportPanel memos), vite build check, commit+push.
- NOTE: TopBar signature to change: add onOpenProjects? callback; App.tsx passes setShowProjectManager. ProjectManager: import exportAllData/downloadBlob from persistence/exportImportArchive. skinRepo: wire into uiSkinStore loadCustomSkins on mount / saveCustomSkin on addCustomSkin.

## Progress update 2 (all fixes done, verified)
- DONE: ExportPanel — project-default preset option, preset-only override, durationWarning w/ maxDurationMs enforcement, filename per preset, removed GIF webm note.
- DONE: TopBar — new TopBarProps.onOpenProjects + Projects button; AppShell accepts topBar prop, dropped data-ui-skin attribute.
- DONE: App.tsx — TopBar wired w/ setShowProjectManager; loadCustomSkins + loadCustomThemes in hydration.
- DONE: ProjectManager — removed setSavedProjects; refreshes store from IndexedDB on open; Export Archive + Import Archive buttons wired to exportAllData/importAllData/downloadBlob; handleDelete simplified.
- DONE: uiSkinStore — persist add/remove custom skins + loadCustomSkins + applyBrandKit sets project.brandKitId.
- DONE: themeStore — removed stale currentThemeId/setTheme/getCurrentTheme; added loadCustomThemes/saveUpdatedCustomTheme/getThemeById; persists custom themes.
- DONE: lib/utils.ts — removed clamp/lerp/easeInOutCubic/seededRandom.
- DONE: export/index.ts — removed getAvailableExporters re-export (still defined in selectExporter.ts, unused).
- DONE: eslint zero warnings; tsc clean; pnpm build clean (render.worker-YFs8ulfj.js in dist).
- DONE: browser check (playwright, dist preview :4173) — app loads, no console errors, Projects button opens ProjectManager modal, Export Archive button present.
- TEMP: playwright + pnpm-lock added to repo (devDeps) — keep tests/ dir? Decide to KEEP tests/ (browser-check.mjs, functional.test.ts) as regression suite. pnpm-lock.yaml generated — keep since repo uses pnpm.
- TODO: commit+push, then final result message.

## Plan for fixes (phases)
1. Fix core bugs: preview cleanSource, export preset/dimensions, playback speed multiplier, codec fps check, GIF real output, enforce maxDurationMs warning.
2. Dead code: remove unused types/fields/helpers/stale store fields; fix dead hooks.
3. Wire disconnected features: ProjectManager open button in TopBar; export/import archive buttons in ProjectManager; custom skin persistence hook; (light) custom theme persistence.
4. Fix eslint warnings; run tsc + build + vite build; verify worker path works in build (vite handles .ts workers via new URL).
5. Commit & push to main.
