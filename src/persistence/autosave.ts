import { saveProject } from './projectRepo';
import { useProjectStore } from '@/state/projectStore';
import type { Project } from '@/types/domain';

let autosaveTimer: ReturnType<typeof setTimeout> | null = null;
let lastSavedHash: string = '';

function hashProject(project: Project): string {
  return JSON.stringify(project);
}

export function scheduleAutosave(project: Project): void {
  const hash = hashProject(project);
  if (hash === lastSavedHash) return;

  if (autosaveTimer) {
    clearTimeout(autosaveTimer);
  }

  autosaveTimer = setTimeout(async () => {
    try {
      await saveProject(project);
      lastSavedHash = hash;
    } catch (err) {
      console.error('[Autosave] Failed to save:', err);
    }
  }, 1500);
}

export function cancelAutosave(): void {
  if (autosaveTimer) {
    clearTimeout(autosaveTimer);
    autosaveTimer = null;
  }
}

export function resetAutosaveHash(): void {
  lastSavedHash = '';
}

// Wire autosave to store changes
let unsubscribe: (() => void) | null = null;

export function startAutosaveSubscription(
  getProject: () => Project | null
): void {
  if (unsubscribe) return;

  unsubscribe = useProjectStore.subscribe((state) => {
    const project = state.projects.find(p => p.id === state.currentProjectId);
    if (project) {
      scheduleAutosave(project);
    }
  });

  // Flush on unload
  window.addEventListener('beforeunload', () => {
    const project = getProject();
    if (project) {
      const hash = hashProject(project);
      if (hash !== lastSavedHash) {
        saveProject(project).catch(() => {});
        lastSavedHash = hash;
      }
    }
  });
}

export function stopAutosaveSubscription(): void {
  unsubscribe?.();
  unsubscribe = null;
  cancelAutosave();
}
