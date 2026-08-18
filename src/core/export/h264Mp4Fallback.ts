import type { H264MP4Encoder } from 'h264-mp4-encoder';
import h264BundleUrl from 'h264-mp4-encoder/embuild/dist/h264-mp4-encoder.web.js?url';
import { highlightCode } from '@/core/highlighting/shiki';
import { RenderCoordinator } from './renderCoordinator';
import type { ExportOptions, CodeToken } from '@/core/types';

interface H264EncoderGlobal {
  createH264MP4Encoder: () => Promise<H264MP4Encoder>;
}

declare global {
  interface Window {
    HME?: H264EncoderGlobal;
  }
}

let encoderLoader: Promise<H264EncoderGlobal> | null = null;

function loadH264Encoder(): Promise<H264EncoderGlobal> {
  if (window.HME?.createH264MP4Encoder) return Promise.resolve(window.HME);
  if (encoderLoader) return encoderLoader;

  encoderLoader = new Promise<H264EncoderGlobal>((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>('script[data-code-animator-h264]');
    const finish = () => {
      if (window.HME?.createH264MP4Encoder) {
        resolve(window.HME);
      } else {
        reject(new Error('The H.264 MP4 encoder loaded without exposing its API.'));
      }
    };

    if (existing) {
      existing.addEventListener('load', finish, { once: true });
      existing.addEventListener('error', () => reject(new Error('The H.264 MP4 encoder failed to load.')), { once: true });
      return;
    }

    const script = document.createElement('script');
    script.dataset.codeAnimatorH264 = 'true';
    script.src = h264BundleUrl;
    script.async = true;
    script.addEventListener('load', finish, { once: true });
    script.addEventListener('error', () => reject(new Error('The H.264 MP4 encoder failed to load.')), { once: true });
    document.head.appendChild(script);
  }).catch((error) => {
    encoderLoader = null;
    throw error;
  });

  return encoderLoader;
}

async function resolveTokenLines(source: string, language: string, themeId: string): Promise<CodeToken[][] | null> {
  try {
    const highlightResult = await highlightCode(source, language, themeId);
    return highlightResult.lines.map((line) =>
      line.tokens.map((token) => ({ content: token.content, color: token.color, offset: token.offset })),
    );
  } catch {
    return null;
  }
}

function createRgbaCanvas(width: number, height: number): {
  canvas: OffscreenCanvas | HTMLCanvasElement;
  context: OffscreenCanvasRenderingContext2D | CanvasRenderingContext2D;
} {
  if (typeof OffscreenCanvas !== 'undefined') {
    const canvas = new OffscreenCanvas(width, height);
    const context = canvas.getContext('2d', { willReadFrequently: true });
    if (!context) throw new Error('The browser cannot create a 2D canvas for MP4 export.');
    return { canvas, context };
  }

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext('2d', { willReadFrequently: true });
  if (!context) throw new Error('The browser cannot create a 2D canvas for MP4 export.');
  return { canvas, context };
}

export async function h264Mp4FallbackExporter(
  opts: ExportOptions,
  onProgress: (pct: number) => void,
  signal?: AbortSignal,
): Promise<Blob> {
  if (signal?.aborted) return new Blob([], { type: 'video/mp4' });

  const { timeline, source, language, typingConfig, theme, background, windowChrome,
    typography, skin, width, height, fps, playbackSpeedMultiplier } = opts;
  const encoderApi = await loadH264Encoder();
  const encodeWidth = Math.max(2, width - (width % 2));
  const encodeHeight = Math.max(2, height - (height % 2));
  const encoder = await encoderApi.createH264MP4Encoder();
  const outputFilename = `code-animator-${Date.now()}.mp4`;
  const { context } = createRgbaCanvas(encodeWidth, encodeHeight);
  let coordinator: RenderCoordinator | null = null;

  try {
    encoder.outputFilename = outputFilename;
    encoder.width = encodeWidth;
    encoder.height = encodeHeight;
    encoder.frameRate = fps;
    encoder.kbps = 6_000;
    encoder.speed = 10;
    encoder.groupOfPictures = Math.max(1, fps * 2);
    encoder.initialize();

    const tokenLines = await resolveTokenLines(source, language, theme.shikiTheme || theme.id);
    coordinator = new RenderCoordinator({
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
      skin,
      appearance: opts.appearance,
      tokenLines,
      speedMultiplier: playbackSpeedMultiplier,
    });

    if (signal) signal.addEventListener('abort', () => coordinator?.cancel(), { once: true });

    const totalFrames = Math.max(1, coordinator.totalFrameCount);
    onProgress(8);
    coordinator.startPipeline(2);

    let frame: Awaited<ReturnType<RenderCoordinator['nextFrame']>>;
    while ((frame = await coordinator.nextFrame()) !== null) {
      if (signal?.aborted) {
        frame.bitmap.close();
        return new Blob([], { type: 'video/mp4' });
      }
      context.clearRect(0, 0, encodeWidth, encodeHeight);
      context.drawImage(frame.bitmap, 0, 0, encodeWidth, encodeHeight);
      const rgba = context.getImageData(0, 0, encodeWidth, encodeHeight).data;
      encoder.addFrameRgba(rgba);
      frame.bitmap.close();
      onProgress(8 + Math.round((frame.frameIndex / totalFrames) * 84));
    }

    encoder.finalize();
    const output = encoder.FS.readFile(encoder.outputFilename);
    if (!output || output.byteLength === 0) throw new Error('The H.264 encoder produced an empty MP4 file.');
    onProgress(100);
    return new Blob([new Uint8Array(output)], { type: 'video/mp4' });
  } finally {
    coordinator?.terminate();
    encoder.delete();
  }
}
