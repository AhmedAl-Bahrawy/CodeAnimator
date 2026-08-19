import type { Exporter, ExportFormat } from '@/types/domain';
import { webCodecsExporter } from './webCodecsExporter';
import { mediaRecorderExporter } from './mediaRecorderExporter';
import { gifExporter } from './gifExporter';

export function selectExporter(format: ExportFormat): Exporter {
  if (format === 'gif') return gifExporter;
  if (webCodecsExporter.isSupported) return webCodecsExporter;
  if (mediaRecorderExporter.isSupported) return mediaRecorderExporter;
  // BLK-03: Throw if no exporter is available instead of silently failing
  throw new Error(`No exporter available for format "${format}" in this browser. Try GIF or use a different browser.`);
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
      supported: gifExporter.isSupported,
      label: 'GIF',
    },
  ];
}
