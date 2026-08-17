import type { CanvasState, CodeTheme, BackgroundPreset, WindowChromeConfig, CodeToken } from '@/core/types';
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
  frameIndex: number;
  fps: number;
  visibleLines: string[];
  tokenLines: CodeToken[][] | null;
}

export function renderFrame(options: RenderFrameOptions): void {
  const { ctx, width, height, state, theme, background, windowChrome, frameIndex, fps, visibleLines, tokenLines } = options;

  ctx.clearRect(0, 0, width, height);

  const renderCtx = {
    ctx,
    width,
    height,
    state,
    theme,
    background,
    windowChrome,
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
  drawCursor(renderCtx, visibleLines);

  // Layer 9: FX
  drawFX(renderCtx);

  // Layer 10: Watermark
  drawWatermark(renderCtx);
}
