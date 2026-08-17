import { useEffect, useRef, useCallback } from 'react';
import { EditorView, keymap, lineNumbers, highlightActiveLine, highlightActiveLineGutter } from '@codemirror/view';
import { EditorState } from '@codemirror/state';
import { defaultKeymap, history, historyKeymap } from '@codemirror/commands';
import { javascript } from '@codemirror/lang-javascript';
import { python } from '@codemirror/lang-python';
import { html } from '@codemirror/lang-html';
import { css } from '@codemirror/lang-css';
import { HighlightStyle, syntaxHighlighting } from '@codemirror/language';
import { tags } from '@lezer/highlight';
import { bracketMatching } from '@codemirror/language';
import { closeBrackets } from '@codemirror/autocomplete';

// Dark theme matching our app
const codereelTheme = EditorView.theme({
  '&': {
    backgroundColor: 'var(--bg-elevated)',
    color: 'var(--text-primary)',
    fontSize: '14px',
    fontFamily: '"SF Mono", "Fira Code", "Cascadia Code", monospace',
    height: '100%',
  },
  '.cm-content': {
    caretColor: 'var(--accent)',
    padding: '12px 0',
  },
  '.cm-cursor, .cm-dropCursor': {
    borderLeftColor: 'var(--accent)',
    borderLeftWidth: '2px',
  },
  '&.cm-focused .cm-selectionBackground, .cm-selectionBackground, .cm-content ::selection': {
    backgroundColor: 'var(--accent)22',
  },
  '.cm-activeLine': {
    backgroundColor: 'var(--bg-surface)',
  },
  '.cm-gutters': {
    backgroundColor: 'var(--bg-elevated)',
    color: 'var(--text-muted)',
    border: 'none',
    borderRight: '1px solid var(--border)',
  },
  '.cm-activeLineGutter': {
    backgroundColor: 'var(--bg-surface)',
    color: 'var(--text-secondary)',
  },
  '.cm-lineNumbers .cm-gutterElement': {
    padding: '0 8px 0 12px',
    minWidth: '32px',
  },
  '.cm-scroller': {
    overflow: 'auto',
  },
  '.cm-matchingBracket': {
    backgroundColor: 'var(--accent)33',
    outline: '1px solid var(--accent)',
  },
}, { dark: true });

// Syntax highlighting theme
const codereelHighlightStyle = HighlightStyle.define([
  { tag: tags.keyword, color: '#c678dd' },
  { tag: tags.operator, color: '#56b6c2' },
  { tag: tags.special(tags.variableName), color: '#e06c75' },
  { tag: tags.typeName, color: '#e5c07b' },
  { tag: tags.atom, color: '#d19a66' },
  { tag: tags.number, color: '#d19a66' },
  { tag: tags.definition(tags.variableName), color: '#61afef' },
  { tag: tags.string, color: '#98c379' },
  { tag: tags.special(tags.string), color: '#56b6c2' },
  { tag: tags.comment, color: '#5c6370', fontStyle: 'italic' },
  { tag: tags.variableName, color: '#e06c75' },
  { tag: tags.tagName, color: '#e06c75' },
  { tag: tags.propertyName, color: '#61afef' },
  { tag: tags.attributeName, color: '#d19a66' },
  { tag: tags.className, color: '#e5c07b' },
  { tag: tags.labelName, color: '#61afef' },
  { tag: tags.namespace, color: '#e06c75' },
  { tag: tags.macroName, color: '#e06c75' },
  { tag: tags.literal, color: '#56b6c2' },
  { tag: tags.separator, color: '#abb2bf' },
  { tag: tags.function(tags.variableName), color: '#61afef' },
  { tag: tags.function(tags.propertyName), color: '#61afef' },
  { tag: tags.url, color: '#56b6c2', textDecoration: 'underline' },
  { tag: tags.regexp, color: '#98c379' },
  { tag: tags.escape, color: '#56b6c2' },
  { tag: tags.meta, color: '#abb2bf' },
  { tag: tags.invalid, color: '#ffffff', backgroundColor: '#e06c75' },
]);

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
  // Terminal/shell languages and pseudo use no-op extension (plain text)
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
  className?: string;
}

export function CodeInput({ value, onChange, language = 'javascript', className }: CodeInputProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const viewRef = useRef<EditorView | null>(null);
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  const getLanguage = useCallback(() => {
    const factory = languageMap[language] || languageMap.javascript;
    return factory();
  }, [language]);

  useEffect(() => {
    if (!containerRef.current) return;

    const state = EditorState.create({
      doc: value,
      extensions: [
        lineNumbers(),
        highlightActiveLine(),
        highlightActiveLineGutter(),
        history(),
        bracketMatching(),
        closeBrackets(),
        syntaxHighlighting(codereelHighlightStyle),
        codereelTheme,
        getLanguage(),
        keymap.of([...defaultKeymap, ...historyKeymap]),
        EditorView.updateListener.of((update) => {
          if (update.docChanged) {
            onChangeRef.current(update.state.doc.toString());
          }
        }),
      ],
    });

    const view = new EditorView({
      state,
      parent: containerRef.current,
    });

    viewRef.current = view;

    return () => {
      view.destroy();
      viewRef.current = null;
    };
  }, [language]); // Re-create on language change

  // Sync external value changes
  useEffect(() => {
    const view = viewRef.current;
    if (!view) return;

    const currentDoc = view.state.doc.toString();
    if (currentDoc !== value) {
      view.dispatch({
        changes: {
          from: 0,
          to: currentDoc.length,
          insert: value,
        },
      });
    }
  }, [value]);

  return (
    <div
      ref={containerRef}
      className={`h-full overflow-hidden [&_.cm-editor]:h-full ${className || ''}`}
    />
  );
}
