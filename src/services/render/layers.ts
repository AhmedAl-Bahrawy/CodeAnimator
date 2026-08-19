import type { RenderContext, CodeToken } from '@/types/domain';


// ====== Layer 1: Scene Background ======
export function drawBackground(ctx: RenderContext): void {
  const { ctx: c, width, height, background } = ctx;

  if (background.type === 'solid') {
    c.fillStyle = background.value;
    c.fillRect(0, 0, width, height);
  } else if (background.type === 'gradient') {
    const grad = createCanvasGradient(c, background.value, width, height);
    if (grad) {
      c.fillStyle = grad;
      c.fillRect(0, 0, width, height);
    } else {
      c.fillStyle = background.value;
      c.fillRect(0, 0, width, height);
    }
  } else {
    c.fillStyle = background.value || '#0d1117';
    c.fillRect(0, 0, width, height);
  }
}

// ====== Layer 2: Outer Margin ======
export function drawMargin(ctx: RenderContext): void {
  const { ctx: c, width, height, windowChrome, skin } = ctx;
  const { frameX, frameY, frameW, frameH } = getFrameGeometry(ctx);
  if (frameX <= 0 && frameY <= 0) return;

  // Draw margin as a ring around the canonical adaptive frame, not a translucent overlay
  const r = windowChrome.borderRadius;

  c.save();
  c.fillStyle = windowChrome.marginFill && windowChrome.marginFill !== 'transparent'
    ? windowChrome.marginFill
    : skin.tokens.bgBase;
  c.beginPath();
  c.rect(0, 0, width, height);
  c.roundRect(frameX, frameY, frameW, frameH, r > 0 ? r + 4 : 0);
  c.fill('evenodd');
  c.restore();
}

// ====== Helper: Compute frame geometry ======
function getFrameGeometry(ctx: RenderContext) {
  const { appearance } = ctx;
  const fit = appearance.contentFitScale;
  const titleBarHeight = appearance.titleBarHeightPx * fit;
  const lineHeight = appearance.lineHeightPx * fit;

  const frameX = appearance.frameX;
  const frameY = appearance.frameY;
  const frameW = appearance.frameWidthPx;
  const frameH = appearance.frameHeightPx;

  return {
    frameX,
    frameY,
    frameW,
    frameH,
    contentX: frameX,
    contentY: frameY + titleBarHeight,
    contentW: frameW,
    contentH: Math.max(1, frameH - titleBarHeight),
    titleBarHeight,
    codeX: frameX + (appearance.gutterWidthPx + appearance.contentPaddingPx) * fit,
    codeY: frameY + titleBarHeight + appearance.contentPaddingPx * fit,
    lineHeight,
  };
}

// ====== Layer 3: Window Frame ======
export function drawWindowFrame(ctx: RenderContext): void {
  const { ctx: c, windowChrome, theme, skin } = ctx;
  const { frameX, frameY, frameW, frameH, titleBarHeight } = getFrameGeometry(ctx);

  // Drop shadow
  if (windowChrome.shadowIntensity > 0) {
    c.save();
    c.shadowColor = `rgba(0, 0, 0, ${windowChrome.shadowIntensity})`;
    c.shadowBlur = 24;
    c.shadowOffsetX = 0;
    c.shadowOffsetY = 8;
    c.fillStyle = ctx.appearance.codeBackground;
    c.beginPath();
    c.roundRect(frameX, frameY, frameW, frameH, windowChrome.borderRadius);
    c.fill();
    c.restore();
  }

  // Title bar background
  if (windowChrome.style !== 'none') {
    c.fillStyle = skin.tokens.bgElevated || ctx.appearance.codeBackground || adjustBrightness(theme.background, -12);
    c.beginPath();
    c.roundRect(frameX, frameY, frameW, titleBarHeight,
      [windowChrome.borderRadius, windowChrome.borderRadius, 0, 0]);
    c.fill();

    // Separator line
    c.strokeStyle = ctx.appearance.border || adjustBrightness(theme.background, 20);
    c.lineWidth = 1;
    c.beginPath();
    c.moveTo(frameX, frameY + titleBarHeight);
    c.lineTo(frameX + frameW, frameY + titleBarHeight);
    c.stroke();
  }

  // Window chrome controls
  if (windowChrome.style === 'macos') {
    drawMacOSControls(c, frameX + 16, frameY + titleBarHeight / 2);
  } else if (windowChrome.style === 'windows') {
    drawWindowsControls(c, frameX + frameW - 16, frameY + titleBarHeight / 2);
  } else if (windowChrome.style === 'terminal') {
    drawTerminalControls(c, frameX + 16, frameY + titleBarHeight / 2, windowChrome.title, theme, ctx.appearance.monoFontFamily);
  }

  // Title text (for non-terminal styles)
  if (windowChrome.title && windowChrome.style !== 'terminal') {
    c.fillStyle = ctx.appearance.codeForeground;
    c.globalAlpha = 0.5;
    c.font = `12px ${ctx.appearance.monoFontFamily}`;
    c.textAlign = 'center';
    c.fillText(windowChrome.title, frameX + frameW / 2, frameY + titleBarHeight / 2 + 4);
    c.textAlign = 'left';
    c.globalAlpha = 1;
  }
}

