import { useEffect, useRef, useCallback, useState, useMemo } from 'react';
import { useProjectStore, useTimelineStore } from '@/stores';
import { renderFrame } from '@/core/render/renderFrame';
import { getStateAtTime } from '@/core/timeline/getStateAtTime';
import { getBackgroundById } from '@/data/backgroundPresets';
import { getThemeById } from '@/data/codeThemes';
import { highlightCode, type HighlightResult } from '@/core/highlighting/shiki';
import { aspectRatioPresets } from '@/data/platformPresets';
import type { Timeline, CodeToken, AspectRatio } from '@/core/types';

function resolveDimensions(aspectRatio: AspectRatio, customWidth?: number, customHeight?: number): { w: number; h: number } {
  if (aspectRatio === 'custom' && customWidth && customHeight) {
    return { w: customWidth, h: customHeight };
  }
  const preset = aspectRatioPresets.find(p => p.id === aspectRatio);
  return { w: preset?.width ?? 1080, h: preset?.height ?? 1920 };
}

export function CanvasPreview() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const animationRef = useRef<number>(0);
  const [scale, setScale] = useState(0.3);
  const highlightCacheRef = useRef<Map<string, HighlightResult>>(new Map());

  const currentProject = useProjectStore(s => {
    return s.projects.find(p => p.id === s.currentProjectId) || null;
  });
  const currentSceneIndex = useProjectStore(s => s.currentSceneIndex);
  const currentScene = currentProject ? currentProject.scenes[currentSceneIndex] || null : null;

  // Resolve theme from scene codeThemeId (BLK-06)
  const currentTheme = useMemo(() => {
    if (!currentScene) return null;
    return getThemeById(currentScene.codeThemeId) || null;
  }, [currentScene?.codeThemeId]);

  // Resolve dimensions from project aspect ratio (CRI-01)
  const { w: canvasWidth, h: canvasHeight } = useMemo(() => {
    return resolveDimensions(
      currentProject?.aspectRatio ?? '9:16',
      currentProject?.customWidth,
      currentProject?.customHeight
    );
  }, [currentProject?.aspectRatio, currentProject?.customWidth, currentProject?.customHeight]);

  // Use global timeline (CRI-09 — single source of truth)
  const timeline = useTimelineStore(s => s.timeline);
  const isPlaying = useTimelineStore(s => s.isPlaying);
  const seek = useTimelineStore(s => s.seek);
  const play = useTimelineStore(s => s.play);
  const pause = useTimelineStore(s => s.pause);

  // Keep refs for the animation loop to avoid stale closures
  const isPlayingRef = useRef(false);
  const currentTimeRef = useRef(0);
  const timelineRef = useRef<Timeline | null>(null);
  const renderFnRef = useRef<((tMs: number) => void) | null>(null);

  // Sync refs outside render
  useEffect(() => {
    isPlayingRef.current = isPlaying;
  }, [isPlaying]);
  useEffect(() => {
    currentTimeRef.current = useTimelineStore.getState().currentTimeMs;
  });
  useEffect(() => {
    timelineRef.current = timeline;
  }, [timeline]);

  // Shiki highlight cache
  const [highlightResult, setHighlightResult] = useState<HighlightResult | null>(null);
  useEffect(() => {
    if (!currentScene || !currentTheme) return;
    const cache = highlightCacheRef.current;
    const cacheKey = `${currentScene.language}:${currentTheme.shikiTheme || currentTheme.id}:${currentScene.sourceWithMarkup}`;
    const cached = cache.get(cacheKey);
    if (cached) {
      setHighlightResult(cached);
      return;
    }
    let cancelled = false;
    highlightCode(currentScene.sourceWithMarkup, currentScene.language, currentTheme.shikiTheme || 'dracula')
      .then(result => {
        if (cancelled) return;
        cache.set(cacheKey, result);
        setHighlightResult(result);
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [currentScene?.sourceWithMarkup, currentScene?.language, currentTheme]);

  // Convert HighlightResult to CodeToken[][] for the renderer
  const tokenLines = useMemo(() => {
    if (!highlightResult) return null;
    return highlightResult.lines.map(line =>
      line.tokens.map(t => ({ content: t.content, color: t.color, offset: t.offset }))
    );
  }, [highlightResult]);

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
  }, [canvasWidth, canvasHeight]);

  // Render a single frame (stable callback, reads refs)
  const renderFrameAt = useCallback((tMs: number) => {
    const canvas = canvasRef.current;
    if (!canvas || !currentScene || !currentTheme) return;
    const tl = timelineRef.current;
    if (!tl) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const state = getStateAtTime(tl, tMs, currentScene.sourceWithMarkup, currentScene.typingConfig);
    const background = getBackgroundById(currentScene.backgroundPresetId);

    // Resolve tokenLines per line for the renderer
    const lineTokenData: CodeToken[][] | null = tokenLines
      ? state.visibleLines.map((_, i) => tokenLines[i] || [])
      : null;

    renderFrame({
      ctx,
      width: canvasWidth,
      height: canvasHeight,
      state,
      theme: currentTheme,
      background,
      windowChrome: currentScene.windowChrome,
      typography: currentScene.typography,
      frameIndex: Math.round((tMs / 1000) * 30),
      fps: 30,
      visibleLines: state.visibleLines,
      tokenLines: lineTokenData,
    });
  }, [currentScene, currentTheme, canvasWidth, canvasHeight, tokenLines]);

  // Store renderFrameAt in ref for animation loop
  useEffect(() => {
    renderFnRef.current = renderFrameAt;
  }, [renderFrameAt]);

  // Animation loop — no global state updates per frame (CRI-05)
  useEffect(() => {
    if (!isPlaying || !timeline) return;

    const totalDuration = timeline.totalDurationMs;
    let startTimestamp: number | null = null;
    const startOffset = currentTimeRef.current;

    const animate = (timestamp: number) => {
      if (!startTimestamp) startTimestamp = timestamp;
      const elapsed = timestamp - startTimestamp;
      const newTime = (startOffset + elapsed) % totalDuration;
      currentTimeRef.current = newTime;

      // Draw directly to canvas without global state update
      renderFnRef.current?.(newTime);

      if (isPlayingRef.current) {
        animationRef.current = requestAnimationFrame(animate);
      }
    };

    animationRef.current = requestAnimationFrame(animate);

    return () => {
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
    };
  }, [isPlaying, timeline]);

  // Throttled UI progress sync (update global state at 20Hz, not 60Hz)
  useEffect(() => {
    if (!isPlaying) return;
    let rafId = 0;
    let lastSync = 0;
    const sync = () => {
      const now = performance.now();
      if (now - lastSync > 50) {
        seek(currentTimeRef.current);
        lastSync = now;
      }
      if (isPlayingRef.current) rafId = requestAnimationFrame(sync);
    };
    rafId = requestAnimationFrame(sync);
    return () => cancelAnimationFrame(rafId);
  }, [isPlaying, seek]);

  // Render when paused (on seek or state change)
  const currentTimeMs = useTimelineStore(s => s.currentTimeMs);
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
      const tl = timelineRef.current;
      if (tl && currentTimeMs >= tl.totalDurationMs - 100) {
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
