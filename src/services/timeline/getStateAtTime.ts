import type { Timeline, CanvasState, CursorFollowMode, TypingConfig } from '@/types/domain';
import { binarySearchTime } from '@/lib/utils';

export interface ReplayOptions {
  cursorFollow?: CursorFollowMode;
}

function resolveFollowColumn(sourceLine: string, exactColumn: number, follow: CursorFollowMode): number {
  const col = Math.max(0, Math.min(exactColumn, sourceLine.length));
  if (follow === 'exact' || col === 0 || col >= sourceLine.length) return col;
  if (follow === 'line-end') return 0;
  const prefix = sourceLine.slice(0, col);
  if (/\s$/.test(prefix) || /\s/.test(sourceLine[col] || '')) return col;
  return Math.max(0, Math.max(prefix.lastIndexOf(' '), prefix.lastIndexOf('\t')) + 1);
}

export function getStateAtTime(
  timeline: Timeline,
  tMs: number,
  source: string,
  typingConfig: TypingConfig,
  options: ReplayOptions = {},
): CanvasState {
  const { events } = timeline;
  const sourceLines = source.split('\n');

  const clampedTimeMs = Math.max(0, Math.min(tMs, timeline.totalDurationMs));
  const state: CanvasState = {
    playheadMs: clampedTimeMs,
    cursorVisible: true,
    animationProgress: Math.min(1, clampedTimeMs / Math.max(1, timeline.contentDurationMs)),
    visibleText: '',
    visibleLines: [],
    tokens: [],
    cursorLine: 0,
    cursorCol: 0,
    activeHighlightRange: null,
    focusLine: null,
    scrollOffsetPx: 0,
    zoomLevel: 1,
    typingSpeed: typingConfig.baseSpeed,
  };

  // Find how many events to replay up to tMs
  const eventCount = binarySearchTime(events, clampedTimeMs);

  // Nothing has happened yet — show empty state
  if (eventCount === 0) {
    return state;
  }

  // Build visible text by replaying events
  const lineBuffers: (string | undefined)[][] = sourceLines.map(() => []);
  let currentLine = 0;
  let exactColumn = 0;

  for (let i = 0; i < eventCount; i++) {
    const event = events[i];

    switch (event.type) {
      case 'type-char': {
        const p = event.payload as { line: number; col: number; char: string };
        currentLine = Math.max(0, Math.min(p.line, sourceLines.length - 1));
        if (p.char === '\n') {
          // Newline: advance to next line
          currentLine = Math.min(sourceLines.length - 1, p.line + 1);
          exactColumn = 0;
        } else {
          exactColumn = p.col + 1;
          if (lineBuffers[p.line]) {
            lineBuffers[p.line][p.col] = p.char;
          }
        }
        break;
      }
      case 'type-word': {
        const p = event.payload as { line: number; text: string; startCol?: number; endCol?: number };
        currentLine = Math.max(0, Math.min(p.line, sourceLines.length - 1));
        const col = p.startCol ?? (lineBuffers[p.line]?.join('').length || 0);
        exactColumn = p.endCol ?? col + p.text.length;
        if (lineBuffers[p.line]) {
          for (let ci = 0; ci < p.text.length; ci += 1) {
            lineBuffers[p.line][col + ci] = p.text[ci];
          }
        }
        break;
      }
      case 'type-line': {
        const p = event.payload as { line: number; text: string; endCol: number };
        currentLine = Math.max(0, Math.min(p.line, sourceLines.length - 1));
        exactColumn = p.endCol;
        if (lineBuffers[p.line]) {
          for (let ci = 0; ci < p.text.length; ci++) {
            lineBuffers[p.line][ci] = p.text[ci];
          }
        }
        break;
      }
      case 'cursor-jump': {
        const p = event.payload as { line: number; col: number };
        currentLine = Math.max(0, Math.min(p.line, sourceLines.length - 1));
        exactColumn = p.col;
        break;
      }
      case 'set-highlight': {
        const p = event.payload as { start: number; end: number };
        state.activeHighlightRange = [p.start, p.end];
        break;
      }
      case 'clear-highlight':
        state.activeHighlightRange = null;
        break;
      case 'set-focus': {
        const p = event.payload as { line: number };
        state.focusLine = p.line;
        break;
      }
      case 'clear-focus':
        state.focusLine = null;
        break;
      case 'zoom': {
        const p = event.payload as { level: number };
        state.zoomLevel = p.level;
        break;
      }
      case 'scroll-to': {
        const p = event.payload as { offsetPx: number };
        state.scrollOffsetPx = p.offsetPx;
        break;
      }
      case 'set-speed': {
        const p = event.payload as { speed: number };
        state.typingSpeed = p.speed;
        break;
      }
      case 'clear-screen': {
        for (let li = 0; li < lineBuffers.length; li++) {
          lineBuffers[li] = [];
        }
        currentLine = 0;
        exactColumn = 0;
        break;
      }
      case 'pause':
      case 'cut':
      case 'scene-transition':
        // Pause: time already shifted in builder. Cut/scene: handled by timeline
        break;
      default:
        break;
    }
  }

  // Build visibleLines from line buffers
  const visibleLines: string[] = [];
  for (let i = 0; i < sourceLines.length; i++) {
    const buf = lineBuffers[i];
    if (buf && buf.some(c => c !== undefined)) {
      visibleLines.push(buf.join(''));
    } else if (i < currentLine) {
      // Lines before current are fully typed
      visibleLines.push(sourceLines[i]);
    } else if (i === currentLine) {
      visibleLines.push(buf ? buf.join('') : '');
    }
    // Lines after current are not yet typed — skip them
  }

  state.visibleLines = visibleLines;
  state.visibleText = visibleLines.join('\n');
  state.cursorLine = currentLine;
  state.cursorCol = resolveFollowColumn(sourceLines[currentLine] || '', exactColumn, options.cursorFollow || 'exact');

  return state;
}
