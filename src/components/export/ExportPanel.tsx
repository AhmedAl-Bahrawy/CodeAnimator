import { useState } from 'react';
import { useExportStore, useProjectStore, useThemeStore } from '@/stores';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { platformPresets } from '@/data/platformPresets';
import { getAvailableExporters, selectExporter } from '@/core/export';
import { buildTimelineFromSource } from '@/core/timeline';
import { parseMarkup } from '@/core/markup/parser';
import { getBackgroundById } from '@/data/backgroundPresets';
import type { ExportFormat } from '@/core/types';

export function ExportPanel() {
  const {
    format, setFormat,
    fps, setFps,
    playbackSpeedMultiplier, setPlaybackSpeed,
    isExporting, progress,
    startExport, setProgress, finishExport, cancelExport,
    detectBestTier,
  } = useExportStore();

  const [selectedPreset, setSelectedPreset] = useState('youtube-shorts');
  const [exportStatus, setExportStatus] = useState('');

  const currentScene = useProjectStore(s => {
    const project = s.projects.find(p => p.id === s.currentProjectId);
    return project ? project.scenes[s.currentSceneIndex] : null;
  });

  const currentTheme = useThemeStore(s => s.themes.find(t => t.id === s.currentThemeId) || s.themes[0]);

  const handleExport = async () => {
    if (!currentScene) return;

    // Strip markup from source before building timeline
    const { cleanSource, events: markupEvents } = parseMarkup(currentScene.sourceWithMarkup);

    const timeline = buildTimelineFromSource({
      source: cleanSource,
      typingConfig: currentScene.typingConfig,
      fps,
      markupEvents,
    });

    const preset = platformPresets.find(p => p.id === selectedPreset);
    const width = preset?.width || 1080;
    const height = preset?.height || 1920;

    startExport();
    setExportStatus('Preparing export...');

    try {
      const exporter = selectExporter(format);
      setExportStatus(`Exporting via ${exporter.tierName}...`);

      const background = getBackgroundById(currentScene.backgroundPresetId);

      const blob = await exporter.export(
        {
          timeline,
          source: cleanSource,
          typingConfig: currentScene.typingConfig,
          theme: currentTheme,
          background,
          windowChrome: currentScene.windowChrome,
          width,
          height,
          fps,
          format,
          playbackSpeedMultiplier,
        },
        (pct) => setProgress(pct),
        useExportStore.getState().abortController?.signal,
      );

      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `codereel-export.${format === 'gif' ? 'webm' : format}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      setExportStatus('Export complete!');
      setTimeout(() => finishExport(), 1000);
    } catch (err) {
      console.error('Export failed:', err);
      setExportStatus('Export failed. Try a different format.');
      cancelExport();
    }
  };

  const bestTier = detectBestTier();

  return (
    <div className="space-y-4 p-4">
      <h3 className="text-sm font-semibold text-[var(--text-primary)]">Export</h3>

      {/* Platform Preset */}
      <div className="space-y-2">
        <Label>Platform</Label>
        <Select value={selectedPreset} onValueChange={setSelectedPreset}>
          <SelectTrigger className="h-9 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {platformPresets.map((preset) => (
              <SelectItem key={preset.id} value={preset.id}>
                {preset.label} ({preset.width}x{preset.height})
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <Separator />

      {/* Format */}
      <div className="space-y-2">
        <Label>Format</Label>
        <div className="flex gap-2">
          {(['mp4', 'webm', 'gif'] as ExportFormat[]).map((f) => (
            <Button
              key={f}
              variant={format === f ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFormat(f)}
              className="flex-1 text-xs"
            >
              {f.toUpperCase()}
            </Button>
          ))}
        </div>
      </div>

      {/* FPS */}
      <div className="space-y-2">
        <Label>Frame Rate</Label>
        <div className="flex gap-2">
          <Button
            variant={fps === 30 ? 'default' : 'outline'}
            size="sm"
            onClick={() => setFps(30)}
            className="flex-1 text-xs"
          >
            30 FPS
          </Button>
          <Button
            variant={fps === 60 ? 'default' : 'outline'}
            size="sm"
            onClick={() => setFps(60)}
            className="flex-1 text-xs"
          >
            60 FPS
          </Button>
        </div>
      </div>

      {/* Speed */}
      <div className="space-y-2">
        <Label>Playback Speed: {playbackSpeedMultiplier.toFixed(1)}x</Label>
        <input
          type="range"
          min={0.5}
          max={2}
          step={0.1}
          value={playbackSpeedMultiplier}
          onChange={(e) => setPlaybackSpeed(Number(e.target.value))}
          className="w-full"
        />
      </div>

      <Separator />

      {/* Export Tier Badge */}
      <div className="flex items-center gap-2">
        <span className="text-[10px] text-[var(--text-muted)]">Pipeline:</span>
        <span className="text-[10px] px-2 py-0.5 rounded-full bg-[var(--bg-surface)] text-[var(--text-secondary)]">
          {bestTier === 'webcodecs' ? 'WebCodecs (Fast)' :
           bestTier === 'mediarecorder' ? 'MediaRecorder' : bestTier === 'gif' ? 'GIF' : 'Compatible'}
        </span>
      </div>

      {/* Export Button */}
      {isExporting ? (
        <div className="space-y-3">
          <Progress value={progress} className="h-2" />
          <div className="flex justify-between items-center">
            <span className="text-xs text-[var(--text-muted)]">{exportStatus}</span>
            <Button variant="destructive" size="sm" onClick={cancelExport} className="text-xs">
              Cancel
            </Button>
          </div>
        </div>
      ) : (
        <Button onClick={handleExport} className="w-full" size="lg">
          <svg className="w-4 h-4 mr-2" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M8 2v8m0 0l-3-3m3 3l3-3M2 12h12" />
          </svg>
          Export {format.toUpperCase()}
        </Button>
      )}
    </div>
  );
}
