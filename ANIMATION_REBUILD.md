# Animation System Rebuild

## Audit Findings

The current animation pipeline has a correct-looking event stream but several consumers do not honor the same state contract.

| Area | Current behavior | Consequence |
| --- | --- | --- |
| Timeline generation | Character mode emits one `type-char` event per source character; word mode emits non-whitespace and whitespace segments; line mode emits one line event. | The event stream is capable of deterministic reveal, but its semantics are not exposed as a complete frame model. |
| Canvas text rendering | Preview maps full Shiki token lines to every currently visible line. | A partial line can draw complete token content even while the cursor advances character by character. This is the primary reported bug. |
| Export text rendering | The worker repeats the same full-token-line mapping used by preview. | MP4, WebM, and GIF can diverge from the preview during partial-line reveal. |
| Paused preview | Initial and paused renders call `buildFullSourceState()`, replacing the timeline state with the entire source. | Seeking or changing animation settings can appear broken because the canvas bypasses the selected playhead whenever playback is stopped. |
| Cursor follow | `cursorFollow` is exposed in the Animation tab and resolved into appearance, but replay always uses the exact current event cursor. | Word-end and line-end options are dead controls. |
| Animation panel | The timeline bar is a static one-third fill and the panel does not expose the current playhead or reset behavior. | The panel claims synchronization but does not visually represent the actual timeline. |
| Typing speed UI | Speed is always labeled `chars/sec`, even for word and line modes. | The control communicates the wrong unit and makes non-character modes harder to reason about. |
| Motion metrics | Intro/outro motion uses the entire timeline duration as reveal progress. | Content timing and scene transition timing are coupled, which makes motion feel inconsistent when typing speed or pauses change. |
| Regression coverage | Existing animation regression checks that the tab exists and pixels change. | It does not assert that visible text is a prefix of source, that cursor and text agree, or that preview/export use identical frame states. |

## Replacement Contract

The rebuilt system will use one pure frame sampler:

```text
AnimationDocument
  source
  typingConfig
  animationSettings
  presentationSettings
  audioSettings
  fps
        │
        ▼
compileAnimationTimeline(document)
        │
        ▼
AnimationTimeline
  duration
  contentDuration
  events
  sourceLines
  reveal checkpoints
        │
        ▼
sampleAnimationFrame(tMs, timeline)
        │
        ▼
AnimationFrame
  playheadMs
  contentProgress
  visibleLines
  visibleText
  cursorLine
  cursorCol
  cursorVisible
  active directives
  motion metrics
  crossed event range metadata
```

The frame sampler is the only authority for visible source, cursor position, cursor blink, content progress, and active timeline directives. Preview and export will call the same sampler. The canvas renderer will receive already-clipped token lines whose combined content exactly equals `visibleLines`; it will never infer reveal state from full-source tokens.

## Timing Semantics

Typing speed is expressed in **visible units per second**. A character animation consumes one unit per character, a word animation consumes one unit per word or whitespace segment, and a line animation consumes one unit per line. Newlines use a short fractional unit so the cursor advances naturally without creating a visually empty pause. Explicit pause and sound directives are placed on the same absolute playhead and do not change reveal state.

The timeline separates `contentDurationMs` from the total scene duration. Intro and outro motion are normalized against the scene duration, while reveal progress is normalized against content duration. This prevents a long outro or a user pause from making the actual typing reveal finish too early or too late.

## Cursor Semantics

The exact cursor is derived from the last visible source position. `word-end` keeps the cursor at the end of the currently revealed word segment, and `line-end` keeps it at the end of the currently revealed line. The cursor never advances beyond the last visible character, including during pauses and after a line break.

Cursor blinking is deterministic: visibility is a pure function of the sampled playhead and `cursorBlinkRate`. Playback frame rate, React renders, dropped frames, and export scheduling cannot affect blink phase.

## Preview, Audio, and Export Parity

The preview RAF loop advances a single playhead and samples frames from the shared model. Pausing leaves the current sampled frame visible; it does not replace it with the full source. The timeline slider seeks and renders the exact sampled frame immediately.

Audio cues are triggered from the crossed event interval between the previous and current playhead. Seeking resets the event cursor rather than replaying an arbitrary burst of sounds. Export frame timestamps use the same playhead equation as preview and pass the shared frame sampler into the worker.

## Verification Requirements

The rebuild is complete only when automated checks assert the following invariants:

| Invariant | Required assertion |
| --- | --- |
| Character reveal | At every sampled time, each visible line is a prefix of its source line and the cursor column equals the visible prefix length. |
| Word reveal | The visible source changes only at word/whitespace boundaries and the cursor follows the configured mode. |
| Line reveal | Previously completed lines remain complete and the active line is either empty or complete. |
| Token parity | Clipped token content exactly matches visible line content in preview and export. |
| Pause behavior | A paused/seeked frame is not replaced by full source unless the playhead is at the end. |
| Settings reactivity | Changing mode, speed, cursor follow, easing, intro, or outro rebuilds the sampled timeline and resets safely. |
| Export parity | A preview sample and worker sample at the same playhead produce equivalent frame state. |

## Implemented in This Refactor

The implementation now carries `contentDurationMs` on every timeline, replays source-prefix buffers with explicit source coordinates, honors cursor-follow modes, clips syntax tokens centrally inside `renderFrame`, and sends the same unclipped token source to the export worker. The preview transport and Animation tab share the timeline store through `useAnimationTransport`; the panel now exposes live play, pause, reset, seek, duration, and reveal timing instead of a static progress bar. Replacing a timeline resets the playhead and stops stale playback.

The new `tests/animation-model-regression.ts` directly validates character, word, and line reveal invariants, final-frame completion, cursor bounds, and token-content parity. The existing browser/media regressions continue to cover visual frame changes, editor/canvas parity, branded skins, workspace interaction, source visibility, and playable MP4/WebM output.

## Validation Result

The deterministic model regression passed with 48 character reveal events, a content duration of 1,183.75 ms, and a total scene duration of 2,983.75 ms. TypeScript, ESLint, production build, animation, parity, Academy, workspace/audio, source-canvas, and MP4/WebM media-probe checks all passed without browser errors.
