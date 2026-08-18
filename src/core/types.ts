// ====== Timeline Types ======
export type TimelineEventType =
  | 'type-char'
  | 'type-word'
  | 'type-line'
  | 'delete-char'
  | 'cursor-jump'
  | 'set-highlight'
  | 'clear-highlight'
  | 'set-focus'
  | 'clear-focus'
  | 'pause'
  | 'clear-screen'
  | 'cut'
  | 'zoom'
  | 'camera-shake'
  | 'glitch'
  | 'sound-cue'
  | 'scroll-to'
  | 'set-speed'
  | 'scene-transition';

export interface TimelineEvent {
  tMs: number;
  type: TimelineEventType;
  payload: Record<string, unknown>;
}

export interface Timeline {
  totalDurationMs: number;
  events: TimelineEvent[];
  fps: number;
}

// ====== Code Token Types (from Shiki) ======
export interface CodeToken {
  content: string;
  color: string;
  fontStyle?: string;
  offset: number;
}

// ====== Canvas State at time T ======
export interface CanvasState {
  visibleText: string;
  visibleLines: string[];
  tokens: CodeToken[];
  cursorLine: number;
  cursorCol: number;
  activeHighlightRange: [number, number] | null;
  focusLine: number | null;
  scrollOffsetPx: number;
  zoomLevel: number;
  typingSpeed: number;
}

// ====== Typing Config ======
export type TypingMode = 'character' | 'word' | 'line';
export type CursorStyle = 'block' | 'bar' | 'underscore';

export interface TypingConfig {
  mode: TypingMode;
  baseSpeed: number;
  cursorStyle: CursorStyle;
  cursorBlinkRate: number;
  autoScroll: boolean;
}

// ====== Typography Settings ======
export interface TypographySettings {
  fontSize: number;
  fontFamily: string;
  lineHeight: number;
  letterSpacing: number;
}

// ====== Aspect Ratio ======
export type AspectRatio = '9:16' | '1:1' | '16:9' | 'custom';

// ====== Window Chrome ======
export type WindowChromeStyle = 'macos' | 'windows' | 'terminal' | 'none';

export interface WindowChromeConfig {
  style: WindowChromeStyle;
  title: string;
  borderRadius: number;
  shadowIntensity: number;
  padding: number;
  margin: number;
  marginFill: string;
}

// ====== Scene ======
export type FramingMode = 'fit-code' | 'fill-canvas';
export type MotionPreset = 'typewriter' | 'cinematic' | 'focus-reveal' | 'slide-in' | 'terminal-pulse';
export type FxPreset = 'none' | 'academy-glow' | 'crt' | 'neon' | 'paper';
export type SoundCueId = 'none' | 'key-tap' | 'soft-pop' | 'academy-chime' | 'terminal-beep';

export interface ScenePresentationSettings {
  framingMode: FramingMode;
  maxZoom: number;
  motionPreset: MotionPreset;
  fxPreset: FxPreset;
  fxIntensity: number;
}

export interface SceneAudioSettings {
  enabled: boolean;
  cueId: SoundCueId;
  volume: number;
}

export interface Scene {
  id: string;
  language: string;
  sourceWithMarkup: string;
  codeThemeId: string;
  backgroundPresetId: string;
  windowChrome: WindowChromeConfig;
  typingConfig: TypingConfig;
  typography: TypographySettings;
  presentation?: ScenePresentationSettings;
  audio?: SceneAudioSettings;
}

// ====== Project ======
export interface Project {
  id: string;
  name: string;
  createdAt: number;
  updatedAt: number;
  scenes: Scene[];
  aspectRatio: AspectRatio;
  customWidth?: number;
  customHeight?: number;
  brandKitId?: string;
}

// ====== Code Theme ======
export interface CodeTheme {
  id: string;
  name: string;
  category: 'editor-classic' | 'retro-terminal' | 'vibrant-social';
  background: string;
  foreground: string;
  ansi: {
    black: string;
    red: string;
    green: string;
    yellow: string;
    blue: string;
    magenta: string;
    cyan: string;
    white: string;
    brightBlack: string;
    brightRed: string;
    brightGreen: string;
    brightYellow: string;
    brightBlue: string;
    brightMagenta: string;
    brightCyan: string;
    brightWhite: string;
  };
  tokenOverrides?: Partial<
    Record<
      | 'keyword'
      | 'string'
      | 'comment'
      | 'function'
      | 'variable'
      | 'number'
      | 'operator'
      | 'type'
      | 'punctuation',
      string
    >
  >;
  cursorColor?: string;
  lineNumberColor?: string;
  selectionColor?: string;
  shikiTheme?: string;
}

