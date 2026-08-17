import { useThemeStore } from '@/stores';
import { cn } from '@/lib/utils';

export function CodeThemeGallery() {
  const { themes, currentThemeId, setTheme } = useThemeStore();

  const categories = [
    { id: 'editor-classic' as const, label: 'Editor Classics' },
    { id: 'retro-terminal' as const, label: 'Retro Terminal' },
    { id: 'vibrant-social' as const, label: 'Vibrant / Social' },
  ];

  return (
    <div className="space-y-4">
      {categories.map((cat) => {
        const catThemes = themes.filter((t) => t.category === cat.id);
        if (catThemes.length === 0) return null;

        return (
          <div key={cat.id}>
            <h4 className="text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider mb-2">
              {cat.label}
            </h4>
            <div className="grid grid-cols-3 gap-2">
              {catThemes.map((theme) => (
                <button
                  key={theme.id}
                  onClick={() => setTheme(theme.id)}
                  className={cn(
                    'group relative rounded-lg p-2 text-left transition-all cursor-pointer border-2',
                    currentThemeId === theme.id
                      ? 'border-[var(--accent)] ring-1 ring-[var(--accent)]'
                      : 'border-transparent hover:border-[var(--border)]'
                  )}
                >
                  {/* Theme preview swatch */}
                  <div
                    className="w-full h-16 rounded-md mb-1.5 overflow-hidden"
                    style={{ backgroundColor: theme.background }}
                  >
                    <div className="p-1.5 h-full flex flex-col gap-0.5">
                      <div className="h-1 rounded-sm" style={{ backgroundColor: theme.ansi.blue, width: '60%' }} />
                      <div className="h-1 rounded-sm" style={{ backgroundColor: theme.ansi.green, width: '80%' }} />
                      <div className="h-1 rounded-sm" style={{ backgroundColor: theme.ansi.red, width: '45%' }} />
                      <div className="h-1 rounded-sm" style={{ backgroundColor: theme.ansi.yellow, width: '70%' }} />
                    </div>
                  </div>
                  <span className="text-[10px] text-[var(--text-secondary)] leading-tight block truncate">
                    {theme.name}
                  </span>
                </button>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
