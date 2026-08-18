import type { CanvasState, CodeTheme, BackgroundPreset, WindowChromeConfig, TypographySettings, TypingConfig, CodeToken } from '@/core/types';
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
  skin: import('@/core/types').UISkin;
  appearance: import('@/core/types').SceneAppearance;
  frameIndex: number;
  fps: number;
  visibleLines: string[];
  tokenLines: CodeToken[][] | null;
}

export function renderFrame(options: RenderFrameOptions): void {
  const { ctx, width, height, state, theme, background, windowChrome, typography, typingConfig, skin, appearance, frameIndex, fps, visibleLines, tokenLines } = options;

  ctx.clearRect(0, 0, width, height);

  // Apply zoom transform
  const zoom = state.zoomLevel || 1;
  if (zoom !== 1) {
    ctx.save();
    const cx = width / 2;
    const cy = height / 2;
    ctx.translate(cx, cy);
    ctx.scale(zoom, zoom);
    ctx.translate(-cx, -cy);
  }

  // Auto-scroll: if cursor goes below 70% of visible area, scroll it into view
  const lineHeight = typography.fontSize * 1.6;
  if (typingConfig.autoScroll && state.cursorLine * lineHeight > height * 0.7) {
    state.scrollOffsetPx = -(state.cursorLine * lineHeight - height * 0.7);
  }

  const renderCtx = {
    ctx,
    width,
    height,
    state,
    theme,
    background,
    windowChrome,
    typography,
    typingConfig,
    skin,
    appearance,
    frameIndex,
    fps,
  };

  // Layer 1: Background
  drawBackground(renderCtx);

  // Layer 2: Outer Margin
  drawMargin(renderCtx);

  // Layer 3: Window Frame
  drawWindowFrame(renderCtx);

  // Layer 4: Code Surface
  drawCodeSurface(renderCtx);

  // Layer 5: Line Numbers
  drawLineNumbers(renderCtx, visibleLines);

  // Layer 6: Syntax Highlighted Text
  drawCodeText(renderCtx, visibleLines, tokenLines);

  // Layer 7: Highlight/Focus Overlay
  drawHighlightOverlay(renderCtx, visibleLines);

  // Layer 8: Cursor
  drawCursor(renderCtx);

  // Layer 9: FX
  drawFX(renderCtx);

  // Layer 10: Watermark
  drawWatermark(renderCtx);

  // Reset transform if zoom was applied
  if (zoom !== 1) {
    ctx.restore();
  }
}
