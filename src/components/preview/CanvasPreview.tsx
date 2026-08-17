import { useEffect, useRef, useCallback, useState } from 'react';
import { useProjectStore, useThemeStore, useTimelineStore } from '@/stores';
import { renderFrame } from '@/core/render/renderFrame';
import { getStateAtTime } from '@/core/timeline/getStateAtTime';
import { buildTimelineFromSource } from '@/core/timeline';
import { parseMarkup } from '@/core/markup/parser';
import { getBackgroundById } from '@/data/backgroundPresets';
import type { Timeline } from '@/core/types';

export function CanvasPreview() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const animationRef = useRef<number>(0);
  const isPlayingRef = useRef(false);
  const currentTimeRef = useRef(0);
  const [scale, setScale] = useState(0.3);

  const currentScene = useProjectStore(s => {
    const project = s.projects.find(p => p.id === s.currentProjectId);
    return project ? project.scenes[s.currentSceneIndex] : null;
  });

  const currentTheme = useThemeStore(s => {
    return s.themes.find(t => t.id === s.currentThemeId) || s.themes[0];
  });

  const isPlaying = useTimelineStore(s => s.isPlaying);
  const currentTimeMs = useTimelineStore(s => s.currentTimeMs);
  const seek = useTimelineStore(s => s.seek);
  const play = useTimelineStore(s => s.play);
  const pause = useTimelineStore(s => s.pause);

  isPlayingRef.current = isPlaying;
  currentTimeRef.current = currentTimeMs;

  const canvasWidth = 1080;
  const canvasHeight = 1920;

  // Build timeline from clean source (markup stripped)
  const [timeline, setLocalTimeline] = useState<Timeline | null>(null);

  useEffect(() => {
    if (!currentScene) return;
    const { cleanSource, events: markupEvents } = parseMarkup(currentScene.sourceWithMarkup);
    const tl = buildTimelineFromSource({
      source: cleanSource,
      typingConfig: currentScene.typingConfig,
      fps: 30,
      markupEvents,
    });
    setLocalTimeline(tl);
  }, [currentScene?.sourceWithMarkup, currentScene?.typingConfig]);

  // Scale observer
  useEffect(() => {
    if (!containerRef.current) return;
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        if (width === 0 || height === 0) continue;
        const scaleX = width / canvasWidth;
        const scaleY = height / canvasHeight;
        setScale(Math.min(scaleX, scaleY));
      }
    });
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  // Render a single frame
  const renderFrameAt = useCallback((tMs: number) => {
    const canvas = canvasRef.current;
    if (!canvas || !currentScene || !currentTheme || !timeline) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const { cleanSource } = parseMarkup(currentScene.sourceWithMarkup);

    const state = getStateAtTime(timeline, tMs, cleanSource, currentScene.typingConfig);
    const background = getBackgroundById(currentScene.backgroundPresetId);

    renderFrame({
      ctx,
      width: canvasWidth,
      height: canvasHeight,
      state,
      theme: currentTheme,
      background,
      windowChrome: currentScene.windowChrome,
      frameIndex: Math.round((tMs / 1000) * 30),
      fps: 30,
      visibleLines: state.visibleLines,
      tokenLines: null,
    });
  }, [currentScene, currentTheme, timeline]);

  // Animation loop
  useEffect(() => {
    if (!isPlaying || !timeline) return;

    const totalDuration = timeline.totalDurationMs;
    let startTimestamp: number | null = null;
    let startOffset = currentTimeRef.current;

    const animate = (timestamp: number) => {
      if (!startTimestamp) startTimestamp = timestamp;

      const elapsed = timestamp - startTimestamp;
      const newTime = (startOffset + elapsed) % totalDuration;

      currentTimeRef.current = newTime;
      seek(newTime);
      renderFrameAt(newTime);

      if (isPlayingRef.current) {
        animationRef.current = requestAnimationFrame(animate);
      }
    };

    animationRef.current = requestAnimationFrame(animate);

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [isPlaying, timeline, renderFrameAt, seek]);

  // Render when paused
  useEffect(() => {
    if (!isPlaying) {
      renderFrameAt(currentTimeMs);
    }
  }, [isPlaying, renderFrameAt, currentTimeMs]);

  // Initial render
  useEffect(() => {
    renderFrameAt(0);
  }, [renderFrameAt]);

  const togglePlayPause = () => {
    if (isPlaying) {
      pause();
      cancelAnimationFrame(animationRef.current);
    } else {
      if (currentTimeMs >= (timeline?.totalDurationMs || 0) - 100) {
        seek(0);
      }
      play();
    }
  };

  return (
    <div className="flex flex-col h-full gap-3">
      <div
        ref={containerRef}
        className="flex-1 flex items-center justify-center bg-[var(--bg-base)] rounded-lg overflow-hidden"
      >
        <div
          style={{
            transform: `scale(${scale})`,
            transformOrigin: 'center center',
          }}
        >
          <canvas
            ref={canvasRef}
            width={canvasWidth}
            height={canvasHeight}
            className="block"
            style={{ width: canvasWidth, height: canvasHeight }}
          />
        </div>
      </div>

      <div className="flex items-center gap-3 px-2">
        <button
          onClick={togglePlayPause}
          className="w-10 h-10 rounded-full bg-[var(--accent)] text-[var(--accent-foreground)] flex items-center justify-center hover:opacity-90 transition-opacity cursor-pointer shrink-0"
        >
          {isPlaying ? (
            <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
              <rect x="3" y="2" width="4" height="12" rx="1" />
              <rect x="9" y="2" width="4" height="12" rx="1" />
            </svg>
          ) : (
            <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
              <path d="M4 2l10 6-10 6V2z" />
            </svg>
          )}
        </button>

        <input
          type="range"
          min={0}
          max={timeline?.totalDurationMs || 1}
          value={currentTimeMs}
          onChange={(e) => {
            const t = Number(e.target.value);
            seek(t);
            renderFrameAt(t);
          }}
          className="flex-1 h-1.5 rounded-full appearance-none bg-[var(--bg-surface)] [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-[var(--accent)] [&::-webkit-slider-thumb]:cursor-pointer"
        />

        <span className="text-xs text-[var(--text-muted)] font-mono min-w-[80px] text-right">
          {formatTime(currentTimeMs)} / {formatTime(timeline?.totalDurationMs || 0)}
        </span>
      </div>
    </div>
  );
}

function formatTime(ms: number): string {
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${minutes}:${secs.toString().padStart(2, '0')}`;
}