function drawMacOSControls(c: CanvasRenderingContext2D, x: number, cy: number) {
  const r = 6;
  const gap = 20;

  c.fillStyle = '#ff5f57';
  c.beginPath(); c.arc(x, cy, r, 0, Math.PI * 2); c.fill();

  c.fillStyle = '#ffbd2e';
  c.beginPath(); c.arc(x + gap, cy, r, 0, Math.PI * 2); c.fill();

  c.fillStyle = '#28c840';
  c.beginPath(); c.arc(x + gap * 2, cy, r, 0, Math.PI * 2); c.fill();
}

function drawWindowsControls(c: CanvasRenderingContext2D, x: number, cy: number) {
  const size = 10;
  const gap = 18;

  // Minimize
  c.strokeStyle = '#aaa';
  c.lineWidth = 1.5;
  c.beginPath(); c.moveTo(x - gap * 2 - size / 2, cy); c.lineTo(x - gap * 2 + size / 2, cy); c.stroke();

  // Maximize
  c.beginPath(); c.rect(x - gap - size / 2, cy - size / 2, size, size); c.stroke();

  // Close
  c.beginPath(); c.moveTo(x - size / 2, cy - size / 2); c.lineTo(x + size / 2, cy + size / 2); c.stroke();
  c.beginPath(); c.moveTo(x + size / 2, cy - size / 2); c.lineTo(x - size / 2, cy + size / 2); c.stroke();
}

function drawTerminalControls(
  c: CanvasRenderingContext2D,
  x: number,
  cy: number,
  title: string,
  theme: import('@/types/domain').CodeTheme,
  monoFontFamily: string,
) {
  const r = 6;
  const gap = 20;

  // Terminal-style colored dots
  c.fillStyle = '#ff5f57';
  c.beginPath(); c.arc(x, cy, r, 0, Math.PI * 2); c.fill();

  c.fillStyle = '#ffbd2e';
  c.beginPath(); c.arc(x + gap, cy, r, 0, Math.PI * 2); c.fill();

  c.fillStyle = '#28c840';
  c.beginPath(); c.arc(x + gap * 2, cy, r, 0, Math.PI * 2); c.fill();

  // Terminal prompt-style title
  if (title) {
    c.fillStyle = theme.ansi.green || '#50fa7b';
    c.font = `bold 12px ${monoFontFamily}`;
    c.textAlign = 'left';
    c.fillText(`~ ${title}`, x + gap * 3 + 12, cy + 4);
    c.textAlign = 'left';
  }
}

// ====== Layer 4: Code Surface ======
export function drawCodeSurface(ctx: RenderContext): void {
  const { ctx: c, appearance } = ctx;
  const { contentX, contentY, contentW, contentH } = getFrameGeometry(ctx);

  c.fillStyle = appearance.codeBackground;
  c.fillRect(contentX, contentY, contentW, contentH);
}

// ====== Layer 5: Line Numbers ======
export function drawLineNumbers(ctx: RenderContext, visibleLines: string[]): void {
  const { ctx: c, state, appearance } = ctx;
  const { contentX, contentY, lineHeight } = getFrameGeometry(ctx);
  const fit = appearance.contentFitScale;
  const padding = appearance.contentPaddingPx * fit;
  const scrollY = (state.scrollOffsetPx || 0) * fit;

  c.fillStyle = appearance.gutterForeground;
  c.font = `${Math.max(8, (appearance.fontSizePx - 1) * fit)}px ${appearance.monoFontFamily}`;
  c.textAlign = 'right';

  for (let i = 0; i < visibleLines.length; i++) {
    const y = contentY + padding + i * lineHeight + lineHeight * 0.82 + scrollY;
    c.fillText(String(i + 1), contentX + appearance.gutterWidthPx * fit - 10 * fit, y);
  }

  c.textAlign = 'left';
}

