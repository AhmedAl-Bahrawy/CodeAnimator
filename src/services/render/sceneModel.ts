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
  maxZoom: 3.2,
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

function resolveAdaptiveFrame(
  width: number,
  height: number,
  source: string,
  appearance: Pick<SceneAppearance, 'fontSizePx' | 'lineHeightPx' | 'letterSpacingPx' | 'contentPaddingPx' | 'gutterWidthPx' | 'titleBarHeightPx'>,
  windowChrome: WindowChromeConfig,
  presentation: NonNullable<Scene['presentation']>,
): Pick<SceneAppearance, 'frameX' | 'frameY' | 'frameWidthPx' | 'frameHeightPx' | 'contentFitScale'> {
  const lines = source.split('\n');
  const longestLine = Math.max(1, ...lines.map(line => line.length));
  const estimatedCharWidth = Math.max(5, appearance.fontSizePx * 0.61 + appearance.letterSpacingPx);
  const baseWidth = Math.max(240, appearance.gutterWidthPx + appearance.contentPaddingPx * 2 + longestLine * estimatedCharWidth);
  const baseHeight = Math.max(appearance.lineHeightPx * 2, lines.length * appearance.lineHeightPx + appearance.contentPaddingPx * 2 + appearance.titleBarHeightPx);
  const availableWidth = Math.max(1, width - windowChrome.margin * 2);
  const availableHeight = Math.max(1, height - windowChrome.margin * 2);
  const fitScale = Math.min(availableWidth / baseWidth, availableHeight / baseHeight);
  // Fit-to-code should preserve readability for short snippets instead of
  // shrinking a one- or two-line window into the middle of a portrait canvas.
  // The target occupancy scales down as content grows, then the canvas remains
  // the hard upper bound for long source files.
  const lineOccupancyTarget = Math.max(0.48, Math.min(0.84, 0.84 - Math.max(0, lines.length - 2) * 0.014));
  const minimumOccupancyScale = Math.min(
    availableWidth / (baseWidth / 0.84),
    availableHeight * lineOccupancyTarget / baseHeight,
  );
  const contentFitScale = presentation.framingMode === 'fill-canvas'
    ? 1
    : Math.min(fitScale, Math.max(1, minimumOccupancyScale), Math.max(1, presentation.maxZoom));
  const frameWidthPx = Math.min(availableWidth, Math.max(1, baseWidth * contentFitScale));
  const frameHeightPx = Math.min(availableHeight, Math.max(1, baseHeight * contentFitScale));

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
  const dimensions = resolveDimensions(project.aspectRatio, project.customWidth, project.customHeight);
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
    titleBarHeightPx: scene.windowChrome.style === 'none' ? 0 : 38,
  };
  const frame = resolveAdaptiveFrame(dimensions.width, dimensions.height, parsed.cleanSource, baseAppearance, scene.windowChrome, presentation);
  const appearance: SceneAppearance = {
    ...baseAppearance,
    ...frame,
    framingMode: presentation.framingMode,
    maxZoom: presentation.maxZoom,
    fxPreset: presentation.fxPreset,
    fxIntensity: presentation.fxIntensity,
    motionPreset: presentation.motionPreset,
    animationEasing: animation.easing,
    introDurationMs: animation.introDurationMs,
    outroDurationMs: animation.outroDurationMs,
    cursorFollow: animation.cursorFollow,
    cursorBlink: animation.cursorBlink,
    cursorBlinkRate: animation.cursorBlinkRate,
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
