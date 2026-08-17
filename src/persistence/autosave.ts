import { saveProject } from './projectRepo';
import type { Project } from '@/core/types';

let autosaveTimer: ReturnType<typeof setTimeout> | null = null;
let lastSavedProjectId: string | null = null;
let lastSavedHash: string = '';

function hashProject(project: Project): string {
  return JSON.stringify(project);
}

export function scheduleAutosave(project: Project): void {
  const hash = hashProject(project);
  if (hash === lastSavedHash) return; // No changes

  if (autosaveTimer) {
    clearTimeout(autosaveTimer);
  }

  autosaveTimer = setTimeout(async () => {
    try {
      await saveProject(project);
      lastSavedProjectId = project.id;
      lastSavedHash = hash;
      console.log('[Autosave] Project saved:', project.name);
    } catch (err) {
      console.error('[Autosave] Failed to save:', err);
    }
  }, 1500); // Debounce 1.5s
}

export function cancelAutosave(): void {
  if (autosaveTimer) {
    clearTimeout(autosaveTimer);
    autosaveTimer = null;
  }
}
