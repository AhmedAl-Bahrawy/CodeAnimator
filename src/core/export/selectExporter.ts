import type { Exporter, ExportFormat } from '@/core/types';
import { webCodecsExporter } from './webCodecsExporter';
import { mediaRecorderExporter } from './mediaRecorderExporter';
import { gifExporter } from './gifExporter';

export function selectExporter(format: ExportFormat): Exporter {
  if (format === 'gif') return gifExporter;
  if (webCodecsExporter.isSupported) return webCodecsExporter;
  if (mediaRecorderExporter.isSupported) return mediaRecorderExporter;
  // Last resort — will throw if neither is available
  return mediaRecorderExporter;
}

export function getAvailableExporters(): { tier: string; supported: boolean; label: string }[] {
  return [
    {
      tier: 'webcodecs',
      supported: webCodecsExporter.isSupported,
      label: 'WebCodecs (Fast)',
    },
    {
      tier: 'mediarecorder',
      supported: mediaRecorderExporter.isSupported,
      label: 'MediaRecorder (Compatible)',
    },
    {
      tier: 'gif',
      supported: true,
      label: 'GIF',
    },
  ];
}
