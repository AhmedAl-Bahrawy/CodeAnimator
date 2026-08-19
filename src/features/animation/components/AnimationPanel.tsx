import { Label } from '@/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/ui/select';
import { Slider } from '@/ui/slider';
import { Button } from '@/ui/button';
import { getSoundCue, playSoundCue, soundLibrary } from '@/services/audio/soundLibrary';
import type {
  CursorFollowMode,
  MotionPreset,
  SceneAnimationSettings,
  SceneAudioSettings,
  ScenePresentationSettings,
  SoundCueId,
  TypingConfig,
  Timeline,
} from '@/types/domain';
import { TypingBehaviorControls } from './TypingBehaviorControls';

interface AnimationPanelProps {
  animation: SceneAnimationSettings;
  presentation: ScenePresentationSettings;
  typing: TypingConfig;
  audio: SceneAudioSettings;
  onAnimationChange: (updates: Partial<SceneAnimationSettings>) => void;
  onPresentationChange: (updates: Partial<ScenePresentationSettings>) => void;
  onTypingChange: (updates: Partial<TypingConfig>) => void;
  onAudioChange: (updates: Partial<SceneAudioSettings>) => void;
  timeline: Timeline | null;
  currentTimeMs: number;
  isPlaying: boolean;
  onPlay: () => void;
  onPause: () => void;
  onReset: () => void;
  onSeek: (timeMs: number) => void;
}

