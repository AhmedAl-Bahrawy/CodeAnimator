import { useEffect, useRef, useCallback, useMemo } from 'react';
import { EditorView, keymap, lineNumbers, highlightActiveLine, highlightActiveLineGutter } from '@codemirror/view';
import { EditorState, Compartment } from '@codemirror/state';
import { defaultKeymap, history, historyKeymap } from '@codemirror/commands';
import { javascript } from '@codemirror/lang-javascript';
import { python } from '@codemirror/lang-python';
import { html } from '@codemirror/lang-html';
import { css } from '@codemirror/lang-css';
import { HighlightStyle, syntaxHighlighting } from '@codemirror/language';
import { tags } from '@lezer/highlight';
import { bracketMatching } from '@codemirror/language';
import { closeBrackets } from '@codemirror/autocomplete';
import { getThemeById } from '@/data/codeThemes';
import type { CodeTheme, TypographySettings, UISkin, SceneAppearance } from '@/core/types';

function buildEditorTheme(
  theme: CodeTheme | null,
  skin: UISkin,
  typography: TypographySettings,
  appearance?: SceneAppearance,
): ReturnType<typeof EditorView.theme> {
  const t = skin.tokens;
  const codeBackground = appearance?.codeBackground || theme?.background || t.bgElevated;
  const foreground = appearance?.codeForeground || theme?.foreground || t.textPrimary;
  const mono = appearance?.monoFontFamily || typography.fontFamily || t.fontMono;
  const fontSize = `${appearance?.fontSizePx || Math.max(8, typography.fontSize)}px`;
  const lineHeight = appearance ? `${appearance.lineHeightPx}px` : `${Math.max(1, typography.lineHeight)}em`;
  const cursorColor = appearance?.cursorColor || theme?.cursorColor || t.accent;
  const selectionColor = appearance?.selectionColor || theme?.selectionColor || `${t.accent}33`;

  return EditorView.theme({
    '&': {
      backgroundColor: codeBackground,
      color: foreground,
      fontSize,
      fontFamily: mono,
      lineHeight,
      height: '100%',
    },
    '.cm-content': {
      caretColor: cursorColor,
      padding: `${appearance?.contentPaddingPx ?? 12}px 0`,
      fontFamily: mono,
      letterSpacing: `${appearance?.letterSpacingPx ?? typography.letterSpacing ?? 0}px`,
    },
    '.cm-cursor, .cm-dropCursor': {
      borderLeftColor: cursorColor,
      borderLeftWidth: '2px',
    },
    '&.cm-focused .cm-selectionBackground, .cm-selectionBackground, .cm-content ::selection': {
      backgroundColor: selectionColor,
    },
    '.cm-activeLine': {
      backgroundColor: appearance?.activeLineBackground || t.bgPanel,
    },
    '.cm-gutters': {
      backgroundColor: appearance?.gutterBackground || codeBackground,
      color: appearance?.gutterForeground || theme?.lineNumberColor || t.textMuted,
      border: 'none',
      borderRight: `1px solid ${appearance?.border || t.border}`,
      fontFamily: mono,
      minWidth: `${appearance?.gutterWidthPx || 32}px`,
    },
    '.cm-activeLineGutter': {
      backgroundColor: appearance?.activeLineBackground || t.bgPanel,
      color: appearance?.gutterForeground || t.textSecondary,
    },
    '.cm-lineNumbers .cm-gutterElement': {
      padding: '0 10px 0 12px',
      minWidth: `${appearance?.gutterWidthPx || 32}px`,
    },
    '.cm-scroller': {
      overflow: 'auto',
    },
    '.cm-matchingBracket': {
      backgroundColor: selectionColor,
      outline: `1px solid ${cursorColor}`,
    },
  }, { dark: true });
}

function buildHighlightStyleFromTheme(theme: CodeTheme | null): HighlightStyle {
  const a = theme?.ansi;
  const fallback = {
    black: '#000000', red: '#e06c75', green: '#98c379', yellow: '#e5c07b', blue: '#61afef',
    magenta: '#c678dd', cyan: '#56b6c2', white: '#abb2bf', brightBlack: '#5c6370',
    brightRed: '#e06c75', brightGreen: '#98c379', brightYellow: '#e5c07b', brightBlue: '#61afef',
    brightMagenta: '#c678dd', brightCyan: '#56b6c2', brightWhite: '#ffffff',
  };
  const colors = a || fallback;
  return HighlightStyle.define([
    { tag: tags.keyword, color: colors.magenta },
    { tag: tags.operator, color: colors.cyan },
    { tag: tags.special(tags.variableName), color: colors.red },
    { tag: tags.variableName, color: colors.red },
    { tag: tags.definition(tags.variableName), color: colors.blue },
    { tag: tags.string, color: colors.green },
    { tag: tags.special(tags.string), color: colors.cyan },
    { tag: tags.comment, color: colors.brightBlack, fontStyle: 'italic' },
    { tag: tags.number, color: colors.yellow },
    { tag: tags.typeName, color: colors.yellow },
    { tag: tags.className, color: colors.yellow },
    { tag: tags.propertyName, color: colors.blue },
    { tag: tags.function(tags.variableName), color: colors.blue },
    { tag: tags.function(tags.propertyName), color: colors.blue },
    { tag: tags.tagName, color: colors.red },
    { tag: tags.attributeName, color: colors.yellow },
    { tag: tags.labelName, color: colors.blue },
    { tag: tags.namespace, color: colors.red },
    { tag: tags.macroName, color: colors.red },
    { tag: tags.atom, color: colors.cyan },
    { tag: tags.literal, color: colors.cyan },
    { tag: tags.separator, color: colors.white },
    { tag: tags.regexp, color: colors.green },
    { tag: tags.escape, color: colors.cyan },
    { tag: tags.meta, color: colors.white },
    { tag: tags.url, color: colors.cyan, textDecoration: 'underline' },
    { tag: tags.invalid, color: '#ffffff', backgroundColor: colors.red },
  ]);
}

