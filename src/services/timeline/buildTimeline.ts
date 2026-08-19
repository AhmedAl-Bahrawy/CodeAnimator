import type { Timeline, TimelineEvent, TypingConfig } from '@/types/domain';

export interface TimelineBuildOptions {
  source: string;
  typingConfig: TypingConfig;
  fps: number;
  markupEvents?: (TimelineEvent & { lineIndex?: number })[];
}

/**
 * Build one deterministic event stream for preview and export.
 *
 * `baseSpeed` always means visible units per second for the selected mode:
 * characters, word/whitespace segments, or lines. Every typing event carries
 * its absolute source column so replay never has to infer positions from
 * already-rendered text.
 */
export function buildTimelineFromSource(options: TimelineBuildOptions): Timeline {
  const { source, typingConfig, fps, markupEvents = [] } = options;
  const events: TimelineEvent[] = [];
  const lines = source.split('\n');
  const speedMap = new Map<number, number>();
  const perLineMarkup = new Map<number, (TimelineEvent & { lineIndex?: number })[]>();

  for (const markupEvent of markupEvents) {
    const lineIndex = markupEvent.lineIndex ?? 0;
    if (markupEvent.type === 'set-speed') {
      const speed = Number((markupEvent.payload as { speed?: number }).speed);
      if (Number.isFinite(speed) && speed > 0) speedMap.set(lineIndex, speed);
      continue;
    }
    const lineEvents = perLineMarkup.get(lineIndex) || [];
    lineEvents.push(markupEvent);
    perLineMarkup.set(lineIndex, lineEvents);
  }

  const unitDurationMs = (speed: number): number =>
    1000 / Math.max(1, speed);

  let currentTimeMs = 0;
  let currentSpeed = Math.max(1, typingConfig.baseSpeed);
  events.push({ tMs: 0, type: 'cursor-jump', payload: { line: 0, col: 0 } });

  for (let lineIndex = 0; lineIndex < lines.length; lineIndex += 1) {
    const line = lines[lineIndex];
    const lineEvents = perLineMarkup.get(lineIndex) || [];
    const pauseEvents = lineEvents.filter((event) => event.type === 'pause');
    const otherMarkup = lineEvents.filter((event) => event.type !== 'pause');

    if (speedMap.has(lineIndex)) {
      currentSpeed = speedMap.get(lineIndex)!;
      events.push({
        tMs: currentTimeMs,
        type: 'set-speed',
        payload: { speed: currentSpeed },
      });
    }

    for (const markupEvent of otherMarkup) {
      events.push({
        tMs: currentTimeMs,
        type: markupEvent.type,
        payload: { ...markupEvent.payload },
      });
    }

    const emitTypingEvent = (type: TimelineEvent['type'], payload: Record<string, unknown>, units = 1) => {
      currentTimeMs += unitDurationMs(currentSpeed) * Math.max(0.01, units);
      events.push({ tMs: currentTimeMs, type, payload });
    };

    if (typingConfig.mode === 'line') {
      emitTypingEvent('type-line', {
        line: lineIndex,
        text: line,
        startCol: 0,
        endCol: line.length,
      });
    } else if (typingConfig.mode === 'word') {
      const segments = [...line.matchAll(/\S+|\s+/g)];
      for (const segment of segments) {
        const text = segment[0];
        const startCol = segment.index ?? 0;
        emitTypingEvent('type-word', {
          line: lineIndex,
          text,
          startCol,
          endCol: startCol + text.length,
        });
      }
    } else {
      for (let column = 0; column < line.length; column += 1) {
        emitTypingEvent('type-char', {
          line: lineIndex,
          col: column,
          char: line[column],
        });
      }
    }

    for (const pauseEvent of pauseEvents) {
      const durationMs = Math.max(0, Number((pauseEvent.payload as { durationMs?: number }).durationMs) || 0);
      events.push({ tMs: currentTimeMs, type: 'pause', payload: { durationMs } });
      currentTimeMs += durationMs;
    }

    if (lineIndex < lines.length - 1) {
      emitTypingEvent('type-char', {
        line: lineIndex,
        col: line.length,
        char: '\n',
      }, 0.35);
    }
  }

  const totalDurationMs = events.length > 0
    ? events[events.length - 1].tMs + 1800
    : 1800;

  return {
    totalDurationMs: Math.max(1800, totalDurationMs),
    events,
    fps,
  };
}
