import { create } from 'zustand';
import type { Timeline, CanvasState, TypingConfig } from '@/core/types';
import { getStateAtTime } from '@/core/timeline/getStateAtTime';

interface TimelineStore {
  timeline: Timeline | null;
  isPlaying: boolean;
  currentTimeMs: number;
  previewCanvasWidth: number;
  previewCanvasHeight: number;

  // Actions
  setTimeline: (timeline: Timeline) => void;
  play: () => void;
  pause: () => void;
  seek: (timeMs: number) => void;
  setPreviewDimensions: (width: number, height: number) => void;

  // Derived
  getTimeline: () => Timeline | null;
  getStateAtTime: (tMs: number, source: string, typingConfig: TypingConfig) => CanvasState | null;
}

export const useTimelineStore = create<TimelineStore>((set, get) => ({
  timeline: null,
  isPlaying: false,
  currentTimeMs: 0,
  previewCanvasWidth: 1080,
  previewCanvasHeight: 1920,

  setTimeline: (timeline) => set({ timeline }),

  play: () => set({ isPlaying: true }),

  pause: () => set({ isPlaying: false }),

  seek: (timeMs) => {
    const { timeline } = get();
    if (timeline) {
      set({ currentTimeMs: Math.max(0, Math.min(timeMs, timeline.totalDurationMs)) });
    }
  },

  setPreviewDimensions: (width, height) => set({
    previewCanvasWidth: width,
    previewCanvasHeight: height,
  }),

  getTimeline: () => get().timeline,

  getStateAtTime: (tMs, source, typingConfig) => {
    const { timeline } = get();
    if (!timeline) return null;
    return getStateAtTime(timeline, tMs, source, typingConfig);
  },
}));
