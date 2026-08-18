import { useEffect, useRef, useCallback, useState, useMemo } from 'react';
import { useProjectStore, useTimelineStore, useUISkinStore } from '@/stores';
import { renderFrame } from '@/core/render/renderFrame';
import { getStateAtTime } from '@/core/timeline/getStateAtTime';
import { resolveSceneRenderModel } from '@/core/render/sceneModel';
import { highlightCode, type HighlightResult } from '@/core/highlighting/shiki';
import type { Timeline, CanvasState, CodeToken } from '@/core/types';
import { playSoundCue } from '@/core/audio/soundLibrary';

export function CanvasPreview() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const animationRef = useRef<number>(0);
  const [scale, setScale] = useState(0.3);
  const highlightCacheRef = useRef<Map<string, HighlightResult>>(new Map());

  const currentProject = useProjectStore((state) =>
    state.projects.find((project) => project.id === state.currentProjectId) || null,
  );
  const currentSceneIndex = useProjectStore((state) => state.currentSceneIndex);
  const currentScene = currentProject?.scenes[currentSceneIndex] || null;
  const skins = useUISkinStore((state) => state.skins);
  const currentSkinId = useUISkinStore((state) => state.currentSkinId);
  const currentSkin = useMemo(
    () => skins.find((skin) => skin.id === currentSkinId) || skins[0],
    [skins, currentSkinId],
  );

  const storedTimeline = useTimelineStore((state) => state.timeline);
  const cleanSource = useTimelineStore((state) => state.cleanSource);
  const isPlaying = useTimelineStore((state) => state.isPlaying);
  const currentTimeMs = useTimelineStore((state) => state.currentTimeMs);
  const seek = useTimelineStore((state) => state.seek);
  const play = useTimelineStore((state) => state.play);
  const pause = useTimelineStore((state) => state.pause);

  const sceneModel = useMemo(() => {
    if (!currentProject || !currentScene || !currentSkin) return null;
    return resolveSceneRenderModel(currentProject, currentScene, {
      skin: currentSkin,
      fps: storedTimeline?.fps === 60 ? 60 : 30,
    });
  }, [currentProject, currentScene, currentSkin, storedTimeline?.fps]);

  const timeline = storedTimeline || sceneModel?.timeline || null;
  const source = sceneModel?.source || cleanSource;
  const canvasWidth = sceneModel?.width || 1080;
  const canvasHeight = sceneModel?.height || 1920;

  const isPlayingRef = useRef(false);
  const currentTimeRef = useRef(0);
  const timelineRef = useRef<Timeline | null>(null);
  const renderFnRef = useRef<((timeMs: number, forceFullSource?: boolean) => void) | null>(null);
  const lastAudioTimeRef = useRef(0);
  const lastSoundAtRef = useRef(0);

  useEffect(() => {
    isPlayingRef.current = isPlaying;
  }, [isPlaying]);
  useEffect(() => {
    currentTimeRef.current = currentTimeMs;
  }, [currentTimeMs]);
  useEffect(() => {
    timelineRef.current = timeline;
  }, [timeline]);

  const [highlightResult, setHighlightResult] = useState<HighlightResult | null>(null);
  useEffect(() => {
    if (!sceneModel) return;
    const cacheKey = `${sceneModel.language}:${sceneModel.theme.shikiTheme || sceneModel.theme.id}:${sceneModel.source}`;
    const cached = highlightCacheRef.current.get(cacheKey);
    if (cached) {
      setHighlightResult(cached);
      return;
    }

    let cancelled = false;
    void highlightCode(sceneModel.source, sceneModel.language, sceneModel.theme.shikiTheme || 'dracula')
      .then((result) => {
        if (cancelled) return;
        highlightCacheRef.current.set(cacheKey, result);
        setHighlightResult(result);
      })
      .catch((error) => {
        if (!cancelled) console.warn('Syntax highlighting failed:', error);
      });
    return () => {
      cancelled = true;
    };
  }, [sceneModel]);

  const tokenLines = useMemo<CodeToken[][] | null>(() => {
    if (!highlightResult) return null;
    return highlightResult.lines.map((line) =>
      line.tokens.map((token) => ({ content: token.content, color: token.color, offset: token.offset })),
    );
  }, [highlightResult]);

  useEffect(() => {
    if (!containerRef.current) return;
    const observer = new ResizeObserver((entries) => {
      const { width, height } = entries[0]?.contentRect || {};
      if (!width || !height) return;
      setScale(Math.min(width / canvasWidth, height / canvasHeight));
    });
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, [canvasWidth, canvasHeight]);

  const buildFullSourceState = useCallback((): CanvasState | null => {
    if (!sceneModel || !timeline) return null;
    const allLines = source.split('\n');
    return {
      visibleText: source,
      visibleLines: allLines,
      tokens: [],
      cursorLine: Math.max(0, allLines.length - 1),
      cursorCol: allLines.at(-1)?.length || 0,
      activeHighlightRange: null,
      focusLine: null,
      scrollOffsetPx: 0,
      zoomLevel: 1,
      typingSpeed: sceneModel.typingConfig.baseSpeed,
    };
  }, [sceneModel, timeline, source]);

  const renderFrameAt = useCallback((timeMs: number, forceFullSource = false) => {
    const canvas = canvasRef.current;
    const model = sceneModel;
    const tl = timelineRef.current;
    if (!canvas || !model || !tl || !currentSkin) return;
    const context = canvas.getContext('2d');
    if (!context) return;

    const state = forceFullSource
      ? buildFullSourceState() || getStateAtTime(tl, timeMs, model.source, model.typingConfig)
      : getStateAtTime(tl, timeMs, model.source, model.typingConfig);
    const visibleTokenLines = tokenLines
      ? state.visibleLines.map((_, index) => tokenLines[index] || [])
      : null;

    renderFrame({
      ctx: context,
      width: model.width,
      height: model.height,
      state,
      theme: model.theme,
      background: model.background,
      windowChrome: model.windowChrome,
      typography: model.typography,
      typingConfig: model.typingConfig,
      skin: model.skin,
      appearance: model.appearance,
      frameIndex: Math.round((timeMs / 1000) * (tl.fps || 30)),
      fps: tl.fps || 30,
      visibleLines: state.visibleLines,
      tokenLines: visibleTokenLines,
    });
  }, [sceneModel, currentSkin, tokenLines, buildFullSourceState]);

  useEffect(() => {
    renderFnRef.current = renderFrameAt;
  }, [renderFrameAt]);

  useEffect(() => {
    if (!isPlaying || !timeline || timeline.totalDurationMs <= 0) return;
    const totalDuration = timeline.totalDurationMs;
    let startTimestamp: number | null = null;
    const startOffset = currentTimeRef.current;

    const animate = (timestamp: number) => {
      if (startTimestamp === null) startTimestamp = timestamp;
      const elapsed = timestamp - startTimestamp;
      const nextTime = (startOffset + elapsed) % totalDuration;
      if (nextTime < currentTimeRef.current) lastAudioTimeRef.current = 0;
      if (sceneModel?.audio.enabled && sceneModel.audio.cueId !== 'none') {
        const previousTime = lastAudioTimeRef.current;
        for (const event of timeline.events) {
          if (event.tMs <= previousTime || event.tMs > nextTime) continue;
          if (event.type === 'sound-cue') {
            const cueId = (event.payload as { cueId?: typeof sceneModel.audio.cueId }).cueId || sceneModel.audio.cueId;
            playSoundCue(cueId, sceneModel.audio.volume);
            lastSoundAtRef.current = performance.now();
          } else if ((event.type === 'type-char' || event.type === 'type-word' || event.type === 'type-line') && performance.now() - lastSoundAtRef.current > 42) {
            playSoundCue(sceneModel.audio.cueId, sceneModel.audio.volume);
            lastSoundAtRef.current = performance.now();
          }
        }
        lastAudioTimeRef.current = nextTime;
      }
      currentTimeRef.current = nextTime;
      renderFnRef.current?.(nextTime, false);
      if (isPlayingRef.current) animationRef.current = requestAnimationFrame(animate);
    };

    animationRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animationRef.current);
  }, [isPlaying, timeline]);

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

  useEffect(() => {
    if (!isPlaying) renderFrameAt(currentTimeMs, true);
  }, [isPlaying, currentTimeMs, renderFrameAt]);

  useEffect(() => {
    renderFrameAt(0, true);
  }, [renderFrameAt]);

  const togglePlayPause = () => {
    if (isPlaying) {
      pause();
      cancelAnimationFrame(animationRef.current);
      return;
    }
    if (timeline && currentTimeMs >= timeline.totalDurationMs - 100) seek(0);
    play();
  };

  return (
    <div className="flex flex-col h-full gap-3">
      <div ref={containerRef} className="flex-1 flex items-center justify-center bg-[var(--bg-base)] rounded-lg overflow-hidden">
        <div style={{ transform: `scale(${scale})`, transformOrigin: 'center center' }}>
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
          aria-label={isPlaying ? 'Pause preview' : 'Play preview'}
        >
          {isPlaying ? (
            <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor"><rect x="3" y="2" width="4" height="12" rx="1" /><rect x="9" y="2" width="4" height="12" rx="1" /></svg>
          ) : (
            <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor"><path d="M4 2l10 6-10 6V2z" /></svg>
          )}
        </button>
        <input
          type="range"
          min={0}
          max={timeline?.totalDurationMs || 1}
          value={currentTimeMs}
          onChange={(event) => {
            const time = Number(event.target.value);
            seek(time);
            renderFrameAt(time, false);
          }}
          aria-label="Preview timeline"
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
  const totalSeconds = Math.floor(ms / 1000);
  return `${Math.floor(totalSeconds / 60)}:${(totalSeconds % 60).toString().padStart(2, '0')}`;
}
