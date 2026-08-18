import type { TimelineEvent } from '@/core/types';

export interface MarkupToken {
  type: string;
  value: string;
  line: number;
  column: number;
  raw: string;
}

export interface MarkupError {
  line: number;
  column: number;
  message: string;
  raw: string;
}

const TOKEN_PATTERNS: Record<string, RegExp> = {
  pause: /^[\d.]+$/,
  speed: /^(fast|slow|\d+)$/,
  highlight: /^\d+-\d+$/,
  focus: /^\d+$/,
  clear: /^$/,
  cut: /^$/,
  zoom: /^[\d.]+$/,
  'cursor': /^jump:\d+$/,
  scene: /^next$/,
  glitch: /^$/,
  beep: /^$/,
};

const VALID_TOKEN_TYPES = Object.keys(TOKEN_PATTERNS);

export function parseMarkup(source: string): {
  cleanSource: string;
  tokens: MarkupToken[];
  errors: MarkupError[];
  events: (TimelineEvent & { lineIndex: number })[];
} {
  const lines = source.split('\n');
  const tokens: MarkupToken[] = [];
  const errors: MarkupError[] = [];
  const events: (TimelineEvent & { lineIndex: number })[] = [];
  const cleanLines: string[] = [];

  for (let lineIdx = 0; lineIdx < lines.length; lineIdx++) {
    const line = lines[lineIdx];
    const regex = /\[\[([a-zA-Z]+(?::[^\]]+)?)\]\]/g;
    let match;

    while ((match = regex.exec(line)) !== null) {
      const raw = match[0];
      const content = match[1];
      const colonIdx = content.indexOf(':');

      let tokenType: string;
      let tokenValue: string;

      if (colonIdx >= 0) {
        tokenType = content.substring(0, colonIdx).trim().toLowerCase();
        tokenValue = content.substring(colonIdx + 1).trim();
      } else {
        tokenType = content.trim().toLowerCase();
        tokenValue = '';
      }

      if (!VALID_TOKEN_TYPES.includes(tokenType)) {
        errors.push({
          line: lineIdx,
          column: match.index,
          message: `Unknown markup token: "${tokenType}". Valid tokens: ${VALID_TOKEN_TYPES.join(', ')}`,
          raw,
        });
        continue;
      }

      const pattern = TOKEN_PATTERNS[tokenType];
      if (pattern && tokenValue && !pattern.test(tokenValue)) {
        errors.push({
          line: lineIdx,
          column: match.index,
          message: `Invalid value "${tokenValue}" for token [[${tokenType}]]. Expected: ${pattern.source}`,
          raw,
        });
        continue;
      }

      tokens.push({ type: tokenType, value: tokenValue, line: lineIdx, column: match.index, raw });

      const event = convertTokenToEvent(tokenType, tokenValue, lineIdx);
      if (event) {
        events.push(event);
      }
    }

    const cleanLine = line.replace(/\[\[[^\]]+\]\]/g, '').trimEnd();
    cleanLines.push(cleanLine);
  }

  return { cleanSource: cleanLines.join('\n'), tokens, errors, events };
}

function convertTokenToEvent(
  type: string,
  value: string,
  lineIndex: number
): (TimelineEvent & { lineIndex: number }) | null {
  switch (type) {
    case 'pause': {
      const seconds = parseFloat(value) || 1;
      return { tMs: 0, type: 'pause', payload: { durationMs: seconds * 1000 }, lineIndex };
    }
    case 'speed': {
      let speed: number;
      if (value === 'fast') speed = 80;
      else if (value === 'slow') speed = 15;
      else speed = parseInt(value) || 40;
      return { tMs: 0, type: 'set-speed', payload: { speed }, lineIndex };
    }
    case 'highlight': {
      const parts = value.split('-').map(Number);
      return { tMs: 0, type: 'set-highlight', payload: { start: parts[0] - 1, end: parts[1] - 1 }, lineIndex };
    }
    case 'focus':
      return { tMs: 0, type: 'set-focus', payload: { line: parseInt(value) - 1 }, lineIndex };
    case 'clear':
      return { tMs: 0, type: 'clear-screen', payload: {}, lineIndex };
    case 'cut':
      return { tMs: 0, type: 'cut', payload: {}, lineIndex };
    case 'zoom':
      return { tMs: 0, type: 'zoom', payload: { level: parseFloat(value) || 1.5 }, lineIndex };
    case 'cursor': {
      const parts = value.split(':');
      if (parts[0] === 'jump') {
        return { tMs: 0, type: 'cursor-jump', payload: { line: parseInt(parts[1]) - 1, col: 0 }, lineIndex };
      }
      return null;
    }
    case 'scene':
      return { tMs: 0, type: 'scene-transition', payload: { action: value }, lineIndex };
    case 'glitch':
      return { tMs: 0, type: 'camera-shake', payload: { intensity: 0.08, durationMs: 220 }, lineIndex };
    case 'beep':
      return { tMs: 0, type: 'sound-cue', payload: { cueId: 'terminal-beep' }, lineIndex };
    default:
      return null;
  }
}

export function formatMarkupError(error: MarkupError): string {
  return `Line ${error.line + 1}, Col ${error.column + 1}: ${error.message}`;
}
