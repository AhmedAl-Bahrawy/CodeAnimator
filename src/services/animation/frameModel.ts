import type { CanvasState, SceneAppearance } from '@/types/domain';

export interface AnimationFrameMetrics {
  introProgress: number;
  outroProgress: number;
  revealProgress: number;
  opacity: number;
  scale: number;
  translateX: number;
  translateY: number;
}

function clamp01(value: number): number {
  return Math.min(1, Math.max(0, value));
}

export function easeAnimation(value: number, easing: SceneAppearance['animationEasing']): number {
  const t = clamp01(value);
  if (easing === 'linear') return t;
  if (easing === 'snappy') return 1 - Math.pow(1 - t, 4);
  return t * t * (3 - 2 * t);
}

export function getAnimationFrameMetrics(
  timeMs: number,
  totalDurationMs: number,
  appearance: SceneAppearance,
  contentDurationMs = totalDurationMs,
): AnimationFrameMetrics {
  const safeTime = Math.max(0, Math.min(timeMs, Math.max(1, totalDurationMs)));
  const introRaw = appearance.introDurationMs <= 0 ? 1 : safeTime / appearance.introDurationMs;
  const outroRaw = appearance.outroDurationMs <= 0
    ? 1
    : (totalDurationMs - safeTime) / appearance.outroDurationMs;
  const introProgress = easeAnimation(introRaw, appearance.animationEasing);
  const outroProgress = easeAnimation(outroRaw, appearance.animationEasing);
  const revealProgress = clamp01(safeTime / Math.max(1, contentDurationMs));
  const settledProgress = Math.min(introProgress, outroProgress);
  const motion = appearance.motionPreset;

  let scale = 1;
  let translateX = 0;
  let translateY = 0;

  if (motion === 'typewriter') {
    scale = 0.985 + settledProgress * 0.015;
  } else if (motion === 'cinematic') {
    scale = 0.965 + settledProgress * 0.035;
    translateY = (1 - introProgress) * 18;
  } else if (motion === 'focus-reveal') {
    scale = 1.035 - settledProgress * 0.035;
    translateX = (1 - introProgress) * 12;
  } else if (motion === 'slide-in') {
    translateY = (1 - introProgress) * 42;
    scale = 0.99 + settledProgress * 0.01;
  } else if (motion === 'terminal-pulse') {
    // A deliberately tiny deterministic pulse; never depends on frame arrival.
    scale = 1 + Math.sin(safeTime / 900) * 0.0025;
  }

  return {
    introProgress,
    outroProgress,
    revealProgress,
    opacity: 0.35 + settledProgress * 0.65,
    scale,
    translateX,
    translateY,
  };
}

export function getCursorVisibility(
  state: Pick<CanvasState, 'playheadMs'>,
  appearance: Pick<SceneAppearance, 'cursorBlink' | 'cursorBlinkRate'>,
): boolean {
  if (!appearance.cursorBlink) return true;
  const rate = Math.max(120, appearance.cursorBlinkRate);
  return Math.floor(Math.max(0, state.playheadMs) / rate) % 2 === 0;
}
