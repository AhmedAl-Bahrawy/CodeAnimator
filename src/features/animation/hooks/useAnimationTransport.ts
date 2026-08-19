import { useCallback } from 'react';
import { useTimelineStore } from '@/state';

export function useAnimationTransport() {
  const timeline = useTimelineStore((state) => state.timeline);
  const currentTimeMs = useTimelineStore((state) => state.currentTimeMs);
  const isPlaying = useTimelineStore((state) => state.isPlaying);
  const play = useTimelineStore((state) => state.play);
  const pause = useTimelineStore((state) => state.pause);
  const seek = useTimelineStore((state) => state.seek);

  const reset = useCallback(() => {
    pause();
    seek(0);
  }, [pause, seek]);

  return {
    timeline,
    currentTimeMs,
    isPlaying,
    play,
    pause,
    reset,
    seek,
  };
}