const languageMap: Record<string, () => ReturnType<typeof javascript>> = {
  javascript: () => javascript(),
  js: () => javascript(),
  typescript: () => javascript({ typescript: true }),
  ts: () => javascript({ typescript: true }),
  jsx: () => javascript({ jsx: true }),
  tsx: () => javascript({ jsx: true, typescript: true }),
  python: () => python(),
  py: () => python(),
  html: () => html(),
  css: () => css(),
  bash: () => javascript(),
  powershell: () => javascript(),
  cmd: () => javascript(),
  zsh: () => javascript(),
  pseudo: () => javascript(),
  plaintext: () => javascript(),
  sql: () => javascript(),
  json: () => javascript(),
  yaml: () => javascript(),
  c: () => javascript(),
  cpp: () => javascript(),
  go: () => javascript(),
  rust: () => javascript(),
  php: () => javascript(),
  java: () => javascript(),
  kotlin: () => javascript(),
  csharp: () => javascript(),
  ruby: () => javascript(),
  markdown: () => javascript(),
  dockerfile: () => javascript(),
};

interface CodeInputProps {
  value: string;
  onChange: (value: string) => void;
  language?: string;
  codeThemeId?: string;
  skin?: UISkin;
  typography?: TypographySettings;
  appearance?: SceneAppearance;
  className?: string;
}

const fallbackSkin: UISkin = {
  id: 'fallback',
  name: 'Fallback',
  isBuiltIn: true,
  density: 'comfortable',
  tokens: {
    bgBase: '#0b0f14', bgElevated: '#111820', bgPanel: '#16202a', textPrimary: '#f4f7fb',
    textSecondary: '#a6b3c2', textMuted: '#667789', accent: '#00e676', accentForeground: '#031108',
    border: '#263341', borderStrong: '#3a4b5b', danger: '#ff5f57', success: '#00e676', warning: '#ffbd2e',
    radiusSm: '4px', radiusMd: '6px', radiusLg: '10px', fontUI: 'Inter, sans-serif',
    fontMono: '"SF Mono", "Fira Code", "Cascadia Code", monospace',
  },
};

const fallbackTypography: TypographySettings = {
  fontSize: 15,
  fontFamily: fallbackSkin.tokens.fontMono,
  lineHeight: 1.6,
  letterSpacing: 0,
};

export function CodeInput({
  value,
  onChange,
  language = 'javascript',
  codeThemeId,
  skin = fallbackSkin,
  typography = fallbackTypography,
  appearance,
  className,
}: CodeInputProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const viewRef = useRef<EditorView | null>(null);
  const themeCompartmentRef = useRef(new Compartment());
  const languageCompartmentRef = useRef(new Compartment());
  const highlightCompartmentRef = useRef(new Compartment());
  const onChangeRef = useRef(onChange);
  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  const codeTheme = useMemo(() => codeThemeId ? getThemeById(codeThemeId) || null : null, [codeThemeId]);
  const editorTheme = useMemo(() => buildEditorTheme(codeTheme, skin, typography, appearance), [codeTheme, skin, typography, appearance]);
  const highlightStyle = useMemo(() => buildHighlightStyleFromTheme(codeTheme), [codeTheme]);
  const getLanguage = useCallback(() => {
    const factory = languageMap[language] || languageMap.javascript;
    return factory();
  }, [language]);

  const initialValueRef = useRef(value);
  const editorThemeRef = useRef(editorTheme);
  const getLanguageRef = useRef(getLanguage);
  const highlightStyleRef = useRef(highlightStyle);

  useEffect(() => {
    editorThemeRef.current = editorTheme;
    getLanguageRef.current = getLanguage;
    highlightStyleRef.current = highlightStyle;
  }, [editorTheme, getLanguage, highlightStyle]);

  useEffect(() => {
    if (!containerRef.current) return;

    const state = EditorState.create({
      doc: initialValueRef.current,
      extensions: [
        lineNumbers(),
        highlightActiveLine(),
        highlightActiveLineGutter(),
        history(),
        bracketMatching(),
        closeBrackets(),
        themeCompartmentRef.current.of(editorThemeRef.current),
        highlightCompartmentRef.current.of(syntaxHighlighting(highlightStyleRef.current)),
        languageCompartmentRef.current.of(getLanguageRef.current()),
        keymap.of([...defaultKeymap, ...historyKeymap]),
        EditorView.updateListener.of((update) => {
          if (update.docChanged) onChangeRef.current(update.state.doc.toString());
        }),
      ],
    });

    const view = new EditorView({ state, parent: containerRef.current });
    viewRef.current = view;
    return () => {
      view.destroy();
      viewRef.current = null;
    };
  }, []);

  useEffect(() => {
    const view = viewRef.current;
    if (!view) return;
    view.dispatch({
      effects: [
        themeCompartmentRef.current.reconfigure(editorTheme),
        languageCompartmentRef.current.reconfigure(getLanguage()),
        highlightCompartmentRef.current.reconfigure(syntaxHighlighting(highlightStyle)),
      ],
    });
  }, [editorTheme, getLanguage, highlightStyle]);

  useEffect(() => {
    const view = viewRef.current;
    if (!view) return;
    const currentDoc = view.state.doc.toString();
    if (currentDoc !== value) {
      view.dispatch({ changes: { from: 0, to: currentDoc.length, insert: value } });
    }
  }, [value]);

  return (
    <div ref={containerRef} className={`h-full overflow-hidden [&_.cm-editor]:h-full ${className || ''}`} />
  );
}
