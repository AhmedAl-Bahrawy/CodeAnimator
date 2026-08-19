import * as MP4Box from 'mp4box';
import { ArrayBufferTarget, Muxer as Mp4Muxer } from 'mp4-muxer';
import type { ExportOptions } from '@/types/domain';
import { encodeTimelineAudio, resolveMp4AudioEncoding } from './audioTrack';

interface Mp4BoxVideoSample {
  data: ArrayBuffer | Uint8Array;
  dts: number;
  cts: number;
  duration: number;
  timescale: number;
  description?: {
    avcC?: {
      AVCProfileIndication?: number;
      profile_compatibility?: number;
      AVCLevelIndication?: number;
      lengthSizeMinusOne?: number;
      SPS?: Array<{ data: Uint8Array }>;
      PPS?: Array<{ data: Uint8Array }>;
    };
  };
}

interface Mp4BoxTrack {
  id: number;
  type: string;
  codec: string;
  timescale: number;
  video?: { width: number; height: number };
  nb_samples?: number;
}

interface Mp4BoxInfo {
  tracks: Mp4BoxTrack[];
}

interface Mp4BoxFile {
  onReady?: (info: Mp4BoxInfo) => void;
  onSamples?: (id: number, user: unknown, samples: Mp4BoxVideoSample[]) => void;
  onError?: (error: unknown) => void;
  setExtractionOptions: (trackId: number, user: unknown, options: { nbSamples: number; rapAlignement: boolean }) => void;
  start: () => void;
  appendBuffer: (buffer: ArrayBuffer & { fileStart?: number }) => void;
  flush: () => void;
}

type Mp4BoxFactory = { createFile: () => Mp4BoxFile };

function toArrayBuffer(data: ArrayBuffer | Uint8Array): ArrayBuffer {
  if (data instanceof ArrayBuffer) return data;
  return data.buffer.slice(data.byteOffset, data.byteOffset + data.byteLength) as ArrayBuffer;
}

function buildAvcDecoderDescription(avcC: NonNullable<Mp4BoxVideoSample['description']>['avcC']): Uint8Array {
  const sps = avcC?.SPS?.[0]?.data;
  const pps = avcC?.PPS?.[0]?.data;
  if (!sps || !pps) throw new Error('Fallback MP4 does not contain H.264 parameter sets.');
  const output = new Uint8Array(11 + sps.length + pps.length);
  let offset = 0;
  output[offset++] = 1;
  output[offset++] = avcC?.AVCProfileIndication ?? sps[1] ?? 66;
  output[offset++] = avcC?.profile_compatibility ?? sps[2] ?? 0;
  output[offset++] = avcC?.AVCLevelIndication ?? sps[3] ?? 30;
  output[offset++] = 0xfc | (avcC?.lengthSizeMinusOne ?? 3);
  output[offset++] = 0xe1;
  output[offset++] = (sps.length >>> 8) & 0xff;
  output[offset++] = sps.length & 0xff;
  output.set(sps, offset);
  offset += sps.length;
  output[offset++] = 1;
  output[offset++] = (pps.length >>> 8) & 0xff;
  output[offset++] = pps.length & 0xff;
  output.set(pps, offset);
  return output;
}

function containsIdrNal(data: ArrayBuffer | Uint8Array): boolean {
  const bytes = new Uint8Array(data instanceof ArrayBuffer ? data : data.buffer, data instanceof ArrayBuffer ? 0 : data.byteOffset, data.byteLength);
  let offset = 0;
  while (offset + 4 <= bytes.length) {
    const length = ((bytes[offset] << 24) | (bytes[offset + 1] << 16) | (bytes[offset + 2] << 8) | bytes[offset + 3]) >>> 0;
    if (length <= 0 || offset + 4 + length > bytes.length) break;
    if ((bytes[offset + 4] & 0x1f) === 5) return true;
    offset += 4 + length;
  }
  return false;
}

