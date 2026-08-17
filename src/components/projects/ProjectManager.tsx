import { useState, useEffect } from 'react';
import { useProjectStore } from '@/stores';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { loadAllProjects, deleteProject as deleteProjectDB, saveProject } from '@/persistence/projectRepo';

interface ProjectManagerProps {
  open: boolean;
  onClose: () => void;
}

export function ProjectManager({ open, onClose }: ProjectManagerProps) {
  const { projects, currentProjectId, createProject, setCurrentProject, deleteProject } = useProjectStore();
  const [, setSavedProjects] = useState<{ id: string; name: string; updatedAt: number }[]>([]);
  const [newName, setNewName] = useState('');

  useEffect(() => {
    if (open) {
      loadAllProjects().then(loaded => {
        setSavedProjects(loaded.map(p => ({ id: p.id, name: p.name, updatedAt: p.updatedAt })));
      });
    }
  }, [open]);

  if (!open) return null;

  const handleCreate = () => {
    const name = newName.trim() || `Project ${projects.length + 1}`;
    createProject(name);
    setNewName('');
    onClose();
  };

  const handleDelete = async (id: string) => {
    deleteProject(id);
    await deleteProjectDB(id);
    setSavedProjects(prev => prev.filter(p => p.id !== id));
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-[var(--bg-panel)] rounded-xl w-full max-w-md max-h-[80vh] flex flex-col overflow-hidden shadow-xl">
        <div className="p-4 border-b border-[var(--border)]">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-[var(--text-primary)]">My Projects</h3>
            <Button variant="ghost" size="sm" onClick={onClose} className="h-7 text-xs">Close</Button>
          </div>
          <div className="flex gap-2">
            <input
              type="text"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="New project name..."
              className="flex-1 h-9 px-3 rounded-md border border-[var(--border)] bg-[var(--bg-elevated)] text-[var(--text-primary)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
              onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
            />
            <Button onClick={handleCreate} className="h-9 text-xs">New</Button>
          </div>
        </div>
        <ScrollArea className="flex-1">
          <div className="p-4 space-y-2">
            {projects.length === 0 ? (
              <p className="text-sm text-[var(--text-muted)] text-center py-8">No projects yet</p>
            ) : (
              projects.map(project => (
                <div
                  key={project.id}
                  className={`p-3 rounded-lg border cursor-pointer transition-all ${
                    currentProjectId === project.id
                      ? 'border-[var(--accent)] bg-[var(--bg-surface)]'
                      : 'border-[var(--border)] hover:border-[var(--border-strong)]'
                  }`}
                  onClick={() => {
                    setCurrentProject(project.id);
                    onClose();
                  }}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-sm font-medium text-[var(--text-primary)]">{project.name}</div>
                      <div className="text-[10px] text-[var(--text-muted)]">
                        {project.scenes.length} scene{project.scenes.length !== 1 ? 's' : ''} · {project.aspectRatio}
                      </div>
                    </div>
                    <div className="flex gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          saveProject(project);
                        }}
                        className="h-7 text-xs"
                      >
                        Save
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDelete(project.id);
                        }}
                        className="h-7 text-xs text-[var(--danger)]"
                      >
                        Delete
                      </Button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </ScrollArea>
      </div>
    </div>
  );
}
