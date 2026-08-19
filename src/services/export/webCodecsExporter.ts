import type { Exporter, ExportOptions, CodeToken } from '@/types/domain';
import { highlightCode } from '@/services/highlighting/shiki';
import { RenderCoordinator } from './renderCoordinator';
import { mediaRecorderExporter } from './mediaRecorderExporter';
import { h264Mp4FallbackExporter } from './h264Mp4Fallback';
import { Muxer as Mp4Muxer, ArrayBufferTarget as Mp4Target } from 'mp4-muxer';
import { Muxer as WebmMuxer, ArrayBufferTarget as WebmTarget } from 'webm-muxer';

async function checkCodecSupport(codec: string, width: number, height: number, fps: number): Promise<boolean> {
  try {
    if (!('VideoEncoder' in window)) return false;
    const result = await VideoEncoder.isConfigSupported({
      codec,
      width,
      height,
      bitrate: 8_000_000,
      framerate: fps,
    });
    return result.supported === true;
  } catch {
    return false;
  }
}

export const webCodecsExporter: Exporter = {
  tierName: 'webcodecs',
  isSupported: typeof window !== 'undefined' && 'VideoEncoder' in window,

  async export(opts: ExportOptions, onProgress: (pct: number) => void, signal?: AbortSignal): Promise<Blob> {
    const {
      timeline, source, language, typingConfig, theme, background, windowChrome,
      typography, skin, width, height, fps, format, playbackSpeedMultiplier,
    } = opts;

    if (!('VideoEncoder' in window)) {
      if (format === 'mp4') {
        return h264Mp4FallbackExporter(opts, onProgress, signal);
      }
      if (mediaRecorderExporter.isSupported) {
        return mediaRecorderExporter.export(opts, onProgress, signal);
      }
      throw new Error('This browser cannot encode video. Choose GIF or use a browser with WebCodecs support.');
    }

    onProgress(2);
    const mp4Codec = 'avc1.42001e';
    const webmCodecCandidates = [
      { encoderCodec: 'vp09.00.10.08', muxerCodec: 'V_VP9' },
      { encoderCodec: 'vp8', muxerCodec: 'V_VP8' },
    ] as const;
    let codec: string;
    let webmMuxerCodec = 'V_VP9';

    if (format === 'mp4') {
      if (!(await checkCodecSupport(mp4Codec, width, height, fps))) {
        return h264Mp4FallbackExporter(opts, onProgress, signal);
      }
      codec = mp4Codec;
    } else {
      let supportedWebmCodec: (typeof webmCodecCandidates)[number] | null = null;
      for (const candidate of webmCodecCandidates) {
        if (await checkCodecSupport(candidate.encoderCodec, width, height, fps)) {
          supportedWebmCodec = candidate;
          break;
        }
      }
      if (!supportedWebmCodec) {
        if (mediaRecorderExporter.isSupported) {
          return mediaRecorderExporter.export(opts, onProgress, signal);
        }
        throw new Error('This browser cannot encode VP8 or VP9 WebM. Choose MP4, GIF, or use a browser with WebCodecs support.');
      }
      codec = supportedWebmCodec.encoderCodec;
      webmMuxerCodec = supportedWebmCodec.muxerCodec;
    }

    onProgress(3);

    let allTokenLines: CodeToken[][] | null = null;
    try {
      const highlightResult = await highlightCode(source, language, theme.shikiTheme || theme.id);
      allTokenLines = highlightResult.lines.map((line) =>
        line.tokens.map((token) => ({ content: token.content, color: token.color, offset: token.offset })),
      );
    } catch {
      // Syntax highlighting is optional; the frame renderer can draw plain text.
    }

    onProgress(5);
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
      skin,
      appearance: opts.appearance,
      tokenLines: allTokenLines,
      speedMultiplier: playbackSpeedMultiplier,
    });

    if (signal) signal.addEventListener('abort', () => coordinator.cancel(), { once: true });

    const totalFrames = Math.max(1, coordinator.totalFrameCount);
    const useMp4 = format === 'mp4';
    const mp4Target = useMp4 ? new Mp4Target() : null;
    const webmTarget = useMp4 ? null : new WebmTarget();
    const mp4Muxer = mp4Target
      ? new Mp4Muxer({
          target: mp4Target,
          video: { codec: 'avc', width, height, frameRate: fps },
          fastStart: 'in-memory',
        })
      : null;
    const webmMuxer = webmTarget
      ? new WebmMuxer({
          target: webmTarget,
          video: { codec: webmMuxerCodec, width, height, frameRate: fps },
          firstTimestampBehavior: 'offset',
        })
      : null;

    let encoderError: Error | null = null;
    const encoder = new VideoEncoder({
      output: (chunk: EncodedVideoChunk, metadata?: EncodedVideoChunkMetadata) => {
        if (mp4Muxer) mp4Muxer.addVideoChunk(chunk, metadata);
        else webmMuxer?.addVideoChunk(chunk, metadata);
      },
      error: (error: DOMException) => {
        encoderError = new Error(error.message || 'Video encoder failed.');
      },
    });

    try {
      encoder.configure({
        codec,
        width,
        height,
        bitrate: 8_000_000,
        framerate: fps,
        latencyMode: 'quality',
      });

      coordinator.startPipeline(4);
      let frame: Awaited<ReturnType<RenderCoordinator['nextFrame']>>;
      while ((frame = await coordinator.nextFrame()) !== null) {
        const timestamp = Math.round((frame.frameIndex / fps) * 1_000_000);
        const videoFrame = new VideoFrame(frame.bitmap, { timestamp });
        encoder.encode(videoFrame, { keyFrame: frame.frameIndex % Math.max(1, fps * 2) === 0 });
        videoFrame.close();
        frame.bitmap.close();
        onProgress(5 + Math.round((frame.frameIndex / totalFrames) * 85));
      }

      await encoder.flush();
      if (encoderError) throw encoderError;
      encoder.close();
      coordinator.terminate();
      mp4Muxer?.finalize();
      webmMuxer?.finalize();

      onProgress(95);
      const output = useMp4 ? mp4Target?.buffer : webmTarget?.buffer;
      if (!output || output.byteLength === 0) throw new Error('The encoder produced an empty file.');
      onProgress(100);
      return new Blob([output], { type: useMp4 ? 'video/mp4' : 'video/webm' });
    } catch (error) {
      coordinator.terminate();
      if (encoder.state !== 'closed') encoder.close();
      if (error instanceof Error && error.message.includes('cancelled')) {
        return new Blob([], { type: useMp4 ? 'video/mp4' : 'video/webm' });
      }
      throw error;
    }
  },
};
