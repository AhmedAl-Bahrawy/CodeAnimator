import type { Timeline, TypingConfig, CodeTheme, BackgroundPreset, WindowChromeConfig, TypographySettings, CodeToken, UISkin, SceneAppearance } from '@/types/domain';
import { renderFrame } from '@/services/render/renderFrame';
import { getStateAtTime } from '@/services/timeline/getStateAtTime';

/** Messages sent from main thread → worker */
export type WorkerInMessage =
  | {
      type: 'init';
      width: number;
      height: number;
      fps: number;
      timeline: Timeline;
      source: string;
      typingConfig: TypingConfig;
      theme: CodeTheme;
      background: BackgroundPreset;
      windowChrome: WindowChromeConfig;
      typography: TypographySettings;
      skin: UISkin;
      appearance: SceneAppearance;
      tokenLines: CodeToken[][] | null;
      speedMultiplier: number;
    }
  | { type: 'render-frame'; frameIndex: number }
  | { type: 'cancel' };

/** Messages sent from worker → main thread */
export type WorkerOutMessage =
  | { type: 'frame-ready'; frameIndex: number; bitmap: ImageBitmap }
  | { type: 'complete' }
  | { type: 'error'; message: string };

let canvas: OffscreenCanvas | null = null;
let ctx: OffscreenCanvasRenderingContext2D | null = null;
let cancelled = false;

// Config stored after init
let config: {
  width: number;
  height: number;
  fps: number;
  timeline: Timeline;
  source: string;
  typingConfig: TypingConfig;
  theme: CodeTheme;
  background: BackgroundPreset;
  windowChrome: WindowChromeConfig;
  typography: TypographySettings;
  skin: UISkin;
  appearance: SceneAppearance;
  tokenLines: CodeToken[][] | null;
  speedMultiplier: number;
} | null = null;

self.onmessage = (e: MessageEvent<WorkerInMessage>) => {
  const msg = e.data;

  switch (msg.type) {
    case 'init': {
      cancelled = false;
      config = {
        width: msg.width,
        height: msg.height,
        fps: msg.fps,
        timeline: msg.timeline,
        source: msg.source,
        typingConfig: msg.typingConfig,
        theme: msg.theme,
        background: msg.background,
        windowChrome: msg.windowChrome,
        typography: msg.typography,
        skin: msg.skin,
        appearance: msg.appearance,
        tokenLines: msg.tokenLines,
        speedMultiplier: msg.speedMultiplier,
      };
      canvas = new OffscreenCanvas(msg.width, msg.height);
      ctx = canvas.getContext('2d');
      (self as unknown as Worker).postMessage({ type: 'complete' } satisfies WorkerOutMessage);
      break;
    }

    case 'render-frame': {
      if (!config || !canvas || !ctx) {
        (self as unknown as Worker).postMessage({ type: 'error', message: 'Worker not initialized' } satisfies WorkerOutMessage);
        return;
      }

      if (cancelled) return;

      const { frameIndex } = msg;
      // Sample the source timeline faster or slower while keeping the output
      // frame rate stable. The coordinator emits fewer frames for faster speed.
      const tMs = (frameIndex / config.fps) * 1000 * (config.speedMultiplier || 1);
      const state = getStateAtTime(config.timeline, tMs, config.source, config.typingConfig);

      // Map pre-computed token lines to visible lines
      const tokenLinesForFrame: CodeToken[][] | null = config.tokenLines
        ? state.visibleLines.map((_, lineIdx) => config!.tokenLines![lineIdx] || [])
        : null;

      renderFrame({
        ctx: ctx as unknown as CanvasRenderingContext2D,
        width: config.width,
        height: config.height,
        state,
        theme: config.theme,
        background: config.background,
        windowChrome: config.windowChrome,
        typography: config.typography,
        typingConfig: config.typingConfig,
        skin: config.skin,
        appearance: config.appearance,
        frameIndex,
        fps: config.fps,
        timeMs: state.playheadMs,
        totalDurationMs: config.timeline.totalDurationMs,
        visibleLines: state.visibleLines,
        tokenLines: tokenLinesForFrame,
      });

      // Create ImageBitmap and transfer it back
      canvas.convertToBlob().then((blob) => {
        if (cancelled) return;
        createImageBitmap(blob).then((bitmap) => {
          if (cancelled) {
            bitmap.close();
            return;
          }
          (self as unknown as Worker).postMessage(
            { type: 'frame-ready', frameIndex, bitmap } satisfies WorkerOutMessage,
            { transfer: [bitmap] }
          );
        });
      });
      break;
    }

    case 'cancel': {
      cancelled = true;
      break;
    }
  }
};