// ====== Background Preset ======
export type BackgroundType = 'gradient' | 'solid' | 'image' | 'mesh' | 'animated';

export interface BackgroundPreset {
  id: string;
  name: string;
  type: BackgroundType;
  value: string;
  animated?: boolean;
}

// ====== Export Types ======
export type ExportFormat = 'mp4' | 'webm' | 'gif';
export type ExportTier = 'webcodecs' | 'mediarecorder' | 'ffmpeg-wasm' | 'gif';

export interface ExportOptions {
  timeline: Timeline;
  source: string;
  language: string;
  typingConfig: TypingConfig;
  theme: CodeTheme;
  background: BackgroundPreset;
  windowChrome: WindowChromeConfig;
  typography: TypographySettings;
  skin: UISkin;
  appearance: SceneAppearance;
  audio?: SceneAudioSettings;
  width: number;
  height: number;
  fps: 30 | 60;
  format: ExportFormat;
  playbackSpeedMultiplier: number;
}

export interface Exporter {
  readonly tierName: ExportTier;
  readonly isSupported: boolean;
  export(opts: ExportOptions, onProgress: (pct: number) => void, signal?: AbortSignal): Promise<Blob>;
}

// ====== Platform Presets ======
export interface PlatformPreset {
  id: string;
  label: string;
  width: number;
  height: number;
  fps: 30 | 60;
  maxDurationMs: number;
}

// ====== Canonical Resolved Appearance ======
// This is the final visual contract after Style, Skin, and Code Theme have been
// resolved. Browser editor CSS and canvas/export rendering must consume these
// exact values instead of independently reconstructing them.
export interface SceneAppearance {
  codeBackground: string;
  codeForeground: string;
  gutterBackground: string;
  gutterForeground: string;
  activeLineBackground: string;
  border: string;
  cursorColor: string;
  selectionColor: string;
  accent: string;
  monoFontFamily: string;
  fontSizePx: number;
  lineHeightPx: number;
  letterSpacingPx: number;
  contentPaddingPx: number;
  gutterWidthPx: number;
  titleBarHeightPx: number;
  frameX: number;
  frameY: number;
  frameWidthPx: number;
  frameHeightPx: number;
  contentFitScale: number;
  framingMode: FramingMode;
  maxZoom: number;
  fxPreset: FxPreset;
  fxIntensity: number;
  motionPreset: MotionPreset;
}

// ====== Rendering Layer Types ======
export interface RenderContext {
  ctx: CanvasRenderingContext2D;
  width: number;
  height: number;
  state: CanvasState;
  theme: CodeTheme;
  background: BackgroundPreset;
  windowChrome: WindowChromeConfig;
  typography: TypographySettings;
  typingConfig: TypingConfig;
  skin: UISkin;
  appearance: SceneAppearance;
  frameIndex: number;
  fps: number;
}

// ====== UI Skin Types ======
export interface UISkinTokens {
  bgBase: string;
  bgElevated: string;
  bgPanel: string;
  textPrimary: string;
  textSecondary: string;
  textMuted: string;
  accent: string;
  accentForeground: string;
  border: string;
  borderStrong: string;
  danger: string;
  success: string;
  warning: string;
  radiusSm: string;
  radiusMd: string;
  radiusLg: string;
  fontUI: string;
  fontMono: string;
}

export type Density = 'compact' | 'comfortable' | 'spacious';

export interface UISkin {
  id: string;
  name: string;
  isBuiltIn: boolean;
  tokens: UISkinTokens;
  density: Density;
}

export interface BrandKit {
  id: string;
  name: string;
  isBuiltIn?: boolean;
  uiSkinId: string;
  codeThemeId: string;
  backgroundPresetId: string;
  defaultAspectRatio: '9:16' | '1:1' | '16:9' | 'custom';
}

// ====== Snippet Preset Types ======
export interface SnippetPreset {
  id: string;
  name: string;
  category: string;
  language: string;
  code: string;
  description?: string;
  tags?: string[];
}

