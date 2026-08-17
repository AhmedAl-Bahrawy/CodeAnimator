import { createHighlighter, type Highlighter, type ThemedToken } from 'shiki';

let highlighterPromise: Promise<Highlighter> | null = null;
const themeCache = new Map<string, boolean>();
const langCache = new Map<string, boolean>();

// Map our theme IDs to Shiki theme names
const THEME_MAP: Record<string, string> = {
  'dracula': 'dracula',
  'monokai': 'monokai',
  'night-owl': 'night-owl',
  'one-dark-pro': 'one-dark-pro',
  'solarized-dark': 'solarized-dark',
  'gruvbox-dark': 'gruvbox-dark-medium',
  'nord': 'nord',
  'github-dark': 'github-dark',
  'catppuccin-mocha': 'catppuccin-mocha',
  'ayu-dark': 'ayu-dark',
};

// Map language IDs to Shiki language names
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
  const lang = LANG_MAP[language] || 'javascript';
  if (!langCache.has(lang)) {
    try {
      await highlighter.loadLanguage(lang);
      langCache.set(lang, true);
    } catch {
      // fallback
    }
  }

  // Load theme if not cached
  const theme = shikiThemeName || 'dracula';
  if (!themeCache.has(theme)) {
    try {
      await highlighter.loadTheme(theme);
      themeCache.set(theme, true);
    } catch {
      // fallback
    }
  }

  const tokens = highlighter.codeToTokens(code, {
    lang,
    theme,
  });

  return {
    lines: tokens.tokens.map((lineTokens: ThemedToken[], lineIdx: number) => {
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
