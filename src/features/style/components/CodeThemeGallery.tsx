import { useMemo } from 'react';
import { useProjectStore, useThemeStore } from '@/state';
import { getThemeById } from '@/data/codeThemes';
import { cn } from '@/lib/utils';

export function CodeThemeGallery() {
  const themes = useThemeStore(s => s.themes);

  // Read scene's codeThemeId for selection highlight
  const currentSceneThemeId = useProjectStore(s => {
    const project = s.projects.find(p => p.id === s.currentProjectId);
    return project ? project.scenes[s.currentSceneIndex]?.codeThemeId : null;
  });

  const currentProject = useProjectStore(s => {
    return s.projects.find(p => p.id === s.currentProjectId) || null;
  });
  const currentSceneIndex = useProjectStore(s => s.currentSceneIndex);
  const updateScene = useProjectStore(s => s.updateScene);

  // Resolve the current theme name for display
  const currentTheme = useMemo(() => {
    if (!currentSceneThemeId) return null;
    return getThemeById(currentSceneThemeId) || null;
  }, [currentSceneThemeId]);

  const handleThemeSelect = (themeId: string) => {
    if (!currentProject) return;
    // Update the scene's codeThemeId, not the global store
    updateScene(currentProject.id, currentSceneIndex, { codeThemeId: themeId });
  };

  const categories = [
    { id: 'editor-classic' as const, label: 'Editor Classics' },
    { id: 'retro-terminal' as const, label: 'Retro Terminal' },
    { id: 'vibrant-social' as const, label: 'Vibrant / Social' },
  ];

  return (
    <div className="space-y-4">
      <h4 className="text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider mb-2">
        Code Theme
        {currentTheme && (
          <span className="ml-2 normal-case text-[var(--text-secondary)]">— {currentTheme.name}</span>
        )}
      </h4>
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
                  onClick={() => handleThemeSelect(theme.id)}
                  className={cn(
                    'group relative rounded-lg p-2 text-left transition-all cursor-pointer border-2',
                    currentSceneThemeId === theme.id
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
