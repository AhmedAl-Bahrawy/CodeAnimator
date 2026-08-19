import { useEffect, useRef, useCallback, useState, useMemo } from 'react';
import { useProjectStore, useTimelineStore, useUISkinStore } from '@/state';
import { renderFrame } from '@/services/render/renderFrame';
import { getStateAtTime } from '@/services/timeline/getStateAtTime';
import { resolveSceneRenderModel } from '@/services/render/sceneModel';
import { highlightCode, type HighlightResult } from '@/services/highlighting/shiki';
import type { Timeline, CanvasState, CodeToken } from '@/types/domain';
import { playSoundCue } from '@/services/audio/soundLibrary';

export function CanvasPreview() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const animationRef = useRef<number>(0);
  const [scale, setScale] = useState(0.3);
  const [workspaceZoom, setWorkspaceZoom] = useState(1);
  const [workspacePan, setWorkspacePan] = useState({ x: 0, y: 0 });
  const [isDraggingWorkspace, setIsDraggingWorkspace] = useState(false);
  const workspaceDragRef = useRef<{ pointerId: number; startX: number; startY: number; originX: number; originY: number } | null>(null);
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
  const [highlightKey, setHighlightKey] = useState('');
  const expectedHighlightKey = sceneModel
    ? `${sceneModel.language}:${sceneModel.theme.shikiTheme || sceneModel.theme.id}:${sceneModel.source}`
    : '';
  useEffect(() => {
    if (!sceneModel) return;
    const cacheKey = `${sceneModel.language}:${sceneModel.theme.shikiTheme || sceneModel.theme.id}:${sceneModel.source}`;
    const cached = highlightCacheRef.current.get(cacheKey);
    if (cached) {
      setHighlightResult(cached);
      setHighlightKey(cacheKey);
      return;
    }

    let cancelled = false;
    void highlightCode(sceneModel.source, sceneModel.language, sceneModel.theme.shikiTheme || 'dracula')
      .then((result) => {
        if (cancelled) return;
        highlightCacheRef.current.set(cacheKey, result);
        setHighlightResult(result);
        setHighlightKey(cacheKey);
      })
      .catch((error) => {
        if (!cancelled) console.warn('Syntax highlighting failed:', error);
      });
    return () => {
      cancelled = true;
    };
  }, [sceneModel]);

  const tokenLines = useMemo<CodeToken[][] | null>(() => {
    if (!highlightResult || highlightKey !== expectedHighlightKey) return null;
    return highlightResult.lines.map((line) =>
      line.tokens.map((token) => ({ content: token.content, color: token.color, offset: token.offset })),
    );
  }, [expectedHighlightKey, highlightKey, highlightResult]);

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
      playheadMs: timeline.totalDurationMs,
      cursorVisible: true,
      animationProgress: 1,
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
      : getStateAtTime(tl, timeMs, model.source, model.typingConfig, {
        cursorFollow: model.animation.cursorFollow,
      });

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
      timeMs: state.playheadMs,
      totalDurationMs: tl.totalDurationMs,
      visibleLines: state.visibleLines,
      contentDurationMs: tl.contentDurationMs,
      tokenLines,
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
    lastAudioTimeRef.current = startOffset;
    lastSoundAtRef.current = 0;

    const animate = (timestamp: number) => {
      if (startTimestamp === null) startTimestamp = timestamp;
      const elapsed = timestamp - startTimestamp;
      const nextTime = (startOffset + elapsed) % totalDuration;
      if (sceneModel?.audio.enabled && sceneModel.audio.cueId !== 'none') {
        const previousTime = lastAudioTimeRef.current;
        const wrapped = nextTime < previousTime;
        const crossed = (eventTime: number) => wrapped
          ? eventTime > previousTime || eventTime <= nextTime
          : eventTime > previousTime && eventTime <= nextTime;
        for (const event of timeline.events) {
          if (!crossed(event.tMs)) continue;
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
      seek(nextTime);
      renderFnRef.current?.(nextTime);
      if (isPlayingRef.current) animationRef.current = requestAnimationFrame(animate);
    };

    animationRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animationRef.current);
  }, [isPlaying, timeline, sceneModel, seek]);

  useEffect(() => {
    if (!isPlaying) renderFrameAt(currentTimeMs, false);
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
    <div className="flex flex-col h-full min-h-0 gap-3">
      <div
        ref={containerRef}
        className="relative flex-1 min-h-0 flex items-center justify-center bg-[var(--bg-base)] rounded-lg overflow-hidden"
        style={{ touchAction: 'none' }}
        onWheel={(event) => {
          const direction = event.deltaY < 0 ? 1 : -1;
          setWorkspaceZoom((current) => Math.min(4, Math.max(0.25, current + direction * 0.1)));
        }}
        onPointerDown={(event) => {
          if (event.button !== 0) return;
          event.currentTarget.setPointerCapture(event.pointerId);
          setIsDraggingWorkspace(true);
          workspaceDragRef.current = {
            pointerId: event.pointerId,
            startX: event.clientX,
            startY: event.clientY,
            originX: workspacePan.x,
            originY: workspacePan.y,
          };
        }}
        onPointerMove={(event) => {
          const drag = workspaceDragRef.current;
          if (!drag || drag.pointerId !== event.pointerId) return;
          setWorkspacePan({
            x: drag.originX + event.clientX - drag.startX,
            y: drag.originY + event.clientY - drag.startY,
          });
        }}
        onPointerUp={(event) => {
          if (workspaceDragRef.current?.pointerId === event.pointerId) {
            workspaceDragRef.current = null;
            setIsDraggingWorkspace(false);
          }
        }}
        onPointerCancel={() => { workspaceDragRef.current = null; setIsDraggingWorkspace(false); }}
      >
        <div className="absolute right-3 top-3 z-10 flex items-center gap-1 rounded-lg border border-[var(--border)] bg-[var(--bg-panel)]/90 p-1 shadow-lg backdrop-blur-sm">
          <button
            type="button"
            className="h-7 w-7 rounded text-sm text-[var(--text-primary)] hover:bg-[var(--bg-surface)]"
            onClick={() => setWorkspaceZoom((current) => Math.min(4, current + 0.1))}
            aria-label="Zoom in canvas"
          >+
          </button>
          <span className="min-w-[3.5rem] text-center text-[11px] font-mono text-[var(--text-muted)]">{Math.round(workspaceZoom * 100)}%</span>
          <button
            type="button"
            className="h-7 w-7 rounded text-sm text-[var(--text-primary)] hover:bg-[var(--bg-surface)]"
            onClick={() => setWorkspaceZoom((current) => Math.max(0.25, current - 0.1))}
            aria-label="Zoom out canvas"
          >−
          </button>
          <button
            type="button"
            className="rounded px-2 py-1 text-[11px] text-[var(--text-muted)] hover:bg-[var(--bg-surface)]"
            onClick={() => { setWorkspaceZoom(1); setWorkspacePan({ x: 0, y: 0 }); }}
            aria-label="Fit canvas"
          >Fit
          </button>
        </div>
        <div
          className="select-none"
          style={{
            transform: `translate(${workspacePan.x}px, ${workspacePan.y}px) scale(${scale * workspaceZoom})`,
            transformOrigin: 'center center',
            cursor: isDraggingWorkspace ? 'grabbing' : 'grab',
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
