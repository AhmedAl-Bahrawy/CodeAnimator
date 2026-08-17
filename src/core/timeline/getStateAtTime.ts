import type { Timeline, CanvasState, TypingConfig } from '@/core/types';
import { binarySearchTime } from '@/lib/utils';

export function getStateAtTime(
  timeline: Timeline,
  tMs: number,
  source: string,
  _typingConfig: TypingConfig
): CanvasState {
  const { events } = timeline;
  const sourceLines = source.split('\n');

  const state: CanvasState = {
    visibleText: '',
    visibleLines: sourceLines,
    tokens: [],
    cursorLine: 0,
    cursorCol: 0,
    activeHighlightRange: null,
    focusLine: null,
    scrollOffsetPx: 0,
    zoomLevel: 1,
    typingSpeed: _typingConfig.baseSpeed,
  };

  const eventCount = binarySearchTime(events, tMs);

  // Build visible text by replaying events
  const lineBuffers: string[][] = sourceLines.map(() => []);
  let currentLine = 0;
  let currentCol = 0;

  for (let i = 0; i < eventCount; i++) {
    const event = events[i];

    switch (event.type) {
      case 'type-char': {
        const p = event.payload as { line: number; col: number; char: string };
        currentLine = p.line;
        currentCol = p.col + 1;
        if (lineBuffers[p.line]) {
          lineBuffers[p.line][p.col] = p.char;
        }
        break;
      }
      case 'type-word': {
        const p = event.payload as { line: number; text: string };
        currentLine = p.line;
        const existing = lineBuffers[p.line]?.join('') || '';
        const col = existing.length;
        currentCol = col + p.text.length;
        if (lineBuffers[p.line]) {
          // Append word text to the line buffer
          for (let ci = 0; ci < p.text.length; ci++) {
            lineBuffers[p.line][col + ci] = p.text[ci];
          }
        }
        break;
      }
      case 'type-line': {
        const p = event.payload as { line: number; text: string; endCol: number };
        currentLine = p.line;
        currentCol = p.endCol;
        if (lineBuffers[p.line]) {
          for (let ci = 0; ci < p.text.length; ci++) {
            lineBuffers[p.line][ci] = p.text[ci];
          }
        }
        break;
      }
      case 'cursor-jump': {
        const p = event.payload as { line: number; col: number };
        currentLine = p.line;
        currentCol = p.col;
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
        currentCol = 0;
        break;
      }
      case 'pause':
      case 'cut':
      case 'scene-transition':
        // Pause: just skip time (already accounted for in timeline)
        // Cut/scene: already applied by timeline builder
        break;
      default:
        break;
    }
  }

  // Build visibleLines from the line buffers
  const visibleLines: string[] = [];
  for (let i = 0; i < sourceLines.length; i++) {
    const buf = lineBuffers[i];
    if (buf && buf.some(c => c !== undefined)) {
      // At least some chars typed on this line
      visibleLines.push(buf.join(''));
    } else if (i < currentLine) {
      // Lines before current are fully typed (show original)
      visibleLines.push(sourceLines[i]);
    } else if (i === currentLine) {
      // Current line partially typed
      visibleLines.push(buf ? buf.join('') : '');
    }
    // Lines after current are not yet typed — skip them
  }

  // If nothing typed yet, show all source lines (for initial preview)
  const hasTyped = events.some(
    (e, idx) => idx < eventCount && (e.type === 'type-char' || e.type === 'type-word' || e.type === 'type-line')
  );

  if (!hasTyped) {
    state.visibleLines = sourceLines;
    state.visibleText = source;
    state.cursorLine = 0;
    state.cursorCol = 0;
    return state;
  }

  state.visibleLines = visibleLines;
  state.visibleText = visibleLines.join('\n');
  state.cursorLine = currentLine;
  state.cursorCol = currentCol;

  return state;
}
