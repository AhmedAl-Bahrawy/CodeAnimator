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

  // Build a speed map from markup events (lineIndex -> speed)
  const speedMap = new Map<number, number>();
  for (const me of markupEvents) {
    if (me.type === 'set-speed') {
      speedMap.set(me.lineIndex ?? 0, (me.payload as { speed: number }).speed);
    }
  }

  // Build a list of per-line markup events (excluding speed, which is handled via speedMap)
  const perLineMarkup = new Map<number, (TimelineEvent & { lineIndex?: number })[]>();
  for (const me of markupEvents) {
    if (me.type === 'set-speed') continue;
    const lineIdx = me.lineIndex ?? 0;
    if (!perLineMarkup.has(lineIdx)) perLineMarkup.set(lineIdx, []);
    perLineMarkup.get(lineIdx)!.push(me);
  }

  // Emit typing events, inserting markup and pauses at the right moments
  // BLK-04: Build events in one pass so pauses properly shift subsequent events

  // Start with cursor jump
  events.push({ tMs: 0, type: 'cursor-jump', payload: { line: 0, col: 0 } });

  for (let lineIdx = 0; lineIdx < lines.length; lineIdx++) {
    const line = lines[lineIdx];

    // Check for speed change on this line
    if (speedMap.has(lineIdx)) {
      currentSpeed = speedMap.get(lineIdx)!;
      events.push({
        tMs: currentTimeMs,
        type: 'set-speed',
        payload: { speed: currentSpeed },
      } as TimelineEvent);
    }

    // Emit pre-line markup events (e.g. highlight, focus, pause, clear, cut)
    const lineMarkup = perLineMarkup.get(lineIdx) || [];
    const pauseEvents = lineMarkup.filter(e => e.type === 'pause');
    const otherMarkup = lineMarkup.filter(e => e.type !== 'pause');

    // Non-pause markup events at the start of this line
    for (const me of otherMarkup) {
      events.push({
        tMs: currentTimeMs,
        type: me.type,
        payload: { ...me.payload },
      });
    }

    // Typing events for this line
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

    // Pause events AFTER this line's typing (BLK-04 proper)
    for (const pauseEv of pauseEvents) {
      const pauseDurationMs = (pauseEv.payload as { durationMs: number }).durationMs;
      // Emit the pause event
      events.push({
        tMs: currentTimeMs,
        type: 'pause',
        payload: { durationMs: pauseDurationMs },
      });
      // Shift current time forward — this is the key fix
      currentTimeMs += pauseDurationMs;
    }

    // Newline between lines (not after the last line)
    if (lineIdx < lines.length - 1) {
      currentTimeMs += getTimeForUnit(currentSpeed) * 0.5;
      events.push({
        tMs: currentTimeMs,
        type: 'type-char',
        payload: { line: lineIdx, col: lines[lineIdx].length, char: '\n' },
      });
    }
  }

  events.sort((a, b) => a.tMs - b.tMs);

  // Add 2s trailing silence
  const totalDurationMs = events.length > 0
    ? events[events.length - 1].tMs + 2000
    : 2000;

  return { totalDurationMs, events, fps };
}
