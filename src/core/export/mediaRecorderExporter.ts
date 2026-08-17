import type { Exporter, ExportOptions } from '@/core/types';
import { renderFrame } from '@/core/render/renderFrame';
import { getStateAtTime } from '@/core/timeline/getStateAtTime';

export const mediaRecorderExporter: Exporter = {
  tierName: 'mediarecorder',
  isSupported: typeof window !== 'undefined' && 'MediaRecorder' in window && typeof HTMLCanvasElement.prototype.captureStream === 'function',

  async export(opts: ExportOptions, onProgress: (pct: number) => void, signal?: AbortSignal): Promise<Blob> {
    const { timeline, source, typingConfig, theme, background, windowChrome, width, height, fps } = opts;

    if (!this.isSupported) {
      throw new Error('MediaRecorder not supported');
    }

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d')!;

    const stream = (canvas as HTMLCanvasElement).captureStream(fps);
    const mimeType = MediaRecorder.isTypeSupported('video/webm;codecs=vp9')
      ? 'video/webm;codecs=vp9'
      : 'video/webm';

    const recorder = new MediaRecorder(stream, {
      mimeType,
      videoBitsPerSecond: 8_000_000,
    });

    const chunks: Blob[] = [];
    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) chunks.push(e.data);
    };

    return new Promise((resolve, reject) => {
      let cancelled = false;

      recorder.onstop = () => {
        const blob = new Blob(chunks, { type: 'video/webm' });
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

      const totalFrames = Math.ceil((timeline.totalDurationMs / 1000) * fps);
      const frameDuration = 1000 / fps;
      let currentFrame = 0;

      function renderNextFrame() {
        if (cancelled || currentFrame >= totalFrames) {
          if (recorder.state !== 'inactive') recorder.stop();
          return;
        }

        const tMs = (currentFrame / fps) * 1000;
        const state = getStateAtTime(timeline, tMs, source, typingConfig);

        renderFrame({
          ctx,
          width,
          height,
          state,
          theme,
          background,
          windowChrome,
          frameIndex: currentFrame,
          fps,
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
