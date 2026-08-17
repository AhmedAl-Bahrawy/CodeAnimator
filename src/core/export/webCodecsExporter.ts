import type { Exporter, ExportOptions, CodeToken } from '@/core/types';
import { highlightCode } from '@/core/highlighting/shiki';
import { RenderCoordinator } from './renderCoordinator';

export const webCodecsExporter: Exporter = {
  tierName: 'webcodecs',
  isSupported: typeof window !== 'undefined' && 'VideoEncoder' in window,

  async export(opts: ExportOptions, onProgress: (pct: number) => void, signal?: AbortSignal): Promise<Blob> {
    const { timeline, source, language, typingConfig, theme, background, windowChrome, typography, width, height, fps, format } = opts;

    if (!('VideoEncoder' in window) || !('VideoDecoder' in window)) {
      throw new Error('WebCodecs not supported');
    }

    onProgress(2);

    // Pre-compute Shiki tokens on main thread (Shiki can't run in workers)
    let allTokenLines: CodeToken[][] | null = null;
    try {
      const highlightResult = await highlightCode(source, language, theme.shikiTheme || theme.id);
      allTokenLines = highlightResult.lines.map(line =>
        line.tokens.map(t => ({ content: t.content, color: t.color, offset: t.offset }))
      );
    } catch {
      // Fallback: render without syntax highlighting
    }

    onProgress(5);

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
    });

    if (signal) {
      signal.addEventListener('abort', () => coordinator.cancel(), { once: true });
    }

    const totalFrames = coordinator.totalFrameCount;
    const chunks: ArrayBuffer[] = [];

    const encoder = new VideoEncoder({
      output: (chunk: EncodedVideoChunk) => {
        const buffer = new ArrayBuffer(chunk.byteLength);
        chunk.copyTo(buffer);
        chunks.push(buffer);
      },
      error: (e: DOMException) => {
        console.error('VideoEncoder error:', e);
      },
    });

    const codec = format === 'webm' ? 'vp09.00.10.08' : 'avc1.42001e';
    const mimeType = format === 'webm' ? 'video/webm' : 'video/mp4';

    encoder.configure({
      codec,
      width,
      height,
      bitrate: 8_000_000,
      framerate: fps,
      latencyMode: 'quality',
    });

    // Pipeline: dispatch frames in batches, encode as they arrive
    coordinator.startPipeline(4);

    try {
      let frame: Awaited<ReturnType<RenderCoordinator['nextFrame']>>;
      while ((frame = await coordinator.nextFrame()) !== null) {
        const videoFrame = new VideoFrame(frame.bitmap, { timestamp: (frame.frameIndex / fps) * 1_000_000 });
        await encoder.encode(videoFrame, { keyFrame: frame.frameIndex % (fps * 2) === 0 });
        videoFrame.close();
        frame.bitmap.close();

        onProgress(5 + Math.round((frame.frameIndex / totalFrames) * 85));
      }
    } catch (err) {
      if (err instanceof Error && err.message.includes('cancelled')) {
        // Export was cancelled
      } else {
        throw err;
      }
    }

    await encoder.flush();
    encoder.close();
    coordinator.terminate();

    onProgress(95);
    const blob = new Blob(chunks, { type: mimeType });
    onProgress(100);
    return blob;
  },
};