async function extractVideoSamples(blob: Blob, signal?: AbortSignal): Promise<{ track: Mp4BoxTrack; samples: Mp4BoxVideoSample[] }> {
  if (signal?.aborted) throw new Error('Export cancelled.');
  const source = await blob.arrayBuffer();
  const file = (MP4Box as unknown as Mp4BoxFactory).createFile();
  return new Promise((resolve, reject) => {
    let track: Mp4BoxTrack | null = null;
    const samples: Mp4BoxVideoSample[] = [];
    let settled = false;
    const finish = () => {
      if (settled || !track || samples.length === 0) return;
      settled = true;
      resolve({ track, samples });
    };
    file.onError = (error) => {
      if (!settled) {
        settled = true;
        reject(error instanceof Error ? error : new Error('Unable to read fallback MP4 video samples.'));
      }
    };
    file.onReady = (info) => {
      track = info.tracks.find((candidate) => candidate.type === 'video') || null;
      if (!track) {
        settled = true;
        reject(new Error('Fallback MP4 contains no video track.'));
        return;
      }
      file.setExtractionOptions(track.id, null, { nbSamples: Math.max(1000, track.nb_samples || 0), rapAlignement: false });
      file.start();
    };
    file.onSamples = (_id, _user, batch) => {
      samples.push(...batch);
      if (track?.nb_samples && samples.length >= track.nb_samples) finish();
    };
    try {
      const input = source as ArrayBuffer & { fileStart?: number };
      input.fileStart = 0;
      file.appendBuffer(input);
      file.flush();
      queueMicrotask(finish);
    } catch (error) {
      if (!settled) {
        settled = true;
        reject(error instanceof Error ? error : new Error('Unable to parse fallback MP4.'));
      }
    }
  });
}

export async function remuxFallbackMp4WithAudio(
  videoBlob: Blob,
  opts: ExportOptions,
  onProgress: (pct: number) => void,
  signal?: AbortSignal,
): Promise<Blob> {
  const encoding = await resolveMp4AudioEncoding();
  if (!encoding) {
    throw new Error('This browser cannot encode AAC or Opus audio for MP4 export.');
  }
  const { track, samples } = await extractVideoSamples(videoBlob, signal);
  const firstSample = samples[0];
  const description = buildAvcDecoderDescription(firstSample.description?.avcC);
  const target = new ArrayBufferTarget();
  const muxer = new Mp4Muxer({
    target,
    video: {
      codec: 'avc',
      width: track.video?.width || opts.width,
      height: track.video?.height || opts.height,
      frameRate: opts.fps,
    },
    audio: {
      codec: encoding.muxerCodec,
      sampleRate: encoding.sampleRate,
      numberOfChannels: encoding.numberOfChannels,
    },
    fastStart: 'in-memory',
  });
  let firstVideo = true;
  for (const sample of samples) {
    if (signal?.aborted) throw new Error('Export cancelled.');
    const timestamp = Math.round((sample.dts / sample.timescale) * 1_000_000);
    const duration = Math.max(1, Math.round((sample.duration / sample.timescale) * 1_000_000));
    const chunk = new EncodedVideoChunk({
      type: firstVideo || containsIdrNal(sample.data) ? 'key' : 'delta',
      timestamp,
      duration,
      data: toArrayBuffer(sample.data),
    });
    muxer.addVideoChunk(chunk, firstVideo ? {
      decoderConfig: {
        codec: track.codec,
        codedWidth: track.video?.width || opts.width,
        codedHeight: track.video?.height || opts.height,
        description,
      },
    } : undefined);
    firstVideo = false;
  }
  onProgress(92);
  await encodeTimelineAudio({
    timeline: opts.timeline,
    audio: opts.audio!,
    playbackSpeedMultiplier: opts.playbackSpeedMultiplier,
    signal,
    encoding,
    onChunk: (chunk, metadata) => muxer.addAudioChunk(chunk, metadata),
  });
  muxer.finalize();
  if (!target.buffer || target.buffer.byteLength === 0) throw new Error('The audio remuxer produced an empty MP4.');
  onProgress(100);
  return new Blob([target.buffer], { type: 'video/mp4' });
}
