import type { Timeline, TimelineEvent, TypingConfig } from '@/core/types';

export interface TimelineBuildOptions {
  source: string;
  typingConfig: TypingConfig;
  fps: number;
  markupEvents?: (TimelineEvent & { lineIndex?: number })[];
}

export function buildTimelineFromSource(options: TimelineBuildOptions): Timeline {
  const { source, typingConfig, fps, markupEvents = [] } = options;
  const events: TimelineEvent[] = [];

  let currentTimeMs = 0;
  let currentSpeed = typingConfig.baseSpeed;

  const getTimeForUnit = (speed: number): number => {
    switch (typingConfig.mode) {
      case 'character': return 1000 / speed;
      case 'word': return 1000 / (speed / 5);
      case 'line': return 1000 / (speed / 40);
      default: return 1000 / speed;
    }
  };

  const lines = source.split('\n');

  events.push({ tMs: 0, type: 'cursor-jump', payload: { line: 0, col: 0 } });

  // Track time-at-start-of-each-line so we can position markup events
  const lineStartTimes: number[] = [0];

  for (let lineIdx = 0; lineIdx < lines.length; lineIdx++) {
    const line = lines[lineIdx];
    lineStartTimes[lineIdx] = currentTimeMs;

    // Check if there's a speed-change markup event for this line
    const speedMarkup = markupEvents.find(
      me => me.lineIndex === lineIdx && me.type === 'set-speed'
    );
    if (speedMarkup) {
      currentSpeed = (speedMarkup.payload as { speed: number }).speed;
    }

    if (typingConfig.mode === 'line') {
      currentTimeMs += getTimeForUnit(currentSpeed);
      events.push({
        tMs: currentTimeMs,
        type: 'type-line',
        payload: { line: lineIdx, text: line, startCol: 0, endCol: line.length },
      });
    } else if (typingConfig.mode === 'word') {
      const words = line.split(/(\s+)/);
      for (let wordIdx = 0; wordIdx < words.length; wordIdx++) {
        currentTimeMs += getTimeForUnit(currentSpeed);
        events.push({
          tMs: currentTimeMs,
          type: 'type-word',
          payload: { line: lineIdx, text: words[wordIdx], wordIndex: wordIdx },
        });
      }
    } else {
      for (let col = 0; col < line.length; col++) {
        currentTimeMs += getTimeForUnit(currentSpeed);
        events.push({
          tMs: currentTimeMs,
          type: 'type-char',
          payload: { line: lineIdx, col, char: line[col] },
        });
      }
    }

    if (lineIdx < lines.length - 1) {
      currentTimeMs += getTimeForUnit(currentSpeed) * 0.5;
      events.push({
        tMs: currentTimeMs,
        type: 'type-char',
        payload: { line: lineIdx, col: lines[lineIdx].length, char: '\n' },
      });
    }
  }

  // Now insert markup events at the correct time (after their line starts typing)
  const nonSpeedMarkup = markupEvents.filter(me => me.type !== 'set-speed');
  let timeShift = 0;

  for (const markupEvent of nonSpeedMarkup) {
    const lineIdx = (markupEvent as { lineIndex?: number }).lineIndex ?? 0;
    const insertTime = (lineStartTimes[lineIdx] || 0) + timeShift;

    const event: TimelineEvent = {
      tMs: insertTime,
      type: markupEvent.type,
      payload: { ...markupEvent.payload },
    };

    // Handle pause: shift all subsequent events by pause duration
    if (markupEvent.type === 'pause') {
      const pauseDuration = (markupEvent.payload as { durationMs: number }).durationMs;
      timeShift += pauseDuration;
    }

    const insertIdx = events.findIndex(e => e.tMs > event.tMs);
    if (insertIdx >= 0) {
      events.splice(insertIdx, 0, event);
    } else {
      events.push(event);
    }
  }

  events.sort((a, b) => a.tMs - b.tMs);

  // Add 2s trailing silence for the final frame to linger
  const totalDurationMs = events.length > 0
    ? events[events.length - 1].tMs + 2000
    : 2000;

  return { totalDurationMs, events, fps };
}
