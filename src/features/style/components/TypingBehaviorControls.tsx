import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/ui/select';
import { Slider } from '@/ui/slider';
import { Label } from '@/ui/label';
import type { TypingConfig, TypingMode, CursorStyle } from '@/types/domain';

interface TypingBehaviorControlsProps {
  config: TypingConfig;
  onChange: (updates: Partial<TypingConfig>) => void;
}

export function TypingBehaviorControls({ config, onChange }: TypingBehaviorControlsProps) {
  return (
    <div className="space-y-4">
      <h4 className="text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider">
        Typing Behavior
      </h4>

      {/* Typing Mode */}
      <div className="space-y-2">
        <Label>Mode</Label>
        <Select
          value={config.mode}
          onValueChange={(v) => onChange({ mode: v as TypingMode })}
        >
          <SelectTrigger className="h-8 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="character">Character by Character</SelectItem>
            <SelectItem value="word">Word by Word</SelectItem>
            <SelectItem value="line">Line by Line</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Typing Speed */}
      <div className="space-y-2">
        <Label>Speed: {config.baseSpeed} chars/sec</Label>
        <Slider
          value={[config.baseSpeed]}
          onValueChange={([v]) => onChange({ baseSpeed: v })}
          min={5}
          max={200}
          step={5}
        />
      </div>

      {/* Cursor Style */}
      <div className="space-y-2">
        <Label>Cursor</Label>
        <Select
          value={config.cursorStyle}
          onValueChange={(v) => onChange({ cursorStyle: v as CursorStyle })}
        >
          <SelectTrigger className="h-8 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="bar">Bar (|)</SelectItem>
            <SelectItem value="block">Block (█)</SelectItem>
            <SelectItem value="underscore">Underscore (_)</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Auto-scroll */}
      <div className="flex items-center justify-between">
        <Label>Auto-scroll</Label>
        <button
          onClick={() => onChange({ autoScroll: !config.autoScroll })}
          className={`w-10 h-5 rounded-full transition-colors cursor-pointer ${
            config.autoScroll ? 'bg-[var(--accent)]' : 'bg-[var(--bg-surface)]'
          }`}
        >
          <div
            className={`w-4 h-4 rounded-full bg-white transition-transform ${
              config.autoScroll ? 'translate-x-5' : 'translate-x-0.5'
            }`}
          />
        </button>
      </div>
    </div>
  );
}
