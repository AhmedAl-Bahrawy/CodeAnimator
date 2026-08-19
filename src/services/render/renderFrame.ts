import type { CanvasState, CodeTheme, BackgroundPreset, WindowChromeConfig, TypographySettings, TypingConfig, CodeToken } from '@/types/domain';
import { getAnimationFrameMetrics, getCursorVisibility } from '@/services/animation/frameModel';
import { clipTokenLinesToVisibleLines } from './visibleTokens';
import {
  drawBackground,
  drawMargin,
  drawWindowFrame,
  drawCodeSurface,
  drawLineNumbers,
  drawCodeText,
  drawHighlightOverlay,
  drawCursor,
  drawFX,
  drawWatermark,
} from './layers';

export interface RenderFrameOptions {
  ctx: CanvasRenderingContext2D;
  width: number;
  height: number;
  state: CanvasState;
  theme: CodeTheme;
  background: BackgroundPreset;
  windowChrome: WindowChromeConfig;
  typography: TypographySettings;
  typingConfig: TypingConfig;
  skin: import('@/types/domain').UISkin;
  appearance: import('@/types/domain').SceneAppearance;
  frameIndex: number;
  fps: number;
  timeMs: number;
  totalDurationMs: number;
  contentDurationMs?: number;
  visibleLines: string[];
  tokenLines: CodeToken[][] | null;
}

export function renderFrame(options: RenderFrameOptions): void {
  const { ctx, width, height, state, theme, background, windowChrome, typography, typingConfig, skin, appearance, frameIndex, fps, timeMs, totalDurationMs, contentDurationMs, visibleLines, tokenLines } = options;

  ctx.clearRect(0, 0, width, height);

  // Motion is sampled from the same playhead in preview and exports.
  const motion = getAnimationFrameMetrics(timeMs, totalDurationMs, appearance, contentDurationMs ?? totalDurationMs);
  const zoom = state.zoomLevel || 1;
  const cameraScale = zoom * motion.scale;
  const cameraX = motion.translateX;
  const cameraY = motion.translateY;
  const logicalLineHeight = Math.max(1, appearance.lineHeightPx);
  const logicalScale = Math.max(0.1, appearance.contentFitScale);
  const logicalViewportHeight = Math.max(1, height / logicalScale);
  const logicalPadding = appearance.contentPaddingPx;
  const logicalContentHeight = appearance.contentLineCount * logicalLineHeight + logicalPadding * 2;
  const logicalCursorLine = appearance.framingMode === 'code-lines' ? state.cameraLine : state.cursorLine;
  const logicalCursorY = logicalPadding + logicalCursorLine * logicalLineHeight;
  const safeTop = logicalLineHeight * 2;
  const safeBottom = Math.max(safeTop, logicalViewportHeight - logicalLineHeight * 2);
  const maximumNegativeScroll = Math.min(0, logicalViewportHeight - logicalContentHeight);
  let resolvedScrollOffset = state.scrollOffsetPx || 0;

  if (appearance.framingMode === 'code-lines') {
    const desiredScroll = logicalCursorY > safeBottom
      ? safeBottom - logicalCursorY
      : logicalCursorY < safeTop
        ? safeTop - logicalCursorY
        : 0;
    resolvedScrollOffset = Math.max(maximumNegativeScroll, Math.min(0, desiredScroll));
  } else if (typingConfig.autoScroll && logicalCursorY > safeBottom) {
    resolvedScrollOffset = Math.max(maximumNegativeScroll, safeBottom - logicalCursorY);
  }

  const renderCtx = {
    ctx,
    width,
    height,
    state: {
      ...state,
      scrollOffsetPx: resolvedScrollOffset,
      cursorVisible: getCursorVisibility(state, appearance),
    },
    theme,
    background,
    windowChrome,
    typography,
    typingConfig,
    skin,
    appearance,
    frameIndex,
    fps,
    timeMs,
    totalDurationMs,
  };

  // Code Lines Mode deliberately records only the code glyphs and overlays.
  if (appearance.framingMode !== 'code-lines') drawBackground(renderCtx);

  if (cameraScale !== 1 || cameraX !== 0 || cameraY !== 0 || motion.opacity !== 1) {
    ctx.save();
    const cx = width / 2;
    const cy = height / 2;
    ctx.translate(cx + cameraX, cy + cameraY);
    ctx.scale(cameraScale, cameraScale);
    ctx.translate(-cx, -cy);
    ctx.globalAlpha = motion.opacity;
  }

  // The window and scene layers are not part of Code Lines Mode.
  if (appearance.framingMode !== 'code-lines') {
    drawMargin(renderCtx);
    drawWindowFrame(renderCtx);
    drawCodeSurface(renderCtx);
  }

  // Layer 5: Line Numbers
  drawLineNumbers(renderCtx, visibleLines);

  // Layer 6: Syntax Highlighted Text
  drawCodeText(renderCtx, visibleLines, clipTokenLinesToVisibleLines(tokenLines, visibleLines));

  // Layer 7: Highlight/Focus Overlay
  drawHighlightOverlay(renderCtx, visibleLines);

  // Layer 8: Cursor
  drawCursor(renderCtx);

  // Layer 9: FX
  if (appearance.framingMode !== 'code-lines') drawFX(renderCtx);

  // Layer 10: Watermark is part of platform compositions, not raw code-line recordings.
  if (appearance.framingMode !== 'code-lines') drawWatermark(renderCtx);

  // Reset transform if any camera motion was applied.
  if (cameraScale !== 1 || cameraX !== 0 || cameraY !== 0 || motion.opacity !== 1) {
    ctx.restore();
  }
}
