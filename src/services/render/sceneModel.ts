import type {
  AspectRatio,
  BackgroundPreset,
  CodeTheme,
  Project,
  Scene,
  Timeline,
  TypographySettings,
  SceneAnimationSettings,
  SceneAppearance,
  TypingConfig,
  UISkin,
  WindowChromeConfig,
} from '@/types/domain';
import { parseMarkup, type MarkupError, type MarkupToken } from '@/services/markup/parser';
import { buildTimelineFromSource } from '@/services/timeline';
import { aspectRatioPresets } from '@/data/platformPresets';
import { getBackgroundById } from '@/data/backgroundPresets';
import { getThemeById } from '@/data/codeThemes';
import { getUISkinById } from '@/data/uiSkins';

export interface SceneRenderModel {
  project: Project;
  scene: Scene;
  sourceWithMarkup: string;
  source: string;
  language: string;
  markupTokens: MarkupToken[];
  markupErrors: MarkupError[];
  theme: CodeTheme;
  background: BackgroundPreset;
  skin: UISkin;
  windowChrome: WindowChromeConfig;
  typography: TypographySettings;
  typingConfig: TypingConfig;
  width: number;
  height: number;
  timeline: Timeline;
  appearance: SceneAppearance;
  presentation: NonNullable<Scene['presentation']>;
  animation: NonNullable<Scene['animation']>;
  audio: NonNullable<Scene['audio']>;
}

export function resolveDimensions(
  aspectRatio: AspectRatio,
  customWidth?: number,
  customHeight?: number,
): { width: number; height: number } {
  if (aspectRatio === 'custom' && customWidth && customHeight) {
    return {
      width: Math.max(1, Math.round(customWidth)),
      height: Math.max(1, Math.round(customHeight)),
    };
  }

  const preset = aspectRatioPresets.find((item) => item.id === aspectRatio);
  return {
    width: preset?.width ?? 1080,
    height: preset?.height ?? 1920,
  };
}

export function getSkinById(id: string | undefined, skins: UISkin[] = []): UISkin {
  return skins.find((skin) => skin.id === id) || getUISkinById(id || 'midnight');
}

const defaultPresentation: NonNullable<Scene['presentation']> = {
  framingMode: 'fit-code',
  maxZoom: 1.35,
  motionPreset: 'typewriter',
  fxPreset: 'none',
  fxIntensity: 0.55,
};

const defaultAudio: NonNullable<Scene['audio']> = {
  enabled: false,
  cueId: 'none',
  volume: 0.35,
};

const defaultAnimation: SceneAnimationSettings = {
  easing: 'smooth',
  introDurationMs: 420,
  outroDurationMs: 260,
  cursorFollow: 'exact',
  cursorBlink: true,
  cursorBlinkRate: 530,
};

