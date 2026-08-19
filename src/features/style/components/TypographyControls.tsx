import { Slider } from '@/ui/slider';
import { Label } from '@/ui/label';

interface TypographySettings {
  fontSize: number;
  fontFamily: string;
  lineHeight: number;
  letterSpacing: number;
}

interface TypographyControlsProps {
  settings: TypographySettings;
  onChange: (updates: Partial<TypographySettings>) => void;
}

export function TypographyControls({ settings, onChange }: TypographyControlsProps) {
  const fontFamilies = [
    { value: '"SF Mono", "Fira Code", monospace', label: 'SF Mono' },
    { value: '"Fira Code", monospace', label: 'Fira Code' },
    { value: '"Cascadia Code", monospace', label: 'Cascadia Code' },
    { value: '"JetBrains Mono", monospace', label: 'JetBrains Mono' },
    { value: '"Source Code Pro", monospace', label: 'Source Code Pro' },
    { value: 'Consolas, monospace', label: 'Consolas' },
    { value: 'monospace', label: 'System Monospace' },
  ];

  return (
    <div className="space-y-4">
      <h4 className="text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider">
        Typography
      </h4>

      {/* Font Family */}
      <div className="space-y-2">
        <Label>Font</Label>
        <select
          value={settings.fontFamily}
          onChange={(e) => onChange({ fontFamily: e.target.value })}
          className="w-full h-8 px-3 rounded-md border border-[var(--border)] bg-[var(--bg-elevated)] text-[var(--text-primary)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
        >
          {fontFamilies.map((f) => (
            <option key={f.value} value={f.value}>
              {f.label}
            </option>
          ))}
        </select>
      </div>

      {/* Font Size */}
      <div className="space-y-2">
        <Label>Size: {settings.fontSize}px</Label>
        <Slider
          value={[settings.fontSize]}
          onValueChange={([v]) => onChange({ fontSize: v })}
          min={10}
          max={24}
          step={1}
        />
      </div>

      {/* Line Height */}
      <div className="space-y-2">
        <Label>Line Height: {settings.lineHeight.toFixed(1)}</Label>
        <Slider
          value={[settings.lineHeight * 100]}
          onValueChange={([v]) => onChange({ lineHeight: v / 100 })}
          min={100}
          max={250}
          step={10}
        />
      </div>

      {/* Letter Spacing */}
      <div className="space-y-2">
        <Label>Letter Spacing: {settings.letterSpacing.toFixed(1)}px</Label>
        <Slider
          value={[settings.letterSpacing * 10]}
          onValueChange={([v]) => onChange({ letterSpacing: v / 10 })}
          min={-20}
          max={50}
          step={1}
        />
      </div>
    </div>
  );
}