// ====== Layer 6: Syntax Highlighted Text ======
export function drawCodeText(
  ctx: RenderContext,
  visibleLines: string[],
  tokenLines: CodeToken[][] | null
): void {
  const { ctx: c, state, appearance } = ctx;
  const { contentX, contentY, lineHeight } = getFrameGeometry(ctx);
  const fit = appearance.contentFitScale;
  const padding = appearance.contentPaddingPx * fit;
  const scrollY = (state.scrollOffsetPx || 0) * fit;

  c.font = `${appearance.fontSizePx * fit}px ${appearance.monoFontFamily}`;
  c.letterSpacing = `${appearance.letterSpacingPx * fit}px`;

  for (let lineIdx = 0; lineIdx < visibleLines.length; lineIdx++) {
    const y = contentY + padding + lineIdx * lineHeight + lineHeight * 0.82 + scrollY;
    const x = contentX + (appearance.gutterWidthPx + appearance.contentPaddingPx) * fit;

    if (tokenLines && tokenLines[lineIdx]) {
      let xPos = x;
      for (const token of tokenLines[lineIdx]) {
        c.fillStyle = token.color || appearance.codeForeground;
        c.fillText(token.content, xPos, y);
        xPos += c.measureText(token.content).width;
      }
    } else {
      c.fillStyle = appearance.codeForeground;
      c.fillText(visibleLines[lineIdx] || '', x, y);
    }
  }

  c.letterSpacing = '0px';
}

// ====== Layer 7: Highlight/Focus Overlay ======
export function drawHighlightOverlay(ctx: RenderContext, visibleLines: string[]): void {
  const { ctx: c, state, appearance } = ctx;
  if (!state.activeHighlightRange && state.focusLine === null) return;

  const { contentX, contentY, contentW, contentH, lineHeight } = getFrameGeometry(ctx);
  const padding = appearance.contentPaddingPx;
  const scrollY = state.scrollOffsetPx || 0;

  // Dim overlay for focus mode
  if (state.focusLine !== null) {
    const focusY = contentY + padding + state.focusLine * lineHeight + scrollY;

    c.fillStyle = 'rgba(0, 0, 0, 0.55)';
    c.fillRect(contentX, contentY, contentW, Math.max(0, focusY - contentY));
    c.fillRect(contentX, focusY + lineHeight, contentW, Math.max(0, (contentY + contentH) - focusY - lineHeight));
  }

  // Highlight range
  if (state.activeHighlightRange) {
    const [start, end] = state.activeHighlightRange;
    c.fillStyle = appearance.selectionColor;

    for (let i = start; i <= end && i < visibleLines.length; i++) {
      const y = contentY + padding + i * lineHeight + scrollY;
      c.fillRect(contentX, y, contentW, lineHeight);
    }
  }
}

// ====== Layer 8: Cursor ======
export function drawCursor(ctx: RenderContext): void {
  const { ctx: c, state, appearance, typingConfig } = ctx;
  const { contentX, contentY, lineHeight } = getFrameGeometry(ctx);
  const fit = appearance.contentFitScale;
  const padding = appearance.contentPaddingPx * fit;
  const scrollY = (state.scrollOffsetPx || 0) * fit;

  if (!state.cursorVisible) return;

  c.font = `${appearance.fontSizePx * fit}px ${appearance.monoFontFamily}`;
  const charWidth = c.measureText('M').width + appearance.letterSpacingPx * fit;
  const cursorX = contentX + (appearance.gutterWidthPx + appearance.contentPaddingPx) * fit + state.cursorCol * charWidth;
  const cursorY = contentY + padding + state.cursorLine * lineHeight + scrollY;
  const cursorH = Math.max(2, lineHeight - 4 * fit);

  c.fillStyle = appearance.cursorColor;

  const cursorStyle = typingConfig.cursorStyle || 'bar';
  switch (cursorStyle) {
    case 'block': {
      c.globalAlpha = 0.3;
      c.fillRect(cursorX, cursorY + 2, charWidth, lineHeight - 4);
      c.globalAlpha = 1;
      break;
    }
    case 'underscore': {
      c.fillRect(cursorX, cursorY + lineHeight - 4 * fit, charWidth, Math.max(1, 3 * fit));
      break;
    }
    case 'bar':
    default: {
      c.fillRect(cursorX, cursorY + 2 * fit, Math.max(1, 3 * fit), cursorH);
      break;
    }
  }
}