export interface ContentMetrics {
  contentLineCount: number;
  longestLineLength: number;
  contentWidthPx: number;
  contentHeightPx: number;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

export function resolveContentMetrics(
  source: string,
  appearance: Pick<SceneAppearance, 'fontSizePx' | 'lineHeightPx' | 'letterSpacingPx' | 'contentPaddingPx' | 'gutterWidthPx' | 'titleBarHeightPx'>,
): ContentMetrics {
  const lines = source.split('\n');
  const lastContentLine = Math.max(0, lines.reduce((last, line, index) => line.trim().length > 0 ? index : last, 0));
  const contentLineCount = Math.max(1, lastContentLine + 1);
  const contentLines = lines.slice(0, contentLineCount);
  const longestLineLength = Math.max(1, ...contentLines.map(line => line.length));
  const estimatedCharWidth = Math.max(5, appearance.fontSizePx * 0.61 + appearance.letterSpacingPx);
  const contentWidthPx = Math.max(
    160,
    appearance.gutterWidthPx + appearance.contentPaddingPx * 2 + longestLineLength * estimatedCharWidth,
  );
  const contentHeightPx = Math.max(
    appearance.lineHeightPx,
    contentLineCount * appearance.lineHeightPx + appearance.contentPaddingPx * 2 + appearance.titleBarHeightPx,
  );

  return { contentLineCount, longestLineLength, contentWidthPx, contentHeightPx };
}

export function resolveCodeLinesViewportLines(width: number, height: number): number {
  // Keep the viewport stable for a given output shape while allowing small
  // square/landscape exports to remain readable.
  void width;
  return clamp(Math.round(height / 140), 8, 18);
}

export function resolveCodeLinesDimensions(
  width: number,
  height: number,
  source: string,
  appearance: Pick<SceneAppearance, 'fontSizePx' | 'lineHeightPx' | 'letterSpacingPx' | 'contentPaddingPx' | 'gutterWidthPx' | 'titleBarHeightPx'>,
  presentation: NonNullable<Scene['presentation']>,
): { width: number; height: number; viewportLines: number } {
  const metrics = resolveContentMetrics(source, appearance);
  const zoom = clamp(presentation.maxZoom, 0.5, 4);
  const viewportLines = Math.min(metrics.contentLineCount, resolveCodeLinesViewportLines(width, height));
  const outputWidth = Math.max(2, Math.ceil(metrics.contentWidthPx * zoom));
  const outputHeight = Math.max(2, Math.ceil((viewportLines * appearance.lineHeightPx + appearance.contentPaddingPx * 2) * zoom));
  return {
    width: outputWidth & ~1,
    height: outputHeight & ~1,
    viewportLines: Math.max(1, viewportLines),
  };
}

function resolveAdaptiveFrame(
  width: number,
  height: number,
  source: string,
  appearance: Pick<SceneAppearance, 'fontSizePx' | 'lineHeightPx' | 'letterSpacingPx' | 'contentPaddingPx' | 'gutterWidthPx' | 'titleBarHeightPx'>,
  windowChrome: WindowChromeConfig,
  presentation: NonNullable<Scene['presentation']>,
): Pick<SceneAppearance, 'frameX' | 'frameY' | 'frameWidthPx' | 'frameHeightPx' | 'contentFitScale'> {
  const metrics = resolveContentMetrics(source, appearance);
  const mode = presentation.framingMode;
  if (mode === 'code-lines') {
    return {
      frameX: 0,
      frameY: 0,
      frameWidthPx: width,
      frameHeightPx: height,
      contentFitScale: clamp(presentation.maxZoom, 0.5, 4),
    };
  }

  const outerMargin = mode === 'fill-canvas' ? 0 : Math.max(0, windowChrome.margin);
  const availableWidth = Math.max(1, width - outerMargin * 2);
  const availableHeight = Math.max(1, height - outerMargin * 2);
  const nativeFitScale = Math.min(
    availableWidth / metrics.contentWidthPx,
    availableHeight / metrics.contentHeightPx,
  );
  const maxZoom = clamp(presentation.maxZoom, 0.25, 4);
  const contentFitScale = mode === 'fill-canvas'
    ? Math.max(0.1, nativeFitScale)
    : Math.max(0.1, Math.min(nativeFitScale, maxZoom));
  const frameWidthPx = mode === 'fill-canvas'
    ? availableWidth
    : Math.min(availableWidth, metrics.contentWidthPx * contentFitScale);
  const frameHeightPx = mode === 'fill-canvas'
    ? availableHeight
    : Math.min(availableHeight, metrics.contentHeightPx * contentFitScale);

  return {
    frameX: Math.round((width - frameWidthPx) / 2),
    frameY: Math.round((height - frameHeightPx) / 2),
    frameWidthPx,
    frameHeightPx,
    contentFitScale,
  };
}

export function resizeSceneAppearance(
  model: Pick<SceneRenderModel, 'source' | 'appearance' | 'windowChrome' | 'presentation'>,
  width: number,
  height: number,
): SceneAppearance {
  if (model.presentation.framingMode === 'code-lines') {
    const codeLinesScale = clamp(width / Math.max(1, model.appearance.contentWidthPx), 0.5, 4);
    return {
      ...model.appearance,
      frameX: 0,
      frameY: 0,
      frameWidthPx: width,
      frameHeightPx: height,
      contentFitScale: codeLinesScale,
    };
  }
  const frame = resolveAdaptiveFrame(width, height, model.source, model.appearance, model.windowChrome, model.presentation);
  return { ...model.appearance, ...frame };
}

export function resolveSceneRenderModel(
  project: Project,
  scene: Scene,
  options: { skin?: UISkin; skins?: UISkin[]; fps?: 30 | 60 } = {},
): SceneRenderModel {
  const parsed = parseMarkup(scene.sourceWithMarkup);
  const theme = getThemeById(scene.codeThemeId) || getThemeById('dracula');
  if (!theme) throw new Error('No code theme is available for this scene.');
  const background = getBackgroundById(scene.backgroundPresetId);
  const skin = options.skin || getSkinById(undefined, options.skins);
  const platformDimensions = resolveDimensions(project.aspectRatio, project.customWidth, project.customHeight);
  const fps: 30 | 60 = options.fps === 60 ? 60 : 30;
  const presentation = { ...defaultPresentation, ...(scene.presentation || {}) };
  const audio = { ...defaultAudio, ...(scene.audio || {}) };
  const animation = { ...defaultAnimation, ...(scene.animation || {}) };
  const baseAppearance = {
    codeBackground: skin.tokens.bgElevated || theme.background || skin.tokens.bgPanel,
    codeForeground: theme.foreground || skin.tokens.textPrimary,
    gutterBackground: skin.tokens.bgPanel || theme.background,
    gutterForeground: theme.lineNumberColor || skin.tokens.textMuted,
    activeLineBackground: skin.tokens.bgPanel,
    border: skin.tokens.border,
    cursorColor: theme.cursorColor || skin.tokens.accent,
    selectionColor: theme.selectionColor || `${skin.tokens.accent}33`,
    accent: skin.tokens.accent,
    monoFontFamily: scene.typography.fontFamily || skin.tokens.fontMono,
    fontSizePx: Math.max(8, scene.typography.fontSize),
    lineHeightPx: Math.max(1, scene.typography.fontSize * scene.typography.lineHeight),
    letterSpacingPx: scene.typography.letterSpacing || 0,
    contentPaddingPx: Math.max(0, scene.windowChrome.padding),
    gutterWidthPx: 52,
    titleBarHeightPx: presentation.framingMode === 'code-lines' || scene.windowChrome.style === 'none' ? 0 : 38,
  };
  const metrics = resolveContentMetrics(parsed.cleanSource, baseAppearance);
  const codeLinesDimensions = presentation.framingMode === 'code-lines'
    ? resolveCodeLinesDimensions(platformDimensions.width, platformDimensions.height, parsed.cleanSource, baseAppearance, presentation)
    : null;
  const dimensions = codeLinesDimensions || platformDimensions;
  const frame = resolveAdaptiveFrame(dimensions.width, dimensions.height, parsed.cleanSource, baseAppearance, scene.windowChrome, presentation);
  const appearance: SceneAppearance = {
    ...baseAppearance,
    ...frame,
    framingMode: presentation.framingMode,
    maxZoom: clamp(presentation.maxZoom, 0.5, 4),
    fxPreset: presentation.fxPreset,
    fxIntensity: presentation.fxIntensity,
    motionPreset: presentation.motionPreset,
    animationEasing: animation.easing,
    introDurationMs: animation.introDurationMs,
    outroDurationMs: animation.outroDurationMs,
    cursorFollow: animation.cursorFollow,
    cursorBlink: animation.cursorBlink,
    cursorBlinkRate: animation.cursorBlinkRate,
    contentLineCount: metrics.contentLineCount,
    contentWidthPx: metrics.contentWidthPx,
    codeLinesViewportLines: codeLinesDimensions?.viewportLines
      || resolveCodeLinesViewportLines(platformDimensions.width, platformDimensions.height),
  };
  const timeline = buildTimelineFromSource({
    source: parsed.cleanSource,
    typingConfig: scene.typingConfig,
    fps,
    markupEvents: parsed.events,
  });

  return {
    project,
    scene,
    sourceWithMarkup: scene.sourceWithMarkup,
    source: parsed.cleanSource,
    language: scene.language,
    markupTokens: parsed.tokens,
    markupErrors: parsed.errors,
    theme,
    background,
    skin,
    windowChrome: scene.windowChrome,
    typography: scene.typography,
    typingConfig: scene.typingConfig,
    ...dimensions,
    timeline,
    appearance,
    presentation,
    animation,
    audio,
  };
}

/**
 * Keep animation directives invisible in the editor while preserving them when
 * the user edits visible code. Directives remain attached to their original
 * line/column and can still be inspected by the lint panel.
 */
export function mergeVisibleSourceWithMarkup(previousMarkup: string, visibleSource: string): string {
  const { tokens } = parseMarkup(previousMarkup);
  if (tokens.length === 0) return visibleSource;

  const lines = visibleSource.split('\n');
  const byLine = new Map<number, MarkupToken[]>();
  for (const token of tokens) {
    const list = byLine.get(token.line) || [];
    list.push(token);
    byLine.set(token.line, list);
  }

  for (const [lineIndex, lineTokens] of byLine) {
    if (lineIndex >= lines.length) continue;
    let line = lines[lineIndex];
    let inserted = 0;
    for (const token of lineTokens.sort((a, b) => a.column - b.column)) {
      const column = Math.min(line.length, Math.max(0, token.column + inserted));
      line = `${line.slice(0, column)}${token.raw}${line.slice(column)}`;
      inserted += token.raw.length;
    }
    lines[lineIndex] = line;
  }

  return lines.join('\n');
}
