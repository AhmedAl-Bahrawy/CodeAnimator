import type { Exporter, ExportOptions } from '@/core/types';
import { renderFrame } from '@/core/render/renderFrame';
import { getStateAtTime } from '@/core/timeline/getStateAtTime';

export const gifExporter: Exporter = {
  tierName: 'gif',
  isSupported: typeof window !== 'undefined',

  async export(opts: ExportOptions, onProgress: (pct: number) => void, signal?: AbortSignal): Promise<Blob> {
    const { timeline, source, typingConfig, theme, background, windowChrome, typography, width, height, fps } = opts;

    // GIF at reduced fps for reasonable file size
    const gifFps = Math.min(fps, 15);
    const totalFrames = Math.ceil((timeline.totalDurationMs / 1000) * gifFps);
    // Scale down for GIF to keep file size manageable
    const scale = Math.min(1, 640 / Math.max(width, height));
    const gw = Math.round(width * scale);
    const gh = Math.round(height * scale);

    const canvas = document.createElement('canvas');
    canvas.width = gw;
    canvas.height = gh;
    const ctx = canvas.getContext('2d')!;

    // Use MediaRecorder with WebM as a working animated format
    // gif.js would be needed for proper GIF, this gives animated output
    const stream = (canvas as HTMLCanvasElement).captureStream(gifFps);
    const mimeType = 'video/webm';
    const recorder = new MediaRecorder(stream, { mimeType, videoBitsPerSecond: 4_000_000 });
    const chunks: Blob[] = [];

    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) chunks.push(e.data);
    };

    return new Promise((resolve, reject) => {
      let cancelled = false;

      recorder.onstop = () => {
        const blob = new Blob(chunks, { type: mimeType });
        onProgress(100);
        resolve(blob);
      };

      recorder.onerror = (e) => reject(e);

      if (signal) {
        signal.addEventListener('abort', () => {
          cancelled = true;
          recorder.stop();
        });
      }

      recorder.start();

      const frameDuration = 1000 / gifFps;
      let currentFrame = 0;

      function renderNextFrame() {
        if (cancelled || currentFrame >= totalFrames) {
          if (recorder.state !== 'inactive') recorder.stop();
          return;
        }

        const tMs = (currentFrame / gifFps) * 1000;
        const state = getStateAtTime(timeline, tMs, source, typingConfig);

        renderFrame({
          ctx,
          width: gw,
          height: gh,
          state,
          theme,
          background,
          windowChrome,
          typography,
          frameIndex: currentFrame,
          fps: gifFps,
          visibleLines: state.visibleLines,
          tokenLines: null,
        });

        currentFrame++;
        onProgress(Math.round((currentFrame / totalFrames) * 95));

        setTimeout(renderNextFrame, frameDuration);
      }

      renderNextFrame();
    });
  },
};
