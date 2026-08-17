import { backgroundPresets } from '@/data/backgroundPresets';
import { cn } from '@/lib/utils';

interface BackgroundPickerProps {
  currentBackgroundId: string;
  onChange: (id: string) => void;
}

export function BackgroundPicker({ currentBackgroundId, onChange }: BackgroundPickerProps) {
  return (
    <div className="space-y-3">
      <h4 className="text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider">
        Background
      </h4>
      <div className="grid grid-cols-4 gap-2">
        {backgroundPresets.map((preset) => (
          <button
            key={preset.id}
            onClick={() => onChange(preset.id)}
            className={cn(
              'relative w-full aspect-video rounded-md overflow-hidden transition-all cursor-pointer border-2',
              currentBackgroundId === preset.id
                ? 'border-[var(--accent)] ring-1 ring-[var(--accent)]'
                : 'border-transparent hover:border-[var(--border)]'
            )}
            title={preset.name}
          >
            <div
              className="w-full h-full"
              style={{ background: preset.value }}
            />
          </button>
        ))}
      </div>
    </div>
  );
}
