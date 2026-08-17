import type { Exporter, ExportOptions } from '@/core/types';
import { renderFrame } from '@/core/render/renderFrame';
import { getStateAtTime } from '@/core/timeline/getStateAtTime';

export const webCodecsExporter: Exporter = {
  tierName: 'webcodecs',
  isSupported: typeof window !== 'undefined' && 'VideoEncoder' in window,

  async export(opts: ExportOptions, onProgress: (pct: number) => void, signal?: AbortSignal): Promise<Blob> {
    const { timeline, source, typingConfig, theme, background, windowChrome, width, height, fps, format } = opts;

    if (!('VideoEncoder' in window) || !('VideoDecoder' in window)) {
      throw new Error('WebCodecs not supported');
    }

    onProgress(2);

    const totalFrames = Math.ceil((timeline.totalDurationMs / 1000) * fps);
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d')!;

    const chunks: ArrayBuffer[] = [];

    const encoder = new VideoEncoder({
      output: (chunk: VideoEncoderChunk) => {
        const buffer = new ArrayBuffer(chunk.byteLength);
        chunk.copyTo(buffer);
        chunks.push(buffer);
        chunk.close();
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

    for (let i = 0; i < totalFrames; i++) {
      if (signal?.aborted) {
        encoder.close();
        throw new Error('Export cancelled');
      }

      const tMs = (i / fps) * 1000;
      const state = getStateAtTime(timeline, tMs, source, typingConfig);

      renderFrame({
        ctx,
        width,
        height,
        state,
        theme,
        background,
        windowChrome,
        frameIndex: i,
        fps,
        visibleLines: state.visibleLines,
        tokenLines: null,
      });

      const bitmap = await createImageBitmap(canvas);
      const frame = new VideoFrame(bitmap, { timestamp: (i / fps) * 1_000_000 });
      await encoder.encode(frame, { keyFrame: i % (fps * 2) === 0 });
      frame.close();
      bitmap.close();

      onProgress(5 + Math.round((i / totalFrames) * 85));
    }

    await encoder.flush();
    encoder.close();

    onProgress(95);
    const blob = new Blob(chunks, { type: mimeType });
    onProgress(100);
    return blob;
  },
};
