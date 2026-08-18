import type { Exporter, ExportOptions, CodeToken } from '@/core/types';
import { highlightCode } from '@/core/highlighting/shiki';
import { RenderCoordinator } from './renderCoordinator';

export const mediaRecorderExporter: Exporter = {
  tierName: 'mediarecorder',
  isSupported: typeof window !== 'undefined' && 'MediaRecorder' in window && typeof HTMLCanvasElement.prototype.captureStream === 'function',

  async export(opts: ExportOptions, onProgress: (pct: number) => void, signal?: AbortSignal): Promise<Blob> {
    const { timeline, source, language, typingConfig, theme, background, windowChrome, typography, width, height, fps, playbackSpeedMultiplier } = opts;

    if (!this.isSupported) {
      throw new Error('MediaRecorder not supported');
    }

    // Pre-compute Shiki tokens on main thread
    let allTokenLines: CodeToken[][] | null = null;
    try {
      const highlightResult = await highlightCode(source, language, theme.shikiTheme || theme.id);
      allTokenLines = highlightResult.lines.map(line =>
        line.tokens.map(t => ({ content: t.content, color: t.color, offset: t.offset }))
      );
    } catch {
      // Fallback: render without syntax highlighting
    }

    // Main-thread canvas for MediaRecorder captureStream (required by spec)
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const mainCtx = canvas.getContext('2d')!;

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

      // Spawn render worker
      const coordinator = new RenderCoordinator({
        width,
        height,
        fps,
        timeline,
        source,
        typingConfig,
        theme,
        background,
        windowChrome,
        typography,
        tokenLines: allTokenLines,
        speedMultiplier: playbackSpeedMultiplier,
        onFrameReady: () => {
          /* frames arrive through nextFrame(); nothing else needed here */
        },
      });

      if (signal) {
        signal.addEventListener('abort', () => {
          cancelled = true;
          coordinator.cancel();
          recorder.stop();
        }, { once: true });
      }

      coordinator.startPipeline(2);
      recorder.start();

      const totalFrames = coordinator.totalFrameCount;
      const frameDuration = 1000 / fps;

      (async () => {
        try {
          let frame: Awaited<ReturnType<RenderCoordinator['nextFrame']>>;
          while ((frame = await coordinator.nextFrame()) !== null) {
            if (cancelled) break;

            // Paint worker-rendered bitmap onto main-thread canvas for captureStream
            mainCtx.clearRect(0, 0, width, height);
            mainCtx.drawImage(frame.bitmap, 0, 0);
            frame.bitmap.close();

            onProgress(Math.round((frame.frameIndex / totalFrames) * 95));

            // Wait frame duration to maintain real-time recording pace
            await new Promise(r => setTimeout(r, frameDuration));
          }
        } catch (err) {
          if (!(err instanceof Error && err.message.includes('cancelled'))) {
            recorder.onerror = () => {};
            recorder.stop();
            reject(err);
            return;
          }
        }

        if (recorder.state !== 'inactive') recorder.stop();
        coordinator.terminate();
      })();
    });
  },
};
