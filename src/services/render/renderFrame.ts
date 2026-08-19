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

  // Auto-scroll: if cursor goes below 70% of visible area, scroll it into view
  const lineHeight = typography.fontSize * 1.6;
  if (typingConfig.autoScroll && state.cursorLine * lineHeight > height * 0.7) {
    state.scrollOffsetPx = -(state.cursorLine * lineHeight - height * 0.7);
  }

  const renderCtx = {
    ctx,
    width,
    height,
    state: { ...state, cursorVisible: getCursorVisibility(state, appearance) },
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

  // Layer 1: Background remains fixed while the code frame moves inside the void.
  drawBackground(renderCtx);

  if (cameraScale !== 1 || cameraX !== 0 || cameraY !== 0 || motion.opacity !== 1) {
    ctx.save();
    const cx = width / 2;
    const cy = height / 2;
    ctx.translate(cx + cameraX, cy + cameraY);
    ctx.scale(cameraScale, cameraScale);
    ctx.translate(-cx, -cy);
    ctx.globalAlpha = motion.opacity;
  }

  // Layer 2: Outer Margin
  drawMargin(renderCtx);

  // Layer 3: Window Frame
  drawWindowFrame(renderCtx);

  // Layer 4: Code Surface
  drawCodeSurface(renderCtx);

  // Layer 5: Line Numbers
  drawLineNumbers(renderCtx, visibleLines);

  // Layer 6: Syntax Highlighted Text
  drawCodeText(renderCtx, visibleLines, clipTokenLinesToVisibleLines(tokenLines, visibleLines));

  // Layer 7: Highlight/Focus Overlay
  drawHighlightOverlay(renderCtx, visibleLines);

  // Layer 8: Cursor
  drawCursor(renderCtx);

  // Layer 9: FX
  drawFX(renderCtx);

  // Layer 10: Watermark
  drawWatermark(renderCtx);

  // Reset transform if any camera motion was applied.
  if (cameraScale !== 1 || cameraX !== 0 || cameraY !== 0 || motion.opacity !== 1) {
    ctx.restore();
  }
}
