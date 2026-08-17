import { useState, useMemo } from 'react';
import { useExportStore, useProjectStore } from '@/stores';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { platformPresets } from '@/data/platformPresets';
import { selectExporter } from '@/core/export';
import { buildTimelineFromSource } from '@/core/timeline';
import { parseMarkup } from '@/core/markup/parser';
import { getBackgroundById } from '@/data/backgroundPresets';
import { getThemeById } from '@/data/codeThemes';
import type { ExportFormat } from '@/core/types';

function resolveExportDimensions(aspectRatio: string, customWidth?: number, customHeight?: number): { w: number; h: number } {
  if (aspectRatio === 'custom' && customWidth && customHeight) return { w: customWidth, h: customHeight };
  const map: Record<string, { w: number; h: number }> = {
    '9:16': { w: 1080, h: 1920 },
    '1:1': { w: 1080, h: 1080 },
    '16:9': { w: 1920, h: 1080 },
  };
  return map[aspectRatio] || { w: 1080, h: 1920 };
}

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

  const currentProject = useProjectStore(s => {
    return s.projects.find(p => p.id === s.currentProjectId) || null;
  });
  const currentSceneIndex = useProjectStore(s => s.currentSceneIndex);
  const currentScene = currentProject ? currentProject.scenes[currentSceneIndex] || null : null;

  // Resolve theme from scene codeThemeId (BLK-06)
  const sceneTheme = useMemo(() => {
    if (!currentScene) return null;
    return getThemeById(currentScene.codeThemeId) || null;
  }, [currentScene?.codeThemeId]);

  // Resolve dimensions from project aspect ratio (CRI-08)
  const projectDimensions = useMemo(() => {
    if (!currentProject) return { w: 1080, h: 1920 };
    return resolveExportDimensions(currentProject.aspectRatio, currentProject.customWidth, currentProject.customHeight);
  }, [currentProject?.aspectRatio, currentProject?.customWidth, currentProject?.customHeight]);

  // Override dimensions from platform preset if one is explicitly selected
  const selectedPresetData = platformPresets.find(p => p.id === selectedPreset);
  const exportWidth = selectedPresetData?.width || projectDimensions.w;
  const exportHeight = selectedPresetData?.height || projectDimensions.h;

  const handleExport = async () => {
    if (!currentScene || !sceneTheme) return;

    const { cleanSource, events: markupEvents } = parseMarkup(currentScene.sourceWithMarkup);

    const timeline = buildTimelineFromSource({
      source: cleanSource,
      typingConfig: currentScene.typingConfig,
      fps,
      markupEvents,
    });

    startExport();
    setExportStatus('Preparing export...');

    try {
      const exporter = selectExporter(format);
      if (!exporter.isSupported) {
        setExportStatus(`Export format ${format.toUpperCase()} is not supported in this browser.`);
        cancelExport();
        return;
      }
      setExportStatus(`Exporting via ${exporter.tierName}...`);

      const background = getBackgroundById(currentScene.backgroundPresetId);

        const blob = await exporter.export(
        {
          timeline,
          source: cleanSource,
          typingConfig: currentScene.typingConfig,
          theme: sceneTheme,
          background,
          windowChrome: currentScene.windowChrome,
          typography: currentScene.typography,
          width: exportWidth,
          height: exportHeight,
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
      // BLK-02: Use correct file extension based on actual blob MIME type
      const ext = format === 'gif' ? 'gif' : blob.type.includes('webm') ? 'webm' : format;
      a.download = `codereel-export.${ext}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      setExportStatus('Export complete!');
      setTimeout(() => finishExport(), 1000);
    } catch (err) {
      console.error('Export failed:', err);
      const msg = err instanceof Error ? err.message : 'Unknown error';
      setExportStatus(`Export failed: ${msg}`);
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
        <div className="text-[10px] text-[var(--text-muted)]">
          Output: {exportWidth}x{exportHeight}px
          {currentProject?.aspectRatio !== 'custom' && ` (${currentProject?.aspectRatio || '9:16'})`}
        </div>
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
