import { Slider } from '@/ui/slider';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/ui/select';
import { Label } from '@/ui/label';
import type { WindowChromeConfig, WindowChromeStyle } from '@/types/domain';

interface WindowChromeControlsProps {
  config: WindowChromeConfig;
  onChange: (updates: Partial<WindowChromeConfig>) => void;
}

export function WindowChromeControls({ config, onChange }: WindowChromeControlsProps) {
  return (
    <div className="space-y-4">
      <h4 className="text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider">
        Window Chrome
      </h4>

      {/* Chrome Style */}
      <div className="space-y-2">
        <Label>Style</Label>
        <Select
          value={config.style}
          onValueChange={(v) => onChange({ style: v as WindowChromeStyle })}
        >
          <SelectTrigger className="h-8 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="macos">macOS Traffic Lights</SelectItem>
            <SelectItem value="windows">Windows Minimal</SelectItem>
            <SelectItem value="terminal">Terminal / Bash</SelectItem>
            <SelectItem value="none">None (Borderless)</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Style description */}
      <div className="text-[10px] text-[var(--text-muted)] bg-[var(--bg-surface)] rounded px-2 py-1.5">
        {config.style === 'macos' && 'macOS-style traffic light buttons with colored dots'}
        {config.style === 'windows' && 'Windows-style minimize/maximize/close buttons'}
        {config.style === 'terminal' && 'Terminal prompt with colored dots and ~ path display'}
        {config.style === 'none' && 'No window chrome - code floats directly on background'}
      </div>

      {/* Title */}
      <div className="space-y-2">
        <Label>{config.style === 'terminal' ? 'Prompt Title' : 'Title'}</Label>
        <input
          type="text"
          value={config.title}
          onChange={(e) => onChange({ title: e.target.value })}
          className="w-full h-8 px-3 rounded-md border border-[var(--border)] bg-[var(--bg-elevated)] text-[var(--text-primary)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
          placeholder={config.style === 'terminal' ? 'script.sh' : 'file_name.py'}
        />
      </div>

      {/* Border Radius */}
      <div className="space-y-2">
        <Label>Border Radius: {config.borderRadius}px</Label>
        <Slider
          value={[config.borderRadius]}
          onValueChange={([v]) => onChange({ borderRadius: v })}
          min={0}
          max={24}
          step={1}
        />
      </div>

      {/* Shadow Intensity */}
      <div className="space-y-2">
        <Label>Shadow: {Math.round(config.shadowIntensity * 100)}%</Label>
        <Slider
          value={[config.shadowIntensity * 100]}
          onValueChange={([v]) => onChange({ shadowIntensity: v / 100 })}
          min={0}
          max={100}
          step={5}
        />
      </div>

      {/* Inner Padding */}
      <div className="space-y-2">
        <Label>Padding: {config.padding}px</Label>
        <Slider
          value={[config.padding]}
          onValueChange={([v]) => onChange({ padding: v })}
          min={8}
          max={48}
          step={4}
        />
      </div>

      {/* Outer Margin */}
      <div className="space-y-2">
        <Label>Margin: {config.margin}px</Label>
        <Slider
          value={[config.margin]}
          onValueChange={([v]) => onChange({ margin: v })}
          min={0}
          max={60}
          step={4}
        />
      </div>

      {/* Margin Fill Color */}
      <div className="space-y-2">
        <Label>Margin Color</Label>
        <div className="flex gap-2 items-center">
          <input
            type="color"
            value={config.marginFill.startsWith('#') ? config.marginFill : '#1a1a2e'}
            onChange={(e) => onChange({ marginFill: e.target.value })}
            className="w-8 h-8 rounded cursor-pointer border border-[var(--border)]"
          />
          <input
            type="text"
            value={config.marginFill}
            onChange={(e) => onChange({ marginFill: e.target.value })}
            className="flex-1 h-8 px-3 rounded-md border border-[var(--border)] bg-[var(--bg-elevated)] text-[var(--text-primary)] text-sm font-mono focus:outline-none"
            placeholder="#1a1a2e"
          />
        </div>
      </div>
    </div>
  );
}
