import { useState } from 'react';
import { useProjectStore } from '@/stores';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { loadAllProjects, deleteProject as deleteProjectDB, saveProject } from '@/persistence/projectRepo';
import { exportAllData, importAllData, downloadBlob } from '@/persistence/exportImportArchive';

interface ProjectManagerProps {
  open: boolean;
  onClose: () => void;
}

export function ProjectManager({ open, onClose }: ProjectManagerProps) {
  const { projects, currentProjectId, createProject, setCurrentProject, deleteProject } = useProjectStore();
  const [newName, setNewName] = useState('');
  const [archiveStatus, setArchiveStatus] = useState('');

  // Refresh the project list from IndexedDB each time the modal opens, so
  // manual Save/Delete actions performed earlier are reflected here (BLK-07).
  if (open) {
    void loadAllProjects().then(loaded => {
      if (loaded.length > 0) {
        const state = useProjectStore.getState();
        useProjectStore.setState({
          projects: loaded,
          currentProjectId: loaded.some(p => p.id === state.currentProjectId)
            ? state.currentProjectId
            : loaded[0].id,
        });
      }
    });
  }

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
    // List refreshes from IndexedDB automatically on the next open
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
          <div className="flex gap-2 mb-3">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                exportAllData().then(blob => downloadBlob(blob, `codereel-archive-${new Date().toISOString().slice(0, 10)}.json`));
                setArchiveStatus('Archive downloaded');
              }}
              className="h-7 text-xs"
            >
              Export Archive
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                const input = document.createElement('input');
                input.type = 'file';
                input.accept = 'application/json';
                input.onchange = async () => {
                  const file = input.files?.[0];
                  if (!file) return;
                  try {
                    const counts = await importAllData(file);
                    setArchiveStatus(`Imported ${counts.projects} project(s), ${counts.themes} theme(s), ${counts.skins} skin(s), ${counts.brandKits} brand kit(s). Reloading...`);
                    // Refresh list after import
                    loadAllProjects().then(loaded => {
                      if (loaded.length > 0) {
                        useProjectStore.setState({ projects: loaded, currentProjectId: loaded[0].id });
                      }
                      setArchiveStatus('Import complete');
                    });
                  } catch (err) {
                    setArchiveStatus(`Import failed: ${err instanceof Error ? err.message : 'unknown error'}`);
                  }
                };
                input.click();
              }}
              className="h-7 text-xs"
            >
              Import Archive
            </Button>
          </div>
          {archiveStatus && (
            <div className="text-[10px] text-[var(--text-muted)] mb-2">{archiveStatus}</div>
          )}
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
                  onMouseEnter={() => {
                    /* keep ProjectManager fresh while hovered list changes */
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
