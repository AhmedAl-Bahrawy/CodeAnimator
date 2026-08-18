import type {
  Timeline,
  TypingConfig,
  CodeTheme,
  BackgroundPreset,
  WindowChromeConfig,
  TypographySettings,
  CodeToken,
} from '@/core/types';
import type { WorkerInMessage, WorkerOutMessage } from '@/workers/render.worker';

export interface RenderFrameResult {
  frameIndex: number;
  bitmap: ImageBitmap;
}

export interface RenderCoordinatorOptions {
  width: number;
  height: number;
  fps: number;
  timeline: Timeline;
  source: string;
  typingConfig: TypingConfig;
  theme: CodeTheme;
  background: BackgroundPreset;
  windowChrome: WindowChromeConfig;
  typography: TypographySettings;
  tokenLines: CodeToken[][] | null;
  onFrameReady?: (index: number) => void;
  speedMultiplier?: number;
}

/**
 * Coordinator that manages a render worker for frame-by-frame export.
 * Wraps the worker protocol into an async iterator of ImageBitmaps.
 */
export class RenderCoordinator {
  private worker: Worker;
  private totalFrames: number;
  private onFrameReady?: (index: number) => void;
  private speedMultiplier: number;

  // Frame queue
  private frameQueue: Map<number, ImageBitmap> = new Map();
  private nextFrameToYield = 0;
  private resolveWaiter: (() => void) | null = null;
  private errorWaiter: ((err: Error) => void) | null = null;
  private failed = false;
  private failError: Error | null = null;
  private cancelled = false;

  constructor(opts: RenderCoordinatorOptions) {
    this.speedMultiplier = Math.max(0.1, opts.speedMultiplier ?? 1);
    // Effective frame count scales with the playback speed multiplier — a 2x
    // export produces half the frames because each frame covers more timeline.
    this.totalFrames = Math.ceil((opts.timeline.totalDurationMs / 1000) * opts.fps * this.speedMultiplier);
    this.onFrameReady = opts.onFrameReady;

    // Spawn worker
    this.worker = new Worker(
      new URL('@/workers/render.worker.ts', import.meta.url),
      { type: 'module' }
    );

    this.worker.onmessage = (e: MessageEvent<WorkerOutMessage>) => {
      this.handleMessage(e.data);
    };

    this.worker.onerror = (e) => {
      this.failed = true;
      this.failError = new Error(e.message || 'Worker error');
      this.errorWaiter?.(this.failError);
    };

    // Send init
    this.post({
      type: 'init',
      width: opts.width,
      height: opts.height,
      fps: opts.fps,
      timeline: opts.timeline,
      source: opts.source,
      typingConfig: opts.typingConfig,
      theme: opts.theme,
      background: opts.background,
      windowChrome: opts.windowChrome,
      typography: opts.typography,
      tokenLines: opts.tokenLines,
      speedMultiplier: this.speedMultiplier,
    });
  }

  private post(msg: WorkerInMessage) {
    this.worker.postMessage(msg);
  }

  private handleMessage(msg: WorkerOutMessage) {
    switch (msg.type) {
      case 'complete': {
        // Init complete — just acknowledge
        break;
      }

      case 'frame-ready': {
        this.frameQueue.set(msg.frameIndex, msg.bitmap);
        this.onFrameReady?.(msg.frameIndex);
        this.resolveWaiter?.();
        break;
      }

      case 'error': {
        this.failed = true;
        this.failError = new Error(msg.message);
        this.errorWaiter?.(this.failError);
        break;
      }
    }
  }

  /** Start rendering all frames. Frames are rendered sequentially in the worker. */
  startRendering(): void {
    for (let i = 0; i < this.totalFrames; i++) {
      if (this.cancelled) break;
      this.post({ type: 'render-frame', frameIndex: i });
    }
  }

  /** Start rendering up to `count` frames ahead (prefetch pipeline). */
  startPipeline(maxInFlight: number = 4): void {
    let dispatched = 0;
    const dispatchNext = () => {
      while (dispatched < this.totalFrames && dispatched - this.nextFrameToYield < maxInFlight) {
        if (this.cancelled) break;
        this.post({ type: 'render-frame', frameIndex: dispatched });
        dispatched++;
      }
    };
    dispatchNext();

    // Patch onFrameReady to dispatch more
    const origOnFrame = this.onFrameReady;
    this.onFrameReady = (idx) => {
      origOnFrame?.(idx);
      dispatchNext();
    };
  }

  /**
   * Wait for the next frame in order and return its ImageBitmap.
   * Returns null when all frames have been yielded.
   */
  async nextFrame(): Promise<RenderFrameResult | null> {
    if (this.failed) throw this.failError!;
    if (this.cancelled) return null;

    // Check if already queued
    const queued = this.frameQueue.get(this.nextFrameToYield);
    if (queued) {
      this.frameQueue.delete(this.nextFrameToYield);
      const idx = this.nextFrameToYield;
      this.nextFrameToYield++;
      return { frameIndex: idx, bitmap: queued };
    }

    // Check if done
    if (this.nextFrameToYield >= this.totalFrames) {
      return null;
    }

    // Wait for the worker to produce it
    return new Promise((resolve, reject) => {
      this.resolveWaiter = () => {
        this.resolveWaiter = null;
        this.errorWaiter = null;
        if (this.failed) {
          reject(this.failError!);
          return;
        }
        const bmp = this.frameQueue.get(this.nextFrameToYield);
        if (bmp) {
          this.frameQueue.delete(this.nextFrameToYield);
          const idx = this.nextFrameToYield;
          this.nextFrameToYield++;
          resolve({ frameIndex: idx, bitmap: bmp });
        } else {
          resolve(null);
        }
      };
      this.errorWaiter = (err) => {
        this.resolveWaiter = null;
        this.errorWaiter = null;
        reject(err);
      };
    });
  }

  cancel(): void {
    this.cancelled = true;
    this.post({ type: 'cancel' });
    this.worker.terminate();
    // Clean up any queued bitmaps
    for (const bmp of this.frameQueue.values()) {
      bmp.close();
    }
    this.frameQueue.clear();
  }

  terminate(): void {
    this.worker.terminate();
    for (const bmp of this.frameQueue.values()) {
      bmp.close();
    }
    this.frameQueue.clear();
  }

  get totalFrameCount(): number {
    return this.totalFrames;
  }
}
