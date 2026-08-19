import { create } from 'zustand';
import type { Timeline, CanvasState, TypingConfig } from '@/types/domain';
import { getStateAtTime } from '@/services/timeline/getStateAtTime';

interface TimelineStore {
  timeline: Timeline | null;
  /** Markup-stripped source that the timeline was built from (single source of truth). */
  cleanSource: string;
  isPlaying: boolean;
  currentTimeMs: number;

  // Actions
  setTimeline: (timeline: Timeline, cleanSource: string) => void;
  play: () => void;
  pause: () => void;
  seek: (timeMs: number) => void;

  // Derived
  getTimeline: () => Timeline | null;
  getStateAtTime: (tMs: number, source: string, typingConfig: TypingConfig) => CanvasState | null;
}

export const useTimelineStore = create<TimelineStore>((set, get) => ({
  timeline: null,
  cleanSource: '',
  isPlaying: false,
  currentTimeMs: 0,

  setTimeline: (timeline, cleanSource) => set({ timeline, cleanSource }),

  play: () => set({ isPlaying: true }),

  pause: () => set({ isPlaying: false }),

  seek: (timeMs) => {
    const { timeline } = get();
    if (timeline) {
      set({ currentTimeMs: Math.max(0, Math.min(timeMs, timeline.totalDurationMs)) });
    }
  },

  getTimeline: () => get().timeline,

  getStateAtTime: (tMs, source, typingConfig) => {
    const { timeline } = get();
    if (!timeline) return null;
    return getStateAtTime(timeline, tMs, source, typingConfig);
  },
}));
