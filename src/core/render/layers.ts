import type { RenderContext, CodeToken } from '@/core/types';

const MONO_FONT = '"SF Mono", "Fira Code", "Cascadia Code", "JetBrains Mono", monospace';
const LINE_HEIGHT_MULT = 1.6;
const GUTTER_WIDTH = 52;

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
  const { ctx: c, width, height, windowChrome } = ctx;
  const m = windowChrome.margin;
  if (m <= 0) return;

  // Draw margin as a ring around the window frame, not a translucent overlay
  const frameX = m;
  const frameY = m;
  const frameW = width - m * 2;
  const frameH = height - m * 2;
  const r = windowChrome.borderRadius;

  c.save();
  c.fillStyle = windowChrome.marginFill || 'transparent';
  c.beginPath();
  c.rect(0, 0, width, height);
  c.roundRect(frameX, frameY, frameW, frameH, r > 0 ? r + 4 : 0);
  c.fill('evenodd');
  c.restore();
}

// ====== Helper: Compute frame geometry ======
function getFrameGeometry(ctx: RenderContext) {
  const { width, height, windowChrome, typography } = ctx;
  const m = windowChrome.margin;
  const hasTitleBar = windowChrome.style !== 'none';
  const titleBarHeight = hasTitleBar ? 38 : 0;
  const lineHeight = typography.fontSize * LINE_HEIGHT_MULT;

  return {
    frameX: m,
    frameY: m,
    frameW: width - m * 2,
    frameH: height - m * 2,
    contentX: m,
    contentY: m + titleBarHeight,
    contentW: width - m * 2,
    contentH: height - m * 2 - titleBarHeight,
    titleBarHeight,
    codeX: m + GUTTER_WIDTH + windowChrome.padding,
    codeY: m + titleBarHeight + windowChrome.padding,
    lineHeight,
  };
}

// ====== Layer 3: Window Frame ======
export function drawWindowFrame(ctx: RenderContext): void {
  const { ctx: c, windowChrome, theme } = ctx;
  const { frameX, frameY, frameW, frameH, titleBarHeight } = getFrameGeometry(ctx);

  // Drop shadow
  if (windowChrome.shadowIntensity > 0) {
    c.save();
    c.shadowColor = `rgba(0, 0, 0, ${windowChrome.shadowIntensity})`;
    c.shadowBlur = 24;
    c.shadowOffsetX = 0;
    c.shadowOffsetY = 8;
    c.fillStyle = theme.background;
    c.beginPath();
    c.roundRect(frameX, frameY, frameW, frameH, windowChrome.borderRadius);
    c.fill();
    c.restore();
  }

  // Title bar background
  if (windowChrome.style !== 'none') {
    c.fillStyle = adjustBrightness(theme.background, -12);
    c.beginPath();
    c.roundRect(frameX, frameY, frameW, titleBarHeight,
      [windowChrome.borderRadius, windowChrome.borderRadius, 0, 0]);
    c.fill();

    // Separator line
    c.strokeStyle = adjustBrightness(theme.background, 20);
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
    drawTerminalControls(c, frameX + 16, frameY + titleBarHeight / 2, windowChrome.title, theme);
  }

  // Title text (for non-terminal styles)
  if (windowChrome.title && windowChrome.style !== 'terminal') {
    c.fillStyle = theme.foreground;
    c.globalAlpha = 0.5;
    c.font = `12px ${MONO_FONT}`;
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
  theme: import('@/core/types').CodeTheme
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
    c.font = `bold 12px ${MONO_FONT}`;
    c.textAlign = 'left';
    c.fillText(`~ ${title}`, x + gap * 3 + 12, cy + 4);
    c.textAlign = 'left';
  }
}

// ====== Layer 4: Code Surface ======
export function drawCodeSurface(ctx: RenderContext): void {
  const { ctx: c, theme } = ctx;
  const { contentX, contentY, contentW, contentH } = getFrameGeometry(ctx);

  c.fillStyle = theme.background;
  c.fillRect(contentX, contentY, contentW, contentH);
}

// ====== Layer 5: Line Numbers ======
export function drawLineNumbers(ctx: RenderContext, visibleLines: string[]): void {
  const { ctx: c, state, windowChrome, theme, typography } = ctx;
  const { contentX, contentY, lineHeight } = getFrameGeometry(ctx);
  const padding = windowChrome.padding;
  const scrollY = state.scrollOffsetPx || 0;

  c.fillStyle = theme.lineNumberColor || adjustAlpha(theme.foreground, 0.25);
  c.font = `${typography.fontSize - 1}px ${MONO_FONT}`;
  c.textAlign = 'right';

  for (let i = 0; i < visibleLines.length; i++) {
    const y = contentY + padding + i * lineHeight + lineHeight * 0.82 + scrollY;
    c.fillText(String(i + 1), contentX + GUTTER_WIDTH - 10, y);
  }

  c.textAlign = 'left';
}

