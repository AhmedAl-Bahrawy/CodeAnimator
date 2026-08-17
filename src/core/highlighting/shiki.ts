import { createHighlighter, type Highlighter, type ThemedToken } from 'shiki';

let highlighterPromise: Promise<Highlighter> | null = null;
const themeCache = new Map<string, boolean>();
const langCache = new Map<string, boolean>();
const LANG_MAP: Record<string, string> = {
  'javascript': 'javascript',
  'js': 'javascript',
  'typescript': 'typescript',
  'ts': 'typescript',
  'jsx': 'jsx',
  'tsx': 'tsx',
  'python': 'python',
  'py': 'python',
  'html': 'html',
  'css': 'css',
  'bash': 'bash',
  'shell': 'bash',
  'sh': 'bash',
  'zsh': 'bash',
  'powershell': 'powershell',
  'cmd': 'bat',
  'sql': 'sql',
  'json': 'json',
  'yaml': 'yaml',
  'c': 'c',
  'cpp': 'cpp',
  'c++': 'cpp',
  'go': 'go',
  'rust': 'rust',
  'php': 'php',
  'java': 'java',
  'kotlin': 'kotlin',
  'csharp': 'csharp',
  'c#': 'csharp',
  'ruby': 'ruby',
  'markdown': 'markdown',
  'dockerfile': 'dockerfile',
  'pseudo': 'python', // Use Python highlighting for pseudocode (closest match)
  'plaintext': 'plaintext',
};

async function getHighlighter(): Promise<Highlighter> {
  if (!highlighterPromise) {
    highlighterPromise = createHighlighter({
      themes: ['dracula', 'monokai', 'night-owl', 'one-dark-pro', 'github-dark', 'nord'],
      langs: ['javascript', 'typescript', 'python', 'html', 'css', 'bash', 'json'],
    });
  }
  return highlighterPromise;
}

export interface HighlightResult {
  lines: {
    tokens: {
      content: string;
      color: string;
      offset: number;
    }[];
    text: string;
  }[];
}

export async function highlightCode(
  code: string,
  language: string,
  shikiThemeName: string | undefined
): Promise<HighlightResult> {
  const highlighter = await getHighlighter();

  // Load language if not cached
  const lang = (LANG_MAP[language] || 'javascript') as Parameters<Highlighter['loadLanguage']>[0];
  if (!langCache.has(lang as string)) {
    try {
      await highlighter.loadLanguage(lang);
      langCache.set(lang as string, true);
    } catch {
      // fallback
    }
  }

  // Load theme if not cached
  const theme = (shikiThemeName || 'dracula') as Parameters<Highlighter['loadTheme']>[0];
  if (!themeCache.has(theme as string)) {
    try {
      await highlighter.loadTheme(theme);
      themeCache.set(theme as string, true);
    } catch {
      // fallback
    }
  }

  const tokens = await highlighter.codeToTokensBase(code, {
    lang: lang as Parameters<typeof highlighter.codeToTokensBase>[1]['lang'],
    theme: theme as Parameters<typeof highlighter.codeToTokensBase>[1]['theme'],
  });

  return {
    lines: tokens.map((lineTokens: ThemedToken[], lineIdx: number) => {
      let offset = 0;
      // Calculate offset for this line
      const lines = code.split('\n');
      for (let i = 0; i < lineIdx; i++) {
        offset += lines[i].length + 1; // +1 for newline
      }

      const tokensWithOffset = lineTokens.map((token: ThemedToken) => {
        const t = {
          content: token.content,
          color: token.color || '#ffffff',
          offset,
        };
        offset += token.content.length;
        return t;
      });

      return {
        tokens: tokensWithOffset,
        text: lineTokens.map((t: ThemedToken) => t.content).join(''),
      };
    }),
  };
}

// Synchronous version for canvas rendering (uses cached tokens)
export function getCachedHighlight(
  code: string,
  language: string,
  shikiThemeName: string | undefined,
  cache: Map<string, HighlightResult>
): HighlightResult | null {
  const key = `${language}:${shikiThemeName}:${code}`;
  return cache.get(key) || null;
}

export function setCachedHighlight(
  code: string,
  language: string,
  shikiThemeName: string | undefined,
  result: HighlightResult,
  cache: Map<string, HighlightResult>
): void {
  const key = `${language}:${shikiThemeName}:${code}`;
  cache.set(key, result);
}
