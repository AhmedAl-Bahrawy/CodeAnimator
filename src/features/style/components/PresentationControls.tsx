import { Label } from '@/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/ui/select';
import { Slider } from '@/ui/slider';
import type { FramingMode, ScenePresentationSettings } from '@/types/domain';

interface PresentationControlsProps {
  presentation: ScenePresentationSettings;
  onPresentationChange: (updates: Partial<ScenePresentationSettings>) => void;
}

const modeCopy: Record<FramingMode, { title: string; description: string }> = {
  'fit-code': {
    title: 'Fit to Code',
    description: 'Sizes the window around the actual code bounds, removes trailing empty space, and centers the result inside the selected canvas.',
  },
  'fill-canvas': {
    title: 'Fill Canvas',
    description: 'Touches every canvas edge and scales the code content proportionally so the full window is used.',
  },
  'code-lines': {
    title: 'Code Lines Mode',
    description: 'Records only the code glyphs on a transparent surface. The output follows the typing cursor when the code becomes longer than the viewport.',
  },
};

export function PresentationControls({ presentation, onPresentationChange }: PresentationControlsProps) {
  const mode = modeCopy[presentation.framingMode] || modeCopy['fit-code'];
  const isCodeLines = presentation.framingMode === 'code-lines';

  return (
    <section className="space-y-3">
      <div>
        <h3 className="text-sm font-semibold text-[var(--text-primary)]">Framing</h3>
        <p className="text-[10px] text-[var(--text-muted)]">Choose what the recording treats as its frame.</p>
      </div>
      <div className="space-y-2">
        <Label>Recording mode</Label>
        <Select
          value={presentation.framingMode}
          onValueChange={(value) => onPresentationChange({ framingMode: value as FramingMode })}
        >
          <SelectTrigger className="h-9 text-xs"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="fit-code">Fit to Code</SelectItem>
            <SelectItem value="fill-canvas">Fill Canvas</SelectItem>
            <SelectItem value="code-lines">Code Lines Mode</SelectItem>
          </SelectContent>
        </Select>
        <p className="text-[10px] leading-relaxed text-[var(--text-muted)]">{mode.description}</p>
      </div>
      <div className="space-y-2 rounded-md border border-[var(--border)] bg-[var(--bg-panel)]/50 p-3">
        <div className="flex items-center justify-between">
          <Label>{isCodeLines ? 'Code zoom' : 'Maximum content scale'}</Label>
          <span className="font-mono text-[10px] text-[var(--accent)]">{presentation.maxZoom.toFixed(2)}×</span>
        </div>
        <Slider
          value={[presentation.maxZoom]}
          onValueChange={([value]) => onPresentationChange({ maxZoom: Math.min(4, Math.max(0.5, value)) })}
          min={0.5}
          max={4}
          step={0.05}
        />
        <p className="text-[10px] leading-relaxed text-[var(--text-muted)]">
          {isCodeLines
            ? 'Controls the recorded text size. The viewport stays stable while the camera follows the cursor down the source.'
            : 'Controls the largest readable scale. The renderer still reduces the scale when the code cannot fit safely.'}
        </p>
      </div>
    </section>
  );
}