// ====== Layer 6: Syntax Highlighted Text ======
export function drawCodeText(
  ctx: RenderContext,
  visibleLines: string[],
  tokenLines: CodeToken[][] | null
): void {
  const { ctx: c, state, windowChrome, theme, typography } = ctx;
  const { contentX, contentY, lineHeight } = getFrameGeometry(ctx);
  const padding = windowChrome.padding;
  const scrollY = state.scrollOffsetPx || 0;

  c.font = `${typography.fontSize}px ${typography.fontFamily || MONO_FONT}`;
  c.letterSpacing = `${typography.letterSpacing || 0}px`;

  for (let lineIdx = 0; lineIdx < visibleLines.length; lineIdx++) {
    const y = contentY + padding + lineIdx * lineHeight + lineHeight * 0.82 + scrollY;
    const x = contentX + GUTTER_WIDTH;

    if (tokenLines && tokenLines[lineIdx]) {
      let xPos = x;
      for (const token of tokenLines[lineIdx]) {
        c.fillStyle = token.color || theme.foreground;
        c.fillText(token.content, xPos, y);
        xPos += c.measureText(token.content).width;
      }
    } else {
      c.fillStyle = theme.foreground;
      c.fillText(visibleLines[lineIdx] || '', x, y);
    }
  }

  c.letterSpacing = '0px';
}

// ====== Layer 7: Highlight/Focus Overlay ======
export function drawHighlightOverlay(ctx: RenderContext, visibleLines: string[]): void {
  const { ctx: c, state, windowChrome, theme } = ctx;
  if (!state.activeHighlightRange && state.focusLine === null) return;

  const { contentX, contentY, contentW, contentH, lineHeight } = getFrameGeometry(ctx);
  const padding = windowChrome.padding;
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
    c.fillStyle = theme.selectionColor || 'rgba(99, 102, 241, 0.15)';

    for (let i = start; i <= end && i < visibleLines.length; i++) {
      const y = contentY + padding + i * lineHeight + scrollY;
      c.fillRect(contentX, y, contentW, lineHeight);
    }
  }
}

// ====== Layer 8: Cursor ======
export function drawCursor(ctx: RenderContext): void {
  const { ctx: c, state, windowChrome, theme, typography, typingConfig, frameIndex, fps } = ctx;
  const { contentX, contentY, lineHeight } = getFrameGeometry(ctx);
  const padding = windowChrome.padding;
  const scrollY = state.scrollOffsetPx || 0;

  const blinkCycle = Math.round(fps * (typingConfig.cursorBlinkRate || 0.7));
  const blinkFrame = frameIndex % blinkCycle;
  const isVisible = blinkFrame < blinkCycle / 2;
  if (!isVisible) return;

  c.font = `${typography.fontSize}px ${typography.fontFamily || MONO_FONT}`;
  const charWidth = c.measureText('M').width;
  const cursorX = contentX + GUTTER_WIDTH + state.cursorCol * charWidth;
  const cursorY = contentY + padding + state.cursorLine * lineHeight + scrollY;
  const cursorH = lineHeight - 4;

  c.fillStyle = theme.cursorColor || theme.foreground;

  const cursorStyle = typingConfig.cursorStyle || 'bar';
  switch (cursorStyle) {
    case 'block': {
      c.globalAlpha = 0.3;
      c.fillRect(cursorX, cursorY + 2, charWidth, lineHeight - 4);
      c.globalAlpha = 1;
      break;
    }
    case 'underscore': {
      c.fillRect(cursorX, cursorY + lineHeight - 4, charWidth, 3);
      break;
    }
    case 'bar':
    default: {
      c.fillRect(cursorX, cursorY + 2, 3, cursorH);
      break;
    }
  }
}

// ====== Layer 9: FX Layer ======
export function drawFX(ctx: RenderContext): void {
  const { ctx: c, width, height, windowChrome, frameIndex, fps } = ctx;

  // Only apply FX for terminal-style window chrome
  if (windowChrome.style !== 'terminal') return;

  // Scanlines — subtle horizontal lines
  c.fillStyle = 'rgba(0, 0, 0, 0.04)';
  for (let y = 0; y < height; y += 3) {
    c.fillRect(0, y, width, 1);
  }

  // CRT vignette — dark edges
  const vignette = c.createRadialGradient(
    width / 2, height / 2, width * 0.3,
    width / 2, height / 2, width * 0.8
  );
  vignette.addColorStop(0, 'rgba(0, 0, 0, 0)');
  vignette.addColorStop(1, 'rgba(0, 0, 0, 0.25)');
  c.fillStyle = vignette;
  c.fillRect(0, 0, width, height);

  // Subtle phosphor glow — green tint for terminal style
  c.fillStyle = 'rgba(0, 255, 65, 0.015)';
  c.fillRect(0, 0, width, height);

  // CRT flicker — very subtle brightness oscillation (deterministic)
  const blinkCycle = fps * 4; // flicker every 4 seconds
  const flickerPhase = (frameIndex % blinkCycle) / blinkCycle;
  const flickerAlpha = 0.008 * Math.sin(flickerPhase * Math.PI * 2);
  if (flickerAlpha > 0) {
    c.fillStyle = `rgba(255, 255, 255, ${flickerAlpha})`;
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

function adjustAlpha(color: string, alpha: number): string {
  if (color.startsWith('#')) {
    const num = parseInt(color.replace('#', ''), 16);
    const r = (num >> 16) & 0xff;
    const g = (num >> 8) & 0xff;
    const b = num & 0xff;
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  }
  return color;
}
