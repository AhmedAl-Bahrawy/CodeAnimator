import { Button } from '@/ui/button';
import { cn } from '@/lib/utils';
import { aspectRatioPresets } from '@/data/platformPresets';
import type { AspectRatio } from '@/types/domain';

interface AspectRatioSelectorProps {
  value: AspectRatio;
  onChange: (value: AspectRatio) => void;
}

export function AspectRatioSelector({ value, onChange }: AspectRatioSelectorProps) {
  return (
    <div className="space-y-2">
      <span className="text-xs font-medium text-[var(--text-muted)]">Aspect Ratio</span>
      <div className="flex gap-2">
        {aspectRatioPresets.map((preset) => (
          <Button
            key={preset.id}
            variant={value === preset.id ? 'default' : 'outline'}
            size="sm"
            onClick={() => onChange(preset.id)}
            className={cn('flex-1 text-xs', value === preset.id && 'ring-1 ring-[var(--accent)]')}
          >
            {preset.label}
          </Button>
        ))}
      </div>
    </div>
  );
}
