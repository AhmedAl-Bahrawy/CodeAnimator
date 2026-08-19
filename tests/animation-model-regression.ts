import { buildTimelineFromSource } from '../src/services/timeline/buildTimeline';
import { getStateAtTime } from '../src/services/timeline/getStateAtTime';
import { clipTokenLinesToVisibleLines } from '../src/services/render/visibleTokens';
import type { CodeToken, TypingConfig } from '../src/types/domain';

const source = 'const greeting = "hello";\nconsole.log(greeting);';
const baseTyping: TypingConfig = {
  mode: 'character',
  baseSpeed: 40,
  cursorStyle: 'bar',
  cursorBlinkRate: 530,
  autoScroll: true,
};

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

function sampleAtEveryRevealEvent(typingConfig: TypingConfig) {
  const timeline = buildTimelineFromSource({ source, typingConfig, fps: 30 });
  const revealEvents = timeline.events.filter((event) => event.type.startsWith('type-'));
  assert(timeline.contentDurationMs > 0, `${typingConfig.mode}: content duration must be positive`);
  assert(timeline.totalDurationMs >= timeline.contentDurationMs, `${typingConfig.mode}: total duration must contain content duration`);

  let previousText = '';
  for (const event of revealEvents) {
    const state = getStateAtTime(timeline, event.tMs, source, typingConfig, { cursorFollow: 'exact' });
    assert(source.startsWith(state.visibleText), `${typingConfig.mode}: visible text is not a source prefix at ${event.tMs}ms`);
    assert(state.visibleText.length >= previousText.length, `${typingConfig.mode}: visible text regressed`);
    assert(state.cursorLine >= 0 && state.cursorLine < source.split('\n').length, `${typingConfig.mode}: cursor line escaped source`);
    assert(state.cursorCol >= 0, `${typingConfig.mode}: cursor column became negative`);
    previousText = state.visibleText;
  }

  const fullState = getStateAtTime(timeline, timeline.totalDurationMs, source, typingConfig);
  assert(fullState.visibleText === source, `${typingConfig.mode}: final frame did not reveal the complete source`);
  return timeline;
}

const characterTimeline = sampleAtEveryRevealEvent(baseTyping);
sampleAtEveryRevealEvent({ ...baseTyping, mode: 'word' });
sampleAtEveryRevealEvent({ ...baseTyping, mode: 'line' });

const fullTokens: CodeToken[][] = source.split('\n').map((line, lineIndex) => [{
  content: line,
  color: '#fff',
  offset: lineIndex === 0 ? 0 : source.indexOf(line),
}]);
const partialState = getStateAtTime(characterTimeline, characterTimeline.events.find((event) => event.type === 'type-char')!.tMs, source, baseTyping);
const clipped = clipTokenLinesToVisibleLines(fullTokens, partialState.visibleLines) || [];
for (let lineIndex = 0; lineIndex < partialState.visibleLines.length; lineIndex += 1) {
  assert(
    clipped[lineIndex].map((token) => token.content).join('') === partialState.visibleLines[lineIndex],
    `token clipping mismatch on visible line ${lineIndex}`,
  );
}

console.log(JSON.stringify({
  ok: true,
  characterEvents: characterTimeline.events.filter((event) => event.type === 'type-char').length,
  contentDurationMs: characterTimeline.contentDurationMs,
  totalDurationMs: characterTimeline.totalDurationMs,
}));
