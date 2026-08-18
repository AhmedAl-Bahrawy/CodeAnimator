import type {
  AspectRatio,
  BackgroundPreset,
  CodeTheme,
  Project,
  Scene,
  Timeline,
  TypographySettings,
  SceneAppearance,
  TypingConfig,
  UISkin,
  WindowChromeConfig,
} from '@/core/types';
import { parseMarkup, type MarkupError, type MarkupToken } from '@/core/markup/parser';
import { buildTimelineFromSource } from '@/core/timeline';
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
  const appearance: SceneAppearance = {
    codeBackground: theme.background || skin.tokens.bgElevated,
    codeForeground: theme.foreground || skin.tokens.textPrimary,
    gutterBackground: theme.background || skin.tokens.bgElevated,
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