export function AnimationPanel({
  animation,
  presentation,
  typing,
  audio,
  onAnimationChange,
  onPresentationChange,
  onTypingChange,
  onAudioChange,
  timeline,
  currentTimeMs,
  isPlaying,
  onPlay,
  onPause,
  onReset,
  onSeek,
}: AnimationPanelProps) {
  return (
    <div className="space-y-6">
      <div className="rounded-lg border border-[var(--border)] bg-[var(--bg-panel)] p-3 space-y-2">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold text-[var(--text-primary)]">Animation timeline</h3>
            <p className="text-[10px] text-[var(--text-muted)]">One deterministic clock drives preview, cursor, sound, and exports.</p>
          </div>
          <span className="rounded-full border border-[var(--accent)]/40 px-2 py-1 text-[9px] text-[var(--accent)]">SYNCED</span>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="default"
            size="sm"
            className="h-7 text-[10px]"
            onClick={isPlaying ? onPause : onPlay}
            disabled={!timeline}
          >
            {isPlaying ? 'Pause' : 'Play'}
          </Button>
          <Button variant="outline" size="sm" className="h-7 text-[10px]" onClick={onReset} disabled={!timeline}>
            Reset
          </Button>
          <span className="ml-auto font-mono text-[10px] text-[var(--text-muted)]">
            {Math.round(currentTimeMs)} / {Math.round(timeline?.totalDurationMs || 0)} ms
          </span>
        </div>
        <input
          type="range"
          min={0}
          max={timeline?.totalDurationMs || 1}
          step={1}
          value={Math.min(currentTimeMs, timeline?.totalDurationMs || 1)}
          onChange={(event) => onSeek(Number(event.target.value))}
          aria-label="Animation timeline"
          className="w-full accent-[var(--accent)] cursor-pointer"
          disabled={!timeline}
        />
        <div className="flex justify-between text-[9px] text-[var(--text-muted)] font-mono">
          <span>INTRO {animation.introDurationMs}ms</span>
          <span>REVEAL {Math.round(timeline?.contentDurationMs || 0)}ms</span>
          <span>OUTRO {animation.outroDurationMs}ms</span>
        </div>
      </div>

      <section className="space-y-3">
        <h4 className="text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider">Motion design</h4>
        <div className="space-y-2">
          <Label>Animation preset</Label>
          <Select value={presentation.motionPreset} onValueChange={(value) => onPresentationChange({ motionPreset: value as MotionPreset })}>
            <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="typewriter">Typewriter — precise reveal</SelectItem>
              <SelectItem value="cinematic">Cinematic — subtle push-in</SelectItem>
              <SelectItem value="focus-reveal">Focus reveal — settle on code</SelectItem>
              <SelectItem value="slide-in">Slide in — clean entrance</SelectItem>
              <SelectItem value="terminal-pulse">Terminal pulse — restrained energy</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div className="space-y-2">
            <Label>Intro easing</Label>
            <Select value={animation.easing} onValueChange={(value) => onAnimationChange({ easing: value as SceneAnimationSettings['easing'] })}>
              <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="linear">Linear</SelectItem>
                <SelectItem value="smooth">Smooth</SelectItem>
                <SelectItem value="snappy">Snappy</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Cursor follows</Label>
            <Select value={animation.cursorFollow} onValueChange={(value) => onAnimationChange({ cursorFollow: value as CursorFollowMode })}>
              <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="exact">Every character</SelectItem>
                <SelectItem value="word-end">Word end</SelectItem>
                <SelectItem value="line-end">Line end</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="space-y-2">
          <Label>Entrance duration: {animation.introDurationMs}ms</Label>
          <Slider value={[animation.introDurationMs]} onValueChange={([value]) => onAnimationChange({ introDurationMs: value })} min={0} max={1600} step={20} />
        </div>
        <div className="space-y-2">
          <Label>Exit duration: {animation.outroDurationMs}ms</Label>
          <Slider value={[animation.outroDurationMs]} onValueChange={([value]) => onAnimationChange({ outroDurationMs: value })} min={0} max={1200} step={20} />
        </div>
        <div className="space-y-2">
          <Label>Code framing</Label>
          <Select value={presentation.framingMode} onValueChange={(value) => onPresentationChange({ framingMode: value as ScenePresentationSettings['framingMode'] })}>
            <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="fit-code">Fit to code</SelectItem>
              <SelectItem value="fill-canvas">Fill canvas</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </section>

      <section className="space-y-3">
        <h4 className="text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider">Cursor stability</h4>
        <div className="flex items-center justify-between rounded-md border border-[var(--border)] px-3 py-2">
          <div>
            <p className="text-xs text-[var(--text-primary)]">Deterministic blink</p>
            <p className="text-[10px] text-[var(--text-muted)]">Never tied to dropped frames.</p>
          </div>
          <Button variant={animation.cursorBlink ? 'default' : 'outline'} size="sm" className="h-7 text-[10px]" onClick={() => onAnimationChange({ cursorBlink: !animation.cursorBlink })}>
            {animation.cursorBlink ? 'On' : 'Off'}
          </Button>
        </div>
        {animation.cursorBlink && (
          <div className="space-y-2">
            <Label>Blink rhythm: {animation.cursorBlinkRate}ms</Label>
            <Slider value={[animation.cursorBlinkRate]} onValueChange={([value]) => onAnimationChange({ cursorBlinkRate: value })} min={240} max={1000} step={10} />
          </div>
        )}
      </section>

      <section className="space-y-3">
        <h4 className="text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider">Typing behavior</h4>
        <TypingBehaviorControls config={typing} onChange={onTypingChange} />
      </section>

      <section className="space-y-3">
        <h4 className="text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider">Sound cues</h4>
        <div className="flex items-center justify-between rounded-md border border-[var(--border)] px-3 py-2">
          <div>
            <p className="text-xs text-[var(--text-primary)]">Timeline audio</p>
            <p className="text-[10px] text-[var(--text-muted)]">Preview cues follow the same playhead.</p>
          </div>
          <Button variant={audio.enabled ? 'default' : 'outline'} size="sm" className="h-7 text-[10px]" onClick={() => onAudioChange({ enabled: !audio.enabled })}>
            {audio.enabled ? 'On' : 'Off'}
          </Button>
        </div>
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label>Typing cue</Label>
            <button type="button" className="text-[10px] text-[var(--accent)] cursor-pointer" onClick={() => playSoundCue(audio.cueId, audio.volume)}>Test sound</button>
          </div>
          <Select value={audio.cueId} onValueChange={(value) => onAudioChange({ cueId: value as SoundCueId, enabled: value !== 'none' })}>
            <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
            <SelectContent>{soundLibrary.map((cue) => <SelectItem key={cue.id} value={cue.id}>{cue.name}</SelectItem>)}</SelectContent>
          </Select>
          <p className="text-[10px] text-[var(--text-muted)]">{getSoundCue(audio.cueId).description}</p>
        </div>
        <div className="space-y-2">
          <Label>Volume: {Math.round(audio.volume * 100)}%</Label>
          <Slider value={[audio.volume]} onValueChange={([value]) => onAudioChange({ volume: value })} min={0} max={1} step={0.05} />
        </div>
      </section>

      <section className="space-y-3">
        <h4 className="text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider">Motion FX</h4>
        <div className="space-y-2">
          <Label>FX preset</Label>
          <Select value={presentation.fxPreset} onValueChange={(value) => onPresentationChange({ fxPreset: value as ScenePresentationSettings['fxPreset'] })}>
            <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="none">None</SelectItem>
              <SelectItem value="academy-glow">Academy glow</SelectItem>
              <SelectItem value="crt">CRT scanlines</SelectItem>
              <SelectItem value="neon">Neon bloom</SelectItem>
              <SelectItem value="paper">Paper sheen</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>FX intensity: {Math.round(presentation.fxIntensity * 100)}%</Label>
          <Slider value={[presentation.fxIntensity]} onValueChange={([value]) => onPresentationChange({ fxIntensity: value })} min={0} max={1} step={0.05} />
        </div>
      </section>
    </div>
  );
}
