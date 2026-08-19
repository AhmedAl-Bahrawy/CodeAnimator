import { useState, useMemo } from 'react';
import { useExportStore, useProjectStore, useUISkinStore } from '@/state';
import { Button } from '@/ui/button';
import { Progress } from '@/ui/progress';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/ui/select';
import { Label } from '@/ui/label';
import { Separator } from '@/ui/separator';
import { platformPresets } from '@/data/platformPresets';
import { selectExporter } from '@/services/export';
import { resolveSceneRenderModel, resizeSceneAppearance } from '@/services/render/sceneModel';
import { getExportDimensions, getExportQualityProfile } from '@/services/export/quality';
import type { ExportFormat, ExportQuality } from '@/types/domain';

export function ExportPanel() {
  const {
    format, setFormat,
    quality, setQuality,
    fps, setFps,
    playbackSpeedMultiplier, setPlaybackSpeed,
    isExporting, progress,
    startExport, setProgress, finishExport, cancelExport,
    detectBestTier,
  } = useExportStore();

  const [selectedPreset, setSelectedPreset] = useState('project-default');
  const [exportStatus, setExportStatus] = useState('');
  const [exportError, setExportError] = useState('');

  const currentProject = useProjectStore(s => {
    return s.projects.find(p => p.id === s.currentProjectId) || null;
  });
  const currentSceneIndex = useProjectStore(s => s.currentSceneIndex);
  const currentScene = currentProject ? currentProject.scenes[currentSceneIndex] || null : null;
  const skins = useUISkinStore(s => s.skins);
  const currentSkinId = useUISkinStore(s => s.currentSkinId);
  const currentSkin = useMemo(
    () => skins.find(skin => skin.id === currentSkinId) || skins[0],
    [skins, currentSkinId],
  );
  const sceneModel = useMemo(() => {
    if (!currentProject || !currentScene || !currentSkin) return null;
    return resolveSceneRenderModel(currentProject, currentScene, { skin: currentSkin, fps });
  }, [currentProject, currentScene, currentSkin, fps]);
  const sceneTheme = sceneModel?.theme || null;
  const projectDimensions = {
    w: sceneModel?.width || 1080,
    h: sceneModel?.height || 1920,
  };

  // Override dimensions from platform preset only when a real preset is
  // selected — "project-default" respects the project's own aspect ratio (BLK-04).
  const selectedPresetData = platformPresets.find(p => p.id === selectedPreset);
  const logicalExportWidth = selectedPresetData ? selectedPresetData.width : projectDimensions.w;
  const logicalExportHeight = selectedPresetData ? selectedPresetData.height : projectDimensions.h;
  const { width: exportWidth, height: exportHeight } = getExportDimensions(logicalExportWidth, logicalExportHeight, quality, format);

  // Warn when the timeline exceeds the selected platform's max duration.
  const durationWarning = useMemo(() => {
    if (selectedPresetData && selectedPresetData.maxDurationMs < Infinity && sceneModel) {
      if (sceneModel.timeline.totalDurationMs > selectedPresetData.maxDurationMs) {
        return `This timeline (~${Math.round(sceneModel.timeline.totalDurationMs / 1000)}s) exceeds the ${selectedPresetData.label} limit of ${selectedPresetData.maxDurationMs / 1000}s.`;
      }
    }
    return '';
  }, [selectedPresetData, sceneModel]);

  const handleExport = async () => {
    if (!sceneModel || !sceneTheme) {
      startExport();
      setExportStatus('Export failed');
      setExportError('The current scene is still loading. Please try again after the preview is ready.');
      return;
    }

    const { timeline, source: cleanSource } = sceneModel;

    setExportError('');
    startExport();
    setExportStatus('Preparing export...');

    try {
      let exporter;
      try {
        exporter = selectExporter(format);
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'No exporter available';
        setExportStatus('Export failed');
        setExportError(msg);
        finishExport();
        return;
      }

      if (!exporter.isSupported) {
        setExportStatus('Export not supported');
        setExportError(`Export format ${format.toUpperCase()} is not supported in this browser.`);
        finishExport();
        return;
      }

      if (durationWarning) {
        setExportStatus('Export not started');
        setExportError(durationWarning);
        finishExport();
        return;
      }

      setExportStatus(`Exporting via ${exporter.tierName}...`);

      const blob = await exporter.export(
        {
          timeline,
          source: cleanSource,
          language: sceneModel.language,
          typingConfig: sceneModel.typingConfig,
          theme: sceneModel.theme,
          background: sceneModel.background,
          windowChrome: sceneModel.windowChrome,
          typography: sceneModel.typography,
          skin: sceneModel.skin,
          appearance: resizeSceneAppearance(sceneModel, exportWidth, exportHeight),
          audio: sceneModel.audio,
          width: exportWidth,
          height: exportHeight,
          fps,
          format,
          quality,
          playbackSpeedMultiplier,
        },
        (pct) => setProgress(pct),
        useExportStore.getState().abortController?.signal,
      );

      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      // BLK-02: Use correct file extension based on actual blob MIME type
      const ext = blob.type.includes('webm') ? 'webm' : blob.type.includes('gif') ? 'gif' : format;
      const filename = selectedPresetData ? `codereel-${selectedPresetData.id}.${ext}` : `codereel-export.${ext}`;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      setExportStatus('Export complete!');
      setExportError('');
      setTimeout(() => finishExport(), 1500);
    } catch (err) {
      console.error('Export failed:', err);
      const msg = err instanceof Error ? err.message : 'Unknown error';
      setExportStatus('Export failed');
      setExportError(msg);
      // Don't call finishExport() — keep progress bar visible so user sees the error
      // User must click Cancel to dismiss
    }
  };

  const handleDismissError = () => {
    setExportError('');
    setExportStatus('');
    finishExport();
  };

  const bestTier = detectBestTier();
  const hasError = !!exportError;

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
            <SelectItem value="project-default">Project Default ({projectDimensions.w}x{projectDimensions.h})</SelectItem>
            {platformPresets.map((preset) => (
              <SelectItem key={preset.id} value={preset.id}>
                {preset.label} ({preset.width}x{preset.height})
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <div className="text-[10px] text-[var(--text-muted)]">
          Output: {exportWidth}x{exportHeight}px
          {format !== 'gif' && ` · ${getExportQualityProfile(quality).label}`}
          {selectedPreset === 'project-default' && currentProject?.aspectRatio !== 'custom' && ` (${currentProject?.aspectRatio || '9:16'})`}
        </div>
        {durationWarning && (
          <div className="text-[10px] text-[var(--warning)]">{durationWarning}</div>
        )}
      </div>

      <Separator />

      {/* Quality */}
      <div className="space-y-2">
        <Label>Output Quality</Label>
        <Select value={quality} onValueChange={(value) => setQuality(value as ExportQuality)}>
          <SelectTrigger className="h-9 text-xs"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="high">High quality · 1.5× resolution</SelectItem>
            <SelectItem value="ultra">Ultra quality · 2× resolution</SelectItem>
          </SelectContent>
        </Select>
        <div className="text-[10px] text-[var(--text-muted)]">{getExportQualityProfile(quality).description}{format === 'gif' ? ' GIF keeps the selected canvas size.' : ''}</div>
      </div>

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
        <div className="text-[10px] text-[var(--text-muted)]">
          {format === 'mp4' && bestTier !== 'webcodecs' && 'MP4 uses the compatible H.264 fallback encoder in this browser.'}
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

      {/* Export Status / Error */}
      {isExporting && (
        <div className="space-y-3">
          <Progress value={progress} className="h-2" />
          <div className="flex justify-between items-center">
            <div className="flex-1 min-w-0">
              <span className="text-xs text-[var(--text-muted)]">{exportStatus}</span>
              {exportError && (
                <p className="text-xs text-[var(--danger)] mt-1 break-words">{exportError}</p>
              )}
            </div>
            <Button
              variant={hasError ? 'default' : 'destructive'}
              size="sm"
              onClick={hasError ? handleDismissError : cancelExport}
              className="text-xs shrink-0 ml-2"
            >
              {hasError ? 'Dismiss' : 'Cancel'}
            </Button>
          </div>
        </div>
      )}

      {/* Export Button */}
      {!isExporting && (
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
