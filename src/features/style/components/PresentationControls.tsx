import { Label } from '@/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/ui/select';
import { Slider } from '@/ui/slider';
import { getSoundCue, playSoundCue, soundLibrary } from '@/services/audio/soundLibrary';
import type { SceneAudioSettings, ScenePresentationSettings, FxPreset, FramingMode, MotionPreset, SoundCueId } from '@/types/domain';

interface PresentationControlsProps {
  presentation: ScenePresentationSettings;
  audio: SceneAudioSettings;
  onPresentationChange: (updates: Partial<ScenePresentationSettings>) => void;
  onAudioChange: (updates: Partial<SceneAudioSettings>) => void;
}

export function PresentationControls({ presentation, audio, onPresentationChange, onAudioChange }: PresentationControlsProps) {
  return (
    <div className="space-y-5">
      <div className="space-y-3">
        <h4 className="text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider">Camera & Motion</h4>
        <div className="space-y-2">
          <Label>Code framing</Label>
          <Select value={presentation.framingMode} onValueChange={(value) => onPresentationChange({ framingMode: value as FramingMode })}>
            <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="snap-content">Snap to last line</SelectItem>
              <SelectItem value="fit-code">Fit to code</SelectItem>
              <SelectItem value="fill-canvas">Fill canvas</SelectItem>
            </SelectContent>
          </Select>
          <p className="text-[10px] text-[var(--text-muted)]">Snap to last line keeps the full width, grows with the code, and anchors the window to the final line. Fit to code preserves background space.</p>
        </div>
        <div className="space-y-2">
          <Label>Maximum zoom: {presentation.maxZoom.toFixed(2)}×</Label>
          <Slider value={[presentation.maxZoom]} onValueChange={([value]) => onPresentationChange({ maxZoom: value })} min={1} max={3.2} step={0.05} />
        </div>
        <div className="space-y-2">
          <Label>Animation preset</Label>
          <Select value={presentation.motionPreset} onValueChange={(value) => onPresentationChange({ motionPreset: value as MotionPreset })}>
            <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="typewriter">Typewriter</SelectItem>
              <SelectItem value="cinematic">Cinematic</SelectItem>
              <SelectItem value="focus-reveal">Focus reveal</SelectItem>
              <SelectItem value="slide-in">Slide in</SelectItem>
              <SelectItem value="terminal-pulse">Terminal pulse</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="space-y-3">
        <h4 className="text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider">Visual FX</h4>
        <div className="space-y-2">
          <Label>FX preset</Label>
          <Select value={presentation.fxPreset} onValueChange={(value) => onPresentationChange({ fxPreset: value as FxPreset })}>
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
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h4 className="text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider">Sound library</h4>
          <button type="button" className="text-[10px] text-[var(--accent)] cursor-pointer" onClick={() => playSoundCue(audio.cueId, audio.volume)}>Test</button>
        </div>
        <div className="space-y-2">
          <Label>Typing cue</Label>
          <Select value={audio.cueId} onValueChange={(value) => onAudioChange({ cueId: value as SoundCueId, enabled: value !== 'none' })}>
            <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
            <SelectContent>
              {soundLibrary.map((cue) => <SelectItem key={cue.id} value={cue.id}>{cue.name}</SelectItem>)}
            </SelectContent>
          </Select>
          <p className="text-[10px] text-[var(--text-muted)]">{getSoundCue(audio.cueId).description}</p>
        </div>
        <div className="space-y-2">
          <Label>Volume: {Math.round(audio.volume * 100)}%</Label>
          <Slider value={[audio.volume]} onValueChange={([value]) => onAudioChange({ volume: value })} min={0} max={1} step={0.05} />
        </div>
      </div>
    </div>
  );
}
