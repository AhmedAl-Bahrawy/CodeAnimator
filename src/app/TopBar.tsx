import { useMemo } from 'react';
import { useProjectStore, useUISkinStore } from '@/stores';
import { getThemeById } from '@/data/codeThemes';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';

export function TopBar() {
  const projects = useProjectStore(s => s.projects);
  const currentProjectId = useProjectStore(s => s.currentProjectId);
  const currentSceneIndex = useProjectStore(s => s.currentSceneIndex);
  const createProject = useProjectStore(s => s.createProject);
  const setCurrentProject = useProjectStore(s => s.setCurrentProject);

  const currentProject = projects.find(p => p.id === currentProjectId);
  const currentScene = currentProject ? currentProject.scenes[currentSceneIndex] : null;

  // Resolve theme from scene codeThemeId
  const currentTheme = useMemo(() => {
    if (!currentScene) return null;
    return getThemeById(currentScene.codeThemeId) || null;
  }, [currentScene?.codeThemeId]);

  const currentSkin = useUISkinStore(s => s.skins.find(sk => sk.id === s.currentSkinId));

  return (
    <header className="h-12 flex items-center px-4 border-b border-[var(--border)] bg-[var(--bg-elevated)] shrink-0">
      <div className="flex items-center gap-2 mr-4">
        <div className="w-7 h-7 rounded-lg bg-[var(--accent)] flex items-center justify-center">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="white">
            <path d="M2 2h5v5H2V2zm7 0h5v5H9V2zM2 9h5v5H2V9zm7 2.5a2.5 2.5 0 105 0 2.5 2.5 0 00-5 0z" />
          </svg>
        </div>
        <span className="font-semibold text-sm text-[var(--text-primary)]">CodeReel</span>
      </div>

      <Separator orientation="vertical" className="h-6 mx-2" />

      <div className="flex items-center gap-2">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => createProject('Untitled Project')}
          className="text-xs h-7"
        >
          <svg className="w-3.5 h-3.5 mr-1" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M8 3v10M3 8h10" />
          </svg>
          New
        </Button>

        {projects.length > 1 && (
          <select
            value={currentProjectId || ''}
            onChange={(e) => setCurrentProject(e.target.value)}
            className="h-7 text-xs px-2 rounded border border-[var(--border)] bg-[var(--bg-surface)] text-[var(--text-secondary)] focus:outline-none"
          >
            {projects.map((p) => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
        )}
      </div>

      <div className="flex-1" />

      {/* Theme indicator — reads from scene codeThemeId */}
      {currentTheme && (
        <div className="flex items-center gap-2 mr-3">
          <div
            className="w-3 h-3 rounded-full border border-[var(--border-strong)]"
            style={{ backgroundColor: currentTheme.background }}
            title={`Theme: ${currentTheme.name}`}
          />
          <span className="text-[10px] text-[var(--text-muted)]">{currentTheme.name}</span>
        </div>
      )}

      {/* Skin indicator */}
      {currentSkin && (
        <div className="flex items-center gap-2 mr-3">
          <div
            className="w-3 h-3 rounded-full border border-[var(--border-strong)]"
            style={{ backgroundColor: currentSkin.tokens.accent }}
            title={`Skin: ${currentSkin.name}`}
          />
          <span className="text-[10px] text-[var(--text-muted)]">{currentSkin.name}</span>
        </div>
      )}

      <div className="text-xs text-[var(--text-muted)] font-mono">
        {currentProject?.name || 'No project'}
      </div>
    </header>
  );
}
