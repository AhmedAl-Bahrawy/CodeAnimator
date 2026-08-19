import { getSoundCue } from '@/services/audio/soundLibrary';
import type { SceneAudioSettings, Timeline } from '@/types/domain';

const DEFAULT_SAMPLE_RATE = 48_000;
const AUDIO_FRAME_SIZE = 1_024;

export type Mp4AudioCodec = 'aac' | 'opus';

export interface Mp4AudioEncoding {
  muxerCodec: Mp4AudioCodec;
  encoderCodec: 'mp4a.40.2' | 'opus';
  sampleRate: number;
  numberOfChannels: number;
  bitrate: number;
}

interface AudioTrackOptions {
  timeline: Timeline;
  audio: SceneAudioSettings;
  playbackSpeedMultiplier: number;
  onChunk: (chunk: EncodedAudioChunk, metadata?: EncodedAudioChunkMetadata) => void;
  signal?: AbortSignal;
  sampleRate?: number;
  encoding?: Mp4AudioEncoding;
}

function collectCueTimes(timeline: Timeline, audio: SceneAudioSettings, playbackSpeedMultiplier: number): number[] {
  if (!audio.enabled || audio.cueId === 'none') return [];
  const speed = Math.max(0.05, playbackSpeedMultiplier || 1);
  const cueTimes: number[] = [];
  let lastSoundTimeMs = -Infinity;
  for (const event of timeline.events) {
    const eventTimeMs = event.tMs / speed;
    if (event.type === 'sound-cue') {
      cueTimes.push(eventTimeMs);
      lastSoundTimeMs = eventTimeMs;
    } else if (
      (event.type === 'type-char' || event.type === 'type-word' || event.type === 'type-line')
      && eventTimeMs - lastSoundTimeMs > 42
    ) {
      cueTimes.push(eventTimeMs);
      lastSoundTimeMs = eventTimeMs;
    }
  }
  return cueTimes;
}

async function supportsAudioCodec(encoding: Mp4AudioEncoding): Promise<boolean> {
  if (typeof AudioEncoder === 'undefined') return false;
  try {
    const result = await AudioEncoder.isConfigSupported({
      codec: encoding.encoderCodec,
      sampleRate: encoding.sampleRate,
      numberOfChannels: encoding.numberOfChannels,
      bitrate: encoding.bitrate,
    });
    return result.supported === true;
  } catch {
    return false;
  }
}

export async function resolveMp4AudioEncoding(sampleRate = DEFAULT_SAMPLE_RATE): Promise<Mp4AudioEncoding | null> {
  const candidates: Mp4AudioEncoding[] = [
    { muxerCodec: 'aac', encoderCodec: 'mp4a.40.2', sampleRate, numberOfChannels: 1, bitrate: 128_000 },
    { muxerCodec: 'opus', encoderCodec: 'opus', sampleRate, numberOfChannels: 1, bitrate: 96_000 },
  ];
  for (const candidate of candidates) {
    if (await supportsAudioCodec(candidate)) return candidate;
  }
  return null;
}

export async function encodeTimelineAudio({
  timeline,
  audio,
  playbackSpeedMultiplier,
  onChunk,
  signal,
  sampleRate = DEFAULT_SAMPLE_RATE,
  encoding = { muxerCodec: 'aac', encoderCodec: 'mp4a.40.2', sampleRate, numberOfChannels: 1, bitrate: 128_000 },
}: AudioTrackOptions): Promise<void> {
  if (!audio.enabled || audio.cueId === 'none') return;
  if (typeof OfflineAudioContext === 'undefined' || typeof AudioEncoder === 'undefined' || typeof AudioData === 'undefined') {
    throw new Error('This browser cannot encode audio for MP4 export.');
  }
  if (!(await supportsAudioCodec(encoding))) {
    throw new Error(`This browser does not support ${encoding.muxerCodec.toUpperCase()} audio encoding for MP4 export.`);
  }
  if (signal?.aborted) throw new Error('Export cancelled.');

  const speed = Math.max(0.05, playbackSpeedMultiplier || 1);
  const outputSampleRate = encoding.sampleRate;
  const outputDurationMs = timeline.totalDurationMs / speed;
  const frameCount = Math.max(1, Math.ceil((outputDurationMs / 1000) * outputSampleRate));
  const context = new OfflineAudioContext(encoding.numberOfChannels, frameCount, outputSampleRate);
  const cue = getSoundCue(audio.cueId);
  for (const cueTimeMs of collectCueTimes(timeline, audio, speed)) {
    if (cueTimeMs >= outputDurationMs) continue;
    cue.play(context, Math.max(0, Math.min(1, audio.volume)), cueTimeMs / 1000);
  }

  const rendered = await context.startRendering();
  let encoderError: Error | null = null;
  const encoder = new AudioEncoder({
    output: (chunk, metadata) => onChunk(chunk, metadata),
    error: (error) => {
      encoderError = new Error(error.message || 'AAC audio encoder failed.');
    },
  });
  encoder.configure({
    codec: encoding.encoderCodec,
    sampleRate: encoding.sampleRate,
    numberOfChannels: encoding.numberOfChannels,
    bitrate: encoding.bitrate,
  });

  try {
    for (let startFrame = 0; startFrame < frameCount; startFrame += AUDIO_FRAME_SIZE) {
      if (signal?.aborted) throw new Error('Export cancelled.');
      const numberOfFrames = Math.min(AUDIO_FRAME_SIZE, frameCount - startFrame);
      const samples = rendered.getChannelData(0).slice(startFrame, startFrame + numberOfFrames);
      const audioData = new AudioData({
        format: 'f32-planar',
        sampleRate: outputSampleRate,
        numberOfFrames,
        numberOfChannels: encoding.numberOfChannels,
        timestamp: Math.round((startFrame / outputSampleRate) * 1_000_000),
        data: samples,
      });
      encoder.encode(audioData);
      audioData.close();
    }
    await encoder.flush();
    if (encoderError) throw encoderError;
  } finally {
    if (encoder.state !== 'closed') encoder.close();
  }
}

export const audioTrackDefaults = {
  sampleRate: DEFAULT_SAMPLE_RATE,
  numberOfChannels: 1,
  codec: 'aac' as const,
};