// ====== Layer 9: FX Layer ======
export function drawFX(ctx: RenderContext): void {
  const { ctx: c, width, height, windowChrome, timeMs, appearance } = ctx;
  const intensity = Math.max(0, Math.min(1, appearance.fxIntensity));
  if (appearance.fxPreset === 'none' && windowChrome.style !== 'terminal') return;

  const isCrt = appearance.fxPreset === 'crt' || windowChrome.style === 'terminal';
  const isAcademy = appearance.fxPreset === 'academy-glow';
  const isNeon = appearance.fxPreset === 'neon';
  const isPaper = appearance.fxPreset === 'paper';

  if (isCrt) {
    c.fillStyle = `rgba(0, 0, 0, ${0.04 * intensity})`;
    for (let y = 0; y < height; y += 3) c.fillRect(0, y, width, 1);
    const vignette = c.createRadialGradient(width / 2, height / 2, width * 0.3, width / 2, height / 2, width * 0.8);
    vignette.addColorStop(0, 'rgba(0, 0, 0, 0)');
    vignette.addColorStop(1, `rgba(0, 0, 0, ${0.25 * intensity})`);
    c.fillStyle = vignette;
    c.fillRect(0, 0, width, height);
  }

  if (isAcademy || isNeon) {
    const glow = c.createRadialGradient(width / 2, height * 0.35, 0, width / 2, height * 0.35, Math.max(width, height) * 0.7);
    const glowColor = isAcademy ? '229, 182, 92' : '41, 169, 255';
    glow.addColorStop(0, `rgba(${glowColor}, ${0.09 * intensity})`);
    glow.addColorStop(1, 'rgba(0, 0, 0, 0)');
    c.fillStyle = glow;
    c.fillRect(0, 0, width, height);
  }

  if (isPaper) {
    c.fillStyle = `rgba(255, 255, 255, ${0.035 * intensity})`;
    c.fillRect(0, 0, width, height);
  }

  // Use a slow deterministic pulse keyed to playhead time; never to frame arrival.
  const pulse = (Math.sin(timeMs / 1100) + 1) * 0.5;
  if (isCrt && pulse > 0.5) {
    c.fillStyle = `rgba(255, 255, 255, ${0.003 * intensity * pulse})`;
    c.fillRect(0, 0, width, height);
  }
}

// ====== Layer 10: Branding/Watermark ======
export function drawWatermark(_ctx: RenderContext): void {
  // Optional user watermark
  void _ctx;
}

// ====== Helper Functions ======
function createCanvasGradient(
  ctx: CanvasRenderingContext2D,
  cssGradient: string,
  width: number,
  height: number
): CanvasGradient | null {
  // Handle linear-gradient
  const linearMatch = cssGradient.match(/linear-gradient\((.+)\)/);
  if (linearMatch) {
    const parts = linearMatch[1].split(',').map(s => s.trim());
    if (parts.length < 2) return null;

    // Parse angle or direction
    let angle = 135; // default diagonal
    const firstPart = parts[0];
    if (firstPart.includes('deg')) {
      angle = parseFloat(firstPart);
    } else if (firstPart.includes('to bottom')) {
      angle = 180;
    } else if (firstPart.includes('to right')) {
      angle = 90;
    } else if (firstPart.includes('to top')) {
      angle = 0;
    }

    const rad = (angle * Math.PI) / 180;
    const cos = Math.cos(rad);
    const sin = Math.sin(rad);
    const grad = ctx.createLinearGradient(
      width / 2 - cos * width / 2, height / 2 - sin * height / 2,
      width / 2 + cos * width / 2, height / 2 + sin * height / 2
    );

    const colorStops = parts.slice(firstPart.includes('deg') || firstPart.includes('to') ? 1 : 0);
    let stopIdx = 0;
    for (const part of colorStops) {
      const colorMatch = part.match(/(#[0-9a-fA-F]{3,8}|rgba?\(.+?\)|[a-z]+)/);
      if (colorMatch) {
        const position = colorStops.length > 1 ? stopIdx / (colorStops.length - 1) : 0;
        grad.addColorStop(position, colorMatch[1]);
        stopIdx++;
      }
    }

    return grad;
  }

  // Handle radial-gradient
  const radialMatch = cssGradient.match(/radial-gradient\((.+)\)/);
  if (radialMatch) {
    const grad = ctx.createRadialGradient(width / 2, height / 2, 0, width / 2, height / 2, width / 2);
    const parts = radialMatch[1].split(',').map(s => s.trim());
    let stopIdx = 0;
    for (const part of parts) {
      const colorMatch = part.match(/(#[0-9a-fA-F]{3,8}|rgba?\(.+?\)|[a-z]+)/);
      if (colorMatch) {
        const position = parts.length > 1 ? stopIdx / (parts.length - 1) : 0;
        grad.addColorStop(position, colorMatch[1]);
        stopIdx++;
      }
    }
    return grad;
  }

  return null;
}

function adjustBrightness(hex: string, amount: number): string {
  // Strip alpha channel if present
  const cleanHex = hex.replace(/[^#0-9a-fA-F]/g, '').substring(0, 7);
  const num = parseInt(cleanHex.replace('#', ''), 16);
  if (isNaN(num)) return hex;
  const r = Math.min(255, Math.max(0, ((num >> 16) & 0xff) + amount));
  const g = Math.min(255, Math.max(0, ((num >> 8) & 0xff) + amount));
  const b = Math.min(255, Math.max(0, (num & 0xff) + amount));
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, '0')}`;
}
