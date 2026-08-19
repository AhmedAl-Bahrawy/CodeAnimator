import type { Exporter, ExportOptions, CodeToken } from '@/types/domain';
import { highlightCode } from '@/services/highlighting/shiki';
import { RenderCoordinator } from './renderCoordinator';
import { GIFEncoder, quantize, applyPalette } from 'gifenc';

export const gifExporter: Exporter = {
  tierName: 'gif',
  isSupported: typeof window !== 'undefined' && typeof document !== 'undefined',

  async export(opts: ExportOptions, onProgress: (pct: number) => void, signal?: AbortSignal): Promise<Blob> {
    const {
      timeline, source, language, typingConfig, theme, background, windowChrome,
      typography, skin, width, height, fps, playbackSpeedMultiplier,
    } = opts;

    let allTokenLines: CodeToken[][] | null = null;
    try {
      const highlightResult = await highlightCode(source, language, theme.shikiTheme || theme.id);
      allTokenLines = highlightResult.lines.map((line) =>
        line.tokens.map((token) => ({ content: token.content, color: token.color, offset: token.offset })),
      );
    } catch {
      // Syntax highlighting is optional.
    }

    onProgress(5);
    const gifFps = Math.min(fps, 15);
    const effectiveMultiplier = Math.max(0.1, playbackSpeedMultiplier || 1);
    const scale = Math.min(1, 640 / Math.max(width, height));
    const gifWidth = Math.max(1, Math.round(width * scale));
    const gifHeight = Math.max(1, Math.round(height * scale));
    const frameDelay = Math.max(20, Math.round(1000 / (gifFps * effectiveMultiplier)));

    const coordinator = new RenderCoordinator({
      width,
      height,
      fps: gifFps,
      timeline,
      source,
      typingConfig,
      theme,
      background,
      windowChrome,
      typography,
      skin,
      appearance: opts.appearance,
      tokenLines: allTokenLines,
      speedMultiplier: effectiveMultiplier,
    });
    if (signal) signal.addEventListener('abort', () => coordinator.cancel(), { once: true });

    const canvas = document.createElement('canvas');
    canvas.width = gifWidth;
    canvas.height = gifHeight;
    const context = canvas.getContext('2d', { willReadFrequently: true });
    if (!context) {
      coordinator.terminate();
      throw new Error('This browser cannot create a GIF canvas.');
    }

    const gif = GIFEncoder();
    const totalFrames = Math.max(1, coordinator.totalFrameCount);
    let frameCount = 0;

    try {
      coordinator.startPipeline(2);
      let frame: Awaited<ReturnType<RenderCoordinator['nextFrame']>>;
      while ((frame = await coordinator.nextFrame()) !== null) {
        context.clearRect(0, 0, gifWidth, gifHeight);
        context.drawImage(frame.bitmap, 0, 0, gifWidth, gifHeight);
        frame.bitmap.close();

        const rgba = context.getImageData(0, 0, gifWidth, gifHeight).data;
        const palette = quantize(rgba, 256, { format: 'rgb565' });
        const indexed = applyPalette(rgba, palette, 'rgb565');
        gif.writeFrame(indexed, gifWidth, gifHeight, {
          palette,
          delay: frameDelay,
          repeat: 0,
        });

        frameCount += 1;
        onProgress(5 + Math.round((frame.frameIndex / totalFrames) * 90));
      }

      if (frameCount === 0) throw new Error('The GIF renderer produced no frames.');
      gif.finish();
      coordinator.terminate();
      onProgress(100);
      const bytes = gif.bytes();
      const output = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;
      return new Blob([output], { type: 'image/gif' });
    } catch (error) {
      coordinator.terminate();
      if (error instanceof Error && error.message.includes('cancelled')) {
        return new Blob([], { type: 'image/gif' });
      }
      throw error;
    }
  },
};
