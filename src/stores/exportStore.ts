import { create } from 'zustand';
import type { ExportFormat, ExportTier } from '@/core/types';

interface ExportStore {
  // State
  isExporting: boolean;
  progress: number;
  format: ExportFormat;
  fps: 30 | 60;
  playbackSpeedMultiplier: number;
  selectedTier: ExportTier | null;
  abortController: AbortController | null;

  // Actions
  setFormat: (format: ExportFormat) => void;
  setFps: (fps: 30 | 60) => void;
  setPlaybackSpeed: (multiplier: number) => void;
  setSelectedTier: (tier: ExportTier | null) => void;
  startExport: () => void;
  setProgress: (progress: number) => void;
  finishExport: () => void;
  cancelExport: () => void;

  // Computed
  detectBestTier: () => ExportTier;
}

export const useExportStore = create<ExportStore>((set, get) => ({
  isExporting: false,
  progress: 0,
  format: 'mp4',
  fps: 30,
  playbackSpeedMultiplier: 1,
  selectedTier: null,
  abortController: null,

  setFormat: (format) => set({ format }),
  setFps: (fps) => set({ fps }),
  setPlaybackSpeed: (multiplier) => set({ playbackSpeedMultiplier: multiplier }),
  setSelectedTier: (tier) => set({ selectedTier: tier }),

  startExport: () => set({
    isExporting: true,
    progress: 0,
    abortController: new AbortController(),
  }),

  setProgress: (progress) => set({ progress }),

  finishExport: () => set({
    isExporting: false,
    progress: 100,
    abortController: null,
  }),

  cancelExport: () => {
    const { abortController } = get();
    abortController?.abort();
    set({
      isExporting: false,
      progress: 0,
      abortController: null,
    });
  },

  detectBestTier: (): ExportTier => {
    const { format } = get();
    if (format === 'gif') return 'gif';
    if ('VideoEncoder' in window) return 'webcodecs';
    if ('MediaRecorder' in window) return 'mediarecorder';
    return 'mediarecorder';
  },
}));
