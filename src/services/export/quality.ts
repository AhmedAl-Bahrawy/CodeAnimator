import type { ExportQuality, ExportFormat } from '@/types/domain';

export interface ExportQualityProfile {
  id: ExportQuality;
  label: string;
  description: string;
  scale: number;
  videoBitrate: number;
  audioBitrate: number;
  keyframeIntervalSeconds: number;
}

const profiles: Record<ExportQuality, ExportQualityProfile> = {
  high: {
    id: 'high',
    label: 'High quality',
    description: 'Crisp 1.5× output with high-bitrate video and audio.',
    scale: 1.5,
    videoBitrate: 24_000_000,
    audioBitrate: 192_000,
    keyframeIntervalSeconds: 2,
  },
  ultra: {
    id: 'ultra',
    label: 'Ultra quality',
    description: 'Maximum detail at 2× output resolution and very high bitrate.',
    scale: 2,
    videoBitrate: 40_000_000,
    audioBitrate: 256_000,
    keyframeIntervalSeconds: 1,
  },
};

export function getExportQualityProfile(quality: ExportQuality): ExportQualityProfile {
  return profiles[quality] || profiles.high;
}

export function getExportDimensions(width: number, height: number, quality: ExportQuality, format: ExportFormat) {
  const scale = format === 'gif' ? 1 : getExportQualityProfile(quality).scale;
  return {
    width: Math.max(2, Math.round(width * scale) & ~1),
    height: Math.max(2, Math.round(height * scale) & ~1),
  };
}
